/* Voltio · especialidad: ESP32 a fondo. El chip, sus periféricos, FreeRTOS, la flash,
   las radios a nivel de dispositivo (WiFi, BLE, ESP-NOW), el bajo consumo y ESP-IDF.
   Código para el núcleo Arduino-ESP32 3.x (basado en ESP-IDF 5) salvo que se indique. */
(() => {
  /* ===================== CONCEPTOS ===================== */
  Object.assign(CONCEPTS, {
    /* --- M1 · familia, placa y arranque --- */
    es_mem: { name: 'Memorias del ESP32', alts: [
      { title: 'Cada memoria, su trabajo', text: 'El ESP32 clásico tiene varias memorias con papeles distintos. La <b>SRAM</b> (520 KB) guarda variables y pilas mientras funciona y se borra al apagar. La <b>flash</b> externa, dentro del módulo, guarda el programa y los archivos. La <b>ROM</b> trae de fábrica el cargador inicial y la <b>memoria RTC</b> conserva datos durante el deep sleep. Si la SRAM no basta, algunos módulos añaden <b>PSRAM</b>: varios MB de RAM externa.', q: mcq('¿Dónde viven las variables de tu programa mientras se ejecuta?', ['En la SRAM interna', 'En la flash del módulo', 'En la ROM de fábrica', 'En el convertidor USB-serie'], 'La flash guarda el programa; las variables se crean en la SRAM al ejecutarlo.') },
      { title: 'Una oficina', text: 'Piensa en una oficina. La <b>flash</b> es el archivador: guarda el programa aunque se vaya la luz, pero no sirve para trabajar encima. La <b>SRAM</b> es la mesa: rápida, pequeña y se vacía al apagar. La <b>ROM</b> es el manual impreso de fábrica. La <b>PSRAM</b> es una mesa auxiliar más grande y algo más lenta que solo traen algunos módulos (WROVER, S3 con PSRAM).', q: mcq('Un búfer de 2 MB para una cámara, ¿dónde lo pones?', ['En PSRAM: la SRAM interna no llega y la flash no sirve como RAM de trabajo', 'En la SRAM interna', 'En la ROM', 'En la flash, como una variable normal'], 'La SRAM interna son 520 KB en total, y el WiFi y el sistema ya usan buena parte.') }
    ] },
    es_module: { name: 'Chip, módulo y placa', alts: [
      { title: 'Tres capas', text: 'El <b>chip</b> es el silicio. El <b>módulo</b> (WROOM, WROVER, MINI…) le añade flash, cristal y antena bajo una tapa metálica, con la radio ya homologada. La <b>placa</b> de desarrollo añade el convertidor USB-serie, el regulador de 3,3 V y los botones EN y BOOT. Cuando un dato cambia entre “ESP32”, mira de cuál de los tres hablan.', q: mcq('¿Qué aporta la placa DevKit que no trae el módulo?', ['El convertidor USB-serie y el regulador de 3,3 V', 'La flash', 'La antena', 'El cristal de 40 MHz'], 'Flash, cristal y antena van bajo la tapa del módulo.') },
      { title: 'Muñecas rusas', text: 'Como unas muñecas rusas, cada capa envuelve a la anterior y añade lo que le falta para usarse. Dentro, el chip. Encima, el módulo: flash, cristal, antena y un certificado de radio aprobado, que es lo más caro de conseguir por tu cuenta. Fuera, la placa: USB, regulador, botones y pines a la medida de la protoboard.', q: mcq('¿Por qué un producto comercial suele montar el módulo y no el chip suelto?', ['Porque la radio del módulo ya está ajustada y homologada', 'Porque el módulo funciona a 5 V', 'Porque el chip suelto no tiene WiFi', 'Porque el módulo tiene más núcleos'], 'Diseñar una antena y certificar un transmisor cuesta tiempo y dinero.') }
    ] },
    es_cores: { name: 'Los dos núcleos', alts: [
      { title: 'Quién vive en cada núcleo', text: 'El ESP32 clásico tiene dos núcleos: el <b>0</b> (PRO_CPU) y el <b>1</b> (APP_CPU). Por defecto, la pila WiFi y Bluetooth trabaja en el 0, y Arduino (setup y loop) en el 1. Con xTaskCreatePinnedToCore eliges dónde va cada tarea: pon el trabajo pesado donde quede tiempo libre. Los chips de un solo núcleo (S2, C3, C6, H2) solo tienen el núcleo 0.', q: mcq('loop() ya usa 4 ms de cada 10 en el núcleo 1 y quieres añadir una tarea de 8 ms cada 10 ms. ¿Dónde?', ['En el núcleo 0, donde la radio deja tiempo libre', 'En el núcleo 1, junto a loop()', 'En los dos a la vez', 'En el coprocesador ULP'], '4 + 8 ms no caben en 10 ms; en el núcleo 0 sí.') },
      { title: 'Sumar el trabajo de cada núcleo', text: 'Cada núcleo tiene 10 ms de CPU cada 10 ms, ni uno más. Suma lo que piden las tareas fijadas a él: si pasa de 10 ms, alguna llegará tarde. En el núcleo 1 está loop(); en el 0, la radio. Elige el núcleo donde la suma quede por debajo, con margen. Si el chip tiene un solo núcleo, la única opción es el 0 (o tskNO_AFFINITY).', q: mcq('En un ESP32-C3 llamas a xTaskCreatePinnedToCore(…, 1). ¿Qué pasa?', ['Está mal: el C3 solo tiene el núcleo 0', 'Funciona igual que en el clásico', 'La tarea va al ULP', 'Se crea en los dos núcleos'], 'Usa xTaskCreate o el núcleo 0.') }
    ] },
    es_period: { name: 'Frecuencia, periodo y cuentas', alts: [
      { title: 'Un metrónomo', text: 'Una frecuencia dice cuántos golpes hay por segundo. Cada golpe dura <b>T = 1 / f</b>, y en un tiempo t caben <b>f × t</b> golpes. A 1 MHz un golpe dura 1 µs y en 0,5 s hay 500 000. Vale igual para el reloj de la CPU, un temporizador que cuenta o un audio que toma muestras.', q: mcq('Un temporizador cuenta a 1 MHz. ¿Cuántas cuentas hay en 20 ms?', ['20 000', '20', '50 000', '2 000 000'], '1 000 000 × 0,02 s = 20 000.') },
      { title: 'Primero, a unidades base', text: 'El error típico es mezclar prefijos. Pasa la frecuencia a Hz y el tiempo a segundos, opera y vuelve al prefijo cómodo. 240 MHz = 240 000 000 Hz, así que T = 1 / 240 000 000 s ≈ 4,17 ns. Y 15 minutos en microsegundos: 15 × 60 s × 1 000 000 µs/s = 900 000 000 µs.', q: mcq('¿Cuánto dura un ciclo de reloj a 80 MHz?', ['12,5 ns', '80 ns', '1,25 ns', '125 ns'], 'T = 1 / 80 000 000 s = 0,0000000125 s.') }
    ] },
    es_family: { name: 'Elegir la variante de ESP32', alts: [
      { title: 'Elegir por lo que necesitas', text: 'No hay “el mejor ESP32”: hay el adecuado. ¿Bluetooth clásico o DAC? ESP32 clásico. ¿USB nativo o IA? S3. ¿Barato, a pila y con BLE 5? C3. ¿Zigbee o Thread? C6 o H2. Empieza por la lista de requisitos y descarta.', q: mcq('Necesitas WiFi, BLE y poco precio, sin más extras. ¿Qué chip?', ['ESP32-C3', 'ESP32-P4', 'ESP32-H2', 'ESP32-S2'], 'El P4 no tiene radio, el H2 no tiene WiFi y el S2 no tiene Bluetooth.') },
      { title: 'Lo que le falta a cada uno', text: 'A veces es más fácil descartar por lo que falta. El <b>S2</b> no tiene Bluetooth. El <b>S3</b> y el <b>C3</b> no tienen Bluetooth clásico ni DAC. El <b>C3</b> solo llega al GPIO 21. El <b>H2</b> no tiene WiFi y el <b>P4</b> no tiene radio. Antes de seguir un tutorial, comprueba que tu chip tiene el periférico y el pin que usa.', q: mcq('Un tutorial usa dacWrite() y tu placa es un ESP32-C3. ¿Qué pasa?', ['No funcionará: el C3 no tiene DAC', 'Funciona en cualquier pin', 'Funciona solo en el GPIO 25', 'Saca 5 V'], 'El DAC solo está en el ESP32 clásico y el S2.') }
    ] },
    es_hid: { name: 'Teclado por USB o por BLE', alts: [
      { title: 'USB de verdad o conversor', text: 'Para que el ordenador vea tu aparato como teclado, el chip tiene que hablar USB él mismo: el <b>S2 y el S3</b> tienen USB OTG nativo. El conector de un DevKit clásico va a un chip USB-serie aparte, que solo hace de puerto COM. Sin cable, la alternativa es HID sobre BLE: el ESP32 se presenta como teclado Bluetooth, con emparejamiento y batería.', q: mcq('Con un ESP32 clásico, ¿cómo haces un teclado para el PC?', ['Por BLE (HID sobre GATT): su USB es solo un conversor serie', 'Por su USB, igual que con un S3', 'Por la UART0', 'No se puede de ninguna forma'], 'El clásico no tiene USB nativo, pero sí BLE.') },
      { title: 'Cable o libertad', text: 'Con USB nativo (S2, S3) se enchufa y funciona: sin emparejar ni batería. Con BLE es inalámbrico, a cambio de emparejar una vez y de cargar o cambiar la batería. Un ESP32 clásico o un C3 solo pueden ir por BLE, porque su USB no es nativo. Elige según el uso: un mando de presentaciones, BLE; un teclado de macros en el escritorio, USB.', q: mcq('Un teclado de macros fijo junto al ordenador. ¿Qué te complica menos?', ['USB nativo con un S3', 'BLE con batería', 'ESP-NOW', 'WiFi'], 'Sin emparejar ni cargar baterías.') }
    ] },
    es_upload: { name: 'Subir programas y monitor serie', alts: [
      { title: 'El baile de EN y BOOT', text: 'Al pulsar Subir se compila un .bin; luego esptool reinicia el chip con el <b>GPIO 0 a masa</b> para que entre en <b>modo descarga</b>, graba la flash y lo reinicia para que arranque tu programa. Dos transistores de la placa hacen ese baile con las líneas DTR y RTS del USB-serie. Si falla (“Connecting…____”), mantén BOOT pulsado mientras conecta. Y hace falta un cable USB con hilos de datos.', q: mcq('Al subir aparece “Connecting…_____” y falla. ¿Qué pruebas primero?', ['Mantener BOOT pulsado mientras conecta', 'Pulsar EN sin parar', 'Cambiar la velocidad del monitor', 'Alimentar por VIN con 12 V'], 'Con BOOT pulsado, el GPIO 0 está a masa al arrancar.') },
      { title: 'La cadena del USB', text: 'Subir y monitorizar recorre una cadena: cable con hilos de datos → convertidor USB-serie de la placa → UART0 del chip. Si falla un eslabón, falla todo: un cable de solo carga no deja ni subir; si el monitor va a otra velocidad que Serial.begin(), ves basura. La ROM saluda a 115 200 baudios al arrancar, así que usar 115 200 en todo evita confusiones.', q: mcq('El ordenador carga la placa pero ni siquiera aparece un puerto COM. ¿Sospecha principal?', ['Un cable de solo carga, sin hilos de datos', 'Falta PSRAM', 'El GPIO 12 está alto', 'La velocidad del monitor'], 'Sin hilos de datos, el USB-serie no llega a hablar con el PC.') }
    ] },
    es_ldo: { name: 'Alimentar la placa: VIN, 3V3 y regulador', alts: [
      { title: 'Un grifo que solo puede cerrar', text: 'Por VIN (o 5V) entra la alimentación al <b>regulador lineal</b> de la placa (a menudo un AMS1117) y por 3V3 sale la tensión regulada. El regulador es un grifo que solo puede cerrar: quema la diferencia como calor, <b>P = (Vin − Vout) · I</b>, y necesita algo más de 1 V de margen sobre 3,3 V. Si ya tienes 3,3 V estables, puedes entrar directo por 3V3 (de 3,0 a 3,6 V), saltándote el regulador.', q: mcq('El regulador recibe 5 V, da 3,3 V y entrega 200 mA. ¿Cuánto calor disipa?', ['0,34 W', '0,66 W', '1 W', '0,2 W'], '(5 − 3,3) × 0,2 = 0,34 W.') },
      { title: 'Margen, calor y baterías', text: 'Una Li-ion da de 4,2 V (llena) a algo más de 3 V (casi vacía). Un AMS1117 necesita alrededor de 1,1 V de margen: desde 4 V ya no consigue 3,3 V. Además, todo lo que sobra se convierte en calor: (Vin − 3,3) × I. Para baterías se usa un LDO de poca caída y poco consumo, o se entra por 3V3 desde un regulador adecuado. Nunca más de 3,6 V por 3V3: ahí nada te protege.', q: mcq('Con una Li-ion a 3,8 V en VIN y un AMS1117, ¿qué sale por 3V3?', ['Menos de 3,3 V: no tiene margen suficiente', 'Exactamente 3,3 V', '5 V', '3,8 V regulados'], '3,8 − 1,1 ≈ 2,7 V: el chip puede reiniciarse.') }
    ] },
    es_crash: { name: 'Leer pánicos y mensajes de error', alts: [
      { title: 'El parte del accidente', text: 'Cuando el programa falla, el monitor deja pistas. <b>Guru Meditation</b> es un pánico, y el sistema se reinicia (rst:0xc SW_CPU_RESET). Debajo viene un <b>Backtrace</b>: el decodificador del IDE o idf.py monitor lo traducen a archivo y línea. El nombre orienta: <b>LoadProhibited</b>, puntero nulo o inválido; <b>Stack canary</b>, pila desbordada; <b>Task watchdog</b>, una tarea que no cede; <b>Brownout</b>, la alimentación.', q: mcq('Tras un reinicio ves “Stack canary watchpoint triggered (miTarea)”. ¿Qué revisas?', ['La pila de miTarea: súbela o reduce lo que guarda', 'La alimentación', 'La contraseña del WiFi', 'El tamaño de la flash'], 'El canario está al final de la pila y avisa cuando se pisa.') },
      { title: 'Del síntoma a la línea', text: 'Un pánico que se repite en bucle no se arregla adivinando. Copia el Backtrace al decodificador de excepciones del IDE o usa idf.py monitor, que lo hace solo y te dice archivo y línea. Luego lee el tipo de error: LoadProhibited y StoreProhibited suelen ser punteros nulos; IntegerDivideByZero, una división entre cero; Stack canary, una pila corta.', q: mcq('“Guru Meditation Error: Core 1 panic’ed (LoadProhibited)”. ¿Causa más probable?', ['Leer a través de un puntero nulo o inválido', 'Una caída de alimentación', 'La flash llena', 'Un WiFi lento'], 'LoadProhibited: se intentó leer de una dirección no válida.') }
    ] },
    es_wdt: { name: 'El watchdog de tareas', alts: [
      { title: 'El vigilante no es el culpable', text: 'El watchdog de tareas vigila que ciertas tareas consigan CPU. En Arduino-ESP32 vigila la tarea <b>IDLE</b> del núcleo 0, que solo corre cuando nadie más quiere la CPU. Si en unos 5 s no ha podido correr, avisa: “Task watchdog got triggered … IDLE0”. IDLE0 es la víctima; el culpable es otra tarea que acapara el núcleo sin bloquearse.', q: mcq('El aviso nombra a IDLE0. ¿Quién es el culpable?', ['Otra tarea que acapara el núcleo 0 sin bloquearse', 'La propia tarea IDLE0', 'El núcleo 1', 'La flash'], 'IDLE0 es la que no pudo ejecutarse.') },
      { title: 'Callar al vigilante no arregla nada', text: 'El watchdog avisa de un problema de diseño: un bucle de espera activa o una tarea prioritaria sin vTaskDelay. Llamar a esp_task_wdt_reset() dentro de ese bucle, o desactivar el watchdog, solo calla el aviso: las demás tareas siguen sin CPU. La solución es bloquearse de verdad (vTaskDelay, una cola, una notificación).', q: mcq('“Task watchdog got triggered” y tu tarea hace while (!listo) {} en el núcleo 0. ¿Solución?', ['Esperar bloqueada: vTaskDelay, una cola o una notificación', 'Llamar a esp_task_wdt_reset() dentro del while', 'Desactivar el watchdog', 'Subir la prioridad de la tarea'], 'Al bloquearse, IDLE y el resto pueden correr.') }
    ] },
    es_heap: { name: 'Heap y fragmentación', alts: [
      { title: 'Un aparcamiento con huecos', text: 'El <b>heap</b> es la RAM que se reparte en marcha: malloc, new, String… ESP.getFreeHeap() dice cuántos bytes quedan libres en total. Pero, como en un aparcamiento con huecos sueltos, puede haber 100 KB libres repartidos y ningún hueco de 40 KB seguido: es la <b>fragmentación</b>. heap_caps_get_largest_free_block() te dice el hueco contiguo más grande.', q: mcq('getFreeHeap() da 80 000 y el bloque libre mayor es de 12 000. ¿Puedes reservar 20 000 bytes seguidos?', ['No: no hay un hueco contiguo tan grande', 'Sí, sobra memoria', 'Sí, pero en la flash', 'Solo con PSRAM, siempre'], 'Para una reserva, lo que cuenta es el bloque contiguo.') },
      { title: 'Reservar una vez', text: 'Cada vez que un String crece, se pide un bloque nuevo y se libera el viejo. Tras días así, la RAM queda llena de huecos pequeños y una reserva grande falla aunque el total libre (getFreeHeap) parezca de sobra. En equipos que funcionan meses: reserva los búferes al inicio (reserve(), arrays fijos) y vigila también el bloque libre mayor.', q: mcq('Un programa que concatena String en loop() se cuelga tras varios días. ¿Mejor arreglo?', ['Búferes de tamaño fijo reservados al inicio', 'Reiniciar cada hora', 'Más delay en loop()', 'Más flash'], 'Sin reservas y liberaciones constantes, no hay fragmentación.') }
    ] },
    es_cpufreq: { name: 'Frecuencia de la CPU y consumo', alts: [
      { title: 'Menos vueltas, menos gasto', text: 'La CPU del ESP32 clásico puede ir a 240, 160 u 80 MHz (y a menos, tomando el reloj del cristal). Menos MHz, menos consumo, pero el código tarda más. El límite práctico: <b>con WiFi o Bluetooth hacen falta al menos 80 MHz</b>; por debajo, la radio no funciona.', q: mcq('Bajas a setCpuFrequencyMhz(40) y el WiFi deja de conectar. ¿Por qué?', ['La radio necesita al menos 80 MHz', 'A 40 MHz se apaga el núcleo 1', 'Se borra la NVS', 'El regulador se desconecta'], 'Para usar WiFi, 80 MHz como mínimo.') },
      { title: 'Cuentas de energía', text: 'Ir más despacio no siempre ahorra: si el trabajo tarda el triple, la CPU está despierta el triple. Bajar la frecuencia compensa cuando el chip pasa mucho tiempo esperando (un nodo que lee un sensor y envía de vez en cuando), y siempre respetando los 80 MHz mínimos si hay radio.', q: mcq('Un proyecto con WiFi pasa casi todo el tiempo esperando. ¿Qué frecuencia de CPU es razonable para ahorrar?', ['80 MHz', '10 MHz', '240 MHz siempre', '20 MHz'], '80 MHz ahorra y mantiene la radio funcionando.') }
    ] },
    es_secure: { name: 'eFuses, cifrado y firma', alts: [
      { title: 'Bits de una sola escritura', text: 'Los <b>eFuses</b> son bits que solo se pueden grabar una vez. De fábrica guardan la MAC única (la que da ESP.getEfuseMac()) y datos de calibración. Tú puedes grabar claves para <b>Secure Boot</b> (solo arranca firmware firmado) y <b>cifrado de flash</b> (quien vuelque la flash no lee nada útil). Al ser irreversibles, un error puede inutilizar el chip: prueba en placas de desarrollo.', q: mcq('¿Qué protege el cifrado de flash?', ['El contenido de la flash si alguien la lee físicamente', 'Las conexiones WiFi frente a ataques remotos', 'El desgaste de la flash', 'Los cortes de luz durante una OTA'], 'Contra la red están las contraseñas, TLS y la firma.') },
      { title: 'Cada puerta, su cerradura', text: 'Piensa en cada vía de entrada. <b>Física</b> (alguien con la placa en la mano): cifrado de flash y Secure Boot, que se activan grabando eFuses, los mismos bits de una sola escritura donde vive la MAC. <b>Por red</b>: contraseña en la OTA y en el servidor, TLS y firmware firmado. Una OTA sin contraseña es una puerta abierta: cualquiera en tu red podría subirte su programa.', q: mcq('ArduinoOTA sin contraseña en tu WiFi de casa. ¿Riesgo?', ['Cualquiera en tu red puede grabarte otro firmware', 'Ninguno', 'Que se gaste la flash', 'Que se borre la NVS'], 'Pon contraseña y, mejor aún, verifica la firma.') }
    ] },

    /* --- M2 · alimentación, pines y ADC --- */
    es_brown: { name: 'Picos de consumo y brownout', alts: [
      { title: 'Sorbos enormes y muy cortos', text: 'Al transmitir por WiFi el ESP32 pide de golpe unos 240 mA durante milisegundos. Si el cable, el puerto USB o el regulador no los dan, la tensión cae, salta el detector de caída (<b>brownout</b>) y el chip se reinicia: parece un fallo de software y es de alimentación. Desactivar el detector no lo arregla: el chip seguiría trabajando con tensión baja y podría corromper la flash.', q: mcq('La placa se reinicia justo al conectar al WiFi y el monitor dice “Brownout detector was triggered”. ¿Qué cambias primero?', ['La alimentación: cable corto y bueno, fuente capaz y condensador cerca del módulo', 'La contraseña del WiFi', 'La velocidad del monitor serie', 'El código de loop()'], 'Es una caída de tensión, no un error de programa.') },
      { title: 'Un depósito junto al grifo', text: 'Los picos de la radio hacen caer la tensión y saltar el brownout. Un condensador grande (100–470 µF) junto a 3V3 y GND es un pequeño depósito que entrega el pico mientras el regulador reacciona. Caída aproximada: <b>ΔV = I · t / C</b>. Solo ayuda en picos cortos: si la fuente no da la corriente media, ningún condensador lo arregla.', q: mcq('Un pico de 200 mA durante 0,5 ms sale de un condensador de 470 µF. ¿Cuánto baja la tensión?', ['Unos 0,21 V', 'Unos 2,1 V', 'Nada', 'Unos 21 V'], 'ΔV = 0,2 × 0,0005 / 0,00047 ≈ 0,21 V.') }
    ] },
    es_ledres: { name: 'LED desde un pin de 3,3 V', alts: [
      { title: 'La receta con 3,3 V', text: 'Resta a 3,3 V la tensión del LED: lo que queda cae en la resistencia. Divide entre la corriente deseada: <b>R = (3,3 − Vf) / I</b>. Rojo (1,8 V) a 10 mA: 1,5 / 0,01 = 150 Ω. Si Vf se acerca a 3,3 V (azul, blanco), apenas queda tensión para la resistencia y la corriente se vuelve inestable. Y no pases de unos 20 mA por pin.', q: mcq('LED verde de 2,1 V a 8 mA desde un GPIO de 3,3 V. ¿Resistencia?', ['150 Ω', '262 Ω', '412 Ω', '15 Ω'], '(3,3 − 2,1) / 0,008 = 150 Ω.') },
      { title: 'El margen manda', text: 'La resistencia solo controla bien la corriente si le queda tensión de sobra: R = (3,3 − Vf) / I. Con un LED rojo quedan 1,5 V; con uno azul o blanco (unos 3,0 V), solo 0,3 V, y cualquier variación de Vf o de la alimentación cambia mucho la corriente. Para esos LED, mejor alimentarlos desde 5 V con un transistor que active el GPIO.', q: mcq('¿Por qué un LED blanco va mal directo desde un GPIO de 3,3 V?', ['Queda muy poca tensión para la resistencia y la corriente se vuelve inestable', 'Porque los blancos necesitan corriente alterna', 'Porque el GPIO da 5 V', 'Porque se quema siempre'], 'Con 0,3 V de margen, una décima de voltio cambia la corriente un 30 %.') }
    ] },
    es_3v3: { name: 'Niveles entre 3,3 V y 5 V', alts: [
      { title: 'Un límite que no perdona', text: 'Los pines del ESP32 trabajan a 3,3 V y no toleran más de unos 3,6 V. Una salida de 5 V (el Echo de un HC-SR04, las pull-ups a 5 V de un módulo I²C) se baja con un divisor o un adaptador de nivel; meterla directa fuerza los diodos de protección y puede dañar el chip. Y al revés: 3,3 V puede no ser un “1” para un chip alimentado a 5 V, que suele pedir 3,5 V; ahí se usa un buffer como el 74AHCT125.', q: mcq('Un sensor de 5 V da su salida de 5 V. ¿Cómo la llevas al ESP32?', ['Con un divisor resistivo o un adaptador de nivel', 'Directa, el ESP32 aguanta', 'Con una resistencia de 10 Ω en serie', 'Poniendo un LED en medio'], 'Un divisor de 1 kΩ y 2 kΩ deja 5 V en unos 3,3 V.') },
      { title: 'Las dos direcciones', text: 'Del chip de 5 V al ESP32 hay que <b>bajar</b>: divisor (1 kΩ y 2 kΩ), adaptador de nivel o pull-ups a 3,3 V en lugar de a 5 V. Del ESP32 al chip de 5 V hay que <b>subir</b>, porque muchos piden al menos el 70 % de su alimentación para un “1” (3,5 V con 5 V): tiras WS2812, matrices MAX7219… Un 74AHCT125 alimentado a 5 V acepta 3,3 V como “1” y saca 5 V.', q: mcq('Una tira WS2812 a 5 V falla al azar con la señal directa del ESP32. ¿Por qué?', ['3,3 V queda justo en el umbral de “1” de la tira (0,7 × 5 V = 3,5 V)', 'La tira necesita 12 V', 'El ESP32 da 5 V y la quema', 'Falta un pull-down'], 'Con un adaptador de nivel (74AHCT125) el problema desaparece.') }
    ] },
    es_strap: { name: 'Pines de arranque', alts: [
      { title: 'El chip mira antes de arrancar', text: 'En el instante del reinicio, el ESP32 lee GPIO 0, 2, 5, 12 y 15 para decidir cómo arrancar. Si tu circuito los fuerza al nivel equivocado (un pull-up en el 12, algo que tire del 0 a masa…), la placa no arranca o se queda esperando programa. Después del arranque son pines normales, aunque algunos dan pulsos mientras arranca: no les cuelgues un relé.', q: mcq('Tras conectar un módulo al GPIO 12, la placa ya no arranca. ¿Qué ha pasado?', ['El módulo pone el 12 alto al arrancar y el chip elige flash de 1,8 V', 'El 12 no existe', 'El módulo consume demasiado', 'El 12 es solo de entrada'], 'GPIO 12 alto en el arranque cambia la tensión de la flash del módulo.') },
      { title: 'Lo que lee en cada uno', text: '<b>GPIO 0</b> a masa: modo descarga. <b>GPIO 2</b>: bajo o al aire para poder programar. <b>GPIO 12</b> alto: flash de 1,8 V y el módulo no arranca. <b>GPIO 15</b> bajo: silencia los mensajes de la ROM. Si tu circuito tira de alguno, comprueba que al reiniciar queda en el nivel que el chip espera, y para salidas que no deben moverse (relés), elige otros pines.', q: mcq('Un sensor tira del GPIO 0 a masa y, tras reiniciar, tu programa no se ejecuta. ¿Qué pasa?', ['Arranca en modo descarga, esperando un programa', 'El GPIO 0 se ha quemado', 'La flash está llena', 'Falta el WiFi'], 'GPIO 0 a masa al arrancar = modo descarga.') }
    ] },
    es_pinmap: { name: 'Mapa de pines del ESP32', alts: [
      { title: 'El mapa de zonas', text: 'Piensa en zonas: <b>6–11</b> prohibidos (la flash). <b>34–39</b> solo entrada y sin pull-ups internas. <b>0, 2, 5, 12, 15</b> de arranque: úsalos con cuidado. <b>1 y 3</b> son el puerto serie del USB. El resto (4, 13, 14, 16–19, 21–23, 25–27, 32, 33) son los cómodos.', q: mcq('Necesitas un pin para un LED sin complicarte. ¿Cuál?', ['GPIO 26', 'GPIO 9', 'GPIO 0', 'GPIO 36'], 'El 9 es de la flash, el 0 de arranque y el 36 solo de entrada.') },
      { title: 'Por qué cada zona', text: 'Cada zona tiene su motivo. Los <b>6–11</b> están cableados a la flash del módulo: si los tocas, el programa se cuelga. Los <b>34–39</b> son solo de entrada y no tienen pull-up ni pull-down internas: INPUT_PULLUP no hace nada en ellos. Los de <b>arranque</b> (0, 2, 5, 12, 15) influyen al reiniciar. Lo que queda es terreno cómodo para LED, pulsadores y buses.', q: mcq('Un pulsador a GND en el GPIO 35 con INPUT_PULLUP lee valores al azar. ¿Qué falta?', ['Una pull-up externa de 10 kΩ a 3V3: el 35 no tiene interna', 'Un condensador de 1 F', 'Llevarlo a 5 V', 'Activar el WiFi'], 'Del 34 al 39 no hay resistencias internas.') }
    ] },
    es_adcpins: { name: 'Pines analógicos: ADC1 y ADC2', alts: [
      { title: 'Dos ADC y una trampa', text: 'Lo analógico no pasa por la matriz GPIO: el ADC solo está en sus pines. El ESP32 clásico tiene dos. El <b>ADC1</b> (GPIO 32–39) siempre está disponible. El <b>ADC2</b> (GPIO 0, 2, 4, 12–15 y 25–27) lo usa el driver de WiFi: con WiFi activo no puedes leer sus pines. Regla práctica: todo lo analógico, al ADC1.', q: mcq('Tu proyecto usa WiFi y un potenciómetro en el GPIO 25 da lecturas de error. ¿Solución?', ['Pasar el potenciómetro a un pin del ADC1, como el 34', 'Subir la atenuación', 'Poner un condensador', 'Leer más deprisa'], 'El 25 pertenece al ADC2, ocupado por el WiFi.') },
      { title: 'Comprobar en dos pasos', text: 'Antes de conectar un sensor analógico pregúntate: 1) ¿ese pin tiene canal de ADC? El 21, el 22 o el 23 no lo tienen, y la matriz GPIO no puede dárselo. 2) ¿Es del ADC1? Si es del ADC2 y usas WiFi, no podrás leerlo. Los GPIO 32 a 39 pasan las dos pruebas.', q: mcq('¿Qué pin eliges para un potenciómetro en un proyecto con WiFi?', ['GPIO 33', 'GPIO 26', 'GPIO 23', 'GPIO 4'], 'El 26 y el 4 son del ADC2, y el 23 no tiene ADC.') }
    ] },
    es_adc: { name: 'Atenuación y zona fiable del ADC', alts: [
      { title: 'Una regla que se curva', text: 'Imagina una regla que mide bien en el centro pero se curva en los extremos: así es el ADC del ESP32. Por debajo de unos 0,1 V apenas distingue nada (las señales pequeñas hay que amplificarlas) y por arriba se comprime hasta saturar. Con 11 dB la zona fiable va de unos 0,15 a 2,45 V; con menos atenuación, el techo baja. Diseña tus divisores para trabajar en la zona recta.', q: mcq('Un divisor deja 3,0 V en el pin con 11 dB de atenuación. ¿Qué pasa?', ['La lectura sale comprimida: estás fuera de la zona lineal', 'Lee perfecto', 'El pin se quema', 'Lee 0'], 'Cambia el divisor para quedarte por debajo de unos 2,4 V.') },
      { title: 'Elegir la atenuación', text: 'El atenuador decide qué rango cabe en las 4096 cuentas. Zonas fiables orientativas del ESP32 clásico: <b>0 dB</b> hasta ~0,95 V; <b>2,5 dB</b> hasta ~1,25 V; <b>6 dB</b> hasta ~1,75 V; <b>11 dB</b> hasta ~2,45 V. Elige la menor atenuación que abarque tu señal: así cada cuenta vale menos milivoltios. Si ni 11 dB llega, pon un divisor. Y ninguna mide bien por debajo de unos 0,1 V.', q: mcq('Una señal llega como mucho a 1,1 V. ¿Qué atenuación?', ['2,5 dB', '0 dB', '6 dB', '11 dB y un divisor'], '0 dB no llega a 1,1 V; 2,5 dB sí, con la mejor resolución.') }
    ] },
    es_divbat: { name: 'Divisor delante del ADC', alts: [
      { title: 'Deshacer el divisor', text: 'Un divisor con R1 arriba y R2 abajo deja en el pin <b>Vpin = Vbat · R2 / (R1 + R2)</b>. Para recuperar la batería, deshaz la cuenta: <b>Vbat = Vpin · (R1 + R2) / R2</b>. Mientras está conectado, el divisor gasta Vbat / (R1 + R2). Si las resistencias son enormes (MΩ), el ADC no puede cargar a tiempo su condensador de muestreo: pon 100 nF del pin a masa.', q: mcq('R1 = 100 kΩ, R2 = 100 kΩ y el pin mide 1,9 V. ¿Tensión de la batería?', ['3,8 V', '1,9 V', '0,95 V', '7,6 V'], '1,9 × 200 / 100 = 3,8 V.') },
      { title: 'Ni muy grande ni muy pequeño', text: 'El pin ve Vbat · R2 / (R1 + R2), pero elegir los valores es un equilibrio. Resistencias pequeñas gastan sin parar: 200 kΩ en total con 4,2 V son 21 µA, más que el ESP32 dormido. Resistencias de MΩ apenas gastan, pero no cargan a tiempo el condensador de muestreo del ADC y la lectura sale baja y ruidosa. El arreglo: 100 nF del pin a masa, que hace de depósito, o un MOSFET que conecte el divisor solo al medir.', q: mcq('Divisor de 1 MΩ + 1 MΩ en una batería de 4 V. ¿Qué corriente gasta?', ['2 µA', '4 µA', '2 mA', '0,5 µA'], '4 V / 2 MΩ = 2 µA.') }
    ] },
    es_noise: { name: 'Quitar ruido al ADC', alts: [
      { title: 'Promediar', text: 'El ADC del ESP32 baila decenas de cuentas. Si el ruido es aleatorio, promediar N lecturas lo reduce en <b>√N</b>: 4 lecturas lo dividen entre 2, 16 entre 4 y 64 entre 8. El filtro exponencial, filtrado += α · (lectura − filtrado), es un promedio continuo: con α pequeño suaviza más y reacciona más despacio.', q: mcq('Promedias 64 lecturas. ¿Cuánto se reduce el ruido aleatorio?', ['Unas 8 veces', '64 veces', '32 veces', 'Nada'], '√64 = 8.') },
      { title: 'Un filtro con memoria', text: 'La línea y = y + α · (x − y) mezcla la lectura nueva con lo que ya tenías: con α = 0,1, la nueva pesa un 10 % y el pasado un 90 %. Es un <b>filtro paso bajo</b>: el ruido rápido se aplana, pero un cambio real tarda varias lecturas en notarse. Promediar N lecturas de golpe hace algo parecido: el ruido aleatorio baja en √N.', q: mcq('Comparado con α = 0,2, ¿cómo es la salida con filtrado += 0.05 * (lectura - filtrado)?', ['Más suave, pero tarda más en seguir los cambios', 'Más ruidosa', 'Reacciona más rápido', 'Igual'], 'Menos α: cada lectura nueva pesa menos.') }
    ] },
    es_cal2p: { name: 'Calibración a dos puntos', alts: [
      { title: 'La recta entre dos puntos', text: 'Mides con el multímetro dos tensiones conocidas y anotas lo que lee el ESP32 en cada una. Esos dos puntos definen una recta: <b>pendiente = (V2 − V1) / (L2 − L1)</b> voltios por cuenta. Para cualquier lectura L: <b>V = V1 + (L − L1) · pendiente</b>.', q: mcq('500 cuentas son 0,5 V y 2500 son 2,5 V. ¿Cuántos voltios son 1500?', ['1,5 V', '1,0 V', '2,0 V', '0,75 V'], 'Pendiente 0,001 V por cuenta: 0,5 + 1000 × 0,001 = 1,5 V.') },
      { title: 'Cuánto te has movido', text: 'Piensa en cuánto te has alejado del primer punto. Si de 500 a 3000 cuentas la tensión sube de 0,50 a 2,45 V, cada cuenta vale 1,95 / 2500 = 0,00078 V. Una lectura de 1800 está 1300 cuentas por encima de 500: 0,50 + 1300 × 0,00078 ≈ 1,51 V. El error típico es olvidar sumar la tensión del punto de partida.', q: mcq('1000 cuentas son 1,0 V y 3000 son 2,2 V. ¿Cuánto vale 2000?', ['1,6 V', '1,1 V', '2,0 V', '0,6 V'], 'Pendiente 1,2 / 2000 = 0,0006 V/cuenta: 1,0 + 1000 × 0,0006 = 1,6 V.') }
    ] },
    es_hyst: { name: 'Histéresis con dos umbrales', alts: [
      { title: 'Un termostato', text: 'Con un solo umbral, una señal que ronda ese valor hace conmutar la salida sin parar: el LED parpadea. Con <b>histéresis</b> hay dos umbrales: se enciende al superar el alto y se apaga al bajar del bajo. Entre ambos, la salida se queda como estaba.', q: mcq('Encender por encima de 3000, apagar por debajo de 2500. El LED está encendido y la lectura baja a 2700. ¿Qué pasa?', ['Sigue encendido', 'Se apaga', 'Parpadea', 'Se reinicia'], 'Hasta bajar de 2500 no se apaga.') },
      { title: 'La decisión tiene memoria', text: 'La clave es que la decisión depende del estado anterior: if (!encendido && luz > ALTO) encendido = true; if (encendido && luz < BAJO) encendido = false. En la franja entre BAJO y ALTO no se cumple ninguna condición y nada cambia. Cuanto más separados los umbrales, más ruido aguanta sin parpadear.', q: mcq('¿Qué pasa si pones el umbral BAJO igual que el ALTO?', ['Vuelves a un solo umbral y la salida puede parpadear con el ruido', 'Nunca se enciende', 'Nunca se apaga', 'Aguanta más ruido'], 'Sin franja intermedia no hay histéresis.') }
    ] },
    es_bus: { name: 'La matriz GPIO', alts: [
      { title: 'Una centralita de teléfonos', text: 'La <b>matriz GPIO</b> es como una centralita: conecta la UART, el I²C, el SPI o el LEDC a casi cualquier pin. Por eso indicas tú los pines: Wire.begin(sda, scl), Serial2.begin(baudios, formato, rx, tx), SPI.begin(sck, miso, mosi, cs). Solo lo analógico (ADC, DAC, touch) va soldado a pines fijos.', q: mcq('¿Qué hace Serial2.begin(9600, SERIAL_8N1, 26, 27)?', ['Abre la UART2 a 9600 baudios con RX en el 26 y TX en el 27', 'Abre la UART0 en los pines del USB', 'Lee los pines 26 y 27 como analógicos', 'Configura el I²C'], 'El orden es: baudios, formato, RX y TX.') },
      { title: 'Costumbres, no cables fijos', text: 'Arduino-ESP32 tiene pines por defecto: I²C en SDA 21 y SCL 22; SPI en SCK 18, MISO 19, MOSI 23 y CS 5; UART2 en RX 16 y TX 17. Son costumbres: la matriz te deja moverlos. Y a veces debes hacerlo: los pines originales de la UART1 (9 y 10) son de la flash, y en un WROVER el 16 y el 17 son de la PSRAM.', q: mcq('Vas a usar la UART1 para un GPS. ¿Qué pines indicas?', ['Dos pines libres cualquiera, por ejemplo el 26 y el 27', 'Los de fábrica, 9 y 10', 'El 1 y el 3', 'El 34 para TX y el 35 para RX'], 'El 9 y el 10 son de la flash, el 1 y el 3 del USB, y el 34 no puede ser salida.') }
    ] },
    es_mask: { name: 'Máscaras de bits por pin', alts: [
      { title: 'Un bit por pin', text: 'Muchos registros y funciones del ESP32 usan una palabra en la que <b>cada bit es un pin</b>: el bit 25 es el GPIO 25. (1 << 25) | (1 << 26) marca el 25 y el 26. Escribir esa máscara en GPIO_OUT_W1TS_REG los pone a 1 a la vez; en GPIO_OUT_W1TC_REG, a 0; los bits a 0 no tocan nada. gpio_config() de ESP-IDF usa la misma idea en .pin_bit_mask, de 64 bits (por eso 1ULL).', q: mcq('¿Qué pines marca (1ULL << 4) | (1ULL << 18)?', ['El GPIO 4 y el GPIO 18', 'El GPIO 22', 'Del 4 al 18', 'El GPIO 418'], 'Cada desplazamiento enciende un bit: el 4 y el 18.') },
      { title: 'Una plantilla con agujeros', text: 'Imagina una fila de casillas, una por pin. La máscara es una plantilla con agujeros en los pines que quieres tocar. W1TS (write 1 to set) pinta de 1 los agujeros; W1TC (write 1 to clear) los pinta de 0; el resto no se mueve. Así cambias varios pines en la misma instrucción, sin leer antes el registro. gpio_config() usa la misma plantilla para elegir qué pines configura.', q: mcq('REG_WRITE(GPIO_OUT_W1TC_REG, 1 << 13). ¿Qué pasa?', ['El GPIO 13 pasa a 0 y los demás no cambian', 'Todos pasan a 0 menos el 13', 'El GPIO 13 pasa a 1', 'Se leen 13 pines'], 'W1TC: los bits a 1 de la máscara ponen su pin a 0.') }
    ] },
    es_bustime: { name: 'Cuánto tarda un bus', alts: [
      { title: 'Cuánto tarda un byte', text: 'En una UART cada bit dura <b>1 / baudios</b>, y con formato 8N1 cada byte son 10 bits (inicio, 8 de datos y parada). A 115 200 baudios: 8,7 µs por bit y 87 µs por byte. En I²C cada byte son 9 bits (8 + ACK), más la dirección y las condiciones de inicio: a 400 kHz, leer 6 bytes de un sensor ronda los 200 µs.', q: mcq('¿Cuánto se tarda en enviar 100 bytes a 9600 baudios (8N1)?', ['Unos 104 ms', 'Unos 10 ms', 'Unos 83 ms', '1 s'], '100 × 10 bits / 9600 ≈ 0,104 s.') },
      { title: 'Bits por segundo, no bytes', text: 'Baudios son bits por segundo, pero un byte no son 8 bits en el cable: en UART 8N1 son 10 y en I²C 9, más la sobrecarga de dirección. Receta: cuenta los bits que viajan de verdad y divide entre la velocidad. El error típico es dividir bytes × 8 entre los baudios y quedarse un 20 % corto.', q: mcq('¿Cuánto dura un bit a 9600 baudios?', ['104 µs', '9,6 µs', '1,04 ms', '10,4 µs'], '1 / 9600 s ≈ 0,000104 s.') }
    ] },

    /* --- M3 · periféricos --- */
    es_ledc: { name: 'Frecuencia y resolución del LEDC', alts: [
      { title: 'Un reparto del reloj', text: 'El LEDC cuenta pulsos de un reloj de 80 MHz. En cada periodo del PWM tiene que contar 2^bits pasos. Por eso <b>f × 2^bits ≤ 80 MHz</b>: si subes la frecuencia, te quedan menos bits; si quieres muchos bits, la frecuencia baja.', q: mcq('Quieres 10 bits de resolución. ¿Frecuencia máxima aproximada?', ['78 kHz', '80 MHz', '1 kHz', '10 kHz'], '80 000 000 / 1024 ≈ 78 125 Hz.') },
      { title: 'Escalones frente a velocidad', text: 'Con 8 bits el ciclo de trabajo se ajusta en 256 escalones; con 13 bits, en 8192. Pero cada bit de más divide la frecuencia máxima entre 2, porque f × 2^bits ≤ 80 MHz. A 20 kHz (fuera del oído, para un motor) caben 80 000 000 / 20 000 = 4000 cuentas: la mayor potencia de 2 que cabe es 2048, es decir, 11 bits.', q: mcq('Un motor pita con PWM a 1 kHz. ¿Qué haces?', ['Subir a unos 20 kHz y aceptar menos resolución', 'Bajar a 100 Hz', 'Subir la resolución a 16 bits', 'Nada, es normal'], 'A 20 kHz caben 11 bits: de sobra para un motor.') }
    ] },
    es_duty: { name: 'Valor de ledcWrite y ciclo de trabajo', alts: [
      { title: 'Una fracción de la cuenta total', text: 'Con b bits, cada periodo del PWM se divide en 2^b pasos. ledcWrite(pin, valor) dice cuántos de ellos está alto: <b>ciclo = valor / 2^b</b>. Con 12 bits (4096 pasos), 1024 es el 25 %. Al revés: <b>valor = ciclo × 2^b</b>.', q: mcq('Con 10 bits, ¿qué valor da un 75 %?', ['768', '750', '1023', '256'], '0,75 × 1024 = 768.') },
      { title: 'De milisegundos a cuentas', text: 'Si te piden un pulso de cierta duración, pásalo primero a fracción del periodo. Un servo a 50 Hz tiene un periodo de 20 ms; un pulso de 1,5 ms es 1,5 / 20 = 7,5 % del periodo. Con 16 bits: 0,075 × 65 536 ≈ 4915. El error típico es olvidar dividir entre el periodo.', q: mcq('Servo a 50 Hz con 14 bits (16 384 pasos). ¿Valor para un pulso de 1 ms?', ['819', '1638', '16 384', '410'], '1 / 20 × 16 384 ≈ 819.') }
    ] },
    es_ledctimer: { name: 'Temporizador y canal del LEDC', alts: [
      { title: 'Quién marca el ritmo', text: 'Cada salida del LEDC combina un <b>temporizador</b>, que fija la frecuencia y la resolución, y un <b>canal</b>, que fija el ciclo de trabajo. Dos pines con el mismo temporizador comparten frecuencia y resolución, pero cada uno tiene su ciclo. analogWrite() usa el LEDC con valores por defecto (1 kHz y 8 bits) y ledcWriteTone() cambia la frecuencia dejando el ciclo al 50 %.', q: mcq('Cambias la frecuencia de un pin y otro pin cambia también. ¿Por qué?', ['Comparten temporizador: la frecuencia y la resolución son comunes', 'Es un fallo del chip', 'Comparten ciclo de trabajo', 'Están demasiado cerca'], 'El ciclo es de cada canal; la frecuencia, del temporizador.') },
      { title: 'Un director y sus músicos', text: 'El temporizador es el director: marca el compás (frecuencia) y en cuántas partes se divide (resolución). Cada canal es un músico que decide cuánto rato de cada compás toca (ciclo de trabajo). ledcWriteTone(pin, 440) pone a dirigir a 440 Hz con el músico al 50 %: un tono para un zumbador. analogWrite() es el atajo: 1 kHz y 8 bits sin preguntarte.', q: mcq('¿Qué genera ledcWriteTone(pin, 1000)?', ['Una cuadrada de 1000 Hz al 50 %', 'Un PWM de 1000 Hz al 100 %', 'Un seno de 1000 Hz', 'Una tensión continua de 1 V'], 'Fija la frecuencia y deja el ciclo a la mitad.') }
    ] },
    es_dac: { name: 'El DAC del ESP32', alts: [
      { title: 'Una tensión de verdad', text: 'El ESP32 clásico tiene un DAC de 8 bits en los GPIO 25 y 26 (el S2 también tiene DAC; el S3 y el C3, no). dacWrite(pin, n) da una tensión continua de verdad, sin el rizado de un PWM filtrado: aproximadamente <b>V = n / 255 × 3,3 V</b>. Pero es una salida débil: no da corriente para un altavoz o un motor; para eso hace falta un amplificador.', q: mcq('dacWrite(25, 100). ¿Tensión aproximada?', ['1,29 V', '1,0 V', '3,3 V', '0,39 V'], '100 / 255 × 3,3 ≈ 1,29 V.') },
      { title: 'Comparado con el PWM', text: 'Un PWM es una cuadrada que vale 0 o 3,3 V; para tener una tensión media necesitas un filtro RC, y aun así queda rizado. El DAC entrega directamente un nivel fijo: n / 255 × 3,3 V, con 256 escalones de unos 13 mV. Los dos comparten un límite: un pin solo da unos miliamperios, así que un altavoz de 8 Ω necesita un amplificador.', q: mcq('¿Cuánto vale cada escalón del DAC de 8 bits con 3,3 V?', ['Unos 13 mV', 'Unos 3,3 mV', 'Unos 0,8 mV', 'Unos 130 mV'], '3,3 V / 255 ≈ 0,013 V.') }
    ] },
    es_touch: { name: 'Sensores táctiles', alts: [
      { title: 'Tu dedo es un condensador', text: 'El sensor carga y descarga la capacidad del pin muchas veces y cuenta. Tu dedo añade capacidad hacia tierra. Cada canal va a un pin fijo (T0 es el GPIO 4, T9 el 32). En el ESP32 clásico el valor de <b>touchRead()</b> baja al tocar; en el S2 y el S3, sube. Mide sin tocar, mide tocando y pon el umbral entre ambos; touchAttachInterrupt() hace la comparación por ti.', q: mcq('Sin tocar lees 62 y tocando 18 en un ESP32 clásico. ¿Qué umbral pones?', ['Alrededor de 40: “tocado” si baja de ahí', '100: “tocado” si sube', '62 exacto', '0'], 'A medio camino, con margen para la deriva.') },
      { title: 'Con números', text: 'Mide la base sin tocar (por ejemplo, 60) y pon el umbral por debajo, a una fracción: 2/3 de 60 son 40. Si la lectura baja de 40 (ESP32 clásico), es un toque. touchAttachInterrupt(pin, función, umbral) vigila ese cruce y llama a tu función sin que tengas que sondear. La base cambia con la humedad, los cables o la fuente: recalcúlala al arrancar.', q: mcq('Base sin tocar: 75. Umbral a 2/3 de la base. ¿Qué valor pones?', ['50', '25', '112', '75'], '75 × 2 / 3 = 50.') }
    ] },
    es_rmt: { name: 'RMT: pulsos por hardware', alts: [
      { title: 'Una partitura de pulsos', text: 'El RMT recibe una lista de “nivel y duración” y la reproduce por hardware con resolución de hasta 12,5 ns, sin que la CPU intervenga; también hace lo contrario, capturar duraciones. Por eso es perfecto para tiras WS2812, que exigen pulsos de décimas de microsegundo, y para mandos infrarrojos, que codifican la información en ráfagas de 38 kHz.', q: mcq('¿Por qué no generar la señal de una WS2812 con digitalWrite?', ['Exige pulsos de ~0,4 µs con poca tolerancia; una interrupción en medio la estropea', 'digitalWrite no existe en el ESP32', 'La tira necesita 5 V', 'Funcionaría igual'], 'El RMT la genera por hardware, inmune a las interrupciones.') },
      { title: 'Luz que parpadea a 38 kHz', text: 'Un mando IR no enciende su LED sin más: lo hace parpadear a unos 38 kHz en ráfagas, y la información va en la duración de ráfagas y silencios. El receptor (TSOP38238) quita la portadora y entrega la envolvente. Medir o generar esas duraciones con precisión es lo que hace el RMT por hardware, igual que los pulsos cortísimos de una WS2812, que con digitalWrite saldrían mal.', q: mcq('¿Por qué los mandos IR modulan a 38 kHz?', ['Para distinguir su señal de la luz ambiente', 'Para gastar más batería', 'Porque es la frecuencia del WiFi', 'Para que se vea la luz'], 'El receptor solo responde a luz que parpadea a esa frecuencia.') }
    ] },
    es_ws2812: { name: 'Tiras WS2812: tiempo, colores y corriente', alts: [
      { title: 'Con números', text: 'Una WS2812 recibe 800 000 bits por segundo: 1,25 µs por bit y 24 bits por LED, en orden <b>verde, rojo, azul</b> (GRB). Para 100 LED: 100 × 24 × 1,25 µs = 3 ms. Y cada LED en blanco total gasta hasta unos 60 mA: 100 LED piden 6 A.', q: mcq('¿Cuánto tarda en enviarse una tira de 300 LED WS2812?', ['9 ms', '0,9 ms', '90 ms', '300 µs'], '300 × 24 × 1,25 µs = 9000 µs.') },
      { title: 'Un tren con vagones', text: 'La tira es un tren: el primer LED se queda los primeros 24 bits (su color, en orden G, R, B) y pasa el resto al siguiente. Por eso el tiempo crece con el número de LED (24 × 1,25 µs cada uno) y por eso una biblioteca configurada como RGB saca el rojo y el verde cambiados. La corriente también se suma: hasta 60 mA por LED en blanco.', q: mcq('Con 50 LED en blanco total, ¿qué corriente debe dar la fuente?', ['Unos 3 A', 'Unos 60 mA', 'Unos 0,3 A', 'Unos 30 A'], '50 × 0,06 A = 3 A.') }
    ] },
    es_i2s: { name: 'Líneas y chips I²S', alts: [
      { title: 'Tres hilos para el sonido', text: 'I²S manda muestras de audio: <b>BCLK</b> marca cada bit, <b>WS</b> (LRCLK) dice si la muestra es del canal izquierdo o del derecho y <b>DATA</b> lleva los bits. Algunos DAC piden además <b>MCLK</b>, un reloj maestro. Al otro lado: MAX98357A (DAC y amplificador, altavoz directo), PCM5102A (DAC con salida de línea) o INMP441 (micrófono).', q: mcq('¿Qué indica la línea WS?', ['A qué canal (izquierdo o derecho) pertenece la muestra', 'El volumen', 'La frecuencia del tono', 'Que hay error'], 'Por eso también se llama LRCLK.') },
      { title: 'Elegir el chip', text: 'Todos hablan con las mismas líneas (BCLK para los bits, WS para el canal y DATA para las muestras), pero hacen cosas distintas. Para mover un altavoz pequeño con lo mínimo, el MAX98357A lleva DAC y amplificador de clase D en uno. Para llevar audio a un amplificador o unos auriculares, un DAC como el PCM5102A. Para grabar, un micrófono digital como el INMP441.', q: mcq('Quieres captar sonido con el ESP32 por I²S. ¿Qué chip?', ['INMP441', 'MAX98357A', 'PCM5102A', '74AHCT125'], 'El INMP441 es un micrófono con salida I²S.') }
    ] },
    es_i2sbuf: { name: 'Caudal y búfer de audio', alts: [
      { title: 'Cuentas de caudal', text: 'Audio de 44,1 kHz, 16 bits y estéreo: 44 100 × 2 × 2 = 176 400 bytes por segundo, y BCLK = 44 100 × 16 × 2 = 1,41 MHz (un pulso por bit). Un búfer de N muestras dura <b>N / fs</b>: 512 muestras a 44 100 Hz son 11,6 ms. Si tu tarea no lo rellena antes, se oye un clic.', q: mcq('Audio de 16 kHz, 16 bits y mono. ¿Bytes por segundo?', ['32 000', '16 000', '256 000', '64 000'], '16 000 muestras × 2 bytes.') },
      { title: 'Un depósito que se vacía', text: 'El DMA vacía el búfer a ritmo fijo, como un grifo abierto: fs × bits × canales bits por segundo, que es justo la frecuencia de BCLK. N muestras duran N / fs segundos, y tu tarea debe rellenarlo antes de que se acabe. Si el WiFi la retrasa más que ese margen, suena un chasquido: más búfer (más margen y más retardo) o una tarea de audio con más prioridad.', q: mcq('Un búfer de 2048 muestras a 48 000 Hz, ¿cuánto margen da?', ['Unos 43 ms', 'Unos 23 ms', 'Unos 4,3 ms', 'Unos 430 ms'], '2048 / 48 000 ≈ 0,0427 s.') }
    ] },
    es_buses: { name: 'Varios dispositivos en I²C y SPI', alts: [
      { title: 'Direcciones y CS', text: 'En <b>I²C</b> cada dispositivo responde a una dirección; un escáner prueba todas y lista las que contestan con ACK (endTransmission() devuelve 0). Si dos tienen la misma dirección fija, no caben en el mismo bus: el ESP32 tiene dos controladores, Wire y Wire1. En <b>SPI</b> no hay direcciones: los dispositivos comparten SCK, MISO y MOSI y cada uno tiene su propio hilo CS.', q: mcq('Dos sensores I²C con la misma dirección fija. ¿Solución en el ESP32?', ['Uno en Wire y otro en Wire1', 'Los dos en Wire a distinta velocidad', 'Pasar uno a la UART', 'Es imposible'], 'Dos buses, dos espacios de direcciones.') },
      { title: 'Llamar por el nombre o señalar', text: 'I²C es una sala en la que se llama por el nombre: el ESP32 dice una dirección y solo contesta quien la tiene; si nadie contesta, no hay ACK. SPI es una sala en la que se señala con el dedo: bajando el CS de un dispositivo, solo ese escucha. Por eso SPI no tiene conflictos de dirección y es más rápido, a cambio de un hilo más por dispositivo.', q: mcq('Una pantalla TFT y una tarjeta SD por SPI. ¿Qué comparten y qué no?', ['Comparten SCK, MISO y MOSI; cada una tiene su CS', 'Lo comparten todo, CS incluido', 'No comparten nada', 'Solo comparten CS'], 'Solo atiende el dispositivo con su CS bajo.') }
    ] },
    es_isr: { name: 'ISR cortas y en IRAM', alts: [
      { title: 'Entra, apunta y sal', text: 'Una ISR debe durar microsegundos: guardar un dato, avisar (un flag volatile, una cola o una notificación) y salir. Nada de delay, Serial ni operaciones lentas: lo pesado lo hace después una tarea o loop(). Y en el ESP32 se marca con <b>IRAM_ATTR</b> para que esté en RAM interna.', q: mcq('¿Qué es correcto dentro de una ISR?', ['Guardar el instante en una variable volatile y salir', 'Serial.println para depurar', 'delay(10) para el antirrebote', 'Conectar al WiFi'], 'Corta y sin llamadas que bloqueen.') },
      { title: 'Por qué IRAM_ATTR', text: 'El código normal se ejecuta desde la flash a través de una caché. Mientras se escribe en la flash (NVS, OTA, LittleFS) la caché se desactiva; si salta una interrupción y su código está en flash, el chip falla. <b>IRAM_ATTR</b> la coloca en RAM interna, siempre accesible. Por la misma razón de prisa, la ISR solo apunta y avisa, y el trabajo lento va fuera.', q: mcq('¿Qué hace IRAM_ATTR?', ['Coloca la función en RAM interna para que pueda ejecutarse aunque la caché de flash esté desactivada', 'La hace más corta', 'La ejecuta en el otro núcleo', 'Desactiva el WiFi'], 'Imprescindible en las ISR del ESP32.') }
    ] },
    es_bounce: { name: 'Rebotes en una interrupción', alts: [
      { title: 'Una pelota que bota', text: 'Al pulsar, las láminas del pulsador rebotan durante unos milisegundos y la señal sube y baja varias veces. Una interrupción por flanco (FALLING) salta en <b>cada</b> rebote, así que una pulsación cuenta varias. Remedio: en la ISR, ignora los flancos que lleguen a menos de unos 20 ms del último aceptado, o filtra con una red RC.', q: mcq('Cada pulsación cuenta 3 o 4 veces con attachInterrupt(…, FALLING). ¿Qué haces?', ['Ignorar los flancos a menos de unos 20 ms del anterior', 'Quitar IRAM_ATTR', 'Cambiar a RISING y listo', 'Poner delay(20) dentro de la ISR'], 'delay no se usa en una ISR: compara instantes con millis() o micros().') },
      { title: 'Con tiempos', text: 'Guarda el instante del último flanco válido. En cada interrupción, si han pasado menos de 20 ms, es un rebote y no cuenta; si no, cuenta y actualizas el instante. Un condensador de 100 nF con una resistencia también suaviza los rebotes por hardware antes de que lleguen al pin.', q: mcq('Último flanco aceptado a los 1000 ms; llega otro a los 1008 ms. Con 20 ms de antirrebote:', ['Se ignora: es un rebote', 'Cuenta como pulsación', 'Reinicia el contador', 'Desactiva la interrupción'], '8 ms es menos que 20 ms.') }
    ] },
    es_race: { name: 'Condiciones de carrera y volatile', alts: [
      { title: 'Leer, sumar, escribir', text: 'contador++ son tres pasos: leer, sumar y escribir. Si otra tarea (o una ISR) hace lo mismo entre medias, una suma se pierde: es una <b>condición de carrera</b>. Con dos núcleos puede pasar de verdad a la vez. <b>volatile</b> solo obliga a leer la variable de la memoria cada vez; no hace atómica una operación. Un bool que escribe uno y lee otro suele bastar con volatile; un contador compartido o una estructura necesitan sección crítica o mutex.', q: mcq('Dos tareas suman 1 a la misma variable 100 000 veces cada una y el resultado es 187 342. ¿Por qué?', ['Condición de carrera: se pisan entre la lectura y la escritura', 'El ESP32 no sabe sumar', 'Se desborda el entero', 'Falta un delay'], 'Protege la sección o usa operaciones atómicas.') },
      { title: 'Dos manos en la misma libreta', text: 'Dos tareas, o una ISR y loop(), apuntan en la misma libreta. Si una lee el número, la otra lo cambia y la primera escribe su resultado, se pierde un cambio. Para variables compartidas: márcalas <b>volatile</b> para que el compilador no guarde copias en registros, y protege lo que no se lee o escribe de una vez (64 bits, varios campos, leer-modificar-escribir) con portENTER_CRITICAL o un mutex.', q: mcq('Un contador uint64_t que suma una ISR y lee loop(). ¿Qué necesita?', ['volatile y leerlo dentro de una sección crítica', 'Nada, es un número', 'Solo volatile', 'Que sea una variable local'], 'Un dato de 64 bits no se lee de una vez en un chip de 32 bits.') }
    ] },

    /* --- M4 · FreeRTOS --- */
    es_task: { name: 'Qué es una tarea', alts: [
      { title: 'Una función que no termina', text: 'Una tarea de FreeRTOS es una función con su propio bucle infinito, su pila y su prioridad. No debe llegar nunca al final: si tiene que acabar, se borra con vTaskDelete(NULL). Al crearla le puedes pasar un puntero (void *param) para que la misma función sirva a varias tareas. La ventaja: cada parte del programa lleva su ritmo y una lenta no frena a las demás.', q: mcq('¿Para qué pasas &config como parámetro al crear una tarea?', ['Para que la tarea reciba sus datos de configuración', 'Para fijar su prioridad', 'Para darle más pila', 'Para elegir el núcleo'], 'Ese argumento llega a la tarea como void *param.') },
      { title: 'Estados de una tarea', text: 'Una tarea está <b>ejecutándose</b>, <b>lista</b> (quiere CPU), <b>bloqueada</b> (espera tiempo o un evento) o <b>suspendida</b> (apartada hasta que la reanuden). Lo bueno es que pase casi todo el tiempo bloqueada: no gasta CPU y despierta en cuanto hay algo que hacer. Su función nunca termina (para acabar, vTaskDelete) y puede recibir datos al crearse por void *param.', q: mcq('Una tarea espera con xQueueReceive(cola, &d, portMAX_DELAY) y la cola está vacía. ¿En qué estado está?', ['Bloqueada: no gasta CPU hasta que llegue un dato', 'Ejecutándose', 'Suspendida para siempre', 'Borrada'], 'Despierta sola cuando alguien mete un dato.') }
    ] },
    es_rtos: { name: 'Bloquearse para ceder la CPU', alts: [
      { title: 'Cocineros y fogones', text: 'Cada tarea es un cocinero con su receta. El planificador es el jefe de cocina: en cada núcleo deja trabajar al cocinero de más prioridad que esté listo. Un cocinero que espera bloqueado (delay, vTaskDelay, una cola) deja el fogón libre. Uno que da vueltas sin parar (espera activa) no lo suelta nunca: los de menos prioridad de ese núcleo no cocinan, y si es el núcleo 0, la radio tampoco.', q: mcq('Una tarea de prioridad 3 hace while(millis() - t < 500) {}. ¿Qué les pasa a las tareas de prioridad 1 de su núcleo?', ['No se ejecutan mientras dure la espera activa', 'Se ejecutan normal', 'Se ejecutan solas en el otro núcleo', 'Se borran'], 'La espera activa no cede la CPU; vTaskDelay sí.') },
      { title: 'delay, vTaskDelay y ticks', text: 'En el ESP32, delay() llama a vTaskDelay: la tarea se bloquea y el planificador da la CPU a otra. Una espera activa (un while con millis()) no se bloquea nunca y deja sin CPU a las de menor prioridad. vTaskDelay cuenta en <b>ticks</b>: usa pdMS_TO_TICKS(ms) para no depender de que el tick sea de 1000 Hz (Arduino) o de 100 Hz (ESP-IDF por defecto).', q: mcq('Con un tick de 100 Hz, ¿cuánto espera vTaskDelay(50)?', ['500 ms', '50 ms', '5 ms', '5 s'], 'Cada tick dura 10 ms: 50 × 10 ms.') }
    ] },
    es_taskstack: { name: 'La pila de una tarea', alts: [
      { title: 'Lo mínimo que quedó libre', text: 'En ESP-IDF, el tamaño de pila de xTaskCreate va en <b>bytes</b> (en el FreeRTOS original, en palabras). uxTaskGetStackHighWaterMark() devuelve lo mínimo que ha llegado a quedar libre: lo usado como máximo es la pila total menos esa marca. Deja margen (unos cientos de bytes) y mide tras probar los casos más exigentes.', q: mcq('Pila de 4096 bytes; la marca de agua alta es 1000. ¿Cuánto ha llegado a usar como máximo?', ['3096 bytes', '1000 bytes', '5096 bytes', '4096 bytes'], '4096 − 1000 = 3096.') },
      { title: 'Una jarra con marca', text: 'Imagina una jarra en la que queda marcado el nivel más alto que alcanzó el agua. La marca de agua alta de FreeRTOS hace eso con la pila (en bytes en ESP-IDF), pero dicho al revés: indica lo que <b>nunca</b> se ha llegado a usar. Si queda muy poco (menos de unos 512 bytes), una llamada más profunda o un printf grande la desbordará (“Stack canary watchpoint triggered”): súbela.', q: mcq('La marca de agua alta de una tarea es 120 bytes. ¿Qué haces?', ['Subir la pila: queda muy poco margen', 'Bajarla a la mitad', 'Nada: la pila crece sola', 'Pasar la tarea al otro núcleo'], 'Con 120 bytes libres en el peor caso, cualquier cambio la desborda.') }
    ] },
    es_sync: { name: 'Colas, notificaciones y eventos', alts: [
      { title: 'Un buzón con copia', text: 'Una <b>cola</b> es un buzón de tamaño fijo: xQueueSend copia el dato dentro y xQueueReceive lo saca en orden. Sus datos ocupan elementos × tamaño de cada uno (10 × 12 bytes = 120 bytes). Quien espera con portMAX_DELAY se bloquea sin gastar CPU hasta que llega algo; si está llena y envías con espera 0, devuelve errQUEUE_FULL y el dato no entra. Desde una ISR se usa xQueueSendFromISR.', q: mcq('Una cola de 20 elementos de 8 bytes. ¿Cuánto ocupan los datos?', ['160 bytes', '28 bytes', '20 bytes', '8 bytes'], '20 × 8 = 160 bytes, más la cabecera de la cola.') },
      { title: 'La herramienta según el mensaje', text: '¿Hay que pasar datos, en orden? <b>Cola</b>. ¿Solo despertar a una tarea concreta con un número pequeño, lo más rápido posible? <b>Notificación de tarea</b>. ¿Esperar a que se cumplan varias condiciones a la vez (WiFi conectado y hora sincronizada)? <b>Grupo de eventos</b>, un bit por condición. En los tres casos, quien espera queda bloqueado sin gastar CPU, y desde una ISR se usan las versiones FromISR.', q: mcq('Una ISR solo tiene que despertar a la tarea que procesa el sensor. ¿Lo más ligero?', ['Una notificación de tarea (vTaskNotifyGiveFromISR)', 'Una cola de 100 elementos', 'Un mutex', 'Una variable global y un while'], 'Las notificaciones son el mecanismo más rápido para despertar a una tarea.') }
    ] },
    es_mutex: { name: 'Mutex y semáforos', alts: [
      { title: 'El baño con una sola llave', text: 'Un <b>mutex</b> es la llave del único baño: quien la tiene usa el recurso (el bus I²C, una pantalla) y los demás esperan bloqueados; al terminar, la devuelve quien la cogió. Nunca se usa en una ISR, que no puede quedarse esperando. Y si necesitas dos llaves, cógelas siempre en el mismo orden: si no, dos tareas pueden quedarse esperando cada una la llave de la otra (<b>interbloqueo</b>).', q: mcq('Dos tareas usan la misma pantalla I²C y a veces sale basura. ¿Solución?', ['Proteger cada uso del bus con un mutex', 'Subir la prioridad de una', 'Poner delay(1)', 'Usar dos núcleos'], 'Cada transacción completa debe terminar antes de que empiece la otra.') },
      { title: 'Mutex, semáforo o cola', text: 'Se parecen, pero no son iguales. El <b>mutex</b> protege un recurso: tiene dueño y herencia de prioridad (la tarea baja que lo tiene sube temporalmente para soltarlo antes). El <b>semáforo binario</b> señala que algo ha ocurrido y puede darse desde una ISR (FromISR). El <b>contador</b> lleva la cuenta de N recursos iguales. La <b>cola</b> pasa datos.', q: mcq('Hay 3 búferes iguales y varias tareas que los piden. ¿Qué usas para saber si queda alguno?', ['Un semáforo contador iniciado a 3', 'Un mutex', 'Un semáforo binario', 'Una notificación'], 'Cada tarea toma uno y lo devuelve al acabar.') }
    ] },

    /* --- M5 · flash --- */
    es_flash: { name: 'Tabla de particiones', alts: [
      { title: 'Un mueble con cajones', text: 'La flash se divide en particiones como un mueble en cajones: nvs (ajustes), otadata, app0 y app1 (programas), spiffs (archivos) y coredump (el estado tras un pánico, para analizarlo luego). La tabla se elige en el IDE (“Partition Scheme”) junto con el tamaño de flash: si el programa no cabe en su cajón, elige un esquema con app más grande. Los tamaños van en hexadecimal: 0x100000 = 1 048 576 bytes = 1 MB.', q: mcq('Tu programa de 1,7 MB no cabe en app0 (1,25 MB). ¿Qué haces?', ['Elegir un esquema de particiones con app más grande (por ejemplo, sin OTA)', 'Borrar la NVS', 'Subir la frecuencia de la CPU', 'Comprimir la RAM'], 'Menú Herramientas → Partition Scheme.') },
      { title: 'Leer la tabla', text: 'Cada línea de la tabla dice nombre, tipo, subtipo, dónde empieza y cuánto mide, en hexadecimal. Para pasar un tamaño a KB, conviértelo a decimal y divide entre 1024: 0x140000 = 1 310 720 bytes = 1280 KB. Si tu placa tiene 16 MB pero el IDE cree que tiene 4 MB, el resto se queda sin usar: elige el tamaño real y un esquema que lo aproveche.', q: mcq('Una partición mide 0x10000 bytes. ¿Cuántos KB son?', ['64 KB', '10 KB', '16 KB', '100 KB'], '0x10000 = 65 536 bytes = 64 KB.') }
    ] },
    es_ota: { name: 'OTA con dos particiones', alts: [
      { title: 'Escribir en el hueco libre', text: 'Con dos particiones de aplicación, la OTA escribe la versión nueva en la que <b>no</b> está en uso. Solo cuando la imagen está completa y comprobada se marca en otadata para el próximo arranque, y al reiniciar el cargador arranca la nueva. Si se va la luz antes, sigue arrancando la versión anterior, intacta.', q: mcq('Se corta la descarga OTA al 60 %. ¿Qué arranca después?', ['La versión anterior, que no se ha tocado', 'Una versión a medias', 'Nada: la placa queda inservible', 'El cargador de la ROM'], 'otadata solo cambia cuando la imagen nueva está completa.') },
      { title: 'Una versión a prueba', text: 'Con rollback activado, la versión nueva arranca “a prueba”. Debe comprobar que funciona (WiFi conectado, sensores respondiendo…) y entonces declararse válida con esp_ota_mark_app_valid_cancel_rollback(). Si se cuelga y reinicia antes, el cargador vuelve a la anterior. Todo esto es posible porque la anterior sigue guardada en la otra partición de aplicación.', q: mcq('Una versión nueva se cuelga antes de declararse válida y el chip se reinicia. Con rollback activo, ¿qué arranca?', ['La versión anterior', 'La nueva otra vez, para siempre', 'Nada', 'Un programa de fábrica'], 'La nueva no llegó a validarse.') }
    ] },
    es_wear: { name: 'Desgaste de la flash', alts: [
      { title: 'La flash se desgasta', text: 'La flash se borra en sectores de 4 KB y cada sector aguanta del orden de 100 000 borrados. Borrar el mismo sector una vez por minuto lo agotaría en unos 69 días (100 000 / 1440). NVS y LittleFS reparten las escrituras, pero tú decides cuánto escribes: guarda solo cuando el dato cambie de verdad y lleve un rato estable.', q: mcq('Guardas la posición de un mando en NVS cada 100 ms mientras lo giras. ¿Mejor idea?', ['Guardar solo cuando lleva unos segundos sin cambiar', 'Guardar cada 10 ms', 'No guardar nunca', 'Guardar en la partición de la app'], 'Menos escrituras, más vida.') },
      { title: 'Contar borrados', text: 'Calcula la vida: ciclos ÷ borrados al día. 100 000 borrados a uno por minuto (1440 al día) dan unos 69 días; a uno por hora, más de 11 años. NVS y LittleFS reparten los borrados entre muchos sectores, lo que multiplica la vida, pero la regla sigue siendo la misma: escribir solo cuando haga falta.', q: mcq('Un sector aguanta 100 000 borrados. Si lo borras una vez por hora, ¿cuánto dura?', ['Unos 11 años', 'Unos 69 días', 'Unos 4 días', 'Unos 100 años'], '100 000 / 24 ≈ 4167 días ≈ 11,4 años.') }
    ] },
    es_nvs: { name: 'NVS y Preferences', alts: [
      { title: 'Fichas con etiqueta', text: 'NVS guarda pares clave-valor en la flash, agrupados en espacios de nombres. Con Preferences: begin("ns") abre el espacio, getUInt("clave", defecto) devuelve el valor por defecto si la clave no existe, putUInt guarda, putBytes y getBytes guardan estructuras completas, y remove y clear borran. Claves y espacios: <b>15 caracteres como máximo</b>. Ahí van ajustes, calibraciones y credenciales WiFi.', q: mcq('prefs.getFloat("offset", 1.5) cuando la clave aún no existe devuelve…', ['1,5', '0', 'Un error', 'NaN'], 'El segundo argumento es el valor por defecto.') },
      { title: 'Seguir un contador de arranques', text: 'Haz la traza a mano. Primer arranque: getUInt devuelve el valor por defecto (0), se suma 1 y se guarda 1. Cada reinicio lee lo guardado y suma uno. NVS sobrevive a cortes y reinicios: es el sitio para contadores que cambian poco, ajustes y credenciales. Dos detalles: las claves no pueden pasar de 15 caracteres, y una estructura se guarda entera con putBytes.', q: mcq('Un contador de arranques en NVS empieza sin clave. Enciendes la placa y la reinicias dos veces. ¿Qué imprime la última vez?', ['3', '2', '1', '0'], 'Arranques: 1, 2 y 3.') }
    ] },
    es_lfs: { name: 'Archivos en LittleFS', alts: [
      { title: 'Abrir, escribir, cerrar', text: 'LittleFS guarda archivos en la partición de datos de la flash. <b>FILE_WRITE</b> empieza el archivo de cero y <b>FILE_APPEND</b> añade al final. Lo escrito va primero a un búfer en RAM: hasta close() o flush() no está en la flash, y un corte lo pierde. totalBytes() − usedBytes() da el espacio libre. Para gigas de fotos, mejor una microSD.', q: mcq('Un registrador abre el archivo con FILE_WRITE en cada medida. ¿Qué pasa?', ['Cada vez borra lo anterior: debe usar FILE_APPEND', 'Añade al final', 'Falla al abrir', 'Duplica cada línea'], 'FILE_WRITE empieza el archivo de cero.') },
      { title: 'Cuentas de capacidad', text: '¿Cuánto cabe? Divide el espacio libre (totalBytes − usedBytes) entre lo que escribes al día. 1 500 000 bytes con 32 bytes por minuto (46 080 al día) dan unos 32 días. LittleFS es para unos pocos MB sin hardware extra; para semanas de fotos, una microSD. Y añade con FILE_APPEND y cierra (o flush) tras escribir para que los datos lleguen a la flash.', q: mcq('Quedan 1 000 000 bytes y escribes 100 bytes cada minuto. ¿Cuántos días hasta llenar?', ['Unos 6,9 días', 'Unos 69 días', 'Unos 10 días', 'Unos 0,7 días'], '1 000 000 / 100 = 10 000 minutos ≈ 6,9 días.') }
    ] },
    es_persist: { name: 'Qué borra cada cosa', alts: [
      { title: 'Cada partición, por separado', text: 'Subir un programa desde el IDE solo reescribe el cargador, la tabla y la aplicación: <b>NVS y los archivos siguen</b>. LittleFS.begin(true) formatea la partición de archivos, pero solo si no puede montarla. esptool erase_flash borra la flash entera: programa, NVS y archivos. Ni los eFuses ni la ROM se tocan nunca.', q: mcq('Grabas una versión nueva del programa. ¿Qué pasa con la calibración guardada en NVS?', ['Sigue ahí', 'Se borra', 'Se mueve a LittleFS', 'Solo se conserva si es un número'], 'Subir un programa no toca la partición nvs.') },
      { title: 'Del más suave al más bruto', text: 'Ordénalos por destrucción. 1) Subir programa: cambia la aplicación y nada más. 2) LittleFS.begin(true) sin un sistema de archivos válido: formatea esa partición. 3) erase_flash: deja la flash en blanco. Si quieres empezar de cero, el 3; si quieres conservar ajustes, nunca el 3.', q: mcq('Quieres borrar NVS, archivos y programa de una vez. ¿Qué usas?', ['esptool erase_flash', 'Subir otro programa', 'LittleFS.begin(true)', 'Pulsar EN'], 'Es el único que deja toda la flash en blanco.') }
    ] },

    /* --- M6 · WiFi --- */
    es_wifi: { name: 'Modos WiFi, banda y canal', alts: [
      { title: 'Cliente, punto de acceso o ambos', text: 'En modo <b>STA</b> el ESP32 se une a tu router como un móvil. En modo <b>AP</b> crea su propia red. En <b>STA+AP</b> hace las dos cosas con una sola radio, así que ambas comparten canal. El ESP32 clásico solo usa la banda de 2,4 GHz.', q: mcq('Tu router solo emite en 5 GHz. ¿Qué ve un ESP32 clásico?', ['Nada: solo trabaja en 2,4 GHz', 'La red, pero más lenta', 'La red, sin problema', 'Solo la contraseña'], 'Activa la banda de 2,4 GHz en el router.') },
      { title: 'Una sola radio', text: 'El ESP32 tiene una única radio de 2,4 GHz. En STA se une al router; en AP crea su red (en 192.168.4.1); en STA+AP hace las dos cosas, pero la radio solo puede estar en un canal: el AP sigue al del router y cambia si el router cambia. Como el clásico no trabaja en 5 GHz, un router solo de 5 GHz es invisible para él.', q: mcq('En STA+AP, el router está en el canal 11. ¿En qué canal queda el AP del ESP32?', ['En el 11', 'En el 1, siempre', 'En el que elijas, independiente', 'En 5 GHz'], 'Una radio, un canal.') }
    ] },
    es_wifirobust: { name: 'Conexión WiFi robusta', alts: [
      { title: 'Programar para que se caiga', text: 'El WiFi se va a caer: el router se reinicia, alguien lo apaga, hay interferencias. Un programa robusto no se queda en un while esperando: reacciona a los <b>eventos</b> (conectado, IP obtenida, desconectado), reintenta con esperas crecientes y sigue haciendo su trabajo local mientras tanto.', q: mcq('¿Qué hace un buen programa cuando se pierde el WiFi?', ['Sigue funcionando en local y reintenta conectar en segundo plano', 'Se queda en un bucle hasta reconectar', 'Se reinicia cada segundo', 'Borra la configuración'], 'Los eventos te avisan sin bloquear.') },
      { title: 'Siempre con plan B', text: 'Un while (WiFi.status() != WL_CONNECTED) sin límite se queda colgado para siempre si el router está apagado. Pon un tiempo máximo (por ejemplo, 15 s) y decide qué hacer si no conecta. Mejor aún: WiFi.onEvent te avisa de la IP obtenida o de la desconexión sin preguntar en un bucle, y el resto del programa sigue mientras tanto.', q: mcq('¿Qué le falta a while (WiFi.status() != WL_CONNECTED) delay(100);?', ['Un tiempo límite y un plan si no conecta', 'Un delay más largo', 'Un Serial.println', 'Nada'], 'Sin límite, un router apagado lo deja colgado.') }
    ] },
    es_awake: { name: 'Acortar el tiempo despierto', alts: [
      { title: 'La parte despierta manda', text: 'En un nodo a batería lo caro es tener la radio encendida: decenas de mA aunque no transmita. Un nodo que despierta 5 s a 120 mA cada 10 minutos gasta 1 mA de media solo por eso, frente a 0,02 mA si duerme a 20 µA. Lo que más rinde es acortar ese rato: IP fija, recordar canal y BSSID, enviar y volver a dormir, o ESP-NOW en lugar de WiFi.', q: mcq('Despiertas 3 s a 100 mA cada 5 minutos y duermes a 10 µA. ¿Qué parte domina?', ['La despierta: 1 mA de media frente a 0,01 mA', 'La dormida', 'Las dos igual', 'Ninguna'], '100 × 3 / 300 = 1 mA.') },
      { title: 'Dónde se van los segundos', text: 'Una conexión WiFi normal pierde segundos en buscar el canal, autenticarse y pedir IP por DHCP, todo con la radio encendida. Con IP fija y el canal y la BSSID guardados de la vez anterior, baja a unos cientos de milisegundos. Con ESP-NOW ni siquiera hay conexión: envías y duermes. Optimizar el código o rascar unos µA del sueño rinde muchísimo menos.', q: mcq('¿Qué acorta más la conexión de un nodo que despierta cada 10 minutos?', ['IP fija y recordar canal y BSSID del router', 'Más potencia de transmisión', 'Una contraseña más corta', 'CPU a 240 MHz'], 'Se ahorran el escaneo y el DHCP.') }
    ] },
    es_rf: { name: 'Señal, antena y alcance', alts: [
      { title: 'El RSSI como termómetro', text: 'El RSSI es la señal recibida, en dBm (siempre negativa). Por encima de unos −67 dBm va bien; por debajo de −80, sufre. Sirve para decir “cerca o lejos”, no para medir distancias: cuerpos, paredes y orientación la cambian varios dB. Para ganar alcance: línea de vista, antena despejada (sin metal alrededor ni cajas metálicas) o un módulo -U con antena externa.', q: mcq('Un nodo da −88 dBm y pierde paquetes. ¿Qué pruebas?', ['Acercarlo, reorientarlo o usar antena externa', 'Subir la frecuencia de la CPU', 'Meterlo en una caja metálica', 'Enviar más a menudo'], '−88 dBm es una señal muy débil.') },
      { title: 'Lo que se interpone', text: 'Las ondas de 2,4 GHz se debilitan con la distancia y, sobre todo, con lo que encuentran: el agua (personas incluidas) las absorbe y el metal las refleja; una caja metálica es una jaula de Faraday. La antena de pista del módulo necesita su borde libre. Por eso el RSSI da distancias muy aproximadas, y por eso WiFi, BLE y ESP-NOW ganan mucho alcance con línea de vista y una buena antena.', q: mcq('Dos balizas BLE a la misma distancia dan −60 y −72 dBm. ¿Explicación probable?', ['Algo se interpone o cambia la orientación', 'Una está el doble de lejos, seguro', 'El ESP32 mide mal', 'Una transmite en 5 GHz'], 'El RSSI varía con obstáculos y orientación.') }
    ] },
    es_dbmw: { name: 'dBm y milivatios', alts: [
      { title: 'Contar ceros', text: 'Los dBm comparan con 1 mW: <b>P(mW) = 10^(dBm / 10)</b>. 0 dBm = 1 mW, 10 dBm = 10 mW, 20 dBm = 100 mW. Cada 10 dB, ×10; cada 3 dB, casi ×2.', q: mcq('¿Cuántos mW son 13 dBm?', ['Unos 20 mW', '13 mW', '130 mW', 'Unos 2 mW'], '10 dBm son 10 mW y +3 dB lo duplica.') },
      { title: 'Sumar y doblar', text: 'Descompón los dBm en decenas, treses y unos: 17 dBm = 10 + 3 + 3 + 1 → 10 mW × 2 × 2 × 1,26 ≈ 50 mW. El error típico es multiplicar los dBm por 10 o leerlos como una escala lineal: 20 dBm no es el doble de 10 dBm, es diez veces más.', q: mcq('Bajas la potencia de 20 dBm a 17 dBm. ¿Qué pasa con los mW?', ['Se quedan en la mitad: de 100 a unos 50 mW', 'Bajan un 3 %', 'Bajan a 17 mW', 'No cambian'], '−3 dB ≈ la mitad.') }
    ] },
    es_eirp: { name: 'PIRE: potencia más antena', alts: [
      { title: 'Sumar en dB', text: 'La PIRE es lo que realmente sale radiado en la dirección más fuerte: <b>potencia del transmisor (dBm) + ganancia de la antena (dBi)</b>, menos las pérdidas del cable. En Europa, el WiFi de 2,4 GHz no puede pasar de 20 dBm de PIRE.', q: mcq('Transmites a 15 dBm con una antena de 5 dBi. ¿PIRE?', ['20 dBm', '75 dBm', '10 dBm', '3 dBm'], '15 + 5 = 20 dBm, justo en el límite.') },
      { title: 'Despejar la potencia', text: 'Como la PIRE es potencia + ganancia, si pones una antena con más ganancia tienes que bajar la potencia en la misma cantidad: <b>potencia máxima = 20 dBm − ganancia</b>. Con 8 dBi, como mucho 12 dBm; con 2 dBi, 18 dBm. Subir la potencia con una antena directiva puede dejarte fuera de lo legal.', q: mcq('Antena de 6 dBi. ¿Potencia máxima del ESP32 para no pasar de 20 dBm de PIRE?', ['14 dBm', '20 dBm', '26 dBm', '3,3 dBm'], '20 − 6 = 14 dBm.') }
    ] },
    es_http: { name: 'Servidor web HTTP', alts: [
      { title: 'Una ventanilla con turnos', text: 'Con la biblioteca WebServer, server.on(ruta, función) registra qué responder en cada dirección, y server.onNotFound() responde a las que no existen (con un 404 o redirigiendo). Pero es síncrona: solo atiende cuando llamas a <b>server.handleClient()</b>. Si quitas esa llamada, nadie atiende; si loop() tiene un delay(2000), cada petición puede esperar hasta 2 s.', q: mcq('loop() tarda 500 ms en cada vuelta por una lectura lenta. ¿Qué notan los navegadores?', ['Respuestas con hasta medio segundo de retraso', 'Nada', 'Un error 404', 'Que se cae el WiFi'], 'handleClient() solo se ejecuta una vez por vuelta.') },
      { title: 'Rutas y códigos', text: 'Cada respuesta HTTP lleva un código: <b>200</b> todo bien, <b>302</b> vete a otra dirección, <b>404</b> esa ruta no existe, <b>500</b> error del servidor. Tú lo eliges en server.send(código, tipo, contenido), y onNotFound() es donde decides qué hacer con las rutas desconocidas. Nada de eso ocurre si loop() no llama a menudo a server.handleClient().', q: mcq('¿Qué código devuelves para una ruta que no existe?', ['404', '200', '302', '500'], '404: Not Found.') }
    ] },
    es_web: { name: 'HTTP frente a WebSocket', alts: [
      { title: 'Ventanilla frente a teléfono', text: 'HTTP es una ventanilla: el navegador pide, el ESP32 responde y se acabó; para enterarse de cambios hay que volver a preguntar cada poco, cambie algo o no. WebSocket es una llamada de teléfono que queda abierta: cualquiera de los dos habla cuando quiere, y broadcastTXT() habla a todos los clientes a la vez. Para mandos y gráficas en vivo, teléfono.', q: mcq('Quieres que el móvil vea la temperatura en cuanto cambie, sin recargar. ¿Qué usas?', ['WebSocket: el ESP32 empuja el dato al momento', 'Recargar la página cada minuto', 'Un correo', 'HTTP POST desde el ESP32 al móvil'], 'El servidor puede hablar sin que le pregunten.') },
      { title: 'Cuántos mensajes', text: 'Cuenta el tráfico. HTTP con fetch() cada 100 ms son 10 peticiones por segundo por cada móvil, cambie algo o no, y con hasta 100 ms de retraso. Con WebSocket no hay peticiones: el ESP32 empuja el dato cuando cambia. En sentido contrario, limita lo que envía la página (un mensaje cada 30–50 ms con el último valor), porque al ESP32 solo le importa el más reciente.', q: mcq('Una página consulta por HTTP cada 200 ms y hay 4 móviles. ¿Peticiones por segundo?', ['20', '800', '5', '50'], '5 por segundo × 4 = 20.') }
    ] },
    es_websec: { name: 'Validar y proteger el servidor', alts: [
      { title: 'Nunca te fíes de lo que llega', text: 'Cualquier dispositivo de tu red puede mandar cualquier cosa a tu servidor. Comprueba longitudes, rangos y formato antes de usar un dato. Si el servidor controla algo importante, pide contraseña (server.authenticate() como mínimo), y no lo abras a internet sin autenticación y cifrado de verdad.', q: mcq('Llega por WebSocket “B:9999” y el brillo va de 0 a 255. ¿Qué haces?', ['Limitar el valor a 0..255 (o descartar el mensaje)', 'Usarlo tal cual', 'Reiniciar', 'Guardarlo en NVS'], 'constrain() o rechazar lo que no encaja.') },
      { title: 'Comprobar antes de usar', text: 'Trata cada mensaje como sospechoso: comprueba la longitud antes de copiarlo, el formato (el prefijo esperado, un JSON válido) y el rango de cada valor (constrain). Un formato con estructura, como un JSON pequeño, es más fácil de validar y de ampliar. Y si el servidor maneja algo delicado, contraseña; para internet, autenticación y cifrado.', q: mcq('Llega “B” sin número. Si no validas, ¿qué brillo da atoi()?', ['0: atoi devuelve 0 si no hay número', 'El brillo anterior', '255', 'Un error que reinicia'], 'Comprueba que haya dígitos antes de aplicar el valor.') }
    ] },
    es_names: { name: 'Encontrar el ESP32: mDNS y portal', alts: [
      { title: 'Un nombre en vez de una IP', text: 'Con <b>mDNS</b> el ESP32 anuncia un nombre en tu red (lampara.local) y no necesitas saber su IP; pero no todos los sistemas lo resuelven, así que muestra también la IP (Serial, pantalla o el router). En un <b>portal cautivo</b> pasa lo contrario: un DNSServer responde a <b>cualquier</b> nombre con la IP del ESP32, y el móvil abre solo la página de configuración.', q: mcq('¿Qué hace el DNSServer de un portal cautivo?', ['Responde a cualquier nombre con la IP del ESP32', 'Da acceso a internet', 'Cifra la contraseña', 'Busca redes WiFi'], 'El móvil cree que debe iniciar sesión y muestra la página.') },
      { title: 'El portal paso a paso', text: 'Si no hay credenciales o fallan, el ESP32 crea su propio AP. Te conectas con el móvil; el DNS del portal lleva cualquier dirección a la página del ESP32; eliges la red y escribes la contraseña; se guardan en NVS y el ESP32 se reinicia en modo STA. Desde ahí lo encuentras por mDNS (nombre.local) o, si tu sistema no lo resuelve, por su IP.', q: mcq('¿Qué paso va justo después de que el ESP32 cree su AP?', ['Conectarte a esa red con el móvil', 'Guardar las credenciales en NVS', 'Reiniciar en modo STA', 'Elegir la red de casa'], 'Primero hay que unirse a su red para ver la página.') }
    ] },
    es_ntp: { name: 'Hora por NTP y zona horaria', alts: [
      { title: 'Una cadena con las reglas', text: 'configTzTime(zona, servidor) pide la hora a internet y aplica la zona en formato POSIX. “CET-1CEST,M3.5.0,M10.5.0/3” dice: hora normal CET (UTC+1), de verano CEST, que empieza el último domingo de marzo (M3.5.0: mes 3, última semana, domingo) y acaba el último domingo de octubre a las 3. Canarias va una hora menos: “WET0WEST,M3.5.0/1,M10.5.0”. Hasta la primera sincronización, getLocalTime() devuelve false.', q: mcq('En M10.5.0, ¿qué indica el 10?', ['El mes: octubre', 'El día 10', 'Las 10:00', 'La semana 10'], 'Mm.s.d: mes, semana (5 = última) y día (0 = domingo).') },
      { title: 'Primero sincronizar', text: 'Justo tras conectar, el reloj aún no tiene la hora: getLocalTime() devuelve false hasta que llega la primera respuesta NTP, así que espera o reintenta. Después el sistema resincroniza solo y aplica la zona, que va en una cadena POSIX (M3.5.0 es el último domingo de marzo; cada territorio con otra hora necesita su cadena). En deep sleep el reloj RTC deriva: resincroniza al despertar si necesitas exactitud.', q: mcq('Nada más arrancar, getLocalTime(&t) devuelve false. ¿Qué haces?', ['Esperar y reintentar hasta la primera sincronización', 'Cambiar la zona horaria', 'Reiniciar en bucle', 'Poner la hora a mano siempre'], 'La primera respuesta NTP tarda un poco.') }
    ] },

    /* --- M7 · BLE y ESP-NOW --- */
    es_ble: { name: 'Anuncios y roles BLE', alts: [
      { title: 'El tablón de anuncios', text: 'BLE empieza por la publicidad: el <b>periférico</b> (o un <b>emisor</b> que nunca acepta conexiones) cuelga anuncios de hasta 31 bytes en tres canales, cada cierto intervalo (de 20 ms a unos 10 s); el <b>central</b> u <b>observador</b> escanea. iBeacon y Eddystone son formatos para esos bytes. Un escaneo activo pide además la “scan response”, con más datos. Y los móviles cambian su dirección a menudo por privacidad.', q: mcq('Una baliza que solo emite su identificador cada segundo, sin conexiones. ¿Qué usa?', ['Solo publicidad (advertising)', 'GATT con notificaciones', 'Bluetooth clásico', 'WiFi'], 'Sin conexión: todo cabe en el anuncio.') },
      { title: 'Contar anuncios', text: 'Quien anuncia es el periférico o emisor; quien escucha, el central u observador. Un anuncio es un mensaje corto (31 bytes) que se repite a intervalos fijos: cada 100 ms son 10 por segundo y 36 000 por hora. Alargar el intervalo es lo que más ahorra. Si lo que quieres decir cabe en el anuncio (un ID y una temperatura), no hace falta conexión: basta con anunciar, como una baliza. Al escanear, el modo activo pide además la “scan response”, y los móviles aparecen con direcciones que cambian por privacidad.', q: mcq('Anunciando cada 500 ms, ¿cuántos anuncios por hora?', ['7200', '1800', '500', '36 000'], '3600 / 0,5 = 7200.') }
    ] },
    es_gatt: { name: 'GATT: servicios y características', alts: [
      { title: 'Servicios, características y descriptores', text: 'Un <b>servicio</b> agrupa (por ejemplo, Battery Service, 0x180F). Dentro, cada <b>característica</b> es un valor con propiedades: leer, escribir, notificar. Para recibir notificaciones, el cliente escribe en el descriptor <b>CCCD</b> (0x2902). Los UUID de 16 bits son estándar del Bluetooth SIG; para lo tuyo, 128 bits al azar. Por defecto caben 20 bytes útiles por paquete.', q: mcq('El móvil quiere recibir cada nueva lectura sin preguntar. ¿Qué hace?', ['Se suscribe escribiendo en el CCCD de la característica con NOTIFY', 'Lee la característica cada 10 ms', 'Se desconecta', 'Cambia el UUID'], 'Las notificaciones ahorran energía y tiempo.') },
      { title: 'Mirar o suscribirse', text: 'Leer es ir a mirar el tablón: preguntas y te contestan. Notificar es suscribirte: escribes en el CCCD (0x2902) de esa característica y el servidor te avisa cada vez que cambia. Para enviar mucho, divide: 2000 bytes en paquetes de 20 son 100 paquetes, salvo que se negocie una MTU mayor. Y usa UUID de 128 bits para lo tuyo: los de 16 bits están reservados (0x180F es la batería).', q: mcq('Enviar 600 bytes con 20 bytes útiles por paquete. ¿Cuántos paquetes?', ['30', '12 000', '20', '600'], '600 / 20 = 30.') }
    ] },
    es_radiosec: { name: 'Quién puede leer o mandar por radio', alts: [
      { title: 'Oír es fácil', text: 'Lo que va por radio lo puede recibir cualquiera que esté cerca y en el canal. Un UUID raro o una MAC concreta no son seguridad: se listan en segundos. En BLE, exige emparejamiento con cifrado y autenticación para las características delicadas. En ESP-NOW, activa el cifrado con clave (PMK y LMK) y añade un número de secuencia para que no te reenvíen mensajes viejos.', q: mcq('¿Qué protege una característica BLE que abre una puerta?', ['Exigir emparejamiento con cifrado y autenticación', 'Un UUID difícil de adivinar', 'Bajar la potencia', 'Anunciar menos'], 'Los UUID se pueden listar sin permiso.') },
      { title: 'Escuchar y repetir', text: 'Un atacante puede escuchar lo que envías y repetir o inventar órdenes. Contra lo primero, cifrado. Contra lo segundo, autenticación (solo dispositivos emparejados o que conozcan la clave) y contadores de secuencia que rechacen mensajes repetidos. Sin cifrado, un mensaje de ESP-NOW lo lee cualquier receptor en el canal, y una característica BLE abierta la escribe cualquiera.', q: mcq('Tus órdenes ESP-NOW van sin cifrar. ¿Quién puede leerlas?', ['Cualquier receptor en ese canal', 'Solo el par registrado', 'Nadie', 'Solo el router'], 'Registrar un par no cifra nada por sí solo.') }
    ] },
    es_coex: { name: 'WiFi y BLE a la vez', alts: [
      { title: 'Una radio, dos idiomas', text: 'WiFi y BLE comparten la misma radio de 2,4 GHz y se turnan en el tiempo (coexistencia). Funciona, pero los dos van con más latencia y menos caudal que por separado: el audio necesita más búfer. Además, las dos pilas ocupan mucha RAM; NimBLE, una pila solo de BLE, ocupa bastante menos que Bluedroid.', q: mcq('WiFi + BLE + servidor web y te quedas sin RAM. ¿Primer cambio?', ['Pasar de Bluedroid a NimBLE', 'Usar Bluetooth clásico', 'Subir a 240 MHz', 'Quitar el regulador'], 'NimBLE solo implementa BLE y es mucho más ligera.') },
      { title: 'Repartir tiempo y memoria', text: 'Si la radio está atendiendo a BLE, no atiende al WiFi, y al revés. Por eso un audio por WiFi con un mando BLE puede cortarse: dale más búfer al audio o reduce el tráfico BLE. Y como el ESP32 clásico se queda antes sin RAM que sin CPU, elegir una pila BLE ligera (NimBLE) deja sitio al resto.', q: mcq('Audio por WiFi con cortes en cuanto el mando BLE envía mucho. ¿Qué haces?', ['Más búfer de audio o menos tráfico BLE', 'Pasar a 5 GHz', 'Bajar la CPU a 80 MHz', 'Quitar el condensador'], 'La radio se reparte por turnos.') }
    ] },
    es_espnow: { name: 'Cómo funciona ESP-NOW', alts: [
      { title: 'Notas por debajo de la puerta', text: 'ESP-NOW manda tramas cortas (hasta 250 bytes en su versión original) directamente de un ESP32 a otro, identificados por su MAC: sin router y sin conexión. Los dos deben estar en el mismo canal WiFi. El “éxito” del envío solo significa que la radio del otro confirmó la trama. Y como no hay conexión, si dejan de llegar paquetes nadie avisa: el receptor debe detectarlo y pasar a un estado seguro (failsafe).', q: mcq('Un nodo con ESP-NOW no recibe nada del otro, que está conectado a un router. ¿Qué compruebas?', ['Que ambos usen el mismo canal (el del router)', 'La contraseña del router', 'La versión de Bluetooth', 'Que haya internet'], 'La radio solo escucha en un canal cada vez.') },
      { title: 'Pequeño, rápido y sin garantías', text: 'Piensa en ESP-NOW como lanzar notas por encima de una valla, siempre en el mismo canal: 250 bytes como mucho, llegan en milisegundos y el otro solo te dice “la he cogido”, no “la he leído”. El caudal útil es paquetes por segundo × bytes por paquete: 50 × 12 = 600 B/s, nada para la radio. Si el emisor se calla, el receptor debe notarlo por tiempo (por ejemplo, 300 ms sin paquetes) y actuar.', q: mcq('Un coche recibe órdenes ESP-NOW cada 20 ms. ¿Qué hace si pasan 300 ms sin recibir nada?', ['Pararse: el mando se ha perdido', 'Seguir con la última orden', 'Reiniciarse', 'Conectarse al router'], 'Failsafe: ante la duda, a un estado seguro.') }
    ] },
    es_radiochoice: { name: 'Elegir radio: WiFi, BLE o ESP-NOW', alts: [
      { title: 'Cada radio, su trabajo', text: 'ESP-NOW: latencia mínima y sin infraestructura (mandos, nodos que duermen). WiFi: acceso a la red y a internet. BLE: hablar con móviles y gastar poco. Muchos proyectos combinan dos: nodos por ESP-NOW y una pasarela con WiFi.', q: mcq('Mando para un coche robot en el campo, sin router y con respuesta inmediata:', ['ESP-NOW', 'WiFi a través del móvil', 'Correo electrónico', 'BLE con emparejamiento cada vez'], 'Directo y rápido.') },
      { title: 'Tres preguntas', text: '¿Necesitas internet o la red de casa? WiFi. ¿Hablas con un móvil o tienes que gastar muy poco? BLE. ¿Dos ESP32 que se hablan directo, al momento y sin infraestructura (un mando, nodos que despiertan, envían y duermen)? ESP-NOW. Si hacen falta dos cosas, combina: nodos por ESP-NOW y una pasarela con WiFi.', q: mcq('Nodos de jardín que despiertan, envían una medida y duermen, hacia una pasarela en casa:', ['ESP-NOW hasta la pasarela, y la pasarela por WiFi', 'WiFi en cada nodo con DHCP', 'Bluetooth clásico', 'Cable Ethernet'], 'ESP-NOW no necesita conectarse: menos tiempo despierto.') }
    ] },

    /* --- M8 · bajo consumo y ESP-IDF --- */
    es_sleep: { name: 'Modos de sueño', alts: [
      { title: 'Dormir de verdad', text: 'Del más ligero al más profundo: <b>modem sleep</b> (solo duerme la radio entre balizas; ahorra, pero añade retrasos de cientos de ms), <b>light sleep</b> (CPU en pausa y RAM conservada: sigue donde estaba), <b>deep sleep</b> (solo el dominio RTC y su memoria: al despertar, setup() otra vez) e hibernación. RTC_DATA_ATTR sobrevive al deep sleep, no a un corte de luz. Y en una DevKit, el regulador y el USB-serie siguen gastando miliamperios aunque el chip duerma.', q: mcq('Tu DevKit en deep sleep consume 9 mA. ¿Qué pasa?', ['Duerme el chip, pero no el regulador, el USB-serie ni el LED de la placa', 'El deep sleep no funciona', 'El WiFi sigue encendido seguro', 'Es lo normal en el chip'], 'Para baterías: placa de bajo consumo o módulo con un LDO de poca corriente.') },
      { title: 'Qué conserva cada uno', text: 'Pregunta qué conserva cada modo. Modem sleep: todo; solo duerme la radio (WiFi.setSleep(false) lo quita si te molesta la latencia). Light sleep: toda la RAM. Deep sleep: solo la memoria RTC (variables RTC_DATA_ATTR). Hibernación: casi nada. Lo que deba sobrevivir a quitar la alimentación va a NVS. Y estos consumos son del chip: la placa puede gastar mucho más.', q: mcq('Una variable RTC_DATA_ATTR, ¿sobrevive a quitar la batería?', ['No: solo sobrevive al deep sleep; para cortes, NVS', 'Sí, siempre', 'Solo en light sleep', 'Solo si es int'], 'La memoria RTC necesita alimentación.') }
    ] },
    es_battlife: { name: 'Corriente media y duración de la batería', alts: [
      { title: 'La media es lo que cuenta', text: 'La batería se gasta con la corriente <b>media</b>: Imedia = (Iactiva · tactiva + Isueño · tsueño) / T. Si el nodo duerme a 10 µA pero pasa 5 s despierto a 120 mA cada 10 minutos, la parte despierta manda: 1 mA de media. La duración es capacidad / Imedia: 2000 mAh / 1 mA = 2000 h, unos 83 días.', q: mcq('Despierto 2 s a 100 mA cada 100 s; dormido a 0 mA. ¿Corriente media?', ['2 mA', '100 mA', '50 mA', '0,2 mA'], '100 × 2 / 100 = 2 mA.') },
      { title: 'Paso a paso', text: '1) Pasa todo a mA y segundos. 2) Carga despierto: Iact × tact. 3) Carga dormido: Isueño × (T − tact). 4) Suma y divide entre T: Imedia. 5) Días = mAh / Imedia / 24. Ejemplo: 2 s a 100 mA y 598 s a 0,01 mA cada 10 min → (200 + 6) / 600 ≈ 0,34 mA → 2000 mAh duran unos 243 días.', q: mcq('Corriente media de 0,5 mA con una batería de 1200 mAh. ¿Cuánto dura?', ['100 días', '2400 días', '24 días', '600 días'], '1200 / 0,5 = 2400 h = 100 días.') }
    ] },
    es_wake: { name: 'Fuentes de despertar', alts: [
      { title: 'Quién puede llamar a la puerta', text: 'Del deep sleep despiertan: el <b>temporizador</b>, <b>EXT0</b> (un pin RTC a un nivel), <b>EXT1</b> (varios pines RTC: en el clásico, “cualquiera alto” o “todos bajos”), el <b>touch</b> y el coprocesador <b>ULP</b>, que puede contar pulsos dormido y despertar a la CPU solo cuando hace falta. Solo sirven los GPIO RTC (0, 2, 4, 12–15, 25–27, 32–39). Al despertar, esp_sleep_get_wakeup_cause() dice quién llamó.', q: mcq('Quieres despertar con un pulsador en el GPIO 18. ¿Funciona?', ['No: el 18 no es GPIO RTC; usa, por ejemplo, el 27', 'Sí, con EXT0', 'Sí, con EXT1', 'Solo con touch'], 'Solo los pines RTC pueden despertar del deep sleep.') },
      { title: 'Dormido, mandan las funciones RTC', text: 'Mientras duerme, la parte digital está apagada: INPUT_PULLUP no actúa. Para un pulsador que despierte por nivel bajo, activa la pull-up RTC (rtc_gpio_pullup_en) o pon una resistencia externa, y usa un pin RTC. EXT1 en el clásico admite ANY_HIGH o ALL_LOW; el touch y el ULP también despiertan. Al arrancar, consulta esp_sleep_get_wakeup_cause() y actúa según el caso: TIMER, EXT0, EXT1, TOUCHPAD o ULP.', q: mcq('Has activado el temporizador y EXT0. ¿Cómo sabes cuál despertó al chip?', ['Con esp_sleep_get_wakeup_cause()', 'Leyendo millis()', 'Con WiFi.status()', 'No se puede saber'], 'Devuelve la causa: TIMER, EXT0…') }
    ] },
    es_burden: { name: 'La caída del amperímetro', alts: [
      { title: 'El medidor también estorba', text: 'En modo corriente, el multímetro mete una resistencia en serie (shunt) y en ella cae <b>V = I · R</b>. En el rango de mA puede ser de unos 10 Ω; en el de µA, de cientos o miles de ohmios. Con un pico de 150 mA y 10 Ω caen 1,5 V: el ESP32 se queda con 1,8 V y salta el brownout.', q: mcq('Shunt de 1 Ω en el rango de A y un pico de 300 mA. ¿Cuánta tensión le roba al circuito?', ['0,3 V', '3 V', '0,03 V', '300 V'], '0,3 A × 1 Ω = 0,3 V.') },
      { title: 'Medir el sueño sin romper el despertar', text: 'En el rango de µA mides bien los microamperios del sueño, pero al despertar los picos de cientos de mA atraviesan una resistencia grande, la caída I · R se come la alimentación y el chip se reinicia. Soluciones: puentear el multímetro durante el despertar, medir dormido en µA y despierto en mA, o usar un medidor dinámico (PPK2, INA219) o una resistencia pequeña con osciloscopio.', q: mcq('En el rango de µA el shunt es de 100 Ω. Un pico de 50 mA, ¿cuánto cae en él?', ['5 V: el ESP32 se apaga', '0,5 V', '50 mV', '0,05 V'], '0,05 × 100 = 5 V, más que la alimentación entera.') }
    ] },
    es_lipo: { name: 'Cargar litio con frío', alts: [
      { title: 'Nunca bajo cero', text: 'Las celdas de litio no deben cargarse por debajo de 0 °C (ni con mucho calor): el litio se deposita como metal en el ánodo, la celda pierde capacidad y puede acabar en un cortocircuito interno. Un nodo solar exterior necesita un cargador que mida la temperatura (con una NTC) y corte la carga en frío.', q: mcq('Amanece a −2 °C y sale el sol sobre tu nodo solar con Li-ion. ¿Qué debe hacer el cargador?', ['No cargar hasta que la celda supere 0 °C', 'Cargar a máxima corriente para calentarla', 'Cargar a 5 V', 'Descargar la batería'], 'Cargar litio helado lo daña y puede volverlo peligroso.') },
      { title: 'El peor momento', text: 'En invierno el panel empieza a cargar justo por la mañana, que es cuando la batería está más fría. Por eso un sistema solar de exterior combina una batería con margen para varios días nublados y un cargador con protección de temperatura, que espere a que la celda supere 0 °C antes de cargar.', q: mcq('¿Por qué un cargador solar de exterior lleva sensor de temperatura?', ['Para no cargar el litio bajo 0 °C ni con mucho calor', 'Para medir el sol', 'Para el WiFi', 'Para calibrar el ADC'], 'La carga fuera de temperatura daña la celda.') }
    ] },
    es_idf: { name: 'Arduino-ESP32 y ESP-IDF', alts: [
      { title: 'Arduino es una capa', text: 'El núcleo Arduino-ESP32 está construido sobre ESP-IDF: setup() y loop() corren en una tarea creada por app_main(). En IDF, app_main() se ejecuta una vez y el bucle o las tareas los pones tú. Casi todo tiene equivalente: digitalWrite → gpio_set_level, delay → vTaskDelay, Serial.println → ESP_LOGE/W/I/D (error, aviso, información, depuración), Preferences → nvs_*. Y Arduino-ESP32 puede añadirse como componente de IDF.', q: mcq('En ESP-IDF, ¿qué equivale a setup() + loop()?', ['app_main(), con tu propio bucle o tus tareas', 'main() con un return', 'loop() también existe', 'No hay equivalente'], 'Si app_main() termina, su tarea se borra, pero las tareas que creó siguen.') },
      { title: 'La herramienta según el objetivo', text: 'Arduino-ESP32: prototipos rápidos y bibliotecas listas que te ahorran semanas. ESP-IDF: productos, OTA segura con rollback, consumo fino, ULP y control exacto de la configuración. No es todo o nada: Arduino puede ir como componente dentro de un proyecto IDF, y lo que aprendes vale en los dos (app_main en lugar de setup/loop, gpio_set_level, vTaskDelay, ESP_LOGx con sus niveles…).', q: mcq('Un producto que se venderá con OTA segura y rollback. ¿Qué entorno?', ['ESP-IDF', 'Arduino sin más', 'Una hoja de cálculo', 'Ensamblador puro'], 'IDF da control sobre el cargador y la seguridad.') }
    ] },
    es_idfpy: { name: 'idf.py y componentes', alts: [
      { title: 'La línea de órdenes', text: 'Todo pasa por idf.py: create-project crea el esqueleto, set-target elige el chip (antes de configurar), menuconfig la configuración, build compila, flash graba, monitor muestra y decodifica fallos, y size dice cuánto ocupa cada parte en flash y RAM. Las dependencias se añaden con idf.py add-dependency y quedan en idf_component.yml.', q: mcq('¿Qué orden abre la configuración del proyecto (frecuencia de CPU, tick, particiones…)?', ['idf.py menuconfig', 'idf.py build', 'idf.py monitor', 'idf.py erase-flash'], 'Guarda el resultado en sdkconfig.') },
      { title: 'Una receta reproducible', text: 'Un proyecto de IDF se describe en archivos: CMakeLists.txt, sdkconfig (lo que eliges en menuconfig) e idf_component.yml (las dependencias y sus versiones). Con ellos, otra persona obtiene el mismo firmware. El orden importa: set-target va antes de menuconfig porque las opciones dependen del chip; y antes de quejarte de que no cabe, idf.py size te dice qué ocupa.', q: mcq('¿Por qué set-target va antes de menuconfig?', ['Porque las opciones de configuración dependen del chip', 'Porque borra la flash', 'Porque compila', 'Da igual el orden'], 'Cambiar de chip regenera sdkconfig.') }
    ] },
    es_esperr: { name: 'Tratar errores en ESP-IDF', alts: [
      { title: 'esp_err_t y ESP_ERROR_CHECK', text: 'Casi todas las funciones de IDF devuelven un esp_err_t: ESP_OK o un código de error. ESP_ERROR_CHECK(x) aborta (y reinicia) si x falla: ideal mientras desarrollas. En un equipo instalado, un error previsible se trata: por ejemplo, si nvs_flash_init() dice que la NVS está llena o es de otra versión, se borra con nvs_flash_erase() y se reintenta.', q: mcq('En producción, nvs_flash_init() devuelve ESP_ERR_NVS_NO_FREE_PAGES. ¿Qué haces?', ['Borrar la NVS con nvs_flash_erase() y volver a iniciarla', 'Dejar que ESP_ERROR_CHECK reinicie en bucle', 'Ignorarlo y seguir', 'Cambiar de placa'], 'Es un error previsto y tiene arreglo.') },
      { title: 'Abortar o arreglar', text: 'Hay dos clases de errores. Los que no deberían pasar nunca (un argumento mal escrito): que ESP_ERROR_CHECK aborte y te enseñe archivo y línea. Los que pueden pasar en la vida real (red caída, NVS llena, sensor desconectado): compara el esp_err_t con ESP_OK y reacciona (reintentar, valores por defecto, avisar) en vez de reiniciar sin fin.', q: mcq('Un sensor I²C a veces no responde en el equipo instalado. ¿Cómo tratas su error?', ['Comprobar el esp_err_t, reintentar y seguir sin reiniciar', 'ESP_ERROR_CHECK para que reinicie', 'No comprobar nada', 'Desactivar el I²C'], 'Un fallo esperable no debe dejar el equipo en un bucle de reinicios.') }
    ] }
  });

  /* ===================== GENERADORES ===================== */
  const { pick, ri, fmt, MC, N } = Gen.helpers;
  const fHz = f => f >= 1e6 ? fmt(f / 1e6, 3) + ' MHz' : f >= 1000 ? fmt(f / 1000, 3) + ' kHz' : fmt(f) + ' Hz';
  const sh = a => a.slice().sort(() => Math.random() - 0.5);

  Gen.add('es_ledcRes', () => {
    const f = pick([20, 50, 500, 1000, 5000, 10000, 20000, 25000, 40000, 100000, 250000, 312500, 1000000]);
    const raw = Math.floor(Math.log2(80e6 / f)), b = Math.min(20, raw);
    return { ...N(`LEDC del ESP32 clásico con reloj de 80 MHz. ¿Resolución máxima (en bits) para un PWM de ${fHz(f)}?`, b, 'bits',
      `80 000 000 / ${fmt(f)} = ${fmt(80e6 / f, 1)} cuentas por periodo. La mayor potencia de 2 que cabe es 2^${raw} = ${fmt(2 ** raw)}${raw > 20 ? ', pero el ESP32 clásico no pasa de 20 bits' : ''}.`, 0.01), h: 'Divide 80 000 000 entre la frecuencia y busca la mayor potencia de 2 que quepa.' };
  }, 'es_ledc');

  Gen.add('es_ledcFreq', () => {
    const b = pick([8, 10, 11, 12, 13, 14, 16]), f = 80e6 / 2 ** b;
    return { ...N(`Quieres ${b} bits de resolución en el LEDC (reloj de 80 MHz). ¿Frecuencia máxima del PWM en kHz?`, f / 1000, 'kHz',
      `f = 80 MHz / 2^${b} = 80 000 000 / ${fmt(2 ** b)} = ${fmt(f / 1000, 3)} kHz. Cada bit de más divide la frecuencia entre 2.`, f / 1000 * 0.01), h: 'f × 2^bits ≤ 80 MHz: despeja f y pásala a kHz.' };
  }, 'es_ledc');

  Gen.add('es_adcAtten', () => {
    const [v, ok] = pick([[0.5, '0 dB'], [0.8, '0 dB'], [1.1, '2,5 dB'], [1.6, '6 dB'], [1.7, '6 dB'], [2.2, '11 dB'], [2.4, '11 dB'], [3.0, '11 dB y un divisor delante'], [3.3, '11 dB y un divisor delante']]);
    const all = ['0 dB', '2,5 dB', '6 dB', '11 dB', '11 dB y un divisor delante'];
    return MC(`ESP32 clásico: una señal va de 0 a ${fmt(v)} V. ¿Qué atenuación eliges para tener la mejor resolución sin salir de la zona fiable?`, ok, sh(all.filter(x => x !== ok)),
      'Zonas fiables orientativas (ESP-IDF, ESP32 clásico): 0 dB hasta ~0,95 V; 2,5 dB hasta ~1,25 V; 6 dB hasta ~1,75 V; 11 dB hasta ~2,45 V. Por encima, divisor. La atenuación más baja que abarque la señal da más mV por cuenta útiles.', { h: 'Recorre las zonas fiables de menor a mayor atenuación y quédate con la primera que cubra la señal.' });
  }, 'es_adc');

  Gen.add('es_battDiv', () => {
    let R1, R2, vb, mv;
    do { [R1, R2] = pick([[100000, 100000], [220000, 100000], [150000, 100000], [330000, 100000], [100000, 47000], [470000, 220000]]); vb = pick([3.5, 3.7, 3.9, 4.1, 4.2, 6.6, 7.4, 8.2]); mv = Math.round(vb * R2 / (R1 + R2) * 1000); } while (mv > 2450 || mv < 300);
    const kR = r => fmt(r / 1000) + ' kΩ';
    return { ...N(`Mides una batería con un divisor: R1 = ${kR(R1)} arriba y R2 = ${kR(R2)} abajo. analogReadMilliVolts() devuelve ${mv} mV. ¿Tensión de la batería en V?`, mv / 1000 * (R1 + R2) / R2, 'V',
      `Vbat = Vpin × (R1 + R2) / R2 = ${fmt(mv / 1000)} × ${fmt((R1 + R2) / R2, 3)} = ${fmt(mv / 1000 * (R1 + R2) / R2, 2)} V.`, 0.03), h: 'Deshaz el divisor: Vbat = Vpin × (R1 + R2) / R2, con Vpin en voltios.' };
  }, 'es_divbat');

  Gen.add('es_sleepLife', () => {
    const Ia = pick([80, 100, 120, 150]), ta = pick([0.3, 1, 2, 4, 6]), T = pick([5, 10, 15, 30, 60]), Is = pick([10, 25, 60, 150, 1000]), C = pick([1000, 2000, 2600, 3000]);
    const per = T * 60, Iavg = (Ia * ta + Is / 1000 * (per - ta)) / per, days = C / Iavg / 24;
    return { ...N(`Nodo a batería: despierta cada ${T} min, pasa ${fmt(ta)} s activo a ${Ia} mA y duerme a ${fmt(Is)} µA. Batería de ${C} mAh. ¿Cuántos días dura (sin contar autodescarga)?`, days, 'días',
      `Imedia = (${Ia} × ${fmt(ta)} + ${fmt(Is / 1000, 3)} × ${fmt(per - ta, 1)}) / ${per} = ${fmt(Iavg, 4)} mA. Días = ${C} / ${fmt(Iavg, 4)} / 24 ≈ ${fmt(days, 0)}.`, days * 0.03), h: 'Primero la corriente media del ciclo (todo en mA y segundos); luego capacidad entre media, y entre 24.' };
  }, 'es_battlife');

  Gen.add('es_uartTime', () => {
    const baud = pick([9600, 19200, 57600, 115200, 921600]);
    if (Math.random() < 0.35) return { ...N(`UART a ${fmt(baud)} baudios. ¿Cuánto dura un bit, en microsegundos?`, 1e6 / baud, 'µs', `T = 1 / ${fmt(baud)} s = ${fmt(1e6 / baud, 3)} µs.`, 1e6 / baud * 0.02), h: 'Un bit dura 1 / baudios segundos; pásalo a µs.' };
    const n = pick([1, 10, 64, 100, 250, 1000]), ms = n * 10 / baud * 1000;
    return { ...N(`UART a ${fmt(baud)} baudios, formato 8N1. ¿Cuánto tarda en enviar ${n} bytes, en milisegundos?`, ms, 'ms', `Cada byte son 10 bits (inicio + 8 + parada): ${n} × 10 / ${fmt(baud)} = ${fmt(ms, 3)} ms.`, Math.max(ms * 0.02, 0.001)), h: 'En 8N1 cada byte son 10 bits: bits totales entre baudios.' };
  }, 'es_bustime');

  Gen.add('es_stack', () => {
    const al = pick([2048, 3072, 4096, 8192]), hw = 4 * ri(16, Math.floor(al / 8));
    if (Math.random() < 0.5) return { ...N(`Creas una tarea con ${al} bytes de pila. uxTaskGetStackHighWaterMark() devuelve ${hw}. ¿Cuántos bytes ha llegado a usar como máximo?`, al - hw, 'bytes',
      `En ESP-IDF la pila se mide en bytes. Usado = ${al} − ${hw} = ${al - hw} bytes. La marca indica lo mínimo que ha llegado a quedar libre.`, 0.5), h: 'La marca es lo que nunca se usó: réstala de la pila total.' };
    const pct = hw / al * 100, ok = hw >= 512;
    return MC(`Tarea con ${al} bytes de pila; la marca de agua alta es ${hw} bytes (${fmt(pct, 0)} % libre en el peor momento). ¿Qué haces?`,
      ok ? 'Está bien: queda margen (más de unos 512 bytes)' : 'Subir la pila: queda demasiado poco margen',
      [ok ? 'Subir la pila: queda demasiado poco margen' : 'Está bien: queda margen (más de unos 512 bytes)', 'Bajar la pila a la mitad sin medir más', 'Nada: la pila crece sola'],
      'Una llamada más profunda o un printf grande pueden comerse cientos de bytes. Deja margen y mide en el peor caso.', { h: 'Compara lo que queda libre en el peor momento con unos 512 bytes de margen.' });
  }, 'es_taskstack');

  Gen.add('es_timerAlarm', () => {
    let f, ms, n;
    do { f = pick([1000, 10000, 100000, 1000000, 10000000]); ms = pick([0.5, 1, 2, 10, 50, 250, 1000]); n = f * ms / 1000; } while (n < 1 || n !== Math.round(n));
    return { ...N(`Arduino-ESP32 3.x: timerBegin(${fmt(f)}) hace que el temporizador cuente ${fHz(f)}. ¿Qué valor pasas a timerAlarm() para una interrupción cada ${fmt(ms)} ms?`, n, 'cuentas',
      `Cuentas = frecuencia × periodo = ${fmt(f)} × ${fmt(ms / 1000, 4)} s = ${fmt(n)}.`, 0.5), h: 'Cuentas = frecuencia de cuenta × periodo, con el periodo en segundos.' };
  }, 'es_period');

  Gen.add('es_dbm', () => {
    const d = pick([0, 3, 8.5, 10, 13, 15, 17, 20]), mw = 10 ** (d / 10);
    const f = x => fmt(x, x < 10 ? 2 : 1) + ' mW';
    return MC(`El ESP32 transmite a ${fmt(d)} dBm. ¿Cuántos milivatios son?`, f(mw), [f(d * 10 || 10), f(10 ** (d / 20)), f(d / 10 || 0.1), f(mw * 10), f(mw / 10)],
      `P(mW) = 10^(dBm / 10) = 10^${fmt(d / 10, 2)} ≈ ${f(mw)}. Cada 3 dB es casi el doble; cada 10 dB, ×10. 20 dBm = 100 mW.`, { h: '0 dBm es 1 mW; cada 10 dB multiplica por 10 y cada 3 dB, casi por 2.' });
  }, 'es_dbmw');

  Gen.add('es_i2sRate', () => {
    const fs = pick([8000, 16000, 22050, 44100, 48000]), bits = pick([16, 32]), ch = pick([1, 2]);
    if (Math.random() < 0.5) {
      const kB = fs * bits / 8 * ch / 1000;
      return { ...N(`Audio I²S a ${fmt(fs)} Hz, ${bits} bits por muestra y ${ch === 1 ? 'mono' : 'estéreo'}. ¿Cuántos kB por segundo hay que mover?`, kB, 'kB/s', `${fmt(fs)} × ${bits / 8} bytes × ${ch} = ${fmt(kB * 1000)} B/s = ${fmt(kB, 2)} kB/s.`, kB * 0.01), h: 'Muestras por segundo × bytes por muestra × canales.' };
    }
    const n = pick([256, 512, 1024, 2048]), ms = n / fs * 1000;
    return { ...N(`Un búfer DMA de ${n} muestras por canal a ${fmt(fs)} Hz. ¿Cuántos milisegundos de audio guarda?`, ms, 'ms', `${n} / ${fmt(fs)} = ${fmt(ms, 2)} ms. Ese es el margen que tiene tu tarea para rellenarlo.`, ms * 0.02), h: 'Margen = muestras / frecuencia de muestreo; pásalo a ms.' };
  }, 'es_i2sbuf');

  /* ===================== VISUALIZACIONES ===================== */
  const H = Widgets.H, num = H.num;
  Object.assign(Widgets.VIZ, {
    // LEDC: frecuencia frente a resolución con reloj de 80 MHz
    es_ledc: {
      calc: p => { const maxBits = Math.min(20, Math.floor(Math.log2(80e6 / p.f))); const div = 80e6 / (p.f * 2 ** p.bits); return { maxBits, ok: p.bits <= maxBits ? 1 : 0, best: p.bits === maxBits ? 1 : 0, div, steps: 2 ** p.bits }; },
      svg: (p, o) => {
        const lv = 2 ** Math.min(p.bits, 6); let d = 'M30 140';
        if (p.bits <= 6) for (let i = 0; i < lv; i++) { const x0 = 30 + 240 * i / lv, x1 = 30 + 240 * (i + 1) / lv, y = 140 - 90 * i / Math.max(1, lv - 1); d += `L${x0.toFixed(1)} ${y.toFixed(1)}L${x1.toFixed(1)} ${y.toFixed(1)}`; }
        else d += 'L270 50';
        const need = p.f * 2 ** p.bits, frac = Math.min(1, Math.log10(need) / Math.log10(80e6 * 4));
        return `<svg viewBox="0 0 300 200" class="viz"><path d="M30 30V140H275" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="${d}" fill="none" stroke="${o.ok ? 'var(--led)' : 'var(--err)'}" stroke-width="2.5"/>
          <text x="34" y="44" class="vizsm">Niveles de ciclo de trabajo: ${num(o.steps, 0)}</text><text x="34" y="156" class="vizsm">0 %</text><text x="240" y="44" class="vizsm">100 %</text>
          ${H.hbar(30, 182, 240, frac, o.ok ? 'var(--ok)' : 'var(--err)', `f × 2^bits = ${num(need / 1e6, 2)} MHz de 80 MHz`)}
          <path d="M${30 + 240 * Math.log10(80e6) / Math.log10(80e6 * 4)} 166V190" stroke="var(--ink)" stroke-dasharray="3 3"/>
          <text x="150" y="20" text-anchor="middle" class="vizlab" fill="${o.ok ? 'var(--ok)' : 'var(--err)'}">${o.ok ? `Posible · divisor ${num(o.div, 2)} · máx. ${o.maxBits} bits` : `Imposible: a esta f caben ${o.maxBits} bits`}</text></svg>`;
      }
    },
    // ADC con atenuación: curva ilustrativa y zona fiable
    es_adc: {
      calc: p => {
        const R = { 0: [0.1, 0.95, 1.1], 2.5: [0.1, 1.25, 1.45], 6: [0.15, 1.75, 2.0], 11: [0.15, 2.45, 3.1] }[p.at] || [0.15, 2.45, 3.1];
        const [lo, hi, fs] = R, rl = lo / fs * 4095, rh = hi / fs * 4095;
        const raw = v => v <= 0 ? 0 : v < lo ? rl * (v / lo) ** 2 : v <= hi ? rl + (v - lo) / (hi - lo) * (rh - rl) : v < fs ? rh + (4095 - rh) * Math.sqrt((v - hi) / (fs - hi)) : 4095;
        const ok = p.V >= lo && p.V <= hi ? 1 : 0;
        const smallest = [0, 2.5, 6, 11].find(a => { const r = { 0: 0.95, 2.5: 1.25, 6: 1.75, 11: 2.45 }[a]; return p.V <= r; });
        return { raw: Math.round(raw(p.V)), ok, fit: ok && smallest === p.at ? 1 : 0, lo, hi, fs, rawF: raw, mvc: (hi - lo) / (rh - rl) * 1000 };
      },
      svg: (p, o) => {
        const X = v => 30 + v / 3.3 * 250, Y = r => 150 - r / 4095 * 120; let pts = [];
        for (let i = 0; i <= 66; i++) { const v = i * 0.05; pts.push(`${X(v).toFixed(1)},${Y(o.rawF(v)).toFixed(1)}`); }
        return `<svg viewBox="0 0 300 200" class="viz"><rect x="${X(o.lo)}" y="30" width="${X(o.hi) - X(o.lo)}" height="120" fill="var(--ok)" opacity=".15"/>
          <path d="M30 26V150H284" stroke="currentColor" stroke-width="1.5" fill="none"/><polyline points="${pts.join(' ')}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          <circle cx="${X(p.V)}" cy="${Y(o.raw)}" r="5" fill="${o.ok ? 'var(--ok)' : 'var(--err)'}"/>
          <text x="34" y="40" class="vizsm">4095</text><text x="270" y="164" class="vizsm">3,3 V</text><text x="${X(o.lo) + 4}" y="146" class="vizsm">zona fiable</text>
          <text x="10" y="180" class="vizlab">${num(p.V, 2)} V → lectura ${o.raw} · ${o.ok ? 'zona lineal' : 'fuera de zona'}</text>
          <text x="10" y="196" class="vizsm">≈ ${num(o.mvc, 2)} mV por cuenta · curva orientativa</text></svg>`;
      }
    },
    // Dos núcleos: planificador con prioridades y espera activa
    es_sched: {
      calc: p => {
        const S = 80, PER = 20, busy = p.wait === 0;
        const tasks = [{ k: 'W', core: 0, prio: 23, burst: 3 }, { k: 'L', core: 1, prio: 1, burst: 8 }, { k: 'S', core: p.core, prio: p.prio, burst: Math.round(p.ms * 2) }];
        const lanes = [[], []], miss = { W: 0, L: 0, S: 0 }, idle = [0, 0];
        const rem = {}; let rr = 0;
        for (let s = 0; s < S; s++) {
          if (s % PER === 0) tasks.forEach(t => { if (s > 0 && rem[t.k] > 0) miss[t.k]++; rem[t.k] = t.burst; });
          for (const c of [0, 1]) {
            const ready = tasks.filter(t => t.core === c && (rem[t.k] > 0 || (t.k === 'S' && busy)));
            if (!ready.length) { lanes[c].push('I'); idle[c]++; continue; }
            const top = Math.max(...ready.map(t => t.prio)), tied = ready.filter(t => t.prio === top);
            const t = tied[(rr++) % tied.length]; lanes[c].push(t.k); if (rem[t.k] > 0) rem[t.k]--;
          }
        }
        tasks.forEach(t => { if (rem[t.k] > 0) miss[t.k]++; });
        const all = miss.W + miss.L + miss.S === 0 && idle[0] > 0 && idle[1] > 0 ? 1 : 0;
        return { lanes, miss, idle0: idle[0] / S, idle1: idle[1] / S, all };
      },
      svg: (p, o) => {
        const COL = { W: '#3E8FCB', L: 'var(--ok)', S: 'var(--led)', I: 'var(--line)' };
        const lane = (arr, y) => { let s = '', i = 0; while (i < arr.length) { let j = i; while (j < arr.length && arr[j] === arr[i]) j++; s += `<rect x="${60 + i * 3}" y="${y}" width="${(j - i) * 3}" height="26" fill="${COL[arr[i]]}"/>`; i = j; } return s; };
        let marks = ''; for (let k = 0; k <= 4; k++) marks += `<path d="M${60 + k * 60} 30V112" stroke="var(--muted)" stroke-dasharray="2 3"/><text x="${60 + k * 60}" y="124" text-anchor="${k === 4 ? 'end' : 'middle'}" class="vizsm">${k * 10} ms</text>`;
        const st = (k, lab) => o.miss[k] ? `<tspan fill="var(--err)">${lab} no cumple</tspan>` : `<tspan>${lab} OK</tspan>`;
        return `<svg viewBox="0 0 300 200" class="viz"><text x="4" y="52" class="vizsm">Núcleo 0</text><text x="4" y="92" class="vizsm">Núcleo 1</text>
          ${lane(o.lanes[0], 34)}${lane(o.lanes[1], 74)}${marks}
          <rect x="60" y="134" width="10" height="10" fill="#3E8FCB"/><text x="74" y="143" class="vizsm">WiFi (23)</text>
          <rect x="140" y="134" width="10" height="10" fill="var(--ok)"/><text x="154" y="143" class="vizsm">loop (1)</text>
          <rect x="210" y="134" width="10" height="10" fill="var(--led)"/><text x="224" y="143" class="vizsm">Sensor (${p.prio})</text>
          <text x="10" y="168" class="vizlab">${st('W', 'WiFi')} · ${st('L', 'loop')} · ${st('S', 'Sensor')}</text>
          <text x="10" y="188" class="vizsm" fill="${o.idle0 && o.idle1 ? 'currentColor' : 'var(--err)'}">Tiempo libre (IDLE): núcleo 0 ${num(o.idle0 * 100, 0)} % · núcleo 1 ${num(o.idle1 * 100, 0)} %${!o.idle0 ? ' · ¡el watchdog vigila la IDLE del núcleo 0!' : ''}</text></svg>`;
      }
    },
    // Consumo medio con ciclos de actividad y sueño
    es_sleep: {
      calc: p => { const per = p.T * 60, Iavg = (p.Ia * p.ta + p.Is / 1000 * (per - p.ta)) / per; const awake = p.Ia * p.ta / per, sleep = p.Is / 1000 * (per - p.ta) / per; return { Iavg, days: p.C / Iavg / 24, awake, sleep, duty: p.ta / per }; },
      svg: (p, o) => {
        const w = Math.max(2, 240 * o.duty), tot = o.awake + o.sleep, hs = Math.max(1.5, 62 * p.Is / 1000 / p.Ia), fa = o.awake / tot;
        return `<svg viewBox="0 0 300 200" class="viz"><path d="M30 20V90H275" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <rect x="31" y="28" width="${w}" height="62" fill="var(--led)"/><rect x="${31 + w}" y="${90 - hs}" width="${240 - w}" height="${hs}" fill="var(--ice)"/>
          <text x="${Math.min(36 + w, 150)}" y="42" class="vizsm">${p.Ia} mA durante ${num(p.ta, 1)} s</text><text x="270" y="82" text-anchor="end" class="vizsm">dormido: ${num(p.Is, 0)} µA</text>
          <text x="275" y="104" text-anchor="end" class="vizsm">un ciclo de ${p.T} min (tiempo no a escala)</text>
          <rect x="30" y="118" width="240" height="14" rx="4" fill="var(--ice)"/><rect x="30" y="118" width="${240 * fa}" height="14" rx="4" fill="var(--led)"/>
          <text x="30" y="146" class="vizsm">Carga gastada: despierto ${num(fa * 100, 0)} % · dormido ${num(100 - fa * 100, 0)} %</text>
          <text x="30" y="170" class="vizlab">Media ${o.Iavg >= 1 ? num(o.Iavg, 2) + ' mA' : num(o.Iavg * 1000, 0) + ' µA'} con ${p.C} mAh</text>
          <text x="30" y="192" class="vizbig" style="font-size:15px">Autonomía ≈ ${o.days >= 365 ? num(o.days / 365, 1) + (num(o.days / 365, 1) === '1' ? ' año' : ' años') : num(o.days, 0) + ' días'}</text></svg>`;
      }
    }
  });

  /* Visualizaciones nuevas (v2): cada una deja tocar una idea concreta de la especialidad. */
  const tx = (x, y, s, c = 'vizsm', a = '') => { let f = ''; a = a.replace(/fill="([^"]*)"/, (m, v) => { f = 'fill:' + v + ';'; return ''; }); if (f) a = /style="/.test(a) ? a.replace('style="', 'style="' + f) : a + ` style="${f}"`; return `<text x="${x}" y="${y}" class="${c}" ${a}>${s}</text>`; };
  const SV = (h, body) => `<svg viewBox="0 0 300 ${h}" class="viz">${body}</svg>`;
  const okc = b => b ? 'var(--ok)' : 'var(--err)';
  const bit = (x, n) => Math.floor(x / 2 ** n) % 2;
  const hex = x => '0x' + Math.round(x).toString(16).toUpperCase();
  // Pines del ESP32 clásico (módulo WROOM): qué es cada uno
  const PIN = {
    flash: [6, 7, 8, 9, 10, 11], inOnly: [34, 35, 36, 39], strap: [0, 2, 5, 12, 15], uart0: [1, 3],
    adc1: [32, 33, 34, 35, 36, 39], adc2: [0, 2, 4, 12, 13, 14, 15, 25, 26, 27],
    rtc: [0, 2, 4, 12, 13, 14, 15, 25, 26, 27, 32, 33, 34, 35, 36, 39], touch: [0, 2, 4, 12, 13, 14, 15, 27, 32, 33]
  };
  const PINLIST = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39];
  const has = (k, p) => PIN[k].includes(p);

  Object.assign(Widgets.VIZ, {
    // RAM interna (modelo orientativo): qué ocupan WiFi, BLE y tu búfer, y cuándo hace falta PSRAM
    es_ram: {
      calc: p => {
        const wifi = p.wifi ? 55 : 0, ble = [0, 45, 110][p.ble || 0], inPs = p.psram && p.buf > 0 ? 1 : 0;
        const free = 300 - wifi - ble - (inPs ? 0 : p.buf), fits = free >= 20 ? 1 : 0;
        return { free, fits, big: p.buf >= 300 && fits ? 1 : 0, inPs, radios: (wifi && ble && fits && p.buf >= 120) ? 1 : 0 };
      },
      svg: (p, o) => {
        const W = 260, k = W / 300, wifi = p.wifi ? 55 : 0, ble = [0, 45, 110][p.ble || 0], buf = o.inPs ? 0 : p.buf;
        let x = 20, s = '';
        const seg = (v, col, lab) => { if (v <= 0) return; const w = Math.min(v, Math.max(0, 300 - (x - 20) / k)) * k; s += `<rect x="${x}" y="44" width="${w}" height="30" fill="${col}"/>`; if (w > 26) s += tx(x + 3, 63, lab, 'vizsm', 'fill="#fff"'); x += w; };
        seg(wifi, '#3E8FCB', 'WiFi'); seg(ble, '#8E6CC9', 'BLE'); seg(buf, 'var(--led)', 'búfer');
        s = s.replace('fill="#fff">búfer', 'fill="#1B1300">búfer');
        const over = wifi + ble + buf > 300;
        return SV(200, `${tx(20, 30, 'SRAM libre para tu programa al arrancar ≈ 300 KB', 'vizlab')}
          <rect x="20" y="44" width="${W}" height="30" fill="var(--line)" rx="4"/>${s}<rect x="20" y="44" width="${W}" height="30" fill="none" stroke="currentColor" rx="4"/>
          ${over ? `<rect x="${20 + W - 6}" y="40" width="10" height="38" fill="var(--err)"/>` : ''}
          ${tx(20, 92, `Queda libre: ${o.free < 0 ? 'nada (faltan ' + num(-o.free, 0) + ' KB)' : num(o.free, 0) + ' KB'}`, 'vizlab', `fill="${okc(o.fits)}"`)}
          ${p.psram ? `<rect x="20" y="106" width="${W}" height="20" rx="4" fill="var(--ice-soft)"/>${o.inPs ? `<rect x="20" y="106" width="${Math.max(4, W * p.buf / 4096)}" height="20" rx="4" fill="var(--led)"/>` : ''}${tx(24, 120, 'PSRAM externa: 4 MB' + (o.inPs ? ' · el búfer va aquí' : ''))}` : tx(20, 120, 'Sin PSRAM (módulo WROOM)')}
          ${tx(20, 150, o.fits ? 'Cabe, con margen para el sistema' : 'No cabe: el programa fallará al reservar', 'vizlab', `fill="${okc(o.fits)}"`)}
          ${tx(20, 172, 'Cifras orientativas: dependen de la versión del núcleo')}${tx(20, 188, 'y de la configuración de cada pila.')}`);
      }
    },
    // Elegir variante: cada requisito descarta chips
    es_pick: {
      calc: p => {
        const C = [['ESP32', 1, 1, 1, 0, 0], ['S2', 1, 0, 0, 1, 0], ['S3', 1, 1, 0, 1, 0], ['C3', 1, 1, 0, 0, 0], ['C6', 1, 1, 0, 0, 1], ['H2', 0, 1, 0, 0, 1], ['P4', 0, 0, 0, 1, 0]];
        const okc = C.map(([, w, b, c, u, z]) => (!p.wifi || w) && (p.bt === 0 || (p.bt === 1 && b) || (p.bt === 2 && c)) && (!p.usb || u) && (!p.z || z));
        const names = C.filter((c, i) => okc[i]).map(c => c[0]), n = names.length;
        return { okc, n, esp32: n === 1 && names[0] === 'ESP32' ? 1 : 0, s3: n === 1 && names[0] === 'S3' ? 1 : 0, zig: p.z && !p.wifi && n === 2 ? 1 : 0, C };
      },
      svg: (p, o) => {
        let s = '';
        o.C.forEach(([nm, w, b, c, u, z], i) => {
          const x = 8 + (i % 4) * 72, y = 30 + Math.floor(i / 4) * 70, on = o.okc[i];
          s += `<g opacity="${on ? 1 : 0.28}"><rect x="${x}" y="${y}" width="66" height="60" rx="8" fill="${on ? 'var(--ice-soft)' : 'none'}" stroke="currentColor"/>${tx(x + 33, y + 16, nm, 'vizlab', 'text-anchor="middle"')}
            ${tx(x + 5, y + 31, (w ? 'WiFi ' : '') + (b ? 'BLE' : ''))}${tx(x + 5, y + 43, (c ? 'BT clásico ' : '') + (u ? 'USB' : ''))}${tx(x + 5, y + 55, z ? 'Zigbee' : '')}</g>`;
        });
        return SV(200, tx(8, 18, `Requisitos activos → quedan ${o.n} de 7`, 'vizlab') + s + tx(8, 192, o.n ? 'Encendidos: los que cumplen todo lo que pides' : 'Ninguno cumple: relaja algún requisito', 'vizsm'));
      }
    },
    // Regulador lineal de la placa: margen, salida y calor
    es_ldo: {
      calc: p => {
        const drop = p.tipo ? 0.25 : 1.1, vout = Math.max(0, Math.min(3.3, p.vin - drop)), ok = vout >= 3.29 ? 1 : 0, P = Math.max(0, (p.vin - vout) * p.i / 1000);
        return { vout, ok, low: ok ? 0 : 1, P, ok37: ok && p.vin <= 3.7 ? 1 : 0, iq: p.tipo ? 0.005 : 5 };
      },
      svg: (p, o) => SV(200, `<rect x="110" y="40" width="80" height="54" rx="6" fill="var(--ice-soft)" stroke="currentColor"/>${tx(150, 62, p.tipo ? 'LDO bajo' : 'AMS1117', 'vizlab', 'text-anchor="middle"')}${tx(150, 80, 'necesita ' + num(p.tipo ? 0.25 : 1.1, 2) + ' V más', 'vizsm', 'text-anchor="middle"')}
        <path d="M20 67H110M190 67H280" stroke="currentColor" stroke-width="2"/><path d="M20 67H110M190 67H280" stroke="var(--led)" stroke-width="2" class="a-flow"/>
        ${tx(20, 58, 'VIN ' + num(p.vin, 1) + ' V', 'vizlab')}${tx(280, 58, '3V3: ' + num(o.vout, 2) + ' V', 'vizlab', `text-anchor="end" fill="${okc(o.ok)}"`)}
        ${H.hbar(20, 128, 260, Math.min(1, o.P / 1.5), o.P > 0.8 ? 'var(--err)' : 'var(--led)', 'Calor en el regulador: ' + num(o.P, 2) + ' W' + (o.P > 0.8 ? ' · ¡quema!' : ''))}
        ${tx(20, 160, o.ok ? 'Regula bien: el chip recibe sus 3,3 V' : 'Se queda corto: el chip puede reiniciarse', 'vizlab', `fill="${okc(o.ok)}"`)}
        ${tx(20, 182, 'Consumo propio en reposo: ' + (p.tipo ? 'unos µA' : 'unos mA'))}`)
    },
    // Frecuencia de la CPU: radio, velocidad y gasto (modelo simplificado)
    es_cpu: {
      calc: p => { const I = 8 + 0.18 * p.f, t = 24000 / p.f, Q = I * t / 1000; return { I, t, Q, radioOk: p.f >= 80 ? 1 : 0, radioMin: p.radio && p.f === 80 ? 1 : 0, fast: p.f === 240 ? 1 : 0, broken: p.radio && p.f < 80 ? 1 : 0 }; },
      svg: (p, o) => SV(200, `${tx(10, 20, 'CPU a ' + p.f + ' MHz · un ciclo dura ' + num(1000 / p.f, 2) + ' ns', 'vizlab')}
        ${H.hbar(10, 50, 280, o.I / 52, 'var(--led)', 'Corriente de la CPU ≈ ' + num(o.I, 0) + ' mA')}
        ${H.hbar(10, 86, 280, o.t / 2400, '#3E8FCB', 'Tiempo para una tarea de 24 millones de ciclos: ' + num(o.t, 0) + ' ms')}
        ${H.hbar(10, 122, 280, o.Q / 24, 'var(--ice-soft)', 'Carga gastada en esa tarea: ' + num(o.Q, 1) + ' mC')}
        ${tx(10, 154, p.radio ? (o.radioOk ? 'WiFi activo: funciona' : 'WiFi activo: ¡no funciona por debajo de 80 MHz!') : 'Sin radio', 'vizlab', `fill="${okc(!p.radio || o.radioOk)}"`)}
        ${tx(10, 176, 'Modelo simplificado y orientativo: el consumo real')}${tx(10, 190, 'depende del chip, la placa y lo que haga el código.')}`)
    },
    // Pines de arranque: qué decide el chip al soltar EN
    es_strap: {
      calc: p => { const noboot = p.g12 ? 1 : 0, dl = !noboot && !p.g0 && !p.g2 ? 1 : 0, bad = !noboot && !p.g0 && p.g2 ? 1 : 0, run = !noboot && p.g0 ? 1 : 0; return { noboot, dl, bad, run, quietRun: run && !p.g15 ? 1 : 0 }; },
      svg: (p, o) => {
        const pins = [['GPIO 0', p.g0], ['GPIO 2', p.g2], ['GPIO 12', p.g12], ['GPIO 15', p.g15]];
        let s = ''; pins.forEach(([n, v], i) => { const y = 34 + i * 30; s += `<rect x="14" y="${y - 12}" width="60" height="20" rx="4" fill="${v ? 'var(--led)' : 'var(--line)'}"/>${tx(44, y + 2, v ? 'ALTO' : 'BAJO', 'vizsm', 'text-anchor="middle"')}${tx(80, y + 2, n, 'vizlab')}<path d="M140 ${y - 2}H170" stroke="currentColor"/>`; });
        const msg = o.noboot ? ['No arranca', 'GPIO 12 alto: elige flash de 1,8 V y no la lee'] : o.dl ? ['Modo descarga', 'Espera un programa por el puerto serie'] : o.bad ? ['Combinación no válida', 'Para descargar, GPIO 2 debe estar bajo'] : ['Arranca tu programa', o.quietRun ? 'Sin los mensajes de la ROM (GPIO 15 bajo)' : 'La ROM saluda por el monitor serie'];
        return SV(200, `<rect x="170" y="20" width="118" height="104" rx="8" fill="var(--ice-soft)" stroke="currentColor"/>${tx(229, 66, 'ESP32', 'vizbig', 'text-anchor="middle"')}${tx(229, 84, 'al soltar EN', 'vizsm', 'text-anchor="middle"')}${s}
          ${tx(14, 160, msg[0], 'vizbig', `fill="${okc(o.run)}"`)}${tx(14, 180, msg[1])}`);
      }
    },
    // Explorador de pines del ESP32 clásico
    es_pins: {
      calc: p => {
        const g = p.pin, u = p.uso, fl = has('flash', g), io = has('inOnly', g), st = has('strap', g), ua = has('uart0', g);
        const out = !fl && !io, warn = st || ua;
        const ok = [out, out, has('adc1', g), has('rtc', g), has('touch', g)][u] ? 1 : 0;
        const good = ok && !(u <= 1 && warn) ? 1 : 0;
        return { ok, good, ledOk: u === 0 && good ? 1 : 0, btnOk: u === 1 && good ? 1 : 0, anaOk: u === 2 && good ? 1 : 0, wakeOk: u === 3 && good ? 1 : 0, touchOk: u === 4 && good ? 1 : 0, inOnly: io ? 1 : 0, flash: fl ? 1 : 0, warn: warn ? 1 : 0, wakeIn: u === 3 && good && io ? 1 : 0 };
      },
      svg: (p, o) => {
        const g = p.pin, tags = [['Flash', has('flash', g), 'var(--err)'], ['Solo entrada', has('inOnly', g), 'var(--err)'], ['Arranque', has('strap', g), '#D9A21B'], ['USB serie', has('uart0', g), '#D9A21B'], ['ADC1', has('adc1', g), 'var(--ok)'], ['ADC2', has('adc2', g), '#3E8FCB'], ['RTC', has('rtc', g), 'var(--ok)'], ['Touch', has('touch', g), 'var(--ok)']];
        let s = ''; tags.forEach(([n, on, c], i) => { const x = 104 + (i % 2) * 94, y = 22 + Math.floor(i / 2) * 26; s += `<rect x="${x}" y="${y}" width="88" height="20" rx="10" fill="${on ? c : 'none'}" stroke="${on ? c : 'var(--line)'}"/>${tx(x + 44, y + 14, n, 'vizsm', `text-anchor="middle" ${on ? 'fill="#fff"' : ''}`)}`; });
        const uso = ['un LED (salida)', 'un pulsador con INPUT_PULLUP', 'leer analógico con WiFi', 'despertar del deep sleep', 'un sensor táctil'][p.uso];
        const why = o.good ? 'Buena elección' : !o.ok ? (has('flash', g) ? 'No: es de la flash' : p.uso <= 1 ? 'No: solo entrada, sin pull-ups' : p.uso === 2 ? (has('adc2', g) ? 'No: ADC2, ocupado por el WiFi' : 'No: no tiene ADC') : p.uso === 3 ? 'No: no es GPIO RTC' : 'No: no tiene canal táctil') : 'Funciona, pero con cuidado: ' + (has('strap', g) ? 'pin de arranque' : 'es el puerto serie del USB');
        return SV(200, `<rect x="10" y="22" width="84" height="100" rx="10" fill="var(--ice-soft)" stroke="currentColor"/>${tx(52, 62, 'GPIO', 'vizsm', 'text-anchor="middle"')}${tx(52, 92, g, 'vizbig', 'text-anchor="middle" style="font-size:28px"')}${s}
          ${tx(10, 148, 'Uso: ' + uso, 'vizlab')}${tx(10, 172, why, 'vizlab', `fill="${o.good ? 'var(--ok)' : o.ok ? '#D9A21B' : 'var(--err)'}"`)}${tx(10, 192, 'ESP32 clásico con módulo WROOM')}`);
      }
    },
    // Máscaras: W1TS y W1TC sobre el registro de salida
    es_mask: {
      calc: p => {
        const before = 2 ** 2 + 2 ** 25, mask = (p.a >= 0 ? 2 ** p.a : 0) + (p.b >= 0 && p.b !== p.a ? 2 ** p.b : 0);
        let after = before; for (let n = 0; n < 32; n++) if (bit(mask, n)) after += p.op === 0 ? (bit(before, n) ? 0 : 2 ** n) : (bit(before, n) ? -(2 ** n) : 0);
        return { before, mask, after, set2526: p.op === 0 && mask === 2 ** 25 + 2 ** 26 ? 1 : 0, off2: p.op === 1 && !bit(after, 2) && bit(after, 25) && mask === 4 ? 1 : 0 };
      },
      svg: (p, o) => {
        const P = [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27];
        const row = (val, y, lab, hl) => tx(4, y + 12, lab) + P.map((n, i) => `<rect x="${58 + i * 14}" y="${y}" width="12" height="16" rx="2" fill="${bit(val, n) ? (hl ? 'var(--ice-soft)' : 'var(--led)') : 'none'}" stroke="var(--line)"/>`).join('');
        return SV(200, `${tx(150, 16, (p.op ? 'GPIO_OUT_W1TC_REG' : 'GPIO_OUT_W1TS_REG') + ' ← ' + hex(o.mask), 'vizlab', 'text-anchor="middle"')}
          ${P.map((n, i) => tx(64 + i * 14, 36, n, 'vizsm', 'text-anchor="middle" style="font-size:8px"')).join('')}
          ${row(o.mask, 42, 'Máscara', 1)}${row(o.before, 72, 'Antes', 0)}${row(o.after, 102, 'Después', 0)}
          ${tx(4, 142, p.op ? 'W1TC: cada bit a 1 de la máscara pone su pin a 0' : 'W1TS: cada bit a 1 de la máscara pone su pin a 1', 'vizlab')}
          ${tx(4, 162, 'Los bits a 0 no tocan nada: los demás pines siguen igual.')}${tx(4, 184, 'Pines encendidos después: ' + (P.filter(n => bit(o.after, n)).join(', ') || 'ninguno'))}`);
      }
    },
    // Divisor para medir una batería: zona del ADC, consumo y carga del muestreo
    es_vdiv: {
      calc: p => {
        const vpin = p.vb * p.r2 / (p.r1 + p.r2), iuA = p.vb / (p.r1 + p.r2) * 1000, zone = vpin <= 2.45 && vpin >= 0.15 ? 1 : 0;
        const rth = p.r1 * p.r2 / (p.r1 + p.r2), samp = rth <= 50 || p.cap ? 1 : 0, err = samp ? 0 : Math.min(25, (rth - 50) / 20);
        return { vpin, iuA, zone, rth, samp, err, lowI: zone && iuA <= 10 ? 1 : 0, good: zone && iuA <= 10 && samp ? 1 : 0 };
      },
      svg: (p, o) => SV(200, `<path d="M40 20V60M40 104V150M40 82H120" stroke="currentColor" stroke-width="2"/><rect x="30" y="60" width="20" height="22" fill="var(--ice-soft)" stroke="currentColor"/><rect x="30" y="104" width="20" height="22" fill="var(--ice-soft)" stroke="currentColor"/>
        <path d="M40 82V104" stroke="currentColor" stroke-width="2"/>${tx(56, 75, 'R1 ' + num(p.r1, 0) + ' kΩ')}${tx(56, 120, 'R2 ' + num(p.r2, 0) + ' kΩ')}${tx(8, 16, 'Batería ' + num(p.vb, 1) + ' V', 'vizlab')}${tx(8, 164, 'GND')}
        ${p.cap ? '<path d="M120 82V100M110 100H130M110 106H130M120 106V120" stroke="currentColor" stroke-width="2"/>' + tx(134, 106, '100 nF') : ''}
        ${tx(124, 78, 'Pin del ADC: ' + num(o.vpin, 2) + ' V', 'vizlab', `fill="${okc(o.zone)}"`)}
        ${tx(150, 30, 'Gasta siempre: ' + num(o.iuA, 1) + ' µA', 'vizlab', `fill="${okc(o.iuA <= 10)}"`)}
        ${tx(150, 140, o.samp ? 'Muestreo: carga a tiempo' : 'Muestreo: lee ~' + num(o.err, 0) + ' % bajo', 'vizlab', `fill="${okc(o.samp)}"`)}
        ${tx(8, 186, o.zone ? 'Dentro de la zona fiable (hasta ~2,45 V con 11 dB)' : 'Fuera de la zona fiable del ADC', 'vizsm')}`)
    },
    // Filtro exponencial sobre una señal ruidosa con un escalón
    es_ema: {
      calc: p => {
        let s = 12345; const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
        const x = [], y = []; let f = 1000;
        for (let i = 0; i < 200; i++) { const n = (rnd() + rnd() + rnd() - 1.5) * 2 * p.ruido; const v = (i < 40 ? 1000 : 2000) + n; x.push(v); f += p.a * (v - f); y.push(f); }
        let lag = 999; for (let i = 40; i < 200; i++) if (y[i] >= 1630) { lag = i - 40 + 1; break; }
        let m = 0; for (let i = 150; i < 200; i++) m += y[i] / 50; let sq = 0; for (let i = 150; i < 200; i++) sq += (y[i] - m) ** 2;
        const ripple = Math.sqrt(sq / 50);
        return { x, y, lag, ripple, smooth: ripple <= 8 ? 1 : 0, both: ripple <= 12 && lag <= 12 ? 1 : 0 };
      },
      svg: (p, o) => {
        const Y = v => 150 - (v - 700) / 1600 * 120, X = i => 10 + i * 1.4;
        const pl = arr => arr.map((v, i) => `${X(i)},${Y(v).toFixed(1)}`).join(' ');
        return SV(200, `<path d="M10 30V150H290" stroke="currentColor" fill="none"/><polyline points="${pl(o.x)}" fill="none" stroke="var(--muted)" stroke-width="1"/><polyline points="${pl(o.y)}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          ${tx(14, 24, 'Gris: lecturas · naranja: filtrada (α = ' + num(p.a, 2) + ')', 'vizsm')}${tx(92, 44, 'el valor real salta de 1000 a 2000', 'vizsm')}
          ${tx(10, 172, 'Ruido que queda: ±' + num(o.ripple, 0) + ' cuentas', 'vizlab', `fill="${okc(o.ripple <= 12)}"`)}
          ${tx(10, 192, 'Reacción al salto (63 %): ' + (o.lag >= 999 ? 'más de 160' : o.lag) + ' lecturas', 'vizlab', `fill="${okc(o.lag <= 12)}"`)}`);
      }
    },
    // Histéresis: una lectura que ronda el umbral
    es_hyst: {
      calc: p => {
        let s = 777; const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
        const v = [], st = []; let on = false, flips = 0;
        for (let i = 0; i < 140; i++) { const base = 2750 + 380 * Math.sin(i / 140 * Math.PI * 2 - 1.2), x = base + (rnd() + rnd() - 1) * p.ruido; v.push(x);
          const hi = 2750 + p.gap / 2, lo = 2750 - p.gap / 2; const prev = on; if (!on && x > hi) on = true; else if (on && x < lo) on = false; if (on !== prev) flips++; st.push(on); }
        return { v, st, flips, clean: flips <= 2 ? 1 : 0 };
      },
      svg: (p, o) => {
        const Y = v => 120 - (v - 2100) / 1300 * 100, X = i => 10 + i * 2, hi = 2750 + p.gap / 2, lo = 2750 - p.gap / 2;
        let led = ''; o.st.forEach((on, i) => { if (on) led += `<rect x="${X(i)}" y="140" width="2" height="12" fill="var(--led)"/>`; });
        return SV(200, `<rect x="10" y="${Y(hi)}" width="280" height="${Math.max(1, Y(lo) - Y(hi))}" fill="var(--ice-soft)" opacity=".6"/>
          <path d="M10 ${Y(hi)}H290M10 ${Y(lo)}H290" stroke="var(--muted)" stroke-dasharray="4 3"/><polyline points="${o.v.map((v, i) => X(i) + ',' + Y(v).toFixed(1)).join(' ')}" fill="none" stroke="currentColor" stroke-width="1.2"/>
          ${tx(14, 14, 'Lectura de luz y los dos umbrales', 'vizsm')}<rect x="10" y="140" width="280" height="12" fill="none" stroke="var(--line)"/>${led}${tx(14, 166, 'LED encendido')}
          ${tx(10, 190, 'Conmutaciones: ' + o.flips + (o.clean ? ' · limpio' : ' · ¡parpadea!'), 'vizlab', `fill="${okc(o.clean)}"`)}`);
      }
    },
    // Valor de ledcWrite, ciclo de trabajo y anchura del pulso
    es_duty: {
      calc: p => { const top = 2 ** p.bits, duty = Math.min(1, p.val / top), T = 1000 / p.f, tOn = duty * T; return { duty: duty * 100, tOn, over: p.val >= top ? 1 : 0, d25: p.bits === 12 && Math.abs(duty - 0.25) < 1e-6 ? 1 : 0, servo: Math.abs(tOn - 1.5) < 0.01 ? 1 : 0 }; },
      svg: (p, o) => {
        const T = 1000 / p.f, w = 120, hi = Math.max(0.5, w * o.duty / 100);
        let d = ''; for (let k = 0; k < 2; k++) { const x0 = 30 + k * w; d += `M${x0} 120V50H${x0 + hi}V120H${x0 + w}`; }
        return SV(200, `<path d="M30 130H280" stroke="var(--line)"/><path d="${d}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          ${tx(30, 30, 'ledcWrite(pin, ' + p.val + ') con ' + p.bits + ' bits → ' + num(o.duty, 2) + ' %', 'vizlab')}
          ${tx(30, 148, 'Periodo ' + (T >= 1 ? num(T, 2) + ' ms' : num(T * 1000, 1) + ' µs') + ' (' + p.f + ' Hz) · alto ' + (o.tOn >= 1 ? num(o.tOn, 3) + ' ms' : num(o.tOn * 1000, 1) + ' µs'))}
          ${tx(30, 170, 'Cuentas por periodo: 2^' + p.bits + ' = ' + num(2 ** p.bits, 0))}
          ${o.over ? tx(30, 190, 'Valor ≥ 2^bits: la salida queda siempre alta', 'vizlab', 'fill="var(--err)"') : tx(30, 190, 'ciclo = valor / 2^bits')}`);
      }
    },
    // Sensor táctil: la lectura baja con el dedo (ESP32 clásico)
    es_touch: {
      calc: p => { const base = 60, read = Math.round(base - 42 * (p.dedo / 100) ** 1.5), det = read < p.um ? 1 : 0, fp = base < p.um ? 1 : 0; return { read, det, fp, ok: p.dedo >= 90 && det && !fp && p.um <= base - 8 ? 1 : 0 }; },
      svg: (p, o) => {
        const Y = v => 150 - v / 80 * 120;
        return SV(200, `<rect x="40" y="${Y(o.read)}" width="60" height="${150 - Y(o.read)}" fill="${o.det ? 'var(--led)' : 'var(--ice-soft)'}"/><path d="M30 ${Y(p.um)}H130" stroke="var(--err)" stroke-dasharray="4 3"/>${tx(132, Y(p.um) + 4, 'umbral ' + p.um, 'vizsm', 'fill="var(--err)"')}
          <path d="M30 30V150H130" stroke="currentColor" fill="none"/>${tx(40, Y(o.read) - 6, 'lectura ' + o.read, 'vizlab')}
          <rect x="190" y="132" width="80" height="12" rx="3" fill="#C98B3A"/>${tx(230, 160, 'lámina de cobre', 'vizsm', 'text-anchor="middle"')}
          <ellipse cx="230" cy="${118 - (1 - p.dedo / 100) * 80}" rx="14" ry="20" fill="#E7B48F" stroke="currentColor"/>
          ${tx(10, 186, o.fp ? 'Detecta aunque no toques: umbral por encima de la base' : o.det ? '¡Toque detectado!' : 'Sin toque', 'vizlab', `fill="${o.fp ? 'var(--err)' : o.det ? 'var(--ok)' : 'currentColor'}"`)}`);
      }
    },
    // DAC frente a PWM
    es_dac: {
      calc: p => ({ V: p.n / 255 * 3.3, step: 3.3 / 255 * 1000 }),
      svg: (p, o) => {
        const Y = v => 140 - v / 3.3 * 100, d = p.n / 255; let sq = '';
        for (let k = 0; k < 4; k++) { const x0 = 160 + k * 30; sq += `M${x0} 140V40H${x0 + 30 * d}V140H${x0 + 30}`; }
        return SV(200, `${tx(20, 22, 'DAC (GPIO 25)', 'vizlab')}${tx(160, 22, 'PWM, mismo valor', 'vizlab')}<path d="M20 140H140M160 140H280" stroke="var(--line)"/>
          <path d="M20 ${Y(o.V)}H140" stroke="var(--led)" stroke-width="3"/><path d="${sq}" fill="none" stroke="var(--led)" stroke-width="2"/><path d="M160 ${Y(o.V)}H280" stroke="var(--muted)" stroke-dasharray="4 3"/>
          ${tx(20, 162, 'dacWrite(25, ' + p.n + ') → ' + num(o.V, 2) + ' V continuos', 'vizlab')}${tx(160, 162, 'media ' + num(o.V, 2) + ' V')}
          ${tx(20, 186, 'Cada escalón del DAC vale ' + num(o.step, 1) + ' mV')}`);
      }
    },
    // Tira WS2812: tiempo de envío y corriente
    es_ws: {
      calc: p => { const ms = p.n * 24 * 1.25 / 1000 + 0.05, A = p.n * 0.06 * p.br / 100 * (p.col ? 1 / 3 : 1); return { ms, A, fps: 1000 / ms, ok2: A <= 2 ? 1 : 0, big: p.n >= 60 && A <= 2 ? 1 : 0, t60: p.n === 60 ? 1 : 0 }; },
      svg: (p, o) => {
        let s = ''; const k = Math.min(p.n, 24); for (let i = 0; i < k; i++) s += `<circle cx="${18 + i * 11.2}" cy="40" r="4.5" fill="${p.col ? '#FF3B30' : '#fff'}" opacity="${0.25 + 0.75 * p.br / 100}" stroke="var(--line)"/>`;
        return SV(200, `<rect x="8" y="30" width="284" height="20" rx="4" fill="#222"/>${s}${p.n > 24 ? tx(292, 66, '… y ' + (p.n - 24) + ' más', 'vizsm', 'text-anchor="end"') : ''}
          ${tx(8, 90, 'Envío: ' + p.n + ' × 24 bits × 1,25 µs ≈ ' + num(o.ms, 2) + ' ms', 'vizlab')}${tx(8, 108, 'Máximo teórico: unos ' + num(Math.min(o.fps, 9999), 0) + ' fotogramas por segundo')}
          ${H.hbar(8, 142, 284, o.A / 6, o.ok2 ? 'var(--ok)' : 'var(--err)', 'Corriente: ' + num(o.A, 2) + ' A (hasta 60 mA por LED en blanco)')}
          ${tx(8, 176, o.ok2 ? 'Una fuente de 5 V y 2 A basta' : 'Más de 2 A: fuente mayor o menos brillo', 'vizlab', `fill="${okc(o.ok2)}"`)}`);
      }
    },
    // Infrarrojos NEC: cada bit es un pulso y una pausa de distinta duración
    es_nec: {
      calc: p => { let ones = 0; for (let i = 0; i < 8; i++) ones += bit(p.cmd, i); return { ones, dur: (8 - ones) * 1.125 + ones * 2.25, all1: ones === 8 ? 1 : 0, all0: ones === 0 ? 1 : 0 }; },
      svg: (p, o) => {
        let x = 10, d = 'M10 110', lab = '';
        for (let i = 0; i < 8; i++) { const b = bit(p.cmd, i), sp = b ? 1.6875 : 0.5625, k = 12; d += `H${x}V60H${x + 0.5625 * k}V110H${x + (0.5625 + sp) * k}`; lab += tx(x + 3, 128, b, 'vizsm'); x += (0.5625 + sp) * k; }
        return SV(200, `${tx(10, 30, 'Comando ' + p.cmd + ' = 0b' + p.cmd.toString(2).padStart(8, '0'), 'vizlab') + tx(10, 46, 'se envía primero el bit 0')}<path d="${d}H290" fill="none" stroke="var(--led)" stroke-width="2.2"/>${lab}
          ${tx(10, 152, 'Un 0: pulso 0,56 ms + pausa 0,56 ms = 1,125 ms')}${tx(10, 168, 'Un 1: pulso 0,56 ms + pausa 1,69 ms = 2,25 ms')}
          ${tx(10, 190, 'Estos 8 bits duran ' + num(o.dur, 3) + ' ms (' + o.ones + ' unos)', 'vizlab')}`);
      }
    },
    // Cuánto tarda un bus: UART, I²C y SPI
    es_bustime: {
      calc: p => {
        const bits = p.proto === 0 ? p.n * 10 : p.proto === 1 ? 9 + 1 + 9 + 1 + 9 + p.n * 9 + 2 : p.n * 8;
        const sp = [9600, 115200, 1e6][p.v] , hz = p.proto === 0 ? [9600, 115200, 921600][p.v] : p.proto === 1 ? [100000, 400000, 1000000][p.v] : [1e6, 10e6, 40e6][p.v];
        const us = bits / hz * 1e6; return { bits, us, hz, sp, uartOk: p.proto === 0 && p.n >= 100 && us < 10000 ? 1 : 0, i2cOk: p.proto === 1 && p.n >= 6 && us < 250 ? 1 : 0 };
      },
      svg: (p, o) => {
        const nm = ['UART 8N1', 'I²C (lectura de registro)', 'SPI'][p.proto], per = ['10 bits por byte (inicio + 8 + parada)', '9 bits por byte (8 + ACK) + dirección y registro', '8 bits por byte, sin sobrecarga'][p.proto];
        const vel = o.hz >= 1e6 ? num(o.hz / 1e6, 1) + ' MHz' : o.hz >= 1000 && p.proto ? num(o.hz / 1000, 0) + ' kHz' : num(o.hz, 0) + (p.proto ? ' Hz' : ' baudios');
        return SV(200, `${tx(10, 24, nm + ' a ' + vel, 'vizlab')}${tx(10, 44, per)}
          ${H.hbar(10, 84, 280, Math.min(1, Math.log10(o.us + 1) / 6), o.us < 1000 ? 'var(--ok)' : o.us < 100000 ? 'var(--led)' : 'var(--err)', p.n + ' bytes → ' + o.bits + ' bits en el cable')}
          ${tx(10, 124, 'Tiempo: ' + (o.us >= 1000 ? num(o.us / 1000, 2) + ' ms' : num(o.us, 1) + ' µs'), 'vizbig')}
          ${tx(10, 150, 'tiempo = bits en el cable / velocidad')}${tx(10, 172, 'Escala de la barra logarítmica: de 1 µs a 1 s')}`);
      }
    },
    // I²S: caudal, BCLK y margen del búfer
    es_i2s: {
      calc: p => { const bclk = p.fs * p.bits * p.ch, Bps = p.fs * p.bits / 8 * p.ch, ms = p.buf / p.fs * 1000, glitch = p.wifi > ms ? 1 : 0; return { bclk, Bps, ms, glitch, cd: p.fs === 44100 && p.bits === 16 && p.ch === 2 ? 1 : 0, safe: !glitch && p.wifi >= 30 ? 1 : 0 }; },
      svg: (p, o) => {
        const fill = Math.max(0, 1 - p.wifi / o.ms);
        return SV(200, `${tx(10, 22, 'BCLK = ' + num(p.fs, 0) + ' × ' + p.bits + ' × ' + p.ch + ' = ' + num(o.bclk / 1e6, 3) + ' MHz', 'vizlab')}${tx(10, 42, 'Caudal: ' + num(o.Bps / 1000, 1) + ' kB/s')}
          <rect x="10" y="60" width="200" height="30" rx="4" fill="none" stroke="currentColor"/><rect x="10" y="60" width="${200 * fill}" height="30" rx="4" fill="${o.glitch ? 'var(--err)' : 'var(--ice-soft)'}"/>
          ${tx(216, 80, 'búfer ' + num(o.ms, 1) + ' ms', 'vizsm')}${tx(10, 112, 'Tu tarea se retrasa ' + p.wifi + ' ms (WiFi ocupado)')}
          ${tx(10, 140, o.glitch ? '¡Se vacía antes de rellenarlo: clic!' : 'Queda margen: suena limpio', 'vizlab', `fill="${okc(!o.glitch)}"`)}
          ${tx(10, 166, 'Margen = muestras del búfer / frecuencia de muestreo')}${tx(10, 184, 'Más búfer: más margen y también más retardo.')}`);
      }
    },
    // Antirrebote por tiempo en una interrupción
    es_bounce: {
      calc: p => { const e = [0, 0.12, 0.3, 0.55, 0.85, 1].map(f => f * p.reb); let last = -1e9, n = 0; e.forEach(t => { if (t - last >= p.win) { n++; last = t; } }); return { n, one: n === 1 ? 1 : 0, robust: n === 1 && p.reb >= 8 ? 1 : 0, maxRate: p.win ? 1000 / p.win : 999 }; },
      svg: (p, o) => {
        const e = [0, 0.12, 0.3, 0.55, 0.85, 1].map(f => f * p.reb), X = t => 20 + t / 12 * 260; let d = 'M20 50', last = -1e9, mk = '';
        e.forEach((t, i) => { d += `H${X(t)}V100H${X(t + p.reb * 0.06)}V${i === e.length - 1 ? 100 : 50}`; if (t - last >= p.win) { last = t; mk += `<circle cx="${X(t)}" cy="120" r="5" fill="var(--led)"/>`; } else mk += `<circle cx="${X(t)}" cy="120" r="5" fill="none" stroke="var(--muted)"/>`; });
        return SV(200, `${tx(20, 30, 'Pin al pulsar (cada bajada es un flanco FALLING)', 'vizsm')}<path d="${d}H280" fill="none" stroke="currentColor" stroke-width="2"/>
          <rect x="20" y="132" width="${Math.min(260, X(p.win) - 20)}" height="6" fill="var(--ice-soft)"/>${mk}${tx(20, 154, 'Ventana de ' + p.win + ' ms tras cada flanco aceptado')}
          ${tx(20, 178, 'Cuenta ' + o.n + (o.n === 1 ? ' pulsación' : ' pulsaciones') + ' por una real', 'vizlab', `fill="${okc(o.n === 1)}"`)}${tx(20, 194, 'Escala: 12 ms de ancho')}`);
      }
    },
    // Pila de una tarea: lo que consume y el margen
    es_stack: {
      calc: p => { const used = 600 + p.arr + (p.pf ? 1200 : 0), free = p.st - used, L = [1024, 2048, 3072, 4096, 6144, 8192]; const minOk = L.find(s => s - used >= 512); return { used, free, overflow: free < 0 ? 1 : 0, safe: free >= 512 ? 1 : 0, tight: p.pf && p.arr === 2000 && p.st === minOk ? 1 : 0 }; },
      svg: (p, o) => {
        const H0 = 150, k = H0 / 8192, u = Math.min(o.used, p.st);
        return SV(200, `<rect x="40" y="${170 - p.st * k}" width="70" height="${p.st * k}" fill="none" stroke="currentColor"/>
          <rect x="40" y="${170 - 600 * k}" width="70" height="${600 * k}" fill="#3E8FCB"/><rect x="40" y="${170 - (600 + Math.min(p.arr, p.st - 600)) * k}" width="70" height="${Math.max(0, Math.min(p.arr, p.st - 600)) * k}" fill="var(--led)"/>
          ${p.pf ? `<rect x="40" y="${170 - u * k}" width="70" height="${Math.max(0, u - 600 - p.arr) * k}" fill="#8E6CC9"/>` : ''}
          ${o.overflow ? `<rect x="36" y="${170 - p.st * k - 4}" width="78" height="8" fill="var(--err)" class="a-blink"/>` : ''}
          ${tx(122, 40, 'Pila: ' + p.st + ' bytes', 'vizlab')}${tx(122, 60, 'Usado: ' + o.used + ' bytes')}${tx(122, 76, 'azul: llamadas · naranja: array local')}${tx(122, 92, 'morado: printf')}
          ${tx(122, 120, o.overflow ? '¡Desbordada!' : 'Libre en el peor caso: ' + o.free, 'vizlab', `fill="${okc(o.safe)}"`)}
          ${tx(122, 140, o.overflow ? 'Stack canary watchpoint triggered' : o.safe ? 'Margen suficiente (≥ 512 bytes)' : 'Muy justo: menos de 512 bytes', 'vizsm')}
          ${tx(122, 170, 'Cifras orientativas')}`);
      }
    },
    // Cola entre productor y consumidor
    es_queue: {
      calc: p => {
        let q = 0, lost = 0, maxq = 0; const dt = 0.01;
        for (let i = 0; i < 1000; i++) { if (i % 100 === 0) { for (let k = 0; k < p.b; k++) { if (q < p.L) q++; else lost++; } } const take = Math.min(q, p.c * dt); q -= take; maxq = Math.max(maxq, q); }
        return { lost: Math.round(lost), maxq, ok: lost === 0 ? 1 : 0, grows: p.c < p.b ? 1 : 0 };
      },
      svg: (p, o) => {
        let s = ''; const n = Math.min(p.L, 20), occ = Math.min(n, Math.round(o.maxq * n / Math.max(1, p.L)));
        for (let i = 0; i < n; i++) s += `<rect x="${70 + i * 8}" y="60" width="7" height="26" fill="${i < occ ? 'var(--led)' : 'none'}" stroke="var(--line)"/>`;
        return SV(200, `<rect x="8" y="56" width="54" height="34" rx="6" fill="var(--ice-soft)" stroke="currentColor"/>${tx(35, 77, 'Sensor', 'vizsm', 'text-anchor="middle"')}
          <rect x="238" y="56" width="56" height="34" rx="6" fill="var(--ice-soft)" stroke="currentColor"/>${tx(266, 77, 'Proceso', 'vizsm', 'text-anchor="middle"')}${s}
          ${tx(8, 30, 'Ráfaga de ' + p.b + ' cada s → cola de ' + p.L + ' → saca ' + p.c + '/s', 'vizsm')}${tx(70, 104, 'ocupación máxima: ' + num(o.maxq, 0))}
          ${tx(8, 140, o.lost ? 'Datos perdidos en 10 s: ' + o.lost : 'Ningún dato perdido', 'vizlab', `fill="${okc(!o.lost)}"`)}
          ${tx(8, 164, o.grows ? 'El consumidor es más lento que el productor: ninguna cola basta' : 'La cola absorbe las ráfagas si cabe una entera')}
          ${tx(8, 186, 'xQueueSend con espera 0: si está llena, el dato se pierde')}`);
      }
    },
    // Condición de carrera: dos tareas suman 1000 cada una
    es_race: {
      calc: p => { const f = p.prot >= 2 ? 0 : p.cores ? 0.065 : 0.006, lost = Math.round(2000 * f); return { lost, total: 2000 - lost, ok: lost === 0 ? 1 : 0, bad: lost > 0 ? 1 : 0, volBad: p.prot === 1 && lost > 0 ? 1 : 0 }; },
      svg: (p, o) => {
        const prot = ['nada', 'volatile', 'mutex', 'sección crítica (portMUX)'][p.prot];
        return SV(200, `${tx(10, 22, 'Tarea A y tarea B: contador++ mil veces cada una', 'vizlab')}${tx(10, 42, (p.cores ? 'En núcleos distintos' : 'En el mismo núcleo') + ' · protección: ' + prot)}
          <rect x="10" y="56" width="70" height="22" rx="4" fill="var(--ice-soft)"/>${tx(45, 71, 'leer', 'vizsm', 'text-anchor="middle"')}<rect x="90" y="56" width="70" height="22" rx="4" fill="var(--ice-soft)"/>${tx(125, 71, 'sumar', 'vizsm', 'text-anchor="middle"')}<rect x="170" y="56" width="70" height="22" rx="4" fill="var(--ice-soft)"/>${tx(205, 71, 'escribir', 'vizsm', 'text-anchor="middle"')}
          ${p.prot >= 2 ? '<rect x="6" y="52" width="238" height="30" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' + tx(10, 96, 'en exclusiva: nadie se cuela', 'vizsm', 'fill="var(--ok)"') : tx(10, 96, 'sin protección: se pueden pisar', 'vizsm', 'fill="var(--err)"')}
          ${tx(10, 116, 'Resultado: ' + o.total + ' de 2000', 'vizbig', `fill="${okc(o.ok)}"`)}${tx(10, 140, o.lost ? 'Se han perdido ' + o.lost + ' sumas' : 'No se pierde ninguna suma')}
          ${tx(10, 168, 'Cifras de una ejecución típica: varían en cada prueba')}${tx(10, 186, p.prot === 1 ? 'volatile no hace atómico el ++' : '')}`);
      }
    },
    // Watchdog de tareas y la tarea IDLE del núcleo 0
    es_wdt: {
      calc: p => { const idle = p.cede === 1 || p.busy === 0 ? 1 : 0, trig = !idle && p.cede === 0 && p.busy >= 5 ? 1 : 0; return { idle, trig, fixed: p.busy >= 5 && p.cede === 1 ? 1 : 0, hidden: p.busy >= 5 && p.cede === 2 ? 1 : 0 }; },
      svg: (p, o) => {
        const X = s => 20 + s / 10 * 260; let lane = '';
        if (p.busy) lane += p.cede === 1 ? Array.from({ length: Math.round(p.busy * 4) }, (_, i) => `<rect x="${X(i / 4)}" y="50" width="${X(0.22) - 20}" height="26" fill="var(--led)"/><rect x="${X(i / 4 + 0.22)}" y="50" width="${X(0.03) - 20}" height="26" fill="var(--ok)"/>`).join('') : `<rect x="20" y="50" width="${X(p.busy) - 20}" height="26" fill="var(--led)"/>`;
        lane += `<rect x="${X(p.busy)}" y="50" width="${X(10) - X(p.busy)}" height="26" fill="var(--ok)"/>`;
        return SV(200, `${tx(20, 40, 'Núcleo 0 durante 10 s · naranja: tu tarea · verde: IDLE0', 'vizsm')}${lane}<path d="M${X(5)} 44V84" stroke="var(--err)" stroke-dasharray="3 3"/>${tx(X(5) + 3, 96, '5 s', 'vizsm', 'fill="var(--err)"')}
          ${tx(20, 126, o.trig ? 'task_wdt: Task watchdog got triggered … IDLE0' : o.idle ? 'IDLE0 corre: el watchdog está tranquilo' : 'Sin aviso… pero IDLE0 sigue sin correr', 'vizlab', `fill="${o.trig ? 'var(--err)' : o.idle ? 'var(--ok)' : '#D9A21B'}"`)}
          ${tx(20, 152, ['Bucle sin ceder la CPU', 'vTaskDelay(1) en cada vuelta: cede la CPU', 'Watchdog del núcleo 0 desactivado'][p.cede])}
          ${tx(20, 178, p.cede === 2 ? 'El aviso se calla; el problema sigue ahí' : '')}`);
      }
    },
    // Heap: total libre frente al bloque contiguo mayor
    es_heap: {
      calc: p => { const free = 200 - p.n * 0.4, largest = p.res ? Math.max(8, free - 10) : Math.max(6, 190 - p.n * 3.1); return { free, largest, ok40: largest >= 40 ? 1 : 0 }; },
      svg: (p, o) => {
        let s = '', x = 20; const k = 260 / 200, holes = p.res ? 1 : Math.min(30, Math.round(p.n / 2));
        if (p.res) s = `<rect x="20" y="50" width="${(200 - o.free) * k}" height="30" fill="var(--led)"/>`;
        else for (let i = 0; i < holes; i++) { const used = (200 - o.free) / Math.max(1, holes), w = (200 - (200 - o.free)) / Math.max(1, holes); s += `<rect x="${x}" y="50" width="${used * k}" height="30" fill="var(--led)"/>`; x += (used + w) * k; }
        return SV(200, `${tx(20, 36, 'Heap de 200 KB (naranja: ocupado · gris: libre)', 'vizsm')}<rect x="20" y="50" width="260" height="30" fill="var(--line)"/>${s}<rect x="20" y="50" width="260" height="30" fill="none" stroke="currentColor"/>
          ${tx(20, 110, 'Libre en total: ' + num(o.free, 0) + ' KB', 'vizlab')}${tx(20, 132, 'Bloque contiguo más grande: ' + num(o.largest, 0) + ' KB', 'vizlab', `fill="${okc(o.ok40)}"`)}
          ${tx(20, 158, o.ok40 ? 'malloc(40 000) funciona' : 'malloc(40 000) falla aunque “sobre” memoria')}${tx(20, 182, 'Modelo ilustrativo de fragmentación')}`);
      }
    },
    // Tabla de particiones: ¿cabe la aplicación?
    es_part: {
      calc: p => {
        const S = [['Por defecto (4 MB)', 1280, 1, 1408], ['Huge APP (sin OTA)', 3072, 0, 896], ['Minimal SPIFFS (OTA)', 1920, 1, 192], ['No OTA (2 MB app)', 2048, 0, 1984]][p.s];
        return { app: S[1], ota: S[2], fs: S[3], name: S[0], fits: p.kb <= S[1] ? 1 : 0, fitsOta: p.kb <= S[1] && S[2] ? 1 : 0, huge: p.kb >= 2500 && p.kb <= S[1] ? 1 : 0 };
      },
      svg: (p, o) => {
        const k = 280 / 4096; let x = 10; const seg = (kb, col, lab) => { const w = kb * k; const r = `<rect x="${x}" y="50" width="${w}" height="34" fill="${col}" stroke="var(--surface)"/>${w > 30 ? tx(x + 3, 71, lab, 'vizsm', 'fill="#fff"') : ''}`; x += w; return r; };
        const body = seg(64, '#555', '') + seg(32, '#8E6CC9', 'nvs') + seg(o.app, '#3E8FCB', 'app0') + (o.ota ? seg(o.app, '#2B6A9A', 'app1') : '') + seg(o.fs, 'var(--ok)', 'datos');
        return SV(200, `${tx(10, 24, o.name, 'vizlab')}${tx(10, 42, 'Flash de 4 MB (proporcional)', 'vizsm')}${body}<rect x="10" y="${50 + 34 + 4}" width="${Math.min(280, p.kb * k)}" height="10" fill="${o.fits ? 'var(--led)' : 'var(--err)'}"/>
          ${tx(10, 120, 'Tu programa: ' + num(p.kb, 0) + ' KB · hueco de app: ' + num(o.app, 0) + ' KB', 'vizlab')}
          ${tx(10, 144, o.fits ? (o.ota ? 'Cabe, y conservas la OTA' : 'Cabe, pero sin OTA') : 'Sketch too big: no cabe', 'vizlab', `fill="${okc(o.fits)}"`)}
          ${tx(10, 168, 'Archivos (LittleFS): ' + num(o.fs, 0) + ' KB')}${tx(10, 188, 'Tamaños aproximados de los esquemas de Arduino-ESP32')}`);
      }
    },
    // Desgaste de la flash: escrituras y años de vida
    es_wear: {
      calc: p => { const perDay = p.w * 24 / p.sec, years = 100000 / perDay / 365; return { perDay, years, ten: years >= 10 ? 1 : 0, dead: years < 1 ? 1 : 0 }; },
      svg: (p, o) => SV(200, `${tx(10, 24, p.w + ' borrados/hora en ' + p.sec + (p.sec === 1 ? ' sector' : ' sectores'), 'vizlab')}
        ${tx(10, 46, 'Cada sector: unos 100 000 borrados (orientativo)')}
        ${H.hbar(10, 90, 280, Math.min(1, Math.log10(o.years * 365 + 1) / Math.log10(365 * 50)), o.ten ? 'var(--ok)' : o.dead ? 'var(--err)' : 'var(--led)', 'Vida estimada: ' + (o.years >= 1 ? num(o.years, 1) + ' años' : num(o.years * 365, 0) + ' días'))}
        ${tx(10, 130, 'Borrados por sector y día: ' + num(o.perDay, 1))}${tx(10, 156, 'vida = 100 000 / borrados por sector y día')}${tx(10, 180, 'NVS y LittleFS reparten; tú decides cuánto escribes')}`)
    },
    // LittleFS: cuánto dura el espacio de un registrador
    es_lfs: {
      calc: p => { const perDay = p.b * 1440 / p.cada, days = p.kb * 1000 / perDay; return { perDay, days, month: days >= 30 ? 1 : 0, year: days >= 365 ? 1 : 0 }; },
      svg: (p, o) => SV(200, `${tx(10, 24, 'Partición de datos: ' + num(p.kb, 0) + ' KB', 'vizlab')}${tx(10, 44, 'Una línea de ' + p.b + ' bytes cada ' + p.cada + (p.cada === 1 ? ' minuto' : ' minutos'))}
        ${H.hbar(10, 84, 280, Math.min(1, o.days / 400), o.month ? 'var(--ok)' : 'var(--err)', 'Se llena en ' + (o.days >= 1 ? num(o.days, 1) + ' días' : num(o.days * 24, 1) + ' horas'))}
        ${tx(10, 120, 'Bytes al día: ' + num(o.perDay, 0))}${tx(10, 146, 'días = espacio / bytes escritos al día')}${tx(10, 172, 'Barra: de 0 a 400 días')}`)
    },
    // OTA con dos particiones, otadata y rollback
    es_ota: {
      calc: p => {
        const complete = p.prog >= 100, marked = complete && p.mark ? 1 : 0;
        let boots = 0, rolled = 0;
        if (marked) { if (p.valid) boots = 1; else if (p.rb) { boots = 0; rolled = 1; } else boots = 1; }
        return { boots, rolled, newOk: marked && p.valid ? 1 : 0, cut: !complete ? 1 : 0 };
      },
      svg: (p, o) => SV(200, `<rect x="10" y="30" width="130" height="44" rx="6" fill="${o.boots === 0 ? 'var(--ice-soft)' : 'none'}" stroke="currentColor"/>${tx(75, 50, 'app0: versión 1', 'vizlab', 'text-anchor="middle"')}${tx(75, 66, 'la que funciona', 'vizsm', 'text-anchor="middle"')}
        <rect x="160" y="30" width="130" height="44" rx="6" fill="${o.boots === 1 ? 'var(--ice-soft)' : 'none'}" stroke="currentColor"/><rect x="160" y="78" width="${130 * Math.min(100, p.prog) / 100}" height="6" fill="var(--led)"/>
        ${tx(225, 50, 'app1: versión 2', 'vizlab', 'text-anchor="middle"')}${tx(225, 66, 'descargada ' + p.prog + ' %', 'vizsm', 'text-anchor="middle"')}
        ${tx(10, 108, 'otadata apunta a: ' + (p.prog >= 100 && p.mark ? 'app1' : 'app0') + (p.rb ? ' · rollback activo' : ''), 'vizsm')}
        ${tx(10, 136, 'Tras reiniciar arranca la ' + (o.boots ? 'versión 2' : 'versión 1'), 'vizbig', `fill="${o.boots ? 'var(--ok)' : 'currentColor'}"`)}
        ${tx(10, 162, o.cut ? 'La descarga no terminó: la versión 1 no se ha tocado' : o.rolled ? 'La 2 no se declaró válida: vuelta atrás automática' : o.boots && !p.valid ? 'Sin rollback, la 2 sigue aunque falle' : '')}
        ${tx(10, 186, 'Siempre se escribe en la partición que no está en uso')}`)
    },
    // WiFi: esperar sin límite, con límite o por eventos
    es_reconnect: {
      calc: p => { const block = p.ev ? 0 : p.to === 0 ? p.off : Math.min(p.to, p.off); return { block, ok15: block <= 15 ? 1 : 0, zero: block === 0 && p.off > 0 ? 1 : 0, local: p.ev ? 1 : 0 }; },
      svg: (p, o) => {
        const X = s => 20 + s / 120 * 260;
        return SV(200, `${tx(20, 22, 'Router apagado durante ' + p.off + ' s', 'vizlab')}<rect x="20" y="34" width="${X(p.off) - 20}" height="16" fill="var(--err)" opacity=".5"/>
          ${tx(20, 70, 'Tu programa (medir, mostrar, controlar):', 'vizsm')}<rect x="20" y="78" width="260" height="20" fill="var(--ok)"/><rect x="20" y="78" width="${X(o.block) - 20}" height="20" fill="var(--err)"/>
          ${tx(20, 120, o.block ? 'Bloqueado ' + o.block + ' s esperando al WiFi' : 'Nunca se bloquea: los eventos avisan', 'vizlab', `fill="${okc(o.block <= 15)}"`)}
          ${tx(20, 146, p.ev ? 'WiFi.onEvent + reintentos en segundo plano' : p.to ? 'while con límite de ' + p.to + ' s y plan B' : 'while (WiFi.status() != WL_CONNECTED) sin límite')}${tx(20, 172, 'Escala: 120 s')}`);
      }
    },
    // Cobertura WiFi: potencia, antena, paredes y distancia (modelo interior orientativo)
    es_wifi: {
      calc: p => { const eirp = p.p + p.g, rssi = eirp + 2 - (40 + 25 * Math.log10(Math.max(1, p.d))) - 5 * p.w, legal = eirp <= 20 ? 1 : 0; return { eirp, rssi, legal, good: rssi >= -67 ? 1 : 0, link: rssi >= -80 ? 1 : 0, far: p.d >= 30 && p.w >= 2 && rssi >= -67 && legal ? 1 : 0, mW: 10 ** (p.p / 10) }; },
      svg: (p, o) => {
        let walls = ''; for (let i = 0; i < p.w; i++) walls += `<rect x="${70 + i * 40}" y="40" width="8" height="70" fill="var(--muted)"/>`;
        const col = o.good ? 'var(--ok)' : o.link ? '#D9A21B' : 'var(--err)';
        return SV(200, `<circle cx="30" cy="75" r="10" fill="var(--led)" class="a-pulse"/>${tx(30, 104, 'ESP32', 'vizsm', 'text-anchor="middle"')}${walls}
          <path d="M260 60l10 15l10 -15M270 75V100" stroke="currentColor" stroke-width="2" fill="none"/>${tx(270, 116, 'router', 'vizsm', 'text-anchor="middle"')}${tx(150, 30, num(p.d, 0) + ' m', 'vizsm', 'text-anchor="middle"')}
          ${tx(10, 138, num(p.p, 1) + ' dBm (' + num(o.mW, o.mW < 10 ? 1 : 0) + ' mW) + ' + p.g + ' dBi = PIRE ' + num(o.eirp, 1) + ' dBm', 'vizsm')}
          ${tx(10, 160, o.legal ? 'Legal en Europa (≤ 20 dBm de PIRE)' : '¡Ilegal! Más de 20 dBm de PIRE', 'vizlab', `fill="${okc(o.legal)}"`)}
          ${tx(10, 184, 'RSSI ≈ ' + num(o.rssi, 0) + ' dBm · ' + (o.good ? 'va bien' : o.link ? 'justo, pierde paquetes' : 'sin enlace fiable'), 'vizlab', `fill="${col}"`)}${tx(10, 198, 'Modelo interior orientativo: 5 dB por pared', 'vizsm', 'style="font-size:9px"')}`);
      }
    },
    // Servidor síncrono: lo que tarda en contestar según loop()
    es_http: {
      calc: p => { const dead = p.hc ? 0 : 1, lat = dead ? 1e9 : p.d + 5; return { dead, lat, fast: !dead && lat <= 50 ? 1 : 0 }; },
      svg: (p, o) => SV(200, `${tx(10, 22, 'loop(): ' + (p.hc ? 'server.handleClient(); ' : '') + (p.d ? 'delay(' + p.d + ');' : ''), 'vizlab')}
        <circle cx="150" cy="86" r="44" fill="none" stroke="var(--line)" stroke-width="10"/><path d="M150 42A44 44 0 0 1 ${150 + 44 * Math.sin(Math.min(6.2, (p.d + 5) / 400))} ${86 - 44 * Math.cos(Math.min(6.2, (p.d + 5) / 400))}" fill="none" stroke="var(--led)" stroke-width="10"/>
        ${tx(150, 90, p.d + 5 + ' ms', 'vizlab', 'text-anchor="middle"')}${tx(150, 146, 'una vuelta de loop()', 'vizsm', 'text-anchor="middle"')}
        ${tx(10, 174, o.dead ? 'Nadie atiende: el navegador espera para siempre' : 'Respuesta más lenta: unos ' + o.lat + ' ms', 'vizlab', `fill="${okc(!o.dead && o.lat <= 200)}"`)}${tx(10, 192, 'Cada petición espera a la siguiente llamada a handleClient()')}`)
    },
    // HTTP consultando frente a WebSocket
    es_poll: {
      calc: p => { const req = p.ws ? 0 : 1000 / p.iv * p.cl, msgs = p.ws ? p.ch * p.cl : req, delay = p.ws ? 5 : p.iv / 2; return { req, msgs, delay, quiet: req === 0 && delay <= 10 ? 1 : 0, heavy: req >= 30 ? 1 : 0 }; },
      svg: (p, o) => SV(200, `${tx(10, 22, p.ws ? 'WebSocket: conexión abierta, el ESP32 empuja' : 'HTTP: cada móvil pregunta cada ' + p.iv + ' ms', 'vizlab')}
        ${Array.from({ length: p.cl }, (_, i) => `<rect x="${12 + i * 26}" y="40" width="18" height="30" rx="4" fill="var(--ice-soft)" stroke="currentColor"/>`).join('')}<rect x="240" y="40" width="50" height="30" rx="4" fill="var(--led)"/>${tx(265, 59, 'ESP32', 'vizsm', 'text-anchor="middle" fill="#fff"')}
        ${H.hbar(10, 104, 280, Math.min(1, o.msgs / 60), o.req ? 'var(--err)' : 'var(--ok)', (p.ws ? 'Mensajes' : 'Peticiones') + ' por segundo: ' + num(o.msgs, 1))}
        ${tx(10, 140, 'Retraso medio en ver un cambio: ' + num(o.delay, 0) + ' ms', 'vizlab')}${tx(10, 164, 'La temperatura cambia ' + p.ch + ' vez/veces por segundo')}${tx(10, 186, p.ws ? 'Solo viaja algo cuando cambia' : 'Se pregunta aunque no cambie nada')}`)
    },
    // Hora oficial en 2026: península o Canarias, con cambio de verano
    es_tz: {
      calc: p => { const dst = p.day >= 88 && p.day < 298 ? 1 : 0, off = (p.z ? 0 : 1) + dst; return { dst, off, summer: dst && !p.z ? 1 : 0, canWinter: p.z && !dst ? 1 : 0 }; },
      svg: (p, o) => {
        const d = new Date(Date.UTC(2026, 0, p.day)), M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getUTCMonth()];
        const X = n => 10 + n / 365 * 280;
        return SV(200, `<rect x="10" y="40" width="280" height="20" fill="var(--ice-soft)"/><rect x="${X(88)}" y="40" width="${X(298) - X(88)}" height="20" fill="var(--led)" opacity=".6"/><path d="M${X(p.day)} 34V66" stroke="currentColor" stroke-width="3"/>
          ${tx(X(88), 78, '29 mar', 'vizsm', 'text-anchor="middle"')}${tx(X(298), 78, '25 oct', 'vizsm', 'text-anchor="middle"')}${tx(10, 28, 'Año 2026 · franja naranja: horario de verano', 'vizsm')}
          ${tx(10, 108, d.getUTCDate() + ' de ' + M + ' · ' + (p.z ? 'Canarias' : 'Península y Baleares'), 'vizlab')}
          ${tx(10, 134, 'Hora local = UTC + ' + o.off + ' (' + (p.z ? (o.dst ? 'WEST' : 'WET') : (o.dst ? 'CEST' : 'CET')) + ')', 'vizbig')}
          ${tx(10, 162, p.z ? 'WET0WEST,M3.5.0/1,M10.5.0' : 'CET-1CEST,M3.5.0,M10.5.0/3', 'vizsm')}${tx(10, 184, 'M3.5.0 = último domingo de marzo')}`);
      }
    },
    // Anuncio BLE: 31 bytes que hay que repartir
    es_adv: {
      calc: p => { const used = 3 + (p.nm ? 2 + p.nm : 0) + (p.uuid ? 18 : 0) + (p.md ? 4 + p.md : 0); return { used, fits: used <= 31 ? 1 : 0, perH: 3600000 / p.iv, both: p.nm >= 6 && p.uuid && used <= 31 ? 1 : 0, temp: p.uuid && p.md >= 2 && used <= 31 ? 1 : 0 }; },
      svg: (p, o) => {
        let x = 10; const k = 280 / 40; const seg = (n, col, lab) => { if (!n) return ''; const w = n * k, r = `<rect x="${x}" y="40" width="${w}" height="30" fill="${col}" stroke="var(--surface)"/>${w > 26 ? tx(x + 2, 59, lab, 'vizsm', 'fill="#fff"') : ''}`; x += w; return r; };
        const body = seg(3, '#555', 'flags') + seg(p.nm ? 2 + p.nm : 0, '#3E8FCB', 'nombre') + seg(p.uuid ? 18 : 0, '#8E6CC9', 'UUID 128') + seg(p.md ? 4 + p.md : 0, 'var(--ok)', 'fabricante');
        return SV(200, `${tx(10, 28, 'Anuncio: ' + o.used + ' de 31 bytes', 'vizlab', `fill="${okc(o.fits)}"`)}<rect x="10" y="40" width="${31 * k}" height="30" fill="none" stroke="currentColor" stroke-dasharray="4 3"/>${body}
          <path d="M${10 + 31 * k} 34V76" stroke="var(--err)"/>${tx(14 + 31 * k, 90, '31', 'vizsm', 'fill="var(--err)"')}
          ${tx(10, 112, 'Cada campo: 1 byte de longitud + 1 de tipo + datos')}${tx(10, 132, 'Datos de fabricante: 2 bytes de empresa + tus datos')}
          ${tx(10, 160, 'Cada ' + p.iv + ' ms → ' + num(o.perH, 0) + ' anuncios por hora', 'vizlab')}${tx(10, 184, o.fits ? 'Cabe en un anuncio clásico' : 'No cabe: recorta o usa la respuesta de escaneo')}`);
      }
    },
    // GATT: paquetes según la MTU
    es_gatt: {
      calc: p => { const pay = p.mtu - 3, pk = Math.ceil(p.bytes / pay); return { pay, pk, few: p.bytes >= 2000 && pk <= 20 ? 1 : 0 }; },
      svg: (p, o) => {
        let s = ''; const n = Math.min(o.pk, 60); for (let i = 0; i < n; i++) s += `<rect x="${10 + (i % 30) * 9.3}" y="${50 + Math.floor(i / 30) * 18}" width="8" height="14" fill="var(--led)"/>`;
        return SV(200, `${tx(10, 24, p.bytes + ' bytes · MTU ' + p.mtu + ' → ' + o.pay + ' útiles/paquete', 'vizlab')}${s}${o.pk > 60 ? tx(10, 104, '… (' + o.pk + ' en total)', 'vizsm') : ''}
          ${tx(10, 132, 'Paquetes: ' + o.pk, 'vizbig')}${tx(10, 156, 'útiles = MTU − 3 (cabecera ATT)')}${tx(10, 178, 'La MTU se negocia al conectar; 23 si nadie pide más')}`);
      }
    },
    // ESP-NOW: failsafe frente a paradas en falso
    es_espnow: {
      calc: p => { const k = Math.max(1, Math.floor(p.to / p.per)), pl = p.loss / 100, falsePerMin = 60000 / p.per * pl ** k; return { k, falsePerMin, react: p.to, good: p.to <= 400 && falsePerMin < 0.1 ? 1 : 0, slow: p.to > 1000 ? 1 : 0 }; },
      svg: (p, o) => SV(200, `${tx(10, 22, 'Un paquete cada ' + p.per + ' ms · pérdidas ' + p.loss + ' %', 'vizlab')}
        ${Array.from({ length: 28 }, (_, i) => `<rect x="${10 + i * 10}" y="36" width="6" height="18" fill="${(i * 7919 % 100) < p.loss ? 'none' : 'var(--led)'}" stroke="var(--line)"/>`).join('')}
        ${tx(10, 80, 'Failsafe a ' + p.to + ' ms: ' + o.k + ' perdidos seguidos')}
        ${tx(10, 108, 'Si el mando muere, el coche para en ' + p.to + ' ms', 'vizlab', `fill="${okc(p.to <= 400)}"`)}
        ${tx(10, 132, 'Paradas en falso: ' + (o.falsePerMin >= 0.01 ? num(o.falsePerMin, 2) : '< 0,01') + ' por minuto', 'vizlab', `fill="${okc(o.falsePerMin < 0.1)}"`)}
        ${tx(10, 158, 'Ventana larga: pocas paradas en falso, reacción lenta')}${tx(10, 178, 'Ventana corta: reacción rápida, más paradas en falso')}`)
    },
    // El multímetro en serie: caída en su resistencia y resolución
    es_burden: {
      calc: p => { const R = [[1000, 0.1, '200 µA'], [100, 1, '2 mA'], [10, 10, '20 mA'], [1, 100, '200 mA'], [0.01, 10000, '10 A']][p.r]; const drop = p.pk / 1000 * R[0], vchip = Math.max(0, 3.3 - drop); return { R: R[0], res: R[1], lab: R[2], drop, vchip, survive: vchip >= 3.0 ? 1 : 0, readable: R[1] <= 1 ? 1 : 0 }; },
      svg: (p, o) => SV(200, `<rect x="110" y="20" width="80" height="50" rx="8" fill="var(--ice-soft)" stroke="currentColor"/>${tx(150, 42, 'rango ' + o.lab, 'vizlab', 'text-anchor="middle"')}${tx(150, 60, 'shunt ≈ ' + (o.R >= 1 ? num(o.R, 0) : num(o.R, 2)) + ' Ω', 'vizsm', 'text-anchor="middle"')}
        <path d="M20 45H110M190 45H280" stroke="currentColor" stroke-width="2"/>${tx(20, 36, '3,3 V', 'vizsm')}${tx(280, 36, 'ESP32', 'vizsm', 'text-anchor="end"')}
        ${tx(10, 100, 'Al despertar (pico de ' + p.pk + ' mA): caen ' + (o.drop >= 0.1 ? num(o.drop, 1) : num(o.drop * 1000, 0) + ' m') + 'V en el shunt', 'vizsm')}
        ${tx(10, 122, 'El chip recibe ' + num(o.vchip, 2) + ' V · ' + (o.survive ? 'aguanta' : '¡brownout y reinicio!'), 'vizlab', `fill="${okc(o.survive)}"`)}
        ${tx(10, 150, 'Dormido (10 µA) el display muestra ' + (o.readable ? num(10, 1) + ' µA' : o.res >= 1000 ? '0,00 A' : '0,0' + (o.res >= 100 ? '' : '1') + ' mA'), 'vizsm')}
        ${tx(10, 172, o.readable ? 'Resolución suficiente para el sueño' : 'Resolución de ' + (o.res >= 1000 ? num(o.res / 1000, 0) + ' mA' : num(o.res, 0) + ' µA') + ': el sueño no se ve', 'vizlab', `fill="${okc(o.readable)}"`)}
        ${tx(10, 192, 'Valores de shunt orientativos: mira el manual del tuyo')}`)
    },
    // Balance solar en invierno (modelo sencillo)
    es_solar: {
      calc: p => { const gain = p.w * 1000 / 5 * p.h * 0.7, need = p.mah, bal = gain - need, auto = p.bat / Math.max(1, need); return { gain, need, bal, auto, pos: bal > 0 ? 1 : 0, five: bal > 0 && auto >= 5 ? 1 : 0 }; },
      svg: (p, o) => SV(200, `${tx(10, 22, 'Un día de invierno: ' + num(p.h, 1) + ' horas de sol útil', 'vizlab')}
        ${H.hbar(10, 58, 280, Math.min(1, o.gain / 3000), 'var(--led)', 'Entra del panel de ' + num(p.w, 1) + ' W: ≈ ' + num(o.gain, 0) + ' mAh')}
        ${H.hbar(10, 94, 280, Math.min(1, o.need / 3000), '#3E8FCB', 'Gasta el nodo: ' + num(o.need, 0) + ' mAh al día')}
        ${tx(10, 126, 'Balance diario: ' + (o.bal >= 0 ? '+' : '') + num(o.bal, 0) + ' mAh', 'vizlab', `fill="${okc(o.pos)}"`)}${tx(10, 150, 'Días sin sol que aguanta la batería: ' + num(o.auto, 1), 'vizlab', `fill="${okc(o.auto >= 5)}"`)}
        ${tx(10, 174, 'Modelo: panel a 5 V, 70 % de rendimiento de carga')}${tx(10, 190, 'Y nunca cargar el litio por debajo de 0 °C')}`)
    },
    // Ticks de FreeRTOS: vTaskDelay(n) frente a pdMS_TO_TICKS
    es_tick: {
      calc: p => { const tickMs = 1000 / p.tick, ticks = p.m ? Math.max(1, Math.round(p.v / tickMs)) : p.v, ms = ticks * tickMs; return { ticks, ms, tickMs, d100: p.tick === 100 && !p.m && ms === p.v * 10 && p.v === 10 ? 1 : 0, fixed: p.tick === 100 && p.m && ms === 10 ? 1 : 0 }; },
      svg: (p, o) => {
        let s = ''; const n = Math.min(40, Math.round(200 / o.tickMs)); for (let i = 0; i <= n; i++) s += `<path d="M${10 + i * 280 / n} 60V70" stroke="var(--muted)"/>`;
        return SV(200, `${tx(10, 22, 'Tick de ' + p.tick + ' Hz: un tick = ' + o.tickMs + ' ms', 'vizlab')}<path d="M10 70H290" stroke="currentColor"/>${s}${tx(10, 50, 'Escala: 200 ms', 'vizsm')}
          <rect x="10" y="78" width="${Math.min(280, o.ms / 200 * 280)}" height="16" fill="var(--led)"/>
          ${tx(10, 122, (p.m ? 'vTaskDelay(pdMS_TO_TICKS(' + p.v + '))' : 'vTaskDelay(' + p.v + ')') + ' → ' + o.ticks + ' ticks', 'vizlab')}
          ${tx(10, 148, 'Espera real: ' + num(o.ms, 0) + ' ms', 'vizbig')}${tx(10, 174, 'pdMS_TO_TICKS convierte ms en ticks según el tick')}`);
      }
    },
    // ESP-IDF: un error previsible, ¿abortar o tratarlo?
    es_err: {
      calc: p => { const err = p.e > 0, loop = err && p.mode === 0 ? 1 : 0, rec = err && p.mode === 1 ? 1 : 0; return { loop, rec, ok: !err ? 1 : 0 }; },
      svg: (p, o) => {
        const e = ['ESP_OK', 'ESP_ERR_NVS_NO_FREE_PAGES', 'ESP_ERR_NVS_NEW_VERSION_FOUND'][p.e];
        return SV(200, `${tx(10, 22, 'nvs_flash_init() devuelve ' + e, 'vizlab')}${tx(10, 44, p.mode ? 'Código: si es uno de esos dos, nvs_flash_erase() y reintentar' : 'Código: ESP_ERROR_CHECK(nvs_flash_init());', 'vizsm')}
          ${o.loop ? '<path d="M150 80a24 24 0 1 1 -1 0" fill="none" stroke="var(--err)" stroke-width="5" class="a-spin"/>' : `<circle cx="150" cy="104" r="24" fill="${o.rec ? 'var(--ok)' : 'var(--ice-soft)'}"/>`}
          ${tx(10, 154, o.loop ? 'abort() → reinicio → mismo error → reinicio…' : o.rec ? 'Borra la NVS, reintenta y sigue funcionando' : 'Todo bien: sigue el arranque', 'vizlab', `fill="${o.loop ? 'var(--err)' : 'var(--ok)'}"`)}
          ${tx(10, 180, 'ESP_ERROR_CHECK: para lo que no debería pasar nunca')}`);
      }
    }
  });
  Object.assign(Widgets.VIZ, {
    // Picos de la radio: fuente, cable y condensador junto al módulo (modelo sencillo de 1 ms)
    es_supply: {
      calc: p => {
        const pk = 240, vreg = Math.min(3.3, 5 - pk * p.r / 1000 - 1.2), def = Math.max(0, pk - p.src);
        const dv = def ? (p.c ? def / p.c : 3) : 0, vmin = Math.max(0, vreg - dv), ok = vmin >= 3.0 ? 1 : 0;
        return { vmin, ok, dv, okNoCap: ok && p.c === 0 ? 1 : 0, okWeak: ok && p.src <= 200 ? 1 : 0 };
      },
      svg: (p, o) => {
        const Y = v => 150 - (v - 2) / 1.5 * 110, dip = Math.max(Y(o.vmin), 40);
        return SV(200, `<path d="M20 30V150H290" stroke="currentColor" fill="none"/><path d="M20 ${Y(3)}H290" stroke="var(--err)" stroke-dasharray="4 3"/>${tx(288, Y(3) - 4, '3,0 V: mínimo del módulo', 'vizsm', 'text-anchor="end" fill="var(--err)"')}
          <path d="M20 ${Y(3.3)}H110L120 ${Math.min(150, Y(o.vmin))}H170L182 ${Y(3.3)}H290" fill="none" stroke="${okc(o.ok)}" stroke-width="2.5"/>${tx(24, Y(3.3) - 6, '3,3 V')}
          ${tx(122, Math.min(146, Y(o.vmin)) + (o.vmin < 2.2 ? -6 : 14), 'mínimo ' + num(o.vmin, 2) + ' V', 'vizlab', `fill="${okc(o.ok)}"`)}${tx(118, 26, 'pico de 240 mA durante 1 ms', 'vizsm')}
          ${tx(20, 174, 'Fuente ' + p.src + ' mA · condensador ' + p.c + ' µF')}
          ${tx(20, 194, o.ok ? 'Aguanta el pico' : 'Brownout: el chip se reinicia', 'vizlab', `fill="${okc(o.ok)}"`)}`);
      }
    },
    // La matriz GPIO: periféricos digitales a casi cualquier pin; lo analógico, fijo
    es_matrix: {
      calc: p => {
        const g = p.pin, digOk = !has('flash', g) && !(has('inOnly', g) && p.per !== 3), ok = p.per === 3 ? has('adc1', g) || has('adc2', g) : digOk;
        return { ok: ok ? 1 : 0, sda16: p.per === 0 && g === 16 ? 1 : 0, adcFail: p.per === 3 && !ok ? 1 : 0, adcOk: p.per === 3 && ok ? 1 : 0 };
      },
      svg: (p, o) => {
        const P = ['I²C SDA', 'UART2 TX', 'PWM (LEDC)', 'ADC'], ys = [40, 70, 100, 130];
        let s = ''; P.forEach((n, i) => { const on = i === p.per; s += `<rect x="8" y="${ys[i] - 12}" width="84" height="22" rx="5" fill="${on ? 'var(--led)' : 'var(--ice-soft)'}"/>${tx(50, ys[i] + 3, n, 'vizsm', `text-anchor="middle" ${on ? 'fill="#fff"' : ''}`)}`; });
        for (let i = 0; i < 6; i++) s += `<path d="M${110 + i * 16} 24V146M100 ${30 + i * 22}H200" stroke="var(--line)"/>`;
        const y = ys[p.per];
        s += p.per === 3 ? `<path d="M92 ${y}H100" stroke="currentColor" stroke-width="2"/>${tx(104, y + 4, o.ok ? 'pista fija' : 'sin conexión', 'vizsm', `fill="${okc(o.ok)}"`)}` : `<path d="M92 ${y}H150V85H240" fill="none" stroke="${okc(o.ok)}" stroke-width="2.5" ${o.ok ? 'class="a-flow"' : ''}/>`;
        if (p.per === 3 && o.ok) s += `<path d="M160 ${y}Q200 ${y} 240 85" fill="none" stroke="var(--ok)" stroke-width="2.5" class="a-flow"/>`;
        return SV(200, `${tx(108, 18, 'matriz GPIO', 'vizsm')}${s}<rect x="240" y="66" width="52" height="38" rx="6" fill="var(--ice-soft)" stroke="currentColor"/>${tx(266, 82, 'GPIO', 'vizsm', 'text-anchor="middle"')}${tx(266, 98, p.pin, 'vizlab', 'text-anchor="middle"')}
          ${tx(8, 174, o.ok ? P[p.per] + ' sale por el GPIO ' + p.pin : P[p.per] + ' no puede ir al GPIO ' + p.pin, 'vizlab', `fill="${okc(o.ok)}"`)}
          ${tx(8, 194, p.per === 3 ? 'Lo analógico no pasa por la matriz: va a sus pines' : 'Lo digital se enruta por la matriz (salvo la flash)')}`);
      }
    }
  });
  { const b = Widgets.VIZ.es_sleep.calc; Widgets.VIZ.es_sleep.calc = p => { const o = b(p); o.ta = p.ta; o.Is = p.Is; return o; }; }
  // El ADC necesita saber también cuándo te sales por arriba o por abajo
  { const base = Widgets.VIZ.es_adc.calc; Widgets.VIZ.es_adc.calc = p => { const o = base(p); o.over = p.V > o.hi ? 1 : 0; o.under = p.V < o.lo ? 1 : 0; return o; }; }

  /* ===================== PROGRAMAS DEL ESP32 (modelos de comportamiento) =====================
     Cada run() reproduce la lógica del código mostrado. TEL es la “telemetría” que el programa
     anota mientras corre (como si imprimiera por Serial); los retos la leen para comprobar
     que el circuito responde de verdad (pulsadores leídos, rango del ADC recorrido…). */
  const TEL = {};
  const tel = () => { for (const k of Object.keys(TEL)) delete TEL[k]; return TEL; };

  Object.assign(ESP_SKETCHES, {
    es_knight: { name: 'Coche fantástico (6 LED)', code: `// Barrido de ida y vuelta con 6 LED
// Evitamos el GPIO12: es pin de arranque
const int LEDS[] = {13, 14, 27, 26, 25, 33};
const int N = 6;

void setup() {
  for (int i = 0; i < N; i++) pinMode(LEDS[i], OUTPUT);
}

void enciende(int i) {
  digitalWrite(LEDS[i], HIGH);
  delay(90);
  digitalWrite(LEDS[i], LOW);
}

void loop() {
  for (int i = 0; i < N - 1; i++) enciende(i);   // ida: 0..4
  for (int i = N - 1; i > 0; i--) enciende(i);   // vuelta: 5..1
}`, run: function* (io) {
      tel(); const L = ['D13', 'D14', 'D27', 'D26', 'D25', 'D33']; L.forEach(p => io.mode(p, 'out'));
      const on = function* (i) { io.write(L[i], 1); yield 90; io.write(L[i], 0); };
      for (;;) { for (let i = 0; i < 5; i++) yield* on(i); for (let i = 5; i > 0; i--) yield* on(i); }
    } },

    es_binario: { name: 'Contador binario (4 bits)', code: `// Cuenta de 0 a 15 en binario con 4 LED
const int BITS[] = {25, 26, 27, 14};   // bit 0 (menos peso) ... bit 3
byte cuenta = 0;

void setup() {
  for (int i = 0; i < 4; i++) pinMode(BITS[i], OUTPUT);
}

void loop() {
  for (int i = 0; i < 4; i++) digitalWrite(BITS[i], bitRead(cuenta, i));
  cuenta = (cuenta + 1) % 16;
  delay(500);
}`, run: function* (io) {
      tel(); const B = ['D25', 'D26', 'D27', 'D14']; B.forEach(p => io.mode(p, 'out')); let c = 0;
      for (;;) { B.forEach((p, i) => io.write(p, (c >> i) & 1)); c = (c + 1) % 16; yield 500; }
    } },

    es_vumetro: { name: 'Barra de nivel (GPIO34 → 5 LED)', code: `// Potenciómetro en el GPIO34 (ADC1) y barra de 5 LED
const int LEDS[] = {13, 14, 27, 26, 25};

void setup() {
  for (int i = 0; i < 5; i++) pinMode(LEDS[i], OUTPUT);
}

void loop() {
  int lectura = analogRead(34);        // 0..4095
  int n = lectura * 6 / 4096;          // 0..5 LED encendidos
  for (int i = 0; i < 5; i++) digitalWrite(LEDS[i], i < n ? HIGH : LOW);
  delay(20);
}`, run: function* (io) {
      const T = tel(); T.min = 4095; T.max = 0; const L = ['D13', 'D14', 'D27', 'D26', 'D25']; L.forEach(p => io.mode(p, 'out'));
      for (;;) { const r = io.aread('D34'); T.min = Math.min(T.min, r); T.max = Math.max(T.max, r); const n = Math.floor(r * 6 / 4096); L.forEach((p, i) => io.write(p, i < n ? 1 : 0)); yield 20; }
    } },

    es_nocturna: { name: 'Luz nocturna con histéresis (GPIO34 → 25)', code: `// LDR abajo y 10 kΩ arriba: a oscuras la tensión sube
const int SENSOR = 34, LED = 25;
const int ENCENDER = 3000;   // por encima: es de noche
const int APAGAR = 2500;     // por debajo: es de día
bool encendido = false;

void setup() {
  pinMode(LED, OUTPUT);
}

void loop() {
  int luz = analogRead(SENSOR);
  if (!encendido && luz > ENCENDER) encendido = true;
  if (encendido && luz < APAGAR) encendido = false;
  // entre 2500 y 3000 no cambia nada: histéresis
  digitalWrite(LED, encendido);
  delay(50);
}`, run: function* (io) {
      const T = tel(); T.min = 4095; T.max = 0; T.on = 0; T.off = 0; io.mode('D25', 'out'); let e = false;
      for (;;) { const r = io.aread('D34'); T.min = Math.min(T.min, r); T.max = Math.max(T.max, r); if (!e && r > 3000) { e = true; T.on++; } if (e && r < 2500) { e = false; T.off++; } io.write('D25', e ? 1 : 0); yield 50; }
    } },

    es_ledc2: { name: 'Fundido en contrafase con LEDC (18 y 19)', code: `// Arduino-ESP32 3.x: ledcAttach(pin, frecuencia, bits)
const int A = 18, B = 19;

void setup() {
  ledcAttach(A, 5000, 10);   // 5 kHz, 10 bits (0..1023)
  ledcAttach(B, 5000, 10);
}

void loop() {
  for (int d = 0; d <= 1023; d += 16) {
    ledcWrite(A, d);
    ledcWrite(B, 1023 - d);
    delay(15);
  }
  for (int d = 1023; d >= 0; d -= 16) {
    ledcWrite(A, d);
    ledcWrite(B, 1023 - d);
    delay(15);
  }
}`, run: function* (io) {
      tel(); io.mode('D18', 'out'); io.mode('D19', 'out');
      for (;;) { for (let d = 0; d <= 1023; d += 16) { io.pwm('D18', d / 1023); io.pwm('D19', (1023 - d) / 1023); yield 15; } for (let d = 1023; d >= 0; d -= 16) { io.pwm('D18', d / 1023); io.pwm('D19', (1023 - d) / 1023); yield 15; } }
    } },

    es_toggle: { name: 'Pulsador que conmuta, con antirrebote (4 → 23)', code: `// Cada pulsación cambia el LED. Antirrebote con millis().
const int BOTON = 4, LED = 23;
const unsigned long REBOTE = 30;      // ms que la lectura debe estar quieta
bool estadoLed = false;
bool ultimo = HIGH, estable = HIGH;
unsigned long tCambio = 0;

void setup() {
  pinMode(BOTON, INPUT_PULLUP);
  pinMode(LED, OUTPUT);
}

void loop() {
  bool lectura = digitalRead(BOTON);
  if (lectura != ultimo) {            // algo se mueve: reinicia el reloj
    tCambio = millis();
    ultimo = lectura;
  }
  if (millis() - tCambio > REBOTE && lectura != estable) {
    estable = lectura;                // lleva 30 ms quieta: cambio real
    if (estable == LOW) {             // flanco de bajada = se acaba de pulsar
      estadoLed = !estadoLed;
      digitalWrite(LED, estadoLed);
    }
  }
}`, run: function* (io) {
      const T = tel(); T.presses = 0; io.mode('D4', 'pullup'); io.mode('D23', 'out');
      let led = false, ultimo = 1, estable = 1, tc = 0, ms = 0;
      for (;;) {
        const r = io.read('D4');
        if (r !== ultimo) { tc = ms; ultimo = r; }
        if (ms - tc > 30 && r !== estable) { estable = r; if (estable === 0) { led = !led; T.presses++; io.write('D23', led ? 1 : 0); } }
        yield 1; ms += 1;
      }
    } },

    es_estados: { name: 'Máquina de estados: 4 modos (4 → 18)', code: `// Cada pulsación pasa al siguiente modo
enum Modo { APAGADO, FIJO, PARPADEO, RESPIRA };
Modo modo = APAGADO;
const int BOTON = 4, LED = 18;
bool antes = HIGH;
unsigned long t0 = 0;

void setup() {
  pinMode(BOTON, INPUT_PULLUP);
  ledcAttach(LED, 1000, 8);          // PWM de 1 kHz y 8 bits
}

void loop() {
  bool ahora = digitalRead(BOTON);
  if (antes == HIGH && ahora == LOW) {           // flanco: siguiente modo
    modo = (Modo)((modo + 1) % 4);
    t0 = millis();
    delay(30);                                   // antirrebote sencillo
  }
  antes = ahora;
  unsigned long t = millis() - t0;
  switch (modo) {
    case APAGADO:  ledcWrite(LED, 0); break;
    case FIJO:     ledcWrite(LED, 255); break;
    case PARPADEO: ledcWrite(LED, (t / 250) % 2 ? 0 : 255); break;
    case RESPIRA: {
      int f = (t / 8) % 510;                     // sube 0..254 y baja 255..0
      ledcWrite(LED, f < 255 ? f : 509 - f);
      break;
    }
  }
}`, run: function* (io) {
      const T = tel(); T.seen = [true, false, false, false]; io.mode('D4', 'pullup'); io.mode('D18', 'out');
      let modo = 0, antes = 1, t0 = 0, ms = 0;
      for (;;) {
        const ahora = io.read('D4');
        if (antes === 1 && ahora === 0) { modo = (modo + 1) % 4; T.seen[modo] = true; t0 = ms; yield 30; ms += 30; }
        antes = ahora; const t = ms - t0;
        if (modo === 0) io.pwm('D18', 0); else if (modo === 1) io.pwm('D18', 1);
        else if (modo === 2) io.pwm('D18', Math.floor(t / 250) % 2 ? 0 : 1);
        else { const f = Math.floor(t / 8) % 510; io.pwm('D18', (f < 255 ? f : 509 - f) / 255); }
        yield 1; ms += 1;
      }
    } },

    es_rtos: { name: 'Dos tareas FreeRTOS (25 parpadea · 4 → 26)', code: `// Dos tareas independientes, cada una en un núcleo
const int LED_A = 25, LED_B = 26, BOTON = 4;

void tareaParpadeo(void *arg) {
  pinMode(LED_A, OUTPUT);
  bool on = false;
  for (;;) {
    on = !on;
    digitalWrite(LED_A, on);
    vTaskDelay(pdMS_TO_TICKS(500));      // bloquea: cede la CPU
  }
}

void tareaBoton(void *arg) {
  pinMode(LED_B, OUTPUT);
  pinMode(BOTON, INPUT_PULLUP);
  bool antes = HIGH, estado = false;
  for (;;) {
    bool ahora = digitalRead(BOTON);
    if (antes == HIGH && ahora == LOW) {
      estado = !estado;
      digitalWrite(LED_B, estado);
      vTaskDelay(pdMS_TO_TICKS(30));     // antirrebote
    }
    antes = ahora;
    vTaskDelay(pdMS_TO_TICKS(5));        // sondea cada 5 ms
  }
}

void setup() {
  xTaskCreatePinnedToCore(tareaParpadeo, "parpadeo", 2048, NULL, 1, NULL, 0);
  xTaskCreatePinnedToCore(tareaBoton, "boton", 2048, NULL, 2, NULL, 1);
}

void loop() {
  vTaskDelete(NULL);   // no necesitamos loop(): borramos su tarea
}`, run: function* (io) {
      const T = tel(); T.presses = 0; io.mode('D25', 'out'); io.mode('D26', 'out'); io.mode('D4', 'pullup');
      let a = false, nextA = 0, antes = 1, b = false, nextB = 0, ms = 0;
      for (;;) {
        if (ms >= nextA) { a = !a; io.write('D25', a ? 1 : 0); nextA = ms + 500; }
        if (ms >= nextB) { const ahora = io.read('D4'); if (antes === 1 && ahora === 0) { b = !b; T.presses++; io.write('D26', b ? 1 : 0); nextB = ms + 35; } else nextB = ms + 5; antes = ahora; }
        yield 5; ms += 5;
      }
    } },

    es_peaton: { name: 'Semáforo con pulsador de peatón (interrupción)', code: `// Coches: verde 27, ámbar 26, rojo 25. Peatón: verde 33. Botón: 4.
const int VERDE = 27, AMBAR = 26, ROJO = 25, PEATON = 33, BOTON = 4;
volatile bool peticion = false;

void IRAM_ATTR alPulsar() {          // ISR: solo apunta la petición
  peticion = true;
}

void setup() {
  pinMode(VERDE, OUTPUT); pinMode(AMBAR, OUTPUT);
  pinMode(ROJO, OUTPUT);  pinMode(PEATON, OUTPUT);
  pinMode(BOTON, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(BOTON), alPulsar, FALLING);
  digitalWrite(VERDE, HIGH);
}

void loop() {
  if (!peticion) return;             // los coches siguen en verde
  delay(2000);                       // verde mínimo antes de cambiar
  digitalWrite(VERDE, LOW);  digitalWrite(AMBAR, HIGH);
  delay(2000);
  digitalWrite(AMBAR, LOW);  digitalWrite(ROJO, HIGH);
  digitalWrite(PEATON, HIGH);
  delay(5000);
  for (int i = 0; i < 6; i++) {      // aviso: el verde del peatón parpadea
    digitalWrite(PEATON, i % 2 == 0 ? LOW : HIGH);
    delay(300);
  }
  digitalWrite(PEATON, LOW); digitalWrite(ROJO, LOW);
  digitalWrite(VERDE, HIGH);
  peticion = false;                  // lo pulsado durante el ciclo se ignora
}`, run: function* (io) {
      const T = tel(); T.cycles = 0; ['D27', 'D26', 'D25', 'D33'].forEach(p => io.mode(p, 'out')); io.mode('D4', 'pullup');
      io.write('D27', 1); let antes = 1;
      for (;;) {
        const ahora = io.read('D4'); const pet = antes === 1 && ahora === 0; antes = ahora;
        if (!pet) { yield 5; continue; }
        yield 2000; io.write('D27', 0); io.write('D26', 1); yield 2000;
        io.write('D26', 0); io.write('D25', 1); io.write('D33', 1); yield 5000;
        for (let i = 0; i < 6; i++) { io.write('D33', i % 2 === 0 ? 0 : 1); yield 300; }
        io.write('D33', 0); io.write('D25', 0); io.write('D27', 1); T.cycles++; antes = io.read('D4');
      }
    } }
  });

  /* ===================== COMPROBACIONES DE LOS RETOS ===================== */
  const GNDS = ['ard:GND1', 'ard:GND2'];
  const sts = (api, c) => (c && api.stats.comps[c.id]) || null;
  const toPin = (api, c, idx, pin) => { const t = 'ard:' + pin; if (api.sameNode(c, idx, t)) return true; return api.comps('res').some(r => r._nodes && c._nodes && ((api.sameNode(r, 0, t) && r._nodes[1] === c._nodes[idx]) || (api.sameNode(r, 1, t) && r._nodes[0] === c._nodes[idx]))); };
  const ledAt = (api, pin) => api.comps('led').find(c => !c.burnt && toPin(api, c, 0, pin));
  const toGnd = (api, c, idx) => GNDS.some(g => api.sameNode(c, idx, g));
  const btnAt = (api, pin) => api.comps('push').some(c => (api.sameNode(c, 0, 'ard:' + pin) && toGnd(api, c, 1)) || (api.sameNode(c, 1, 'ard:' + pin) && toGnd(api, c, 0)));
  const noBurnt = api => ({ label: 'Ningún componente quemado', ok: !api.model.comps.some(c => c.burnt) });
  const run = (api, s) => ({ label: `Deja correr el programa al menos ${s} s`, ok: api.stats.t >= s });
  const pinI = (api, leds) => ({ label: 'Cada LED con su resistencia: menos de 20 mA por pin', ok: leds.length > 0 && leds.every(c => c && sts(api, c) && sts(api, c).maxI < 0.02) });
  const ledsAt = (api, pins) => pins.map(p => ledAt(api, p));
  const allLeds = (api, pins, label) => { const L = ledsAt(api, pins); return { L, chk: { label, ok: L.every(Boolean) } }; };

  Object.assign(CHECKS, {
    es_knight: api => {
      const { L, chk } = allLeds(api, ['D13', 'D14', 'D27', 'D26', 'D25', 'D33'], 'Un LED (con su resistencia) en cada uno de los pines 13, 14, 27, 26, 25 y 33');
      return [chk, { label: 'Los seis se encienden y apagan por turnos', ok: L.every(c => c && sts(api, c) && sts(api, c).toggles >= 4) }, pinI(api, L), noBurnt(api), run(api, 4)];
    },
    es_binario: api => {
      const { L, chk } = allLeds(api, ['D25', 'D26', 'D27', 'D14'], 'LED en los pines 25 (bit 0), 26, 27 y 14 (bit 3)');
      const t = L.map(c => (c && sts(api, c) ? sts(api, c).toggles : 0));
      return [chk, { label: 'Cada bit cambia la mitad de veces que el anterior (cuenta binaria)', ok: L.every(Boolean) && t[0] >= 8 && t[0] > t[1] && t[1] > t[2] && t[2] >= t[3] && t[3] >= 1 }, pinI(api, L), noBurnt(api), run(api, 9)];
    },
    es_vumetro: api => {
      const pot = api.comps('pot')[0];
      if (!pot) return [{ label: 'Usa un potenciómetro', ok: false }];
      const { L, chk } = allLeds(api, ['D13', 'D14', 'D27', 'D26', 'D25'], 'LED en los pines 13, 14, 27, 26 y 25');
      const ends = [api.pinV(pot, 0), api.pinV(pot, 2)];
      return [{ label: 'El cursor del potenciómetro va al GPIO34', ok: api.sameNode(pot, 1, 'ard:D34') },
        { label: 'Sus extremos van a 3V3 y GND (nunca a VIN: 5 V)', ok: ends.every(v => v < 3.4) && Math.max(...ends) > 3.2 && Math.min(...ends) < 0.05 },
        { label: 'Has recorrido todo el rango (lecturas por debajo de 300 y por encima de 3800)', ok: TEL.min < 300 && TEL.max > 3800 }, chk,
        { label: 'Todos los LED se han encendido y apagado', ok: L.every(c => c && sts(api, c) && sts(api, c).onT > 0.1 && sts(api, c).offT > 0.1) }, noBurnt(api)];
    },
    es_nocturna: api => {
      const ldr = api.comps('ldr')[0];
      if (!ldr) return [{ label: 'Usa una LDR', ok: false }];
      const led = ledAt(api, 'D25'), s = sts(api, led);
      const ldrLow = (api.sameNode(ldr, 0, 'ard:D34') && toGnd(api, ldr, 1)) || (api.sameNode(ldr, 1, 'ard:D34') && toGnd(api, ldr, 0));
      const pullUp = api.comps('res').some(r => (api.sameNode(r, 0, 'ard:D34') && api.sameNode(r, 1, 'ard:3V3')) || (api.sameNode(r, 1, 'ard:D34') && api.sameNode(r, 0, 'ard:3V3')));
      return [{ label: 'La LDR va entre el GPIO34 y GND', ok: ldrLow }, { label: 'Una resistencia va del GPIO34 a 3V3', ok: pullUp },
        { label: 'LED con resistencia en el GPIO25', ok: !!led },
        { label: 'Has probado de día y de noche (lecturas por debajo de 2500 y por encima de 3000)', ok: TEL.min < 2500 && TEL.max > 3000 },
        { label: 'El LED se ha encendido a oscuras y apagado con luz', ok: !!s && TEL.on >= 1 && TEL.off >= 1 && s.onT > 0.2 && s.offT > 0.2 }, noBurnt(api)];
    },
    es_ledc2: api => {
      const L = ledsAt(api, ['D18', 'D19']);
      return [{ label: 'LED con resistencia en los GPIO 18 y 19', ok: L.every(Boolean) },
        { label: 'Los dos llegan casi a apagarse (brillo mínimo por debajo del 10 %)', ok: L.every(c => c && sts(api, c) && sts(api, c).minB < 0.1) },
        { label: 'Los dos brillan bien en su máximo (resistencia de 100 a 220 Ω)', ok: L.every(c => c && sts(api, c) && sts(api, c).maxB > 0.3) }, pinI(api, L), noBurnt(api), run(api, 3)];
    },
    es_toggle: api => {
      const led = ledAt(api, 'D23'), s = sts(api, led);
      return [{ label: 'Pulsador entre el GPIO4 y GND', ok: btnAt(api, 'D4') }, { label: 'LED con resistencia en el GPIO23', ok: !!led },
        { label: 'Has pulsado al menos dos veces', ok: TEL.presses >= 2 },
        { label: 'Tras soltar, el LED se queda encendido…', ok: !!s && s.onReleased }, { label: '…y tras la siguiente pulsación se queda apagado', ok: !!s && s.offReleased }, noBurnt(api)];
    },
    es_estados: api => {
      const led = ledAt(api, 'D18'), s = sts(api, led), seen = TEL.seen || [];
      return [{ label: 'Pulsador entre el GPIO4 y GND', ok: btnAt(api, 'D4') }, { label: 'LED con resistencia en el GPIO18', ok: !!led },
        { label: 'Has pasado por los cuatro modos', ok: seen.length === 4 && seen.every(Boolean) },
        { label: 'El LED se ha visto apagado, encendido y parpadeando', ok: !!s && s.minB < 0.1 && s.maxB > 0.3 && s.toggles >= 4 }, noBurnt(api)];
    },
    es_rtos: api => {
      const a = ledAt(api, 'D25'), b = ledAt(api, 'D26'), sa = sts(api, a), sb = sts(api, b);
      return [{ label: 'LED en el GPIO25 (tarea de parpadeo)', ok: !!a }, { label: 'LED en el GPIO26 y pulsador entre GPIO4 y GND (tarea del botón)', ok: !!b && btnAt(api, 'D4') },
        { label: 'El LED del 25 parpadea sin parar', ok: !!sa && sa.toggles >= 6 },
        { label: 'El pulsador conmuta el LED del 26 (encendido y apagado tras soltar)', ok: TEL.presses >= 2 && !!sb && sb.onReleased && sb.offReleased }, noBurnt(api), run(api, 4)];
    },
    es_peaton: api => {
      const { L, chk } = allLeds(api, ['D27', 'D26', 'D25', 'D33'], 'LED en 27 (verde), 26 (ámbar), 25 (rojo) y 33 (peatón)');
      return [chk, { label: 'Pulsador entre el GPIO4 y GND', ok: btnAt(api, 'D4') },
        { label: 'Un ciclo completo de peatón disparado por el pulsador', ok: TEL.cycles >= 1 },
        { label: 'Las cuatro luces se han encendido en el ciclo', ok: L.every(c => c && sts(api, c) && sts(api, c).onT > 0.3 && sts(api, c).toggles >= 1) }, pinI(api, L), noBurnt(api)];
    }
  });

  /* ===================== PROYECTOS ===================== */
  Object.assign(PROJECTS, {
    es_bench: {
      intro: 'Antes de construir nada, conoce tu placa: qué chip lleva, cuánta flash, cuánto consume y cómo se recupera cuando algo va mal. Saldrás con la ficha técnica de TU placa y un programa de diagnóstico que reutilizarás siempre.',
      level: 1, hours: 3,
      skills: ['Instalar el núcleo Arduino-ESP32 3.x', 'Modo descarga a mano con BOOT y EN', 'Leer el monitor serie y los motivos de reinicio', 'Medir el consumo real de una placa'],
      bom: ['Placa ESP32 DevKitC (módulo WROOM-32E) o similar', 'Cable USB de datos (no uno solo de carga)', 'Protoboard, LED y resistencia de 150 Ω', 'Multímetro o medidor USB de corriente'],
      phases: [
        { title: 'Fase 1 · Instalar y subir', steps: ['En el Arduino IDE 2, abre el gestor de placas, busca “esp32” de Espressif Systems e instala la versión 3.x.', 'Conecta la placa y mira qué puerto aparece. Si no aparece, instala el driver de su USB-serie (CP210x o CH340: está escrito en el chip junto al USB).', 'Elige “ESP32 Dev Module”, el puerto, y sube el ejemplo Blink cambiando el pin a 2 (o a un LED externo con 150 Ω en el GPIO 26).', 'Provoca el modo descarga a mano: mantén BOOT, pulsa y suelta EN, suelta BOOT. El monitor debe mostrar “waiting for download”.'],
          checks: ['El LED parpadea a 1 Hz', 'Sé qué chip USB-serie lleva mi placa', 'He entrado en modo descarga a mano y he subido así un programa'] },
        { title: 'Fase 2 · Ficha técnica por software', steps: ['Sube el programa de la fase y abre el monitor a 115 200 baudios.', 'Anota modelo, revisión, núcleos, frecuencia, tamaño de flash, PSRAM y memoria libre.', 'Compara la MAC con la etiqueta de la caja (si la trae) y apúntala: la usarás con ESP-NOW.'],
          code: `#include <esp_chip_info.h>
#include <esp_mac.h>

void setup() {
  Serial.begin(115200);
  delay(500);
  esp_chip_info_t info;
  esp_chip_info(&info);
  Serial.printf("Modelo: %s rev %d, %d nucleos\\n", ESP.getChipModel(), ESP.getChipRevision(), info.cores);
  Serial.printf("CPU: %lu MHz\\n", (unsigned long)ESP.getCpuFreqMHz());
  Serial.printf("Flash: %lu bytes\\n", (unsigned long)ESP.getFlashChipSize());
  Serial.printf("PSRAM: %lu bytes\\n", (unsigned long)ESP.getPsramSize());
  Serial.printf("Heap libre: %lu bytes\\n", (unsigned long)ESP.getFreeHeap());
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  Serial.printf("MAC WiFi: %02X:%02X:%02X:%02X:%02X:%02X\\n", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  Serial.printf("Motivo del ultimo reinicio: %d\\n", (int)esp_reset_reason());
}

void loop() {}`,
          checks: ['Tengo anotados modelo, revisión, flash, PSRAM, heap libre y MAC', 'El tamaño de flash coincide con lo que dice el módulo (normalmente 4 MB)'] },
        { title: 'Fase 3 · Reinicios a propósito', steps: ['Añade el loop() de la fase al programa anterior.', 'Envía por el monitor “r”, “d” y “p”, y pulsa EN. Apunta el número de motivo que aparece tras cada reinicio.', 'Con “p” verás un Guru Meditation Error: localiza la palabra Backtrace y copia las direcciones. Actívalo en el decodificador de excepciones si tu IDE lo tiene.'],
          code: `// Añádelo al programa de la fase 2
void loop() {
  if (!Serial.available()) return;
  char c = Serial.read();
  if (c == 'r') ESP.restart();               // reinicio por software: 3
  if (c == 'd') esp_deep_sleep(3000000);     // 3 s dormido: 8
  if (c == 'p') {                            // fallo a proposito: 4
    volatile int *p = nullptr;
    *p = 1;
  }
}`,
          checks: ['He visto al menos cuatro motivos de reinicio distintos (encendido, EN, software, pánico, deep sleep) y sé su número', 'He localizado el Backtrace de un Guru Meditation'] },
        { title: 'Fase 4 · Consumo real', steps: ['Mide la corriente en el cable USB (medidor USB o multímetro en serie con el 5 V) con el programa de diagnóstico parado en loop().', 'Añade un WiFi.scanNetworks() cada 2 s y vuelve a medir: verás picos.', 'Manda “d” para dormirla y mide durante el sueño.', 'Explica en tu cuaderno por qué la placa dormida no baja a 10 µA: busca su regulador, su USB-serie y su LED.'],
          checks: ['Tengo tres medidas: en reposo, escaneando WiFi y en deep sleep', 'He identificado qué piezas de la placa consumen durante el sueño'] }
      ],
      extra: ['Mira el pin 3V3 con un osciloscopio mientras escanea WiFi: verás las caídas de cada transmisión', 'Repite la ficha con otra placa (C3 o S3) y compáralas']
    },

    es_voltmeter: {
      intro: 'Convierte el ESP32 en un voltímetro de 0 a 15 V con pantalla y descubre lo lejos que está un ADC “de 12 bits” de medir con 12 bits de verdad. Lo calibrarás contra tu multímetro y guardarás la calibración en la flash.',
      level: 2, hours: 6,
      skills: ['Divisores para el ADC y protección de la entrada', 'Caracterizar el error de un ADC real', 'Calibración a dos puntos guardada en NVS', 'Promediado y presentación en OLED'],
      bom: ['ESP32 DevKit', 'Resistencias de 100 kΩ y 18 kΩ al 1 %', 'Condensador cerámico de 100 nF', 'Diodo doble BAT54S (protección) — opcional', 'Pantalla OLED SSD1306 128×64 I²C', 'Pulsador', 'Fuente regulable o pilas en serie para probar', 'Multímetro'],
      phases: [
        { title: 'Fase 1 · Divisor y primera lectura', steps: ['Calcula: con 100 kΩ arriba y 18 kΩ abajo, 15 V se convierten en 15 × 18 / 118 ≈ 2,29 V, dentro de la zona fiable con 11 dB.', 'Monta el divisor con la salida al GPIO 34 (ADC1) y el condensador de 100 nF del pin a GND.', 'Si pones el BAT54S, sus extremos van a GND y 3V3 y el centro al GPIO 34: si alguien mete 30 V, el diodo descarga el exceso por la resistencia de 100 kΩ.', 'Sube el programa y compara con el multímetro a 5 V.'],
          code: `const int PIN = 34;                     // ADC1: funciona aunque uses WiFi
const float R1 = 100000.0, R2 = 18000.0;

void setup() {
  Serial.begin(115200);
  analogSetPinAttenuation(PIN, ADC_11db); // zona fiable hasta ~2,45 V
}

void loop() {
  uint32_t suma = 0;
  for (int i = 0; i < 64; i++) suma += analogReadMilliVolts(PIN);
  float vPin = suma / 64.0 / 1000.0;      // media de 64 lecturas, en voltios
  float vIn = vPin * (R1 + R2) / R2;
  Serial.printf("pin %.3f V -> entrada %.2f V\\n", vPin, vIn);
  delay(500);
}`,
          checks: ['Con 5,00 V medidos con el multímetro, el ESP32 lee entre 4,8 y 5,2 V sin calibrar', 'He calculado la tensión máxima en el pin para 15 V y está por debajo de 2,45 V'] },
        { title: 'Fase 2 · Caracteriza el error', steps: ['Con la fuente regulable, toma al menos 10 puntos entre 0,5 y 15 V: tensión del multímetro y lectura del ESP32.', 'Pásalos a una hoja de cálculo y dibuja el error (ESP32 − multímetro) frente a la tensión.', 'Repite tres puntos con el WiFi escaneando a la vez y mira si el ruido cambia.'],
          checks: ['Tengo una tabla de al menos 10 puntos y su gráfica de error', 'He localizado dónde crece el error (zona baja y cerca del máximo)'] },
        { title: 'Fase 3 · Calibración en NVS', steps: ['Elige dos puntos de la zona recta (por ejemplo 2 V y 13 V).', 'Añade un comando por el monitor serie que pida esas dos tensiones, mida y guarde la pendiente y el desplazamiento.', 'Aplica la corrección a cada lectura: vReal = a · vMedida + b.', 'Reinicia y comprueba que la calibración sigue ahí.'],
          code: `#include <Preferences.h>
Preferences prefs;
float a = 1.0, b = 0.0;               // vReal = a * vMedida + b

void cargaCalibracion() {
  prefs.begin("voltimetro", true);    // true = solo lectura
  a = prefs.getFloat("a", 1.0);
  b = prefs.getFloat("b", 0.0);
  prefs.end();
}

void guardaCalibracion(float m1, float r1, float m2, float r2) {
  a = (r2 - r1) / (m2 - m1);          // pendiente entre los dos puntos
  b = r1 - a * m1;
  prefs.begin("voltimetro", false);
  prefs.putFloat("a", a);
  prefs.putFloat("b", b);
  prefs.end();
}`,
          checks: ['Tras calibrar, el error es menor del 1 % entre 2 y 14 V', 'Los coeficientes sobreviven a un reinicio y a quitar la alimentación'] },
        { title: 'Fase 4 · Pantalla y botón HOLD', steps: ['Conecta la OLED a 3V3, GND, SDA 21 y SCL 22 e instala Adafruit SSD1306 y Adafruit GFX.', 'Muestra la tensión en grande, una barra y los valores mínimo y máximo desde el arranque.', 'Un pulsador (GPIO 27 con INPUT_PULLUP) congela la lectura (HOLD) y otro toque la libera.'],
          checks: ['La pantalla refresca 4 veces por segundo sin parpadeo', 'HOLD congela la lectura y la libera'] }
      ],
      extra: ['Añade un modo amperímetro con un INA219 (I²C)', 'Compáralo con un ADS1115 de 16 bits: ¿cuánto mejora de verdad?']
    },

    es_lamp: {
      intro: 'Una lámpara de 16–24 LED direccionables con un difusor, que se enciende, cambia de color y de brillo tocando una lámina de cobre: sin botones. En el módulo de WiFi la controlarás desde el móvil.',
      level: 2, hours: 7,
      skills: ['Alimentar tiras WS2812 sin sustos', 'Adaptar 3,3 V a 5 V con un 74AHCT125', 'Sensores táctiles con calibración', 'Máquina de estados de efectos y NVS'],
      bom: ['ESP32 DevKit', 'Anillo o tira WS2812B de 16–24 LED', 'Fuente de 5 V y 2 A (o cargador USB de 2 A)', '74AHCT125 (adaptador de nivel)', 'Resistencia de 330 Ω y condensador electrolítico de 1000 µF 10 V', 'Cinta de cobre adhesiva y cable fino', 'Difusor: tubo de papel vegetal o plástico opal'],
      phases: [
        { title: 'Fase 1 · Alimentación y señal', steps: ['Conecta la fuente de 5 V a la tira con el condensador de 1000 µF entre 5 V y GND, en la entrada de la tira.', 'Alimenta el 74AHCT125 a 5 V, pon su OE a GND, entrada desde el GPIO 13 y salida → 330 Ω → DIN de la tira. Une todas las masas.', 'Instala Adafruit NeoPixel y sube el programa de prueba.', 'Calcula la corriente: cada LED gasta hasta unos 60 mA en blanco total; limita el brillo en el código.'],
          code: `#include <Adafruit_NeoPixel.h>
const int PIN_TIRA = 13, N = 16;
Adafruit_NeoPixel tira(N, PIN_TIRA, NEO_GRB + NEO_KHZ800);

void setup() {
  tira.begin();
  tira.setBrightness(80);              // 80/255: limita la corriente
}

void loop() {
  static uint16_t tono = 0;
  for (int i = 0; i < N; i++)
    tira.setPixelColor(i, tira.gamma32(tira.ColorHSV(tono + i * 65536L / N)));
  tira.show();                          // en el ESP32 usa el RMT
  tono += 256;
  delay(20);
}`,
          checks: ['Todos los LED muestran rojo, verde y azul correctos (orden GRB)', 'Con todos en blanco al brillo máximo que permites, la tensión en el último LED es al menos 4,7 V y la fuente no se calienta'] },
        { title: 'Fase 2 · Toque', steps: ['Pega un cuadrado de cinta de cobre de 2 × 2 cm y únelo al GPIO 4 (T0) con un cable corto.', 'Imprime touchRead(4) sin tocar y tocando, a través de la tapa de 1–2 mm.', 'Calibra la base al arrancar y detecta toques cortos (encender/apagar) y largos (subir/bajar brillo mientras dure).'],
          code: `const int PIN_TOQUE = 4;              // T0
int base = 0;

void calibraToque() {
  long suma = 0;
  for (int i = 0; i < 32; i++) { suma += touchRead(PIN_TOQUE); delay(5); }
  base = suma / 32;                     // valor sin tocar
}

bool tocando() {
  return touchRead(PIN_TOQUE) < base * 2 / 3;   // en el ESP32 clásico baja al tocar
}
// En loop(): mide con millis() cuánto dura cada toque
//   menos de 400 ms -> encender/apagar
//   400 ms o más    -> cambiar el brillo mientras dure`,
          checks: ['He anotado las lecturas sin tocar y tocando a través de la tapa', 'En 10 minutos sin tocar no hay ningún disparo falso'] },
        { title: 'Fase 3 · Efectos y memoria', steps: ['Organiza el programa como máquina de estados: color fijo, arcoíris, vela (parpadeo aleatorio cálido) y respiración.', 'Un segundo pad (GPIO 27, T7) cambia de efecto.', 'Guarda efecto, color y brillo en NVS solo cuando lleven 5 s sin cambiar.'],
          checks: ['Cuatro efectos con transiciones suaves', 'Tras quitar la corriente recupera efecto y brillo'] },
        { title: 'Fase 4 · Montaje', steps: ['Monta los LED en un soporte (tubo de cartón o pieza impresa) y el difusor alrededor.', 'Fija los cables con alivio de tensión: que un tirón no arranque las soldaduras.', 'Mide el consumo real en el peor caso y verifica que la fuente tiene un 30 % de margen.'],
          checks: ['La corriente máxima medida está por debajo del 70 % de lo que da la fuente', 'El toque funciona a través de la carcasa terminada'] }
      ],
      extra: ['Prueba FastLED y compara código y efectos', 'Haz que el color cambie con la hora (cálido por la noche) cuando llegues al módulo de WiFi']
    },

    es_irremote: {
      intro: 'Un aparato que aprende los botones de cualquier mando infrarrojo (tele, tira LED barata, ventilador) y luego los reproduce. Verás los pulsos con el RMT, decodificarás el protocolo NEC a mano y terminarás con un mando universal de cuatro botones.',
      level: 3, hours: 10,
      skills: ['Capturar trenes de pulsos con el RMT', 'Decodificar un protocolo real (NEC)', 'Emitir con portadora de 38 kHz', 'Guardar datos binarios en NVS'],
      bom: ['ESP32 DevKit', 'Receptor IR de 38 kHz (TSOP38238 o VS1838B)', 'LED IR de 940 nm', 'Transistor NPN (BC337 o 2N2222) y resistencias de 1 kΩ y 33 Ω', 'Resistencia de 100 Ω y condensador de 10 µF (filtro del receptor)', '4 pulsadores', 'Un mando a distancia viejo'],
      phases: [
        { title: 'Fase 1 · Ver la señal', steps: ['Alimenta el receptor a 3,3 V con 100 Ω en serie y 10 µF a masa en su pata de alimentación (filtra ruido).', 'Su salida va al GPIO 35 (solo entrada, perfecto). En reposo está alta; durante cada ráfaga de 38 kHz baja.', 'Sube el programa y pulsa botones del mando delante del receptor.'],
          code: `// Captura de pulsos con el RMT (API de Arduino-ESP32 3.x;
// si tu versión difiere, parte del ejemplo RMT_Read que trae)
const int PIN_IR = 35;
rmt_data_t buf[128];

void setup() {
  Serial.begin(115200);
  rmtInit(PIN_IR, RMT_RX_MODE, RMT_MEM_NUM_BLOCKS_2, 1000000);  // 1 tick = 1 us
  rmtSetRxMaxThreshold(PIN_IR, 12000);   // 12 ms sin cambios = fin de trama
}

void loop() {
  size_t n = 128;
  if (rmtRead(PIN_IR, buf, &n, RMT_WAIT_FOR_EVER)) {
    for (size_t i = 0; i < n; i++)
      Serial.printf("%d:%u %d:%u  ", buf[i].level0, buf[i].duration0, buf[i].level1, buf[i].duration1);
    Serial.println();
  }
}`,
          checks: ['Veo la cabecera NEC: unos 9000 µs a nivel bajo y 4500 µs a nivel alto', 'Distingo un 0 (≈ 560 + 560 µs) de un 1 (≈ 560 + 1690 µs)'] },
        { title: 'Fase 2 · Decodificar NEC', steps: ['Escribe la función de la fase: valida la cabecera y convierte 32 pares en bits.', 'NEC manda dirección, dirección invertida, comando y comando invertido, empezando por el bit de menos peso.', 'Mantén un botón pulsado: aparecerán tramas de repetición (9 ms + 2,25 ms, sin datos). Trátalas aparte.'],
          code: `// true y el código de 32 bits si la trama es NEC válida
bool decodificaNEC(rmt_data_t *s, size_t n, uint32_t &codigo) {
  if (n < 33) return false;
  if (s[0].duration0 < 8000 || s[0].duration1 < 4000) return false;  // cabecera
  codigo = 0;
  for (int i = 1; i <= 32; i++) {
    bool uno = s[i].duration1 > 1000;            // espacio largo = 1
    codigo |= (uint32_t)uno << (i - 1);          // primero el bit de menos peso
  }
  uint8_t cmd = codigo >> 16, ncmd = codigo >> 24;
  return (uint8_t)(cmd ^ ncmd) == 0xFF;          // comando y su inverso
}`,
          checks: ['Cada botón de mi mando da siempre el mismo código', 'Detecto la trama de repetición al mantener pulsado'] },
        { title: 'Fase 3 · Emitir', steps: ['El LED IR necesita unos 100 mA en pulsos: un pin no los da. Monta 5 V → 33 Ω → LED IR → colector del NPN; emisor a GND; base al GPIO 4 con 1 kΩ.', 'Genera la trama con portadora de 38 kHz y un tercio de ciclo de trabajo (rmtSetCarrier en el RMT, o la biblioteca IRremoteESP8266 para empezar).', 'Mira el LED con la cámara del móvil: verás un brillo violeta al emitir.'],
          checks: ['La cámara del móvil ve el LED parpadear al enviar', 'El aparato responde al código reproducido a 3 m'] },
        { title: 'Fase 4 · Mando universal', steps: ['Cuatro pulsadores. Pulsación larga en uno: modo aprender (LED fijo) hasta recibir una trama válida.', 'Guarda los cuatro códigos (y el protocolo si añades otros) en NVS con putBytes.', 'Pulsación corta: emite el código guardado.'],
          checks: ['Los cuatro botones aprendidos sobreviven a un reinicio', 'Funciona con dos aparatos de marcas distintas'] }
      ],
      extra: ['Los aires acondicionados mandan tramas de 100 bits o más con su propio protocolo: prueba IRremoteESP8266', 'En el módulo de WiFi: un puente WiFi → IR para manejar la tele desde el móvil']
    },

    es_piano: {
      intro: 'Ocho teclas de cinta de cobre sobre cartulina conectadas a los pines táctiles y un altavoz con amplificador I²S. Generarás tú las ondas (seno, cuadrada, con envolvente) en una tarea de audio que no puede retrasarse ni un milisegundo.',
      level: 3, hours: 12,
      skills: ['Síntesis de audio por software', 'I²S con DMA y la API ESP_I2S', 'Polifonía y envolventes sin chasquidos', 'Reparto en tareas y núcleos'],
      bom: ['ESP32 DevKit (clásico: tiene 10 pines táctiles)', 'Módulo MAX98357A', 'Altavoz de 4–8 Ω y unos 3 W', 'Cinta de cobre o papel de aluminio y cartulina', 'Cables y fuente USB de 5 V y 1 A'],
      phases: [
        { title: 'Fase 1 · Primer sonido', steps: ['Conecta el MAX98357A: VIN a 5 V, GND, BCLK al GPIO 26, LRC al 25 y DIN al 22. El altavoz a sus bornes + y −.', 'Sube el programa: un la de 440 Hz.', 'Comprueba la afinación con una app de afinador.'],
          code: `#include <ESP_I2S.h>
I2SClass i2s;
const int FS = 22050;
int16_t bloque[256];

void setup() {
  i2s.setPins(26, 25, 22);            // BCLK, LRC (WS), DIN del amplificador
  if (!i2s.begin(I2S_MODE_STD, FS, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO)) {
    Serial.begin(115200);
    Serial.println("Fallo al iniciar I2S");
    while (true) delay(1000);
  }
}

void loop() {
  static float fase = 0;
  const float paso = 2 * PI * 440.0 / FS;     // avance de fase por muestra
  for (int i = 0; i < 256; i++) {
    bloque[i] = (int16_t)(8000 * sinf(fase)); // volumen moderado
    fase += paso;
    if (fase > 2 * PI) fase -= 2 * PI;
  }
  i2s.write((uint8_t *)bloque, sizeof(bloque)); // espera si el DMA va lleno
}`,
          checks: ['Suena un la de 440 Hz (±2 Hz en el afinador)', 'Un minuto seguido sin chasquidos'] },
        { title: 'Fase 2 · Teclas táctiles', steps: ['Recorta 8 teclas de cobre y únelas con cables cortos a los pines táctiles 4, 13, 14, 27, 33, 32, 15 y 2. (15 y 2 son de arranque, pero una lámina de cobre no los fuerza a ningún nivel).', 'Calibra la base de cada tecla al arrancar y usa un umbral relativo.', 'Imprime qué teclas están pulsadas cada 20 ms.'],
          checks: ['Las 8 teclas se detectan sin falsos positivos con la mano cerca', 'No hay retraso perceptible entre tocar y detectar'] },
        { title: 'Fase 3 · Polifonía y envolvente', steps: ['Frecuencia de la nota n (MIDI): f = 440 · 2^((n − 69)/12).', 'Mezcla hasta 4 voces sumando sus muestras y escala para no saturar.', 'Añade una envolvente: ataque de 10 ms y caída de 200 ms al soltar.', 'Separa en tareas: la de audio en el núcleo 1 con prioridad alta; la de teclas en el núcleo 0, que manda eventos por una cola.'],
          checks: ['Un acorde de 3 notas suena sin distorsión', 'Al soltar, la nota se apaga suave, sin clic'] },
        { title: 'Fase 4 · Instrumento completo', steps: ['Botón de octava arriba/abajo y selector de forma de onda (seno, cuadrada, diente de sierra).', 'Graba una melodía en RAM con tiempos y reprodúcela.', 'Guárdala en LittleFS para que no se pierda.'],
          checks: ['Graba y reproduce una melodía de 20 notas con su ritmo', 'La melodía guardada se reproduce tras reiniciar'] }
      ],
      extra: ['Batería electrónica con muestras WAV en LittleFS', 'Entrada MIDI por UART (31 250 baudios) para tocar desde un teclado']
    },

    es_reflex: {
      intro: 'Un LED se enciende tras un tiempo aleatorio y gana quien pulse antes. Medirás tiempos con precisión de microsegundos usando interrupciones, detectarás salidas en falso y llevarás el marcador. Sencillo por fuera, con trampas de concurrencia de verdad por dentro.',
      level: 2, hours: 5,
      skills: ['Interrupciones con IRAM_ATTR', 'esp_timer y medidas en microsegundos', 'Secciones críticas con portMUX', 'Máquina de estados de un juego'],
      bom: ['ESP32 DevKit', '2 pulsadores grandes (tipo arcade, 30 mm)', 'LED rojo y dos LED de colores con 150 Ω', 'Zumbador pasivo', 'Pantalla OLED (opcional)'],
      phases: [
        { title: 'Fase 1 · Interrupciones precisas', steps: ['Pulsadores entre los GPIO 32 y 33 y GND, con INPUT_PULLUP.', 'Cada ISR guarda el instante con esp_timer_get_time() solo la primera vez: así los rebotes no cuentan.', 'Los tiempos son de 64 bits: léelos dentro de una sección crítica.'],
          code: `const int J1 = 32, J2 = 33;
volatile int64_t tPulsa[2] = {0, 0};
portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;

void IRAM_ATTR isrJ1() {
  portENTER_CRITICAL_ISR(&mux);
  if (!tPulsa[0]) tPulsa[0] = esp_timer_get_time();   // microsegundos
  portEXIT_CRITICAL_ISR(&mux);
}
void IRAM_ATTR isrJ2() {
  portENTER_CRITICAL_ISR(&mux);
  if (!tPulsa[1]) tPulsa[1] = esp_timer_get_time();
  portEXIT_CRITICAL_ISR(&mux);
}

void leeTiempos(int64_t &a, int64_t &b) {   // copia segura
  portENTER_CRITICAL(&mux);
  a = tPulsa[0]; b = tPulsa[1];
  portEXIT_CRITICAL(&mux);
}

void setup() {
  Serial.begin(115200);
  pinMode(J1, INPUT_PULLUP); pinMode(J2, INPUT_PULLUP);
  attachInterrupt(J1, isrJ1, FALLING);
  attachInterrupt(J2, isrJ2, FALLING);
}
// loop(): te toca. Pon tPulsa a 0 (en sección crítica) al empezar cada ronda.`,
          checks: ['Se registran tiempos en microsegundos de cada jugador', 'Los rebotes no cambian el primer tiempo registrado'] },
        { title: 'Fase 2 · Lógica del juego', steps: ['Estados: ESPERA → PREPARADOS (espera aleatoria de 2 a 5 s con esp_random()) → YA (LED encendido, guarda t0) → RESULTADO.', 'Si alguien pulsa en PREPARADOS, salida en falso: pierde la ronda.', 'Calcula el tiempo de reacción de cada uno restando t0.'],
          checks: ['Una salida en falso se detecta y se penaliza', 'Los tiempos de reacción salen entre 150 y 350 ms en personas despiertas'] },
        { title: 'Fase 3 · Sonido y marcador', steps: ['Pitido con ledcWriteTone en el zumbador al encender el LED y melodía para el ganador.', 'Marcador a 5 rondas en los LED de colores o en la OLED.', 'Guarda el récord en NVS.'],
          checks: ['El juego completo funciona sin reiniciar la placa', 'El récord sobrevive a un apagado'] },
        { title: 'Fase 4 · ¿Cuánto tarda la ISR?', steps: ['Dentro de la ISR, pon un pin de depuración a 1 con digitalWrite (o con REG_WRITE para ir más rápido).', 'Con el osciloscopio, mide el tiempo entre el flanco del pulsador y el flanco del pin de depuración.', 'Compáralo con hacerlo por sondeo desde loop().'],
          checks: ['He medido la latencia de la interrupción (unos pocos microsegundos)', 'He comparado ISR frente a sondeo y lo he anotado'] }
      ],
      extra: ['Versión inalámbrica con pulsadores ESP-NOW (módulo 7)', 'Modo “simón dice” con secuencias crecientes']
    },

    es_thermostat: {
      intro: 'Un termostato de verdad para una caja de fermentación, un terrario o una incubadora de baja tensión: sensor, control con histéresis (y luego PID), pantalla, botones y vigilancia. Cada parte en su tarea de FreeRTOS, comunicadas con colas y protegidas con mutex.',
      level: 3, hours: 14,
      skills: ['Diseñar un sistema en tareas', 'Colas, mutex y notificaciones', 'Watchdog de tareas y modos seguros', 'Control con histéresis y PID'],
      bom: ['ESP32 DevKit', 'Sensor DS18B20 sumergible y resistencia de 4,7 kΩ', 'OLED SSD1306 I²C', '3 pulsadores', 'MOSFET de canal N especificado a 2,5–3,3 V de puerta (p. ej. AO3400 en placa adaptadora) o módulo MOSFET con driver', 'Calentador de 12 V y 10–20 W (manta de silicona o resistencias de potencia)', 'Fuente de 12 V y 2 A, convertidor buck de 12 a 5 V y fusible de 3 A'],
      phases: [
        { title: 'Fase 1 · Arquitectura y primeras tareas', steps: ['Seguridad: todo a 12 V. No conmutes 230 V: no es un proyecto de red eléctrica.', 'Dibuja las tareas: sensor (cada segundo, a una cola), control (decide la salida), pantalla (lee el estado protegido) y botones (aviso desde la ISR).', 'Monta el DS18B20 en el GPIO 4 con 4,7 kΩ a 3V3, y en el GPIO 25 un LED en lugar del calentador para empezar.', 'Sube el esqueleto y comprueba la histéresis acercando la mano al sensor.'],
          code: `#include <OneWire.h>
#include <DallasTemperature.h>

struct Estado { float temp; float consigna; bool calentando; };
Estado estado = {0, 25.0, false};
SemaphoreHandle_t mtxEstado;
QueueHandle_t colaTemp;
OneWire bus(4);
DallasTemperature sensor(&bus);

void tareaSensor(void *) {
  sensor.begin();
  for (;;) {
    sensor.requestTemperatures();             // ~750 ms a 12 bits
    float t = sensor.getTempCByIndex(0);
    if (t != DEVICE_DISCONNECTED_C) xQueueSend(colaTemp, &t, 0);
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
}

void tareaControl(void *) {
  const int SALIDA = 25;
  pinMode(SALIDA, OUTPUT);
  float t;
  for (;;) {
    if (xQueueReceive(colaTemp, &t, pdMS_TO_TICKS(5000)) != pdTRUE) {
      digitalWrite(SALIDA, LOW);              // sin lecturas: apaga por seguridad
      continue;
    }
    xSemaphoreTake(mtxEstado, portMAX_DELAY);
    estado.temp = t;
    if (t < estado.consigna - 0.3) estado.calentando = true;   // histeresis
    if (t > estado.consigna + 0.3) estado.calentando = false;
    bool on = estado.calentando;
    xSemaphoreGive(mtxEstado);
    digitalWrite(SALIDA, on);
  }
}

void setup() {
  mtxEstado = xSemaphoreCreateMutex();
  colaTemp = xQueueCreate(5, sizeof(float));
  xTaskCreatePinnedToCore(tareaSensor, "sensor", 4096, NULL, 2, NULL, 1);
  xTaskCreatePinnedToCore(tareaControl, "control", 3072, NULL, 3, NULL, 1);
  // Te toca: tareaPantalla y tareaBotones
}

void loop() { vTaskDelay(portMAX_DELAY); }`,
          checks: ['La salida conmuta con histéresis de ±0,3 °C (comprobado con el LED)', 'Si desconecto el sensor, la salida se apaga en menos de 6 s'] },
        { title: 'Fase 2 · Pantalla y botones', steps: ['Tarea de pantalla con prioridad 1: cada 250 ms copia el estado dentro del mutex y dibuja fuera de él.', 'Botones con interrupción: la ISR hace vTaskNotifyGiveFromISR a la tarea de botones, que aplica el antirrebote y cambia la consigna ±0,5 °C.', 'Protege también la consigna con el mutex.'],
          checks: ['La pantalla nunca se queda congelada aunque el sensor tarde', 'Un cambio de consigna se ve en pantalla en menos de 200 ms'] },
        { title: 'Fase 3 · Potencia', steps: ['Sustituye el LED por el MOSFET: puerta al GPIO 25 con 100 Ω, 100 kΩ de puerta a fuente, drenador al calentador, fuente a GND. El fusible en el positivo de 12 V.', 'El ESP32 se alimenta del buck de 5 V; masas unidas en un único punto.', 'Mide la temperatura del MOSFET con el calentador a tope durante 10 minutos.'],
          checks: ['El MOSFET no pasa de 50 °C a plena carga tras 10 min', 'La temperatura del recinto se mantiene a ±0,5 °C de la consigna durante una hora'] },
        { title: 'Fase 4 · Robustez', steps: ['Suscribe la tarea de control al watchdog de tareas y llama a esp_task_wdt_reset() en cada vuelta.', 'Imprime cada minuto la marca de agua de pila de cada tarea.', 'Guarda la consigna en NVS y añade un corte absoluto: por encima de un máximo, salida apagada pase lo que pase.', 'Fuerza un cuelgue (un bucle infinito en control) y observa.'],
          checks: ['Un cuelgue forzado provoca reinicio por watchdog y la salida queda apagada', 'Ninguna tarea baja de 512 bytes de pila libre'] },
        { title: 'Fase 5 · PID (avanzado)', steps: ['Cambia la histéresis por un PID con salida proporcional en el tiempo: ventana de 10 s y la salida encendida un porcentaje de ella.', 'Ajusta Kp, luego Ki, y limita la integral (anti-windup).', 'Registra temperatura y salida por Serial y dibújalas.'],
          checks: ['Tras un cambio de consigna de 5 °C, la sobreoscilación es menor de 0,5 °C', 'He documentado los valores finales de Kp, Ki y Kd'] }
      ],
      extra: ['Gráfica en una página web servida por el propio ESP32 (módulo 6)', 'Dos zonas con dos DS18B20 en el mismo bus 1-Wire']
    },

    es_lock: {
      intro: 'Teclado matricial 4×4 y un servo que mueve un pestillo. El código, los intentos fallidos y el bloqueo temporal se guardan en la flash: aunque desenchufes la cerradura para “resetearla”, sigue bloqueada.',
      level: 2, hours: 6,
      skills: ['Escanear un teclado matricial', 'Servos con LEDC a 50 Hz', 'Persistencia con Preferences (NVS)', 'Pensar como un atacante'],
      bom: ['ESP32 DevKit', 'Teclado de membrana 4×4', 'Servo SG90 o MG90S', 'Fuente de 5 V para el servo y condensador de 470 µF', 'LED rojo y verde con 150 Ω', 'Zumbador', 'Caja o puerta de prueba de madera'],
      phases: [
        { title: 'Fase 1 · Teclado matricial', steps: ['Filas a los GPIO 13, 14, 27 y 26 (salidas); columnas a 25, 33, 32 y 23 (entradas con pull-up).', 'Se activa una fila poniéndola a LOW y se mira qué columna baja.', 'Añade antirrebote y espera a que se suelte la tecla.'],
          code: `const int FILAS[4] = {13, 14, 27, 26};
const int COLS[4]  = {25, 33, 32, 23};
const char MAPA[4][4] = {{'1','2','3','A'}, {'4','5','6','B'},
                         {'7','8','9','C'}, {'*','0','#','D'}};

void iniciaTeclado() {
  for (int f = 0; f < 4; f++) { pinMode(FILAS[f], OUTPUT); digitalWrite(FILAS[f], HIGH); }
  for (int c = 0; c < 4; c++) pinMode(COLS[c], INPUT_PULLUP);
}

char leeTecla() {                       // 0 si no hay ninguna pulsada
  for (int f = 0; f < 4; f++) {
    digitalWrite(FILAS[f], LOW);        // activa una fila
    delayMicroseconds(5);
    for (int c = 0; c < 4; c++)
      if (digitalRead(COLS[c]) == LOW) { digitalWrite(FILAS[f], HIGH); return MAPA[f][c]; }
    digitalWrite(FILAS[f], HIGH);
  }
  return 0;
}`,
          checks: ['Las 16 teclas se leen correctamente', 'Una pulsación larga produce una sola tecla'] },
        { title: 'Fase 2 · Servo con LEDC', steps: ['Alimenta el servo con su propia fuente de 5 V (con 470 µF) y une las masas. La señal, al GPIO 18.', 'A 50 Hz el periodo es de 20 ms; con 16 bits, 1 ms son 3277 cuentas.', 'Busca los extremos de tu servo sin forzar el tope mecánico.'],
          code: `const int SERVO = 18;

void iniciaServo() { ledcAttach(SERVO, 50, 16); }       // 50 Hz, 16 bits

void servoAngulo(int grados) {                          // 0..180
  uint32_t us = map(grados, 0, 180, 500, 2400);         // ajusta a tu servo
  ledcWrite(SERVO, us * 65536UL / 20000);               // 20 ms = 65536 cuentas
}`,
          checks: ['El servo va a 0° y 90° y no vibra en reposo', 'Moverlo no reinicia el ESP32'] },
        { title: 'Fase 3 · Lógica y memoria', steps: ['Código de 4 a 8 dígitos, “#” confirma y “*” borra.', 'Tras 3 fallos, bloqueo de 30 s que se duplica en cada nuevo fallo.', 'Guarda fallos y segundos de bloqueo pendientes en NVS (actualízalos cada 5 s durante el bloqueo, no cada segundo).', 'Cambio de código: “A”, código actual y nuevo dos veces.'],
          code: `#include <Preferences.h>
Preferences prefs;

void guardaFallos(uint8_t fallos, uint32_t bloqueoSeg) {
  prefs.begin("cerradura", false);
  prefs.putUChar("fallos", fallos);
  prefs.putULong("bloqueo", bloqueoSeg);    // segundos de bloqueo pendientes
  prefs.end();
}`,
          checks: ['Tras 3 fallos se bloquea 30 s y lo indica', 'Desenchufar durante el bloqueo no lo salta', 'El código nuevo sobrevive a un reinicio'] },
        { title: 'Fase 4 · Montaje y repaso de seguridad', steps: ['Monta el servo moviendo un pestillo de puerta pequeño.', 'Recuperación: mantener BOOT (GPIO 0) 5 s al arrancar restaura el código de fábrica. Piensa quién podría usarlo.', 'Escribe tres formas de abrirla sin el código (abrir la caja y puentear, leer la flash…) y cómo las mitigarías.'],
          checks: ['La cerradura funciona montada en su caja', 'He documentado tres ataques y sus defensas (y sé que no es una cerradura de seguridad real)'] }
      ],
      extra: ['Abre también con tarjetas RFID (RC522 por SPI)', 'Registro de aperturas con hora en LittleFS']
    },

    es_logger: {
      intro: 'Un registrador de datos autónomo que guarda temperatura, humedad y presión cada minuto en archivos CSV dentro de la propia flash, con un menú por el puerto serie para listar, volcar y borrar. En el módulo de WiFi le añadirás descarga por web.',
      level: 3, hours: 10,
      skills: ['LittleFS: abrir, añadir, rotar y listar', 'Diseñar formatos de datos compactos', 'Vida útil de la flash y búferes', 'Un intérprete de órdenes por Serial'],
      bom: ['ESP32 DevKit', 'Sensor BME280 (I²C, 3,3 V)', 'Pulsador y LED', 'Batería USB para pruebas autónomas', 'Reloj DS3231 (opcional, para hora sin WiFi)'],
      phases: [
        { title: 'Fase 1 · Sensor y formato', steps: ['BME280 a 3V3, GND, SDA 21 y SCL 22; dirección 0x76 o 0x77.', 'Decide el formato de cada línea: segundos desde el arranque, temperatura, humedad y presión, separados por comas y con decimales justos.', 'Imprime una línea cada minuto por Serial.'],
          checks: ['Las lecturas son coherentes (temperatura a ±1 °C de otro termómetro)', 'Cada línea ocupa menos de 40 bytes'] },
        { title: 'Fase 2 · Escribir en LittleFS', steps: ['Elige un esquema de particiones con espacio para archivos (el de 4 MB por defecto trae unos 1,4 MB).', 'Añade cada línea al archivo actual y ciérralo: cerrar es lo que asegura los datos.', 'Al pasar de 100 KB, renombra el archivo con un número y empieza otro. Guarda el siguiente número en NVS.'],
          code: `#include <LittleFS.h>

void rota();                                  // la escribes tú

bool anota(const char *linea) {
  File f = LittleFS.open("/actual.csv", FILE_APPEND);
  if (!f) return false;
  f.println(linea);
  size_t tam = f.size();
  f.close();                                  // cerrar = datos a salvo
  if (tam > 100000) rota();                   // renombra y empieza otro
  return true;
}

void setup() {
  Serial.begin(115200);
  if (!LittleFS.begin(true)) { Serial.println("LittleFS no monta"); return; }
  Serial.printf("Usado %u de %u bytes\\n", (unsigned)LittleFS.usedBytes(), (unsigned)LittleFS.totalBytes());
}`,
          checks: ['Tras 30 minutos hay 30 líneas sin huecos', 'Quitar la corriente a mitad de escritura no corrompe el sistema de archivos (probado 5 veces)'] },
        { title: 'Fase 3 · Menú por Serial', steps: ['Órdenes: “l” lista archivos con tamaño, “v nombre” vuelca uno, “b” borra todo tras pedir confirmación, “e” muestra el espacio libre.', 'Cuando quede menos de un 10 % libre, borra el archivo más antiguo.', 'Vuelca un archivo y ábrelo en una hoja de cálculo.'],
          checks: ['Abro un volcado en la hoja de cálculo y dibujo la temperatura', 'Al llenarse, borra el más antiguo y sigue grabando'] },
        { title: 'Fase 4 · Escribir menos', steps: ['Acumula 10 lecturas en RAM y escríbelas de golpe cada 10 minutos.', 'Calcula: bytes al día, sectores de 4 KB borrados al día y años hasta 100 000 ciclos (LittleFS reparte el desgaste por toda la partición).', 'Documenta cuántos datos puedes perder en un corte y si te parece aceptable.'],
          checks: ['He calculado la vida de la flash con mi ritmo de escritura', 'Un corte pierde como mucho 10 minutos de datos, y está documentado'] }
      ],
      extra: ['Descarga los CSV desde el navegador (módulo 6)', 'Hora real con un DS3231 o con NTP en lugar de segundos desde el arranque']
    },

    es_weblamp: {
      intro: 'Tu lámpara WS2812 sirve su propia página web: rueda de color, brillo y efectos con respuesta instantánea por WebSocket, nombre fácil lampara.local y configuración del WiFi sin tocar el código.',
      level: 3, hours: 10,
      skills: ['Servidor web y archivos en LittleFS', 'WebSocket en los dos sentidos', 'mDNS', 'Reconexión robusta y portal de configuración'],
      bom: ['La lámpara del proyecto del módulo 3', 'Un móvil u ordenador en la misma red WiFi'],
      phases: [
        { title: 'Fase 1 · Servidor y página', steps: ['Escribe un index.html con un selector de color (input type="color"), un deslizador de brillo y botones de efecto.', 'Súbelo a LittleFS con la herramienta de subida de archivos de tu IDE.', 'Sirve la página y anúnciate por mDNS. Muestra también la IP por Serial: algunos Android no resuelven .local.'],
          code: `#include <WiFi.h>
#include <WebServer.h>
#include <LittleFS.h>
#include <ESPmDNS.h>

WebServer server(80);

void setup() {
  Serial.begin(115200);
  LittleFS.begin(true);
  WiFi.mode(WIFI_STA);
  WiFi.begin("MI_RED", "MI_CLAVE");          // en la fase 4 lo sustituye el portal
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) delay(250);
  Serial.println(WiFi.localIP());
  MDNS.begin("lampara");                     // http://lampara.local
  server.serveStatic("/", LittleFS, "/index.html");
  server.onNotFound([]() { server.send(404, "text/plain", "No existe"); });
  server.begin();
}

void loop() {
  server.handleClient();
  // aquí sigue el código de la lámpara (toque y efectos)
}`,
          checks: ['La página carga desde lampara.local o desde la IP', 'La lámpara sigue respondiendo al toque con el servidor en marcha'] },
        { title: 'Fase 2 · WebSocket', steps: ['Instala la biblioteca WebSockets (de Markus Sattler) y abre un servidor en el puerto 81.', 'En la página: const ws = new WebSocket("ws://" + location.hostname + ":81/"); y en cada cambio del deslizador, ws.send("B:" + valor) (como mucho cada 30 ms).', 'En el ESP32, valida cada mensaje y reenvíalo a todos para que los demás móviles se actualicen.'],
          code: `#include <WebSocketsServer.h>
WebSocketsServer ws(81);
uint32_t color = 0xFF8800;
uint8_t brillo = 80, efecto = 0;

void alMensaje(uint8_t num, WStype_t tipo, uint8_t *datos, size_t len) {
  if (tipo != WStype_TEXT || len < 3 || len > 15 || datos[1] != ':') return;  // descarta lo raro
  char txt[16];
  memcpy(txt, datos, len);
  txt[len] = 0;
  const char *valor = txt + 2;
  switch (txt[0]) {
    case 'C': color = strtoul(valor, NULL, 16); break;          // "C:ff8800"
    case 'B': brillo = constrain(atoi(valor), 0, 255); break;   // "B:120"
    case 'E': efecto = constrain(atoi(valor), 0, 3); break;     // "E:2"
    default: return;
  }
  ws.broadcastTXT(txt);                     // los demás clientes se actualizan
}
// En setup(): ws.begin(); ws.onEvent(alMensaje);
// En loop():  ws.loop();`,
          checks: ['Mover el deslizador cambia el brillo sin retraso apreciable', 'Con dos móviles abiertos, cada uno ve los cambios del otro'] },
        { title: 'Fase 3 · Robustez', steps: ['Usa WiFi.onEvent para reaccionar a la desconexión y reintentar con esperas crecientes, sin bloquear loop().', 'WiFi.setSleep(false) reduce la latencia (a cambio de consumo).', 'En la página, reabre el WebSocket si se cierra y muestra el estado de conexión.'],
          checks: ['Tras apagar y encender el router, vuelve a funcionar sola en menos de un minuto', 'Sin WiFi, el toque y los efectos siguen funcionando'] },
        { title: 'Fase 4 · Portal de configuración', steps: ['Integra WiFiManager: si no hay credenciales o fallan, abre la red “Lampara-Config” con su portal.', 'Un toque largo al arrancar borra las credenciales.', 'Comprueba que la contraseña ya no aparece en el código fuente.'],
          checks: ['Con otra red WiFi, la configuro desde el móvil sin recompilar', 'Ninguna contraseña aparece en el código'] }
      ],
      extra: ['Amanecer simulado a una hora fija con NTP', 'Control desde un asistente de voz (especialidad de IoT)']
    },

    es_clock: {
      intro: 'Un reloj que nunca hay que poner en hora: toma la hora de internet, aplica el horario de verano solo y la muestra en cuatro matrices 8×8 con MAX7219. Con brillo automático para que de noche no deslumbre.',
      level: 2, hours: 7,
      skills: ['NTP y zonas horarias POSIX', 'Adaptación de niveles para chips de 5 V', 'Funcionar sin red tras sincronizar', 'Filtros e histéresis en sensores de luz'],
      bom: ['ESP32 DevKit', 'Módulo de 4 matrices MAX7219 (tipo FC-16)', '74AHCT125 (adaptador de nivel)', 'LDR y resistencia de 10 kΩ', 'Fuente de 5 V y 1 A', 'Condensador de 470 µF', 'Zumbador (opcional)'],
      phases: [
        { title: 'Fase 1 · La matriz', steps: ['El MAX7219 a 5 V espera unos 3,5 V para un “1”: pasa DIN (GPIO 23), CLK (18) y CS (5) por el 74AHCT125.', 'Instala MD_Parola y MD_MAX72XX y elige el tipo de hardware FC16_HW.', 'Desplaza un texto de prueba.'],
          checks: ['El texto se desplaza sin píxeles basura', 'He probado sin adaptador de nivel y he anotado qué pasa'] },
        { title: 'Fase 2 · La hora', steps: ['Conecta al WiFi y llama a configTzTime con la zona de España peninsular (Canarias: "WET0WEST,M3.5.0/1,M10.5.0").', 'Muestra HH:MM con los dos puntos parpadeando cada segundo.', 'Prueba el cambio de hora: fija con settimeofday una hora de prueba poco antes de las 3:00 del último domingo de octubre y observa.'],
          code: `#include <WiFi.h>
#include <time.h>

const char *ZONA = "CET-1CEST,M3.5.0,M10.5.0/3";   // peninsula y Baleares

void setup() {
  Serial.begin(115200);
  WiFi.begin("MI_RED", "MI_CLAVE");
  while (WiFi.status() != WL_CONNECTED) delay(250);
  configTzTime(ZONA, "es.pool.ntp.org", "pool.ntp.org");
}

void loop() {
  struct tm t;
  if (getLocalTime(&t, 1000)) {
    char txt[6];
    strftime(txt, sizeof(txt), "%H:%M", &t);
    Serial.println(txt);                 // aqui lo mandaras a la matriz
  } else {
    Serial.println("Sin hora todavia");
  }
  delay(1000);
}`,
          checks: ['La hora coincide con la del móvil (±1 s)', 'El cambio de horario de prueba se aplica solo'] },
        { title: 'Fase 3 · Sin internet', steps: ['Tras sincronizar, el reloj interno sigue contando aunque caiga el WiFi.', 'Muestra un punto en una esquina si hace más de 24 h de la última sincronización.', 'Opcional: apaga el WiFi tras sincronizar y reconéctalo cada 6 horas.'],
          checks: ['Sin router durante una hora, el reloj sigue en hora (±1 s)', 'El indicador de “sin sincronizar” funciona'] },
        { title: 'Fase 4 · Brillo automático y extras', steps: ['LDR con 10 kΩ al GPIO 34; filtra la lectura con una media exponencial.', 'Convierte la luz en intensidad 0–15 con histéresis para que no salte entre niveles.', 'Añade alarma con zumbador y la fecha desplazándose cada minuto.'],
          checks: ['De noche el brillo baja solo y no parpadea entre niveles', 'La alarma suena a la hora programada'] }
      ],
      extra: ['Muestra temperatura y humedad de un BME280', 'Hora por GPS para no depender de internet']
    }
  });

  Object.assign(PROJECTS, {
    es_radio: {
      intro: 'Escucha emisoras por internet en un altavoz con un DAC I²S. Es un ejercicio serio de tiempo real: descargar un flujo MP3 o AAC, decodificarlo y alimentar el DAC sin cortes, con el WiFi, los búferes y tu interfaz compitiendo por la CPU.',
      level: 4, hours: 16,
      skills: ['Flujos de audio y búferes', 'I²S hacia un DAC externo', 'Tareas con prioridad para tiempo real', 'Encoder rotativo e interfaz'],
      bom: ['ESP32 con PSRAM (WROVER o ESP32-S3 con PSRAM): muy recomendable para el búfer', 'DAC PCM5102A (salida de línea) o MAX98357A (altavoz directo)', 'Encoder rotativo con pulsador (KY-040)', 'OLED SSD1306', 'Altavoces activos o altavoz de 4 Ω', 'Fuente de 5 V y 2 A'],
      phases: [
        { title: 'Fase 1 · Primer sonido', steps: ['Instala la biblioteca ESP32-audioI2S (de schreibfaul1) y conecta el DAC: BCLK 26, LRC 25, DOUT 22.', 'Busca la URL directa del flujo de una emisora (suele acabar en .mp3 o .aac, o es un enlace “stream”).', 'Sube el programa y deja sonar 10 minutos.'],
          code: `#include <WiFi.h>
#include "Audio.h"                       // biblioteca ESP32-audioI2S

Audio audio;

void setup() {
  Serial.begin(115200);
  WiFi.begin("MI_RED", "MI_CLAVE");
  while (WiFi.status() != WL_CONNECTED) delay(250);
  WiFi.setSleep(false);                  // sin modem sleep: menos cortes
  audio.setPinout(26, 25, 22);           // BCLK, LRC, DOUT
  audio.setVolume(8);                    // 0..21
  audio.connecttohost("http://URL_DE_TU_EMISORA");
}

void loop() {
  audio.loop();                          // descarga, decodifica y rellena el I2S
}`,
          checks: ['Suena una emisora 10 minutos sin cortes', 'He anotado el formato y la tasa de bits de la emisora'] },
        { title: 'Fase 2 · Entender el búfer', steps: ['Calcula cuántos bytes por segundo llegan (128 kbit/s = 16 000 B/s) y cuántos salen hacia el DAC (44,1 kHz, 16 bits, estéreo).', 'Estima cuántos segundos de flujo caben en el búfer de entrada de tu configuración.', 'Experimenta: añade un delay(500) en loop() y escucha. Luego quítalo.'],
          checks: ['Sé cuántos segundos de búfer tengo y de qué depende', 'Explico por qué un delay en loop() corta el sonido'] },
        { title: 'Fase 3 · Interfaz', steps: ['Encoder en los GPIO 32 y 33 (con su pulsador en el 27): girar cambia el volumen; pulsar, la emisora.', 'Lista de emisoras en un JSON en LittleFS.', 'La OLED muestra emisora, volumen y el título que manda la emisora (la biblioteca avisa con una función de callback).'],
          checks: ['El volumen responde a cada paso del encoder sin saltos', 'Cambiar de emisora tarda menos de 3 s'] },
        { title: 'Fase 4 · Tiempo real de verdad', steps: ['Mueve audio.loop() a una tarea propia en el núcleo 1 con prioridad alta y pila generosa.', 'La interfaz (encoder y pantalla) va en otra tarea de menor prioridad y envía órdenes por una cola.', 'Desconecta el router 30 s y comprueba que se recupera solo.'],
          checks: ['Girar el encoder y redibujar la pantalla no produce cortes', 'Tras 30 s sin WiFi, vuelve a sonar sin tocar nada'] },
        { title: 'Fase 5 · Acabado', steps: ['Guarda emisora y volumen en NVS al cambiar.', 'Si oyes zumbido, revisa masas: una sola masa común y cables de audio cortos.', 'Monta todo en una caja con el altavoz.'],
          checks: ['Al encender vuelve a la última emisora y volumen', 'No hay zumbido audible con el volumen al 50 %'] }
      ],
      extra: ['Reproductor de MP3 desde microSD con la misma biblioteca', 'Receptor Bluetooth A2DP (solo ESP32 clásico) con la biblioteca ESP32-A2DP']
    },

    es_scope: {
      intro: 'Un instrumento de taller: el ESP32 captura una señal analógica con el ADC por DMA y varias entradas digitales, y las dibuja en tiempo real en el navegador del móvil. No sustituye a un osciloscopio, pero entenderás el disparo, el muestreo y el aliasing construyéndolos.',
      level: 4, hours: 24,
      skills: ['ADC continuo con DMA (driver de ESP-IDF)', 'Disparo y ventanas de captura', 'Datos binarios por WebSocket y dibujo en canvas', 'Muestreo rápido de GPIO por registros'],
      bom: ['ESP32 DevKit', 'Resistencias para un divisor de entrada y diodo BAT54S de protección', 'Condensadores de 100 nF', 'Otro ESP32 o el propio LEDC como generador de pruebas', 'Cables y pinzas de cocodrilo'],
      phases: [
        { title: 'Fase 1 · Muestreo continuo', steps: ['Seguridad: solo señales de 0 a 3,3 V (o con divisor). Nunca la red eléctrica.', 'Genera una señal de prueba: PWM de 1 kHz con LEDC en el GPIO 25 y únelo al GPIO 34 (canal 6 del ADC1).', 'Usa el driver de ADC continuo de ESP-IDF, accesible desde Arduino. C++ exige los campos de las estructuras en su orden: revisa el ejemplo continuous_read de tu versión.'],
          code: `#include "esp_adc/adc_continuous.h"

adc_continuous_handle_t adc;
uint8_t crudo[1024];

void iniciaADC() {
  adc_continuous_handle_cfg_t hc = { .max_store_buf_size = 4096, .conv_frame_size = 1024 };
  adc_continuous_new_handle(&hc, &adc);
  adc_digi_pattern_config_t pat = {};
  pat.atten = ADC_ATTEN_DB_12;           // ADC_ATTEN_DB_11 en versiones antiguas
  pat.channel = ADC_CHANNEL_6;           // GPIO 34
  pat.unit = ADC_UNIT_1;
  pat.bit_width = SOC_ADC_DIGI_MAX_BITWIDTH;
  adc_continuous_config_t cfg = {};
  cfg.pattern_num = 1;
  cfg.adc_pattern = &pat;
  cfg.sample_freq_hz = 100000;           // 100 kHz
  cfg.conv_mode = ADC_CONV_SINGLE_UNIT_1;
  cfg.format = ADC_DIGI_OUTPUT_FORMAT_TYPE1;
  adc_continuous_config(adc, &cfg);
  adc_continuous_start(adc);
}

int leeMuestras(uint16_t *dest, int max) {
  uint32_t n = 0;
  if (adc_continuous_read(adc, crudo, sizeof(crudo), &n, 100) != ESP_OK) return 0;
  int k = 0;
  for (uint32_t i = 0; i + SOC_ADC_DIGI_RESULT_BYTES <= n && k < max; i += SOC_ADC_DIGI_RESULT_BYTES) {
    adc_digi_output_data_t *d = (adc_digi_output_data_t *)&crudo[i];
    dest[k++] = d->type1.data;           // 12 bits en el ESP32 clasico
  }
  return k;
}`,
          checks: ['Capturo 1024 muestras seguidas del PWM de 1 kHz y veo 10 periodos', 'Sé convertir el valor bruto a tensión y por qué no es exacto'] },
        { title: 'Fase 2 · Disparo', steps: ['Busca en la captura el primer cruce ascendente de un nivel (por ejemplo 1,6 V) con histéresis para que el ruido no dispare.', 'Guarda una ventana de 500 puntos con un 20 % antes del disparo.', 'Calcula frecuencia (entre cruces) y tensión pico a pico.'],
          checks: ['La onda queda quieta en pantalla (disparo estable)', 'La frecuencia medida está a menos del 1 % de la del LEDC'] },
        { title: 'Fase 3 · En el navegador', steps: ['Servidor web con una página que tiene un canvas y un WebSocket.', 'Envía cada ventana como datos binarios de 8 bits por punto (broadcastBIN): 500 bytes por imagen.', 'Desde la página, cambia base de tiempos y nivel de disparo (mensajes de texto al ESP32).'],
          checks: ['El móvil refresca al menos 10 veces por segundo', 'Cambiar la base de tiempos desde el móvil funciona'] },
        { title: 'Fase 4 · Analizador lógico', steps: ['Los GPIO 32 a 39 están en el registro GPIO_IN1: leyendo un solo registro tienes 6 entradas útiles (32, 33, 34, 35, 36 y 39).', 'Captura en una tarea del núcleo 1 a ritmo fijo contando ciclos de CPU.', 'Captura una trama UART a 115 200 baudios de otro ESP32 y decodifícala en la página.'],
          code: `uint8_t muestras[8192];

// A 240 MHz, 240 ciclos por muestra = 1 MHz de muestreo
void capturaLogica(uint32_t ciclosPorMuestra) {
  uint32_t t = ESP.getCycleCount();
  for (int i = 0; i < 8192; i++) {
    muestras[i] = REG_READ(GPIO_IN1_REG) & 0xFF;   // bit 0 = GPIO32 ... bit 7 = GPIO39
    t += ciclosPorMuestra;
    while ((int32_t)(ESP.getCycleCount() - t) < 0) { }   // espera activa exacta
  }
}`,
          checks: ['Decodifico a mano (o en la página) una trama UART real', 'He encontrado el muestreo máximo antes de perder flancos y lo he anotado'] },
        { title: 'Fase 5 · Pulido', steps: ['Autoescala, cursores de tiempo y tensión en la página.', 'Guardar una captura como CSV en LittleFS y descargarla.', 'Escribe en una tarjeta las limitaciones de tu instrumento (ancho de banda, impedancia de entrada, rango).'],
          checks: ['Descargo una captura y la abro en la hoja de cálculo', 'Mi ficha de limitaciones está escrita y medida'] }
      ],
      extra: ['Decodificador de I²C en JavaScript', 'Etapa de entrada con amplificador operacional y ganancia seleccionable']
    },

    es_arm: {
      intro: 'Un brazo de cuatro servos (base, hombro, codo y pinza) que manejas desde el móvil con deslizadores, y que además graba y reproduce secuencias. Aprenderás a alimentar servos sin reinicios, a suavizar movimientos y a no romper nada con los límites.',
      level: 4, hours: 18,
      skills: ['Driver de servos PCA9685 por I²C', 'Perfiles de movimiento suaves', 'Mando en tiempo real por WebSocket', 'Seguridad: límites, paradas y corriente'],
      bom: ['Kit de brazo de 4 ejes (tipo MeArm) con servos SG90 o MG90S', 'Placa PCA9685 de 16 canales', 'Fuente de 5–6 V y 3 A para los servos y condensador de 1000 µF', 'ESP32 DevKit', 'INA219 (opcional, para medir corriente)', 'Pulsador de parada de emergencia'],
      phases: [
        { title: 'Fase 1 · Servos con PCA9685', steps: ['PCA9685 a 3V3 (lógica) y SDA 21 / SCL 22; la fuente de 5–6 V a su borne V+ con el condensador. Masas unidas.', 'Calibra cada servo a mano: busca el pulso mínimo y máximo sin llegar al tope mecánico (si zumba, está forzando).', 'Anota los límites en el código.'],
          code: `#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
Adafruit_PWMServoDriver pca(0x40);

// Limites medidos a mano para cada servo (us). No fuerces los topes.
const uint16_t MIN_US[4] = {600, 800, 700, 1000};
const uint16_t MAX_US[4] = {2300, 2100, 2200, 1700};

void moverServo(uint8_t s, float fraccion) {          // 0.0 .. 1.0
  fraccion = constrain(fraccion, 0.0f, 1.0f);
  uint16_t us = MIN_US[s] + fraccion * (MAX_US[s] - MIN_US[s]);
  pca.writeMicroseconds(s, us);
}

void setup() {
  Wire.begin(21, 22);
  pca.begin();
  pca.setOscillatorFrequency(25000000);
  pca.setPWMFreq(50);
}

void loop() {}`,
          checks: ['Cada servo tiene sus límites medidos y anotados', 'Moviendo los cuatro a la vez, el ESP32 no se reinicia'] },
        { title: 'Fase 2 · Movimiento suave', steps: ['Cada servo tiene una posición objetivo y una actual.', 'Una tarea a 50 Hz acerca la actual al objetivo con velocidad máxima limitada (y, si quieres, aceleración).', 'Nada de saltos: ni al arrancar (lleva el brazo a reposo despacio) ni al cambiar de objetivo.'],
          checks: ['De extremo a extremo tarda al menos 1 s sin tirones', 'Al encender no da un latigazo'] },
        { title: 'Fase 3 · Mando por WebSocket', steps: ['Página con cuatro deslizadores y un botón “reposo”.', 'Mensajes como “S2:0.45”; valida servo y rango en el ESP32.', 'Si el cliente se desconecta, el brazo se queda quieto donde está.'],
          checks: ['El brazo sigue a los deslizadores sin retraso apreciable', 'Cerrar la página no provoca movimientos'] },
        { title: 'Fase 4 · Grabar y reproducir', steps: ['Botón “grabar punto” que guarda las cuatro posiciones como fotograma clave.', 'Reproduce la secuencia interpolando entre puntos con la tarea de movimiento suave.', 'Guarda secuencias en LittleFS con nombre.'],
          checks: ['Graba una secuencia de 6 puntos y la repite igual 5 veces', 'La secuencia sobrevive a un reinicio'] },
        { title: 'Fase 5 · Seguridad', steps: ['Pulsador de emergencia con interrupción: deja de mandar pulsos (los servos quedan libres) al instante.', 'Con el INA219 en la alimentación de servos, detecta un atasco (corriente alta más de 1 s) y relaja la pinza.', 'Documenta qué pasa si se cae el WiFi en mitad de una secuencia.'],
          checks: ['La parada de emergencia actúa en menos de 50 ms', 'Si bloqueo la pinza con la mano, se detecta y se relaja en menos de 1 s'] }
      ],
      extra: ['Cinemática inversa: mueve la pinza a un punto (x, y, z)', 'Mando físico con joystick por ESP-NOW (módulo 7)']
    },

    es_otaportal: {
      intro: 'Una plantilla que copiarás en cada proyecto con WiFi: portal de configuración, nombre mDNS, actualización por red protegida (desde el IDE y desde una página), página de estado y vuelta atrás si una versión nueva no arranca bien.',
      level: 3, hours: 8,
      skills: ['ArduinoOTA y la biblioteca Update', 'Particiones ota_0 / ota_1 en la práctica', 'Rollback y confirmación de versión', 'Proteger la actualización'],
      bom: ['ESP32 DevKit (y otro de pruebas)', 'Ordenador en la misma red'],
      phases: [
        { title: 'Fase 1 · OTA desde el IDE', steps: ['Usa un esquema de particiones con dos apps (el de 4 MB por defecto lo tiene).', 'Integra la función de la fase y llama a ArduinoOTA.handle() en loop().', 'La placa aparecerá como puerto de red en el IDE: sube por ahí.'],
          code: `#include <WiFi.h>
#include <ArduinoOTA.h>

void iniciaOTA(const char *nombre, const char *clave) {
  ArduinoOTA.setHostname(nombre);
  ArduinoOTA.setPassword(clave);           // sin clave, cualquiera en tu red podria flashear
  ArduinoOTA.onStart([]() { /* para motores, cierra archivos... */ });
  ArduinoOTA.onError([](ota_error_t e) { Serial.printf("OTA error %u\\n", e); });
  ArduinoOTA.begin();
}
// En loop(): ArduinoOTA.handle();`,
          checks: ['Subo un programa por red desde el IDE', 'Con una clave equivocada, la subida se rechaza'] },
        { title: 'Fase 2 · OTA desde una página', steps: ['Página con un selector de archivo que envía el .bin por POST a /update (protegida con server.authenticate).', 'El manejador escribe los trozos con la biblioteca Update a medida que llegan.', 'Exporta el binario desde el IDE y súbelo desde el navegador.'],
          code: `#include <Update.h>
// Dentro de setup(), con un WebServer server(80) ya creado:
server.on("/update", HTTP_POST,
  []() {                                         // al terminar
    server.send(200, "text/plain", Update.hasError() ? "FALLO" : "OK, reiniciando");
    delay(500);
    ESP.restart();
  },
  []() {                                         // por cada trozo del archivo
    HTTPUpload &up = server.upload();
    if (up.status == UPLOAD_FILE_START) Update.begin(UPDATE_SIZE_UNKNOWN);
    else if (up.status == UPLOAD_FILE_WRITE) Update.write(up.buf, up.currentSize);
    else if (up.status == UPLOAD_FILE_END) Update.end(true);   // true: tamano = lo recibido
  });`,
          checks: ['Actualizo desde el navegador con el .bin exportado', 'Si subo un archivo que no es firmware, se rechaza y el equipo sigue funcionando con la versión anterior'] },
        { title: 'Fase 3 · Portal, mDNS y estado', steps: ['WiFiManager para las credenciales y mDNS con un nombre configurable.', 'Página /estado en JSON: versión (una constante en tu código), tiempo encendido, RSSI, memoria libre, motivo del último reinicio y partición en uso (esp_ota_get_running_partition()->label).', 'Haz dos OTA seguidas y mira cómo alterna entre app0 y app1.'],
          checks: ['La página de estado muestra qué partición está corriendo', 'Tras cada OTA cambia la partición y sube la versión'] },
        { title: 'Fase 4 · Vuelta atrás', steps: ['El rollback lo hace el bootloader si está activado (en ESP-IDF: CONFIG_BOOTLOADER_APP_ROLLBACK_ENABLE). Con el núcleo Arduino precompilado puede no estarlo: averígualo.', 'Tras arrancar, comprueba que todo va bien (WiFi conectado, sensores respondiendo) y solo entonces confirma la versión.', 'Prueba con una versión que se reinicia en bucle a propósito.'],
          code: `#include <esp_ota_ops.h>

// Llamar cuando la nueva versión haya demostrado que funciona
void confirmaVersion() {
  const esp_partition_t *p = esp_ota_get_running_partition();
  esp_ota_img_states_t estado;
  if (esp_ota_get_state_partition(p, &estado) == ESP_OK && estado == ESP_OTA_IMG_PENDING_VERIFY)
    esp_ota_mark_app_valid_cancel_rollback();   // si no se llama y se reinicia: vuelve a la anterior
}`,
          checks: ['Con rollback activo, una versión rota vuelve sola a la anterior (o he documentado por qué mi entorno no lo permite y cómo activarlo)', 'Mi plantilla está guardada y la he usado en otro proyecto'] }
      ],
      extra: ['OTA desde un servidor propio (HTTPUpdate) que comprueba si hay versión nueva', 'Firma de imágenes con Secure Boot en una placa de pruebas (¡irreversible!)']
    },

    es_rccar: {
      intro: 'Dos ESP32: un mando con joystick y un coche con dos motores. Se hablan por ESP-NOW unas 50 veces por segundo, sin router y con latencia de milisegundos, y el coche se para solo si pierde el mando. Mecánica, potencia y radio en un solo proyecto.',
      level: 4, hours: 24,
      skills: ['Driver TB6612FNG y PWM a 20 kHz', 'Joystick por ADC1 con zona muerta', 'Protocolo binario sobre ESP-NOW', 'Failsafe y telemetría de vuelta'],
      bom: ['2 placas ESP32 (el mando puede ser un ESP32-C3)', 'Chasis 2WD con motores TT o N20', 'Driver TB6612FNG', 'Batería 2S (2 × 18650 con BMS) e interruptor', 'Convertidor buck a 5 V (2 A o más)', 'Joystick analógico (KY-023) y 2 pulsadores', 'Para el mando: LiPo 1S con cargador protegido (TP4056 + DW01)', 'Resistencias para medir la batería'],
      phases: [
        { title: 'Fase 1 · Motores', steps: ['Seguridad: baterías de litio con BMS, cargador adecuado y nunca por debajo de 3,0 V por celda. Carga sobre superficie no inflamable.', 'TB6612: VM a la batería, VCC a 3,3 V, STBY al GPIO 13, motor izquierdo AIN1/AIN2/PWMA a 26/27/25, derecho BIN1/BIN2/PWMB a 32/33/4.', 'El ESP32 se alimenta del buck; condensador de 470 µF en VM.', 'Prueba cada rueda en ambos sentidos.'],
          code: `struct Motor { int in1, in2, pwm; };
const Motor IZQ = {26, 27, 25}, DER = {32, 33, 4};
const int STBY = 13;

void iniciaMotor(const Motor &m) {
  pinMode(m.in1, OUTPUT);
  pinMode(m.in2, OUTPUT);
  ledcAttach(m.pwm, 20000, 10);   // 20 kHz: inaudible; 10 bits caben (80 MHz / 20 kHz = 4000)
}

void velocidad(const Motor &m, int v) {   // -1023 .. 1023
  digitalWrite(m.in1, v > 0);
  digitalWrite(m.in2, v < 0);
  ledcWrite(m.pwm, abs(v));
}

void setup() {
  pinMode(STBY, OUTPUT);
  digitalWrite(STBY, HIGH);
  iniciaMotor(IZQ);
  iniciaMotor(DER);
}

void loop() {}`,
          checks: ['Cada rueda gira en los dos sentidos y a velocidad variable', 'Con las dos ruedas a tope en el suelo, el ESP32 no se reinicia'] },
        { title: 'Fase 2 · El mando', steps: ['Joystick a los GPIO 34 y 35: son del ADC1 y siguen funcionando con la radio encendida (el ADC2 no).', 'Calibra el centro al arrancar y aplica una zona muerta del 5 %.', 'Mezcla: izquierda = y + x, derecha = y − x, limitadas a ±1023.'],
          checks: ['En reposo el mando da (0, 0)', 'Los valores cubren todo el rango en las cuatro direcciones'] },
        { title: 'Fase 3 · Enlace ESP-NOW', steps: ['Apunta la MAC del coche (la imprime el receptor).', 'El mando registra al coche como par y envía un paquete cada 20 ms.', 'El receptor guarda el último paquete y su hora; si pasan más de 300 ms sin nada, motores a 0.', 'Mide el alcance en interior y en campo abierto.'],
          code: `#include <WiFi.h>
#include <esp_now.h>

struct Paquete { int16_t izq, der; uint8_t botones, seq; };
Paquete ultimo = {0, 0, 0, 0};
volatile uint32_t tUltimo = 0;
portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;

// Firma de ESP-IDF 5 (núcleo Arduino 3.x)
void alRecibir(const esp_now_recv_info_t *info, const uint8_t *datos, int len) {
  if (len != sizeof(Paquete)) return;            // descarta tamaños raros
  portENTER_CRITICAL(&mux);
  memcpy(&ultimo, datos, sizeof(Paquete));
  tUltimo = millis();
  portEXIT_CRITICAL(&mux);
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  Serial.println(WiFi.macAddress());             // la necesita el mando
  if (esp_now_init() != ESP_OK) { Serial.println("ESP-NOW no arranca"); return; }
  esp_now_register_recv_cb(alRecibir);
}

void loop() {
  Paquete p; uint32_t t;
  portENTER_CRITICAL(&mux); p = ultimo; t = tUltimo; portEXIT_CRITICAL(&mux);
  if (millis() - t > 300) { /* failsafe: velocidad(IZQ, 0); velocidad(DER, 0); */ }
  else { /* velocidad(IZQ, p.izq); velocidad(DER, p.der); */ }
  delay(10);
}`,
          checks: ['El coche obedece sin retraso apreciable', 'Si apago el mando en marcha, el coche se para en menos de 0,5 s', 'He anotado el alcance en interior y en exterior'] },
        { title: 'Fase 4 · Telemetría de vuelta', steps: ['El coche mide su batería (divisor al GPIO 36, ADC1) y la manda de vuelta con el RSSI del último paquete.', 'El mando enciende un LED de aviso por debajo de 6,6 V (3,3 V por celda).', 'Cuenta paquetes perdidos con el campo seq.'],
          checks: ['El mando avisa de batería baja antes de que el BMS corte', 'Sé qué porcentaje de paquetes se pierde a 20 m'] },
        { title: 'Fase 5 · Afinado', steps: ['Rampas de aceleración para que no derrape ni haga picos de corriente.', 'Ajuste fino (trim) para que vaya recto, guardado en NVS del coche.', 'Botón turbo con límite de tiempo.'],
          checks: ['Va recto con el joystick hacia delante', 'Las rampas eliminan los reinicios y los derrapes'] }
      ],
      extra: ['Modo autónomo seguidor de línea', 'Vídeo FPV con una ESP32-CAM en el coche']
    },

    es_blekbd: {
      intro: 'Un mando de bolsillo que el portátil o el móvil reconocen como teclado Bluetooth: pasa diapositivas, controla el volumen o la música. Funciona a batería y se empareja como cualquier teclado comercial.',
      level: 3, hours: 8,
      skills: ['Perfil HID sobre BLE', 'Pulsaciones cortas y largas', 'Nivel de batería por BLE', 'Bajo consumo con despertar por botón'],
      bom: ['ESP32 DevKit o ESP32-C3 SuperMini', '4 pulsadores', 'LiPo 1S de 300–500 mAh con cargador protegido (TP4056 + DW01)', 'Interruptor, LED y caja pequeña', 'Resistencias para medir la batería'],
      phases: [
        { title: 'Fase 1 · Teclado BLE', steps: ['Instala la biblioteca ESP32-BLE-Keyboard. Las versiones antiguas no compilan con el núcleo 3.x: usa una bifurcación actualizada o su modo NimBLE.', 'Pulsadores entre los GPIO 32 y 33 y GND.', 'Empareja desde el ordenador como cualquier teclado y abre una presentación.'],
          code: `#include <BleKeyboard.h>          // ESP32-BLE-Keyboard (version compatible con el nucleo 3.x)
BleKeyboard teclado("Mando Voltio", "Voltio", 100);

const int SIG = 32, ANT = 33;

void setup() {
  pinMode(SIG, INPUT_PULLUP);
  pinMode(ANT, INPUT_PULLUP);
  teclado.begin();
}

void loop() {
  if (!teclado.isConnected()) { delay(100); return; }
  if (digitalRead(SIG) == LOW) { teclado.write(KEY_RIGHT_ARROW); delay(250); }
  if (digitalRead(ANT) == LOW) { teclado.write(KEY_LEFT_ARROW); delay(250); }
  delay(10);
}`,
          checks: ['El ordenador lo reconoce como teclado y pasa diapositivas', 'Tras reiniciar el mando, se reconecta solo'] },
        { title: 'Fase 2 · Más funciones', steps: ['Antirrebote correcto (sin delay de 250 ms) y detección de pulsación larga.', 'Corto: diapositiva; largo: pantalla en negro (tecla B en muchos programas de presentaciones).', 'Los otros dos botones: volumen arriba y abajo (teclas multimedia de la biblioteca).'],
          checks: ['Corto y largo hacen cosas distintas sin errores', 'Las teclas multimedia cambian el volumen del ordenador'] },
        { title: 'Fase 3 · Batería', steps: ['Divisor de dos resistencias iguales de 100 kΩ con 100 nF desde la batería al GPIO 34 (máximo 2,1 V en el pin).', 'Convierte la tensión en porcentaje con una tabla aproximada de la LiPo (4,2 V = 100 %, 3,3 V = 0 %).', 'Comunícalo con setBatteryLevel(): el ordenador lo mostrará.'],
          checks: ['El sistema operativo muestra el nivel de batería del mando', 'El porcentaje baja de forma razonable al descargarse'] },
        { title: 'Fase 4 · Consumo', steps: ['Mide el consumo conectado y en espera.', 'Tras 10 minutos sin usarlo, deep sleep con despertar EXT1 por cualquiera de los botones (todos en pines RTC).', 'Mide cuánto tarda en reconectar tras despertar y la autonomía estimada.'],
          checks: ['En deep sleep el mando entero consume menos de 1 mA (mejor si es menos de 100 µA)', 'Tras despertar, reconecta en menos de 3 s'] }
      ],
      extra: ['Versión por USB nativo con un ESP32-S3 (USB HID, sin emparejar)', 'Ratón aéreo con un acelerómetro MPU6050']
    },

    es_beacon: {
      intro: 'Una baliza BLE en el llavero y un receptor en casa que la detecta por la intensidad de señal: enciende la luz de la entrada al llegar y avisa si te dejas las llaves al salir. Aprenderás publicidad, escaneo y a sacar algo útil de un RSSI muy ruidoso.',
      level: 3, hours: 10,
      skills: ['Anuncios BLE con datos de fabricante', 'Escaneo y filtrado', 'Filtrado de RSSI con histéresis y tiempos', 'Medir autonomía real'],
      bom: ['2 placas ESP32 (la baliza, mejor un ESP32-C3 pequeño)', 'LiPo 1S pequeña con cargador protegido para la baliza', 'Para el receptor: MOSFET y tira LED de 12 V o un LED, y un interruptor de láminas (reed) con imán para la puerta', 'Zumbador'],
      phases: [
        { title: 'Fase 1 · La baliza', steps: ['Anuncia cada segundo unos datos de fabricante con un identificador propio. 0xFFFF es el identificador de fabricante reservado para pruebas.', 'Compruébalo con la app nRF Connect en el móvil.', 'Mide el consumo medio de la baliza.'],
          code: `#include <BLEDevice.h>
#include <BLEAdvertising.h>

void setup() {
  BLEDevice::init("LLAVES");
  BLEAdvertising *adv = BLEDevice::getAdvertising();
  BLEAdvertisementData datos;
  datos.setFlags(0x06);                          // solo BLE, descubrible
  String fab = String("\\xFF\\xFF") + "VOLTIO01";  // 0xFFFF: fabricante de pruebas
  datos.setManufacturerData(fab);
  adv->setAdvertisementData(datos);
  adv->setMinInterval(1600);                     // 1600 x 0,625 ms = 1 s
  adv->setMaxInterval(1600);
  adv->start();
}

void loop() { delay(1000); }`,
          checks: ['nRF Connect muestra la baliza y sus datos de fabricante', 'He medido el consumo medio de la baliza'] },
        { title: 'Fase 2 · El receptor', steps: ['Escanea de forma continua con una clase de callbacks (onResult) y filtra los anuncios cuyo dato de fabricante empiece por 0xFFFF y “VOLTIO”.', 'Imprime el RSSI de cada anuncio de la baliza.', 'Registra el RSSI a 1, 3 y 10 m, y con la baliza en tu bolsillo de espaldas.'],
          checks: ['El receptor ve la baliza a 10 m dentro de casa', 'Tengo una tabla de RSSI frente a distancia y postura'] },
        { title: 'Fase 3 · Presente o ausente', steps: ['Filtra el RSSI con una media exponencial.', 'Presente si el RSSI filtrado supera −75 dBm; ausente si no se ve ningún anuncio en 30 s. El hueco entre condiciones es tu histéresis.', 'Deja la baliza quieta a 5 m una hora y cuenta falsos cambios.'],
          checks: ['Ningún falso “ausente” en una hora con la baliza quieta a 5 m', 'Al llegar a casa se detecta en menos de 5 s'] },
        { title: 'Fase 4 · Actuar', steps: ['Al pasar a presente, enciende la luz de la entrada 2 minutos (MOSFET y tira de 12 V, o un LED).', 'Interruptor reed en la puerta: si se abre y la baliza sigue dentro durante 20 s, pita (te dejas las llaves).', 'Calcula la autonomía real de la baliza y compárala con la teórica. Para durar años con una pila de botón hacen falta chips como los nRF52: anótalo.'],
          checks: ['La luz se enciende sola al llegar', 'El aviso de llaves olvidadas funciona en 3 de 3 pruebas'] }
      ],
      extra: ['Varios receptores para saber en qué habitación estás', 'Usa el móvil como baliza (las apps de iBeacon lo permiten)']
    },

    es_station: {
      intro: 'Un nodo exterior que mide temperatura, humedad y presión cada 10 minutos, lo envía y vuelve a dormir. Con una 18650 y un panel solar pequeño no debería apagarse nunca. Aquí no vale “más o menos”: medirás microamperios.',
      level: 4, hours: 22,
      skills: ['Presupuesto de energía de verdad', 'Deep sleep y memoria RTC', 'ESP-NOW rápido sin buscar canal', 'Carga solar segura de Li-ion'],
      bom: ['Placa de bajo consumo (FireBeetle ESP32, LOLIN D32…) o módulo ESP32 suelto con un LDO de poca corriente de reposo (MCP1700-3302 o HT7333)', 'Sensor BME280', 'Celda 18650 protegida y portapilas', 'Cargador solar (CN3791, o TP4056 con protección)', 'Panel solar de 6 V y 1–2 W', 'Resistencias de 1 MΩ y condensador de 100 nF para medir la batería', 'Caja estanca con rejilla a la sombra (tipo pantalla Stevenson)', 'Multímetro con rango de µA', 'Otro ESP32 como pasarela'],
      phases: [
        { title: 'Fase 1 · Presupuesto', steps: ['Mide el consumo en deep sleep de tu placa entera, no del chip. Si ronda los mA, cambia de placa o de regulador.', 'Estima el ciclo: despierto 300 ms a unos 100 mA cada 10 minutos, más el sueño.', 'Calcula la autonomía sin sol con tu batería y decide si el panel tiene sentido para tu clima en invierno.'],
          checks: ['El nodo completo duerme por debajo de 50 µA (medido)', 'Tengo una hoja con la corriente media y la autonomía sin sol'] },
        { title: 'Fase 2 · Despertar, medir, enviar, dormir', steps: ['Guarda en memoria RTC un contador de ciclos y el canal de la pasarela: así no lo buscas en cada despertar.', 'Pon el BME280 en modo forzado (mide una vez y se duerme él también).', 'Envía por ESP-NOW y duerme 10 minutos. Mide cuánto tiempo pasa despierto.'],
          code: `#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>

RTC_DATA_ATTR uint32_t ciclo = 0;    // sobrevive al deep sleep
RTC_DATA_ATTR uint8_t canal = 1;     // canal de la pasarela
const uint8_t PASARELA[6] = {0x24, 0x6F, 0x28, 0x00, 0x00, 0x00};   // pon la MAC real

struct Medida { uint32_t ciclo; float t, h, p, vbat; };

void duerme(uint32_t segundos) {
  esp_sleep_enable_timer_wakeup((uint64_t)segundos * 1000000ULL);
  esp_deep_sleep_start();
}

void setup() {
  ciclo++;
  Medida m = { ciclo, 0, 0, 0, 0 };
  // 1) Lee el BME280 en modo forzado y la bateria (te toca)
  WiFi.mode(WIFI_STA);
  esp_wifi_set_channel(canal, WIFI_SECOND_CHAN_NONE);
  if (esp_now_init() == ESP_OK) {
    esp_now_peer_info_t par = {};
    memcpy(par.peer_addr, PASARELA, 6);
    par.channel = canal;
    esp_now_add_peer(&par);
    esp_now_send(PASARELA, (uint8_t *)&m, sizeof(m));
    delay(20);                       // mejor: espera al callback de envio
  }
  duerme(600);                       // 10 minutos
}

void loop() {}`,
          checks: ['El nodo pasa menos de 300 ms despierto por ciclo (medido)', 'La pasarela recibe todos los ciclos de 24 horas'] },
        { title: 'Fase 3 · La pasarela', steps: ['Un ESP32 siempre encendido recibe, pone la hora (NTP) y guarda en LittleFS (reutiliza el registrador).', 'Página web con la última lectura y una gráfica del día.', 'Detecta ciclos perdidos con el contador.'],
          checks: ['La pasarela muestra la gráfica de 24 h', 'Avisa si un nodo lleva más de 30 minutos sin dar señales'] },
        { title: 'Fase 4 · Sol y batería', steps: ['Seguridad: celda protegida, cargador que no cargue por debajo de 0 °C ni con mucho calor, y la batería a la sombra.', 'Mide la batería con un divisor de 1 MΩ + 1 MΩ y 100 nF en el pin (casi no gasta: 2 µA).', 'Modo ahorro: por debajo de 3,4 V, duerme 1 hora en vez de 10 minutos.', 'Registra una semana de tensión de batería.'],
          checks: ['En una semana con sol, la tensión de la batería se mantiene o sube', 'El modo ahorro entra y sale en los umbrales previstos'] },
        { title: 'Fase 5 · Intemperie', steps: ['Caja estanca con el sensor en una rejilla ventilada y a la sombra: al sol, medirías la temperatura de la caja.', 'Prensaestopas para los cables y bolsita desecante.', 'Déjalo funcionando un mes.'],
          checks: ['Un mes fuera sin perder datos', 'La temperatura coincide con una estación de referencia (±1 °C)'] }
      ],
      extra: ['ULP: medir la batería sin despertar la CPU principal', 'Pluviómetro de balancín: cada pulso despierta por EXT0 y suma en memoria RTC']
    },

    es_cam: {
      intro: 'Una cámara a batería que duerme hasta que un sensor PIR detecta movimiento, hace una foto, la guarda en la microSD y vuelve a dormir. Ideal para descubrir qué animal visita tu huerto. Todo en local, sin nube.',
      level: 4, hours: 15,
      skills: ['ESP32-CAM: programación y alimentación', 'Cámara y microSD en modo de 1 bit', 'Despertar EXT0 con un PIR', 'Ahorro de energía con periféricos que gastan'],
      bom: ['ESP32-CAM (AI-Thinker, sensor OV2640)', 'Programador USB-serie de 3,3 V o placa ESP32-CAM-MB', 'Tarjeta microSD de 32 GB o menos en FAT32', 'Sensor PIR AM312 (bajo consumo, 3,3 V)', 'Batería 18650 protegida con regulador de 5 V o de 3,3 V de suficiente corriente', 'Caja con ventana transparente'],
      phases: [
        { title: 'Fase 1 · Programar la ESP32-CAM', steps: ['No tiene USB: programa con el adaptador (GPIO 0 a GND al arrancar para el modo descarga) o con la placa ESP32-CAM-MB.', 'Aliméntala con 5 V capaces de 1 A: la cámara y el WiFi juntos provocan picos.', 'Sube el ejemplo CameraWebServer eligiendo el modelo AI_THINKER y mira el vídeo en el navegador.', 'Privacidad: no apuntes a espacios de otras personas ni a la vía pública.'],
          checks: ['Veo vídeo en el navegador con el ejemplo', 'Si salía “Brownout”, lo he resuelto con alimentación (no desactivando el detector)'] },
        { title: 'Fase 2 · Foto a la microSD', steps: ['Inicia la tarjeta en modo de 1 bit: así solo usa una línea de datos y quedan libres los GPIO 4 (LED de flash), 12 y 13.', 'Captura, guarda con un nombre único (contador en NVS) y devuelve el búfer.', 'Descarta las 2 o 3 primeras capturas tras encender: la cámara necesita ajustar exposición y balance de blancos.'],
          code: `#include "esp_camera.h"
#include "SD_MMC.h"

bool guardaFoto(const char *ruta) {
  camera_fb_t *fb = esp_camera_fb_get();         // captura un JPEG
  if (!fb) return false;
  File f = SD_MMC.open(ruta, FILE_WRITE);
  bool ok = f && f.write(fb->buf, fb->len) == fb->len;
  if (f) f.close();
  esp_camera_fb_return(fb);                      // devuelve el bufer o se agota la memoria
  return ok;
}
// En setup(): configura la camara con los pines de la AI-Thinker (como en el ejemplo)
// y SD_MMC.begin("/sdcard", true): modo de 1 bit`,
          checks: ['Cada foto se guarda con un nombre distinto', 'Las fotos no salen verdes ni oscuras'] },
        { title: 'Fase 3 · PIR y deep sleep', steps: ['Salida del PIR al GPIO 13 (es GPIO RTC) y despertar EXT0 por nivel alto.', 'Al despertar: cámara, foto, guardar, y esperar a que el PIR vuelva a bajo antes de dormir (si no, despierta al instante).', 'Mide el tiempo del movimiento a la foto y el consumo dormido.'],
          checks: ['Del movimiento a la foto pasan menos de 1,5 s', 'He medido el consumo dormido y la autonomía estimada'] },
        { title: 'Fase 4 · Hora en el nombre', steps: ['Sin WiFi no hay hora. Opción A: una sincronización NTP al día (despertar por temporizador) y la hora guardada con el reloj RTC.', 'Opción B: un DS3231 por I²C en los GPIO 14 y 15.', 'Nombra las fotos con fecha y hora.'],
          checks: ['Las fotos llevan fecha y hora correctas', 'El método elegido gasta poco y está medido'] },
        { title: 'Fase 5 · Despliegue', steps: ['Caja con ventana limpia y sin reflejos del LED de flash (o tápalo).', 'Fotos nocturnas: necesitan iluminación infrarroja y un OV2640 sin filtro IR.', 'Una semana de prueba y revisión de falsos disparos (sol, ramas).'],
          checks: ['Una semana de funcionamiento con batería', 'He reducido los falsos disparos y anotado sus causas'] }
      ],
      extra: ['Enviar una miniatura por ESP-NOW a la pasarela, troceada en paquetes de 250 bytes', 'Detectar movimiento comparando imágenes en lugar de con PIR']
    },

    es_idfport: {
      intro: 'Reescribe el nodo de la estación de sensores (u otro proyecto) en ESP-IDF puro: proyecto con componentes, opciones propias en menuconfig, logs con niveles, NVS nativo y sueño profundo. Al final compararás tamaño, consumo y tiempo de arranque con la versión Arduino.',
      level: 4, hours: 14,
      skills: ['idf.py: crear, configurar, compilar y depurar', 'Componentes y Kconfig propios', 'APIs nativas: GPIO, NVS, ESP-NOW, sueño', 'Medir y comparar con Arduino'],
      bom: ['El hardware del nodo de sensores', 'Ordenador con ESP-IDF 5 (instalador oficial o extensión de VS Code)'],
      phases: [
        { title: 'Fase 1 · El entorno', steps: ['Instala ESP-IDF 5 y abre su terminal.', 'idf.py create-project nodo; idf.py set-target esp32; idf.py build.', 'idf.py -p TU_PUERTO flash monitor. Sal del monitor con Ctrl+].'],
          checks: ['Compilo, grabo y veo el arranque en el monitor', 'Sé dónde está sdkconfig y qué guarda'] },
        { title: 'Fase 2 · GPIO, logs y tareas', steps: ['Sustituye main/nodo.c por el programa de la fase.', 'En menuconfig, cambia el nivel de log por defecto a Debug y añade un ESP_LOGD.', 'Provoca un error (un pin inexistente) y mira qué hace ESP_ERROR_CHECK.'],
          code: `#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_log.h"

static const char *TAG = "nodo";
#define LED GPIO_NUM_2

void app_main(void)
{
    gpio_config_t io = {
        .pin_bit_mask = 1ULL << LED,
        .mode = GPIO_MODE_OUTPUT,
    };
    ESP_ERROR_CHECK(gpio_config(&io));
    int n = 0;
    while (1) {
        gpio_set_level(LED, n & 1);
        ESP_LOGI(TAG, "vuelta %d", n++);
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}`,
          checks: ['Veo mensajes de nivel Debug tras cambiar menuconfig', 'Entiendo el aborto de ESP_ERROR_CHECK y su mensaje'] },
        { title: 'Fase 3 · Componente y Kconfig', steps: ['Crea components/sensor con su CMakeLists.txt (idf_component_register) y mete ahí el driver del BME280 (tuyo o del registro de componentes con idf.py add-dependency).', 'Añade un Kconfig con una opción NODO_INTERVALO_S y úsala como CONFIG_NODO_INTERVALO_S.', 'Cambia el intervalo desde menuconfig sin tocar el código.'],
          checks: ['El intervalo se cambia en menuconfig', 'El driver vive en su propio componente reutilizable'] },
        { title: 'Fase 4 · NVS, ESP-NOW y sueño', steps: ['nvs_flash_init() (y si devuelve que no hay páginas libres, borra y reintenta), esp_wifi en modo estación, esp_now y deep sleep por temporizador.', 'Mide el tiempo desde el despertar hasta el envío y compáralo con la versión Arduino.', 'Compara tamaños con idf.py size.'],
          checks: ['El nodo en ESP-IDF funciona igual que el de Arduino', 'Tengo una tabla comparando tamaño, tiempo despierto y consumo de las dos versiones'] }
      ],
      extra: ['Activa el rollback de OTA y prueba Secure Boot en modo desarrollo en una placa de pruebas', 'Tests unitarios del componente con Unity (idf.py en el directorio de test)']
    },

    es_final: {
      intro: 'Todo junto: una pasarela con panel web en tiempo real, nodos de sensores que duermen meses a batería, un nodo de riego con bomba de 12 V, comunicación ESP-NOW, configuración por portal, registro en LittleFS, hora NTP, OTA y un sistema multitarea que no se cuelga. Un sistema que puedes dejar funcionando toda una temporada.',
      level: 5, hours: 60,
      skills: ['Diseñar un sistema distribuido con varios ESP32', 'Protocolo propio versionado sobre ESP-NOW', 'Actuadores con seguridad por diseño', 'Mantenimiento remoto: OTA, registros y diagnóstico'],
      bom: ['Pasarela: ESP32-S3 con PSRAM (o ESP32 WROVER)', '2–4 nodos de sensores (ESP32-C3 o placas de bajo consumo) con BME280 y sensor capacitivo de humedad de suelo (no los resistivos, que se corroen)', 'Nodo de riego: ESP32, MOSFET de nivel lógico, bomba sumergible o electroválvula de 12 V, diodo de rueda libre (1N5819 o 1N4007) y caudalímetro de pulsos (YF-S201, opcional)', 'Fuente de 12 V y 2 A con buck a 5 V, fusibles', 'Baterías 18650 protegidas y paneles para los nodos', 'Cajas estancas IP65 y prensaestopas'],
      phases: [
        { title: 'Fase 1 · Arquitectura y protocolo', steps: ['Seguridad: solo 12 V en la zona húmeda; la fuente certificada, dentro de casa o en caja estanca; fusible en cada línea.', 'Dibuja los nodos, qué mide o hace cada uno, cada cuánto despierta y por dónde habla.', 'Define el mensaje común en un .h compartido, con número de versión y secuencia.', 'Emparejamiento: un nodo nuevo manda HOLA por broadcast; la pasarela lo acepta solo si pulsas su botón (lista blanca en NVS).', 'La pasarela está conectada al router: su canal manda. Los nodos lo buscan una vez y lo guardan.'],
          code: `// Formato común para todos los nodos (mensaje.h)
enum Tipo : uint8_t { MEDIDA = 1, ORDEN = 2, ACK = 3, HOLA = 4 };

struct __attribute__((packed)) Mensaje {
  uint8_t version;      // sube este número si cambias el formato
  uint8_t nodo;         // id guardado en NVS
  Tipo tipo;
  uint16_t seq;         // detecta pérdidas y duplicados
  int16_t temp_c10;     // décimas de °C (sin float en la radio)
  uint16_t hum_c10;     // décimas de % HR
  uint16_t suelo;       // humedad del suelo 0..1000
  uint16_t vbat_mv;
  uint8_t orden;        // en ORDEN: 0 parar, 1 regar
  uint16_t segundos;    // duración pedida del riego
};
static_assert(sizeof(Mensaje) <= 250, "ESP-NOW admite 250 bytes");`,
          checks: ['Tengo un documento con nodos, mensajes (con versión) y tiempos', 'He calculado el presupuesto de energía de cada nodo a batería'] },
        { title: 'Fase 2 · Nodos de sensores', steps: ['Parte de la estación de sensores: deep sleep, memoria RTC, canal guardado.', 'Alimenta el sensor de suelo desde un GPIO solo mientras mides (gasta pocos mA) y espera a que se estabilice.', 'Calibra seco (al aire) y húmedo (en agua) y guarda los dos valores en NVS.', 'Si la pasarela no confirma (ACK), reintenta una vez y vuelve a dormir: nunca te quedes despierto esperando.'],
          checks: ['Cada nodo duerme por debajo de 50 µA y pasa menos de 400 ms despierto', 'La humedad del suelo marca 0 % al aire y 100 % en agua'] },
        { title: 'Fase 3 · Nodo de riego', steps: ['MOSFET con la bomba entre 12 V y drenador, y el diodo en paralelo con la bomba (cátodo al +).', 'Toda orden de riego trae duración; el nodo nunca riega más de su máximo (por ejemplo 5 minutos) aunque la pasarela se cuelgue.', 'Si recibe una orden de regar y no recibe confirmación de seguir cada 30 s, para.', 'Cuenta los pulsos del caudalímetro con una interrupción y devuelve los litros en el ACK.'],
          checks: ['La bomba nunca pasa de su tiempo máximo, aunque apague la pasarela a mitad', 'El caudalímetro mide litros con error menor del 10 % (comprobado con una jarra)'] },
        { title: 'Fase 4 · Pasarela multitarea', steps: ['Tareas: radio (callback de ESP-NOW → cola), lógica (reglas: si el suelo baja del umbral y la hora está en la ventana permitida, ordena regar), registro (CSV diario en LittleFS), web (servidor y WebSocket) y hora (NTP).', 'El estado compartido, protegido con mutex; los eventos, por colas.', 'Watchdog en las tareas críticas y registro del motivo de cada reinicio.'],
          checks: ['72 horas seguidas sin reinicios (y si hay alguno, su motivo queda registrado)', 'Ninguna tarea baja de 1 KB de pila libre'] },
        { title: 'Fase 5 · Panel web y configuración', steps: ['Panel con valores en vivo por WebSocket, gráficas del historial leídas de los CSV y riego manual.', 'Umbrales y ventanas horarias editables, guardados en NVS.', 'Portal de configuración WiFi, nombre mDNS y contraseña para las acciones que mueven agua.'],
          checks: ['Cambio un umbral desde el móvil y el sistema lo aplica sin reiniciar', 'Sin contraseña no se puede regar desde la web'] },
        { title: 'Fase 6 · Mantenimiento y despliegue', steps: ['OTA para la pasarela y el nodo de riego (plantilla del módulo 6).', 'Nodos dormidos: la pasarela marca “actualización pendiente” en el ACK; el nodo se queda despierto, se une al router y descarga su firmware con HTTPUpdate.', 'Copia de seguridad de la configuración (exportar e importar un JSON).', 'Despliega dos semanas y revisa los registros.'],
          checks: ['Actualizo un nodo dormido sin tocarlo', 'Dos semanas funcionando y he revisado los registros de pérdidas y reinicios'] }
      ],
      extra: ['Integra la pasarela con Home Assistant (especialidad de IoT)', 'Reescribe el nodo de riego en ESP-IDF con rollback y Secure Boot', 'No regar si la previsión anuncia lluvia']
    }
  });

  /* ===================== LECCIONES ===================== */
  /* Cada lección: gancho de predicción → explora → explica (con dibujo) → ejemplo paso a paso →
     práctica guiada → práctica variada → resumen. El curso base (m12) ya dio lo general de Arduino. */
  const LED_HINT = 'Cada LED: pin → resistencia de 100 a 220 Ω → ánodo (pata larga); cátodo a GND. A 3,3 V una de 470 Ω apenas lo enciende.';
  const yn = (label, val = 0) => ({ label, val, list: [0, 1], dec: 0 });
  const RES = (...k) => I('<b>Resumen</b>\n· ' + k.join('\n· '));
  // Piezas de dibujo para las tarjetas
  const bx = (x, y, w, h, lab, fill = 'var(--ice-soft)', tf = '', cls = 'vizsm') => (tf = tf === W && fill === 'var(--led)' ? '#1B1300' : tf, ``) + `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="currentColor"/>` + tx(x + w / 2, y + h / 2 + 4, lab, cls, `text-anchor="middle" ${tf ? `fill="${tf}"` : ''}`);
  const ar = (x1, y1, x2, y2, c = 'currentColor', k = '') => { const a = Math.atan2(y2 - y1, x2 - x1), L = 7, q = s => [(x2 - L * Math.cos(a + s)).toFixed(1), (y2 - L * Math.sin(a + s)).toFixed(1)]; const [p1, p2] = [q(-0.4), q(0.4)]; return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c}" stroke-width="1.6" ${k}/><path d="M${x2} ${y2}L${p1[0]} ${p1[1]}L${p2[0]} ${p2[1]}z" fill="${c}"/>`; };
  const W = '#fff';

  const M1 = [
    L('es1', 'Por dentro del ESP32', 'chip', ['es_mem', 'es_module', 'es_cores', 'es_period'], [
      Q('Un Arduino Uno tiene 2 KB de RAM. ¿Cuánta crees que tiene un ESP32 clásico?', ['Unos 520 KB: más de 250 veces más', 'Los mismos 2 KB', 'Unos 4 GB, como un móvil', 'Unos 32 KB'], 'Trae 520 KB de SRAM. Parece muchísimo, pero el WiFi y el sistema se comen una buena parte. Vamos a verlo.', { predict: true, c: 'es_mem', h: 'Piensa en todo lo que hace a la vez: WiFi, Bluetooth, dos núcleos… necesita bastante más que un Uno.' }),
      { t: 'explore', text: 'Esta barra es la RAM que le queda a tu programa en un ESP32 clásico. Enciende el WiFi y reserva un búfer (por ejemplo, para una imagen).', viz: 'es_ram',
        params: { wifi: yn('WiFi (0 apagado · 1 encendido)', 1), ble: { val: 0, fixed: true }, buf: { label: 'Tu búfer', val: 50, min: 0, max: 400, step: 10, unit: 'KB', dec: 0 }, psram: yn('PSRAM (0 no · 1 sí)', 0) },
        tasks: [
          { q: 'fits', min: 0, max: 0, text: 'Sube el búfer hasta que deje de caber', done: 'Con el WiFi encendido quedan unos 245 KB: mucho para un microcontrolador, pero no infinito.', hint: 'Mueve «Tu búfer» a la derecha.' },
          { q: 'big', min: 1, max: 1, text: 'Consigue que quepa un búfer de 300 KB', done: 'La PSRAM es RAM externa de varios MB que traen algunos módulos: los búferes grandes van allí.', hint: 'Apagar el WiFi no basta: busca la memoria extra.' }] },
      I('El ESP32 es un <b>SoC</b> (sistema en un chip): dos núcleos de hasta 240 MHz, 520 KB de SRAM, periféricos y una radio de 2,4 GHz con WiFi y Bluetooth, en un solo trozo de silicio.\nLo que <b>no</b> lleva dentro es la memoria del programa: va en una <b>flash</b> aparte.', {
        svg: SV(180, `<rect x="8" y="16" width="208" height="150" rx="10" fill="none" stroke="currentColor"/>${tx(16, 32, 'Chip ESP32', 'vizlab')}
          ${bx(16, 42, 60, 34, 'Núcleo 0', 'var(--led)', W)}${bx(82, 42, 60, 34, 'Núcleo 1', 'var(--led)', W)}<g class="a-pulse">${bx(148, 42, 60, 34, 'Radio', '#3E8FCB', W)}</g>
          ${bx(16, 84, 84, 28, 'SRAM 520 KB')}${bx(106, 84, 48, 28, 'ROM')}${bx(160, 84, 48, 28, 'RTC')}${bx(16, 120, 192, 36, 'Periféricos: GPIO, ADC, PWM, buses…')}
          <rect x="236" y="56" width="58" height="62" rx="6" fill="none" stroke="currentColor" stroke-dasharray="4 3"/>${tx(265, 80, 'Flash', 'vizlab', 'text-anchor="middle"')}${tx(265, 96, '4 MB', 'vizsm', 'text-anchor="middle"')}${tx(265, 110, 'fuera', 'vizsm', 'text-anchor="middle"')}
          <path d="M216 88H236" stroke="var(--led)" stroke-width="3" class="a-flow"/>`),
        more: 'Los núcleos del ESP32 clásico son Xtensa LX6. La ROM interna (448 KB) trae el cargador de arranque de fábrica y funciones básicas.\nLa flash se lee por un bus SPI a través de una caché: el chip ejecuta el programa casi como si estuviera dentro.\nAlgunos módulos (WROVER, muchos S3) añaden PSRAM: varios MB de RAM externa, algo más lenta que la SRAM.' }),
      I('Cada memoria tiene su trabajo:\n· <b>SRAM</b>: variables y pilas mientras funciona. Se borra al apagar.\n· <b>Flash</b>: programa y archivos. No se borra.\n· <b>ROM</b>: el cargador de fábrica.\n· <b>RTC</b>: unos pocos KB que aguantan el sueño profundo.', {
        svg: SV(150, `${tx(150, 18, '¿Qué queda al apagar?', 'vizlab', 'text-anchor="middle"')}
          ${[['SRAM', 'se borra', 0], ['Flash', 'se queda', 1], ['ROM', 'de fábrica', 1], ['RTC', 'solo sueño', 0]].map(([n, d, k], i) => bx(12 + i * 72, 34, 62, 40, n, k ? 'var(--ok)' : 'var(--ice-soft)', k ? W : '', 'vizlab') + tx(43 + i * 72, 96, d, 'vizsm', 'text-anchor="middle"')).join('')}
          ${tx(150, 130, 'La RTC sobrevive al sueño profundo, no a quitar la pila', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Tres niveles que conviene no confundir:\n· <b>Chip</b>: el silicio (ESP32-D0WD-V3).\n· <b>Módulo</b>: chip + flash + cristal + antena bajo una tapa, ya homologado (WROOM-32E).\n· <b>Placa</b>: módulo + USB + regulador + botones (DevKitC).', {
        svg: SV(170, `<rect x="10" y="10" width="280" height="150" rx="12" fill="none" stroke="currentColor"/>${tx(20, 28, 'Placa DevKit: USB, regulador, botones', 'vizsm')}
          <rect x="40" y="38" width="220" height="110" rx="10" fill="var(--ice-soft)" stroke="currentColor"/>${tx(50, 56, 'Módulo WROOM: flash, cristal, antena', 'vizsm')}
          <rect x="110" y="74" width="80" height="56" rx="6" fill="var(--led)"/>${tx(150, 106, 'Chip', 'vizlab', 'text-anchor="middle" fill="#fff"')}
          <path d="M210 70h40v8h-30v8h30v8h-30" fill="none" stroke="currentColor" stroke-width="1.5"/>${tx(232, 112, 'antena', 'vizsm', 'text-anchor="middle"')}`),
        more: 'Certificar un transmisor de radio cuesta tiempo y dinero. El módulo ya viene probado y homologado, con su antena ajustada; por eso casi todos los productos lo montan en vez del chip suelto.' }),
      I('Los dos núcleos se reparten el trabajo. En Arduino, la radio vive en el <b>núcleo 0</b> y tu setup() y loop() corren en el <b>núcleo 1</b>.\nA 240 MHz, cada ciclo de reloj dura <b>T = 1 / f</b>: un instante minúsculo.', {
        svg: SV(150, `${tx(10, 30, 'Núcleo 0', 'vizlab')}${tx(10, 80, 'Núcleo 1', 'vizlab')}
          <rect x="80" y="16" width="60" height="22" rx="4" fill="#3E8FCB" class="a-fade"/><rect x="170" y="16" width="40" height="22" rx="4" fill="#3E8FCB" class="a-fade a-d2"/>${tx(84, 31, 'WiFi', 'vizsm', 'fill="#fff"')}
          <rect x="80" y="66" width="200" height="22" rx="4" fill="var(--led)"/>${tx(86, 81, 'setup() y loop()', 'vizsm', 'fill="#fff"')}
          ${tx(10, 124, 'Lo verás a fondo en el módulo 4, con FreeRTOS.', 'vizsm')}`),
        more: 'El 0 se llama PRO_CPU y el 1, APP_CPU. Los chips de un solo núcleo (S2, C3, C6, H2) lo hacen todo en el núcleo 0, turnándose.' }),
      { t: 'steps', text: '¿Cuánto dura un ciclo de reloj a 240 MHz?', steps: ['Periodo y frecuencia son inversos: <b>T = 1 / f</b>', 'Pasa a hercios: 240 MHz = 240 000 000 Hz', 'Divide: T = 1 / 240 000 000 s ≈ 0,00000000417 s', 'En nanosegundos (× 1 000 000 000): <b>4,17 ns</b>'], result: 'Unos 4,17 ns: en ese tiempo la luz recorre algo más de un metro.' },
      Q('¿Dónde se guarda tu programa en un ESP32-WROOM-32E?', ['En una flash dentro del módulo, junto al chip', 'En la SRAM interna, para siempre', 'En el convertidor USB-serie', 'En la ROM del chip'], 'La SRAM se borra al apagar y la ROM es de fábrica: no se puede escribir.', { c: 'es_mem', h: 'Busca la memoria que no se borra al apagar y que tú sí puedes escribir.' }),
      Nm('Y a 80 MHz, ¿cuánto dura un ciclo de reloj, en nanosegundos?', 12.5, 'ns', 'T = 1 / 80 000 000 s = 0,0000000125 s = 12,5 ns.', { tol: 0.1, c: 'es_period', h: 'T = 1 / f con f en hercios; luego multiplica por mil millones para tener ns.' }),
      { t: 'match', q: 'Une cada memoria con su papel.', pairs: [['SRAM (520 KB)', 'Variables y pilas mientras funciona'], ['Flash externa', 'Programa y archivos; no se borra al apagar'], ['ROM interna', 'Cargador de arranque de fábrica'], ['Memoria RTC', 'Datos que sobreviven al sueño profundo']], c: 'es_mem', h: 'Empieza por la que se borra al apagar y la que viene escrita de fábrica.' },
      { t: 'order', q: 'Ordena de dentro hacia fuera.', items: ['El chip ESP32', 'El módulo: chip, flash, cristal y antena bajo la tapa', 'La placa DevKit: módulo, USB, regulador y botones', 'Tu montaje: placa, protoboard y sensores'], e: 'Cada capa añade lo que la anterior necesita para usarse.', c: 'es_module', h: 'Lo más pequeño es el silicio; cada capa lo envuelve.' },
      Q('¿Por qué casi todos los productos usan módulos y no el chip suelto?', ['La radio ya está ajustada y homologada: te ahorras diseñar la antena y certificar el transmisor', 'Son más rápidos', 'Tienen más pines', 'Funcionan a 5 V'], 'Certificar un transmisor es caro y lento.', { c: 'es_module', h: 'Piensa en lo más difícil de hacer bien por tu cuenta: la parte de radio.' }),
      Q('Dos núcleos: el 0 y el 1. En Arduino, ¿dónde corre loop()?', ['En el núcleo 1; la radio suele ir en el 0', 'En los dos a la vez', 'Siempre en el 0', 'En el coprocesador de bajo consumo'], 'Así tu código no estorba a la pila WiFi. Lo verás con FreeRTOS.', { c: 'es_cores', h: 'Recuerda el dibujo: el WiFi tiene su núcleo y tu programa el otro.' }),
      Q('Necesitas un búfer de imagen de 300 KB además de WiFi. ¿Qué buscas?', ['Un módulo con PSRAM (WROVER, o un S3 con PSRAM)', 'Más flash', 'Un ESP32 a 5 V', 'Apagar el Bluetooth'], 'La flash no sirve como RAM de trabajo; la PSRAM sí.', { c: 'es_mem', h: 'Lo que probaste en la barra: ¿qué hizo caber los 300 KB?' }),
      RES('El ESP32 es un SoC: dos núcleos, 520 KB de SRAM, periféricos y radio; el programa vive en una <b>flash</b> externa.', 'SRAM se borra al apagar; flash no; la RTC aguanta el sueño; la <b>PSRAM</b> añade RAM grande.', 'Chip ⊂ módulo (homologado) ⊂ placa.', 'Radio en el núcleo 0, loop() en el 1; <b>T = 1 / f</b>.')
    ]),
    L('es2', 'La familia: S2, S3, C3, C6 y más', 'chip', ['es_family', 'es_hid'], [
      Q('¿Crees que todos los ESP32 tienen Bluetooth?', ['No: algunos no tienen y otros solo tienen BLE', 'Sí, todos igual', 'Ninguno lo tiene', 'Solo los más baratos'], 'Hay modelos sin Bluetooth y modelos solo con la versión de bajo consumo (BLE). Elegir bien empieza por saberlo.', { predict: true, c: 'es_family', h: 'Hay modelos pensados para cosas muy distintas.' }),
      { t: 'explore', text: 'Siete chips de la familia. Activa los requisitos de tu proyecto y mira cuáles sobreviven.', viz: 'es_pick',
        params: { bt: { label: 'Bluetooth (0 no hace falta · 1 BLE · 2 clásico)', val: 0, list: [0, 1, 2], dec: 0 }, usb: yn('USB nativo (0 · 1)'), z: yn('Zigbee o Thread (0 · 1)'), wifi: yn('WiFi (0 · 1)') },
        tasks: [
          { q: 'esp32', min: 1, max: 1, text: 'Un altavoz Bluetooth (audio A2DP): deja un solo chip', done: 'Solo el ESP32 clásico tiene Bluetooth clásico, el de auriculares y altavoces.', hint: 'El audio Bluetooth usa Bluetooth clásico, no BLE.' },
          { q: 's3', min: 1, max: 1, text: 'Un teclado USB con WiFi y BLE: deja solo uno', done: 'El S3: USB nativo, WiFi y BLE.', hint: 'Pide USB, WiFi y BLE a la vez.' },
          { q: 'zig', min: 1, max: 1, text: 'Un sensor Zigbee que no necesita WiFi', done: 'C6 y H2 llevan la radio de Zigbee y Thread; el H2 ni siquiera tiene WiFi.', hint: 'Activa Zigbee y apaga el WiFi y el USB.' }] },
      I('Con núcleos <b>Xtensa</b>:\n· <b>ESP32</b> clásico: dos núcleos, Bluetooth clásico y BLE, DAC y touch.\n· <b>S2</b>: un núcleo, USB nativo, sin Bluetooth.\n· <b>S3</b>: dos núcleos, USB nativo, BLE 5 e instrucciones para IA.', {
        svg: SV(120, [['ESP32', 'BT clásico + BLE', 'DAC · touch'], ['S2', 'sin Bluetooth', 'USB nativo'], ['S3', 'BLE 5 · IA', 'USB nativo']].map(([n, a, b], i) => bx(8 + i * 98, 14, 88, 92, '', 'var(--ice-soft)') + tx(52 + i * 98, 40, n, 'vizbig', 'text-anchor="middle"') + tx(52 + i * 98, 66, a, 'vizsm', 'text-anchor="middle"') + tx(52 + i * 98, 84, b, 'vizsm', 'text-anchor="middle"')).join('')) }),
      I('Con núcleos <b>RISC-V</b>:\n· <b>C3</b>: un núcleo a 160 MHz, WiFi y BLE 5, barato.\n· <b>C6</b>: WiFi 6, BLE 5, Thread y Zigbee.\n· <b>H2</b>: sin WiFi; BLE, Thread y Zigbee.\n· <b>P4</b>: sin radio; mucha potencia para pantallas y cámaras.', {
        svg: SV(110, [['C3', 'WiFi · BLE'], ['C6', 'WiFi 6 · Zigbee'], ['H2', 'BLE · Zigbee'], ['P4', 'sin radio']].map(([n, a], i) => bx(6 + i * 73, 14, 66, 80, '', 'var(--ice-soft)') + tx(39 + i * 73, 46, n, 'vizbig', 'text-anchor="middle"') + tx(39 + i * 73, 70, a, 'vizsm', 'text-anchor="middle" style="font-size:9.5px"')).join('')) }),
      I('Lo que cambia de un chip a otro: cuántos GPIO, cuáles son de arranque, si hay DAC o touch, cuántos canales de PWM…\nRegla de oro: <b>manda la hoja de datos de tu chip</b>. Un tutorial de ESP32 clásico puede estar mal para un C3.', {
        svg: SV(130, `${bx(10, 20, 120, 44, 'Tutorial: ESP32', 'var(--ice-soft)', '', 'vizlab')}${tx(70, 84, 'analogRead(34)', 'vizsm', 'text-anchor="middle"')}${ar(136, 42, 170, 42)}
          ${bx(176, 20, 114, 44, 'Tu placa: C3', 'var(--ice-soft)', '', 'vizlab')}${tx(233, 84, 'no tiene GPIO 34', 'vizsm', 'text-anchor="middle" fill="var(--err)"')}
          ${tx(150, 116, 'Comprueba pines y periféricos en tu hoja de datos', 'vizsm', 'text-anchor="middle"')}`) }),
      { t: 'steps', text: 'Elige chip para un timbre que avisa al móvil por BLE, a pila y barato.', steps: ['Requisitos: BLE, poco consumo, precio bajo. No hacen falta USB nativo ni Zigbee', 'Descarta los que no tienen BLE: S2 y P4', 'Descarta lo que no necesitas y encarece: S3 (USB, IA) y el clásico (dos núcleos, Bluetooth clásico)', 'Entre C3, C6 y H2, el C3 es el más sencillo y barato con WiFi y BLE 5'], result: 'ESP32-C3; si nunca vas a usar WiFi, un H2 también vale.' },
      { t: 'match', q: 'Une cada chip con su rasgo más característico.', pairs: [['ESP32 clásico', 'Bluetooth clásico y DAC'], ['ESP32-S3', 'USB nativo y aceleración de IA'], ['ESP32-C3', 'RISC-V barato con BLE 5'], ['ESP32-C6', 'WiFi 6, Thread y Zigbee']], c: 'es_family', h: 'Empieza por el único que tiene Bluetooth clásico.' },
      Q('Quieres hacer un receptor de audio Bluetooth (A2DP) para unos altavoces.', ['ESP32 clásico: el único de la familia con Bluetooth clásico', 'ESP32-S3', 'ESP32-C3', 'ESP32-S2'], 'A2DP es Bluetooth clásico; el S3 y el C3 solo tienen BLE y el S2 no tiene Bluetooth.', { c: 'es_family', h: 'El audio de los auriculares no va por BLE.' }),
      Q('Un mando que el PC reconozca como teclado USB.', ['S3 (o S2): tienen USB nativo', 'ESP32 clásico', 'C3', 'Cualquiera'], 'El USB de un DevKit clásico es un chip USB-serie aparte que solo hace de puerto COM.', { c: 'es_hid', h: 'El chip tiene que hablar USB él mismo, sin conversor.' }),
      Q('Un sensor de puerta para una red Zigbee.', ['C6 (o H2)', 'S3', 'ESP32 clásico', 'S2'], 'Llevan la radio para Thread y Zigbee.', { c: 'es_family', h: 'Solo dos chips de la lista hablan Zigbee.' }),
      Q('Un tutorial usa dacWrite(25, 128) y tú tienes un S3.', ['No funcionará: el S3 no tiene DAC', 'Funciona igual', 'Saca 5 V', 'Va más rápido'], 'El DAC solo está en el ESP32 clásico y el S2.', { c: 'es_family', h: 'Mira qué chips tienen DAC en las tarjetas.' }),
      Q('Un tutorial lee un sensor en el GPIO 34, pero tu placa es un C3.', ['El C3 no tiene GPIO 34: busca un pin con ADC en su hoja de datos', 'Funciona igual', 'Usas el 3 y el 4', 'Se quema'], 'El C3 llega del GPIO 0 al 21.', { c: 'es_family', h: 'Cada chip tiene su propio número de pines.' }),
      Q('Proyecto a pila, con BLE para el móvil y lo más barato posible.', ['ESP32-C3', 'ESP32-P4', 'ESP32-S3 con PSRAM', 'ESP32 WROVER'], 'Un solo núcleo RISC-V y BLE 5 bastan.', { c: 'es_family', h: 'Descarta los que tienen extras caros o no tienen radio.' }),
      RES('Xtensa: ESP32 (BT clásico, DAC, touch), S2 (USB, sin BT), S3 (USB, BLE, IA).', 'RISC-V: C3 (barato, BLE), C6 (WiFi 6, Zigbee), H2 (sin WiFi), P4 (sin radio).', 'Elige por requisitos y <b>comprueba la hoja de datos</b> de tu chip.')
    ]),
    L('es3', 'La placa DevKit por dentro', 'chip', ['es_ldo', 'es_module', 'es_upload'], [
      Q('Conectas una batería de litio de 3,7 V al pin VIN de tu DevKit. ¿Qué crees que pasará?', ['El chip recibe menos de 3,3 V y puede reiniciarse', 'Funciona perfecto: 3,7 es más que 3,3', 'Se quema al instante', 'La batería se carga'], 'El regulador de la placa necesita margen por encima de 3,3 V. Vamos a verlo.', { predict: true, c: 'es_ldo', h: 'Piensa si un regulador puede «subir» la tensión o solo bajarla, y cuánto le cuesta.' }),
      { t: 'explore', text: 'Por VIN entra la alimentación y el regulador entrega 3,3 V al módulo. Juega con la entrada, la corriente y el tipo de regulador.', viz: 'es_ldo',
        params: { vin: { label: 'Tensión en VIN', val: 5, list: [3, 3.3, 3.5, 3.7, 3.9, 4.2, 5, 7, 9, 12], unit: 'V', dec: 1 }, i: { label: 'Corriente', val: 100, min: 10, max: 600, step: 10, unit: 'mA', dec: 0 }, tipo: yn('Regulador (0 AMS1117 · 1 LDO de poca caída)', 0) },
        tasks: [
          { q: 'low', min: 1, max: 1, text: 'Prueba con una batería de litio (unos 3,7 V)', done: 'El AMS1117 necesita algo más de 1 V de margen: con 3,7 V solo da unos 2,6 V.', hint: 'Baja VIN hasta 3,7 V.' },
          { q: 'ok37', min: 1, max: 1, text: 'Haz que con 3,7 V salgan 3,3 V', done: 'Un LDO de poca caída se conforma con unas décimas de voltio de margen.', hint: 'Cambia el tipo de regulador.' },
          { q: 'P', min: 1, max: 100, text: 'Encuentra un caso en que el regulador disipe más de 1 W', done: 'Todo lo que sobra, (Vin − 3,3) × I, se convierte en calor.', hint: 'Sube mucho VIN y la corriente.' }] },
      I('Además del módulo, una DevKitC lleva:\n· Un <b>convertidor USB-serie</b> (CP2102 o CH340).\n· Un <b>regulador</b> de 3,3 V (a menudo un AMS1117).\n· Los botones <b>EN</b> (reinicio) y <b>BOOT</b> (GPIO 0 a masa).', {
        svg: SV(150, `<rect x="10" y="20" width="280" height="110" rx="8" fill="none" stroke="currentColor"/>${bx(150, 32, 130, 86, 'Módulo WROOM', 'var(--ice-soft)', '', 'vizlab')}
          ${bx(14, 58, 34, 34, 'USB')}${bx(56, 32, 60, 30, 'CP2102')}${bx(56, 86, 60, 30, 'AMS1117')}${bx(122, 32, 22, 22, 'EN', 'var(--led)', W)}${bx(122, 96, 22, 22, 'B', 'var(--led)', W)}
          ${ar(48, 70, 56, 50)}${ar(48, 80, 56, 100)}${tx(120, 146, 'B = BOOT', 'vizsm')}`),
        more: 'Muchas placas llevan también un LED de alimentación y otro en el GPIO 2. El CH340 necesita driver en algunos sistemas; el CP2102 también según el sistema operativo.' }),
      I('El regulador lineal es un grifo que solo puede cerrar: baja la tensión quemando el sobrante como calor, <b>P = (Vin − 3,3) · I</b>. Y necesita margen: el AMS1117, algo más de 1 V.', {
        svg: SV(150, `<rect x="30" y="${130 - 100}" width="60" height="100" fill="var(--ice-soft)" stroke="currentColor"/>${tx(60, 146, 'VIN 5 V', 'vizsm', 'text-anchor="middle"')}
          <rect x="30" y="${130 - 66}" width="60" height="66" fill="var(--led)"/><rect x="30" y="30" width="60" height="34" fill="var(--err)" opacity=".55" class="a-pulse"/>${tx(100, 50, '1,7 V → calor', 'vizsm', 'fill="var(--err)"')}
          ${tx(100, 100, '3,3 V al módulo', 'vizsm')}${tx(190, 60, 'P = (5 − 3,3) × I', 'vizlab')}${tx(190, 82, 'con 250 mA:', 'vizsm')}${tx(190, 100, '0,43 W', 'vizbig')}`),
        more: 'Si ya tienes 3,3 V estables, puedes entrar directamente por el pin 3V3 (de 3,0 a 3,6 V), saltándote el regulador; nunca más de 3,6 V, porque ahí nada te protege.\nEl AMS1117 además gasta unos miliamperios él solo: con el chip dormido, eso vacía una batería en días.' }),
      I('Al soltar <b>EN</b>, el chip arranca. Si en ese instante el GPIO 0 está a masa (<b>BOOT</b> pulsado), entra en <b>modo descarga</b> y espera un programa.\nDos transistores de la placa hacen este baile solos cuando pulsas Subir.', {
        svg: SV(150, `${tx(10, 34, 'EN', 'vizlab')}<path d="M60 40H110V20H290" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          ${tx(10, 84, 'GPIO 0', 'vizlab')}<path d="M60 70H90V90H150V70H290" fill="none" stroke="#3E8FCB" stroke-width="2.5"/>
          <path d="M110 14V100" stroke="var(--muted)" stroke-dasharray="3 3"/>${tx(114, 112, 'arranque: GPIO 0 bajo', 'vizsm')}${tx(114, 128, '→ modo descarga', 'vizlab', 'fill="var(--ok)"')}`),
        more: 'El convertidor USB-serie tiene dos líneas de control, DTR y RTS. Con ellas, esptool baja EN y GPIO 0 en el orden correcto. Si con algún cable o puerto falla, mantener BOOT pulsado mientras conecta lo resuelve; si falla siempre, un condensador de 10 µF entre EN y GND retrasa el arranque lo justo.' }),
      { t: 'steps', text: 'El regulador recibe 5 V y entrega 250 mA a 3,3 V. ¿Cuánto calor disipa?', steps: ['Lo que cae en el regulador: 5 − 3,3 = 1,7 V', 'Potencia: <b>P = V · I</b>', 'P = 1,7 V × 0,25 A', '<b>0,425 W</b>: se nota caliente al tacto'], result: 'Unos 0,43 W' },
      { t: 'match', q: 'Une cada pieza de la placa con su función.', pairs: [['CP2102 / CH340', 'Convierte USB en puerto serie'], ['AMS1117', 'Baja 5 V a 3,3 V'], ['EN', 'Reinicia el chip'], ['BOOT', 'Lleva el GPIO 0 a masa']], c: 'es_module', h: 'Dos son chips y dos son botones.' },
      Q('¿Qué son los pines VIN (o 5V) y 3V3 de la placa?', ['VIN entra al regulador (5 V del USB); 3V3 es su salida', 'Los dos son de 5 V', '3V3 es una entrada que no hay que tocar', 'VIN da 3,3 V'], 'Por VIN entra la alimentación; por 3V3 sale la regulada.', { c: 'es_ldo', h: 'Sigue la flecha del dibujo: de dónde viene la tensión y a dónde va.' }),
      Nm('Con 9 V en VIN y 200 mA, ¿cuánto calor disipa el regulador, en W?', 1.14, 'W', '(9 − 3,3) × 0,2 = 1,14 W: demasiado para un AMS1117 sin disipador.', { tol: 0.02, c: 'es_ldo', h: 'Primero la tensión que se queda en el regulador; luego multiplica por la corriente en amperios.' }),
      Q('Conectas una Li-ion directamente a VIN de un DevKit con AMS1117.', ['Funciona mal cuando la batería baja: el regulador necesita más margen', 'Perfecto para siempre', 'Explota', 'Da 5 V'], 'Para baterías: un LDO de poca caída y poco consumo, o una placa pensada para ello.', { c: 'es_ldo', h: 'Recuerda cuánto margen pedía el AMS1117 en el experimento.' }),
      Q('¿Puedes alimentar la placa por el pin 3V3 con una fuente de 3,3 V?', ['Sí: entra directa al módulo, saltándose el regulador (nunca más de 3,6 V)', 'No, nunca', 'Sí, con 5 V', 'Solo con pilas AA'], 'El módulo admite de 3,0 a 3,6 V.', { c: 'es_ldo', h: 'Si la tensión ya es la buena, ¿hace falta el regulador?' }),
      Q('Al subir un programa sale «Connecting…_____» y acaba fallando.', ['Mantén BOOT mientras conecta (o pon 10 µF entre EN y GND si pasa siempre)', 'Cambia de placa', 'Desconecta el USB', 'Pulsa EN sin parar'], 'El circuito automático falla con algunos cables, puertos o placas.', { c: 'es_upload', h: 'Para entrar en modo descarga, el GPIO 0 tiene que estar a masa al arrancar.' }),
      Q('Un cable USB «de carga» no deja subir programas. ¿Por qué?', ['Solo tiene los hilos de alimentación, no los de datos', 'Es demasiado largo siempre', 'Da 12 V', 'Le falta un driver'], 'Ten un cable de datos marcado para tus placas.', { c: 'es_upload', h: 'La placa se enciende, luego la corriente llega. ¿Qué es lo que no llega?' }),
      RES('La DevKit añade al módulo: USB-serie, regulador de 3,3 V y botones EN y BOOT.', 'Regulador lineal: necesita margen y quema <b>(Vin − 3,3) · I</b> como calor.', 'Por 3V3 puedes entrar con 3,0–3,6 V; por VIN, con los 5 V del USB.', 'EN reinicia; GPIO 0 a masa al arrancar = <b>modo descarga</b>.')
    ]),
    L('es4', 'El núcleo Arduino-ESP32 y el arranque', 'code', ['es_upload', 'es_crash', 'es_brown', 'es_heap', 'es_cpufreq', 'es_secure'], [
      Q('Bajas la CPU de 240 a 40 MHz para ahorrar, en un proyecto con WiFi. ¿Qué crees que pasará?', ['El WiFi deja de funcionar', 'Todo igual, solo más lento', 'Gasta más', 'Se quema'], 'La radio necesita al menos 80 MHz. Vamos a explorar qué cambia con la frecuencia.', { predict: true, c: 'es_cpufreq', h: 'La radio también depende de los relojes del chip.' }),
      { t: 'explore', text: 'Elige la frecuencia de la CPU y si usas la radio. Las barras comparan la corriente, el tiempo de una tarea y la carga que gasta (modelo simplificado).', viz: 'es_cpu',
        params: { f: { label: 'Frecuencia de la CPU', val: 160, list: [10, 20, 40, 80, 160, 240], unit: 'MHz', dec: 0 }, radio: yn('WiFi (0 apagado · 1 encendido)', 1) },
        tasks: [
          { q: 'broken', min: 1, max: 1, text: 'Baja la frecuencia hasta romper el WiFi', done: 'Por debajo de 80 MHz la radio no funciona.', hint: 'Mueve la frecuencia a la izquierda.' },
          { q: 'radioMin', min: 1, max: 1, text: 'Busca la frecuencia más baja con el WiFi funcionando', done: '80 MHz: el mínimo para usar la radio.' },
          { q: 'fast', min: 1, max: 1, text: 'Mira la tercera barra: ¿a qué frecuencia gasta menos carga la tarea?', done: 'Si después el chip duerme, terminar deprisa sale más barato. Bajar MHz compensa cuando pasa mucho rato despierto esperando.', hint: 'Compara la barra de carga en cada frecuencia.' }] },
      I('El núcleo <b>Arduino-ESP32</b> es una capa sobre <b>ESP-IDF</b>, el sistema oficial de Espressif.\nUsamos la versión 3 (basada en ESP-IDF 5). Si un ejemplo de internet no compila, mira de qué versión es: la 3 cambió funciones de PWM y temporizadores.', {
        svg: SV(150, `${bx(40, 10, 220, 26, 'Tu programa: setup() y loop()', 'var(--led)', W)}${bx(40, 42, 220, 26, 'Arduino-ESP32 3.x')}${bx(40, 74, 220, 26, 'ESP-IDF 5 + FreeRTOS')}${bx(40, 106, 220, 26, 'Chip ESP32', '#555', W)}
          ${tx(268, 60, 'capas', 'vizsm')}`) }),
      I('Al pulsar Subir: se compila un .bin, esptool pone el chip en modo descarga, graba la flash y lo reinicia.\nSi abres el monitor a <b>115 200 baudios</b>, la ROM saluda con el <b>motivo del reinicio</b>:', { code: 'rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)\n...\nentry 0x400805e4',
        more: 'POWERON_RESET es encender; SW_CPU_RESET, un reinicio por software (por ejemplo tras un fallo); DEEPSLEEP_RESET, despertar del sueño profundo. El número de boot dice cómo estaban los pines de arranque.' }),
      I('Si el programa falla gravemente verás un <b>Guru Meditation Error</b>: un pánico, y el chip se reinicia. Si la tensión cae, <b>Brownout detector was triggered</b>.', { code: 'Guru Meditation Error: Core 1 panic\'ed (LoadProhibited)\n...\nrst:0xc (SW_CPU_RESET),boot:0x13',
        more: 'LoadProhibited significa que se intentó leer en una dirección de memoria no válida. Suele ser un puntero nulo: un puntero es una variable que guarda una dirección, y si vale 0 (no apunta a nada) leer a través de él provoca el pánico.' }),
      I('Puedes preguntarle al chip por sí mismo. El <b>heap</b> es la RAM que se reparte mientras el programa funciona (la que piden String, new o malloc). La MAC única de fábrica está grabada en los <b>eFuses</b>, bits que solo se escriben una vez.', { code: 'Serial.println(ESP.getChipModel());     // "ESP32-D0WD-V3"\nSerial.println(ESP.getCpuFreqMHz());    // 240\nSerial.println(ESP.getFlashChipSize()); // 4194304\nSerial.println(ESP.getFreeHeap());      // bytes de heap libres\nSerial.println(ESP.getEfuseMac(), HEX); // MAC de los eFuses' }),
      { t: 'steps', text: 'Tras un reinicio inesperado lees esto en el monitor. ¿Qué ha pasado?', code: 'Brownout detector was triggered\n\nets Jun  8 2016 00:22:57\nrst:0xf (RTCWDT_BROWN_OUT_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)', steps: ['La primera línea la escribe el detector de caída: la tensión bajó del umbral', 'rst:0xf (RTCWDT_BROWN_OUT_RESET) confirma el motivo del reinicio', 'boot:0x13 dice que arrancó normal desde la flash: el programa no tiene la culpa', 'Sospecha de la alimentación: cable, puerto USB o regulador (lo verás a fondo en el módulo 2)'], result: 'Un reinicio por caída de tensión, no un fallo del código.' },
      { t: 'order', q: 'Ordena lo que pasa al pulsar «Subir».', items: ['Se compila el código en un archivo .bin', 'esptool pone el chip en modo descarga (EN y GPIO 0)', 'Se graban en la flash el cargador, la tabla de particiones y la aplicación', 'Reinicio: el cargador arranca tu aplicación', 'Abres el monitor serie a 115 200 baudios'], e: 'El monitor solo tiene sentido cuando la aplicación ya corre.', c: 'es_upload', h: 'No se puede grabar lo que no se ha compilado, ni ver mensajes de lo que no corre.' },
      Q('El monitor repite «Guru Meditation Error» seguido de «rst:0xc (SW_CPU_RESET)». ¿Qué significa?', ['Tu programa provoca un fallo grave y el sistema se reinicia: hay que leer el backtrace', 'Que todo va bien', 'Que falta alimentación seguro', 'Que el WiFi está conectando'], 'Es un pánico: puntero inválido, desbordamiento, división entre cero…', { code: 'Guru Meditation Error: Core 1 panic\'ed (LoadProhibited)\n...\nrst:0xc (SW_CPU_RESET),boot:0x13', c: 'es_crash', h: 'SW_CPU_RESET: lo reinicia el propio software, no la alimentación.' }),
      Q('Aparece «Brownout detector was triggered» y se reinicia.', ['La alimentación cayó por debajo del umbral: picos de consumo o cable malo', 'Error de sintaxis', 'Flash llena', 'Contraseña WiFi mal'], 'Lo verás a fondo en el módulo 2.', { c: 'es_brown', h: 'Brown-out: «apagón a medias». ¿De qué?' }),
      Q('ESP.getFreeHeap() devuelve unos 300 000. ¿Qué es?', ['Bytes de RAM libres para memoria dinámica', 'Bytes de flash libres', 'La frecuencia en Hz', 'El número de serie'], 'El heap es la RAM que reparten malloc, new, String…', { c: 'es_heap', h: 'Heap: la RAM que se reparte en marcha.' }),
      Q('setCpuFrequencyMhz(80) en un proyecto con WiFi:', ['Ahorra energía a cambio de velocidad; 80 MHz es el mínimo para usar el WiFi', 'Rompe el WiFi siempre', 'Aumenta la velocidad', 'No hace nada'], 'Por debajo de 80 MHz la radio no funciona.', { c: 'es_cpufreq', h: 'Recuerda dónde se rompía el WiFi en el experimento.' }),
      Q('Ves texto normal pero también basura al arrancar.', ['La ROM habla a 115 200 y tu programa a otra velocidad: iguala Serial.begin() y el monitor', 'La placa está rota', 'El cable es de carga', 'Falta PSRAM'], 'Usar 115 200 en todo evita confusiones.', { c: 'es_upload', h: 'Dos emisores distintos hablando por el mismo puerto: ¿a qué velocidad cada uno?' }),
      Q('ESP.getEfuseMac() devuelve…', ['La MAC única grabada de fábrica en los eFuses', 'La IP', 'La contraseña WiFi', 'La versión del núcleo'], 'Sirve como identificador único de cada placa.', { c: 'es_secure', h: 'Los eFuses guardan datos de fábrica que no cambian.' }),
      RES('Arduino-ESP32 3.x funciona sobre ESP-IDF 5; los ejemplos de la 2.x pueden no compilar.', 'Subir = compilar, modo descarga, grabar y reiniciar; el monitor a <b>115 200</b> muestra el motivo del reinicio.', '<b>Guru Meditation</b>: pánico del programa; <b>Brownout</b>: caída de alimentación.', 'Con radio, la CPU a 80 MHz como mínimo; el heap es la RAM dinámica; la MAC está en los eFuses.')
    ]),
    SIM('es-s1', 'Reto: coche fantástico', 'Monta seis LED en los pines del programa para que la luz barra de un lado a otro.', { arduino: 'es_knight', board: 'esp32', parts: ['res', 'led'], code: true, hint: 'LED en los GPIO 13, 14, 27, 26, 25 y 33 (fila de abajo de la placa). ' + LED_HINT }, 'es_knight'),
    SIM('es-s2', 'Reto: contador binario', 'Cuatro LED muestran la cuenta de 0 a 15. Colócalos en el orden de los bits.', { arduino: 'es_binario', board: 'esp32', parts: ['res', 'led'], code: true, hint: 'Bit 0 en el GPIO 25, bit 1 en el 26, bit 2 en el 27 y bit 3 en el 14. ' + LED_HINT }, 'es_binario'),
    PRJ('es-p1', 'Proyecto: banco de pruebas de tu ESP32', 'es_bench')
  ];

  const M2 = [
    L('es5', 'Alimentación: 3,3 V, picos y brownout', 'bolt', ['es_brown', 'es_ledres', 'es_3v3'], [
      Q('Tu ESP32 funciona bien hasta que conecta al WiFi, y entonces se reinicia. ¿Qué sospechas?', ['La alimentación no aguanta los picos de la radio', 'Un error en el código del WiFi', 'La contraseña es incorrecta', 'El chip está defectuoso'], 'Al transmitir, la radio pide de golpe mucha corriente. Si la fuente no llega, la tensión cae. Vamos a provocarlo.', { predict: true, c: 'es_brown', h: 'Piensa en qué cambia en el consumo cuando la radio empieza a transmitir.' }),
      { t: 'explore', text: 'La radio pide un pico de 240 mA durante 1 ms. La fuente (USB, cable y regulador) solo da cierta corriente a tiempo; un condensador junto al módulo puede ayudar.', viz: 'es_supply',
        params: { src: { label: 'Corriente que la fuente da a tiempo', val: 200, list: [100, 150, 200, 300, 500, 800], unit: 'mA', dec: 0 }, c: { label: 'Condensador junto al módulo', val: 0, list: [0, 10, 100, 220, 470, 1000], unit: 'µF', dec: 0 }, r: { val: 0.5, fixed: true } },
        tasks: [
          { q: 'okWeak', min: 1, max: 1, text: 'Con la fuente de 200 mA, que la tensión no baje de 3,0 V', done: 'El condensador entrega lo que falta durante el pico: de 220 µF para arriba basta aquí.', hint: 'Añade un condensador grande.' },
          { q: 'okNoCap', min: 1, max: 1, text: 'Ahora sin condensador: ¿qué fuente hace falta?', done: 'Sin depósito, la fuente tiene que dar el pico entera: al menos 240 mA en el instante.', hint: 'Quita el condensador y sube la fuente.' }] },
      I('El módulo WROOM trabaja entre <b>3,0 y 3,6 V</b>. En reposo gasta decenas de mA, pero al <b>transmitir por WiFi</b> pide picos de unos <b>240 mA</b> durante milisegundos.', {
        svg: SV(150, `<path d="M20 20V120H290" stroke="currentColor" fill="none"/>${tx(24, 18, 'corriente', 'vizsm')}${tx(250, 136, 'tiempo', 'vizsm')}
          <path d="M20 104H70V30H80V104H150V30H158V104H230V30H240V104H290" fill="none" stroke="var(--led)" stroke-width="2.5"/><path d="M20 104H290" stroke="var(--muted)" stroke-dasharray="3 3"/>
          ${tx(84, 40, '≈ 240 mA al transmitir', 'vizsm')}${tx(160, 118, 'decenas de mA', 'vizsm')}`) }),
      I('Si la fuente, el cable o el regulador no dan esos picos, la tensión cae. El <b>detector de caída</b> (brownout) lo ve y reinicia el chip antes de que haga algo raro, como escribir mal la flash.', {
        svg: SV(150, `<path d="M20 30H100L112 96H150L160 30H290" fill="none" stroke="var(--err)" stroke-width="2.5"/><path d="M20 80H290" stroke="var(--muted)" stroke-dasharray="4 3"/>${tx(200, 76, 'umbral', 'vizsm')}
          ${tx(24, 24, '3,3 V', 'vizsm')}<circle cx="112" cy="96" r="10" fill="none" stroke="var(--err)" stroke-width="2" class="a-pulse"/>${tx(70, 124, '¡brownout! → reinicio', 'vizlab', 'fill="var(--err)"')}`),
        more: 'Desactivar el detector para que «no se reinicie» esconde el problema: el chip seguiría trabajando con tensión baja y podría corromper la flash o hacer cosas raras. Arregla la causa: cable corto y bueno, fuente capaz, condensador cerca del módulo.' }),
      I('Un condensador grande junto al módulo es un pequeño depósito: entrega el pico mientras la fuente reacciona. Al dar carga, su tensión baja <b>ΔV = I · t / C</b>.', {
        svg: SV(150, `${bx(16, 50, 70, 40, 'Fuente')}${ar(86, 70, 120, 70, 'var(--led)', 'class="a-flow-slow"')}<rect x="126" y="40" width="40" height="60" rx="4" fill="none" stroke="currentColor"/><rect x="126" y="62" width="40" height="38" rx="4" fill="#3E8FCB" class="a-bob"/>
          ${tx(146, 116, '470 µF', 'vizsm', 'text-anchor="middle"')}${ar(166, 70, 204, 70, 'var(--led)', 'class="a-flow"')}${bx(210, 50, 76, 40, 'ESP32', 'var(--led)', W)}${tx(150, 140, 'el depósito cubre el pico', 'vizsm', 'text-anchor="middle"')}`),
        more: 'Lo habitual: un electrolítico de 100–470 µF y un cerámico de 100 nF entre 3V3 y GND, pegados al módulo. Servos, motores y tiras LED, con su propia fuente y la masa en común.' }),
      { t: 'steps', text: '¿Cuánto baja un condensador de 470 µF si entrega 250 mA durante 1 ms?', steps: ['Carga que sale: <b>Q = I · t</b> = 0,25 A × 0,001 s = 0,00025 C', 'En un condensador, <b>V = Q / C</b>', 'ΔV = 0,00025 C / 0,00047 F', '<b>≈ 0,53 V</b>: de 3,3 V a unos 2,8 V si lo diera él solo'], result: 'Unos 0,53 V: ayuda, pero la fuente debe aportar casi todo el pico.' },
      I('Cada GPIO da 3,3 V. La resistencia de un LED se calcula igual que con 5 V: <b>R = (3,3 − Vf) / I</b>. No pases de unos <b>20 mA por pin</b>; para más, un transistor.\nY al revés: los pines no aguantan más de unos 3,6 V. Una señal de 5 V se baja con un divisor.', {
        svg: SV(140, `${bx(10, 40, 60, 36, 'GPIO', 'var(--led)', W)}${tx(40, 92, '3,3 V', 'vizsm', 'text-anchor="middle"')}<path d="M70 58H100" stroke="currentColor" stroke-width="2"/><rect x="100" y="50" width="44" height="16" fill="var(--ice-soft)" stroke="currentColor"/>${tx(122, 44, '150 Ω', 'vizsm', 'text-anchor="middle"')}
          <path d="M144 58H180" stroke="currentColor" stroke-width="2"/><path d="M180 46V70L200 58Z" fill="#FF3B30"/><path d="M200 46V70" stroke="currentColor" stroke-width="2"/><path d="M200 58H240V100H40V76" fill="none" stroke="currentColor" stroke-width="2"/>${tx(190, 40, '1,8 V', 'vizsm', 'text-anchor="middle"')}
          ${tx(150, 124, '(3,3 − 1,8) / 0,01 A = 150 Ω → 10 mA', 'vizlab', 'text-anchor="middle"')}`) }),
      Q('Tu placa se reinicia solo al conectar al WiFi. ¿Primera sospecha?', ['Alimentación: cable, puerto USB o regulador insuficiente', 'La contraseña', 'El código es lento', 'Falta una pull-up'], 'Prueba con otro cable corto y otro puerto, o un cargador bueno.', { c: 'es_brown', h: 'Lo que hace distinto el momento de conectar es el consumo de la radio.' }),
      Nm('Un pico de 200 mA durante 2 ms sale solo de un condensador de 1000 µF. ¿Cuánto baja su tensión, en V?', 0.4, 'V', 'ΔV = I · t / C = 0,2 × 0,002 / 0,001 = 0,4 V.', { tol: 0.02, c: 'es_brown', h: 'ΔV = I · t / C, con todo en A, s y F.' }),
      Q('¿Y desactivar el detector de brownout para que no se reinicie?', ['Esconde el problema: el chip trabaja con tensión baja y puede corromper la flash', 'Lo arregla', 'Ahorra energía', 'Es lo recomendado'], 'Arregla la causa, no el aviso.', { c: 'es_brown', h: 'El detector es un aviso, no la avería.' }),
      Nm('LED rojo (1,8 V) a 10 mA desde un GPIO de 3,3 V. ¿Resistencia?', 150, 'Ω', '(3,3 − 1,8) / 0,01 = 150 Ω.', { tol: 2, c: 'es_ledres', h: 'Resta la tensión del LED a 3,3 V y divide entre la corriente en amperios.' }),
      Q('Un LED azul (unos 3,0 V) directamente desde un GPIO de 3,3 V con resistencia.', ['Queda muy poco margen: poca corriente e inestable; mejor un transistor desde 5 V', 'Brilla muchísimo', 'Se quema seguro', 'No polariza'], 'Con 0,3 V de margen, cualquier variación cambia mucho la corriente.', { c: 'es_ledres', h: 'Calcula cuánta tensión le queda a la resistencia.' }),
      Q('La salida Echo de un sensor HC-SR04 (5 V) al ESP32:', ['Con un divisor (1 kΩ y 2 kΩ) o un adaptador de nivel', 'Directa', 'Con 10 Ω en serie', 'Con un diodo al revés'], 'Los pines no toleran 5 V.', { c: 'es_3v3', h: '¿Cuánto aguanta un pin del ESP32 como máximo?' }),
      RES('Al transmitir, el ESP32 pide picos de unos <b>240 mA</b>; si la tensión cae, salta el <b>brownout</b> y reinicia.', 'Remedio: fuente capaz, cable corto y un condensador grande junto al módulo (<b>ΔV = I · t / C</b>).', 'LED a 3,3 V: <b>R = (3,3 − Vf) / I</b>, máximo unos 20 mA por pin.', 'Los pines no toleran 5 V: divisor o adaptador de nivel.')
    ]),
    L('es6', 'Pines con trampa', 'chip', ['es_strap', 'es_pinmap'], [
      Q('Añades un pulsador con resistencia pull-up al GPIO 12 y la placa deja de arrancar. ¿Por qué crees que es?', ['El chip lee ese pin al arrancar y cambia su configuración', 'El pulsador gasta demasiado', 'El GPIO 12 no existe', 'Falta un condensador'], 'Algunos pines deciden cómo arranca el chip. Vamos a jugar con ellos.', { predict: true, c: 'es_strap', h: 'Fíjate en cuándo falla: al arrancar, no después.' }),
      { t: 'explore', text: 'Al soltar EN, el ESP32 lee unos pines para decidir cómo arrancar. Cambia sus niveles y mira qué decide.', viz: 'es_strap',
        params: { g0: yn('GPIO 0 (0 bajo · 1 alto)', 0), g2: yn('GPIO 2 (0 bajo · 1 alto)', 0), g12: yn('GPIO 12 (0 bajo · 1 alto)', 0), g15: yn('GPIO 15 (0 bajo · 1 alto)', 1) },
        tasks: [
          { q: 'run', min: 1, max: 1, text: 'Ahora está en modo descarga: haz que arranque tu programa', done: 'Con el GPIO 0 alto (su estado normal, tiene pull-up interna), arranca desde la flash.', hint: 'El botón BOOT pone a masa un pin concreto.' },
          { q: 'quietRun', min: 1, max: 1, text: 'Que arranque sin los mensajes de la ROM', done: 'El GPIO 15 bajo al arrancar silencia el saludo de la ROM.' },
          { q: 'noboot', min: 1, max: 1, text: 'Rompe el arranque cambiando un solo pin', done: 'El GPIO 12 alto elige flash de 1,8 V: la de tu módulo es de 3,3 V y no la lee.', hint: 'Prueba el que salía en la pregunta del principio.' }] },
      I('Al arrancar, el chip lee los pines de <b>arranque</b> (strapping): <b>GPIO 0, 2, 5, 12 y 15</b>. Después son pines normales, pero si tu circuito los fuerza al nivel equivocado, la placa no arranca.', {
        svg: SV(120, [['0', 'bajo = descarga'], ['2', 'bajo para programar'], ['5', 'tiempos SDIO'], ['12', 'alto = flash 1,8 V'], ['15', 'ROM callada']].map(([n, d], i) => bx(6 + i * 58, 20, 52, 40, 'GPIO ' + n, '#D9A21B', W) + tx(32 + i * 58, 80 + (i % 2) * 16, d, 'vizsm', 'text-anchor="middle" style="font-size:9px"')).join('')),
        more: 'Algunos de estos pines, y otros como el 1, emiten pulsos o mensajes durante el arranque. Por eso no conviene colgarles un relé u otra salida que no deba moverse al encender.' }),
      I('Los <b>GPIO 6 a 11</b> van a la flash del módulo: si los tocas, el programa se cuelga. En módulos con PSRAM (WROVER), el <b>16 y el 17</b> también están ocupados.', {
        svg: SV(120, `${bx(10, 20, 120, 80, 'ESP32', 'var(--led)', W, 'vizlab')}${bx(190, 30, 100, 60, 'Flash', 'var(--ice-soft)', '', 'vizlab')}
          ${[0, 1, 2, 3, 4, 5].map(i => `<path d="M130 ${30 + i * 12}H190" stroke="var(--err)" stroke-width="2" class="a-flow-slow"/>`).join('')}${tx(160, 112, 'GPIO 6–11', 'vizlab', 'text-anchor="middle" fill="var(--err)"')}`) }),
      I('Los <b>GPIO 34, 35, 36 (VP) y 39 (VN)</b> son <b>solo de entrada</b>: no pueden ser salida y <b>no tienen pull-up ni pull-down internas</b>. Y los GPIO 1 y 3 son el puerto serie del USB: si los usas, pierdes el monitor.', {
        svg: SV(110, `${[34, 35, 36, 39].map((n, i) => bx(10 + i * 50, 20, 44, 34, String(n), 'var(--ice-soft)', '', 'vizlab')).join('')}${tx(105, 76, 'solo entrada · sin pull-ups', 'vizsm', 'text-anchor="middle"')}
          ${bx(222, 20, 32, 34, '1', '#D9A21B', W, 'vizlab')}${bx(258, 20, 32, 34, '3', '#D9A21B', W, 'vizlab')}${tx(256, 76, 'USB serie', 'vizsm', 'text-anchor="middle"')}`) }),
      { t: 'explore', text: 'Ahora explora los pines uno a uno. Elige el número y el uso.', viz: 'es_pins',
        params: { pin: { label: 'GPIO', val: 25, list: PINLIST, dec: 0 }, uso: { label: 'Uso (0 LED · 1 pulsador con INPUT_PULLUP)', val: 0, list: [0, 1], dec: 0 } },
        tasks: [
          { q: 'flash', min: 1, max: 1, text: 'Encuentra un pin de la flash', done: 'Del 6 al 11: ni los toques.', hint: 'Mueve el GPIO hacia los primeros números.' },
          { q: 'inOnly', min: 1, max: 1, text: 'Encuentra un pin de solo entrada', done: 'Del 34 al 39: ni salida ni resistencias internas.' },
          { q: 'btnOk', min: 1, max: 1, text: 'Busca un pin cómodo para un pulsador con INPUT_PULLUP', done: 'Por ejemplo el 4, el 13 o el 27: con pull-up interna y sin papel en el arranque.', hint: 'Pon el uso en 1 y evita los de arranque.' }] },
      { t: 'steps', text: 'Elige pines para un relé, un pulsador y un LED.', steps: ['Descarta 6–11 (flash) y 1 y 3 (puerto serie del USB)', 'El relé no debe moverse al arrancar: fuera los de arranque (0, 2, 5, 12, 15)', 'El pulsador quiere INPUT_PULLUP: fuera 34–39, que no tienen', 'Quedan pines cómodos: relé en el 26, pulsador en el 27 y LED en el 25'], result: 'Pines «aburridos»: 4, 13, 14, 16–19, 21–23, 25–27, 32 y 33.' },
      { t: 'match', q: 'Une cada pin de arranque con su efecto.', pairs: [['GPIO 0', 'A masa al arrancar: modo descarga'], ['GPIO 2', 'Debe estar bajo o al aire para programar'], ['GPIO 12', 'Alto al arrancar: flash a 1,8 V, no arranca'], ['GPIO 15', 'Bajo al arrancar: silencia los mensajes de la ROM']], c: 'es_strap', h: 'Repite lo que viste al mover los niveles en la exploración.' },
      Q('¿Puedes usar el GPIO 9 para un LED?', ['No: es de la flash y el programa se colgaría', 'Sí, sin problema', 'Solo con PWM', 'Solo con una resistencia grande'], 'Muchas placas ni siquiera lo sacan.', { c: 'es_pinmap', h: 'Busca en qué grupo está el 9.' }),
      Q('Un pulsador a GND en el GPIO 34 con INPUT_PULLUP lee valores al azar.', ['El 34 no tiene pull-up interna: pon una de 10 kΩ externa a 3V3', 'Está roto', 'Falta delay', 'Debe ir a 5 V'], 'INPUT_PULLUP no hace nada del 34 al 39.', { code: 'pinMode(34, INPUT_PULLUP);  // ¿?\nint b = digitalRead(34);', c: 'es_pinmap', h: 'Del 34 al 39, ¿qué les falta?' }),
      { t: 'match', q: 'Clasifica estos grupos de pines.', pairs: [['6 a 11', 'Prohibidos: la flash'], ['34 a 39', 'Solo entrada, sin pull-ups'], ['0, 2, 5, 12, 15', 'De arranque: con cuidado'], ['13, 14, 25, 26, 27, 32, 33', 'Cómodos para casi todo']], c: 'es_pinmap', h: 'Empieza por los prohibidos.' },
      Q('¿Qué pin es el más seguro para un LED?', ['GPIO 25', 'GPIO 12', 'GPIO 0', 'GPIO 34'], 'El 12 y el 0 son de arranque y el 34 solo de entrada.', { c: 'es_pinmap', h: 'Descarta los de arranque y los de solo entrada.' }),
      Q('Conectas un módulo al GPIO 2 y a veces falla la subida del programa.', ['Si el módulo mantiene el 2 alto, el chip no entra en modo descarga', 'El 2 es de la flash', 'El 2 es solo de entrada', 'Pasa con todos los pines'], 'Desconéctalo al programar o usa otro pin.', { c: 'es_strap', h: 'Para descargar, ¿cómo debe estar el GPIO 2?' }),
      Q('Para una salida que no debe moverse al arrancar (un relé), evita…', ['Los pines de arranque y los que emiten pulsos al arrancar, como el 1 o el 15', 'Los pines 25 y 26', 'Cualquier pin par', 'Los pines del ADC1'], 'Si un pin da pulsos al arrancar, el relé haría clic.', { c: 'es_strap', h: '¿Qué pines hacen cosas durante el arranque?' }),
      RES('De arranque: <b>0, 2, 5, 12 y 15</b>. GPIO 0 bajo = descarga; GPIO 12 alto = no arranca.', '<b>6–11</b>: flash (prohibidos). <b>34–39</b>: solo entrada, sin pull-ups. <b>1 y 3</b>: USB serie.', 'Para lo normal, los cómodos: 4, 13, 14, 16–19, 21–23, 25–27, 32 y 33.')
    ]),
    L('es7', 'La matriz GPIO', 'bus', ['es_bus', 'es_adcpins', 'es_mask'], [
      Q('En un Arduino Uno el I²C va siempre en A4 y A5. ¿Y en el ESP32?', ['Puedes sacarlo por casi cualquier pin', 'También en dos pines fijos', 'No tiene I²C', 'Solo en los pines 34 a 39'], 'El ESP32 tiene dentro una centralita entre periféricos y pines. Pruébala.', { predict: true, c: 'es_bus', h: 'El ESP32 lleva un conmutador interno entre periféricos y pines.' }),
      { t: 'explore', text: 'Elige un periférico y un pin. La matriz intenta conectarlos.', viz: 'es_matrix',
        params: { per: { label: 'Periférico (0 I²C SDA · 1 UART TX · 2 PWM · 3 ADC)', val: 1, list: [0, 1, 2, 3], dec: 0 }, pin: { label: 'GPIO', val: 25, list: PINLIST, dec: 0 } },
        tasks: [
          { q: 'sda16', min: 1, max: 1, text: 'Saca el SDA del I²C por el GPIO 16', done: 'Lo digital se enruta por la matriz al pin que elijas.', hint: 'Periférico 0 y GPIO 16.' },
          { q: 'adcFail', min: 1, max: 1, text: 'Intenta llevar el ADC al GPIO 23', done: 'Lo analógico no pasa por la matriz: el 23 no tiene ADC.' },
          { q: 'adcOk', min: 1, max: 1, text: 'Busca un pin al que sí llegue el ADC', done: 'El ADC va por pistas fijas a sus pines, como el 32 o el 34.' }] },
      I('Casi cualquier periférico digital (UART, I²C, SPI, PWM…) puede salir por casi cualquier GPIO gracias a la <b>matriz GPIO</b>, una centralita interna. Por eso escribes Wire.begin(sda, scl) con los pines que te convengan.', {
        svg: SV(150, `${['UART', 'I²C', 'SPI', 'PWM'].map((n, i) => bx(8, 14 + i * 32, 60, 24, n)).join('')}${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${96 + i * 18} 10V140M82 ${20 + i * 22}H200" stroke="var(--line)"/>`).join('')}
          <path d="M68 58H132V86H220" fill="none" stroke="var(--led)" stroke-width="2.5" class="a-flow"/><path d="M68 90H168V42H220" fill="none" stroke="#3E8FCB" stroke-width="2.5" class="a-flow"/>
          ${bx(222, 30, 70, 24, 'GPIO 16')}${bx(222, 74, 70, 24, 'GPIO 27')}${tx(140, 148, 'cualquier cruce se puede cerrar', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Dos excepciones:\n· Lo <b>analógico</b> (ADC, DAC, touch) va fijo a sus pines.\n· Las señales muy rápidas (SPI a máxima velocidad, tarjetas SD) van mejor por el <b>IO_MUX</b>, una conexión directa a pines concretos.', {
        svg: SV(110, `${bx(10, 20, 70, 30, 'ADC')}<path d="M80 35H210" stroke="var(--ok)" stroke-width="3"/>${bx(210, 20, 80, 30, 'GPIO 34')}${tx(145, 30, 'pista fija', 'vizsm', 'text-anchor="middle"')}
          ${bx(10, 66, 70, 30, 'SPI rápido')}<path d="M80 81H210" stroke="var(--led)" stroke-width="3"/>${bx(210, 66, 80, 30, 'GPIO 18')}${tx(145, 76, 'IO_MUX directo', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Pines <b>por defecto</b> en Arduino-ESP32 (costumbre, no obligación):\n· I²C: SDA 21, SCL 22.\n· SPI: SCK 18, MISO 19, MOSI 23, CS 5.\n· UART2: RX 16, TX 17.', {
        svg: SV(110, `${[['SDA', 21], ['SCL', 22], ['SCK', 18], ['MISO', 19], ['MOSI', 23], ['RX2', 16], ['TX2', 17]].map(([n, g], i) => bx(4 + i * 42, 30, 38, 46, '', 'var(--ice-soft)') + tx(23 + i * 42, 48, n, 'vizsm', 'text-anchor="middle" style="font-size:9.5px"') + tx(23 + i * 42, 66, g, 'vizlab', 'text-anchor="middle"')).join('')}${tx(150, 100, 'Si no indicas pines, se usan estos', 'vizsm', 'text-anchor="middle"')}`),
        more: 'Los pines originales de la UART1 (9 y 10) son de la flash, así que con Serial1 indica siempre los tuyos. Y en un WROVER, el 16 y el 17 son de la PSRAM: allí la UART2 necesita otros.' }),
      I('Para cambiar varios pines <b>a la vez</b>, sin el tiempo de cada digitalWrite, se escribe una máscara en los registros: <b>W1TS</b> pone a 1 los pines marcados y <b>W1TC</b> los pone a 0. <b>1 << 25</b> es un 1 desplazado 25 posiciones: el bit del GPIO 25.', {
        tune: { viz: 'es_mask', params: { a: { label: 'Primer pin', val: 25, list: [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27], dec: 0 }, b: { label: 'Segundo pin (−1: ninguno)', val: 26, list: [-1, 2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27], dec: 0 }, op: yn('Registro (0 W1TS · 1 W1TC)', 0) } },
        code: 'REG_WRITE(GPIO_OUT_W1TS_REG, (1 << 25) | (1 << 26)); // 25 y 26 a 1\nREG_WRITE(GPIO_OUT_W1TC_REG, (1 << 25));             // 25 a 0' }),
      { t: 'steps', text: 'Construye la máscara para los GPIO 25 y 26.', steps: ['Cada pin es un bit: el GPIO n es el bit n', '1 << 25 = 2^25 = 0x2000000', '1 << 26 = 2^26 = 0x4000000', 'Se juntan con OR: (1 << 25) | (1 << 26) = <b>0x6000000</b>'], result: '0x6000000: dos bits a 1 y todos los demás a 0.' },
      Q('¿Puedes leer una tensión analógica en el GPIO 23?', ['No: el ADC solo está en sus pines fijos', 'Sí, la matriz lo conecta', 'Solo a 8 bits', 'Solo con WiFi'], 'El 23 no tiene canal de ADC, y la matriz no mueve lo analógico.', { c: 'es_adcpins', h: 'Recuerda qué pasó al llevar el ADC al 23.' }),
      Q('¿Qué hace esta línea?', ['Inicia el I²C con SDA en el 16 y SCL en el 17', 'Lee los pines 16 y 17', 'Configura una UART', 'Nada'], 'En un WROVER el 16 y el 17 son de la PSRAM: allí elegirías otros.', { code: 'Wire.begin(16, 17);', c: 'es_bus', h: 'Wire es el I²C; los argumentos son los pines.' }),
      { t: 'match', q: 'Une cada señal con su pin por defecto.', pairs: [['SDA', 'GPIO 21'], ['SCL', 'GPIO 22'], ['SCK', 'GPIO 18'], ['MOSI', 'GPIO 23']], c: 'es_bus', h: 'El I²C va en el 21 y el 22; el SPI empieza en el 18.' },
      Q('Un GPS por la UART1. ¿Qué haces?', ['Indicar los pines: Serial1.begin(9600, SERIAL_8N1, 26, 27)', 'Usar los pines 9 y 10 de fábrica', 'Usar los pines 1 y 3', 'Nada, la UART1 no existe'], 'Los pines originales de la UART1 (9 y 10) son de la flash.', { c: 'es_bus', h: 'Los pines de fábrica de la UART1 caen en una zona prohibida.' }),
      Q('¿Qué ventaja tiene escribir en GPIO_OUT_W1TS_REG?', ['Cambia varios pines en la misma instrucción sin tocar los demás', 'Funciona a 5 V', 'Usa menos energía siempre', 'Sirve para leer el ADC'], 'W1TS: «write 1 to set». Útil para buses paralelos y señales sincronizadas.', { c: 'es_mask', h: 'Piensa en lo que hacía la máscara con los bits a 0.' }),
      Q('¿Qué pasa con REG_WRITE(GPIO_OUT_W1TC_REG, 1 << 13)?', ['El GPIO 13 pasa a 0 y los demás no cambian', 'Todos pasan a 0 menos el 13', 'El GPIO 13 pasa a 1', 'Se leen 13 pines'], 'W1TC: los bits a 1 de la máscara ponen su pin a 0.', { c: 'es_mask', h: 'W1TC: «write 1 to clear».' }),
      RES('La <b>matriz GPIO</b> lleva UART, I²C, SPI o PWM a casi cualquier pin: tú los indicas.', 'Lo analógico (ADC, DAC, touch) va <b>fijo</b>; lo muy rápido, mejor por IO_MUX.', 'Por defecto: I²C 21/22, SPI 18/19/23/5, UART2 16/17.', 'Máscaras: <b>1 << n</b> es el pin n; W1TS pone a 1 y W1TC a 0, a la vez.')
    ]),
    L('es8', 'El ADC: ADC1, ADC2 y atenuación', 'gauge', ['es_adc', 'es_adcpins'], [
      Q('Con el WiFi encendido, lees un potenciómetro en el GPIO 25. ¿Qué crees que pasará?', ['Falla: ese ADC lo usa la radio', 'Lee perfecto', 'Lee el doble', 'Se apaga el WiFi'], 'El ESP32 tiene dos ADC y el WiFi se queda con uno. Ahora verás además otra trampa: la atenuación.', { predict: true, c: 'es_adcpins', h: 'No todos los pines analógicos están libres cuando la radio trabaja.' }),
      { t: 'explore', text: 'Este es el ADC del ESP32 clásico: la curva naranja dice qué lectura da cada tensión. La zona verde es donde mide casi en línea recta.', viz: 'es_adc',
        params: { V: { label: 'Tensión en el pin', val: 1.2, min: 0, max: 3.3, step: 0.05, unit: 'V', dec: 2 }, at: { label: 'Atenuación', val: 11, list: [0, 2.5, 6, 11], unit: 'dB', dec: 1 } },
        tasks: [
          { q: 'over', min: 1, max: 1, text: 'Con 11 dB, sube la tensión hasta salirte de la zona fiable', done: 'Por encima de unos 2,45 V la curva se aplana: lecturas comprimidas.', hint: 'Sube la tensión casi hasta arriba.' },
          { q: 'under', min: 1, max: 1, text: 'Ahora baja hasta salirte por abajo', done: 'Por debajo de unos 0,15 V tampoco distingue bien: zona muerta.', hint: 'Lleva la tensión casi a 0.' },
          { q: 'fit', min: 1, max: 1, text: 'Pon 1,6 V y elige la atenuación con más resolución que lo deje en zona fiable', done: '6 dB: llega a unos 1,75 V y cada cuenta vale menos mV que con 11 dB.', hint: 'Prueba de menor a mayor atenuación.' }] },
      I('El ESP32 clásico tiene dos ADC de 12 bits:\n· <b>ADC1</b>: GPIO 32 a 39.\n· <b>ADC2</b>: GPIO 0, 2, 4, 12–15 y 25–27.\nCon el <b>WiFi activo, el ADC2 no se puede usar</b>: lo ocupa el driver de radio.', {
        svg: SV(120, `${[32, 33, 34, 35, 36, 39].map((n, i) => bx(8 + i * 34, 20, 30, 28, String(n), 'var(--ok)', W)).join('')}${tx(110, 66, 'ADC1: siempre libre', 'vizlab', 'text-anchor="middle" fill="var(--ok)"')}
          ${[4, 12, 13, 14, 15, 25, 26, 27].map((n, i) => bx(8 + i * 35, 78, 31, 24, String(n), '#3E8FCB', W)).join('')}${tx(150, 116, 'ADC2: bloqueado con WiFi (también 0 y 2)', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Por dentro, el ADC solo mide hasta un voltio y poco. Un <b>atenuador</b> divide la entrada para llegar más arriba: 0; 2,5; 6 u 11 dB (ESP-IDF 5 llama 12 dB al último). Arduino usa 11 dB por defecto.', {
        svg: SV(130, `${[['0 dB', 0.95], ['2,5 dB', 1.25], ['6 dB', 1.75], ['11 dB', 2.45]].map(([n, v], i) => tx(10, 30 + i * 26, n, 'vizlab') + `<rect x="64" y="${18 + i * 26}" width="${v / 2.5 * 150}" height="16" rx="3" fill="var(--ok)" opacity=".75"/>` + tx(70 + v / 2.5 * 150, 30 + i * 26, 'hasta ~' + String(v).replace('.', ',') + ' V', 'vizsm')).join('')}${tx(10, 124, 'Zonas fiables orientativas del ESP32 clásico', 'vizsm')}`),
        code: 'analogSetPinAttenuation(34, ADC_6db);   // solo ese pin\nanalogSetAttenuation(ADC_11db);         // todos' }),
      I('Cada chip trae <b>calibración de fábrica</b> en sus eFuses. analogReadMilliVolts() la aplica y devuelve milivoltios corregidos: casi siempre mejor que convertir analogRead() con una regla de tres.', { code: 'int raw = analogRead(34);           // 0..4095, sin corregir\nint mv  = analogReadMilliVolts(34); // milivoltios calibrados' }),
      { t: 'steps', text: 'Una señal llega como mucho a 1,1 V. ¿Qué atenuación eliges?', steps: ['Zonas fiables: 0 dB hasta ~0,95 V; 2,5 dB hasta ~1,25 V; 6 dB hasta ~1,75 V; 11 dB hasta ~2,45 V', '0 dB no llega a 1,1 V: descartada', '2,5 dB sí llega, y es la menor que la cubre', 'Menos atenuación = cada cuenta vale menos mV = más resolución'], result: '2,5 dB' },
      Q('Un joystick en un proyecto con WiFi. ¿Qué pines usas?', ['GPIO 32 a 39 (ADC1)', 'GPIO 25 a 27', 'GPIO 0 y 2', 'Cualquiera'], 'El ADC2 queda bloqueado con la radio.', { c: 'es_adcpins', h: '¿Cuál de los dos ADC sigue libre con la radio?' }),
      TU('Una señal de 1,6 V como máximo: elige la atenuación con más resolución que la deje en la zona fiable.', 'es_adc', { V: { val: 1.6, fixed: true }, at: { label: 'Atenuación', val: 0, list: [0, 2.5, 6, 11], unit: 'dB', dec: 1 } }, { q: 'fit', min: 1, max: 1, text: 'Objetivo: 1,6 V en zona fiable con la menor atenuación', hint: 'Con 2,5 dB se sale; con 11 dB vale, pero pierdes resolución.' }, '6 dB: fiable hasta unos 1,75 V.', { c: 'es_adc', h: 'Sube la atenuación de una en una y quédate con la primera que cubra 1,6 V.' }),
      G('es_adcAtten'),
      Q('Un divisor deja 2,8 V en el pin (11 dB) y la lectura sale baja.', ['Por encima de unos 2,45 V el ADC se comprime: rehaz el divisor', 'El pin está roto', 'Falta un condensador', 'Hay que usar el ADC2'], 'Diseña para quedarte en la zona recta.', { c: 'es_adc', h: '¿Dónde acaba la zona verde con 11 dB?' }),
      Q('Por debajo de unos 0,1 V el ADC lee casi siempre 0. Esto significa…', ['Que tiene una zona muerta abajo: no midas señales muy pequeñas sin amplificarlas', 'Que está roto', 'Que la atenuación es 0 dB', 'Que hay WiFi'], 'Para señales de milivoltios, un amplificador o un ADC externo.', { c: 'es_adc', h: 'Recuerda la parte baja de la curva.' }),
      Q('¿Qué pin eliges para un potenciómetro en un proyecto con WiFi?', ['GPIO 33', 'GPIO 26', 'GPIO 23', 'GPIO 4'], 'El 26 y el 4 son del ADC2, y el 23 no tiene ADC.', { c: 'es_adcpins', h: 'Tiene que tener ADC y que sea del ADC1.' }),
      Q('¿Por qué analogReadMilliVolts() suele ser mejor que convertir analogRead() con una regla de tres?', ['Aplica la calibración de fábrica de tu chip y corrige la curva', 'Es más rápida', 'Lee hasta 5 V', 'Usa el ADC2'], 'Cada chip es un poco distinto: la calibración lo compensa.', { c: 'es_adc', h: 'Piensa en lo que guardan los eFuses.' }),
      RES('<b>ADC1</b> (32–39) siempre libre; <b>ADC2</b> bloqueado con el WiFi.', 'El atenuador amplía el rango: 0 dB ~0,95 V; 2,5 dB ~1,25 V; 6 dB ~1,75 V; 11 dB ~2,45 V.', 'Elige la menor atenuación que cubra tu señal y evita los extremos de la curva.', 'Usa <b>analogReadMilliVolts()</b>: aplica la calibración de fábrica.')
    ]),
    L('es9', 'Medir bien: divisores, filtros e histéresis', 'gauge', ['es_divbat', 'es_noise', 'es_cal2p', 'es_hyst'], [
      Q('Mides una batería con un divisor de dos resistencias de 1 MΩ, para que gaste poco. ¿Qué crees que pasará con la lectura?', ['Saldrá baja y ruidosa', 'Perfecta', 'Saldrá el doble', 'Siempre 4095'], 'El ADC necesita «tragar» un poco de carga en cada lectura, y un divisor tan flojo no se la da a tiempo.', { predict: true, c: 'es_divbat', h: 'El ADC carga un condensador interno en cada lectura.' }),
      { t: 'explore', text: 'Un divisor baja la batería (4,2 V llena) a la zona del ADC. Elige las resistencias: mira la tensión en el pin, lo que gasta siempre y si el ADC muestrea bien.', viz: 'es_vdiv',
        params: { r1: { label: 'R1 (arriba)', val: 10, list: [10, 22, 47, 100, 220, 470, 1000, 2200], unit: 'kΩ', dec: 0 }, r2: { label: 'R2 (abajo)', val: 10, list: [10, 22, 47, 100, 220, 470, 1000, 2200], unit: 'kΩ', dec: 0 }, vb: { val: 4.2, fixed: true }, cap: yn('Condensador en el pin (0 no · 1 100 nF)', 0) },
        tasks: [
          { q: 'lowI', min: 1, max: 1, text: 'Que el pin quede en la zona fiable y el divisor gaste menos de 10 µA', done: 'Con cientos de kΩ apenas gasta… pero mira el aviso del muestreo.', hint: 'Sube las dos resistencias por igual.' },
          { q: 'good', min: 1, max: 1, text: 'Arregla la lectura baja sin gastar más', done: 'El condensador hace de depósito: entrega la carga rápida que el divisor no puede dar.' }] },
      I('El pin ve <b>Vpin = Vbat · R2 / (R1 + R2)</b>. Para recuperar la batería, deshaz la cuenta: <b>Vbat = Vpin · (R1 + R2) / R2</b>.\nEl divisor gasta siempre Vbat / (R1 + R2).', {
        svg: SV(150, `${tx(10, 20, 'Vbat', 'vizlab')}<path d="M40 24V40M40 72V88M40 120V136" stroke="currentColor" stroke-width="2"/><rect x="30" y="40" width="20" height="32" fill="var(--ice-soft)" stroke="currentColor"/><rect x="30" y="88" width="20" height="32" fill="var(--ice-soft)" stroke="currentColor"/>
          ${tx(56, 60, 'R1', 'vizlab')}${tx(56, 108, 'R2', 'vizlab')}<path d="M40 80H150" stroke="currentColor" stroke-width="2"/>${bx(150, 66, 70, 28, 'ADC', 'var(--led)', W)}${tx(10, 148, 'GND', 'vizsm')}
          ${tx(230, 40, 'Vpin =', 'vizsm')}${tx(230, 58, 'Vbat × R2', 'vizsm')}${tx(230, 76, '÷ (R1 + R2)', 'vizsm')}`) }),
      I('Con resistencias enormes el divisor gasta poco, pero el ADC carga un pequeño condensador interno en cada lectura y la fuente es tan «débil» que no le da tiempo: lee bajo. Un <b>condensador de 100 nF</b> del pin a masa hace de depósito.', {
        svg: SV(130, `${bx(10, 40, 80, 40, 'Divisor 1 MΩ')}${ar(90, 60, 130, 60, 'currentColor', 'class="a-flow-slow"')}<rect x="132" y="36" width="34" height="48" rx="4" fill="none" stroke="currentColor"/><rect x="132" y="58" width="34" height="26" rx="4" fill="#3E8FCB" class="a-bob"/>${tx(149, 100, '100 nF', 'vizsm', 'text-anchor="middle"')}
          ${ar(166, 60, 206, 60, 'var(--led)', 'class="a-flow"')}${bx(210, 40, 80, 40, 'muestreo', 'var(--led)', W)}${tx(150, 124, 'goteo lento → depósito → sorbo rápido', 'vizsm', 'text-anchor="middle"')}`),
        more: 'Otra opción en nodos a batería: un MOSFET que conecte el divisor solo en el momento de medir, así no gasta nada el resto del tiempo.' }),
      { t: 'steps', text: 'R1 = 100 kΩ, R2 = 47 kΩ y analogReadMilliVolts() da 1300 mV. ¿Tensión de la batería?', steps: ['Deshaz el divisor: <b>Vbat = Vpin · (R1 + R2) / R2</b>', '(R1 + R2) / R2 = 147 / 47 ≈ 3,128', 'Vbat = 1,3 V × 3,128', '<b>≈ 4,07 V</b>'], result: 'Unos 4,07 V: una Li-ion casi llena.' },
      G('es_battDiv'),
      Nm('Divisor de 100 kΩ + 100 kΩ en una batería de 4,2 V. ¿Corriente que gasta siempre, en µA?', 21, 'µA', '4,2 / 200 000 = 0,000021 A = 21 µA: más que un ESP32 dormido.', { tol: 0.5, c: 'es_divbat', h: 'Las dos resistencias están en serie: suma y aplica la ley de Ohm.' }),
      Q('Divisor de 2 MΩ y 2 MΩ sin condensador: la lectura sale baja y ruidosa.', ['La fuente es muy débil para el condensador de muestreo: pon 100 nF en el pin', 'El ADC está roto', 'Falta WiFi', 'Debe ir a 5 V'], 'El condensador entrega la carga rápida que el divisor no puede dar.', { c: 'es_divbat', h: '¿Qué arregló la lectura en la exploración?' }),
      { t: 'explore', text: 'El ADC del ESP32 baila decenas de cuentas. Un <b>filtro exponencial</b> lo suaviza con una línea: <b>y = y + α · (x − y)</b>. Cada lectura nueva pesa α y lo anterior, el resto.\n(Otra opción: promediar N lecturas; el ruido aleatorio baja en √N.)', viz: 'es_ema',
        params: { a: { label: 'α', val: 1, list: [1, 0.5, 0.2, 0.1, 0.05, 0.02], dec: 2 }, ruido: { val: 60, fixed: true } },
        tasks: [
          { q: 'smooth', min: 1, max: 1, text: 'Deja el ruido por debajo de ±8 cuentas', done: 'Muy suave… pero mira cuánto tarda ahora en seguir el salto.', hint: 'Baja α.' },
          { q: 'both', min: 1, max: 1, text: 'Equilibrio: ruido de ±12 o menos y reacción en 12 lecturas o menos', done: 'α = 0,1: suaviza bastante y sigue los cambios en unas 10 lecturas.' }] },
      Nm('¿Por cuánto se divide el ruido aleatorio si promedias 16 lecturas?', 4, '', '√16 = 4.', { tol: 0.01, c: 'es_noise', h: 'El ruido baja con la raíz cuadrada del número de lecturas.' }),
      Q('¿Qué hace filtrado += 0.1 * (lectura - filtrado)?', ['Un filtro paso bajo: suaviza el ruido y responde más despacio', 'Amplifica la señal', 'Elimina la continua', 'Cuenta pulsos'], 'Cada lectura nueva pesa un 10 %.', { code: 'filtrado += 0.1 * (lectura - filtrado);', c: 'es_noise', h: 'Es la fórmula del filtro con α = 0,1.' }),
      I('<b>Calibración a dos puntos</b>: mides dos tensiones con el multímetro, anotas lo que lee el ESP32 en cada una y trazas la recta que las une:\n<b>V = V1 + (L − L1) · (V2 − V1) / (L2 − L1)</b>', {
        svg: SV(140, `<path d="M30 20V120H290" stroke="currentColor" fill="none"/>${tx(34, 18, 'V', 'vizsm')}${tx(270, 134, 'lectura', 'vizsm')}<path d="M50 104L270 30" stroke="var(--led)" stroke-width="2.5"/>
          <circle cx="80" cy="94" r="5" fill="var(--ok)"/><circle cx="240" cy="40" r="5" fill="var(--ok)"/>${tx(86, 112, '(L1, V1)', 'vizsm')}${tx(196, 30, '(L2, V2)', 'vizsm')}<circle cx="160" cy="67" r="5" fill="#3E8FCB" class="a-pulse"/>${tx(166, 84, 'tu lectura', 'vizsm')}`) }),
      Nm('Lecturas: 500 corresponde a 0,50 V y 3000 a 2,45 V. ¿Cuántos V son 1800?', 1.514, 'V', 'Pendiente = 1,95 / 2500 = 0,00078 V por cuenta. 0,50 + 1300 × 0,00078 ≈ 1,51 V.', { tol: 0.02, c: 'es_cal2p', h: 'Calcula cuánto vale una cuenta y súmalo desde el primer punto, sin olvidar sus 0,50 V.' }),
      I('Un umbral único «tiembla» cuando la señal ronda ese valor: el LED parpadea. La <b>histéresis</b> usa dos umbrales: enciende al pasar el alto y apaga al bajar del bajo. Sepáralos y cuenta las conmutaciones.', {
        tune: { viz: 'es_hyst', params: { gap: { label: 'Separación entre umbrales', val: 0, min: 0, max: 600, step: 50, unit: 'cuentas', dec: 0 }, ruido: { val: 250, fixed: true } } } }),
      Q('Con este código, el LED está apagado y la lectura es 2700. ¿Qué pasa?', ['Sigue apagado: está entre los dos umbrales', 'Se enciende', 'Parpadea', 'Se reinicia'], 'Hasta que no pase de 3000, no cambia.', { code: 'if (!encendido && luz > 3000) encendido = true;\nif (encendido && luz < 2500) encendido = false;', c: 'es_hyst', h: 'Comprueba las dos condiciones con el estado actual.' }),
      RES('Divisor: <b>Vbat = Vpin · (R1 + R2) / R2</b>; resistencias grandes gastan poco pero necesitan <b>100 nF</b> en el pin.', 'Ruido: filtro <b>y += α · (x − y)</b> (menos α, más suave y más lento) o promediar (√N).', 'Calibración a dos puntos: la recta entre dos medidas reales.', '<b>Histéresis</b>: dos umbrales para que la salida no tiemble.')
    ]),
    SIM('es-s3', 'Reto: barra de nivel', 'Un potenciómetro en el GPIO 34 controla cuántos de los cinco LED se encienden. Recórrelo de un extremo a otro.', { arduino: 'es_vumetro', board: 'esp32', parts: ['pot', 'res', 'led'], code: true, hint: 'Potenciómetro: extremos a 3V3 y GND (¡no a VIN!), cursor al GPIO 34. LED en 13, 14, 27, 26 y 25. ' + LED_HINT }, 'es_vumetro'),
    SIM('es-s4', 'Reto: luz nocturna con histéresis', 'Divisor con LDR en el GPIO 34 y LED en el 25. Mueve la luz ambiente para que el LED se encienda de noche y se apague de día.', { arduino: 'es_nocturna', board: 'esp32', parts: ['ldr', 'res', 'led'], code: true, hint: 'Resistencia de 10 kΩ de 3V3 al GPIO 34; LDR del GPIO 34 a GND. LED con 150 Ω en el 25. Toca la LDR y mueve «Luz ambiente».' }, 'es_nocturna'),
    PRJ('es-p2', 'Proyecto: voltímetro calibrado', 'es_voltmeter')
  ];

  const LEDCF = [50, 500, 1000, 5000, 20000, 40000, 100000, 312500, 1000000];
  const M3 = [
    L('es10', 'LEDC: frecuencia frente a resolución', 'wave', ['es_ledc', 'es_duty', 'es_ledctimer'], [
      Q('¿Crees que puedes tener a la vez un PWM de 1 MHz y 16 bits de resolución en el ESP32?', ['No: cuanta más frecuencia, menos bits caben', 'Sí, sin problema', 'Solo en el núcleo 0', 'Solo con el WiFi apagado'], 'Frecuencia y resolución compiten por el mismo reloj. Compruébalo.', { predict: true, c: 'es_ledc', h: 'En cada periodo hay que contar todos los escalones con un reloj de velocidad fija.' }),
      { t: 'explore', text: 'El PWM del ESP32 cuenta con un reloj de 80 MHz. Elige frecuencia y bits de resolución.', viz: 'es_ledc',
        params: { f: { label: 'Frecuencia', val: 5000, list: LEDCF, unit: 'Hz', dec: 0 }, bits: { label: 'Resolución', val: 8, min: 1, max: 20, step: 1, unit: 'bits', dec: 0 } },
        tasks: [
          { q: 'best', min: 1, max: 1, text: 'A 5 kHz, sube los bits al máximo posible', done: '80 000 000 / 5000 = 16 000 cuentas por periodo: caben 13 bits (8192).', hint: 'Sube hasta que se ponga rojo y baja uno.' },
          { q: 'ok', min: 0, max: 0, text: 'Con esos bits, sube la frecuencia hasta que sea imposible', done: 'f × 2^bits no puede pasar de 80 MHz.' }] },
      I('El PWM lo hace el periférico <b>LEDC</b>: 16 canales en el clásico (8 en el S3, 6 en el C3). Su contador avanza a 80 MHz y en cada periodo recorre 2^bits pasos. De ahí la regla: <b>f × 2^bits ≤ 80 MHz</b>.', {
        svg: SV(140, `<path d="M20 110${Array.from({ length: 8 }, (_, i) => `H${30 + i * 30}V${110 - (i + 1) * 11}`).join('')}H270" fill="none" stroke="var(--led)" stroke-width="2.5"/><path d="M20 110H280" stroke="var(--line)"/>
          ${tx(20, 130, 'Un periodo = 2^bits pasos del reloj de 80 MHz', 'vizsm')}${tx(150, 22, 'Más bits → más pasos → periodo más largo', 'vizlab', 'text-anchor="middle"')}`) }),
      I('En el núcleo 3.x se trabaja por pin. En el 2.x se usaban canales (ledcSetup y ledcAttachPin): si un ejemplo usa eso, es antiguo.', { code: '// Núcleo 3.x\nledcAttach(18, 5000, 12);   // pin, Hz, bits\nledcWrite(18, 2048);        // 2048 de 4096 = 50 %' }),
      I('El valor de ledcWrite dice cuántos de esos pasos está alto el pin: <b>ciclo = valor / 2^bits</b>. Prueba valores y resoluciones.', {
        tune: { viz: 'es_duty', params: { bits: { label: 'Resolución', val: 8, list: [8, 10, 12, 14, 16], unit: 'bits', dec: 0 }, val: { label: 'Valor de ledcWrite', val: 128, list: [0, 64, 128, 255, 256, 512, 1024, 2048, 3072, 4095, 4096, 4915, 8192, 16384, 32768, 65535], dec: 0 }, f: { label: 'Frecuencia', val: 5000, list: [50, 1000, 5000], unit: 'Hz', dec: 0 } } } }),
      I('Cada salida combina un <b>temporizador</b> (frecuencia y bits) y un <b>canal</b> (ciclo de trabajo). Dos pines con el mismo temporizador comparten frecuencia, no ciclo. analogWrite() usa el LEDC a 1 kHz y 8 bits; ledcWriteTone() da un tono al 50 %.', {
        svg: SV(140, `${bx(10, 52, 80, 36, 'Temporizador', 'var(--led)', W)}${tx(50, 104, 'frecuencia y bits', 'vizsm', 'text-anchor="middle"')}${ar(90, 62, 130, 38)}${ar(90, 78, 130, 104)}
          <path d="M136 46V22H166V46H196V22H226V46H256V22H286" fill="none" stroke="#3E8FCB" stroke-width="2"/><path d="M136 120V96H148V120H196V96H208V120H256V96H268V120H286" fill="none" stroke="var(--ok)" stroke-width="2"/>
          ${tx(140, 62, 'canal A: 50 %', 'vizsm')}${tx(140, 136, 'canal B: 20 %', 'vizsm')}`) }),
      { t: 'steps', text: 'Servo a 50 Hz con 16 bits: ¿qué valor da un pulso de 1,5 ms?', steps: ['Periodo: T = 1 / 50 Hz = 20 ms', 'Fracción del periodo: 1,5 / 20 = 0,075', 'Pasos por periodo: 2^16 = 65 536', 'Valor = 0,075 × 65 536 ≈ <b>4915</b>'], result: 'ledcWrite(pin, 4915)' },
      TU('Un motor a 20 kHz (fuera del oído): consigue la máxima resolución posible.', 'es_ledc', { f: { val: 20000, fixed: true }, bits: { label: 'Resolución', val: 16, min: 1, max: 20, step: 1, unit: 'bits', dec: 0 } }, { q: 'best', min: 1, max: 1, text: 'Objetivo: la resolución máxima a 20 kHz', hint: '80 000 000 / 20 000 = 4000 cuentas. ¿Qué potencia de 2 cabe?' }, '11 bits: 2048 cuentas caben en 4000.', { c: 'es_ledc', h: 'Divide 80 MHz entre la frecuencia y busca la mayor potencia de 2 que quepa.' }),
      Q('¿Qué ciclo de trabajo da este código?', ['25 %', '40 %', '50 %', '100 %'], '1024 / 4096 = 25 %.', { code: 'ledcAttach(18, 5000, 12);\nledcWrite(18, 1024);', c: 'es_duty', h: 'Con 12 bits hay 4096 pasos.' }),
      G('es_ledcRes'), G('es_ledcFreq'),
      Nm('Servo a 50 Hz con 16 bits: ¿qué valor de ledcWrite da un pulso de 2 ms?', 6554, '', '2 / 20 × 65 536 ≈ 6554.', { tol: 3, c: 'es_duty', h: 'Pasa el pulso a fracción del periodo de 20 ms y multiplica por 2^16.' }),
      Q('Dos pines que comparten temporizador del LEDC comparten…', ['La frecuencia y la resolución; el ciclo de trabajo es de cada uno', 'El ciclo de trabajo', 'Nada', 'El pin'], 'El temporizador marca el ritmo; cada canal decide cuánto rato está alto.', { c: 'es_ledctimer', h: 'Recuerda el dibujo: un temporizador, dos canales.' }),
      Q('¿Y analogWrite() en el ESP32?', ['Funciona en el núcleo 3.x: por debajo usa el LEDC con 8 bits y 1 kHz', 'No existe', 'Es un DAC', 'Solo en el pin 25'], 'Cómodo para empezar; para control fino, ledcAttach.', { c: 'es_ledctimer', h: 'Es un atajo con valores por defecto.' }),
      Q('ledcWriteTone(pin, 440) sirve para…', ['Generar una cuadrada de 440 Hz en un zumbador', 'Leer una frecuencia', 'Reproducir un MP3', 'Ajustar el brillo'], 'Pone el ciclo al 50 % y cambia la frecuencia.', { c: 'es_ledctimer', h: '440 Hz es una nota musical.' }),
      RES('El LEDC cuenta a 80 MHz: <b>f × 2^bits ≤ 80 MHz</b>.', '<b>ciclo = valor / 2^bits</b>; para un pulso en ms, divide primero entre el periodo.', 'Temporizador = frecuencia y bits; canal = ciclo. analogWrite: 1 kHz y 8 bits.', 'Núcleo 3.x: ledcAttach(pin, f, bits) y ledcWrite(pin, valor).')
    ]),
    L('es11', 'DAC y sensores táctiles', 'wave', ['es_dac', 'es_touch', 'es_wake'], [
      Q('Acercas el dedo a un cable conectado al GPIO 4 de un ESP32 clásico y lees touchRead(4). ¿Qué crees que hace la lectura?', ['Baja', 'Sube', 'No cambia', 'Se pone a 4095'], 'En el clásico, la lectura baja: cuenta cuántas cargas y descargas caben en un tiempo fijo, y con tu dedo cada una tarda más.', { predict: true, c: 'es_touch', h: 'Tu dedo añade capacidad: cada carga del pin tarda más.' }),
      { t: 'explore', text: 'Una lámina de cobre en el GPIO 4 de un ESP32 clásico. Acerca el dedo y coloca el umbral.', viz: 'es_touch',
        params: { dedo: { label: 'Dedo (0 lejos · 100 tocando)', val: 0, min: 0, max: 100, step: 5, unit: '%', dec: 0 }, um: { label: 'Umbral', val: 70, min: 10, max: 80, step: 2, dec: 0 } },
        tasks: [
          { q: 'read', min: 0, max: 25, text: 'Toca la lámina y mira la lectura', done: 'Sin tocar ronda 60; tocando baja a menos de 20.', hint: 'Lleva el dedo al 100 %.' },
          { q: 'ok', min: 1, max: 1, text: 'Coloca el umbral para que detecte solo cuando tocas', done: 'Entre la base y el valor tocando, con margen: unos 2/3 de la base.', hint: 'Con el umbral por encima de 60 detecta siempre.' }] },
      I('Los pines <b>táctiles</b> miden la capacidad del pin, y tu dedo la aumenta. El clásico tiene 10 canales (T0 es el GPIO 4; T9, el 32). En el clásico la lectura <b>baja</b> al tocar; en el S2 y el S3, <b>sube</b>.', {
        svg: SV(130, `<rect x="40" y="90" width="120" height="12" rx="3" fill="#C98B3A"/><path d="M100 102V120H220" stroke="currentColor" stroke-width="2" fill="none"/>${bx(220, 104, 70, 26, 'GPIO 4', 'var(--led)', W)}
          <ellipse cx="100" cy="44" rx="18" ry="26" fill="#E7B48F" stroke="currentColor" class="a-bob"/>${[0, 1, 2].map(i => `<path d="M${84 + i * 16} 72V88" stroke="#3E8FCB" stroke-dasharray="2 3" class="a-fade a-d${i + 1}"/>`).join('')}${tx(150, 50, 'el dedo añade capacidad', 'vizsm')}`) }),
      I('Para fiarte del touch: calibra la base al arrancar y síguela despacio (cambia con la humedad y la fuente). <b>touchAttachInterrupt(pin, función, umbral)</b> llama a tu función al cruzar el umbral, y un toque puede incluso <b>despertar</b> al chip del sueño profundo (lo verás en el módulo 8).', { code: 'uint32_t base = 0;\nfor (int i = 0; i < 16; i++) base += touchRead(4);\nbase /= 16;                       // media sin tocar\nuint32_t umbral = base * 2 / 3;   // clásico: baja al tocar' }),
      I('El clásico (y el S2) tiene un <b>DAC</b> de 8 bits en los GPIO 25 y 26: saca una tensión continua de verdad, no un PWM. <b>V ≈ n / 255 × 3,3 V</b>.', {
        tune: { viz: 'es_dac', params: { n: { label: 'Valor de dacWrite', val: 128, min: 0, max: 255, step: 1, dec: 0 } } },
        more: 'El DAC da muy poca corriente: para un altavoz hace falta un amplificador. Y solo tiene 8 bits (escalones de unos 13 mV). El S3 y el C3 no tienen DAC.' }),
      { t: 'steps', text: 'dacWrite(25, 200): ¿qué tensión sale?', steps: ['<b>V = n / 255 × 3,3 V</b>', '200 / 255 ≈ 0,784', '0,784 × 3,3 V ≈ <b>2,59 V</b>'], result: 'Unos 2,59 V continuos' },
      Nm('Sin tocar lees 60 de media. Umbral a 2/3 de la base: ¿qué valor?', 40, '', '60 × 2 / 3 = 40.', { tol: 0.5, c: 'es_touch', h: 'Multiplica la base por 2 y divide entre 3.' }),
      { t: 'match', q: 'Une cada canal táctil con su pin (ESP32 clásico).', pairs: [['T0', 'GPIO 4'], ['T7', 'GPIO 27'], ['T8', 'GPIO 33'], ['T9', 'GPIO 32']], c: 'es_touch', h: 'T0 es el de la lámina de la exploración; T8 y T9 van «cruzados».' },
      Q('¿Qué detecta este código en un ESP32 clásico?', ['El dedo: la lectura baja al tocar', 'Que no tocas', 'La temperatura', 'Un imán'], 'Por eso se compara con «menor que».', { code: 'if (touchRead(4) < umbral) {\n  // ...\n}', c: 'es_touch', h: 'En el clásico, ¿la lectura sube o baja al tocar?' }),
      Nm('dacWrite(26, 100). ¿Tensión aproximada, en V?', 1.29, 'V', '100 / 255 × 3,3 ≈ 1,29 V.', { tol: 0.03, c: 'es_dac', h: 'Fracción de 255 por 3,3 V.' }),
      Q('Ventaja del DAC frente a un PWM filtrado:', ['Da una tensión continua sin rizado ni filtro RC', 'Más resolución que 16 bits', 'Más corriente', 'Funciona a 5 V'], 'Pero solo 8 bits y poca corriente.', { c: 'es_dac', h: 'Compara las dos formas de onda del dibujo.' }),
      Q('¿Puede el DAC mover un altavoz de 8 Ω directamente?', ['No: da muy poca corriente; necesita un amplificador', 'Sí, a todo volumen', 'Sí, si es de 3,3 V', 'Solo en mono'], 'Un pin no da cientos de mA.', { c: 'es_dac', h: 'Calcula la corriente que pediría un altavoz de 8 Ω.' }),
      Q('touchAttachInterrupt(pin, funcion, umbral) sirve para…', ['Llamar a una función cuando la lectura cruza el umbral, sin sondear', 'Leer el ADC', 'Dormir el chip', 'Cambiar el umbral solo'], 'Así no tienes que preguntar en loop().', { c: 'es_touch', h: 'Es una interrupción: avisa sin que preguntes.' }),
      Q('¿Puede un toque despertar al ESP32 del sueño profundo?', ['Sí: el touch es una de las fuentes de despertar', 'No, nunca', 'Solo con WiFi', 'Solo en el S3'], 'Ideal para aparatos sin botones.', { c: 'es_wake', h: 'Lo decía la tarjeta del touch.' }),
      RES('Touch: el dedo añade capacidad; en el clásico la lectura <b>baja</b> (en S2/S3 sube).', 'Umbral a ~2/3 de la base medida al arrancar; touchAttachInterrupt avisa solo, y un toque puede despertar.', 'DAC (clásico y S2, GPIO 25 y 26): <b>V ≈ n / 255 × 3,3 V</b>, continua y de poca corriente.')
    ]),
    L('es12', 'RMT y tiras WS2812', 'wave', ['es_rmt', 'es_ws2812', 'es_3v3'], [
      Q('¿Cuánto crees que tarda el ESP32 en mandar los colores a una tira de 60 LED?', ['Menos de 2 ms', 'Un segundo', 'Un minuto', 'Nada: es instantáneo'], 'Unos 1,8 ms. Pero esos bits exigen una precisión de décimas de microsegundo: por eso existe el RMT.', { predict: true, c: 'es_ws2812', h: 'Cada LED recibe 24 bits a 800 000 bits por segundo.' }),
      { t: 'explore', text: 'Una tira WS2812: elige cuántos LED, el brillo y el color. Mira el tiempo de envío y la corriente.', viz: 'es_ws',
        params: { n: { label: 'LED', val: 8, list: [1, 8, 16, 30, 60, 100, 144, 300], dec: 0 }, br: { label: 'Brillo', val: 100, min: 0, max: 100, step: 5, unit: '%', dec: 0 }, col: yn('Color (0 blanco · 1 rojo)', 0) },
        tasks: [
          { q: 't60', min: 1, max: 1, text: 'Pon 60 LED y mira cuánto tarda', done: '60 × 24 × 1,25 µs ≈ 1,8 ms: cientos de fotogramas por segundo serían posibles.', hint: 'Mueve «LED» hasta 60.' },
          { q: 'big', min: 1, max: 1, text: 'Con 60 LED o más, que no pase de 2 A', done: '60 LED en blanco total piden 3,6 A: baja el brillo o usa un color.', hint: 'Baja el brillo o cambia a rojo.' }] },
      I('El <b>RMT</b> genera trenes de pulsos descritos como pares «nivel y duración», con resolución de 12,5 ns y sin que intervenga la CPU. El clásico tiene 8 canales. Nació para mandos infrarrojos y es perfecto para tiras WS2812.', {
        svg: SV(130, `${['(1, 0,8 µs)', '(0, 0,45 µs)', '(1, 0,4 µs)', '(0, 0,85 µs)'].map((s, i) => bx(6 + i * 73, 10, 68, 26, s)).join('')}${ar(150, 40, 150, 58)}
          <path d="M20 110V70H84V110H120V70H152V110H220V110H290" fill="none" stroke="var(--led)" stroke-width="2.5"/>${tx(40, 126, 'un «1»', 'vizsm')}${tx(130, 126, 'un «0»', 'vizsm')}`) }),
      I('Una <b>WS2812B</b> recibe 800 kbit/s: cada bit dura 1,25 µs. Un 0 es un pulso alto corto (~0,4 µs) y un 1, uno largo (~0,8 µs). Cada LED se queda sus 24 bits (verde, rojo y azul, en ese orden) y reenvía el resto.', {
        svg: SV(120, `${[0, 1, 2, 3].map(i => `<circle cx="${50 + i * 60}" cy="70" r="16" fill="${['#2ECC71', '#FF3B30', '#3E8FCB', 'var(--line)'][i]}" stroke="currentColor"/>`).join('')}
          ${ar(10, 70, 30, 70)}${[0, 1, 2].map(i => ar(66 + i * 60, 70, 94 + i * 60, 70, 'currentColor', 'class="a-flow"')).join('')}${tx(150, 26, 'cada LED se queda 24 bits (G, R, B)', 'vizlab', 'text-anchor="middle"')}${tx(150, 108, 'y pasa el resto al siguiente', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Hasta unos <b>60 mA por LED</b> en blanco: fuente de 5 V aparte, 1000 µF en la entrada, 330 Ω en serie con la señal y masa común. La tira a 5 V espera unos 3,5 V para un «1»: un <b>74AHCT125</b> sube la señal de 3,3 V.', {
        svg: SV(130, `${bx(10, 20, 60, 30, 'ESP32', 'var(--led)', W)}<path d="M70 35H96" stroke="currentColor" stroke-width="2"/>${bx(96, 20, 70, 30, '74AHCT125')}<path d="M166 35H186" stroke="currentColor" stroke-width="2"/><rect x="186" y="29" width="24" height="12" fill="var(--ice-soft)" stroke="currentColor"/>${tx(198, 22, '330 Ω', 'vizsm', 'text-anchor="middle"')}
          <path d="M210 35H230" stroke="currentColor" stroke-width="2"/>${bx(230, 20, 60, 30, 'Tira')}${bx(150, 82, 70, 30, 'Fuente 5 V')}<path d="M220 97H260V50" stroke="var(--err)" stroke-width="2" fill="none"/>${tx(264, 80, '+5 V', 'vizsm')}${tx(10, 124, 'Masas unidas · 1000 µF en la entrada de la tira', 'vizsm')}`) }),
      { t: 'steps', text: '¿Cuánto tarda una tira de 60 LED?', steps: ['Bits por LED: 24', 'Bits totales: 60 × 24 = 1440', 'Cada bit dura 1,25 µs → 1440 × 1,25 µs = 1800 µs', '<b>1,8 ms</b>, más una pausa final que «enciende» los colores'], result: 'Unos 1,8 ms' },
      Q('¿En qué orden recibe los colores una WS2812B?', ['Verde, rojo, azul (GRB)', 'Rojo, verde, azul', 'Azul, verde, rojo', 'Rojo, azul, verde'], 'Por eso las bibliotecas piden NEO_GRB.', { c: 'es_ws2812', h: 'No es el orden RGB de siempre: empieza por el verde.' }),
      Q('¿Por qué no generar la señal de la WS2812 con digitalWrite?', ['Exige pulsos de décimas de µs con poca tolerancia; una interrupción en medio la estropea', 'digitalWrite no existe', 'La tira es de 12 V', 'Funcionaría igual'], 'El RMT lo hace por hardware.', { c: 'es_rmt', h: 'Compara la duración de un bit con lo que puede tardar una interrupción.' }),
      Nm('30 LED en blanco total, unos 60 mA cada uno. ¿Corriente total, en A?', 1.8, 'A', '30 × 0,06 = 1,8 A. Limita el brillo en el código si tu fuente no llega.', { tol: 0.05, c: 'es_ws2812', h: 'Multiplica LED por corriente de cada uno, en amperios.' }),
      Nm('¿Cuánto tarda en enviarse una tira de 144 LED, en ms?', 4.32, 'ms', '144 × 24 × 1,25 µs = 4320 µs = 4,32 ms.', { tol: 0.05, c: 'es_ws2812', h: 'LED × 24 bits × 1,25 µs, y pasa a ms.' }),
      Q('¿Para qué un 74AHCT125 entre el ESP32 y la tira?', ['Convierte la señal de 3,3 V en 5 V: la tira la entiende siempre', 'Da más corriente a los LED', 'Protege de la polaridad', 'Para que vaya más rápido'], 'Su entrada acepta 3,3 V como «1» aunque esté alimentado a 5 V.', { c: 'es_3v3', h: '¿Qué tensión espera la tira para un «1»?' }),
      Q('Tu fuente da 2 A y tienes 60 LED. ¿Qué brillo máximo pones en blanco total?', ['Un 55 %, más o menos', 'El 100 %', 'El 10 %', 'Da igual'], '60 × 60 mA = 3,6 A al 100 %; 2 / 3,6 ≈ 0,55.', { c: 'es_ws2812', h: 'Calcula la corriente al 100 % y mira qué fracción da tu fuente.' }),
      RES('El <b>RMT</b> genera y captura pulsos exactos por hardware (12,5 ns de resolución).', 'WS2812: 24 bits por LED en orden <b>GRB</b>, 1,25 µs por bit.', 'Hasta 60 mA por LED: fuente aparte, 1000 µF, 330 Ω y masa común.', 'La tira a 5 V quiere ~3,5 V: un 74AHCT125 adapta la señal.')
    ]),
    L('es39', 'Infrarrojos con el RMT', 'wave', ['es_ir', 'es_rmt'], [
      Q('Apuntas un mando a la tele bajo una lámpara muy potente y sigue funcionando. ¿Cómo distingue su luz de la de la lámpara?', ['La luz del mando parpadea muy deprisa (unos 38 kHz) y el receptor solo atiende a eso', 'Es más brillante que la lámpara', 'Usa luz ultravioleta', 'No la distingue: es suerte'], 'El receptor filtra todo lo que no parpadee a unos 38 kHz. Encima de esa portadora, la información va en duraciones.', { predict: true, c: 'es_ir', h: 'Piensa en algo que la luz de una lámpara no hace.' }),
      { t: 'explore', text: 'En el protocolo NEC, cada bit es un pulso de luz y una pausa. Cambia el byte de comando y mira la señal.', viz: 'es_nec',
        params: { cmd: { label: 'Comando', val: 69, min: 0, max: 255, step: 1, dec: 0 } },
        tasks: [
          { q: 'all1', min: 1, max: 1, text: 'Haz que los 8 bits sean unos', done: 'Todo unos: 8 × 2,25 = 18 ms.', hint: 'El mayor número de 8 bits.' },
          { q: 'all0', min: 1, max: 1, text: 'Ahora todo ceros', done: 'Todo ceros: 8 × 1,125 = 9 ms. La información va en la duración de las pausas.' }] },
      I('El mando enciende su LED infrarrojo a ráfagas de <b>38 kHz</b>. El receptor (TSOP38238, VS1838B) filtra esa portadora y entrega la envolvente <b>invertida</b>: nivel bajo mientras llega una ráfaga.', {
        svg: SV(140, `${tx(10, 20, 'Luz del mando', 'vizsm')}${[0, 1].map(k => Array.from({ length: 9 }, (_, i) => `<path d="M${30 + k * 130 + i * 8} 50V30H${34 + k * 130 + i * 8}V50" fill="none" stroke="#FF3B30" stroke-width="1.5"/>`).join('')).join('')}<path d="M20 50H290" stroke="var(--line)"/>
          ${tx(10, 80, 'Salida del receptor', 'vizsm')}<path d="M20 90H30V120H102V90H160V120H232V90H290" fill="none" stroke="var(--led)" stroke-width="2.5"/>${tx(36, 136, 'bajo durante la ráfaga', 'vizsm')}`) }),
      I('Una trama NEC: cabecera de 9 ms de ráfaga y 4,5 ms de pausa, y luego 32 bits: <b>dirección, dirección invertida, comando y comando invertido</b>. Los bytes invertidos permiten detectar errores, y hacen que la trama dure siempre lo mismo: unos 67,5 ms.', {
        svg: SV(110, `${[['cabecera', 60, '#555'], ['dirección', 55, '#3E8FCB'], ['inversa', 55, '#2B6A9A'], ['comando', 55, '#A66B00'], ['inverso', 55, '#C0582A']].reduce((a, [n, w, c]) => { a.s += `<rect x="${a.x}" y="30" width="${w - 2}" height="34" rx="4" fill="${c}"/>` + tx(a.x + (w - 2) / 2, 51, n, 'vizsm', 'text-anchor="middle" fill="#fff"'); a.x += w; return a; }, { s: '', x: 10 }).s}
          ${tx(150, 90, '4 bytes de 8 bits, primero el bit 0', 'vizsm', 'text-anchor="middle"')}`) }),
      I('El RMT captura por hardware la duración de pulsos y pausas; tu código solo las traduce. Una biblioteca como IRremoteESP8266 lo hace por ti, pero la idea es esta:', { code: '// Tras cada pulso de unos 560 µs viene una pausa:\n//   ~560 µs → bit 0      ~1690 µs → bit 1\nbool bit = pausa_us > 1120;   // umbral a medio camino' }),
      { t: 'steps', text: 'Las 8 pausas del comando miden 1690, 560, 1690, 560, 560, 560, 1690 y 560 µs (primero el bit 0). ¿Qué comando es?', steps: ['Umbral a medio camino: más de 1120 µs es un 1', 'Bits del 0 al 7: 1, 0, 1, 0, 0, 0, 1, 0', 'Pesos de los unos: bit 0 = 1, bit 2 = 4, bit 6 = 64', 'Comando = 1 + 4 + 64 = <b>69</b> (0x45)'], result: '69, justo el que había al empezar la exploración.' },
      Q('¿Qué portadora usan casi todos los mandos IR?', ['38 kHz', '38 MHz', '2,4 GHz', '50 Hz'], 'Modular a 38 kHz evita confundir la señal con la luz ambiente.', { c: 'es_ir', h: 'Lo decía la respuesta del principio.' }),
      Nm('En NEC, ¿cuánto dura un bit 1 completo (pulso más pausa), en ms?', 2.25, 'ms', '0,5625 + 1,6875 = 2,25 ms.', { tol: 0.02, c: 'es_ir', h: 'Suma el pulso de unos 0,56 ms y la pausa larga de unos 1,69 ms.' }),
      Q('¿Por qué NEC envía también el comando invertido?', ['Para detectar errores: cada bit del inverso debe ser el contrario', 'Para ir el doble de rápido', 'Para gastar menos pila', 'Para cambiar de canal'], 'Si algún bit no cuadra, la trama se descarta.', { c: 'es_ir', h: 'Si recibes un byte y su contrario, ¿qué puedes comprobar?' }),
      Q('El receptor TSOP38238 entrega un nivel BAJO mientras…', ['Llega una ráfaga de 38 kHz', 'No llega nada', 'Hay mucha luz ambiente', 'El mando está apagado'], 'Su salida va invertida: en reposo está alta.', { c: 'es_ir', h: 'Mira el dibujo de la salida del receptor.' }),
      { t: 'order', q: 'Ordena el viaje de una pulsación del mando.', items: ['El mando emite ráfagas de 38 kHz', 'El receptor quita la portadora y da la envolvente', 'El RMT mide la duración de pulsos y pausas', 'Tu código convierte duraciones en bits y bits en un comando'], e: 'Cada pieza hace una sola cosa.', c: 'es_ir', h: 'Empieza en la luz y acaba en tu código.' },
      Q('Para medir pausas de 560 µs con precisión, ¿por qué el RMT y no micros() en loop()?', ['El RMT mide por hardware; loop() puede retrasarse por otras tareas o por el WiFi', 'micros() no existe', 'El RMT da más luz', 'loop() no puede leer pines'], 'Medir por hardware no depende de lo ocupada que esté la CPU.', { c: 'es_rmt', h: '¿Qué pasa si loop() se entretiene 1 ms con otra cosa?' }),
      RES('El mando modula a <b>38 kHz</b>; el receptor entrega la envolvente invertida.', 'NEC: cabecera 9 + 4,5 ms y 32 bits (dirección, su inversa, comando, su inverso).', 'Un 0 = pausa de ~0,56 ms; un 1 = pausa de ~1,69 ms.', 'El <b>RMT</b> mide las duraciones por hardware; tu código las traduce.')
    ]),
    L('es14', 'UART, I²C y SPI en el ESP32', 'bus', ['es_buses', 'es_bus', 'es_bustime', 'es_3v3'], [
      Q('¿Cuánto crees que tarda en enviar 100 bytes una UART a 9600 baudios?', ['Unos 100 ms', 'Unos 10 µs', 'Unos 10 s', 'Nada'], 'Baudios son bits por segundo, y cada byte viaja con bits de más. Vamos a medirlo.', { predict: true, c: 'es_bustime', h: 'Baudios son bits por segundo; cuenta cuántos bits son 100 bytes.' }),
      { t: 'explore', text: 'Elige bus, velocidad y bytes. Mira cuántos bits viajan de verdad y cuánto tardan.', viz: 'es_bustime',
        params: { proto: { label: 'Bus (0 UART · 1 I²C · 2 SPI)', val: 0, list: [0, 1, 2], dec: 0 }, v: { label: 'Velocidad (0 lenta · 1 media · 2 rápida)', val: 0, list: [0, 1, 2], dec: 0 }, n: { label: 'Bytes', val: 100, list: [1, 2, 6, 16, 100, 1000], dec: 0 } },
        tasks: [
          { q: 'uartOk', min: 1, max: 1, text: 'UART: envía 100 bytes en menos de 10 ms', done: 'A 115 200 baudios: 1000 bits en 8,7 ms.', hint: 'Sube la velocidad.' },
          { q: 'i2cOk', min: 1, max: 1, text: 'I²C: lee 6 bytes de un sensor en menos de 250 µs', done: 'A 400 kHz cuesta unos 210 µs; a 100 kHz, casi 900.', hint: 'Cambia a I²C, pon 6 bytes y sube la velocidad.' }] },
      I('El clásico tiene <b>tres UART</b> (la 0 va al USB), <b>dos I²C</b> y dos SPI libres para ti (otros dos sirven a la flash). Todos pasan por la matriz GPIO: tú eliges los pines.', {
        svg: SV(110, `${bx(10, 20, 86, 60, '', 'var(--ice-soft)')}${tx(53, 42, '3 UART', 'vizbig', 'text-anchor="middle"')}${tx(53, 64, 'la 0 → USB', 'vizsm', 'text-anchor="middle"')}
          ${bx(107, 20, 86, 60, '', 'var(--ice-soft)')}${tx(150, 42, '2 I²C', 'vizbig', 'text-anchor="middle"')}${tx(150, 64, 'Wire y Wire1', 'vizsm', 'text-anchor="middle"')}
          ${bx(204, 20, 86, 60, '', 'var(--ice-soft)')}${tx(247, 42, '2 SPI', 'vizbig', 'text-anchor="middle"')}${tx(247, 64, 'para ti', 'vizsm', 'text-anchor="middle"')}${tx(150, 100, 'Todos por la matriz GPIO', 'vizsm', 'text-anchor="middle"')}`) }),
      I('En UART 8N1 cada byte viaja con un bit de inicio y uno de parada: <b>10 bits</b>. El tiempo es <b>bits / baudios</b>.', {
        svg: SV(110, `<path d="M10 30H30V70${[1, 0, 1, 1, 0, 0, 1, 0].map((b, i) => `H${50 + i * 26}V${b ? 30 : 70}`).join('')}H258V30H290" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          ${tx(30, 90, 'inicio', 'vizsm')}${tx(110, 90, '8 bits de datos', 'vizsm')}${tx(254, 90, 'parada', 'vizsm')}${tx(150, 106, 'Serial2.begin(9600, SERIAL_8N1, rx, tx)', 'vizsm', 'text-anchor="middle"')}`) }),
      I('I²C llama a cada dispositivo por su <b>dirección</b>. Si dos tienen la misma dirección fija, ponlos en buses distintos: <b>Wire</b> y <b>Wire1</b>. SPI no usa direcciones: los dispositivos comparten SCK, MISO y MOSI, y cada uno tiene su hilo <b>CS</b>.', {
        code: 'Wire.begin(21, 22);           // bus 0: SDA, SCL\nWire1.begin(25, 26, 400000);  // bus 1, a 400 kHz\nSPI.begin(18, 19, 23);        // SCK, MISO, MOSI (CS, uno por chip)',
        more: 'Con SPI, cada acceso va entre SPI.beginTransaction(SPISettings(…)) y SPI.endTransaction(). Así dos dispositivos con velocidades o modos distintos pueden compartir el bus sin pisarse.' }),
      { t: 'steps', text: 'Enviar 64 bytes por UART a 115 200 baudios (8N1).', steps: ['Bits por byte en 8N1: 10', 'Bits totales: 64 × 10 = 640', 'Tiempo = 640 / 115 200 s ≈ 0,00556 s', '<b>≈ 5,6 ms</b>'], result: 'Unos 5,6 ms' },
      Q('¿Qué configura esta línea?', ['La UART2 a 9600 baudios: RX en 16 y TX en 17', 'El I²C', 'La UART0', 'Un SPI'], 'Serial2.begin(baudios, formato, rx, tx).', { code: 'Serial2.begin(9600, SERIAL_8N1, 16, 17);', c: 'es_bus', h: 'Serial2 es una UART; mira el orden de los argumentos.' }),
      G('es_uartTime'),
      Q('Dos pantallas OLED con la dirección 0x3C fija.', ['Una en Wire y otra en Wire1 (dos buses)', 'Imposible', 'Las dos en el mismo bus', 'Cambiar a SPI el ESP32'], 'Dos buses, dos espacios de direcciones.', { c: 'es_buses', h: 'El ESP32 tiene dos controladores de I²C.' }),
      Q('¿Qué imprime este escáner?', ['Las direcciones que responden con ACK', 'Todas las direcciones', 'Los pines libres', 'La velocidad del bus'], 'endTransmission() devuelve 0 cuando alguien contesta.', { code: 'for (uint8_t a = 1; a < 127; a++) {\n  Wire.beginTransmission(a);\n  if (Wire.endTransmission() == 0)\n    Serial.printf("0x%02X\\n", a);\n}', c: 'es_buses', h: '¿Cuándo devuelve 0 endTransmission()?' }),
      Q('Una pantalla TFT rápida y una tarjeta SD:', ['SPI, con un CS distinto para cada una', 'I²C', 'UART', 'Una en cada núcleo'], 'Comparten SCK, MISO y MOSI.', { c: 'es_buses', h: 'El bus rápido, con un hilo de selección por chip.' }),
      Q('Un módulo I²C de 5 V trae pull-ups a 5 V en SDA y SCL.', ['Quítalas y pon pull-ups a 3,3 V, o usa un adaptador de nivel', 'Perfecto así', 'Pon un diodo', 'Sube la velocidad'], 'Esas pull-ups llevarían 5 V a los pines del ESP32.', { c: 'es_3v3', h: '¿A qué tensión quedarían las líneas en reposo?' }),
      Q('Con I²C a 400 kHz, leer 6 bytes de un sensor cuesta unos…', ['Cientos de microsegundos', 'Unos nanosegundos', 'Un segundo', 'Nada'], 'Cada byte son 9 bits, más dirección, registro y arranques: unos 85 bits.', { c: 'es_bustime', h: 'Recuerda lo que salía en la exploración.' }),
      RES('3 UART, 2 I²C y 2 SPI libres, todos por la matriz GPIO.', 'UART 8N1: <b>10 bits por byte</b>; tiempo = bits / baudios.', 'I²C: direcciones (dos iguales → Wire y Wire1). SPI: un CS por dispositivo.', 'Pull-ups siempre a 3,3 V.')
    ]),
    L('es13', 'I²S: audio digital', 'wave', ['es_i2s', 'es_i2sbuf', 'es_period'], [
      Q('¿Cuántos bits por segundo crees que hay que mover para audio de calidad CD (44,1 kHz, 16 bits, estéreo)?', ['Más de 1,4 millones', 'Unos 44 000', 'Unos 16', 'Unos 1000'], '44 100 × 16 × 2 ≈ 1,41 millones. Para eso existe un bus dedicado: I²S.', { predict: true, c: 'es_i2sbuf', h: 'Multiplica muestras por segundo, bits por muestra y canales.' }),
      { t: 'explore', text: 'Configura el audio y el búfer. Tu tarea a veces se retrasa porque el WiFi está ocupado: si el búfer se vacía antes, suena un clic.', viz: 'es_i2s',
        params: { fs: { label: 'Muestreo', val: 22050, list: [8000, 16000, 22050, 44100, 48000], unit: 'Hz', dec: 0 }, bits: { label: 'Bits por muestra', val: 16, list: [16, 32], dec: 0 }, ch: { label: 'Canales', val: 1, list: [1, 2], dec: 0 }, buf: { label: 'Búfer', val: 256, list: [128, 256, 512, 1024, 2048], unit: 'muestras', dec: 0 }, wifi: { label: 'Retraso de tu tarea', val: 30, min: 0, max: 100, step: 5, unit: 'ms', dec: 0 } },
        tasks: [
          { q: 'cd', min: 1, max: 1, text: 'Configura calidad CD: 44,1 kHz, 16 bits, estéreo', done: 'BCLK = 44 100 × 16 × 2 ≈ 1,41 MHz: un pulso por bit.', hint: 'Muestreo, bits y canales.' },
          { q: 'safe', min: 1, max: 1, text: 'Que aguante 30 ms de retraso sin clics', done: 'El búfer debe durar más que el peor retraso: muestras / frecuencia.', hint: 'Sube el búfer.' }] },
      I('<b>I²S</b> transporta audio digital con tres líneas:\n· <b>BCLK</b>: un pulso por bit.\n· <b>WS</b> (LRCLK): canal izquierdo o derecho.\n· <b>DATA</b>: las muestras.', {
        svg: SV(130, `${tx(6, 30, 'BCLK', 'vizsm')}<path d="M50 34${Array.from({ length: 16 }, (_, i) => `V${i % 2 ? 34 : 18}H${58 + i * 15}`).join('')}" fill="none" stroke="var(--led)" stroke-width="1.6"/>
          ${tx(6, 70, 'WS', 'vizsm')}<path d="M50 74V58H170V74H290" fill="none" stroke="#3E8FCB" stroke-width="2"/>${tx(80, 54, 'izquierdo', 'vizsm')}${tx(200, 90, 'derecho', 'vizsm')}
          ${tx(6, 112, 'DATA', 'vizsm')}<path d="M50 116V100H80V116H110V100H170V116H200V100H230V116H290" fill="none" stroke="var(--ok)" stroke-width="2"/>`) }),
      I('Chips habituales al otro lado:\n· <b>MAX98357A</b>: DAC y amplificador de unos 3 W; altavoz directo.\n· <b>PCM5102A</b>: DAC de calidad con salida de línea.\n· <b>INMP441</b>: micrófono digital I²S.', {
        svg: SV(110, `${bx(6, 20, 92, 50, 'MAX98357A', 'var(--led)', W)}${tx(52, 88, '→ altavoz', 'vizsm', 'text-anchor="middle"')}${bx(104, 20, 92, 50, 'PCM5102A', '#3E8FCB', W)}${tx(150, 88, '→ amplificador', 'vizsm', 'text-anchor="middle"')}${bx(202, 20, 92, 50, 'INMP441', 'var(--ok)', W)}${tx(248, 88, '← micrófono', 'vizsm', 'text-anchor="middle"')}`) }),
      I('El clásico tiene dos periféricos I²S con <b>DMA</b>: tú llenas un búfer y el hardware lo envía solo, a ritmo fijo. En el núcleo 3.x, la biblioteca ESP_I2S lo deja en pocas líneas:', { code: '#include <ESP_I2S.h>\nI2SClass i2s;\ni2s.setPins(26, 25, 22);   // BCLK, WS, DOUT\ni2s.begin(I2S_MODE_STD, 22050,\n          I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO);\ni2s.write(buf, bytes);     // espera si el DMA va lleno' }),
      { t: 'steps', text: 'Un búfer de 1024 muestras a 22 050 Hz, ¿cuánto margen da?', steps: ['El DMA gasta 22 050 muestras por segundo', 'Tiempo = muestras / frecuencia = 1024 / 22 050', '≈ 0,0464 s', '<b>≈ 46 ms</b>: tu tarea debe rellenarlo antes'], result: 'Unos 46 ms de margen' },
      { t: 'match', q: 'Une cada línea con su función.', pairs: [['BCLK', 'Marca cada bit'], ['WS (LRCLK)', 'Dice qué canal va'], ['DOUT', 'Datos hacia el DAC'], ['MCLK', 'Reloj maestro (algunos DAC)']], c: 'es_i2s', h: 'Empieza por la que da un pulso por bit.' },
      G('es_i2sRate'),
      Nm('44,1 kHz, 16 bits, estéreo. ¿Frecuencia de BCLK, en kHz?', 1411.2, 'kHz', '44 100 × 16 × 2 = 1 411 200 Hz.', { tol: 1, c: 'es_i2sbuf', h: 'Un pulso de BCLK por cada bit de cada canal.' }),
      Q('Un altavoz pequeño con el mínimo de piezas:', ['MAX98357A', 'PCM5102A', 'INMP441', 'LM358'], 'Lleva el amplificador dentro.', { c: 'es_i2s', h: 'Busca el que lleva amplificador.' }),
      Q('El sonido «chisporrotea» cuando el WiFi está ocupado.', ['El búfer se vacía antes de rellenarlo: dale más búfer', 'El altavoz está roto', 'Falta un pull-up', 'Es normal'], 'Cada hueco sin datos es un clic. En el módulo 4 verás cómo dar más prioridad a la tarea de audio.', { c: 'es_i2sbuf', h: 'Recuerda la barra del búfer en la exploración.' }),
      Nm('Un tono de 440 Hz con 22 050 muestras por segundo: ¿cuántas muestras por periodo, aproximadamente?', 50.1, '', '22 050 / 440 ≈ 50,1.', { tol: 0.3, c: 'es_period', h: 'Un periodo dura 1/440 s: ¿cuántas muestras caben?' }),
      Q('¿Qué chip usarías para grabar sonido por I²S?', ['INMP441', 'MAX98357A', 'PCM5102A', '74AHCT125'], 'Es un micrófono con salida I²S.', { c: 'es_i2s', h: 'Busca el que escucha, no el que suena.' }),
      RES('I²S: <b>BCLK</b> (un pulso por bit), <b>WS</b> (canal) y <b>DATA</b>.', '<b>BCLK = fs × bits × canales</b>; caudal en bytes = fs × bytes × canales.', 'El DMA vacía el búfer solo: margen = <b>muestras / fs</b>. Si tu tarea tarda más, clic.', 'MAX98357A (altavoz), PCM5102A (línea), INMP441 (micrófono).')
    ]),
    L('es15', 'Temporizadores e interrupciones', 'timer', ['es_isr', 'es_period', 'es_bounce', 'es_race'], [
      Q('Un pulsador con attachInterrupt(…, FALLING) cuenta 3 o 4 pulsaciones cada vez. ¿Qué crees que pasa?', ['Los contactos rebotan y cada rebote es un flanco', 'La interrupción es lenta', 'El ESP32 cuenta mal', 'Hay que usar el núcleo 0'], 'Cada rebote es una bajada y cada bajada dispara la interrupción. Vamos a filtrarlos.', { predict: true, c: 'es_bounce', h: 'Recuerda cómo se cierran los contactos metálicos de un pulsador.' }),
      { t: 'explore', text: 'Un pulsador real rebota unos milisegundos. La interrupción ignora los flancos que llegan durante una ventana tras el último aceptado.', viz: 'es_bounce',
        params: { reb: { label: 'Duración de los rebotes', val: 3, list: [0.5, 1, 3, 5, 8], unit: 'ms', dec: 1 }, win: { label: 'Ventana de antirrebote', val: 0, min: 0, max: 30, step: 1, unit: 'ms', dec: 0 } },
        tasks: [
          { q: 'one', min: 1, max: 1, text: 'Haz que cuente una sola pulsación', done: 'Ignorando flancos durante unos ms tras el primero, los rebotes no cuentan.', hint: 'Sube la ventana por encima de lo que duran los rebotes.' },
          { q: 'robust', min: 1, max: 1, text: 'Un pulsador peor rebota 8 ms: que siga contando una', done: 'Unos 20 ms de ventana sirven para casi cualquier pulsador.' }] },
      I('El clásico tiene <b>cuatro temporizadores hardware de 64 bits</b>. En el núcleo 3.x se configuran por frecuencia de cuenta: con timerBegin(1000000) cuenta a 1 MHz, y una alarma de 500 000 cuentas salta cada 0,5 s.', { code: 'hw_timer_t *t = timerBegin(1000000);    // cuenta a 1 MHz\ntimerAttachInterrupt(t, &alSonar);\ntimerAlarm(t, 500000, true, 0);         // cada 0,5 s, se repite',
        more: 'En el núcleo 2.x era distinto: timerBegin con divisor, timerAlarmWrite y timerAlarmEnable. Si un ejemplo usa esas funciones, es antiguo.' }),
      I('Una <b>ISR</b> en el ESP32 es corta: guarda, avisa y sale. Nada de delay, Serial ni WiFi dentro. Y va marcada con <b>IRAM_ATTR</b>: así vive en RAM y puede ejecutarse aunque la flash esté ocupada (escribiendo ajustes, por ejemplo).', {
        svg: SV(140, `${bx(10, 50, 60, 36, 'CPU', 'var(--led)', W)}${bx(100, 14, 70, 32, 'caché')}${bx(200, 14, 90, 32, 'flash')}${bx(100, 92, 70, 32, 'IRAM', 'var(--ok)', W)}
          ${ar(70, 60, 100, 34)}<path d="M170 30H200" stroke="var(--err)" stroke-width="2" stroke-dasharray="4 3"/>${tx(176, 62, 'escribiendo: cortado', 'vizsm', 'fill="var(--err)"')}${ar(70, 76, 100, 104, 'var(--ok)')}${tx(176, 112, 'ISR siempre accesible', 'vizsm', 'fill="var(--ok)"')}`) }),
      I('Variables que comparten ISR y programa: <b>volatile</b>. Y si no se leen de una vez (64 bits, estructuras), protégelas: en un chip de dos núcleos, desactivar interrupciones no basta; se usa un cerrojo <b>portMUX</b>.', { code: 'portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;\nvolatile uint64_t pulsos = 0;\n// en la ISR:   portENTER_CRITICAL_ISR(&mux); pulsos++; portEXIT_CRITICAL_ISR(&mux);\n// en loop():   portENTER_CRITICAL(&mux); uint64_t n = pulsos; portEXIT_CRITICAL(&mux);' }),
      { t: 'steps', text: 'timerBegin(1000000). ¿Qué valor de alarma da una interrupción cada 2 ms?', steps: ['El temporizador cuenta 1 000 000 veces por segundo', 'Cuentas = frecuencia × periodo', '= 1 000 000 × 0,002 s', '= <b>2000</b> cuentas'], result: 'timerAlarm(t, 2000, true, 0)' },
      G('es_timerAlarm'),
      Q('¿Por qué IRAM_ATTR en una ISR?', ['La coloca en RAM interna: puede ejecutarse aunque la caché de flash esté desactivada', 'La hace más fácil de escribir', 'La pasa al otro núcleo', 'Desactiva el WiFi'], 'Sin ella, una interrupción durante una escritura en flash puede colgar el chip.', { c: 'es_isr', h: 'Mira el dibujo: ¿qué camino sigue funcionando mientras se escribe la flash?' }),
      Q('¿Qué tiene de malo esta ISR?', ['Serial y delay no deben usarse en una ISR: marca un aviso y hazlo fuera', 'Nada', 'Le falta return', 'Debería ser int'], 'Bloquean y tardan milisegundos.', { code: 'void IRAM_ATTR alPulsar() {\n  Serial.println("Pulsado");\n  delay(20);\n}', c: 'es_isr', h: 'Una ISR debe durar microsegundos.' }),
      { t: 'order', q: 'Ordena el viaje de un evento.', items: ['El pin cambia y salta la interrupción', 'La ISR guarda lo mínimo y avisa (una variable, una cola o una notificación)', 'La ISR termina en microsegundos', 'loop() o una tarea procesa el evento con calma'], e: 'Así las interrupciones no bloquean nada.', c: 'es_isr', h: 'Lo urgente dentro, lo lento fuera.' },
      Q('En la ISR del pulsador, ¿cómo aplicas el antirrebote?', ['Comparando millis() con el último flanco aceptado e ignorando si han pasado menos de 20 ms', 'Con delay(20) dentro de la ISR', 'Con Serial.println para ver los rebotes', 'Quitando IRAM_ATTR'], 'Comparar instantes es instantáneo; esperar dentro de la ISR, no.', { c: 'es_bounce', h: 'Haz lo de la exploración, pero en código: una ventana de tiempo.' }),
      Q('¿Qué tipo de variable usas para un contador que suma la ISR y lee loop()?', ['volatile, y copiada en sección crítica si no se lee de una vez', 'Una variable local', 'Una constante', 'Un String'], 'volatile evita que el compilador la guarde en un registro.', { c: 'es_race', h: 'Tiene que leerse siempre de la memoria.' }),
      Q('Un contador uint64_t que suma la ISR: ¿cómo lo lees en loop() en un chip de dos núcleos?', ['Copiándolo dentro de portENTER_CRITICAL y portEXIT_CRITICAL', 'Con noInterrupts() basta', 'Leyéndolo sin más', 'Con un delay antes'], 'noInterrupts() solo afecta al núcleo propio; la ISR puede estar en el otro.', { c: 'es_race', h: '64 bits no se leen de una vez en un chip de 32 bits, y hay dos núcleos.' }),
      RES('Temporizadores de 64 bits: timerBegin(frecuencia) y timerAlarm(cuentas); cuentas = f × periodo.', 'ISR: corta, sin delay ni Serial, y con <b>IRAM_ATTR</b>.', 'Rebotes: ignora flancos durante ~20 ms tras el aceptado.', 'Variables compartidas: <b>volatile</b> y, si no son atómicas, sección crítica con portMUX.')
    ]),
    SIM('es-s5', 'Reto: fundido en contrafase', 'Dos LED controlados por LEDC: cuando uno sube, el otro baja.', { arduino: 'es_ledc2', board: 'esp32', parts: ['res', 'led'], code: true, hint: 'LED en los GPIO 18 y 19 (fila de arriba). ' + LED_HINT }, 'es_ledc2'),
    SIM('es-s6', 'Reto: pulsador que conmuta', 'Cada pulsación enciende o apaga el LED, sin que los rebotes cuenten de más.', { arduino: 'es_toggle', board: 'esp32', parts: ['push', 'res', 'led'], code: true, hint: 'Pulsador entre el GPIO 4 y GND (usa la pull-up interna). LED con 150 Ω en el GPIO 23. Pulsa, suelta y vuelve a pulsar.' }, 'es_toggle'),
    SIM('es-s7', 'Reto: máquina de estados', 'Un solo botón recorre cuatro modos: apagado, fijo, parpadeo y respiración.', { arduino: 'es_estados', board: 'esp32', parts: ['push', 'res', 'led'], code: true, hint: 'Pulsador entre el GPIO 4 y GND. LED con 150 Ω en el GPIO 18. Pulsa varias veces y espera un poco en cada modo.' }, 'es_estados'),
    PRJ('es-p3', 'Proyecto: lámpara WS2812 táctil', 'es_lamp'),
    PRJ('es-p4', 'Proyecto: aprendiz de mandos IR', 'es_irremote'),
    PRJ('es-p5', 'Proyecto: piano táctil con I²S', 'es_piano')
  ];

  const SCHED = (x = {}) => ({ core: { label: 'Núcleo de Sensor', val: 1, list: [0, 1], dec: 0 }, prio: { label: 'Prioridad de Sensor', val: 3, min: 1, max: 5, step: 1, dec: 0 }, ms: { label: 'Trabajo cada 10 ms', val: 3, min: 1, max: 8, step: 1, unit: 'ms', dec: 0 }, wait: { label: 'Espera (0 activa · 1 vTaskDelay)', val: 0, list: [0, 1], dec: 0 }, ...x });
  const M4 = [
    L('es16', 'Por qué un sistema operativo', 'timer', ['es_rtos', 'es_task'], [
      Q('En loop(), leer un sensor tarda 500 ms, y un LED que debe cambiar cada 100 ms parpadea a trompicones. ¿Qué lo arreglaría mejor?', ['Separar cada trabajo en su propia tarea', 'Un delay más corto', 'Una CPU más rápida', 'Más RAM'], 'Con loop() todo va en fila. Con tareas, cada trabajo lleva su ritmo. Vamos a verlo con el planificador.', { predict: true, c: 'es_task', h: 'Dos trabajos con ritmos distintos no deberían esperarse el uno al otro.' }),
      { t: 'explore', text: 'Dos núcleos y tres tareas: la radio (prioridad 23) en el núcleo 0, loop() (prioridad 1) en el 1, y tu tarea Sensor, que necesita unos ms de cada 10. Las franjas grises son tiempo libre.', viz: 'es_sched', params: SCHED(),
        tasks: [
          { q: 'all', min: 1, max: 1, text: 'Haz que todas cumplan y quede tiempo libre en los dos núcleos', done: 'Con vTaskDelay, Sensor trabaja y se bloquea: deja la CPU a loop().', hint: 'Cambia la forma de esperar.' },
          { q: 'idle0', min: 0, max: 0, text: 'Ahora pon Sensor en el núcleo 0 con espera activa y mira el tiempo libre', done: 'La radio, más prioritaria, sigue cumpliendo; pero el núcleo 0 se queda sin tiempo libre y el sistema lo vigila (lo verás en la lección de watchdogs).', hint: 'Núcleo 0 y espera activa.' }] },
      I('Con loop() todo va en fila: si una parte tarda, las demás esperan. <b>FreeRTOS</b> reparte el trabajo en <b>tareas</b>, cada una con su bucle, su pila y su prioridad. El <b>planificador</b> decide quién usa cada núcleo en cada momento.', {
        svg: SV(140, `${tx(10, 20, 'loop(): en fila', 'vizlab')}${bx(10, 28, 150, 22, 'sensor 500 ms', 'var(--led)', W)}${bx(160, 28, 30, 22, 'LED', 'var(--ok)', W)}${bx(190, 28, 100, 22, 'sensor…', 'var(--led)', W)}
          ${tx(10, 80, 'Tareas: cada una a su ritmo', 'vizlab')}${bx(10, 88, 280, 18, 'Tarea sensor', 'var(--led)', W)}${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${10 + i * 42}" y="112" width="12" height="18" rx="3" fill="var(--ok)" class="a-blink a-d${i % 4 + 1}"/>`).join('')}`) }),
      I('En el ESP32, FreeRTOS está siempre: loop() es una tarea (prioridad 1, núcleo 1), la radio tiene las suyas en el núcleo 0, y hay una tarea <b>IDLE</b> por núcleo que corre cuando no hay nada más. El reloj del planificador (tick) va a 1000 Hz en Arduino.', {
        svg: SV(120, `${tx(10, 28, 'Núcleo 0', 'vizlab')}${bx(80, 14, 70, 22, 'WiFi (23)', '#3E8FCB', W)}${bx(150, 14, 140, 22, 'IDLE0', 'var(--line)')}
          ${tx(10, 76, 'Núcleo 1', 'vizlab')}${bx(80, 62, 130, 22, 'loopTask (1)', 'var(--ok)', W)}${bx(210, 62, 80, 22, 'IDLE1', 'var(--line)')}${tx(150, 110, 'entre paréntesis, la prioridad', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Una tarea siempre está en uno de cuatro estados. Lo bueno es que pase casi todo el tiempo <b>bloqueada</b>: no gasta CPU y despierta en cuanto hay algo que hacer.', {
        svg: SV(140, `${bx(100, 10, 100, 28, 'Ejecutándose', 'var(--led)', W)}${bx(10, 70, 80, 28, 'Lista')}${bx(210, 70, 80, 28, 'Bloqueada')}${bx(100, 110, 100, 26, 'Suspendida', 'var(--line)')}
          ${ar(90, 76, 116, 40)}${ar(200, 38, 226, 70)}${ar(210, 90, 90, 90)}${tx(150, 84, 'llega el evento', 'vizsm', 'text-anchor="middle"')}${tx(238, 56, 'espera', 'vizsm')}${tx(40, 54, 'turno', 'vizsm')}`),
        more: 'Suspendida: alguien la ha apartado con vTaskSuspend y no vuelve hasta vTaskResume. Bloqueada: espera tiempo (vTaskDelay) o un evento (una cola, una notificación) y vuelve sola.' }),
      I('Prioridades de 0 (IDLE) a 24: más número, más prioridad. Si se desbloquea una tarea más prioritaria, se queda la CPU al instante (planificación <b>expropiativa</b>). Con prioridades iguales, se turnan en cada tick.', {
        svg: SV(110, `${tx(6, 26, 'alta', 'vizsm')}${tx(6, 60, 'baja', 'vizsm')}<rect x="90" y="14" width="60" height="18" fill="var(--led)"/><rect x="220" y="14" width="40" height="18" fill="var(--led)"/>
          <rect x="40" y="48" width="50" height="18" fill="#3E8FCB"/><rect x="150" y="48" width="70" height="18" fill="#3E8FCB"/><rect x="260" y="48" width="30" height="18" fill="#3E8FCB"/>
          ${ar(90, 82, 90, 70, 'var(--err)')}${tx(94, 92, 'la alta se desbloquea y expulsa a la baja', 'vizsm')}`) }),
      { t: 'steps', text: 'Tarea A (prioridad 3) y B (prioridad 2) en el mismo núcleo. A trabaja 2 ms y luego se bloquea 8 ms con vTaskDelay. ¿Cuándo corre B?', steps: ['Cuando A se desbloquea, se queda la CPU: tiene más prioridad', 'Trabaja 2 ms y llama a vTaskDelay: pasa a «bloqueada»', 'Con A bloqueada, la tarea lista de más prioridad es B: corre', 'B tiene 8 ms de cada 10. Si A no se bloqueara nunca, B no correría jamás (inanición)'], result: 'Bloquearse es lo que reparte la CPU.' },
      { t: 'match', q: 'Une cada estado de una tarea con su significado.', pairs: [['Ejecutándose', 'Usa la CPU ahora'], ['Lista', 'Quiere CPU y espera turno'], ['Bloqueada', 'Espera tiempo o un evento'], ['Suspendida', 'Apartada hasta que la reanuden']], c: 'es_task', h: 'Mira el diagrama de estados.' },
      Q('En el ESP32, ¿qué hace delay(100)?', ['Llama a vTaskDelay: bloquea la tarea y deja la CPU a otras', 'Una espera activa que ocupa la CPU', 'Detiene el chip entero', 'Apaga el WiFi'], 'Por eso un delay en loop() no frena las tareas de otros núcleos ni de más prioridad.', { c: 'es_rtos', h: '¿La tarea queda «lista» o «bloqueada» mientras espera?' }),
      Q('¿Y un while (millis() - t < 100) {}?', ['Espera activa: ocupa la CPU y las tareas de menor prioridad no corren', 'Lo mismo que delay', 'Bloquea la tarea', 'Duerme el chip'], 'Gasta energía y tiempo de CPU para nada.', { c: 'es_rtos', h: 'Recuerda la espera activa del planificador.' }),
      Q('Tarea A (prioridad 3) en un bucle sin bloquearse nunca; tarea B (prioridad 2) en el mismo núcleo.', ['B no se ejecuta nunca (inanición)', 'Se turnan', 'B se pasa sola al otro núcleo', 'A se para sola cada tick'], 'Lo de menos prioridad solo corre cuando lo de más está bloqueado.', { c: 'es_rtos', h: 'Repasa el ejemplo paso a paso con A sin bloquearse.' }),
      Q('¿Cuál es la principal ventaja de pasar de loop() a tareas?', ['Cada parte lleva su ritmo y una lenta no bloquea a las demás', 'El programa ocupa menos', 'No hace falta sincronizar nada', 'Gasta menos RAM'], 'A cambio, hay que sincronizar lo que compartan.', { c: 'es_task', h: 'Piensa en el LED que parpadeaba a trompicones.' }),
      RES('FreeRTOS reparte el trabajo en <b>tareas</b> con su bucle, su pila y su prioridad.', 'loop() es una tarea (prioridad 1, núcleo 1); la radio vive en el núcleo 0; IDLE corre cuando no hay nada más.', 'Más prioridad gana la CPU al instante; las tareas deben <b>bloquearse</b> (delay, vTaskDelay, colas) para repartirla.', 'Espera activa = CPU ocupada para nada.')
    ]),
    L('es17', 'Crear tareas: pila, prioridad y núcleo', 'timer', ['es_taskstack', 'es_task', 'es_cores', 'es_rtos'], [
      Q('Creas una tarea con 1024 bytes de pila que usa printf. ¿Qué crees que pasará?', ['Se desborda la pila y el chip se reinicia', 'Funciona perfecto', 'Va más lenta', 'Se mueve sola al otro núcleo'], 'printf necesita bastante pila para formatear. Vamos a medir cuánto.', { predict: true, c: 'es_taskstack', h: 'printf necesita memoria temporal para preparar el texto.' }),
      { t: 'explore', text: 'La pila de una tarea guarda sus variables locales y las llamadas en curso. Cambia su tamaño, el array local y si usa printf.', viz: 'es_stack',
        params: { st: { label: 'Pila de la tarea', val: 4096, list: [1024, 2048, 3072, 4096, 6144, 8192], unit: 'bytes', dec: 0 }, arr: { label: 'Array local', val: 400, min: 0, max: 3000, step: 100, unit: 'bytes', dec: 0 }, pf: yn('printf (0 no · 1 sí)', 1) },
        tasks: [
          { q: 'overflow', min: 1, max: 1, text: 'Desborda la pila', done: 'Cuando lo usado supera la pila, el sistema lo detecta (el «canario» del final) y reinicia.', hint: 'Baja la pila o sube el array.' },
          { q: 'tight', min: 1, max: 1, text: 'Con printf y un array de 2000 bytes, elige la pila más pequeña que deje 512 bytes de margen', done: 'Unos 3800 bytes usados piden 6144: el margen protege de llamadas más profundas.', hint: 'Pon el array en 2000 y prueba tamaños de menor a mayor.' }] },
      I('Una tarea es una función que nunca termina. Se crea con xTaskCreatePinnedToCore:', { code: 'void miTarea(void *param) {\n  for (;;) {\n    // trabajo\n    vTaskDelay(pdMS_TO_TICKS(100));\n  }\n}\n\nxTaskCreatePinnedToCore(\n  miTarea, "mia",   // función y nombre\n  4096,            // pila en BYTES (en ESP-IDF)\n  NULL,            // parámetro\n  2,               // prioridad\n  NULL,            // manejador (opcional)\n  1);              // núcleo',
        more: 'Si una tarea tiene que acabar, se borra ella misma con vTaskDelete(NULL); llegar al final de la función con return es un error grave. El parámetro void *param permite pasar un puntero a sus datos: así una misma función sirve para varias tareas parecidas.' }),
      I('La pila se mide en <b>bytes</b> en ESP-IDF (en el FreeRTOS original, en palabras). Si se desborda verás «Stack canary watchpoint triggered». <b>uxTaskGetStackHighWaterMark(NULL)</b> dice lo mínimo que ha llegado a quedar libre: como una jarra con la marca del nivel más alto.', {
        svg: SV(140, `<path d="M110 20V120H190V20" fill="none" stroke="currentColor" stroke-width="2"/><rect x="112" y="56" width="76" height="62" fill="#3E8FCB" opacity=".7" class="a-bob"/><path d="M104 46H196" stroke="var(--err)" stroke-dasharray="4 3"/>
          ${tx(200, 50, 'nivel máximo', 'vizsm', 'fill="var(--err)"')}${tx(200, 30, 'lo que nunca', 'vizsm')}${tx(200, 40, 'se usó = marca', 'vizsm')}${tx(150, 136, 'pila de la tarea', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Núcleos: por defecto WiFi y Bluetooth trabajan en el <b>núcleo 0</b> y Arduino en el <b>1</b>. Pon el cálculo pesado donde quede tiempo libre. xTaskCreate (sin «Pinned») deja que la ejecute cualquier núcleo libre. Los chips de un núcleo (S2, C3, C6) solo tienen el 0.', {
        svg: SV(110, `${tx(10, 26, 'Núcleo 0', 'vizlab')}<rect x="80" y="12" width="40" height="22" fill="#3E8FCB"/><rect x="120" y="12" width="170" height="22" fill="var(--line)"/>${tx(200, 28, 'libre', 'vizsm', 'text-anchor="middle"')}
          ${tx(10, 70, 'Núcleo 1', 'vizlab')}<rect x="80" y="56" width="110" height="22" fill="var(--ok)"/><rect x="190" y="56" width="100" height="22" fill="var(--line)"/>${tx(135, 72, 'loop()', 'vizsm', 'text-anchor="middle" fill="#fff"')}${tx(150, 102, '¿dónde cabe tu tarea pesada?', 'vizsm', 'text-anchor="middle"')}`) }),
      { t: 'steps', text: 'Pila de 4096 bytes; uxTaskGetStackHighWaterMark() devuelve 700. ¿Está bien?', steps: ['La marca dice lo mínimo que ha llegado a quedar libre: 700 bytes', 'Lo más que ha usado: 4096 − 700 = 3396 bytes', 'Regla práctica: deja al menos unos 512 bytes de margen', '700 > 512: vale, pero mídelo tras probar el caso más exigente'], result: 'Aceptable, con poco margen.' },
      Q('En ESP-IDF, ¿en qué unidades se da el tamaño de pila de xTaskCreate?', ['Bytes (en el FreeRTOS original son palabras)', 'Palabras de 32 bits', 'Kilobytes', 'Número de variables'], 'Un detalle que confunde al leer documentación genérica de FreeRTOS.', { c: 'es_taskstack', h: 'Lo decía el comentario del código.' }),
      Q('¿Qué pasa si una función de tarea llega al final y hace return?', ['Error grave: una tarea nunca debe terminar; usa un bucle o vTaskDelete(NULL)', 'Se repite sola', 'Nada', 'Se mueve al otro núcleo'], 'Si quieres que acabe, que se borre ella misma.', { c: 'es_task', h: 'Una tarea es una función que nunca termina.' }),
      G('es_stack'), G('es_stack'),
      Q('Una tarea de prioridad 20 en un bucle sin bloquearse, en el núcleo 0.', ['Puede dejar sin CPU a tareas del sistema, como la de red, y disparar el watchdog', 'No pasa nada', 'El WiFi va más rápido', 'Se pasa sola al núcleo 1'], 'El núcleo 0 tiene trabajo del sistema con prioridades por debajo de 20: respétalo.', { c: 'es_rtos', h: 'Más prioridad y sin bloquearse: ¿quién se queda sin turno?' }),
      TU('Sensor necesita 8 ms de cada 10 ms. Elige núcleo para que todo cumpla.', 'es_sched', { core: { label: 'Núcleo de Sensor', val: 1, list: [0, 1], dec: 0 }, prio: { label: 'Prioridad de Sensor', val: 2, min: 1, max: 5, step: 1, dec: 0 }, ms: { val: 8, fixed: true }, wait: { val: 1, fixed: true } }, { q: 'all', min: 1, max: 1, text: 'Objetivo: todas cumplen y queda tiempo libre en los dos núcleos', hint: 'En el núcleo 1, loop() también necesita 4 ms de cada 10.' }, 'En el núcleo 0 caben la radio (1,5 ms) y Sensor (8 ms).', { c: 'es_cores', h: 'Suma lo que pide cada núcleo: no puede pasar de 10 ms cada 10 ms.' }),
      Q('¿Para qué sirve el parámetro void *param de una tarea?', ['Para pasarle datos al crearla (un puntero a lo que quieras)', 'Para la prioridad', 'Para la pila', 'No sirve'], 'Así una misma función sirve para varias tareas parecidas.', { c: 'es_task', h: 'Es el cuarto argumento de xTaskCreatePinnedToCore.' }),
      Q('En un ESP32-C3 (un núcleo) quieres crear una tarea.', ['xTaskCreate, o núcleo 0 / tskNO_AFFINITY: no hay núcleo 1', 'Núcleo 1 siempre', 'No hay FreeRTOS', 'Hace falta PSRAM'], 'Mira cuántos núcleos tiene tu chip.', { c: 'es_cores', h: '¿Cuántos núcleos tiene el C3?' }),
      RES('Una tarea: función con bucle infinito, creada con <b>xTaskCreatePinnedToCore</b> (pila en bytes, prioridad, núcleo).', 'Mide la pila con <b>uxTaskGetStackHighWaterMark</b> y deja ~512 bytes de margen; printf y los arrays locales comen mucha.', 'Radio en el núcleo 0, Arduino en el 1: suma lo que pide cada núcleo.', 'Nunca hagas return en una tarea: vTaskDelete(NULL).')
    ]),
    L('es18', 'Colas y notificaciones', 'timer', ['es_sync'], [
      Q('Un sensor manda 5 datos de golpe cada segundo y la tarea que los procesa saca 3 por segundo. ¿Qué pasará con una cola de 100 elementos?', ['Se acabará llenando y perdiendo datos', 'Nunca se pierde nada: 100 es mucho', 'Se procesa más rápido', 'Se reinicia el chip'], 'Si sale menos de lo que entra, ninguna cola basta: solo tarda más en llenarse.', { predict: true, c: 'es_sync', h: 'Compara lo que entra y lo que sale cada segundo.' }),
      { t: 'explore', text: 'Un sensor mete ráfagas en una cola y una tarea las saca a su ritmo. xQueueSend no espera: si la cola está llena, el dato se pierde.', viz: 'es_queue',
        params: { b: { label: 'Ráfaga del sensor', val: 5, list: [1, 2, 5, 10, 20], unit: 'datos', dec: 0 }, c: { label: 'El consumidor saca', val: 10, list: [1, 3, 5, 10, 20, 50], unit: 'datos/s', dec: 0 }, L: { label: 'Tamaño de la cola', val: 10, list: [1, 2, 3, 5, 10, 20, 50], dec: 0 } },
        tasks: [
          { q: 'lost', min: 1, max: 1e9, text: 'Haz que se pierdan datos achicando la cola', done: 'Si no cabe una ráfaga entera, lo que sobra se descarta.', hint: 'Baja el tamaño por debajo de la ráfaga.' },
          { q: 'grows', min: 1, max: 1, text: 'Ahora haz el consumidor más lento que el productor', done: 'Si sale menos de lo que entra, ninguna cola basta: se llenará tarde o temprano.' }] },
      I('Comunicar tareas con variables globales trae problemas. Una <b>cola</b> es un buzón de tamaño fijo: copia los datos del productor al consumidor en orden, y quien espera queda bloqueado sin gastar CPU.', {
        svg: SV(110, `${bx(6, 36, 64, 34, 'Productor', 'var(--led)', W)}${ar(70, 53, 96, 53)}${[0, 1, 2, 3, 4].map(i => `<rect x="${98 + i * 22}" y="38" width="20" height="30" fill="${i < 3 ? 'var(--ice-soft)' : 'none'}" stroke="currentColor"/>`).join('')}${ar(208, 53, 226, 53)}${bx(226, 36, 68, 34, 'Consumidor', '#3E8FCB', W)}
          ${tx(150, 92, 'xQueueSend → → xQueueReceive', 'vizsm', 'text-anchor="middle"')}`),
        code: 'QueueHandle_t cola = xQueueCreate(10, sizeof(float));\n// Productor\nxQueueSend(cola, &t, 0);                // 0: no esperar si está llena\n// Consumidor\nif (xQueueReceive(cola, &d, portMAX_DELAY) == pdTRUE) { /* usar d */ }' }),
      I('Desde una ISR se usan las versiones <b>FromISR</b>, que nunca bloquean. Si al enviar se despierta una tarea más prioritaria, se pide el cambio de tarea al salir:', { code: 'void IRAM_ATTR isr() {\n  BaseType_t despierta = pdFALSE;\n  uint32_t t = micros();\n  xQueueSendFromISR(cola, &t, &despierta);\n  portYIELD_FROM_ISR(despierta);\n}' }),
      I('Otras dos herramientas:\n· <b>Notificación de tarea</b>: lo más ligero para despertar a una tarea concreta con un número pequeño (vTaskNotifyGiveFromISR y ulTaskNotifyTake).\n· <b>Grupo de eventos</b>: un bit por condición; una tarea puede esperar a que se cumplan varias a la vez.', {
        svg: SV(110, `${bx(10, 20, 80, 30, 'ISR', 'var(--led)', W)}${ar(90, 35, 140, 35, 'currentColor', 'class="a-flow"')}${bx(140, 20, 150, 30, 'tarea despierta')}${tx(115, 28, '¡ya!', 'vizsm', 'text-anchor="middle"')}
          ${['WiFi', 'hora'].map((n, i) => bx(10 + i * 70, 66, 64, 30, n, 'var(--ok)', W)).join('')}${ar(144, 81, 170, 81)}${bx(170, 66, 120, 30, 'espera las dos')}`) }),
      { t: 'steps', text: 'Diseña la cola: ráfagas de 8 lecturas de 12 bytes cada segundo; el consumidor procesa 20 por segundo.', steps: ['¿Aguanta el ritmo? Entran 8 por segundo y salen 20: sí', '¿Qué tamaño? Al menos una ráfaga entera: 8 elementos (mejor 10, con margen)', 'Memoria de datos: 10 × 12 bytes = 120 bytes', 'xQueueCreate(10, sizeof(Lectura))'], result: 'Una cola de 10 elementos' },
      Q('¿Qué hace xQueueReceive(cola, &d, portMAX_DELAY)?', ['Espera bloqueada, sin gastar CPU, hasta que llega un dato', 'Lee la cola aunque esté vacía', 'Borra la cola', 'Envía un dato'], 'portMAX_DELAY: esperar indefinidamente.', { c: 'es_sync', h: 'portMAX_DELAY es «el máximo de espera».' }),
      Q('La cola está llena y llamas a xQueueSend(cola, &t, 0).', ['Devuelve errQUEUE_FULL y el dato no entra', 'Bloquea para siempre', 'Sobrescribe el más antiguo', 'Reinicia el chip'], 'Para quedarse siempre con el último existe xQueueOverwrite, en colas de 1.', { c: 'es_sync', h: 'El 0 final es el tiempo que acepta esperar.' }),
      Nm('Una cola de 16 elementos de una estructura de 20 bytes. ¿Bytes de datos?', 320, 'bytes', '16 × 20 = 320 bytes (más la cabecera de la cola).', { tol: 0.5, c: 'es_sync', h: 'Elementos por tamaño de cada uno.' }),
      Q('¿Cuándo usar una notificación en vez de una cola?', ['Para despertar a una tarea concreta con un valor pequeño, lo más rápido posible', 'Para mandar estructuras grandes', 'Para varios consumidores', 'Nunca'], 'Si necesitas pasar datos de verdad, cola.', { c: 'es_sync', h: 'La notificación es lo más ligero, pero lleva poco.' }),
      { t: 'order', q: 'Ordena un sistema productor–consumidor con interrupción.', items: ['El sensor avisa por un pin y salta la ISR', 'La ISR mete la marca de tiempo en la cola con xQueueSendFromISR', 'La tarea de proceso, bloqueada en xQueueReceive, despierta', 'Procesa el dato y vuelve a bloquearse esperando el siguiente'], e: 'Nadie gasta CPU esperando.', c: 'es_sync', h: 'Empieza por el hardware y acaba con la tarea esperando otra vez.' },
      Q('Una tarea espera a la vez «WiFi conectado» y «hora sincronizada».', ['Un grupo de eventos con dos bits', 'Dos colas a la vez', 'Un mutex', 'Un delay largo'], 'xEventGroupWaitBits puede esperar a que estén todos los bits.', { c: 'es_sync', h: 'Varias condiciones a la vez: un bit por condición.' }),
      RES('<b>Cola</b>: buzón de tamaño fijo; copia los datos en orden y bloquea a quien espera.', 'Si el consumidor es más lento que el productor, ninguna cola basta; si hay ráfagas, que quepa una entera.', 'Desde una ISR: versiones <b>FromISR</b> y portYIELD_FROM_ISR.', 'Notificación: despertar a una tarea; grupo de eventos: esperar varias condiciones.')
    ]),
    L('es19', 'Carreras, mutex y semáforos', 'timer', ['es_race', 'es_mutex'], [
      Q('Dos tareas suman 1 a la misma variable mil veces cada una. ¿Cuánto crees que valdrá al final?', ['A veces menos de 2000', 'Siempre 2000', 'Siempre 1000', '4000'], 'contador++ no es un solo paso para la CPU, y las tareas pueden pisarse. Compruébalo.', { predict: true, c: 'es_race', h: 'contador++ no es un solo paso para la CPU.' }),
      { t: 'explore', text: 'Dos tareas hacen contador++ mil veces cada una. Elige si van en el mismo núcleo o en distintos, y cómo se protege la variable.', viz: 'es_race',
        params: { cores: yn('Núcleos (0 el mismo · 1 distintos)', 0), prot: { label: 'Protección (0 nada · 1 volatile · 2 mutex · 3 sección crítica)', val: 2, list: [0, 1, 2, 3], dec: 0 } },
        tasks: [
          { q: 'bad', min: 1, max: 1, text: 'Quita la protección y mira el resultado', done: 'Se pierden sumas: una tarea pisa lo que acaba de escribir la otra. Con dos núcleos, todavía más.', hint: 'Protección 0.' },
          { q: 'volBad', min: 1, max: 1, text: 'Prueba con volatile', done: 'volatile obliga a leer de memoria, pero no hace atómico el ++: sigue fallando.' }] },
      I('<b>Condición de carrera</b>: contador++ son tres pasos (leer, sumar, escribir). Si otra tarea se cuela entre medias, una suma se pierde. Con dos núcleos, puede pasar de verdad al mismo tiempo.', {
        svg: SV(130, `${tx(10, 20, 'Tarea A', 'vizlab')}${tx(10, 80, 'Tarea B', 'vizlab')}${bx(70, 8, 60, 22, 'lee 5')}${bx(190, 8, 80, 22, 'escribe 6', 'var(--led)', W)}
          ${bx(110, 68, 60, 22, 'lee 5')}${bx(200, 68, 80, 22, 'escribe 6', 'var(--led)', W)}${tx(150, 118, 'dos sumas… y el contador solo sube 1', 'vizlab', 'text-anchor="middle" fill="var(--err)"')}`) }),
      I('Un <b>mutex</b> es la llave única de un recurso: quien la toma lo usa y los demás esperan bloqueados.', { code: 'SemaphoreHandle_t mtx = xSemaphoreCreateMutex();\n\nif (xSemaphoreTake(mtx, pdMS_TO_TICKS(100)) == pdTRUE) {\n  pantalla.print(texto);     // bus I²C en exclusiva\n  xSemaphoreGive(mtx);\n} else {\n  // no la conseguí en 100 ms: decide qué hacer\n}' }),
      I('Herramientas parecidas, usos distintos:\n· <b>Mutex</b>: uso exclusivo; tiene dueño y <b>herencia de prioridad</b>.\n· <b>Semáforo binario</b>: señalar que algo ha pasado (vale desde una ISR).\n· <b>Semáforo contador</b>: N recursos iguales.', {
        svg: SV(110, `${bx(6, 20, 90, 60, '', 'var(--ice-soft)')}${tx(51, 44, 'Mutex', 'vizlab', 'text-anchor="middle"')}${tx(51, 64, 'una llave', 'vizsm', 'text-anchor="middle"')}${bx(104, 20, 92, 60, '', 'var(--ice-soft)')}${tx(150, 44, 'Binario', 'vizlab', 'text-anchor="middle"')}${tx(150, 64, '«ya ha pasado»', 'vizsm', 'text-anchor="middle"')}${bx(204, 20, 90, 60, '', 'var(--ice-soft)')}${tx(249, 44, 'Contador', 'vizlab', 'text-anchor="middle"')}${tx(249, 64, 'N plazas', 'vizsm', 'text-anchor="middle"')}`),
        more: 'Inversión de prioridad: una tarea alta espera un mutex que tiene una baja, y una media (que no lo necesita) no deja correr a la baja. Resultado: la alta espera a la media. La herencia de prioridad sube temporalmente a la baja para que suelte el mutex cuanto antes.' }),
      I('Cuidado con el <b>interbloqueo</b>: si cada tarea tiene una llave y espera la de la otra, ninguna avanza. Toma siempre los mutex en el mismo orden. Y nunca un mutex dentro de una ISR: no puede quedarse esperando.', {
        svg: SV(120, `${bx(10, 40, 70, 34, 'Tarea A', 'var(--led)', W)}${bx(220, 40, 70, 34, 'Tarea B', '#3E8FCB', W)}${bx(120, 8, 60, 26, 'mutex X')}${bx(120, 82, 60, 26, 'mutex Y')}
          ${ar(80, 50, 120, 24, 'var(--ok)')}${ar(220, 64, 180, 94, 'var(--ok)')}<path d="M80 66L120 94M220 50L180 24" stroke="var(--err)" stroke-dasharray="4 3"/>${tx(150, 62, 'esperan para siempre', 'vizsm', 'text-anchor="middle" fill="var(--err)"')}`) }),
      { t: 'steps', text: 'A toma el mutex X y luego el Y; B toma el Y y luego el X. ¿Qué puede pasar?', steps: ['A toma X', 'Justo entonces B toma Y', 'A pide Y: lo tiene B, así que espera', 'B pide X: lo tiene A, así que espera. Ninguna suelta: <b>interbloqueo</b>'], result: 'Solución: tomar siempre los mutex en el mismo orden (X y luego Y).' },
      Q('Dos tareas escriben en la misma OLED I²C y a veces sale basura.', ['Protege cada uso completo del bus con un mutex', 'Sube la prioridad de una', 'Pon delay(1)', 'Usa el otro núcleo'], 'Cada transacción debe terminar antes de que empiece la otra.', { c: 'es_mutex', h: 'Un recurso que solo puede usar una tarea cada vez.' }),
      { t: 'match', q: 'Une cada herramienta con su uso.', pairs: [['Mutex', 'Uso exclusivo de un recurso'], ['Semáforo binario', 'Señalar que algo ha ocurrido'], ['Semáforo contador', 'Hay N recursos iguales'], ['Cola', 'Pasar datos en orden']], c: 'es_mutex', h: 'Repasa la tarjeta de las tres herramientas.' },
      Q('¿Por qué un mutex y no un semáforo binario para proteger un recurso?', ['El mutex tiene dueño y herencia de prioridad', 'Es más rápido siempre', 'Se puede usar en una ISR', 'No hay diferencia'], 'El semáforo binario es para señalar eventos.', { c: 'es_mutex', h: '¿Cuál evita la inversión de prioridad?' }),
      Q('Para evitar el interbloqueo entre dos mutex…', ['Toma siempre los mutex en el mismo orden', 'Sube las prioridades', 'Dale más pila', 'Pon delay entre los dos'], 'Si todas piden X antes que Y, nadie puede quedarse con Y esperando X.', { c: 'es_mutex', h: 'El problema venía del orden.' }),
      Q('¿Se puede tomar un mutex dentro de una ISR?', ['No: en una ISR se usan colas o semáforos con FromISR, nunca un mutex', 'Sí, con portMAX_DELAY', 'Sí, si es rápido', 'Solo en el núcleo 0'], 'Una ISR no puede bloquearse esperando.', { c: 'es_mutex', h: '¿Puede una ISR quedarse esperando?' }),
      Q('Una variable bool que solo escribe una tarea y solo lee otra:', ['Suele bastar con volatile (un bool se lee de una vez); con varios campos relacionados, protege', 'Siempre mutex', 'Necesita una cola', 'No se puede'], 'El peligro está en lo que no se lee o escribe de una vez.', { c: 'es_race', h: '¿Hay leer-modificar-escribir? ¿Se lee de una vez?' }),
      Q('Marcas el contador compartido como volatile y sigue perdiendo sumas. ¿Por qué?', ['volatile no hace atómico el ++: hace falta un mutex o una sección crítica', 'volatile lo empeora', 'Falta un delay', 'Es un fallo del compilador'], 'volatile solo obliga a leer de memoria cada vez.', { c: 'es_race', h: 'Lo viste en la exploración.' }),
      RES('<b>Carrera</b>: leer-sumar-escribir se pisan; volatile no lo arregla.', '<b>Mutex</b> para recursos (con herencia de prioridad); semáforo binario para señalar; contador para N recursos.', 'Toma los mutex siempre en el mismo orden (o habrá <b>interbloqueo</b>).', 'En una ISR, nunca un mutex: FromISR o secciones críticas.')
    ]),
    L('es20', 'Watchdogs y depurar un sistema multitarea', 'timer', ['es_wdt', 'es_crash', 'es_heap', 'es_taskstack'], [
      Q('Tu tarea del núcleo 0 espera con while (!listo) {} durante 10 s. ¿Qué crees que pasará?', ['Salta el watchdog de tareas', 'Nada, solo espera', 'Se apaga el WiFi para siempre', 'Se borra la flash'], 'Hay una tarea del sistema que necesita correr de vez en cuando en ese núcleo, y alguien la vigila.', { predict: true, c: 'es_wdt', h: 'En el núcleo 0 hay una tarea que solo corre cuando nadie más quiere la CPU.' }),
      { t: 'explore', text: 'Tu tarea espera en un bucle en el núcleo 0. El watchdog vigila que la tarea IDLE0 llegue a correr al menos cada 5 s.', viz: 'es_wdt',
        params: { busy: { label: 'Bucle de espera', val: 2, min: 0, max: 10, step: 1, unit: 's', dec: 0 }, cede: { label: 'En el bucle (0 nada · 1 vTaskDelay(1) · 2 desactivar watchdog)', val: 0, list: [0, 1, 2], dec: 0 } },
        tasks: [
          { q: 'trig', min: 1, max: 1, text: 'Alarga el bucle hasta que salte el watchdog', done: 'Unos 5 s sin que corra IDLE0: aviso.', hint: 'Sube la espera por encima de 5 s.' },
          { q: 'hidden', min: 1, max: 1, text: 'Prueba a desactivar el watchdog', done: 'El aviso desaparece, pero IDLE0 sigue sin correr: solo has callado al vigilante.' },
          { q: 'fixed', min: 1, max: 1, text: 'Arréglalo de verdad, con el bucle largo', done: 'Ceder la CPU en cada vuelta deja correr a IDLE0 y al resto.' }] },
      I('El <b>watchdog de tareas</b> (TWDT) vigila que ciertas tareas consigan CPU. En Arduino-ESP32 vigila la tarea IDLE del núcleo 0: si algo acapara ese núcleo unos 5 s sin bloquearse, avisa y puede reiniciar. IDLE0 es la víctima; el culpable, otra tarea.', {
        svg: SV(120, `<circle cx="60" cy="56" r="30" fill="none" stroke="currentColor" stroke-width="2"/><path d="M60 56V36M60 56L74 64" stroke="var(--err)" stroke-width="2.5" class="a-spin" style="transform-origin:60px 56px"/>${tx(60, 106, '5 s', 'vizlab', 'text-anchor="middle"')}
          ${bx(120, 20, 170, 28, '¿Ha corrido IDLE0?', 'var(--ice-soft)')}${bx(120, 64, 80, 28, 'sí: bien', 'var(--ok)', W)}${bx(210, 64, 80, 28, 'no: aviso', 'var(--err)', W)}`) }),
      I('Puedes suscribir tus tareas críticas: si se cuelgan, el sistema se reinicia en vez de quedarse parado.', { code: '#include <esp_task_wdt.h>\n// dentro de la tarea:\nesp_task_wdt_add(NULL);       // vigílame\nfor (;;) {\n  trabajo();\n  esp_task_wdt_reset();       // sigo viva\n  vTaskDelay(pdMS_TO_TICKS(100));\n}' }),
      I('Tras un Guru Meditation aparece un <b>Backtrace</b>: direcciones de la cadena de llamadas. El decodificador de excepciones del IDE (o idf.py monitor) las traduce a archivo y línea. Es lo primero que hay que mirar.', { code: 'Guru Meditation Error: Core 1 panic\'ed (LoadProhibited)\n...\nBacktrace: 0x400d1a2c:0x3ffb1f50 0x400d2b10:0x3ffb1f70' }),
      I('La memoria dinámica también se rompe. ESP.getFreeHeap() da el total libre; heap_caps_get_largest_free_block(MALLOC_CAP_8BIT), el bloque <b>contiguo</b> más grande. Mueve los deslizadores: muchos String que crecen dejan la RAM troceada.', {
        tune: { viz: 'es_heap', params: { n: { label: 'Strings que crecen y se liberan', val: 0, min: 0, max: 60, step: 5, dec: 0 }, res: yn('reserve() al inicio (0 no · 1 sí)', 0) } } }),
      { t: 'steps', text: 'Decodifica el fallo de la tarjeta anterior.', steps: ['LoadProhibited: se leyó en una dirección no válida (a menudo un puntero nulo)', 'Core 1: fallaba algo de loop() o de una tarea del núcleo 1', 'Pega el Backtrace en el decodificador de excepciones (o usa idf.py monitor)', 'Te da archivo y línea: ahí está el puntero que no apunta a nada'], result: 'Primero el tipo de error, luego el backtrace, luego la línea.' },
      Q('El monitor muestra «task_wdt: Task watchdog got triggered … IDLE0».', ['Algo acapara el núcleo 0 sin bloquearse y la tarea IDLE no puede correr', 'El WiFi no conecta', 'Falta memoria', 'Es normal'], 'Busca bucles de espera activa o tareas de alta prioridad que nunca ceden.', { c: 'es_wdt', h: 'IDLE0 es la víctima, no la culpable.' }),
      Q('¿Arreglas ese aviso desactivando el watchdog del núcleo 0?', ['No: tapa el síntoma; añade un bloqueo real (vTaskDelay, una cola) para que corran las demás', 'Sí, es la solución', 'Sí, y además ahorra energía', 'Da igual'], 'El watchdog avisa de un problema de diseño.', { c: 'es_wdt', h: 'Recuerda qué le pasaba a IDLE0 con el watchdog desactivado.' }),
      { t: 'match', q: 'Une cada mensaje con su causa probable.', pairs: [['LoadProhibited', 'Puntero nulo o inválido'], ['Stack canary watchpoint', 'Pila de una tarea desbordada'], ['Task watchdog got triggered', 'Una tarea que no cede la CPU'], ['Brownout detector', 'Caída de alimentación']], c: 'es_crash', h: 'Empieza por los que ya conoces: el brownout y el watchdog.' },
      Q('Quedan 100 KB libres, pero malloc(40 000) falla.', ['Fragmentación: no hay un bloque contiguo tan grande', 'El ESP32 miente', 'Falta PSRAM siempre', 'Es la pila'], 'Muchas reservas y liberaciones de tamaños variados dejan huecos.', { c: 'es_heap', h: 'Total libre no es lo mismo que hueco de una pieza.' }),
      Q('Concatenas String en loop() durante días y al final se cuelga.', ['Fragmentación del heap: reserva al inicio (reserve) o usa búferes fijos', 'La flash se gasta', 'Es el WiFi', 'Es normal'], 'En equipos que funcionan meses, memoria fija siempre que se pueda.', { c: 'es_heap', h: 'Mira qué pasaba con muchos String y sin reserve().' }),
      Q('¿Qué te dice uxTaskGetStackHighWaterMark(tarea)?', ['Lo mínimo que ha llegado a quedar libre en la pila de esa tarea', 'La pila total', 'La prioridad', 'El uso de CPU'], 'Mídelo tras probar los casos más exigentes.', { c: 'es_taskstack', h: 'Es la «marca en la jarra» de la lección anterior.' }),
      RES('El <b>watchdog de tareas</b> avisa si IDLE0 no corre en ~5 s: busca quién no cede la CPU; no lo apagues.', 'Suscribe tus tareas críticas con esp_task_wdt_add y esp_task_wdt_reset.', 'Ante un pánico: tipo de error + <b>backtrace</b> decodificado = archivo y línea.', 'Heap: vigila el <b>bloque contiguo mayor</b>; reserva búferes al inicio.')
    ]),
    SIM('es-s8', 'Reto: dos tareas de FreeRTOS', 'Una tarea hace parpadear un LED sin parar; otra, independiente, conmuta otro LED con el pulsador.', { arduino: 'es_rtos', board: 'esp32', parts: ['push', 'res', 'led'], code: true, hint: 'LED con 150 Ω en el GPIO 25 y otro en el 26. Pulsador entre el GPIO 4 y GND. Fíjate: pulsar no altera el ritmo del parpadeo.' }, 'es_rtos'),
    SIM('es-s9', 'Reto: semáforo con peatón', 'Los coches están en verde hasta que un peatón pulsa. La interrupción anota la petición y loop() hace el ciclo.', { arduino: 'es_peaton', board: 'esp32', parts: ['push', 'res', 'led'], code: true, hint: 'LED en 27 (verde coches), 26 (ámbar), 25 (rojo) y 33 (verde peatón), cada uno con su resistencia a GND. Pulsador entre el GPIO 4 y GND.' }, 'es_peaton'),
    PRJ('es-p6', 'Proyecto: juego de reflejos', 'es_reflex'),
    PRJ('es-p7', 'Proyecto: termostato multitarea', 'es_thermostat')
  ];

  const M5 = [
    L('es21', 'La flash por dentro: particiones', 'memory', ['es_flash', 'es_ota'], [
      Q('Tu placa tiene 4 MB de flash y tu programa ocupa 1,6 MB. ¿Crees que cabrá con la configuración por defecto?', ['No: el hueco para la aplicación es de 1,25 MB', 'Sí, sobra', 'Solo si borras la NVS', 'Depende del WiFi'], 'La flash no es un solo bloque para tu programa: está repartida en cajones. Vamos a verlos.', { predict: true, c: 'es_flash', h: 'La flash se reparte entre varias cosas, no solo tu programa.' }),
      { t: 'explore', text: 'Así se reparte una flash de 4 MB. Cambia el esquema de particiones y el tamaño de tu programa.', viz: 'es_part',
        params: { s: { label: 'Esquema (0 por defecto · 1 Huge APP · 2 Minimal SPIFFS · 3 No OTA)', val: 0, list: [0, 1, 2, 3], dec: 0 }, kb: { label: 'Tu programa', val: 1600, list: [800, 1200, 1600, 2000, 2500, 3200], unit: 'KB', dec: 0 } },
        tasks: [
          { q: 'fitsOta', min: 1, max: 1, text: 'Haz que tu programa de 1,6 MB quepa sin perder la OTA', done: 'Minimal SPIFFS: dos huecos de 1,9 MB a costa del espacio de archivos.', hint: 'Busca un esquema con dos huecos de app más grandes.' },
          { q: 'huge', min: 1, max: 1, text: 'Ahora tu programa crece a 2,5 MB: ¿qué esquema queda?', done: 'Solo Huge APP (3 MB), y renunciando a la OTA.' }] },
      I('La flash empieza con el <b>cargador de arranque</b> (en 0x1000 en el clásico), sigue la <b>tabla de particiones</b> (0x8000) y luego los cajones que ella describe: ajustes, programas y archivos.', {
        svg: SV(110, `${[['boot', 34, '#555'], ['tabla', 34, '#8E6CC9'], ['nvs', 26, '#3E8FCB'], ['app0', 70, '#A66B00'], ['app1', 70, '#C0582A'], ['datos', 60, 'var(--ok)']].reduce((a, [n, w, c]) => { a.s += `<rect x="${a.x}" y="30" width="${w - 2}" height="40" rx="3" fill="${c}"/>` + tx(a.x + (w - 2) / 2, 54, n, 'vizsm', 'text-anchor="middle" fill="#fff"'); a.x += w; return a; }, { s: '', x: 4 }).s}
          ${tx(4, 22, '0x1000', 'vizsm')}${tx(36, 88, '0x8000', 'vizsm')}${tx(150, 104, 'direcciones en hexadecimal', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Esta es, aproximadamente, la tabla por defecto de Arduino-ESP32 para 4 MB. Cada línea: nombre, tipo, subtipo, dónde empieza y cuánto mide.', { code: '# Nombre   Tipo  Subtipo   Desplaz.  Tamaño\nnvs,       data, nvs,      0x9000,   0x5000\notadata,   data, ota,      0xe000,   0x2000\napp0,      app,  ota_0,    0x10000,  0x140000\napp1,      app,  ota_1,    0x150000, 0x140000\nspiffs,    data, spiffs,   0x290000, 0x160000\ncoredump,  data, coredump, 0x3F0000, 0x10000',
        more: 'otadata dice qué aplicación debe arrancar. coredump guarda el estado del programa tras un pánico, para analizarlo después. La partición de archivos se sigue llamando «spiffs» aunque hoy se use LittleFS.' }),
      I('Hay dos huecos de aplicación (app0 y app1) para poder <b>actualizar</b>: la versión nueva se escribe en el hueco que no está en uso, y la que funciona no se toca. Lo verás a fondo en la lección de OTA.', {
        svg: SV(110, `${bx(20, 30, 110, 44, 'app0: en uso', 'var(--led)', W)}${bx(170, 30, 110, 44, 'app1: libre')}${ar(225, 14, 225, 30, 'var(--ok)', 'class="a-bob"')}${tx(225, 12, 'nueva versión', 'vizsm', 'text-anchor="middle"')}${tx(150, 96, 'la que funciona sigue intacta', 'vizsm', 'text-anchor="middle"')}`) }),
      { t: 'steps', text: 'app0 mide 0x140000 bytes. ¿Cuántos KB son?', steps: ['En hexadecimal, cada cifra vale 16 veces la de su derecha', '0x140000 = 1 × 16⁵ + 4 × 16⁴ = 1 048 576 + 262 144', '= 1 310 720 bytes', 'Entre 1024: <b>1280 KB</b> (1,25 MB)'], result: '1280 KB' },
      { t: 'match', q: 'Une cada partición con su papel.', pairs: [['nvs', 'Ajustes clave-valor'], ['otadata', 'Qué app debe arrancar'], ['app0 / app1', 'Dos huecos para programas'], ['spiffs', 'Archivos (LittleFS o SPIFFS)']], c: 'es_flash', h: 'Mira el comentario de cada línea de la tabla.' },
      Nm('La partición spiffs mide 0x160000 bytes. ¿Cuántos KB son?', 1408, 'KB', '0x160000 = 1 441 792 bytes; entre 1024, 1408 KB.', { tol: 0.5, c: 'es_flash', h: 'Pasa el hexadecimal a decimal (1 × 16⁵ + 6 × 16⁴) y divide entre 1024.' }),
      Q('Tu programa ocupa 1,6 MB y el IDE dice «Sketch too big».', ['Elige un esquema de particiones con app más grande o reduce el programa', 'Compra otra placa', 'Borra la NVS', 'Sube la frecuencia'], 'Menú Herramientas → Partition Scheme.', { c: 'es_flash', h: 'Lo resolviste en la exploración.' }),
      Q('¿Para qué hay dos particiones de aplicación?', ['Para OTA: la nueva versión se escribe en la que no está en uso', 'Para dos programas a la vez', 'Para los dos núcleos', 'Copia de seguridad diaria'], 'Así la versión que funciona nunca se toca durante la descarga.', { c: 'es_ota', h: '¿Qué pasaría si escribieras encima del programa que se está ejecutando?' }),
      Q('Tu placa tiene 16 MB de flash, pero el IDE solo usa 4 MB.', ['Elige el tamaño de flash correcto y un esquema que lo aproveche', 'No se puede', 'Es automático siempre', 'Hay que soldar otra flash'], 'El tamaño de flash también se configura.', { c: 'es_flash', h: 'El IDE no adivina la flash: se lo dices tú.' }),
      Q('La partición coredump sirve para…', ['Guardar el estado tras un pánico y analizarlo después', 'Guardar fotos', 'Acelerar el arranque', 'El WiFi'], 'Muy útil en equipos instalados lejos.', { c: 'es_flash', h: 'Core dump: volcado de memoria.' }),
      Q('Al arrancar, ¿dónde mira el cargador qué aplicación debe ejecutar?', ['En la partición otadata', 'En la NVS', 'En la ROM', 'En spiffs'], 'otadata apunta a app0 o a app1.', { c: 'es_ota', h: 'Una partición pequeña con «ota» en el nombre.' }),
      RES('Flash: cargador (0x1000), tabla (0x8000) y particiones: <b>nvs, otadata, app0, app1, spiffs, coredump</b>.', 'Si no cabe, cambia el <b>esquema de particiones</b> (más app = menos archivos o sin OTA).', 'Dos huecos de app permiten actualizar sin tocar la versión que funciona.', 'Tamaños en hex: pásalos a decimal y divide entre 1024.')
    ]),
    L('es22', 'NVS y Preferences: guardar ajustes', 'memory', ['es_nvs', 'es_wear', 'es_persist'], [
      Q('Guardas el volumen en la flash cada vez que giras el mando, unas 10 veces por segundo. ¿Qué crees que pasará?', ['Desgastarás la flash mucho antes de tiempo', 'Nada, la flash es eterna', 'Irá más rápido', 'Se borrará el programa'], 'La flash aguanta un número limitado de borrados. Calcula cuánto.', { predict: true, c: 'es_wear', h: 'La flash aguanta un número limitado de borrados.' }),
      { t: 'explore', text: 'Cada sector de flash aguanta unos 100 000 borrados. Elige cuántas veces por hora borras y entre cuántos sectores se reparte.', viz: 'es_wear',
        params: { w: { label: 'Borrados por hora', val: 6, list: [1, 6, 60, 600, 3600, 36000], dec: 0 }, sec: { label: 'Sectores entre los que se reparten', val: 1, list: [1, 4, 10, 100], dec: 0 } },
        tasks: [
          { q: 'dead', min: 1, max: 1, text: 'Sube los borrados hasta que no dure ni un año', done: 'Un borrado por minuto en el mismo sector: unos 69 días.', hint: 'Sube los borrados por hora.' },
          { q: 'ten', min: 1, max: 1, text: 'Ahora consigue más de 10 años', done: 'Escribir menos rinde más que cualquier truco; repartir entre sectores multiplica la vida.' }] },
      I('<b>NVS</b> (Non-Volatile Storage) es un almacén clave-valor en la flash, organizado en espacios de nombres. Aguanta cortes de luz a mitad de escritura y reparte el desgaste. En Arduino se usa con la clase <b>Preferences</b>.', {
        svg: SV(120, `${bx(10, 14, 130, 96, '', 'var(--ice-soft)')}${tx(20, 32, 'espacio "app"', 'vizlab')}${bx(20, 42, 110, 26, 'arranques = 7')}${bx(20, 76, 110, 26, 'volumen = 12')}${bx(160, 14, 130, 96, '', 'var(--ice-soft)')}${tx(170, 32, 'espacio "wifi"', 'vizlab')}${bx(170, 42, 110, 26, 'ssid = "Casa"')}${bx(170, 76, 110, 26, 'clave = "…"')}`) }),
      I('Un contador de arranques con Preferences:', { code: '#include <Preferences.h>\nPreferences prefs;\n\nvoid setup() {\n  Serial.begin(115200);\n  prefs.begin("app", false);              // espacio "app", lectura y escritura\n  uint32_t n = prefs.getUInt("arranques", 0) + 1;\n  prefs.putUInt("arranques", n);\n  prefs.end();\n  Serial.printf("Arranque número %u\\n", n);\n}',
        more: 'El segundo argumento de getUInt es el valor que devuelve si la clave no existe. Claves y espacios de nombres: 15 caracteres como máximo. Para estructuras completas, putBytes y getBytes (y guarda una versión, por si cambias la estructura).' }),
      I('La flash se borra por <b>sectores de 4 KB</b> y cada uno aguanta del orden de <b>100 000 borrados</b>. NVS reparte, pero tú decides cuánto escribes: guarda cuando el valor lleve un rato estable, no en cada cambio.', {
        svg: SV(110, `${Array.from({ length: 24 }, (_, i) => `<rect x="${10 + (i % 12) * 23}" y="${20 + Math.floor(i / 12) * 30}" width="20" height="24" rx="2" fill="${i === 5 ? 'var(--err)' : 'var(--ice-soft)'}" stroke="currentColor" ${i === 5 ? 'class="a-pulse"' : ''}/>`).join('')}${tx(150, 98, 'escribir siempre en el mismo sector lo agota', 'vizsm', 'text-anchor="middle"')}`) }),
      { t: 'steps', text: 'Grabas el contador de arranques y pulsas EN dos veces. ¿Qué imprime cada arranque?', steps: ['Primer arranque: la clave no existe, getUInt devuelve 0; suma 1 y guarda 1', 'Primer EN: lee 1, guarda 2', 'Segundo EN: lee 2, guarda 3', 'Imprime 1, luego 2 y luego 3'], result: 'NVS sobrevive a reinicios y cortes de luz.' },
      Q('Grabas el programa, arranca, y luego pulsas EN tres veces. ¿Qué número imprime el último arranque?', ['4', '3', '1', '0'], 'El primer arranque guarda 1; cada reinicio suma uno.', { c: 'es_nvs', h: 'Cuenta todos los arranques, incluido el primero.' }),
      Q('¿Qué devuelve getUInt("arranques", 0) la primera vez?', ['0: el valor por defecto, porque la clave no existe', 'Un error', 'Un número al azar', '1'], 'El segundo argumento es el valor si no existe.', { c: 'es_nvs', h: '¿Para qué sirve el segundo argumento?' }),
      Q('prefs.putUInt("contador_de_arranques_total", n) no guarda nada.', ['La clave pasa de 15 caracteres, el máximo de NVS', 'Falta memoria', 'Hay que reiniciar antes', 'No admite números'], 'Espacios de nombres y claves: 15 caracteres como máximo.', { c: 'es_nvs', h: 'Cuenta las letras de la clave.' }),
      Nm('Si borraras el mismo sector una vez por minuto, ¿cuántos días aguantaría (100 000 ciclos)?', 69.4, 'días', '100 000 / 1440 minutos al día ≈ 69 días.', { tol: 0.5, c: 'es_wear', h: 'Divide los ciclos entre los borrados que hay en un día.' }),
      Q('Guardas en NVS el volumen cada vez que giras el mando (decenas de veces por segundo). ¿Mejor idea?', ['Guardar solo cuando lleve unos segundos sin cambiar', 'Está perfecto', 'Guardar cada milisegundo', 'Guardar en la partición app0'], 'Ahorras escrituras y la flash dura años.', { c: 'es_wear', h: 'Solo importa el valor final.' }),
      Q('¿Cómo guardas una estructura de calibración completa?', ['Con putBytes y su tamaño, y la lees con getBytes', 'Campo a campo como String', 'No se puede', 'Con Serial'], 'Si cambias la estructura, guarda también una versión para no leer basura.', { c: 'es_nvs', h: 'Hay funciones que guardan bytes en bruto.' }),
      { t: 'match', q: 'Une cada función de Preferences.', pairs: [['begin("ns", true)', 'Abrir solo para lectura'], ['remove("clave")', 'Borrar una clave'], ['clear()', 'Borrar todo el espacio de nombres'], ['isKey("clave")', 'Saber si existe']], c: 'es_nvs', h: 'El true de begin es «solo lectura».' },
      Q('Tras grabar otro programa, ¿siguen los datos de NVS?', ['Sí: subir un programa no borra la NVS (salvo que borres toda la flash)', 'No, nunca', 'Solo los números', 'Solo el mismo día'], 'Por eso una calibración sobrevive a las actualizaciones.', { c: 'es_persist', h: '¿Qué partición se reescribe al subir un programa?' }),
      RES('<b>NVS</b> con Preferences: pares clave-valor en espacios de nombres; claves de 15 caracteres como máximo.', 'getX(clave, defecto) devuelve el defecto si no existe; putBytes para estructuras.', 'Sectores de 4 KB y ~100 000 borrados: <b>escribe solo cuando haga falta</b>.', 'Subir un programa no borra la NVS.')
    ]),
    L('es23', 'LittleFS: archivos en la flash', 'memory', ['es_lfs', 'es_persist'], [
      Q('Tu registrador escribe una línea y se va la luz justo después, sin haber cerrado el archivo. ¿Qué crees que pasa con esa línea?', ['Puede perderse: aún estaba en un búfer de RAM', 'Está a salvo seguro', 'Se borra todo el archivo', 'Se duplica'], 'Escribir no siempre significa que ya esté en la flash. Antes, veamos cuánto cabe.', { predict: true, c: 'es_lfs', h: 'Escribir no siempre significa que ya esté en la flash.' }),
      { t: 'explore', text: 'Un registrador guarda líneas en la partición de datos. Elige su tamaño, cuánto ocupa cada línea y cada cuánto escribes.', viz: 'es_lfs',
        params: { kb: { label: 'Partición de datos', val: 1408, list: [128, 192, 896, 1408, 1984], unit: 'KB', dec: 0 }, b: { label: 'Bytes por línea', val: 64, list: [16, 32, 64, 128], dec: 0 }, cada: { label: 'Una línea cada', val: 1, list: [1, 5, 10, 30, 60], unit: 'min', dec: 0 } },
        tasks: [
          { q: 'month', min: 1, max: 1, text: 'Que dure al menos un mes', done: 'Bytes al día = bytes por línea × líneas al día: baja una de las dos.', hint: 'Escribe menos a menudo o líneas más cortas.' },
          { q: 'year', min: 1, max: 1, text: 'Ahora más de un año', done: 'Guardar resúmenes (una media cada media hora) en vez de cada lectura alarga muchísimo.' }] },
      I('<b>LittleFS</b> es un sistema de archivos pensado para flash: carpetas, resistencia a cortes y reparto del desgaste. Sustituye a SPIFFS, que está obsoleto, y usa la partición de datos.', {
        svg: SV(110, `<path d="M20 30h50l10 10h80v60H20z" fill="var(--ice-soft)" stroke="currentColor"/>${tx(30, 62, '/datos.csv', 'vizsm')}${tx(30, 80, '/www/index.html', 'vizsm')}${tx(200, 50, 'archivos', 'vizlab')}${tx(200, 70, 'en la partición', 'vizsm')}${tx(200, 86, '«spiffs»', 'vizsm')}`) }),
      I('Abrir, añadir y cerrar. Lo escrito va primero a un <b>búfer en RAM</b>: hasta close() o flush() no está en la flash.', { code: '#include <LittleFS.h>\n\nLittleFS.begin(true);    // true: formatea si no puede montar\nFile f = LittleFS.open("/datos.csv", FILE_APPEND);\nf.println("12,21.5,48");\nf.close();               // ahora sí está en la flash' }),
      I('LittleFS es para unos pocos MB sin hardware extra: registros, configuración, páginas web. Para gigas (fotos durante semanas), una <b>microSD</b>, que además se lee en el ordenador.', {
        svg: SV(110, `${bx(20, 20, 110, 60, '', 'var(--ice-soft)')}${tx(75, 44, 'LittleFS', 'vizlab', 'text-anchor="middle"')}${tx(75, 64, 'unos MB, sin piezas', 'vizsm', 'text-anchor="middle"')}${bx(170, 20, 110, 60, '', 'var(--ice-soft)')}${tx(225, 44, 'microSD', 'vizlab', 'text-anchor="middle"')}${tx(225, 64, 'gigas, extraíble', 'vizsm', 'text-anchor="middle"')}`),
        more: 'Las páginas web de tus proyectos (HTML, CSS, JS) también viven en LittleFS. Se suben desde el ordenador con la herramienta de subida de archivos del IDE, o creando la imagen con mklittlefs y grabándola con esptool.' }),
      { t: 'steps', text: 'Partición de 1 500 000 bytes; escribes una línea de 32 bytes por minuto. ¿Cuántos días hasta llenarla?', steps: ['Líneas al día: 60 × 24 = 1440', 'Bytes al día: 32 × 1440 = 46 080', 'Días = 1 500 000 / 46 080', '<b>≈ 32,6 días</b>'], result: 'Un mes, más o menos' },
      Q('¿Qué hace LittleFS.begin(true) si la partición no tiene un sistema de archivos válido?', ['La formatea (se pierde lo que hubiera)', 'Se niega y ya está', 'Reinicia el chip', 'Borra el programa'], 'Cómodo la primera vez; peligroso si había datos que querías.', { c: 'es_persist', h: 'Lo dice el comentario del código.' }),
      Q('¿Diferencia entre abrir con FILE_WRITE y con FILE_APPEND?', ['FILE_WRITE empieza el archivo de cero; FILE_APPEND añade al final', 'Ninguna', 'FILE_APPEND borra', 'FILE_WRITE solo lee'], 'Un registrador siempre añade.', { c: 'es_lfs', h: 'Append: añadir.' }),
      Q('Escribes líneas pero no llamas a close() y se va la luz.', ['Lo que estaba en el búfer de RAM se pierde', 'No pasa nada nunca', 'Se borra todo el sistema de archivos', 'Se guarda doble'], 'close() o flush() mandan los datos a la flash.', { c: 'es_lfs', h: '¿Dónde estaba lo escrito antes de close()?' }),
      Nm('Quedan 1 000 000 bytes; escribes 50 bytes cada 5 minutos. ¿Días hasta llenar?', 69.4, 'días', '288 líneas al día × 50 = 14 400 bytes al día; 1 000 000 / 14 400 ≈ 69,4 días.', { tol: 0.5, c: 'es_lfs', h: 'Primero cuántas líneas caben en un día (1440 minutos).' }),
      Q('¿microSD o LittleFS para guardar fotos durante semanas?', ['microSD: gigas, y la sacas para leerla en el PC', 'LittleFS siempre', 'NVS', 'La RAM'], 'LittleFS es para unos pocos MB.', { c: 'es_lfs', h: 'Compara los tamaños.' }),
      Q('LittleFS.totalBytes() − LittleFS.usedBytes() te da…', ['El espacio libre aproximado', 'El tamaño de la app', 'La RAM libre', 'El número de archivos'], 'Úsalo para decidir cuándo borrar archivos viejos.', { c: 'es_lfs', h: 'Total menos usado.' }),
      Q('Subes otra versión del programa desde el IDE. ¿Qué pasa con tus archivos de LittleFS?', ['Siguen ahí: subir un programa no toca la partición de datos', 'Se borran', 'Se mueven a la NVS', 'Se cifran'], 'Solo se reescriben el cargador, la tabla y la app.', { c: 'es_persist', h: '¿Qué partición cambia al subir un programa?' }),
      RES('<b>LittleFS</b>: archivos y carpetas en la partición de datos, resistente a cortes.', '<b>FILE_APPEND</b> añade; FILE_WRITE empieza de cero; close() o flush() llevan los datos a la flash.', 'Capacidad: días = espacio / bytes al día. Para gigas, microSD.', 'begin(true) formatea si no puede montar; subir un programa no borra los archivos.')
    ]),
    L('es24', 'Arranque, OTA y seguridad', 'shield', ['es_ota', 'es_secure', 'es_persist'], [
      Q('Actualizas por WiFi el firmware de un equipo y se va la luz a mitad de la descarga. ¿Qué crees que pasará al volver?', ['Arranca la versión anterior, intacta', 'La placa queda inservible', 'Arranca media versión', 'Se borra la NVS'], 'Para eso hay dos huecos de aplicación. Simúlalo.', { predict: true, c: 'es_ota', h: 'Piensa en para qué servían los dos huecos de aplicación.' }),
      { t: 'explore', text: 'Una actualización OTA: la versión 2 se descarga en app1 mientras corre la 1. Decide hasta dónde llega, si se marca en otadata, si se valida y si hay rollback.', viz: 'es_ota',
        params: { prog: { label: 'Descargado antes del corte', val: 50, list: [0, 25, 50, 75, 100], unit: '%', dec: 0 }, mark: yn('otadata actualizada (0 no · 1 sí)', 0), valid: yn('La nueva se declara válida (0 no · 1 sí)', 0), rb: yn('Rollback (0 no · 1 sí)', 0) },
        tasks: [
          { q: 'newOk', min: 1, max: 1, text: 'Completa la actualización: que arranque la versión 2', done: 'Descarga completa, otadata marcada y versión declarada válida.', hint: 'Todo al máximo.' },
          { q: 'rolled', min: 1, max: 1, text: 'Activa el rollback y deja la nueva sin validar', done: 'Vuelve sola a la versión 1: la 2 no demostró que funciona.' }] },
      I('Cómo arranca el ESP32: la <b>ROM</b> de fábrica lee el <b>cargador</b> de la flash; el cargador lee la tabla de particiones y otadata, y salta a la <b>aplicación</b> elegida.', {
        svg: SV(100, `${bx(6, 30, 66, 36, 'ROM', '#555', W)}${ar(72, 48, 84, 48)}${bx(84, 30, 66, 36, 'cargador')}${ar(150, 48, 162, 48)}${bx(162, 30, 66, 36, 'otadata')}${ar(228, 48, 240, 48)}${bx(240, 30, 54, 36, 'app', 'var(--led)', W)}${tx(150, 90, 'cada paso elige el siguiente', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Una <b>OTA</b>: se recibe el .bin por la red, se escribe en la partición de app que no está en uso, se comprueba y se marca en otadata. Al reiniciar, arranca la nueva. Si se corta antes de marcarla, sigue arrancando la anterior.', {
        svg: SV(110, `${bx(10, 20, 120, 40, 'app0: v1 (corre)', 'var(--led)', W)}${bx(170, 20, 120, 40, 'app1: v2')}<rect x="170" y="66" width="120" height="8" fill="var(--line)"/><rect x="170" y="66" width="80" height="8" fill="var(--ok)" class="a-draw" style="--len:80"/>${tx(230, 92, 'descargando…', 'vizsm', 'text-anchor="middle"')}${tx(70, 82, 'intacta', 'vizsm', 'text-anchor="middle"')}`) }),
      I('<b>Rollback</b>: la versión nueva arranca «a prueba». Si no se declara válida (esp_ota_mark_app_valid_cancel_rollback) y se reinicia, el cargador vuelve a la anterior. Hay que activarlo en la configuración del cargador (ESP-IDF); en el núcleo Arduino precompilado puede no estar activo.', {
        svg: SV(100, `${bx(10, 30, 80, 36, 'v2 a prueba', '#D9A21B', W)}${ar(90, 40, 130, 24, 'var(--ok)')}${ar(90, 56, 130, 72, 'var(--err)')}${bx(130, 8, 160, 30, 'funciona → válida', 'var(--ok)', W)}${bx(130, 58, 160, 30, 'se cuelga → vuelve a v1', 'var(--err)', W)}`) }),
      I('<b>Secure Boot</b>: el chip solo arranca firmware firmado con tu clave. <b>Cifrado de flash</b>: quien lea la flash no ve tu código ni tus contraseñas. Ambos se activan grabando <b>eFuses</b>, que solo se escriben una vez: es <b>irreversible</b>. Prueba en placas de desarrollo y guarda bien las claves.', {
        svg: SV(110, `<rect x="120" y="44" width="60" height="50" rx="6" fill="var(--led)"/><path d="M132 44V30a18 18 0 0 1 36 0V44" fill="none" stroke="currentColor" stroke-width="5"/>${tx(150, 76, 'eFuse', 'vizsm', 'text-anchor="middle" fill="#fff"')}${tx(20, 40, 'firma', 'vizlab')}${tx(20, 60, 'cifrado', 'vizlab')}${tx(200, 50, 'una sola vez', 'vizlab')}${tx(200, 70, 'sin vuelta atrás', 'vizsm')}`) }),
      { t: 'steps', text: 'Una OTA con rollback activo; la versión nueva no consigue conectar al WiFi. ¿Qué pasa?', steps: ['Se descarga en app1, se comprueba y se marca en otadata', 'Reinicia: el cargador arranca la v2 «a prueba»', 'La v2 no conecta y no llama a esp_ota_mark_app_valid_cancel_rollback()', 'Se reinicia (por el watchdog o a propósito): el cargador vuelve a la v1'], result: 'El equipo vuelve solo a la versión que funcionaba.' },
      { t: 'order', q: 'Ordena una actualización OTA.', items: ['La app recibe el nuevo .bin por la red', 'Lo escribe en la partición de app que no está en uso', 'Comprueba la imagen y marca otadata para arrancarla', 'Se reinicia y el cargador arranca la nueva versión'], e: 'Si se corta antes del paso 3, sigue arrancando la anterior.', c: 'es_ota', h: 'No se puede marcar lo que no está entero.' },
      Q('¿Cuándo debe una versión nueva declararse válida?', ['Cuando ha comprobado que funciona: WiFi conectado, sensores respondiendo…', 'Nada más arrancar', 'Nunca', 'Antes de descargarla'], 'Si se cuelga antes, vuelve sola a la anterior.', { c: 'es_ota', h: 'Si se declara válida demasiado pronto, el rollback no sirve.' }),
      Q('¿Qué te protege el cifrado de flash?', ['Que alguien que vuelque la flash lea tu firmware y tus contraseñas WiFi', 'Que te ataquen por WiFi', 'Que se gaste la flash', 'Que se corte la luz'], 'Contra el ataque por red están las contraseñas, TLS y la firma.', { c: 'es_secure', h: 'Piensa en alguien con la placa en la mano.' }),
      Q('Los eFuses son…', ['Bits que solo se graban una vez: un error puede inutilizar el chip', 'Fusibles de corriente', 'Una partición', 'Un tipo de RAM'], 'Guardan la MAC, calibraciones y ajustes de seguridad.', { c: 'es_secure', h: 'Fuse: fusible que, una vez fundido, no vuelve.' }),
      Q('ArduinoOTA sin contraseña en tu red doméstica:', ['Cualquiera en tu red podría subirte firmware: pon contraseña (y, mejor, firma)', 'Es seguro siempre', 'No funciona sin contraseña', 'Solo afecta al WiFi'], 'La OTA es una puerta: ciérrala.', { c: 'es_secure', h: '¿Quién más está en tu red?' }),
      Q('¿Qué hace esptool erase_flash?', ['Borra toda la flash: programa, NVS y archivos', 'Borra solo el programa', 'Borra los eFuses', 'Borra la ROM'], 'Útil para empezar de cero; los eFuses y la ROM no se tocan.', { c: 'es_persist', h: 'Erase flash: la flash entera.' }),
      RES('Arranque: ROM → cargador → otadata → app.', 'OTA: escribe en el hueco libre, comprueba y marca; un corte antes deja la versión anterior.', '<b>Rollback</b>: la nueva arranca a prueba y debe declararse válida cuando funcione.', 'Secure Boot y cifrado se graban en <b>eFuses</b>: irreversibles. Y la OTA, siempre con contraseña.')
    ]),
    PRJ('es-p8', 'Proyecto: cerradura de código con memoria', 'es_lock'),
    PRJ('es-p9', 'Proyecto: registrador de datos en LittleFS', 'es_logger')
  ];

  const M6 = [
    L('es25', 'Modos WiFi y conexión robusta', 'wifi', ['es_wifi', 'es_wifirobust', 'es_rf'], [
      Q('Tu ESP32 arranca con while (WiFi.status() != WL_CONNECTED) delay(100); y el router está apagado. ¿Qué crees que hará?', ['Quedarse esperando para siempre sin hacer nada más', 'Seguir sin red a los 15 s', 'Crear su propia red', 'Reiniciarse'], 'Ese bucle solo sale si conecta. Hay formas mejores de esperar.', { predict: true, c: 'es_wifirobust', h: 'Lee la condición del while: ¿cuándo deja de cumplirse?' }),
      { t: 'explore', text: 'El router se apaga un rato. Compara tres formas de esperar el WiFi y mira cuánto tiempo se queda parado tu programa (medir, mostrar, controlar).', viz: 'es_reconnect',
        params: { off: { label: 'Router apagado', val: 60, list: [10, 30, 60, 120], unit: 's', dec: 0 }, to: { label: 'Límite de espera (0 = sin límite)', val: 0, list: [0, 5, 10, 15, 30], unit: 's', dec: 0 }, ev: yn('Forma (0 bucle · 1 eventos)', 0) },
        tasks: [
          { q: 'ok15', min: 1, max: 1, text: 'Que el programa no quede bloqueado más de 15 s', done: 'Un límite de tiempo y un plan B: seguir sin red y reintentar luego.', hint: 'Pon un límite de espera.' },
          { q: 'zero', min: 1, max: 1, text: 'Que no se bloquee nada', done: 'Con eventos, el WiFi te avisa y tu programa sigue trabajando.' }] },
      I('Tres modos:\n· <b>STA</b> (estación): te unes a un router, como un móvil.\n· <b>AP</b>: el ESP32 crea su propia red (por defecto, en la dirección 192.168.4.1).\n· <b>STA+AP</b>: las dos cosas con una sola radio, y por tanto en el mismo canal.\nEl clásico solo usa <b>2,4 GHz</b>.', {
        svg: SV(120, `<circle cx="150" cy="56" r="26" fill="var(--led)"/>${tx(150, 60, 'ESP32', 'vizsm', 'text-anchor="middle" fill="#fff"')}${bx(10, 36, 80, 40, 'router')}${bx(210, 36, 80, 40, 'tu móvil')}${ar(124, 56, 92, 56)}${ar(176, 56, 208, 56)}
          ${tx(108, 46, 'STA', 'vizsm', 'text-anchor="middle"')}${tx(192, 46, 'AP', 'vizsm', 'text-anchor="middle"')}${tx(150, 104, 'una radio, un canal', 'vizsm', 'text-anchor="middle"')}`),
        code: 'WiFi.softAP("MiESP32", "clave1234");\nSerial.println(WiFi.softAPIP());   // 192.168.4.1' }),
      I('Conectar siempre con un <b>tiempo límite</b> y un plan B:', { code: 'WiFi.mode(WIFI_STA);\nWiFi.begin(ssid, clave);\nuint32_t t0 = millis();\nwhile (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) delay(100);\nif (WiFi.status() != WL_CONNECTED) {\n  // plan B: seguir sin red, reintentar luego, abrir un portal...\n}' }),
      I('Mejor aún, los <b>eventos</b>: el sistema te avisa de la IP obtenida o de la desconexión (con su motivo), sin preguntar en un bucle. En la desconexión puedes reintentar con esperas crecientes mientras el resto sigue.', { code: 'WiFi.onEvent([](WiFiEvent_t e, WiFiEventInfo_t info) {\n  if (e == ARDUINO_EVENT_WIFI_STA_GOT_IP) Serial.println(WiFi.localIP());\n  if (e == ARDUINO_EVENT_WIFI_STA_DISCONNECTED)\n    Serial.printf("Caída, motivo %d\\n", info.wifi_sta_disconnected.reason);\n});',
        more: '[](…) { … } es una función sin nombre (una lambda): se la pasas a onEvent para que la llame cuando ocurra algo.' }),
      I('<b>WiFi.RSSI()</b> da la señal recibida en dBm (siempre negativa): cuanto más cerca de 0, mejor. Por encima de unos −67 dBm va bien; por debajo de −80, sufre y pierde paquetes.', {
        svg: SV(100, `<defs><linearGradient id="esrs" x1="0" x2="1"><stop offset="0" stop-color="#2ECC71"/><stop offset=".55" stop-color="#D9A21B"/><stop offset="1" stop-color="#E5484D"/></linearGradient></defs><rect x="20" y="30" width="260" height="18" rx="6" fill="url(#esrs)"/>
          ${[['−30', 20], ['−67', 140], ['−80', 190], ['−90', 270]].map(([t, x]) => `<path d="M${x} 26V52" stroke="currentColor"/>` + tx(x, 68, t + ' dBm', 'vizsm', 'text-anchor="middle"')).join('')}${tx(80, 22, 'bien', 'vizsm')}${tx(230, 22, 'sufre', 'vizsm')}`) }),
      { t: 'steps', text: 'Tu ESP32 está en STA+AP y el router cambia del canal 1 al 11. ¿Qué le pasa a tu AP?', steps: ['Solo hay una radio, y solo puede estar en un canal', 'La parte STA tiene que seguir al router: canal 11', 'El AP se va también al 11', 'Sus clientes pueden desconectarse un momento'], result: 'El AP sigue siempre el canal del router.' },
      { t: 'match', q: 'Une cada situación con el modo adecuado.', pairs: [['Sensor que manda datos a casa', 'STA'], ['Aparato sin router en el campo', 'AP'], ['Configurar por primera vez y luego conectar', 'AP y después STA'], ['Puente entre tu red y otra pequeña', 'STA+AP']], c: 'es_wifi', h: 'STA se une a una red; AP crea la suya.' },
      Q('¿Qué pasa con este código si el router está apagado?', ['Se queda en el bucle para siempre', 'Sigue a los 15 s', 'Se reinicia', 'Crea un AP'], 'Siempre con tiempo límite.', { code: 'WiFi.begin(ssid, clave);\nwhile (WiFi.status() != WL_CONNECTED) delay(100);', c: 'es_wifirobust', h: 'Busca en la condición algo que mida el tiempo.' }),
      Q('¿Qué ventaja tienen los eventos frente a preguntar WiFi.status() en un bucle?', ['El resto del programa sigue y te enteras al momento de cada cambio', 'Gastan más CPU', 'Conectan más rápido siempre', 'Ninguna'], 'El sistema te avisa.', { c: 'es_wifirobust', h: 'Recuerda la barra roja de la exploración.' }),
      Q('Tu router solo emite en 5 GHz.', ['El ESP32 clásico no lo verá: activa la banda de 2,4 GHz', 'Funciona igual', 'Va más rápido', 'Solo falla de noche'], 'Algunos chips nuevos sí trabajan en 5 GHz, pero el clásico no.', { c: 'es_wifi', h: '¿En qué banda trabaja el clásico?' }),
      Q('¿En qué dirección suele estar el ESP32 cuando crea su propia red?', ['192.168.4.1', '192.168.1.1', '127.0.0.1', '10.0.0.1'], 'Es la dirección por defecto del modo AP.', { code: 'WiFi.softAP("MiESP32", "clave1234");\nSerial.println(WiFi.softAPIP());', c: 'es_wifi', h: 'Lo imprimía el código de la tarjeta de los modos.' }),
      Q('WiFi.RSSI() devuelve −85 dBm.', ['Señal muy débil: acércalo, cambia la orientación o usa antena externa', 'Señal excelente', 'Se está quemando', 'Es la temperatura'], 'Por debajo de −80 dBm el enlace sufre.', { c: 'es_rf', h: 'Mira la escala de colores del RSSI.' }),
      RES('Modos: <b>STA</b> (te unes), <b>AP</b> (creas tu red) y STA+AP (una radio, un canal). Solo 2,4 GHz en el clásico.', 'Conecta siempre con <b>tiempo límite</b> y plan B; mejor aún, con <b>eventos</b>.', 'RSSI: por encima de −67 dBm bien; por debajo de −80 dBm, problemas.')
    ]),
    L('es26', 'Potencia, consumo y antena', 'antenna', ['es_dbmw', 'es_eirp', 'es_rf', 'es_sleep', 'es_awake'], [
      Q('Pones una antena de mucha ganancia y subes el ESP32 a su potencia máxima para llegar más lejos. ¿Qué problema puede haber?', ['Pasarte del límite legal de potencia radiada', 'Ninguno', 'Que el WiFi vaya más lento', 'Que el ESP32 se enfríe'], 'En Europa hay un límite para lo que sale por la antena, no solo para lo que da el chip.', { predict: true, c: 'es_eirp', h: 'El límite legal cuenta lo que sale de la antena.' }),
      { t: 'explore', text: 'Un ESP32 y un router separados por paredes. Ajusta la potencia, la antena, las paredes y la distancia (modelo de interior orientativo).', viz: 'es_wifi',
        params: { p: { label: 'Potencia del ESP32', val: 8.5, list: [2, 5, 8.5, 11, 13, 15, 17, 18.5, 19.5], unit: 'dBm', dec: 1 }, g: { label: 'Ganancia de la antena', val: 2, list: [0, 2, 5, 8], unit: 'dBi', dec: 0 }, w: { label: 'Paredes', val: 2, min: 0, max: 4, step: 1, dec: 0 }, d: { label: 'Distancia', val: 30, list: [1, 3, 5, 10, 20, 30, 50, 100], unit: 'm', dec: 0 } },
        tasks: [
          { q: 'legal', min: 0, max: 0, text: 'Sube potencia y antena hasta salirte de lo legal', done: 'Potencia + ganancia por encima de 20 dBm: ilegal en Europa.', hint: 'Potencia alta y antena de 8 dBi.' },
          { q: 'far', min: 1, max: 1, text: 'A 30 m y con 2 paredes, consigue buena señal (−67 dBm o más) sin salirte de la ley', done: 'Hay que exprimir los 20 dBm de PIRE: potencia alta con antena modesta, o al revés.', hint: 'Deja la PIRE en 18–20 dBm.' }] },
      I('Los <b>dBm</b> comparan una potencia con 1 mW: <b>P(mW) = 10^(dBm / 10)</b>. 0 dBm = 1 mW; 10 dBm = 10 mW; 20 dBm = 100 mW. Cada +10 dB, ×10; cada +3 dB, casi el doble.', {
        svg: SV(120, `${[[0, '1 mW'], [3, '2 mW'], [10, '10 mW'], [13, '20 mW'], [20, '100 mW']].map(([d, w], i) => `<rect x="${14 + i * 56}" y="${100 - (i + 1) * 16}" width="46" height="${(i + 1) * 16}" fill="var(--led)" opacity="${0.4 + i * 0.12}"/>` + tx(37 + i * 56, 114, d + ' dBm', 'vizsm', 'text-anchor="middle"') + tx(37 + i * 56, 94 - (i + 1) * 16, w, 'vizsm', 'text-anchor="middle"')).join('')}`),
        more: 'Los dB son una escala logarítmica: sumar dB es multiplicar potencias. Por eso 20 dBm no es «el doble» de 10 dBm, sino diez veces más.' }),
      I('El ESP32 transmite con hasta unos 20 dBm (100 mW). Se puede bajar con WiFi.setTxPower: menos picos de corriente y menos consumo, a cambio de alcance. Y el <b>modem sleep</b> (activo por defecto en STA) duerme la radio entre balizas del router: ahorra, pero añade retrasos.', { code: 'WiFi.setTxPower(WIFI_POWER_8_5dBm);   // menos potencia\nWiFi.setSleep(false);                  // sin modem sleep: menos retraso, más consumo' }),
      I('En Europa, el WiFi de 2,4 GHz no puede pasar de <b>20 dBm de PIRE</b>: potencia del transmisor más ganancia de la antena. La antena del módulo es una pista en el borde: nada de metal ni baterías alrededor. Los módulos «-U» traen conector para antena externa.', {
        svg: SV(120, `${bx(10, 40, 80, 40, '14 dBm', 'var(--led)', W)}${tx(100, 64, '+', 'vizbig')}${bx(116, 40, 80, 40, '6 dBi')}${tx(206, 64, '=', 'vizbig')}${bx(222, 40, 70, 40, '20 dBm', 'var(--ok)', W)}${tx(50, 30, 'el chip', 'vizsm', 'text-anchor="middle"')}${tx(156, 30, 'la antena', 'vizsm', 'text-anchor="middle"')}${tx(257, 30, 'PIRE', 'vizsm', 'text-anchor="middle"')}${tx(150, 104, 'el límite europeo: 20 dBm de PIRE', 'vizsm', 'text-anchor="middle"')}`) }),
      I('En un nodo a batería, lo caro es tener la <b>radio encendida</b>: decenas de mA aunque no transmita. Por eso conviene conectar rápido (IP fija, recordar el canal) y volver a dormir.', {
        svg: SV(110, `<path d="M20 90H60V24H150V90H290" fill="none" stroke="var(--led)" stroke-width="2.5"/>${tx(64, 18, 'radio encendida: decenas de mA', 'vizsm')}${tx(170, 84, 'dormido: µA', 'vizsm')}<path d="M60 100H150" stroke="currentColor"/>${tx(105, 108, 'acorta esto', 'vizsm', 'text-anchor="middle" fill="var(--err)"')}`) }),
      { t: 'steps', text: '¿Cuánta potencia máxima puedes dar con una antena de 8 dBi?', steps: ['PIRE = potencia + ganancia de la antena', 'Límite en Europa: 20 dBm de PIRE', 'Potencia máxima = 20 − 8', '<b>12 dBm</b>, unos 16 mW'], result: '12 dBm' },
      G('es_dbm'), G('es_dbm'),
      Nm('Transmites a 14 dBm con una antena de 6 dBi. ¿PIRE, en dBm?', 20, 'dBm', '14 + 6 = 20 dBm: justo en el límite europeo.', { tol: 0.1, c: 'es_eirp', h: 'En dB, se suma.' }),
      Nm('Con una antena de 5 dBi, ¿potencia máxima del ESP32, en dBm?', 15, 'dBm', '20 − 5 = 15 dBm.', { tol: 0.1, c: 'es_eirp', h: 'Resta la ganancia al límite de 20 dBm.' }),
      Q('Un mando por WebSocket a veces responde con 100–300 ms de retraso.', ['Es el modem sleep: WiFi.setSleep(false), a cambio de más consumo', 'El WebSocket es lento siempre', 'Falta PSRAM', 'El router es de 5 GHz'], 'Para audio y control en tiempo real, sin modem sleep.', { c: 'es_sleep', h: 'La radio duerme entre balizas del router.' }),
      Q('Metes el ESP32 en una caja metálica y pierde la conexión.', ['El metal apantalla: antena externa (módulo -U) o caja de plástico', 'Hace falta más RAM', 'Es la fuente', 'El WiFi atraviesa el metal'], 'Una caja metálica es una jaula de Faraday.', { c: 'es_rf', h: '¿Qué hace el metal con las ondas de radio?' }),
      Q('Un nodo a batería se conecta cada 10 minutos. ¿Cómo acortas la conexión?', ['IP fija y recordar el canal y la BSSID del router', 'Más potencia', 'Modo AP', 'Contraseña más corta'], 'El escaneo de canales y el DHCP cuestan segundos.', { c: 'es_awake', h: '¿Qué pasos de la conexión podrías saltarte si ya los conoces?' }),
      Q('¿Qué consume más energía en un nodo a batería?', ['Estar conectado al WiFi esperando, aunque no transmita', 'Un cálculo de 1 ms', 'Leer un pin', 'Un delay en deep sleep'], 'La radio encendida gasta decenas de mA aunque no envíe nada.', { c: 'es_awake', h: 'Mira el dibujo del consumo.' }),
      RES('<b>P(mW) = 10^(dBm / 10)</b>: +10 dB = ×10; +3 dB ≈ ×2.', '<b>PIRE = potencia + ganancia</b> ≤ 20 dBm en Europa.', 'Antena despejada (nada de metal); -U para antena externa.', 'Modem sleep ahorra pero retrasa; en baterías, la radio encendida es lo caro.')
    ]),
    L('es27', 'Servidor web en el ESP32', 'wifi', ['es_http', 'es_web', 'es_websec'], [
      Q('Tu servidor web del ESP32 tiene un delay(2000) en loop(). ¿Qué crees que notarás en el navegador?', ['Respuestas que tardan hasta 2 s', 'Nada', 'Error 404', 'Que se cae el WiFi'], 'El servidor sencillo solo atiende cuando loop() le da paso. Míralo.', { predict: true, c: 'es_http', h: 'El servidor solo atiende cuando loop() le da paso.' }),
      { t: 'explore', text: 'Un servidor síncrono atiende las peticiones cuando loop() llama a server.handleClient(). Cambia lo que hace loop().', viz: 'es_http',
        params: { d: { label: 'delay() en loop()', val: 1000, list: [0, 10, 50, 100, 500, 1000, 2000], unit: 'ms', dec: 0 }, hc: yn('server.handleClient() (0 no · 1 sí)', 1) },
        tasks: [
          { q: 'dead', min: 1, max: 1, text: 'Quita la llamada que atiende a los clientes', done: 'Sin handleClient(), nadie contesta: el navegador espera hasta rendirse.', hint: 'Pon handleClient a 0.' },
          { q: 'fast', min: 1, max: 1, text: 'Que la respuesta más lenta tarde menos de 50 ms', done: 'Con un servidor síncrono, loop() debe dar vueltas rápidas.' }] },
      I('El ESP32 puede ser un <b>servidor HTTP</b>: el navegador pide una dirección (GET /on) y él responde con un código (200 si todo va bien) y un contenido: una página, un texto o datos.', {
        svg: SV(110, `${bx(10, 30, 80, 44, 'navegador')}${bx(210, 30, 80, 44, 'ESP32', 'var(--led)', W)}${ar(90, 44, 210, 44, 'currentColor', 'class="a-flow"')}${ar(210, 62, 90, 62, 'var(--ok)', 'class="a-flow-rev"')}${tx(150, 38, 'GET /on', 'vizsm', 'text-anchor="middle"')}${tx(150, 82, '200 OK', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Un servidor mínimo con dos rutas, con la biblioteca WebServer que trae el núcleo:', { code: '#include <WebServer.h>\nWebServer server(80);\n\nvoid setup() {\n  // ... conectar al WiFi ...\n  server.on("/", []() { server.send(200, "text/html", "<a href=/on>Encender</a>"); });\n  server.on("/on", []() { digitalWrite(2, HIGH); server.send(200, "text/plain", "OK"); });\n  server.begin();\n}\n\nvoid loop() {\n  server.handleClient();   // atiende las peticiones\n}',
        more: 'ESPAsyncWebServer es una alternativa externa asíncrona: atiende por su cuenta, sin depender de que loop() la llame. A cambio, sus funciones se ejecutan en otra tarea y hay que cuidar lo que comparten.' }),
      I('Para páginas grandes, guarda el HTML, el CSS y el JavaScript en <b>LittleFS</b>. Y para datos, una ruta que devuelve <b>JSON</b>, que la página consulta con fetch().', { code: 'server.serveStatic("/", LittleFS, "/www/");\nserver.on("/api/estado", []() {\n  char json[64];\n  snprintf(json, sizeof(json), "{\\"temp\\":%.1f,\\"rssi\\":%d}", temp, WiFi.RSSI());\n  server.send(200, "application/json", json);\n});' }),
      I('Cualquiera conectado a tu WiFi puede abrir tu servidor. Si controla algo importante, pide contraseña (server.authenticate() como mínimo), comprueba cada dato que llega y no lo abras a internet sin autenticación y cifrado de verdad.', {
        svg: SV(110, `${bx(10, 36, 70, 36, 'petición')}${ar(80, 54, 110, 54)}<rect x="112" y="30" width="70" height="48" rx="6" fill="var(--ice-soft)" stroke="currentColor"/><path d="M134 30V22a13 13 0 0 1 26 0V30" fill="none" stroke="currentColor" stroke-width="3"/>${tx(147, 60, '¿clave?', 'vizsm', 'text-anchor="middle"')}${ar(182, 54, 212, 54, 'var(--ok)')}${bx(212, 36, 80, 36, 'calefacción', 'var(--led)', W)}`) }),
      { t: 'steps', text: 'Sigue el viaje de una petición a /on.', steps: ['El navegador envía GET /on al puerto 80', 'En la siguiente vuelta de loop(), handleClient() la lee', 'Busca la ruta registrada con server.on("/on", …) y ejecuta su función', 'La función enciende el pin y responde con server.send(200, "text/plain", "OK")'], result: 'Petición → handleClient → ruta → respuesta' },
      { t: 'match', q: 'Une cada código HTTP con su significado.', pairs: [['200', 'Todo bien'], ['404', 'No existe esa ruta'], ['302', 'Ve a otra dirección'], ['500', 'Error del servidor']], c: 'es_http', h: 'El 200 es el bueno y el 404, el famoso «no encontrado».' },
      Q('¿Para qué sirve server.onNotFound()?', ['Para responder a las rutas que no existen (un 404 o una redirección)', 'Para buscar el WiFi', 'Para detectar errores de memoria', 'Para encender un LED'], 'Imprescindible en los portales de configuración.', { c: 'es_http', h: 'Not found: no encontrado.' }),
      Q('¿Qué tipo de contenido indicas al devolver datos para una página que los lee con fetch()?', ['application/json', 'text/html', 'image/png', 'audio/mpeg'], 'La página lo interpreta como datos.', { c: 'es_http', h: 'Mira el send de la ruta /api/estado.' }),
      Q('La página consulta /api/estado cada segundo con fetch(). ¿Qué inconveniente tiene?', ['Muchas peticiones aunque no cambie nada, y hasta un segundo de retraso', 'Ninguno', 'No funciona en móviles', 'Borra la flash'], 'Para tiempo real hay algo mejor: WebSocket, en la siguiente lección.', { c: 'es_web', h: '¿Qué pasa si la temperatura no cambia en una hora?' }),
      Q('Tu servidor controla la calefacción y no tiene contraseña.', ['Cualquiera en tu WiFi puede manejarla; nunca lo abras a internet sin autenticación y cifrado', 'Es seguro porque es pequeño', 'El router lo protege de todo', 'No importa'], 'server.authenticate() como mínimo en la red local.', { c: 'es_websec', h: '¿Quién más está conectado a tu WiFi?' }),
      Q('Un formulario envía brillo=900 y el brillo va de 0 a 255. ¿Qué haces en el servidor?', ['Comprobar el rango y limitarlo (o rechazarlo)', 'Usarlo tal cual', 'Reiniciar', 'Guardarlo en la flash'], 'Nunca te fíes de lo que llega.', { c: 'es_websec', h: 'constrain() o rechazar.' }),
      RES('Servidor síncrono: <b>server.on(ruta, función)</b> y <b>handleClient()</b> en un loop() rápido.', 'Códigos: 200 bien, 302 redirige, 404 no existe, 500 error.', 'Páginas en LittleFS; datos en JSON (application/json) con fetch().', 'Contraseña y validación de cada dato; nada abierto a internet sin cifrado.')
    ]),
    L('es28', 'WebSocket y mDNS', 'wifi', ['es_web', 'es_websec', 'es_names'], [
      Q('Para manejar un brazo robótico desde el móvil, ¿qué crees que va mejor?', ['Una conexión que quede abierta y por la que hablen los dos', 'Recargar la página en cada movimiento', 'Un correo por orden', 'Preguntar cada 5 s'], 'Eso es un WebSocket. Compara el tráfico con preguntar por HTTP.', { predict: true, c: 'es_web', h: 'Necesitas poco retraso y en los dos sentidos.' }),
      { t: 'explore', text: 'Varios móviles muestran la temperatura del ESP32. Compara preguntar por HTTP cada cierto tiempo con una conexión WebSocket.', viz: 'es_poll',
        params: { ws: yn('Método (0 HTTP preguntando · 1 WebSocket)', 0), iv: { label: 'HTTP: preguntar cada', val: 1000, list: [100, 200, 500, 1000, 2000], unit: 'ms', dec: 0 }, cl: { label: 'Móviles abiertos', val: 1, min: 1, max: 8, step: 1, dec: 0 }, ch: { label: 'Cambios por segundo', val: 1, list: [0.1, 0.5, 1, 2, 5], dec: 1 } },
        tasks: [
          { q: 'heavy', min: 1, max: 1, text: 'Con HTTP, que se vea casi al instante con 3 móviles: mira las peticiones', done: 'Preguntar cada 100 ms con 3 móviles son 30 peticiones por segundo, cambie algo o no.', hint: 'Baja el intervalo a 100 ms y sube los móviles a 3.' },
          { q: 'quiet', min: 1, max: 1, text: 'Ahora cambia a WebSocket', done: 'Cero peticiones: el ESP32 solo envía cuando hay cambios, y llega en milisegundos.' }] },
      I('HTTP es pregunta y respuesta, y se cierra. <b>WebSocket</b> es una conexión que queda abierta: cualquiera de los dos habla cuando quiere, en milisegundos. Perfecto para mandos, paneles y gráficas en vivo.', {
        svg: SV(120, `${tx(10, 18, 'HTTP: ¿algo nuevo? ¿algo nuevo? ¿algo nuevo?', 'vizsm')}${[0, 1, 2].map(i => ar(30 + i * 90, 30, 80 + i * 90, 30)).join('')}
          ${tx(10, 70, 'WebSocket: el ESP32 avisa cuando cambia', 'vizsm')}<path d="M20 86H290" stroke="var(--ok)" stroke-width="6" opacity=".4"/>${ar(200, 86, 120, 86, 'var(--ok)', 'class="a-flow-rev"')}${tx(150, 110, 'conexión abierta', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Con la biblioteca WebSockets (servidor en el puerto 81):', { code: '#include <WebSocketsServer.h>\nWebSocketsServer ws(81);\n\nvoid alMensaje(uint8_t num, WStype_t tipo, uint8_t *datos, size_t len) {\n  if (tipo == WStype_TEXT) { /* datos[0..len-1] */ }\n}\n// setup(): ws.begin(); ws.onEvent(alMensaje);\n// loop():  ws.loop();\n// a todos: ws.broadcastTXT("T:21.5");' }),
      I('<b>mDNS</b>: el ESP32 anuncia un nombre en tu red y puedes escribir lampara.local en el navegador en vez de su IP. Algunos sistemas no lo resuelven: muestra también la IP.', {
        svg: SV(100, `${bx(10, 30, 110, 36, 'lampara.local')}${ar(120, 48, 180, 48, 'currentColor', 'class="a-flow"')}${bx(180, 30, 110, 36, '192.168.1.42', 'var(--led)', W)}${tx(150, 88, 'un nombre en vez de un número', 'vizsm', 'text-anchor="middle"')}`),
        code: '#include <ESPmDNS.h>\nMDNS.begin("lampara");                 // http://lampara.local\nMDNS.addService("http", "tcp", 80);' }),
      { t: 'steps', text: 'Llega por WebSocket el texto «B120». ¿Qué hace este código?', code: 'if (len > 1 && len < 8 && datos[0] == \'B\') {\n  char n[8];\n  memcpy(n, datos + 1, len - 1);\n  n[len - 1] = 0;\n  brillo = constrain(atoi(n), 0, 255);\n}', steps: ['Comprueba la longitud: 4 bytes, entre 1 y 8, y que empiece por B', 'Copia lo que va tras la B («120») a un búfer y lo cierra con un 0', 'atoi convierte el texto en el número 120', 'constrain lo deja entre 0 y 255: brillo = 120'], result: 'Valida longitud, formato y rango antes de usar el dato.' },
      Q('¿Qué hace ws.broadcastTXT(texto)?', ['Envía el texto a todos los clientes conectados', 'Lo envía a uno al azar', 'Lo guarda en la flash', 'Lo imprime por Serial'], 'Así todos los móviles ven el mismo estado.', { c: 'es_web', h: 'Broadcast: a todos.' }),
      Nm('Una página consulta por HTTP cada 200 ms y hay 4 móviles abiertos. ¿Peticiones por segundo?', 20, 'peticiones/s', '5 por segundo × 4 = 20. Con WebSocket, ninguna: solo mensajes cuando hay cambios.', { tol: 0.5, c: 'es_web', h: 'Cuántas caben en un segundo por móvil, por el número de móviles.' }),
      Q('En el fragmento del ejemplo, ¿para qué sirve la comprobación len < 8?', ['Para no copiar más bytes de los que caben en el búfer n', 'Para ir más rápido', 'Para filtrar el WiFi', 'No sirve'], 'Sin ella, un mensaje largo escribiría fuera del búfer.', { code: 'if (len > 1 && len < 8 && datos[0] == \'B\') {\n  char n[8];\n  memcpy(n, datos + 1, len - 1);', c: 'es_websec', h: '¿Cuánto mide n?' }),
      Q('Un móvil Android no abre lampara.local.', ['Algunos sistemas no resuelven mDNS: muestra también la IP', 'El ESP32 está roto', 'mDNS solo funciona por cable', 'Falta PSRAM'], 'Ten siempre un plan B para encontrar la IP.', { c: 'es_names', h: 'mDNS depende también del sistema del móvil.' }),
      Q('Un deslizador de la página manda decenas de mensajes por segundo y satura al ESP32.', ['Limita el envío en la página (uno cada 30–50 ms) y manda el último valor', 'Sube la frecuencia de la CPU', 'Usa HTTP', 'Quita el WiFi'], 'Al servidor solo le importa el valor más reciente.', { c: 'es_web', h: '¿Hace falta mandar todos los valores intermedios?' }),
      Q('¿Qué formato de mensaje es más robusto para crecer?', ['JSON pequeño (o texto con prefijos claros) y validación de cada campo', 'Bytes sin estructura', 'Lo que salga', 'HTML'], 'ArduinoJson ayuda cuando los mensajes se complican.', { c: 'es_websec', h: 'Algo con estructura, fácil de validar y ampliar.' }),
      RES('<b>WebSocket</b>: conexión abierta, mensajes en los dos sentidos solo cuando hay algo que decir.', 'broadcastTXT avisa a todos; limita los envíos desde la página.', 'Valida longitud, formato y rango de cada mensaje.', '<b>mDNS</b>: nombre.local en vez de la IP, con la IP como plan B.')
    ]),
    L('es29', 'Portal de configuración y hora real', 'wifi', ['es_names', 'es_ntp', 'es_nvs'], [
      Q('Regalas tu aparato y su nuevo dueño tiene otra red WiFi. ¿Cómo debería meter su contraseña?', ['El aparato crea su propia red con una página para configurarla', 'Recompilando el programa', 'Por Bluetooth clásico siempre', 'No se puede'], 'Eso es un portal de configuración. Y luego, con red, el reloj se pone en hora solo.', { predict: true, c: 'es_names', h: 'Recuerda que el ESP32 puede crear su propia red.' }),
      { t: 'explore', text: 'Con red, el ESP32 pide la hora a internet (NTP) y aplica la zona horaria con su horario de verano. Recorre el año 2026 y cambia de zona.', viz: 'es_tz',
        params: { day: { label: 'Día del año 2026', val: 15, min: 1, max: 365, step: 1, dec: 0 }, z: yn('Zona (0 península · 1 Canarias)', 0) },
        tasks: [
          { q: 'summer', min: 1, max: 1, text: 'Busca un día con horario de verano en la península', done: 'Del último domingo de marzo al último de octubre: UTC + 2.', hint: 'Mueve el día hacia el verano.' },
          { q: 'canWinter', min: 1, max: 1, text: 'Ahora pon Canarias en invierno', done: 'Canarias va una hora menos: UTC + 0 en invierno y UTC + 1 en verano.' }] },
      I('Meter la contraseña del WiFi en el código obliga a recompilar si cambias de router, y la deja a la vista. Un <b>portal cautivo</b> lo resuelve: si no hay credenciales o fallan, el ESP32 abre su propia red con una página para configurarlas.', {
        svg: SV(120, `${['1 · el ESP32 crea su AP', '2 · el móvil se une', '3 · el DNS lleva a la página', '4 · eliges red y clave', '5 · a NVS y reinicio en STA'].map((n, i) => bx(40, 4 + i * 20, 220, 17, n)).join('')}${tx(150, 116, 'WiFiManager hace todo esto en pocas líneas', 'vizsm', 'text-anchor="middle"')}`) }),
      I('El truco del portal: un <b>DNSServer</b> que responde a cualquier nombre con la IP del ESP32. El móvil cree que la red pide «iniciar sesión» y abre la página solo. Las credenciales se guardan en <b>NVS</b>.', {
        svg: SV(100, `${['google.com', 'lo-que-sea.es', 'apple.com'].map((n, i) => bx(10, 8 + i * 30, 110, 24, n)).join('')}${[0, 1, 2].map(i => ar(120, 20 + i * 30, 190, 50)).join('')}${bx(190, 34, 100, 32, '192.168.4.1', 'var(--led)', W)}`) }),
      I('<b>Hora real con NTP</b>: el ESP32 pregunta la hora a servidores de internet y el sistema la mantiene. La zona se da en formato POSIX, con el cambio de verano incluido. Justo tras conectar, getLocalTime() devuelve false hasta la primera sincronización.', { code: 'configTzTime("CET-1CEST,M3.5.0,M10.5.0/3", "es.pool.ntp.org");\nstruct tm t;\nif (getLocalTime(&t)) Serial.println(&t, "%d/%m/%Y %H:%M:%S");',
        more: 'El sistema resincroniza solo (por defecto, cada hora). En deep sleep la hora la lleva el reloj RTC, menos preciso: si necesitas exactitud, resincroniza al despertar.' }),
      { t: 'steps', text: 'Descifra esta zona horaria POSIX.', code: 'CET-1CEST,M3.5.0,M10.5.0/3', steps: ['CET-1: la hora normal se llama CET y es UTC + 1 (POSIX escribe el signo al revés)', 'CEST: el nombre de la hora de verano (por defecto, una hora más)', 'M3.5.0: mes 3, semana 5 (la última), día 0 (domingo); a las 2:00 si no se indica', 'M10.5.0/3: último domingo de octubre, a las 3:00'], result: 'La hora oficial de la península y Baleares' },
      { t: 'order', q: 'Ordena el funcionamiento de un portal de configuración.', items: ['No hay credenciales o fallan: el ESP32 crea su AP', 'Te conectas con el móvil a esa red', 'Un DNS que responde a todo lleva al móvil a la página del ESP32', 'Eliges la red y escribes la contraseña', 'Se guardan en NVS y el ESP32 se reinicia en modo STA'], e: 'WiFiManager hace todo esto en pocas líneas.', c: 'es_names', h: 'Sigue el dibujo de los cinco pasos.' },
      Q('¿Para qué sirve el DNSServer en un portal cautivo?', ['Responde a cualquier nombre con la IP del ESP32, para que el móvil abra la página solo', 'Da internet', 'Cifra la contraseña', 'Ahorra energía'], 'El móvil cree que hay que «iniciar sesión» y muestra la página.', { c: 'es_names', h: 'Mira el dibujo de las flechas que van todas al mismo sitio.' }),
      Q('En la regla M3.5.0, ¿qué significa?', ['El último domingo de marzo', 'El 5 de marzo', 'Las 3:50', 'El día 35'], 'Mes 3, quinta (= última) semana, día 0 (domingo).', { code: 'CET-1CEST,M3.5.0,M10.5.0/3', c: 'es_ntp', h: 'Mes, semana y día de la semana, en ese orden.' }),
      Q('getLocalTime(&t) devuelve false justo después de arrancar.', ['Aún no se ha sincronizado: espera o reintenta', 'La zona está mal seguro', 'No hay RTC', 'Es el año 2038'], 'La primera sincronización tarda un poco tras conectar.', { c: 'es_ntp', h: '¿Ha dado tiempo a preguntar a internet?' }),
      Q('Para Canarias usarías…', ['Otra cadena de zona, con una hora menos', 'La misma que la península', 'Restar una hora a mano en el código', 'No se puede'], 'Las reglas de cambio son las mismas, pero una hora menos.', { code: 'WET0WEST,M3.5.0/1,M10.5.0', c: 'es_ntp', h: 'Recuerda la exploración: Canarias va una hora por detrás.' }),
      Q('¿Dónde guardas las credenciales WiFi que introduce el usuario?', ['En NVS (WiFiManager y el propio WiFi las guardan ahí)', 'En el código', 'En una variable global', 'En la EEPROM del USB'], 'Sobreviven a reinicios y actualizaciones.', { c: 'es_nvs', h: 'El almacén clave-valor que sobrevive a los reinicios.' }),
      RES('<b>Portal cautivo</b>: AP propio + DNS que responde a todo + página; credenciales a NVS.', '<b>NTP</b>: configTzTime(zona, servidor); getLocalTime() es false hasta sincronizar.', 'Zona POSIX: nombre y desfase de la hora normal, de la de verano y sus reglas de cambio (Canarias, con su propia cadena).')
    ]),
    PRJ('es-p10', 'Proyecto: la lámpara, desde el móvil', 'es_weblamp'),
    PRJ('es-p11', 'Proyecto: reloj NTP con matriz LED', 'es_clock'),
    PRJ('es-p12', 'Proyecto: radio por internet', 'es_radio'),
    PRJ('es-p13', 'Proyecto: osciloscopio en el navegador', 'es_scope'),
    PRJ('es-p14', 'Proyecto: brazo robótico por WebSocket', 'es_arm'),
    PRJ('es-p15', 'Proyecto: plantilla con OTA y portal', 'es_otaportal')
  ];

  const M7 = [
    L('es30', 'BLE: anuncios y roles', 'antenna', ['es_ble', 'es_rf'], [
      Q('Una baliza BLE de llavero dura más de un año con una pila de botón. ¿Cómo crees que lo consigue?', ['Duerme casi siempre y solo emite un mensaje corto de vez en cuando', 'Tiene una batería enorme', 'Usa WiFi', 'Está siempre conectada al móvil'], 'BLE está hecho para enviar poco y dormir mucho. Ese mensaje corto es un anuncio: veamos cuánto cabe.', { predict: true, c: 'es_ble', h: 'Bluetooth Low Energy: bajo consumo. ¿Cómo se ahorra?' }),
      { t: 'explore', text: 'Un anuncio BLE clásico tiene 31 bytes. Cada campo gasta 2 bytes de cabecera (longitud y tipo) más sus datos. Rellénalo.', viz: 'es_adv',
        params: { nm: { label: 'Nombre', val: 20, list: [0, 4, 6, 8, 12, 20], unit: 'letras', dec: 0 }, uuid: yn('UUID de 128 bits (0 · 1)', 1), md: { label: 'Datos de fabricante', val: 0, list: [0, 2, 4, 8], unit: 'bytes', dec: 0 }, iv: { label: 'Intervalo', val: 100, list: [20, 100, 250, 1000, 10240], unit: 'ms', dec: 0 } },
        tasks: [
          { q: 'both', min: 1, max: 1, text: 'Que quepan un nombre de 6 letras o más y el UUID de 128 bits', done: 'Flags (3) + nombre (2 + n) + UUID (18): con 8 letras justo 31.', hint: 'Acorta el nombre.' },
          { q: 'temp', min: 1, max: 1, text: 'Ahora añade 2 bytes de temperatura manteniendo el UUID', done: 'No cabe todo: quita el nombre (o mándalo en la respuesta de escaneo).', hint: 'Algo tiene que salir.' }] },
      I('<b>Bluetooth Low Energy</b> no es el Bluetooth clásico de los auriculares: está hecho para enviar poco y dormir mucho. Tiene dos momentos: los <b>anuncios</b>, que cualquiera puede oír, y la <b>conexión</b>, para intercambiar datos.', {
        svg: SV(110, `${bx(10, 36, 80, 40, 'sensor', 'var(--led)', W)}${[0, 1, 2].map(i => `<path d="M${96 + i * 14} 40q8 16 0 32" fill="none" stroke="#3E8FCB" stroke-width="2" class="a-fade a-d${i + 1}"/>`).join('')}${bx(200, 36, 90, 40, 'cualquiera oye')}${tx(150, 98, 'anunciar no necesita conexión', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Roles (GAP):\n· <b>Periférico</b>: anuncia y acepta conexiones (tu sensor).\n· <b>Central</b>: escanea y conecta (el móvil).\n· <b>Emisor</b> y <b>observador</b>: solo anuncios, sin conexión.', {
        svg: SV(110, `${bx(10, 10, 130, 36, 'Periférico ↔ Central', 'var(--led)', W)}${tx(75, 62, 'con conexión', 'vizsm', 'text-anchor="middle"')}${bx(160, 10, 130, 36, 'Emisor → Observador', '#3E8FCB', W)}${tx(225, 62, 'solo anuncios', 'vizsm', 'text-anchor="middle"')}${tx(150, 96, 'pulsera ↔ móvil · baliza → pasarela', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Un anuncio se emite en los tres canales de anuncio (37, 38 y 39) cada cierto intervalo, de 20 ms a unos 10 s. Alargar el intervalo es lo que más ahorra. BLE 5 añade anuncios extendidos más largos. Formatos como iBeacon y Eddystone organizan esos bytes a su manera.', {
        svg: SV(110, `${[37, 38, 39].map((c, i) => `<rect x="${20 + i * 24}" y="30" width="18" height="40" fill="var(--led)" class="a-blink a-d${i + 1}"/>` + tx(29 + i * 24, 86, c, 'vizsm', 'text-anchor="middle"')).join('')}${tx(110, 56, '… pausa …', 'vizsm')}${[37, 38, 39].map((c, i) => `<rect x="${200 + i * 24}" y="30" width="18" height="40" fill="var(--led)" opacity=".5"/>`).join('')}${tx(150, 104, 'cada intervalo, los tres canales', 'vizsm', 'text-anchor="middle"')}`) }),
      { t: 'steps', text: 'Anunciando cada 100 ms, ¿cuántos anuncios hay en una hora?', steps: ['Una hora son 3600 s', 'Anuncios = 3600 / 0,1', '= <b>36 000</b> por hora', 'Y cada uno se emite en los tres canales: 108 000 transmisiones'], result: '36 000 anuncios por hora' },
      { t: 'match', q: 'Une cada dispositivo con su papel típico.', pairs: [['Pulsera de actividad', 'Periférico'], ['Móvil con la app', 'Central'], ['Baliza de llavero', 'Emisor (solo anuncios)'], ['Pasarela que escucha balizas', 'Observador']], c: 'es_ble', h: 'Quién anuncia, quién escanea, y si hay conexión o no.' },
      Q('Una baliza que solo emite su identificador y la temperatura, sin conexiones:', ['Basta con anuncios: todo cabe en los datos de fabricante', 'Necesita GATT', 'Necesita Bluetooth clásico', 'Necesita WiFi'], 'Es la forma más barata en energía de difundir datos.', { c: 'es_ble', h: '¿Cabe en 31 bytes?' }),
      Nm('Anunciando cada 250 ms, ¿cuántos anuncios por hora?', 14400, 'anuncios', '3600 / 0,25 = 14 400.', { tol: 1, c: 'es_ble', h: 'Segundos de una hora entre el intervalo en segundos.' }),
      Q('¿Qué tal sirve el RSSI para medir distancias?', ['Muy aproximado: cuerpos, paredes y orientación lo cambian varios dB', 'Da centímetros exactos', 'No varía nunca', 'Solo funciona en exteriores'], 'Sirve para «cerca o lejos», no para medir.', { c: 'es_rf', h: 'Recuerda qué le hacían las paredes a la señal.' }),
      Q('Tu escáner ve el móvil con una MAC distinta cada pocos minutos.', ['Los móviles usan direcciones aleatorias por privacidad; para reconocerlos hay que emparejar', 'Es un fallo del ESP32', 'Son varios móviles', 'Es interferencia'], 'Evita que se pueda rastrear a las personas por su MAC.', { c: 'es_ble', h: 'Piensa en la privacidad del dueño del móvil.' }),
      Q('iBeacon y Eddystone son…', ['Formatos de datos dentro de los anuncios', 'Chips de Bluetooth', 'Protocolos de WiFi', 'Tipos de batería'], 'Cada uno organiza los 31 bytes a su manera.', { c: 'es_ble', h: 'Lo decía la tarjeta de los canales.' }),
      RES('BLE: <b>anuncios</b> (cualquiera los oye) y <b>conexión</b> (para intercambiar datos).', 'Roles: periférico y central (con conexión); emisor y observador (solo anuncios).', 'Anuncio clásico: <b>31 bytes</b>, en los canales 37–39, de 20 ms a ~10 s; intervalo largo = menos consumo.', 'RSSI: cerca o lejos, no distancias.')
    ]),
    L('es31', 'GATT: servicios y características', 'antenna', ['es_gatt', 'es_radiosec'], [
      Q('Tu sensor BLE manda la temperatura al móvil. ¿Qué crees que gasta menos?', ['Que el sensor avise solo cuando cambia', 'Que el móvil pregunte cada 100 ms', 'Que el móvil se reconecte cada vez', 'Da igual'], 'Avisar solo cuando hay algo nuevo es la idea de las notificaciones. Antes, veamos cuánto cabe en cada paquete.', { predict: true, c: 'es_gatt', h: 'Mandar solo cuando hay novedades.' }),
      { t: 'explore', text: 'Tras conectar, los datos viajan en paquetes. Cada paquete lleva MTU − 3 bytes útiles; la MTU se negocia al conectar (23 si nadie pide más).', viz: 'es_gatt',
        params: { bytes: { label: 'Datos a enviar', val: 200, list: [20, 200, 2000, 10000], unit: 'bytes', dec: 0 }, mtu: { label: 'MTU', val: 23, list: [23, 185, 247, 517], dec: 0 } },
        tasks: [
          { q: 'pk', min: 100, max: 100, text: 'Pon 2000 bytes con la MTU por defecto y cuenta los paquetes', done: '20 bytes útiles por paquete: 100 paquetes.', hint: 'Datos a 2000 y MTU 23.' },
          { q: 'few', min: 1, max: 1, text: 'Envía esos 2000 bytes en 20 paquetes o menos', done: 'Con MTU 247 caben 244 bytes útiles: 9 paquetes.', hint: 'Sube la MTU.' }] },
      I('Tras conectar, los datos se organizan con <b>GATT</b>. El periférico es el servidor; dentro tiene <b>servicios</b> y, en cada servicio, <b>características</b>: un valor con propiedades (leer, escribir, notificar).', {
        svg: SV(130, `${bx(10, 10, 120, 30, 'Servidor (sensor)', 'var(--led)', W)}${bx(30, 50, 120, 28, 'Servicio: Ambiente', '#3E8FCB', W)}${bx(160, 50, 130, 28, 'Servicio: Batería', '#3E8FCB', W)}
          ${bx(50, 90, 110, 26, 'Temperatura · N')}${bx(170, 90, 110, 26, 'Nivel · L')}${tx(150, 126, 'L leer · E escribir · N notificar', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Un servidor BLE mínimo en el núcleo 3.x (los UUID largos los generas tú al azar):', { code: '#include <BLEDevice.h>\n#include <BLEServer.h>\n#include <BLE2902.h>\n\nBLECharacteristic *temp;\n\nvoid setup() {\n  BLEDevice::init("Sensor Voltio");\n  BLEServer *srv = BLEDevice::createServer();\n  BLEService *svc = srv->createService("6e7a0001-3c2b-4f8e-9a51-0d2f4a1b7c10");\n  temp = svc->createCharacteristic("6e7a0002-3c2b-4f8e-9a51-0d2f4a1b7c10",\n          BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);\n  temp->addDescriptor(new BLE2902());   // CCCD para notificar\n  svc->start();\n  BLEDevice::getAdvertising()->addServiceUUID(svc->getUUID());\n  BLEDevice::startAdvertising();\n}\n// Para avisar: temp->setValue(valor); temp->notify();' }),
      I('Leer es ir a mirar: el cliente pregunta y el servidor contesta. <b>Notificar</b> es suscribirse: el cliente escribe en el descriptor <b>CCCD</b> (0x2902) y el servidor le avisa cada vez que cambia.', {
        svg: SV(110, `${bx(10, 36, 70, 36, 'móvil')}${bx(220, 36, 70, 36, 'sensor', 'var(--led)', W)}${ar(80, 44, 220, 44)}${tx(150, 38, 'escribe en 0x2902', 'vizsm', 'text-anchor="middle"')}${ar(220, 62, 80, 62, 'var(--ok)', 'class="a-flow-rev"')}${tx(150, 84, 'notify, notify, notify…', 'vizsm', 'text-anchor="middle"')}`) }),
      I('UUID: los de <b>16 bits</b> son estándar del Bluetooth SIG (0x180F, servicio de batería; 0x181A, sensores ambientales). Para los tuyos, <b>128 bits</b> al azar. Y BLE no está hecho para mover mucho volumen: 20 bytes útiles por paquete si no se negocia otra MTU (hasta 517).', {
        svg: SV(100, `${bx(10, 26, 110, 40, '0x180F', 'var(--ok)', W, 'vizlab')}${tx(65, 84, 'estándar (16 bits)', 'vizsm', 'text-anchor="middle"')}${bx(140, 26, 150, 40, '6e7a0001-…-7c10', 'var(--ice-soft)')}${tx(215, 84, 'tuyo (128 bits al azar)', 'vizsm', 'text-anchor="middle"')}`) }),
      { t: 'steps', text: 'Una imagen pequeña de 5000 bytes con MTU 185. ¿Cuántos paquetes?', steps: ['Bytes útiles por paquete = MTU − 3 = 182', 'Paquetes = 5000 / 182 ≈ 27,5', 'Se redondea hacia arriba: el último va medio lleno', '<b>28 paquetes</b>'], result: '28 paquetes' },
      { t: 'match', q: 'Une cada pieza de GATT.', pairs: [['Servicio', 'Agrupa características relacionadas'], ['Característica', 'Un valor con propiedades'], ['CCCD (0x2902)', 'Activa las notificaciones'], ['UUID', 'Identifica servicios y características']], c: 'es_gatt', h: 'Mira el árbol del dibujo.' },
      Q('Diferencia entre leer y notificar:', ['Con notify el servidor envía cuando cambia, sin que el cliente pregunte', 'Son lo mismo', 'Notify es más lento', 'Leer no existe en BLE'], 'Notificar ahorra tráfico y energía.', { c: 'es_gatt', h: '¿Quién toma la iniciativa en cada caso?' }),
      Q('¿Para qué escribe el cliente en el descriptor 0x2902?', ['Para suscribirse a las notificaciones de esa característica', 'Para cambiar el nombre', 'Para emparejar', 'Para medir el RSSI'], 'Sin esa suscripción, notify() no llega.', { c: 'es_gatt', h: 'Es el CCCD.' }),
      Q('¿Puedes inventarte un UUID de 16 bits para tu servicio?', ['No: están reservados; usa uno de 128 bits al azar', 'Sí, cualquiera', 'Solo si empieza por 0x18', 'Solo en el S3'], 'Así no chocas con un servicio estándar.', { c: 'es_gatt', h: '¿Quién reparte los de 16 bits?' }),
      Nm('Enviar 3000 bytes con 20 bytes útiles por paquete. ¿Cuántos paquetes?', 150, 'paquetes', '3000 / 20 = 150.', { tol: 0.5, c: 'es_gatt', h: 'Divide y redondea hacia arriba si no sale exacto.' }),
      Q('Solo tu móvil debe poder escribir en la característica que abre la puerta.', ['Exigir emparejamiento con cifrado y autenticación para esa característica', 'Usar un UUID raro', 'Bajar la potencia', 'Anunciar menos'], 'Un UUID secreto no es seguridad: cualquiera puede listarlos.', { c: 'es_radiosec', h: 'Lo que va por radio lo oye cualquiera cerca.' }),
      RES('<b>GATT</b>: servidor → servicios → características (leer, escribir, notificar).', '<b>Notificar</b>: el cliente se suscribe en el CCCD (0x2902) y el servidor avisa al cambiar.', 'UUID de 16 bits: estándar; los tuyos, de 128 bits al azar.', 'Útiles por paquete = MTU − 3 (20 por defecto). Para lo delicado, emparejamiento cifrado.')
    ]),
    L('es32', 'BLE como central y la pila NimBLE', 'antenna', ['es_coex', 'es_ble', 'es_hid', 'es_gatt'], [
      Q('Juntas WiFi, BLE y un servidor web en un ESP32 clásico y falla al reservar memoria. ¿Qué crees que se acaba antes?', ['La RAM', 'La CPU', 'La flash', 'Los pines'], 'Las pilas de radio ocupan mucha RAM. Compara dos pilas de BLE.', { predict: true, c: 'es_coex', h: '¿Qué memoria usan las pilas de radio mientras funcionan?' }),
      { t: 'explore', text: 'WiFi encendido y tu programa (servidor, búferes…). Añade una pila de BLE y mira cuánta RAM queda.', viz: 'es_ram',
        params: { wifi: { val: 1, fixed: true }, ble: { label: 'Pila BLE (0 ninguna · 1 NimBLE · 2 Bluedroid)', val: 0, list: [0, 1, 2], dec: 0 }, buf: { label: 'Tu programa', val: 120, list: [40, 80, 120, 160], unit: 'KB', dec: 0 }, psram: { val: 0, fixed: true } },
        tasks: [
          { q: 'fits', min: 0, max: 0, text: 'Añade BLE con la pila Bluedroid', done: 'WiFi + Bluedroid + tu programa ya no caben.', hint: 'Pila BLE = 2.' },
          { q: 'radios', min: 1, max: 1, text: 'Consigue WiFi + BLE + 120 KB de tu programa', done: 'NimBLE solo implementa BLE y ocupa bastante menos: cabe.', hint: 'Prueba la otra pila.' }] },
      I('El ESP32 también puede ser <b>central</b>: escanear, filtrar y conectarse a otros dispositivos (un pulsómetro, un sensor comercial, otro ESP32).', { code: 'class Oyente : public BLEAdvertisedDeviceCallbacks {\n  void onResult(BLEAdvertisedDevice d) {\n    if (d.haveName()) Serial.printf("%s  %d dBm\\n", d.getName().c_str(), d.getRSSI());\n  }\n};\n\nBLEScan *scan = BLEDevice::getScan();\nscan->setAdvertisedDeviceCallbacks(new Oyente());\nscan->setActiveScan(true);\nscan->start(5, false);    // escanea 5 s' }),
      I('El escaneo <b>pasivo</b> solo escucha los anuncios. El <b>activo</b> pide además a cada anunciante su «respuesta de escaneo», con más datos (un nombre largo, por ejemplo); gasta algo más.', {
        svg: SV(110, `${bx(10, 36, 80, 36, 'ESP32 central', 'var(--led)', W)}${bx(210, 36, 80, 36, 'anunciante')}${ar(210, 46, 90, 46, '#3E8FCB')}${tx(150, 40, 'anuncio', 'vizsm', 'text-anchor="middle"')}${ar(90, 60, 210, 60, 'var(--ok)', 'stroke-dasharray="4 3"')}${tx(150, 76, '¿algo más? (activo)', 'vizsm', 'text-anchor="middle"')}${ar(210, 84, 90, 84, '#3E8FCB')}${tx(150, 100, 'respuesta de escaneo', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Hay dos pilas de BLE para el ESP32: <b>Bluedroid</b> (completa, la de la biblioteca BLE estándar) y <b>NimBLE</b> (solo BLE, mucho más ligera en RAM y flash). La biblioteca NimBLE-Arduino es una alternativa muy usada.', {
        svg: SV(100, `${tx(10, 30, 'Bluedroid', 'vizlab')}<rect x="90" y="18" width="190" height="16" rx="4" fill="#8E6CC9"/>${tx(10, 66, 'NimBLE', 'vizlab')}<rect x="90" y="54" width="80" height="16" rx="4" fill="var(--ok)"/>${tx(150, 92, 'RAM que ocupan (orientativo)', 'vizsm', 'text-anchor="middle"')}`) }),
      I('WiFi y BLE comparten la misma radio de 2,4 GHz y se turnan en el tiempo (<b>coexistencia</b>). Funciona, pero los dos van con más retraso y menos caudal que por separado. Y con <b>HID sobre GATT</b>, el ESP32 se presenta como teclado, ratón o mando BLE, sin drivers.', {
        svg: SV(100, `${Array.from({ length: 10 }, (_, i) => `<rect x="${10 + i * 28}" y="30" width="26" height="30" fill="${i % 3 === 2 ? '#8E6CC9' : '#3E8FCB'}"/>`).join('')}${tx(10, 80, 'azul: WiFi · morado: BLE · una sola radio', 'vizsm')}`) }),
      { t: 'steps', text: 'Tu ESP32 central busca un sensor y lee su temperatura.', steps: ['Escanea los canales de anuncio durante unos segundos', 'Cada anuncio recibido llama a onResult con su nombre y su RSSI', 'Elige el que te interesa (por nombre o por UUID de servicio) y se conecta', 'Busca su servicio y su característica, y se suscribe a sus notificaciones'], result: 'Escanear → filtrar → conectar → GATT' },
      Q('¿Qué cambia setActiveScan(true)?', ['Pide a cada anunciante su respuesta de escaneo, con más datos; gasta algo más', 'Escanea más lejos', 'Conecta solo', 'Apaga el WiFi'], 'El escaneo pasivo solo escucha.', { c: 'es_ble', h: 'Mira el dibujo del escaneo activo.' }),
      Q('WiFi, BLE y un servidor web juntos y te quedas sin RAM.', ['Pasar a NimBLE: ocupa bastante menos', 'Quitar la PSRAM', 'Subir la frecuencia', 'Usar Bluetooth clásico'], 'En el clásico la RAM se acaba antes que la CPU.', { c: 'es_coex', h: 'Lo probaste en la exploración.' }),
      Q('Audio por WiFi y un mando BLE a la vez dan cortes.', ['La radio se reparte por turnos: más búfer de audio o menos tráfico BLE', 'El BLE está roto', 'Falta un condensador', 'Hay que usar 5 GHz'], 'La coexistencia tiene coste.', { c: 'es_coex', h: 'Una radio, dos clientes que se turnan.' }),
      Q('Teclado por USB nativo (S3) frente a teclado BLE:', ['USB: sin emparejar ni batería; BLE: inalámbrico', 'Son idénticos', 'BLE es más rápido siempre', 'USB necesita WiFi'], 'Depende de si quieres cable o no.', { c: 'es_hid', h: 'Piensa en el cable y en la batería.' }),
      Q('¿Qué servicio estándar usas para informar del nivel de batería?', ['Battery Service (0x180F)', 'Un UUID inventado', 'El nombre del dispositivo', 'El RSSI'], 'Los sistemas operativos lo muestran solos.', { c: 'es_gatt', h: 'Era uno de los UUID de 16 bits de la lección anterior.' }),
      RES('Como <b>central</b>: escanear (pasivo o activo), filtrar, conectar y usar GATT.', '<b>NimBLE</b> ocupa mucha menos RAM que Bluedroid.', 'WiFi y BLE comparten radio: <b>coexistencia</b> con más retraso.', 'HID sobre GATT: teclado o ratón BLE sin drivers.')
    ]),
    L('es33', 'ESP-NOW: radio directa sin router', 'antenna', ['es_espnow', 'es_radiochoice', 'es_radiosec', 'es_rf'], [
      Q('Quieres un mando para un coche robot en mitad del campo, sin router. ¿Qué hace falta?', ['Nada más que dos ESP32: pueden hablarse directamente', 'Un router portátil obligatoriamente', 'Internet móvil', 'Un cable'], 'Con ESP-NOW, dos ESP32 se mandan mensajes cortos sin router ni conexión. Y si el mando falla, el coche debe saberlo.', { predict: true, c: 'es_radiochoice', h: 'La radio WiFi del ESP32 sabe hacer más cosas que conectarse a un router.' }),
      { t: 'explore', text: 'El mando envía órdenes cada pocos ms y se pierde algún paquete. Si pasa cierto tiempo sin recibir nada, el coche se para (failsafe).', viz: 'es_espnow',
        params: { per: { label: 'Enviar cada', val: 20, list: [10, 20, 50, 100], unit: 'ms', dec: 0 }, loss: { label: 'Paquetes perdidos', val: 10, list: [0, 2, 5, 10, 20, 30], unit: '%', dec: 0 }, to: { label: 'Failsafe tras', val: 1000, list: [50, 100, 200, 300, 500, 1000, 2000], unit: 'ms', dec: 0 } },
        tasks: [
          { q: 'falsePerMin', min: 1, max: 1e9, text: 'Acorta la ventana hasta que el coche se pare en falso más de una vez por minuto', done: 'Con pocos paquetes en la ventana, unas pocas pérdidas seguidas bastan para pararlo.', hint: 'Failsafe muy corto.' },
          { q: 'good', min: 1, max: 1, text: 'Equilibrio: que pare en menos de 400 ms si el mando muere y casi nunca en falso', done: 'Unos 300 ms con envíos cada 20 ms: hacen falta 15 pérdidas seguidas para una falsa alarma.' }] },
      I('<b>ESP-NOW</b> es un protocolo de Espressif que usa la radio WiFi para enviar tramas cortas <b>directamente</b> entre ESP32, por su dirección MAC: sin router, sin conexión, con pocos milisegundos de retraso. Cada mensaje admite hasta <b>250 bytes</b> (las versiones recientes de ESP-IDF amplían el límite).', {
        svg: SV(100, `${bx(10, 30, 80, 40, 'mando', 'var(--led)', W)}${bx(210, 30, 80, 40, 'coche', 'var(--led)', W)}${ar(90, 50, 210, 50, 'currentColor', 'class="a-flow"')}${tx(150, 42, '≤ 250 bytes', 'vizsm', 'text-anchor="middle"')}${tx(150, 90, 'sin router, por MAC', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Enviar es registrar al otro como «par» y mandar:', { code: '#include <WiFi.h>\n#include <esp_now.h>\nuint8_t otro[6] = {0x24, 0x6F, 0x28, 0x11, 0x22, 0x33};\n\nvoid setup() {\n  WiFi.mode(WIFI_STA);\n  esp_now_init();\n  esp_now_peer_info_t par = {};\n  memcpy(par.peer_addr, otro, 6);\n  par.channel = 0;          // 0: el canal actual\n  esp_now_add_peer(&par);\n}\n\nvoid loop() {\n  int16_t x = analogRead(34);\n  esp_now_send(otro, (uint8_t *)&x, sizeof(x));\n  delay(20);\n}' }),
      I('Detalles que importan:\n· Los dos deben estar en el <b>mismo canal</b> WiFi.\n· Unos 20 pares registrados; también <b>broadcast</b> a FF:FF:FF:FF:FF:FF, sin confirmación.\n· En unicast, el callback de envío dice si la radio del otro confirmó la trama, no si tu programa la procesó.', {
        svg: SV(100, `${[1, 6, 11].map((c, i) => bx(10 + i * 96, 30, 86, 36, 'canal ' + c, c === 6 ? 'var(--ok)' : 'var(--ice-soft)', c === 6 ? W : '')).join('')}${tx(150, 88, 'emisor y receptor, en el mismo', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Como no hay conexión, si el mando se queda sin batería nadie avisa. El receptor debe notarlo por tiempo (un <b>failsafe</b>): si pasan unos cientos de ms sin paquetes, a un estado seguro. Y lo que va por radio lo oye cualquiera en el canal: para órdenes delicadas, cifrado (PMK y LMK) y números de secuencia.', {
        svg: SV(100, `${Array.from({ length: 12 }, (_, i) => `<rect x="${10 + i * 14}" y="30" width="8" height="22" fill="var(--led)"/>`).join('')}<rect x="180" y="30" width="110" height="22" fill="none" stroke="var(--err)" stroke-dasharray="4 3"/>${tx(235, 46, 'silencio…', 'vizsm', 'text-anchor="middle" fill="var(--err)"')}${tx(235, 76, '¡para!', 'vizlab', 'text-anchor="middle" fill="var(--err)"')}`) }),
      { t: 'steps', text: 'Envías cada 20 ms y el failsafe salta a los 300 ms. ¿Cuántos paquetes seguidos deben perderse para pararse sin motivo?', steps: ['En 300 ms caben 300 / 20 = 15 envíos', 'Para parar sin motivo, se tienen que perder los 15 seguidos', 'Con un 10 % de pérdidas: 0,1 elevado a 15, prácticamente imposible', 'Y si el mando muere de verdad, el coche para en 0,3 s'], result: '15 seguidos: casi nunca en falso, y reacción rápida' },
      Q('El receptor está conectado a un router en el canal 6 y no recibe nada.', ['El emisor debe transmitir en el canal 6 también', 'Falta la contraseña del router', 'ESP-NOW necesita internet', 'Hay que usar BLE'], 'La radio solo escucha un canal a la vez.', { c: 'es_espnow', h: 'Una radio, un canal.' }),
      Q('¿Cuántos bytes caben en un mensaje de ESP-NOW clásico?', ['250', '31', '1 MB', '20'], '31 es el anuncio BLE y 20 el paquete GATT por defecto.', { c: 'es_espnow', h: 'No lo confundas con BLE.' }),
      Q('El callback de envío devuelve éxito. ¿Qué garantiza?', ['Que la radio del receptor confirmó la trama, no que tu programa la procesara', 'Que el receptor la ha guardado', 'Nada', 'Que hay internet'], 'Si necesitas confirmación de verdad, que el otro responda.', { c: 'es_espnow', h: '¿Quién confirma: la radio o tu código?' }),
      Nm('50 paquetes por segundo de 12 bytes de datos. ¿Bytes por segundo de carga útil?', 600, 'B/s', '50 × 12 = 600 B/s: nada para la radio.', { tol: 1, c: 'es_espnow', h: 'Paquetes por segundo por bytes de cada uno.' }),
      { t: 'match', q: '¿Qué radio usarías?', pairs: [['Mando de coche sin router', 'ESP-NOW'], ['Ver datos en la app del móvil', 'BLE'], ['Enviar datos a internet', 'WiFi'], ['Nodo que despierta, envía y duerme', 'ESP-NOW ']], c: 'es_radiochoice', h: 'Internet: WiFi. Móvil: BLE. Entre ESP32, al momento: ESP-NOW.' },
      Q('Con ESP-NOW sin cifrado, ¿quién puede leer tus mensajes?', ['Cualquier receptor en el canal', 'Nadie, va cifrado siempre', 'Solo el router', 'Solo dispositivos emparejados por BLE'], 'Para órdenes delicadas, cifrado con clave y números de secuencia.', { c: 'es_radiosec', h: 'Registrar un par no cifra nada.' }),
      Q('El alcance de ESP-NOW es parecido al del WiFi del ESP32. Para alargarlo…', ['Antena externa, línea de vista y, si ambos son ESP32, el modo Long Range de Espressif', 'Más bytes por mensaje', 'Más mensajes por segundo', 'Usar el ADC2'], 'En campo abierto y con buenas antenas se llega a cientos de metros.', { c: 'es_rf', h: '¿Qué mejoraba el RSSI en la lección de antenas?' }),
      RES('<b>ESP-NOW</b>: tramas de hasta 250 bytes entre ESP32, por MAC, sin router; los dos en el mismo canal.', 'El éxito del envío solo significa que la radio del otro la recibió.', '<b>Failsafe</b>: sin paquetes en unos cientos de ms, a estado seguro.', 'Elegir: internet → WiFi; móvil → BLE; entre ESP32, rápido → ESP-NOW.')
    ]),
    PRJ('es-p16', 'Proyecto: coche robot con mando ESP-NOW', 'es_rccar'),
    PRJ('es-p17', 'Proyecto: mando de presentaciones BLE', 'es_blekbd'),
    PRJ('es-p18', 'Proyecto: detector de presencia con balizas', 'es_beacon')
  ];

  const M8 = [
    L('es34', 'Modos de sueño', 'sleep', ['es_sleep', 'es_battlife'], [
      Q('Un nodo despierta cada 10 minutos, trabaja 5 s y duerme el resto a 10 µA. ¿Qué parte crees que gasta más batería?', ['Los 5 s despierto', 'Los casi 10 minutos dormido', 'Las dos igual', 'Ninguna'], 'Aunque dure poco, despierto gasta miles de veces más. Compruébalo con números.', { predict: true, c: 'es_battlife', h: 'Compara corriente × tiempo en cada parte.' }),
      { t: 'explore', text: 'Un nodo a batería de 2000 mAh despierta cada 10 minutos a 120 mA. Cambia cuánto tiempo pasa despierto y cuánto gasta dormido (la placa entera, no solo el chip).', viz: 'es_sleep',
        params: { Ia: { val: 120, fixed: true }, ta: { label: 'Tiempo despierto', val: 8, min: 0.5, max: 20, step: 0.5, unit: 's', dec: 1 }, T: { val: 10, fixed: true }, Is: { label: 'Consumo dormido', val: 1000, list: [10, 25, 60, 150, 1000, 5000], unit: 'µA', dec: 0 }, C: { val: 2000, fixed: true } },
        tasks: [
          { q: 'Is', min: 10, max: 10, text: 'Baja el consumo dormido al mínimo (10 µA)', done: 'Mejora, pero poco: la parte despierta sigue mandando.', hint: 'Mueve «Consumo dormido» a la izquierda.' },
          { q: 'days', min: 365, max: 1e6, text: 'Ahora consigue más de un año', done: 'Acortar el rato despierto es lo que más rinde: 1 s a 120 mA cada 10 min y 10–25 µA dormido.', hint: 'Ataca el tiempo despierto.' }] },
      I('Del que más gasta al que menos (ESP32 clásico, valores orientativos):\n· <b>Activo con WiFi</b>: decenas a cientos de mA.\n· <b>Modem sleep</b>: CPU activa, radio dormida entre balizas.\n· <b>Light sleep</b>: CPU en pausa y RAM conservada, ~0,8 mA.\n· <b>Deep sleep</b>: solo el dominio RTC, ~10 µA.\n· <b>Hibernación</b>: solo un temporizador, ~5 µA.', {
        svg: SV(140, `${[['Activo + WiFi', 1], ['Modem sleep', 0.8], ['Light sleep', 0.55], ['Deep sleep', 0.3], ['Hibernación', 0.15]].map(([n, k], i) => `<rect x="10" y="${8 + i * 26}" width="${k * 200}" height="20" rx="4" fill="var(--led)" opacity="${0.3 + k * 0.6}"/>` + tx(16, 22 + i * 26, n, 'vizsm', 'fill="currentColor"')).join('')}${tx(290, 134, 'escala logarítmica', 'vizsm', 'text-anchor="end"')}`) }),
      I('Despertar del <b>deep sleep</b> es como un reinicio: el programa vuelve a empezar en setup(). Solo sobrevive lo que marques para la memoria RTC (unos 8 KB en el clásico).', { code: 'RTC_DATA_ATTR int despertares = 0;   // sobrevive al deep sleep\n\nvoid setup() {\n  despertares++;\n  // medir, enviar...\n  esp_sleep_enable_timer_wakeup(60ULL * 1000000);   // 60 s\n  esp_deep_sleep_start();\n}',
        more: 'La memoria RTC aguanta el sueño, pero no quitar la alimentación: para eso, NVS. El light sleep, en cambio, conserva toda la RAM y sigue justo donde estaba, con poco tiempo de despertar.' }),
      I('La batería se gasta con la corriente <b>media</b>:\n<b>Imedia = (Idesp · tdesp + Idorm · tdorm) / T</b>\nDuración = capacidad / Imedia. Y ojo: en una DevKit, el regulador, el USB-serie y el LED siguen gastando miliamperios aunque el chip duerma.', {
        svg: SV(120, `<path d="M20 20V100H290" stroke="currentColor" fill="none"/><rect x="21" y="28" width="26" height="72" fill="var(--led)"/><rect x="47" y="96" width="240" height="4" fill="#3E8FCB"/><path d="M20 82H290" stroke="var(--err)" stroke-dasharray="4 3"/>${tx(150, 76, 'la media: lo que ve la batería', 'vizsm', 'text-anchor="middle" fill="var(--err)"')}${tx(52, 40, 'despierto', 'vizsm')}${tx(200, 114, 'dormido', 'vizsm')}`) }),
      { t: 'steps', text: '2 s despierto a 100 mA y 598 s dormido a 10 µA, cada 10 minutos, con 2000 mAh. ¿Cuánto dura?', steps: ['Carga despierto: 100 mA × 2 s = 200 mA·s', 'Carga dormido: 0,01 mA × 598 s ≈ 6 mA·s', 'Imedia = (200 + 6) / 600 ≈ 0,343 mA', 'Días = 2000 / 0,343 / 24 ≈ <b>243 días</b>'], result: 'Unos 8 meses' },
      { t: 'match', q: 'Une cada modo con lo que conserva.', pairs: [['Light sleep', 'Toda la RAM: sigue donde estaba'], ['Deep sleep', 'Solo la memoria RTC'], ['Hibernación', 'Casi nada: solo el temporizador'], ['Modem sleep', 'Todo; solo duerme la radio']], c: 'es_sleep', h: 'Del sueño más ligero al más profundo, cada vez se conserva menos.' },
      Q('¿Qué pasa con la variable despertares si quitas la alimentación?', ['Se pierde: la memoria RTC sobrevive al deep sleep, no a un corte', 'Se conserva siempre', 'Se guarda en NVS sola', 'Se duplica'], 'Para sobrevivir a cortes, NVS.', { c: 'es_sleep', h: 'La memoria RTC necesita alimentación.' }),
      Q('Light sleep frente a deep sleep:', ['Light reanuda donde estaba en poco tiempo; deep reinicia el programa pero gasta mucho menos', 'Son iguales', 'Deep conserva la RAM', 'Light gasta menos'], 'Elige según cada cuánto tengas que despertar.', { c: 'es_sleep', h: 'Mira qué conserva cada uno.' }),
      G('es_sleepLife'),
      Q('Tu DevKit en deep sleep consume 8 mA medidos.', ['El chip duerme, pero el regulador, el USB-serie y el LED de la placa no', 'El deep sleep no funciona', 'Es lo que gasta el chip', 'El WiFi sigue encendido'], 'Para baterías: placa de bajo consumo o módulo con un regulador de poca corriente.', { c: 'es_sleep', h: '¿Qué más hay en la placa además del chip?' }),
      Nm('Corriente media de 0,5 mA y batería de 1200 mAh. ¿Cuántos días dura?', 100, 'días', '1200 / 0,5 = 2400 h = 100 días.', { tol: 0.5, c: 'es_battlife', h: 'Capacidad entre corriente media da horas; luego, entre 24.' }),
      G('es_sleepLife'),
      RES('Modos: activo → modem sleep → light (~0,8 mA) → deep (~10 µA) → hibernación (~5 µA).', 'Deep sleep reinicia el programa; solo sobrevive lo <b>RTC_DATA_ATTR</b> (y lo de NVS a los cortes).', '<b>Imedia = (Idesp · tdesp + Idorm · tdorm) / T</b>; duración = capacidad / Imedia.', 'La parte despierta suele mandar; y la placa entera también gasta.')
    ]),
    L('es35', 'Despertar: temporizador, EXT0, EXT1 y touch', 'sleep', ['es_wake', 'es_period', 'es_sleep'], [
      Q('Conectas un sensor de movimiento al GPIO 23 para despertar al ESP32 del deep sleep. ¿Crees que funcionará?', ['No: solo ciertos pines pueden despertar', 'Sí, cualquier pin vale', 'Solo con WiFi', 'Solo de noche'], 'Mientras duerme, solo sigue despierta la parte RTC del chip, y solo sus pines pueden llamarle. Búscalos.', { predict: true, c: 'es_wake', h: 'Mientras duerme, casi todo el chip está apagado.' }),
      { t: 'explore', text: 'Busca pines que puedan despertar al chip del deep sleep (los GPIO RTC).', viz: 'es_pins',
        params: { pin: { label: 'GPIO', val: 23, list: PINLIST, dec: 0 }, uso: { val: 3, fixed: true } },
        tasks: [
          { q: 'wakeOk', min: 1, max: 1, text: 'Encuentra un pin que pueda despertar al chip', done: 'Los GPIO RTC: 0, 2, 4, 12–15, 25–27 y 32–39.', hint: 'Prueba del 25 al 27, o el 32 y el 33.' },
          { q: 'wakeIn', min: 1, max: 1, text: 'Ahora uno de solo entrada que también despierte', done: 'Del 34 al 39 sirven para despertar, pero sin pull-ups: pon resistencias externas.' }] },
      I('Fuentes de despertar del deep sleep:\n· <b>Temporizador</b>: dentro de X microsegundos.\n· <b>EXT0</b>: un pin RTC a un nivel.\n· <b>EXT1</b>: varios pines RTC (en el clásico, «cualquiera alto» o «todos bajos»).\n· <b>Touch</b> y el coprocesador <b>ULP</b>.', {
        svg: SV(120, `<circle cx="150" cy="60" r="26" fill="#3E8FCB"/>${tx(150, 64, 'zzz', 'vizsm', 'text-anchor="middle" fill="#fff"')}${[['tiempo', 40, 20], ['EXT0', 40, 100], ['EXT1', 260, 20], ['touch', 260, 100], ['ULP', 150, 112]].map(([n, x, y]) => bx(x - 34, y - 14, 68, 24, n) + ar(x + (x < 150 ? 34 : x > 150 ? -34 : 0), y + (x === 150 ? -14 : 0), 150 + (x < 150 ? -24 : x > 150 ? 24 : 0), 60 + (y < 60 ? -10 : 10))).join('')}`) }),
      I('El temporizador recibe <b>microsegundos</b> en un número de 64 bits; los pines se eligen por número (EXT0) o con una máscara de bits (EXT1, como la de la matriz GPIO).', { code: 'esp_sleep_enable_timer_wakeup(15ULL * 60 * 1000000);   // 15 min\nesp_sleep_enable_ext0_wakeup(GPIO_NUM_33, 1);            // el 33 alto\nuint64_t mascara = (1ULL << 32) | (1ULL << 34);\nesp_sleep_enable_ext1_wakeup(mascara, ESP_EXT1_WAKEUP_ANY_HIGH);' }),
      I('Dormido, la parte digital está apagada: <b>INPUT_PULLUP no actúa</b>. Usa la pull-up RTC (rtc_gpio_pullup_en) o una resistencia externa. Para que una salida <b>mantenga su nivel</b> durmiendo (un MOSFET apagado, por ejemplo), se congela con gpio_hold_en().', {
        svg: SV(110, `${bx(10, 30, 120, 50, '', 'var(--line)')}${tx(70, 52, 'parte digital', 'vizlab', 'text-anchor="middle"')}${tx(70, 70, 'apagada', 'vizsm', 'text-anchor="middle"')}${bx(170, 30, 120, 50, '', 'var(--ok)')}${tx(230, 52, 'dominio RTC', 'vizlab', 'text-anchor="middle" fill="#fff"')}${tx(230, 70, 'sus pull-ups, sí', 'vizsm', 'text-anchor="middle" fill="#fff"')}${tx(150, 102, 'durmiendo, mandan las funciones RTC', 'vizsm', 'text-anchor="middle"')}`) }),
      { t: 'steps', text: '¿Qué valor pasas a esp_sleep_enable_timer_wakeup para 15 minutos?', steps: ['El temporizador cuenta en microsegundos', '15 min = 15 × 60 = 900 s', '900 s × 1 000 000 = <b>900 000 000 µs</b>', 'Escríbelo con ULL: a partir de unos 36 minutos ya no cabría en un int de 32 bits'], result: '900 000 000 µs' },
      Nm('¿Qué valor pasas para despertar cada 5 minutos, en µs?', 300000000, 'µs', '5 × 60 × 1 000 000 = 300 000 000 µs.', { tol: 1, c: 'es_period', h: 'Minutos a segundos y segundos a microsegundos.' }),
      Q('¿Qué hace este código al despertar?', ['Distingue si despertó por tiempo o por el pin y actúa en cada caso', 'Vuelve a dormir siempre', 'Borra la memoria RTC', 'Nada'], 'Imprescindible cuando hay varias fuentes.', { code: 'switch (esp_sleep_get_wakeup_cause()) {\n  case ESP_SLEEP_WAKEUP_TIMER: medir(); break;\n  case ESP_SLEEP_WAKEUP_EXT0:  alarma(); break;\n  default:                     primerArranque();\n}', c: 'es_wake', h: 'get_wakeup_cause: la causa del despertar.' }),
      Q('Un pulsador con INPUT_PULLUP para despertar con EXT0 por nivel bajo no funciona dormido.', ['La pull-up digital no actúa en sueño: usa rtc_gpio_pullup_en() o una resistencia externa', 'EXT0 no admite nivel bajo', 'Falta delay', 'El pulsador está mal'], 'En sueño mandan las funciones RTC del pin.', { c: 'es_wake', h: 'Mira el dibujo: ¿qué parte del chip está despierta?' }),
      Q('¿Qué significa ESP_EXT1_WAKEUP_ALL_LOW?', ['Despierta cuando todos los pines de la máscara están bajos', 'Cuando cualquiera está bajo', 'Nunca', 'Al pulsar EN'], 'En el clásico, para «cualquiera» solo existe la opción en alto.', { c: 'es_wake', h: 'ALL: todos.' }),
      { t: 'match', q: 'Une cada caso con su fuente de despertar.', pairs: [['Medir cada 10 minutos', 'Temporizador'], ['Un PIR detecta movimiento', 'EXT0'], ['Cualquiera de 4 botones', 'EXT1'], ['Tocar una lámina de cobre', 'Touch']], c: 'es_wake', h: 'EXT0 es un pin; EXT1, varios.' },
      Q('Con varios despertares, ¿dónde guardas cuántas veces ha despertado por cada fuente?', ['En variables RTC_DATA_ATTR (o en NVS si debe sobrevivir a cortes)', 'En variables normales', 'En la pila', 'No se puede'], 'Las variables normales se reinician en cada despertar.', { c: 'es_sleep', h: 'Despertar del deep sleep es como un reinicio.' }),
      Q('Quieres que un MOSFET siga apagado mientras el ESP32 duerme. ¿Qué usas?', ['gpio_hold_en() (con gpio_deep_sleep_hold_en()) para congelar el nivel del pin', 'digitalWrite y listo', 'Un delay largo', 'Nada: los pines nunca cambian'], 'Al despertar, se libera con gpio_hold_dis().', { c: 'es_wake', h: 'Hay que «congelar» el pin.' }),
      RES('Despiertan: temporizador (µs, 64 bits), <b>EXT0</b> (un pin), <b>EXT1</b> (máscara), touch y ULP.', 'Solo los <b>GPIO RTC</b>: 0, 2, 4, 12–15, 25–27 y 32–39.', 'Dormido, INPUT_PULLUP no actúa: pull-up RTC o externa; gpio_hold_en congela salidas.', 'Al despertar, esp_sleep_get_wakeup_cause() dice quién llamó.')
    ]),
    L('es36', 'Medir el consumo de verdad', 'gauge', ['es_burden', 'es_battlife', 'es_awake'], [
      Q('Mides el consumo del ESP32 con el multímetro en el rango de µA y, al despertar, se reinicia. ¿Por qué crees que pasa?', ['El multímetro mete una resistencia que roba tensión con los picos', 'El multímetro está roto', 'El ESP32 no admite multímetros', 'Por el WiFi'], 'Para medir corriente, el multímetro se pone en serie… con su propia resistencia dentro. Pruébalo.', { predict: true, c: 'es_burden', h: 'Para medir corriente, el multímetro va en serie.' }),
      { t: 'explore', text: 'El ESP32 duerme a 10 µA y al despertar pide un pico de 150 mA. Elige el rango del multímetro (que mete en serie una resistencia distinta en cada uno).', viz: 'es_burden',
        params: { r: { label: 'Rango (0 200 µA · 1 2 mA · 2 20 mA · 3 200 mA · 4 10 A)', val: 2, list: [0, 1, 2, 3, 4], dec: 0 }, pk: { val: 150, fixed: true } },
        tasks: [
          { q: 'readable', min: 1, max: 1, text: 'Busca un rango en el que se lean bien los 10 µA del sueño', done: 'Los rangos pequeños tienen resolución… y una resistencia enorme.', hint: 'Baja de rango.' },
          { q: 'survive', min: 1, max: 1, text: 'Ahora uno en el que el chip sobreviva al pico de 150 mA', done: 'Ninguno hace las dos cosas: mide el sueño y el despertar por separado, o usa un medidor dinámico.', hint: 'Sube de rango.' }] },
      I('En modo corriente, el multímetro mete una resistencia en serie (<b>shunt</b>) y en ella cae <b>V = I · R</b>. En los rangos pequeños es grande: con los picos del despertar, el ESP32 se queda sin tensión.', {
        svg: SV(110, `${tx(10, 34, '3,3 V', 'vizlab')}<path d="M50 30H110M190 30H240" stroke="currentColor" stroke-width="2"/><rect x="110" y="18" width="80" height="24" fill="var(--ice-soft)" stroke="currentColor"/>${tx(150, 34, 'shunt', 'vizsm', 'text-anchor="middle"')}${bx(240, 14, 54, 32, 'ESP32', 'var(--led)', W)}
          <path d="M110 60H190" stroke="var(--err)" stroke-width="2"/>${tx(150, 76, 'V = I · R se pierde aquí', 'vizsm', 'text-anchor="middle" fill="var(--err)"')}`),
        more: 'Remedios: puentear el multímetro durante el despertar y medir solo el sueño; medir dormido en µA y despierto en mA; o usar un medidor dinámico (como un PPK2 o un INA219) o una resistencia pequeña y un osciloscopio.' }),
      I('Un multímetro promedia despacio: no ve los picos ni te da la media de un ciclo completo. Para el presupuesto, lo que manda es la corriente <b>media</b>, y casi siempre ganas más <b>acortando el rato despierto</b> que rascando microamperios.', {
        svg: SV(110, `<path d="M20 90H50V20H70V90H160V20H180V90H290" fill="none" stroke="var(--led)" stroke-width="2.5"/><path d="M20 76H290" stroke="var(--err)" stroke-dasharray="4 3"/>${tx(200, 70, 'la media', 'vizsm', 'fill="var(--err)"')}${tx(80, 30, 'picos rápidos', 'vizsm')}`) }),
      I('Ideas que más rinden en un nodo: IP fija y canal guardado, o ESP-NOW en lugar de WiFi; sensores en modo de medida única; nada de divisores ni LED siempre conectados; y una placa con regulador de bajo consumo.', {
        svg: SV(100, `${[['acortar despierto', 0.9], ['bajar el sueño', 0.25], ['optimizar código', 0.1]].map(([n, k], i) => tx(10, 24 + i * 28, n, 'vizsm') + `<rect x="130" y="${12 + i * 28}" width="${k * 160}" height="16" rx="4" fill="var(--ok)"/>`).join('')}${tx(150, 96, 'lo que suele rendir (orientativo)', 'vizsm', 'text-anchor="middle"')}`) }),
      { t: 'steps', text: 'En el rango de mA el multímetro mete 10 Ω. Un pico de 150 mA al despertar, ¿qué pasa?', steps: ['Caída en el shunt: <b>V = I · R</b> = 0,15 A × 10 Ω', '= 1,5 V', 'El ESP32 se queda con 3,3 − 1,5 = 1,8 V', 'Muy por debajo de 3,0 V: brownout y reinicio'], result: 'El instrumento provoca el fallo' },
      Nm('Shunt de 1 Ω en el rango de 200 mA y un pico de 250 mA. ¿Cuánta tensión cae en él, en V?', 0.25, 'V', '0,25 × 1 = 0,25 V: el chip se queda con unos 3,05 V, justo.', { tol: 0.01, c: 'es_burden', h: 'V = I · R, con la corriente en amperios.' }),
      Q('El ESP32 se reinicia al despertar solo cuando el multímetro está en µA.', ['La resistencia del rango de µA provoca una caída enorme con los picos', 'El multímetro está roto', 'Es el ULP', 'Falta RAM'], 'Mide el sueño en µA y el resto en mA, o usa un medidor dinámico.', { c: 'es_burden', h: 'Recuerda la exploración: rango pequeño, resistencia grande.' }),
      G('es_sleepLife'),
      Q('Despiertas cada 10 minutos, 5 s a 120 mA para conectar al WiFi, y duermes a 20 µA. ¿Qué cambio rinde más?', ['Reducir el tiempo despierto (IP fija, canal guardado o ESP-NOW)', 'Bajar el sueño de 20 a 10 µA', 'Subir la CPU a 240 MHz', 'Quitar Serial'], 'La parte despierta supone 1 mA de media; la dormida, 0,02.', { c: 'es_awake', h: 'Calcula cuánto aporta cada parte a la media.' }),
      Q('Quieres la corriente media de un ciclo completo (sueño + despertar). ¿Con un multímetro normal?', ['Es difícil: promedia despacio y no ve los picos; mejor un medidor dinámico', 'Es lo ideal', 'Imposible siempre', 'Solo en alterna'], 'Un PPK2 o un INA219 registran la corriente en el tiempo.', { c: 'es_burden', h: '¿Ve el multímetro un pico de pocos milisegundos?' }),
      RES('El amperímetro mete un <b>shunt</b>: V = I · R le roba tensión al circuito.', 'Rangos pequeños: buena resolución, pero los picos reinician el chip; mide sueño y despertar por separado o con un medidor dinámico.', 'Manda la corriente <b>media</b>: acortar el rato despierto es lo que más rinde.')
    ]),
    L('es40', 'ULP y nodos solares', 'sleep', ['es_wake', 'es_lipo', 'es_battlife'], [
      Q('Un pluviómetro da un pulso cada vez que cae un poco de lluvia. Para contarlos durante meses a batería, ¿qué crees que es mejor?', ['Que un coprocesador diminuto cuente dormido y despierte a la CPU de vez en cuando', 'Despertar la CPU en cada pulso', 'Dejar la CPU siempre encendida', 'Contarlos por WiFi'], 'Ese coprocesador es el ULP. Y si además hay un panel solar, hay que hacer cuentas de invierno.', { predict: true, c: 'es_wake', h: 'Despertar la CPU principal es lo caro.' }),
      { t: 'explore', text: 'Un nodo con panel solar y batería en un día de invierno (modelo sencillo). Ajusta el panel, las horas de sol, lo que gasta el nodo y la batería.', viz: 'es_solar',
        params: { w: { label: 'Panel', val: 0.5, list: [0.5, 1, 2, 3], unit: 'W', dec: 1 }, h: { label: 'Horas de sol útil en invierno', val: 1.5, list: [1, 1.5, 2, 3, 4], unit: 'h', dec: 1 }, mah: { label: 'Consumo del nodo', val: 300, list: [50, 100, 300, 600, 1000], unit: 'mAh/día', dec: 0 }, bat: { label: 'Batería', val: 1000, list: [1000, 2000, 3000, 6000], unit: 'mAh', dec: 0 } },
        tasks: [
          { q: 'pos', min: 1, max: 1, text: 'Que en invierno entre más de lo que se gasta', done: 'El balance diario positivo es lo primero: panel mayor o nodo más frugal.', hint: 'Más panel o menos consumo.' },
          { q: 'five', min: 1, max: 1, text: 'Y que aguante 5 días seguidos sin sol', done: 'Días de autonomía = batería / consumo diario.' }] },
      I('El <b>ULP</b> es un coprocesador minúsculo que sigue funcionando en deep sleep: lee pines o el ADC y solo despierta a la CPU principal cuando hace falta. Despertar la CPU es lo caro; el ULP gasta muy poco.', {
        svg: SV(110, `${bx(10, 30, 110, 50, 'CPU: dormida', '#3E8FCB', W)}${bx(180, 30, 110, 50, 'ULP: cuenta', 'var(--ok)', W)}<circle cx="235" cy="20" r="6" fill="var(--led)" class="a-blink"/>${ar(180, 70, 120, 70, 'var(--led)', 'stroke-dasharray="4 3"')}${tx(150, 100, 'despierta a la CPU solo cada hora', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Cada familia tiene el suyo:\n· ESP32 clásico: <b>ULP-FSM</b>, programado en ensamblador.\n· S2 y S3: además, un <b>ULP RISC-V</b> programable en C.\n· C6: un núcleo de bajo consumo (LP).\nEn todos, la idea es la misma: trabajo pequeño sin despertar a la CPU grande.', {
        svg: SV(100, `${bx(6, 26, 92, 44, 'ULP-FSM')}${tx(52, 86, 'ensamblador', 'vizsm', 'text-anchor="middle"')}${bx(104, 26, 92, 44, 'ULP RISC-V')}${tx(150, 86, 'C (S2, S3)', 'vizsm', 'text-anchor="middle"')}${bx(202, 26, 92, 44, 'LP core')}${tx(248, 86, 'C6', 'vizsm', 'text-anchor="middle"')}`) }),
      I('<b>Solar</b>: dimensiona para el <b>peor mes</b> (en invierno hay pocas horas de sol útil) y con margen para varios días nublados seguidos. Y usa un cargador con protección.', {
        svg: SV(110, `${['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => { const h = [1.5, 2.2, 3.3, 4.3, 5.2, 5.8, 6, 5.4, 4.2, 3, 1.9, 1.3][i]; return `<rect x="${12 + i * 23}" y="${90 - h * 12}" width="18" height="${h * 12}" fill="${i === 0 || i === 11 ? 'var(--err)' : 'var(--led)'}" opacity=".8"/>` + tx(21 + i * 23, 104, m, 'vizsm', 'text-anchor="middle"'); }).join('')}${tx(150, 14, 'sol útil al día (ilustrativo)', 'vizsm', 'text-anchor="middle"')}`) }),
      I('Las celdas de litio <b>no deben cargarse por debajo de 0 °C</b> (ni con mucho calor): el litio se deposita como metal, la celda pierde capacidad y puede volverse peligrosa. En exterior, un cargador con sensor de temperatura (NTC) que corte la carga en frío.', {
        svg: SV(120, `<rect x="40" y="10" width="22" height="86" rx="11" fill="none" stroke="currentColor"/><circle cx="51" cy="104" r="13" fill="#3E8FCB"/><rect x="46" y="66" width="10" height="40" fill="#3E8FCB"/><path d="M30 66H140" stroke="var(--err)" stroke-dasharray="4 3"/>${tx(144, 70, '0 °C', 'vizlab', 'fill="var(--err)"')}${tx(100, 40, 'por debajo: no cargar', 'vizsm')}`) }),
      { t: 'steps', text: 'Un nodo gasta 0,4 mA de media. ¿Qué batería necesita para 5 días sin sol?', steps: ['mAh al día = 0,4 mA × 24 h = 9,6 mAh', 'Para 5 días: 5 × 9,6 = 48 mAh', 'Con margen para el frío y el envejecimiento (× 2): unos 100 mAh', 'Una celda de 1000 mAh va sobrada'], result: 'Unos 100 mAh útiles; una de 1000 mAh da mucho margen' },
      Q('En un ESP32-S3, ¿cómo se programa su ULP RISC-V?', ['En C', 'Solo en ensamblador', 'En Python', 'No tiene ULP'], 'El ULP-FSM del clásico sí es en ensamblador.', { c: 'es_wake', h: 'RISC-V es una CPU de verdad, aunque pequeña.' }),
      Q('Un nodo solar en el exterior, en enero, a −3 °C por la mañana:', ['El cargador debe impedir la carga bajo 0 °C: cargar litio helado lo daña y lo vuelve peligroso', 'Carga más rápido con frío', 'No pasa nada', 'Hay que subir la tensión'], 'Hay cargadores con sensor NTC para esto.', { c: 'es_lipo', h: 'Mira el termómetro.' }),
      Q('Dimensionas el panel de un nodo solar. ¿Con qué mes haces las cuentas?', ['Con el peor: diciembre o enero', 'Con la media del año', 'Con julio', 'Da igual'], 'Si aguanta el peor mes, aguanta todos.', { c: 'es_battlife', h: 'Mira las barras del sol.' }),
      Nm('Un nodo gasta 0,25 mA de media. ¿Cuántos mAh al día?', 6, 'mAh', '0,25 mA × 24 h = 6 mAh al día.', { tol: 0.05, c: 'es_battlife', h: 'Corriente media por las horas de un día.' }),
      Q('¿Por qué un cargador solar de exterior lleva sensor de temperatura?', ['Para no cargar el litio bajo 0 °C ni con mucho calor', 'Para medir el sol', 'Para el WiFi', 'Para calibrar el ADC'], 'La carga fuera de temperatura daña la celda.', { c: 'es_lipo', h: '¿Cuándo no se debe cargar una celda de litio?' }),
      RES('El <b>ULP</b> trabaja con el chip dormido y despierta a la CPU solo cuando hace falta.', 'Solar: cuentas con el <b>peor mes</b> y varios días sin sol (autonomía = batería / consumo diario).', 'Nunca cargar litio <b>bajo 0 °C</b>: cargador con NTC.')
    ]),
    L('es37', 'ESP-IDF: el entorno profesional', 'code', ['es_idf', 'es_idfpy', 'es_rtos'], [
      Q('Copias un ejemplo de ESP-IDF con vTaskDelay(10) pensando que espera 10 ms. ¿Qué crees que pasará?', ['Espera 100 ms: en ESP-IDF el tick suele ser de 100 Hz', 'Espera 10 ms', 'Espera 10 s', 'No compila'], 'vTaskDelay cuenta ticks, no milisegundos. Mira cómo evitar la trampa.', { predict: true, c: 'es_rtos', h: 'vTaskDelay no cuenta milisegundos, cuenta ticks.' }),
      { t: 'explore', text: 'vTaskDelay espera un número de ticks. Cambia el tick del sistema y la forma de escribir la espera.', viz: 'es_tick',
        params: { tick: { label: 'Tick', val: 1000, list: [100, 1000], unit: 'Hz', dec: 0 }, m: yn('Código (0 vTaskDelay(n) · 1 con pdMS_TO_TICKS)', 0), v: { label: 'n', val: 10, list: [1, 5, 10, 50, 100], dec: 0 } },
        tasks: [
          { q: 'd100', min: 1, max: 1, text: 'Pon el tick de ESP-IDF (100 Hz) con vTaskDelay(10)', done: '10 ticks de 10 ms = 100 ms: diez veces más de lo que querías.', hint: 'Tick a 100 Hz.' },
          { q: 'fixed', min: 1, max: 1, text: 'Arréglalo para esperar 10 ms sin cambiar el tick', done: 'pdMS_TO_TICKS convierte milisegundos en ticks: tu código vale para cualquier tick.' }] },
      I('<b>ESP-IDF</b> es el entorno oficial de Espressif: C, CMake, FreeRTOS y acceso a todo el chip. Arduino-ESP32 está construido encima. Con IDF controlas la configuración entera, los componentes, el ULP, la seguridad y el consumo fino.', {
        svg: SV(120, `${bx(20, 10, 120, 30, 'setup() + loop()', 'var(--led)', W)}${bx(20, 46, 120, 30, 'Arduino-ESP32')}${bx(160, 10, 120, 66, 'app_main()', '#3E8FCB', W)}${bx(20, 84, 260, 28, 'ESP-IDF + FreeRTOS')}`) }),
      I('El programa empieza en <b>app_main()</b>, que se ejecuta una vez dentro de una tarea: el bucle (o las tareas) los pones tú.', { code: '#include "freertos/FreeRTOS.h"\n#include "freertos/task.h"\n#include "esp_log.h"\n\nstatic const char *TAG = "app";\n\nvoid app_main(void) {\n    int n = 0;\n    while (1) {\n        ESP_LOGI(TAG, "Hola %d", n++);\n        vTaskDelay(pdMS_TO_TICKS(1000));\n    }\n}',
        more: 'ESP_LOGE, ESP_LOGW, ESP_LOGI y ESP_LOGD escriben con nivel de error, aviso, información y depuración. Puedes filtrar por nivel y por etiqueta (TAG).' }),
      I('<b>menuconfig</b> es el panel de control: frecuencia de CPU, tick de FreeRTOS, tamaño de flash, particiones, nivel de log, watchdogs, rollback, PSRAM… Todo se guarda en el archivo <b>sdkconfig</b>.', {
        svg: SV(110, `<rect x="40" y="10" width="220" height="90" rx="6" fill="#1b2330"/>${['> Component config', '    FreeRTOS  ---> tick 100 Hz', '    ESP System ---> CPU 240 MHz', '    Partition Table --->'].map((l, i) => `<text x="50" y="${30 + i * 18}" font-family="monospace" font-size="10" fill="#9fe39f">${l}</text>`).join('')}`) }),
      I('El código se organiza en <b>componentes</b>: carpetas con su CMakeLists.txt. Los de otros se añaden del registro de Espressif con idf.py add-dependency y quedan anotados en <b>idf_component.yml</b>, con sus versiones.', { code: '# main/CMakeLists.txt\nidf_component_register(SRCS "main.c" INCLUDE_DIRS ".")\n\n# idf.py add-dependency "espressif/led_strip^2.5"\n#   → queda anotado en main/idf_component.yml' }),
      { t: 'steps', text: 'Crea y graba tu primer proyecto para un ESP32-S3.', steps: ['idf.py create-project mi_app', 'idf.py set-target esp32s3 (antes de configurar: las opciones dependen del chip)', 'idf.py menuconfig: frecuencia, flash, particiones…', 'idf.py build y luego idf.py -p PUERTO flash monitor'], result: 'Crear → elegir chip → configurar → compilar → grabar y mirar' },
      { t: 'order', q: 'Ordena el flujo típico de un proyecto con idf.py.', items: ['idf.py create-project mi_app', 'idf.py set-target esp32s3', 'idf.py menuconfig', 'idf.py build', 'idf.py -p PUERTO flash monitor'], e: 'set-target va antes de configurar: la configuración depende del chip.', c: 'es_idfpy', h: 'El chip se elige antes de configurar.' },
      Q('¿En qué se diferencia app_main() de setup() + loop()?', ['Se ejecuta una vez en una tarea: el bucle (o las tareas) los pones tú', 'Es lo mismo', 'Se repite sola', 'No puede crear tareas'], 'Si app_main() termina, su tarea se borra, pero lo que creó sigue.', { c: 'es_idf', h: 'Mira el while (1) del ejemplo.' }),
      { t: 'match', q: 'Une cada macro de log con su nivel.', pairs: [['ESP_LOGE', 'Error'], ['ESP_LOGW', 'Aviso'], ['ESP_LOGI', 'Información'], ['ESP_LOGD', 'Depuración']], c: 'es_idf', h: 'La última letra da la pista (en inglés).' },
      Q('Con tick de 100 Hz, ¿cuánto espera vTaskDelay(pdMS_TO_TICKS(250))?', ['250 ms', '2,5 s', '25 ms', '2500 ms'], 'pdMS_TO_TICKS hace la cuenta por ti: 25 ticks de 10 ms.', { c: 'es_rtos', h: 'Para eso sirve pdMS_TO_TICKS.' }),
      Q('¿Para qué sirve idf_component.yml?', ['Declarar las dependencias del proyecto y sus versiones', 'Configurar el WiFi', 'Guardar los logs', 'Describir las particiones'], 'Así cualquiera reproduce tu proyecto con las mismas versiones.', { c: 'es_idfpy', h: 'Lo rellena idf.py add-dependency.' }),
      Q('¿Se pueden usar bibliotecas de Arduino dentro de un proyecto ESP-IDF?', ['Sí: Arduino-ESP32 se puede añadir como componente de IDF', 'No, nunca', 'Solo en el S3', 'Solo las de WiFi'], 'Lo mejor de los dos mundos, con algo de configuración.', { c: 'es_idf', h: 'Arduino-ESP32 está construido sobre IDF.' }),
      RES('ESP-IDF: el entorno oficial; el programa empieza en <b>app_main()</b>.', 'idf.py: create-project → set-target → menuconfig (sdkconfig) → build → flash monitor.', 'Componentes con CMakeLists y dependencias en idf_component.yml.', 'Esperas siempre con <b>pdMS_TO_TICKS</b>: el tick puede ser de 100 o de 1000 Hz.')
    ]),
    L('es38', 'Del Arduino-ESP32 a ESP-IDF', 'code', ['es_idf', 'es_mask', 'es_esperr', 'es_crash', 'es_idfpy'], [
      Q('En un equipo instalado, nvs_flash_init() falla al arrancar y el código usa ESP_ERROR_CHECK. ¿Qué crees que pasará?', ['Se reiniciará una y otra vez', 'Seguirá sin NVS', 'Se arreglará solo', 'Se apagará'], 'ESP_ERROR_CHECK aborta si algo falla. Para errores previsibles hay que hacer otra cosa.', { predict: true, c: 'es_esperr', h: '¿Qué hace ESP_ERROR_CHECK cuando algo falla?' }),
      { t: 'explore', text: 'Simula el arranque: nvs_flash_init() puede ir bien o devolver uno de dos errores típicos. Elige cómo lo trata tu código.', viz: 'es_err',
        params: { e: { label: 'Resultado (0 OK · 1 NVS llena · 2 NVS de otra versión)', val: 0, list: [0, 1, 2], dec: 0 }, mode: yn('Código (0 ESP_ERROR_CHECK · 1 tratar el error)', 0) },
        tasks: [
          { q: 'loop', min: 1, max: 1, text: 'Provoca el error con ESP_ERROR_CHECK', done: 'abort → reinicio → el mismo error: un bucle sin salida.', hint: 'Elige un resultado de error.' },
          { q: 'rec', min: 1, max: 1, text: 'Ahora trátalo', done: 'Borrar la NVS e iniciarla de nuevo es la receta oficial para esos dos errores.' }] },
      I('Casi todo tiene su equivalente en IDF. Cambia el nombre, no la idea.', {
        svg: SV(140, `${[['digitalWrite', 'gpio_set_level'], ['delay', 'vTaskDelay(ticks)'], ['Serial.println', 'ESP_LOGI'], ['Preferences', 'nvs_open / get / set'], ['WiFi.onEvent', 'esp_event_handler_…']].map(([a, b], i) => tx(10, 22 + i * 24, a, 'vizsm') + ar(92, 18 + i * 24, 112, 18 + i * 24) + tx(116, 22 + i * 24, b, 'vizlab', 'style="font-size:10.5px"')).join('')}`) }),
      I('Configurar pines en IDF: una estructura con una <b>máscara de bits</b> de 64 bits (un bit por pin, por eso 1ULL).', { code: 'gpio_config_t io = {\n    .pin_bit_mask = (1ULL << GPIO_NUM_4) | (1ULL << GPIO_NUM_5),\n    .mode = GPIO_MODE_INPUT,\n    .pull_up_en = GPIO_PULLUP_ENABLE,\n};\nESP_ERROR_CHECK(gpio_config(&io));' }),
      I('Casi todas las funciones de IDF devuelven un <b>esp_err_t</b>: ESP_OK o un código de error. ESP_ERROR_CHECK(x) aborta con archivo, línea y error si x falla: perfecto mientras desarrollas. Lo previsible, trátalo:', { code: 'esp_err_t r = nvs_flash_init();\nif (r == ESP_ERR_NVS_NO_FREE_PAGES || r == ESP_ERR_NVS_NEW_VERSION_FOUND) {\n    ESP_ERROR_CHECK(nvs_flash_erase());\n    r = nvs_flash_init();\n}\nESP_ERROR_CHECK(r);' }),
      I('Los eventos del sistema van por un <b>bucle de eventos</b> (esp_event_handler_register), la misma idea que WiFi.onEvent. Y <b>idf.py monitor</b> decodifica el backtrace de un pánico y te da archivo y línea; <b>idf.py size</b> te dice qué ocupa cada parte.', {
        svg: SV(100, `${bx(10, 30, 90, 40, 'evento WiFi')}${ar(100, 50, 130, 50)}${bx(130, 30, 70, 40, 'bucle', 'var(--led)', W)}${ar(200, 50, 220, 50)}${bx(220, 30, 72, 40, 'tu manejador')}`) }),
      I('¿Cuándo pasar a IDF? Productos, OTA segura con rollback, consumo muy fino, ULP, tests automáticos, control exacto de versiones. ¿Cuándo quedarse en Arduino? Prototipos rápidos y cuando una biblioteca lista te ahorra semanas.', {
        svg: SV(100, `<path d="M60 60H240" stroke="currentColor" stroke-width="3"/><path d="M150 60l-12 22h24z" fill="currentColor"/>${bx(20, 30, 90, 26, 'Arduino', 'var(--ok)', W)}${bx(190, 30, 90, 26, 'ESP-IDF', '#3E8FCB', W)}${tx(65, 76, 'rapidez', 'vizsm', 'text-anchor="middle"')}${tx(235, 76, 'control', 'vizsm', 'text-anchor="middle"')}`) }),
      { t: 'steps', text: 'Construye .pin_bit_mask para los GPIO 4 y 33.', steps: ['Cada pin es un bit de un número de 64 bits', '1ULL << 4 = 0x10', '1ULL << 33 = 0x200000000: no cabría en 32 bits, por eso ULL', 'Se juntan: (1ULL << 4) | (1ULL << 33) = <b>0x200000010</b>'], result: '0x200000010' },
      { t: 'match', q: 'Une cada función de Arduino con su equivalente en IDF.', pairs: [['digitalWrite', 'gpio_set_level'], ['delay', 'vTaskDelay(pdMS_TO_TICKS(ms))'], ['Serial.println', 'ESP_LOGI o printf'], ['Preferences', 'nvs_open, nvs_get, nvs_set']], c: 'es_idf', h: 'Mira la tabla de equivalencias.' },
      Q('¿Qué configura el fragmento de gpio_config de la tarjeta?', ['Los GPIO 4 y 5 como entradas con pull-up', 'El GPIO 45 como salida', 'Un PWM', 'Todos los pines'], 'La máscara tiene un bit por pin.', { code: '.pin_bit_mask = (1ULL << GPIO_NUM_4) | (1ULL << GPIO_NUM_5),\n.mode = GPIO_MODE_INPUT,\n.pull_up_en = GPIO_PULLUP_ENABLE,', c: 'es_mask', h: 'Cada desplazamiento marca un pin.' }),
      Q('ESP_ERROR_CHECK es buena idea para…', ['Errores que no deberían ocurrir nunca, mientras desarrollas', 'Cualquier fallo de red en producción', 'Leer sensores que a veces fallan', 'Nada'], 'Lo previsible se trata; lo imposible, que aborte y avise.', { c: 'es_esperr', h: 'Recuerda el bucle de reinicios de la exploración.' }),
      Q('¿Qué ventaja tiene idf.py monitor cuando falla el programa?', ['Decodifica el backtrace y muestra archivo y línea', 'Arregla el fallo', 'Sube la velocidad', 'Nada'], 'Además puedes filtrar por etiqueta y nivel de log.', { c: 'es_crash', h: 'Piensa en el Backtrace de un Guru Meditation.' }),
      Q('Prototipo de fin de semana con una pantalla y un sensor que ya tienen biblioteca Arduino:', ['Arduino-ESP32: llegas antes', 'ESP-IDF puro obligatoriamente', 'Ensamblador', 'Da igual siempre'], 'La herramienta según el objetivo.', { c: 'es_idf', h: 'Mira hacia dónde se inclina la balanza.' }),
      Q('¿Qué te enseña idf.py size?', ['Cuánto ocupa cada parte del firmware en flash y en RAM', 'El tamaño de la placa', 'La velocidad del WiFi', 'La pila de cada tarea'], 'Imprescindible cuando la app no cabe en su partición.', { c: 'es_idfpy', h: 'Size: tamaño… ¿de qué?' }),
      RES('Equivalencias: gpio_set_level, vTaskDelay(pdMS_TO_TICKS), ESP_LOGx, nvs_*, bucle de eventos.', 'gpio_config usa una <b>máscara de 64 bits</b> (1ULL << pin).', '<b>esp_err_t</b>: ESP_ERROR_CHECK para lo imposible; lo previsible, se trata (borrar NVS y reintentar).', 'idf.py monitor decodifica pánicos; idf.py size dice qué ocupa.')
    ]),
    PRJ('es-p19', 'Proyecto: estación de sensores a batería', 'es_station'),
    PRJ('es-p20', 'Proyecto: fototrampa con ESP32-CAM', 'es_cam'),
    PRJ('es-p21', 'Proyecto: tu nodo en ESP-IDF puro', 'es_idfport'),
    PRJ('es-p22', 'Proyecto final: invernadero inteligente', 'es_final')
  ];

  /* ===================== EXPLICACIONES ALTERNATIVAS: APOYO VISUAL ===================== */
  /* Cada concepto tiene al menos una alternativa visual (svg) o interactiva (tune). */
  Object.assign(CONCEPTS, {
    es_ir: { name: 'Infrarrojos: portadora y protocolo NEC', alts: [
      { title: 'Una luz que parpadea a propósito', text: 'Un mando IR no deja su LED encendido sin más: lo hace parpadear a unos <b>38 kHz</b> en ráfagas. La luz del sol o de una lámpara no parpadea así, y el receptor (un TSOP38238) solo responde a esa frecuencia. Su salida va <b>invertida</b>: baja mientras dura una ráfaga y alta en silencio. La información está en cuánto duran las ráfagas y los silencios.', q: mcq('¿Para qué modula el mando su luz a 38 kHz?', ['Para que el receptor la distinga de la luz ambiente', 'Para gastar más pila', 'Para que se vea mejor', 'Porque es la frecuencia del WiFi'], 'El receptor filtra todo lo que no parpadea a esa frecuencia.') },
      { title: 'Con números', text: 'En NEC, cada bit empieza con una ráfaga de unos 0,56 ms. Lo que cambia es la pausa: <b>0,56 ms para un 0</b> y <b>1,69 ms para un 1</b>. Un 0 dura 1,125 ms en total y un 1, 2,25 ms. Para decodificar, compara cada pausa con un umbral a medio camino (unos 1,12 ms). La trama lleva dirección, dirección invertida, comando y comando invertido, primero el bit 0 de cada byte.', q: mcq('Una pausa mide 1650 µs. ¿Qué bit es?', ['Un 1', 'Un 0', 'Un error seguro', 'La cabecera'], 'Supera el umbral de unos 1120 µs.') },
      { title: 'Míralo en la señal', text: 'Cambia el byte de comando y mira cómo se estira la señal: cada 1 añade una pausa larga. Cuenta los unos y comprueba la duración total de los 8 bits: 1,125 ms por cada 0 y 2,25 ms por cada 1.', tune: { viz: 'es_nec', params: { cmd: { label: 'Comando', val: 69, min: 0, max: 255, step: 1, dec: 0 } } },
        q: mcq('¿Cuánto duran los 8 bits del comando 0x0F (cuatro unos y cuatro ceros)?', ['13,5 ms', '9 ms', '18 ms', '4,5 ms'], '4 × 2,25 + 4 × 1,125 = 13,5 ms.') }
    ] }
  });
  const addAlt = (k, a) => { if (CONCEPTS[k]) CONCEPTS[k].alts.push(a); };
  const visAlt = (k, i, x) => { if (CONCEPTS[k] && CONCEPTS[k].alts[i]) Object.assign(CONCEPTS[k].alts[i], x); };
  const T = (viz, params) => ({ viz, params });
  const L01 = (label, val) => ({ label, val, list: [0, 1], dec: 0 });

  // --- Módulo 1 ---
  addAlt('es_mem', { title: 'Haz sitio en la RAM', text: 'Mira la RAM como una barra que se llena: el WiFi ocupa su parte, tu búfer la suya, y lo que no cabe en la SRAM tiene que ir a la PSRAM. Mueve los deslizadores y observa cuándo deja de caber.', tune: T('es_ram', { wifi: L01('WiFi (0 · 1)', 1), ble: { val: 0, fixed: true }, buf: { label: 'Tu búfer', val: 100, min: 0, max: 400, step: 10, unit: 'KB', dec: 0 }, psram: L01('PSRAM (0 · 1)', 0) }),
    q: mcq('Con el WiFi encendido, un búfer de 280 KB no cabe en la SRAM. ¿Qué lo resuelve?', ['Un módulo con PSRAM', 'Más flash', 'Bajar la CPU a 80 MHz', 'Usar el núcleo 0'], 'La flash no es RAM de trabajo; la PSRAM sí.') });
  visAlt('es_module', 0, { svg: SV(150, `<rect x="10" y="10" width="280" height="130" rx="12" fill="none" stroke="currentColor"/>${tx(20, 28, 'Placa: USB, regulador, botones', 'vizsm')}<rect x="40" y="38" width="220" height="92" rx="10" fill="var(--ice-soft)" stroke="currentColor"/>${tx(50, 56, 'Módulo: flash, cristal, antena', 'vizsm')}<rect x="115" y="68" width="70" height="50" rx="6" fill="var(--led)"/>${tx(150, 98, 'Chip', 'vizlab', 'text-anchor="middle" fill="#fff"')}`) });
  addAlt('es_cores', { title: 'Reparte y mira', text: 'Cada núcleo tiene 10 ms de CPU cada 10 ms. El 0 lleva la radio y el 1 lleva loop(). Pon tu tarea Sensor, que necesita 8 ms de cada 10, en uno u otro núcleo y mira cuál aguanta.', tune: T('es_sched', { core: { label: 'Núcleo de Sensor', val: 1, list: [0, 1], dec: 0 }, prio: { val: 2, fixed: true }, ms: { val: 8, fixed: true }, wait: { val: 1, fixed: true } }),
    q: mcq('loop() usa 4 ms de cada 10 en el núcleo 1 y la radio unos 1,5 ms en el 0. ¿Dónde cabe una tarea de 7 ms cada 10?', ['En el núcleo 0', 'En el núcleo 1', 'En ninguno', 'Partida en los dos'], 'En el 1 serían 11 ms de cada 10; en el 0, unos 8,5.') });
  addAlt('es_period', { title: 'Mueve el reloj', text: 'Cambia la frecuencia de la CPU y mira cuánto dura un ciclo en el título del dibujo. Doble de frecuencia, mitad de periodo: <b>T = 1 / f</b>, siempre con f en hercios.', tune: T('es_cpu', { f: { label: 'Frecuencia', val: 240, list: [10, 20, 40, 80, 160, 240], unit: 'MHz', dec: 0 }, radio: { val: 0, fixed: true } }),
    q: mcq('A 160 MHz, ¿cuánto dura un ciclo?', ['6,25 ns', '160 ns', '0,625 ns', '62,5 ns'], '1 / 160 000 000 s = 0,00000000625 s = 6,25 ns.') });
  addAlt('es_family', { title: 'Filtra por requisitos', text: 'Activa lo que necesita tu proyecto y mira qué chips quedan encendidos. Cada requisito tacha a los que no lo tienen: si queda uno, ya has elegido; si no queda ninguno, algún requisito sobra.', tune: T('es_pick', { bt: { label: 'Bluetooth (0 · 1 BLE · 2 clásico)', val: 0, list: [0, 1, 2], dec: 0 }, usb: L01('USB nativo (0 · 1)', 0), z: L01('Zigbee (0 · 1)', 0), wifi: L01('WiFi (0 · 1)', 0) }),
    q: mcq('Necesitas USB nativo y Bluetooth clásico a la vez. ¿Qué chip?', ['Ninguno de la familia tiene las dos cosas', 'S3', 'ESP32 clásico', 'C3'], 'El clásico tiene Bluetooth clásico pero no USB nativo; el S3, al revés.') });
  visAlt('es_hid', 1, { svg: SV(130, `${tx(10, 20, 'ESP32 clásico', 'vizlab')}${bx(10, 30, 60, 30, 'chip', 'var(--led)', W)}${ar(70, 45, 100, 45)}${bx(100, 30, 80, 30, 'USB-serie')}${ar(180, 45, 210, 45)}${bx(210, 30, 80, 30, 'puerto COM')}
    ${tx(10, 84, 'ESP32-S3', 'vizlab')}${bx(10, 94, 60, 30, 'chip', 'var(--led)', W)}${ar(70, 109, 210, 109, 'var(--ok)')}${bx(210, 94, 80, 30, 'teclado', 'var(--ok)', W)}${tx(140, 104, 'USB nativo', 'vizsm', 'text-anchor="middle"')}`) });
  visAlt('es_upload', 0, { svg: SV(130, `${tx(10, 30, 'EN', 'vizlab')}<path d="M60 36H110V16H290" fill="none" stroke="var(--led)" stroke-width="2.5"/>${tx(10, 80, 'GPIO 0', 'vizlab')}<path d="M60 66H90V86H150V66H290" fill="none" stroke="#3E8FCB" stroke-width="2.5"/><path d="M110 10V96" stroke="var(--muted)" stroke-dasharray="3 3"/>${tx(114, 110, 'al arrancar, GPIO 0 bajo → modo descarga', 'vizsm')}`) });
  addAlt('es_ldo', { title: 'Pruébalo con el regulador', text: 'Sube y baja la tensión de entrada y la corriente. Fíjate en dos cosas: por debajo de cierta entrada la salida ya no llega a 3,3 V (falta margen), y por encima todo lo que sobra se convierte en calor, (Vin − 3,3) × I.', tune: T('es_ldo', { vin: { label: 'VIN', val: 5, list: [3, 3.3, 3.5, 3.7, 3.9, 4.2, 5, 7, 9, 12], unit: 'V', dec: 1 }, i: { label: 'Corriente', val: 200, min: 10, max: 600, step: 10, unit: 'mA', dec: 0 }, tipo: L01('Regulador (0 AMS1117 · 1 LDO de poca caída)', 0) }),
    q: mcq('Con 7 V en VIN y 300 mA, ¿cuánto calor disipa el regulador?', ['Unos 1,1 W', 'Unos 0,3 W', 'Unos 2,1 W', 'Nada'], '(7 − 3,3) × 0,3 = 1,11 W.') });
  visAlt('es_crash', 1, { svg: SV(110, `${bx(6, 30, 86, 40, 'Backtrace')}${ar(92, 50, 112, 50)}${bx(112, 30, 90, 40, 'decodificador')}${ar(202, 50, 222, 50)}${bx(222, 30, 72, 40, 'archivo:línea', 'var(--ok)', W)}${tx(150, 96, 'No adivines: traduce las direcciones', 'vizsm', 'text-anchor="middle"')}`) });
  visAlt('es_wdt', 1, { text: 'El watchdog avisa de un problema de diseño: un bucle de espera activa o una tarea prioritaria que nunca se bloquea. Desactivar el watchdog solo calla el aviso; y llamar a esp_task_wdt_reset() en ese bucle ni eso, porque el vigilado es IDLE0. La solución es bloquearse de verdad (vTaskDelay, una cola, una notificación).' });
  addAlt('es_wdt', { title: 'Provoca y arregla', text: 'El núcleo 0 tiene una tarea IDLE que el watchdog vigila. Alarga el bucle de espera de tu tarea y mira cuándo salta el aviso; luego prueba a callar el watchdog y a ceder la CPU, y compara qué pasa con IDLE0.', tune: T('es_wdt', { busy: { label: 'Bucle de espera', val: 6, min: 0, max: 10, step: 1, unit: 's', dec: 0 }, cede: { label: 'En el bucle (0 nada · 1 vTaskDelay(1) · 2 desactivar watchdog)', val: 0, list: [0, 1, 2], dec: 0 } }),
    q: mcq('Desactivas el watchdog y el aviso desaparece. ¿Está arreglado?', ['No: IDLE0 sigue sin poder correr', 'Sí, del todo', 'Sí, y además ahorra energía', 'Solo si el bucle dura menos de 5 s'], 'Hay que ceder la CPU, no callar al vigilante.') });
  addAlt('es_heap', { title: 'Mira los huecos', text: 'Mueve el número de Strings que crecen y se liberan. El total libre apenas cambia, pero el hueco contiguo más grande se encoge: la memoria queda troceada. Prueba luego con reserve() al inicio.', tune: T('es_heap', { n: { label: 'Strings que crecen y se liberan', val: 40, min: 0, max: 60, step: 5, dec: 0 }, res: L01('reserve() al inicio (0 · 1)', 0) }),
    q: mcq('¿Qué número dice si cabe una reserva de 40 KB seguidos?', ['El bloque contiguo más grande', 'ESP.getFreeHeap()', 'El tamaño de la flash', 'La pila de loop()'], 'Una reserva necesita un hueco de una pieza.') });
  addAlt('es_cpufreq', { title: 'Baja la frecuencia', text: 'Mueve la frecuencia con el WiFi encendido. Por debajo de 80 MHz la radio deja de funcionar; por encima, cuanto más rápido, antes acaba el trabajo.', tune: T('es_cpu', { f: { label: 'Frecuencia', val: 240, list: [10, 20, 40, 80, 160, 240], unit: 'MHz', dec: 0 }, radio: L01('WiFi (0 · 1)', 1) }),
    q: mcq('¿Cuál es la frecuencia de CPU más baja con la que funciona el WiFi?', ['80 MHz', '40 MHz', '160 MHz', '10 MHz'], 'Por debajo, la radio no funciona.') });
  visAlt('es_secure', 1, { svg: SV(120, `${bx(10, 20, 130, 54, '', 'var(--ice-soft)')}${tx(75, 40, 'Ataque físico', 'vizlab', 'text-anchor="middle"')}${tx(75, 60, 'cifrado + Secure Boot', 'vizsm', 'text-anchor="middle"')}${bx(160, 20, 130, 54, '', 'var(--ice-soft)')}${tx(225, 40, 'Ataque por red', 'vizlab', 'text-anchor="middle"')}${tx(225, 60, 'contraseñas, TLS, firma', 'vizsm', 'text-anchor="middle"')}${tx(150, 100, 'Cifrado y Secure Boot se graban en eFuses: irreversible', 'vizsm', 'text-anchor="middle"')}`) });

  // --- Módulo 2 ---
  addAlt('es_brown', { title: 'Pon un depósito', text: 'La radio pide 240 mA durante 1 ms. Si la fuente no da tanto en ese instante, la tensión se hunde. Prueba una fuente débil y añade condensador hasta que la tensión no baje de 3,0 V.', tune: T('es_supply', { src: { label: 'Fuente a tiempo', val: 150, list: [100, 150, 200, 300, 500, 800], unit: 'mA', dec: 0 }, c: { label: 'Condensador', val: 0, list: [0, 10, 100, 220, 470, 1000], unit: 'µF', dec: 0 }, r: { val: 0.5, fixed: true } }),
    q: mcq('Faltan 90 mA durante 1 ms y pones 470 µF. ¿Cuánto baja la tensión?', ['Unos 0,19 V', 'Unos 1,9 V', 'Unos 0,019 V', 'Nada'], 'ΔV = 0,09 × 0,001 / 0,00047 ≈ 0,19 V.') });
  visAlt('es_ledres', 0, { svg: SV(110, `${bx(6, 30, 50, 30, 'GPIO', 'var(--led)', W)}${tx(31, 76, '3,3 V', 'vizsm', 'text-anchor="middle"')}<path d="M56 45H90" stroke="currentColor" stroke-width="2"/><rect x="90" y="38" width="44" height="14" fill="var(--ice-soft)" stroke="currentColor"/>${tx(112, 32, 'R', 'vizlab', 'text-anchor="middle"')}<path d="M134 45H160" stroke="currentColor" stroke-width="2"/><path d="M160 34V56L178 45Z" fill="#FF3B30"/><path d="M178 34V56M178 45H200" stroke="currentColor" stroke-width="2"/>${tx(169, 72, 'Vf', 'vizsm', 'text-anchor="middle"')}${tx(206, 49, 'GND', 'vizsm')}${tx(150, 100, 'R = (3,3 − Vf) / I', 'vizlab', 'text-anchor="middle"')}`) });
  visAlt('es_3v3', 1, { svg: SV(130, `${bx(10, 20, 70, 30, 'Chip 5 V')}${ar(80, 35, 140, 35)}${tx(110, 28, 'bajar', 'vizsm', 'text-anchor="middle"')}${bx(140, 20, 60, 30, 'divisor')}${ar(200, 35, 220, 35)}${bx(220, 20, 70, 30, 'ESP32', 'var(--led)', W)}
    ${bx(10, 80, 70, 30, 'ESP32', 'var(--led)', W)}${ar(80, 95, 120, 95)}${bx(120, 80, 90, 30, '74AHCT125')}${ar(210, 95, 220, 95)}${tx(150, 74, 'subir', 'vizsm', 'text-anchor="middle"')}${bx(220, 80, 70, 30, 'Chip 5 V')}`) });
  addAlt('es_strap', { title: 'Juega con los pines de arranque', text: 'Cambia el nivel de cada pin de arranque y mira cómo decide arrancar el chip. Fíjate en que solo importa el instante en que sueltas EN.', tune: T('es_strap', { g0: L01('GPIO 0', 1), g2: L01('GPIO 2', 0), g12: L01('GPIO 12', 0), g15: L01('GPIO 15', 1) }),
    q: mcq('El GPIO 0 está bajo y el 2 también al arrancar. ¿Qué hace el chip?', ['Entra en modo descarga', 'Arranca tu programa', 'No arranca nunca', 'Silencia la ROM'], 'Es justo lo que hace el botón BOOT.') });
  addAlt('es_pinmap', { title: 'Explora el mapa', text: 'Recorre los pines y mira las etiquetas de cada uno: flash, solo entrada, arranque, puerto serie… Elige el uso y la ficha te dice si es buena idea.', tune: T('es_pins', { pin: { label: 'GPIO', val: 9, list: PINLIST, dec: 0 }, uso: { label: 'Uso (0 LED · 1 pulsador)', val: 0, list: [0, 1], dec: 0 } }),
    q: mcq('¿Qué pin vale para un pulsador con INPUT_PULLUP?', ['GPIO 27', 'GPIO 36', 'GPIO 7', 'GPIO 39'], 'El 36 y el 39 no tienen pull-ups y el 7 es de la flash.') });
  addAlt('es_adcpins', { title: 'Busca un pin analógico', text: 'Con el uso fijado en «analógico con WiFi», recorre los pines: solo se ilumina en verde lo que tiene ADC y además pertenece al ADC1.', tune: T('es_pins', { pin: { label: 'GPIO', val: 25, list: PINLIST, dec: 0 }, uso: { val: 2, fixed: true } }),
    q: mcq('¿Qué pin lee un sensor analógico con el WiFi activo?', ['GPIO 35', 'GPIO 27', 'GPIO 21', 'GPIO 0'], 'El 27 y el 0 son del ADC2 y el 21 no tiene ADC.') });
  addAlt('es_adc', { title: 'Recorre la curva', text: 'Mueve la tensión y la atenuación. El punto verde está en la zona fiable; el rojo, fuera. Busca para cada atenuación dónde acaba la zona verde.', tune: T('es_adc', { V: { label: 'Tensión', val: 1.5, min: 0, max: 3.3, step: 0.05, unit: 'V', dec: 2 }, at: { label: 'Atenuación', val: 11, list: [0, 2.5, 6, 11], unit: 'dB', dec: 1 } }),
    q: mcq('Una señal llega a 2,2 V. ¿Qué atenuación eliges?', ['11 dB', '6 dB', '2,5 dB', '0 dB'], 'Solo 11 dB llega hasta unos 2,45 V.') });
  addAlt('es_divbat', { title: 'Diseña el divisor', text: 'Elige R1 y R2 para una batería de 4,2 V. Tres cosas a la vez: el pin dentro de la zona fiable, poco consumo y que el ADC muestree bien (con resistencias grandes, el condensador lo arregla).', tune: T('es_vdiv', { r1: { label: 'R1', val: 100, list: [10, 22, 47, 100, 220, 470, 1000, 2200], unit: 'kΩ', dec: 0 }, r2: { label: 'R2', val: 100, list: [10, 22, 47, 100, 220, 470, 1000, 2200], unit: 'kΩ', dec: 0 }, vb: { val: 4.2, fixed: true }, cap: L01('100 nF (0 · 1)', 0) }),
    q: mcq('R1 = R2 = 470 kΩ con 4,2 V. ¿Cuánto gasta el divisor?', ['Unos 4,5 µA', 'Unos 45 µA', 'Unos 0,45 µA', 'Unos 4,5 mA'], '4,2 / 940 000 ≈ 0,0000045 A.') });
  addAlt('es_noise', { title: 'Mueve α', text: 'Baja α y mira la línea naranja: el ruido se aplana, pero el salto real tarda más en notarse. Busca el punto en que te sirven las dos cosas.', tune: T('es_ema', { a: { label: 'α', val: 0.5, list: [1, 0.5, 0.2, 0.1, 0.05, 0.02], dec: 2 }, ruido: { val: 60, fixed: true } }),
    q: mcq('Pasas de α = 0,2 a α = 0,05. ¿Qué cambia?', ['Más suave y más lento en reaccionar', 'Más ruidoso', 'Más rápido', 'Nada'], 'Cada lectura nueva pesa menos.') });
  visAlt('es_cal2p', 0, { svg: SV(130, `<path d="M30 14V110H290" stroke="currentColor" fill="none"/><path d="M50 98L270 26" stroke="var(--led)" stroke-width="2.5"/><circle cx="80" cy="88" r="5" fill="var(--ok)"/><circle cx="240" cy="36" r="5" fill="var(--ok)"/>${tx(86, 106, 'punto 1 (L1, V1)', 'vizsm')}${tx(150, 30, 'punto 2 (L2, V2)', 'vizsm')}${tx(30, 126, 'Cualquier lectura cae sobre la recta', 'vizsm')}`) });
  addAlt('es_hyst', { title: 'Separa los umbrales', text: 'Con los dos umbrales juntos, cada vez que el ruido cruza la línea el LED cambia. Sepáralos y cuenta las conmutaciones: cuando la franja es más ancha que el ruido, el LED solo cambia cuando debe.', tune: T('es_hyst', { gap: { label: 'Separación', val: 0, min: 0, max: 600, step: 50, unit: 'cuentas', dec: 0 }, ruido: { val: 250, fixed: true } }),
    q: mcq('El ruido de la lectura es de ±100 cuentas. ¿Qué separación entre umbrales tiene sentido?', ['Algo más de 200 cuentas', '10 cuentas', '0', 'Un único umbral'], 'La franja debe ser mayor que el baile del ruido.') });
  addAlt('es_bus', { title: 'Conecta por la matriz', text: 'Elige un periférico y un pin. Los digitales llegan casi a cualquier sitio por la matriz; el ADC solo a sus pines fijos.', tune: T('es_matrix', { per: { label: 'Periférico (0 SDA · 1 UART TX · 2 PWM · 3 ADC)', val: 1, list: [0, 1, 2, 3], dec: 0 }, pin: { label: 'GPIO', val: 26, list: PINLIST, dec: 0 } }),
    q: mcq('¿Puede la UART2 sacar su TX por el GPIO 4?', ['Sí: la matriz lo conecta', 'No, solo por el 17', 'Solo con WiFi apagado', 'Solo a 9600 baudios'], 'Lo digital se enruta por la matriz.') });
  addAlt('es_mask', { title: 'Arma la máscara', text: 'Elige uno o dos pines y el registro. Mira cómo cambian los pines marcados y cómo los demás se quedan como estaban.', tune: T('es_mask', { a: { label: 'Primer pin', val: 25, list: [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27], dec: 0 }, b: { label: 'Segundo pin (−1 ninguno)', val: -1, list: [-1, 2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27], dec: 0 }, op: L01('0 W1TS · 1 W1TC', 1) }),
    q: mcq('¿Qué máscara marca los GPIO 2 y 4?', ['0x14', '0x6', '0x24', '0x42'], '(1 << 2) | (1 << 4) = 4 + 16 = 20 = 0x14.') });
  addAlt('es_bustime', { title: 'Cronometra el bus', text: 'Elige bus, velocidad y número de bytes. Fíjate en cuántos bits viajan de verdad: 10 por byte en UART, 9 por byte en I²C más la dirección, 8 en SPI.', tune: T('es_bustime', { proto: { label: 'Bus (0 UART · 1 I²C · 2 SPI)', val: 0, list: [0, 1, 2], dec: 0 }, v: { label: 'Velocidad (0 · 1 · 2)', val: 1, list: [0, 1, 2], dec: 0 }, n: { label: 'Bytes', val: 16, list: [1, 2, 6, 16, 100, 1000], dec: 0 } }),
    q: mcq('¿Cuánto tardan 1000 bytes por UART a 115 200 baudios?', ['Unos 87 ms', 'Unos 8,7 ms', 'Unos 69 ms', 'Unos 870 ms'], '10 000 bits / 115 200 ≈ 0,087 s.') });

  // --- Módulo 3 ---
  addAlt('es_ledc', { title: 'Busca el límite', text: 'Elige una frecuencia y sube los bits hasta que el dibujo se ponga rojo: ahí f × 2^bits ha pasado de 80 MHz. Repite con otra frecuencia: cada vez que la duplicas, pierdes un bit.', tune: T('es_ledc', { f: { label: 'Frecuencia', val: 20000, list: LEDCF, unit: 'Hz', dec: 0 }, bits: { label: 'Bits', val: 8, min: 1, max: 20, step: 1, unit: 'bits', dec: 0 } }),
    q: mcq('A 40 kHz, ¿cuántos bits caben como máximo?', ['10', '11', '12', '16'], '80 000 000 / 40 000 = 2000 cuentas: 1024 (10 bits) cabe; 2048, no.') });
  addAlt('es_duty', { title: 'Pruébalo', text: 'Cambia los bits y el valor de ledcWrite y mira la forma de onda: el tiempo en alto es valor / 2^bits del periodo. Con 50 Hz, el periodo es de 20 ms, como el de un servo.', tune: T('es_duty', { bits: { label: 'Bits', val: 12, list: [8, 10, 12, 14, 16], unit: 'bits', dec: 0 }, val: { label: 'Valor', val: 2048, list: [0, 64, 128, 255, 256, 512, 1024, 2048, 3072, 4095, 4096, 4915, 8192, 16384, 32768, 65535], dec: 0 }, f: { label: 'Frecuencia', val: 50, list: [50, 1000, 5000], unit: 'Hz', dec: 0 } }),
    q: mcq('Con 8 bits, ¿qué valor da un 50 %?', ['128', '255', '50', '512'], '0,5 × 256 = 128.') });
  visAlt('es_ledctimer', 1, { svg: SV(120, `${bx(10, 42, 80, 36, 'Temporizador', 'var(--led)', W)}${ar(90, 52, 128, 28)}${ar(90, 68, 128, 94)}<path d="M134 38V14H164V38H194V14H224V38H254V14H284" fill="none" stroke="#3E8FCB" stroke-width="2"/><path d="M134 108V84H146V108H194V84H206V108H254V84H266V108" fill="none" stroke="var(--ok)" stroke-width="2"/>${tx(20, 100, 'mismo compás', 'vizsm')}${tx(20, 114, 'distinto ciclo', 'vizsm')}`) });
  addAlt('es_dac', { title: 'Mueve el valor', text: 'Mueve el valor de dacWrite: a la izquierda, la tensión continua del DAC; a la derecha, un PWM con el mismo valor, que solo da esa tensión de media. Cada escalón del DAC vale unos 13 mV.', tune: T('es_dac', { n: { label: 'Valor', val: 64, min: 0, max: 255, step: 1, dec: 0 } }),
    q: mcq('dacWrite(25, 255). ¿Qué tensión sale, aproximadamente?', ['3,3 V', '2,55 V', '5 V', '0 V'], '255 / 255 × 3,3 V.') });
  addAlt('es_touch', { title: 'Acerca el dedo', text: 'Acerca el dedo a la lámina y mira cómo baja la lectura. Luego coloca el umbral entre la lectura sin tocar y la lectura tocando: ni por encima de la base (detectaría siempre) ni pegado al valor tocando (fallaría a veces).', tune: T('es_touch', { dedo: { label: 'Dedo', val: 0, min: 0, max: 100, step: 5, unit: '%', dec: 0 }, um: { label: 'Umbral', val: 40, min: 10, max: 80, step: 2, dec: 0 } }),
    q: mcq('Base sin tocar 90, tocando 30 (ESP32 clásico). ¿Umbral razonable?', ['60', '95', '30', '10'], 'A medio camino, con margen hacia los dos lados.') });
  visAlt('es_rmt', 0, { svg: SV(120, `${['(1, 0,8 µs)', '(0, 0,45 µs)', '(1, 0,4 µs)', '(0, 0,85 µs)'].map((s, i) => bx(6 + i * 73, 8, 68, 24, s)).join('')}${ar(150, 36, 150, 52)}<path d="M20 100V64H84V100H120V64H152V100H290" fill="none" stroke="var(--led)" stroke-width="2.5"/>${tx(150, 116, 'pares nivel–duración → pulsos exactos', 'vizsm', 'text-anchor="middle"')}`) });
  addAlt('es_ws2812', { title: 'Cuenta LED', text: 'Mueve el número de LED y el brillo. El tiempo de envío crece 30 µs por LED (24 bits × 1,25 µs) y la corriente, hasta 60 mA por LED en blanco.', tune: T('es_ws', { n: { label: 'LED', val: 30, list: [1, 8, 16, 30, 60, 100, 144, 300], dec: 0 }, br: { label: 'Brillo', val: 100, min: 0, max: 100, step: 5, unit: '%', dec: 0 }, col: L01('Color (0 blanco · 1 rojo)', 0) }),
    q: mcq('¿Cuánto tarda en enviarse una tira de 100 LED?', ['3 ms', '30 ms', '0,3 ms', '1,25 ms'], '100 × 24 × 1,25 µs = 3000 µs.') });
  visAlt('es_i2s', 0, { svg: SV(110, `${tx(6, 24, 'BCLK', 'vizsm')}<path d="M50 28${Array.from({ length: 16 }, (_, i) => `V${i % 2 ? 28 : 12}H${58 + i * 15}`).join('')}" fill="none" stroke="var(--led)" stroke-width="1.6"/>${tx(6, 60, 'WS', 'vizsm')}<path d="M50 64V48H170V64H290" fill="none" stroke="#3E8FCB" stroke-width="2"/>${tx(6, 96, 'DATA', 'vizsm')}<path d="M50 100V84H80V100H110V84H170V100H200V84H290" fill="none" stroke="var(--ok)" stroke-width="2"/>`) });
  addAlt('es_i2sbuf', { title: 'Juega con el búfer', text: 'Cambia la frecuencia de muestreo, los bits, los canales y el tamaño del búfer. Arriba ves BCLK y el caudal; abajo, si el búfer aguanta el retraso de tu tarea. Margen = muestras / frecuencia.', tune: T('es_i2s', { fs: { label: 'Muestreo', val: 48000, list: [8000, 16000, 22050, 44100, 48000], unit: 'Hz', dec: 0 }, bits: { label: 'Bits', val: 16, list: [16, 32], dec: 0 }, ch: { label: 'Canales', val: 2, list: [1, 2], dec: 0 }, buf: { label: 'Búfer', val: 512, list: [128, 256, 512, 1024, 2048], unit: 'muestras', dec: 0 }, wifi: { label: 'Retraso', val: 20, min: 0, max: 100, step: 5, unit: 'ms', dec: 0 } }),
    q: mcq('Un búfer de 512 muestras a 48 000 Hz, ¿cuánto margen da?', ['Unos 10,7 ms', 'Unos 107 ms', 'Unos 1,07 ms', 'Unos 94 ms'], '512 / 48 000 ≈ 0,0107 s.') });
  visAlt('es_buses', 1, { svg: SV(130, `${tx(10, 18, 'I²C: se llama por la dirección', 'vizsm')}${bx(10, 26, 60, 26, 'ESP32', 'var(--led)', W)}<path d="M70 39H290" stroke="currentColor"/>${['0x3C', '0x76', '0x68'].map((a, i) => bx(100 + i * 64, 44, 56, 22, a)).join('')}
    ${tx(10, 88, 'SPI: se señala con el CS', 'vizsm')}${bx(10, 94, 60, 26, 'ESP32', 'var(--led)', W)}${['CS1', 'CS2', 'CS3'].map((a, i) => bx(100 + i * 64, 98, 56, 22, a)).join('')}`) });
  visAlt('es_isr', 1, { svg: SV(120, `${bx(10, 44, 60, 32, 'CPU', 'var(--led)', W)}${bx(100, 10, 70, 30, 'caché')}${bx(200, 10, 90, 30, 'flash')}${bx(100, 80, 70, 30, 'IRAM', 'var(--ok)', W)}${ar(70, 54, 100, 30)}<path d="M170 25H200" stroke="var(--err)" stroke-width="2" stroke-dasharray="4 3"/>${ar(70, 66, 100, 92, 'var(--ok)')}${tx(176, 100, 'la ISR vive aquí', 'vizsm', 'fill="var(--ok)"')}`) });
  addAlt('es_bounce', { title: 'Ajusta la ventana', text: 'Cada bajada del pin dispara la interrupción. Sube la ventana de antirrebote hasta que una pulsación cuente una sola vez, y prueba con un pulsador que rebota más.', tune: T('es_bounce', { reb: { label: 'Rebotes', val: 5, list: [0.5, 1, 3, 5, 8], unit: 'ms', dec: 1 }, win: { label: 'Ventana', val: 0, min: 0, max: 30, step: 1, unit: 'ms', dec: 0 } }),
    q: mcq('El pulsador rebota durante 6 ms. ¿Qué ventana pones?', ['Unos 20 ms', '2 ms', '0 ms', '1 s'], 'Más larga que los rebotes y corta para un humano.') });
  addAlt('es_race', { title: 'Pierde sumas', text: 'Dos tareas suman mil veces cada una. Quita la protección, pon las tareas en núcleos distintos y mira el resultado. Luego prueba volatile, un mutex y una sección crítica.', tune: T('es_race', { cores: L01('Núcleos (0 el mismo · 1 distintos)', 1), prot: { label: 'Protección (0 nada · 1 volatile · 2 mutex · 3 crítica)', val: 0, list: [0, 1, 2, 3], dec: 0 } }),
    q: mcq('¿Qué protección NO evita que se pierdan sumas?', ['volatile', 'Un mutex', 'Una sección crítica', 'Usar una sola tarea'], 'volatile no hace atómico el ++.') });

  // --- Módulo 4 ---
  visAlt('es_task', 1, { svg: SV(140, `${bx(100, 10, 100, 28, 'Ejecutándose', 'var(--led)', W)}${bx(10, 70, 80, 28, 'Lista')}${bx(210, 70, 80, 28, 'Bloqueada')}${bx(100, 110, 100, 26, 'Suspendida', 'var(--line)')}
    ${ar(90, 76, 116, 40)}${ar(200, 38, 226, 70)}${ar(210, 90, 90, 90)}${tx(150, 84, 'llega el evento', 'vizsm', 'text-anchor="middle"')}${tx(238, 56, 'espera', 'vizsm')}${tx(40, 54, 'turno', 'vizsm')}`) });
  addAlt('es_rtos', { title: 'Espera activa frente a vTaskDelay', text: 'La tarea Sensor necesita 3 ms de cada 10 en el núcleo 1, donde también corre loop(). Cambia su forma de esperar: con espera activa nunca suelta la CPU; con vTaskDelay se bloquea y deja trabajar a las demás.', tune: T('es_sched', { core: { val: 1, fixed: true }, prio: { label: 'Prioridad de Sensor', val: 3, min: 1, max: 5, step: 1, dec: 0 }, ms: { val: 3, fixed: true }, wait: { label: 'Espera (0 activa · 1 vTaskDelay)', val: 0, list: [0, 1], dec: 0 } }),
    q: mcq('Con espera activa, ¿qué les pasa a las tareas de menor prioridad de ese núcleo?', ['No se ejecutan', 'Se ejecutan igual', 'Pasan al otro núcleo solas', 'Se borran'], 'La espera activa nunca cede la CPU.') });
  addAlt('es_taskstack', { title: 'Llena la pila', text: 'Cada tarea tiene su pila. Mueve el tamaño del array local y activa printf: mira cuánto queda libre en el peor caso. Por debajo de unos 512 bytes, cualquier cambio la desborda.', tune: T('es_stack', { st: { label: 'Pila', val: 2048, list: [1024, 2048, 3072, 4096, 6144, 8192], unit: 'bytes', dec: 0 }, arr: { label: 'Array local', val: 200, min: 0, max: 3000, step: 100, unit: 'bytes', dec: 0 }, pf: L01('printf (0 · 1)', 1) }),
    q: mcq('Pila de 3072 bytes y la marca de agua alta es 2500. ¿Cuánto ha usado como máximo?', ['572 bytes', '2500 bytes', '5572 bytes', '3072 bytes'], '3072 − 2500 = 572.') });
  addAlt('es_sync', { title: 'Llena la cola', text: 'Un sensor manda ráfagas y otra tarea las procesa. Cambia el tamaño de la cola y la velocidad del consumidor: mira cuándo se pierden datos y cuándo ninguna cola basta.', tune: T('es_queue', { b: { label: 'Ráfaga', val: 10, list: [1, 2, 5, 10, 20], unit: 'datos', dec: 0 }, c: { label: 'Consumidor', val: 20, list: [1, 3, 5, 10, 20, 50], unit: 'datos/s', dec: 0 }, L: { label: 'Cola', val: 5, list: [1, 2, 3, 5, 10, 20, 50], dec: 0 } }),
    q: mcq('Ráfagas de 10 datos y una cola de 5, con xQueueSend sin esperar. ¿Qué pasa?', ['Se pierden datos de cada ráfaga', 'No se pierde nada', 'Se bloquea el consumidor', 'Se reinicia'], 'No cabe una ráfaga entera.') });
  visAlt('es_mutex', 0, { svg: SV(130, `${bx(10, 20, 80, 30, 'Tarea A', 'var(--led)', W)}${bx(210, 20, 80, 30, 'Tarea B', '#3E8FCB', W)}${bx(110, 80, 80, 34, 'OLED (I²C)')}<rect x="138" y="58" width="24" height="18" rx="4" fill="#D9A21B"/>${tx(150, 71, 'llave', 'vizsm', 'text-anchor="middle" style="font-size:8px"')}${ar(70, 50, 130, 80, 'var(--ok)')}<path d="M230 50L180 80" stroke="var(--muted)" stroke-dasharray="4 3"/>${tx(232, 74, 'espera', 'vizsm')}${tx(30, 74, 'usa', 'vizsm', 'fill="var(--ok)"')}`) });

  // --- Módulo 5 ---
  addAlt('es_flash', { title: 'Elige el esquema', text: 'Cambia el esquema de particiones y el tamaño de tu programa. Mira el reparto de la flash: más sitio para la aplicación quiere decir menos para archivos o renunciar a la OTA.', tune: T('es_part', { s: { label: 'Esquema (0 defecto · 1 Huge · 2 Minimal SPIFFS · 3 No OTA)', val: 0, list: [0, 1, 2, 3], dec: 0 }, kb: { label: 'Tu programa', val: 1600, list: [800, 1200, 1600, 2000, 2500, 3200], unit: 'KB', dec: 0 } }),
    q: mcq('Tu programa ocupa 1,8 MB y quieres conservar la OTA. ¿Qué esquema?', ['Minimal SPIFFS (dos apps de 1,9 MB)', 'Huge APP', 'El de por defecto', 'No OTA'], 'Es el único con dos huecos de app de ese tamaño.') });
  addAlt('es_ota', { title: 'Corta la luz', text: 'Simula una actualización: corta la descarga a medias, márcala o no, valídala o no, con y sin rollback. Mira qué versión arranca en cada caso.', tune: T('es_ota', { prog: { label: 'Descargado', val: 50, list: [0, 25, 50, 75, 100], unit: '%', dec: 0 }, mark: L01('otadata (0 · 1)', 0), valid: L01('Validada (0 · 1)', 0), rb: L01('Rollback (0 · 1)', 1) }),
    q: mcq('Con rollback, la versión nueva arranca pero se cuelga antes de validarse. ¿Qué arranca después?', ['La anterior', 'La nueva, para siempre', 'Ninguna', 'La de fábrica'], 'La nueva no demostró que funcionaba.') });
  addAlt('es_wear', { title: 'Calcula la vida', text: 'Elige cuántas veces por hora borras un sector y entre cuántos sectores se reparte. La vida es 100 000 borrados divididos entre los borrados por sector y día.', tune: T('es_wear', { w: { label: 'Borrados por hora', val: 60, list: [1, 6, 60, 600, 3600, 36000], dec: 0 }, sec: { label: 'Sectores', val: 1, list: [1, 4, 10, 100], dec: 0 } }),
    q: mcq('60 borrados por hora en un solo sector. ¿Cuánto dura?', ['Unos 69 días', 'Unos 11 años', 'Unos 4 días', 'Para siempre'], '1440 al día: 100 000 / 1440 ≈ 69 días.') });
  visAlt('es_nvs', 0, { svg: SV(130, `${bx(10, 14, 130, 104, '', 'var(--ice-soft)')}${tx(20, 32, 'espacio "app"', 'vizlab')}${bx(20, 42, 110, 28, 'arranques = 7')}${bx(20, 80, 110, 28, 'volumen = 12')}${bx(160, 14, 130, 104, '', 'var(--ice-soft)')}${tx(170, 32, 'espacio "wifi"', 'vizlab')}${bx(170, 42, 110, 28, 'ssid = "Casa"')}${bx(170, 80, 110, 28, 'clave = "…"')}`) });
  addAlt('es_lfs', { title: 'Llena la partición', text: 'Elige el tamaño de la partición, cuántos bytes ocupa cada línea y cada cuánto escribes. Mira cuántos días tardas en llenarla: días = espacio / bytes al día.', tune: T('es_lfs', { kb: { label: 'Partición', val: 1408, list: [128, 192, 896, 1408, 1984], unit: 'KB', dec: 0 }, b: { label: 'Bytes por línea', val: 64, list: [16, 32, 64, 128], dec: 0 }, cada: { label: 'Una línea cada', val: 1, list: [1, 5, 10, 30, 60], unit: 'min', dec: 0 } }),
    q: mcq('Escribes 100 bytes cada 10 minutos en 1 400 000 bytes libres. ¿Cuánto dura?', ['Unos 97 días', 'Unos 9,7 días', 'Unos 970 días', 'Unos 2 días'], '14 400 bytes al día: 1 400 000 / 14 400 ≈ 97.') });
  visAlt('es_persist', 1, { svg: SV(140, `${[['Subir programa', 'app', 1], ['LittleFS.begin(true)', 'archivos (si no monta)', 2], ['erase_flash', 'todo: app, NVS, archivos', 3]].map(([n, d, k], i) => `<rect x="10" y="${10 + i * 42}" width="${90 + k * 60}" height="32" rx="6" fill="var(--err)" opacity="${0.25 + k * 0.2}"/>` + tx(16, 30 + i * 42, n, 'vizlab') + tx(160, 30 + i * 42, d, 'vizsm')).join('')}`) });

  // --- Módulo 6 ---
  visAlt('es_wifi', 1, { svg: SV(120, `<circle cx="150" cy="60" r="26" fill="var(--led)"/>${tx(150, 64, 'radio', 'vizsm', 'text-anchor="middle" fill="#fff"')}${bx(10, 40, 80, 40, 'STA → router')}${bx(210, 40, 80, 40, 'AP propio')}${ar(124, 60, 92, 60)}${ar(176, 60, 208, 60)}${tx(150, 108, 'una radio = un canal para las dos', 'vizsm', 'text-anchor="middle"')}`) });
  addAlt('es_wifirobust', { title: 'Apaga el router', text: 'El router se apaga un rato. Compara tres formas de esperarlo: un bucle sin límite, un bucle con límite de tiempo y eventos. Mira cuánto tiempo se queda bloqueado tu programa.', tune: T('es_reconnect', { off: { label: 'Router apagado', val: 60, list: [10, 30, 60, 120], unit: 's', dec: 0 }, to: { label: 'Límite (0 = sin límite)', val: 0, list: [0, 5, 10, 15, 30], unit: 's', dec: 0 }, ev: L01('Forma (0 bucle · 1 eventos)', 0) }),
    q: mcq('Con eventos, ¿qué hace tu programa mientras no hay WiFi?', ['Sigue con su trabajo local y reintenta en segundo plano', 'Se queda esperando', 'Se reinicia', 'Borra la configuración'], 'Los eventos avisan sin bloquear.') });
  addAlt('es_awake', { title: 'Acorta el rato despierto', text: 'Prueba los dos mandos: el tiempo despierto y el consumo dormido. Mira la barra de «carga gastada»: casi siempre la parte despierta se lleva la mayoría, y acortarla rinde mucho más que rascar microamperios.', tune: T('es_sleep', { Ia: { val: 120, fixed: true }, ta: { label: 'Tiempo despierto', val: 5, min: 0.5, max: 20, step: 0.5, unit: 's', dec: 1 }, T: { val: 10, fixed: true }, Is: { label: 'Dormido', val: 25, list: [10, 25, 60, 150, 1000, 5000], unit: 'µA', dec: 0 }, C: { val: 2000, fixed: true } }),
    q: mcq('5 s a 120 mA cada 10 min y 25 µA dormido. ¿Qué rinde más?', ['Bajar el tiempo despierto a 1 s', 'Bajar el sueño a 10 µA', 'Subir la CPU a 240 MHz', 'Una batería de otro color'], 'La parte despierta supone 1 mA de media; la dormida, 0,025.') });
  addAlt('es_rf', { title: 'Paredes y metros', text: 'Mueve la distancia y las paredes y mira el RSSI. Cada pared quita varios dB, y la distancia también: por debajo de −80 dBm el enlace sufre. Antena y potencia ayudan, dentro del límite legal.', tune: T('es_wifi', { p: { label: 'Potencia', val: 15, list: [2, 5, 8.5, 11, 13, 15, 17, 18.5, 19.5], unit: 'dBm', dec: 1 }, g: { label: 'Antena', val: 2, list: [0, 2, 5, 8], unit: 'dBi', dec: 0 }, w: { label: 'Paredes', val: 1, min: 0, max: 4, step: 1, dec: 0 }, d: { label: 'Distancia', val: 10, list: [1, 3, 5, 10, 20, 30, 50, 100], unit: 'm', dec: 0 } }),
    q: mcq('El RSSI es −84 dBm. ¿Qué haces primero?', ['Acercarlo, quitar obstáculos o mejorar la antena', 'Meterlo en una caja metálica', 'Bajar la potencia', 'Nada: es buena señal'], 'Por debajo de −80 dBm el enlace sufre.') });
  visAlt('es_dbmw', 1, { svg: SV(120, `${[[0, '1 mW'], [3, '2 mW'], [10, '10 mW'], [13, '20 mW'], [20, '100 mW']].map(([d, w], i) => `<rect x="${14 + i * 56}" y="${100 - (i + 1) * 16}" width="46" height="${(i + 1) * 16}" fill="var(--led)" opacity="${0.4 + i * 0.12}"/>` + tx(37 + i * 56, 112, d + ' dBm', 'vizsm', 'text-anchor="middle"') + tx(37 + i * 56, 94 - (i + 1) * 16, w, 'vizsm', 'text-anchor="middle"')).join('')}`) });
  addAlt('es_eirp', { title: 'Mira la PIRE', text: 'Sube la potencia del ESP32 y la ganancia de la antena. La PIRE es la suma, en dB. En cuanto pasa de 20 dBm, el texto se pone rojo: es ilegal en Europa.', tune: T('es_wifi', { p: { label: 'Potencia', val: 13, list: [2, 5, 8.5, 11, 13, 15, 17, 18.5, 19.5], unit: 'dBm', dec: 1 }, g: { label: 'Antena', val: 5, list: [0, 2, 5, 8], unit: 'dBi', dec: 0 }, w: { val: 1, fixed: true }, d: { val: 10, fixed: true } }),
    q: mcq('Antena de 5 dBi. ¿Potencia máxima del ESP32 para no pasar de 20 dBm?', ['15 dBm', '20 dBm', '25 dBm', '4 dBm'], '20 − 5 = 15 dBm.') });
  addAlt('es_http', { title: 'Haz esperar al navegador', text: 'El servidor síncrono solo atiende cuando loop() llama a handleClient(). Sube el delay de loop() y mira el tiempo de respuesta; quita handleClient() y nadie contesta.', tune: T('es_http', { d: { label: 'delay() en loop()', val: 500, list: [0, 10, 50, 100, 500, 1000, 2000], unit: 'ms', dec: 0 }, hc: L01('handleClient() (0 · 1)', 1) }),
    q: mcq('loop() tiene un delay(1000). ¿Cuánto puede tardar una respuesta?', ['Hasta 1 s', 'Nada', '1 ms', '10 s'], 'Espera a la siguiente vuelta.') });
  addAlt('es_web', { title: 'Cuenta peticiones', text: 'Compara preguntar por HTTP cada cierto tiempo con una conexión WebSocket. Sube los móviles abiertos y mira cuánto tráfico genera cada forma, y con qué retraso se ve un cambio.', tune: T('es_poll', { ws: L01('Método (0 HTTP · 1 WebSocket)', 0), iv: { label: 'HTTP cada', val: 200, list: [100, 200, 500, 1000, 2000], unit: 'ms', dec: 0 }, cl: { label: 'Móviles', val: 3, min: 1, max: 8, step: 1, dec: 0 }, ch: { label: 'Cambios por segundo', val: 0.5, list: [0.1, 0.5, 1, 2, 5], dec: 1 } }),
    q: mcq('HTTP cada 500 ms con 5 móviles. ¿Peticiones por segundo?', ['10', '2,5', '2500', '100'], '2 por segundo × 5 = 10.') });
  visAlt('es_websec', 1, { svg: SV(120, `${bx(10, 40, 70, 34, 'mensaje')}${ar(80, 57, 100, 57)}${['¿longitud?', '¿formato?', '¿rango?'].map((n, i) => bx(100 + i * 64, 40, 58, 34, n, 'var(--ice-soft)')).join('')}${ar(292, 57, 296, 57, 'var(--ok)')}${tx(150, 100, 'solo lo que pasa los tres filtros se usa', 'vizsm', 'text-anchor="middle"')}`) });
  visAlt('es_names', 1, { svg: SV(120, `${['1 · el ESP32 crea su AP', '2 · el móvil se une', '3 · el DNS lleva a la página', '4 · eliges red y clave', '5 · a NVS y reinicio en STA'].map((n, i) => bx(40, 4 + i * 20, 220, 17, n)).join('')}${tx(150, 116, 'el portal de configuración, paso a paso', 'vizsm', 'text-anchor="middle"')}`) });
  addAlt('es_ntp', { title: 'Recorre el año', text: 'Mueve el día del año y cambia de zona. Mira cuándo empieza y acaba el horario de verano (los últimos domingos de marzo y octubre) y cómo Canarias va siempre una hora menos.', tune: T('es_tz', { day: { label: 'Día de 2026', val: 60, min: 1, max: 365, step: 1, dec: 0 }, z: L01('Zona (0 península · 1 Canarias)', 0) }),
    q: mcq('En julio, en Madrid, ¿cuál es la hora local?', ['UTC + 2', 'UTC + 1', 'UTC', 'UTC − 1'], 'Horario de verano: CEST.') });

  // --- Módulo 7 ---
  addAlt('es_ble', { title: 'Rellena un anuncio', text: 'Un anuncio clásico tiene 31 bytes. Cada campo gasta 2 bytes de cabecera más sus datos. Añade nombre, UUID y datos de fabricante y mira cuándo deja de caber.', tune: T('es_adv', { nm: { label: 'Nombre', val: 8, list: [0, 4, 6, 8, 12, 20], unit: 'letras', dec: 0 }, uuid: L01('UUID 128 (0 · 1)', 1), md: { label: 'Fabricante', val: 0, list: [0, 2, 4, 8], unit: 'bytes', dec: 0 }, iv: { label: 'Intervalo', val: 1000, list: [20, 100, 250, 1000, 10240], unit: 'ms', dec: 0 } }),
    q: mcq('Flags (3 bytes) y un UUID de 128 bits (18 bytes). ¿Cuántas letras de nombre caben aún?', ['8', '10', '13', '31'], '31 − 3 − 18 = 10 bytes; el nombre gasta 2 de cabecera: 8 letras.') });
  addAlt('es_gatt', { title: 'Sube la MTU', text: 'Elige cuántos bytes envías y la MTU negociada. Los bytes útiles por paquete son MTU − 3. Mira cuántos paquetes hacen falta.', tune: T('es_gatt', { bytes: { label: 'Datos', val: 2000, list: [20, 200, 2000, 10000], unit: 'bytes', dec: 0 }, mtu: { label: 'MTU', val: 23, list: [23, 185, 247, 517], dec: 0 } }),
    q: mcq('Con MTU 247, ¿cuántos bytes útiles caben en un paquete?', ['244', '247', '20', '512'], 'MTU − 3 de cabecera.') });
  visAlt('es_radiosec', 1, { svg: SV(120, `${bx(10, 40, 70, 34, 'Emisor', 'var(--led)', W)}${ar(80, 57, 210, 57, 'currentColor', 'class="a-flow"')}${bx(210, 40, 80, 34, 'Receptor')}<circle cx="145" cy="100" r="12" fill="var(--err)"/>${tx(162, 104, 'cualquiera en el canal oye', 'vizsm', 'fill="var(--err)"')}<path d="M145 88V66" stroke="var(--err)" stroke-dasharray="3 3"/>`) });
  addAlt('es_coex', { title: 'Mete las dos radios', text: 'Con el WiFi encendido, añade una pila de BLE y tu programa. Compara Bluedroid con NimBLE: la segunda solo implementa BLE y deja mucho más sitio.', tune: T('es_ram', { wifi: { val: 1, fixed: true }, ble: { label: 'Pila BLE (0 · 1 NimBLE · 2 Bluedroid)', val: 2, list: [0, 1, 2], dec: 0 }, buf: { label: 'Tu programa', val: 120, list: [40, 80, 120, 160], unit: 'KB', dec: 0 }, psram: { val: 0, fixed: true } }),
    q: mcq('WiFi + BLE + tu programa no caben. ¿Primer cambio?', ['Pasar de Bluedroid a NimBLE', 'Subir la CPU', 'Usar Bluetooth clásico', 'Más flash'], 'NimBLE ocupa bastante menos RAM.') });
  addAlt('es_espnow', { title: 'Ajusta el failsafe', text: 'Un mando envía cada pocos ms y algunos paquetes se pierden. Si la ventana del failsafe es corta, el coche reacciona rápido pero se para en falso; si es larga, al revés. Busca el equilibrio.', tune: T('es_espnow', { per: { label: 'Enviar cada', val: 20, list: [10, 20, 50, 100], unit: 'ms', dec: 0 }, loss: { label: 'Pérdidas', val: 10, list: [0, 2, 5, 10, 20, 30], unit: '%', dec: 0 }, to: { label: 'Failsafe', val: 100, list: [50, 100, 200, 300, 500, 1000, 2000], unit: 'ms', dec: 0 } }),
    q: mcq('Envías cada 50 ms y el failsafe salta a los 300 ms. ¿Cuántos paquetes seguidos deben perderse?', ['6', '3', '15', '1'], '300 / 50 = 6.') });
  visAlt('es_radiochoice', 1, { svg: SV(130, `${bx(90, 6, 120, 26, '¿Necesitas internet?')}${ar(150, 32, 60, 56)}${ar(150, 32, 240, 56)}${bx(10, 58, 100, 26, 'WiFi', 'var(--led)', W)}${bx(190, 58, 100, 26, '¿Hablas con un móvil?')}${ar(240, 84, 190, 104)}${ar(240, 84, 280, 104)}${bx(130, 104, 80, 22, 'BLE', '#3E8FCB', W)}${bx(220, 104, 76, 22, 'ESP-NOW', 'var(--ok)', W)}`) });

  // --- Módulo 8 ---
  visAlt('es_sleep', 1, { svg: SV(140, `${[['Activo + WiFi', '≈ 100 mA', 1], ['Modem sleep', 'decenas de mA', 0.8], ['Light sleep', '≈ 0,8 mA', 0.55], ['Deep sleep', '≈ 10 µA', 0.3], ['Hibernación', '≈ 5 µA', 0.15]].map(([n, c, k], i) => `<rect x="10" y="${8 + i * 26}" width="${k * 150}" height="20" rx="4" fill="var(--led)" opacity="${0.3 + k * 0.6}"/>` + tx(16, 22 + i * 26, n, 'vizsm', 'fill="currentColor"') + tx(170, 22 + i * 26, c, 'vizsm')).join('')}`) });
  addAlt('es_battlife', { title: 'Juega con el ciclo', text: 'Cambia la corriente y el tiempo despierto, el periodo y el consumo dormido. La barra de abajo reparte la carga gastada entre lo despierto y lo dormido; la autonomía sale de la corriente media.', tune: T('es_sleep', { Ia: { label: 'Despierto', val: 100, min: 20, max: 200, step: 10, unit: 'mA', dec: 0 }, ta: { label: 'Tiempo despierto', val: 2, min: 0.5, max: 20, step: 0.5, unit: 's', dec: 1 }, T: { label: 'Periodo', val: 10, min: 1, max: 60, step: 1, unit: 'min', dec: 0 }, Is: { label: 'Dormido', val: 10, list: [10, 25, 60, 150, 1000, 5000], unit: 'µA', dec: 0 }, C: { label: 'Batería', val: 2000, min: 500, max: 3500, step: 100, unit: 'mAh', dec: 0 } }),
    q: mcq('Corriente media de 2 mA y batería de 2400 mAh. ¿Cuánto dura?', ['50 días', '1200 días', '5 días', '100 días'], '2400 / 2 = 1200 h = 50 días.') });
  addAlt('es_wake', { title: 'Busca pines que despierten', text: 'Con el uso fijado en «despertar del deep sleep», recorre los pines: solo los GPIO RTC pueden hacerlo.', tune: T('es_pins', { pin: { label: 'GPIO', val: 18, list: PINLIST, dec: 0 }, uso: { val: 3, fixed: true } }),
    q: mcq('¿Qué pin puede despertar al chip con EXT0?', ['GPIO 26', 'GPIO 18', 'GPIO 22', 'GPIO 5'], 'Solo los GPIO RTC: 0, 2, 4, 12–15, 25–27 y 32–39.') });
  addAlt('es_burden', { title: 'Cambia de rango', text: 'El multímetro mete una resistencia en serie que depende del rango. Prueba cada rango: en unos la caída con el pico de 150 mA reinicia el chip; en otros, la resolución no deja ver los 10 µA del sueño.', tune: T('es_burden', { r: { label: 'Rango (0 200 µA · 1 2 mA · 2 20 mA · 3 200 mA · 4 10 A)', val: 0, list: [0, 1, 2, 3, 4], dec: 0 }, pk: { val: 150, fixed: true } }),
    q: mcq('Shunt de 100 Ω y pico de 20 mA. ¿Cuánto cae en él?', ['2 V', '0,2 V', '20 V', '0,02 V'], '0,02 × 100 = 2 V.') });
  visAlt('es_lipo', 0, { svg: SV(130, `<rect x="40" y="14" width="22" height="90" rx="11" fill="none" stroke="currentColor"/><circle cx="51" cy="110" r="14" fill="#3E8FCB"/><rect x="46" y="70" width="10" height="40" fill="#3E8FCB"/><path d="M30 70H140" stroke="var(--err)" stroke-dasharray="4 3"/>${tx(144, 74, '0 °C: por debajo, no cargar', 'vizsm', 'fill="var(--err)"')}${tx(90, 40, 'cargar con frío deposita litio metálico', 'vizsm')}`) });
  visAlt('es_idf', 0, { svg: SV(120, `${bx(20, 10, 120, 30, 'setup() + loop()', 'var(--led)', W)}${bx(20, 46, 120, 30, 'Arduino-ESP32')}${bx(160, 10, 120, 66, 'app_main()', '#3E8FCB', W)}${bx(20, 84, 260, 28, 'ESP-IDF + FreeRTOS')}`) });
  visAlt('es_idfpy', 1, { svg: SV(110, `${['create-project', 'set-target', 'menuconfig', 'build', 'flash monitor'].map((n, i) => bx(4 + i * 59, 34, 54, 40, '', i === 1 ? 'var(--led)' : 'var(--ice-soft)') + tx(31 + i * 59, 58, n, 'vizsm', `text-anchor="middle" style="font-size:8.5px" ${i === 1 ? 'fill="#fff"' : ''}`)).join('')}${tx(150, 100, 'el chip se elige antes de configurar', 'vizsm', 'text-anchor="middle"')}`) });
  addAlt('es_esperr', { title: 'Provoca el bucle', text: 'Simula un arranque en el que nvs_flash_init() falla. Con ESP_ERROR_CHECK, el chip aborta, reinicia y vuelve a fallar sin fin; tratando el error (borrar la NVS y reintentar), sigue funcionando.', tune: T('es_err', { e: { label: 'Resultado (0 OK · 1 NVS llena · 2 otra versión)', val: 1, list: [0, 1, 2], dec: 0 }, mode: L01('Código (0 ESP_ERROR_CHECK · 1 tratar)', 0) }),
    q: mcq('¿Qué haces con ESP_ERR_NVS_NEW_VERSION_FOUND en producción?', ['Borrar la NVS con nvs_flash_erase() y volver a iniciarla', 'Dejar que reinicie en bucle', 'Ignorarlo', 'Cambiar de placa'], 'Es la receta oficial para ese error.') });
  // Preguntas con código: el código va aparte para que se lea bien
  { const q = CONCEPTS.es_noise.alts[1].q; q.q = 'Comparado con α = 0,2, ¿cómo es la salida con esta línea?'; q.code = 'filtrado += 0.05 * (lectura - filtrado);'; }
  { const q = CONCEPTS.es_nvs.alts[0].q; q.q = 'Esta línea se ejecuta cuando la clave aún no existe. ¿Qué devuelve?'; q.code = 'prefs.getFloat("offset", 1.5)'; }
  { const q = CONCEPTS.es_ntp.alts[0].q; q.code = 'CET-1CEST,M3.5.0,M10.5.0/3'; }

  /* ===================== ESPECIALIDAD ===================== */
  TRACKS.push({
    id: 'esp32',
    title: 'ESP32 a fondo',
    short: 'ESP32',
    desc: 'Exprime el chip: periféricos, FreeRTOS en dos núcleos, flash y OTA, WiFi, BLE y ESP-NOW, deep sleep de meses y ESP-IDF, con más de veinte proyectos reales.',
    color: '#E0542E',
    icon: 'wifi',
    level: 'Intermedio → avanzado',
    units: [
      { id: 'es-m1', title: 'La familia ESP32 y su placa', desc: 'Qué hay dentro del chip, las variantes y cómo elegir, la placa DevKit y el arranque.', nodes: M1 },
      { id: 'es-m2', title: 'Alimentación, pines y ADC', desc: 'Picos y brownout, pines de arranque y prohibidos, la matriz GPIO y un ADC con trampas.', nodes: M2 },
      { id: 'es-m3', title: 'Periféricos', desc: 'LEDC, DAC y touch, RMT con tiras LED e infrarrojos, buses en cualquier pin, I²S, temporizadores e interrupciones.', nodes: M3 },
      { id: 'es-m4', title: 'FreeRTOS en dos núcleos', desc: 'Tareas, prioridades, colas, mutex, condiciones de carrera y watchdogs.', nodes: M4 },
      { id: 'es-m5', title: 'Flash, particiones y OTA', desc: 'Tabla de particiones, NVS, LittleFS, arranque, actualizaciones y seguridad.', nodes: M5 },
      { id: 'es-m6', title: 'WiFi desde el propio chip', desc: 'Modos y reconexión, potencia, servidor web, WebSocket, mDNS, portal y NTP.', nodes: M6 },
      { id: 'es-m7', title: 'Bluetooth LE y ESP-NOW', desc: 'Anuncios, GATT, central y periférico, y radio directa entre ESP32.', nodes: M7 },
      { id: 'es-m8', title: 'Bajo consumo y ESP-IDF', desc: 'Modos de sueño, despertares, medir microamperios, ULP y energía solar, y el entorno profesional ESP-IDF.', nodes: M8 }
    ]
  });
})();
