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

  Gen.add('st_sysclk', () => {
    const [hse, m, n, p] = pick([[25, 25, 192, 2], [25, 25, 336, 4], [8, 8, 336, 2], [8, 4, 180, 2], [25, 25, 200, 2], [8, 8, 384, 4], [16, 16, 336, 4], [16, 8, 180, 2], [12, 6, 168, 2], [25, 15, 216, 2], [16, 16, 200, 2], [8, 4, 168, 4]]);
    const vin = hse / m, vco = vin * n, sys = vco / p;
    if (Math.random() < 0.3) return N(`HSE = ${hse} MHz, PLLM = ${m}, PLLN = ${n}. ¿Frecuencia del VCO en MHz?`, vco, 'MHz', `Entrada del VCO: ${hse} / ${m} = ${fmt(vin, 3)} MHz. VCO = ${fmt(vin, 3)} × ${n} = ${fmt(vco, 1)} MHz (debe quedar entre 100 y 432 MHz en la F4).`, 0.5);
    return N(`STM32F4: HSE = ${hse} MHz, PLLM = ${m}, PLLN = ${n}, PLLP = ${p}. ¿SYSCLK en MHz?`, sys, 'MHz', `SYSCLK = ${hse} / ${m} × ${n} / ${p} = ${fmt(sys, 2)} MHz. Primero divide (entrada del VCO ${fmt(vin, 3)} MHz), luego multiplica (VCO ${fmt(vco, 1)} MHz) y luego divide entre P.`, 0.5);
  }, 'st_clock');

  Gen.add('st_pwmFreq', () => {
    const F = pick([16, 72, 84, 100, 168, 170]);
    const psc = pick([0, 1, 3, 7, 9, 15, 99, 999]), arr = pick([99, 255, 499, 999, 1999, 4095, 9999]);
    const f = F * 1e6 / ((psc + 1) * (arr + 1));
    return N(`Temporizador a ${F} MHz con PSC = ${psc} y ARR = ${arr}. ¿Frecuencia de actualización en Hz?`, f, 'Hz', `f = ${F} MHz / ((${psc} + 1) × (${arr} + 1)) = ${fHz(f)}. El contador cuenta de 0 a ARR: son ARR + 1 pasos.`, Math.max(0.01, f * 0.005));
  }, 'st_timer');

  Gen.add('st_pscArr', () => {
    const F = pick([16, 72, 84, 100]), target = pick([1, 10, 50, 100, 1000, 20000]);
    const p1 = target < 50 ? F * 100 : F, tick = F * 1e6 / p1, a1 = tick / target;
    return MC(`Reloj del temporizador ${F} MHz. ¿Qué pareja da exactamente ${fHz(target)}?`, `PSC = ${p1 - 1}, ARR = ${a1 - 1}`,
      [`PSC = ${p1}, ARR = ${a1}`, `PSC = ${p1 - 1}, ARR = ${a1 / 10 - 1}`, `PSC = ${p1 / 2 - 1}, ARR = ${a1 - 1}`],
      `Divide ${F} MHz entre ${p1} (PSC = ${p1 - 1}) para tener ticks de ${fHz(tick)}; luego cuenta ${a1} ticks (ARR = ${a1 - 1}). Los registros guardan “divisor − 1”.`);
  }, 'st_timer');

  Gen.add('st_duty', () => {
    let arr, d, ccr;
    do { arr = pick([99, 199, 249, 499, 999, 1999, 3599, 9999]); d = pick([10, 20, 25, 40, 50, 75, 80, 90]); ccr = (arr + 1) * d / 100; } while (!Number.isInteger(ccr));
    if (Math.random() < 0.5) return N(`PWM modo 1 con ARR = ${arr}. ¿Qué CCR da un ${d} % de ciclo de trabajo?`, ccr, '', `Hay ARR + 1 = ${arr + 1} pasos por periodo. ${d} % de ${arr + 1} = ${ccr}. Si usas ARR en vez de ARR + 1 te equivocas un poco.`, 0.5);
    return N(`PWM modo 1 con ARR = ${arr} y CCR = ${ccr}. ¿Ciclo de trabajo en %?`, d, '%', `Duty = CCR / (ARR + 1) = ${ccr} / ${arr + 1} = ${d} %.`, 0.05);
  }, 'st_duty');

  Gen.add('st_brr', () => {
    let pclk, baud, brr;
    do { pclk = pick([8, 16, 36, 42, 50, 84, 100]); baud = pick([9600, 19200, 57600, 115200, 230400, 921600]); brr = Math.round(pclk * 1e6 / baud); } while (brr < 16);
    const mant = brr >> 4, frac = brr & 15;
    const wrong = [hex(Math.floor(pclk * 1e6 / (16 * baud)), 4), hex(Math.round(pclk * 1e6 / baud / 2), 4), hex(Math.round(2 * pclk * 1e6 / baud), 4)];
    if (/^\d+$/.test(String(brr)) && brr >= 10) wrong.unshift('0x' + String(brr).padStart(4, '0'));
    return MC(`USART con PCLK = ${pclk} MHz, sobremuestreo ×16 y ${baud} baudios. ¿Qué valor escribes en BRR?`, hex(brr, 4), wrong,
      `BRR = fPCLK / baudios = ${fmt(pclk * 1e6 / baud, 2)} → ${brr} = ${hex(brr, 4)} (mantisa ${mant}, fracción ${frac}/16). No confundas el número decimal con su escritura hexadecimal.`);
  }, 'st_brr');

  Gen.add('st_baudErr', () => {
    const pclk = pick([8, 16, 42, 48, 50, 84]), baud = pick([9600, 115200, 230400, 460800, 921600]);
    const brr = Math.round(pclk * 1e6 / baud);
    if (brr < 16) return Gen.make('st_baudErr');
    const real = pclk * 1e6 / brr, err = Math.abs(real - baud) / baud * 100;
    return N(`PCLK = ${pclk} MHz y quieres ${baud} baudios (×16). BRR se redondea a ${brr}. ¿Error de velocidad en %? (valor absoluto)`, err, '%', `Velocidad real = ${pclk} MHz / ${brr} = ${fmt(real, 0)} baudios → error ${fmt(err, 2)} %. Por encima de un 2 % la comunicación empieza a fallar.`, Math.max(0.02, err * 0.03));
  }, 'st_brr');

  Gen.add('st_adcTime', () => {
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
  Gen.add('st_regAddr', () => {
    const [p, base, k] = pick(PERIPH), [r, off] = pick(REGS[k]);
    const right = hex(base + off), wrong = [hex(base + off * 4), hex(base + 0x400 + off), hex(base + off + 0x100)];
    const asDec = off.toString(16);
    if (/^\d+$/.test(asDec) && off >= 0x10) wrong.unshift(hex(base + parseInt(asDec, 10)));
    return MC(`STM32F4: ${p} empieza en ${hex(base)} y ${r} está en el desplazamiento ${hex(off, 2)}. ¿Dirección de ${p}->${r}?`, right, wrong, `Dirección = base + desplazamiento = ${hex(base)} + ${hex(off, 2)} = ${right}. Suma en hexadecimal: ${hex(off, 2)} no es ${off.toString(16)} en decimal.`);
  }, 'st_regaddr');

  Gen.add('st_moder', () => {
    const port = pick(['A', 'B', 'C']), pin = ri(0, 15), mode = pick([1, 2, 3]);
    const right = hex((mode << (2 * pin)) >>> 0);
    const wrong = [hex(mode << pin), hex(((3 - mode) & 3) << (2 * pin)), hex((mode << (2 * pin + 1)) >>> 0), hex((mode << (2 * pin + 2)) >>> 0)];
    return MC(`Quieres P${port}${pin} en modo ${MODE_NAME[mode]} (${mode.toString(2).padStart(2, '0')} en binario). ¿Qué valor tiene solo su campo de MODER, ya desplazado?`, right, wrong.filter(w => w !== hex(0)),
      `Cada pin ocupa 2 bits: el campo de P${port}${pin} empieza en el bit ${2 * pin}. ${mode.toString(2).padStart(2, '0')} << ${2 * pin} = ${right}. Antes de escribirlo, limpia el campo con &= ~(3U << ${2 * pin}).`);
  }, 'st_field');

  Gen.add('st_bsrr', () => {
    const pin = ri(0, 15), set = Math.random() < 0.5, port = pick(['A', 'B', 'C']);
    const right = hex(set ? 1 << pin : (1 << (pin + 16)) >>> 0);
    const wrong = [hex(set ? (1 << (pin + 16)) >>> 0 : 1 << pin), hex(~(1 << pin)), hex((1 << (2 * pin)) >>> 0), hex(pin)];
    return MC(`¿Qué escribes en GPIO${port}->BSRR para ${set ? 'poner a 1' : 'poner a 0'} P${port}${pin} sin tocar los demás pines?`, right, wrong,
      `BSRR: los bits 0–15 ponen a 1 (BS) y los bits 16–31 ponen a 0 (BR). ${set ? `Bit ${pin}` : `Bit ${pin} + 16 = ${pin + 16}`} → ${right}. Los ceros no hacen nada, por eso es atómico.`);
  }, 'st_bsrr');

  Gen.add('st_iwdg', () => {
    const pr = pick([4, 8, 16, 32, 64, 128, 256]), rlr = pick([99, 249, 499, 999, 1999, 2499, 4095]);
    const t = pr * (rlr + 1) / 32;
    if (Math.random() < 0.4) {
      const tt = pick([250, 500, 1000, 2000, 4000]), p2 = pick([32, 64, 128]), r2 = tt * 32 / p2 - 1;
      if (r2 > 4095 || r2 < 1 || !Number.isInteger(r2)) return Gen.make('st_iwdg');
      return N(`IWDG con LSI de 32 kHz y preescalador ÷${p2}. ¿Qué RLR da un tiempo de ${tt} ms?`, r2, '', `RLR + 1 = t × fLSI / preescalador = ${tt} ms × 32 kHz / ${p2} = ${r2 + 1} → RLR = ${r2}. Máximo 4095 (12 bits).`, 0.5);
    }
    return N(`IWDG: LSI de 32 kHz, preescalador ÷${pr}, RLR = ${rlr}. ¿Tiempo hasta el reset en ms?`, t, 'ms', `t = ${pr} × (${rlr} + 1) / 32 kHz = ${fmt(t, 2)} ms. Ojo: el LSI de la F4 puede ir de unos 17 a 47 kHz, así que deja margen.`, Math.max(0.1, t * 0.01));
  }, 'st_iwdgcalc');

  Gen.add('st_memUse', () => {
    const text = ri(80, 600) * 100 + ri(0, 99), data = ri(20, 900), bss = ri(10, 300) * 64;
    return MC(`arm-none-eabi-size da text = ${text}, data = ${data}, bss = ${bss}. ¿Cuánto ocupa en Flash y en RAM estática?`, `Flash ${text + data} B · RAM ${data + bss} B`,
      [`Flash ${text} B · RAM ${bss} B`, `Flash ${text + data + bss} B · RAM ${bss} B`, `Flash ${text} B · RAM ${text + data + bss} B`],
      '.text va a Flash. .data ocupa Flash (los valores iniciales) y RAM (las variables). .bss solo RAM. Flash = text + data; RAM = data + bss (más pila y montón).');
  }, 'st_sections');

  Gen.add('st_systick', () => {
    const f = pick([16, 48, 72, 84, 100, 168, 180]), hz = pick([1000, 1000, 100, 10000]);
    const r = f * 1e6 / hz - 1;
    return N(`SysTick con reloj de ${f} MHz. ¿Qué valor de recarga (LOAD) da una interrupción cada ${fmt(1000 / hz, 2)} ms?`, r, '', `LOAD = fCPU / ftick − 1 = ${f * 1e6} / ${hz} − 1 = ${r}. Cabe en 24 bits (máximo 16 777 215).`, 0.5);
  }, 'st_systick');

  Gen.add('st_crystal', () => {
    const cl = pick([6, 7, 8, 9, 10, 12, 12.5, 18, 20]), cs = pick([2, 3, 4, 5]);
    return N(`Cristal con capacidad de carga CL = ${fmt(cl)} pF y unos ${cs} pF parásitos. ¿Qué condensador pones a cada lado, en pF?`, 2 * (cl - cs), 'pF', `C = 2 × (CL − Cpar) = 2 × (${fmt(cl)} − ${cs}) = ${fmt(2 * (cl - cs))} pF. Luego eliges el valor comercial más cercano.`, 0.3);
  }, 'st_crystal');

  Gen.add('st_dmaHalf', () => {
    const fs = pick([8000, 16000, 44100, 48000, 100000]), n = pick([256, 512, 1024, 2048]), ch = pick([1, 2]);
    const t = n / 2 / (fs * ch) * 1000;
    return N(`DMA circular con un búfer de ${n} muestras${ch === 2 ? ' (dos canales intercalados, cada uno' : ' (un canal'} a ${fs} Hz). ¿Tiempo entre la interrupción de mitad (HT) y la de completo (TC), en ms?`, t, 'ms', `Media vuelta son ${n / 2} muestras; llegan ${fs * ch} muestras por segundo → ${fmt(t, 3)} ms. Ese es tu plazo para procesar cada mitad.`, Math.max(0.01, t * 0.01));
  }, 'st_dma');

  Gen.add('st_canBit', () => {
    const [f, brp, bs1, bs2] = pick([[42, 6, 11, 2], [42, 3, 11, 2], [42, 12, 11, 2], [42, 21, 13, 2], [36, 4, 13, 4], [36, 2, 15, 2], [45, 5, 15, 2], [36, 9, 13, 2]]);
    const tq = 1 + bs1 + bs2, rate = f * 1000 / (brp * tq), sp = (1 + bs1) / tq * 100;
    if (Math.random() < 0.5) return N(`bxCAN con PCLK1 = ${f} MHz, preescalador ${brp}, BS1 = ${bs1} tq y BS2 = ${bs2} tq. ¿Velocidad en kbit/s?`, rate, 'kbit/s', `Un bit = 1 + BS1 + BS2 = ${tq} cuantos; tq = ${brp} / ${f} MHz. Velocidad = ${f} MHz / (${brp} × ${tq}) = ${fmt(rate, 2)} kbit/s.`, Math.max(0.5, rate * 0.005));
    return N(`bxCAN con BS1 = ${bs1} tq y BS2 = ${bs2} tq. ¿Punto de muestreo en %?`, sp, '%', `Se muestrea tras el segmento de sincronismo y BS1: (1 + ${bs1}) / ${tq} = ${fmt(sp, 1)} %. En CAN se busca alrededor del 87,5 %.`, 0.3);
  }, 'st_canbit');

  Gen.add('st_stack', () => {
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
        return { clk, ts, tconv, fs: 1 / tconv, err, ok: valid ? 1 : 0, good: good ? 1 : 0, fsOk: good ? 1 / tconv : 0 };
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
  const M1 = { id: 'st-m1', title: 'ARM Cortex-M y la familia STM32', desc: 'Núcleos, familias, nombres de pieza, placas y el mapa de memoria de 32 bits.', nodes: [
    L('st1', 'Del Arduino al ARM de 32 bits', 'chip', ['st_bits32', 'st_core', 'st_family'], [
      I('La Uno lleva un ATmega328P: 8 bits, 16 MHz, 2 KB de RAM y 32 KB de Flash. Un <b>STM32F411</b> cuesta unos pocos euros y tiene 32 bits, 100 MHz, 128 KB de RAM, 512 KB de Flash, unidad de coma flotante, DMA y decenas de periféricos.'),
      Q('¿Qué significa que un microcontrolador sea “de 32 bits”?', ['Que sus registros y su unidad aritmética trabajan con 32 bits de una vez', 'Que tiene 32 patas', 'Que funciona a 32 MHz', 'Que tiene 32 KB de memoria'], 'Una suma de dos números de 32 bits es una sola instrucción.', { c: 'st_bits32' }),
      Q('Sumar dos uint32_t en un AVR de 8 bits necesita…', ['Varias instrucciones: byte a byte con acarreo', 'Una instrucción', 'Una biblioteca de coma flotante', 'Que el número quepa en 8 bits'], 'Cuatro sumas encadenadas; en un Cortex-M es una.', { c: 'st_bits32' }),
      I('<b>ARM no fabrica chips</b>: diseña núcleos y vende licencias. ST, NXP, Nordic, Microchip o Raspberry Pi compran el núcleo y le añaden memoria y periféricos. Por eso todos los Cortex-M se programan y depuran de forma muy parecida.'),
      Q('¿Quién fabrica los STM32?', ['STMicroelectronics, con núcleos licenciados de ARM', 'ARM', 'Arduino', 'Raspberry Pi'], 'ARM diseña el núcleo; ST hace el chip.', { c: 'st_core' }),
      I('ARM tiene tres perfiles: <b>Cortex-A</b> (procesadores de aplicación: móviles, Linux), <b>Cortex-R</b> (tiempo real exigente: discos, frenos) y <b>Cortex-M</b> (microcontroladores).'),
      { t: 'match', q: 'Une cada perfil con su uso.', pairs: [['Cortex-A', 'Móviles y ordenadores con Linux'], ['Cortex-R', 'Tiempo real crítico (discos, automoción)'], ['Cortex-M', 'Microcontroladores']], c: 'st_core' },
      Nm('Un puntero de 32 bits puede direccionar 2³² bytes. ¿Cuántos GB son?', 4, 'GB', '2³² = 4 294 967 296 bytes = 4 GB. Por eso el STM32 coloca Flash, RAM y periféricos en un mismo espacio de direcciones.', { c: 'st_bits32' }),
      Q('En la Uno, int vale como máximo 32 767. ¿Y en un STM32?', ['2 147 483 647: int es de 32 bits en ARM', '32 767, igual', '255', '65 535'], 'El tamaño de int depende de la arquitectura. Usa int16_t, uint32_t… de stdint.h para que tu código sea portable.', { c: 'st_bits32' }),
      Q('¿Qué imprime este código en un STM32?', ['4', '260', '250', 'Error de compilación'], 'uint8_t solo llega a 255: 260 da la vuelta a 4 en cualquier arquitectura.', { code: 'uint8_t x = 250;\nx = x + 10;\nprintf("%u", x);', c: 'st_bits32' }),
      I('Los Cortex-M solo ejecutan instrucciones <b>Thumb</b>: un juego que mezcla instrucciones de 16 y 32 bits para que el código ocupe poco sin perder potencia.'),
      Q('¿Por qué se usan tanto los STM32 en la industria?', ['Una familia enorme y compatible, herramientas gratuitas y suministro a largo plazo', 'Porque son los únicos de 32 bits', 'Porque se programan en Arduino', 'Porque no necesitan alimentación'], 'Puedes cambiar de chip dentro de la familia sin reescribir todo.', { c: 'st_family' })
    ]),
    L('st2', 'Los núcleos Cortex-M', 'chip', ['st_cores', 'st_fpu', 'st_core', 'st_dmamem'], [
      I('<b>Cortex-M0 y M0+</b> (ARMv6-M): núcleos pequeños y eficientes, sin división por hardware y con pocas instrucciones. En STM32 los llevan las familias F0, G0, L0 y C0.'),
      I('<b>Cortex-M3</b> (ARMv7-M): división por hardware y Thumb-2 completo. Es el de la clásica F103 (Blue Pill).\n<b>Cortex-M4F</b> (ARMv7E-M): añade instrucciones DSP (multiplicar y acumular en un ciclo, SIMD) y una <b>FPU</b> de precisión simple. Familias F3, F4, G4 y L4.'),
      I('<b>Cortex-M7</b>: más etapas, ejecuta dos instrucciones por ciclo, tiene cachés y memorias TCM; en algunos modelos, FPU de doble precisión (F7, H7).\n<b>Cortex-M33</b> (ARMv8-M): como un M4 moderno con <b>TrustZone</b> para separar código seguro (L5, U5, H5).'),
      { t: 'match', q: 'Une cada núcleo con un STM32 que lo lleve.', pairs: [['Cortex-M0+', 'STM32G0'], ['Cortex-M3', 'STM32F103'], ['Cortex-M4F', 'STM32F411'], ['Cortex-M7', 'STM32H743']], c: 'st_cores' },
      Q('¿Qué hace esta línea en un Cortex-M0+?', ['Llama a una rutina de software de coma flotante: decenas de ciclos', 'Una sola instrucción de FPU', 'No compila', 'Convierte a entero automáticamente'], 'El M0+ no tiene FPU: los float se emulan.', { code: 'float y = x * 0.5f;', c: 'st_fpu' }),
      Q('En un Cortex-M4F, ¿qué problema tiene esta línea?', ['0.1 es una constante double: fuerza una operación de doble precisión emulada', 'Ninguno', 'b se convierte a entero', 'No se puede multiplicar float'], 'La FPU del M4 es de precisión simple. Escribe 0.1f para que todo sea float.', { code: 'float a = b * 0.1;', c: 'st_fpu' }),
      Q('¿Para qué sirve TrustZone en un Cortex-M33?', ['Para aislar el código y las claves seguras del resto del firmware', 'Para ir más rápido', 'Para ahorrar batería', 'Para tener más pines'], 'Un fallo en la parte normal no puede leer los secretos de la parte segura.', { c: 'st_cores' }),
      I('Todos los Cortex-M comparten el <b>NVIC</b> (controlador de interrupciones), el <b>SysTick</b>, el modelo de excepciones y la depuración por <b>SWD</b>. Lo que aprendas aquí con un F4 te sirve para casi cualquier Cortex-M.'),
      Q('Pasas de un STM32F4 a un nRF52 (ambos Cortex-M4F). ¿Qué NO cambia?', ['El NVIC, el SysTick y el juego de instrucciones', 'Los registros de GPIO', 'El reloj y el PLL', 'Los nombres de los periféricos'], 'El núcleo es el mismo; los periféricos son de cada fabricante.', { c: 'st_core' }),
      Q('En un H7 con caché de datos, la CPU lee un búfer que acaba de llenar el DMA y ve datos viejos. ¿Por qué?', ['La caché guarda una copia antigua: hay que invalidarla o usar memoria no cacheable', 'El DMA está roto', 'Falta volatile', 'La Flash es lenta'], 'El DMA escribe en la RAM sin pasar por la caché de la CPU.', { c: 'st_dmamem' })
    ]),
    L('st3', 'Familias STM32 y cómo leer un nombre', 'chip', ['st_partnum', 'st_family'], [
      I('Las familias se agrupan por letra:\n<b>F</b>: uso general clásico (F0, F1, F4, F7).\n<b>G</b>: uso general moderno (G0, G4).\n<b>L</b> y <b>U</b>: bajo consumo (L0, L4, U5).\n<b>H</b>: alto rendimiento (H7).\n<b>W</b>: con radio (WB, WL).'),
      { t: 'match', q: 'Une cada chip con lo que lo define.', pairs: [['STM32F411', 'Cortex-M4F general a 100 MHz'], ['STM32G474', 'Analógica y control de motores avanzados'], ['STM32L476', 'Bajo consumo'], ['STM32H743', 'Cortex-M7 a 480 MHz']], c: 'st_family' },
      I('Leamos <b>STM32F411CEU6</b>:\nSTM32 · <b>F</b> uso general · <b>411</b> línea · <b>C</b> 48 patas · <b>E</b> 512 KB de Flash · <b>U</b> encapsulado UFQFPN · <b>6</b> de −40 a 85 °C.'),
      { t: 'match', q: 'Une cada letra con su significado.', pairs: [['C (nº de patas)', '48 patas'], ['R (nº de patas)', '64 patas'], ['E (Flash)', '512 KB'], ['8 (Flash)', '64 KB']], c: 'st_partnum' },
      Q('¿Cuánta Flash tiene un STM32F103C8T6?', ['64 KB', '8 KB', '128 KB', '103 KB'], 'El 8 es el código de Flash: 64 KB.', { c: 'st_partnum' }),
      Q('¿Cuántas patas tiene un STM32F446RET6?', ['64', '48', '100', '446'], 'R = 64 patas.', { c: 'st_partnum' }),
      Q('Diferencia entre un sufijo “T” y uno “U” de encapsulado:', ['T es LQFP con patas; U es UFQFPN sin patas', 'T es de más temperatura', 'U es de más Flash', 'Ninguna'], 'El QFN es más pequeño pero más difícil de soldar a mano.', { c: 'st_partnum' }),
      Q('¿Qué indica el último dígito 6?', ['El rango de temperatura: de −40 a 85 °C', 'La versión del silicio', 'Los MHz', 'El número de UART'], 'Un 7 indica hasta 105 °C.', { c: 'st_partnum' }),
      I('Para elegir chip, mira: periféricos (¿DAC? ¿CAN? ¿USB?), memoria, encapsulado, consumo, precio y disponibilidad. El selector de microcontroladores de CubeMX filtra por todo eso.'),
      Q('Necesitas CAN y DAC en el mismo chip. ¿Cuál vale?', ['STM32F446RE', 'STM32F411CE', 'STM32F401CC', 'STM32F030F4'], 'La F401 y la F411 no tienen ni CAN ni DAC; la F446 tiene ambos.', { c: 'st_family' }),
      Q('¿Por qué es popular la G4 en electrónica de potencia?', ['Tiene periféricos analógicos y temporizadores avanzados para control de motores y convertidores', 'Porque no tiene periféricos', 'Porque es de 8 bits', 'Porque solo funciona a 5 V'], 'Comparadores, amplificadores internos y temporizadores de alta resolución en algunos modelos.', { c: 'st_family' })
    ]),
    L('st4', 'Placas: Nucleo, Black Pill y Blue Pill', 'pcb', ['st_boards', 'st_pinlim', 'st_printf'], [
      I('Las <b>Nucleo-64</b> de ST llevan un ST-LINK integrado, conectores tipo Arduino y “morpho”, el LED LD2 en <b>PA5</b>, el pulsador B1 en <b>PC13</b> y la USART2 (PA2/PA3) conectada a un puerto serie virtual por el mismo USB.'),
      Q('En una Nucleo-F411RE, ¿por dónde sale printf sin cablear nada?', ['Por USART2, que llega al PC a través del ST-LINK', 'Por USART1', 'Por el USB del F411', 'No sale'], 'El ST-LINK hace de puente USB-serie.', { c: 'st_boards' }),
      I('La <b>Black Pill</b> (de WeAct) lleva un F401CC o un F411CE, USB-C, cristal de 25 MHz y otro de 32,768 kHz, LED en <b>PC13</b> (se enciende a nivel bajo), pulsador KEY en <b>PA0</b> y botones NRST y BOOT0. Se programa con un ST-LINK externo o por DFU.'),
      Q('En la Black Pill, ¿qué hace esta línea?', ['Enciende el LED: está conectado a 3,3 V y se activa a nivel bajo', 'Apaga el LED', 'Configura PC13 como entrada', 'Nada'], 'LED entre 3,3 V y el pin: un 0 lo enciende.', { code: 'HAL_GPIO_WritePin(GPIOC,\n  GPIO_PIN_13, GPIO_PIN_RESET);', c: 'st_boards' }),
      I('La <b>Blue Pill</b> (F103C8, Cortex-M3 a 72 MHz, sin FPU) fue muy popular, pero hoy abundan los chips clonados o falsificados, y muchas traen mal la resistencia de pull-up del USB. La Black Pill es mejor punto de partida.'),
      Q('¿Por qué empezar con la Black Pill y no con la Blue Pill?', ['Cortex-M4F con FPU, más RAM y Flash, y menos problemas de clones', 'Porque tiene WiFi', 'Porque es de 5 V', 'Porque no necesita programador'], 'Más potencia por el mismo precio.', { c: 'st_boards' }),
      Q('Muchos pines de STM32 son “FT”. ¿Puedes conectar un sensor de 5 V a un pin FT?', ['Sí, si la hoja de datos lo marca como FT y el pin no está en modo analógico', 'Sí, cualquier pin', 'Nunca', 'Solo con el chip apagado'], 'FT = tolerante a 5 V en entrada digital. En modo analógico deja de serlo.', { c: 'st_pinlim' }),
      Q('¿Por qué no alimentar la placa a la vez por USB y por una fuente de 5 V externa en el mismo pin?', ['Las dos fuentes pueden pelearse y meter corriente una en la otra', 'Porque se duplica la tensión', 'No pasa nada', 'Porque el STM32 se vuelve de 5 V'], 'Elige una fuente o usa un diodo o un circuito de conmutación.', { c: 'st_boards' }),
      { t: 'match', q: 'Une cada elemento con su pin.', pairs: [['LED LD2 de la Nucleo', 'PA5'], ['Pulsador B1 de la Nucleo', 'PC13'], ['LED de la Black Pill', 'PC13 '], ['Pulsador KEY de la Black Pill', 'PA0']], c: 'st_boards' },
      Q('Los clones baratos de ST-LINK V2 con forma de pendrive…', ['Suelen grabar y depurar bien, pero casi nunca sacan SWO', 'No funcionan nunca', 'Son más rápidos que el original', 'Solo sirven para la Blue Pill'], 'Para printf por SWO necesitas un ST-LINK que lo tenga, como el de las Nucleo.', { c: 'st_printf' })
    ]),
    L('st5', 'El mapa de memoria', 'memory', ['st_memmap', 'st_regaddr', 'st_volatile', 'st_boot0', 'st_bsrr'], [
      I('Con 32 bits hay 4 GB de direcciones, y el chip las reparte en regiones. En un STM32F4:\n<b>0x08000000</b>: Flash (programa).\n<b>0x20000000</b>: SRAM (variables y pila).\n<b>0x40000000</b>: periféricos.\n<b>0xE0000000</b>: periféricos del núcleo (NVIC, SysTick).'),
      { t: 'match', q: 'Une cada dirección con lo que hay.', pairs: [['0x08000000', 'Flash'], ['0x20000000', 'SRAM'], ['0x40020000', 'GPIOA'], ['0xE000E010', 'SysTick']], c: 'st_memmap' },
      Q('¿Qué significa “periférico mapeado en memoria”?', ['Que sus registros se leen y escriben como si fueran posiciones de memoria', 'Que el periférico tiene su propia RAM', 'Que se copia en la Flash', 'Que solo se usa con DMA'], 'No hay instrucciones especiales de E/S: basta un puntero.', { c: 'st_memmap' }),
      I('Esta línea pone a 1 el pin PA5 escribiendo directamente en la dirección del registro ODR de GPIOA:', { code: '*(volatile uint32_t *)0x40020014\n    = (1U << 5);' }),
      Q('¿Por qué el puntero es volatile?', ['Para que el compilador haga cada acceso: el registro tiene efectos y puede cambiar solo', 'Para que sea más rápido', 'Para guardarlo en Flash', 'Porque es de 32 bits'], 'Sin volatile, el optimizador podría juntar o eliminar escrituras.', { code: '*(volatile uint32_t *)0x40020014\n    = (1U << 5);', c: 'st_volatile' }),
      G('st_regAddr'), G('st_regAddr'),
      I('Al arrancar, según el pin <b>BOOT0</b>, la Flash (o la memoria del cargador de ST) aparece también en la dirección <b>0x00000000</b>. Por eso el núcleo encuentra allí su tabla de vectores.'),
      Q('Con BOOT0 a 1 al hacer reset, ¿desde dónde arranca un STM32F4?', ['Desde la memoria de sistema: el cargador de ST', 'Desde la Flash', 'Desde la SRAM siempre', 'No arranca'], 'Así puedes cargar firmware por UART o USB sin programador.', { c: 'st_boot0' }),
      Q('La F411 tiene 128 KB de SRAM. ¿Cuál es la primera dirección que queda fuera?', ['0x20020000', '0x20128000', '0x20001000', '0x20012800'], '128 KB = 0x20000 bytes: 0x20000000 + 0x20000.', { c: 'st_memmap' }),
      I('Curiosidad del M3 y el M4: el <b>bit-banding</b> da a cada bit de la SRAM y de los periféricos su propia palabra en una zona “alias”, para cambiar un bit con una sola escritura. No existe en M0, M7 ni M33.'),
      Q('¿Qué ventaja tiene escribir un bit por bit-banding?', ['Es atómico: no hay leer-modificar-escribir que una interrupción pueda romper', 'Ocupa menos Flash', 'Funciona en todos los Cortex-M', 'Va a 1 GHz'], 'Una sola escritura cambia un solo bit.', { c: 'st_bsrr' })
    ]),
    PRJ('st-p1', 'Proyecto: identifica tu placa', 'st_identify')
  ] };

  const M2 = { id: 'st-m2', title: 'Herramientas y depuración', desc: 'STM32CubeIDE, CubeMX, ST-LINK y SWD, depurador, printf y la cadena de compilación.', nodes: [
    L('st6', 'STM32CubeIDE y CubeMX', 'code', ['st_cubemx', 'st_swdrec'], [
      I('<b>STM32CubeIDE</b> es un entorno gratuito basado en Eclipse con el compilador GCC, el depurador GDB y <b>CubeMX</b> integrado. CubeMX guarda la configuración del chip en un archivo <b>.ioc</b> y genera el código de inicialización.'),
      { t: 'order', q: 'Ordena el flujo de trabajo con CubeIDE.', items: ['Crear el proyecto y elegir placa o chip', 'Asignar pines y periféricos en el .ioc', 'Configurar el árbol de relojes', 'Generar el código', 'Escribir tu código en las zonas USER CODE', 'Compilar y depurar'], e: 'Configuración gráfica primero; tu lógica, después y en su sitio.', c: 'st_cubemx' },
      I('En la vista de pines haces clic en un pin y le asignas función. Si le pones una <b>etiqueta de usuario</b> (por ejemplo “LED”), CubeMX crea en main.h las macros LED_Pin y LED_GPIO_Port.'),
      Q('¿Dónde están definidas LED_GPIO_Port y LED_Pin?', ['En main.h, generadas a partir de la etiqueta del pin en CubeMX', 'En la HAL de ST', 'Hay que escribirlas a mano en main.c', 'En el script del enlazador'], 'Si cambias el pin en CubeMX, el código sigue funcionando.', { code: 'HAL_GPIO_TogglePin(LED_GPIO_Port,\n                   LED_Pin);', c: 'st_cubemx' }),
      I('Archivos generados más importantes:\n<b>main.c</b>: main, SystemClock_Config y MX_xxx_Init.\n<b>stm32f4xx_it.c</b>: los manejadores de interrupción.\n<b>stm32f4xx_hal_msp.c</b>: pines y relojes de cada periférico.\n<b>startup_*.s</b> y <b>*.ld</b>: arranque y enlazador.'),
      { t: 'match', q: 'Une cada archivo con su contenido.', pairs: [['main.c', 'main y SystemClock_Config'], ['stm32f4xx_it.c', 'Manejadores de interrupción'], ['stm32f4xx_hal_msp.c', 'Pines y relojes de cada periférico'], ['STM32F411CEUX_FLASH.ld', 'Mapa de memoria para el enlazador']], c: 'st_cubemx' },
      Q('Escribes tu bucle fuera de USER CODE y vuelves a generar el código. ¿Qué pasa?', ['Se pierde: CubeMX solo conserva lo que va entre BEGIN y END', 'Se conserva', 'Aparece un aviso y se guarda una copia', 'CubeMX lo mueve'], 'Regla de oro de CubeMX.', { code: '  while (1)\n  {\n    mi_bucle();   // <- aquí\n    /* USER CODE END WHILE */', c: 'st_cubemx' }),
      Q('¿Dónde se configuran los pines de la USART2 (modo alternativo, velocidad)?', ['En HAL_UART_MspInit, dentro de stm32f4xx_hal_msp.c', 'En main.h', 'En el script del enlazador', 'En SystemInit'], 'Las funciones Msp hacen la parte de “bajo nivel” de cada periférico.', { c: 'st_cubemx' }),
      Q('¿Por qué conviene poner SYS › Debug en “Serial Wire”?', ['Reserva PA13 y PA14 para el depurador y evita quedarte sin acceso SWD', 'Para que vaya más rápido', 'Para activar printf', 'Para usar el USB'], 'En la F1, elegir “No Debug” genera código que desactiva el SWD.', { c: 'st_swdrec' }),
      I('Puedes regenerar sin miedo si respetas las zonas USER CODE. Aun así, haz un commit en git antes de regenerar: si algo cambia de forma inesperada, lo verás en el diff.')
    ]),
    L('st7', 'ST-LINK y SWD', 'bus', ['st_swd', 'st_swdrec', 'st_dbglp', 'st_debug'], [
      I('<b>SWD</b> (Serial Wire Debug) necesita solo dos señales: <b>SWDIO</b> (datos, PA13) y <b>SWCLK</b> (reloj, PA14), más GND. Opcionalmente <b>NRST</b> (reset) y <b>SWO</b> (traza, PB3). JTAG usaría cuatro o cinco.'),
      { t: 'match', q: 'Une cada señal con su función.', pairs: [['SWDIO', 'Datos bidireccionales (PA13)'], ['SWCLK', 'Reloj del depurador (PA14)'], ['NRST', 'Reset del chip'], ['SWO', 'Salida de traza (PB3)']], c: 'st_swd' },
      Q('Además de SWDIO y SWCLK, ¿qué cable es imprescindible?', ['GND', 'NRST', '5 V', 'BOOT0'], 'Sin masa común no hay referencia para las señales.', { c: 'st_swd' }),
      I('El ST-LINK original lee la tensión de tu placa para adaptar sus niveles. Los clones suelen dar 3,3 V por un pin y conviene no alimentar la placa a la vez por otro lado.'),
      Q('Tu programa ha configurado PA13 y PA14 como GPIO y el depurador ya no conecta. ¿Qué haces?', ['Conectar en modo “Under reset” (o arrancar con BOOT0 a 1) y borrar la Flash', 'Tirar la placa', 'Cambiar de cable USB', 'Bajar la tensión'], 'Bajo reset, el depurador para el núcleo antes de que tu código toque esos pines.', { c: 'st_swdrec' }),
      I('<b>Connect under reset</b>: el ST-LINK mantiene NRST a nivel bajo, se conecta y detiene el núcleo justo al soltarlo, antes de ejecutar tu código. Si no tienes NRST cableado, BOOT0 a 1 arranca el cargador de ST y tu programa no se ejecuta.'),
      { t: 'order', q: 'Ordena cómo recuperar un chip que no conecta.', items: ['Cablea NRST además de SWDIO, SWCLK y GND', 'Elige el modo de conexión “Under reset”', 'Conecta con CubeProgrammer', 'Haz un borrado completo', 'Graba un programa que deje el SWD activo'], e: 'Si aun así no conecta, prueba con BOOT0 a 1.', c: 'st_swdrec' },
      Q('La conexión falla con cables de 30 cm pero va bien con 10 cm. ¿Qué pruebas?', ['Bajar la frecuencia de SWD en la configuración del depurador', 'Subir la tensión', 'Cambiar de chip', 'Quitar GND'], 'A más velocidad, más importan la longitud y el ruido.', { c: 'st_swd' }),
      Q('El chip está en modo Stop y el depurador pierde la conexión. ¿Por qué?', ['En bajo consumo se paran los relojes de depuración salvo que los actives en DBGMCU', 'Porque el ST-LINK se apaga', 'Porque se borra la Flash', 'Porque SWD no funciona con la F4'], 'HAL_DBGMCU_EnableDBGStopMode() lo mantiene mientras desarrollas.', { c: 'st_dbglp' }),
      Q('¿Qué ventaja tiene el SWD frente a cargar el programa por un cargador serie para desarrollar?', ['Grabas en segundos y además puedes pausar y leer memoria y registros', 'Ninguna', 'No necesita cables', 'Funciona sin alimentación'], 'Un depurador es tu mejor instrumento de medida para el software.', { c: 'st_debug' })
    ]),
    L('st8', 'Depurar como un profesional', 'code', ['st_debug', 'st_hardfault', 'st_volatile', 'st_cycles'], [
      I('En CubeIDE: un <b>punto de ruptura</b> detiene el programa en una línea. Después puedes avanzar <b>Step Into</b> (F5), <b>Step Over</b> (F6), <b>Step Return</b> (F7) o continuar con <b>Resume</b> (F8).'),
      { t: 'match', q: 'Une cada acción con lo que hace.', pairs: [['Step Into', 'Entra dentro de la función'], ['Step Over', 'Ejecuta la función entera y para en la siguiente línea'], ['Step Return', 'Termina la función actual y vuelve'], ['Resume', 'Sigue hasta el siguiente punto de ruptura']], c: 'st_debug' },
      I('Vistas útiles:\n<b>Expressions</b> y <b>Live Expressions</b> (se actualizan sin parar el programa).\n<b>SFRs</b>: los registros de periféricos con sus bits.\n<b>Memory</b>: cualquier dirección.\n<b>Registers</b>: R0–R15 y xPSR del núcleo.'),
      Q('Quieres ver cómo cambia una variable mientras el programa corre, sin pararlo. ¿Qué usas?', ['Live Expressions', 'Un punto de ruptura', 'Step Into', 'El archivo .map'], 'Se leen por SWD en segundo plano.', { c: 'st_debug' }),
      Q('¿Qué es un watchpoint?', ['Un punto de ruptura que salta cuando se lee o escribe una dirección', 'Un punto de ruptura en una línea', 'Un temporizador del depurador', 'Una variable volatile'], 'Ideal para cazar quién está pisando una variable.', { c: 'st_debug' }),
      Q('Con -O2, el depurador dice “optimized out” al mirar i. ¿Por qué?', ['El compilador la tiene en un registro o la ha eliminado', 'Hay un error en el código', 'El ST-LINK falla', 'La Flash está llena'], 'Para depurar, compila con -Og o -O0.', { code: 'for (int i = 0; i < 10; i++)\n  suma += datos[i];', c: 'st_volatile' }),
      I('Un <b>HardFault</b> salta cuando el núcleo hace algo imposible: acceder a una dirección inválida, ejecutar algo que no es código o desbordar la pila. El Fault Analyzer de CubeIDE lee los registros CFSR, HFSR y BFAR y el PC apilado.'),
      Q('¿Qué ocurre aquí?', ['HardFault: salta a una dirección sin código válido', 'No hace nada', 'Reinicia la placa limpiamente', 'Error de compilación'], 'Llamar a un puntero a función nulo es un clásico.', { code: 'void (*f)(void) = NULL;\nf();', c: 'st_hardfault' }),
      Q('En un HardFault, ¿qué te dice el PC guardado en la pila?', ['Dónde estaba el programa cuando falló', 'La dirección de main', 'El valor de la pila', 'La frecuencia del reloj'], 'Búscalo en el desensamblado o en el .map.', { c: 'st_hardfault' }),
      Nm('A 100 MHz, DWT->CYCCNT avanza 2500 cuentas durante una función. ¿Cuántos µs tarda?', 25, 'µs', '2500 ciclos / 100 MHz = 25 µs. El contador de ciclos es el cronómetro más fino que tienes.', { code: 'uint32_t t0 = DWT->CYCCNT;\nfiltro();\nuint32_t c = DWT->CYCCNT - t0;', c: 'st_cycles' }),
      Q('Una variable que cambia en una interrupción no se actualiza nunca en main con -O2. ¿Qué falta?', ['volatile', 'static', 'const', 'extern'], 'Sin volatile, el compilador puede leerla una sola vez.', { c: 'st_volatile' })
    ]),
    L('st9', 'printf por UART y por SWO', 'code', ['st_printf', 'st_brr', 'st_uarttime', 'st_isrrules'], [
      I('printf usa la biblioteca newlib, que acaba llamando a <b>_write</b> (en syscalls.c). En CubeIDE, _write llama a <b>__io_putchar</b> por cada carácter, y esa función la escribes tú.'),
      Q('¿Qué hace esta función?', ['Envía por la UART cada carácter que printf quiere imprimir', 'Lee un carácter', 'Activa la UART', 'Imprime en la pantalla del PC directamente'], 'Redirección de printf.', { code: 'int __io_putchar(int ch) {\n  HAL_UART_Transmit(&huart2,\n    (uint8_t *)&ch, 1, 10);\n  return ch;\n}', c: 'st_printf' }),
      Q('printf("%f", x) no imprime nada. ¿Qué pasa?', ['newlib-nano no incluye float en printf por defecto: actívalo (-u _printf_float)', 'x vale cero', 'La UART va lenta', 'printf no funciona en ARM'], 'Ocupa unos KB más de Flash.', { c: 'st_printf' }),
      Q('printf("hola") no aparece hasta que imprimes otra cosa con \\n. ¿Por qué?', ['stdout guarda en un búfer hasta el salto de línea', 'La UART pierde datos', 'Falta un retardo', 'El terminal está mal'], 'Termina con \\n o desactiva el búfer con setvbuf(stdout, NULL, _IONBF, 0).', { c: 'st_printf' }),
      Nm('Un mensaje de 46 caracteres a 115 200 baudios (10 bits por carácter). ¿Cuántos ms tarda?', 4, 'ms', '46 × 10 / 115 200 ≈ 4 ms. Con HAL_UART_Transmit, la CPU espera todo ese tiempo.', { tol: 0.1, c: 'st_uarttime' }),
      Q('¿Por qué no usar printf dentro de una interrupción?', ['Bloquea milisegundos y retrasa todo lo demás', 'Porque no compila', 'Porque gasta Flash', 'Porque cambia la prioridad'], 'Guarda el dato y que lo imprima main.', { c: 'st_isrrules' }),
      I('<b>SWO</b> es un canal de traza por el pin PB3: con ITM_SendChar envías caracteres al depurador sin gastar una UART. Necesitas un ST-LINK con SWO y poner en la configuración de depuración la frecuencia real del núcleo.'),
      Q('¿Qué hace esta versión?', ['Envía printf por el canal SWO del depurador', 'Envía por la UART', 'Escribe en la Flash', 'Hace parpadear PB3'], 'Se ve en la consola SWV de CubeIDE.', { code: 'int __io_putchar(int ch) {\n  return ITM_SendChar(ch);\n}', c: 'st_printf' }),
      Q('Activas SWO y la consola muestra basura o nada. ¿Primera sospecha?', ['La frecuencia del núcleo configurada en el depurador no coincide con SYSCLK', 'El LED está mal', 'Falta un pull-up', 'La Flash está llena'], 'El ST-LINK necesita saberla para decodificar SWO.', { c: 'st_printf' }),
      G('st_brr')
    ]),
    L('st10', 'Más allá de CubeIDE', 'code', ['st_toolchain', 'st_sections', 'st_fpu', 'st_hal', 'st_profw'], [
      I('Debajo de cualquier IDE está la cadena <b>arm-none-eabi</b>: gcc compila, ld enlaza, objcopy convierte formatos, size mide y gdb depura.'),
      { t: 'match', q: 'Une cada archivo con lo que contiene.', pairs: [['.elf', 'Programa con símbolos y datos de depuración'], ['.bin', 'Imagen binaria pura, sin direcciones'], ['.hex', 'Imagen con direcciones en texto (Intel HEX)'], ['.map', 'Dónde ha quedado cada función y variable']], c: 'st_toolchain' },
      Q('¿Qué hace la opción -mfloat-abi=hard?', ['Usa la FPU y pasa los float en sus registros', 'Desactiva la FPU', 'Compila más despacio', 'Usa doble precisión siempre'], 'Debe ir con -mfpu=fpv4-sp-d16 en un M4F.', { code: 'arm-none-eabi-gcc -mcpu=cortex-m4\n  -mthumb -mfpu=fpv4-sp-d16\n  -mfloat-abi=hard -Og -g ...', c: 'st_fpu' }),
      Q('Grabas un .bin con una herramienta. ¿Qué tienes que indicarle?', ['La dirección de destino, normalmente 0x08000000', 'Nada', 'La frecuencia del reloj', 'El número de serie'], 'El .bin no lleva direcciones; el .hex y el .elf sí.', { c: 'st_toolchain' }),
      I('Con <b>OpenOCD</b> y <b>GDB</b> depuras desde la terminal: OpenOCD habla con la sonda (ST-LINK) y abre un servidor; GDB se conecta a él, carga el .elf y pone puntos de ruptura.'),
      Q('¿Qué papel tiene OpenOCD?', ['Servidor intermedio entre GDB y la sonda de depuración', 'Compilador', 'Editor de código', 'Sistema operativo'], 'GDB habla con OpenOCD; OpenOCD, con el ST-LINK.', { c: 'st_toolchain' }),
      I('Alternativas: <b>PlatformIO</b> en VS Code (con el framework de ST o el núcleo Arduino STM32duino), o exportar desde CubeMX un proyecto con <b>Makefile</b> o CMake y usar tu editor favorito.'),
      Q('¿Cuándo tiene sentido STM32duino (Arduino para STM32)?', ['Prototipos rápidos reutilizando bibliotecas de Arduino, aceptando menos control', 'Para producción crítica siempre', 'Nunca', 'Solo para la F7'], 'Para aprender el flujo profesional, mejor CubeMX + HAL o registros.', { c: 'st_hal' }),
      G('st_memUse'), G('st_memUse'),
      Q('¿Por qué compilar con make en un servidor de integración continua?', ['Las compilaciones son reproducibles y se prueban en cada cambio', 'Porque CubeIDE no compila', 'Porque el servidor programa la placa solo', 'Para que ocupe menos'], 'Misma versión de compilador, mismo resultado.', { c: 'st_profw' })
    ]),
    PRJ('st-p2', 'Proyecto: baliza Morse con consola', 'st_morse')
  ] };

  const M3 = { id: 'st-m3', title: 'Capas de software y arranque', desc: 'Registros con CMSIS, bits, HAL y LL, y todo lo que pasa antes de main.', nodes: [
    L('st11', 'Registros con CMSIS', 'memory', ['st_regaddr', 'st_reg', 'st_volatile', 'st_rccen', 'st_docs'], [
      I('<b>CMSIS</b> tiene dos partes: la de ARM (NVIC, SysTick, funciones como __disable_irq) y la cabecera del dispositivo que da ST (stm32f411xe.h), con una estructura por periférico y una macro por cada bit.'),
      I('Así describe la cabecera un puerto GPIO: una estructura cuyos campos están en el mismo orden y separación que los registros, y una macro que apunta a la dirección base.', { code: 'typedef struct {\n  __IO uint32_t MODER;   // +0x00\n  __IO uint32_t OTYPER;  // +0x04\n  __IO uint32_t OSPEEDR; // +0x08\n  __IO uint32_t PUPDR;   // +0x0C\n  __IO uint32_t IDR;     // +0x10\n  __IO uint32_t ODR;     // +0x14\n  ...\n} GPIO_TypeDef;\n#define GPIOA ((GPIO_TypeDef *)GPIOA_BASE)' }),
      Q('¿Cómo calcula el compilador la dirección de GPIOA->ODR?', ['Base de GPIOA más el desplazamiento del campo ODR (0x14)', 'Busca en una tabla en Flash', 'Pregunta al periférico', 'Es siempre 0x40000000'], 'Una estructura superpuesta sobre los registros.', { c: 'st_regaddr' }),
      Q('¿Qué es __IO en la cabecera de CMSIS?', ['Una macro de volatile', 'Un tipo de 64 bits', 'Una función', 'Una sección de memoria'], 'Cada acceso a un registro debe realizarse de verdad.', { c: 'st_volatile' }),
      Q('¿Qué hace esta línea?', ['Habilita el reloj del puerto GPIOA', 'Pone PA0 a 1', 'Resetea GPIOA', 'Configura PA0 como salida'], 'RCC_AHB1ENR_GPIOAEN es el bit 0 de AHB1ENR.', { code: 'RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;', c: 'st_rccen' }),
      G('st_regAddr'),
      I('Documentos que vas a usar:\n<b>Manual de referencia</b> (RM): cada registro bit a bit.\n<b>Hoja de datos</b>: patillaje, tabla de funciones alternativas y límites eléctricos.\n<b>Hoja de erratas</b>: fallos conocidos del silicio.\n<b>Manual de programación</b> (PM0214 para el M4): el núcleo.'),
      { t: 'match', q: '¿Dónde buscas cada cosa?', pairs: [['Los bits de USART_CR1', 'Manual de referencia'], ['Qué AF lleva PA9 a USART1_TX', 'Hoja de datos'], ['Un fallo conocido del I²C', 'Hoja de erratas'], ['Las instrucciones del Cortex-M4', 'Manual de programación']], c: 'st_docs' },
      Q('¿Qué problema tiene esta línea para poner PA5 como salida?', ['Machaca los demás pines del puerto, incluidos PA13 y PA14 del SWD', 'Ninguno', 'Le falta volatile', 'Pone PA5 como entrada'], 'Asignar con = borra todo el registro. Usa |= y &= ~ sobre el campo.', { code: 'GPIOA->MODER = (1U << 10);', c: 'st_reg' })
    ]),
    L('st12', 'Manipular bits sin romper nada', 'bin', ['st_reg', 'st_field', 'st_bsrr'], [
      I('Las tres jugadas básicas sobre un registro:\n<b>reg |= m</b> → pone a 1 los bits de m.\n<b>reg &= ~m</b> → los pone a 0.\n<b>reg ^= m</b> → los invierte.\nLa máscara se escribe con desplazamientos: (1U &lt;&lt; 5) es el bit 5.'),
      Q('¿Qué hace esta línea?', ['Pone a 1 el bit 5 de ODR sin tocar los demás', 'Pone ODR a 5', 'Borra el bit 5', 'Invierte todo el registro'], 'OR con una máscara de un solo bit.', { code: 'GPIOA->ODR |= (1U << 5);', c: 'st_reg' }),
      Q('¿Y esta?', ['Pone a 0 el bit 3 de x', 'Pone a 1 el bit 3', 'Pone a 0 todos menos el 3', 'Invierte el bit 3'], '~ invierte la máscara; el AND conserva todo menos el bit 3.', { code: 'x &= ~(1U << 3);', c: 'st_reg' }),
      I('Un <b>campo</b> de varios bits (como los 2 bits de modo de un pin en MODER) se cambia en dos pasos: primero se limpia y luego se escribe el valor nuevo.', { code: 'GPIOA->MODER &= ~(3U << (2 * 5));\nGPIOA->MODER |=  (1U << (2 * 5));' }),
      TU('Consigue que MODER valga 0x00000400 (PA5 como salida).', 'st_reg', { pin: { label: 'Pin', val: 0, min: 0, max: 15, step: 1, dec: 0 }, mode: { label: 'Modo (0 ent · 1 sal · 2 AF · 3 anal)', val: 0, list: [0, 1, 2, 3], dec: 0 } }, { q: 'val', min: 1024, max: 1024, text: 'Objetivo: MODER = 0x00000400', hint: 'Pin 5, modo 1: 01 desplazado 10 posiciones.' }, '1 << 10 = 0x400.', { c: 'st_field' }),
      G('st_moder'), G('st_moder'),
      I('Leer-modificar-escribir (|=, &=) son <b>tres pasos</b>: leer, cambiar y escribir. Si una interrupción cambia el mismo registro entre medias, su cambio se pierde. Para GPIO existe <b>BSRR</b>: escribir un 1 actúa sobre un bit y los ceros no hacen nada.'),
      G('st_bsrr'), G('st_bsrr'),
      Q('¿Qué comprueba esta condición?', ['Si el pin PA0 está a nivel alto', 'Si PA0 es salida', 'Si el reloj de GPIOA está activo', 'Si hay una interrupción'], 'IDR refleja el nivel de los pines; el AND aísla el bit 0.', { code: 'if (GPIOA->IDR & (1U << 0)) { ... }', c: 'st_reg' }),
      Q('¿Por qué se escribe 1U << 31 y no 1 << 31?', ['1 es un int con signo: desplazarlo al bit 31 es comportamiento indefinido en C', 'Por estilo', 'Porque 1U ocupa menos', 'No hay diferencia'], 'Con unsigned el resultado es 0x80000000 sin sorpresas.', { c: 'st_reg' }),
      Nm('Escribes GPIOx->BSRR = (1U << (5 + 16)). ¿Qué bit del registro pones a 1?', 21, '', 'BR5 está en el bit 21: pone PA5 a 0.', { c: 'st_bsrr' })
    ]),
    L('st13', 'HAL y LL', 'code', ['st_halcb', 'st_halstatus', 'st_hal', 'st_isrrules'], [
      I('La HAL trabaja con <b>manejadores</b>: estructuras como UART_HandleTypeDef huart2 que guardan la instancia (USART2), la configuración y el estado. Casi todas las funciones devuelven un <b>HAL_StatusTypeDef</b>.'),
      { t: 'match', q: 'Une cada estado con su significado.', pairs: [['HAL_OK', 'Todo bien'], ['HAL_ERROR', 'Error del periférico o parámetros'], ['HAL_BUSY', 'El periférico está ocupado con otra operación'], ['HAL_TIMEOUT', 'Se agotó el tiempo de espera']], c: 'st_halstatus' },
      Q('¿Por qué comprobar lo que devuelve esta llamada?', ['Porque si la pantalla no responde devuelve un error y debes reaccionar', 'Porque si no, no compila', 'Para que vaya más rápido', 'No hace falta nunca'], 'Ignorar errores es el origen de muchos cuelgues raros.', { code: 'if (HAL_I2C_Master_Transmit(&hi2c1,\n    0x3C << 1, buf, 2, 10) != HAL_OK) {\n  /* reintentar o avisar */\n}', c: 'st_halstatus' }),
      I('Cada periférico tiene tres estilos: <b>sondeo</b> (bloquea hasta terminar o hasta el tiempo límite), <b>_IT</b> (devuelve al instante y avisa con un callback en la interrupción) y <b>_DMA</b> (igual, pero los datos los mueve el DMA).'),
      Q('¿Qué falla aquí?', ['buf es local: desaparece al salir de la función mientras la UART sigue enviándolo', 'Nada', 'Falta el tiempo de espera', 'HAL_UART_Transmit_IT no existe'], 'Con _IT y _DMA el búfer debe seguir vivo hasta el callback: static o global.', { code: 'void enviar(void) {\n  char buf[32] = "hola\\r\\n";\n  HAL_UART_Transmit_IT(&huart2,\n    (uint8_t *)buf, 6);\n}', c: 'st_halcb' }),
      I('Los callbacks de la HAL están declarados <b>__weak</b>: hay una versión vacía en la biblioteca y, si escribes una función con el mismo nombre, el enlazador usa la tuya.'),
      Q('¿Qué significa __weak en HAL_UART_TxCpltCallback?', ['Que puedes redefinirla en tu código y el enlazador usará la tuya', 'Que es lenta', 'Que no se puede usar', 'Que se ejecuta en otra tarea'], 'Así la HAL te avisa sin que modifiques sus archivos.', { c: 'st_halcb' }),
      I('La <b>LL</b> (Low Layer) son funciones inline muy finas: LL_GPIO_SetOutputPin(GPIOA, LL_GPIO_PIN_5) acaba siendo una escritura en BSRR. En CubeMX puedes elegir HAL o LL para cada periférico (Project Manager › Advanced Settings).'),
      Q('Bucle crítico que conmuta un pin a la máxima velocidad. ¿Qué eliges?', ['LL o registros', 'HAL_GPIO_TogglePin con HAL_Delay', 'printf', 'HAL con DMA'], 'Menos capas, menos ciclos.', { c: 'st_hal' }),
      Q('Llamas a HAL_Delay dentro de una interrupción más urgente que el SysTick. ¿Qué pasa?', ['Se cuelga: el SysTick no puede interrumpir para avanzar el contador', 'Espera lo indicado', 'Espera el doble', 'Nada'], 'HAL_Delay depende de la interrupción del SysTick.', { c: 'st_isrrules' }),
      Q('¿Qué ventaja real tiene la HAL frente a los registros?', ['Portabilidad: el mismo código sirve con pocos cambios en otra familia STM32', 'Es siempre más rápida', 'Ocupa menos Flash', 'No necesita relojes'], 'Pagas en tamaño y velocidad a cambio de portabilidad y rapidez de desarrollo.', { c: 'st_hal' })
    ]),
    L('st14', 'Qué pasa antes de main', 'rocket', ['st_boot', 'st_sections', 'st_hsi', 'st_fpu', 'st_irqsetup'], [
      I('Al salir de reset, el núcleo lee la dirección 0x00000000 (donde aparece la Flash): esa palabra es el valor inicial del <b>puntero de pila</b> (MSP). Luego lee 0x00000004: la dirección de <b>Reset_Handler</b>, y salta allí.'),
      Q('La primera palabra de la Flash vale 0x20020000. ¿Qué es?', ['El valor inicial de la pila: el final de la SRAM de 128 KB', 'La dirección de main', 'Una instrucción', 'El tamaño del programa'], 'La pila crece hacia abajo desde el final de la RAM.', { c: 'st_boot' }),
      Q('La segunda palabra vale 0x080001A9 (impar). ¿Por qué impar?', ['El bit 0 a 1 indica modo Thumb', 'Es un error', 'Está desalineada a propósito', 'Indica que hay FPU'], 'Los Cortex-M solo ejecutan Thumb: las direcciones de salto llevan el bit 0 a 1.', { c: 'st_boot' }),
      I('Reset_Handler (en startup_stm32f411xe.s) hace, en este orden: llama a <b>SystemInit</b> (activa la FPU y fija la tabla de vectores), copia <b>.data</b> de Flash a RAM, pone <b>.bss</b> a cero, llama a __libc_init_array (inicializaciones de C y C++) y, por fin, a <b>main</b>.'),
      { t: 'order', q: 'Ordena lo que ocurre desde el reset.', items: ['El núcleo carga el MSP de la primera palabra', 'Salta a Reset_Handler', 'SystemInit activa la FPU', 'Se copia .data y se pone .bss a cero', 'Se llama a main', 'main llama a SystemClock_Config'], e: 'El PLL se configura ya dentro de main.', c: 'st_boot' },
      Q('Al llegar a la primera línea de main, ¿a qué frecuencia funciona una F411?', ['A 16 MHz con el HSI: el PLL lo configura después SystemClock_Config', 'A 100 MHz', 'A 32 kHz', 'Depende de la hora'], 'SystemInit no toca el PLL en las versiones actuales de Cube.', { c: 'st_hsi' }),
      Q('¿En qué sección acaba esta variable?', ['.data: tiene valor inicial distinto de cero', '.bss', 'La pila', '.text'], 'Las static locales viven como globales.', { code: 'void f(void) {\n  static int contador = 5;\n  contador++;\n}', c: 'st_sections' }),
      { t: 'match', q: 'Une cada declaración global con su sección.', pairs: [['const char msg[] = "hola";', '.rodata (Flash)'], ['int n = 7;', '.data (Flash y RAM)'], ['int buffer[256];', '.bss (RAM a cero)'], ['void f(void) { }', '.text (Flash)']], c: 'st_sections' },
      Q('Una variable global sin inicializar, ¿cuánto vale al entrar en main?', ['0, garantizado: el arranque pone .bss a cero', 'Un valor aleatorio', '0xFF', 'Lo que tuviera antes del reset'], 'Es lo que exige el lenguaje C.', { c: 'st_sections' }),
      Q('Si quitas la activación de la FPU de SystemInit y compilas con FPU, ¿qué pasa?', ['Falla con una excepción en la primera instrucción de coma flotante', 'Va más rápido', 'Los float se emulan solos', 'Nada'], 'La FPU arranca apagada: hay que darle acceso en SCB->CPACR.', { c: 'st_fpu' }),
      Q('Escribes void USART2_IRQHandler_(void) con un guion bajo de más. ¿Qué pasa al llegar la interrupción?', ['Se ejecuta Default_Handler, un bucle infinito', 'Se ejecuta tu función igualmente', 'Error de compilación', 'Se ignora la interrupción'], 'Los nombres de la tabla de vectores son “débiles”: si no coinciden exactamente, se queda el manejador por defecto.', { c: 'st_irqsetup' })
    ]),
    L('st15', 'El enlazador y tu memoria', 'memory', ['st_linker', 'st_sections', 'st_hardfault', 'st_toolchain', 'st_dmamem'], [
      I('El <b>script del enlazador</b> (.ld) describe la memoria y dice dónde va cada sección.', { code: 'MEMORY {\n  RAM   (xrw) : ORIGIN = 0x20000000,\n                LENGTH = 128K\n  FLASH (rx)  : ORIGIN = 0x08000000,\n                LENGTH = 512K\n}' }),
      Q('¿Qué ocurre si tu programa necesita más de 512 KB de Flash con este script?', ['El enlazador da un error de que la región FLASH se desborda', 'Se graba solo una parte', 'Se usa la RAM', 'Nada'], 'Mejor un error al compilar que un fallo en el campo.', { c: 'st_linker' }),
      I('<b>.data</b> tiene dos direcciones: dónde se ejecuta (RAM) y dónde se guarda (Flash). El script lo expresa con “&gt; RAM AT&gt; FLASH” y exporta símbolos como _sidata, _sdata y _edata para que el arranque haga la copia.'),
      Q('¿Por qué .data ocupa sitio tanto en Flash como en RAM?', ['Los valores iniciales deben sobrevivir sin alimentación (Flash) y la variable debe poder cambiar (RAM)', 'Por seguridad', 'Es un error del enlazador', 'Para ir más rápido'], 'El arranque copia de un sitio al otro.', { c: 'st_sections' }),
      G('st_memUse'),
      I('El script reserva un mínimo para el montón (_Min_Heap_Size) y la pila (_Min_Stack_Size), pero solo comprueba que quepan. En ejecución, <b>nadie impide</b> que la pila crezca de más y pise .bss o el montón.'),
      Q('¿Qué síntoma suele dar un desbordamiento de pila sin RTOS?', ['Variables globales que cambian solas y HardFaults aleatorios', 'Un error de compilación', 'Un mensaje claro en la consola', 'Que el LED parpadee más rápido'], 'Por eso conviene vigilar la pila (lo verás con FreeRTOS).', { c: 'st_hardfault' }),
      Nm('_Min_Stack_Size = 0x400. ¿Cuántos bytes son?', 1024, 'B', '0x400 = 4 × 256 = 1024 bytes.', { c: 'st_linker' }),
      Q('¿Para qué sirve el archivo .map?', ['Para ver cuánto ocupa cada función y variable y en qué dirección quedó', 'Para depurar sin cables', 'Para configurar los pines', 'Para guardar datos en Flash'], 'Es lo primero que se mira cuando la Flash o la RAM se llenan.', { c: 'st_toolchain' }),
      Q('Una F407 tiene 64 KB de CCM RAM y la usas para un búfer con __attribute__((section(".ccmram"))). ¿Qué limitación tiene?', ['El DMA no puede acceder a la CCM', 'Es de solo lectura', 'Se borra en cada interrupción', 'Es más lenta que la Flash'], 'La CCM solo está conectada al núcleo: ideal para pila o datos de cálculo, no para búferes de DMA.', { c: 'st_dmamem' }),
      Q('Tienes una tabla de 4 KB que nunca cambia. ¿Cómo ahorras 4 KB de RAM?', ['Declarándola const para que quede en Flash', 'Declarándola static', 'Declarándola volatile', 'Poniéndola dentro de main'], 'Sin const iría a .data: Flash y RAM.', { c: 'st_sections' })
    ]),
    PRJ('st-p3', 'Proyecto: parpadeo solo con registros', 'st_bare')
  ] };

  const M4 = { id: 'st-m4', title: 'Relojes y GPIO', desc: 'HSI, HSE, PLL, buses y wait states; modos de pin, funciones alternativas y BSRR.', nodes: [
    L('st16', 'Fuentes de reloj', 'timer', ['st_clksrc', 'st_32k', 'st_usbclk'], [
      I('Un STM32F4 tiene cinco fuentes:\n<b>HSI</b>: oscilador RC interno de 16 MHz (±1 % de fábrica).\n<b>HSE</b>: cristal u oscilador externo (4–26 MHz en la F4).\n<b>LSI</b>: RC interno de unos 32 kHz para el watchdog.\n<b>LSE</b>: cristal de 32,768 kHz para el RTC.\n<b>PLL</b>: multiplica para llegar a la frecuencia máxima.'),
      { t: 'match', q: 'Une cada fuente con su uso típico.', pairs: [['HSI', 'Arranque rápido sin componentes externos'], ['HSE', 'Reloj principal preciso'], ['LSI', 'Watchdog independiente'], ['LSE', 'Reloj de tiempo real']], c: 'st_clksrc' },
      Q('¿Por qué el USB necesita el HSE (o un oscilador interno con corrección especial)?', ['El USB exige una precisión que el HSI de ±1 % no garantiza', 'Porque el HSI es demasiado lento', 'Porque el USB funciona a 32 kHz', 'No lo necesita'], 'El USB de velocidad completa admite un error mucho menor.', { c: 'st_usbclk' }),
      Q('¿Por qué los cristales de reloj son de 32 768 Hz?', ['Porque 32 768 = 2¹⁵: dividiendo 15 veces entre 2 sale exactamente 1 Hz', 'Por tradición', 'Porque es la frecuencia de la red', 'Porque es el máximo'], 'Un contador binario de 15 bits da los segundos.', { c: 'st_32k' }),
      I('<b>HSE bypass</b>: en lugar de un cristal, entra una señal de reloj ya hecha. Muchas Nucleo-64 usan por defecto el reloj de 8 MHz que sale del ST-LINK (MCO) en modo bypass.'),
      Q('En CubeMX eliges “BYPASS Clock Source” para el HSE. ¿Qué significa?', ['Que por OSC_IN entra una señal de reloj externa, sin cristal', 'Que se desactiva el HSE', 'Que se usa el HSI', 'Que el reloj se salta el PLL'], 'El oscilador interno del HSE se apaga.', { c: 'st_clksrc' }),
      Q('¿Qué hace el Clock Security System?', ['Si el HSE falla, conmuta al HSI y genera una interrupción NMI', 'Cifra el reloj', 'Impide que se cambie el PLL', 'Protege contra lectura de la Flash'], 'Útil en equipos que no pueden quedarse sin reloj.', { c: 'st_clksrc' }),
      Q('¿Qué hace este bucle?', ['Espera a que el cristal HSE arranque y se estabilice', 'Apaga el HSE', 'Mide la frecuencia', 'Reinicia el chip'], 'Un cristal tarda en arrancar: hay que esperar a HSERDY.', { code: 'RCC->CR |= RCC_CR_HSEON;\nwhile (!(RCC->CR & RCC_CR_HSERDY)) { }', c: 'st_clksrc' }),
      Q('¿Por qué el LSI no sirve para un reloj de pulsera?', ['Su frecuencia varía mucho entre chips y con la temperatura', 'Porque consume mucho', 'Porque es de 16 MHz', 'Porque no existe en la F4'], 'Para la hora, usa el LSE.', { c: 'st_clksrc' }),
      Nm('¿Cuántas veces hay que dividir 32 768 Hz entre 2 para obtener 1 Hz?', 15, '', '2¹⁵ = 32 768.', { c: 'st_32k' })
    ]),
    L('st17', 'El PLL a fondo', 'timer', ['st_clock', 'st_usbclk'], [
      I('El PLL principal de la F4 tiene tres divisores y un multiplicador:\n<b>÷M</b>: deja la entrada del VCO en unos 1–2 MHz.\n<b>×N</b>: el VCO oscila entre 100 y 432 MHz.\n<b>÷P</b> (2, 4, 6 u 8): SYSCLK.\n<b>÷Q</b>: 48 MHz para el USB.\n<b>SYSCLK = fent × N / (M × P)</b>'),
      I('Mueve los divisores y observa los límites del STM32F411.', { tune: { viz: 'st_clock', params: { HSE: { label: 'HSE', val: 25, list: [8, 12, 16, 25], unit: 'MHz', dec: 0 }, M: { label: 'M', val: 25, min: 2, max: 63, step: 1, dec: 0 }, N: { label: 'N', val: 192, min: 50, max: 432, step: 2, dec: 0 }, P: { label: 'P', val: 2, list: [2, 4, 6, 8], dec: 0 }, A1: { label: 'APB1 ÷', val: 2, list: [1, 2, 4, 8, 16], dec: 0 }, A2: { label: 'APB2 ÷', val: 1, list: [1, 2, 4, 8, 16], dec: 0 } } } }),
      TU('Black Pill F411 (HSE 25 MHz): consigue 96 MHz con el USB a 48 MHz y todo dentro de límites.', 'st_clock', { HSE: { label: 'HSE', val: 25, fixed: true }, M: { label: 'M', val: 12, min: 2, max: 63, step: 1, dec: 0 }, N: { label: 'N', val: 100, min: 50, max: 432, step: 2, dec: 0 }, P: { label: 'P', val: 2, list: [2, 4, 6, 8], dec: 0 }, A1: { label: 'APB1 ÷', val: 1, list: [1, 2, 4, 8, 16], dec: 0 }, A2: { label: 'APB2 ÷', val: 1, list: [1, 2, 4, 8, 16], dec: 0 } }, { q: 'usbOk', min: 95.9, max: 96.1, text: 'Objetivo: SYSCLK 96 MHz, USB 48 MHz y sin rojos', hint: 'M = 25, N = 192, P = 2 y APB1 ÷2.' }, 'VCO = 192 MHz: ÷2 = 96 MHz y ÷4 = 48 MHz para el USB.', { c: 'st_clock' }),
      G('st_sysclk'), G('st_sysclk'),
      Q('¿Por qué la entrada del VCO se deja entre 1 y 2 MHz?', ['Es el rango en que el PLL funciona bien; 2 MHz da menos jitter', 'Para gastar menos', 'Porque M no puede ser mayor', 'No importa'], 'Fuera de rango el PLL puede no engancharse.', { c: 'st_clock' }),
      TU('Ahora 100 MHz exactos, el máximo de la F411, sin rojos.', 'st_clock', { HSE: { label: 'HSE', val: 25, fixed: true }, M: { label: 'M', val: 25, min: 2, max: 63, step: 1, dec: 0 }, N: { label: 'N', val: 192, min: 50, max: 432, step: 2, dec: 0 }, P: { label: 'P', val: 4, list: [2, 4, 6, 8], dec: 0 }, A1: { label: 'APB1 ÷', val: 1, list: [1, 2, 4, 8, 16], dec: 0 }, A2: { label: 'APB2 ÷', val: 1, list: [1, 2, 4, 8, 16], dec: 0 } }, { q: 'sysOk', min: 99.9, max: 100.1, text: 'Objetivo: SYSCLK = 100 MHz, todo en verde', hint: 'N = 200, P = 2 y APB1 ÷2 (máximo 50 MHz).' }, 'A 100 MHz no hay Q que dé 48 MHz exactos: por eso muchos proyectos con USB eligen 96 MHz.', { c: 'st_clock' }),
      Nm('VCO = 384 MHz. ¿Qué Q da 48 MHz para el USB?', 8, '', '384 / 48 = 8.', { c: 'st_usbclk' }),
      Q('¿Por qué no subir la F411 a 120 MHz si “parece que funciona”?', ['Fuera de especificación no hay garantía: fallos raros con la temperatura o la tensión', 'Porque se apaga', 'Porque el PLL no lo permite matemáticamente', 'No hay ningún problema'], 'Un producto debe funcionar en todo el rango, no solo en tu mesa.', { c: 'st_clock' }),
      Q('Blue Pill (F103): HSE de 8 MHz y multiplicador del PLL ×9. ¿SYSCLK?', ['72 MHz', '9 MHz', '64 MHz', '81 MHz'], 'La F1 tiene un PLL más sencillo: 8 × 9 = 72 MHz.', { c: 'st_clock' }),
      G('st_sysclk')
    ]),
    L('st18', 'Buses, preescaladores y wait states', 'bus', ['st_apb', 'st_waitst', 'st_rccen', 'st_cubemx', 'st_brr'], [
      I('SYSCLK alimenta el bus <b>AHB</b> (HCLK: núcleo, DMA, GPIO en la F4) y de él cuelgan dos buses de periféricos: <b>APB1</b> (lento) y <b>APB2</b> (rápido). En la F411 los máximos son 100, 50 y 100 MHz.'),
      { t: 'match', q: 'STM32F4: une cada periférico con su bus.', pairs: [['GPIOA', 'AHB1'], ['USART2', 'APB1'], ['USART1', 'APB2'], ['TIM3', 'APB1 ']], c: 'st_apb' },
      I('Truco del reloj de temporizadores: si el preescalador de su bus APB es 1, el temporizador recibe PCLK; si es mayor que 1, recibe <b>el doble de PCLK</b>.'),
      Q('F411 a 100 MHz con APB1 ÷2 (50 MHz). ¿A qué frecuencia cuenta TIM2?', ['100 MHz', '50 MHz', '25 MHz', '200 MHz'], 'APB1 ÷2 ≠ 1, así que el reloj de temporizador es 2 × 50 MHz.', { c: 'st_apb' }),
      Nm('F407 a 168 MHz con APB1 ÷4. ¿Reloj de TIM3 en MHz?', 84, 'MHz', 'PCLK1 = 42 MHz; como ÷4 ≠ 1, el temporizador recibe 84 MHz.', { c: 'st_apb' }),
      I('La Flash es más lenta que la CPU: a frecuencias altas hay que añadir <b>wait states</b> (ciclos de espera) en FLASH->ACR. El acelerador ART de la F4 (prefetch y pequeñas cachés) esconde casi toda esa espera.'),
      Q('Subes SYSCLK sin aumentar los wait states. ¿Qué pasa?', ['La CPU lee instrucciones mal y el programa se cuelga o da HardFault', 'Va más rápido', 'La Flash se borra', 'Nada'], 'CubeMX ajusta FLASH_LATENCY por ti; con registros debes hacerlo tú.', { c: 'st_waitst' }),
      Q('¿En qué orden pasas de 16 MHz a 100 MHz?', ['Primero subes los wait states y después cambias SYSCLK al PLL', 'Primero el PLL y luego los wait states', 'Da igual', 'Primero bajas los wait states'], 'Al bajar la frecuencia, al revés: primero el reloj y luego los wait states.', { c: 'st_waitst' }),
      Q('¿Dónde se genera esta línea en un proyecto de CubeMX?', ['En HAL_UART_MspInit (stm32f4xx_hal_msp.c)', 'En SystemInit', 'En el arranque en ensamblador', 'En main.h'], 'Cada periférico abre su reloj antes de configurarse.', { code: '__HAL_RCC_USART2_CLK_ENABLE();', c: 'st_cubemx' }),
      G('st_brr'),
      Q('¿Por qué los relojes de los periféricos están apagados tras el reset?', ['Para ahorrar energía: solo se enciende lo que usas', 'Para que el chip arranque más rápido', 'Por seguridad contra lecturas', 'Por un fallo de diseño'], 'Cada periférico activo consume aunque no hagas nada con él.', { c: 'st_rccen' })
    ]),
    L('st19', 'GPIO: modos y configuración', 'chip', ['st_gpio', 'st_od', 'st_pinlim', 'st_leak', 'st_field'], [
      I('Cada puerto (GPIOA, GPIOB…) tiene 16 pines y estos registros:\n<b>MODER</b> (modo, 2 bits por pin) · <b>OTYPER</b> (push-pull u open-drain) · <b>OSPEEDR</b> (velocidad) · <b>PUPDR</b> (pull-up/down) · <b>IDR</b> (leer) · <b>ODR</b> (escribir) · <b>BSRR</b> (escritura atómica) · <b>AFR</b> (función alternativa).'),
      { t: 'match', q: 'Une cada valor de MODER con su modo.', pairs: [['00', 'Entrada'], ['01', 'Salida'], ['10', 'Función alternativa'], ['11', 'Analógico']], c: 'st_gpio' },
      I('<b>Push-pull</b>: el pin empuja a 3,3 V y tira a 0 V.\n<b>Open-drain</b>: solo tira a 0 V; el nivel alto lo pone una resistencia pull-up. Varios dispositivos pueden compartir la línea sin cortocircuitos.'),
      Q('Varias placas comparten una línea de “alarma” activa a nivel bajo. ¿Cómo configuras los pines?', ['Open-drain con una pull-up común', 'Push-pull en todas', 'Analógico', 'Entrada sin pull'], 'Cualquiera puede tirar a 0 sin pelearse con las demás.', { c: 'st_od' }),
      I('Las pull-up y pull-down internas son de unos <b>40 kΩ</b>. Sirven para pulsadores, pero son débiles para buses rápidos.'),
      Q('¿Bastan las pull-up internas para un I²C a 400 kHz?', ['No: son demasiado débiles; pon externas de 2,2–4,7 kΩ', 'Sí, siempre', 'Solo si el cable es largo', 'I²C no usa pull-ups'], 'Con 40 kΩ los flancos de subida serían lentísimos.', { c: 'st_od' }),
      I('<b>OSPEEDR</b> no fija la frecuencia, sino lo rápidos que son los flancos. Flancos más rápidos generan más interferencias y rebotes en pistas largas: usa la velocidad más baja que funcione.'),
      Q('¿Qué velocidad de pin eliges para un LED?', ['Baja', 'Muy alta', 'Alta', 'Da igual siempre'], 'Un LED no necesita flancos de nanosegundos.', { c: 'st_pinlim' }),
      Q('¿Por qué conviene poner los pines sin usar en modo analógico?', ['Se desconecta el disparador digital y se reduce el consumo', 'Para medirlos luego', 'Para que sean tolerantes a 5 V', 'Para que hagan de pull-up'], 'Una entrada digital al aire puede oscilar y consumir.', { c: 'st_leak' }),
      Q('Un relé de 70 mA conectado directamente a un pin. ¿Qué opinas?', ['Mal: un pin da unos 25 mA como máximo; usa un transistor con diodo', 'Bien', 'Bien si el pin es FT', 'Bien a velocidad baja'], 'Además hay un límite total para todos los pines del chip.', { c: 'st_pinlim' }),
      G('st_moder')
    ]),
    L('st20', 'Funciones alternativas y escritura atómica', 'chip', ['st_af', 'st_bsrr', 'st_gpio'], [
      I('Cada pin puede conectarse a varios periféricos. Con el modo 10 (alternativo), el número de función <b>AF0–AF15</b> se elige en <b>AFR[0]</b> (pines 0–7) y <b>AFR[1]</b> (pines 8–15), con 4 bits por pin.'),
      Q('¿Dónde se configura la función alternativa de PA9?', ['En AFR[1], bits 4 a 7', 'En AFR[0], bits 36 a 39', 'En MODER', 'En AFR[1], bits 9 a 12'], 'PA9 es el pin 1 dentro de AFR[1]: (9 − 8) × 4 = 4.', { c: 'st_af' }),
      Nm('PA2 como TX de USART2 (AF7). ¿Qué valor decimal tiene el campo ya desplazado en AFR[0]?', 1792, '', '7 << (4 × 2) = 7 << 8 = 1792 (0x700).', { c: 'st_af' }),
      Q('¿Qué hace esta línea?', ['Pone AF7 en el pin 2 (si el campo estaba a cero)', 'Pone PA7 como salida', 'Activa USART7', 'Borra AFR'], 'Cuatro bits por pin: el pin 2 empieza en el bit 8.', { code: 'GPIOA->AFR[0] |= (7U << (4 * 2));', c: 'st_af' }),
      I('Funciones alternativas típicas en la F4: <b>AF1</b> TIM1/TIM2 · <b>AF2</b> TIM3–5 · <b>AF4</b> I²C · <b>AF5</b> SPI1/SPI2 · <b>AF7</b> USART1/USART2 · <b>AF8</b> USART6. La tabla exacta de cada pin está en la hoja de datos.'),
      { t: 'match', q: 'STM32F4: une cada función con su AF habitual.', pairs: [['USART2_TX en PA2', 'AF7'], ['I2C1_SCL en PB6', 'AF4'], ['SPI1_SCK en PA5', 'AF5'], ['TIM3_CH1 en PA6', 'AF2']], c: 'st_af' },
      I('<b>BSRR</b>: los bits 0–15 ponen pines a 1 y los bits 16–31 los ponen a 0, en una sola escritura y sin leer antes. Ninguna interrupción puede colarse en medio.'),
      Q('main hace GPIOB->ODR ^= (1U << 0) y una interrupción cambia PB7 a la vez. ¿Riesgo?', ['Que el cambio de PB7 se pierda si llega entre la lectura y la escritura de ODR', 'Ninguno', 'Que se queme el pin', 'Que PB0 pase a entrada'], 'Con BSRR cada uno toca solo su bit.', { c: 'st_bsrr' }),
      Q('¿Qué hace esta línea?', ['Pone PB3 a 1 y PB4 a 0 a la vez', 'Pone PB3 y PB4 a 1', 'Pone PB3 a 0', 'Configura PB3 y PB4 como salida'], 'Bit 3 = set de PB3; bit 20 = reset de PB4.', { code: 'GPIOB->BSRR = (1U << 3) | (1U << (4 + 16));', c: 'st_bsrr' }),
      Q('Un pin está en modo alternativo como RX de una UART. ¿Puedes leer su nivel en IDR?', ['Sí: el buffer de entrada sigue activo en modo alternativo', 'No, siempre lee 0', 'Solo si es push-pull', 'Solo en la F1'], 'Útil para depurar o detectar actividad.', { c: 'st_gpio' }),
      Q('¿Qué hace el registro LCKR?', ['Bloquea la configuración de un pin hasta el siguiente reset', 'Cifra el puerto', 'Bloquea la Flash', 'Desactiva el reloj del puerto'], 'Protege pines críticos de escrituras accidentales.', { c: 'st_gpio' })
    ]),
    PRJ('st-p4', 'Proyecto: laboratorio de relojes', 'st_mco'),
    PRJ('st-p5', 'Proyecto: cerradura con teclado y display', 'st_keypad')
  ] };

  const NVICP = { pA: { label: 'Prioridad TIM2', val: 5, min: 0, max: 15, step: 1, dec: 0 }, pB: { label: 'Prioridad USART2', val: 8, min: 0, max: 15, step: 1, dec: 0 } };
  const PWMP = (psc, arr, ccr) => ({ F: { label: 'fTIM', val: 84, fixed: true }, PSC: { label: 'PSC', val: psc, list: [0, 1, 3, 7, 15, 41, 83, 99, 167, 839, 999], dec: 0 }, ARR: { label: 'ARR', val: arr, list: [99, 199, 255, 399, 499, 999, 1999, 4095, 9999, 65535], dec: 0 }, CCR: { label: 'CCR', val: ccr, list: [0, 25, 50, 100, 125, 250, 300, 500, 750, 1000, 1500, 2000, 2500, 5000, 7500, 10000], dec: 0 } });

  const M5 = { id: 'st-m5', title: 'Interrupciones y temporizadores', desc: 'NVIC, prioridades, EXTI, SysTick y temporizadores: PWM, captura, encoder y tiempo muerto.', nodes: [
    L('st21', 'Excepciones y el NVIC', 'timer', ['st_irq', 'st_irqsetup'], [
      I('Una <b>excepción</b> hace que el núcleo deje lo que estaba haciendo, guarde su contexto y salte a la función indicada en la tabla de vectores. Las 15 primeras son del sistema (Reset, NMI, HardFault, SVCall, PendSV, SysTick…). A partir de la 16 son las <b>IRQ</b> de los periféricos.'),
      I('Al entrar, el hardware guarda solo en la pila 8 registros: R0–R3, R12, LR, PC y xPSR. Por eso un manejador de interrupción en un Cortex-M es una <b>función normal de C</b>, sin palabras clave especiales. En un M3 o M4 la entrada tarda unos 12 ciclos.'),
      Q('¿Por qué en un Cortex-M no hace falta escribir los manejadores en ensamblador?', ['El hardware guarda los registros que C puede machacar, así que vale una función normal', 'Porque el compilador lo convierte', 'Porque no hay interrupciones', 'Porque la HAL lo hace'], 'Fue una decisión de diseño de ARM para facilitar la vida.', { c: 'st_irq' }),
      { t: 'match', q: 'Une cada excepción con su papel.', pairs: [['Reset', 'Arranque del programa'], ['HardFault', 'Error grave del núcleo'], ['SysTick', 'Temporizador del sistema'], ['PendSV', 'Cambio de contexto del RTOS']], c: 'st_irq' },
      I('Para usar una interrupción de periférico hacen falta cuatro cosas: activarla <b>en el periférico</b> (por ejemplo RXNEIE en USART_CR1), activarla <b>en el NVIC</b>, escribir el manejador con el <b>nombre exacto</b> y, dentro, <b>borrar la bandera</b> que la provocó.'),
      { t: 'order', q: 'Ordena los pasos para una interrupción de recepción por registros.', items: ['Configurar la USART', 'Activar RXNEIE en USART2->CR1', 'Fijar la prioridad y NVIC_EnableIRQ(USART2_IRQn)', 'Escribir USART2_IRQHandler', 'Dentro, leer DR (eso borra RXNE)'], e: 'Si no borras la bandera, la interrupción vuelve a entrar sin fin.', c: 'st_irqsetup' },
      Q('Olvidas borrar la bandera dentro del manejador. ¿Qué pasa?', ['La interrupción vuelve a entrar sin parar y main no avanza', 'Se borra sola siempre', 'Se pierde una interrupción', 'Nada'], 'Algunas banderas se borran leyendo un registro; otras, escribiendo en él.', { c: 'st_irqsetup' }),
      I('Dos optimizaciones del NVIC: <b>encadenamiento</b> (tail-chaining): si al terminar una interrupción hay otra pendiente, salta a ella sin restaurar y volver a guardar el contexto. <b>Llegada tardía</b>: si llega una más urgente mientras se guarda el contexto, se atiende primero esa.'),
      Q('¿Qué ventaja da el encadenamiento de interrupciones?', ['Se ahorra restaurar y volver a guardar el contexto entre dos interrupciones seguidas', 'Permite interrupciones infinitas', 'Cambia las prioridades', 'Desactiva el SysTick'], 'Menos ciclos perdidos cuando hay ráfagas.', { c: 'st_irq' }),
      Q('¿Qué hacen estas dos líneas de la HAL?', ['Fijan prioridad 5 (subprioridad 0) a la USART2 y la activan en el NVIC', 'Activan la USART2', 'Desactivan la interrupción', 'Configuran 5 interrupciones'], 'CubeMX las genera en MX_USART2_UART_Init o en su Msp.', { code: 'HAL_NVIC_SetPriority(USART2_IRQn, 5, 0);\nHAL_NVIC_EnableIRQ(USART2_IRQn);', c: 'st_irqsetup' })
    ]),
    L('st22', 'Prioridades y datos compartidos', 'timer', ['st_nvic', 'st_shared', 'st_isrrules'], [
      I('Los STM32 con M3, M4, M7 o M33 usan <b>4 bits</b> de prioridad: 16 niveles, de 0 (más urgente) a 15. Los M0 y M0+ solo tienen 2 bits: 4 niveles.', { tune: { viz: 'st_nvic', params: NVICP } }),
      TU('Haz que USART2 no tenga que esperar a que acabe TIM2.', 'st_nvic', NVICP, { q: 'latB', min: 0, max: 0.05, text: 'Objetivo: USART2 sin espera', hint: 'USART2 necesita un número de prioridad MENOR que TIM2.' }, 'Con un número menor, USART2 expropia a TIM2.', { c: 'st_nvic' }),
      Q('TIM2 y USART2 tienen ambas prioridad 6. Llega USART2 mientras se atiende TIM2…', ['Espera a que TIM2 termine', 'Interrumpe a TIM2', 'Se pierde', 'Se atiende en paralelo'], 'Con la misma prioridad de expropiación no hay anidamiento.', { c: 'st_nvic' }),
      I('Los 4 bits se reparten entre <b>expropiación</b> y <b>subprioridad</b> según el grupo. La HAL usa por defecto NVIC_PRIORITYGROUP_4: 16 niveles de expropiación y ninguna subprioridad. Con el grupo 2 serían 4 y 4.'),
      Q('Dos interrupciones con expropiación 3 y subprioridades 0 y 1 están pendientes a la vez. ¿Qué pasa?', ['Se atiende primero la de subprioridad 0, y la otra después sin interrumpirla', 'La de subprioridad 0 interrumpe a la otra', 'Se atienden a la vez', 'Se pierde una'], 'La subprioridad solo desempata.', { c: 'st_nvic' }),
      Q('Llamas a HAL_Delay(10) en una interrupción con prioridad 0 y el SysTick tiene prioridad 15. ¿Qué pasa?', ['Se queda colgado: el SysTick nunca puede interrumpir para avanzar el tiempo', 'Espera 10 ms', 'Espera 0 ms', 'Se reinicia'], 'Regla: nada de esperas dentro de interrupciones.', { c: 'st_isrrules' }),
      I('Datos compartidos entre interrupción y main: declara la variable <b>volatile</b> y recuerda que solo son atómicas las lecturas y escrituras de hasta 32 bits alineadas. Un contador++ es leer-sumar-escribir: tres pasos interrumpibles. La solución es una <b>sección crítica</b> corta.'),
      Q('main hace contador++ y una interrupción también. ¿Qué puede pasar?', ['Perder incrementos si la interrupción llega entre la lectura y la escritura de main', 'Nada, ++ es atómico', 'Que contador se vuelva negativo siempre', 'Un error de compilación'], 'Protege el ++ de main con una sección crítica.', { c: 'st_shared' }),
      Q('Una interrupción incrementa un uint64_t y main lo lee. ¿Qué riesgo hay?', ['Leer una mitad antigua y otra nueva: 64 bits son dos accesos', 'Ninguno', 'Que se desborde enseguida', 'Que no compile'], 'Lee con las interrupciones desactivadas o lee dos veces hasta que coincida.', { c: 'st_shared' }),
      Q('¿Por qué guardar PRIMASK en vez de llamar sin más a __enable_irq() al final?', ['Para no activar las interrupciones si ya estaban desactivadas al entrar', 'Porque es más rápido', 'Porque __enable_irq no existe', 'Para cambiar la prioridad'], 'Así la función se puede llamar desde cualquier sitio.', { code: 'uint32_t p = __get_PRIMASK();\n__disable_irq();\n/* sección crítica muy corta */\n__set_PRIMASK(p);', c: 'st_shared' }),
      Q('¿Cuánto debe durar una sección crítica?', ['Lo mínimo posible: mientras dura, ninguna interrupción se atiende', 'Lo que haga falta', 'Al menos 1 ms', 'Toda la función main'], 'Una sección crítica larga añade retardo a todas las interrupciones.', { c: 'st_shared' })
    ]),
    L('st23', 'EXTI: interrupciones por pin', 'chip', ['st_exti', 'st_irqsetup', 'st_halcb', 'st_rccen', 'st_debounce', 'st_power'], [
      I('El <b>EXTI</b> genera interrupciones por flancos en los pines. Tiene 16 líneas para GPIO, una por <b>número</b> de pin: PA0, PB0 y PC0 comparten la línea 0. En la F4 eliges qué puerto va a cada línea con <b>SYSCFG->EXTICR</b> (en la F1, con AFIO).'),
      Q('¿Puedes tener interrupciones independientes en PA3 y PB3 a la vez?', ['No: ambos usan la línea EXTI3 y solo uno puede estar conectado', 'Sí, sin problema', 'Solo con la HAL', 'Solo si uno es de subida y otro de bajada'], 'Al asignar pines, reparte los números.', { c: 'st_exti' }),
      I('Las líneas 0 a 4 tienen cada una su manejador. Las 5–9 comparten <b>EXTI9_5_IRQHandler</b> y las 10–15 comparten <b>EXTI15_10_IRQHandler</b>: dentro hay que mirar qué línea saltó.'),
      { t: 'match', q: 'Une cada pin con su manejador.', pairs: [['PA0', 'EXTI0_IRQHandler'], ['PB4', 'EXTI4_IRQHandler'], ['PC7', 'EXTI9_5_IRQHandler'], ['PC13', 'EXTI15_10_IRQHandler']], c: 'st_exti' },
      I('Con la HAL, configuras el pin como “GPIO_EXTI” con el flanco deseado, activas la línea en la pestaña NVIC y escribes el callback. La HAL borra la bandera por ti.', { code: 'void HAL_GPIO_EXTI_Callback(uint16_t pin) {\n  if (pin == GPIO_PIN_13) {\n    pulsado = 1;   // volatile\n  }\n}' }),
      Q('¿Por qué el callback comprueba qué pin es?', ['Porque es el mismo callback para todas las líneas EXTI', 'Por estilo', 'Porque la HAL lo exige al compilar', 'Para borrar la bandera'], 'Una sola función recibe todos los avisos.', { c: 'st_halcb' }),
      Q('Configuras EXTICR por registros y no funciona. ¿Qué reloj olvidaste?', ['El de SYSCFG, en RCC->APB2ENR', 'El de GPIOA', 'El del EXTI', 'El del SysTick'], 'Sin reloj, la escritura en SYSCFG->EXTICR no tiene efecto. La HAL lo activa en HAL_MspInit.', { c: 'st_rccen' }),
      Q('Un pulsador con EXTI dispara 5 interrupciones por pulsación. ¿Solución?', ['Ignorar nuevas interrupciones durante unos 20 ms tras la primera, o filtrar con RC', 'Subir la prioridad', 'Usar flanco de bajada', 'Quitar la pull-up'], 'Son los rebotes del contacto.', { c: 'st_debounce' }),
      Q('¿Cómo se borra la bandera pendiente de la línea 13 en la F4 por registros?', ['Escribiendo un 1 en el bit 13 de EXTI->PR', 'Escribiendo un 0 en el bit 13 de EXTI->PR', 'Leyendo GPIOC->IDR', 'Se borra sola'], 'Bandera de tipo “escribe 1 para borrar”.', { c: 'st_irqsetup' }),
      Q('¿Puede una línea EXTI despertar al chip del modo Stop?', ['Sí: es una de las formas típicas de despertarlo', 'No, nunca', 'Solo en Standby', 'Solo la línea 0'], 'Un pulsador puede sacar al chip de Stop.', { c: 'st_power' })
    ]),
    L('st24', 'SysTick, HAL_Delay y el tiempo', 'timer', ['st_tick', 'st_systick', 'st_cycles'], [
      I('El <b>SysTick</b> es un temporizador de 24 bits del propio núcleo que cuenta hacia abajo desde LOAD y genera una excepción al llegar a cero. SysTick_Config(n) lo programa para interrumpir cada n ciclos.'),
      G('st_systick'),
      Nm('Con 24 bits a 100 MHz, ¿cuál es el periodo máximo del SysTick en ms?', 167.77, 'ms', '2²⁴ / 100 MHz = 16 777 216 / 100 000 000 ≈ 0,168 s.', { tol: 0.2, c: 'st_systick' }),
      I('HAL_Init programa el SysTick a 1 ms. Cada interrupción llama a HAL_IncTick, que suma 1 a un contador; <b>HAL_GetTick()</b> lo devuelve. <b>HAL_Delay(n)</b> espera al menos n ms: añade un tick extra para garantizar el mínimo.'),
      Q('¿Por qué HAL_Delay(1) puede durar casi 2 ms?', ['Empieza en un punto cualquiera del ms actual y añade un tick para garantizar el mínimo', 'Porque la HAL es lenta', 'Porque el SysTick va a 500 Hz', 'Por un error de la F4'], 'Para esperas cortas y precisas, usa un temporizador o el contador de ciclos.', { c: 'st_tick' }),
      Q('¿Funciona esta comparación cuando HAL_GetTick() desborda y vuelve a 0?', ['Sí: la resta sin signo da el tiempo transcurrido correcto', 'No, falla en el desbordamiento', 'Solo los primeros 49 días', 'Solo con int'], 'La aritmética de uint32_t es módulo 2³².', { code: 'if (HAL_GetTick() - t0 >= 500) {\n  t0 = HAL_GetTick();\n  /* cada 500 ms */\n}', c: 'st_tick' }),
      Nm('Un contador de ms de 32 bits, ¿cuántos días tarda en desbordar?', 49.71, 'días', '2³² ms / 1000 / 86 400 ≈ 49,7 días.', { tol: 0.1, c: 'st_tick' }),
      Q('¿Qué tiene de malo esta versión?', ['Al desbordar, t0 + 500 da la vuelta y la condición se cumple antes de tiempo o se rompe', 'Nada', 'Es más lenta', 'No compila'], 'Compara siempre diferencias, no instantes.', { code: 'if (HAL_GetTick() >= t0 + 500) {\n  ...\n}', c: 'st_tick' }),
      Q('Necesitas esperas de 5 µs. ¿Qué usas?', ['Un temporizador hardware o el contador de ciclos DWT', 'HAL_Delay(0,005)', 'SysTick a 1 ms', 'printf'], 'El SysTick de la HAL tiene resolución de 1 ms.', { c: 'st_cycles' })
    ]),
    L('st25', 'Temporizadores: PSC y ARR', 'timer', ['st_timer', 'st_halcb'], [
      I('Tipos de temporizador en la F4: <b>avanzados</b> (TIM1, y TIM8 en los modelos que lo tienen), <b>de uso general</b> (TIM2–TIM5; TIM2 y TIM5 son de 32 bits), TIM9–TIM11 más sencillos y, en algunos modelos, <b>básicos</b> (TIM6 y TIM7, para disparar el DAC).'),
      I('El preescalador divide entre <b>PSC + 1</b> y el contador va de 0 a ARR (<b>ARR + 1</b> pasos):\n<b>f = fTIM / ((PSC + 1) · (ARR + 1))</b>', { tune: { viz: 'st_pwm', params: PWMP(83, 999, 500) } }),
      TU('Con fTIM = 84 MHz, consigue una frecuencia de exactamente 1 kHz.', 'st_pwm', PWMP(0, 99, 50), { q: 'f', min: 999, max: 1001, text: 'Objetivo: 1 kHz', hint: '84 MHz ÷ 84 = 1 MHz; luego 1000 pasos.' }, 'PSC = 83 y ARR = 999, o PSC = 41 y ARR = 1999.', { c: 'st_timer' }),
      G('st_pwmFreq'), G('st_pwmFreq'), G('st_pscArr'),
      Q('¿Qué hace esta pareja de llamadas y callback?', ['Arranca TIM6 con interrupción y ejecuta el callback en cada desbordamiento', 'Genera PWM', 'Mide una frecuencia', 'Hace un retardo bloqueante'], 'La interrupción de actualización.', { code: 'HAL_TIM_Base_Start_IT(&htim6);\n\nvoid HAL_TIM_PeriodElapsedCallback(\n    TIM_HandleTypeDef *htim) {\n  if (htim->Instance == TIM6) tarea();\n}', c: 'st_halcb' }),
      Q('¿Por qué se comprueba htim->Instance en el callback?', ['El mismo callback lo llaman todos los temporizadores', 'Para borrar la bandera', 'Para cambiar ARR', 'No hace falta'], 'Con FreeRTOS, la base de tiempo de la HAL también lo usa.', { c: 'st_halcb' }),
      I('Con <b>ARPE</b> (precarga de ARR) activado, un ARR nuevo se aplica en el siguiente evento de actualización, no a mitad de periodo: así no hay periodos raros al cambiar la frecuencia en marcha.'),
      Nm('TIM2 (32 bits) a 100 MHz con PSC = 0 y ARR = 0xFFFFFFFF. ¿Segundos hasta desbordar?', 42.95, 's', '2³² / 100 MHz ≈ 42,9 s. Ideal para medir tiempos largos con resolución de 10 ns.', { tol: 0.1, c: 'st_timer' })
    ]),
    L('st26', 'PWM, captura y encoder', 'wave', ['st_duty', 'st_capture'], [
      I('Cada temporizador tiene hasta 4 canales. En PWM modo 1 la salida está activa mientras CNT &lt; CCR. Arrancas con HAL_TIM_PWM_Start y cambias el ciclo de trabajo con __HAL_TIM_SET_COMPARE.'),
      TU('Con ARR = 999, pon el ciclo de trabajo al 25 %.', 'st_pwm', PWMP(83, 999, 750), { q: 'duty', min: 24.9, max: 25.1, text: 'Objetivo: 25 %', hint: '25 % de 1000 pasos.' }, 'CCR = 250.', { c: 'st_duty' }),
      G('st_duty'), G('st_duty'),
      Q('ARR = 999. ¿Qué ciclo de trabajo da esta línea?', ['30 %', '0,3 %', '3 %', '33 %'], '300 / (999 + 1).', { code: '__HAL_TIM_SET_COMPARE(&htim3,\n  TIM_CHANNEL_1, 300);', c: 'st_duty' }),
      I('<b>Captura de entrada</b>: en el flanco elegido, el temporizador copia CNT en CCR. Restando dos capturas tienes el periodo en ticks. El modo <b>PWM input</b> usa dos canales para medir a la vez periodo y tiempo en alto.'),
      Nm('Con ticks de 1 MHz, dos capturas seguidas difieren en 25 000. ¿Frecuencia en Hz?', 40, 'Hz', 'Periodo = 25 000 µs = 25 ms → 40 Hz.', { c: 'st_capture' }),
      I('<b>Modo encoder</b>: los canales 1 y 2 reciben las señales A y B en cuadratura; el contador sube o baja según el sentido. Contando todos los flancos de ambas señales tienes 4 cuentas por pulso.'),
      Nm('Encoder de 11 pulsos por vuelta del motor, reductora 30:1, modo ×4. ¿Cuentas por vuelta del eje de salida?', 1320, '', '11 × 4 × 30 = 1320.', { c: 'st_capture' }),
      Q('¿Para qué sirve el modo de un solo pulso (one-pulse)?', ['Para generar un único pulso de duración precisa tras un disparo', 'Para contar pulsos', 'Para bajar el consumo', 'Para medir frecuencia'], 'El contador se detiene solo tras un periodo.', { c: 'st_capture' }),
      Nm('Servo a 50 Hz con ticks de 1 µs (ARR = 19 999). ¿Qué CCR da un pulso de 1,5 ms?', 1500, '', '1,5 ms = 1500 ticks de 1 µs: posición central.', { c: 'st_duty' })
    ]),
    L('st27', 'Temporizadores avanzados y tiempo muerto', 'timer', ['st_deadtime', 'st_advtim', 'st_timer'], [
      I('TIM1 (y TIM8) añaden <b>salidas complementarias</b> (CH1 y CH1N), <b>tiempo muerto</b> programable, entrada de <b>freno</b> (break) y contador de repetición. Están pensados para puentes de potencia: motores, inversores, convertidores.'),
      Q('¿Por qué un medio puente necesita salidas complementarias?', ['Un transistor conduce cuando el otro está apagado, y viceversa', 'Para duplicar la frecuencia', 'Para medir corriente', 'Para ahorrar pines'], 'Arriba y abajo nunca deben conducir a la vez.', { c: 'st_deadtime' }),
      I('Los transistores tardan en apagarse. Si uno se enciende antes de que el otro se haya apagado, la alimentación queda en cortocircuito a través de ambos (<b>shoot-through</b>). El <b>tiempo muerto</b> mantiene los dos apagados un instante en cada cambio.'),
      Q('¿Qué provoca el shoot-through?', ['Picos de corriente enormes que calientan y pueden destruir los transistores', 'Que el motor gire al revés', 'Ruido en el audio', 'Nada grave'], 'Se evita con tiempo muerto y con drivers con protección.', { c: 'st_deadtime' }),
      I('En BDTR, si el bit 7 de DTG es 0, el tiempo muerto es <b>DTG × tDTS</b>. Con el reloj del temporizador a 100 MHz (y CKD = 1), cada paso son 10 ns, hasta 127 pasos.'),
      Nm('Reloj de temporizador a 100 MHz, CKD = 1. ¿Qué DTG da 500 ns de tiempo muerto?', 50, '', '500 ns / 10 ns = 50.', { c: 'st_deadtime' }),
      Q('Configuras TIM1 en PWM por registros y no sale nada por el pin. ¿Qué bit falta casi seguro?', ['MOE en TIM1->BDTR', 'ARPE', 'UIF', 'CEN de TIM2'], 'Las salidas de los temporizadores avanzados están desactivadas hasta activar MOE. HAL_TIM_PWM_Start lo hace por ti.', { c: 'st_advtim' }),
      Q('¿Para qué sirve la entrada de freno (BKIN)?', ['Para llevar las salidas a un estado seguro por hardware, sin esperar a la CPU', 'Para frenar el motor con software', 'Para medir la velocidad', 'Para ahorrar energía'], 'Un comparador de sobrecorriente puede cortar en nanosegundos.', { c: 'st_advtim' }),
      I('En <b>modo centrado</b>, el contador sube hasta ARR y baja hasta 0. La frecuencia es la mitad que en modo normal y el PWM queda simétrico, lo que facilita medir la corriente del motor justo en el centro del pulso.'),
      Nm('Modo centrado a 100 MHz, PSC = 0, ARR = 1000. ¿Frecuencia en kHz?', 50, 'kHz', 'Una subida y una bajada: 100 MHz / (2 × 1000) = 50 kHz.', { c: 'st_timer' }),
      Q('Vas a probar tu primer puente de potencia. ¿Cómo lo alimentas?', ['Con una fuente de laboratorio con límite de corriente bajo y a tensión reducida', 'Directo a una batería de coche', 'A la red con un transformador', 'Sin carga a máxima tensión'], 'Si algo está mal, el límite de corriente salva los transistores (y a ti).', { c: 'st_deadtime' })
    ]),
    PRJ('st-p6', 'Proyecto: motor con encoder y PID', 'st_motor'),
    PRJ('st-p7', 'Proyecto: frecuencímetro de banco', 'st_freq')
  ] };

  const DMAP = (fs, n, t) => ({ fs: { label: 'Muestreo', val: fs, list: [8, 16, 44.1, 48], unit: 'kHz', dec: 1 }, N: { label: 'Búfer', val: n, list: [64, 128, 256, 512, 1024, 2048], unit: 'muestras', dec: 0 }, T: { label: 'Proceso por mitad', val: t, min: 0.5, max: 20, step: 0.5, unit: 'ms', dec: 1 } });
  const ADCP = (pre, smp, r, fixR) => ({ pre: { label: 'Preescalador ADC ÷', val: pre, list: [2, 4, 6, 8], dec: 0 }, smp: { label: 'Ciclos de muestreo', val: smp, list: [3, 15, 28, 56, 84, 112, 144, 480], dec: 0 }, R: fixR ? { label: 'R fuente', val: r, fixed: true } : { label: 'R de la fuente', val: r, list: [0.1, 1, 4.7, 10, 22, 47, 100], unit: 'kΩ', dec: 1 } });

  const M6 = { id: 'st-m6', title: 'DMA y periféricos de datos', desc: 'DMA, ADC con escaneo, DAC, UART con IDLE, I²C, SPI, CAN y USB.', nodes: [
    L('st28', 'DMA: mover datos sin la CPU', 'bus', ['st_dma', 'st_dmacfg'], [
      I('El <b>DMA</b> copia datos entre periféricos y memoria mientras la CPU hace otra cosa. Le das origen, destino, número de datos y su tamaño, y te avisa con una interrupción a mitad (<b>HT</b>), al terminar (<b>TC</b>) o si hay error (<b>TE</b>).'),
      I('En la F4 hay dos controladores (DMA1 y DMA2) con 8 <b>flujos</b> (streams) cada uno, y cada flujo elige entre 8 <b>canales</b> de petición según una tabla fija del manual. Solo el DMA2 hace copias de memoria a memoria. En G0, G4 y H7 hay un <b>DMAMUX</b> que conecta cualquier petición a cualquier canal.'),
      Q('En una F4 quieres copiar un búfer de RAM a otro con DMA. ¿Qué controlador usas?', ['DMA2', 'DMA1', 'Cualquiera', 'Ninguno: no se puede'], 'El DMA1 de la F4 no admite memoria a memoria.', { c: 'st_dmacfg' }),
      I('Parámetros clave: <b>dirección</b> (periférico→memoria, memoria→periférico, memoria→memoria), <b>tamaño</b> (byte, media palabra, palabra), <b>incremento</b> de cada lado y <b>modo</b> normal o circular.'),
      Q('ADC de 12 bits a un búfer uint16_t. ¿Configuración típica?', ['Media palabra en ambos lados, incrementar memoria sí, periférico no', 'Byte en ambos lados', 'Incrementar el periférico', 'Palabra y sin incrementos'], 'El registro de datos del ADC es siempre el mismo; el búfer avanza.', { c: 'st_dmacfg' }),
      I('Juega con el búfer circular: la CPU procesa una mitad mientras el DMA llena la otra.', { tune: { viz: 'st_dma', params: DMAP(16, 512, 4) } }),
      TU('A 48 kHz, tardas 3 ms en procesar cada mitad. Elige un búfer para que la CPU no pase del 80 % de carga.', 'st_dma', DMAP(48, 64, 3), { q: 'load', min: 0, max: 80, text: 'Objetivo: carga de CPU ≤ 80 %', hint: 'Media vuelta debe durar más de 3,75 ms: al menos 360 muestras por mitad.' }, 'Con 512 muestras cada mitad dura 5,3 ms (56 % de carga); con 1024, 10,7 ms (28 %).', { c: 'st_dma' }),
      G('st_dmaHalf'), G('st_dmaHalf'),
      Q('¿Qué pasa si procesas la mitad que el DMA está escribiendo en ese momento?', ['Mezclas datos nuevos y viejos: resultados corruptos', 'Nada', 'El DMA se detiene', 'HardFault seguro'], 'Procesa la mitad HT tras HT y la otra tras TC.', { c: 'st_dma' }),
      Q('¿Qué calcula esta línea con un DMA circular de N datos?', ['La posición actual de escritura del DMA en el búfer', 'Los datos que faltan por procesar en total', 'El tamaño del búfer', 'El número de interrupciones'], 'NDTR cuenta hacia atrás lo que falta en esta vuelta.', { code: 'uint16_t pos = N -\n  __HAL_DMA_GET_COUNTER(&hdma_usart2_rx);', c: 'st_dma' })
    ]),
    L('st29', 'ADC multicanal con escaneo y DMA', 'gauge', ['st_adc', 'st_adcscan', 'st_adcacc', 'st_wavegen'], [
      I('El ADC de la F4 es de aproximaciones sucesivas, 12 bits, con hasta 16 canales externos y canales internos (sensor de temperatura, VREFINT y VBAT). Su reloj es PCLK2 ÷ 2, 4, 6 u 8 y no debe pasar de <b>36 MHz</b>.'),
      I('<b>tconv = (ciclos de muestreo + 12) / fADC</b> a 12 bits. El tiempo de muestreo debe bastar para cargar el condensador interno a través de la resistencia de tu fuente.', { tune: { viz: 'st_adc', params: ADCP(4, 3, 10) } }),
      G('st_adcTime'), G('st_adcTime'),
      TU('Fuente de 47 kΩ, PCLK2 = 84 MHz: consigue la máxima velocidad con error de carga menor de 0,5 LSB.', 'st_adc', ADCP(4, 3, 47, true), { q: 'fsOk', min: 0.34, max: 2, text: 'Objetivo: más de 340 kS/s sin error de carga', hint: 'Prueba preescaladores mayores con tiempos de muestreo intermedios.' }, 'Con ÷6 (14 MHz) y 28 ciclos: 2 µs de muestreo y unos 350 kS/s.', { c: 'st_adc' }),
      I('<b>Modo escaneo</b>: el ADC convierte una lista de canales (rangos) en orden. Con modo continuo y <b>DMA circular</b>, el búfer se llena intercalado: canal 1, canal 2, canal 3, canal 1, canal 2…'),
      Q('Escaneas 3 canales con DMA circular. ¿En qué posición está la muestra k del segundo canal?', ['buf[3·k + 1]', 'buf[k + 1]', 'buf[2·k]', 'buf[3·k + 2]'], 'Cada vuelta ocupa 3 posiciones; el segundo canal es el índice 1.', { c: 'st_adcscan' }),
      Nm('4 canales y 100 muestras de cada uno. ¿Longitud del búfer?', 400, 'muestras', '4 × 100 intercaladas.', { c: 'st_adcscan' }),
      I('Para muestrear a un ritmo exacto (audio, FFT, control) no uses el modo continuo: dispara cada conversión con el evento <b>TRGO</b> de un temporizador.'),
      Q('¿Por qué disparar el ADC con un temporizador para una FFT?', ['La FFT supone muestras equiespaciadas; el temporizador da un ritmo exacto', 'Para gastar menos', 'Porque el ADC no tiene modo continuo', 'Para tener más bits'], 'Un muestreo irregular ensucia el espectro.', { c: 'st_wavegen' }),
      Q('¿Qué familia necesita llamar a HAL_ADCEx_Calibration_Start antes de medir?', ['L4 y G4, entre otras; la F4 no tiene autocalibración', 'Solo la F4', 'Ninguna', 'Todas por igual'], 'Depende de la familia: mira el manual.', { c: 'st_adcacc' }),
      Q('Tu equipo va con batería y VDDA baja con el tiempo. ¿Cómo mides tensiones absolutas?', ['Midiendo también VREFINT para calcular el VDDA real', 'Suponiendo siempre 3,3 V', 'Con más bits', 'Con un tiempo de muestreo mayor'], 'VREFINT es una referencia interna estable; su valor de fábrica está calibrado en el chip.', { c: 'st_adcacc' })
    ]),
    PRJ('st-p8', 'Proyecto: analizador de espectro de audio', 'st_spectrum'),
    L('st30', 'DAC y generación de señales', 'wave', ['st_dac', 'st_wavegen', 'st_family'], [
      I('El <b>DAC</b> convierte un número en tensión: 12 bits, 0–4095 entre 0 y VREF+. La F446 y la F407 tienen dos canales (PA4 y PA5); la G4 tiene varios. <b>La F401 y la F411 no tienen DAC.</b>'),
      Q('Quieres generar audio analógico con una Black Pill F411. ¿Qué haces?', ['Usar PWM filtrado o un DAC externo (por ejemplo I²S), porque no tiene DAC', 'Usar su DAC en PA4', 'Usar el ADC al revés', 'No se puede de ninguna forma'], 'Lee siempre la lista de periféricos del chip concreto.', { c: 'st_family' }),
      Nm('DAC de 12 bits con VREF+ = 3,3 V. ¿Tensión con el valor 2048?', 1.65, 'V', '2048 / 4095 × 3,3 ≈ 1,65 V.', { tol: 0.01, c: 'st_dac' }),
      I('El <b>buffer de salida</b> interno reduce la impedancia de salida para poder cargar algo, pero no llega exactamente a 0 V ni a VREF+. Sin buffer la salida llega a los extremos, pero solo puede alimentar entradas de alta impedancia.'),
      Q('Sin buffer interno, ¿qué necesitas para cargar la salida del DAC con unos auriculares?', ['Un operacional como seguidor o amplificador', 'Nada', 'Una resistencia en serie', 'Un condensador a masa'], 'La salida sin buffer tiene una impedancia alta.', { c: 'st_dac' }),
      I('Para generar una forma de onda: una tabla de N muestras, un temporizador que dispara el DAC con TRGO y el DMA en modo circular. <b>f_salida = f_disparo / N</b>.'),
      Nm('TIM6 dispara a 1 MHz y la tabla tiene 100 muestras. ¿Frecuencia de salida en kHz?', 10, 'kHz', '1 MHz / 100 = 10 kHz.', { c: 'st_wavegen' }),
      Q('¿Cómo duplicas la frecuencia sin cambiar el temporizador?', ['Usando una tabla con la mitad de muestras', 'Duplicando la amplitud', 'Cambiando a 8 bits', 'Activando el buffer'], 'Mismo ritmo de muestras, menos muestras por ciclo.', { c: 'st_wavegen' }),
      Q('¿Por qué la tabla suma 2048?', ['El DAC solo da tensiones positivas: el seno se centra a mitad de escala', 'Por la resolución', 'Para que suene más fuerte', 'Por el buffer'], 'El seno oscila entre 1 y 4095 alrededor de 2048.', { code: 'tabla[i] = 2048 + 2047 *\n  sinf(6.2831853f * i / N);', c: 'st_dac' }),
      Q('¿Qué ventaja tiene la síntesis DDS (acumulador de fase) frente a cambiar el temporizador?', ['Resolución de frecuencia muy fina y cambios sin cortes', 'Más bits de resolución', 'Menos memoria siempre', 'No necesita DAC'], 'La frecuencia depende del incremento de fase, que puede ser cualquiera.', { c: 'st_wavegen' })
    ]),
    PRJ('st-p9', 'Proyecto: generador de funciones', 'st_funcgen'),
    PRJ('st-p10', 'Proyecto: tira LED con PWM y DMA', 'st_ws2812'),
    L('st31', 'UART a fondo: BRR, DMA e IDLE', 'bus', ['st_uartrx', 'st_brr', 'st_uarttime', 'st_dma', 'st_rs485'], [
      I('Una trama 8N1 tiene 10 bits: inicio, 8 de datos y parada. La velocidad sale de <b>BRR = fPCLK / baudios</b> (sobremuestreo ×16), y el redondeo produce un pequeño error que debe quedar por debajo de un 2 %.'),
      G('st_brr'), G('st_baudErr'),
      Nm('A 115 200 baudios en 8N1, ¿cuántos bytes por segundo como máximo?', 11520, 'B/s', '115 200 / 10 bits por byte.', { c: 'st_uarttime' }),
      I('El problema de recibir: no sabes cuántos bytes llegarán. Opciones:\n· Una interrupción por byte (muchas interrupciones).\n· DMA de longitud fija (espera para siempre si llegan menos).\n· <b>DMA + línea ociosa (IDLE)</b>: avisa cuando la línea lleva un carácter de tiempo en silencio.'),
      Q('Un GPS envía frases NMEA de longitud variable. ¿Qué método eliges?', ['DMA con detección de línea ociosa', 'DMA de longitud fija', 'HAL_UART_Receive bloqueante', 'Sondeo en el bucle'], 'Una interrupción por frase, sin tocar cada byte.', { c: 'st_uartrx' }),
      I('Con la HAL moderna: HAL_UARTEx_ReceiveToIdle_DMA arranca la recepción y HAL_UARTEx_RxEventCallback te dice cuántos bytes hay cuando la línea queda ociosa (o el búfer se llena).', { code: 'HAL_UARTEx_ReceiveToIdle_DMA(&huart2,\n  rx, sizeof rx);\n\nvoid HAL_UARTEx_RxEventCallback(\n    UART_HandleTypeDef *h, uint16_t n) {\n  procesar(rx, n);\n  HAL_UARTEx_ReceiveToIdle_DMA(h,\n    rx, sizeof rx);\n}' }),
      Q('En HAL_UARTEx_RxEventCallback, ¿qué es el parámetro de tamaño en modo normal?', ['Cuántos bytes se han recibido en el búfer', 'El tamaño máximo del búfer', 'La velocidad en baudios', 'El número de errores'], 'En modo circular es la posición dentro del búfer.', { c: 'st_uartrx' }),
      Q('El callback salta también a mitad de búfer y no lo quieres. ¿Qué haces?', ['Desactivar la interrupción de media transferencia del DMA', 'Cambiar la velocidad', 'Usar un búfer más pequeño', 'Desactivar el DMA'], '__HAL_DMA_DISABLE_IT(h->hdmarx, DMA_IT_HT) tras arrancar la recepción.', { c: 'st_dma' }),
      Q('Aparece un error de desbordamiento (ORE) y la recepción se detiene. ¿Qué significa?', ['Llegó un byte antes de leer el anterior: hay que gestionar el error y relanzar la recepción', 'El cable está roto', 'La velocidad es demasiado baja', 'El búfer es demasiado grande'], 'Implementa HAL_UART_ErrorCallback.', { c: 'st_uartrx' }),
      Q('RS-485 necesita activar el transmisor solo al enviar (pin DE). ¿Cómo lo haces en una F4?', ['Con un GPIO que pones a 1 antes de enviar y a 0 al terminar el último byte', 'La USART de la F4 lo hace sola', 'No se puede', 'Con el pin RX'], 'Algunas familias (G0, G4, L4…) tienen control DE por hardware; la F4 no.', { c: 'st_rs485' })
    ]),
    L('st32', 'I²C y SPI con la HAL', 'bus', ['st_i2c', 'st_spi', 'st_dmacfg', 'st_bus'], [
      I('<b>I²C</b>: dos hilos (SDA y SCL) en open-drain con pull-ups y direcciones de 7 bits. Las funciones de la HAL esperan la dirección <b>desplazada un bit a la izquierda</b>. HAL_I2C_Mem_Read lee registros de un sensor en una sola llamada.'),
      Q('Tu sensor está en la dirección 0x68. ¿Qué pasas a la HAL?', ['0x68 << 1 (0xD0)', '0x68', '0x34', '0x69'], 'La HAL coloca el bit de lectura o escritura.', { c: 'st_i2c' }),
      Q('¿Qué hace esta llamada?', ['Lee 1 byte del registro 0x75 del dispositivo 0x68', 'Escribe 0x75 en el dispositivo', 'Lee 0x75 bytes', 'Cambia la dirección del sensor'], 'En una MPU-6050, el registro 0x75 (WHO_AM_I) devuelve 0x68.', { code: 'uint8_t id;\nHAL_I2C_Mem_Read(&hi2c1, 0x68 << 1,\n  0x75, I2C_MEMADD_SIZE_8BIT,\n  &id, 1, 100);', c: 'st_i2c' }),
      I('Diagnóstico I²C: un escáner con HAL_I2C_IsDeviceReady recorre las 127 direcciones. Si un esclavo se queda bloqueado con SDA a 0 (por un reset a mitad de transferencia), se recupera enviando 9 pulsos de SCL a mano.'),
      Q('¿Qué hace este bucle?', ['Busca qué direcciones I²C contestan', 'Envía datos a todos los dispositivos', 'Configura las direcciones', 'Resetea el bus'], 'El primer paso al conectar algo nuevo.', { code: 'for (uint8_t a = 1; a < 128; a++)\n  if (HAL_I2C_IsDeviceReady(&hi2c1,\n      a << 1, 2, 5) == HAL_OK)\n    printf("0x%02X\\n", a);', c: 'st_i2c' }),
      I('<b>SPI</b>: el maestro genera SCK y transmite y recibe a la vez por MOSI y MISO. Hay 4 modos según CPOL y CPHA. El CS se suele manejar con un GPIO. La velocidad es PCLK ÷ 2, 4… 256.'),
      Nm('SPI1 (en APB2 a 100 MHz) con preescalador ÷4. ¿SCK en MHz?', 25, 'MHz', '100 / 4 = 25 MHz.', { c: 'st_spi' }),
      Q('Lees un chip SPI y los datos salen desplazados un bit. ¿Primera sospecha?', ['Modo SPI (CPOL/CPHA) distinto del que pide el chip', 'Dirección I²C', 'Falta pull-up', 'Velocidad del ADC'], 'Mira el diagrama de tiempos de su hoja de datos.', { c: 'st_spi' }),
      Q('Para leer 2 bytes de un SPI esclavo, ¿qué hace el maestro?', ['Enviar 2 bytes (aunque sean de relleno) mientras recibe', 'Solo escuchar', 'Enviar un pulso de reset', 'Bajar SCK'], 'Cada bit recibido necesita un pulso de reloj que genera el maestro.', { c: 'st_spi' }),
      Q('¿Cuándo merece la pena SPI con DMA?', ['Con bloques grandes, como píxeles de una pantalla o sectores de una SD', 'Para enviar un byte suelto', 'Nunca', 'Solo con I²C'], 'Con un byte suelto, configurar el DMA cuesta más que enviarlo.', { c: 'st_dmacfg' }),
      { t: 'match', q: 'Une cada bus con su rasgo.', pairs: [['I²C', 'Direcciones y open-drain'], ['SPI', 'Full-duplex con chip select'], ['UART', 'Asíncrono, sin reloj'], ['CAN', 'Diferencial con arbitraje por ID']], c: 'st_bus' }
    ]),
    PRJ('st-p11', 'Proyecto: registrador de datos en microSD', 'st_logger'),
    L('st33', 'CAN y USB', 'bus', ['st_can', 'st_canbit', 'st_usbcdc', 'st_usbclk', 'st_family'], [
      I('<b>CAN</b> es un bus diferencial (CANH y CANL) multimaestro y muy robusto. Necesita un <b>transceptor</b> externo y una resistencia de <b>120 Ω en cada extremo</b>. Los STM32 tienen bxCAN (F1, F4) o FDCAN (G4, H7 y algunos G0).'),
      Q('Dos nodos empiezan a transmitir a la vez. ¿Quién gana?', ['El de identificador más bajo, sin que se pierda nada', 'El que tenga más datos', 'Ninguno: se repiten los dos', 'El más cercano'], 'Un 0 (dominante) gana sobre un 1 en el bus: arbitraje bit a bit.', { c: 'st_can' }),
      Q('Con el bus apagado mides 60 Ω entre CANH y CANL. ¿Qué indica?', ['Que hay dos terminaciones de 120 Ω, como debe ser', 'Que falta una terminación', 'Un cortocircuito', 'Que el bus está roto'], '120 Ω ∥ 120 Ω = 60 Ω.', { c: 'st_can' }),
      G('st_canBit'), G('st_canBit'),
      Q('¿Para qué sirven los filtros de CAN por hardware?', ['Para que el controlador descarte las tramas que no te interesan sin usar la CPU', 'Para quitar ruido eléctrico', 'Para cifrar', 'Para cambiar la velocidad'], 'En un coche hay miles de tramas por segundo.', { c: 'st_can' }),
      Q('En la F103 (Blue Pill), ¿puedes usar CAN y USB a la vez?', ['No: comparten una memoria interna y son excluyentes', 'Sí, sin problema', 'Solo a 125 kbit/s', 'Solo con DMA'], 'Una limitación conocida de esa familia.', { c: 'st_family' }),
      I('<b>USB dispositivo</b> de velocidad completa (12 Mbit/s) en PA11/PA12. Con el middleware USB_DEVICE y la clase <b>CDC</b>, el STM32 aparece como un puerto serie virtual: CDC_Transmit_FS envía y CDC_Receive_FS (en usbd_cdc_if.c) recibe.'),
      Q('¿Qué exige el USB al árbol de relojes?', ['Exactamente 48 MHz y precisos para el periférico USB', 'Nada', 'Que SYSCLK sea 48 MHz', 'El LSE'], 'Por eso se busca un VCO múltiplo de 48.', { c: 'st_usbclk' }),
      Q('CDC_Transmit_FS devuelve USBD_BUSY. ¿Qué significa?', ['La transferencia anterior aún no ha terminado: espera y reintenta', 'El cable está roto', 'El PC no tiene drivers', 'Error de la Flash'], 'No llames a CDC_Transmit_FS desde una interrupción en bucle.', { c: 'st_usbcdc' }),
      Q('En un puerto serie virtual USB CDC, ¿importa la velocidad en baudios que elijas en el PC?', ['No: los datos van a la velocidad del USB', 'Sí, debe ser 115 200', 'Sí, debe coincidir con la UART', 'Solo en Linux'], 'El valor llega al STM32, pero no afecta a la transferencia.', { c: 'st_usbcdc' }),
      Q('Quieres conectar tu nodo CAN al conector OBD-II del coche. ¿Precaución principal?', ['Escuchar en modo silencioso y no enviar tramas al bus del vehículo sin saber exactamente qué hacen', 'Ninguna', 'Hacerlo en marcha para ver más datos', 'Quitar la terminación del coche'], 'Una trama errónea puede afectar a centralitas de seguridad.', { c: 'st_can' })
    ]),
    PRJ('st-p12', 'Proyecto: bus CAN de banco y puente SLCAN', 'st_can')
  ] };

  const M7 = { id: 'st-m7', title: 'FreeRTOS en STM32', desc: 'Tareas, pilas, colas, semáforos, mutex, temporizadores software y la base de tiempo de la HAL.', nodes: [
    L('st34', 'Por qué un sistema operativo de tiempo real', 'cloud', ['st_rtos', 'st_nvic'], [
      I('Un “superbucle” (while(1) que lo hace todo) funciona hasta que tienes muchas cosas con plazos distintos: leer un sensor cada 2 ms, refrescar una pantalla, atender la UART… Cada función lenta retrasa a todas las demás.'),
      I('Con <b>FreeRTOS</b> cada trabajo es una <b>tarea</b> con su bucle y su pila. El <b>planificador</b> ejecuta siempre la tarea lista de mayor prioridad y, con cada tick (normalmente 1 ms), decide si hay que cambiar. En CubeMX se activa en Middleware › FREERTOS con la interfaz <b>CMSIS-RTOS v2</b>.'),
      { t: 'match', q: 'Une cada estado de tarea con su significado.', pairs: [['Running', 'Se está ejecutando ahora'], ['Ready', 'Podría ejecutarse, espera su turno'], ['Blocked', 'Espera un tiempo o un evento'], ['Suspended', 'Apartada hasta que alguien la reanude']], c: 'st_rtos' },
      Q('Una tarea tiene prioridad 3 en FreeRTOS y otra prioridad 1. ¿Cuál es más importante?', ['La de prioridad 3: en FreeRTOS, número mayor es más prioritario', 'La de prioridad 1, como en el NVIC', 'Iguales', 'Depende del tick'], 'Justo al revés que en el NVIC. Fuente clásica de errores.', { c: 'st_rtos' }),
      Q('¿Qué ocurre cuando una tarea llama a osDelay(100)?', ['Pasa a Blocked 100 ticks y la CPU queda para las demás', 'La CPU espera 100 ms sin hacer nada', 'Se borra la tarea', 'Se reinicia el planificador'], 'Esperar sin gastar CPU es la gracia de un RTOS.', { c: 'st_rtos' }),
      Q('Dos tareas listas con la misma prioridad. ¿Cómo se reparten la CPU?', ['Por turnos en cada tick (time slicing)', 'Solo se ejecuta la primera creada', 'Se ejecutan a la vez', 'Ninguna se ejecuta'], 'configUSE_TIME_SLICING viene activado por defecto.', { c: 'st_rtos' }),
      I('El cambio de contexto se hace en la excepción <b>PendSV</b>, con la prioridad más baja de todas: así nunca interrumpe a una interrupción de periférico; espera a que todas terminen.'),
      Q('¿Por qué PendSV tiene la prioridad más baja?', ['Para cambiar de tarea solo cuando no queda ninguna interrupción pendiente', 'Para que vaya más rápido', 'Porque es la menos importante', 'Por un fallo de diseño'], 'Las interrupciones nunca quedan a medias por un cambio de tarea.', { c: 'st_nvic' }),
      Q('¿Qué hace la tarea Idle?', ['Se ejecuta cuando no hay nada listo; puede dormir la CPU para ahorrar', 'Gestiona la UART', 'Comprueba la Flash', 'Es la de mayor prioridad'], 'Con el modo tickless, el chip puede dormir entre eventos.', { c: 'st_rtos' }),
      Q('¿Cuándo NO merece la pena un RTOS?', ['En un programa sencillo con una o dos tareas sin plazos exigentes', 'Nunca merece la pena', 'Siempre que haya interrupciones', 'Cuando hay más de 32 KB de RAM'], 'Un RTOS añade memoria, complejidad y nuevos tipos de errores.', { c: 'st_rtos' })
    ]),
    L('st35', 'Tareas y su pila', 'memory', ['st_stack', 'st_task'], [
      I('Crear una tarea con CMSIS-RTOS v2: una función que nunca termina, unos atributos y osThreadNew.', { code: 'const osThreadAttr_t attr = {\n  .name = "sensor",\n  .stack_size = 256 * 4,   // bytes\n  .priority = osPriorityNormal,\n};\nosThreadNew(TareaSensor, NULL, &attr);' }),
      Q('En CMSIS-RTOS v2, ¿en qué unidad va .stack_size?', ['En bytes', 'En palabras de 32 bits', 'En KB', 'En ticks'], 'CubeMX pide palabras y genera “tamaño × 4”. En xTaskCreate nativo, el tamaño va en palabras.', { c: 'st_stack' }),
      G('st_stack'), G('st_stack'),
      I('Las pilas de las tareas salen del <b>montón de FreeRTOS</b> (heap_4.c con configTOTAL_HEAP_SIZE). Si no cabe una tarea nueva, osThreadNew devuelve NULL.'),
      Q('osThreadNew devuelve NULL. ¿Causa más probable?', ['No queda memoria en el montón de FreeRTOS', 'La función de la tarea tiene un error', 'La prioridad es demasiado alta', 'El tick está parado'], 'Sube configTOTAL_HEAP_SIZE o reduce pilas.', { c: 'st_stack' }),
      I('Detectar desbordes: configCHECK_FOR_STACK_OVERFLOW = 2 llama a <b>vApplicationStackOverflowHook</b> en cada cambio de contexto si la pila se ha pasado. Y uxTaskGetStackHighWaterMark dice cuántas palabras <b>nunca</b> se han usado.'),
      Q('¿Qué gasta mucha pila en una tarea?', ['Arrays locales grandes, printf y la recursión', 'Las variables globales', 'Las constantes', 'Los #define'], 'printf con formatos puede necesitar cientos de bytes.', { c: 'st_stack' }),
      Q('¿Qué le pasará a esta tarea con 128 palabras de pila?', ['Desborda: 1024 bytes de array no caben en 512 bytes de pila', 'Nada', 'Va más lenta', 'No compila'], 'Haz el búfer static o dale mucha más pila.', { code: 'void Tarea(void *a) {\n  char buf[1024];\n  for (;;) { leer(buf); }\n}', c: 'st_stack' }),
      Q('¿Qué pasa si la función de una tarea llega al final y retorna?', ['Error: una tarea nunca debe retornar; usa un bucle infinito u osThreadExit()', 'La tarea se repite', 'Se reinicia el chip limpiamente', 'Nada'], 'FreeRTOS no sabe a dónde volver.', { c: 'st_task' }),
      Q('Tarea que debe ejecutarse exactamente cada 10 ms aunque su trabajo tarde un poco. ¿Qué usas?', ['osDelayUntil con un tiempo de referencia', 'osDelay(10) al final', 'HAL_Delay(10)', 'Un while vacío'], 'osDelay cuenta desde que la llamas; osDelayUntil, desde una referencia fija, sin acumular deriva.', { c: 'st_task' })
    ]),
    L('st36', 'Colas y semáforos', 'bus', ['st_queue', 'st_rtosisr', 'st_rtos'], [
      I('Una <b>cola</b> es una FIFO de mensajes de tamaño fijo que se <b>copian</b> dentro. Una tarea puede bloquearse esperando a que llegue algo. Es la forma limpia de pasar datos de una interrupción a una tarea.'),
      Q('¿Por qué el tiempo de espera es 0 en esta llamada?', ['Porque se llama desde una interrupción, que nunca puede bloquearse', 'Para que sea más rápido', 'Porque la cola está vacía', 'Por error'], 'Desde una ISR solo vale 0: si la cola está llena, se descarta.', { code: 'void HAL_UART_RxCpltCallback(\n    UART_HandleTypeDef *h) {\n  osMessageQueuePut(cola, &byte,\n    0, 0);\n}', c: 'st_rtosisr' }),
      Q('Envías a una cola un puntero a un array local de la tarea emisora. ¿Riesgo?', ['Cuando el receptor lo lea, el array puede haber cambiado o no existir', 'Ninguno', 'Que la cola se llene', 'Que el puntero se copie mal'], 'La cola copia el puntero, no los datos a los que apunta.', { c: 'st_queue' }),
      I('<b>Semáforo binario</b>: una señal (“ya ha pasado”). <b>Semáforo contador</b>: cuenta eventos o recursos disponibles. Una tarea hace osSemaphoreAcquire y se bloquea hasta que alguien hace osSemaphoreRelease.'),
      Q('Una interrupción debe despertar a una tarea cuando hay datos. ¿Qué usas?', ['Un semáforo binario o una notificación de tarea (thread flags)', 'Un mutex', 'Una variable global y un while', 'HAL_Delay'], 'La tarea duerme sin gastar CPU hasta la señal.', { c: 'st_queue' }),
      Q('Una interrupción con prioridad NVIC 3 llama a osSemaphoreRelease. CubeMX tiene el límite en 5. ¿Qué pasa?', ['Puede corromper el núcleo del RTOS: esa interrupción debe tener prioridad 5 o mayor', 'Funciona', 'No compila', 'Se ignora la llamada'], 'Solo las interrupciones “menos urgentes” que el límite pueden usar la API.', { c: 'st_rtosisr' }),
      Q('Con la API nativa, ¿para qué sirve portYIELD_FROM_ISR(xHigherPriorityTaskWoken)?', ['Para cambiar a la tarea despertada nada más salir de la interrupción', 'Para desactivar interrupciones', 'Para borrar la bandera', 'Para dormir la CPU'], 'Si no, la tarea esperaría al siguiente tick.', { c: 'st_rtosisr' }),
      { t: 'match', q: 'Une cada herramienta con su uso.', pairs: [['Cola', 'Pasar datos copiándolos'], ['Semáforo binario', 'Avisar de que algo ha ocurrido'], ['Semáforo contador', 'Contar eventos o recursos'], ['Mutex', 'Proteger un recurso compartido']], c: 'st_queue' },
      Q('El productor usa osWaitForever y la cola está llena. ¿Qué le pasa?', ['Se bloquea hasta que el consumidor saque algo', 'Pierde el dato', 'Sobrescribe el más viejo', 'Se reinicia'], 'Las colas también regulan el ritmo entre tareas.', { c: 'st_queue' }),
      Q('¿Cuánta CPU gasta esta tarea mientras no llegan mensajes?', ['Ninguna: está bloqueada', 'Toda', 'La mitad', 'Un tick de cada dos'], 'Por eso se diseña con tareas que esperan eventos.', { code: 'for (;;) {\n  osMessageQueueGet(cola, &m, NULL,\n                    osWaitForever);\n  procesar(&m);\n}', c: 'st_rtos' })
    ]),
    PRJ('st-p13', 'Proyecto: pantalla TFT con menú y FreeRTOS', 'st_tft'),
    L('st37', 'Mutex e inversión de prioridad', 'shield', ['st_mutex', 'st_rtosisr'], [
      I('Un <b>mutex</b> protege un recurso compartido (la UART, un bus SPI): quien lo toma es el único que puede usarlo hasta que lo devuelve.'),
      Q('Dos tareas usan printf y los mensajes salen mezclados letra a letra. ¿Solución?', ['Proteger la salida con un mutex', 'Subir la velocidad de la UART', 'Usar un semáforo contador', 'Quitar las prioridades'], 'Toma el mutex, imprime la línea entera y devuélvelo.', { c: 'st_mutex' }),
      I('<b>Inversión de prioridad</b>: la tarea baja tiene el mutex; la alta lo pide y se bloquea; entonces una tarea media (que no necesita el mutex) expulsa a la baja… y la alta acaba esperando a la media.'),
      Q('¿Quién está bloqueando en realidad a la tarea alta en ese escenario?', ['La tarea media, que impide a la baja terminar y soltar el mutex', 'La tarea baja por sí sola', 'El planificador', 'La tarea Idle'], 'Una tarea menos importante retrasa a la más importante.', { c: 'st_mutex' }),
      I('Los mutex de FreeRTOS tienen <b>herencia de prioridad</b>: mientras la baja tiene el mutex que pide la alta, sube temporalmente a la prioridad de la alta. La media ya no puede expulsarla.'),
      Q('¿Por qué un mutex y no un semáforo binario para proteger un recurso?', ['El mutex tiene herencia de prioridad; el semáforo no', 'El semáforo es más lento', 'Es lo mismo', 'El semáforo no existe en FreeRTOS'], 'Semáforo para señalar; mutex para proteger.', { c: 'st_mutex' }),
      Q('La tarea A toma el mutex 1 y luego pide el 2; la B toma el 2 y luego pide el 1. ¿Qué puede pasar?', ['Interbloqueo: cada una espera a la otra para siempre', 'Nada', 'Que vayan más rápido', 'Que el RTOS lo resuelva solo'], 'Toma siempre los mutex en el mismo orden.', { c: 'st_mutex' }),
      Q('¿Puedes tomar un mutex dentro de una interrupción?', ['No: los mutex son solo para tareas', 'Sí, con espera infinita', 'Sí, si la prioridad es 0', 'Solo con la API nativa'], 'Una interrupción no puede bloquearse ni heredar prioridad.', { c: 'st_rtosisr' }),
      I('Un caso famoso: en 1997, la sonda Mars Pathfinder se reiniciaba en Marte por una inversión de prioridad. Se arregló a distancia activando la herencia de prioridad del mutex implicado.'),
      Q('¿Qué buena práctica reduce estos problemas?', ['Tener el mutex el menor tiempo posible y nunca esperar (osDelay) con él tomado', 'Tomar todos los mutex al arrancar', 'Usar prioridades iguales siempre', 'No usar colas'], 'Cuanto menos dure la sección protegida, menos conflictos.', { c: 'st_mutex' })
    ]),
    L('st38', 'Temporizadores software y la base de tiempo', 'timer', ['st_swtimer', 'st_rtos', 'st_rtosisr', 'st_tick'], [
      I('Los <b>temporizadores software</b> de FreeRTOS ejecutan un callback tras un tiempo o periódicamente. Todos sus callbacks corren dentro de una única tarea del sistema (la del servicio de temporizadores).', { code: 'osTimerId_t t = osTimerNew(parpadeo,\n  osTimerPeriodic, NULL, NULL);\nosTimerStart(t, 500);   // ticks' }),
      Q('¿Qué hace este código?', ['Llama a parpadeo cada 500 ticks (500 ms con tick de 1 kHz)', 'Espera 500 ms una vez', 'Crea una tarea nueva', 'Configura un temporizador hardware'], 'Ideal para trabajos cortos y periódicos.', { code: 'osTimerId_t t = osTimerNew(parpadeo,\n  osTimerPeriodic, NULL, NULL);\nosTimerStart(t, 500);', c: 'st_swtimer' }),
      Q('Un callback de temporizador software llama a osDelay(100). ¿Problema?', ['Bloquea la tarea de temporizadores y retrasa todos los demás temporizadores', 'Ninguno', 'Se reinicia el chip', 'El temporizador se acelera'], 'Los callbacks deben ser cortos y no bloquear.', { c: 'st_swtimer' }),
      I('Con FreeRTOS, el <b>SysTick</b> pasa a ser del RTOS. CubeMX te pide mover la base de tiempo de la HAL (la de HAL_GetTick y los tiempos de espera) a un temporizador hardware, por ejemplo TIM11.'),
      Q('¿Por qué la HAL necesita otra base de tiempo con FreeRTOS?', ['Las esperas de la HAL deben funcionar aunque el planificador no haya arrancado o esté parado, sin depender del tick del RTOS', 'Porque el SysTick es lento', 'Para ahorrar energía', 'Porque la HAL no usa tiempo'], 'Cada uno con su reloj, sin pisarse.', { c: 'st_swtimer' }),
      Q('Dentro de una tarea, ¿HAL_Delay(100) u osDelay(100)?', ['osDelay: bloquea la tarea y deja la CPU a las demás', 'HAL_Delay: es más precisa', 'Da igual', 'Ninguna funciona'], 'HAL_Delay espera dando vueltas y gasta CPU.', { c: 'st_rtos' }),
      I('configMAX_SYSCALL_INTERRUPT_PRIORITY (5 en CubeMX) divide las interrupciones en dos grupos: las de prioridad <b>0–4</b> nunca son retrasadas por el RTOS, pero no pueden llamar a su API; las de <b>5–15</b> pueden llamarla.'),
      Q('La interrupción del control de un motor necesita el mínimo retardo y no llama al RTOS. ¿Qué prioridad?', ['Entre 0 y 4', 'Entre 5 y 15', '15', 'Da igual'], 'El RTOS nunca enmascara esas prioridades.', { c: 'st_rtosisr' }),
      Q('Con un tick de 1 kHz, ¿cuánto puede durar osDelay(1)?', ['Entre casi 0 y 1 ms, según cuándo se llame dentro del tick', 'Exactamente 1 ms', 'Siempre 2 ms', '1 µs'], 'La resolución de las esperas del RTOS es un tick.', { c: 'st_tick' }),
      Q('¿Qué es el modo tickless?', ['Detener el tick cuando todas las tareas esperan para dormir más tiempo seguido', 'Un RTOS sin prioridades', 'Quitar el SysTick para siempre', 'Un tick de 1 Hz'], 'Muy útil en equipos con batería.', { c: 'st_rtos' })
    ]),
    PRJ('st-p14', 'Proyecto: sintetizador I²S polifónico', 'st_synth'),
    PRJ('st-p15', 'Proyecto: estación de soldadura T12', 'st_solder')
  ] };

  const M8 = { id: 'st-m8', title: 'Del prototipo al producto', desc: 'Bajo consumo, watchdogs, cargadores de arranque, Flash, tu propia placa y firmware profesional.', nodes: [
    L('st39', 'Bajo consumo: Sleep, Stop y Standby', 'sleep', ['st_power', 'st_avgcur', 'st_hsi', 'st_32k', 'st_leak', 'st_dbglp'], [
      I('El consumo dinámico crece con la frecuencia. Para ir con pilas, el chip pasa casi todo el tiempo dormido:\n<b>Sleep</b>: se para el núcleo; periféricos en marcha.\n<b>Stop</b>: se paran casi todos los relojes; RAM y registros se conservan.\n<b>Standby</b>: casi todo apagado; al despertar, arranque desde reset.'),
      { t: 'match', q: 'Une cada modo con lo que conserva.', pairs: [['Sleep', 'Todo: solo se para el núcleo'], ['Stop', 'RAM y registros, con relojes parados'], ['Standby', 'Solo el dominio de respaldo (RTC y sus registros)']], c: 'st_power' },
      Q('Tras despertar de Standby, ¿dónde sigue el programa?', ['Desde el reset, como un arranque nuevo', 'En la línea siguiente a la que lo durmió', 'En main, con las variables intactas', 'En la interrupción del RTC'], 'Por eso hay que mirar la bandera de Standby al arrancar.', { c: 'st_power' }),
      Q('Tras despertar de Stop en una F4, ¿qué reloj tiene el sistema?', ['El HSI: hay que reconfigurar el PLL', 'El PLL, como antes', 'El LSE', 'Ninguno'], 'Llama de nuevo a SystemClock_Config().', { c: 'st_hsi' }),
      I('Despertar de Stop cada cierto tiempo con el <b>temporizador de despertar del RTC</b>:', { code: 'HAL_RTCEx_SetWakeUpTimer_IT(&hrtc,\n  20480 - 1,\n  RTC_WAKEUPCLOCK_RTCCLK_DIV16);\nHAL_SuspendTick();\nHAL_PWR_EnterSTOPMode(\n  PWR_LOWPOWERREGULATOR_ON,\n  PWR_STOPENTRY_WFI);\nSystemClock_Config();\nHAL_ResumeTick();' }),
      Nm('LSE ÷16 = 2048 Hz. ¿Qué valor de cuenta pasas para despertar cada 5 s? (cuentas − 1)', 10239, '', '5 × 2048 = 10 240 cuentas → 10 239.', { c: 'st_32k' }),
      Q('¿Por qué HAL_SuspendTick antes de dormir en Sleep?', ['Porque la interrupción del SysTick despertaría al chip cada milisegundo', 'Para ahorrar Flash', 'Porque el SysTick se rompe', 'No hace falta nunca'], 'Cualquier interrupción saca al núcleo de Sleep.', { c: 'st_power' }),
      Nm('Un nodo consume 5 mA durante 20 ms cada 10 s y 10 µA el resto. ¿Corriente media en µA?', 19.98, 'µA', '(5000 µA × 0,02 s + 10 µA × 9,98 s) / 10 s ≈ 20 µA.', { tol: 0.5, c: 'st_avgcur' }),
      Nm('Con una batería de 2000 mAh y 20 µA de media, ¿cuántos años, aproximadamente?', 11.4, 'años', '2000 / 0,02 = 100 000 h ≈ 11,4 años. En la práctica, la autodescarga de la batería lo acortará.', { tol: 0.3, c: 'st_avgcur' }),
      Q('Tu nodo en Stop consume mucho más de lo esperado. ¿Qué revisas primero en la placa?', ['LED de encendido, regulador con mucho consumo propio, pull-ups y pines flotantes', 'El tamaño de la Flash', 'La versión de CubeIDE', 'La velocidad de la UART'], 'A menudo la placa gasta más que el chip.', { c: 'st_leak' }),
      Q('Dejas activada la depuración en Stop para el producto final. ¿Efecto?', ['Más consumo: mantiene relojes encendidos para el depurador', 'Ninguno', 'Menos consumo', 'El chip no despierta'], 'Actívala solo mientras desarrollas.', { c: 'st_dbglp' })
    ]),
    L('st40', 'Watchdogs IWDG y WWDG', 'shield', ['st_wdg', 'st_iwdgcalc', 'st_dbglp'], [
      I('<b>IWDG</b> (independiente): cuenta con el LSI, funciona aunque falle el reloj principal y, una vez arrancado, <b>no se puede parar</b> hasta el siguiente reset.\n<b>WWDG</b> (de ventana): usa PCLK1 y además exige refrescarlo dentro de una ventana: ni muy tarde ni demasiado pronto.'),
      { t: 'match', q: 'Une cada característica con su watchdog.', pairs: [['Reloj LSI independiente', 'IWDG'], ['Ventana de refresco', 'WWDG'], ['No se puede detener una vez iniciado', 'IWDG '], ['Interrupción de aviso antes del reset', 'WWDG ']], c: 'st_wdg' },
      G('st_iwdg'), G('st_iwdg'),
      Q('¿Dónde llamas a HAL_IWDG_Refresh?', ['En el bucle principal, solo tras comprobar que todo va bien', 'En una interrupción de temporizador periódica', 'Al principio de main', 'En el HardFault_Handler'], 'Si lo refrescas desde un temporizador, el watchdog no detecta un bucle principal colgado.', { c: 'st_wdg' }),
      Q('Refrescas el WWDG demasiado pronto. ¿Qué pasa?', ['Reset: fuera de la ventana también cuenta como fallo', 'Nada', 'Se alarga el tiempo', 'Se desactiva'], 'Detecta tanto cuelgues como programas que van “demasiado rápido” por un error.', { c: 'st_wdg' }),
      I('Tras un reset, mira <b>por qué</b> ha ocurrido y guárdalo en un registro de errores:', { code: 'if (__HAL_RCC_GET_FLAG(RCC_FLAG_IWDGRST))\n  printf("Reset por watchdog\\n");\n__HAL_RCC_CLEAR_RESET_FLAGS();' }),
      Q('¿Por qué se borran las banderas al final?', ['Para que en el próximo reset solo aparezca la causa nueva', 'Para desactivar el watchdog', 'Para ahorrar energía', 'No hace falta'], 'Las banderas de RCC->CSR se acumulan hasta que las borras.', { c: 'st_wdg' }),
      Q('Pausas el programa con el depurador y a los 2 s el chip se reinicia. ¿Por qué?', ['El IWDG sigue contando: congélalo en depuración con DBGMCU', 'El ST-LINK está mal', 'Falta memoria', 'Es un fallo del chip'], 'Las Nucleo y CubeIDE permiten congelar los watchdogs durante la depuración.', { c: 'st_dbglp' }),
      Q('Con FreeRTOS y 4 tareas, ¿cómo usas bien el watchdog?', ['Cada tarea marca que está viva y una tarea supervisora refresca solo si todas lo han hecho', 'Lo refresca la tarea Idle sin más', 'Lo refresca una ISR', 'No se puede usar con RTOS'], 'Así detectas también una tarea bloqueada.', { c: 'st_wdg' })
    ]),
    PRJ('st-p16', 'Proyecto: nodo sensor de bajo consumo', 'st_lowpower'),
    L('st41', 'Cargador de sistema y DFU', 'rocket', ['st_boot0', 'st_blproto', 'st_toolchain'], [
      I('Todos los STM32 tienen un <b>cargador de arranque en ROM</b> (memoria de sistema) grabado por ST. Se ejecuta si BOOT0 está a 1 al hacer reset. Según el chip admite USART, USB DFU, I²C, SPI o CAN: la lista está en la nota de aplicación AN2606.'),
      { t: 'order', q: 'Ordena cómo cargar firmware por USB DFU en una Black Pill.', items: ['Conecta el USB', 'Mantén pulsado BOOT0', 'Pulsa y suelta NRST', 'Suelta BOOT0', 'Conecta por USB en STM32CubeProgrammer y graba', 'Pulsa NRST para ejecutar tu programa'], e: 'BOOT0 solo se lee en el reset.', c: 'st_boot0' },
      Q('Has grabado por DFU y el programa no arranca al quitar el USB y ponerlo. ¿Qué miras?', ['Que BOOT0 esté a 0 en el reset', 'La velocidad del USB', 'El cristal de 32 kHz', 'La FPU'], 'Con BOOT0 a 1 vuelve a entrar al cargador.', { c: 'st_boot0' }),
      I('Por UART, el protocolo del cargador (AN3155): envías <b>0x7F</b> para que detecte tu velocidad, responde <b>0x79</b> (ACK) o <b>0x1F</b> (NACK). Cada comando va seguido de su complemento. La UART va en 8 bits con <b>paridad par</b>.'),
      Q('Tu herramienta de carga por UART no conecta y usa 8N1. ¿Qué falta?', ['Paridad par (8E1)', 'Más velocidad', 'Control de flujo', 'Dos bits de parada'], 'El cargador de sistema exige paridad par.', { c: 'st_blproto' }),
      Q('El comando de escribir memoria es 0x31. ¿Qué byte envías detrás?', ['0xCE, su complemento', '0x31', '0x00', '0xFF'], '0x31 XOR 0xFF = 0xCE.', { c: 'st_blproto' }),
      Q('¿Qué hace esta orden?', ['Graba app.bin en 0x08000000 por SWD y verifica', 'Borra la Flash', 'Lee la Flash a app.bin', 'Arranca el cargador'], 'La versión de línea de órdenes es ideal para producción.', { code: 'STM32_Programmer_CLI -c port=SWD\n  -w app.bin 0x08000000 -v', c: 'st_toolchain' }),
      Q('¿Puede tu aplicación saltar al cargador de sistema sin tocar BOOT0?', ['Sí: desactivando periféricos e interrupciones y saltando a la memoria de sistema (0x1FFF0000 en la F4)', 'No, nunca', 'Solo en la F1', 'Solo con un ST-LINK'], 'Se toma el MSP y el vector de reset de esa dirección, como en tu propio cargador.', { c: 'st_boot0' }),
      Q('¿Por qué hacer un cargador propio si ya existe el de ROM?', ['Para elegir interfaz y protocolo, verificar o cifrar la imagen y actualizar en el campo sin tocar pines', 'Porque el de ROM no funciona', 'Porque ocupa menos', 'No tiene sentido'], 'Es lo que hacen los productos comerciales.', { c: 'st_boot0' })
    ]),
    L('st42', 'Escribir en la Flash y protegerla', 'memory', ['st_flash', 'st_rdp', 'st_linker'], [
      I('La Flash de la F401/F411 se divide en <b>sectores</b> desiguales: cuatro de 16 KB (0x08000000–0x0800FFFF), uno de 64 KB (desde 0x08010000) y el resto de 128 KB. Solo se puede borrar un sector entero.'),
      Q('¿Dónde empieza el sector 4 de una F411?', ['0x08010000', '0x08004000', '0x08040000', '0x08020000'], '4 × 16 KB = 64 KB = 0x10000.', { c: 'st_flash' }),
      Q('¿Qué valor tiene la Flash recién borrada?', ['Todos los bits a 1: 0xFF', 'Todos a 0', 'Aleatorio', 'El valor anterior'], 'Programar solo puede pasar bits de 1 a 0.', { c: 'st_flash' }),
      I('Secuencia con la HAL:', { code: 'HAL_FLASH_Unlock();\nFLASH_EraseInitTypeDef e = {\n  .TypeErase = FLASH_TYPEERASE_SECTORS,\n  .Sector = FLASH_SECTOR_7,\n  .NbSectors = 1,\n  .VoltageRange = FLASH_VOLTAGE_RANGE_3 };\nuint32_t err;\nHAL_FLASHEx_Erase(&e, &err);\nHAL_FLASH_Program(FLASH_TYPEPROGRAM_WORD,\n  0x08060000, dato);\nHAL_FLASH_Lock();' }),
      Q('¿Qué indica FLASH_VOLTAGE_RANGE_3?', ['Que el chip va a 2,7–3,6 V y puede programar palabras de 32 bits', 'Que se borran 3 sectores', 'Que se usa el banco 3', 'Que la Flash va a 3 MHz'], 'Con tensiones menores hay que programar de menos en menos bits.', { c: 'st_flash' }),
      Q('Mientras se borra un sector de 128 KB, ¿qué le pasa a tu programa si corre desde la misma Flash?', ['Se queda parado hasta que termina el borrado, que puede durar más de un segundo', 'Sigue normal', 'Se reinicia', 'Corre más rápido'], 'Ojo con los watchdogs y con las interrupciones urgentes.', { c: 'st_flash' }),
      Q('¿Por qué no guardar un contador en Flash cada segundo?', ['Cada sector aguanta del orden de 10 000 borrados: se gastaría pronto', 'Porque es lento', 'Porque la Flash es de solo lectura', 'No hay problema'], 'Agrupa escrituras, rota posiciones o usa otra memoria.', { c: 'st_flash' }),
      Q('Usas el último sector para datos. ¿Qué cambias en el script del enlazador?', ['Reducir LENGTH de FLASH para que el programa no pueda ocupar ese sector', 'Nada', 'Aumentar la RAM', 'Mover .bss'], 'Si no, una actualización que crezca borraría tus datos o tu código.', { c: 'st_linker' }),
      I('<b>Protección de lectura (RDP)</b> en los option bytes:\n<b>Nivel 0</b>: sin protección.\n<b>Nivel 1</b>: el depurador no puede leer la Flash; volver a 0 borra toda la Flash.\n<b>Nivel 2</b>: depuración desactivada para siempre. <b>Irreversible.</b>'),
      Q('¿Qué pasa si bajas el RDP de nivel 1 a nivel 0?', ['Se borra toda la Flash: así nadie recupera tu código', 'Nada', 'Se bloquea el chip', 'Se activa el nivel 2'], 'Protege la propiedad intelectual sin perder el chip.', { c: 'st_rdp' }),
      Q('¿Cuándo pondrías el RDP a nivel 2?', ['Solo en un producto final muy seguro de que nunca necesitarás depurar ni reprogramar por SWD', 'En cada prototipo', 'Para ahorrar energía', 'Para acelerar la Flash'], 'Es irreversible: un error y el chip ya no se puede depurar nunca.', { c: 'st_rdp' })
    ]),
    PRJ('st-p17', 'Proyecto: cargador de arranque propio', 'st_boot'),
    L('st43', 'Diseña tu propia placa STM32', 'pcb', ['st_board', 'st_crystal', 'st_bringup'], [
      I('El circuito mínimo de un STM32: alimentación de 3,3 V, condensadores de desacoplo, condensadores de VCAP (en las F4), filtro de VDDA, BOOT0, NRST, el cristal y un conector de depuración. Todo está en la nota de aplicación de “primeros pasos con hardware” de cada familia.'),
      Q('Tu F411 no arranca y VCAP_1 no tiene condensador. ¿Por qué importa?', ['VCAP estabiliza el regulador interno del núcleo; sin él no funciona bien', 'No importa', 'Solo afecta al ADC', 'VCAP es una entrada analógica'], 'Pon el valor y el tipo que indica la hoja de datos.', { c: 'st_board' }),
      G('st_crystal'), G('st_crystal'),
      Q('¿Cómo dejas BOOT0 en una placa propia?', ['Con una resistencia de unos 10 kΩ a masa y un pulsador o puente a 3,3 V', 'Al aire', 'Directo a 3,3 V', 'Conectado a NRST'], 'Así arranca siempre tu programa salvo que lo pidas.', { c: 'st_board' }),
      Q('¿Para qué un condensador de 100 nF en NRST?', ['Filtra ruidos que podrían reiniciar el chip', 'Para que arranque más rápido', 'Para el cristal', 'Para el USB'], 'Junto con la pull-up interna.', { c: 'st_board' }),
      Q('¿Por qué VDDA lleva su propio filtrado (ferrita y condensadores)?', ['El ADC y el DAC miden respecto a ella: el ruido digital empeora las medidas', 'Por estética', 'Porque consume mucho', 'Para el USB'], 'Separa la alimentación analógica de la digital.', { c: 'st_board' }),
      I('Conector de depuración: como mínimo 3,3 V, GND, SWDIO, SWCLK y NRST (mejor también SWO). Hay un estándar de 10 pines a 1,27 mm (Cortex Debug) y conectores sin soldar como Tag-Connect.'),
      Q('¿Qué protección añades al conector USB de una placa propia?', ['Un supresor ESD en D+ y D− (por ejemplo USBLC6-2SC6)', 'Un fusible en D+', 'Una resistencia de 1 MΩ', 'Ninguna'], 'Las descargas electrostáticas entran por los conectores.', { c: 'st_board' }),
      Q('Alimentas desde una Li-ion (3,0–4,2 V) con un AMS1117 de 3,3 V (caída de ~1 V). ¿Problema?', ['Pronto no habrá margen y la salida bajará de 3,3 V: usa un LDO de caída muy baja o un buck-boost', 'Ninguno', 'Se quemará el STM32', 'Dará 4,2 V'], 'El AMS1117 necesita unos 4,3 V a la entrada para dar 3,3 V.', { c: 'st_board' }),
      Q('¿Por qué asignar los pines en CubeMX antes de dibujar el esquema?', ['Para comprobar que cada función tiene un pin posible sin conflictos', 'Para que la PCB sea más bonita', 'Porque KiCad lo exige', 'No hace falta'], 'Descubrir un conflicto con la placa fabricada es carísimo.', { c: 'st_bringup' }),
      { t: 'order', q: 'Ordena la puesta en marcha de una placa nueva.', items: ['Inspección visual y continuidad entre 3,3 V y GND', 'Alimentar con fuente limitada y medir 3,3 V', 'Conectar el ST-LINK y leer el Device ID', 'Grabar un parpadeo', 'Comprobar el reloj con MCO', 'Probar cada periférico por separado'], e: 'Paso a paso: si algo falla, sabes exactamente qué.', c: 'st_bringup' }
    ]),
    L('st44', 'Firmware profesional', 'code', ['st_profw', 'st_halstatus'], [
      I('Un firmware que crece necesita <b>capas</b>: drivers (hablan con el hardware), servicios (filtros, protocolos, control) y aplicación (estados y lógica). Cada capa solo usa la de debajo.'),
      Q('¿Qué ganas si tu driver de sensor recibe funciones de lectura y escritura del bus en vez de llamar directamente a la HAL?', ['Puedes probarlo en el PC y cambiar de bus o de chip sin tocarlo', 'Ocupa menos', 'Va más rápido', 'Nada'], 'Inyección de dependencias en C: structs con punteros a función.', { c: 'st_profw' }),
      I('<b>Pruebas en el PC</b>: la lógica pura (PID, analizadores de tramas, máquinas de estados) se compila y prueba en el ordenador con un marco como Unity o GoogleTest, en segundos y sin placa.'),
      Q('¿Qué se prueba mejor en el PC que en la placa?', ['Un analizador de tramas NMEA', 'El tiempo de subida de un pin', 'El consumo en Stop', 'El arranque del cristal'], 'Lo que no depende del hardware.', { c: 'st_profw' }),
      I('<b>Errores</b>: comprueba los retornos de la HAL, usa assert con USE_FULL_ASSERT durante el desarrollo y escribe un HardFault_Handler que guarde PC, LR y CFSR en una zona que sobreviva al reset para analizar fallos del campo.'),
      Q('¿Para qué sirve USE_FULL_ASSERT en la HAL?', ['Comprueba los parámetros de las funciones HAL y llama a assert_failed si hay uno inválido', 'Acelera la HAL', 'Activa el watchdog', 'Desactiva las interrupciones'], 'Úsalo en desarrollo; en producción ocupa espacio.', { c: 'st_halstatus' }),
      Q('¿Qué NO deberías subir a git en un proyecto de CubeIDE?', ['La carpeta Debug/ con los objetos compilados', 'El archivo .ioc', 'Las fuentes de Core/', 'El script del enlazador'], 'Lo generado al compilar se reconstruye; el .ioc es tu configuración.', { c: 'st_profw' }),
      Q('¿Por qué compilar con -Wall -Wextra y tratar los avisos?', ['Muchos avisos son errores reales: variables sin inicializar, comparaciones de signo…', 'Para que tarde más', 'Para que ocupe menos', 'No sirve de nada'], 'Y añade un analizador estático si puedes.', { c: 'st_profw' }),
      Q('¿Qué es MISRA C?', ['Un conjunto de reglas de C para software crítico, muy usado en automoción', 'Un compilador', 'Un RTOS', 'Un depurador'], 'Prohíbe construcciones de C peligrosas o ambiguas.', { c: 'st_profw' }),
      { t: 'order', q: 'Ordena una publicación de firmware.', items: ['Todas las pruebas pasan en integración continua', 'Se actualiza el número de versión', 'Se crea una etiqueta en git', 'Se compila la versión de producción', 'Se guarda el .elf con símbolos junto al .bin', 'Se graba y se verifica en placas de prueba'], e: 'Guardar el .elf permite analizar fallos de esa versión exacta.', c: 'st_profw' }
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
