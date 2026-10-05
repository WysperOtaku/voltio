/* Voltio · especialidad: ESP32 a fondo. El chip, sus periféricos, FreeRTOS, la flash,
   las radios a nivel de dispositivo (WiFi, BLE, ESP-NOW), el bajo consumo y ESP-IDF.
   Código para el núcleo Arduino-ESP32 3.x (basado en ESP-IDF 5) salvo que se indique. */
(() => {
  /* ===================== CONCEPTOS ===================== */
  Object.assign(CONCEPTS, {
    es_family: { name: 'La familia ESP32', alts: [
      { title: 'Elegir por lo que necesitas', text: 'No hay “el mejor ESP32”: hay el adecuado. ¿Bluetooth clásico o DAC? ESP32 clásico. ¿USB nativo o IA? S3. ¿Barato, a pila y con BLE 5? C3. ¿Zigbee o Thread? C6 o H2. Empieza por la lista de requisitos y descarta.', q: mcq('Necesitas que el microcontrolador aparezca como teclado USB en el ordenador. ¿Cuál eliges?', ['ESP32-S3: tiene USB OTG nativo', 'ESP32 clásico: el USB de la placa sirve', 'ESP32-C3: tiene WiFi', 'Cualquiera, el USB es igual en todos'], 'El USB de un DevKit clásico es un chip USB-serie aparte: no puede hacerse pasar por teclado.') },
      { title: 'Chip, módulo y placa', text: 'El <b>chip</b> es el silicio. El <b>módulo</b> (WROOM, WROVER, MINI…) le añade flash, cristal y antena bajo una tapa metálica, ya homologado. La <b>placa</b> de desarrollo añade USB, regulador y botones. Cuando un dato cambia entre “ESP32”, mira de cuál de los tres hablan.', q: mcq('¿Dónde está la memoria flash con tu programa en un ESP32-WROOM-32E?', ['Dentro del módulo, junto al chip, bajo la tapa metálica', 'Dentro del chip ESP32', 'En el convertidor USB-serie', 'En la protoboard'], 'El ESP32 clásico no lleva flash dentro: la lee de una flash SPI externa.') }
    ] },
    es_3v3: { name: 'Niveles de 3,3 V', alts: [
      { title: 'Un límite que no perdona', text: 'Los pines del ESP32 trabajan a 3,3 V y su máximo absoluto es la alimentación más unos 0,3 V. Meter 5 V en una entrada fuerza los diodos de protección y puede dañar el pin o el chip, aunque “parezca que funciona”.', q: mcq('Un sensor de 5 V da su salida de 5 V. ¿Cómo la llevas al ESP32?', ['Con un divisor resistivo o un adaptador de nivel', 'Directa, el ESP32 aguanta', 'Con una resistencia de 10 Ω en serie', 'Poniendo un LED en medio'], 'Un divisor de 1 kΩ y 2 kΩ deja 5 V en unos 3,3 V.') },
      { title: 'Al revés también importa', text: 'Una salida de 3,3 V puede no ser un “1” para un chip de 5 V. Muchos piden al menos el 70 % de su alimentación (3,5 V con 5 V): tiras WS2812, matrices MAX7219… Un 74AHCT125 alimentado a 5 V traduce 3,3 V a 5 V de forma limpia.', q: mcq('Una tira WS2812 a 5 V falla al azar con la señal directa del ESP32. ¿Por qué?', ['3,3 V queda justo en el umbral de “1” de la tira (0,7 × 5 V = 3,5 V)', 'La tira necesita 12 V', 'El ESP32 da 5 V y la quema', 'Falta un pull-down'], 'Con un adaptador de nivel (74AHCT125) el problema desaparece.') }
    ] },
    es_brown: { name: 'Picos de consumo y brownout', alts: [
      { title: 'Sorbos enormes y muy cortos', text: 'Al transmitir por WiFi el ESP32 pide de golpe unos 240 mA durante milisegundos. Si el cable, el puerto USB o el regulador no los dan, la tensión cae, salta el detector de caída (<b>brownout</b>) y el chip se reinicia. Parece un fallo de software y es de alimentación.', q: mcq('La placa se reinicia justo al conectar al WiFi y el monitor dice “Brownout detector was triggered”. ¿Qué cambias primero?', ['La alimentación: cable corto y bueno, fuente capaz y condensador cerca del módulo', 'La contraseña del WiFi', 'La velocidad del monitor serie', 'El código de loop()'], 'Es una caída de tensión, no un error de programa.') },
      { title: 'Un depósito junto al grifo', text: 'Un condensador grande (100–470 µF) junto a 3V3 y GND es un pequeño depósito: entrega el pico mientras el regulador reacciona. Caída aproximada: <b>ΔV = I · t / C</b>. Pero solo ayuda en picos cortos: si la fuente no da la corriente media, no hay condensador que lo arregle.', q: mcq('Un pico de 200 mA durante 0,5 ms sale de un condensador de 470 µF. ¿Cuánto baja la tensión?', ['Unos 0,21 V', 'Unos 2,1 V', 'Nada', 'Unos 21 V'], 'ΔV = 0,2 × 0,0005 / 0,00047 ≈ 0,21 V.') }
    ] },
    es_strap: { name: 'Pines de arranque y prohibidos', alts: [
      { title: 'El chip mira antes de arrancar', text: 'En el instante del reinicio, el ESP32 lee GPIO0, 2, 5, 12 y 15 para decidir cómo arrancar. Si tu circuito los fuerza al nivel equivocado (un pull-up en el 12, algo que tire del 0 a masa…), la placa no arranca o se queda esperando programa. Después del arranque son pines normales.', q: mcq('Tras conectar un módulo al GPIO12, la placa ya no arranca. ¿Qué ha pasado?', ['El módulo pone el 12 alto al arrancar y el chip elige flash de 1,8 V', 'El 12 no existe', 'El módulo consume demasiado', 'El 12 es solo de entrada'], 'GPIO12 alto en el arranque cambia la tensión de la flash interna del módulo.') },
      { title: 'El mapa de zonas', text: 'Piensa en zonas: <b>6–11</b> prohibidos (la flash). <b>34–39</b> solo entrada y sin pull-ups internas. <b>0, 2, 5, 12, 15</b> de arranque: úsalos con cuidado. <b>1 y 3</b> son el puerto serie del USB. El resto (4, 13, 14, 16–19, 21–23, 25–27, 32, 33) son los cómodos.', q: mcq('Necesitas un pin para un LED sin complicarte. ¿Cuál?', ['GPIO 26', 'GPIO 9', 'GPIO 0', 'GPIO 36'], 'El 9 es de la flash, el 0 de arranque y el 36 solo de entrada.') }
    ] },
    es_bus: { name: 'Buses y matriz GPIO', alts: [
      { title: 'Una centralita de teléfonos', text: 'La <b>matriz GPIO</b> es como una centralita: conecta la UART, el I²C, el SPI o el LEDC a casi cualquier pin. Por eso escribes Wire.begin(sda, scl) con los pines que quieras. Solo lo analógico (ADC, DAC, touch) va soldado a pines fijos.', q: mcq('¿Puedes usar el GPIO 23 como entrada analógica?', ['No: el ADC solo está en sus pines fijos', 'Sí, la matriz lo conecta', 'Sí, a 8 bits', 'Solo con WiFi apagado'], 'Las funciones analógicas no pasan por la matriz.') },
      { title: 'Cuánto tarda un byte', text: 'En una UART con formato 8N1 cada byte son 10 bits (inicio, 8 de datos y parada). A 115 200 baudios, un bit dura 8,7 µs y un byte 87 µs. Enviar 1000 bytes tarda unos 87 ms: si lo haces dentro de una tarea con prisa, se nota.', q: mcq('¿Cuánto se tarda en enviar 100 bytes a 9600 baudios (8N1)?', ['Unos 104 ms', 'Unos 10 ms', 'Unos 83 ms', '1 s'], '100 × 10 bits / 9600 ≈ 0,104 s.') }
    ] },
    es_adc: { name: 'El ADC del ESP32', alts: [
      { title: 'Dos ADC y una trampa', text: 'El ESP32 clásico tiene dos ADC. El <b>ADC1</b> (GPIO 32–39) siempre está disponible. El <b>ADC2</b> lo usa el driver de WiFi: con WiFi activo no puedes leer sus pines. Regla práctica: todo lo analógico, al ADC1.', q: mcq('Tu proyecto usa WiFi y un potenciómetro en el GPIO 25 da lecturas de error. ¿Solución?', ['Pasar el potenciómetro a un pin del ADC1, como el 34', 'Subir la atenuación', 'Poner un condensador', 'Leer más deprisa'], 'El 25 pertenece al ADC2, ocupado por el WiFi.') },
      { title: 'Una regla que se curva', text: 'Imagina una regla que mide bien en el centro pero se curva en los extremos: así es el ADC del ESP32. Con 11 dB es fiable entre unos 0,15 y 2,45 V; por encima se comprime hasta saturar y por debajo no distingue casi nada. Diseña tus divisores para trabajar en la zona recta.', q: mcq('Un divisor deja 3,0 V en el pin con 11 dB de atenuación. ¿Qué pasa?', ['La lectura sale comprimida: estás fuera de la zona lineal', 'Lee perfecto', 'El pin se quema', 'Lee 0'], 'Cambia el divisor para quedarte por debajo de unos 2,4 V.') },
      { title: 'Ruido y calibración', text: 'Cada ESP32 trae de fábrica datos de calibración en sus eFuses. <b>analogReadMilliVolts()</b> los aplica y devuelve milivoltios corregidos. El ruido (decenas de cuentas) se reduce promediando: N lecturas reducen el ruido aleatorio en √N.', q: mcq('Promedias 64 lecturas. ¿Cuánto se reduce el ruido aleatorio?', ['Unas 8 veces', '64 veces', '32 veces', 'Nada'], '√64 = 8.') }
    ] },
    es_ledc: { name: 'Frecuencia y resolución del LEDC', alts: [
      { title: 'Un reparto del reloj', text: 'El LEDC cuenta pulsos de un reloj de 80 MHz. En cada periodo del PWM tiene que contar 2^bits pasos. Por eso <b>f × 2^bits ≤ 80 MHz</b>: si subes la frecuencia, te quedan menos bits; si quieres muchos bits, la frecuencia baja.', q: mcq('Quieres 10 bits de resolución. ¿Frecuencia máxima aproximada?', ['78 kHz', '80 MHz', '1 kHz', '10 kHz'], '80 000 000 / 1024 ≈ 78 125 Hz.') },
      { title: 'Escalones de brillo', text: 'Con 8 bits el ciclo de trabajo se ajusta en 256 escalones; con 13 bits, en 8192. En un LED a poco brillo los escalones de 8 bits se notan (sobre todo con corrección gamma). Para un motor da igual; ahí importa más que la frecuencia esté fuera del oído (unos 20 kHz).', q: mcq('Un motor pita con PWM a 1 kHz. ¿Qué haces?', ['Subir a unos 20 kHz y aceptar menos resolución', 'Bajar a 100 Hz', 'Subir la resolución a 16 bits', 'Nada, es normal'], 'A 20 kHz caben 11 bits: de sobra para un motor.') }
    ] },
    es_touch: { name: 'Sensores táctiles', alts: [
      { title: 'Tu dedo es un condensador', text: 'El sensor carga y descarga la capacidad del pin muchas veces y cuenta. Tu dedo añade capacidad hacia tierra. En el ESP32 clásico el valor de <b>touchRead()</b> baja al tocar; en el S2 y el S3, sube. Mide sin tocar, mide tocando y pon el umbral entre ambos.', q: mcq('Sin tocar lees 62 y tocando 18 en un ESP32 clásico. ¿Qué umbral pones?', ['Alrededor de 40: “tocado” si baja de ahí', '100: “tocado” si sube', '62 exacto', '0'], 'A medio camino, con margen para la deriva.') },
      { title: 'Lo que lo estropea', text: 'Cables largos, humedad, la mano cerca o cambiar de fuente de alimentación desplazan la lectura en reposo. Por eso se calibra al arrancar y se compara con una base que se va actualizando despacio. Un plástico de 1–2 mm entre el dedo y la lámina sigue funcionando.', q: mcq('Al enchufar el cargador del móvil, el touch se dispara solo. ¿Qué haces?', ['Recalcular la base al arrancar y seguirla despacio en el tiempo', 'Quitar el sensor', 'Subir la tensión', 'Usar un pin del ADC2'], 'La base de referencia no es fija: síguela.') }
    ] },
    es_rmt: { name: 'RMT y pulsos precisos', alts: [
      { title: 'Una partitura de pulsos', text: 'El RMT recibe una lista de “nivel y duración” y la reproduce por hardware con resolución de hasta 12,5 ns, sin que la CPU intervenga. También hace lo contrario: captura duraciones. Por eso es perfecto para mandos infrarrojos y tiras WS2812.', q: mcq('¿Por qué no generar la señal de una WS2812 con digitalWrite?', ['Exige pulsos de ~0,4 µs con poca tolerancia; una interrupción en medio la estropea', 'digitalWrite no existe en el ESP32', 'La tira necesita 5 V', 'Funcionaría igual'], 'El RMT la genera por hardware, inmune a las interrupciones.') },
      { title: 'Con números', text: 'Una WS2812 recibe 800 000 bits por segundo: 1,25 µs por bit y 24 bits por LED. Para 100 LED: 100 × 24 × 1,25 µs = 3 ms. A 60 actualizaciones por segundo la tira está ocupada el 18 % del tiempo.', q: mcq('¿Cuánto tarda en enviarse una tira de 300 LED WS2812?', ['9 ms', '0,9 ms', '90 ms', '300 µs'], '300 × 24 × 1,25 µs = 9000 µs.') }
    ] },
    es_i2s: { name: 'Audio digital I²S', alts: [
      { title: 'Tres hilos para el sonido', text: 'I²S manda muestras de audio: <b>BCLK</b> marca cada bit, <b>WS</b> (LRCLK) dice si la muestra es del canal izquierdo o del derecho, y <b>DATA</b> lleva los bits. El DAC del otro lado lo convierte en tensión.', q: mcq('¿Qué indica la línea WS?', ['A qué canal (izquierdo o derecho) pertenece la muestra', 'El volumen', 'La frecuencia del tono', 'Que hay error'], 'Por eso también se llama LRCLK.') },
      { title: 'Cuentas de caudal', text: 'Audio de 44,1 kHz, 16 bits y estéreo: 44 100 × 2 × 2 bytes = 176 400 bytes por segundo. Si tu tarea no rellena el búfer DMA a ese ritmo, se oyen cortes. Más búfer da margen, a cambio de memoria y retardo.', q: mcq('Audio de 16 kHz, 16 bits y mono. ¿Bytes por segundo?', ['32 000', '16 000', '256 000', '64 000'], '16 000 muestras × 2 bytes.') }
    ] },
    es_isr: { name: 'Interrupciones en el ESP32', alts: [
      { title: 'Entra, apunta y sal', text: 'Una ISR debe durar microsegundos: guardar un dato, avisar y salir. Nada de delay, Serial ni operaciones lentas. Lo pesado lo hace una tarea o loop() cuando recibe el aviso (un flag volatile, una cola o una notificación).', q: mcq('¿Qué es correcto dentro de una ISR?', ['Guardar el instante en una variable volatile y salir', 'Serial.println para depurar', 'delay(10) para el antirrebote', 'Conectar al WiFi'], 'Corto y sin llamadas que bloqueen.') },
      { title: 'Por qué IRAM_ATTR', text: 'El código normal se ejecuta desde la flash a través de una caché. Mientras se escribe en la flash (NVS, OTA, LittleFS) la caché se desactiva. Si salta una interrupción y su código está en flash, el chip falla. <b>IRAM_ATTR</b> la coloca en RAM interna, siempre accesible.', q: mcq('¿Qué hace IRAM_ATTR?', ['Coloca la función en RAM interna para que pueda ejecutarse aunque la caché de flash esté desactivada', 'La hace más corta', 'La ejecuta en el otro núcleo', 'Desactiva el WiFi'], 'Imprescindible en ISR del ESP32.') }
    ] },
    es_rtos: { name: 'Tareas y planificador', alts: [
      { title: 'Cocineros y fogones', text: 'Cada tarea es un cocinero con su receta (su bucle). El planificador es el jefe de cocina: en cada núcleo, deja trabajar al cocinero de más prioridad que esté listo. Un cocinero que espera (vTaskDelay, una cola) deja el fogón libre. Uno que da vueltas sin parar (espera activa) no lo suelta nunca.', q: mcq('Una tarea de prioridad 3 hace while(millis() - t < 500) {}. ¿Qué les pasa a las tareas de prioridad 1 de su núcleo?', ['No se ejecutan mientras dure la espera activa', 'Se ejecutan normal', 'Se ejecutan en el otro núcleo solas', 'Se borran'], 'La espera activa no cede la CPU; vTaskDelay sí.') },
      { title: 'Estados de una tarea', text: 'Una tarea está <b>ejecutándose</b>, <b>lista</b> (quiere CPU), <b>bloqueada</b> (espera tiempo o un evento) o <b>suspendida</b>. Lo bueno es que pase casi todo el tiempo bloqueada: entonces no gasta CPU y despierta en cuanto hay algo que hacer.', q: mcq('Una tarea espera con xQueueReceive(cola, &d, portMAX_DELAY) y la cola está vacía. ¿En qué estado está?', ['Bloqueada: no gasta CPU hasta que llegue un dato', 'Ejecutándose', 'Suspendida para siempre', 'Borrada'], 'Despierta sola cuando alguien mete un dato.') }
    ] },
    es_sync: { name: 'Sincronización entre tareas', alts: [
      { title: 'El baño con una sola llave', text: 'Un <b>mutex</b> es la llave del único baño: quien la tiene usa el recurso (el bus I²C, una estructura) y los demás esperan bloqueados. Al terminar la devuelve. Siempre se devuelve quien la cogió, y nunca se usa desde una ISR.', q: mcq('Dos tareas usan la misma pantalla I²C y a veces sale basura. ¿Solución?', ['Proteger cada uso del bus con un mutex', 'Subir la prioridad de una', 'Poner delay(1)', 'Usar dos núcleos'], 'Cada transacción completa debe hacerse sin interrupción de la otra tarea.') },
      { title: 'Leer, sumar, escribir', text: 'contador++ son tres pasos: leer, sumar y escribir. Si otra tarea hace lo mismo entre medias, una de las sumas se pierde: es una <b>condición de carrera</b>. Pasa pocas veces, por eso es tan traicionera. Con dos núcleos puede pasar de verdad a la vez.', q: mcq('Dos tareas suman 1 a la misma variable 100 000 veces cada una y el resultado final es 187 342. ¿Por qué?', ['Condición de carrera: se pisan entre la lectura y la escritura', 'El ESP32 no sabe sumar', 'Se desborda el entero', 'Falta delay'], 'Protege la sección o usa operaciones atómicas.') },
      { title: 'Pasar mensajes en vez de compartir', text: 'Muchas carreras desaparecen si las tareas no comparten variables: una <b>cola</b> copia el dato del productor al consumidor y despierta al que espera. Cada dato tiene un único dueño en cada momento.', q: mcq('La tarea del sensor tiene una lectura nueva para la tarea de pantalla. ¿La forma más limpia?', ['Enviarla por una cola', 'Una variable global sin protección', 'Llamar a la función de pantalla desde el sensor', 'Reiniciar'], 'xQueueSend / xQueueReceive.') }
    ] },
    es_flash: { name: 'Flash, particiones y OTA', alts: [
      { title: 'Un disco con cajones', text: 'La flash se divide en particiones como un mueble en cajones: el cargador de arranque, la tabla que describe los cajones, NVS para ajustes, dos huecos para programas (app0 y app1) y uno para archivos. La tabla se elige en el IDE (“Partition Scheme”).', q: mcq('¿Para qué sirven dos particiones de aplicación?', ['Para OTA: la nueva versión se escribe en la que no está en uso', 'Para ejecutar dos programas a la vez', 'Para el WiFi y el Bluetooth', 'Para guardar fotos'], 'Si la descarga falla, la versión anterior sigue intacta.') },
      { title: 'La flash se desgasta', text: 'La flash se borra en sectores de 4 KB y cada sector aguanta del orden de 100 000 borrados. Escribir lo mismo cada segundo en el mismo sitio lo agotaría en poco más de un día. NVS y LittleFS reparten las escrituras, pero tú decides cuánto escribes.', q: mcq('Guardas la posición de un mando en NVS cada 100 ms mientras lo giras. ¿Mejor idea?', ['Guardar solo cuando lleva unos segundos sin cambiar', 'Guardar cada 10 ms', 'No guardar nunca', 'Guardar en la partición de la app'], 'Menos escrituras, más vida.') }
    ] },
    es_wifi: { name: 'WiFi en el dispositivo', alts: [
      { title: 'Cliente, punto de acceso o ambos', text: 'En modo <b>STA</b> el ESP32 se une a tu router como un móvil. En modo <b>AP</b> crea su propia red. En <b>STA+AP</b> hace las dos cosas con una sola radio, así que ambas comparten canal. El ESP32 clásico solo usa la banda de 2,4 GHz.', q: mcq('Tu router solo emite en 5 GHz. ¿Qué ve un ESP32 clásico?', ['Nada: solo trabaja en 2,4 GHz', 'La red, pero más lenta', 'La red, sin problema', 'Solo la contraseña'], 'Activa la banda de 2,4 GHz en el router.') },
      { title: 'Programar para que se caiga', text: 'El WiFi se va a caer: el router se reinicia, alguien lo apaga, hay interferencias. Un programa robusto no se queda en un while esperando: reacciona a los <b>eventos</b> (conectado, IP obtenida, desconectado), reintenta con esperas crecientes y sigue haciendo su trabajo local mientras tanto.', q: mcq('¿Qué hace un buen programa cuando se pierde el WiFi?', ['Sigue funcionando en local y reintenta conectar en segundo plano', 'Se queda en un bucle hasta reconectar', 'Se reinicia cada segundo', 'Borra la configuración'], 'Los eventos te avisan sin bloquear.') }
    ] },
    es_web: { name: 'Servidor web, HTTP y WebSocket', alts: [
      { title: 'Ventanilla frente a teléfono', text: 'HTTP es una ventanilla: el navegador pide, el ESP32 responde y se acabó. WebSocket es una llamada de teléfono que queda abierta: cualquiera de los dos habla cuando quiere. Para mandos y gráficas en vivo, teléfono.', q: mcq('Quieres que el móvil vea la temperatura en cuanto cambie, sin recargar. ¿Qué usas?', ['WebSocket: el ESP32 empuja el dato al momento', 'Recargar la página cada minuto', 'Un correo', 'HTTP POST desde el ESP32 al móvil'], 'El servidor puede hablar sin que le pregunten.') },
      { title: 'Nunca te fíes de lo que llega', text: 'Cualquier dispositivo de tu red puede mandar cualquier cosa a tu servidor. Comprueba longitudes, rangos y formato antes de usar un dato. Y no abras tu ESP32 a internet sin autenticación y cifrado: para eso hay otras soluciones.', q: mcq('Llega por WebSocket “B:9999” y el brillo va de 0 a 255. ¿Qué haces?', ['Limitar el valor a 0..255 (o descartar el mensaje)', 'Usarlo tal cual', 'Reiniciar', 'Guardarlo en NVS'], 'constrain() o rechazar lo que no encaja.') }
    ] },
    es_ble: { name: 'Bluetooth LE', alts: [
      { title: 'El tablón y la ventanilla', text: 'BLE tiene dos momentos. Primero, la <b>publicidad</b>: el periférico cuelga pequeños anuncios (hasta 31 bytes en BLE clásico) en un tablón que cualquiera lee. Después, si alguien conecta, <b>GATT</b>: una ventanilla ordenada en servicios y características donde se leen, escriben y suscriben valores.', q: mcq('Una baliza que solo emite su identificador cada segundo, sin conexiones. ¿Qué usa?', ['Solo publicidad (advertising)', 'GATT con notificaciones', 'Bluetooth clásico', 'WiFi'], 'Sin conexión: todo cabe en el anuncio.') },
      { title: 'Servicios, características y descriptores', text: 'Un <b>servicio</b> agrupa (p. ej. “batería”, 0x180F). Dentro, cada <b>característica</b> es un valor con propiedades: leer, escribir, notificar. Para recibir notificaciones, el cliente escribe en el descriptor <b>CCCD</b> (0x2902) de esa característica.', q: mcq('El móvil quiere recibir cada nueva lectura sin preguntar. ¿Qué hace?', ['Se suscribe escribiendo en el CCCD de la característica con NOTIFY', 'Lee la característica cada 10 ms', 'Se desconecta', 'Cambia el UUID'], 'Las notificaciones ahorran energía y tiempo.') }
    ] },
    es_espnow: { name: 'ESP-NOW', alts: [
      { title: 'Notas por debajo de la puerta', text: 'ESP-NOW manda tramas cortas (hasta 250 bytes en su versión original) directamente de un ESP32 a otro, identificados por su MAC. Sin router, sin conexión, en pocos milisegundos. Solo hace falta que los dos estén en el mismo canal WiFi.', q: mcq('Un nodo con ESP-NOW no recibe nada del otro, que está conectado a un router. ¿Qué compruebas?', ['Que ambos usen el mismo canal (el del router)', 'La contraseña del router', 'La versión de Bluetooth', 'Que haya internet'], 'La radio solo escucha en un canal cada vez.') },
      { title: 'Elegir radio', text: 'ESP-NOW: latencia mínima y sin infraestructura (mandos, nodos que duermen). WiFi: acceso a la red y a internet. BLE: hablar con móviles y gastar poco. Muchos proyectos combinan dos: nodos por ESP-NOW y una pasarela con WiFi.', q: mcq('Mando para un coche robot en el campo, sin router y con respuesta inmediata:', ['ESP-NOW', 'WiFi a través del móvil', 'Correo electrónico', 'BLE con emparejamiento cada vez'], 'Directo y rápido.') }
    ] },
    es_sleep: { name: 'Bajo consumo', alts: [
      { title: 'La media es lo que cuenta', text: 'La batería se gasta con la corriente <b>media</b>: Imedia = (Iactiva · tactiva + Isueño · tsueño) / T. Si el nodo duerme a 10 µA pero pasa 5 s despierto a 120 mA cada 10 minutos, la parte despierta manda: 1 mA de media. Lo primero es acortar el tiempo despierto.', q: mcq('Despierto 2 s a 100 mA cada 100 s; dormido a 0 mA. ¿Corriente media?', ['2 mA', '100 mA', '50 mA', '0,2 mA'], '100 × 2 / 100 = 2 mA.') },
      { title: 'Dormir de verdad', text: 'En deep sleep solo sigue vivo el dominio RTC: un temporizador, algunos pines y 8 KB de memoria RTC. Al despertar el programa empieza de cero (setup() otra vez). Y ojo: el chip baja a unos 10 µA, pero el regulador, el USB-serie y los LED de una placa de desarrollo pueden seguir gastando miliamperios.', q: mcq('Tu DevKit en deep sleep consume 9 mA. ¿Qué pasa?', ['Duerme el chip, pero no el regulador, el USB-serie ni el LED de la placa', 'El deep sleep no funciona', 'El WiFi sigue encendido seguro', 'Es lo normal en el chip'], 'Para baterías: placa de bajo consumo o módulo con un LDO de poca corriente.') }
    ] },
    es_idf: { name: 'ESP-IDF', alts: [
      { title: 'Arduino es una capa', text: 'El núcleo Arduino-ESP32 está construido sobre ESP-IDF: setup() y loop() corren en una tarea de FreeRTOS creada por app_main(). Pasar a ESP-IDF es quitar la capa: más control (menuconfig, componentes, seguridad, consumo) a cambio de más código.', q: mcq('En ESP-IDF, ¿qué equivale a setup() + loop()?', ['app_main(), con tu propio bucle o tus tareas', 'main() con un return', 'loop() también existe', 'No hay equivalente'], 'Si app_main() termina, su tarea se borra, pero las tareas que creó siguen.') },
      { title: 'La línea de órdenes', text: 'Todo pasa por idf.py: set-target elige el chip, menuconfig la configuración, build compila, flash graba y monitor muestra los mensajes decodificando los fallos. Las bibliotecas son componentes; las de otros se añaden con el gestor de componentes.', q: mcq('¿Qué orden abre la configuración del proyecto (frecuencia de CPU, tick, particiones…)?', ['idf.py menuconfig', 'idf.py build', 'idf.py monitor', 'idf.py erase-flash'], 'Guarda el resultado en sdkconfig.') }
    ] }
  });

  /* ===================== GENERADORES ===================== */
  const { pick, ri, fmt, MC, N } = Gen.helpers;
  const fHz = f => f >= 1e6 ? fmt(f / 1e6, 3) + ' MHz' : f >= 1000 ? fmt(f / 1000, 3) + ' kHz' : fmt(f) + ' Hz';
  const sh = a => a.slice().sort(() => Math.random() - 0.5);

  Gen.add('es_ledcRes', () => {
    const f = pick([20, 50, 500, 1000, 5000, 10000, 20000, 25000, 40000, 100000, 250000, 312500, 1000000]);
    const raw = Math.floor(Math.log2(80e6 / f)), b = Math.min(20, raw);
    return N(`LEDC del ESP32 clásico con reloj de 80 MHz. ¿Resolución máxima (en bits) para un PWM de ${fHz(f)}?`, b, 'bits',
      `80 000 000 / ${fmt(f)} = ${fmt(80e6 / f, 1)} cuentas por periodo. La mayor potencia de 2 que cabe es 2^${raw} = ${fmt(2 ** raw)}${raw > 20 ? ', pero el ESP32 clásico no pasa de 20 bits' : ''}.`, 0.01);
  }, 'es_ledc');

  Gen.add('es_ledcFreq', () => {
    const b = pick([8, 10, 11, 12, 13, 14, 16]), f = 80e6 / 2 ** b;
    return N(`Quieres ${b} bits de resolución en el LEDC (reloj de 80 MHz). ¿Frecuencia máxima del PWM en kHz?`, f / 1000, 'kHz',
      `f = 80 MHz / 2^${b} = 80 000 000 / ${fmt(2 ** b)} = ${fmt(f / 1000, 3)} kHz. Cada bit de más divide la frecuencia entre 2.`, f / 1000 * 0.01);
  }, 'es_ledc');

  Gen.add('es_adcAtten', () => {
    const [v, ok] = pick([[0.5, '0 dB'], [0.8, '0 dB'], [1.1, '2,5 dB'], [1.6, '6 dB'], [1.7, '6 dB'], [2.2, '11 dB'], [2.4, '11 dB'], [3.0, '11 dB y un divisor delante'], [3.3, '11 dB y un divisor delante']]);
    const all = ['0 dB', '2,5 dB', '6 dB', '11 dB', '11 dB y un divisor delante'];
    return MC(`ESP32 clásico: una señal va de 0 a ${fmt(v)} V. ¿Qué atenuación eliges para tener la mejor resolución sin salir de la zona fiable?`, ok, sh(all.filter(x => x !== ok)),
      'Zonas fiables orientativas (ESP-IDF, ESP32 clásico): 0 dB hasta ~0,95 V; 2,5 dB hasta ~1,25 V; 6 dB hasta ~1,75 V; 11 dB hasta ~2,45 V. Por encima, divisor. La atenuación más baja que abarque la señal da más mV por cuenta útiles.');
  }, 'es_adc');

  Gen.add('es_battDiv', () => {
    let R1, R2, vb, mv;
    do { [R1, R2] = pick([[100000, 100000], [220000, 100000], [150000, 100000], [330000, 100000], [100000, 47000], [470000, 220000]]); vb = pick([3.5, 3.7, 3.9, 4.1, 4.2, 6.6, 7.4, 8.2]); mv = Math.round(vb * R2 / (R1 + R2) * 1000); } while (mv > 2450 || mv < 300);
    const kR = r => fmt(r / 1000) + ' kΩ';
    return N(`Mides una batería con un divisor: R1 = ${kR(R1)} arriba y R2 = ${kR(R2)} abajo. analogReadMilliVolts() devuelve ${mv} mV. ¿Tensión de la batería en V?`, mv / 1000 * (R1 + R2) / R2, 'V',
      `Vbat = Vpin × (R1 + R2) / R2 = ${fmt(mv / 1000)} × ${fmt((R1 + R2) / R2, 3)} = ${fmt(mv / 1000 * (R1 + R2) / R2, 2)} V.`, 0.03);
  }, 'es_adc');

  Gen.add('es_sleepLife', () => {
    const Ia = pick([80, 100, 120, 150]), ta = pick([0.3, 1, 2, 4, 6]), T = pick([5, 10, 15, 30, 60]), Is = pick([10, 25, 60, 150, 1000]), C = pick([1000, 2000, 2600, 3000]);
    const per = T * 60, Iavg = (Ia * ta + Is / 1000 * (per - ta)) / per, days = C / Iavg / 24;
    return N(`Nodo a batería: despierta cada ${T} min, pasa ${fmt(ta)} s activo a ${Ia} mA y duerme a ${fmt(Is)} µA. Batería de ${C} mAh. ¿Cuántos días dura (sin contar autodescarga)?`, days, 'días',
      `Imedia = (${Ia} × ${fmt(ta)} + ${fmt(Is / 1000, 3)} × ${fmt(per - ta, 1)}) / ${per} = ${fmt(Iavg, 4)} mA. Días = ${C} / ${fmt(Iavg, 4)} / 24 ≈ ${fmt(days, 0)}.`, days * 0.03);
  }, 'es_sleep');

  Gen.add('es_uartTime', () => {
    const baud = pick([9600, 19200, 57600, 115200, 921600]);
    if (Math.random() < 0.35) return N(`UART a ${fmt(baud)} baudios. ¿Cuánto dura un bit, en microsegundos?`, 1e6 / baud, 'µs', `T = 1 / ${fmt(baud)} s = ${fmt(1e6 / baud, 3)} µs.`, 1e6 / baud * 0.02);
    const n = pick([1, 10, 64, 100, 250, 1000]), ms = n * 10 / baud * 1000;
    return N(`UART a ${fmt(baud)} baudios, formato 8N1. ¿Cuánto tarda en enviar ${n} bytes, en milisegundos?`, ms, 'ms', `Cada byte son 10 bits (inicio + 8 + parada): ${n} × 10 / ${fmt(baud)} = ${fmt(ms, 3)} ms.`, Math.max(ms * 0.02, 0.001));
  }, 'es_bus');

  Gen.add('es_stack', () => {
    const al = pick([2048, 3072, 4096, 8192]), hw = 4 * ri(16, Math.floor(al / 8));
    if (Math.random() < 0.5) return N(`Creas una tarea con ${al} bytes de pila. uxTaskGetStackHighWaterMark() devuelve ${hw}. ¿Cuántos bytes ha llegado a usar como máximo?`, al - hw, 'bytes',
      `En ESP-IDF la pila se mide en bytes. Usado = ${al} − ${hw} = ${al - hw} bytes. La marca indica lo mínimo que ha llegado a quedar libre.`, 0.5);
    const pct = hw / al * 100, ok = hw >= 512;
    return MC(`Tarea con ${al} bytes de pila; la marca de agua alta es ${hw} bytes (${fmt(pct, 0)} % libre en el peor momento). ¿Qué haces?`,
      ok ? 'Está bien: queda margen (más de unos 512 bytes)' : 'Subir la pila: queda demasiado poco margen',
      [ok ? 'Subir la pila: queda demasiado poco margen' : 'Está bien: queda margen (más de unos 512 bytes)', 'Bajar la pila a la mitad sin medir más', 'Nada: la pila crece sola'],
      'Una llamada más profunda o un printf grande pueden comerse cientos de bytes. Deja margen y mide en el peor caso.');
  }, 'es_rtos');

  Gen.add('es_timerAlarm', () => {
    let f, ms, n;
    do { f = pick([1000, 10000, 100000, 1000000, 10000000]); ms = pick([0.5, 1, 2, 10, 50, 250, 1000]); n = f * ms / 1000; } while (n < 1 || n !== Math.round(n));
    return N(`Arduino-ESP32 3.x: timerBegin(${fmt(f)}) hace que el temporizador cuente ${fHz(f)}. ¿Qué valor pasas a timerAlarm() para una interrupción cada ${fmt(ms)} ms?`, n, 'cuentas',
      `Cuentas = frecuencia × periodo = ${fmt(f)} × ${fmt(ms / 1000, 4)} s = ${fmt(n)}.`, 0.5);
  }, 'es_isr');

  Gen.add('es_dbm', () => {
    const d = pick([0, 3, 8.5, 10, 13, 15, 17, 20]), mw = 10 ** (d / 10);
    const f = x => fmt(x, x < 10 ? 2 : 1) + ' mW';
    return MC(`El ESP32 transmite a ${fmt(d)} dBm. ¿Cuántos milivatios son?`, f(mw), [f(d * 10 || 10), f(10 ** (d / 20)), f(d / 10 || 0.1), f(mw * 10), f(mw / 10)],
      `P(mW) = 10^(dBm / 10) = 10^${fmt(d / 10, 2)} ≈ ${f(mw)}. Cada 3 dB es casi el doble; cada 10 dB, ×10. 20 dBm = 100 mW.`);
  }, 'es_wifi');

  Gen.add('es_i2sRate', () => {
    const fs = pick([8000, 16000, 22050, 44100, 48000]), bits = pick([16, 32]), ch = pick([1, 2]);
    if (Math.random() < 0.5) {
      const kB = fs * bits / 8 * ch / 1000;
      return N(`Audio I²S a ${fmt(fs)} Hz, ${bits} bits por muestra y ${ch === 1 ? 'mono' : 'estéreo'}. ¿Cuántos kB por segundo hay que mover?`, kB, 'kB/s', `${fmt(fs)} × ${bits / 8} bytes × ${ch} = ${fmt(kB * 1000)} B/s = ${fmt(kB, 2)} kB/s.`, kB * 0.01);
    }
    const n = pick([256, 512, 1024, 2048]), ms = n / fs * 1000;
    return N(`Un búfer DMA de ${n} muestras por canal a ${fmt(fs)} Hz. ¿Cuántos milisegundos de audio guarda?`, ms, 'ms', `${n} / ${fmt(fs)} = ${fmt(ms, 2)} ms. Ese es el margen que tiene tu tarea para rellenarlo.`, ms * 0.02);
  }, 'es_i2s');

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
  const LED_HINT = 'Cada LED: pin → resistencia de 100 a 220 Ω → ánodo (pata larga); cátodo a GND. A 3,3 V una de 470 Ω apenas lo enciende.';

  const M1 = [
    L('es1', 'Por dentro del ESP32', 'chip', ['es_family'], [
      I('El ESP32 es un <b>SoC</b> (sistema en un chip): procesador, memoria, periféricos y radio en un solo trozo de silicio.\nEl clásico lleva <b>dos núcleos Xtensa LX6</b> de hasta 240 MHz, <b>520 KB de SRAM</b>, WiFi de 2,4 GHz, Bluetooth clásico y BLE.'),
      I('Lo que <b>no</b> lleva dentro es la memoria del programa. Tu código vive en una <b>flash SPI externa</b> (4 MB es lo típico) que va dentro del módulo metálico. El chip la lee a través de una caché.\nPor eso hay pines “ocupados” por la flash: lo verás en el módulo 2.'),
      Q('¿Dónde se guarda tu programa en un ESP32-WROOM-32E?', ['En una flash SPI dentro del módulo, junto al chip', 'En la SRAM interna, para siempre', 'En el convertidor USB-serie', 'En la ROM del chip'], 'La SRAM se borra al apagar; la ROM es de fábrica y no se puede escribir.'),
      { t: 'match', q: 'Une cada memoria con su papel.', pairs: [['SRAM (520 KB)', 'Variables y pilas mientras funciona'], ['Flash externa', 'Programa y archivos; no se borra al apagar'], ['ROM interna', 'Cargador de arranque de fábrica'], ['Memoria RTC', 'Datos que sobreviven al deep sleep']] },
      I('Tres niveles que conviene no confundir:\n· <b>Chip</b>: el silicio (por ejemplo ESP32-D0WD-V3).\n· <b>Módulo</b>: chip + flash + cristal de 40 MHz + antena bajo una tapa, ya homologado (WROOM-32E).\n· <b>Placa de desarrollo</b>: módulo + USB + regulador + botones (DevKitC).'),
      { t: 'order', q: 'Ordena de dentro hacia fuera.', items: ['El chip ESP32', 'El módulo: chip, flash, cristal y antena bajo la tapa', 'La placa DevKit: módulo, USB, regulador y botones', 'Tu montaje: placa, protoboard y sensores'], e: 'Cada capa añade lo que la anterior necesita para usarse.' },
      Q('¿Por qué casi todos los productos usan módulos y no el chip suelto?', ['La radio ya está ajustada y homologada: te ahorras diseñar la antena y certificar el transmisor', 'Son más rápidos', 'Tienen más pines', 'Funcionan a 5 V'], 'Certificar un transmisor es caro y lento.'),
      Q('Dos núcleos: el 0 (PRO_CPU) y el 1 (APP_CPU). En Arduino, ¿dónde corre loop()?', ['En el núcleo 1; la pila WiFi suele ir en el 0', 'En los dos a la vez', 'Siempre en el 0', 'En el coprocesador ULP'], 'Lo verás a fondo con FreeRTOS.'),
      Nm('¿Cuánto dura un ciclo de reloj a 240 MHz, en nanosegundos?', 4.17, 'ns', 'T = 1 / 240 000 000 s ≈ 4,17 ns.', { tol: 0.05, c: 'pow10' }),
      Q('Necesitas un búfer de imagen de 300 KB además de WiFi. ¿Qué buscas?', ['Un módulo con PSRAM (WROVER, o un S3 con PSRAM)', 'Más flash', 'Un ESP32 a 5 V', 'Apagar el Bluetooth'], 'La PSRAM es RAM externa extra; la flash no sirve como RAM de trabajo.')
    ]),
    L('es2', 'La familia: S2, S3, C3, C6 y más', 'chip', ['es_family'], [
      I('Espressif ha sacado muchas variantes. Con núcleos <b>Xtensa</b>:\n· <b>ESP32</b>: dos núcleos LX6, Bluetooth clásico y BLE, DAC, touch.\n· <b>S2</b>: un núcleo LX7, USB nativo, sin Bluetooth.\n· <b>S3</b>: dos núcleos LX7, USB nativo, instrucciones vectoriales para IA, BLE 5.'),
      I('Con núcleos <b>RISC-V</b>:\n· <b>C3</b>: un núcleo a 160 MHz, WiFi y BLE 5, barato.\n· <b>C6</b>: WiFi 6, BLE 5 y radio para <b>Thread y Zigbee</b>.\n· <b>H2</b>: sin WiFi; BLE, Thread y Zigbee.\n· <b>P4</b>: sin radio, mucha potencia para pantallas y cámaras.'),
      { t: 'match', q: 'Une cada chip con su rasgo más característico.', pairs: [['ESP32 clásico', 'Bluetooth clásico y DAC'], ['ESP32-S3', 'USB nativo y aceleración de IA'], ['ESP32-C3', 'RISC-V barato con BLE 5'], ['ESP32-C6', 'WiFi 6, Thread y Zigbee']] },
      Q('Quieres hacer un receptor de audio Bluetooth (A2DP) para unos altavoces.', ['ESP32 clásico: es el de la familia con Bluetooth clásico', 'ESP32-S3', 'ESP32-C3', 'ESP32-S2'], 'A2DP es Bluetooth clásico; los S3 y C3 solo tienen BLE y el S2 no tiene Bluetooth.'),
      Q('Un mando que el PC reconozca como teclado USB.', ['S3 (o S2): tienen USB OTG nativo', 'ESP32 clásico', 'C3', 'Cualquiera'], 'El USB de un DevKit clásico es un chip USB-serie aparte.', { c: 'es_family' }),
      Q('Un sensor de puerta para una red Zigbee.', ['C6 (o H2)', 'S3', 'ESP32 clásico', 'S2'], 'Llevan la radio para Thread y Zigbee.'),
      I('Lo que cambia de un chip a otro: número de GPIO, qué pines son de arranque, cuántos ADC, si hay DAC o touch, cuántos canales de PWM…\nRegla de oro: <b>manda la hoja de datos de tu chip</b>. Un tutorial de ESP32 clásico puede estar mal para un C3.'),
      Q('Un tutorial usa dacWrite(25, 128) y tú tienes un S3.', ['No funcionará: el S3 no tiene DAC', 'Funciona igual', 'Saca 5 V', 'Va más rápido'], 'El DAC solo está en el ESP32 clásico y el S2.'),
      Q('Un tutorial lee un sensor en el GPIO 34, pero tu placa es un C3.', ['El C3 no tiene GPIO 34: busca un pin con ADC en su hoja de datos', 'Funciona igual', 'Usas el 3 y el 4', 'Se quema'], 'El C3 tiene del GPIO 0 al 21.'),
      Q('Proyecto a pila, con BLE para el móvil y lo más barato posible.', ['ESP32-C3', 'ESP32-P4', 'ESP32-S3 con PSRAM', 'ESP32 WROVER'], 'Un solo núcleo RISC-V y BLE 5 bastan.')
    ]),
    L('es3', 'La placa DevKit por dentro', 'chip', ['es_3v3'], [
      I('En una DevKitC (o “ESP32 DevKit V1”) hay, además del módulo:\n· Un <b>convertidor USB-serie</b> (CP2102 o CH340).\n· Un <b>regulador lineal</b> de 3,3 V (a menudo un AMS1117).\n· Los botones <b>EN</b> y <b>BOOT</b>.\n· Un LED de alimentación y, a veces, un LED en el GPIO 2.'),
      { t: 'match', q: 'Une cada pieza de la placa con su función.', pairs: [['CP2102 / CH340', 'Convierte USB en puerto serie'], ['AMS1117', 'Baja 5 V a 3,3 V'], ['EN', 'Reinicia el chip'], ['BOOT', 'Lleva el GPIO 0 a masa']] },
      I('<b>EN</b> es el pin de habilitación del chip: al soltarlo, arranca. <b>BOOT</b> pone el GPIO 0 a masa: si está a masa justo al arrancar, el chip entra en <b>modo descarga</b> y espera un programa por el puerto serie.\nDos transistores en la placa hacen esto solos con las líneas DTR y RTS del USB-serie.'),
      Q('Al subir un programa sale “Connecting…_____” y acaba fallando.', ['Mantén BOOT mientras conecta (o pon 10 µF entre EN y GND si pasa siempre)', 'Cambia de placa', 'Desconecta el USB', 'Pulsa EN sin parar'], 'El circuito automático falla con algunos cables, puertos o placas.'),
      Q('¿Qué son los pines VIN (o 5V) y 3V3 de la placa?', ['VIN entra al regulador (5 V del USB); 3V3 es su salida', 'Los dos son de 5 V', '3V3 es una entrada que no hay que tocar', 'VIN da 3,3 V'], 'Por VIN entra la alimentación; por 3V3 sale la regulada.'),
      I('El regulador lineal necesita algo más de 1 V de margen. Desde 5 V va bien. Desde una batería de litio (3,7–4,2 V) por VIN se queda corto en cuanto la batería baja.\nAdemás gasta unos miliamperios en reposo: con deep sleep, esa corriente te vacía la batería.'),
      Q('Conectas una Li-ion directamente a VIN de un DevKit con AMS1117.', ['Funciona mal cuando la batería baja: el regulador necesita más margen', 'Perfecto para siempre', 'Explota', 'Da 5 V'], 'Para baterías: un LDO de poca caída y poco consumo, o una placa pensada para ello.'),
      Nm('Con 5 V de entrada y 3,3 V de salida, el regulador entrega 250 mA. ¿Cuánto calor disipa, en W?', 0.425, 'W', '(5 − 3,3) × 0,25 = 0,425 W.', { tol: 0.01, c: 'power' }),
      Q('¿Puedes alimentar la placa por el pin 3V3 con una fuente de 3,3 V?', ['Sí: entra directa al módulo, saltándose el regulador (nunca más de 3,6 V)', 'No, nunca', 'Sí, con 5 V', 'Solo con pilas AA'], 'El módulo admite de 3,0 a 3,6 V.'),
      Q('Un cable USB “de carga” no deja subir programas. ¿Por qué?', ['Solo tiene los hilos de alimentación, no los de datos', 'Es demasiado largo siempre', 'Da 12 V', 'Le falta un driver'], 'Ten un cable de datos marcado para tus placas.')
    ]),
    L('es4', 'El núcleo Arduino-ESP32 y el arranque', 'code', ['es_idf'], [
      I('El núcleo <b>Arduino-ESP32</b> lo mantiene Espressif y es una capa sobre su framework, <b>ESP-IDF</b>.\nLa versión 3 se basa en ESP-IDF 5 y cambió APIs (PWM con LEDC, temporizadores…). En este curso usamos la 3: si un ejemplo de internet no compila, mira de qué versión es.'),
      { t: 'order', q: 'Ordena lo que pasa al pulsar “Subir”.', items: ['Se compila el código en un archivo .bin', 'esptool pone el chip en modo descarga (EN y GPIO 0)', 'Se graban en la flash el cargador, la tabla de particiones y la aplicación', 'Reinicio: el cargador arranca tu aplicación', 'Abres el monitor serie a 115 200 baudios'], e: 'El monitor solo tiene sentido cuando la aplicación ya corre.' },
      I('Al arrancar, la ROM del chip imprime unas líneas a 115 200 baudios. La primera dice el <b>motivo del reinicio</b>.', { code: 'rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)\n...\nentry 0x400805e4' }),
      Q('El monitor repite “Guru Meditation Error” seguido de “rst:0xc (SW_CPU_RESET)”. ¿Qué significa?', ['Tu programa provoca un fallo grave y el sistema se reinicia: lee el backtrace', 'Que todo va bien', 'Que falta alimentación seguro', 'Que el WiFi está conectando'], 'Es un pánico: puntero inválido, desbordamiento, división entre cero…', { code: 'Guru Meditation Error: Core 1 panic\'ed (LoadProhibited)\n...\nrst:0xc (SW_CPU_RESET),boot:0x13' }),
      Q('Aparece “Brownout detector was triggered” y se reinicia.', ['La alimentación cayó por debajo del umbral: picos de consumo o cable malo', 'Error de sintaxis', 'Flash llena', 'Contraseña WiFi mal'], 'Lo verás a fondo en el módulo 2.', { c: 'es_brown' }),
      I('Puedes preguntar al chip por sí mismo:', { code: 'Serial.println(ESP.getChipModel());     // "ESP32-D0WD-V3"\nSerial.println(ESP.getCpuFreqMHz());    // 240\nSerial.println(ESP.getFlashChipSize()); // 4194304\nSerial.println(ESP.getFreeHeap());      // bytes libres\nSerial.println(esp_reset_reason());     // motivo del reinicio' }),
      Q('ESP.getFreeHeap() devuelve unos 300 000. ¿Qué es?', ['Bytes de RAM libres para memoria dinámica', 'Bytes de flash libres', 'La frecuencia en Hz', 'El número de serie'], 'El heap es la RAM que reparten malloc, new, String…'),
      Q('setCpuFrequencyMhz(80) en un proyecto con WiFi:', ['Ahorra energía a cambio de velocidad; 80 MHz es el mínimo para usar el WiFi', 'Rompe el WiFi siempre', 'Aumenta la velocidad', 'No hace nada'], 'Por debajo de 80 MHz la radio no funciona.'),
      Q('Ves texto normal pero también basura al arrancar.', ['La ROM habla a 115 200 y tu programa a otra velocidad: iguala Serial.begin() y el monitor', 'La placa está rota', 'El cable es de carga', 'Falta PSRAM'], 'Usar 115 200 en todo evita confusiones.'),
      Q('ESP.getEfuseMac() devuelve…', ['La MAC única grabada de fábrica en los eFuses', 'La IP', 'La contraseña WiFi', 'La versión del núcleo'], 'Sirve como identificador único de cada placa.')
    ]),
    SIM('es-s1', 'Reto: coche fantástico', 'Monta seis LED en los pines del programa para que la luz barra de un lado a otro.', { arduino: 'es_knight', board: 'esp32', parts: ['res', 'led'], code: true, hint: 'LED en los GPIO 13, 14, 27, 26, 25 y 33 (fila de abajo de la placa). ' + LED_HINT }, 'es_knight'),
    SIM('es-s2', 'Reto: contador binario', 'Cuatro LED muestran la cuenta de 0 a 15. Colócalos en el orden de los bits.', { arduino: 'es_binario', board: 'esp32', parts: ['res', 'led'], code: true, hint: 'Bit 0 en el GPIO 25, bit 1 en el 26, bit 2 en el 27 y bit 3 en el 14. ' + LED_HINT }, 'es_binario'),
    PRJ('es-p1', 'Proyecto: banco de pruebas de tu ESP32', 'es_bench')
  ];

  const M2 = [
    L('es5', 'Alimentación: 3,3 V, picos y brownout', 'bolt', ['es_brown'], [
      I('El módulo WROOM trabaja entre <b>3,0 y 3,6 V</b>. Sin radio consume unas decenas de mA, pero al <b>transmitir por WiFi</b> pide picos de unos <b>240 mA</b> durante milisegundos.'),
      I('Si la fuente, el cable o el regulador no dan esos picos, la tensión cae. El <b>detector de caída</b> (brownout) lo ve y reinicia el chip antes de que haga algo raro.\nSíntoma típico: se reinicia justo al conectar al WiFi.'),
      Q('Tu placa se reinicia solo al conectar al WiFi. ¿Primera sospecha?', ['Alimentación: cable, puerto USB o regulador insuficiente', 'La contraseña', 'El código es lento', 'Falta una pull-up'], 'Prueba con otro cable corto y otro puerto o un cargador bueno.'),
      I('Remedios por orden:\n· Cable USB corto y bueno; fuente capaz (500 mA o más).\n· Electrolítico de 100–470 µF y cerámico de 100 nF entre 3V3 y GND, pegados al módulo.\n· Servos, motores y tiras LED con <b>su propia fuente</b> y masa común.'),
      Q('¿Y desactivar el detector de brownout para que no se reinicie?', ['Esconde el problema: el chip trabaja con tensión baja y puede corromper la flash', 'Lo arregla', 'Ahorra energía', 'Es lo recomendado'], 'Arregla la causa, no el aviso.'),
      Nm('Un pico de 250 mA durante 1 ms sale solo de un condensador de 470 µF. ¿Cuánto baja su tensión, en V?', 0.53, 'V', 'ΔV = I · t / C = 0,25 × 0,001 / 0,00047 ≈ 0,53 V. El condensador ayuda, pero el regulador debe aportar el resto.', { tol: 0.03, c: 'cap' }),
      I('Cada GPIO puede dar o absorber corriente, pero con límites: no pases de unos <b>20 mA por pin</b> (el máximo absoluto ronda los 40 mA). Para más, un transistor.\nCon 3,3 V la resistencia de un LED se calcula igual: <b>R = (3,3 − Vf) / I</b>.'),
      Nm('LED rojo (1,8 V) a 10 mA desde un GPIO de 3,3 V. ¿Resistencia?', 150, 'Ω', '(3,3 − 1,8) / 0,01 = 150 Ω.', { tol: 2, c: 'led' }),
      Q('Un LED azul (unos 3,0 V) directamente desde un GPIO de 3,3 V con resistencia.', ['Queda muy poco margen: poca corriente e inestable; mejor un transistor desde 5 V', 'Brilla muchísimo', 'Se quema seguro', 'No polariza'], 'Con 0,3 V de margen, cualquier variación cambia mucho la corriente.', { c: 'led' }),
      Q('La salida Echo de un sensor HC-SR04 (5 V) al ESP32:', ['Con un divisor (1 kΩ y 2 kΩ) o un adaptador de nivel', 'Directa', 'Con 10 Ω en serie', 'Con un diodo al revés'], 'Los pines no toleran 5 V.', { c: 'es_3v3' })
    ]),
    L('es6', 'Pines con trampa', 'chip', ['es_strap'], [
      I('Al arrancar, el chip lee unos pines para decidir cómo hacerlo: son los pines de <b>arranque</b> (strapping): <b>GPIO 0, 2, 5, 12 y 15</b>.\nLuego son pines normales, pero si tu circuito los fuerza al nivel equivocado, la placa no arranca.'),
      { t: 'match', q: 'Une cada pin de arranque con su efecto.', pairs: [['GPIO 0', 'A masa al arrancar: modo descarga'], ['GPIO 2', 'Debe estar bajo o al aire para programar'], ['GPIO 12', 'Alto al arrancar: flash a 1,8 V, no arranca'], ['GPIO 15', 'Bajo al arrancar: silencia los mensajes de la ROM']] },
      Q('Pones un pulsador con pull-up de 10 kΩ en el GPIO 12 y la placa deja de arrancar.', ['El 12 alto al arrancar elige tensión de flash de 1,8 V', 'El 12 no tiene pull-up', 'Falta antirrebote', 'El pulsador consume demasiado'], 'Usa otro pin o deja el 12 bajo en el arranque.'),
      I('Los <b>GPIO 6 a 11</b> van a la flash del módulo. Si los tocas, el programa se cuelga.\nEn módulos con PSRAM (WROVER), los <b>16 y 17</b> también están ocupados.'),
      Q('¿Puedes usar el GPIO 9 para un LED?', ['No: es de la flash y el programa se colgaría', 'Sí, sin problema', 'Solo con PWM', 'Solo con una resistencia grande'], 'Muchas placas ni siquiera lo sacan.'),
      I('Los <b>GPIO 34, 35, 36 (VP) y 39 (VN)</b> son <b>solo de entrada</b>: no pueden ser salida y <b>no tienen pull-up ni pull-down internas</b>.\nY los GPIO 1 y 3 son el puerto serie del USB: si los usas, pierdes el monitor.'),
      Q('Un pulsador a GND en el GPIO 34 con INPUT_PULLUP lee valores al azar.', ['El 34 no tiene pull-up interna: pon una de 10 kΩ externa a 3V3', 'Está roto', 'Falta delay', 'Debe ir a 5 V'], 'INPUT_PULLUP no hace nada en 34–39.', { code: 'pinMode(34, INPUT_PULLUP);  // ¿?\nint b = digitalRead(34);' }),
      { t: 'match', q: 'Clasifica estos grupos de pines.', pairs: [['6 a 11', 'Prohibidos: la flash'], ['34 a 39', 'Solo entrada, sin pull-ups'], ['0, 2, 5, 12, 15', 'De arranque: con cuidado'], ['13, 14, 25, 26, 27, 32, 33', 'Cómodos para casi todo']] },
      Q('¿Qué pin es el más seguro para un LED?', ['GPIO 25', 'GPIO 12', 'GPIO 0', 'GPIO 34'], 'El 12 y el 0 son de arranque y el 34 solo de entrada.'),
      Q('Conectas un módulo al GPIO 2 y a veces falla la subida del programa.', ['Si el módulo mantiene el 2 alto, el chip no entra en modo descarga', 'El 2 es de la flash', 'El 2 es solo de entrada', 'Pasa con todos los pines'], 'Desconéctalo al programar o usa otro pin.'),
      Q('Para una salida que no debe moverse al arrancar (un relé, por ejemplo), evita…', ['Los pines de arranque y los que emiten pulsos al arrancar, como el 1 o el 15', 'Los pines 25 y 26', 'Cualquier pin con número par', 'Los pines del ADC1'], 'Algunos pines dan pulsos o mensajes durante el arranque: el relé haría clic.')
    ]),
    L('es7', 'La matriz GPIO', 'bus', ['es_bus'], [
      I('En el ESP32, casi cualquier periférico digital (UART, I²C, SPI, LEDC, RMT…) puede salir por casi cualquier GPIO gracias a la <b>matriz GPIO</b>, un conmutador interno.\nPor eso escribes Wire.begin(sda, scl) con los pines que te convengan.'),
      I('Dos excepciones:\n· Lo <b>analógico</b> (ADC, DAC, touch) va fijo a sus pines.\n· Algunas señales muy rápidas (SPI a máxima velocidad, tarjetas SD) van mejor por el <b>IO_MUX</b>, una conexión directa a pines concretos.'),
      Q('¿Puedes leer una tensión analógica en el GPIO 23?', ['No: el ADC solo está en sus pines fijos', 'Sí, la matriz lo conecta', 'Solo a 8 bits', 'Solo con WiFi'], 'El 23 no tiene canal de ADC.'),
      Q('¿Qué hace esta línea?', ['Inicia el I²C con SDA en el 16 y SCL en el 17', 'Lee los pines 16 y 17', 'Configura una UART', 'Nada'], 'En un WROVER el 16 y el 17 son de la PSRAM: allí elegirías otros.', { code: 'Wire.begin(16, 17);' }),
      I('Pines “por defecto” (convención, no obligación) en Arduino-ESP32:\n· I²C: SDA 21, SCL 22.\n· SPI (VSPI): SCK 18, MISO 19, MOSI 23, CS 5.\n· UART2: RX 16, TX 17.'),
      { t: 'match', q: 'Une cada señal con su pin habitual.', pairs: [['SDA', 'GPIO 21'], ['SCL', 'GPIO 22'], ['SCK', 'GPIO 18'], ['MOSI', 'GPIO 23']] },
      Q('Un GPS por la UART1. ¿Qué haces?', ['Indicar los pines: Serial1.begin(9600, SERIAL_8N1, 26, 27)', 'Usar los pines 9 y 10 de fábrica', 'Usar los pines 1 y 3', 'Nada, la UART1 no existe'], 'Los pines originales de la UART1 (9 y 10) son de la flash: indica siempre los tuyos.'),
      I('Para cambiar varios pines <b>a la vez</b>, sin los cientos de nanosegundos de cada digitalWrite, puedes escribir los registros directamente: uno pone a 1 los bits marcados y otro los pone a 0.', { code: 'REG_WRITE(GPIO_OUT_W1TS_REG, (1 << 25) | (1 << 26)); // 25 y 26 a 1\nREG_WRITE(GPIO_OUT_W1TC_REG, (1 << 25));             // 25 a 0' }),
      Q('¿Qué ventaja tiene escribir en GPIO_OUT_W1TS_REG?', ['Cambia varios pines en la misma instrucción sin tocar los demás', 'Funciona a 5 V', 'Usa menos energía siempre', 'Sirve para leer el ADC'], 'W1TS: “write 1 to set”. Útil para buses paralelos y señales sincronizadas.'),
      G('es_uartTime')
    ]),
    L('es8', 'El ADC: ADC1, ADC2 y atenuación', 'gauge', ['es_adc'], [
      I('El ESP32 clásico tiene dos ADC SAR de 12 bits:\n· <b>ADC1</b>: GPIO 32 a 39.\n· <b>ADC2</b>: GPIO 0, 2, 4, 12–15 y 25–27.\nCon el <b>WiFi activo, el ADC2 no se puede usar</b>: lo ocupa el driver de radio.'),
      Q('Un joystick en un proyecto con WiFi. ¿Qué pines?', ['GPIO 32 a 39 (ADC1)', 'GPIO 25 a 27', 'GPIO 0 y 2', 'Cualquiera'], 'El ADC2 queda bloqueado con la radio.'),
      I('Dentro, el ADC solo mide hasta un voltio y poco. Un <b>atenuador</b> divide la entrada para medir más: 0 dB, 2,5 dB, 6 dB u 11 dB (en ESP-IDF 5 ese último se llama 12 dB; es el mismo).\nArduino usa 11 dB por defecto.'),
      I('Juega con la tensión y la atenuación. Fíjate en la zona verde: ahí el ADC es casi lineal.', { tune: { viz: 'es_adc', params: { V: { label: 'Tensión en el pin', val: 1.2, min: 0, max: 3.3, step: 0.05, unit: 'V', dec: 2 }, at: { label: 'Atenuación', val: 11, list: [0, 2.5, 6, 11], unit: 'dB', dec: 1 } } } }),
      TU('Una señal de 1,6 V como máximo: elige la atenuación con más resolución que la deje en la zona fiable.', 'es_adc', { V: { val: 1.6, fixed: true }, at: { label: 'Atenuación', val: 0, list: [0, 2.5, 6, 11], unit: 'dB', dec: 1 } }, { q: 'fit', min: 1, max: 1, text: 'Objetivo: 1,6 V en zona fiable con la menor atenuación', hint: 'Con 2,5 dB se sale; con 11 dB vale pero pierdes resolución.' }, '6 dB: fiable hasta unos 1,75 V.'),
      G('es_adcAtten'),
      Q('Un divisor deja 2,8 V en el pin (11 dB) y la lectura sale baja.', ['Por encima de unos 2,45 V el ADC se comprime: rehaz el divisor', 'El pin está roto', 'Falta un condensador', 'Hay que usar el ADC2'], 'Diseña para quedarte en la zona recta.'),
      I('Cada chip trae <b>calibración de fábrica</b> en sus eFuses. analogReadMilliVolts() la aplica y devuelve milivoltios corregidos: casi siempre mejor que convertir analogRead() a mano.', { code: 'int mv = analogReadMilliVolts(34);  // milivoltios calibrados' }),
      I('El ADC del ESP32 es ruidoso: decenas de cuentas de baile. Remedios:\n· 100 nF del pin a masa.\n· Promediar N lecturas: el ruido aleatorio baja en √N.\n· No medir justo mientras transmite el WiFi.'),
      Nm('¿Por cuánto se divide el ruido aleatorio si promedias 16 lecturas?', 4, '', '√16 = 4.', { tol: 0.01 }),
      G('es_battDiv'),
      Q('Por debajo de unos 0,1 V el ADC lee casi siempre 0. Esto significa…', ['Que tiene una zona muerta abajo: no midas señales muy pequeñas sin amplificarlas', 'Que está roto', 'Que la atenuación es 0 dB', 'Que hay WiFi'], 'Para señales de milivoltios, un amplificador o un ADC externo.')
    ]),
    L('es9', 'Medir bien: divisores, filtros e histéresis', 'gauge', ['es_adc'], [
      I('El ADC carga un pequeño condensador interno en cada lectura. Si la fuente es muy “débil” (un divisor de varios MΩ), no le da tiempo y la lectura sale baja.\nSoluciones: divisor de 100 kΩ o menos, o un <b>condensador de 100 nF</b> en el pin que hace de depósito.', { c: 'divider' }),
      Q('Divisor de 2 MΩ y 2 MΩ sin condensador: la lectura sale baja y ruidosa.', ['La fuente es muy débil para el condensador de muestreo: pon 100 nF en el pin', 'El ADC está roto', 'Falta WiFi', 'Debe ir a 5 V'], 'El condensador entrega la carga rápida que el divisor no puede dar.'),
      I('Un divisor siempre conectado gasta batería: con 200 kΩ en total y 4,2 V, unos 21 µA. En un nodo que duerme a 10 µA, eso es más que el propio chip.\nOpciones: resistencias de 1 MΩ con condensador, o un MOSFET que conecte el divisor solo al medir.'),
      Nm('Divisor de 100 kΩ + 100 kΩ en una batería de 4,2 V. ¿Corriente, en µA?', 21, 'µA', '4,2 / 200 000 = 21 µA.', { tol: 0.5, c: 'ohm' }),
      I('Un <b>filtro exponencial</b> (EMA) suaviza el ruido con una línea:\n<b>y = y + α · (x − y)</b>\nCon α pequeño, la salida es suave pero reacciona despacio.', { code: 'filtrado += 0.1 * (lectura - filtrado);' }),
      Q('¿Qué hace la línea anterior con α = 0,1?', ['Un filtro paso bajo: suaviza el ruido y responde más despacio', 'Amplifica la señal', 'Elimina la continua', 'Cuenta pulsos'], 'Cada lectura nueva pesa un 10 %.', { c: 'filter' }),
      I('<b>Calibración a dos puntos</b>: mides con el multímetro dos tensiones conocidas, anotas lo que lee el ESP32 y sacas la recta que las une. Luego corriges cada lectura con esa recta.'),
      Nm('Lecturas: 500 corresponde a 0,50 V y 3000 a 2,45 V. Con una recta entre ambos, ¿cuántos V son 1800?', 1.514, 'V', 'Pendiente = 1,95 / 2500 = 0,00078 V por cuenta. 0,50 + 1300 × 0,00078 ≈ 1,51 V.', { tol: 0.02 }),
      I('Un umbral único “tiembla” cuando la señal está justo encima: el LED parpadea. La <b>histéresis</b> usa dos umbrales: encender al pasar de uno y apagar al bajar del otro.'),
      Q('Con este código, el LED está apagado y la lectura es 2700. ¿Qué pasa?', ['Sigue apagado: está entre los dos umbrales', 'Se enciende', 'Parpadea', 'Se reinicia'], 'Hasta que no pase de 3000, no cambia.', { code: 'if (!encendido && luz > 3000) encendido = true;\nif (encendido && luz < 2500) encendido = false;' })
    ]),
    SIM('es-s3', 'Reto: barra de nivel', 'Un potenciómetro en el GPIO 34 controla cuántos de los cinco LED se encienden. Recórrelo de un extremo a otro.', { arduino: 'es_vumetro', board: 'esp32', parts: ['pot', 'res', 'led'], code: true, hint: 'Potenciómetro: extremos a 3V3 y GND (¡no a VIN!), cursor al GPIO 34. LED en 13, 14, 27, 26 y 25. ' + LED_HINT }, 'es_vumetro'),
    SIM('es-s4', 'Reto: luz nocturna con histéresis', 'Divisor con LDR en el GPIO 34 y LED en el 25. Mueve la luz ambiente para que el LED se encienda de noche y se apague de día.', { arduino: 'es_nocturna', board: 'esp32', parts: ['ldr', 'res', 'led'], code: true, hint: 'Resistencia de 10 kΩ de 3V3 al GPIO 34; LDR del GPIO 34 a GND. LED con 150 Ω en el 25. Toca la LDR y mueve “Luz ambiente”.' }, 'es_nocturna'),
    PRJ('es-p2', 'Proyecto: voltímetro calibrado', 'es_voltmeter')
  ];

  const M3 = [
    L('es10', 'LEDC: frecuencia frente a resolución', 'wave', ['es_ledc'], [
      I('El PWM del ESP32 lo hace el periférico <b>LEDC</b>: 16 canales en el clásico (8 en el S3, 6 en el C3), cada uno ligado a uno de sus temporizadores.\nLa regla que lo gobierna: <b>f × 2^bits ≤ 80 MHz</b>.'),
      I('Mueve frecuencia y resolución. Con pocos bits verás los escalones de brillo; con demasiados, la combinación se vuelve imposible.', { tune: { viz: 'es_ledc', params: { f: { label: 'Frecuencia', val: 5000, list: [50, 500, 1000, 5000, 20000, 40000, 100000, 312500, 1000000], unit: 'Hz', dec: 0 }, bits: { label: 'Resolución', val: 8, min: 1, max: 20, step: 1, unit: 'bits', dec: 0 } } } }),
      TU('Un motor a 20 kHz (inaudible): consigue la máxima resolución posible.', 'es_ledc', { f: { val: 20000, fixed: true }, bits: { label: 'Resolución', val: 16, min: 1, max: 20, step: 1, unit: 'bits', dec: 0 } }, { q: 'best', min: 1, max: 1, text: 'Objetivo: la resolución máxima a 20 kHz', hint: '80 000 000 / 20 000 = 4000 cuentas. ¿Qué potencia de 2 cabe?' }, '11 bits: 2048 cuentas caben en 4000.'),
      I('En el núcleo 3.x se trabaja por pin. En el 2.x se usaban canales (ledcSetup + ledcAttachPin): si un ejemplo usa eso, es antiguo.', { code: '// Núcleo 3.x\nledcAttach(18, 5000, 12);   // pin, Hz, bits\nledcWrite(18, 2048);        // 50 %' }),
      Q('¿Qué ciclo de trabajo da este código?', ['25 %', '40 %', '50 %', '100 %'], '1024 / 4096 = 25 %.', { code: 'ledcAttach(18, 5000, 12);\nledcWrite(18, 1024);' }),
      G('es_ledcRes'), G('es_ledcFreq'),
      Nm('Servo a 50 Hz con 16 bits. ¿Qué valor de ledcWrite da un pulso de 1,5 ms?', 4915, '', '1,5 / 20 × 65 536 ≈ 4915.', { tol: 3, c: 'pwm' }),
      Q('Dos pines que comparten temporizador del LEDC comparten…', ['La frecuencia y la resolución; el ciclo de trabajo es de cada uno', 'El ciclo de trabajo', 'Nada', 'El pin'], 'El temporizador marca el ritmo; cada canal decide cuánto tiempo está alto.'),
      Q('¿Y analogWrite() en el ESP32?', ['Funciona en el núcleo 3.x: por debajo usa el LEDC con 8 bits y 1 kHz', 'No existe', 'Es un DAC', 'Solo en el pin 25'], 'Cómodo para empezar; para control fino, ledcAttach.'),
      Q('ledcWriteTone(pin, 440) sirve para…', ['Generar una cuadrada de 440 Hz en un zumbador', 'Leer una frecuencia', 'Reproducir un MP3', 'Ajustar el brillo'], 'Pone el ciclo al 50 % y cambia la frecuencia.')
    ]),
    L('es11', 'DAC y sensores táctiles', 'wave', ['es_touch'], [
      I('El ESP32 clásico (y el S2) tiene un <b>DAC</b> de 8 bits en los <b>GPIO 25 y 26</b>: saca una tensión continua de verdad, no un PWM.\ndacWrite(25, 128) da aproximadamente la mitad de 3,3 V.'),
      Nm('dacWrite(25, 200). ¿Tensión aproximada, en V?', 2.59, 'V', '200 / 255 × 3,3 ≈ 2,59 V.', { tol: 0.04, c: 'adc' }),
      Q('Ventaja del DAC frente a un PWM filtrado:', ['Da una tensión continua sin rizado ni filtro RC', 'Más resolución que 16 bits', 'Más corriente', 'Funciona a 5 V'], 'Pero solo 8 bits y poca corriente de salida.', { c: 'filter' }),
      Q('¿Puede el DAC mover un altavoz de 8 Ω directamente?', ['No: da muy poca corriente; necesita un amplificador', 'Sí, a todo volumen', 'Sí, si es de 3,3 V', 'Solo en mono'], 'Un pin no da cientos de mA.', { c: 'ohm' }),
      I('Los pines <b>táctiles</b> miden la capacidad del pin: tu dedo la aumenta. El clásico tiene 10: T0 es el GPIO 4, T7 el 27, T8 el 33 y T9 el 32, entre otros.\nEn el ESP32 clásico, touchRead() <b>baja</b> al tocar; en el S2 y el S3, <b>sube</b>.'),
      { t: 'match', q: 'Une cada canal táctil con su pin (ESP32 clásico).', pairs: [['T0', 'GPIO 4'], ['T7', 'GPIO 27'], ['T8', 'GPIO 33'], ['T9', 'GPIO 32']] },
      Q('¿Qué detecta este código en un ESP32 clásico?', ['El dedo: la lectura baja al tocar', 'Que no tocas', 'La temperatura', 'Un imán'], 'Por eso se compara con “menor que”.', { code: 'if (touchRead(4) < umbral) {\n  // ...\n}' }),
      Nm('Sin tocar lees 60 de media. Umbral a 2/3 de la base: ¿qué valor?', 40, '', '60 × 2 / 3 = 40.', { tol: 0.5 }),
      I('Para fiarte del touch: calibra la base al arrancar, síguela despacio (cambia con la humedad y la fuente) y usa cables cortos. Una lámina de cobre detrás de 1–2 mm de plástico funciona.'),
      Q('touchAttachInterrupt(pin, funcion, umbral) sirve para…', ['Llamar a una función cuando la lectura cruza el umbral, sin sondear', 'Leer el ADC', 'Dormir el chip', 'Cambiar el umbral solo'], 'Útil también para despertar del sueño, como verás en el módulo 8.'),
      Q('¿Puede un toque despertar al ESP32 del deep sleep?', ['Sí: el touch es una de las fuentes de despertar', 'No, nunca', 'Solo con WiFi', 'Solo en el S3'], 'Ideal para dispositivos sin botones.', { c: 'es_sleep' })
    ]),
    L('es12', 'RMT: pulsos exactos', 'wave', ['es_rmt'], [
      I('El <b>RMT</b> (Remote Control) genera o captura trenes de pulsos descritos como pares “nivel y duración”, con resolución de hasta 12,5 ns y sin que la CPU intervenga.\nEl ESP32 clásico tiene 8 canales. Nació para mandos infrarrojos y es perfecto para LED WS2812.'),
      I('Una <b>WS2812B</b> recibe 800 kbit/s: cada bit dura 1,25 µs. Un 0 es un pulso alto corto (unos 0,4 µs) y un 1 uno largo (unos 0,8 µs). Cada LED se lleva 24 bits: verde, rojo y azul, en ese orden. Una pausa al final hace que todos muestren su color.'),
      Nm('¿Cuánto tarda en enviarse una tira de 60 LED, en ms?', 1.8, 'ms', '60 × 24 × 1,25 µs = 1800 µs.', { tol: 0.05 }),
      Q('¿En qué orden recibe los colores una WS2812B?', ['Verde, rojo, azul (GRB)', 'Rojo, verde, azul', 'Azul, verde, rojo', 'Rojo, azul, verde'], 'Por eso las bibliotecas piden NEO_GRB.'),
      Q('¿Por qué no generar la señal de la WS2812 con digitalWrite?', ['Exige pulsos de décimas de µs con poca tolerancia; una interrupción en medio la estropea', 'digitalWrite no existe', 'La tira es de 12 V', 'Funcionaría igual'], 'El RMT lo hace por hardware.'),
      I('<b>Alimentación de tiras</b>: hasta unos 60 mA por LED en blanco total. Fuente de 5 V aparte, condensador de 1000 µF en la entrada, 330 Ω en serie con la señal, masa común.\nY la señal: a 5 V la tira espera unos 3,5 V para un “1”. Con 3,3 V a veces funciona y a veces no: un <b>74AHCT125</b> lo resuelve.'),
      Nm('30 LED en blanco total, unos 60 mA cada uno. ¿Corriente total, en A?', 1.8, 'A', '30 × 0,06 = 1,8 A. Limita el brillo en el código si tu fuente no llega.', { tol: 0.05, c: 'power' }),
      Q('¿Para qué un 74AHCT125 entre el ESP32 y la tira?', ['Convierte la señal de 3,3 V en 5 V: la tira la entiende siempre', 'Da más corriente a los LED', 'Protege de la polaridad', 'Para que vaya más rápido'], 'Su entrada acepta 3,3 V como “1” aunque esté alimentado a 5 V.', { c: 'es_3v3' }),
      I('<b>Infrarrojos</b>: el mando enciende su LED a ráfagas de 38 kHz. El receptor (TSOP38238, VS1838B) quita la portadora y entrega la envolvente invertida. El RMT captura las duraciones y tú decodificas el protocolo; en NEC, cabecera de 9 ms + 4,5 ms y 32 bits.'),
      Q('¿Qué portadora usan casi todos los mandos IR?', ['38 kHz', '38 MHz', '2,4 GHz', '50 Hz'], 'Modular evita confundir la señal con la luz ambiente.')
    ]),
    L('es13', 'I²S: audio digital', 'wave', ['es_i2s'], [
      I('<b>I²S</b> transporta audio digital con tres líneas:\n· <b>BCLK</b>: un pulso por bit.\n· <b>WS</b> (o LRCLK): canal izquierdo o derecho.\n· <b>DATA</b>: las muestras.\nEl ESP32 clásico tiene dos periféricos I²S con DMA: tú llenas un búfer y el hardware lo envía solo.'),
      { t: 'match', q: 'Une cada línea con su función.', pairs: [['BCLK', 'Marca cada bit'], ['WS (LRCLK)', 'Dice qué canal va'], ['DOUT', 'Datos hacia el DAC'], ['MCLK', 'Reloj maestro (algunos DAC)']] },
      G('es_i2sRate'),
      Nm('44,1 kHz, 16 bits, estéreo. ¿Frecuencia de BCLK, en kHz?', 1411.2, 'kHz', '44 100 × 16 × 2 = 1 411 200 Hz.', { tol: 1 }),
      I('Chips habituales:\n· <b>MAX98357A</b>: DAC y amplificador de unos 3 W en uno; altavoz directo.\n· <b>PCM5102A</b>: DAC de calidad con salida de línea.\n· <b>INMP441</b>: micrófono digital I²S.'),
      Q('Un altavoz pequeño con el mínimo de piezas:', ['MAX98357A', 'PCM5102A', 'INMP441', 'LM358'], 'Lleva el amplificador dentro.'),
      I('En el núcleo 3.x, la biblioteca ESP_I2S lo deja en pocas líneas:', { code: '#include <ESP_I2S.h>\nI2SClass i2s;\ni2s.setPins(26, 25, 22);   // BCLK, WS, DOUT\ni2s.begin(I2S_MODE_STD, 22050,\n          I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO);\ni2s.write(buf, bytes);     // espera si el DMA va lleno' }),
      Nm('Un búfer de 1024 muestras a 22 050 Hz, ¿cuántos ms de audio guarda?', 46.4, 'ms', '1024 / 22 050 ≈ 0,0464 s.', { tol: 0.3 }),
      Q('El sonido “chisporrotea” cuando el WiFi está ocupado.', ['El búfer se vacía antes de rellenarlo: más búfer o una tarea de audio con más prioridad', 'El altavoz está roto', 'Falta un pull-up', 'Es normal'], 'Cada hueco sin datos es un clic.', { c: 'es_rtos' }),
      Nm('Un tono de 440 Hz con 22 050 muestras por segundo: ¿cuántas muestras por periodo, aproximadamente?', 50.1, '', '22 050 / 440 ≈ 50,1.', { tol: 0.3 })
    ]),
    L('es14', 'UART, I²C y SPI en el ESP32', 'bus', ['es_bus'], [
      I('El ESP32 clásico tiene <b>tres UART</b> (la 0 va al USB), <b>dos I²C</b> y dos SPI libres para ti (los otros dos sirven a la flash). Todos pasan por la matriz GPIO.'),
      Q('¿Qué configura esta línea?', ['La UART2 a 9600 baudios: RX en 16 y TX en 17', 'El I²C', 'La UART0', 'Un SPI'], 'Serial2.begin(baudios, formato, rx, tx).', { code: 'Serial2.begin(9600, SERIAL_8N1, 16, 17);' }),
      G('es_uartTime'),
      I('<b>I²C</b>: Wire.begin(sda, scl, frecuencia). Como hay dos controladores, puedes tener dos buses: Wire y Wire1. Muy útil cuando dos dispositivos tienen la <b>misma dirección</b> fija.'),
      Q('Dos pantallas OLED con la dirección 0x3C fija.', ['Una en Wire y otra en Wire1 (dos buses)', 'Imposible', 'Las dos en el mismo bus', 'Cambiar a SPI el ESP32'], 'Dos buses, dos espacios de direcciones.'),
      Q('¿Qué imprime este escáner?', ['Las direcciones que responden con ACK', 'Todas las direcciones', 'Los pines libres', 'La velocidad del bus'], 'endTransmission() devuelve 0 cuando alguien contesta.', { code: 'for (uint8_t a = 1; a < 127; a++) {\n  Wire.beginTransmission(a);\n  if (Wire.endTransmission() == 0)\n    Serial.printf("0x%02X\\n", a);\n}' }),
      I('<b>SPI</b> es más rápido y con un hilo CS por dispositivo. SPI.begin(sck, miso, mosi, cs) elige pines; cada acceso va entre beginTransaction(SPISettings(…)) y endTransaction() para que dos dispositivos con ajustes distintos convivan.'),
      Q('Una pantalla TFT rápida y una tarjeta SD:', ['SPI, con un CS distinto para cada una', 'I²C', 'UART', 'Una en cada núcleo'], 'Comparten SCK, MISO y MOSI.'),
      Q('Un módulo I²C de 5 V trae pull-ups a 5 V en SDA y SCL.', ['Quítalas y pon pull-ups a 3,3 V, o usa un adaptador de nivel', 'Perfecto así', 'Pon un diodo', 'Sube la velocidad'], 'Esas pull-ups llevarían 5 V a los pines del ESP32.', { c: 'es_3v3' }),
      Q('Con I²C a 400 kHz, leer 6 bytes de un sensor cuesta unos…', ['Cientos de microsegundos (cada byte son 9 bits más dirección y arranque)', 'Unos nanosegundos', 'Un segundo', 'Nada'], 'No es instantáneo: en un bucle de alta velocidad se nota.')
    ]),
    L('es15', 'Temporizadores e interrupciones', 'timer', ['es_isr'], [
      I('El ESP32 clásico tiene <b>cuatro temporizadores hardware de 64 bits</b>. En el núcleo 3.x se configuran por frecuencia de cuenta:', { code: 'hw_timer_t *t = timerBegin(1000000);    // cuenta a 1 MHz\ntimerAttachInterrupt(t, &alSonar);\ntimerAlarm(t, 500000, true, 0);         // cada 0,5 s, se repite' }),
      I('En el núcleo 2.x era distinto (timerBegin con divisor, timerAlarmWrite, timerAlarmEnable). Si un ejemplo usa esas funciones, es antiguo.'),
      G('es_timerAlarm'),
      I('Una <b>ISR</b> en el ESP32:\n· Corta: guarda, avisa y sale.\n· Nada de delay, Serial ni WiFi dentro.\n· Marcada con <b>IRAM_ATTR</b>: así está en RAM y puede ejecutarse aunque la flash esté ocupada (escribiendo NVS, por ejemplo).'),
      Q('¿Por qué IRAM_ATTR en una ISR?', ['La coloca en RAM interna: puede ejecutarse aunque la caché de flash esté desactivada', 'La hace más rápida de escribir', 'La pasa al otro núcleo', 'Desactiva el WiFi'], 'Sin ella, una interrupción durante una escritura en flash puede colgar el chip.'),
      Q('¿Qué tiene de malo esta ISR?', ['Serial y delay no deben usarse en una ISR: marca un flag y hazlo fuera', 'Nada', 'Le falta return', 'Debería ser int'], 'Bloquean y tardan milisegundos.', { code: 'void IRAM_ATTR alPulsar() {\n  Serial.println("Pulsado");\n  delay(20);\n}' }),
      I('Variables que comparten ISR y programa: <b>volatile</b>. Y si no se leen de una vez (64 bits, estructuras), protégelas: en un chip de dos núcleos, desactivar interrupciones no basta; se usa un cerrojo <b>portMUX</b>.', { code: 'portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;\n// en la ISR:   portENTER_CRITICAL_ISR(&mux); ... portEXIT_CRITICAL_ISR(&mux);\n// fuera:       portENTER_CRITICAL(&mux);     ... portEXIT_CRITICAL(&mux);' }),
      { t: 'order', q: 'Ordena el viaje de un evento.', items: ['El pin cambia y salta la interrupción', 'La ISR guarda lo mínimo y avisa (flag, cola o notificación)', 'La ISR termina en microsegundos', 'Una tarea o loop() procesa el evento con calma'], e: 'Así las interrupciones no bloquean nada.' },
      Q('Un pulsador mecánico con attachInterrupt(…, FALLING) cuenta varias pulsaciones por cada una.', ['Los rebotes disparan la ISR varias veces: filtra por tiempo o con RC', 'La ISR es lenta', 'El pin es solo de entrada', 'Falta IRAM_ATTR'], 'Ignora flancos que lleguen a menos de unos 20 ms del anterior.'),
      Q('¿Qué tipo de variable usas para un contador que suma la ISR y lee loop()?', ['volatile, y copiada en sección crítica si no es atómica', 'Una variable local', 'Una constante', 'Un String'], 'volatile evita que el compilador la guarde en un registro.')
    ]),
    SIM('es-s5', 'Reto: fundido en contrafase', 'Dos LED controlados por LEDC: cuando uno sube, el otro baja.', { arduino: 'es_ledc2', board: 'esp32', parts: ['res', 'led'], code: true, hint: 'LED en los GPIO 18 y 19 (fila de arriba). ' + LED_HINT }, 'es_ledc2'),
    SIM('es-s6', 'Reto: pulsador que conmuta', 'Cada pulsación enciende o apaga el LED, sin que los rebotes cuenten de más.', { arduino: 'es_toggle', board: 'esp32', parts: ['push', 'res', 'led'], code: true, hint: 'Pulsador entre el GPIO 4 y GND (usa la pull-up interna). LED con 150 Ω en el GPIO 23. Pulsa, suelta y vuelve a pulsar.' }, 'es_toggle'),
    SIM('es-s7', 'Reto: máquina de estados', 'Un solo botón recorre cuatro modos: apagado, fijo, parpadeo y respiración.', { arduino: 'es_estados', board: 'esp32', parts: ['push', 'res', 'led'], code: true, hint: 'Pulsador entre el GPIO 4 y GND. LED con 150 Ω en el GPIO 18. Pulsa varias veces y espera un poco en cada modo.' }, 'es_estados'),
    PRJ('es-p3', 'Proyecto: lámpara WS2812 táctil', 'es_lamp'),
    PRJ('es-p4', 'Proyecto: aprendiz de mandos IR', 'es_irremote'),
    PRJ('es-p5', 'Proyecto: piano táctil con I²S', 'es_piano')
  ];

  const M4 = [
    L('es16', 'Por qué un sistema operativo', 'timer', ['es_rtos'], [
      I('Con loop() todo va en fila: si una parte tarda, las demás esperan. <b>FreeRTOS</b> reparte el trabajo en <b>tareas</b>: cada una con su bucle, su pila y su prioridad. El planificador decide quién usa cada núcleo en cada momento.'),
      I('En el ESP32 FreeRTOS está siempre: loop() es una tarea (“loopTask”, prioridad 1, núcleo 1), la pila WiFi tiene las suyas y hay una tarea <b>IDLE</b> por núcleo que corre cuando no hay nada más.\nEn Arduino-ESP32 el reloj del planificador (tick) va a 1000 Hz.'),
      { t: 'match', q: 'Une cada estado de una tarea con su significado.', pairs: [['Ejecutándose', 'Usa la CPU ahora'], ['Lista', 'Quiere CPU y espera turno'], ['Bloqueada', 'Espera tiempo o un evento'], ['Suspendida', 'Apartada hasta que la reanuden']] },
      Q('En el ESP32, ¿qué hace delay(100)?', ['Llama a vTaskDelay: bloquea la tarea y deja la CPU a otras', 'Una espera activa que ocupa la CPU', 'Detiene el chip entero', 'Apaga el WiFi'], 'Por eso un delay en loop() no frena las tareas de otros núcleos ni de más prioridad.'),
      Q('¿Y un while (millis() - t < 100) {}?', ['Espera activa: ocupa la CPU y las tareas de menor prioridad no corren', 'Lo mismo que delay', 'Bloquea la tarea', 'Duerme el chip'], 'Gasta energía y tiempo de CPU para nada.'),
      I('Prioridades de 0 (IDLE) a 24: más número, más prioridad. La planificación es <b>expropiativa</b>: si se desbloquea una tarea más prioritaria, se queda la CPU al instante. Con prioridades iguales, se turnan en cada tick.'),
      Q('Tarea A (prioridad 3) en un bucle sin bloquearse nunca; tarea B (prioridad 2) en el mismo núcleo.', ['B no se ejecuta nunca (inanición)', 'Se turnan', 'B se pasa sola al otro núcleo', 'A se para sola cada tick'], 'Solo corre lo de menos prioridad cuando lo de más está bloqueado.'),
      I('Explora el reparto: la tarea Sensor necesita unos ms de cada 10 ms. Cambia su núcleo, su prioridad y su forma de esperar.', { tune: { viz: 'es_sched', params: { core: { label: 'Núcleo de Sensor', val: 1, list: [0, 1], dec: 0 }, prio: { label: 'Prioridad de Sensor', val: 2, min: 1, max: 5, step: 1, dec: 0 }, ms: { label: 'Trabajo cada 10 ms', val: 3, min: 1, max: 8, step: 1, unit: 'ms', dec: 0 }, wait: { label: 'Espera: 0 activa · 1 vTaskDelay', val: 0, list: [0, 1], dec: 0 } } } }),
      TU('Sensor con 3 ms de trabajo en el núcleo 1: haz que todos cumplan sin moverla de núcleo.', 'es_sched', { core: { val: 1, fixed: true }, prio: { label: 'Prioridad de Sensor', val: 3, min: 1, max: 5, step: 1, dec: 0 }, ms: { val: 3, fixed: true }, wait: { label: 'Espera: 0 activa · 1 vTaskDelay', val: 0, list: [0, 1], dec: 0 } }, { q: 'all', min: 1, max: 1, text: 'Objetivo: todas cumplen y queda tiempo libre en los dos núcleos', hint: 'Con espera activa, la tarea nunca suelta la CPU.' }, 'vTaskDelay: la tarea trabaja 3 ms y se bloquea.'),
      Q('¿Cuál es la principal ventaja de pasar de loop() a tareas?', ['Cada parte tiene su ritmo y una lenta no bloquea a las demás', 'El programa ocupa menos', 'No hace falta sincronizar nada', 'Gasta menos RAM'], 'A cambio, hay que sincronizar lo que compartan.')
    ]),
    L('es17', 'Crear tareas: pila, prioridad y núcleo', 'timer', ['es_rtos'], [
      I('Una tarea es una función que nunca termina. Se crea así:', { code: 'void miTarea(void *param) {\n  for (;;) {\n    // trabajo\n    vTaskDelay(pdMS_TO_TICKS(100));\n  }\n}\n\nxTaskCreatePinnedToCore(\n  miTarea, "mia",   // función y nombre\n  4096,            // pila en BYTES (en ESP-IDF)\n  NULL,            // parámetro\n  2,               // prioridad\n  NULL,            // manejador (opcional)\n  1);              // núcleo' }),
      Q('En ESP-IDF, ¿en qué unidades se da el tamaño de pila de xTaskCreate?', ['Bytes (en el FreeRTOS original son palabras)', 'Palabras de 32 bits', 'Kilobytes', 'Número de variables'], 'Un detalle que confunde al leer documentación genérica de FreeRTOS.'),
      Q('¿Qué pasa si una función de tarea llega al final y hace return?', ['Error grave: una tarea nunca debe terminar; usa un bucle o vTaskDelete(NULL)', 'Se repite sola', 'Nada', 'Se mueve al otro núcleo'], 'Si quieres que acabe, que se borre ella misma.'),
      I('La <b>pila</b> guarda variables locales y llamadas anidadas. printf, String y las bibliotecas grandes comen mucha. Si se desborda verás “Stack canary watchpoint triggered” y un reinicio.\nuxTaskGetStackHighWaterMark(NULL) dice lo mínimo que ha llegado a quedar libre.'),
      G('es_stack'), G('es_stack'),
      I('Núcleos: por defecto la pila WiFi y Bluetooth trabaja en el <b>núcleo 0</b> y Arduino en el <b>1</b>. Pon el cálculo pesado donde no estorbe. xTaskCreate (sin “Pinned”) deja que cualquier núcleo la ejecute.'),
      Q('Una tarea de prioridad 20 en un bucle sin bloquear, en el núcleo 0.', ['Puede dejar sin CPU a la pila WiFi y disparar el watchdog del núcleo 0', 'No pasa nada', 'Va más rápido el WiFi', 'Se pasa sola al núcleo 1'], 'El núcleo 0 tiene trabajo del sistema: respétalo.'),
      TU('Sensor necesita 8 ms de cada 10 ms. Elige núcleo para que todos cumplan.', 'es_sched', { core: { label: 'Núcleo de Sensor', val: 1, list: [0, 1], dec: 0 }, prio: { label: 'Prioridad de Sensor', val: 2, min: 1, max: 5, step: 1, dec: 0 }, ms: { val: 8, fixed: true }, wait: { val: 1, fixed: true } }, { q: 'all', min: 1, max: 1, text: 'Objetivo: todas cumplen y queda tiempo libre en los dos núcleos', hint: 'En el núcleo 1, loop() también necesita 4 ms de cada 10.' }, 'En el núcleo 0 caben WiFi (1,5 ms) y Sensor (8 ms).'),
      Q('¿Para qué sirve el parámetro void *param?', ['Pasar datos a la tarea al crearla (un puntero a lo que quieras)', 'Para la prioridad', 'Para la pila', 'No sirve'], 'Así una misma función sirve para varias tareas parecidas.'),
      Q('En un ESP32-C3 (un núcleo) quieres crear una tarea.', ['xTaskCreate o núcleo 0 / tskNO_AFFINITY: no hay núcleo 1', 'Núcleo 1 siempre', 'No hay FreeRTOS', 'Hace falta PSRAM'], 'Mira cuántos núcleos tiene tu chip.', { c: 'es_family' })
    ]),
    L('es18', 'Colas y notificaciones', 'timer', ['es_sync'], [
      I('Comunicar tareas con variables globales trae carreras. Una <b>cola</b> copia los datos del productor al consumidor en orden y bloquea al que espera, sin gastar CPU.', { code: 'QueueHandle_t cola = xQueueCreate(10, sizeof(float));\n\n// Productor\nfloat t = leeTemperatura();\nxQueueSend(cola, &t, 0);              // 0: no esperar si está llena\n\n// Consumidor\nfloat d;\nif (xQueueReceive(cola, &d, portMAX_DELAY) == pdTRUE) { /* usar d */ }' }),
      Q('¿Qué hace xQueueReceive(cola, &d, portMAX_DELAY)?', ['Espera bloqueada, sin gastar CPU, hasta que llega un dato', 'Lee la cola aunque esté vacía', 'Borra la cola', 'Envía un dato'], 'portMAX_DELAY: esperar indefinidamente.'),
      Q('La cola está llena y llamas a xQueueSend(cola, &t, 0).', ['Devuelve errQUEUE_FULL y el dato no entra: decide si te importa', 'Bloquea para siempre', 'Sobrescribe el más antiguo', 'Reinicia el chip'], 'Para “quedarse con el último” existe xQueueOverwrite en colas de 1.'),
      Nm('Una cola de 10 elementos de una estructura de 12 bytes. ¿Bytes de almacenamiento de datos?', 120, 'bytes', '10 × 12 = 120 bytes (más la cabecera de la cola).', { tol: 0.5 }),
      I('Desde una ISR se usan las versiones <b>FromISR</b>, que no bloquean. Si al enviar se despierta una tarea más prioritaria, se pide el cambio al salir:', { code: 'void IRAM_ATTR isr() {\n  BaseType_t despierta = pdFALSE;\n  uint32_t t = micros();\n  xQueueSendFromISR(cola, &t, &despierta);\n  portYIELD_FROM_ISR(despierta);\n}' }),
      I('Las <b>notificaciones de tarea</b> son el mecanismo más ligero: cada tarea tiene un contador de 32 bits que otras (o una ISR) pueden incrementar o fijar para despertarla.\nvTaskNotifyGiveFromISR(tarea, &despierta) y, en la tarea, ulTaskNotifyTake(pdTRUE, portMAX_DELAY).'),
      Q('¿Cuándo una notificación en vez de una cola?', ['Para despertar a una tarea concreta con un valor pequeño, de la forma más rápida', 'Para mandar estructuras grandes', 'Para varios consumidores', 'Nunca'], 'Si necesitas pasar datos de verdad, cola.'),
      { t: 'order', q: 'Ordena un sistema productor–consumidor con interrupción.', items: ['El sensor avisa por un pin y salta la ISR', 'La ISR mete la marca de tiempo en la cola con xQueueSendFromISR', 'La tarea de proceso, bloqueada en xQueueReceive, despierta', 'Procesa el dato y vuelve a bloquearse esperando el siguiente'], e: 'Nadie gasta CPU esperando.' },
      Q('Una tarea espera a la vez “WiFi conectado” y “hora sincronizada”.', ['Un grupo de eventos (event group) con dos bits', 'Dos colas a la vez', 'Un mutex', 'Un delay largo'], 'xEventGroupWaitBits puede esperar a que estén todos los bits.')
    ]),
    L('es19', 'Carreras, mutex y semáforos', 'timer', ['es_sync'], [
      I('<b>Condición de carrera</b>: dos tareas leen, modifican y escriben lo mismo, y una pisa a la otra. contador++ parece una operación, pero son tres: leer, sumar y escribir.\nCon dos núcleos, pueden ocurrir de verdad al mismo tiempo.'),
      Q('Dos tareas suman 1 a la misma variable 1000 veces y a veces el total es menor que 2000.', ['Condición de carrera: se pisan entre la lectura y la escritura', 'El ESP32 suma mal', 'Desbordamiento', 'Falta delay'], 'Protege la sección o usa una cola.'),
      I('Un <b>mutex</b> es una llave única: quien la toma usa el recurso; los demás esperan bloqueados.', { code: 'SemaphoreHandle_t mtx = xSemaphoreCreateMutex();\n\nif (xSemaphoreTake(mtx, pdMS_TO_TICKS(100)) == pdTRUE) {\n  pantalla.print(texto);     // bus I²C en exclusiva\n  xSemaphoreGive(mtx);\n} else {\n  // no la conseguí en 100 ms: decide qué hacer\n}' }),
      Q('Dos tareas escriben en la misma OLED I²C y a veces sale basura.', ['Protege cada uso completo del bus con un mutex', 'Sube la prioridad de una', 'Pon delay(1)', 'Usa el otro núcleo'], 'Cada transacción debe terminar antes de que empiece la otra.'),
      { t: 'match', q: 'Une cada herramienta con su uso.', pairs: [['Mutex', 'Uso exclusivo de un recurso'], ['Semáforo binario', 'Señalar que algo ha ocurrido'], ['Semáforo contador', 'Hay N recursos iguales'], ['Cola', 'Pasar datos en orden']] },
      I('<b>Inversión de prioridad</b>: una tarea alta espera un mutex que tiene una baja, y una media (que no lo necesita) no deja correr a la baja. Resultado: la alta espera a la media.\nLos mutex de FreeRTOS aplican <b>herencia de prioridad</b>: la baja sube temporalmente para soltar el mutex cuanto antes.'),
      Q('¿Por qué un mutex y no un semáforo binario para proteger un recurso?', ['El mutex tiene herencia de prioridad y un dueño', 'Es más rápido siempre', 'Se puede usar en ISR', 'No hay diferencia'], 'El semáforo binario es para señalar eventos.'),
      Q('La tarea A toma el mutex X y luego el Y; la B toma Y y luego X. A veces todo se para.', ['Interbloqueo: toma siempre los mutex en el mismo orden', 'Falta prioridad', 'Es el watchdog', 'Falta memoria'], 'Cada una espera la llave que tiene la otra.'),
      Q('¿Se puede tomar un mutex dentro de una ISR?', ['No: en una ISR se usan colas o semáforos con FromISR, nunca un mutex', 'Sí, con portMAX_DELAY', 'Sí, si es rápido', 'Solo en el núcleo 0'], 'Una ISR no puede bloquearse esperando.'),
      Q('Una variable bool que solo escribe una tarea y solo lee otra:', ['Suele bastar con volatile (un bool se lee de una vez); con estructuras o varios campos, protege', 'Siempre mutex', 'Necesita una cola', 'No se puede'], 'El peligro está en las operaciones que no son atómicas o en leer varios datos relacionados.')
    ]),
    L('es20', 'Watchdogs y depurar un sistema multitarea', 'timer', ['es_rtos'], [
      I('El <b>watchdog de tareas</b> (TWDT) vigila que ciertas tareas se ejecuten. En Arduino-ESP32 vigila por defecto la tarea IDLE del núcleo 0: si algo acapara ese núcleo unos 5 s sin bloquearse, avisa y puede reiniciar.\nHay también un watchdog de <b>interrupciones</b> para ISR que tardan demasiado.'),
      Q('El monitor muestra “task_wdt: Task watchdog got triggered … IDLE0”.', ['Algo acapara el núcleo 0 sin bloquearse y la tarea IDLE no puede correr', 'El WiFi no conecta', 'Falta memoria', 'Es normal'], 'Busca bucles de espera activa o tareas de alta prioridad que nunca ceden.'),
      I('Puedes suscribir tus tareas críticas: si se cuelgan, el sistema se reinicia en vez de quedarse parado.', { code: '#include <esp_task_wdt.h>\n// dentro de la tarea:\nesp_task_wdt_add(NULL);       // vigílame\nfor (;;) {\n  trabajo();\n  esp_task_wdt_reset();       // sigo viva\n  vTaskDelay(pdMS_TO_TICKS(100));\n}' }),
      Q('¿Arreglas un watchdog llamando a esp_task_wdt_reset() dentro de un bucle de espera activa?', ['No: tapa el síntoma; añade un bloqueo real (vTaskDelay, cola) para que corran las demás', 'Sí, es la solución', 'Sí, y además ahorra energía', 'Da igual'], 'El watchdog avisa de un problema de diseño.'),
      { t: 'match', q: 'Une cada mensaje con su causa probable.', pairs: [['LoadProhibited', 'Puntero nulo o inválido'], ['Stack canary watchpoint', 'Pila de una tarea desbordada'], ['Task watchdog got triggered', 'Una tarea que no cede la CPU'], ['Brownout detector', 'Caída de alimentación']] },
      I('Tras un Guru Meditation aparece un <b>Backtrace</b>: direcciones de la cadena de llamadas. El decodificador de excepciones del IDE o idf.py monitor las convierten en archivo y línea. Es lo primero que hay que mirar.'),
      I('La memoria dinámica también se rompe: ESP.getFreeHeap() dice cuánto queda en total y heap_caps_get_largest_free_block(MALLOC_CAP_8BIT) el bloque contiguo más grande.'),
      Q('Quedan 100 KB libres, pero malloc(40 000) falla.', ['Fragmentación: no hay un bloque contiguo tan grande', 'El ESP32 miente', 'Falta PSRAM siempre', 'Es la pila'], 'Muchos new/delete de tamaños variados dejan huecos.'),
      Q('Concatenas String en loop() durante días y al final se cuelga.', ['Fragmentación del heap: reserva al inicio (reserve) o usa búferes fijos', 'La flash se gasta', 'Es el WiFi', 'Es normal'], 'En sistemas que funcionan meses, memoria fija siempre que se pueda.'),
      Q('¿Qué te dice uxTaskGetStackHighWaterMark(tarea)?', ['Lo mínimo que ha quedado libre en la pila de esa tarea desde que empezó', 'La pila total', 'La prioridad', 'El uso de CPU'], 'Mídelo tras probar los casos más exigentes.')
    ]),
    SIM('es-s8', 'Reto: dos tareas de FreeRTOS', 'Una tarea hace parpadear un LED sin parar; otra, independiente, conmuta otro LED con el pulsador.', { arduino: 'es_rtos', board: 'esp32', parts: ['push', 'res', 'led'], code: true, hint: 'LED con 150 Ω en el GPIO 25 y otro en el 26. Pulsador entre el GPIO 4 y GND. Fíjate: pulsar no altera el ritmo del parpadeo.' }, 'es_rtos'),
    SIM('es-s9', 'Reto: semáforo con peatón', 'Los coches están en verde hasta que un peatón pulsa. La interrupción anota la petición y loop() hace el ciclo.', { arduino: 'es_peaton', board: 'esp32', parts: ['push', 'res', 'led'], code: true, hint: 'LED en 27 (verde coches), 26 (ámbar), 25 (rojo) y 33 (verde peatón), cada uno con su resistencia a GND. Pulsador entre el GPIO 4 y GND.' }, 'es_peaton'),
    PRJ('es-p6', 'Proyecto: juego de reflejos', 'es_reflex'),
    PRJ('es-p7', 'Proyecto: termostato multitarea', 'es_thermostat')
  ];

  const M5 = [
    L('es21', 'La flash por dentro: particiones', 'memory', ['es_flash'], [
      I('La flash del módulo (4 MB típicos) no es un único bloque: empieza con el <b>cargador de arranque</b> (en la dirección 0x1000 en el ESP32 clásico), sigue la <b>tabla de particiones</b> (0x8000) y después las particiones que ella describe.'),
      I('Esta es, aproximadamente, la tabla por defecto de Arduino-ESP32 para 4 MB:', { code: '# Nombre   Tipo  Subtipo   Desplaz.  Tamaño\nnvs,       data, nvs,      0x9000,   0x5000\notadata,   data, ota,      0xe000,   0x2000\napp0,      app,  ota_0,    0x10000,  0x140000\napp1,      app,  ota_1,    0x150000, 0x140000\nspiffs,    data, spiffs,   0x290000, 0x160000\ncoredump,  data, coredump, 0x3F0000, 0x10000' }),
      { t: 'match', q: 'Une cada partición con su papel.', pairs: [['nvs', 'Ajustes clave-valor'], ['otadata', 'Qué app debe arrancar'], ['app0 / app1', 'Dos huecos para programas'], ['spiffs', 'Archivos (LittleFS o SPIFFS)']] },
      Nm('app0 mide 0x140000 bytes. ¿Cuántos KB son?', 1280, 'KB', '0x140000 = 1 310 720 bytes = 1280 KB (1,25 MB).', { tol: 0.5, c: 'binary' }),
      Q('Tu programa ocupa 1,6 MB y el IDE dice “Sketch too big”.', ['Elige un esquema de particiones con app más grande (por ejemplo sin OTA) o reduce el programa', 'Compra otra placa seguro', 'Borra la NVS', 'Sube la frecuencia'], 'Menú Herramientas → Partition Scheme.'),
      Q('¿Para qué hay dos particiones de aplicación?', ['Para OTA: la nueva versión se escribe en la que no está en uso', 'Para dos programas a la vez', 'Para los dos núcleos', 'Copia de seguridad automática diaria'], 'Así la versión que funciona nunca se toca durante la descarga.'),
      I('La flash se escribe pasando bits de 1 a 0, pero para volver a 1 hay que <b>borrar un sector entero de 4 KB</b>. Cada sector aguanta del orden de <b>100 000 borrados</b>. NVS y LittleFS reparten las escrituras para no gastar siempre el mismo.'),
      Nm('Si borraras el mismo sector una vez por minuto, ¿cuántos días aguantaría (100 000 ciclos)?', 69.4, 'días', '100 000 / 1440 minutos al día ≈ 69 días.', { tol: 0.5 }),
      Q('Tienes una placa con flash de 16 MB pero el IDE solo usa 4 MB.', ['Elige el tamaño de flash correcto y un esquema de particiones que la aproveche', 'No se puede', 'Es automático siempre', 'Hay que soldar otra flash'], 'El tamaño de flash también se configura.'),
      Q('La partición coredump sirve para…', ['Guardar el estado tras un pánico y analizarlo después', 'Guardar fotos', 'Acelerar el arranque', 'El WiFi'], 'Muy útil en equipos desplegados lejos.')
    ]),
    L('es22', 'NVS y Preferences: guardar ajustes', 'memory', ['es_flash'], [
      I('<b>NVS</b> (Non-Volatile Storage) es un almacén clave-valor en la flash, organizado en espacios de nombres. Resiste cortes de luz a mitad de escritura y reparte el desgaste.\nEn Arduino se usa con la clase <b>Preferences</b>.'),
      I('Un contador de arranques:', { code: '#include <Preferences.h>\nPreferences prefs;\n\nvoid setup() {\n  Serial.begin(115200);\n  prefs.begin("app", false);              // espacio "app", lectura y escritura\n  uint32_t n = prefs.getUInt("arranques", 0) + 1;\n  prefs.putUInt("arranques", n);\n  prefs.end();\n  Serial.printf("Arranque número %u\\n", n);\n}' }),
      Q('Grabas el programa, se enciende y luego pulsas EN tres veces. ¿Qué número imprime el último arranque?', ['4', '3', '1', '0'], 'El primer arranque guarda 1; cada reinicio suma uno.'),
      Q('¿Qué devuelve getUInt("arranques", 0) la primera vez?', ['0: el valor por defecto, porque la clave no existe', 'Un error', 'Un número al azar', '1'], 'El segundo argumento es el valor si no existe.'),
      Q('prefs.putUInt("contador_de_arranques_total", n) no guarda nada.', ['La clave pasa de 15 caracteres, el máximo de NVS', 'Falta memoria', 'Hay que reiniciar antes', 'No admite números'], 'Espacios de nombres y claves: 15 caracteres como máximo.'),
      I('Qué guardar en NVS: configuración, calibraciones, credenciales, contadores que cambian poco.\nQué no: registros de datos cada segundo. Para eso, LittleFS (o mejor: acumular en RAM y escribir de vez en cuando).'),
      Q('Guardas en NVS el volumen cada vez que giras el mando (decenas de veces por segundo).', ['Mejor guardar solo cuando lleve unos segundos sin cambiar', 'Está perfecto', 'Guardar cada milisegundo', 'Guardar en la partición app0'], 'Ahorras escrituras y la flash dura años.'),
      Q('¿Cómo guardas una estructura de calibración completa?', ['Con putBytes y su tamaño, y la lees con getBytes', 'Campo a campo como String', 'No se puede', 'Con Serial'], 'Ojo: si cambias la estructura, versiona para no leer basura.'),
      { t: 'match', q: 'Une cada función de Preferences.', pairs: [['begin("ns", true)', 'Abrir solo para lectura'], ['remove("clave")', 'Borrar una clave'], ['clear()', 'Borrar todo el espacio de nombres'], ['isKey("clave")', 'Saber si existe']] },
      Q('Tras grabar otro programa, ¿siguen los datos de NVS?', ['Sí: subir un programa no borra la NVS (salvo que borres toda la flash)', 'No, nunca', 'Solo los números', 'Solo si es la misma placa y el mismo día'], 'Por eso una calibración sobrevive a las actualizaciones.')
    ]),
    L('es23', 'LittleFS: archivos en la flash', 'memory', ['es_flash'], [
      I('<b>LittleFS</b> es un sistema de archivos pensado para flash: carpetas, resistencia a cortes y reparto del desgaste. Sustituye a SPIFFS, que está obsoleto.\nUsa la partición de datos (que en la tabla se sigue llamando “spiffs”).'),
      I('Abrir, añadir y cerrar:', { code: '#include <LittleFS.h>\n\nLittleFS.begin(true);    // true: formatea si no puede montar\nFile f = LittleFS.open("/datos.csv", FILE_APPEND);\nf.println("12,21.5,48");\nf.close();               // ahora sí está en la flash' }),
      Q('¿Qué hace LittleFS.begin(true) si la partición no tiene un sistema de archivos válido?', ['La formatea (se pierde lo que hubiera)', 'Se niega y ya está', 'Reinicia el chip', 'Borra el programa'], 'Cómodo la primera vez; peligroso si había datos que querías.'),
      Q('¿Diferencia entre abrir con FILE_WRITE y con FILE_APPEND?', ['FILE_WRITE empieza el archivo de cero; FILE_APPEND añade al final', 'Ninguna', 'FILE_APPEND borra', 'FILE_WRITE solo lee'], 'Un registrador siempre añade.'),
      Q('Escribes líneas pero no llamas a close() y se va la luz.', ['Lo que estaba en el búfer de RAM se pierde', 'No pasa nada nunca', 'Se borra todo el sistema de archivos', 'Se guarda doble'], 'close() o flush() mandan los datos a la flash.'),
      Nm('Partición de 1 500 000 bytes; escribes una línea de 32 bytes por minuto. ¿Cuántos días hasta llenarla?', 32.6, 'días', '1 500 000 / 32 = 46 875 líneas; / 1440 al día ≈ 32,6 días.', { tol: 0.5 }),
      I('Las páginas web de tus proyectos (HTML, CSS, JS) también viven en LittleFS. Se suben desde el ordenador con la herramienta de subida de archivos del IDE, o creando la imagen con mklittlefs y grabándola con esptool.'),
      Q('¿microSD o LittleFS para guardar fotos durante semanas?', ['microSD: gigas y la sacas para leerla en el PC', 'LittleFS siempre', 'NVS', 'La RAM'], 'LittleFS es para unos pocos MB sin hardware extra.'),
      Q('LittleFS.totalBytes() - LittleFS.usedBytes() te da…', ['El espacio libre aproximado', 'El tamaño de la app', 'La RAM libre', 'El número de archivos'], 'Úsalo para decidir cuándo rotar o borrar archivos viejos.')
    ]),
    L('es24', 'Arranque, OTA y seguridad', 'shield', ['es_flash'], [
      I('Cómo arranca el ESP32:\n1) La <b>ROM</b> (de fábrica) lee el cargador de la flash.\n2) El <b>cargador de arranque</b> lee la tabla de particiones y otadata.\n3) Carga y salta a la aplicación elegida.'),
      { t: 'order', q: 'Ordena una actualización OTA.', items: ['La app recibe el nuevo .bin por la red', 'Lo escribe en la partición de app que no está en uso', 'Comprueba la imagen y marca otadata para arrancarla', 'Se reinicia y el cargador arranca la nueva versión'], e: 'Si se corta antes del paso 3, sigue arrancando la anterior.' },
      Q('Se va la luz a mitad de una OTA. Al volver…', ['Arranca la versión anterior: la nueva aún no estaba marcada', 'La placa queda inservible', 'Arranca media versión', 'Se borra la NVS'], 'Esa es la gracia de tener dos particiones.'),
      I('<b>Rollback</b>: la nueva versión arranca “a prueba”. Si no se declara válida (esp_ota_mark_app_valid_cancel_rollback) y se reinicia, el cargador vuelve a la anterior.\nHay que activarlo en la configuración del cargador (ESP-IDF); en el núcleo Arduino precompilado puede no estar activo.'),
      Q('¿Cuándo debe una versión nueva declararse válida?', ['Cuando ha comprobado que funciona: WiFi conectado, sensores respondiendo…', 'Nada más arrancar', 'Nunca', 'Antes de descargarla'], 'Si se cuelga antes, vuelve sola a la anterior.'),
      I('<b>Secure Boot</b>: el chip solo arranca firmware firmado con tu clave.\n<b>Cifrado de flash</b>: quien lea la flash no ve tu código ni tus contraseñas.\nAmbos se activan grabando <b>eFuses</b>: bits que solo se escriben una vez. Es <b>irreversible</b>: prueba en placas de desarrollo y guarda las claves.'),
      Q('¿Qué te protege el cifrado de flash?', ['Que alguien que desuelda o vuelca la flash lea tu firmware y tus contraseñas WiFi', 'Que te ataquen por WiFi', 'Que se gaste la flash', 'Que se corte la luz'], 'Contra el ataque por red están las contraseñas, TLS y la firma.'),
      Q('Los eFuses son…', ['Bits que solo se graban una vez: un error puede inutilizar el chip', 'Fusibles de corriente', 'Una partición', 'Un tipo de RAM'], 'Guardan MAC, calibraciones y ajustes de seguridad.'),
      Q('ArduinoOTA sin contraseña en tu red doméstica:', ['Cualquiera en tu red podría subirte firmware: pon contraseña (y, mejor, firma)', 'Es seguro siempre', 'No funciona sin contraseña', 'Solo afecta al WiFi'], 'La OTA es una puerta: ciérrala.'),
      Q('¿Qué hace esptool erase_flash?', ['Borra toda la flash: programa, NVS y archivos', 'Borra solo el programa', 'Borra los eFuses', 'Borra la ROM'], 'Útil para empezar de cero; los eFuses y la ROM no se tocan.')
    ]),
    PRJ('es-p8', 'Proyecto: cerradura de código con memoria', 'es_lock'),
    PRJ('es-p9', 'Proyecto: registrador de datos en LittleFS', 'es_logger')
  ];

  const M6 = [
    L('es25', 'Modos WiFi y conexión robusta', 'wifi', ['es_wifi'], [
      I('Tres modos:\n· <b>STA</b> (estación): te unes a un router como un móvil.\n· <b>AP</b>: el ESP32 crea su propia red (por defecto en la dirección 192.168.4.1).\n· <b>STA+AP</b>: las dos cosas con una sola radio y, por tanto, en el mismo canal.\nEl ESP32 clásico solo usa <b>2,4 GHz</b>.', { code: 'WiFi.softAP("MiESP32", "clave1234");\nSerial.println(WiFi.softAPIP());   // 192.168.4.1' }),
      { t: 'match', q: 'Une cada situación con el modo adecuado.', pairs: [['Sensor que manda datos a casa', 'STA'], ['Aparato sin router en el campo', 'AP'], ['Configurar por primera vez y luego conectar', 'AP y después STA'], ['Puente entre tu red y otra pequeña', 'STA+AP']] },
      I('Conectar con un tiempo límite, para no quedarse colgado:', { code: 'WiFi.mode(WIFI_STA);\nWiFi.begin(ssid, clave);\nuint32_t t0 = millis();\nwhile (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) delay(100);\nif (WiFi.status() != WL_CONNECTED) {\n  // plan B: seguir sin red, reintentar luego, abrir portal...\n}' }),
      Q('¿Qué pasa con este código si el router está apagado?', ['Se queda en el bucle para siempre', 'Sigue a los 15 s', 'Se reinicia', 'Crea un AP'], 'Siempre con tiempo límite.', { code: 'WiFi.begin(ssid, clave);\nwhile (WiFi.status() != WL_CONNECTED) delay(100);' }),
      I('Los <b>eventos</b> te avisan sin tener que preguntar: IP obtenida, desconexión (con su motivo)… En el evento de desconexión puedes reintentar con esperas crecientes, sin bloquear el resto del programa.', { code: 'WiFi.onEvent([](WiFiEvent_t e, WiFiEventInfo_t info) {\n  if (e == ARDUINO_EVENT_WIFI_STA_GOT_IP) Serial.println(WiFi.localIP());\n  if (e == ARDUINO_EVENT_WIFI_STA_DISCONNECTED)\n    Serial.printf("Caída, motivo %d\\n", info.wifi_sta_disconnected.reason);\n});' }),
      Q('¿Qué ventaja tienen los eventos frente a preguntar WiFi.status() en un bucle?', ['El resto del programa sigue y te enteras al momento de cada cambio', 'Gastan más CPU', 'Conectan más rápido siempre', 'Ninguna'], 'Programación reactiva: el sistema te avisa.'),
      Q('Tu router solo emite en 5 GHz.', ['El ESP32 clásico no lo verá: activa la banda de 2,4 GHz', 'Funciona igual', 'Va más rápido', 'Solo falla de noche'], 'Algunos chips nuevos (como el C5) sí trabajan en 5 GHz.'),
      Q('En modo STA+AP, el AP cambia de canal solo al conectar al router.', ['Normal: hay una sola radio y el AP sigue el canal del router', 'Es un fallo', 'Pasa por el Bluetooth', 'Falta memoria'], 'Los clientes del AP pueden desconectarse un momento.'),
      Q('Un nodo a batería que se conecta cada 10 minutos. ¿Cómo acortas la conexión?', ['IP fija y recordar canal y BSSID del router', 'Más potencia', 'Modo AP', 'Contraseña más corta'], 'El DHCP y el escaneo de canales cuestan segundos.', { c: 'es_sleep' }),
      Q('WiFi.RSSI() devuelve −85 dBm.', ['Señal muy débil: acércalo, cambia la orientación o usa antena externa', 'Señal excelente', 'Se está quemando', 'Es la temperatura'], 'Por encima de −67 dBm suele ir bien; por debajo de −80, sufre.')
    ]),
    L('es26', 'Potencia, consumo y antena', 'antenna', ['es_wifi'], [
      I('El ESP32 transmite con hasta unos 20 dBm (100 mW). Se puede bajar: menos picos de corriente y menos consumo, a cambio de alcance.', { code: 'WiFi.setTxPower(WIFI_POWER_8_5dBm);' }),
      G('es_dbm'), G('es_dbm'),
      I('<b>Modem sleep</b> (activado por defecto en STA): la radio duerme entre las balizas del router y despierta para ver si hay algo para ella. Ahorra mucho, pero añade latencia.\nWiFi.setSleep(false) la mantiene despierta: menos latencia, más consumo.'),
      Q('Un mando por WebSocket a veces responde con retrasos de 100–300 ms.', ['Es el modem sleep: WiFi.setSleep(false) a cambio de más consumo', 'El WebSocket es lento siempre', 'Falta PSRAM', 'El router es de 5 GHz'], 'Para audio y control en tiempo real, sin modem sleep.'),
      I('La antena del módulo es una pista en el borde. No pongas cobre, metal ni baterías alrededor o debajo, y deja ese borde libre (en tu PCB, sin plano de masa debajo).\nLas versiones con “-U” en el nombre traen conector para una antena externa.'),
      Q('Metes el ESP32 en una caja metálica y pierde la conexión.', ['El metal apantalla: antena externa (módulo -U) o caja de plástico', 'Hace falta más RAM', 'Es la fuente', 'El WiFi de 2,4 GHz atraviesa el metal'], 'Una caja metálica es una jaula de Faraday.'),
      I('En Europa, el WiFi de 2,4 GHz no puede superar <b>20 dBm de PIRE</b> (potencia radiada, incluida la ganancia de la antena). Una antena de mucha ganancia con la potencia al máximo puede pasarse del límite legal.'),
      Nm('Transmites a 14 dBm con una antena de 6 dBi. ¿PIRE, en dBm?', 20, 'dBm', '14 + 6 = 20 dBm: justo en el límite europeo.', { tol: 0.1, c: 'log' }),
      Q('Con una antena de 8 dBi, ¿qué haces?', ['Bajar la potencia del ESP32 a 12 dBm o menos para no pasar de 20 dBm de PIRE', 'Nada', 'Subirla al máximo', 'Ponerla en 5 GHz'], 'Ganancia de antena + potencia ≤ 20 dBm.'),
      Q('¿Qué consume más energía en un nodo a batería?', ['Estar conectado al WiFi esperando (aunque no transmita)', 'Un cálculo de 1 ms', 'Leer un pin', 'Un delay en deep sleep'], 'La radio encendida gasta decenas de mA aunque no envíe nada.', { c: 'es_sleep' })
    ]),
    L('es27', 'Servidor web en el ESP32', 'wifi', ['es_web'], [
      I('El ESP32 puede ser un <b>servidor HTTP</b>: el navegador pide una dirección (GET /) y él responde con una página.\nLa biblioteca WebServer viene incluida (síncrona); ESPAsyncWebServer es una alternativa externa asíncrona.'),
      I('Un servidor mínimo con dos rutas:', { code: '#include <WebServer.h>\nWebServer server(80);\n\nvoid setup() {\n  // ... conectar al WiFi ...\n  server.on("/", []() { server.send(200, "text/html", "<a href=/on>Encender</a>"); });\n  server.on("/on", []() { digitalWrite(2, HIGH); server.send(200, "text/plain", "OK"); });\n  server.begin();\n}\n\nvoid loop() {\n  server.handleClient();   // atiende las peticiones\n}' }),
      Q('Quitas server.handleClient() de loop(). ¿Qué pasa?', ['Nadie atiende las peticiones: el navegador se queda esperando', 'Funciona igual', 'Va más rápido', 'Se reinicia'], 'La versión síncrona necesita que la llames a menudo.'),
      { t: 'match', q: 'Une cada código HTTP con su significado.', pairs: [['200', 'Todo bien'], ['404', 'No existe esa ruta'], ['302', 'Ve a otra dirección'], ['500', 'Error del servidor']] },
      Q('Un delay(2000) en loop() con este servidor:', ['Cada petición puede tardar hasta 2 s en contestarse', 'No afecta', 'Rompe el WiFi', 'Lo acelera'], 'Con un servidor síncrono, loop() debe dar vueltas rápidas.'),
      I('Para páginas grandes, guarda HTML, CSS y JavaScript en <b>LittleFS</b> y sírvelos tal cual:', { code: 'server.serveStatic("/", LittleFS, "/www/");' }),
      I('Una <b>API</b> sencilla: una ruta que devuelve JSON y una página que la consulta con fetch().', { code: 'server.on("/api/estado", []() {\n  char json[64];\n  snprintf(json, sizeof(json), "{\\"temp\\":%.1f,\\"rssi\\":%d}", temp, WiFi.RSSI());\n  server.send(200, "application/json", json);\n});' }),
      Q('La página consulta /api/estado cada segundo con fetch(). ¿Qué inconveniente tiene?', ['Muchas peticiones aunque no cambie nada, y un segundo de retraso', 'Ninguno', 'No funciona en móviles', 'Borra la flash'], 'Para tiempo real hay algo mejor: WebSocket.'),
      Q('Tu servidor controla la calefacción y no tiene contraseña.', ['Cualquiera en tu WiFi puede manejarla; nunca lo abras a internet sin autenticación y cifrado', 'Es seguro porque es pequeño', 'El router lo protege de todo', 'No importa'], 'server.authenticate() como mínimo en la red local.'),
      Q('¿Para qué server.onNotFound()?', ['Responder a las rutas que no existen (404 o redirigir)', 'Buscar el WiFi', 'Detectar errores de memoria', 'Encender un LED'], 'Imprescindible en los portales cautivos.')
    ]),
    L('es28', 'WebSocket y mDNS', 'wifi', ['es_web'], [
      I('HTTP: pregunta y respuesta, y se cierra. <b>WebSocket</b>: una conexión que queda abierta y por la que cualquiera de los dos habla cuando quiere, en milisegundos.\nPerfecto para mandos, paneles y gráficas en vivo.'),
      Q('Controlar un brazo robótico desde el móvil en tiempo real:', ['WebSocket', 'Recargar la página', 'Un correo electrónico', 'HTTP consultando cada 5 s'], 'Latencia baja y en los dos sentidos.'),
      I('Con la biblioteca WebSockets (servidor en el puerto 81):', { code: '#include <WebSocketsServer.h>\nWebSocketsServer ws(81);\n\nvoid alMensaje(uint8_t num, WStype_t tipo, uint8_t *datos, size_t len) {\n  if (tipo == WStype_TEXT) { /* datos[0..len-1] */ }\n}\n// setup(): ws.begin(); ws.onEvent(alMensaje);\n// loop():  ws.loop();\n// enviar a todos: ws.broadcastTXT("T:21.5");' }),
      Q('¿Qué hace ws.broadcastTXT(texto)?', ['Envía el texto a todos los clientes conectados', 'Lo envía a uno al azar', 'Lo guarda en la flash', 'Lo imprime por Serial'], 'Ideal para que todos los móviles vean el mismo estado.'),
      Nm('Una página consulta por HTTP cada 100 ms y hay 3 móviles abiertos. ¿Peticiones por segundo?', 30, 'peticiones/s', '10 por segundo × 3 = 30. Con WebSocket, cero peticiones: solo mensajes cuando hay cambios.', { tol: 0.5 }),
      Q('¿Qué hace este fragmento al recibir “B120”?', ['Lee el número tras la B y lo usa como brillo (limitado a 0..255)', 'Pone el brillo a 66 (la letra B)', 'Se cuelga', 'Nada'], 'Valida siempre lo que llega.', { code: 'if (len > 1 && len < 8 && datos[0] == \'B\') {\n  char n[8];\n  memcpy(n, datos + 1, len - 1);\n  n[len - 1] = 0;\n  brillo = constrain(atoi(n), 0, 255);\n}' }),
      I('<b>mDNS</b>: el ESP32 anuncia un nombre en tu red y puedes escribir lampara.local en el navegador en vez de su IP.', { code: '#include <ESPmDNS.h>\nMDNS.begin("lampara");                 // http://lampara.local\nMDNS.addService("http", "tcp", 80);' }),
      Q('Un móvil Android no abre lampara.local.', ['Algunos sistemas no resuelven mDNS: muestra también la IP (pantalla, Serial o el router)', 'El ESP32 está roto', 'mDNS solo funciona por cable', 'Falta PSRAM'], 'Ten siempre un plan B para encontrar la IP.'),
      Q('Varios mensajes por segundo desde un deslizador saturan al ESP32.', ['Limita el envío en la página (como mucho uno cada 30–50 ms) y envía el último valor', 'Sube la frecuencia de la CPU', 'Usa HTTP', 'Quita el WiFi'], 'Al servidor solo le importa el valor más reciente.'),
      Q('¿Qué formato de mensaje es más robusto para crecer?', ['JSON pequeño (o texto con prefijos claros) y validación de cada campo', 'Bytes sin estructura', 'Lo que salga', 'HTML'], 'ArduinoJson ayuda cuando los mensajes se complican.')
    ]),
    L('es29', 'Portal de configuración y hora real', 'wifi', ['es_wifi'], [
      I('Meter la contraseña del WiFi en el código obliga a recompilar si cambias de router, y la deja a la vista de cualquiera que lea el código.\nUn <b>portal cautivo</b> lo resuelve: si no hay credenciales o fallan, el ESP32 abre su propia red con una página para configurarlas.'),
      { t: 'order', q: 'Ordena el funcionamiento de un portal de configuración.', items: ['No hay credenciales o fallan: el ESP32 crea su AP', 'Te conectas con el móvil a esa red', 'Un DNS que responde a todo lleva al móvil a la página del ESP32', 'Eliges la red y escribes la contraseña', 'Se guardan en NVS y el ESP32 se reinicia en modo STA'], e: 'WiFiManager hace todo esto en pocas líneas.' },
      Q('¿Para qué sirve el DNSServer en un portal cautivo?', ['Responde a cualquier nombre con la IP del ESP32, para que el móvil abra la página solo', 'Da internet', 'Cifra la contraseña', 'Ahorra energía'], 'El móvil cree que hay que “iniciar sesión” y muestra la página.'),
      I('<b>Hora real con NTP</b>: el ESP32 pregunta la hora a servidores de internet y el sistema la mantiene. La zona horaria se da en formato POSIX: incluye el cambio de verano.', { code: 'configTzTime("CET-1CEST,M3.5.0,M10.5.0/3", "es.pool.ntp.org");\nstruct tm t;\nif (getLocalTime(&t)) Serial.println(&t, "%d/%m/%Y %H:%M:%S");' }),
      Q('En la zona “CET-1CEST,M3.5.0,M10.5.0/3”, ¿qué significa M3.5.0?', ['El último domingo de marzo', 'El 5 de marzo', 'Las 3:50', 'El día 35'], 'Mes 3, quinta (= última) semana, día 0 (domingo).', { code: 'CET-1CEST,M3.5.0,M10.5.0/3' }),
      Q('getLocalTime(&t) devuelve false justo después de arrancar.', ['Aún no se ha sincronizado: espera o reintenta', 'La zona está mal seguro', 'No hay RTC', 'Es el año 2038'], 'La primera sincronización tarda un poco tras conectar.'),
      I('El sistema resincroniza solo (por defecto, cada hora). Entre medias, la hora la lleva el reloj interno; en deep sleep la mantiene el reloj RTC, menos preciso: resincroniza al despertar si necesitas exactitud.'),
      Q('Para Canarias usarías…', ['Otra cadena de zona: “WET0WEST,M3.5.0/1,M10.5.0”', 'La misma que la península', 'Restar una hora a mano en el código', 'No se puede'], 'Las reglas de cambio son las mismas, pero una hora menos.', { code: 'WET0WEST,M3.5.0/1,M10.5.0' }),
      Q('¿Dónde guardas las credenciales WiFi que introduce el usuario?', ['En NVS (WiFiManager y el propio WiFi las guardan ahí)', 'En el código', 'En una variable global', 'En la EEPROM del USB'], 'Sobreviven a reinicios y actualizaciones.', { c: 'es_flash' })
    ]),
    PRJ('es-p10', 'Proyecto: la lámpara, desde el móvil', 'es_weblamp'),
    PRJ('es-p11', 'Proyecto: reloj NTP con matriz LED', 'es_clock'),
    PRJ('es-p12', 'Proyecto: radio por internet', 'es_radio'),
    PRJ('es-p13', 'Proyecto: osciloscopio en el navegador', 'es_scope'),
    PRJ('es-p14', 'Proyecto: brazo robótico por WebSocket', 'es_arm'),
    PRJ('es-p15', 'Proyecto: plantilla con OTA y portal', 'es_otaportal')
  ];

  const M7 = [
    L('es30', 'BLE: anuncios y roles', 'antenna', ['es_ble'], [
      I('<b>Bluetooth Low Energy</b> no es el Bluetooth clásico de los auriculares: está hecho para enviar poco y dormir mucho.\nTiene dos momentos: los <b>anuncios</b> (advertising), que cualquiera puede oír, y la <b>conexión</b>, para intercambiar datos.'),
      I('Roles (GAP):\n· <b>Periférico</b>: anuncia y acepta conexiones (tu sensor).\n· <b>Central</b>: escanea y conecta (el móvil).\n· <b>Emisor</b> (broadcaster) y <b>observador</b>: solo anuncios, sin conexión.'),
      { t: 'match', q: 'Une cada dispositivo con su papel típico.', pairs: [['Pulsera de actividad', 'Periférico'], ['Móvil con la app', 'Central'], ['Baliza de llavero', 'Emisor (solo anuncios)'], ['Pasarela que escucha balizas', 'Observador']] },
      I('Un anuncio clásico lleva hasta <b>31 bytes</b>: nombre, UUID de servicios, datos de fabricante… Se emite en los tres canales de anuncio (37, 38 y 39) cada cierto intervalo, de 20 ms a unos 10 s. BLE 5 añade anuncios extendidos más largos.'),
      Q('Una baliza que solo emite su identificador y la temperatura, sin conexiones:', ['Basta con anuncios: todo cabe en los datos de fabricante', 'Necesita GATT', 'Necesita Bluetooth clásico', 'Necesita WiFi'], 'Es la forma más barata en energía de difundir datos.'),
      Nm('Anunciando cada 100 ms, ¿cuántos anuncios por hora?', 36000, 'anuncios', '3600 s / 0,1 s = 36 000. Alargar el intervalo es la forma más directa de ahorrar.', { tol: 1 }),
      Q('¿Qué tal sirve el RSSI para medir distancias?', ['Muy aproximado: cuerpos, paredes y orientación lo cambian varios dB', 'Da centímetros exactos', 'No varía nunca', 'Solo funciona en exteriores'], 'Sirve para “cerca/lejos”, no para medir.'),
      Q('Tu escáner ve el móvil con una MAC distinta cada pocos minutos.', ['Los móviles usan direcciones aleatorias por privacidad; para reconocerlos hay que emparejar', 'Es un fallo del ESP32', 'Son varios móviles', 'Es interferencia'], 'Evita el rastreo de personas por su MAC.'),
      Q('iBeacon y Eddystone son…', ['Formatos de datos dentro de los anuncios', 'Chips de Bluetooth', 'Protocolos de WiFi', 'Tipos de batería'], 'Cada uno organiza los 31 bytes a su manera.')
    ]),
    L('es31', 'GATT: servicios y características', 'antenna', ['es_ble'], [
      I('Tras conectar, los datos se organizan con <b>GATT</b>. El periférico es el servidor; dentro tiene <b>servicios</b> y, en cada servicio, <b>características</b>: un valor con propiedades (leer, escribir, notificar).'),
      { t: 'match', q: 'Une cada pieza de GATT.', pairs: [['Servicio', 'Agrupa características relacionadas'], ['Característica', 'Un valor con propiedades'], ['CCCD (0x2902)', 'Activa las notificaciones'], ['UUID', 'Identifica servicios y características']] },
      I('Un servidor BLE mínimo en el núcleo 3.x (los UUID largos los generas tú al azar):', { code: '#include <BLEDevice.h>\n#include <BLEServer.h>\n#include <BLE2902.h>\n\nBLECharacteristic *temp;\n\nvoid setup() {\n  BLEDevice::init("Sensor Voltio");\n  BLEServer *srv = BLEDevice::createServer();\n  BLEService *svc = srv->createService("6e7a0001-3c2b-4f8e-9a51-0d2f4a1b7c10");\n  temp = svc->createCharacteristic("6e7a0002-3c2b-4f8e-9a51-0d2f4a1b7c10",\n          BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);\n  temp->addDescriptor(new BLE2902());   // CCCD para notificar\n  svc->start();\n  BLEDevice::getAdvertising()->addServiceUUID(svc->getUUID());\n  BLEDevice::startAdvertising();\n}\n// Para avisar: temp->setValue(valor); temp->notify();' }),
      Q('Diferencia entre leer y notificar:', ['Con notify el servidor envía cuando cambia, sin que el cliente pregunte', 'Son lo mismo', 'Notify es más lento', 'Leer no existe en BLE'], 'Notificar ahorra tráfico y energía.'),
      Q('¿Para qué escribe el cliente en el descriptor 0x2902?', ['Para suscribirse a las notificaciones de esa característica', 'Para cambiar el nombre', 'Para emparejar', 'Para medir el RSSI'], 'Sin esa suscripción, notify() no llega.'),
      I('UUID: los de <b>16 bits</b> son estándar del Bluetooth SIG (0x180F batería, 0x181A sensores ambientales). Para los tuyos usa <b>128 bits</b> generados al azar.'),
      Q('¿Puedes inventarte un UUID de 16 bits para tu servicio?', ['No: están reservados; usa uno de 128 bits aleatorio', 'Sí, cualquiera', 'Solo si empieza por 0x18', 'Solo en el ESP32-S3'], 'Así no chocas con un servicio estándar.'),
      I('Por defecto cada paquete lleva 20 bytes útiles (MTU de 23). Se puede negociar una MTU mayor (hasta 517) y BLE 5 permite más velocidad física, pero BLE no está hecho para mover mucho volumen.'),
      Nm('Enviar 2000 bytes con 20 bytes por paquete. ¿Cuántos paquetes?', 100, 'paquetes', '2000 / 20 = 100.', { tol: 0.5 }),
      Q('Quieres que solo tu móvil pueda escribir en la característica que abre la puerta.', ['Exigir emparejamiento con cifrado y autenticación para esa característica', 'Usar un UUID raro', 'Bajar la potencia', 'Anunciar menos'], 'Un UUID secreto no es seguridad: cualquiera puede listarlos.')
    ]),
    L('es32', 'BLE como central y la pila NimBLE', 'antenna', ['es_ble'], [
      I('El ESP32 también puede ser <b>central</b>: escanear, filtrar y conectar a otros dispositivos (un pulsómetro, un sensor comercial, otro ESP32).', { code: 'class Oyente : public BLEAdvertisedDeviceCallbacks {\n  void onResult(BLEAdvertisedDevice d) {\n    if (d.haveName()) Serial.printf("%s  %d dBm\\n", d.getName().c_str(), d.getRSSI());\n  }\n};\n\nBLEScan *scan = BLEDevice::getScan();\nscan->setAdvertisedDeviceCallbacks(new Oyente());\nscan->setActiveScan(true);\nscan->start(5, false);    // escanea 5 s' }),
      Q('¿Qué cambia setActiveScan(true)?', ['Pide a cada anunciante su “scan response” con más datos; gasta algo más', 'Escanea más lejos', 'Conecta solo', 'Apaga el WiFi'], 'El escaneo pasivo solo escucha.'),
      I('Hay dos pilas de BLE para el ESP32: <b>Bluedroid</b> (completa, la de la biblioteca BLE estándar) y <b>NimBLE</b> (solo BLE, mucho más ligera en RAM y flash). La biblioteca NimBLE-Arduino es una alternativa muy usada.'),
      Q('WiFi, BLE y un servidor web juntos y te quedas sin RAM.', ['Pasar a NimBLE: ocupa bastante menos', 'Quitar la PSRAM', 'Subir la frecuencia', 'Usar Bluetooth clásico'], 'En el ESP32 clásico la RAM se acaba antes que la CPU.'),
      I('WiFi y BLE comparten la misma radio de 2,4 GHz y se turnan en el tiempo (coexistencia). Funciona, pero ambos van con más latencia y menos rendimiento que por separado.'),
      Q('Audio por WiFi y un mando BLE a la vez dan cortes.', ['La radio se reparte por turnos: más búfer de audio o menos tráfico BLE', 'El BLE está roto', 'Falta un condensador', 'Hay que usar 5 GHz'], 'La coexistencia tiene coste.'),
      I('<b>HID sobre GATT</b>: con el perfil adecuado, el ESP32 se presenta como teclado, ratón o mando BLE ante el móvil o el ordenador, sin drivers.'),
      Q('Teclado por USB nativo (S3) frente a teclado BLE:', ['USB: sin emparejar ni batería; BLE: inalámbrico', 'Son idénticos', 'BLE es más rápido siempre', 'USB necesita WiFi'], 'Depende de si quieres cable o no.'),
      Q('¿Qué servicio estándar usas para informar del nivel de batería?', ['Battery Service (0x180F)', 'Un UUID inventado', 'El nombre del dispositivo', 'El RSSI'], 'Los sistemas operativos lo muestran solos.')
    ]),
    L('es33', 'ESP-NOW: radio directa sin router', 'antenna', ['es_espnow'], [
      I('<b>ESP-NOW</b> es un protocolo de Espressif que usa la radio WiFi para enviar tramas cortas <b>directamente</b> entre ESP32, por su MAC: sin router, sin conexión, con latencia de pocos milisegundos.\nCada mensaje admite hasta <b>250 bytes</b> (las versiones recientes de ESP-IDF amplían el límite).'),
      I('Enviar es registrar al otro como “par” y mandar:', { code: '#include <WiFi.h>\n#include <esp_now.h>\nuint8_t otro[6] = {0x24, 0x6F, 0x28, 0x11, 0x22, 0x33};\n\nvoid setup() {\n  WiFi.mode(WIFI_STA);\n  esp_now_init();\n  esp_now_peer_info_t par = {};\n  memcpy(par.peer_addr, otro, 6);\n  par.channel = 0;          // 0: el canal actual\n  esp_now_add_peer(&par);\n}\n\nvoid loop() {\n  int16_t x = analogRead(34);\n  esp_now_send(otro, (uint8_t *)&x, sizeof(x));\n  delay(20);\n}' }),
      Q('El receptor está conectado a un router en el canal 6 y no recibe nada.', ['El emisor debe transmitir en el canal 6 también', 'Falta la contraseña del router', 'ESP-NOW necesita internet', 'Hay que usar BLE'], 'La radio solo escucha un canal a la vez.'),
      Q('¿Cuántos bytes caben en un mensaje de ESP-NOW clásico?', ['250', '31', '1 MB', '20'], '31 es el anuncio BLE y 20 el paquete GATT por defecto.'),
      I('Se pueden registrar unos 20 pares. También existe el <b>broadcast</b> a la dirección FF:FF:FF:FF:FF:FF: lo reciben todos los del canal, pero sin confirmación.\nEn unicast, el callback de envío dice si el receptor confirmó a nivel de radio.'),
      Q('El callback de envío devuelve éxito. ¿Qué garantiza?', ['Que la radio del receptor confirmó la trama (no que tu programa la procesara)', 'Que el receptor la ha guardado', 'Nada', 'Que hay internet'], 'Si necesitas confirmación de aplicación, que el otro responda.'),
      Q('Coche robot con mando ESP-NOW: el mando se queda sin batería en marcha.', ['El coche debe parar solo si no recibe paquetes en unos 300 ms (failsafe)', 'Sigue con la última orden', 'Se reinicia', 'Busca otro mando'], 'Diseña siempre para el fallo del enlace.'),
      Nm('50 paquetes por segundo de 12 bytes de datos. ¿Bytes por segundo de carga útil?', 600, 'B/s', '50 × 12 = 600 B/s: nada para la radio.', { tol: 1 }),
      { t: 'match', q: '¿Qué radio usarías?', pairs: [['Mando de coche sin router', 'ESP-NOW'], ['Ver datos en la app del móvil', 'BLE'], ['Enviar datos a internet', 'WiFi'], ['Nodo que despierta, envía y duerme', 'ESP-NOW ']] },
      Q('Con ESP-NOW, ¿quién puede leer tus mensajes?', ['Cualquier receptor en el canal, salvo que actives el cifrado con clave (PMK/LMK)', 'Nadie, va cifrado siempre', 'Solo el router', 'Solo dispositivos emparejados por BLE'], 'Para órdenes delicadas, cifrado y comprobación de secuencia.'),
      Q('El alcance de ESP-NOW es parecido al del WiFi del ESP32. Para alargarlo…', ['Antena externa, línea de vista y, si ambos son ESP32, el modo Long Range de Espressif', 'Más bytes por mensaje', 'Más mensajes por segundo', 'Usar el ADC2'], 'En campo abierto se llega a cientos de metros con buenas antenas.')
    ]),
    PRJ('es-p16', 'Proyecto: coche robot con mando ESP-NOW', 'es_rccar'),
    PRJ('es-p17', 'Proyecto: mando de presentaciones BLE', 'es_blekbd'),
    PRJ('es-p18', 'Proyecto: detector de presencia con balizas', 'es_beacon')
  ];

  const M8 = [
    L('es34', 'Modos de sueño', 'sleep', ['es_sleep'], [
      I('Del que más gasta al que menos (ESP32 clásico, valores orientativos de la hoja de datos):\n· <b>Activo con WiFi</b>: decenas a cientos de mA, con picos de unos 240 mA.\n· <b>Modem sleep</b>: CPU activa, radio dormida entre balizas.\n· <b>Light sleep</b>: CPU en pausa y RAM conservada, unos 0,8 mA.\n· <b>Deep sleep</b>: solo el dominio RTC, unos 10 µA.\n· <b>Hibernación</b>: solo un temporizador, unos 5 µA.'),
      { t: 'match', q: 'Une cada modo con lo que conserva.', pairs: [['Light sleep', 'Toda la RAM: sigue donde estaba'], ['Deep sleep', 'Solo la memoria RTC'], ['Hibernación', 'Casi nada: solo el temporizador'], ['Modem sleep', 'Todo; solo duerme la radio']] },
      I('Despertar del <b>deep sleep</b> es como un reinicio: el programa empieza de nuevo en setup(). Solo sobrevive lo que marques para la memoria RTC (8 KB en el clásico).', { code: 'RTC_DATA_ATTR int despertares = 0;   // sobrevive al deep sleep\n\nvoid setup() {\n  despertares++;\n  // medir, enviar...\n  esp_sleep_enable_timer_wakeup(60ULL * 1000000);   // 60 s\n  esp_deep_sleep_start();\n}' }),
      Q('¿Qué pasa con la variable despertares si quitas la alimentación?', ['Se pierde: la memoria RTC sobrevive al deep sleep, no a un corte', 'Se conserva siempre', 'Se guarda en NVS sola', 'Se duplica'], 'Para sobrevivir a cortes, NVS.'),
      Q('Light sleep frente a deep sleep:', ['Light reanuda donde estaba en poco tiempo; deep reinicia el programa pero gasta mucho menos', 'Son iguales', 'Deep conserva la RAM', 'Light gasta menos'], 'Elige según cada cuánto tengas que despertar.'),
      I('Juega con el ciclo: corriente despierto, tiempo despierto, periodo y consumo dormido. Mira qué parte se come la batería.', { tune: { viz: 'es_sleep', params: { Ia: { label: 'Corriente despierto', val: 120, min: 20, max: 200, step: 10, unit: 'mA', dec: 0 }, ta: { label: 'Tiempo despierto', val: 5, min: 0.5, max: 20, step: 0.5, unit: 's', dec: 1 }, T: { label: 'Periodo', val: 10, min: 1, max: 60, step: 1, unit: 'min', dec: 0 }, Is: { label: 'Consumo dormido', val: 10, list: [10, 25, 60, 150, 1000, 5000], unit: 'µA', dec: 0 }, C: { label: 'Batería', val: 2000, min: 500, max: 3500, step: 100, unit: 'mAh', dec: 0 } } } }),
      TU('Con una batería de 2000 mAh y despertando cada 10 minutos a 120 mA, consigue más de un año.', 'es_sleep', { Ia: { val: 120, fixed: true }, ta: { label: 'Tiempo despierto', val: 8, min: 0.5, max: 20, step: 0.5, unit: 's', dec: 1 }, T: { val: 10, fixed: true }, Is: { label: 'Consumo dormido', val: 1000, list: [10, 25, 60, 150, 1000, 5000], unit: 'µA', dec: 0 }, C: { val: 2000, fixed: true } }, { q: 'days', min: 365, max: 1e6, text: 'Objetivo: más de 365 días', hint: 'Ataca las dos cosas: el tiempo despierto y el consumo dormido de la placa.' }, 'Por ejemplo 1 s despierto y 25 µA dormido: unos 370 días.'),
      G('es_sleepLife'),
      Q('Tu DevKit en deep sleep consume 8 mA medidos.', ['El chip duerme, pero el regulador, el USB-serie y el LED de la placa no', 'El deep sleep no funciona', 'Es lo que gasta el chip', 'El WiFi sigue encendido'], 'Para baterías: placa de bajo consumo o módulo con un LDO de poca corriente.')
    ]),
    L('es35', 'Despertar: temporizador, EXT0, EXT1 y touch', 'sleep', ['es_sleep'], [
      I('Fuentes de despertar del deep sleep:\n· <b>Temporizador</b>: dentro de X microsegundos.\n· <b>EXT0</b>: un pin RTC a un nivel.\n· <b>EXT1</b>: varios pines RTC (en el clásico: “cualquiera alto” o “todos bajos”).\n· <b>Touch</b> y el coprocesador <b>ULP</b>.'),
      Nm('esp_sleep_enable_timer_wakeup recibe microsegundos. ¿Qué valor para 15 minutos?', 900000000, 'µs', '15 × 60 × 1 000 000 = 900 000 000 µs. Usa un literal de 64 bits (ULL).', { tol: 1 }),
      I('Solo los <b>GPIO RTC</b> pueden despertar: 0, 2, 4, 12–15, 25–27 y 32–39.', { code: 'esp_sleep_enable_ext0_wakeup(GPIO_NUM_33, 1);   // despierta con el 33 alto\nuint64_t mascara = (1ULL << 32) | (1ULL << 34);\nesp_sleep_enable_ext1_wakeup(mascara, ESP_EXT1_WAKEUP_ANY_HIGH);' }),
      Q('Quieres que un sensor PIR en el GPIO 23 despierte al ESP32.', ['El 23 no es GPIO RTC: muévelo, por ejemplo, al 33', 'Funciona igual', 'Usa EXT1 en el 23', 'Necesitas WiFi'], 'Mira la lista de pines RTC.'),
      Q('¿Qué hace este código al despertar?', ['Distingue si despertó por tiempo o por el pin y actúa en cada caso', 'Vuelve a dormir siempre', 'Borra la RTC', 'Nada'], 'Imprescindible cuando hay varias fuentes.', { code: 'switch (esp_sleep_get_wakeup_cause()) {\n  case ESP_SLEEP_WAKEUP_TIMER: medir(); break;\n  case ESP_SLEEP_WAKEUP_EXT0:  alarma(); break;\n  default:                     primerArranque();\n}' }),
      Q('Un pulsador con INPUT_PULLUP para despertar con EXT0 por nivel bajo no funciona dormido.', ['La pull-up digital no actúa en sueño: usa rtc_gpio_pullup_en() o una resistencia externa', 'EXT0 no admite nivel bajo', 'Falta delay', 'El pulsador está mal'], 'En sueño mandan las funciones RTC del pin.'),
      I('Para que un pin de salida <b>mantenga su nivel</b> durante el sueño (por ejemplo, para dejar apagado un sensor con un MOSFET), se “congela” con gpio_hold_en() y gpio_deep_sleep_hold_en(). Al despertar, se libera con gpio_hold_dis().'),
      Q('¿Qué significa ESP_EXT1_WAKEUP_ALL_LOW?', ['Despierta cuando todos los pines de la máscara están bajos', 'Cuando cualquiera está bajo', 'Nunca', 'Al pulsar EN'], 'En el clásico, para “cualquiera” solo existe la opción en alto.'),
      { t: 'match', q: 'Une cada caso con su fuente de despertar.', pairs: [['Medir cada 10 minutos', 'Temporizador'], ['Un PIR detecta movimiento', 'EXT0'], ['Cualquiera de 4 botones', 'EXT1'], ['Tocar una lámina de cobre', 'Touch']] },
      Q('Con deep sleep y varios despertares, ¿dónde guardas cuántas veces se ha despertado por cada fuente?', ['En variables RTC_DATA_ATTR (o en NVS si debe sobrevivir a cortes)', 'En variables normales', 'En la pila', 'No se puede'], 'Las variables normales se reinician en cada despertar.')
    ]),
    L('es36', 'ULP y medir el consumo de verdad', 'gauge', ['es_sleep'], [
      I('El <b>ULP</b> es un coprocesador minúsculo que sigue funcionando en deep sleep: lee pines o el ADC y solo despierta a la CPU principal si hace falta.\nESP32 clásico: ULP-FSM, en ensamblador. S2 y S3: además, uno RISC-V programable en C. C6: un núcleo de bajo consumo (LP).'),
      Q('Contar pulsos de un pluviómetro durante días a batería:', ['El ULP cuenta en deep sleep y despierta a la CPU cada hora para enviar', 'Despertar la CPU en cada pulso', 'Dejar la CPU activa', 'Usar el WiFi'], 'Despertar la CPU principal es lo caro.'),
      I('Medir microamperios con un multímetro tiene truco: en el rango de µA el instrumento mete una resistencia (shunt) grande. Al despertar, los picos de corriente provocan una caída enorme en ella y el ESP32 se reinicia.\nRemedios: puentear el multímetro durante el arranque, usar un medidor dedicado (como un PPK2 o un INA219) o medir con osciloscopio en una resistencia pequeña.'),
      Nm('En el rango de mA, el multímetro tiene 10 Ω en serie. Un pico de 150 mA, ¿cuánta tensión le roba al circuito?', 1.5, 'V', '0,15 × 10 = 1,5 V: de 3,3 V a 1,8 V. Brownout seguro.', { tol: 0.05, c: 'meter_a' }),
      Q('El ESP32 se reinicia al despertar solo cuando el multímetro está en µA.', ['La resistencia interna del rango de µA provoca una caída enorme con los picos', 'El multímetro está roto', 'Es el ULP', 'Falta RAM'], 'Mide el sueño en µA y el resto en mA, o usa un medidor dinámico.'),
      I('Para el presupuesto, la corriente <b>media</b> es lo que manda. Casi siempre ganas más acortando el tiempo despierto (IP fija, ESP-NOW en lugar de WiFi, sensores en modo forzado) y bajando el consumo dormido de toda la placa (regulador, divisores, LED) que optimizando el código.'),
      G('es_sleepLife'),
      Q('Despiertas cada 10 minutos, 5 s a 120 mA para conectar al WiFi, y duermes a 20 µA. ¿Qué cambio rinde más?', ['Reducir el tiempo despierto (IP fija, canal guardado o ESP-NOW)', 'Bajar el sueño de 20 a 10 µA', 'Subir la CPU a 240 MHz', 'Quitar Serial'], 'La parte despierta supone casi 1 mA de media; la dormida, 0,02.'),
      I('<b>Solar</b>: dimensiona para el peor mes (en invierno hay pocas horas de sol útil) y con días nublados seguidos. Usa un cargador con protección y recuerda que las celdas de litio <b>no deben cargarse por debajo de 0 °C</b> ni con mucho calor.'),
      Q('Un nodo solar en el exterior, en enero, a −3 °C por la mañana:', ['El cargador debe impedir la carga bajo 0 °C: cargar litio helado lo daña y lo vuelve peligroso', 'Carga más rápido con frío', 'No pasa nada', 'Hay que subir la tensión'], 'Hay cargadores con sensor de temperatura (NTC) para esto.')
    ]),
    L('es37', 'ESP-IDF: el entorno profesional', 'code', ['es_idf'], [
      I('<b>ESP-IDF</b> es el framework oficial de Espressif: C, CMake, FreeRTOS y acceso a todo el chip. Arduino-ESP32 está construido encima.\nCon IDF controlas la configuración entera, los componentes, el ULP, la seguridad y el consumo fino.'),
      { t: 'order', q: 'Ordena el flujo típico de un proyecto con idf.py.', items: ['idf.py create-project mi_app', 'idf.py set-target esp32s3', 'idf.py menuconfig', 'idf.py build', 'idf.py -p PUERTO flash monitor'], e: 'set-target va antes de configurar: la configuración depende del chip.' },
      I('El programa empieza en <b>app_main()</b>:', { code: '#include "freertos/FreeRTOS.h"\n#include "freertos/task.h"\n#include "esp_log.h"\n\nstatic const char *TAG = "app";\n\nvoid app_main(void) {\n    int n = 0;\n    while (1) {\n        ESP_LOGI(TAG, "Hola %d", n++);\n        vTaskDelay(pdMS_TO_TICKS(1000));\n    }\n}' }),
      Q('¿En qué se diferencia app_main() de setup() + loop()?', ['Se ejecuta una vez en una tarea: el bucle (o las tareas) los pones tú', 'Es lo mismo', 'Se repite sola', 'No puede crear tareas'], 'Si app_main() termina, su tarea se borra, pero lo que creó sigue.'),
      { t: 'match', q: 'Une cada macro de log con su nivel.', pairs: [['ESP_LOGE', 'Error'], ['ESP_LOGW', 'Aviso'], ['ESP_LOGI', 'Información'], ['ESP_LOGD', 'Depuración']] },
      I('<b>menuconfig</b> es el panel de control: frecuencia de CPU, tick de FreeRTOS, tamaño de flash, tabla de particiones, nivel de log, watchdogs, rollback, PSRAM… Se guarda en el archivo sdkconfig.'),
      Q('En ESP-IDF el tick por defecto es de 100 Hz. ¿Cuánto espera vTaskDelay(10)?', ['100 ms: usa pdMS_TO_TICKS para no depender del tick', '10 ms', '1 ms', '1 s'], 'En Arduino-ESP32 el tick es de 1000 Hz y daría 10 ms.', { c: 'es_rtos' }),
      I('El código se organiza en <b>componentes</b>: carpetas con su CMakeLists.txt (idf_component_register). Los de otros se añaden desde el registro de componentes de Espressif con idf.py add-dependency, y quedan anotados en idf_component.yml.'),
      Q('¿Para qué sirve idf_component.yml?', ['Declarar las dependencias del proyecto y sus versiones', 'Configurar el WiFi', 'Guardar los logs', 'Describir las particiones'], 'Así cualquiera reproduce tu proyecto con las mismas versiones.'),
      Q('¿Se pueden usar bibliotecas de Arduino dentro de un proyecto ESP-IDF?', ['Sí: Arduino-ESP32 se puede añadir como componente de IDF', 'No, nunca', 'Solo en el S3', 'Solo las de WiFi'], 'Lo mejor de los dos mundos, con algo de configuración.')
    ]),
    L('es38', 'Del Arduino-ESP32 a ESP-IDF', 'code', ['es_idf'], [
      { t: 'match', q: 'Une cada función de Arduino con su equivalente en IDF.', pairs: [['digitalWrite', 'gpio_set_level'], ['delay', 'vTaskDelay(pdMS_TO_TICKS(ms))'], ['Serial.println', 'ESP_LOGI o printf'], ['Preferences', 'nvs_open, nvs_get, nvs_set']] },
      I('Configurar un pin en IDF:', { code: 'gpio_config_t io = {\n    .pin_bit_mask = (1ULL << GPIO_NUM_4) | (1ULL << GPIO_NUM_5),\n    .mode = GPIO_MODE_INPUT,\n    .pull_up_en = GPIO_PULLUP_ENABLE,\n};\nESP_ERROR_CHECK(gpio_config(&io));' }),
      Q('¿Qué configura el fragmento anterior?', ['Los GPIO 4 y 5 como entradas con pull-up', 'El GPIO 45 como salida', 'Un PWM', 'Todos los pines'], 'La máscara tiene un bit por pin.'),
      I('Casi todas las funciones de IDF devuelven un <b>esp_err_t</b>. ESP_ERROR_CHECK(x) aborta con un mensaje (archivo, línea y error) si x no es ESP_OK: perfecto mientras desarrollas.'),
      Q('nvs_flash_init() falla en un equipo instalado y ESP_ERROR_CHECK lo reinicia en bucle.', ['En producción, trata el error: por ejemplo, borrar la NVS y reintentar', 'Es lo correcto siempre', 'Quita el WiFi', 'Cambia la placa'], 'ESP_ERROR_CHECK es para errores que no deberían ocurrir nunca.'),
      I('Los eventos del sistema van por un <b>bucle de eventos</b>: registras manejadores con esp_event_handler_register(WIFI_EVENT, …). Es la misma idea que WiFi.onEvent, sin la capa de Arduino.'),
      Q('¿Qué ventaja tiene idf.py monitor al fallar el programa?', ['Decodifica el backtrace y muestra archivo y línea', 'Arregla el fallo', 'Sube la velocidad', 'Nada'], 'Además puedes filtrar por etiqueta y nivel de log.'),
      I('¿Cuándo pasar a IDF? Productos, OTA segura y rollback, consumo muy fino, ULP, tests automatizados, control exacto de versiones.\n¿Cuándo quedarse en Arduino? Prototipos rápidos y cuando una biblioteca lista te ahorra semanas.'),
      Q('Prototipo de fin de semana con una pantalla y un sensor que ya tienen biblioteca Arduino:', ['Arduino-ESP32: llegas antes', 'ESP-IDF puro obligatoriamente', 'Ensamblador', 'Da igual siempre'], 'La herramienta según el objetivo.'),
      Q('¿Qué te enseña idf.py size?', ['Cuánto ocupa cada parte del firmware en flash y en RAM', 'El tamaño de la placa', 'La velocidad del WiFi', 'La pila de cada tarea'], 'Imprescindible cuando la app no cabe en su partición.')
    ]),
    PRJ('es-p19', 'Proyecto: estación de sensores a batería', 'es_station'),
    PRJ('es-p20', 'Proyecto: fototrampa con ESP32-CAM', 'es_cam'),
    PRJ('es-p21', 'Proyecto: tu nodo en ESP-IDF puro', 'es_idfport'),
    PRJ('es-p22', 'Proyecto final: invernadero inteligente', 'es_final')
  ];

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
      { id: 'es-m3', title: 'Periféricos', desc: 'LEDC, DAC, touch, RMT, I²S, buses en cualquier pin, temporizadores e interrupciones.', nodes: M3 },
      { id: 'es-m4', title: 'FreeRTOS en dos núcleos', desc: 'Tareas, prioridades, colas, mutex, condiciones de carrera y watchdogs.', nodes: M4 },
      { id: 'es-m5', title: 'Flash, particiones y OTA', desc: 'Tabla de particiones, NVS, LittleFS, arranque, actualizaciones y seguridad.', nodes: M5 },
      { id: 'es-m6', title: 'WiFi desde el propio chip', desc: 'Modos y reconexión, potencia, servidor web, WebSocket, mDNS, portal y NTP.', nodes: M6 },
      { id: 'es-m7', title: 'Bluetooth LE y ESP-NOW', desc: 'Anuncios, GATT, central y periférico, y radio directa entre ESP32.', nodes: M7 },
      { id: 'es-m8', title: 'Bajo consumo y ESP-IDF', desc: 'Modos de sueño, despertares, ULP, medir microamperios y el entorno profesional.', nodes: M8 }
    ]
  });
})();
