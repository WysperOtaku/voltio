/* Voltio · especialidad: STM32 y ARM Cortex-M. El flujo de trabajo profesional con
   microcontroladores de 32 bits: CubeMX, registros CMSIS, HAL/LL, relojes, NVIC,
   temporizadores, DMA, FreeRTOS y producto real. Todo el texto es original. */
(() => {
  const { pick, ri, fmt, MC, N } = Gen.helpers;
  const HX = Widgets.H;
  const hex = (v, d = 8) => '0x' + (v >>> 0).toString(16).toUpperCase().padStart(d, '0');

  /* ======================= CONCEPTOS ======================= */
  Object.assign(CONCEPTS, {
    /* --- M1 · núcleos, familias y memoria --- */
    st_core: { name: 'ARM: perfiles y licencias de núcleos', alts: [
      { title: 'Motor y coche', text: 'ARM no fabrica chips: diseña núcleos y vende licencias. Es como un fabricante de motores: ARM hace el <b>motor</b> (el núcleo Cortex-M con su NVIC, su SysTick y su depuración) y ST, Nordic o NXP construyen el <b>coche</b> (memoria, relojes y periféricos).\nARM ofrece tres gamas: <b>Cortex-A</b> para sistemas con Linux, <b>Cortex-R</b> para tiempo real crítico y <b>Cortex-M</b> para microcontroladores.', q: mcq('¿Qué parte de un STM32F411 diseñó ARM?', ['El núcleo Cortex-M4 con su NVIC y su SysTick', 'Los GPIO y el ADC', 'El USB y el DMA', 'Todo el chip'], 'ARM licencia el núcleo; STMicroelectronics diseña y fabrica el resto.') },
      { title: 'Lo que viaja contigo de chip en chip', text: 'Todo Cortex-M trae lo mismo de serie: el juego de instrucciones Thumb, el <b>NVIC</b>, el <b>SysTick</b> y la depuración por <b>SWD</b>. Lo demás (GPIO, UART, relojes, PLL) lo diseña cada fabricante y cambia por completo de una marca a otra.\nY si te preguntan por las gamas de ARM: A para aplicaciones con Linux, R para tiempo real exigente y M para microcontroladores.', q: mcq('Cambias de un STM32F4 a un nRF52, ambos Cortex-M4F. ¿Qué tendrás que reaprender?', ['Los periféricos: GPIO, relojes, UART…', 'El NVIC', 'El juego de instrucciones', 'La depuración por SWD'], 'El núcleo es el mismo; los periféricos son de cada fabricante.') }
    ] },
    st_cores: { name: 'Núcleos Cortex-M: M0+, M3, M4F, M7 y M33', alts: [
      { title: 'Escalera de capacidades', text: 'Sube de peldaño en peldaño:\n<b>M0/M0+</b>: lo mínimo, sin división por hardware ni FPU (STM32 F0, G0, L0, C0).\n<b>M3</b>: división por hardware y Thumb-2 completo (F1).\n<b>M4F</b>: instrucciones DSP y FPU de precisión simple (F3, F4, G4, L4).\n<b>M7</b>: cachés y dos instrucciones por ciclo (F7, H7).\n<b>M33</b>: como un M4 moderno con <b>TrustZone</b> (L5, U5, H5).', q: mcq('¿Qué núcleo lleva un STM32H743?', ['Cortex-M7', 'Cortex-M0+', 'Cortex-M3', 'Cortex-M33'], 'La serie H7 usa el M7, el más potente de la gama.') },
      { title: 'Elige por lo que necesitas', text: 'Piensa al revés: ¿qué pide tu proyecto?\nCoste mínimo y poco cálculo → <b>M0+</b> (G0).\nControl clásico → <b>M3</b> (F103).\nFiltros y coma flotante → <b>M4F</b> (F4, G4).\nMucha potencia → <b>M7</b> (H7).\nGuardar claves aisladas → <b>M33</b>: TrustZone divide el chip en un mundo seguro y otro normal, y un fallo en el normal no puede leer los secretos del seguro.', q: mcq('Tu producto guarda claves de cifrado y quieres aislarlas del resto del firmware. ¿Qué núcleo buscas?', ['Cortex-M33 con TrustZone', 'Cortex-M0+', 'Cortex-M3', 'Cortex-M4F'], 'TrustZone separa por hardware el código seguro del normal.') }
    ] },
    st_fpu: { name: 'FPU y coma flotante en Cortex-M', alts: [
      { title: 'Con FPU o a mano', text: 'El M4F y el M7 tienen <b>FPU</b>: multiplicar dos float es una instrucción. El M0+ y el M3 no la tienen: el compilador llama a rutinas de software que tardan decenas de ciclos.\nLa FPU del M4F es de <b>precisión simple</b>: un double (por ejemplo una constante escrita sin la f final) se emula por software. Además la FPU arranca apagada (la enciende SystemInit) y el compilador debe saber que existe (-mfloat-abi=hard).', q: mcq('¿Qué núcleo hace una multiplicación de float en una sola instrucción?', ['Cortex-M4F', 'Cortex-M0+', 'Cortex-M3', 'Ninguno: siempre es software'], 'El M0+ y el M3 emulan la coma flotante.') },
      { title: 'Encenderla y avisar al compilador', text: 'Para usar la FPU hacen falta dos cosas:\n1) <b>Encenderla</b>: SystemInit da acceso a la FPU en SCB->CPACR. Sin eso, la primera instrucción de coma flotante provoca un fallo.\n2) <b>Decírselo al compilador</b>: -mfpu=fpv4-sp-d16 y -mfloat-abi=hard, que además pasa los float en los registros de la FPU.\nY recuerda: en un M4F solo los float van por hardware; los double se emulan.', q: mcq('Compilas con -mfloat-abi=hard pero quitas de SystemInit la activación de la FPU. ¿Qué ocurre?', ['Un fallo en la primera operación con float', 'Los float se emulan por software', 'Todo funciona igual', 'Error de compilación'], 'La FPU sigue apagada y el núcleo rechaza sus instrucciones.') }
    ] },
    st_bits32: { name: '32 bits y tamaño de los tipos', alts: [
      { title: 'Palabras más anchas', text: 'Un micro de 32 bits tiene registros y unidad aritmética de 32 bits: suma dos uint32_t en una instrucción, mientras un AVR de 8 bits necesita cuatro sumas encadenadas con acarreo.\nSus punteros también son de 32 bits: 2³² direcciones = 4 GB.\nY en ARM, <b>int es de 32 bits</b> (hasta 2 147 483 647), no de 16 como en la Uno.', q: mcq('¿Cuál es el mayor valor de un int en un STM32?', ['2 147 483 647', '32 767', '65 535', '255'], 'int es de 32 bits con signo en ARM.') },
      { title: 'El tipo manda, no el chip', text: 'El tamaño de int cambia según la arquitectura; el de uint8_t, int16_t o uint32_t (de stdint.h) es fijo. Un uint8_t llega a 255 en cualquier micro: 250 + 10 da la vuelta y queda 4.\nRegla: usa tipos de anchura fija y piensa en su rango. Ser “de 32 bits” habla del chip (registros, sumas en una instrucción, 4 GB de direcciones), no de tus variables.', q: mcq('uint16_t x = 65530; x += 10; ¿Cuánto vale x en un STM32?', ['4', '65 540', '65 535', '10'], 'Un uint16_t llega a 65 535: 65 540 da la vuelta a 4, sea el chip de 8 o de 32 bits.') }
    ] },
    st_family: { name: 'Elegir familia y chip STM32', alts: [
      { title: 'Letras con apellido', text: '<b>F</b>: uso general clásico (F0, F1, F4, F7). <b>G</b>: uso general moderno; la G4 trae comparadores, amplificadores y temporizadores para motores y convertidores. <b>L</b> y <b>U</b>: bajo consumo. <b>H</b>: alto rendimiento. <b>W</b>: con radio.\nToda la familia comparte herramientas gratuitas y ST garantiza suministro durante años: por eso la industria la usa tanto. Pero cada chip trae sus periféricos: compruébalo antes de elegir.', q: mcq('Diseñas el control de un motor y quieres comparadores y amplificadores internos. ¿Qué familia miras primero?', ['G4', 'L0', 'F0', 'WB'], 'La G4 está pensada para potencia y control.') },
      { title: 'Lee la lista de periféricos', text: 'Dos chips de la misma serie pueden ser muy distintos. La F401 y la F411 <b>no tienen DAC ni CAN</b>; la F446 tiene los dos. En la F103, el USB y el CAN comparten una memoria interna y <b>no se pueden usar a la vez</b>.\nAntes de elegir, filtra en el selector de CubeMX por lo que necesitas (DAC, CAN, USB, memoria, encapsulado, precio). Elegir bien al principio te ahorra rediseñar.', q: mcq('Necesitas un DAC interno. ¿Cuál de estos chips lo tiene?', ['STM32F446', 'STM32F411', 'STM32F401', 'Todos los F4'], 'La F401 y la F411 no tienen DAC.') }
    ] },
    st_partnum: { name: 'Leer el código de un STM32', alts: [
      { title: 'Descomponer STM32F411CEU6', text: 'STM32 · <b>F</b> familia · <b>411</b> línea · <b>C</b> patas · <b>E</b> Flash · <b>U</b> encapsulado · <b>6</b> temperatura.\nPatas: C = 48, R = 64, V = 100.\nFlash: 8 = 64 KB, B = 128 KB, C = 256 KB, E = 512 KB.\nEncapsulado: T = LQFP (con patas), U = UFQFPN (sin patas).\nTemperatura: 6 = de −40 a 85 °C, 7 = hasta 105 °C.', q: mcq('¿Cuántas patas y cuánta Flash tiene un STM32F401RCT6?', ['64 patas y 256 KB', '48 patas y 256 KB', '64 patas y 512 KB', '100 patas y 128 KB'], 'R = 64 patas; C = 256 KB.') },
      { title: 'Error típico: leer números como cantidades', text: 'El 411 no son MHz ni KB: es la <b>línea</b>. La letra que sigue son las <b>patas</b> y la siguiente la <b>Flash</b>, como código: un 8 significa 64 KB, no 8 KB. Después va el <b>encapsulado</b> (T con patas, U sin patas, más difícil de soldar a mano) y el último dígito es la <b>temperatura</b> (6: −40 a 85 °C).', q: mcq('STM32F103C8T6: ¿qué significa el 8?', ['64 KB de Flash', '8 KB de Flash', '8 MHz', '8 UART'], 'Es el código de Flash.') }
    ] },
    st_boards: { name: 'Placas Nucleo, Black Pill y Blue Pill', alts: [
      { title: 'La Nucleo-64', text: 'Lleva un <b>ST-LINK integrado</b> que graba, depura y hace de puerto serie virtual: la <b>USART2</b> (PA2/PA3) llega al PC por el mismo USB. LED LD2 en <b>PA5</b> y pulsador B1 en <b>PC13</b>.\nLa Black Pill (F401/F411) pone el LED en <b>PC13 activo a nivel bajo</b> y el pulsador en PA0; la Blue Pill (F103, sin FPU) abunda en clones. Alimenta cualquier placa por <b>una sola fuente</b>: dos fuentes en el mismo punto se pelean.', q: mcq('En una Nucleo-64, ¿en qué pin está el LED LD2?', ['PA5', 'PC13', 'PA0', 'PB3'], 'PC13 es el pulsador B1 de la Nucleo (y el LED de la Black Pill).') },
      { title: 'Black Pill frente a Blue Pill', text: 'La <b>Black Pill</b> lleva un F401 o F411 (Cortex-M4F con FPU, más RAM y Flash), cristal de 25 MHz, LED en <b>PC13 conectado a 3,3 V</b> (un 0 lo enciende) y KEY en <b>PA0</b>. Se graba con ST-LINK externo o por DFU.\nLa <b>Blue Pill</b> (F103, M3 sin FPU) sufre clones y una pull-up de USB mal puesta. En la Nucleo, el ST-LINK integrado da printf por USART2 sin cables.\nY nunca alimentes a la vez por USB y por 5 V externos en el mismo pin.', q: mcq('Black Pill: escribes GPIO_PIN_SET en PC13. ¿Qué hace el LED?', ['Se apaga: se enciende a nivel bajo', 'Se enciende', 'Parpadea', 'Nada: PC13 no tiene LED'], 'Con el pin a 3,3 V no hay diferencia de tensión en el LED.') }
    ] },
    st_pinlim: { name: 'Límites eléctricos y velocidad de los pines', alts: [
      { title: 'Lo que aguanta un pin', text: 'Un pin da unos <b>25 mA</b> como máximo, y hay un límite total para todo el chip: para relés o motores, un transistor.\nSolo los pines marcados <b>FT</b> en la hoja de datos toleran 5 V, y solo como entrada digital (en modo analógico dejan de ser tolerantes).\n<b>OSPEEDR</b> no fija la frecuencia sino lo rápidos que son los flancos: usa la velocidad más baja que funcione.', q: mcq('Quieres encender un relé de 80 mA desde un pin. ¿Qué haces?', ['Usar un transistor con diodo de libre circulación', 'Conectarlo directo a un pin FT', 'Poner OSPEEDR en muy alta', 'Usar dos pines en paralelo'], 'Un pin no da 80 mA; FT habla de tensión, no de corriente.') },
      { title: 'Tres errores típicos', text: '1) Creer que FT vale en cualquier modo: solo en entrada digital.\n2) Colgar cargas grandes del pin: más de unos 25 mA lo dañan.\n3) Poner la velocidad máxima “por si acaso”: flancos de nanosegundos generan interferencias y rebotes en pistas largas. Un LED o un relé van en velocidad <b>baja</b>; solo SPI rápido o buses de memoria piden más.', q: mcq('Un sensor da una salida digital de 5 V. ¿A qué pin lo conectas directamente?', ['A uno marcado FT, configurado como entrada digital', 'A cualquiera', 'A uno en modo analógico', 'A uno con OSPEEDR alto'], 'FT = tolerante a 5 V en modo digital.') }
    ] },
    st_memmap: { name: 'Regiones del mapa de memoria', alts: [
      { title: 'Una calle con números', text: 'Todo el chip es una calle de direcciones de 32 bits. En el <b>0x08000000</b> vive la Flash, en el <b>0x20000000</b> la SRAM, desde el <b>0x40000000</b> los periféricos y en el <b>0xE0000000</b> los del núcleo (NVIC, SysTick).\nLos periféricos están <b>mapeados en memoria</b>: sus registros se leen y escriben como cualquier dirección, con un puntero.', q: mcq('¿Qué hay en 0x20000100 en un STM32F4?', ['SRAM (variables y pila)', 'Flash (programa)', 'Un periférico', 'Nada, está vacío'], 'La SRAM empieza en 0x20000000.') },
      { title: 'Medir regiones en hexadecimal', text: 'Para saber dónde acaba una región, suma su tamaño en hexadecimal. 128 KB = 128 × 1024 = 131 072 = <b>0x20000</b> bytes: la SRAM de la F411 va de 0x20000000 a 0x2001FFFF y la primera dirección fuera es <b>0x20020000</b>.\nRecuerda las bases: Flash en 0x08000000, SRAM en 0x20000000, periféricos desde 0x40000000; los registros se leen como memoria.', q: mcq('Una F401CC tiene 64 KB de SRAM. ¿Cuál es la primera dirección fuera de ella?', ['0x20010000', '0x20064000', '0x20001000', '0x20006400'], '64 KB = 0x10000 bytes.') }
    ] },
    st_regaddr: { name: 'Dirección de un registro: base + desplazamiento', alts: [
      { title: 'Base + desplazamiento', text: 'Cada periférico tiene una <b>dirección base</b> y cada registro un <b>desplazamiento</b> fijo dentro de él. GPIOA está en 0x40020000 y ODR en +0x14, así que GPIOA->ODR es 0x40020014.\nLas estructuras de CMSIS hacen esta suma por ti: GPIOA es un puntero a una estructura cuyos campos están en el mismo orden y separación que los registros.', q: mcq('GPIOB empieza en 0x40020400. ¿Dónde está su IDR (+0x10)?', ['0x40020410', '0x40020400', '0x40020440', '0x40020010'], 'Base + 0x10.') },
      { title: 'Suma en hexadecimal sin trampas', text: 'El desplazamiento está en <b>hexadecimal</b>: 0x14 son 20 bytes, no 14. Suma cifra a cifra en base 16:\n0x40020000 + 0x14 = 0x40020014.\n0x40004400 + 0x0C = 0x4000440C.\nErrores típicos: sumar el desplazamiento como si fuera decimal, o multiplicarlo por 4 (ya está en bytes).', q: mcq('TIM3 empieza en 0x40000400. ¿Dirección de ARR (+0x2C)?', ['0x4000042C', '0x4000042B', '0x40000444', '0x4000002C'], '0x400 + 0x2C = 0x42C.') }
    ] },
    st_volatile: { name: 'volatile y el optimizador', alts: [
      { title: 'El compilador abrevia', text: 'Con -O2 el compilador guarda variables en registros, quita lecturas que cree repetidas y escrituras que cree inútiles. Por eso el depurador dice “optimized out”: para depurar, compila con -Og.\nPara un registro de periférico o una variable que cambia en una interrupción, abreviar es un error: <b>volatile</b> obliga a hacer de verdad cada acceso. El <b>__IO</b> de CMSIS es justo eso, una macro de volatile.', q: mcq('Una variable que modifica una interrupción no cambia nunca en el bucle de main con -O2. ¿Qué falta?', ['Declararla volatile', 'Subir la optimización', 'Usar HAL_Delay', 'Declararla const'], 'Sin volatile, el compilador puede leerla una sola vez.') },
      { title: 'Un ejemplo paso a paso', text: '<b>while (!listo) { }</b> con listo normal: el compilador la lee una vez, ve que el bucle no la cambia y lo convierte en un bucle infinito. Con volatile la lee en cada vuelta.\nLo mismo con un puntero a un registro: sin volatile, dos escrituras seguidas podrían quedarse en una. El precio de volatile es que el optimizador no puede guardar la variable en un registro; sin volatile, con -O2, a veces ni existe en memoria y el depurador muestra “optimized out”.', q: mcq('¿Qué es __IO en las cabeceras de CMSIS?', ['Una macro de volatile', 'Un tipo de 64 bits', 'Una función de entrada y salida', 'Una sección de memoria'], 'Cada acceso a un registro debe hacerse de verdad.') }
    ] },
    st_bsrr: { name: 'Escritura atómica: BSRR y bit-banding', alts: [
      { title: 'Dos mitades', text: 'En <b>BSRR</b> los bits 0–15 ponen pines a 1 y los bits 16–31 los ponen a 0. Escribir un 1 actúa; un 0 no hace nada. Es <b>una sola escritura</b>, sin leer antes: atómica.\nPara poner a 0 el pin n: 1U &lt;&lt; (n + 16). Puedes subir uno y bajar otro a la vez sumando las máscaras con |.', q: mcq('¿Qué escribes en GPIOA->BSRR para poner PA9 a 0?', ['1U << 25', '1U << 9', '~(1U << 9)', '1U << 18'], 'Bit 9 + 16 = 25.') },
      { title: 'Por qué ODR ^= puede perder cambios', text: 'ODR ^= máscara son tres pasos: <b>leer</b>, cambiar y <b>escribir</b>. Si una interrupción cambia otro pin del mismo puerto entre la lectura y la escritura, main escribe el valor viejo y borra ese cambio.\nBSRR (y en el M3 y el M4 el <b>bit-banding</b>, que da a cada bit su propia palabra en una zona alias) cambia solo lo que toca en una única escritura: ninguna interrupción puede colarse.', q: mcq('GPIOB->BSRR = (1U << 2) | (1U << (6 + 16)). ¿Efecto?', ['PB2 a 1 y PB6 a 0', 'PB2 y PB6 a 1', 'PB2 a 0 y PB6 a 1', 'PB2 y PB22 a 1'], 'Mitad baja: poner a 1; mitad alta: poner a 0.') }
    ] },
    st_boot0: { name: 'BOOT0 y el cargador de ROM', alts: [
      { title: 'Un interruptor que solo se mira al arrancar', text: '<b>BOOT0 solo se lee en el reset</b>. A 0, el chip arranca desde la Flash (tu programa). A 1, arranca desde la <b>memoria de sistema</b>: el cargador que ST grabó en ROM, que acepta firmware por USART, USB DFU y otras interfaces según el chip (nota AN2606).\nPara DFU en una Black Pill: mantén BOOT0, pulsa y suelta NRST, suelta BOOT0, graba y vuelve a pulsar NRST. Si BOOT0 sigue a 1 en el reset, vuelves al cargador.', q: mcq('Grabas por DFU, quitas y pones el USB y vuelve a aparecer el cargador. ¿Qué pasa?', ['BOOT0 está a 1 en el reset', 'El programa está mal grabado', 'Falta el cristal de 32 kHz', 'El USB está roto'], 'BOOT0 debe quedar a 0 para arrancar tu programa.') },
      { title: 'El cargador sin tocar el pin', text: 'Tu aplicación también puede entrar al cargador de ROM sin BOOT0: desactiva interrupciones y periféricos, toma el puntero de pila y el vector de reset de la memoria de sistema (0x1FFF0000 en la F4) y salta.\nUn <b>cargador propio</b> va más lejos: tu interfaz y tu protocolo, verificar o cifrar la imagen y actualizar en el campo sin tocar pines. Recuerda que BOOT0 solo se mira en el reset.', q: mcq('¿Qué te da un cargador propio que no te da el de ROM?', ['Verificar la imagen y actualizar por tu interfaz sin tocar BOOT0', 'Arrancar más rápido siempre', 'Ocupar cero bytes de Flash', 'Poder usar RDP nivel 2 sin riesgo'], 'El de ROM es fijo; el tuyo hace lo que tu producto necesita.') }
    ] },
    /* --- M2 · herramientas --- */
    st_cubemx: { name: 'CubeMX: código generado y USER CODE', alts: [
      { title: 'Qué escribe CubeMX y dónde', text: 'El <b>.ioc</b> guarda la configuración y CubeMX genera:\n<b>main.c</b>: main, SystemClock_Config y MX_xxx_Init.\n<b>main.h</b>: las macros de tus etiquetas de pin (LED_Pin, LED_GPIO_Port).\n<b>stm32f4xx_it.c</b>: los manejadores de interrupción.\n<b>stm32f4xx_hal_msp.c</b>: HAL_xxx_MspInit, que abre el reloj de cada periférico y configura sus pines.\nAl regenerar, solo se conserva lo escrito entre USER CODE BEGIN y END.', q: mcq('¿Dónde se abre el reloj de la USART2 y se configuran sus pines en un proyecto de CubeMX?', ['En HAL_UART_MspInit, dentro de stm32f4xx_hal_msp.c', 'En main.h', 'En SystemInit', 'En el script del enlazador'], 'Las funciones Msp hacen la parte de bajo nivel de cada periférico.') },
      { title: 'Regenerar sin perder nada', text: 'El flujo es: elegir chip, asignar pines y periféricos en el .ioc, configurar relojes, <b>generar</b> y escribir tu código <b>solo entre /* USER CODE BEGIN x */ y /* USER CODE END x */</b>. Todo lo de fuera se sobrescribe al regenerar.\nLo generado tiene su sitio fijo: etiquetas en main.h, relojes y pines en los Msp, manejadores en _it.c. Haz un commit antes de regenerar para ver el diff.', q: mcq('Escribes tu bucle justo antes de /* USER CODE BEGIN 3 */ y regeneras. ¿Qué pasa?', ['Se borra: estaba fuera de una zona USER CODE', 'Se conserva', 'CubeMX lo mueve a otra zona', 'El proyecto deja de compilar'], 'Solo se conserva lo que va entre BEGIN y END.') }
    ] },
    st_swd: { name: 'Conexión SWD con el ST-LINK', alts: [
      { title: 'Dos hilos y masa', text: 'SWD necesita <b>SWDIO</b> (datos, PA13), <b>SWCLK</b> (reloj, PA14) y, siempre, <b>GND</b> común. Opcionales: NRST (reset) y SWO (traza, PB3).\nFrente a cargar por un cargador serie, SWD graba en segundos y además deja parar el núcleo y leer memoria y registros.\nCon cables largos, baja la frecuencia de SWD en la configuración del depurador.', q: mcq('Conectas SWDIO y SWCLK pero no GND. ¿Qué pasa?', ['Falla o no conecta: no hay referencia común', 'Funciona igual', 'Solo falla SWO', 'Se borra la Flash'], 'Las señales se miden respecto a masa.') },
      { title: 'Cuando la conexión falla', text: 'Revisa en este orden:\n1) <b>GND</b> común y la placa alimentada.\n2) SWDIO en PA13 y SWCLK en PA14, sin cruzar.\n3) <b>Cables cortos</b>: a más velocidad, más importan la longitud y el ruido. Si con 30 cm falla y con 10 cm va, baja la frecuencia de SWD.\nSWD compensa: con él grabas rápido y depuras en el chip.', q: mcq('Con cables de 30 cm la conexión falla; con 10 cm va bien. ¿Qué ajustas?', ['Bajar la frecuencia de SWD', 'Subir la tensión', 'Quitar GND', 'Cambiar de chip'], 'Menos velocidad tolera peor cableado.') }
    ] },
    st_swdrec: { name: 'Recuperar la conexión SWD', alts: [
      { title: 'Conectar antes de que tu código actúe', text: 'Si tu programa reconfigura PA13 y PA14 como GPIO (o, en la F1, eliges “No Debug” y el código desactiva el SWD), el depurador pierde el acceso en cuanto arranca.\n<b>Connect under reset</b>: el ST-LINK mantiene NRST a nivel bajo, conecta y detiene el núcleo justo al soltarlo, antes de tu código. Entonces haces un borrado completo. Para que no pase: SYS › Debug en “Serial Wire”.', q: mcq('¿Qué hace el modo “Connect under reset”?', ['Conecta con NRST a nivel bajo y para el núcleo antes de que corra tu código', 'Resetea el ST-LINK', 'Borra la Flash sin conectar', 'Baja la frecuencia de SWD'], 'Así tu programa no llega a tocar PA13 y PA14.') },
      { title: 'Plan B: BOOT0', text: 'Sin NRST cableado, arranca con <b>BOOT0 a 1</b>: se ejecuta el cargador de ROM, tu programa no corre y PA13/PA14 siguen siendo SWD. Conecta, borra la Flash y graba un programa que deje el SWD activo (en CubeMX: SYS › Debug = Serial Wire, que reserva esos pines).', q: mcq('No tienes NRST cableado y tu programa desactiva el SWD al arrancar. ¿Qué haces?', ['Arrancar con BOOT0 a 1, conectar y borrar la Flash', 'Subir la frecuencia de SWD', 'Cambiar el cable USB', 'Esperar a que se borre sola'], 'Con BOOT0 a 1 tu código no se ejecuta.') }
    ] },
    st_dbglp: { name: 'Depurar con bajo consumo y watchdogs (DBGMCU)', alts: [
      { title: 'El depurador también necesita reloj', text: 'En Stop o Standby se paran los relojes que usa la lógica de depuración y el ST-LINK pierde la conexión. Los bits de <b>DBGMCU</b> (por ejemplo HAL_DBGMCU_EnableDBGStopMode) los mantienen encendidos… a cambio de <b>más consumo</b>: quítalos en el producto.\nDBGMCU también puede <b>congelar el IWDG</b> mientras el núcleo está parado en un punto de ruptura; si no, el watchdog sigue contando y reinicia el chip.', q: mcq('¿Qué precio tiene dejar activada la depuración en Stop en el producto final?', ['Más consumo en reposo', 'Menos velocidad de la CPU', 'Se pierde la RAM', 'Ninguno'], 'Mantiene relojes encendidos para el depurador.') },
      { title: 'Dos síntomas, una causa', text: 'Síntoma 1: al dormir el chip, el depurador se desconecta.\nSíntoma 2: al pausar en un punto de ruptura, el chip se reinicia a los pocos segundos.\nLos dos se arreglan en <b>DBGMCU</b>: mantener la depuración en Stop o congelar el IWDG mientras el núcleo está parado. Úsalo solo en desarrollo: en el producto, la depuración en Stop gasta corriente de más.', q: mcq('Pausas el programa con el depurador y a los 2 s el chip se reinicia. ¿Por qué?', ['El IWDG sigue contando: congélalo con DBGMCU', 'El ST-LINK está roto', 'Falta memoria', 'Es un fallo del compilador'], 'El IWDG no se para solo al parar el núcleo.') }
    ] },
    st_debug: { name: 'Herramientas del depurador', alts: [
      { title: 'Pausar el mundo', text: 'Con SWD el depurador puede <b>parar el núcleo</b>, leer y escribir cualquier dirección y continuar.\n<b>Punto de ruptura</b>: para en una línea (en Flash usan comparadores de hardware: el M4 tiene 6).\n<b>Step Into / Over / Return</b>: entrar en la función, ejecutarla entera o salir de ella. <b>Resume</b>: seguir.\n<b>Watchpoint</b>: para cuando se lee o escribe una dirección.\n<b>Live Expressions</b>: leen variables sin parar el programa.', q: mcq('Quieres ver cómo cambia una variable mientras el programa corre, sin pararlo. ¿Qué usas?', ['Live Expressions', 'Un punto de ruptura', 'Step Into', 'El archivo .map'], 'Se leen por SWD en segundo plano.') },
      { title: 'Cada pregunta, su herramienta', text: '¿Quién pisa esta variable? → <b>watchpoint</b>.\n¿Qué hace esta función por dentro? → <b>Step Into</b>.\n¿Me salto esta llamada? → <b>Step Over</b>.\n¿Salgo de la función? → <b>Step Return</b>.\n¿Sigo hasta el siguiente punto? → <b>Resume</b>.\n¿Cómo evoluciona algo en marcha? → <b>Live Expressions</b>.\nNada de esto existe si grabas por un cargador serie: por eso se desarrolla con SWD.', q: mcq('Una variable global aparece con un valor absurdo y no sabes quién la escribe. ¿Qué usas?', ['Un watchpoint de escritura sobre su dirección', 'Step Over', 'Live Expressions', 'Un punto de ruptura en main'], 'El programa se para justo en la instrucción que la escribe.') }
    ] },
    st_hardfault: { name: 'HardFault y desbordamiento de pila', alts: [
      { title: 'Qué lo provoca y dónde mirar', text: 'Un <b>HardFault</b> salta cuando el núcleo hace algo imposible: acceder a una dirección inválida, saltar a un puntero nulo, ejecutar algo que no es código o desbordar la pila.\nAl entrar, el hardware apila el <b>PC</b>: te dice qué instrucción se ejecutaba al fallar. CFSR, HFSR y BFAR dan la causa; el Fault Analyzer de CubeIDE los lee por ti.', q: mcq('¿Qué te dice el PC apilado al entrar en un HardFault?', ['La instrucción que se ejecutaba al fallar', 'La dirección de main', 'El tamaño de la pila', 'La frecuencia del reloj'], 'Búscalo en el desensamblado o en el .map.') },
      { title: 'Fallos que aparecen lejos de la causa', text: 'Una <b>pila desbordada</b> crece hacia abajo y pisa .bss o el montón: variables globales que cambian solas y HardFaults en sitios distintos cada vez. Sin RTOS nadie lo vigila.\nUn puntero a función nulo salta a una dirección sin código válido y falla al instante. En ambos casos, el PC apilado en el HardFault es tu primera pista.', q: mcq('Variables globales que cambian solas y HardFaults en sitios distintos. ¿Primera sospecha?', ['Desbordamiento de pila', 'Falta volatile', 'El cristal está mal', 'printf sin float'], 'La pila ha invadido otras zonas de la RAM.') }
    ] },
    st_cycles: { name: 'Medir y esperar microsegundos', alts: [
      { title: 'Un cronómetro de ciclos', text: '<b>DWT->CYCCNT</b> cuenta ciclos del núcleo. Tiempo = ciclos / fCPU: a 100 MHz, 2500 ciclos son 25 µs.\nLa base de tiempo de la HAL va en milisegundos, así que para esperas de microsegundos usa CYCCNT o un temporizador hardware.', q: mcq('A 84 MHz, CYCCNT avanza 420 cuentas. ¿Cuánto tiempo ha pasado?', ['5 µs', '0,5 µs', '50 µs', '420 µs'], '420 / 84 MHz = 5 µs.') },
      { title: 'Resolución: elige el reloj adecuado', text: 'Un reloj solo mide (y espera) con la finura de su tick:\nHAL_GetTick: 1 ms.\nUn temporizador a 1 MHz: 1 µs.\nCYCCNT a 100 MHz: 10 ns.\nPara esperar 5 µs necesitas algo de microsegundos o menos. Y para convertir cuentas en tiempo, divide entre la frecuencia de ese reloj.', q: mcq('Necesitas esperar 10 µs. ¿Qué NO sirve?', ['HAL_Delay', 'DWT->CYCCNT', 'Un temporizador a 1 MHz', 'Un temporizador a 10 MHz'], 'HAL_Delay tiene resolución de 1 ms.') }
    ] },
    st_printf: { name: 'printf en un STM32 (UART y SWO)', alts: [
      { title: 'Dónde acaba printf', text: 'printf usa newlib, que llama a _write y esta a <b>__io_putchar</b> por cada carácter: esa función la escribes tú. Con HAL_UART_Transmit sale por la UART; con <b>ITM_SendChar</b>, por el canal SWO del depurador.\nDos sorpresas: newlib-nano no imprime float salvo que lo actives (-u _printf_float), y stdout guarda en un búfer hasta el \\n.', q: mcq('printf("%f", x) no imprime nada. ¿Qué falta?', ['Activar float en newlib-nano (-u _printf_float)', 'Subir los baudios', 'Declarar x volatile', 'Usar SWO'], 'Ocupa unos KB más de Flash.') },
      { title: 'SWO: printf sin gastar una UART', text: 'Con ITM_SendChar los caracteres salen por <b>SWO</b> (PB3) hacia el depurador. Requisitos: un ST-LINK con SWO (el de las Nucleo lo tiene; los clones de pendrive casi nunca) y decirle al depurador la <b>frecuencia real del núcleo</b>: si no coincide, basura.\nPor UART, __io_putchar llama a HAL_UART_Transmit; termina tus mensajes con \\n o se quedarán en el búfer.', q: mcq('Activas SWO y la consola muestra basura. ¿Primera sospecha?', ['La frecuencia del núcleo configurada en el depurador no coincide con SYSCLK', 'Falta un pull-up', 'La Flash está llena', 'La UART va lenta'], 'El ST-LINK la necesita para decodificar SWO.') }
    ] },
    st_uarttime: { name: 'Tiempo y caudal de una UART', alts: [
      { title: '10 bits por carácter', text: 'En 8N1 cada carácter son <b>10 bits</b>: inicio, 8 de datos y parada.\nBytes por segundo = baudios / 10.\nTiempo de un mensaje = caracteres × 10 / baudios.\nA 115 200 baudios: 11 520 bytes/s; 46 caracteres tardan 460 / 115 200 ≈ 4 ms.', q: mcq('A 9600 baudios en 8N1, ¿cuántos bytes por segundo como máximo?', ['960', '1200', '9600', '96'], '9600 / 10.') },
      { title: 'Error típico: dividir entre 8', text: 'Si divides entre 8 olvidas los bits de inicio y parada y te sale un 25 % de más. A 115 200 baudios son 11 520 bytes/s, no 14 400.\nUn mensaje de 100 caracteres tarda 100 × 10 / 115 200 ≈ 8,7 ms, y con HAL_UART_Transmit la CPU espera todo ese tiempo.', q: mcq('Un mensaje de 20 caracteres a 19 200 baudios (8N1). ¿Cuánto tarda?', ['≈ 10,4 ms', '≈ 8,3 ms', '≈ 1 ms', '≈ 104 ms'], '200 bits / 19 200.') }
    ] },
    st_isrrules: { name: 'Esperas e impresiones dentro de interrupciones', alts: [
      { title: 'Entrar y salir', text: 'Una interrupción debe ser <b>corta</b>: guarda el dato, marca una bandera y sale; lo lento lo hace main o una tarea.\nprintf a 115 200 baudios bloquea milisegundos y retrasa todo lo demás.\nHAL_Delay depende de la interrupción del SysTick: si estás en una interrupción igual o más urgente que el SysTick, este no puede entrar, el contador no avanza y el programa se cuelga.', q: mcq('Llega un dato en una interrupción y quieres imprimirlo. ¿Qué haces?', ['Guardarlo y que lo imprima main', 'printf dentro de la interrupción', 'HAL_Delay y después printf', 'Desactivar las interrupciones y hacer printf'], 'La interrupción solo recoge; main trabaja.') },
      { title: 'Por qué HAL_Delay se cuelga', text: 'Paso a paso: HAL_Delay espera a que HAL_GetTick() avance. Lo avanza SysTick_Handler cada milisegundo. Si tu interrupción tiene prioridad 0 y el SysTick 15, el SysTick nunca puede expropiarla: el contador se congela y HAL_Delay espera para siempre.\nLo mismo vale para cualquier espera o impresión larga: dentro de una interrupción, nada que bloquee.', q: mcq('Llamas a HAL_Delay(5) desde una interrupción de prioridad 2 con el SysTick en 15. ¿Qué pasa?', ['Se cuelga para siempre', 'Espera 5 ms', 'Espera 0 ms', 'Se reinicia el chip'], 'El SysTick no puede interrumpir a una más urgente.') }
    ] },
    st_brr: { name: 'BRR y error de velocidad de la USART', alts: [
      { title: 'Un divisor del reloj', text: 'Con sobremuestreo ×16: <b>BRR = fPCLK / baudios</b>, redondeado. (Los 4 bits bajos son la fracción en dieciseisavos y el resto la mantisa, pero el número entero que escribes es esa división.) Usa el PCLK del bus de esa USART.\nEl redondeo deja un error: velocidad real = fPCLK / BRR. Si pasa de un 2 %, la comunicación falla.', q: mcq('PCLK = 16 MHz y 9600 baudios (×16). ¿Qué valor escribes en BRR?', ['1667 (0x0683)', '104 (0x0068)', '0x1667', '833 (0x0341)'], '16 000 000 / 9600 = 1666,7 → 1667. 104 sería solo la mantisa.') },
      { title: 'El redondeo deja un error', text: 'Con PCLK = 16 MHz y 115 200 baudios: 16 000 000 / 115 200 = 138,9 → BRR = 139. Velocidad real = 16 000 000 / 139 ≈ 115 108 baudios: un error del 0,08 %.\nSi PCLK es bajo y la velocidad alta, el divisor es pequeño y el redondeo pesa más. Error = |real − deseada| / deseada.', q: mcq('PCLK = 16 MHz y 921 600 baudios: BRR = 17 (17,4 redondeado). ¿Error aproximado?', ['≈ 2,1 %: al límite', '≈ 0,2 %', '0 %', '≈ 21 %'], 'Real = 16 MHz / 17 ≈ 941 176 baudios.') }
    ] },
    st_toolchain: { name: 'Cadena arm-none-eabi y archivos de salida', alts: [
      { title: 'Cada herramienta, un trabajo', text: 'gcc compila, ld enlaza, objcopy convierte formatos, size mide y gdb depura. <b>OpenOCD</b> hace de servidor entre gdb y la sonda (ST-LINK).\nFormatos: <b>.elf</b> con símbolos y depuración; <b>.hex</b> con direcciones en texto; <b>.bin</b> solo bytes, sin direcciones (al grabarlo dices dónde: 0x08000000); <b>.map</b>, dónde quedó y cuánto ocupa cada función y variable.', q: mcq('Grabas app.bin con una herramienta. ¿Qué dato extra necesita?', ['La dirección de destino, normalmente 0x08000000', 'La frecuencia del reloj', 'Nada', 'El número de serie'], 'El .bin no lleva direcciones; el .hex y el .elf sí.') },
      { title: 'Sigue un archivo de principio a fin', text: 'main.c → gcc → main.o → ld con el script .ld → <b>app.elf</b> (y app.map). Con app.elf, gdb se conecta a OpenOCD y depura. objcopy saca <b>app.bin</b> o app.hex. Y para grabar en producción:\nSTM32_Programmer_CLI -c port=SWD -w app.bin 0x08000000 -v\n(conecta por SWD, escribe el .bin en esa dirección y verifica).', q: mcq('¿Qué papel tiene OpenOCD?', ['Servidor intermedio entre gdb y la sonda de depuración', 'Compilador', 'Editor de código', 'Sistema operativo'], 'gdb habla con OpenOCD; OpenOCD, con el ST-LINK.') }
    ] },
    st_hal: { name: 'Elegir capa: registros, LL, HAL o Arduino', alts: [
      { title: 'Cuatro alturas', text: '<b>Registros (CMSIS)</b>: control total, código mínimo, poco portable.\n<b>LL</b>: funciones inline casi tan finas como los registros.\n<b>HAL</b>: manejadores, tiempos de espera y callbacks; más código, pero portable entre familias.\n<b>STM32duino</b> (Arduino): prototipos rápidos con bibliotecas de Arduino, con menos control.\nSe pueden mezclar: HAL en general, LL o registros en lo crítico.', q: mcq('Necesitas conmutar un pin en una interrupción de 200 kHz. ¿Qué capa eliges?', ['Registros o LL: mínima sobrecarga', 'HAL con HAL_Delay', 'Arduino digitalWrite', 'Da igual, todas tardan lo mismo'], 'A esas frecuencias cada ciclo cuenta.') },
      { title: 'Qué pagas y qué ganas', text: 'La <b>HAL</b> te da portabilidad (el mismo código vale con pocos cambios en otra familia STM32) y rapidez para escribir, a cambio de más Flash y más ciclos por llamada. <b>LL y registros</b>, lo contrario. <b>Arduino</b>, máxima comodidad y mínimo control: bien para un prototipo, no para aprender el flujo profesional.', q: mcq('¿Qué ventaja real tiene la HAL frente a los registros?', ['Portabilidad entre familias STM32', 'Es siempre más rápida', 'Ocupa menos Flash', 'No necesita relojes'], 'Pagas en tamaño y velocidad.') }
    ] },
    st_sections: { name: 'Secciones .text, .data, .bss y .rodata', alts: [
      { title: 'Dónde acaba cada variable', text: '<b>Código</b> → .text (Flash).\n<b>const global</b> → .rodata (Flash).\nGlobal o static <b>con valor inicial distinto de 0</b> → .data: ocupa Flash (el valor) y RAM (la variable); el arranque la copia.\nGlobal o static <b>sin inicializar o a 0</b> → .bss: solo RAM, y el arranque la pone a 0.\nLas locales normales viven en la pila.', q: mcq('int tabla[100] = {1, 2, 3}; (global). ¿Dónde ocupa sitio?', ['En Flash y en RAM (.data)', 'Solo en RAM (.bss)', 'Solo en Flash', 'En la pila'], 'Los valores iniciales se guardan en Flash y se copian a RAM al arrancar.') },
      { title: 'Cuentas con arm-none-eabi-size', text: 'size da tres números:\n<b>Flash = text + data</b> (el código, las constantes y los valores iniciales).\n<b>RAM estática = data + bss</b> (más la pila y el montón).\nPara ahorrar RAM, declara const las tablas que no cambian: pasan de .data a .rodata y dejan de ocupar RAM.', q: mcq('size da text = 10 000, data = 200, bss = 3000. ¿Flash y RAM estática?', ['Flash 10 200 B · RAM 3200 B', 'Flash 10 000 B · RAM 3000 B', 'Flash 13 200 B · RAM 3000 B', 'Flash 10 000 B · RAM 13 200 B'], '.data cuenta en los dos.') }
    ] },
    /* --- M3 · registros y arranque --- */
    st_reg: { name: 'Máscaras: poner, borrar, invertir y leer bits', alts: [
      { title: 'Las jugadas', text: '<b>reg |= m</b> pone a 1 los bits de m.\n<b>reg &= ~m</b> los pone a 0.\n<b>reg ^= m</b> los invierte.\n<b>reg & m</b> lee si están a 1.\nTodo lo demás queda igual. Nunca asignes con = a un registro compartido: borra los demás bits (en MODER, hasta PA13 y PA14 del SWD). Y escribe 1U, no 1: desplazar un int con signo al bit 31 es comportamiento indefinido.', q: mcq('¿Qué hace GPIOA->ODR &= ~(1U << 5)?', ['Pone a 0 el bit 5 sin tocar los demás', 'Pone a 1 el bit 5', 'Borra todo el registro menos el bit 5', 'Invierte el bit 5'], 'AND con la máscara negada limpia solo ese bit.') },
      { title: 'Bit a bit con números', text: 'x = 1010 0000.\nx |= (1U &lt;&lt; 1) → 1010 0010.\nx &= ~(1U &lt;&lt; 5) → 1000 0010.\nx & (1U &lt;&lt; 7) → distinto de 0: el bit 7 está a 1.\nx = (1U &lt;&lt; 1) → 0000 0010: ¡se pierden todos los demás!\nCon 1U &lt;&lt; 31 obtienes 0x80000000 sin sorpresas.', q: mcq('x = 0x0F. ¿Cuánto vale x & ~(1U << 2)?', ['0x0B', '0x0F', '0x04', '0x0D'], '1111 sin el bit 2 → 1011.') }
    ] },
    st_field: { name: 'Campos de 2 bits en MODER', alts: [
      { title: 'Campos de 2 bits', text: 'En MODER cada pin ocupa <b>2 bits</b>: el pin n empieza en el bit 2n. Para PA5 los bits son 11 y 10, así que el valor se desplaza 2·5 = 10 posiciones, no 5. Antes de escribir, limpia el campo con &= ~(3U &lt;&lt; 2n).', tune: { viz: 'st_reg', params: { pin: { label: 'Pin', val: 5, min: 0, max: 15, step: 1, dec: 0 }, mode: { label: 'Modo (0 ent · 1 sal · 2 AF · 3 anal)', val: 1, list: [0, 1, 2, 3], dec: 0 } } }, q: mcq('¿Cuántas posiciones desplazas el valor de modo de PA7 en MODER?', ['14', '7', '28', '3'], '2 × 7 = 14.') },
      { title: 'Hazlo con números', text: 'PB6 en función alternativa (10 en binario = 2): 2 &lt;&lt; (2 × 6) = 2 &lt;&lt; 12 = 0x2000.\nPA5 como salida (01): 1 &lt;&lt; 10 = 0x400.\nError típico: desplazar n en vez de 2n, o 2n + 1. Otro: olvidar limpiar el campo y mezclar el modo viejo con el nuevo.', q: mcq('PC3 en modo analógico (11). ¿Valor del campo ya desplazado?', ['0x000000C0', '0x00000018', '0x00000003', '0x00000030'], '3 << 6 = 0xC0.') }
    ] },
    st_rccen: { name: 'Habilitar el reloj de un periférico', alts: [
      { title: 'Cada periférico, su grifo', text: 'Tras el reset casi todos los relojes de periférico están <b>cerrados para ahorrar energía</b>: solo gasta lo que enciendes. Si configuras GPIOA sin abrir su grifo en RCC->AHB1ENR, las escrituras no tienen efecto y lees ceros. Es el error número uno al programar con registros.\nCada bus tiene su registro: AHB1ENR (GPIO, DMA), APB1ENR (USART2, TIM2…) y APB2ENR (USART1, SYSCFG…).', q: mcq('Escribes en GPIOB->MODER y al leerlo sigue a 0. ¿Causa más probable?', ['No habilitaste el reloj de GPIOB en RCC', 'El pin está roto', 'MODER es de solo lectura', 'Falta HAL_Delay'], 'Sin reloj, el periférico no responde.') },
      { title: 'El reloj que se olvida', text: 'RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN abre el reloj de GPIOA. Pero hay periféricos “de apoyo” que también lo necesitan: para EXTI por registros hay que abrir <b>SYSCFG</b> (en APB2ENR), porque EXTICR está ahí. La HAL lo hace en HAL_MspInit; con registros, es cosa tuya.\n¿Por qué apagados de fábrica? Cada periférico con reloj consume aunque no lo uses.', q: mcq('¿Qué hace RCC->AHB1ENR |= RCC_AHB1ENR_GPIOCEN?', ['Habilita el reloj del puerto GPIOC', 'Pone PC0 a 1', 'Resetea GPIOC', 'Configura GPIOC como salida'], 'Abre el grifo del reloj de ese puerto.') }
    ] },
    st_docs: { name: 'Qué documento consultar', alts: [
      { title: 'Cuatro libros', text: '<b>Manual de referencia</b> (RM): cada registro de cada periférico, bit a bit.\n<b>Hoja de datos</b>: patillaje, tabla de funciones alternativas y límites eléctricos de ese chip.\n<b>Hoja de erratas</b>: fallos conocidos del silicio y cómo esquivarlos.\n<b>Manual de programación</b> (PM0214 para el M4): el núcleo y sus instrucciones.', q: mcq('¿Dónde buscas qué función alternativa lleva PA9 a USART1_TX?', ['En la hoja de datos', 'En el manual de referencia', 'En la hoja de erratas', 'En el manual de programación'], 'La tabla de funciones alternativas es de cada chip concreto.') },
      { title: 'Pregunta y documento', text: '¿Qué hace el bit 13 de USART_CR1? → manual de referencia.\n¿Cuánta corriente aguanta un pin? ¿Qué AF tiene PB6? → hoja de datos.\n¿Por qué el I²C se cuelga aunque mi código esté bien? → hoja de erratas.\n¿Cuántos ciclos tarda una instrucción del M4? → manual de programación.', q: mcq('¿Dónde miras la corriente máxima de un pin?', ['En la hoja de datos', 'En el manual de referencia', 'En la hoja de erratas', 'En el manual de programación'], 'Los límites eléctricos son de la hoja de datos.') }
    ] },
    st_halstatus: { name: 'Estados de la HAL y comprobación de errores', alts: [
      { title: 'Cuatro respuestas', text: 'Casi todas las funciones HAL devuelven un HAL_StatusTypeDef:\n<b>HAL_OK</b>: todo bien. <b>HAL_ERROR</b>: error del periférico o de parámetros. <b>HAL_BUSY</b>: ocupado con otra operación. <b>HAL_TIMEOUT</b>: se agotó el tiempo de espera.\nCompruébalo siempre y reacciona (reintenta, avisa). En desarrollo, <b>USE_FULL_ASSERT</b> además valida los parámetros y llama a assert_failed si uno es inválido.', q: mcq('HAL_I2C_Master_Transmit devuelve HAL_BUSY. ¿Qué significa?', ['El periférico está ocupado con otra operación', 'Todo ha ido bien', 'Se agotó el tiempo', 'Un parámetro es inválido'], 'Espera a que termine la anterior.') },
      { title: 'Errores que se ven pronto', text: 'Si ignoras lo que devuelve la HAL, un sensor desconectado se convierte en datos absurdos o un cuelgue raro lejos de la causa. Con if (… != HAL_OK) y con USE_FULL_ASSERT durante el desarrollo, el error salta donde ocurre.\nEn producción, quita USE_FULL_ASSERT (ocupa espacio) pero sigue comprobando los retornos.', q: mcq('¿Para qué sirve USE_FULL_ASSERT en la HAL?', ['Comprueba los parámetros de las funciones HAL y llama a assert_failed si uno es inválido', 'Acelera la HAL', 'Activa el watchdog', 'Desactiva las interrupciones'], 'Úsalo en desarrollo.') }
    ] },
    st_halcb: { name: 'Modos _IT y callbacks de la HAL', alts: [
      { title: 'Encargar y que te avisen', text: 'En <b>sondeo</b> la función espera hasta terminar. Con <b>_IT</b> o <b>_DMA</b> devuelve al instante y la HAL llama a un <b>callback</b> cuando acaba. Por eso el búfer debe seguir vivo hasta el callback: static o global, nunca local.\nLos callbacks están declarados <b>__weak</b>: escribes una función con el mismo nombre y el enlazador usa la tuya. Uno mismo vale para todas las instancias: dentro compruebas cuál ha sido.', q: mcq('Envías con HAL_UART_Transmit_IT un búfer local de la función. ¿Qué falla?', ['El búfer desaparece al salir de la función mientras la UART sigue enviándolo', 'Nada', 'Falta el tiempo de espera', 'HAL_UART_Transmit_IT no existe'], 'Con _IT y _DMA, el búfer debe vivir hasta el callback.') },
      { title: 'Un callback para todos', text: 'HAL_TIM_PeriodElapsedCallback lo llaman <b>todos</b> los temporizadores (incluida la base de tiempo de la HAL si usas FreeRTOS): compruebas htim->Instance. HAL_GPIO_EXTI_Callback lo llaman todas las líneas EXTI: compruebas el pin.\nHAL_TIM_Base_Start_IT(&htim6) arranca TIM6 con su interrupción de actualización y la HAL llama al callback en cada desbordamiento. Para redefinir un callback basta con escribirlo: la versión de la HAL es __weak.', q: mcq('¿Por qué se comprueba htim->Instance en HAL_TIM_PeriodElapsedCallback?', ['Porque el mismo callback lo llaman todos los temporizadores', 'Para borrar la bandera', 'Para cambiar ARR', 'No hace falta'], 'Una sola función recibe todos los avisos.') }
    ] },
    st_boot: { name: 'Del reset a main: tabla de vectores', alts: [
      { title: 'La primera página del libro', text: 'Al salir de reset, el núcleo lee las dos primeras palabras de la tabla de vectores: la <b>primera</b> es el valor inicial del puntero de pila (MSP), normalmente el final de la SRAM; la <b>segunda</b>, la dirección de Reset_Handler, con el bit 0 a 1 (modo Thumb).\nReset_Handler llama a SystemInit, copia .data a la RAM, pone .bss a cero y llama a main; ya en main, SystemClock_Config configura el PLL.', q: mcq('¿Qué contiene la primera palabra de la tabla de vectores?', ['El valor inicial del puntero de pila', 'La dirección de main', 'La primera instrucción', 'La frecuencia del reloj'], 'Después viene la dirección de Reset_Handler.') },
      { title: 'Leer la tabla con números', text: 'Lees 0x08000000 y ves 0x20020000, 0x080001A9:\n· 0x20020000 es el final de 128 KB de SRAM: la pila empieza ahí y crece hacia abajo.\n· Reset_Handler está en 0x080001A8; el 1 del final marca modo <b>Thumb</b>, obligatorio en los Cortex-M.\nOrden completo: MSP → Reset_Handler → SystemInit → .data y .bss → main → SystemClock_Config.', q: mcq('La segunda palabra de la tabla vale 0x08000235. ¿Dónde está Reset_Handler?', ['En 0x08000234; el bit 0 indica Thumb', 'En 0x08000235', 'En 0x08000236', 'En 0x20000235'], 'El bit 0 no forma parte de la dirección.') }
    ] },
    st_hsi: { name: 'Arranque y despertar con el HSI', alts: [
      { title: 'El HSI siempre está a mano', text: 'Tras el reset, una F4 funciona con el <b>HSI de 16 MHz</b> hasta que SystemClock_Config (ya dentro de main) arranca el HSE y el PLL.\nAl despertar de <b>Stop</b> pasa lo mismo: el sistema vuelve con el HSI. Si no llamas de nuevo a SystemClock_Config, todo va más lento: la UART da basura y los tiempos se alargan.', q: mcq('Tras despertar de Stop, la UART escupe basura. ¿Qué falta?', ['Reconfigurar el reloj (PLL) al despertar', 'Recalibrar el ADC', 'Borrar la Flash', 'Cambiar el cable'], 'El reloj de sistema vuelve al HSI.') },
      { title: 'Con números', text: 'Tu F411 está configurada para 100 MHz, pero hasta SystemClock_Config va a 16 MHz: un bucle de espera calibrado para 100 MHz tarda 6,25 veces más, y una UART calculada para un PCLK de 50 MHz sale 3,125 veces más lenta.\nAl salir de Stop vuelve a pasar: 16 MHz de HSI hasta que reconfiguras.', q: mcq('En la primera línea de main de una F411, ¿a qué frecuencia va?', ['16 MHz, con el HSI', '100 MHz', '25 MHz, con el HSE', '32 kHz'], 'El PLL se configura después, en SystemClock_Config.') }
    ] },
    st_irqsetup: { name: 'Activar una interrupción y borrar su bandera', alts: [
      { title: 'Cuatro piezas', text: 'Para que una interrupción funcione:\n1) Actívala <b>en el periférico</b> (por ejemplo RXNEIE en USART2->CR1).\n2) Actívala <b>en el NVIC</b> con su prioridad (HAL_NVIC_SetPriority y HAL_NVIC_EnableIRQ).\n3) Escribe el manejador con el <b>nombre exacto</b> de la tabla de vectores: si no coincide, se ejecuta Default_Handler, un bucle infinito.\n4) Dentro, <b>borra la bandera</b>, o volverá a entrar sin fin.', q: mcq('Escribes USART2_IRQhandler (con h minúscula). ¿Qué pasa al llegar la interrupción?', ['Se ejecuta Default_Handler, un bucle infinito', 'Funciona igual', 'Error de compilación', 'Se ignora la interrupción'], 'Los nombres deben coincidir letra a letra.') },
      { title: 'La bandera que no se borra', text: 'Si sales del manejador con la bandera activa, el NVIC ve la interrupción pendiente y vuelve a entrar sin parar: main no avanza.\nCada bandera se borra a su manera: RXNE <b>leyendo</b> DR; la de EXTI <b>escribiendo un 1</b> en su bit de EXTI->PR (“escribe 1 para borrar”). Y recuerda las otras piezas: activar en el periférico, en el NVIC y nombre exacto del manejador.', q: mcq('¿Cómo se borra la bandera pendiente de la línea 5 en EXTI->PR?', ['Escribiendo un 1 en el bit 5', 'Escribiendo un 0 en el bit 5', 'Se borra sola', 'Leyendo GPIOx->IDR'], 'Bandera de tipo “escribe 1 para borrar”.') }
    ] },
    st_linker: { name: 'Script del enlazador: regiones de memoria', alts: [
      { title: 'El mapa para el enlazador', text: 'El bloque <b>MEMORY</b> del .ld dice dónde empieza (ORIGIN) y cuánto mide (LENGTH) cada memoria. Si el programa no cabe, el enlazador da un error de región desbordada: mejor al compilar que en el campo.\nPara reservar el último sector de Flash para datos, <b>reduce LENGTH</b> y así el programa nunca podrá ocuparlo. Los tamaños mínimos de pila y montón van en hexadecimal: 0x400 = 1024 bytes.', q: mcq('Reservas los últimos 128 KB de una Flash de 512 KB para datos. ¿Qué LENGTH pones a FLASH?', ['384K', '512K', '128K', '640K'], '512 − 128 = 384.') },
      { title: 'Números en hexadecimal', text: 'En el .ld verás tamaños como _Min_Stack_Size = 0x400. Pásalo a decimal: 0x400 = 4 × 256 = <b>1024</b> bytes; 0x800 = 2048; 0x2000 = 8192.\nOjo: el enlazador solo comprueba que todo <b>quepa</b> en las regiones de MEMORY; no vigila la pila en ejecución. Si quieres que el programa no use una zona (por ejemplo un sector para datos), quítala de LENGTH.', q: mcq('_Min_Heap_Size = 0x200. ¿Cuántos bytes son?', ['512', '200', '2048', '256'], '2 × 256 = 512.') }
    ] },
    st_dmamem: { name: 'Memorias que ve el DMA (CCM y caché)', alts: [
      { title: 'No todo está en el camino del DMA', text: 'La <b>CCM RAM</b> de la F407 o la F303 está conectada solo al núcleo: muy rápida para pila o cálculo, pero <b>el DMA no puede acceder a ella</b>.\nEn chips con <b>caché de datos</b> (F7, H7), el DMA escribe en la RAM sin pasar por la caché: la CPU puede seguir leyendo una copia vieja. Antes de leer lo que dejó el DMA, invalida la caché de ese búfer o ponlo en una zona no cacheable.', q: mcq('Pones un búfer de DMA en la CCM de una F407. ¿Qué pasa?', ['El DMA no puede acceder a la CCM', 'Funciona más rápido', 'Se borra en cada interrupción', 'Nada especial'], 'Los búferes de DMA van en la SRAM normal.') },
      { title: 'La caché que miente', text: 'En un H7, el DMA llena un búfer en la RAM, pero la CPU lee de su <b>caché</b>, que guarda una copia anterior: ve datos viejos. Solución: invalidar la caché de esa zona (SCB_InvalidateDCache_by_Addr) antes de leer, o usar una región no cacheable configurada con la MPU.\nY en la F4 con CCM: el DMA no la ve en absoluto.', q: mcq('En un H7, la CPU lee un búfer que acaba de llenar el DMA y ve datos viejos. ¿Por qué?', ['La caché guarda una copia antigua: hay que invalidarla o usar memoria no cacheable', 'El DMA está roto', 'Falta volatile', 'La Flash es lenta'], 'El DMA no actualiza la caché de la CPU.') }
    ] },
    /* --- M4 · relojes y GPIO --- */
    st_clksrc: { name: 'Fuentes de reloj: HSI, HSE, LSI y LSE', alts: [
      { title: 'Cuatro relojes', text: '<b>HSI</b>: RC interno de 16 MHz (±1 %), arranca al instante.\n<b>HSE</b>: cristal u oscilador externo (4–26 MHz en la F4), preciso. En modo <b>bypass</b> entra una señal ya hecha por OSC_IN, sin cristal. Hay que esperar a HSERDY antes de usarlo, y el <b>CSS</b> conmuta al HSI si falla.\n<b>LSI</b>: RC de unos 32 kHz, muy impreciso: para el watchdog, no para la hora.\n<b>LSE</b>: cristal de 32,768 kHz para el RTC.', q: mcq('Para un reloj de pulsera preciso, ¿con qué fuente funciona el RTC?', ['LSE', 'LSI', 'HSI', 'PLL'], 'El LSI varía mucho entre chips y con la temperatura.') },
      { title: 'Cada uno con su defecto', text: 'HSI: rápido de arrancar, pero deriva. HSE: preciso, pero <b>tarda en arrancar</b> (por eso while (!(RCC->CR & RCC_CR_HSERDY)) {}) y puede fallar: el Clock Security System pasa al HSI y avisa con una NMI. Bypass: sin cristal, con un reloj externo (como el de 8 MHz del ST-LINK de las Nucleo). LSI: barato pero puede ir de unos 17 a 47 kHz. LSE: preciso y de bajo consumo.', q: mcq('¿Qué hace este bucle: while (!(RCC->CR & RCC_CR_HSERDY)) {}?', ['Espera a que el HSE arranque y se estabilice', 'Apaga el HSE', 'Mide la frecuencia', 'Reinicia el chip'], 'Un cristal tarda en arrancar.') }
    ] },
    st_32k: { name: 'Cristal de 32 768 Hz y cuentas del RTC', alts: [
      { title: 'Una potencia de 2', text: '32 768 = <b>2¹⁵</b>: dividiendo 15 veces entre 2 sale exactamente 1 Hz, con un contador binario sencillo.\nEn el RTC, el temporizador de despertar cuenta, por ejemplo, LSE ÷16 = 2048 Hz. Para 5 s: 5 × 2048 = 10 240 cuentas, y el registro se carga con <b>cuentas − 1</b> = 10 239.', q: mcq('Con LSE ÷16 (2048 Hz), ¿qué valor cargas para despertar cada 2 s?', ['4095', '4096', '2047', '32 767'], '2 × 2048 = 4096 cuentas → 4095.') },
      { title: 'Contar cuentas', text: 'Para cualquier contador de tiempo: <b>cuentas = tiempo × frecuencia</b>. Muchos registros piden cuentas − 1 porque también cuentan el 0.\nCon ÷8 (4096 Hz), 1 s son 4096 cuentas → 4095. ¿Y por qué 32 768 Hz? Porque es 2¹⁵: 15 divisiones entre 2 dan 1 Hz justo.', q: mcq('¿Cuántas veces hay que dividir 32 768 Hz entre 2 para obtener 1 Hz?', ['15', '16', '8', '32'], '2¹⁵ = 32 768.') }
    ] },
    st_usbclk: { name: 'Reloj de 48 MHz para el USB', alts: [
      { title: 'El USB es exigente', text: 'El USB de velocidad completa necesita <b>48 MHz exactos y precisos</b> (mucho mejor que el ±1 % del HSI). Por eso se usa el HSE, o en algunas familias un oscilador interno de 48 MHz corregido con las tramas del propio USB.\nEn la F4, los 48 MHz salen del VCO del PLL dividido entre <b>Q</b>: el VCO debe ser múltiplo de 48.', q: mcq('VCO = 336 MHz. ¿Qué Q da 48 MHz para el USB?', ['7', '8', '6', '48'], '336 / 48 = 7.') },
      { title: 'Por qué la Black Pill va a 96 MHz', text: 'Con HSE de 25 MHz, M = 25 y N = 192: VCO = 192 MHz → P = 2 da 96 MHz de SYSCLK y Q = 4 da 48 MHz para el USB.\nA 100 MHz, el VCO tendría que ser 200 o 400 MHz y ninguno es múltiplo de 48: no hay Q entero. El USB pide exactitud y precisión, no “casi 48”.', q: mcq('VCO = 200 MHz. ¿Puedes sacar 48 MHz exactos para el USB?', ['No: 200 / 48 no es entero', 'Sí, con Q = 4', 'Sí, con Q = 5', 'Sí, el USB acepta 50 MHz'], 'Q debe ser entero.') }
    ] },
    st_clock: { name: 'El PLL: SYSCLK = fent·N/(M·P)', alts: [
      { title: 'Divide, multiplica, divide', text: 'El PLL de la F4 hace tres pasos: <b>÷M</b> deja la entrada del VCO en 1–2 MHz, <b>×N</b> sube al VCO (100–432 MHz) y <b>÷P</b> (2, 4, 6 u 8) da SYSCLK. Fórmula: <b>SYSCLK = fent × N / (M × P)</b>.\nRespeta los límites del chip (100 MHz en la F411): fuera de especificación “parece que funciona” hasta que cambian la temperatura o la tensión.', tune: { viz: 'st_clock', params: { HSE: { label: 'HSE', val: 25, list: [8, 12, 16, 25], unit: 'MHz', dec: 0 }, M: { label: 'M', val: 25, min: 2, max: 63, step: 1, dec: 0 }, N: { label: 'N', val: 192, min: 50, max: 432, step: 2, dec: 0 }, P: { label: 'P', val: 2, list: [2, 4, 6, 8], dec: 0 }, A1: { label: 'APB1 ÷', val: 2, list: [1, 2, 4, 8, 16], dec: 0 }, A2: { label: 'APB2 ÷', val: 1, list: [1, 2, 4, 8, 16], dec: 0 } } }, q: mcq('HSE 8 MHz, M = 8, N = 336, P = 2. ¿SYSCLK?', ['168 MHz', '336 MHz', '84 MHz', '42 MHz'], '8 / 8 × 336 / 2 = 168.') },
      { title: 'Paso a paso con la Black Pill', text: 'HSE 25 MHz → ÷25 = <b>1 MHz</b> (entrada del VCO, dentro de 1–2) → ×192 = <b>192 MHz</b> (VCO, dentro de 100–432) → ÷2 = <b>96 MHz</b> (SYSCLK, bajo el máximo de 100).\nComprueba cada etapa con su límite. La F1 tiene un PLL más sencillo: solo multiplica (8 MHz × 9 = 72 MHz).', q: mcq('HSE 25 MHz, M = 25, N = 200, P = 2. ¿SYSCLK?', ['100 MHz', '200 MHz', '50 MHz', '125 MHz'], '1 MHz × 200 / 2.') }
    ] },
    st_apb: { name: 'Buses APB y reloj de los temporizadores', alts: [
      { title: 'El árbol de buses', text: 'SYSCLK alimenta el <b>AHB</b> (núcleo, DMA y GPIO en la F4). De él cuelgan <b>APB1</b> (lento: USART2, TIM2–5, I²C) y <b>APB2</b> (rápido: USART1, TIM1, ADC, SPI1, SYSCFG). En la F411 los máximos son 100, 50 y 100 MHz.\nTruco de los temporizadores: si el preescalador de su APB es 1, reciben PCLK; si es mayor que 1, reciben <b>el doble de PCLK</b>.', q: mcq('F407 a 168 MHz con APB1 ÷4. ¿A qué frecuencia cuenta TIM2?', ['84 MHz', '42 MHz', '168 MHz', '21 MHz'], 'PCLK1 = 42 MHz y, como ÷4 ≠ 1, el temporizador recibe 84 MHz.') },
      { title: 'El error típico', text: 'Con la F411 a 100 MHz y APB1 ÷2, PCLK1 = 50 MHz… pero TIM2 cuenta a <b>100 MHz</b>. Si calculas PSC y ARR con 50 MHz, tu PWM sale al doble de frecuencia.\nPara cualquier periférico: busca primero en qué bus está (USART2 y TIM3 en APB1, USART1 y TIM1 en APB2) y luego si es temporizador (×2 cuando el preescalador APB no es 1).', q: mcq('APB2 ÷1 a 100 MHz. ¿Reloj de TIM1?', ['100 MHz', '200 MHz', '50 MHz', '25 MHz'], 'Con ÷1 no se duplica.') }
    ] },
    st_waitst: { name: 'Wait states de la Flash', alts: [
      { title: 'La Flash no da abasto', text: 'La Flash tarda decenas de nanosegundos en dar un dato: a frecuencias altas la CPU debe esperar unos ciclos (<b>wait states</b>, LATENCY en FLASH->ACR). El acelerador ART de la F4 esconde casi toda esa espera.\nSin suficientes wait states la CPU lee instrucciones mal: cuelgue o HardFault. Orden: al subir la frecuencia, <b>primero</b> los wait states; al bajarla, <b>primero</b> la frecuencia y después los wait states.', q: mcq('Vas de 100 MHz a 16 MHz. ¿En qué orden?', ['Primero bajas la frecuencia y luego los wait states', 'Primero bajas los wait states', 'Da igual', 'No hace falta tocarlos'], 'Nunca debe haber menos wait states de los que pide la frecuencia actual.') },
      { title: 'Zapatos antes de correr', text: 'Piensa en los wait states como en ponerte las zapatillas: antes de echar a correr (subir SYSCLK) te las pones; al parar, te las quitas después.\nSi corres descalzo (más MHz con pocos wait states), la CPU tropieza: lee instrucciones a medias y el programa se cuelga. CubeMX ajusta FLASH_LATENCY por ti; con registros, es tu responsabilidad.', q: mcq('Subes SYSCLK sin aumentar los wait states. ¿Qué pasa?', ['La CPU lee instrucciones mal y el programa se cuelga o da HardFault', 'Va más rápido', 'La Flash se borra', 'Nada'], 'La Flash no llega a tiempo.') }
    ] },
    st_gpio: { name: 'Modos de un pin y registros de GPIO', alts: [
      { title: 'Cuatro trabajos para un pin', text: 'MODER da a cada pin un modo: <b>00 entrada</b>, <b>01 salida</b>, <b>10 función alternativa</b> (lo maneja un periférico, como el TX de una UART) y <b>11 analógico</b> (ADC o DAC, sin el disparador digital).\nEl buffer de entrada sigue activo en modo alternativo: IDR muestra el nivel real de un pin RX. Y <b>LCKR</b> puede bloquear la configuración de un pin hasta el siguiente reset.', q: mcq('PA2 debe ser el TX de USART2. ¿Qué modo le pones?', ['Función alternativa (AF7)', 'Salida push-pull', 'Analógico', 'Entrada con pull-up'], 'El periférico controla el pin a través de la AF.') },
      { title: 'Un registro para cada cosa', text: '<b>MODER</b>: modo (2 bits por pin). <b>OTYPER</b>: push-pull u open-drain. <b>OSPEEDR</b>: velocidad de flancos. <b>PUPDR</b>: pull-up o pull-down. <b>IDR</b>: leer el nivel (también en modo alternativo). <b>ODR</b> y <b>BSRR</b>: escribir. <b>AFR</b>: qué función alternativa. <b>LCKR</b>: congelar la configuración hasta el reset.', q: mcq('¿Qué registro protege la configuración de un pin hasta el siguiente reset?', ['LCKR', 'BSRR', 'OTYPER', 'IDR'], 'Evita cambios accidentales en pines críticos.') }
    ] },
    st_od: { name: 'Push-pull, open-drain y pull-ups', alts: [
      { title: 'Empujar o solo tirar', text: '<b>Push-pull</b>: el pin empuja a 3,3 V y tira a 0 V.\n<b>Open-drain</b>: solo tira a 0 V; el 1 lo pone una resistencia <b>pull-up</b>. Así varios dispositivos comparten una línea sin cortocircuitos: cualquiera puede bajarla, como en I²C o en una línea de alarma común.\nLas pull-up internas son de unos <b>40 kΩ</b>: valen para un pulsador, pero son débiles para un bus rápido.', q: mcq('¿Por qué I²C usa salidas open-drain?', ['Para que varios dispositivos compartan la línea sin cortocircuitarse', 'Porque es más rápido', 'Para dar más corriente', 'Para medir tensión'], 'Si uno tira a 0 y otro empuja a 1 habría un corto.') },
      { title: 'Lo que tarda en subir', text: 'Con open-drain, la línea sube cargando la capacidad del bus a través de la pull-up: τ = R · C. Con 40 kΩ (interna) y 100 pF, τ = 4 µs; un bit a 400 kHz dura 2,5 µs: no da tiempo. Con 2,2 kΩ, τ = 0,22 µs.\nPor eso: open-drain para compartir líneas, y pull-ups externas de 2,2–4,7 kΩ para I²C rápido.', q: mcq('Varias placas comparten una línea de “alarma” activa a nivel bajo. ¿Cómo configuras sus pines?', ['Open-drain con una pull-up común', 'Push-pull en todas', 'Analógico', 'Entrada sin pull'], 'Cualquiera puede tirar a 0 sin pelearse con las demás.') }
    ] },
    st_leak: { name: 'Consumo de la placa en reposo', alts: [
      { title: 'Lo que no se ve también gasta', text: 'Dormir el chip no basta. Gastan aunque el STM32 duerma: el <b>LED de encendido</b>, un <b>regulador</b> con mucho consumo propio, las <b>pull-ups</b> por las que circula corriente, sensores siempre alimentados y los <b>pines flotantes</b>: una entrada digital al aire oscila y consume. Por eso los pines sin usar se dejan en <b>modo analógico</b>.', q: mcq('Tu nodo en Stop consume mucho más de lo esperado. ¿Qué revisas primero en la placa?', ['LED de encendido, regulador, pull-ups y pines flotantes', 'El tamaño de la Flash', 'La versión de CubeIDE', 'La velocidad de la UART'], 'A menudo la placa gasta más que el chip.') },
      { title: 'Pines al aire', text: 'Una entrada digital sin conectar flota a media tensión: su disparador Schmitt conmuta sin parar y consume. En <b>modo analógico</b> ese disparador se desconecta y el pin deja de gastar (CubeMX tiene una opción para ponerlo en todos los pines libres).\nDespués, haz la lista de todo lo que hay en la placa (LED, regulador, pull-ups, módulos) y mide la corriente total.', q: mcq('¿Por qué conviene poner en modo analógico los pines sin usar?', ['Se desconecta el disparador digital y se reduce el consumo', 'Para medirlos después', 'Para que sean tolerantes a 5 V', 'Para que hagan de pull-up'], 'Una entrada al aire puede oscilar y consumir.') }
    ] },
    st_af: { name: 'Funciones alternativas (AFR)', alts: [
      { title: '4 bits por pin', text: 'Con MODER = 10, el número de función <b>AF0–AF15</b> se elige en <b>AFR[0]</b> (pines 0–7) o <b>AFR[1]</b> (pines 8–15), con 4 bits por pin. El campo del pin n empieza en el bit 4 × (n mod 8).\nTípicas en la F4: AF1 TIM1/TIM2 · AF2 TIM3–5 · AF4 I²C · AF5 SPI1/SPI2 · AF7 USART1/USART2. La tabla exacta de cada pin está en la hoja de datos.', q: mcq('PA10 como RX de USART1 (AF7). ¿Registro y bits?', ['AFR[1], bits 8 a 11', 'AFR[0], bits 40 a 43', 'AFR[1], bits 10 a 13', 'AFR[0], bits 8 a 11'], 'PA10 es el pin 2 dentro de AFR[1]: 2 × 4 = 8.') },
      { title: 'Con números', text: 'PA2 con AF7 (TX de USART2): el campo empieza en el bit 4 × 2 = 8, así que 7 &lt;&lt; 8 = 0x700 = 1792.\nPA9 con AF7: va en AFR[1] porque 9 ≥ 8; dentro es el pin 1 → bits 4 a 7.\nAntes de escribir con |=, limpia el campo con &= ~(0xFU &lt;&lt; desplazamiento).', q: mcq('PB6 como I2C1_SCL (AF4). ¿Valor del campo ya desplazado en AFR[0]?', ['0x04000000', '0x00000400', '0x00000024', '0x00400000'], '4 << (4 × 6) = 4 << 24.') }
    ] },
    /* --- M5 · interrupciones y temporizadores --- */
    st_irq: { name: 'Cómo entra una interrupción', alts: [
      { title: 'El hardware hace la mochila', text: 'Al entrar en una excepción, el núcleo guarda solo en la pila 8 registros: R0–R3, R12, LR, PC y xPSR. Son los que una función de C puede machacar, así que un manejador es una <b>función normal de C</b> (unos 12 ciclos de entrada en un M3 o M4).\nLas excepciones 1–15 son del sistema (Reset, NMI, HardFault, SVCall, PendSV, SysTick); desde la 16, las IRQ de los periféricos. Si al acabar una hay otra pendiente, el <b>encadenamiento</b> salta a ella sin desapilar y volver a apilar.', q: mcq('¿Por qué un manejador de interrupción de un Cortex-M puede ser una función de C normal?', ['El hardware guarda los registros que C puede machacar', 'Porque el compilador lo convierte', 'Porque la HAL lo envuelve', 'Porque no hay interrupciones anidadas'], 'Fue una decisión de diseño de ARM.') },
      { title: 'Ráfagas de interrupciones', text: 'Dos interrupciones seguidas sin encadenamiento: apilar → A → desapilar → apilar → B → desapilar. Con <b>encadenamiento</b> (tail-chaining): apilar → A → B → desapilar. Se ahorra el desapilar y volver a apilar.\nPapeles de las excepciones del sistema: Reset arranca el programa, HardFault avisa de un error grave, SysTick es el temporizador del sistema y PendSV es la que usa un RTOS para cambiar de tarea.', q: mcq('¿Qué excepción usa un RTOS para cambiar de tarea?', ['PendSV', 'HardFault', 'Reset', 'NMI'], 'Tiene la prioridad más baja.') }
    ] },
    st_nvic: { name: 'Prioridades del NVIC', alts: [
      { title: 'Número bajo, más urgente', text: 'En el NVIC, <b>0 es la prioridad más alta</b>. Una interrupción solo interrumpe a otra si su prioridad de expropiación es numéricamente <b>menor</b>. Con la misma prioridad, espera su turno.\nPor eso un RTOS pone PendSV en la más baja: nunca interrumpe a una interrupción de periférico; el cambio de tarea espera a que todas terminen.', tune: { viz: 'st_nvic', params: { pA: { label: 'Prioridad TIM2', val: 5, min: 0, max: 15, step: 1, dec: 0 }, pB: { label: 'Prioridad USART2', val: 8, min: 0, max: 15, step: 1, dec: 0 } } }, q: mcq('TIM2 tiene prioridad 5 y USART2 prioridad 2. Llega USART2 mientras se atiende TIM2…', ['USART2 interrumpe a TIM2', 'USART2 espera a que acabe TIM2', 'Se pierde USART2', 'Se reinicia el chip'], '2 es más urgente que 5.') },
      { title: 'Expropiar o desempatar', text: 'Cada prioridad tiene dos partes. La de <b>expropiación</b> decide quién interrumpe a quién: solo un número menor interrumpe; igual o mayor, espera. La <b>subprioridad</b> nunca interrumpe: solo decide quién va primero cuando dos con la misma expropiación están pendientes a la vez.\nLa HAL usa por defecto el grupo 4: 16 niveles de expropiación y ninguna subprioridad.', q: mcq('Dos interrupciones con expropiación 3 y subprioridades 0 y 1. ¿Puede la de subprioridad 0 interrumpir a la otra?', ['No: la subprioridad solo ordena las pendientes', 'Sí, siempre', 'Solo si es un temporizador', 'Sí, si la otra tarda mucho'], 'Para interrumpir hace falta menor prioridad de expropiación.') }
    ] },
    st_shared: { name: 'Datos compartidos y secciones críticas', alts: [
      { title: 'Tres pasos interrumpibles', text: '<b>contador++</b> es leer, sumar y escribir. Si una interrupción que también lo incrementa entra en medio, main escribe un valor viejo y se pierde un incremento.\nSolo las lecturas y escrituras alineadas de hasta 32 bits son atómicas: un uint64_t son dos accesos y puedes leer una mitad vieja y otra nueva.\nSolución: una <b>sección crítica</b> muy corta que guarde y restaure PRIMASK.', q: mcq('main hace contador++ y una interrupción también. ¿Qué puede pasar?', ['Perder incrementos si la interrupción llega entre la lectura y la escritura de main', 'Nada: ++ es atómico', 'Que contador se vuelva negativo siempre', 'Un error de compilación'], 'Protege el ++ de main con una sección crítica.') },
      { title: 'Lo mínimo posible', text: 'Patrón seguro:\np = __get_PRIMASK(); __disable_irq(); /* copiar o modificar */ __set_PRIMASK(p);\nRestaurar PRIMASK (en vez de __enable_irq) no reactiva las interrupciones si ya estaban desactivadas al entrar.\nMientras dura, <b>ninguna interrupción se atiende</b>: cada microsegundo se suma al retardo de todas. Dentro, solo copiar o actualizar el dato compartido (un uint64_t, un contador) y salir.', q: mcq('¿Por qué restaurar PRIMASK en vez de llamar a __enable_irq() al final?', ['Para no activar las interrupciones si ya estaban desactivadas al entrar', 'Porque es más rápido', 'Porque __enable_irq no existe', 'Para cambiar la prioridad'], 'Así la función se puede llamar desde cualquier sitio.') }
    ] },
    st_exti: { name: 'Líneas EXTI y sus manejadores', alts: [
      { title: 'Una línea por número de pin', text: 'El EXTI tiene 16 líneas para GPIO, una por <b>número</b> de pin: PA3, PB3 y PC3 comparten la línea 3, y SYSCFG->EXTICR elige qué puerto la usa. Por eso no puedes tener interrupciones independientes en dos pines con el mismo número.\nManejadores: las líneas 0 a 4 tienen el suyo; las 5–9 comparten <b>EXTI9_5_IRQHandler</b> y las 10–15, <b>EXTI15_10_IRQHandler</b>.', q: mcq('¿Qué manejador atiende una interrupción en PB12?', ['EXTI15_10_IRQHandler', 'EXTI12_IRQHandler', 'EXTI9_5_IRQHandler', 'EXTI2_IRQHandler'], 'Las líneas 10–15 comparten manejador.') },
      { title: 'Reparte los números', text: 'Al asignar pines piensa en números, no en puertos: un botón en PA0 y otro en PB0 no pueden tener interrupciones independientes (los dos son la línea 0). Elige PA0 y PB1, por ejemplo.\nY recuerda los manejadores compartidos: PC7 y PB9 entran los dos por EXTI9_5_IRQHandler; dentro hay que mirar qué línea saltó.', q: mcq('¿Puedes tener interrupciones independientes en PA5 y PC5 a la vez?', ['No: los dos usan la línea EXTI5', 'Sí, sin problema', 'Solo con la HAL', 'Solo si uno es de subida y otro de bajada'], 'Solo un puerto puede estar conectado a cada línea.') }
    ] },
    st_debounce: { name: 'Rebotes con interrupciones', alts: [
      { title: 'Una pelota que bota', text: 'Al pulsar, las láminas del botón chocan y rebotan durante unos milisegundos. Con EXTI, cada rebote es un flanco y cada flanco una interrupción: una pulsación se convierte en cinco.\nSoluciones: <b>ignorar</b> nuevas interrupciones durante unos 20 ms tras la primera, o filtrar con una red RC antes del pin.', q: mcq('Un pulsador con EXTI cuenta de 3 a 6 pulsaciones por cada una. ¿Qué haces?', ['Ignorar las interrupciones durante unos 20 ms tras la primera', 'Subir la prioridad', 'Cambiar a flanco de bajada', 'Quitar la pull-up'], 'Son los rebotes del contacto.') },
      { title: 'Con el reloj en la mano', text: 'En el callback EXTI:\nif (HAL_GetTick() − ultimo &gt; 20) { ultimo = HAL_GetTick(); pulsado = 1; }\nLa primera interrupción se acepta y las que llegan en los 20 ms siguientes (los rebotes) se descartan. Alternativa por hardware: una resistencia y un condensador que suavicen la señal antes del pin.', q: mcq('En el callback guardas el instante y descartas lo que llegue en los 20 ms siguientes. ¿Qué consigues?', ['Ignorar los rebotes del contacto', 'Más prioridad', 'Despertar del Stop', 'Borrar la bandera'], 'Una pulsación, una interrupción útil.') }
    ] },
    st_power: { name: 'Modos Sleep, Stop y Standby', alts: [
      { title: 'Tres profundidades de sueño', text: '<b>Sleep</b>: se para el núcleo; periféricos y RAM siguen. Cualquier interrupción lo despierta, también el SysTick cada milisegundo: por eso HAL_SuspendTick antes de dormir.\n<b>Stop</b>: se paran casi todos los relojes; RAM y registros se conservan; despierta por una línea EXTI (un pulsador) o el RTC.\n<b>Standby</b>: casi todo apagado; al despertar arranca como tras un reset.', q: mcq('Tras despertar de Standby, ¿dónde sigue el programa?', ['Desde el reset, como un arranque nuevo', 'En la línea siguiente a la que lo durmió', 'En main, con las variables intactas', 'En la interrupción del RTC'], 'Solo sobrevive el dominio de respaldo (RTC y sus registros).') },
      { title: 'Qué se conserva y quién despierta', text: 'Sleep: todo se conserva; despierta cualquier interrupción (suspende el SysTick o te despertará cada ms).\nStop: RAM y registros intactos, relojes parados; despiertan las líneas EXTI y el RTC; vuelves con el HSI.\nStandby: solo el dominio de respaldo; el programa empieza desde el reset (mira la bandera de Standby al arrancar).', q: mcq('Duermes en Sleep sin llamar a HAL_SuspendTick. ¿Qué pasa?', ['El SysTick lo despierta cada milisegundo', 'Duerme para siempre', 'Se pierde la RAM', 'Pasa a Standby'], 'Cualquier interrupción saca al núcleo de Sleep.') }
    ] },
    st_systick: { name: 'SysTick: valor de recarga y periodo', alts: [
      { title: 'Cuenta atrás de 24 bits', text: 'El SysTick cuenta hacia abajo desde <b>LOAD</b> hasta 0 y vuelve a empezar: cada vuelta son LOAD + 1 ciclos. Para una interrupción cada t: <b>LOAD = fCPU × t − 1</b> (o fCPU / ftick − 1).\nCon 24 bits, LOAD llega a 16 777 215: el periodo máximo es 2²⁴ / fCPU. A 100 MHz, unos 167,8 ms.', q: mcq('SysTick a 72 MHz, interrupción cada 1 ms. ¿LOAD?', ['71 999', '72 000', '7199', '71 999 999'], '72 000 ciclos por ms, menos 1.') },
      { title: 'El −1 y el techo', text: 'Error típico 1: olvidar el −1 (72 000 en vez de 71 999): cada “milisegundo” dura un ciclo de más.\nError típico 2: pedir un periodo que no cabe en 24 bits. A 16 MHz, 2²⁴ / 16 MHz ≈ 1,05 s es el máximo; a 168 MHz, unos 0,1 s.', q: mcq('A 16 MHz, ¿cuál es el periodo máximo del SysTick?', ['≈ 1,05 s', '≈ 16,8 ms', '≈ 0,1 s', '≈ 10,5 s'], '16 777 216 / 16 000 000.') }
    ] },
    st_tick: { name: 'HAL_GetTick, esperas y desbordamiento', alts: [
      { title: 'Restar, no sumar', text: 'HAL_GetTick() es un uint32_t de milisegundos: desborda a los 2³² ms ≈ <b>49,7 días</b>. La comparación <b>HAL_GetTick() − t0 &gt;= 500</b> sigue funcionando al desbordar, porque la resta sin signo es módulo 2³². En cambio, HAL_GetTick() &gt;= t0 + 500 falla cuando t0 + 500 da la vuelta.\nY su resolución es de un tick: 1 ms.', q: mcq('¿Qué comparación sigue funcionando cuando HAL_GetTick() desborda?', ['HAL_GetTick() - t0 >= 500', 'HAL_GetTick() >= t0 + 500', 'HAL_GetTick() > 500', 'Ninguna'], 'Compara diferencias, no instantes.') },
      { title: 'La resolución de un tick', text: 'Un contador de ticks solo sabe en qué milisegundo estás, no en qué punto de él. Por eso:\n· <b>HAL_Delay(1)</b> puede durar casi 2 ms: empieza en un punto cualquiera y añade un tick para garantizar el mínimo.\n· <b>osDelay(1)</b> puede durar casi 0 o 1 ms, según cuándo se llame.\nY el contador de 32 bits desborda cada 49,7 días: resta siempre ahora − antes.', q: mcq('Con un tick de 1 kHz, ¿cuánto puede durar osDelay(1)?', ['Entre casi 0 y 1 ms', 'Exactamente 1 ms', 'Siempre 2 ms', '1 µs'], 'Depende de en qué momento del tick se llame.') }
    ] },
    st_timer: { name: 'Frecuencia de un temporizador: PSC y ARR', alts: [
      { title: 'Dos divisores en cadena', text: 'El preescalador divide el reloj entre <b>PSC + 1</b> y el contador cuenta de 0 a ARR, es decir, <b>ARR + 1</b> pasos:\n<b>f = fTIM / ((PSC + 1)(ARR + 1))</b>.\nEn modo centrado el contador sube y baja: la frecuencia es la mitad. Un temporizador de 32 bits a 100 MHz tarda 2³² / 100 MHz ≈ 42,9 s en desbordar.', tune: { viz: 'st_pwm', params: { F: { label: 'fTIM', val: 84, list: [16, 84, 100], unit: 'MHz', dec: 0 }, PSC: { label: 'PSC', val: 83, list: [0, 1, 3, 7, 15, 41, 83, 99, 167, 839, 999], dec: 0 }, ARR: { label: 'ARR', val: 999, list: [99, 199, 255, 399, 499, 999, 1999, 4095, 9999, 65535], dec: 0 }, CCR: { label: 'CCR', val: 250, list: [0, 25, 50, 100, 125, 250, 300, 500, 750, 1000, 1500, 2000, 2500, 5000, 7500, 10000], dec: 0 } } }, q: mcq('fTIM = 16 MHz, PSC = 15, ARR = 999. ¿Frecuencia?', ['1 kHz', '1,07 kHz', '16 kHz', '1 MHz'], '16 MHz / 16 / 1000 = 1 kHz.') },
      { title: 'Error típico: el +1', text: 'Los registros guardan “divisor − 1”. A 84 MHz: PSC = 83 divide entre 84 → ticks de 1 µs; ARR = 999 cuenta 1000 ticks → 1 kHz exactos. Si pones PSC = 84 y ARR = 1000, sale 84 MHz / (85 × 1001) ≈ 987 Hz.\nPara diseñar: elige un tick cómodo con PSC y luego cuántos ticks quieres con ARR. En modo centrado, divide además entre 2.', q: mcq('fTIM = 72 MHz. ¿Qué PSC y ARR dan exactamente 1 kHz?', ['PSC = 71, ARR = 999', 'PSC = 72, ARR = 1000', 'PSC = 71, ARR = 99', 'PSC = 35, ARR = 999'], '72 MHz / 72 / 1000 = 1 kHz.') }
    ] },
    st_duty: { name: 'Ciclo de trabajo PWM: CCR y ARR', alts: [
      { title: 'El comparador', text: 'En PWM modo 1 la salida está activa mientras el contador sea <b>menor que CCR</b>. Con ARR = 999 (1000 pasos) y CCR = 250, la salida está alta 250 de cada 1000 pasos: un 25 %.\n<b>Duty = CCR / (ARR + 1)</b>. Lo cambias en marcha con __HAL_TIM_SET_COMPARE.', tune: { viz: 'st_pwm', params: { F: { label: 'fTIM', val: 84, fixed: true }, PSC: { label: 'PSC', val: 83, list: [0, 1, 3, 7, 15, 41, 83, 99, 167, 839, 999], dec: 0 }, ARR: { label: 'ARR', val: 999, list: [99, 199, 255, 399, 499, 999, 1999, 4095, 9999, 65535], dec: 0 }, CCR: { label: 'CCR', val: 250, list: [0, 25, 50, 100, 125, 250, 300, 500, 750, 1000, 1500, 2000, 2500, 5000, 7500, 10000], dec: 0 } } }, q: mcq('ARR = 199. ¿Qué CCR da un 50 %?', ['100', '99', '199', '50'], '50 % de 200 pasos = 100.') },
      { title: 'CCR como tiempo', text: 'Si el tick es de 1 µs, CCR es directamente el tiempo en alto en microsegundos. Servo a 50 Hz: ARR = 19 999 (20 ms); un pulso de 1,5 ms es CCR = 1500.\nEn porcentaje: CCR = duty × (ARR + 1). Error típico: usar ARR en vez de ARR + 1 (con ARR = 999, el 30 % es CCR = 300, no 299,7).', q: mcq('Ticks de 1 µs y quieres un pulso de 2 ms. ¿CCR?', ['2000', '200', '20 000', '1999'], '2 ms = 2000 µs.') }
    ] },
    st_capture: { name: 'Captura, encoder y un solo pulso', alts: [
      { title: 'Fotos del contador', text: '<b>Captura</b>: en el flanco elegido, el temporizador copia CNT en CCR. Periodo = diferencia entre dos capturas × tick; f = 1 / periodo.\n<b>Encoder</b>: las señales A y B en cuadratura mueven el contador arriba o abajo; contando todos los flancos de ambas hay 4 cuentas por pulso (y luego se multiplica por la reductora).\n<b>Un solo pulso</b>: el contador se para tras un periodo y da un único pulso de duración precisa.', q: mcq('Ticks de 1 µs; dos capturas seguidas difieren en 5000. ¿Frecuencia?', ['200 Hz', '5 kHz', '2 kHz', '20 Hz'], 'Periodo de 5 ms.') },
      { title: 'Con números', text: 'Encoder de 12 pulsos por vuelta, modo ×4 y reductora 50:1: 12 × 4 × 50 = 2400 cuentas por vuelta del eje de salida.\nCaptura con ticks de 1 MHz: diferencia de 25 000 → 25 ms → 40 Hz.\nUn solo pulso (one-pulse): ideal para disparar algo con una duración exacta tras un evento.', q: mcq('Encoder de 7 pulsos por vuelta, reductora 20:1, modo ×4. ¿Cuentas por vuelta del eje de salida?', ['560', '140', '28', '2240'], '7 × 4 × 20.') }
    ] },
    st_deadtime: { name: 'Salidas complementarias y tiempo muerto', alts: [
      { title: 'Nunca los dos a la vez', text: 'En un medio puente, CH1 maneja el transistor de arriba y CH1N el de abajo: <b>complementarias</b>, uno conduce cuando el otro no. Pero los transistores tardan en apagarse: si uno se enciende antes de que el otro se apague, hay <b>shoot-through</b>, un cortocircuito que los destruye.\nEl <b>tiempo muerto</b> los deja a los dos apagados un instante: DTG × tDTS (a 100 MHz, 10 ns por paso). Y la primera prueba, con fuente limitada en corriente.', q: mcq('Reloj del temporizador a 100 MHz, CKD = 1. ¿Qué DTG da 300 ns?', ['30', '300', '3', '33'], '300 ns / 10 ns.') },
      { title: 'Si te equivocas', text: 'Sin tiempo muerto (o con muy poco), cada conmutación crea un pico de corriente de la alimentación a masa a través de los dos transistores: calor, ruido y MOSFET quemados.\nPor eso: salidas complementarias con tiempo muerto calculado (tiempo / tick) y, la primera vez, <b>fuente de laboratorio con límite de corriente bajo y tensión reducida</b>.', q: mcq('¿Qué es el shoot-through?', ['Que conduzcan a la vez el transistor de arriba y el de abajo', 'Que el motor gire al revés', 'Que se pierda el PWM', 'Que salte el watchdog'], 'Es un cortocircuito de la alimentación.') }
    ] },
    st_advtim: { name: 'TIM1: MOE y entrada de freno', alts: [
      { title: 'Un interruptor general', text: 'Las salidas de TIM1 y TIM8 están <b>desactivadas</b> hasta que pones el bit <b>MOE</b> en BDTR (HAL_TIM_PWM_Start lo hace por ti). Si configuras por registros y no sale nada, casi seguro falta MOE.\nLa entrada de <b>freno</b> (BKIN) borra MOE por hardware y lleva las salidas a un estado seguro sin esperar a la CPU.', q: mcq('Configuras TIM1 en PWM por registros y no sale nada por el pin. ¿Qué falta casi seguro?', ['MOE en TIM1->BDTR', 'ARPE', 'UIF', 'CEN de TIM2'], 'Las salidas de los avanzados necesitan MOE.') },
      { title: 'Seguridad por hardware', text: 'Un comparador de sobrecorriente conectado a <b>BKIN</b> corta las salidas en nanosegundos: el freno borra <b>MOE</b> y las salidas pasan al estado de reposo que configuraste. El software no tiene que hacer nada (y puede estar colgado).\nPara volver a arrancar, el programa pone MOE otra vez cuando todo es seguro.', q: mcq('¿Para qué sirve la entrada de freno (BKIN)?', ['Para llevar las salidas a un estado seguro por hardware, sin esperar a la CPU', 'Para frenar el motor con software', 'Para medir la velocidad', 'Para ahorrar energía'], 'Protección en nanosegundos.') }
    ] },
    /* --- M6 · DMA y periféricos de datos --- */
    st_dmacfg: { name: 'Configurar una transferencia DMA', alts: [
      { title: 'Cinco preguntas', text: 'Para configurar el DMA responde: <b>dirección</b> (periférico→memoria, memoria→periférico o memoria→memoria), <b>tamaño</b> de dato (byte, media palabra, palabra), <b>incremento</b> de cada lado, <b>modo</b> normal o circular y qué controlador y flujo atienden esa petición. En la F4 solo el <b>DMA2</b> copia de memoria a memoria.\nADC de 12 bits a uint16_t: media palabra, periférico fijo, memoria incrementando.', q: mcq('ADC de 12 bits a un búfer uint16_t. ¿Configuración típica?', ['Media palabra en ambos lados, incrementar memoria sí y periférico no', 'Byte en ambos lados', 'Incrementar el periférico', 'Palabra y sin incrementos'], 'El registro de datos del ADC es siempre el mismo.') },
      { title: 'Cuándo compensa', text: 'Configurar y arrancar el DMA cuesta unas cuantas instrucciones; compensa con <b>bloques grandes</b> (píxeles de una pantalla, sectores de una SD, audio), no con un byte suelto.\nRecuerda en la F4: DMA2 para memoria a memoria; el periférico casi nunca incrementa (su registro de datos es fijo) y la memoria sí.', q: mcq('¿Cuándo merece la pena SPI con DMA?', ['Con bloques grandes, como los píxeles de una pantalla', 'Para enviar un byte suelto', 'Nunca', 'Solo con I²C'], 'Con un byte, configurar el DMA cuesta más que enviarlo.') }
    ] },
    st_dma: { name: 'DMA circular: mitades HT y TC', alts: [
      { title: 'Doble cubo', text: 'En modo <b>circular</b> el DMA da vueltas a un búfer sin parar. Al llenar la primera mitad avisa (<b>HT</b>) y procesas esa mitad mientras llena la segunda; al completar (<b>TC</b>) procesas la segunda. Nunca toques la mitad que se está escribiendo.\nTu plazo es media vuelta: N / 2 / fs. La posición actual es N − NDTR (el contador que queda). Si solo quieres TC, desactiva la interrupción HT.', tune: { viz: 'st_dma', params: { fs: { label: 'Muestreo', val: 48, list: [8, 16, 44.1, 48], unit: 'kHz', dec: 1 }, N: { label: 'Búfer', val: 512, list: [64, 128, 256, 512, 1024, 2048], unit: 'muestras', dec: 0 }, T: { label: 'Proceso por mitad', val: 3, min: 0.5, max: 20, step: 0.5, unit: 'ms', dec: 1 } } }, q: mcq('Búfer de 1000 muestras a 10 kHz en circular. ¿Cada cuánto llega una interrupción HT o TC?', ['50 ms', '100 ms', '10 ms', '1 ms'], 'Media vuelta: 500 muestras / 10 000 por segundo.') },
      { title: 'Con números', text: 'Búfer de 1024 muestras a 48 kHz: cada mitad (512) dura 512 / 48 000 ≈ 10,7 ms. Si procesar una mitad te lleva 3 ms, la CPU está al 28 %.\nSi tardas más que media vuelta, el DMA pisa datos sin procesar. Para saber dónde va el DMA: pos = N − __HAL_DMA_GET_COUNTER(). Y si el callback de mitad te sobra, desactiva HT.', q: mcq('Búfer circular de 512 muestras a 16 kHz. ¿Plazo para procesar cada mitad?', ['16 ms', '32 ms', '8 ms', '0,5 ms'], '256 / 16 000 = 16 ms.') }
    ] },
    st_adc: { name: 'Tiempo de muestreo y de conversión del ADC', alts: [
      { title: 'Muestrear es llenar un vaso', text: 'Durante el <b>tiempo de muestreo</b> un condensador interno de pocos pF se carga a través de la resistencia de tu fuente: con mucha resistencia o poco tiempo, no se llena y la lectura sale baja.\nDespués vienen 12 ciclos de conversión: <b>tconv = (ciclos de muestreo + 12) / fADC</b> a 12 bits, con fADC = PCLK2 / preescalador (máximo 36 MHz). En escaneo de n canales, cada uno se repite cada n × tconv.', tune: { viz: 'st_adc', params: { pre: { label: 'Preescalador ADC ÷', val: 4, list: [2, 4, 6, 8], dec: 0 }, smp: { label: 'Ciclos de muestreo', val: 3, list: [3, 15, 28, 56, 84, 112, 144, 480], dec: 0 }, R: { label: 'R de la fuente', val: 47, list: [0.1, 1, 4.7, 10, 22, 47, 100], unit: 'kΩ', dec: 1 } } }, q: mcq('Lees un divisor de 100 kΩ con el tiempo de muestreo mínimo y salen valores bajos e inestables. ¿Qué haces?', ['Alargar el tiempo de muestreo o poner un seguidor', 'Bajar la resolución a 6 bits', 'Subir el reloj del ADC', 'Quitar la referencia'], 'Más tiempo para cargar el condensador de muestreo.') },
      { title: 'Ciclos de conversión', text: 'En la F4: <b>tconv = (ciclos de muestreo + 12) / fADC</b> para 12 bits. Con fADC = 21 MHz y 3 ciclos: 15 / 21 MHz ≈ 0,71 µs, unas 1,4 millones de muestras por segundo.\nMuestras por segundo = 1 / tconv. Más ciclos de muestreo = más lento, pero necesario si la fuente tiene mucha resistencia.', q: mcq('fADC = 21 MHz, 84 ciclos de muestreo, 12 bits. ¿tconv?', ['≈ 4,57 µs', '4 µs', '≈ 0,57 µs', '96 µs'], '(84 + 12) / 21 MHz.') }
    ] },
    st_adcscan: { name: 'Escaneo multicanal: orden en el búfer', alts: [
      { title: 'Intercalado', text: 'Con escaneo y DMA circular, el búfer se llena <b>intercalado</b>: canal 1, canal 2, canal 3, canal 1, canal 2…\nCon n canales, la muestra k del canal i (contando desde 0) está en <b>buf[n·k + i]</b>. La longitud del búfer es n × muestras por canal.', q: mcq('4 canales. ¿Índice de la muestra 10 del tercer canal (índice 2)?', ['42', '12', '30', '40'], '4 × 10 + 2.') },
      { title: 'Como repartir cartas', text: 'Imagina que repartes cartas a n jugadores: la primera al jugador 0, la segunda al 1… y vuelta a empezar. El jugador i recibe las cartas i, i + n, i + 2n…\nCon 3 canales, el segundo canal (índice 1) está en 1, 4, 7…: buf[3k + 1]. Y si quieres 100 muestras de cada uno de 4 canales, el búfer mide 400.', q: mcq('3 canales y 50 muestras de cada uno. ¿Longitud del búfer?', ['150', '50', '53', '3'], '3 × 50.') }
    ] },
    st_adcacc: { name: 'Exactitud del ADC: calibración y VREFINT', alts: [
      { title: 'Conocer tu regla', text: 'El ADC mide respecto a VDDA, y con batería VDDA baja con el tiempo. Mide también <b>VREFINT</b>, una referencia interna estable cuyo valor de fábrica (medido a 3,3 V) está guardado en el chip:\n<b>VDDA = 3,3 V × VREFINT_CAL / VREFINT leído</b>.\nAdemás, algunas familias (L4, G4…) piden una <b>autocalibración</b> antes de medir con HAL_ADCEx_Calibration_Start; la F4 no la tiene.', q: mcq('VREFINT_CAL = 1500 (medido a 3,3 V) y ahora lees 1650. ¿VDDA?', ['3,0 V', '3,63 V', '3,3 V', '1,65 V'], '3,3 × 1500 / 1650.') },
      { title: 'Dos fuentes de error', text: '1) La <b>referencia</b>: si supones 3,3 V y VDDA vale 3,0 V, todas tus tensiones salen mal. Se corrige midiendo VREFINT.\n2) El <b>offset</b> del propio ADC: en familias con autocalibración (L4, G4 y otras) llama a HAL_ADCEx_Calibration_Start antes de medir. La F4 no tiene autocalibración. Consulta el manual de tu familia.', q: mcq('¿Qué familia necesita llamar a HAL_ADCEx_Calibration_Start antes de medir?', ['L4 y G4, entre otras; la F4 no', 'Solo la F4', 'Ninguna', 'Todas por igual'], 'Depende de la familia.') }
    ] },
    st_wavegen: { name: 'Muestras a ritmo fijo: temporizador, tabla y DMA', alts: [
      { title: 'Un metrónomo de hardware', text: 'Un temporizador con salida <b>TRGO</b> dispara el ADC o el DAC a un ritmo exacto; el DMA en modo circular lleva o trae los datos. Para una FFT las muestras deben estar equiespaciadas: por eso no se usa el modo continuo.\nPara generar una onda: tabla de N muestras disparada a f_disparo → <b>f_salida = f_disparo / N</b>. Con la mitad de muestras, el doble de frecuencia.', q: mcq('El temporizador dispara el DAC a 500 kHz y la tabla tiene 50 muestras. ¿Frecuencia de salida?', ['10 kHz', '25 MHz', '500 kHz', '1 kHz'], '500 kHz / 50.') },
      { title: 'DDS: el acumulador de fase', text: 'Con una tabla fija, f = f_disparo / N y solo cambias de frecuencia a saltos. Con <b>DDS</b> sumas en cada disparo un incremento de fase a un acumulador y usas sus bits altos como índice de la tabla: la frecuencia es proporcional al incremento, con resolución muy fina y cambios sin cortes.\nLa base es la misma: un temporizador marca el ritmo exacto, tanto para generar como para muestrear.', q: mcq('¿Qué ventaja tiene la síntesis DDS frente a cambiar el temporizador?', ['Resolución de frecuencia muy fina y cambios sin cortes', 'Más bits de resolución', 'Menos memoria siempre', 'No necesita DAC'], 'La frecuencia depende del incremento de fase.') }
    ] },
    st_dac: { name: 'El DAC: código, tensión y salida', alts: [
      { title: 'Código a tensión', text: 'El DAC de 12 bits convierte un número de 0 a 4095 en una tensión entre 0 y VREF+: <b>V = código / 4095 × VREF+</b>. 2048 da la mitad, unos 1,65 V con 3,3 V.\nSolo da tensiones positivas: un seno se centra en 2048.\nEl <b>buffer</b> interno deja cargar la salida pero no llega del todo a 0 V ni a VREF+; sin él, la salida tiene impedancia alta y necesitas un operacional para mover algo.', q: mcq('DAC de 12 bits con VREF+ = 3,3 V. ¿Tensión con el código 1024?', ['≈ 0,83 V', '≈ 1,65 V', '≈ 0,41 V', '1,024 V'], '1024 / 4095 × 3,3.') },
      { title: 'Errores típicos', text: '1) Olvidar el desplazamiento: tabla = 2047·sin(…) da números negativos que el DAC no puede sacar; hay que sumar 2048.\n2) Cargar la salida sin buffer con unos auriculares: la tensión se hunde; pon un operacional como seguidor.\n3) Dividir entre 4096 o 4095 importa poco; olvidar VREF+ importa mucho: V = código / 4095 × VREF+.', q: mcq('Generas tabla[i] = 2047·sin(…) sin sumar 2048. ¿Qué pasa?', ['La mitad negativa sale mal: el DAC no da tensiones negativas', 'Suena el doble de fuerte', 'Funciona igual', 'El DAC se estropea'], 'Hay que centrar la onda a mitad de escala.') }
    ] },
    st_uartrx: { name: 'Recibir por UART: IDLE, DMA y errores', alts: [
      { title: '¿Cuándo ha terminado el mensaje?', text: 'Si no sabes cuántos bytes llegarán: una interrupción por byte (muchas), DMA de longitud fija (espera para siempre si llegan menos) o <b>DMA + línea ociosa (IDLE)</b>, que avisa cuando la línea lleva un carácter de tiempo en silencio. Ideal para frases NMEA de un GPS.\nCon HAL_UARTEx_ReceiveToIdle_DMA, el callback HAL_UARTEx_RxEventCallback recibe cuántos bytes hay en el búfer.', q: mcq('Un GPS envía frases de longitud variable. ¿Qué método eliges?', ['DMA con detección de línea ociosa', 'DMA de longitud fija', 'HAL_UART_Receive bloqueante', 'Sondeo en el bucle'], 'Una interrupción por frase.') },
      { title: 'Cuando algo se tuerce', text: '<b>ORE</b> (desbordamiento): llegó un byte antes de que se leyera el anterior. La HAL detiene la recepción: implementa HAL_UART_ErrorCallback, limpia el error y relanza.\nEn RxEventCallback, el parámetro de tamaño es cuántos bytes hay en el búfer (en modo circular, la posición). Y para mensajes de longitud variable, DMA con IDLE.', q: mcq('Aparece ORE y la recepción se detiene. ¿Qué significa?', ['Llegó un byte antes de leer el anterior: gestiona el error y relanza la recepción', 'El cable está roto', 'La velocidad es demasiado baja', 'El búfer es demasiado grande'], 'Implementa HAL_UART_ErrorCallback.') }
    ] },
    st_rs485: { name: 'RS-485: activar el transmisor', alts: [
      { title: 'Hablar por turnos', text: 'RS-485 es semidúplex: todos comparten el par de hilos. El transceptor tiene un pin <b>DE</b> que activa su transmisor: ponlo a 1 justo antes de enviar y a 0 <b>cuando sale el último bit</b> (bandera TC de la USART, no TXE). En la F4 lo haces con un GPIO; algunas familias (G0, G4, L4…) lo manejan por hardware.', q: mcq('¿Cuándo bajas DE tras enviar un mensaje?', ['Cuando termina de salir el último byte (bandera TC)', 'Al escribir el último byte en DR (TXE)', 'Nunca', 'Antes de enviar'], 'Si lo bajas antes, cortas el último byte.') },
      { title: 'Dos errores', text: 'Si DE se queda alto, tu nodo ocupa el bus y nadie más puede hablar. Si lo bajas demasiado pronto (con TXE), el último byte se corta.\nSolución en una F4: GPIO a 1, enviar, esperar a TC y GPIO a 0. En familias con control DE por hardware, la USART lo hace sola.', q: mcq('En una STM32F4, ¿quién maneja el pin DE del transceptor RS-485?', ['Tu código, con un GPIO', 'La USART, sola', 'El DMA', 'El transceptor, solo'], 'La USART de la F4 no tiene control DE.') }
    ] },
    st_i2c: { name: 'I²C con la HAL', alts: [
      { title: 'La dirección desplazada', text: 'Las funciones I²C de la HAL esperan la dirección de 7 bits <b>desplazada una posición a la izquierda</b>: un sensor en 0x68 se llama con 0x68 &lt;&lt; 1 = 0xD0. Olvidarlo hace que nadie conteste.\nHAL_I2C_Mem_Read(&hi2c1, dir &lt;&lt; 1, registro, tamaño del registro, búfer, n, tiempo) lee n bytes de un registro. Un escáner con HAL_I2C_IsDeviceReady prueba las direcciones 1–127.', q: mcq('Un BME280 está en 0x76. ¿Qué dirección pasas a HAL_I2C_Mem_Read?', ['0x76 << 1 (0xEC)', '0x76', '0x76 >> 1', '0x76 | 1'], 'La HAL añade el bit de lectura o escritura.') },
      { title: 'Leer una llamada', text: 'HAL_I2C_Mem_Read(&hi2c1, 0x68 &lt;&lt; 1, 0x75, I2C_MEMADD_SIZE_8BIT, &id, 1, 100):\n· dispositivo 0x68 (desplazado),\n· registro 0x75, de 8 bits,\n· 1 byte a id,\n· 100 ms de tiempo máximo.\nPara saber qué hay en el bus, recorre a de 1 a 127 con IsDeviceReady(a &lt;&lt; 1): contestan las direcciones ocupadas.', q: mcq('HAL_I2C_Mem_Read(&hi2c1, 0x76 << 1, 0xD0, I2C_MEMADD_SIZE_8BIT, &id, 1, 100). ¿Qué hace?', ['Lee 1 byte del registro 0xD0 del dispositivo 0x76', 'Escribe 0xD0 en el dispositivo', 'Lee 0xD0 bytes', 'Cambia la dirección del sensor'], 'Dispositivo, registro, tamaño, búfer, cantidad y tiempo.') }
    ] },
    st_spi: { name: 'SPI: modo, reloj y transferencias', alts: [
      { title: 'Intercambio de bytes', text: 'En SPI el maestro genera SCK y por cada bit que envía por MOSI recibe uno por MISO: para <b>leer n bytes</b> hay que <b>enviar n</b> (de relleno).\nHay 4 modos según CPOL y CPHA: si no coincides con el del chip, los datos salen desplazados.\nSCK = reloj de su bus APB ÷ preescalador (2, 4… 256): SPI1 va en APB2 y SPI2/SPI3 en APB1.', q: mcq('SPI1 en APB2 a 84 MHz con preescalador ÷8. ¿SCK?', ['10,5 MHz', '84 MHz', '21 MHz', '672 MHz'], '84 / 8.') },
      { title: 'Diagnóstico rápido', text: 'Datos desplazados un bit → <b>modo SPI</b> (CPOL/CPHA) distinto del que pide el chip: mira su diagrama de tiempos.\nSolo recibes 0xFF o 0x00 → no estás enviando relleno, CS mal o MISO sin conectar: el maestro debe generar un pulso de reloj por cada bit que quiere leer.\nComunicación inestable → baja la velocidad: SCK = PCLK del bus / preescalador.', q: mcq('Lees un chip SPI y los datos salen desplazados un bit. ¿Primera sospecha?', ['Modo SPI (CPOL/CPHA) distinto del que pide el chip', 'Dirección I²C', 'Falta un pull-up', 'Velocidad del ADC'], 'Mira el diagrama de tiempos de su hoja de datos.') }
    ] },
    st_bus: { name: 'Rasgos de UART, I²C, SPI y CAN', alts: [
      { title: 'Cuatro buses en una frase', text: '<b>UART</b>: asíncrono, sin reloj, punto a punto.\n<b>I²C</b>: dos hilos en open-drain con pull-ups y direcciones de 7 bits.\n<b>SPI</b>: reloj, MOSI, MISO y un chip select por esclavo; full-duplex y rápido.\n<b>CAN</b>: par diferencial, multimaestro, con arbitraje por identificador.', q: mcq('¿Qué bus usa direcciones y salidas open-drain?', ['I²C', 'SPI', 'UART', 'CAN'], 'Dos hilos compartidos por muchos dispositivos.') },
      { title: 'Elige por la necesidad', text: 'Varios nodos, cables largos y ruido → <b>CAN</b> (diferencial, arbitraje sin colisiones).\nMuchos sensores con solo dos hilos → <b>I²C</b> (direcciones, open-drain).\nMover datos rápido a una pantalla o una SD → <b>SPI</b> (full-duplex, chip select).\nUna consola o un GPS → <b>UART</b> (asíncrona, sin reloj).', q: mcq('Necesitas comunicar varios nodos a 20 m en una nave con mucho ruido. ¿Qué bus?', ['CAN', 'I²C', 'SPI', 'UART a 3,3 V'], 'Diferencial y robusto.') }
    ] },
    st_can: { name: 'Bus CAN: arbitraje, terminación y filtros', alts: [
      { title: 'Arbitraje sin colisiones', text: 'En CAN un 0 es <b>dominante</b>: si un nodo envía 0 y otro 1, el bus queda a 0. Mientras envían el identificador, cada nodo escucha; el que ve un 0 cuando puso un 1 se retira. Gana el <b>identificador más bajo</b> y su trama sigue intacta.\nEl bus lleva <b>120 Ω en cada extremo</b> (60 Ω medidos entre CANH y CANL con todo apagado). Los <b>filtros</b> por hardware descartan las tramas que no te interesan.', q: mcq('Con el bus apagado mides 60 Ω entre CANH y CANL. ¿Qué indica?', ['Que hay dos terminaciones de 120 Ω, como debe ser', 'Que falta una terminación', 'Un cortocircuito', 'Que el bus está roto'], '120 ∥ 120 = 60 Ω.') },
      { title: 'Medir, filtrar y escuchar', text: 'Mide entre CANH y CANL sin alimentación: 120 Ω → falta una terminación; 60 Ω → correcto; unos 40 Ω → sobra una.\nEn un coche hay miles de tramas por segundo: configura los filtros para que la CPU solo vea las tuyas.\nY en el OBD-II de un vehículo, <b>escucha en modo silencioso</b>: una trama errónea puede afectar a centralitas de seguridad.', q: mcq('Dos nodos empiezan a transmitir a la vez con ID 0x120 y 0x0F0. ¿Quién gana?', ['El de 0x0F0, sin que su trama se pierda', 'El de 0x120', 'Ninguno: se repiten los dos', 'El más cercano'], 'Identificador más bajo = más bits dominantes al principio.') }
    ] },
    st_canbit: { name: 'Temporización de bit en CAN', alts: [
      { title: 'Cuantos de tiempo', text: 'Un bit de CAN se divide en cuantos (tq): <b>1</b> de sincronismo + <b>BS1</b> + <b>BS2</b>. Cada tq dura BRP / fPCLK.\n<b>Velocidad = fPCLK / (BRP × (1 + BS1 + BS2))</b>.\n<b>Punto de muestreo = (1 + BS1) / (1 + BS1 + BS2)</b>, que en CAN se busca cerca del 87,5 %.', q: mcq('bxCAN con PCLK1 = 36 MHz, BRP = 4, BS1 = 13 y BS2 = 4. ¿Velocidad?', ['500 kbit/s', '529 kbit/s', '250 kbit/s', '2 Mbit/s'], '36 MHz / (4 × 18).') },
      { title: 'El cuanto que se olvida', text: 'Error típico: sumar solo BS1 + BS2 y olvidar el cuanto de sincronismo. Con BS1 = 13 y BS2 = 2 son 16 cuantos, no 15; el muestreo se hace tras 1 + 13 = 14 de ellos: 14 / 16 = 87,5 %.\nCon 42 MHz, BRP = 21 y 16 cuantos: 42 MHz / (21 × 16) = 125 kbit/s.', q: mcq('BS1 = 13 tq y BS2 = 2 tq. ¿Punto de muestreo?', ['87,5 %', '86,7 %', '81,3 %', '93,3 %'], '(1 + 13) / 16.') }
    ] },
    st_usbcdc: { name: 'USB CDC: puerto serie virtual', alts: [
      { title: 'Un puerto serie que no lo es', text: 'Con la clase CDC el STM32 aparece en el PC como un puerto serie, pero los datos viajan a la velocidad del <b>USB</b>: los baudios que elijas en el terminal llegan al STM32 como un dato más y no afectan a la transferencia.\nCDC_Transmit_FS devuelve <b>USBD_BUSY</b> si la transferencia anterior aún no ha terminado: espera y reintenta, y mantén vivo el búfer hasta que acabe.', q: mcq('En un puerto serie virtual USB CDC, ¿importa la velocidad en baudios que elijas en el PC?', ['No: los datos van a la velocidad del USB', 'Sí, debe ser 115 200', 'Sí, debe coincidir con una UART', 'Solo en Linux'], 'El valor llega al STM32, pero no limita nada.') },
      { title: 'Error típico', text: 'Llamar a CDC_Transmit_FS varias veces seguidas: la primera sale y las demás devuelven USBD_BUSY y se pierden. Guarda los datos en un FIFO y envía el siguiente bloque cuando la transmisión anterior termine.\nY no te preocupes por los baudios del terminal: en CDC no cuentan.', q: mcq('CDC_Transmit_FS devuelve USBD_BUSY. ¿Qué significa?', ['La transferencia anterior aún no ha terminado: espera y reintenta', 'El cable está roto', 'El PC no tiene drivers', 'Error de la Flash'], 'Hay una transferencia en curso.') }
    ] },
    /* --- M7 · FreeRTOS --- */
    st_rtos: { name: 'Planificador de FreeRTOS', alts: [
      { title: 'Varios programas que se turnan', text: 'Con un RTOS cada trabajo es una <b>tarea</b> con su bucle y su pila. El planificador ejecuta siempre la tarea <b>lista</b> de mayor prioridad; en FreeRTOS, <b>número mayor = más importante</b> (al revés que el NVIC). Con igual prioridad se turnan en cada tick.\nUna tarea que espera (osDelay, cola vacía) pasa a <b>Blocked</b> y no gasta CPU. Si ninguna está lista corre la tarea <b>Idle</b>, que puede dormir el chip (con el modo tickless, sin despertar en cada tick).', q: mcq('Una tarea con la prioridad más alta hace while(1) {} sin esperar nunca. ¿Qué pasa?', ['Las de menor prioridad no se ejecutan nunca', 'Se reparten la CPU a partes iguales', 'El RTOS la mata', 'Nada'], 'Hay que bloquearse para ceder la CPU.') },
      { title: 'Bloquearse es bueno', text: 'osDelay(100) pasa la tarea a Blocked 100 ticks y la CPU queda para las demás; <b>HAL_Delay</b> da vueltas y la gasta. Una tarea que espera en osMessageQueueGet con osWaitForever no consume nada hasta que llega un mensaje.\nEstados: Running (ejecutándose), Ready (espera turno), Blocked (espera tiempo o evento), Suspended (apartada). Un RTOS no merece la pena en un programa con una o dos cosas sin plazos.', q: mcq('Dentro de una tarea, ¿HAL_Delay(100) u osDelay(100)?', ['osDelay: bloquea la tarea y deja la CPU a las demás', 'HAL_Delay: es más precisa', 'Da igual', 'Ninguna funciona'], 'HAL_Delay espera dando vueltas.') }
    ] },
    st_stack: { name: 'Pila de las tareas', alts: [
      { title: 'Palabras y bytes', text: 'En un Cortex-M una palabra son <b>4 bytes</b>. CubeMX pide el tamaño de pila en palabras; CMSIS-RTOS v2 (.stack_size) lo quiere en <b>bytes</b>; xTaskCreate nativo, en palabras.\nuxTaskGetStackHighWaterMark devuelve las palabras que <b>nunca</b> se han usado: usado = (total − marca) × 4.\nLas pilas salen del montón de FreeRTOS: si no cabe una, osThreadNew devuelve NULL.', q: mcq('Tarea de 512 palabras; la marca de agua es 100. ¿Cuántos bytes ha usado como máximo?', ['1648', '412', '400', '2048'], '(512 − 100) × 4.') },
      { title: 'Qué se come la pila', text: 'Gastan mucha pila los <b>arrays locales</b> grandes, printf con formatos y la recursión. Un char buf[1024] en una tarea de 128 palabras (512 bytes) desborda seguro: hazlo static o da mucha más pila.\nconfigCHECK_FOR_STACK_OVERFLOW = 2 te avisa; y la marca de agua te dice cuánto margen queda (en palabras: multiplica por 4).', q: mcq('Una tarea de 256 palabras declara un array local de 2 KB. ¿Qué pasa?', ['Desborda: 2048 B no caben en 1024 B', 'Nada', 'Va más lenta', 'El array va a Flash'], '256 × 4 = 1024 bytes de pila.') }
    ] },
    st_task: { name: 'Tareas: bucle infinito y periodo fijo', alts: [
      { title: 'Una tarea nunca vuelve', text: 'La función de una tarea es un <b>bucle infinito</b>: si llega al final y retorna, FreeRTOS no sabe a dónde volver y falla. Si una tarea debe terminar, llama a osThreadExit().\nPara un periodo exacto usa <b>osDelayUntil</b> con una referencia que avanzas cada vuelta: osDelay cuenta desde que lo llamas y acumula el tiempo de trabajo.', q: mcq('Tarea que debe ejecutarse exactamente cada 10 ms aunque su trabajo tarde un poco. ¿Qué usas?', ['osDelayUntil con un tiempo de referencia', 'osDelay(10) al final', 'HAL_Delay(10)', 'Un while vacío'], 'osDelayUntil no acumula deriva.') },
      { title: 'La deriva con números', text: 'Trabajo de 2 ms + osDelay(10) → periodo real de 12 ms, y el error se acumula vuelta a vuelta. Con t += 10; osDelayUntil(t); el periodo es de 10 ms exactos mientras el trabajo dure menos de 10 ms.\nY siempre dentro de for (;;): una tarea que retorna es un error.', q: mcq('Trabajo de 3 ms y osDelay(10) al final del bucle. ¿Periodo real?', ['≈ 13 ms', '10 ms', '7 ms', '3 ms'], 'osDelay cuenta desde que se llama.') }
    ] },
    st_rtosisr: { name: 'FreeRTOS desde interrupciones', alts: [
      { title: 'Ojo con los números', text: 'Una interrupción que llama a la API del RTOS debe tener una prioridad numérica <b>igual o mayor</b> que configMAX_SYSCALL_INTERRUPT_PRIORITY (5 en CubeMX). Las de 0–4 nunca son retrasadas por el RTOS, pero no pueden llamarlo.\nDesde una interrupción nunca se bloquea: tiempo de espera 0 (o funciones FromISR), nada de mutex, y portYIELD_FROM_ISR para cambiar enseguida a la tarea despertada.', q: mcq('Una interrupción con prioridad NVIC 2 llama a xQueueSendFromISR (límite 5). ¿Qué ocurre?', ['Puede corromper el núcleo del RTOS: su prioridad debe ser 5 o mayor', 'Funciona perfecto', 'Se ejecuta más rápido', 'El compilador da error'], 'Las más urgentes que el límite no pueden usar la API.') },
      { title: 'Cuatro reglas para una ISR con RTOS', text: '1) <b>Nunca bloquear</b>: tiempo de espera 0 o funciones FromISR.\n2) <b>Prioridad 5–15</b> si llama al RTOS; <b>0–4</b> si necesita el mínimo retardo y no lo llama.\n3) <b>Mutex no</b>: son solo para tareas (una ISR no puede esperar ni heredar prioridad).\n4) <b>portYIELD_FROM_ISR</b>(xHigherPriorityTaskWoken) para saltar a la tarea despertada al salir, sin esperar al siguiente tick.', q: mcq('¿Puedes tomar un mutex dentro de una interrupción?', ['No: los mutex son solo para tareas', 'Sí, con espera infinita', 'Sí, si la prioridad es 0', 'Solo con la API nativa'], 'Una interrupción no puede bloquearse.') }
    ] },
    st_queue: { name: 'Colas y semáforos', alts: [
      { title: 'Cada herramienta, su uso', text: '<b>Cola</b>: pasa datos <b>copiándolos</b> en una FIFO.\n<b>Semáforo binario</b>: avisa de que algo ha ocurrido (o una notificación de tarea).\n<b>Semáforo contador</b>: cuenta eventos o recursos.\n<b>Mutex</b>: protege un recurso compartido.\nUn productor con osWaitForever y la cola llena se bloquea hasta que el consumidor saque algo: la cola regula el ritmo.', q: mcq('Una interrupción debe despertar a una tarea cuando hay datos. ¿Qué usas?', ['Un semáforo binario o una notificación de tarea', 'Un mutex', 'Una variable global y un while', 'HAL_Delay'], 'La tarea duerme hasta la señal.') },
      { title: 'La cola copia, no apunta', text: 'Una cola copia lo que le das. Si le das un <b>puntero</b> a un array local, copia el puntero, no los datos: cuando el receptor lo lea, el array puede haber cambiado o no existir. Envía los datos (si son pequeños) o un puntero a memoria que siga viva.\nY si está llena, el productor que espera con osWaitForever se bloquea hasta que haya sitio.', q: mcq('Envías a una cola un puntero a un array local de la tarea emisora. ¿Riesgo?', ['Cuando el receptor lo lea, el array puede haber cambiado o no existir', 'Ninguno', 'Que la cola se llene', 'Que el puntero se copie mal'], 'La cola copia el puntero, no los datos.') }
    ] },
    st_mutex: { name: 'Mutex, inversión de prioridad e interbloqueo', alts: [
      { title: 'Inversión de prioridad paso a paso', text: 'La tarea baja tiene el mutex; la alta lo pide y se bloquea; una tarea media (que no lo necesita) expulsa a la baja… y la alta acaba esperando a la media.\nLos mutex de FreeRTOS tienen <b>herencia de prioridad</b>: la baja sube temporalmente a la prioridad de la alta y la media ya no la expulsa. Un semáforo binario no la tiene: semáforo para avisar, mutex para proteger (por ejemplo, que dos tareas no mezclen su printf).', q: mcq('¿Por qué un mutex y no un semáforo binario para proteger un recurso?', ['El mutex tiene herencia de prioridad; el semáforo no', 'El semáforo es más lento', 'Es lo mismo', 'El semáforo no existe en FreeRTOS'], 'Semáforo para señalar; mutex para proteger.') },
      { title: 'Reglas de oro', text: '1) Ten el mutex el <b>menor tiempo posible</b> y nunca esperes (osDelay) con él tomado.\n2) Si necesitas dos, tómalos <b>siempre en el mismo orden</b>: si A toma 1 y luego 2 y B toma 2 y luego 1, pueden quedarse esperándose para siempre (interbloqueo).\n3) Usa mutex (con herencia de prioridad) para recursos compartidos como la UART.', q: mcq('La tarea A toma el mutex 1 y pide el 2; la B toma el 2 y pide el 1. ¿Qué puede pasar?', ['Interbloqueo: cada una espera a la otra para siempre', 'Nada', 'Que vayan más rápido', 'Que el RTOS lo resuelva solo'], 'Toma siempre los mutex en el mismo orden.') }
    ] },
    st_swtimer: { name: 'Temporizadores software y base de tiempo', alts: [
      { title: 'Una sola tarea para todos los callbacks', text: 'osTimerNew(parpadeo, osTimerPeriodic, …) y osTimerStart(t, 500) llaman a parpadeo cada 500 ticks. Todos los callbacks corren en <b>una única tarea</b> del sistema: deben ser cortos y no bloquear nunca, o retrasan a todos los demás temporizadores.\nCon FreeRTOS, el SysTick es del RTOS: la base de tiempo de la HAL se mueve a un temporizador hardware (por ejemplo TIM11).', q: mcq('Un callback de temporizador software llama a osDelay(100). ¿Problema?', ['Bloquea la tarea de temporizadores y retrasa a todos los demás', 'Ninguno', 'Se reinicia el chip', 'El temporizador se acelera'], 'Los callbacks no deben bloquear.') },
      { title: 'Dos relojes que no se pisan', text: 'HAL_GetTick y los tiempos de espera de la HAL deben funcionar <b>antes de que arranque el planificador</b> y aunque esté parado. Por eso CubeMX pide otra base de tiempo para la HAL (TIM11, por ejemplo) y deja el SysTick al RTOS.\nY para trabajos cortos y periódicos, temporizadores software: osTimerStart(t, 500) → callback cada 500 ticks, siempre breve.', q: mcq('¿Por qué la HAL necesita otra base de tiempo con FreeRTOS?', ['Sus esperas deben funcionar aunque el planificador no haya arrancado o esté parado', 'Porque el SysTick es lento', 'Para ahorrar energía', 'Porque la HAL no usa tiempo'], 'Cada uno con su reloj.') }
    ] },
    /* --- M8 · producto --- */
    st_avgcur: { name: 'Consumo medio y duración de la batería', alts: [
      { title: 'Media ponderada', text: 'Corriente media = (I despierto × t despierto + I dormido × t dormido) / periodo. Un nodo a 5 mA durante 20 ms cada 10 s y 10 µA el resto: (5000 × 0,02 + 10 × 9,98) / 10 ≈ 20 µA.\nDuración = capacidad / corriente media: 2000 mAh / 0,02 mA = 100 000 h ≈ 11,4 años (en la práctica, menos por autodescarga).', q: mcq('2 mA durante 50 ms cada 5 s y 5 µA el resto. ¿Corriente media?', ['≈ 25 µA', '≈ 20 µA', '≈ 2 mA', '≈ 1 mA'], '(2000 × 0,05 + 5 × 4,95) / 5.') },
      { title: 'Cuidado con las unidades', text: 'Pasa todo a las mismas unidades antes de operar: mA con mA, segundos con segundos.\nmAh / mA = horas; horas / 8760 = años. Con 1000 mAh y 50 µA (0,05 mA): 20 000 h ≈ 2,3 años.\nPara la media, pondera cada corriente por el tiempo que dura: lo que manda es la fracción de tiempo despierto.', q: mcq('Batería de 1000 mAh y 50 µA de media. ¿Duración aproximada?', ['≈ 2,3 años', '≈ 20 años', '≈ 0,2 años', '≈ 23 años'], '1000 / 0,05 = 20 000 h.') }
    ] },
    st_wdg: { name: 'Watchdogs: refresco, IWDG y WWDG', alts: [
      { title: 'El hombre muerto', text: 'Como el pedal de un tren: si el conductor no lo pisa a tiempo, el tren frena. Tu programa debe <b>refrescar</b> el watchdog en un punto que solo se alcanza si todo va bien (nunca desde una interrupción de temporizador, que seguiría aunque el bucle esté colgado). Con un RTOS, cada tarea marca que está viva y una supervisora refresca solo si todas lo han hecho.\nTras un reset, mira en RCC->CSR la causa y borra las banderas.', q: mcq('¿Dónde refrescas el IWDG?', ['En un punto que solo se alcanza si todo funciona bien', 'En una interrupción de temporizador que siempre corre', 'Al principio de main y nunca más', 'En el HardFault_Handler'], 'Refrescarlo desde un temporizador lo anula.') },
      { title: 'IWDG frente a WWDG', text: '<b>IWDG</b>: cuenta con el LSI, funciona aunque falle el reloj principal y no se puede parar una vez arrancado.\n<b>WWDG</b>: usa PCLK1 y exige refrescar dentro de una <b>ventana</b>: demasiado pronto también es fallo y reinicia. Puede avisar con una interrupción antes del reset.\nAl arrancar, lee qué watchdog causó el reset y borra las banderas (se acumulan hasta que las borras).', q: mcq('Refrescas el WWDG antes de que se abra la ventana. ¿Qué pasa?', ['Reset: refrescar demasiado pronto también es fallo', 'Nada', 'Se alarga el tiempo', 'Se desactiva'], 'Detecta también programas que van demasiado rápido.') }
    ] },
    st_iwdgcalc: { name: 'Tiempo del IWDG', alts: [
      { title: 'Cuentas del IWDG', text: 'El IWDG cuenta con el LSI (unos 32 kHz en la F4, pero varía mucho entre chips).\n<b>t = preescalador × (RLR + 1) / fLSI</b>.\nCon ÷32 y RLR = 999: 32 × 1000 / 32 000 = 1 s. RLR es de 12 bits: como mucho 4095.', q: mcq('IWDG con ÷64 y RLR = 499, LSI de 32 kHz. ¿Tiempo?', ['1 s', '0,5 s', '2 s', '64 ms'], '64 × 500 / 32 000 = 1 s.') },
      { title: 'Al revés: RLR para un tiempo', text: 'Despeja: <b>RLR = t × fLSI / preescalador − 1</b>. Para 500 ms con ÷32: 0,5 × 32 000 / 32 − 1 = 499. Comprueba que no pase de 4095; si pasa, sube el preescalador.\nComo el LSI puede ir de unos 17 a 47 kHz, deja margen: el tiempo real puede ser bastante distinto.', q: mcq('LSI de 32 kHz y preescalador ÷32. ¿Qué RLR da 500 ms?', ['499', '500', '15 999', '4095'], '500 ms × 32 kHz / 32 − 1.') }
    ] },
    st_blproto: { name: 'Protocolo del cargador por UART', alts: [
      { title: 'Conversación byte a byte', text: 'El cargador de ROM por UART (nota AN3155) usa <b>8 bits con paridad par</b> (8E1). Envías <b>0x7F</b> para que detecte tu velocidad; responde <b>0x79</b> (ACK) o <b>0x1F</b> (NACK).\nCada comando va seguido de su <b>complemento</b> (XOR con 0xFF): escribir memoria es 0x31 y detrás va 0xCE.', q: mcq('El comando de leer memoria es 0x11. ¿Qué byte envías detrás?', ['0xEE', '0x11', '0x00', '0xFF'], '0x11 XOR 0xFF.') },
      { title: 'Dos errores típicos', text: '1) Configurar la UART en 8N1: el cargador no responde porque exige <b>paridad par</b>.\n2) Enviar el comando sin su complemento: el cargador responde NACK (0x1F).\nRecuerda: 0x7F para empezar, comando + complemento (0x31 → 0xCE) y esperar ACK (0x79) tras cada paso.', q: mcq('Tu herramienta de carga por UART no conecta y usa 8N1. ¿Qué falta?', ['Paridad par (8E1)', 'Más velocidad', 'Control de flujo', 'Dos bits de parada'], 'El cargador de sistema exige paridad par.') }
    ] },
    st_flash: { name: 'Borrar y programar la Flash interna', alts: [
      { title: 'Borrar pone unos', text: 'Borrar deja todos los bits a <b>1</b> (0xFF). Programar solo puede pasar bits de 1 a 0: para volver a 1 hay que borrar el <b>sector entero</b>. En la F401/F411 hay cuatro sectores de 16 KB, uno de 64 KB (desde 0x08010000) y el resto de 128 KB.\nCon FLASH_VOLTAGE_RANGE_3 (2,7–3,6 V) se programa de 32 en 32 bits. Mientras se borra, la CPU no puede leer esa Flash y se para; y cada sector aguanta unos 10 000 borrados.', q: mcq('Una palabra vale 0x0000FFFF y escribes 0xFFFF0000 sin borrar. ¿Qué queda?', ['0x00000000 (o un error de programación)', '0xFFFF0000', '0xFFFFFFFF', '0x0000FFFF'], 'Los bits a 0 no vuelven a 1 sin borrar.') },
      { title: 'Desgaste y bloqueo', text: 'Cada sector aguanta del orden de <b>10 000 ciclos</b> de borrado en la F4: guardar un contador cada segundo lo agotaría en horas. Y mientras se borra un sector (hasta 1–2 s los de 128 KB), la CPU que ejecuta desde esa Flash <b>se queda parada</b>: ojo con los watchdogs.\nRecuerda la base: borrar pone 0xFF; programar solo baja bits; sectores 0–3 de 16 KB y el 4 empieza en 0x08010000.', q: mcq('Quieres guardar un contador cada segundo durante años. ¿Buena idea en la Flash interna?', ['No: agotarías los ciclos de borrado en pocas horas', 'Sí, la Flash es infinita', 'Sí, si usas la HAL', 'Solo con RDP nivel 2'], 'Usa una FRAM, los registros de respaldo o guarda con menos frecuencia.') }
    ] },
    st_rdp: { name: 'Protección de lectura (RDP)', alts: [
      { title: 'Tres niveles', text: '<b>Nivel 0</b>: sin protección.\n<b>Nivel 1</b>: el depurador no puede leer la Flash. Volver a 0 es posible, pero <b>borra toda la Flash</b>: así nadie recupera tu código.\n<b>Nivel 2</b>: depuración desactivada para siempre. <b>Irreversible</b>: solo para un producto final del que estés muy seguro.', q: mcq('¿Qué pasa si bajas el RDP de nivel 1 a nivel 0?', ['Se borra toda la Flash', 'Nada', 'Se bloquea el chip para siempre', 'Se activa el nivel 2'], 'Protege tu código sin perder el chip.') },
      { title: 'Una puerta con o sin vuelta atrás', text: 'Nivel 1 es una puerta cerrada con llave: puedes abrirla, pero al hacerlo se vacía la habitación (borrado completo). Nivel 2 es tapiar la puerta: nunca más podrás depurar ni reprogramar por SWD. En prototipos, como mucho nivel 1.', q: mcq('¿Cuándo pondrías el RDP a nivel 2?', ['Solo en un producto final, seguro de que nunca necesitarás depurar ni reprogramar por SWD', 'En cada prototipo', 'Para ahorrar energía', 'Para acelerar la Flash'], 'Es irreversible.') }
    ] },
    st_board: { name: 'Circuito mínimo de un STM32', alts: [
      { title: 'Pata a pata', text: '· Un 100 nF junto a cada VDD y un 4,7–10 µF para todo el chip.\n· <b>VCAP</b> (F4): el condensador que pide la hoja de datos; estabiliza el regulador interno del núcleo.\n· <b>VDDA</b> con su filtro (ferrita y condensadores): el ADC y el DAC miden respecto a ella.\n· <b>BOOT0</b> con unos 10 kΩ a masa; <b>NRST</b> con 100 nF a masa.\n· USB con supresor ESD en D+ y D−.\n· Regulador con caída suficiente para tu fuente.', q: mcq('Tu placa F411 no arranca y no tiene condensador en VCAP_1. ¿Qué pasa?', ['El regulador interno del núcleo es inestable: hay que ponerlo', 'Nada, VCAP es opcional', 'Hay que conectarlo a 3,3 V', 'Solo afecta al USB'], 'VCAP estabiliza la tensión del núcleo.') },
      { title: 'El error y su síntoma', text: 'Sin VCAP → el chip no arranca o es inestable.\nBOOT0 al aire → a veces arranca el cargador en vez de tu programa.\nNRST sin condensador → reinicios por ruido.\nVDDA sin filtro → medidas del ADC ruidosas.\nUSB sin ESD → una descarga lo mata.\nAMS1117 (cae ~1 V) desde una Li-ion → la salida baja de 3,3 V enseguida: usa un LDO de caída muy baja o un buck-boost.', q: mcq('Dejas BOOT0 al aire en tu placa. ¿Síntoma probable?', ['A veces arranca el cargador de ROM en lugar de tu programa', 'El cristal no oscila', 'El USB va más rápido', 'Ninguno'], 'Ponlo a masa con unos 10 kΩ.') }
    ] },
    st_crystal: { name: 'Condensadores del cristal', alts: [
      { title: 'Cuentas del cristal', text: 'Los dos condensadores de un cristal quedan en serie para él, y se suma la capacidad parásita de pistas y patas: <b>CL = C/2 + Cpar</b>. Despejando: <b>C = 2 × (CL − Cpar)</b>. Un cristal de 12 pF con 4 pF parásitos pide 16 pF a cada lado.', q: mcq('Cristal con CL = 10 pF y unos 3 pF parásitos. ¿Condensador a cada lado?', ['14 pF', '20 pF', '7 pF', '10 pF'], '2 × (10 − 3).') },
      { title: 'Error típico', text: 'Poner C = CL (o CL / 2) a cada lado. Como los dos condensadores están en serie, cada uno aporta la mitad; y la placa añade unos pocos pF. Con CL = 8 pF y 3 pF parásitos: 2 × (8 − 3) = 10 pF. Si el cálculo no da un valor comercial, elige el más cercano.', q: mcq('CL = 8 pF y unos 3 pF parásitos. ¿Condensador a cada lado?', ['10 pF', '8 pF', '16 pF', '5 pF'], '2 × (8 − 3).') }
    ] },
    st_bringup: { name: 'Planificar y arrancar una placa nueva', alts: [
      { title: 'Antes del esquema y después de fabricar', text: 'Antes de dibujar: asigna los pines en <b>CubeMX</b> para comprobar que cada función tiene un pin posible sin conflictos (descubrirlo con la placa fabricada es carísimo).\nAl recibirla, <b>paso a paso</b>: inspección y continuidad entre 3,3 V y GND, alimentar con fuente limitada y medir 3,3 V, conectar el ST-LINK y leer el ID, grabar un parpadeo, comprobar el reloj con MCO y probar cada periférico por separado.', q: mcq('Recibes tu placa nueva. ¿Qué haces primero?', ['Inspección visual y comprobar que no hay corto entre 3,3 V y GND', 'Grabar el programa final', 'Conectarla a la batería', 'Probar todos los periféricos a la vez'], 'Si algo falla, sabrás exactamente qué.') },
      { title: 'Un paso cada vez', text: 'Cada paso de la puesta en marcha comprueba una sola cosa: si falla, sabes dónde está el problema. Lo mismo antes de fabricar: CubeMX te dice si dos periféricos quieren el mismo pin o si una función no existe en ese encapsulado, cuando todavía cambiarlo es gratis.', q: mcq('¿Por qué asignar los pines en CubeMX antes de dibujar el esquema?', ['Para comprobar que cada función tiene un pin posible sin conflictos', 'Para que la PCB sea más bonita', 'Porque KiCad lo exige', 'No hace falta'], 'Un conflicto en una placa fabricada obliga a rehacerla.') }
    ] },
    st_profw: { name: 'Buenas prácticas de firmware profesional', alts: [
      { title: 'Capas y pruebas', text: 'Un firmware que crece se divide en <b>capas</b>: drivers, servicios y aplicación. Si un driver recibe las funciones de lectura y escritura del bus (en vez de llamar a la HAL), puedes <b>probarlo en el PC</b> y cambiar de bus o de chip sin tocarlo.\nLa lógica pura (PID, analizadores de tramas, máquinas de estados) se prueba en el PC con Unity o GoogleTest. Y todo se compila con make en integración continua: reproducible.', q: mcq('¿Qué se prueba mejor en el PC que en la placa?', ['Un analizador de tramas NMEA', 'El tiempo de subida de un pin', 'El consumo en Stop', 'El arranque del cristal'], 'Lo que no depende del hardware.') },
      { title: 'Calidad y publicación', text: 'Compila con <b>-Wall -Wextra</b> y trata los avisos: muchos son errores reales. Para software crítico existen reglas como <b>MISRA C</b>. En git va el código y el .ioc, no la carpeta Debug/ (se regenera). Compila en integración continua para que el resultado sea reproducible.\nPara publicar: pruebas en verde, número de versión, etiqueta en git, compilación de producción y guardar el <b>.elf</b> con símbolos junto al .bin.', q: mcq('¿Por qué guardar el .elf de cada versión publicada?', ['Para analizar fallos de esa versión exacta con sus símbolos', 'Para grabarlo más rápido', 'Porque ocupa menos', 'No sirve de nada'], 'El .bin no tiene símbolos.') }
    ] }
  });

  /* ======================= GENERADORES ======================= */
  const fHz = f => f >= 1e6 ? fmt(f / 1e6, 3) + ' MHz' : f >= 1000 ? fmt(f / 1000, 3) + ' kHz' : fmt(f, 3) + ' Hz';
  const MODE_NAME = ['entrada', 'salida', 'función alternativa', 'analógico'];
  // Pista de Chispa para cada generador: orienta sin dar la respuesta.
  const GH = {
    st_sysclk: 'Divide primero entre M, multiplica por N y divide entre P, en ese orden.',
    st_pwmFreq: 'Recuerda el +1: el reloj se divide entre (PSC + 1) y entre (ARR + 1).',
    st_pscArr: 'Elige primero un tick cómodo y recuerda que los registros guardan «divisor − 1».',
    st_duty: 'Hay ARR + 1 pasos por periodo: el porcentaje se calcula sobre ese número.',
    st_brr: 'Divide la frecuencia del bus entre los baudios y luego pasa el resultado a hexadecimal.',
    st_baudErr: 'Calcula la velocidad real (fPCLK / BRR) y compárala con la que querías.',
    st_adcTime: 'Suma 12 ciclos a los de muestreo y divide entre la frecuencia del ADC.',
    st_regAddr: 'Suma base y desplazamiento en hexadecimal, sin pasar por decimal.',
    st_moder: 'Cada pin ocupa 2 bits: el campo del pin n empieza en el bit 2·n.',
    st_bsrr: 'La mitad baja (bits 0–15) pone a 1; la alta (16–31) pone a 0.',
    st_iwdg: 'Tiempo = preescalador × (RLR + 1) / 32 kHz.',
    st_memUse: '.data cuenta en las dos memorias: Flash = text + data; RAM = data + bss.',
    st_systick: 'LOAD = ciclos por interrupción − 1.',
    st_crystal: 'Los dos condensadores quedan en serie: C = 2 × (CL − Cparásita).',
    st_dmaHalf: 'Cada interrupción llega al llenarse media vuelta: N / 2 muestras.',
    st_canBit: 'Un bit son 1 + BS1 + BS2 cuantos: no olvides el de sincronismo.',
    st_stack: 'En un Cortex-M una palabra son 4 bytes.'
  };
  const GA = (k, fn, c) => Gen.add(k, () => { const e = fn(); return e.h ? e : { ...e, h: GH[k] }; }, c);


  GA('st_sysclk', () => {
    const [hse, m, n, p] = pick([[25, 25, 192, 2], [25, 25, 336, 4], [8, 8, 336, 2], [8, 4, 180, 2], [25, 25, 200, 2], [8, 8, 384, 4], [16, 16, 336, 4], [16, 8, 180, 2], [12, 6, 168, 2], [25, 15, 216, 2], [16, 16, 200, 2], [8, 4, 168, 4]]);
    const vin = hse / m, vco = vin * n, sys = vco / p;
    if (Math.random() < 0.3) return N(`HSE = ${hse} MHz, PLLM = ${m}, PLLN = ${n}. ¿Frecuencia del VCO en MHz?`, vco, 'MHz', `Entrada del VCO: ${hse} / ${m} = ${fmt(vin, 3)} MHz. VCO = ${fmt(vin, 3)} × ${n} = ${fmt(vco, 1)} MHz (debe quedar entre 100 y 432 MHz en la F4).`, 0.5);
    return N(`STM32F4: HSE = ${hse} MHz, PLLM = ${m}, PLLN = ${n}, PLLP = ${p}. ¿SYSCLK en MHz?`, sys, 'MHz', `SYSCLK = ${hse} / ${m} × ${n} / ${p} = ${fmt(sys, 2)} MHz. Primero divide (entrada del VCO ${fmt(vin, 3)} MHz), luego multiplica (VCO ${fmt(vco, 1)} MHz) y luego divide entre P.`, 0.5);
  }, 'st_clock');

  GA('st_pwmFreq', () => {
    const F = pick([16, 72, 84, 100, 168, 170]);
    const psc = pick([0, 1, 3, 7, 9, 15, 99, 999]), arr = pick([99, 255, 499, 999, 1999, 4095, 9999]);
    const f = F * 1e6 / ((psc + 1) * (arr + 1));
    return N(`Temporizador a ${F} MHz con PSC = ${psc} y ARR = ${arr}. ¿Frecuencia de actualización en Hz?`, f, 'Hz', `f = ${F} MHz / ((${psc} + 1) × (${arr} + 1)) = ${fHz(f)}. El contador cuenta de 0 a ARR: son ARR + 1 pasos.`, Math.max(0.01, f * 0.005));
  }, 'st_timer');

  GA('st_pscArr', () => {
    const F = pick([16, 72, 84, 100]), target = pick([1, 10, 50, 100, 1000, 20000]);
    const p1 = target < 50 ? F * 100 : F, tick = F * 1e6 / p1, a1 = tick / target;
    return MC(`Reloj del temporizador ${F} MHz. ¿Qué pareja da exactamente ${fHz(target)}?`, `PSC = ${p1 - 1}, ARR = ${a1 - 1}`,
      [`PSC = ${p1}, ARR = ${a1}`, `PSC = ${p1 - 1}, ARR = ${a1 / 10 - 1}`, `PSC = ${p1 / 2 - 1}, ARR = ${a1 - 1}`],
      `Divide ${F} MHz entre ${p1} (PSC = ${p1 - 1}) para tener ticks de ${fHz(tick)}; luego cuenta ${a1} ticks (ARR = ${a1 - 1}). Los registros guardan “divisor − 1”.`);
  }, 'st_timer');

  GA('st_duty', () => {
    let arr, d, ccr;
    do { arr = pick([99, 199, 249, 499, 999, 1999, 3599, 9999]); d = pick([10, 20, 25, 40, 50, 75, 80, 90]); ccr = (arr + 1) * d / 100; } while (!Number.isInteger(ccr));
    if (Math.random() < 0.5) return N(`PWM modo 1 con ARR = ${arr}. ¿Qué CCR da un ${d} % de ciclo de trabajo?`, ccr, '', `Hay ARR + 1 = ${arr + 1} pasos por periodo. ${d} % de ${arr + 1} = ${ccr}. Si usas ARR en vez de ARR + 1 te equivocas un poco.`, 0.5);
    return N(`PWM modo 1 con ARR = ${arr} y CCR = ${ccr}. ¿Ciclo de trabajo en %?`, d, '%', `Duty = CCR / (ARR + 1) = ${ccr} / ${arr + 1} = ${d} %.`, 0.05);
  }, 'st_duty');

  GA('st_brr', () => {
    let pclk, baud, brr;
    do { pclk = pick([8, 16, 36, 42, 50, 84, 100]); baud = pick([9600, 19200, 57600, 115200, 230400, 921600]); brr = Math.round(pclk * 1e6 / baud); } while (brr < 16);
    const mant = brr >> 4, frac = brr & 15;
    const wrong = [hex(Math.floor(pclk * 1e6 / (16 * baud)), 4), hex(Math.round(pclk * 1e6 / baud / 2), 4), hex(Math.round(2 * pclk * 1e6 / baud), 4)];
    if (/^\d+$/.test(String(brr)) && brr >= 10) wrong.unshift('0x' + String(brr).padStart(4, '0'));
    return MC(`USART con PCLK = ${pclk} MHz, sobremuestreo ×16 y ${baud} baudios. ¿Qué valor escribes en BRR?`, hex(brr, 4), wrong,
      `BRR = fPCLK / baudios = ${fmt(pclk * 1e6 / baud, 2)} → ${brr} = ${hex(brr, 4)} (mantisa ${mant}, fracción ${frac}/16). No confundas el número decimal con su escritura hexadecimal.`);
  }, 'st_brr');

  GA('st_baudErr', () => {
    const pclk = pick([8, 16, 42, 48, 50, 84]), baud = pick([9600, 115200, 230400, 460800, 921600]);
    const brr = Math.round(pclk * 1e6 / baud);
    if (brr < 16) return Gen.make('st_baudErr');
    const real = pclk * 1e6 / brr, err = Math.abs(real - baud) / baud * 100;
    return N(`PCLK = ${pclk} MHz y quieres ${baud} baudios (×16). BRR se redondea a ${brr}. ¿Error de velocidad en %? (valor absoluto)`, err, '%', `Velocidad real = ${pclk} MHz / ${brr} = ${fmt(real, 0)} baudios → error ${fmt(err, 2)} %. Por encima de un 2 % la comunicación empieza a fallar.`, Math.max(0.02, err * 0.03));
  }, 'st_brr');

  GA('st_adcTime', () => {
    let pclk, pre; do { pclk = pick([60, 72, 84, 100]); pre = pick([2, 4, 6, 8]); } while (pclk / pre > 36);
    const clk = pclk / pre, smp = pick([3, 15, 28, 56, 84, 112, 144, 480]), t = (smp + 12) / clk;
    const c = ri(0, 2);
    if (c === 0) return N(`ADC de la F4: PCLK2 = ${pclk} MHz, preescalador ÷${pre}, ${smp} ciclos de muestreo, 12 bits. ¿Tiempo de conversión en µs?`, t, 'µs', `fADC = ${fmt(clk, 2)} MHz. tconv = (${smp} + 12) / ${fmt(clk, 2)} MHz = ${fmt(t, 3)} µs.`, Math.max(0.01, t * 0.01));
    if (c === 1) return N(`fADC = ${fmt(clk, 2)} MHz, ${smp} ciclos de muestreo, 12 bits, un canal en continuo. ¿Muestras por segundo, en miles (kS/s)?`, 1000 / t, 'kS/s', `tconv = (${smp} + 12) / fADC = ${fmt(t, 3)} µs → ${fmt(1000 / t, 1)} kS/s.`, Math.max(0.5, 1000 / t * 0.01));
    const n = pick([2, 3, 4, 8]);
    return N(`Escaneo de ${n} canales con fADC = ${fmt(clk, 2)} MHz y ${smp} ciclos cada uno (12 bits). ¿Cada canal se muestrea cada cuántos µs?`, n * t, 'µs', `Cada conversión ${fmt(t, 3)} µs; ${n} canales en fila: ${fmt(n * t, 3)} µs por vuelta.`, Math.max(0.02, n * t * 0.01));
  }, 'st_adc');

  const PERIPH = [
    ['GPIOA', 0x40020000, 'g'], ['GPIOB', 0x40020400, 'g'], ['GPIOC', 0x40020800, 'g'], ['RCC', 0x40023800, 'r'],
    ['USART2', 0x40004400, 'u'], ['USART1', 0x40011000, 'u'], ['TIM2', 0x40000000, 't'], ['TIM3', 0x40000400, 't']];
  const REGS = {
    g: [['MODER', 0x00], ['OTYPER', 0x04], ['PUPDR', 0x0C], ['IDR', 0x10], ['ODR', 0x14], ['BSRR', 0x18], ['AFR[1]', 0x24]],
    r: [['PLLCFGR', 0x04], ['CFGR', 0x08], ['AHB1ENR', 0x30], ['APB1ENR', 0x40], ['APB2ENR', 0x44]],
    u: [['SR', 0x00], ['DR', 0x04], ['BRR', 0x08], ['CR1', 0x0C]],
    t: [['SR', 0x10], ['CNT', 0x24], ['PSC', 0x28], ['ARR', 0x2C], ['CCR1', 0x34]]
  };
  GA('st_regAddr', () => {
    const [p, base, k] = pick(PERIPH), [r, off] = pick(REGS[k]);
    const right = hex(base + off), wrong = [hex(base + off * 4), hex(base + 0x400 + off), hex(base + off + 0x100)];
    const asDec = off.toString(16);
    if (/^\d+$/.test(asDec) && off >= 0x10) wrong.unshift(hex(base + parseInt(asDec, 10)));
    return MC(`STM32F4: ${p} empieza en ${hex(base)} y ${r} está en el desplazamiento ${hex(off, 2)}. ¿Dirección de ${p}->${r}?`, right, wrong, `Dirección = base + desplazamiento = ${hex(base)} + ${hex(off, 2)} = ${right}. Suma en hexadecimal: ${hex(off, 2)} no es ${off.toString(16)} en decimal.`);
  }, 'st_regaddr');

  GA('st_moder', () => {
    const port = pick(['A', 'B', 'C']), pin = ri(0, 15), mode = pick([1, 2, 3]);
    const right = hex((mode << (2 * pin)) >>> 0);
    const wrong = [hex(mode << pin), hex(((3 - mode) & 3) << (2 * pin)), hex((mode << (2 * pin + 1)) >>> 0), hex((mode << (2 * pin + 2)) >>> 0)];
    return MC(`Quieres P${port}${pin} en modo ${MODE_NAME[mode]} (${mode.toString(2).padStart(2, '0')} en binario). ¿Qué valor tiene solo su campo de MODER, ya desplazado?`, right, wrong.filter(w => w !== hex(0)),
      `Cada pin ocupa 2 bits: el campo de P${port}${pin} empieza en el bit ${2 * pin}. ${mode.toString(2).padStart(2, '0')} << ${2 * pin} = ${right}. Antes de escribirlo, limpia el campo con &= ~(3U << ${2 * pin}).`);
  }, 'st_field');

  GA('st_bsrr', () => {
    const pin = ri(0, 15), set = Math.random() < 0.5, port = pick(['A', 'B', 'C']);
    const right = hex(set ? 1 << pin : (1 << (pin + 16)) >>> 0);
    const wrong = [hex(set ? (1 << (pin + 16)) >>> 0 : 1 << pin), hex(~(1 << pin)), hex((1 << (2 * pin)) >>> 0), hex(pin)];
    return MC(`¿Qué escribes en GPIO${port}->BSRR para ${set ? 'poner a 1' : 'poner a 0'} P${port}${pin} sin tocar los demás pines?`, right, wrong,
      `BSRR: los bits 0–15 ponen a 1 (BS) y los bits 16–31 ponen a 0 (BR). ${set ? `Bit ${pin}` : `Bit ${pin} + 16 = ${pin + 16}`} → ${right}. Los ceros no hacen nada, por eso es atómico.`);
  }, 'st_bsrr');

  GA('st_iwdg', () => {
    const pr = pick([4, 8, 16, 32, 64, 128, 256]), rlr = pick([99, 249, 499, 999, 1999, 2499, 4095]);
    const t = pr * (rlr + 1) / 32;
    if (Math.random() < 0.4) {
      const tt = pick([250, 500, 1000, 2000, 4000]), p2 = pick([32, 64, 128]), r2 = tt * 32 / p2 - 1;
      if (r2 > 4095 || r2 < 1 || !Number.isInteger(r2)) return Gen.make('st_iwdg');
      return N(`IWDG con LSI de 32 kHz y preescalador ÷${p2}. ¿Qué RLR da un tiempo de ${tt} ms?`, r2, '', `RLR + 1 = t × fLSI / preescalador = ${tt} ms × 32 kHz / ${p2} = ${r2 + 1} → RLR = ${r2}. Máximo 4095 (12 bits).`, 0.5);
    }
    return N(`IWDG: LSI de 32 kHz, preescalador ÷${pr}, RLR = ${rlr}. ¿Tiempo hasta el reset en ms?`, t, 'ms', `t = ${pr} × (${rlr} + 1) / 32 kHz = ${fmt(t, 2)} ms. Ojo: el LSI de la F4 puede ir de unos 17 a 47 kHz, así que deja margen.`, Math.max(0.1, t * 0.01));
  }, 'st_iwdgcalc');

  GA('st_memUse', () => {
    const text = ri(80, 600) * 100 + ri(0, 99), data = ri(20, 900), bss = ri(10, 300) * 64;
    return MC(`arm-none-eabi-size da text = ${text}, data = ${data}, bss = ${bss}. ¿Cuánto ocupa en Flash y en RAM estática?`, `Flash ${text + data} B · RAM ${data + bss} B`,
      [`Flash ${text} B · RAM ${bss} B`, `Flash ${text + data + bss} B · RAM ${bss} B`, `Flash ${text} B · RAM ${text + data + bss} B`],
      '.text va a Flash. .data ocupa Flash (los valores iniciales) y RAM (las variables). .bss solo RAM. Flash = text + data; RAM = data + bss (más pila y montón).');
  }, 'st_sections');

  GA('st_systick', () => {
    const f = pick([16, 48, 72, 84, 100, 168, 180]), hz = pick([1000, 1000, 100, 10000]);
    const r = f * 1e6 / hz - 1;
    return N(`SysTick con reloj de ${f} MHz. ¿Qué valor de recarga (LOAD) da una interrupción cada ${fmt(1000 / hz, 2)} ms?`, r, '', `LOAD = fCPU / ftick − 1 = ${f * 1e6} / ${hz} − 1 = ${r}. Cabe en 24 bits (máximo 16 777 215).`, 0.5);
  }, 'st_systick');

  GA('st_crystal', () => {
    const cl = pick([6, 7, 8, 9, 10, 12, 12.5, 18, 20]), cs = pick([2, 3, 4, 5]);
    return N(`Cristal con capacidad de carga CL = ${fmt(cl)} pF y unos ${cs} pF parásitos. ¿Qué condensador pones a cada lado, en pF?`, 2 * (cl - cs), 'pF', `C = 2 × (CL − Cpar) = 2 × (${fmt(cl)} − ${cs}) = ${fmt(2 * (cl - cs))} pF. Luego eliges el valor comercial más cercano.`, 0.3);
  }, 'st_crystal');

  GA('st_dmaHalf', () => {
    const fs = pick([8000, 16000, 44100, 48000, 100000]), n = pick([256, 512, 1024, 2048]), ch = pick([1, 2]);
    const t = n / 2 / (fs * ch) * 1000;
    return N(`DMA circular con un búfer de ${n} muestras${ch === 2 ? ' (dos canales intercalados, cada uno' : ' (un canal'} a ${fs} Hz). ¿Tiempo entre la interrupción de mitad (HT) y la de completo (TC), en ms?`, t, 'ms', `Media vuelta son ${n / 2} muestras; llegan ${fs * ch} muestras por segundo → ${fmt(t, 3)} ms. Ese es tu plazo para procesar cada mitad.`, Math.max(0.01, t * 0.01));
  }, 'st_dma');

  GA('st_canBit', () => {
    const [f, brp, bs1, bs2] = pick([[42, 6, 11, 2], [42, 3, 11, 2], [42, 12, 11, 2], [42, 21, 13, 2], [36, 4, 13, 4], [36, 2, 15, 2], [45, 5, 15, 2], [36, 9, 13, 2]]);
    const tq = 1 + bs1 + bs2, rate = f * 1000 / (brp * tq), sp = (1 + bs1) / tq * 100;
    if (Math.random() < 0.5) return N(`bxCAN con PCLK1 = ${f} MHz, preescalador ${brp}, BS1 = ${bs1} tq y BS2 = ${bs2} tq. ¿Velocidad en kbit/s?`, rate, 'kbit/s', `Un bit = 1 + BS1 + BS2 = ${tq} cuantos; tq = ${brp} / ${f} MHz. Velocidad = ${f} MHz / (${brp} × ${tq}) = ${fmt(rate, 2)} kbit/s.`, Math.max(0.5, rate * 0.005));
    return N(`bxCAN con BS1 = ${bs1} tq y BS2 = ${bs2} tq. ¿Punto de muestreo en %?`, sp, '%', `Se muestrea tras el segmento de sincronismo y BS1: (1 + ${bs1}) / ${tq} = ${fmt(sp, 1)} %. En CAN se busca alrededor del 87,5 %.`, 0.3);
  }, 'st_canbit');

  GA('st_stack', () => {
    const w = pick([128, 256, 384, 512]), hw = ri(8, 80);
    if (Math.random() < 0.5) return N(`CubeMX crea una tarea con “Stack Size (Words)” = ${w}. ¿Cuántos bytes de pila son?`, w * 4, 'B', `En un Cortex-M una palabra son 4 bytes: ${w} × 4 = ${w * 4} B. En CMSIS-RTOS v2, .stack_size se da en bytes.`);
    return N(`Una tarea tiene ${w} palabras de pila y uxTaskGetStackHighWaterMark devuelve ${hw}. ¿Cuántos bytes ha llegado a usar como máximo?`, (w - hw) * 4, 'B', `La marca de agua es lo que NUNCA se ha usado (en palabras): (${w} − ${hw}) × 4 = ${(w - hw) * 4} B usados.`);
  }, 'st_stack');

  /* ======================= VISUALIZACIONES ======================= */
  const num = HX.num;
  const fMHz = v => num(v, v < 10 ? 3 : 2) + ' MHz';
  const bx = (x, y, w, t1, t2, bad) => `<rect x="${x}" y="${y}" width="${w}" height="38" rx="7" fill="none" stroke="${bad ? 'var(--err)' : 'currentColor'}" stroke-width="${bad ? 2.6 : 1.5}"/><text x="${x + w / 2}" y="${y + 15}" text-anchor="middle" class="vizsm">${t1}</text><text x="${x + w / 2}" y="${y + 31}" text-anchor="middle" class="vizlab"${bad ? ' style="fill:var(--err)"' : ''}>${t2}</text>`;
  const arrow = (x1, y1, x2, y2) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 6; return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="var(--muted)" stroke-width="1.6"/><path d="M${x2} ${y2}l${(-h * Math.cos(a - 0.45)).toFixed(1)} ${(-h * Math.sin(a - 0.45)).toFixed(1)}M${x2} ${y2}l${(-h * Math.cos(a + 0.45)).toFixed(1)} ${(-h * Math.sin(a + 0.45)).toFixed(1)}" stroke="var(--muted)" stroke-width="1.6"/>`; };

  Object.assign(Widgets.VIZ, {
    st_clock: {
      calc: p => {
        const vin = p.HSE / p.M, vco = vin * p.N, sys = vco / p.P, p1 = sys / p.A1, p2 = sys / p.A2;
        const bad = { vin: vin < 0.95 || vin > 2.1, vco: vco < 100 || vco > 432, sys: sys > 100, p1: p1 > 50, p2: p2 > 100 };
        const ok = !Object.values(bad).some(Boolean), q = vco / 48, usb = Math.abs(q - Math.round(q)) < 1e-6 && q >= 2 && q <= 15;
        return { vin, vco, sys, p1, p2, t1: p.A1 === 1 ? p1 : 2 * p1, t2: p.A2 === 1 ? p2 : 2 * p2, q, bad, ok: ok ? 1 : 0, usb: usb ? 1 : 0, sysOk: ok ? sys : 0, usbOk: ok && usb ? sys : 0 };
      },
      svg: (p, o) => {
        const b = o.bad, errs = [b.vin && 'entrada del VCO', b.vco && 'VCO', b.sys && 'SYSCLK', b.p1 && 'APB1', b.p2 && 'APB2'].filter(Boolean);
        return `<svg viewBox="0 0 300 232" class="viz">
          ${bx(4, 6, 84, 'HSE', p.HSE + ' MHz', false)}${arrow(88, 25, 104, 25)}
          ${bx(106, 6, 90, '÷M = ' + p.M, fMHz(o.vin), b.vin)}${arrow(196, 25, 210, 25)}
          ${bx(212, 6, 84, '×N = ' + p.N + ' (VCO)', fMHz(o.vco), b.vco)}${arrow(254, 44, 254, 64)}
          ${bx(212, 66, 84, '÷P = ' + p.P + ' SYSCLK', fMHz(o.sys), b.sys)}${arrow(212, 85, 198, 85)}
          ${bx(106, 66, 90, 'AHB ÷1 · HCLK', fMHz(o.sys), b.sys)}
          ${bx(4, 66, 84, 'USB ÷Q', o.usb ? 'Q = ' + Math.round(o.q) + ' ✓' : 'sin 48 MHz', false)}
          ${arrow(130, 104, 75, 128)}${arrow(170, 104, 222, 128)}
          ${bx(4, 130, 142, 'APB1 ÷' + p.A1 + ' (máx. 50)', fMHz(o.p1), b.p1)}${bx(154, 130, 142, 'APB2 ÷' + p.A2 + ' (máx. 100)', fMHz(o.p2), b.p2)}
          <text x="75" y="184" text-anchor="middle" class="vizsm">TIM2–5: ${fMHz(o.t1)}</text><text x="225" y="184" text-anchor="middle" class="vizsm">TIM1, 9–11: ${fMHz(o.t2)}</text>
          <text x="150" y="206" text-anchor="middle" class="vizlab"${o.ok ? ' style="fill:var(--ok)"' : ' style="fill:var(--err)"'}>${o.ok ? 'Dentro de los límites del STM32F411' : 'Fuera de límite: ' + errs.join(', ')}</text>
          <text x="150" y="224" text-anchor="middle" class="vizsm">Entrada VCO 1–2 · VCO 100–432 · SYSCLK ≤ 100 MHz</text></svg>`;
      }
    },
    st_pwm: {
      calc: p => { const f = p.F * 1e6 / ((p.PSC + 1) * (p.ARR + 1)), duty = Math.min(p.CCR, p.ARR + 1) / (p.ARR + 1) * 100; return { f, duty, tick: (p.PSC + 1) / p.F }; },
      svg: (p, o) => {
        const x0 = 20, w = 260, per = w / 3, top = 30, bot = 108, ccrF = Math.min(1, p.CCR / (p.ARR + 1));
        let saw = '', out = `M${x0} 160`;
        for (let k = 0; k < 3; k++) { const xs = x0 + k * per; saw += `M${xs} ${bot}L${xs + per} ${top}${k < 2 ? `M${xs + per} ${top}L${xs + per} ${bot}` : ''}`; const xc = xs + per * ccrF; out += ccrF >= 1 ? `V128H${xs + per}` : ccrF > 0 ? `V128H${xc}V160H${xs + per}` : `H${xs + per}`; }
        const yc = bot - (bot - top) * ccrF;
        return `<svg viewBox="0 0 300 200" class="viz"><path d="${saw}" fill="none" stroke="var(--ice)" stroke-width="2.2"/>
          <path d="M${x0} ${yc}H${x0 + w}" stroke="var(--err)" stroke-dasharray="5 4"/><text x="${x0 + w}" y="${yc - 4}" text-anchor="end" class="vizsm">CCR = ${p.CCR}</text>
          <text x="${x0}" y="22" class="vizsm">CNT: de 0 a ARR = ${p.ARR}</text>
          <path d="${out}" fill="none" stroke="var(--led)" stroke-width="2.6"/><text x="${x0}" y="176" class="vizsm">Salida PWM (modo 1: alta mientras CNT &lt; CCR)</text>
          <text x="${x0}" y="194" class="vizlab">f = ${fHz(o.f)} · duty ${num(o.duty, 1)} % · tick ${o.tick >= 1 ? num(o.tick, 2) + ' µs' : num(o.tick * 1000, 1) + ' ns'}</text></svg>`;
      }
    },
    st_dma: {
      anim: true,
      calc: p => { const half = p.N / 2 / p.fs; return { half, load: p.T / half * 100 }; },
      svg: (p, o, t) => {
        const cyc = 4, ph = (t % cyc) / cyc, segs = 16, cx = 72, cy = 92, R = 58, r = 36, over = o.load > 100;
        let s = '';
        for (let i = 0; i < segs; i++) {
          const a0 = (i / segs) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / segs) * 2 * Math.PI - Math.PI / 2;
          const pt = (rr, a) => `${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
          const filled = (i + 1) / segs <= ph + 1e-9, col = i < segs / 2 ? 'var(--ice)' : 'var(--led)';
          s += `<path d="M${pt(R, a0)}A${R} ${R} 0 0 1 ${pt(R, a1)}L${pt(r, a1)}A${r} ${r} 0 0 0 ${pt(r, a0)}Z" fill="${col}" opacity="${filled ? 0.85 : 0.18}" stroke="var(--board)" stroke-width="1"/>`;
        }
        const ap = ph * 2 * Math.PI - Math.PI / 2, px = cx + (R + 8) * Math.cos(ap), py = cy + (R + 8) * Math.sin(ap);
        const inB = ph >= 0.5, prog = Math.min(1, ((ph % 0.5) / 0.5) * 100 / Math.max(1, o.load));
        const flash = (ph % 0.5) < 0.08 ? (inB ? 'HT: mitad A lista' : 'TC: mitad B lista') : '';
        return `<svg viewBox="0 0 300 190" class="viz">${s}<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5" fill="var(--err)"/>
          <text x="${cx}" y="88" text-anchor="middle" class="vizsm">DMA</text><text x="${cx}" y="102" text-anchor="middle" class="vizsm">circular</text>
          <text x="148" y="34" class="vizlab">${flash ? flash : 'El DMA llena la mitad ' + (inB ? 'B' : 'A')}</text>
          <text x="148" y="56" class="vizsm">CPU procesa la mitad ${inB ? 'A' : 'B'}</text>
          <rect x="148" y="64" width="140" height="12" rx="4" fill="var(--line)"/><rect x="148" y="64" width="${(140 * (over ? 1 : prog)).toFixed(1)}" height="12" rx="4" fill="${over ? 'var(--err)' : 'var(--ok)'}"/>
          <text x="148" y="100" class="vizsm">HT/TC cada ${num(o.half, 2)} ms</text>
          <text x="148" y="118" class="vizsm">Proceso: ${num(p.T, 1)} ms por mitad</text>
          <text x="148" y="140" class="vizlab"${over ? ' style="fill:var(--err)"' : ''}>Carga de CPU ${num(o.load, 0)} %</text>
          <text x="10" y="180" class="vizsm">${over ? 'Desbordamiento: el DMA pisa datos sin procesar' : 'Hay tiempo de sobra antes de la siguiente mitad'}</text></svg>`;
      }
    },
    st_nvic: {
      anim: true,
      calc: p => { const pre = p.pB < p.pA; return { pre: pre ? 1 : 0, latB: pre ? 0 : 2.5 }; },
      svg: (p, o, t) => {
        const X = u => 40 + u * 25, cur = (t % 6) / 6 * 10;
        const segA = o.pre ? [[1, 2.5], [4, 6.5]] : [[1, 5]], segB = o.pre ? [[2.5, 4]] : [[5, 6.5]], segM = o.pre ? [[0, 1], [6.5, 10]] : [[0, 1], [6.5, 10]];
        const bars = (segs, y, col) => segs.map(([a, b]) => `<rect x="${X(a)}" y="${y}" width="${X(b) - X(a)}" height="20" rx="4" fill="${col}" opacity="${cur >= a ? 0.9 : 0.25}"/>`).join('');
        return `<svg viewBox="0 0 300 190" class="viz"><text x="4" y="40" class="vizsm">main</text><text x="4" y="76" class="vizsm">TIM2</text><text x="4" y="112" class="vizsm">USART2</text>
          ${bars(segM, 26, 'var(--muted)')}${bars(segA, 62, 'var(--ice)')}${bars(segB, 98, 'var(--led)')}
          <path d="M${X(1)} 56v-6M${X(2.5)} 92v-6" stroke="var(--err)" stroke-width="2"/><text x="${X(1) + 3}" y="56" class="vizsm">llega</text><text x="${X(2.5) + 3}" y="92" class="vizsm">llega</text>
          <path d="M${X(cur).toFixed(1)} 20V124" stroke="var(--err)" stroke-width="1.5"/>
          <text x="10" y="148" class="vizlab">TIM2 prioridad ${p.pA} · USART2 prioridad ${p.pB}</text>
          <text x="10" y="166" class="vizsm">${o.pre ? 'USART2 es más urgente (número menor): interrumpe a TIM2' : p.pA === p.pB ? 'Misma prioridad: USART2 espera (encadenamiento al acabar)' : 'USART2 es menos urgente: espera a que acabe TIM2'}</text>
          <text x="10" y="183" class="vizsm">USART2 espera ${num(o.latB, 1)} µs antes de empezar</text></svg>`;
      }
    },
    st_adc: {
      calc: p => {
        const clk = 84 / p.pre, ts = p.smp / clk, tconv = (p.smp + 12) / clk, tau = (p.R + 6) * 0.004, err = 4096 * Math.exp(-ts / tau);
        const valid = clk <= 36, good = valid && err < 0.5;
        return { clk, ts, tconv, fs: 1 / tconv, err, ok: valid ? 1 : 0, good: good ? 1 : 0, fsOk: good ? 1 / tconv : 0, e47: p.R === 47 && good ? 1 : 0, fast: good && 1 / tconv >= 0.7 ? 1 : 0 };
      },
      svg: (p, o) => {
        const pts = []; for (let i = 0; i <= 40; i++) { const x = i / 40 * o.ts; pts.push(`${(30 + i * 6).toFixed(1)},${(110 - 80 * (1 - Math.exp(-x / ((p.R + 6) * 0.004)))).toFixed(1)}`); }
        const bad = !o.ok, errTxt = o.err < 0.01 ? 'menos de 0,01' : num(o.err, o.err < 10 ? 2 : 0);
        return `<svg viewBox="0 0 300 200" class="viz"><path d="M30 20V110H275" stroke="currentColor" stroke-width="1.4" fill="none"/>
          <path d="M30 30H275" stroke="var(--muted)" stroke-dasharray="4 4"/><text x="272" y="26" text-anchor="end" class="vizsm">Vent</text>
          <polyline points="${pts.join(' ')}" fill="none" stroke="var(--led)" stroke-width="2.6"/>
          <text x="34" y="126" class="vizsm">Carga durante el muestreo: ${num(o.ts, 3)} µs</text>
          <text x="10" y="148" class="vizlab"${bad ? ' style="fill:var(--err)"' : ''}>fADC = ${num(o.clk, 2)} MHz${bad ? ' (supera 36 MHz)' : ''}</text>
          <text x="10" y="166" class="vizsm">tconv = (${p.smp} + 12) ciclos = ${num(o.tconv, 3)} µs → ${num(o.fs * 1000, 0)} kS/s</text>
          <text x="10" y="184" class="vizlab"${o.err >= 0.5 ? ' style="fill:var(--err)"' : ' style="fill:var(--ok)"'}>Error de carga: ${errTxt} LSB ${o.err >= 0.5 ? '(lectura baja)' : '(bien)'}</text>
          <text x="10" y="198" class="vizsm">Modelo F4: RADC ≈ 6 kΩ, CADC ≈ 4 pF, PCLK2 84 MHz</text></svg>`;
      }
    },
    st_reg: {
      calc: p => ({ val: (p.mode << (2 * p.pin)) >>> 0 }),
      svg: (p, o) => {
        let s = '';
        for (let row = 0; row < 2; row++) for (let i = 0; i < 16; i++) {
          const bit = 31 - (row * 16 + i), x = 10 + i * 17.5, y = 34 + row * 54, pin = bit >> 1, on = (o.val >>> bit) & 1, sel = pin === p.pin;
          s += `<rect x="${x}" y="${y}" width="16" height="22" rx="3" fill="${sel ? (on ? 'var(--led)' : 'var(--ice)') : 'none'}" opacity="${sel ? 0.9 : 1}" stroke="${sel ? 'currentColor' : 'var(--line)'}"/><text x="${x + 8}" y="${y + 16}" text-anchor="middle" class="vizsm" style="fill:currentColor">${on}</text>`;
          if (bit % 2 === 0) s += `<text x="${x - 0.5}" y="${y - 5}" text-anchor="middle" class="vizsm">${pin}</text>`;
        }
        return `<svg viewBox="0 0 300 200" class="viz"><text x="10" y="16" class="vizsm">GPIOx->MODER (pin sobre cada par de bits)</text>${s}
          <text x="10" y="134" class="vizlab">Valor: ${hex(o.val)}</text>
          <text x="10" y="154" class="vizsm">Bits ${2 * p.pin + 1}–${2 * p.pin} = ${p.mode.toString(2).padStart(2, '0')} (${MODE_NAME[p.mode]})</text>
          <text x="10" y="174" class="vizsm">MODER &amp;= ~(3U &lt;&lt; ${2 * p.pin});</text>
          <text x="10" y="192" class="vizsm">MODER |= (${p.mode}U &lt;&lt; ${2 * p.pin});</text></svg>`;
      }
    }
  });

  /* ======================= PROYECTOS ======================= */

  /* ======================= VISUALIZACIONES PARA TOCAR (lecciones) ======================= */
  const tx = (x, y, s, c = 'vizsm', st = '') => `<text x="${x}" y="${y}" class="${c}"${st ? ` style="${st}"` : ''}>${s}</text>`;
  const tm = (x, y, s, c = 'vizsm', st = '') => `<text x="${x}" y="${y}" text-anchor="middle" class="${c}"${st ? ` style="${st}"` : ''}>${s}</text>`;
  const rb = (x, y, w, h, f = 'none', s = 'currentColor', op = 1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${f}" fill-opacity="${op}" stroke="${s}" stroke-width="1.3"/>`;
  const OKS = ok => ok ? 'fill:var(--ok)' : 'fill:var(--err)';
  const SV = (h, body) => `<svg viewBox="0 0 300 ${h}" class="viz">${body}</svg>`;
  const pop = v => { let n = 0; v >>>= 0; while (v) { n += v & 1; v >>>= 1; } return n; };
  // 32 casillas de bits en dos filas (31…16 arriba, 15…0 abajo). col(bit) da el relleno.
  const bits32 = (y, val, col, lab) => {
    let s = '';
    for (let row = 0; row < 2; row++) for (let i = 0; i < 16; i++) {
      const bit = 31 - (row * 16 + i), x = 10 + i * 17.5, yy = y + row * 34, on = (val >>> bit) & 1, f = col(bit);
      s += `<rect x="${x}" y="${yy}" width="16" height="20" rx="3" fill="${f || 'none'}" fill-opacity="${f ? 0.75 : 1}" stroke="${f ? 'currentColor' : 'var(--line)'}"/><text x="${x + 8}" y="${yy + 14}" text-anchor="middle" class="vizsm" style="fill:currentColor">${on}</text>`;
      if (bit % 4 === 0) s += `<text x="${x + 8}" y="${yy + 30}" text-anchor="middle" class="vizsm">${bit}</text>`;
    }
    return (lab ? tx(10, y - 5, lab) : '') + s;
  };
  // Cadena de cajas con flechas (3 por fila, en zigzag). '|' parte la línea.
  const chain = (items, hi = -1) => {
    const per = 3, w = 88, g = 18, h = 36, vg = 22, rows = Math.ceil(items.length / per);
    const pos = i => { const r = Math.floor(i / per), c0 = i % per, c = r % 2 ? per - 1 - c0 : c0; return [c * (w + g), 6 + r * (h + vg), r]; };
    let s = '';
    items.forEach((t, i) => {
      const [x, y] = pos(i), L = String(t).split('|');
      s += `<rect x="${x + 1}" y="${y}" width="${w - 2}" height="${h}" rx="7" fill="${i === hi ? 'var(--ice)' : 'none'}" fill-opacity="${i === hi ? 0.3 : 1}" stroke="currentColor" stroke-width="1.4"/>`;
      L.forEach((l, k) => { s += tm(x + w / 2, y + h / 2 + 4 + (k - (L.length - 1) / 2) * 12, l, k ? 'vizsm' : 'vizlab', 'font-size:11px'); });
      if (i < items.length - 1) { const [x2, y2] = pos(i + 1); s += y2 === y ? arrow(x2 > x ? x + w - 1 : x + 1, y + h / 2, x2 > x ? x2 + 1 : x2 + w - 1, y + h / 2) : arrow(x + w / 2, y + h, x + w / 2, y2); }
    });
    return SV(10 + rows * (h + vg) - vg + 6, s);
  };
  // Parte un texto en líneas de como mucho n caracteres
  const wrapT = (t, n) => { const L = ['']; String(t).split(' ').forEach(w => { const c = L[L.length - 1]; if (c && (c + ' ' + w).length > n) L.push(w); else L[L.length - 1] = c ? c + ' ' + w : w; }); return L; };
  // Tabla de dos columnas: [izquierda, derecha, resaltar?]
  const table = (rows, title) => {
    const lw = Math.min(130, Math.max(...rows.map(r => String(r[0]).length)) * 7.2 + 20), cpl = Math.floor((290 - lw) / 5.6);
    const T = title ? wrapT(title, 40) : [];
    let s = T.map((l, k) => tx(8, 16 + k * 16, l, 'vizlab')).join(''), y = title ? 10 + T.length * 16 : 6;
    rows.forEach(([a, b, h]) => {
      const L = wrapT(b, cpl), LA = wrapT(a, Math.floor((lw - 18) / 7.2)), rh = 9 + Math.max(L.length, LA.length) * 13;
      s += `<rect x="4" y="${y}" width="292" height="${rh}" rx="5" fill="${h ? 'var(--ice)' : 'none'}" fill-opacity="${h ? 0.3 : 1}" stroke="var(--line)"/>` + LA.map((l, k) => tx(12, y + 15 + k * 13, l, 'vizlab', 'font-size:11.5px')).join('') + L.map((l, k) => tx(lw, y + 15 + k * 13, l, 'vizsm', 'fill:currentColor')).join('');
      y += rh + 4;
    });
    return SV(y + 2, s);
  };
  const IDS = [0x0F0, 0x120, 0x100, 0x101, 0x7FF, 0x065];
  const CORES = ['Cortex-M0+', 'Cortex-M3', 'Cortex-M4F', 'Cortex-M7', 'Cortex-M33'], CORE_EX = ['F0, G0, L0, C0', 'F1, L1', 'F3, F4, G4, L4', 'F7, H7', 'L5, U5, H5'];
  const OPS = ['Sumar enteros', 'Dividir enteros', 'Multiplicar float', 'Multiplicar double'];
  const CORE_HW = [[1, 0, 0, 0], [1, 1, 0, 0], [1, 1, 1, 0], [1, 1, 1, 1], [1, 1, 1, 0]];
  const PINS = [['C', 48], ['R', 64], ['V', 100], ['Z', 144]], FLS = [['8', 64], ['B', 128], ['C', 256], ['E', 512], ['G', 1024]];
  const GREG = [['MODER', 0x00], ['OTYPER', 0x04], ['OSPEEDR', 0x08], ['PUPDR', 0x0C], ['IDR', 0x10], ['ODR', 0x14], ['BSRR', 0x18], ['AFR[0]', 0x20]];
  const BOOT_STEPS = ['Reset: el núcleo aún no ha hecho nada', 'Lee la palabra 0: MSP = 0x20020000', 'Lee la palabra 1: salta a Reset_Handler', 'SystemInit: enciende la FPU', 'Copia .data de la Flash a la RAM', 'Pone .bss a cero', 'Llama a main()'];
  const OSC = [['HSI', 'RC interno 16 MHz', 10000], ['HSE', 'Cristal externo', 30], ['LSI', 'RC interno ~32 kHz', 470000], ['LSE', 'Cristal 32,768 kHz', 20]];
  const FOLD = [0xFF, 0x0F, 0xA5, 0x00], FNEW = [0xF0, 0x5A, 0x0F, 0xFF];
  const b8 = v => v.toString(2).padStart(8, '0');
  const h2 = v => '0x' + v.toString(16).toUpperCase().padStart(2, '0');

  Object.assign(Widgets.VIZ, {
    // st1 · 8 frente a 32 bits: cuántas sumas hacen falta
    st_width: {
      calc: p => { const need = p.a <= 255 ? 8 : p.a <= 65535 ? 16 : 32, instr = Math.max(1, need / p.bits); return { need, instr, w32: need === 32 && instr === 1 ? 1 : 0 }; },
      svg: (p, o) => {
        const hx = p.a.toString(16).toUpperCase().padStart(o.need / 4, '0'), ch = Math.max(1, p.bits / 4), parts = [];
        for (let i = hx.length; i > 0; i -= ch) parts.unshift(hx.slice(Math.max(0, i - ch), i));
        let s = tx(10, 18, `Número: ${num(p.a, 0)} → necesita ${o.need} bits (0x${hx})`, 'vizlab');
        const w = 280 / parts.length;
        parts.forEach((t, i) => { s += rb(10 + i * w, 30, w - 6, 30, i === parts.length - 1 ? 'var(--ice)' : 'var(--led)', 'currentColor', 0.3) + tm(10 + i * w + (w - 6) / 2, 50, t, 'vizlab'); });
        s += tx(10, 82, `Registro de la CPU: ${p.bits} bits. Cada trozo es una suma:`);
        parts.slice().reverse().forEach((t, i) => { s += tx(20, 102 + i * 16, `${i + 1}. ${i ? 'ADC (suma con el acarreo)' : 'ADD'} sobre 0x${t}`, 'vizsm', 'fill:currentColor'); });
        s += tx(10, 172, `${o.instr} ${o.instr === 1 ? 'instrucción' : 'instrucciones'} por suma`, 'vizlab', o.instr === 1 ? OKS(1) : OKS(0));
        return SV(182, s);
      }
    },
    // st2 · qué hace cada núcleo por hardware
    st_cores: {
      calc: p => { const hw = CORE_HW[p.core][p.op]; return { hw, fhw: p.op === 2 && hw ? 1 : 0, dhw: p.op === 3 && hw ? 1 : 0, nodiv: p.op === 1 && !hw ? 1 : 0 }; },
      svg: (p, o) => {
        let s = OPS.map((t, j) => tm(122 + j * 46, 14, ['Sumar', 'Dividir', 'float ×', 'double ×'][j], 'vizsm', j === p.op ? 'fill:currentColor;font-weight:700' : '')).join('');
        CORES.forEach((c, i) => {
          const y = 22 + i * 22, sel = i === p.core;
          s += `<rect x="2" y="${y}" width="296" height="20" rx="5" fill="${sel ? 'var(--ice)' : 'none'}" fill-opacity=".3" stroke="var(--line)"/>` + tx(8, y + 14, c, sel ? 'vizlab' : 'vizsm', 'font-size:11px');
          CORE_HW[i].forEach((h, j) => { s += tm(122 + j * 46, y + 14, h ? '✓' : '·', 'vizlab', h ? 'fill:var(--ok)' : 'fill:var(--muted)'); });
        });
        const txt = o.hw ? (p.op === 1 ? 'por hardware: unos 2–12 ciclos' : p.op === 3 ? 'por hardware (FPU doble del H7 y algunos F7)' : 'por hardware: 1 ciclo o casi') : 'por software: decenas de ciclos';
        s += tx(8, 148, `${CORES[p.core]} (${CORE_EX[p.core]})`, 'vizlab') + tx(8, 166, `${OPS[p.op]}: ${txt}`, 'vizsm', o.hw ? 'fill:var(--ok)' : 'fill:var(--err)') + tx(8, 182, 'Ciclos orientativos: dependen del chip y del compilador');
        return SV(188, s);
      }
    },
    // st3 · construir el código de un STM32
    st_part: {
      calc: p => { const pn = PINS[p.pins][1], kb = FLS[p.fl][1]; return { pinsN: pn, kb, g1: pn === 64 && kb === 512 ? 1 : 0, g2: pn === 48 && kb === 64 && p.pkg === 1 ? 1 : 0, g3: p.tmp === 1 ? 1 : 0 }; },
      svg: (p, o) => {
        const ch = [['STM32', 'marca'], ['F', 'familia'], ['4xx', 'línea'], [PINS[p.pins][0], o.pinsN + ' patas'], [FLS[p.fl][0], o.kb + ' KB'], [p.pkg ? 'U' : 'T', p.pkg ? 'QFN' : 'LQFP'], [p.tmp ? '7' : '6', p.tmp ? '≤105 °C' : '≤85 °C']];
        const W = [58, 26, 42, 40, 44, 40, 40]; let x = 4, s = '';
        ch.forEach(([a, b], i) => { const v = i >= 3; s += `<rect x="${x}" y="20" width="${W[i] - 3}" height="34" rx="6" fill="${v ? 'var(--ice)' : 'none'}" fill-opacity=".3" stroke="currentColor"/>` + tm(x + (W[i] - 3) / 2, 43, a, 'vizbig') + tm(x + (W[i] - 3) / 2, 72, b); x += W[i]; });
        s += tx(4, 100, `Patas: C 48 · R 64 · V 100 · Z 144`) + tx(4, 118, 'Flash: 8 64 KB · B 128 · C 256 · E 512 · G 1024') + tx(4, 136, 'Encapsulado: T con patas (LQFP) · U sin patas (QFN)') + tx(4, 154, 'Temperatura: 6 de −40 a 85 °C · 7 hasta 105 °C');
        s += tx(4, 176, 'No todas las combinaciones existen', 'vizsm', 'fill:currentColor');
        return SV(184, s);
      }
    },
    // st4 · LED activo a nivel alto o bajo
    st_board: {
      calc: p => { const on = p.board === 0 ? p.lvl === 1 : p.lvl === 0; return { on: on ? 1 : 0, nuOn: p.board === 0 && on ? 1 : 0, bpOn: p.board === 1 && on ? 1 : 0 }; },
      svg: (p, o) => {
        const nu = p.board === 0, pv = p.lvl ? '3,3 V' : '0 V';
        let s = tx(8, 16, nu ? 'Nucleo-64 · LED LD2 en PA5' : 'Black Pill · LED en PC13', 'vizlab');
        s += rb(14, 50, 70, 60) + tm(49, 76, nu ? 'PA5' : 'PC13', 'vizlab') + tm(49, 94, pv, 'vizsm', p.lvl ? 'fill:var(--led)' : '');
        s += `<path d="M84 80H120M150 80H190M240 80H262V${nu ? 130 : 30}" stroke="currentColor" stroke-width="2" fill="none"/>${rb(120, 72, 30, 16)}`;
        s += tm(276, nu ? 146 : 24, nu ? 'GND' : '3,3 V', 'vizlab') + `<g transform="translate(215 80) scale(.8)">${HX.ledBulb(o.on)}</g>`;
        s += tx(8, 160, `Escribes ${p.lvl} en el pin: el LED queda ${o.on ? 'ENCENDIDO' : 'apagado'}`, 'vizlab', o.on ? 'fill:var(--ok)' : '') + tx(8, 178, nu ? 'Corriente con el pin a 3,3 V: activo a nivel alto' : 'Corriente con el pin a 0 V: activo a nivel bajo');
        return SV(186, s);
      }
    },
    // st5 · el mapa de memoria y dónde acaba una región
    st_mem: {
      calc: p => { const base = p.reg ? 0x20000000 : 0x08000000, end = base + p.kb * 1024; return { end, last: end - 1 }; },
      svg: (p, o) => {
        const R = [['E000 0000', 'Núcleo', 14], ['4000 0000', 'Periféricos', 52], ['2000 0000', 'SRAM', 90], ['0800 0000', 'Flash', 128], ['0000 0000', 'Alias de arranque', 160]];
        let s = rb(8, 8, 22, 174, 'none', 'var(--line)');
        R.forEach(([a, n, y]) => { const sel = (p.reg && n === 'SRAM') || (!p.reg && n === 'Flash'); s += `<rect x="10" y="${y}" width="18" height="12" rx="2" fill="${sel ? 'var(--led)' : 'var(--ice)'}" fill-opacity="${sel ? 0.9 : 0.4}"/>` + tx(34, y + 6, '0x' + a, 'vizsm', sel ? 'fill:currentColor;font-weight:700' : '') + tx(34, y + 18, n, 'vizsm', sel ? 'fill:currentColor;font-weight:700' : ''); });
        s += tx(165, 22, 'Tamaño elegido:', 'vizsm') + tx(165, 38, `${p.kb} KB = ${num(p.kb * 1024, 0)} B`, 'vizlab') + tx(165, 54, `= ${hex(p.kb * 1024, 5)}`, 'vizsm', 'fill:currentColor');
        s += tx(165, 84, 'Empieza en', 'vizsm') + tx(165, 100, hex(o.end - p.kb * 1024), 'vizlab') + tx(165, 124, 'Última dirección', 'vizsm') + tx(165, 140, hex(o.last), 'vizlab') + tx(165, 164, 'Primera fuera', 'vizsm') + tx(165, 180, hex(o.end), 'vizlab', 'fill:var(--err)');
        return SV(188, s);
      }
    },
    // st6 · regenerar con CubeMX
    st_regen: {
      calc: p => { const lost = p.regen && p.zona === 0 ? 1 : 0; return { lost, ok: p.regen && p.zona === 1 ? 1 : 0 }; },
      svg: (p, o) => {
        const lines = ['/* USER CODE BEGIN WHILE */', 'while (1)', '{', '  /* USER CODE END WHILE */', '  /* USER CODE BEGIN 3 */', '}', '/* USER CODE END 3 */'];
        const at = p.zona ? 5 : 4, L = lines.slice(), Y = i => 20 + i * 15; L.splice(at, 0, '  parpadear();   // tu línea');
        const zone = (a, b) => `<rect x="6" y="${Y(a) - 11}" width="288" height="${(b - a) * 15 + 15}" rx="4" fill="var(--ok)" fill-opacity=".12" stroke="var(--ok)" stroke-dasharray="4 3"/>`;
        let s = zone(0, L.indexOf(lines[3])) + zone(L.indexOf(lines[4]), L.indexOf(lines[6]));
        L.forEach((l, i) => { const mine = i === at, gone = mine && o.lost; s += tx(14, Y(i), l.replace(/</g, '&lt;'), 'vizsm', mine ? (gone ? 'fill:var(--err);text-decoration:line-through' : 'fill:var(--ok);font-weight:700') : 'fill:currentColor;font-family:monospace'); });
        s += tx(10, 152, p.regen ? 'Has regenerado el código desde el .ioc' : 'Aún no has regenerado', 'vizlab') + tx(10, 172, o.lost ? 'Fuera de USER CODE: CubeMX la ha borrado' : p.regen ? 'Dentro de USER CODE: se conserva' : 'CubeMX respeta las zonas verdes', 'vizsm', o.lost ? 'fill:var(--err)' : '');
        return SV(180, s);
      }
    },
    // st7 · conexión SWD: masa común y velocidad frente a longitud
    st_swd: {
      calc: p => { const fmax = 40 / p.len, ok = p.gnd && p.f <= fmax + 1e-9 ? 1 : 0; return { fmax, ok, ok30: ok && p.len >= 30 ? 1 : 0 }; },
      svg: (p, o) => {
        let s = rb(6, 20, 70, 90) + tm(41, 40, 'ST-LINK', 'vizlab') + rb(224, 20, 70, 90) + tm(259, 40, 'STM32', 'vizlab');
        [['SWDIO · PA13', 56], ['SWCLK · PA14', 76], ['GND', 96]].forEach(([n, y], i) => { const miss = i === 2 && !p.gnd; s += `<path d="M76 ${y}H224" stroke="${miss ? 'var(--err)' : 'currentColor'}" stroke-width="2" ${miss ? 'stroke-dasharray="5 5"' : ''}/>` + tm(150, y - 4, n + (miss ? ' (sin conectar)' : '')); });
        const bad = !o.ok; let w = 'M20 150';
        for (let k = 0; k < 6; k++) { const x = 20 + k * 44; w += bad ? `L${x + 4} 128l3 6l3 -10l3 6H${x + 22}L${x + 26} 150l3 -6l3 8l3 -4H${x + 44}` : `L${x} 128H${x + 22}V150H${x + 44}`; }
        s += `<path d="${w}" fill="none" stroke="${bad ? 'var(--err)' : 'var(--ok)'}" stroke-width="2"/>`;
        s += tx(8, 174, `Cable ${p.len} cm · SWD a ${num(p.f, 1)} MHz (máx. orientativo ${num(o.fmax, 1)} MHz)`, 'vizsm', 'fill:currentColor') + tx(8, 192, !p.gnd ? 'Sin masa común no hay referencia: no conecta' : o.ok ? 'Conexión estable' : 'Flancos sucios: baja la frecuencia o acorta el cable', 'vizlab', OKS(o.ok));
        return SV(198, s);
      }
    },
    // st8 · cronómetro de ciclos DWT->CYCCNT
    st_cyc: {
      calc: p => ({ us: p.c / p.f }),
      svg: (p, o) => {
        const a = Math.min(1, o.us / 100) * 2 * Math.PI - Math.PI / 2, x = 70 + 46 * Math.cos(a), y = 92 + 46 * Math.sin(a);
        let s = `<circle cx="70" cy="92" r="52" fill="none" stroke="currentColor" stroke-width="2"/><path d="M70 92L${x.toFixed(1)} ${y.toFixed(1)}" stroke="var(--err)" stroke-width="3"/><circle cx="70" cy="92" r="4" fill="currentColor"/>` + tm(70, 160, 'escala 0–100 µs');
        s += tx(140, 40, 'Ciclos contados', 'vizsm') + tx(140, 58, num(p.c, 0), 'vizlab') + tx(140, 82, 'Reloj del núcleo', 'vizsm') + tx(140, 100, `${p.f} MHz → ${num(1000 / p.f, 2)} ns/ciclo`, 'vizlab');
        s += tx(140, 128, 'Tiempo = ciclos / f', 'vizsm') + tx(140, 148, `${num(o.us, 3)} µs`, 'vizbig');
        return SV(170, s);
      }
    },
    // st9 · lo que tarda un mensaje por la UART
    st_uarttx: {
      calc: p => ({ ms: p.n * 10 / p.baud * 1000 }),
      svg: (p, o) => {
        let s = tx(8, 16, `${p.n} caracteres × 10 bits = ${p.n * 10} bits`, 'vizlab'), k = Math.min(p.n, 24);
        for (let i = 0; i < k; i++) s += `<rect x="${8 + i * 11.5}" y="26" width="10" height="16" rx="2" fill="var(--ice)" fill-opacity=".6"/>`;
        if (p.n > k) s += tx(286, 40, '…');
        s += tx(8, 62, 'Cada carácter: inicio + 8 datos + parada') + HX.hbar(8, 96, 284, Math.min(1, o.ms / 10), o.ms > 1 ? 'var(--err)' : 'var(--ok)', 'CPU bloqueada en HAL_UART_Transmit (escala 0–10 ms)');
        s += tx(8, 126, `${num(o.ms, 3)} ms a ${num(p.baud, 0)} baudios`, 'vizbig') + tx(8, 146, `Bytes por segundo: ${num(p.baud / 10, 0)}`);
        return SV(154, s);
      }
    },
    // st10 y st15 · cuánto ocupa el programa en Flash y RAM
    st_sec: {
      calc: p => {
        const fl = p.text * 1024 + p.data, ram = p.data + p.bss * 1024, fcap = (512 - p.res) * 1024, fOver = fl > fcap ? 1 : 0, rOver = ram > 128 * 1024 ? 1 : 0;
        return { fl, ram, fOver, rOver, dataBoth: p.data === 4000 ? 1 : 0, resOver: p.res === 128 && fOver ? 1 : 0 };
      },
      svg: (p, o) => {
        const fcap = (512 - p.res) * 1024, W = 280;
        let s = tx(10, 16, 'STM32F411: 512 KB de Flash y 128 KB de RAM', 'vizlab');
        s += tx(10, 40, `Flash = text + data = ${num(o.fl / 1024, 1)} KB`, 'vizsm', 'fill:currentColor');
        s += `<rect x="10" y="46" width="${W}" height="18" rx="4" fill="var(--line)"/><rect x="10" y="46" width="${Math.min(W, W * p.text * 1024 / 524288)}" height="18" rx="4" fill="var(--ice)"/><rect x="${10 + Math.min(W, W * p.text * 1024 / 524288)}" y="46" width="${Math.min(W, W * p.data / 524288 + 2)}" height="18" fill="var(--led)"/>`;
        if (p.res) s += `<rect x="${10 + W * fcap / 524288}" y="44" width="${W * p.res * 1024 / 524288}" height="22" fill="var(--err)" fill-opacity=".25" stroke="var(--err)" stroke-dasharray="3 2"/>` + tx(10 + W * fcap / 524288 + 3, 80, 'reservado para datos', 'vizsm', 'fill:var(--err)');
        s += tx(10, 104, `RAM = data + bss = ${num(o.ram / 1024, 1)} KB (más pila y montón)`, 'vizsm', 'fill:currentColor');
        s += `<rect x="10" y="110" width="${W}" height="18" rx="4" fill="var(--line)"/><rect x="10" y="110" width="${Math.min(W, W * p.data / 131072 + 2)}" height="18" fill="var(--led)"/><rect x="${10 + Math.min(W, W * p.data / 131072 + 2)}" y="110" width="${Math.min(W, W * p.bss * 1024 / 131072)}" height="18" fill="var(--ok)"/>`;
        s += tx(10, 146, 'Azul: .text · ámbar: .data (en las dos) · verde: .bss');
        s += tx(10, 166, o.fOver ? 'No cabe en la Flash: el enlazador da error' : o.rOver ? 'No cabe en la RAM: el enlazador da error' : 'Cabe', 'vizlab', OKS(!o.fOver && !o.rOver));
        return SV(174, s);
      }
    },
    // st11 · dirección de un registro de GPIO
    st_addr: {
      calc: p => ({ addr: 0x40020000 + 0x400 * p.port + GREG[p.reg][1] }),
      svg: (p, o) => {
        const P = 'ABCD'[p.port], base = 0x40020000 + 0x400 * p.port;
        let s = tx(8, 16, `GPIO${P} empieza en ${hex(base)}`, 'vizlab');
        GREG.forEach(([n, off], i) => { const y = 24 + i * 16, sel = i === p.reg; s += `<rect x="8" y="${y}" width="150" height="14" rx="3" fill="${sel ? 'var(--led)' : 'none'}" fill-opacity=".5" stroke="var(--line)"/>` + tx(14, y + 11, `+${hex(off, 2)} ${n}`, 'vizsm', sel ? 'fill:currentColor;font-weight:700' : ''); });
        s += tx(170, 60, 'Base', 'vizsm') + tx(170, 76, hex(base), 'vizlab') + tx(170, 96, '+ desplazamiento', 'vizsm') + tx(170, 112, hex(GREG[p.reg][1], 2), 'vizlab') + tx(170, 134, '= dirección', 'vizsm') + tx(170, 150, hex(o.addr), 'vizlab', 'fill:var(--led)');
        s += tx(8, 172, `GPIO${P}->${GREG[p.reg][0]} es *(volatile uint32_t *)${hex(o.addr)}`, 'vizsm', 'fill:currentColor');
        return SV(180, s);
      }
    },
    // st12 · operaciones de bits sobre un registro de 32 bits
    st_reg32: {
      calc: p => {
        const V0 = 0xA8000000, m = (1 << p.bit) >>> 0;
        const val = [(V0 | m) >>> 0, (V0 & ~m) >>> 0, (V0 ^ m) >>> 0, m][p.op], ch = (val ^ V0) >>> 0;
        return { val, chg: pop(ch), bad: pop(ch & ~m) };
      },
      svg: (p, o) => {
        const V0 = 0xA8000000, ch = (o.val ^ V0) >>> 0, m = (1 << p.bit) >>> 0;
        const OP = ['REG |= (1U << n)', 'REG &= ~(1U << n)', 'REG ^= (1U << n)', 'REG = (1U << n)'][p.op].replace('n', p.bit);
        let s = tx(8, 14, `Antes: ${hex(V0)} (MODER de GPIOA, F407, tras reset)`, 'vizsm') + tx(8, 32, OP.replace(/</g, '&lt;'), 'vizlab');
        s += bits32(50, o.val, b => (ch >>> b) & 1 ? (((m >>> b) & 1) ? 'var(--ice)' : 'var(--err)') : ((m >>> b) & 1 ? 'var(--line)' : ''));
        s += tx(8, 134, `Después: ${hex(o.val)}`, 'vizlab') + tx(8, 154, o.bad ? `¡${o.bad} bits que no tocaban han cambiado! (en rojo)` : o.chg ? 'Solo ha cambiado el bit que querías (en azul)' : 'No ha cambiado nada: ese bit ya estaba así', 'vizsm', o.bad ? 'fill:var(--err)' : 'fill:var(--ok)');
        s += tx(8, 172, 'Los bits 26–31 mantienen PA13–PA15 para el depurador');
        return SV(180, s);
      }
    },
    // st12 y st20 · BSRR: poner a 1 o a 0 un pin con una sola escritura
    st_bsrr: {
      calc: p => { const O = 0x0021, odr = p.bit < 16 ? (O | (1 << p.bit)) : (O & ~(1 << (p.bit - 16))); return { odr, set: p.bit < 16 ? 1 : 0 }; },
      svg: (p, o) => {
        const pin = p.bit & 15;
        let s = bits32(20, (1 << p.bit) >>> 0, b => b === p.bit ? (b < 16 ? 'var(--ok)' : 'var(--err)') : '', `BSRR = 1U << ${p.bit} → ${hex((1 << p.bit) >>> 0)}`);
        s += tx(8, 108, 'Bits 31–16: BR (poner a 0) · bits 15–0: BS (poner a 1)');
        let r = '';
        for (let i = 0; i < 16; i++) { const b = 15 - i, on = (o.odr >> b) & 1, x = 10 + i * 17.5; r += `<rect x="${x}" y="132" width="16" height="20" rx="3" fill="${on ? 'var(--led)' : 'none'}" fill-opacity=".8" stroke="${b === pin ? 'currentColor' : 'var(--line)'}" stroke-width="${b === pin ? 2 : 1}"/>` + tm(x + 8, 146, on, 'vizsm', 'fill:currentColor'); if (b % 4 === 0) r += tm(x + 8, 164, b); }
        s += tx(8, 126, `ODR antes 0x0021 → después ${hex(o.odr, 4)}: P${pin} ${o.set ? 'a 1' : 'a 0'}`, 'vizlab') + r;
        return SV(170, s);
      }
    },
    // st13 · sondeo, interrupción o DMA: cuánta CPU queda libre
    st_halmode: {
      calc: p => {
        const byteUs = 1e7 / 115200, tot = p.n * byteUs, busy = p.mode === 0 ? 100 : p.mode === 1 ? 1.5 / byteUs * 100 : Math.min(100, 5 / tot * 100);
        return { free: 100 - busy, ms: tot / 1000, free1000: p.n === 1000 ? 100 - busy : 0 };
      },
      svg: (p, o) => {
        let s = tx(8, 16, `Enviar ${p.n} bytes a 115 200 baudios: ${num(o.ms, 2)} ms`, 'vizlab') + tx(8, 38, 'UART');
        for (let i = 0; i < 20; i++) s += `<rect x="${60 + i * 11.5}" y="28" width="10" height="12" rx="2" fill="var(--ice)" fill-opacity=".6"/>`;
        s += tx(8, 66, 'CPU');
        for (let i = 0; i < 20; i++) {
          const x = 60 + i * 11.5;
          if (p.mode === 0) s += `<rect x="${x}" y="56" width="11.5" height="12" fill="var(--err)" fill-opacity=".7"/>`;
          else if (p.mode === 1) s += `<rect x="${x}" y="56" width="2" height="12" fill="var(--err)"/><rect x="${x + 2}" y="56" width="9.5" height="12" fill="var(--ok)" fill-opacity=".5"/>`;
          else s += `<rect x="${x}" y="56" width="11.5" height="12" fill="var(--ok)" fill-opacity=".5"/>${i === 0 || i === 19 ? `<rect x="${x}" y="56" width="1.5" height="12" fill="var(--err)"/>` : ''}`;
        }
        s += tx(8, 96, ['Sondeo: la CPU espera hasta el último bit', '_IT: una interrupción corta por byte', '_DMA: el DMA mueve los bytes; un aviso al final'][p.mode], 'vizsm', 'fill:currentColor');
        s += tx(8, 118, 'Rojo: CPU ocupada · verde: libre para otras cosas') + tx(8, 142, `CPU libre ≈ ${num(o.free, 2)} %`, 'vizbig', OKS(o.free > 95)) + tx(8, 160, 'Cifras orientativas para un M4 a 84 MHz');
        return SV(168, s);
      }
    },
    // st14 · del reset a main, paso a paso
    st_boot: {
      calc: p => ({ step: p.step }),
      svg: p => {
        const k = p.step;
        let s = tx(8, 14, 'Flash (0x08000000)', 'vizsm') + rb(8, 20, 130, 18, k === 1 ? 'var(--led)' : 'none', 'currentColor', 0.4) + tx(14, 33, '[0] 0x20020000', 'vizsm', 'fill:currentColor') + rb(8, 40, 130, 18, k === 2 ? 'var(--led)' : 'none', 'currentColor', 0.4) + tx(14, 53, '[1] 0x080001A9', 'vizsm', 'fill:currentColor');
        s += tx(160, 14, 'Registros', 'vizsm') + tx(160, 33, `MSP = ${k >= 1 ? '0x20020000' : '?'}`, 'vizsm', 'fill:currentColor') + tx(160, 53, `PC = ${k >= 2 ? (k >= 6 ? 'main' : 'Reset_Handler') : '?'}`, 'vizsm', 'fill:currentColor');
        s += tx(8, 78, 'RAM', 'vizsm') + rb(40, 66, 120, 16, k >= 4 ? 'var(--led)' : 'none', 'currentColor', 0.5) + tm(100, 78, k >= 4 ? '.data = valores iniciales' : '.data = basura') + rb(166, 66, 126, 16, k >= 5 ? 'var(--ok)' : 'none', 'currentColor', 0.5) + tm(229, 78, k >= 5 ? '.bss = 0' : '.bss = basura');
        BOOT_STEPS.forEach((t, i) => { s += tx(14, 104 + i * 13, `${i}. ${t}`, 'vizsm', i === k ? 'fill:currentColor;font-weight:700' : i < k ? 'fill:var(--ok)' : ''); });
        return SV(194, s);
      }
    },
    // st24 · el SysTick: valor de recarga y límite de 24 bits
    st_tick: {
      calc: p => { const load = p.f * 1e6 / p.hz - 1; return { load, fits: load <= 16777215 ? 1 : 0, per: 1000 / p.hz }; },
      svg: (p, o) => {
        const fr = Math.min(1, o.load / 16777215);
        let s = tx(8, 16, `SysTick a ${p.f} MHz · cada ${num(o.per, 2)} ms`, 'vizlab');
        s += `<rect x="8" y="30" width="284" height="22" rx="5" fill="var(--line)"/><rect x="8" y="30" width="${(284 * fr).toFixed(1)}" height="22" rx="5" fill="${o.fits ? 'var(--ice)' : 'var(--err)'}"/>` + tx(8, 68, '0') + `<text x="292" y="68" text-anchor="end" class="vizsm">2²⁴ − 1 = 16 777 215</text>`;
        s += tx(8, 96, `LOAD = ${p.f} 000 000 / ${num(p.hz, 0)} − 1`, 'vizsm', 'fill:currentColor') + tx(8, 118, `LOAD = ${num(o.load, 0)}`, 'vizbig', OKS(o.fits));
        s += tx(8, 140, o.fits ? 'Cabe en los 24 bits del SysTick' : 'No cabe: periodo demasiado largo para esta frecuencia', 'vizsm', OKS(o.fits)) + tx(8, 158, `Periodo máximo a ${p.f} MHz: ${num(16777216 / p.f / 1000, 1)} ms`);
        return SV(166, s);
      }
    },
    // st16 · fuentes de reloj y su precisión
    st_osc: {
      calc: p => { const sday = OSC[p.src][2] * 1e-6 * 86400; return { sday, drift: sday * p.days }; },
      svg: (p, o) => {
        let s = '';
        OSC.forEach(([n, d, ppm], i) => { const sel = i === p.src, x = 4 + i * 74; s += `<rect x="${x}" y="8" width="70" height="56" rx="7" fill="${sel ? 'var(--ice)' : 'none'}" fill-opacity=".35" stroke="${sel ? 'currentColor' : 'var(--line)'}" stroke-width="${sel ? 2 : 1}"/>` + tm(x + 35, 28, n, 'vizbig') + tm(x + 35, 44, ppm >= 10000 ? '±' + num(ppm / 10000, 0) + ' %' : '±' + ppm + ' ppm', 'vizsm') + tm(x + 35, 58, i < 2 ? 'alta' : 'baja', 'vizsm'); });
        const fmtS = v => v >= 3600 ? num(v / 3600, 1) + ' h' : v >= 60 ? num(v / 60, 1) + ' min' : num(v, 1) + ' s';
        s += tx(8, 88, `${OSC[p.src][0]}: ${OSC[p.src][1]}`, 'vizlab') + tx(8, 108, `Usado como reloj de hora, se desvía hasta ${fmtS(o.sday)} al día`, 'vizsm', 'fill:currentColor');
        s += tx(8, 128, `En ${p.days} ${p.days === 1 ? 'día' : 'días'}: ${fmtS(o.drift)}`, 'vizbig', OKS(o.sday < 3)) + tx(8, 150, 'Precisiones típicas orientativas; mira la hoja de datos');
        return SV(158, s);
      }
    },
    // st18 · wait states de la Flash (F411 a 2,7–3,6 V)
    st_ws: {
      calc: p => { const need = p.f <= 30 ? 0 : p.f <= 64 ? 1 : p.f <= 90 ? 2 : 3, ok = p.ws >= need ? 1 : 0; return { need, ok, ok100: p.f === 100 && ok ? 1 : 0, just48: p.f === 48 && p.ws === need ? 1 : 0 }; },
      svg: (p, o) => {
        const T = [['0 WS', 'hasta 30 MHz'], ['1 WS', 'hasta 64 MHz'], ['2 WS', 'hasta 90 MHz'], ['3 WS', 'hasta 100 MHz']];
        let s = tx(8, 14, 'F411 a 3,3 V: ciclos de espera que pide la Flash', 'vizsm');
        T.forEach(([a, b], i) => { const y = 22 + i * 22; s += `<rect x="8" y="${y}" width="160" height="18" rx="4" fill="${i === o.need ? 'var(--ice)' : 'none'}" fill-opacity=".35" stroke="${i === p.ws ? 'currentColor' : 'var(--line)'}" stroke-width="${i === p.ws ? 2 : 1}"/>` + tx(14, y + 13, `${a} · ${b}`, 'vizsm', 'fill:currentColor'); });
        s += tx(180, 40, 'SYSCLK', 'vizsm') + tx(180, 58, p.f + ' MHz', 'vizbig') + tx(180, 80, 'LATENCY', 'vizsm') + tx(180, 98, p.ws + ' WS', 'vizbig');
        s += tx(8, 128, o.ok ? (p.ws > o.need ? 'Funciona, pero con esperas de más: algo más lento' : 'Justo lo necesario') : `La Flash no llega a tiempo: necesita ${o.need} WS. Cuelgue o HardFault`, 'vizlab', OKS(o.ok));
        s += tx(8, 148, 'Al subir la frecuencia: primero los wait states');
        return SV(156, s);
      }
    },
    // st19 · push-pull, open-drain, pull-up y otra placa en la misma línea
    st_pin: {
      calc: p => {
        const hi = p.mode === 1 && p.ot === 0 && p.out === 1, lo = (p.mode === 1 && p.out === 0) || p.other === 1;
        const lvl = hi && lo ? 3 : lo ? 0 : hi ? 1 : p.pu ? 1 : 2;
        return { lvl, short: lvl === 3 ? 1 : 0, odok: p.mode === 1 && p.ot === 1 && p.pu === 1 && p.other === 1 && lvl === 0 ? 1 : 0, rel: p.mode === 1 && p.ot === 1 && p.out === 1 && p.other === 0 && p.pu === 1 ? 1 : 0 };
      },
      svg: (p, o) => {
        const col = ['var(--ice)', 'var(--led)', 'var(--muted)', 'var(--err)'][o.lvl];
        let s = rb(8, 50, 90, 70) + tm(53, 66, 'Tu pin', 'vizlab') + tm(53, 82, p.mode ? (p.ot ? 'open-drain' : 'push-pull') : 'entrada') + tm(53, 98, p.mode ? 'escribes ' + p.out : '') ;
        if (p.mode && !p.ot) s += tm(53, 114, p.out ? '↑ empuja a 3,3 V' : '↓ tira a 0 V', 'vizsm', 'fill:currentColor');
        else if (p.mode && p.ot) s += tm(53, 114, p.out ? 'suelta la línea' : '↓ tira a 0 V', 'vizsm', 'fill:currentColor');
        s += `<path d="M98 85H210" stroke="${col}" stroke-width="5"/>` + rb(210, 50, 82, 70) + tm(251, 66, 'Otra placa', 'vizlab') + tm(251, 86, p.other ? '↓ tira a 0 V' : 'suelta', 'vizsm', 'fill:currentColor');
        if (p.pu) s += `<path d="M154 85V62" stroke="currentColor" stroke-width="2"/><rect x="148" y="34" width="12" height="28" rx="2" fill="none" stroke="currentColor"/><path d="M154 34V22" stroke="currentColor" stroke-width="2"/>` + tm(154, 16, 'pull-up a 3,3 V');
        s += tx(8, 146, ['Línea a 0 V', 'Línea a 3,3 V', 'Línea flotante: nadie fija el nivel', '¡Cortocircuito! Uno empuja a 3,3 V y otro tira a 0 V'][o.lvl], 'vizlab', o.lvl === 3 ? 'fill:var(--err)' : 'fill:currentColor');
        s += tx(8, 166, 'Open-drain solo puede tirar a 0: el 1 lo pone la pull-up');
        return SV(174, s);
      }
    },
    // st19 y st32 · tiempo de subida con una pull-up
    st_rc: {
      calc: p => { const tr = 0.8473 * p.R * p.C, spec = p.f === 100 ? 1000 : 300, ok = tr <= spec ? 1 : 0; return { tr, ok, ok100: p.f === 100 && ok ? 1 : 0, ok400: p.f === 400 && ok ? 1 : 0 }; },
      svg: (p, o) => {
        const spec = p.f === 100 ? 1000 : 300, Tb = 1e6 / p.f / 2, sc = 260 / Tb, tau = p.R * p.C;
        let d = 'M20 120', ideal = 'M20 120V40H280';
        for (let i = 0; i <= 50; i++) { const t = i / 50 * Tb; d += `L${(20 + t * sc).toFixed(1)} ${(120 - 80 * (1 - Math.exp(-t / tau))).toFixed(1)}`; }
        let s = `<path d="${ideal}" fill="none" stroke="var(--muted)" stroke-dasharray="4 4"/><path d="${d}" fill="none" stroke="${o.ok ? 'var(--ok)' : 'var(--err)'}" stroke-width="2.6"/>`;
        s += `<path d="M20 96H280M20 64H280" stroke="var(--line)"/>` + tx(250, 92, '30 %') + tx(250, 60, '70 %') + tx(20, 136, `Media fase de SCL a ${p.f} kHz: ${num(Tb / 1000, 2)} µs`);
        s += tx(8, 158, `Subida 30→70 %: ${num(o.tr, 0)} ns (máximo I²C: ${spec} ns)`, 'vizlab', OKS(o.ok)) + tx(8, 176, `τ = R·C = ${num(p.R, 1)} kΩ × ${p.C} pF = ${num(tau, 0)} ns`);
        return SV(184, s);
      }
    },
    // st20 · campo de 4 bits en AFR
    st_afr: {
      calc: p => { const reg = p.pin >> 3, shift = 4 * (p.pin & 7); return { reg, shift, val: (p.af << shift) >>> 0, sel: p.pin * 16 + p.af }; },
      svg: (p, o) => {
        let s = tx(8, 16, `PA${p.pin} con AF${p.af} → AFR[${o.reg}], bits ${o.shift + 3}–${o.shift}`, 'vizlab');
        for (let i = 0; i < 8; i++) { const pin = o.reg * 8 + 7 - i, x = 8 + i * 36, sel = pin === p.pin; s += `<rect x="${x}" y="28" width="34" height="34" rx="5" fill="${sel ? 'var(--led)' : 'none'}" fill-opacity=".5" stroke="${sel ? 'currentColor' : 'var(--line)'}"/>` + tm(x + 17, 50, sel ? p.af.toString(2).padStart(4, '0') : '0000', 'vizsm', 'fill:currentColor') + tm(x + 17, 76, 'P' + pin); }
        s += tx(8, 100, `Campo = ${p.af} &lt;&lt; (4 × ${p.pin & 7}) = ${hex(o.val)}`, 'vizsm', 'fill:currentColor') + tx(8, 120, `(${num(o.val, 0)} en decimal)`);
        s += tx(8, 144, 'AF1 TIM1/2 · AF2 TIM3–5 · AF4 I²C') + tx(8, 160, 'AF5 SPI1/2 · AF7 USART1/2');
        return SV(168, s);
      }
    },
    // st21 · las cuatro piezas de una interrupción
    st_irqcfg: {
      calc: p => ({ st: !p.ie || !p.nv ? 0 : !p.name ? 1 : !p.clr ? 2 : 3 }),
      svg: (p, o) => {
        const it = [['Activada en el periférico', p.ie], ['Activada en el NVIC', p.nv], ['Nombre exacto del manejador', p.name], ['Borra la bandera al entrar', p.clr]];
        let s = '';
        it.forEach(([t, v], i) => { s += tx(10, 20 + i * 20, (v ? '✓ ' : '✗ ') + t, 'vizsm', v ? 'fill:var(--ok)' : 'fill:var(--err)'); });
        const msg = ['No llega a la CPU: main ni se entera', 'Salta a Default_Handler: bucle infinito', 'Entra… y vuelve a entrar sin parar', 'Entra, trabaja y vuelve a main'][o.st];
        const fl = ['Periférico', 'NVIC', 'Manejador', 'main'];
        fl.forEach((t, i) => { const lit = i < (o.st === 0 ? (p.ie ? 1 : 0) : o.st === 1 ? 2 : o.st === 2 ? 3 : 4); s += rb(8 + i * 74, 100, 66, 26, lit ? 'var(--ice)' : 'none', 'currentColor', 0.4) + tm(41 + i * 74, 118, t, 'vizsm', 'fill:currentColor'); if (i < 3) s += arrow(74 + i * 74, 113, 82 + i * 74, 113); });
        s += tx(8, 152, msg, 'vizlab', o.st === 3 ? 'fill:var(--ok)' : 'fill:var(--err)');
        return SV(160, s);
      }
    },
    // st22 · contador++ interrumpido a mitad
    st_race: {
      calc: p => { const fin = p.when === 1 && !p.crit ? 1 : 2; return { fin, lost: fin === 1 ? 1 : 0, safe: p.when === 1 && p.crit ? 1 : 0 }; },
      svg: (p, o) => {
        const st = ['lee (0)', 'suma (1)', 'escribe'];
        let s = tx(8, 14, 'main y la ISR hacen contador++ (empieza en 0)', 'vizsm', 'fill:currentColor') + tx(8, 40, 'main', 'vizsm') + tx(8, 70, 'ISR', 'vizsm'), x = 40;
        const isrAt = p.crit ? 3 : p.when;
        for (let i = 0; i <= 3; i++) {
          if (i === isrAt) { s += rb(x, 52, 60, 30, 'var(--led)', 'currentColor', 0.5) + tm(x + 30, 64, 'lee, suma', 'vizsm', 'fill:currentColor') + tm(x + 30, 77, 'y escribe', 'vizsm', 'fill:currentColor'); x += 64; }
          if (i < 3) { s += rb(x, 24, 58, 24, p.crit ? 'var(--ice)' : 'none', 'currentColor', 0.3) + tm(x + 29, 40, st[i], 'vizsm', 'fill:currentColor'); x += 62; }
        }
        if (p.crit) s += tx(8, 104, 'Sección crítica: la interrupción espera a que main termine', 'vizsm', 'fill:var(--ice)');
        s += tx(8, 130, `Valor final: ${o.fin}`, 'vizbig', OKS(!o.lost)) + tx(8, 150, o.lost ? 'Se ha perdido un incremento: main escribió un valor viejo' : 'Correcto: dos incrementos, contador = 2', 'vizsm', OKS(!o.lost));
        return SV(158, s);
      }
    },
    // st23 · líneas EXTI compartidas por número de pin
    st_exti: {
      calc: p => { const g = n => n <= 4 ? n : n <= 9 ? 5 : 10, clash = p.p1 === p.p2 ? 1 : 0; return { clash, ok: clash ? 0 : 1, sh: !clash && g(p.p1) === g(p.p2) && g(p.p1) >= 5 ? 1 : 0 }; },
      svg: (p, o) => {
        const hn = n => n <= 4 ? `EXTI${n}_IRQHandler` : n <= 9 ? 'EXTI9_5_IRQHandler' : 'EXTI15_10_IRQHandler';
        let s = tx(8, 14, 'Líneas EXTI 0–15: una por número de pin', 'vizsm');
        for (let n = 0; n < 16; n++) { const x = 8 + n * 18, a = n === p.p1, b = n === p.p2; s += `<rect x="${x}" y="22" width="16" height="22" rx="3" fill="${a && b ? 'var(--err)' : a ? 'var(--ice)' : b ? 'var(--led)' : 'none'}" fill-opacity=".7" stroke="var(--line)"/>` + tm(x + 8, 37, n, 'vizsm', 'fill:currentColor'); }
        s += `<path d="M8 50H62M98 50H188M188 50H296" stroke="var(--line)"/>` + tm(44, 62, '0–4: uno cada una') + tm(143, 62, '5–9: compartido') + tm(242, 62, '10–15: compartido');
        s += tx(8, 88, `Botón A en PA${p.p1} → ${hn(p.p1)}`, 'vizsm', 'fill:var(--ice)') + tx(8, 106, `Botón B en PB${p.p2} → ${hn(p.p2)}`, 'vizsm', 'fill:var(--led)');
        s += tx(8, 132, o.clash ? `Choque: PA${p.p1} y PB${p.p2} usan la misma línea ${p.p1}` : 'Cada botón tiene su línea', 'vizlab', OKS(!o.clash)) + tx(8, 150, o.sh ? 'Mismo manejador: dentro miras qué línea saltó' : '');
        return SV(158, s);
      }
    },
    // st26 · encoder en cuadratura
    st_enc: {
      calc: p => { const cpr = p.ppr * p.x * p.red; return { cpr, deg: 360 / cpr }; },
      svg: (p, o) => {
        let a = 'M10 40', b = 'M10 84', ticks = '';
        for (let k = 0; k < 4; k++) { const x = 10 + k * 70; a += `V20H${x + 35}V40H${x + 70}`; b += `H${x + 17.5}V64H${x + 52.5}V84H${x + 70}`; const ed = [[x, 1], [x + 17.5, 2], [x + 35, 1], [x + 52.5, 2]]; ed.forEach(([xx, s2], j) => { if (p.x === 4 || (p.x === 2 && s2 === 1) || (p.x === 1 && j === 0)) ticks += `<path d="M${xx} 96v8" stroke="var(--err)" stroke-width="2"/>`; }); }
        let s = `<path d="${a}" fill="none" stroke="var(--ice)" stroke-width="2.4"/><path d="${b}" fill="none" stroke="var(--led)" stroke-width="2.4"/>` + tx(0, 34, 'A') + tx(0, 78, 'B') + ticks + tx(10, 120, `Cuentas (rojo): ${p.x} por pulso`, 'vizsm', 'fill:currentColor');
        s += tx(10, 142, `${p.ppr} × ${p.x} × ${p.red} = ${num(o.cpr, 0)} cuentas por vuelta`, 'vizlab') + tx(10, 162, `Resolución: ${num(o.deg, 3)}° por cuenta`);
        return SV(170, s);
      }
    },
    // st27 · tiempo muerto entre salidas complementarias
    st_dead: {
      calc: p => { const dt = p.dtg * 10, safe = dt >= p.toff ? 1 : 0; return { dt, safe, safe200: p.toff === 200 && safe ? 1 : 0, safe400: p.toff === 400 && safe ? 1 : 0 }; },
      svg: (p, o) => {
        const sc = 0.12, X = 30, H = 120, x1 = X + H + o.dt * sc, x2 = X + 240;
        let s = tx(4, 30, 'CH1') + tx(4, 80, 'CH1N');
        s += `<path d="M${X} 18H${X + H}V40H${x2}" fill="none" stroke="var(--ice)" stroke-width="2.4"/><path d="M${X} 90H${x1}V68H${x2}" fill="none" stroke="var(--led)" stroke-width="2.4"/>`;
        s += `<path d="M${X + H} 40L${X + H + p.toff * sc} 40" stroke="var(--err)" stroke-width="5" stroke-opacity=".35"/>` + tx(X + H + 2, 54, `apagándose ${p.toff} ns`, 'vizsm', 'fill:var(--err)');
        if (!o.safe) s += `<rect x="${x1}" y="14" width="${(X + H + p.toff * sc) - x1}" height="80" fill="var(--err)" fill-opacity=".25"/>`;
        s += tx(8, 120, `Tiempo muerto = DTG × 10 ns = ${o.dt} ns (reloj a 100 MHz)`, 'vizsm', 'fill:currentColor') + tx(8, 142, o.safe ? 'Seguro: nunca conducen los dos' : 'Shoot-through: conducen los dos', 'vizlab', OKS(o.safe));
        return SV(150, s);
      }
    },
    // st29 · muestras intercaladas de varios canales
    st_scan: {
      calc: p => ({ idx: p.i < p.n ? p.n * p.k + p.i : -1, len: p.n * 13 }),
      svg: (p, o) => {
        const C = ['var(--ice)', 'var(--led)', 'var(--ok)', 'var(--err)', 'var(--muted)', 'currentColor'];
        let s = tx(8, 14, `Búfer con ${p.n} canales intercalados (posiciones 0–47)`, 'vizsm');
        for (let j = 0; j < 48; j++) { const r = Math.floor(j / 16), c = j % 16, x = 8 + c * 18, y = 22 + r * 30, sel = j === o.idx; s += `<rect x="${x}" y="${y}" width="16" height="18" rx="3" fill="${C[j % p.n]}" fill-opacity="${sel ? 1 : 0.35}" stroke="${sel ? 'currentColor' : 'none'}" stroke-width="2"/>` + tm(x + 8, y + 27, j % 4 === 0 ? j : '', 'vizsm'); }
        s += tx(8, 126, o.idx < 0 ? `El canal ${p.i} no existe con ${p.n} canales (van de 0 a ${p.n - 1})` : `Muestra ${p.k} del canal ${p.i}: buf[${p.n}·${p.k} + ${p.i}] = buf[${o.idx}]`, 'vizlab', o.idx < 0 ? 'fill:var(--err)' : '');
        s += tx(8, 146, o.idx > 47 ? 'Está más allá de lo dibujado, pero la regla es la misma' : 'Cada color es un canal');
        return SV(154, s);
      }
    },
    // st30 · tabla del DAC disparada por un temporizador
    st_dac: {
      calc: p => { const fo = p.ft / p.N, clip = p.off ? 0 : 1; return { fo, clip, f10: !clip && Math.abs(fo - 10) < 1e-9 ? 1 : 0, f50: !clip && Math.abs(fo - 50) < 1e-9 ? 1 : 0 }; },
      svg: (p, o) => {
        const n = Math.min(p.N, 100), w = 270 / n; let d = '';
        for (let i = 0; i < n; i++) { let v = 2047 * Math.sin(2 * Math.PI * i / n) + (p.off ? 2048 : 0); v = Math.max(0, Math.min(4095, v)); const y = 120 - v / 4095 * 100; d += `${i ? 'L' : 'M'}${(15 + i * w).toFixed(1)} ${y.toFixed(1)}H${(15 + (i + 1) * w).toFixed(1)}`; }
        let s = `<path d="M15 120H290M15 20V120" stroke="var(--line)"/><path d="${d}" fill="none" stroke="${o.clip ? 'var(--err)' : 'var(--ok)'}" stroke-width="2.2"/>` + tx(18, 30, '3,3 V') + tx(18, 116, '0 V');
        s += tx(8, 144, `${p.ft} kHz / ${p.N} muestras = ${num(o.fo, 2)} kHz`, 'vizlab') + tx(8, 162, o.clip ? 'Sin sumar 2048, la mitad negativa se queda en 0 V' : 'Centrada en 2048: la onda entera cabe', 'vizsm', OKS(!o.clip));
        return SV(170, s);
      }
    },
    // st31 · BRR y error de velocidad
    st_baud: {
      calc: p => { const brr = Math.round(p.pclk * 1e6 / p.baud), real = p.pclk * 1e6 / brr, err = Math.abs(real - p.baud) / p.baud * 100; return { brr, err, e921: p.baud === 921600 && err < 1 ? 1 : 0 }; },
      svg: (p, o) => {
        let s = tx(8, 16, `BRR = ${p.pclk} MHz / ${num(p.baud, 0)} = ${num(p.pclk * 1e6 / p.baud, 2)} → ${o.brr}`, 'vizlab');
        const bw = 27, drift = Math.min(1.5, o.err / 100);
        for (let i = 0; i < 10; i++) { const x = 15 + i * bw; s += `<rect x="${x}" y="30" width="${bw - 2}" height="22" rx="3" fill="${i === 0 || i === 9 ? 'var(--muted)' : 'var(--ice)'}" fill-opacity=".35"/>`; const sx = x + bw / 2 + i * drift * bw; s += `<path d="M${sx.toFixed(1)} 26v30" stroke="${Math.abs(i * drift) > 0.4 ? 'var(--err)' : 'var(--ok)'}" stroke-width="2"/>`; }
        s += tx(8, 74, 'Barras: momento en que el receptor lee cada bit') + tx(8, 100, `Velocidad real: ${num(p.pclk * 1e6 / o.brr, 0)} baudios`, 'vizsm', 'fill:currentColor');
        s += tx(8, 124, `Error: ${num(o.err, 2)} %`, 'vizbig', OKS(o.err < 2)) + tx(8, 144, o.err < 2 ? 'Por debajo del 2 %: funciona' : 'Por encima del 2 %: bytes corruptos');
        return SV(152, s);
      }
    },
    // st32 · modos SPI (CPOL y CPHA)
    st_spi: {
      calc: p => { const mode = p.cpol * 2 + p.cpha, ok = mode === p.dev ? 1 : 0; return { mode, ok, m3ok: p.dev === 3 && ok ? 1 : 0, m1ok: p.dev === 1 && ok ? 1 : 0 }; },
      svg: (p, o) => {
        const hi = 24, lo = 48, idle = p.cpol ? hi : lo, act = p.cpol ? lo : hi; let d = `M10 ${idle}H40`, ar = '', ex = '';
        const dc = Math.floor(p.dev / 2), dp = p.dev % 2;
        for (let k = 0; k < 4; k++) { const x = 40 + k * 60; d += `V${act}H${x + 30}V${idle}H${x + 60}`; const e = p.cpha ? x + 30 : x; ar += `<path d="M${e} 60v14" stroke="var(--led)" stroke-width="2.4"/>`; const e2 = dp ? x + 30 : x; ex += `<path d="M${e2} 80v10" stroke="var(--muted)" stroke-width="2" stroke-dasharray="2 2"/>`; }
        d += 'H290';
        let s = tx(4, 40, 'SCK') + `<path d="${d}" fill="none" stroke="var(--ice)" stroke-width="2.4"/>` + ar + ex;
        s += tx(8, 108, `Tu SPI: CPOL ${p.cpol}, CPHA ${p.cpha} → modo ${o.mode}`, 'vizsm', 'fill:var(--led)') + tx(8, 126, `El chip pide modo ${p.dev} (CPOL ${dc}, CPHA ${dp}): marcas grises`, 'vizsm');
        s += tx(8, 150, o.ok ? 'Coinciden reposo y flanco de muestreo: datos correctos' : 'No coinciden: datos desplazados o basura', 'vizlab', OKS(o.ok));
        return SV(158, s);
      }
    },
    // st33 · temporización de bit en CAN
    st_canbit: {
      calc: p => { const tq = 1 + p.bs1 + p.bs2, rate = 36000 / (p.brp * tq), sp = (1 + p.bs1) / tq * 100; return { tq, rate, sp, good: Math.abs(rate - 500) < 0.5 && sp >= 85 && sp <= 90 ? 1 : 0 }; },
      svg: (p, o) => {
        const w = 280 / o.tq; let s = tx(8, 14, `Un bit = 1 + ${p.bs1} + ${p.bs2} = ${o.tq} cuantos`, 'vizlab');
        for (let i = 0; i < o.tq; i++) s += `<rect x="${(10 + i * w).toFixed(1)}" y="24" width="${(w - 1).toFixed(1)}" height="22" fill="${i === 0 ? 'var(--muted)' : i <= p.bs1 ? 'var(--ice)' : 'var(--led)'}" fill-opacity=".55"/>`;
        const xs = 10 + (1 + p.bs1) * w; s += `<path d="M${xs.toFixed(1)} 18v34" stroke="var(--err)" stroke-width="2.4"/>` + tm(xs, 64, 'muestreo', 'vizsm', 'fill:var(--err)');
        s += tx(8, 88, 'Gris: SYNC · azul: BS1 · ámbar: BS2') + tx(8, 110, `Velocidad = 36 MHz / (${p.brp} × ${o.tq}) = ${num(o.rate, 1)} kbit/s`, 'vizsm', 'fill:currentColor');
        s += tx(8, 132, `Punto de muestreo: ${num(o.sp, 1)} %`, 'vizlab', OKS(o.sp >= 85 && o.sp <= 90)) + tx(8, 150, 'Objetivo habitual: cerca del 87,5 %');
        return SV(158, s);
      }
    },
    // st33 · arbitraje CAN bit a bit
    st_arb: {
      calc: p => { const A = IDS[p.a], B = IDS[p.b]; let bit = -1; for (let i = 10; i >= 0; i--) if (((A >> i) & 1) !== ((B >> i) & 1)) { bit = 10 - i; break; } return { win: A === B ? 2 : A < B ? 0 : 1, bit }; },
      svg: (p, o) => {
        const A = IDS[p.a], B = IDS[p.b]; let s = '';
        [['A', A, 30], ['B', B, 62]].forEach(([n, v, y]) => { s += tx(4, y + 14, `${n} ${hex(v, 3)}`, 'vizsm', 'fill:currentColor'); for (let i = 0; i < 11; i++) { const bv = (v >> (10 - i)) & 1, out = o.bit >= 0 && i > o.bit && ((n === 'A' && o.win === 1) || (n === 'B' && o.win === 0)); s += `<rect x="${70 + i * 20}" y="${y}" width="18" height="20" rx="3" fill="${bv ? 'none' : 'var(--ice)'}" fill-opacity=".6" stroke="var(--line)" opacity="${out ? 0.3 : 1}"/>` + tm(79 + i * 20, y + 14, bv, 'vizsm', 'fill:currentColor'); } });
        if (o.bit >= 0) s += `<rect x="${69 + o.bit * 20}" y="26" width="20" height="60" rx="3" fill="none" stroke="var(--err)" stroke-width="2"/>` + tx(8, 106, `Se separan en el bit ${o.bit + 1}.º: quien envía 1 se retira`, 'vizsm');
        s += tx(8, 16, '0 = dominante (azul): gana en el bus', 'vizsm') + tx(8, 132, o.win === 2 ? 'Mismo ID: no debe pasar nunca' : `Gana ${o.win ? 'B' : 'A'} (ID más bajo), sin perder nada`, 'vizlab', o.win === 2 ? 'fill:var(--err)' : 'fill:var(--ok)');
        return SV(140, s);
      }
    },
    // st34 · el planificador de FreeRTOS en 20 ticks
    st_rtos: {
      anim: true,
      calc: p => {
        const T = [{ pr: p.pa, per: 5, work: 1 }, { pr: p.pb, per: 10, work: 3 }, { pr: 1 }], rem = [0, 0], run = [], use = [0, 0, 0];
        let rr = 0, busy = 0;
        for (let t = 0; t < 20; t++) {
          [0, 1].forEach(i => { if (t % T[i].per === 0) rem[i] = T[i].work; });
          const ready = [0, 1].filter(i => rem[i] > 0 || p.wait === 0).concat(2), best = Math.max(...ready.map(i => T[i].pr)), cand = ready.filter(i => T[i].pr === best), who = cand[rr++ % cand.length];
          let kind = 'c'; if (who < 2) { if (rem[who] > 0) { rem[who]--; kind = 'w'; use[who]++; } else { kind = 'b'; busy++; } } else use[2]++;
          run.push([who, kind]);
        }
        const cpuA = use[0] * 5, cpuB = use[1] * 5, cpuC = use[2] * 5;
        return { run, cpuA, cpuB, cpuC, waste: busy * 5, good: cpuA > 0 && cpuB > 0 && cpuC > 0 && busy === 0 ? 1 : 0, tie: p.pa === p.pb && p.wait === 1 && use[0] > 0 && use[1] > 0 && busy === 0 ? 1 : 0 };
      },
      svg: (p, o, t) => {
        const N = ['A · sensor', 'B · pantalla', 'C · registro'], col = ['var(--ice)', 'var(--led)', 'var(--ok)'], w = 11.5;
        let s = '';
        N.forEach((n, i) => { s += tx(2, 30 + i * 26, n, 'vizsm', 'font-size:10px') + tx(2, 40 + i * 26, 'prio ' + [p.pa, p.pb, 1][i], 'vizsm', 'font-size:9px'); });
        o.run.forEach(([who, k], j) => { const x = 66 + j * w, y = 20 + who * 26; s += `<rect x="${x}" y="${y}" width="${w - 1}" height="20" rx="2" fill="${k === 'b' ? 'var(--err)' : col[who]}" fill-opacity="${k === 'b' ? 0.45 : 0.85}"/>`; });
        const cx = 66 + ((t % 5) / 5) * 20 * w; s += `<path d="M${cx.toFixed(1)} 16V96" stroke="currentColor" stroke-width="1.2"/>`;
        s += tx(66, 110, '0 ms') + `<text x="296" y="110" text-anchor="end" class="vizsm">20 ms</text>`;
        s += tx(4, 130, `CPU útil: A ${o.cpuA} % · B ${o.cpuB} % · C ${o.cpuC} %`, 'vizlab') + tx(4, 148, o.waste ? `Rojo: ${o.waste} % de la CPU dando vueltas en HAL_Delay` : 'Con osDelay, quien espera queda bloqueada y no gasta CPU', 'vizsm', o.waste ? 'fill:var(--err)' : 'fill:var(--ok)');
        s += tx(4, 166, 'A trabaja 1 ms cada 5 ms · B trabaja 3 ms cada 10 ms');
        return SV(174, s);
      }
    },
    // st35 · pila de una tarea
    st_stk: {
      calc: p => { const used = 160 + p.arr + (p.pf ? 350 : 0), tot = p.words * 4, over = used > tot ? 1 : 0; return { used, tot, over, hwm: Math.max(0, Math.floor((tot - used) / 4)), fit: p.arr === 1024 && p.pf === 1 && !over ? 1 : 0 }; },
      svg: (p, o) => {
        const H = 130, sc = H / Math.max(o.tot, o.used);
        let s = `<rect x="20" y="${150 - o.tot * sc}" width="80" height="${o.tot * sc}" fill="none" stroke="currentColor" stroke-width="2"/>`;
        let y = 150; [[160, 'var(--muted)', 'contexto y locales'], [p.arr, 'var(--led)', 'array local'], [p.pf ? 350 : 0, 'var(--ice)', 'printf']].forEach(([v, c, l]) => { if (!v) return; const h = v * sc; y -= h; s += `<rect x="24" y="${y.toFixed(1)}" width="72" height="${h.toFixed(1)}" fill="${c}" fill-opacity=".7"/>` + tx(110, y + h / 2 + 4, `${l}: ${v} B`); });
        s += tx(8, 168, `Pila: ${p.words} palabras = ${o.tot} B`, 'vizsm', 'fill:currentColor');
        s += tx(110, 24, `Usado ≈ ${o.used} B`, 'vizlab', OKS(!o.over)) + tx(110, 40, o.over ? '¡Desborda! Pisa otra memoria' : `Marca de agua: ${o.hwm} palabras libres`, 'vizsm', OKS(!o.over));
        s += tx(8, 184, 'Cifras orientativas', 'vizsm');
        return SV(188, s);
      }
    },
    // st35 · osDelay frente a osDelayUntil
    st_drift: {
      calc: p => { const per = p.mode ? Math.max(10, p.work) : 10 + p.work; return { per, drift: (per - 10) * 100, p10w3: p.work === 3 && per === 10 ? 1 : 0 }; },
      svg: (p, o) => {
        const sc = 270 / (3 * Math.max(o.per, 10)); let s = '', x = 10;
        for (let k = 0; k < 3; k++) { s += `<rect x="${x}" y="30" width="${p.work * sc}" height="22" fill="var(--led)" fill-opacity=".8"/>`; const wait = p.mode ? Math.max(0, 10 - p.work) : 10; s += `<rect x="${x + p.work * sc}" y="30" width="${wait * sc}" height="22" fill="var(--ice)" fill-opacity=".3"/>`; s += `<path d="M${x} 24v34" stroke="currentColor"/>`; x += o.per * sc; }
        for (let k = 0; k <= 3; k++) s += `<path d="M${10 + k * 10 * sc} 60v6" stroke="var(--ok)" stroke-width="2"/>`;
        s += tx(10, 18, p.mode ? 'osDelayUntil(&t, 10): espera hasta la siguiente marca' : 'osDelay(10): espera 10 ms después de trabajar', 'vizsm', 'fill:currentColor') + tx(10, 82, 'Ámbar: trabajo · azul: espera · verde: cada 10 ms ideal');
        s += tx(10, 108, `Periodo real: ${o.per} ms`, 'vizbig', OKS(o.per === 10)) + tx(10, 128, `Tras 100 vueltas llevas ${o.drift} ms de retraso`, 'vizsm', OKS(o.drift === 0));
        return SV(136, s);
      }
    },
    // st36 · una cola entre productor y consumidor
    st_queue: {
      calc: p => { const ex = p.prod - p.cons; let lost = 0, fill = 1, blk = 0; if (ex > 0) { fill = p.len; if (p.pw) blk = ex / p.prod * 100; else lost = Math.max(0, ex - p.len); } return { lost, fill, blk, okWait: ex > 0 && p.pw ? 1 : 0 }; },
      svg: (p, o) => {
        let s = rb(4, 40, 70, 40) + tm(39, 58, 'Productor', 'vizsm', 'fill:currentColor') + tm(39, 72, p.prod + '/s') + rb(226, 40, 70, 40) + tm(261, 58, 'Consumidor', 'vizsm', 'fill:currentColor') + tm(261, 72, p.cons + '/s');
        const w = 140 / p.len; for (let i = 0; i < p.len; i++) s += `<rect x="${(80 + i * w).toFixed(1)}" y="46" width="${(w - 1.5).toFixed(1)}" height="28" rx="2" fill="${i < o.fill ? 'var(--led)' : 'none'}" fill-opacity=".6" stroke="var(--line)"/>`;
        s += tm(150, 36, `Cola de ${p.len} mensajes`) + tx(8, 104, p.pw ? 'El productor espera si la cola está llena' : 'Tiempo de espera 0: si está llena, el mensaje se descarta', 'vizsm', 'fill:currentColor');
        s += tx(8, 128, o.lost ? `Perdidos en 1 s: ${o.lost} mensajes` : 'Ningún mensaje perdido', 'vizlab', OKS(!o.lost)) + tx(8, 146, o.blk ? `El productor pasa bloqueado un ${num(o.blk, 0)} % del tiempo: la cola marca el ritmo` : '');
        return SV(154, s);
      }
    },
    // st37 · inversión de prioridad
    st_inv: {
      calc: p => { const waitH = (p.cs - 1) + (p.med && !p.inh ? 6 : 0); return { waitH, fixed: p.med && p.inh ? 1 : 0 }; },
      svg: (p, o) => {
        const w = 18, row = (y, segs, c) => segs.map(([a, b]) => `<rect x="${60 + a * w}" y="${y}" width="${(b - a) * w - 1}" height="18" rx="3" fill="${c}" fill-opacity=".8"/>`).join('');
        const L = p.med && !p.inh ? [[0, 1], [7, 6 + p.cs]] : [[0, p.cs]], M = p.med ? (p.inh ? [[p.cs, p.cs + 6]] : [[1, 7]]) : [], Hs = o.waitH + 1;
        let s = tx(4, 28, 'Alta') + tx(4, 52, 'Media') + tx(4, 76, 'Baja');
        s += `<rect x="${60 + w}" y="18" width="${o.waitH * w}" height="18" fill="var(--err)" fill-opacity=".2"/>` + row(18, [[Hs, Hs + 1.5]], 'var(--err)') + row(42, M, 'var(--led)') + row(66, L, 'var(--ice)');
        s += tx(4, 100, 'La baja toma el mutex en t = 0; la alta lo pide en t = 1', 'vizsm');
        s += tx(4, 124, `La alta espera ${o.waitH} ms`, 'vizbig', OKS(o.waitH < 5)) + tx(4, 144, p.med && !p.inh ? 'La media expulsa a la baja, que no puede soltar el mutex' : p.inh ? 'Herencia: la baja sube a prioridad alta mientras tiene el mutex' : 'Sin tarea media: la alta solo espera la sección crítica');
        return SV(152, s);
      }
    },
    // st38 · resolución de un tick: osDelay y HAL_Delay
    st_tickres: {
      calc: p => { const d = p.fn ? p.n + 1 - p.ph : p.n - p.ph; return { d, dOs1: !p.fn && p.n === 1 ? d : 99, dHal1: p.fn && p.n === 1 ? d : 99 }; },
      svg: (p, o) => {
        const sc = 60, x0 = 20; let s = '';
        for (let k = 0; k <= 4; k++) s += `<path d="M${x0 + k * sc} 30v36" stroke="currentColor"/>` + tm(x0 + k * sc, 80, k + ' ms');
        const xs = x0 + p.ph * sc; s += `<rect x="${xs}" y="38" width="${o.d * sc}" height="20" rx="3" fill="var(--led)" fill-opacity=".7"/><path d="M${xs} 26v44" stroke="var(--err)" stroke-width="2"/>` + tx(xs + 3, 24, 'llamada', 'vizsm', 'fill:var(--err)');
        s += tx(8, 104, `${p.fn ? 'HAL_Delay' : 'osDelay'}(${p.n}) llamada a ${num(p.ph, 2)} ms del último tick`, 'vizsm', 'fill:currentColor') + tx(8, 126, `Dura ${num(o.d, 2)} ms`, 'vizbig');
        s += tx(8, 146, p.fn ? 'HAL_Delay añade un tick para garantizar el mínimo' : 'osDelay cuenta ticks: el primero puede llegar enseguida');
        return SV(154, s);
      }
    },
    // st39 · consumo medio y duración de la batería
    st_avg: {
      calc: p => { const avg = (p.iw * 1000 * p.tw / 1000 + p.is * (p.per - p.tw / 1000)) / p.per; return { avg, days: 2000 / (avg / 1000) / 24 }; },
      svg: (p, o) => {
        const lg = v => 10 + Math.log10(Math.max(1, v)) / 5 * 90; let s = `<path d="M20 120H290M20 20V120" stroke="var(--line)"/>`;
        for (let k = 0; k < 3; k++) { const x = 30 + k * 85, w = Math.max(3, 85 * p.tw / 1000 / p.per * 8); s += `<rect x="${x}" y="${120 - lg(p.iw * 1000)}" width="${Math.min(40, w)}" height="${lg(p.iw * 1000)}" fill="var(--err)" fill-opacity=".7"/><rect x="${x + Math.min(40, w)}" y="${120 - lg(p.is)}" width="${85 - Math.min(40, w)}" height="${lg(p.is)}" fill="var(--ok)" fill-opacity=".5"/>`; }
        s += tx(24, 16, 'Corriente (escala logarítmica)') + tx(8, 140, `Media: ${o.avg >= 1000 ? num(o.avg / 1000, 2) + ' mA' : num(o.avg, 1) + ' µA'}`, 'vizlab');
        s += tx(8, 160, `Batería de 2000 mAh: ${o.days >= 365 ? num(o.days / 365, 1) + ' años' : num(o.days, 0) + ' días'} (sin contar autodescarga)`, 'vizsm', OKS(o.days >= 365));
        return SV(168, s);
      }
    },
    // st40 · el IWDG y el refresco
    st_iwdg: {
      calc: p => { const t = p.pr * (p.rlr + 1) / 32, tmin = p.pr * (p.rlr + 1) / 47; return { t, tmin, ok500: p.ref === 500 && p.ref < t ? 1 : 0, safe500: p.ref === 500 && p.ref < tmin ? 1 : 0 }; },
      svg: (p, o) => {
        const span = Math.min(Math.max(o.t * 1.3, p.ref * 2.2), o.t * 4), sc = 270 / span; let s = '', saw = 'M15 40';
        let tt = 0; while (tt < span) { const nx = Math.min(span, tt + Math.min(p.ref, o.t)); saw += `L${(15 + nx * sc).toFixed(1)} ${(40 + (nx - tt) / o.t * 60).toFixed(1)}`; if (nx - tt >= o.t - 1e-9) { s += `<path d="M${(15 + nx * sc).toFixed(1)} 30v80" stroke="var(--err)" stroke-width="2"/>` + tx(15 + nx * sc + 2, 30, 'RESET', 'vizsm', 'fill:var(--err)'); break; } saw += `V40`; tt = nx; }
        s = `<path d="M15 100H290" stroke="var(--line)"/><path d="${saw}" fill="none" stroke="var(--ice)" stroke-width="2.2"/>` + s + tx(15, 116, 'cuenta atrás → 0 = reset; cada refresco la recarga');
        s += tx(8, 138, `Tiempo con LSI de 32 kHz: ${num(o.t, 1)} ms`, 'vizlab') + tx(8, 156, `Con el LSI más rápido (47 kHz): ${num(o.tmin, 1)} ms`, 'vizsm', 'fill:currentColor') + tx(8, 174, `Refrescas cada ${p.ref} ms → ${p.ref < o.tmin ? 'seguro siempre' : p.ref < o.t ? 'justo: falla si el LSI va rápido' : 'se reinicia'}`, 'vizsm', OKS(p.ref < o.tmin));
        return SV(182, s);
      }
    },
    // st41 · BOOT0 solo cuenta en el reset
    st_boot0: {
      calc: p => ({ dfu: p.rst ? 1 : 0, stay: p.rst && !p.now ? 1 : 0 }),
      svg: (p, o) => {
        let s = tx(8, 16, 'BOOT0', 'vizsm') + `<path d="M50 ${p.rst ? 20 : 40}H120V${p.now ? 20 : 40}H290" fill="none" stroke="var(--led)" stroke-width="2.4"/>` + tx(8, 70, 'NRST', 'vizsm') + `<path d="M50 56H100V76H120V56H290" fill="none" stroke="var(--ice)" stroke-width="2.4"/>`;
        s += `<path d="M120 10v74" stroke="var(--err)" stroke-dasharray="3 3"/>` + tm(115, 98, 'aquí se lee BOOT0', 'vizsm', 'fill:var(--err)') + tm(240, 98, 'después da igual');
        s += rb(8, 112, 284, 34, o.dfu ? 'var(--ice)' : 'var(--ok)', 'currentColor', 0.25) + tm(150, 134, o.dfu ? 'Arranca el cargador de ROM (memoria de sistema): DFU listo' : 'Arranca tu programa desde la Flash', 'vizlab');
        return SV(154, s);
      }
    },
    // st42 · programar sin borrar solo baja bits
    st_flash: {
      calc: p => { const O = FOLD[p.o], Nw = FNEW[p.n], res = p.er ? Nw : (O & Nw); return { res, r2: O === 0xA5 && res === 0x5A ? 1 : 0 }; },
      svg: (p, o) => {
        const O = FOLD[p.o], Nw = FNEW[p.n], row = (y, v, lab, c) => { let s = tx(4, y + 14, lab, 'vizsm'); for (let i = 0; i < 8; i++) { const b = (v >> (7 - i)) & 1; s += `<rect x="${100 + i * 24}" y="${y}" width="22" height="20" rx="3" fill="${b ? c : 'none'}" fill-opacity=".55" stroke="var(--line)"/>` + tm(111 + i * 24, y + 14, b, 'vizsm', 'fill:currentColor'); } return s; };
        let s = row(10, p.er ? 0xFF : O, p.er ? 'Tras borrar' : 'Ahora hay', 'var(--ice)') + row(40, Nw, 'Programas', 'var(--led)') + row(76, o.res, 'Queda', o.res === Nw ? 'var(--ok)' : 'var(--err)');
        s += tx(8, 116, p.er ? `Borrado: todo a 0xFF; luego queda ${h2(o.res)}` : `Sin borrar: ${h2(O)} AND ${h2(Nw)} = ${h2(o.res)}`, 'vizlab', o.res === Nw ? 'fill:var(--ok)' : 'fill:var(--err)') + tx(8, 136, 'Programar solo puede pasar bits de 1 a 0');
        return SV(144, s);
      }
    },
    // st43 · condensadores de carga del cristal
    st_xtal: {
      calc: p => { const eff = p.c / 2 + p.cp, match = Math.abs(eff - p.cl) <= 0.6 ? 1 : 0; return { eff, need: 2 * (p.cl - p.cp), match, match6: p.cl === 6 && match ? 1 : 0 }; },
      svg: (p, o) => {
        let s = `<rect x="130" y="20" width="40" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M60 31H130M170 31H240M60 31V60M240 31V60M50 60H70M50 66H70M230 60H250M230 66H250M60 66V90M240 66V90M50 90H70M230 90H250" stroke="currentColor" stroke-width="2" fill="none"/>`;
        s += tm(150, 14, 'cristal') + tm(60, 108, `C = ${p.c} pF`) + tm(240, 108, `C = ${p.c} pF`) + tm(150, 70, `+ ${p.cp} pF parásitos`);
        s += tx(8, 132, `Carga que ve el cristal: ${p.c}/2 + ${p.cp} = ${num(o.eff, 1)} pF (pide ${num(p.cl, 1)} pF)`, 'vizsm', 'fill:currentColor') + tx(8, 152, o.match ? 'Ajustado: oscila a su frecuencia' : o.eff > p.cl ? 'Demasiada carga: va algo lento' : 'Poca carga: va algo rápido', 'vizlab', OKS(o.match)) + tx(8, 170, `Ideal: C = 2 × (${num(p.cl, 1)} − ${p.cp}) = ${num(o.need, 1)} pF`);
        return SV(178, s);
      }
    },
    // st43 · caída del regulador con una Li-ion
    st_ldo: {
      calc: p => { const vout = Math.min(3.3, p.vin - p.drop), ok = vout >= 3.29 ? 1 : 0; return { vout, ok, ok37: Math.abs(p.vin - 3.7) < 1e-9 && ok ? 1 : 0, ok35: Math.abs(p.vin - 3.5) < 1e-9 && ok ? 1 : 0 }; },
      svg: (p, o) => {
        const y = v => 130 - (v - 2.5) / 2 * 110;
        let s = `<rect x="40" y="${y(p.vin)}" width="60" height="${130 - y(p.vin)}" fill="var(--ice)" fill-opacity=".5"/><rect x="190" y="${y(o.vout)}" width="60" height="${130 - y(o.vout)}" fill="${o.ok ? 'var(--ok)' : 'var(--err)'}" fill-opacity=".6"/><path d="M30 ${y(3.3)}H270" stroke="var(--muted)" stroke-dasharray="4 4"/>`;
        s += tm(70, y(p.vin) - 4, num(p.vin, 1) + ' V') + tm(220, y(o.vout) - 4, num(o.vout, 2) + ' V') + tm(70, 146, 'batería') + tm(220, 146, 'salida') + tm(145, 80, `− ${num(p.drop, 1)} V`, 'vizlab') + tx(272, y(3.3) + 4, '3,3');
        s += tx(8, 168, o.ok ? 'El regulador mantiene los 3,3 V' : 'Sin margen: la salida cae por debajo de 3,3 V', 'vizlab', OKS(o.ok));
        return SV(176, s);
      }
    },
    // st44 · número de versión al publicar
    st_semver: {
      calc: p => ({ v: [10402, 10403, 10500, 20000][p.tipo] }),
      svg: (p, o) => {
        const v = [Math.floor(o.v / 10000), Math.floor(o.v / 100) % 100, o.v % 100], old = [1, 4, 2];
        let s = tx(8, 16, 'Versión publicada: 1.4.2 (MAYOR.MENOR.PARCHE)', 'vizsm');
        v.forEach((n, i) => { const ch = n !== old[i]; s += rb(20 + i * 90, 30, 70, 50, ch ? 'var(--led)' : 'none', 'currentColor', 0.4) + tm(55 + i * 90, 64, n, 'vizbig', 'font-size:22px') + tm(55 + i * 90, 96, ['MAYOR', 'MENOR', 'PARCHE'][i]); });
        s += tx(8, 124, ['Sin cambios: misma versión', 'Corrección de errores: sube PARCHE', 'Función nueva compatible: sube MENOR y PARCHE vuelve a 0', 'Cambio incompatible: sube MAYOR y lo demás a 0'][p.tipo], 'vizlab');
        return SV(132, s);
      }
    }
  });

  /* ======================= DESLIZADORES REUTILIZABLES ======================= */
  const sl = (label, val, min, max, unit = '', dec = 0) => ({ label, val, min, max, step: 1, unit, dec });
  const li = (label, val, list, unit = '', dec = 0) => ({ label, val, list, unit, dec });
  const P_WIDTH = (bits, a) => ({ bits: li('Ancho de la CPU', bits, [8, 16, 32], 'bits'), a: li('Número', a, [100, 250, 1000, 40000, 70000, 3000000000]) });
  const P_CORES = (core, op) => ({ core: sl('Núcleo (M0+ … M33)', core, 0, 4), op: sl('Operación (suma … double)', op, 0, 3) });
  const P_PART = (pins, fl, pkg, tmp) => ({ pins: sl('Patas (C, R, V, Z)', pins, 0, 3), fl: sl('Flash (8, B, C, E, G)', fl, 0, 4), pkg: sl('Encapsulado (T, U)', pkg, 0, 1), tmp: sl('Temperatura (6, 7)', tmp, 0, 1) });
  const P_BOARD = (board, lvl) => ({ board: sl('Placa (Nucleo, Black Pill)', board, 0, 1), lvl: sl('Valor escrito en el pin', lvl, 0, 1) });
  const P_MEM = (reg, kb) => ({ reg: sl('Región (Flash, SRAM)', reg, 0, 1), kb: li('Tamaño', kb, [16, 32, 64, 128, 256, 512], 'KB') });
  const P_REGEN = (zona, regen) => ({ zona: sl('Tu línea (fuera, dentro de USER CODE)', zona, 0, 1), regen: sl('Regenerar código (no, sí)', regen, 0, 1) });
  const P_SWD = (gnd, len, f) => ({ gnd: sl('GND conectado (no, sí)', gnd, 0, 1), len: li('Cable', len, [5, 10, 20, 30, 50], 'cm'), f: li('Frecuencia SWD', f, [0.5, 1, 2, 4, 8], 'MHz', 1) });
  const P_CYC = (f, c) => ({ f: li('Reloj del núcleo', f, [16, 72, 84, 100, 168], 'MHz'), c: li('Cuentas de CYCCNT', c, [84, 420, 1000, 2500, 8400, 16800, 100000]) });
  const P_UTX = (n, baud) => ({ n: li('Caracteres', n, [10, 20, 46, 100, 200]), baud: li('Baudios', baud, [9600, 19200, 57600, 115200, 460800, 921600]) });
  const P_SEC = (text, data, bss, res) => ({ text: li('.text', text, [8, 16, 32, 64, 128, 256, 400, 480, 520], 'KB'), data: li('.data', data, [0, 200, 1000, 4000], 'B'), bss: li('.bss', bss, [1, 4, 16, 64, 100, 120, 130], 'KB'), res: res == null ? { val: 0, fixed: true } : li('Reserva al final de la Flash', res, [0, 128], 'KB') });
  const P_ADDR = (port, reg) => ({ port: sl('Puerto (A, B, C, D)', port, 0, 3), reg: sl('Registro (MODER … AFR[0])', reg, 0, 7) });
  const P_R32 = (op, bit) => ({ op: sl('Operación (|=, &=~, ^=, =)', op, 0, 3), bit: sl('Bit n', bit, 0, 31) });
  const P_BSRR = bit => ({ bit: sl('Bit de BSRR que escribes a 1', bit, 0, 31) });
  const P_HALM = (mode, n) => ({ mode: sl('Modo (sondeo, _IT, _DMA)', mode, 0, 2), n: li('Bytes', n, [1, 10, 100, 1000]) });
  const P_BOOT = s => ({ step: sl('Paso', s, 0, 6) });
  const P_TICK = (f, hz) => ({ f: li('Reloj del núcleo', f, [16, 48, 72, 84, 100, 168], 'MHz'), hz: li('Interrupciones por segundo', hz, [1, 10, 100, 1000, 10000], 'Hz') });
  const P_OSC = (src, days) => ({ src: sl('Fuente (HSI, HSE, LSI, LSE)', src, 0, 3), days: li('Días', days, [1, 7, 30, 365]) });
  const P_WS = (f, ws) => ({ f: li('SYSCLK', f, [16, 30, 48, 64, 84, 90, 100], 'MHz'), ws: sl('Wait states', ws, 0, 3) });
  const P_PIN = (mode, ot, pu, other, out) => ({ mode: sl('Modo (entrada, salida)', mode, 0, 1), ot: sl('Tipo (push-pull, open-drain)', ot, 0, 1), pu: sl('Pull-up (no, sí)', pu, 0, 1), out: sl('Valor que escribes', out, 0, 1), other: sl('La otra placa (suelta, tira a 0)', other, 0, 1) });
  const P_RC = (R, C, f) => ({ R: li('Pull-up', R, [1, 2.2, 4.7, 10, 40], 'kΩ', 1), C: li('Capacidad del bus', C, [50, 100, 200, 400], 'pF'), f: li('Velocidad I²C', f, [100, 400], 'kHz') });
  const P_AFR = (pin, af) => ({ pin: sl('Pin PAn', pin, 0, 15), af: sl('Función AF', af, 0, 15) });
  const P_IRQ = (ie, nv, name, clr) => ({ ie: sl('Activada en el periférico', ie, 0, 1), nv: sl('Activada en el NVIC', nv, 0, 1), name: sl('Nombre exacto del manejador', name, 0, 1), clr: sl('Borra la bandera', clr, 0, 1) });
  const P_RACE = (when, crit) => ({ when: sl('Llega la ISR (antes, en medio, al final)', when, 0, 2), crit: sl('Sección crítica (no, sí)', crit, 0, 1) });
  const P_EXTI = (p1, p2) => ({ p1: sl('Botón A en PAn', p1, 0, 15), p2: sl('Botón B en PBn', p2, 0, 15) });
  const P_ENC = (ppr, x, red) => ({ ppr: li('Pulsos por vuelta', ppr, [7, 11, 12, 16, 100]), x: li('Modo', x, [1, 2, 4], '×'), red: li('Reductora', red, [1, 20, 30, 50], ':1') });
  const P_DEAD = (dtg, toff) => ({ dtg: li('DTG', dtg, [0, 5, 10, 15, 20, 25, 30, 40, 50, 80]), toff: li('Apagado del transistor', toff, [100, 200, 400], 'ns') });
  const P_SCAN = (n, k, i) => ({ n: sl('Canales', n, 2, 6), k: sl('Muestra k', k, 0, 12), i: sl('Canal i', i, 0, 5) });
  const P_DAC = (N, ft, off) => ({ N: li('Muestras por periodo', N, [10, 20, 50, 100, 200]), ft: li('Disparo del temporizador', ft, [100, 200, 500, 1000], 'kHz'), off: sl('Sumar 2048 (no, sí)', off, 0, 1) });
  const P_BAUD = (pclk, baud) => ({ pclk: li('PCLK', pclk, [8, 16, 42, 50, 84], 'MHz'), baud: li('Baudios', baud, [9600, 115200, 460800, 921600]) });
  const P_SPI = (dev, cpol, cpha) => ({ dev: sl('Modo que pide el chip', dev, 0, 3), cpol: sl('CPOL', cpol, 0, 1), cpha: sl('CPHA', cpha, 0, 1) });
  const P_CANB = (brp, bs1, bs2) => ({ brp: li('Preescalador BRP', brp, [1, 2, 3, 4, 6, 9, 12]), bs1: sl('BS1', bs1, 1, 16, 'tq'), bs2: sl('BS2', bs2, 1, 8, 'tq') });
  const P_ARB = (a, b) => ({ a: sl('ID de A (lista)', a, 0, 5), b: sl('ID de B (lista)', b, 0, 5) });
  const P_RTOS = (pa, pb, wait) => ({ pa: sl('Prioridad de A', pa, 1, 3), pb: sl('Prioridad de B', pb, 1, 3), wait: sl('Esperan con (HAL_Delay, osDelay)', wait, 0, 1) });
  const P_STK = (words, arr, pf) => ({ words: li('Pila de la tarea', words, [128, 256, 384, 512, 768], 'palabras'), arr: li('Array local', arr, [0, 64, 256, 1024], 'B'), pf: sl('Usa printf (no, sí)', pf, 0, 1) });
  const P_DRIFT = (work, mode) => ({ work: li('Trabajo por vuelta', work, [0, 1, 2, 3, 5, 8], 'ms'), mode: sl('Espera (osDelay, osDelayUntil)', mode, 0, 1) });
  const P_QUEUE = (prod, cons, len, pw) => ({ prod: li('Productor', prod, [50, 100, 200], 'msj/s'), cons: li('Consumidor', cons, [50, 100, 200], 'msj/s'), len: li('Longitud de la cola', len, [4, 8, 16]), pw: sl('Si está llena (descarta, espera)', pw, 0, 1) });
  const P_INV = (med, inh, cs) => ({ med: sl('Tarea media activa (no, sí)', med, 0, 1), inh: sl('Herencia de prioridad (no, sí)', inh, 0, 1), cs: li('Sección crítica de la baja', cs, [2, 3, 4], 'ms') });
  const P_TRES = (ph, n, fn) => ({ fn: sl('Función (osDelay, HAL_Delay)', fn, 0, 1), n: li('Argumento', n, [1, 2, 5]), ph: li('Momento de la llamada dentro del tick', ph, [0, 0.25, 0.5, 0.75, 0.95], 'ms', 2) });
  const P_AVG = (iw, tw, per, is) => ({ iw: li('Despierto', iw, [1, 5, 10, 20], 'mA'), tw: li('Tiempo despierto', tw, [5, 20, 50, 100], 'ms'), per: li('Cada', per, [1, 10, 60], 's'), is: li('Dormido', is, [2, 10, 50, 500], 'µA') });
  const P_IWDG = (pr, rlr, ref) => ({ pr: li('Preescalador', pr, [4, 8, 16, 32, 64, 128, 256], '÷'), rlr: li('RLR', rlr, [99, 249, 499, 999, 1999, 4095]), ref: li('Refrescas cada', ref, [10, 100, 500, 1000, 2000], 'ms') });
  const P_B0 = (rst, now) => ({ rst: sl('BOOT0 al soltar NRST', rst, 0, 1), now: sl('BOOT0 ahora', now, 0, 1) });
  const P_FLASH = (o, n, er) => ({ o: sl('Contenido (FF, 0F, A5, 00)', o, 0, 3), n: sl('Escribes (F0, 5A, 0F, FF)', n, 0, 3), er: sl('Borrar antes (no, sí)', er, 0, 1) });
  const P_XTAL = (cl, cp, c) => ({ cl: li('CL del cristal', cl, [6, 8, 10, 12.5, 18], 'pF', 1), cp: li('Parásitos', cp, [2, 3, 4, 5], 'pF'), c: li('Condensador a cada lado', c, [6, 8, 10, 12, 15, 18, 22, 27, 33], 'pF') });
  const P_LDO = (vin, drop) => ({ vin: li('Batería', vin, [4.2, 3.9, 3.7, 3.5, 3.3, 3.0], 'V', 1), drop: li('Caída del regulador', drop, [1.0, 0.3, 0.1], 'V', 1) });
  const P_SEMVER = t => ({ tipo: sl('Cambio (nada, arreglo, función, incompatible)', t, 0, 3) });
  const P_CLK = (hse, m, n, pp, a1, a2) => ({ HSE: { label: 'HSE', val: hse, list: [8, 12, 16, 25], unit: 'MHz', dec: 0 }, M: sl('M', m, 2, 63), N: { label: 'N', val: n, min: 50, max: 432, step: 2, dec: 0 }, P: li('P', pp, [2, 4, 6, 8]), A1: li('APB1 ÷', a1, [1, 2, 4, 8, 16]), A2: li('APB2 ÷', a2, [1, 2, 4, 8, 16]) });

  /* ======================= DIBUJOS FIJOS ======================= */
  const SVG_CORE = SV(150, `<rect x="6" y="10" width="288" height="130" rx="12" fill="none" stroke="currentColor" stroke-width="2"/>` + tx(16, 30, 'Chip STM32 (diseño de ST)', 'vizlab') +
    `<rect x="20" y="42" width="120" height="86" rx="9" fill="var(--ice)" fill-opacity=".3" stroke="currentColor"/>` + tm(80, 62, 'Núcleo Cortex-M', 'vizlab') + tm(80, 80, '(licencia de ARM)') + tm(80, 98, 'NVIC · SysTick') + tm(80, 114, 'SWD · Thumb') +
    ['Flash y RAM', 'Relojes y PLL', 'GPIO · UART · ADC', 'Temporizadores · DMA'].map((t, i) => `<rect x="152" y="${42 + i * 22}" width="132" height="18" rx="5" fill="var(--led)" fill-opacity=".25" stroke="var(--line)"/>` + tm(218, 55 + i * 22, t, 'vizsm', 'fill:currentColor')).join(''));
  const SVG_PRINTF = chain(['printf()', 'newlib|formatea', '_write()', '__io_putchar|(la escribes tú)', 'HAL_UART_|Transmit', 'USART2 → PC'], 3);
  const SVG_TOOL = chain(['main.c', 'gcc|compila', 'main.o', 'ld + .ld|enlaza', 'app.elf|+ app.map', 'objcopy|→ app.bin']);
  const SVG_LAYERS = table([['Arduino', 'Bibliotecas de Arduino: rápido, poco control'], ['HAL', 'Manejadores y callbacks: portable'], ['LL', 'Funciones inline casi como registros'], ['Registros', 'CMSIS: control total, nada portable']], 'De más cómodo (arriba) a más fino (abajo)');
  const SVG_DOCS = table([['Hoja de datos', 'Patillaje, AF, límites eléctricos'], ['Manual de ref.', 'Cada registro, bit a bit'], ['Erratas', 'Fallos conocidos del silicio'], ['Manual de prog.', 'El núcleo y sus instrucciones']], 'Cuatro documentos, cuatro preguntas');
  const SVG_HALST = table([['HAL_OK', 'Todo ha ido bien'], ['HAL_ERROR', 'Error del periférico o de parámetros'], ['HAL_BUSY', 'Ocupado con otra operación'], ['HAL_TIMEOUT', 'Se agotó el tiempo de espera']], 'Lo que devuelve casi cada función HAL');
  const SVG_32K = chain(['32 768 Hz', '÷2 ×15|veces', '1 Hz|el segundo']);
  const SVG_STACK = SV(170, `<rect x="40" y="10" width="110" height="150" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>` + `<rect x="42" y="12" width="106" height="50" fill="var(--led)" fill-opacity=".35"/>` + tm(95, 40, 'pila ↓ crece', 'vizlab') + `<rect x="42" y="56" width="106" height="12" fill="var(--err)" fill-opacity=".5"/>` + `<rect x="42" y="100" width="106" height="28" fill="var(--ice)" fill-opacity=".35"/>` + tm(95, 118, '.bss (globales)') + `<rect x="42" y="130" width="106" height="28" fill="var(--ok)" fill-opacity=".3"/>` + tm(95, 148, '.data') + tx(160, 30, 'final de la SRAM', 'vizsm') + tx(160, 66, 'la pila se pasa…', 'vizsm', 'fill:var(--err)') + tx(160, 116, '…y pisa variables', 'vizsm', 'fill:var(--err)') + tx(160, 150, 'principio de la SRAM'));
  const SVG_IRQSTACK = SV(150, tx(8, 16, 'Al entrar, el hardware apila 8 registros:', 'vizlab') + ['xPSR', 'PC', 'LR', 'R12', 'R3', 'R2', 'R1', 'R0'].map((r, i) => `<rect x="${10 + i * 35}" y="28" width="32" height="26" rx="4" fill="var(--ice)" fill-opacity=".4" stroke="currentColor"/>` + tm(26 + i * 35, 46, r, 'vizsm', 'fill:currentColor')).join('') + tx(8, 82, 'Son los que una función de C puede machacar.') + tx(8, 100, 'Por eso el manejador es una función normal.') + tx(8, 126, 'Unos 12 ciclos de entrada en un M3 o un M4', 'vizlab'));
  const SVG_RTOSPRIO = SV(130, tx(8, 16, 'Prioridad NVIC (0 = más urgente)', 'vizsm') + Array.from({ length: 16 }, (_, i) => `<rect x="${8 + i * 18}" y="24" width="16" height="24" rx="3" fill="${i < 5 ? 'var(--err)' : 'var(--ok)'}" fill-opacity=".45"/>` + tm(16 + i * 18, 40, i, 'vizsm', 'fill:currentColor')).join('') + `<path d="M98 20v34" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2"/>` + tx(8, 72, '0–4: nunca las retrasa el RTOS, pero no pueden', 'vizsm', 'fill:var(--err)') + tx(8, 86, 'llamar a su API', 'vizsm', 'fill:var(--err)') + tx(8, 106, '5–15: pueden usar las funciones FromISR', 'vizsm', 'fill:var(--ok)') + tx(8, 124, 'configMAX_SYSCALL_INTERRUPT_PRIORITY = 5'));
  const SVG_POWER = table([['Sleep', 'Para el núcleo; despierta cualquier IRQ'], ['Stop', 'Para relojes; RAM intacta; EXTI o RTC'], ['Standby', 'Casi todo apagado; vuelve desde reset']], 'Cuanto más abajo, menos consumo y más se pierde');
  const SVG_BOUNCE = SV(120, `<path d="M10 30H80V90H86V40H92V88H98V50H104V90H112V90H290" fill="none" stroke="var(--led)" stroke-width="2.4"/>` + tx(76, 108, 'rebotes: unos ms', 'vizsm', 'fill:var(--err)') + `<path d="M80 18h80" stroke="var(--ice)" stroke-width="3"/>` + tx(80, 14, 'ventana de 20 ms: ignorar', 'vizsm') + tx(180, 60, 'una pulsación =', 'vizsm') + tx(180, 76, 'varios flancos', 'vizsm'));
  const SVG_DMACFG = SV(150, rb(6, 30, 86, 50) + tm(49, 50, 'ADC->DR', 'vizlab') + tm(49, 68, 'fijo') + `<path d="M92 55H150" stroke="currentColor" stroke-width="2"/>` + rb(150, 30, 60, 50, 'var(--ice)', 'currentColor', 0.3) + tm(180, 60, 'DMA', 'vizlab') + `<path d="M210 55H232" stroke="currentColor" stroke-width="2"/>` + [0, 1, 2, 3].map(i => `<rect x="${234 + (i % 2) * 31}" y="${30 + Math.floor(i / 2) * 26}" width="29" height="24" rx="3" fill="var(--led)" fill-opacity="${0.2 + i * 0.15}" stroke="var(--line)"/>` + tm(248 + (i % 2) * 31, 46 + Math.floor(i / 2) * 26, 'buf' + i, 'vizsm', 'fill:currentColor')).join('') + tx(6, 104, 'Periférico → memoria · media palabra (16 bits)', 'vizsm', 'fill:currentColor') + tx(6, 122, 'Periférico sin incremento · memoria con incremento') + tx(6, 140, 'Normal (una pasada) o circular (vuelve a empezar)'));
  const SVG_CCM = SV(150, rb(110, 10, 80, 30, 'var(--ice)', 'currentColor', 0.3) + tm(150, 30, 'Núcleo', 'vizlab') + rb(10, 100, 70, 30, 'var(--led)', 'currentColor', 0.3) + tm(45, 120, 'CCM', 'vizlab') + rb(115, 100, 70, 30) + tm(150, 120, 'SRAM', 'vizlab') + rb(220, 10, 70, 30) + tm(255, 30, 'DMA', 'vizlab') + `<path d="M130 40L50 100M150 40V100M255 40L170 100" stroke="currentColor" stroke-width="2"/><path d="M240 40L70 100" stroke="var(--err)" stroke-width="2" stroke-dasharray="5 4"/>` + tx(8, 92, '✗ sin camino', 'vizsm', 'fill:var(--err)') + tx(8, 146, 'La CCM solo la ve el núcleo: el DMA no llega', 'vizsm', 'fill:currentColor'));
  const SVG_IDLE = SV(120, tx(4, 20, 'RX') + `<path d="M24 30H40V46H52V30H64V46H76V30H90V46H102V30H200H290" fill="none" stroke="var(--ice)" stroke-width="2.4"/>` + `<rect x="102" y="24" width="60" height="28" fill="var(--ok)" fill-opacity=".2"/>` + tm(132, 84, '1 carácter en silencio', 'vizsm', 'fill:var(--ok)') + `<path d="M162 20v46" stroke="var(--err)" stroke-width="2"/>` + tx(168, 62, 'IDLE: fin del mensaje', 'vizsm', 'fill:var(--err)') + tx(4, 100, 'El DMA guarda los bytes; IDLE avisa al acabar la frase', 'vizsm', 'fill:currentColor'));
  const SVG_DE = SV(130, tx(4, 22, 'TX') + `<path d="M30 30H60V44H80V30H100V44H130V30H160V44H180V30H290" fill="none" stroke="var(--ice)" stroke-width="2.2"/>` + tx(4, 72, 'DE') + `<path d="M30 80H50V62H190V80H290" fill="none" stroke="var(--led)" stroke-width="2.2"/>` + `<path d="M180 20v80" stroke="var(--ok)" stroke-dasharray="3 3"/>` + tx(150, 112, 'TC: salió el último bit', 'vizsm', 'fill:var(--ok)') + `<path d="M150 20v6" stroke="var(--err)" stroke-width="2"/>` + tx(4, 124, 'Si bajas DE con TXE, cortas el último byte', 'vizsm', 'fill:var(--err)'));
  const SVG_I2CADDR = SV(130, tx(8, 16, 'Dirección de 7 bits 0x68 y el bit R/W', 'vizlab') + [1, 1, 0, 1, 0, 0, 0, 'R/W'].map((b, i) => `<rect x="${10 + i * 34}" y="28" width="32" height="28" rx="4" fill="${i === 7 ? 'var(--led)' : 'var(--ice)'}" fill-opacity=".4" stroke="currentColor"/>` + tm(26 + i * 34, 47, b, 'vizsm', 'fill:currentColor')).join('') + tx(8, 80, 'La HAL quiere los 8 bits con hueco para R/W:', 'vizsm', 'fill:currentColor') + tx(8, 98, '0x68 << 1 = 0xD0', 'vizbig') + tx(8, 120, 'La propia HAL rellena el bit de lectura o escritura'));
  const SVG_BUS = table([['UART', 'Asíncrona, sin reloj, punto a punto'], ['I²C', '2 hilos open-drain, direcciones'], ['SPI', 'Reloj + MOSI/MISO + CS, rápido'], ['CAN', 'Diferencial, multimaestro, arbitraje']], 'Cuatro buses');
  const SVG_CDC = chain(['Tu código|CDC_Transmit_FS', 'USB 12 Mbit/s', 'PC: COMx o|/dev/ttyACM0']);
  const SVG_WDG = SV(130, tx(8, 16, 'WWDG: refresco válido solo dentro de la ventana', 'vizsm') + `<rect x="10" y="30" width="120" height="30" fill="var(--err)" fill-opacity=".3"/><rect x="130" y="30" width="110" height="30" fill="var(--ok)" fill-opacity=".35"/><rect x="240" y="30" width="50" height="30" fill="var(--err)" fill-opacity=".3"/>` + tm(70, 50, 'demasiado pronto') + tm(185, 50, 'ventana: refresca', 'vizsm', 'fill:currentColor') + tm(265, 50, 'tarde') + tx(8, 86, 'IWDG: solo cuenta atrás; basta con llegar a tiempo') + tx(8, 106, 'Refresca donde solo llegas si todo va bien', 'vizlab'));
  const SVG_BLPROTO = SV(150, tx(8, 16, 'Tu PC', 'vizlab') + `<text x="292" y="16" text-anchor="end" class="vizlab">Cargador de ROM</text>` + [['0x7F →', 'detecta la velocidad'], ['← 0x79', 'ACK'], ['0x31 0xCE →', 'escribir + complemento'], ['← 0x79', 'ACK']].map(([a, b], i) => tx(i % 2 ? 160 : 8, 40 + i * 24, a, 'vizlab', 'fill:var(--led)') + tx(i % 2 ? 160 : 8, 52 + i * 24, b)).join('') + tx(8, 144, 'UART en 8E1: paridad par obligatoria', 'vizsm', 'fill:currentColor'));
  const SVG_RDP = table([['Nivel 0', 'Sin protección'], ['Nivel 1', 'No se lee la Flash; volver a 0 la borra'], ['Nivel 2', 'Sin depuración nunca más: irreversible']], 'Protección de lectura');
  const SVG_MINBOARD = table([['VDD', '100 nF en cada pata + 4,7–10 µF'], ['VCAP', 'El condensador de la hoja de datos'], ['VDDA', 'Ferrita y condensadores'], ['BOOT0', '10 kΩ a masa'], ['NRST', '100 nF a masa'], ['USB', 'Supresor ESD en D+ y D−']], 'Circuito mínimo');
  const SVG_BRINGUP = chain(['Inspección y|continuidad', 'Fuente con|límite: 3,3 V', 'ST-LINK:|leer el ID', 'Parpadeo', 'Reloj por MCO', 'Cada periférico|por separado'], -1);
  const SVG_FWLAYERS = table([['Aplicación', 'Estados y lógica del producto'], ['Servicios', 'Filtros, protocolos, control'], ['Drivers', 'Hablan con el hardware'], ['HAL / registros', 'El chip']], 'Cada capa solo usa la de debajo');
  const SVG_PINLIM = table([['Un pin', 'Unos 25 mA como máximo'], ['Pines FT', 'Toleran 5 V solo como entrada digital'], ['OSPEEDR', 'Rapidez de los flancos, no frecuencia'], ['Cargas grandes', 'Transistor (y diodo si es bobina)']], 'Límites de un pin de STM32');
  const SVG_FAMILY = table([['F', 'Uso general clásico: F0, F1, F4, F7'], ['G', 'Uso general moderno: G0, G4'], ['L · U', 'Bajo consumo: L0, L4, U5'], ['H', 'Alto rendimiento: H7'], ['W', 'Con radio: WB, WL']], 'La letra dice para qué es');
  const SVG_VOLATILE = SV(140, tx(8, 16, 'while (!listo) { }', 'vizlab') + rb(8, 26, 136, 64) + tm(76, 44, 'Sin volatile', 'vizlab') + tm(76, 62, 'lee listo 1 vez') + tm(76, 78, '→ bucle infinito', 'vizsm', 'fill:var(--err)') + rb(156, 26, 136, 64, 'var(--ok)', 'currentColor', 0.15) + tm(224, 44, 'Con volatile', 'vizlab') + tm(224, 62, 'lee en cada vuelta') + tm(224, 78, '→ ve el cambio', 'vizsm', 'fill:var(--ok)') + tx(8, 112, '__IO de CMSIS = volatile: cada acceso al registro') + tx(8, 128, 'se hace de verdad'));
  const SVG_RCC = SV(130, tx(8, 16, 'RCC: un grifo de reloj por periférico', 'vizlab') + [['AHB1ENR', 'GPIOA, GPIOB, DMA…'], ['APB1ENR', 'USART2, TIM2–5, I²C…'], ['APB2ENR', 'USART1, TIM1, SYSCFG, ADC…']].map(([a, b], i) => rb(8, 26 + i * 30, 90, 24, 'var(--ice)', 'currentColor', 0.3) + tm(53, 42 + i * 30, a, 'vizsm', 'fill:currentColor') + tx(106, 42 + i * 30, b)).join('') + tx(8, 124, 'Cerrado tras el reset: sin reloj, el periférico no responde', 'vizsm', 'fill:var(--err)'));
  const SVG_SWDREC = SV(130, tx(4, 20, 'NRST') + `<path d="M40 14H70V34H180V14H290" fill="none" stroke="var(--ice)" stroke-width="2.4"/>` + tm(125, 50, 'el ST-LINK conecta aquí', 'vizsm', 'fill:currentColor') + `<path d="M180 8v60" stroke="var(--ok)" stroke-width="2"/>` + tx(184, 66, 'para el núcleo antes', 'vizsm', 'fill:var(--ok)') + tx(184, 80, 'de la 1.ª instrucción', 'vizsm', 'fill:var(--ok)') + tx(4, 110, 'Tu código no llega a desactivar PA13 y PA14', 'vizlab'));
  const SVG_DBG = table([['Punto de ruptura', 'Para en una línea'], ['Watchpoint', 'Para al leer o escribir una dirección'], ['Step Into / Over', 'Entra en la función / la ejecuta entera'], ['Live Expressions', 'Lee variables sin parar']], 'Herramientas del depurador');
  const SVG_DBGLP = table([['Duerme en Stop', 'El depurador se desconecta'], ['Pausa en ruptura', 'El IWDG sigue y reinicia'], ['DBGMCU', 'Mantiene la depuración o congela el IWDG'], ['En el producto', 'Quítalo: gasta corriente']], 'Depurar con bajo consumo y watchdog');
  const SVG_HSI = SV(130, `<path d="M20 100H290M20 20V100" stroke="var(--line)"/><path d="M20 80H90V30H180V80H220V30H290" fill="none" stroke="var(--led)" stroke-width="2.4"/>` + tx(24, 76, 'HSI 16') + tx(96, 26, 'PLL 100 MHz') + tx(184, 76, 'HSI') + tx(226, 26, 'PLL') + tm(90, 116, 'SystemClock_Config') + tm(180, 116, 'Stop') + tm(220, 126, 'reconfigurar'));
  const SVG_LEAK = table([['LED de encendido', 'Unos mA siempre'], ['Regulador', 'Su corriente propia'], ['Pull-ups con corriente', 'V / R continuamente'], ['Pines al aire', 'Oscilan y consumen']], 'Lo que gasta aunque el chip duerma');
  const SVG_ADVTIM = SV(130, rb(8, 40, 70, 40) + tm(43, 64, 'TIM1 PWM', 'vizsm', 'fill:currentColor') + `<path d="M78 60H120" stroke="currentColor" stroke-width="2"/><path d="M120 60L150 46" stroke="var(--err)" stroke-width="3"/><path d="M150 60H220" stroke="currentColor" stroke-width="2"/>` + tm(135, 36, 'MOE', 'vizlab') + rb(220, 40, 72, 40) + tm(256, 64, 'Puente', 'vizsm', 'fill:currentColor') + tx(8, 104, 'Sin MOE las salidas de TIM1 y TIM8 no salen.') + tx(8, 122, 'BKIN (freno) abre el interruptor por hardware.', 'vizsm', 'fill:var(--err)'));
  const SVG_ADCACC = SV(134, tx(8, 16, 'El ADC mide en «trozos de VDDA»', 'vizlab') + `<rect x="10" y="28" width="280" height="18" rx="4" fill="var(--line)"/><rect x="10" y="28" width="${280 * 1500 / 4095}" height="18" rx="4" fill="var(--ice)"/>` + tx(10, 64, 'VREFINT (estable) leído a 3,3 V: 1500 cuentas', 'vizsm', 'fill:currentColor') + `<rect x="10" y="74" width="280" height="18" rx="4" fill="var(--line)"/><rect x="10" y="74" width="${280 * 1650 / 4095}" height="18" rx="4" fill="var(--led)"/>` + tx(10, 110, 'Hoy lees 1650: VDDA ha bajado', 'vizsm', 'fill:currentColor') + tx(10, 126, 'VDDA = 3,3 × 1500 / 1650 = 3,0 V', 'vizlab'));
  const SVG_USBCLK = chain(['VCO|192 MHz', '÷P = 2', '96 MHz|SYSCLK', '÷Q = 4', '48 MHz|USB ✓']);
  const SVG_SWT = chain(['osTimerStart|(t, 500)', 'Tarea de|temporizadores', 'parpadeo()|corto, sin esperas']);
  const SVG_PROFW = chain(['Pruebas en|verde (CI)', 'Versión|nueva', 'Etiqueta|en git', 'Compilar|producción', 'Guardar .elf|y .bin', 'Grabar y|verificar']);

  /* ======================= EXPLICACIONES ALTERNATIVAS VISUALES ======================= */
  const alt = (k, a) => CONCEPTS[k].alts.push(a);
  alt('st_core', { title: 'Mira dentro del chip', text: 'El rectángulo grande lo diseña ST; el bloque azul es lo que licencia ARM. Todo lo de la derecha cambia de un fabricante a otro; lo de la izquierda es igual en cualquier Cortex-M.', svg: SVG_CORE, q: mcq('¿Qué parte de un STM32 es igual en un chip de NXP con el mismo núcleo?', ['El núcleo con su NVIC y su SysTick', 'Los registros de GPIO', 'El árbol de relojes', 'El ADC'], 'ARM licencia el núcleo; los periféricos son de cada fabricante.') });
  alt('st_cores', { title: 'Pruébalo núcleo a núcleo', text: 'Mueve el núcleo y la operación y mira qué se hace por hardware (✓) y qué por software. Fíjate en las dos columnas de la derecha: ahí está la diferencia entre M3, M4F y M7.', tune: { viz: 'st_cores', params: P_CORES(1, 2) }, q: mcq('¿Qué núcleo es el más sencillo de todos los STM32?', ['Cortex-M0+', 'Cortex-M3', 'Cortex-M4F', 'Cortex-M7'], 'Sin división por hardware ni FPU: G0, C0, L0, F0.') });
  alt('st_fpu', { title: 'float y double en la tabla', text: 'Pon un Cortex-M4F y compara «float ×» con «double ×»: el primero es una instrucción y el segundo se emula. Por eso en un M4F se escribe 0.5f y no 0.5.', tune: { viz: 'st_cores', params: P_CORES(2, 3) }, q: mcq('En un M4F, ¿cuál de estas dos líneas tarda más?', ['La segunda: 0.5 es double y se emula por software', 'La primera', 'Tardan lo mismo', 'Ninguna compila'], 'Sin la f, la constante es double.', { code: 'float y = a * 0.5f;\nfloat z = a * 0.5;' }) });
  alt('st_bits32', { title: 'Cuenta las sumas', text: 'Elige un número grande y un micro de 8 bits: el número se parte en trozos de 1 byte y cada trozo es una suma. Con 32 bits, un solo trozo.', tune: { viz: 'st_width', params: P_WIDTH(8, 70000) }, q: mcq('Sumar dos uint32_t en un micro de 16 bits, ¿cuántas sumas necesita?', ['2', '1', '4', '32'], '32 bits en trozos de 16: dos sumas (la segunda con acarreo).') });
  alt('st_family', { title: 'La letra lo dice', text: 'La primera letra tras STM32 resume para qué está pensada la familia. Luego, dentro de cada una, cada chip trae su lista de periféricos: compruébala siempre.', svg: SVG_FAMILY, q: mcq('Buscas un STM32 para un sensor con pila que debe durar años. ¿Qué letra miras primero?', ['L o U', 'H', 'F7', 'W'], 'L y U son las familias de bajo consumo.') });
  alt('st_partnum', { title: 'Monta el nombre tú', text: 'Mueve los deslizadores y mira cómo cambia cada letra. Las letras no son cantidades: son códigos de una tabla.', tune: { viz: 'st_part', params: P_PART(0, 0, 0, 0) }, q: mcq('¿Qué letra de patas lleva un STM32 de 100 patas?', ['V', 'C', 'R', 'Z'], 'C 48 · R 64 · V 100 · Z 144.') });
  alt('st_boards', { title: 'Enciende los dos LED', text: 'En la Nucleo el LED va del pin a masa: un 1 lo enciende. En la Black Pill va de 3,3 V al pin: hace falta un 0. Pruébalo.', tune: { viz: 'st_board', params: P_BOARD(1, 1) }, q: mcq('LED conectado entre 3,3 V y un pin. ¿Qué valor lo enciende?', ['0', '1', 'Cualquiera', 'Ninguno'], 'Con el pin a 0 V circula corriente desde 3,3 V.') });
  alt('st_pinlim', { title: 'La ficha del pin', text: 'Cuatro reglas que caben en una tabla. Si dudas, la hoja de datos de tu chip manda.', svg: SVG_PINLIM, q: mcq('Un motor pequeño pide 150 mA. ¿Cómo lo mueves desde un pin?', ['Con un transistor y un diodo de libre circulación', 'Directo a un pin FT', 'Con OSPEEDR muy alta', 'Con dos pines en paralelo'], 'Un pin da unos 25 mA.') });
  alt('st_memmap', { title: 'Recorre el mapa', text: 'Elige región y tamaño: verás dónde empieza, cuál es la última dirección y la primera que queda fuera. El tamaño en KB se convierte a hexadecimal y se suma a la base.', tune: { viz: 'st_mem', params: P_MEM(1, 64) }, q: mcq('¿En qué dirección empiezan los periféricos de un STM32F4?', ['0x40000000', '0x08000000', '0x20000000', '0xE0000000'], '0xE0000000 es la zona de los periféricos del núcleo.') });
  alt('st_regaddr', { title: 'Calcula con el puerto y el registro', text: 'Cada puerto empieza 0x400 más arriba que el anterior y cada registro está siempre en el mismo desplazamiento. Mueve los dos y mira la suma.', tune: { viz: 'st_addr', params: P_ADDR(0, 0) }, q: mcq('GPIOC empieza en 0x40020800. ¿Dónde está su ODR (+0x14)?', ['0x40020814', '0x40020800', '0x40020014', '0x40020822'], 'Base + 0x14.') });
  alt('st_volatile', { title: 'Dos bucles, dos finales', text: 'El mismo bucle con y sin volatile. El compilador no sabe que una interrupción o el hardware pueden cambiar la variable: volatile se lo dice.', svg: SVG_VOLATILE, q: mcq('¿Qué variables deben ser volatile?', ['Las que cambian una interrupción o el hardware fuera del flujo normal', 'Todas las globales', 'Las constantes', 'Las locales de main'], 'Así cada acceso se hace de verdad.') });
  alt('st_bsrr', { title: 'Toca BSRR', text: 'Elige qué bit de BSRR pones a 1 y mira el efecto sobre ODR. Los bits bajos encienden, los altos apagan, y los ceros no hacen nada.', tune: { viz: 'st_bsrr', params: P_BSRR(3) }, q: mcq('¿Qué bit de BSRR pone PC13 a 0?', ['29', '13', '26', '3'], '13 + 16 = 29.') });
  alt('st_boot0', { title: 'Solo importa el instante del reset', text: 'Mueve BOOT0 antes y después de soltar NRST. Solo cuenta lo que vale en ese instante.', tune: { viz: 'st_boot0', params: P_B0(0, 1) }, q: mcq('Pones BOOT0 a 1 con el programa ya funcionando, sin resetear. ¿Qué pasa?', ['Nada: BOOT0 solo se lee en el reset', 'Salta al cargador', 'Se borra la Flash', 'Se reinicia'], 'Hasta el próximo reset no cuenta.') });
  alt('st_cubemx', { title: 'Regenera y mira', text: 'Coloca tu línea dentro o fuera de la zona USER CODE y regenera. Lo de fuera desaparece sin avisar.', tune: { viz: 'st_regen', params: P_REGEN(0, 0) }, q: mcq('¿Dónde deja CubeMX las macros LED_Pin y LED_GPIO_Port?', ['En main.h', 'En main.c', 'En stm32f4xx_it.c', 'En el .ld'], 'Salen de la etiqueta que pones al pin en el .ioc.') });
  alt('st_swd', { title: 'Cablea y prueba', text: 'Conecta la masa y elige longitud de cable y frecuencia. Con cables largos, baja la velocidad.', tune: { viz: 'st_swd', params: P_SWD(0, 30, 4) }, q: mcq('¿Qué tres señales son imprescindibles para depurar por SWD?', ['SWDIO, SWCLK y GND', 'SWDIO, SWO y 5 V', 'TX, RX y GND', 'NRST, BOOT0 y GND'], 'NRST y SWO son opcionales.') });
  alt('st_swdrec', { title: 'Llegar antes que tu código', text: 'Con NRST sujeto a 0, el ST-LINK conecta y para el núcleo en el mismo instante en que se suelta: tu programa no llega a ejecutar ni una instrucción.', svg: SVG_SWDREC, q: mcq('¿Qué cable hace falta para «Connect under reset»?', ['NRST', 'SWO', 'BOOT1', 'VBAT'], 'El ST-LINK necesita manejar el reset.') });
  alt('st_dbglp', { title: 'Síntoma y remedio', text: 'Dos síntomas raros, un mismo bloque que los arregla: DBGMCU.', svg: SVG_DBGLP, q: mcq('¿Qué bloque mantiene vivo el depurador mientras el chip está en Stop?', ['DBGMCU', 'RCC', 'NVIC', 'EXTI'], 'Solo para desarrollo.') });
  alt('st_debug', { title: 'La caja de herramientas', text: 'Cada herramienta responde a una pregunta distinta. Elige por la pregunta, no por costumbre.', svg: SVG_DBG, q: mcq('Quieres saltarte una función que sabes que funciona. ¿Qué pulsas?', ['Step Over', 'Step Into', 'Step Return', 'Un watchpoint'], 'Ejecuta la llamada entera y para en la línea siguiente.') });
  alt('st_hardfault', { title: 'La pila que invade', text: 'La pila crece hacia abajo desde el final de la RAM. Si se pasa, pisa las variables globales: el fallo aparece lejos de la causa.', svg: SVG_STACK, q: mcq('¿Qué registro apilado te dice dónde ocurrió un HardFault?', ['El PC', 'R0', 'El MSP inicial', 'xPSR'], 'El contador de programa guardado al entrar.') });
  alt('st_cycles', { title: 'El cronómetro', text: 'Elige reloj y cuentas: el tiempo es ciclos entre frecuencia. Mira que a más MHz, cada ciclo dura menos.', tune: { viz: 'st_cyc', params: P_CYC(84, 84) }, q: mcq('A 168 MHz, ¿cuánto dura un ciclo, aproximadamente?', ['6 ns', '168 ns', '1,68 µs', '60 ns'], '1 / 168 MHz ≈ 5,95 ns.') });
  alt('st_printf', { title: 'El camino de un carácter', text: 'printf no sabe nada de tu placa: formatea el texto y acaba llamando, carácter a carácter, a la función que tú escribes. Ahí decides si sale por la UART o por SWO.', svg: SVG_PRINTF, q: mcq('¿Qué función escribes tú para que printf salga por la UART?', ['__io_putchar', 'printf', 'HAL_UART_Init', 'main'], 'La llama _write por cada carácter.') });
  alt('st_uarttime', { title: 'Mide el mensaje', text: 'Cambia el número de caracteres y los baudios. Cada carácter son 10 bits, y mientras se envía con HAL_UART_Transmit la CPU espera.', tune: { viz: 'st_uarttx', params: P_UTX(100, 9600) }, q: mcq('100 caracteres a 9600 baudios (8N1). ¿Cuánto tarda?', ['≈ 104 ms', '≈ 83 ms', '≈ 10 ms', '≈ 1 s'], '1000 bits / 9600.') });
  alt('st_isrrules', { title: 'Mira quién espera a quién', text: 'Pon USART2 más urgente que TIM2 y fíjate: mientras se atiende una interrupción, las de igual o menor urgencia esperan. Con el SysTick pasa igual: si tu interrupción es más urgente, el SysTick no avanza y HAL_Delay se queda esperando para siempre.', tune: { viz: 'st_nvic', params: { pA: sl('Prioridad TIM2', 5, 0, 15), pB: sl('Prioridad USART2', 8, 0, 15) } }, q: mcq('¿Qué es lo correcto dentro de una interrupción?', ['Guardar el dato, marcar una bandera y salir', 'Imprimir con printf', 'Esperar con HAL_Delay', 'Hacer el cálculo largo'], 'Lo lento, fuera.') });
  alt('st_brr', { title: 'Juega con el divisor', text: 'Elige reloj del bus y velocidad. Cuanto más pequeño sale BRR, más pesa el redondeo. Mira cómo se desplazan los instantes de lectura.', tune: { viz: 'st_baud', params: P_BAUD(84, 115200) }, q: mcq('PCLK = 42 MHz y 115 200 baudios. ¿BRR?', ['365', '42', '1152', '23'], '42 000 000 / 115 200 ≈ 364,6 → 365.') });
  alt('st_toolchain', { title: 'Del .c al .bin', text: 'Cada caja es una herramienta o un archivo. El .elf lleva símbolos para depurar; el .bin son solo bytes.', svg: SVG_TOOL, q: mcq('¿Qué archivo usas para depurar con símbolos?', ['El .elf', 'El .bin', 'El .hex', 'El .o de main'], 'El .bin no tiene símbolos.') });
  alt('st_hal', { title: 'La escalera de capas', text: 'Cuanto más abajo, más control y menos portabilidad. Puedes mezclar: HAL en lo general y LL o registros en lo crítico.', svg: SVG_LAYERS, q: mcq('¿Qué capa elegirías para un prototipo de fin de semana con un sensor que ya tiene biblioteca de Arduino?', ['STM32duino (Arduino)', 'Registros', 'LL', 'Ensamblador'], 'Rapidez antes que control.') });
  alt('st_sections', { title: 'Mira crecer las barras', text: 'Cambia .text, .data y .bss y mira qué barra crece. .data es la única que aparece en las dos.', tune: { viz: 'st_sec', params: P_SEC(64, 0, 4) }, q: mcq('¿Qué sección ocupa solo RAM?', ['.bss', '.data', '.text', '.rodata'], 'Variables a cero: no hay valores que guardar en Flash.') });
  alt('st_reg', { title: 'Opera sobre un registro real', text: 'Este es el MODER de GPIOA de una F407 tras el reset: sus bits altos mantienen el depurador. Elige operación y bit y mira qué cambia. Con = verás bits rojos: los que has roto.', tune: { viz: 'st_reg32', params: P_R32(3, 5) }, q: mcq('¿Qué operación invierte un bit sin tocar los demás?', ['reg ^= (1U << n)', 'reg |= (1U << n)', 'reg &= ~(1U << n)', 'reg = (1U << n)'], 'XOR con un 1 invierte; con un 0 deja igual.') });
  alt('st_rccen', { title: 'Un grifo por periférico', text: 'Cada bus tiene su registro de habilitación en RCC. Tras el reset todos los grifos están cerrados.', svg: SVG_RCC, q: mcq('¿En qué registro abres el reloj de USART2 en una F4?', ['RCC->APB1ENR', 'RCC->AHB1ENR', 'RCC->APB2ENR', 'USART2->CR1'], 'USART2 cuelga de APB1.') });
  alt('st_docs', { title: 'Cada pregunta, su libro', text: 'No hace falta leerlo todo: basta con saber en cuál buscar.', svg: SVG_DOCS, q: mcq('¿Dónde buscas qué hace el bit UE de USART_CR1?', ['En el manual de referencia', 'En la hoja de datos', 'En la hoja de erratas', 'En el manual de programación'], 'Los registros, bit a bit, están en el manual de referencia.') });
  alt('st_halstatus', { title: 'Cuatro respuestas posibles', text: 'Casi todas las funciones HAL devuelven uno de estos cuatro valores. Compruébalo siempre.', svg: SVG_HALST, q: mcq('HAL_UART_Receive devuelve HAL_TIMEOUT. ¿Qué ha pasado?', ['No llegaron todos los datos antes del tiempo límite', 'Todo bien', 'La UART está ocupada', 'Un parámetro es inválido'], 'Se agotó la espera.') });
  alt('st_halcb', { title: 'Sondeo, _IT y _DMA', text: 'Elige el modo y mira cuánta CPU queda libre mientras se envían los datos. En _IT y _DMA, la función vuelve enseguida y la HAL te avisa con un callback.', tune: { viz: 'st_halmode', params: P_HALM(0, 100) }, q: mcq('Con HAL_UART_Transmit_DMA, ¿cuándo puedes reutilizar el búfer?', ['Cuando llega HAL_UART_TxCpltCallback', 'Nada más volver la función', 'Nunca', 'Tras un HAL_Delay(1)'], 'Hasta el callback, el DMA lo sigue leyendo.') });
  alt('st_boot', { title: 'Avanza paso a paso', text: 'Mueve el deslizador desde el reset hasta main y mira qué cambia en los registros y en la RAM.', tune: { viz: 'st_boot', params: P_BOOT(0) }, q: mcq('¿Qué hace el arranque justo antes de llamar a main?', ['Poner .bss a cero (tras copiar .data)', 'Configurar el PLL', 'Leer el MSP', 'Encender la FPU'], 'El PLL se configura ya dentro de main.') });
  alt('st_hsi', { title: 'La frecuencia en el tiempo', text: 'El chip arranca con el HSI, sube al PLL cuando lo configuras y, si entra en Stop, vuelve a despertar con el HSI.', svg: SVG_HSI, q: mcq('Tras despertar de Stop, ¿qué función vuelves a llamar?', ['SystemClock_Config()', 'HAL_Init()', 'main()', 'SystemInit()'], 'Para volver al PLL.') });
  alt('st_irqsetup', { title: 'Las cuatro piezas', text: 'Activa una a una las cuatro piezas y mira lo que pasa con cada combinación. Cada fallo tiene su síntoma.', tune: { viz: 'st_irqcfg', params: P_IRQ(0, 0, 0, 0) }, q: mcq('El programa se queda en Default_Handler al llegar la interrupción. ¿Qué pieza falla?', ['El nombre del manejador', 'La activación en el NVIC', 'La bandera', 'El reloj del periférico'], 'Un nombre que no coincide deja el manejador por defecto.') });
  alt('st_linker', { title: 'Reserva y comprueba', text: 'Reserva el final de la Flash para datos y sube el tamaño del programa: el enlazador te avisará cuando no quepa.', tune: { viz: 'st_sec', params: P_SEC(256, 200, 16, 0) }, q: mcq('Reservas 128 KB de 512 KB. ¿Qué LENGTH queda para FLASH?', ['384K', '512K', '128K', '256K'], '512 − 128.') });
  alt('st_dmamem', { title: 'Quién está conectado a quién', text: 'La CCM es una memoria pegada al núcleo. El DMA no tiene camino hasta ella.', svg: SVG_CCM, q: mcq('¿Dónde pones un búfer que llenará el DMA en una F407?', ['En la SRAM normal', 'En la CCM', 'En la Flash', 'En la pila de una ISR'], 'La CCM no está en el camino del DMA.') });
  alt('st_clksrc', { title: 'Compara las cuatro fuentes', text: 'Elige una fuente y mira cuánto se desviaría al día si la usaras para dar la hora. Las rápidas (HSI, HSE) son para la CPU; las lentas (LSI, LSE), para watchdog y RTC.', tune: { viz: 'st_osc', params: P_OSC(0, 1) }, q: mcq('¿Qué fuente usa el IWDG?', ['LSI', 'LSE', 'HSE', 'PLL'], 'Por eso sigue funcionando aunque falle el cristal principal.') });
  alt('st_32k', { title: 'Dividir hasta el segundo', text: 'Quince divisiones entre 2 convierten 32 768 Hz en 1 Hz exacto.', svg: SVG_32K, q: mcq('¿Cuántas cuentas da un contador alimentado a 32 768 Hz en 1 s?', ['32 768', '32 000', '1000', '15'], 'Una por ciclo.') });
  alt('st_usbclk', { title: 'Un VCO múltiplo de 48', text: 'El mismo VCO alimenta la CPU (÷P) y el USB (÷Q). Si el VCO no es múltiplo de 48 MHz, no hay Q que valga.', svg: SVG_USBCLK, q: mcq('VCO = 288 MHz. ¿Qué Q da 48 MHz?', ['6', '4', '8', 'No hay ninguna'], '288 / 48 = 6.') });
  alt('st_apb', { title: 'Mira los relojes de los temporizadores', text: 'Cambia el divisor de APB1 entre 1 y 2 y mira la línea de abajo: cuando el divisor no es 1, los temporizadores reciben el doble de PCLK.', tune: { viz: 'st_clock', params: P_CLK(25, 25, 200, 2, 1, 1) }, q: mcq('PCLK1 = 42 MHz con APB1 ÷2. ¿Reloj de TIM3?', ['84 MHz', '42 MHz', '21 MHz', '168 MHz'], 'Divisor distinto de 1: el doble.') });
  alt('st_waitst', { title: 'Encuentra los wait states justos', text: 'Sube SYSCLK y mira cuántos wait states pide la Flash de la F411. Con menos, la CPU lee instrucciones a medias.', tune: { viz: 'st_ws', params: P_WS(16, 0) }, q: mcq('F411 a 3,3 V y 84 MHz. ¿Cuántos wait states?', ['2', '0', '1', '3'], 'Entre 64 y 90 MHz piden 2.') });
  alt('st_gpio', { title: 'El campo de modo de cada pin', text: 'Elige pin y modo y mira qué dos bits cambian en MODER. 00 entrada, 01 salida, 10 función alternativa, 11 analógico.', tune: { viz: 'st_reg', params: { pin: sl('Pin', 2, 0, 15), mode: li('Modo (0 ent · 1 sal · 2 AF · 3 anal)', 2, [0, 1, 2, 3]) } }, q: mcq('PA0 va a leer una tensión con el ADC. ¿Qué modo?', ['Analógico (11)', 'Entrada (00)', 'Salida (01)', 'Función alternativa (10)'], 'El modo analógico desconecta la parte digital.') });
  alt('st_od', { title: 'Comparte la línea sin cortos', text: 'Pon tu pin en push-pull a 1 mientras la otra placa tira a 0: cortocircuito. Pásalo a open-drain con pull-up y vuelve a probar.', tune: { viz: 'st_pin', params: P_PIN(1, 0, 0, 1, 0) }, q: mcq('Una salida open-drain escribe 1 y nadie más tira a 0. ¿Qué nivel tiene la línea?', ['El que ponga la pull-up (3,3 V si la hay)', '0 V siempre', '3,3 V aunque no haya pull-up', 'Cortocircuito'], 'Open-drain solo suelta; el 1 lo pone la resistencia.') });
  alt('st_leak', { title: 'La lista de sospechosos', text: 'Antes de culpar al chip, mira la placa: estas cuatro cosas gastan aunque el STM32 duerma.', svg: SVG_LEAK, q: mcq('Una pull-up de 10 kΩ a 3,3 V con el pin a 0 V todo el rato. ¿Cuánto gasta?', ['0,33 mA', '33 µA', '3,3 mA', 'Nada'], '3,3 V / 10 kΩ = 0,33 mA: muchísimo para un nodo a pilas.') });
  alt('st_af', { title: 'Elige pin y función', text: 'Mueve el pin y mira cómo salta de AFR[0] a AFR[1] al pasar del 7 al 8, y dónde cae su campo de 4 bits.', tune: { viz: 'st_afr', params: P_AFR(0, 0) }, q: mcq('¿En qué registro va la función alternativa de PB12?', ['AFR[1]', 'AFR[0]', 'MODER', 'AFR[2]'], 'Pines 8–15 en AFR[1].') });
  alt('st_irq', { title: 'La mochila del hardware', text: 'Estos ocho registros los guarda el núcleo solo al entrar. El resto, si los usa, los guarda el compilador como en cualquier función.', svg: SVG_IRQSTACK, q: mcq('¿Cuántos registros apila el hardware al entrar en una excepción (sin FPU)?', ['8', '16', '4', '32'], 'R0–R3, R12, LR, PC y xPSR.') });
  alt('st_shared', { title: 'Pierde un incremento', text: 'Haz que la interrupción llegue entre la lectura y la escritura de main y mira el resultado. Luego activa la sección crítica.', tune: { viz: 'st_race', params: P_RACE(0, 0) }, q: mcq('¿Por qué contador++ no es atómico?', ['Son tres pasos: leer, sumar y escribir', 'Porque es de 32 bits', 'Porque no es volatile', 'Sí lo es'], 'Una interrupción puede colarse entre ellos.') });
  alt('st_exti', { title: 'Reparte los números', text: 'Pon los dos botones en el mismo número de pin y mira el choque. Cambia uno y comprueba qué manejador atiende a cada uno.', tune: { viz: 'st_exti', params: P_EXTI(0, 0) }, q: mcq('Botones en PA6 y PB8. ¿Qué manejador atiende a los dos?', ['EXTI9_5_IRQHandler', 'EXTI6_IRQHandler', 'EXTI15_10_IRQHandler', 'Cada uno el suyo'], 'Las líneas 5–9 comparten manejador.') });
  alt('st_debounce', { title: 'La forma de un rebote', text: 'Una pulsación real produce varios flancos en pocos milisegundos. Con EXTI, cada flanco es una interrupción.', svg: SVG_BOUNCE, q: mcq('¿Cuánto suele durar el rebote de un pulsador?', ['Unos pocos milisegundos', 'Nanosegundos', 'Varios segundos', 'No rebota nunca'], 'Por eso se ignoran unos 20 ms.') });
  alt('st_power', { title: 'Tres escalones', text: 'Cuanto más profundo duermes, menos gastas y más cosas pierdes.', svg: SVG_POWER, q: mcq('Quieres dormir conservando la RAM y despertar con un pulsador. ¿Qué modo?', ['Stop', 'Standby', 'Sleep sin suspender el SysTick', 'Apagar la alimentación'], 'Stop conserva RAM y despierta por EXTI.') });
  alt('st_systick', { title: 'Calcula LOAD', text: 'Elige frecuencia y cuántas interrupciones por segundo quieres. Mira si LOAD cabe en los 24 bits.', tune: { viz: 'st_tick', params: P_TICK(16, 1) }, q: mcq('SysTick a 48 MHz, interrupción cada 1 ms. ¿LOAD?', ['47 999', '48 000', '4799', '479 999'], '48 000 ciclos − 1.') });
  alt('st_tick', { title: 'El tick tiene grano', text: 'Cambia el momento de la llamada dentro del tick: osDelay(1) puede durar casi nada y HAL_Delay(1) casi 2 ms.', tune: { viz: 'st_tickres', params: P_TRES(0.5, 1, 0) }, q: mcq('¿Qué garantiza HAL_Delay(5)?', ['Que espera al menos 5 ms', 'Que espera exactamente 5 ms', 'Que espera como mucho 5 ms', 'Nada'], 'Añade un tick para garantizar el mínimo.') });
  alt('st_capture', { title: 'Cuenta los flancos', text: 'Cambia el modo ×1, ×2 o ×4 y la reductora y mira cuántas cuentas da una vuelta del eje de salida.', tune: { viz: 'st_enc', params: P_ENC(12, 1, 1) }, q: mcq('Encoder de 16 pulsos por vuelta en modo ×4, sin reductora. ¿Cuentas por vuelta?', ['64', '16', '32', '4'], '16 × 4.') });
  alt('st_deadtime', { title: 'Evita el corto', text: 'Ajusta el tiempo muerto según lo que tarda en apagarse el transistor. La zona roja es un cortocircuito de la alimentación.', tune: { viz: 'st_dead', params: P_DEAD(0, 200) }, q: mcq('El transistor tarda 300 ns en apagarse y el tiempo muerto es de 200 ns. ¿Qué pasa?', ['Shoot-through durante unos 100 ns en cada conmutación', 'Nada', 'El motor gira más rápido', 'Se pierde el PWM'], 'Hace falta un tiempo muerto mayor que el apagado.') });
  alt('st_advtim', { title: 'El interruptor general', text: 'MOE es un interruptor entre el temporizador y los pines. El freno lo abre por hardware.', svg: SVG_ADVTIM, q: mcq('Tras saltar el freno, ¿qué tiene que hacer el programa para volver a sacar PWM?', ['Poner MOE otra vez cuando sea seguro', 'Nada: vuelve solo siempre', 'Resetear el chip', 'Cambiar ARR'], 'El freno borra MOE.') });
  alt('st_dmacfg', { title: 'La configuración de un vistazo', text: 'Un ADC que llena un búfer: el lado del periférico no se mueve; el de la memoria avanza una posición por dato.', svg: SVG_DMACFG, q: mcq('UART que envía un texto desde la RAM por DMA. ¿Qué dirección?', ['Memoria → periférico', 'Periférico → memoria', 'Memoria → memoria', 'Periférico → periférico'], 'Los datos salen de la RAM hacia el registro de la UART.') });
  alt('st_adcscan', { title: 'Encuentra la casilla', text: 'Elige número de canales, muestra y canal: la casilla resaltada es buf[n·k + i].', tune: { viz: 'st_scan', params: P_SCAN(3, 0, 0) }, q: mcq('3 canales. ¿Qué índice tiene la muestra 5 del primer canal (índice 0)?', ['15', '5', '8', '3'], '3 × 5 + 0.') });
  alt('st_adcacc', { title: 'Una regla que encoge', text: 'Si VDDA baja, la misma tensión da más cuentas. VREFINT, que no cambia, te dice cuánto ha encogido la regla.', svg: SVG_ADCACC, q: mcq('VREFINT_CAL = 1500 (a 3,3 V) y hoy lees 1500. ¿VDDA?', ['3,3 V', '3,0 V', '1,5 V', 'No se puede saber'], 'Mismas cuentas, misma referencia.') });
  alt('st_wavegen', { title: 'Tabla y ritmo', text: 'Cambia el número de muestras y el ritmo del temporizador: la frecuencia de salida es el cociente.', tune: { viz: 'st_dac', params: P_DAC(100, 100, 1) }, q: mcq('Disparo a 200 kHz y tabla de 40 muestras. ¿Frecuencia de salida?', ['5 kHz', '8 MHz', '200 kHz', '40 kHz'], '200 / 40.') });
  alt('st_dac', { title: 'Centra la onda', text: 'Quita el desplazamiento de 2048 y mira cómo se recorta la mitad negativa: el DAC no da tensiones negativas.', tune: { viz: 'st_dac', params: P_DAC(50, 500, 0) }, q: mcq('¿Qué código del DAC de 12 bits da la mitad de VREF+?', ['2048', '4095', '1024', '0'], 'Mitad de escala.') });
  alt('st_uartrx', { title: 'El silencio marca el final', text: 'La línea en reposo está a 1. Cuando pasa un carácter entero sin nada nuevo, salta IDLE: el mensaje ha terminado.', svg: SVG_IDLE, q: mcq('¿Qué detecta la bandera IDLE?', ['Que la línea lleva un carácter de tiempo sin actividad', 'Un error de paridad', 'Que el búfer está lleno', 'Un byte nuevo'], 'Ideal para mensajes de longitud variable.') });
  alt('st_rs485', { title: 'El momento de bajar DE', text: 'DE debe seguir alto hasta que salga el último bit (TC). TXE llega antes: solo dice que el registro está libre.', svg: SVG_DE, q: mcq('¿Qué bandera de la USART indica que ha salido el último bit?', ['TC', 'TXE', 'RXNE', 'IDLE'], 'Transmission Complete.') });
  alt('st_i2c', { title: 'Los 8 bits del byte de dirección', text: 'La dirección ocupa los 7 bits altos; el último es lectura o escritura. Por eso la HAL quiere la dirección ya desplazada.', svg: SVG_I2CADDR, q: mcq('Un sensor en 0x3C. ¿Qué valor pasas a la HAL?', ['0x78', '0x3C', '0x1E', '0x3D'], '0x3C << 1 = 0x78.') });
  alt('st_spi', { title: 'Ajusta CPOL y CPHA', text: 'CPOL dice si el reloj reposa en 0 o en 1; CPHA, en qué flanco se lee. Haz coincidir tus marcas con las del chip.', tune: { viz: 'st_spi', params: P_SPI(3, 0, 0) }, q: mcq('Modo SPI 2. ¿CPOL y CPHA?', ['CPOL 1, CPHA 0', 'CPOL 0, CPHA 1', 'CPOL 1, CPHA 1', 'CPOL 0, CPHA 0'], 'Modo = 2·CPOL + CPHA.') });
  alt('st_bus', { title: 'La tabla de los cuatro', text: 'Un rasgo distintivo de cada bus basta para elegir.', svg: SVG_BUS, q: mcq('¿Qué bus necesita una línea de selección por cada esclavo?', ['SPI', 'I²C', 'UART', 'CAN'], 'El chip select.') });
  alt('st_can', { title: 'Haz que compitan dos nodos', text: 'Elige dos identificadores y mira bit a bit: el 0 manda en el bus y quien envió un 1 se retira.', tune: { viz: 'st_arb', params: P_ARB(0, 1) }, q: mcq('En CAN, ¿qué nivel es dominante?', ['El 0', 'El 1', 'Ninguno', 'Depende de la velocidad'], 'Por eso gana el identificador más bajo.') });
  alt('st_canbit', { title: 'Reparte los cuantos', text: 'Mueve BRP, BS1 y BS2 y mira la velocidad y el punto de muestreo. El primer cuanto, de sincronismo, siempre está.', tune: { viz: 'st_canbit', params: P_CANB(1, 1, 1) }, q: mcq('BS1 = 6 y BS2 = 1. ¿Punto de muestreo?', ['87,5 %', '85,7 %', '75 %', '100 %'], '(1 + 6) / 8.') });
  alt('st_usbcdc', { title: 'Un puerto serie de mentira', text: 'Los datos viajan por USB a 12 Mbit/s; el PC lo presenta como un puerto serie.', svg: SVG_CDC, q: mcq('Cambias en el PC de 9600 a 115 200 baudios con un CDC. ¿Qué cambia en la transferencia?', ['Nada: viaja a la velocidad del USB', 'Va 12 veces más rápido', 'Deja de funcionar', 'Se corrompen los datos'], 'El número llega al STM32, pero no limita nada.') });
  alt('st_rtos', { title: 'Juega con el planificador', text: 'Tres tareas, 20 ms. Cambia prioridades y el tipo de espera: con HAL_Delay, la tarea que espera sigue gastando CPU (rojo) y las de menos prioridad no corren.', tune: { viz: 'st_rtos', params: P_RTOS(3, 2, 0) }, q: mcq('¿Qué tarea ejecuta el planificador de FreeRTOS?', ['La lista de mayor prioridad', 'La que se creó primero', 'La que lleva más tiempo esperando', 'Todas a la vez'], 'Con empate, se turnan.') });
  alt('st_stack', { title: 'Llena la pila', text: 'Añade un array local y printf y mira cuándo se desborda la pila de la tarea.', tune: { viz: 'st_stk', params: P_STK(128, 0, 0) }, q: mcq('Una tarea con 256 palabras de pila. ¿Cuántos bytes son?', ['1024', '256', '512', '2048'], '× 4.') });
  alt('st_task', { title: 'Compara las dos esperas', text: 'Pon algo de trabajo y alterna entre osDelay y osDelayUntil: mira el periodo real y el retraso que se acumula.', tune: { viz: 'st_drift', params: P_DRIFT(2, 0) }, q: mcq('Trabajo de 4 ms y osDelayUntil con periodo de 10 ms. ¿Periodo real?', ['10 ms', '14 ms', '6 ms', '4 ms'], 'osDelayUntil espera hasta la siguiente marca.') });
  alt('st_rtosisr', { title: 'La línea del 5', text: 'Las prioridades NVIC más urgentes que el límite no pueden llamar al RTOS. Las demás sí, con las funciones FromISR.', svg: SVG_RTOSPRIO, q: mcq('Una ISR con prioridad 7 (límite 5). ¿Puede usar xQueueSendFromISR?', ['Sí', 'No', 'Solo con mutex', 'Solo si es 0'], '7 es menos urgente que 5: está en la zona permitida.') });
  alt('st_queue', { title: 'Llena la cola', text: 'Haz el productor más rápido que el consumidor y decide qué pasa cuando la cola se llena: descartar o esperar.', tune: { viz: 'st_queue', params: P_QUEUE(50, 100, 8, 0) }, q: mcq('El productor es una ISR y la cola está llena. ¿Qué pasa con el mensaje?', ['Se descarta: una ISR no puede esperar', 'La ISR espera', 'Se sobrescribe el más viejo siempre', 'Se reinicia el chip'], 'Desde una ISR, tiempo de espera 0.') });
  alt('st_mutex', { title: 'Provoca la inversión', text: 'Activa la tarea media sin herencia: mira cuánto espera la alta. Luego activa la herencia.', tune: { viz: 'st_inv', params: P_INV(0, 0, 2) }, q: mcq('¿Qué hace la herencia de prioridad?', ['Sube temporalmente la prioridad de quien tiene el mutex', 'Baja la prioridad de la tarea alta', 'Quita el mutex', 'Duplica la pila'], 'Así la media no puede expulsarla.') });
  alt('st_swtimer', { title: 'Una sola tarea para todos', text: 'Todos los callbacks de temporizadores software corren uno tras otro en la misma tarea. Si uno se bloquea, los demás esperan.', svg: SVG_SWT, q: mcq('¿Dónde se ejecuta el callback de un osTimer?', ['En la tarea del servicio de temporizadores', 'En una interrupción hardware', 'En la tarea Idle', 'En main'], 'Por eso no debe bloquear.') });
  alt('st_avgcur', { title: 'Mueve el ciclo de trabajo', text: 'Cambia cuánto tiempo pasa despierto y cuánto gasta dormido. Mira qué pesa más en la media.', tune: { viz: 'st_avg', params: P_AVG(20, 100, 1, 500) }, q: mcq('5 mA durante 10 ms cada 10 s y 5 µA dormido. ¿Media aproximada?', ['≈ 10 µA', '≈ 5 mA', '≈ 50 µA', '≈ 1 µA'], '(5000 × 0,01 + 5 × 9,99) / 10.') });
  alt('st_wdg', { title: 'La ventana', text: 'El WWDG castiga refrescar tarde y también demasiado pronto. El IWDG solo castiga llegar tarde.', svg: SVG_WDG, q: mcq('¿Qué watchdog sigue funcionando aunque falle el cristal principal?', ['IWDG', 'WWDG', 'Los dos', 'Ninguno'], 'Usa su propio LSI.') });
  alt('st_iwdgcalc', { title: 'Ajusta el tiempo', text: 'Elige preescalador y RLR y mira el tiempo. Comprueba también el peor caso, con el LSI a 47 kHz.', tune: { viz: 'st_iwdg', params: P_IWDG(4, 99, 500) }, q: mcq('IWDG ÷128 y RLR = 249 con LSI de 32 kHz. ¿Tiempo?', ['1 s', '0,5 s', '2 s', '128 ms'], '128 × 250 / 32 000.') });
  alt('st_blproto', { title: 'La conversación', text: 'Cada comando va con su complemento y cada paso espera un ACK.', svg: SVG_BLPROTO, q: mcq('El cargador responde 0x1F. ¿Qué significa?', ['NACK: comando rechazado', 'ACK', 'Velocidad detectada', 'Fin de la escritura'], '0x79 es ACK; 0x1F, NACK.') });
  alt('st_flash', { title: 'Escribe encima', text: 'Elige lo que hay y lo que escribes. Sin borrar, el resultado es el AND de los dos: los bits solo pueden bajar.', tune: { viz: 'st_flash', params: P_FLASH(0, 0, 0) }, q: mcq('Hay 0xFF y programas 0xA5 sin borrar. ¿Qué queda?', ['0xA5', '0xFF', '0x00', '0x5A'], '0xFF AND 0xA5.') });
  alt('st_rdp', { title: 'Tres niveles', text: 'De abajo arriba, cada nivel protege más y es más difícil volver atrás. El 2 no tiene vuelta.', svg: SVG_RDP, q: mcq('Tu prototipo está en RDP nivel 1 y necesitas reprogramarlo. ¿Qué haces?', ['Bajar a nivel 0 (se borra la Flash) y volver a grabar', 'Nada, no se puede nunca', 'Subir a nivel 2', 'Leer la Flash con el depurador'], 'Volver a 0 borra todo, pero el chip sigue vivo.') });
  alt('st_board', { title: 'Pata a pata', text: 'Seis puntos que no pueden faltar en el esquema de un STM32.', svg: SVG_MINBOARD, q: mcq('¿Qué pata necesita un filtro para que el ADC mida bien?', ['VDDA', 'BOOT0', 'NRST', 'PA13'], 'El ADC mide respecto a VDDA.') });
  alt('st_crystal', { title: 'Ajusta la carga', text: 'Elige el condensador para que la carga que ve el cristal coincida con su CL. Recuerda los parásitos.', tune: { viz: 'st_xtal', params: P_XTAL(10, 3, 22) }, q: mcq('CL = 18 pF y 4 pF parásitos. ¿Condensador a cada lado?', ['28 pF', '18 pF', '36 pF', '14 pF'], '2 × (18 − 4).') });
  alt('st_bringup', { title: 'Un escalón cada vez', text: 'Cada paso comprueba una sola cosa. Si uno falla, no sigues.', svg: SVG_BRINGUP, q: mcq('El ST-LINK no lee el ID de tu placa nueva. ¿Qué compruebas antes?', ['Que hay 3,3 V y no hay cortos', 'Que el USB enumera', 'El reloj por MCO', 'El ADC'], 'Primero alimentación; luego depuración.') });
  alt('st_profw', { title: 'Capas que se pueden probar', text: 'Cada capa solo habla con la de debajo. Así la lógica de arriba se prueba en el PC sustituyendo los drivers.', svg: SVG_FWLAYERS, q: mcq('¿Qué capa conviene probar en el PC?', ['Servicios y aplicación: filtros, protocolos, estados', 'Los drivers del ADC', 'El arranque', 'El script del enlazador'], 'Lo que no depende del hardware.') });
  alt('st_field', { title: 'Del campo al número', text: 'Con el pin y el modo que elijas, mira el valor del campo ya desplazado: modo << (2·pin).', tune: { viz: 'st_reg', params: { pin: sl('Pin', 0, 0, 15), mode: li('Modo (0 ent · 1 sal · 2 AF · 3 anal)', 3, [0, 1, 2, 3]) } }, q: mcq('PB4 en salida (01). ¿Valor del campo ya desplazado?', ['0x100', '0x10', '0x8', '0x200'], '1 << 8.') });
  alt('st_clock', { title: 'Etapa a etapa', text: 'Ajusta un divisor cada vez y mira qué caja se pone roja: cada etapa tiene su límite.', tune: { viz: 'st_clock', params: P_CLK(8, 4, 168, 2, 2, 1) }, q: mcq('HSE 8 MHz y M = 4. ¿Entrada del VCO?', ['2 MHz', '32 MHz', '4 MHz', '0,5 MHz'], '8 / 4.') });
  alt('st_nvic', { title: 'Números y urgencia', text: 'En el NVIC, un número menor es más urgente. Solo una prioridad de expropiación menor interrumpe a otra.', svg: SV(110, tx(8, 16, 'Prioridad NVIC', 'vizsm') + Array.from({ length: 16 }, (_, i) => `<rect x="${8 + i * 18}" y="24" width="16" height="24" rx="3" fill="var(--err)" fill-opacity="${(1 - i / 16).toFixed(2)}"/>` + tm(16 + i * 18, 40, i, 'vizsm', 'fill:currentColor')).join('') + tx(8, 70, '0: la más urgente', 'vizlab') + `<text x="292" y="70" text-anchor="end" class="vizlab">15: la menos</text>` + tx(8, 96, 'Al revés que en FreeRTOS, donde mayor es más importante')), q: mcq('Prioridades 3 y 9. ¿Cuál puede interrumpir a la otra?', ['La de 3', 'La de 9', 'Ninguna', 'Las dos'], 'Número menor, más urgente.') });
  alt('st_timer', { title: 'Divide dos veces', text: 'Primero el preescalador da el tick; luego ARR + 1 ticks forman un periodo.', svg: chain(['fTIM|84 MHz', '÷ (PSC + 1)|PSC = 83', 'tick 1 µs', '× (ARR + 1)|ARR = 999', 'periodo|1 ms → 1 kHz']), q: mcq('Ticks de 1 µs y ARR = 4999. ¿Frecuencia?', ['200 Hz', '5 kHz', '2 kHz', '20 Hz'], '5000 µs de periodo.') });
  alt('st_duty', { title: 'El comparador en números', text: 'Con ARR = 99 hay 100 pasos: CCR es directamente el porcentaje.', svg: table([['ARR = 99', '100 pasos por periodo'], ['CCR = 25', 'Alta 25 pasos: 25 %'], ['CCR = 0', 'Siempre baja: 0 %'], ['CCR ≥ 100', 'Siempre alta: 100 %']], 'PWM modo 1: alta mientras CNT < CCR'), q: mcq('ARR = 99 y CCR = 60. ¿Ciclo de trabajo?', ['60 %', '61 %', '59 %', '6 %'], '60 / 100.') });
  alt('st_dma', { title: 'Las dos mitades', text: 'Mientras el DMA llena una mitad, la CPU procesa la otra. HT y TC te dicen cuándo cambiar.', svg: chain(['DMA llena|mitad A', 'HT: procesa A', 'DMA llena|mitad B', 'TC: procesa B']), q: mcq('¿Cuándo procesas la segunda mitad del búfer circular?', ['Tras la interrupción TC', 'Tras la interrupción HT', 'En cualquier momento', 'Nunca'], 'TC: el DMA acaba de completarla y vuelve al principio.') });
  alt('st_adc', { title: 'Cuentas del tiempo de conversión', text: 'tconv = (ciclos de muestreo + 12) / fADC. Con el reloj y los ciclos lo tienes.', svg: chain(['PCLK2 84 MHz', '÷4 → fADC|21 MHz', '15 + 12 ciclos', '27 / 21 MHz|≈ 1,29 µs']), q: mcq('fADC = 21 MHz y 3 ciclos de muestreo (12 bits). ¿tconv?', ['≈ 0,71 µs', '≈ 0,14 µs', '≈ 0,57 µs', '15 µs'], '(3 + 12) / 21 MHz.') });

  const C = String.raw;
  Object.assign(PROJECTS, {
    st_identify: {
      intro: 'Antes de programar nada, conoce tu placa como un técnico: qué chip lleva de verdad, cómo se conecta el depurador y cómo leer su memoria. Con las placas baratas, esta comprobación te ahorra horas de depurar un clon.',
      level: 1, hours: 3,
      skills: ['Leer el marcado de un STM32', 'Conectar un ST-LINK por SWD', 'Usar STM32CubeProgrammer', 'Leer la tabla de vectores y los registros de identificación'],
      bom: ['Placa Black Pill (STM32F411CEU6 o F401CCU6), Nucleo-64 (F401RE, F411RE o F446RE) o Blue Pill (STM32F103C8T6)', 'ST-LINK V2 (o el integrado de la Nucleo)', '4 cables dupont hembra-hembra', 'Cable USB de datos', 'Multímetro', 'Lupa o la cámara del móvil', 'STM32CubeProgrammer (gratuito, de ST)'],
      phases: [
        { title: 'Fase 1 · Inspección', steps: ['Fotografía el chip con la cámara del móvil en modo macro y lee el marcado completo (por ejemplo STM32F411CEU6). Descifra cada parte: familia, línea, patas, Flash, encapsulado y temperatura.', 'Localiza el cristal principal y lee su frecuencia (la Black Pill suele llevar 25 MHz; la Blue Pill, 8 MHz) y el pequeño de 32,768 kHz si lo hay.', 'Busca el LED de usuario y el pulsador (en la Black Pill, LED en PC13 activo a nivel bajo y pulsador KEY en PA0).', 'Alimenta por USB y mide con el multímetro la tensión entre 3V3 y GND.'],
          checks: ['He anotado el código completo del chip y sé qué significa cada letra', 'He medido entre 3,25 y 3,35 V en el pin 3V3', 'Sé en qué pin están el LED y el pulsador de mi placa'] },
        { title: 'Fase 2 · Conexión SWD', steps: ['Con todo desconectado, une ST-LINK y placa: 3,3V–3V3, SWDIO–DIO (PA13), SWCLK–CLK (PA14) y GND–GND. En una Nucleo no hace falta: el ST-LINK va integrado.', 'No alimentes la placa a la vez por USB y por el 3,3 V del ST-LINK si no sabes cómo están unidas las tensiones; elige una sola fuente.', 'Abre STM32CubeProgrammer, elige ST-LINK, modo “Normal” y pulsa Connect.', 'Si no conecta, prueba el modo “Under reset” cableando también NRST.'],
          checks: ['CubeProgrammer muestra el nombre del dispositivo y el tamaño de Flash', 'He apuntado el Device ID que muestra (por ejemplo 0x431 para F411)', 'Sé conectar en modo “Under reset”'] },
        { title: 'Fase 3 · Leer la memoria', steps: ['En la pestaña de memoria lee 0x08000000. La primera palabra es el puntero de pila inicial (debe parecerse a 0x2000xxxx) y la segunda la dirección de Reset_Handler (0x0800xxxx, impar por el bit Thumb).', 'Lee el identificador único de 96 bits: 0x1FFF7A10 en la F4 o 0x1FFFF7E8 en la F1.', 'Lee el registro de tamaño de Flash: 0x1FFF7A22 (F4) o 0x1FFFF7E0 (F1). Son 16 bits con el tamaño en KB.', 'Compara el tamaño leído con lo que dice el marcado.'],
          checks: ['La primera palabra de la Flash está dentro de la SRAM (0x2000xxxx)', 'La segunda palabra es impar y empieza por 0x080', 'He anotado el UID de mi chip y el tamaño de Flash en KB'] },
        { title: 'Fase 4 · ¿Original o clon?', steps: ['Busca el Device ID en el manual de referencia de tu familia y compáralo con el leído.', 'En la Blue Pill, sospecha si el chip pone CKS32, GD32, CS32 o APM32, o si el logotipo de ST no se parece al oficial. Muchos funcionan, pero con diferencias de tiempos, de ADC y de USB.', 'En la Blue Pill comprueba con el multímetro la resistencia de pull-up de D+ del USB (R10): debería ser de 1,5 kΩ y muchas placas traen 10 kΩ, lo que da problemas con algunos ordenadores.', 'Guarda una copia del firmware de fábrica (Save as .bin) y después haz un borrado completo (Full chip erase). Vuelve a leer 0x08000000: debe ser todo 0xFF.'],
          checks: ['He decidido si mi chip es original o compatible y por qué', 'He guardado el firmware de fábrica en un .bin', 'Tras el borrado, la Flash se lee como 0xFFFFFFFF'] }
      ],
      extra: ['Repite la prueba con otra placa y compara el UID: nunca se repite.', 'Investiga qué es el bit de protección de lectura (RDP) en las Option Bytes, pero no lo cambies todavía.']
    },
    st_morse: {
      intro: 'Una baliza que convierte en código Morse lo que escribes desde el ordenador. Tu primer programa completo con CubeMX, HAL, printf por la UART y una máquina de estados sin bloqueos.',
      level: 1, hours: 5,
      skills: ['Crear un proyecto en STM32CubeIDE', 'Configurar GPIO y USART en CubeMX', 'Redirigir printf a la UART', 'Pasar de HAL_Delay a una máquina de estados con HAL_GetTick'],
      bom: ['Nucleo-64 (usa su puerto serie virtual por USART2 en PA2/PA3) o Black Pill con un adaptador USB-serie de 3,3 V (CP2102 o CH340)', 'LED y resistencia de 330 Ω (o el LED de la placa)', 'Zumbador piezoeléctrico activo de 3–5 V con un NPN BC547 y 1 kΩ', 'Protoboard y cables', 'Terminal serie en el PC (PuTTY, CoolTerm o el de CubeIDE)'],
      phases: [
        { title: 'Fase 1 · Proyecto y parpadeo', steps: ['Crea un proyecto STM32 en CubeIDE con tu placa o tu chip.', 'En el .ioc, en System Core › SYS pon Debug en “Serial Wire”. Así nunca pierdes el acceso SWD.', 'Configura el pin del LED como GPIO_Output y ponle una etiqueta (User Label) “LED”.', 'Genera el código y, dentro de USER CODE BEGIN 3, alterna el LED con HAL_GPIO_TogglePin y HAL_Delay(250).', 'Depura (F11), pon un punto de ruptura en el Toggle y avanza paso a paso.'],
          checks: ['El LED parpadea a 2 Hz (cuéntalo con un cronómetro: 20 cambios en 5 s)', 'El código está entre las marcas USER CODE y sobrevive a una regeneración'] },
        { title: 'Fase 2 · Consola serie', steps: ['Activa la USART (USART2 en la Nucleo; USART1 en PA9/PA10 en la Black Pill) a 115200 baudios, 8N1.', 'Añade __io_putchar en main.c para que printf salga por la UART.', 'Imprime un mensaje de bienvenida con el valor de SystemCoreClock.', 'Si imprimes números con decimales, activa “Use float with printf” en las opciones del enlazador (newlib-nano).'],
          checks: ['El terminal muestra el mensaje al pulsar reset', 'El valor de SystemCoreClock coincide con lo configurado en el árbol de relojes'],
          code: C`/* USER CODE BEGIN 0 */
int __io_putchar(int ch) {
  HAL_UART_Transmit(&huart2, (uint8_t *)&ch, 1, HAL_MAX_DELAY);
  return ch;
}
/* USER CODE END 0 */

/* en main, USER CODE BEGIN 2: */
printf("Baliza lista. SYSCLK = %lu Hz\r\n", SystemCoreClock);` },
        { title: 'Fase 3 · Morse con bloqueos', steps: ['Crea una tabla con el código de cada letra (por ejemplo ".-" para la A).', 'Lee caracteres con HAL_UART_Receive y un tiempo de espera de 10 ms.', 'Reproduce cada símbolo: punto = 1 unidad encendido, raya = 3, separación entre símbolos 1, entre letras 3, entre palabras 7. Con una unidad de 100 ms.', 'Activa el zumbador con el transistor a la vez que el LED.'],
          checks: ['Al escribir SOS se oye y se ve ··· — — — ···', 'Una raya dura el triple que un punto (compruébalo con el osciloscopio o grabando el sonido)'] },
        { title: 'Fase 4 · Sin bloqueos', steps: ['Observa el problema: mientras suena una palabra larga, se pierden caracteres que llegan por la UART.', 'Rehaz la reproducción como máquina de estados: guarda el instante de inicio con HAL_GetTick() y cambia de estado cuando (HAL_GetTick() − inicio) supere la duración.', 'Guarda los caracteres recibidos en un búfer circular de 64 bytes.', 'Añade un comando “v20” para cambiar la velocidad a 20 palabras por minuto (unidad = 1200 / ppm ms).'],
          checks: ['Puedo escribir una frase entera mientras suena y no se pierde ninguna letra', 'El comando de velocidad cambia la duración del punto', 'El bucle principal nunca llama a HAL_Delay'] }
      ],
      extra: ['Recibe por interrupción con HAL_UART_Receive_IT y su callback.', 'Añade un decodificador: un pulsador como manipulador y el STM32 traduce a letras.']
    },
    st_bare: {
      intro: 'El mismo parpadeo, pero sin HAL ni CubeMX: solo el manual de referencia, punteros a registros y, al final, tu propio arranque y script del enlazador. Cuando lo termines, ningún código generado volverá a parecerte magia.',
      level: 2, hours: 7,
      skills: ['Habilitar relojes con RCC', 'Configurar GPIO con MODER, ODR y BSRR', 'SysTick a mano', 'Escribir un startup en C y un script del enlazador', 'Compilar con arm-none-eabi-gcc y make'],
      bom: ['Black Pill F411 (LED en PC13) o Nucleo-F411RE (LED en PA5): adapta los pines', 'ST-LINK', 'Manual de referencia RM0383 (F411) o el de tu chip', 'Opcional: Linux, macOS o WSL con make, arm-none-eabi-gcc y OpenOCD o st-flash'],
      phases: [
        { title: 'Fase 1 · Parpadeo con CMSIS', steps: ['Crea un proyecto “Empty” en CubeIDE (sin HAL) e incluye el archivo de cabecera del dispositivo (stm32f4xx.h con STM32F411xE definido).', 'Busca en el manual la dirección de RCC_AHB1ENR y el bit GPIOCEN, y compáralos con la macro RCC_AHB1ENR_GPIOCEN.', 'Escribe el programa de la fase y compílalo.', 'En el depurador abre la vista SFRs y mira cómo cambian GPIOC->MODER y ODR paso a paso.'],
          checks: ['El LED parpadea sin ninguna función HAL', 'En la vista SFRs veo el bit 13 de ODR cambiar', 'Si comento la línea de RCC, el LED deja de funcionar (y sé explicar por qué)'],
          code: C`#include "stm32f4xx.h"

int main(void) {
  RCC->AHB1ENR |= RCC_AHB1ENR_GPIOCEN;   // reloj del puerto C
  (void)RCC->AHB1ENR;                    // lectura de espera
  GPIOC->MODER &= ~(3U << (13 * 2));
  GPIOC->MODER |=  (1U << (13 * 2));     // PC13 salida
  while (1) {
    GPIOC->ODR ^= (1U << 13);
    for (volatile uint32_t i = 0; i < 400000; i++) { }
  }
}` },
        { title: 'Fase 2 · SysTick a mano', steps: ['Tras el reset la F411 funciona con el HSI a 16 MHz. Configura SysTick para 1 ms con SysTick_Config(16000000 / 1000).', 'Escribe SysTick_Handler para incrementar un contador volatile y una función delay_ms.', 'Cambia el bucle vacío por delay_ms(500) y cronometra 20 parpadeos.', 'Sustituye ODR ^= por escrituras en BSRR y razona por qué BSRR es atómico.'],
          checks: ['20 parpadeos completos tardan 20 s ± 0,3 s', 'Uso BSRR para encender y apagar', 'Sé explicar qué pasaría con ODR ^= si una interrupción tocara otro pin del mismo puerto'],
          code: C`volatile uint32_t ms;
void SysTick_Handler(void) { ms++; }

void delay_ms(uint32_t t) {
  uint32_t t0 = ms;
  while ((ms - t0) < t) { }      // correcto aunque ms desborde
}
/* en main: SysTick_Config(16000000 / 1000); */` },
        { title: 'Fase 3 · Una entrada', steps: ['Configura PA0 como entrada con pull-up (PUPDR = 01). En la Black Pill el pulsador KEY va a masa.', 'Lee GPIOA->IDR y cambia la velocidad del parpadeo mientras está pulsado.', 'Mide con el multímetro la tensión en PA0 suelto y pulsado.'],
          checks: ['El parpadeo cambia de velocidad al pulsar', 'He medido ~3,3 V suelto y ~0 V pulsado'] },
        { title: 'Fase 4 · Tu propio arranque', steps: ['Fuera de CubeIDE, crea main.c, startup.c, un script stm32f411.ld y un Makefile.', 'En el script define MEMORY (FLASH 512K en 0x08000000, RAM 128K en 0x20000000) y las secciones .isr_vector, .text, .rodata, .data (AT> FLASH), .bss y el símbolo _estack.', 'En startup.c escribe la tabla de vectores y Reset_Handler: copia .data, pone .bss a cero y llama a main.', 'Compila con -mcpu=cortex-m4 -mthumb -nostdlib (sin FPU para empezar) y graba con st-flash o OpenOCD.', 'Mira el archivo .map y localiza dónde ha quedado cada sección.'],
          checks: ['El binario arranca y parpadea sin ningún archivo de ST salvo las cabeceras', 'arm-none-eabi-size muestra el tamaño y sé qué es text, data y bss', 'Una variable global inicializada a 42 vale 42 al entrar en main (comprobado con el depurador)'],
          code: C`extern uint32_t _estack, _sidata, _sdata, _edata, _sbss, _ebss;
int main(void);

void Reset_Handler(void) {
  uint32_t *src = &_sidata, *dst = &_sdata;
  while (dst < &_edata) *dst++ = *src++;   // .data: Flash -> RAM
  for (dst = &_sbss; dst < &_ebss; ) *dst++ = 0;  // .bss a cero
  main();
  while (1) { }
}
void Default_Handler(void) { while (1) { } }
void SysTick_Handler(void) __attribute__((weak, alias("Default_Handler")));

typedef void (*vec_t)(void);
__attribute__((section(".isr_vector"), used))
const vec_t vectores[16] = {
  (vec_t)&_estack, Reset_Handler,
  Default_Handler, Default_Handler,      /* NMI, HardFault */
  /* ... entradas 4 a 14 ... */
  [15] = SysTick_Handler
};` },
        { title: 'Fase 5 · Comparar', steps: ['Haz el mismo programa con HAL y CubeMX y compila ambos con -Os.', 'Compara text, data y bss de los dos.', 'Mide con el osciloscopio cuánto tarda un cambio de pin con HAL_GPIO_TogglePin y con BSRR en un bucle sin retardo.'],
          checks: ['He anotado los tamaños de las dos versiones', 'He medido la frecuencia máxima de conmutación en ambas versiones'] }
      ],
      extra: ['Activa la FPU en tu startup (SCB->CPACR) y compila con -mfloat-abi=hard.', 'Añade la tabla de vectores completa de las interrupciones de tu chip.']
    },
    st_mco: {
      intro: 'Saca el reloj interno del chip por un pin y mídelo. Cambiarás el PLL, compararás el HSI con el cristal y verás cuánto consume el chip a cada frecuencia: el árbol de relojes deja de ser un dibujo.',
      level: 2, hours: 4,
      skills: ['Configurar el PLL en CubeMX', 'Usar la salida MCO', 'Medir frecuencias y consumo', 'Entender la precisión del HSI frente al HSE'],
      bom: ['Black Pill F411 o Nucleo-F411RE', 'Osciloscopio de 50 MHz o más, o un frecuencímetro (si solo tienes un analizador lógico barato, usa divisores grandes)', 'Multímetro con escala de mA', 'Fuente de 3,3 V o el propio USB con un medidor USB'],
      phases: [
        { title: 'Fase 1 · MCO1', steps: ['En CubeMX activa RCC › Master Clock Output 1: aparece en PA8 (función alternativa 0).', 'Elige como fuente el HSE con divisor ÷1 y genera el código. Mide PA8 con el osciloscopio.', 'Cambia la fuente a PLLCLK con divisor ÷5 y mide de nuevo.', 'Ajusta la velocidad del pin MCO a “Very High” y compara los flancos con “Low”.'],
          checks: ['Con HSE ÷1 mido la frecuencia del cristal (±0,01 %)', 'Con PLL ÷5 mido SYSCLK / 5', 'He visto que la velocidad del pin cambia la pendiente de los flancos'],
          code: C`/* USER CODE BEGIN 2 */
HAL_RCC_MCOConfig(RCC_MCO1, RCC_MCO1SOURCE_PLLCLK, RCC_MCODIV_5);
/* PA8 = SYSCLK / 5 */` },
        { title: 'Fase 2 · Juega con el PLL', steps: ['Configura 96 MHz con HSE 25 MHz: M = 25, N = 192, P = 2, Q = 4 (USB a 48 MHz). Comprueba que CubeMX no marca nada en rojo.', 'Cambia a 100 MHz (N = 200) y fíjate en que Q ya no da 48 MHz exactos.', 'Observa cómo CubeMX ajusta la latencia de la Flash (wait states) al cambiar la frecuencia.', 'Nunca superes los máximos de la hoja de datos: el chip no está garantizado fuera de ellos.'],
          checks: ['He medido 19,2 MHz (96 / 5) y 20 MHz (100 / 5) en PA8', 'He anotado los wait states que pone CubeMX a 96 y a 100 MHz'] },
        { title: 'Fase 3 · HSI contra cristal', steps: ['Pon el HSI como fuente de MCO1 y mide su frecuencia en frío.', 'Calienta el chip con la mano o un secador a distancia y mide de nuevo.', 'Calcula el error en % respecto a 16 MHz.', 'Razona qué error de UART tendrías si usaras el HSI como reloj.'],
          checks: ['He anotado el error del HSI en frío y en caliente', 'El error del HSE es al menos diez veces menor que el del HSI'] },
        { title: 'Fase 4 · Consumo y frecuencia', steps: ['Alimenta la placa desde una sola fuente con el amperímetro en serie.', 'Mide el consumo con un bucle vacío a 16 MHz (HSI), a 48 MHz y a 96 MHz.', 'Representa consumo frente a frecuencia y calcula los mA por MHz.', 'Repite apagando los relojes de los periféricos que no usas.'],
          checks: ['Tengo una tabla con al menos tres frecuencias y su consumo', 'El consumo crece aproximadamente en línea recta con la frecuencia'] }
      ],
      extra: ['Activa el Clock Security System y averigua qué hace si falla el HSE.', 'Usa el LSE de 32,768 kHz en MCO1 y comprueba su precisión.']
    },
    st_keypad: {
      intro: 'Una cerradura electrónica con teclado matricial 4×4 y un display de 7 segmentos de 4 dígitos multiplexado. Todo GPIO: salidas open-drain, pull-ups, escritura atómica con BSRR y un barrido cada milisegundo.',
      level: 2, hours: 7,
      skills: ['Barrido de un teclado matricial', 'Multiplexado de displays', 'Salidas open-drain y pull-ups internas', 'Temporización desde SysTick', 'Máquina de estados de una cerradura'],
      bom: ['Black Pill o Nucleo', 'Teclado de membrana 4×4', 'Display de 4 dígitos de 7 segmentos de cátodo común (por ejemplo 5641AS)', '8 resistencias de 330 Ω para los segmentos', '4 transistores NPN (BC547 o 2N3904) con 4 resistencias de 1 kΩ de base', 'LED verde y rojo con 330 Ω', 'Zumbador activo y NPN', 'Protoboard grande y cables'],
      phases: [
        { title: 'Fase 1 · El display', steps: ['Segmentos a–g y punto: cada uno desde un pin del STM32 por 330 Ω al ánodo del segmento.', 'Cada cátodo común a un NPN: colector al cátodo, emisor a GND, base por 1 kΩ a un pin.', 'Escribe una tabla de 10 bytes con los segmentos de cada cifra.', 'Escribe los 8 segmentos de golpe con un solo acceso a BSRR (bits a 1 en la mitad baja, bits a 0 en la alta).', 'Muestra un mismo dígito en las cuatro posiciones encendiendo los cuatro NPN.'],
          checks: ['Las diez cifras se ven bien', 'Uso una sola escritura en BSRR para los 8 segmentos', 'He calculado la corriente de un segmento (unos 4 mA) y la máxima de un dígito'] },
        { title: 'Fase 2 · Multiplexado', steps: ['En SysTick_Handler (zona USER CODE de stm32f4xx_it.c) llama a una función que, cada 1 ms, apaga el dígito actual, carga los segmentos del siguiente y lo enciende.', 'Muestra “1234” y luego un contador.', 'Prueba a barrer cada 10 ms y observa el parpadeo.', 'Añade un “tiempo muerto” apagando todos los dígitos antes de cambiar segmentos para evitar fantasmas.'],
          checks: ['Se ven 4 cifras distintas sin parpadeo', 'Sé a qué frecuencia de barrido empieza a notarse el parpadeo', 'No se ven segmentos fantasma del dígito vecino'] },
        { title: 'Fase 3 · El teclado', steps: ['Filas como entradas con pull-up interna. Columnas como salidas open-drain a nivel alto (alta impedancia).', 'En cada barrido pon una columna a 0, espera unos microsegundos y lee las cuatro filas en IDR.', 'Una tecla pulsada pone a 0 su fila. Combina fila y columna en un código de tecla.', 'Antirrebote: acepta una tecla solo si se lee igual durante 20 ms seguidos.'],
          checks: ['Las 16 teclas se detectan correctamente', 'Una pulsación larga se registra una sola vez', 'Sé explicar por qué las columnas en open-drain evitan cortocircuitos si pulso dos teclas'] },
        { title: 'Fase 4 · La cerradura', steps: ['Diseña la máquina de estados: ESPERA, INTRODUCIENDO, ABIERTO, BLOQUEADO.', 'La clave tiene 4 cifras; # confirma y * borra. Muestra guiones en el display mientras se escribe.', 'Al acertar, LED verde 5 s. Al fallar tres veces, bloqueo de 30 s con cuenta atrás en el display.', 'Pitido corto con cada tecla y largo al fallar.'],
          checks: ['La clave correcta abre durante 5 s ± 0,2 s', 'Tres fallos seguidos bloquean 30 s y el display muestra la cuenta atrás', 'Ninguna parte del programa usa HAL_Delay'] }
      ],
      extra: ['Guarda la clave en la Flash interna (lo verás en el módulo 8) para que sobreviva al reset.', 'Mueve un servo de cerradura con PWM en cuanto domines los temporizadores.']
    },
    st_motor: {
      intro: 'Controla la velocidad y la posición de un motorreductor con encoder mediante un PID que corre a 1 kHz. Es el núcleo de cualquier robot, impresora 3D o eje industrial, y te obliga a usar PWM, modo encoder e interrupciones de temporizador a la vez.',
      level: 3, hours: 15,
      skills: ['PWM de 20 kHz con TIM1', 'Modo encoder (x4)', 'Bucle de control periódico en una interrupción', 'PID con antisaturación', 'Telemetría y ajuste con datos reales'],
      bom: ['Black Pill F411 o Nucleo-F411RE', 'Motorreductor de 6–12 V con encoder de efecto Hall (por ejemplo JGA25-370 con encoder o un N20 con encoder)', 'Driver TB6612FNG en módulo', 'Fuente o batería para el motor (6–12 V según el motor, con fusible)', 'Condensador electrolítico de 470 µF y uno de 100 nF junto al driver', 'Adaptador USB-serie si tu placa no lo trae', 'Python con pyserial y matplotlib en el PC'],
      phases: [
        { title: 'Fase 1 · Potencia en lazo abierto', steps: ['Cablea el TB6612: PWMA a TIM1_CH1 (PA8), AIN1 y AIN2 a dos GPIO, STBY a 3,3 V, VM a la batería del motor, VCC a 3,3 V y masas comunes.', 'Configura TIM1 en PWM a 20 kHz: con 100 MHz, PSC = 0 y ARR = 4999.', 'Recuerda que TIM1 es avanzado: HAL_TIM_PWM_Start activa el bit MOE por ti; con registros tendrías que ponerlo en BDTR.', 'Varía el CCR de 0 a 4999 desde la consola y mide la tensión media en el motor.'],
          checks: ['El motor gira en los dos sentidos', 'Mido 20 kHz ± 1 % en PA8 con el osciloscopio', 'No se oye pitido del PWM (20 kHz queda fuera del oído)'] },
        { title: 'Fase 2 · Encoder', steps: ['Conecta los canales A y B del encoder a TIM3_CH1 (PA6) y TIM3_CH2 (PA7) con pull-up si el encoder es de colector abierto.', 'Configura TIM3 en Combined Channels › Encoder Mode TI1 and TI2 con ARR = 65535 y arráncalo con HAL_TIM_Encoder_Start.', 'Gira el eje a mano una vuelta y cuenta los pasos: calcula los pasos por vuelta del eje de salida (pulsos del encoder × 4 × reducción).', 'Calcula la velocidad cada 1 ms con la diferencia de cuentas en 16 bits con signo.'],
          checks: ['Una vuelta del eje de salida da siempre el mismo número de cuentas (±2)', 'El signo de la velocidad cambia con el sentido de giro', 'La cuenta no da saltos al pasar por 65535'],
          code: C`// TIM3 en modo encoder, ARR = 0xFFFF
static int16_t ultimo;
float velocidad_rpm(float dt) {
  int16_t ahora = (int16_t)__HAL_TIM_GET_COUNTER(&htim3);
  int16_t d = ahora - ultimo;     // la resta en 16 bits absorbe el desbordamiento
  ultimo = ahora;
  return d / (float)CUENTAS_POR_VUELTA / dt * 60.0f;
}` },
        { title: 'Fase 3 · Bucle de 1 kHz', steps: ['Configura TIM4 con interrupción de actualización a 1 kHz (PSC = 99, ARR = 999 con 100 MHz).', 'En HAL_TIM_PeriodElapsedCallback mide la velocidad, calcula el PID y escribe el CCR.', 'Mide con un pin de depuración y el osciloscopio cuánto tarda el callback: debe ser mucho menor de 1 ms.', 'Prioridad del TIM4 más urgente que la de la UART.'],
          checks: ['El callback tarda menos del 20 % del periodo (medido con el pin de depuración)', 'Con solo P el motor sigue la consigna con un error constante'],
          code: C`typedef struct { float kp, ki, kd, integ, prev, min, max; } pid_ctrl_t;

float pid_paso(pid_ctrl_t *c, float ref, float med, float dt) {
  float e = ref - med;
  float d = (e - c->prev) / dt;
  c->prev = e;
  float u = c->kp * e + c->integ + c->kd * d;
  if (u > c->max) u = c->max;
  else if (u < c->min) u = c->min;
  else c->integ += c->ki * e * dt;   // antisaturación: no integra si satura
  return u;
}` },
        { title: 'Fase 4 · Ajuste con datos', steps: ['Envía cada 10 ms por la UART: tiempo, consigna, velocidad y salida, separados por comas.', 'Con Python, guarda y dibuja una respuesta a un escalón de 0 a 100 rpm.', 'Ajusta Kp hasta que oscile un poco y bájalo a la mitad; sube Ki hasta eliminar el error; añade Kd si hay sobreoscilación.', 'Prueba a frenar el eje con los dedos (con cuidado y a baja tensión) y observa cómo responde el integral.'],
          checks: ['Tengo una gráfica del escalón con menos de un 10 % de sobreoscilación', 'El error en régimen permanente es menor del 2 %', 'Al soltar el freno no hay un pico grande (la antisaturación funciona)'] },
        { title: 'Fase 5 · Posición', steps: ['Añade un lazo de posición externo que dé la consigna de velocidad al lazo interno (control en cascada).', 'Ordena posiciones en grados por la consola: “g90”, “g-180”.', 'Limita la velocidad máxima y la aceleración para movimientos suaves.'],
          checks: ['El eje va a 90° y vuelve a 0° con un error menor de 2°', 'Los movimientos tienen rampa de aceleración visible en la gráfica'] }
      ],
      extra: ['Mide la corriente del motor con una resistencia shunt y el ADC, y añade un límite de corriente.', 'Controla dos motores y haz un pequeño robot diferencial.']
    },

    st_freq: {
      intro: 'Un frecuencímetro de bolsillo que mide frecuencia, periodo y ciclo de trabajo con captura de entrada, y que cambia de método automáticamente para señales muy rápidas. Un instrumento de verdad para tu banco.',
      level: 3, hours: 9,
      skills: ['Captura de entrada', 'Modo PWM input (CH1 + CH2 con reinicio esclavo)', 'Contar con reloj externo y puerta de tiempo', 'Temporizador de 32 bits', 'Pantalla OLED por I²C'],
      bom: ['Black Pill F411 o Nucleo-F411RE', 'Pantalla OLED SSD1306 de 128×64 por I²C', 'Resistencia de 1 kΩ en serie con la entrada y dos diodos 1N4148 de protección (o un buffer 74LVC1G17)', 'Un 555 del curso base como fuente de señal', 'Opcional: generador de funciones'],
      phases: [
        { title: 'Fase 1 · Captura simple', steps: ['Usa TIM2 (32 bits) con la entrada en PA0 (TIM2_CH1, AF1). Antes, comprueba en la hoja de datos si ese pin tolera 5 V (FT); si no, protege la entrada.', 'Configura Input Capture en flanco de subida, PSC = 0 y ARR = 0xFFFFFFFF.', 'En el callback de captura resta la captura anterior a la actual (con unsigned, el desbordamiento se arregla solo) y calcula f = fTIM / diferencia.', 'Mide la salida del 555 y compárala con el osciloscopio.'],
          checks: ['La frecuencia medida del 555 coincide con el osciloscopio a menos del 0,5 %', 'La medida es estable (varía menos de 0,1 % entre lecturas)'] },
        { title: 'Fase 2 · Periodo y ciclo de trabajo', steps: ['Cambia TIM2 a modo PWM Input: CH1 captura la subida (periodo) y CH2 la bajada (tiempo en alto), con el contador reiniciándose en cada subida (Slave Mode: Reset, Trigger: TI1FP1).', 'Lee CCR1 y CCR2 en el callback del canal 1.', 'Prueba con un PWM generado por otro temporizador del propio chip a 1 kHz y 30 %.'],
          checks: ['Mido 1 kHz y 30 % ± 0,5 % con el PWM interno', 'El ciclo de trabajo del 555 coincide con la fórmula del curso base'],
          code: C`volatile float frec_hz, duty_pct;
void HAL_TIM_IC_CaptureCallback(TIM_HandleTypeDef *htim) {
  if (htim->Instance == TIM2 && htim->Channel == HAL_TIM_ACTIVE_CHANNEL_1) {
    uint32_t periodo = HAL_TIM_ReadCapturedValue(htim, TIM_CHANNEL_1);
    uint32_t alto    = HAL_TIM_ReadCapturedValue(htim, TIM_CHANNEL_2);
    if (periodo) {
      frec_hz  = (float)FTIM_HZ / periodo;    // error de ±1 tick
      duty_pct = 100.0f * alto / periodo;
    }
  }
}` },
        { title: 'Fase 3 · Señales rápidas', steps: ['A frecuencias altas la captura pierde resolución y satura de interrupciones. Cambia de método: el temporizador cuenta flancos de la señal (reloj externo por ETR) durante una puerta exacta de 1 s generada por otro temporizador.', 'Pasa de un método a otro según la frecuencia (por ejemplo, conteo por encima de 100 kHz).', 'Calcula la resolución de cada método: ±1 cuenta sobre lo medido.'],
          checks: ['Mido una señal de 1 MHz (MCO o un temporizador) con error menor de 10 ppm respecto al cristal', 'El cambio automático de método no da saltos raros en la frontera'] },
        { title: 'Fase 4 · Instrumento', steps: ['Muestra frecuencia, periodo y duty en la OLED con unidades automáticas (Hz, kHz, MHz).', 'Añade un pulsador para congelar la lectura (HOLD).', 'Calibra: compara con un instrumento de referencia y anota el error del cristal en ppm.', 'Mete el montaje en una caja con un conector BNC.'],
          checks: ['La pantalla se actualiza al menos 2 veces por segundo', 'He anotado el error en ppm frente a una referencia', 'HOLD congela y libera la lectura'] }
      ],
      extra: ['Mide también la anchura de pulsos únicos (modo de pulso aislado).', 'Añade un segundo canal y mide el desfase entre dos señales.']
    },
    st_spectrum: {
      intro: 'Un analizador de espectro de audio en tiempo real: el ADC muestrea un micrófono disparado por un temporizador, el DMA llena un búfer doble y la FPU calcula una FFT de 1024 puntos con CMSIS-DSP. Verás las notas de tu voz como barras.',
      level: 4, hours: 20,
      skills: ['ADC disparado por TRGO de un temporizador', 'DMA circular con medias transferencias', 'FFT real con CMSIS-DSP', 'Ventanas y escalas logarítmicas', 'Medir ciclos con DWT->CYCCNT'],
      bom: ['Black Pill F411 (Cortex-M4F) o Nucleo-F411RE/F446RE', 'Módulo de micrófono con amplificador y salida centrada (MAX9814 o MAX4466)', 'Pantalla: OLED SSD1306, TFT ST7789 o matriz de LEDs WS2812 de 8×32', 'Condensador de 100 nF y resistencia de 100 Ω para filtrar la alimentación del micro', 'Generador de tonos en el móvil'],
      phases: [
        { title: 'Fase 1 · Muestreo exacto', steps: ['Configura TIM3 para dar un TRGO de actualización a 32 kHz: con 100 MHz de reloj de temporizador, PSC = 0 y ARR = 3124.', 'ADC1 a 12 bits, disparo externo TIM3 TRGO en flanco de subida, un canal, sin modo continuo, con DMA circular de media palabra.', 'Lanza HAL_ADC_Start_DMA con un búfer de 2048 muestras y arranca TIM3 con HAL_TIM_Base_Start.', 'Comprueba la frecuencia de muestreo poniendo un pin a 1 y 0 en los callbacks de mitad y completo.'],
          checks: ['El pin de prueba cambia cada 32 ms (1024 muestras a 32 kHz) ± 0,1 ms', 'Con el micro en silencio las muestras rondan el valor medio (unos 1500–2100 cuentas según el módulo)'],
          code: C`#define NFFT 1024
static uint16_t adc_buf[2 * NFFT];          // DMA circular: dos mitades
static uint16_t *volatile listo = NULL;

void HAL_ADC_ConvHalfCpltCallback(ADC_HandleTypeDef *h) { listo = &adc_buf[0]; }
void HAL_ADC_ConvCpltCallback(ADC_HandleTypeDef *h)     { listo = &adc_buf[NFFT]; }

/* USER CODE BEGIN 2 */
HAL_ADC_Start_DMA(&hadc1, (uint32_t *)adc_buf, 2 * NFFT);
HAL_TIM_Base_Start(&htim3);` },
        { title: 'Fase 2 · La FFT', steps: ['Añade CMSIS-DSP al proyecto (biblioteca precompilada para Cortex-M4 con FPU o sus fuentes) y comprueba que compilas con -mfpu=fpv4-sp-d16 -mfloat-abi=hard.', 'Inicializa arm_rfft_fast_init_f32 con 1024 puntos y precalcula una ventana de Hann.', 'En el bucle principal, cuando haya una mitad lista: resta el valor medio, multiplica por la ventana, haz la FFT y calcula el módulo.', 'Mide los ciclos que tarda con DWT->CYCCNT.'],
          checks: ['Con un tono de 1 kHz del móvil, el máximo está en el contenedor 32 (1000 / 31,25 Hz)', 'El cálculo completo tarda menos de los 32 ms de una mitad (medido con DWT)', 'Sé por qué la resolución es de 31,25 Hz'],
          code: C`arm_rfft_fast_instance_f32 fft;
static float in[NFFT], out[NFFT], mag[NFFT / 2], ventana[NFFT];
/* una vez: arm_rfft_fast_init_f32(&fft, NFFT); y rellenar la ventana */

if (listo) {
  uint16_t *src = listo; listo = NULL;
  float media = 0;
  for (int i = 0; i < NFFT; i++) media += src[i];
  media /= NFFT;
  for (int i = 0; i < NFFT; i++) in[i] = (src[i] - media) * ventana[i];
  arm_rfft_fast_f32(&fft, in, out, 0);
  arm_cmplx_mag_f32(out, mag, NFFT / 2);   // mag[0] mezcla continua y Nyquist
}` },
        { title: 'Fase 3 · Barras bonitas', steps: ['Agrupa los 512 contenedores en 16–32 bandas con escala logarítmica de frecuencia (más contenedores por banda en agudos).', 'Pasa cada banda a dB y limita a un rango de 40–60 dB.', 'Añade caída suave de las barras y un punto de pico que baja despacio.', 'Dibuja en tu pantalla sin bloquear la adquisición.'],
          checks: ['Silbar hace subir una sola barra que se mueve al cambiar el tono', 'Las barras caen suavemente y no parpadean', 'No se pierden mitades de búfer mientras se dibuja (contador de mitades perdidas a 0)'] },
        { title: 'Fase 4 · Medir de verdad', steps: ['Calibra la escala de frecuencia con tonos de 250 Hz, 1 kHz y 4 kHz.', 'Añade un modo “afinador”: busca el pico y muestra la nota musical más cercana y los cents de desviación (interpola entre contenedores para afinar más).', 'Documenta el límite: por encima de 16 kHz (la mitad del muestreo) aparecen alias; explica qué filtro analógico haría falta.'],
          checks: ['El afinador marca La4 con un diapasón o un tono de 440 Hz con error menor de 5 cents', 'He documentado la frecuencia de Nyquist y el aliasing con un ejemplo'] }
      ],
      extra: ['Usa dos canales de ADC y muestra la diferencia de fase entre dos micrófonos.', 'Cambia a FFT de 4096 puntos y compara resolución y tiempo de cálculo.']
    },
    st_funcgen: {
      intro: 'Un generador de funciones digital: el DAC saca muestras de una tabla al ritmo de un temporizador y el DMA las recicla en círculo sin que la CPU mueva un dedo. Seno, triángulo, cuadrada y sierra, con frecuencia y amplitud ajustables.',
      level: 3, hours: 10,
      skills: ['DAC disparado por temporizador', 'DMA circular de memoria a periférico', 'Síntesis por tabla', 'Filtro de reconstrucción', 'Interfaz con encoder rotativo'],
      bom: ['Una placa con DAC: Nucleo-F446RE (DAC en PA4/PA5) o Nucleo-G431RB/G474RE. Ojo: la F401 y la F411 no tienen DAC', 'Encoder rotativo con pulsador (KY-040)', 'Operacional rail-to-rail de 3,3 V (MCP6002) para el buffer de salida', 'Resistencia de 1 kΩ y condensador de 10 nF para el filtro de reconstrucción', 'Conector BNC o pinzas', 'Osciloscopio'],
      phases: [
        { title: 'Fase 1 · Un valor fijo', steps: ['Activa DAC canal 1 (PA4) con el buffer de salida habilitado.', 'Escribe valores con HAL_DAC_SetValue y mide la tensión: 0, 1024, 2048, 3072 y 4095.', 'Calcula la tensión esperada: V = valor / 4095 × VREF+.', 'Anota el error en los extremos (el buffer no llega exactamente a 0 V ni a VREF+).'],
          checks: ['Tengo una tabla de cinco puntos con lo esperado y lo medido', 'El error en la zona central es menor de 20 mV'] },
        { title: 'Fase 2 · Tabla y DMA', steps: ['Configura TIM6 con disparo TRGO por actualización y el DAC con disparo “Timer 6 Trigger Out”.', 'Activa el DMA del DAC en modo circular, media palabra.', 'Rellena una tabla de 256 muestras de seno y arranca con HAL_DAC_Start_DMA y HAL_TIM_Base_Start.', 'Calcula la frecuencia de salida: f = fTIM / ((PSC + 1)(ARR + 1)) / 256.'],
          checks: ['Veo un seno limpio en el osciloscopio', 'La frecuencia medida coincide con la calculada ± 0,5 %', 'La CPU queda libre: el bucle principal puede hacer parpadear un LED sin afectar a la señal'],
          code: C`#define NS 256
static uint16_t tabla[NS];

void tabla_seno(float amp) {                 // amp de 0 a 1
  for (int i = 0; i < NS; i++)
    tabla[i] = (uint16_t)(2048.0f + 2047.0f * amp * sinf(6.2831853f * i / NS));
}

/* USER CODE BEGIN 2 */
tabla_seno(1.0f);
HAL_DAC_Start_DMA(&hdac, DAC_CHANNEL_1, (uint32_t *)tabla, NS, DAC_ALIGN_12B_R);
HAL_TIM_Base_Start(&htim6);` },
        { title: 'Fase 3 · Formas y filtro', steps: ['Añade triángulo, cuadrada y sierra regenerando la tabla.', 'Observa los escalones del seno con zoom; monta el filtro RC (1 kΩ y 10 nF) y compara.', 'Pon el MCP6002 como seguidor detrás del filtro para poder cargar la salida.', 'Busca la frecuencia de actualización máxima a la que la forma sigue limpia en tu placa.'],
          checks: ['Las cuatro formas se ven correctamente', 'El filtro suaviza los escalones visiblemente', 'He anotado la frecuencia máxima útil de mi generador'] },
        { title: 'Fase 4 · Interfaz', steps: ['Lee el encoder con un temporizador en modo encoder.', 'Gira para cambiar la frecuencia (cambiando ARR con precarga activada para no dar saltos) y pulsa para cambiar de forma.', 'Ajusta la amplitud desde la consola serie.', 'Muestra la configuración por la UART o en una OLED.'],
          checks: ['Cambiar la frecuencia no produce glitches visibles en el osciloscopio', 'Puedo elegir entre 1 Hz y 10 kHz', 'La amplitud se ajusta del 10 % al 100 %'] }
      ],
      extra: ['Usa el segundo canal del DAC con un desfase de 90° (seno y coseno) y dibuja una figura de Lissajous en modo XY.', 'Haz síntesis DDS con acumulador de fase de 32 bits para tener resolución de frecuencia de milihercios.']
    },
    st_ws2812: {
      intro: 'Controla una tira de LEDs WS2812B con PWM y DMA: cada bit del protocolo es un ciclo de PWM y el DMA escribe el CCR adecuado en cada ciclo. Animaciones fluidas sin ocupar la CPU.',
      level: 3, hours: 8,
      skills: ['Generar un protocolo con PWM + DMA', 'Calcular tiempos en ticks', 'Adaptar niveles de 3,3 a 5 V', 'Presupuesto de potencia de una tira LED', 'Animaciones con HSV'],
      bom: ['Black Pill F411 o Nucleo', 'Tira WS2812B de 60 LEDs a 5 V', 'Fuente de 5 V y 4 A (cada LED puede consumir unos 60 mA en blanco a tope)', 'Condensador electrolítico de 1000 µF y 10 V en la entrada de la tira', 'Resistencia de 330 Ω en serie con el dato', 'Adaptador de nivel 74AHCT125 (o 74HCT14) alimentado a 5 V', 'Cables gruesos para la alimentación de la tira'],
      phases: [
        { title: 'Fase 1 · Tiempos', steps: ['El protocolo va a 800 kHz: cada bit dura 1,25 µs. Un 0 es un pulso alto corto (unos 0,4 µs) y un 1 un pulso largo (unos 0,8 µs).', 'Con TIM3 a 100 MHz: ARR = 124 (125 ticks de 10 ns). Un 0 = CCR 40; un 1 = CCR 80.', 'Configura TIM3_CH1 en PWM con DMA de memoria a periférico, media palabra, modo normal.', 'Mide con el osciloscopio un patrón fijo de prueba.'],
          checks: ['Mido 800 kHz ± 1 % y pulsos de 0,4 y 0,8 µs ± 0,05 µs', 'Sé calcular ARR y CCR para otro reloj de temporizador'] },
        { title: 'Fase 2 · Potencia y nivel', steps: ['Alimenta la tira desde la fuente de 5 V, nunca desde el pin de 5 V de la placa. Masa común entre fuente, tira y STM32.', 'Pon el condensador de 1000 µF en la entrada de la tira respetando la polaridad.', 'El dato de 3,3 V no llega al umbral alto de un WS2812 a 5 V (0,7 × VDD = 3,5 V): pásalo por el 74AHCT125 alimentado a 5 V y añade la resistencia de 330 Ω.', 'Limita por software el brillo global al 30 % mientras pruebas.'],
          checks: ['He calculado el consumo máximo de mi tira y la fuente tiene margen', 'Con el adaptador de nivel los colores son estables, sin LEDs que parpadeen al azar'] },
        { title: 'Fase 3 · Controlador', steps: ['Crea un búfer con un valor de CCR por bit (24 por LED) más una cola de ceros para el pulso de reset.', 'Escribe ws_pixel(n, r, g, b) respetando el orden GRB del WS2812B.', 'Envía con HAL_TIM_PWM_Start_DMA y para en el callback de fin.', 'Cuenta la RAM: 60 LEDs × 24 × 2 bytes más la cola.'],
          checks: ['El LED 0 se pone rojo, el 1 verde y el 2 azul en ese orden', 'Puedo mostrar un color en cualquier LED', 'He calculado la RAM del búfer y coincide con el .map'],
          code: C`#define NLED  60
#define T0H   40          // ticks de 10 ns con ARR = 124
#define T1H   80
#define RESET 240         // 240 x 1,25 us = 300 us a nivel bajo
static uint16_t pwm[NLED * 24 + RESET];

void ws_pixel(int n, uint8_t r, uint8_t g, uint8_t b) {
  uint32_t grb = ((uint32_t)g << 16) | ((uint32_t)r << 8) | b;
  for (int i = 0; i < 24; i++)
    pwm[n * 24 + i] = (grb & (1UL << (23 - i))) ? T1H : T0H;
}
void ws_mostrar(void) {
  HAL_TIM_PWM_Start_DMA(&htim3, TIM_CHANNEL_1, (uint32_t *)pwm, NLED * 24 + RESET);
}
void HAL_TIM_PWM_PulseFinishedCallback(TIM_HandleTypeDef *h) {
  HAL_TIM_PWM_Stop_DMA(h, TIM_CHANNEL_1);
}` },
        { title: 'Fase 4 · Animaciones', steps: ['Implementa una conversión HSV a RGB con enteros.', 'Haz tres efectos: arcoíris que se desplaza, cometa con estela y “respiración”.', 'Aplica corrección gamma con una tabla de 256 bytes para que el fundido parezca lineal.', 'Cambia de efecto con un pulsador y refresca a 60 fotogramas por segundo.'],
          checks: ['Los tres efectos se ven fluidos (60 fps medidos con un pin de prueba)', 'El fundido con gamma se percibe más uniforme que sin ella', 'Con todos los LEDs en blanco al brillo limitado, mido la corriente y no supera lo previsto'] }
      ],
      extra: ['Usa DMA circular con medio búfer y genera los bits al vuelo para controlar cientos de LEDs con poca RAM.', 'Haz que la tira reaccione a la música con el analizador de espectro.']
    },
    st_logger: {
      intro: 'Un registrador de datos que guarda temperatura, humedad y presión en una microSD con hora del RTC, en un CSV que abres en la hoja de cálculo. Aprenderás FatFs, SPI, el RTC con cristal de 32,768 kHz y a no corromper archivos si se va la luz.',
      level: 3, hours: 12,
      skills: ['FatFs con el middleware de CubeMX', 'Tarjetas SD por SPI', 'RTC con LSE', 'Sensor I²C (BME280)', 'Escritura robusta ante cortes'],
      bom: ['Black Pill F411 (trae cristal de 32,768 kHz) o Nucleo con LSE', 'Módulo de microSD (mejor uno de 3,3 V sin regulador, o uno con adaptador de nivel)', 'Tarjeta microSD de 2–32 GB en FAT32', 'Sensor BME280 por I²C (dirección 0x76 o 0x77)', 'Pila CR2032 y portapilas para VBAT si quieres que el RTC siga sin alimentación', 'Pulsador y LED'],
      phases: [
        { title: 'Fase 1 · Sensor', steps: ['Conecta el BME280 a I2C1 (PB6 SCL, PB7 SDA) con pull-ups de 4,7 kΩ si el módulo no las trae.', 'Comprueba que responde con HAL_I2C_IsDeviceReady usando la dirección desplazada (0x76 << 1).', 'Lee el registro de identificación (0xD0): debe devolver 0x60.', 'Lee la calibración y calcula temperatura y presión con las fórmulas de compensación de la hoja de datos.'],
          checks: ['El ID leído es 0x60', 'La temperatura coincide con un termómetro de referencia ± 1 °C', 'La presión está entre 950 y 1050 hPa (según tu altitud)'] },
        { title: 'Fase 2 · Hora real', steps: ['Activa el LSE y el RTC con fuente LSE en CubeMX.', 'Pon la hora desde la consola serie.', 'Lee siempre HAL_RTC_GetTime y justo después HAL_RTC_GetDate: el RTC bloquea sus registros sombra hasta que lees la fecha.', 'Usa un registro de respaldo (BKP0R) como marca para no reescribir la hora en cada reset.'],
          checks: ['El reloj deriva menos de 2 s en 24 h', 'Tras un reset la hora se conserva (no vuelve a 00:00)'] },
        { title: 'Fase 3 · SD y FatFs', steps: ['Conecta la SD a SPI2 (PB13 SCK, PB14 MISO, PB15 MOSI y un GPIO como CS) con un 100 nF junto al módulo.', 'En CubeMX activa FATFS en modo “User-defined” y escribe las funciones de user_diskio.c (inicializar, leer y escribir sectores por SPI siguiendo el protocolo SD en modo SPI).', 'Inicializa la tarjeta a menos de 400 kHz y sube la velocidad del SPI después.', 'Monta, crea un archivo, escribe una línea y ciérralo.'],
          checks: ['El PC lee el archivo creado por el STM32', 'Sé por qué la inicialización debe hacerse a baja velocidad'],
          code: C`FATFS fs; FIL f; UINT escritos; char linea[64];
RTC_TimeTypeDef t; RTC_DateTypeDef d;

HAL_RTC_GetTime(&hrtc, &t, RTC_FORMAT_BIN);
HAL_RTC_GetDate(&hrtc, &d, RTC_FORMAT_BIN);   // obligatorio tras GetTime

if (f_mount(&fs, "", 1) == FR_OK &&
    f_open(&f, "datos.csv", FA_OPEN_APPEND | FA_WRITE) == FR_OK) {
  int n = snprintf(linea, sizeof linea, "%02u:%02u:%02u,%ld,%lu\r\n",
                   t.Hours, t.Minutes, t.Seconds, temp_c100, pres_pa);
  f_write(&f, linea, n, &escritos);
  f_close(&f);
}` },
        { title: 'Fase 4 · Registrador robusto', steps: ['Guarda una línea cada 10 s con fecha, hora, temperatura, humedad y presión.', 'Crea un archivo nuevo por día (AAAAMMDD.CSV).', 'Haz f_sync tras cada escritura y prueba a quitar la alimentación en mitad del registro.', 'Añade un LED de estado y un pulsador para cerrar el archivo antes de sacar la tarjeta.', 'Detecta la tarjeta ausente y reintenta sin colgarse.'],
          checks: ['Tras 24 h tengo 8640 líneas (± 2)', 'Después de 5 cortes de alimentación el archivo se abre sin errores en el PC', 'Sacar y meter la tarjeta no cuelga el programa'] }
      ],
      extra: ['Mide el consumo y duerme entre muestras para funcionar con pilas.', 'Representa los datos con un script de Python y busca el ciclo diario de presión.']
    },
    st_can: {
      intro: 'Monta tu propio bus CAN de banco con dos nodos STM32 y un puente serie–CAN que habla el protocolo SLCAN, compatible con programas de PC para ver y enviar tramas. El bus que usan coches, maquinaria y robots industriales.',
      level: 4, hours: 16,
      skills: ['Bus CAN físico: transceptores y terminación', 'Configurar bxCAN: tiempos de bit y filtros', 'Interrupciones de recepción', 'Protocolo ASCII sobre UART', 'Diagnosticar un bus con el osciloscopio'],
      bom: ['Dos placas con CAN: Nucleo-F446RE (bxCAN) o Nucleo-G431RB (FDCAN). La F401 y la F411 no tienen CAN', 'Dos módulos transceptores SN65HVD230 (3,3 V)', 'Par trenzado de 1–2 m', 'Dos resistencias de 120 Ω (si los módulos no las llevan ya)', 'Potenciómetro y pulsador para el nodo sensor', 'Osciloscopio'],
      phases: [
        { title: 'Fase 1 · El bus físico', steps: ['Conecta cada STM32 a su transceptor: CAN1_TX (PB9) a D/TXD y CAN1_RX (PB8) a R/RXD, alimentación de 3,3 V y masa.', 'Une CANH con CANH y CANL con CANL con el par trenzado y une también las masas.', 'Con todo apagado mide la resistencia entre CANH y CANL: debe ser unos 60 Ω (dos terminaciones de 120 Ω en paralelo).', 'Si mides 40 Ω, hay una terminación de más; si mides 120 Ω, falta una.'],
          checks: ['Mido 60 Ω ± 5 Ω entre CANH y CANL con el bus apagado', 'Conozco el papel de cada terminación'] },
        { title: 'Fase 2 · Primer mensaje', steps: ['Configura CAN1 a 500 kbit/s: con PCLK1 = 45 MHz, preescalador 5, BS1 = 15 tq, BS2 = 2 tq (18 tq por bit).', 'Configura un filtro que acepte todo y activa la notificación de FIFO0.', 'El nodo A envía cada 100 ms la ID 0x123 con el valor del potenciómetro; el nodo B la recibe y lo imprime.', 'Mira la trama en el osciloscopio entre CANH y CANL y mide la duración de un bit.'],
          checks: ['El nodo B recibe 10 mensajes por segundo sin errores', 'Mido 2 µs por bit en el osciloscopio', 'Si desconecto el nodo B, el A deja de recibir el ACK y lo veo en los contadores de error'],
          code: C`CAN_FilterTypeDef fil = {0};
fil.FilterBank = 0;
fil.FilterMode = CAN_FILTERMODE_IDMASK;
fil.FilterScale = CAN_FILTERSCALE_32BIT;      // máscara 0: acepta todo
fil.FilterFIFOAssignment = CAN_RX_FIFO0;
fil.FilterActivation = ENABLE;
fil.SlaveStartFilterBank = 14;
HAL_CAN_ConfigFilter(&hcan1, &fil);
HAL_CAN_Start(&hcan1);
HAL_CAN_ActivateNotification(&hcan1, CAN_IT_RX_FIFO0_MSG_PENDING);

void HAL_CAN_RxFifo0MsgPendingCallback(CAN_HandleTypeDef *h) {
  CAN_RxHeaderTypeDef rh; uint8_t dat[8];
  if (HAL_CAN_GetRxMessage(h, CAN_RX_FIFO0, &rh, dat) == HAL_OK) {
    /* guarda rh.StdId, rh.DLC y dat en una cola */
  }
}` },
        { title: 'Fase 3 · Puente SLCAN', steps: ['En el nodo puente, recibe comandos ASCII por la UART del ST-LINK (por ejemplo a 921600 baudios): “O” abre el canal, “C” lo cierra, “S6” fija 500 kbit/s y “t1232ABCD” envía la ID 0x123 con 2 bytes.', 'Cada trama recibida del bus se envía al PC como “tIIILDD…\\r”.', 'Usa colas circulares en los dos sentidos para no perder tramas si el PC va lento.', 'Prueba con un programa compatible con SLCAN (por ejemplo, python-can o SavvyCAN).'],
          checks: ['El programa del PC muestra las tramas del nodo sensor en tiempo real', 'Puedo enviar una trama desde el PC y el otro nodo la recibe', 'Con 2000 tramas por segundo no se pierde ninguna (contador de pérdidas a 0)'] },
        { title: 'Fase 4 · Filtros y robustez', steps: ['Configura filtros por hardware para que el nodo B solo acepte las ID 0x100–0x10F.', 'Provoca errores (desconecta CANL un instante) y observa cómo el controlador pasa a error pasivo y bus-off.', 'Activa la recuperación automática de bus-off y compruébala.', 'Documenta tu protocolo: qué ID usa cada mensaje y qué significa cada byte.'],
          checks: ['El nodo B ignora mensajes fuera de su rango sin usar la CPU', 'Tras un bus-off, el nodo vuelve a comunicar solo', 'Tengo una tabla escrita con las ID y su contenido'] }
      ],
      extra: ['OBD-II: el conector de diagnóstico de muchos coches europeos posteriores a 2008 usa CAN a 500 kbit/s. Si lo pruebas, hazlo con el coche parado, en modo de solo escucha (CAN_MODE_SILENT) y con un fusible en la alimentación. Enviar tramas al bus de un vehículo puede alterar sus centralitas: no lo hagas sin saber exactamente qué haces, y nunca en marcha.', 'Pasa a CAN FD con una G4 y compara la velocidad de la fase de datos.']
    },

    st_tft: {
      intro: 'Una interfaz gráfica de verdad: pantalla TFT a color por SPI con DMA, menú navegable con un encoder y varias tareas de FreeRTOS que se reparten el trabajo. La base de cualquier aparato con pantalla.',
      level: 4, hours: 18,
      skills: ['SPI con DMA a decenas de MHz', 'Dibujar por franjas cuando no cabe un framebuffer', 'Tareas, colas y semáforos de CMSIS-RTOS v2', 'Arquitectura de menús', 'Medir fotogramas por segundo'],
      bom: ['Black Pill F411 (128 KB de RAM) o Nucleo-F411RE/F446RE', 'Pantalla TFT SPI: ST7789 de 240×240 o ILI9341 de 320×240', 'Encoder rotativo con pulsador', 'Un sensor cualquiera del curso (BME280, potenciómetro…) para tener datos que mostrar', 'Cables cortos (menos de 10 cm: a 25–50 MHz los cables largos dan problemas)'],
      phases: [
        { title: 'Fase 1 · La pantalla responde', steps: ['Conecta SCK, MOSI, CS, DC (dato/comando), RST y la retroiluminación. SPI1 en modo solo transmisión, 8 bits, CPOL/CPHA según la hoja de datos de tu controlador.', 'Escribe la secuencia de inicialización (reset, salir de sleep, formato de color RGB565, encender pantalla).', 'Rellena la pantalla de un color enviando píxeles uno a uno y mide cuánto tarda.', 'Empieza con el SPI a ÷8 y sube mientras la imagen sea estable.'],
          checks: ['La pantalla se llena de rojo, verde y azul', 'He medido el tiempo de un relleno completo sin DMA'] },
        { title: 'Fase 2 · DMA por franjas', steps: ['Un framebuffer completo de 320×240 a 16 bits son 150 KB: no cabe en la RAM de la F411. Dibuja en franjas de 20 líneas.', 'Envía cada franja con HAL_SPI_Transmit_DMA y protege el SPI con un semáforo que se libera en el callback.', 'Mientras el DMA envía una franja, la CPU dibuja la siguiente en un segundo búfer (doble búfer).', 'Ojo con el orden de bytes: la pantalla espera RGB565 con el byte alto primero; usa __REV16 o un SPI de 16 bits.'],
          checks: ['Un relleno completo es al menos 4 veces más rápido que sin DMA', 'Los colores salen correctos (sin rojo y azul intercambiados por el orden de bytes)'],
          code: C`static uint16_t franja[2][240 * 20];      // dos búferes de 20 líneas
osSemaphoreId_t spi_libre;                 // osSemaphoreNew(1, 1, NULL)

void lcd_enviar(const uint16_t *p, uint32_t npix) {
  osSemaphoreAcquire(spi_libre, osWaitForever);
  HAL_GPIO_WritePin(LCD_DC_GPIO_Port, LCD_DC_Pin, GPIO_PIN_SET);   // datos
  HAL_GPIO_WritePin(LCD_CS_GPIO_Port, LCD_CS_Pin, GPIO_PIN_RESET);
  HAL_SPI_Transmit_DMA(&hspi1, (uint8_t *)p, npix * 2);
}
void HAL_SPI_TxCpltCallback(SPI_HandleTypeDef *h) {
  HAL_GPIO_WritePin(LCD_CS_GPIO_Port, LCD_CS_Pin, GPIO_PIN_SET);
  osSemaphoreRelease(spi_libre);           // permitido desde una ISR
}` },
        { title: 'Fase 3 · Tareas', steps: ['Activa FreeRTOS (CMSIS_V2) y cambia la base de tiempo de la HAL a un temporizador (TIM11, por ejemplo).', 'Crea tres tareas: Entrada (lee el encoder cada 10 ms y envía eventos a una cola), Datos (lee el sensor cada 500 ms) y UI (espera eventos de la cola y redibuja).', 'Asigna prioridades: Entrada la más alta, UI la más baja.', 'Mide la marca de agua de la pila de cada tarea y ajusta los tamaños.'],
          checks: ['El encoder responde aunque la UI esté redibujando', 'Ninguna tarea tiene menos de 64 palabras libres en su pila', 'He comprobado que la prioridad de la interrupción del DMA es 5 o mayor'] },
        { title: 'Fase 4 · Menú', steps: ['Diseña el menú como una tabla de estructuras: texto, tipo (submenú, valor, acción) y puntero al siguiente nivel.', 'Redibuja solo lo que cambia (la línea seleccionada y la anterior).', 'Añade una pantalla de gráfica que dibuje el histórico del sensor.', 'Muestra los fotogramas por segundo en una esquina.'],
          checks: ['Puedo navegar tres niveles de menú y volver atrás', 'Cambiar un valor en el menú tiene efecto inmediato', 'La pantalla de gráfica se actualiza a más de 15 fps'] }
      ],
      extra: ['Integra LVGL, una biblioteca gráfica profesional, con tus funciones de envío por DMA.', 'Añade una pantalla táctil (XPT2046 por SPI) compartiendo el bus con un mutex.']
    },
    st_synth: {
      intro: 'Un sintetizador polifónico que suena por un DAC de audio I²S. Recibe notas MIDI, mezcla ocho voces con envolventes y llena un búfer doble por DMA desde una tarea de FreeRTOS. Audio digital de verdad, con plazos estrictos.',
      level: 4, hours: 20,
      skills: ['I²S con DMA circular y PLLI2S', 'Síntesis DDS con acumulador de fase', 'Envolventes ADSR', 'Notificaciones de tarea desde la ISR', 'MIDI por UART a 31 250 baudios'],
      bom: ['Black Pill F411 (o Nucleo-F411RE/F446RE)', 'Módulo DAC I²S PCM5102A', 'Auriculares o altavoz amplificado (empieza siempre con el volumen al mínimo)', 'Para MIDI: conector DIN de 5 patas, optoacoplador 6N138, diodo 1N4148 y resistencias de 220 Ω y 470 Ω (o un teclado USB-MIDI con un adaptador)', 'Un teclado o controlador MIDI'],
      phases: [
        { title: 'Fase 1 · Un tono por I²S', steps: ['Activa I2S2 en modo Master Transmit, Philips, 16 bits, 48 kHz, sin MCLK (el PCM5102A genera su reloj interno si su pin SCK va a masa).', 'Usa el PLLI2S para que la frecuencia de muestreo real quede lo más cerca posible de 48 kHz y anota el error que indica CubeMX.', 'Conecta BCK, LRCK y DIN del módulo y alimenta a 3,3 V.', 'Envía un seno de 440 Hz en bucle con DMA circular.'],
          checks: ['Se oye un La limpio (compara con un afinador del móvil: 440 Hz ± 1 Hz)', 'He anotado la frecuencia de muestreo real y su error'] },
        { title: 'Fase 2 · Búfer doble y tarea de audio', steps: ['Búfer de 2 × 256 tramas estéreo. En los callbacks de mitad y completo, avisa a la tarea de audio con osThreadFlagsSet.', 'La tarea de audio, con la prioridad más alta, rellena la mitad que acaba de quedar libre.', 'Mide con un pin cuánto tarda en rellenar: debe ser mucho menor de 256 / 48 000 s ≈ 5,3 ms.', 'Provoca un retraso a propósito y escucha el chasquido de un desbordamiento.'],
          checks: ['El audio suena continuo sin chasquidos durante 10 minutos', 'El relleno de una mitad tarda menos del 50 % de su plazo'],
          code: C`#define TRAMAS 256
static int16_t audio[2 * TRAMAS * 2];      // estéreo intercalado L, R
extern osThreadId_t tarea_audio;

void HAL_I2S_TxHalfCpltCallback(I2S_HandleTypeDef *h) { osThreadFlagsSet(tarea_audio, 1); }
void HAL_I2S_TxCpltCallback(I2S_HandleTypeDef *h)     { osThreadFlagsSet(tarea_audio, 2); }

void TareaAudio(void *arg) {
  HAL_I2S_Transmit_DMA(&hi2s2, (uint16_t *)audio, 2 * TRAMAS * 2);
  for (;;) {
    uint32_t f = osThreadFlagsWait(3, osFlagsWaitAny, osWaitForever);
    int16_t *dst = (f & 1) ? &audio[0] : &audio[TRAMAS * 2];
    rellenar(dst, TRAMAS);                 // mezcla las voces activas
  }
}` },
        { title: 'Fase 3 · Voces', steps: ['Cada voz es un acumulador de fase de 32 bits: paso = f × 2³² / 48 000. El desbordamiento natural del entero da la vuelta al ciclo.', 'Genera sierra, cuadrada y seno (tabla de 256 valores) a partir de la fase.', 'Añade una envolvente ADSR por voz.', 'Mezcla 8 voces y escala para no saturar (o aplica un limitador suave).'],
          checks: ['Un acorde de tres notas suena sin distorsión', 'El ataque y la liberación se oyen claramente distintos al cambiar sus tiempos', 'Ocho voces a la vez caben en el plazo de cálculo'] },
        { title: 'Fase 4 · MIDI', steps: ['Monta la entrada MIDI con el 6N138 según la especificación MIDI (el optoacoplador aísla tu circuito del instrumento).', 'Recibe por UART a 31 250 baudios con DMA e IDLE o por interrupción, y pasa los bytes a una tarea MIDI por una cola.', 'Interpreta Note On, Note Off (y Note On con velocidad 0) y asigna voces libres.', 'Añade un control (rueda o potenciómetro) para el corte de un filtro paso bajo de un polo.'],
          checks: ['Tocar en el teclado suena con una latencia que no se nota (menos de 10 ms)', 'Mantener 8 notas y pulsar una novena roba la voz más antigua sin chasquidos', 'El filtro cambia el timbre al mover el control'] }
      ],
      extra: ['Añade un retardo (eco) con un búfer circular en RAM.', 'Haz que el STM32 sea un dispositivo USB-MIDI con el middleware USB.']
    },
    st_solder: {
      intro: 'Una estación de soldadura para puntas T12 con control de temperatura: amplificas el termopar de la punta, mides entre pulsos de calor, regulas con un PID y vigilas que nada se descontrole. Una herramienta de taller que usarás cada día.',
      level: 4, hours: 25,
      skills: ['Amplificar un termopar con un operacional', 'Medir sincronizado con la potencia', 'PID térmico', 'Seguridad funcional en firmware', 'Diseño de una fuente de 24 V para cargas de 70 W'],
      bom: ['Black Pill F411 o Nucleo', 'Punta T12 con mango compatible y su conector', 'Fuente de 24 V y al menos 3 A, con fusible de 4 A', 'MOSFET de canal P o N adecuado (por ejemplo, un AO4407 en lado alto con driver, o un N de nivel lógico en lado bajo según tu esquema) y diodo de protección', 'Operacional de precisión rail-to-rail a 3,3 V (por ejemplo OPA333 o MCP6V01) con sus resistencias de ganancia', 'Regulador de 24 V a 3,3 V (buck pequeño)', 'Pantalla OLED SSD1306 y encoder', 'Interruptor de vibración (SW-200D) para el modo reposo', 'Termómetro de termopar de referencia para calibrar'],
      phases: [
        { title: 'Fase 1 · Seguridad y potencia', steps: ['Lee entera esta fase antes de montar. La punta llega a 450 °C y quema o prende fuego en segundos: soporte metálico, superficie ignífuga y nunca la dejes encendida sin vigilancia.', 'Monta la etapa de potencia con el fusible en la entrada de 24 V y prueba primero con una resistencia de potencia en lugar de la punta.', 'Comprueba que el MOSFET no se calienta con un PWM del 50 % a la carga de prueba.', 'Pon el pin de control con pull-down (o pull-up según el tipo de MOSFET) para que al reiniciarse el STM32 el calentador quede APAGADO.'],
          checks: ['Con el STM32 en reset o sin programar, el calentador está apagado (medido)', 'El MOSFET no pasa de 50 °C tras 5 minutos al 50 %', 'El fusible está en la entrada y es del valor correcto'] },
        { title: 'Fase 2 · Medir la punta', steps: ['En las puntas T12 el termopar va en serie con el calentador: solo puedes medirlo con el calentador apagado.', 'Diseña un amplificador no inversor con una ganancia de unos pocos cientos para llevar los milivoltios del termopar al rango del ADC.', 'Añade un filtro RC y protección para que los 24 V del pulso no lleguen al ADC.', 'Con el calentador apagado, mide el ADC a temperatura ambiente y a varias temperaturas de referencia para sacar tu curva de calibración.'],
          checks: ['La entrada del ADC nunca supera 3,3 V, ni siquiera con el calentador encendido (medido con osciloscopio)', 'Tengo al menos 4 puntos de calibración entre 150 y 400 °C'] },
        { title: 'Fase 3 · Ciclo de control', steps: ['Usa un ciclo de 100 ms: hasta 90 ms de calor y una ventana final con el calentador apagado.', 'Espera unos milisegundos a que se estabilice el amplificador y mide al final de la ventana.', 'El PID decide cuántos ms de calor habrá en el siguiente ciclo.', 'Muestra la temperatura y la consigna en la OLED y cambia la consigna con el encoder.'],
          checks: ['De 25 a 320 °C en menos de 20 s', 'En reposo a 320 °C la temperatura varía menos de ±3 °C', 'Al soldar una pista gruesa, la temperatura se recupera en menos de 3 s'],
          code: C`volatile uint32_t calor_ms;          // 0..90, lo fija el PID
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *h) {   // TIM4 a 1 kHz
  static uint32_t t;
  if (h->Instance != TIM4) return;
  if (++t >= 100) t = 0;
  calentador(t < calor_ms);          // como máximo 90 ms de 100
  if (t == 96) HAL_ADC_Start_IT(&hadc1);   // mide con el calentador apagado
}` },
        { title: 'Fase 4 · Vigilancia', steps: ['Protección de fuga térmica: si con potencia máxima la temperatura no sube al menos unos grados en un tiempo dado, apaga y muestra error (punta suelta o sensor roto).', 'Si la lectura sale del rango posible (circuito abierto, valor máximo del ADC), apaga.', 'Activa el IWDG con unos 500 ms: si el firmware se cuelga, el reset deja el calentador apagado.', 'Modo reposo: si el interruptor de vibración no se mueve en 5 minutos, baja a 150 °C; a los 20 minutos, apaga.'],
          checks: ['Al desconectar la punta en caliente se apaga y avisa en menos de 1 s', 'Un bucle infinito provocado a propósito acaba en reset con el calentador apagado', 'El modo reposo baja la temperatura a los 5 minutos de no mover el mango'] }
      ],
      extra: ['Guarda en Flash la última consigna y la calibración de cada punta.', 'Diseña una PCB y una caja para que sea una herramienta definitiva.']
    },
    st_lowpower: {
      intro: 'Un nodo sensor que funciona meses con pilas: despierta con el RTC, mide, envía o guarda y vuelve a dormir. Medirás microamperios y descubrirás que cada pin, LED y regulador cuenta.',
      level: 4, hours: 14,
      skills: ['Modos Sleep, Stop y Standby', 'Despertar con la alarma del RTC', 'Medir corrientes muy pequeñas', 'Reducir consumo de pines y periféricos', 'Calcular la autonomía con un ciclo de trabajo'],
      bom: ['Nucleo-L476RG o Nucleo-L432KC (familia de bajo consumo con puente IDD para medir), o una Black Pill quitando el LED de encendido', 'Multímetro con escala de µA (o un medidor como el Nordic PPK2 o el ST X-NUCLEO-LPM01A)', 'Sensor BME280', 'Portapilas de 2 × AA o una LiFePO4 de 3,2 V (sin regulador si el chip y el sensor admiten la tensión)', 'Pulsador para el pin WKUP'],
      phases: [
        { title: 'Fase 1 · Medir la línea base', steps: ['Quita el puente IDD de la Nucleo y pon el amperímetro en su lugar (o mide en serie con la alimentación de tu placa).', 'Mide el consumo con el programa en bucle a la frecuencia por defecto.', 'Baja la frecuencia del reloj y mide otra vez.', 'Pon todos los pines sin usar en modo analógico y apaga los relojes de periféricos que no usas; vuelve a medir.'],
          checks: ['Tengo una tabla con el consumo en marcha a dos frecuencias', 'He medido el efecto de poner los pines libres en analógico'] },
        { title: 'Fase 2 · Stop con despertador', steps: ['Configura el RTC con el LSE y el temporizador de despertar a 10 s.', 'Suspende el SysTick, entra en Stop y, al despertar, vuelve a configurar el reloj del sistema.', 'Activa la depuración en Stop solo mientras desarrollas (y desactívala para medir: aumenta el consumo).', 'Mide el consumo durante el sueño.'],
          checks: ['El chip despierta cada 10 s ± 0,1 s', 'Tras despertar la UART funciona a la velocidad correcta', 'He medido el consumo en Stop y es al menos cien veces menor que en marcha'],
          code: C`/* LSE / 16 = 2048 Hz -> 10 s = 20480 cuentas */
HAL_RTCEx_SetWakeUpTimer_IT(&hrtc, 10 * 2048 - 1, RTC_WAKEUPCLOCK_RTCCLK_DIV16);
HAL_SuspendTick();
HAL_PWR_EnterSTOPMode(PWR_LOWPOWERREGULATOR_ON, PWR_STOPENTRY_WFI);
/* ... aquí sigue al despertar ... */
SystemClock_Config();          // el reloj vuelve al oscilador interno
HAL_ResumeTick();
HAL_RTCEx_DeactivateWakeUpTimer(&hrtc);   // en L4 puedes usar Stop 2:
                                          // HAL_PWREx_EnterSTOP2Mode(PWR_STOPENTRY_WFI)` },
        { title: 'Fase 3 · Medir y dormir', steps: ['Pon el BME280 en modo forzado: mide una vez y vuelve a dormir solo.', 'Despierta, mide, guarda el dato en un registro de respaldo o en un búfer, y duerme.', 'Mide con el osciloscopio y una resistencia shunt de 10 Ω la forma del pulso de consumo durante el despertar.', 'Calcula la corriente media: (I_activo × t_activo + I_sueño × t_sueño) / T.'],
          checks: ['El tiempo despierto es menor de 20 ms por ciclo', 'He calculado la corriente media y la autonomía con mis pilas'] },
        { title: 'Fase 4 · Standby', steps: ['Prueba Standby con despertar por RTC y por el pin WKUP.', 'Comprueba con la bandera de Standby (PWR) si el arranque viene de un reset normal o de Standby.', 'Guarda el contador de despertares en un registro de respaldo del RTC, que sobrevive al Standby.', 'Compara consumo y tiempo de despertar de Stop y Standby y elige el modo para tu nodo.'],
          checks: ['El programa distingue un arranque en frío de un despertar de Standby', 'El contador de despertares sigue aumentando tras 10 ciclos de Standby', 'He elegido un modo y justificado la elección con números'] }
      ],
      extra: ['Envía los datos por un módulo de radio LoRa o nRF24 que también duerma.', 'Usa el modo Shutdown de la L4 y compara con Standby.']
    },
    st_boot: {
      intro: 'Tu propio cargador de arranque: vive en los primeros sectores de la Flash, recibe el firmware nuevo por la UART desde un script de Python, lo graba, comprueba su CRC y salta a la aplicación. Así se actualizan los productos en el campo.',
      level: 5, hours: 30,
      skills: ['Particionar la Flash', 'Borrar y programar sectores', 'Mover la tabla de vectores (VTOR)', 'Saltar de un programa a otro con seguridad', 'Diseñar un protocolo con verificación', 'CRC por hardware'],
      bom: ['Black Pill F411 o Nucleo-F411RE', 'Adaptador USB-serie de 3,3 V (o el ST-LINK de la Nucleo)', 'Pulsador para forzar el modo cargador', 'PC con Python y pyserial'],
      phases: [
        { title: 'Fase 1 · El mapa', steps: ['Decide las particiones de la F411: sectores 0–1 (0x08000000, 32 KB) para el cargador, sectores 2–3 (32 KB) para configuración y sectores 4–7 (desde 0x08010000) para la aplicación.', 'En la aplicación, cambia el script del enlazador: FLASH ORIGIN = 0x08010000 y LENGTH = 448K.', 'En system_stm32f4xx.c de la aplicación, activa USER_VECT_TAB_ADDRESS y pon VECT_TAB_OFFSET a 0x10000.', 'Graba la aplicación con CubeProgrammer en 0x08010000 y comprueba con el depurador que su tabla de vectores está ahí.'],
          checks: ['El .map de la aplicación empieza en 0x08010000', 'SCB->VTOR vale 0x08010000 al entrar en el main de la aplicación'] },
        { title: 'Fase 2 · Saltar', steps: ['El cargador comprueba que la primera palabra de la aplicación sea un puntero de pila válido (dentro de la SRAM).', 'Desinicializa relojes y periféricos, para el SysTick, desactiva y limpia todas las interrupciones del NVIC.', 'Fija VTOR, carga el MSP y salta a la dirección de reset de la aplicación.', 'Si la Flash de la aplicación está borrada (0xFFFFFFFF), el cargador se queda esperando firmware.'],
          checks: ['Con la aplicación grabada, el cargador salta a ella en menos de 100 ms', 'Con la zona de aplicación borrada, el cargador no salta y lo indica con un LED', 'La aplicación funciona igual (HAL_Delay incluido) que cuando se graba sola'],
          code: C`#define APP 0x08010000UL
typedef void (*fn_t)(void);

void saltar_a_app(void) {
  uint32_t sp = *(volatile uint32_t *)APP;
  uint32_t rv = *(volatile uint32_t *)(APP + 4);
  if ((sp & 0xFFF00000UL) != 0x20000000UL) return;   // no hay aplicación
  HAL_RCC_DeInit();
  HAL_DeInit();
  SysTick->CTRL = 0;
  __disable_irq();
  for (int i = 0; i < 8; i++) { NVIC->ICER[i] = 0xFFFFFFFF; NVIC->ICPR[i] = 0xFFFFFFFF; }
  SCB->VTOR = APP;
  __set_MSP(sp);
  __enable_irq();          // la aplicación de CubeMX no lo hace por sí sola
  ((fn_t)rv)();
}` },
        { title: 'Fase 3 · Protocolo', steps: ['Diseña un protocolo con tramas: cabecera, comando, longitud, datos y CRC. Comandos: INFO, BORRAR, ESCRIBIR (bloques de 256 bytes con su dirección), VERIFICAR y ARRANCAR.', 'Cada trama se responde con ACK o NACK; el PC reintenta hasta 3 veces.', 'Para borrar, usa HAL_FLASHEx_Erase por sectores (4 a 7) y para escribir HAL_FLASH_Program por palabras, con HAL_FLASH_Unlock y Lock.', 'Escribe el script de Python que lee el .bin y lo envía.'],
          checks: ['Envío un .bin de la aplicación y arranca tras la carga', 'Si desconecto el cable a mitad, el cargador lo detecta y sigue esperando', 'Un bloque con CRC erróneo se rechaza y se reenvía'] },
        { title: 'Fase 4 · Verificación', steps: ['Calcula el CRC de toda la imagen con el periférico CRC de la F4. Atención: usa el polinomio 0x04C11DB7 sobre palabras de 32 bits, sin reflejar y sin XOR final, así que no coincide con zlib.crc32 de Python: escribe en Python la misma variante.', 'Guarda tamaño y CRC de la imagen en el sector de configuración solo cuando la imagen completa se haya verificado.', 'Al arrancar, el cargador recalcula el CRC y solo salta si coincide.', 'Prueba a corromper un byte de la aplicación con CubeProgrammer.'],
          checks: ['El CRC calculado por el STM32 y por Python coinciden', 'Con un byte corrompido el cargador no salta a la aplicación', 'Un corte de alimentación durante la carga nunca deja el equipo sin cargador'] },
        { title: 'Fase 5 · Entrar desde la aplicación', steps: ['La aplicación, al recibir un comando “actualizar”, escribe un número mágico en un registro de respaldo del RTC y llama a NVIC_SystemReset().', 'El cargador lee ese número al arrancar, lo borra y se queda en modo carga.', 'Añade un número de versión en una posición fija de la imagen y muéstralo con el comando INFO.'],
          checks: ['Puedo actualizar el firmware sin tocar ningún botón', 'INFO muestra la versión de la aplicación instalada'] }
      ],
      extra: ['Protege el cargador con la protección de escritura de sus sectores (option bytes).', 'Añade firma digital de la imagen (por ejemplo, con una biblioteca de criptografía ligera) para aceptar solo firmware tuyo.']
    },
    st_final: {
      intro: 'El proyecto final: diseñas y fabricas tu propia placa con un STM32 y la conviertes en un robot autoequilibrado de dos ruedas. Integra todo: diseño de PCB, arranque de la placa, relojes, IMU por SPI con DMA, PWM, encoders, control en cascada, FreeRTOS, watchdog y tu propio cargador de arranque.',
      level: 5, hours: 60,
      skills: ['Diseñar una placa con un STM32 desde cero', 'Puesta en marcha (bring-up) de hardware nuevo', 'Fusión de sensores con filtro complementario', 'Control en cascada en tiempo real', 'Arquitectura de firmware con capas y RTOS', 'Seguridad con baterías de litio'],
      bom: ['KiCad y un fabricante de PCB', 'STM32F411CEU6 o STM32G431CBU6 (QFN de 48 patas: hace falta soldador fino, flux y, si puedes, aire caliente)', 'Regulador de 3,3 V de bajo dropout (por ejemplo AP2112K-3.3), cristal con sus condensadores, condensadores de desacoplo y de VCAP según la hoja de datos', 'Conector SWD de 2×5 a 1,27 mm (o 4 pines a 2,54 mm), pulsador de reset y de BOOT0', 'USB-C con protección ESD (USBLC6-2SC6)', 'IMU de 6 ejes por SPI (ICM-42688-P, LSM6DSO o similar)', 'Driver TB6612FNG', 'Dos motorreductores con encoder y ruedas de 65 mm', 'Batería LiPo 2S (7,4 V) con placa de protección, fusible e interruptor general', 'Divisor resistivo para medir la batería', 'Chasis (impreso en 3D o de metacrilato)'],
      phases: [
        { title: 'Fase 1 · Especificación y esquema', steps: ['Escribe una especificación de una página: tensiones, corrientes de motores, sensores, conectores, tamaño y cómo se programa.', 'Asigna los pines en CubeMX ANTES de dibujar: PWM, encoders, SPI de la IMU, UART de telemetría, ADC de batería, SWD. Exporta la lista de pines.', 'Dibuja el esquema en KiCad: 100 nF en cada VDD, 4,7 µF general, filtro de VDDA, VCAP con el valor de la hoja de datos, BOOT0 con 10 kΩ a masa y pulsador a 3,3 V, NRST con 100 nF y pulsador.', 'Calcula los condensadores del cristal con C = 2 × (CL − Cparásita).', 'Pide a alguien (o a ti mismo un día después) una revisión del esquema con una lista de comprobación.'],
          checks: ['El esquema pasa el ERC sin errores', 'Cada pin del esquema coincide con la asignación de CubeMX', 'He calculado los condensadores del cristal y el divisor de batería'] },
        { title: 'Fase 2 · PCB', steps: ['Placa de 2 capas con plano de masa continuo en la cara inferior.', 'Desacoplo pegado a cada par de patas; cristal muy cerca del chip y rodeado de masa, sin pistas por debajo.', 'Separa la zona de potencia de motores de la zona del micro y la IMU; la IMU lejos de los motores y en el eje de giro si puedes.', 'Pistas de motor y batería de al menos 1 mm. Pasa el DRC con las reglas del fabricante y pide las placas.'],
          checks: ['El DRC pasa sin errores con las reglas del fabricante', 'He revisado la huella del STM32 con la hoja de datos (pata 1 y almohadilla central)', 'Tengo los Gerbers revisados en un visor'] },
        { title: 'Fase 3 · Puesta en marcha', steps: ['Suelda primero solo la alimentación. Con fuente limitada a 100 mA, mide 3,3 V.', 'Suelda el STM32, el cristal y el desacoplo. Conecta el ST-LINK y lee el Device ID con CubeProgrammer.', 'Graba un parpadeo; después saca el reloj por MCO1 y comprueba el cristal y el PLL.', 'Prueba cada periférico por separado con un programa mínimo: UART, SPI con la IMU (lee su registro WHO_AM_I), PWM, encoders y ADC de batería.'],
          checks: ['El consumo en vacío de la placa recién montada es el esperado (sin cortocircuitos)', 'El ST-LINK conecta y el chip ejecuta código', 'Cada periférico ha pasado su prueba aislada y lo he apuntado en una hoja de puesta en marcha'] },
        { title: 'Fase 4 · Firmware de equilibrio', steps: ['Arquitectura en capas: drivers (IMU, motores, encoders), servicios (filtro, control, telemetría) y aplicación (estados: ARMADO, EQUILIBRANDO, CAÍDO, BATERÍA BAJA).', 'Tarea de control a 500 Hz disparada por la interrupción de dato listo de la IMU, con lectura por SPI con DMA.', 'Filtro complementario para el ángulo, lazo PID de ángulo y lazo externo de velocidad con los encoders.', 'Telemetría por la UART a 100 Hz para ajustar con gráficas.'],
          checks: ['El robot se mantiene en pie más de 60 s sin ayuda', 'Al empujarlo suavemente se recupera sin caerse', 'La tarea de control cumple su periodo con un jitter menor de 100 µs (medido con un pin)'],
          code: C`/* ángulo con filtro complementario, cada 2 ms */
static float angulo;
void imu_paso(float gyro_dps, float ax, float az) {
  float ang_acc = atan2f(ax, az) * 57.29578f;          // grados
  angulo = 0.98f * (angulo + gyro_dps * 0.002f) + 0.02f * ang_acc;
}` },
        { title: 'Fase 5 · Producto', steps: ['Seguridad: corta los motores si el ángulo supera 45°, si la batería baja de 6,6 V (3,3 V por celda) o si el watchdog vence.', 'Nunca cargues la LiPo sin vigilancia ni con un cargador que no sea de balance; si se hincha, retírala.', 'Integra el cargador de arranque del proyecto anterior para actualizar por USB o UART.', 'Escribe la documentación: esquema, lista de materiales, cómo se programa, protocolo de telemetría y lecciones aprendidas.', 'Versiona hardware y firmware en git con etiquetas.'],
          checks: ['Las tres protecciones (ángulo, batería y watchdog) están probadas una a una', 'Actualizo el firmware sin el ST-LINK', 'El repositorio tiene esquema, PCB, firmware y un README con instrucciones'] }
      ],
      extra: ['Control remoto por Bluetooth con un módulo HC-05 o un ESP32 como pasarela.', 'Sustituye el filtro complementario por un filtro de Kalman y compara.', 'Haz una segunda revisión de la placa corrigiendo todo lo que apuntaste en la puesta en marcha.']
    }
  });


  /* ======================= LECCIONES ======================= */
  const PRED = { predict: true };
  const M1 = { id: 'st-m1', title: 'ARM Cortex-M y la familia STM32', desc: 'Qué significa «32 bits», los núcleos Cortex-M, cómo leer el nombre de un chip, las placas y el mapa de memoria.', nodes: [
    L('st1', 'Del Arduino al ARM de 32 bits', 'chip', ['st_bits32', 'st_core', 'st_family'], [
      Q('Sumas dos números de 70 000 en una Uno (8 bits) y en un STM32 (32 bits). ¿Qué crees que pasa?', ['La Uno necesita varias instrucciones; el STM32, una', 'Los dos lo hacen en una instrucción', 'La Uno no puede sumar números tan grandes', 'El STM32 necesita más instrucciones que la Uno'], 'La Uno trocea el número en bytes y suma trozo a trozo, arrastrando el acarreo. Vamos a verlo.', { ...PRED, c: 'st_bits32', h: 'Piensa en cuántos bits caben en un registro de cada chip.' }),
      { t: 'explore', text: 'El número se parte en trozos del ancho de la CPU. Cada trozo es una suma.', viz: 'st_width', params: P_WIDTH(8, 250),
        tasks: [{ q: 'instr', min: 4, max: 4, text: 'Con la CPU de 8 bits, elige un número que necesite 4 sumas', done: 'Un número de 32 bits son 4 bytes: ADD y tres ADC (sumas con acarreo).', hint: 'Prueba con 70 000 o más.' },
          { q: 'w32', min: 1, max: 1, text: 'Ahora suma un número de 32 bits en una sola instrucción', done: 'Con registros de 32 bits, el número entero cabe en uno.', hint: 'Cambia el ancho de la CPU.' }] },
      I('Un micro <b>de 32 bits</b> tiene registros y unidad aritmética de 32 bits: opera con números de hasta 4 bytes de una vez. Sus direcciones también son de 32 bits.', { svg: table([['Uno', 'ATmega328P · 8 bits · 16 MHz'], ['', '2 KB de RAM · 32 KB de Flash'], ['STM32F411', '32 bits · 100 MHz · con FPU'], ['', '128 KB de RAM · 512 KB de Flash']], 'Por unos pocos euros'), more: 'Hay más diferencias: DMA (copias de memoria sin la CPU), muchos temporizadores, varias UART, USB… Las irás viendo en esta especialidad. La FPU es la unidad de coma flotante: hace cuentas con decimales por hardware.' }),
      I('<b>Cuidado con int</b>: en la Uno ocupa 16 bits; en un STM32, <b>32</b>. Los tipos de stdint.h miden lo mismo en todas partes.', { code: 'int a = 40000;       // Uno: no cabe · STM32: sí\nuint16_t b = 65535;  // igual en los dos\nb = b + 1;           // da la vuelta: 0' }),
      I('<b>ARM no fabrica chips</b>: diseña núcleos y vende licencias. ST, NXP, Nordic o Raspberry Pi les añaden memoria y periféricos. Tres gamas: <b>Cortex-A</b> (Linux, móviles), <b>Cortex-R</b> (tiempo real crítico) y <b>Cortex-M</b> (microcontroladores).', { svg: SVG_CORE, more: 'Por eso un STM32, un nRF52 o una RP2040 se depuran igual y manejan las interrupciones igual: comparten núcleo. Los Cortex-M solo ejecutan instrucciones Thumb, un juego que mezcla instrucciones de 16 y 32 bits para que el código ocupe poco.' }),
      { t: 'steps', text: '¿Cuántas posiciones de memoria puede señalar un puntero de 32 bits?', steps: ['Cada bit duplica las combinaciones: con n bits hay <b>2ⁿ</b>', '2³² = 2² × 2³⁰', '2¹⁰ = 1024 ≈ mil, así que 2³⁰ ≈ mil millones: 1 G', '2³² = 4 × 2³⁰ = <b>4 GB</b> (4 294 967 296 bytes)'], result: 'Flash, RAM y periféricos se reparten esos 4 GB de direcciones.' },
      Q('¿Qué significa que un microcontrolador sea «de 32 bits»?', ['Que sus registros y su unidad aritmética trabajan con 32 bits de una vez', 'Que tiene 32 patas', 'Que funciona a 32 MHz', 'Que tiene 32 KB de memoria'], 'Una suma de dos números de 32 bits es una sola instrucción.', { c: 'st_bits32', h: 'Piensa en el tamaño de los números con los que opera de una vez.' }),
      Q('¿Quién diseña el núcleo de un STM32?', ['ARM, que lo licencia; ST diseña y fabrica el resto del chip', 'ST, entero', 'Arduino', 'Raspberry Pi'], 'ARM hace el «motor»; ST, el «coche».', { c: 'st_core', h: 'Uno diseña el motor y otro el coche.' }),
      Nm('Un puntero de 32 bits direcciona 2³² bytes. ¿Cuántos GB son?', 4, 'GB', '2³² = 4 × 2³⁰ = 4 GB.', { c: 'st_bits32', h: 'Usa 2³⁰ ≈ mil millones: 2³² = 2² × 2³⁰.' }),
      Q('¿Qué imprime este código en un STM32?', ['4', '260', '250', 'Error de compilación'], 'uint8_t solo llega a 255: 260 da la vuelta a 4 en cualquier arquitectura.', { code: 'uint8_t x = 250;\nx = x + 10;\nprintf("%u", x);', c: 'st_bits32', h: 'Un uint8_t llega a 255 en cualquier chip.' }),
      { t: 'match', q: 'Une cada gama de ARM con su uso.', pairs: [['Cortex-A', 'Móviles y ordenadores con Linux'], ['Cortex-R', 'Tiempo real crítico (discos, frenos)'], ['Cortex-M', 'Microcontroladores']], c: 'st_core', h: 'A de aplicación, R de tiempo real, M de microcontrolador.' },
      Q('En la Uno, int vale como máximo 32 767. ¿Y en un STM32?', ['2 147 483 647: int es de 32 bits en ARM', '32 767, igual', '255', '65 535'], 'El tamaño de int depende de la arquitectura. Para código portable, int16_t, uint32_t…', { c: 'st_bits32', h: 'Mira cuántos bits ocupa int en ARM.' }),
      Q('¿Por qué se usan tanto los STM32 en la industria?', ['Una familia enorme y compatible, herramientas gratuitas y suministro garantizado durante años', 'Porque son los únicos de 32 bits', 'Porque se programan en Arduino', 'Porque no necesitan alimentación'], 'Puedes cambiar de chip dentro de la familia sin reescribirlo todo.', { c: 'st_family', h: 'Piensa en lo que necesita una empresa que fabrica el mismo aparato durante años.' }),
      I('<b>Resumen</b>\n· 32 bits: sumas de 4 bytes en una instrucción y 4 GB de direcciones.\n· int mide 32 bits en ARM: usa uint8_t, uint32_t… para no depender del chip.\n· ARM diseña el núcleo Cortex-M; ST pone memoria y periféricos.')
    ]),
    L('st2', 'Los núcleos Cortex-M', 'chip', ['st_cores', 'st_fpu', 'st_core'], [
      Q('Un Cortex-M0+ (sin unidad de coma flotante) multiplica dos float. ¿Qué crees que pasa?', ['Funciona, pero por software: decenas de instrucciones', 'Error de compilación', 'Una sola instrucción', 'Convierte a enteros y pierde los decimales'], 'El compilador lo convierte en una rutina de software. Compara núcleos.', { ...PRED, c: 'st_fpu', h: 'Sin hardware para algo, el compilador lo hace con instrucciones normales.' }),
      { t: 'explore', text: 'Elige núcleo y operación. ✓ significa que el núcleo lo hace por hardware.', viz: 'st_cores', params: P_CORES(0, 0),
        tasks: [{ q: 'fhw', min: 1, max: 1, text: 'Encuentra un núcleo que multiplique float por hardware', done: 'El M4F (y el M7, y el M33 con FPU): una instrucción.', hint: 'Pon la operación «float ×» y sube de núcleo.' },
          { q: 'dhw', min: 1, max: 1, text: 'Ahora uno que multiplique double por hardware', done: 'Solo el M7 de los H7 y algunos F7 tiene FPU de doble precisión.' },
          { q: 'nodiv', min: 1, max: 1, text: 'Busca el que ni siquiera divide enteros por hardware', done: 'El M0+: lo mínimo, para chips baratos y de bajo consumo.' }] },
      I('La escalera de núcleos:\n<b>M0+</b>: mínimo y barato (F0, G0, L0, C0).\n<b>M3</b>: división por hardware (F1).\n<b>M4F</b>: instrucciones DSP y FPU de precisión simple (F3, F4, G4, L4).\n<b>M7</b>: cachés y dos instrucciones por ciclo (F7, H7).\n<b>M33</b>: un M4 moderno con TrustZone (L5, U5, H5).', { tune: { viz: 'st_cores', params: P_CORES(2, 2) }, more: 'Las instrucciones DSP multiplican y acumulan en un ciclo o hacen dos operaciones de 16 bits a la vez: justo lo que piden los filtros digitales. TrustZone divide el chip en un mundo seguro y otro normal: un fallo en el normal no puede leer las claves del seguro.' }),
      I('La FPU del M4F es de <b>precisión simple</b>: los float van por hardware y los double se emulan. Una constante sin «f» es double y arrastra toda la cuenta.', { code: 'float y = x * 0.5f;  // FPU: 1 instrucción\nfloat z = x * 0.5;   // 0.5 es double: software' }),
      I('Todos los Cortex-M comparten el <b>NVIC</b> (interrupciones), el <b>SysTick</b> (temporizador del núcleo) y la depuración por <b>SWD</b>. Lo que aprendas con un F4 te sirve en cualquier Cortex-M; lo que cambia de marca a marca son los periféricos.', { svg: SVG_CORE }),
      { t: 'steps', text: 'Eliges chip para un filtro de audio que hace 48 000 multiplicaciones de float por segundo.', steps: ['¿Qué operación domina? <b>Multiplicar float</b>', '¿Quién la hace por hardware? <b>M4F, M7 y M33 con FPU</b>', 'En un M0+, cada una son decenas de ciclos: con unos 40, casi 2 millones de ciclos por segundo solo para eso', 'En un M4F, unas 48 000 instrucciones: nada para 100 MHz'], result: 'Un M4F, como la F411, va sobrado.' },
      { t: 'match', q: 'Une cada núcleo con un STM32 que lo lleve.', pairs: [['Cortex-M0+', 'STM32G0'], ['Cortex-M3', 'STM32F103'], ['Cortex-M4F', 'STM32F411'], ['Cortex-M7', 'STM32H743']], c: 'st_cores', h: 'Busca la serie: F1 es M3, F4 es M4F, H7 es M7.' },
      Q('¿Qué hace esta línea en un Cortex-M0+?', ['Llama a una rutina de software de coma flotante: decenas de ciclos', 'Una sola instrucción de FPU', 'No compila', 'Convierte a entero automáticamente'], 'El M0+ no tiene FPU: los float se emulan.', { code: 'float y = x * 0.5f;', c: 'st_fpu', h: 'El M0+ no tiene FPU.' }),
      Q('En un Cortex-M4F, ¿qué problema tiene esta línea?', ['0.1 es una constante double: fuerza una operación de doble precisión emulada', 'Ninguno', 'b se convierte a entero', 'No se pueden multiplicar float'], 'La FPU del M4 es de precisión simple. Escribe la constante con f.', { code: 'float a = b * 0.1;', c: 'st_fpu', h: 'Fíjate en si la constante lleva f.' }),
      Q('¿Para qué sirve TrustZone en un Cortex-M33?', ['Para aislar el código y las claves seguras del resto del firmware', 'Para ir más rápido', 'Para ahorrar batería', 'Para tener más pines'], 'Un fallo en la parte normal no puede leer los secretos de la segura.', { c: 'st_cores', h: 'Piensa en guardar secretos.' }),
      Q('Pasas de un STM32F4 a un nRF52 (ambos Cortex-M4F). ¿Qué NO cambia?', ['El NVIC, el SysTick y el juego de instrucciones', 'Los registros de GPIO', 'El reloj y el PLL', 'Los nombres de los periféricos'], 'El núcleo es el mismo; los periféricos son de cada fabricante.', { c: 'st_core', h: 'El núcleo es el mismo: ¿qué trae el núcleo?' }),
      Q('Necesitas un chip barato que lea un botón y encienda un relé. ¿Qué núcleo basta?', ['Cortex-M0+', 'Cortex-M7', 'Cortex-M33 con TrustZone', 'Cortex-M4F'], 'Sin cálculo ni seguridad, lo mínimo vale y gasta menos.', { c: 'st_cores', h: 'No hay cálculo ni secretos: busca lo mínimo.' }),
      I('<b>Resumen</b>\n· M0+ mínimo; M3 divide; M4F suma DSP y FPU simple; M7 potencia; M33 seguridad.\n· En un M4F, float por hardware y double por software: escribe las constantes float con «f» al final.\n· NVIC, SysTick y SWD son iguales en todos los Cortex-M.')
    ]),
    L('st3', 'Familias STM32 y cómo leer un nombre', 'chip', ['st_partnum', 'st_family'], [
      Q('En un chip pone STM32F103C8T6. ¿Qué crees que significa el 8?', ['Un código: 64 KB de Flash', '8 KB de Flash', '8 MHz', '8 UART'], 'Las letras y cifras finales son códigos de una tabla, no cantidades. Vamos a descifrarlos.', { ...PRED, c: 'st_partnum', h: 'Desconfía de leerlo como una cantidad.' }),
      { t: 'explore', text: 'Construye el nombre de un chip moviendo cada código.', viz: 'st_part', params: P_PART(0, 0, 0, 0),
        tasks: [{ q: 'g1', min: 1, max: 1, text: 'Un chip de 64 patas y 512 KB de Flash', done: 'R = 64 patas, E = 512 KB: «RE», como la F411RE o la F446RE de las Nucleo.', hint: 'Patas R y Flash E.' },
          { q: 'g2', min: 1, max: 1, text: '48 patas, 64 KB y encapsulado sin patas (QFN)', done: 'C8U: 48 patas, 64 KB, UFQFPN.' },
          { q: 'g3', min: 1, max: 1, text: 'Haz que aguante hasta 105 °C', done: 'El último dígito 7 amplía el rango de temperatura.' }] },
      I('La letra tras STM32 dice la familia: <b>F</b> uso general clásico, <b>G</b> uso general moderno, <b>L</b> y <b>U</b> bajo consumo, <b>H</b> alto rendimiento, <b>W</b> con radio.', { svg: SVG_FAMILY }),
      I('Leamos <b>STM32F411CEU6</b>: F familia · 411 línea · C 48 patas · E 512 KB de Flash · U encapsulado sin patas · 6 de −40 a 85 °C.', { tune: { viz: 'st_part', params: P_PART(0, 3, 1, 0) } }),
      I('Dentro de una serie, cada chip trae <b>sus</b> periféricos. Antes de elegir, filtra en el selector de CubeMX por lo que necesites (DAC, CAN, USB, memoria, encapsulado, precio).', { svg: table([['F401 / F411', 'Sin DAC ni CAN'], ['F446', 'Con DAC y CAN'], ['F103', 'USB y CAN, pero no a la vez'], ['G474', 'Comparadores y amplificadores internos']], 'Lee la lista de periféricos') }),
      { t: 'steps', text: 'Descifra STM32G474RET6.', steps: ['STM32 · <b>G</b>: uso general moderno', '<b>474</b>: la línea (G4, con mucha analógica para potencia)', '<b>R</b>: 64 patas · <b>E</b>: 512 KB de Flash', '<b>T</b>: LQFP, con patas · <b>6</b>: de −40 a 85 °C'], result: 'Un G4 de 64 patas y 512 KB, fácil de soldar a mano.' },
      Q('¿Cuánta Flash tiene un STM32F103C8T6?', ['64 KB', '8 KB', '128 KB', '103 KB'], 'El 8 es el código de Flash: 64 KB.', { c: 'st_partnum', h: 'El 8 es un código: búscalo en la tabla de Flash.' }),
      Q('¿Cuántas patas tiene un STM32F446RET6?', ['64', '48', '100', '446'], 'R = 64 patas.', { c: 'st_partnum', h: 'Mira la letra que va justo después de la línea.' }),
      { t: 'match', q: 'Une cada código con su significado.', pairs: [['C (patas)', '48 patas'], ['R (patas)', '64 patas'], ['E (Flash)', '512 KB'], ['8 (Flash)', '64 KB']], c: 'st_partnum', h: 'La primera letra tras la línea son patas; la segunda, Flash.' },
      { t: 'match', q: 'Une cada chip con lo que lo define.', pairs: [['STM32F411', 'Cortex-M4F general a 100 MHz'], ['STM32G474', 'Analógica y control de motores'], ['STM32L476', 'Bajo consumo'], ['STM32H743', 'Cortex-M7 a 480 MHz']], c: 'st_family', h: 'Fíjate en la letra: F, G, L, H.' },
      Q('Diferencia entre un sufijo «T» y uno «U» de encapsulado:', ['T es LQFP con patas; U es UFQFPN sin patas', 'T aguanta más temperatura', 'U tiene más Flash', 'Ninguna'], 'El QFN es más pequeño pero más difícil de soldar a mano.', { c: 'st_partnum', h: 'Una tiene patas visibles y la otra no.' }),
      Q('Necesitas CAN y DAC en el mismo chip. ¿Cuál vale?', ['STM32F446RE', 'STM32F411CE', 'STM32F401CC', 'STM32F030F4'], 'La F401 y la F411 no tienen ni CAN ni DAC; la F446 tiene ambos.', { c: 'st_family', h: 'La F401 y la F411 no tienen ninguno de los dos.' }),
      Q('¿Qué indica el último dígito 6?', ['El rango de temperatura: de −40 a 85 °C', 'La versión del silicio', 'Los MHz', 'El número de UART'], 'Un 7 indica hasta 105 °C.', { c: 'st_partnum', h: 'Es lo último que se mira: el ambiente en que trabajará.' }),
      I('<b>Resumen</b>\n· Letra de familia: F, G, L/U, H, W.\n· Tras la línea: patas (C, R, V, Z), Flash (8, B, C, E, G), encapsulado (T, U) y temperatura (6, 7).\n· Comprueba los periféricos de cada chip antes de elegir.')
    ]),
    L('st4', 'Placas: Nucleo, Black Pill y Blue Pill', 'pcb', ['st_boards', 'st_pinlim'], [
      Q('En la Black Pill el LED está entre 3,3 V y el pin PC13. Escribes un 1 en el pin. ¿Qué crees que hace el LED?', ['Se apaga: sus dos patas quedan a 3,3 V', 'Se enciende', 'Parpadea', 'Se quema'], 'Para que circule corriente hace falta diferencia de tensión. Compruébalo en las dos placas.', { ...PRED, c: 'st_boards', h: 'Mira la tensión a cada lado del LED.' }),
      { t: 'explore', text: 'Elige placa y el valor que escribes en el pin del LED.', viz: 'st_board', params: P_BOARD(0, 0),
        tasks: [{ q: 'nuOn', min: 1, max: 1, text: 'Enciende el LED de la Nucleo', done: 'En la Nucleo el LED va del pin a masa: un 1 lo enciende.', hint: 'Escribe un 1.' },
          { q: 'bpOn', min: 1, max: 1, text: 'Cambia a la Black Pill y enciende su LED', done: 'Activo a nivel bajo: un 0 lo enciende.', hint: 'Prueba el otro valor.' }] },
      I('La <b>Nucleo-64</b> de ST lleva un <b>ST-LINK integrado</b> (programador y depurador), el LED LD2 en <b>PA5</b>, el pulsador B1 en <b>PC13</b> y la USART2 (PA2/PA3) conectada al PC por el mismo USB.', { svg: table([['ST-LINK', 'Graba, depura y hace de puerto serie'], ['LD2', 'PA5, activo a nivel alto'], ['B1', 'PC13'], ['USART2', 'PA2 y PA3 → USB del PC']], 'Nucleo-64') }),
      I('La <b>Black Pill</b> (WeAct) lleva una F401CC o una F411CE, USB-C, cristal de 25 MHz, LED en <b>PC13</b> activo a nivel bajo y KEY en <b>PA0</b>. Se graba con un ST-LINK externo o por USB. La <b>Blue Pill</b> (F103, M3 sin FPU) abunda en clones y suele traer mal la pull-up del USB.', { svg: table([['Black Pill', 'F401/F411 · M4F · LED PC13 (a 0)'], ['Blue Pill', 'F103 · M3 · clones frecuentes'], ['Nucleo-64', 'ST-LINK integrado · LED PA5']], 'Tres placas'), more: 'Grabar por USB usa el cargador de ROM del chip (DFU), que verás al final de la especialidad. Para empezar, la Black Pill da más por el mismo precio que la Blue Pill.' }),
      I('Límites de un pin: unos <b>25 mA</b> y un total para todo el chip. Los pines <b>FT</b> toleran 5 V, pero solo como entrada digital. Para relés o motores, un transistor. Y alimenta la placa por <b>una sola fuente</b>.', { svg: SVG_PINLIM }),
      { t: 'steps', text: 'Un relé de 5 V pide 70 mA. ¿Cómo lo manejas desde la Black Pill?', steps: ['¿Lo aguanta un pin? 70 mA &gt; 25 mA: <b>no</b>', 'Pon un transistor NPN (o un MOSFET) que conmute la corriente del relé', 'Corriente de base con 3,3 V y 1 kΩ: (3,3 − 0,7) / 1000 ≈ 2,6 mA: el pin va sobrado', 'Añade un <b>diodo</b> en paralelo con la bobina para el pico al apagar'], result: 'El pin solo da la orden; el transistor mueve la carga.' },
      Q('En una Nucleo-F411RE, ¿por dónde sale printf sin cablear nada?', ['Por USART2, que llega al PC a través del ST-LINK', 'Por USART1', 'Por el USB del F411', 'No sale'], 'El ST-LINK hace de puente USB-serie.', { c: 'st_boards', h: 'El ST-LINK integrado hace algo más que grabar.' }),
      Q('En la Black Pill, ¿qué hace esta línea?', ['Enciende el LED: está conectado a 3,3 V y se activa a nivel bajo', 'Apaga el LED', 'Configura PC13 como entrada', 'Nada'], 'Con el pin a 0 V circula corriente desde 3,3 V.', { code: '// RESET = escribir un 0 en el pin\nHAL_GPIO_WritePin(GPIOC,\n  GPIO_PIN_13, GPIO_PIN_RESET);', c: 'st_boards', h: 'RESET pone el pin a 0 V y el LED está conectado a 3,3 V.' }),
      { t: 'match', q: 'Une cada elemento con su pin.', pairs: [['LED LD2 de la Nucleo', 'PA5'], ['Pulsador B1 de la Nucleo', 'PC13'], ['LED de la Black Pill', 'PC13 '], ['Pulsador KEY de la Black Pill', 'PA0']], c: 'st_boards', h: 'Las dos placas usan PC13, pero para cosas distintas.' },
      Q('Un sensor da una salida digital de 5 V. ¿Puedes conectarla a un pin FT?', ['Sí, si la hoja de datos lo marca FT y el pin no está en modo analógico', 'Sí, a cualquier pin', 'Nunca', 'Solo con el chip apagado'], 'FT = tolerante a 5 V como entrada digital.', { c: 'st_pinlim', h: 'FT solo vale en un modo concreto.' }),
      Q('Un relé de 70 mA conectado directamente a un pin. ¿Qué opinas?', ['Mal: un pin da unos 25 mA; usa un transistor con diodo', 'Bien', 'Bien si el pin es FT', 'Bien a velocidad baja'], 'Además hay un límite total para todos los pines del chip.', { c: 'st_pinlim', h: 'Compara con los 25 mA de un pin.' }),
      Q('¿Por qué empezar con la Black Pill y no con la Blue Pill?', ['Cortex-M4F con FPU, más memoria y menos problemas de clones', 'Porque tiene WiFi', 'Porque es de 5 V', 'Porque no necesita programador nunca'], 'Más potencia por el mismo precio.', { c: 'st_boards', h: 'Compara núcleos y problemas de clones.' }),
      Q('¿Por qué no alimentar la placa a la vez por USB y por una fuente de 5 V en el mismo pin?', ['Las dos fuentes pueden pelearse y meter corriente una en la otra', 'Porque se duplica la tensión', 'No pasa nada', 'Porque el STM32 pasa a ser de 5 V'], 'Elige una fuente o usa un diodo o un circuito de conmutación.', { c: 'st_boards', h: 'Dos fuentes empujando el mismo punto…' }),
      I('<b>Resumen</b>\n· Nucleo: ST-LINK integrado, LED en PA5 (a 1), printf por USART2.\n· Black Pill: F401/F411, LED en PC13 activo a nivel bajo.\n· Un pin da unos 25 mA; FT solo en entrada digital; cargas grandes con transistor.')
    ]),
    L('st5', 'El mapa de memoria', 'memory', ['st_memmap', 'st_regaddr', 'st_volatile', 'st_boot0'], [
      Q('En un STM32, ¿cómo crees que se enciende un pin a nivel de hardware?', ['Escribiendo un número en una dirección de memoria concreta', 'Con una instrucción especial de entrada y salida', 'Llamando al sistema operativo', 'Mandando un mensaje por la UART'], 'Los periféricos aparecen como direcciones: escribir en ellas es dar órdenes al hardware.', { ...PRED, c: 'st_memmap', h: 'Hay 4 GB de direcciones y no todo son memorias.' }),
      { t: 'explore', text: 'Elige región y tamaño: mira dónde empieza, dónde acaba y la primera dirección que queda fuera.', viz: 'st_mem', params: P_MEM(0, 16),
        tasks: [{ q: 'end', min: 0x20020000, max: 0x20020000, text: 'Haz que la primera dirección fuera sea 0x20020000 (la SRAM de una F411)', done: '128 KB = 0x20000 bytes: 0x20000000 + 0x20000.', hint: 'SRAM y 128 KB.' },
          { q: 'end', min: 0x08080000, max: 0x08080000, text: 'Ahora el final de 512 KB de Flash', done: '512 KB = 0x80000: 0x08000000 + 0x80000 = 0x08080000.' }] },
      I('Los 4 GB de direcciones se reparten en regiones fijas:\n<b>0x08000000</b> Flash · <b>0x20000000</b> SRAM · <b>0x40000000</b> periféricos · <b>0xE0000000</b> periféricos del núcleo (NVIC, SysTick).', { tune: { viz: 'st_mem', params: P_MEM(1, 128) } }),
      I('Los periféricos están <b>mapeados en memoria</b>: cada registro tiene su dirección y se usa con un puntero. Cada periférico tiene una <b>base</b> y cada registro un <b>desplazamiento</b>: GPIOA está en 0x40020000 y su registro de salida ODR, en +0x14.', { code: '// Pone PA5 a 1 escribiendo en GPIOA->ODR\n*(volatile uint32_t *)0x40020014 = (1U << 5);' }),
      I('¿Por qué <b>volatile</b>? El optimizador quita lecturas y escrituras que le parecen inútiles. En un registro cada acceso tiene efecto: volatile le obliga a hacerlos todos.', { svg: SVG_VOLATILE, more: 'Ya lo usaste en el curso base con variables que cambia una interrupción: es la misma idea. Un registro puede cambiar solo (un dato que llega) y escribirlo dos veces seguidas puede ser justo lo que quieres.' }),
      I('Al arrancar, el pin <b>BOOT0</b> decide qué aparece en la dirección 0x00000000: con BOOT0 a 0, tu programa de la Flash; con BOOT0 a 1, el cargador que ST grabó en el chip (la memoria de sistema).', { tune: { viz: 'st_boot0', params: P_B0(0, 0) } }),
      { t: 'steps', text: '¿En qué dirección está GPIOA->IDR (desplazamiento 0x10)?', steps: ['Base de GPIOA: <b>0x40020000</b>', 'Desplazamiento de IDR: <b>0x10</b> (en hexadecimal: 16 bytes)', 'Suma en hexadecimal: 0x40020000 + 0x10', '= <b>0x40020010</b>'], result: 'Base + desplazamiento, sin pasar a decimal.' },
      { t: 'match', q: 'Une cada dirección con lo que hay.', pairs: [['0x08000000', 'Flash'], ['0x20000000', 'SRAM'], ['0x40020000', 'GPIOA'], ['0xE000E010', 'SysTick']], c: 'st_memmap', h: 'Fíjate en las primeras cifras: 0x08, 0x20, 0x40, 0xE0.' },
      G('st_regAddr'),
      Q('¿Por qué el puntero es volatile?', ['Para que el compilador haga cada acceso: el registro tiene efectos y puede cambiar solo', 'Para que sea más rápido', 'Para guardarlo en Flash', 'Porque es de 32 bits'], 'Sin volatile, el optimizador podría juntar o eliminar escrituras.', { code: '*(volatile uint32_t *)0x40020014\n    = (1U << 5);', c: 'st_volatile', h: 'Piensa en lo que hace el optimizador con escrituras que parecen repetidas.' }),
      Q('Con BOOT0 a 1 al hacer reset, ¿desde dónde arranca un STM32F4?', ['Desde la memoria de sistema: el cargador de ST', 'Desde la Flash', 'Desde la SRAM siempre', 'No arranca'], 'Así puedes cargar firmware por UART o USB sin programador.', { c: 'st_boot0', h: 'Mira qué memoria aparece en la dirección 0 según BOOT0.' }),
      Q('La F411 tiene 128 KB de SRAM. ¿Cuál es la primera dirección que queda fuera?', ['0x20020000', '0x20128000', '0x20001000', '0x20012800'], '128 KB = 0x20000 bytes: 0x20000000 + 0x20000.', { c: 'st_memmap', h: 'Pasa 128 KB a hexadecimal: 128 × 1024 = 131 072.' }),
      G('st_regAddr'),
      Q('¿Qué significa «periférico mapeado en memoria»?', ['Que sus registros se leen y escriben como posiciones de memoria', 'Que el periférico tiene su propia RAM', 'Que se copia en la Flash', 'Que solo se usa con DMA'], 'No hay instrucciones especiales: basta un puntero.', { c: 'st_memmap', h: 'Piensa en cómo se accede a un registro desde C.' }),
      I('<b>Resumen</b>\n· Flash en 0x08000000, SRAM en 0x20000000, periféricos desde 0x40000000.\n· Dirección de un registro = base del periférico + desplazamiento (en hexadecimal).\n· Los registros se tocan con punteros volatile. BOOT0 decide qué arranca.')
    ]),
    PRJ('st-p1', 'Proyecto: identifica tu placa', 'st_identify')
  ] };

  const M2 = { id: 'st-m2', title: 'Herramientas y depuración', desc: 'STM32CubeIDE y CubeMX, el ST-LINK por SWD, el depurador, printf y la cadena de compilación.', nodes: [
    L('st6', 'STM32CubeIDE y CubeMX', 'code', ['st_cubemx'], [
      Q('CubeMX genera el código de tu proyecto. Escribes tu programa en main.c, cambias un pin en CubeMX y regeneras. ¿Qué crees que pasa con lo que escribiste?', ['Depende de dónde: solo se conserva lo que está en zonas marcadas', 'Se conserva todo siempre', 'Se borra todo siempre', 'CubeMX no deja regenerar'], 'CubeMX reescribe sus archivos, pero respeta unas zonas concretas. Míralo.', { ...PRED, c: 'st_cubemx', h: 'CubeMX reescribe sus archivos; algo tiene que avisarle de lo que es tuyo.' }),
      { t: 'explore', text: 'Coloca tu línea y regenera el código.', viz: 'st_regen', params: P_REGEN(0, 0),
        tasks: [{ q: 'lost', min: 1, max: 1, text: 'Deja tu línea fuera de USER CODE y regenera', done: 'Borrada sin aviso.', hint: 'Pon «Regenerar» en sí.' },
          { q: 'ok', min: 1, max: 1, text: 'Muévela dentro de la zona y vuelve a regenerar', done: 'Lo que está entre USER CODE BEGIN y END sobrevive.' }] },
      I('<b>STM32CubeIDE</b> es gratuito: editor, compilador GCC, depurador y <b>CubeMX</b> integrado. CubeMX guarda la configuración en un archivo <b>.ioc</b> (pines, relojes, periféricos) y genera el código de arranque.', { svg: chain(['Elegir chip|o placa', 'Pines y|periféricos', 'Relojes', 'Generar|código', 'Tu código en|USER CODE', 'Compilar|y depurar']) }),
      I('Si pones una <b>etiqueta</b> a un pin (por ejemplo «LED»), CubeMX crea en main.h las macros LED_Pin y LED_GPIO_Port. Si mañana cambias el pin, tu código no cambia.', { code: 'HAL_GPIO_TogglePin(LED_GPIO_Port, LED_Pin);  // invierte el LED\nHAL_Delay(500);                              // espera 500 ms' }),
      I('Archivos que genera:\n<b>main.c</b>: main, SystemClock_Config y MX_xxx_Init.\n<b>stm32f4xx_it.c</b>: manejadores de interrupción.\n<b>stm32f4xx_hal_msp.c</b>: relojes y pines de cada periférico.\n<b>startup_*.s</b> y <b>*.ld</b>: arranque y mapa de memoria.', { svg: table([['main.c', 'main y la configuración del reloj'], ['…_it.c', 'Manejadores de interrupción'], ['…_hal_msp.c', 'Bajo nivel de cada periférico'], ['*.ld', 'Mapa de memoria para el enlazador']]), more: 'Las funciones HAL_… son la biblioteca de ST que CubeMX usa en el código generado; las verás a fondo en el módulo siguiente. Haz un commit en git antes de regenerar: si algo cambia de forma inesperada, lo verás en el diff.' }),
      { t: 'steps', text: 'Añade un pulsador en PA0 a un proyecto que ya funciona.', code: 'if (HAL_GPIO_ReadPin(BOTON_GPIO_Port, BOTON_Pin)\n    == GPIO_PIN_RESET) {\n  /* pulsado (con pull-up, a 0) */\n}', steps: ['Abre el .ioc: PA0 como GPIO_Input con pull-up y etiqueta «BOTON»', 'Haz un commit en git y pulsa Generate Code', 'CubeMX añade BOTON_Pin y BOTON_GPIO_Port a main.h y configura el pin en MX_GPIO_Init', 'Lee el pin en tu bucle, dentro de USER CODE'], result: 'Dos minutos y sin tocar nada fuera de tus zonas.' },
      { t: 'order', q: 'Ordena el flujo de trabajo con CubeIDE.', items: ['Crear el proyecto y elegir placa o chip', 'Asignar pines y periféricos en el .ioc', 'Configurar el árbol de relojes', 'Generar el código', 'Escribir tu código en las zonas USER CODE', 'Compilar y depurar'], e: 'Configuración gráfica primero; tu lógica, después y en su sitio.', c: 'st_cubemx', h: 'Primero se configura en el .ioc; tu lógica va al final.' },
      Q('¿Dónde están definidas LED_GPIO_Port y LED_Pin?', ['En main.h, generadas a partir de la etiqueta del pin', 'En la HAL de ST', 'Hay que escribirlas a mano en main.c', 'En el script del enlazador'], 'Si cambias el pin en CubeMX, el código sigue funcionando.', { code: 'HAL_GPIO_TogglePin(LED_GPIO_Port,\n                   LED_Pin);', c: 'st_cubemx', h: 'Salen de la etiqueta que pones al pin.' }),
      { t: 'match', q: 'Une cada archivo con su contenido.', pairs: [['main.c', 'main y SystemClock_Config'], ['stm32f4xx_it.c', 'Manejadores de interrupción'], ['stm32f4xx_hal_msp.c', 'Pines y relojes de cada periférico'], ['STM32F411CEUX_FLASH.ld', 'Mapa de memoria para el enlazador']], c: 'st_cubemx', h: '«it» viene de interrupciones; «msp», del bajo nivel de cada periférico.' },
      Q('Escribes tu bucle fuera de USER CODE y vuelves a generar. ¿Qué pasa?', ['Se pierde: CubeMX solo conserva lo que va entre BEGIN y END', 'Se conserva', 'Aparece un aviso y se guarda una copia', 'CubeMX lo mueve a su sitio'], 'Entre END WHILE y BEGIN 3 no hay zona de usuario: regla de oro de CubeMX.', { code: '  while (1)\n  {\n    /* USER CODE END WHILE */\n    mi_bucle();   // <- aquí\n    /* USER CODE BEGIN 3 */\n  }\n  /* USER CODE END 3 */', c: 'st_cubemx', h: 'Mira si la línea queda entre un BEGIN y su END.' }),
      Q('¿Dónde se configuran los pines de la USART2 (modo, velocidad)?', ['En HAL_UART_MspInit, dentro de stm32f4xx_hal_msp.c', 'En main.h', 'En el script del enlazador', 'En el arranque en ensamblador'], 'Las funciones Msp hacen el bajo nivel de cada periférico.', { c: 'st_cubemx', h: 'Busca la función Msp de la UART.' }),
      Q('Antes de regenerar, ¿qué costumbre te salva de sorpresas?', ['Hacer un commit en git para ver luego el diff', 'Borrar el .ioc', 'Cerrar CubeIDE', 'Compilar dos veces'], 'Si algo cambia sin querer, lo verás y podrás volver atrás.', { c: 'st_cubemx', h: 'Piensa en cómo comparar antes y después.' }),
      I('<b>Resumen</b>\n· El .ioc guarda la configuración; CubeMX genera main.c, _it.c, _msp.c, arranque y .ld.\n· Las etiquetas de pin se convierten en macros de main.h.\n· Tu código, solo entre USER CODE BEGIN y END.')
    ]),
    L('st7', 'ST-LINK y SWD', 'bus', ['st_swd', 'st_swdrec', 'st_debug'], [
      Q('Conectas el ST-LINK con SWDIO y SWCLK, pero olvidas el cable de masa. ¿Qué crees que pasa?', ['No conecta o falla: las señales no tienen referencia común', 'Funciona igual', 'Se quema el chip', 'Funciona más lento'], 'Una tensión siempre se mide respecto a algo. Pruébalo.', { ...PRED, c: 'st_swd', h: 'Una tensión siempre se mide respecto a algo.' }),
      { t: 'explore', text: 'Conecta el depurador y ajusta cable y velocidad.', viz: 'st_swd', params: P_SWD(0, 10, 4),
        tasks: [{ q: 'ok', min: 1, max: 1, text: 'Consigue conectar', done: 'Masa común y una frecuencia que el cable aguanta.', hint: 'Conecta GND.' },
          { q: 'ok30', min: 1, max: 1, text: 'Ahora con un cable de 30 cm o más', done: 'Cable largo: baja la frecuencia de SWD.', hint: 'Baja la frecuencia.' }] },
      I('<b>SWD</b> (Serial Wire Debug) usa dos señales: <b>SWDIO</b> (datos, PA13) y <b>SWCLK</b> (reloj, PA14), más <b>GND</b>. Opcionales: <b>NRST</b> (reset) y <b>SWO</b> (traza, PB3).', { svg: table([['SWDIO', 'Datos en los dos sentidos · PA13'], ['SWCLK', 'Reloj del depurador · PA14'], ['GND', 'Masa común: imprescindible'], ['NRST · SWO', 'Opcionales: reset y traza (PB3)']], 'Cables del SWD') }),
      I('Con SWD no solo grabas en segundos: puedes <b>parar el núcleo</b>, leer y escribir cualquier dirección, poner puntos de ruptura y seguir. Es tu instrumento de medida para el software.', { svg: chain(['CubeIDE|(gdb)', 'ST-LINK|USB ↔ SWD', 'STM32|núcleo parado']) }),
      I('Si tu programa usa PA13 y PA14 como pines normales, el depurador pierde el acceso en cuanto arranca. <b>Connect under reset</b>: el ST-LINK mantiene NRST a 0, conecta y para el núcleo antes de la primera instrucción. Plan B: arrancar con BOOT0 a 1.', { svg: SVG_SWDREC, more: 'Para que no pase: en CubeMX, SYS › Debug = Serial Wire reserva esos pines. En la F1, la opción «No Debug» genera código que desactiva el SWD.' }),
      { t: 'steps', text: 'El depurador ya no conecta tras grabar un programa nuevo. Recupera el chip.', steps: ['Cablea NRST además de SWDIO, SWCLK y GND', 'En la configuración de conexión, elige el modo «Under reset»', 'Conecta con STM32CubeProgrammer', 'Haz un borrado completo de la Flash', 'Graba un programa con SYS › Debug = Serial Wire'], result: 'Si aun así no conecta, arranca con BOOT0 a 1 y repite.' },
      { t: 'match', q: 'Une cada señal con su función.', pairs: [['SWDIO', 'Datos bidireccionales (PA13)'], ['SWCLK', 'Reloj del depurador (PA14)'], ['NRST', 'Reset del chip'], ['SWO', 'Salida de traza (PB3)']], c: 'st_swd', h: 'IO de datos, CLK de reloj, RST de reset.' },
      Q('Además de SWDIO y SWCLK, ¿qué cable es imprescindible?', ['GND', 'NRST', '5 V', 'BOOT0'], 'Sin masa común no hay referencia.', { c: 'st_swd', h: 'Las señales se miden respecto a él.' }),
      Q('Tu programa ha configurado PA13 y PA14 como GPIO y el depurador ya no conecta. ¿Qué haces?', ['Conectar en modo «Under reset» (o arrancar con BOOT0 a 1) y borrar la Flash', 'Tirar la placa', 'Cambiar de cable USB', 'Bajar la tensión'], 'Bajo reset, el depurador para el núcleo antes de que tu código toque esos pines.', { c: 'st_swdrec', h: 'Hay que llegar antes de que tu código se ejecute.' }),
      { t: 'order', q: 'Ordena cómo recuperar un chip que no conecta.', items: ['Cablea NRST además de SWDIO, SWCLK y GND', 'Elige el modo de conexión «Under reset»', 'Conecta con CubeProgrammer', 'Haz un borrado completo', 'Graba un programa que deje el SWD activo'], e: 'Si aun así no conecta, prueba con BOOT0 a 1.', c: 'st_swdrec', h: 'Primero el cable que permite conectar bajo reset.' },
      Q('La conexión falla con cables de 30 cm pero va bien con 10 cm. ¿Qué pruebas?', ['Bajar la frecuencia de SWD', 'Subir la tensión', 'Cambiar de chip', 'Quitar GND'], 'A más velocidad, más importan la longitud y el ruido.', { c: 'st_swd', h: 'Cuanto más largo el cable, más lento.' }),
      Q('¿Por qué conviene poner SYS › Debug en «Serial Wire» en CubeMX?', ['Reserva PA13 y PA14 para el depurador y evita perder el acceso SWD', 'Para que vaya más rápido', 'Para activar printf', 'Para usar el USB'], 'Así ningún código generado los reconfigura.', { c: 'st_swdrec', h: 'Piensa en qué pines necesita el depurador.' }),
      Q('¿Qué ventaja tiene el SWD frente a grabar por un cargador serie para desarrollar?', ['Grabas en segundos y además puedes parar el programa y leer memoria y registros', 'Ninguna', 'No necesita cables', 'Funciona sin alimentación'], 'Un depurador es tu mejor instrumento para el software.', { c: 'st_debug', h: 'Piensa en lo que puedes hacer con el núcleo parado.' }),
      I('<b>Resumen</b>\n· SWD = SWDIO (PA13) + SWCLK (PA14) + GND; NRST y SWO opcionales.\n· Cables largos: baja la frecuencia.\n· Si tu código desactiva el SWD: conecta bajo reset o con BOOT0 a 1, y borra.')
    ]),
    L('st8', 'Depurar como un profesional', 'code', ['st_debug', 'st_hardfault', 'st_volatile', 'st_cycles'], [
      Q('Una variable global aparece con un valor absurdo y no sabes qué línea la escribe. ¿Qué crees que lo encuentra antes?', ['Un watchpoint: el programa se para justo al escribirla', 'Muchos printf por todas partes', 'Leer todo el código', 'Reiniciar hasta que no pase'], 'El depurador puede vigilar una dirección de memoria. Antes, un cronómetro muy fino.', { ...PRED, c: 'st_debug', h: 'Hay una herramienta que vigila una dirección.' }),
      { t: 'explore', text: 'DWT->CYCCNT cuenta ciclos del núcleo. Elige reloj y cuentas.', viz: 'st_cyc', params: P_CYC(16, 84),
        tasks: [{ q: 'us', min: 24.99, max: 25.01, text: 'Mide 25 µs', done: '2500 ciclos a 100 MHz = 25 µs.', hint: 'Prueba con 100 MHz.' },
          { q: 'us', min: 4.99, max: 5.01, text: 'Ahora 5 µs', done: '420 ciclos a 84 MHz = 5 µs.' },
          { q: 'us', min: 99.9, max: 100.1, text: 'Y 100 µs', done: 'Tiempo = ciclos / frecuencia, en cualquier combinación.' }] },
      I('Lo básico en CubeIDE: un <b>punto de ruptura</b> para el programa en una línea. Luego avanzas con <b>Step Into</b> (entra en la función), <b>Step Over</b> (la ejecuta entera), <b>Step Return</b> (sale de ella) o <b>Resume</b> (sigue).', { svg: SVG_DBG }),
      I('Más vistas: un <b>watchpoint</b> para cuando se lee o escribe una dirección; <b>Live Expressions</b> leen variables sin parar el programa; <b>SFRs</b> muestra cada registro de periférico bit a bit.', { svg: table([['Watchpoint', '¿Quién escribe esta variable?'], ['Live Expressions', '¿Cómo cambia en marcha?'], ['SFRs', '¿Qué vale este registro?'], ['Memory', '¿Qué hay en esta dirección?']], 'Cada vista responde una pregunta') }),
      I('Con <b>-O2</b> el compilador guarda variables en registros o las elimina: el depurador dice «optimized out». Para depurar, compila con <b>-Og</b>. Y si una variable la cambia una interrupción, <b>volatile</b>.', { code: 'for (int i = 0; i < 10; i++)\n  suma += datos[i];   // con -O2, i puede no existir' }),
      I('Un <b>HardFault</b> salta cuando el núcleo hace algo imposible: leer una dirección que no existe, saltar a un puntero nulo o desbordar la pila. El hardware guarda el <b>PC</b> al entrar: te dice qué instrucción falló.', { svg: SVG_STACK, more: 'Los registros CFSR, HFSR y BFAR dicen la causa exacta; el Fault Analyzer de CubeIDE los lee por ti. Una pila desbordada pisa variables globales: el fallo aparece lejos de la causa.' }),
      I('El cronómetro más fino: <b>DWT->CYCCNT</b> cuenta ciclos del núcleo. Tiempo = ciclos / frecuencia.', { code: 'CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;\nDWT->CYCCNT = 0;\nDWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;\n\nuint32_t t0 = DWT->CYCCNT;\nfiltro();\nuint32_t ciclos = DWT->CYCCNT - t0;' }),
      { t: 'steps', text: 'filtro() tarda 2100 ciclos a 84 MHz. ¿Cumple un plazo de 30 µs?', steps: ['Tiempo = ciclos / f', '2100 / 84 000 000 s', '= 0,000025 s = <b>25 µs</b>', '25 µs &lt; 30 µs: <b>cumple</b>, con 5 µs de margen'], result: 'Sí, con un 17 % de margen.' },
      { t: 'match', q: 'Une cada acción con lo que hace.', pairs: [['Step Into', 'Entra dentro de la función'], ['Step Over', 'Ejecuta la función entera y para en la siguiente línea'], ['Step Return', 'Termina la función actual y vuelve'], ['Resume', 'Sigue hasta el siguiente punto de ruptura']], c: 'st_debug', h: 'Into entra, Over pasa por encima, Return sale.' },
      Q('Quieres ver cómo cambia una variable mientras el programa corre, sin pararlo. ¿Qué usas?', ['Live Expressions', 'Un punto de ruptura', 'Step Into', 'El archivo .map'], 'Se leen por SWD en segundo plano.', { c: 'st_debug', h: 'Necesitas ver sin parar.' }),
      Q('Con -O2, el depurador dice «optimized out» al mirar i. ¿Por qué?', ['El compilador la tiene en un registro o la ha eliminado', 'Hay un error en el código', 'El ST-LINK falla', 'La Flash está llena'], 'Para depurar, compila con -Og o -O0.', { code: 'for (int i = 0; i < 10; i++)\n  suma += datos[i];', c: 'st_volatile', h: 'Mira el nivel de optimización.' }),
      Q('¿Qué ocurre aquí?', ['HardFault: salta a una dirección sin código válido', 'No hace nada', 'Reinicia la placa limpiamente', 'Error de compilación'], 'Llamar a un puntero a función nulo es un clásico.', { code: 'void (*f)(void) = NULL;\nf();', c: 'st_hardfault', h: 'Llamar a una función que está en la dirección 0…' }),
      Nm('A 100 MHz, DWT->CYCCNT avanza 2500 cuentas durante una función. ¿Cuántos µs tarda?', 25, 'µs', '2500 / 100 MHz = 25 µs.', { code: 'uint32_t t0 = DWT->CYCCNT;\nfiltro();\nuint32_t c = DWT->CYCCNT - t0;', c: 'st_cycles', h: 'Ciclos entre MHz dan microsegundos.' }),
      Q('En un HardFault, ¿qué te dice el PC guardado en la pila?', ['Dónde estaba el programa cuando falló', 'La dirección de main', 'El tamaño de la pila', 'La frecuencia del reloj'], 'Búscalo en el desensamblado o en el .map.', { c: 'st_hardfault', h: 'Es lo que el hardware guarda al entrar.' }),
      Q('Una variable que cambia en una interrupción no se actualiza nunca en main con -O2. ¿Qué falta?', ['volatile', 'static', 'const', 'extern'], 'Sin volatile, el compilador puede leerla una sola vez.', { c: 'st_volatile', h: 'Ya lo viste en el curso base con attachInterrupt.' }),
      I('<b>Resumen</b>\n· Puntos de ruptura, pasos, watchpoints y Live Expressions: cada uno para una pregunta.\n· «optimized out»: compila con -Og; variables de interrupción, volatile.\n· HardFault: mira el PC apilado. CYCCNT mide en ciclos.')
    ]),
    L('st9', 'printf por UART y por SWO', 'code', ['st_printf', 'st_uarttime', 'st_isrrules'], [
      Q('Envías por la UART un mensaje de 100 caracteres a 115 200 baudios con HAL_UART_Transmit, que espera a que salga. ¿Cuánto crees que dura la espera?', ['Casi 9 ms', 'Nada: es instantáneo', 'Unos microsegundos', 'Un segundo'], 'Cada carácter son 10 bits: 1000 bits a 115 200 por segundo. Experimenta.', { ...PRED, c: 'st_uarttime', h: 'Cada carácter son 10 bits.' }),
      { t: 'explore', text: 'Cambia la longitud del mensaje y los baudios.', viz: 'st_uarttx', params: P_UTX(100, 9600),
        tasks: [{ q: 'ms', min: 0, max: 1, text: 'Consigue que el mensaje tarde menos de 1 ms', done: 'Mensajes cortos y baudios altos.', hint: 'Sube los baudios o acorta el mensaje.' },
          { q: 'ms', min: 3.9, max: 4.1, text: 'Ahora uno que tarde unos 4 ms', done: '46 caracteres a 115 200 baudios: 460 bits / 115 200 ≈ 4 ms.' }] },
      I('printf usa la biblioteca <b>newlib</b>, que llama a <b>_write</b> y esta a <b>__io_putchar</b> por cada carácter. Esa última la escribes tú y decide por dónde sale.', { svg: SVG_PRINTF }),
      I('Por la UART: __io_putchar llama a <b>HAL_UART_Transmit</b>, la función de ST que envía bytes y espera a que salgan. En una Nucleo, la USART2 llega al PC por el ST-LINK.', { code: 'int __io_putchar(int ch) {\n  HAL_UART_Transmit(&huart2, (uint8_t *)&ch, 1, 10);\n  return ch;\n}' }),
      I('Dos sorpresas: newlib-nano no imprime float salvo que lo actives (opción -u _printf_float) y stdout guarda en un búfer hasta el salto de línea.', { code: 'printf("t = %.1f\\n", t);  // necesita -u _printf_float\nprintf("hola");             // no sale hasta un \\n' }),
      I('<b>SWO</b> (PB3) es un canal de traza del depurador: con ITM_SendChar, printf sale por el ST-LINK sin gastar una UART. Hace falta un ST-LINK con SWO (el de las Nucleo lo tiene; los clones de pendrive casi nunca) y decirle al depurador la frecuencia real del núcleo.', { code: 'int __io_putchar(int ch) {\n  return ITM_SendChar(ch);\n}' }),
      { t: 'steps', text: '¿Cuánto bloquea un printf de 46 caracteres a 115 200 baudios?', steps: ['Cada carácter son 10 bits (inicio, 8 de datos y parada)', '46 × 10 = 460 bits', '460 / 115 200 = 0,004 s', '≈ <b>4 ms</b> con la CPU esperando'], result: 'Una eternidad para un bucle de control de 1 kHz.' },
      Q('¿Qué hace esta función?', ['Envía por la UART cada carácter que printf quiere imprimir', 'Lee un carácter', 'Activa la UART', 'Imprime en la pantalla del PC directamente'], 'Es la redirección de printf.', { code: 'int __io_putchar(int ch) {\n  HAL_UART_Transmit(&huart2,\n    (uint8_t *)&ch, 1, 10);\n  return ch;\n}', c: 'st_printf', h: 'Fíjate a qué función llama.' }),
      Q('printf("%f", x) no imprime nada. ¿Qué pasa?', ['newlib-nano no incluye float en printf por defecto: actívalo con -u _printf_float', 'x vale cero', 'La UART va lenta', 'printf no funciona en ARM'], 'Ocupa unos KB más de Flash.', { c: 'st_printf', h: 'La versión pequeña de la biblioteca recorta cosas.' }),
      Nm('Un mensaje de 46 caracteres a 115 200 baudios (10 bits por carácter). ¿Cuántos ms tarda?', 4, 'ms', '46 × 10 / 115 200 ≈ 4 ms.', { tol: 0.1, c: 'st_uarttime', h: 'Bits totales entre baudios.' }),
      Q('¿Por qué no usar printf dentro de una interrupción?', ['Bloquea milisegundos y retrasa todo lo demás', 'Porque no compila', 'Porque gasta Flash', 'Porque cambia la prioridad'], 'Guarda el dato y que lo imprima main.', { c: 'st_isrrules', h: 'Recuerda las reglas de una ISR del curso base.' }),
      Q('Activas SWO y la consola muestra basura o nada. ¿Primera sospecha?', ['La frecuencia del núcleo configurada en el depurador no coincide con la real', 'El LED está mal', 'Falta una pull-up', 'La Flash está llena'], 'El ST-LINK la necesita para decodificar SWO.', { c: 'st_printf', h: 'El ST-LINK necesita un dato del reloj.' }),
      Q('A 9600 baudios en 8N1, ¿cuántos bytes por segundo como máximo?', ['960', '1200', '9600', '96'], 'Cada byte son 10 bits en la línea.', { c: 'st_uarttime', h: 'Divide entre 10, no entre 8.' }),
      Q('Los clones baratos de ST-LINK con forma de pendrive…', ['Suelen grabar y depurar bien, pero casi nunca sacan SWO', 'No funcionan nunca', 'Son más rápidos que el original', 'Solo sirven para la Blue Pill'], 'Para printf por SWO, un ST-LINK que lo tenga, como el de las Nucleo.', { c: 'st_printf', h: 'No todos los ST-LINK tienen la misma patilla.' }),
      I('<b>Resumen</b>\n· printf → _write → __io_putchar: tú decides si sale por la UART o por SWO.\n· Cada carácter son 10 bits: a 115 200 baudios, unos 11 520 bytes/s, con la CPU esperando.\n· Activa float en newlib-nano y termina con \\n. Nada de printf en interrupciones.')
    ]),
    L('st10', 'Más allá de CubeIDE', 'code', ['st_toolchain', 'st_sections', 'st_fpu'], [
      Q('Compilas y el programa ocupa 30 KB. ¿Crees que todo eso va a la Flash, a la RAM o a las dos?', ['Parte a cada una, y algunos datos ocupan sitio en las dos', 'Todo a la Flash', 'Todo a la RAM', 'Nada a la RAM hasta que arranca'], 'Las variables globales con valor inicial necesitan las dos memorias. Míralo.', { ...PRED, c: 'st_sections', h: 'Piensa en una variable global con valor inicial.' }),
      { t: 'explore', text: 'Tres números describen tu programa: .text, .data y .bss. Muévelos.', viz: 'st_sec', params: P_SEC(64, 0, 4),
        tasks: [{ q: 'dataBoth', min: 1, max: 1, text: 'Sube .data a 4000 B y mira qué barras crecen', done: '.data ocupa Flash (los valores iniciales) y RAM (las variables).', hint: 'Lleva .data al máximo.' },
          { q: 'fOver', min: 1, max: 1, text: 'Haz que el programa no quepa en la Flash', done: 'El enlazador da error: mejor al compilar que en el campo.', hint: 'Sube .text.' }] },
      I('Debajo de cualquier IDE está la cadena <b>arm-none-eabi</b>: gcc compila, ld enlaza (con el script .ld), objcopy convierte formatos, size mide y gdb depura.', { svg: SVG_TOOL }),
      I('Archivos de salida: <b>.elf</b> con símbolos para depurar; <b>.hex</b> con direcciones en texto; <b>.bin</b> solo bytes (al grabarlo dices dónde: 0x08000000); <b>.map</b>, dónde quedó cada función y variable.', { svg: table([['.elf', 'Programa + símbolos de depuración'], ['.hex', 'Bytes con sus direcciones (texto)'], ['.bin', 'Solo bytes, sin direcciones'], ['.map', 'Dónde quedó cada cosa y cuánto ocupa']], 'Lo que sale de compilar') }),
      I('<b>arm-none-eabi-size</b> da tres números: <b>text</b> (código y constantes: Flash), <b>data</b> (globales con valor inicial: Flash y RAM) y <b>bss</b> (globales a cero: solo RAM).\nFlash = text + data · RAM = data + bss.', { code: '$ arm-none-eabi-size app.elf\n   text    data     bss     dec\n  14212     120    3488   17820', more: 'Por qué .data necesita las dos memorias lo verás en «Qué pasa antes de main»: el valor inicial vive en la Flash y el arranque lo copia a la RAM.' }),
      I('Flags de un M4F: el compilador debe saber que hay FPU. Con <b>-mfloat-abi=hard</b> la usa y pasa los float en sus registros.', { code: 'arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb \\\n  -mfpu=fpv4-sp-d16 -mfloat-abi=hard -Og -g ...', more: 'Alternativas al IDE: PlatformIO, o exportar desde CubeMX un proyecto con Makefile o CMake. Para depurar desde la terminal, OpenOCD habla con el ST-LINK y abre un servidor al que se conecta gdb.' }),
      { t: 'steps', text: 'size dice text = 14 212, data = 120, bss = 3488. ¿Cuánto ocupa en cada memoria?', steps: ['Flash = text + data = 14 212 + 120', '= <b>14 332 B</b> (unos 14 KB)', 'RAM estática = data + bss = 120 + 3488', '= <b>3608 B</b>, más la pila y el montón'], result: 'Sobra sitio en una F411 (512 KB y 128 KB).' },
      { t: 'match', q: 'Une cada archivo con lo que contiene.', pairs: [['.elf', 'Programa con símbolos y datos de depuración'], ['.bin', 'Imagen binaria pura, sin direcciones'], ['.hex', 'Imagen con direcciones en texto (Intel HEX)'], ['.map', 'Dónde ha quedado cada función y variable']], c: 'st_toolchain', h: 'Piensa en quién lleva direcciones y quién símbolos.' },
      Q('Grabas un .bin con una herramienta. ¿Qué tienes que indicarle?', ['La dirección de destino, normalmente 0x08000000', 'Nada', 'La frecuencia del reloj', 'El número de serie'], 'El .bin no lleva direcciones; el .hex y el .elf sí.', { c: 'st_toolchain', h: 'Un .bin solo son bytes.' }),
      G('st_memUse'),
      Q('¿Qué hace la opción -mfloat-abi=hard?', ['Usa la FPU y pasa los float en sus registros', 'Desactiva la FPU', 'Compila más despacio', 'Usa doble precisión siempre'], 'Va con -mfpu=fpv4-sp-d16 en un M4F.', { code: 'arm-none-eabi-gcc -mcpu=cortex-m4\n  -mthumb -mfpu=fpv4-sp-d16\n  -mfloat-abi=hard -Og -g ...', c: 'st_fpu', h: '«hard» = por hardware.' }),
      Q('¿Qué papel tiene OpenOCD?', ['Servidor intermedio entre gdb y la sonda de depuración', 'Compilador', 'Editor de código', 'Sistema operativo'], 'gdb habla con OpenOCD; OpenOCD, con el ST-LINK.', { c: 'st_toolchain', h: 'Hace de puente.' }),
      G('st_memUse'),
      Q('¿Para qué sirve el archivo .map?', ['Para ver cuánto ocupa cada función y variable y en qué dirección quedó', 'Para depurar sin cables', 'Para configurar los pines', 'Para guardar datos en Flash'], 'Es lo primero que se mira cuando la Flash o la RAM se llenan.', { c: 'st_toolchain', h: 'Su nombre lo dice: un mapa.' }),
      I('<b>Resumen</b>\n· gcc, ld, objcopy, size y gdb; OpenOCD entre gdb y el ST-LINK.\n· .elf para depurar; .bin para grabar (con dirección); .map para ver qué ocupa qué.\n· Flash = text + data; RAM = data + bss.')
    ]),
    PRJ('st-p2', 'Proyecto: baliza Morse con consola', 'st_morse')
  ] };

  const M3 = { id: 'st-m3', title: 'Capas de software y arranque', desc: 'Registros con CMSIS, operaciones de bits, HAL y LL, lo que pasa antes de main, el enlazador y el SysTick.', nodes: [
    L('st11', 'Registros con CMSIS', 'memory', ['st_regaddr', 'st_rccen', 'st_docs', 'st_volatile'], [
      Q('Escribes en GPIOA->MODER para poner PA5 de salida, pero al leerlo sigue a 0. ¿Qué crees que falla?', ['El reloj de GPIOA está apagado', 'MODER es de solo lectura', 'Falta una espera', 'PA5 está roto'], 'Tras el reset, casi todos los periféricos están sin reloj para ahorrar. Primero, las direcciones.', { ...PRED, c: 'st_rccen', h: 'Tras el reset, casi todo el chip está «sin reloj» para ahorrar energía.' }),
      { t: 'explore', text: 'Elige puerto y registro: la dirección es base + desplazamiento.', viz: 'st_addr', params: P_ADDR(0, 0),
        tasks: [{ q: 'addr', min: 0x40020414, max: 0x40020414, text: 'Encuentra la dirección de GPIOB->ODR', done: '0x40020400 + 0x14.', hint: 'Puerto B y registro ODR.' },
          { q: 'addr', min: 0x40020818, max: 0x40020818, text: 'Ahora la de GPIOC->BSRR', done: '0x40020800 + 0x18: cada puerto está 0x400 más arriba.' }] },
      I('<b>CMSIS</b> tiene dos partes: la de ARM (NVIC, SysTick, __disable_irq…) y la cabecera de ST (stm32f411xe.h), con una estructura por periférico y una macro por cada bit.', { code: 'typedef struct {\n  __IO uint32_t MODER;   // +0x00\n  __IO uint32_t OTYPER;  // +0x04\n  __IO uint32_t OSPEEDR; // +0x08\n  __IO uint32_t PUPDR;   // +0x0C\n  __IO uint32_t IDR;     // +0x10\n  __IO uint32_t ODR;     // +0x14\n  ...\n} GPIO_TypeDef;' }),
      I('GPIOA es un puntero a esa estructura colocado en la base del puerto: el compilador suma el desplazamiento de cada campo. Y cada campo es <b>__IO</b>, que es volatile.', { code: '#define GPIOA ((GPIO_TypeDef *)GPIOA_BASE)\n\nGPIOA->ODR |= (1U << 5);   // PA5 a 1' }),
      I('Tras el reset, los relojes de casi todos los periféricos están <b>cerrados</b>. Antes de tocar uno, ábrelo en RCC: AHB1ENR (GPIO, DMA), APB1ENR (USART2, TIM2…) o APB2ENR (USART1, SYSCFG…).', { svg: SVG_RCC }),
      I('Cuatro documentos: <b>hoja de datos</b> (patillaje, funciones alternativas, límites eléctricos), <b>manual de referencia</b> (cada registro bit a bit), <b>erratas</b> y <b>manual de programación</b> del núcleo (PM0214 para el M4).', { svg: SVG_DOCS }),
      { t: 'steps', text: 'Enciende PA5 con registros, sin HAL.', code: 'RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;\nGPIOA->MODER &= ~(3U << (2 * 5));\nGPIOA->MODER |=  (1U << (2 * 5));\nGPIOA->ODR   |=  (1U << 5);', steps: ['Abre el reloj de GPIOA (bit GPIOAEN de AHB1ENR)', 'Limpia los 2 bits de modo de PA5 (bits 11 y 10)', 'Escribe 01 en ese campo: salida', 'Pon a 1 el bit 5 de ODR'], result: 'Cuatro líneas y el LED de la Nucleo se enciende. Los campos de bits, a fondo en la lección siguiente.' },
      Q('¿Cómo calcula el compilador la dirección de GPIOA->ODR?', ['Base de GPIOA más el desplazamiento del campo ODR (0x14)', 'Busca en una tabla en Flash', 'Pregunta al periférico', 'Es siempre 0x40000000'], 'Una estructura superpuesta sobre los registros.', { c: 'st_regaddr', h: 'Una estructura colocada encima de los registros.' }),
      Q('¿Qué es __IO en la cabecera de CMSIS?', ['Una macro de volatile', 'Un tipo de 64 bits', 'Una función', 'Una sección de memoria'], 'Cada acceso a un registro debe hacerse de verdad.', { c: 'st_volatile', h: 'Es una macro de una palabra clave de C.' }),
      Q('¿Qué hace esta línea?', ['Habilita el reloj del puerto GPIOA', 'Pone PA0 a 1', 'Resetea GPIOA', 'Configura PA0 como salida'], 'RCC_AHB1ENR_GPIOAEN es el bit 0 de AHB1ENR.', { code: 'RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;', c: 'st_rccen', h: 'RCC controla los relojes.' }),
      G('st_regAddr'),
      { t: 'match', q: '¿Dónde buscas cada cosa?', pairs: [['Los bits de USART_CR1', 'Manual de referencia'], ['Qué AF lleva PA9 a USART1_TX', 'Hoja de datos'], ['Un fallo conocido del I²C', 'Hoja de erratas'], ['Las instrucciones del Cortex-M4', 'Manual de programación']], c: 'st_docs', h: 'Patillas y límites, en la hoja de datos; registros, en el manual de referencia.' },
      Q('¿Dónde miras la corriente máxima de un pin?', ['En la hoja de datos', 'En el manual de referencia', 'En la hoja de erratas', 'En el manual de programación'], 'Los límites eléctricos son de cada chip concreto.', { c: 'st_docs', h: 'Los límites eléctricos dependen del chip concreto.' }),
      Q('¿Por qué están apagados los relojes de los periféricos tras el reset?', ['Para ahorrar energía: solo gasta lo que enciendes', 'Para arrancar más rápido', 'Por seguridad contra lecturas', 'Por un fallo de diseño'], 'Cada periférico con reloj consume aunque no lo uses.', { c: 'st_rccen', h: 'Piensa en el consumo.' }),
      I('<b>Resumen</b>\n· CMSIS da estructuras con los registros en su sitio: GPIOA->ODR = base + 0x14.\n· Todo campo es __IO (volatile).\n· Primero abre el reloj en RCC; luego configura.')
    ]),
    L('st12', 'Manipular bits sin romper nada', 'bin', ['st_reg', 'st_field', 'st_bsrr'], [
      Q('En una F407, MODER de GPIOA vale 0xA8000000 tras el reset: sus bits altos mantienen el depurador. Escribes GPIOA->MODER = (1U << 10). ¿Qué crees que pasa?', ['PA5 pasa a salida… y el depurador pierde PA13 y PA14', 'Solo cambia PA5', 'No pasa nada', 'Error de compilación'], 'El signo = sustituye el registro entero. Compruébalo.', { ...PRED, c: 'st_reg', h: '= sustituye todo el registro.' }),
      { t: 'explore', text: 'Este es MODER de GPIOA de una F407 tras el reset. Elige operación y bit.', viz: 'st_reg32', params: P_R32(0, 0),
        tasks: [{ q: 'val', min: 0xA8000400, max: 0xA8000400, text: 'Pon a 1 el bit 10 sin tocar nada más', done: '|= con una máscara: solo cambia ese bit.', hint: 'Operación |= y bit 10.' },
          { q: 'val', min: 0x28000000, max: 0x28000000, text: 'Ahora borra el bit 31', done: '&= ~máscara pone a 0 solo ese bit.' },
          { q: 'bad', min: 3, max: 32, text: 'Prueba = con el bit 10 y cuenta los bits rojos', done: 'Asignar con = borra todo lo demás: aquí, la configuración del depurador.' }] },
      I('Las cuatro jugadas:\n<b>reg |= m</b> pone a 1 los bits de m.\n<b>reg &= ~m</b> los pone a 0.\n<b>reg ^= m</b> los invierte.\n<b>reg & m</b> lee si están a 1.\nLa máscara de un bit es (1U &lt;&lt; n).', { tune: { viz: 'st_reg32', params: P_R32(2, 5) }, more: 'Escribe 1U y no 1: 1 es un int con signo y desplazarlo al bit 31 es comportamiento indefinido en C. En el curso base usaste |, & y ~ con bytes; aquí es lo mismo con 32 bits.' }),
      I('Un <b>campo</b> de varios bits se cambia en dos pasos: limpiar y escribir. En MODER cada pin ocupa <b>2 bits</b> (00 entrada, 01 salida, 10 función alternativa, 11 analógico) y el pin n empieza en el bit 2n.', { tune: { viz: 'st_reg', params: { pin: sl('Pin', 5, 0, 15), mode: li('Modo (0 ent · 1 sal · 2 AF · 3 anal)', 1, [0, 1, 2, 3]) } }, code: 'GPIOA->MODER &= ~(3U << (2 * 5));  // limpia\nGPIOA->MODER |=  (1U << (2 * 5));  // 01: salida' }),
      I('Leer-modificar-escribir son <b>tres pasos</b>: si una interrupción cambia el mismo registro entre medias, su cambio se pierde. Para los pines existe <b>BSRR</b>: bits 0–15 ponen a 1, bits 16–31 ponen a 0, y los ceros no hacen nada. Una sola escritura: atómica.', { tune: { viz: 'st_bsrr', params: P_BSRR(5) }, more: 'En el M3 y el M4 existe además el bit-banding: cada bit de la SRAM y de los periféricos tiene su propia palabra en una zona «alias», y escribir en ella cambia solo ese bit. No existe en M0, M7 ni M33.' }),
      { t: 'steps', text: 'Pon PB6 en función alternativa (10) sin tocar los demás pines.', steps: ['El campo de PB6 empieza en el bit 2 × 6 = <b>12</b>', 'Limpia: MODER &amp;= ~(3U &lt;&lt; 12)', '10 en binario es 2: MODER |= (2U &lt;&lt; 12)', '2 &lt;&lt; 12 = <b>0x2000</b>'], result: 'Bits 13–12 = 10; los demás, intactos.' },
      Q('¿Qué hace esta línea?', ['Pone a 1 el bit 5 de ODR sin tocar los demás', 'Pone ODR a 5', 'Borra el bit 5', 'Invierte todo el registro'], 'OR con una máscara de un solo bit.', { code: 'GPIOA->ODR |= (1U << 5);', c: 'st_reg', h: 'OR con una máscara de un bit.' }),
      Q('¿Y esta?', ['Pone a 0 el bit 3 de x', 'Pone a 1 el bit 3', 'Pone a 0 todos menos el 3', 'Invierte el bit 3'], '~ invierte la máscara; el AND conserva todo menos el bit 3.', { code: 'x &= ~(1U << 3);', c: 'st_reg', h: '~ invierte la máscara antes del AND.' }),
      TU('Consigue que MODER valga 0x00000400 (PA5 como salida).', 'st_reg', { pin: sl('Pin', 0, 0, 15), mode: li('Modo (0 ent · 1 sal · 2 AF · 3 anal)', 0, [0, 1, 2, 3]) }, { q: 'val', min: 1024, max: 1024, text: 'Objetivo: MODER = 0x00000400', hint: 'Pin 5, modo 1: 01 desplazado 10 posiciones.' }, '1 << 10 = 0x400.', { c: 'st_field', h: 'Cada pin ocupa dos bits: el 5 empieza en el bit 10.' }),
      G('st_moder'),
      G('st_bsrr'),
      Q('¿Qué comprueba esta condición?', ['Si el pin PA0 está a nivel alto', 'Si PA0 es salida', 'Si el reloj de GPIOA está activo', 'Si hay una interrupción'], 'IDR refleja el nivel de los pines; el AND aísla el bit 0.', { code: 'if (GPIOA->IDR & (1U << 0)) { ... }', c: 'st_reg', h: 'El AND aísla un bit.' }),
      Q('¿Por qué se escribe 1U << 31 y no 1 << 31?', ['1 es un int con signo: desplazarlo al bit 31 es comportamiento indefinido', 'Por estilo', 'Porque 1U ocupa menos', 'No hay diferencia'], 'Con unsigned el resultado es 0x80000000 sin sorpresas.', { c: 'st_reg', h: 'Con signo o sin signo.' }),
      Nm('Escribes GPIOx->BSRR = (1U << (5 + 16)). ¿Qué bit del registro pones a 1?', 21, '', 'BR5 está en el bit 21: pone el pin 5 a 0.', { c: 'st_bsrr', h: 'El 5 en la mitad alta.' }),
      Q('¿Qué ventaja tiene cambiar un bit por bit-banding?', ['Es atómico: no hay leer-modificar-escribir que una interrupción pueda romper', 'Ocupa menos Flash', 'Funciona en todos los Cortex-M', 'Va a 1 GHz'], 'Una sola escritura cambia un solo bit.', { c: 'st_bsrr', h: 'Piensa en cuántas escrituras hace.' }),
      I('<b>Resumen</b>\n· |= pone a 1, &= ~ pone a 0, ^= invierte, & lee. Nunca = sobre un registro compartido.\n· Campos: limpia y escribe; en MODER el pin n empieza en el bit 2n.\n· BSRR cambia pines en una sola escritura, sin carreras.')
    ]),
    L('st13', 'HAL y LL', 'code', ['st_halcb', 'st_halstatus', 'st_hal'], [
      Q('Envías 1000 bytes por la UART con HAL_UART_Transmit (modo de sondeo). ¿Qué crees que hace la CPU mientras salen?', ['Esperar: nada más hasta que sale el último', 'Otras cosas a la vez', 'Dormir', 'Enviar más rápido'], 'Sondeo es preguntar una y otra vez si ha terminado. Compara con los otros modos.', { ...PRED, c: 'st_halcb', h: 'Sondeo = preguntar sin parar si ha terminado.' }),
      { t: 'explore', text: 'Elige el modo de la HAL y cuántos bytes envías.', viz: 'st_halmode', params: P_HALM(0, 10),
        tasks: [{ q: 'free1000', min: 95, max: 100, text: 'Envía 1000 bytes dejando libre más del 95 % de la CPU', done: 'Con _IT, una interrupción corta por byte.', hint: 'Con 1000 bytes, cambia de modo.' },
          { q: 'free1000', min: 99.5, max: 100, text: 'Ahora deja la CPU casi entera (más del 99,5 %)', done: 'Con _DMA, el DMA mueve los bytes y solo avisa al final.' }] },
      I('La <b>HAL</b> trabaja con <b>manejadores</b>: estructuras como huart2 que guardan la instancia (USART2), la configuración y el estado. Casi cada función devuelve un <b>HAL_StatusTypeDef</b>.', { svg: SVG_HALST }),
      I('Tres estilos para cada periférico: <b>sondeo</b> (bloquea hasta terminar), <b>_IT</b> (vuelve al instante y avisa con un callback desde la interrupción) y <b>_DMA</b> (igual, pero los datos los mueve el DMA).', { code: 'HAL_UART_Transmit(&huart2, buf, n, 100);  // espera\nHAL_UART_Transmit_IT(&huart2, buf, n);    // vuelve ya\n\nvoid HAL_UART_TxCpltCallback(UART_HandleTypeDef *h) {\n  enviado = 1;   // la HAL avisa al acabar\n}', more: 'Los callbacks están declarados __weak: hay una versión vacía en la biblioteca y, si escribes una función con el mismo nombre, el enlazador usa la tuya. Con _IT y _DMA el búfer debe seguir vivo hasta el callback: static o global. El DMA lo verás a fondo en el módulo 6.' }),
      I('La <b>LL</b> (Low Layer) son funciones inline muy finas: LL_GPIO_SetOutputPin acaba siendo una escritura en BSRR. Puedes mezclar: HAL en general y LL o registros en lo crítico.', { svg: SVG_LAYERS }),
      { t: 'steps', text: 'Esperas 4 bytes por la UART y quieres reaccionar si no llegan.', code: 'HAL_StatusTypeDef r =\n  HAL_UART_Receive(&huart2, buf, 4, 100);\nif (r != HAL_OK) {\n  errores++;   /* reintentar o avisar */\n}', steps: ['La función espera hasta 100 ms a que lleguen 4 bytes', 'Si llegan, devuelve <b>HAL_OK</b>', 'Si pasan 100 ms sin los 4 bytes: <b>HAL_TIMEOUT</b>', 'Comprueba el retorno y decide: reintentar, avisar o seguir'], result: 'Ignorar el retorno convierte un cable suelto en datos absurdos.' },
      { t: 'match', q: 'Une cada estado con su significado.', pairs: [['HAL_OK', 'Todo bien'], ['HAL_ERROR', 'Error del periférico o de parámetros'], ['HAL_BUSY', 'El periférico está ocupado con otra operación'], ['HAL_TIMEOUT', 'Se agotó el tiempo de espera']], c: 'st_halstatus', h: 'BUSY = ocupado; TIMEOUT = se acabó el tiempo.' },
      Q('¿Por qué comprobar lo que devuelve esta llamada?', ['Si no llegan los datos, devuelve un error y debes reaccionar', 'Porque si no, no compila', 'Para que vaya más rápido', 'No hace falta nunca'], 'Ignorar errores es el origen de muchos cuelgues raros.', { code: 'if (HAL_UART_Receive(&huart2,\n    buf, 4, 100) != HAL_OK) {\n  /* reintentar o avisar */\n}', c: 'st_halstatus', h: 'Piensa en un cable suelto.' }),
      Q('¿Qué falla aquí?', ['buf es local: desaparece al salir de la función mientras la UART sigue enviándolo', 'Nada', 'Falta el tiempo de espera', 'HAL_UART_Transmit_IT no existe'], 'Con _IT y _DMA el búfer debe seguir vivo hasta el callback: static o global.', { code: 'void enviar(void) {\n  char buf[32] = "hola\\r\\n";\n  HAL_UART_Transmit_IT(&huart2,\n    (uint8_t *)buf, 6);\n}', c: 'st_halcb', h: 'El búfer debe existir hasta el callback.' }),
      Q('¿Qué significa __weak en HAL_UART_TxCpltCallback?', ['Que puedes redefinirla en tu código y el enlazador usará la tuya', 'Que es lenta', 'Que no se puede usar', 'Que se ejecuta en otra tarea'], 'Así la HAL te avisa sin que modifiques sus archivos.', { c: 'st_halcb', h: '«Débil»: se puede sustituir.' }),
      Q('Bucle crítico que conmuta un pin a la máxima velocidad. ¿Qué eliges?', ['LL o registros', 'HAL_GPIO_TogglePin con HAL_Delay', 'printf', 'HAL con DMA'], 'Menos capas, menos ciclos.', { c: 'st_hal', h: 'Menos capas, menos ciclos.' }),
      Q('¿Qué ventaja real tiene la HAL frente a los registros?', ['Portabilidad: el mismo código sirve con pocos cambios en otra familia STM32', 'Es siempre más rápida', 'Ocupa menos Flash', 'No necesita relojes'], 'Pagas en tamaño y velocidad.', { c: 'st_hal', h: 'Piensa en cambiar de familia de chip.' }),
      Q('¿Cuándo tiene sentido STM32duino (Arduino para STM32)?', ['Prototipos rápidos reutilizando bibliotecas de Arduino, aceptando menos control', 'Para producción crítica siempre', 'Nunca', 'Solo para la F7'], 'Para aprender el flujo profesional, mejor CubeMX + HAL o registros.', { c: 'st_hal', h: 'Arduino es comodidad, no control.' }),
      I('<b>Resumen</b>\n· HAL: manejadores, estados que hay que comprobar y callbacks __weak.\n· Sondeo bloquea; _IT y _DMA vuelven ya (búfer vivo hasta el callback).\n· LL y registros para lo crítico; HAL para lo general; Arduino para prototipos.')
    ]),
    L('st14', 'Qué pasa antes de main', 'rocket', ['st_boot', 'st_sections', 'st_fpu'], [
      Q('Declaras int contador; como global, sin valor inicial. Al entrar en main, ¿cuánto crees que vale?', ['0, garantizado', 'Un valor aleatorio', '0xFF', 'Lo que tuviera antes del reset'], 'El lenguaje C lo promete, y alguien tiene que cumplirlo antes de main. Veamos quién.', { ...PRED, c: 'st_sections', h: 'El lenguaje C promete algo para las globales.' }),
      { t: 'explore', text: 'Avanza desde el reset hasta main y mira registros y RAM.', viz: 'st_boot', params: P_BOOT(0),
        tasks: [{ q: 'step', min: 1, max: 1, text: 'Avanza hasta que el núcleo tenga pila', done: 'La palabra 0 de la tabla es el valor inicial del MSP: el final de la RAM.' },
          { q: 'step', min: 4, max: 4, text: 'Llega al paso en que las variables con valor inicial lo reciben', done: '.data se copia de la Flash a la RAM.' },
          { q: 'step', min: 6, max: 6, text: 'Llega hasta main', done: 'Todo esto pasa antes de tu primera línea.' }] },
      I('Al salir de reset, el núcleo lee la <b>tabla de vectores</b> del principio de la Flash: la palabra 0 es el valor inicial de la pila (MSP) y la 1, la dirección de <b>Reset_Handler</b>. Después vienen las direcciones de los manejadores de excepciones e interrupciones.', { code: 'Dirección   Contenido\n0x08000000  0x20020000  <- MSP inicial\n0x08000004  0x080001A9  <- Reset_Handler (+1: Thumb)\n0x08000008  ...         <- NMI_Handler\n0x0800000C  ...         <- HardFault_Handler' }),
      I('Reset_Handler (en startup_stm32f411xe.s) llama a <b>SystemInit</b> (enciende la FPU), copia <b>.data</b> de Flash a RAM, pone <b>.bss</b> a cero y llama a <b>main</b>. Ya dentro de main, SystemClock_Config pone el reloj rápido.', { svg: chain(['Reset', 'MSP y|Reset_Handler', 'SystemInit|(FPU)', 'Copiar .data', '.bss a 0', 'main()']) }),
      I('Dónde acaba cada cosa: <b>.text</b> código (Flash) · <b>.rodata</b> constantes (Flash) · <b>.data</b> globales con valor inicial (Flash y RAM) · <b>.bss</b> globales a cero (RAM).', { code: 'const char msg[] = "hola";  // .rodata\nint n = 7;                  // .data\nint buffer[256];            // .bss\nvoid f(void) { }            // .text', more: '¿Por qué .data está en las dos? El valor inicial (7) debe sobrevivir sin alimentación: vive en la Flash. La variable debe poder cambiar: vive en la RAM. El arranque copia de una a otra. Las static locales con valor inicial también van a .data.' }),
      I('La <b>FPU</b> arranca apagada: SystemInit le da acceso en SCB->CPACR. Si compilas con FPU y quitas esa línea, la primera operación con float provoca un fallo.', { code: 'SCB->CPACR |= (0xFU << 20);  // CP10 y CP11: acceso total' }),
      { t: 'steps', text: 'La primera palabra de la Flash de una F411 vale 0x20020000. ¿Qué es?', steps: ['Es la palabra 0 de la tabla: el <b>MSP</b> inicial', 'La SRAM empieza en 0x20000000 y mide 128 KB = 0x20000 bytes', '0x20000000 + 0x20000 = 0x20020000: <b>el final de la SRAM</b>', 'La pila crece hacia abajo desde ahí'], result: 'La pila empieza en lo más alto de la RAM.' },
      Q('La segunda palabra vale 0x080001A9 (impar). ¿Por qué impar?', ['El bit 0 a 1 indica modo Thumb', 'Es un error', 'Está desalineada a propósito', 'Indica que hay FPU'], 'Los Cortex-M solo ejecutan Thumb: las direcciones de salto llevan el bit 0 a 1.', { c: 'st_boot', h: 'El bit 0 no forma parte de la dirección.' }),
      { t: 'order', q: 'Ordena lo que ocurre desde el reset.', items: ['El núcleo carga el MSP de la primera palabra', 'Salta a Reset_Handler', 'SystemInit activa la FPU', 'Se copia .data y se pone .bss a cero', 'Se llama a main', 'main llama a SystemClock_Config'], e: 'El reloj rápido se configura ya dentro de main.', c: 'st_boot', h: 'La pila es lo primero; el reloj rápido, lo último.' },
      Q('¿En qué sección acaba esta variable?', ['.data: tiene valor inicial distinto de cero', '.bss', 'La pila', '.text'], 'Las static locales viven como globales.', { code: 'void f(void) {\n  static int contador = 5;\n  contador++;\n}', c: 'st_sections', h: 'Las static locales viven como globales.' }),
      { t: 'match', q: 'Une cada declaración global con su sección.', pairs: [['const char msg[] = "hola";', '.rodata (Flash)'], ['int n = 7;', '.data (Flash y RAM)'], ['int buffer[256];', '.bss (RAM a cero)'], ['void f(void) { }', '.text (Flash)']], c: 'st_sections', h: 'const a Flash; con valor, .data; sin valor, .bss.' },
      Q('Si quitas la activación de la FPU de SystemInit y compilas con FPU, ¿qué pasa?', ['Falla con una excepción en la primera instrucción de coma flotante', 'Va más rápido', 'Los float se emulan solos', 'Nada'], 'La FPU arranca apagada.', { c: 'st_fpu', h: 'La FPU arranca apagada.' }),
      Q('Tienes una tabla de 4 KB que nunca cambia. ¿Cómo ahorras 4 KB de RAM?', ['Declarándola const para que quede en Flash', 'Declarándola static', 'Declarándola volatile', 'Poniéndola dentro de main'], 'Sin const iría a .data: Flash y RAM.', { c: 'st_sections', h: 'const la deja en la Flash.' }),
      I('<b>Resumen</b>\n· Tabla de vectores: palabra 0 = MSP; palabra 1 = Reset_Handler (impar, Thumb).\n· Antes de main: SystemInit, copia de .data, .bss a cero.\n· .text y .rodata en Flash; .data en las dos; .bss en RAM.')
    ]),
    L('st15', 'El enlazador y tu memoria', 'memory', ['st_linker', 'st_sections', 'st_hardfault', 'st_toolchain'], [
      Q('Tu programa ocupa 520 KB y el chip tiene 512 KB de Flash. ¿Cuándo crees que te enteras?', ['Al enlazar: el enlazador da un error de región desbordada', 'Al grabar, que falla a mitad', 'Cuando el programa llega a la parte que no cabe', 'Nunca: se comprime solo'], 'El enlazador conoce el tamaño de cada memoria por el script .ld.', { ...PRED, c: 'st_linker', h: 'El enlazador conoce el tamaño de cada memoria.' }),
      { t: 'explore', text: 'Prueba tamaños y reserva el final de la Flash para datos.', viz: 'st_sec', params: P_SEC(256, 200, 16, 0),
        tasks: [{ q: 'resOver', min: 1, max: 1, text: 'Reserva 128 KB para datos con un programa de 400 KB', done: '400 + 128 &gt; 512: no cabe. Reservar quita sitio al programa.', hint: 'Reserva 128 y .text 400.' },
          { q: 'rOver', min: 1, max: 1, text: 'Ahora llena la RAM de más', done: '.data + .bss por encima de 128 KB: el enlazador también lo detecta.' }] },
      I('El <b>script del enlazador</b> (.ld) describe las memorias con MEMORY y dice en cuál va cada sección. Si algo no cabe, error al enlazar.', { code: 'MEMORY {\n  RAM   (xrw) : ORIGIN = 0x20000000, LENGTH = 128K\n  FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 512K\n}' }),
      I('<b>.data</b> tiene dos direcciones: dónde vive (RAM) y dónde se guarda su valor inicial (Flash). El script lo escribe «&gt; RAM AT&gt; FLASH» y exporta símbolos para que el arranque haga la copia.', { code: '.data : {\n  _sdata = .;\n  *(.data*)\n  _edata = .;\n} > RAM AT> FLASH\n_sidata = LOADADDR(.data);' }),
      I('El script reserva un mínimo para la pila y el montón, pero solo comprueba que <b>quepan</b>. En ejecución nadie impide que la pila crezca de más y pise .bss: variables que cambian solas y HardFaults en sitios distintos.', { svg: SVG_STACK }),
      I('Para reservar el último sector de Flash para tus datos, <b>reduce LENGTH</b>: así el programa nunca podrá ocuparlo. Los tamaños suelen ir en hexadecimal: 0x400 = 1024 B.', { code: 'FLASH (rx) : ORIGIN = 0x08000000, LENGTH = 384K\n/* los últimos 128 KB quedan para datos */\n_Min_Stack_Size = 0x400;   /* 1 KB */' }),
      { t: 'steps', text: '_Min_Heap_Size = 0x200 y _Min_Stack_Size = 0x800. ¿Cuántos bytes reserva en total?', steps: ['0x200 = 2 × 256 = <b>512 B</b>', '0x800 = 8 × 256 = <b>2048 B</b>', 'Total: 512 + 2048 = <b>2560 B</b>', 'Es un mínimo: el enlazador comprueba que quepa, no que baste'], result: '2,5 KB reservados.' },
      Q('¿Qué ocurre si tu programa necesita más de 512 KB de Flash con LENGTH = 512K?', ['El enlazador da un error de región FLASH desbordada', 'Se graba solo una parte', 'Se usa la RAM', 'Nada'], 'Mejor un error al compilar que un fallo en el campo.', { c: 'st_linker', h: 'El enlazador comprueba cada región.' }),
      Nm('_Min_Stack_Size = 0x400. ¿Cuántos bytes son?', 1024, 'B', '0x400 = 4 × 256 = 1024 bytes.', { c: 'st_linker', h: '0x100 son 256.' }),
      Q('¿Por qué .data ocupa sitio tanto en Flash como en RAM?', ['Los valores iniciales deben sobrevivir sin alimentación (Flash) y la variable debe poder cambiar (RAM)', 'Por seguridad', 'Es un error del enlazador', 'Para ir más rápido'], 'El arranque copia de un sitio al otro.', { c: 'st_sections', h: 'Valor inicial frente a variable que cambia.' }),
      G('st_memUse'),
      Q('¿Qué síntoma suele dar un desbordamiento de pila sin RTOS?', ['Variables globales que cambian solas y HardFaults aleatorios', 'Un error de compilación', 'Un mensaje claro en la consola', 'Que el LED parpadee más rápido'], 'La pila ha invadido otras zonas de la RAM.', { c: 'st_hardfault', h: 'La pila pisa otras zonas.' }),
      Q('¿Para qué sirve el archivo .map?', ['Para ver cuánto ocupa cada función y variable y en qué dirección quedó', 'Para depurar sin cables', 'Para configurar los pines', 'Para guardar datos en Flash'], 'Lo primero que se mira cuando la memoria se llena.', { c: 'st_toolchain', h: 'Es lo primero que miras cuando algo no cabe.' }),
      Q('Quieres usar el último sector de 128 KB para datos. ¿Qué cambias en el .ld?', ['Reducir LENGTH de FLASH para que el programa no pueda ocuparlo', 'Nada', 'Aumentar la RAM', 'Mover .bss'], 'Si no, una actualización que crezca borraría tus datos o tu código.', { c: 'st_linker', h: 'Lo que no está en LENGTH, el programa no lo usa.' }),
      I('<b>Resumen</b>\n· MEMORY dice dónde empieza y cuánto mide cada memoria; si no cabe, error al enlazar.\n· .data se guarda en Flash y vive en RAM.\n· El enlazador no vigila la pila en ejecución. Reserva sectores reduciendo LENGTH.')
    ]),
    L('st24', 'SysTick, HAL_Delay y el tiempo', 'timer', ['st_systick', 'st_tick', 'st_cycles'], [
      Q('HAL_Delay(1) promete esperar 1 ms. ¿Cuánto crees que puede llegar a durar?', ['Casi 2 ms', 'Exactamente 1 ms', 'Menos de 1 ms', '1 µs'], 'El contador avanza a saltos de 1 ms y HAL_Delay añade uno para garantizar el mínimo. Primero, de dónde salen esos saltos.', { ...PRED, c: 'st_tick', h: 'El contador avanza a saltos de 1 ms.' }),
      { t: 'explore', text: 'El SysTick cuenta hacia abajo desde LOAD. Elige reloj y cuántas interrupciones por segundo quieres.', viz: 'st_tick', params: P_TICK(16, 1),
        tasks: [{ q: 'load', min: 83999, max: 83999, text: 'Consigue un tick de 1 ms a 84 MHz', done: 'LOAD = 84 000 − 1.', hint: '84 MHz y 1000 Hz.' },
          { q: 'fits', min: 0, max: 0, text: 'Busca una combinación que no quepa en 24 bits', done: 'A 84 MHz, una interrupción por segundo pediría 84 millones de cuentas: no caben.' }] },
      I('El <b>SysTick</b> es un temporizador de 24 bits del propio núcleo (todo Cortex-M lo tiene). Cuenta hacia abajo desde LOAD hasta 0, genera una excepción y vuelve a empezar: cada vuelta son LOAD + 1 ciclos.', { tune: { viz: 'st_tick', params: P_TICK(84, 1000) } }),
      I('HAL_Init programa el SysTick a 1 ms. Cada interrupción suma 1 a un contador: <b>HAL_GetTick()</b> lo devuelve, como millis() en Arduino. <b>HAL_Delay(n)</b> espera a que avance n + 1 veces para garantizar al menos n ms.', { code: 'void SysTick_Handler(void) {\n  HAL_IncTick();   // suma 1 cada ms\n}\n\nuint32_t t0 = HAL_GetTick();' }),
      I('El contador es un uint32_t: desborda a los 2³² ms ≈ <b>49,7 días</b>. Compara siempre <b>diferencias</b> (ahora − antes): la resta sin signo sigue funcionando al dar la vuelta.', { code: 'if (HAL_GetTick() - t0 >= 500) {   // bien\n  t0 += 500;\n}\nif (HAL_GetTick() >= t0 + 500) {   // mal al desbordar\n}' }),
      I('Para microsegundos, el tick de 1 ms no sirve: usa un temporizador hardware o el contador de ciclos <b>DWT->CYCCNT</b>.', { code: 'void espera_us(uint32_t us) {\n  uint32_t c = us * (SystemCoreClock / 1000000);\n  uint32_t t0 = DWT->CYCCNT;\n  while (DWT->CYCCNT - t0 < c) { }\n}' }),
      { t: 'steps', text: 'SysTick a 72 MHz con una interrupción cada 1 ms. ¿LOAD?', steps: ['Ciclos por interrupción = f × t', '72 000 000 × 0,001 = <b>72 000</b> ciclos', 'Cada vuelta dura LOAD + 1 ciclos', 'LOAD = 72 000 − 1 = <b>71 999</b>'], result: 'Cabe de sobra en 24 bits (máximo 16 777 215).' },
      G('st_systick'),
      Nm('Con 24 bits a 100 MHz, ¿cuál es el periodo máximo del SysTick en ms?', 167.77, 'ms', '2²⁴ / 100 MHz = 16 777 216 / 100 000 000 ≈ 0,168 s.', { tol: 0.2, c: 'st_systick', h: '2²⁴ ciclos entre la frecuencia.' }),
      Q('¿Por qué HAL_Delay(1) puede durar casi 2 ms?', ['Empieza en un punto cualquiera del ms actual y añade un tick para garantizar el mínimo', 'Porque la HAL es lenta', 'Porque el SysTick va a 500 Hz', 'Por un error de la F4'], 'Para esperas cortas y precisas, un temporizador o el contador de ciclos.', { c: 'st_tick', h: 'Piensa en el tick extra de garantía.' }),
      Q('¿Funciona esta comparación cuando HAL_GetTick() desborda y vuelve a 0?', ['Sí: la resta sin signo da el tiempo transcurrido correcto', 'No, falla en el desbordamiento', 'Solo los primeros 49 días', 'Solo con int'], 'La aritmética de uint32_t es módulo 2³².', { code: 'if (HAL_GetTick() - t0 >= 500) {\n  t0 = HAL_GetTick();\n  /* cada 500 ms */\n}', c: 'st_tick', h: 'Resta de enteros sin signo.' }),
      Nm('Un contador de ms de 32 bits, ¿cuántos días tarda en desbordar?', 49.71, 'días', '2³² ms / 1000 / 86 400 ≈ 49,7 días.', { tol: 0.1, c: 'st_tick', h: '2³² ms entre los ms de un día (86 400 000).' }),
      Q('¿Qué tiene de malo esta versión?', ['Al desbordar, t0 + 500 da la vuelta y la condición se cumple antes de tiempo', 'Nada', 'Es más lenta', 'No compila'], 'Compara diferencias, no instantes.', { code: 'if (HAL_GetTick() >= t0 + 500) {\n  ...\n}', c: 'st_tick', h: '¿Qué pasa cuando t0 + 500 no cabe en 32 bits?' }),
      Q('Necesitas esperas de 5 µs. ¿Qué usas?', ['Un temporizador hardware o el contador de ciclos DWT', 'HAL_Delay con un argumento pequeño', 'El SysTick a 1 ms', 'printf'], 'El tick de la HAL tiene resolución de 1 ms.', { c: 'st_cycles', h: 'El tick de la HAL es de 1 ms.' }),
      I('<b>Resumen</b>\n· SysTick: 24 bits, LOAD = ciclos por interrupción − 1.\n· HAL_GetTick cuenta ms; HAL_Delay(n) dura entre n y n + 1 ms.\n· Compara ahora − antes; para microsegundos, CYCCNT o un temporizador.')
    ]),
    PRJ('st-p3', 'Proyecto: parpadeo solo con registros', 'st_bare')
  ] };

  const CLK_FIX = (m, n, pp, a1, a2) => ({ ...P_CLK(25, m, n, pp, a1, a2), HSE: { label: 'HSE', val: 25, fixed: true } });
  const M4 = { id: 'st-m4', title: 'Relojes y GPIO', desc: 'HSI, HSE, PLL, buses y wait states; modos de pin, open-drain, funciones alternativas y BSRR.', nodes: [
    L('st16', 'Fuentes de reloj', 'timer', ['st_clksrc', 'st_32k', 'st_hsi', 'st_usbclk'], [
      Q('Usas el oscilador interno de 16 MHz (HSI, ±1 %) para llevar la hora. ¿Cuánto crees que puede desviarse en un día?', ['Hasta unos 14 minutos', 'Menos de un segundo', 'Unos segundos', 'Nada: es digital'], 'Un 1 % de 86 400 s son 864 s. Compara fuentes.', { ...PRED, c: 'st_clksrc', h: 'Calcula el 1 % de los segundos de un día.' }),
      { t: 'explore', text: 'Elige una fuente de reloj y mira cuánto se desviaría si la usaras para dar la hora.', viz: 'st_osc', params: P_OSC(0, 1),
        tasks: [{ q: 'sday', min: 0, max: 3, text: 'Encuentra una fuente que se desvíe menos de 3 s al día', done: 'Los cristales (HSE y LSE) son cientos de veces más precisos que los osciladores RC.', hint: 'Prueba HSE o LSE.' },
          { q: 'sday', min: 3600, max: 1e9, text: 'Encuentra la peor: más de una hora al día', done: 'El LSI puede ir de unos 17 a 47 kHz: vale para el watchdog, nunca para la hora.' }] },
      I('Cinco fuentes en una F4:\n<b>HSI</b>: RC interno de 16 MHz; arranca al instante.\n<b>HSE</b>: cristal externo (4–26 MHz); preciso.\n<b>LSI</b>: RC de unos 32 kHz para el watchdog.\n<b>LSE</b>: cristal de 32,768 kHz para el reloj de tiempo real (RTC).\n<b>PLL</b>: multiplica para llegar a la frecuencia máxima.', { tune: { viz: 'st_osc', params: P_OSC(1, 30) } }),
      I('Tras el reset, una F4 funciona con el <b>HSI</b>. Es ya dentro de main donde SystemClock_Config arranca el HSE y el PLL. Hasta entonces, todo va a 16 MHz.', { svg: SVG_HSI, more: 'Lo mismo pasa al despertar del modo de bajo consumo Stop, que verás en el último módulo: el chip vuelve con el HSI.' }),
      I('El HSE tarda en arrancar: hay que esperar a <b>HSERDY</b>. En modo <b>bypass</b> entra por OSC_IN un reloj ya hecho (muchas Nucleo usan los 8 MHz que da el ST-LINK). El <b>CSS</b> vigila el HSE: si falla, pasa al HSI y avisa con una NMI.', { code: 'RCC->CR |= RCC_CR_HSEON;\nwhile (!(RCC->CR & RCC_CR_HSERDY)) { }  // espera al cristal' }),
      I('¿Por qué 32 768 Hz? Porque es <b>2¹⁵</b>: dividiendo 15 veces entre 2 sale 1 Hz exacto. Y el <b>USB</b> necesita 48 MHz exactos y precisos: se sacan del HSE a través del PLL.', { svg: SVG_32K }),
      { t: 'steps', text: 'Cuánto se desvía el HSI (±1 %) en una semana.', steps: ['1 % de un segundo es 0,01 s', 'Un día son 86 400 s: 86 400 × 0,01 = <b>864 s</b>', 'En una semana: 864 × 7 = 6048 s', '≈ <b>1 h 41 min</b>'], result: 'Un cristal de ±20 ppm se desviaría unos 12 s en esa semana.' },
      { t: 'match', q: 'Une cada fuente con su uso típico.', pairs: [['HSI', 'Arranque rápido sin componentes externos'], ['HSE', 'Reloj principal preciso'], ['LSI', 'Watchdog independiente'], ['LSE', 'Reloj de tiempo real']], c: 'st_clksrc', h: 'Las «L» son lentas (kHz); las «H», rápidas (MHz).' },
      Q('¿Por qué el USB necesita el HSE (o un oscilador interno con corrección especial)?', ['El USB exige una precisión que el HSI de ±1 % no garantiza', 'Porque el HSI es demasiado lento', 'Porque el USB funciona a 32 kHz', 'No lo necesita'], 'El USB de velocidad completa admite un error mucho menor.', { c: 'st_usbclk', h: 'El USB pide precisión.' }),
      Q('¿Por qué los cristales de reloj son de 32 768 Hz?', ['Porque 32 768 = 2¹⁵: dividiendo 15 veces entre 2 sale 1 Hz', 'Por tradición', 'Porque es la frecuencia de la red', 'Porque es el máximo'], 'Un contador binario de 15 bits da los segundos.', { c: 'st_32k', h: 'Busca la potencia de 2.' }),
      Q('En CubeMX eliges «BYPASS Clock Source» para el HSE. ¿Qué significa?', ['Que por OSC_IN entra una señal de reloj externa, sin cristal', 'Que se desactiva el HSE', 'Que se usa el HSI', 'Que el reloj se salta el PLL'], 'El oscilador interno del HSE se apaga.', { c: 'st_clksrc', h: 'Sin cristal: una señal ya hecha.' }),
      Q('¿Qué hace el Clock Security System?', ['Si el HSE falla, conmuta al HSI y genera una interrupción NMI', 'Cifra el reloj', 'Impide cambiar el PLL', 'Protege la Flash contra lectura'], 'Útil en equipos que no pueden quedarse sin reloj.', { c: 'st_clksrc', h: 'Seguridad del reloj: vigila el cristal.' }),
      Q('¿Qué hace este bucle?', ['Espera a que el cristal HSE arranque y se estabilice', 'Apaga el HSE', 'Mide la frecuencia', 'Reinicia el chip'], 'Un cristal tarda en arrancar.', { code: 'RCC->CR |= RCC_CR_HSEON;\nwhile (!(RCC->CR & RCC_CR_HSERDY)) { }', c: 'st_clksrc', h: 'RDY viene de «ready».' }),
      Q('En la primera línea de main de una F411, ¿a qué frecuencia va?', ['16 MHz, con el HSI', '100 MHz', '25 MHz, con el HSE', '32 kHz'], 'El PLL se configura después, en SystemClock_Config.', { c: 'st_hsi', h: 'El PLL aún no está configurado.' }),
      Nm('¿Cuántas veces hay que dividir 32 768 Hz entre 2 para obtener 1 Hz?', 15, '', '2¹⁵ = 32 768.', { c: 'st_32k', h: '¿2 elevado a qué da 32 768?' }),
      I('<b>Resumen</b>\n· HSI y LSI: RC internos, rápidos de arrancar pero imprecisos. HSE y LSE: cristales precisos.\n· El chip arranca con el HSI; SystemClock_Config pasa al PLL.\n· 32 768 Hz = 2¹⁵; el USB pide 48 MHz exactos.')
    ]),
    L('st17', 'El PLL a fondo', 'timer', ['st_clock', 'st_usbclk'], [
      Q('El PLL de la F4 divide la entrada entre M, la multiplica por N y la divide entre P. Con un cristal de 25 MHz, ¿crees que puedes sacar 96 MHz exactos?', ['Sí: 25 / 25 × 192 / 2 = 96', 'No: 96 no es múltiplo de 25', 'Solo con un cristal de 8 MHz', 'Solo con el HSI'], 'Dividir primero hasta 1 MHz lo hace fácil. Pruébalo.', { ...PRED, c: 'st_clock', h: 'Divide primero hasta 1 MHz.' }),
      { t: 'explore', text: 'Black Pill F411 con cristal de 25 MHz. Las cajas rojas están fuera de límite.', viz: 'st_clock', params: CLK_FIX(12, 100, 2, 1, 1),
        tasks: [{ q: 'usbOk', min: 95.9, max: 96.1, text: 'Consigue 96 MHz con el USB a 48 MHz y todo en verde', done: 'VCO = 192 MHz: ÷2 = 96 MHz y ÷4 = 48 MHz para el USB.', hint: 'M = 25, N = 192, P = 2 y APB1 ÷2.' },
          { q: 'sysOk', min: 99.9, max: 100.1, text: 'Ahora 100 MHz, el máximo de la F411', done: 'N = 200: pero 200 no es múltiplo de 48, así que no hay USB a 100 MHz.', hint: 'N = 200, P = 2 y APB1 ÷2 (máximo 50 MHz).' }] },
      I('Tres pasos y una fórmula:\n<b>÷M</b> deja la entrada del VCO en 1–2 MHz.\n<b>×N</b> sube el VCO a 100–432 MHz.\n<b>÷P</b> (2, 4, 6 u 8) da SYSCLK.\n<b>SYSCLK = fent × N / (M × P)</b>', { svg: chain(['HSE 25 MHz', '÷M = 25|1 MHz', '×N = 192|VCO 192 MHz', '÷P = 2|96 MHz']) }),
      I('Del mismo VCO sale <b>÷Q</b> para el USB, que necesita 48 MHz exactos: el VCO debe ser múltiplo de 48. Por eso la Black Pill suele ir a 96 MHz y no a 100.', { svg: SVG_USBCLK }),
      I('Respeta los límites del chip: 84 MHz en la F401, 100 MHz en la F411, 168 MHz en la F407, 180 MHz en la F446. Fuera de especificación «parece que funciona» hasta que cambian la temperatura o la tensión.', { tune: { viz: 'st_clock', params: CLK_FIX(25, 192, 2, 2, 1) } }),
      { t: 'steps', text: 'Nucleo-F446 con HSE de 8 MHz (bypass): consigue 180 MHz.', steps: ['÷M = 4 → entrada del VCO = <b>2 MHz</b>', '×N = 180 → VCO = <b>360 MHz</b> (dentro de 100–432)', '÷P = 2 → SYSCLK = <b>180 MHz</b>', 'USB: 360 / 48 = 7,5, no es entero: sin 48 MHz desde este VCO'], result: '180 MHz, el máximo de la F446 (que tiene otro PLL para sacar los 48 MHz).' },
      G('st_sysclk'),
      Q('¿Por qué la entrada del VCO se deja entre 1 y 2 MHz?', ['Es el rango en que el PLL funciona bien; con 2 MHz hay menos jitter', 'Para gastar menos', 'Porque M no puede ser mayor', 'No importa'], 'Fuera de rango, el PLL puede no engancharse.', { c: 'st_clock', h: 'Es el rango de trabajo del PLL.' }),
      Nm('VCO = 384 MHz. ¿Qué Q da 48 MHz para el USB?', 8, '', '384 / 48 = 8.', { c: 'st_usbclk', h: 'Divide el VCO entre 48.' }),
      G('st_sysclk'),
      Q('¿Por qué no subir la F411 a 120 MHz si «parece que funciona»?', ['Fuera de especificación no hay garantía: fallos raros con la temperatura o la tensión', 'Porque se apaga', 'Porque el PLL no lo permite matemáticamente', 'No hay ningún problema'], 'Un producto debe funcionar en todo el rango, no solo en tu mesa.', { c: 'st_clock', h: 'Especificación = garantía.' }),
      Q('Blue Pill (F103): HSE de 8 MHz y multiplicador del PLL ×9. ¿SYSCLK?', ['72 MHz', '9 MHz', '64 MHz', '81 MHz'], 'La F1 tiene un PLL más sencillo: solo multiplica.', { c: 'st_clock', h: 'La F1 solo multiplica.' }),
      Q('VCO = 200 MHz. ¿Puedes sacar 48 MHz exactos para el USB?', ['No: 200 / 48 no es entero', 'Sí, con Q = 4', 'Sí, con Q = 5', 'Sí, el USB acepta 50 MHz'], 'Q debe ser entero.', { c: 'st_usbclk', h: '¿Es 200 múltiplo de 48?' }),
      G('st_sysclk'),
      I('<b>Resumen</b>\n· SYSCLK = fent × N / (M × P), con la entrada del VCO en 1–2 MHz y el VCO en 100–432 MHz.\n· El USB necesita un VCO múltiplo de 48 MHz.\n· Respeta el máximo de cada chip.')
    ]),
    L('st18', 'Buses, preescaladores y wait states', 'bus', ['st_apb', 'st_waitst', 'st_rccen', 'st_cubemx'], [
      Q('F411 a 100 MHz con el bus APB1 dividido entre 2 (50 MHz). ¿A qué frecuencia crees que cuenta el temporizador TIM2, que cuelga de APB1?', ['100 MHz', '50 MHz', '25 MHz', '200 MHz'], 'Los temporizadores tienen una regla especial: lo verás en esta lección. Antes, la Flash.', { ...PRED, c: 'st_apb', h: 'Los temporizadores tienen una regla especial.' }),
      { t: 'explore', text: 'La Flash es más lenta que la CPU. Elige frecuencia y ciclos de espera.', viz: 'st_ws', params: P_WS(16, 0),
        tasks: [{ q: 'ok100', min: 1, max: 1, text: 'Pon 100 MHz sin que la CPU tropiece', done: 'A 100 MHz la Flash de la F411 pide 3 ciclos de espera.', hint: 'Sube los wait states.' },
          { q: 'just48', min: 1, max: 1, text: 'A 48 MHz, usa los wait states justos', done: '1 WS: poner más sería perder velocidad sin motivo.' }] },
      I('SYSCLK alimenta el bus <b>AHB</b> (núcleo, DMA y GPIO) y de él cuelgan <b>APB1</b> (lento: USART2, TIM2–5, I²C) y <b>APB2</b> (rápido: USART1, TIM1, ADC, SPI1, SYSCFG). En la F411 los máximos son 100, 50 y 100 MHz.', { tune: { viz: 'st_clock', params: CLK_FIX(25, 200, 2, 2, 1) } }),
      I('Regla de los temporizadores: si el divisor de su APB es 1, reciben PCLK; si es mayor que 1, reciben <b>el doble de PCLK</b>. Es el error más común al calcular un PWM.', { svg: chain(['SYSCLK|100 MHz', 'APB1 ÷2|PCLK1 50 MHz', 'TIM2–5|×2 = 100 MHz']) }),
      I('A más frecuencia, más <b>wait states</b> (LATENCY en FLASH->ACR). El acelerador ART de la F4 esconde casi toda la espera. Al subir la frecuencia, <b>primero</b> los wait states; al bajarla, <b>después</b>.', { tune: { viz: 'st_ws', params: P_WS(100, 3) } }),
      I('Cada periférico abre su reloj antes de configurarse. CubeMX lo escribe en la función Msp; con registros, lo haces tú en RCC.', { code: '/* stm32f4xx_hal_msp.c */\nvoid HAL_UART_MspInit(UART_HandleTypeDef *h) {\n  __HAL_RCC_USART2_CLK_ENABLE();\n  __HAL_RCC_GPIOA_CLK_ENABLE();\n  /* PA2 y PA3 en función alternativa */\n}' }),
      { t: 'steps', text: 'F407 a 168 MHz con APB1 ÷4. ¿A qué frecuencia cuenta TIM3?', steps: ['TIM3 cuelga de APB1', 'PCLK1 = 168 / 4 = <b>42 MHz</b>', 'El divisor (4) no es 1: el temporizador recibe el doble', 'TIM3 cuenta a <b>84 MHz</b>'], result: '84 MHz: con este número calcularás los temporizadores.' },
      { t: 'match', q: 'STM32F4: une cada periférico con su bus.', pairs: [['GPIOA', 'AHB1'], ['USART2', 'APB1'], ['USART1', 'APB2'], ['TIM3', 'APB1 ']], c: 'st_apb', h: 'Los GPIO van en AHB1; USART2 y TIM3, en el bus lento.' },
      Q('F411 a 100 MHz con APB1 ÷2 (50 MHz). ¿A qué frecuencia cuenta TIM2?', ['100 MHz', '50 MHz', '25 MHz', '200 MHz'], 'Divisor distinto de 1: el temporizador recibe 2 × 50 MHz.', { c: 'st_apb', h: 'Divisor distinto de 1: ×2.' }),
      Nm('F407 a 168 MHz con APB1 ÷4. ¿Reloj de TIM3 en MHz?', 84, 'MHz', 'PCLK1 = 42 MHz y, como ÷4 ≠ 1, el temporizador recibe 84 MHz.', { c: 'st_apb', h: 'Primero PCLK1; luego la regla del ×2.' }),
      Q('Subes SYSCLK sin aumentar los wait states. ¿Qué pasa?', ['La CPU lee instrucciones mal y el programa se cuelga o da HardFault', 'Va más rápido', 'La Flash se borra', 'Nada'], 'CubeMX ajusta FLASH_LATENCY por ti; con registros, tú.', { c: 'st_waitst', h: 'La Flash no llega a tiempo.' }),
      Q('¿En qué orden pasas de 16 MHz a 100 MHz?', ['Primero subes los wait states y después cambias SYSCLK al PLL', 'Primero el PLL y luego los wait states', 'Da igual', 'Primero bajas los wait states'], 'Al bajar la frecuencia, al revés.', { c: 'st_waitst', h: 'Nunca menos esperas de las que pide la frecuencia actual.' }),
      Q('¿Dónde genera CubeMX esta línea?', ['En HAL_UART_MspInit (stm32f4xx_hal_msp.c)', 'En el arranque en ensamblador', 'En main.h', 'En el script del enlazador'], 'Cada periférico abre su reloj antes de configurarse.', { code: '__HAL_RCC_USART2_CLK_ENABLE();', c: 'st_cubemx', h: 'Busca la función Msp.' }),
      Q('Configuras la USART1 por registros y no responde. Abriste el reloj en APB1ENR. ¿Qué falla?', ['USART1 cuelga de APB2: su reloj se abre en APB2ENR', 'Falta volatile', 'Falta un HAL_Delay', 'La USART1 no existe en la F4'], 'Cada periférico, en el registro de su bus.', { c: 'st_rccen', h: 'Mira de qué bus cuelga la USART1.' }),
      I('<b>Resumen</b>\n· AHB para núcleo, DMA y GPIO; APB1 lento y APB2 rápido.\n· Temporizadores: ×2 si el divisor de su APB no es 1.\n· Wait states: súbelos antes de subir la frecuencia.')
    ]),
    L('st19', 'GPIO: modos y configuración', 'chip', ['st_gpio', 'st_od', 'st_pinlim', 'st_leak', 'st_field'], [
      Q('Dos placas comparten un cable de «alarma». Una pone su pin a 3,3 V (push-pull) y la otra a 0 V a la vez. ¿Qué crees que pasa?', ['Un cortocircuito entre los dos pines', 'Gana la de 3,3 V', 'Gana la de 0 V sin problemas', 'La línea queda a 1,65 V tranquilamente'], 'Dos salidas empujando en sentidos opuestos. Pruébalo y arréglalo.', { ...PRED, c: 'st_od', h: 'Dos salidas que empujan en sentidos contrarios…' }),
      { t: 'explore', text: 'Tu pin y otra placa comparten una línea.', viz: 'st_pin', params: P_PIN(1, 0, 0, 0, 0),
        tasks: [{ q: 'short', min: 1, max: 1, text: 'Provoca el corto: tu pin a 1 en push-pull y la otra placa tirando a 0', done: 'Dos salidas peleando: mucha corriente y pines en peligro.', hint: 'Escribe 1 y haz que la otra tire a 0.' },
          { q: 'odok', min: 1, max: 1, text: 'Arréglalo: que la otra pueda bajar la línea sin pelea', done: 'Open-drain con pull-up: cualquiera puede tirar a 0 sin cortocircuito.', hint: 'Open-drain y pull-up.' },
          { q: 'rel', min: 1, max: 1, text: 'Ahora que nadie tire: la línea debe subir a 3,3 V', done: 'Cuando todos sueltan, la pull-up sube la línea.' }] },
      I('Cada puerto (GPIOA, GPIOB…) tiene 16 pines y estos registros: <b>MODER</b> (modo, 2 bits) · <b>OTYPER</b> (push-pull u open-drain) · <b>OSPEEDR</b> (velocidad de flancos) · <b>PUPDR</b> (pull-up o pull-down) · <b>IDR</b> (leer) · <b>ODR</b> y <b>BSRR</b> (escribir) · <b>AFR</b> (función alternativa).', { tune: { viz: 'st_reg', params: { pin: sl('Pin', 3, 0, 15), mode: li('Modo (0 ent · 1 sal · 2 AF · 3 anal)', 3, [0, 1, 2, 3]) } } }),
      I('<b>Push-pull</b> empuja a 3,3 V y tira a 0 V. <b>Open-drain</b> solo tira a 0; el 1 lo pone una pull-up. Así varios dispositivos comparten una línea sin cortos, como en I²C.', { tune: { viz: 'st_pin', params: P_PIN(1, 1, 1, 0, 1) } }),
      I('Las pull-up internas son de unos <b>40 kΩ</b>: valen para un pulsador, pero son lentas para un bus. La línea sube como un RC: con 40 kΩ y 100 pF, τ = 4 µs.', { tune: { viz: 'st_rc', params: P_RC(40, 100, 100) } }),
      I('<b>OSPEEDR</b> no fija la frecuencia, sino lo rápidos que son los flancos: más rapidez, más interferencias. Usa la más baja que funcione. Y deja los pines sin usar en <b>modo analógico</b>: una entrada digital al aire oscila y consume.', { svg: SVG_PINLIM }),
      { t: 'steps', text: '¿Valen las pull-up internas para un I²C a 400 kHz con 100 pF de bus?', steps: ['Subida del 30 al 70 %: t ≈ 0,85 × R × C', 'Con 40 kΩ: 0,85 × 40 000 × 100 pF ≈ <b>3,4 µs</b>', 'El I²C rápido admite como mucho <b>0,3 µs</b> de subida', 'Hace falta R ≤ 3,5 kΩ: pon externas de 2,2 kΩ'], result: 'Con 2,2 kΩ, unos 0,19 µs. Funciona.' },
      { t: 'match', q: 'Une cada valor de MODER con su modo.', pairs: [['00', 'Entrada'], ['01', 'Salida'], ['10', 'Función alternativa'], ['11', 'Analógico']], c: 'st_gpio', h: 'En orden: entrada, salida, alternativa, analógico.' },
      Q('Varias placas comparten una línea de «alarma» activa a nivel bajo. ¿Cómo configuras los pines?', ['Open-drain con una pull-up común', 'Push-pull en todas', 'Analógico', 'Entrada sin pull'], 'Cualquiera puede tirar a 0 sin pelearse con las demás.', { c: 'st_od', h: 'Cualquiera debe poder tirar a 0.' }),
      TU('Bus I²C a 400 kHz con 200 pF: elige una pull-up que funcione.', 'st_rc', { R: li('Pull-up', 40, [1, 2.2, 4.7, 10, 40], 'kΩ', 1), C: { val: 200, fixed: true }, f: { val: 400, fixed: true } }, { q: 'ok400', min: 1, max: 1, text: 'Objetivo: subida de 300 ns como mucho', hint: 'Baja mucho la resistencia.' }, 'Con 1 kΩ, unos 0,17 µs. Cuanta más capacidad, menor resistencia.', { c: 'st_od', h: 'τ = R × C: con más capacidad, menos resistencia.' }),
      Q('¿Qué velocidad de pin eliges para un LED?', ['Baja', 'Muy alta', 'Alta', 'Da igual siempre'], 'Un LED no necesita flancos de nanosegundos.', { c: 'st_pinlim', h: 'Un LED no necesita flancos rápidos.' }),
      Q('¿Por qué conviene poner los pines sin usar en modo analógico?', ['Se desconecta el disparador digital y se reduce el consumo', 'Para medirlos luego', 'Para que sean tolerantes a 5 V', 'Para que hagan de pull-up'], 'Una entrada digital al aire puede oscilar y consumir.', { c: 'st_leak', h: 'Piensa en una entrada digital al aire.' }),
      Q('Un relé de 70 mA conectado directamente a un pin. ¿Qué opinas?', ['Mal: un pin da unos 25 mA; usa un transistor con diodo', 'Bien', 'Bien si el pin es FT', 'Bien a velocidad baja'], 'Además hay un límite total para todo el chip.', { c: 'st_pinlim', h: 'Compara con el límite de un pin.' }),
      G('st_moder'),
      I('<b>Resumen</b>\n· MODER elige el modo; OTYPER, push-pull u open-drain; PUPDR, las pull.\n· Open-drain + pull-up para compartir líneas; pull-up externas para buses rápidos.\n· Velocidad de pin la mínima; pines libres en analógico.')
    ]),
    L('st20', 'Funciones alternativas y escritura atómica', 'chip', ['st_af', 'st_bsrr', 'st_gpio'], [
      Q('PA2 puede ser un GPIO, el TX de la USART2 o un canal de un temporizador. ¿Cómo crees que se elige?', ['Con el modo «función alternativa» y un número AF por pin', 'Soldando un puente', 'Lo decide el periférico que arranque antes', 'Cada pin solo tiene una función'], 'Hay un registro con 4 bits por pin. Pruébalo.', { ...PRED, c: 'st_af', h: 'Un registro con 4 bits por pin.' }),
      { t: 'explore', text: 'Elige pin y número de función alternativa.', viz: 'st_afr', params: P_AFR(0, 0),
        tasks: [{ q: 'sel', min: 39, max: 39, text: 'Configura PA2 como TX de USART2 (AF7)', done: 'PA2 está en AFR[0]: su campo empieza en el bit 8.', hint: 'Pin 2 y AF 7.' },
          { q: 'sel', min: 167, max: 167, text: 'Ahora PA10 como RX de USART1 (también AF7)', done: 'Pines 8–15 en AFR[1]: PA10 es su pin 2.' },
          { q: 'sel', min: 98, max: 98, text: 'Y PA6 como canal 1 de TIM3 (AF2)', done: 'Campo en los bits 27–24 de AFR[0].' }] },
      I('Con MODER = 10, el pin lo maneja un periférico. Cuál, lo dice <b>AFR</b>: <b>AFR[0]</b> para los pines 0–7 y <b>AFR[1]</b> para los 8–15, con 4 bits por pin (AF0–AF15). El campo del pin n empieza en el bit 4 × (n mod 8).', { tune: { viz: 'st_afr', params: P_AFR(9, 7) } }),
      I('Funciones típicas en la F4: <b>AF1</b> TIM1/TIM2 · <b>AF2</b> TIM3–5 · <b>AF4</b> I²C · <b>AF5</b> SPI1/SPI2 · <b>AF7</b> USART1/USART2 · <b>AF8</b> USART6. La tabla exacta de cada pin está en la hoja de datos.', { svg: table([['AF1', 'TIM1, TIM2'], ['AF2', 'TIM3, TIM4, TIM5'], ['AF4', 'I²C1–3'], ['AF5', 'SPI1, SPI2'], ['AF7', 'USART1, USART2']], 'STM32F4, las más usadas') }),
      I('Con el pin en función alternativa, el buffer de entrada sigue vivo: <b>IDR</b> muestra el nivel real de un RX. Y <b>LCKR</b> puede congelar la configuración de un pin hasta el siguiente reset.', { code: 'if (GPIOA->IDR & (1U << 3)) {\n  /* RX de la USART2 en reposo: alto */\n}' }),
      I('Y recuerda <b>BSRR</b>: una sola escritura que pone a 1 (bits 0–15) o a 0 (bits 16–31) sin leer antes. Ninguna interrupción puede colarse, y puedes subir un pin y bajar otro a la vez.', { tune: { viz: 'st_bsrr', params: P_BSRR(20) } }),
      { t: 'steps', text: 'PA9 como TX de USART1 (AF7), por registros.', code: 'GPIOA->MODER &= ~(3U << 18);\nGPIOA->MODER |=  (2U << 18);\nGPIOA->AFR[1] &= ~(0xFU << 4);\nGPIOA->AFR[1] |=  (7U << 4);', steps: ['Modo: el campo de PA9 empieza en 2 × 9 = 18; valor 10 (= 2)', '9 ≥ 8: va en <b>AFR[1]</b>, como su pin 9 − 8 = 1', 'Su campo empieza en 4 × 1 = <b>4</b>', 'Limpia con ~(0xFU &lt;&lt; 4) y escribe 7U &lt;&lt; 4'], result: 'PA9 queda conectado a USART1_TX.' },
      Q('¿Dónde se configura la función alternativa de PA9?', ['En AFR[1], bits 4 a 7', 'En AFR[0], bits 36 a 39', 'En MODER', 'En AFR[1], bits 9 a 12'], 'PA9 es el pin 1 dentro de AFR[1]: (9 − 8) × 4 = 4.', { c: 'st_af', h: 'Resta 8 si el pin es 8 o más.' }),
      Nm('PA2 como TX de USART2 (AF7). ¿Qué valor decimal tiene el campo ya desplazado en AFR[0]?', 1792, '', '7 << (4 × 2) = 7 << 8 = 1792 (0x700).', { c: 'st_af', h: '7 desplazado 4 × 2 bits.' }),
      Q('¿Qué hace esta línea?', ['Pone AF7 en el pin 2 (si el campo estaba a cero)', 'Pone PA7 como salida', 'Activa USART7', 'Borra AFR'], 'Cuatro bits por pin: el pin 2 empieza en el bit 8.', { code: 'GPIOA->AFR[0] |= (7U << (4 * 2));', c: 'st_af', h: 'Cuatro bits por pin.' }),
      { t: 'match', q: 'STM32F4: une cada función con su AF habitual.', pairs: [['USART2_TX en PA2', 'AF7'], ['I2C1_SCL en PB6', 'AF4'], ['SPI1_SCK en PA5', 'AF5'], ['TIM3_CH1 en PA6', 'AF2']], c: 'st_af', h: 'USART1/2 son AF7; I²C, AF4; SPI1, AF5.' },
      Q('main hace GPIOB->ODR ^= (1U << 0) y una interrupción cambia PB7 a la vez. ¿Riesgo?', ['Que el cambio de PB7 se pierda si llega entre la lectura y la escritura de ODR', 'Ninguno', 'Que se queme el pin', 'Que PB0 pase a entrada'], 'Con BSRR cada uno toca solo su bit.', { c: 'st_bsrr', h: 'Leer-modificar-escribir.' }),
      Q('¿Qué hace esta línea?', ['Pone PB3 a 1 y PB4 a 0 a la vez', 'Pone PB3 y PB4 a 1', 'Pone PB3 a 0', 'Configura PB3 y PB4 como salida'], 'Bit 3 = poner a 1 PB3; bit 20 = poner a 0 PB4.', { code: 'GPIOB->BSRR = (1U << 3) | (1U << (4 + 16));', c: 'st_bsrr', h: 'La mitad baja sube; la alta baja.' }),
      Q('Un pin está en modo alternativo como RX de una UART. ¿Puedes leer su nivel en IDR?', ['Sí: el buffer de entrada sigue activo en modo alternativo', 'No, siempre lee 0', 'Solo si es push-pull', 'Solo en la F1'], 'Útil para depurar o detectar actividad.', { c: 'st_gpio', h: 'El buffer de entrada no se apaga.' }),
      Q('¿Qué hace el registro LCKR?', ['Bloquea la configuración de un pin hasta el siguiente reset', 'Cifra el puerto', 'Bloquea la Flash', 'Desactiva el reloj del puerto'], 'Protege pines críticos de escrituras accidentales.', { c: 'st_gpio', h: '«Lock».' }),
      I('<b>Resumen</b>\n· MODER = 10 y un número AF en AFR[0] (pines 0–7) o AFR[1] (8–15), 4 bits por pin.\n· La tabla de AF de cada pin está en la hoja de datos.\n· BSRR: cambios de pin atómicos.')
    ]),
    PRJ('st-p4', 'Proyecto: laboratorio de relojes', 'st_mco'),
    PRJ('st-p5', 'Proyecto: cerradura con teclado y display', 'st_keypad')
  ] };

  const NVICP = { pA: sl('Prioridad TIM2', 5, 0, 15), pB: sl('Prioridad USART2', 8, 0, 15) };
  const PWMP = (psc, arr, ccr) => ({ F: { label: 'fTIM', val: 84, fixed: true }, PSC: { label: 'PSC', val: psc, list: [0, 1, 3, 7, 15, 41, 83, 99, 167, 839, 999], dec: 0 }, ARR: { label: 'ARR', val: arr, list: [99, 199, 255, 399, 499, 999, 1999, 4095, 9999, 65535], dec: 0 }, CCR: { label: 'CCR', val: ccr, list: [0, 25, 50, 100, 125, 250, 300, 500, 750, 1000, 1500, 2000, 2500, 5000, 7500, 10000], dec: 0 } });
  const SVG_ONEPULSE = SV(110, tx(4, 28, 'disparo') + `<path d="M60 40H90V20H96V40H290" fill="none" stroke="var(--ice)" stroke-width="2.2"/>` + tx(4, 78, 'salida') + `<path d="M60 90H150V66H230V90H290" fill="none" stroke="var(--led)" stroke-width="2.4"/>` + `<path d="M93 48H150" stroke="var(--muted)" stroke-dasharray="3 3"/>` + tm(122, 58, 'retardo') + tm(190, 60, 'ancho exacto') + tx(4, 106, 'Un solo pulso y el contador se para', 'vizsm', 'fill:currentColor'));
  const SVG_CENTER = SV(120, `<path d="M20 90L80 20L140 90L200 20L260 90" fill="none" stroke="var(--ice)" stroke-width="2.2"/><path d="M20 60H270" stroke="var(--err)" stroke-dasharray="4 3"/>` + tx(272, 64, 'CCR', 'vizsm', 'fill:var(--err)') + `<path d="M20 112V104H54V112M106 112V104H174V112M226 112V104H260" fill="none" stroke="var(--led)" stroke-width="2"/>` + tx(20, 14, 'sube hasta ARR y baja hasta 0: PWM simétrico', 'vizsm'));
  const M5 = { id: 'st-m5', title: 'Interrupciones y temporizadores', desc: 'Excepciones y NVIC, prioridades y datos compartidos, EXTI y temporizadores: PWM, captura, encoder y tiempo muerto.', nodes: [
    L('st21', 'Excepciones y el NVIC', 'timer', ['st_irq', 'st_irqsetup'], [
      Q('Escribes el manejador como void USART2_IRQhandler(void), con h minúscula. ¿Qué crees que pasa al llegar la interrupción?', ['Se ejecuta un manejador por defecto: un bucle infinito', 'Funciona igual', 'Error de compilación', 'Se ignora la interrupción'], 'La tabla de vectores busca un nombre exacto. Veamos todas las piezas.', { ...PRED, c: 'st_irqsetup', h: 'La tabla de vectores busca un nombre exacto.' }),
      { t: 'explore', text: 'Una interrupción necesita cuatro piezas. Actívalas y mira qué pasa con cada combinación.', viz: 'st_irqcfg', params: P_IRQ(0, 0, 0, 0),
        tasks: [{ q: 'st', min: 1, max: 3, text: 'Consigue que la petición llegue a la CPU', done: 'Hacen falta las dos activaciones: en el periférico y en el NVIC.', hint: 'Activa las dos primeras piezas.' },
          { q: 'st', min: 2, max: 2, text: 'Haz que entre en tu manejador', done: 'Con el nombre exacto entra… pero sin borrar la bandera vuelve a entrar sin parar.' },
          { q: 'st', min: 3, max: 3, text: 'Que funcione bien', done: 'Periférico, NVIC, nombre exacto y bandera borrada.' }] },
      I('Una <b>excepción</b> hace que el núcleo deje lo que hacía, guarde su contexto y salte a la dirección de la tabla de vectores. Las 15 primeras son del sistema; desde la 16, las <b>IRQ</b> de los periféricos. El <b>NVIC</b> (controlador de interrupciones del núcleo) decide cuál pasa.', { svg: table([['Reset', 'Arranque del programa'], ['HardFault', 'Error grave del núcleo'], ['SVCall · PendSV', 'Las usa un RTOS'], ['SysTick', 'Temporizador del núcleo'], ['IRQ 0, 1, 2…', 'Periféricos: USART, TIM, EXTI…']], 'La tabla de vectores') }),
      I('Al entrar, el hardware guarda solo 8 registros: los que una función de C puede machacar. Por eso un manejador es una <b>función normal de C</b>. En un M3 o un M4 la entrada tarda unos 12 ciclos.', { svg: SVG_IRQSTACK }),
      I('Las cuatro piezas, por registros:', { code: 'USART2->CR1 |= USART_CR1_RXNEIE;   // 1. en el periférico\nNVIC_SetPriority(USART2_IRQn, 5);\nNVIC_EnableIRQ(USART2_IRQn);       // 2. en el NVIC\n\nvoid USART2_IRQHandler(void) {     // 3. nombre exacto\n  uint8_t c = USART2->DR;          // 4. leer DR borra RXNE\n  guardar(c);\n}' }),
      I('Dos trucos del NVIC: el <b>encadenamiento</b> (tail-chaining) salta de una interrupción a la siguiente pendiente sin desapilar y volver a apilar; la <b>llegada tardía</b> atiende antes a una más urgente que llega mientras se apila.', { svg: chain(['Apilar', 'ISR A', 'ISR B|(encadenada)', 'Desapilar']) }),
      { t: 'steps', text: 'Activa la interrupción de recepción de la USART2 con la HAL.', code: 'HAL_NVIC_SetPriority(USART2_IRQn, 5, 0);\nHAL_NVIC_EnableIRQ(USART2_IRQn);\nHAL_UART_Receive_IT(&huart2, &rx, 1);', steps: ['SetPriority: prioridad 5, subprioridad 0', 'EnableIRQ: el NVIC deja pasar la línea de la USART2', 'Receive_IT activa RXNEIE en el periférico', 'USART2_IRQHandler (lo genera CubeMX) llama a HAL_UART_IRQHandler, que borra la bandera y te avisa con HAL_UART_RxCpltCallback'], result: 'Las cuatro piezas, repartidas entre CubeMX y la HAL.' },
      Q('¿Por qué en un Cortex-M no hace falta escribir los manejadores en ensamblador?', ['El hardware guarda los registros que C puede machacar, así que vale una función normal', 'Porque el compilador lo convierte', 'Porque no hay interrupciones anidadas', 'Porque la HAL lo hace'], 'Fue una decisión de diseño de ARM.', { c: 'st_irq', h: 'El hardware guarda lo que C puede machacar.' }),
      { t: 'match', q: 'Une cada excepción con su papel.', pairs: [['Reset', 'Arranque del programa'], ['HardFault', 'Error grave del núcleo'], ['SysTick', 'Temporizador del sistema'], ['PendSV', 'Cambio de contexto del RTOS']], c: 'st_irq', h: 'PendSV la usa el sistema operativo.' },
      { t: 'order', q: 'Ordena los pasos para una interrupción de recepción por registros.', items: ['Configurar la USART', 'Activar RXNEIE en USART2->CR1', 'Fijar la prioridad y NVIC_EnableIRQ(USART2_IRQn)', 'Escribir USART2_IRQHandler', 'Dentro, leer DR (eso borra RXNE)'], e: 'Si no borras la bandera, la interrupción vuelve a entrar sin fin.', c: 'st_irqsetup', h: 'Del periférico al manejador.' },
      Q('Olvidas borrar la bandera dentro del manejador. ¿Qué pasa?', ['La interrupción vuelve a entrar sin parar y main no avanza', 'Se borra sola siempre', 'Se pierde una interrupción', 'Nada'], 'Unas banderas se borran leyendo un registro; otras, escribiendo en él.', { c: 'st_irqsetup', h: 'Bandera pendiente = vuelve a entrar.' }),
      Q('¿Qué ventaja da el encadenamiento de interrupciones?', ['Se ahorra desapilar y volver a apilar entre dos interrupciones seguidas', 'Permite interrupciones infinitas', 'Cambia las prioridades', 'Desactiva el SysTick'], 'Menos ciclos perdidos en ráfagas.', { c: 'st_irq', h: 'Se ahorra un paso entre dos ISR.' }),
      Q('¿Qué hacen estas dos líneas de la HAL?', ['Fijan prioridad 5 (subprioridad 0) a la USART2 y la activan en el NVIC', 'Activan la USART2', 'Desactivan la interrupción', 'Configuran 5 interrupciones'], 'CubeMX las genera en la inicialización de la UART.', { code: 'HAL_NVIC_SetPriority(USART2_IRQn, 5, 0);\nHAL_NVIC_EnableIRQ(USART2_IRQn);', c: 'st_irqsetup', h: 'Prioridad y activación en el NVIC.' }),
      Q('¿Cómo se borra la bandera RXNE de la USART2 en una F4?', ['Leyendo USART2->DR', 'Escribiendo un 0 en todo SR', 'Se borra sola al salir del manejador', 'Desactivando el NVIC'], 'Leer el dato recibido basta.', { c: 'st_irqsetup', h: 'Leer el dato es suficiente.' }),
      I('<b>Resumen</b>\n· El hardware apila 8 registros: el manejador es una función de C.\n· Cuatro piezas: periférico, NVIC, nombre exacto y borrar la bandera.\n· Encadenamiento y llegada tardía ahorran ciclos.')
    ]),
    L('st22', 'Prioridades y datos compartidos', 'timer', ['st_nvic', 'st_shared', 'st_isrrules'], [
      Q('main hace contador++ y una interrupción también hace contador++. Empieza en 0 y cada uno suma una vez. ¿Puede acabar valiendo 1?', ['Sí, si la interrupción llega en mitad del ++ de main', 'No, siempre 2', 'No, siempre 0', 'Solo si contador no es volatile'], 'contador++ son tres pasos. Míralo.', { ...PRED, c: 'st_shared', h: 'contador++ son tres pasos.' }),
      { t: 'explore', text: 'Elige cuándo llega la interrupción durante el contador++ de main.', viz: 'st_race', params: P_RACE(0, 0),
        tasks: [{ q: 'lost', min: 1, max: 1, text: 'Haz que se pierda un incremento', done: 'La ISR llegó entre leer y escribir: main escribió un valor viejo.', hint: 'Que llegue en medio.' },
          { q: 'safe', min: 1, max: 1, text: 'Protégelo aunque la interrupción llegue en el peor momento', done: 'Con una sección crítica, la ISR espera a que main termine.' }] },
      I('Los M3, M4, M7 y M33 de ST usan <b>4 bits</b> de prioridad: de 0 (más urgente) a 15. Una interrupción solo interrumpe a otra si su número es <b>menor</b>. Con el mismo número, espera su turno.', { tune: { viz: 'st_nvic', params: NVICP } }),
      I('Los 4 bits se reparten entre <b>expropiación</b> (quién interrumpe a quién) y <b>subprioridad</b> (quién va primero si dos esperan a la vez). La HAL usa por defecto el grupo 4: 16 niveles de expropiación y ninguna subprioridad.', { svg: table([['Expropiación', 'Decide quién interrumpe a quién'], ['Subprioridad', 'Solo desempata entre pendientes'], ['Grupo 4 (HAL)', '16 niveles de expropiación, 0 de sub'], ['Grupo 2', '4 y 4']]) }),
      I('HAL_Delay espera a que avance el contador del SysTick. Si la llamas dentro de una interrupción igual o más urgente que el SysTick, este nunca entra y el programa se cuelga.', { code: 'void USART2_IRQHandler(void) {   // prioridad 0\n  HAL_Delay(10);   // SysTick en 15: nunca llega\n}' }),
      I('Una <b>sección crítica</b> corta protege los datos compartidos: guarda PRIMASK, desactiva las interrupciones, toca el dato y restaura. Solo los accesos alineados de hasta 32 bits son atómicos: un uint64_t son dos.', { code: 'uint32_t p = __get_PRIMASK();\n__disable_irq();\ncontador++;          // nadie puede colarse\n__set_PRIMASK(p);' }),
      { t: 'steps', text: 'TIM2 tiene prioridad 5 y USART2 prioridad 2. Llega USART2 mientras se atiende TIM2.', steps: ['Compara números: 2 &lt; 5', 'USART2 es <b>más urgente</b>', 'El NVIC apila el contexto de TIM2 y entra en USART2', 'Al acabar USART2, TIM2 sigue donde estaba'], result: 'Anidamiento: la más urgente pasa delante.' },
      TU('Haz que USART2 no tenga que esperar a que acabe TIM2.', 'st_nvic', NVICP, { q: 'latB', min: 0, max: 0.05, text: 'Objetivo: USART2 sin espera', hint: 'USART2 necesita un número de prioridad MENOR que TIM2.' }, 'Con un número menor, USART2 expropia a TIM2.', { c: 'st_nvic', h: 'Número menor = más urgente.' }),
      Q('TIM2 y USART2 tienen ambas prioridad 6. Llega USART2 mientras se atiende TIM2…', ['Espera a que TIM2 termine', 'Interrumpe a TIM2', 'Se pierde', 'Se atiende en paralelo'], 'Con la misma prioridad de expropiación no hay anidamiento.', { c: 'st_nvic', h: 'Igual no basta para interrumpir.' }),
      Q('Dos interrupciones con expropiación 3 y subprioridades 0 y 1 están pendientes a la vez. ¿Qué pasa?', ['Se atiende primero la de subprioridad 0 y la otra después, sin interrumpirla', 'La de subprioridad 0 interrumpe a la otra', 'Se atienden a la vez', 'Se pierde una'], 'La subprioridad solo desempata.', { c: 'st_nvic', h: 'La subprioridad solo ordena la cola.' }),
      Q('Llamas a HAL_Delay(10) en una interrupción con prioridad 0 y el SysTick tiene prioridad 15. ¿Qué pasa?', ['Se cuelga: el SysTick nunca puede interrumpir para avanzar el tiempo', 'Espera 10 ms', 'Espera 0 ms', 'Se reinicia'], 'Nada de esperas dentro de interrupciones.', { c: 'st_isrrules', h: '¿Puede entrar el SysTick?' }),
      Q('Una interrupción incrementa un uint64_t y main lo lee. ¿Qué riesgo hay?', ['Leer una mitad antigua y otra nueva: 64 bits son dos accesos', 'Ninguno', 'Que se desborde enseguida', 'Que no compile'], 'Léelo con las interrupciones desactivadas.', { c: 'st_shared', h: '¿Cuántos accesos son 64 bits en un micro de 32?' }),
      Q('¿Por qué guardar PRIMASK en vez de llamar sin más a __enable_irq() al final?', ['Para no activar las interrupciones si ya estaban desactivadas al entrar', 'Porque es más rápido', 'Porque __enable_irq no existe', 'Para cambiar la prioridad'], 'Así la función se puede llamar desde cualquier sitio.', { code: 'uint32_t p = __get_PRIMASK();\n__disable_irq();\n/* sección crítica muy corta */\n__set_PRIMASK(p);', c: 'st_shared', h: '¿Y si ya estaban desactivadas al entrar?' }),
      Q('¿Cuánto debe durar una sección crítica?', ['Lo mínimo posible: mientras dura, ninguna interrupción se atiende', 'Lo que haga falta', 'Al menos 1 ms', 'Toda la función main'], 'Cada microsegundo se suma al retardo de todas.', { c: 'st_shared', h: 'Mientras dura, nadie más entra.' }),
      I('<b>Resumen</b>\n· NVIC: número menor = más urgente; solo una expropiación menor interrumpe.\n· Nada de HAL_Delay ni printf en interrupciones.\n· Datos compartidos: volatile y una sección crítica muy corta.')
    ]),
    L('st23', 'EXTI: interrupciones por pin', 'chip', ['st_exti', 'st_halcb', 'st_rccen', 'st_debounce', 'st_irqsetup'], [
      Q('Pones un botón en PA3 y otro en PB3, cada uno con su interrupción. ¿Crees que funcionarán los dos a la vez?', ['No: comparten la misma línea EXTI', 'Sí, sin problema', 'Solo si usan flancos distintos', 'Solo con la HAL'], 'Las líneas EXTI van por número de pin. Compruébalo.', { ...PRED, c: 'st_exti', h: 'Las líneas EXTI van por número de pin.' }),
      { t: 'explore', text: 'Botón A en el puerto A y botón B en el puerto B. Elige sus números de pin.', viz: 'st_exti', params: P_EXTI(0, 0),
        tasks: [{ q: 'ok', min: 1, max: 1, text: 'Haz que cada botón tenga su propia línea', done: 'Con números distintos, cada uno su línea.', hint: 'Cambia el número de uno de los pines.' },
          { q: 'sh', min: 1, max: 1, text: 'Que los dos entren por el mismo manejador sin chocar', done: 'Las líneas 5–9 (o 10–15) comparten manejador: dentro miras cuál saltó.' }] },
      I('El <b>EXTI</b> genera interrupciones por flancos en los pines. Tiene 16 líneas para GPIO, una por <b>número</b> de pin: PA0, PB0 y PC0 comparten la línea 0. SYSCFG->EXTICR elige qué puerto va a cada línea.', { tune: { viz: 'st_exti', params: P_EXTI(13, 4) } }),
      I('Manejadores: las líneas 0 a 4 tienen uno cada una; las 5–9 comparten <b>EXTI9_5_IRQHandler</b> y las 10–15, <b>EXTI15_10_IRQHandler</b>. Por registros, la bandera se borra escribiendo un 1 en EXTI->PR.', { code: 'void EXTI15_10_IRQHandler(void) {\n  if (EXTI->PR & (1U << 13)) {\n    EXTI->PR = (1U << 13);   // escribir 1 borra\n    pulsado = 1;             // volatile\n  }\n}' }),
      I('Con la HAL, el pin se configura como GPIO_EXTI en CubeMX y escribes un solo callback para todas las líneas. Por registros, abre antes el reloj de <b>SYSCFG</b> (APB2ENR): ahí está EXTICR.', { code: 'void HAL_GPIO_EXTI_Callback(uint16_t pin) {\n  if (pin == GPIO_PIN_13) pulsado = 1;\n}' }),
      I('Los rebotes del curso base siguen aquí: cada rebote es un flanco y cada flanco, una interrupción. Ignora lo que llegue en los 20 ms siguientes a la primera.', { svg: SVG_BOUNCE, code: 'if (HAL_GetTick() - ultimo > 20) {\n  ultimo = HAL_GetTick();\n  pulsado = 1;\n}' }),
      { t: 'steps', text: 'El botón de la Nucleo (PC13) con interrupción, por registros.', steps: ['Abre los relojes de GPIOC y de SYSCFG', 'En EXTICR[3], el campo de la línea 13: elige el puerto C', 'En el EXTI, activa la línea 13 en IMR y el flanco de bajada en FTSR', 'En el NVIC, activa EXTI15_10_IRQn y escribe su manejador'], result: 'Dentro del manejador, comprueba y borra el bit 13 de EXTI->PR.' },
      { t: 'match', q: 'Une cada pin con su manejador.', pairs: [['PA0', 'EXTI0_IRQHandler'], ['PB4', 'EXTI4_IRQHandler'], ['PC7', 'EXTI9_5_IRQHandler'], ['PC13', 'EXTI15_10_IRQHandler']], c: 'st_exti', h: 'Del 5 al 9 y del 10 al 15 se comparten.' },
      Q('¿Por qué el callback comprueba qué pin es?', ['Porque es el mismo callback para todas las líneas EXTI', 'Por estilo', 'Porque la HAL lo exige al compilar', 'Para borrar la bandera'], 'Una sola función recibe todos los avisos.', { c: 'st_halcb', h: 'Un solo callback para todas.' }),
      Q('Configuras EXTICR por registros y no funciona. ¿Qué reloj olvidaste?', ['El de SYSCFG, en RCC->APB2ENR', 'El de GPIOA', 'El del EXTI', 'El del SysTick'], 'Sin reloj, la escritura en SYSCFG->EXTICR no tiene efecto.', { c: 'st_rccen', h: 'EXTICR vive en SYSCFG.' }),
      Q('Un pulsador con EXTI dispara 5 interrupciones por pulsación. ¿Solución?', ['Ignorar nuevas interrupciones durante unos 20 ms tras la primera, o filtrar con RC', 'Subir la prioridad', 'Usar flanco de bajada', 'Quitar la pull-up'], 'Son los rebotes del contacto.', { c: 'st_debounce', h: 'Son rebotes.' }),
      Q('¿Cómo se borra la bandera pendiente de la línea 13 en la F4 por registros?', ['Escribiendo un 1 en el bit 13 de EXTI->PR', 'Escribiendo un 0 en el bit 13 de EXTI->PR', 'Leyendo GPIOC->IDR', 'Se borra sola'], 'Bandera de tipo «escribe 1 para borrar».', { c: 'st_irqsetup', h: 'Aquí se escribe un 1 para borrar.' }),
      Q('¿Puedes tener interrupciones independientes en PA5 y PC5 a la vez?', ['No: los dos usan la línea EXTI5', 'Sí, sin problema', 'Solo con la HAL', 'Solo si uno es de subida y otro de bajada'], 'Solo un puerto puede estar conectado a cada línea.', { c: 'st_exti', h: 'Mismo número, misma línea.' }),
      Q('¿Qué manejador atiende una interrupción en PB12?', ['EXTI15_10_IRQHandler', 'EXTI12_IRQHandler', 'EXTI9_5_IRQHandler', 'EXTI2_IRQHandler'], 'Las líneas 10–15 comparten manejador.', { c: 'st_exti', h: 'El 12 está entre el 10 y el 15.' }),
      I('<b>Resumen</b>\n· Una línea EXTI por número de pin; EXTICR elige el puerto (abre SYSCFG).\n· 5–9 y 10–15 comparten manejador: mira qué línea saltó y borra su bit de PR.\n· Antirrebote: ignora 20 ms tras la primera interrupción.')
    ]),
    L('st25', 'Temporizadores: PSC y ARR', 'timer', ['st_timer', 'st_halcb'], [
      Q('Un temporizador cuenta a 84 MHz y quieres una interrupción cada 1 ms. ¿Crees que puede hacerlo?', ['Sí: hay que dividir 84 000 entre un preescalador y un contador', 'No: 84 MHz es demasiado rápido', 'Solo con el SysTick', 'Hay que bajar el reloj del chip'], 'Dos divisores en cadena. Juega con ellos.', { ...PRED, c: 'st_timer', h: 'Dos divisores en cadena.' }),
      { t: 'explore', text: 'fTIM = 84 MHz. PSC divide el reloj; ARR marca dónde vuelve a 0 el contador.', viz: 'st_pwm', params: PWMP(0, 99, 50),
        tasks: [{ q: 'f', min: 999, max: 1001, text: 'Consigue exactamente 1 kHz', done: 'PSC = 83 da ticks de 1 µs y ARR = 999 cuenta 1000.', hint: '84 MHz ÷ 84 = 1 MHz; luego 1000 pasos.' },
          { q: 'f', min: 9.99, max: 10.01, text: 'Ahora 10 Hz', done: 'PSC = 839 y ARR = 9999: 84 MHz / 840 / 10 000.' }] },
      I('Tipos en la F4: <b>avanzados</b> (TIM1, y TIM8 en algunos modelos), <b>de uso general</b> (TIM2–TIM5; TIM2 y TIM5 de 32 bits), TIM9–TIM11 más sencillos y, en algunos modelos, <b>básicos</b> (TIM6 y TIM7). Cuentan con el reloj de su APB (×2 si el divisor no es 1).', { svg: table([['TIM1 (TIM8)', 'Avanzados: potencia y motores'], ['TIM2 · TIM5', 'Uso general, 32 bits'], ['TIM3 · TIM4', 'Uso general, 16 bits'], ['TIM9–TIM11', 'Sencillos'], ['TIM6 · TIM7', 'Básicos (no en la F411)']], 'Temporizadores de la F4') }),
      I('El preescalador divide entre <b>PSC + 1</b> y el contador va de 0 a ARR: <b>ARR + 1</b> pasos.\n<b>f = fTIM / ((PSC + 1) · (ARR + 1))</b>', { tune: { viz: 'st_pwm', params: PWMP(83, 999, 500) } }),
      I('Al llegar a ARR, el contador vuelve a 0 y genera un <b>evento de actualización</b>. Con la HAL, su interrupción llega a un callback común para todos los temporizadores.', { code: 'HAL_TIM_Base_Start_IT(&htim3);\n\nvoid HAL_TIM_PeriodElapsedCallback(\n    TIM_HandleTypeDef *htim) {\n  if (htim->Instance == TIM3) tarea_1ms();\n}' }),
      I('Con <b>ARPE</b> (precarga de ARR), un ARR nuevo se aplica en la siguiente actualización, no a mitad de periodo: sin periodos raros al cambiar la frecuencia en marcha.', { code: '__HAL_TIM_SET_AUTORELOAD(&htim3, 499);\n/* con ARPE: se aplica al acabar el periodo */' }),
      { t: 'steps', text: 'TIM3 a 84 MHz: diseña una interrupción a 50 Hz.', steps: ['Elige un tick cómodo: 84 MHz ÷ 840 = 100 kHz → <b>PSC = 839</b>', 'Ticks por periodo: 100 000 / 50 = 2000 → <b>ARR = 1999</b>', 'Comprueba: 84 MHz / (840 × 2000) = 50 Hz', 'ARR = 1999 cabe en 16 bits (máximo 65 535)'], result: 'PSC = 839 y ARR = 1999.' },
      G('st_pwmFreq'),
      G('st_pscArr'),
      Q('¿Qué hace esta pareja de llamada y callback?', ['Arranca TIM6 con interrupción y ejecuta el callback en cada desbordamiento', 'Genera PWM', 'Mide una frecuencia', 'Hace un retardo bloqueante'], 'Es la interrupción de actualización.', { code: 'HAL_TIM_Base_Start_IT(&htim6);\n\nvoid HAL_TIM_PeriodElapsedCallback(\n    TIM_HandleTypeDef *htim) {\n  if (htim->Instance == TIM6) tarea();\n}', c: 'st_halcb', h: 'Base_Start_IT y PeriodElapsed: arranque y desbordamiento.' }),
      Q('¿Por qué se comprueba htim->Instance en el callback?', ['El mismo callback lo llaman todos los temporizadores', 'Para borrar la bandera', 'Para cambiar ARR', 'No hace falta'], 'Una sola función recibe todos los avisos.', { c: 'st_halcb', h: 'Un solo callback para todos.' }),
      Nm('TIM2 (32 bits) a 100 MHz con PSC = 0 y ARR = 0xFFFFFFFF. ¿Segundos hasta desbordar?', 42.95, 's', '2³² / 100 MHz ≈ 42,9 s, con resolución de 10 ns.', { tol: 0.1, c: 'st_timer', h: '2³² cuentas entre la frecuencia.' }),
      G('st_pwmFreq'),
      Q('A 84 MHz, alguien pone PSC = 84 y ARR = 1000 para tener 1 kHz. ¿Qué sale?', ['≈ 987 Hz: sobra un +1 en cada registro', '1 kHz exacto', '1,01 kHz', '84 kHz'], '84 MHz / (85 × 1001) ≈ 987 Hz. Los registros guardan «divisor − 1».', { c: 'st_timer', h: 'Los registros guardan divisor − 1.' }),
      I('<b>Resumen</b>\n· f = fTIM / ((PSC + 1)(ARR + 1)): primero un tick cómodo, luego cuántos ticks.\n· El evento de actualización llega a un callback común: mira htim->Instance.\n· ARPE aplica el ARR nuevo al final del periodo.')
    ]),
    L('st26', 'PWM, captura y encoder', 'wave', ['st_duty', 'st_capture'], [
      Q('PWM con ARR = 999. Si pones CCR = 250, ¿qué ciclo de trabajo crees que sale?', ['25 %', '250 %', '2,5 %', '75 %'], 'Hay ARR + 1 = 1000 pasos por periodo. Pruébalo.', { ...PRED, c: 'st_duty', h: 'Hay ARR + 1 pasos por periodo.' }),
      { t: 'explore', text: 'La salida está alta mientras el contador está por debajo de CCR.', viz: 'st_pwm', params: PWMP(83, 999, 750),
        tasks: [{ q: 'duty', min: 24.9, max: 25.1, text: 'Pon el ciclo de trabajo al 25 %', done: 'CCR = 250 de 1000 pasos.', hint: 'El 25 % de 1000 pasos.' },
          { q: 'duty', min: 49.9, max: 50.1, text: 'Ahora un 50 %', done: 'CCR = (ARR + 1) / 2: con ARR = 999, CCR = 500.' }] },
      I('Cada temporizador tiene hasta 4 canales. En <b>PWM modo 1</b> la salida está alta mientras CNT &lt; CCR: <b>duty = CCR / (ARR + 1)</b>. Lo cambias en marcha con __HAL_TIM_SET_COMPARE.', { tune: { viz: 'st_pwm', params: PWMP(83, 999, 250) }, code: 'HAL_TIM_PWM_Start(&htim3, TIM_CHANNEL_1);\n__HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 250);' }),
      I('<b>Captura de entrada</b>: en el flanco elegido, el temporizador copia CNT en CCR. Restando dos capturas tienes el periodo en ticks. El modo <b>PWM input</b> usa dos canales para medir a la vez periodo y tiempo en alto.', { code: 'void HAL_TIM_IC_CaptureCallback(TIM_HandleTypeDef *h) {\n  uint32_t c = HAL_TIM_ReadCapturedValue(h, TIM_CHANNEL_1);\n  periodo = c - anterior;   // en ticks\n  anterior = c;\n}' }),
      I('<b>Modo encoder</b>: las señales A y B en cuadratura mueven el contador arriba o abajo. Contando los flancos de las dos tienes 4 cuentas por pulso (×4).', { tune: { viz: 'st_enc', params: P_ENC(12, 4, 1) } }),
      I('<b>Un solo pulso</b> (one-pulse): tras un disparo, el temporizador da un único pulso de duración exacta y se para. Útil para disparar algo con un retardo preciso.', { svg: SVG_ONEPULSE }),
      { t: 'steps', text: 'Servo a 50 Hz con ticks de 1 µs: centra el servo.', steps: ['Ticks de 1 µs con fTIM = 84 MHz: PSC = 83', '50 Hz = 20 ms = 20 000 ticks → <b>ARR = 19 999</b>', 'El centro de un servo es un pulso de 1,5 ms', '1,5 ms = 1500 ticks → <b>CCR = 1500</b>'], result: 'Con ticks de 1 µs, CCR es el ancho del pulso en µs.' },
      G('st_duty'),
      Q('ARR = 999. ¿Qué ciclo de trabajo da esta línea?', ['30 %', '0,3 %', '3 %', '33 %'], '300 / (999 + 1).', { code: '__HAL_TIM_SET_COMPARE(&htim3,\n  TIM_CHANNEL_1, 300);', c: 'st_duty', h: '300 de cada 1000 pasos.' }),
      Nm('Con ticks de 1 MHz, dos capturas seguidas difieren en 25 000. ¿Frecuencia en Hz?', 40, 'Hz', 'Periodo = 25 000 µs = 25 ms → 40 Hz.', { c: 'st_capture', h: 'Periodo = diferencia × tick; f = 1 / periodo.' }),
      TU('Consigue exactamente 1320 cuentas por vuelta del eje de salida.', 'st_enc', P_ENC(7, 1, 1), { q: 'cpr', min: 1320, max: 1320, text: 'Objetivo: 1320 cuentas por vuelta', hint: '11 pulsos, ×4 y reductora 30.' }, '11 × 4 × 30 = 1320.', { c: 'st_capture', h: 'Pulsos × modo × reductora.' }),
      Q('¿Para qué sirve el modo de un solo pulso (one-pulse)?', ['Para generar un único pulso de duración precisa tras un disparo', 'Para contar pulsos', 'Para bajar el consumo', 'Para medir frecuencia'], 'El contador se detiene solo tras un periodo.', { c: 'st_capture', h: 'Lo dice su nombre.' }),
      Nm('Servo a 50 Hz con ticks de 1 µs (ARR = 19 999). ¿Qué CCR da un pulso de 1,2 ms?', 1200, '', '1,2 ms = 1200 ticks de 1 µs.', { c: 'st_duty', h: 'Pasa los ms a µs.' }),
      G('st_duty'),
      I('<b>Resumen</b>\n· PWM modo 1: duty = CCR / (ARR + 1).\n· Captura: diferencia entre dos capturas × tick = periodo.\n· Encoder ×4: 4 cuentas por pulso, por la reductora.')
    ]),
    L('st27', 'Temporizadores avanzados y tiempo muerto', 'timer', ['st_deadtime', 'st_advtim', 'st_timer'], [
      Q('En un medio puente, el transistor de arriba se apaga y el de abajo se enciende en el mismo instante. ¿Qué crees que pasa?', ['Un instante conducen los dos: cortocircuito de la alimentación', 'Nada: es instantáneo', 'El motor gira al revés', 'El PWM se para'], 'Un transistor tarda en apagarse. Míralo en el tiempo.', { ...PRED, c: 'st_deadtime', h: 'Un transistor tarda en apagarse.' }),
      { t: 'explore', text: 'CH1 maneja el transistor de arriba y CH1N el de abajo. Ajusta el tiempo muerto.', viz: 'st_dead', params: P_DEAD(0, 200),
        tasks: [{ q: 'safe200', min: 1, max: 1, text: 'Evita el cortocircuito con un transistor que tarda 200 ns en apagarse', done: 'DTG = 20: 200 ns de tiempo muerto.', hint: 'Sube DTG.' },
          { q: 'safe400', min: 1, max: 1, text: 'Ahora uno más lento, de 400 ns', done: 'Hace falta DTG de 40 o más.' }] },
      I('TIM1 (y TIM8) añaden <b>salidas complementarias</b> (CH1 y CH1N), <b>tiempo muerto</b> programable, entrada de <b>freno</b> y contador de repetición. Están pensados para puentes de potencia: motores, inversores, convertidores.', { svg: table([['CH1 / CH1N', 'Una conduce cuando la otra no'], ['Tiempo muerto', 'Las dos apagadas un instante'], ['Freno (BKIN)', 'Corta por hardware'], ['MOE', 'Interruptor general de salidas']], 'TIM1 y TIM8') }),
      I('El <b>tiempo muerto</b> deja los dos transistores apagados un instante en cada cambio. En BDTR, con el bit 7 de DTG a 0: <b>tiempo = DTG × tDTS</b>; con el reloj a 100 MHz, 10 ns por paso (hasta 127).', { tune: { viz: 'st_dead', params: P_DEAD(20, 200) } }),
      I('Las salidas de TIM1 están desactivadas hasta poner <b>MOE</b> en BDTR (HAL_TIM_PWM_Start lo hace). La entrada de <b>freno</b> (BKIN) borra MOE por hardware y lleva las salidas a un estado seguro sin esperar a la CPU.', { svg: SVG_ADVTIM }),
      I('En <b>modo centrado</b> el contador sube hasta ARR y baja hasta 0: la frecuencia es la mitad y el PWM queda simétrico, cómodo para medir la corriente del motor en el centro del pulso.', { svg: SVG_CENTER }),
      { t: 'steps', text: 'Puente con MOSFET que tardan 150 ns en apagarse; reloj del temporizador a 100 MHz.', steps: ['Tiempo muerto mayor que el apagado, con margen: por ejemplo <b>250 ns</b>', 'Cada paso de DTG vale 10 ns', 'DTG = 250 / 10 = <b>25</b>', 'Primera prueba con fuente limitada en corriente y tensión baja'], result: 'DTG = 25 (250 ns).' },
      Q('¿Por qué un medio puente necesita salidas complementarias?', ['Un transistor conduce cuando el otro está apagado, y viceversa', 'Para duplicar la frecuencia', 'Para medir corriente', 'Para ahorrar pines'], 'Arriba y abajo nunca deben conducir a la vez.', { c: 'st_deadtime', h: 'Arriba y abajo se turnan.' }),
      Q('¿Qué provoca el shoot-through?', ['Picos de corriente enormes que calientan y pueden destruir los transistores', 'Que el motor gire al revés', 'Ruido en el audio', 'Nada grave'], 'Se evita con tiempo muerto y drivers con protección.', { c: 'st_deadtime', h: 'Es un cortocircuito de la alimentación.' }),
      Nm('Reloj de temporizador a 100 MHz. ¿Qué DTG da 500 ns de tiempo muerto?', 50, '', '500 ns / 10 ns = 50.', { c: 'st_deadtime', h: 'Divide entre 10 ns.' }),
      Q('Configuras TIM1 en PWM por registros y no sale nada por el pin. ¿Qué falta casi seguro?', ['MOE en TIM1->BDTR', 'ARPE', 'UIF', 'CEN de TIM2'], 'Las salidas de los avanzados necesitan MOE.', { c: 'st_advtim', h: 'El interruptor general de salidas.' }),
      Q('¿Para qué sirve la entrada de freno (BKIN)?', ['Para llevar las salidas a un estado seguro por hardware, sin esperar a la CPU', 'Para frenar el motor con software', 'Para medir la velocidad', 'Para ahorrar energía'], 'Un comparador de sobrecorriente puede cortar en nanosegundos.', { c: 'st_advtim', h: 'Protección que no depende del software.' }),
      Nm('Modo centrado a 100 MHz, PSC = 0, ARR = 1000. ¿Frecuencia en kHz?', 50, 'kHz', 'Sube y baja: 100 MHz / (2 × 1000) = 50 kHz.', { c: 'st_timer', h: 'Dos recorridos por periodo: subida y bajada.' }),
      Q('Vas a probar tu primer puente de potencia. ¿Cómo lo alimentas?', ['Con una fuente de laboratorio con límite de corriente bajo y a tensión reducida', 'Directo a una batería de coche', 'A la red con un transformador', 'Sin carga a máxima tensión'], 'Si algo está mal, el límite de corriente salva los transistores (y a ti).', { c: 'st_deadtime', h: 'Si algo falla, que no se queme nada.' }),
      I('<b>Resumen</b>\n· TIM1/TIM8: complementarias, tiempo muerto, freno y MOE.\n· Tiempo muerto = DTG × 10 ns a 100 MHz, mayor que el apagado del transistor.\n· Modo centrado: mitad de frecuencia y PWM simétrico.')
    ]),
    PRJ('st-p6', 'Proyecto: motor con encoder y PID', 'st_motor'),
    PRJ('st-p7', 'Proyecto: frecuencímetro de banco', 'st_freq')
  ] };

  const DMAP = (fs, n, t) => ({ fs: { label: 'Muestreo', val: fs, list: [8, 16, 44.1, 48], unit: 'kHz', dec: 1 }, N: { label: 'Búfer', val: n, list: [64, 128, 256, 512, 1024, 2048], unit: 'muestras', dec: 0 }, T: { label: 'Proceso por mitad', val: t, min: 0.5, max: 20, step: 0.5, unit: 'ms', dec: 1 } });
  const ADCP = (pre, smp, r, fixR) => ({ pre: { label: 'Preescalador ADC ÷', val: pre, list: [2, 4, 6, 8], dec: 0 }, smp: { label: 'Ciclos de muestreo', val: smp, list: [3, 15, 28, 56, 84, 112, 144, 480], dec: 0 }, R: fixR ? { label: 'R fuente', val: r, fixed: true } : { label: 'R de la fuente', val: r, list: [0.1, 1, 4.7, 10, 22, 47, 100], unit: 'kΩ', dec: 1 } });
  const M6 = { id: 'st-m6', title: 'DMA y periféricos de datos', desc: 'DMA circular, ADC con escaneo, DAC, UART con IDLE, I²C, SPI, CAN y USB.', nodes: [
    L('st28', 'DMA: mover datos sin la CPU', 'bus', ['st_dma', 'st_dmacfg', 'st_dmamem'], [
      Q('El ADC da 48 000 muestras por segundo. Si la CPU recogiera cada una con una interrupción, ¿qué crees que pasaría?', ['48 000 interrupciones por segundo: mucha CPU perdida en entrar y salir', 'Nada, es poco', 'El ADC se pararía', 'Es imposible pasar de 1000 interrupciones'], 'Para eso existe el DMA: un ayudante que copia datos sin la CPU. Míralo trabajar.', { ...PRED, c: 'st_dmacfg', h: 'Cuenta entradas y salidas de interrupción por segundo.' }),
      { t: 'explore', text: 'El DMA llena un búfer circular a 48 kHz; tú tardas 3 ms en procesar cada mitad.', viz: 'st_dma', params: DMAP(48, 64, 3),
        tasks: [{ q: 'load', min: 0, max: 80, text: 'Elige un búfer para que la CPU no pase del 80 % de carga', done: 'Con 512 muestras, cada mitad dura 5,3 ms: un 56 % de carga.', hint: 'Media vuelta debe durar más de 3,75 ms.' },
          { q: 'load', min: 0, max: 30, text: 'Baja la carga por debajo del 30 %', done: 'Con 1024 muestras, 10,7 ms por mitad: un 28 %.' }] },
      I('El <b>DMA</b> copia datos entre periféricos y memoria mientras la CPU hace otra cosa. Le das origen, destino y cantidad, y avisa a mitad (<b>HT</b>), al terminar (<b>TC</b>) o si hay error (<b>TE</b>).', { svg: SVG_DMACFG }),
      I('En la F4 hay dos controladores (DMA1 y DMA2) con 8 <b>flujos</b> (streams) cada uno; cada flujo elige entre 8 <b>canales</b> de petición según una tabla fija del manual. Solo el <b>DMA2</b> copia de memoria a memoria. En G0, G4 o H7, un DMAMUX conecta cualquier petición a cualquier canal.', { svg: table([['DMA1', '8 flujos · periféricos de APB1'], ['DMA2', '8 flujos · APB2 y memoria a memoria'], ['Canal', 'Qué petición atiende el flujo'], ['DMAMUX', 'G0, G4, H7: cualquier petición']], 'DMA en la F4') }),
      I('Parámetros: <b>dirección</b>, <b>tamaño</b> de dato (byte, media palabra, palabra), <b>incremento</b> de cada lado y <b>modo</b> normal o circular. En <b>circular</b> el DMA da vueltas al búfer: procesas una mitad mientras llena la otra.', { tune: { viz: 'st_dma', params: DMAP(16, 512, 4) } }),
      I('No toda la memoria está en el camino del DMA: la <b>CCM</b> de la F407 o la F303 solo la ve el núcleo. Y en chips con caché (F7, H7) la CPU puede leer una copia vieja: invalida la caché de ese búfer o usa una zona no cacheable.', { svg: SVG_CCM }),
      { t: 'steps', text: 'Audio a 48 kHz con un búfer circular de 1024 muestras. ¿Cuánto tiempo tienes para cada mitad?', steps: ['Media vuelta = 1024 / 2 = 512 muestras', 'Llegan 48 000 muestras por segundo', '512 / 48 000 = <b>10,7 ms</b>', 'Si procesar una mitad te lleva 3 ms, la CPU está al 28 %'], result: 'Tu plazo es 10,7 ms por mitad.' },
      Q('En una F4 quieres copiar un búfer de RAM a otro con DMA. ¿Qué controlador usas?', ['DMA2', 'DMA1', 'Cualquiera', 'Ninguno: no se puede'], 'El DMA1 de la F4 no admite memoria a memoria.', { c: 'st_dmacfg', h: 'Solo uno de los dos lo admite en la F4.' }),
      Q('ADC de 12 bits a un búfer uint16_t. ¿Configuración típica?', ['Media palabra en ambos lados, incrementar memoria sí y periférico no', 'Byte en ambos lados', 'Incrementar el periférico', 'Palabra y sin incrementos'], 'El registro de datos del ADC es siempre el mismo; el búfer avanza.', { c: 'st_dmacfg', h: 'El registro del ADC no se mueve.' }),
      G('st_dmaHalf'),
      Q('¿Qué pasa si procesas la mitad que el DMA está escribiendo en ese momento?', ['Mezclas datos nuevos y viejos: resultados corruptos', 'Nada', 'El DMA se detiene', 'HardFault seguro'], 'Procesa la mitad A tras HT y la B tras TC.', { c: 'st_dma', h: 'Una mitad cada vez.' }),
      Q('¿Qué calcula esta línea con un DMA circular de N datos?', ['La posición actual de escritura del DMA en el búfer', 'Los datos que faltan por procesar en total', 'El tamaño del búfer', 'El número de interrupciones'], 'El contador del DMA cuenta hacia atrás lo que falta en esta vuelta.', { code: 'uint16_t pos = N -\n  __HAL_DMA_GET_COUNTER(&hdma_adc1);', c: 'st_dma', h: 'El contador cuenta lo que falta.' }),
      Q('Pones un búfer de DMA en la CCM de una F407. ¿Qué pasa?', ['El DMA no puede acceder a la CCM', 'Funciona más rápido', 'Se borra en cada interrupción', 'Nada especial'], 'La CCM solo está conectada al núcleo.', { c: 'st_dmamem', h: 'No todas las memorias están conectadas al DMA.' }),
      Q('En un H7 con caché, la CPU lee un búfer que acaba de llenar el DMA y ve datos viejos. ¿Por qué?', ['La caché guarda una copia antigua: hay que invalidarla o usar memoria no cacheable', 'El DMA está roto', 'Falta volatile', 'La Flash es lenta'], 'El DMA escribe en la RAM sin pasar por la caché.', { c: 'st_dmamem', h: 'La CPU puede estar leyendo de una copia.' }),
      G('st_dmaHalf'),
      I('<b>Resumen</b>\n· El DMA mueve datos sin la CPU; avisa con HT, TC y TE.\n· Circular: procesa una mitad mientras se llena la otra; tu plazo es N / 2 / fs.\n· Búferes de DMA en la SRAM normal (no CCM); con caché, invalida.')
    ]),
    L('st29', 'ADC multicanal con escaneo y DMA', 'gauge', ['st_adc', 'st_adcscan', 'st_adcacc', 'st_wavegen'], [
      Q('Lees un divisor de 100 kΩ con el tiempo de muestreo más corto. ¿Qué crees que pasa?', ['La lectura sale baja: el condensador interno no llega a cargarse', 'Lee perfecto', 'Lee más alto', 'El ADC se bloquea'], 'El ADC carga un condensador a través de tu resistencia. Mira la curva.', { ...PRED, c: 'st_adc', h: 'El ADC carga un condensador a través de tu resistencia.' }),
      { t: 'explore', text: 'La curva es la carga del condensador de muestreo. Juega con el reloj, los ciclos y la resistencia de la fuente.', viz: 'st_adc', params: ADCP(4, 3, 47),
        tasks: [{ q: 'e47', min: 1, max: 1, text: 'Con la fuente de 47 kΩ, consigue un error de carga menor de 0,5 LSB', done: 'Más ciclos de muestreo: más tiempo para cargar.', hint: 'Sube los ciclos de muestreo.' },
          { q: 'fast', min: 1, max: 1, text: 'Ahora más de 700 000 muestras por segundo sin error', done: 'Solo con una fuente de baja resistencia (o un seguidor con operacional) y pocos ciclos.' }] },
      I('El ADC de la F4: aproximaciones sucesivas (como el del curso base), 12 bits, hasta 16 canales externos y canales internos (temperatura, VREFINT, VBAT). Su reloj es PCLK2 ÷ 2, 4, 6 u 8, sin pasar de <b>36 MHz</b>.', { svg: chain(['PCLK2|84 MHz', '÷4', 'fADC|21 MHz']) }),
      I('Durante el <b>tiempo de muestreo</b> un condensador interno de pocos pF se carga a través de tu fuente. Después, 12 ciclos de conversión:\n<b>tconv = (ciclos de muestreo + 12) / fADC</b>', { tune: { viz: 'st_adc', params: ADCP(4, 15, 10) } }),
      I('<b>Escaneo</b>: el ADC convierte una lista de canales en orden. Con modo continuo y DMA circular, el búfer se llena <b>intercalado</b>: con n canales, la muestra k del canal i está en <b>buf[n·k + i]</b>.', { tune: { viz: 'st_scan', params: P_SCAN(3, 2, 1) } }),
      I('Para muestrear a ritmo exacto (audio, FFT, control), dispara cada conversión con el evento <b>TRGO</b> de un temporizador en vez del modo continuo. Y si tu equipo va con batería, mide <b>VREFINT</b> para conocer el VDDA real.', { svg: SVG_ADCACC, more: 'VDDA = 3,3 V × VREFINT_CAL / VREFINT leído, donde VREFINT_CAL es el valor medido en fábrica a 3,3 V y guardado en el chip. Algunas familias (L4, G4…) piden además una autocalibración con HAL_ADCEx_Calibration_Start antes de medir; la F4 no la tiene.' }),
      { t: 'steps', text: 'Escaneas 4 canales con fADC = 21 MHz y 56 ciclos de muestreo. ¿Cada cuánto se repite cada canal?', steps: ['Una conversión: (56 + 12) / 21 MHz', '= 68 / 21 ≈ <b>3,24 µs</b>', '4 canales en fila: 4 × 3,24', '≈ <b>12,95 µs</b> por vuelta: unas 77 000 muestras por segundo y canal'], result: 'Cada canal se mide cada 12,95 µs.' },
      G('st_adcTime'),
      Q('Escaneas 3 canales con DMA circular. ¿En qué posición está la muestra k del segundo canal?', ['buf[3·k + 1]', 'buf[k + 1]', 'buf[2·k]', 'buf[3·k + 2]'], 'Cada vuelta ocupa 3 posiciones; el segundo canal es el índice 1.', { c: 'st_adcscan', h: 'Cada vuelta ocupa n posiciones.' }),
      Nm('4 canales y 100 muestras de cada uno. ¿Longitud del búfer?', 400, 'muestras', '4 × 100, intercaladas.', { c: 'st_adcscan', h: 'Canales × muestras.' }),
      Q('¿Por qué disparar el ADC con un temporizador para una FFT?', ['La FFT supone muestras equiespaciadas; el temporizador da un ritmo exacto', 'Para gastar menos', 'Porque el ADC no tiene modo continuo', 'Para tener más bits'], 'Un muestreo irregular ensucia el espectro.', { c: 'st_wavegen', h: 'La FFT supone muestras equiespaciadas.' }),
      Q('¿Qué familia necesita llamar a HAL_ADCEx_Calibration_Start antes de medir?', ['L4 y G4, entre otras; la F4 no tiene autocalibración', 'Solo la F4', 'Ninguna', 'Todas por igual'], 'Depende de la familia: mira su manual.', { c: 'st_adcacc', h: 'Depende de la familia.' }),
      Q('Tu equipo va con batería y VDDA baja con el tiempo. ¿Cómo mides tensiones absolutas?', ['Midiendo también VREFINT para calcular el VDDA real', 'Suponiendo siempre 3,3 V', 'Con más bits', 'Con un tiempo de muestreo mayor'], 'VREFINT es estable y su valor de fábrica está guardado en el chip.', { c: 'st_adcacc', h: 'Hay una referencia interna estable.' }),
      G('st_adcTime'),
      I('<b>Resumen</b>\n· tconv = (ciclos de muestreo + 12) / fADC; fuentes de mucha resistencia piden más ciclos.\n· Escaneo + DMA: buf[n·k + i].\n· Ritmo exacto con TRGO; VREFINT para conocer VDDA.')
    ]),
    PRJ('st-p8', 'Proyecto: analizador de espectro de audio', 'st_spectrum'),
    L('st30', 'DAC y generación de señales', 'wave', ['st_dac', 'st_wavegen', 'st_family'], [
      Q('Quieres sacar un seno con el DAC usando tabla[i] = 2047·sin(…). ¿Qué crees que pasa?', ['La mitad negativa sale recortada a 0 V', 'Sale perfecto', 'Sale al doble de amplitud', 'El DAC se estropea'], 'El DAC solo da tensiones entre 0 y VREF+. Pruébalo.', { ...PRED, c: 'st_dac', h: 'El DAC solo da tensiones entre 0 y VREF+.' }),
      { t: 'explore', text: 'Un temporizador dispara el DAC y cada disparo saca una muestra de la tabla.', viz: 'st_dac', params: P_DAC(100, 100, 0),
        tasks: [{ q: 'clip', min: 0, max: 0, text: 'Centra la onda para que no se recorte', done: 'Sumando 2048, el seno oscila alrededor de la mitad de escala.', hint: 'Suma 2048.' },
          { q: 'f10', min: 1, max: 1, text: 'Consigue 10 kHz', done: '1 MHz / 100, 500 kHz / 50… f = disparo / muestras.' },
          { q: 'f50', min: 1, max: 1, text: 'Ahora 50 kHz', done: 'Menos muestras por periodo: más frecuencia y escalones más gruesos.' }] },
      I('El <b>DAC</b> convierte un número en tensión: 12 bits, de 0 a 4095 entre 0 y VREF+.\n<b>V = código / 4095 × VREF+</b>.\nLa F446 y la F407 tienen dos canales (PA4 y PA5). <b>La F401 y la F411 no tienen DAC.</b>', { tune: { viz: 'st_dac', params: P_DAC(20, 100, 1) } }),
      I('El <b>buffer de salida</b> interno deja cargar la salida, pero no llega del todo a 0 V ni a VREF+. Sin él la salida llega a los extremos, pero solo puede alimentar entradas de alta impedancia: para unos auriculares, un operacional como seguidor.', { svg: chain(['DAC|sin buffer', 'Operacional|seguidor', 'Auriculares']) }),
      I('Para generar una onda: una tabla de N muestras, un temporizador que dispara el DAC con <b>TRGO</b> y el DMA en circular, de memoria a periférico. <b>f_salida = f_disparo / N</b>. La CPU no hace nada.', { code: 'for (int i = 0; i < N; i++)\n  tabla[i] = 2048 + 2047 * sinf(6.2831853f * i / N);\nHAL_TIM_Base_Start(&htim6);        // TRGO a 1 MHz\nHAL_DAC_Start_DMA(&hdac, DAC_CHANNEL_1,\n  (uint32_t *)tabla, N, DAC_ALIGN_12B_R);' }),
      I('Con <b>DDS</b> (acumulador de fase) sumas en cada disparo un incremento a un acumulador y usas sus bits altos como índice: la frecuencia es proporcional al incremento, con resolución muy fina y sin cortes.', { code: 'fase += incremento;           // uint32_t\nsalida = tabla[fase >> 24];   // tabla de 256' }),
      { t: 'steps', text: 'TIM6 dispara a 1 MHz y quieres 2 kHz. ¿Cuántas muestras por periodo?', steps: ['f_salida = f_disparo / N', 'Despeja: N = f_disparo / f_salida', 'N = 1 000 000 / 2000 = <b>500</b>', 'La tabla de 500 valores uint16_t ocupa 1000 B'], result: 'Tabla de 500 muestras.' },
      Q('Quieres generar audio analógico con una Black Pill F411. ¿Qué haces?', ['Usar PWM filtrado o un DAC externo (por ejemplo I²S), porque no tiene DAC', 'Usar su DAC en PA4', 'Usar el ADC al revés', 'No se puede de ninguna forma'], 'Lee siempre la lista de periféricos del chip concreto.', { c: 'st_family', h: 'Mira si esa línea tiene DAC.' }),
      Nm('DAC de 12 bits con VREF+ = 3,3 V. ¿Tensión con el código 2048?', 1.65, 'V', '2048 / 4095 × 3,3 ≈ 1,65 V.', { tol: 0.01, c: 'st_dac', h: 'Es la mitad de escala.' }),
      Q('Sin buffer interno, ¿qué necesitas para cargar la salida del DAC con unos auriculares?', ['Un operacional como seguidor o amplificador', 'Nada', 'Una resistencia en serie', 'Un condensador a masa'], 'La salida sin buffer tiene una impedancia alta.', { c: 'st_dac', h: 'La salida sin buffer no puede dar corriente.' }),
      Nm('TIM6 dispara a 1 MHz y la tabla tiene 100 muestras. ¿Frecuencia de salida en kHz?', 10, 'kHz', '1 MHz / 100 = 10 kHz.', { c: 'st_wavegen', h: 'Disparos por segundo entre muestras por periodo.' }),
      Q('¿Cómo duplicas la frecuencia sin cambiar el temporizador?', ['Usando una tabla con la mitad de muestras', 'Duplicando la amplitud', 'Cambiando a 8 bits', 'Activando el buffer'], 'Mismo ritmo, menos muestras por ciclo.', { c: 'st_wavegen', h: 'Mismo ritmo, menos muestras.' }),
      Q('¿Por qué la tabla suma 2048?', ['El DAC solo da tensiones positivas: el seno se centra a mitad de escala', 'Por la resolución', 'Para que suene más fuerte', 'Por el buffer'], 'El seno oscila entre 1 y 4095 alrededor de 2048.', { code: 'tabla[i] = 2048 + 2047 *\n  sinf(6.2831853f * i / N);', c: 'st_dac', h: 'El DAC no da negativos.' }),
      Q('¿Qué ventaja tiene la síntesis DDS frente a cambiar el temporizador?', ['Resolución de frecuencia muy fina y cambios sin cortes', 'Más bits de resolución', 'Menos memoria siempre', 'No necesita DAC'], 'La frecuencia depende del incremento de fase.', { c: 'st_wavegen', h: 'El incremento de fase manda.' }),
      I('<b>Resumen</b>\n· V = código / 4095 × VREF+; centra las ondas en 2048.\n· Tabla + temporizador (TRGO) + DMA circular: f = f_disparo / N.\n· DDS para frecuencias finas. La F401 y la F411 no tienen DAC.')
    ]),
    PRJ('st-p9', 'Proyecto: generador de funciones', 'st_funcgen'),
    PRJ('st-p10', 'Proyecto: tira LED con PWM y DMA', 'st_ws2812'),
    L('st31', 'UART a fondo: BRR, DMA e IDLE', 'bus', ['st_brr', 'st_uartrx', 'st_uarttime', 'st_dma', 'st_rs485'], [
      Q('Configuras la USART con PCLK = 16 MHz a 921 600 baudios. ¿Crees que funcionará fiable?', ['Justo en el límite: el redondeo deja un error de un 2 %', 'Perfecto', 'Imposible configurarlo', 'Va al doble de velocidad'], '16 MHz / 921 600 = 17,4, y BRR solo admite 17. Míralo.', { ...PRED, c: 'st_brr', h: 'Divide 16 MHz entre 921 600 y redondea.' }),
      { t: 'explore', text: 'BRR divide el reloj del bus. Mira cómo se desplazan los instantes de lectura con el error.', viz: 'st_baud', params: P_BAUD(84, 115200),
        tasks: [{ q: 'err', min: 2, max: 100, text: 'Busca una combinación con más de un 2 % de error', done: 'Poco reloj y mucha velocidad: el divisor es pequeño y el redondeo pesa.', hint: 'Baja PCLK y sube los baudios.' },
          { q: 'e921', min: 1, max: 1, text: 'Ahora 921 600 baudios con menos de un 1 % de error', done: 'Con más reloj, el divisor crece y el redondeo pesa menos.' }] },
      I('Con sobremuestreo ×16: <b>BRR = fPCLK / baudios</b>, redondeado. Usa el PCLK del bus de esa USART. El redondeo deja un error: velocidad real = fPCLK / BRR; por encima de un 2 % empiezan los fallos.', { tune: { viz: 'st_baud', params: P_BAUD(16, 921600) }, more: 'Los 4 bits bajos de BRR son la fracción en dieciseisavos y el resto, la parte entera (mantisa). Pero el número que escribes es justo esa división redondeada.' }),
      I('Recibir: no sabes cuántos bytes llegarán. Una interrupción por byte son muchas; un DMA de longitud fija espera para siempre si llegan menos. La solución: <b>DMA + línea ociosa (IDLE)</b>, que avisa cuando la línea lleva un carácter de tiempo en silencio.', { svg: SVG_IDLE }),
      I('Con la HAL: HAL_UARTEx_ReceiveToIdle_DMA arranca la recepción y HAL_UARTEx_RxEventCallback te dice cuántos bytes hay.', { code: 'HAL_UARTEx_ReceiveToIdle_DMA(&huart2, rx, sizeof rx);\n\nvoid HAL_UARTEx_RxEventCallback(\n    UART_HandleTypeDef *h, uint16_t n) {\n  procesar(rx, n);\n  HAL_UARTEx_ReceiveToIdle_DMA(h, rx, sizeof rx);\n}' }),
      I('<b>RS-485</b> es semidúplex: todos comparten un par de hilos. El pin <b>DE</b> del transceptor activa su transmisor: a 1 antes de enviar y a 0 cuando sale el último bit (bandera <b>TC</b>). En la F4 lo haces con un GPIO; G0, G4 o L4 pueden hacerlo por hardware.', { svg: SVG_DE }),
      { t: 'steps', text: 'PCLK = 16 MHz y 115 200 baudios: calcula BRR y el error.', steps: ['BRR = 16 000 000 / 115 200 = 138,9', 'Redondeado: <b>BRR = 139</b> (0x008B)', 'Velocidad real = 16 000 000 / 139 ≈ 115 108 baudios', 'Error = 92 / 115 200 ≈ <b>0,08 %</b>'], result: 'Muy por debajo del 2 %.' },
      G('st_brr'),
      G('st_baudErr'),
      Nm('A 115 200 baudios en 8N1, ¿cuántos bytes por segundo como máximo?', 11520, 'B/s', '115 200 / 10 bits por byte.', { c: 'st_uarttime', h: 'Divide entre 10, no entre 8.' }),
      Q('Un GPS envía frases NMEA de longitud variable. ¿Qué método eliges?', ['DMA con detección de línea ociosa', 'DMA de longitud fija', 'HAL_UART_Receive bloqueante', 'Sondeo en el bucle'], 'Una interrupción por frase, sin tocar cada byte.', { c: 'st_uartrx', h: 'Longitud variable: ¿cómo sabes que la frase acabó?' }),
      Q('En HAL_UARTEx_RxEventCallback, ¿qué es el parámetro de tamaño (modo normal)?', ['Cuántos bytes se han recibido en el búfer', 'El tamaño máximo del búfer', 'La velocidad en baudios', 'El número de errores'], 'En modo circular es la posición dentro del búfer.', { c: 'st_uartrx', h: 'Te dice cuánto ha llegado.' }),
      Q('El callback salta también a mitad de búfer y no lo quieres. ¿Qué haces?', ['Desactivar la interrupción de media transferencia (HT) del DMA', 'Cambiar la velocidad', 'Usar un búfer más pequeño', 'Desactivar el DMA'], '__HAL_DMA_DISABLE_IT(h->hdmarx, DMA_IT_HT) tras arrancar la recepción.', { c: 'st_dma', h: 'El aviso de mitad viene del DMA.' }),
      Q('Aparece un error de desbordamiento (ORE) y la recepción se detiene. ¿Qué significa?', ['Llegó un byte antes de leer el anterior: gestiona el error y relanza la recepción', 'El cable está roto', 'La velocidad es demasiado baja', 'El búfer es demasiado grande'], 'Implementa HAL_UART_ErrorCallback.', { c: 'st_uartrx', h: 'Overrun: llegó otro antes de leer el anterior.' }),
      Q('RS-485 necesita activar el transmisor solo al enviar (pin DE). ¿Cómo lo haces en una F4?', ['Con un GPIO a 1 antes de enviar y a 0 cuando sale el último byte (TC)', 'La USART de la F4 lo hace sola', 'No se puede', 'Con el pin RX'], 'G0, G4, L4… tienen control DE por hardware; la F4 no.', { c: 'st_rs485', h: 'La USART de la F4 no lo maneja sola.' }),
      I('<b>Resumen</b>\n· BRR = fPCLK / baudios (×16); error por debajo del 2 %.\n· Mensajes de longitud variable: DMA + IDLE con ReceiveToIdle.\n· RS-485: DE a 1 al enviar y a 0 tras TC.')
    ]),
    L('st32', 'I²C y SPI con la HAL', 'bus', ['st_i2c', 'st_spi', 'st_dmacfg', 'st_bus'], [
      Q('Tu sensor I²C tiene la dirección 0x68 y llamas a HAL_I2C_Mem_Read con 0x68. Nadie contesta. ¿Qué crees que falla?', ['La HAL espera la dirección desplazada un bit: 0xD0', 'El sensor está roto', 'Faltan las pull-ups seguro', 'I²C no funciona a 3,3 V'], 'La HAL deja un hueco para el bit de lectura o escritura. Antes, el reloj de SPI.', { ...PRED, c: 'st_i2c', h: 'La HAL reserva un hueco para el bit de lectura o escritura.' }),
      { t: 'explore', text: 'SPI: CPOL fija el nivel de reposo del reloj y CPHA el flanco en que se lee.', viz: 'st_spi', params: P_SPI(3, 0, 0),
        tasks: [{ q: 'm3ok', min: 1, max: 1, text: 'El chip pide modo 3: ajusta CPOL y CPHA', done: 'Modo 3: reloj en reposo alto (CPOL 1) y lectura en el segundo flanco (CPHA 1).', hint: 'Modo = 2·CPOL + CPHA.' },
          { q: 'm1ok', min: 1, max: 1, text: 'Cambia a un chip que pide modo 1 y ajústalo', done: 'Modo 1: CPOL 0 y CPHA 1.' }] },
      I('<b>I²C</b>: dos hilos (SDA, SCL) en open-drain con pull-ups y direcciones de 7 bits. La HAL quiere la dirección <b>desplazada un bit a la izquierda</b>. HAL_I2C_Mem_Read lee registros de un sensor en una llamada.', { svg: SVG_I2CADDR }),
      I('Diagnóstico I²C: un escáner con HAL_I2C_IsDeviceReady recorre las direcciones y dice cuáles contestan. Y en buses rápidos, pull-ups externas de 2,2–4,7 kΩ.', { tune: { viz: 'st_rc', params: P_RC(4.7, 200, 400) }, code: 'for (uint8_t a = 1; a < 128; a++)\n  if (HAL_I2C_IsDeviceReady(&hi2c1, a << 1, 2, 5) == HAL_OK)\n    printf("0x%02X\\n", a);' }),
      I('<b>SPI</b>: el maestro genera SCK y, por cada bit que envía por MOSI, recibe uno por MISO: para leer n bytes hay que enviar n. Cuatro modos según <b>CPOL</b> y <b>CPHA</b>. El CS se suele manejar con un GPIO.', { tune: { viz: 'st_spi', params: P_SPI(0, 0, 0) } }),
      I('Velocidad: SCK = PCLK de su bus ÷ 2, 4… 256 (SPI1 en APB2; SPI2 y SPI3 en APB1). Para bloques grandes, como una pantalla o una SD, SPI con <b>DMA</b>; con un byte suelto no compensa.', { code: 'HAL_GPIO_WritePin(CS_GPIO_Port, CS_Pin, GPIO_PIN_RESET);\nHAL_SPI_Transmit_DMA(&hspi1, pixeles, n);\n/* CS a 1 en HAL_SPI_TxCpltCallback */' }),
      { t: 'steps', text: 'Lee el registro WHO_AM_I (0x75) de una MPU-6050 en la dirección 0x68.', code: 'uint8_t id;\nHAL_I2C_Mem_Read(&hi2c1, 0x68 << 1, 0x75,\n  I2C_MEMADD_SIZE_8BIT, &id, 1, 100);', steps: ['Dirección para la HAL: 0x68 &lt;&lt; 1 = <b>0xD0</b>', 'Registro 0x75, de 8 bits (I2C_MEMADD_SIZE_8BIT)', 'Un byte a la variable id, con 100 ms de tiempo máximo', 'Si todo va bien, id vale <b>0x68</b>'], result: 'El primer paso con cualquier sensor nuevo.' },
      Q('Tu sensor está en la dirección 0x68. ¿Qué pasas a la HAL?', ['0x68 << 1 (0xD0)', '0x68', '0x34', '0x69'], 'La HAL coloca el bit de lectura o escritura.', { c: 'st_i2c', h: 'Desplaza un bit a la izquierda.' }),
      Q('¿Qué hace esta llamada?', ['Lee 1 byte del registro 0x75 del dispositivo 0x68', 'Escribe 0x75 en el dispositivo', 'Lee 0x75 bytes', 'Cambia la dirección del sensor'], 'Dispositivo, registro, tamaño del registro, búfer, cantidad y tiempo.', { code: 'uint8_t id;\nHAL_I2C_Mem_Read(&hi2c1, 0x68 << 1,\n  0x75, I2C_MEMADD_SIZE_8BIT,\n  &id, 1, 100);', c: 'st_i2c', h: 'Lee los argumentos en orden: dispositivo, registro, tamaño…' }),
      Q('¿Qué hace este bucle?', ['Busca qué direcciones I²C contestan', 'Envía datos a todos los dispositivos', 'Configura las direcciones', 'Resetea el bus'], 'Un escáner: el primer paso al conectar algo nuevo.', { code: 'for (uint8_t a = 1; a < 128; a++)\n  if (HAL_I2C_IsDeviceReady(&hi2c1,\n      a << 1, 2, 5) == HAL_OK)\n    printf("0x%02X\\n", a);', c: 'st_i2c', h: '¿Qué pregunta IsDeviceReady?' }),
      Nm('SPI1 (en APB2 a 100 MHz) con preescalador ÷4. ¿SCK en MHz?', 25, 'MHz', '100 / 4 = 25 MHz.', { c: 'st_spi', h: 'Reloj del bus entre el preescalador.' }),
      Q('Lees un chip SPI y los datos salen desplazados un bit. ¿Primera sospecha?', ['Modo SPI (CPOL/CPHA) distinto del que pide el chip', 'La dirección I²C', 'Falta una pull-up', 'La velocidad del ADC'], 'Mira el diagrama de tiempos de su hoja de datos.', { c: 'st_spi', h: 'Reposo y flanco de lectura.' }),
      Q('Para leer 2 bytes de un SPI esclavo, ¿qué hace el maestro?', ['Enviar 2 bytes (aunque sean de relleno) mientras recibe', 'Solo escuchar', 'Enviar un pulso de reset', 'Bajar SCK'], 'Cada bit recibido necesita un pulso de reloj del maestro.', { c: 'st_spi', h: 'El maestro genera el reloj.' }),
      Q('¿Cuándo merece la pena SPI con DMA?', ['Con bloques grandes, como píxeles de una pantalla o sectores de una SD', 'Para enviar un byte suelto', 'Nunca', 'Solo con I²C'], 'Con un byte, configurar el DMA cuesta más que enviarlo.', { c: 'st_dmacfg', h: 'Bloques grandes.' }),
      { t: 'match', q: 'Une cada bus con su rasgo.', pairs: [['I²C', 'Direcciones y open-drain'], ['SPI', 'Full-duplex con chip select'], ['UART', 'Asíncrono, sin reloj'], ['CAN', 'Diferencial con arbitraje por ID']], c: 'st_bus', h: 'Busca lo que hace único a cada uno.' },
      I('<b>Resumen</b>\n· I²C: dirección &lt;&lt; 1 para la HAL; escáner con IsDeviceReady; pull-ups externas.\n· SPI: modo = 2·CPOL + CPHA; para leer hay que enviar; SCK = PCLK ÷ preescalador.\n· DMA para bloques grandes.')
    ]),
    PRJ('st-p11', 'Proyecto: registrador de datos en microSD', 'st_logger'),
    L('st33', 'CAN y USB', 'bus', ['st_can', 'st_canbit', 'st_usbcdc', 'st_usbclk', 'st_family'], [
      Q('Dos nodos CAN empiezan a transmitir exactamente a la vez. ¿Qué crees que pasa?', ['Gana el de identificador más bajo y su trama sigue intacta', 'Chocan y se pierden las dos', 'Gana el que esté más cerca', 'Se reparten el bus'], 'En el bus, el 0 se impone al 1. Míralo bit a bit.', { ...PRED, c: 'st_can', h: 'En el bus, el 0 se impone al 1.' }),
      { t: 'explore', text: 'Dos nodos envían su identificador a la vez. El bus queda a 0 si alguno envía 0.', viz: 'st_arb', params: P_ARB(0, 1),
        tasks: [{ q: 'win', min: 1, max: 1, text: 'Haz que gane B', done: 'Gana quien tiene el identificador más bajo.', hint: 'Dale a B un ID menor que el de A.' },
          { q: 'bit', min: 10, max: 10, text: 'Busca dos IDs que no se separen hasta el último bit', done: '0x100 y 0x101: compiten hasta el final y gana 0x100.' }] },
      I('<b>CAN</b> es un bus diferencial (CANH y CANL), multimaestro y muy robusto. Necesita un <b>transceptor</b> externo y <b>120 Ω en cada extremo</b>. Los STM32 tienen bxCAN (F1, F4) o FDCAN (G4, H7 y algunos G0).', { svg: table([['CANH / CANL', 'Par diferencial: inmune al ruido'], ['Transceptor', 'Entre el STM32 y el bus'], ['120 Ω × 2', 'Una en cada extremo: 60 Ω medidos'], ['bxCAN · FDCAN', 'Según la familia']], 'Bus CAN') }),
      I('Arbitraje: el 0 es <b>dominante</b>. Mientras envían el identificador, cada nodo escucha; quien ve un 0 cuando puso un 1 se retira. Gana el identificador <b>más bajo</b> sin perder nada. Los <b>filtros</b> por hardware descartan las tramas que no te interesan.', { tune: { viz: 'st_arb', params: P_ARB(2, 3) } }),
      I('Un bit de CAN se divide en cuantos (tq): 1 de sincronismo + BS1 + BS2.\n<b>Velocidad = fPCLK / (BRP × (1 + BS1 + BS2))</b>\n<b>Muestreo = (1 + BS1) / (1 + BS1 + BS2)</b>, cerca del 87,5 %.', { tune: { viz: 'st_canbit', params: P_CANB(4, 13, 2) } }),
      I('<b>USB dispositivo</b> de velocidad completa (12 Mbit/s) en PA11/PA12, con 48 MHz exactos. Con la clase <b>CDC</b>, el STM32 aparece como puerto serie virtual: CDC_Transmit_FS envía y CDC_Receive_FS recibe. Ojo: en la F103 el USB y el CAN no se pueden usar a la vez.', { svg: SVG_CDC }),
      { t: 'steps', text: 'bxCAN con PCLK1 = 42 MHz: configura 500 kbit/s con buen punto de muestreo.', steps: ['Prueba 16 cuantos (BS1 = 13, BS2 = 2: 87,5 %): BRP = 42 MHz / (500 kHz × 16) = 5,25: no es entero', 'Prueba 14 cuantos: BRP = 42 / (0,5 × 14) = <b>6</b>, entero', 'Con 14 cuantos: BS1 = 11, BS2 = 2 → muestreo (1 + 11) / 14 = <b>85,7 %</b>', 'Comprueba: 42 MHz / (6 × 14) = 500 kbit/s'], result: 'BRP = 6, BS1 = 11, BS2 = 2.' },
      Q('Con el bus apagado mides 60 Ω entre CANH y CANL. ¿Qué indica?', ['Que hay dos terminaciones de 120 Ω, como debe ser', 'Que falta una terminación', 'Un cortocircuito', 'Que el bus está roto'], '120 Ω en paralelo con 120 Ω = 60 Ω.', { c: 'st_can', h: 'Dos de 120 Ω en paralelo.' }),
      G('st_canBit'),
      G('st_canBit'),
      Q('¿Para qué sirven los filtros de CAN por hardware?', ['Para que el controlador descarte las tramas que no te interesan sin usar la CPU', 'Para quitar ruido eléctrico', 'Para cifrar', 'Para cambiar la velocidad'], 'En un coche hay miles de tramas por segundo.', { c: 'st_can', h: 'Miles de tramas por segundo.' }),
      Q('En la F103 (Blue Pill), ¿puedes usar CAN y USB a la vez?', ['No: comparten una memoria interna y son excluyentes', 'Sí, sin problema', 'Solo a 125 kbit/s', 'Solo con DMA'], 'Una limitación conocida de esa familia.', { c: 'st_family', h: 'Comparten algo por dentro.' }),
      Q('¿Qué exige el USB al árbol de relojes?', ['48 MHz exactos y precisos para el periférico USB', 'Nada', 'Que SYSCLK sea 48 MHz', 'El LSE'], 'Por eso se busca un VCO múltiplo de 48.', { c: 'st_usbclk', h: 'Recuerda el divisor Q del PLL.' }),
      Q('CDC_Transmit_FS devuelve USBD_BUSY. ¿Qué significa?', ['La transferencia anterior aún no ha terminado: espera y reintenta', 'El cable está roto', 'El PC no tiene drivers', 'Error de la Flash'], 'Guarda los datos en un FIFO y envía al terminar la anterior.', { c: 'st_usbcdc', h: 'Hay una transferencia en curso.' }),
      Q('En un puerto serie virtual USB CDC, ¿importa la velocidad en baudios que elijas en el PC?', ['No: los datos van a la velocidad del USB', 'Sí, debe ser 115 200', 'Sí, debe coincidir con una UART', 'Solo en Linux'], 'El valor llega al STM32, pero no limita nada.', { c: 'st_usbcdc', h: 'Los datos viajan por USB.' }),
      Q('Quieres conectar tu nodo CAN al conector OBD-II del coche. ¿Precaución principal?', ['Escuchar en modo silencioso y no enviar tramas sin saber exactamente qué hacen', 'Ninguna', 'Hacerlo en marcha para ver más datos', 'Quitar la terminación del coche'], 'Una trama errónea puede afectar a centralitas de seguridad.', { c: 'st_can', h: 'Escuchar sin molestar.' }),
      I('<b>Resumen</b>\n· CAN: diferencial, 120 Ω en cada extremo, gana el ID más bajo, filtros por hardware.\n· Bit = 1 + BS1 + BS2 cuantos; muestreo cerca del 87,5 %.\n· USB CDC: puerto serie virtual a velocidad USB, con 48 MHz exactos.')
    ]),
    PRJ('st-p12', 'Proyecto: bus CAN de banco y puente SLCAN', 'st_can')
  ] };

  const M7 = { id: 'st-m7', title: 'FreeRTOS en STM32', desc: 'El planificador, tareas y pilas, colas y semáforos, mutex, temporizadores software y la base de tiempo de la HAL.', nodes: [
    L('st34', 'Por qué un sistema operativo de tiempo real', 'cloud', ['st_rtos', 'st_nvic'], [
      Q('Una tarea de FreeRTOS espera con HAL_Delay(100) en lugar de osDelay(100). ¿Qué crees que les pasa a las tareas de menor prioridad?', ['No se ejecutan: la CPU se gasta esperando', 'Nada, se ejecutan igual', 'Se ejecutan más rápido', 'Se reinicia el chip'], 'HAL_Delay espera dando vueltas: la tarea nunca suelta la CPU. Míralo en el planificador.', { ...PRED, c: 'st_rtos', h: 'HAL_Delay espera dando vueltas.' }),
      { t: 'explore', text: 'Tres tareas durante 20 ms. A y B trabajan y esperan; C (prioridad 1) siempre tiene algo que hacer.', viz: 'st_rtos', params: P_RTOS(3, 2, 0),
        tasks: [{ q: 'cpuB', min: 10, max: 100, text: 'Haz que la tarea B llegue a trabajar', done: 'O le das más prioridad, o haces que A espere sin gastar CPU.', hint: 'Cambia la forma de esperar.' },
          { q: 'good', min: 1, max: 1, text: 'Consigue que trabajen las tres sin desperdiciar CPU', done: 'Con osDelay, quien espera queda bloqueada y la CPU va a quien la necesita.' },
          { q: 'tie', min: 1, max: 1, text: 'Da a A y B la misma prioridad (con osDelay) y mira cómo se turnan', done: 'Con igual prioridad se reparten la CPU por turnos en cada tick.' }] },
      I('Un «superbucle» (un while(1) que lo hace todo) funciona hasta que hay muchas cosas con plazos distintos: cada función lenta retrasa a todas las demás. Con <b>FreeRTOS</b> cada trabajo es una <b>tarea</b>, con su propio bucle y su propia pila.', { code: 'void TareaSensor(void *arg) {\n  for (;;) {\n    leer_sensor();\n    osDelay(2);       // cada 2 ms\n  }\n}\nvoid TareaPantalla(void *arg) {\n  for (;;) {\n    dibujar();\n    osDelay(50);\n  }\n}' }),
      I('El <b>planificador</b> ejecuta siempre la tarea <b>lista</b> de mayor prioridad y en cada tick (normalmente 1 ms) decide si cambia. En FreeRTOS, <b>número mayor = más importante</b>, al revés que en el NVIC. Con igual prioridad, se turnan.', { tune: { viz: 'st_rtos', params: P_RTOS(2, 2, 1) }, more: 'En CubeMX se activa en Middleware › FREERTOS con la interfaz CMSIS-RTOS v2, que da funciones como osThreadNew u osDelay.' }),
      I('Estados de una tarea: <b>Running</b> (ejecutándose), <b>Ready</b> (lista, espera turno), <b>Blocked</b> (espera tiempo o un evento, sin gastar CPU) y <b>Suspended</b> (apartada). Si nadie está listo corre la tarea <b>Idle</b>, que puede dormir el chip.', { svg: table([['Running', 'Se está ejecutando'], ['Ready', 'Podría ejecutarse: espera turno'], ['Blocked', 'Espera tiempo o evento: no gasta'], ['Suspended', 'Apartada hasta que la reanuden']], 'Estados de una tarea') }),
      I('El cambio de tarea se hace en la excepción <b>PendSV</b>, con la prioridad más baja del NVIC: nunca deja a medias una interrupción de periférico; espera a que todas terminen.', { svg: chain(['Tick|(SysTick)', 'El planificador|decide', 'PendSV|cambia de tarea']) }),
      { t: 'steps', text: 'A (prioridad 3) trabaja 1 ms cada 5 ms con osDelay; B (prioridad 2), 3 ms cada 10 ms. ¿Cuánta CPU queda para una tarea de prioridad 1?', steps: ['A usa 1 de cada 5 ms: <b>20 %</b>', 'B usa 3 de cada 10 ms: <b>30 %</b>', 'Mientras esperan están Blocked: no gastan nada', 'Queda 100 − 20 − 30 = <b>50 %</b> para la de prioridad 1'], result: 'La mitad de la CPU, sin tocar los plazos de A y B.' },
      { t: 'match', q: 'Une cada estado de tarea con su significado.', pairs: [['Running', 'Se está ejecutando ahora'], ['Ready', 'Podría ejecutarse, espera su turno'], ['Blocked', 'Espera un tiempo o un evento'], ['Suspended', 'Apartada hasta que alguien la reanude']], c: 'st_rtos', h: 'Blocked espera algo; Ready solo espera turno.' },
      Q('Una tarea tiene prioridad 3 en FreeRTOS y otra prioridad 1. ¿Cuál es más importante?', ['La de prioridad 3: en FreeRTOS, número mayor es más prioritario', 'La de prioridad 1, como en el NVIC', 'Iguales', 'Depende del tick'], 'Justo al revés que en el NVIC: fuente clásica de errores.', { c: 'st_rtos', h: 'Al revés que en el NVIC.' }),
      Q('¿Qué ocurre cuando una tarea llama a osDelay(100)?', ['Pasa a Blocked 100 ticks y la CPU queda para las demás', 'La CPU espera 100 ms sin hacer nada', 'Se borra la tarea', 'Se reinicia el planificador'], 'Esperar sin gastar CPU es la gracia de un RTOS.', { c: 'st_rtos', h: 'Piensa en el estado Blocked.' }),
      Q('Dos tareas listas con la misma prioridad. ¿Cómo se reparten la CPU?', ['Por turnos en cada tick', 'Solo se ejecuta la primera creada', 'Se ejecutan a la vez', 'Ninguna se ejecuta'], 'El reparto por turnos viene activado por defecto.', { c: 'st_rtos', h: 'Por turnos.' }),
      Q('¿Por qué PendSV tiene la prioridad más baja?', ['Para cambiar de tarea solo cuando no queda ninguna interrupción pendiente', 'Para que vaya más rápido', 'Porque es la menos importante', 'Por un fallo de diseño'], 'Las interrupciones nunca quedan a medias por un cambio de tarea.', { c: 'st_nvic', h: 'No debe interrumpir a los periféricos.' }),
      Q('¿Qué hace la tarea Idle?', ['Se ejecuta cuando no hay nada listo; puede dormir la CPU para ahorrar', 'Gestiona la UART', 'Comprueba la Flash', 'Es la de mayor prioridad'], 'Con el modo tickless, el chip duerme entre eventos.', { c: 'st_rtos', h: 'Corre cuando nadie más puede.' }),
      Q('Una tarea con la prioridad más alta hace while (1) { } sin esperar nunca. ¿Qué pasa?', ['Las de menor prioridad no se ejecutan nunca', 'Se reparten la CPU a partes iguales', 'El RTOS la mata', 'Nada'], 'Hay que bloquearse para ceder la CPU.', { c: 'st_rtos', h: 'Nunca cede la CPU.' }),
      Q('¿Cuándo NO merece la pena un RTOS?', ['En un programa sencillo con una o dos tareas sin plazos exigentes', 'Nunca merece la pena', 'Siempre que haya interrupciones', 'Cuando hay más de 32 KB de RAM'], 'Un RTOS añade memoria, complejidad y nuevos tipos de errores.', { c: 'st_rtos', h: 'Todo tiene un coste.' }),
      I('<b>Resumen</b>\n· Cada trabajo, una tarea con su bucle y su pila; corre la lista de mayor prioridad.\n· En FreeRTOS número mayor = más importante; esperar con osDelay deja la CPU libre.\n· El cambio de tarea va en PendSV, la excepción menos urgente.')
    ]),
    L('st35', 'Tareas y su pila', 'memory', ['st_stack', 'st_task'], [
      Q('Una tarea con 128 palabras de pila declara un array local char buf[1024]. ¿Qué crees que pasa?', ['Desborda: 1024 bytes no caben en 512', 'Nada', 'El array va a la Flash', 'Va más lenta'], 'Una palabra son 4 bytes: 128 palabras = 512 B. Llénala tú.', { ...PRED, c: 'st_stack', h: 'Una palabra son 4 bytes.' }),
      { t: 'explore', text: 'La pila de una tarea guarda su contexto, sus variables locales y lo que usen sus llamadas.', viz: 'st_stk', params: P_STK(128, 0, 0),
        tasks: [{ q: 'over', min: 1, max: 1, text: 'Provoca un desbordamiento', done: 'Los arrays locales viven en la pila de la tarea.', hint: 'Añade un array local grande.' },
          { q: 'fit', min: 1, max: 1, text: 'Con el array de 1024 B y printf, elige una pila que no desborde', done: 'Hacen falta al menos 384 palabras (1536 B); con margen, 512.' }] },
      I('Crear una tarea con CMSIS-RTOS v2: una función que nunca termina, unos atributos y osThreadNew. Ojo: <b>.stack_size</b> va en <b>bytes</b>; CubeMX pide palabras y multiplica por 4.', { code: 'const osThreadAttr_t attr = {\n  .name = "sensor",\n  .stack_size = 256 * 4,     // bytes\n  .priority = osPriorityNormal,\n};\nosThreadNew(TareaSensor, NULL, &attr);' }),
      I('Las pilas salen del <b>montón de FreeRTOS</b> (configTOTAL_HEAP_SIZE). Si no cabe una tarea nueva, osThreadNew devuelve NULL. Gastan mucha pila los arrays locales, printf y la recursión.', { tune: { viz: 'st_stk', params: P_STK(256, 256, 1) } }),
      I('Para vigilarla: <b>uxTaskGetStackHighWaterMark</b> dice cuántas palabras no se han usado nunca, y con configCHECK_FOR_STACK_OVERFLOW = 2 se llama a vApplicationStackOverflowHook si se pasa.', { code: 'UBaseType_t libres = uxTaskGetStackHighWaterMark(NULL);\nprintf("libres: %lu palabras\\n", (unsigned long)libres);' }),
      I('Una tarea es un <b>bucle infinito</b>: si su función retorna, falla. Para un periodo exacto, <b>osDelayUntil</b>: osDelay cuenta desde que lo llamas y suma el tiempo de trabajo.', { tune: { viz: 'st_drift', params: P_DRIFT(3, 0) }, code: 'uint32_t t = osKernelGetTickCount();\nfor (;;) {\n  trabajo();\n  t += 10;\n  osDelayUntil(t);   // cada 10 ms exactos\n}' }),
      { t: 'steps', text: 'Una tarea tiene 256 palabras de pila y la marca de agua es 40. ¿Cuánto ha usado como máximo?', steps: ['Pila total: 256 × 4 = <b>1024 B</b>', 'Marca de agua: 40 palabras sin usar nunca = 160 B', 'Usado como máximo: 1024 − 160 = <b>864 B</b>', 'Margen: un 16 %. Conviene algo más'], result: '864 B usados.' },
      Q('En CMSIS-RTOS v2, ¿en qué unidad va .stack_size?', ['En bytes', 'En palabras de 32 bits', 'En KB', 'En ticks'], 'CubeMX pide palabras y genera «tamaño × 4». En xTaskCreate nativo, palabras.', { c: 'st_stack', h: 'Mira la multiplicación por 4.' }),
      G('st_stack'),
      Q('osThreadNew devuelve NULL. ¿Causa más probable?', ['No queda memoria en el montón de FreeRTOS', 'La función de la tarea tiene un error', 'La prioridad es demasiado alta', 'El tick está parado'], 'Sube configTOTAL_HEAP_SIZE o reduce pilas.', { c: 'st_stack', h: 'Las pilas salen del montón.' }),
      Q('¿Qué gasta mucha pila en una tarea?', ['Arrays locales grandes, printf y la recursión', 'Las variables globales', 'Las constantes', 'Los #define'], 'printf con formatos puede necesitar cientos de bytes.', { c: 'st_stack', h: 'Lo que vive dentro de las funciones.' }),
      Q('¿Qué le pasará a esta tarea con 128 palabras de pila?', ['Desborda: 1024 bytes de array no caben en 512 bytes de pila', 'Nada', 'Va más lenta', 'No compila'], 'Haz el búfer static o dale mucha más pila.', { code: 'void Tarea(void *a) {\n  char buf[1024];\n  for (;;) { leer(buf); }\n}', c: 'st_stack', h: '128 palabras son 512 bytes.' }),
      Q('¿Qué pasa si la función de una tarea llega al final y retorna?', ['Error: una tarea nunca debe retornar; usa un bucle infinito u osThreadExit()', 'La tarea se repite', 'Se reinicia el chip limpiamente', 'Nada'], 'FreeRTOS no sabe a dónde volver.', { c: 'st_task', h: 'FreeRTOS no sabe a dónde volver.' }),
      TU('Con 3 ms de trabajo por vuelta, consigue un periodo de 10 ms exactos.', 'st_drift', { work: { val: 3, fixed: true }, mode: sl('Espera (osDelay, osDelayUntil)', 0, 0, 1) }, { q: 'per', min: 10, max: 10, text: 'Objetivo: periodo de 10 ms', hint: 'Cambia la forma de esperar.' }, 'osDelayUntil espera hasta la marca, no 10 ms desde ahora.', { c: 'st_task', h: 'Una espera cuenta desde ahora; la otra, hasta una marca.' }),
      Q('Tarea que debe ejecutarse exactamente cada 10 ms aunque su trabajo tarde un poco. ¿Qué usas?', ['osDelayUntil con un tiempo de referencia', 'osDelay(10) al final', 'HAL_Delay(10)', 'Un while vacío'], 'osDelayUntil no acumula deriva.', { c: 'st_task', h: 'Busca la que no acumula deriva.' }),
      G('st_stack'),
      I('<b>Resumen</b>\n· Pila en palabras de 4 bytes (CMSIS v2 la pide en bytes); sale del montón del RTOS.\n· Arrays locales, printf y recursión la llenan: vigila la marca de agua.\n· Tarea = bucle infinito; periodo exacto con osDelayUntil.')
    ]),
    L('st36', 'Colas y semáforos', 'bus', ['st_queue', 'st_rtosisr', 'st_rtos'], [
      Q('Una interrupción mete datos en una cola que está llena. ¿Qué crees que debe hacer?', ['Descartar el dato: una interrupción no puede esperar', 'Esperar a que haya sitio', 'Borrar la cola', 'Reiniciar'], 'Una ISR nunca se bloquea. Juega con una cola.', { ...PRED, c: 'st_rtosisr', h: 'Una ISR nunca se bloquea.' }),
      { t: 'explore', text: 'Un productor mete mensajes en una cola y un consumidor los saca.', viz: 'st_queue', params: P_QUEUE(50, 100, 8, 0),
        tasks: [{ q: 'lost', min: 1, max: 1e6, text: 'Haz que se pierdan mensajes', done: 'Productor más rápido que el consumidor: la cola se llena y lo que sobra se descarta.', hint: 'Productor más rápido que el consumidor.' },
          { q: 'okWait', min: 1, max: 1, text: 'Si el productor es una tarea, que espere en vez de descartar', done: 'La cola marca el ritmo: el productor se bloquea hasta que haya sitio.' }] },
      I('Una <b>cola</b> es una FIFO de mensajes de tamaño fijo que se <b>copian</b> dentro. Quien lee puede bloquearse esperando: es la forma limpia de pasar datos de una interrupción a una tarea.', { code: 'osMessageQueueId_t cola =\n  osMessageQueueNew(16, sizeof(muestra_t), NULL);\n\n/* en la tarea */\nosMessageQueueGet(cola, &m, NULL, osWaitForever);' }),
      I('<b>Semáforo binario</b>: una señal («ya ha pasado»). <b>Semáforo contador</b>: cuenta eventos o recursos. osSemaphoreAcquire bloquea hasta que alguien hace osSemaphoreRelease. Para avisar a una sola tarea hay también <b>notificaciones</b> (thread flags), más ligeras.', { svg: table([['Cola', 'Pasa datos copiándolos'], ['Semáforo binario', 'Avisa de que algo ha ocurrido'], ['Semáforo contador', 'Cuenta eventos o recursos'], ['Notificación', 'Aviso ligero a una tarea']], 'Herramientas para comunicar') }),
      I('Desde una interrupción: <b>nunca bloquear</b> (tiempo de espera 0) y prioridad NVIC <b>igual o mayor</b> (en número) que configMAX_SYSCALL_INTERRUPT_PRIORITY, que es 5 en CubeMX. Las de 0–4 no pueden llamar al RTOS.', { svg: SVG_RTOSPRIO }),
      I('Con la API nativa, la versión FromISR avisa si ha despertado a una tarea más importante: <b>portYIELD_FROM_ISR</b> cambia a ella al salir, sin esperar al siguiente tick.', { code: 'BaseType_t woken = pdFALSE;\nxQueueSendFromISR(cola, &dato, &woken);\nportYIELD_FROM_ISR(woken);' }),
      { t: 'steps', text: 'Un sensor manda bytes por la UART y una tarea los procesa.', steps: ['En el callback de recepción (ISR): osMessageQueuePut(cola, &byte, 0, <b>0</b>)', 'Prioridad NVIC de la UART: 5 o más (en número)', 'La tarea espera con osMessageQueueGet(…, osWaitForever): Blocked, sin gastar CPU', 'Al llegar un byte, el RTOS la despierta y lo procesa'], result: 'ISR corta y tarea dormida hasta que hay trabajo.' },
      Q('¿Por qué el tiempo de espera es 0 en esta llamada?', ['Porque se llama desde una interrupción, que nunca puede bloquearse', 'Para que sea más rápido', 'Porque la cola está vacía', 'Por error'], 'Desde una ISR solo vale 0: si la cola está llena, se descarta.', { code: 'void HAL_UART_RxCpltCallback(\n    UART_HandleTypeDef *h) {\n  osMessageQueuePut(cola, &byte,\n    0, 0);\n}', c: 'st_rtosisr', h: 'Ese callback corre dentro de una interrupción.' }),
      Q('Envías a una cola un puntero a un array local de la tarea emisora. ¿Riesgo?', ['Cuando el receptor lo lea, el array puede haber cambiado o no existir', 'Ninguno', 'Que la cola se llene', 'Que el puntero se copie mal'], 'La cola copia el puntero, no los datos.', { c: 'st_queue', h: 'La cola copia lo que le das.' }),
      Q('Una interrupción debe despertar a una tarea cuando hay datos. ¿Qué usas?', ['Un semáforo binario o una notificación de tarea', 'Un mutex', 'Una variable global y un while', 'HAL_Delay'], 'La tarea duerme sin gastar CPU hasta la señal.', { c: 'st_queue', h: 'Una señal, no un recurso.' }),
      Q('Una interrupción con prioridad NVIC 3 llama a osSemaphoreRelease. CubeMX tiene el límite en 5. ¿Qué pasa?', ['Puede corromper el núcleo del RTOS: esa interrupción debe tener prioridad 5 o mayor', 'Funciona', 'No compila', 'Se ignora la llamada'], 'Solo las interrupciones menos urgentes que el límite pueden usar la API.', { c: 'st_rtosisr', h: '3 es más urgente que el límite.' }),
      Q('Con la API nativa, ¿para qué sirve portYIELD_FROM_ISR(woken)?', ['Para cambiar a la tarea despertada nada más salir de la interrupción', 'Para desactivar interrupciones', 'Para borrar la bandera', 'Para dormir la CPU'], 'Si no, la tarea esperaría al siguiente tick.', { c: 'st_rtosisr', h: 'Sin él, esperarías al siguiente tick.' }),
      { t: 'match', q: 'Une cada herramienta con su uso.', pairs: [['Cola', 'Pasar datos copiándolos'], ['Semáforo binario', 'Avisar de que algo ha ocurrido'], ['Semáforo contador', 'Contar eventos o recursos'], ['Mutex', 'Proteger un recurso compartido']], c: 'st_queue', h: 'Datos, aviso, cuenta y protección.' },
      Q('El productor usa osWaitForever y la cola está llena. ¿Qué le pasa?', ['Se bloquea hasta que el consumidor saque algo', 'Pierde el dato', 'Sobrescribe el más viejo', 'Se reinicia'], 'Las colas también regulan el ritmo entre tareas.', { c: 'st_queue', h: 'Espera para siempre si hace falta.' }),
      Q('¿Cuánta CPU gasta esta tarea mientras no llegan mensajes?', ['Ninguna: está bloqueada', 'Toda', 'La mitad', 'Un tick de cada dos'], 'Por eso se diseña con tareas que esperan eventos.', { code: 'for (;;) {\n  osMessageQueueGet(cola, &m, NULL,\n                    osWaitForever);\n  procesar(&m);\n}', c: 'st_rtos', h: 'Piensa en el estado Blocked.' }),
      I('<b>Resumen</b>\n· Colas para datos (se copian), semáforos y notificaciones para avisar.\n· Desde una ISR: espera 0, funciones FromISR y prioridad NVIC de 5 a 15.\n· Una tarea que espera en una cola no gasta CPU.')
    ]),
    PRJ('st-p13', 'Proyecto: pantalla TFT con menú y FreeRTOS', 'st_tft'),
    L('st37', 'Mutex e inversión de prioridad', 'shield', ['st_mutex', 'st_rtosisr'], [
      Q('Dos tareas usan printf a la vez. ¿Qué crees que verás en el terminal?', ['Letras de los dos mensajes mezcladas', 'Los dos mensajes en orden siempre', 'Nada', 'Solo el de mayor prioridad'], 'Una tarea puede ser expulsada a mitad de su mensaje. Hace falta proteger la UART.', { ...PRED, c: 'st_mutex', h: 'Una tarea puede perder la CPU a mitad de su mensaje.' }),
      { t: 'explore', text: 'La tarea baja tiene un mutex; la alta lo pide en t = 1 ms.', viz: 'st_inv', params: P_INV(0, 0, 2),
        tasks: [{ q: 'waitH', min: 6, max: 100, text: 'Activa la tarea media y mira cuánto espera la alta', done: 'Inversión de prioridad: la media, que ni usa el mutex, retrasa a la alta.', hint: 'Activa la tarea media.' },
          { q: 'fixed', min: 1, max: 1, text: 'Arréglalo sin quitar la tarea media', done: 'Con herencia de prioridad, la baja sube y nadie la expulsa.' }] },
      I('Un <b>mutex</b> protege un recurso compartido (la UART, un bus SPI): quien lo toma es el único que lo usa hasta que lo devuelve.', { code: 'osMutexAcquire(mutexUart, osWaitForever);\nprintf("Temperatura: %d\\n", t);\nosMutexRelease(mutexUart);' }),
      I('<b>Inversión de prioridad</b>: la tarea baja tiene el mutex; la alta lo pide y se bloquea; una media que no lo necesita expulsa a la baja… y la alta acaba esperando a la media.', { tune: { viz: 'st_inv', params: P_INV(1, 0, 2) } }),
      I('Los mutex de FreeRTOS tienen <b>herencia de prioridad</b>: mientras la baja tiene el mutex que pide la alta, sube a la prioridad de la alta. Un semáforo binario no la tiene: semáforo para avisar, mutex para proteger.', { tune: { viz: 'st_inv', params: P_INV(1, 1, 2) }, more: 'Un caso famoso: en 1997, la sonda Mars Pathfinder se reiniciaba en Marte por una inversión de prioridad. Se arregló a distancia activando la herencia de prioridad del mutex implicado.' }),
      I('Reglas: ten el mutex el <b>menor tiempo</b> posible, nunca esperes con él tomado, tómalos siempre <b>en el mismo orden</b> (si no, interbloqueo) y nunca dentro de una interrupción.', { svg: table([['Corto', 'Toma, usa y suelta'], ['Sin esperas', 'Nada de osDelay con el mutex'], ['Mismo orden', 'Siempre 1 y luego 2'], ['Solo tareas', 'Nunca en una ISR']], 'Reglas del mutex') }),
      { t: 'steps', text: 'A toma el mutex 1 y luego pide el 2; B toma el 2 y luego pide el 1.', steps: ['A tiene el 1 y espera el 2', 'B tiene el 2 y espera el 1', 'Ninguna suelta lo que tiene: esperan para siempre (<b>interbloqueo</b>)', 'Solución: las dos toman primero el 1 y luego el 2'], result: 'Mismo orden siempre.' },
      Q('Dos tareas usan printf y los mensajes salen mezclados. ¿Solución?', ['Proteger la salida con un mutex', 'Subir la velocidad de la UART', 'Usar un semáforo contador', 'Quitar las prioridades'], 'Toma el mutex, imprime la línea entera y suéltalo.', { c: 'st_mutex', h: 'Un recurso compartido necesita protección.' }),
      Q('En la inversión de prioridad, ¿quién bloquea de verdad a la tarea alta?', ['La tarea media, que impide a la baja terminar y soltar el mutex', 'La tarea baja por sí sola', 'El planificador', 'La tarea Idle'], 'Una tarea menos importante retrasa a la más importante.', { c: 'st_mutex', h: '¿Quién impide que la baja termine?' }),
      Q('¿Por qué un mutex y no un semáforo binario para proteger un recurso?', ['El mutex tiene herencia de prioridad; el semáforo no', 'El semáforo es más lento', 'Es lo mismo', 'El semáforo no existe en FreeRTOS'], 'Semáforo para señalar; mutex para proteger.', { c: 'st_mutex', h: 'Uno sube la prioridad de quien lo tiene.' }),
      Q('La tarea A toma el mutex 1 y pide el 2; la B toma el 2 y pide el 1. ¿Qué puede pasar?', ['Interbloqueo: cada una espera a la otra para siempre', 'Nada', 'Que vayan más rápido', 'Que el RTOS lo resuelva solo'], 'Toma siempre los mutex en el mismo orden.', { c: 'st_mutex', h: 'Cada una tiene lo que la otra necesita.' }),
      Q('¿Puedes tomar un mutex dentro de una interrupción?', ['No: los mutex son solo para tareas', 'Sí, con espera infinita', 'Sí, si la prioridad es 0', 'Solo con la API nativa'], 'Una interrupción no puede bloquearse ni heredar prioridad.', { c: 'st_rtosisr', h: 'Una ISR no puede esperar.' }),
      Q('¿Qué buena práctica reduce estos problemas?', ['Tener el mutex el menor tiempo posible y nunca esperar con él tomado', 'Tomar todos los mutex al arrancar', 'Usar prioridades iguales siempre', 'No usar colas'], 'Cuanto menos dure la sección protegida, menos conflictos.', { c: 'st_mutex', h: 'Cuanto menos tiempo, mejor.' }),
      I('<b>Resumen</b>\n· Mutex para proteger recursos; semáforo para avisar.\n· Inversión de prioridad: la herencia de los mutex la evita.\n· Corto, sin esperas, siempre en el mismo orden y nunca en una ISR.')
    ]),
    L('st38', 'Temporizadores software y la base de tiempo', 'timer', ['st_swtimer', 'st_rtos', 'st_rtosisr', 'st_tick'], [
      Q('Con FreeRTOS, CubeMX te pide que la HAL use otro temporizador como base de tiempo en lugar del SysTick. ¿Por qué crees que lo hace?', ['El SysTick pasa a ser del RTOS y la HAL necesita su propio reloj', 'Porque el SysTick se rompe', 'Para gastar menos', 'Por compatibilidad con Arduino'], 'Dos usuarios para un mismo temporizador se pisarían. Antes, el grano del tick.', { ...PRED, c: 'st_swtimer', h: 'Dos usuarios para un mismo temporizador.' }),
      { t: 'explore', text: 'Llamas a una espera en algún momento entre dos ticks de 1 ms.', viz: 'st_tickres', params: P_TRES(0.5, 1, 0),
        tasks: [{ q: 'dOs1', min: 0, max: 0.3, text: 'Haz que osDelay(1) dure menos de 0,3 ms', done: 'Si lo llamas justo antes de un tick, ese tick ya cuenta.', hint: 'Llámalo tarde dentro del tick.' },
          { q: 'dHal1', min: 1.9, max: 2.01, text: 'Haz que HAL_Delay(1) dure casi 2 ms', done: 'Llamado justo tras un tick, más el tick extra de garantía.' }] },
      I('Los <b>temporizadores software</b> llaman a un callback tras un tiempo o periódicamente. Todos sus callbacks corren en <b>una sola tarea</b> del sistema: deben ser cortos y no bloquear nunca.', { svg: SVG_SWT, code: 'osTimerId_t t = osTimerNew(parpadeo,\n  osTimerPeriodic, NULL, NULL);\nosTimerStart(t, 500);   // ticks' }),
      I('Con FreeRTOS el <b>SysTick</b> es del RTOS. La base de tiempo de la HAL (HAL_GetTick y sus esperas) pasa a un temporizador hardware, por ejemplo TIM11: así funciona aunque el planificador no haya arrancado o esté parado.', { svg: table([['SysTick', 'Tick de FreeRTOS: osDelay, colas…'], ['TIM11 (por ejemplo)', 'Base de la HAL: HAL_GetTick']], 'Cada uno con su reloj') }),
      I('La resolución de cualquier espera es un tick: osDelay(1) dura entre casi 0 y 1 ms según cuándo lo llames. Para esperas cortas y exactas, un temporizador hardware.', { tune: { viz: 'st_tickres', params: P_TRES(0.25, 2, 0) }, more: 'Modo tickless: si todas las tareas esperan, el RTOS para el tick y duerme más tiempo seguido. Muy útil con batería.' }),
      I('Recuerda la frontera: las interrupciones de prioridad <b>0–4</b> nunca las retrasa el RTOS, pero no pueden llamarlo; las de <b>5–15</b> pueden usar las funciones FromISR. El control de un motor, si no llama al RTOS, va en 0–4.', { svg: SVG_RTOSPRIO }),
      { t: 'steps', text: 'Quieres parpadear un LED cada 500 ms sin crear una tarea.', steps: ['Crea un temporizador periódico: osTimerNew(parpadeo, osTimerPeriodic, NULL, NULL)', 'Arráncalo: osTimerStart(t, 500): 500 ticks = 500 ms con tick de 1 kHz', 'En parpadeo(), solo HAL_GPIO_TogglePin: corto y sin esperas', 'Todos los temporizadores comparten la tarea de servicio'], result: 'Un LED parpadeando con una línea de callback.' },
      Q('¿Qué hace este código?', ['Llama a parpadeo cada 500 ticks (500 ms con tick de 1 kHz)', 'Espera 500 ms una vez', 'Crea una tarea nueva', 'Configura un temporizador hardware'], 'Ideal para trabajos cortos y periódicos.', { code: 'osTimerId_t t = osTimerNew(parpadeo,\n  osTimerPeriodic, NULL, NULL);\nosTimerStart(t, 500);', c: 'st_swtimer', h: 'Periodic: se repite.' }),
      Q('Un callback de temporizador software llama a osDelay(100). ¿Problema?', ['Bloquea la tarea de temporizadores y retrasa a todos los demás', 'Ninguno', 'Se reinicia el chip', 'El temporizador se acelera'], 'Los callbacks deben ser cortos y no bloquear.', { c: 'st_swtimer', h: 'Todos comparten una misma tarea.' }),
      Q('¿Por qué la HAL necesita otra base de tiempo con FreeRTOS?', ['Sus esperas deben funcionar aunque el planificador no haya arrancado o esté parado', 'Porque el SysTick es lento', 'Para ahorrar energía', 'Porque la HAL no usa tiempo'], 'Cada uno con su reloj, sin pisarse.', { c: 'st_swtimer', h: 'Piensa en antes de arrancar el planificador.' }),
      Q('Dentro de una tarea, ¿HAL_Delay(100) u osDelay(100)?', ['osDelay: bloquea la tarea y deja la CPU a las demás', 'HAL_Delay: es más precisa', 'Da igual', 'Ninguna funciona'], 'HAL_Delay espera dando vueltas.', { c: 'st_rtos', h: 'Una bloquea; la otra da vueltas.' }),
      Q('La interrupción del control de un motor necesita el mínimo retardo y no llama al RTOS. ¿Qué prioridad?', ['Entre 0 y 4', 'Entre 5 y 15', '15', 'Da igual'], 'El RTOS nunca enmascara esas prioridades.', { c: 'st_rtosisr', h: 'Por encima de la frontera del 5.' }),
      Q('Con un tick de 1 kHz, ¿cuánto puede durar osDelay(1)?', ['Entre casi 0 y 1 ms, según cuándo se llame', 'Exactamente 1 ms', 'Siempre 2 ms', '1 µs'], 'La resolución de las esperas del RTOS es un tick.', { c: 'st_tick', h: 'Depende de en qué punto del tick la llames.' }),
      Q('¿Qué es el modo tickless?', ['Detener el tick cuando todas las tareas esperan para dormir más tiempo seguido', 'Un RTOS sin prioridades', 'Quitar el SysTick para siempre', 'Un tick de 1 Hz'], 'Muy útil en equipos con batería.', { c: 'st_rtos', h: 'Sin tick no hay que despertar cada ms.' }),
      I('<b>Resumen</b>\n· Temporizadores software: callbacks cortos en una sola tarea.\n· Con FreeRTOS, el SysTick es del RTOS y la HAL usa otro temporizador.\n· Las esperas tienen resolución de un tick; 0–4 para ISR que no llaman al RTOS.')
    ]),
    PRJ('st-p14', 'Proyecto: sintetizador I²S polifónico', 'st_synth'),
    PRJ('st-p15', 'Proyecto: estación de soldadura T12', 'st_solder')
  ] };

  const M8 = { id: 'st-m8', title: 'Del prototipo al producto', desc: 'Bajo consumo, watchdogs, cargadores de arranque, la Flash interna, tu propia placa y firmware profesional.', nodes: [
    L('st39', 'Bajo consumo: Sleep, Stop y Standby', 'sleep', ['st_power', 'st_avgcur', 'st_hsi', 'st_32k', 'st_leak', 'st_dbglp'], [
      Q('Un nodo despierta 20 ms cada 10 s para medir y el resto duerme. ¿Qué crees que pesa más en la batería?', ['Depende: hay que comparar corriente × tiempo de cada estado', 'Siempre el rato despierto', 'Siempre el sueño', 'Ninguno: dormir sale gratis'], 'Es una media ponderada por el tiempo, como en el curso base. Juega con ella.', { ...PRED, c: 'st_avgcur', h: 'Media ponderada por el tiempo.' }),
      { t: 'explore', text: 'Un nodo con batería de 2000 mAh despierta, mide y vuelve a dormir.', viz: 'st_avg', params: P_AVG(20, 100, 1, 500),
        tasks: [{ q: 'days', min: 365, max: 1e9, text: 'Consigue más de un año de batería', done: 'Despierta poco, duerme mucho y que el sueño gaste poco.', hint: 'Despierta menos a menudo y baja el consumo dormido.' },
          { q: 'days', min: 1826, max: 1e9, text: 'Ahora más de 5 años', done: 'Con 10 µA dormido y un despertar breve cada minuto, la media baja a unos 12 µA.' }] },
      I('Tres profundidades:\n<b>Sleep</b>: para el núcleo; despierta cualquier interrupción.\n<b>Stop</b>: para casi todos los relojes; RAM y registros intactos; despierta por EXTI o el RTC.\n<b>Standby</b>: casi todo apagado; al despertar arranca desde el reset.', { svg: SVG_POWER }),
      I('Trampas: en Sleep, el SysTick te despierta cada milisegundo (llama a HAL_SuspendTick antes de dormir). Al salir de Stop el reloj vuelve al <b>HSI</b>: llama otra vez a SystemClock_Config.', { code: 'HAL_SuspendTick();\nHAL_PWR_EnterSTOPMode(PWR_LOWPOWERREGULATOR_ON,\n                      PWR_STOPENTRY_WFI);\nSystemClock_Config();   // vuelve al PLL\nHAL_ResumeTick();' }),
      I('El RTC, con el cristal LSE de 32 768 Hz, despierta al chip: su temporizador de despertar cuenta, por ejemplo, LSE ÷16 = 2048 Hz. Para t segundos: t × 2048 cuentas, y se carga cuentas − 1.', { code: 'HAL_RTCEx_SetWakeUpTimer_IT(&hrtc, 20480 - 1,\n  RTC_WAKEUPCLOCK_RTCCLK_DIV16);   // 10 s' }),
      I('A menudo la placa gasta más que el chip: LED de encendido, regulador, pull-ups con corriente, sensores y pines al aire. Y mientras desarrollas, DBGMCU mantiene el depurador vivo en Stop… a cambio de más consumo.', { svg: SVG_LEAK }),
      { t: 'steps', text: 'Nodo: 5 mA durante 20 ms cada 10 s y 10 µA el resto. ¿Media y duración con 2000 mAh?', steps: ['Despierto: 5000 µA × 0,02 s = 100 µA·s', 'Dormido: 10 µA × 9,98 s = 99,8 µA·s', 'Media: (100 + 99,8) / 10 s ≈ <b>20 µA</b>', 'Duración: 2000 mAh / 0,02 mA = 100 000 h ≈ <b>11,4 años</b>'], result: 'En la práctica, la autodescarga de la batería lo acortará.' },
      { t: 'match', q: 'Une cada modo con lo que conserva.', pairs: [['Sleep', 'Todo: solo se para el núcleo'], ['Stop', 'RAM y registros, con relojes parados'], ['Standby', 'Solo el dominio de respaldo (RTC y sus registros)']], c: 'st_power', h: 'Cuanto más profundo, menos conserva.' },
      Q('Tras despertar de Standby, ¿dónde sigue el programa?', ['Desde el reset, como un arranque nuevo', 'En la línea siguiente a la que lo durmió', 'En main, con las variables intactas', 'En la interrupción del RTC'], 'Por eso hay que mirar la bandera de Standby al arrancar.', { c: 'st_power', h: 'En Standby se pierde la RAM.' }),
      Q('Tras despertar de Stop en una F4, ¿qué reloj tiene el sistema?', ['El HSI: hay que reconfigurar el PLL', 'El PLL, como antes', 'El LSE', 'Ninguno'], 'Llama de nuevo a SystemClock_Config().', { c: 'st_hsi', h: 'Igual que tras el reset.' }),
      Nm('LSE ÷16 = 2048 Hz. ¿Qué valor cargas para despertar cada 5 s? (cuentas − 1)', 10239, '', '5 × 2048 = 10 240 cuentas → 10 239.', { c: 'st_32k', h: 'Segundos × 2048, menos 1.' }),
      Q('¿Por qué HAL_SuspendTick antes de dormir en Sleep?', ['Porque la interrupción del SysTick despertaría al chip cada milisegundo', 'Para ahorrar Flash', 'Porque el SysTick se rompe', 'No hace falta nunca'], 'Cualquier interrupción saca al núcleo de Sleep.', { c: 'st_power', h: 'Cualquier interrupción despierta en Sleep.' }),
      Nm('2 mA durante 50 ms cada 5 s y 5 µA el resto. ¿Corriente media en µA?', 24.95, 'µA', '(2000 × 0,05 + 5 × 4,95) / 5 ≈ 25 µA.', { tol: 0.5, c: 'st_avgcur', h: 'Pasa todo a µA y segundos.' }),
      Nm('Con 1000 mAh y 50 µA de media, ¿cuántos años, aproximadamente?', 2.28, 'años', '1000 / 0,05 = 20 000 h; / 8760 ≈ 2,3 años.', { tol: 0.1, c: 'st_avgcur', h: 'mAh / mA = horas; un año son 8760 h.' }),
      Q('Tu nodo en Stop consume mucho más de lo esperado. ¿Qué revisas primero en la placa?', ['LED de encendido, regulador, pull-ups y pines flotantes', 'El tamaño de la Flash', 'La versión de CubeIDE', 'La velocidad de la UART'], 'A menudo la placa gasta más que el chip.', { c: 'st_leak', h: 'Lo que gasta aunque el chip duerma.' }),
      Q('El depurador se desconecta al entrar en Stop. ¿Qué haces mientras desarrollas?', ['Mantener la depuración en Stop con DBGMCU', 'Cambiar de ST-LINK', 'No usar Stop nunca', 'Subir la frecuencia de SWD'], 'En Stop se paran los relojes que usa la depuración.', { c: 'st_dbglp', h: 'Hay un bloque que mantiene vivo al depurador.' }),
      Q('Dejas activada la depuración en Stop para el producto final. ¿Efecto?', ['Más consumo: mantiene relojes encendidos para el depurador', 'Ninguno', 'Menos consumo', 'El chip no despierta'], 'Actívala solo mientras desarrollas.', { c: 'st_dbglp', h: 'Esos relojes gastan.' }),
      I('<b>Resumen</b>\n· Sleep, Stop, Standby: menos consumo y más pérdida a cada escalón.\n· Media = Σ (corriente × tiempo) / periodo; despertar breve y sueño de pocos µA.\n· Tras Stop, vuelve al PLL; revisa lo que gasta la placa.')
    ]),
    L('st40', 'Watchdogs IWDG y WWDG', 'shield', ['st_wdg', 'st_iwdgcalc', 'st_dbglp'], [
      Q('Refrescas el watchdog desde una interrupción de temporizador cada 10 ms. El bucle principal se cuelga. ¿Qué crees que pasa?', ['Nada: el temporizador lo sigue refrescando y el cuelgue no se detecta', 'Se reinicia enseguida', 'Se para el temporizador', 'El watchdog se apaga'], 'El watchdog solo sabe si alguien lo refresca, no si el programa va bien.', { ...PRED, c: 'st_wdg', h: 'El watchdog solo sabe si alguien lo refresca.' }),
      { t: 'explore', text: 'El IWDG cuenta atrás con el LSI; cada refresco lo recarga. Si llega a 0, reset.', viz: 'st_iwdg', params: P_IWDG(4, 99, 500),
        tasks: [{ q: 'ok500', min: 1, max: 1, text: 'Ajusta el IWDG para que refrescar cada 500 ms no lo dispare (LSI nominal)', done: 'Tiempo = preescalador × (RLR + 1) / 32 kHz por encima de 500 ms.', hint: 'Sube el preescalador o RLR.' },
          { q: 'safe500', min: 1, max: 1, text: 'Que tampoco lo dispare con el LSI más rápido (47 kHz)', done: 'El LSI varía mucho entre chips: deja margen.' }] },
      I('<b>IWDG</b> (independiente): cuenta con el LSI, funciona aunque falle el reloj principal y, una vez arrancado, no se puede parar.\n<b>WWDG</b> (de ventana): usa PCLK1 y exige refrescar dentro de una ventana: ni tarde ni demasiado pronto.', { svg: SVG_WDG }),
      I('<b>t = preescalador × (RLR + 1) / fLSI</b>. RLR es de 12 bits (máximo 4095). El LSI de la F4 puede ir de unos 17 a 47 kHz: calcula también el peor caso.', { tune: { viz: 'st_iwdg', params: P_IWDG(32, 999, 500) } }),
      I('Refresca en un punto que solo se alcanza si <b>todo</b> va bien. Con un RTOS, cada tarea marca que está viva y una supervisora refresca solo si todas lo han hecho.', { code: 'if (vivas == TODAS) {   // cada tarea pone su bit\n  vivas = 0;\n  HAL_IWDG_Refresh(&hiwdg);\n}' }),
      I('Tras un reset, mira <b>por qué</b> ha ocurrido y borra las banderas. Al depurar, congela el IWDG con DBGMCU: si no, sigue contando con el núcleo parado y reinicia el chip.', { code: 'if (__HAL_RCC_GET_FLAG(RCC_FLAG_IWDGRST))\n  printf("Reset por watchdog\\n");\n__HAL_RCC_CLEAR_RESET_FLAGS();\n__HAL_DBGMCU_FREEZE_IWDG();   // solo al depurar' }),
      { t: 'steps', text: 'IWDG con LSI de 32 kHz y preescalador ÷32: ¿qué RLR da 1 s?', steps: ['t = pre × (RLR + 1) / fLSI', 'RLR + 1 = t × fLSI / pre = 1 s × 32 000 / 32', 'RLR + 1 = 1000 → <b>RLR = 999</b>', 'Peor caso con el LSI a 47 kHz: 32 × 1000 / 47 000 ≈ <b>0,68 s</b>'], result: 'RLR = 999; refresca bastante antes de 0,68 s.' },
      { t: 'match', q: 'Une cada característica con su watchdog.', pairs: [['Reloj LSI independiente', 'IWDG'], ['Ventana de refresco', 'WWDG'], ['No se puede detener una vez iniciado', 'IWDG '], ['Interrupción de aviso antes del reset', 'WWDG ']], c: 'st_wdg', h: 'I de independiente; W de ventana (window).' },
      G('st_iwdg'),
      Q('¿Dónde llamas a HAL_IWDG_Refresh?', ['En el bucle principal, solo tras comprobar que todo va bien', 'En una interrupción de temporizador periódica', 'Al principio de main', 'En el HardFault_Handler'], 'Si lo refrescas desde un temporizador, no detecta un bucle colgado.', { c: 'st_wdg', h: 'Donde solo llegas si todo funciona.' }),
      Q('Refrescas el WWDG demasiado pronto. ¿Qué pasa?', ['Reset: fuera de la ventana también cuenta como fallo', 'Nada', 'Se alarga el tiempo', 'Se desactiva'], 'Detecta también programas que van demasiado rápido por un error.', { c: 'st_wdg', h: 'Piensa en la ventana.' }),
      Q('¿Por qué se borran las banderas de reset al arrancar?', ['Para que en el próximo reset solo aparezca la causa nueva', 'Para desactivar el watchdog', 'Para ahorrar energía', 'No hace falta'], 'Las banderas se acumulan hasta que las borras.', { c: 'st_wdg', h: 'Se acumulan.' }),
      Q('Pausas el programa con el depurador y a los 2 s el chip se reinicia. ¿Por qué?', ['El IWDG sigue contando: congélalo al depurar con DBGMCU', 'El ST-LINK está mal', 'Falta memoria', 'Es un fallo del chip'], 'El IWDG no se para solo al parar el núcleo.', { c: 'st_dbglp', h: 'Hay algo que sigue contando con el núcleo parado.' }),
      Q('Con FreeRTOS y 4 tareas, ¿cómo usas bien el watchdog?', ['Cada tarea marca que está viva y una supervisora refresca solo si todas lo han hecho', 'Lo refresca la tarea Idle sin más', 'Lo refresca una ISR', 'No se puede usar con RTOS'], 'Así detectas también una tarea bloqueada.', { c: 'st_wdg', h: 'Que nadie pueda colgarse sin que se note.' }),
      G('st_iwdg'),
      I('<b>Resumen</b>\n· IWDG independiente (LSI) e imparable; WWDG con ventana.\n· t = pre × (RLR + 1) / fLSI, con margen por la variación del LSI.\n· Refresca solo si todo va bien; mira la causa del reset; congela el IWDG al depurar.')
    ]),
    PRJ('st-p16', 'Proyecto: nodo sensor de bajo consumo', 'st_lowpower'),
    L('st41', 'Cargador de sistema y DFU', 'rocket', ['st_boot0', 'st_blproto', 'st_toolchain'], [
      Q('Quieres grabar una Black Pill sin ST-LINK, solo con el cable USB. ¿Crees que se puede?', ['Sí: el chip trae un cargador en ROM que acepta firmware por USB (DFU)', 'No, nunca', 'Solo con Arduino', 'Solo si ya tiene un programa que lo permita'], 'ST graba un cargador de fábrica. Se entra con BOOT0.', { ...PRED, c: 'st_boot0', h: 'ST graba algo en el chip de fábrica.' }),
      { t: 'explore', text: 'BOOT0 y NRST en el tiempo. La línea roja es el instante en que se lee BOOT0.', viz: 'st_boot0', params: P_B0(0, 0),
        tasks: [{ q: 'dfu', min: 1, max: 1, text: 'Entra en el cargador DFU', done: 'BOOT0 a 1 en el instante de soltar NRST.', hint: 'BOOT0 a 1 al soltar NRST.' },
          { q: 'stay', min: 1, max: 1, text: 'Suelta BOOT0 y comprueba que sigues en el cargador', done: 'BOOT0 solo se mira en el reset.' }] },
      I('Todos los STM32 traen un <b>cargador en ROM</b> (memoria de sistema) grabado por ST. Se ejecuta si BOOT0 está a 1 en el reset. Según el chip acepta USART, USB DFU, I²C, SPI o CAN (nota de aplicación AN2606).', { tune: { viz: 'st_boot0', params: P_B0(1, 0) } }),
      I('Por UART, el protocolo (AN3155): envías <b>0x7F</b> para que detecte tu velocidad; responde <b>0x79</b> (ACK) o <b>0x1F</b> (NACK). Cada comando va seguido de su complemento y la UART va en 8 bits con <b>paridad par</b>.', { svg: SVG_BLPROTO }),
      I('Para producción, la línea de órdenes de STM32CubeProgrammer graba y verifica sin abrir el IDE, por SWD, UART o USB.', { code: 'STM32_Programmer_CLI -c port=SWD \\\n  -w app.bin 0x08000000 -v' }),
      I('Tu aplicación también puede saltar al cargador de ROM sin tocar BOOT0. Y un <b>cargador propio</b> va más allá: tu interfaz, tu protocolo, verificar o cifrar la imagen y actualizar en el campo.', { code: '/* Saltar al cargador de ROM (F4) */\nHAL_DeInit();             // periféricos a reset\nSysTick->CTRL = 0;        // para el SysTick\nfor (int i = 0; i < 8; i++) {   // apaga y limpia las IRQ\n  NVIC->ICER[i] = 0xFFFFFFFF;\n  NVIC->ICPR[i] = 0xFFFFFFFF;\n}\nuint32_t *rom = (uint32_t *)0x1FFF0000;\n__set_MSP(rom[0]);\n((void (*)(void))rom[1])();' }),
      { t: 'steps', text: 'Graba por DFU una Black Pill.', steps: ['Conecta el USB', 'Mantén BOOT0, pulsa y suelta NRST, suelta BOOT0', 'En STM32CubeProgrammer, conecta por USB y graba', 'Pulsa NRST para ejecutar tu programa'], result: 'Sin ST-LINK, aunque también sin depurador.' },
      { t: 'order', q: 'Ordena cómo cargar firmware por USB DFU en una Black Pill.', items: ['Conecta el USB', 'Mantén pulsado BOOT0', 'Pulsa y suelta NRST', 'Suelta BOOT0', 'Conecta por USB en STM32CubeProgrammer y graba', 'Pulsa NRST para ejecutar tu programa'], e: 'BOOT0 solo se lee en el reset.', c: 'st_boot0', h: 'BOOT0 tiene que estar pulsado cuando sueltas NRST.' },
      Q('Has grabado por DFU y el programa no arranca al quitar el USB y ponerlo. ¿Qué miras?', ['Que BOOT0 esté a 0 en el reset', 'La velocidad del USB', 'El cristal de 32 kHz', 'La FPU'], 'Con BOOT0 a 1 vuelve a entrar al cargador.', { c: 'st_boot0', h: '¿Qué vale BOOT0 al arrancar?' }),
      Q('Tu herramienta de carga por UART no conecta y usa 8N1. ¿Qué falta?', ['Paridad par (8E1)', 'Más velocidad', 'Control de flujo', 'Dos bits de parada'], 'El cargador de sistema exige paridad par.', { c: 'st_blproto', h: 'El cargador pide un bit más.' }),
      Q('El comando de escribir memoria es 0x31. ¿Qué byte envías detrás?', ['0xCE, su complemento', '0x31', '0x00', '0xFF'], '0x31 XOR 0xFF = 0xCE.', { c: 'st_blproto', h: 'XOR con 0xFF.' }),
      Q('¿Qué hace esta orden?', ['Graba app.bin en 0x08000000 por SWD y verifica', 'Borra la Flash', 'Lee la Flash a app.bin', 'Arranca el cargador'], 'La versión de línea de órdenes es ideal para producción.', { code: 'STM32_Programmer_CLI -c port=SWD\n  -w app.bin 0x08000000 -v', c: 'st_toolchain', h: '-w escribe, -v verifica.' }),
      Q('¿Puede tu aplicación saltar al cargador de sistema sin tocar BOOT0?', ['Sí: desactivando periféricos e interrupciones y saltando a la memoria de sistema (0x1FFF0000 en la F4)', 'No, nunca', 'Solo en la F1', 'Solo con un ST-LINK'], 'Se toma el MSP y el vector de reset de esa dirección.', { c: 'st_boot0', h: 'La memoria de sistema también tiene su tabla de vectores.' }),
      Q('¿Por qué hacer un cargador propio si ya existe el de ROM?', ['Para elegir interfaz y protocolo, verificar o cifrar la imagen y actualizar sin tocar pines', 'Porque el de ROM no funciona', 'Porque ocupa menos', 'No tiene sentido'], 'Es lo que hacen los productos comerciales.', { c: 'st_boot0', h: 'Piensa en actualizar aparatos ya vendidos.' }),
      Q('El comando de leer memoria es 0x11. ¿Qué byte envías detrás?', ['0xEE', '0x11', '0x00', '0xFF'], '0x11 XOR 0xFF = 0xEE.', { c: 'st_blproto', h: 'Invierte cada bit.' }),
      I('<b>Resumen</b>\n· BOOT0 a 1 en el reset → cargador de ROM (UART, USB DFU…).\n· Protocolo UART: 0x7F, ACK 0x79, comando + complemento, paridad par.\n· STM32_Programmer_CLI para producción; cargador propio para actualizar en el campo.')
    ]),
    L('st42', 'Escribir en la Flash y protegerla', 'memory', ['st_flash', 'st_rdp', 'st_linker'], [
      Q('Una posición de Flash vale 0x0F y escribes 0xF0 encima, sin borrar. ¿Qué crees que queda?', ['0x00', '0xF0', '0xFF', '0x0F'], 'Programar solo puede bajar bits a 0. Compruébalo.', { ...PRED, c: 'st_flash', h: 'Programar solo puede bajar bits.' }),
      { t: 'explore', text: 'Elige lo que hay en la Flash, lo que escribes y si borras antes.', viz: 'st_flash', params: P_FLASH(0, 0, 0),
        tasks: [{ q: 'res', min: 0, max: 0, text: 'Escribe 0xF0 sobre 0x0F sin borrar', done: 'AND bit a bit: 0x0F AND 0xF0 = 0x00.', hint: 'Contenido 0F y escribes F0.' },
          { q: 'r2', min: 1, max: 1, text: 'Consigue que quede 0x5A encima de 0xA5', done: 'Hay que borrar antes: el sector entero vuelve a 0xFF.' }] },
      I('Borrar pone todos los bits a <b>1</b> (0xFF). Programar solo puede pasar bits de 1 a 0. Para volver a 1 hay que borrar el <b>sector entero</b>.', { tune: { viz: 'st_flash', params: P_FLASH(2, 1, 1) } }),
      I('La Flash de la F401/F411 se divide en <b>sectores</b> desiguales: cuatro de 16 KB, uno de 64 KB (desde 0x08010000) y el resto de 128 KB. Cada sector aguanta del orden de <b>10 000</b> borrados, y mientras se borra, la CPU que ejecuta desde esa Flash se para (hasta 1–2 s en los de 128 KB).', { svg: table([['Sectores 0–3', '16 KB cada uno, desde 0x08000000'], ['Sector 4', '64 KB, desde 0x08010000'], ['Sectores 5–7', '128 KB cada uno (F411)'], ['Borrado', 'Sector entero; unos 10 000 ciclos']], 'Flash de una F411 (512 KB)') }),
      I('Con la HAL: desbloquear, borrar el sector, programar y bloquear.', { code: 'HAL_FLASH_Unlock();\nFLASH_EraseInitTypeDef e = {\n  .TypeErase = FLASH_TYPEERASE_SECTORS,\n  .Sector = FLASH_SECTOR_7, .NbSectors = 1,\n  .VoltageRange = FLASH_VOLTAGE_RANGE_3 };\nuint32_t err;\nHAL_FLASHEx_Erase(&e, &err);\nHAL_FLASH_Program(FLASH_TYPEPROGRAM_WORD,\n  0x08060000, dato);\nHAL_FLASH_Lock();' }),
      I('<b>Protección de lectura (RDP)</b> en los option bytes: nivel 0, sin protección; nivel 1, el depurador no lee la Flash (volver a 0 la borra entera); nivel 2, depuración desactivada para siempre: <b>irreversible</b>.', { svg: SVG_RDP }),
      { t: 'steps', text: 'Usas el último sector de una F411 (512 KB) para guardar datos.', steps: ['512 KB: sectores 0–3 (4 × 16), 4 (64) y 5–7 (3 × 128)', 'El sector 7 empieza en 0x08000000 + 384 KB = <b>0x08060000</b>', 'En el .ld, LENGTH de FLASH = 384K para que el programa no lo pise', 'Borra el sector 7 antes de reescribir y agrupa las escrituras'], result: 'Datos en 0x08060000, a salvo del programa.' },
      Q('¿Dónde empieza el sector 4 de una F411?', ['0x08010000', '0x08004000', '0x08040000', '0x08020000'], '4 × 16 KB = 64 KB = 0x10000.', { c: 'st_flash', h: 'Suma cuatro sectores de 16 KB.' }),
      Q('¿Qué valor tiene la Flash recién borrada?', ['Todos los bits a 1: 0xFF', 'Todos a 0', 'Aleatorio', 'El valor anterior'], 'Programar solo puede pasar bits de 1 a 0.', { c: 'st_flash', h: 'Borrar pone unos.' }),
      Q('¿Qué indica FLASH_VOLTAGE_RANGE_3?', ['Que el chip va a 2,7–3,6 V y puede programar palabras de 32 bits', 'Que se borran 3 sectores', 'Que se usa el banco 3', 'Que la Flash va a 3 MHz'], 'Con tensiones menores hay que programar de menos en menos bits.', { c: 'st_flash', h: 'Tiene que ver con la alimentación.' }),
      Q('Mientras se borra un sector de 128 KB, ¿qué le pasa a tu programa si corre desde la misma Flash?', ['Se queda parado hasta que termina el borrado, que puede durar más de un segundo', 'Sigue normal', 'Se reinicia', 'Corre más rápido'], 'Ojo con los watchdogs y las interrupciones urgentes.', { c: 'st_flash', h: 'La CPU no puede leer instrucciones de esa Flash mientras se borra.' }),
      Q('¿Por qué no guardar un contador en la Flash cada segundo?', ['Cada sector aguanta del orden de 10 000 borrados: se gastaría en horas', 'Porque es lento', 'Porque la Flash es de solo lectura', 'No hay problema'], 'Agrupa escrituras, rota posiciones o usa otra memoria.', { c: 'st_flash', h: 'Cuenta borrados por día.' }),
      Q('Usas el último sector para datos. ¿Qué cambias en el script del enlazador?', ['Reducir LENGTH de FLASH para que el programa no pueda ocuparlo', 'Nada', 'Aumentar la RAM', 'Mover .bss'], 'Si no, una actualización que crezca borraría tus datos o tu código.', { c: 'st_linker', h: 'Lo que no está en LENGTH, el programa no lo usa.' }),
      Q('¿Qué pasa si bajas el RDP de nivel 1 a nivel 0?', ['Se borra toda la Flash: así nadie recupera tu código', 'Nada', 'Se bloquea el chip', 'Se activa el nivel 2'], 'Protege tu código sin perder el chip.', { c: 'st_rdp', h: 'Abrir la puerta vacía la habitación.' }),
      Q('¿Cuándo pondrías el RDP a nivel 2?', ['Solo en un producto final, seguro de que nunca necesitarás depurar ni reprogramar por SWD', 'En cada prototipo', 'Para ahorrar energía', 'Para acelerar la Flash'], 'Es irreversible.', { c: 'st_rdp', h: 'No tiene vuelta atrás.' }),
      I('<b>Resumen</b>\n· Borrar pone 0xFF por sectores; programar solo baja bits.\n· Unos 10 000 borrados por sector; la CPU se para mientras se borra.\n· Reserva el sector en el .ld; RDP 1 protege y RDP 2 es para siempre.')
    ]),
    PRJ('st-p17', 'Proyecto: cargador de arranque propio', 'st_boot'),
    L('st43', 'Diseña tu propia placa STM32', 'pcb', ['st_board', 'st_crystal', 'st_bringup'], [
      Q('Montas tu primera placa con un STM32 y no arranca. ¿Qué crees que es más probable?', ['Un fallo del circuito mínimo: VCAP, BOOT0, NRST o la alimentación', 'El chip venía roto', 'El programa', 'El color de la placa'], 'Antes que el código, el hardware básico. Empezamos por el cristal.', { ...PRED, c: 'st_board', h: 'Antes que el código, el hardware básico.' }),
      { t: 'explore', text: 'Los dos condensadores del cristal, más la capacidad parásita, forman su carga.', viz: 'st_xtal', params: P_XTAL(10, 3, 22),
        tasks: [{ q: 'match', min: 1, max: 1, text: 'Elige el condensador que deja la carga justa', done: 'Ideal: 2 × (10 − 3) = 14 pF; el comercial más cercano, 15 pF.', hint: 'Baja el condensador.' },
          { q: 'match6', min: 1, max: 1, text: 'Cambia a un cristal de 6 pF y vuelve a ajustar', done: 'Cristales de poca carga: condensadores pequeños.' }] },
      I('El circuito mínimo: 3,3 V con un 100 nF junto a cada VDD, el condensador de <b>VCAP</b> (F4), filtro en <b>VDDA</b>, <b>BOOT0</b> a masa con 10 kΩ, <b>NRST</b> con 100 nF, el cristal y un conector de depuración. Cada familia tiene una nota de aplicación de primeros pasos con el hardware.', { svg: SVG_MINBOARD }),
      I('Los dos condensadores del cristal quedan en serie para él, más la capacidad parásita: <b>CL = C/2 + Cpar</b>, así que <b>C = 2 × (CL − Cpar)</b>.', { tune: { viz: 'st_xtal', params: P_XTAL(12.5, 4, 18) } }),
      I('Si alimentas desde una Li-ion (3,0–4,2 V), el regulador necesita margen: un AMS1117 cae ~1 V y pronto deja de dar 3,3 V. Usa un LDO de caída muy baja o un buck-boost.', { tune: { viz: 'st_ldo', params: P_LDO(3.7, 1.0) } }),
      I('Antes de dibujar, asigna los pines en <b>CubeMX</b> para ver que cada función tiene un pin posible sin conflictos. Pon un conector de depuración y, en el USB, un supresor ESD.', { svg: table([['Cortex Debug', '10 pines a 1,27 mm'], ['Tag-Connect', 'Sin conector soldado'], ['Señales', '3,3 V, GND, SWDIO, SWCLK, NRST, SWO'], ['USB', 'Supresor ESD en D+ y D−']], 'Conectores') }),
      { t: 'steps', text: 'Puesta en marcha de tu placa nueva.', steps: ['Inspección y continuidad: que no haya corto entre 3,3 V y GND', 'Fuente con límite de corriente: mide 3,3 V', 'ST-LINK: lee el Device ID', 'Graba un parpadeo y comprueba el reloj con MCO', 'Prueba cada periférico por separado'], result: 'Si un paso falla, sabes exactamente dónde mirar.' },
      Q('Tu F411 no arranca y VCAP_1 no tiene condensador. ¿Por qué importa?', ['VCAP estabiliza el regulador interno del núcleo; sin él no funciona bien', 'No importa', 'Solo afecta al ADC', 'VCAP es una entrada analógica'], 'Pon el valor y el tipo que indica la hoja de datos.', { c: 'st_board', h: 'Es el condensador del regulador interno.' }),
      G('st_crystal'),
      Q('¿Cómo dejas BOOT0 en una placa propia?', ['Con unos 10 kΩ a masa y un pulsador o puente a 3,3 V', 'Al aire', 'Directo a 3,3 V', 'Conectado a NRST'], 'Así arranca siempre tu programa salvo que lo pidas.', { c: 'st_board', h: 'Por defecto debe arrancar tu programa.' }),
      Q('¿Para qué un condensador de 100 nF en NRST?', ['Filtra ruidos que podrían reiniciar el chip', 'Para que arranque más rápido', 'Para el cristal', 'Para el USB'], 'Junto con la pull-up interna.', { c: 'st_board', h: 'Piensa en ruido sobre la línea de reset.' }),
      Q('¿Por qué VDDA lleva su propio filtrado (ferrita y condensadores)?', ['El ADC y el DAC miden respecto a ella: el ruido digital empeora las medidas', 'Por estética', 'Porque consume mucho', 'Para el USB'], 'Separa la alimentación analógica de la digital.', { c: 'st_board', h: 'La «A» es de analógica.' }),
      Q('¿Qué protección añades al conector USB de una placa propia?', ['Un supresor ESD en D+ y D− (por ejemplo USBLC6-2SC6)', 'Un fusible en D+', 'Una resistencia de 1 MΩ', 'Ninguna'], 'Las descargas electrostáticas entran por los conectores.', { c: 'st_board', h: 'Descargas electrostáticas.' }),
      TU('Batería a 3,5 V: elige un regulador que mantenga los 3,3 V.', 'st_ldo', { vin: { val: 3.5, fixed: true }, drop: li('Caída del regulador', 1.0, [1.0, 0.3, 0.1], 'V', 1) }, { q: 'ok', min: 1, max: 1, text: 'Objetivo: 3,3 V a la salida', hint: 'Busca la menor caída.' }, 'Con 0,1 V de caída quedan 3,4 V disponibles: suficiente.', { c: 'st_board', h: 'Entrada − caída debe ser al menos 3,3 V.' }),
      Q('¿Por qué asignar los pines en CubeMX antes de dibujar el esquema?', ['Para comprobar que cada función tiene un pin posible sin conflictos', 'Para que la PCB sea más bonita', 'Porque KiCad lo exige', 'No hace falta'], 'Descubrir un conflicto con la placa fabricada es carísimo.', { c: 'st_bringup', h: 'Más barato descubrirlo antes de fabricar.' }),
      { t: 'order', q: 'Ordena la puesta en marcha de una placa nueva.', items: ['Inspección visual y continuidad entre 3,3 V y GND', 'Alimentar con fuente limitada y medir 3,3 V', 'Conectar el ST-LINK y leer el Device ID', 'Grabar un parpadeo', 'Comprobar el reloj con MCO', 'Probar cada periférico por separado'], e: 'Paso a paso: si algo falla, sabes exactamente qué.', c: 'st_bringup', h: 'De lo más básico (sin corriente) a lo más complejo.' },
      G('st_crystal'),
      I('<b>Resumen</b>\n· Circuito mínimo: desacoplo, VCAP, VDDA filtrada, BOOT0 a masa, NRST con 100 nF.\n· Cristal: C = 2 × (CL − Cpar). Regulador con margen.\n· Pines en CubeMX antes del esquema; puesta en marcha paso a paso.')
    ]),
    L('st44', 'Firmware profesional', 'code', ['st_profw', 'st_halstatus'], [
      Q('Tu driver de sensor llama directamente a la HAL. ¿Crees que puedes probar su lógica en el PC, sin placa?', ['No tal cual: depende del hardware; hay que separarlo', 'Sí, siempre', 'Solo con un emulador de STM32', 'No hace falta probar nada'], 'En el PC no hay HAL ni periféricos. La solución es separar capas. Antes, cómo numerar lo que publicas.', { ...PRED, c: 'st_profw', h: 'En el PC no hay periféricos.' }),
      { t: 'explore', text: 'Ya has publicado una versión (arriba). ¿Qué número toca según el cambio?', viz: 'st_semver', params: P_SEMVER(0),
        tasks: [{ q: 'v', min: 10403, max: 10403, text: 'Publica una corrección de errores', done: 'Sube PARCHE: 1.4.3.' },
          { q: 'v', min: 10500, max: 10500, text: 'Ahora una función nueva compatible', done: 'Sube MENOR y PARCHE vuelve a 0: 1.5.0.' },
          { q: 'v', min: 20000, max: 20000, text: 'Y un cambio que rompe la compatibilidad', done: 'Sube MAYOR: 2.0.0. Quien lo use sabe que debe revisar.' }] },
      I('Un firmware que crece se divide en <b>capas</b>: drivers (hablan con el hardware), servicios (filtros, protocolos, control) y aplicación (estados y lógica). Cada capa solo usa la de debajo.', { svg: SVG_FWLAYERS }),
      I('Si un driver recibe las funciones de lectura y escritura del bus en vez de llamar a la HAL, puedes <b>probarlo en el PC</b> con un marco como Unity o GoogleTest, y cambiar de bus o de chip sin tocarlo.', { code: 'typedef struct {\n  int (*leer)(uint8_t reg, uint8_t *v);\n  int (*escribir)(uint8_t reg, uint8_t v);\n} bus_t;\n\nint sensor_init(const bus_t *b);  // no sabe qué hay debajo' }),
      I('Errores: comprueba los retornos de la HAL, usa USE_FULL_ASSERT en desarrollo y escribe un HardFault_Handler que guarde PC, LR y CFSR en una zona que sobreviva al reset. Compila con -Wall -Wextra y trata los avisos; en software crítico hay reglas como <b>MISRA C</b>.', { svg: SVG_HALST }),
      I('Publicar: pruebas en verde en integración continua, número de versión, etiqueta en git, compilación de producción y guardar el <b>.elf</b> con símbolos junto al .bin. En git va el código y el .ioc, no la carpeta Debug/.', { svg: SVG_PROFW }),
      { t: 'steps', text: 'Llega del campo un aparato que se reinicia. Tu HardFault_Handler guardó el PC: 0x08003A1C.', steps: ['Mira qué versión exacta lleva el aparato', 'Abre el .elf guardado de esa versión', 'arm-none-eabi-addr2line -e app.elf 0x08003A1C', 'Te dice el archivo y la línea donde falló'], result: 'Sin el .elf de esa versión, ese número no dice nada.' },
      Q('¿Qué ganas si tu driver recibe funciones de lectura y escritura del bus en vez de llamar directamente a la HAL?', ['Puedes probarlo en el PC y cambiar de bus o de chip sin tocarlo', 'Ocupa menos', 'Va más rápido', 'Nada'], 'Inyección de dependencias en C: estructuras con punteros a función.', { c: 'st_profw', h: 'Piensa en sustituir el bus por uno falso.' }),
      Q('¿Qué se prueba mejor en el PC que en la placa?', ['Un analizador de tramas NMEA', 'El tiempo de subida de un pin', 'El consumo en Stop', 'El arranque del cristal'], 'Lo que no depende del hardware.', { c: 'st_profw', h: 'Lo que no depende del hardware.' }),
      Q('¿Para qué sirve USE_FULL_ASSERT en la HAL?', ['Comprueba los parámetros de las funciones HAL y llama a assert_failed si uno es inválido', 'Acelera la HAL', 'Activa el watchdog', 'Desactiva las interrupciones'], 'Úsalo en desarrollo; en producción ocupa espacio.', { c: 'st_halstatus', h: 'Assert = comprobar algo que debería cumplirse.' }),
      Q('¿Qué NO deberías subir a git en un proyecto de CubeIDE?', ['La carpeta Debug/ con los objetos compilados', 'El archivo .ioc', 'Las fuentes de Core/', 'El script del enlazador'], 'Lo generado al compilar se reconstruye; el .ioc es tu configuración.', { c: 'st_profw', h: 'Lo que se puede regenerar compilando.' }),
      Q('¿Por qué compilar con -Wall -Wextra y tratar los avisos?', ['Muchos avisos son errores reales: variables sin inicializar, comparaciones de signo…', 'Para que tarde más', 'Para que ocupe menos', 'No sirve de nada'], 'Y añade un analizador estático si puedes.', { c: 'st_profw', h: 'El compilador ve cosas que tú no.' }),
      Q('¿Qué es MISRA C?', ['Un conjunto de reglas de C para software crítico, muy usado en automoción', 'Un compilador', 'Un RTOS', 'Un depurador'], 'Prohíbe construcciones de C peligrosas o ambiguas.', { c: 'st_profw', h: 'Reglas para software crítico.' }),
      { t: 'order', q: 'Ordena una publicación de firmware.', items: ['Todas las pruebas pasan en integración continua', 'Se actualiza el número de versión', 'Se crea una etiqueta en git', 'Se compila la versión de producción', 'Se guarda el .elf con símbolos junto al .bin', 'Se graba y se verifica en placas de prueba'], e: 'Guardar el .elf permite analizar fallos de esa versión exacta.', c: 'st_profw', h: 'Primero que todo funcione; al final, grabar.' },
      Q('Un cliente informa de un fallo en una versión de hace meses. ¿Qué te permite analizarlo con precisión?', ['Haber guardado el .elf con símbolos de esa versión exacta', 'Tener el .bin', 'Recordar los cambios', 'Compilar la versión actual'], 'El .bin no tiene símbolos y la versión actual es otro programa.', { c: 'st_profw', h: 'Necesitas los símbolos de esa versión.' }),
      I('<b>Resumen</b>\n· Capas: drivers, servicios y aplicación; lo que no toca hardware se prueba en el PC.\n· Comprueba retornos, asserts en desarrollo y HardFault que guarde pistas.\n· Versiona, etiqueta y guarda el .elf de cada publicación.')
    ]),
    PRJ('st-p18', 'Proyecto final: robot autoequilibrado con tu placa', 'st_final')
  ] };

  TRACKS.push({
    id: 'stm32',
    title: 'STM32 y ARM Cortex-M',
    short: 'STM32',
    desc: 'El microcontrolador de la industria: registros, relojes, DMA, FreeRTOS y tu propia placa, con proyectos de verdad.',
    color: '#2F7FD1',
    icon: 'chip',
    level: 'Intermedio → profesional',
    units: [M1, M2, M3, M4, M5, M6, M7, M8]
  });
})();
