/* Voltio · especialidad: Internet de las cosas. El sistema completo, del sensor al panel:
   redes, HTTP, MQTT, datos, seguridad, energía, fiabilidad y plataformas locales
   (Home Assistant, ESPHome, Zigbee, Thread, LoRaWAN, NB-IoT). Prioriza lo local y la privacidad.
   Todo el texto, el código y los ejercicios son originales. */
(() => {
  const { pick, ri, fmt, sup, MC, N } = Gen.helpers;
  const H = Widgets.H;

  /* ---------- utilidades compartidas ---------- */
  // Tiempo en aire de un paquete LoRaWAN (fórmula del fabricante del transceptor):
  // BW 125 kHz, CR 4/5, preámbulo de 8 símbolos, cabecera explícita, CRC activado.
  // LoRaWAN añade 13 bytes a tu carga: MHDR 1 + FHDR 7 + FPort 1 + MIC 4.
  const LORA_OVH = 13;
  function toaMs(sf, appBytes) {
    const pl = appBytes + LORA_OVH, de = sf >= 11 ? 1 : 0, ts = Math.pow(2, sf) / 125;
    const n = 8 + Math.max(Math.ceil((8 * pl - 4 * sf + 28 + 16) / (4 * (sf - 2 * de))) * 5, 0);
    return (8 + 4.25) * ts + n * ts;
  }
  // Coincidencia de temas MQTT con comodines (+ un nivel, # el resto, $… no entra con comodín inicial)
  function topicMatch(filter, topic) {
    const F = filter.split('/'), T = topic.split('/');
    if (topic.startsWith('$') && (F[0] === '+' || F[0] === '#')) return false;
    for (let i = 0; i < F.length; i++) {
      if (F[i] === '#') return true;
      if (i >= T.length) return false;
      if (F[i] !== '+' && F[i] !== T[i]) return false;
    }
    return F.length === T.length;
  }
  // Azar reproducible (para que las gráficas no bailen al mover un deslizador)
  const rnd = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  const num = H.num;

  /* ---------- conceptos ---------- */
  Object.assign(CONCEPTS, {
    io_arch: { name: 'Arquitectura de un sistema IoT', alts: [
      { title: 'Una cadena de montaje', text: 'Piensa en una fábrica: el <b>sensor</b> recoge la materia prima, el <b>nodo</b> la empaqueta, la <b>red</b> la transporta, la <b>pasarela</b> cambia de camión si hace falta, el <b>broker o servidor</b> la reparte, la <b>base de datos</b> la almacena y el <b>panel o la automatización</b> la usa. Si un eslabón falla, lo de detrás se queda sin nada.', q: mcq('Un sensor Zigbee no puede hablar directamente con tu WiFi. ¿Qué eslabón falta?', ['Una pasarela (coordinador) que traduzca entre Zigbee e IP', 'Una base de datos más grande', 'Más ancho de banda en el WiFi', 'Un panel en el móvil'], 'La pasarela conecta redes distintas.') },
      { title: 'Decidir por requisitos', text: 'No hay radio “mejor”: hay la que cumple tus requisitos. Pregunta en orden: ¿de dónde sale la energía (enchufe o pila)? ¿A qué distancia está? ¿Cuántos datos y cada cuánto? ¿Cuánto puede tardar el aviso? ¿Cuánto cuesta cada nodo y la infraestructura?', q: mcq('Un sensor a pilas a 2 km, que envía 10 bytes cada 15 min. ¿Qué tecnología encaja?', ['LoRaWAN', 'WiFi', 'Bluetooth LE', 'Ethernet'], 'Largo alcance, pocos datos y muy bajo consumo.') },
      { title: 'Lo local primero', text: 'Si el broker, la base de datos y las automatizaciones viven en tu casa, todo sigue funcionando sin internet y tus datos no salen. La nube aporta acceso remoto y escala, pero añade dependencia, latencia y un tercero que ve tus datos.', q: mcq('Se cae internet en casa. ¿Qué sistema sigue encendiendo la luz con el sensor de presencia?', ['El que tiene broker y automatizaciones en un servidor local', 'El que depende de la app del fabricante en la nube', 'Ninguno', 'Ambos, siempre'], 'Lo local no necesita salir a internet.') }
    ] },
    io_net: { name: 'Redes IP en casa', alts: [
      { title: 'Calle y portal', text: 'Una dirección IP es como una dirección postal: la <b>máscara</b> dice qué parte es la calle (la red) y qué parte el portal (el equipo). Con /24, los tres primeros números son la calle. Si dos equipos están en la misma calle, hablan directamente; si no, la carta va a la <b>puerta de enlace</b> (el router).', q: mcq('Con máscara /24, ¿están en la misma red estos dos equipos?', ['No: el tercer número cambia', 'Sí: acaban igual', 'Sí: empiezan igual', 'Depende del DNS'], 'Con /24 deben coincidir los tres primeros bytes.', { code: 'Nodo:   192.168.1.20 /24\nBroker: 192.168.2.20 /24' }) },
      { title: 'Decibelios de señal', text: 'El RSSI se da en dBm, una escala logarítmica: 0 dBm es 1 mW. Cada 3 dB menos es la mitad de potencia y cada 10 dB menos, diez veces menos. −50 dBm es una señal excelente; por debajo de unos −80 dBm, el enlace WiFi se vuelve poco fiable.', q: mcq('Pasas de −60 dBm a −70 dBm. La potencia recibida…', ['Es diez veces menor', 'Baja un 10 %', 'Es la mitad', 'No cambia'], '10 dB = factor 10.') },
      { title: 'Puertos: el número de la puerta', text: 'La IP dice a qué equipo vas; el <b>puerto</b> dice a qué programa. Un mismo servidor puede tener la web en el 80, MQTT en el 1883 y SSH en el 22. TCP entrega en orden y confirma; UDP manda y se olvida.', q: mcq('Un broker MQTT y una web corren en la misma Raspberry Pi. ¿Cómo se distinguen?', ['Por el puerto', 'Por la máscara', 'Por la dirección MAC', 'No pueden convivir'], 'Misma IP, puertos distintos.') }
    ] },
    io_http: { name: 'HTTP y JSON', alts: [
      { title: 'Ventanilla de un banco', text: 'HTTP funciona como una ventanilla: el <b>cliente</b> hace una petición (método, ruta, cabeceras y, a veces, un cuerpo) y el <b>servidor</b> contesta con un código de estado y una respuesta. El servidor nunca habla primero: si quieres novedades, tienes que volver a preguntar.', q: mcq('Un panel quiere enterarse al instante de cada cambio por HTTP normal. ¿Qué problema tiene?', ['Debe preguntar una y otra vez (sondeo), porque el servidor no puede avisar por iniciativa propia', 'HTTP no admite JSON', 'Los códigos de estado no lo permiten', 'Ninguno'], 'Para empujar datos se usan WebSocket o MQTT.') },
      { title: 'Contar bytes', text: 'JSON es texto: cada llave, comilla, dos puntos y coma ocupa un byte. {"t":21.5} son 10 bytes para un dato que en binario cabría en 2. Es legible y fácil de depurar; el precio es tamaño y tiempo de proceso, que importan en LoRa pero casi nada en WiFi.', q: mcq('¿Cuántos bytes ocupa {"h":48}?', ['8', '2', '6', '4'], 'Llave, comilla, h, comilla, dos puntos, 4, 8 y llave: 8 caracteres.') }
    ] },
    io_pubsub: { name: 'Publicar y suscribirse', alts: [
      { title: 'Un tablón de anuncios', text: 'En MQTT nadie habla con nadie directamente. Los nodos <b>publican</b> mensajes en temas de un tablón (el <b>broker</b>) y quien esté interesado se <b>suscribe</b> a esos temas. El sensor no sabe quién lo lee; el panel no sabe quién escribe. Por eso añadir un lector nuevo no obliga a tocar el sensor.', q: mcq('Añades un segundo panel que quiere la temperatura del salón. ¿Qué cambias en el sensor?', ['Nada: el panel nuevo se suscribe al mismo tema', 'Hay que reprogramarlo para enviar a dos sitios', 'Hay que darle la IP del panel', 'Hay que duplicar el broker'], 'Publicador y suscriptor están desacoplados.') },
      { title: 'Conexiones salientes', text: 'Todos los clientes MQTT abren la conexión <b>hacia</b> el broker y la mantienen abierta. Por eso un nodo detrás de un router con NAT puede recibir órdenes sin abrir puertos: el canal ya lo abrió él.', q: mcq('¿Por qué un nodo MQTT recibe órdenes sin abrir puertos en el router?', ['Porque él inició la conexión TCP con el broker y la mantiene abierta', 'Porque MQTT usa UDP', 'Porque el broker conoce su MAC', 'Porque el router abre puertos solo'], 'Las respuestas vuelven por la misma conexión.') }
    ] },
    io_topics: { name: 'Temas y comodines MQTT', alts: [
      { title: 'Carpetas', text: 'Un tema es como una ruta de carpetas: casa/salon/temperatura. <b>+</b> sustituye exactamente una carpeta; <b>#</b> sustituye todo lo que queda (incluido nada) y solo puede ir al final. casa/+/temperatura recibe la de cada habitación; casa/salon/# recibe todo lo del salón.', q: mcq('¿Qué tema recibe un suscriptor de casa/+/temperatura?', ['casa/cocina/temperatura', 'casa/cocina/nevera/temperatura', 'casa/temperatura', 'Casa/cocina/temperatura'], '+ es un solo nivel y los temas distinguen mayúsculas.') },
      { title: 'Reglas finas', text: 'Tres detalles que muerden: 1) distinguen mayúsculas; 2) una barra inicial crea un nivel vacío (/casa no es casa); 3) los temas que empiezan por $ (como $SYS) no entran con un comodín al principio.', q: mcq('Un suscriptor de # en tu broker. ¿Recibe $SYS/broker/uptime?', ['No: los temas con $ no entran con un comodín inicial', 'Sí: # lo recibe todo', 'Solo con QoS 2', 'Solo si es retenido'], 'Hay que suscribirse a $SYS/# explícitamente.') }
    ] },
    io_qos: { name: 'Garantías de entrega en MQTT', alts: [
      { title: 'Correo ordinario, certificado y notarial', text: '<b>QoS 0</b>: lo envías y te olvidas (como una postal). <b>QoS 1</b>: el receptor confirma; si no llega la confirmación, reenvías, así que puede llegar dos veces. <b>QoS 2</b>: un intercambio de cuatro mensajes garantiza que llega exactamente una vez, a cambio de más tráfico y latencia.', q: mcq('Un contador de pulsos envía “+1” cada vez. ¿Qué QoS evita contar de más?', ['QoS 2', 'QoS 1', 'QoS 0', 'Da igual'], 'QoS 1 puede duplicar; mejor aún: envía el total acumulado, que es idempotente.') },
      { title: 'Lo que guarda el broker', text: 'El broker puede guardar tres cosas por ti: el último mensaje <b>retenido</b> de cada tema (para los que se suscriben tarde), el <b>último testamento</b> de cada cliente (lo publica si desaparece sin despedirse) y las <b>sesiones persistentes</b> (suscripciones y mensajes QoS 1/2 pendientes de un cliente desconectado).', q: mcq('Un panel arranca y quiere ver al momento el último estado de la puerta, aunque no haya cambiado en horas. ¿Qué necesita?', ['Que el estado se publique como retenido', 'QoS 2', 'Un último testamento', 'Keepalive más corto'], 'El retenido se entrega al suscribirse.') }
    ] },
    io_sampling: { name: 'Muestreo y filtrado', alts: [
      { title: 'Fotos de una peonza', text: 'Muestrear es hacer fotos de una señal. Si haces menos de dos fotos por vuelta, la peonza parece girar despacio o al revés: es el <b>aliasing</b>. Regla: muestrea a más del doble de la frecuencia más rápida que te interese (Nyquist) y, en la práctica, de 5 a 10 veces.', q: mcq('Quieres medir una vibración de 100 Hz. ¿Muestreo mínimo teórico?', ['Más de 200 Hz', '100 Hz', '50 Hz', '1 Hz'], 'Más del doble de la frecuencia máxima.') },
      { title: 'Promediar cuesta tiempo', text: 'Una media de N muestras reduce el ruido aleatorio unas √N veces, pero reacciona tarde: tarda N muestras en reflejar del todo un cambio. La <b>mediana</b> elimina picos aislados sin emborronar tanto los escalones. El filtro <b>exponencial</b> (y += α·(x − y)) gasta una sola variable.', tune: { viz: 'io_mavg', params: { N: { label: 'Ventana', val: 4, min: 1, max: 32, step: 1, dec: 0 }, R: { label: 'Ruido', val: 0.6, min: 0, max: 1, step: 0.05, dec: 2 } } }, q: mcq('Pasas de una media de 4 muestras a una de 16. El ruido aleatorio…', ['Se reduce a la mitad, y el retardo se multiplica por 4', 'Se reduce a la cuarta parte sin retardo', 'No cambia', 'Aumenta'], '√16 / √4 = 2.') }
    ] },
    io_security: { name: 'Seguridad en IoT', alts: [
      { title: 'Cerraduras y llaves', text: 'Primero pregunta: ¿qué protejo, de quién y qué pasa si falla? Luego aplica capas: contraseñas únicas (nunca las de fábrica), red separada para los cacharros, cifrado en tránsito (TLS), mínimo privilegio en el broker y actualizaciones firmadas. Ninguna capa es perfecta; juntas, sí cuestan mucho de saltar.', q: mcq('¿Qué medida habría frenado las botnets que entraban en cámaras con la contraseña de fábrica?', ['Obligar a cambiar la contraseña por una única', 'Usar QoS 2', 'Poner más antenas', 'Cambiar el canal WiFi'], 'Las credenciales por defecto fueron la puerta de entrada.') },
      { title: 'Qué protege TLS', text: 'TLS cifra y autentica el <b>camino</b>: nadie en medio puede leer ni alterar los mensajes y, si verificas el certificado, sabes que hablas con tu broker. No protege lo que pasa en los extremos: un nodo con una contraseña débil, un broker mal configurado o un servidor que guarda tus datos sin cifrar.', q: mcq('Un nodo usa setInsecure() para conectar por TLS. ¿Qué pierde?', ['La verificación del servidor: alguien en medio podría hacerse pasar por el broker', 'El cifrado', 'La compresión', 'Nada'], 'Sigue cifrando, pero no sabe con quién habla.') }
    ] },
    io_duty: { name: 'Ciclo de trabajo y consumo medio', alts: [
      { title: 'La media ponderada', text: 'Un nodo que duerme y despierta tiene un consumo medio: <b>Imedia = (Idesp · tdesp + Idorm · tdorm) / T</b>. Si duerme casi siempre, lo que gasta dormido puede pesar más que los picos al despertar. Por eso importa tanto la corriente de reposo de la placa.', tune: { viz: 'io_sleep', params: { Ia: { label: 'Corriente despierto', val: 120, min: 20, max: 250, step: 5, unit: 'mA', dec: 0 }, ta: { label: 'Tiempo despierto', val: 3, min: 0.2, max: 10, step: 0.1, unit: 's', dec: 1 }, Is: { label: 'Corriente dormido', val: 150, list: [5, 10, 25, 50, 150, 1000, 5000], unit: 'µA', dec: 0 }, T: { label: 'Periodo', val: 300, list: [10, 30, 60, 300, 600, 900, 1800, 3600], unit: 's', dec: 0 }, C: { val: 2500, fixed: true } } }, q: mcq('100 mA durante 1 s cada 100 s y nada el resto. ¿Media?', ['1 mA', '100 mA', '10 mA', '0,1 mA'], '100 × 1 / 100.') },
      { title: 'Carga en mA·s', text: 'Cuenta “cubos de carga” por ciclo: despierto gasta Idesp × tdesp; dormido, Idorm × tdorm. Suma, divide entre el periodo y tendrás la media; divide la capacidad de la batería entre esa media y tendrás horas.', q: mcq('Despierto: 150 mA × 2 s = 300 mA·s. Dormido: 0,01 mA × 298 s ≈ 3 mA·s. Periodo 300 s. ¿Media?', ['Unos 1,01 mA', '150 mA', '0,01 mA', '3 mA'], '303 / 300 ≈ 1,01 mA.') }
    ] },
    io_lora: { name: 'LoRa y ciclo de trabajo', alts: [
      { title: 'Hablar despacio llega más lejos', text: 'Cada paso de SF (7 → 12) dobla la duración de cada símbolo: el paquete aguanta más ruido y llega más lejos, pero ocupa el aire el doble de tiempo y gasta el doble de batería. Con SF12 un paquete corto pasa casi 1,5 s en el aire; con SF7, unos 60 ms.', tune: { viz: 'io_duty', params: { SF: { label: 'Factor de dispersión (SF)', val: 9, list: [7, 8, 9, 10, 11, 12], dec: 0 }, PL: { label: 'Carga útil', val: 10, min: 1, max: 51, step: 1, unit: 'B', dec: 0 } } }, q: mcq('Pasas de SF9 a SF10 con el mismo mensaje. El tiempo en aire…', ['Casi se duplica', 'Baja a la mitad', 'No cambia', 'Se multiplica por 10'], 'Cada SF dobla la duración del símbolo.') },
      { title: 'El 1 % en números', text: 'En la sub-banda de 868,0–868,6 MHz cada equipo puede transmitir como mucho el 1 % del tiempo: 36 s por hora. Si un paquete dura T, tras enviarlo debes callar 99·T. Además, redes comunitarias como The Things Network piden no pasar de 30 s de aire al día por nodo.', q: mcq('Un paquete dura 0,5 s. ¿Cuánto debes esperar como mínimo para el siguiente?', ['49,5 s', '0,5 s', '5 s', '99 s'], '99 × 0,5 s.') }
    ] },
    io_retry: { name: 'Reconexión y robustez', alts: [
      { title: 'No llamar a la puerta sin parar', text: 'Si el router se reinicia y cien nodos reintentan cada 100 ms a la vez, lo saturan justo cuando arranca. La <b>espera exponencial</b> dobla el tiempo entre intentos (1, 2, 4, 8 s… hasta un tope) y el <b>azar</b> (jitter) evita que todos lo hagan en el mismo instante.', tune: { viz: 'io_backoff', params: { base: { label: 'Espera inicial', val: 1, min: 0.5, max: 5, step: 0.5, unit: 's', dec: 1 }, cap: { label: 'Tope', val: 60, list: [5, 10, 30, 60, 120, 300], unit: 's', dec: 0 }, J: { label: 'Azar (jitter)', val: 0, min: 0, max: 50, step: 5, unit: '%', dec: 0 } } }, q: mcq('¿Para qué sirve añadir un poco de azar a la espera?', ['Para que los nodos no reintenten todos en el mismo instante', 'Para gastar menos memoria', 'Para cifrar', 'Para reducir el tope'], 'Desincroniza a los nodos.') },
      { title: 'Defensa en capas', text: 'Un nodo robusto asume que todo fallará: la red (cola local y reintentos), el propio programa (watchdog que lo reinicia si se cuelga), la alimentación (detector de caída de tensión) y las actualizaciones (dos particiones y vuelta atrás si la nueva no arranca bien).', q: mcq('Una actualización OTA deja el nodo sin WiFi. ¿Qué lo salva sin ir a buscarlo?', ['La vuelta atrás automática a la partición anterior si no se confirma la nueva', 'Un QoS más alto', 'El último testamento', 'Un canal WiFi distinto'], 'Dos particiones y autocomprobación.') }
    ] }
  });

  /* ---------- generadores ---------- */
  Gen.add('io_sleepAvg', () => {
    const Ia = pick([80, 120, 160, 200]), ta = pick([0.5, 1, 2, 3, 5]), Is = pick([10, 20, 50, 150]), T = pick([60, 300, 600, 900]);
    const q = Ia * ta + Is / 1000 * (T - ta), avg = q / T;
    return N(`Un nodo pasa ${fmt(ta)} s despierto a ${Ia} mA y el resto dormido a ${Is} µA. Se despierta cada ${fmt(T / 60)} min. ¿Corriente media en mA?`, avg, 'mA', `Carga por ciclo: ${Ia} × ${fmt(ta)} + ${fmt(Is / 1000, 3)} × ${fmt(T - ta)} = ${fmt(q, 2)} mA·s. Entre ${T} s: ${fmt(avg, 3)} mA.`, Math.max(0.002, avg * 0.03));
  }, 'io_duty');
  Gen.add('io_sleepLife', () => {
    const C = pick([1000, 2000, 2600, 3000]), I = pick([0.05, 0.1, 0.2, 0.5, 1, 2]), d = C / I / 24;
    return N(`Batería de ${C} mAh y consumo medio de ${I < 1 ? fmt(I * 1000) + ' µA' : fmt(I) + ' mA'}. ¿Cuántos días dura en teoría (sin autodescarga)?`, d, 'días', `${C} mAh / ${fmt(I)} mA = ${fmt(C / I, 0)} h; entre 24 = ${fmt(d, 1)} días. En la realidad, la autodescarga, el frío y la tensión mínima del regulador lo recortan bastante.`, d * 0.03);
  }, 'io_duty');
  Gen.add('io_dataMonth', () => {
    const B = pick([40, 80, 120, 200, 500]), s = pick([5, 10, 30, 60, 300]), n = 30 * 86400 / s, mb = B * n / 1e6;
    return N(`Un nodo envía un mensaje de ${B} bytes (cabeceras incluidas) cada ${s} s. ¿Cuántos MB al mes (30 días)?`, mb, 'MB', `Mensajes al mes: 30 × 86 400 / ${s} = ${fmt(n, 0)}. Por ${B} bytes = ${fmt(B * n, 0)} bytes ≈ ${fmt(mb, 2)} MB.`, Math.max(0.01, mb * 0.03));
  }, 'io_arch');
  Gen.add('io_duty', () => {
    const sf = pick([7, 8, 9, 10, 11, 12]), b = pick([4, 10, 20, 40]), t = toaMs(sf, b);
    if (Math.random() < 0.5) {
      const n = Math.floor(36000 / t);
      return N(`LoRaWAN a 868,1 MHz (1 % de ciclo de trabajo). Un mensaje de ${b} bytes con SF${sf} pasa ${fmt(t, 1)} ms en el aire. ¿Cuántos mensajes caben como máximo en una hora?`, n, 'mensajes', `El 1 % de una hora son 36 s = 36 000 ms. 36 000 / ${fmt(t, 1)} = ${fmt(36000 / t, 2)}: caben ${n}.`, 1);
    }
    const w = t * 99 / 1000;
    return N(`Ciclo de trabajo del 1 %: acabas de transmitir ${fmt(t, 1)} ms con SF${sf}. ¿Cuántos segundos debes callar como mínimo en esa sub-banda?`, w, 's', `Para que T sea el 1 % del total, después vienen 99·T de silencio: 99 × ${fmt(t, 1)} ms = ${fmt(w, 2)} s.`, Math.max(0.05, w * 0.02));
  }, 'io_lora');
  Gen.add('io_backoff', () => {
    const base = pick([0.5, 1, 2]), cap = pick([30, 60, 120]), k = ri(1, 9), raw = base * 2 ** (k - 1), w = Math.min(cap, raw);
    return N(`Reconexión con espera exponencial: espera = mín(${fmt(base)} s × 2^(fallos − 1), ${cap} s). Tras ${k} fallo${k > 1 ? 's' : ''} seguido${k > 1 ? 's' : ''}, ¿cuántos segundos espera?`, w, 's', `${fmt(base)} × 2${sup(k - 1)} = ${fmt(raw)} s${raw > cap ? `, que supera el tope: se queda en ${cap} s` : ''}.`, 0.01);
  }, 'io_retry');
  Gen.add('io_jsonSize', () => {
    const F = [['t', () => +(ri(150, 299) / 10).toFixed(1)], ['h', () => ri(20, 90)], ['bat', () => +(ri(301, 419) / 100).toFixed(2)], ['id', () => 'nodo' + ri(1, 9)], ['rssi', () => -ri(40, 90)], ['co2', () => ri(400, 1800)], ['ok', () => true]];
    const k = ri(2, 3), used = [], o = {};
    while (used.length < k) { const f = pick(F); if (!used.includes(f)) used.push(f); }
    used.forEach(([key, g]) => { o[key] = g(); });
    const s = JSON.stringify(o), n = s.length, vals = Object.values(o).map(v => String(v).length).reduce((a, b) => a + b, 0);
    return MC('¿Cuántos bytes ocupa este JSON tal cual (sin espacios ni salto de línea)?', `${n} bytes`, [`${n + 2 * k - 1} bytes`, `${vals} bytes`, `${n - 2} bytes`, `${n * 2} bytes`], `Cada carácter es un byte: llaves, comillas, dos puntos y comas también cuentan. Solo ${vals} de los ${n} bytes son los valores; el resto es “envoltorio”.`, { code: s });
  }, 'io_http');
  Gen.add('io_sampling', () => {
    if (Math.random() < 0.5) {
      const [what, f] = pick([['la red eléctrica (50 Hz)', 50], ['una vibración de 120 Hz', 120], ['un zumbido de 400 Hz', 400], ['la voz (hasta 4000 Hz)', 4000], ['un motor que gira a 30 vueltas por segundo', 30]]);
      return MC(`Quieres capturar ${what}. ¿Frecuencia de muestreo mínima teórica?`, `Más de ${2 * f} Hz`, [`${f} Hz`, `${f / 2} Hz`, `${fmt(1 / f, 4)} Hz`], `Nyquist: más del doble de la frecuencia más alta. En la práctica, de 5 a 10 veces (${5 * f}–${10 * f} Hz) y un filtro antialiasing delante.`);
    }
    const c = pick([1, 2, 3, 4]), fs = pick([10, 100, 500, 1000, 2000]), b = pick([12, 16]), kb = c * fs * b / 1000;
    return N(`${c} canal${c > 1 ? 'es' : ''} a ${fs} muestras/s, ${b} bits por muestra. ¿Cuántos kbit/s en bruto?`, kb, 'kbit/s', `${c} × ${fs} × ${b} = ${fmt(c * fs * b, 0)} bit/s = ${fmt(kb, 2)} kbit/s. Por eso los nodos suelen enviar resúmenes (media, máximo, RMS) y no las muestras.`, Math.max(0.01, kb * 0.02));
  }, 'io_sampling');
  Gen.add('io_subnet', () => {
    const c = ri(0, 2);
    if (c === 0) { const p = pick([22, 23, 24, 25, 26, 27, 28]), h = 2 ** (32 - p) - 2; return N(`¿Cuántos equipos caben en una red /${p}?`, h, 'equipos', `Quedan ${32 - p} bits para equipos: 2${sup(32 - p)} = ${2 ** (32 - p)} direcciones, menos la de red y la de difusión: ${h}.`); }
    if (c === 1) {
      const a = ri(0, 3), b = Math.random() < 0.5 ? a : (a + ri(1, 3)) % 10, x = ri(2, 250), y = ri(2, 250);
      const q = `Máscara 255.255.255.0 (/24). Nodo 192.168.${a}.${x} y broker 192.168.${b}.${y}. ¿Hablan sin pasar por el router?`;
      return a === b ? MC(q, 'Sí: los tres primeros bytes coinciden', ['No: el último byte es distinto', 'No: hace falta una máscara /16', 'Solo si el DNS los conoce'], 'Con /24 la red son los tres primeros bytes; el último es el equipo.') : MC(q, 'No: el tercer byte es distinto, son redes diferentes', ['Sí: los dos empiezan por 192.168', 'Sí: la máscara es la misma', 'Solo si el DNS los conoce'], 'Con /24 deben coincidir los tres primeros bytes; si no, el paquete va a la puerta de enlace.');
    }
    const x = ri(1, 254), net = Math.floor(x / 64) * 64, w32 = Math.floor(x / 32) * 32;
    return MC(`Un equipo tiene 10.0.0.${x} con máscara /26 (255.255.255.192). ¿Cuál es la dirección de su red?`, `10.0.0.${net}`, [`10.0.0.${x}`, `10.0.0.${w32}`, `10.0.0.${(net + 64) % 256}`, '10.0.0.0', `10.0.0.${net + 63}`], `/26 deja 6 bits para equipos: bloques de 64. ${x} cae en el bloque que empieza en ${net} (hasta ${net + 63}, que es la difusión).`);
  }, 'io_net');
  const TOPICS = ['casa/salon/temperatura', 'casa/cocina/temperatura', 'casa/salon/humedad', 'casa/salon/sensor1/temperatura', 'casa/salon', 'casa', 'jardin/salon/temperatura', 'Casa/salon/temperatura', 'casa/cocina/luz/estado', 'casa/cocina/luz/estado/brillo', 'huerto/bancal1/humedad', 'huerto/bancal1/sonda/humedad', '$SYS/broker/uptime', 'casa/garaje/puerta/bateria', 'casa/garaje/bateria', '/casa/salon/temperatura', 'huerto/bancal2/humedad'];
  const FILTERS = ['casa/+/temperatura', 'casa/salon/#', 'casa/#', '+/salon/temperatura', 'casa/+/+/bateria', 'huerto/+/humedad', 'huerto/#', '+/+/temperatura', 'casa/+/luz/#', '#', 'casa/+'];
  Gen.add('io_topicMatch', () => {
    for (let k = 0; k < 50; k++) {
      const f = pick(FILTERS), yes = TOPICS.filter(t => topicMatch(f, t)), no = TOPICS.filter(t => !topicMatch(f, t));
      if (!yes.length || no.length < 3) continue;
      if (Math.random() < 0.5 && no.length) {
        const right = pick(yes), wrong = no.slice().sort(() => Math.random() - 0.5);
        return MC(`Un cliente se suscribe a “${f}”. ¿Cuál de estos temas recibe?`, right, wrong, `“+” es exactamente un nivel; “#” es todo lo que queda (incluso nada), siempre al final. Los temas distinguen mayúsculas y los que empiezan por $ no entran con un comodín inicial.`);
      }
      if (yes.length >= 3) {
        const right = pick(no), wrong = yes.slice().sort(() => Math.random() - 0.5);
        return MC(`Suscripción “${f}”. ¿Cuál de estos temas NO le llega?`, right, wrong, `Compara nivel a nivel: “+” ocupa un nivel, “#” el resto. “${right}” no encaja.`);
      }
    }
    return MC('Suscripción “casa/+/temperatura”. ¿Qué tema recibe?', 'casa/salon/temperatura', ['casa/salon/sensor1/temperatura', 'casa/temperatura', 'Casa/salon/temperatura'], '“+” es exactamente un nivel.');
  }, 'io_topics');
  Gen.add('io_dbm', () => {
    if (Math.random() < 0.5) {
      const a = -ri(4, 7) * 10, d = pick([3, 6, 10, 20]), b = a - d, r = 10 ** (d / 10);
      return MC(`El nodo A recibe ${a} dBm y el B ${b} dBm. ¿Cuánta más potencia le llega a A?`, `Unas ${fmt(r, 0)} veces más`, [`${d} veces más`, `Un ${fmt(d / Math.abs(a) * 100, 0)} % más`, `Unas ${fmt(r * 10, 0)} veces más`, 'La misma: solo cambia el signo'], `Cada 10 dB son ×10 y cada 3 dB, ×2: ${d} dB ≈ ×${fmt(r, 0)}.`);
    }
    const p = pick([20, 10, 0, -10, -20, -30]), mw = 10 ** (p / 10), f = x => (x >= 1 ? fmt(x, 0) : fmt(x, 3)) + ' mW';
    return MC(`¿Cuánta potencia son ${p} dBm?`, f(mw), [f(mw * 10), f(mw / 10), `${Math.abs(p)} mW`, f(mw * 100)], `0 dBm = 1 mW y cada 10 dB multiplica por 10: ${p} dBm = ${f(mw)}.`);
  }, 'io_net');

  /* ---------- visualizaciones ---------- */
  Object.assign(Widgets.VIZ, {
    io_sleep: {
      calc: p => { const ta = Math.min(p.ta, p.T), qa = p.Ia * ta, qs = p.Is / 1000 * (p.T - ta), avg = (qa + qs) / p.T; return { avg, dias: p.C / avg / 24, pSleep: qs / (qa + qs) }; },
      svg: (p, o) => {
        const w = Math.max(3, 122 * Math.min(1, p.ta / p.T));
        let d = 'M20 100'; for (let k = 0; k < 2; k++) { const x = 22 + k * 130; d += `H${x}V40H${x + w}V100`; } d += 'H280';
        const fa = 1 - o.pSleep, wa = 260 * fa;
        return `<svg viewBox="0 0 300 204" class="viz"><path d="M20 108H280" stroke="var(--line)"/><path d="${d}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          <text x="${Math.min(200, 28 + w)}" y="36" class="vizsm">despierto ${num(p.Ia, 0)} mA · ${num(Math.min(p.ta, p.T), 1)} s</text><text x="160" y="94" class="vizsm" text-anchor="middle">dormido ${p.Is} µA</text>
          <text x="280" y="122" class="vizsm" text-anchor="end">dos periodos de ${p.T} s (alturas sin escala)</text>
          <rect x="20" y="132" width="260" height="14" rx="4" fill="var(--ice)"/><rect x="20" y="132" width="${wa}" height="14" rx="4" fill="var(--err)"/>
          <text x="20" y="160" class="vizsm">Carga gastada: ${num(fa * 100, 0)} % despierto · ${num(o.pSleep * 100, 0)} % dormido</text>
          <text x="20" y="182" class="vizlab">Media ${H.fI(o.avg / 1000)} → ${o.dias >= 3650 ? 'más de 10 años' : num(o.dias, 0) + ' días'}</text>
          <text x="20" y="198" class="vizsm">con una batería de ${p.C} mAh</text></svg>`;
      }
    },
    io_mavg: {
      calc: p => {
        const n = 100, W = Math.max(1, Math.round(p.N)), raw = [], f = [];
        for (let i = 0; i < n; i++) raw.push((i < 50 ? 0.25 : 0.75) + p.R * 0.3 * (2 * rnd(i) - 1) + (i === 22 ? 0.4 : 0));
        for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let j = Math.max(0, i - W + 1); j <= i; j++) { s += raw[j]; c++; } f.push(s / c); }
        let e = 0; for (let i = 85; i < n; i++) e += (f[i] - 0.75) ** 2;
        const ruido = Math.sqrt(e / 15) / 0.5 * 100, retardo = Math.ceil(0.9 * W) - 1;
        return { raw, f, ruido, retardo, ok: ruido <= 6 && retardo <= 12 ? 1 : 0 };
      },
      svg: (p, o) => {
        const X = i => 20 + i * 2.6, Y = v => Math.max(12, Math.min(150, 150 - v * 120));
        const pl = a => a.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
        return `<svg viewBox="0 0 300 208" class="viz"><path d="M20 150H280M20 20V150" stroke="var(--line)"/>
          <path d="M${X(0)} ${Y(0.25)}H${X(50)}V${Y(0.75)}H${X(99)}" fill="none" stroke="var(--muted)" stroke-dasharray="4 4"/>
          <polyline points="${pl(o.raw)}" fill="none" stroke="var(--muted)" stroke-width="1.2" opacity=".7"/>
          <polyline points="${pl(o.f)}" fill="none" stroke="var(--led)" stroke-width="3"/>
          <text x="${X(22)}" y="${Y(o.raw[22]) - 4}" class="vizsm" text-anchor="middle">pico</text>
          <text x="20" y="166" class="vizsm">gris: cruda · color: media de ${Math.round(p.N)} (cada 0,1 s)</text>
          <text x="20" y="184" class="vizlab">Ruido restante: ${num(o.ruido, 1)} %</text>
          <text x="20" y="202" class="vizlab">Retardo: ${o.retardo} muestras (${num(o.retardo * 0.1, 1)} s)</text></svg>`;
      }
    },
    io_duty: {
      calc: p => { const t = toaMs(p.SF, p.PL); return { toa: t, espera: t * 99 / 1000, porHora: Math.floor(36000 / t), porDia: Math.floor(30000 / t) }; },
      svg: (p, o) => {
        const ticks = (n, y) => { if (n > 120) return `<rect x="20" y="${y - 8}" width="260" height="16" rx="3" fill="var(--ok)" opacity=".55"/>`; let s = ''; for (let k = 0; k < n; k++) { const x = 20 + 260 * (k + 0.5) / n; s += `<path d="M${x.toFixed(1)} ${y - 8}V${y + 8}" stroke="var(--ok)" stroke-width="2"/>`; } return s; };
        return `<svg viewBox="0 0 300 190" class="viz"><text x="20" y="28" class="vizbig">${num(o.toa, 1)} ms en el aire</text>
          <text x="20" y="46" class="vizsm">SF${p.SF} · ${p.PL} B tuyos + 13 de LoRaWAN</text>
          <text x="20" y="62" class="vizsm">Después, ${num(o.espera, 1)} s en silencio</text>
          <rect x="20" y="74" width="260" height="16" rx="3" fill="var(--line)"/>${ticks(o.porHora, 82)}
          <text x="20" y="106" class="vizsm">1 % legal: ${o.porHora} mensajes por hora</text>
          <rect x="20" y="120" width="260" height="16" rx="3" fill="var(--line)"/>${ticks(Math.min(o.porDia, 500), 128)}
          <text x="20" y="152" class="vizsm">TTN, 30 s de aire al día: ${o.porDia} al día</text>
          <text x="20" y="178" class="vizlab">→ uno cada ${o.porDia ? num(1440 / o.porDia, 1) : '∞'} min como mucho</text></svg>`;
      }
    },
    io_backoff: {
      calc: p => {
        const nodes = [], Hh = 120;
        // Primer intento tras una espera al azar de hasta J % de 10 s; luego espera exponencial con J % de azar
        for (let k = 0; k < 5; k++) { const ts = []; let t = p.J / 100 * 10 * rnd(k * 31 + 7), i = 0; while (t < Hh && i < 80) { ts.push(t); t += 0.5 + Math.min(p.cap, p.base * 2 ** i) * (1 + p.J / 100 * rnd(k * 97 + i * 13 + 1)); i++; } nodes.push(ts); }
        const all = nodes.flatMap((ts, k) => ts.map(t => [t, k])), hit = nodes.map(a => a.map(() => false));
        let pico = 1;
        for (const [t] of all) { const w = all.filter(([u]) => u >= t && u - t < 0.5), ks = new Set(w.map(x => x[1])); pico = Math.max(pico, ks.size); if (ks.size > 1) w.forEach(([u, k]) => { hit[k][nodes[k].indexOf(u)] = true; }); }
        const intentos = Math.max(...nodes.map(n => n.length));
        return { nodes, hit, intentos, pico, ok: intentos <= 10 && pico <= 3 ? 1 : 0 };
      },
      svg: (p, o) => {
        let s = ''; o.nodes.forEach((ts, k) => { const y = 34 + k * 22; s += `<path d="M20 ${y}H280" stroke="var(--line)"/><text x="16" y="${y + 4}" class="vizsm" text-anchor="end">${k + 1}</text>`; ts.forEach((t, i) => { s += `<circle cx="${(20 + t / 120 * 260).toFixed(1)}" cy="${y}" r="4" fill="${o.hit[k][i] ? 'var(--err)' : 'var(--ok)'}"/>`; }); });
        return `<svg viewBox="0 0 300 198" class="viz"><text x="20" y="16" class="vizsm">Cinco nodos tras un corte · de 0 a 120 s</text>${s}
          <text x="20" y="152" class="vizsm">rojo: varios nodos en el mismo medio segundo</text>
          <text x="20" y="172" class="vizlab">Hasta ${o.intentos} intentos por nodo</text>
          <text x="20" y="190" class="vizlab">Pico: ${o.pico} nodo${o.pico > 1 ? 's' : ''} a la vez</text></svg>`;
      }
    }
  });

  /* ---------- programas del ESP32 simulado ---------- */
  Object.assign(ESP_SKETCHES, {
    io_umbral: { name: 'Alarma con histéresis (GPIO34 → GPIO25)', code: `// Nodo de alarma local: sensor en GPIO34 (potenciómetro o divisor con LDR)
// y LED de alarma en GPIO25. Dos umbrales distintos = histéresis.
const int SENSOR = 34, ALARMA = 25;
const int UMBRAL_ON = 2800;   // se activa por encima
const int UMBRAL_OFF = 2400;  // y solo se desactiva por debajo
bool alarma = false;

void setup() {
  pinMode(ALARMA, OUTPUT);
}

void loop() {
  int v = analogRead(SENSOR);          // 0..4095
  if (!alarma && v > UMBRAL_ON) alarma = true;
  if (alarma && v < UMBRAL_OFF) alarma = false;
  digitalWrite(ALARMA, alarma ? HIGH : LOW);
  delay(100);
}`, run: function* (io) { io.mode('D25', 'out'); let alarma = false; for (;;) { const v = io.aread('D34'); if (!alarma && v > 2800) alarma = true; if (alarma && v < 2400) alarma = false; io.write('D25', alarma ? 1 : 0); yield 100; } } },
    io_estado: { name: 'LED de estado de red (GPIO4 → GPIO26)', code: `// LED de estado en GPIO26. Pulsador entre GPIO4 y GND:
// mientras lo mantienes pulsado, "se cae la red".
const int LED = 26, RED_CAIDA = 4;
enum Estado { CONECTANDO, CONECTADO, ERROR_RED };
Estado estado = CONECTANDO;
unsigned long desde = 0;   // instante en que entramos en el estado actual

void setup() {
  pinMode(LED, OUTPUT);
  pinMode(RED_CAIDA, INPUT_PULLUP);
}

void loop() {
  unsigned long ahora = millis();
  bool sinRed = digitalRead(RED_CAIDA) == LOW;
  if (sinRed && estado != ERROR_RED) { estado = ERROR_RED; desde = ahora; }
  if (!sinRed && estado == ERROR_RED) { estado = CONECTANDO; desde = ahora; }
  if (estado == CONECTANDO && ahora - desde >= 3000) { estado = CONECTADO; desde = ahora; }

  unsigned long t = ahora - desde;
  bool on;
  if (estado == CONECTANDO) on = (t / 100) % 2 == 0;     // parpadeo rápido: buscando
  else if (estado == CONECTADO) on = (t % 3000) >= 100;   // fijo, con un guiño cada 3 s
  else {                                                 // error: dos destellos cada 1,5 s
    unsigned long f = t % 1500;
    on = f < 150 || (f >= 300 && f < 450);
  }
  digitalWrite(LED, on ? HIGH : LOW);
  delay(10);
}`, run: function* (io) {
      io.mode('D26', 'out'); io.mode('D4', 'pullup');
      let estado = 0, desde = 0, ms = 0;
      for (;;) {
        const sinRed = io.read('D4') === 0;
        if (sinRed && estado !== 2) { estado = 2; desde = ms; }
        if (!sinRed && estado === 2) { estado = 0; desde = ms; }
        if (estado === 0 && ms - desde >= 3000) { estado = 1; desde = ms; }
        const t = ms - desde; let on;
        if (estado === 0) on = Math.floor(t / 100) % 2 === 0;
        else if (estado === 1) on = (t % 3000) >= 100;
        else { const f = t % 1500; on = f < 150 || (f >= 300 && f < 450); }
        io.write('D26', on ? 1 : 0);
        yield 10; ms += 10;
      }
    } },
    io_dormir: { name: 'Nodo que duerme (GPIO35 → GPIO27)', code: `// Nodo con deep sleep: despierta cada 5 s, mide la luz y "transmite".
// LDR en GPIO35 (divisor con 10 kΩ). LED en GPIO27 = radio encendida.
#include "esp_sleep.h"
const int LDR = 35, RADIO = 27;
RTC_DATA_ATTR int despertares = 0;   // vive en la memoria RTC: sobrevive al deep sleep

void destello(int ms) {
  digitalWrite(RADIO, HIGH); delay(ms);
  digitalWrite(RADIO, LOW);  delay(150);
}

void setup() {
  despertares++;
  pinMode(RADIO, OUTPUT);
  int luz = analogRead(LDR);
  destello(150);                        // envío normal
  if (luz < 1000) destello(150);        // de noche, un segundo destello
  if (despertares % 4 == 0) destello(600);   // cada 4 despertares, "resumen" largo
  esp_sleep_enable_timer_wakeup(5 * 1000000ULL);   // 5 s, en microsegundos
  esp_deep_sleep_start();               // no vuelve: al despertar empieza otra vez setup()
}

void loop() { }                         // nunca se ejecuta`, run: function* (io) {
      let despertares = 0;
      for (;;) {
        despertares++;
        io.mode('D27', 'out');
        const luz = io.aread('D35');
        const destello = function* (ms) { io.write('D27', 1); yield ms; io.write('D27', 0); yield 150; };
        yield* destello(150);
        if (luz < 1000) yield* destello(150);
        if (despertares % 4 === 0) yield* destello(600);
        io.mode('D27', 'in');   // en deep sleep los pines quedan sueltos
        yield 5000;
      }
    } },
    io_media: { name: 'Media móvil (GPIO34 → GPIO19 cruda, GPIO18 filtrada)', code: `// Media móvil de 16 muestras. Potenciómetro en GPIO34.
// LED en GPIO19: lectura cruda. LED en GPIO18: lectura filtrada.
const int N = 16;
int muestras[N];
int idx = 0;
long suma = 0;

void setup() {
  pinMode(18, OUTPUT);
  pinMode(19, OUTPUT);
  for (int i = 0; i < N; i++) muestras[i] = 0;
}

void loop() {
  int v = analogRead(34);
  suma += v - muestras[idx];   // quita la muestra más vieja y suma la nueva
  muestras[idx] = v;
  idx = (idx + 1) % N;
  analogWrite(19, v / 16);            // 0..255
  analogWrite(18, (suma / N) / 16);
  delay(50);                          // 20 muestras por segundo
}`, run: function* (io) {
      io.mode('D18', 'out'); io.mode('D19', 'out');
      const n = 16, m = new Array(n).fill(0); let idx = 0, suma = 0;
      for (;;) {
        const v = io.aread('D34');
        suma += v - m[idx]; m[idx] = v; idx = (idx + 1) % n;
        io.pwm('D19', Math.floor(v / 16) / 255);
        io.pwm('D18', Math.floor(Math.floor(suma / n) / 16) / 255);
        yield 50;
      }
    } },
    io_reintento: { name: 'Reconexión con espera exponencial (GPIO4 → GPIO23)', code: `// Simula cómo reconecta un nodo. LED en GPIO23.
// Pulsador entre GPIO4 y GND: mientras lo mantienes, "el router responde".
const int LED = 23, ROUTER = 4;
const unsigned long BASE = 500, TOPE = 4000;   // ms
unsigned long espera = BASE;

bool intentarConectar() {        // un intento: 200 ms con el LED encendido
  digitalWrite(LED, HIGH);
  delay(200);
  digitalWrite(LED, LOW);
  return digitalRead(ROUTER) == LOW;
}

void setup() {
  pinMode(LED, OUTPUT);
  pinMode(ROUTER, INPUT_PULLUP);
}

void loop() {
  if (intentarConectar()) {
    digitalWrite(LED, HIGH);                        // conectado: LED fijo
    while (digitalRead(ROUTER) == LOW) delay(10);   // hasta que se caiga
    digitalWrite(LED, LOW);
    espera = BASE;                                  // la próxima vez, desde el principio
  } else {
    delay(espera + random(0, espera / 4));          // espera + hasta un 25 % de azar
    espera = min(espera * 2, TOPE);
  }
}`, run: function* (io) {
      io.mode('D23', 'out'); io.mode('D4', 'pullup');
      let espera = 500;
      for (;;) {
        io.write('D23', 1); yield 200; io.write('D23', 0);
        if (io.read('D4') === 0) {
          io.write('D23', 1);
          while (io.read('D4') === 0) yield 10;
          io.write('D23', 0);
          espera = 500;
        } else {
          yield espera + Math.floor(Math.random() * Math.floor(espera / 4));
          espera = Math.min(espera * 2, 4000);
        }
      }
    } }
  });

  /* ---------- comprobaciones de los retos ---------- */
  const ledS = api => api.comps('led').map(c => api.stats.comps[c.id]).filter(Boolean);
  const onPin = (api, type, name, idx) => api.comps(type).some(c => (idx != null ? [idx] : (c._nodes || []).map((_, i) => i)).some(i => api.onArduinoPin(c, i, name)));
  const sano = api => ({ label: 'Ningún componente quemado', ok: !api.model.comps.some(c => c.burnt) });
  const corre = (api, s) => ({ label: `Deja correr la simulación al menos ${s} s`, ok: api.stats.t >= s });
  Object.assign(CHECKS, {
    io_umbral: api => { const s = ledS(api); return [
      { label: 'El cursor del potenciómetro (o el divisor con la LDR) llega al GPIO34', ok: onPin(api, 'pot', 'D34', 1) || onPin(api, 'ldr', 'D34') },
      { label: 'El LED de alarma se ha encendido al subir la lectura', ok: s.some(x => x.maxB > 0.25) },
      { label: 'Y se ha apagado al bajarla (al menos dos cambios)', ok: s.some(x => x.toggles >= 2) },
      sano(api)]; },
    io_estado: api => { const s = ledS(api); return [
      { label: 'Pulsador conectado al GPIO4', ok: onPin(api, 'push', 'D4') },
      { label: 'Con la red caída (pulsado), el LED da destellos', ok: s.some(x => x.onPressed) },
      { label: 'Con red, el LED queda casi fijo', ok: s.some(x => x.onReleased) },
      { label: 'El LED ha cambiado de estado varias veces', ok: s.some(x => x.toggles >= 6) },
      sano(api)]; },
    io_dormir: api => { const s = ledS(api); return [
      { label: 'LDR conectada al GPIO35 (formando un divisor)', ok: onPin(api, 'ldr', 'D35') },
      { label: 'El LED de radio da destellos al despertar', ok: s.some(x => x.toggles >= 4) },
      { label: 'Pasa la mayor parte del tiempo apagado (dormido)', ok: s.some(x => x.onT > 0 && x.offT > 4 * x.onT) },
      corre(api, 12), sano(api)]; },
    io_media: api => { const s = ledS(api); return [
      { label: 'Cursor del potenciómetro en el GPIO34', ok: onPin(api, 'pot', 'D34', 1) },
      { label: 'Dos LEDs que han llegado a brillar', ok: s.filter(x => x.maxB > 0.3).length >= 2 },
      { label: 'Los dos han llegado también casi a apagarse', ok: s.filter(x => x.minB < 0.1).length >= 2 },
      sano(api)]; },
    io_reintento: api => { const s = ledS(api); return [
      { label: 'Pulsador conectado al GPIO4', ok: onPin(api, 'push', 'D4') },
      { label: 'El LED marca varios reintentos', ok: s.some(x => x.toggles >= 4) },
      { label: 'Con el router disponible (pulsado), el LED queda fijo', ok: s.some(x => x.onPressed) },
      corre(api, 10), sano(api)]; }
  });

  /* ---------- proyectos (1/2) ---------- */
  Object.assign(PROJECTS, {
    io_webthermo: {
      intro: 'Tu primer nodo IoT completo y sin nube: un termohigrómetro con ESP32 que sirve su propia página web y una pequeña API JSON. Lo abrirás desde el móvil escribiendo termo.local.',
      level: 1, hours: 4,
      skills: ['Leer un sensor I²C', 'Conectar el ESP32 a tu WiFi sin escribir la clave en el código', 'Servidor HTTP en el nodo', 'API JSON y mDNS'],
      bom: ['ESP32 DevKitC (ESP32-WROOM-32) y cable USB de datos', 'Módulo SHT31 o SHT40 (I²C, 3,3 V)', 'Protoboard y cables', 'Un termómetro de referencia (aunque sea de cocina)', 'Móvil u ordenador en la misma red WiFi'],
      phases: [
        { title: 'Fase 1 · El sensor por el puerto serie', steps: ['Conecta el módulo: VIN a 3V3, GND a GND, SDA al GPIO21 y SCL al GPIO22.', 'Instala la librería Adafruit SHT31 desde el gestor de librerías.', 'Carga el programa y abre el monitor serie a 115 200 baudios.', 'Sopla cerca del sensor y mira cómo sube la humedad; tócalo con un dedo y mira la temperatura.'], checks: ['El programa encuentra el sensor en la dirección 0x44 (o 0x45 si tu módulo tiene el puente cambiado)', 'La temperatura difiere menos de 1 °C del termómetro de referencia tras 10 minutos quieto', 'Al soplar, la humedad sube más de 5 puntos y luego vuelve'], code: `#include <Wire.h>
#include <Adafruit_SHT31.h>

Adafruit_SHT31 sht;

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);                       // SDA, SCL
  if (!sht.begin(0x44)) {
    Serial.println("No encuentro el SHT31: revisa cables y direccion");
    while (true) delay(1000);
  }
}

void loop() {
  Serial.printf("T = %.2f C   HR = %.1f %%\\n", sht.readTemperature(), sht.readHumidity());
  delay(2000);
}` },
        { title: 'Fase 2 · A tu WiFi, sin claves en el código', steps: ['Crea un archivo secrets.h junto al programa con dos #define: WIFI_SSID y WIFI_PASS. Pon en ellos tus datos (en el ejemplo, "TU_RED" y "TU_CLAVE").', 'Si usas git, añade secrets.h al .gitignore antes del primer commit.', 'Conecta en modo estación e imprime la IP y el RSSI.', 'Entra en tu router y reserva esa IP para la MAC del ESP32 (reserva DHCP).'], checks: ['El monitor serie muestra una IP de tu red y un RSSI', 'Desde el ordenador, ping a esa IP responde', 'El RSSI en el sitio donde irá el nodo es mejor que −70 dBm', 'secrets.h no aparece en git status'], code: `#include <WiFi.h>
#include "secrets.h"   // #define WIFI_SSID "TU_RED"  y  #define WIFI_PASS "TU_CLAVE"

void conectarWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Conectando");
  while (WiFi.status() != WL_CONNECTED) { delay(250); Serial.print('.'); }
  Serial.printf("\\nIP: %s   RSSI: %d dBm\\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
}` },
        { title: 'Fase 3 · Página web y API JSON', steps: ['Crea un WebServer en el puerto 80 con dos rutas: “/” (la página) y “/api” (los datos en JSON).', 'Arranca mDNS con el nombre "termo" para poder abrir http://termo.local.', 'La página es pequeña: un título, dos números grandes y un script que pide /api cada 5 s con fetch() y los actualiza.', 'Llama a server.handleClient() en cada vuelta de loop() y no uses delay() largos.'], checks: ['http://termo.local abre la página desde el ordenador (en Android quizá necesites la IP)', 'curl http://termo.local/api devuelve un JSON válido con t, h y rssi', 'Los números de la página cambian sin recargar'], code: `#include <WebServer.h>
#include <ESPmDNS.h>

WebServer server(80);

void enviarApi() {
  char json[96];
  snprintf(json, sizeof json, "{\\"t\\":%.2f,\\"h\\":%.1f,\\"rssi\\":%d}",
           sht.readTemperature(), sht.readHumidity(), WiFi.RSSI());
  server.send(200, "application/json", json);
}

// En setup(), tras conectar:
//   server.on("/api", enviarApi);
//   server.on("/", enviarPagina);   // la escribes tú: HTML + fetch('/api') cada 5 s
//   server.begin();
//   MDNS.begin("termo");
// En loop():
//   server.handleClient();` },
        { title: 'Fase 4 · Medir bien', steps: ['Compara la temperatura con el sensor pegado a la placa y separado 10 cm con cables: el ESP32 se calienta con el WiFi.', 'Añade máximo y mínimo desde el arranque al JSON y a la página.', 'Déjalo 24 h y apunta la curva mínima y máxima del día.'], checks: ['He medido cuántos grados sube el sensor pegado a la placa (anótalo)', 'El JSON incluye tmin y tmax', 'El nodo ha funcionado 24 h sin reiniciarse'] }
      ],
      extra: ['Guarda un dato cada 5 min en un búfer circular de 288 posiciones y dibuja la gráfica de 24 h en la página', 'Sirve la página desde LittleFS en vez de una cadena dentro del código', 'Añade una ruta /salud con el tiempo encendido y la memoria libre']
    },
    io_wifimap: {
      intro: 'Antes de llenar la casa de nodos, mide dónde llega bien el WiFi. Convertirás un ESP32 con una batería USB en un medidor de cobertura y harás el mapa de tu casa.',
      level: 1, hours: 5,
      skills: ['Escanear redes y canales', 'Interpretar RSSI en dBm', 'Elegir canal de 2,4 GHz', 'Planificar dónde van los nodos'],
      bom: ['ESP32 y batería USB (powerbank)', 'Pantalla OLED SSD1306 de 128 × 64 por I²C (opcional, puedes usar el móvil por el puerto serie)', 'Plano de tu casa en papel', 'Cinta métrica'],
      phases: [
        { title: 'Fase 1 · ¿Quién hay en el aire?', steps: ['Carga el escáner y apunta todas las redes con su canal, RSSI y cifrado.', 'Dibuja en un eje los canales 1 a 13 y marca cada red con su anchura (unos 20 MHz: tapa cuatro canales a cada lado).', 'Localiza tu red y mira con cuántas se solapa.'], checks: ['Tengo una tabla con todas las redes visibles y su canal', 'Sé con cuántas redes comparte canal (o se solapa) la mía', 'He detectado si hay alguna red abierta en el vecindario (no te conectes a ella)'], code: `#include <WiFi.h>

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  int n = WiFi.scanNetworks();
  for (int i = 0; i < n; i++)
    Serial.printf("%-24s canal %2d  %4d dBm  %s\\n", WiFi.SSID(i).c_str(), WiFi.channel(i), WiFi.RSSI(i),
                  WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "ABIERTA" : "cifrada");
}

void loop() { }` },
        { title: 'Fase 2 · Un medidor que no miente', steps: ['Conéctate a tu red y lee WiFi.RSSI() cada 100 ms.', 'Muestra la media de las últimas 20 lecturas y el mínimo del último minuto (en la OLED o por serie).', 'Comprueba lo que varía la lectura con el medidor quieto, y girándolo 90°.'], checks: ['Con el medidor quieto la media varía menos de ±3 dB', 'He anotado cuántos dB cambia al girar el ESP32 (la antena impresa es direccional)'] },
        { title: 'Fase 3 · El mapa', steps: ['Mide en una rejilla de puntos cada 2 m, a la altura a la que irán los nodos (enchufes, techo, nevera…).', 'Espera 10 s en cada punto y apunta la media.', 'Colorea el plano: verde ≥ −60 dBm, amarillo de −60 a −70, naranja de −70 a −80 y rojo por debajo.'], checks: ['He medido al menos 15 puntos', 'He marcado los sitios donde irán los nodos y su color', 'He identificado la zona más débil y qué la tapa (paredes de carga, nevera, espejos, agua)'] },
        { title: 'Fase 4 · Mejorar y volver a medir', steps: ['Cambia el canal del router al menos ocupado (en Europa, 1, 5, 9 o 13 no se solapan si todos usan 20 MHz; 1, 6 y 11 es lo habitual).', 'Prueba a mover el router o un punto de acceso, o a fijar el ancho de banda de 2,4 GHz en 20 MHz.', 'Repite las medidas en los puntos amarillos y rojos.'], checks: ['He apuntado la mejora en dB de los tres peores puntos', 'Ningún sitio donde irá un nodo queda por debajo de −75 dBm (o he decidido usar otra tecnología allí)'] }
      ],
      extra: ['Sirve una página con un medidor en directo y úsala desde el móvil', 'Registra RSSI y desconexiones durante una semana y busca a qué hora empeora', 'Mide también el tiempo de conexión desde que arranca el ESP32 hasta tener IP']
    },
    io_doorbell: {
      intro: 'Un timbre que te avisa en el móvil sin pasar por la nube de nadie: el ESP32 manda una petición HTTP a un servidor de notificaciones ntfy que vive en tu Raspberry Pi.',
      level: 2, hours: 6,
      skills: ['Peticiones HTTP POST con cabeceras', 'Pulsadores con cables largos', 'Servidor propio en una Raspberry Pi', 'Acceso remoto con VPN sin abrir puertos'],
      bom: ['ESP32', 'Pulsador de exterior de baja tensión (contacto libre de tensión)', 'Cable de 2 hilos (mejor trenzado o apantallado) de la longitud necesaria', 'Resistencia de 10 kΩ y condensador de 100 nF', 'Raspberry Pi 3B+, 4 o 5 con Raspberry Pi OS (o un PC con Linux)', 'App ntfy en el móvil'],
      phases: [
        { title: 'Fase 0 · Seguridad', steps: ['Muchos timbres de vivienda en España funcionan a 230 V. No toques el timbre existente ni sus cables: este proyecto usa un pulsador nuevo y separado, a 3,3 V.', 'Si quieres aprovechar el timbre de casa, que lo valore un electricista.'], checks: ['Mi pulsador es independiente y solo lleva 3,3 V del ESP32'] },
        { title: 'Fase 1 · Servidor de avisos propio', steps: ['Instala Docker en la Raspberry Pi y arranca ntfy.', 'Reserva la IP de la Pi en el router.', 'En la app ntfy, añade tu servidor (http://IP-de-la-Pi) y suscríbete a un tema difícil de adivinar.', 'Prueba con curl desde el ordenador.'], checks: ['La notificación de prueba llega al móvil en menos de 2 s estando en casa', 'El tema no es una palabra obvia como “timbre”'], code: `# En la Raspberry Pi (con Docker instalado)
docker run -d --name ntfy --restart unless-stopped -p 80:80 \\
  -v /srv/ntfy:/var/cache/ntfy binwiederhier/ntfy serve

# Prueba desde otro equipo de la red (cambia IP y tema)
curl -H "Title: Timbre" -d "Alguien llama" http://192.168.1.10/timbre-k7q2` },
        { title: 'Fase 2 · Un pulsador que no se inventa llamadas', steps: ['Pulsador entre el GPIO27 y GND, con 10 kΩ externa a 3V3 (la interna de unos 45 kΩ es floja para cables largos) y 100 nF entre el pin y GND junto al ESP32.', 'Detecta el flanco de bajada con antirrebote de 50 ms.', 'Ignora nuevas pulsaciones durante 10 s tras un aviso.'], checks: ['20 pulsaciones separadas generan exactamente 20 eventos en el monitor serie', 'Con el cable de exterior conectado, ningún evento falso en 1 hora'] },
        { title: 'Fase 3 · El aviso', steps: ['Envía un POST a ntfy con título, prioridad alta y una etiqueta.', 'Pon un tiempo máximo de 3 s a la petición y comprueba el código de estado.', 'Si falla, reintenta dos veces más con 1 y 2 s de espera, sin bloquear el pulsador.'], checks: ['El aviso llega al móvil en menos de 2 s desde la pulsación', 'Con el servidor apagado, el ESP32 registra el error y sigue respondiendo al pulsador'], code: `#include <HTTPClient.h>

bool avisar(const char* texto) {
  HTTPClient http;
  http.begin("http://192.168.1.10/timbre-k7q2");   // IP reservada de tu Pi y tu tema
  http.setTimeout(3000);
  http.addHeader("Title", "Timbre");
  http.addHeader("Priority", "high");
  http.addHeader("Tags", "bell");
  int codigo = http.POST((uint8_t*)texto, strlen(texto));
  http.end();
  return codigo == 200;
}` },
        { title: 'Fase 4 · Fuera de casa, sin abrir puertos', steps: ['Instala WireGuard en la Pi (o usa el servidor VPN de tu router).', 'En el móvil, activa la VPN cuando salgas: la app ntfy verá tu servidor como si estuvieras en casa.', 'No redirijas el puerto 80 del router a la Pi.', 'Ten en cuenta que en iPhone las notificaciones instantáneas de un servidor propio necesitan configuración extra (lee la documentación de ntfy).'], checks: ['Con datos móviles y la VPN activa, el aviso llega', 'Un escaneo de puertos de tu IP pública desde fuera solo muestra el puerto UDP de WireGuard (o ninguno)'] }
      ],
      extra: ['Modo “no molestar” por horario', 'Registro de llamadas en un archivo de la Pi', 'Un zumbador interior que suena aunque no haya red']
    },
    io_eink: {
      intro: 'Un panel de tinta electrónica que muestra la previsión del tiempo y tus sensores de casa. Solo gasta al cambiar la imagen, así que puede ir a batería semanas.',
      level: 3, hours: 12,
      skills: ['Pantallas e-paper por SPI', 'HTTPS y JSON grandes con filtro', 'Diseño de información', 'Deep sleep alineado con el reloj'],
      bom: ['ESP32 (mejor una placa de bajo consumo en reposo)', 'Pantalla e-paper de 4,2" (400 × 300) o 2,9" con adaptador SPI', 'Batería LiPo de 1000–2000 mAh con cargador y protección', 'Marco o caja (impresa en 3D o de madera)', 'Divisor de 2 × 100 kΩ y 100 nF para medir la batería'],
      phases: [
        { title: 'Fase 1 · Dibujar', steps: ['Cablea el SPI: CLK al GPIO18, DIN al GPIO23, CS al 5, DC al 17, RST al 16 y BUSY al 4; alimentación a 3V3.', 'Instala GxEPD2 y elige en sus ejemplos la clase exacta de tu panel (cambia según modelo y versión del panel).', 'Escribe un texto grande y cronometra el refresco completo.', 'Desenchufa: la imagen se queda.'], checks: ['El texto aparece nítido', 'He cronometrado el refresco completo (varios segundos) y el parcial, si mi panel lo admite', 'La imagen sigue ahí sin alimentación'], code: `#include <GxEPD2_BW.h>
#include <Fonts/FreeSansBold18pt7b.h>

// Sustituye la clase por la de TU panel (mira los ejemplos de GxEPD2)
GxEPD2_BW<GxEPD2_420_GDEY042T81, GxEPD2_420_GDEY042T81::HEIGHT>
  epd(GxEPD2_420_GDEY042T81(/*CS*/ 5, /*DC*/ 17, /*RST*/ 16, /*BUSY*/ 4));

void setup() {
  epd.init(115200);
  epd.setFont(&FreeSansBold18pt7b);
  epd.setTextColor(GxEPD_BLACK);
  epd.setFullWindow();
  epd.firstPage();
  do {
    epd.fillScreen(GxEPD_WHITE);
    epd.setCursor(20, 60);
    epd.print("Hola, panel");
  } while (epd.nextPage());
  epd.hibernate();          // la pantalla deja de consumir
}

void loop() { }` },
        { title: 'Fase 2 · Datos de internet, solo los que necesitas', steps: ['Pide la previsión a Open-Meteo (no necesita clave) con tus coordenadas.', 'Usa HTTPS con WiFiClientSecure y el certificado raíz de su autoridad (descárgalo desde el navegador); evita setInsecure().', 'Filtra el JSON al deserializar: guarda solo los campos que vas a pintar.', 'Imprime la memoria libre antes y después para ver lo que ahorras.'], checks: ['Las temperaturas coinciden con la web de Open-Meteo', 'He medido la memoria libre con y sin filtro', 'Si no hay red, el programa no se cuelga: lo indica y vuelve a dormir'], code: `// Dentro de la función que actualiza (WiFi ya conectado)
HTTPClient http;
http.useHTTP10(true);   // sin "chunked": ArduinoJson puede leer del flujo directamente
http.begin(cliente, "https://api.open-meteo.com/v1/forecast?latitude=40.42&longitude=-3.70"
  "&current=temperature_2m,weather_code"
  "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max"
  "&timezone=Europe%2FMadrid&forecast_days=3");
if (http.GET() == 200) {
  JsonDocument filtro;
  filtro["current"]["temperature_2m"] = true;
  filtro["current"]["weather_code"] = true;
  filtro["daily"]["temperature_2m_max"] = true;
  filtro["daily"]["temperature_2m_min"] = true;
  filtro["daily"]["precipitation_probability_max"] = true;
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, http.getStream(), DeserializationOption::Filter(filtro));
  if (!err) {
    float ahora = doc["current"]["temperature_2m"];
    int maniana = doc["daily"]["temperature_2m_max"][1];
    // ... guarda lo que vas a pintar
  }
}
http.end();` },
        { title: 'Fase 3 · Diseño', steps: ['Boceto en papel a tamaño real: temperatura actual enorme, tres días de previsión, tus sensores (por ejemplo, la API del termómetro del primer proyecto o un tema MQTT) y la hora de la última actualización.', 'Convierte weather_code (códigos de la OMM) en iconos sencillos: despejado, nubes, niebla, lluvia, nieve, tormenta.', 'Añade el nivel de batería con un icono.'], checks: ['Se lee desde 2 m', 'La hora de la última actualización está visible (si se para, lo sabrás)', 'He comprobado al menos cuatro tipos de tiempo distintos con códigos de prueba'] },
        { title: 'Fase 4 · A batería', steps: ['Tras pintar, pon la pantalla en hibernación y el ESP32 en deep sleep hasta la siguiente media hora en punto (calcúlalo con la hora de NTP).', 'De 23:00 a 7:00 no actualices: duerme hasta las 7.', 'Mide la corriente dormido con el multímetro en serie con la batería y la corriente media de un ciclo.', 'Calcula la autonomía y compárala con la real.'], checks: ['He medido la corriente en reposo de mi placa (anótala: muchas placas de desarrollo gastan miliamperios por su regulador y su chip USB)', 'He calculado la autonomía prevista', 'El panel se actualiza a la hora prevista durante 3 días'] }
      ],
      extra: ['Un botón que despierta el panel y fuerza la actualización (ext0)', 'Mostrar el CO₂ del monitor del módulo de MQTT', 'Refresco parcial para un reloj sin parpadeos']
    },
    io_co2: {
      intro: 'Un medidor de CO₂ de verdad (NDIR) que te dice cuándo ventilar el aula o la habitación, con semáforo local y datos por MQTT. Medirás cómo se renueva el aire de tu casa.',
      level: 2, hours: 8,
      skills: ['Sensor NDIR por I²C', 'Umbrales con histéresis', 'MQTT con retenidos y último testamento', 'Calibración y validación de un sensor'],
      bom: ['ESP32', 'Sensirion SCD41 en módulo I²C (mide de 400 a 5000 ppm; el SCD40 llega solo a 2000)', 'Tres LEDs (verde, ámbar, rojo) con 220 Ω, o un LED RGB', 'Zumbador activo de 3,3 V (opcional)', 'Broker MQTT en tu red (el del proyecto del broker o Mosquitto en un PC)', 'Evita los módulos MQ-135 “de CO₂”: no miden CO₂, reaccionan a muchos gases'],
      phases: [
        { title: 'Fase 1 · Leer el SCD41', steps: ['Conecta VDD a 3V3, GND, SDA al 21 y SCL al 22.', 'Instala la librería “Sensirion I2C SCD4x” y arranca la medida periódica (un dato cada 5 s).', 'Pon el sensor junto a una ventana abierta 5 minutos y luego respira cerca.'], checks: ['Junto a la ventana marca entre 400 y 480 ppm', 'Respirando cerca sube por encima de 1500 ppm y luego baja', 'Las lecturas llegan cada 5 s sin errores'], code: `#include <Wire.h>
#include <SensirionI2cScd4x.h>     // API de la versión 1 de la librería

SensirionI2cScd4x scd;

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  scd.begin(Wire, SCD41_I2C_ADDR_62);
  scd.stopPeriodicMeasurement();    // por si venía midiendo de antes
  delay(500);
  scd.startPeriodicMeasurement();   // un dato nuevo cada 5 s
}

void loop() {
  bool listo = false;
  scd.getDataReadyStatus(listo);
  if (listo) {
    uint16_t co2; float t, h;
    if (scd.readMeasurement(co2, t, h) == 0)
      Serial.printf("CO2 %u ppm   T %.1f C   HR %.0f %%\\n", co2, t, h);
  }
  delay(500);
}` },
        { title: 'Fase 2 · Semáforo sin parpadeos', steps: ['Verde por debajo de 800 ppm, ámbar hasta 1200 y rojo por encima (valores orientativos para interiores).', 'Usa histéresis de 50 ppm: para volver a verde hay que bajar de 750.', 'El zumbador suena una sola vez al entrar en rojo, no sin parar.'], checks: ['Cerca de un umbral, el color no cambia arriba y abajo', 'El zumbador suena una vez por cada entrada en rojo'] },
        { title: 'Fase 3 · Publicar por MQTT', steps: ['Tema de estado: casa/dormitorio/co2/estado con JSON {"co2":…,"t":…,"h":…}, retenido, cada 30 s.', 'Al conectar, deja un último testamento: casa/dormitorio/co2/disponible = "offline" retenido; justo después publica "online" retenido.', 'Comprueba con mosquitto_sub -v -t "casa/#".'], checks: ['Un cliente que se suscribe tarde recibe al momento el último estado', 'Al desenchufar el ESP32, “offline” aparece en menos de 1,5 veces el keepalive', 'El JSON cabe en el búfer de PubSubClient (amplíalo con setBufferSize si no)'], code: `// PubSubClient: connect(id, usuario, clave, temaWill, qosWill, retenidoWill, mensajeWill)
bool conectarMqtt() {
  if (!mqtt.connect("co2-dormitorio", MQTT_USER, MQTT_PASS,
                    "casa/dormitorio/co2/disponible", 1, true, "offline"))
    return false;
  mqtt.publish("casa/dormitorio/co2/disponible", "online", true);
  return true;
}

void publicar(uint16_t co2, float t, float h) {
  char json[64];
  snprintf(json, sizeof json, "{\\"co2\\":%u,\\"t\\":%.1f,\\"h\\":%.0f}", co2, t, h);
  mqtt.publish("casa/dormitorio/co2/estado", json, true);   // retenido
}` },
        { title: 'Fase 4 · Calibrar y experimentar', steps: ['El SCD41 se autocalibra suponiendo que al menos una vez por semana ve aire exterior (unos 420 ppm). Si nunca ventilas del todo, desactiva la autocalibración y haz una recalibración forzada al aire libre.', 'Coloca el sensor a la altura de la cabeza, lejos de ventanas y de la boca de nadie.', 'Experimento: con la habitación ocupada y cerrada, deja que suba a 1200 ppm; abre la ventana y cronometra cuánto tarda en bajar a 800.'], checks: ['Tras la calibración, al aire libre marca entre 400 y 460 ppm', 'Tengo la curva de subida y bajada en el broker o en una hoja de cálculo', 'He calculado las renovaciones de aire por hora a partir de la bajada (pista: es una exponencial hacia el valor exterior)'] }
      ],
      extra: ['Pantalla e-ink con el valor y la tendencia', 'Versión a batería con medida de disparo único (single shot)', 'Ventilador o aviso automático combinado con el contador de personas']
    },
    io_broker: {
      intro: 'El corazón de tu sistema: un broker Mosquitto en una Raspberry Pi, con usuarios, permisos mínimos para cada nodo y TLS con tu propia autoridad de certificación.',
      level: 3, hours: 8,
      skills: ['Instalar y configurar Mosquitto', 'Listas de control de acceso (ACL)', 'Certificados con OpenSSL', 'Mantenimiento: copias, cortafuegos y registros'],
      bom: ['Raspberry Pi 4 o 5 (o un PC con Linux) con Raspberry Pi OS Lite', 'Tarjeta microSD de 32 GB de buena calidad o, mejor, un SSD por USB', 'Fuente de alimentación oficial', 'Cable de red', 'Un ESP32 para las pruebas'],
      phases: [
        { title: 'Fase 1 · Instalar y cerrar la puerta', steps: ['Instala con sudo apt install mosquitto mosquitto-clients.', 'Desde la versión 2, Mosquitto solo escucha en el propio equipo hasta que defines un listener. Crea el archivo de configuración de abajo.', 'Crea los usuarios con mosquitto_passwd (uno por nodo y uno para el panel).', 'Reinicia el servicio y mira el registro con journalctl -u mosquitto si no arranca.'], checks: ['Una conexión sin usuario es rechazada', 'Con usuario y clave, mosquitto_sub recibe lo que publica mosquitto_pub desde otro equipo', 'Suscrito a $SYS/broker/clients/connected veo cuántos clientes hay'], code: `# /etc/mosquitto/conf.d/casa.conf
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd
acl_file /etc/mosquitto/acl

# Usuarios (la -c crea el archivo: úsala solo la primera vez)
#   sudo mosquitto_passwd -c /etc/mosquitto/passwd panel
#   sudo mosquitto_passwd /etc/mosquitto/passwd salon
#   sudo systemctl restart mosquitto` },
        { title: 'Fase 2 · Mínimo privilegio', steps: ['Cada nodo usa como usuario el nombre de su habitación y solo puede escribir en casa/<su nombre>/… y leer sus órdenes.', 'El panel lee todo y solo escribe órdenes.', 'Prueba a publicar con las credenciales de “salon” en un tema de la cocina.'], checks: ['El mensaje de “salon” en casa/cocina/… no le llega a nadie (en MQTT 3 el broker lo descarta en silencio)', 'El panel recibe los datos de todas las habitaciones', 'Un nodo no puede leer las órdenes de otro'], code: `# /etc/mosquitto/acl
user panel
topic read casa/#
topic write casa/+/cmd/#

# Para el resto de usuarios: %u se sustituye por su nombre de usuario
pattern write casa/%u/#
pattern read casa/%u/cmd/#` },
        { title: 'Fase 3 · TLS con tu propia autoridad', steps: ['Crea una autoridad de certificación (CA) propia y guarda su clave privada fuera de la Pi.', 'Emite el certificado del broker con su nombre y su IP en subjectAltName.', 'Añade un listener 8883 con cafile, certfile y keyfile.', 'En el ESP32 usa WiFiClientSecure con setCACert(ca.crt) y conecta al 8883.', 'Compara con Wireshark una conexión al 1883 y otra al 8883.'], checks: ['mosquitto_sub --cafile ca.crt -p 8883 funciona', 'Con otra CA, la conexión falla (bien)', 'En el 1883 se ve el usuario y la clave en claro; en el 8883, no'], code: `# Autoridad propia (guarda ca.key en un sitio seguro, fuera del broker)
openssl req -x509 -new -nodes -newkey rsa:2048 -keyout ca.key -out ca.crt \\
  -days 3650 -subj "/CN=CA de casa"

# Certificado del broker, válido para su nombre y su IP
openssl req -new -nodes -newkey rsa:2048 -keyout broker.key -out broker.csr -subj "/CN=broker.local"
printf "subjectAltName=DNS:broker.local,IP:192.168.1.10\\n" > san.ext
openssl x509 -req -in broker.csr -CA ca.crt -CAkey ca.key -CAcreateserial \\
  -out broker.crt -days 825 -extfile san.ext

# En casa.conf:
#   listener 8883
#   cafile /etc/mosquitto/certs/ca.crt
#   certfile /etc/mosquitto/certs/broker.crt
#   keyfile /etc/mosquitto/certs/broker.key` },
        { title: 'Fase 4 · Mantenimiento', steps: ['Cuando todos los nodos usen TLS, deja el 1883 solo para el propio equipo (listener 1883 127.0.0.1).', 'Cortafuegos: permite el 8883 solo desde tu red local (por ejemplo con ufw).', 'Copia de seguridad de /etc/mosquitto en otro equipo y prueba a restaurarla.', 'Apunta en un calendario la caducidad del certificado del broker.'], checks: ['Tras reiniciar la Pi, el broker arranca solo', 'Un escaneo con nmap desde la red local solo muestra SSH y el 8883', 'He restaurado la configuración desde la copia en una tarjeta nueva'] }
      ],
      extra: ['MQTT sobre WebSocket para un panel en el navegador', 'Puente (bridge) a un segundo broker', 'Certificados de cliente para cada nodo (TLS mutuo)']
    },
    io_fridge: {
      intro: 'Un vigilante para la nevera y el congelador: dos sondas, sensor de puerta y alarma local que funciona aunque se caiga la red, más avisos al móvil si algo va mal.',
      level: 2, hours: 6,
      skills: ['Bus 1-Wire con varias sondas', 'Calibración con baño de hielo', 'Alarmas con retardo para evitar falsos positivos', 'Latido y detección de silencio'],
      bom: ['ESP32', '2 sondas DS18B20 estancas (con cable fino)', 'Resistencia de 4,7 kΩ', 'Interruptor magnético (reed) e imán para la puerta', 'Zumbador activo (con un transistor si consume más de 10 mA)', 'Broker MQTT y Home Assistant o Node-RED para los avisos'],
      phases: [
        { title: 'Fase 1 · Dos sondas en un hilo', steps: ['Une los datos de las dos sondas al GPIO4 con 4,7 kΩ a 3V3; VDD a 3V3 y GND a GND.', 'Lee las direcciones de 64 bits y etiqueta cada sonda (nevera y congelador).', 'Baño de hielo: un vaso lleno de hielo picado con un poco de agua, removido 3 minutos. Mete las dos sondas.'], checks: ['El programa encuentra dos direcciones distintas', 'En el baño de hielo las dos marcan 0 °C ± 0,5 °C (si no, guarda una corrección)'], code: `#include <OneWire.h>
#include <DallasTemperature.h>

OneWire bus(4);
DallasTemperature sondas(&bus);

void setup() {
  Serial.begin(115200);
  sondas.begin();
  Serial.printf("Sondas: %d\\n", sondas.getDeviceCount());
  DeviceAddress dir;
  for (int i = 0; i < sondas.getDeviceCount(); i++) {
    sondas.getAddress(dir, i);
    for (int b = 0; b < 8; b++) Serial.printf("%02X", dir[b]);
    Serial.println();               // copia estas direcciones a tu programa
  }
}

void loop() {
  sondas.requestTemperatures();
  Serial.printf("%.2f  %.2f\\n", sondas.getTempCByIndex(0), sondas.getTempCByIndex(1));
  delay(2000);
}` },
        { title: 'Fase 2 · Alarma local con paciencia', steps: ['Alarma si la nevera pasa de 8 °C o el congelador de −12 °C durante más de 15 minutos seguidos.', 'Alarma si la puerta lleva abierta más de 2 minutos.', 'Esta lógica corre en el ESP32 y no depende de la red.'], checks: ['Calentando una sonda con la mano, la alarma salta tras el tiempo configurado y no antes', 'Puerta abierta 2 minutos → pita; al cerrar, se calla'] },
        { title: 'Fase 3 · Telemetría y silencio sospechoso', steps: ['Publica las temperaturas cada 60 s y los cambios de la puerta al instante.', 'Usa último testamento para el estado de conexión.', 'En Home Assistant o Node-RED, crea un aviso si no llegan datos en 10 minutos (el nodo puede estar colgado o sin luz).'], checks: ['Al desenchufar el ESP32, el aviso de “sin datos” llega al móvil en 10–12 minutos', 'Abrir la puerta aparece en el panel en menos de 2 s'] },
        { title: 'Fase 4 · Instalación', steps: ['Pasa el cable plano por la junta sin aplastarla: comprueba el cierre con una hoja de papel (debe costar sacarla).', 'Mete cada sonda en un frasco pequeño con agua (o agua con glicerina en el congelador): medirás la temperatura de la comida, no los picos del aire al abrir.', 'Déjalo 48 h y mira la gráfica.'], checks: ['La prueba del papel pasa en la zona del cable', 'En la gráfica se ven los ciclos del compresor', 'He calculado qué porcentaje del tiempo funciona el compresor'] }
      ],
      extra: ['Avisar si el ciclo del compresor se alarga mucho respecto a la media (aviso temprano de avería)', 'Detectar cortes de luz con una batería USB y la lectura de VBUS']
    },
    io_weather: {
      intro: 'Una estación meteorológica de verdad: a batería con panel solar, con viento, lluvia, temperatura, humedad y presión, y su propio servidor con InfluxDB y Grafana en casa.',
      level: 4, hours: 30,
      skills: ['Sensores de pulsos e interrupciones', 'Deep sleep con despertar por evento', 'Telegraf, InfluxDB y Grafana', 'Energía solar e intemperie'],
      bom: ['ESP32 de bajo consumo en reposo', 'BME280 (temperatura, humedad y presión)', 'Kit de anemómetro, veleta y pluviómetro de cazoletas con contactos reed', 'Panel solar de 6 V y 2 W con cargador solar para Li-ion (por ejemplo, un módulo CN3791)', 'Batería 18650 con protección y portapilas', 'Caja estanca y garita de lamas (impresa en 3D) para el sensor', 'Raspberry Pi con Docker'],
      phases: [
        { title: 'Fase 1 · Sensores en la mesa', steps: ['BME280 por I²C (dirección 0x76 o 0x77).', 'Pluviómetro: contacto reed entre un pin y GND con pull-up; cada vuelco es una cantidad fija de lluvia (mira la hoja de tu kit; en muchos es de unos 0,28 mm).', 'Anemómetro: cuenta pulsos durante 3 s; la hoja del kit da los km/h por pulso por segundo.', 'Veleta: es un juego de resistencias; léela con un divisor y el ADC y haz una tabla de tensión a dirección.'], checks: ['Con una jeringa, 10 vuelcos del pluviómetro cuentan exactamente 10', 'Girando el anemómetro a mano, la velocidad cambia de forma creíble', 'Las 8 direcciones principales de la veleta se distinguen sin ambigüedad'] },
        { title: 'Fase 2 · La tubería de datos', steps: ['En la Pi, un docker compose con Mosquitto, InfluxDB, Telegraf y Grafana.', 'El nodo publica un JSON en meteo/jardin/estado.', 'Telegraf se suscribe y escribe en InfluxDB; las contraseñas van en variables de entorno, no en el archivo.', 'En Grafana, un panel con temperatura, humedad, presión, viento y lluvia.'], checks: ['Una consulta en InfluxDB devuelve los últimos datos del nodo', 'El panel de Grafana se actualiza solo', 'Ninguna contraseña aparece escrita en los archivos de configuración'], code: `# telegraf.conf (fragmento)
[[inputs.mqtt_consumer]]
  servers = ["tcp://mosquitto:1883"]
  topics = ["meteo/+/estado"]
  username = "telegraf"
  password = "\${MQTT_PASS}"
  data_format = "json"

[[outputs.influxdb_v2]]
  urls = ["http://influxdb:8086"]
  token = "\${INFLUX_TOKEN}"
  organization = "casa"
  bucket = "meteo"` },
        { title: 'Fase 3 · Dormir sin perder la lluvia', steps: ['El nodo despierta cada 5 minutos por temporizador, mide viento durante 3 s, lee el BME280, publica y duerme.', 'El pluviómetro debe despertar al chip en cada vuelco (ext0 en un pin RTC): suma 1 a un contador en memoria RTC y vuelve a dormir enseguida, sin WiFi.', 'Mide la corriente media con el multímetro y un ciclo completo.'], checks: ['Con el nodo durmiendo, 5 vuelcos aparecen en el siguiente envío', 'Corriente media medida por debajo de 1 mA (o sé exactamente qué la sube)', 'He calculado la autonomía sin sol: al menos 2 semanas con la batería elegida'] },
        { title: 'Fase 4 · Sol y caja', steps: ['Conecta el panel al cargador solar y este a la batería; el ESP32 se alimenta de la batería a través de un LDO de bajo consumo.', 'Mide la batería con un divisor de 100 kΩ + 100 kΩ y 100 nF al ADC y publícala.', 'Pon el BME280 dentro de la garita de lamas, a 1,5 m del suelo y lejos de paredes.', 'Las baterías de litio no deben cargarse bajo 0 °C ni pasar mucho calor: protege la caja del sol directo.'], checks: ['7 días funcionando solo con el sol', 'La batería termina los días soleados más cargada que al empezar', 'Al sol, la temperatura de la garita no se dispara respecto a una sombra cercana (menos de 1 °C de diferencia)'] },
        { title: 'Fase 5 · Panel y alertas', steps: ['Lluvia diaria acumulada (suma por día), racha máxima de viento y tendencia de presión de 3 h.', 'Alerta de helada (por debajo de 1 °C) que avisa al móvil con ntfy.', 'Retención: datos crudos 30 días y medias horarias para siempre.'], checks: ['La alerta de helada se ha probado con un valor simulado', 'La política de retención y el resumen horario están configurados y funcionan'] }
      ],
      extra: ['Calcula el punto de rocío y la sensación térmica', 'Compara tus datos con la estación oficial más cercana', 'Si compartes datos en una red pública, piensa qué revela tu ubicación exacta']
    },
    io_energy: {
      intro: 'Mide el consumo eléctrico de tu casa sin tocar la red: leyendo los destellos del LED del contador inteligente. Si quieres más detalle, una pinza amperimétrica instalada por un electricista.',
      level: 3, hours: 14,
      skills: ['Interrupciones y medida de tiempos', 'Energía, potencia y tarifas', 'Persistencia sin gastar la flash', 'Medida de corriente alterna con transformador de corriente'],
      bom: ['ESP32', 'Módulo con fototransistor (por ejemplo TEMT6000) o fotodiodo con comparador', 'Cinta adhesiva opaca o ventosa para fijarlo sobre el LED del contador', 'Opcional, solo con electricista: pinza SCT-013-030 (salida de tensión, 30 A → 1 V), conector jack de 3,5 mm, 2 × 10 kΩ y 10 µF'],
      phases: [
        { title: 'Fase 0 · Seguridad', steps: ['No abras el cuadro eléctrico ni la tapa del contador: el contador es de la distribuidora y la red de 230 V puede matar.', 'La fase óptica solo pega un sensor por fuera, sobre el LED.', 'La pinza amperimétrica se instala alrededor de un solo conductor dentro del cuadro: eso lo hace un electricista autorizado, no tú.', 'Nada de este proyecto se conecta directamente a 230 V.'], checks: ['He entendido qué partes puedo hacer yo y cuáles no'] },
        { title: 'Fase 1 · Leer los destellos', steps: ['Busca en el contador el LED y su constante (por ejemplo “1000 imp/kWh”).', 'Fija el sensor sobre el LED tapando la luz ambiente.', 'Cada destello genera una interrupción; filtra rebotes de menos de 20 ms y mide el tiempo entre destellos.', 'Potencia (W) = 3 600 000 / (imp/kWh × segundos entre destellos).'], checks: ['Con un hervidor encendido, la potencia medida coincide con su placa (±5 %, más lo que ya consumía la casa)', 'En una hora, los pulsos contados coinciden con lo que avanza el contador'], code: `const int PIN_SENSOR = 27;
const float IMP_KWH = 1000.0;               // mira la serigrafía de TU contador

portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;
volatile uint32_t pulsos = 0, ultimoUs = 0, periodoUs = 0;

void IRAM_ATTR alDestello() {
  uint32_t ahora = micros();
  if (ahora - ultimoUs < 20000) return;     // antirrebote de 20 ms
  portENTER_CRITICAL_ISR(&mux);
  periodoUs = ahora - ultimoUs;
  ultimoUs = ahora;
  pulsos++;
  portEXIT_CRITICAL_ISR(&mux);
}

float potenciaW() {   // 1 kWh = 3,6e6 J; un destello = 3,6e6 / IMP_KWH julios
  portENTER_CRITICAL(&mux);
  uint32_t p = periodoUs;
  portEXIT_CRITICAL(&mux);
  return p ? 3.6e12 / (IMP_KWH * p) : 0;   // p en microsegundos
}

// setup(): pinMode(PIN_SENSOR, INPUT);
//          attachInterrupt(digitalPinToInterrupt(PIN_SENSOR), alDestello, RISING);` },
        { title: 'Fase 2 · Energía y publicación', steps: ['Cuenta los kWh del día y ponlos a cero a medianoche con la hora de NTP.', 'Guarda el contador en la memoria no volátil (Preferences) una vez por hora, no en cada pulso: la flash se desgasta.', 'Si pasa mucho tiempo sin destellos, la potencia es como mucho la de “un destello en ese tiempo”: publícalo así, no como cero.', 'Publica potencia y energía por MQTT.'], checks: ['La energía del día coincide con la diferencia del contador (±1 %)', 'Un reinicio no pierde más de una hora de cuenta'] },
        { title: 'Fase 3 · Panel y tarifas', steps: ['En Grafana, potencia en directo y energía por día.', 'Separa el consumo por periodos de la tarifa 2.0TD: punta (10–14 h y 18–22 h laborables), llano (8–10, 14–18 y 22–24 h laborables) y valle (0–8 h laborables, fines de semana y festivos nacionales).', 'Busca tu consumo base: la potencia mínima de madrugada.'], checks: ['Tengo los kWh de una semana separados por periodos', 'He encontrado al menos un aparato en espera que gasta más de lo que pensaba'] },
        { title: 'Fase 4 · Pinza amperimétrica (con electricista)', steps: ['El electricista coloca la SCT-013-030 alrededor de un solo conductor (si abrazas fase y neutro juntos, los campos se anulan y mide cero).', 'Polariza la entrada del ADC a la mitad (1,65 V) con dos 10 kΩ y 10 µF; la pinza va en serie con ese punto medio.', 'Toma unas 2000 muestras por segundo durante 200 ms (10 ciclos de 50 Hz), resta la media y calcula el valor eficaz.', 'Compara con la lectura óptica usando una carga resistiva (hervidor).'], checks: ['Sin carga, el ruido es menor de 0,1 A', 'Con el hervidor, I × 230 V coincide con la potencia óptica (±10 %)', 'Sé por qué sin medir la tensión obtengo potencia aparente y no activa'] }
      ],
      extra: ['Reconocer aparatos por su escalón de potencia', 'Añadir la tensión con un transformador de 9 V de alterna enchufable para calcular potencia activa y factor de potencia']
    },
    io_people: {
      intro: 'Un contador de entradas y salidas para una puerta que no usa cámaras: dos sensores de distancia por láser deducen la dirección. Privacidad por diseño: solo números.',
      level: 3, hours: 12,
      skills: ['Varios sensores I²C con la misma dirección', 'Máquinas de estados', 'Agregación de datos para proteger la privacidad', 'Automatizaciones combinadas'],
      bom: ['ESP32', '2 sensores de tiempo de vuelo VL53L1X (en módulo, con pin XSHUT)', 'Pantalla OLED (opcional)', 'Caja para el marco de la puerta (impresa en 3D)'],
      phases: [
        { title: 'Fase 1 · Dos sensores iguales en un bus', steps: ['Los dos salen de fábrica con la misma dirección. Conecta cada XSHUT a un GPIO.', 'Al arrancar: apaga los dos, enciende el primero y cámbiale la dirección (por ejemplo a 0x30); enciende el segundo y cámbiala a 0x31.', 'Lee los dos a unos 20 Hz.'], checks: ['Los dos responden con direcciones distintas tras cada arranque', 'Apuntando al suelo, cada uno marca una distancia estable (±2 cm)'] },
        { title: 'Fase 2 · ¿Entra o sale?', steps: ['Un paso corta primero el haz A y luego el B (entra) o al revés (sale).', 'Escribe una máquina de estados: reposo → A → A y B → B → reposo. Cuenta solo secuencias completas.', 'Si una secuencia no termina en 1,5 s, descártala.'], checks: ['20 entradas y 20 salidas de prueba: al menos 38 bien contadas', 'Me quedo en el umbral y me doy la vuelta: no cuenta nada'] },
        { title: 'Fase 3 · Publicar solo lo necesario', steps: ['Publica la ocupación actual y totales cada 15 minutos; nada de eventos individuales con hora exacta.', 'Si la ocupación saldría negativa, déjala en 0; pon el contador a cero de madrugada.', 'Escribe en una línea qué datos guardas, para qué y cuánto tiempo.'], checks: ['En el broker solo hay totales y ocupación', 'La ocupación nunca es negativa', 'Tengo escrita la finalidad y el tiempo de conservación'] },
        { title: 'Fase 4 · Usarlo', steps: ['Combínalo con el monitor de CO₂: si hay gente y el CO₂ pasa de 1000 ppm, aviso de ventilar.', 'O apaga luces cuando la ocupación llegue a 0 durante 5 minutos.'], checks: ['La automatización se ha disparado en una prueba real'] }
      ],
      extra: ['Estimar la ocupación solo a partir del CO₂ y compararla con el contador', 'Versión a batería con detección por umbral de interrupción del sensor']
    }
  });

  /* ---------- proyectos (2/2) ---------- */
  Object.assign(PROJECTS, {
    io_hardening: {
      intro: 'Audita tu propia red como lo haría un profesional y bastiónala: inventario, contraseñas, servicios abiertos, red separada para los cacharros y secretos fuera del código. Solo en tu red y con tus equipos.',
      level: 3, hours: 10,
      skills: ['Inventario y descubrimiento de equipos', 'Escaneo de puertos ético', 'Segmentación de red', 'Gestión de secretos y OTA protegida'],
      bom: ['Tu router (mejor si admite red de invitados con aislamiento, VLAN u OpenWrt)', 'Un PC o Raspberry Pi con nmap y Wireshark', 'Una hoja de cálculo para el inventario', 'Tus nodos IoT y los aparatos comerciales de casa'],
      phases: [
        { title: 'Fase 1 · Inventario', steps: ['Saca la lista de equipos de la tabla DHCP del router y compárala con un barrido nmap -sn de tu red.', 'Para cada equipo: nombre, MAC, IP, fabricante, versión de firmware y si depende de una nube.', 'Escanear redes ajenas puede ser delito: hazlo solo en la tuya.'], checks: ['Tengo una fila por cada equipo conectado', 'He identificado todos los equipos desconocidos (o los he echado de la red)'] },
        { title: 'Fase 2 · Contraseñas y servicios', steps: ['Cambia todas las contraseñas de fábrica (router incluido) por contraseñas únicas guardadas en un gestor.', 'Desactiva WPS y UPnP en el router.', 'Escanea los servicios de cada equipo IoT (nmap -sV IP) y busca telnet (23), paneles web sin cifrar o puertos raros.'], checks: ['Ningún equipo conserva la contraseña de fábrica', 'WPS y UPnP están desactivados', 'Ningún equipo tiene telnet abierto (o lo he desconectado de la red)'] },
        { title: 'Fase 3 · Red separada', steps: ['Crea una red para IoT: la de invitados con aislamiento de clientes, o una VLAN si tu router lo permite.', 'Permite desde ella solo lo imprescindible: el broker (8883) y Home Assistant.', 'Bloquea el acceso de la red IoT a tus ordenadores y móviles.', 'Si un aparato no necesita internet, córtale la salida.'], checks: ['Desde la red IoT, un ping a mi ordenador falla', 'Los nodos siguen publicando en el broker', 'Tengo la lista de aparatos que dejan de funcionar sin internet (dependencia de nube)'] },
        { title: 'Fase 4 · Secretos y actualizaciones', steps: ['Saca las claves del código: secrets.h fuera de git, o mejor, guardadas en NVS con un portal de configuración.', 'Pon contraseña a la OTA de cada nodo y una distinta por nodo.', 'Si usas ESPHome, activa el cifrado de la API con una clave por dispositivo.', 'Busca en todo tu historial de git si alguna vez subiste una clave; si es así, cámbiala (borrar el commit no basta).'], checks: ['git grep no encuentra ninguna clave en el repositorio', 'Un intento de OTA sin contraseña es rechazado', 'He cambiado cualquier clave que haya estado alguna vez en git'] },
        { title: 'Fase 5 · Vigilancia continua', steps: ['Aviso cuando se conecte un equipo nuevo (función del router, o Node-RED leyendo el registro DHCP).', 'Revisión mensual: actualizaciones pendientes, certificados próximos a caducar y equipos sin uso.'], checks: ['El aviso de equipo nuevo se ha probado conectando el móvil de un familiar', 'Tengo una lista de revisión mensual con fecha'] }
      ],
      extra: ['Un DNS local con registro (Pi-hole o AdGuard Home) para ver adónde llama cada aparato', 'Acceso remoto solo por VPN (WireGuard)']
    },
    io_leak: {
      intro: 'Un sensor de fugas de agua que duerme años con pilas y despierta en menos de un segundo cuando se moja: pita en el acto y te avisa al móvil.',
      level: 2, hours: 6,
      skills: ['Despertar por pin (ext0) desde deep sleep', 'Alarma local primero, red después', 'Presupuesto de batería', 'Latido diario'],
      bom: ['ESP32 suelto o placa de bajo consumo (FireBeetle, TinyPICO o similar): mide tú su corriente dormida', 'Dos tornillos de acero inoxidable o una placa con pistas entrelazadas como sonda', 'Resistencias de 1 MΩ y 10 kΩ', 'Zumbador piezoeléctrico activo y un transistor NPN con 1 kΩ en la base', 'Alimentación: una LiFePO4 (3,2 V nominales, admisible directamente por el ESP32) o 3 pilas AA con un LDO de bajo consumo propio y que aguante los picos del WiFi (por ejemplo, un RT9080)'],
      phases: [
        { title: 'Fase 1 · Sonda y despertar', steps: ['Un tornillo a 3V3 a través de 10 kΩ; el otro al GPIO33 con 1 MΩ a GND. Seco: 0 V. Mojado: el agua hace de resistencia y el pin sube.', 'Configura ext0 para despertar con nivel alto en el GPIO33 (debe ser un pin RTC).', 'Si sigue mojado al volver a dormir, despertaría en bucle: mientras haya agua, usa el temporizador (cada minuto) en vez de ext0.'], checks: ['Con un dedo mojado entre los tornillos, el ESP32 despierta en menos de 1 s', 'Seco, el pin lee 0 V con el multímetro', 'Mojado de forma continua, no entra en bucle de despertares'], code: `#include "esp_sleep.h"

const gpio_num_t SONDA = GPIO_NUM_33;   // pin RTC: puede despertar al chip
RTC_DATA_ATTR uint32_t arranques = 0;

void setup() {
  arranques++;
  bool mojado = digitalRead(SONDA) == HIGH;
  if (esp_sleep_get_wakeup_cause() == ESP_SLEEP_WAKEUP_EXT0 || mojado) {
    // 1) pitar ya  2) WiFi y aviso  3) repetir cada minuto mientras siga mojado
  } else {
    // despertar diario: latido con batería y RSSI
  }
  if (mojado) esp_sleep_enable_timer_wakeup(60ULL * 1000000);        // 1 min
  else {
    esp_sleep_enable_ext0_wakeup(SONDA, 1);                           // agua → nivel alto
    esp_sleep_enable_timer_wakeup(24ULL * 3600 * 1000000);            // latido diario
  }
  esp_deep_sleep_start();
}

void loop() { }` },
        { title: 'Fase 2 · Aviso fiable', steps: ['Lo primero al despertar por agua: el zumbador. No esperes a la red.', 'Luego WiFi: guarda en memoria RTC el canal y el BSSID del router para reconectar en una fracción del tiempo.', 'Envía el aviso a tu servidor ntfy (o MQTT) y comprueba la respuesta; si falla, reintenta en el siguiente despertar.'], checks: ['Del agua al móvil pasan menos de 10 s', 'Con el servidor apagado, el zumbador suena igual'] },
        { title: 'Fase 3 · Batería', steps: ['Mide con el multímetro la corriente dormido (rango de µA) y la de un ciclo de aviso.', 'Calcula la autonomía con un latido diario y alguna alarma al año.', 'Añade al latido la tensión de la batería y un aviso de batería baja.'], checks: ['He medido la corriente dormido (anótala)', 'La autonomía calculada supera un año, o sé qué componente lo impide'] },
        { title: 'Fase 4 · Instalación', steps: ['Bajo la lavadora, el lavavajillas, el termo o el fregadero, con la sonda a 1–2 mm del suelo.', 'En Home Assistant o Node-RED, aviso si falta el latido más de 26 h.', 'Prueba mensual con un vaso de agua.'], checks: ['Cada ubicación probada con agua real', 'El aviso de latido perdido funciona'] }
      ],
      extra: ['Cerrar el agua con una válvula motorizada de 12 V (con mucho cuidado: que falle cerrada no te deje sin agua sin avisar)', 'Versión Zigbee con un ESP32-C6 o H2']
    },
    io_solar: {
      intro: 'Un nodo que vive solo en el exterior con un panel solar: mide su propia energía, informa de su salud y se actualiza por OTA con vuelta atrás si la nueva versión falla.',
      level: 4, hours: 20,
      skills: ['Balance energético medido', 'Dimensionar panel y batería', 'Telemetría de salud y motivos de reinicio', 'OTA con dos particiones y autocomprobación'],
      bom: ['ESP32', 'Panel solar de 6 V y 2 W', 'Cargador solar para Li-ion con seguimiento de potencia (por ejemplo, un módulo CN3791) o LiFePO4 con su cargador adecuado', 'Batería 18650 con protección', '1 o 2 módulos INA219 para medir corriente y tensión', 'LDO de bajo consumo propio', 'Caja IP65 con prensaestopas', 'Un sensor sencillo (SHT31)'],
      phases: [
        { title: 'Fase 1 · Medir la energía', steps: ['Un INA219 en la salida del panel y otro en la batería.', 'Integra cada minuto los mWh que entran y salen.', 'Registra un día soleado y uno nublado.'], checks: ['Tengo el balance en mWh de un día soleado y uno nublado', 'Sé qué parte del consumo es del propio ESP32 dormido'] },
        { title: 'Fase 2 · Presupuesto', steps: ['Calcula el consumo diario del nodo con tus medidas.', 'Estima la producción en invierno con las horas de sol pico de tu zona (busca el dato; en gran parte de España ronda 2–3 h en diciembre) y unas pérdidas del 30 %.', 'Dimensiona la batería para 5 días sin sol.'], checks: ['Tengo la hoja de cálculo con consumo, producción invernal y autonomía', 'El margen entre producción invernal y consumo es al menos el doble'] },
        { title: 'Fase 3 · Telemetría de salud', steps: ['Publica en cada envío: batería, RSSI, memoria libre, número de despertares, motivo del último reinicio, versión del firmware y último error.', 'Panel en Grafana con esos datos.', 'Provoca a propósito un cuelgue (bucle infinito con watchdog) y una caída de tensión, y mira qué motivo aparece.'], checks: ['Veo “watchdog” en el panel tras el cuelgue provocado', 'La versión del firmware aparece en cada mensaje'], code: `#include <esp_system.h>

const char* motivoReinicio() {
  switch (esp_reset_reason()) {
    case ESP_RST_POWERON:   return "encendido";
    case ESP_RST_DEEPSLEEP: return "deep_sleep";
    case ESP_RST_BROWNOUT:  return "caida_tension";
    case ESP_RST_TASK_WDT:  return "watchdog_tarea";
    case ESP_RST_PANIC:     return "excepcion";
    case ESP_RST_SW:        return "software";
    default:                return "otro";
  }
}
// Ejemplo de mensaje:
// {"v":"1.4.0","bat":3.92,"rssi":-67,"heap":182340,"desp":1532,"reinicio":"deep_sleep","err":0}` },
        { title: 'Fase 4 · OTA con vuelta atrás', steps: ['Usa una tabla de particiones con dos ranuras OTA.', 'El nodo descarga el firmware por HTTPS desde tu servidor y comprueba su SHA-256 antes de instalarlo.', 'Activa la vuelta atrás del cargador de arranque (opción CONFIG_BOOTLOADER_APP_ROLLBACK_ENABLE; con ESP-IDF se cambia en menuconfig, con Arduino necesitas un entorno que permita cambiarla).', 'Tras arrancar una versión nueva, haz una autocomprobación (WiFi, broker, sensor) y solo entonces confírmala.'], checks: ['Una versión rota a propósito (sin WiFi) vuelve sola a la anterior', 'Una versión buena se confirma y sigue tras reiniciar'], code: `#include "esp_ota_ops.h"

void confirmarSiEstaSano(bool wifiOk, bool mqttOk, bool sensorOk) {
  const esp_partition_t* p = esp_ota_get_running_partition();
  esp_ota_img_states_t estado;
  if (esp_ota_get_state_partition(p, &estado) == ESP_OK && estado == ESP_OTA_IMG_PENDING_VERIFY) {
    if (wifiOk && mqttOk && sensorOk) esp_ota_mark_app_valid_cancel_rollback();
    else esp_ota_mark_app_invalid_rollback_and_reboot();   // vuelve a la versión anterior
  }
}` },
        { title: 'Fase 5 · Al campo', steps: ['Instala el nodo fuera dos semanas, con el panel orientado al sur y una inclinación alta para invierno.', 'Vigila el panel de salud y apunta la tensión mínima de la batería.'], checks: ['14 días seguidos sin tocarlo', 'He apuntado la tensión mínima y el peor día'] }
      ],
      extra: ['Secure Boot v2 y cifrado de flash (son irreversibles: practica antes con un chip de sobra)', 'Medir con el coprocesador ULP sin despertar al núcleo principal']
    },
    io_irrigation: {
      intro: 'Riego automático que mira la tierra y el cielo: humedad del suelo, previsión de lluvia y evapotranspiración, con seguridad para no inundar nada aunque el programa se cuelgue.',
      level: 3, hours: 15,
      skills: ['Calibrar sensores capacitivos', 'Mando de una electroválvula con MOSFET', 'Decisiones con datos externos y respaldo local', 'Integración en Home Assistant'],
      bom: ['ESP32', '2 sensores capacitivos de humedad de suelo (comprueba que funcionan a 3,3 V)', 'Electroválvula de riego de 12 V normalmente cerrada o bomba de 12 V', 'MOSFET de nivel lógico (por ejemplo, IRLZ44N o un módulo con AO3400), diodo 1N4007 y 10 kΩ', 'Fuente de 12 V y convertidor reductor a 5 V', 'Caudalímetro de efecto Hall (opcional)', 'Caja estanca'],
      phases: [
        { title: 'Fase 0 · Agua y electricidad', steps: ['Fuera de casa solo 12 V de continua; el adaptador de red, dentro y en un enchufe con diferencial.', 'Cajas estancas y conectores en altura.'], checks: ['Ninguna parte de 230 V queda en el exterior'] },
        { title: 'Fase 1 · Calibrar la humedad', steps: ['Lee cada sensor al aire (seco) y sumergido hasta la línea (mojado) y convierte a 0–100 %.', 'Alimenta el sensor desde un GPIO solo al medir y haz la media de 10 lecturas.', 'Mide tierra recién regada y tierra seca de tu maceta o bancal.'], checks: ['Tengo los dos puntos de calibración de cada sensor', 'Repetir la medida en el mismo sitio da ±3 %'] },
        { title: 'Fase 2 · Válvula segura', steps: ['MOSFET en el lado de masa de la válvula, diodo en paralelo con la bobina (cátodo a +12 V) y 10 kΩ de puerta a masa.', 'Por programa: la válvula arranca cerrada, y nunca más de 10 minutos por riego.', 'Un temporizador independiente cierra la válvula aunque el resto del programa se cuelgue (y activa el watchdog).'], checks: ['Reiniciando el ESP32 mientras riega, la válvula se cierra', 'El límite de 10 minutos se cumple aunque fuerces un fallo en la lógica'] },
        { title: 'Fase 3 · Mirar al cielo', steps: ['Cada mañana, pide a Open-Meteo precipitation_sum y et0_fao_evapotranspiration de hoy y mañana.', 'Si se esperan más de 3 mm, no riegues. Si no, riega cuando la humedad baje del umbral, más tiempo cuanto mayor sea la evapotranspiración.', 'Publica cada decisión con su motivo.', 'Sin internet, decide solo con la humedad.'], checks: ['Tengo 7 días de decisiones con su motivo', 'Simulando una previsión de lluvia, se salta el riego', 'Sin internet sigue regando con la humedad'] },
        { title: 'Fase 4 · Integración local', steps: ['Integra el nodo en Home Assistant (con ESPHome o por MQTT con autodescubrimiento).', 'Botón de riego manual con duración fija y aviso con los litros regados.'], checks: ['El panel muestra humedad, último riego y litros', 'El botón manual funciona y respeta el límite de tiempo'] }
      ],
      extra: ['Varias zonas con turnos para no superar el caudal de tu instalación', 'Detectar fugas: caudal con la válvula cerrada']
    },
    io_blinds: {
      intro: 'Un estor o una persiana pequeña motorizada a 12 V, integrada en Home Assistant con ESPHome, con finales de carrera, posición y detección de atasco.',
      level: 3, hours: 14,
      skills: ['Puente H y motor de continua', 'Finales de carrera a prueba de fallos', 'Cubiertas (cover) en ESPHome', 'Automatizaciones locales'],
      bom: ['ESP32', 'Motor de 12 V con reductora', 'Driver de puente H adecuado a su corriente (DRV8871 para motores pequeños)', '2 finales de carrera (microinterruptores)', 'INA219 para medir la corriente (opcional)', 'Fuente de 12 V', '2 pulsadores locales', 'Las persianas de casa suelen llevar motores de 230 V: no las toques; este proyecto es de baja tensión'],
      phases: [
        { title: 'Fase 1 · Motor y finales', steps: ['Driver: IN1 e IN2 a dos GPIO; motor a las salidas; 12 V y masa común con el ESP32.', 'Finales de carrera normalmente cerrados entre pin y GND con pull-up: si se rompe un cable, el pin lee “final alcanzado” y el motor para (falla de forma segura).', 'Prueba primero a mano con pulsos cortos.'], checks: ['El motor se para en los dos extremos', 'Soltando un cable de un final, el motor no arranca en ese sentido'] },
        { title: 'Fase 2 · ESPHome', steps: ['Crea el dispositivo en ESPHome con wifi, api cifrada y ota con contraseña (todas las claves en secrets.yaml).', 'Define los finales como binary_sensor y la cubierta con la plataforma endstop.', 'Adóptalo en Home Assistant.'], checks: ['La persiana aparece en Home Assistant con abrir, cerrar y parar', 'Funciona con internet desconectado'], code: `esphome:
  name: estor-salon

esp32:
  board: esp32dev

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password

api:
  encryption:
    key: !secret api_key_estor

ota:
  - platform: esphome
    password: !secret ota_estor

output:
  - platform: gpio
    pin: GPIO26
    id: in1
  - platform: gpio
    pin: GPIO27
    id: in2

binary_sensor:
  - platform: gpio
    id: final_arriba
    pin: { number: GPIO32, mode: { input: true, pullup: true } }   # NC a GND: abierto = alcanzado
  - platform: gpio
    id: final_abajo
    pin: { number: GPIO33, mode: { input: true, pullup: true } }

cover:
  - platform: endstop
    name: "Estor salón"
    open_action:  [ output.turn_off: in2, output.turn_on: in1 ]
    open_endstop: final_arriba
    open_duration: 18s
    close_action: [ output.turn_off: in1, output.turn_on: in2 ]
    close_endstop: final_abajo
    close_duration: 17s
    stop_action:  [ output.turn_off: in1, output.turn_off: in2 ]
    max_duration: 25s` },
        { title: 'Fase 3 · Posición', steps: ['Cronometra subida y bajada completas y ajusta open_duration y close_duration.', 'Prueba posiciones intermedias desde Home Assistant (25, 50, 75 %).', 'Recalibra cada vez que toca un final.'], checks: ['Al 50 %, el error es menor del 5 % del recorrido'] },
        { title: 'Fase 4 · Automatizar y proteger', steps: ['Cierra al ponerse el sol y abre 30 minutos después del amanecer en laborables.', 'Con el INA219: si la corriente supera un umbral (atasco), para en menos de 1 s y avisa.', 'Los pulsadores locales funcionan aunque Home Assistant esté caído.'], checks: ['Las automatizaciones funcionan con internet cortado', 'Sujetando la tela, el motor para en menos de 1 s'] }
      ],
      extra: ['Modo vacaciones con horarios aleatorios', 'Cerrar automáticamente si el sensor de viento de la estación meteorológica pasa de un umbral']
    },
    io_zigbee: {
      intro: 'Monta una red Zigbee de malla con un coordinador propio, observa cómo se enrutan los mensajes y fabrica tu propio dispositivo Zigbee con un ESP32-C6. Al final, compáralo con Thread y Matter.',
      level: 4, hours: 16,
      skills: ['Coordinador, routers y dispositivos finales', 'Convivencia con el WiFi en 2,4 GHz', 'Zigbee en el ESP32-C6/H2', 'Comparar Zigbee, Thread y Matter'],
      bom: ['Coordinador Zigbee USB o por red (por ejemplo, Sonoff ZBDongle-P/E o SLZB-06)', 'Alargador USB de 1 m', 'Raspberry Pi con Home Assistant (ZHA) o Zigbee2MQTT + Mosquitto', '2–3 dispositivos Zigbee comerciales: un enchufe (hace de router) y sensores a pila', 'Placa ESP32-C6 o ESP32-H2 (radio IEEE 802.15.4)'],
      phases: [
        { title: 'Fase 1 · El coordinador', steps: ['Conecta el coordinador con el alargador, lejos de puertos y discos USB 3 (generan ruido en 2,4 GHz).', 'Elige el canal Zigbee lejos de tu WiFi: con WiFi en 1, 6 u 11, los canales Zigbee 15, 20 y 25 caen entre medias.', 'El canal se elige al crear la red: cambiarlo después obliga a reemparejar muchos dispositivos.'], checks: ['El coordinador funciona en Home Assistant o Zigbee2MQTT', 'He justificado por escrito el canal elegido con mi mapa de canales WiFi'] },
        { title: 'Fase 2 · La malla', steps: ['Empareja primero el enchufe (los dispositivos de red hacen de router).', 'Luego los sensores a pila (dispositivos finales: duermen y dependen de un padre).', 'Abre el mapa de red y mira por dónde va cada uno; aleja un sensor hasta que solo llegue a través del enchufe.'], checks: ['El mapa muestra un sensor colgando del enchufe y no del coordinador', 'Desenchufando el enchufe, ese sensor se pierde y luego busca otro camino (o no: anótalo)'] },
        { title: 'Fase 3 · Tu dispositivo Zigbee', steps: ['Con arduino-esp32 3.x, en Herramientas elige el modo Zigbee “end device” y el esquema de particiones para Zigbee.', 'Parte del ejemplo de sensor de temperatura de la librería Zigbee y añade tu sensor real.', 'Empareja el ESP32-C6 como cualquier otro dispositivo.'], checks: ['Aparece en el panel con su entidad de temperatura', 'Los valores se actualizan cada 30 s'], code: `#ifndef ZIGBEE_MODE_ED
#error "Elige en Herramientas: Zigbee mode = end device"
#endif
#include "Zigbee.h"

ZigbeeTempSensor sonda = ZigbeeTempSensor(10);   // endpoint 10

void setup() {
  sonda.setManufacturerAndModel("Voltio", "SondaC6");
  sonda.setMinMaxValue(-20, 60);
  Zigbee.addEndpoint(&sonda);
  if (!Zigbee.begin()) ESP.restart();
  while (!Zigbee.connected()) delay(100);
}

void loop() {
  float t = leerTemperatura();      // tu sensor
  sonda.setTemperature(t);
  sonda.report();
  delay(30000);
}
// API de la librería Zigbee de arduino-esp32 3.x: compárala con su ejemplo de sensor de temperatura` },
        { title: 'Fase 4 · Thread y Matter, en la práctica', steps: ['Si tienes un dispositivo Matter sobre Thread, añade un border router (por ejemplo, el complemento OpenThread de Home Assistant con una radio compatible) y empareja con el código QR.', 'Compara: tiempo de emparejamiento, alcance, duración de pila y qué sigue funcionando sin internet.', 'Prueba el multiadministrador: comparte el dispositivo Matter con otra plataforma sin quitarlo de la primera.'], checks: ['Tengo una tabla comparativa con al menos 5 criterios', 'He comprobado qué funciona sin internet en cada caso'] }
      ],
      extra: ['Vincular (binding) un interruptor Zigbee directamente con una bombilla: funciona aunque se caiga el coordinador', 'Actualizaciones OTA de dispositivos Zigbee']
    },
    io_mailbox: {
      intro: 'El buzón de la entrada está lejos y tiene metal alrededor: el WiFi no llega. Con dos placas LoRa en 868 MHz recibirás un aviso cada vez que el cartero abra la trampilla.',
      level: 3, hours: 12,
      skills: ['LoRa punto a punto con RadioLib', 'Bandas libres y ciclo de trabajo', 'Confirmaciones y reintentos por radio', 'Pasarela LoRa → WiFi → MQTT'],
      bom: ['2 placas LoRa de 868 MHz con ESP32 (por ejemplo, Heltec WiFi LoRa 32 V3 con SX1262)', '2 antenas de 868 MHz (nunca transmitas sin antena: puedes dañar la radio)', 'Microinterruptor de palanca o reed con imán para la trampilla', 'Batería LiPo de 1000 mAh', 'Caja estanca'],
      phases: [
        { title: 'Fase 0 · Legalidad', steps: ['868 MHz es una banda libre de dispositivos de corto alcance en Europa: no hace falta licencia, pero sí respetar sus límites (en 868,0–868,6 MHz, 25 mW de potencia radiada y 1 % de ciclo de trabajo).', 'No uses módulos de 915 MHz (son para América) ni subas la potencia por encima de lo permitido.'], checks: ['Mis módulos y antenas son de 868 MHz', 'He calculado el tiempo en aire de mi mensaje y el número máximo de mensajes por hora'] },
        { title: 'Fase 1 · Enlace punto a punto', steps: ['Instala RadioLib y configura las dos placas igual: 868,1 MHz, 125 kHz, SF9, CR 4/5, 14 dBm.', 'Una envía “hola” con un contador cada 30 s; la otra imprime el texto, el RSSI y la SNR.', 'Prueba en tres sitios: misma habitación, buzón y el punto más lejano del jardín.'], checks: ['Recibo los paquetes en los tres sitios', 'Tengo una tabla con RSSI y SNR de cada sitio'], code: `#include <RadioLib.h>

// Heltec WiFi LoRa 32 V3 (SX1262): NSS 8, DIO1 14, RST 12, BUSY 13
// Comprueba estos pines en el esquema de TU placa
SX1262 radio = new Module(8, 14, 12, 13);
int contador = 0;

void setup() {
  Serial.begin(115200);
  // frecuencia (MHz), ancho de banda (kHz), SF, CR (5 = 4/5), palabra de sincronía, potencia (dBm)
  int estado = radio.begin(868.1, 125.0, 9, 5, RADIOLIB_SX126X_SYNC_WORD_PRIVATE, 14);
  if (estado != RADIOLIB_ERR_NONE) {
    Serial.printf("Error de radio %d (revisa pines y TCXO)\\n", estado);
    while (true) delay(1000);
  }
}

void loop() {
  String msg = "hola " + String(contador++);
  radio.transmit(msg);
  delay(30000);   // muy por encima del 1 %: este paquete dura unos 0,1 s
}` },
        { title: 'Fase 2 · El nodo del buzón', steps: ['Interruptor de la trampilla a un pin RTC con despertar ext0.', 'Al despertar: envía 4 bytes (tipo, contador de 16 bits, batería en décimas de voltio) y vuelve a dormir.', 'Antena fuera de la parte metálica del buzón (el metal hace de jaula).', 'Mide la corriente dormido.'], checks: ['Cada apertura genera exactamente un mensaje', 'He medido la corriente dormido', 'He calculado el caso peor (cartero más 20 folletos) y no supera el 1 %'] },
        { title: 'Fase 3 · Receptor y pasarela', steps: ['La placa receptora, dentro de casa, se conecta por WiFi y publica en MQTT o en ntfy.', 'Descarta duplicados por el contador.', 'Muestra en su pantalla la hora de la última apertura.'], checks: ['Los duplicados se filtran', 'El aviso llega al móvil en menos de 5 s'] },
        { title: 'Fase 4 · Fiabilidad', steps: ['El receptor contesta con una confirmación (ACK) y el buzón reintenta hasta 3 veces con espera creciente y algo de azar si no la recibe.', 'Latido diario con la batería; aviso si falta.', 'Prueba 50 aperturas.'], checks: ['Al menos 49 de 50 aperturas avisadas', 'El aviso de latido perdido funciona'] }
      ],
      extra: ['Cifrar la carga (LoRa punto a punto no cifra nada por sí mismo)', 'Pasar a LoRaWAN con The Things Network']
    },
    io_garden: {
      intro: 'Una red LoRaWAN de verdad para un huerto o una parcela: tu pasarela de 8 canales, varios nodos a batería con sensores de suelo, servidor de red y datos hasta tu panel.',
      level: 5, hours: 40,
      skills: ['Pasarelas y servidores de red LoRaWAN', 'Activación OTAA y gestión de claves', 'Cargas binarias y decodificadores', 'Presupuesto de aire, ADR y energía', 'Despliegue y validación en campo'],
      bom: ['Pasarela LoRaWAN de 8 canales para EU868 (comercial, o un concentrador SX1302/SX1303 sobre Raspberry Pi)', '3–5 nodos LoRaWAN (por ejemplo, módulos RAK3172 o placas ESP32 con SX1262 y RadioLib)', 'Sensores capacitivos de humedad y DS18B20 para suelo', 'Cuenta en The Things Network o ChirpStack en tu propio servidor', 'Cajas IP65, baterías y antenas de 868 MHz'],
      phases: [
        { title: 'Fase 1 · Pasarela y servidor de red', steps: ['Decide: The Things Network (comunitaria, en la nube, con política de uso justo) o ChirpStack en tu Raspberry Pi (privado y local).', 'Registra la pasarela con su EUI y el plan de frecuencias EU868.', 'Pon la antena lo más alta posible y con visión directa del huerto.', 'Las pasarelas de un solo canal no cumplen LoRaWAN: evítalas.'], checks: ['La pasarela aparece conectada en el servidor', 'Ve tráfico (aunque sea de otros) en la consola'] },
        { title: 'Fase 2 · Primer nodo con OTAA', steps: ['Da de alta el nodo con DevEUI, JoinEUI y AppKey; guárdalos fuera del código público.', 'Únete con OTAA y envía una carga binaria de 6 bytes.', 'Escribe el decodificador en el servidor para ver los valores con nombre.', 'Compara el tiempo en aire que muestra la consola con tu cálculo.'], checks: ['El nodo se une a la red', 'El panel muestra humedad, temperatura y batería decodificadas', 'Mi cálculo de tiempo en aire coincide con la consola (±5 %)'], code: `// En el nodo: 6 bytes en vez de un JSON de 40
uint8_t carga[6];
int16_t t = (int16_t)lroundf(tempSuelo * 100);   // °C × 100, con signo
uint16_t mv = bateriaMv;
carga[0] = humedad;                              // 0..100 %
carga[1] = t >> 8;  carga[2] = t & 0xFF;
carga[3] = mv >> 8; carga[4] = mv & 0xFF;
carga[5] = estado;

// En el servidor (decodificador de subida, JavaScript):
// function decodeUplink(input) {
//   const b = input.bytes;
//   let t = (b[1] << 8) | b[2];
//   if (t & 0x8000) t -= 0x10000;               // recupera el signo
//   return { data: { humedad: b[0], tempSuelo: t / 100,
//                    bateria: ((b[3] << 8) | b[4]) / 1000, estado: b[5] } };
// }` },
        { title: 'Fase 3 · Presupuesto de aire y energía', steps: ['Para cada nodo: SF que usa, tiempo en aire, mensajes al día y segundos de aire al día.', 'Si usas TTN, que ningún nodo pase de 30 s de aire al día; en cualquier caso, del 1 % legal.', 'Activa ADR en los nodos fijos para que la red baje el SF si la señal sobra.', 'Mide la corriente dormido y calcula la autonomía.'], checks: ['Tengo la tabla por nodo y todos cumplen', 'He visto bajar el SF de algún nodo gracias al ADR', 'La autonomía calculada de cada nodo supera 6 meses'] },
        { title: 'Fase 4 · Despliegue', steps: ['Instala los nodos y apunta RSSI y SNR de cada uno.', 'Vigila los huecos en el contador de tramas para medir la pérdida de paquetes.', 'Ajusta antenas o ubicación de los peores.'], checks: ['7 días con al menos un 95 % de paquetes recibidos por nodo (según el contador de tramas)', 'Ningún nodo necesita SF12 de forma permanente (o he aceptado su coste)'] },
        { title: 'Fase 5 · Datos y órdenes', steps: ['Saca los datos del servidor de red por MQTT hacia tu InfluxDB y Grafana, o hacia Home Assistant.', 'Envía una orden de bajada a un nodo de válvula: en clase A solo llega tras una subida del nodo, así que la latencia es la de su intervalo.', 'Documenta esa latencia y decide si un nodo de clase C (con alimentación fija) tendría sentido.'], checks: ['Panel con los datos del huerto', 'Una orden de bajada se ejecuta tras la siguiente subida y he medido cuánto tarda'] }
      ],
      extra: ['Nodos solares', 'Red totalmente local con ChirpStack y sin internet', 'Contribuir con tu pasarela a la red comunitaria de tu zona']
    },
    io_final: {
      intro: 'El proyecto final de la especialidad: tu propia domótica completa, local y robusta. Varios nodos, broker con TLS, base de datos, paneles, alertas, automatizaciones, OTA con vuelta atrás y un mes funcionando sin ti.',
      level: 5, hours: 60,
      skills: ['Arquitectura y documentación de un sistema', 'Infraestructura con copias de seguridad y SAI', 'Firmware común robusto para todos los nodos', 'Alertas que no agobian', 'Operación continua y gestión de incidentes'],
      bom: ['Raspberry Pi 5 (o un mini PC) con SSD', 'Home Assistant, Mosquitto, Node-RED, InfluxDB y Grafana', 'Coordinador Zigbee (si usas Zigbee)', 'Al menos 4 nodos ESP32 de proyectos anteriores (CO₂, nevera, fugas, meteo, timbre, persiana…)', 'Un SAI pequeño para el router y la Pi', 'Router con red separada para IoT'],
      phases: [
        { title: 'Fase 1 · Diseño', steps: ['Dibuja la arquitectura: nodos, radios, pasarelas, broker, base de datos, paneles y automatizaciones.', 'Escribe el árbol de temas MQTT y las convenciones (nombres, unidades, retenidos, último testamento).', 'Modelo de amenazas: qué proteges, de quién y cómo.', 'Decide cuánto tiempo guardas cada dato y por qué.'], checks: ['Documento con diagrama, tabla de temas y al menos 5 amenazas con su defensa', 'Cada dato tiene un tiempo de conservación decidido'] },
        { title: 'Fase 2 · Infraestructura', steps: ['Instala los servicios con copias de seguridad automáticas a otro disco o equipo.', 'Broker con TLS y ACL por nodo; red IoT separada.', 'Router y Pi en el SAI.'], checks: ['He restaurado una copia en otro soporte y funciona', 'Tras un corte de luz de 5 minutos, todo vuelve solo'] },
        { title: 'Fase 3 · Un firmware común', steps: ['Todos los nodos comparten un esqueleto: configuración en NVS, telemetría de salud, último testamento, reconexión exponencial con azar, cola local para datos sin red, watchdog y OTA con vuelta atrás.', 'Cada nodo publica su versión.', 'Prueba de fuego: desconecta el router 10 minutos.'], checks: ['Todos los nodos informan de versión y salud', 'Tras 10 minutos sin router, los datos encolados llegan o el hueco queda marcado', 'Todos se recuperan en menos de 2 minutos al volver la red'] },
        { title: 'Fase 4 · Datos, paneles y alertas', steps: ['Retención y resúmenes en InfluxDB; paneles en Grafana y Home Assistant.', 'Alertas en dos niveles por ntfy: críticas (fuga, congelador, humo) e informativas.', 'Detecta anomalías: nodo callado, valor atascado, cambio imposible.', 'Limita la frecuencia de alertas para no acostumbrarte a ignorarlas.'], checks: ['Cada tipo de alerta se ha probado', 'Una semana sin avalanchas de avisos'] },
        { title: 'Fase 5 · Automatizaciones con sentido', steps: ['Al menos 5 automatizaciones útiles: ventilación por CO₂ y ocupación, riego, persianas, fuga → aviso (y válvula), consumo anómalo.', 'Todas con anulación manual y funcionando sin internet.'], checks: ['24 h con internet cortado: todas las automatizaciones locales siguen funcionando', 'Cada automatización tiene una forma manual de anularla'] },
        { title: 'Fase 6 · Operación', steps: ['30 días en marcha con un registro de incidentes: qué pasó, por qué y qué cambiaste.', 'Haz una presentación de 10 minutos de tu sistema para alguien que no sepa electrónica.'], checks: ['30 días de funcionamiento registrados', 'Al menos 3 incidentes documentados con causa y solución'] }
      ],
      extra: ['Puente Matter para usar tus dispositivos desde otras plataformas sin nube', 'Asistente de voz local', 'Copia de seguridad cifrada fuera de casa']
    }
  });

  /* ---------- temario ---------- */
  TRACKS.push({
    id: 'iot',
    title: 'Internet de las cosas',
    short: 'IoT',
    desc: 'Del sensor al panel: redes, HTTP, MQTT, datos, seguridad, energía y largo alcance, con tu propio servidor en casa y sin depender de la nube de nadie.',
    color: '#0E9F8E',
    icon: 'cloud',
    level: 'Intermedio → avanzado',
    units: [
{ id: 'io-m1', title: 'Sistemas IoT: del sensor a la decisión', desc: 'Las piezas de un sistema conectado, cómo fijar requisitos y cómo elegir la radio sin depender de nadie.', nodes: [
 L('io1', 'La cadena de un sistema IoT', 'cloud', ['io_arch'], [
  I('Un sistema IoT es una cadena: <b>sensor</b> → <b>nodo</b> (un microcontrolador como el ESP32) → <b>red</b> → <b>pasarela</b> (si la radio no habla IP) → <b>broker o servidor</b> → <b>almacenamiento</b> → <b>panel o automatización</b>.\nEl valor no está en medir, sino en lo que haces con la medida.'),
  { t: 'order', q: 'Ordena el viaje de una lectura de temperatura hasta tu móvil.', items: ['El sensor convierte la temperatura en una señal', 'El ESP32 la lee y la empaqueta', 'El WiFi la lleva hasta el router', 'El broker MQTT la recibe y la reparte', 'La base de datos la guarda', 'El panel la dibuja en el móvil'], e: 'Cada eslabón depende del anterior.' },
  I('No todos los eslabones están siempre. Un termómetro WiFi puede servir su propia página: sensor, nodo y “panel” en el mismo chip. Un sensor Zigbee necesita una <b>pasarela</b> (el coordinador) que lo traduzca a IP.'),
  { t: 'match', q: 'Une cada pieza con su función.', pairs: [['Nodo', 'Lee sensores y envía datos'], ['Pasarela', 'Traduce entre radios distintas'], ['Broker', 'Recibe mensajes y los reparte'], ['Base de series temporales', 'Guarda valores con su hora']] },
  Q('Un ESP32 lee la humedad del suelo y abre una válvula si está seco, sin hablar con nadie. ¿Es IoT?', ['Todavía no: es un sistema embebido; sería IoT si se conectara para informar o recibir órdenes', 'Sí, porque lleva un ESP32', 'Sí, porque el chip tiene WiFi', 'No, porque no tiene pantalla'], 'IoT = cosas conectadas que comparten datos.'),
  I('Hay dos direcciones: <b>subida</b> (telemetría, del nodo hacia el servidor) y <b>bajada</b> (órdenes, del servidor hacia el nodo). La subida suele ser periódica; la bajada, a demanda. Algunas radios hacen muy difícil la bajada: lo verás en LoRaWAN.'),
  Q('Una orden “enciende la calefacción” enviada desde el móvil viaja…', ['De bajada: del servidor hacia el nodo', 'De subida: del nodo al servidor', 'Por el sensor', 'Siempre directamente del móvil al relé'], 'La telemetría sube; las órdenes bajan.'),
  I('El <b>borde</b> (edge) es hacer trabajo en el propio nodo: filtrar, resumir, decidir alarmas. Si el nodo decide en local que hay una fuga, la alarma suena aunque se caiga internet.'),
  Q('¿Dónde conviene decidir que suene la alarma de una fuga de agua?', ['En el propio nodo, y además avisar por la red', 'Solo en un servidor en la nube', 'En el panel del móvil', 'En la base de datos'], 'Lo crítico, en local: no depende de la red.'),
  G('io_dataMonth'),
  Q('El broker se apaga. ¿Qué sigue funcionando en un buen diseño?', ['La lógica local de cada nodo (alarmas, límites de seguridad)', 'Nada', 'Los paneles del móvil', 'Las automatizaciones entre nodos'], 'Diseña pensando en que cada eslabón puede fallar.')
 ]),
 L('io2', 'Requisitos: energía, alcance, datos y latencia', 'gauge', ['io_arch'], [
  I('Antes de elegir chip o radio, escribe los <b>requisitos</b>:\n· <b>Energía</b>: ¿enchufe o batería? ¿Cuántos meses?\n· <b>Alcance</b>: metros o kilómetros, paredes, metal.\n· <b>Datos</b>: cuántos bytes y cada cuánto.\n· <b>Latencia</b>: ¿cuánto puede tardar un aviso?\n· <b>Coste</b>: por nodo y de la infraestructura.'),
  { t: 'match', q: 'Une cada caso con su requisito más exigente.', pairs: [['Sensor de fugas a pilas bajo la lavadora', 'Energía: años con pilas'], ['Estación en una finca a 3 km', 'Alcance'], ['Cámara de vigilancia', 'Ancho de banda'], ['Timbre', 'Latencia: aviso en segundos']] },
  I('Ancho de banda y energía van de la mano: transmitir cuesta energía por cada bit, y la radio encendida gasta aunque no envíe. El WiFi del ESP32 consume del orden de 100–250 mA mientras transmite; dormido, el chip baja a unos 10 µA.'),
  Nm('Un nodo envía 20 bytes cada 10 minutos. ¿Cuántos bytes al día?', 2880, 'bytes', '144 mensajes × 20 bytes.'),
  G('io_dataMonth'),
  Q('Con el mismo dato, ¿qué cambia más el consumo de un nodo a pilas?', ['Cada cuánto despierta y cuánto tarda en conectar y enviar', 'El número de decimales del dato', 'El nombre del tema MQTT', 'El color de la caja'], 'Lo caro es tener la radio encendida.', { c: 'io_duty' }),
  I('La <b>latencia</b> no es solo la red. Un nodo que duerme 15 minutos tarda hasta 15 minutos en enterarse de una orden. Por eso los actuadores (válvulas, persianas) suelen ir enchufados y escuchando, y los sensores a pila solo hablan.'),
  Q('Una persiana debe responder en menos de un segundo a un botón del móvil. ¿Qué implica?', ['Que su nodo debe estar siempre escuchando, normalmente con alimentación fija', 'Que puede dormir 10 minutos', 'Que necesita LoRaWAN de clase A', 'Nada especial'], 'Escuchar siempre = consumo constante.'),
  Q('Un sensor en un sótano de hormigón a 40 m del router. ¿Qué requisito compruebas primero?', ['El alcance real, midiendo la señal en el sitio', 'El coste del broker', 'La latencia de la base de datos', 'El tamaño del JSON'], 'El hormigón y el metal atenúan mucho los 2,4 GHz.'),
  I('El <b>coste</b> engaña: un nodo LoRaWAN cuesta más que un ESP32, pero si evita tirar 300 m de cable o poner un repetidor WiFi en cada caseta, sale a cuenta. Cuenta siempre infraestructura y mantenimiento: cambiar pilas también cuesta.'),
  Q('100 sensores a pilas que duran 6 meses frente a otros que duran 5 años. ¿Qué coste se olvida fácilmente?', ['La mano de obra de cambiar 200 pilas al año', 'El precio del broker', 'La electricidad del router', 'Ninguno'], 'A gran escala, manda el mantenimiento.')
 ]),
 L('io3', 'Elegir la radio', 'antenna', ['io_arch'], [
  I('Las radios más usadas en IoT:\n· <b>WiFi</b>: mucho ancho de banda e IP directa; consumo alto.\n· <b>Bluetooth LE</b>: muy bajo consumo y corto alcance; ideal con el móvil.\n· <b>Zigbee</b> y <b>Thread</b>: mallas de baja potencia a 2,4 GHz; necesitan coordinador o border router.\n· <b>LoRa/LoRaWAN</b>: kilómetros con pocos bytes.\n· <b>NB-IoT y LTE-M</b>: celulares, con SIM y cobertura del operador.'),
  { t: 'match', q: 'Une cada radio con su punto fuerte.', pairs: [['WiFi', 'Ancho de banda e IP directa'], ['Bluetooth LE', 'Consumo mínimo a pocos metros'], ['Zigbee / Thread', 'Malla de bajo consumo en casa'], ['LoRaWAN', 'Kilómetros con pocos bytes'], ['NB-IoT / LTE-M', 'Cobertura del operador sin infraestructura propia']] },
  I('Tabla rápida. Son valores orientativos: el entorno lo cambia todo.', { code: 'Radio     Alcance típico      Datos             Consumo   Infraestructura\nWiFi      10–50 m interior    Mbit/s            Alto      Router\nBLE       10–30 m             hasta ~1 Mbit/s   Muy bajo  Móvil o pasarela\nZigbee    10–20 m por salto   250 kbit/s        Bajo      Coordinador\nThread    10–20 m por salto   250 kbit/s        Bajo      Border router\nLoRaWAN   2–15 km exterior    0,3–5 kbit/s      Muy bajo  Pasarela y servidor\nNB-IoT    Operador            decenas de kbit/s Bajo*     SIM y tarifa\nLTE-M     Operador            hasta ~1 Mbit/s   Bajo*     SIM y tarifa\n* con los modos de ahorro PSM y eDRX' }),
  Q('Una cámara de vídeo para el jardín. ¿Qué radio?', ['WiFi', 'LoRaWAN', 'Zigbee', 'NB-IoT'], 'El vídeo necesita mucho ancho de banda.'),
  Q('Sensores de puerta a pila por toda la casa, que ya tiene varios enchufes inteligentes. ¿Qué encaja mejor?', ['Zigbee o Thread: los enchufes hacen de routers de la malla', 'LoRaWAN', 'WiFi en cada sensor', 'LTE-M'], 'Malla de bajo consumo; los equipos enchufados repiten.'),
  Q('Un sensor de nivel en un depósito de agua a 4 km, sin WiFi ni enchufe.', ['LoRaWAN', 'Bluetooth LE', 'WiFi', 'Zigbee'], 'Largo alcance y bajo consumo.'),
  Q('Un localizador para un remolque que recorre toda España.', ['LTE-M o NB-IoT', 'Zigbee', 'WiFi', 'Bluetooth LE'], 'Necesita la cobertura del operador allí donde esté; LTE-M lleva mejor la movilidad.'),
  I('El ESP32 clásico trae WiFi de 2,4 GHz y Bluetooth. El ESP32-C6 añade la radio de bajo consumo que usan Zigbee y Thread, y el ESP32-H2 trae esa radio y BLE, pero no WiFi. Para LoRa o redes celulares hace falta un módulo aparte (SX1262, SIM7080G…).'),
  Q('Quieres un nodo Thread con un chip de Espressif. ¿Cuál?', ['ESP32-C6 o ESP32-H2', 'ESP32 clásico', 'ESP8266', 'Cualquiera con WiFi'], 'Zigbee y Thread usan una radio de bajo consumo que el ESP32 clásico no tiene.'),
  Q('¿Por qué el WiFi casi nunca es buena idea para un sensor a pilas que envía cada 10 s?', ['Conectar y transmitir por WiFi cuesta mucha energía cada vez', 'El WiFi no admite datos pequeños', 'El WiFi no tiene alcance', 'Porque necesita una SIM'], 'Con envíos espaciados y deep sleep sí puede servir.', { c: 'io_duty' }),
  G('io_dbm')
 ]),
 L('io4', 'Local primero: nube, privacidad y dependencia', 'shield', ['io_arch', 'io_security'], [
  I('Muchos aparatos comerciales solo funcionan a través de la <b>nube del fabricante</b>: tu bombilla habla con un servidor en otro país, y tu móvil con ese servidor. Si el fabricante cierra el servicio, cambia sus condiciones o se cae internet, el aparato se queda tonto.'),
  Q('Se cae internet en casa. Tu enchufe solo funciona con la app del fabricante en la nube. ¿Qué pasa?', ['No lo controlas desde la app aunque estés en el mismo WiFi', 'Funciona igual por WiFi', 'Pasa solo a Bluetooth', 'Se reinicia en modo local'], 'Depender de la nube es depender de internet y del fabricante.'),
  I('<b>Local primero</b>: el broker, la base de datos y las automatizaciones viven en un equipo de tu casa (una Raspberry Pi, un mini PC). Funciona sin internet, la latencia es mínima, los datos no salen y no dependes de nadie. A cambio, lo mantienes tú (copias, actualizaciones) y el acceso remoto hay que montarlo (mejor con VPN).'),
  { t: 'match', q: 'Une cada ventaja con su enfoque.', pairs: [['Funciona sin internet', 'Local'], ['Acceso desde cualquier sitio sin configurar nada', 'Nube'], ['Tus datos no salen de casa', 'Local '], ['Escala a millones de dispositivos', 'Nube ']] },
  I('Los datos de casa dicen mucho de ti: el consumo eléctrico revela a qué hora te levantas y cuándo estás de vacaciones; un sensor de presencia, cuándo la casa está vacía. Si salen a un servidor ajeno, ya no controlas quién los ve ni cuánto tiempo se guardan.'),
  Q('¿Qué revela una curva de consumo eléctrico minuto a minuto?', ['Rutinas: cuándo te levantas, cocinas o la casa está vacía', 'Nada personal', 'Solo la tarifa', 'Solo la marca de los aparatos'], 'Los datos de energía son datos personales.'),
  Q('¿Cuál es la mejor forma de ver tu panel de casa desde fuera?', ['Una VPN hacia tu red (por ejemplo, WireGuard)', 'Abrir el puerto del panel en el router', 'Quitar la contraseña', 'Ponerlo en la red de invitados'], 'No expongas servicios a internet.', { c: 'io_security' }),
  I('La nube tiene su sitio: flotas de miles de nodos, lugares sin servidor propio, copias fuera de casa. Una arquitectura sensata es <b>híbrida</b>: todo lo crítico funciona en local y, si quieres, envías fuera solo los resúmenes que tú eliges.'),
  Q('Diseño híbrido sensato para un huerto con LoRaWAN y riego:', ['Riego decidido en local; fuera, solo resúmenes diarios si los quieres', 'Todo en la nube, también la válvula', 'Nada conectado', 'La válvula la abre cada mañana un servidor externo'], 'Lo crítico, local; lo accesorio, opcional.'),
  Q('Al comprar un aparato “inteligente”, ¿qué pregunta te protege más a largo plazo?', ['¿Funciona en local, sin cuenta ni nube del fabricante?', '¿De qué color es?', '¿Tiene muchas funciones?', '¿Viene con app?'], 'Busca control local: ESPHome, Zigbee, Matter, MQTT.')
 ]),
 SIM('io-s1', 'Reto: nodo de alarma con histéresis', 'Monta la parte local de un nodo IoT: un sensor en el GPIO34 y un LED de alarma en el GPIO25. El programa enciende la alarma por encima de 2800 cuentas y solo la apaga por debajo de 2400. Mueve el potenciómetro (o la luz de la LDR) para activarla y desactivarla.', { arduino: 'io_umbral', board: 'esp32', parts: ['pot', 'ldr', 'res', 'led'], code: true, hint: 'Potenciómetro: un extremo a 3V3, el otro a GND y el cursor al D34. LED: D25 → resistencia de 100–220 Ω → ánodo; cátodo a GND. Con LDR: LDR de 3V3 al D34 y 10 kΩ del D34 a GND.' }, 'io_umbral'),
 PRJ('io-p1', 'Proyecto: termómetro WiFi con página propia', 'io_webthermo')
] },

{ id: 'io-m2', title: 'Redes para electrónicos', desc: 'IP, máscara, DHCP, DNS, puertos, TCP y UDP, NAT, IPv6 y WiFi de 2,4 GHz, con diagnóstico práctico.', nodes: [
 L('io5', 'Direcciones IP, máscara y puerta de enlace', 'wifi', ['io_net'], [
  I('Cada equipo de tu red tiene una <b>dirección IP</b> (IPv4): cuatro números de 0 a 255, es decir, 4 bytes. Una red de casa típica se parece a esto:', { code: 'Router (puerta de enlace)  192.168.1.1\nRaspberry Pi (broker)      192.168.1.10\nESP32 del salón            192.168.1.37\nMáscara                    255.255.255.0  (= /24)' }),
  I('La <b>máscara</b> dice cuántos bits son la red y cuántos el equipo. /24 son 24 bits de red: los tres primeros números deben coincidir para estar en la misma red; el último identifica al equipo.'),
  Q('Con /24, ¿qué equipo está en la misma red que el broker?', ['A', 'B', 'C', 'D'], 'Deben coincidir los tres primeros números con los del broker.', { code: 'Broker: 192.168.1.10 /24\nA: 192.168.1.200\nB: 192.168.0.10\nC: 10.0.0.10\nD: 192.168.10.1' }),
  G('io_subnet'),
  I('Si el destino está en tu red, el ESP32 le habla directamente. Si no (por ejemplo, un servidor de internet), entrega el paquete a la <b>puerta de enlace</b>: el router, que sabe sacarlo fuera.'),
  Q('El ESP32 quiere hablar con un servidor de previsión del tiempo en internet. ¿A quién entrega el paquete?', ['A la puerta de enlace (el router)', 'Directamente al servidor', 'Al broker MQTT', 'Al DNS'], 'Fuera de tu red, siempre a través del router.'),
  I('Hay rangos <b>privados</b> reservados para uso interno, que no se enrutan en internet. Por eso millones de casas usan las mismas direcciones sin conflicto.', { code: '10.0.0.0    – 10.255.255.255    (10.0.0.0/8)\n172.16.0.0  – 172.31.255.255    (172.16.0.0/12)\n192.168.0.0 – 192.168.255.255   (192.168.0.0/16)' }),
  Q('¿Por qué tu vecino y tú podéis tener los dos un equipo con la misma dirección privada?', ['Las direcciones privadas solo valen dentro de cada red', 'Porque internet las cambia solas', 'No podéis: habrá conflicto', 'Porque usáis distinto WiFi'], 'Privadas = no únicas en el mundo.'),
  G('io_subnet'),
  I('Fallo clásico: escribir en el código una <b>IP fija</b> que ya usa otro equipo, o que está fuera de la red del router. Mejor deja que la asigne el router y haz una <b>reserva</b> por MAC en su configuración.'),
  Q('Configuras a mano esta IP en un ESP32. ¿Qué pasa?', ['No puede hablar ni con el router: está en otra red', 'Funciona igual', 'El router la corrige solo', 'Solo falla el DNS'], 'IP, máscara y puerta de enlace deben ser coherentes.', { code: 'Router:  192.168.1.1  /24\nESP32:   192.168.0.50 /24  (fija en el código)' })
 ]),
 L('io6', 'DHCP, DNS y mDNS', 'wifi', ['io_net'], [
  I('Cuando el ESP32 se conecta, pide configuración por <b>DHCP</b>: el router le presta una IP durante un tiempo (la concesión) y le dice la máscara, la puerta de enlace y el DNS. Antes de que caduque, la renueva.'),
  { t: 'order', q: 'Ordena lo que pasa al encender un ESP32 en tu WiFi.', items: ['Se asocia al punto de acceso con la clave WiFi', 'Pide configuración por DHCP', 'Recibe IP, máscara, puerta de enlace y DNS', 'Pregunta al DNS la IP del servidor', 'Abre la conexión con el servidor'], e: 'Sin DHCP no hay IP; sin DNS no hay nombres.' },
  I('Una <b>reserva DHCP</b> asocia la MAC de un equipo a una IP en el router. El equipo sigue usando DHCP, pero siempre recibe la misma dirección. Es la forma limpia de que tu broker no cambie de IP.'),
  Q('¿Qué equipo de casa necesita más una IP que no cambie?', ['La Raspberry Pi que hace de broker', 'El móvil', 'El portátil', 'La tele'], 'Los nodos se conectan a él por su IP o su nombre.'),
  I('El <b>DNS</b> traduce nombres a IP: api.open-meteo.com → una dirección. Funciona normalmente por UDP, puerto 53. Si el DNS falla, “no hay internet” aunque la conexión esté bien.'),
  Q('El ESP32 tiene IP y hace ping al router, pero no conecta con “api.ejemplo.com”. ¿Sospechoso principal?', ['El DNS', 'La máscara', 'El cable USB', 'El ADC'], 'Prueba con la IP directamente para confirmarlo.'),
  I('En casa no hay un DNS para tus equipos, pero existe <b>mDNS</b>: cada equipo anuncia su nombre terminado en .local por multidifusión. Con MDNS.begin("termo") el ESP32 responde a termo.local. Solo funciona dentro de la red local: no atraviesa internet ni pasa entre redes separadas.'),
  Q('Llevas tus nodos a una red IoT separada y desde el portátil ya no abre termo.local. ¿Por qué?', ['mDNS usa multidifusión local y no cruza entre redes', 'El nodo se ha roto', 'Falta abrir un puerto en internet', 'El DNS del operador lo bloquea'], 'Usa la IP o un reflector mDNS en el router.'),
  { t: 'match', q: 'Une cada protocolo con lo que hace.', pairs: [['DHCP', 'Reparte IP y configuración'], ['DNS', 'Traduce nombres a IP'], ['mDNS', 'Nombres .local sin servidor'], ['NTP', 'Pone en hora los relojes']] },
  Q('¿Qué tiene de mejor una reserva DHCP frente a escribir la IP fija en el código?', ['Todo se gestiona en un sitio y no hay riesgo de duplicados', 'Es más rápida', 'No necesita router', 'Cifra la conexión'], 'El router conoce todas las asignaciones.'),
  Q('¿Cuánto dura una IP concedida por DHCP?', ['El tiempo de concesión que fija el router; luego se renueva', 'Para siempre', 'Un segundo', 'Hasta que apagues el móvil'], 'Normalmente horas o días.')
 ]),
 L('io7', 'Puertos, TCP y UDP', 'wifi', ['io_net'], [
  I('La IP lleva el paquete al equipo; el <b>puerto</b> (de 0 a 65 535) lo entrega al programa correcto. Un mismo servidor puede atender la web en el 80, HTTPS en el 443, MQTT en el 1883 (o el 8883 con TLS) y SSH en el 22.'),
  { t: 'match', q: 'Une cada servicio con su puerto habitual.', pairs: [['HTTP', '80'], ['HTTPS', '443'], ['MQTT', '1883'], ['MQTT con TLS', '8883'], ['DNS', '53']] },
  I('<b>TCP</b> abre una conexión (un saludo en tres pasos), numera los datos, confirma lo recibido y reenvía lo perdido: llega todo y en orden. <b>UDP</b> manda datagramas sueltos sin conexión: menos sobrecarga, pero si uno se pierde, nadie lo reenvía.'),
  Q('MQTT y HTTP van sobre…', ['TCP', 'UDP', 'Ninguno', 'Bluetooth'], 'Necesitan entrega fiable y ordenada.'),
  Q('¿Qué va normalmente sobre UDP?', ['DNS, NTP y mDNS', 'HTTP', 'SSH', 'MQTT'], 'Preguntas cortas donde reintentar es fácil.'),
  I('Abrir una conexión TCP cuesta tiempo: un viaje de ida y vuelta para el saludo, y con TLS varios más. En un nodo a pilas, mantener o reutilizar la conexión ahorra energía; reconectar en cada envío la gasta.'),
  Q('Un nodo a pilas abre TCP y TLS para cada lectura, cada 10 s. ¿Mejora más eficaz?', ['Agrupar lecturas y enviarlas juntas con menos conexiones', 'Usar un puerto más alto', 'Cambiar a IPv6', 'Enviar un JSON más bonito'], 'Cada saludo cuesta tiempo de radio.', { c: 'io_duty' }),
  I('<b>CoAP</b> es un protocolo tipo REST para nodos muy pequeños que va sobre UDP (puerto 5683). Lo verás alrededor de Thread y de redes muy restringidas. En casa, lo más común es MQTT sobre TCP.'),
  Q('Algo escucha en el puerto 1883 de la Raspberry Pi. ¿Qué es probablemente?', ['Un broker MQTT sin cifrar', 'Un servidor web', 'Un servidor SSH', 'Un DNS'], '1883 es el puerto estándar de MQTT.'),
  Q('Ves el puerto 23 (telnet) abierto en una cámara IP. ¿Qué haces?', ['Desactivarlo o sacar la cámara de la red: telnet va sin cifrar y es una puerta de entrada habitual', 'Nada, es normal', 'Abrirlo en el router para usarlo desde fuera', 'Cambiar el canal WiFi'], 'Muchas botnets entraban justo así.', { c: 'io_security' })
 ]),
 L('io8', 'NAT, el router y por qué no abrir puertos', 'shield', ['io_net', 'io_security'], [
  I('Tu operador te da <b>una</b> IP pública; dentro tienes muchos equipos con IP privadas. El router hace <b>NAT</b>: cuando un equipo sale a internet, cambia su dirección privada por la pública y recuerda la conexión para devolverle las respuestas.'),
  Q('Desde internet, alguien intenta conectar con tu IP pública sin que nadie de dentro haya iniciado nada. ¿Qué hace el router por defecto?', ['Descarta el paquete: no sabe a qué equipo dárselo', 'Se lo da al ESP32', 'Se lo da a todos', 'Lo devuelve al operador'], 'El NAT solo deja pasar respuestas a conexiones salientes.'),
  I('<b>Redirigir un puerto</b> (port forwarding) expone un equipo interno a todo internet. Hay programas que barren todas las direcciones del mundo sin parar buscando servicios abiertos: un panel o una cámara expuestos aparecen en sus listas en cuestión de horas.'),
  Q('¿Por qué es mala idea redirigir el puerto 1883 de tu router al broker?', ['Cualquiera en internet podría intentar entrar, y además el tráfico va sin cifrar', 'Porque MQTT no funciona por internet', 'Porque gasta más electricidad', 'No es mala idea'], 'Expones un servicio sin cifrar al mundo entero.'),
  I('Alternativas seguras para usar tu sistema desde fuera:\n· <b>VPN</b> propia (WireGuard en el router o en la Pi): el móvil entra en tu red, cifrado.\n· Una red privada superpuesta gestionada por un tercero.\n· Que tu sistema salga hacia un servicio, nunca que el servicio entre en tu red.'),
  { t: 'order', q: 'Ordena de más a menos seguro para ver tu panel desde fuera.', items: ['VPN propia hacia tu red', 'Un servicio externo al que tu sistema se conecta de salida', 'Puerto abierto con HTTPS y contraseña fuerte', 'Puerto abierto sin cifrar'], e: 'Cuanto menos expuesto, mejor.' },
  I('<b>UPnP</b> permite que un aparato abra puertos en tu router él solo, sin preguntarte. Cómodo para una consola; peligroso para una cámara barata. Desactívalo si no lo necesitas.'),
  Q('Una cámara barata abre sola un puerto en tu router. ¿Qué función lo permite?', ['UPnP', 'DHCP', 'mDNS', 'NTP'], 'Revisa la tabla UPnP del router.'),
  I('<b>IPv6</b> en dos pinceladas: direcciones de 128 bits, tantas que cada equipo puede tener una pública, sin NAT. Entonces la protección ya no viene “de regalo” del NAT, sino del <b>cortafuegos</b> del router. Muchos bloquean las conexiones entrantes por defecto, pero compruébalo en el tuyo.'),
  Q('Con IPv6 y sin NAT, ¿qué protege a tus nodos de conexiones entrantes?', ['El cortafuegos del router', 'Nada, nunca', 'El DNS', 'La clave del WiFi'], 'Sin NAT, el cortafuegos es la puerta.'),
  Q('¿Por qué un nodo MQTT recibe órdenes de un broker externo sin abrir puertos?', ['Porque el nodo abrió la conexión de salida y la mantiene', 'Porque el broker conoce su MAC', 'Porque usa UDP', 'Porque el NAT se desactiva'], 'La conexión saliente queda abierta en ambos sentidos.', { c: 'io_pubsub' })
 ]),
 L('io9', 'WiFi de 2,4 GHz: canales, RSSI y diagnóstico', 'antenna', ['io_net'], [
  I('El WiFi de 2,4 GHz tiene 13 canales en Europa, separados 5 MHz, pero cada red ocupa unos 20 MHz: los canales vecinos se solapan. Sin solaparse caben tres (1, 6 y 11), o cuatro en Europa (1, 5, 9 y 13) si todas las redes usan 20 MHz.'),
  Q('Tu red está en el canal 3 y las de los vecinos en el 1 y el 6. ¿Qué pasa?', ['Se solapa con las dos: peor que compartir el 1 o el 6', 'Nada, son canales distintos', 'Mejora la velocidad', 'Solo afecta a los 5 GHz'], 'Mejor compartir un canal que solaparse con dos.'),
  I('El <b>RSSI</b> es la potencia recibida en dBm: 0 dBm es 1 mW y −30 dBm, una milésima de mW. Orientativo para WiFi: −50 dBm excelente, −67 dBm buen enlace estable, −75 dBm justo, −85 dBm casi inutilizable.'),
  G('io_dbm'), G('io_dbm'),
  Nm('Un nodo marca −58 dBm y otro −64 dBm. ¿Cuántas veces más potencia recibe el primero (aprox.)?', 4, 'veces', '6 dB ≈ ×4: cada 3 dB, el doble.', { tol: 0.2 }),
  I('Lo que más atenúa los 2,4 GHz en casa: hormigón y ladrillo macizo, metal (neveras, armarios, mallas), espejos y agua (peceras, personas). La antena impresa del ESP32 es direccional: girarlo puede cambiar varios dB.'),
  Q('Un nodo dentro de un armario metálico marca −88 dBm. ¿Primer arreglo?', ['Sacar la antena fuera o usar un módulo con antena externa', 'Subir el QoS de MQTT', 'Cambiar la máscara', 'Más memoria'], 'El metal hace de jaula.'),
  I('Diagnóstico en orden: 1) ¿Tiene IP? (monitor serie). 2) ¿Responde a ping? 3) ¿Qué RSSI tiene? 4) ¿Resuelve nombres? 5) ¿Llega al puerto del servicio? Desde el PC: ping, y mosquitto_sub para ver si llegan los mensajes.'),
  { t: 'order', q: 'Ordena el diagnóstico de un nodo que “no envía”.', items: ['Mirar en el monitor serie si tiene IP', 'Hacer ping al nodo desde el PC', 'Mirar el RSSI', 'Comprobar que resuelve el nombre del broker', 'Suscribirse a su tema con mosquitto_sub'], e: 'De abajo arriba: radio, IP, nombres, aplicación.' },
  Q('¿Puede el ESP32 clásico conectarse a una red de 5 GHz?', ['No: solo tiene radio de 2,4 GHz', 'Sí, sin problema', 'Solo con antena externa', 'Solo por BLE'], 'Asegúrate de que tu router emite también en 2,4 GHz. Algunos chips nuevos, como el ESP32-C5, sí trabajan en 5 GHz.')
 ]),
 SIM('io-s2', 'Reto: LED de estado de red', 'Un buen nodo dice cómo está sin pantalla. Este programa usa un LED en el GPIO26: parpadeo rápido mientras “conecta”, casi fijo cuando está conectado y dos destellos si se cae la red. Mantén pulsado el botón del GPIO4 para simular la caída y suéltalo para ver cómo reconecta.', { arduino: 'io_estado', board: 'esp32', parts: ['push', 'res', 'led'], code: true, hint: 'Pulsador entre D4 y GND (usa la pull-up interna). LED: D26 → 100–220 Ω → ánodo; cátodo a GND. Mantén pulsado unos segundos y suelta.' }, 'io_estado'),
 PRJ('io-p2', 'Proyecto: mapa de cobertura WiFi', 'io_wifimap')
] },

{ id: 'io-m3', title: 'HTTP, JSON y APIs', desc: 'Peticiones y respuestas, REST, códigos de estado, JSON con ArduinoJson, sondeo frente a empuje y WebSocket.', nodes: [
 L('io10', 'HTTP: petición y respuesta', 'code', ['io_http'], [
  I('HTTP es un diálogo de texto: el cliente envía una <b>petición</b> y el servidor contesta con una <b>respuesta</b>. La petición lleva método, ruta, cabeceras y, a veces, un cuerpo.', { code: 'GET /api/estado HTTP/1.1\nHost: termo.local\nAccept: application/json\n\nHTTP/1.1 200 OK\nContent-Type: application/json\nContent-Length: 28\n\n{"t":21.4,"h":48,"rssi":-61}' }),
  Q('En esa petición, ¿qué es /api/estado?', ['La ruta del recurso pedido', 'El método', 'El código de estado', 'La IP del servidor'], 'Método GET, ruta /api/estado.'),
  Q('¿Qué indica Content-Type: application/json?', ['Que el cuerpo es JSON', 'Que la conexión está cifrada', 'Que el servidor es un ESP32', 'Que la respuesta es un error'], 'Las cabeceras describen el mensaje.'),
  I('Los <b>métodos</b> expresan la intención:\n· <b>GET</b>: leer, sin cambiar nada.\n· <b>POST</b>: crear o enviar algo (una lectura nueva).\n· <b>PUT</b>: sustituir un recurso entero. <b>PATCH</b>: cambiar una parte.\n· <b>DELETE</b>: borrar.'),
  { t: 'match', q: 'Une cada acción con su método.', pairs: [['Leer la temperatura actual', 'GET'], ['Enviar una lectura nueva al servidor', 'POST'], ['Cambiar solo el umbral de alarma', 'PATCH'], ['Borrar un nodo dado de baja', 'DELETE']] },
  I('Las <b>cabeceras</b> llevan metadatos: tipo de contenido, longitud, autenticación (Authorization), caché… Cuidado con las de autenticación: son credenciales y viajan en claro si no usas HTTPS.'),
  Q('Un nodo envía Authorization: Bearer … por HTTP (sin S) en tu WiFi. ¿Riesgo?', ['Cualquiera que capture el tráfico puede copiar el token', 'Ninguno, es solo una cabecera', 'Que se borra solo', 'Solo afecta a la velocidad'], 'Credenciales, siempre por HTTPS.', { c: 'io_security' }),
  I('En el ESP32, <b>HTTPClient</b> hace peticiones y <b>WebServer</b> (o un servidor asíncrono) las atiende. Siempre: pon un tiempo máximo, comprueba el código de estado y libera con end().'),
  Q('¿Qué falta en este fragmento?', ['Comprobar el código de estado antes de usar la respuesta', 'Nada', 'Un delay(5000)', 'Un Serial.begin dentro'], 'Si el servidor responde 500, getString() te dará la página de error.', { code: 'HTTPClient http;\nhttp.begin(url);\nhttp.GET();\nString cuerpo = http.getString();\nprocesar(cuerpo);\nhttp.end();' }),
  Q('HTTP es “sin estado”. ¿Qué significa?', ['Cada petición es independiente: el servidor no recuerda las anteriores por sí mismo', 'Que no devuelve códigos de estado', 'Que no lleva cabeceras', 'Que no puede enviar JSON'], 'Las sesiones se construyen encima (cookies, tokens).')
 ]),
 L('io11', 'REST y códigos de estado', 'code', ['io_http'], [
  I('<b>REST</b> es una forma de diseñar APIs: cada cosa es un <b>recurso</b> con su ruta (/nodos/salon, /nodos/salon/lecturas) y los métodos HTTP dicen qué haces con él. Es predecible: si conoces una ruta, adivinas las demás.'),
  Q('En una API REST de tu casa, ¿qué ruta es más coherente para las lecturas del nodo de la cocina?', ['GET /nodos/cocina/lecturas', 'GET /dameLasLecturasCocina', 'POST /leer?cocina', 'GET /cocina-lecturas-todas'], 'Recursos anidados y GET para leer.'),
  I('El <b>código de estado</b> resume la respuesta:\n· <b>2xx</b>, éxito: 200 OK, 201 creado, 204 sin contenido.\n· <b>3xx</b>, redirección: 301, 302, 304 (no ha cambiado).\n· <b>4xx</b>, error del cliente: 400 mal formada, 401 sin autenticar, 403 prohibido, 404 no existe, 429 demasiadas peticiones.\n· <b>5xx</b>, error del servidor: 500, 503 no disponible.'),
  { t: 'match', q: 'Une cada código con su significado.', pairs: [['200', 'Todo bien'], ['401', 'Falta autenticarse'], ['404', 'Ese recurso no existe'], ['429', 'Vas demasiado deprisa'], ['503', 'El servidor no está disponible']] },
  Q('Tu nodo recibe 429 de una API pública. ¿Qué haces?', ['Esperar más entre peticiones (y respetar la cabecera Retry-After si viene)', 'Reintentar en bucle al momento', 'Cambiar a POST', 'Ignorarlo'], 'Te piden que bajes el ritmo.', { c: 'io_retry' }),
  Q('Recibes 500 al enviar una lectura. ¿De quién es el problema?', ['Del servidor: conviene reintentar más tarde', 'Del nodo: la petición está mal formada', 'Del DNS', 'Del WiFi'], '5xx = servidor; 4xx = cliente.'),
  Q('Recibes 400 al enviar una lectura. ¿Reintentas igual?', ['No: la petición está mal y repetirla dará el mismo error', 'Sí, en bucle', 'Sí, cambiando de puerto', 'Solo con QoS 2'], 'Corrige la petición antes.'),
  I('Una petición es <b>idempotente</b> si repetirla deja el sistema igual que hacerla una vez. GET, PUT y DELETE lo son; POST normalmente no. Importa al reintentar: repetir “umbral = 30” es inocuo; repetir “suma 1 al contador” puede contar dos veces.'),
  Q('Tras un corte, no sabes si llegó tu petición. ¿Cuál puedes repetir sin miedo?', ['PUT /nodos/salon/umbral con {"valor":30}', 'POST /contador/incrementar', 'POST /pedidos', 'Ninguna'], 'Fijar un valor es idempotente; sumar, no.'),
  Q('¿Qué método y qué código esperas al dar de alta un nodo nuevo correctamente?', ['POST y 201', 'GET y 404', 'DELETE y 200', 'PUT y 500'], '201 = creado.')
 ]),
 L('io12', 'JSON y ArduinoJson', 'code', ['io_http'], [
  I('<b>JSON</b> es texto con objetos {"clave": valor}, listas [1, 2, 3], números, cadenas entre comillas dobles, true, false y null. Es el idioma común de casi todas las APIs y de muchos mensajes MQTT.', { code: '{\n  "id": "salon",\n  "t": 21.4,\n  "h": 48,\n  "bateria": 3.91,\n  "alarmas": ["puerta"],\n  "ok": true\n}' }),
  Q('En el ejemplo, ¿qué tipo tiene "alarmas"?', ['Una lista (array)', 'Un número', 'Un objeto', 'Un booleano'], 'Corchetes = lista.'),
  Q('¿Cuál es JSON válido?', ['{"t": 21, "ok": true}', "{'t': 21}", '{t: 21}', '{"t": 21, "ok": True}'], 'Claves entre comillas dobles; true en minúscula. Y los decimales, en JSON, siempre con punto.'),
  G('io_jsonSize'),
  I('En el ESP32, <b>ArduinoJson</b> (versión 7) usa un JsonDocument que crece según lo necesita. Para crear un mensaje, rellenas el documento y lo <b>serializas</b>; para leer uno, lo <b>deserializas</b> y compruebas el error.', { code: '#include <ArduinoJson.h>\n\nJsonDocument doc;\ndoc["id"] = "salon";\ndoc["t"] = 21.4;\ndoc["h"] = 48;\nchar buf[64];\nsize_t n = serializeJson(doc, buf);   // n = bytes escritos\n\nJsonDocument entrada;\nDeserializationError err = deserializeJson(entrada, carga, len);\nif (err) Serial.println(err.c_str());\nint umbral = entrada["umbral"] | 30;   // 30 si no viene' }),
  Q('¿Qué hace entrada["umbral"] | 30?', ['Da el umbral recibido, o 30 si falta o no es un número', 'Un OR de bits', 'Suma 30', 'Escribe 30 en el documento'], 'Es el valor por defecto de ArduinoJson.', { code: 'int umbral = entrada["umbral"] | 30;' }),
  I('El tamaño importa: el JSON de una API puede no caber en la RAM del ESP32. Soluciones: pedir a la API solo los campos necesarios, y usar un <b>filtro</b> al deserializar para descartar lo que no necesitas mientras se lee.'),
  Q('Una API devuelve 60 kB de previsión y solo quieres 3 números. ¿Mejor estrategia?', ['Pedir menos campos en la URL y deserializar con filtro desde el flujo', 'Comprar un ESP32 con más flash', 'Leerlo todo a un String y buscar con indexOf', 'Pedirlo en trozos de 10 bytes'], 'Ahorra RAM y tiempo.'),
  I('JSON frente a binario: {"co2":812} son 11 bytes; el mismo dato como entero de 16 bits ocupa 2. Por WiFi da igual; por LoRaWAN, donde cada byte cuesta tiempo en aire y batería, se envía binario y se decodifica en el servidor.'),
  Nm('Cuatro valores de 16 bits en binario. ¿Cuántos bytes?', 8, 'bytes', '4 × 2 bytes.'),
  Q('¿Por qué en LoRaWAN no se envía JSON?', ['Cada byte alarga el tiempo en aire, que está muy limitado', 'LoRa no admite letras', 'JSON no se puede cifrar', 'Por costumbre'], 'Bytes = tiempo en aire = batería y ciclo de trabajo.', { c: 'io_lora' })
 ]),
 L('io13', 'Servidor en el nodo o cliente que envía', 'code', ['io_http'], [
  I('Dos formas de sacar datos de un nodo por HTTP:\n· <b>Servidor en el nodo</b>: el ESP32 atiende peticiones (como el termómetro con su página). Sencillo y sin infraestructura.\n· <b>Cliente que envía</b>: el nodo hace POST a un servidor central cuando tiene datos.'),
  { t: 'match', q: 'Une cada situación con el enfoque que encaja.', pairs: [['Un único sensor que miras de vez en cuando desde el móvil', 'Servidor en el nodo'], ['Un nodo a pilas que duerme 10 minutos', 'Cliente que envía'], ['Veinte nodos que alimentan una base de datos', 'Cliente que envía '], ['Configurar un nodo nuevo desde el navegador', 'Servidor en el nodo ']] },
  Q('¿Por qué un nodo que duerme no puede ser servidor?', ['Dormido no escucha: nadie podría conectarse a él', 'Porque HTTP no funciona con baterías', 'Porque no tiene IP', 'Sí puede, sin problema'], 'El que duerme debe hablar él.', { c: 'io_duty' }),
  I('Servidor en el nodo: no bloquees. Si en loop() haces delay(5000), cada petición espera hasta 5 s. Usa millis() o un servidor asíncrono y responde rápido; lo lento (un sensor que tarda), aparte.'),
  Q('¿Qué problema tiene este loop?', ['El servidor solo atiende una vez cada 10 s', 'Ninguno', 'No compila', 'Gasta demasiada flash'], 'handleClient() debe llamarse a menudo.', { code: 'void loop() {\n  server.handleClient();\n  leerSensor();\n  delay(10000);\n}' }),
  I('Cliente que envía: el servidor central (tu Raspberry Pi con Node-RED, Home Assistant o una pequeña API propia) recibe, guarda y reparte. El nodo solo necesita una dirección y no hay que abrir nada hacia él.'),
  { t: 'order', q: 'Ordena un envío robusto por HTTP desde un nodo.', items: ['Medir y construir el JSON', 'Conectar al WiFi si no lo está', 'POST con tiempo máximo', 'Comprobar el código de estado', 'Si falla, guardar en cola y reintentar más tarde'], e: 'Nunca des por hecho que llegó.' },
  Q('Un nodo hace POST, recibe 201 y pierde la conexión antes de leer el cuerpo. ¿Llegó el dato?', ['Sí: el código ya confirma que el servidor lo creó', 'No', 'No se puede saber nunca', 'Solo si reintenta'], 'El código de estado es la confirmación.'),
  I('Seguridad: un servidor en el nodo acepta conexiones de cualquiera de tu red. Si tiene rutas que cambian cosas (abrir una válvula), protégelas con autenticación, y nunca lo expongas a internet.'),
  Q('Tu nodo de riego tiene la ruta /abrir sin contraseña. ¿Quién puede abrir la válvula?', ['Cualquier equipo de tu red, incluido un aparato comprometido', 'Solo tú', 'Nadie', 'Solo el router'], 'Defensa en profundidad: también dentro de casa.', { c: 'io_security' })
 ]),
 L('io14', 'Sondeo, empuje y WebSocket', 'code', ['io_http', 'io_pubsub'], [
  I('¿Cómo se entera un panel de que algo ha cambiado?\n· <b>Sondeo</b> (polling): preguntar cada X segundos si hay novedades. Sencillo, pero gasta si casi nunca cambia y llega tarde si cambia justo después de preguntar.\n· <b>Empuje</b> (push): quien tiene el dato lo envía cuando cambia.'),
  Nm('Un panel pregunta cada 2 s por una puerta que cambia unas 10 veces al día. ¿Peticiones al día?', 43200, 'peticiones', '86 400 / 2. Casi todas inútiles.'),
  Q('Con sondeo cada 30 s, ¿cuánto puede tardar en verse un cambio?', ['Hasta 30 s', 'Nada', '1 s', 'Hasta 60 s'], 'En el peor caso, cambia justo después de preguntar.'),
  I('<b>WebSocket</b> empieza como una petición HTTP y se “mejora” a un canal bidireccional permanente sobre la misma conexión TCP. El servidor puede enviar cuando quiera. Es lo que usan los paneles web en directo, como el de Home Assistant.'),
  Q('¿Qué ventaja tiene WebSocket sobre el sondeo para un panel en el navegador?', ['El servidor envía los cambios al instante sin peticiones repetidas', 'Usa UDP', 'No necesita servidor', 'No necesita red'], 'Canal abierto en los dos sentidos.'),
  I('<b>MQTT</b> es empuje entre máquinas: los nodos publican al cambiar algo y los interesados lo reciben al momento. Muchos brokers ofrecen además MQTT sobre WebSocket para que una página web se suscriba directamente.'),
  { t: 'match', q: 'Une cada técnica con su caso ideal.', pairs: [['Sondeo HTTP', 'Consultar la previsión del tiempo cada hora'], ['WebSocket', 'Panel web que se actualiza en directo'], ['MQTT', 'Muchos nodos publicando para muchos lectores'], ['Webhook (POST de aviso)', 'Un servicio que te avisa de un evento']] },
  Q('Un nodo a pilas con un dato que cambia rara vez. ¿Qué modelo?', ['Empuje: despierta, envía si cambió (o cada cierto tiempo) y duerme', 'Que el servidor lo sondee cada segundo', 'Un WebSocket abierto siempre', 'Ninguno'], 'Al que duerme no se le puede sondear.', { c: 'io_duty' }),
  Q('¿Por qué el sondeo sigue siendo útil a veces?', ['Es sencillo y basta cuando el dato cambia despacio y no urge', 'Es más rápido que el empuje', 'Gasta menos siempre', 'Es más seguro'], 'Para la previsión del tiempo, preguntar cada hora sobra.'),
  Q('Un servicio externo hace un POST a tu servidor cuando ocurre algo. ¿Cómo se llama?', ['Webhook', 'Sondeo', 'Keepalive', 'DHCP'], 'Empuje entre servidores usando HTTP.')
 ]),
 PRJ('io-p3', 'Proyecto: timbre con aviso al móvil sin nube', 'io_doorbell'),
 PRJ('io-p4', 'Proyecto: panel e-ink de información', 'io_eink')
] },

{ id: 'io-m4', title: 'MQTT a fondo', desc: 'Broker, temas y comodines, QoS, retenidos, último testamento, sesiones y un Mosquitto con usuarios, permisos y TLS.', nodes: [
 L('io15', 'Publicar y suscribir: el broker', 'cloud', ['io_pubsub'], [
  I('<b>MQTT</b> es un protocolo ligero de publicación y suscripción sobre TCP. Hay un servidor central, el <b>broker</b> (por ejemplo, Mosquitto en una Raspberry Pi), y muchos <b>clientes</b>: nodos, paneles, Home Assistant, Node-RED.'),
  I('Un cliente <b>publica</b> un mensaje en un <b>tema</b> (casa/salon/temperatura). El broker lo entrega a todos los clientes <b>suscritos</b> a ese tema. Publicador y suscriptor no se conocen ni tienen por qué estar conectados a la vez… salvo que uses retenidos o sesiones.'),
  { t: 'order', q: 'Ordena lo que pasa cuando el nodo del salón publica.', items: ['El nodo abre una conexión TCP con el broker y se identifica', 'Publica 21,4 en casa/salon/temperatura', 'El broker busca qué clientes están suscritos a ese tema', 'Les reenvía el mensaje', 'El panel lo muestra'], e: 'El broker es el cartero.' },
  Q('¿Quién decide a quién llega un mensaje MQTT?', ['El broker, según las suscripciones', 'El nodo que publica', 'El router', 'El DNS'], 'El publicador no sabe quién escucha.'),
  Q('Quieres que una tablet también vea la temperatura. ¿Qué tocas?', ['Nada en el nodo: la tablet se suscribe al tema', 'Reprogramar el nodo con la IP de la tablet', 'Añadir otro broker', 'Abrir un puerto'], 'Desacoplamiento.'),
  I('El mensaje lleva un tema y una <b>carga</b> (payload): bytes que el broker no interpreta. Puede ser un número en texto, un JSON o binario; es un acuerdo entre quien publica y quien lee. El límite del protocolo son 256 MB, pero en un ESP32 piensa en cientos de bytes: PubSubClient trae un búfer de 256 bytes por defecto (se amplía con setBufferSize).'),
  Q('Un JSON de 400 bytes no sale del ESP32 con PubSubClient: publish() devuelve false. ¿Causa probable?', ['El búfer por defecto, de 256 bytes, se queda corto', 'El broker no admite JSON', 'El tema es demasiado corto', 'Falta QoS 2'], 'mqtt.setBufferSize(512) lo arregla.'),
  I('Todos los clientes abren la conexión <b>hacia</b> el broker. Cada uno tiene un <b>identificador de cliente</b> único: si dos se conectan con el mismo, el broker echa al primero, y si los dos reconectan sin parar, se expulsan mutuamente.'),
  Q('Dos nodos se desconectan y reconectan cada pocos segundos. ¿Qué revisas primero?', ['Que no compartan identificador de cliente', 'El canal WiFi', 'La máscara', 'El tamaño del JSON'], 'Usa la MAC o un nombre único en el ID.'),
  { t: 'match', q: 'Une cada pieza de MQTT con su papel.', pairs: [['Broker', 'Recibe y reparte mensajes'], ['Tema', 'Dirección del mensaje'], ['Carga', 'El contenido, en bytes'], ['ID de cliente', 'Nombre único de cada conexión']] },
  G('io_dataMonth')
 ]),
 L('io16', 'Temas bien diseñados y comodines', 'cloud', ['io_topics'], [
  I('Un <b>tema</b> es una cadena con niveles separados por /: casa/salon/temperatura. No hay que crearlo: existe en cuanto alguien publica en él. Distingue mayúsculas, admite espacios (mejor no los uses) y no debería empezar por /.'),
  I('Diseño recomendado: de lo general a lo concreto, en minúsculas, sin acentos ni espacios, y separando datos de órdenes:\n<b>casa/salon/clima/estado</b> → telemetría\n<b>casa/salon/clima/disponible</b> → online/offline\n<b>casa/salon/clima/cmd</b> → órdenes\nAsí los comodines y los permisos encajan solos.'),
  Q('¿Qué tema está mejor diseñado?', ['casa/cocina/nevera/estado', '/Casa Cocina/Nevera', 'nevera_cocina_casa_temperatura', 'casa/cocina/nevera/Temperatura Ahora'], 'Jerárquico, en minúsculas, sin espacios ni barra inicial.'),
  I('Al <b>suscribirse</b> se pueden usar comodines:\n· <b>+</b> sustituye exactamente un nivel: casa/+/temperatura.\n· <b>#</b> sustituye cualquier número de niveles (incluso cero) y va siempre al final: casa/salon/#.\nAl <b>publicar</b> no se usan comodines.'),
  Q('Suscrito a casa/+/temperatura. ¿Recibe casa/salon/sensor1/temperatura?', ['No: + es exactamente un nivel', 'Sí', 'Solo con QoS 1', 'Solo si es retenido'], 'Ahí hay dos niveles entre casa y temperatura.'),
  Q('Suscrito a casa/salon/#. ¿Recibe casa/salon?', ['Sí: # incluye también el nivel padre', 'No', 'Solo con +', 'Solo si es retenido'], '# puede valer cero niveles.'),
  G('io_topicMatch'), G('io_topicMatch'),
  { t: 'match', q: 'Une cada suscripción con lo que recibe.', pairs: [['casa/+/temperatura', 'La temperatura de cada habitación'], ['casa/salon/#', 'Todo lo del salón'], ['+/+/bateria', 'Baterías en temas de tres niveles'], ['casa/#', 'Toda la casa']] },
  Q('¿Es válida la suscripción casa/#/temperatura?', ['No: # solo puede ir al final', 'Sí', 'Solo en MQTT 5', 'Solo con QoS 0'], 'El broker la rechaza.'),
  G('io_topicMatch'),
  I('Los temas que empiezan por <b>$</b> son del broker: $SYS/… publica estadísticas (clientes conectados, mensajes, memoria). No entran en una suscripción a # ni a +/…: hay que pedirlos explícitamente con $SYS/#.'),
  G('io_topicMatch')
 ]),
 L('io17', 'QoS 0, 1 y 2', 'cloud', ['io_qos'], [
  I('MQTT ofrece tres niveles de calidad de servicio (<b>QoS</b>) en cada tramo (del publicador al broker y del broker a cada suscriptor):\n· <b>QoS 0</b>: como mucho una vez. Se envía y ya.\n· <b>QoS 1</b>: al menos una vez. El receptor confirma (PUBACK) y, si la confirmación no llega, se reenvía.\n· <b>QoS 2</b>: exactamente una vez, con cuatro mensajes (PUBLISH, PUBREC, PUBREL, PUBCOMP).'),
  { t: 'match', q: 'Une cada QoS con su garantía.', pairs: [['QoS 0', 'Como mucho una vez'], ['QoS 1', 'Al menos una vez, quizá repetido'], ['QoS 2', 'Exactamente una vez']] },
  Q('Con QoS 1, ¿por qué puede llegar un mensaje dos veces?', ['Si se pierde la confirmación, el emisor reenvía un mensaje que sí había llegado', 'Por un fallo del broker', 'Porque QoS 1 manda siempre dos copias', 'No puede'], 'El emisor no sabe si se perdió el mensaje o la confirmación.'),
  I('La QoS efectiva hacia un suscriptor es la <b>menor</b> entre la de publicación y la de su suscripción. Si publicas con QoS 1 y alguien se suscribió con QoS 0, a ese le llega con QoS 0.'),
  Q('Publicas con QoS 2 y un panel se suscribió con QoS 1. ¿Con qué QoS le llega?', ['QoS 1', 'QoS 2', 'QoS 0', 'QoS 3'], 'Manda la menor.'),
  I('Más QoS no siempre es mejor: cuesta más mensajes, memoria y tiempo de radio. Para una temperatura que se envía cada minuto, perder una lectura no importa: QoS 0. Para una orden o una alarma, QoS 1 y un receptor que tolere duplicados.'),
  Q('Telemetría de temperatura cada 30 s. ¿QoS razonable?', ['0', '2', '1 con sesión persistente siempre', 'Siempre 2, da igual'], 'La siguiente lectura llega en 30 s.'),
  Q('Una orden “abre la válvula 5 minutos”. ¿Qué es lo más robusto?', ['QoS 1 y una orden idempotente (con un identificador o el estado deseado)', 'QoS 0', 'Enviarla tres veces con QoS 0', 'QoS 2 y no pensar más'], 'Con QoS 1 puede llegar dos veces: que no importe.', { c: 'io_http' }),
  I('Ojo con las librerías: <b>PubSubClient</b>, la más común en Arduino, solo publica con QoS 0 (aunque puede suscribirse con QoS 1). Para publicar con QoS 1 en el ESP32 usa el cliente MQTT de ESP-IDF (esp-mqtt) u otra librería que lo admita.'),
  Q('Necesitas que un ESP32 publique alarmas con QoS 1. ¿Qué haces?', ['Usar un cliente que lo admita, como esp-mqtt de ESP-IDF', 'Pasar un 1 a publish() de PubSubClient', 'Subir el keepalive', 'Usar un retenido'], 'Lee siempre qué QoS admite tu librería.'),
  Q('¿Con qué QoS publicas el total acumulado de kWh (no el incremento) cada minuto?', ['0 o 1: el total es idempotente y un duplicado no estropea nada', 'Siempre 2', 'Ninguno', 'Solo retenido, sin QoS'], 'Enviar el estado, no el cambio, simplifica la fiabilidad.')
 ]),
 L('io18', 'Retenidos, último testamento y sesiones', 'cloud', ['io_qos'], [
  I('Un mensaje <b>retenido</b> se queda guardado en el broker como último valor de su tema. Cada cliente que se suscriba después lo recibe al instante. Solo hay uno por tema: publicar otro retenido lo sustituye.'),
  Q('Un panel arranca a las 10:00. La puerta pasó a “cerrada” a las 7:00 con retenido. ¿Qué ve?', ['“cerrada”, nada más suscribirse', 'Nada hasta el próximo cambio', 'Todos los cambios desde las 7:00', 'Un error'], 'El retenido es el último estado conocido.'),
  Q('¿Cómo se borra un retenido?', ['Publicando en ese tema un mensaje retenido vacío', 'Reiniciando el nodo', 'Con QoS 2', 'No se puede'], 'Carga vacía + retenido = borrar.'),
  I('Retén <b>estados</b> (“la puerta está cerrada”), no <b>eventos</b> (“han llamado al timbre”). Un evento retenido se repite cada vez que alguien se suscribe: el móvil “oiría el timbre” cada vez que abres la app.'),
  Q('¿Qué publicarías como retenido?', ['El estado actual de la persiana', 'La pulsación del timbre', 'Cada pulso del contador de luz', 'Un aviso de fuga ya resuelto'], 'Estados sí; eventos, no.'),
  I('El <b>último testamento</b> (LWT) se registra al conectar: tema, mensaje, QoS y retenido. Si el cliente desaparece sin despedirse (corte de luz, cuelgue, pérdida de WiFi), el broker lo publica en su nombre. Si se desconecta limpiamente (DISCONNECT), no.'),
  { t: 'order', q: 'Ordena el patrón de disponibilidad de un nodo.', items: ['Al conectar, registra el testamento: disponible = "offline", retenido', 'Justo después publica disponible = "online", retenido', 'Funciona y publica sus datos', 'Se corta la luz', 'Pasado el margen del keepalive, el broker publica "offline"'], e: 'Home Assistant usa exactamente este patrón.' },
  I('El <b>keepalive</b> es el máximo silencio permitido: si el cliente no tiene nada que enviar, manda un PINGREQ. Si el broker no oye nada en 1,5 veces el keepalive, da al cliente por muerto (y publica su testamento).'),
  Nm('Keepalive de 60 s. ¿Cuántos segundos como mucho tarda el broker en publicar el testamento tras un corte?', 90, 's', '1,5 × 60.'),
  I('Una <b>sesión persistente</b> (en MQTT 3, clean session a 0; en MQTT 5, Clean Start a 0 y una caducidad de sesión) hace que el broker recuerde las suscripciones del cliente y le guarde los mensajes QoS 1 y 2 mientras está desconectado. Útil para un actuador que se reinicia y no debe perder órdenes.'),
  Q('Un nodo de riego se reinicia durante 20 s y en ese tiempo le mandan una orden con QoS 1. ¿Qué necesita para recibirla al volver?', ['Sesión persistente, el mismo ID de cliente y suscripción con QoS 1', 'Un retenido en el tema de estado', 'QoS 0', 'Un keepalive más largo'], 'El broker le guarda la cola.'),
  Q('¿Qué se publica si el ESP32 llama a mqtt.disconnect() antes de dormir?', ['Nada: el testamento solo se usa si la desconexión no es limpia', 'El testamento', 'Un retenido vacío', '"online"'], 'Si quieres marcarlo como dormido, publícalo tú antes.')
 ]),
 L('io19', 'MQTT en el ESP32 y en Mosquitto', 'shield', ['io_pubsub', 'io_security'], [
  I('En el ESP32 con Arduino: PubSubClient sobre WiFiClient (o WiFiClientSecure para TLS). El patrón: configurar servidor y función de recepción, conectar con testamento, suscribirse y llamar a loop() a menudo.', { code: '#include <WiFi.h>\n#include <PubSubClient.h>\n\nWiFiClient red;\nPubSubClient mqtt(red);\n\nvoid alRecibir(char* tema, byte* carga, unsigned int len) {\n  // compara el tema y procesa la carga (no acaba en un 0)\n}\n\nvoid setup() {\n  // ... conectar el WiFi ...\n  mqtt.setServer("broker.local", 1883);\n  mqtt.setCallback(alRecibir);\n  mqtt.setKeepAlive(30);\n}\n\nvoid loop() {\n  if (!mqtt.connected()) reconectar();   // con espera exponencial\n  mqtt.loop();                           // atiende entradas y keepalive\n}' }),
  Q('¿Qué pasa si no llamas a mqtt.loop()?', ['No se procesan los mensajes entrantes ni el keepalive, y el broker acaba desconectándote', 'Nada', 'Se publica más rápido', 'Se borra la sesión'], 'loop() mantiene viva la conexión.'),
  Q('¿Qué error típico hay en esta función?', ['Trata la carga como una cadena, pero no acaba en 0', 'Ninguno', 'Que el tema sea char*', 'Que len sea unsigned'], 'Copia len bytes a un búfer y añade tú el 0 final.', { code: 'void alRecibir(char* tema, byte* carga, unsigned int len) {\n  Serial.println((char*)carga);\n}' }),
  I('En el broker, <b>Mosquitto</b> (desde la versión 2) es seguro por defecto: sin configuración, solo acepta conexiones del propio equipo. Para la red, defines un listener, prohíbes los anónimos y creas usuarios con mosquitto_passwd.', { code: '# /etc/mosquitto/conf.d/casa.conf\nlistener 1883\nallow_anonymous false\npassword_file /etc/mosquitto/passwd\nacl_file /etc/mosquitto/acl' }),
  Q('Instalas Mosquitto 2 y el ESP32 no conecta desde la red, aunque desde la propia Pi sí. ¿Por qué?', ['Sin un listener configurado, solo escucha en el propio equipo', 'El ESP32 no admite MQTT', 'Falta QoS 2', 'El puerto 1883 está prohibido'], 'Seguro por defecto.'),
  I('Con una <b>ACL</b> limitas qué puede leer y escribir cada usuario. Con pattern y %u (el nombre de usuario) escribes una regla para todos los nodos: cada uno solo escribe bajo su nombre.', { code: '# /etc/mosquitto/acl\nuser panel\ntopic read casa/#\ntopic write casa/+/cmd/#\n\npattern write casa/%u/#\npattern read casa/%u/cmd/#' }),
  Q('Con esa ACL, el usuario “salon” publica en casa/cocina/luz/cmd. ¿Qué pasa?', ['El broker lo descarta: salon solo puede escribir en casa/salon/…', 'Se entrega', 'Se entrega solo al panel', 'Se convierte en retenido'], 'Mínimo privilegio: un nodo comprometido no manda en toda la casa.'),
  I('<b>TLS</b>: el broker escucha también en el 8883 con un certificado. El ESP32 usa WiFiClientSecure y setCACert() con el certificado de la autoridad que firmó el del broker. setInsecure() cifra pero no comprueba con quién hablas: evítalo.'),
  { t: 'match', q: 'Une cada medida con lo que evita.', pairs: [['allow_anonymous false', 'Que se conecte cualquiera'], ['ACL por usuario', 'Que un nodo publique en temas ajenos'], ['TLS en el 8883', 'Que lean las claves en la red'], ['ID de cliente único', 'Expulsiones mutuas']] },
  Q('¿Cómo compruebas desde el PC que llegan todos los mensajes de casa?', ['mosquitto_sub -v -t "casa/#" con tu usuario', 'Haciendo ping al broker', 'Abriendo el puerto 1883 en el router', 'mosquitto_pub sin tema'], '-v muestra el tema de cada mensaje.')
 ]),
 PRJ('io-p5', 'Proyecto: monitor de CO₂ y ventilación', 'io_co2'),
 PRJ('io-p6', 'Proyecto: tu propio broker MQTT seguro', 'io_broker'),
 PRJ('io-p7', 'Proyecto: vigilante de nevera y congelador', 'io_fridge')
] },

{ id: 'io-m5', title: 'Datos: medir, filtrar, guardar y ver', desc: 'Muestreo y Nyquist, filtros, calibración, hora con NTP, InfluxDB, Grafana, Node-RED y detección de anomalías.', nodes: [
 L('io20', 'Muestrear: cuánto y cada cuánto', 'gauge', ['io_sampling'], [
  I('<b>Muestrear</b> es medir a intervalos regulares. Muy poco y te pierdes lo que pasa; demasiado y gastas batería, red y almacenamiento sin ganar nada. La pregunta clave: ¿a qué velocidad cambia lo que mides?'),
  { t: 'match', q: 'Une cada magnitud con un muestreo razonable.', pairs: [['Temperatura de una habitación', 'Cada 1–5 minutos'], ['Humedad del suelo', 'Cada 15–60 minutos'], ['Corriente de la red de 50 Hz para calcular su valor eficaz', 'Miles de muestras por segundo durante un instante'], ['Apertura de una puerta', 'Por evento, no por intervalo']] },
  I('<b>Nyquist</b>: para reconstruir una señal hay que muestrear a más del doble de su frecuencia más alta. Si no, aparece el <b>aliasing</b>: una señal rápida se disfraza de otra lenta que no existe. En la práctica se muestrea de 5 a 10 veces más rápido y se pone un filtro paso bajo antes del ADC.'),
  G('io_sampling'),
  Q('Mides cada 10 minutos la temperatura de un horno que hace ciclos de 4 minutos. ¿Qué verás?', ['Valores que parecen aleatorios o una oscilación lenta que no existe', 'Los ciclos perfectos', 'Una recta exacta', 'Nada'], 'Muestreas más despacio que la mitad del ciclo: aliasing.'),
  I('Un truco de nodo listo: <b>medir rápido y enviar despacio</b>. El nodo muestrea a menudo (barato), calcula media, máximo y mínimo, y envía un resumen cada pocos minutos (caro). No te pierdes los picos y no saturas la red.'),
  Q('Un sensor de vibración muestrea a 1 kHz. ¿Qué envías cada minuto?', ['Un resumen: valor eficaz, pico y quizá una alarma', 'Las 60 000 muestras', 'Solo la última muestra', 'Nada'], 'Procesa en el borde.'),
  G('io_sampling'),
  I('Enviar <b>por cambio</b>: publica solo si el valor cambia más que un umbral, y además un latido cada cierto tiempo para saber que el nodo sigue vivo. Con valores estables, ahorra muchísimo.'),
  Q('Envías la temperatura solo si cambia 0,5 °C. ¿Qué más necesitas?', ['Un envío periódico de todos modos (latido) para distinguir “estable” de “muerto”', 'Nada más', 'QoS 2', 'Más decimales'], 'Silencio no es lo mismo que estabilidad.'),
  Q('El ADC del ESP32 tiene 12 bits de resolución. ¿Garantiza 12 bits de exactitud?', ['No: su ruido y su falta de linealidad dejan menos bits útiles', 'Sí, siempre', 'Sí, si muestreas rápido', 'Solo en el GPIO34'], 'Resolución no es exactitud: promedia y calibra.', { c: 'adc' })
 ]),
 L('io21', 'Filtrar el ruido: media, mediana y exponencial', 'gauge', ['io_sampling'], [
  I('Toda medida real trae <b>ruido</b>: pequeñas variaciones aleatorias. Y a veces <b>picos</b>: una lectura absurda por una interferencia. Filtrar es quedarse con la señal sin perder lo importante. Mueve la ventana:', { tune: { viz: 'io_mavg', params: { N: { label: 'Ventana', val: 1, min: 1, max: 32, step: 1, dec: 0 }, R: { label: 'Ruido', val: 0.6, min: 0, max: 1, step: 0.05, dec: 2 } } } }),
  I('La <b>media móvil</b> promedia las últimas N muestras. El ruido aleatorio baja unas √N veces, pero un cambio real tarda N muestras en verse entero: ese es el precio, el retardo.'),
  TU('Elige una ventana que deje el ruido por debajo del 6 % sin pasar de 12 muestras de retardo.', 'io_mavg', { N: { label: 'Ventana', val: 1, min: 1, max: 32, step: 1, dec: 0 }, R: { label: 'Ruido', val: 0.6, fixed: true } }, { q: 'ok', min: 1, max: 1, text: 'Objetivo: ruido ≤ 6 % y retardo ≤ 12 muestras', hint: 'Prueba ventanas entre 8 y 14.' }, 'Siempre es un compromiso entre suavidad y rapidez.'),
  Q('Con una media de 16 en vez de una de 4, el ruido aleatorio…', ['Baja a la mitad', 'Baja a la cuarta parte', 'Sube', 'No cambia'], '√16 / √4 = 2.'),
  I('La <b>mediana</b> ordena las últimas N muestras y toma la del centro. Un pico aislado queda en un extremo y desaparece; un escalón real pasa sin emborronarse tanto. Perfecta para sensores de distancia que dan alguna lectura loca.'),
  Q('Últimas 5 lecturas: 21, 22, 95, 21, 22. ¿Mediana?', ['22', '36,2', '95', '21'], 'Ordenadas: 21, 21, 22, 22, 95.'),
  Nm('¿Y la media de esas 5 lecturas?', 36.2, '', '(21 + 22 + 95 + 21 + 22) / 5. El pico la arrastra.', { tol: 0.05 }),
  I('El filtro <b>exponencial</b> solo guarda un valor: y = y + α · (x − y). Con α pequeño (0,1) es suave y lento; con α grande (0,5), rápido y ruidoso. Se parece a una media de unas 2/α muestras.', { code: 'float y = NAN;\nconst float ALFA = 0.1;\n\nfloat filtrar(float x) {\n  if (isnan(y)) y = x;        // la primera vez, arranca en la lectura\n  y += ALFA * (x - y);\n  return y;\n}' }),
  Nm('Exponencial con α = 0,2. Valor filtrado 20; llega una lectura de 25. ¿Nuevo valor?', 21, '', '20 + 0,2 × (25 − 20).'),
  Q('¿Por qué el código arranca y con la primera lectura y no con 0?', ['Si empezara en 0, tardaría muchas muestras en subir hasta el valor real', 'Por estilo', 'Porque NAN es más rápido', 'Para ahorrar memoria'], 'Así evitas un arranque falso.', { code: 'if (isnan(y)) y = x;' }),
  { t: 'match', q: 'Une cada filtro con su punto fuerte.', pairs: [['Media móvil', 'Reduce el ruido aleatorio de forma predecible'], ['Mediana', 'Elimina picos aislados'], ['Exponencial', 'Una sola variable de memoria'], ['Sin filtro', 'Ningún retardo']] },
  Q('Un sensor ultrasónico de nivel da de vez en cuando 0 cm por un eco perdido. ¿Primer filtro?', ['Mediana de 5', 'Media de 100', 'Exponencial con α = 0,9', 'Ninguno'], 'Contra picos, mediana.')
 ]),
 L('io22', 'Calibrar y poner en hora', 'timer', ['io_sampling'], [
  I('Un sensor puede ser <b>preciso</b> (repite siempre lo mismo) pero <b>inexacto</b> (siempre se desvía). La <b>calibración</b> corrige la desviación comparando con una referencia conocida.'),
  I('Calibración de dos puntos: mides dos referencias (por ejemplo, 0 °C en un baño de hielo y la lectura de un termómetro patrón a 40 °C) y calculas una recta: <b>real = a · leído + b</b>. Corrige el desplazamiento y la ganancia.'),
  Nm('Baño de hielo (0 °C): tu sensor marca 0,6 °C. Si solo corriges el desplazamiento, ¿qué sumas a cada lectura?', -0.6, '°C', 'Corrección = referencia − leído.', { tol: 0.01 }),
  Nm('Dos puntos: lee 2 a 0 °C reales y 42 a 40 °C reales. ¿Pendiente a de real = a · leído + b?', 1, '', '(40 − 0) / (42 − 2) = 1; y b = −2.', { tol: 0.01 }),
  Q('Un sensor capacitivo de humedad de suelo se calibra mejor…', ['Midiendo al aire y en agua, y comprobando en tu propia tierra', 'Con un baño de hielo', 'No se calibra', 'Bajando el ADC a 8 bits'], 'Cada sensor y cada suelo son distintos.'),
  I('Los datos necesitan <b>hora</b>. El ESP32 no tiene reloj con pila: al arrancar no sabe la fecha. Con <b>NTP</b> (UDP, puerto 123) la pide a un servidor de hora y la mantiene con su reloj interno, que se desvía unos segundos al día.', { code: '#include <time.h>\n\n// Hora peninsular: CET en invierno, CEST en verano\nconfigTzTime("CET-1CEST,M3.5.0,M10.5.0/3", "pool.ntp.org");\n\nstruct tm ahora;\nif (getLocalTime(&ahora)) {\n  char txt[20];\n  strftime(txt, sizeof txt, "%Y-%m-%d %H:%M", &ahora);\n}\ntime_t unix = time(nullptr);   // segundos desde 1970, en UTC' }),
  Q('¿Por qué guardar las marcas de tiempo en UTC y convertir a hora local solo al mostrar?', ['Para evitar líos con el cambio de hora y la hora que se repite en octubre', 'Porque ocupa menos', 'Porque NTP no da la hora local', 'Por costumbre'], 'El último domingo de octubre, las 2:30 existen dos veces.'),
  I('¿Quién pone la hora, el nodo o el servidor? Si el nodo envía al momento, el servidor puede sellar la llegada. Si el nodo <b>encola</b> datos sin red y los manda más tarde, debe enviar la hora a la que midió.'),
  Q('Un nodo guarda 30 lecturas durante un corte de red y las envía de golpe al volver. ¿Qué debe incluir cada una?', ['Su marca de tiempo de medida', 'Nada más: el servidor pone la hora de llegada', 'Su QoS', 'El RSSI'], 'Si no, las 30 tendrían la misma hora.'),
  Q('Un nodo en deep sleep mantiene la hora sin WiFi…', ['Con su reloj RTC interno, que se desvía: hay que resincronizar con NTP de vez en cuando', 'Perfectamente para siempre', 'No puede saber nada de la hora', 'Solo con GPS'], 'Su oscilador interno no es muy preciso.'),
  Q('¿Qué zona horaria describe esta cadena?', ['Hora peninsular: +1 en invierno, +2 en verano, con cambios el último domingo de marzo y de octubre', 'Hora de Canarias', 'UTC sin cambios', 'Hora de Nueva York'], 'Canarias usaría WET0WEST con sus reglas.', { code: 'CET-1CEST,M3.5.0,M10.5.0/3' })
 ]),
 L('io23', 'Series temporales: InfluxDB y Grafana', 'memory', ['io_sampling'], [
  I('Los datos de sensores son <b>series temporales</b>: valores con su instante. Una base de datos de series temporales como <b>InfluxDB</b> está hecha para eso: escribe muy rápido, comprime, resume por intervalos y borra lo viejo automáticamente.'),
  I('InfluxDB usa el <b>protocolo de línea</b>: medida, etiquetas (para filtrar: qué casa, qué sala), campos (los valores) y marca de tiempo.', { code: 'clima,casa=principal,sala=salon temperatura=21.4,humedad=48 1760000000000000000\n└medida┘ └──── etiquetas ─────┘ └────── campos ───────┘ └── tiempo (ns) ──┘' }),
  Q('En ese ejemplo, ¿qué es sala=salon?', ['Una etiqueta: sirve para filtrar y agrupar', 'Un campo con un valor medido', 'La marca de tiempo', 'La medida'], 'Etiquetas = metadatos indexados.'),
  Q('¿Qué deberías guardar como etiqueta y no como campo?', ['El nombre del nodo', 'La temperatura', 'La humedad', 'La tensión de la batería'], 'Lo medido son campos; lo que identifica la serie, etiquetas.'),
  I('No metas en etiquetas cosas con infinitos valores distintos (una hora, un identificador de mensaje): cada combinación de etiquetas crea una serie nueva y la base de datos se hincha. Es el problema de la <b>cardinalidad</b>.'),
  Q('Pones como etiqueta el identificador único de cada mensaje. ¿Problema?', ['Una serie nueva por mensaje: el uso de memoria se dispara', 'Ninguno', 'Que no se puede consultar', 'Que ocupa menos'], 'Etiquetas con pocos valores posibles.'),
  I('<b>Retención y resumen</b>: guarda los datos crudos unos días o semanas y las medias horarias o diarias para siempre. Una temperatura por minuto son 525 600 puntos al año por sensor; su media horaria, 8760.'),
  Nm('Una lectura cada 10 s durante un año (365 días). ¿Cuántos puntos?', 3153600, 'puntos', '365 × 86 400 / 10.', { tol: 1 }),
  I('<b>Grafana</b> dibuja paneles conectándose a InfluxDB (y a muchas otras fuentes): gráficas, indicadores, tablas y alertas. Telegraf o Node-RED hacen de puente entre MQTT y la base de datos.'),
  { t: 'order', q: 'Ordena la tubería típica de datos en casa.', items: ['El nodo publica un JSON por MQTT', 'Telegraf (o Node-RED) se suscribe al tema', 'Escribe los puntos en InfluxDB', 'Grafana consulta InfluxDB', 'Tú ves el panel en el navegador'], e: 'Cada pieza se puede cambiar sin tocar las demás.' },
  Q('En una gráfica de un mes, Grafana no dibuja los 43 200 puntos de cada serie. ¿Qué hace?', ['Agrupa por intervalos (por ejemplo, la media de cada hora) según el zoom', 'Dibuja solo los primeros', 'Falla', 'Inventa puntos'], 'Agregación por ventana de tiempo.'),
  Q('Si prefieres SQL clásico, ¿qué alternativa tienes?', ['PostgreSQL con la extensión TimescaleDB', 'Un archivo de texto por sensor', 'Guardarlo en la flash del ESP32', 'Ninguna'], 'Hay varias opciones; elige la que sepas mantener.')
 ]),
 L('io24', 'Automatizar con Node-RED y detectar anomalías', 'code', ['io_sampling'], [
  I('<b>Node-RED</b> es una herramienta de programación por flujos: arrastras nodos (entrada MQTT, función, conmutador, cambio, petición HTTP, depuración…) y los unes con cables. Corre en Node.js; en una Raspberry Pi se abre en el puerto 1880.'),
  { t: 'order', q: 'Ordena un flujo que avisa si la nevera pasa de 8 °C.', items: ['Nodo mqtt in suscrito a casa/cocina/nevera/estado', 'Nodo json que convierte la carga en objeto', 'Nodo switch: ¿la temperatura supera 8?', 'Nodo function que deja pasar como mucho un aviso cada 30 min', 'Nodo http request que hace POST a ntfy'], e: 'Entrada, convertir, decidir, limitar, actuar.' },
  Q('¿Por qué limitar la frecuencia de los avisos?', ['Para no recibir uno por cada lectura y acabar ignorándolos', 'Para ahorrar CPU', 'Porque ntfy solo admite uno al día', 'No hace falta'], 'La fatiga de alertas mata los sistemas de aviso.'),
  I('Detectar <b>anomalías</b> sencillas, sin inteligencia artificial:\n· <b>Umbral</b>: valor fuera de rango.\n· <b>Velocidad de cambio</b>: sube 10 °C en un minuto.\n· <b>Valor congelado</b>: la misma lectura exacta durante horas (sensor colgado).\n· <b>Silencio</b>: no llegan datos (nodo caído).\n· <b>Estadística</b>: más de 3 desviaciones típicas de la media reciente.'),
  { t: 'match', q: 'Une cada síntoma con su detector.', pairs: [['El nodo deja de publicar', 'Silencio (falta el latido)'], ['La humedad marca 47,0 exacto durante 12 h', 'Valor congelado'], ['El congelador sube de −18 a −5 °C', 'Umbral'], ['La temperatura salta 15 °C en 10 s', 'Velocidad de cambio']] },
  Nm('Media 21 °C y desviación típica 0,5 °C. ¿A partir de qué valor (por arriba) marcas anomalía con 3σ?', 22.5, '°C', '21 + 3 × 0,5.', { tol: 0.01 }),
  Q('¿Qué ventaja tiene detectar por velocidad de cambio frente a un umbral fijo?', ['Avisa antes, aunque el valor aún esté dentro del rango', 'Es más sencilla', 'No necesita datos', 'Nunca da falsos positivos'], 'Una subida brusca es sospechosa aunque todavía no sea alta.'),
  I('El detector de <b>silencio</b> es el más importante y el más olvidado: un nodo muerto no publica “estoy muerto”. Combínalo con el último testamento y con un “visto por última vez” en el panel.'),
  Q('Un nodo a pilas envía cada 15 minutos. ¿Cuándo das la alarma de silencio?', ['Tras 2 o 3 periodos sin datos (30–45 min)', 'Al minuto', 'Nunca', 'Tras una semana'], 'Margen para pérdidas puntuales, pero no demasiado.'),
  Q('Dentro de Home Assistant, ¿qué alternativa a Node-RED tienes para automatizar?', ['Sus automatizaciones: disparador, condiciones y acciones', 'Grafana', 'InfluxDB', 'Mosquitto'], 'Grafana avisa, pero no gobierna dispositivos.'),
  Q('Una automatización enciende la calefacción si un sensor marca menos de 18 °C. El sensor se cuelga marcando 10 °C. ¿Qué protección faltaba?', ['Comprobar que el dato es reciente y plausible antes de actuar', 'QoS 2', 'Más decimales', 'Un retenido'], 'Antes de actuar, valida la entrada.')
 ]),
 SIM('io-s3', 'Reto: media móvil visible', 'Ve el filtrado con tus propios ojos: el ESP32 lee el potenciómetro del GPIO34. El LED del GPIO19 sigue la lectura cruda y el del GPIO18, la media de las últimas 16. Gira el potenciómetro deprisa de un extremo a otro y mira cómo el filtrado llega tarde y suave.', { arduino: 'io_media', board: 'esp32', parts: ['pot', 'res', 'led'], code: true, hint: 'Potenciómetro: extremos a 3V3 y GND, cursor al D34. Dos LEDs rojos: D19 → 100 Ω → LED → GND y D18 → 100 Ω → LED → GND. Gira hasta los dos topes.' }, 'io_media'),
 PRJ('io-p8', 'Proyecto: estación meteorológica con Grafana', 'io_weather'),
 PRJ('io-p9', 'Proyecto: consumo eléctrico sin tocar la red', 'io_energy'),
 PRJ('io-p10', 'Proyecto: contador de personas sin cámaras', 'io_people')
] },

{ id: 'io-m6', title: 'Seguridad y privacidad', desc: 'Modelo de amenazas, secretos y aprovisionamiento, TLS, redes separadas, mínimo privilegio, actualizaciones firmadas y RGPD.', nodes: [
 L('io25', 'Modelo de amenazas', 'shield', ['io_security'], [
  I('La seguridad empieza con cuatro preguntas: <b>¿qué protejo?</b> (datos, control de aparatos, la propia red), <b>¿de quién?</b> (un vecino curioso, una botnet automática, alguien de casa), <b>¿qué puede salir mal?</b> y <b>¿qué hago al respecto?</b> Eso es un modelo de amenazas.'),
  { t: 'match', q: 'Une cada activo con su amenaza principal.', pairs: [['Cerradura conectada', 'Que alguien la abra a distancia'], ['Datos de consumo eléctrico', 'Que revelen cuándo no hay nadie'], ['Cámara barata', 'Que acabe en una botnet'], ['Broker MQTT', 'Que alguien publique órdenes falsas']] },
  I('El atacante más probable de tu casa no es un espía: es un <b>programa automático</b> que barre internet probando contraseñas de fábrica y fallos conocidos. Lo detiene algo aburrido y eficaz: no exponer servicios, usar contraseñas únicas y actualizar.'),
  Q('¿Qué atacante es más probable contra una cámara IP doméstica expuesta a internet?', ['Un programa automático que prueba contraseñas conocidas', 'Un servicio de inteligencia', 'Tu vecino con una antena', 'Nadie'], 'Lo más común es el ataque masivo y automático.'),
  I('La <b>superficie de ataque</b> es todo lo que un atacante puede tocar: puertos abiertos, servicios web, la radio, el puerto USB, la OTA, la app del móvil, la nube del fabricante. Cada cosa que quitas es una cosa menos que defender.'),
  Q('¿Qué reduce la superficie de ataque de un nodo ESP32?', ['Quitar el servidor web de configuración cuando ya no se usa', 'Añadir más funciones', 'Abrir más puertos', 'Usar QoS 2'], 'Menos servicios, menos puertas.'),
  I('Piensa también en el <b>acceso físico</b>: un nodo en el jardín o en el portal se puede robar. Si guarda la clave del WiFi en claro en la flash, quien lo coja la puede leer. Para nodos expuestos: red separada, credenciales propias que puedas revocar y, si hace falta, cifrado de flash.'),
  Q('Te roban el nodo de la estación del jardín. ¿Qué debería poder hacer el ladrón con lo que hay dentro?', ['Como mucho, entrar en la red IoT aislada con unas credenciales que tú revocas', 'Entrar en tu red principal y en tus ordenadores', 'Abrir tu cerradura', 'Nada nunca, pase lo que pase'], 'Diseña para que robar un nodo valga poco.'),
  { t: 'order', q: 'Ordena el proceso de un modelo de amenazas sencillo.', items: ['Dibujar el sistema y sus flujos de datos', 'Listar lo que quiero proteger', 'Imaginar qué puede salir mal en cada flujo', 'Elegir defensas para lo más grave y probable', 'Revisarlo cuando cambie el sistema'], e: 'No es un documento que se hace una vez y se olvida.' },
  Q('¿Qué riesgo atenderías primero?', ['Muy probable y grave: contraseña de fábrica en un aparato expuesto', 'Improbable y leve', 'Improbable y grave: un ataque físico muy sofisticado', 'Probable y leve: que un vecino vea el nombre de tu red'], 'Probabilidad × impacto.')
 ]),
 L('io26', 'Credenciales fuera del código y aprovisionamiento', 'shield', ['io_security'], [
  I('Escribir la clave del WiFi o del broker en el código es cómodo y peligroso: acaba en un repositorio público, en una captura de pantalla o en el binario que compartes. Los repositorios públicos se analizan en minutos buscando claves.'),
  Q('Subiste por error tu secrets.h a GitHub y lo borraste en el commit siguiente. ¿Basta?', ['No: sigue en el historial; cambia esas claves', 'Sí', 'Sí, si el repositorio es pequeño', 'Sí, si fue hace menos de una hora'], 'Una clave publicada es una clave quemada.'),
  I('Nivel 1: un <b>secrets.h</b> excluido con .gitignore. Nivel 2: credenciales en la memoria no volátil (<b>NVS</b>, con la librería Preferences) metidas en el primer arranque. Nivel 3: además, una credencial distinta por nodo, para poder revocar uno sin tocar los demás.', { code: '#include <Preferences.h>\n\nPreferences prefs;\n\nvoid guardarRed(const char* ssid, const char* clave) {\n  prefs.begin("red", false);         // espacio "red", lectura y escritura\n  prefs.putString("ssid", ssid);\n  prefs.putString("clave", clave);\n  prefs.end();\n}\n\nString leerSsid() {\n  prefs.begin("red", true);          // solo lectura\n  String s = prefs.getString("ssid", "");\n  prefs.end();\n  return s;\n}' }),
  Q('¿Qué ganas guardando las credenciales en NVS en vez de en el código?', ['El mismo firmware sirve para todos los nodos y no contiene secretos', 'Más velocidad', 'Cifrado automático siempre', 'Nada'], 'Separas el programa de su configuración.'),
  I('<b>Aprovisionamiento</b>: cómo recibe un nodo nuevo sus credenciales.\n· Un <b>portal cautivo</b>: el nodo crea su propia red WiFi y una página para elegir red y clave (librerías tipo WiFiManager).\n· <b>Improv</b> por USB o Bluetooth (lo usa ESPHome).\n· Por puerto serie, desde un script en tu PC.'),
  Q('El portal cautivo crea una red WiFi para configurar el nodo. ¿Qué precaución tomas?', ['Ponerle contraseña y que se apague tras configurar o tras unos minutos', 'Dejarlo siempre activo', 'Publicarlo en internet', 'Ninguna'], 'Un portal abierto permanente es una puerta.'),
  I('Ojo: la NVS no está cifrada por defecto. Quien tenga el chip en la mano puede volcar la flash y leer las claves. Para eso existe el cifrado de flash (y de NVS) del ESP32, que se activa quemando eFuses y es <b>irreversible</b>: practica antes con una placa de sobra.'),
  Q('¿Qué protege el cifrado de flash?', ['Que alguien con el chip en la mano lea el firmware y las claves', 'La conexión WiFi', 'Que alguien en la red lea MQTT', 'El consumo'], 'Protege los datos guardados, no los que viajan.'),
  { t: 'match', q: 'Une cada técnica con lo que resuelve.', pairs: [['.gitignore con secrets.h', 'Que la clave acabe en el repositorio'], ['NVS con Preferences', 'Un mismo firmware para todos los nodos'], ['Credencial por nodo', 'Revocar un nodo robado sin tocar el resto'], ['Cifrado de flash', 'Leer las claves volcando el chip']] },
  Q('Dos nodos comparten usuario y clave del broker. Pierdes uno. ¿Qué tienes que hacer?', ['Cambiar la clave en todos los nodos que la compartían', 'Nada', 'Cambiar solo el canal WiFi', 'Reiniciar el broker'], 'Por eso, una credencial por nodo.')
 ]),
 L('io27', 'TLS y certificados: qué protege y qué no', 'shield', ['io_security'], [
  I('<b>TLS</b> (lo que hay detrás de HTTPS y de MQTT en el 8883) da tres cosas: <b>confidencialidad</b> (nadie en medio lee), <b>integridad</b> (nadie en medio cambia nada sin que se note) y <b>autenticación del servidor</b> (si compruebas su certificado, sabes que hablas con él).'),
  I('Un <b>certificado</b> es la clave pública del servidor firmada por una <b>autoridad de certificación</b> (CA). El cliente confía en la CA y, por tanto, en lo que firma. En casa puedes crear tu propia CA y meter su certificado en tus nodos: para un broker local no necesitas una CA pública.'),
  Q('¿Qué necesita el ESP32 para comprobar el certificado de tu broker con CA propia?', ['El certificado de tu CA (setCACert)', 'La clave privada del broker', 'La clave privada de la CA', 'Nada'], 'Lo público va al nodo; lo privado no sale del broker ni de tu caja fuerte.'),
  Q('¿Qué archivo no debe salir nunca del broker?', ['La clave privada del broker (broker.key)', 'El certificado del broker', 'El certificado de la CA', 'La configuración sin claves'], 'La clave privada es lo único secreto.'),
  I('Lo que TLS <b>no</b> protege:\n· Los extremos: un broker que admite anónimos sigue abierto, aunque cifre.\n· Los metadatos: quién habla con quién, cuándo y cuánto.\n· Un nodo comprometido: cifra muy bien sus mentiras.\n· Lo que el servidor haga después con tus datos.'),
  Q('Tu broker usa TLS pero tiene allow_anonymous true. ¿Está protegido?', ['No: cualquiera puede conectarse; eso sí, cifrado', 'Sí, TLS lo arregla todo', 'Sí, si el certificado es caro', 'Solo en IPv6'], 'Cifrar no es autenticar al cliente.'),
  Q('Alguien en tu red ve tráfico TLS de un nodo cada 5 min hacia el broker. ¿Qué puede deducir?', ['Que el nodo existe, su ritmo y el tamaño de sus mensajes, pero no el contenido', 'Las temperaturas', 'La clave del WiFi', 'Nada en absoluto'], 'Los metadatos quedan a la vista.'),
  I('Los certificados <b>caducan</b> y llevan nombres e IP: si el nodo conecta a broker.local y el certificado dice otra cosa, la verificación falla (y es lo correcto). Además, comprobar fechas exige que el nodo esté en hora. Apunta las caducidades en un calendario.'),
  Q('Un nodo conecta al broker por IP y el certificado solo incluye el nombre broker.local. ¿Qué pasa?', ['Falla la verificación del nombre: añade la IP al certificado (subjectAltName) o conecta por nombre', 'Funciona igual', 'Se desactiva el cifrado', 'El broker cambia de IP'], 'El nombre que usas debe estar en el certificado.'),
  I('Un paso más: <b>TLS mutuo</b>. El cliente también presenta un certificado propio firmado por tu CA: el broker sabe qué nodo es sin contraseñas, y revocarlo es retirar su certificado. TLS cuesta en el ESP32 decenas de kB de RAM y tiempo de conexión: si puedes, mantén la conexión abierta.'),
  { t: 'match', q: 'Une cada pieza de TLS con su papel.', pairs: [['Certificado de la CA', 'Va en todos los clientes para verificar'], ['Clave privada del broker', 'Solo en el broker'], ['subjectAltName', 'Nombres e IP válidos del servidor'], ['Certificado de cliente', 'Identifica al nodo en TLS mutuo']] }
 ]),
 L('io28', 'Red separada, mínimo privilegio y actualizaciones', 'shield', ['io_security'], [
  I('<b>Red separada</b>: pon los cacharros IoT en su propia red (la de invitados con aislamiento de clientes, o una VLAN). Si uno cae en malas manos, no ve tus ordenadores ni tus móviles. Desde tu red principal puedes llegar a ellos, pero no al revés.'),
  Q('Una bombilla WiFi barata comprometida está en tu red principal. ¿Qué riesgo añade frente a tenerla en una red IoT aislada?', ['Puede atacar a tus ordenadores y espiar el tráfico local', 'Ninguno', 'Que gaste más', 'Que cambie de color'], 'La red separada contiene el daño.'),
  I('Reglas típicas del cortafuegos: la red IoT puede hablar con el broker (8883) y con Home Assistant; no puede iniciar conexiones hacia la red principal; y los aparatos que no necesitan internet, no salen a internet.'),
  { t: 'order', q: 'Ordena de más a menos restrictivo para un nodo sensor casero.', items: ['Solo puede hablar con el broker local', 'Puede hablar con el broker y con un servidor NTP', 'Puede salir a cualquier sitio de internet', 'Está en la red principal sin restricciones'], e: 'Mínimo privilegio también en la red.' },
  I('<b>Mínimo privilegio</b> en todo: cada nodo con su usuario del broker y permiso solo en sus temas; el panel solo lee y manda órdenes; la base de datos con un usuario que solo escribe para Telegraf y otro que solo lee para Grafana.'),
  Q('¿Qué token le das a Grafana para leer de InfluxDB?', ['Uno de solo lectura sobre el bucket que necesita', 'El de administrador', 'Uno de escritura en todo', 'Ninguno, sin autenticación'], 'Si se filtra, que no pueda borrar nada.'),
  I('<b>Actualizar</b> cierra fallos conocidos. En tus nodos: OTA con contraseña o, mejor, imágenes <b>firmadas</b> que el nodo verifica antes de instalar, para que nadie le meta un firmware suyo. Y siempre con vuelta atrás si la versión nueva no arranca bien.'),
  Q('¿Qué impide la firma de las imágenes OTA?', ['Que alguien instale en tu nodo un firmware que no has hecho tú', 'Que la OTA sea lenta', 'Que se pierdan datos', 'Que se caiga el WiFi'], 'El nodo solo acepta lo firmado con tu clave.'),
  I('La normativa europea también empuja: desde el 1 de agosto de 2025, los equipos de radio conectados a internet que se venden en la UE deben cumplir requisitos de ciberseguridad (acto delegado de la Directiva de equipos radioeléctricos), y el Reglamento de Ciberresiliencia exigirá, entre otras cosas, actualizaciones de seguridad durante la vida del producto a partir de diciembre de 2027.'),
  Q('Desactivar UPnP y WPS en el router es un ejemplo de…', ['Reducir la superficie de ataque', 'Cifrado', 'Aprovisionamiento', 'Calibración'], 'Lo que no usas, apagado.'),
  { t: 'match', q: 'Une cada medida con su principio.', pairs: [['Red IoT aislada', 'Contener el daño'], ['ACL por nodo en el broker', 'Mínimo privilegio'], ['OTA firmada', 'Integridad del firmware'], ['Desactivar UPnP', 'Menos superficie de ataque']] }
 ]),
 L('io29', 'Privacidad, RGPD y lecciones de ataques reales', 'shield', ['io_security'], [
  I('Los datos de un sensor pueden ser <b>datos personales</b> si dicen algo de una persona identificable: cuándo entra y sale, cuánto duerme, cuándo está la casa vacía. El <b>RGPD</b> (y en España, además, la LOPDGDD) protege esos datos.'),
  Q('¿Cuál de estos datos es personal?', ['La hora de entrada y salida de un empleado medida por un sensor en su puesto', 'La temperatura media de un invernadero vacío', 'La humedad del suelo de un huerto', 'La presión atmosférica'], 'Lo que se puede asociar a una persona.'),
  I('Principios útiles aunque sea tu casa: <b>minimización</b> (recoge solo lo necesario), <b>finalidad</b> (para qué lo usas), <b>conservación limitada</b> (bórralo cuando ya no sirva), <b>transparencia</b> (que quien vive contigo lo sepa) y <b>seguridad</b>.'),
  { t: 'match', q: 'Une cada principio con un ejemplo.', pairs: [['Minimización', 'Contar personas sin cámara'], ['Conservación limitada', 'Borrar los datos crudos a los 30 días'], ['Transparencia', 'Avisar a quien entra de que hay un sensor'], ['Finalidad', 'Usar el CO₂ solo para ventilar']] },
  Q('En un aula quieres saber cuándo ventilar. ¿Qué opción respeta más la privacidad?', ['Un medidor de CO₂, que no identifica a nadie', 'Una cámara que cuenta alumnos', 'Registrar los móviles por WiFi', 'Un micrófono que mide el ruido y graba'], 'Mide lo que necesitas, no a las personas.'),
  I('Las cámaras merecen cuidado extra: en España, una cámara privada no debe grabar la vía pública más allá de lo imprescindible para su finalidad, y grabar a terceros conlleva obligaciones (carteles informativos, entre otras). Ante la duda, consulta la Agencia Española de Protección de Datos.'),
  I('Lección real 1, <b>Mirai</b> (2016): un programa se propagó por cientos de miles de cámaras y grabadores probando por telnet una lista corta de usuarios y contraseñas de fábrica. Con ellos lanzó ataques de denegación de servicio que dejaron sin acceso a servicios muy conocidos durante horas.'),
  Q('¿Qué habría frenado a Mirai en un aparato concreto?', ['Contraseña única, telnet cerrado y no estar expuesto a internet', 'Más memoria, más CPU y más antenas', 'QoS 2, retenidos y testamento', 'Un canal WiFi distinto'], 'Defensas aburridas y eficaces.'),
  I('Lección real 2: se conocen casos en que un aparato secundario (el termómetro conectado de un acuario, un sistema de climatización) fue la puerta de entrada a la red de una empresa. La lección: <b>separar redes</b>; el cacharro menos importante no debe ver lo más importante.'),
  Q('¿Qué enseñan esos casos sobre la red de casa?', ['Que los aparatos IoT deben ir en una red separada de tus equipos importantes', 'Que no hay que tener acuario', 'Que el WiFi siempre es inseguro', 'Nada aplicable'], 'Contención.'),
  Q('El fabricante de tus cámaras sufre una brecha y se filtran sus credenciales de administración. ¿Qué diseño te protege mejor?', ['Uno que no depende de la nube del fabricante para ver tus cámaras', 'Uno con más megapíxeles', 'Uno con una app más bonita', 'Ninguno'], 'Lo local reduce los terceros que pueden fallar.')
 ]),
 PRJ('io-p11', 'Proyecto: auditoría y bastionado de tu red IoT', 'io_hardening')
] },

{ id: 'io-m7', title: 'Energía y fiabilidad', desc: 'Deep sleep y presupuesto energético, baterías y solar, reconexión exponencial, colas, watchdog, OTA con vuelta atrás y telemetría de salud.', nodes: [
 L('io30', 'Presupuesto energético con deep sleep', 'sleep', ['io_duty'], [
  I('En <b>deep sleep</b> el ESP32 apaga los núcleos, la radio y casi toda la RAM; solo quedan el reloj RTC, un poco de memoria RTC y, si quieres, la lógica para despertar con un pin. El chip baja a unos 10 µA. Al despertar, el programa empieza de nuevo en setup().'),
  Q('Al despertar de deep sleep, ¿dónde empieza el programa?', ['En setup(), como si arrancara', 'Donde se quedó en loop()', 'En una función especial que eliges', 'No despierta solo'], 'La RAM normal se pierde; usa RTC_DATA_ATTR para lo que quieras conservar.'),
  I('Consumo medio = (carga despierto + carga dormido) / periodo. Juega con los deslizadores: con periodos largos, lo que gasta la placa dormida acaba mandando.', { tune: { viz: 'io_sleep', params: { Ia: { label: 'Corriente despierto', val: 120, min: 20, max: 250, step: 5, unit: 'mA', dec: 0 }, ta: { label: 'Tiempo despierto', val: 3, min: 0.2, max: 10, step: 0.1, unit: 's', dec: 1 }, Is: { label: 'Corriente dormido', val: 5000, list: [5, 10, 25, 50, 150, 1000, 5000], unit: 'µA', dec: 0 }, T: { label: 'Periodo', val: 300, list: [10, 30, 60, 300, 600, 900, 1800, 3600], unit: 's', dec: 0 }, C: { val: 2500, fixed: true } } } }),
  TU('Con una batería de 2500 mAh, consigue que el nodo dure más de un año.', 'io_sleep', { Ia: { label: 'Corriente despierto', val: 120, min: 20, max: 250, step: 5, unit: 'mA', dec: 0 }, ta: { label: 'Tiempo despierto', val: 3, min: 0.2, max: 10, step: 0.1, unit: 's', dec: 1 }, Is: { label: 'Corriente dormido', val: 5000, list: [5, 10, 25, 50, 150, 1000, 5000], unit: 'µA', dec: 0 }, T: { label: 'Periodo', val: 60, list: [10, 30, 60, 300, 600, 900, 1800, 3600], unit: 's', dec: 0 }, C: { val: 2500, fixed: true } }, { q: 'dias', min: 365, max: 1e9, text: 'Objetivo: más de 365 días', hint: 'Primero baja la corriente dormido (placa adecuada); luego alarga el periodo y acorta el tiempo despierto.' }, 'Placa de bajo consumo, despertares cortos y espaciados.'),
  G('io_sleepAvg'), G('io_sleepLife'),
  I('La trampa de las placas de desarrollo: el regulador (un AMS1117 gasta unos 5 mA él solo), el chip USB-serie y el LED de encendido siguen consumiendo con el ESP32 dormido. Una DevKit típica “dormida” puede gastar varios mA. Para batería: una placa pensada para ello, o el módulo suelto con un LDO de bajo consumo propio.'),
  Q('Tu DevKit dormida gasta 8 mA. ¿Cuánto dura con 2500 mAh aunque no despierte nunca?', ['Unos 13 días', 'Años', 'Una hora', 'Unos 3 meses'], '2500 / 8 ≈ 312 h ≈ 13 días.'),
  I('Recorta el tiempo despierto: IP reservada, y el canal y el BSSID del router guardados en memoria RTC para saltarte el escaneo; mide antes de conectar; envía y duerme sin esperas. Pasar de 3 s a 0,5 s despierto multiplica la autonomía.', { code: 'RTC_DATA_ATTR uint8_t bssid[6];\nRTC_DATA_ATTR int32_t canal = 0;\n\n// Con canal y BSSID guardados, el ESP32 no necesita escanear\nif (canal) WiFi.begin(WIFI_SSID, WIFI_PASS, canal, bssid);\nelse       WiFi.begin(WIFI_SSID, WIFI_PASS);\n// ... y al conectar la primera vez:\n// canal = WiFi.channel(); memcpy(bssid, WiFi.BSSID(), 6);' }),
  Q('¿Qué pasa con la variable canal si no lleva RTC_DATA_ATTR?', ['Se pierde en cada deep sleep y valdrá 0 al despertar', 'Se conserva igual', 'Se guarda en la flash', 'No compila'], 'Solo la memoria RTC sobrevive.', { code: 'int32_t canal = 0;' }),
  Q('Para despertar con un pulsador desde deep sleep, el pin debe ser…', ['Un GPIO del dominio RTC (por ejemplo, el 33)', 'Cualquiera', 'Solo el GPIO0', 'Uno de los de la flash'], 'ext0 y ext1 usan pines RTC.')
 ]),
 L('io31', 'Baterías, solar y picos del WiFi', 'bat', ['io_duty'], [
  I('El ESP32 funciona entre 3,0 y 3,6 V. Opciones de batería:\n· <b>Li-ion / LiPo</b> (3,0–4,2 V): necesita un regulador de baja caída y un cargador con protección.\n· <b>LiFePO4</b> (unos 3,2 V nominales, 3,6 V llena): puede alimentar el ESP32 directamente y es más estable.\n· <b>Alcalinas</b>: 3 × AA con regulador; dos solas se quedan cortas enseguida.'),
  { t: 'match', q: 'Une cada batería con su característica.', pairs: [['Li-ion 18650', 'Mucha energía; necesita protección y regulador'], ['LiFePO4', 'Tensión cercana a 3,3 V y química más estable'], ['Alcalinas AA', 'Baratas, sin recarga, sufren con los picos'], ['Supercondensador', 'Ciclos casi infinitos, poca energía']] },
  I('Los <b>picos del WiFi</b>: al transmitir, el ESP32 pide de golpe del orden de 200–400 mA durante milisegundos. Si la batería o el regulador no los dan, la tensión cae y salta el <b>detector de caída de tensión</b> (brownout): reinicios en bucle justo al conectar.'),
  Q('Un nodo se reinicia siempre al conectar al WiFi, pero no con el WiFi apagado. ¿Sospechoso?', ['Caídas de tensión por los picos: regulador flojo, cables finos o falta de condensador', 'El código del sensor', 'La máscara de red', 'El broker'], 'esp_reset_reason() te dirá “brownout”.'),
  I('Remedios: un condensador de 100–470 µF junto a la alimentación del módulo, un LDO que aguante al menos 500 mA y cables cortos y gruesos. Y elige el LDO por dos números: su caída (dropout) y su <b>corriente propia</b> en reposo, que en los buenos es de pocos microamperios.'),
  Q('Un LDO con 5 mA de consumo propio en un nodo que duerme a 10 µA…', ['Arruina la autonomía: domina el consumo total', 'No importa', 'Mejora la autonomía', 'Solo afecta al despertar'], 'Mira siempre la corriente de reposo.'),
  I('<b>Solar</b>: un panel pequeño y un cargador adecuado a la química de la batería. Haz números con el peor mes: en invierno, en gran parte de España hay del orden de 2–3 horas de sol pico al día, y el panel rara vez da su potencia nominal. Dimensiona la batería para varios días nublados.'),
  Nm('Panel de 1 W, 2 horas de sol pico y 30 % de pérdidas. ¿Energía útil al día, en Wh?', 1.4, 'Wh', '1 W × 2 h × 0,7.', { tol: 0.05 }),
  Nm('El nodo gasta 0,5 mA de media a 3,7 V. ¿Energía al día, en Wh?', 0.0444, 'Wh', '0,0005 A × 3,7 V × 24 h ≈ 0,044 Wh. Sobra panel.', { tol: 0.002 }),
  Q('Precaución con baterías de litio en una caja al sol:', ['No cargarlas bajo 0 °C ni dejarlas a temperaturas muy altas; usar protección', 'Ninguna', 'Pintar la caja de negro', 'Cargarlas siempre al máximo'], 'El calor y la carga en frío las dañan y pueden provocar un incendio.'),
  Q('¿Por qué la tensión de una batería de litio no da su carga exacta?', ['Su curva es bastante plana en la zona media y la tensión depende también de la corriente', 'Porque no tiene tensión', 'Porque el ADC no mide', 'Sí la da siempre'], 'Da una idea, no un porcentaje exacto; en LiFePO4 la curva es aún más plana.')
 ]),
 L('io32', 'Reconectar sin agobiar: espera exponencial y colas', 'timer', ['io_retry'], [
  I('Las redes fallan: el router se reinicia, el broker se actualiza, el WiFi se pierde un rato. Un nodo ingenuo reintenta en bucle sin pausa: gasta batería, llena el registro del router y, multiplicado por veinte nodos, satura el servicio justo cuando vuelve.'),
  I('<b>Espera exponencial</b>: tras cada fallo, dobla la espera (1, 2, 4, 8 s…) hasta un <b>tope</b>. Con <b>azar</b> (jitter), cada nodo espera un poco distinto. Al conectar, la espera vuelve al principio.', { tune: { viz: 'io_backoff', params: { base: { label: 'Espera inicial', val: 1, min: 0.5, max: 5, step: 0.5, unit: 's', dec: 1 }, cap: { label: 'Tope', val: 60, list: [5, 10, 30, 60, 120, 300], unit: 's', dec: 0 }, J: { label: 'Azar (jitter)', val: 0, min: 0, max: 50, step: 5, unit: '%', dec: 0 } } } }),
  TU('Tras un corte de luz, que ningún nodo pase de 10 intentos en 2 minutos y que nunca coincidan más de 3 nodos a la vez.', 'io_backoff', { base: { label: 'Espera inicial', val: 0.5, min: 0.5, max: 5, step: 0.5, unit: 's', dec: 1 }, cap: { label: 'Tope', val: 5, list: [5, 10, 30, 60, 120, 300], unit: 's', dec: 0 }, J: { label: 'Azar (jitter)', val: 0, min: 0, max: 50, step: 5, unit: '%', dec: 0 } }, { q: 'ok', min: 1, max: 1, text: 'Objetivo: ≤ 10 intentos por nodo y pico ≤ 3 nodos', hint: 'Sube el tope a 30 s o más y, sobre todo, añade bastante azar.' }, 'Espera creciente, con tope y con azar: lo estándar en sistemas distribuidos.'),
  G('io_backoff'),
  Q('¿Para qué sirve el tope de la espera?', ['Para que, cuando la red vuelva, el nodo no tarde horas en enterarse', 'Para gastar más batería', 'Porque el ESP32 no cuenta más', 'No hace falta'], 'Sin tope, tras muchos fallos esperarías demasiado.'),
  I('Mientras no hay red, ¿qué pasa con los datos? Una <b>cola local</b>: guarda las lecturas con su marca de tiempo en RAM (o en memoria RTC si duermes, o en LittleFS si deben sobrevivir a un reinicio) y envíalas al volver. Decide qué haces si se llena: descartar las más viejas suele ser lo sensato.'),
  Q('La cola de 100 lecturas está llena y el corte sigue. ¿Qué descartas normalmente?', ['Las más viejas, para conservar lo reciente', 'Las más nuevas', 'Todas', 'El programa'], 'Búfer circular. Otra opción: resumir las viejas en medias.'),
  Nm('Una lectura de 12 bytes cada 30 s. ¿Cuántos bytes necesitas para aguantar 24 h sin red?', 34560, 'bytes', '2880 lecturas × 12 bytes ≈ 34 kB: cabe en RAM, pero no en los 8 kB de memoria RTC lenta.'),
  Q('¿Dónde guardas la cola si el nodo hace deep sleep entre lecturas?', ['En memoria RTC (RTC_DATA_ATTR) si cabe, o en flash con cuidado del desgaste', 'En una variable normal', 'En el broker', 'En el router'], 'La RAM normal se borra al dormir.'),
  { t: 'order', q: 'Ordena el bucle de conexión robusto de un nodo enchufado.', items: ['¿Hay WiFi? Si no, reintentar con espera exponencial', '¿Hay broker? Si no, reintentar con espera exponencial', 'Al conectar: testamento, “online” y suscripciones', 'Vaciar la cola de datos pendientes', 'Funcionamiento normal y espera reiniciada'], e: 'Cada capa, con su reintento.' },
  Q('Al reconectar, el nodo suelta de golpe 2000 mensajes encolados. ¿Riesgo?', ['Saturar el broker o el búfer: envíalos a ritmo controlado', 'Ninguno', 'Que se borren', 'Que cambien de QoS'], 'Hasta vaciar la cola debe hacerse con educación.')
 ]),
 L('io33', 'Watchdog, OTA segura y telemetría de salud', 'shield', ['io_retry'], [
  I('Un <b>watchdog</b> es un temporizador que reinicia el chip si el programa no le da una “patada” a tiempo. Si el código se cuelga (un bucle sin salida, una librería bloqueada), el watchdog lo saca del hoyo sin que tengas que ir a desenchufarlo.', { code: '#include <esp_task_wdt.h>\n\nvoid setup() {\n  esp_task_wdt_config_t cfg = { .timeout_ms = 10000, .idle_core_mask = 0, .trigger_panic = true };\n  esp_task_wdt_reconfigure(&cfg);   // en arduino-esp32 3.x ya viene iniciado\n  esp_task_wdt_add(NULL);           // vigila la tarea actual (la de loop)\n}\n\nvoid loop() {\n  trabajo();\n  esp_task_wdt_reset();             // "sigo vivo"\n}' }),
  Q('¿Dónde NO pondrías esp_task_wdt_reset()?', ['Dentro del bucle que espera la conexión, para que nunca salte', 'Al final de loop(), tras el trabajo normal', 'Tras completar cada envío', 'En ningún sitio del programa'], 'Si alimentas al perro mientras esperas sin fin, nunca te rescatará.'),
  I('<b>OTA</b> (actualización por la red) con red de seguridad: la flash tiene dos particiones de aplicación. La versión nueva se escribe en la que no se usa y se arranca desde ella; si no se <b>confirma</b> tras una autocomprobación, el cargador de arranque vuelve a la anterior.'),
  { t: 'order', q: 'Ordena una OTA segura con vuelta atrás.', items: ['Descargar la imagen por HTTPS', 'Verificar su firma o su hash', 'Escribirla en la partición libre', 'Reiniciar desde la nueva', 'Autocomprobación: WiFi, broker y sensores', 'Confirmar la versión (o volver a la anterior)'], e: 'Nunca te quedes sin una versión que funcione.' },
  Q('Una OTA instala una versión que se cuelga al arrancar. Con la vuelta atrás activada, ¿qué pasa?', ['Tras el reinicio, el cargador arranca la versión anterior', 'El nodo queda inservible', 'Se borra la flash', 'Sigue colgado para siempre'], 'Por eso se confirma solo tras comprobar.'),
  I('<b>Telemetría de salud</b>: el nodo informa de sí mismo, además de sus sensores. Versión del firmware, tiempo encendido, motivo del último reinicio, memoria libre (y la mínima alcanzada), RSSI, tensión de la batería, número de reconexiones y errores.'),
  { t: 'match', q: 'Une cada dato de salud con lo que te revela.', pairs: [['Motivo de reinicio: brownout', 'Problemas de alimentación'], ['Memoria libre bajando día a día', 'Una fuga de memoria'], ['RSSI de −85 dBm', 'Enlace de radio débil'], ['Muchas reconexiones al broker', 'Red inestable o ID duplicado']] },
  Q('La memoria libre mínima del nodo baja un poco cada día. ¿Qué esperas?', ['Que acabe colgándose: hay una fuga de memoria (busca String que crecen o reservas sin liberar)', 'Nada', 'Que mejore sola', 'Que suba el RSSI'], 'Las tendencias anuncian los fallos.'),
  I('Un nodo fiable también cuida el <b>reloj</b> (resincroniza NTP cada pocas horas), limita las escrituras en flash (tiene ciclos de borrado limitados) y arranca siempre en un estado seguro: válvulas cerradas, motores parados.'),
  Q('Un nodo de riego se reinicia por el watchdog en mitad de un riego. ¿Estado seguro al arrancar?', ['Válvula cerrada hasta que la lógica vuelva a decidir', 'Válvula abierta por si acaso', 'Siempre el último estado guardado', 'Da igual'], 'Ante la duda, lo que no inunda.'),
  Q('¿Por qué no guardar el contador de pulsos en la flash en cada pulso?', ['La flash soporta un número limitado de borrados por sector y se desgastaría', 'Porque es lenta de leer', 'Porque se cifra', 'No hay ningún problema'], 'Guarda cada cierto tiempo, o en memoria RTC.')
 ]),
 SIM('io-s4', 'Reto: nodo que duerme', 'Un nodo a pilas pasa casi todo el tiempo dormido. Este programa despierta cada 5 s, lee una LDR en el GPIO35, da un destello en el LED del GPIO27 (dos si es de noche, y uno largo cada cuatro despertares) y vuelve a deep sleep. Monta el divisor y el LED y observa el ciclo de trabajo.', { arduino: 'io_dormir', board: 'esp32', parts: ['ldr', 'res', 'led'], code: true, hint: 'LDR entre 3V3 y D35, y 10 kΩ entre D35 y GND. LED: D27 → 100–220 Ω → ánodo; cátodo a GND. Baja la luz de la LDR para ver el doble destello.' }, 'io_dormir'),
 SIM('io-s5', 'Reto: reconexión con espera exponencial', 'El LED del GPIO23 se enciende 0,2 s en cada intento de conexión. Si el “router” no responde, la espera se dobla (0,5; 1; 2 y 4 s como tope, con algo de azar). Mantén pulsado el botón del GPIO4 hasta el siguiente intento para que el router responda: el LED queda fijo. Suéltalo y mira cómo vuelve a empezar desde 0,5 s.', { arduino: 'io_reintento', board: 'esp32', parts: ['push', 'res', 'led'], code: true, hint: 'Pulsador entre D4 y GND. LED: D23 → 100–220 Ω → ánodo; cátodo a GND. Deja pasar varios intentos y luego mantén pulsado hasta que el LED quede fijo (como mucho 5 s).' }, 'io_reintento'),
 PRJ('io-p12', 'Proyecto: detector de fugas que dura años', 'io_leak'),
 PRJ('io-p13', 'Proyecto: nodo solar con telemetría y OTA segura', 'io_solar')
] },

{ id: 'io-m8', title: 'Plataformas y largo alcance', desc: 'Home Assistant y ESPHome, Zigbee, Thread y Matter, LoRaWAN con su tiempo en aire y su 1 %, y NB-IoT/LTE-M.', nodes: [
 L('io34', 'Home Assistant y ESPHome', 'cloud', ['io_arch'], [
  I('<b>Home Assistant</b> es una plataforma de domótica libre que corre en tu casa (Raspberry Pi, mini PC). Reúne aparatos de cientos de marcas y protocolos como <b>entidades</b> (un sensor de temperatura, un interruptor, una persiana), con paneles, historial y automatizaciones, sin necesitar nube.'),
  { t: 'match', q: 'Une cada concepto de Home Assistant.', pairs: [['Entidad', 'Un dato o control concreto'], ['Dispositivo', 'El aparato que agrupa varias entidades'], ['Integración', 'El conector con un protocolo o una marca'], ['Automatización', 'Disparador, condiciones y acciones']] },
  I('<b>ESPHome</b> genera el firmware del ESP32 a partir de un archivo YAML: describes la placa, la red y los sensores, y él compila, instala (también por OTA) y lo integra en Home Assistant con su API nativa cifrada.', { code: 'esphome:\n  name: clima-salon\n\nesp32:\n  board: esp32dev\n\nwifi:\n  ssid: !secret wifi_ssid\n  password: !secret wifi_password\n\napi:\n  encryption:\n    key: !secret api_key_salon\n\nota:\n  - platform: esphome\n    password: !secret ota_salon\n\nlogger:\n\ni2c:\n  sda: GPIO21\n  scl: GPIO22\n\nsensor:\n  - platform: sht3xd\n    address: 0x44\n    temperature:\n      name: "Temperatura salón"\n    humidity:\n      name: "Humedad salón"\n    update_interval: 60s' }),
  Q('¿Dónde están las claves en ese YAML?', ['En secrets.yaml, referenciadas con !secret', 'En claro en el archivo', 'En la nube de ESPHome', 'No tiene claves'], 'El YAML se puede compartir sin secretos.'),
  Q('Con ese YAML, ¿cada cuánto se envía la temperatura?', ['Cada 60 s', 'Cada segundo', 'Solo al cambiar', 'Una vez al día'], 'update_interval: 60s.', { code: 'update_interval: 60s' }),
  I('ESPHome admite <b>filtros</b> en el propio nodo: media móvil, mediana, envío solo si cambia más de un delta, calibración… Es el filtrado en el borde del módulo de datos, en pocas líneas de YAML.', { code: '    temperature:\n      name: "Temperatura salón"\n      filters:\n        - offset: -0.4                 # calibración con el baño de hielo\n        - sliding_window_moving_average:\n            window_size: 5\n            send_every: 5\n        - delta: 0.2                   # solo si cambia 0,2 °C o más' }),
  Q('¿Qué hace el filtro delta?', ['Solo envía si el valor cambia al menos esa cantidad respecto al último enviado', 'Suma esa cantidad', 'Redondea a esa cantidad', 'Envía cada tantos segundos'], 'Envío por cambio.', { code: '- delta: 0.2' }),
  I('Las <b>automatizaciones</b> de Home Assistant tienen tres partes: <b>disparador</b> (cuándo se evalúa), <b>condiciones</b> (si se cumple todo) y <b>acciones</b>. Corren en local: funcionan sin internet.'),
  { t: 'order', q: 'Ordena las partes de “si el CO₂ pasa de 1000 ppm y hay alguien en casa, avisa”.', items: ['Disparador: el CO₂ supera 1000 ppm', 'Condición: la ocupación es mayor que 0', 'Acción: enviar una notificación'], e: 'Disparador, condición, acción.' },
  Q('¿ESPHome o tu propio código Arduino con MQTT?', ['ESPHome para sensores y actuadores típicos; código propio cuando necesitas lógica muy específica', 'Siempre ESPHome', 'Siempre código propio', 'Ninguno: solo la nube'], 'ESPHome también puede publicar por MQTT si lo prefieres.'),
  Q('Un nodo ESPHome hace de proxy Bluetooth. ¿Para qué sirve?', ['Para que Home Assistant reciba sensores BLE que están lejos del servidor', 'Para cargar el móvil', 'Para hacer de router WiFi', 'Para LoRa'], 'Amplía el alcance del BLE a través de la red.')
 ]),
 PRJ('io-p14', 'Proyecto: riego con previsión de lluvia', 'io_irrigation'),
 PRJ('io-p15', 'Proyecto: persiana de baja tensión con ESPHome', 'io_blinds'),
 L('io35', 'Zigbee, Thread y Matter', 'antenna', ['io_arch'], [
  I('<b>Zigbee</b> y <b>Thread</b> usan la misma radio de bajo consumo (a 2,4 GHz y 250 kbit/s) y forman <b>mallas</b>: los equipos con alimentación fija repiten los mensajes de los demás. Los equipos a pila son <b>dispositivos finales</b>: duermen y dependen de un “padre”.', { code: 'Capa         Zigbee             Thread           WiFi\nAplicación   Zigbee (clusters)  Matter u otras   Matter, MQTT, HTTP\nRed          red Zigbee         IPv6 + 6LoWPAN   IPv4 / IPv6\nRadio        IEEE 802.15.4      IEEE 802.15.4    IEEE 802.11' }),
  { t: 'match', q: 'Une cada papel de una red Zigbee.', pairs: [['Coordinador', 'Crea la red y la conecta con tu servidor'], ['Router', 'Equipo enchufado que repite mensajes'], ['Dispositivo final', 'Sensor a pila que duerme'], ['Mapa de red', 'Muestra por dónde va cada mensaje']] },
  Q('Tu sensor de la terraza, a pila, pierde la conexión. ¿Qué mejora más la malla Zigbee?', ['Añadir un enchufe Zigbee (router) a medio camino', 'Ponerle pilas más caras', 'Subir el QoS', 'Otro coordinador'], 'Los routers extienden la malla.'),
  I('Zigbee no habla IP: necesita un <b>coordinador</b> (un adaptador USB o de red) y un programa que traduzca, como <b>ZHA</b> (integrado en Home Assistant) o <b>Zigbee2MQTT</b> (publica cada dispositivo en MQTT). Todo local.'),
  I('Convivencia en 2,4 GHz: los canales Zigbee van del 11 al 26, separados 5 MHz y de 2 MHz de ancho. Con el WiFi en el 1, el 6 o el 11, los canales Zigbee 15, 20 y 25 quedan en los huecos. Aleja también el coordinador de los puertos USB 3, que meten ruido.'),
  Q('Tu WiFi usa los canales 1 y 6. ¿Qué canal Zigbee eliges?', ['25', '12', '14', '18'], 'El 12 y el 14 caen dentro del canal 1 de WiFi y el 18, dentro del 6; el 25 queda lejos de ambos.'),
  I('<b>Thread</b> sí habla IP: IPv6 sobre esa misma radio, comprimido con 6LoWPAN. Se une al resto de la red con un <b>border router</b>. No depende de un único coordinador: si un router cae, la malla se reorganiza.'),
  I('<b>Matter</b> es una capa de aplicación común, impulsada por los grandes fabricantes, que funciona sobre IP: por WiFi, Ethernet o Thread. Promete que un aparato funciona en cualquier plataforma, con <b>control local</b> y <b>multiadministrador</b> (varias plataformas a la vez). Se empareja con un código QR, normalmente usando Bluetooth LE para la puesta en marcha.'),
  { t: 'match', q: 'Une cada tecnología con su descripción.', pairs: [['Zigbee', 'Malla 802.15.4 con coordinador, sin IP'], ['Thread', 'Malla IPv6 sobre 802.15.4 con border router'], ['Matter', 'Lenguaje común sobre IP: WiFi, Ethernet o Thread'], ['BLE', 'Puesta en marcha de Matter desde el móvil']] },
  Q('¿Matter es una radio?', ['No: es una capa de aplicación que va sobre WiFi, Ethernet o Thread', 'Sí, a 868 MHz', 'Sí, y sustituye al WiFi', 'Es otro nombre de Zigbee'], 'Thread es la radio de bajo consumo que suele acompañarlo.'),
  Q('¿Qué chip de Espressif usarías para un sensor Thread a pila?', ['ESP32-H2 (radio de Zigbee y Thread, y BLE, sin WiFi)', 'ESP32 clásico', 'ESP32-S3', 'ESP8266'], 'El ESP32-C6 también sirve, y además tiene WiFi.'),
  Q('Un interruptor Zigbee está vinculado directamente (binding) a una bombilla. Si se cae el coordinador…', ['El interruptor sigue encendiendo la bombilla', 'Deja de funcionar', 'Se reinicia toda la red', 'Pasa a WiFi'], 'El vínculo directo no necesita al coordinador para cada orden.')
 ]),
 PRJ('io-p16', 'Proyecto: red Zigbee con un nodo hecho por ti', 'io_zigbee'),
 L('io36', 'LoRa y LoRaWAN: clases, OTAA y pasarelas', 'antenna', ['io_lora'], [
  I('<b>LoRa</b> es una modulación de radio de espectro ensanchado que llega a kilómetros con muy poca potencia, a cambio de muy pocos datos. <b>LoRaWAN</b> es el protocolo de red construido encima: define pasarelas, servidores, seguridad y clases de dispositivo. La física de LoRa la verás a fondo en la especialidad de Radio.'),
  { t: 'order', q: 'Ordena el viaje de un mensaje LoRaWAN.', items: ['El nodo transmite por radio', 'Una o varias pasarelas lo reciben', 'Lo reenvían por IP al servidor de red', 'El servidor de red quita duplicados y lo verifica', 'El servidor de aplicación lo descifra y lo entrega (MQTT, webhook…)'], e: 'Los nodos no se asocian a una pasarela: cualquiera que los oiga, reenvía.' },
  Q('Dos pasarelas reciben el mismo mensaje. ¿Qué pasa?', ['El servidor de red elimina el duplicado y se queda con la mejor recepción', 'Llega dos veces a tu aplicación', 'Se pierde', 'Las pasarelas se pelean'], 'La redundancia mejora la fiabilidad.'),
  I('Clases de dispositivo:\n· <b>Clase A</b> (todos): tras cada subida abre dos ventanas cortas de recepción (RX1 y RX2). El resto del tiempo, sordo. Mínimo consumo.\n· <b>Clase B</b>: además, ventanas programadas y sincronizadas con balizas de las pasarelas.\n· <b>Clase C</b>: escucha casi siempre. Para equipos enchufados.'),
  { t: 'match', q: 'Une cada dispositivo con su clase.', pairs: [['Sensor de humedad a pila', 'Clase A'], ['Válvula enchufada que debe obedecer al momento', 'Clase C'], ['Contador que debe escuchar a horas fijas', 'Clase B']] },
  Q('Un nodo de clase A envía cada 30 minutos. Le mandas una orden. ¿Cuándo la recibe?', ['Tras su próxima subida: hasta 30 minutos después', 'Al instante', 'Nunca', 'Cuando reinicies la pasarela'], 'En clase A, la bajada va pegada a la subida.'),
  I('Activación:\n· <b>OTAA</b> (por el aire): el nodo tiene DevEUI, JoinEUI y una clave raíz (AppKey). Al unirse, negocia con el servidor claves de sesión nuevas. Es la recomendada.\n· <b>ABP</b>: la dirección y las claves de sesión se graban a mano. Más simple, pero las claves no cambian y los contadores de trama dan problemas al reiniciar.'),
  Q('¿Por qué se recomienda OTAA frente a ABP?', ['Genera claves de sesión nuevas en cada unión y gestiona bien los contadores', 'Gasta menos batería siempre', 'No necesita servidor', 'Transmite más lejos'], 'Seguridad y robustez.'),
  I('LoRaWAN cifra con AES-128: la pasarela solo reenvía bytes que no puede leer. Una clave de sesión de red protege la integridad ante el servidor de red y otra, la de aplicación, cifra tu carga para tu aplicación.'),
  Q('¿Puede quien gestiona una pasarela comunitaria leer tus datos?', ['No: la carga va cifrada con la clave de aplicación', 'Sí, siempre', 'Solo si usas SF12', 'Solo de noche'], 'La pasarela es un repetidor ciego.'),
  I('Infraestructura: <b>pasarelas</b> de 8 canales (las de un solo canal no cumplen el estándar), un <b>servidor de red</b> (The Things Network como red comunitaria en la nube, o ChirpStack en tu propio servidor para algo totalmente local) y tu aplicación.'),
  Q('Quieres una red LoRaWAN totalmente local, sin internet. ¿Qué usas?', ['Tu pasarela y ChirpStack en un servidor de casa', 'The Things Network', 'Una pasarela de un canal', 'NB-IoT'], 'Servidor de red propio.')
 ]),
 L('io37', 'Tiempo en aire y ciclo de trabajo del 1 %', 'timer', ['io_lora'], [
  I('El <b>factor de dispersión</b> (de SF7 a SF12) decide cuánto se “estira” cada símbolo. Cada paso dobla la duración del símbolo: más alcance y robustez, pero más <b>tiempo en aire</b> y más energía por mensaje.', { tune: { viz: 'io_duty', params: { SF: { label: 'Factor de dispersión (SF)', val: 7, list: [7, 8, 9, 10, 11, 12], dec: 0 }, PL: { label: 'Carga útil', val: 10, min: 1, max: 51, step: 1, unit: 'B', dec: 0 } } } }),
  Q('Un mensaje de 10 bytes con SF7 dura unos 62 ms en el aire. ¿Y con SF12?', ['Cerca de 1,5 s', '62 ms', '120 ms', '30 s'], 'Más de 20 veces más.'),
  I('En Europa, LoRaWAN usa la banda de 868 MHz, de uso libre con condiciones. En la sub-banda de 868,0–868,6 MHz (la de los canales por defecto), cada equipo puede transmitir como mucho el <b>1 % del tiempo</b>: 36 s por hora. Es una norma legal, no una recomendación.'),
  G('io_duty'), G('io_duty'),
  TU('Quieres enviar 10 bytes una vez por minuto cumpliendo el 1 %. Busca el SF más alto que lo permite.', 'io_duty', { SF: { label: 'Factor de dispersión (SF)', val: 12, list: [7, 8, 9, 10, 11, 12], dec: 0 }, PL: { label: 'Carga útil', val: 10, fixed: true } }, { q: 'porHora', min: 60, max: 120, text: 'Objetivo: al menos 60 mensajes por hora, con el SF más alto posible', hint: 'Necesitas un tiempo en aire de 600 ms o menos.' }, 'Con SF10 son unos 370 ms; con SF11 ya pasan de 800 ms.'),
  I('Además de lo legal está lo justo: The Things Network pide a cada nodo no pasar de <b>30 s de aire al día</b> en subida y muy pocas bajadas (del orden de 10 al día). Con SF7 y 10 bytes eso son unos 480 mensajes al día; con SF12, unos 20.'),
  TU('Envía 10 bytes cada 5 minutos (288 al día) sin pasar de los 30 s diarios de TTN.', 'io_duty', { SF: { label: 'Factor de dispersión (SF)', val: 10, list: [7, 8, 9, 10, 11, 12], dec: 0 }, PL: { label: 'Carga útil', val: 10, fixed: true } }, { q: 'porDia', min: 288, max: 1e6, text: 'Objetivo: al menos 288 mensajes al día', hint: 'Cada mensaje debe durar menos de unos 104 ms.' }, 'Solo SF7 (unos 62 ms) lo cumple: con SF8 ya son unos 113 ms por mensaje.'),
  I('Cómo ahorrar aire: <b>menos bytes</b> (binario, no JSON), <b>menos mensajes</b> (resúmenes, envío por cambio), <b>SF más bajo</b> (pasarela más cerca o mejor antena) y <b>ADR</b> (adaptación automática de la velocidad): el servidor ve que te oye de sobra y te pide bajar el SF y la potencia.'),
  Q('Un nodo fijo con señal excelente sigue en SF12. ¿Qué activas?', ['ADR, para que la red le asigne un SF más bajo', 'QoS 2', 'Más potencia', 'Clase C'], 'Menos aire, menos batería y menos colisiones.'),
  Q('¿Qué carga es mejor para LoRaWAN?', ['6 bytes binarios que se decodifican en el servidor', 'Un JSON de 60 bytes', 'Un texto “temperatura=21,4;humedad=48”', 'Una imagen pequeña'], 'Cada byte cuesta tiempo en aire.'),
  Q('Con SF10, SF11 o SF12 en EU868, ¿cuántos bytes tuyos caben como máximo en un mensaje?', ['51', '242', '1500', '8'], 'Con SF más bajos cabe más: hasta 115 con SF9 y unos 222–242 con SF7 y SF8.')
 ]),
 PRJ('io-p17', 'Proyecto: aviso de buzón por LoRa', 'io_mailbox'),
 L('io38', 'NB-IoT y LTE-M', 'antenna', ['io_arch', 'io_lora'], [
  I('<b>NB-IoT</b> y <b>LTE-M</b> son tecnologías celulares para IoT que usan la red de los operadores, en espectro con licencia. No montas infraestructura: pones una SIM (o eSIM) con tarifa IoT y el módulo se conecta donde haya cobertura.'),
  { t: 'match', q: 'Une cada tecnología con su punto fuerte.', pairs: [['NB-IoT', 'Llegar a sótanos con muy pocos datos'], ['LTE-M', 'Movilidad y más velocidad'], ['LoRaWAN', 'Infraestructura propia sin cuota'], ['WiFi', 'Mucho ancho de banda en casa']] },
  I('Diferencias: <b>LTE-M</b> llega del orden de 1 Mbit/s, admite movilidad (cambiar de antena en marcha) y tiene menos latencia. <b>NB-IoT</b> es mucho más lento (decenas de kbit/s), está pensado para equipos fijos y penetra mejor en interiores profundos. Ambos dan IP: puedes usar MQTT o HTTP, o protocolos ligeros como CoAP sobre UDP.'),
  Q('Contadores de agua en los sótanos de toda una ciudad. ¿Qué encaja?', ['NB-IoT', 'LTE-M', 'WiFi', 'Bluetooth LE'], 'Fijos, pocos datos y mucha penetración.'),
  Q('Un localizador para bicicletas de alquiler. ¿Qué encaja mejor?', ['LTE-M', 'NB-IoT', 'Zigbee', 'Thread'], 'Movilidad.'),
  I('Ahorro de energía celular:\n· <b>PSM</b> (modo de ahorro): el módulo duerme horas o días sin darse de baja de la red; al despertar no tiene que volver a registrarse.\n· <b>eDRX</b>: alarga los intervalos en los que escucha avisos de la red, para dormir más entre medias.'),
  Q('Un sensor envía una vez al día y no necesita recibir órdenes rápido. ¿Qué modo usas?', ['PSM, con un temporizador largo', 'Siempre conectado', 'eDRX de 5 s', 'Ninguno'], 'Dormir sin perder el registro en la red.'),
  I('Módulos habituales: SIM7080G (LTE-M y NB-IoT), Quectel BG95, Nordic nRF9160 o nRF9151 (con microcontrolador propio). Con un ESP32 se manejan por UART con comandos AT o con librerías como TinyGSM. Comprueba siempre que tu operador tiene la tecnología activa en tu zona.'),
  I('Coste y dependencia: hay cuota por SIM, la cobertura la decide el operador y algunas tecnologías antiguas (2G, 3G) se están apagando en Europa. Para algo que debe durar 10 años, pregunta por la hoja de ruta del operador.'),
  Q('¿Qué riesgo tiene diseñar hoy un producto IoT con un módulo que solo hace 2G?', ['Que el operador apague su red 2G y el producto se quede sin conexión', 'Ninguno', 'Que gaste poco', 'Que sea demasiado rápido'], 'Varias redes 2G y 3G europeas ya han cerrado o tienen fecha.'),
  Q('¿Qué tienen NB-IoT y LTE-M que no tiene LoRaWAN con pasarela propia?', ['Una cuota por SIM y dependencia del operador', 'Cifrado de los datos', 'Modos de bajo consumo', 'Alcance de kilómetros'], 'A cambio, no montas ni mantienes infraestructura.'),
  Q('¿Puede un módulo NB-IoT hablar MQTT con tu broker de casa?', ['Sí, a través de una VPN o de un servidor intermedio accesible de forma segura', 'No, nunca', 'Solo por SMS', 'Solo con LoRaWAN'], 'Tu broker está tras el NAT de casa: no lo abras a internet sin más.')
 ]),
 PRJ('io-p18', 'Proyecto: red LoRaWAN para el huerto', 'io_garden'),
 PRJ('io-p19', 'Proyecto final: tu domótica completa, local y robusta', 'io_final')
] }
    ]
  });
})();
