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
  // Validez de una suscripción: # solo, y al final; + ocupa un nivel entero
  function topicValid(f) { const L = f.split('/'); return L.every((x, i) => (x === '#' ? i === L.length - 1 : x === '+' || (!x.includes('+') && !x.includes('#')))); }
  // Datos de las visualizaciones de MQTT
  const IO_TOPICS0 = ['casa/salon/temperatura', 'casa/cocina/temperatura', 'casa/salon/humedad'];
  const IO_FILT0 = IO_TOPICS0;
  const IO_SUBS0 = [['Panel', 'casa/salon/temperatura'], ['Móvil', 'casa/salon/temperatura'], ['Pantalla cocina', 'casa/cocina/temperatura'], ['Deshumidificador', 'casa/salon/humedad']];
  const IO_TOPICS1 = ['casa/salon/temperatura', 'casa/cocina/temperatura', 'casa/salon/humedad', 'casa/salon/sensor1/temperatura', 'casa/salon', 'Casa/salon/temperatura', '$SYS/broker/uptime'];
  const IO_FILT1 = ['casa/+/temperatura', 'casa/salon/#', 'casa/#', '+/salon/+', '#', 'casa/#/temperatura', 'casa/+'];
  const IO_SUBS1 = [['Panel', 'casa/+/temperatura'], ['Registro', 'casa/#'], ['Salón', 'casa/salon/#'], ['Monitor', '$SYS/#']];
  const IO_ACLT = ['casa/salon/temperatura', 'casa/salon/luz/cmd', 'casa/cocina/luz/cmd', 'casa/cocina/temperatura'];
  // Reglas de la ACL de ejemplo para un usuario: [acceso, filtro ya sustituido, línea]
  const aclRules = u => (u === 'panel' ? [['read', 'casa/#', 1], ['write', 'casa/+/+/cmd', 2]] : []).concat([['write', `casa/${u}/#`, 4], ['read', `casa/${u}/+/cmd`, 5]]);
  // Amenazas: [nombre, probabilidad 1–3, impacto 1–3, cuánto baja la probabilidad la defensa, defensa]
  const IO_THREATS = [['Cámara expuesta con la contraseña de fábrica', 3, 3, 2, 'contraseña única y sin exponer'], ['Broker sin contraseña en la red de casa', 2, 3, 1, 'usuarios, ACL y red separada'], ['Un vecino ve el nombre de tu WiFi', 3, 1, 0, 'ocultar el nombre (sirve de poco)'], ['Te roban el nodo del jardín', 2, 2, 1, 'red IoT aislada y credencial propia'], ['Ataque de laboratorio a tu chip', 1, 2, 0, 'cifrado de flash'], ['Tu consumo, en la nube del fabricante', 2, 2, 1, 'guardarlo en local']];
  // Consumo de una casa minuto a minuto (W): base, nevera y cuatro rutinas
  let _dia = null;
  const consumoDia = () => { if (_dia) return _dia; _dia = []; for (let i = 0; i < 1440; i++) { let w = i < 420 || (i > 510 && i < 840) ? 90 : 220; w += 25 * rnd(i + 3000); if (i >= 420 && i < 424) w += 2000; if (i >= 860 && i < 865) w += 1100; if (i >= 1260 && i < 1320) w += 2000; if (i >= 1340 && i < 1352) w += 1500; _dia.push(w); } return _dia; };

  /* ---------- dibujos para las tarjetas ---------- */
  // Parte un texto largo en dos líneas por el espacio más cercano al centro
  const wrap2 = (s, n) => { if (s.length <= n) return [s]; const mid = s.length / 2; let b = -1; for (let i = 0; i < s.length; i++) if (s[i] === ' ' && (b < 0 || Math.abs(i - mid) < Math.abs(b - mid))) b = i; return b < 0 ? [s] : [s.slice(0, b), s.slice(b + 1)]; };
  const lines = (x, y, L, dy, cls, anchor = 'start', style = '') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}"${style ? ` style="${style}"` : ''}>${L.map((l, i) => `<tspan x="${x}" dy="${i ? dy : 0}">${l}</tspan>`).join('')}</text>`;
  // Cadena de cajas en zigzag (3 por fila) unidas por flechas animadas
  const FLOW = (items, cap = '') => {
    const per = 3, W = 88, Hh = 34, step = 52, rows = Math.ceil(items.length / per);
    const pos = items.map((_, i) => { const r = Math.floor(i / per), k = i % per, c = r % 2 ? per - 1 - k : k; return [6 + c * 100, 8 + r * step]; });
    let s = '';
    items.forEach((it, i) => {
      const [x, y] = pos[i];
      if (i) { const [px, py] = pos[i - 1]; const d = py === y ? (px < x ? `M${px + W} ${y + Hh / 2}H${x}` : `M${px} ${y + Hh / 2}H${x + W}`) : `M${px + W / 2} ${py + Hh}V${y}`; const tip = py === y ? (px < x ? `M${x - 1} ${y + Hh / 2}l-6 -4v8z` : `M${x + W + 1} ${y + Hh / 2}l6 -4v8z`) : `M${px + W / 2} ${y - 1}l-4 -6h8z`; s += `<path d="${d}" stroke="var(--led)" stroke-width="2.2" class="a-flow-slow" fill="none"/><path d="${tip}" fill="var(--led)"/>`; }
      const L = wrap2(it, 12), fs = L.some(l => l.length > 13) ? 9 : 10.5;
      s += `<rect x="${x}" y="${y}" width="${W}" height="${Hh}" rx="6" fill="var(--ice)" stroke="currentColor" stroke-width="1.4"/>` + lines(x + W / 2, y + (L.length > 1 ? 14 : 21), L, 12, 'vizsm', 'middle', `font-weight:700;fill:currentColor;font-size:${fs}px`);
    });
    const C = cap ? wrap2(cap, 46) : [], h = 8 + rows * step - 10 + (C.length ? 6 + C.length * 13 : 0);
    if (C.length) s += lines(150, 8 + rows * step + 6, C, 13, 'vizsm', 'middle');
    return `<svg viewBox="0 0 300 ${h}" class="viz">${s}</svg>`;
  };
  // Dos columnas para comparar
  const VS = (A, B) => {
    const n = Math.max(A.l.length, B.l.length), h = 40 + 16 * n;
    const col = (x, { t, l, c }) => `<rect x="${x}" y="3" width="142" height="${h - 6}" rx="8" fill="none" stroke="${c || 'currentColor'}" stroke-width="1.6"/><text x="${x + 71}" y="22" text-anchor="middle" class="vizlab" style="fill:${c || 'currentColor'}">${t}</text>` + l.map((s, i) => `<text x="${x + 7}" y="${42 + i * 16}" class="vizsm" style="font-size:10.5px">${s}</text>`).join('');
    return `<svg viewBox="0 0 300 ${h}" class="viz">${col(4, A)}${col(154, B)}</svg>`;
  };
  // Barras horizontales con su etiqueta: [texto, valor, color?]
  const BARS = (rows, unit = '', cap = '') => {
    const top = Math.max(...rows.map(r => r[1])), h = 14 + rows.length * 34 + (cap ? 16 : 0), W = v => Math.max(2, v / top * 180);
    let s = rows.map(([l, v, c], i) => `<text x="8" y="${18 + i * 34}" class="vizsm">${l}</text><rect x="8" y="${23 + i * 34}" width="${W(v).toFixed(1)}" height="12" rx="3" fill="${c || 'var(--led)'}" opacity=".75"/><text x="${(14 + W(v)).toFixed(1)}" y="${33 + i * 34}" class="vizsm" style="font-weight:700;fill:currentColor">${num(v, v < 10 ? 2 : 0)}${unit}</text>`).join('');
    if (cap) s += `<text x="8" y="${h - 4}" class="vizsm">${cap}</text>`;
    return `<svg viewBox="0 0 300 ${h}" class="viz">${s}</svg>`;
  };
  // Lista con marca (✓ / ✗ / ·); las líneas largas se parten en dos
  const CHK = (rows, title = '') => {
    let y0 = title ? 26 : 8, s = title ? `<text x="8" y="16" class="vizlab">${title}</text>` : '';
    rows.forEach(([t, st]) => {
      const L = wrap2(t, 40), y = y0 + 12;
      s += (st === 1 ? `<path d="M10 ${y}l4 4 7-9" stroke="var(--ok)" stroke-width="2.4" fill="none"/>` : st === 0 ? `<path d="M11 ${y - 5}l9 9M20 ${y - 5}l-9 9" stroke="var(--err)" stroke-width="2.4"/>` : `<circle cx="15" cy="${y}" r="3.5" fill="var(--led)"/>`) + lines(30, y + 4, L, 13, 'vizsm', 'start', 'fill:currentColor');
      y0 += L.length > 1 ? 35 : 22;
    });
    return `<svg viewBox="0 0 300 ${y0}" class="viz">${s}</svg>`;
  };
  // Línea de tiempo con marcas: [posición 0..1, texto, color]
  const TLINE = (marks, l = '', r = '') => {
    let s = `<path d="M10 40H290" stroke="var(--line)" stroke-width="3"/>`;
    marks.forEach(([f, t, c], i) => { const x = 10 + f * 280; s += `<circle cx="${x}" cy="40" r="6" fill="${c || 'var(--led)'}"/><text x="${x}" y="${i % 2 ? 66 : 24}" text-anchor="middle" class="vizsm" style="fill:currentColor">${t}</text>`; });
    s += `<text x="10" y="84" class="vizsm">${l}</text><text x="290" y="84" text-anchor="end" class="vizsm">${r}</text>`;
    return `<svg viewBox="0 0 300 90" class="viz">${s}</svg>`;
  };
  // Parámetros de deslizadores
  const LS = (label, val, list, unit = '', dec = 0) => ({ label, val, list, unit, dec });
  const SL = (label, val, min, max, step, unit = '', dec = 0) => ({ label, val, min, max, step, unit, dec });
  const FX = val => ({ val, fixed: true });
  // Juegos de parámetros de cada visualización (con valores iniciales cambiables)
  const PP = {
    chain: (o = {}) => ({ corte: LS('Avería (0 ninguna, 1 WiFi, 2 broker, 3 base de datos)', 0, [0, 1, 2, 3]), local: LS('Decide en el nodo (0 no, 1 sí)', 0, [0, 1]), ...o }),
    datarate: (o = {}) => ({ B: LS('Tamaño de cada mensaje', 50, [10, 20, 50, 100, 200, 500, 1000], 'bytes'), s: LS('Un envío cada', 600, [1, 5, 10, 30, 60, 300, 600, 900, 3600], 's'), ...o }),
    radiopick: (o = {}) => ({ d: LS('Distancia', 30, [10, 30, 100, 1000, 5000, 20000], 'm'), dat: LS('Datos (0 bytes, 1 kB/día, 2 MB/día, 3 vídeo)', 1, [0, 1, 2, 3]), pila: LS('A pila (0 no, 1 sí)', 1, [0, 1]), mov: LS('Se mueve lejos (0 no, 1 sí)', 0, [0, 1]), ...o }),
    outage: (o = {}) => ({ arq: LS('Arquitectura (0 nube, 1 local, 2 híbrida)', 0, [0, 1, 2]), inet: LS('Internet (1 funciona, 0 caído)', 1, [1, 0]), ...o }),
    subnet: (o = {}) => ({ m: LS('Máscara: bits de red', 24, [16, 20, 22, 24, 25, 26, 27, 28, 30], ''), c: LS('Tercer número de B', 1, [0, 1, 2, 3]), d: SL('Último número de B', 200, 1, 254, 1), ...o }),
    boot: (o = {}) => ({ f: LS('Avería (0 ninguna … 4)', 0, [0, 1, 2, 3, 4]), ...o }),
    tcpudp: (o = {}) => ({ proto: LS('Protocolo (0 UDP, 1 TCP)', 0, [0, 1]), loss: SL('Paquetes que se pierden', 0, 0, 40, 5, '%'), ...o }),
    nat: (o = {}) => ({ quien: LS('Quién empieza (0 el nodo, 1 alguien de fuera)', 1, [0, 1]), fwd: LS('Redirigir el puerto 1883 (0 no, 1 sí)', 0, [0, 1]), vpn: LS('VPN propia (0 no, 1 sí)', 0, [0, 1]), ...o }),
    rssi: (o = {}) => ({ d: LS('Distancia al router', 5, [1, 2, 5, 10, 20, 30, 50], 'm'), w: SL('Paredes de ladrillo', 1, 0, 4, 1), metal: LS('Armario metálico (0 no, 1 sí)', 0, [0, 1]), ...o }),
    wifich: (o = {}) => ({ ch: SL('Canal de tu red', 6, 1, 13, 1), v: FX(0), ...o }),
    http: (o = {}) => ({ m: LS('Método (0 GET, 1 POST, 2 PUT, 3 DELETE)', 1, [0, 1, 2, 3]), r: LS('Ruta (0 estado, 1 lecturas, 2 umbral, 3 sótano)', 0, [0, 1, 2, 3]), a: LS('Credencial (0 no, 1 sí)', 0, [0, 1]), ...o }),
    idem: (o = {}) => ({ m: LS('Petición (0 PUT umbral, 1 POST sumar)', 1, [0, 1]), rep: SL('Veces que llega', 1, 1, 4, 1), ...o }),
    bytes: (o = {}) => ({ f: SL('Valores', 2, 1, 6, 1), fmt: LS('Formato (0 JSON largo, 1 JSON corto, 2 binario)', 0, [0, 1, 2]), ...o }),
    srvcli: (o = {}) => ({ dl: LS('delay() al final de loop', 1, [0, 0.1, 0.5, 1, 2, 5, 10], 's', 1), ...o }),
    poll: (o = {}) => ({ T: LS('Preguntar cada', 60, [1, 2, 5, 10, 30, 60, 300, 900], 's'), modo: LS('Modo (0 sondeo, 1 empuje)', 0, [0, 1]), ...o }),
    mqtt0: (o = {}) => ({ set: FX(0), t: LS('Tema que se publica (nº)', 0, [0, 1, 2]), f: LS('Tu suscripción (nº)', 1, [0, 1, 2]), ...o }),
    mqtt1: (o = {}) => ({ set: FX(1), t: LS('Tema que se publica (nº)', 3, [0, 1, 2, 3, 4, 5, 6]), f: LS('Tu suscripción (nº)', 0, [0, 1, 2, 3, 4, 5, 6]), ...o }),
    qos: (o = {}) => ({ q: LS('QoS', 0, [0, 1, 2]), loss: SL('Paquetes que se pierden', 0, 0, 40, 5, '%'), ...o }),
    retain: (o = {}) => ({ ret: LS('Publicar como retenido (0 no, 1 sí)', 0, [0, 1]), borrar: LS('Después, retenido vacío (0 no, 1 sí)', 0, [0, 1]), llega: LS('El panel se conecta tras', 60, [1, 10, 60, 600], 'min'), ...o }),
    lwt: (o = {}) => ({ ka: LS('Keepalive', 60, [10, 20, 30, 60, 120], 's'), limpia: LS('Final (0 corte de luz, 1 DISCONNECT)', 0, [0, 1]), ...o }),
    acl: (o = {}) => ({ u: LS('Usuario (0 salon, 1 cocina, 2 panel)', 0, [0, 1, 2]), t: LS('Tema (nº)', 0, [0, 1, 2, 3]), acc: LS('Acción (0 publicar, 1 leer)', 0, [0, 1]), ...o }),
    alias: (o = {}) => ({ f: LS('Frecuencia de la señal', 1, [1, 2, 3], 'Hz'), fs: LS('Frecuencia de muestreo', 3, [0.8, 1.2, 1.5, 2.5, 3, 4, 5, 8, 10, 20], 'Hz', 1), ...o }),
    filt: (o = {}) => ({ tipo: LS('Filtro (0 nada, 1 media, 2 mediana, 3 exponencial)', 0, [0, 1, 2, 3]), N: SL('Ventana N (media y mediana)', 3, 3, 21, 2), a: SL('α (exponencial)', 0.5, 0.05, 1, 0.05, '', 2), ...o }),
    calib: (o = {}) => ({ b: SL('Desplazamiento b', 0, -2, 2, 0.05, '°C', 2), a: SL('Ganancia a', 1, 0.9, 1.1, 0.005, '', 3), ...o }),
    drift: (o = {}) => ({ ppm: LS('Deriva del reloj', 20, [5, 10, 20, 50, 100], 'ppm'), h: LS('Sincronizar por NTP cada', 24, [1, 3, 6, 12, 24, 72, 168, 720], 'h'), ...o }),
    retention: (o = {}) => ({ s: LS('Una lectura cada', 60, [1, 10, 60, 300], 's'), dias: LS('Días de datos crudos', 365, [7, 30, 90, 365]), etq: LS('Etiqueta (0 sala, 1 id de mensaje)', 0, [0, 1]), ...o }),
    anom: (o = {}) => ({ an: LS('Anomalía (0 ninguna … 4)', 0, [0, 1, 2, 3, 4]), det: LS('Detector (0 umbral, 1 velocidad, 2 congelado, 3 silencio)', 0, [0, 1, 2, 3]), ...o }),
    risk: (o = {}) => ({ am: LS('Amenaza (nº)', 1, [0, 1, 2, 3, 4, 5]), def: LS('Aplicar su defensa (0 no, 1 sí)', 0, [0, 1]), ...o }),
    creds: (o = {}) => ({ donde: LS('Dónde está la clave (0 … 3)', 0, [0, 1, 2, 3]), cred: LS('Credencial (0 compartida, 1 por nodo)', 0, [0, 1]), inc: LS('Incidente (0 repositorio, 1 robo)', 0, [0, 1]), ...o }),
    tls: (o = {}) => ({ tls: LS('Conexión (0 sin TLS, 1 setInsecure, 2 con tu CA)', 0, [0, 1, 2]), atk: LS('Atacante (0 escucha, 1 suplanta)', 0, [0, 1]), ...o }),
    seg: (o = {}) => ({ sep: LS('Red IoT separada (0 no, 1 sí)', 0, [0, 1]), fw: LS('Reglas en el cortafuegos (0 no, 1 sí)', 0, [0, 1]), ...o }),
    priv: (o = {}) => ({ res: LS('Un dato cada', 1, [1, 15, 60, 1440], 'min'), ...o }),
    brown: (o = {}) => ({ C: LS('Condensador junto al módulo', 0, [0, 10, 100, 470, 1000], 'µF'), R: LS('Resistencia de cables y fuente', 3, [0.2, 0.5, 1, 2, 3], 'Ω', 1), I: LS('Pico de la radio', 400, [100, 200, 300, 400], 'mA'), ...o }),
    solar: (o = {}) => ({ P: LS('Panel', 0.5, [0.5, 1, 2, 3, 5], 'W', 1), h: SL('Horas de sol pico', 2, 1, 6, 0.5, 'h', 1), I: LS('Consumo medio del nodo', 10, [0.5, 1, 2, 5, 10, 20], 'mA', 1), ...o }),
    sleep: (o = {}) => ({ Ia: SL('Corriente despierto', 120, 20, 250, 5, 'mA'), ta: SL('Tiempo despierto', 3, 0.2, 10, 0.1, 's', 1), Is: LS('Corriente dormido', 5000, [5, 10, 25, 50, 150, 1000, 5000], 'µA'), T: LS('Periodo', 60, [10, 30, 60, 300, 600, 900, 1800, 3600], 's'), C: FX(2500), ...o }),
    backoff: (o = {}) => ({ base: SL('Espera inicial', 0.5, 0.5, 5, 0.5, 's', 1), cap: LS('Tope', 5, [5, 10, 30, 60, 120, 300], 's'), J: SL('Azar (jitter)', 0, 0, 50, 5, '%'), ...o }),
    ota: (o = {}) => ({ v: LS('Versión nueva (0 buena, 1 se cuelga, 2 no conecta)', 1, [0, 1, 2]), firma: LS('Firma (0 válida, 1 falsa)', 0, [0, 1]), inst: LS('Instalar (0 no, 1 sí)', 0, [0, 1]), ...o }),
    delta: (o = {}) => ({ d: LS('Delta: enviar si cambia', 0, [0, 0.1, 0.2, 0.5, 1], '°C', 1), hb: LS('Latido cada (0 = sin latido)', 0, [0, 5, 15, 60], 'min'), ...o }),
    mesh: (o = {}) => ({ dist: LS('Distancia del sensor', 10, [5, 10, 15, 20, 25, 30], 'm'), router: LS('Enchufe Zigbee a medio camino (0 no, 1 sí)', 0, [0, 1]), ...o }),
    lwc: (o = {}) => ({ cls: LS('Clase (0 A, 1 B, 2 C)', 0, [0, 1, 2]), up: LS('Subida cada', 5, [5, 15, 30, 60], 'min'), ...o }),
    psm: (o = {}) => ({ modo: LS('Modo (0 conectado, 1 eDRX, 2 PSM)', 0, [0, 1, 2]), n: LS('Envíos al día', 24, [1, 4, 24, 96]), ...o }),
    duty: (o = {}) => ({ SF: LS('Factor de dispersión (SF)', 12, [7, 8, 9, 10, 11, 12]), PL: SL('Carga útil', 10, 1, 51, 1, 'B'), ...o })
  };
  // Nombres de las opciones de cada deslizador (mismo orden que list); se añaden solos a PP
  const NO_SI = ['No', 'Sí'];
  const OPT = {
    chain: { corte: ['Ninguna', 'Se cae el WiFi', 'Se apaga el broker', 'Se cae la base de datos'], local: NO_SI },
    radiopick: { dat: ['Unos bytes', 'kB al día', 'MB al día', 'Vídeo'], pila: ['Enchufado', 'A pila'], mov: ['Fijo', 'Se mueve lejos'] },
    outage: { arq: ['Nube del fabricante', 'Servidor en casa', 'Híbrida'], inet: ['Funciona', 'Caído'] },
    boot: { f: ['Ninguna', 'Clave WiFi mal', 'Router sin direcciones', 'DNS caído', 'Servidor apagado'] },
    tcpudp: { proto: ['UDP', 'TCP'] },
    nat: { quien: ['El nodo', 'Alguien de fuera'], fwd: NO_SI, vpn: NO_SI },
    rssi: { metal: NO_SI },
    http: { m: ['GET', 'POST', 'PUT', 'DELETE'], r: ['/api/estado', '/api/lecturas', '/api/umbral', '/api/sotano'], a: ['Sin credencial', 'Con credencial'] },
    idem: { m: ['PUT umbral = 30', 'POST suma 1'] },
    bytes: { fmt: ['JSON largo', 'JSON corto', 'Binario'] },
    poll: { modo: ['Sondeo', 'Empuje'] },
    mqtt0: { t: IO_TOPICS0, f: IO_FILT0 },
    mqtt1: { t: IO_TOPICS1, f: IO_FILT1 },
    qos: { q: ['QoS 0', 'QoS 1', 'QoS 2'] },
    retain: { ret: NO_SI, borrar: NO_SI },
    lwt: { limpia: ['Corte de luz', 'DISCONNECT'] },
    acl: { u: ['salon', 'cocina', 'panel'], t: IO_ACLT, acc: ['Publicar', 'Leer'] },
    filt: { tipo: ['Sin filtro', 'Media móvil', 'Mediana', 'Exponencial'] },
    retention: { etq: ['Sala', 'Id de mensaje'] },
    anom: { an: ['Ninguna', 'Subida brusca', 'Valor congelado', 'Deja de enviar', 'Se sale del rango'], det: ['Umbral', 'Velocidad de cambio', 'Valor congelado', 'Silencio'] },
    risk: { am: IO_THREATS.map(t => t[0]), def: NO_SI },
    creds: { donde: ['En el código', 'secrets.h fuera de git', 'NVS', 'NVS con flash cifrada'], cred: ['Compartida', 'Una por nodo'], inc: ['Repositorio publicado', 'Robo de un nodo'] },
    tls: { tls: ['Sin TLS', 'TLS con setInsecure()', 'TLS con tu CA'], atk: ['Escucha', 'Suplanta al broker'] },
    seg: { sep: NO_SI, fw: NO_SI },
    ota: { v: ['Buena', 'Se cuelga', 'No conecta'], firma: ['Válida', 'Falsa'], inst: NO_SI },
    delta: { hb: ['Sin latido', '5 min', '15 min', '60 min'] },
    mesh: { router: NO_SI },
    lwc: { cls: ['Clase A', 'Clase B', 'Clase C'] },
    psm: { modo: ['Siempre conectado', 'eDRX', 'PSM'] }
  };
  for (const name of Object.keys(PP)) {
    const f = PP[name];
    PP[name] = (o = {}) => {
      const p = f(o);
      for (const [k, L] of Object.entries(OPT[name] || {})) if (p[k] && !p[k].fixed && p[k].list && !p[k].labels) p[k] = { ...p[k], label: p[k].label.replace(/ \(.*\)$/, ''), labels: L };
      return p;
    };
  }

  /* ---------- conceptos ---------- */
  Object.assign(CONCEPTS, {
    /* --- m1: sistemas --- */
    io_arch: { name: 'Eslabones de un sistema IoT', alts: [
      { title: 'Una cadena de montaje', text: 'Piensa en una fábrica: el <b>sensor</b> recoge la materia prima, el <b>nodo</b> la empaqueta, la <b>red</b> la transporta, la <b>pasarela</b> cambia de camión si hace falta, el <b>broker o servidor</b> la reparte, la <b>base de datos</b> la almacena y el <b>panel o la automatización</b> la usa. Si falta la parte de red, un aparato que mide y actúa él solo es un sistema embebido, todavía no IoT.', q: mcq('Un sensor Zigbee no puede hablar directamente con tu WiFi. ¿Qué eslabón falta?', ['Una pasarela (coordinador) que traduzca entre Zigbee e IP', 'Una base de datos más grande', 'Más ancho de banda en el WiFi', 'Un panel en el móvil'], 'La pasarela conecta redes distintas.') },
      { title: 'Sigue a un dato', text: 'Acompaña a una lectura: el sensor la convierte en señal, el nodo (un ESP32) la lee y la empaqueta, la red la lleva al router, el broker la reparte, la base de datos la guarda con su hora y el panel la dibuja. Ese viaje es de <b>subida</b> (telemetría).\nUna orden desde el móvil hace el camino al revés: <b>bajada</b>, del servidor al nodo y de ahí al actuador.', q: mcq('Desde el panel cambias el umbral de alarma de un nodo. ¿Qué viaje hace ese dato?', ['De bajada: del servidor hacia el nodo', 'De subida: del nodo hacia el servidor', 'Ninguno: el panel habla directamente con el sensor', 'Se queda en la base de datos'], 'Las órdenes y la configuración bajan; la telemetría sube.') }
    ] },
    io_local: { name: 'Lo crítico, en local', alts: [
      { title: 'Lo local primero', text: 'Si el broker, la base de datos y las automatizaciones viven en tu casa, todo sigue funcionando sin internet y tus datos no salen. Lo más crítico (una alarma de fuga, un límite de seguridad) va aún más cerca: en el propio nodo, que decide aunque se caigan la red o el broker. La nube aporta acceso remoto y escala, pero añade dependencia de internet y del fabricante.', q: mcq('Se cae internet en casa. ¿Qué sistema sigue encendiendo la luz con el sensor de presencia?', ['El que tiene broker y automatizaciones en un servidor local', 'El que depende de la app del fabricante en la nube', 'Ninguno', 'Ambos, siempre'], 'Lo local no necesita salir a internet.') },
      { title: 'Quita una pieza y mira qué queda', text: 'Haz el ejercicio mental: apaga internet, luego el broker, luego la nube del fabricante. Lo que deja de funcionar dependía de esa pieza. Un buen diseño aguanta casi todo: el nodo decide lo urgente, el servidor de casa automatiza y la nube, si la hay, solo recibe los resúmenes que tú eliges. Al comprar, pregunta si funciona en local, sin cuenta.', q: mcq('Un detector de humo conectado solo hace sonar su sirena si su servidor en la nube lo ordena. ¿Qué falla en el diseño?', ['Lo crítico depende de la red: la sirena debería decidirse en el propio detector', 'Nada, la nube es más fiable', 'Que debería usar QoS 2', 'Que no guarda el historial'], 'Una alarma no puede esperar a internet.') }
    ] },
    io_datavol: { name: 'Volumen de datos: tamaño × veces', alts: [
      { title: 'Multiplica y cuida las unidades', text: 'Para saber cuántos datos genera algo, multiplica lo que ocupa cada envío (o cada muestra) por cuántas veces ocurre. Las veces salen de dividir el tiempo total entre el intervalo: un día son 86 400 s y un mes de 30 días, 2 592 000 s. Ojo con las unidades: 8 bits son 1 byte, 1 kB son 1000 bytes y 1 MB, 1 000 000 de bytes.', q: mcq('Un nodo envía 50 bytes cada 60 s. ¿Cuántos bytes al día?', ['72 000 bytes', '3000 bytes', '1440 bytes', '4 320 000 bytes'], '86 400 / 60 = 1440 envíos; × 50 bytes = 72 000 bytes.') },
      { title: 'Paso a paso con un ejemplo', text: 'Ejemplo: 100 bytes cada 10 s durante un mes.\n1) Envíos: 30 × 86 400 / 10 = 259 200.\n2) Bytes: 259 200 × 100 = 25 920 000.\n3) En MB: entre 1 000 000 = 25,92 MB.\nCon muestras en bruto, igual: canales × muestras por segundo × bits por muestra = bits por segundo.', q: mcq('2 canales a 500 muestras/s y 16 bits por muestra. ¿Cuántos kbit/s en bruto?', ['16 kbit/s', '8 kbit/s', '1 kbit/s', '16 000 kbit/s'], '2 × 500 × 16 = 16 000 bit/s = 16 kbit/s.') }
    ] },
    io_reqs: { name: 'Requisitos de un nodo', alts: [
      { title: 'Las cinco preguntas', text: 'Antes de elegir nada, responde: <b>energía</b> (¿enchufe o pila? ¿cuántos años?), <b>alcance</b> (¿metros o kilómetros? ¿qué paredes?), <b>datos</b> (¿cuántos bytes y cada cuánto?), <b>latencia</b> (¿cuánto puede tardar un aviso?) y <b>coste</b> (por nodo, de infraestructura y de mantenimiento). En cada caso, el requisito más exigente es el que decide.', q: mcq('Un sensor de inundación en un garaje subterráneo, a pilas. ¿Qué dos requisitos mandan?', ['Energía para años y alcance a través del hormigón', 'Ancho de banda y color de la caja', 'Latencia de milisegundos y vídeo', 'Ninguno en especial'], 'Pilas + sótano: autonomía y alcance.') },
      { title: 'Lo que se olvida', text: 'Dos requisitos traicioneros. El <b>alcance real</b> solo se conoce midiendo la señal en el sitio: el hormigón y el metal atenúan mucho. Y el <b>mantenimiento</b>: cambiar pilas cuesta horas de trabajo, y 100 nodos que duran 6 meses son 200 cambios al año. A escala, consumo y mantenimiento pesan más que el precio de cada placa.', q: mcq('50 nodos con pilas que duran 1 año frente a otros con pilas que duran 5 años. ¿Cuántos cambios de pila al año te ahorras con los segundos?', ['40', '50', '10', '250'], '50 cambios al año frente a 10.') }
    ] },
    io_radio: { name: 'Radio encendida: gasta; dormido: sordo', alts: [
      { title: 'El grifo abierto', text: 'En un nodo a pilas, lo que vacía la batería es el tiempo con la radio encendida: asociarse al WiFi, abrir TCP y TLS, enviar y esperar respuesta. Cuantas menos veces despiertes y menos dure cada conexión, más dura. La otra cara: mientras duerme, la radio está apagada y el nodo no oye nada. Por eso los sensores a pila solo hablan y los actuadores que deben obedecer al momento van enchufados.', q: mcq('Un nodo a pilas envía por WiFi cada 10 s. ¿Qué mejora más su autonomía?', ['Medir a menudo pero enviar un resumen cada 10 minutos', 'Acortar el nombre del tema', 'Enviar un decimal menos', 'Bajar el brillo del LED de estado'], 'Menos conexiones = menos tiempo de radio.') },
      { title: 'Las cuentas de un despertar', text: 'Un despertar con WiFi típico gasta del orden de 120 mA durante 1–3 s: asociarse, pedir IP, abrir la conexión (con TLS, varios viajes más) y enviar. Mandar 20 bytes o 200 casi no cambia esa cuenta; repetir el despertar cada 10 s, sí. Y un nodo dormido es un servidor apagado: si alguien le manda algo, nadie contesta hasta que despierte.', q: mcq('Una cerradura debe abrirse en menos de 1 s desde el móvil. ¿Puede su nodo dormir 5 minutos entre despertares?', ['No: dormido no escucha y la orden tardaría hasta 5 minutos', 'Sí, la orden lo despierta sola', 'Sí, si usa JSON', 'Sí, con QoS 2'], 'Quien debe obedecer al momento escucha siempre, y suele ir enchufado.') }
    ] },
    io_radiopick: { name: 'Elegir la radio', alts: [
      { title: 'Decidir por requisitos', text: 'No hay radio “mejor”: hay la que cumple tus requisitos. Pregunta en orden: ¿de dónde sale la energía (enchufe o pila)? ¿A qué distancia está? ¿Cuántos datos y cada cuánto? ¿Se mueve? ¿Cuánto cuesta cada nodo y la infraestructura?', q: mcq('Un sensor a pilas a 2 km, que envía 10 bytes cada 15 min. ¿Qué tecnología encaja?', ['LoRaWAN', 'WiFi', 'Bluetooth LE', 'Ethernet'], 'Largo alcance, pocos datos y muy bajo consumo.') },
      { title: 'Un caso para cada radio', text: '<b>WiFi</b>: mucho ancho de banda con enchufe (cámaras). <b>BLE</b>: pocos metros con el móvil al lado. <b>Zigbee/Thread</b>: sensores a pila por la casa, con equipos enchufados que repiten. <b>LoRaWAN</b>: kilómetros con pocos bytes. <b>NB-IoT/LTE-M</b>: cobertura del operador donde no tienes infraestructura; LTE-M si el equipo se mueve.', q: mcq('Un collar localizador para un perro que se escapa por el pueblo y el monte. ¿Qué radio?', ['LTE-M', 'Zigbee', 'WiFi', 'Bluetooth LE'], 'Se mueve lejos de casa: celular con movilidad.') }
    ] },
    io_espchips: { name: 'Qué radios trae cada chip de Espressif', alts: [
      { title: 'Ficha rápida', text: '<b>ESP32 clásico</b>: WiFi solo de 2,4 GHz y Bluetooth. <b>ESP32-C6</b>: WiFi de 2,4 GHz, BLE y la radio IEEE 802.15.4 de Zigbee y Thread. <b>ESP32-H2</b>: 802.15.4 y BLE, sin WiFi. <b>ESP32-C5</b>: WiFi de 2,4 y 5 GHz. Para LoRa o redes celulares hace falta un módulo aparte.', q: mcq('Quieres un nodo Zigbee que además tenga WiFi en el mismo chip. ¿Cuál?', ['ESP32-C6', 'ESP32-H2', 'ESP32 clásico', 'ESP8266'], 'El H2 no tiene WiFi y el clásico no tiene la radio de Zigbee y Thread.') },
      { title: 'Mira la radio, no el nombre', text: 'Todos se llaman ESP32, pero cada uno trae radios distintas, y lo que no está en el silicio no se arregla con código ni con una antena. Zigbee y Thread necesitan la radio 802.15.4 (C6, H2). El clásico solo habla WiFi de 2,4 GHz y Bluetooth, así que no ve una red de 5 GHz. Antes de elegir placa, mira en la hoja de datos qué radios trae.', q: mcq('Tu router solo emite en 5 GHz y tu ESP32 clásico no encuentra la red. ¿Solución?', ['Activar también la banda de 2,4 GHz en el router', 'Ponerle una antena externa', 'Actualizar la librería WiFi', 'Usar Thread'], 'El ESP32 clásico no tiene radio de 5 GHz.') }
    ] },
    io_dbm: { name: 'dBm y relaciones de potencia', alts: [
      { title: 'Decibelios de señal', text: 'El RSSI se da en dBm, una escala logarítmica: 0 dBm es 1 mW. Cada 3 dB menos es la mitad de potencia y cada 10 dB menos, diez veces menos. −50 dBm es una señal excelente; por debajo de unos −80 dBm, el enlace WiFi se vuelve poco fiable.', q: mcq('Pasas de −60 dBm a −70 dBm. La potencia recibida…', ['Es diez veces menor', 'Baja un 10 %', 'Es la mitad', 'No cambia'], '10 dB = factor 10.') },
      { title: 'Cuatro saltos de memoria', text: 'Apréndete cuatro saltos: +3 dB es ×2, +6 dB es ×4, +10 dB es ×10 y +20 dB es ×100. Para pasar de dBm a mW, parte de 0 dBm = 1 mW y aplica saltos: 20 dBm = 100 mW; −10 dBm = 0,1 mW. Una diferencia en dB es siempre un <b>factor</b>, nunca un porcentaje.', q: mcq('¿Cuántos mW son 13 dBm?', ['Unos 20 mW', '13 mW', '1,3 mW', '130 mW'], '10 dBm son 10 mW; +3 dB, el doble: 20 mW.') }
    ] },
    io_privacy: { name: 'Datos personales y privacidad', alts: [
      { title: 'Lo que cuentan tus datos', text: 'Un dato es <b>personal</b> si dice algo de una persona identificable. El consumo eléctrico minuto a minuto revela cuándo te levantas, cocinas o te vas de vacaciones; un sensor de presencia, cuándo la casa está vacía. La temperatura de un invernadero vacío, en cambio, no habla de nadie.', q: mcq('¿Cuál de estos datos es personal?', ['El registro de cuándo se abre la puerta de un piso en el que vive una persona', 'La presión atmosférica en el tejado', 'La temperatura de un depósito de agua', 'La humedad de un bancal'], 'Asociado a una persona, revela sus hábitos.') },
      { title: 'Los principios del RGPD, aplicados', text: '<b>Minimización</b>: mide lo necesario y no más (CO₂ para ventilar, no una cámara). <b>Finalidad</b>: usa el dato solo para lo que lo recoges. <b>Conservación limitada</b>: borra los datos crudos cuando ya no sirven. <b>Transparencia</b>: que quien convive con el sensor lo sepa. <b>Seguridad</b>: protégelo.', q: mcq('Quieres saber si una sala de reuniones está ocupada. ¿Qué respeta mejor la minimización?', ['Un sensor de presencia que solo dice sí o no', 'Una cámara que graba la sala', 'Detectar los móviles de los asistentes por WiFi', 'Un micrófono que graba las conversaciones'], 'Recoge solo lo que necesitas.') }
    ] },
    io_remote: { name: 'Acceso remoto sin abrir puertos', alts: [
      { title: 'La puerta de casa, cerrada', text: 'Redirigir un puerto (o dejar que un aparato lo abra solo con <b>UPnP</b>) expone un equipo de casa a todo internet, donde hay programas barriendo direcciones sin parar. Lo seguro es lo contrario: una <b>VPN</b> propia (WireGuard) por la que tu móvil entra cifrado en tu red, o que tu sistema se conecte de salida a un servicio. De más a menos seguro: VPN, conexión saliente, puerto abierto con HTTPS, puerto abierto sin cifrar.', q: mcq('Quieres consultar el Grafana de casa desde el trabajo. ¿Qué haces?', ['Montar una VPN hacia tu red y entrar por ella', 'Redirigir el puerto 3000 del router a la Raspberry Pi', 'Activar UPnP en el router', 'Quitar la contraseña de Grafana'], 'Nada expuesto: entras tú por un túnel cifrado.') },
      { title: 'Quién inicia la conexión', text: 'Regla práctica: que las conexiones salgan de casa, no que entren. Un nodo lejano (por ejemplo, con NB-IoT) no debería llegar a tu broker por un puerto abierto, sino por una VPN o un servidor intermedio seguro. Revisa la tabla UPnP del router y desactívalo si no lo necesitas: así es como una cámara barata se abre puertos sin preguntarte.', q: mcq('En la tabla UPnP del router ves un puerto abierto por un enchufe WiFi. ¿Qué haces?', ['Desactivar UPnP y cerrar ese puerto: el enchufe no necesita entradas desde internet', 'Nada: si lo abrió, lo necesita', 'Abrir más puertos para que vaya mejor', 'Cambiar el canal WiFi'], 'Un aparato no debería abrir puertas en tu router sin preguntarte.') }
    ] },
    /* --- m2: redes --- */
    io_net: { name: 'IP, máscara y puerta de enlace', alts: [
      { title: 'Calle y portal', text: 'Una dirección IP es como una dirección postal: la <b>máscara</b> dice qué parte es la calle (la red) y qué parte el portal (el equipo). Con /24, los tres primeros números son la calle. Si dos equipos están en la misma calle, hablan directamente; si no, la carta va a la <b>puerta de enlace</b> (el router). Por eso IP, máscara y puerta de enlace deben ser coherentes.', q: mcq('Con máscara /24, ¿están en la misma red estos dos equipos?', ['No: el tercer número cambia', 'Sí: acaban igual', 'Sí: empiezan igual', 'Depende del DNS'], 'Con /24 deben coincidir los tres primeros bytes.', { code: 'Nodo:   192.168.1.20 /24\nBroker: 192.168.2.20 /24' }) },
      { title: 'Compara byte a byte', text: 'Con /24 (255.255.255.0), compara los tres primeros números de las dos IP. Si coinciden, están en la misma red y se hablan directamente. Si no, el paquete va a la puerta de enlace, que lo saca fuera: así se llega a cualquier servidor de internet. Si escribes a mano una IP de otra red, el equipo no puede hablar ni con su router.', q: mcq('Con esta configuración, ¿puede el ESP32 llegar a un servidor de internet?', ['Sí: el router está en su red y saca los paquetes de fuera', 'No: la IP del servidor no empieza como la suya', 'Solo si el servidor está en su misma red', 'Solo con mDNS'], 'Lo que no es de tu red se entrega a la puerta de enlace.', { code: 'ESP32:             192.168.4.30 /24\nPuerta de enlace:  192.168.4.1' }) }
    ] },
    io_masks: { name: 'Máscara en bits: tamaño y dirección de red', alts: [
      { title: 'Bits de red y bits de equipo', text: 'Una IPv4 tiene 32 bits. /p significa que los p primeros son la red y los 32 − p restantes, el equipo. Caben 2^(32 − p) direcciones, pero la primera (la de red) y la última (la de difusión) no se dan a equipos: quedan 2^(32 − p) − 2. Con /24: 256 − 2 = 254.', q: mcq('¿Cuántos equipos caben en una red /29?', ['6', '8', '29', '3'], '32 − 29 = 3 bits: 2³ = 8 direcciones, menos 2.') },
      { title: 'Bloques del mismo tamaño', text: 'La máscara trocea el último byte en bloques de 2^(32 − p) direcciones. Con /26 son bloques de 64: 0–63, 64–127, 128–191 y 192–255. La dirección de red es el inicio del bloque en el que cae la IP, y la de difusión, su final. 10.0.0.100 /26 cae en 64–127: su red es 10.0.0.64.', q: mcq('¿Cuál es la dirección de red de este equipo?', ['192.168.1.192', '192.168.1.200', '192.168.1.128', '192.168.1.224'], '/27 = bloques de 32: el 200 cae en 192–223.', { code: 'Equipo: 192.168.1.200 /27' }) }
    ] },
    io_nat: { name: 'NAT: direcciones privadas y conexiones salientes', alts: [
      { title: 'La centralita de una oficina', text: 'Tu casa tiene una IP pública y muchos equipos con IP <b>privadas</b>, que solo valen dentro (por eso tu vecino puede usar las mismas). El router hace de centralita: cuando un equipo llama hacia fuera, apunta la llamada y le pasa las respuestas. Una llamada que entra sin que nadie la haya pedido no sabe a qué extensión ir y se descarta.', q: mcq('¿Puede alguien en internet usar la IP de tu nodo para conectar con él?', ['No: es privada y no se enruta en internet', 'Sí, es su dirección en el mundo', 'Sí, si conoce su MAC', 'Solo de noche'], 'Desde fuera solo se ve la IP pública del router.', { code: 'Nodo: 192.168.1.37 (red de casa)' }) },
      { title: 'Entra lo que responde a lo que salió', text: 'El NAT solo deja entrar respuestas a conexiones abiertas desde dentro. Por eso un nodo MQTT recibe órdenes de un broker externo: él abrió la conexión TCP de salida y la mantiene, y las órdenes vuelven por ella. Con IPv6 no hay NAT y cada equipo puede tener dirección pública: entonces quien frena lo que entra es el <b>cortafuegos</b> del router.', q: mcq('Un panel en la nube manda órdenes a un nodo de tu casa sin que hayas abierto puertos. ¿Cómo es posible?', ['El nodo abrió antes una conexión de salida y las órdenes vuelven por ella', 'El NAT deja pasar todo lo que viene de la nube', 'El panel conoce la IP privada del nodo', 'El router lo reenvía por DHCP'], 'NAT: solo entran respuestas a lo que salió.') }
    ] },
    io_dhcpdns: { name: 'DHCP, DNS y mDNS', alts: [
      { title: 'Hotel y guía telefónica', text: '<b>DHCP</b> es la recepción de un hotel: al llegar te presta una habitación (la IP) durante un tiempo (la concesión) y te dice dónde está la salida (puerta de enlace) y la guía (DNS). Una <b>reserva</b> es tener siempre la misma habitación, gestionada en el router. <b>DNS</b> es la guía: traduce nombres a IP. <b>mDNS</b> es preguntar en voz alta por el pasillo quién es termo.local: solo te oyen en tu planta, tu red.', q: mcq('Quieres que el broker tenga siempre la misma IP. ¿Qué es lo más limpio?', ['Una reserva DHCP en el router para su MAC', 'Escribir la IP en el código de cada nodo', 'Desactivar el DHCP del router', 'Usar mDNS desde otra red'], 'Se gestiona en un solo sitio y sin duplicados.') },
      { title: 'Diagnóstico por síntomas', text: 'Sigue el orden del arranque: asociarse al WiFi, pedir configuración por DHCP, preguntar al DNS el nombre del servidor y conectar. ¿Sin IP? Falla el DHCP o la clave. ¿Con IP y ping al router, pero sin llegar a un nombre? Falla el DNS: prueba con la IP. ¿termo.local no responde desde otra red? mDNS no cruza entre redes.', q: mcq('Un nodo llega al broker por su IP, pero no por su nombre. ¿Qué miras?', ['La resolución de nombres (DNS)', 'La clave del WiFi', 'La concesión DHCP', 'El canal WiFi'], 'Si va por IP y no por nombre, fallan los nombres.') }
    ] },
    io_ports: { name: 'Puertos, TCP y UDP', alts: [
      { title: 'Puertos: el número de la puerta', text: 'La IP dice a qué equipo vas; el <b>puerto</b> dice a qué programa. Puertos habituales: HTTP 80, HTTPS 443, MQTT 1883 (8883 con TLS), DNS 53, NTP 123 y SSH 22. Si algo escucha en el 1883 de tu Raspberry Pi, casi seguro es un broker MQTT sin cifrar.', q: mcq('Un broker MQTT y una web corren en la misma Raspberry Pi. ¿Cómo se distinguen?', ['Por el puerto', 'Por la máscara', 'Por la dirección MAC', 'No pueden convivir'], 'Misma IP, puertos distintos.') },
      { title: 'Carta certificada o postal', text: '<b>TCP</b> es una carta certificada: abre conexión, numera, confirma y reenvía lo perdido; llega todo y en orden. Lo usan HTTP, MQTT y SSH. <b>UDP</b> es una postal: sale suelta y, si se pierde, nadie la reenvía; a cambio, menos sobrecarga. Lo usan consultas cortas fáciles de repetir: DNS, NTP, mDNS y CoAP.', q: mcq('¿Sobre qué va NTP, el protocolo que pone en hora?', ['UDP', 'TCP', 'MQTT', 'HTTP'], 'Una pregunta corta: si se pierde, se repite.') }
    ] },
    io_wifichan: { name: 'Canales de 2,4 GHz y convivencia', alts: [
      { title: 'Carriles que se pisan', text: 'En 2,4 GHz los canales WiFi están separados 5 MHz, pero cada red ocupa unos 20 MHz: el canal 3 pisa al 1 y al 6. Es mejor compartir exactamente un canal (las redes se turnan) que solaparse con dos (se estorban sin coordinarse). Los habituales sin solape son 1, 6 y 11. Zigbee usa canales estrechos de 2 MHz (del 11 al 26): el 15, el 20 y el 25 caen en los huecos entre esos WiFi.', q: mcq('Las redes de tus vecinos están en los canales 1 y 11. ¿Qué canal WiFi eliges?', ['El 6', 'El 3', 'El 9', 'El 13'], 'El 6 no se solapa con el 1 ni con el 11; el 3, el 9 y el 13 sí pisan a alguno.') },
      { title: 'Cuenta en MHz', text: 'Canal WiFi n: centro en 2407 + 5·n MHz y unos 20 MHz de ancho (±10). Canal Zigbee k: centro en 2405 + 5·(k − 11) MHz y unos 2 MHz de ancho. Así, el WiFi 1 ocupa de 2402 a 2422 MHz y el 6, de 2427 a 2447. El Zigbee 25 está en 2475 MHz, lejos de ambos.', q: mcq('Tu WiFi está en el canal 11 (de 2452 a 2472 MHz). ¿Qué canal Zigbee lo evita?', ['15 (2425 MHz)', '21 (2455 MHz)', '22 (2460 MHz)', '23 (2465 MHz)'], 'El 21, el 22 y el 23 caen dentro del canal 11.') }
    ] },
    io_wifidiag: { name: 'Señal WiFi: obstáculos y diagnóstico', alts: [
      { title: 'De abajo arriba', text: 'Si un nodo “no envía”, ve por capas: radio (¿qué RSSI tiene?), IP (¿tiene dirección? ¿responde a ping?), nombres (¿resuelve el del broker?) y aplicación (¿llegan sus mensajes con mosquitto_sub?). No tiene sentido revisar el tema MQTT si el RSSI es de −88 dBm: arregla primero la capa de abajo.', q: mcq('Un nodo no aparece en mosquitto_sub y en el monitor serie ves que no obtiene IP. ¿Dónde sigues?', ['En la radio y el WiFi: RSSI, clave y canal', 'En el tema MQTT', 'En el panel de Grafana', 'En la ACL del broker'], 'Sin IP, lo de arriba todavía no importa.') },
      { title: 'Lo que se come la señal', text: 'Los 2,4 GHz sufren con el metal (armarios, neveras, mallas), el hormigón, los espejos y el agua, personas incluidas. Un nodo dentro de una caja metálica es un móvil en un ascensor: la solución no es software, sino sacar la antena, usar un módulo con antena externa o mover el nodo. Por debajo de unos −80 dBm, el enlace se vuelve poco fiable.', q: mcq('Un nodo dentro de un buzón metálico marca −90 dBm. ¿Qué haces primero?', ['Sacar la antena fuera con un módulo de antena externa', 'Subir el QoS de MQTT', 'Cambiar el tema MQTT', 'Reducir el tamaño del JSON'], 'El metal bloquea la radio.') }
    ] },
    /* --- m3: HTTP --- */
    io_http: { name: 'Anatomía de una petición HTTP', alts: [
      { title: 'Ventanilla de un banco', text: 'HTTP funciona como una ventanilla: el <b>cliente</b> hace una petición (método, ruta, cabeceras y, a veces, un cuerpo) y el <b>servidor</b> contesta con un código de estado y una respuesta. El servidor no recuerda las peticiones anteriores (HTTP es <b>sin estado</b>): cada una lleva todo lo necesario, y las sesiones se montan encima con cookies o tokens.', q: mcq('En “POST /api/lecturas”, ¿qué es /api/lecturas?', ['La ruta del recurso', 'El método', 'El tipo del cuerpo', 'El código de estado'], 'Primero el método (POST) y luego la ruta.') },
      { title: 'Una carta con sobre', text: 'Una petición HTTP es una carta: en la primera línea, qué quieres hacer (<b>método</b>) y con qué (<b>ruta</b>); en el sobre, las <b>cabeceras</b> (Content-Type dice el formato del cuerpo, Authorization lleva credenciales); y dentro, el <b>cuerpo</b>. Cada carta es independiente: el servidor no se acuerda de las anteriores.', q: mcq('¿Qué cabecera dice que el cuerpo es JSON?', ['Content-Type: application/json', 'Host: termo.local', 'Accept-Language: es', 'Content-Length: 28'], 'Content-Type describe el formato del cuerpo.') }
    ] },
    io_rest: { name: 'REST: recursos, métodos e idempotencia', alts: [
      { title: 'Sustantivos y verbos', text: 'En REST, las rutas son <b>sustantivos</b> (recursos: /nodos/salon/lecturas) y los métodos, <b>verbos</b>: GET lee, POST crea o envía algo nuevo (y responde 201 si lo crea), PUT sustituye entero, PATCH cambia una parte y DELETE borra. Nada de /dameLecturas: el verbo ya lo pone el método.', q: mcq('Quieres dar de baja el nodo “garaje” en tu API. ¿Qué petición?', ['DELETE /nodos/garaje', 'GET /borrarGaraje', 'POST /nodos/garaje/borrar', 'PATCH /garaje?borrar=1'], 'Ruta del recurso y método DELETE.') },
      { title: 'Repetir sin miedo', text: 'Una petición es <b>idempotente</b> si hacerla dos veces deja todo igual que hacerla una. GET, PUT y DELETE lo son; POST normalmente no. Importa al reintentar tras un corte: repetir “PUT umbral = 30” es inocuo; repetir “POST suma 1 al contador” cuenta dos veces.', q: mcq('Tras un corte, ¿qué petición puedes reintentar sin riesgo?', ['PUT /persianas/salon con {"posicion":50}', 'POST /contador/sumar', 'POST /avisos', 'POST /lecturas sin identificador'], 'Fijar un estado es idempotente.') }
    ] },
    io_status: { name: 'Códigos de estado HTTP', alts: [
      { title: 'Por la primera cifra', text: 'La primera cifra lo dice casi todo: <b>2xx</b> éxito (200 OK, 201 creado), <b>3xx</b> redirección, <b>4xx</b> el error es de quien pide (400 mal formada, 401 sin autenticar, 404 no existe, 429 demasiado deprisa) y <b>5xx</b> el error es del servidor (500, 503). Comprueba siempre el código antes de usar la respuesta: un 500 también trae cuerpo, pero es una página de error.', q: mcq('Recibes 404 al pedir /nodos/sotano. ¿Qué significa?', ['Ese recurso no existe en el servidor', 'El servidor está caído', 'Falta autenticarse', 'Todo ha ido bien'], '4xx: problema de la petición; 404, no existe.') },
      { title: 'Qué hacer con cada uno', text: 'El código decide tu siguiente paso. 2xx: hecho; un 201 ya confirma que se creó, aunque luego pierdas el cuerpo. 4xx: no repitas igual, corrige la petición o la clave; con 429, baja el ritmo y respeta Retry-After. 5xx: el servidor tiene un problema, normalmente pasajero; reintenta más tarde con espera creciente.', q: mcq('Tu nodo recibe 503 al enviar una lectura. ¿Qué haces?', ['Guardarla y reintentar más tarde con espera creciente', 'Corregir el JSON', 'Darla por enviada', 'Reintentar en bucle sin pausa'], '5xx: el problema es del servidor y suele ser temporal.') }
    ] },
    io_json: { name: 'Sintaxis de JSON', alts: [
      { title: 'Las reglas en una línea', text: 'JSON tiene objetos entre llaves {"clave": valor}, listas entre corchetes [1, 2], cadenas entre comillas <b>dobles</b>, números (con punto decimal) y true, false y null en minúsculas. Las claves van siempre entre comillas dobles. Nada de comillas simples ni de True con mayúscula.', q: mcq('¿Cuál es JSON válido?', ['{"luz": false, "nivel": 3}', '{luz: false}', '{\'luz\': false}', '{"luz": False}'], 'Clave entre comillas dobles y false en minúscula.') },
      { title: 'Reconocer los tipos', text: 'Mira el primer carácter del valor: <b>{</b> abre un objeto, <b>[</b> una lista, <b>"</b> una cadena; un dígito o un signo menos, un número; y true, false o null son booleanos o nulo. Así, "alarmas": ["puerta"] es una lista con una cadena dentro, y "ok": true, un booleano.', q: mcq('En {"nodo": {"id": 3}}, ¿qué tipo tiene el valor de "nodo"?', ['Un objeto', 'Una lista', 'Un número', 'Una cadena'], 'Empieza por llave: es un objeto.') }
    ] },
    io_arduinojson: { name: 'Leer JSON en el ESP32 (ArduinoJson)', alts: [
      { title: 'Leer con red de seguridad', text: 'Con ArduinoJson: deserializeJson(doc, entrada) y comprueba el error que devuelve. Para un campo que puede faltar, usa el operador |: doc["umbral"] | 30 da el valor recibido, o 30 si no viene o no es un número. Nunca supongas que el mensaje trae lo que esperas.', q: mcq('¿Qué da doc["intervalo"] | 60 si el JSON recibido es {"umbral":25}?', ['60', '25', '0', 'Un error de compilación'], 'Falta "intervalo": se usa el valor por defecto.') },
      { title: 'No te comas lo que no cabe', text: 'La RAM del ESP32 es limitada: un JSON de decenas de kB puede no caber. Dos defensas: pedir a la API solo los campos necesarios (muchas permiten elegirlos en la URL) y deserializar con un <b>filtro</b> directamente desde el flujo de red, de modo que lo que no interesa se descarta mientras se lee, sin guardarlo entero en un String.', q: mcq('Una API devuelve 80 kB y solo quieres la temperatura máxima de mañana. ¿Qué haces?', ['Pedir solo ese campo y deserializar con filtro desde el flujo', 'Leerlo entero en un String y buscar con indexOf', 'Usar un ESP32 con más flash', 'Pedirlo diez veces'], 'Menos datos, y descartar al vuelo lo que sobra.') }
    ] },
    io_payload: { name: 'Tamaño de la carga: JSON frente a binario', alts: [
      { title: 'Contar bytes', text: 'JSON es texto: cada llave, comilla, dos puntos y coma ocupa un byte. {"h":48} son 8 bytes para un dato que en binario cabe en 1 o 2. Es legible y fácil de depurar; el precio es tamaño, que por WiFi casi no importa y en LoRaWAN, mucho.', q: mcq('¿Cuántos bytes ocupa {"co2":812}?', ['11', '2', '3', '9'], 'Llave, comillas, co2, dos puntos, 812 y llave: 11 caracteres.') },
      { title: 'Cada byte cuesta aire', text: 'En LoRaWAN cada byte alarga el tiempo en aire, limitado por ley (1 %) y por la red; además, con SF10 a SF12 en EU868 solo caben 51 bytes tuyos por mensaje (115 con SF9 y unos 222 con SF7 y SF8). Por eso se envía binario: un valor de 16 bits ocupa 2 bytes y el servidor lo decodifica. Cuatro valores de 16 bits = 8 bytes.', q: mcq('Envías temperatura, humedad y batería, cada una como entero de 16 bits. ¿Cuántos bytes?', ['6', '3', '48', '16'], '3 valores × 2 bytes.') }
    ] },
    io_srvcli: { name: 'Servidor en el nodo o cliente que envía', alts: [
      { title: 'Tienda o repartidor', text: 'Un <b>servidor en el nodo</b> es una tienda: abierta y atendiendo a quien llega, así que handleClient() debe llamarse muchas veces por segundo (un delay largo deja la puerta cerrada). Encaja con un nodo enchufado que miras de vez en cuando o para configurarlo desde el navegador. Un <b>cliente que envía</b> es un repartidor: sale cuando tiene algo, entrega por POST y vuelve. Encaja con nodos a pilas y con muchos nodos que alimentan un servidor central.', q: mcq('Doce nodos deben guardar sus lecturas en una base de datos central. ¿Qué enfoque?', ['Cliente que envía: cada nodo hace POST al servidor central', 'Un servidor en cada nodo, y que la base de datos los vaya recorriendo', 'Ninguno', 'Servidor en el nodo con delay(60000)'], 'El servidor central recibe; los nodos envían.') },
      { title: 'El envío que no se fía', text: 'Un cliente robusto sigue siempre los mismos pasos: medir y montar el mensaje, asegurarse de que hay WiFi, hacer el POST con tiempo máximo, mirar el código de estado y, si falla, guardar el dato en una cola para reintentar. Si en cambio es servidor, no bloquees loop(): mide con millis() y deja que handleClient() se llame a menudo.', q: mcq('Tras el POST, ¿qué paso no puede faltar antes de quitar el dato de la cola?', ['Comprobar que el código de estado es de éxito', 'Esperar 10 s', 'Reiniciar el WiFi', 'Imprimir el JSON'], 'Sin confirmación, no lo des por enviado.') }
    ] },
    io_push: { name: 'Sondeo, empuje y WebSocket', alts: [
      { title: 'Preguntar o que te avisen', text: '<b>Sondeo</b>: preguntas cada T segundos. Cuesta 86 400 / T peticiones al día y un cambio puede tardar hasta T en verse; sirve si el dato cambia despacio y no urge. <b>Empuje</b>: quien tiene el dato lo envía al cambiar. Entre máquinas, MQTT; hacia un navegador, <b>WebSocket</b> (un canal abierto en los dos sentidos); entre servicios, un <b>webhook</b> (un POST de aviso).', q: mcq('Un panel sondea cada 5 s. ¿Cuántas peticiones hace al día?', ['17 280', '5', '288', '86 400'], '86 400 / 5.') },
      { title: 'Cada caso con su técnica', text: 'Previsión del tiempo cada hora: sondeo, sencillo y suficiente. Panel web en directo: WebSocket. Muchos nodos y muchos lectores: MQTT. Un servicio externo que te avisa de algo: webhook. Nodo a pilas: empuje sí o sí, porque dormido no se le puede preguntar; despierta, envía si cambió (o cada cierto tiempo) y vuelve a dormir.', q: mcq('Una página web debe mostrar al instante cuándo se abre una puerta. ¿Qué usas?', ['WebSocket (o MQTT sobre WebSocket)', 'Sondeo cada hora', 'Un correo diario', 'DHCP'], 'Un canal abierto para empujar los cambios.') }
    ] },
    /* --- m4: MQTT --- */
    io_pubsub: { name: 'Publicar y suscribirse', alts: [
      { title: 'Un tablón de anuncios', text: 'En MQTT nadie habla con nadie directamente. Los nodos <b>publican</b> mensajes en temas de un tablón (el <b>broker</b>) y quien esté interesado se <b>suscribe</b> a esos temas. El sensor no sabe quién lo lee; el panel no sabe quién escribe. Por eso añadir un lector nuevo no obliga a tocar el sensor.', q: mcq('Añades un segundo panel que quiere la temperatura del salón. ¿Qué cambias en el sensor?', ['Nada: el panel nuevo se suscribe al mismo tema', 'Hay que reprogramarlo para enviar a dos sitios', 'Hay que darle la IP del panel', 'Hay que duplicar el broker'], 'Publicador y suscriptor están desacoplados.') },
      { title: 'El cartero con su lista', text: 'El broker es un cartero con una lista de “a quién le interesa cada tema”. Cada cliente abre su conexión con el broker y se identifica; luego publica o se suscribe. Cuando llega una publicación, el broker mira la lista y la reparte a todos los suscritos. Quien publica lo hace una sola vez, lea quien lea.', q: mcq('Tres paneles están suscritos a casa/salon/temperatura y el nodo publica una lectura. ¿Cuántas veces la publica el nodo?', ['Una: el broker hace las tres copias', 'Tres, una por panel', 'Ninguna: la piden los paneles', 'Depende del DNS'], 'El reparto es trabajo del broker.') }
    ] },
    io_mqttesp: { name: 'MQTT en el ESP32: errores típicos', alts: [
      { title: 'Lista de comprobación', text: 'Cinco cosas que muerden con PubSubClient:\n1) El búfer es de 256 bytes por defecto: un mensaje mayor no sale (setBufferSize).\n2) La carga llega como bytes con su longitud, sin 0 final: cópiala y termínala tú.\n3) Hay que llamar a loop() a menudo, o no entran mensajes ni se mantiene el keepalive.\n4) Solo publica con QoS 0.\n5) Cada cliente necesita un ID único.', q: mcq('Tu ESP32 publica bien mensajes cortos, pero uno de 300 bytes falla. ¿Qué cambias?', ['Amplías el búfer con setBufferSize', 'Subes el QoS', 'Cambias el puerto', 'Acortas el ID de cliente'], 'Por defecto caben 256 bytes.') },
      { title: 'Síntoma → causa', text: 'Mensajes largos que no salen → búfer corto. Basura al imprimir la carga → la tratas como cadena sin 0 final. El broker te desconecta y no llegan órdenes → no llamas a loop(). Dos nodos que se echan uno a otro cada pocos segundos → comparten ID de cliente. Necesitas publicar con QoS 1 → PubSubClient no lo hace: usa esp-mqtt de ESP-IDF u otra librería que lo admita.', q: mcq('Al imprimir cada mensaje recibido aparecen caracteres raros al final. ¿Causa?', ['La carga no acaba en 0 y la imprimes como cadena', 'El broker está mal configurado', 'Falta QoS 2', 'El tema es demasiado largo'], 'Copia len bytes a un búfer y añade tú el 0.') }
    ] },
    io_topics: { name: 'Temas y comodines MQTT', alts: [
      { title: 'Carpetas', text: 'Un tema es como una ruta de carpetas: casa/salon/temperatura. <b>+</b> sustituye exactamente una carpeta; <b>#</b> sustituye todo lo que queda (incluido nada) y solo puede ir al final. casa/+/temperatura recibe la de cada habitación; casa/salon/# recibe todo lo del salón, también casa/salon.', q: mcq('¿Qué tema recibe un suscriptor de casa/+/temperatura?', ['casa/cocina/temperatura', 'casa/cocina/nevera/temperatura', 'casa/temperatura', 'Casa/cocina/temperatura'], '+ es un solo nivel y los temas distinguen mayúsculas.') },
      { title: 'Reglas finas y buen diseño', text: 'Tres detalles que muerden: 1) distinguen mayúsculas (Casa no es casa); 2) una barra inicial crea un nivel vacío (/casa no es casa); 3) los temas que empiezan por $ (como $SYS) no entran con un comodín al principio. Por eso conviene diseñarlos en minúsculas, sin espacios ni acentos, sin barra inicial y de lo general a lo concreto.', q: mcq('Un suscriptor de # en tu broker. ¿Recibe $SYS/broker/uptime?', ['No: los temas con $ no entran con un comodín inicial', 'Sí: # lo recibe todo', 'Solo con QoS 2', 'Solo si es retenido'], 'Hay que suscribirse a $SYS/# explícitamente.') },
      { title: 'Compara nivel a nivel', text: 'Parte suscripción y tema por las barras y compáralos en columna. Un nivel fijo debe coincidir exacto; <b>+</b> acepta cualquier valor en <b>ese</b> nivel; <b>#</b> acepta lo que quede, incluso nada. Si sobran o faltan niveles y no hay #, no encaja. Ejemplo: casa/+/luz frente a casa/cocina/techo/luz: sobra un nivel, no llega.', q: mcq('Suscripción huerto/+/humedad. ¿Qué tema le llega?', ['huerto/bancal3/humedad', 'huerto/humedad', 'huerto/bancal3/sonda/humedad', 'Huerto/bancal3/humedad'], 'Exactamente un nivel entre huerto y humedad, y en minúsculas.') }
    ] },
    io_qos: { name: 'Garantías de entrega en MQTT (QoS)', alts: [
      { title: 'Correo ordinario, certificado y notarial', text: '<b>QoS 0</b>: lo envías y te olvidas (como una postal). <b>QoS 1</b>: el receptor confirma; si no llega la confirmación, reenvías, así que puede llegar dos veces. <b>QoS 2</b>: un intercambio de cuatro mensajes garantiza que llega exactamente una vez, a cambio de más tráfico y latencia. Cada suscriptor recibe con la <b>menor</b> entre la QoS de publicación y la de su suscripción.', q: mcq('Un contador de pulsos envía “+1” cada vez. ¿Qué QoS evita contar de más?', ['QoS 2', 'QoS 1', 'QoS 0', 'Da igual'], 'QoS 1 puede duplicar; mejor aún: envía el total acumulado, que es idempotente.') },
      { title: 'Elegir QoS con cabeza', text: 'Pregúntate qué pasa si el mensaje se pierde o llega dos veces. Telemetría frecuente: QoS 0, la siguiente lectura llega enseguida. Órdenes y alarmas: QoS 1, con un mensaje <b>idempotente</b> (un estado como “válvula abierta hasta las 10:05”, o un total acumulado) para que un duplicado no haga daño. QoS 2 cuesta cuatro mensajes por envío. Y recuerda: manda la menor QoS entre publicación y suscripción.', q: mcq('Un nodo publica cada minuto el total de litros consumidos desde su instalación. Un mensaje llega duplicado. ¿Problema?', ['Ninguno: es un total, repetirlo no cambia nada', 'Se cuentan los litros dos veces', 'El broker se bloquea', 'Se borra el retenido'], 'Enviar el estado, no el incremento, vuelve inofensivos los duplicados.') }
    ] },
    io_retain: { name: 'Mensajes retenidos', alts: [
      { title: 'El último valor, guardado', text: 'Un mensaje <b>retenido</b> se queda en el broker como último valor de su tema: quien se suscriba más tarde lo recibe al instante, aunque hayan pasado horas. Solo hay uno por tema: un retenido nuevo lo sustituye y uno con la carga <b>vacía</b> lo borra.', q: mcq('Un panel arranca y quiere ver al momento el último estado de la puerta, aunque no haya cambiado en horas. ¿Qué necesita?', ['Que el estado se publique como retenido', 'QoS 2', 'Un último testamento', 'Un keepalive más corto'], 'El retenido se entrega al suscribirse.') },
      { title: 'Estados sí, eventos no', text: 'Retén lo que describe cómo está algo ahora (la puerta está cerrada, la persiana al 40 %), no lo que pasó una vez (han llamado al timbre). Un evento retenido se entrega a cada suscriptor nuevo: el móvil “oiría el timbre” cada vez que abres la app.', q: mcq('¿Qué NO publicarías como retenido?', ['“Se ha pulsado el botón de emergencia”', '“La calefacción está encendida”', '“El nodo está online”', '“La persiana está al 40 %”'], 'Es un evento: se repetiría a cada suscriptor nuevo.') }
    ] },
    io_lwt: { name: 'Desconexiones: testamento, keepalive y sesión', alts: [
      { title: 'Una carta para cuando faltes', text: 'Al conectar, el cliente deja al broker un <b>último testamento</b>: tema, mensaje y si es retenido. Si desaparece sin despedirse (corte, cuelgue), el broker lo publica; si se despide con DISCONNECT, no. Lo da por desaparecido cuando pasa 1,5 veces el <b>keepalive</b> sin oírle. Patrón típico: testamento “offline” retenido y, nada más conectar, “online” retenido. Una sesión persistente, además, guarda las órdenes QoS 1 que lleguen mientras está fuera.', q: mcq('Keepalive de 20 s y el nodo pierde la alimentación. ¿Cuánto tarda como mucho el broker en publicar su testamento?', ['30 s', '20 s', '40 s', 'Nunca'], '1,5 × 20 s.') },
      { title: 'Lo que el broker guarda mientras no estás', text: 'Con una <b>sesión persistente</b> (el mismo ID de cliente y sin empezar limpio), el broker recuerda tus suscripciones y te guarda los mensajes QoS 1 y 2 que lleguen mientras estás desconectado: un actuador que se reinicia recibe al volver la orden pendiente. Sin sesión, eso se pierde. Y ojo: si te despides con disconnect(), el broker no publica tu testamento.', q: mcq('Un nodo usa un ID de cliente aleatorio en cada arranque. ¿Recibe las órdenes QoS 1 enviadas durante su reinicio?', ['No: para el broker es otro cliente, sin sesión', 'Sí, siempre', 'Sí, si el tema es retenido', 'Solo con un keepalive largo'], 'La sesión va ligada al ID de cliente.') }
    ] },
    io_mosquitto: { name: 'Mosquitto: listener, usuarios y ACL', alts: [
      { title: 'Cerrado por defecto', text: 'Mosquitto 2 sin configurar solo escucha en el propio equipo. Para la red: <b>listener 1883</b> (o 8883 con TLS), <b>allow_anonymous false</b>, un <b>password_file</b> creado con mosquitto_passwd y un <b>acl_file</b> con lo que puede leer y escribir cada usuario. Para comprobar que llega todo: mosquitto_sub -v -t "casa/#" con tu usuario.', q: mcq('Has creado usuarios, pero todavía se conecta cualquiera sin contraseña. ¿Qué falta?', ['allow_anonymous false', 'Un listener en el 8883', 'Subir el keepalive', 'Un mensaje retenido'], 'Sin eso, los anónimos siguen entrando.') },
      { title: 'Leer una ACL', text: 'Cada línea dice quién puede qué. “user panel” seguido de “topic read casa/#” deja al panel leer toda la casa. “pattern write casa/%u/#” deja a cada usuario escribir solo bajo su propio nombre (%u se sustituye por el usuario). Lo que no está permitido, el broker lo descarta. Así un nodo comprometido no manda en toda la casa.', q: mcq('Con pattern write casa/%u/#, el usuario “garaje” publica en casa/salon/luz. ¿Qué pasa?', ['El broker lo descarta', 'Se entrega a todos', 'Se entrega solo al panel', 'El broker se cae'], 'garaje solo puede escribir bajo casa/garaje/.') }
    ] },
    /* --- m5: datos --- */
    io_sampling: { name: 'Frecuencia de muestreo y aliasing', alts: [
      { title: 'Fotos de una peonza', text: 'Muestrear es hacer fotos de una señal. Si haces menos de dos fotos por vuelta, la peonza parece girar despacio o al revés: es el <b>aliasing</b>. Regla: muestrea a más del doble de la frecuencia más rápida que te interese (Nyquist) y, en la práctica, de 5 a 10 veces más.', q: mcq('Quieres medir una vibración de 100 Hz. ¿Muestreo mínimo teórico?', ['Más de 200 Hz', '100 Hz', '50 Hz', '1 Hz'], 'Más del doble de la frecuencia máxima.') },
      { title: 'El ritmo según lo que cambia', text: 'Pregunta cuánto tarda en cambiar lo que mides. Una habitación: cada pocos minutos. Un suelo: cada 15–60 minutos. La corriente de 50 Hz: miles de muestras por segundo un instante. Una puerta: por evento. Si un horno hace ciclos de 4 minutos y mides cada 10, ves valores sin sentido o una oscilación lenta que no existe: menos de dos muestras por ciclo.', q: mcq('Un motor gira a 25 vueltas por segundo y quieres ver cada vuelta. ¿Muestreo mínimo teórico?', ['Más de 50 Hz', '25 Hz', '12,5 Hz', '1 Hz'], 'Más del doble de 25 Hz.') }
    ] },
    io_report: { name: 'Qué enviar: resúmenes, cambios y latido', alts: [
      { title: 'Medir rápido, enviar despacio', text: 'Medir es barato; transmitir, caro. El nodo listo muestrea a menudo y envía un <b>resumen</b> (media, máximo, valor eficaz) cada pocos minutos. O envía <b>por cambio</b>: solo si el valor se mueve más de un delta (como el filtro delta de ESPHome). Y siempre un <b>latido</b> periódico, para distinguir “estable” de “muerto”.', q: mcq('Un nodo solo publica si la humedad cambia un 2 % y lleva 6 horas callado. ¿Qué no puedes saber sin latido?', ['Si la humedad está estable o el nodo ha muerto', 'El tema en que publica', 'Su ID de cliente', 'La dirección del broker'], 'Sin latido, el silencio es ambiguo.') },
      { title: 'El cartero que no sube por nada', text: 'Imagina que cada envío obliga al cartero a subir cinco pisos. No le llamas por cada décima: le das un sobre con el resumen, o le avisas solo si hay novedad (delta). Pero si pasa una semana sin cartas, ¿estás de vacaciones o te ha pasado algo? Para eso, una postal fija cada cierto tiempo: el latido.', q: mcq('En ESPHome, ¿qué hace este filtro en un sensor de temperatura?', ['Solo envía cuando el valor cambia al menos 0,5 respecto al último enviado', 'Suma 0,5 a cada lectura', 'Envía cada 0,5 s', 'Redondea a 0,5'], 'Envío por cambio.', { code: '- delta: 0.5' }) }
    ] },
    io_calib: { name: 'Exactitud y calibración', alts: [
      { title: 'Una báscula de baño', text: 'Una báscula puede mostrar décimas (<b>resolución</b>), repetir siempre lo mismo (<b>precisión</b>) y aun así marcar 1 kg de más (falta de <b>exactitud</b>). Más bits en un ADC dan más resolución, no más exactitud: el ruido y la falta de linealidad se comen bits. La calibración corrige la exactitud comparando con referencias conocidas: hielo para un termómetro; aire y agua para un sensor de humedad de suelo, comprobando luego en tu tierra.', q: mcq('Un sensor da siempre 25,3 °C en un baño a 25,0 °C. ¿Qué le pasa?', ['Es preciso pero inexacto: se corrige con un desplazamiento de −0,3 °C', 'Es exacto pero impreciso', 'Le falta resolución', 'Está roto'], 'Repite (precisión) pero se desvía (exactitud).') },
      { title: 'La recta en números', text: 'Con un punto corriges el desplazamiento: corrección = referencia − leído (si a 0 °C lee 0,6, sumas −0,6). Con dos puntos corriges también la ganancia: real = a · leído + b, con a = (real₂ − real₁) / (leído₂ − leído₁) y b = real₁ − a · leído₁. Ejemplo: lee 10 a 0 °C y 60 a 100 °C → a = 100 / 50 = 2 y b = −20.', q: mcq('Un sensor lee 5 a 0 °C reales y 45 a 20 °C reales. ¿Pendiente a?', ['0,5', '2', '0,25', '4'], '(20 − 0) / (45 − 5) = 20 / 40 = 0,5.') }
    ] },
    io_filter: { name: 'Filtrar el ruido: media, mediana y exponencial', alts: [
      { title: 'Promediar cuesta tiempo', text: 'Una media de N muestras reduce el ruido aleatorio unas √N veces, pero reacciona tarde: tarda N muestras en reflejar del todo un cambio. La <b>mediana</b> elimina picos aislados sin emborronar tanto los escalones. El filtro <b>exponencial</b> (y += α·(x − y)) gasta una sola variable; arráncalo con la primera lectura, no con 0.', tune: { viz: 'io_mavg', params: { N: { label: 'Ventana', val: 4, min: 1, max: 32, step: 1, dec: 0 }, R: { label: 'Ruido', val: 0.6, min: 0, max: 1, step: 0.05, dec: 2 } } }, q: mcq('Pasas de una media de 4 muestras a una de 16. El ruido aleatorio…', ['Se reduce a la mitad, y el retardo se multiplica por 4', 'Se reduce a la cuarta parte sin retardo', 'No cambia', 'Aumenta'], '√16 / √4 = 2.') },
      { title: 'Cuentas a mano', text: 'Con 20, 22, 90, 21 y 22: la <b>media</b> suma y divide (175 / 5 = 35): el pico la arrastra. La <b>mediana</b> ordena (20, 21, 22, 22, 90) y toma la del centro: 22; el pico desaparece. El <b>exponencial</b> con α = 0,25, valor 20 y lectura 24: 20 + 0,25 × 4 = 21.', q: mcq('Exponencial con α = 0,5. Valor filtrado 10; llega una lectura de 14. ¿Nuevo valor?', ['12', '14', '10,5', '24'], '10 + 0,5 × (14 − 10) = 12.') },
      { title: 'Elegir filtro por síntoma', text: '¿Ruido fino y constante? Media móvil: lo baja √N veces, a cambio de N muestras de retardo. ¿Lecturas locas aisladas (un eco perdido, una interferencia)? Mediana de 3 o 5. ¿Poca memoria? Exponencial: una sola variable. ¿No puedes permitirte ningún retardo? Sin filtro.', q: mcq('Un sensor de distancia da 120, 121, 0, 120 cm: de vez en cuando un 0 sin sentido. ¿Qué filtro?', ['Mediana de 5', 'Media de 50', 'Ninguno', 'Exponencial con α = 0,99'], 'Contra picos aislados, mediana.') }
    ] },
    io_time: { name: 'La hora en los datos: NTP, UTC y marcas de tiempo', alts: [
      { title: 'Un reloj que se desvía', text: 'El ESP32 no tiene reloj con pila: al arrancar no sabe la hora. La pide por <b>NTP</b> y la mantiene con su reloj interno, que se desvía (en deep sleep, más): resincroniza cada pocas horas. Guarda las marcas en <b>UTC</b> y convierte a hora local solo al mostrar, con una regla de zona como CET-1CEST,M3.5.0,M10.5.0/3 (península: +1 en invierno, +2 en verano, cambios el último domingo de marzo y de octubre).', q: mcq('El último domingo de octubre, ¿qué problema tiene guardar las marcas en hora local?', ['La hora entre las 2:00 y las 3:00 existe dos veces y las lecturas se mezclan', 'Ese día no hay hora', 'NTP no funciona ese día', 'Ninguno'], 'En UTC no hay horas repetidas.') },
      { title: 'Quién pone el sello', text: 'Si el nodo envía al momento, el servidor puede sellar la hora de llegada. Si guarda lecturas durante un corte y las envía después, cada una debe llevar su propia hora de medida; si no, todas parecerían del mismo instante. Por eso el nodo debe estar en hora (NTP) antes de encolar lo que mide.', q: mcq('Un nodo guarda 12 lecturas, una cada 5 minutos, y las envía juntas; el servidor sella la llegada. ¿Qué verás en la gráfica?', ['Las 12 en el mismo instante', 'Las 12 bien repartidas', 'Ninguna', 'Solo la última'], 'Cada lectura encolada debe llevar su hora de medida.') }
    ] },
    io_tsdb: { name: 'Series temporales: etiquetas, campos y retención', alts: [
      { title: 'Etiquetas para buscar, campos para medir', text: 'En InfluxDB, las <b>etiquetas</b> identifican la serie (qué nodo, qué sala) y sirven para filtrar y agrupar; los <b>campos</b> son los valores medidos. Regla: etiquetas con pocos valores posibles. Si metes en una etiqueta algo que cambia siempre (un ID de mensaje), cada punto crea una serie nueva: la <b>cardinalidad</b> se dispara y con ella la memoria.', q: mcq('¿Qué guardarías como etiqueta?', ['La sala donde está el nodo', 'La temperatura medida', 'La tensión de la batería', 'La humedad'], 'Identifica la serie y tiene pocos valores.') },
      { title: 'La tubería y el zoom', text: 'Tubería típica: el nodo publica por MQTT; Telegraf o Node-RED se suscriben y escriben en la base de datos; Grafana la consulta. Para no hincharse: crudos unos días o semanas y medias horarias para siempre. Al dibujar un mes, Grafana agrupa por intervalos según el zoom en vez de pintar cada punto. Si prefieres SQL, PostgreSQL con TimescaleDB hace el mismo papel.', q: mcq('En la tubería nodo → MQTT → ? → InfluxDB → Grafana, ¿qué falta?', ['Telegraf o Node-RED, suscritos al tema', 'Otro broker', 'El router', 'Un webhook a la nube'], 'Alguien debe pasar los mensajes de MQTT a la base de datos.') }
    ] },
    io_automation: { name: 'Automatizar: disparador, condición y acción', alts: [
      { title: 'Tres preguntas', text: 'Toda automatización responde: ¿cuándo me evalúo? (<b>disparador</b>: el CO₂ supera 1000 ppm), ¿se cumple todo? (<b>condiciones</b>: hay alguien en casa) y ¿qué hago? (<b>acciones</b>: avisar). En Node-RED es igual, con nodos: entrada MQTT, convertir el JSON, decidir con switch, limitar la frecuencia y actuar. Home Assistant lo hace con sus automatizaciones, en local.', q: mcq('“Cuando se abra la puerta, si es de noche, enciende la luz del pasillo.” ¿Qué es “si es de noche”?', ['La condición', 'El disparador', 'La acción', 'La entidad'], 'Se comprueba cuando el disparador salta.') },
      { title: 'Automatizar sin hacer daño', text: 'Dos defensas. Limita los avisos (por ejemplo, uno cada 30 min como mucho): si llega uno por lectura, acabarás ignorándolos. Y antes de actuar, valida la entrada: ¿el dato es reciente? ¿Es plausible? Un sensor colgado marcando 10 °C no debe tener la calefacción encendida toda la noche.', q: mcq('Una automatización riega si la humedad del suelo baja del 30 %. El sensor deja de enviar y su último valor fue 12 %. ¿Qué evita regar sin fin?', ['Exigir que el dato sea reciente antes de actuar', 'Subir el QoS', 'Más decimales', 'Un retenido'], 'Dato viejo: no actúes, y avisa.') }
    ] },
    io_anomaly: { name: 'Detectar anomalías sencillas', alts: [
      { title: 'Cinco detectores', text: '<b>Umbral</b>: valor fuera de rango. <b>Velocidad de cambio</b>: sube demasiado deprisa, aunque aún esté en rango (avisa antes). <b>Valor congelado</b>: exactamente el mismo durante horas. <b>Silencio</b>: no llegan datos; espera 2 o 3 periodos antes de avisar. <b>Estadística</b>: más de 3 desviaciones típicas de la media reciente.', q: mcq('Un nodo envía cada 10 minutos. ¿Cuándo das la alarma de silencio?', ['Tras 20–30 minutos sin datos', 'Al minuto', 'Tras un mes', 'Nunca'], '2 o 3 periodos: margen para pérdidas sueltas.') },
      { title: 'Las 3 sigmas en números', text: 'Si una temperatura tiene media 20 °C y desviación típica 0,4 °C, lo normal está entre 20 − 3 × 0,4 = 18,8 y 20 + 3 × 0,4 = 21,2 °C; fuera de ahí, sospecha. Pero la estadística no lo ve todo: un nodo muerto no envía valores raros, simplemente calla, y un sensor colgado repite el mismo número.', q: mcq('Media 50 % de humedad y desviación típica 2 %. ¿Límite superior con 3σ?', ['56 %', '52 %', '53 %', '150 %'], '50 + 3 × 2.') }
    ] },
    /* --- m6: seguridad --- */
    io_security: { name: 'Modelo de amenazas', alts: [
      { title: 'Cuatro preguntas', text: 'Primero pregunta: ¿qué protejo? ¿De quién? ¿Qué puede salir mal? ¿Qué hago al respecto? Dibuja el sistema y sus flujos de datos, imagina fallos en cada uno, elige defensas para lo más grave y probable y revísalo cuando el sistema cambie. Ninguna capa es perfecta; juntas, sí cuestan mucho de saltar.', q: mcq('¿Cuál es la primera pregunta de un modelo de amenazas?', ['¿Qué quiero proteger?', '¿Qué cifrado es más moderno?', '¿Cuántos nodos tengo?', '¿Qué broker uso?'], 'Primero el qué; luego de quién, qué puede fallar y qué haces.') },
      { title: 'Probabilidad por impacto', text: 'Lista los riesgos y ponle a cada uno dos notas: lo probable que es y lo grave que sería. Atiende primero lo probable y grave (una contraseña de fábrica en un aparato expuesto), luego lo grave aunque improbable y deja lo leve para el final. Cada medida sirve a un principio: contener el daño, mínimo privilegio, integridad o menos superficie de ataque.', q: mcq('¿Qué riesgo atiendes antes?', ['Un broker accesible desde internet sin contraseña', 'Que un vecino vea el nombre de tu WiFi', 'Que alguien lea el chip con un microscopio electrónico', 'Que el LED de estado brille demasiado'], 'Muy probable y muy grave.') }
    ] },
    io_surface: { name: 'Superficie de ataque y claves de fábrica', alts: [
      { title: 'Menos puertas', text: 'La <b>superficie de ataque</b> es todo lo que un atacante puede tocar: puertos abiertos, servidores web, telnet, UPnP, WPS, la OTA, la nube del fabricante. Cada cosa que apagas es una puerta menos que defender. Telnet (puerto 23) va sin cifrar y es una entrada clásica: ciérralo.', q: mcq('¿Qué reduce la superficie de ataque de tu router?', ['Desactivar UPnP y WPS si no los usas', 'Activar más servicios', 'Abrir la administración a internet', 'Poner un nombre de red más largo'], 'Lo que no usas, apagado.') },
      { title: 'El atacante es un robot', text: 'El atacante más probable no es un espía, sino un programa que barre internet probando contraseñas de fábrica y fallos conocidos, como hizo Mirai en 2016 con cámaras y grabadores por telnet. Lo frena algo aburrido: contraseña única, servicios innecesarios cerrados, nada expuesto a internet y firmware al día.', q: mcq('Una cámara con la contraseña de fábrica no está expuesta a internet. ¿Qué haces igualmente?', ['Cambiarla por una contraseña única', 'Nada: sin exposición no hay riesgo', 'Abrir su puerto para probarla', 'Subir la resolución'], 'Si algo de tu red cae, será lo siguiente.') }
    ] },
    io_secrets: { name: 'Credenciales: fuera del código, por nodo y revocables', alts: [
      { title: 'Una llave por puerta', text: 'Una clave escrita en el código acaba en un repositorio, una captura o un binario compartido; y si se publica, aunque la borres, sigue en el historial: cámbiala. Mejor credenciales en la <b>NVS</b> (Preferences), metidas al aprovisionar, y <b>una por nodo</b>. Así el mismo firmware sirve para todos y, si roban un nodo, revocas solo su llave y el ladrón, como mucho, llega a la red IoT aislada.', q: mcq('Te roban un nodo que compartía usuario y clave del broker con otros cinco. ¿Qué toca?', ['Cambiar esa clave en el broker y en los cinco nodos que quedan', 'Nada', 'Solo cambiar el canal WiFi', 'Solo reiniciar el broker'], 'Con una credencial por nodo, bastaría con revocar la del robado.') },
      { title: 'Lo que protege cada capa', text: '<b>.gitignore</b> evita que secrets.h llegue al repositorio. La <b>NVS</b> separa el programa de su configuración, pero no está cifrada: quien tenga el chip puede volcarla. El <b>cifrado de flash</b> protege lo guardado frente a quien tiene el chip (es irreversible: practica con una placa de sobra). Y el <b>portal cautivo</b> de configuración, con contraseña y que se apague tras configurar.', q: mcq('Alguien vuelca la flash de un nodo robado. ¿Qué le impide leer la clave del WiFi?', ['El cifrado de flash', 'TLS', 'Un .gitignore', 'QoS 1'], 'TLS protege lo que viaja; el cifrado de flash, lo guardado.') }
    ] },
    io_tls: { name: 'TLS: qué protege y qué no', alts: [
      { title: 'Qué protege TLS', text: 'TLS cifra y autentica el <b>camino</b>: nadie en medio puede leer ni alterar los mensajes y, si verificas el certificado, sabes que hablas con tu broker. Sin TLS, una cabecera Authorization o una clave viajan en claro. Lo que no protege: los extremos (un broker que admite anónimos sigue abierto), los metadatos (quién habla con quién, cuándo y cuánto) y lo que el servidor haga con tus datos.', q: mcq('Un nodo usa setInsecure() para conectar por TLS. ¿Qué pierde?', ['La verificación del servidor: alguien en medio podría hacerse pasar por el broker', 'El cifrado', 'La compresión', 'Nada'], 'Sigue cifrando, pero no sabe con quién habla.') },
      { title: 'Notario, sello y llave', text: 'La <b>CA</b> es un notario: firma el certificado del broker, que lleva su clave pública y sus nombres e IP válidos (<b>subjectAltName</b>). El nodo guarda el certificado de la CA (setCACert) y con él comprueba que habla con tu broker y con el nombre que usa. La <b>clave privada</b> del broker no sale nunca del broker. Para identificar al cliente hace falta contraseña o TLS mutuo.', q: mcq('¿Qué pones en el ESP32 para que verifique tu broker con CA propia?', ['El certificado de la CA', 'La clave privada del broker', 'La clave privada de la CA', 'Nada: basta con setInsecure()'], 'Al nodo solo va lo público.') }
    ] },
    io_segment: { name: 'Red separada y mínimo privilegio', alts: [
      { title: 'Compartimentos estancos', text: 'Un barco tiene compartimentos para que una vía de agua no lo hunda. Tu red, igual: los cacharros IoT en su propia red (invitados aislada o VLAN), que solo puede hablar con el broker y lo imprescindible. Si una bombilla barata cae, no ve tus ordenadores. Y dentro de casa también se autentica: una ruta /abrir sin contraseña la puede usar cualquier aparato comprometido de tu red.', q: mcq('¿Qué regla de cortafuegos es la más restrictiva para la red IoT?', ['Solo puede hablar con el broker local', 'Puede salir a todo internet', 'Puede abrir conexiones hacia la red principal', 'Sin reglas'], 'Lo mínimo que necesita para funcionar.') },
      { title: 'Cada uno, solo su llave', text: '<b>Mínimo privilegio</b>: cada pieza con el permiso justo. Cada nodo, un usuario del broker que solo escribe en sus temas; Grafana, un token de solo lectura sobre el bucket que dibuja; Telegraf, uno que solo escribe. Si una credencial se filtra, el daño se queda pequeño.', q: mcq('¿Qué permiso le das a Telegraf en InfluxDB?', ['Solo escritura en el bucket donde guarda', 'Administrador', 'Lectura y borrado de todo', 'Ninguno, sin autenticación'], 'Hace una cosa: escribir.') }
    ] },
    io_ota: { name: 'OTA segura: firma y vuelta atrás', alts: [
      { title: 'Dos particiones', text: 'La flash tiene dos particiones de aplicación. La versión nueva se escribe en la libre, se arranca desde ella y solo se <b>confirma</b> tras una autocomprobación (WiFi, broker, sensores). Si se cuelga o no se confirma, el cargador de arranque vuelve a la anterior. Nunca te quedas sin una versión que funcione.', q: mcq('Una OTA arranca, pero no conecta al broker y no se confirma. ¿Qué pasa tras el reinicio?', ['Vuelve la versión anterior', 'El nodo queda inservible', 'Se borra la NVS', 'Se vuelve a instalar sola'], 'Sin confirmación, vuelta atrás.') },
      { title: 'Solo lo que lleva tu firma', text: 'Antes de instalar, el nodo verifica la <b>firma</b> de la imagen con tu clave pública: si alguien intenta meterle un firmware suyo, lo rechaza. Orden seguro: descargar por HTTPS, verificar la firma o el hash, escribir en la partición libre, reiniciar desde ella, autocomprobar y confirmar.', q: mcq('¿Qué paso va justo después de descargar la imagen?', ['Verificar su firma o su hash', 'Reiniciar', 'Confirmar la versión', 'Borrar la partición actual'], 'No escribas nada que no hayas comprobado.') }
    ] },
    /* --- m7: energía y fiabilidad --- */
    io_duty: { name: 'Consumo medio y duración de la batería', alts: [
      { title: 'La media ponderada', text: 'Un nodo que duerme y despierta tiene un consumo medio: <b>Imedia = (Idesp · tdesp + Idorm · tdorm) / T</b>. Si duerme casi siempre, lo que gasta dormido puede pesar más que los picos al despertar. Por eso importa tanto la corriente de reposo de la placa.', tune: { viz: 'io_sleep', params: { Ia: { label: 'Corriente despierto', val: 120, min: 20, max: 250, step: 5, unit: 'mA', dec: 0 }, ta: { label: 'Tiempo despierto', val: 3, min: 0.2, max: 10, step: 0.1, unit: 's', dec: 1 }, Is: { label: 'Corriente dormido', val: 150, list: [5, 10, 25, 50, 150, 1000, 5000], unit: 'µA', dec: 0 }, T: { label: 'Periodo', val: 300, list: [10, 30, 60, 300, 600, 900, 1800, 3600], unit: 's', dec: 0 }, C: { val: 2500, fixed: true } } }, q: mcq('100 mA durante 1 s cada 100 s y nada el resto. ¿Media?', ['1 mA', '100 mA', '10 mA', '0,1 mA'], '100 × 1 / 100.') },
      { title: 'Carga en mA·s', text: 'Cuenta “cubos de carga” por ciclo: despierto gasta Idesp × tdesp; dormido, Idorm × tdorm. Suma, divide entre el periodo y tendrás la media; divide la capacidad de la batería entre esa media y tendrás horas (entre 24, días).', q: mcq('Despierto: 150 mA × 2 s = 300 mA·s. Dormido: 0,01 mA × 298 s ≈ 3 mA·s. Periodo 300 s. ¿Media?', ['Unos 1,01 mA', '150 mA', '0,01 mA', '3 mA'], '303 / 300 ≈ 1,01 mA.') },
      { title: 'La trampa de la placa', text: 'Con el chip dormido a 10 µA, una DevKit puede seguir gastando varios mA en su regulador, su chip USB-serie y su LED. Esa corriente se suma siempre: 2500 mAh / 8 mA ≈ 312 h ≈ 13 días, aunque no despierte nunca. Duración = capacidad / corriente media.', q: mcq('Una placa dormida gasta 2 mA y tienes 2000 mAh. ¿Cuánto dura sin despertar?', ['Unos 42 días', 'Unos 2 años', '1000 días', '2 días'], '2000 / 2 = 1000 h ≈ 42 días.') }
    ] },
    io_deepsleep: { name: 'Deep sleep y memoria: qué sobrevive', alts: [
      { title: 'Despertar con amnesia', text: 'En deep sleep se apaga casi todo: al despertar, el programa empieza otra vez en setup() y la RAM normal se ha perdido. Sobrevive la memoria <b>RTC</b> (variables con RTC_DATA_ATTR, unos 8 kB) y, claro, la flash. Para despertar con un pulsador hace falta un GPIO del dominio RTC (ext0 o ext1).', q: mcq('Una variable int contador = 0; sin RTC_DATA_ATTR se incrementa en cada despertar. Tras tres despertares, ¿cuánto vale al empezar setup()?', ['0', '3', '2', 'Un valor aleatorio'], 'La RAM normal se borra en cada deep sleep.') },
      { title: 'Tres cajones', text: '<b>RAM normal</b>: rápida, pero se vacía al dormir. <b>Memoria RTC</b>: pequeña, sobrevive al deep sleep (no a un corte de alimentación). <b>Flash</b> (NVS, LittleFS): sobrevive a todo, pero cada sector aguanta un número limitado de borrados: no escribas a cada pulso; acumula en RTC y guarda en flash de vez en cuando.', q: mcq('Debes contar los pulsos de un contador de agua con el nodo durmiendo entre pulsos. ¿Dónde acumulas?', ['En memoria RTC, y a flash solo de vez en cuando', 'En la flash a cada pulso', 'En una variable normal', 'En el broker'], 'La RTC sobrevive al sueño; la flash se desgasta.') }
    ] },
    io_battery: { name: 'Baterías para un nodo', alts: [
      { title: 'Ficha de cada química', text: '<b>Li-ion/LiPo</b> (3,0–4,2 V): mucha energía; necesita protección, cargador adecuado y regulador. <b>LiFePO4</b> (unos 3,2 V): alimenta el ESP32 casi directamente y es más estable. <b>Alcalinas</b>: baratas, sin recarga, sufren con los picos. <b>Supercondensador</b>: ciclos casi infinitos, poca energía.', q: mcq('Quieres alimentar un ESP32 sin regulador y con una química estable. ¿Cuál?', ['LiFePO4', 'Li-ion de 4,2 V', 'Dos alcalinas AA', 'Una pila de 9 V'], 'Su tensión está cerca de los 3,3 V.') },
      { title: 'Cuidar el litio y no fiarse de la tensión', text: 'El litio no se carga por debajo de 0 °C ni se deja a temperaturas altas (una caja al sol puede pasar de 60 °C): se daña y puede incendiarse. Usa siempre protección. Y no confíes en la tensión para saber la carga exacta: su curva es plana en la zona media y la tensión cambia con la corriente; en LiFePO4, aún más plana.', q: mcq('Un nodo solar en la montaña, en invierno. ¿Qué debe hacer su cargador de litio?', ['No cargar por debajo de 0 °C', 'Cargar más rápido con el frío', 'Cargar siempre a tope', 'Nada especial'], 'Cargar litio bajo cero lo daña.') }
    ] },
    io_supply: { name: 'Regulador: picos del WiFi y consumo en reposo', alts: [
      { title: 'Los dos números del regulador', text: 'Al transmitir, el ESP32 pide de golpe 200–400 mA durante milisegundos. Si el regulador o la batería no los dan, la tensión cae, salta el detector de caída de tensión (<b>brownout</b>) y el nodo se reinicia justo al conectar. Arreglo: LDO de al menos 500 mA, condensador de 100–470 µF junto al módulo y cables cortos. El otro número es la <b>corriente propia</b> del LDO: con el nodo dormido, se suma siempre.', q: mcq('Un nodo va bien con el WiFi apagado, pero se reinicia al conectar y esp_reset_reason() dice brownout. ¿Qué pruebas primero?', ['Un condensador grande junto al módulo y un regulador más capaz', 'Cambiar el broker', 'Bajar el QoS', 'Cambiar la máscara'], 'Los picos de la radio hunden la tensión.') },
      { title: 'El que gasta cuando nadie mira', text: 'Un nodo que duerme a 10 µA con un LDO que gasta 5 mA él solo consume en total más de 5 mA: manda el regulador y la batería dura días en vez de años. Elige el LDO por su caída (dropout), por la corriente que aguanta y por su corriente de reposo, que en los buenos es de pocos µA.', q: mcq('Nodo dormido a 15 µA y LDO con 50 µA de reposo. ¿Consumo total dormido?', ['65 µA', '15 µA', '50 µA', '35 µA'], 'Se suman: el LDO gasta siempre.') }
    ] },
    io_energy: { name: 'Energía en Wh: panel y consumo', alts: [
      { title: 'Potencia por horas', text: 'Energía = potencia × tiempo. Un panel de P vatios con H horas de sol pico da P × H Wh, menos pérdidas (si son del 30 %, multiplica por 0,7). Un nodo que gasta I amperios a V voltios todo el día usa I × V × 24 Wh. Compara las dos cifras en el peor mes.', q: mcq('Panel de 2 W, 3 horas de sol pico y 25 % de pérdidas. ¿Wh útiles al día?', ['4,5 Wh', '6 Wh', '1,5 Wh', '8 Wh'], '2 × 3 × 0,75.') },
      { title: 'Ojo con los miliamperios', text: 'El error típico es mezclar unidades. 0,5 mA son 0,0005 A; por 3,7 V, 0,00185 W; por 24 h, unos 0,044 Wh al día. Pasa siempre a amperios, voltios y horas antes de multiplicar.', q: mcq('Un nodo gasta 2 mA de media a 3,3 V. ¿Energía al día?', ['Unos 0,16 Wh', 'Unos 158 Wh', '6,6 Wh', '0,0066 Wh'], '0,002 × 3,3 × 24 ≈ 0,158 Wh.') }
    ] },
    io_retry: { name: 'Espera exponencial al reconectar', alts: [
      { title: 'No llamar a la puerta sin parar', text: 'Si el router se reinicia y cien nodos reintentan cada 100 ms a la vez, lo saturan justo cuando arranca. La <b>espera exponencial</b> dobla el tiempo entre intentos (1, 2, 4, 8 s… hasta un tope) y el <b>azar</b> (jitter) evita que todos lo hagan en el mismo instante.', tune: { viz: 'io_backoff', params: { base: { label: 'Espera inicial', val: 1, min: 0.5, max: 5, step: 0.5, unit: 's', dec: 1 }, cap: { label: 'Tope', val: 60, list: [5, 10, 30, 60, 120, 300], unit: 's', dec: 0 }, J: { label: 'Azar (jitter)', val: 0, min: 0, max: 50, step: 5, unit: '%', dec: 0 } } }, q: mcq('¿Para qué sirve añadir un poco de azar a la espera?', ['Para que los nodos no reintenten todos en el mismo instante', 'Para gastar menos memoria', 'Para cifrar', 'Para reducir el tope'], 'Desincroniza a los nodos.') },
      { title: 'Las cuentas de la espera', text: 'Espera = mín(base × 2^(fallos − 1), tope). Con base 1 s y tope 60 s: 1, 2, 4, 8, 16, 32, 60, 60… El tope evita que, tras muchos fallos, el nodo tarde horas en enterarse de que la red volvió; al conectar, la espera vuelve a la base. Y por capas: primero el WiFi, luego el broker, cada uno con su reintento.', q: mcq('Base 2 s y tope 30 s. ¿Cuánto espera tras el quinto fallo seguido?', ['30 s', '32 s', '10 s', '16 s'], '2 × 2⁴ = 32 s, que supera el tope: 30 s.') }
    ] },
    io_queue: { name: 'Cola local cuando no hay red', alts: [
      { title: 'Búfer circular', text: 'Sin red, el nodo guarda cada lectura con su marca de tiempo en una cola. Tamaño necesario = lecturas durante el corte × bytes por lectura (12 bytes cada 30 s durante 24 h: 2880 × 12 = 34 560 bytes). Si se llena, lo normal es descartar las más viejas (o resumirlas). Al volver la red, vacíala a ritmo controlado, no de golpe.', q: mcq('Lecturas de 8 bytes cada minuto. ¿Cuántos bytes para aguantar 12 h sin red?', ['5760 bytes', '96 bytes', '720 bytes', '480 bytes'], '720 lecturas × 8 bytes.') },
      { title: 'Una sala de espera', text: 'La cola es una sala de espera con sillas contadas. Si se llena, sale quien más lleva (el dato más viejo) para que entre el nuevo: lo reciente suele valer más. Y cuando abre la ventanilla no entran 2000 de golpe: pasan de pocos en pocos para no saturar el broker ni el búfer.', q: mcq('Al volver la red tienes 1500 lecturas encoladas. ¿Cómo las envías?', ['Por tandas, a ritmo controlado', 'Todas en el mismo instante', 'Solo la primera', 'Las borras'], 'Vaciar la cola también, con educación.') }
    ] },
    io_wdt: { name: 'Watchdog y arranque seguro', alts: [
      { title: 'El pedal de hombre muerto', text: 'El watchdog es el pedal de hombre muerto de un tren: si el programa no le da una “patada” a tiempo, reinicia el chip. Solo sirve si la patada demuestra que el trabajo avanza: ponla tras completar cada vuelta de loop() o cada envío, nunca dentro de un bucle de espera que podría no acabar.', q: mcq('¿Dónde llamas a esp_task_wdt_reset()?', ['Al final de cada vuelta de trabajo completa', 'Dentro del while que espera al WiFi', 'En una interrupción de temporizador cada 100 ms', 'Nunca'], 'Si la patada no depende del avance, el perro no vigila nada.') },
      { title: 'Arrancar en lo seguro', text: 'Un nodo que se reinicia (por el watchdog, un corte o una OTA) no sabe en qué estaba. Por eso arranca siempre en el estado seguro: válvulas cerradas, motores parados, calefacción apagada, y espera a que su lógica vuelva a decidir con datos frescos.', q: mcq('Un nodo controla una resistencia calefactora y se reinicia. ¿Estado al arrancar?', ['Apagada hasta que la lógica decida', 'Encendida por si acaso', 'Al 50 %', 'Da igual'], 'Ante la duda, lo que no puede causar daño.') }
    ] },
    io_health: { name: 'Telemetría de salud del nodo', alts: [
      { title: 'El nodo habla de sí mismo', text: 'Además de sus sensores, el nodo debe informar de su salud: versión de firmware, tiempo encendido, motivo del último reinicio, memoria libre (y la mínima), RSSI, tensión de batería y reconexiones. Brownout → alimentación; RSSI bajo → radio; muchas reconexiones al broker → red inestable o ID duplicado.', q: mcq('El motivo del último reinicio de un nodo es “brownout” cada mañana. ¿Qué investigas?', ['La alimentación: batería, regulador o picos', 'La ACL del broker', 'El tema MQTT', 'El DNS'], 'Brownout = caída de tensión.') },
      { title: 'Mira la tendencia', text: 'Un dato suelto dice poco; la tendencia avisa antes del fallo. Si la memoria libre mínima baja un poco cada día, hay una fuga (String que crecen, reservas sin liberar) y el nodo acabará colgándose. Si el RSSI baja semana a semana, algo ha cambiado en el camino de la radio.', q: mcq('La memoria libre mínima pasa de 120 kB a 60 kB en un mes. ¿Qué esperas?', ['Un cuelgue cuando se agote: hay una fuga', 'Nada', 'Que vuelva sola a 120 kB', 'Mejor RSSI'], 'Las tendencias anuncian los fallos.') }
    ] },
    /* --- m8: plataformas y largo alcance --- */
    io_ha: { name: 'Home Assistant y ESPHome', alts: [
      { title: 'Las piezas de Home Assistant', text: 'Home Assistant corre en tu casa. Una <b>integración</b> conecta con un protocolo o una marca; un <b>dispositivo</b> es el aparato; cada dato o control es una <b>entidad</b>; las <b>automatizaciones</b> lo unen todo. ESPHome entra como integración: tus nodos aparecen solos, y un nodo ESPHome puede hacer de proxy Bluetooth para acercar sensores BLE lejanos.', q: mcq('Un sensor de temperatura y humedad aparece en Home Assistant. ¿Cuántas entidades aporta?', ['Dos: temperatura y humedad', 'Una', 'Ninguna', 'Tres dispositivos'], 'Un dispositivo, una entidad por dato.') },
      { title: 'Leer un YAML de ESPHome', text: 'El YAML de ESPHome describe el nodo: placa, WiFi, API, OTA y sensores. Las claves no van en él: van en secrets.yaml y se citan con !secret. update_interval dice cada cuánto mide y envía un sensor. Para sensores y actuadores típicos ahorra mucho código; si necesitas una lógica muy específica, programa tú (por ejemplo, con MQTT).', q: mcq('En un sensor de ESPHome, ¿qué indica update_interval: 30s?', ['Que mide y envía cada 30 s', 'Que reintenta el WiFi cada 30 s', 'Que la OTA dura 30 s', 'Que duerme 30 minutos'], 'Es el ritmo del sensor.') }
    ] },
    io_mesh: { name: 'Zigbee, Thread y Matter', alts: [
      { title: 'Una malla con papeles', text: 'En Zigbee, el <b>coordinador</b> crea la red y la conecta con tu servidor; los <b>routers</b> (equipos enchufados) repiten los mensajes; los <b>dispositivos finales</b> (a pila) duermen y cuelgan de un padre. Si un sensor lejano pierde la conexión, añade un router a medio camino. Un vínculo directo (binding) sigue funcionando aunque caiga el coordinador.', q: mcq('¿Qué equipo NO hace de router en una malla Zigbee?', ['Un sensor de puerta a pila', 'Un enchufe inteligente', 'Una bombilla', 'Un relé enchufado'], 'Los de pila duermen y no repiten.') },
      { title: 'Capas, no rivales', text: 'Zigbee y Thread usan la misma radio (IEEE 802.15.4) y forman mallas. Zigbee no habla IP y necesita coordinador; Thread lleva IPv6 y se une a tu red con un border router. <b>Matter</b> no es una radio: es un lenguaje común de aplicación que va sobre WiFi, Ethernet o Thread, con control local, y se pone en marcha por Bluetooth LE.', q: mcq('Un aparato “Matter sobre Thread”: ¿qué es cada cosa?', ['Matter es el lenguaje; Thread, la red de radio', 'Thread es el lenguaje; Matter, la radio', 'Son dos radios distintas', 'Son dos marcas del mismo chip'], 'Matter va por encima de la red.') }
    ] },
    io_lwnet: { name: 'Red LoRaWAN: pasarelas, servidor y claves', alts: [
      { title: 'Repetidores ciegos', text: 'Un nodo LoRaWAN no se asocia a una pasarela: transmite, y cualquier pasarela que lo oiga lo reenvía por IP al <b>servidor de red</b>, que quita duplicados y lo verifica; el servidor de aplicación lo descifra y lo entrega. La carga va cifrada con AES-128 y la clave de aplicación: la pasarela no puede leerla. Para una red sin internet: tu pasarela y ChirpStack en casa.', q: mcq('Tres pasarelas oyen el mismo mensaje. ¿Cuántas veces llega a tu aplicación?', ['Una', 'Tres', 'Ninguna', 'Depende del SF'], 'El servidor de red elimina los duplicados.') },
      { title: 'Unirse a la red', text: 'Con <b>OTAA</b>, el nodo guarda DevEUI, JoinEUI y una clave raíz (AppKey); al unirse negocia claves de sesión nuevas. Con <b>ABP</b>, las claves de sesión se graban a mano y no cambian, y los contadores de trama dan guerra al reiniciar. Por eso se recomienda OTAA.', q: mcq('Tras reiniciarse, un nodo ABP ve rechazados sus mensajes. ¿Causa típica?', ['Su contador de tramas volvió a 0 y el servidor los toma por repetidos', 'La pasarela lo bloquea por su SF', 'El JSON es demasiado largo', 'Ha caducado la CA'], 'Con OTAA, la unión nueva lo resuelve.') }
    ] },
    io_lwclass: { name: 'Clases LoRaWAN: A, B y C', alts: [
      { title: 'Cuándo escucha', text: '<b>Clase A</b>: solo escucha en dos ventanas cortas justo después de cada envío; una orden espera hasta la siguiente subida. <b>Clase B</b>: además, ventanas a horas programadas, sincronizadas con balizas. <b>Clase C</b>: escucha casi siempre; para equipos enchufados.', q: mcq('Un nodo de clase A envía cada hora. Le mandas una orden justo después de un envío. ¿Cuándo la recibe?', ['Tras su siguiente subida: casi una hora después', 'Al instante', 'Nunca', 'En un segundo'], 'En clase A, la bajada va pegada a la subida.') },
      { title: 'Buzón, cita y teléfono', text: 'La clase A es un buzón que solo miras al salir de casa: barato, pero lees tarde. La B es quedar a horas fijas. La C es el teléfono siempre encendido: respondes al momento, pero gastas sin parar. Sensor a pila: A. Válvula enchufada que debe obedecer ya: C.', q: mcq('Una sirena enchufada debe sonar en segundos cuando se lo ordenes por LoRaWAN. ¿Qué clase?', ['C', 'A', 'B', 'Cualquiera'], 'Escucha continua.') }
    ] },
    io_lora: { name: 'Tiempo en aire y ciclo de trabajo del 1 %', alts: [
      { title: 'Hablar despacio llega más lejos', text: 'Cada paso de SF (7 → 12) dobla la duración de cada símbolo: el paquete aguanta más ruido y llega más lejos, pero ocupa el aire el doble y gasta el doble de batería. Con SF12 un paquete corto pasa casi 1,5 s en el aire; con SF7, unos 60 ms. Y el aire está limitado (1 %, 36 s por hora): por eso <b>ADR</b> baja el SF cuando la señal sobra.', tune: { viz: 'io_duty', params: { SF: { label: 'Factor de dispersión (SF)', val: 9, list: [7, 8, 9, 10, 11, 12], dec: 0 }, PL: { label: 'Carga útil', val: 10, min: 1, max: 51, step: 1, unit: 'B', dec: 0 } } }, q: mcq('Pasas de SF9 a SF10 con el mismo mensaje. El tiempo en aire…', ['Casi se duplica', 'Baja a la mitad', 'No cambia', 'Se multiplica por 10'], 'Cada SF dobla la duración del símbolo.') },
      { title: 'El 1 % en números', text: 'En la sub-banda de 868,0–868,6 MHz cada equipo puede transmitir como mucho el 1 % del tiempo: 36 s por hora. Si un paquete dura T, tras enviarlo debes callar 99·T, y en una hora caben 36 s / T paquetes. Además, The Things Network pide no pasar de 30 s de aire al día por nodo. Como cada SF dobla T, bajar el SF multiplica los mensajes que caben.', q: mcq('Un paquete dura 0,5 s. ¿Cuánto debes esperar como mínimo para el siguiente?', ['49,5 s', '0,5 s', '5 s', '99 s'], '99 × 0,5 s.') }
    ] },
    io_cellular: { name: 'NB-IoT y LTE-M', alts: [
      { title: 'Dos primos celulares', text: '<b>LTE-M</b>: hasta cerca de 1 Mbit/s, movilidad y menos latencia (localizadores, cosas que se mueven). <b>NB-IoT</b>: decenas de kbit/s, equipos fijos y mejor penetración en sótanos (contadores). Los dos van con SIM, cuota y dependencia del operador; a cambio, no montas ni mantienes infraestructura.', q: mcq('Sensores de nivel en arquetas subterráneas de toda una ciudad. ¿Qué encaja?', ['NB-IoT', 'LTE-M', 'Bluetooth LE', 'WiFi'], 'Fijos, pocos datos y mucha penetración.') },
      { title: 'Dormir sin darse de baja', text: '<b>PSM</b> deja dormir al módulo horas o días sin perder el registro en la red: ideal para enviar una vez al día. <b>eDRX</b> alarga los intervalos en que escucha. Y piensa a largo plazo: si el operador apaga la red (como está pasando con 2G y 3G en Europa), el producto queda mudo; pregunta por su hoja de ruta.', q: mcq('Un contador envía una lectura cada 12 h y no recibe órdenes urgentes. ¿Qué modo usas?', ['PSM con un temporizador largo', 'Siempre conectado', 'eDRX de pocos segundos', 'Ninguno'], 'Dormir mucho sin volver a registrarse.') }
    ] }
  });

  /* ---------- conceptos: ajustes para el nuevo orden y una explicación para tocar en cada uno ---------- */
  // Conceptos nuevos, más estrechos
  Object.assign(CONCEPTS, {
    io_zbchan: { name: 'Canales Zigbee entre las redes WiFi', alts: [
      { title: 'Carriles estrechos entre carriles anchos', text: 'Una red WiFi de 2,4 GHz ocupa unos 20 MHz; un canal Zigbee, solo unos 2 MHz. Por eso caben canales Zigbee en los huecos entre redes WiFi. Con el WiFi en los canales 1, 6 y 11, los Zigbee 15, 20 y 25 quedan libres. Mueve el canal Zigbee y mira cuándo cae dentro de una red:', tune: { viz: 'io_wifich', params: PP.wifich({ ch: FX(6), zb: SL('Canal Zigbee', 17, 11, 26, 1) }) }, q: mcq('El WiFi de casa está en el canal 11 y no hay más redes. ¿Qué canal Zigbee lo evita?', ['15', '21', '22', '23'], 'El 21, el 22 y el 23 caen dentro del canal WiFi 11 (de 2452 a 2472 MHz); el 15 está en 2425 MHz.') },
      { title: 'Cuenta en MHz', text: 'Canal WiFi n: centro en 2407 + 5·n MHz y unos ±10 MHz de ancho. Canal Zigbee k: centro en 2405 + 5·(k − 11) MHz. El Zigbee está libre si su centro queda a más de unos 11 MHz del centro de cada red WiFi. Ejemplo: WiFi 6 = 2437 MHz; Zigbee 20 = 2450 MHz: 13 MHz de distancia, libre.', q: mcq('WiFi en el canal 1 (centro en 2412 MHz). ¿Cuál de estos canales Zigbee cae DENTRO de esa red?', ['12 (2410 MHz)', '15 (2425 MHz)', '20 (2450 MHz)', '25 (2475 MHz)'], '2410 está a 2 MHz del centro del canal 1: dentro.') }
    ] },
    io_otasign: { name: 'OTA firmada: solo tu firmware', alts: [
      { title: 'Un sello que solo tú tienes', text: 'Firmar una imagen es sellarla con tu clave privada. El nodo guarda la clave pública y, antes de instalar, comprueba el sello: si alguien le envía un firmware suyo (aunque tenga acceso a tu red), el sello no cuadra y lo rechaza. Prueba a instalar una imagen con firma falsa:', tune: { viz: 'io_otaviz', params: PP.ota({ v: LS('Versión nueva (0 buena, 1 se cuelga, 2 no conecta)', 0, [0, 1, 2]), firma: LS('Firma (0 válida, 1 falsa)', 1, [0, 1]) }) }, q: mcq('Alguien de tu red intenta subir por OTA su propio firmware a tu nodo, que verifica firmas. ¿Qué pasa?', ['El nodo lo rechaza porque la firma no corresponde a tu clave', 'Se instala, porque está en tu red', 'Se instala solo si es más nuevo', 'El nodo se borra'], 'Sin tu clave privada no puede firmar como tú.') },
      { title: 'Qué protege y qué no', text: 'La firma protege la <b>integridad y el origen</b> del firmware: solo se instala lo que tú has firmado. No protege si la clave privada se filtra (guárdala fuera del repositorio) ni arregla un firmware tuyo con fallos: para eso está la vuelta atrás, que verás en el módulo de fiabilidad. Una contraseña de OTA es un primer paso; la firma es más fuerte.', q: mcq('¿Dónde debe guardarse la clave privada con la que firmas las actualizaciones?', ['Fuera del nodo y del repositorio, en un sitio seguro', 'En el código del nodo', 'En la NVS de cada nodo', 'En el broker'], 'Al nodo solo va la clave pública, que sirve para comprobar.') }
    ] }
  });
  // Ajustes de explicaciones que daban por sabido algo que ahora llega más tarde
  CONCEPTS.io_payload.alts[1] = { title: 'Cada byte cuesta', text: 'Por WiFi, unos bytes de más casi no se notan. Pero hay radios lentas, de largo alcance, en las que cada byte alarga el tiempo de emisión y gasta batería (las verás al final de la especialidad). Ahí se envía binario: un valor de 16 bits ocupa 2 bytes y el servidor sabe cómo leerlo. Cuatro valores de 16 bits = 8 bytes.', q: mcq('Envías temperatura, humedad y batería, cada una como entero de 16 bits. ¿Cuántos bytes?', ['6', '3', '48', '16'], '3 valores × 2 bytes.') };
  CONCEPTS.io_wifichan.alts[0] = { title: 'Carriles que se pisan', text: 'En 2,4 GHz los canales WiFi están separados 5 MHz, pero cada red ocupa unos 20 MHz: el canal 3 pisa al 1 y al 6. Es mejor compartir exactamente un canal (las redes se oyen y se turnan) que solaparse con dos (se estorban sin coordinarse). Los habituales sin solape son 1, 6 y 11; en Europa también 1, 5, 9 y 13.', q: mcq('Las redes de tus vecinos están en los canales 1 y 11. ¿Qué canal WiFi eliges?', ['El 6', 'El 3', 'El 9', 'El 13'], 'El 6 no se solapa con el 1 ni con el 11; el 3, el 9 y el 13 pisan a alguno.') };
  CONCEPTS.io_wifichan.alts[1] = { title: 'Cuenta en MHz', text: 'Canal n: centro en 2407 + 5·n MHz y unos 20 MHz de ancho (±10). Así, el canal 1 ocupa de 2402 a 2422 MHz y el 6, de 2427 a 2447: no se tocan. El 4 (2417–2437) pisa a los dos. Dos redes no se solapan si sus canales están a 4 o más de distancia.', q: mcq('¿Se solapan las redes de los canales 3 y 6?', ['Sí: solo hay 3 canales de distancia (15 MHz)', 'No: son canales distintos', 'No: están a 15 MHz', 'Solo de noche'], 'Hace falta una separación de 20 MHz (4 canales) para no pisarse.') };
  CONCEPTS.io_report.alts[1] = { title: 'El cartero que no sube por nada', text: 'Imagina que cada envío obliga al cartero a subir cinco pisos. No le llamas por cada décima: le das un sobre con el resumen, o le avisas solo si hay novedad (envío por cambio, con un «delta»). Pero si pasa una semana sin cartas, ¿estás de vacaciones o te ha pasado algo? Para eso, una postal fija cada cierto tiempo: el latido.', q: mcq('Un nodo envía la temperatura solo cuando cambia 0,5 °C respecto a lo último enviado. ¿Qué hace si pasa de 21,0 a 21,3 °C?', ['Nada: no ha cambiado lo suficiente', 'Envía 21,3', 'Envía 21,5', 'Se reinicia'], 'Solo envía cuando el cambio llega a 0,5 °C.') };
  CONCEPTS.io_automation.alts[0].text = 'Toda automatización responde: ¿cuándo me evalúo? (<b>disparador</b>: el CO₂ supera 1000 ppm), ¿se cumple todo? (<b>condiciones</b>: hay alguien en casa) y ¿qué hago? (<b>acciones</b>: avisar). En Node-RED se hace con nodos: entrada MQTT, convertir el JSON, decidir con switch, limitar la frecuencia y actuar.';
  CONCEPTS.io_remote.alts[1].text = 'Regla práctica: que las conexiones salgan de casa, no que entren. Un nodo lejano (por ejemplo, conectado por la red móvil) no debería llegar a tu broker por un puerto abierto, sino por una VPN o un servidor intermedio seguro. Revisa la tabla UPnP del router y desactívalo si no lo necesitas: así es como una cámara barata se abre puertos sin preguntarte.';
  CONCEPTS.io_surface.alts[0].text = 'La <b>superficie de ataque</b> es todo lo que un atacante puede tocar: puertos abiertos, servidores web, telnet, UPnP, WPS, la actualización por la red, la nube del fabricante. Cada cosa que apagas es una puerta menos que defender. Telnet (puerto 23) va sin cifrar y es una entrada clásica: ciérralo.';
  CONCEPTS.io_wifidiag.alts[0].text = 'Si un nodo «no envía», ve por capas: radio (¿qué RSSI tiene?), IP (¿tiene dirección? ¿responde a ping?), nombres (¿resuelve el del servidor?) y aplicación (¿llegan sus datos?). No tiene sentido revisar el servidor si el RSSI es de −88 dBm: arregla primero la capa de abajo.';
  CONCEPTS.io_ota.name = 'OTA con vuelta atrás';

  // Una explicación más por concepto, para tocarla o verla
  const VALT = {
    io_arch: { title: 'Tíralo y mira qué cae', text: 'Provoca averías en la cadena. Lo que cuelga detrás del eslabón roto se queda sin datos; lo que está antes sigue funcionando.', tune: { viz: 'io_chain', params: PP.chain() }, q: mcq('En la cadena sensor → nodo → WiFi → broker → panel, se apaga el broker. ¿Qué sigue recibiendo datos?', ['Nada de lo que hay detrás: el panel se queda sin datos', 'El panel, por otro camino', 'Todo sigue igual', 'Solo el panel'], 'El panel cuelga del broker: sin él, no recibe.') },
    io_local: { title: 'Corta internet tú mismo', text: 'Elige dónde vive el «cerebro» y corta internet. Con todo en la nube, la luz deja de responder; con un servidor en casa, sigue.', tune: { viz: 'io_outage', params: PP.outage() }, q: mcq('Con la arquitectura híbrida y sin internet, ¿qué pierdes?', ['Solo ver el sistema desde fuera; lo de casa sigue funcionando', 'La luz con el sensor', 'Todo', 'Nada en absoluto'], 'Lo crítico está en casa; fuera solo iban los resúmenes.') },
    io_datavol: { title: 'Mueve tamaño e intervalo', text: 'Los datos son bytes por mensaje × mensajes. Prueba a doblar el tamaño y a dividir el intervalo entre dos: en los dos casos se doblan los datos.', tune: { viz: 'io_datarate', params: PP.datarate() }, q: mcq('Un nodo envía 100 bytes cada 10 s. ¿Cuántos bytes al día?', ['864 000', '8640', '86 400', '1000'], '86 400 / 10 = 8640 mensajes × 100 bytes.') },
    io_reqs: { title: 'Los requisitos tachan opciones', text: 'Cada requisito descarta radios. Cambia la distancia, los datos, si va a pila o si se mueve, y mira qué columnas se ponen en rojo.', tune: { viz: 'io_radiopick', params: PP.radiopick() }, q: mcq('Un sensor a pila, fijo, a 5 km, que envía pocos bytes. ¿Qué requisito descarta antes el WiFi?', ['El alcance (y también la energía)', 'El ancho de banda', 'El precio de la placa', 'Ninguno'], 'El WiFi llega a decenas de metros y gasta mucho en cada conexión.') },
    io_radio: { title: 'El consumo de un despertar', text: 'La carga de un nodo se gasta casi toda con la radio encendida. Mira la barra roja al acortar el tiempo despierto o al despertar menos a menudo.', tune: { viz: 'io_sleep', params: PP.sleep({ Is: LS('Corriente dormido', 10, [5, 10, 25, 50, 150, 1000, 5000], 'µA'), T: LS('Periodo', 10, [10, 30, 60, 300, 600, 900, 1800, 3600], 's') }) }, q: mcq('Un nodo despierta cada 10 s y pasa 3 s con la radio encendida. ¿Qué mejora más su autonomía?', ['Despertar mucho menos a menudo y estar menos tiempo despierto', 'Enviar un decimal menos', 'Cambiar el nombre del dato', 'Usar un LED más pequeño'], 'Lo caro es la radio encendida.') },
    io_radiopick: { title: 'Pruébalo en la tabla', text: 'Busca con los deslizadores un caso en el que solo encaje una radio. Así ves qué requisito decide en cada caso.', tune: { viz: 'io_radiopick', params: PP.radiopick({ d: LS('Distancia', 20000, [10, 30, 100, 1000, 5000, 20000], 'm') }) }, q: mcq('A 20 km, sin infraestructura propia, ¿qué radios siguen en pie?', ['NB-IoT y LTE-M', 'WiFi y BLE', 'Zigbee y Thread', 'LoRaWAN y WiFi'], 'Solo las celulares cubren esa distancia sin montar nada.') },
    io_espchips: { title: 'Las radios de cada chip, de un vistazo', text: 'Lo que no está en el silicio no se arregla con código. Para Zigbee o Thread hace falta la radio 802.15.4 (C6 o H2); para 5 GHz, un chip que la tenga.', svg: CHK([['ESP32: WiFi 2,4 GHz y Bluetooth', 2], ['ESP32-C6: WiFi 2,4 GHz, BLE y 802.15.4', 2], ['ESP32-H2: BLE y 802.15.4, sin WiFi', 2], ['LoRa o red móvil: módulo aparte', 2]], 'Espressif'), q: mcq('Un sensor Zigbee a pila que no necesita WiFi. ¿Qué chip encaja mejor?', ['ESP32-H2', 'ESP32 clásico', 'ESP32-S3', 'Ninguno'], 'Tiene la radio 802.15.4 y no gasta en un WiFi que no usa.') },
    io_dbm: { title: 'Mira la flecha moverse', text: 'Aleja el nodo o añade paredes y mira cómo baja el RSSI. Cada 10 dB que baja, llega diez veces menos potencia.', tune: { viz: 'io_rssi', params: PP.rssi() }, q: mcq('El RSSI pasa de −55 a −65 dBm. La potencia que llega…', ['Es diez veces menor', 'Es un 10 % menor', 'Es la mitad', 'No cambia'], '10 dB = factor 10.') },
    io_privacy: { title: 'Lo que cuenta una curva', text: 'Con un dato por minuto se ve el desayuno, la comida, la cena y cuándo no hay nadie. Baja la resolución y mira qué desaparece.', tune: { viz: 'io_privviz', params: PP.priv() }, q: mcq('Para la factura de la luz bastan totales por hora. ¿Qué resolución guardas?', ['Una por hora: lo necesario y nada más', 'Una por segundo', 'Una por minuto, por si acaso', 'Todas las que dé el contador'], 'Minimización: lo justo para la finalidad.') },
    io_remote: { title: 'Quién abre la puerta', text: 'Prueba las tres formas de llegar al broker desde fuera: redirigir el puerto (entra cualquiera), o una VPN (entras tú, cifrado).', tune: { viz: 'io_nat', params: PP.nat() }, q: mcq('Con una VPN propia hacia tu red, ¿qué queda expuesto a internet del broker?', ['Nada: solo el servidor VPN, que exige tus claves', 'El puerto 1883', 'Todo', 'La web del broker'], 'Entras por el túnel; el broker no se publica.') },
    io_net: { title: 'Mueve la dirección de B', text: 'Con /24, cambia el tercer número de B y mira cuándo deja de hablar directamente con A y pasa por el router.', tune: { viz: 'io_subnet', params: PP.subnet() }, q: mcq('A = 192.168.1.10 /24. ¿Con cuál habla sin pasar por el router?', ['192.168.1.250', '192.168.2.10', '192.168.10.1', '10.168.1.10'], 'Coinciden los tres primeros números.') },
    io_masks: { title: 'Más bits de red, menos equipos', text: 'Sube y baja la máscara: cada bit de red de más divide a la mitad el número de direcciones.', tune: { viz: 'io_subnet', params: PP.subnet({ m: LS('Máscara: bits de red', 26, [16, 20, 22, 24, 25, 26, 27, 28, 30], '') }) }, q: mcq('¿Cuántos equipos caben en una red /28?', ['14', '16', '28', '4'], '4 bits de equipo: 16 direcciones menos 2.') },
    io_nat: { title: 'La tabla del router', text: 'Cuando un equipo sale, el router apunta la conexión en su tabla NAT. Lo que entra sin estar en la tabla, se descarta.', svg: CHK([['192.168.1.37:50123 ↔ 203.0.113.7:61001', 1], ['192.168.1.20:51877 ↔ 203.0.113.7:61002', 1], ['entra algo para el puerto 1883: no está', 0]], 'Tabla NAT'), q: mcq('Llega desde internet un paquete para un puerto que no está en la tabla NAT ni redirigido. ¿Qué hace el router?', ['Lo descarta', 'Se lo da al broker', 'Se lo da a todos', 'Lo apunta en la tabla'], 'No sabe a qué equipo pertenece.') },
    io_dhcpdns: { title: 'Provoca la avería', text: 'Elige una avería y mira en qué paso se queda el arranque del nodo. Cada síntoma apunta a una pieza: sin IP, DHCP; con IP pero sin nombre, DNS.', tune: { viz: 'io_boot', params: PP.boot() }, q: mcq('Un nodo tiene IP 192.168.1.37 y no encuentra «broker.casa», pero sí llega a 192.168.1.10. ¿Qué falla?', ['El DNS', 'El DHCP', 'La clave del WiFi', 'El servidor'], 'Por IP llega: lo que falla es traducir el nombre.') },
    io_ports: { title: 'Postal o certificada', text: 'Con pérdidas, UDP pierde datos y no avisa; TCP reenvía hasta que llegan, a cambio de más paquetes. Pruébalo:', tune: { viz: 'io_tcpudp', params: PP.tcpudp({ loss: SL('Paquetes que se pierden', 20, 0, 40, 5, '%') }) }, q: mcq('Necesitas que una página web llegue completa y en orden. ¿Qué transporte usa HTTP?', ['TCP', 'UDP', 'Ninguno', 'mDNS'], 'TCP confirma y reenvía.') },
    io_wifichan: { title: 'Mueve tu red por el espectro', text: 'Cada red ocupa unos 20 MHz. Mueve tu canal y mira cuándo pisa a medias a las redes vecinas (rojo), cuándo comparte canal (ámbar) y cuándo queda limpio (verde).', tune: { viz: 'io_wifich', params: PP.wifich() }, q: mcq('Vecinos en los canales 1 y 6. ¿Qué canal pisa a los dos a la vez?', ['El 3', 'El 11', 'El 6', 'El 13'], 'El 3 queda a 2 canales del 1 y a 3 del 6: se solapa con ambos.') },
    io_surface: { title: 'Cuenta las puertas', text: 'Cada servicio encendido es una puerta. Las que no usas, ciérralas: no hace falta defender lo que no existe.', svg: CHK([['SSH con clave fuerte: necesaria', 1], ['Página de configuración: apágala tras usarla', 2], ['Telnet: ciérralo', 0], ['UPnP y WPS: desactívalos', 0]], 'Puertas de un equipo'), q: mcq('Ya configuraste tu nodo y su página de configuración sigue activa. ¿Qué haces?', ['Apagarla: es una puerta que ya no necesitas', 'Dejarla por si acaso', 'Abrirla a internet', 'Ponerle un nombre más largo'], 'Menos servicios, menos superficie.') },
    io_wifidiag: { title: 'De abajo arriba, en el nodo', text: 'Mira el arranque de un nodo con averías. Si se queda en la radio o en la IP, lo de arriba (nombres, servidor) aún no importa.', tune: { viz: 'io_boot', params: PP.boot({ f: LS('Avería (0 ninguna … 4)', 1, [0, 1, 2, 3, 4]) }) }, q: mcq('El monitor serie dice que el nodo no se asocia al WiFi. ¿Qué revisas antes?', ['La clave, la señal y la banda del WiFi', 'El DNS', 'El servidor', 'El formato de los datos'], 'Sin asociarse no hay nada más que revisar.') },
    io_http: { title: 'Petición y respuesta, en directo', text: 'Cambia el método y la ruta y lee las dos cajas: arriba lo que pide el cliente, abajo lo que responde el servidor.', tune: { viz: 'io_http', params: PP.http({ m: LS('Método (0 GET, 1 POST, 2 PUT, 3 DELETE)', 0, [0, 1, 2, 3]) }) }, q: mcq('En una respuesta HTTP, ¿dónde va el código de estado?', ['En la primera línea: HTTP/1.1 200 OK', 'En el cuerpo', 'En la ruta', 'En la cabecera Host'], 'La primera línea de la respuesta lleva el código.') },
    io_rest: { title: 'Repite y mira', text: 'Haz que una misma petición llegue varias veces. Fijar un valor (PUT) deja lo mismo; sumar (POST) cuenta de más.', tune: { viz: 'io_idem', params: PP.idem() }, q: mcq('¿Cuál es idempotente?', ['DELETE /nodos/garaje', 'POST /contador/sumar', 'POST /avisos', 'POST /lecturas'], 'Borrar dos veces deja lo mismo que borrar una.') },
    io_status: { title: 'Provoca cada código', text: 'Consigue un 200, un 401, un 404 y un 201. Fíjate en la primera cifra: 2 bien, 4 culpa del que pide.', tune: { viz: 'io_http', params: PP.http() }, q: mcq('Al cambiar el umbral sin credencial recibes 401. ¿Qué haces?', ['Añadir la credencial y volver a intentarlo', 'Repetir igual en bucle', 'Esperar y reintentar igual', 'Cambiar de puerto'], '4xx: corrige la petición.') },
    io_json: { title: 'Mira los bytes de un JSON', text: 'Cada carácter del JSON es un byte. Fíjate en las llaves, las comillas dobles y en que los decimales llevan punto.', tune: { viz: 'io_bytes', params: PP.bytes({ f: SL('Valores', 3, 1, 6, 1) }) }, q: mcq('¿Qué está mal en {"t": 21,4}?', ['El decimal: en JSON se escribe 21.4', 'Las comillas de la clave', 'Las llaves', 'Nada'], 'En JSON, los decimales siempre con punto.') },
    io_arduinojson: { title: 'Leer solo lo que cabe', text: 'Un JSON enorme no cabe en la RAM. Con un filtro, ArduinoJson descarta al vuelo lo que no necesitas.', svg: FLOW(['API: 60 kB', 'Filtro', '3 números', 'RAM tranquila'], 'y con | das un valor por defecto a lo que falte'), q: mcq('El JSON recibido es {"umbral":25}. ¿Qué da doc["intervalo"] | 60?', ['60', '25', '0', 'Un error'], 'Falta intervalo: valor por defecto.') },
    io_payload: { title: 'Cuenta cuadrados', text: 'Cada cuadrado es un byte. Pasa de JSON largo a corto y a binario con los mismos valores.', tune: { viz: 'io_bytes', params: PP.bytes() }, q: mcq('El mismo dato de 16 bits, en JSON como {"h":48} y en binario. ¿Cuántos bytes en cada caso?', ['8 y 2', '2 y 8', '8 y 8', '48 y 2'], 'Ocho caracteres frente a dos bytes.') },
    io_srvcli: { title: 'El delay hace cola', text: 'Mientras loop() está en delay(), nadie atiende las peticiones. Sube y baja el delay y mira las barras rojas.', tune: { viz: 'io_srvcli', params: PP.srvcli({ dl: LS('delay() al final de loop', 5, [0, 0.1, 0.5, 1, 2, 5, 10], 's', 1) }) }, q: mcq('Un servidor en el nodo hace delay(2000) en cada vuelta de loop(). ¿Cuánto puede esperar una petición?', ['Hasta unos 2 s', 'Nada', '20 s', 'Para siempre'], 'Hasta la siguiente llamada a handleClient().') },
    io_push: { title: 'Preguntar o que te avisen', text: 'Compara: preguntando cada pocos segundos ves rápido los cambios, pero con miles de mensajes; con empuje, un mensaje por cambio.', tune: { viz: 'io_poll', params: PP.poll() }, q: mcq('Con sondeo cada 10 s, ¿cuántas peticiones al día?', ['8640', '86 400', '864', '10'], '86 400 / 10.') },
    io_pubsub: { title: 'El broker reparte', text: 'Cambia el tema publicado y tu suscripción: el nodo publica una vez y el broker entrega a cada suscriptor que coincide.', tune: { viz: 'io_mqtt', params: PP.mqtt0() }, q: mcq('Dos clientes están suscritos a casa/salon/temperatura. El nodo publica allí una vez. ¿Cuántas entregas hace el broker?', ['Dos', 'Una', 'Ninguna', 'Cuatro'], 'Una por suscriptor.') },
    io_mqttesp: { title: 'Lista de comprobación visual', text: 'Cuatro fallos que muerden con PubSubClient y su arreglo.', svg: CHK([['Mensaje de más de 256 bytes → setBufferSize()', 2], ['Carga sin 0 final → copiar y terminar', 2], ['Sin mqtt.loop() → te desconectan', 2], ['Identificador repetido → se expulsan', 2]], 'PubSubClient'), q: mcq('Publicar con QoS 1 desde PubSubClient…', ['No se puede: solo publica con QoS 0', 'Es lo normal', 'Requiere setBufferSize()', 'Requiere un tema corto'], 'Usa otra librería si necesitas QoS 1 al publicar.') },
    io_topics: { title: 'Suscripciones con comodines', text: 'Elige tema y suscripción y mira a quién le llega. Fíjate en los niveles: + ocupa uno; # todos los que quedan.', tune: { viz: 'io_mqtt', params: PP.mqtt1() }, q: mcq('¿Qué tema recibe la suscripción +/salon/+?', ['casa/salon/humedad', 'casa/salon/sensor1/temperatura', 'casa/salon', 'salon/casa/humedad'], 'Tres niveles con salon en el medio.') },
    io_qos: { title: 'Pierde paquetes a propósito', text: 'Sube las pérdidas y cambia la QoS. Mira los perdidos, los repetidos y cuántos paquetes cuesta cada nivel.', tune: { viz: 'io_qos', params: PP.qos({ loss: SL('Paquetes que se pierden', 20, 0, 40, 5, '%') }) }, q: mcq('Con 20 % de pérdidas y QoS 1, ¿qué puede pasar?', ['No se pierde ninguno, pero alguno llega repetido', 'Se pierden algunos', 'Llegan todos exactamente una vez', 'No llega ninguno'], 'Al menos una vez: puede duplicar.') },
    io_retain: { title: 'Llega tarde y mira', text: 'Publica «cerrada» y haz que el panel se conecte más tarde. Sin retenido no ve nada; con retenido, el último estado.', tune: { viz: 'io_retain', params: PP.retain() }, q: mcq('Publicas «abierta» como retenido y luego «cerrada» como retenido. Un panel nuevo se suscribe. ¿Qué ve?', ['«cerrada»', '«abierta»', 'Las dos', 'Nada'], 'Solo queda el último retenido.') },
    io_lwt: { title: 'Mira esperar al broker', text: 'Cambia el keepalive: el broker espera 1,5 veces ese tiempo de silencio antes de publicar el testamento. Y si el nodo se despide, no publica nada.', tune: { viz: 'io_lwt', params: PP.lwt() }, q: mcq('Keepalive de 30 s. ¿Cuánto tarda como mucho el broker en dar por muerto a un nodo sin luz?', ['45 s', '30 s', '60 s', '90 s'], '1,5 × 30.') },
    io_mosquitto: { title: 'Prueba la ACL', text: 'Elige usuario, tema y acción. Mira qué línea de la ACL lo permite, o si el broker lo descarta.', tune: { viz: 'io_acl', params: PP.acl() }, q: mcq('Con pattern write casa/%u/#, ¿dónde puede publicar el usuario «garaje»?', ['En casa/garaje/ y lo que cuelga de ahí', 'En toda la casa', 'En ningún sitio', 'Solo en casa/#'], '%u se sustituye por el nombre de usuario.') },
    io_sampling: { title: 'Muestrea despacio y mira el engaño', text: 'Baja el muestreo por debajo del doble de la frecuencia de la señal: los puntos dibujan una señal lenta que no existe.', tune: { viz: 'io_alias', params: PP.alias() }, q: mcq('Una señal de 2 Hz muestreada a 3 Hz. ¿Qué pasa?', ['Aliasing: parece más lenta de lo que es', 'Se ve perfecta', 'No se ve nada', 'Parece más rápida y exacta'], '3 Hz es menos del doble de 2 Hz.') },
    io_report: { title: 'Delta y latido', text: 'Sube el delta para enviar menos y añade un latido para que nunca haya silencios largos.', tune: { viz: 'io_delta', params: PP.delta() }, q: mcq('Con delta de 0,5 °C y sin latido, la temperatura no cambia en 6 horas. ¿Qué ves en el servidor?', ['Nada durante 6 horas: no sabes si está estable o muerto', 'Un envío por minuto', 'Un latido cada hora', 'Un error'], 'Sin latido, el silencio es ambiguo.') },
    io_calib: { title: 'Ajusta la recta', text: 'Corrige primero el desplazamiento (b) con el punto de 0 °C y luego la ganancia (a) con el de 40 °C.', tune: { viz: 'io_calib', params: PP.calib() }, q: mcq('Con un solo punto de referencia, ¿qué puedes corregir?', ['Solo el desplazamiento', 'Desplazamiento y ganancia', 'Solo la ganancia', 'Nada'], 'Para la pendiente hacen falta dos puntos.') },
    io_time: { title: 'La deriva acumulada', text: 'Un reloj con unas pocas ppm de error acumula segundos cada día. Cambia cada cuánto resincronizas con NTP.', tune: { viz: 'io_drift', params: PP.drift() }, q: mcq('Un reloj con 10 ppm de deriva, ¿cuánto se desvía en un día?', ['Unos 0,86 s', 'Unos 10 s', 'Unos 86 s', 'Nada'], '10 × 10⁻⁶ × 86 400 = 0,864 s.') },
    io_tsdb: { title: 'Puntos, retención y series', text: 'Cambia el ritmo de medida, los días de datos crudos y la etiqueta. Mira cómo se disparan los puntos y las series.', tune: { viz: 'io_retention', params: PP.retention() }, q: mcq('¿Qué pasa si usas como etiqueta un valor que cambia en cada punto?', ['Cada punto crea una serie nueva y la memoria se dispara', 'Nada', 'Ocupa menos', 'Se pierden los campos'], 'La cardinalidad crece sin control.') },
    io_anomaly: { title: 'Cada avería, su detector', text: 'Elige una avería de la nevera y busca el detector que la ve. Ninguno las ve todas.', tune: { viz: 'io_anom', params: PP.anom({ an: LS('Anomalía (0 ninguna … 4)', 2, [0, 1, 2, 3, 4]) }) }, q: mcq('El sensor repite exactamente el mismo valor durante horas. ¿Qué detector lo ve?', ['Valor congelado', 'Umbral', 'Velocidad de cambio', 'Ninguno'], 'Un valor colgado puede estar dentro del rango.') },
    io_automation: { title: 'Disparador, condición y acción', text: 'Una automatización se evalúa cuando salta el disparador, comprueba las condiciones y actúa. Y antes de actuar, valida el dato.', svg: FLOW(['Disparador', 'Condiciones', '¿Dato reciente?', 'Acción'], 'si el dato es viejo o imposible, no actúes: avisa'), q: mcq('«A las 7:00, si es laborable, sube la persiana.» ¿Qué es «si es laborable»?', ['La condición', 'El disparador', 'La acción', 'La entidad'], 'Se comprueba cuando salta el disparador (las 7:00).') },
    io_security: { title: 'La matriz de riesgo', text: 'Recorre las amenazas: el riesgo es probabilidad × impacto. Lo de arriba a la derecha, primero.', tune: { viz: 'io_risk', params: PP.risk() }, q: mcq('Una amenaza con probabilidad 3 e impacto 1, y otra con probabilidad 2 e impacto 3. ¿Cuál atiendes antes?', ['La segunda (riesgo 6 frente a 3)', 'La primera, por ser más probable', 'Las dos a la vez', 'Ninguna'], 'Multiplica: 2 × 3 = 6 > 3 × 1 = 3.') },
    io_secrets: { title: 'Prueba cada incidente', text: 'Cambia dónde vive la clave y si cada nodo tiene la suya, y mira qué se filtra y cuántos nodos hay que reconfigurar.', tune: { viz: 'io_creds', params: PP.creds() }, q: mcq('La clave está en NVS (sin cifrar) y te roban un nodo. ¿Puede el ladrón leerla?', ['Sí, volcando la flash', 'No, nunca', 'Solo con la contraseña del WiFi', 'Solo si el nodo está encendido'], 'Solo el cifrado de flash lo impide.') },
    io_tls: { title: 'El atacante en medio', text: 'Sin TLS, el atacante lo lee todo. Con setInsecure(), cifra pero acepta a un impostor. Verificando con tu CA, el impostor no pasa.', tune: { viz: 'io_tlsviz', params: PP.tls() }, q: mcq('El nodo usa TLS con setInsecure() y alguien se hace pasar por el broker. ¿Qué pasa?', ['El nodo le envía todo: no comprueba con quién habla', 'La conexión se corta', 'El impostor no ve nada', 'El broker avisa'], 'Cifrar sin verificar no protege de un impostor.') },
    io_segment: { title: 'Encierra a la bombilla', text: 'Separa la red IoT y pon reglas en el cortafuegos. Mira a qué llega la bombilla comprometida en cada caso.', tune: { viz: 'io_segviz', params: PP.seg() }, q: mcq('La bombilla comprometida está en una red IoT separada, sin reglas de cortafuegos. ¿Qué puede hacer todavía?', ['Salir a internet (por ejemplo, para atacar a otros)', 'Llegar a tu portátil', 'Nada', 'Leer tu NAS'], 'Separar protege tus equipos; las reglas cortan lo demás.') },
    io_ota: { title: 'Instala y mira volver', text: 'Instala versiones nuevas: una que se cuelga, una que no conecta y una buena. Solo la que pasa la autocomprobación se queda.', tune: { viz: 'io_otaviz', params: PP.ota() }, q: mcq('La versión nueva arranca pero no conecta al broker, así que no se confirma. ¿Qué arranca tras el siguiente reinicio?', ['La versión anterior', 'La nueva otra vez', 'Ninguna', 'La de fábrica siempre'], 'Sin confirmación, vuelta atrás.') },
    io_deepsleep: { title: 'Tres cajones', text: 'Qué sobrevive a cada cosa:', svg: CHK([['RAM normal: se borra al dormir', 0], ['Memoria RTC: sobrevive al deep sleep, no a un corte', 2], ['Flash (NVS, LittleFS): sobrevive a todo; se desgasta', 1]], 'Memoria del ESP32'), q: mcq('Quieres contar cuántas veces ha despertado el nodo desde que se le puso la pila. ¿Dónde guardas el contador?', ['En memoria RTC (RTC_DATA_ATTR)', 'En una variable normal', 'En el broker', 'En una constante'], 'Sobrevive al deep sleep sin desgastar la flash.') },
    io_battery: { title: 'Química por química', text: 'Tensiones típicas y cómo alimentar el ESP32 (entre 3,0 y 3,6 V):', svg: BARS([['Li-ion llena', 4.2, 'var(--err)'], ['LiFePO4, tensión nominal', 3.2, 'var(--ok)'], ['Máximo que admite el ESP32', 3.6, 'var(--led)'], ['3 alcalinas nuevas', 4.5, 'var(--err)']], ' V', 'por encima de 3,6 V hace falta regulador'), q: mcq('¿Por qué una Li-ion no puede alimentar el ESP32 directamente?', ['Llena da 4,2 V, más de los 3,6 V que admite', 'Da poca corriente', 'No se puede recargar', 'Sí puede siempre'], 'Necesita un regulador de baja caída.') },
    io_supply: { title: 'Provoca el brownout', text: 'Con cables finos y sin condensador, el pico de la radio hunde la tensión. Arréglalo con el condensador o con menos resistencia.', tune: { viz: 'io_brown', params: PP.brown() }, q: mcq('¿Qué hace el condensador junto al módulo durante el pico?', ['Entrega la corriente del pico mientras la fuente se recupera', 'Sube la tensión por encima de 3,3 V', 'Filtra el WiFi', 'Nada'], 'Es una pequeña reserva de carga justo al lado.') },
    io_energy: { title: 'Balance de cada día', text: 'Lo que entra (panel × horas × 0,7) frente a lo que sale (corriente × tensión × 24 h). Busca el panel mínimo para invierno.', tune: { viz: 'io_solarbal', params: PP.solar() }, q: mcq('Panel de 2 W, 2 horas de sol pico y 30 % de pérdidas. ¿Wh útiles al día?', ['2,8 Wh', '4 Wh', '1,4 Wh', '0,7 Wh'], '2 × 2 × 0,7.') },
    io_queue: { title: 'La cola como anillo', text: 'Un búfer circular escribe sobre lo más viejo cuando se llena: siempre conserva lo más reciente.', svg: FLOW(['Llega lectura', '¿Cola llena?', 'Sí: pisa la más vieja', 'Al volver la red', 'Envía por tandas']), q: mcq('Una cola de 100 lecturas, llena. Llega una nueva. ¿Qué pasa en un búfer circular?', ['Sustituye a la más vieja', 'Se descarta la nueva', 'Se borra toda la cola', 'Se reinicia el nodo'], 'Lo reciente vale más.') },
    io_wdt: { title: 'La patada bien puesta', text: 'El watchdog solo rescata si la patada depende de que el trabajo avance.', svg: VS({ t: 'Bien', l: ['tras cada vuelta', 'completa de loop()', 'o cada envío'], c: 'var(--ok)' }, { t: 'Mal', l: ['dentro de un while', 'que espera sin fin', 'en una interrupción'], c: 'var(--err)' }), q: mcq('El programa espera al WiFi en un while que da patadas al watchdog. El WiFi nunca vuelve. ¿Qué pasa?', ['El watchdog no salta y el nodo se queda colgado', 'El watchdog reinicia el nodo', 'El WiFi vuelve solo', 'Se borra la flash'], 'La patada no demostraba que el trabajo avanzara.') },
    io_health: { title: 'Un panel de salud', text: 'Datos del nodo y lo que anuncian:', svg: CHK([['Reinicio por brownout → alimentación', 2], ['Memoria mínima bajando → fuga', 2], ['RSSI bajando semana a semana → radio', 2], ['Muchas reconexiones → red o identificador', 2]], 'Telemetría de salud'), q: mcq('El RSSI de un nodo baja poco a poco durante semanas. ¿Qué sospechas?', ['Algo ha cambiado en el camino de la radio (un mueble, una planta que crece…)', 'Una fuga de memoria', 'Un fallo del broker', 'Nada'], 'La tendencia apunta a la radio.') },
    io_ha: { title: 'De la integración a la entidad', text: 'Home Assistant organiza todo en capas: una integración trae dispositivos; cada dato o control de un dispositivo es una entidad; las automatizaciones usan entidades.', svg: FLOW(['Integración', 'Dispositivo', 'Entidades', 'Automatizaciones']), q: mcq('Un enchufe que mide consumo aparece en Home Assistant. ¿Qué es «potencia del enchufe»?', ['Una entidad', 'Una integración', 'Un dispositivo', 'Una automatización'], 'Cada dato concreto es una entidad.') },
    io_mesh: { title: 'Añade un router a la malla', text: 'Aleja el sensor hasta perderlo y recupéralo con un enchufe Zigbee a medio camino.', tune: { viz: 'io_meshviz', params: PP.mesh() }, q: mcq('¿Por qué un enchufe Zigbee mejora la malla y un sensor a pila no?', ['El enchufe está siempre despierto y repite; el de pila duerme', 'El enchufe tiene más antena', 'El sensor no tiene radio', 'Es al revés'], 'Repetir exige estar escuchando.') },
    io_lwnet: { title: 'El viaje y los duplicados', text: 'Cualquier pasarela que oiga al nodo lo reenvía; el servidor de red quita duplicados y el de aplicación descifra.', svg: FLOW(['Nodo', '3 pasarelas', 'Servidor de red', '1 copia', 'Tu aplicación']), q: mcq('¿Quién descifra la carga de tu nodo?', ['El servidor de aplicación, con la clave de aplicación', 'La pasarela', 'El router de casa', 'Nadie'], 'La pasarela solo reenvía bytes cifrados.') },
    io_lwclass: { title: 'Cuánto espera una orden', text: 'Cambia la clase y el ritmo de subidas, y mira cuánto espera la orden y cuánto escucha el nodo.', tune: { viz: 'io_lwclassviz', params: PP.lwc() }, q: mcq('Clase A, subida cada hora. Mandas una orden justo después de una subida. ¿Cuánto espera?', ['Casi una hora', 'Un segundo', '32 s', 'Nada'], 'Hasta la siguiente subida.') },
    io_cellular: { title: 'Modos de ahorro en números', text: 'Cambia el modo y los envíos al día. Mira la autonomía y cuánto tarda en llegar una orden.', tune: { viz: 'io_psmviz', params: PP.psm() }, q: mcq('Con PSM y un envío al día, ¿cuánto puede tardar una orden desde el servidor?', ['Hasta un día: hasta que el módulo despierte', 'Unos segundos', 'Nunca llega', 'Un minuto'], 'Dormido en PSM no escucha.') }
  };
  for (const [k, a] of Object.entries(VALT)) CONCEPTS[k].alts.push(a);

  /* ---------- más ajustes de orden: conceptos estrechos y distractores sin temas futuros ---------- */
  Object.assign(CONCEPTS, {
    io_private: { name: 'Direcciones IP privadas', alts: [
      { title: 'Calles con el mismo nombre en cada pueblo', text: 'Las direcciones <b>privadas</b> (10.x, 172.16–31.x y 192.168.x) están reservadas para uso interno y no se usan en internet. Son como «calle Mayor, 3»: existe en miles de pueblos sin confusión, porque cada una solo vale dentro de su pueblo (su red).', q: mcq('¿Cuál de estas direcciones es privada?', ['192.168.4.20', '8.8.8.8', '198.51.100.20', '203.0.113.7'], '192.168.x.x está en un rango privado.') },
      { title: 'Los tres rangos', text: 'Apréndete los tres rangos privados y compara la dirección con ellos:', svg: CHK([['10.0.0.0 – 10.255.255.255', 2], ['172.16.0.0 – 172.31.255.255', 2], ['192.168.0.0 – 192.168.255.255', 2], ['Todo lo demás: direcciones públicas', 1]], 'Rangos privados'), q: mcq('¿Es privada la dirección 172.20.5.9?', ['Sí: está entre 172.16 y 172.31', 'No: solo las 192.168 son privadas', 'No: empieza por 172', 'Solo si la da el router'], 'El rango 172.16.0.0/12 llega hasta 172.31.255.255.') }
    ] },
    io_qoslib: { name: 'Qué QoS admite tu librería MQTT', alts: [
      { title: 'Lee la letra pequeña', text: 'El protocolo tiene tres QoS, pero cada librería implementa lo que implementa. PubSubClient, la más usada con Arduino, solo publica con QoS 0 (puede suscribirse con QoS 1). Para publicar con QoS 1 en el ESP32, usa el cliente MQTT de ESP-IDF (esp-mqtt) u otra librería que lo admita.', q: mcq('Con PubSubClient, ¿con qué QoS publica tu nodo?', ['Con QoS 0', 'Con la que pidas', 'Siempre con QoS 2', 'Con QoS 1'], 'Solo publica con QoS 0.') },
      { title: 'Elige la librería por lo que necesitas', text: 'Antes de elegir librería, decide qué garantías necesitas:', svg: CHK([['Telemetría (QoS 0): PubSubClient vale', 1], ['Alarmas y órdenes (QoS 1): esp-mqtt u otra', 2], ['Publicar QoS 1 con PubSubClient: no se puede', 0]], 'Librería según la QoS'), q: mcq('Un nodo debe publicar alarmas que no se pueden perder. ¿Qué haces?', ['Usar una librería que publique con QoS 1', 'Usar PubSubClient con publish(…, 1)', 'Publicar tres veces con QoS 0', 'Hacer el mensaje más largo'], 'Para QoS 1 al publicar, otra librería.') }
    ] }
  });
  const setQ = (k, i, o) => { CONCEPTS[k].alts[i].q.o = o; };
  setQ('io_local', 1, ['Lo crítico depende de la red: la sirena debería decidirse en el propio detector', 'Nada, la nube es más fiable', 'Que debería enviar más datos', 'Que no guarda el historial']);
  CONCEPTS.io_radio.alts[0].text = 'En un nodo a pilas, lo que vacía la batería es el tiempo con la radio encendida: asociarse al WiFi, abrir la conexión con el servidor, enviar y esperar respuesta. Cuantas menos veces despiertes y menos dure cada conexión, más dura. La otra cara: mientras duerme, la radio está apagada y el nodo no oye nada. Por eso los sensores a pila solo hablan y los actuadores que deben obedecer al momento van enchufados.';
  CONCEPTS.io_radio.alts[1].text = 'Un despertar con WiFi típico gasta del orden de 120 mA durante 1–3 s: asociarse, pedir dirección, abrir la conexión y enviar. Mandar 20 bytes o 200 casi no cambia esa cuenta; repetir el despertar cada 10 s, sí. Y un nodo dormido no escucha: si alguien le manda algo, nadie contesta hasta que despierte.';
  setQ('io_radio', 1, ['No: dormido no escucha y la orden tardaría hasta 5 minutos', 'Sí, la orden lo despierta sola', 'Sí, si envía menos datos', 'Sí, con una antena mejor']);
  setQ('io_net', 0, ['No: el tercer número cambia', 'Sí: acaban igual', 'Sí: empiezan igual', 'Depende de la hora']);
  setQ('io_net', 1, ['Sí: el router está en su red y saca los paquetes de fuera', 'No: la IP del servidor no empieza como la suya', 'Solo si el servidor está en su misma red', 'Solo con un cable']);
  CONCEPTS.io_remote.alts[0].q = mcq('Quieres consultar el panel web de tu casa desde el trabajo. ¿Qué haces?', ['Montar una VPN hacia tu red y entrar por ella', 'Redirigir el puerto del panel en el router', 'Activar UPnP en el router', 'Quitar la contraseña del panel'], 'Nada expuesto: entras tú por un túnel cifrado.');
  CONCEPTS.io_wifidiag.alts[0].q = mcq('Un nodo no envía nada y en el monitor serie ves que no obtiene IP. ¿Dónde sigues?', ['En la radio y el WiFi: RSSI, clave y canal', 'En el servidor', 'En el formato de los datos', 'En el nombre del servidor'], 'Sin IP, lo de arriba todavía no importa.');
  setQ('io_wifidiag', 1, ['Sacar la antena fuera con un módulo de antena externa', 'Cambiar el puerto del servidor', 'Reiniciar el router cada hora', 'Enviar mensajes más cortos']);
  setQ('io_status', 1, ['Guardarla y reintentar más tarde con espera creciente', 'Corregir el formato de la lectura', 'Darla por enviada', 'Reintentar en bucle sin pausa']);
  CONCEPTS.io_mqttesp.alts[0].text = 'Cuatro cosas que muerden con PubSubClient:\n1) El búfer es de 256 bytes por defecto: un mensaje mayor no sale (setBufferSize).\n2) La carga llega como bytes con su longitud, sin 0 final: cópiala y termínala tú.\n3) Hay que llamar a loop() a menudo, o no entran mensajes ni se mantiene la conexión viva.\n4) Cada cliente necesita un identificador único.';
  CONCEPTS.io_mqttesp.alts[1].text = 'Mensajes largos que no salen → búfer corto. Basura al imprimir la carga → la tratas como cadena sin 0 final. El broker te desconecta y no llegan órdenes → no llamas a loop(). Dos nodos que se echan uno a otro cada pocos segundos → comparten identificador de cliente.';
  setQ('io_mqttesp', 1, ['La carga no acaba en 0 y la imprimes como cadena', 'El broker está mal configurado', 'Falta otro broker', 'El tema es demasiado largo']);
  CONCEPTS.io_mqttesp.alts[2].q = mcq('Un nodo deja de recibir órdenes al rato de conectarse y el broker lo desconecta. ¿Qué falta casi seguro?', ['Llamar a mqtt.loop() a menudo', 'Ampliar el búfer', 'Un tema más corto', 'Otra librería WiFi'], 'loop() procesa lo que entra y mantiene viva la conexión.');
  setQ('io_topics', 1, ['No: los temas con $ no entran con un comodín inicial', 'Sí: # lo recibe todo', 'Solo si el tema es corto', 'Solo si lo pide el panel']);
  setQ('io_qos', 1, ['Ninguno: es un total, repetirlo no cambia nada', 'Se cuentan los litros dos veces', 'El broker se bloquea', 'Se cambia el tema']);
  setQ('io_retain', 0, ['Que el estado se publique como retenido', 'Un tema distinto para cada panel', 'Un tema más corto', 'Un keepalive más corto']);
  CONCEPTS.io_report.alts[0].text = 'Medir es barato; transmitir, caro. El nodo listo muestrea a menudo y envía un <b>resumen</b> (media, máximo, valor eficaz) cada pocos minutos. O envía <b>por cambio</b>: solo si el valor se mueve más de un delta. Y siempre un <b>latido</b> periódico, para distinguir «estable» de «muerto».';
  CONCEPTS.io_time.alts[0].text = CONCEPTS.io_time.alts[0].text.replace('(en deep sleep, más)', '(y dormido, más)');
  setQ('io_lwnet', 0, ['Una', 'Tres', 'Ninguna', 'Depende de la hora']);
  setQ('io_lwnet', 1, ['Su contador de tramas volvió a 0 y el servidor los toma por repetidos', 'La pasarela está apagada', 'El JSON es demasiado largo', 'Ha caducado la CA']);

  // Pista de Chispa para cada generador (sin dar la respuesta)
  const GH = {
    io_sleepAvg: () => 'Suma la carga despierto y la dormido en mA·s (pasa los µA a mA) y divide entre el periodo.',
    io_sleepLife: () => 'Capacidad entre corriente media da horas; luego divide entre 24. Ojo si la corriente viene en µA.',
    io_dataMonth: () => 'Mensajes al mes = 30 × 86 400 / intervalo; multiplica por los bytes y divide entre 1 000 000.',
    io_duty: e => /caben/.test(e.q) ? 'El 1 % de una hora son 36 000 ms: divídelos entre el tiempo en aire de un mensaje.' : 'Tras transmitir T hay que callar 99·T; pasa el resultado a segundos.',
    io_backoff: () => 'Calcula base × 2^(fallos − 1) y compáralo con el tope: manda el menor.',
    io_jsonSize: () => 'Cuenta todos los caracteres: llaves, comillas, dos puntos y comas también son bytes.',
    io_sampling: e => e.c === 'io_datavol' ? 'Multiplica canales × muestras por segundo × bits y divide entre 1000 para pasar a kbit/s.' : 'Nyquist: más del doble de la frecuencia más alta.',
    io_subnet: e => e.c === 'io_masks' ? (/equipos/.test(e.q) ? 'Bits de equipo = 32 − prefijo; 2 elevado a eso, menos las 2 direcciones reservadas.' : 'Trocea el último número en bloques de 2^(32 − prefijo) y busca dónde empieza el bloque de esa IP.') : 'Con /24, compara solo los tres primeros números.',
    io_topicMatch: () => 'Compara nivel a nivel: + vale por un nivel exacto y # por todo lo que queda. Mayúsculas y $ cuentan.',
    io_dbm: e => /más potencia/.test(e.q) ? 'Resta los dos valores: cada 10 dB es ×10 y cada 3 dB, ×2.' : '0 dBm = 1 mW; cada 10 dB multiplica o divide por 10.'
  };
  const gh = (k, fn) => () => { const e = fn(); return e.h ? e : { ...e, h: GH[k](e) }; };
  /* ---------- generadores ---------- */
  Gen.add('io_sleepAvg', gh('io_sleepAvg', () => {
    const Ia = pick([80, 120, 160, 200]), ta = pick([0.5, 1, 2, 3, 5]), Is = pick([10, 20, 50, 150]), T = pick([60, 300, 600, 900]);
    const q = Ia * ta + Is / 1000 * (T - ta), avg = q / T;
    return N(`Un nodo pasa ${fmt(ta)} s despierto a ${Ia} mA y el resto dormido a ${Is} µA. Se despierta cada ${fmt(T / 60)} min. ¿Corriente media en mA?`, avg, 'mA', `Carga por ciclo: ${Ia} × ${fmt(ta)} + ${fmt(Is / 1000, 3)} × ${fmt(T - ta)} = ${fmt(q, 2)} mA·s. Entre ${T} s: ${fmt(avg, 3)} mA.`, Math.max(0.002, avg * 0.03));
  }), 'io_duty');
  Gen.add('io_sleepLife', gh('io_sleepLife', () => {
    const C = pick([1000, 2000, 2600, 3000]), I = pick([0.05, 0.1, 0.2, 0.5, 1, 2]), d = C / I / 24;
    return N(`Batería de ${C} mAh y consumo medio de ${I < 1 ? fmt(I * 1000) + ' µA' : fmt(I) + ' mA'}. ¿Cuántos días dura en teoría (sin autodescarga)?`, d, 'días', `${C} mAh / ${fmt(I)} mA = ${fmt(C / I, 0)} h; entre 24 = ${fmt(d, 1)} días. En la realidad, la autodescarga, el frío y la tensión mínima del regulador lo recortan bastante.`, d * 0.03);
  }), 'io_duty');
  Gen.add('io_dataMonth', gh('io_dataMonth', () => {
    const B = pick([40, 80, 120, 200, 500]), s = pick([5, 10, 30, 60, 300]), n = 30 * 86400 / s, mb = B * n / 1e6;
    return N(`Un nodo envía un mensaje de ${B} bytes (cabeceras incluidas) cada ${s} s. ¿Cuántos MB al mes (30 días)?`, mb, 'MB', `Mensajes al mes: 30 × 86 400 / ${s} = ${fmt(n, 0)}. Por ${B} bytes = ${fmt(B * n, 0)} bytes ≈ ${fmt(mb, 2)} MB.`, Math.max(0.01, mb * 0.03));
  }), 'io_datavol');
  Gen.add('io_duty', gh('io_duty', () => {
    const sf = pick([7, 8, 9, 10, 11, 12]), b = pick([4, 10, 20, 40]), t = toaMs(sf, b);
    if (Math.random() < 0.5) {
      const n = Math.floor(36000 / t);
      return N(`LoRaWAN a 868,1 MHz (1 % de ciclo de trabajo). Un mensaje de ${b} bytes con SF${sf} pasa ${fmt(t, 1)} ms en el aire. ¿Cuántos mensajes caben como máximo en una hora?`, n, 'mensajes', `El 1 % de una hora son 36 s = 36 000 ms. 36 000 / ${fmt(t, 1)} = ${fmt(36000 / t, 2)}: caben ${n}.`, 1);
    }
    const w = t * 99 / 1000;
    return N(`Ciclo de trabajo del 1 %: acabas de transmitir ${fmt(t, 1)} ms con SF${sf}. ¿Cuántos segundos debes callar como mínimo en esa sub-banda?`, w, 's', `Para que T sea el 1 % del total, después vienen 99·T de silencio: 99 × ${fmt(t, 1)} ms = ${fmt(w, 2)} s.`, Math.max(0.05, w * 0.02));
  }), 'io_lora');
  Gen.add('io_backoff', gh('io_backoff', () => {
    const base = pick([0.5, 1, 2]), cap = pick([30, 60, 120]), k = ri(1, 9), raw = base * 2 ** (k - 1), w = Math.min(cap, raw);
    return N(`Reconexión con espera exponencial: espera = mín(${fmt(base)} s × 2^(fallos − 1), ${cap} s). Tras ${k} fallo${k > 1 ? 's' : ''} seguido${k > 1 ? 's' : ''}, ¿cuántos segundos espera?`, w, 's', `${fmt(base)} × 2${sup(k - 1)} = ${fmt(raw)} s${raw > cap ? `, que supera el tope: se queda en ${cap} s` : ''}.`, 0.01);
  }), 'io_retry');
  Gen.add('io_jsonSize', gh('io_jsonSize', () => {
    const F = [['t', () => +(ri(150, 299) / 10).toFixed(1)], ['h', () => ri(20, 90)], ['bat', () => +(ri(301, 419) / 100).toFixed(2)], ['id', () => 'nodo' + ri(1, 9)], ['rssi', () => -ri(40, 90)], ['co2', () => ri(400, 1800)], ['ok', () => true]];
    const k = ri(2, 3), used = [], o = {};
    while (used.length < k) { const f = pick(F); if (!used.includes(f)) used.push(f); }
    used.forEach(([key, g]) => { o[key] = g(); });
    const s = JSON.stringify(o), n = s.length, vals = Object.values(o).map(v => String(v).length).reduce((a, b) => a + b, 0);
    return MC('¿Cuántos bytes ocupa este JSON tal cual (sin espacios ni salto de línea)?', `${n} bytes`, [`${n + 2 * k - 1} bytes`, `${vals} bytes`, `${n - 2} bytes`, `${n * 2} bytes`], `Cada carácter es un byte: llaves, comillas, dos puntos y comas también cuentan. Solo ${vals} de los ${n} bytes son los valores; el resto es “envoltorio”.`, { code: s });
  }), 'io_payload');
  Gen.add('io_sampling', gh('io_sampling', () => {
    if (Math.random() < 0.5) {
      const [what, f] = pick([['la red eléctrica (50 Hz)', 50], ['una vibración de 120 Hz', 120], ['un zumbido de 400 Hz', 400], ['la voz (hasta 4000 Hz)', 4000], ['un motor que gira a 30 vueltas por segundo', 30]]);
      return MC(`Quieres capturar ${what}. ¿Frecuencia de muestreo mínima teórica?`, `Más de ${2 * f} Hz`, [`${f} Hz`, `${f / 2} Hz`, `${fmt(1 / f, 4)} Hz`], `Nyquist: más del doble de la frecuencia más alta. En la práctica, de 5 a 10 veces (${5 * f}–${10 * f} Hz) y un filtro antialiasing delante.`);
    }
    const c = pick([1, 2, 3, 4]), fs = pick([10, 100, 500, 1000, 2000]), b = pick([12, 16]), kb = c * fs * b / 1000;
    return { ...N(`${c} canal${c > 1 ? 'es' : ''} a ${fs} muestras/s, ${b} bits por muestra. ¿Cuántos kbit/s en bruto?`, kb, 'kbit/s', `${c} × ${fs} × ${b} = ${fmt(c * fs * b, 0)} bit/s = ${fmt(kb, 2)} kbit/s. Por eso los nodos suelen enviar resúmenes (media, máximo, RMS) y no las muestras.`, Math.max(0.01, kb * 0.02)), c: 'io_datavol' };
  }), 'io_sampling');
  Gen.add('io_subnet', gh('io_subnet', () => {
    const c = ri(0, 2);
    if (c === 0) { const p = pick([22, 23, 24, 25, 26, 27, 28]), h = 2 ** (32 - p) - 2; return { ...N(`¿Cuántos equipos caben en una red /${p}?`, h, 'equipos', `Quedan ${32 - p} bits para equipos: 2${sup(32 - p)} = ${2 ** (32 - p)} direcciones, menos la de red y la de difusión: ${h}.`), c: 'io_masks' }; }
    if (c === 1) {
      const a = ri(0, 3), b = Math.random() < 0.5 ? a : (a + ri(1, 3)) % 10, x = ri(2, 250), y = ri(2, 250);
      const q = `Máscara 255.255.255.0 (/24). Nodo 192.168.${a}.${x} y broker 192.168.${b}.${y}. ¿Hablan sin pasar por el router?`;
      return a === b ? MC(q, 'Sí: los tres primeros bytes coinciden', ['No: el último byte es distinto', 'No: hace falta una máscara /16', 'Solo si el DNS los conoce'], 'Con /24 la red son los tres primeros bytes; el último es el equipo.') : MC(q, 'No: el tercer byte es distinto, son redes diferentes', ['Sí: los dos empiezan por 192.168', 'Sí: la máscara es la misma', 'Solo si el DNS los conoce'], 'Con /24 deben coincidir los tres primeros bytes; si no, el paquete va a la puerta de enlace.');
    }
    const x = ri(1, 254), net = Math.floor(x / 64) * 64, w32 = Math.floor(x / 32) * 32;
    return MC(`Un equipo tiene 10.0.0.${x} con máscara /26 (255.255.255.192). ¿Cuál es la dirección de su red?`, `10.0.0.${net}`, [`10.0.0.${x}`, `10.0.0.${w32}`, `10.0.0.${(net + 64) % 256}`, '10.0.0.0', `10.0.0.${net + 63}`], `/26 deja 6 bits para equipos: bloques de 64. ${x} cae en el bloque que empieza en ${net} (hasta ${net + 63}, que es la difusión).`, { c: 'io_masks' });
  }), 'io_net');
  const TOPICS = ['casa/salon/temperatura', 'casa/cocina/temperatura', 'casa/salon/humedad', 'casa/salon/sensor1/temperatura', 'casa/salon', 'casa', 'jardin/salon/temperatura', 'Casa/salon/temperatura', 'casa/cocina/luz/estado', 'casa/cocina/luz/estado/brillo', 'huerto/bancal1/humedad', 'huerto/bancal1/sonda/humedad', '$SYS/broker/uptime', 'casa/garaje/puerta/bateria', 'casa/garaje/bateria', '/casa/salon/temperatura', 'huerto/bancal2/humedad'];
  const FILTERS = ['casa/+/temperatura', 'casa/salon/#', 'casa/#', '+/salon/temperatura', 'casa/+/+/bateria', 'huerto/+/humedad', 'huerto/#', '+/+/temperatura', 'casa/+/luz/#', '#', 'casa/+'];
  Gen.add('io_topicMatch', gh('io_topicMatch', () => {
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
  }), 'io_topics');
  Gen.add('io_dbm', gh('io_dbm', () => {
    if (Math.random() < 0.5) {
      const a = -ri(4, 7) * 10, d = pick([3, 6, 10, 20]), b = a - d, r = 10 ** (d / 10);
      return MC(`El nodo A recibe ${a} dBm y el B ${b} dBm. ¿Cuánta más potencia le llega a A?`, `Unas ${fmt(r, 0)} veces más`, [`${d} veces más`, `Un ${fmt(d / Math.abs(a) * 100, 0)} % más`, `Unas ${fmt(r * 10, 0)} veces más`, 'La misma: solo cambia el signo'], `Cada 10 dB son ×10 y cada 3 dB, ×2: ${d} dB ≈ ×${fmt(r, 0)}.`);
    }
    const p = pick([20, 10, 0, -10, -20, -30]), mw = 10 ** (p / 10), f = x => (x >= 1 ? fmt(x, 0) : fmt(x, 3)) + ' mW';
    return MC(`¿Cuánta potencia son ${p} dBm?`, f(mw), [f(mw * 10), f(mw / 10), `${Math.abs(p)} mW`, f(mw * 100)], `0 dBm = 1 mW y cada 10 dB multiplica por 10: ${p} dBm = ${f(mw)}.`);
  }), 'io_dbm');

  /* ---------- visualizaciones ---------- */
  Object.assign(Widgets.VIZ, {
    io_sleep: {
      calc: p => { const ta = Math.min(p.ta, p.T), qa = p.Ia * ta, qs = p.Is / 1000 * (p.T - ta), avg = (qa + qs) / p.T; return { avg, dias: p.C / avg / 24, pSleep: qs / (qa + qs) }; },
      svg: (p, o) => {
        const w = Math.max(3, 122 * Math.min(1, p.ta / p.T));
        let d = 'M20 100'; for (let k = 0; k < 2; k++) { const x = 22 + k * 130; d += `H${x}V40H${x + w}V100`; } d += 'H280';
        const fa = 1 - o.pSleep, wa = 260 * fa;
        return `<svg viewBox="0 0 300 204" class="viz"><path d="M20 108H280" stroke="var(--line)"/><path d="${d}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          <text x="${Math.min(200, 28 + w)}" y="36" class="vizsm">despierto ${num(p.Ia, 0)} mA · ${num(Math.min(p.ta, p.T), 1)} s</text>
          <text x="280" y="122" class="vizsm" text-anchor="end">dormido ${p.Is} µA · dos periodos de ${p.T} s (sin escala)</text>
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

  /* ---------- visualizaciones para tocar cada idea (2/2) ---------- */
  // Pequeñas utilidades de dibujo
  const tx = (x, y, s, c = 'vizsm', a = 'start', ex = '') => `<text x="${x}" y="${y}" class="${c}" text-anchor="${a}"${ex}>${s}</text>`;
  const bx = (x, y, w, h, on = true, lab = '', sub = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${on ? 'var(--ice)' : 'none'}" stroke="${on ? 'currentColor' : 'var(--line)'}" stroke-width="1.5" ${on ? '' : 'stroke-dasharray="4 3"'}/>${lab ? tx(x + w / 2, y + (sub ? h / 2 - 1 : h / 2 + 4), lab, 'vizsm', 'middle', ` style="fill:${on ? 'currentColor' : 'var(--muted)'};font-weight:700"`) : ''}${sub ? tx(x + w / 2, y + h / 2 + 11, sub, 'vizsm', 'middle', ' style="font-size:9.5px"') : ''}`;
  const ok = (x, y, good) => good ? `<path d="M${x - 5} ${y}l3.5 3.5 6.5-8" stroke="var(--ok)" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : `<path d="M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8" stroke="var(--err)" stroke-width="2.4" stroke-linecap="round"/>`;
  const cross = (x, y) => `<path d="M${x - 9} ${y - 9}l18 18M${x + 9} ${y - 9}l-18 18" stroke="var(--err)" stroke-width="3.5" stroke-linecap="round"/>`;
  const ln = (d, col = 'currentColor', w = 1.8, ex = '') => `<path d="${d}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"${ex}/>`;
  const dot = (x, y, col = 'var(--led)', r = 4.5) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${col}"/>`;
  const V = (h, body) => `<svg viewBox="0 0 300 ${h}" class="viz">${body}</svg>`;
  // Punto que recorre una polilínea: f de 0 a 1
  const along = (pts, f) => {
    const seg = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    let s = Math.max(0, Math.min(1, f)) * L;
    for (let i = 0; i < seg.length; i++) { if (s <= seg[i] || i === seg.length - 1) { const k = seg[i] ? Math.min(1, s / seg[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } s -= seg[i]; }
    return pts[pts.length - 1];
  };
  const fmtB = b => b >= 1e9 ? num(b / 1e9, 2) + ' GB' : b >= 1e6 ? num(b / 1e6, 2) + ' MB' : b >= 1e3 ? num(b / 1e3, 1) + ' kB' : num(b, 0) + ' bytes';
  const fmtT = s => s >= 86400 ? num(s / 86400, 1) + (s === 86400 ? ' día' : ' días') : s >= 3600 ? num(s / 3600, 1) + ' h' : s >= 60 ? num(s / 60, 1) + ' min' : num(s, s < 10 ? 1 : 0) + ' s';

  Object.assign(Widgets.VIZ, {
    /* Cadena de un sistema: averías y decisión local */
    io_chain: { anim: true,
      calc: p => { const k = p.corte, loc = p.local; const panel = k === 1 || k === 2 ? 0 : 1, hist = k === 0 ? 1 : 0, alarma = loc || k === 0 || k === 3 ? 1 : 0; return { panel, hist, alarma, soloHist: hist === 0 && panel === 1 ? 1 : 0, alarmaSinRed: k === 1 && alarma ? 1 : 0 }; },
      svg: (p, o, t) => {
        const k = p.corte, f = (t % 2.4) / 2.4, AV = ['ninguna', 'se cae el WiFi', 'se apaga el broker', 'se cae la base de datos'];
        const main = [[39, 37], [111, 37], [183, 37], [255, 37], [255, 82]];
        const stop = k === 1 ? 0.33 : k === 2 ? 0.62 : 1;
        let s = ln('M72 37H78M144 37H150M216 37H222', 'currentColor') + ln('M255 50V82H111V96M183 82V96M255 82V96', k === 1 || k === 2 ? 'var(--line)' : 'currentColor');
        s += ln('M78 109H72', o.alarma && !p.local ? 'var(--led)' : 'var(--line)', 1.8, ' stroke-dasharray="4 3"');
        if (p.local) s += ln('M100 50L52 96', 'var(--ok)', 2.2, ' stroke-dasharray="4 3"');
        s += bx(6, 24, 66, 26, true, 'Sensor') + bx(78, 24, 66, 26, true, 'Nodo') + bx(150, 24, 66, 26, k !== 1, 'WiFi') + bx(222, 24, 66, 26, k !== 2, 'Broker');
        s += bx(78, 96, 66, 26, k !== 1 && k !== 2, 'Automatiz.') + bx(150, 96, 66, 26, o.hist === 1, 'Historial') + bx(222, 96, 66, 26, o.panel === 1, 'Panel');
        s += `<rect x="6" y="96" width="66" height="26" rx="6" fill="${o.alarma ? 'var(--err)' : 'none'}" stroke="${o.alarma ? 'var(--err)' : 'var(--line)'}" stroke-width="1.5"${o.alarma ? ' class="a-blink"' : ''}/>` + tx(39, 113, 'Sirena', 'vizsm', 'middle', ` style="font-weight:700;fill:${o.alarma ? '#fff' : 'var(--muted)'}"`);
        if (k === 1) s += cross(183, 37); if (k === 2) s += cross(255, 37); if (k === 3) s += cross(183, 109);
        const [x, y] = along(main, Math.min(f, stop)); s += dot(x, y);
        if (f > 0.99 * stop && stop === 1) s += dot(111, 96) + dot(183, 96, k === 3 ? 'var(--err)' : 'var(--led)') + dot(255, 96);
        s += tx(6, 142, 'Hay agua en el suelo · avería: <tspan style="font-weight:700;fill:currentColor">' + AV[k] + '</tspan>') + tx(6, 157, p.local ? 'La alarma la decide el propio nodo' : 'La alarma la decide el servidor (automatización)');
        s += tx(6, 176, `Panel en directo: ${o.panel ? 'sí' : 'no'} · Historial: ${o.hist ? 'se guarda' : 'se pierde'}`, 'vizlab');
        s += tx(6, 194, `Sirena: ${o.alarma ? 'SUENA' : 'no suena'}`, 'vizlab', 'start', o.alarma ? '' : ' style="fill:var(--err)"');
        return V(202, s);
      }
    },
    /* Volumen de datos y latencia de un nodo que duerme */
    io_datarate: {
      calc: p => { const envios = 86400 / p.s, perDia = envios * p.B; return { envios, perDia, mbMes: perDia * 30 / 1e6, espera: p.s }; },
      svg: (p, o) => {
        let s = tx(10, 18, `Un mensaje de ${p.B} bytes cada ${fmtT(p.s)}`, 'vizlab');
        s += `<rect x="10" y="30" width="280" height="22" rx="4" fill="var(--line)"/>`;
        if (o.envios > 140) s += `<rect x="10" y="30" width="280" height="22" rx="4" fill="var(--led)" opacity=".75"/>`;
        else for (let i = 0; i < o.envios; i++) { const x = 10 + 280 * (i + 0.5) / o.envios; s += ln(`M${x.toFixed(1)} 30V52`, 'var(--led)', 2); }
        s += tx(10, 66, '0 h') + tx(150, 66, 'un día', 'vizsm', 'middle') + tx(290, 66, '24 h', 'vizsm', 'end');
        s += tx(10, 92, `Envíos al día: ${num(o.envios, 0)}`, 'vizlab') + tx(10, 112, `Al día: ${fmtB(o.perDia)}`, 'vizlab') + tx(10, 132, `Al mes (30 días): ${fmtB(o.perDia * 30)}`, 'vizbig');
        s += tx(10, 158, `Si el nodo duerme entre envíos, una orden`) + tx(10, 174, `puede esperar hasta ${fmtT(o.espera)} a que despierte.`, 'vizsm', 'start', ' style="font-weight:700;fill:currentColor"');
        return V(184, s);
      }
    },
    /* Elegir radio por requisitos */
    io_radiopick: {
      calc: p => {
        const R = [[50, 3, 0, 0], [30, 2, 1, 0], [100, 1, 1, 0], [15000, 0, 1, 0], [1e9, 1, 1, 0], [1e9, 2, 1, 1]];
        const fit = R.map(([d, dat, bat, mov]) => p.d <= d && p.dat <= dat && (!p.pila || bat) && (!p.mov || mov) ? 1 : 0);
        const order = p.pila ? [2, 1, 3, 4, 5, 0] : [0, 2, 1, 3, 4, 5]; let rec = -1; for (const i of order) if (fit[i]) { rec = i; break; }
        return { rec, n: fit.reduce((a, b) => a + b, 0), wifi: fit[0], lora: fit[3], ltem: fit[5], fit };
      },
      svg: (p, o) => {
        const N = ['WiFi', 'Bluetooth LE', 'Zigbee / Thread', 'LoRaWAN', 'NB-IoT', 'LTE-M'], DAT = ['unos bytes', 'kB al día', 'MB al día', 'vídeo'];
        const R = [[50, 3, 0, 0], [30, 2, 1, 0], [100, 1, 1, 0], [15000, 0, 1, 0], [1e9, 1, 1, 0], [1e9, 2, 1, 1]];
        let s = tx(8, 14, `${p.d >= 1000 ? num(p.d / 1000, 0) + ' km' : p.d + ' m'} · ${DAT[p.dat]} · ${p.pila ? 'a pila' : 'enchufado'} · ${p.mov ? 'se mueve lejos' : 'fijo'}`, 'vizlab');
        ['Alcance', 'Datos', 'Energía', 'Movim.'].forEach((h, j) => { s += tx(150 + j * 38, 32, h, 'vizsm', 'middle', ' style="font-size:9.5px"'); });
        N.forEach((n, i) => {
          const y = 40 + i * 24, r = R[i], hi = o.rec === i;
          s += `<rect x="4" y="${y}" width="292" height="21" rx="5" fill="${hi ? 'var(--ok)' : o.fit[i] ? 'var(--ice)' : 'none'}" opacity="${hi ? 0.28 : 1}"/>`;
          s += tx(10, y + 15, n, hi ? 'vizlab' : 'vizsm');
          [p.d <= r[0], p.dat <= r[1], !p.pila || r[2], !p.mov || r[3]].forEach((g, j) => { s += ok(150 + j * 38, y + 11, g); });
        });
        s += tx(8, 196, o.rec < 0 ? 'Ninguna encaja: revisa los requisitos' : `Recomendada: ${N[o.rec]}${o.n > 1 ? ` (encajan ${o.n})` : ''}`, 'vizbig');
        return V(204, s);
      }
    },
    /* Nube, local o híbrido cuando se cae internet */
    io_outage: {
      calc: p => { const a = p.arq, net = p.inet; const luz = a === 0 ? net : 1, remoto = a === 1 ? 0 : net, salen = a === 0 ? 2 : a === 2 ? 1 : 0; return { luz, remoto, salen, luzSinNet: !net && luz ? 1 : 0, mejor: a === 2 ? 1 : 0 }; },
      svg: (p, o) => {
        const A = ['Todo en la nube del fabricante', 'Todo en un servidor de casa', 'Híbrida: lo crítico en casa'];
        let s = `<rect x="6" y="40" width="150" height="104" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>` + tx(14, 56, 'Tu casa', 'vizlab');
        s += bx(16, 66, 60, 26, true, 'Sensor') + bx(86, 66, 60, 26, true, 'Luz');
        s += bx(16, 104, 130, 28, p.arq !== 0, p.arq === 0 ? '(sin servidor)' : 'Servidor de casa');
        s += `<path d="M232 30a22 16 0 0 1 40 6a16 13 0 0 1-6 25h-58a14 12 0 0 1 4-24a18 14 0 0 1 20-7z" fill="${p.arq === 1 ? 'none' : 'var(--ice)'}" stroke="${p.arq === 1 ? 'var(--line)' : 'currentColor'}" stroke-width="1.5"/>` + tx(240, 52, 'Nube', 'vizsm', 'middle', ' style="font-weight:700;fill:currentColor"');
        s += ln('M156 92H210', p.inet ? 'var(--ok)' : 'var(--err)', 2.5, p.inet ? ' class="a-flow-slow"' : ' stroke-dasharray="3 5"');
        if (!p.inet) s += cross(183, 92);
        s += tx(183, 84, 'internet', 'vizsm', 'middle');
        s += tx(6, 18, A[p.arq], 'vizlab') + tx(6, 32, p.inet ? 'Internet funciona' : 'Internet caído', 'vizsm');
        s += tx(6, 166, `La luz con el sensor: ${o.luz ? 'funciona' : 'NO funciona'}`, 'vizlab', 'start', o.luz ? '' : ' style="fill:var(--err)"');
        s += tx(6, 184, `Verlo desde fuera: ${o.remoto ? 'sí' : 'no'} · Datos que salen: ${['ninguno', 'solo resúmenes', 'todos'][o.salen]}`, 'vizsm');
        return V(194, s);
      }
    },
    /* IP y máscara: misma red o vía router */
    io_subnet: {
      calc: p => {
        const m = p.m, A = [192, 168, 1, 10], B = [192, 168, p.c, p.d];
        const toN = a => ((a[0] << 24) >>> 0) + (a[1] << 16) + (a[2] << 8) + a[3], mask = m === 0 ? 0 : (0xFFFFFFFF << (32 - m)) >>> 0;
        const misma = ((toN(A) & mask) >>> 0) === ((toN(B) & mask) >>> 0) ? 1 : 0;
        return { misma, hosts: 2 ** (32 - m) - 2, juntosAncha: misma && m < 24 ? 1 : 0 };
      },
      svg: (p, o) => {
        const m = p.m, A = [192, 168, 1, 10], B = [192, 168, p.c, p.d];
        const row = (y, ip, lab) => { let s = tx(8, y + 15, lab, 'vizlab'); ip.forEach((b, i) => { const x = 40 + i * 62, bits = Math.max(0, Math.min(8, m - i * 8)); s += `<rect x="${x}" y="${y}" width="56" height="22" rx="4" fill="var(--line)"/>`; if (bits) s += `<rect x="${x}" y="${y}" width="${56 * bits / 8}" height="22" rx="4" fill="var(--led)" opacity=".55"/>`; s += tx(x + 28, y + 15, b, 'vizlab', 'middle'); }); return s; };
        let s = tx(8, 16, `Máscara /${m}: ${m} bits de red (color) y ${32 - m} de equipo`, 'vizsm');
        s += row(26, A, 'A') + row(56, B, 'B');
        s += bx(40, 98, 70, 26, true, 'A') + bx(222, 98, 70, 26, true, 'B') + bx(131, 140, 70, 26, true, 'Router');
        s += o.misma ? ln('M110 111H222', 'var(--ok)', 2.5, ' class="a-flow"') : ln('M75 124L150 140M182 140L257 124', 'var(--led)', 2.5, ' class="a-flow"');
        s += tx(166, 104, o.misma ? 'misma red: directo' : '', 'vizsm', 'middle');
        s += tx(8, 186, o.misma ? 'Misma red: se hablan directamente' : 'Redes distintas: pasa por el router', 'vizlab');
        s += tx(8, 202, `Caben ${num(o.hosts, 0)} equipos en la red /${m}`, 'vizsm');
        return V(208, s);
      }
    },
    /* Arranque de un nodo: WiFi, DHCP, DNS y conexión */
    io_boot: {
      calc: p => { const f = p.f, asoc = f !== 1 ? 1 : 0, ip = asoc && f !== 2 ? 1 : 0, dns = ip && f !== 3 ? 1 : 0, con = dns && f !== 4 ? 1 : 0; return { asoc, ip, dns, con, ipSinNombre: ip && !dns ? 1 : 0, asocSinIP: asoc && !ip ? 1 : 0, soloServidor: dns && !con ? 1 : 0 }; },
      svg: (p, o) => {
        const F = ['ningún fallo', 'clave del WiFi mal escrita', 'el router no da más direcciones', 'el DNS no responde', 'el servidor está apagado'];
        const st = [['1 · Asociarse al WiFi', o.asoc, 'clave correcta'], ['2 · DHCP: pedir IP', o.ip, 'IP 192.168.1.37'], ['3 · DNS: broker.casa', o.dns, '→ 192.168.1.10'], ['4 · Conectar al 1883', o.con, 'conectado']];
        let s = tx(8, 16, 'Avería: <tspan style="font-weight:700;fill:currentColor">' + F[p.f] + '</tspan>');
        let reached = true;
        st.forEach(([lab, g, det], i) => { const y = 28 + i * 30, done = reached; s += `<rect x="${8 + i * 10}" y="${y}" width="${200 - i * 10}" height="24" rx="5" fill="${done ? (g ? 'var(--ice)' : 'none') : 'none'}" stroke="${done ? (g ? 'currentColor' : 'var(--err)') : 'var(--line)'}" stroke-width="1.5"/>` + tx(16 + i * 10, y + 16, lab, done ? 'vizlab' : 'vizsm'); if (done) s += ok(222, y + 12, g) + (g ? tx(234, y + 16, det, 'vizsm', 'start', ' style="font-size:9.5px"') : ''); reached = reached && g; });
        const msg = !o.asoc ? 'WiFi: fallo de autenticación' : !o.ip ? 'Asociado, pero sin IP (0.0.0.0)' : !o.dns ? 'IP 192.168.1.37 · sin respuesta del DNS' : !o.con ? 'broker.casa = 192.168.1.10 · conexión rechazada' : 'MQTT conectado';
        s += `<rect x="8" y="152" width="284" height="40" rx="6" fill="#1b1f27"/>` + tx(16, 168, 'Monitor serie:', 'vizsm', 'start', ' style="fill:#9fb0c8"') + tx(16, 184, msg, 'vizsm', 'start', ' style="fill:#e8eef7;font-family:monospace"');
        return V(198, s);
      }
    },
    /* TCP frente a UDP con pérdidas */
    io_tcpudp: {
      calc: p => {
        const n = 12, L = p.loss / 100; let lleg = 0, env = p.proto ? 3 : 0; const st = [];
        for (let i = 0; i < n; i++) {
          if (!p.proto) { const lost = rnd(i * 7 + 3) < L; st.push(lost ? 0 : 1); env++; if (!lost) lleg++; }
          else { let k = 0; while (rnd(i * 7 + k * 31 + 3) < L && k < 8) k++; env += 2 * (k + 1); lleg++; st.push(k + 1); }
        }
        const perd = n - lleg; return { llegan: lleg, perdidos: perd, enviados: env, st, todosConPerdida: perd === 0 && p.loss > 0 && p.proto ? 1 : 0 };
      },
      svg: (p, o) => {
        let s = tx(8, 16, p.proto ? 'TCP: conexión, confirmaciones y reenvíos' : 'UDP: datagramas sueltos, sin confirmación', 'vizlab');
        s += tx(8, 32, p.proto ? 'Primero, el saludo en tres pasos (3 paquetes)' : 'Nadie avisa si uno se pierde', 'vizsm');
        o.st.forEach((v, i) => { const x = 10 + (i % 6) * 48, y = 44 + Math.floor(i / 6) * 44; s += `<rect x="${x}" y="${y}" width="40" height="34" rx="5" fill="${v ? 'var(--ice)' : 'none'}" stroke="${v ? 'var(--ok)' : 'var(--err)'}" stroke-width="1.8"/>` + tx(x + 20, y + 15, `#${i + 1}`, 'vizsm', 'middle', ' style="font-weight:700;fill:currentColor"') + tx(x + 20, y + 28, v === 0 ? 'perdido' : v > 1 ? `${v} envíos` : 'llega', 'vizsm', 'middle', ` style="font-size:9.5px;fill:${v === 0 ? 'var(--err)' : v > 1 ? 'var(--led)' : 'var(--muted)'}"`); });
        s += tx(8, 152, `Llegan ${o.llegan} de 12 · perdidos: ${o.perdidos}`, 'vizlab', 'start', o.perdidos ? ' style="fill:var(--err)"' : '');
        s += tx(8, 172, `Paquetes en el aire: ${o.enviados}${p.proto ? ' (datos, confirmaciones y reenvíos)' : ''}`, 'vizsm');
        return V(180, s);
      }
    },
    /* NAT: quién inicia la conexión */
    io_nat: { anim: true,
      calc: p => { const resp = p.quien === 0 ? 1 : 0, entra = p.quien === 1 && (p.fwd || p.vpn) ? 1 : 0; return { resp, entraFuera: p.quien === 1 && p.fwd ? 1 : 0, vpnOk: p.quien === 1 && p.vpn && !p.fwd ? 1 : 0, entra, expuesto: p.fwd }; },
      svg: (p, o, t) => {
        const f = (t % 2) / 2;
        let s = `<rect x="4" y="22" width="112" height="120" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>` + tx(10, 36, 'Casa (IP privadas)', 'vizsm');
        s += bx(12, 44, 96, 30, true, 'ESP32', '192.168.1.37') + bx(12, 100, 96, 30, true, 'Broker', '192.168.1.10');
        s += `<rect x="128" y="64" width="62" height="44" rx="6" fill="var(--ice)" stroke="currentColor" stroke-width="1.5"/>` + tx(159, 82, 'Router', 'vizsm', 'middle', ' style="font-weight:700;fill:currentColor"') + tx(159, 98, '203.0.113.7', 'vizsm', 'middle', ' style="font-size:9px"');
        s += bx(204, 30, 92, 30, true, 'Servidor', '198.51.100.20') + bx(204, 100, 92, 30, true, p.vpn ? 'Tu móvil' : 'Desconocido', p.vpn ? 'por la VPN' : 'internet');
        if (p.quien === 0) {
          s += ln('M108 59L128 78M190 76L204 48', 'var(--ok)', 2, ' class="a-flow"');
          const [x, y] = f < 0.5 ? along([[108, 59], [128, 78], [190, 76], [204, 48]], f * 2) : along([[204, 48], [190, 76], [128, 78], [108, 59]], f * 2 - 1); s += dot(x, y, f < 0.5 ? 'var(--led)' : 'var(--ok)');
          s += tx(8, 160, 'Tabla NAT: 192.168.1.37:50123 ↔ 203.0.113.7:61001', 'vizsm', 'start', ' style="font-family:monospace;font-size:9.5px"');
          s += tx(8, 178, 'La respuesta vuelve por la misma conexión', 'vizlab');
        } else {
          const pass = p.fwd || p.vpn, col = p.vpn && !p.fwd ? 'var(--ok)' : p.fwd ? 'var(--err)' : 'var(--muted)';
          s += ln(pass ? 'M204 115L190 98M128 98L108 115' : 'M204 115L190 98', col, 2, ' class="a-flow"');
          const [x, y] = along(pass ? [[204, 115], [190, 98], [128, 98], [108, 115]] : [[204, 115], [190, 98]], f); s += dot(x, y, col);
          if (!pass) s += cross(198, 107);
          s += tx(8, 160, p.fwd ? 'Puerto 1883 redirigido al broker' : p.vpn ? 'Túnel VPN cifrado (WireGuard)' : 'Nadie lo pidió desde dentro: no hay entrada en la tabla', 'vizsm');
          s += tx(8, 178, p.fwd ? 'Entra… y también cualquier escáner de internet' : p.vpn ? 'Entras tú, autenticado, sin abrir el broker' : 'El router descarta el paquete', 'vizlab', 'start', p.fwd ? ' style="fill:var(--err)"' : '');
        }
        s += tx(8, 14, p.quien === 0 ? 'El ESP32 abre una conexión hacia fuera' : 'Alguien de fuera intenta llegar al broker', 'vizlab');
        return V(188, s);
      }
    },
    /* RSSI: distancia, paredes y metal */
    io_rssi: {
      calc: p => { const rssi = Math.round(20 - (40 + 30 * Math.log10(p.d)) - 5 * p.w - (p.metal ? 20 : 0)); return { rssi, buenoConParedes: rssi >= -67 && p.w >= 2 ? 1 : 0, metalMalo: p.metal && rssi < -80 ? 1 : 0 }; },
      svg: (p, o) => {
        const X = r => 20 + (Math.max(-95, Math.min(-30, r)) + 95) / 65 * 260;
        let s = tx(8, 16, `Router a ${p.d} m · ${p.w} pared${p.w === 1 ? '' : 'es'}${p.metal ? ' · en metal' : ''}`, 'vizlab');
        s += bx(8, 26, 54, 26, true, 'Router'); for (let i = 0; i < p.w; i++) s += `<rect x="${92 + i * 26}" y="22" width="9" height="36" fill="var(--muted)" opacity=".6"/>`;
        s += `<rect x="226" y="24" width="66" height="30" rx="5" fill="${p.metal ? 'var(--line)' : 'none'}" stroke="${p.metal ? 'currentColor' : 'none'}" stroke-width="2"/>` + bx(232, 28, 54, 22, true, 'ESP32');
        s += ln('M62 39H226', 'var(--led)', 1.5, ' class="a-flow-slow"');
        [[-95, -80, 'var(--err)', 'malo'], [-80, -70, '#E8A33D', 'justo'], [-70, -60, '#8BC34A', 'bueno'], [-60, -30, 'var(--ok)', 'excelente']].forEach(([a, b, c, l]) => { s += `<rect x="${X(a)}" y="72" width="${X(b) - X(a)}" height="16" fill="${c}" opacity=".7"/>` + tx((X(a) + X(b)) / 2, 100, l, 'vizsm', 'middle'); });
        s += `<path d="M${X(o.rssi)} 66l-6-9h12z" fill="currentColor"/>`;
        s += tx(20, 116, '−95', 'vizsm') + tx(280, 116, '−30 dBm', 'vizsm', 'end');
        const mw = 10 ** (o.rssi / 10), pw = mw >= 1e-6 ? num(mw * 1e6, 1) + ' nW' : num(mw * 1e9, 1) + ' pW';
        s += tx(8, 142, `RSSI: ${num(o.rssi, 0)} dBm`, 'vizbig') + tx(8, 162, `Llega ${pw}: ${mw >= 1e-6 ? 'una millonésima de mW o más' : 'menos de una millonésima de mW'}`, 'vizsm');
        s += tx(8, 180, 'Valores orientativos: cada casa es distinta', 'vizsm');
        return V(188, s);
      }
    },
    /* Canales WiFi (y Zigbee) en 2,4 GHz */
    io_wifich: {
      calc: p => {
        const nb = p.v ? [1, 11] : [1, 6], comparte = nb.filter(c => c === p.ch).length, solapes = nb.filter(c => c !== p.ch && Math.abs(c - p.ch) <= 3).length;
        const wifis = nb.concat(p.ch), zbf = 2405 + 5 * ((p.zb || 11) - 11), zbLibre = p.zb ? (wifis.every(c => Math.abs(zbf - (2407 + 5 * c)) >= 11) ? 1 : 0) : 0;
        return { comparte, solapes, libre: !comparte && !solapes ? 1 : 0, zbLibre };
      },
      svg: (p, o) => {
        const X = f => 10 + (f - 2400) / 84 * 280, nb = p.v ? [1, 11] : [1, 6];
        const bump = (c, col, op) => { const f = 2407 + 5 * c; return `<path d="M${X(f - 10).toFixed(1)} 120Q${X(f - 9).toFixed(1)} 50 ${X(f).toFixed(1)} 50T${X(f + 10).toFixed(1)} 120" fill="${col}" opacity="${op}" stroke="${col}" stroke-width="1.5"/>`; };
        let s = ln('M10 120H290', 'currentColor', 1.5);
        nb.forEach(c => { s += bump(c, 'var(--muted)', 0.35) + tx(X(2407 + 5 * c), 44, `vecino ${c}`, 'vizsm', 'middle'); });
        const bad = o.solapes > 0;
        s += bump(p.ch, bad ? 'var(--err)' : o.comparte ? '#E8A33D' : 'var(--ok)', 0.45) + tx(X(2407 + 5 * p.ch), 32, `tu red: ${p.ch}`, 'vizlab', 'middle');
        if (p.zb) { const fz = 2405 + 5 * (p.zb - 11); s += `<rect x="${(X(fz - 1)).toFixed(1)}" y="70" width="${(X(fz + 1) - X(fz - 1)).toFixed(1)}" height="50" fill="${o.zbLibre ? 'var(--ok)' : 'var(--err)'}"/>` + tx(X(fz), 64, `Zigbee ${p.zb}`, 'vizsm', 'middle', ' style="font-weight:700;fill:currentColor"'); }
        for (const c of [1, 6, 11, 13]) s += tx(X(2407 + 5 * c), 134, c, 'vizsm', 'middle');
        s += tx(10, 148, '2400 MHz', 'vizsm') + tx(290, 148, '2484 MHz', 'vizsm', 'end');
        s += tx(10, 170, o.solapes ? `Pisa a ${o.solapes} red${o.solapes > 1 ? 'es' : ''} sin turnarse: interferencia` : o.comparte ? 'Comparte canal: las redes se turnan' : 'Canal limpio: no pisa a nadie', 'vizlab', 'start', o.solapes ? ' style="fill:var(--err)"' : '');
        if (p.zb) s += tx(10, 188, o.zbLibre ? 'El canal Zigbee cae en un hueco libre' : 'El canal Zigbee cae dentro de una red WiFi', 'vizsm');
        return V(p.zb ? 196 : 180, s);
      }
    },
    /* HTTP: método, ruta y credencial → código de estado */
    io_http: {
      calc: p => {
        const m = p.m, r = p.r, a = p.a; let code;
        if (r === 3) code = 404;
        else if (r === 0) code = m === 0 ? 200 : 405;
        else if (r === 1) code = m === 0 ? 200 : m === 1 ? (a ? 201 : 401) : 405;
        else code = m === 0 ? 200 : m === 2 ? (a ? 200 : 401) : 405;
        return { code, clase: Math.floor(code / 100), putOk: m === 2 && code === 200 ? 1 : 0 };
      },
      svg: (p, o) => {
        const M = ['GET', 'POST', 'PUT', 'DELETE'][p.m], R = ['/api/estado', '/api/lecturas', '/api/umbral', '/api/sotano'][p.r];
        const body = p.m === 1 ? '{"t":21.4}' : p.m === 2 ? '{"valor":30}' : '';
        const TXT = { 200: 'OK', 201: 'Created', 401: 'Unauthorized', 404: 'Not Found', 405: 'Method Not Allowed' };
        const resp = o.code === 200 ? (p.r === 0 ? '{"t":21.4,"h":48}' : p.r === 1 ? '[{"t":21.4},{"t":21.6}]' : '{"umbral":30}') : o.code === 201 ? '{"id":815}' : '';
        const mono = ' style="font-family:monospace;font-size:10.5px;fill:currentColor"';
        let s = tx(8, 14, 'Petición (cliente → servidor)', 'vizsm');
        s += `<rect x="6" y="20" width="288" height="${body ? 66 : 52}" rx="6" fill="var(--ice)"/>`;
        s += tx(14, 36, `${M} ${R} HTTP/1.1`, 'vizsm', 'start', mono) + tx(14, 50, 'Host: nodo.local', 'vizsm', 'start', mono) + tx(14, 64, p.a ? 'Authorization: Bearer 9f2c…' : '(sin credencial)', 'vizsm', 'start', mono);
        if (body) s += tx(14, 78, body, 'vizsm', 'start', mono);
        const y0 = body ? 100 : 86, col = o.clase === 2 ? 'var(--ok)' : 'var(--err)';
        s += tx(8, y0 + 8, 'Respuesta (servidor → cliente)', 'vizsm');
        s += `<rect x="6" y="${y0 + 14}" width="288" height="${resp ? 40 : 26}" rx="6" fill="none" stroke="${col}" stroke-width="2"/>`;
        s += tx(14, y0 + 31, `HTTP/1.1 ${o.code} ${TXT[o.code]}`, 'vizsm', 'start', ` style="font-family:monospace;font-size:11px;font-weight:700;fill:${col}"`);
        if (resp) s += tx(14, y0 + 46, resp, 'vizsm', 'start', mono);
        s += tx(8, y0 + (resp ? 74 : 60), o.clase === 2 ? '2xx: éxito' : o.code === 404 ? '4xx: ese recurso no existe' : o.code === 401 ? '4xx: falta autenticarse' : '4xx: ese método no vale en esa ruta', 'vizlab');
        return V(y0 + (resp ? 82 : 68), s);
      }
    },
    /* Idempotencia: repetir PUT o POST */
    io_idem: {
      calc: p => { const fin = p.m === 0 ? 30 : 7 + p.rep, esperado = p.m === 0 ? 30 : 8; return { fin, error: fin - esperado, idemOK: p.m === 0 && p.rep >= 3 ? 1 : 0 }; },
      svg: (p, o) => {
        const req = p.m === 0 ? 'PUT /umbral  {"valor":30}' : 'POST /contador/sumar';
        let s = tx(8, 16, p.m === 0 ? 'Fijar un valor (idempotente)' : 'Sumar uno (no idempotente)', 'vizlab');
        for (let i = 0; i < p.rep; i++) s += `<rect x="8" y="${26 + i * 24}" width="196" height="20" rx="4" fill="var(--ice)" class="a-fade a-d${i + 1}"/>` + tx(14, 40 + i * 24, req, 'vizsm', 'start', ' style="font-family:monospace;font-size:10px;fill:currentColor"');
        s += bx(216, 40, 76, 50, true, p.m === 0 ? 'umbral' : 'contador');
        s += tx(254, 112, String(o.fin), 'vizbig', 'middle', ' style="font-size:22px"');
        s += tx(8, 140, p.m === 0 ? 'Empezaba en 25; ahora vale 30' : 'Empezaba en 7; querías sumar 1 → 8', 'vizsm');
        s += tx(8, 162, o.error ? `Has contado ${o.error} de más por repetir` : `Enviada ${p.rep} ${p.rep > 1 ? 'veces' : 'vez'}: resultado correcto`, 'vizlab', 'start', o.error ? ' style="fill:var(--err)"' : '');
        return V(172, s);
      }
    },
    /* Tamaño de la carga: JSON largo, JSON corto o binario */
    io_bytes: {
      calc: p => {
        const F = [['temperatura', 't', '21.4'], ['humedad', 'h', '48'], ['bateria', 'b', '3.91'], ['co2', 'c', '812'], ['rssi', 'r', '-61'], ['presion', 'p', '1013.2']].slice(0, p.f);
        const txt = p.fmt === 2 ? '' : '{' + F.map(([l, c, v]) => `"${p.fmt ? c : l}":${v}`).join(',') + '}';
        const bytes = p.fmt === 2 ? 2 * p.f : txt.length;
        return { bytes, txt, ocho4: p.f === 4 && bytes === 8 ? 1 : 0 };
      },
      svg: (p, o) => {
        let s = tx(8, 16, ['JSON con nombres largos', 'JSON con claves de una letra', 'Binario: 2 bytes por valor'][p.fmt] + ` · ${p.f} valor${p.f > 1 ? 'es' : ''}`, 'vizlab');
        if (o.txt) { const lines = o.txt.match(/.{1,40}/g); lines.forEach((l, i) => { s += tx(8, 36 + i * 14, l.replace(/</g, '&lt;'), 'vizsm', 'start', ' style="font-family:monospace;font-size:10.5px;fill:currentColor"'); }); }
        else s += tx(8, 36, Array.from({ length: p.f }, (_, i) => ['00 D6', '00 30', '01 87', '03 2C', 'FF C3', '27 94'][i]).join(' '), 'vizsm', 'start', ' style="font-family:monospace;font-size:10.5px;fill:currentColor"');
        const n = o.bytes, cols = 20, size = 13;
        for (let i = 0; i < Math.min(n, 100); i++) s += `<rect x="${8 + (i % cols) * (size + 1)}" y="${80 + Math.floor(i / cols) * (size + 1)}" width="${size}" height="${size}" rx="2" fill="${p.fmt === 2 ? 'var(--ok)' : 'var(--led)'}" opacity=".75"/>`;
        s += tx(8, 166, `${n} bytes`, 'vizbig') + tx(80, 166, '(cada cuadrado es un byte)', 'vizsm');
        s += tx(8, 184, p.fmt === 2 ? 'El servidor sabe qué significa cada pareja de bytes' : 'Llaves, comillas, nombres y comas también ocupan', 'vizsm');
        return V(192, s);
      }
    },
    /* Servidor en el nodo: un delay largo hace esperar a las peticiones */
    io_srvcli: {
      calc: p => {
        const per = p.dl + 0.01, arr = [1.3, 4.7, 8.2, 12.9, 17.5];
        const w = arr.map(a => Math.ceil(a / per) * per - a + 0.005);
        return { esperaMax: Math.max(...w), waits: w, per };
      },
      svg: (p, o) => {
        const X = t => 10 + t / 20 * 280, arr = [1.3, 4.7, 8.2, 12.9, 17.5];
        let s = tx(8, 16, `loop(): handleClient() y luego delay(${num(p.dl * 1000, 0)})`, 'vizlab');
        s += ln('M10 70H290', 'var(--line)', 1.5);
        if (o.per > 0.3) for (let t = 0; t <= 20; t += o.per) s += ln(`M${X(t).toFixed(1)} 58V82`, 'var(--ok)', 2.5);
        else s += `<rect x="10" y="58" width="280" height="24" fill="var(--ok)" opacity=".35"/>`;
        arr.forEach((a, i) => { const w = o.waits[i]; s += `<path d="M${X(a).toFixed(1)} 36l-5-8h10z" fill="var(--led)"/>`; if (w > 0.15) s += `<rect x="${X(a).toFixed(1)}" y="88" width="${(X(a + w) - X(a)).toFixed(1)}" height="10" rx="3" fill="var(--err)" opacity=".7"/>`; });
        s += tx(10, 116, '0 s') + tx(290, 116, '20 s', 'vizsm', 'end');
        s += tx(8, 136, 'triángulo: llega una petición · verde: el nodo atiende · rojo: espera', 'vizsm', 'start', ' style="font-size:9.5px"');
        s += tx(8, 158, `Espera máxima: ${fmtT(o.esperaMax)}`, 'vizbig');
        return V(168, s);
      }
    },
    /* Sondeo frente a empuje */
    io_poll: {
      calc: p => { const push = p.modo === 1, pet = push ? 10 : 86400 / p.T, ret = push ? 0.1 : p.T; return { peticiones: pet, retrasoMax: ret, rapidoSondeo: !push && ret <= 5 ? 1 : 0, eficiente: ret <= 5 && pet <= 100 ? 1 : 0 }; },
      svg: (p, o) => {
        const push = p.modo === 1, X = t => 10 + t / 3600 * 280, ev = [700, 1900, 2950];
        let s = tx(8, 16, push ? 'Empuje: quien tiene el dato avisa al cambiar' : `Sondeo: preguntar cada ${fmtT(p.T)}`, 'vizlab');
        s += ln('M10 70H290', 'var(--line)', 1.5);
        if (!push) { if (p.T >= 30) for (let t = 0; t <= 3600; t += p.T) s += ln(`M${X(t).toFixed(1)} 60V80`, 'var(--muted)', 1.2); else s += `<rect x="10" y="60" width="280" height="20" fill="var(--muted)" opacity=".35"/>`; }
        ev.forEach(e => { const seen = push ? e : Math.ceil(e / p.T) * p.T; s += `<circle cx="${X(e).toFixed(1)}" cy="46" r="5" fill="var(--led)"/>`; s += ln(`M${X(e).toFixed(1)} 52L${X(seen).toFixed(1)} 90`, 'var(--led)', 1.5); s += dot(X(seen), 94, 'var(--ok)', 4); });
        s += tx(10, 112, 'una hora · arriba: cambios · abajo: cuándo se ven', 'vizsm');
        s += tx(8, 136, `Mensajes al día: ${num(o.peticiones, 0)}${push ? ' (uno por cambio)' : ''}`, 'vizlab');
        s += tx(8, 156, `Un cambio tarda en verse: hasta ${push ? 'menos de 1 s' : fmtT(o.retrasoMax)}`, 'vizlab');
        return V(166, s);
      }
    },
    /* Broker MQTT repartiendo por temas */
    io_mqtt: { anim: true,
      calc: p => {
        const TS = p.set ? IO_TOPICS1 : IO_TOPICS0, FS = p.set ? IO_FILT1 : IO_FILT0, SUB = p.set ? IO_SUBS1 : IO_SUBS0;
        const topic = TS[p.t], filt = FS[p.f], val = topicValid(filt);
        const subs = SUB.map(([, f]) => topicMatch(f, topic) ? 1 : 0), tu = val && topicMatch(filt, topic) ? 1 : 0;
        const entregas = subs.reduce((a, b) => a + b, 0) + tu;
        return { entregas, tu, invalido: val ? 0 : 1, tuMas: tu && filt.includes('+') ? 1 : 0, hondo: tu && filt.includes('#') && topic.split('/').length >= 4 ? 1 : 0, sysNo: topic[0] === '$' && filt === '#' ? 1 : 0, subs };
      },
      svg: (p, o, t) => {
        const TS = p.set ? IO_TOPICS1 : IO_TOPICS0, FS = p.set ? IO_FILT1 : IO_FILT0, SUB = p.set ? IO_SUBS1 : IO_SUBS0, topic = TS[p.t], f = (t % 2) / 2;
        const rows = SUB.concat([['Tú', FS[p.f]]]), mono = ' style="font-family:monospace;font-size:9px"';
        let s = tx(8, 14, 'Publica en:', 'vizsm') + tx(70, 14, topic, 'vizsm', 'start', ' style="font-family:monospace;font-size:11px;font-weight:700;fill:currentColor"');
        const yb = 40 + rows.length * 15;
        s += bx(6, yb - 16, 56, 32, true, 'Nodo') + `<rect x="92" y="${yb - 20}" width="62" height="40" rx="8" fill="var(--led)" opacity=".25" stroke="currentColor" stroke-width="1.5"/>` + tx(123, yb + 4, 'Broker', 'vizsm', 'middle', ' style="font-weight:700;fill:currentColor"');
        s += ln(`M62 ${yb}H92`, 'var(--led)', 2);
        const [x0, y0] = along([[62, yb], [92, yb]], Math.min(1, f * 2)); if (f < 0.5) s += dot(x0, y0);
        rows.forEach(([name, filt], i) => {
          const y = 26 + i * 30, on = i < SUB.length ? o.subs[i] : o.tu, bad = i === SUB.length && o.invalido;
          s += `<rect x="164" y="${y}" width="132" height="26" rx="5" fill="${on ? 'var(--ok)' : 'none'}" fill-opacity="${on ? 0.22 : 0}" stroke="${bad ? 'var(--err)' : on ? 'var(--ok)' : 'var(--line)'}" stroke-width="1.5"/>`;
          s += tx(168, y + 11, name + (bad ? ' · ¡no válida!' : ''), 'vizsm', 'start', ` style="font-size:9.5px;font-weight:700;fill:${bad ? 'var(--err)' : 'currentColor'}"`) + tx(168, y + 22, filt, 'vizsm', 'start', mono);
          s += ln(`M154 ${yb}L164 ${y + 13}`, on ? 'var(--ok)' : 'var(--line)', on ? 2 : 1);
          if (on && f >= 0.5) { const [x, yy] = along([[154, yb], [164, y + 13]], (f - 0.5) * 2); s += dot(x, yy, 'var(--ok)', 4); }
        });
        const hy = 32 + rows.length * 30;
        s += tx(8, hy, `El broker lo entrega a ${o.entregas} cliente${o.entregas === 1 ? '' : 's'}`, 'vizlab');
        return V(hy + 8, s);
      }
    },
    /* QoS con pérdidas */
    io_qos: {
      calc: p => {
        const L = p.loss / 100, n = 20; let perd = 0, dup = 0, paq = 0; const st = [];
        for (let i = 0; i < n; i++) {
          if (p.q === 0) { paq++; const lost = rnd(i * 13 + 5) < L; if (lost) perd++; st.push(lost ? 0 : 1); continue; }
          let copies = 0, k = 0, done = false;
          while (!done && k < 12) {
            const lostPub = rnd(i * 13 + k * 101 + 5) < L; paq++;
            if (!lostPub) { if (p.q === 1 || copies === 0) copies++; const lostAck = rnd(i * 17 + k * 53 + 11) < L; paq += p.q === 2 ? 3 : 1; if (!lostAck) done = true; }
            k++;
          }
          if (p.q === 2) copies = Math.min(1, copies);
          if (!copies) perd++; if (copies > 1) dup += copies - 1; st.push(copies);
        }
        return { perdidos: perd, dups: dup, paquetes: paq, st, dupSinPerd: perd === 0 && dup > 0 ? 1 : 0, exacto: p.q === 2 && p.loss > 0 && perd === 0 && dup === 0 ? 1 : 0 };
      },
      svg: (p, o) => {
        let s = tx(8, 16, ['QoS 0: como mucho una vez', 'QoS 1: al menos una vez', 'QoS 2: exactamente una vez'][p.q] + ` · ${p.loss} % de pérdidas`, 'vizlab');
        o.st.forEach((c, i) => { const x = 8 + (i % 10) * 29, y = 28 + Math.floor(i / 10) * 34; s += `<rect x="${x}" y="${y}" width="25" height="28" rx="4" fill="${c === 0 ? 'none' : c > 1 ? '#E8A33D' : 'var(--ok)'}" fill-opacity="${c > 1 ? 0.6 : 0.35}" stroke="${c === 0 ? 'var(--err)' : c > 1 ? '#E8A33D' : 'var(--ok)'}" stroke-width="1.6"/>` + tx(x + 12.5, y + 18, c === 0 ? '✗' : c > 1 ? '×' + c : i + 1, 'vizsm', 'middle', ` style="font-weight:700;fill:${c === 0 ? 'var(--err)' : 'currentColor'}"`); });
        s += tx(8, 116, `Perdidos: ${o.perdidos}`, 'vizlab', 'start', o.perdidos ? ' style="fill:var(--err)"' : '') + tx(110, 116, `Repetidos: ${o.dups}`, 'vizlab');
        s += tx(8, 136, `Paquetes en el aire para 20 mensajes: ${o.paquetes}`, 'vizsm');
        s += tx(8, 154, 'verde: llegó una vez · ámbar: llegó repetido · ✗: perdido', 'vizsm', 'start', ' style="font-size:9.5px"');
        return V(162, s);
      }
    },
    /* Mensajes retenidos */
    io_retain: {
      calc: p => { const ve = p.ret && !p.borrar ? 1 : 0; return { ve, borrado: p.ret && p.borrar ? 1 : 0 }; },
      svg: (p, o) => {
        const X = m => 20 + Math.log10(1 + m) / Math.log10(601) * 250;
        let s = tx(8, 16, '7:00 · la puerta publica “cerrada”' + (p.ret ? ' como retenido' : ' (normal)'), 'vizlab');
        s += ln('M20 60H280', 'var(--line)', 2) + dot(20, 60, 'var(--led)', 6) + tx(20, 80, '7:00', 'vizsm', 'middle');
        if (p.borrar) s += dot(X(p.llega / 2), 60, 'var(--muted)', 5) + tx(X(p.llega / 2), 48, 'retenido vacío', 'vizsm', 'middle', ' style="font-size:9.5px"');
        s += `<rect x="${X(p.llega) - 4}" y="50" width="8" height="20" fill="var(--ok)"/>` + tx(X(p.llega), 84, `panel: +${fmtT(p.llega * 60)}`, 'vizsm', 'middle');
        s += `<rect x="8" y="98" width="140" height="44" rx="6" fill="var(--ice)" stroke="currentColor" stroke-width="1.5"/>` + tx(16, 114, 'Guardado en el broker:', 'vizsm') + tx(16, 132, o.ve ? 'casa/puerta → cerrada' : '(nada)', 'vizsm', 'start', ' style="font-family:monospace;font-size:10.5px;fill:currentColor;font-weight:700"');
        s += `<rect x="160" y="98" width="132" height="44" rx="6" fill="none" stroke="${o.ve ? 'var(--ok)' : 'var(--err)'}" stroke-width="2"/>` + tx(168, 114, 'El panel, al suscribirse:', 'vizsm') + tx(168, 132, o.ve ? 've “cerrada”' : 'no ve nada', 'vizlab');
        s += tx(8, 166, o.ve ? 'El retenido es el último estado conocido del tema' : p.borrar && p.ret ? 'Un retenido vacío borra el que había' : 'Sin retenido, solo ve lo que se publique a partir de ahora', 'vizsm');
        return V(174, s);
      }
    },
    /* Último testamento y keepalive */
    io_lwt: { anim: true,
      calc: p => { const tarda = p.limpia ? 0 : 1.5 * p.ka; return { tarda, testamento: p.limpia ? 0 : 1, sinTest: p.limpia ? 1 : 0, rapido: !p.limpia && tarda <= 30 ? 1 : 0 }; },
      svg: (p, o, t) => {
        const span = 20 + 1.5 * 120 + 20, X = s => 14 + s / span * 272, cut = 20;
        let s = tx(8, 16, `Keepalive ${p.ka} s · ${p.limpia ? 'se despide con DISCONNECT' : 'sin luz a los 20 s'}`, 'vizlab');
        s += ln(`M14 60H286`, 'var(--line)', 2);
        for (let k = p.ka; k < cut; k += p.ka) s += dot(X(k), 60, 'var(--ok)', 3.5);
        s += ln(`M${X(cut)} 40V80`, 'var(--err)', 2.5) + tx(X(cut), 94, p.limpia ? 'adiós' : 'corte', 'vizsm', 'middle');
        if (!p.limpia) { s += `<rect x="${X(cut)}" y="52" width="${X(cut + o.tarda) - X(cut)}" height="16" fill="var(--led)" opacity=".25"/>` + ln(`M${X(cut + o.tarda)} 40V80`, 'var(--led)', 2.5) + tx(X(cut + o.tarda), 36, '“offline”', 'vizsm', 'middle', ' style="font-weight:700;fill:currentColor"'); }
        const now = (t * 30) % span; s += `<path d="M${X(now).toFixed(1)} 104l-5 8h10z" fill="currentColor" opacity=".6"/>`;
        s += tx(14, 130, '0 s') + tx(286, 130, `${span} s`, 'vizsm', 'end');
        s += tx(8, 152, p.limpia ? 'Despedida limpia: no hay testamento' : `Espera 1,5 × ${p.ka} = ${num(o.tarda, 0)} s y publica «offline»`, 'vizlab');
        s += tx(8, 170, 'puntos verdes: PINGREQ del nodo cuando no tiene nada que enviar', 'vizsm', 'start', ' style="font-size:9.5px"');
        return V(178, s);
      }
    },
    /* ACL de Mosquitto */
    io_acl: {
      calc: p => {
        const U = ['salon', 'cocina', 'panel'][p.u], T = IO_ACLT[p.t], w = p.acc === 0;
        const rules = aclRules(U), okk = rules.some(([acc, f]) => (acc === 'readwrite' || (w ? acc === 'write' : acc === 'read')) && topicMatch(f, T)) ? 1 : 0;
        return { ok: okk, denegado: okk ? 0 : 1, panelOrden: p.u === 2 && w && p.t === 2 && okk ? 1 : 0, cocinaLeeSalon: p.u === 1 && !w && p.t === 1 && !okk ? 1 : 0 };
      },
      svg: (p, o) => {
        const U = ['salon', 'cocina', 'panel'][p.u], T = IO_ACLT[p.t], w = p.acc === 0, mono = ' style="font-family:monospace;font-size:10px;fill:currentColor"';
        const L = ['user panel', 'topic read casa/#', 'topic write casa/+/+/cmd', '', 'pattern write casa/%u/#', 'pattern read casa/%u/+/cmd'];
        let s = `<rect x="6" y="6" width="288" height="92" rx="6" fill="var(--ice)"/>`;
        const hit = aclRules(U).find(([acc, f]) => (w ? acc === 'write' : acc === 'read') && topicMatch(f, T));
        L.forEach((l, i) => { const isHit = hit && hit[2] === i; s += (isHit ? `<rect x="10" y="${12 + i * 14}" width="280" height="14" rx="3" fill="var(--ok)" opacity=".35"/>` : '') + tx(14, 23 + i * 14, l, 'vizsm', 'start', mono); });
        s += tx(8, 120, `Usuario “${U}” quiere ${w ? 'publicar en' : 'leer'}:`, 'vizlab') + tx(8, 138, T, 'vizsm', 'start', ' style="font-family:monospace;font-size:11px;font-weight:700;fill:currentColor"');
        s += tx(8, 162, o.ok ? 'Permitido' : 'El broker lo descarta', 'vizbig', 'start', ` style="fill:${o.ok ? 'var(--ok)' : 'var(--err)'}"`);
        s += tx(8, 180, '%u se sustituye por el nombre de usuario', 'vizsm');
        return V(188, s);
      }
    },
    /* Muestreo y aliasing */
    io_alias: {
      calc: p => { const k = Math.round(p.f / p.fs), fa = Math.abs(p.f - k * p.fs); return { ratio: p.fs / p.f, fa, engano: p.fs < 2 * p.f ? 1 : 0 }; },
      svg: (p, o) => {
        const T = 3, X = t => 10 + t / T * 280, Y = v => 70 - v * 40;
        let d = ''; for (let i = 0; i <= 240; i++) { const t = i / 240 * T; d += (i ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(Math.sin(2 * Math.PI * p.f * t)).toFixed(1); }
        let s = ln(d, 'var(--muted)', 1.4, ' opacity=".8"');
        const pts = []; for (let t = 0; t <= T + 1e-9; t += 1 / p.fs) pts.push([X(t), Y(Math.sin(2 * Math.PI * p.f * t))]);
        s += `<polyline points="${pts.map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join(' ')}" fill="none" stroke="var(--led)" stroke-width="2.4"/>`;
        pts.forEach(([x, y]) => { s += dot(x, y, 'var(--led)', 3.5); });
        s += tx(10, 128, `Señal: ${num(p.f, 1)} Hz · muestreo: ${num(p.fs, 1)} Hz → ${num(o.ratio, 1)} muestras por ciclo`, 'vizsm');
        s += tx(10, 148, o.engano ? `Engaño: los puntos dibujan ${num(o.fa, 2)} Hz` : 'Los puntos siguen la forma real', 'vizlab', 'start', o.engano ? ' style="fill:var(--err)"' : '');
        s += tx(10, 166, 'gris: la señal real · color: lo que ves uniendo las muestras', 'vizsm', 'start', ' style="font-size:9.5px"');
        return V(174, s);
      }
    },
    /* Filtros sobre datos ruidosos con picos */
    io_filt: {
      calc: p => {
        const n = 120, raw = [], f = [];
        for (let i = 0; i < n; i++) raw.push((i < 60 ? 20 : 24) + 1.2 * (2 * rnd(i + 400) - 1) + (i === 6 ? 12 : 0) + (i === 100 ? -12 : 0));
        let y = raw[0];
        for (let i = 0; i < n; i++) {
          if (p.tipo === 0) f.push(raw[i]);
          else if (p.tipo === 1) { const a = raw.slice(Math.max(0, i - p.N + 1), i + 1); f.push(a.reduce((x, z) => x + z, 0) / a.length); }
          else if (p.tipo === 2) { const a = raw.slice(Math.max(0, i - p.N + 1), i + 1).sort((x, z) => x - z); f.push(a[Math.floor(a.length / 2)]); }
          else { y += p.a * (raw[i] - y); f.push(y); }
        }
        const sd = (arr, mu) => Math.sqrt(arr.reduce((x, v) => x + (v - mu) ** 2, 0) / arr.length);
        const mean = a => a.reduce((x, v) => x + v, 0) / a.length, zone = f.slice(30, 60), rz = raw.slice(30, 60), ruido = sd(zone, mean(zone)) / sd(rz, mean(rz)) * 100;
        let ret = 0; for (let i = 60; i < n; i++) { if (f[i] >= 22) { ret = i - 60; break; } ret = n - 60; }
        const pico = Math.max(Math.abs(f[6] - 20), Math.abs(f[7] - 20), Math.abs(f[100] - 24), Math.abs(f[101] - 24)) > 2 ? 1 : 0;
        return { raw, f, ruido, retardo: ret, pico, picoRapido: !pico && ret <= 3 ? 1 : 0, expSuave: p.tipo === 3 && ruido <= 35 ? 1 : 0 };
      },
      svg: (p, o) => {
        const X = i => 10 + i * 280 / 119, Y = v => Math.max(6, Math.min(130, 130 - (v - 14) * 6));
        const pl = a => a.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
        let s = `<polyline points="${pl(o.raw)}" fill="none" stroke="var(--muted)" stroke-width="1" opacity=".7"/><polyline points="${pl(o.f)}" fill="none" stroke="var(--led)" stroke-width="2.6"/>`;
        s += tx(X(6), Y(o.raw[6]) - 4, 'pico', 'vizsm', 'middle');
        const name = ['Sin filtro', `Media móvil de ${p.N}`, `Mediana de ${p.N}`, `Exponencial, α = ${num(p.a, 2)}`][p.tipo];
        s += tx(10, 150, name, 'vizlab') + tx(10, 168, `Ruido que queda: ${num(o.ruido, 0)} % · retardo del escalón: ${o.retardo} muestras`, 'vizsm');
        s += tx(10, 186, o.pico ? 'Los picos siguen ahí' : 'Los picos han desaparecido', 'vizlab', 'start', o.pico ? ' style="fill:var(--err)"' : ' style="fill:var(--ok)"');
        return V(194, s);
      }
    },
    /* Calibración de dos puntos */
    io_calib: {
      calc: p => { const lee = r => 1.05 * r + 0.8, cor = r => p.a * lee(r) + p.b; let em = 0; for (let r = 0; r <= 40; r += 5) em = Math.max(em, Math.abs(cor(r) - r)); return { err0: Math.abs(cor(0)), err40: Math.abs(cor(40) - 40), errMax: em }; },
      svg: (p, o) => {
        const X = r => 30 + r / 40 * 250, Y = v => 150 - v / 44 * 140, lee = r => 1.05 * r + 0.8, cor = r => p.a * lee(r) + p.b;
        let s = ln(`M30 150H285M30 150V8`, 'var(--line)', 1.2);
        s += ln(`M${X(0)} ${Y(0)}L${X(40)} ${Y(40)}`, 'var(--muted)', 1.5, ' stroke-dasharray="4 4"');
        s += ln(`M${X(0)} ${Y(lee(0)).toFixed(1)}L${X(40)} ${Y(lee(40)).toFixed(1)}`, 'var(--err)', 1.8, ' opacity=".7"');
        s += ln(`M${X(0)} ${Y(cor(0)).toFixed(1)}L${X(40)} ${Y(cor(40)).toFixed(1)}`, 'var(--led)', 2.8);
        s += dot(X(0), Y(cor(0)), 'var(--led)') + dot(X(40), Y(cor(40)), 'var(--led)');
        s += tx(32, 164, '0 °C (hielo)', 'vizsm') + tx(285, 164, '40 °C (patrón)', 'vizsm', 'end') + tx(34, 14, 'marca', 'vizsm');
        s += tx(8, 184, `Corrección: real = ${num(p.a, 3)} · leído ${p.b < 0 ? '−' : '+'} ${num(Math.abs(p.b), 2)}`, 'vizlab');
        s += tx(8, 202, `Error a 0 °C: ${num(o.err0, 2)} · a 40 °C: ${num(o.err40, 2)} · máximo: ${num(o.errMax, 2)} °C`, 'vizsm');
        s += tx(40, 32, 'rojo: sensor sin corregir', 'vizsm') + tx(40, 46, 'gris: lo ideal · color: corregido', 'vizsm');
        return V(210, s);
      }
    },
    /* Deriva del reloj entre sincronizaciones NTP */
    io_drift: {
      calc: p => { const err = p.ppm * 1e-6 * p.h * 3600; return { err, errFino: err <= 1 ? 1 : 0 }; },
      svg: (p, o) => {
        const span = Math.max(48, p.h * 2), X = h => 14 + h / span * 272, top = Math.max(o.err, 1);
        let d = 'M14 120'; for (let h0 = 0; h0 < span; h0 += p.h) { const h1 = Math.min(span, h0 + p.h); d += `L${X(h1).toFixed(1)} ${(120 - (h1 - h0) / p.h * 80).toFixed(1)}V120`; if (p.h > span) break; }
        let s = ln('M14 120H286', 'var(--line)', 1.5) + ln(d, 'var(--led)', 2.2);
        s += tx(8, 16, `Reloj con ${p.ppm} ppm de deriva · NTP cada ${fmtT(p.h * 3600)}`, 'vizlab');
        s += tx(14, 136, '0') + tx(286, 136, fmtT(span * 3600), 'vizsm', 'end') + tx(18, 36, `${num(top, 2)} s`, 'vizsm');
        s += tx(8, 160, `Error justo antes de resincronizar: ${o.err >= 60 ? num(o.err / 60, 1) + ' min' : num(o.err, 2) + ' s'}`, 'vizbig');
        s += tx(8, 178, `${p.ppm} ppm = ${p.ppm} µs de error por cada segundo`, 'vizsm');
        return V(186, s);
      }
    },
    /* Series temporales: puntos, retención y cardinalidad */
    io_retention: {
      calc: p => { const anio = 365 * 86400 / p.s, guard = Math.min(p.dias, 365) * 86400 / p.s + (p.dias < 365 ? 8760 : 0), series = p.etq ? anio : 5; return { puntosAnio: anio, guardados: guard, series, retBien: p.s <= 10 && guard <= 300000 ? 1 : 0 }; },
      svg: (p, o) => {
        const W = v => 4 + 190 * Math.log10(1 + v) / Math.log10(1 + 3.2e7), F = v => v >= 1e6 ? num(v / 1e6, 1) + ' mill.' : num(v, 0);
        const bar = (y, lab, v, col) => tx(8, y, lab) + `<rect x="8" y="${y + 6}" width="${W(v).toFixed(1)}" height="14" rx="3" fill="${col}" opacity=".7"/>` + tx(14 + W(v), y + 17, F(v), 'vizsm');
        let s = tx(8, 15, `Una lectura cada ${fmtT(p.s)}`, 'vizlab') + tx(8, 30, p.dias >= 365 ? 'Datos crudos para siempre' : `Crudos ${p.dias} días + medias horarias`, 'vizsm');
        s += bar(50, 'Puntos en un año, sin borrar nada', o.puntosAnio, 'var(--err)') + bar(90, 'Puntos guardados con tu retención', o.guardados, 'var(--ok)') + bar(130, 'Series distintas (por la etiqueta)', o.series, p.etq ? 'var(--err)' : 'var(--led)');
        s += tx(8, 172, p.etq ? 'Etiqueta = id de mensaje: una serie por punto' : 'Etiqueta = sala: 5 series, una por sala', 'vizlab', 'start', p.etq ? ' style="fill:var(--err)"' : '');
        s += tx(8, 190, 'barras en escala logarítmica', 'vizsm');
        return V(198, s);
      }
    },
    /* Detectores de anomalías */
    io_anom: {
      calc: p => { const det = [[0, 0, 0, 0, 1], [0, 1, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, 0]][p.det][p.an]; return { detecta: det, congOK: p.an === 2 && det ? 1 : 0, silOK: p.an === 3 && det ? 1 : 0, velOK: p.an === 1 && det ? 1 : 0 }; },
      svg: (p, o) => {
        const n = 60, v = [];
        for (let i = 0; i < n; i++) { let x = 4 + 0.3 * (2 * rnd(i + 900) - 1); if (p.an === 1 && i >= 36) x = 7 + 0.3 * (2 * rnd(i + 900) - 1); if (p.an === 2 && i >= 30) x = 4.2; if (p.an === 4 && i >= 26) x = 4 + (i - 26) * 0.2 + 0.2 * (2 * rnd(i + 900) - 1); v.push(p.an === 3 && i >= 34 ? null : x); }
        const X = i => 14 + i * 272 / 59, Y = x => 130 - x * 9;
        let s = ln(`M14 ${Y(8)}H286`, 'var(--err)', 1.2, ' stroke-dasharray="5 4"') + tx(286, Y(8) - 4, 'umbral 8 °C', 'vizsm', 'end');
        let d = ''; v.forEach((x, i) => { if (x == null) return; d += (d && v[i - 1] != null ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x).toFixed(1); });
        s += ln(d, 'var(--led)', 2.2);
        if (p.an === 3) s += tx(X(46), Y(4) + 4, '… sin datos …', 'vizsm', 'middle');
        const A = ['ninguna anomalía', 'subida brusca (aún dentro del rango)', 'valor congelado: 4,2 exacto', 'el nodo deja de enviar', 'sube despacio y se sale del rango'], D = ['Umbral fijo', 'Velocidad de cambio', 'Valor congelado', 'Silencio (falta el latido)'];
        s += tx(8, 16, 'Nevera: ' + A[p.an], 'vizlab');
        s += tx(8, 158, 'Detector: ' + D[p.det], 'vizlab');
        s += tx(8, 178, p.an === 0 ? 'Todo normal' : o.detecta ? '¡Aviso! Este detector la ve' : 'Este detector no ve nada raro', 'vizbig', 'start', ` style="fill:${p.an === 0 ? 'currentColor' : o.detecta ? 'var(--ok)' : 'var(--err)'}"`);
        return V(186, s);
      }
    },
    /* Matriz de riesgo */
    io_risk: {
      calc: p => { const T = IO_THREATS[p.am], P = Math.max(1, T[1] - (p.def ? T[3] : 0)), r = P * T[2]; return { riesgo: r, P, I: T[2], topMit: p.am === 0 && p.def ? 1 : 0, bajoSinDef: r <= 2 && !p.def ? 1 : 0 }; },
      svg: (p, o) => {
        const T = IO_THREATS[p.am];
        let s = tx(8, 16, T[0], 'vizlab') + tx(8, 32, p.def ? 'Defensa: ' + T[4] : 'Sin defensa', 'vizsm');
        for (let pi = 1; pi <= 3; pi++) for (let ii = 1; ii <= 3; ii++) { const r = pi * ii, x = 70 + (pi - 1) * 62, y = 150 - ii * 36; s += `<rect x="${x}" y="${y}" width="58" height="32" rx="4" fill="${r >= 6 ? 'var(--err)' : r >= 3 ? '#E8A33D' : 'var(--ok)'}" opacity=".35"/>` + tx(x + 29, y + 20, r, 'vizsm', 'middle'); }
        s += `<circle cx="${70 + (o.P - 1) * 62 + 29}" cy="${150 - o.I * 36 + 16}" r="11" fill="none" stroke="currentColor" stroke-width="3" class="a-pulse"/>`;
        s += tx(160, 168, 'probabilidad →', 'vizsm', 'middle') + tx(60, 96, 'impacto ↑', 'vizsm', 'end');
        s += tx(8, 190, `Riesgo = ${o.P} × ${o.I} = ${o.riesgo}`, 'vizbig');
        return V(198, s);
      }
    },
    /* Dónde está la clave y cuánto cuesta un incidente */
    io_creds: {
      calc: p => { const exp = p.inc === 0 ? (p.donde === 0 ? 1 : 0) : (p.donde <= 2 ? 1 : 0), rev = exp ? (p.cred ? 1 : 6) : 0; return { expuesta: exp, revocar: rev, revUno: p.inc === 1 && rev === 1 ? 1 : 0, roboSeguro: p.inc === 1 && !exp ? 1 : 0 }; },
      svg: (p, o) => {
        const D = ['escrita en el código', 'en secrets.h, fuera de git', 'en la NVS (Preferences)', 'en la NVS con la flash cifrada'], I = ['subes el proyecto a un repositorio público', 'te roban el nodo del jardín y vuelcan su flash'];
        let s = tx(8, 16, 'La clave está ' + D[p.donde], 'vizlab') + tx(8, 32, (p.cred ? 'Una credencial distinta por nodo' : 'Los 6 nodos comparten la misma') , 'vizsm');
        s += tx(8, 54, 'Incidente: ' + I[p.inc], 'vizsm', 'start', ' style="font-weight:700;fill:currentColor"');
        for (let i = 0; i < 6; i++) { const x = 14 + i * 46, bad = o.revocar === 6 || (o.revocar === 1 && i === 0); s += `<rect x="${x}" y="70" width="38" height="38" rx="6" fill="${bad ? 'var(--err)' : 'var(--ice)'}" opacity="${bad ? 0.55 : 1}" stroke="currentColor" stroke-width="1.2"/>` + tx(x + 19, 93, 'N' + (i + 1), 'vizsm', 'middle', ' style="font-weight:700;fill:currentColor"'); }
        s += tx(8, 134, o.expuesta ? 'La clave queda a la vista' : 'La clave no se filtra', 'vizbig', 'start', ` style="fill:${o.expuesta ? 'var(--err)' : 'var(--ok)'}"`);
        s += tx(8, 154, o.revocar ? `Tienes que cambiar la credencial en ${o.revocar} nodo${o.revocar > 1 ? 's' : ''}` : 'No hay que cambiar nada', 'vizlab');
        return V(162, s);
      }
    },
    /* TLS frente a un atacante en medio */
    io_tlsviz: { anim: true,
      calc: p => { const lee = p.tls === 0 || (p.tls === 1 && p.atk === 1) ? 1 : 0; return { lee, engañado: p.tls === 1 && p.atk === 1 ? 1 : 0, detecta: p.tls === 2 && p.atk === 1 ? 1 : 0 }; },
      svg: (p, o, t) => {
        const f = (t % 2) / 2, lock = p.tls > 0;
        let s = tx(8, 16, ['Sin TLS: todo en claro', 'TLS con setInsecure(): cifra, pero no comprueba', 'TLS verificando el certificado con tu CA'][p.tls], 'vizlab');
        s += bx(8, 40, 70, 34, true, 'ESP32') + bx(222, 40, 70, 34, true, p.atk ? '¿Broker?' : 'Broker');
        s += `<rect x="116" y="88" width="68" height="34" rx="6" fill="var(--err)" opacity=".18" stroke="var(--err)" stroke-width="1.5"/>` + tx(150, 103, 'Atacante', 'vizsm', 'middle', ' style="font-weight:700;fill:var(--err)"') + tx(150, 116, p.atk ? 'se hace pasar' : 'escucha', 'vizsm', 'middle', ' style="font-size:9.5px"');
        s += ln('M78 57H222', lock ? 'var(--ok)' : 'var(--muted)', lock ? 3 : 1.5, ' class="a-flow-slow"');
        if (lock) s += `<rect x="142" y="47" width="16" height="13" rx="2" fill="var(--ok)"/><path d="M145 47v-4a5 5 0 0 1 10 0v4" stroke="var(--ok)" stroke-width="2" fill="none"/>`;
        const [x, y] = along([[78, 57], [222, 57]], f); s += dot(x, y, lock ? 'var(--ok)' : 'var(--led)');
        s += ln('M150 74V88', 'var(--err)', 1.5, ' stroke-dasharray="3 3"');
        if (o.detecta) s += cross(150, 105);
        s += tx(8, 146, o.lee ? 'El atacante lee: {"usuario":"salon","clave":"…"}' : 'El atacante solo ve bytes cifrados', 'vizsm', 'start', ` style="font-family:monospace;font-size:10px;fill:${o.lee ? 'var(--err)' : 'currentColor'}"`);
        s += tx(8, 166, o.detecta ? 'El certificado no lo firma tu CA: conexión cortada' : o.engañado ? 'El nodo acepta al impostor sin rechistar' : p.atk ? 'El impostor recibe todo' : o.lee ? 'El atacante lo lee todo' : 'El atacante solo ve bytes cifrados', 'vizlab', 'start', ` style="fill:${o.detecta ? 'var(--ok)' : o.lee ? 'var(--err)' : 'currentColor'}"`);
        return V(174, s);
      }
    },
    /* Red separada y cortafuegos */
    io_segviz: {
      calc: p => { const alcanza = p.sep ? 0 : 3, inet = p.fw ? 0 : 1; return { alcanza, internet: inet, aislada: alcanza === 0 && !inet ? 1 : 0 }; },
      svg: (p, o) => {
        let s = `<rect x="4" y="22" width="${p.sep ? 140 : 292}" height="104" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>` + tx(10, 36, p.sep ? 'Red principal' : 'Una sola red para todo', 'vizsm');
        if (p.sep) s += `<rect x="156" y="22" width="140" height="104" rx="8" fill="none" stroke="var(--led)" stroke-width="1.5"/>` + tx(162, 36, 'Red IoT', 'vizsm');
        s += bx(12, 44, 60, 24, true, 'Portátil') + bx(78, 44, 60, 24, true, 'Móvil') + bx(12, 92, 60, 24, true, 'NAS');
        const bx0 = p.sep ? 164 : 164; s += `<rect x="${bx0}" y="88" width="62" height="28" rx="6" fill="var(--err)" opacity=".25" stroke="var(--err)" stroke-width="1.5"/>` + tx(bx0 + 31, 106, 'Bombilla', 'vizsm', 'middle', ' style="font-weight:700;fill:var(--err)"');
        s += bx(232, 44, 58, 24, true, 'Broker');
        s += ln(`M${bx0 + 40} 88L250 68`, 'var(--ok)', 1.8);
        if (!p.sep) s += ln(`M${bx0} 96L72 104M${bx0} 92L72 60M${bx0} 90L138 62`, 'var(--err)', 1.8, ' class="a-flow"');
        else s += ln('M164 98H150', 'var(--err)', 1.8) + cross(146, 98);
        s += ln(`M${bx0 + 31} 116V140`, o.internet ? 'var(--err)' : 'var(--muted)', 1.8, o.internet ? ' class="a-flow"' : '') + (o.internet ? '' : cross(bx0 + 31, 134)) + tx(bx0 + 40, 148, 'internet', 'vizsm');
        s += tx(8, 14, 'La bombilla barata está comprometida', 'vizlab');
        s += tx(8, 168, `Llega a ${o.alcanza} de tus equipos · ${o.internet ? 'puede salir a internet' : 'no sale a internet'}`, 'vizlab', 'start', o.alcanza || o.internet ? ' style="fill:var(--err)"' : ' style="fill:var(--ok)"');
        s += tx(8, 186, p.fw ? 'Regla: la red IoT solo habla con el broker y con NTP' : 'Sin reglas en el cortafuegos', 'vizsm');
        return V(194, s);
      }
    },
    /* Privacidad: lo que revela la resolución de los datos de consumo */
    io_privviz: {
      calc: p => {
        const W = consumoDia(), m = p.res, avg = [];
        for (let i = 0; i < 1440; i += m) { const a = W.slice(i, i + m); avg.push(a.reduce((x, z) => x + z, 0) / a.length); }
        const evs = [[420, 424], [860, 865], [1260, 1320], [1340, 1352]];
        const vis = evs.filter(([a, b]) => { const k = Math.floor(((a + b) / 2) / m); return avg[k] - 150 > 400; }).length;
        return { eventos: vis, avg };
      },
      svg: (p, o) => {
        const n = o.avg.length, w = 280 / n, Y = v => 130 - Math.min(1, v / 2600) * 110;
        let s = tx(8, 16, `Consumo de una casa, un dato cada ${fmtT(p.res * 60)}`, 'vizlab');
        o.avg.forEach((v, i) => { s += `<rect x="${(10 + i * w).toFixed(2)}" y="${Y(v).toFixed(1)}" width="${Math.max(0.6, w - (n < 100 ? 1 : 0)).toFixed(2)}" height="${(130 - Y(v)).toFixed(1)}" fill="var(--led)" opacity=".8"/>`; });
        s += ln('M10 130H290', 'var(--line)', 1.2);
        ['0 h', '6 h', '12 h', '18 h', '24 h'].forEach((l, i) => { s += tx(10 + i * 70, 144, l, 'vizsm', i === 4 ? 'end' : i ? 'middle' : 'start'); });
        s += tx(8, 166, o.eventos ? `Se distinguen ${o.eventos} rutinas del día` : 'Ya no se distinguen rutinas concretas', 'vizlab', 'start', o.eventos ? ' style="fill:var(--err)"' : ' style="fill:var(--ok)"');
        s += tx(8, 184, 'Minimizar: guarda la resolución que de verdad necesitas', 'vizsm');
        return V(192, s);
      }
    },
    /* Brownout: picos del WiFi, cables y condensador */
    io_brown: {
      calc: p => { const tau = p.R * p.C * 1e-6, tp = 1e-3, dip = p.I / 1000 * p.R * (tau > 0 ? 1 - Math.exp(-tp / tau) : 1), vmin = 3.3 - dip; return { vmin, reinicia: vmin < 2.5 ? 1 : 0, conCond: p.R >= 3 && vmin >= 2.5 ? 1 : 0 }; },
      svg: (p, o) => {
        const X = ms => 14 + ms / 6 * 272, Y = v => 20 + (3.5 - v) / 1.6 * 110, tau = p.R * p.C * 1e-6;
        let d = `M14 ${Y(3.3)}H${X(2)}`; for (let i = 1; i <= 20; i++) { const tt = i / 20 * 1e-3, v = 3.3 - p.I / 1000 * p.R * (tau > 0 ? 1 - Math.exp(-tt / tau) : 1); d += `L${X(2 + i / 20).toFixed(1)} ${Y(v).toFixed(1)}`; }
        for (let i = 1; i <= 20; i++) { const tt = i / 20 * 1.5e-3, v0 = o.vmin, v = 3.3 - (3.3 - v0) * Math.exp(-tt / Math.max(tau, 1e-4)); d += `L${X(3 + i / 20 * 1.5).toFixed(1)} ${Y(v).toFixed(1)}`; }
        d += `H286`;
        let s = ln(`M14 ${Y(2.5)}H286`, 'var(--err)', 1.2, ' stroke-dasharray="5 4"') + tx(286, Y(2.5) + 14, 'umbral de brownout', 'vizsm', 'end');
        s += `<rect x="${X(2)}" y="${Y(3.5)}" width="${X(3) - X(2)}" height="${Y(1.9) - Y(3.5)}" fill="var(--led)" opacity=".12"/>` + tx(X(2.5), Y(3.5) + 10, 'TX', 'vizsm', 'middle');
        s += ln(d, o.reinicia ? 'var(--err)' : 'var(--ok)', 2.4);
        s += tx(8, 152, `Pico ${p.I} mA · cables ${num(p.R, 1)} Ω · condensador ${p.C} µF`, 'vizsm');
        s += tx(8, 172, `Tensión mínima: ${num(o.vmin, 2)} V`, 'vizbig');
        s += tx(8, 190, o.reinicia ? 'Se reinicia: brownout' : 'Aguanta el pico', 'vizlab', 'start', ` style="fill:${o.reinicia ? 'var(--err)' : 'var(--ok)'}"`);
        return V(198, s);
      }
    },
    /* Balance solar diario */
    io_solarbal: {
      calc: p => { const gana = p.P * p.h * 0.7, gasta = p.I / 1000 * 3.7 * 24, bal = gana - gasta; return { gana, gasta, bal, invOk: p.h <= 2 && p.I >= 10 && bal > 0 ? 1 : 0, inv20: p.h <= 2 && p.I >= 20 && bal > 0 ? 1 : 0 }; },
      svg: (p, o) => {
        const top = Math.max(o.gana, o.gasta, 0.1), W = v => v / top * 200;
        let s = tx(8, 14, `Panel de ${num(p.P, 1)} W · ${num(p.h, 1)} h de sol pico`, 'vizlab') + tx(8, 29, `Nodo de ${num(p.I, 1)} mA de media a 3,7 V`, 'vizsm');
        s += tx(8, 48, 'Entra (con 30 % de pérdidas)') + `<rect x="8" y="53" width="${W(o.gana).toFixed(1)}" height="18" rx="4" fill="var(--ok)" opacity=".7"/>` + tx(14 + W(o.gana), 67, num(o.gana, 2) + ' Wh/día', 'vizsm');
        s += tx(8, 92, 'Sale (el nodo, 24 h)') + `<rect x="8" y="97" width="${W(o.gasta).toFixed(1)}" height="18" rx="4" fill="var(--err)" opacity=".7"/>` + tx(14 + W(o.gasta), 111, num(o.gasta, 2) + ' Wh/día', 'vizsm');
        s += tx(8, 140, `Balance: ${o.bal >= 0 ? '+' : '−'}${num(Math.abs(o.bal), 2)} Wh al día`, 'vizbig', 'start', ` style="fill:${o.bal >= 0 ? 'var(--ok)' : 'var(--err)'}"`);
        s += tx(8, 160, o.bal >= 0 ? 'La batería se recupera cada día de sol' : 'La batería se vacía poco a poco', 'vizsm');
        return V(168, s);
      }
    },
    /* OTA con dos particiones, firma y vuelta atrás */
    io_otaviz: {
      calc: p => { if (!p.inst) return { rollback: 0, rechazada: 0, nueva: 0, corre: 0 }; if (p.firma) return { rollback: 0, rechazada: 1, nueva: 0, corre: 0 }; return p.v === 0 ? { rollback: 0, rechazada: 0, nueva: 1, corre: 1 } : { rollback: 1, rechazada: 0, nueva: 0, corre: 0 }; },
      svg: (p, o) => {
        const Vn = ['buena', 'se cuelga al arrancar', 'no conecta al broker'][p.v];
        let s = tx(8, 16, `v1.5: ${Vn} · firma ${p.firma ? 'FALSA' : 'válida'}`, 'vizlab');
        s += `<rect x="8" y="28" width="284" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.2"/>` + tx(14, 42, 'flash', 'vizsm');
        s += bx(20, 48, 120, 30, !o.corre, 'ota_0: v1.4', o.corre ? '' : 'arranca esta') + bx(160, 48, 120, 30, o.corre || o.rollback, p.inst && !o.rechazada ? 'ota_1: v1.5' : 'ota_1: libre', o.corre ? 'arranca esta' : '');
        const steps = [['Descargar por HTTPS', p.inst], ['Verificar la firma', p.inst && !p.firma, p.inst && p.firma], ['Escribir en la partición libre', p.inst && !p.firma], ['Reiniciar desde la nueva', p.inst && !p.firma], ['Autocomprobación: WiFi, broker, sensores', o.nueva, o.rollback], ['Confirmar (o volver atrás)', o.nueva, o.rollback]];
        steps.forEach(([l, g, b], i) => { const y = 100 + i * 15; s += (g ? ok(16, y - 3, true) : b ? ok(16, y - 3, false) : dot(16, y - 4, 'var(--line)', 3)) + tx(28, y, l, 'vizsm', 'start', g || b ? ' style="fill:currentColor"' : ''); });
        s += tx(8, 196, !p.inst ? 'Pulsa instalar para probar' : o.rechazada ? 'Firma falsa: imagen rechazada, sigue la v1.4' : o.rollback ? 'Sin confirmar: el arranque vuelve a la v1.4' : 'Confirmada: ya corre la v1.5', 'vizlab', 'start', ` style="fill:${o.nueva ? 'var(--ok)' : p.inst ? 'var(--err)' : 'currentColor'}"`);
        return V(204, s);
      }
    },
    /* Envío por cambio (delta) y latido */
    io_delta: {
      calc: p => {
        const n = 360, v = []; for (let i = 0; i < n; i++) v.push(21 + 1.5 * Math.sin(i / 70) + 0.08 * (2 * rnd(i + 77) - 1));
        const sent = []; let last = -1e9, lt = -1e9, sil = 0;
        for (let i = 0; i < n; i++) { if (Math.abs(v[i] - last) >= p.d || (p.hb && i - lt >= p.hb)) { sent.push(i); last = v[i]; lt = i; } }
        for (let k = 1; k < sent.length; k++) sil = Math.max(sil, sent[k] - sent[k - 1]); sil = Math.max(sil, n - sent[sent.length - 1]);
        const envios = sent.length / 6;
        return { v, sent, envios, silencioMax: sil, pocos: envios <= 6 ? 1 : 0, silOk: sil <= 15 && envios <= 10 ? 1 : 0 };
      },
      svg: (p, o) => {
        const X = i => 10 + i * 280 / 359, Y = x => 110 - (x - 19) * 25;
        let d = ''; o.v.forEach((x, i) => { d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x).toFixed(1); });
        let s = ln(d, 'var(--muted)', 1.2) + o.sent.map(i => `<circle cx="${X(i).toFixed(1)}" cy="${Y(o.v[i]).toFixed(1)}" r="2.6" fill="var(--led)"/>`).join('');
        s += tx(8, 16, `Delta ${num(p.d, 1)} °C · latido ${p.hb ? 'cada ' + p.hb + ' min' : 'desactivado'}`, 'vizlab');
        s += tx(10, 138, '6 h, una lectura por minuto · puntos: envíos', 'vizsm');
        s += tx(8, 160, `Envíos por hora: ${num(o.envios, 1)}`, 'vizlab');
        s += tx(8, 178, `Silencio más largo: ${o.silencioMax} min`, 'vizlab', 'start', o.silencioMax > 15 ? ' style="fill:var(--err)"' : '');
        return V(186, s);
      }
    },
    /* Malla Zigbee: un router a medio camino */
    io_meshviz: {
      calc: p => { const hop = 12, llega = p.dist <= hop || (p.router && p.dist <= 2 * hop) ? 1 : 0; return { llega, saltos: llega ? (p.dist <= hop ? 1 : 2) : 0, recupera: llega && p.dist >= 20 && p.router ? 1 : 0 }; },
      svg: (p, o) => {
        const X = m => 30 + m / 30 * 240;
        let s = tx(8, 16, `Sensor a pila a ${p.dist} m del coordinador`, 'vizlab');
        s += `<rect x="${X(0)}" y="104" width="${(X(12) - X(0)).toFixed(1)}" height="6" rx="3" fill="var(--ok)" opacity=".6"/>` + tx(X(0), 122, 'alcance del coordinador', 'vizsm');
        if (p.router) s += `<rect x="${X(12)}" y="130" width="${(X(12) - X(0)).toFixed(1)}" height="6" rx="3" fill="var(--led)" opacity=".6"/>` + tx(X(12), 148, 'alcance del enchufe', 'vizsm');
        s += bx(X(0) - 26, 66, 52, 28, true, 'Coord.');
        if (p.router) s += bx(X(12) - 24, 66, 48, 28, true, 'Enchufe');
        s += `<circle cx="${X(p.dist)}" cy="80" r="11" fill="${o.llega ? 'var(--ok)' : 'var(--err)'}" opacity=".6"/>` + tx(X(p.dist), 60, 'sensor', 'vizsm', 'middle');
        if (o.llega) s += o.saltos === 1 ? ln(`M${X(0) + 26} 80H${X(p.dist) - 11}`, 'var(--ok)', 2, ' class="a-flow"') : ln(`M${X(p.dist) - 11} 80H${X(12) + 24}M${X(12) - 24} 80H${X(0) + 26}`, 'var(--ok)', 2, ' class="a-flow-rev"');
        s += tx(8, 172, o.llega ? `Llega en ${o.saltos} salto${o.saltos > 1 ? 's' : ''}` : 'Sin conexión: fuera de alcance', 'vizbig', 'start', ` style="fill:${o.llega ? 'var(--ok)' : 'var(--err)'}"`);
        s += tx(8, 190, 'Alcance orientativo por salto en interior: unos 12 m', 'vizsm');
        return V(198, s);
      }
    },
    /* Clases LoRaWAN: cuánto espera una orden */
    io_lwclassviz: {
      calc: p => { const lat = p.cls === 0 ? p.up * 60 - 60 : p.cls === 1 ? 32 : 1; return { lat, consumo: [1, 3, 100][p.cls] }; },
      svg: (p, o) => {
        const span = Math.max(p.up, 5) * 60 * 1.1, X = s => 12 + s / span * 276;
        let s = tx(8, 14, `Clase ${'ABC'[p.cls]} · subida cada ${p.up} min`, 'vizlab') + tx(8, 28, 'la orden (triángulo rojo) llega 1 min tras una subida', 'vizsm');
        s += ln('M12 70H288', 'var(--line)', 2);
        for (let k = 0; k * p.up * 60 <= span; k++) { const x = X(k * p.up * 60); s += `<rect x="${(x - 2).toFixed(1)}" y="52" width="4" height="18" fill="var(--led)"/>` + `<rect x="${(x + 3).toFixed(1)}" y="72" width="6" height="10" fill="var(--ok)" opacity=".6"/>`; }
        if (p.cls === 1) for (let t = 0; t <= span; t += 32) s += `<rect x="${X(t).toFixed(1)}" y="72" width="2" height="10" fill="var(--ok)"/>`;
        if (p.cls === 2) s += `<rect x="12" y="74" width="276" height="6" fill="var(--ok)" opacity=".5"/>`;
        s += `<path d="M${X(60).toFixed(1)} 48l-5-8h10z" fill="var(--err)"/>`;
        s += `<rect x="${X(60).toFixed(1)}" y="88" width="${Math.max(2, X(60 + o.lat) - X(60)).toFixed(1)}" height="8" rx="3" fill="var(--err)" opacity=".7"/>`;
        s += tx(8, 120, 'barras: subidas · verde: escucha · rojo: espera', 'vizsm');
        s += tx(8, 144, `La orden espera: ${fmtT(o.lat)}`, 'vizbig');
        s += tx(8, 162, `Consumo al escuchar: ${['mínimo', 'algo más (ventanas programadas)', 'alto: escucha siempre'][p.cls]}`, 'vizsm');
        return V(170, s);
      }
    },
    /* Modos de ahorro celulares */
    io_psmviz: {
      calc: p => { const base = [2, 0.2, 0.005][p.modo], q = base * 24 + 0.1 * p.n, dias = 2600 / q, lat = [2.56, 82, 86400 / p.n][p.modo]; return { dias, lat, cinco: dias >= 1825 ? 1 : 0, equil: lat <= 120 && dias >= 180 ? 1 : 0 }; },
      svg: (p, o) => {
        let s = tx(8, 16, ['Siempre conectado', 'eDRX: escucha de tarde en tarde', 'PSM: duerme sin darse de baja'][p.modo], 'vizlab') + tx(8, 32, `${p.n} envío${p.n > 1 ? 's' : ''} al día · batería de 2600 mAh`, 'vizsm');
        const W = d => Math.min(280, 280 * Math.log10(1 + d) / Math.log10(1 + 20000));
        s += tx(8, 58, 'Autonomía (sin autodescarga)') + `<rect x="8" y="64" width="${W(o.dias).toFixed(1)}" height="16" rx="4" fill="var(--ok)" opacity=".7"/>`;
        s += tx(8, 100, o.dias >= 730 ? `${num(o.dias / 365, 1)} años` : `${num(o.dias, 0)} días`, 'vizbig');
        s += tx(8, 126, 'Una orden desde el servidor tarda hasta:') + tx(8, 146, fmtT(o.lat), 'vizbig');
        s += tx(8, 168, 'Consumos orientativos: varían mucho según módulo y red', 'vizsm');
        return V(176, s);
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
{ id: 'io-m1', title: 'Sistemas IoT: del sensor a la decisión', desc: 'Las piezas de un sistema conectado, cómo fijar requisitos, cómo elegir la radio y por qué lo crítico debe funcionar en casa.', nodes: [
 L('io1', 'La cadena de un sistema IoT', 'cloud', ['io_arch', 'io_local'], [
  Q('Tu termómetro WiFi manda la temperatura al móvil. Se cae el WiFi de casa media hora. ¿Qué crees que pasa con las lecturas de ese rato?', ['Se pierden, salvo que el termómetro las guarde y las envíe después', 'Llegan igual, por otro camino', 'Se guardan solas en el móvil', 'El termómetro deja de medir'], 'Un sistema conectado es una cadena: si cae un eslabón, lo que viene detrás se queda sin datos, salvo que lo hayas previsto. Vamos a verlo.', { predict: true, c: 'io_arch', h: 'Piensa por dónde tiene que pasar la lectura para llegar al móvil.' }),
  { t: 'explore', text: 'Un sistema pequeño: un sensor de fugas, un ESP32 (el nodo), el WiFi, un broker que reparte los datos y tres destinos. Provoca averías y mira qué sigue vivo.', viz: 'io_chain', params: PP.chain(),
    tasks: [
      { q: 'soloHist', min: 1, max: 1, text: 'Tira la base de datos', done: 'El panel y la sirena siguen: solo se pierde el historial de ese rato.', hint: 'Elige la avería «Se cae la base de datos».' },
      { q: 'panel', min: 0, max: 0, text: 'Ahora tira el WiFi o el broker', done: 'Todo lo que cuelga detrás se queda sin datos, sirena incluida.', hint: 'Elige que se caiga el WiFi o el broker.' },
      { q: 'alarmaSinRed', min: 1, max: 1, text: 'Con el WiFi caído, consigue que la sirena suene igual', done: 'Si el nodo decide la alarma él mismo, no depende de la red.', hint: 'Activa «Decide en el nodo».' }
    ] },
  I('Un sistema IoT es una <b>cadena</b>: el <b>sensor</b> mide, el <b>nodo</b> (un microcontrolador como el ESP32) lee y envía, la <b>red</b> transporta, el <b>broker o servidor</b> reparte, la <b>base de datos</b> guarda y un <b>panel o una automatización</b> usa el dato.', { svg: FLOW(['Sensor', 'Nodo', 'Red', 'Broker', 'Base de datos', 'Panel'], 'el dato viaja de eslabón en eslabón'), more: 'Un <b>broker</b> es un intermediario: recibe mensajes y los entrega a quien los quiere. Lo verás a fondo en el módulo de MQTT.\nEl valor no está en medir, sino en lo que haces con la medida: avisar, guardar para comparar, encender algo.' }),
  I('No todas las radios hablan IP, el idioma de internet. Un sensor Zigbee necesita una <b>pasarela</b> que traduzca. Y a veces la cadena es cortísima: un termómetro que sirve su propia página es sensor, nodo y «panel» a la vez.', { svg: VS({ t: 'Cadena larga', l: ['Sensor Zigbee', '→ pasarela', '→ red de casa', '→ servidor', '→ panel'] }, { t: 'Cadena corta', l: ['Termómetro WiFi', 'con su página web', '(todo en un chip)'], c: 'var(--ok)' }) }),
  I('Los datos viajan en dos sentidos: <b>subida</b> (telemetría, del nodo al servidor), normalmente periódica, y <b>bajada</b> (órdenes, del servidor al nodo), a demanda.', { svg: '<svg viewBox="0 0 300 120" class="viz"><rect x="8" y="40" width="80" height="34" rx="6" fill="var(--ice)" stroke="currentColor" stroke-width="1.4"/><text x="48" y="61" text-anchor="middle" class="vizlab">Nodo</text><rect x="212" y="40" width="80" height="34" rx="6" fill="var(--ice)" stroke="currentColor" stroke-width="1.4"/><text x="252" y="61" text-anchor="middle" class="vizlab">Servidor</text><path d="M92 48H208" stroke="var(--led)" stroke-width="2.5" class="a-flow"/><path d="M208 68H92" stroke="var(--ok)" stroke-width="2.5" class="a-flow-rev"/><text x="150" y="36" text-anchor="middle" class="vizsm">subida: 21,4 °C</text><text x="150" y="90" text-anchor="middle" class="vizsm">bajada: «enciende»</text></svg>' }),
  I('Hacer trabajo en el propio nodo se llama computación en el <b>borde</b> (edge): filtrar, resumir, decidir alarmas. Lo crítico se decide ahí, porque funciona aunque se caiga la red. Mira la sirena con el WiFi caído:', { tune: { viz: 'io_chain', params: PP.chain({ corte: LS('Avería (0 ninguna, 1 WiFi, 2 broker, 3 base de datos)', 1, [0, 1, 2, 3]), local: LS('Decide en el nodo (0 no, 1 sí)', 1, [0, 1]) }) } }),
  { t: 'steps', text: 'Sigue una lectura de temperatura desde el sensor hasta tu móvil.', steps: ['El <b>sensor</b> convierte la temperatura en una señal eléctrica (una tensión o un dato digital).', 'El <b>ESP32</b> la lee, la convierte en un número (21,4) y la empaqueta en un mensaje.', 'El <b>WiFi</b> lleva el mensaje hasta el router de casa.', 'El <b>broker</b> lo recibe y lo entrega a todos los interesados: la base de datos y el panel.', 'La <b>base de datos</b> guarda 21,4 con su hora; el <b>panel</b> lo dibuja en tu móvil.'], result: 'Cinco saltos: si uno falla, los que vienen detrás se quedan sin el dato.' },
  { t: 'order', q: 'Ordena el viaje de una lectura de humedad hasta la gráfica de tu móvil.', items: ['El sensor convierte la humedad en una señal', 'El ESP32 la lee y la empaqueta', 'El WiFi la lleva hasta el router', 'El broker la recibe y la reparte', 'La base de datos la guarda con su hora', 'El panel la dibuja en el móvil'], e: 'Cada eslabón depende del anterior.', c: 'io_arch', h: 'Empieza por lo que toca el mundo físico y termina en lo que miras tú.' },
  { t: 'match', q: 'Une cada pieza con su función.', pairs: [['Nodo', 'Lee sensores y envía datos'], ['Pasarela', 'Traduce entre radios distintas'], ['Broker', 'Recibe mensajes y los reparte'], ['Base de datos', 'Guarda valores con su hora']], c: 'io_arch', h: 'Piensa en el verbo de cada pieza: leer, traducir, repartir, guardar.' },
  Q('Una orden «enciende la calefacción» enviada desde el móvil viaja…', ['De bajada: del servidor hacia el nodo', 'De subida: del nodo al servidor', 'Por el sensor', 'Siempre directamente del móvil al relé'], 'La telemetría sube; las órdenes bajan.', { c: 'io_arch', h: '¿Quién manda y quién obedece? La orden va hacia el que obedece.' }),
  Q('Un ESP32 lee la humedad del suelo y abre una válvula si está seco, sin hablar con nadie. ¿Es IoT?', ['Todavía no: es un sistema embebido; sería IoT si se conectara para informar o recibir órdenes', 'Sí, porque lleva un ESP32', 'Sí, porque el chip tiene WiFi', 'No, porque no tiene pantalla'], 'IoT = cosas conectadas que comparten datos.', { c: 'io_arch', h: 'Busca el eslabón de la red en esa descripción.' }),
  Q('Se cae la base de datos durante una hora. ¿Qué pierdes en un buen diseño?', ['El historial de esa hora; el panel en directo y las alarmas siguen', 'Todo el sistema', 'Solo las alarmas', 'Nada en absoluto'], 'La base de datos guarda; no reparte ni decide.', { c: 'io_arch', h: 'Recuerda lo que pasó en la exploración al tirar la base de datos.' }),
  Q('¿Dónde conviene decidir que suene la alarma de una fuga de agua?', ['En el propio nodo, y además avisar por la red', 'Solo en un servidor en la nube', 'En el panel del móvil', 'En la base de datos'], 'Lo crítico, en local: no depende de la red.', { c: 'io_local', h: '¿Qué eslabones pueden fallar entre el sensor y un servidor lejano?' }),
  Q('El broker se apaga. ¿Qué sigue funcionando en un buen diseño?', ['La lógica local de cada nodo (alarmas, límites de seguridad)', 'Nada', 'Los paneles del móvil', 'Las automatizaciones entre nodos'], 'Diseña pensando en que cada eslabón puede fallar.', { c: 'io_local', h: 'Lo que pasa por el broker se para; lo que decide cada nodo, no.' }),
  I('<b>Resumen</b>\n· Un sistema IoT es una cadena: sensor, nodo, red, broker o servidor, base de datos y panel.\n· Si un eslabón cae, lo que cuelga detrás se queda sin datos.\n· La <b>pasarela</b> traduce radios que no hablan IP.\n· Subida = telemetría; bajada = órdenes.\n· Lo crítico se decide en el nodo (el borde).')
 ]),
 L('io2', 'Requisitos: energía, alcance, datos y latencia', 'gauge', ['io_reqs', 'io_datavol', 'io_radio'], [
  Q('Un sensor a pilas envía la temperatura por WiFi cada 10 segundos. ¿Cuánto crees que le duran las pilas?', ['Días o pocas semanas', 'Varios años', 'Siempre: envía muy poco', 'Exactamente un año'], 'Conectarse al WiFi cuesta mucha energía cada vez; despertar cada 10 s vacía las pilas en días. Antes de elegir nada hay que fijar los requisitos y echar cuentas.', { predict: true, c: 'io_radio', h: 'Piensa en lo que cuesta encender la radio, no en lo que ocupa el dato.' }),
  { t: 'explore', text: 'Un nodo envía mensajes de cierto tamaño cada cierto tiempo. Mira cuántos datos salen y cuánto tardaría en enterarse de una orden si duerme entre envíos.', viz: 'io_datarate', params: PP.datarate(),
    tasks: [
      { q: 'mbMes', min: 100, max: 1e9, text: 'Consigue que envíe más de 100 MB al mes', done: 'Mensajes grandes y muy seguidos: casi como una cámara. Para un sensor, absurdo.', hint: 'Sube el tamaño y baja mucho el intervalo.' },
      { q: 'perDia', min: 0, max: 1000, text: 'Ahora baja de 1 kB (1000 bytes) al día', done: 'Pocos bytes y espaciados: así es un sensor típico.', hint: 'Mensajes pequeños y envíos muy espaciados.' },
      { q: 'espera', min: 0, max: 10, text: 'Haz que una orden tarde como mucho 10 s en llegarle', done: 'Para eso tiene que despertar cada 10 s o menos: la latencia corta cuesta energía.', hint: 'Baja el intervalo entre envíos.' }
    ] },
  I('Antes de elegir chip o radio, escribe los <b>requisitos</b>. En cada caso, el más exigente es el que decide.', { svg: CHK([['Energía: ¿enchufe o pila? ¿Cuántos meses?', 2], ['Alcance: ¿metros o kilómetros? ¿Paredes?', 2], ['Datos: ¿cuántos bytes y cada cuánto?', 2], ['Latencia: ¿cuánto puede tardar un aviso?', 2], ['Coste: por nodo, infraestructura y mantenimiento', 2]], 'Las cinco preguntas') }),
  I('El volumen de datos sale de multiplicar <b>lo que ocupa cada mensaje</b> por <b>cuántas veces se envía</b>. Un día tiene 86 400 s.', { code: 'mensajes al día = 86 400 / intervalo (en s)\nbytes al día    = mensajes al día × bytes por mensaje\nbytes al mes    = bytes al día × 30\n\n1 kB = 1000 bytes     1 MB = 1 000 000 bytes' }),
  I('Lo caro no es el dato, es la <b>radio encendida</b>. El WiFi del ESP32 consume del orden de 100–250 mA mientras transmite; dormido, el chip baja a unos 10 µA. Cada despertar (asociarse, conectar, enviar) dura segundos.', { svg: BARS([['Transmitiendo por WiFi', 200, 'var(--err)'], ['Despierto, sin radio', 40], ['Dormido (solo el chip)', 0.01, 'var(--ok)']], ' mA', 'valores orientativos; dormido apenas se ve la barra') }),
  I('La <b>latencia</b> no es solo la red: un nodo que duerme 15 minutos tarda hasta 15 minutos en enterarse de una orden. Por eso los actuadores suelen ir enchufados y escuchando, y los sensores a pila solo hablan.', { svg: VS({ t: 'Sensor a pila', l: ['duerme casi siempre', 'habla cuando quiere', 'oye tarde las órdenes'] }, { t: 'Actuador enchufado', l: ['escucha siempre', 'obedece al momento', 'gasta todo el tiempo'], c: 'var(--led)' }), more: 'El coste también engaña: un nodo de largo alcance cuesta más que un ESP32, pero si evita tirar 300 m de cable o poner un repetidor en cada caseta, sale a cuenta. Y cambiar pilas también es un coste: 100 nodos que duran 6 meses son 200 cambios al año.' }),
  { t: 'steps', text: 'Un nodo envía 20 bytes cada 10 minutos. ¿Cuántos bytes al día y al mes?', steps: ['Pasa el intervalo a segundos: 10 min = 600 s.', 'Mensajes al día: 86 400 / 600 = <b>144</b>.', 'Bytes al día: 144 × 20 = <b>2880 bytes</b>, unos 2,9 kB.', 'Bytes al mes: 2880 × 30 = <b>86 400 bytes</b>, menos de 0,1 MB.'], result: 'Muy poco: en un sensor, el tamaño casi nunca es el problema; la energía, sí.' },
  Nm('Un nodo envía 50 bytes cada minuto. ¿Cuántos bytes al día?', 72000, 'bytes', '1440 mensajes × 50 bytes.', { c: 'io_datavol', h: 'Primero cuenta los mensajes de un día: un día tiene 1440 minutos.' }),
  Nm('Un nodo envía 20 bytes cada 10 minutos. ¿Cuántos mensajes al día?', 144, 'mensajes', '86 400 s / 600 s.', { c: 'io_datavol', h: 'Pasa los 10 minutos a segundos y divide el día entre eso.' }),
  G('io_dataMonth'),
  { t: 'match', q: 'Une cada caso con su requisito más exigente.', pairs: [['Sensor de fugas a pilas bajo la lavadora', 'Energía: años con pilas'], ['Estación en una finca a 3 km', 'Alcance'], ['Cámara de vigilancia', 'Ancho de banda'], ['Timbre', 'Latencia: aviso en segundos']], c: 'io_reqs', h: 'Pregúntate qué es lo primero que fallaría en cada caso.' },
  Q('Una persiana debe responder en menos de un segundo a un botón del móvil. ¿Qué implica?', ['Que su nodo debe estar siempre escuchando, normalmente con alimentación fija', 'Que puede dormir 10 minutos', 'Que debe enviar más datos', 'Nada especial'], 'Escuchar siempre = consumo constante.', { c: 'io_radio', h: '¿Puede obedecer un nodo que está dormido?' }),
  Q('Con el mismo dato, ¿qué cambia más el consumo de un nodo a pilas?', ['Cada cuánto despierta y cuánto tarda en conectar y enviar', 'El número de decimales del dato', 'El nombre del dato', 'El color de la caja'], 'Lo caro es tener la radio encendida.', { c: 'io_radio', h: 'Mira las barras de consumo: ¿qué estado gasta más?' }),
  Q('Un sensor en un sótano de hormigón a 40 m del router. ¿Qué requisito compruebas primero?', ['El alcance real, midiendo la señal en el sitio', 'El coste del servidor', 'El tamaño de cada mensaje', 'El número de decimales'], 'El hormigón y el metal atenúan mucho la radio del WiFi.', { c: 'io_reqs', h: 'Sótano, hormigón, 40 m: ¿qué puede impedir que el dato salga?' }),
  Q('100 sensores con pilas que duran 6 meses frente a otros cuyas pilas duran 5 años. ¿Qué coste se olvida fácilmente?', ['La mano de obra de cambiar 200 pilas al año', 'El precio del servidor', 'La electricidad del router', 'Ninguno'], 'A gran escala, manda el mantenimiento.', { c: 'io_reqs', h: 'Cuenta cuántas veces al año hay que ir a cada sensor.' }),
  I('<b>Resumen</b>\n· Fija los requisitos antes de elegir: energía, alcance, datos, latencia y coste.\n· Datos = bytes por mensaje × mensajes (un día son 86 400 s).\n· Lo que gasta es la radio encendida, no el tamaño del dato.\n· Dormir ahorra, pero alarga la latencia de las órdenes.')
 ]),
 L('io3', 'Elegir la radio', 'antenna', ['io_radiopick', 'io_espchips', 'io_radio'], [
  Q('Necesitas leer el nivel de un depósito de agua a 4 km de casa, sin enchufe. ¿Qué radio crees que sirve?', ['Una de largo alcance y muy pocos datos, como LoRaWAN', 'WiFi con un buen router', 'Bluetooth', 'Ninguna: hay que tirar cable'], 'Hay radios pensadas justo para eso: kilómetros con pocos bytes y muy poco consumo. Vamos a ver cuál encaja en cada caso.', { predict: true, c: 'io_radiopick', h: 'Fíjate en dos cosas: la distancia y que no hay enchufe.' }),
  { t: 'explore', text: 'Mueve los requisitos y mira qué radios los cumplen (✓ en las cuatro columnas). La recomendada es la más sencilla y barata de las que encajan.', viz: 'io_radiopick', params: PP.radiopick(),
    tasks: [
      { q: 'rec', min: 3, max: 3, text: 'Consigue que la recomendada sea LoRaWAN', done: 'Kilómetros, pocos bytes y pila: territorio LoRaWAN.', hint: 'Mucha distancia y datos al mínimo.' },
      { q: 'rec', min: 0, max: 0, text: 'Ahora que sea WiFi', done: 'Enchufado y a distancias de casa: el WiFi gana por ancho de banda y sencillez.', hint: 'Ponlo enchufado y cerca.' },
      { q: 'rec', min: 5, max: 5, text: 'Y ahora LTE-M', done: 'Si se mueve lejos de casa, solo una red celular con movilidad lo cubre.', hint: 'Haz que se mueva lejos.' }
    ] },
  I('Las radios más usadas en IoT, con valores orientativos (el entorno lo cambia todo):', { code: 'Radio     Alcance típico      Datos             Consumo   Infraestructura\nWiFi      10–50 m interior    Mbit/s            Alto      Router\nBLE       10–30 m             hasta ~1 Mbit/s   Muy bajo  Móvil o pasarela\nZigbee    10–20 m por salto   250 kbit/s        Bajo      Coordinador\nThread    10–20 m por salto   250 kbit/s        Bajo      Border router\nLoRaWAN   2–15 km exterior    0,3–5 kbit/s      Muy bajo  Pasarela y servidor\nNB-IoT    Operador            decenas de kbit/s Bajo*     SIM y tarifa\nLTE-M     Operador            hasta ~1 Mbit/s   Bajo*     SIM y tarifa\n* con sus modos de ahorro', more: 'BLE es Bluetooth de baja energía. Zigbee y Thread forman <b>mallas</b>: los equipos enchufados repiten los mensajes de los demás. NB-IoT y LTE-M usan la red de un operador de telefonía, como un móvil. Cada una tiene su lección más adelante.' }),
  I('No hay radio «mejor»: hay la que cumple tus requisitos. Pregunta en este orden y descarta:', { svg: FLOW(['¿Enchufe o pila?', '¿Distancia?', '¿Cuántos datos?', '¿Se mueve?', '¿Coste?'], 'cada respuesta tacha radios') }),
  I('Mira qué radio trae tu chip: lo que no está en el silicio no se arregla con código. El ESP32 clásico solo habla WiFi de 2,4 GHz y Bluetooth. Para LoRa o redes celulares hace falta un módulo aparte (por ejemplo, SX1262 o SIM7080G).', { code: 'Chip        WiFi 2,4 GHz   Bluetooth LE   Zigbee / Thread\nESP32       sí             sí             no\nESP32-C6    sí             sí             sí\nESP32-H2    no             sí             sí', more: 'Hay más variantes: el ESP32-S3 (WiFi y BLE, más memoria y potencia) o el ESP32-C5, que además trabaja en la banda de 5 GHz. Comprueba siempre en la hoja de datos qué radios trae cada modelo.' }),
  { t: 'steps', text: 'Sensores de puerta a pila por toda la casa, que ya tiene varios enchufes inteligentes. ¿Qué radio?', steps: ['Energía: a pila → descarta el WiFi, cada conexión cuesta mucho.', 'Distancia: toda la casa, con paredes → corto alcance, pero con ayuda.', 'Datos: abierta o cerrada de vez en cuando → poquísimos.', 'Infraestructura: los enchufes están siempre alimentados y pueden repetir mensajes → una <b>malla</b>.'], result: 'Zigbee o Thread: malla de bajo consumo en la que los equipos enchufados repiten.' },
  { t: 'match', q: 'Une cada radio con su punto fuerte.', pairs: [['WiFi', 'Ancho de banda e IP directa'], ['Bluetooth LE', 'Consumo mínimo a pocos metros'], ['Zigbee / Thread', 'Malla de bajo consumo en casa'], ['LoRaWAN', 'Kilómetros con pocos bytes'], ['LTE-M', 'Cobertura del operador, también en marcha']], c: 'io_radiopick', h: 'Recuerda la tabla: alcance, datos y quién pone la infraestructura.' },
  Q('Una cámara de vídeo para el jardín, enchufada. ¿Qué radio?', ['WiFi', 'LoRaWAN', 'Zigbee', 'NB-IoT'], 'El vídeo necesita mucho ancho de banda.', { c: 'io_radiopick', h: '¿Cuántos datos genera un vídeo comparado con una temperatura?' }),
  Q('Un sensor de humedad en un campo a 3 km, sin WiFi ni enchufe, que envía 10 bytes cada 15 minutos.', ['LoRaWAN', 'Bluetooth LE', 'WiFi', 'Zigbee'], 'Largo alcance y bajo consumo con pocos datos.', { c: 'io_radiopick', h: 'Kilómetros y pila: tacha las de corto alcance.' }),
  Q('Un localizador para un remolque que recorre toda España.', ['LTE-M', 'Zigbee', 'WiFi', 'Bluetooth LE'], 'Necesita la cobertura del operador allí donde esté, y LTE-M lleva bien la movilidad.', { c: 'io_radiopick', h: '¿Qué infraestructura existe en cualquier carretera?' }),
  Q('Una pulsera que envía tus pulsaciones al móvil que llevas encima.', ['Bluetooth LE', 'LoRaWAN', 'NB-IoT', 'Zigbee'], 'Pocos metros, el móvil al lado y una batería diminuta.', { c: 'io_radiopick', h: '¿A qué distancia está el receptor?' }),
  Q('Quieres un nodo Thread con un chip de Espressif. ¿Cuál?', ['ESP32-C6 o ESP32-H2', 'ESP32 clásico', 'Cualquiera con WiFi', 'Ninguno: Espressif no tiene esa radio'], 'Zigbee y Thread usan una radio que el ESP32 clásico no tiene.', { c: 'io_espchips', h: 'Busca en la tabla la columna de Zigbee / Thread.' }),
  Q('Tu router solo emite en 5 GHz y tu ESP32 clásico no encuentra la red. ¿Solución?', ['Activar también la banda de 2,4 GHz en el router', 'Ponerle una antena externa', 'Actualizar la librería WiFi', 'Bajar la velocidad del puerto serie'], 'El ESP32 clásico no tiene radio de 5 GHz.', { c: 'io_espchips', h: '¿En qué banda trabaja la radio WiFi del ESP32 clásico?' }),
  Q('¿Por qué el WiFi casi nunca es buena idea para un sensor a pilas que envía cada 10 s?', ['Conectar y transmitir por WiFi cuesta mucha energía cada vez', 'El WiFi no admite datos pequeños', 'El WiFi no tiene alcance', 'Porque necesita una SIM'], 'Con envíos espaciados y el chip dormido entre medias sí puede servir.', { c: 'io_radio', h: 'Recuerda cuánto gasta el WiFi mientras transmite.' }),
  I('<b>Resumen</b>\n· Elige la radio por requisitos: energía, distancia, datos, movimiento y coste.\n· WiFi: datos y enchufe. BLE: pocos metros. Zigbee/Thread: malla en casa. LoRaWAN: kilómetros con bytes. LTE-M y NB-IoT: el operador.\n· Comprueba qué radios trae tu chip: el ESP32 clásico no tiene 5 GHz ni Zigbee.')
 ]),
 L('io4', 'Local primero: nube, privacidad y dependencia', 'shield', ['io_local', 'io_privacy'], [
  Q('Se cae internet en casa. Tu enchufe inteligente solo funciona con la app del fabricante. ¿Podrás encenderlo desde el móvil estando en casa?', ['No: la orden pasa por un servidor de fuera', 'Sí, porque estás en el mismo WiFi', 'Sí, pasa solo a Bluetooth', 'Solo si reinicias el router'], 'Muchos aparatos llevan el «cerebro» en la nube del fabricante: sin internet, se quedan tontos aunque estés al lado.', { predict: true, c: 'io_local', h: 'Piensa por dónde viaja la orden cuando todo funciona.' }),
  { t: 'explore', text: 'Una luz se enciende con un sensor de presencia. Cambia dónde vive la lógica y corta internet.', viz: 'io_outage', params: PP.outage(),
    tasks: [
      { q: 'luz', min: 0, max: 0, text: 'Con todo en la nube, corta internet', done: 'La luz deja de responder: el cerebro estaba fuera de casa.', hint: 'Pon internet en «Caído».' },
      { q: 'luzSinNet', min: 1, max: 1, text: 'Sin internet, consigue que la luz vuelva a funcionar', done: 'Con el servidor en casa, internet no hace falta para lo de dentro.', hint: 'Cambia la arquitectura.' },
      { q: 'mejor', min: 1, max: 1, text: 'Elige la que funciona sin internet y además deja ver resúmenes desde fuera', done: 'Híbrida: lo crítico en casa; fuera, solo lo que tú eliges.' }
    ] },
  I('Con la <b>nube del fabricante</b>, tu aparato habla con un servidor lejano y tu móvil con ese servidor. Si cierra el servicio, cambia sus condiciones o se cae internet, el aparato deja de servir.', { svg: VS({ t: 'Nube del fabricante', l: ['sin internet, no va', 'tus datos salen', 'depende de una empresa', 'acceso remoto fácil'], c: 'var(--err)' }, { t: 'Local primero', l: ['funciona sin internet', 'los datos no salen', 'latencia mínima', 'lo mantienes tú'], c: 'var(--ok)' }) }),
  I('<b>Local primero</b>: el broker, la base de datos y las automatizaciones viven en un equipo de tu casa, como una Raspberry Pi o un mini PC. A cambio, haces tú las copias y las actualizaciones, y el acceso desde fuera hay que montarlo con cuidado (lo verás en el módulo de redes).', { svg: FLOW(['Sensores', 'Servidor de casa', 'Automatización', 'Tu móvil (en casa)'], 'nada sale de casa si no quieres') }),
  I('Los datos de casa dicen mucho de ti. Mira una curva de consumo eléctrico minuto a minuto: se ve cuándo desayunas, cuándo te vas y cuándo cenas. Prueba a bajar la resolución:', { tune: { viz: 'io_privviz', params: PP.priv() }, more: 'Si esos datos salen a un servidor ajeno, ya no controlas quién los ve ni cuánto tiempo se guardan. En el módulo de seguridad verás qué dice la ley (el RGPD) sobre los datos personales.' }),
  I('La nube tiene su sitio: flotas de miles de nodos, lugares sin servidor propio, copias fuera de casa. Lo sensato suele ser una arquitectura <b>híbrida</b>: lo crítico funciona en local y fuera solo van los resúmenes que tú eliges.', { svg: FLOW(['Nodos', 'Servidor de casa', 'Resumen diario', 'Nube (opcional)'], 'lo crítico nunca depende del último eslabón') }),
  { t: 'steps', text: 'Ejercicio mental: quita una pieza y mira qué queda. Sistema: sensores en casa, un servidor domótico en una Raspberry Pi y una copia de resúmenes en la nube.', steps: ['Apaga internet: la Pi sigue automatizando; solo se pierden la copia y el acceso desde fuera.', 'Apaga la Pi: los sensores siguen midiendo, pero nadie automatiza; lo que decida cada aparato por sí mismo (un termostato, una alarma local) sigue.', 'Cierra el servicio en la nube: no pasa nada importante; no dependías de él.', 'Conclusión: la pieza más crítica es la Pi → copias de seguridad y una fuente de alimentación fiable.'], result: 'Cada pieza que quitas te dice de qué dependías.' },
  { t: 'match', q: 'Une cada ventaja con su enfoque.', pairs: [['Funciona sin internet', 'Local'], ['Acceso desde cualquier sitio sin configurar nada', 'Nube'], ['Tus datos no salen de casa', 'Local '], ['Escala a millones de dispositivos', 'Nube ']], c: 'io_local', h: 'Pregúntate qué necesita cada ventaja: ¿internet o tu casa?' },
  Q('¿Qué revela una curva de consumo eléctrico minuto a minuto?', ['Rutinas: cuándo te levantas, cocinas o la casa está vacía', 'Nada personal', 'Solo la tarifa', 'Solo la marca de los aparatos'], 'Los datos de energía son datos personales.', { c: 'io_privacy', h: 'Recuerda la gráfica con resolución de 1 minuto.' }),
  Q('Un sensor de presencia envía cada minuto a un servidor ajeno si hay alguien en casa. ¿Qué estás regalando?', ['Cuándo está la casa vacía', 'Nada personal', 'Solo la temperatura', 'La clave del WiFi'], 'Un dato inocente acumulado describe tu vida.', { c: 'io_privacy', h: '¿Qué podría hacer alguien sabiendo a qué horas no hay nadie?' }),
  Q('Un detector de humo conectado solo hace sonar su sirena si su servidor en la nube lo ordena. ¿Qué falla en el diseño?', ['Lo crítico depende de la red: la sirena debería decidirse en el propio detector', 'Nada, la nube es más fiable', 'Que debería enviar más datos', 'Que no guarda el historial'], 'Una alarma no puede esperar a internet.', { c: 'io_local', h: '¿Qué pasa si hay humo justo cuando no hay internet?' }),
  Q('Diseño sensato para un huerto con riego automático:', ['Riego decidido en local; fuera, solo resúmenes diarios si los quieres', 'Todo en la nube, también la válvula', 'Nada conectado', 'La válvula la abre cada mañana un servidor externo'], 'Lo crítico, local; lo accesorio, opcional.', { c: 'io_local', h: '¿Qué debe seguir funcionando aunque se corte internet una semana?' }),
  Q('Al comprar un aparato «inteligente», ¿qué pregunta te protege más a largo plazo?', ['¿Funciona en local, sin cuenta ni nube del fabricante?', '¿De qué color es?', '¿Tiene muchas funciones?', '¿Viene con app?'], 'Busca control local: más adelante verás ESPHome, Zigbee, Matter y MQTT.', { c: 'io_local', h: 'Piensa en qué pasa si el fabricante cierra dentro de tres años.' }),
  I('<b>Resumen</b>\n· Con la nube del fabricante dependes de internet y de una empresa.\n· <b>Local primero</b>: broker, datos y automatizaciones en casa.\n· Los datos de casa revelan rutinas: son datos personales.\n· Diseño híbrido: lo crítico en local, fuera solo lo que tú eliges.')
 ]),
 SIM('io-s1', 'Reto: nodo de alarma con histéresis', 'Monta la parte local de un nodo IoT: un sensor en el GPIO34 y un LED de alarma en el GPIO25. El programa enciende la alarma por encima de 2800 cuentas y solo la apaga por debajo de 2400. Mueve el potenciómetro (o la luz de la LDR) para activarla y desactivarla.', { arduino: 'io_umbral', board: 'esp32', parts: ['pot', 'ldr', 'res', 'led'], code: true, hint: 'Potenciómetro: un extremo a 3V3, el otro a GND y el cursor al D34. LED: D25 → resistencia de 100–220 Ω → ánodo; cátodo a GND. Con LDR: LDR de 3V3 al D34 y 10 kΩ del D34 a GND.' }, 'io_umbral')
],
exam: [
  Q('La gráfica histórica del móvil tiene un hueco de 2 horas, pero en ese rato el panel en directo funcionó y las alarmas sonaron bien. ¿Qué eslabón falló?', ['La base de datos', 'El sensor', 'El WiFi', 'El broker'], 'Si hubieran fallado el sensor, el WiFi o el broker, el panel en directo también se habría quedado sin datos. Solo falló la pieza que guarda: la base de datos.', { c: 'io_arch', l: 'io1', h: 'Mira qué siguió funcionando: todo lo que estaba antes del eslabón roto en la cadena siguió vivo.' }),
  Q('Un sensor de puerta Zigbee debe mandar sus datos a tu broker, que trabaja por IP. ¿Qué pieza necesitas?', ['Una pasarela que traduzca entre Zigbee e IP', 'Un repetidor WiFi junto al sensor', 'Darle una IP fija al sensor', 'Un servidor en la nube'], 'Zigbee no habla IP: hace falta una pasarela que reciba por esa radio y lo reenvíe a la red IP. Un repetidor WiFi no entiende Zigbee.', { c: 'io_arch', l: 'io1', h: 'Piensa en qué idioma habla cada radio y quién traduce entre ellas.' }),
  { t: 'match', q: 'Une cada situación con la idea de la cadena IoT que la describe.', pairs: [['La humedad del huerto sale cada 10 minutos', 'Telemetría de subida'], ['Abres la válvula desde el móvil', 'Orden de bajada'], ['El ESP32 decide él mismo la alarma de fuga', 'Computación en el borde'], ['Un sensor Zigbee llega a la red IP', 'Pasarela']], e: 'Subida: del nodo al servidor, periódica. Bajada: órdenes hacia el nodo. Borde: decidir en el propio nodo. Pasarela: traducir radios que no hablan IP.', c: 'io_arch', l: 'io1', h: 'Fíjate en el sentido en que viaja el dato y en dónde se toma la decisión.' },
  Q('La regla «si pasa de 35 °C, abre la ventilación» de un invernadero vive en un servidor. Se cae el WiFi una tarde de calor. ¿Qué pasa?', ['El nodo sigue midiendo, pero nadie abre la ventilación aunque haga 40 °C', 'La ventilación se abre igual: el servidor lo hace por otro camino', 'El nodo decide solo, porque detecta que no hay red', 'Nada: el servidor guarda la orden y la ejecuta en el momento'], 'Sin red, el dato no llega al servidor y la orden no vuelve. Lo crítico se decide en el propio nodo, y por la red solo se informa.', { c: 'io_local', l: 'io1', h: 'Sigue el camino del dato hasta la decisión y de vuelta a la ventilación: ¿qué tramo se ha cortado?' }),
  Q('Sensor de fugas → ESP32 → WiFi → broker en una Raspberry Pi → base de datos y móvil. La sirena la decide el ESP32. Se apaga la Raspberry Pi. ¿Qué sigue funcionando?', ['La sirena del ESP32; se pierden el historial y el aviso al móvil', 'Todo, porque el WiFi sigue encendido', 'Nada: sin broker no hay sistema', 'El aviso al móvil, pero no la sirena'], 'La Pi hace de broker y de base de datos: sin ella no hay reparto ni historial. Pero la decisión local del ESP32 no depende de nadie.', { c: 'io_arch', l: 'io1', h: 'Separa lo que depende de la Pi de lo que el nodo hace por su cuenta.' }),
  Nm('Un nodo envía 40 bytes cada 30 s. ¿Cuántos bytes envía al día?', 115200, 'bytes', '86 400 / 30 = 2880 mensajes al día; 2880 × 40 = 115 200 bytes, unos 115 kB.', { tol: 1, c: 'io_datavol', l: 'io2', h: 'Primero cuenta los mensajes del día (86 400 s entre el intervalo) y luego multiplica por su tamaño.' }),
  Nm('Una flota de 50 nodos envía, cada uno, 25 bytes cada 5 minutos. ¿Cuántos MB suman en un mes de 30 días?', 10.8, 'MB', 'Cada nodo: 86 400 / 300 = 288 mensajes × 25 bytes = 7200 bytes al día. Los 50: 360 000 bytes al día. En 30 días: 10 800 000 bytes = 10,8 MB.', { tol: 0.1, c: 'io_datavol', l: 'io2', h: 'Calcula un nodo en un día, multiplica por los nodos y por los días, y pasa a MB (1 MB = 1 000 000 bytes).' }),
  TU('Tu tarifa permite 1 MB al mes y cada mensaje ocupa 100 bytes. Elige el intervalo más corto que cabe en la tarifa.', 'io_datarate', PP.datarate({ B: FX(100), s: LS('Un envío cada', 10, [1, 5, 10, 30, 60, 300, 600, 900, 3600], 's') }), { q: 'mbMes', min: 0.5, max: 1, text: 'Objetivo: lo más a menudo posible sin pasar de 1 MB al mes', hint: 'Calcula los bytes al mes de cada intervalo.' }, 'Cada 300 s: 288 envíos al día × 100 bytes × 30 días = 0,864 MB. Cada 60 s ya serían 4,32 MB.', { c: 'io_datavol', l: 'io2', h: 'Bytes al mes = 86 400 / intervalo × 100 × 30: busca el intervalo más corto que quede por debajo de 1 000 000.' }),
  Q('Un medidor de nivel de un depósito en el tejado, a pilas, cuyo nivel cambia unos centímetros al día. ¿Qué requisito es el más exigente?', ['Energía: que las pilas duren años', 'Latencia: avisar en milisegundos', 'Ancho de banda: muchos datos por segundo', 'Coste del servidor'], 'El dato cambia despacio y ocupa poco; lo difícil es que un aparato a pilas en un tejado no haya que tocarlo en años.', { c: 'io_reqs', l: 'io2', h: 'Piensa en qué te obligaría a subir al tejado más a menudo.' }),
  Q('Un sensor de presencia debe encender la luz del pasillo nada más entrar. ¿Qué requisito manda y qué implica?', ['La latencia: debe avisar en menos de un segundo, así que no puede dormir minutos entre envíos', 'El volumen de datos: necesita mucho ancho de banda', 'El alcance: necesita una radio de kilómetros', 'Ninguno especial: puede enviar cada 15 minutos'], 'Una luz que tarda minutos no sirve. Avisar al momento obliga a tener la radio lista, y eso condiciona la alimentación.', { c: 'io_reqs', l: 'io2', h: '¿Qué pasaría si el aviso llegara 5 minutos tarde?' }),
  Nm('Tienes 40 sensores cuyas pilas duran 4 meses. ¿Cuántos cambios de pilas haces al año?', 120, 'cambios', 'Cada sensor necesita 12 / 4 = 3 cambios al año; los 40, 120 cambios. Ese mantenimiento es un coste real que se olvida al elegir.', { tol: 0, c: 'io_reqs', l: 'io2', h: 'Cuántas veces cabe 4 meses en un año, y luego por el número de sensores.' }),
  Q('Un actuador de riego a pilas duerme 15 minutos entre despertares. Le mandas «cierra la válvula» justo después de que se duerma. ¿Cuándo la cumple?', ['Hasta 15 minutos después, en su siguiente despertar', 'Al instante', 'Nunca: dormido pierde las órdenes', 'Al cabo de 15 segundos'], 'Dormido, la radio está apagada: no oye nada. La orden espera a que despierte. Por eso los actuadores que deben responder rápido suelen ir enchufados.', { c: 'io_radio', l: 'io2', h: 'Mientras duerme, ¿tiene la radio encendida?' }),
  Q('Dos diseños envían los mismos 20 bytes cada hora. A se queda conectado al WiFi todo el rato; B duerme y solo se conecta para enviar. ¿Cuál dura más con pilas?', ['B: su radio solo está encendida unos segundos por hora', 'A: no gasta en reconectar', 'Igual: envían los mismos datos', 'A: el WiFi conectado no consume si no envía'], 'Lo caro es la radio encendida. Mantener la asociación cuesta corriente todo el rato; B paga unos segundos de conexión y el resto del tiempo gasta microamperios.', { c: 'io_radio', l: 'io2', h: 'Compara cuánto tiempo pasa cada uno con la radio activa a lo largo de una hora.' }),
  Q('En cada despertar de un nodo WiFi a pilas, ¿qué parte suele gastar más energía?', ['Asociarse al WiFi, conectar y enviar: segundos con la radio a cientos de mA', 'Leer el sensor', 'Calcular la media de las lecturas', 'Volver a dormir'], 'Medir y calcular duran milisegundos con poca corriente. La radio del ESP32 pide del orden de 100–250 mA y la conexión dura segundos.', { c: 'io_radio', l: 'io2', h: 'Multiplica mentalmente corriente por tiempo para cada fase.' }),
  { t: 'match', q: 'Une cada caso con la radio que mejor encaja.', pairs: [['Nivel de un pozo a 6 km de casa, a pila', 'LoRaWAN'], ['Vigilabebés con vídeo, enchufado', 'WiFi'], ['Sensores de ventana a pila en un piso con enchufes inteligentes', 'Zigbee o Thread'], ['Llavero que avisa al móvil si te lo dejas', 'Bluetooth LE'], ['Contenedores que viajan en camión por la provincia', 'LTE-M']], e: 'Kilómetros con pocos bytes: LoRaWAN. Vídeo: WiFi. Malla con equipos enchufados que repiten: Zigbee o Thread. Pocos metros con el móvil: BLE. Movilidad con cobertura del operador: LTE-M.', c: 'io_radiopick', l: 'io3', h: 'Para cada caso, pregúntate por la distancia, la cantidad de datos, la alimentación y si se mueve.' },
  Q('Casa de campo sin cobertura móvil. Un sensor a pila a 800 m de la casa envía 12 bytes cada 10 minutos. ¿Qué radio encaja?', ['LoRaWAN, con una pasarela propia en la casa', 'LTE-M', 'WiFi con un repetidor', 'Bluetooth LE'], 'Sin cobertura, LTE-M no sirve. El WiFi no llega a 800 m y gasta mucho a pila; BLE se queda en metros. LoRaWAN cubre kilómetros con pocos bytes y poco consumo.', { c: 'io_radiopick', l: 'io3', h: 'Descarta por orden: alimentación, distancia y qué infraestructura existe.' }),
  Q('Quieres un único chip de Espressif que se conecte al WiFi de tu router y además sea nodo Zigbee. ¿Cuál?', ['ESP32-C6', 'ESP32-H2', 'ESP32 clásico', 'ESP32-S3'], 'El C6 trae WiFi de 2,4 GHz, Bluetooth LE y la radio de Zigbee y Thread. El H2 no tiene WiFi; el clásico y el S3 no tienen radio Zigbee.', { c: 'io_espchips', l: 'io3', h: 'Necesitas las dos radios en el mismo silicio: repasa la tabla de chips.' }),
  Q('Tu proyecto con un ESP32 clásico necesita enviar datos a 5 km por LoRaWAN. ¿Qué haces?', ['Añadir un módulo de radio LoRa aparte, por ejemplo con un SX1262', 'Actualizar el firmware para activar LoRa', 'Usar el Bluetooth a más potencia', 'Cambiar a un ESP32-C6'], 'Lo que no está en el silicio no se arregla con código. Ningún ESP32 de la tabla trae LoRa: hace falta un módulo de radio externo.', { c: 'io_espchips', l: 'io3', h: '¿Qué radios trae de fábrica cada chip de la tabla?' }),
  Q('Tu termostato solo se controla con la app del fabricante, que anuncia que cierra el servicio dentro de 6 meses. ¿Qué te puede pasar?', ['Quedarte sin control o sin funciones, aunque el aparato siga sano', 'Nada: el aparato funciona solo en casa', 'Que el termostato pase solo a modo local', 'Que te devuelvan el dinero automáticamente'], 'Si el «cerebro» vive en la nube del fabricante, el aparato depende de esa empresa. Por eso conviene que lo importante funcione en local.', { c: 'io_local', l: 'io4', h: '¿Dónde vive la lógica de ese aparato?' }),
  Q('Montas un sistema híbrido. ¿Qué tiene sentido dejar en la nube?', ['Una copia de resúmenes diarios para verlos desde fuera', 'La lógica de la alarma de fuga', 'La apertura de la cerradura', 'El broker por el que pasan todas las órdenes'], 'Lo crítico (alarmas, cerradura, el reparto de órdenes) en local; fuera, solo lo accesorio que tú eliges, como resúmenes o copias.', { c: 'io_local', l: 'io4', h: 'Pregúntate qué deja de funcionar si se cae internet.' }),
  Q('Tu compañía de energía solo necesita tu consumo para facturar. ¿Qué es lo sensato compartir?', ['El total diario o mensual, no la curva minuto a minuto', 'La curva minuto a minuto, para que sea exacta', 'La curva y la ocupación de cada habitación', 'Nada en absoluto, ni siquiera el total'], 'Para facturar basta el total. La curva fina revela cuándo te levantas, cocinas o la casa está vacía: son datos personales.', { c: 'io_privacy', l: 'io4', h: '¿Qué resolución hace falta para facturar y qué revela una resolución más fina?' }),
  Q('Un sensor de apertura de la puerta de casa envía cada cambio a un servidor ajeno. ¿Qué información sensible acaba allí?', ['Cuándo entra y sale gente, y cuándo está la casa vacía', 'Nada: solo son aperturas', 'La contraseña del WiFi', 'El consumo eléctrico'], 'Un dato «inocente» acumulado con su hora describe tu rutina, incluida la hora a la que no hay nadie.', { c: 'io_privacy', l: 'io4', h: 'Imagina una semana de esos datos con su hora: ¿qué se deduce?' })
] },

{ id: 'io-m2', title: 'Redes para electrónicos', desc: 'IP, máscara, DHCP, DNS, puertos, TCP y UDP, NAT, IPv6 y WiFi de 2,4 GHz, con diagnóstico práctico.', nodes: [
 L('io5', 'Direcciones IP, máscara y puerta de enlace', 'wifi', ['io_net', 'io_masks', 'io_private'], [
  Q('Tu ESP32 tiene la dirección 192.168.1.37 y tu broker la 192.168.1.10. ¿Cómo crees que sabe el ESP32 que puede hablarle directamente, sin pasar por el router?', ['Comparando la parte de «red» de las dos direcciones', 'Preguntándoselo a internet', 'Porque las dos empiezan por 192', 'No lo sabe: todo pasa siempre por el router'], 'Cada dirección tiene una parte de red y una parte de equipo. Si la parte de red coincide, se hablan directamente. Quien dice dónde está la frontera es la máscara.', { predict: true, c: 'io_net', h: 'Piensa en una dirección postal: calle y número de portal.' }),
  { t: 'explore', text: 'A es tu broker (192.168.1.10). Mueve la dirección de B y la máscara. Los bits en color son la parte de red: deben coincidir para hablar sin router.', viz: 'io_subnet', params: PP.subnet(),
    tasks: [
      { q: 'misma', min: 0, max: 0, text: 'Cambia el tercer número de B para sacarlo de la red de A', done: 'Con /24, los tres primeros números son la red. Si no coinciden, el paquete va al router.', hint: 'Mueve «Tercer número de B».' },
      { q: 'juntosAncha', min: 1, max: 1, text: 'Sin tocar B, elige una máscara más corta que los vuelva a juntar', done: 'Con menos bits de red, la parte que debe coincidir es más corta.', hint: 'Prueba con /16.' },
      { q: 'hosts', min: 62, max: 62, text: 'Elige una máscara con sitio para exactamente 62 equipos', done: '/26 deja 6 bits para equipos: 64 direcciones menos 2 reservadas.', hint: 'Más bits de red, menos equipos.' }
    ] },
  I('Cada equipo de tu red tiene una <b>dirección IP</b> (IPv4): cuatro números de 0 a 255, es decir, 4 bytes (32 bits). Una red de casa típica:', { code: 'Router (puerta de enlace)  192.168.1.1\nRaspberry Pi (broker)      192.168.1.10\nESP32 del salón            192.168.1.37\nMáscara                    255.255.255.0  (= /24)' }),
  I('La <b>máscara</b> marca cuántos bits son la red. /24 son 24 unos seguidos: los tres primeros números son la red y el último, el equipo. Con /24 quedan 8 bits: 256 direcciones, pero la primera (la de red) y la última (la de difusión) están reservadas: caben <b>254</b> equipos.', { code: '255.255.255.0 = 11111111.11111111.11111111.00000000\n                └──────── 24 bits de red ───────┘└ equipo ┘\n\nequipos = 2^(bits de equipo) − 2' }),
  I('Si el destino está en tu red, el ESP32 le habla directamente. Si no (por ejemplo, un servidor de internet), entrega el paquete a la <b>puerta de enlace</b>: el router, que sabe sacarlo fuera.', { svg: VS({ t: 'Destino en tu red', l: ['192.168.1.10', 'misma parte de red', '→ directo'], c: 'var(--ok)' }, { t: 'Destino fuera', l: ['198.51.100.20', 'otra red', '→ a la puerta de enlace'], c: 'var(--led)' }) }),
  I('Hay rangos <b>privados</b> reservados para uso interno, que no se usan en internet. Por eso millones de casas usan las mismas direcciones sin conflicto. En la lección del NAT verás cómo salen a internet.', { code: '10.0.0.0    – 10.255.255.255    (10.0.0.0/8)\n172.16.0.0  – 172.31.255.255    (172.16.0.0/12)\n192.168.0.0 – 192.168.255.255   (192.168.0.0/16)' }),
  { t: 'steps', text: '¿Están en la misma red 192.168.1.37 y 192.168.2.10 con máscara /24? ¿Y con /16?', steps: ['Con /24, la red son los 3 primeros números.', 'Red del primero: 192.168.1 · red del segundo: 192.168.2 → <b>distintas</b>: el paquete va al router.', 'Con /16, la red son solo los 2 primeros: 192.168 y 192.168 → <b>la misma</b>.', 'Equipos que caben con /16: 2^16 − 2 = <b>65 534</b>.'], result: 'La misma pareja de direcciones puede estar junta o separada: lo decide la máscara.' },
  Q('Con /24, ¿qué equipo está en la misma red que el broker?', ['A', 'B', 'C', 'D'], 'Deben coincidir los tres primeros números con los del broker.', { code: 'Broker: 192.168.1.10 /24\nA: 192.168.1.200\nB: 192.168.0.10\nC: 10.0.0.10\nD: 192.168.10.1', c: 'io_net', h: 'Compara solo los tres primeros números de cada uno.' }),
  Nm('¿Cuántos equipos caben en una red /24?', 254, 'equipos', '8 bits de equipo: 256 direcciones, menos la de red y la de difusión.', { c: 'io_masks', h: 'Quedan 32 − 24 bits para equipos; no olvides restar las dos reservadas.' }),
  G('io_subnet'),
  Q('El ESP32 quiere hablar con un servidor de previsión del tiempo en internet. ¿A quién entrega el paquete?', ['A la puerta de enlace (el router)', 'Directamente al servidor', 'Al broker', 'A todos los equipos de la red'], 'Fuera de tu red, siempre a través del router.', { c: 'io_net', h: '¿Está ese servidor en tu red?' }),
  Q('¿Por qué tu vecino y tú podéis tener los dos un equipo con la dirección 192.168.1.37?', ['Las direcciones privadas solo valen dentro de cada red', 'Porque internet las cambia solas', 'No podéis: habrá conflicto', 'Porque usáis distinto WiFi'], 'Privadas = no únicas en el mundo.', { c: 'io_private', h: 'Busca 192.168 en la tabla de rangos privados.' }),
  G('io_subnet'),
  Q('Configuras a mano esta IP en un ESP32. ¿Qué pasa?', ['No puede hablar ni con el router: está en otra red', 'Funciona igual', 'El router la corrige solo', 'Solo falla con internet'], 'IP, máscara y puerta de enlace deben ser coherentes.', { code: 'Router:  192.168.1.1  /24\nESP32:   192.168.0.50 /24  (fija en el código)', c: 'io_net', h: 'Compara la parte de red del ESP32 con la del router.' }),
  I('<b>Resumen</b>\n· IPv4: 4 números de 0 a 255 (32 bits).\n· La máscara (/24) dice cuántos bits son la red; caben 2^(bits de equipo) − 2 equipos.\n· Misma red → directo; otra red → a la puerta de enlace.\n· 10.x, 172.16–31.x y 192.168.x son privadas: no son únicas en el mundo.')
 ]),
 L('io6', 'DHCP, DNS y mDNS', 'wifi', ['io_dhcpdns'], [
  Q('Enciendes un ESP32 nuevo en tu WiFi. Nadie le ha escrito una dirección IP. ¿De dónde crees que la saca?', ['Se la presta el router automáticamente', 'Se la inventa', 'Viene grabada de fábrica', 'Usa siempre la 192.168.1.1'], 'El router reparte direcciones con un protocolo llamado DHCP. Vamos a ver todo lo que pasa al arrancar.', { predict: true, c: 'io_dhcpdns', h: 'Piensa en quién conoce todas las direcciones ocupadas de tu red.' }),
  { t: 'explore', text: 'Así arranca un nodo: se asocia al WiFi, pide IP, pregunta por el nombre del broker y conecta. Provoca averías y mira en qué paso se queda y qué dice el monitor serie.', viz: 'io_boot', params: PP.boot(),
    tasks: [
      { q: 'ipSinNombre', min: 1, max: 1, text: 'Provoca un fallo con el que tenga IP, pero no encuentre el servidor por su nombre', done: 'Falla el DNS. Se confirma probando con la IP directamente.', hint: 'Mira qué avería afecta a los nombres.' },
      { q: 'asocSinIP', min: 1, max: 1, text: 'Ahora uno en el que se asocie al WiFi pero no reciba IP', done: 'Falla el DHCP: sin IP no puede hablar con nadie.' },
      { q: 'soloServidor', min: 1, max: 1, text: 'Y uno en el que todo vaya bien hasta el último paso', done: 'Red, IP y nombre bien: el problema está en el propio servidor.' }
    ] },
  I('<b>DHCP</b>: al conectarse, el nodo pide configuración y el router le <b>presta</b> una IP durante un tiempo (la concesión). Antes de que caduque, la renueva. En el mismo paquete le da todo lo necesario:', { svg: CHK([['IP: 192.168.1.37', 1], ['Máscara: 255.255.255.0', 1], ['Puerta de enlace: 192.168.1.1', 1], ['Servidor DNS: 192.168.1.1', 1], ['Concesión: 24 horas', 1]], 'Lo que da el DHCP') }),
  I('Cada tarjeta de red tiene una <b>MAC</b>: un número único de fábrica. Una <b>reserva DHCP</b> asocia una MAC a una IP en el router: el equipo sigue pidiendo por DHCP, pero siempre recibe la misma dirección. Es la forma limpia de que el broker no cambie de IP.', { svg: VS({ t: 'IP fija en el código', l: ['cada nodo, a mano', 'riesgo de duplicados', 'cambiar = reprogramar'], c: 'var(--err)' }, { t: 'Reserva DHCP', l: ['todo en el router', 'sin duplicados', 'cambiar = un clic'], c: 'var(--ok)' }) }),
  I('El <b>DNS</b> traduce nombres a IP: api.open-meteo.com → una dirección. Es una consulta muy corta a un servidor (normalmente, el router). Si el DNS falla, parece que «no hay internet», aunque la conexión esté bien.', { svg: FLOW(['api.open-meteo', 'Servidor DNS', 'IP del servidor'], 'el nodo pregunta un nombre y recibe una dirección') }),
  I('En casa nadie da de alta tus equipos en un DNS, pero existe <b>mDNS</b>: cada equipo anuncia su nombre terminado en .local preguntando «en voz alta» a toda la red. Solo funciona dentro de la red local.', { code: '#include <ESPmDNS.h>\n\n// tras conectar al WiFi:\nMDNS.begin("termo");   // ahora responde a termo.local', more: 'mDNS usa multidifusión: un mensaje que reciben todos los equipos de la red local. Por eso no atraviesa internet ni pasa entre redes separadas (por ejemplo, de la red de invitados a la principal), salvo que el router tenga un «reflector mDNS».' }),
  { t: 'steps', text: 'Un nodo no conecta con «broker.casa». Diagnóstico en orden, desde abajo.', steps: ['¿Se asocia al WiFi? El monitor serie dice «conectado» → la clave está bien.', '¿Tiene IP? WiFi.localIP() imprime 192.168.1.37 → el DHCP funciona.', '¿Resuelve el nombre? WiFi.hostByName("broker.casa", ip) falla → <b>el DNS no conoce ese nombre</b>.', 'Prueba con la IP del broker, 192.168.1.10: conecta → confirmado.'], result: 'Da de alta el nombre en el DNS del router, usa mDNS (broker.local) o conecta por IP reservada.' },
  { t: 'order', q: 'Ordena lo que pasa al encender un ESP32 en tu WiFi.', items: ['Se asocia al punto de acceso con la clave WiFi', 'Pide configuración por DHCP', 'Recibe IP, máscara, puerta de enlace y DNS', 'Pregunta al DNS la IP del servidor', 'Abre la conexión con el servidor'], e: 'Sin DHCP no hay IP; sin DNS no hay nombres.', c: 'io_dhcpdns', h: 'Sin IP no puede preguntar nada, y sin la IP del servidor no puede conectarse a él.' },
  Q('¿Qué equipo de casa necesita más una IP que no cambie?', ['La Raspberry Pi que hace de broker', 'El móvil', 'El portátil', 'La tele'], 'Los nodos se conectan a él por su IP o su nombre.', { c: 'io_dhcpdns', h: '¿A cuál de ellos tienen que encontrar los demás?' }),
  Q('El ESP32 tiene IP y llega al router, pero no conecta con «api.ejemplo.com». ¿Sospechoso principal?', ['El DNS', 'La máscara', 'El cable USB', 'El ADC'], 'Prueba con la IP directamente para confirmarlo.', { c: 'io_dhcpdns', h: 'Lo que falla es llegar a algo que se pide por su nombre.' }),
  Q('Llevas tus nodos a una red separada y desde el portátil ya no abre termo.local. ¿Por qué?', ['mDNS es un anuncio local y no cruza entre redes', 'El nodo se ha roto', 'Falta abrir algo en internet', 'El DNS del operador lo bloquea'], 'Usa la IP o un reflector mDNS en el router.', { c: 'io_dhcpdns', h: 'Recuerda a quién llega el «en voz alta» de mDNS.' }),
  { t: 'match', q: 'Une cada pieza con lo que hace.', pairs: [['DHCP', 'Reparte IP y configuración'], ['DNS', 'Traduce nombres a IP'], ['mDNS', 'Nombres .local sin servidor'], ['Reserva DHCP', 'Siempre la misma IP para una MAC']], c: 'io_dhcpdns', h: 'Dos reparten direcciones, dos traducen nombres.' },
  Q('¿Qué tiene de mejor una reserva DHCP frente a escribir la IP fija en el código?', ['Todo se gestiona en un sitio y no hay riesgo de duplicados', 'Es más rápida', 'No necesita router', 'Cifra la conexión'], 'El router conoce todas las asignaciones.', { c: 'io_dhcpdns', h: '¿Quién sabe qué direcciones están ocupadas?' }),
  Q('¿Cuánto dura una IP concedida por DHCP?', ['El tiempo de concesión que fija el router; luego se renueva', 'Para siempre', 'Un segundo', 'Hasta que apagues el móvil'], 'Normalmente horas o días.', { c: 'io_dhcpdns', h: 'Recuerda la palabra «presta».' }),
  I('<b>Resumen</b>\n· DHCP presta IP, máscara, puerta de enlace y DNS.\n· Una reserva DHCP fija la IP de un equipo desde el router.\n· DNS: nombre → IP. Si falla, prueba con la IP.\n· mDNS (.local) funciona sin servidor, pero solo dentro de la red local.')
 ]),
 L('io7', 'Puertos, TCP y UDP', 'wifi', ['io_ports', 'io_radio', 'io_surface'], [
  Q('En la misma Raspberry Pi corren una web y un broker MQTT, con la misma IP. ¿Cómo sabe la Pi a cuál va cada paquete?', ['Por el número de puerto', 'Por el tamaño del paquete', 'Por la hora de llegada', 'No puede: hace falta una IP para cada uno'], 'La IP lleva el paquete al equipo; el puerto lo entrega al programa correcto.', { predict: true, c: 'io_ports', h: 'Piensa en un edificio: la dirección te lleva al portal, pero falta algo más.' }),
  { t: 'explore', text: 'Doce datos viajan por una red que pierde paquetes. Elige el protocolo y sube las pérdidas.', viz: 'io_tcpudp', params: PP.tcpudp(),
    tasks: [
      { q: 'perdidos', min: 1, max: 12, text: 'Con UDP, sube las pérdidas hasta que falten datos', done: 'UDP no avisa ni reenvía: lo perdido, perdido.', hint: 'Sube las pérdidas al 10 % o más.' },
      { q: 'todosConPerdida', min: 1, max: 1, text: 'Sin bajar las pérdidas, consigue que lleguen todos', done: 'TCP confirma y reenvía: llegan todos, pero mira cuántos paquetes más viajan.', hint: 'Cambia de protocolo.' }
    ] },
  I('El <b>puerto</b> es un número de 0 a 65 535 que identifica al programa dentro del equipo. Los habituales:', { code: '22    SSH (consola remota, cifrada)\n53    DNS\n80    HTTP (web)\n123   NTP (poner en hora)\n443   HTTPS (web cifrada)\n1883  MQTT\n8883  MQTT cifrado', more: 'Las versiones «cifradas» (HTTPS, MQTT en el 8883) usan <b>TLS</b>: los datos viajan dentro de un túnel que nadie en medio puede leer ni modificar. Lo verás a fondo en el módulo de seguridad.' }),
  I('<b>TCP</b> abre una conexión con un saludo, numera los datos, confirma lo recibido y reenvía lo perdido: llega todo y en orden. <b>UDP</b> manda datagramas sueltos: menos sobrecarga, pero nadie reenvía lo perdido.', { svg: VS({ t: 'TCP', l: ['conexión con saludo', 'confirma y reenvía', 'llega todo, en orden', 'HTTP, MQTT, SSH'], c: 'var(--ok)' }, { t: 'UDP', l: ['datagramas sueltos', 'sin confirmación', 'lo perdido, perdido', 'DNS, NTP, mDNS'], c: 'var(--led)' }), more: '<b>CoAP</b> es un protocolo tipo web para nodos muy pequeños que va sobre UDP (puerto 5683). Lo verás alrededor de Thread y de redes muy limitadas. En casa, lo más común es MQTT sobre TCP.' }),
  I('Abrir una conexión TCP cuesta un viaje de ida y vuelta antes del primer dato; con TLS, uno o dos más. En un nodo a pilas, cada viaje es radio encendida.', { code: 'UDP:        dato →\nTCP:        SYN →  ← SYN-ACK   ACK →   dato →   ← ACK\nTCP + TLS:  lo anterior + 1 o 2 viajes para acordar claves' }),
  I('Cada puerto abierto es una puerta por la que alguien puede intentar entrar: la <b>superficie de ataque</b>. Lo que no uses, ciérralo.', { svg: CHK([['22 SSH: cifrado, con clave fuerte', 1], ['80 web sin cifrar: solo en casa', 2], ['1883 MQTT sin cifrar: solo en casa', 2], ['23 telnet: sin cifrar, ¡ciérralo!', 0]], 'Puertos abiertos en la red de casa') }),
  { t: 'steps', text: 'Un nodo a pilas abre TCP y TLS para cada lectura, cada 10 s. ¿Qué le cuesta y cómo mejorarlo?', steps: ['Cada envío: saludo TCP (1 viaje) + acuerdo TLS (1–2 viajes) + el dato y su confirmación.', 'Si cada viaje tarda 50 ms, solo preparar la conexión son 100–150 ms de radio encendida, 360 veces por hora.', 'Agrupando 6 lecturas por envío: un solo saludo cada minuto (60 por hora).', 'Si el nodo está enchufado, aún mejor: mantener la conexión abierta.'], result: 'Menos conexiones = menos tiempo de radio = más batería.' },
  { t: 'match', q: 'Une cada servicio con su puerto habitual.', pairs: [['HTTP', '80'], ['HTTPS', '443'], ['MQTT', '1883'], ['MQTT cifrado', '8883'], ['DNS', '53']], c: 'io_ports', h: 'Las versiones cifradas tienen su propio número.' },
  Q('MQTT y HTTP van sobre…', ['TCP', 'UDP', 'Ninguno', 'Bluetooth'], 'Necesitan entrega fiable y ordenada.', { c: 'io_ports', h: '¿Te vale que una página web llegue a trozos y desordenada?' }),
  Q('¿Qué va normalmente sobre UDP?', ['DNS, NTP y mDNS', 'HTTP', 'SSH', 'MQTT'], 'Preguntas cortas donde reintentar es fácil.', { c: 'io_ports', h: 'Busca consultas cortas que se pueden repetir sin más.' }),
  Q('Un nodo a pilas abre TCP y TLS para cada lectura, cada 10 s. ¿Mejora más eficaz?', ['Agrupar lecturas y enviarlas juntas con menos conexiones', 'Usar un puerto más alto', 'Cambiar a IPv6', 'Enviar un mensaje con nombres más cortos'], 'Cada saludo cuesta tiempo de radio.', { c: 'io_radio', h: '¿Qué parte del envío se repite sin aportar datos?' }),
  Q('Algo escucha en el puerto 1883 de la Raspberry Pi. ¿Qué es probablemente?', ['Un broker MQTT sin cifrar', 'Un servidor web', 'Un servidor SSH', 'Un DNS'], '1883 es el puerto estándar de MQTT.', { c: 'io_ports', h: 'Repasa la lista de puertos habituales.' }),
  Q('Ves el puerto 23 (telnet) abierto en una cámara IP. ¿Qué haces?', ['Desactivarlo o sacar la cámara de la red: va sin cifrar y es una puerta de entrada habitual', 'Nada, es normal', 'Abrirlo en el router para usarlo desde fuera', 'Cambiar el canal WiFi'], 'Muchas redes de aparatos infectados empezaron justo así.', { c: 'io_surface', h: '¿Lo necesitas? ¿Va cifrado?' }),
  I('<b>Resumen</b>\n· IP → equipo; puerto → programa.\n· TCP: conexión, confirmaciones y reenvíos. UDP: rápido y sin garantías.\n· Cada conexión nueva cuesta viajes de radio; agrupa o mantén la conexión.\n· Cierra los puertos que no uses.')
 ]),
 L('io8', 'NAT, el router y por qué no abrir puertos', 'shield', ['io_nat', 'io_remote'], [
  Q('Desde internet, alguien intenta conectar con la IP pública de tu casa sin que nadie de dentro haya empezado nada. ¿Qué crees que hace el router?', ['Lo descarta: no sabe a qué equipo dárselo', 'Se lo da al primer equipo que encuentra', 'Se lo da a todos', 'Se lo devuelve al operador'], 'Detrás de tu IP pública hay muchos equipos privados. El router solo sabe a quién dar lo que responde a algo que salió.', { predict: true, c: 'io_nat', h: 'Detrás de una sola dirección pública hay muchos equipos.' }),
  { t: 'explore', text: 'Tu casa tiene una IP pública (203.0.113.7) y dentro, direcciones privadas. Decide quién empieza la conversación y qué abres en el router.', viz: 'io_nat', params: PP.nat(),
    tasks: [
      { q: 'resp', min: 1, max: 1, text: 'Haz que el ESP32 consulte un servidor de internet y reciba la respuesta', done: 'El router apunta la conexión saliente en su tabla y sabe a quién devolver la respuesta.', hint: 'Que empiece el nodo.' },
      { q: 'entraFuera', min: 1, max: 1, text: 'Ahora consigue que alguien de fuera llegue al broker sin que nadie haya salido', done: 'Funciona… y el broker queda expuesto a todo internet.', hint: 'Redirige el puerto.' },
      { q: 'vpnOk', min: 1, max: 1, text: 'Cierra la redirección y entra tú con una VPN', done: 'Entras tú, cifrado y autenticado, y el broker sigue sin estar expuesto.' }
    ] },
  I('Tu operador te da <b>una</b> IP pública; dentro tienes muchos equipos con IP privadas. El router hace <b>NAT</b>: cuando un equipo sale a internet, cambia su dirección por la pública y apunta la conexión en una tabla para devolverle las respuestas.', { code: 'Tabla NAT del router\ndentro                    fuera                  destino\n192.168.1.37:50123   ↔    203.0.113.7:61001  →   198.51.100.20:443\n192.168.1.20:51877   ↔    203.0.113.7:61002  →   198.51.100.99:443' }),
  I('<b>Redirigir un puerto</b> (port forwarding) expone un equipo interno a todo internet. Hay programas que recorren todas las direcciones del mundo sin parar buscando servicios abiertos: un panel o una cámara expuestos aparecen en sus listas en cuestión de horas.', { svg: VS({ t: 'Sin redirigir', l: ['solo entran respuestas', 'a lo que salió', 'nada expuesto'], c: 'var(--ok)' }, { t: 'Puerto redirigido', l: ['entra cualquiera', 'que lo encuentre', 'expuesto 24 h al día'], c: 'var(--err)' }) }),
  I('Para usar tu sistema desde fuera, lo seguro es una <b>VPN</b> propia (por ejemplo, WireGuard en el router o en la Pi): tu móvil entra en tu red por un túnel cifrado y autenticado. Otra opción: que tu sistema salga hacia un servicio, nunca que el servicio entre.', { svg: FLOW(['Móvil fuera', 'Túnel VPN', 'Router', 'Tu red'], 'cifrado y solo para tus dispositivos') }),
  I('<b>UPnP</b> permite que un aparato abra puertos en tu router él solo, sin preguntarte. Cómodo para una consola; peligroso para una cámara barata. Desactívalo si no lo necesitas y revisa la tabla UPnP del router.', { svg: CHK([['Consola de juegos: abre un puerto', 2], ['Cámara barata: abre otro, sin avisar', 0], ['UPnP desactivado: nadie abre nada', 1]], 'Tabla UPnP del router') }),
  I('<b>IPv6</b> en dos pinceladas: direcciones de 128 bits, tantas que cada equipo puede tener una pública, sin NAT. Entonces la protección ya no viene «de regalo» del NAT, sino del <b>cortafuegos</b> del router. Muchos bloquean las conexiones entrantes por defecto, pero compruébalo en el tuyo.', { code: 'IPv4:  203.0.113.7                         (32 bits)\nIPv6:  2001:db8:3c4d:15:a2b4:7ff:fe21:9c3e  (128 bits)' }),
  { t: 'steps', text: 'Un nodo recibe órdenes de un broker que está fuera de casa sin abrir ningún puerto. ¿Cómo es posible?', steps: ['Al arrancar, el nodo abre una conexión TCP <b>de salida</b> hacia el broker.', 'El router la apunta en su tabla NAT: 192.168.1.37:50123 ↔ 203.0.113.7:61001.', 'El nodo mantiene la conexión abierta; el broker envía la orden por ella.', 'Para el router es una respuesta a algo que salió: la deja pasar al nodo.'], result: 'Una conexión saliente que se mantiene abierta funciona en los dos sentidos.' },
  Q('¿Por qué es mala idea redirigir el puerto 1883 de tu router al broker?', ['Cualquiera en internet podría intentar entrar, y además el tráfico va sin cifrar', 'Porque MQTT no funciona por internet', 'Porque gasta más electricidad', 'No es mala idea'], 'Expones un servicio sin cifrar al mundo entero.', { c: 'io_remote', h: 'Recuerda qué pasó en la exploración al redirigir el puerto.' }),
  Q('¿Cuál es la mejor forma de ver tu panel de casa desde fuera?', ['Una VPN hacia tu red (por ejemplo, WireGuard)', 'Abrir el puerto del panel en el router', 'Quitar la contraseña', 'Activar UPnP'], 'No expongas servicios a internet.', { c: 'io_remote', h: '¿Qué opción no deja nada abierto para desconocidos?' }),
  { t: 'order', q: 'Ordena de más a menos seguro para ver tu panel desde fuera.', items: ['VPN propia hacia tu red', 'Un servicio externo al que tu sistema se conecta de salida', 'Puerto abierto con HTTPS y contraseña fuerte', 'Puerto abierto sin cifrar'], e: 'Cuanto menos expuesto, mejor.', c: 'io_remote', h: 'Lo más seguro no deja ninguna puerta abierta a desconocidos.' },
  Q('Una cámara barata abre sola un puerto en tu router. ¿Qué función lo permite?', ['UPnP', 'DHCP', 'mDNS', 'DNS'], 'Revisa la tabla UPnP del router.', { c: 'io_remote', h: '¿Qué función deja a los aparatos tocar el router sin preguntarte?' }),
  Q('Con IPv6 y sin NAT, ¿qué protege a tus nodos de conexiones entrantes?', ['El cortafuegos del router', 'Nada, nunca', 'El DNS', 'La clave del WiFi'], 'Sin NAT, el cortafuegos es la puerta.', { c: 'io_nat', h: 'Si cada equipo tiene dirección pública, alguien tiene que filtrar lo que entra.' }),
  Q('Un panel en la nube manda órdenes a un nodo de tu casa sin que hayas abierto puertos. ¿Cómo?', ['El nodo abrió antes una conexión de salida y las órdenes vuelven por ella', 'El NAT deja pasar todo lo que viene de la nube', 'El panel conoce la IP privada del nodo', 'El router lo reenvía por DHCP'], 'NAT: solo entran respuestas a lo que salió.', { c: 'io_nat', h: 'Repasa el ejemplo paso a paso.' }),
  I('<b>Resumen</b>\n· NAT: muchas IP privadas salen por una pública; solo entran respuestas a lo que salió.\n· Redirigir puertos o UPnP exponen equipos a todo internet.\n· Desde fuera, entra por VPN.\n· Con IPv6 no hay NAT: manda el cortafuegos.')
 ]),
 L('io9', 'Señal WiFi: dBm y RSSI', 'antenna', ['io_dbm', 'io_wifidiag'], [
  Q('Un nodo marca −60 dBm y otro −70 dBm. ¿Cuánta más potencia crees que recibe el primero?', ['Diez veces más', 'Un 10 % más', 'El doble', 'La misma: solo cambia el número'], 'Los dBm son una escala logarítmica: 10 dB de diferencia son un factor 10, no un 10 %.', { predict: true, c: 'io_dbm', h: 'Recuerda los decibelios del curso base: ¿suman o multiplican?' }),
  { t: 'explore', text: 'El router emite y el ESP32 recibe. Mueve el nodo, añade paredes o mételo en un armario metálico. La flecha marca la señal recibida (RSSI).', viz: 'io_rssi', params: PP.rssi(),
    tasks: [
      { q: 'rssi', min: -200, max: -75, text: 'Aleja el nodo y añade paredes hasta bajar de −75 dBm', done: 'La distancia y las paredes se comen la señal muy deprisa.', hint: 'Más distancia y más paredes.' },
      { q: 'buenoConParedes', min: 1, max: 1, text: 'Consigue un buen enlace (−67 dBm o más) con al menos 2 paredes', done: 'Acercando el nodo compensas las paredes.', hint: 'Acerca el nodo.' },
      { q: 'metalMalo', min: 1, max: 1, text: 'Mete el nodo en el armario metálico y busca dónde baja de −80 dBm', done: 'El metal hace de jaula: ningún programa lo arregla.' }
    ] },
  I('El <b>RSSI</b> es la potencia que recibe la radio, en <b>dBm</b>: decibelios respecto a 1 mW. 0 dBm es 1 mW; los valores negativos son fracciones diminutas.', { code: '+20 dBm = 100 mW     (lo máximo típico de un router)\n  0 dBm = 1 mW\n−30 dBm = 0,001 mW\n−60 dBm = 0,000 001 mW  (una millonésima)\n−90 dBm = una milmillonésima de mW' }),
  I('Cuatro saltos de memoria: <b>+3 dB = ×2</b>, <b>+6 dB = ×4</b>, <b>+10 dB = ×10</b> y <b>+20 dB = ×100</b>. Una diferencia en dB siempre es un <b>factor</b>, nunca un porcentaje.', { svg: BARS([['−60 dBm', 1, 'var(--ok)'], ['−63 dBm (3 dB menos)', 0.5], ['−66 dBm (6 dB menos)', 0.25], ['−70 dBm (10 dB menos)', 0.1, 'var(--err)']], '', 'potencia relativa a la de −60 dBm') }),
  I('Valores orientativos para WiFi. Por debajo de unos −80 dBm hay pérdidas y reintentos, que gastan batería.', { svg: CHK([['−50 dBm o más: excelente', 1], ['hasta −67 dBm: bueno y estable', 1], ['alrededor de −75 dBm: justo', 2], ['−85 dBm: casi inutilizable', 0]], 'RSSI en WiFi') }),
  I('Lo que más atenúa la señal de 2,4 GHz en casa: hormigón y ladrillo macizo, metal (neveras, armarios, mallas), espejos y agua (peceras… y personas). La antena impresa del ESP32 no radia igual en todas las direcciones: girarlo puede cambiar varios dB.', { svg: CHK([['Hormigón y ladrillo macizo', 0], ['Metal: armarios, neveras, cajas', 0], ['Espejos y agua (también personas)', 0], ['Madera, pladur, cristal normal: poco', 1]], 'Enemigos de los 2,4 GHz') }),
  { t: 'steps', text: '¿Cuántas veces más potencia recibe un nodo a −58 dBm que otro a −64 dBm?', steps: ['Diferencia: −58 − (−64) = <b>6 dB</b>.', '6 dB = 3 dB + 3 dB.', 'Cada 3 dB es ×2, y los saltos se multiplican: 2 × 2 = <b>×4</b>.'], result: 'El primero recibe unas 4 veces más potencia.' },
  Nm('Un nodo marca −52 dBm y otro −62 dBm. ¿Cuántas veces más potencia recibe el primero?', 10, 'veces', '10 dB de diferencia = ×10.', { tol: 0.5, c: 'io_dbm', h: 'Resta los dos valores y usa los saltos de memoria.' }),
  G('io_dbm'),
  Q('Un nodo pasa de −50 a −80 dBm al cerrar la puerta metálica del garaje. ¿Cuánto ha caído la potencia?', ['Unas 1000 veces', 'Unas 30 veces', 'Un 30 %', 'Unas 3 veces'], '30 dB son tres saltos de 10 dB: 10 × 10 × 10.', { c: 'io_dbm', h: '30 dB son tres saltos de 10 dB, y los saltos se multiplican.' }),
  G('io_dbm'),
  Q('Un nodo dentro de un armario metálico marca −88 dBm. ¿Primer arreglo?', ['Sacar la antena fuera o usar un módulo con antena externa', 'Cambiar el puerto del servidor', 'Cambiar la máscara', 'Más memoria'], 'El metal hace de jaula.', { c: 'io_wifidiag', h: '¿El problema es de programa o de física?' }),
  Q('Al girar el ESP32 90 grados, su RSSI cambia 6 dB. ¿Es normal?', ['Sí: la antena impresa no radia igual en todas las direcciones', 'No: está roto', 'Solo con IPv6', 'No: el RSSI no depende de la posición'], 'Prueba varias orientaciones al instalarlo.', { c: 'io_wifidiag', h: 'Recuerda lo que se dijo de la antena impresa.' }),
  I('<b>Resumen</b>\n· RSSI en dBm: 0 dBm = 1 mW; la señal WiFi suele estar entre −30 y −90.\n· +3 dB = ×2, +10 dB = ×10: las diferencias son factores.\n· Bueno: −67 dBm o más. Malo: por debajo de −80.\n· Metal, hormigón y agua atenúan mucho; la orientación de la antena importa.')
 ]),
 L('io39', 'Canales WiFi y diagnóstico de un nodo', 'antenna', ['io_wifichan', 'io_wifidiag', 'io_espchips'], [
  Q('Tus vecinos usan los canales 1 y 6. ¿Qué crees que es peor para tu red?', ['Ponerte en el 3, entre los dos', 'Ponerte en el 6, compartiéndolo', 'Ponerte en el 11', 'Da igual: son canales distintos'], 'Pisar a medias dos redes es peor que compartir exactamente un canal: las que comparten se turnan; las que se solapan se estorban sin coordinarse.', { predict: true, c: 'io_wifichan', h: 'Cada red ocupa unos 20 MHz y los canales están a 5 MHz unos de otros.' }),
  { t: 'explore', text: 'Este es el espectro de 2,4 GHz con las redes de tus vecinos (gris). Mueve tu red de canal.', viz: 'io_wifich', params: PP.wifich(),
    tasks: [
      { q: 'solapes', min: 2, max: 2, text: 'Pon tu red donde pise a las dos vecinas', done: 'Interferencia doble: lo peor que puedes elegir.', hint: 'Entre el 1 y el 6.' },
      { q: 'libre', min: 1, max: 1, text: 'Busca un canal que no pise a nadie', done: 'Del 10 al 13 no tocas al 6 ni al 1.', hint: 'Aléjate al menos 4 canales de cada vecina.' }
    ] },
  I('El WiFi de 2,4 GHz tiene 13 canales en Europa, separados 5 MHz, pero cada red ocupa unos 20 MHz: los canales vecinos se solapan. Sin solaparse caben tres (1, 6 y 11), o cuatro en Europa (1, 5, 9 y 13) si todas las redes usan 20 MHz.', { code: 'canal n → centro en 2407 + 5·n MHz, ocupa unos ±10 MHz\ncanal 1  → 2402–2422 MHz\ncanal 6  → 2427–2447 MHz\ncanal 11 → 2452–2472 MHz' }),
  I('Compartir canal no es tan malo: las redes se oyen y se turnan. Solaparse a medias sí: cada una ve a la otra como ruido y ninguna se aparta.', { svg: VS({ t: 'Mismo canal', l: ['se oyen entre sí', 'se turnan', 'reparten el aire'], c: 'var(--ok)' }, { t: 'Solape parcial', l: ['se ven como ruido', 'no se coordinan', 'errores y reintentos'], c: 'var(--err)' }) }),
  I('Cuando un nodo «no envía», ve por capas y de abajo arriba: no tiene sentido mirar el servidor si la radio no llega.', { svg: FLOW(['Radio: RSSI', '¿Tiene IP?', 'Ping', '¿Resuelve nombre?', 'Servicio'], 'arregla primero la capa de abajo') }),
  I('Desde el propio nodo, el monitor serie te dice casi todo. Desde el PC, un ping al nodo confirma que la red llega.', { code: 'Serial.println(WiFi.status() == WL_CONNECTED ? "asociado" : "sin WiFi");\nSerial.println(WiFi.localIP());   // 0.0.0.0 = sin IP\nSerial.println(WiFi.RSSI());      // en dBm\nSerial.println(WiFi.channel());   // canal del punto de acceso' }),
  { t: 'steps', text: 'El nodo del garaje «no envía». Diagnóstico.', steps: ['Monitor serie: asociado e IP 192.168.1.52 → la clave y el DHCP están bien.', 'RSSI: −83 dBm → enlace al límite: habrá pérdidas y reintentos.', 'Ping desde el PC: responde a ratos, con pérdidas → confirma el problema de radio.', 'Arreglo: mover el nodo, antena externa o un punto de acceso más cerca; después, volver a medir.'], result: 'De abajo arriba: sin buena radio, lo demás no importa.' },
  Q('Las redes de tus vecinos están en los canales 1 y 11. ¿Qué canal eliges?', ['El 6', 'El 3', 'El 9', 'El 13'], 'El 6 no se solapa con el 1 ni con el 11; el 3, el 9 y el 13 pisan a alguno.', { c: 'io_wifichan', h: 'Busca un canal a 4 o más canales de distancia de cada vecina.' }),
  Q('En Europa, con redes de 20 MHz, ¿qué cuatro canales no se solapan entre sí?', ['1, 5, 9 y 13', '1, 2, 3 y 4', '1, 6, 11 y 13', '2, 4, 6 y 8'], 'Cada uno está a 4 canales (20 MHz) del siguiente.', { c: 'io_wifichan', h: 'Necesitas 20 MHz entre centros: 4 canales de 5 MHz.' }),
  Q('Todas las redes del edificio usan el canal 6. ¿Es mejor ponerte también en el 6 que en el 4?', ['Sí: compartir un canal es mejor que solaparse a medias', 'No: el 4 está más libre', 'Da igual', 'Solo en 5 GHz'], 'En el 6 os turnáis; en el 4 os estorbáis.', { c: 'io_wifichan', h: 'Recuerda la diferencia entre compartir y solaparse.' }),
  { t: 'order', q: 'Ordena el diagnóstico de un nodo que «no envía».', items: ['Mirar en el monitor serie si está asociado y tiene IP', 'Mirar el RSSI', 'Hacer ping al nodo desde el PC', 'Comprobar que resuelve el nombre del servidor', 'Comprobar que llegan sus datos al servicio'], e: 'De abajo arriba: radio, IP, nombres, aplicación.', c: 'io_wifidiag', h: 'Empieza por lo más físico.' },
  Q('Un nodo no obtiene IP y su RSSI es de −90 dBm. ¿Qué revisas antes?', ['La radio: ubicación, antena y distancia', 'El DNS', 'El puerto del servidor', 'La máscara'], 'Sin enlace de radio no hay DHCP que valga.', { c: 'io_wifidiag', h: '¿Qué capa está más abajo?' }),
  Q('¿Puede el ESP32 clásico conectarse a una red de 5 GHz?', ['No: solo tiene radio de 2,4 GHz', 'Sí, sin problema', 'Solo con antena externa', 'Solo por BLE'], 'Asegúrate de que tu router emite también en 2,4 GHz.', { c: 'io_espchips', h: 'Repasa la tabla de chips de la lección de radios.' }),
  I('<b>Resumen</b>\n· 2,4 GHz: canales a 5 MHz, redes de 20 MHz → se solapan.\n· Mejor compartir un canal que pisar a dos: usa 1, 6, 11 (o 1, 5, 9, 13).\n· Diagnóstico por capas: radio, IP, ping, nombre, servicio.')
 ]),
 SIM('io-s2', 'Reto: LED de estado de red', 'Un buen nodo dice cómo está sin pantalla. Este programa usa un LED en el GPIO26: parpadeo rápido mientras «conecta», casi fijo cuando está conectado y dos destellos si se cae la red. Mantén pulsado el botón del GPIO4 para simular la caída y suéltalo para ver cómo reconecta.', { arduino: 'io_estado', board: 'esp32', parts: ['push', 'res', 'led'], code: true, hint: 'Pulsador entre D4 y GND (usa la pull-up interna). LED: D26 → 100–220 Ω → ánodo; cátodo a GND. Mantén pulsado unos segundos y suelta.' }, 'io_estado'),
 PRJ('io-p2', 'Proyecto: mapa de cobertura WiFi', 'io_wifimap')
],
exam: [
  Q('Broker 10.1.7.20 con máscara /16. ¿Qué equipo puede hablarle directamente, sin pasar por el router?', ['A', 'B', 'C', 'D'], 'Con /16, la red son los dos primeros números: 10.1. Solo A (10.1.200.3) los comparte; B está en la 10.2, C en la 192.168 y D en la 11.1.', { c: 'io_net', l: 'io5', code: 'Broker: 10.1.7.20  /16\nA: 10.1.200.3\nB: 10.2.7.20\nC: 192.168.7.20\nD: 11.1.7.20', h: '/16 significa que solo cuentan los dos primeros números para decidir la red.' }),
  Q('El ESP32 habla con el broker de casa, pero no llega a ningún servidor de internet. ¿Por qué?', ['La puerta de enlace apunta a una dirección donde no hay router', 'La máscara es demasiado corta', 'El broker bloquea internet', 'Las IP privadas no pueden salir a internet'], 'Lo que está en tu red se habla directamente; lo de fuera se entrega a la puerta de enlace. Si esa dirección no es el router, los paquetes hacia internet no salen.', { c: 'io_net', l: 'io5', code: 'Router:   192.168.1.1   /24\nBroker:   192.168.1.10  /24\nESP32:    192.168.1.80  /24\nPuerta de enlace del ESP32: 192.168.1.254   (ahí no hay nada)', h: 'Distingue el camino hacia un equipo de tu red del camino hacia uno de fuera.' }),
  { t: 'bits', q: 'Una red /26. Enciende los bits del último número de la máscara.', n: 8, target: 192, e: '26 bits de red = los 24 de los tres primeros números (255 cada uno) y 2 más en el último byte: 11000000 = 128 + 64 = 192. La máscara queda con tres 255 y un 192 al final.', c: 'io_masks', l: 'io5', h: 'Los tres primeros números ya llevan 24 unos: ¿cuántos unos quedan para el último byte, y desde qué lado empiezan?' },
  Q('Necesitas una red para 25 nodos. ¿Cuál es la máscara más larga (con más bits de red) que te sirve?', ['/27', '/28', '/26', '/24'], '/27 deja 5 bits de equipo: 2⁵ − 2 = 30 equipos, suficiente. /28 solo da 14. /26 y /24 también caben, pero desperdician direcciones.', { c: 'io_masks', l: 'io5', h: 'Equipos = 2^(32 − bits de red) − 2: prueba desde /28 hacia abajo.' }),
  TU('El broker A y el nodo B empiezan los dos por 192 y 168; el tercer número de A es 1 y el de B, 2. Elige la máscara más larga que los ponga en la misma red.', 'io_subnet', PP.subnet({ c: FX(2), d: FX(50) }), { q: 'hosts', min: 1000, max: 1100, text: 'Objetivo: misma red con la máscara más larga posible', hint: 'Escribe el tercer número de cada uno en binario.' }, '1 = 00000001 y 2 = 00000010: coinciden en sus 6 primeros bits. Con /22 la red llega a esos 6 bits del tercer número (16 + 6 = 22) y los dos quedan juntos, con sitio para 1022 equipos. Con /23 o más ya se separan.', { c: 'io_masks', l: 'io5', h: 'Pasa 1 y 2 a binario y cuenta cuántos bits iniciales comparten; súmalos a los 16 de 192.168.' }),
  Q('¿Qué dirección NO es privada?', ['B', 'A', 'C', 'D'], 'El rango privado de 172 va de 172.16.0.0 a 172.31.255.255: 172.32.0.5 queda fuera. Las demás están en 172.16–31, 10.x y 192.168.x.', { c: 'io_private', l: 'io5', code: 'A: 172.31.0.5\nB: 172.32.0.5\nC: 10.200.1.1\nD: 192.168.50.2', h: 'Repasa los tres rangos privados, sobre todo el de 172: ¿de qué número a qué número va el segundo byte?' }),
  Q('Cambias el router. Todos tus nodos se asocian al WiFi y reciben IP, pero ninguno encuentra «broker.casa». Con la IP del broker sí conectan. ¿Qué ha pasado?', ['El router nuevo no tiene dado de alta el nombre broker.casa en su DNS', 'El DHCP del router nuevo no funciona', 'La clave del WiFi ha cambiado', 'El broker se ha roto'], 'Asociarse y tener IP demuestra que la clave y el DHCP están bien. Que funcione con la IP y no con el nombre señala al DNS.', { c: 'io_dhcpdns', l: 'io6', h: 'Ve paso a paso: asociación, IP, nombre, conexión. ¿En cuál se quedan?' }),
  Q('Tras un apagón largo, la Raspberry del broker recibió otra IP y los nodos, que conectaban por IP, ya no llegan. ¿Arreglo limpio?', ['Una reserva DHCP en el router para la MAC de la Pi', 'Escribir en cada nodo la IP nueva', 'Bajar el tiempo de concesión', 'Reiniciar los nodos cada noche'], 'La reserva hace que el router entregue siempre la misma IP a esa MAC, gestionado en un solo sitio y sin riesgo de duplicados.', { c: 'io_dhcpdns', l: 'io6', h: '¿Quién reparte las IP en tu red y cómo puede recordar a un equipo concreto?' }),
  { t: 'match', q: 'Une cada síntoma con su causa más probable.', pairs: [['Se asocia al WiFi, pero no recibe IP', 'Falla el DHCP'], ['Tiene IP, pero no encuentra api.ejemplo.com', 'Falla el DNS'], ['termo.local funciona en casa, pero no desde la red de invitados', 'mDNS no cruza entre redes'], ['La IP de la Pi cambia cada pocos días', 'Falta una reserva DHCP']], e: 'Cada paso del arranque tiene su pieza: DHCP da la IP, DNS traduce nombres, mDNS anuncia nombres .local solo en la red local y la reserva DHCP fija una IP.', c: 'io_dhcpdns', l: 'io6', h: 'Ubica cada síntoma en el orden del arranque: asociarse, IP, nombre.' },
  Q('Un ESP32 pide la hora por NTP y además descarga una página web. ¿Qué transporte usa cada cosa?', ['UDP para NTP y TCP para la web', 'TCP para las dos', 'UDP para las dos', 'TCP para NTP y UDP para la web'], 'NTP es una pregunta corta que, si se pierde, se repite: UDP. La web necesita que llegue todo y en orden: TCP.', { c: 'io_ports', l: 'io7', h: '¿Cuál necesita que llegue todo y en orden, y cuál puede simplemente preguntar otra vez?' }),
  Q('¿Por qué las consultas DNS normales van por UDP?', ['Son preguntas cortas: si se pierde una, se repite, y te ahorras abrir una conexión', 'Porque UDP es más seguro', 'Porque TCP no admite nombres', 'Porque UDP garantiza la entrega'], 'Abrir TCP cuesta un viaje de ida y vuelta antes del primer dato. Para una pregunta de pocos bytes, UDP es más rápido y reintentar es trivial.', { c: 'io_ports', l: 'io7', h: 'Compara lo que cuesta preparar una conexión TCP con lo que ocupa la pregunta.' }),
  Nm('Un nodo abre TCP y TLS en cada envío: 3 viajes de 50 ms antes del dato. Envía cada 10 s. ¿Cuántos segundos por hora pasa la radio solo preparando conexiones?', 54, 's', 'Cada envío: 3 × 50 = 150 ms. Envíos por hora: 3600 / 10 = 360. Total: 360 × 0,15 s = 54 s de radio por hora, solo en saludos.', { tol: 0.5, c: 'io_radio', l: 'io7', h: 'Calcula el tiempo de un saludo y multiplícalo por los envíos de una hora.' }),
  Q('Un enchufe inteligente que solo controlas por MQTT tiene abiertos un servidor web de configuración y telnet. ¿Qué haces?', ['Desactivar lo que no usas, empezando por telnet, que va sin cifrar', 'Nada: si no los usas, no molestan', 'Abrirlos en el router para tenerlos a mano', 'Cambiar el canal WiFi'], 'Cada puerto abierto es una puerta más que defender. Lo que no usas, cerrado; telnet, sin cifrar y muy atacado, el primero.', { c: 'io_surface', l: 'io7', h: 'Piensa en cada puerto abierto como una puerta: ¿cuáles necesitas de verdad?' }),
  Q('Llega desde internet un paquete a 203.0.113.7:62011, respuesta a una conexión que salió de casa. ¿A quién se lo entrega el router?', ['Al 192.168.1.42, puerto 51200', 'Al 192.168.1.15, puerto 40100', 'A todos los equipos de casa', 'A nadie: lo de fuera nunca entra'], 'El router busca el puerto público en su tabla NAT: 62011 corresponde a 192.168.1.42:51200, la conexión que abrió ese equipo.', { c: 'io_nat', l: 'io8', code: 'Tabla NAT del router\ndentro                  fuera\n192.168.1.15:40100  ↔  203.0.113.7:62010\n192.168.1.42:51200  ↔  203.0.113.7:62011', h: 'Busca en la tabla la fila cuya parte de fuera coincide con el destino del paquete.' }),
  Q('Tu operador no te da IP pública: tu router sale a internet a través de otro NAT del operador. ¿Puede tu nodo recibir órdenes de un broker externo?', ['Sí: el nodo abre una conexión de salida, la mantiene y las órdenes vuelven por ella', 'No: sin IP pública nada puede entrar', 'Solo abriendo puertos en tu router', 'Solo con IPv4 fija'], 'Los NAT dejan pasar las respuestas a lo que salió. Una conexión saliente que se mantiene abierta funciona en los dos sentidos, haya uno o dos NAT por medio.', { c: 'io_nat', l: 'io8', h: '¿Quién empieza la conversación en ese diseño?' }),
  Q('Un amigo te dice: «Redirige el puerto 8883 del router al broker, que ese va cifrado». ¿Qué sigue estando mal?', ['El broker queda expuesto a todo internet: cualquiera puede probar contraseñas o atacar fallos del programa', 'Nada: el cifrado lo resuelve todo', 'Que el 8883 es más lento', 'Que MQTT cifrado no funciona por internet'], 'Cifrar protege el contenido del camino, pero el servicio sigue al alcance de los robots que barren internet. Desde fuera, mejor una VPN.', { c: 'io_remote', l: 'io8', h: 'Distingue entre proteger lo que viaja y decidir quién puede llamar a la puerta.' }),
  Q('Instalas WireGuard en tu Raspberry Pi. ¿Para qué sirve?', ['Para que tu móvil entre en tu red desde fuera por un túnel cifrado y autenticado', 'Para abrir puertos automáticamente', 'Para repartir IP en tu red', 'Para traducir nombres .local'], 'Es una VPN: tu móvil se une a tu red de casa como si estuviera dentro, sin exponer ningún servicio a internet.', { c: 'io_remote', l: 'io8', h: 'Recuerda la forma segura de usar tu sistema desde fuera.' }),
  Nm('Al mover un nodo al garaje, su RSSI pasa de −55 dBm a −75 dBm. ¿Cuántas veces menos potencia recibe?', 100, 'veces', 'Diferencia: 20 dB. Cada 10 dB es un factor 10: 10 × 10 = 100 veces menos.', { tol: 1, c: 'io_dbm', l: 'io9', h: 'Resta los dos valores y trocea la diferencia en saltos de 10 dB.' }),
  Q('Una antena externa mejora la señal recibida en 9 dB. ¿Cuántas veces más potencia llega?', ['Unas 8 veces', 'Un 9 % más', '9 veces', 'Unas 3 veces'], '9 dB = 3 + 3 + 3. Cada 3 dB duplica: 2 × 2 × 2 = 8.', { c: 'io_dbm', l: 'io9', h: 'Descompón 9 dB en saltos que conozcas y multiplica sus factores.' }),
  Nm('Un módulo emite a +17 dBm. ¿Cuántos mW son, aproximadamente?', 50, 'mW', '+20 dBm son 100 mW. 17 dBm es 3 dB menos, la mitad: unos 50 mW.', { tol: 2, c: 'io_dbm', l: 'io9', h: 'Parte de un valor que conozcas, como +20 dBm, y aplica el salto de 3 dB.' }),
  Q('Nodo en la buhardilla: asociado, IP correcta, RSSI de −84 dBm, y el broker recibe solo la mitad de sus mensajes. ¿Qué haces primero?', ['Mejorar la radio: reubicarlo, antena externa o un punto de acceso más cerca, y volver a medir', 'Cambiar el broker por otro', 'Cambiar la máscara a /16', 'Reinstalar el DNS'], 'Por debajo de unos −80 dBm hay pérdidas y reintentos. Diagnóstico de abajo arriba: si la radio va justa, lo demás da igual.', { c: 'io_wifidiag', l: 'io39', h: 'Ordena por capas: ¿qué capa muestra ya un valor malo?' }),
  Q('Tus vecinos ocupan los canales 1, 6 y 11, todos con bastante tráfico. ¿Dónde pones tu red de 2,4 GHz?', ['En uno de esos tres, el menos cargado, compartiéndolo', 'En el 3 o el 8, entre medias', 'En el 13, que está al final', 'Da igual: todos los canales son independientes'], 'Las redes que comparten canal se oyen y se turnan; las que se solapan a medias se estorban sin coordinarse. El 13 pisa al 11.', { c: 'io_wifichan', l: 'io39', h: 'Compara compartir un canal con solaparse a medias con dos redes.' }),
  Nm('¿Cuál es la frecuencia central del canal 9 del WiFi de 2,4 GHz?', 2452, 'MHz', '2407 + 5 × 9 = 2407 + 45 = 2452 MHz. Ocupa unos ±10 MHz: de 2442 a 2462 MHz.', { tol: 0, c: 'io_wifichan', l: 'io39', h: 'Usa la fórmula del centro de un canal: 2407 más 5 por el número de canal.' })
] },

{ id: 'io-m3', title: 'HTTP, JSON y APIs', desc: 'Peticiones y respuestas, REST, códigos de estado, JSON con ArduinoJson y cuándo el nodo es servidor o cliente.', nodes: [
 L('io10', 'HTTP: petición y respuesta', 'code', ['io_http', 'io_rest', 'io_status'], [
  Q('Escribes en el navegador la dirección de tu termómetro WiFi. ¿Qué crees que viaja primero?', ['Una petición de texto del navegador al termómetro', 'La página, que el termómetro envía sin que nadie la pida', 'Un archivo que se descarga solo', 'Nada: el navegador lee el chip directamente'], 'HTTP es un diálogo: el cliente (el navegador) pide y el servidor (el termómetro) responde. Siempre empieza el cliente.', { predict: true, c: 'io_http', h: '¿Cómo sabría el termómetro que alguien quiere ver su página?' }),
  { t: 'explore', text: 'Arriba, la petición que envía el cliente; abajo, lo que responde el servidor del nodo. Cambia el método, la ruta y la credencial.', viz: 'io_http', params: PP.http(),
    tasks: [
      { q: 'code', min: 200, max: 200, text: 'Lee el estado del nodo', done: 'GET sobre /api/estado: 200 OK y el JSON en el cuerpo.', hint: 'GET sobre /api/estado.' },
      { q: 'code', min: 404, max: 404, text: 'Pide un recurso que no existe', done: '404: esa ruta no está en el servidor.', hint: 'Prueba la ruta /api/sotano.' },
      { q: 'code', min: 201, max: 201, text: 'Envía una lectura nueva y consigue que se cree', done: 'POST a /api/lecturas con credencial: 201 Created.', hint: 'POST a /api/lecturas, con credencial.' }
    ] },
  I('HTTP es un diálogo de texto. La <b>petición</b> lleva método, ruta, cabeceras y, a veces, un cuerpo. La <b>respuesta</b> lleva un código de estado, cabeceras y el cuerpo.', { code: 'GET /api/estado HTTP/1.1          ← método y ruta\nHost: termo.local                 ← cabeceras\nAccept: application/json\n\nHTTP/1.1 200 OK                   ← código de estado\nContent-Type: application/json\nContent-Length: 28\n\n{"t":21.4,"h":48,"rssi":-61}      ← cuerpo' }),
  I('El <b>método</b> expresa la intención:', { svg: CHK([['GET: leer, sin cambiar nada', 2], ['POST: crear o enviar algo nuevo', 2], ['PUT: sustituir un recurso entero', 2], ['PATCH: cambiar una parte', 2], ['DELETE: borrar', 2]], 'Métodos HTTP') }),
  I('Las <b>cabeceras</b> llevan metadatos: el tipo del cuerpo (Content-Type), su longitud, la credencial (Authorization)… Sin HTTPS viajan en claro: cualquiera que capture el tráfico puede copiar la credencial.', { code: 'POST /api/lecturas HTTP/1.1\nHost: servidor.local\nContent-Type: application/json\nAuthorization: Bearer 9f2c…\nContent-Length: 10\n\n{"t":21.4}', more: 'HTTP es <b>sin estado</b>: cada petición es independiente y el servidor no recuerda las anteriores por sí mismo. Las «sesiones» se construyen encima, con cookies o con un token en cada petición.' }),
  { t: 'steps', text: 'Así pide datos un ESP32 con la librería HTTPClient. Léelo línea a línea.', code: 'HTTPClient http;\nhttp.begin("http://192.168.1.10/api/estado");\nhttp.setTimeout(3000);\nint codigo = http.GET();\nif (codigo == 200) {\n  String cuerpo = http.getString();\n  procesar(cuerpo);\n}\nhttp.end();', steps: ['http.begin(url) prepara la petición a esa dirección.', 'setTimeout(3000): si en 3 s no hay respuesta, se rinde en vez de bloquearse.', 'http.GET() la envía y devuelve el <b>código de estado</b>, o un número negativo si ni siquiera hubo conexión.', 'Solo si el código es 200 se lee el cuerpo con getString().', 'http.end() libera la conexión y la memoria.'], result: 'Siempre: tiempo máximo, código primero, cuerpo después y end() al acabar.' },
  Q('En «GET /api/estado HTTP/1.1», ¿qué es /api/estado?', ['La ruta del recurso pedido', 'El método', 'El código de estado', 'La IP del servidor'], 'Método GET, ruta /api/estado.', { c: 'io_http', h: 'La primera palabra es el método; lo que va después, lo que pides.' }),
  Q('¿Qué indica la cabecera Content-Type: application/json?', ['Que el cuerpo es JSON', 'Que la conexión está cifrada', 'Que el servidor es un ESP32', 'Que la respuesta es un error'], 'Las cabeceras describen el mensaje.', { c: 'io_http', h: '«Content» es el contenido; «type», su tipo.' }),
  { t: 'match', q: 'Une cada acción con su método.', pairs: [['Leer la temperatura actual', 'GET'], ['Enviar una lectura nueva al servidor', 'POST'], ['Cambiar solo el umbral de alarma', 'PATCH'], ['Borrar un nodo dado de baja', 'DELETE']], c: 'io_rest', h: 'Leer, crear, cambiar una parte, borrar.' },
  Q('¿Qué falta en este fragmento?', ['Comprobar el código de estado antes de usar la respuesta', 'Nada', 'Un delay(5000)', 'Un Serial.begin dentro'], 'Si el servidor responde con un error, getString() te dará la página de error.', { code: 'HTTPClient http;\nhttp.begin(url);\nhttp.GET();\nString cuerpo = http.getString();\nprocesar(cuerpo);\nhttp.end();', c: 'io_status', h: 'Compara con el ejemplo paso a paso: ¿qué se hacía con lo que devuelve GET()?' }),
  Q('http.GET() devuelve −1. ¿Qué significa?', ['Que ni siquiera se pudo conectar con el servidor', 'Que el recurso no existe', 'Que todo fue bien', 'Que el JSON es inválido'], 'Los negativos son errores de la librería, no códigos HTTP.', { c: 'io_status', h: 'Los códigos HTTP son de tres cifras y positivos.' }),
  Q('HTTP es «sin estado». ¿Qué significa?', ['Cada petición es independiente: el servidor no recuerda las anteriores por sí mismo', 'Que no devuelve códigos de estado', 'Que no lleva cabeceras', 'Que no puede enviar JSON'], 'Las sesiones se construyen encima, con cookies o tokens.', { c: 'io_http', h: '«Estado» aquí es memoria de lo que pasó antes.' }),
  I('<b>Resumen</b>\n· HTTP: el cliente pide (método, ruta, cabeceras, cuerpo) y el servidor responde (código, cabeceras, cuerpo).\n· GET lee, POST crea, PUT sustituye, PATCH cambia una parte, DELETE borra.\n· En el ESP32: tiempo máximo, comprobar el código y end().')
 ]),
 L('io11', 'REST y códigos de estado', 'code', ['io_status', 'io_rest'], [
  Q('Tu nodo envía una lectura y el servidor responde 500. ¿De quién crees que es el problema?', ['Del servidor', 'Del nodo: la petición está mal', 'Del WiFi', 'De nadie: 500 significa éxito'], 'La primera cifra del código dice de quién es la culpa: 4 es del que pide; 5, del que responde.', { predict: true, c: 'io_status', h: 'Si la red falla, ¿llegaría siquiera una respuesta?' }),
  { t: 'explore', text: 'Ahora mira los errores: prueba a cambiar el umbral del nodo.', viz: 'io_http', params: PP.http(),
    tasks: [
      { q: 'code', min: 401, max: 401, text: 'Intenta cambiar el umbral (PUT a /api/umbral) sin credencial', done: '401: falta autenticarse. Repetirlo igual no sirve de nada.', hint: 'PUT a /api/umbral, sin credencial.' },
      { q: 'putOk', min: 1, max: 1, text: 'Ahora cámbialo de verdad', done: 'Con la credencial, 200 OK: el umbral queda en 30.', hint: 'Pon la credencial.' }
    ] },
  I('<b>REST</b> es una forma de diseñar APIs: cada cosa es un <b>recurso</b> con su ruta, y el método dice qué haces con él. Es predecible: si conoces una ruta, adivinas las demás.', { code: 'GET    /nodos                  lista de nodos\nGET    /nodos/salon            un nodo\nGET    /nodos/salon/lecturas   sus lecturas\nPOST   /nodos/salon/lecturas   añadir una lectura\nPATCH  /nodos/salon            cambiar una parte (el umbral)\nDELETE /nodos/salon            darlo de baja' }),
  I('El <b>código de estado</b> se lee por su primera cifra:', { code: '2xx éxito          200 OK · 201 creado · 204 sin contenido\n3xx redirección    301, 302 · 304 no ha cambiado\n4xx error tuyo     400 mal formada · 401 sin autenticar\n                   403 prohibido · 404 no existe\n                   429 demasiadas peticiones\n5xx error suyo     500 error interno · 503 no disponible' }),
  I('El código decide tu siguiente paso:', { svg: CHK([['2xx: hecho; sigue', 1], ['4xx: corrige la petición; no repitas igual', 0], ['429: baja el ritmo (respeta Retry-After)', 2], ['5xx: reintenta más tarde, esperando cada vez más', 2]], '¿Y ahora qué?') }),
  { t: 'explore', text: 'Tras un corte, a veces no sabes si tu petición llegó y la repites. Mira qué pasa al repetir cada tipo de petición.', viz: 'io_idem', params: PP.idem(),
    tasks: [
      { q: 'error', min: 2, max: 10, text: 'Haz que el POST llegue 3 veces, como si reintentaras tras dos cortes', done: 'El contador sube de más: sumar no se puede repetir sin miedo.', hint: 'Sube «Veces que llega».' },
      { q: 'idemOK', min: 1, max: 1, text: 'Cambia a una petición que puedas repetir 3 o más veces sin estropear nada', done: 'Fijar un valor (PUT) deja lo mismo aunque llegue varias veces.' }
    ] },
  I('Una petición es <b>idempotente</b> si repetirla deja el sistema igual que hacerla una vez. GET, PUT y DELETE lo son; POST normalmente no. Importa al reintentar.', { svg: VS({ t: 'PUT umbral = 30', l: ['1 vez → 30', '3 veces → 30', 'se puede repetir'], c: 'var(--ok)' }, { t: 'POST suma 1', l: ['1 vez → 8', '3 veces → 10', '¡cuidado al repetir!'], c: 'var(--err)' }) }),
  { t: 'steps', text: 'Tras un corte, no sabes si llegó «suma 1 al contador». ¿Cómo lo haces seguro?', steps: ['POST /contador/sumar no es idempotente: repetirlo puede contar dos veces.', 'Opción 1: envía el estado, no el cambio: PUT /contador con {"valor":8}.', 'Opción 2: da a cada petición un identificador único; el servidor ignora las repetidas.', 'Con cualquiera de las dos, ya puedes reintentar sin miedo.'], result: 'Diseña las peticiones para que repetirlas no haga daño.' },
  { t: 'match', q: 'Une cada código con su significado.', pairs: [['200', 'Todo bien'], ['401', 'Falta autenticarse'], ['404', 'Ese recurso no existe'], ['429', 'Vas demasiado deprisa'], ['503', 'El servidor no está disponible']], c: 'io_status', h: 'Primera cifra: 2 bien, 4 culpa tuya, 5 culpa del servidor.' },
  Q('Tu nodo recibe 429 de una API pública. ¿Qué haces?', ['Esperar más entre peticiones (y respetar la cabecera Retry-After si viene)', 'Reintentar en bucle al momento', 'Cambiar a POST', 'Ignorarlo'], 'Te piden que bajes el ritmo.', { c: 'io_status', h: 'Busca el 429 en la tabla de códigos.' }),
  Q('Recibes 500 al enviar una lectura. ¿Qué haces?', ['Guardarla y reintentar más tarde: el problema es del servidor', 'Corregir el formato de la lectura', 'Darla por enviada', 'Cambiar la clave del WiFi'], '5xx = servidor; suele ser pasajero.', { c: 'io_status', h: '¿De quién es la culpa en un 5xx?' }),
  Q('Recibes 400 al enviar una lectura. ¿Reintentas igual?', ['No: la petición está mal y repetirla dará el mismo error', 'Sí, en bucle', 'Sí, cambiando de puerto', 'Sí, más deprisa'], 'Corrige la petición antes.', { c: 'io_status', h: 'Un 4xx dice que el fallo está en lo que tú envías.' }),
  Q('Tras un corte, no sabes si llegó tu petición. ¿Cuál puedes repetir sin miedo?', ['PUT /nodos/salon/umbral con {"valor":30}', 'POST /contador/incrementar', 'POST /avisos', 'POST /lecturas sin identificador'], 'Fijar un valor es idempotente; sumar, no.', { c: 'io_rest', h: '¿Cuál deja lo mismo aunque llegue dos veces?' }),
  Q('¿Qué método y qué código esperas al dar de alta un nodo nuevo correctamente?', ['POST y 201', 'GET y 404', 'DELETE y 200', 'PUT y 500'], '201 = creado.', { c: 'io_rest', h: 'Crear algo nuevo: ¿qué método? ¿Y qué código dice «creado»?' }),
  Q('En una API REST de tu casa, ¿qué ruta es más coherente para leer las lecturas del nodo de la cocina?', ['GET /nodos/cocina/lecturas', 'GET /dameLasLecturasCocina', 'POST /leer?cocina', 'GET /cocina-lecturas-todas'], 'Recursos anidados y el verbo lo pone el método.', { c: 'io_rest', h: 'En REST las rutas son sustantivos, no verbos.' }),
  I('<b>Resumen</b>\n· REST: rutas = recursos (sustantivos); métodos = verbos.\n· 2xx bien; 4xx corrige y no repitas igual; 5xx reintenta más tarde.\n· Idempotente = repetir no cambia el resultado (GET, PUT, DELETE). POST, con cuidado.')
 ]),
 L('io12', 'JSON y ArduinoJson', 'code', ['io_json', 'io_arduinojson', 'io_payload'], [
  Q('¿Cuántos bytes crees que ocupa el texto {"co2":812}?', ['11: cada carácter es un byte', '3: solo el número', '2: un entero', '1'], 'JSON es texto: llaves, comillas, nombre, dos puntos y cifras cuentan, un byte cada uno.', { predict: true, c: 'io_payload', h: 'Cuenta los caracteres uno a uno.' }),
  { t: 'explore', text: 'El mismo dato puede viajar de varias formas. Cada cuadrado es un byte.', viz: 'io_bytes', params: PP.bytes(),
    tasks: [
      { q: 'bytes', min: 60, max: 1000, text: 'Con nombres largos, mete valores hasta pasar de 60 bytes', done: 'El envoltorio (nombres, comillas, comas) pesa más que los datos.', hint: 'Sube «Valores».' },
      { q: 'ocho4', min: 1, max: 1, text: 'Consigue enviar 4 valores en solo 8 bytes', done: 'En binario, 2 bytes por valor: el servidor sabe qué es cada pareja.', hint: 'Formato binario y 4 valores.' }
    ] },
  I('<b>JSON</b> es texto con objetos {"clave": valor}, listas [1, 2, 3], números, cadenas entre comillas dobles, true, false y null. Es el idioma común de casi todas las APIs.', { code: '{\n  "id": "salon",\n  "t": 21.4,\n  "h": 48,\n  "bateria": 3.91,\n  "alarmas": ["puerta"],\n  "ok": true\n}', more: 'En JSON los decimales llevan siempre punto (21.4), aunque en español escribamos 21,4: es un formato para máquinas.' }),
  I('Para saber qué tipo tiene un valor, mira su primer carácter:', { svg: CHK([['{  → un objeto', 2], ['[  → una lista', 2], ['"  → una cadena de texto', 2], ['dígito o −  → un número', 2], ['true, false o null (en minúsculas)', 2]], 'Tipos en JSON') }),
  I('En el ESP32, <b>ArduinoJson</b> (versión 7) usa un JsonDocument que crece según lo necesita. Para enviar, rellenas y <b>serializas</b>; para leer, <b>deserializas</b> y compruebas el error.', { code: '#include <ArduinoJson.h>\n\nJsonDocument doc;\ndoc["id"] = "salon";\ndoc["t"] = 21.4;\nchar buf[64];\nsize_t n = serializeJson(doc, buf);   // n = bytes escritos\n\nJsonDocument entrada;\nDeserializationError err = deserializeJson(entrada, carga, len);\nif (err) Serial.println(err.c_str());\nint umbral = entrada["umbral"] | 30;   // 30 si no viene' }),
  I('El JSON de una API puede no caber en la RAM del ESP32. Dos defensas: pedir solo los campos que necesitas y deserializar con un <b>filtro</b> directamente desde la red, descartando al vuelo lo demás.', { svg: FLOW(['API: 60 kB', 'Filtro', '3 números', 'RAM tranquila'], 'lo que no está en el filtro ni se guarda') }),
  I('JSON frente a binario: {"co2":812} son 11 bytes; el mismo dato como entero de 16 bits ocupa 2. Por WiFi da igual; en radios lentas, donde cada byte cuesta tiempo de emisión y batería, se envía binario y el servidor lo decodifica.', { code: 'temperatura 21,4 °C → ×10 → 214 → 0x00D6 (2 bytes)\nhumedad     48 %    →        48 → 0x0030 (2 bytes)\n4 valores de 16 bits = 8 bytes' }),
  { t: 'steps', text: 'Construye en el ESP32 el mensaje {"id":"salon","t":21.4,"h":48} y cuenta cuánto ocupa.', steps: ['JsonDocument doc; crea el documento vacío.', 'doc["id"] = "salon"; doc["t"] = 21.4; doc["h"] = 48; añade los tres campos.', 'serializeJson(doc, buf) lo escribe en buf y devuelve cuántos bytes ha escrito.', 'Cuenta: {"id":"salon","t":21.4,"h":48} tiene 30 caracteres → <b>30 bytes</b>.'], result: '30 bytes para tres datos que en binario ocuparían unos 6.' },
  Q('En el ejemplo del principio, ¿qué tipo tiene "alarmas"?', ['Una lista (array)', 'Un número', 'Un objeto', 'Un booleano'], 'Corchetes = lista.', { c: 'io_json', h: 'Mira el primer carácter de su valor.' }),
  Q('¿Cuál es JSON válido?', ['{"t": 21, "ok": true}', "{'t': 21}", '{t: 21}', '{"t": 21, "ok": True}'], 'Claves entre comillas dobles; true en minúscula.', { c: 'io_json', h: 'Fíjate en el tipo de comillas y en las mayúsculas.' }),
  G('io_jsonSize'),
  Q('¿Qué hace entrada["umbral"] | 30?', ['Da el umbral recibido, o 30 si falta o no es un número', 'Un OR de bits', 'Suma 30', 'Escribe 30 en el documento'], 'Es el valor por defecto de ArduinoJson.', { code: 'int umbral = entrada["umbral"] | 30;', c: 'io_arduinojson', h: 'Léelo como «el umbral, o si no, 30».' }),
  Q('Una API devuelve 60 kB de previsión y solo quieres 3 números. ¿Mejor estrategia?', ['Pedir menos campos y deserializar con filtro desde la red', 'Comprar un ESP32 con más flash', 'Leerlo todo a un String y buscar con indexOf', 'Pedirlo en trozos de 10 bytes'], 'Ahorra RAM y tiempo.', { c: 'io_arduinojson', h: 'Lo que cuesta es guardar en RAM lo que no necesitas.' }),
  Nm('Cuatro valores de 16 bits en binario. ¿Cuántos bytes?', 8, 'bytes', '4 × 2 bytes.', { c: 'io_payload', h: '16 bits son 2 bytes.' }),
  Q('¿Cuándo merece la pena enviar binario en vez de JSON?', ['Cuando cada byte cuesta: radios lentas o con el tiempo de emisión limitado', 'Siempre', 'Nunca', 'Solo por WiFi'], 'Por WiFi, JSON es cómodo y casi gratis.', { c: 'io_payload', h: '¿Dónde importa que el mensaje sea más corto?' }),
  I('<b>Resumen</b>\n· JSON: objetos {}, listas [], cadenas con comillas dobles, números con punto, true/false/null.\n· ArduinoJson: serializar para enviar; deserializar y comprobar el error para leer; | da un valor por defecto.\n· Filtra lo que no necesitas.\n· Binario: 2 bytes por valor de 16 bits, para cuando cada byte cuesta.')
 ]),
 L('io13', 'Servidor en el nodo o cliente que envía', 'code', ['io_srvcli', 'io_radio', 'io_status', 'io_surface'], [
  Q('Tu termómetro WiFi sirve su página y en loop() hace delay(10000) entre lecturas. Abres la página. ¿Qué crees que pasa?', ['Puede tardar hasta 10 s en cargar', 'Carga al instante', 'No carga nunca', 'Se reinicia el ESP32'], 'Un servidor solo atiende cuando el programa le deja: mientras está en delay(), nadie contesta.', { predict: true, c: 'io_srvcli', h: '¿Qué hace el ESP32 durante un delay()?' }),
  { t: 'explore', text: 'Llegan peticiones (triángulos) a un servidor en el nodo. Solo se atienden cuando loop() llama a handleClient() (verde). Cambia el delay.', viz: 'io_srvcli', params: PP.srvcli(),
    tasks: [
      { q: 'esperaMax', min: 3, max: 100, text: 'Pon un delay de 5 s o más y mira cuánto esperan', done: 'Mientras dura el delay, nadie atiende: las peticiones hacen cola.', hint: 'Sube el delay.' },
      { q: 'esperaMax', min: 0, max: 0.2, text: 'Consigue que ninguna espere más de 0,2 s', done: 'Sin bloquear loop(), handleClient() atiende enseguida.', hint: 'Baja el delay a 0,1 s o menos.' }
    ] },
  I('Dos formas de sacar datos de un nodo por HTTP:', { svg: VS({ t: 'Servidor en el nodo', l: ['el nodo atiende', 'tú preguntas', 'sin infraestructura', 'debe estar despierto'], c: 'var(--led)' }, { t: 'Cliente que envía', l: ['el nodo hace POST', 'a un servidor central', 'cuando tiene datos', 'puede dormir'], c: 'var(--ok)' }) }),
  I('Si el nodo es servidor, no bloquees: mide con millis() y deja que handleClient() se llame muchas veces por segundo.', { code: 'unsigned long ultima = 0;\n\nvoid loop() {\n  server.handleClient();             // atiende a quien llegue\n  if (millis() - ultima >= 10000) {  // cada 10 s, sin bloquear\n    ultima = millis();\n    leerSensor();\n  }\n}' }),
  I('Si el nodo es cliente, el servidor central (una Raspberry Pi con tu API, por ejemplo) recibe, guarda y reparte. El nodo solo necesita una dirección a la que enviar, y nunca da nada por enviado sin confirmación.', { svg: FLOW(['Medir', 'Montar JSON', 'POST', '¿Código 2xx?', 'Si no: a la cola'], 'reintentará más tarde lo que no se confirmó') }),
  I('Un servidor en el nodo atiende a cualquiera de tu red. Si tiene rutas que cambian cosas (abrir una válvula), protégelas con contraseña y nunca lo expongas a internet.', { svg: CHK([['/api/estado: solo lee, sin riesgo', 1], ['/abrir sin contraseña: ¡peligro!', 0], ['/abrir con contraseña: aceptable en casa', 2], ['Expuesto a internet: nunca', 0]], 'Rutas de un nodo de riego') }),
  { t: 'steps', text: 'Un nodo a pilas debe enviar la humedad del suelo cada 15 minutos. ¿Servidor o cliente?', steps: ['Para durar meses, pasa casi todo el tiempo dormido.', 'Dormido no escucha: un servidor en él estaría «cerrado» casi siempre.', 'Así que es él quien habla: despierta, mide, hace POST y comprueba el código.', 'Si no recibe 2xx, guarda la lectura y la reenvía en el siguiente despertar.'], result: 'Cliente que envía: el que duerme debe hablar él.' },
  { t: 'match', q: 'Une cada situación con el enfoque que encaja.', pairs: [['Un único sensor enchufado que miras de vez en cuando', 'Servidor en el nodo'], ['Un nodo a pilas que duerme 10 minutos', 'Cliente que envía'], ['Veinte nodos que alimentan una base de datos', 'Cliente que envía '], ['Configurar un nodo nuevo desde el navegador', 'Servidor en el nodo ']], c: 'io_srvcli', h: '¿Está siempre despierto? ¿Quién centraliza los datos?' },
  Q('¿Por qué un nodo que duerme no puede ser servidor?', ['Dormido no escucha: nadie podría conectarse a él', 'Porque HTTP no funciona con baterías', 'Porque no tiene IP', 'Sí puede, sin problema'], 'El que duerme debe hablar él.', { c: 'io_radio', h: '¿Qué hace la radio mientras el chip duerme?' }),
  Q('¿Qué problema tiene este loop?', ['El servidor solo atiende una vez cada 10 s', 'Ninguno', 'No compila', 'Gasta demasiada flash'], 'handleClient() debe llamarse a menudo.', { code: 'void loop() {\n  server.handleClient();\n  leerSensor();\n  delay(10000);\n}', c: 'io_srvcli', h: 'Recuerda la exploración con el delay.' }),
  { t: 'order', q: 'Ordena un envío robusto por HTTP desde un nodo.', items: ['Medir y construir el JSON', 'Conectar al WiFi si no lo está', 'POST con tiempo máximo', 'Comprobar el código de estado', 'Si falla, guardar en cola y reintentar más tarde'], e: 'Nunca des por hecho que llegó.', c: 'io_srvcli', h: 'Primero el dato, luego la red, luego el envío y su confirmación.' },
  Q('Un nodo hace POST, recibe 201 y pierde la conexión antes de leer el cuerpo. ¿Llegó el dato?', ['Sí: el código ya confirma que el servidor lo creó', 'No', 'No se puede saber nunca', 'Solo si reintenta'], 'El código de estado es la confirmación.', { c: 'io_status', h: '¿Qué significa 201?' }),
  Q('Tu nodo de riego tiene la ruta /abrir sin contraseña. ¿Quién puede abrir la válvula?', ['Cualquier equipo de tu red, incluido un aparato comprometido', 'Solo tú', 'Nadie', 'Solo el router'], 'Cada ruta que cambia algo es una puerta: protégela.', { c: 'io_surface', h: '¿Qué comprueba el nodo antes de obedecer?' }),
  I('<b>Resumen</b>\n· Servidor en el nodo: sencillo, pero debe estar despierto y sin bloquear loop().\n· Cliente que envía: encaja con nodos a pilas y con muchos nodos.\n· Nunca des un envío por hecho sin un código 2xx.\n· Protege las rutas que cambian cosas.')
 ]),
 PRJ('io-p1', 'Proyecto: termómetro WiFi con página propia', 'io_webthermo'),
 PRJ('io-p3', 'Proyecto: timbre con aviso al móvil sin nube', 'io_doorbell'),
 PRJ('io-p4', 'Proyecto: panel e-ink de información', 'io_eink')
],
exam: [
  Q('¿Qué pide esta petición?', ['Cambiar solo el umbral del nodo garaje a 28', 'Leer el umbral del nodo garaje', 'Borrar el nodo garaje', 'Crear un nodo nuevo llamado garaje'], 'PATCH cambia una parte de un recurso. La ruta dice qué recurso (el nodo garaje) y el cuerpo, qué parte y con qué valor.', { c: 'io_http', l: 'io10', code: 'PATCH /api/nodos/garaje HTTP/1.1\nHost: casa.local\nContent-Type: application/json\nContent-Length: 13\n\n{"umbral":28}', h: 'Lee el método, luego la ruta y por último el cuerpo.' }),
  Nm('Tu nodo va a enviar el cuerpo {"luz":"on"}. ¿Qué valor pones en Content-Length?', 12, 'bytes', 'JSON es texto: cada carácter, un byte. { " l u z " : " o n " } son 12 caracteres.', { tol: 0, c: 'io_http', l: 'io10', h: 'Cuenta todos los caracteres, incluidas llaves, comillas y dos puntos.' }),
  Q('¿Con qué cabecera presenta tu nodo su token al servidor?', ['Authorization', 'Content-Type', 'Host', 'Content-Length'], 'Authorization lleva la credencial (por ejemplo, Bearer y el token). Content-Type dice el tipo del cuerpo, Host el servidor y Content-Length su tamaño.', { c: 'io_http', l: 'io10', h: 'Repasa qué metadato lleva cada cabecera de la lección.' }),
  Q('Este código se ejecuta cada minuto durante semanas. ¿Qué problema tiene?', ['Nunca llama a http.end(): no libera la conexión ni la memoria y acabará fallando', 'Ninguno', 'Lee el cuerpo antes de comprobar el código', 'No puede hacer un GET a una IP'], 'Comprueba el código y lee el cuerpo bien, pero cada vuelta deja la conexión y su memoria sin liberar. end() al acabar, siempre.', { c: 'io_http', l: 'io10', code: 'void enviarEstado() {\n  HTTPClient http;\n  http.begin("http://192.168.1.10/api/estado");\n  http.setTimeout(3000);\n  int codigo = http.GET();\n  if (codigo == 200) procesar(http.getString());\n}', h: 'Repasa los cuatro hábitos del patrón con HTTPClient y busca cuál falta.' }),
  { t: 'match', q: 'Une cada código de estado con su significado.', pairs: [['201', 'Creado'], ['204', 'Hecho, sin cuerpo que devolver'], ['304', 'No ha cambiado desde tu copia'], ['400', 'Petición mal formada'], ['403', 'Sabe quién eres, pero no tienes permiso']], e: '2xx éxito, 3xx redirección o «sin cambios», 4xx error del que pide. 401 es «no te has autenticado»; 403, «autenticado, pero prohibido».', c: 'io_status', l: 'io11', h: 'Empieza por la primera cifra de cada código: éxito, redirección o error tuyo.' },
  Q('Tu nodo hace POST y recibe 401. ¿Qué haces?', ['Revisar la credencial: falta o no es válida, y repetir igual no servirá', 'Reintentar en bucle', 'Esperar y reintentar: el servidor está caído', 'Cambiar el POST por un GET'], '4xx: error del que pide. 401 en concreto dice que falta autenticarse o que la credencial no vale.', { c: 'io_status', l: 'io11', h: 'La primera cifra te dice de quién es el problema.' }),
  Q('El servidor responde 503 con la cabecera Retry-After: 120. ¿Qué hace el nodo?', ['Guardar la lectura y reintentar dentro de unos 2 minutos', 'Descartar la lectura: el servidor la ha rechazado', 'Corregir el formato del JSON', 'Reintentar al instante, en bucle'], '5xx: el problema es del servidor y suele ser pasajero. Retry-After indica cuántos segundos esperar: 120 s.', { c: 'io_status', l: 'io11', h: '¿De quién es un error 5xx, y qué te pide Retry-After?' }),
  Q('Tu nodo envía {"t":"hola"} donde el servidor espera un número. ¿Qué código devuelve un servidor bien hecho?', ['400', '500', '201', '404'], 'La petición llega, pero su contenido es inválido: error del cliente, 400. No es un fallo interno del servidor (500) ni un recurso inexistente (404).', { c: 'io_status', l: 'io11', h: '¿Quién tiene la culpa: el que pide o el que responde?' }),
  Q('Tras un corte, no sabes si llegaron tus peticiones. ¿Cuál puedes repetir sin miedo?', ['DELETE /nodos/trastero', 'POST /nodos/trastero/lecturas', 'POST /avisos/enviar', 'POST /contador/sumar'], 'Borrar dos veces deja lo mismo que borrar una: DELETE es idempotente. Repetir esos POST puede crear dos lecturas, dos avisos o sumar de más.', { c: 'io_rest', l: 'io11', h: 'Imagina cada petición repetida dos veces: ¿cuál deja el sistema igual?' }),
  Q('Un nodo manda «riega 10 minutos más» con POST y, tras un corte, no sabe si llegó. ¿Cómo rediseñas la petición?', ['Enviar el estado deseado con PUT, por ejemplo regar hasta las 18:40, que se puede repetir', 'Mandarlo dos veces para asegurarse', 'Usar GET en lugar de POST', 'Esperar 10 minutos antes de reintentar'], 'Un cambio relativo repetido se acumula; un estado absoluto repetido no cambia nada. Fijar el valor es idempotente.', { c: 'io_rest', l: 'io11', h: 'Compara «suma algo» con «déjalo en este valor»: ¿cuál aguanta una repetición?' }),
  Q('Un nodo hace POST de una lectura, se corta la conexión sin recibir código, reintenta… y el servidor la guarda dos veces. ¿Mejor arreglo?', ['Enviar cada lectura con un identificador único (o su hora de medida) para que el servidor ignore las repetidas', 'No reintentar nunca', 'Reintentar más deprisa', 'Cambiar a PATCH'], 'Sin código no sabes si llegó, así que reintentar es correcto. El servidor necesita reconocer la repetición: un identificador lo hace idempotente.', { c: 'io_rest', l: 'io11', h: 'El reintento es necesario; lo que falta es que repetirlo no haga daño.' }),
  Q('¿Cuál de estos textos es JSON válido?', ['A', 'B', 'C', 'D'], 'En JSON las claves y las cadenas van entre comillas dobles, y true/false en minúsculas. B usa comillas simples, C pone False con mayúscula y D deja la clave sin comillas.', { c: 'io_json', l: 'io12', code: 'A: {"ids": ["sur", "norte"], "ok": false}\nB: {"ids": [\'sur\', \'norte\']}\nC: {"ok": False}\nD: {t: 21.4}', h: 'Revisa las comillas de claves y cadenas y cómo se escriben los booleanos.' }),
  Nm('Envías temperatura y humedad cada 5 minutos. ¿Cuántos bytes al día ahorras mandándolas en binario (4 bytes) en vez de con este JSON?', 3744, 'bytes', 'El JSON tiene 17 caracteres: 17 bytes. En binario, 4. Ahorro por mensaje: 13 bytes. Mensajes al día: 86 400 / 300 = 288. Ahorro: 288 × 13 = 3744 bytes.', { tol: 0, c: 'io_payload', l: 'io12', code: '{"t":21.4,"h":48}', h: 'Cuenta los caracteres del JSON, resta los 4 bytes del binario y multiplica por los mensajes del día.' }),
  Q('¿Qué le falta a este código para ser robusto?', ['Comprobar el error de deserializeJson antes de usar los datos', 'Nada', 'Un delay() antes de leer', 'Serializar el documento antes de leerlo'], 'Si la carga llega cortada o mal formada, deserializeJson devuelve un error y el documento no tiene lo que esperas. Compruébalo antes de usarlo.', { c: 'io_arduinojson', l: 'io12', code: 'JsonDocument doc;\ndeserializeJson(doc, carga, len);\nfloat t = doc["t"];\nactuar(t);', h: '¿Qué devuelve deserializeJson y qué se hace con ello en el ejemplo de la lección?' }),
  Q('El servidor envía {"modo":"eco"}, sin intervalo. ¿Cuánto vale intervalo tras esta línea?', ['600', '0', 'Un valor al azar', 'El programa se cuelga'], 'El operador | de ArduinoJson da el valor por defecto cuando el campo falta o no es del tipo esperado: 600.', { c: 'io_arduinojson', l: 'io12', code: 'int intervalo = cfg["intervalo"] | 600;', h: 'Recuerda qué significa | en ArduinoJson, que no es un OR de bits.' }),
  Q('Un nodo servidor tarda 3 s en leer su sensor dentro de loop(). ¿Qué notará quien abra su página?', ['Esperas de hasta unos 3 s: mientras lee, nadie atiende', 'Nada: el servidor atiende en paralelo', 'Que la página no carga nunca', 'Que el nodo se reinicia'], 'handleClient() solo atiende cuando loop() llega a él. Cualquier cosa que bloquee 3 s retrasa las respuestas hasta 3 s.', { c: 'io_srvcli', l: 'io13', h: '¿Cuándo se llama a handleClient() mientras dura la lectura?' }),
  Q('Una estación meteorológica enchufada que solo consultas tú desde el navegador de casa. ¿Qué enfoque es el más sencillo?', ['Servidor en el nodo', 'Cliente que envía a un servidor central', 'Un broker en la nube', 'Ninguno: no se puede sin internet'], 'Un único nodo, enchufado y siempre despierto, que miras de vez en cuando: servirse su propia página no necesita más infraestructura.', { c: 'io_srvcli', l: 'io13', h: 'Mira la alimentación, el número de nodos y quién consulta.' }),
  { t: 'order', q: 'Ordena un despertar de un nodo cliente a pilas.', items: ['Despertar y medir', 'Conectarse al WiFi', 'POST con tiempo máximo', 'Si llega un 2xx, borrar la lectura de la cola; si no, guardarla', 'Volver a dormir'], e: 'El que duerme habla él: mide, conecta, envía, confirma por el código y vuelve a dormir cuanto antes.', c: 'io_srvcli', l: 'io13', h: 'No se puede enviar sin red, ni decidir sin haber recibido la respuesta.' },
  Q('¿Por qué un nodo que debe obedecer al momento «abre la válvula» suele ir enchufado?', ['Porque debe estar siempre escuchando, y eso gasta de forma continua', 'Porque HTTP no funciona con pilas', 'Porque las válvulas no aceptan órdenes por WiFi', 'Porque con pilas no tiene IP'], 'Recibir al instante exige tener la radio lista todo el rato. Con pilas, se agotarían en poco tiempo.', { c: 'io_radio', l: 'io13', h: '¿Qué tiene que estar haciendo la radio para recibir una orden en cualquier momento?' }),
  Q('Tu nodo servidor tiene GET /estado y POST /abrir (abre la puerta del garaje). ¿Qué proteges con contraseña como mínimo?', ['POST /abrir: cambia algo en el mundo real', 'Solo GET /estado', 'Ninguna: está en la red de casa', 'Las dos, y además las abres en el router'], 'Cualquier equipo de tu red, incluido uno comprometido, podría llamar a /abrir. Las rutas que cambian cosas, protegidas; y nada expuesto a internet.', { c: 'io_surface', l: 'io13', h: '¿Qué ruta tendría consecuencias si la llamara cualquiera?' })
] },

{ id: 'io-m4', title: 'MQTT a fondo', desc: 'Sondeo o empuje, broker, temas y comodines, QoS, retenidos, último testamento, sesiones y un Mosquitto con usuarios y permisos.', nodes: [
 L('io14', 'Sondeo, empuje y WebSocket', 'code', ['io_push'], [
  Q('Un panel quiere enterarse al momento de cuándo se abre la puerta de casa, que cambia unas 10 veces al día. ¿Qué crees que es mejor?', ['Que la puerta avise cuando cambie', 'Que el panel pregunte cada segundo', 'Que el panel pregunte una vez al día', 'Da igual'], 'Preguntar sin parar gasta y aun así llega tarde; que avise quien tiene el dato es rápido y barato.', { predict: true, c: 'io_push', h: '¿Cuántas de las preguntas del panel tendrían una respuesta nueva?' }),
  { t: 'explore', text: 'Arriba, los cambios de la puerta en una hora; abajo, cuándo se entera el panel. Compara preguntar cada cierto tiempo (sondeo) con que avise la puerta (empuje).', viz: 'io_poll', params: PP.poll(),
    tasks: [
      { q: 'rapidoSondeo', min: 1, max: 1, text: 'Con sondeo, consigue ver cada cambio en 5 s como mucho', done: 'Lo consigues… con miles de preguntas al día, casi todas inútiles.', hint: 'Pregunta cada 5 s o menos.' },
      { q: 'eficiente', min: 1, max: 1, text: 'Consigue lo mismo con menos de 100 mensajes al día', done: 'Empuje: un mensaje por cambio y se ve al instante.', hint: 'Cambia de modo.' }
    ] },
  I('¿Cómo se entera alguien de que algo ha cambiado?', { svg: VS({ t: 'Sondeo (polling)', l: ['preguntar cada T s', 'sencillo', 'gasta aunque no cambie', 'llega hasta T s tarde'], c: 'var(--led)' }, { t: 'Empuje (push)', l: ['avisa quien cambia', 'al instante', 'un mensaje por cambio', 'necesita un canal'], c: 'var(--ok)' }) }),
  I('Las cuentas del sondeo son sencillas:', { code: 'peticiones al día = 86 400 / T\nretraso máximo    = T   (el cambio llega justo después de preguntar)\n\nT = 2 s  → 43 200 peticiones al día, retraso de hasta 2 s\nT = 60 s →  1 440 peticiones al día, retraso de hasta 1 min' }),
  I('<b>WebSocket</b> empieza como una petición HTTP y se «mejora» a un canal permanente en los dos sentidos, sobre la misma conexión TCP. Así el servidor puede enviar al navegador cuando quiera: lo usan los paneles web en directo.', { svg: FLOW(['Petición HTTP', 'Upgrade', 'Canal abierto', 'Servidor empuja'], 'un solo saludo y luego mensajes en los dos sentidos') }),
  I('Otras formas de empuje: un <b>webhook</b> es un servicio que te hace un POST cuando ocurre algo. Y entre máquinas, el empuje más usado en IoT es <b>MQTT</b>: lo empiezas en la lección siguiente.', { svg: CHK([['Previsión del tiempo cada hora: sondeo', 2], ['Panel web en directo: WebSocket', 2], ['Un servicio que te avisa: webhook', 2], ['Muchos nodos y muchos lectores: MQTT', 2]], 'Cada caso con su técnica') }),
  { t: 'steps', text: 'Un panel pregunta cada 2 s por una puerta que cambia 10 veces al día. ¿Cuántas preguntas sobran?', steps: ['Preguntas al día: 86 400 / 2 = <b>43 200</b>.', 'Respuestas con novedad: como mucho 10.', 'Preguntas inútiles: 43 200 − 10 = 43 190, más del 99,9 %.', 'Con empuje: 10 mensajes al día y el cambio se ve al instante.'], result: 'Si el dato cambia poco y te urge, empuje.' },
  Nm('Un panel pregunta cada 30 s. ¿Cuántas peticiones hace al día?', 2880, 'peticiones', '86 400 / 30.', { c: 'io_push', h: 'Divide los segundos de un día entre el intervalo.' }),
  Q('Con sondeo cada 30 s, ¿cuánto puede tardar en verse un cambio?', ['Hasta 30 s', 'Nada', '1 s', 'Hasta 60 s'], 'En el peor caso, cambia justo después de preguntar.', { c: 'io_push', h: 'Imagina que cambia un instante después de una pregunta.' }),
  Q('¿Qué ventaja tiene WebSocket sobre el sondeo para un panel en el navegador?', ['El servidor envía los cambios al instante sin peticiones repetidas', 'Usa UDP', 'No necesita servidor', 'No necesita red'], 'Canal abierto en los dos sentidos.', { c: 'io_push', h: '¿Quién puede hablar primero en un WebSocket?' }),
  { t: 'match', q: 'Une cada técnica con su caso ideal.', pairs: [['Sondeo HTTP', 'Consultar la previsión del tiempo cada hora'], ['WebSocket', 'Panel web que se actualiza en directo'], ['Webhook (POST de aviso)', 'Un servicio externo te avisa de un evento'], ['Empuje desde el nodo', 'Sensor a pilas que avisa al cambiar']], c: 'io_push', h: 'Pregúntate quién tiene el dato y quién debe enterarse.' },
  Q('Un nodo a pilas con un dato que cambia rara vez. ¿Qué modelo?', ['Empuje: despierta, envía si cambió (o cada cierto tiempo) y duerme', 'Que el servidor le pregunte cada segundo', 'Un WebSocket abierto siempre', 'Ninguno'], 'Al que duerme no se le puede preguntar.', { c: 'io_push', h: '¿Puede contestar un nodo dormido?' }),
  Q('¿Por qué el sondeo sigue siendo útil a veces?', ['Es sencillo y basta cuando el dato cambia despacio y no urge', 'Es más rápido que el empuje', 'Gasta menos siempre', 'Es más seguro'], 'Para la previsión del tiempo, preguntar cada hora sobra.', { c: 'io_push', h: 'Piensa en un dato que cambia una vez por hora.' }),
  Q('Un servicio externo hace un POST a tu servidor cuando ocurre algo. ¿Cómo se llama?', ['Webhook', 'Sondeo', 'Keepalive', 'DHCP'], 'Empuje entre servidores usando HTTP.', { c: 'io_push', h: 'Es un «gancho» que salta con el evento.' }),
  I('<b>Resumen</b>\n· Sondeo: 86 400 / T peticiones al día y hasta T de retraso.\n· Empuje: avisa quien tiene el dato, al instante.\n· WebSocket para navegadores, webhook entre servicios y MQTT entre máquinas.')
 ]),
 L('io15', 'Publicar y suscribir: el broker', 'cloud', ['io_pubsub', 'io_mqttesp', 'io_datavol'], [
  Q('Un sensor de temperatura y tres pantallas que quieren su dato. Con MQTT, ¿cuántas veces crees que envía el sensor cada lectura?', ['Una: el broker hace las copias', 'Tres, una por pantalla', 'Ninguna: las pantallas leen el sensor directamente', 'Depende del WiFi'], 'El sensor publica una vez y el broker la reparte a todos los interesados. El sensor ni siquiera sabe cuántos son.', { predict: true, c: 'io_pubsub', h: 'Piensa en el broker como un cartero con una lista de interesados.' }),
  { t: 'explore', text: 'Un nodo publica en un tema; el broker lo entrega a los clientes suscritos a ese tema (en verde). Tú eres el último cliente.', viz: 'io_mqtt', params: PP.mqtt0(),
    tasks: [
      { q: 'tu', min: 1, max: 1, text: 'Haz que te llegue el mensaje', done: 'Te llega porque tu suscripción coincide con el tema publicado.', hint: 'Iguala tu suscripción al tema que se publica.' },
      { q: 'entregas', min: 3, max: 3, text: 'Consigue que el broker entregue el mismo mensaje a 3 clientes', done: 'El nodo publicó una sola vez; el broker hizo las tres entregas.', hint: 'Publica en casa/salon/temperatura y suscríbete a él.' }
    ] },
  I('<b>MQTT</b> es un protocolo ligero de publicación y suscripción sobre TCP (puerto 1883). Hay un servidor central, el <b>broker</b> (por ejemplo, Mosquitto en una Raspberry Pi), y muchos <b>clientes</b>: nodos, paneles, automatizaciones.', { svg: FLOW(['Nodo', 'Broker', 'Panel', 'Base de datos', 'Automatización'], 'todos los clientes hablan solo con el broker') }),
  I('Un cliente <b>publica</b> un mensaje en un <b>tema</b> (casa/salon/temperatura). El broker lo entrega a todos los clientes <b>suscritos</b> a ese tema. Quien publica y quien lee no se conocen: añadir un lector no obliga a tocar el sensor.', { svg: VS({ t: 'Publicador', l: ['publica en un tema', 'no sabe quién lee', 'lo hace una vez'], c: 'var(--led)' }, { t: 'Suscriptor', l: ['se apunta a temas', 'no sabe quién escribe', 'recibe al momento'], c: 'var(--ok)' }) }),
  I('El mensaje lleva un tema y una <b>carga</b> (payload): bytes que el broker no interpreta. Puede ser un número en texto, un JSON o binario; es un acuerdo entre quien publica y quien lee.', { code: '#include <PubSubClient.h>\n\nmqtt.setBufferSize(512);   // por defecto: 256 bytes\nmqtt.publish("casa/salon/temperatura", "21.4");\nmqtt.publish("casa/salon/estado", "{\\"t\\":21.4,\\"h\\":48}");', more: 'El protocolo admite cargas de hasta 256 MB, pero en un ESP32 piensa en cientos de bytes. PubSubClient, la librería más usada con Arduino, trae un búfer de 256 bytes (cabecera y tema incluidos): un mensaje mayor no sale y publish() devuelve false.' }),
  I('Todos los clientes abren la conexión <b>hacia</b> el broker y se presentan con un <b>identificador de cliente</b> único. Si dos usan el mismo, el broker echa al primero; si los dos reconectan sin parar, se expulsan el uno al otro.', { svg: CHK([['salon-a4cf12: conectado', 1], ['cocina-7b2e01: conectado', 1], ['nodo (repetido): expulsa al otro', 0], ['Truco: añade la MAC al identificador', 2]], 'Identificadores de cliente') }),
  { t: 'steps', text: 'El nodo del salón publica 21,4 en casa/salon/temperatura. ¿Qué pasa?', steps: ['El nodo ya tiene abierta una conexión TCP con el broker, con su identificador.', 'Envía un mensaje PUBLISH: tema casa/salon/temperatura, carga «21.4».', 'El broker busca en su lista qué clientes están suscritos a ese tema.', 'Les reenvía el mensaje a cada uno: el panel lo dibuja y la base de datos lo guarda.'], result: 'Una publicación, tantas entregas como suscriptores.' },
  { t: 'order', q: 'Ordena lo que pasa cuando el nodo del salón publica.', items: ['El nodo abre una conexión TCP con el broker y se identifica', 'Publica 21,4 en casa/salon/temperatura', 'El broker busca qué clientes están suscritos a ese tema', 'Les reenvía el mensaje', 'El panel lo muestra'], e: 'El broker es el cartero.', c: 'io_pubsub', h: 'Sin conexión no hay publicación, y sin lista de suscritos no hay reparto.' },
  Q('¿Quién decide a quién llega un mensaje MQTT?', ['El broker, según las suscripciones', 'El nodo que publica', 'El router', 'El DNS'], 'El publicador no sabe quién escucha.', { c: 'io_pubsub', h: '¿Quién tiene la lista de suscripciones?' }),
  Q('Quieres que una tablet también vea la temperatura. ¿Qué tocas?', ['Nada en el nodo: la tablet se suscribe al tema', 'Reprogramar el nodo con la IP de la tablet', 'Añadir otro broker', 'Abrir un puerto en el router'], 'Desacoplamiento.', { c: 'io_pubsub', h: '¿Sabe el nodo quién lee sus mensajes?' }),
  Q('Un JSON de 400 bytes no sale del ESP32 con PubSubClient: publish() devuelve false. ¿Causa probable?', ['El búfer por defecto, de 256 bytes, se queda corto', 'El broker no admite JSON', 'El tema es demasiado corto', 'Falta abrir un puerto'], 'mqtt.setBufferSize(512) lo arregla.', { c: 'io_mqttesp', h: 'Compara el tamaño del mensaje con el búfer de la librería.' }),
  Q('Dos nodos se desconectan y reconectan cada pocos segundos. ¿Qué revisas primero?', ['Que no compartan identificador de cliente', 'El canal WiFi', 'La máscara', 'El tamaño del JSON'], 'Usa la MAC o un nombre único en el identificador.', { c: 'io_mqttesp', h: '¿Qué hace el broker si llegan dos clientes con el mismo nombre?' }),
  { t: 'match', q: 'Une cada pieza de MQTT con su papel.', pairs: [['Broker', 'Recibe y reparte mensajes'], ['Tema', 'Dirección del mensaje'], ['Carga', 'El contenido, en bytes'], ['Identificador de cliente', 'Nombre único de cada conexión']], c: 'io_pubsub', h: 'Quién reparte, a dónde va, qué lleva y quién es cada uno.' },
  G('io_dataMonth'),
  I('<b>Resumen</b>\n· MQTT: los clientes publican en temas y se suscriben a temas; el broker reparte.\n· Quien publica no sabe quién lee: añadir lectores no toca el nodo.\n· La carga son bytes (texto, JSON o binario); ojo al búfer de 256 bytes de PubSubClient.\n· Un identificador de cliente único por conexión.')
 ]),
 L('io16', 'Temas bien diseñados y comodines', 'cloud', ['io_topics'], [
  Q('Quieres recibir la temperatura de todas las habitaciones con una sola suscripción. ¿Crees que se puede?', ['Sí, con un comodín en el nivel de la habitación', 'No: hace falta una suscripción por habitación', 'Solo si todas publican en el mismo tema', 'Solo reprogramando los sensores'], 'Las suscripciones admiten comodines que valen por uno o por varios niveles del tema.', { predict: true, c: 'io_topics', h: 'Los temas tienen niveles separados por /.' }),
  { t: 'explore', text: 'Ahora los suscriptores usan comodines. Cambia el tema publicado y tu suscripción, y mira a quién llega.', viz: 'io_mqtt', params: PP.mqtt1(),
    tasks: [
      { q: 'tuMas', min: 1, max: 1, text: 'Con una suscripción que use +, recibe el tema publicado', done: '+ ocupa exactamente un nivel.', hint: 'Publica un tema de tres niveles, como casa/salon/temperatura.' },
      { q: 'hondo', min: 1, max: 1, text: 'Recibe casa/salon/sensor1/temperatura usando #', done: '# vale por todos los niveles que queden.', hint: 'Publica casa/salon/sensor1/temperatura.' },
      { q: 'invalido', min: 1, max: 1, text: 'Prueba la suscripción casa/#/temperatura', done: 'No es válida: # solo puede ir al final.', hint: 'Elige la suscripción casa/#/temperatura.' },
      { q: 'sysNo', min: 1, max: 1, text: 'Publica en $SYS/broker/uptime y suscríbete a #', done: 'Los temas que empiezan por $ no entran con un comodín al principio.' }
    ] },
  I('Un <b>tema</b> es una cadena con niveles separados por /. No hay que crearlo: existe en cuanto alguien publica en él. Distingue mayúsculas (Casa no es casa) y no debería empezar por / (crearía un nivel vacío).', { code: 'casa/salon/temperatura\n└1─┘ └─2─┘ └────3────┘   tres niveles' }),
  I('Diseño recomendado: de lo general a lo concreto, en minúsculas, sin acentos ni espacios, y separando datos de órdenes. Así los comodines y los permisos encajan solos.', { code: 'casa/salon/clima/estado       telemetría\ncasa/salon/clima/disponible   online / offline\ncasa/salon/clima/cmd          órdenes' }),
  I('Al <b>suscribirse</b> se usan comodines: <b>+</b> sustituye exactamente un nivel; <b>#</b> sustituye todos los que quedan (incluso ninguno) y va siempre al final. Al <b>publicar</b> no se usan comodines.', { code: 'casa/+/temperatura   ✓ casa/cocina/temperatura\n                     ✗ casa/salon/sensor1/temperatura\ncasa/salon/#         ✓ casa/salon\n                     ✓ casa/salon/luz/estado\ncasa/#/temperatura   ✗ no válida: # va al final' }),
  I('Tres detalles que muerden:', { svg: CHK([['Casa/salon no es casa/salon', 0], ['/casa crea un primer nivel vacío', 0], ['$SYS/… no entra con # ni con +/…', 0], ['Para verlos: suscríbete a $SYS/#', 1]], 'Letra pequeña'), more: 'Los temas que empiezan por $ son del broker: $SYS/… publica estadísticas como clientes conectados, mensajes por segundo o memoria usada.' }),
  { t: 'steps', text: '¿Recibe la suscripción huerto/+/humedad el tema huerto/bancal3/sonda/humedad?', steps: ['Parte los dos por las barras: [huerto, +, humedad] y [huerto, bancal3, sonda, humedad].', 'Nivel 1: huerto = huerto ✓.', 'Nivel 2: + acepta bancal3 ✓.', 'Nivel 3: humedad frente a sonda ✗. Además, al tema le sobra un nivel y no hay #.'], result: 'No le llega. Con huerto/+/+/humedad o huerto/# sí le llegaría.' },
  Q('Suscrito a casa/+/temperatura. ¿Recibe casa/salon/sensor1/temperatura?', ['No: + es exactamente un nivel', 'Sí', 'Solo si es el primer mensaje', 'Solo si el tema es corto'], 'Ahí hay dos niveles entre casa y temperatura.', { c: 'io_topics', h: 'Cuenta los niveles que hay entre casa y temperatura.' }),
  Q('Suscrito a casa/salon/#. ¿Recibe casa/salon?', ['Sí: # incluye también el nivel padre', 'No', 'Solo con +', 'Solo si el broker lo permite'], '# puede valer cero niveles.', { c: 'io_topics', h: '¿Cuántos niveles puede sustituir # como mínimo?' }),
  G('io_topicMatch'),
  Q('¿Qué tema está mejor diseñado?', ['casa/cocina/nevera/estado', '/Casa Cocina/Nevera', 'nevera_cocina_casa_temperatura', 'casa/cocina/nevera/Temperatura Ahora'], 'Jerárquico, en minúsculas, sin espacios ni barra inicial.', { c: 'io_topics', h: 'De lo general a lo concreto, en minúsculas y sin espacios.' }),
  { t: 'match', q: 'Une cada suscripción con lo que recibe.', pairs: [['casa/+/temperatura', 'La temperatura de cada habitación'], ['casa/salon/#', 'Todo lo del salón'], ['+/+/bateria', 'Baterías en temas de tres niveles'], ['casa/#', 'Toda la casa']], c: 'io_topics', h: '+ es un nivel; # es «todo lo que quede».' },
  G('io_topicMatch'),
  Q('¿Es válida la suscripción casa/#/temperatura?', ['No: # solo puede ir al final', 'Sí', 'Solo en MQTT 5', 'Solo si hay pocos temas'], 'El broker la rechaza.', { c: 'io_topics', h: '¿Dónde puede ir #?' }),
  G('io_topicMatch'),
  I('<b>Resumen</b>\n· Tema: niveles separados por /, en minúsculas, de lo general a lo concreto.\n· + = exactamente un nivel; # = el resto (incluso nada), solo al final.\n· Distinguen mayúsculas; los $… no entran con un comodín inicial.')
 ]),
 L('io17', 'QoS 0, 1 y 2', 'cloud', ['io_qos', 'io_qoslib'], [
  Q('La red pierde algún paquete de vez en cuando y publicas con la opción más sencilla de MQTT. ¿Qué crees que pasa con lo que se pierde?', ['Se pierde: nadie lo reenvía', 'El broker lo reenvía siempre', 'Llega dos veces', 'El nodo se reinicia'], 'MQTT tiene tres niveles de garantía (QoS). El más sencillo envía y se olvida.', { predict: true, c: 'io_qos', h: 'Piensa en una postal: ¿te avisa alguien si se pierde?' }),
  { t: 'explore', text: 'Veinte mensajes por una red con pérdidas. Elige la QoS y mira qué llega, qué se repite y cuántos paquetes cuesta.', viz: 'io_qos', params: PP.qos(),
    tasks: [
      { q: 'perdidos', min: 1, max: 20, text: 'Con QoS 0, sube las pérdidas hasta que falten mensajes', done: 'QoS 0: como mucho una vez. Lo perdido, perdido.', hint: 'Sube las pérdidas al 10 % o más.' },
      { q: 'dupSinPerd', min: 1, max: 1, text: 'Sin bajar las pérdidas, consigue que no se pierda ninguno (aunque alguno llegue repetido)', done: 'QoS 1: confirma y reenvía; si se pierde la confirmación, duplica.', hint: 'Prueba QoS 1.' },
      { q: 'exacto', min: 1, max: 1, text: 'Ahora que cada uno llegue exactamente una vez', done: 'QoS 2: ni pérdidas ni duplicados… a cambio de muchos más paquetes.' }
    ] },
  I('Tres niveles de calidad de servicio (<b>QoS</b>), en cada tramo:', { code: 'QoS 0  como mucho una vez     PUBLISH →\nQoS 1  al menos una vez      PUBLISH →   ← PUBACK\nQoS 2  exactamente una vez   PUBLISH →   ← PUBREC\n                             PUBREL  →   ← PUBCOMP' }),
  I('¿Por qué QoS 1 puede duplicar? El emisor no distingue entre «se perdió mi mensaje» y «se perdió la confirmación». En los dos casos, reenvía.', { svg: FLOW(['PUBLISH llega', 'PUBACK se pierde', 'Emisor reenvía', 'Llega dos veces'], 'al menos una vez… quizá más') }),
  I('La QoS se negocia por <b>tramos</b>: del publicador al broker y del broker a cada suscriptor. Hacia cada suscriptor manda la <b>menor</b> entre la de publicación y la de su suscripción.', { code: 'nodo ──QoS 2──▶ broker ──QoS 1──▶ panel (suscrito con QoS 1)\n\nQoS hacia el panel = mín(2, 1) = 1' }),
  I('Más QoS no siempre es mejor: cuesta mensajes, memoria y tiempo de radio. Pregúntate qué pasa si un mensaje se pierde o se repite.', { svg: CHK([['Temperatura cada minuto: QoS 0', 1], ['Orden o alarma: QoS 1 y mensaje idempotente', 1], ['QoS 2: rara vez compensa', 2]], 'Elegir QoS'), more: 'Ojo con las librerías: PubSubClient, la más común con Arduino, solo publica con QoS 0 (aunque puede suscribirse con QoS 1). Para publicar con QoS 1 en el ESP32, usa el cliente MQTT de ESP-IDF (esp-mqtt) u otra librería que lo admita.' }),
  { t: 'steps', text: 'La orden «abre la válvula 5 minutos más» va con QoS 1 y llega dos veces. ¿Qué pasa y cómo se arregla?', steps: ['Primera copia: la válvula abre y cuenta 5 minutos.', 'La segunda llega 2 s después: «5 minutos más»… ¡casi 10 minutos de riego!', 'Arreglo: enviar el <b>estado deseado</b>, por ejemplo {"abierta_hasta":"10:05"}, o un identificador de orden que el nodo recuerde.', 'Así la orden es idempotente, como un PUT: repetirla no cambia nada.'], result: 'QoS 1 + mensajes idempotentes = fiable y sin sustos.' },
  { t: 'match', q: 'Une cada QoS con su garantía.', pairs: [['QoS 0', 'Como mucho una vez'], ['QoS 1', 'Al menos una vez, quizá repetido'], ['QoS 2', 'Exactamente una vez']], c: 'io_qos', h: 'Recuerda lo que viste en la exploración con pérdidas.' },
  Q('Con QoS 1, ¿por qué puede llegar un mensaje dos veces?', ['Si se pierde la confirmación, el emisor reenvía un mensaje que sí había llegado', 'Por un fallo del broker', 'Porque QoS 1 manda siempre dos copias', 'No puede'], 'El emisor no sabe si se perdió el mensaje o la confirmación.', { c: 'io_qos', h: '¿Qué ve el emisor cuando no le llega el PUBACK?' }),
  Q('Publicas con QoS 2 y un panel se suscribió con QoS 1. ¿Con qué QoS le llega?', ['QoS 1', 'QoS 2', 'QoS 0', 'QoS 3'], 'Manda la menor.', { c: 'io_qos', h: 'Hacia cada suscriptor manda el mínimo de las dos.' }),
  Q('Telemetría de temperatura cada 30 s. ¿QoS razonable?', ['0', '2', '1 con sesión persistente siempre', 'Siempre 2, da igual'], 'La siguiente lectura llega en 30 s.', { c: 'io_qos', h: '¿Qué pierdes si falta una lectura entre cientos?' }),
  Q('Una orden «abre la válvula» importante. ¿Qué es lo más robusto?', ['QoS 1 y una orden idempotente (con identificador o con el estado deseado)', 'QoS 0', 'Enviarla tres veces con QoS 0', 'QoS 2 y no pensar más'], 'Con QoS 1 puede llegar dos veces: que no importe.', { c: 'io_qos', h: 'Que llegue seguro, y que repetirla no haga daño.' }),
  Q('Necesitas que un ESP32 publique alarmas con QoS 1. ¿Qué haces?', ['Usar un cliente que lo admita, como esp-mqtt de ESP-IDF', 'Pasar un 1 a publish() de PubSubClient', 'Subir el tamaño del búfer', 'Usar un tema más corto'], 'Lee siempre qué QoS admite tu librería.', { c: 'io_qoslib', h: '¿Con qué QoS publica PubSubClient?' }),
  Q('¿Con qué QoS publicas cada minuto el total acumulado de kWh (no el incremento)?', ['0 o 1: el total es idempotente y un duplicado no estropea nada', 'Siempre 2', 'Ninguno', 'Depende del tema'], 'Enviar el estado, no el cambio, simplifica la fiabilidad.', { c: 'io_qos', h: 'Si el total llega repetido, ¿cambia algo?' }),
  I('<b>Resumen</b>\n· QoS 0: como mucho una vez. QoS 1: al menos una vez (puede duplicar). QoS 2: exactamente una vez, con 4 mensajes.\n· Hacia cada suscriptor manda la menor QoS.\n· Telemetría: 0. Órdenes: 1 con mensajes idempotentes.\n· Comprueba qué QoS admite tu librería.')
 ]),
 L('io18', 'Mensajes retenidos', 'cloud', ['io_retain'], [
  Q('La puerta pasó a «cerrada» a las 7:00 y no ha cambiado. Abres el panel a las 10:00. Con lo que sabes de MQTT, ¿qué crees que ve?', ['Nada, hasta que la puerta vuelva a cambiar', '«cerrada» al instante', 'Todos los cambios desde las 7:00', 'Un error'], 'Un mensaje normal se entrega a quien esté suscrito en ese momento, y el broker lo olvida. Para que un recién llegado vea el último estado existen los retenidos.', { predict: true, c: 'io_retain', h: '¿Guarda el broker los mensajes ya repartidos?' }),
  { t: 'explore', text: 'A las 7:00 la puerta publica «cerrada». Más tarde se conecta el panel. Mira qué tiene guardado el broker.', viz: 'io_retain', params: PP.retain(),
    tasks: [
      { q: 've', min: 1, max: 1, text: 'Haz que el panel, aunque llegue tarde, vea «cerrada» al conectarse', done: 'El retenido se guarda como último valor del tema y se entrega a cada nuevo suscriptor.', hint: 'Publica como retenido.' },
      { q: 'borrado', min: 1, max: 1, text: 'Ahora borra el retenido antes de que llegue el panel', done: 'Un retenido vacío en el mismo tema borra el que había.' }
    ] },
  I('Un mensaje <b>retenido</b> se queda guardado en el broker como último valor de su tema. Cada cliente que se suscriba después lo recibe al instante.', { svg: VS({ t: 'Normal', l: ['se reparte y se olvida', 'quien llega tarde', 'no ve nada'] }, { t: 'Retenido', l: ['se reparte y se guarda', 'quien llega tarde', 've el último valor'], c: 'var(--ok)' }) }),
  I('Solo hay <b>uno por tema</b>: un retenido nuevo sustituye al anterior y uno con la carga <b>vacía</b> lo borra. Con la herramienta mosquitto_pub (del PC) se ve claro:', { code: 'mosquitto_pub -t casa/puerta -m cerrada -r   # guarda\nmosquitto_pub -t casa/puerta -m abierta -r   # sustituye\nmosquitto_pub -t casa/puerta -n -r           # borra (carga vacía)', more: 'mosquitto_pub y mosquitto_sub son herramientas de línea de comandos para publicar y suscribirse desde un PC. -t es el tema, -m el mensaje, -r lo marca como retenido y -n envía una carga vacía.' }),
  I('Retén <b>estados</b> (cómo está algo ahora), no <b>eventos</b> (algo que pasó una vez). Un evento retenido se entregaría a cada suscriptor nuevo: el móvil «oiría el timbre» cada vez que abres la app.', { svg: VS({ t: 'Estados: retenidos', l: ['puerta cerrada', 'persiana al 40 %', 'nodo online'], c: 'var(--ok)' }, { t: 'Eventos: normales', l: ['han llamado al timbre', 'botón pulsado', 'pulso del contador'], c: 'var(--err)' }) }),
  I('En el ESP32 con PubSubClient, el tercer parámetro de publish() marca el retenido:', { code: 'mqtt.publish("casa/salon/persiana/estado", "40", true);   // retenido\nmqtt.publish("casa/timbre/pulsado", "1");                // evento, normal' }),
  { t: 'steps', text: 'Diseña los mensajes de un timbre conectado.', steps: ['casa/timbre/disponible: «online» u «offline» → es un estado → <b>retenido</b>.', 'casa/timbre/bateria: «3.9» → es un estado → <b>retenido</b>.', 'casa/timbre/pulsado: cada pulsación → es un evento → <b>normal</b>.', 'Un panel que se conecta ve al momento si el timbre está vivo y su batería, pero no «oye» timbrazos antiguos.'], result: 'Estados retenidos, eventos normales.' },
  Q('El panel arranca a las 10:00. La puerta pasó a «cerrada» a las 7:00 con un mensaje retenido. ¿Qué ve?', ['«cerrada», nada más suscribirse', 'Nada hasta el próximo cambio', 'Todos los cambios desde las 7:00', 'Un error'], 'El retenido es el último estado conocido.', { c: 'io_retain', h: '¿Qué guarda el broker de un mensaje retenido?' }),
  Q('¿Cómo se borra un retenido?', ['Publicando en ese tema un mensaje retenido vacío', 'Reiniciando el nodo', 'Publicando un mensaje normal', 'No se puede'], 'Carga vacía + retenido = borrar.', { c: 'io_retain', h: 'Recuerda la opción -n de mosquitto_pub.' }),
  Q('¿Qué publicarías como retenido?', ['El estado actual de la persiana', 'La pulsación del timbre', 'Cada pulso del contador de luz', 'Un aviso de fuga ya resuelto'], 'Estados sí; eventos, no.', { c: 'io_retain', h: '¿Cuál describe cómo está algo ahora?' }),
  Q('Publicas un retenido nuevo en un tema que ya tenía uno. ¿Qué pasa con el viejo?', ['Lo sustituye: solo hay uno por tema', 'Se guardan los dos', 'Se ignora el nuevo', 'Se duplica el tema'], 'Un retenido por tema: el último.', { c: 'io_retain', h: '¿Cuántos retenidos puede tener un tema?' }),
  Q('¿Qué NO publicarías como retenido?', ['«Se ha pulsado el botón de emergencia»', '«La calefacción está encendida»', '«El nodo está online»', '«La persiana está al 40 %»'], 'Es un evento: se repetiría a cada suscriptor nuevo.', { c: 'io_retain', h: 'Busca el que describe algo que pasó una vez.' }),
  Q('¿Qué hace el true de esta línea?', ['Marca el mensaje como retenido', 'Pide QoS 1', 'Borra el tema', 'Cifra la carga'], 'El tercer parámetro de publish() es el retenido.', { code: 'mqtt.publish("casa/garaje/puerta", "cerrada", true);', c: 'io_retain', h: 'Repasa el código de PubSubClient de esta lección.' }),
  I('<b>Resumen</b>\n· Retenido = último valor del tema, guardado en el broker y entregado a cada nuevo suscriptor.\n· Uno por tema; un retenido vacío lo borra.\n· Retén estados, no eventos.')
 ]),
 L('io40', 'Último testamento, keepalive y sesiones', 'cloud', ['io_lwt'], [
  Q('Un nodo se queda sin luz de golpe y no puede avisar de nada. ¿Crees que el panel puede llegar a saber que ha muerto?', ['Sí: el broker puede avisar en su nombre', 'No, nunca', 'Solo si el nodo tenía batería', 'Solo reiniciando el broker'], 'Al conectarse, el nodo deja al broker un mensaje para publicar si desaparece sin despedirse: su último testamento.', { predict: true, c: 'io_lwt', h: '¿Quién se da cuenta de que el nodo ha dejado de hablar?' }),
  { t: 'explore', text: 'El nodo se queda sin luz a los 20 s. Mira cuándo se da cuenta el broker y qué publica.', viz: 'io_lwt', params: PP.lwt(),
    tasks: [
      { q: 'rapido', min: 1, max: 1, text: 'Consigue que el broker lo dé por muerto en 30 s o menos', done: 'Con keepalive corto se detecta antes… a cambio de más pings.', hint: 'Baja el keepalive.' },
      { q: 'sinTest', min: 1, max: 1, text: 'Haz que el nodo se despida limpiamente', done: 'Con DISCONNECT, el broker no publica el testamento.' }
    ] },
  I('El <b>último testamento</b> (LWT) se registra al conectar: tema, mensaje, QoS y si es retenido. Si el cliente desaparece sin despedirse (corte de luz, cuelgue, pérdida de WiFi), el broker lo publica en su nombre.', { code: '// connect(id, usuario, clave, temaTestamento, qos, retenido, mensaje)\nmqtt.connect("salon-a4cf12", USR, PASS,\n             "casa/salon/disponible", 1, true, "offline");\nmqtt.publish("casa/salon/disponible", "online", true);' }),
  I('¿Cómo sabe el broker que el cliente ha desaparecido? Por el <b>keepalive</b>: el máximo silencio permitido. Si el cliente no tiene nada que enviar, manda un ping (PINGREQ). Si el broker no oye nada en <b>1,5 veces</b> el keepalive, lo da por muerto.', { svg: TLINE([[0, 'ping', 'var(--ok)'], [0.25, 'ping', 'var(--ok)'], [0.45, 'corte', 'var(--err)'], [0.83, '1,5 × keepalive', 'var(--led)']], '0 s', 'el broker publica «offline»') }),
  I('El patrón de disponibilidad que usan muchas plataformas:', { svg: FLOW(['Testamento «offline»', '«online» retenido', 'Funciona', 'Corte', 'Broker: «offline»'], 'un panel siempre sabe si el nodo vive') }),
  I('Una <b>sesión persistente</b> hace que el broker recuerde las suscripciones del cliente y le guarde los mensajes QoS 1 y 2 mientras está desconectado. Va ligada al identificador de cliente.', { svg: VS({ t: 'Sesión limpia', l: ['al volver, de cero', 'lo enviado mientras', 'estaba fuera se pierde'] }, { t: 'Sesión persistente', l: ['mismo identificador', 'el broker guarda la cola', 'QoS 1 y 2 al volver'], c: 'var(--ok)' }), more: 'En MQTT 3.1.1 se pide con clean session a 0; en MQTT 5, con Clean Start a 0 y una caducidad de sesión. Útil para un actuador que se reinicia y no debe perder órdenes.' }),
  { t: 'steps', text: 'Keepalive de 60 s. El nodo hizo su último ping a las 12:00:00 y a las 12:00:10 se va la luz. ¿Cuándo publica el broker «offline» como muy tarde?', steps: ['El broker cuenta desde lo último que oyó: 12:00:00.', 'Margen: 1,5 × 60 s = <b>90 s</b>.', 'Si en ese tiempo no oye nada, lo da por muerto: 12:01:30.'], result: 'Como muy tarde, a las 12:01:30: 90 s después del último contacto.' },
  { t: 'order', q: 'Ordena el patrón de disponibilidad de un nodo.', items: ['Al conectar, registra el testamento: disponible = «offline», retenido', 'Justo después publica disponible = «online», retenido', 'Funciona y publica sus datos', 'Se corta la luz', 'Pasado el margen del keepalive, el broker publica «offline»'], e: 'Muchas plataformas domóticas usan exactamente este patrón.', c: 'io_lwt', h: 'El testamento se deja al conectar, antes de nada.' },
  Nm('Keepalive de 60 s. ¿Cuántos segundos como mucho tarda el broker en publicar el testamento tras el último contacto?', 90, 's', '1,5 × 60.', { c: 'io_lwt', h: 'El margen del broker es 1,5 veces el keepalive.' }),
  Q('Un nodo de riego se reinicia durante 20 s y en ese tiempo le mandan una orden con QoS 1. ¿Qué necesita para recibirla al volver?', ['Sesión persistente, el mismo identificador de cliente y suscripción con QoS 1', 'Un retenido en el tema de estado', 'QoS 0', 'Un keepalive más largo'], 'El broker le guarda la cola.', { c: 'io_lwt', h: '¿Qué hace que el broker guarde mensajes para un cliente ausente?' }),
  Q('¿Qué se publica si el ESP32 llama a mqtt.disconnect() antes de dormir?', ['Nada: el testamento solo se usa si la desconexión no es limpia', 'El testamento', 'Un retenido vacío', '«online»'], 'Si quieres marcarlo como dormido, publícalo tú antes.', { c: 'io_lwt', h: 'Recuerda la exploración con DISCONNECT.' }),
  Q('Un nodo usa un identificador de cliente aleatorio en cada arranque. ¿Recibe las órdenes QoS 1 enviadas durante su reinicio?', ['No: para el broker es otro cliente, sin sesión', 'Sí, siempre', 'Sí, si el tema es retenido', 'Solo con un keepalive largo'], 'La sesión va ligada al identificador.', { c: 'io_lwt', h: '¿Cómo reconoce el broker a un cliente que vuelve?' }),
  Q('Para que un panel que se conecta más tarde vea el «offline» del testamento, ¿cómo lo registras?', ['Como retenido', 'Con QoS 0', 'Sin tema', 'Con keepalive 0'], 'Como cualquier estado: retenido.', { c: 'io_lwt', h: '«Offline» es un estado, no un evento.' }),
  I('<b>Resumen</b>\n· Testamento: lo publica el broker si el cliente desaparece sin despedirse.\n· El broker espera 1,5 × keepalive de silencio.\n· Patrón: testamento «offline» retenido + «online» retenido al conectar.\n· Sesión persistente: mismo identificador; el broker guarda lo QoS 1 y 2.')
 ]),
 L('io19', 'MQTT en el ESP32 y en Mosquitto', 'shield', ['io_mqttesp', 'io_mosquitto'], [
  Q('Instalas Mosquitto 2 en una Raspberry Pi sin tocar la configuración. Un ESP32 intenta conectarse desde la red. ¿Qué crees que pasa?', ['Lo rechaza: por defecto solo acepta conexiones del propio equipo', 'Se conecta sin problema', 'Se conecta, pero sin poder publicar', 'La Pi se reinicia'], 'Desde la versión 2, Mosquitto es seguro por defecto: hay que abrirlo a la red a propósito, con usuarios.', { predict: true, c: 'io_mosquitto', h: 'Piensa en «seguro por defecto».' }),
  { t: 'explore', text: 'Esta es la lista de permisos (ACL) del broker. Elige usuario, tema y acción, y mira qué línea lo permite.', viz: 'io_acl', params: PP.acl(),
    tasks: [
      { q: 'denegado', min: 1, max: 1, text: 'Haz que «salon» intente publicar fuera de su zona', done: 'El broker lo descarta: salon solo escribe bajo casa/salon/.', hint: 'Prueba un tema de la cocina.' },
      { q: 'panelOrden', min: 1, max: 1, text: 'Consigue que el panel mande una orden a la luz de la cocina', done: 'La regla topic write casa/+/+/cmd lo permite.' },
      { q: 'cocinaLeeSalon', min: 1, max: 1, text: 'Comprueba si «cocina» puede leer las órdenes del salón', done: 'No: cada nodo solo lee sus propias órdenes.' }
    ] },
  I('En el ESP32 con Arduino: PubSubClient sobre WiFiClient. El patrón: servidor y función de recepción en setup(), reconexión si se cae y mqtt.loop() a menudo.', { code: '#include <WiFi.h>\n#include <PubSubClient.h>\n\nWiFiClient red;\nPubSubClient mqtt(red);\n\nvoid setup() {\n  // ... conectar el WiFi ...\n  mqtt.setServer("broker.local", 1883);\n  mqtt.setCallback(alRecibir);\n  mqtt.setKeepAlive(30);\n}\n\nvoid loop() {\n  if (!mqtt.connected()) reconectar();   // y volver a suscribirse\n  mqtt.loop();                           // entradas y keepalive\n}' }),
  I('La función de recepción recibe el tema y la carga como <b>bytes con su longitud</b>, sin el 0 final de las cadenas de C. Cópiala y termínala tú.', { code: 'void alRecibir(char* tema, byte* carga, unsigned int len) {\n  char txt[64];\n  len = min(len, sizeof(txt) - 1);\n  memcpy(txt, carga, len);\n  txt[len] = 0;                 // ahora sí es una cadena\n  if (strcmp(tema, "casa/salon/luz/cmd") == 0) obedecer(txt);\n}' }),
  I('En el broker, <b>Mosquitto</b>: defines un listener, prohíbes los anónimos y creas usuarios con mosquitto_passwd.', { code: '# /etc/mosquitto/conf.d/casa.conf\nlistener 1883\nallow_anonymous false\npassword_file /etc/mosquitto/passwd\nacl_file /etc/mosquitto/acl' }),
  I('Con una <b>ACL</b> limitas qué lee y escribe cada usuario. Con pattern y %u (el nombre de usuario) escribes una regla para todos los nodos: cada uno solo escribe bajo su nombre.', { code: '# /etc/mosquitto/acl\nuser panel\ntopic read casa/#\ntopic write casa/+/+/cmd\n\npattern write casa/%u/#\npattern read casa/%u/+/cmd', more: 'Para cifrar, el broker escucha también en el 8883 con un certificado, y el ESP32 usa WiFiClientSecure. Cómo funcionan los certificados y por qué setInsecure() no basta lo verás en el módulo de seguridad.' }),
  { t: 'steps', text: 'Prepara el broker para dos nodos (salon y cocina) y un panel.', steps: ['En casa.conf: listener 1883 y allow_anonymous false.', 'sudo mosquitto_passwd -c /etc/mosquitto/passwd salon (-c crea el archivo); luego, sin -c, cocina y panel.', 'ACL: el panel lee casa/# y escribe órdenes; cada nodo, solo lo suyo con pattern y %u.', 'Reinicia Mosquitto y comprueba: mosquitto_sub -v -t "casa/#" -u panel -P tu_clave.'], result: 'Nadie anónimo, cada nodo en su zona y el panel viéndolo todo.' },
  Q('¿Qué pasa si no llamas a mqtt.loop()?', ['No se procesan los mensajes entrantes ni el keepalive, y el broker acaba desconectándote', 'Nada', 'Se publica más rápido', 'Se borra la sesión'], 'loop() mantiene viva la conexión.', { c: 'io_mqttesp', h: '¿Quién envía los pings del keepalive?' }),
  Q('¿Qué error típico hay en esta función?', ['Trata la carga como una cadena, pero no acaba en 0', 'Ninguno', 'Que el tema sea char*', 'Que len sea unsigned'], 'Copia len bytes a un búfer y añade tú el 0 final.', { code: 'void alRecibir(char* tema, byte* carga, unsigned int len) {\n  Serial.println((char*)carga);\n}', c: 'io_mqttesp', h: '¿Dónde termina la carga según println?' }),
  Q('Has creado usuarios, pero todavía se conecta cualquiera sin contraseña. ¿Qué falta?', ['allow_anonymous false', 'Un listener en el 8883', 'Subir el keepalive', 'Un mensaje retenido'], 'Sin eso, los anónimos siguen entrando.', { c: 'io_mosquitto', h: 'Busca la línea que habla de anónimos.' }),
  Q('Con esa ACL, el usuario «salon» publica en casa/cocina/luz/cmd. ¿Qué pasa?', ['El broker lo descarta: salon solo puede escribir en casa/salon/…', 'Se entrega', 'Se entrega solo al panel', 'Se convierte en retenido'], 'Mínimo privilegio: un nodo comprometido no manda en toda la casa.', { c: 'io_mosquitto', h: 'Sustituye %u por salon en la regla pattern write.' }),
  { t: 'match', q: 'Une cada medida con lo que evita.', pairs: [['allow_anonymous false', 'Que se conecte cualquiera'], ['ACL por usuario', 'Que un nodo publique en temas ajenos'], ['Identificador de cliente único', 'Expulsiones mutuas'], ['Llamar a mqtt.loop()', 'Que el broker te dé por muerto']], c: 'io_mosquitto', h: 'Dos son del broker y dos del nodo.' },
  Q('¿Cómo compruebas desde el PC que llegan todos los mensajes de casa?', ['mosquitto_sub -v -t "casa/#" con tu usuario', 'Haciendo ping al broker', 'Abriendo el puerto 1883 en el router', 'mosquitto_pub sin tema'], '-v muestra el tema de cada mensaje.', { c: 'io_mosquitto', h: 'Necesitas suscribirte a todo lo que cuelga de casa.' }),
  I('<b>Resumen</b>\n· ESP32: setServer, setCallback, reconectar y mqtt.loop() a menudo; la carga no acaba en 0.\n· Mosquitto 2: listener, allow_anonymous false y usuarios con mosquitto_passwd.\n· ACL con pattern y %u: cada nodo, solo en lo suyo.')
 ]),
 PRJ('io-p5', 'Proyecto: monitor de CO₂ y ventilación', 'io_co2')
],
exam: [
  Nm('Quieres ver cada cambio en 10 s como mucho preguntando a una API (sondeo). ¿Cuántas peticiones al día haces como mínimo?', 8640, 'peticiones', 'El retraso máximo es el intervalo: T = 10 s. Peticiones al día: 86 400 / 10 = 8640.', { tol: 0, c: 'io_push', l: 'io14', h: 'El peor retraso del sondeo es su intervalo: fija T y divide el día entre él.' }),
  Q('¿Qué tiene de particular cómo empieza una conexión WebSocket?', ['Empieza como una petición HTTP y se mejora a un canal permanente en los dos sentidos', 'Usa siempre UDP', 'La abre el servidor hacia el navegador', 'Necesita un broker MQTT'], 'El navegador pide por HTTP y la conexión TCP se convierte en un canal abierto: así el servidor puede enviar cuando quiera.', { c: 'io_push', l: 'io14', h: 'Recuerda qué protocolo se usa al principio y en qué se convierte la conexión.' }),
  Q('Un nodo publica un mensaje normal (no retenido) en un tema al que no está suscrito nadie. ¿Qué pasa con él?', ['El broker no lo entrega a nadie y lo olvida', 'El broker lo guarda hasta que alguien se suscriba', 'El broker se lo devuelve al nodo', 'El nodo no puede publicarlo'], 'El broker reparte a los suscritos en ese momento. Sin suscriptores, no hay entregas. Para guardar el último valor existen los retenidos.', { c: 'io_pubsub', l: 'io15', h: '¿A quién reparte el broker un mensaje normal?' }),
  Q('En MQTT, ¿quién abre las conexiones TCP?', ['Cada cliente, hacia el broker', 'El broker, hacia cada cliente', 'El router, hacia el broker', 'El que publica, hacia cada suscriptor'], 'Todos los clientes conectan con el broker y mantienen la conexión. Por eso un nodo tras el NAT de casa puede recibir órdenes sin abrir puertos.', { c: 'io_pubsub', l: 'io15', h: 'Piensa en por qué un nodo detrás del NAT puede recibir mensajes.' }),
  Nm('Un nodo publica cada 15 s; con tema y cabecera, cada mensaje ocupa unos 30 bytes. ¿Cuántos bytes al día?', 172800, 'bytes', '86 400 / 15 = 5760 mensajes; 5760 × 30 = 172 800 bytes, unos 173 kB.', { tol: 1, c: 'io_datavol', l: 'io15', h: 'Mensajes del día por bytes de cada mensaje.' }),
  Q('Para que cada placa tenga un identificador de cliente único sin cambiar el código, ¿qué usas?', ['La MAC del chip dentro del identificador, por ejemplo «salon-a4cf12»', 'Siempre el mismo nombre, «nodo»', 'Un número al azar distinto en cada arranque', 'La IP del broker'], 'La MAC es única de fábrica. Un número al azar en cada arranque cambia de identidad y rompe las sesiones persistentes.', { c: 'io_mqttesp', l: 'io15', h: 'Busca algo que sea distinto en cada placa y no cambie al reiniciar.' }),
  Q('Con PubSubClient, un JSON de 300 bytes no sale: publish() devuelve false. ¿Qué llamada en setup() lo arregla?', ['mqtt.setBufferSize(512);', 'mqtt.setKeepAlive(512);', 'mqtt.setServer("broker.local", 512);', 'mqtt.setCallback(512);'], 'El búfer por defecto es de 256 bytes, cabecera y tema incluidos. setBufferSize lo amplía.', { c: 'io_mqttesp', l: 'io15', h: '¿Qué límite de PubSubClient tiene un tamaño por defecto de 256?' }),
  Q('Suscrito a +/sotano/#. ¿Qué tema recibe?', ['casa/sotano', 'casa/garaje/sotano', 'sotano/casa', 'casa/planta1/sotano/luz'], '+ vale exactamente un nivel (casa), luego debe venir sotano y # admite el resto, incluso nada. Los demás no tienen sotano en el segundo nivel.', { c: 'io_topics', l: 'io16', h: 'Parte cada tema por las barras y compara nivel a nivel.' }),
  Q('Temas casa/<sala>/<aparato>/estado y casa/<sala>/<aparato>/cmd. El panel debe recibir todos los estados, pero no las órdenes. ¿Qué suscripción?', ['casa/+/+/estado', 'casa/#', 'casa/#/estado', 'casa/+/estado'], 'Dos + para sala y aparato, y estado al final. casa/# también traería las órdenes; casa/#/estado no es válida (# va al final) y casa/+/estado tiene un nivel de menos.', { c: 'io_topics', l: 'io16', h: 'Cuenta los niveles del tema y pon un comodín de un nivel donde varía.' }),
  Q('Un nodo publica en Casa/Salon/temperatura y el panel está suscrito a casa/+/temperatura. ¿Por qué no le llega?', ['Los temas distinguen mayúsculas: Casa no es casa', 'Porque + no vale para el salón', 'Porque falta un # al final', 'Porque la temperatura debe ir en JSON'], 'Casa/Salon/temperatura y casa/salon/temperatura son temas distintos. Por eso se recomienda todo en minúsculas.', { c: 'io_topics', l: 'io16', h: 'Compara letra a letra el primer nivel de los dos.' }),
  Q('Suscrito a #, no ves $SYS/broker/clients/connected. ¿Por qué?', ['Los temas que empiezan por $ no entran con un comodín al principio: suscríbete a $SYS/#', 'El broker no publica estadísticas', '# solo vale un nivel', 'Hace falta QoS 2'], 'Los temas $… son del broker y quedan fuera de # y de +/… para no mezclarse con tus datos. Hay que pedirlos expresamente.', { c: 'io_topics', l: 'io16', h: 'Repasa la letra pequeña de los temas que empiezan por un símbolo.' }),
  Q('El nodo publica con QoS 1 y el panel se suscribió con QoS 0. ¿Qué garantía tiene el tramo del broker al panel?', ['Como mucho una vez (QoS 0)', 'Al menos una vez (QoS 1)', 'Exactamente una vez (QoS 2)', 'Ninguna: no le llega'], 'La QoS se negocia por tramos y hacia cada suscriptor manda la menor: mín(1, 0) = 0.', { c: 'io_qos', l: 'io17', h: 'Calcula el mínimo entre la QoS de publicación y la de la suscripción.' }),
  Nm('Sin pérdidas, ¿cuántos paquetes MQTT viajan en el tramo del nodo al broker para entregar 10 mensajes con QoS 2?', 40, 'paquetes', 'QoS 2 usa cuatro paquetes por mensaje: PUBLISH, PUBREC, PUBREL y PUBCOMP. 10 × 4 = 40. Con QoS 1 serían 20 y con QoS 0, 10.', { tol: 0, c: 'io_qos', l: 'io17', h: 'Cuenta los paquetes del intercambio de QoS 2 y multiplica.' }),
  Q('Un contador de agua publica «+1 litro» con QoS 1 en cada pulso. ¿Qué riesgo tiene y cómo se arregla?', ['Un duplicado suma un litro de más: mejor publicar el total acumulado', 'Ninguno: QoS 1 nunca duplica', 'Se pierden litros: hay que bajar a QoS 0', 'El broker se satura: hay que usar retenidos'], 'Con QoS 1, si se pierde la confirmación, el mensaje se reenvía y llega dos veces. Un total es idempotente: repetirlo no cambia nada.', { c: 'io_qos', l: 'io17', h: '¿Qué pasa si «suma uno» llega dos veces? ¿Y si llega dos veces «el total es 512»?' }),
  Q('Con PubSubClient llamas a mqtt.subscribe("casa/riego/cmd", 1). ¿Funciona?', ['Sí: PubSubClient puede suscribirse con QoS 1, aunque solo publica con QoS 0', 'No: PubSubClient solo admite QoS 0 en todo', 'Sí, y además publicará con QoS 1', 'No: QoS 1 solo existe en MQTT 5'], 'PubSubClient publica solo con QoS 0, pero puede suscribirse con QoS 1. Para publicar con QoS 1 hace falta otro cliente, como esp-mqtt.', { c: 'io_qoslib', l: 'io17', h: 'Distingue entre lo que la librería admite al publicar y al suscribirse.' }),
  Q('Publicas «40» retenido, luego «70» retenido y luego «90» normal, todo en casa/persiana/estado. Se conecta un panel nuevo. ¿Qué recibe al suscribirse?', ['«70»', '«90»', '«40»', 'Los tres, en orden'], 'Solo hay un retenido por tema: el «70» sustituyó al «40». Un mensaje normal no se guarda ni sustituye al retenido, así que el «90» no lo ve quien llega tarde.', { c: 'io_retain', l: 'io18', h: '¿Qué mensajes guarda el broker para los que llegan tarde, y cuántos por tema?' }),
  Q('Por error, publicas casa/alarma/disparo como retenido. ¿Qué pasa cada vez que alguien abre la app?', ['Recibe el disparo antiguo como si acabara de ocurrir', 'Nada: los retenidos caducan solos', 'La alarma se desactiva', 'El broker rechaza el mensaje'], 'Un evento retenido se entrega a cada suscriptor nuevo. Se arregla publicando un retenido vacío en ese tema y enviando los eventos como mensajes normales.', { c: 'io_retain', l: 'io18', h: '¿Qué reciben los nuevos suscriptores de un tema con retenido?' }),
  Nm('Un nodo usa setKeepAlive(40). ¿Cuántos segundos como mucho tras su último contacto tarda el broker en publicar su testamento?', 60, 's', 'El broker espera 1,5 veces el keepalive sin oír nada: 1,5 × 40 = 60 s.', { tol: 0, c: 'io_lwt', l: 'io40', h: 'Aplica el margen que da el broker sobre el keepalive.' }),
  TU('El panel debe marcar «offline» como mucho 45 s después del último contacto de un nodo, que no debe hacer pings de más. Elige el keepalive.', 'io_lwt', PP.lwt({ limpia: FX(0) }), { q: 'tarda', min: 40, max: 45, text: 'Objetivo: testamento en 45 s como mucho, con el keepalive más largo posible', hint: 'Divide el margen entre 1,5.' }, '45 / 1,5 = 30 s. Con 60 s tardaría 90 s; con 20 s cumpliría, pero con más pings de los necesarios.', { c: 'io_lwt', l: 'io40', h: 'El broker espera 1,5 veces el keepalive: despeja el keepalive.' }),
  Q('Un nodo registra un testamento «offline» retenido, pero nunca publica «online» al conectar. Tras un corte y su reconexión, ¿qué ve el panel?', ['Sigue viendo «offline», aunque el nodo haya vuelto', '«online», porque el broker lo cambia solo', 'Nada, el tema se borra', 'Un error de conexión'], 'El retenido «offline» se queda como último valor hasta que alguien publique otro. Por eso el patrón incluye publicar «online» retenido justo al conectar.', { c: 'io_lwt', l: 'io40', h: '¿Quién sustituye el retenido «offline» en ese diseño?' }),
  Q('El usuario «cocina» quiere leer casa/cocina/luz/cmd. Con esta ACL, ¿puede?', ['Sí: la regla pattern read con %u = cocina lo permite', 'No: solo el panel puede leer', 'Solo si el mensaje es retenido', 'No: pattern solo sirve para escribir'], '%u se sustituye por el nombre de usuario: para cocina, la regla queda read casa/cocina/+/cmd, y luz ocupa el +.', { c: 'io_mosquitto', l: 'io19', code: 'user panel\ntopic read casa/#\ntopic write casa/+/+/cmd\n\npattern write casa/%u/#\npattern read casa/%u/+/cmd', h: 'Sustituye %u por el usuario y compara el tema nivel a nivel.' }),
  Q('Instalas Mosquitto 2 y su configuración solo tiene allow_anonymous false y password_file. Los ESP32 de la red no logran conectar. ¿Qué falta?', ['Un listener, por ejemplo listener 1883, para escuchar en la red', 'Un mensaje retenido', 'Subir el keepalive', 'Activar UPnP en el router'], 'Sin listener, Mosquitto 2 solo acepta conexiones del propio equipo. Hay que abrirlo a la red a propósito.', { c: 'io_mosquitto', l: 'io19', h: 'Recuerda qué hace Mosquitto 2 por defecto con las conexiones que vienen de otros equipos.' }),
  { t: 'order', q: 'Ordena cómo das de alta a los usuarios de un broker nuevo y lo compruebas.', items: ['Crear el archivo de contraseñas con el primer usuario (mosquitto_passwd -c)', 'Añadir el resto de usuarios, ya sin -c', 'Reiniciar Mosquitto para que cargue los cambios', 'Comprobar con mosquitto_sub y el usuario del panel'], e: '-c crea el archivo (y lo sobrescribe): solo para el primero. Después, reiniciar y probar.', c: 'io_mosquitto', l: 'io19', h: '¿Qué opción crea el archivo, y qué pasaría si la usaras con cada usuario?' },
  Q('Con setKeepAlive(30), ¿qué le pasa a este nodo?', ['El broker lo desconecta: pasan unos 60 s sin oírle, más que 1,5 × 30 s', 'Nada: publica cada minuto', 'Recibe las órdenes con 1 minuto de retraso, sin más', 'El broker borra sus retenidos'], 'Durante el delay no se llama a mqtt.loop() ni se envía nada: ni pings ni datos. 60 s de silencio superan los 45 s que espera el broker. Además, las órdenes entrantes no se procesan.', { c: 'io_mqttesp', l: 'io19', code: 'void loop() {\n  if (!mqtt.connected()) reconectar();\n  mqtt.loop();\n  publicarLectura();\n  delay(60000);\n}', h: 'Calcula cuánto silencio admite el broker con ese keepalive y compáralo con el delay.' })
] },

{ id: 'io-m5', title: 'Datos: medir, filtrar, guardar y ver', desc: 'Muestreo y aliasing, filtros, calibración, hora con NTP, series temporales con InfluxDB y Grafana, automatizaciones y detección de anomalías.', nodes: [
 L('io20', 'Muestrear: cuánto y cada cuánto', 'gauge', ['io_sampling', 'io_report', 'io_datavol'], [
  Q('Mides cada 10 minutos la temperatura de un horno que se enciende y se apaga en ciclos de 4 minutos. ¿Qué crees que verás en la gráfica?', ['Valores que parecen al azar, o una oscilación lenta que no existe', 'Los ciclos perfectos', 'Una recta exacta', 'Nada'], 'Si mides más despacio de lo que cambia la señal, los puntos te engañan. Vamos a verlo con una señal sencilla.', { predict: true, c: 'io_sampling', h: '¿Cuántas medidas caen dentro de cada ciclo de 4 minutos?' }),
  { t: 'explore', text: 'En gris, una señal que oscila; los puntos son las muestras y la línea de color, lo que verías uniéndolas. Cambia la frecuencia de muestreo.', viz: 'io_alias', params: PP.alias(),
    tasks: [
      { q: 'engano', min: 1, max: 1, text: 'Baja el muestreo hasta que los puntos dibujen una señal más lenta que la real', done: 'Aliasing: con menos de dos muestras por ciclo, la señal se disfraza de otra.', hint: 'Muestrea por debajo del doble de la frecuencia de la señal.' },
      { q: 'ratio', min: 5, max: 1000, text: 'Ahora muestrea al menos 5 veces por ciclo', done: 'Con 5–10 muestras por ciclo, la forma se reconoce bien.' }
    ] },
  I('<b>Muestrear</b> es medir a intervalos regulares. La pregunta clave: ¿a qué velocidad cambia lo que mides? Muy poco y te pierdes lo que pasa; demasiado y gastas batería, red y almacenamiento sin ganar nada.', { svg: CHK([['Temperatura de una habitación: cada 1–5 min', 2], ['Humedad del suelo: cada 15–60 min', 2], ['Corriente de 50 Hz: miles por segundo, un rato', 2], ['Puerta: cuando cambia (por evento)', 2]], 'Ritmos razonables') }),
  I('<b>Nyquist</b>: para captar una señal hay que muestrear a <b>más del doble</b> de su frecuencia más alta. Si no, aparece el <b>aliasing</b>: una señal rápida se disfraza de otra lenta que no existe. Aquí, 1 Hz muestreado a 1,2 Hz parece una oscilación lentísima:', { tune: { viz: 'io_alias', params: PP.alias({ fs: LS('Frecuencia de muestreo', 1.2, [0.8, 1.2, 1.5, 2.5, 3, 4, 5, 8, 10, 20], 'Hz', 1) }) }, more: 'En la práctica se muestrea de 5 a 10 veces más rápido que lo más rápido que te interesa, y se pone un filtro paso bajo antes del ADC (filtro antialiasing) para quitar lo que no quieres medir y que podría disfrazarse.' }),
  I('Truco de nodo listo: <b>medir rápido y enviar despacio</b>. Medir es barato; transmitir, caro. El nodo muestrea a menudo, calcula un resumen y envía solo eso.', { svg: FLOW(['Mide cada segundo', 'Media, máx., mín.', 'Envía cada 5 min'], 'no te pierdes los picos y no saturas la red') }),
  I('Otra opción: enviar <b>por cambio</b> (si el valor se mueve más de un «delta») y, además, un <b>latido</b> periódico para distinguir «estable» de «muerto». Prueba:', { tune: { viz: 'io_delta', params: PP.delta({ d: LS('Delta: enviar si cambia', 0.2, [0, 0.1, 0.2, 0.5, 1], '°C', 1), hb: LS('Latido cada (0 = sin latido)', 15, [0, 5, 15, 60], 'min') }) } }),
  I('Los datos en bruto crecen deprisa:', { code: 'bits por segundo = canales × muestras por segundo × bits por muestra\n\n1 canal × 1000 muestras/s × 16 bits = 16 000 bit/s = 16 kbit/s' }),
  { t: 'steps', text: 'Un sensor de vibración muestrea a 1000 muestras por segundo con 16 bits. ¿Envías todas las muestras?', steps: ['En bruto: 1000 × 16 = 16 000 bit/s = 16 kbit/s.', 'Al día: 16 000 × 86 400 / 8 ≈ <b>173 MB</b>.', 'Con un resumen por minuto (valor eficaz, pico, alarma) de unos 20 bytes: 1440 × 20 = <b>28,8 kB</b> al día.', 'El nodo hace el trabajo pesado (en el borde) y envía lo que importa.'], result: 'Seis mil veces menos datos sin perder lo importante.' },
  G('io_sampling'),
  { t: 'match', q: 'Une cada magnitud con un muestreo razonable.', pairs: [['Temperatura de una habitación', 'Cada 1–5 minutos'], ['Humedad del suelo', 'Cada 15–60 minutos'], ['Corriente de la red de 50 Hz para su valor eficaz', 'Miles de muestras por segundo, un instante'], ['Apertura de una puerta', 'Por evento, no por intervalo']], c: 'io_sampling', h: '¿Cuánto tarda en cambiar cada una?' },
  Q('Quieres captar una vibración de 120 Hz. ¿Qué muestreo práctico eliges?', ['Entre 600 y 1200 muestras por segundo, con un filtro antialiasing', '120 muestras por segundo', '240 muestras por segundo justas', '60 muestras por segundo'], 'Más del doble en teoría; de 5 a 10 veces en la práctica.', { c: 'io_sampling', h: 'Multiplica la frecuencia de la señal por 5 y por 10.' }),
  Q('Un sensor de vibración muestrea a 1 kHz. ¿Qué envías cada minuto?', ['Un resumen: valor eficaz, pico y quizá una alarma', 'Las 60 000 muestras', 'Solo la última muestra', 'Nada'], 'Procesa en el borde.', { c: 'io_report', h: 'Recuerda el ejemplo paso a paso.' }),
  Q('Envías la temperatura solo si cambia 0,5 °C. ¿Qué más necesitas?', ['Un envío periódico de todos modos (latido) para distinguir «estable» de «muerto»', 'Nada más', 'Más decimales', 'Un tema más largo'], 'Silencio no es lo mismo que estabilidad.', { c: 'io_report', h: 'Si no llega nada en 6 horas, ¿qué ha pasado?' }),
  G('io_sampling'),
  I('<b>Resumen</b>\n· Muestrea según lo rápido que cambia la magnitud.\n· Nyquist: más del doble de la frecuencia máxima; en la práctica, 5–10 veces.\n· Mide rápido y envía resúmenes, o por cambio con latido.')
 ]),
 L('io21', 'Filtrar el ruido: media, mediana y exponencial', 'gauge', ['io_filter'], [
  Q('Un sensor de distancia da 120, 121, 0, 120 y 119 cm: el 0 es un eco perdido. Si haces la media de las cinco, ¿qué crees que sale?', ['Unos 96 cm: el 0 arrastra la media', '120 cm', '0 cm', '121 cm'], 'La media reparte el error del pico entre todas. Hay filtros que lo eliminan sin más.', { predict: true, c: 'io_filter', h: 'Suma las cinco y divide entre cinco.' }),
  { t: 'explore', text: 'Una señal con ruido, dos picos absurdos y un escalón real a mitad. Elige el filtro y ajústalo.', viz: 'io_filt', params: PP.filt(),
    tasks: [
      { q: 'picoRapido', min: 1, max: 1, text: 'Haz desaparecer los picos con un retardo de 3 muestras o menos', done: 'La mediana: el pico queda en un extremo al ordenar y se descarta.', hint: 'Prueba la mediana con ventana 3 o 5.' },
      { q: 'expSuave', min: 1, max: 1, text: 'Con el exponencial, deja el ruido por debajo del 35 %', done: 'α pequeño: muy suave… y mira cuánto tarda en seguir el escalón.', hint: 'Filtro exponencial y α de 0,1 o menos.' }
    ] },
  I('Toda medida real trae <b>ruido</b> (pequeñas variaciones al azar) y, a veces, <b>picos</b> (una lectura absurda por una interferencia). Filtrar es quedarse con la señal sin perder lo importante. Mueve la ventana de esta media:', { tune: { viz: 'io_mavg', params: { N: SL('Ventana', 1, 1, 32, 1), R: SL('Ruido', 0.6, 0, 1, 0.05, '', 2) } } }),
  I('La <b>media móvil</b> promedia las últimas N muestras. El ruido al azar baja unas √N veces, pero un cambio real tarda N muestras en verse entero: ese es el precio, el retardo.', { code: 'const int N = 16;\nint muestras[N], idx = 0;\nlong suma = 0;\n\nint filtrar(int v) {\n  suma += v - muestras[idx];   // quita la más vieja, suma la nueva\n  muestras[idx] = v;\n  idx = (idx + 1) % N;\n  return suma / N;\n}' }),
  I('La <b>mediana</b> ordena las últimas N muestras y toma la del centro. Un pico aislado queda en un extremo y desaparece; un escalón real pasa sin emborronarse tanto.', { code: 'últimas 5:   21  22  95  21  22\nordenadas:   21  21  22  22  95\n                     ↑\n             mediana = 22   (media = 36,2)' }),
  I('El filtro <b>exponencial</b> guarda un solo valor: y = y + α · (x − y). Con α pequeño (0,1) es suave y lento; con α grande (0,5), rápido y ruidoso. Arráncalo con la primera lectura, no con 0.', { code: 'float y = NAN;\nconst float ALFA = 0.1;\n\nfloat filtrar(float x) {\n  if (isnan(y)) y = x;        // la primera vez, arranca en la lectura\n  y += ALFA * (x - y);\n  return y;\n}' }),
  { t: 'steps', text: 'Exponencial con α = 0,2. El valor filtrado es 20 y llegan tres lecturas de 25. ¿Cómo evoluciona?', steps: ['y = 20 + 0,2 × (25 − 20) = <b>21</b>', 'y = 21 + 0,2 × (25 − 21) = <b>21,8</b>', 'y = 21,8 + 0,2 × (25 − 21,8) = <b>22,44</b>', 'Cada paso recorre el 20 % de lo que falta: se acerca sin saltos.'], result: 'Suave, pero tarda: necesita unas cuantas muestras para alcanzar el 25.' },
  TU('Elige una ventana que deje el ruido por debajo del 6 % sin pasar de 12 muestras de retardo.', 'io_mavg', { N: SL('Ventana', 1, 1, 32, 1), R: FX(0.6) }, { q: 'ok', min: 1, max: 1, text: 'Objetivo: ruido ≤ 6 % y retardo ≤ 12 muestras', hint: 'Prueba ventanas entre 8 y 14.' }, 'Siempre es un compromiso entre suavidad y rapidez.', { c: 'io_filter', h: 'Más ventana, menos ruido pero más retardo: busca el término medio.' }),
  Q('Con una media de 16 en vez de una de 4, el ruido al azar…', ['Baja a la mitad', 'Baja a la cuarta parte', 'Sube', 'No cambia'], '√16 / √4 = 4 / 2 = 2.', { c: 'io_filter', h: 'El ruido baja con la raíz de N, no con N.' }),
  Q('Últimas 5 lecturas: 21, 22, 95, 21, 22. ¿Mediana?', ['22', '36,2', '95', '21'], 'Ordenadas: 21, 21, 22, 22, 95.', { c: 'io_filter', h: 'Ordénalas y toma la del centro.' }),
  Nm('¿Y la media de esas 5 lecturas?', 36.2, '', '(21 + 22 + 95 + 21 + 22) / 5. El pico la arrastra.', { tol: 0.05, c: 'io_filter', h: 'Suma las cinco y divide entre cinco.' }),
  Nm('Exponencial con α = 0,2. Valor filtrado 20; llega una lectura de 30. ¿Nuevo valor?', 22, '', '20 + 0,2 × (30 − 20) = 22.', { tol: 0.01, c: 'io_filter', h: 'y + α · (x − y).' }),
  Q('¿Por qué el código arranca y con la primera lectura y no con 0?', ['Si empezara en 0, tardaría muchas muestras en subir hasta el valor real', 'Por estilo', 'Porque NAN es más rápido', 'Para ahorrar memoria'], 'Así evitas un arranque falso.', { code: 'if (isnan(y)) y = x;', c: 'io_filter', h: 'Imagina que la temperatura real es 20 y el filtro empieza en 0.' }),
  { t: 'match', q: 'Une cada filtro con su punto fuerte.', pairs: [['Media móvil', 'Reduce el ruido al azar de forma predecible'], ['Mediana', 'Elimina picos aislados'], ['Exponencial', 'Una sola variable de memoria'], ['Sin filtro', 'Ningún retardo']], c: 'io_filter', h: 'Recuerda qué hacía mejor cada uno en la exploración.' },
  Q('Un sensor ultrasónico de nivel da de vez en cuando 0 cm por un eco perdido. ¿Primer filtro?', ['Mediana de 5', 'Media de 100', 'Exponencial con α = 0,9', 'Ninguno'], 'Contra picos, mediana.', { c: 'io_filter', h: '¿Es ruido fino o un pico aislado?' }),
  I('<b>Resumen</b>\n· Media móvil: ruido entre √N, a cambio de N muestras de retardo.\n· Mediana: elimina picos aislados.\n· Exponencial: y += α·(x − y), una sola variable; arráncalo con la primera lectura.\n· Todo filtro es un compromiso entre suavidad y rapidez.')
 ]),
 L('io22', 'Calibrar un sensor', 'gauge', ['io_calib'], [
  Q('Un termómetro marca siempre 25,3 °C metido en agua a 25,0 °C, una y otra vez. ¿Qué crees que le pasa?', ['Repite bien, pero está desviado: se puede corregir', 'Está roto', 'Le faltan decimales', 'Es perfecto'], 'Repetir siempre lo mismo (precisión) no es lo mismo que acertar (exactitud). Una desviación constante se corrige calibrando.', { predict: true, c: 'io_calib', h: '¿El error cambia de una medida a otra o es siempre el mismo?' }),
  { t: 'explore', text: 'Un sensor real comparado con lo ideal (gris). Tienes dos referencias: hielo (0 °C) y un termómetro patrón (40 °C). Ajusta la corrección real = a · leído + b.', viz: 'io_calib', params: PP.calib(),
    tasks: [
      { q: 'err0', min: 0, max: 0.05, text: 'Corrige solo el desplazamiento para que a 0 °C marque 0', done: 'Un punto corrige el desplazamiento… pero a 40 °C sigue fallando.', hint: 'Mueve b hasta que el punto de 0 °C caiga en la línea gris.' },
      { q: 'errMax', min: 0, max: 0.2, text: 'Ajusta también la ganancia para que el error en todo el rango baje de 0,2 °C', done: 'Dos puntos corrigen desplazamiento y ganancia.', hint: 'Baja a hasta que la pendiente coincida y reajusta b.' }
    ] },
  I('Tres palabras que se confunden: <b>resolución</b> (cuántos decimales muestra), <b>precisión</b> (si repite lo mismo) y <b>exactitud</b> (si acierta).', { svg: VS({ t: 'Preciso e inexacto', l: ['lecturas muy juntas', 'lejos del valor real', 'se arregla calibrando'], c: 'var(--led)' }, { t: 'Impreciso', l: ['lecturas dispersas', 'alrededor del real', 'se mejora promediando'], c: 'var(--muted)' }) }),
  I('Más bits no es más exactitud: el ADC del ESP32 tiene 12 bits de resolución, pero su ruido y su falta de linealidad dejan bastantes menos bits útiles. Promedia y calibra.', { svg: CHK([['12 bits: 4096 escalones (resolución)', 1], ['Ruido: varias cuentas arriba y abajo', 0], ['Curva no lineal cerca de los extremos', 0], ['Solución: promediar y calibrar', 1]], 'El ADC del ESP32') }),
  I('Calibración de <b>un punto</b>: mides una referencia conocida y corriges el desplazamiento. De <b>dos puntos</b>: corriges también la ganancia (la pendiente).', { code: 'Un punto:   corrección = referencia − leído\n\nDos puntos: real = a · leído + b\n            a = (real₂ − real₁) / (leído₂ − leído₁)\n            b = real₁ − a · leído₁' }),
  { t: 'steps', text: 'Un sensor lee 10 en el hielo (0 °C reales) y 60 en agua hirviendo (100 °C reales, a nivel del mar). Calcula la corrección.', steps: ['Pendiente: a = (100 − 0) / (60 − 10) = 100 / 50 = <b>2</b>.', 'Desplazamiento: b = 0 − 2 × 10 = <b>−20</b>.', 'Corrección: real = 2 · leído − 20.', 'Comprueba: si lee 35 → 2 × 35 − 20 = 50 °C.'], result: 'real = 2 · leído − 20' },
  Nm('Baño de hielo (0 °C): tu sensor marca 0,6 °C. Si solo corriges el desplazamiento, ¿qué sumas a cada lectura?', -0.6, '°C', 'Corrección = referencia − leído = 0 − 0,6.', { tol: 0.01, c: 'io_calib', h: 'Referencia menos leído.' }),
  Nm('Dos puntos: lee 2 a 0 °C reales y 42 a 40 °C reales. ¿Pendiente a?', 1, '', '(40 − 0) / (42 − 2) = 1.', { tol: 0.01, c: 'io_calib', h: 'Diferencia de reales entre diferencia de leídos.' }),
  Nm('Con esos mismos puntos (a = 1), ¿cuánto vale b?', -2, '', 'b = real₁ − a · leído₁ = 0 − 1 × 2.', { tol: 0.01, c: 'io_calib', h: 'Usa el primer punto: real₁ − a · leído₁.' }),
  Q('El ADC del ESP32 tiene 12 bits de resolución. ¿Garantiza 12 bits de exactitud?', ['No: su ruido y su falta de linealidad dejan menos bits útiles', 'Sí, siempre', 'Sí, si muestreas rápido', 'Solo en el GPIO34'], 'Resolución no es exactitud: promedia y calibra.', { c: 'io_calib', h: 'Recuerda la diferencia entre resolución y exactitud.' }),
  Q('Un sensor capacitivo de humedad de suelo se calibra mejor…', ['Midiendo al aire y en agua, y comprobando en tu propia tierra', 'Con un baño de hielo', 'No se calibra', 'Bajando el ADC a 8 bits'], 'Cada sensor y cada suelo son distintos.', { c: 'io_calib', h: 'Busca dos referencias fáciles: totalmente seco y totalmente mojado.' }),
  Q('Has calibrado con hielo y con un patrón a 40 °C. ¿Cómo compruebas que ha quedado bien?', ['Midiendo un tercer punto conocido, por ejemplo agua templada junto al patrón', 'No hace falta', 'Repitiendo el hielo', 'Subiendo la resolución'], 'Una calibración se valida con un punto que no usaste para calcularla.', { c: 'io_calib', h: 'Si compruebas con los mismos puntos, siempre saldrá bien.' }),
  I('<b>Resumen</b>\n· Resolución ≠ precisión ≠ exactitud.\n· Un punto corrige el desplazamiento; dos, también la ganancia: real = a · leído + b.\n· Comprueba con un tercer punto.')
 ]),
 L('io41', 'La hora en los datos: NTP y UTC', 'timer', ['io_time'], [
  Q('Desenchufas un ESP32 y lo vuelves a enchufar. ¿Sabe qué hora es?', ['No: no tiene reloj con pila; hay que preguntarla por la red', 'Sí, la guarda en la flash', 'Sí, se la da el WiFi sin pedirla', 'Solo si es de día'], 'Al arrancar, el ESP32 cree que es 1 de enero de 1970. La hora se pide a un servidor con NTP.', { predict: true, c: 'io_time', h: '¿Qué mantendría el reloj en marcha sin alimentación?' }),
  { t: 'explore', text: 'El reloj interno del ESP32 se desvía un poco cada segundo (en ppm, partes por millón). Mira el error que acumula entre dos sincronizaciones con NTP.', viz: 'io_drift', params: PP.drift(),
    tasks: [
      { q: 'err', min: 60, max: 1e9, text: 'Consigue que el error pase de un minuto antes de resincronizar', done: 'Una deriva pequeña, acumulada durante días, se nota mucho.', hint: 'Más deriva y sincronizaciones más espaciadas.' },
      { q: 'errFino', min: 1, max: 1, text: 'Ahora que nunca pase de 1 s', done: 'Resincronizar cada pocas horas mantiene el error a raya.', hint: 'Sincroniza más a menudo.' }
    ] },
  I('Con <b>NTP</b> (un protocolo sobre UDP, puerto 123) el ESP32 pide la hora a un servidor y luego la mantiene con su reloj interno. La zona horaria se da con una regla:', { code: '#include <time.h>\n\n// Península: CET (UTC+1) en invierno y CEST (UTC+2) en verano\nconfigTzTime("CET-1CEST,M3.5.0,M10.5.0/3", "pool.ntp.org");\n\nstruct tm ahora;\nif (getLocalTime(&ahora)) { /* ya está en hora */ }\ntime_t unix = time(nullptr);   // segundos desde 1970, en UTC' }),
  I('El reloj interno se desvía: una deriva de <b>20 ppm</b> son 20 µs de error por cada segundo. Parece nada, pero se acumula.', { code: '20 ppm × 86 400 s = 1,73 s al día\n50 ppm × 86 400 s = 4,32 s al día\n\nerror = ppm × 10⁻⁶ × segundos sin sincronizar' }),
  I('Guarda las marcas de tiempo en <b>UTC</b> y convierte a hora local solo al mostrar. El último domingo de octubre, en la península, la hora entre las 2:00 y las 3:00 existe dos veces: en hora local, las lecturas se mezclarían.', { svg: TLINE([[0.1, '1:59 CEST', 'var(--ok)'], [0.35, '2:30 CEST'], [0.55, '3:00 → 2:00', 'var(--err)'], [0.8, '2:30 CET'], [0.95, '3:00 CET', 'var(--ok)']], 'último domingo de octubre', 'las 2:30 existen dos veces') }),
  I('¿Quién pone la hora? Si el nodo envía al momento, el servidor puede sellar la llegada. Si el nodo <b>guarda</b> datos sin red y los manda más tarde, cada lectura debe llevar la hora a la que se midió.', { svg: VS({ t: 'Envío inmediato', l: ['el servidor sella', 'la llegada: vale'], c: 'var(--ok)' }, { t: 'Envío diferido', l: ['el nodo debe sellar', 'cada lectura al medir'], c: 'var(--led)' }) }),
  { t: 'steps', text: 'Con 50 ppm de deriva y sin NTP, ¿cuánto se desvía el reloj en una semana?', steps: ['50 ppm = 50 µs de error por cada segundo.', 'Una semana: 7 × 86 400 = 604 800 s.', '604 800 × 50 µs = 30 240 000 µs = <b>30,24 s</b>.'], result: 'Medio minuto por semana: resincroniza cada pocas horas.' },
  Nm('Un reloj con 20 ppm de deriva pasa un día sin sincronizar. ¿Cuántos segundos de error acumula?', 1.728, 's', '20 × 10⁻⁶ × 86 400 = 1,728 s.', { tol: 0.05, c: 'io_time', h: 'ppm × 10⁻⁶ × segundos de un día.' }),
  Q('¿Por qué guardar las marcas de tiempo en UTC y convertir a hora local solo al mostrar?', ['Para evitar líos con el cambio de hora y la hora que se repite en octubre', 'Porque ocupa menos', 'Porque NTP no da la hora local', 'Por costumbre'], 'En UTC no hay horas repetidas ni saltos.', { c: 'io_time', h: 'Recuerda la línea de tiempo de octubre.' }),
  Q('Un nodo guarda 30 lecturas durante un corte de red y las envía de golpe al volver. ¿Qué debe incluir cada una?', ['Su marca de tiempo de medida', 'Nada más: el servidor pone la hora de llegada', 'Su tamaño', 'La IP del nodo'], 'Si no, las 30 tendrían la misma hora.', { c: 'io_time', h: 'Si el servidor sella la llegada, ¿qué hora tendrían todas?' }),
  Q('Un nodo duerme entre medidas y mantiene la hora sin WiFi…', ['Con su reloj interno, que se desvía: hay que resincronizar con NTP de vez en cuando', 'Perfectamente, para siempre', 'No puede saber nada de la hora', 'Solo con GPS'], 'Su oscilador interno no es muy preciso.', { c: 'io_time', h: 'Recuerda la exploración de la deriva.' }),
  Q('¿Qué zona horaria describe esta cadena?', ['Península: +1 en invierno, +2 en verano, con cambios el último domingo de marzo y de octubre', 'Canarias', 'UTC sin cambios', 'Nueva York'], 'Canarias usaría WET0WEST con sus propias reglas.', { code: 'CET-1CEST,M3.5.0,M10.5.0/3', c: 'io_time', h: 'CET es la hora central europea; M3 y M10 son marzo y octubre.' }),
  Q('¿Qué necesita el nodo para pedir la hora por NTP?', ['Red con salida a un servidor de hora (UDP, puerto 123)', 'Un reloj con pila', 'Un GPS', 'Nada'], 'Una consulta corta por UDP; si se pierde, se repite.', { c: 'io_time', h: 'NTP es un protocolo de red.' }),
  I('<b>Resumen</b>\n· El ESP32 no sabe la hora al arrancar: NTP + regla de zona horaria.\n· Su reloj se desvía (ppm × segundos): resincroniza cada pocas horas.\n· Guarda en UTC; convierte al mostrar.\n· Si envías tarde, cada lectura lleva su hora de medida.')
 ]),
 L('io23', 'Series temporales: InfluxDB y Grafana', 'memory', ['io_tsdb', 'io_datavol'], [
  Q('Guardas una temperatura cada 10 s durante un año. ¿Cuántos puntos crees que serán?', ['Unos 3 millones', 'Unos 36 500', 'Unos 300 000', 'Unos 30 millones'], '365 × 86 400 / 10 ≈ 3,15 millones de puntos por sensor. Hace falta una base de datos pensada para eso… y una estrategia para no guardarlo todo para siempre.', { predict: true, c: 'io_datavol', h: 'Segundos de un año entre 10.' }),
  { t: 'explore', text: 'Elige cada cuánto mides, cuántos días guardas los datos crudos y qué usas como etiqueta. Las barras están en escala logarítmica.', viz: 'io_retention', params: PP.retention(),
    tasks: [
      { q: 'puntosAnio', min: 3e6, max: 1e12, text: 'Pon una lectura cada 10 s o menos y mira los puntos de un año', done: 'Millones de puntos por sensor y por año.', hint: 'Baja el intervalo.' },
      { q: 'retBien', min: 1, max: 1, text: 'Con ese ritmo, guarda crudos un mes o menos (más medias horarias) y baja de 300 000 puntos', done: 'Crudos para el detalle reciente; medias para la historia.', hint: 'Baja los días de datos crudos.' },
      { q: 'series', min: 1e5, max: 1e12, text: 'Usa como etiqueta el id de cada mensaje y mira las series', done: 'Una serie por punto: la cardinalidad dispara la memoria.' }
    ] },
  I('Los datos de sensores son <b>series temporales</b>: valores con su instante. Una base de datos de series temporales como <b>InfluxDB</b> está hecha para eso.', { svg: CHK([['Escribe muy rápido, punto a punto', 1], ['Comprime valores parecidos', 1], ['Resume por intervalos (medias, máximos)', 1], ['Borra lo viejo automáticamente (retención)', 1]], 'Lo que hace bien') }),
  I('InfluxDB usa el <b>protocolo de línea</b>: medida, etiquetas (para filtrar: qué casa, qué sala), campos (los valores) y marca de tiempo.', { code: 'clima,casa=principal,sala=salon temperatura=21.4,humedad=48 1760000000000000000\n└medida┘ └──── etiquetas ─────┘ └────── campos ───────┘ └── tiempo (ns) ──┘' }),
  I('<b>Etiquetas</b> para lo que identifica la serie, con pocos valores posibles; <b>campos</b> para lo medido. Cada combinación distinta de etiquetas crea una serie nueva: con algo que cambia siempre, el número de series (la <b>cardinalidad</b>) se dispara.', { svg: VS({ t: 'Etiquetas', l: ['sala, nodo, casa', 'pocos valores', 'se indexan'], c: 'var(--ok)' }, { t: 'Campos', l: ['temperatura, humedad', 'cualquier valor', 'lo que mides'], c: 'var(--led)' }) }),
  I('<b>Retención y resumen</b>: guarda los crudos unos días o semanas y las medias horarias o diarias para siempre.', { svg: BARS([['Un año, una lectura por minuto', 525600, 'var(--err)'], ['Un año de medias horarias', 8760, 'var(--ok)']], ' puntos') }),
  I('La tubería típica en casa: el nodo publica por MQTT, <b>Telegraf</b> (o Node-RED) se suscribe y escribe en InfluxDB, y <b>Grafana</b> dibuja paneles consultando la base de datos.', { svg: FLOW(['Nodo', 'Broker MQTT', 'Telegraf', 'InfluxDB', 'Grafana'], 'cada pieza se puede cambiar sin tocar las demás') }),
  { t: 'steps', text: '¿Cuántos puntos guarda al año un sensor que mide cada minuto? ¿Y si solo guardas su media horaria?', steps: ['Minutos en un año: 365 × 24 × 60 = <b>525 600</b> puntos.', 'Horas en un año: 365 × 24 = <b>8760</b> puntos.', 'La media horaria ocupa 60 veces menos.', 'Estrategia: crudos 30 días (43 200 puntos) + medias horarias para siempre.'], result: 'Detalle reciente y tendencia histórica, sin hinchar el disco.' },
  Q('En «clima,casa=principal,sala=salon temperatura=21.4», ¿qué es sala=salon?', ['Una etiqueta: sirve para filtrar y agrupar', 'Un campo con un valor medido', 'La marca de tiempo', 'La medida'], 'Etiquetas = metadatos indexados.', { c: 'io_tsdb', h: 'Mira en qué bloque del protocolo de línea está.' }),
  Q('¿Qué deberías guardar como etiqueta y no como campo?', ['El nombre del nodo', 'La temperatura', 'La humedad', 'La tensión de la batería'], 'Lo medido son campos; lo que identifica la serie, etiquetas.', { c: 'io_tsdb', h: '¿Cuál identifica de dónde viene el dato?' }),
  Q('Pones como etiqueta el identificador único de cada mensaje. ¿Problema?', ['Una serie nueva por mensaje: el uso de memoria se dispara', 'Ninguno', 'Que no se puede consultar', 'Que ocupa menos'], 'Etiquetas con pocos valores posibles.', { c: 'io_tsdb', h: 'Recuerda la tercera tarea de la exploración.' }),
  Nm('Una lectura cada 10 s durante un año (365 días). ¿Cuántos puntos?', 3153600, 'puntos', '365 × 86 400 / 10.', { tol: 1, c: 'io_datavol', h: 'Segundos de un año entre el intervalo.' }),
  { t: 'order', q: 'Ordena la tubería típica de datos en casa.', items: ['El nodo publica un JSON por MQTT', 'Telegraf (o Node-RED) se suscribe al tema', 'Escribe los puntos en InfluxDB', 'Grafana consulta InfluxDB', 'Tú ves el panel en el navegador'], e: 'Cada pieza se puede cambiar sin tocar las demás.', c: 'io_tsdb', h: 'Del nodo a tus ojos.' },
  Q('En una gráfica de un mes, Grafana no dibuja los 43 200 puntos de cada serie. ¿Qué hace?', ['Agrupa por intervalos (por ejemplo, la media de cada hora) según el zoom', 'Dibuja solo los primeros', 'Falla', 'Inventa puntos'], 'Agregación por ventana de tiempo.', { c: 'io_tsdb', h: 'Tu pantalla no tiene 43 200 píxeles de ancho.' }),
  Q('Si prefieres SQL clásico, ¿qué alternativa tienes?', ['PostgreSQL con la extensión TimescaleDB', 'Un archivo de texto por sensor', 'Guardarlo en la flash del ESP32', 'Ninguna'], 'Hay varias opciones; elige la que sepas mantener.', { c: 'io_tsdb', h: 'Busca una base de datos clásica con un añadido para series temporales.' }),
  I('<b>Resumen</b>\n· Series temporales: valores con su instante; InfluxDB escribe, comprime, resume y borra.\n· Etiquetas (pocos valores) para identificar; campos para medir.\n· Crudos unos días, medias para siempre.\n· Nodo → MQTT → Telegraf → InfluxDB → Grafana.')
 ]),
 L('io24', 'Automatizar con Node-RED y detectar anomalías', 'code', ['io_anomaly', 'io_automation'], [
  Q('El sensor de la nevera se cuelga y repite 4,2 °C exactos durante horas. ¿Crees que un aviso «si pasa de 8 °C» lo detectaría?', ['No: el valor está dentro de lo normal', 'Sí, enseguida', 'Sí, a las 24 horas', 'Solo de noche'], 'Un umbral solo ve valores fuera de rango. Para otros fallos hacen falta otros detectores.', { predict: true, c: 'io_anomaly', h: '¿Pasa 4,2 de 8?' }),
  { t: 'explore', text: 'Una nevera con distintas averías y cuatro detectores. Encuentra el detector que ve cada avería.', viz: 'io_anom', params: PP.anom(),
    tasks: [
      { q: 'congOK', min: 1, max: 1, text: 'Elige la anomalía «Valor congelado» y el detector que la ve', done: 'Valor congelado: la misma lectura exacta durante demasiado tiempo.' },
      { q: 'silOK', min: 1, max: 1, text: 'Ahora la anomalía «Deja de enviar»', done: 'Un nodo muerto no envía nada raro: simplemente calla. Hace falta un detector de silencio.' },
      { q: 'velOK', min: 1, max: 1, text: 'Y la anomalía «Subida brusca» (dentro del rango)', done: 'La velocidad de cambio avisa antes de llegar al umbral.' }
    ] },
  I('<b>Node-RED</b> es programación por flujos: arrastras nodos (entrada MQTT, función, conmutador, petición HTTP…) y los unes con cables. Corre en Node.js; en una Raspberry Pi se abre en el puerto 1880.', { svg: FLOW(['mqtt in', 'json', 'switch: > 8 °C', 'limitar avisos', 'http request'], 'un flujo que avisa al móvil si la nevera se calienta') }),
  I('Toda automatización responde a tres preguntas: ¿cuándo me evalúo? (<b>disparador</b>), ¿se cumple todo? (<b>condiciones</b>) y ¿qué hago? (<b>acciones</b>).', { svg: VS({ t: 'Disparador', l: ['el CO₂ pasa de 1000', 'se abre la puerta', 'son las 7:00'], c: 'var(--led)' }, { t: 'Condición → acción', l: ['si hay alguien', '→ avisar', 'si es de noche → luz'], c: 'var(--ok)' }) }),
  I('Detectores de anomalías sencillos, sin inteligencia artificial:', { svg: CHK([['Umbral: valor fuera de rango', 2], ['Velocidad: cambia demasiado deprisa', 2], ['Congelado: misma lectura exacta durante horas', 2], ['Silencio: no llegan datos', 2], ['Estadística: lejos de la media reciente', 2]], 'Cinco detectores') }),
  I('La <b>desviación típica</b> (σ) mide cuánto se separan normalmente las lecturas de su media. Si el ruido se reparte como una campana, casi todas las lecturas normales caen a menos de 3σ de la media: lo que se sale de ahí es sospechoso.', { code: 'media  = suma / n\nσ      = raíz( suma de (x − media)² / n )\n\nnormal entre  media − 3σ  y  media + 3σ' }),
  I('Dos defensas que no pueden faltar: <b>limita los avisos</b> (uno por lectura y acabarás ignorándolos) y <b>valida la entrada</b> antes de actuar: ¿el dato es reciente? ¿Es plausible?', { svg: CHK([['Como mucho un aviso cada 30 min por problema', 1], ['Dato de hace más de 3 periodos: no actúes', 1], ['Valor imposible (−40 °C en el salón): ignóralo', 1], ['Actuar sobre cualquier cosa que llegue', 0]], 'Automatizar sin hacer daño') }),
  { t: 'steps', text: 'Una temperatura tiene media 21 °C y desviación típica 0,5 °C. ¿Qué lecturas son sospechosas?', steps: ['3σ = 3 × 0,5 = 1,5 °C.', 'Límite inferior: 21 − 1,5 = <b>19,5 °C</b>.', 'Límite superior: 21 + 1,5 = <b>22,5 °C</b>.', 'Una lectura de 23,1 °C es sospechosa; una de 21,8 °C, no.'], result: 'Normal entre 19,5 y 22,5 °C.' },
  { t: 'order', q: 'Ordena un flujo que avisa si la nevera pasa de 8 °C.', items: ['Nodo mqtt in suscrito a casa/cocina/nevera/estado', 'Nodo json que convierte la carga en objeto', 'Nodo switch: ¿la temperatura supera 8?', 'Nodo function que deja pasar como mucho un aviso cada 30 min', 'Nodo http request que envía el aviso al móvil'], e: 'Entrada, convertir, decidir, limitar, actuar.', c: 'io_automation', h: 'Primero el dato entra y se entiende; luego se decide y se actúa.' },
  Q('¿Por qué limitar la frecuencia de los avisos?', ['Para no recibir uno por cada lectura y acabar ignorándolos', 'Para ahorrar CPU', 'Porque solo se puede enviar uno al día', 'No hace falta'], 'La fatiga de avisos mata los sistemas de alarma.', { c: 'io_automation', h: '¿Qué harías con 60 avisos iguales por hora?' }),
  { t: 'match', q: 'Une cada síntoma con su detector.', pairs: [['El nodo deja de publicar', 'Silencio (falta el latido)'], ['La humedad marca 47,0 exacto durante 12 h', 'Valor congelado'], ['El congelador sube de −18 a −5 °C', 'Umbral'], ['La temperatura salta 15 °C en 10 s', 'Velocidad de cambio']], c: 'io_anomaly', h: 'Recuerda qué detector veía cada avería en la exploración.' },
  Nm('Media 21 °C y desviación típica 0,5 °C. ¿A partir de qué valor (por arriba) marcas anomalía con 3σ?', 22.5, '°C', '21 + 3 × 0,5.', { tol: 0.01, c: 'io_anomaly', h: 'Media más tres desviaciones típicas.' }),
  Q('¿Qué ventaja tiene detectar por velocidad de cambio frente a un umbral fijo?', ['Avisa antes, aunque el valor aún esté dentro del rango', 'Es más sencilla', 'No necesita datos', 'Nunca da falsas alarmas'], 'Una subida brusca es sospechosa aunque todavía no sea alta.', { c: 'io_anomaly', h: 'Recuerda la subida brusca de la exploración.' }),
  Q('Un nodo a pilas envía cada 15 minutos. ¿Cuándo das la alarma de silencio?', ['Tras 2 o 3 periodos sin datos (30–45 min)', 'Al minuto', 'Nunca', 'Tras una semana'], 'Margen para pérdidas sueltas, pero no demasiado.', { c: 'io_anomaly', h: 'Un mensaje perdido suelto no debería dar la alarma.' }),
  Q('Una automatización enciende la calefacción si un sensor marca menos de 18 °C. El sensor se cuelga marcando 10 °C. ¿Qué faltaba?', ['Comprobar que el dato es reciente y plausible antes de actuar', 'Un tema más corto', 'Más decimales', 'Un retenido'], 'Antes de actuar, valida la entrada.', { c: 'io_automation', h: 'Recuerda las dos defensas.' }),
  I('<b>Resumen</b>\n· Automatización = disparador + condiciones + acciones (Node-RED lo hace con flujos).\n· Detectores: umbral, velocidad, congelado, silencio y 3σ.\n· Limita los avisos y valida los datos antes de actuar.')
 ]),
 SIM('io-s3', 'Reto: media móvil visible', 'Ve el filtrado con tus propios ojos: el ESP32 lee el potenciómetro del GPIO34. El LED del GPIO19 sigue la lectura cruda y el del GPIO18, la media de las últimas 16. Gira el potenciómetro deprisa de un extremo a otro y mira cómo el filtrado llega tarde y suave.', { arduino: 'io_media', board: 'esp32', parts: ['pot', 'res', 'led'], code: true, hint: 'Potenciómetro: extremos a 3V3 y GND, cursor al D34. Dos LEDs rojos: D19 → 100 Ω → LED → GND y D18 → 100 Ω → LED → GND. Gira hasta los dos topes.' }, 'io_media'),
 PRJ('io-p7', 'Proyecto: vigilante de nevera y congelador', 'io_fridge'),
 PRJ('io-p9', 'Proyecto: consumo eléctrico sin tocar la red', 'io_energy'),
 PRJ('io-p10', 'Proyecto: contador de personas sin cámaras', 'io_people')
],
exam: [
  Q('Quieres captar el zumbido de 50 Hz de un transformador. ¿Qué muestreo eliges?', ['Más de 100 muestras/s en teoría; en la práctica, entre 250 y 500', '50 muestras/s justas', '100 muestras/s justas', '25 muestras/s'], 'Nyquist pide más del doble de la frecuencia más alta: más de 100. En la práctica, de 5 a 10 veces: 250–500 muestras/s, con filtro antialiasing.', { c: 'io_sampling', l: 'io20', h: 'Aplica primero la regla teórica y luego el margen práctico.' }),
  Q('Una vibración de 10 Hz se muestrea a 12 muestras por segundo. ¿Qué verás al unir los puntos?', ['Una oscilación lenta, de unos 2 Hz, que no existe', 'La señal de 10 Hz tal cual', 'Una señal de 22 Hz', 'Una línea recta'], '12 no llega al doble de 10: hay aliasing. La señal rápida se disfraza de otra lenta, aquí de 12 − 10 = 2 Hz.', { c: 'io_sampling', l: 'io20', h: 'Comprueba si se cumple Nyquist; si no, la señal se disfraza de otra más lenta.' }),
  Nm('Un sensor muestrea a 500 muestras por segundo con 16 bits por muestra. ¿Cuántos kbit/s genera en bruto?', 8, 'kbit/s', '1 canal × 500 × 16 = 8000 bit/s = 8 kbit/s.', { tol: 0, c: 'io_datavol', l: 'io20', h: 'Canales × muestras por segundo × bits por muestra, y pasa a kbit/s.' }),
  Q('Un nodo envía la temperatura solo si cambia 0,5 °C, sin latido. El panel lleva 6 horas sin datos. ¿Qué puedes concluir?', ['Nada seguro: puede estar estable o muerto; por eso hace falta un latido', 'Que la temperatura no ha cambiado', 'Que el nodo se ha roto', 'Que el broker ha borrado los datos'], 'Con envío por cambio, el silencio es ambiguo. Un envío periódico de todos modos distingue «estable» de «muerto».', { c: 'io_report', l: 'io20', h: '¿Qué dos situaciones producen exactamente el mismo silencio?' }),
  Q('Un sensor de vibración muestrea a 2 kHz y envía por WiFi. ¿Qué es lo sensato enviar cada minuto?', ['Un resumen: valor eficaz, pico y una alarma si procede', 'Las 120 000 muestras del minuto', 'Solo la primera muestra del minuto', 'La media de las 120 000 muestras, que es cero'], 'Mide rápido y envía despacio: el nodo calcula en el borde lo que importa. Ojo: la media de una vibración ronda cero y no dice nada.', { c: 'io_report', l: 'io20', h: 'Piensa qué números resumen bien una vibración sin mandar todo.' }),
  Nm('Filtro exponencial con α = 0,25. El valor filtrado es 40 y llega una lectura de 48. ¿Nuevo valor?', 42, '', 'y = 40 + 0,25 × (48 − 40) = 40 + 2 = 42.', { tol: 0.01, c: 'io_filter', l: 'io21', h: 'Aplica y = y + α · (x − y).' }),
  Q('Cambias una media móvil de 9 muestras por una de 36. ¿Qué pasa con el ruido al azar y con el retardo?', ['El ruido baja a la mitad y el retardo se multiplica por 4', 'El ruido baja a la cuarta parte y el retardo no cambia', 'El ruido baja a la mitad y el retardo también', 'El ruido baja a la cuarta parte y el retardo se multiplica por 4'], 'El ruido baja unas √N veces: √36 / √9 = 6 / 3 = 2. El retardo crece con N: 36 / 9 = 4.', { c: 'io_filter', l: 'io21', h: 'El ruido va con la raíz de N; el retardo, con N.' }),
  Nm('Últimas 5 lecturas de un sensor de nivel: 82, 0, 81, 83 y 82 cm. ¿Cuánto da la mediana?', 82, 'cm', 'Ordenadas: 0, 81, 82, 82, 83. La del centro es 82: el 0 del eco perdido desaparece.', { tol: 0, c: 'io_filter', l: 'io21', h: 'Ordena las cinco y toma la del centro.' }),
  Q('Un termostato filtra con un exponencial de α = 0,05 y tarda muchísimo en notar que abres la ventana. ¿Qué cambias?', ['Subir α, por ejemplo a 0,2: responde antes, a cambio de algo más de ruido', 'Bajar α a 0,01', 'Arrancar el filtro en 0', 'Cambiar a una media de 100 muestras'], 'Con α pequeño el filtro es suave pero lento. Subirlo acorta el retardo. Bajarlo, o una media de 100, lo haría aún más lento.', { c: 'io_filter', l: 'io21', h: '¿Qué efecto tiene α en la rapidez del filtro?' }),
  Nm('Un sensor lee 5 en hielo (0 °C reales) y 85 en agua hirviendo (100 °C reales). Con la corrección de dos puntos, ¿qué temperatura real corresponde a una lectura de 45?', 50, '°C', 'a = (100 − 0) / (85 − 5) = 1,25. b = 0 − 1,25 × 5 = −6,25. Real = 1,25 × 45 − 6,25 = 56,25 − 6,25 = 50 °C.', { tol: 0.05, c: 'io_calib', l: 'io22', h: 'Calcula primero la pendiente a, luego b, y aplica real = a · leído + b.' }),
  Q('Referencia: 20,0 °C. El termómetro A marca 22,1, 22,1 y 22,2; el B, 19,0, 21,0 y 20,1. ¿Qué dices?', ['A repite bien y su error constante se corrige calibrando; B es poco preciso', 'B es mejor porque su media se acerca más', 'Los dos son igual de buenos', 'Ninguno se puede corregir'], 'A es preciso pero inexacto: un desplazamiento de unos −2,1 °C lo arregla. El error de B cambia en cada lectura: eso no se corrige con un desplazamiento.', { c: 'io_calib', l: 'io22', h: 'Separa «repite lo mismo» de «acierta»: ¿cuál se arregla sumando una constante?' }),
  Q('Tu sensor marca +0,5 °C de más a 0 °C y +1,5 °C de más a 40 °C. ¿Basta con calibrar un punto?', ['No: el error cambia con la temperatura, hay que corregir también la ganancia con dos puntos', 'Sí: basta restar 0,5 °C', 'Sí: basta restar 1,5 °C', 'No: hay que subir la resolución del ADC'], 'Un punto corrige un desplazamiento constante. Si el error crece con la temperatura, la pendiente también está mal: dos puntos.', { c: 'io_calib', l: 'io22', h: '¿Es el error igual en todo el rango?' }),
  Nm('Un reloj con 40 ppm de deriva se sincroniza por NTP cada 6 horas. ¿Cuántos segundos de error acumula como mucho entre sincronizaciones?', 0.864, 's', '6 h = 21 600 s. Error = 40 × 10⁻⁶ × 21 600 = 0,864 s.', { tol: 0.01, c: 'io_time', l: 'io41', h: 'Pasa las horas a segundos y multiplica por la deriva en partes por millón.' }),
  TU('Tu nodo tiene un reloj con 50 ppm de deriva. Elige cada cuánto sincronizar para que el error nunca pase de 1 s, sincronizando lo menos posible.', 'io_drift', PP.drift({ ppm: FX(50) }), { q: 'err', min: 0.5, max: 1, text: 'Objetivo: error de 1 s como mucho, con el intervalo más largo', hint: 'Calcula el error de cada intervalo.' }, 'Cada 3 h: 50 × 10⁻⁶ × 10 800 s = 0,54 s. Cada 6 h ya serían 1,08 s.', { c: 'io_time', l: 'io41', h: 'Error = ppm × 10⁻⁶ × segundos: prueba los intervalos de menor a mayor.' }),
  Q('Guardas lecturas en hora local. El último domingo de octubre aparecen dos lecturas a las 2:30 con distinto valor. ¿Qué ha pasado?', ['Esa hora se repite al volver al horario de invierno; en UTC no pasaría', 'El nodo ha enviado dos veces por error', 'El NTP ha fallado', 'Es un fallo de la base de datos'], 'Al atrasar el reloj, de 2:00 a 3:00 hay dos veces la misma hora local. En UTC no hay horas repetidas: guarda en UTC y convierte al mostrar.', { c: 'io_time', l: 'io41', h: 'Piensa en qué ocurre esa madrugada con los relojes de la península.' }),
  Q('Un nodo sella cada lectura con time(nullptr) nada más arrancar, y el servidor recibe fechas de 1970. ¿Arreglo?', ['Esperar a tener la hora por NTP (getLocalTime confirma) antes de sellar lecturas', 'Restar 1970 a cada marca', 'Usar millis() como fecha', 'Que el servidor ignore el año'], 'Al arrancar, el ESP32 no sabe la hora y cuenta desde 1970. Hasta que NTP responda, sus marcas no valen.', { c: 'io_time', l: 'io41', h: '¿Qué hora cree tener el ESP32 al arrancar, antes de preguntar a nadie?' }),
  Nm('Con esta línea de InfluxDB, tienes 2 casas y 3 fases en cada una. ¿Cuántas series distintas se crean?', 6, 'series', 'Cada combinación distinta de etiquetas es una serie: 2 casas × 3 fases = 6. Potencia y tensión son campos y no crean series.', { tol: 0, c: 'io_tsdb', l: 'io23', code: 'energia,casa=principal,fase=L1 potencia=812,tension=231.4', h: 'Cuenta solo las etiquetas (antes del espacio) y multiplica sus valores posibles.' }),
  Q('¿Por qué no pondrías la temperatura medida como etiqueta en InfluxDB?', ['Tiene muchísimos valores distintos: cada uno crearía una serie y la cardinalidad se dispararía', 'Porque las etiquetas no admiten números', 'Porque se guardaría dos veces', 'Porque Grafana no puede leer etiquetas'], 'Las etiquetas identifican la serie y deben tener pocos valores posibles. Lo medido va en campos.', { c: 'io_tsdb', l: 'io23', h: '¿Qué pasa con el número de series cuando una etiqueta cambia en cada lectura?' }),
  Nm('Un sensor mide cada 30 s y guardas los datos crudos 14 días. ¿Cuántos puntos crudos tiene esa serie como máximo?', 40320, 'puntos', '86 400 / 30 = 2880 puntos al día; × 14 = 40 320 puntos.', { tol: 1, c: 'io_datavol', l: 'io23', h: 'Puntos al día por días de retención.' }),
  Q('Una cámara frigorífica tiene media 5 °C y desviación típica 0,8 °C. Con el criterio de 3σ, ¿qué lectura es sospechosa?', ['7,6 °C', '6,9 °C', '4,0 °C', '2,7 °C'], '3σ = 2,4 °C: lo normal va de 2,6 a 7,4 °C. Solo 7,6 °C se sale.', { c: 'io_anomaly', l: 'io24', h: 'Calcula 3σ y súmalo y réstalo a la media.' }),
  Q('Un sensor de humedad del suelo publica cada 10 minutos; ayer dejó de publicar a las 14:00 y la alarma «si baja del 20 %» no avisó. ¿Qué detector faltaba?', ['Silencio: avisar si faltan 2 o 3 envíos seguidos', 'Un umbral más alto', 'Velocidad de cambio', 'Valor congelado'], 'Sin datos, ningún detector que mire valores puede saltar. Hace falta vigilar la ausencia de datos.', { c: 'io_anomaly', l: 'io24', h: '¿Qué ve un umbral cuando no llega ningún valor?' }),
  Q('En «cuando se abre la puerta, si es de noche, enciende la luz del pasillo», ¿qué es «si es de noche»?', ['Una condición', 'El disparador', 'La acción', 'Un detector de anomalías'], 'El disparador es lo que despierta la automatización (la puerta se abre). La condición filtra (es de noche). La acción es encender la luz.', { c: 'io_automation', l: 'io24', h: '¿Qué hace que la automatización se evalúe, qué se comprueba y qué se hace?' }),
  Q('Una automatización riega si la humedad del suelo baja del 30 %. Usa la última lectura recibida, de hace dos días, y riega en plena lluvia. ¿Qué faltaba?', ['Comprobar que el dato es reciente y plausible antes de actuar', 'Un umbral más bajo', 'Más decimales en la humedad', 'Un tema MQTT más corto'], 'Antes de actuar, valida la entrada: un dato viejo describe otro momento.', { c: 'io_automation', l: 'io24', h: '¿De cuándo era el dato con el que se decidió?' })
] },

{ id: 'io-m6', title: 'Seguridad y privacidad', desc: 'Modelo de amenazas, secretos y aprovisionamiento, TLS, redes separadas, mínimo privilegio, actualizaciones firmadas y RGPD.', nodes: [
 L('io25', 'Modelo de amenazas', 'shield', ['io_security', 'io_surface'], [
  Q('¿Quién crees que es el atacante más probable de una cámara IP de casa expuesta a internet?', ['Un programa automático que prueba contraseñas conocidas', 'Un servicio de inteligencia', 'Tu vecino con una antena', 'Nadie: es una casa normal'], 'Los ataques masivos y automáticos son, con mucho, lo más común. Y se frenan con medidas sencillas.', { predict: true, c: 'io_surface', h: 'Piensa en quién puede probar millones de direcciones al día.' }),
  { t: 'explore', text: 'Cada amenaza tiene una probabilidad y un impacto (de 1 a 3). Riesgo = probabilidad × impacto. Recorre la lista y aplica defensas.', viz: 'io_risk', params: PP.risk(),
    tasks: [
      { q: 'riesgo', min: 9, max: 9, text: 'Encuentra la amenaza con más riesgo', done: 'Muy probable y muy grave: la primera de la lista de tareas.', hint: 'Recorre las amenazas.' },
      { q: 'topMit', min: 1, max: 1, text: 'Aplícale su defensa', done: 'Una contraseña única y no exponerla bajan mucho la probabilidad.' },
      { q: 'bajoSinDef', min: 1, max: 1, text: 'Encuentra una amenaza de riesgo tan bajo que puedes dejarla para el final', done: 'Poco probable y de impacto moderado: no es lo primero.' }
    ] },
  I('La seguridad empieza con cuatro preguntas. Eso es un <b>modelo de amenazas</b>:', { svg: FLOW(['¿Qué protejo?', '¿De quién?', '¿Qué puede fallar?', '¿Qué hago?'], 'y se revisa cada vez que cambia el sistema') }),
  I('El atacante más probable de tu casa no es un espía: es un <b>programa automático</b> que barre internet probando contraseñas de fábrica y fallos conocidos. Lo detiene algo aburrido y eficaz.', { svg: CHK([['Contraseñas únicas, nunca las de fábrica', 1], ['Nada expuesto a internet', 1], ['Firmware y sistema al día', 1], ['Servicios que no usas, apagados', 1]], 'Lo aburrido que funciona') }),
  I('La <b>superficie de ataque</b> es todo lo que un atacante puede tocar. Cada cosa que quitas es una cosa menos que defender.', { svg: CHK([['Puertos abiertos y servicios web', 2], ['La radio (WiFi, Bluetooth)', 2], ['El puerto USB y la actualización por red', 2], ['La app del móvil y la nube del fabricante', 2]], 'Superficie de ataque de un nodo') }),
  I('Piensa también en el <b>acceso físico</b>: un nodo en el jardín o en el portal se puede robar. Si guarda la clave del WiFi tal cual en su memoria, quien lo coja la puede leer. Diseña para que robar un nodo valga poco.', { svg: VS({ t: 'Mal diseño', l: ['clave del WiFi principal', 'usuario compartido', 'el ladrón entra en casa'], c: 'var(--err)' }, { t: 'Buen diseño', l: ['red IoT aislada', 'credencial propia', 'la revocas y listo'], c: 'var(--ok)' }) }),
  { t: 'steps', text: 'Modelo de amenazas rápido para una cerradura conectada.', steps: ['¿Qué protejo? Que la puerta solo la abra quien debe.', '¿De quién? De robots de internet, de quien esté en mi red y de quien toque la cerradura.', '¿Qué puede fallar? Contraseña débil, app en la nube comprometida, nodo de la red que manda «abrir».', '¿Qué hago? Control local, credencial propia con mínimos permisos, red IoT separada y llave física de respaldo.'], result: 'Defensas para lo más grave y probable primero.' },
  { t: 'match', q: 'Une cada activo con su amenaza principal.', pairs: [['Cerradura conectada', 'Que alguien la abra a distancia'], ['Datos de consumo eléctrico', 'Que revelen cuándo no hay nadie'], ['Cámara barata', 'Que acabe en una red de aparatos infectados'], ['Broker MQTT', 'Que alguien publique órdenes falsas']], c: 'io_security', h: 'Pregúntate qué sería lo peor que podría pasar con cada uno.' },
  Q('Una cámara con la contraseña de fábrica no está expuesta a internet. ¿Qué haces igualmente?', ['Cambiarla por una contraseña única', 'Nada: sin exposición no hay riesgo', 'Abrir su puerto para probarla', 'Subir la resolución'], 'Si algo de tu red cae, será lo siguiente.', { c: 'io_surface', h: '¿Y si otro aparato de tu red ya está comprometido?' }),
  Q('¿Qué reduce la superficie de ataque de un nodo ESP32?', ['Quitar el servidor web de configuración cuando ya no se usa', 'Añadir más funciones', 'Abrir más puertos', 'Enviar más datos'], 'Menos servicios, menos puertas.', { c: 'io_surface', h: '¿Cuál quita algo que se puede atacar?' }),
  Q('Te roban el nodo de la estación del jardín. ¿Qué debería poder hacer el ladrón con lo que hay dentro?', ['Como mucho, entrar en la red IoT aislada con unas credenciales que tú revocas', 'Entrar en tu red principal y en tus ordenadores', 'Abrir tu cerradura', 'Nada nunca, pase lo que pase'], 'Diseña para que robar un nodo valga poco.', { c: 'io_security', h: 'Recuerda el buen diseño frente al acceso físico.' }),
  { t: 'order', q: 'Ordena el proceso de un modelo de amenazas sencillo.', items: ['Dibujar el sistema y sus flujos de datos', 'Listar lo que quiero proteger', 'Imaginar qué puede salir mal en cada flujo', 'Elegir defensas para lo más grave y probable', 'Revisarlo cuando cambie el sistema'], e: 'No es un documento que se hace una vez y se olvida.', c: 'io_security', h: 'Primero entender el sistema; al final, volver a empezar.' },
  Q('¿Qué riesgo atenderías primero?', ['Muy probable y grave: contraseña de fábrica en un aparato expuesto', 'Improbable y leve', 'Improbable y grave: un ataque de laboratorio al chip', 'Probable y leve: que un vecino vea el nombre de tu red'], 'Probabilidad × impacto.', { c: 'io_security', h: 'Multiplica probabilidad por impacto.' }),
  I('<b>Resumen</b>\n· Modelo de amenazas: qué protejo, de quién, qué puede fallar y qué hago.\n· Riesgo = probabilidad × impacto: lo alto, primero.\n· El atacante típico es un robot: contraseñas únicas, nada expuesto, todo al día.\n· Menos superficie de ataque; que robar un nodo valga poco.')
 ]),
 L('io26', 'Credenciales fuera del código y aprovisionamiento', 'shield', ['io_secrets'], [
  Q('Subes tu proyecto a un repositorio público con la clave del WiFi en el código y la borras en el commit siguiente. ¿Crees que está a salvo?', ['No: sigue en el historial y hay robots buscando claves', 'Sí, ya no está', 'Sí, si el repositorio es pequeño', 'Sí, si fue hace menos de una hora'], 'Una clave publicada es una clave quemada: hay que cambiarla. Mejor que nunca llegue al código.', { predict: true, c: 'io_secrets', h: '¿Qué guarda git de los commits anteriores?' }),
  { t: 'explore', text: 'Seis nodos, una clave y dos incidentes. Decide dónde guardas la clave y si cada nodo tiene la suya.', viz: 'io_creds', params: PP.creds(),
    tasks: [
      { q: 'expuesta', min: 0, max: 0, text: 'Con el repositorio publicado, haz que la clave no se filtre', done: 'Fuera del código, el repositorio no la contiene.', hint: 'Sácala del código.' },
      { q: 'revUno', min: 1, max: 1, text: 'Ahora pasa al robo de un nodo: consigue que solo haya que cambiar una credencial', done: 'Con una credencial por nodo, revocas la del robado y los demás siguen.', hint: 'Incidente «Robo de un nodo» y una credencial por nodo.' },
      { q: 'roboSeguro', min: 1, max: 1, text: 'Y que el ladrón no pueda leerla aunque vuelque el chip', done: 'Solo el cifrado de flash protege lo guardado frente a quien tiene el chip.' }
    ] },
  I('Niveles de protección de una credencial, de menos a más:', { svg: CHK([['1 · secrets.h fuera de git (.gitignore)', 2], ['2 · En la memoria NVS, metida al configurar', 2], ['3 · Una credencial distinta por nodo', 2], ['4 · Flash cifrada (protege frente al robo)', 2]], 'Cada nivel añade algo') }),
  I('La <b>NVS</b> es una zona de la flash para guardar pares clave-valor que sobreviven a los reinicios. Con la librería Preferences, el mismo firmware sirve para todos los nodos y no contiene secretos.', { code: '#include <Preferences.h>\n\nPreferences prefs;\n\nvoid guardarRed(const char* ssid, const char* clave) {\n  prefs.begin("red", false);   // espacio "red", lectura y escritura\n  prefs.putString("ssid", ssid);\n  prefs.putString("clave", clave);\n  prefs.end();\n}\n\nString leerSsid() {\n  prefs.begin("red", true);    // solo lectura\n  String s = prefs.getString("ssid", "");\n  prefs.end();\n  return s;\n}' }),
  I('<b>Aprovisionar</b> es darle a un nodo nuevo sus credenciales. Formas habituales:', { svg: CHK([['Portal cautivo: el nodo crea su WiFi y una página', 2], ['Improv por USB o Bluetooth', 2], ['Por el puerto serie, desde un script en tu PC', 2], ['El portal: con contraseña y que se apague', 1]], 'Cómo recibe sus claves') }),
  I('La NVS no está cifrada por defecto: quien tenga el chip en la mano puede volcar la flash y leerla. Para eso existe el <b>cifrado de flash</b> del ESP32, que se activa quemando eFuses y es <b>irreversible</b>: practica antes con una placa de sobra.', { svg: VS({ t: 'NVS normal', l: ['separa código y claves', 'quien vuelca el chip', 'puede leerlas'], c: 'var(--led)' }, { t: 'Con flash cifrada', l: ['el volcado es ilegible', 'protege lo guardado', 'no se puede deshacer'], c: 'var(--ok)' }) }),
  { t: 'steps', text: 'Un mismo firmware para diez nodos, cada uno con sus credenciales.', steps: ['Compilas un solo firmware sin ninguna clave dentro.', 'Primer arranque: no encuentra credenciales en NVS → abre un portal de configuración con contraseña.', 'Le das la red WiFi y su usuario del broker (salon, cocina…).', 'Las guarda en NVS y cierra el portal; desde entonces arranca solo.', 'Si te roban uno, revocas su usuario en el broker y los demás ni se enteran.'], result: 'Un firmware, muchas identidades, cada una revocable.' },
  Q('Una clave ya se ha publicado por error. ¿Qué haces?', ['Cambiarla: considérala quemada', 'Borrar el archivo y olvidarlo', 'Hacer el repositorio privado y ya', 'Nada si nadie se ha quejado'], 'Una clave publicada es una clave quemada.', { c: 'io_secrets', h: '¿Puedes estar seguro de que nadie la copió?' }),
  Q('¿Qué ganas guardando las credenciales en NVS en vez de en el código?', ['El mismo firmware sirve para todos los nodos y no contiene secretos', 'Más velocidad', 'Cifrado automático siempre', 'Nada'], 'Separas el programa de su configuración.', { c: 'io_secrets', h: 'Piensa en compartir el firmware.' }),
  Q('El portal cautivo crea una red WiFi para configurar el nodo. ¿Qué precaución tomas?', ['Ponerle contraseña y que se apague tras configurar o tras unos minutos', 'Dejarlo siempre activo', 'Publicarlo en internet', 'Ninguna'], 'Un portal abierto permanente es una puerta.', { c: 'io_secrets', h: '¿Quién podría conectarse a esa red?' }),
  Q('¿Qué protege el cifrado de flash?', ['Que alguien con el chip en la mano lea el firmware y las claves', 'La conexión WiFi', 'Que alguien en la red lea los mensajes', 'El consumo'], 'Protege los datos guardados, no los que viajan.', { c: 'io_secrets', h: 'Recuerda el tercer reto de la exploración.' }),
  { t: 'match', q: 'Une cada técnica con lo que resuelve.', pairs: [['.gitignore con secrets.h', 'Que la clave acabe en el repositorio'], ['NVS con Preferences', 'Un mismo firmware para todos los nodos'], ['Credencial por nodo', 'Revocar un nodo robado sin tocar el resto'], ['Cifrado de flash', 'Leer las claves volcando el chip']], c: 'io_secrets', h: 'Repasa la escalera de niveles.' },
  Q('Dos nodos comparten usuario y clave del broker. Pierdes uno. ¿Qué tienes que hacer?', ['Cambiar la clave en todos los nodos que la compartían', 'Nada', 'Cambiar solo el canal WiFi', 'Reiniciar el broker'], 'Por eso, una credencial por nodo.', { c: 'io_secrets', h: 'El ladrón tiene una clave que también usa el otro nodo.' }),
  I('<b>Resumen</b>\n· Nada de claves en el código; una clave publicada se cambia.\n· NVS: firmware sin secretos; credencial por nodo: se revoca una sola.\n· Portal de configuración con contraseña y temporal.\n· Solo el cifrado de flash protege frente al robo del chip.')
 ]),
 L('io27', 'TLS y certificados: qué protege y qué no', 'shield', ['io_tls'], [
  Q('Tu nodo envía al broker usuario y contraseña por MQTT sin cifrar (puerto 1883). Alguien conecta un portátil a tu WiFi. ¿Qué crees que puede ver?', ['El usuario, la contraseña y todos los mensajes', 'Nada: MQTT es seguro', 'Solo que hay tráfico', 'Solo el tema'], 'Sin cifrar, todo viaja en claro. TLS lo mete en un túnel… si se configura bien.', { predict: true, c: 'io_tls', h: '¿Qué significa «sin cifrar»?' }),
  { t: 'explore', text: 'Un atacante está en medio del camino entre el ESP32 y el broker. Elige cómo se conecta el nodo y qué hace el atacante.', viz: 'io_tlsviz', params: PP.tls(),
    tasks: [
      { q: 'lee', min: 0, max: 0, text: 'Haz que el espía no pueda leer nada', done: 'Con TLS, solo ve bytes cifrados.', hint: 'Activa TLS.' },
      { q: 'engañado', min: 1, max: 1, text: 'Ahora el atacante se hace pasar por el broker: comprueba que setInsecure() no basta', done: 'Cifra, pero no comprueba con quién habla: el impostor lo recibe todo.', hint: 'TLS con setInsecure() y un atacante que suplanta.' },
      { q: 'detecta', min: 1, max: 1, text: 'Haz que el nodo detecte al impostor', done: 'Verificando el certificado con tu CA, el impostor no pasa.' }
    ] },
  I('<b>TLS</b> (lo que hay detrás de HTTPS y de MQTT en el 8883) da tres cosas:', { svg: CHK([['Confidencialidad: nadie en medio lee', 1], ['Integridad: nadie en medio cambia nada sin que se note', 1], ['Autenticación del servidor: si compruebas su certificado', 1]], 'Lo que da TLS') }),
  I('Un <b>certificado</b> es la clave pública del servidor, con sus nombres, firmada por una <b>autoridad de certificación</b> (CA). El cliente confía en la CA y, por tanto, en lo que firma. En casa puedes crear tu propia CA.', { svg: FLOW(['Tu CA', 'firma', 'Certificado del broker', 'El nodo lo comprueba'], 'al nodo solo va lo público: el certificado de la CA') }),
  I('Lo que TLS <b>no</b> protege:', { svg: CHK([['Un broker que admite anónimos sigue abierto', 0], ['Metadatos: quién habla, cuándo y cuánto', 0], ['Un nodo comprometido cifra muy bien sus mentiras', 0], ['Lo que el servidor haga luego con tus datos', 0]], 'Fuera del túnel') }),
  I('Los certificados llevan <b>nombres e IP</b> válidos (subjectAltName) y una <b>fecha de caducidad</b>. Si el nodo conecta con un nombre que no está, falla (y es lo correcto). Comprobar fechas exige que el nodo esté en hora.', { code: 'Sujeto:          broker.local\nsubjectAltName:  DNS:broker.local, IP:192.168.1.10\nVálido hasta:    1 de marzo de 2028\nFirmado por:     CA de casa' }),
  I('En el ESP32, WiFiClientSecure con el certificado de tu CA. setInsecure() cifra pero no comprueba con quién hablas: evítalo.', { code: '#include <WiFiClientSecure.h>\n\nWiFiClientSecure red;\nPubSubClient mqtt(red);\n\nvoid setup() {\n  red.setCACert(CA_CASA);              // certificado de tu CA (texto PEM)\n  mqtt.setServer("broker.local", 8883);\n}', more: 'Un paso más es <b>TLS mutuo</b>: el nodo también presenta un certificado propio firmado por tu CA, así el broker sabe qué nodo es sin contraseñas y revocarlo es retirar su certificado. TLS cuesta en el ESP32 decenas de kB de RAM y tiempo de conexión: si puedes, mantén la conexión abierta.' }),
  { t: 'steps', text: 'Conecta un ESP32 a tu broker con TLS y una CA propia.', steps: ['En tu PC creas la CA: su clave privada se queda en un sitio seguro, fuera de la Pi.', 'Creas la clave del broker y un certificado con sus nombres (broker.local y su IP), firmado por la CA.', 'Mosquitto escucha en el 8883 con su certificado y su clave privada.', 'El ESP32 lleva solo el certificado de la CA y conecta a broker.local:8883.', 'El nodo debe estar en hora (NTP) para comprobar las fechas.'], result: 'Cifrado y con la certeza de hablar con tu broker.' },
  Q('¿Qué necesita el ESP32 para comprobar el certificado de tu broker con CA propia?', ['El certificado de tu CA (setCACert)', 'La clave privada del broker', 'La clave privada de la CA', 'Nada'], 'Lo público va al nodo; lo privado no sale del broker ni de tu caja fuerte.', { c: 'io_tls', h: 'Al nodo solo le hace falta lo público.' }),
  Q('¿Qué archivo no debe salir nunca del broker?', ['La clave privada del broker', 'El certificado del broker', 'El certificado de la CA', 'La configuración sin claves'], 'La clave privada es lo único secreto del broker.', { c: 'io_tls', h: 'De los cuatro, ¿cuál es secreto?' }),
  Q('Tu broker usa TLS pero tiene allow_anonymous true. ¿Está protegido?', ['No: cualquiera puede conectarse; eso sí, cifrado', 'Sí, TLS lo arregla todo', 'Sí, si el certificado es caro', 'Solo en IPv6'], 'Cifrar no es autenticar al cliente.', { c: 'io_tls', h: 'Repasa lo que TLS no protege.' }),
  Q('Alguien en tu red ve el tráfico TLS de un nodo hacia el broker cada 5 min. ¿Qué puede deducir?', ['Que el nodo existe, su ritmo y el tamaño de sus mensajes, pero no el contenido', 'Las temperaturas', 'La clave del WiFi', 'Nada en absoluto'], 'Los metadatos quedan a la vista.', { c: 'io_tls', h: 'Lo de fuera del túnel también cuenta cosas.' }),
  Q('Un nodo conecta al broker por IP y el certificado solo incluye el nombre broker.local. ¿Qué pasa?', ['Falla la verificación del nombre: añade la IP al certificado o conecta por nombre', 'Funciona igual', 'Se desactiva el cifrado', 'El broker cambia de IP'], 'El nombre que usas debe estar en el certificado.', { c: 'io_tls', h: 'Mira qué nombres incluye el certificado.' }),
  { t: 'match', q: 'Une cada pieza de TLS con su papel.', pairs: [['Certificado de la CA', 'Va en todos los clientes para verificar'], ['Clave privada del broker', 'Solo en el broker'], ['subjectAltName', 'Nombres e IP válidos del servidor'], ['Certificado de cliente', 'Identifica al nodo en TLS mutuo']], c: 'io_tls', h: 'Distingue lo público de lo privado.' },
  Q('Un nodo envía la cabecera Authorization: Bearer … por HTTP (sin S) en tu WiFi. ¿Riesgo?', ['Cualquiera que capture el tráfico puede copiar el token', 'Ninguno, es solo una cabecera', 'Que se borra solo', 'Solo afecta a la velocidad'], 'Credenciales, siempre por HTTPS.', { c: 'io_tls', h: 'Sin la S no hay túnel.' }),
  I('<b>Resumen</b>\n· TLS: confidencialidad, integridad y autenticación del servidor (si verificas).\n· Al nodo, el certificado de la CA; la clave privada no sale del broker.\n· setInsecure() no comprueba con quién hablas.\n· TLS no autentica al cliente ni oculta los metadatos.')
 ]),
 PRJ('io-p6', 'Proyecto: tu propio broker MQTT seguro', 'io_broker'),
 L('io28', 'Red separada, mínimo privilegio y actualizaciones', 'shield', ['io_segment', 'io_otasign', 'io_surface', 'io_security'], [
  Q('Una bombilla WiFi barata tiene un fallo y alguien la controla. Está en la misma red que tu portátil. ¿Qué crees que puede alcanzar?', ['Tu portátil, tu móvil y todo lo de esa red', 'Solo a sí misma', 'Nada, es una bombilla', 'Solo el router'], 'En una red plana, cualquier aparato habla con cualquiera. La defensa es separar.', { predict: true, c: 'io_segment', h: 'En una misma red, ¿quién puede hablar con quién?' }),
  { t: 'explore', text: 'La bombilla está comprometida. Separa redes y pon reglas en el cortafuegos del router.', viz: 'io_segviz', params: PP.seg(),
    tasks: [
      { q: 'alcanza', min: 0, max: 0, text: 'Consigue que la bombilla no alcance tus equipos', done: 'En su propia red, no ve tus ordenadores ni tus móviles.', hint: 'Separa la red IoT.' },
      { q: 'aislada', min: 1, max: 1, text: 'Y que tampoco pueda salir a internet', done: 'Solo habla con el broker y con NTP: aunque esté comprometida, no puede hacer casi nada.' }
    ] },
  I('<b>Red separada</b>: los aparatos IoT en su propia red (la de invitados con aislamiento de clientes, o una VLAN). Desde tu red principal llegas a ellos; ellos a tu red, no.', { svg: VS({ t: 'Red plana', l: ['todo junto', 'un aparato caído', 've todo lo demás'], c: 'var(--err)' }, { t: 'Red separada', l: ['IoT en su red', 'un aparato caído', 'queda encerrado'], c: 'var(--ok)' }) }),
  I('Reglas típicas del cortafuegos para la red IoT:', { svg: CHK([['Puede hablar con el broker y con NTP', 1], ['No puede iniciar conexiones a la red principal', 1], ['Si no necesita internet, no sale a internet', 1], ['Sin reglas: todo permitido', 0]], 'Cortafuegos') }),
  I('<b>Mínimo privilegio</b> en todo: cada pieza con el permiso justo. Si una credencial se filtra, el daño se queda pequeño.', { svg: CHK([['Cada nodo: su usuario del broker, solo sus temas', 1], ['Panel: leer y mandar órdenes', 1], ['Telegraf: solo escribir en su base de datos', 1], ['Grafana: solo leer lo que dibuja', 1]], 'Un permiso por tarea') }),
  I('<b>Actualizar</b> cierra fallos conocidos. En tus nodos, la actualización por la red (<b>OTA</b>, «por el aire») debe aceptar solo imágenes <b>firmadas</b> con tu clave, para que nadie le meta un firmware suyo. Cómo volver atrás si algo sale mal lo verás en el módulo de fiabilidad.', { svg: FLOW(['Firmware nuevo', 'Firmado con tu clave', 'El nodo verifica', 'Instala'], 'una firma falsa se rechaza'), more: 'La normativa europea también empuja: desde el 1 de agosto de 2025, los equipos de radio conectados a internet que se venden en la UE deben cumplir requisitos de ciberseguridad (acto delegado de la Directiva de equipos radioeléctricos), y el Reglamento de Ciberresiliencia exigirá, entre otras cosas, actualizaciones de seguridad durante la vida del producto a partir de diciembre de 2027.' }),
  { t: 'steps', text: 'Diseña la red IoT de tu casa.', steps: ['Crea una red WiFi solo para IoT (invitados con aislamiento, o una VLAN).', 'Mueve allí bombillas, enchufes y tus nodos; el broker puede quedarse en la principal.', 'Cortafuegos: la red IoT solo llega al broker (8883) y a NTP; nada hacia la red principal.', 'Desactiva UPnP y WPS en el router si no los usas.', 'Revisa: desde la red IoT, un ping a tu portátil no debe responder.'], result: 'Si algo cae, cae solo.' },
  Q('Una bombilla WiFi comprometida está en tu red principal. ¿Qué riesgo añade frente a tenerla en una red IoT aislada?', ['Puede atacar a tus ordenadores y espiar el tráfico local', 'Ninguno', 'Que gaste más', 'Que cambie de color'], 'La red separada contiene el daño.', { c: 'io_segment', h: 'Recuerda la primera tarea de la exploración.' }),
  { t: 'order', q: 'Ordena de más a menos restrictivo para un nodo sensor casero.', items: ['Solo puede hablar con el broker local', 'Puede hablar con el broker y con un servidor NTP', 'Puede salir a cualquier sitio de internet', 'Está en la red principal sin restricciones'], e: 'Mínimo privilegio también en la red.', c: 'io_segment', h: 'Cuantos menos destinos, más restrictivo.' },
  Q('¿Qué token le das a Grafana para leer de InfluxDB?', ['Uno de solo lectura sobre el bucket que necesita', 'El de administrador', 'Uno de escritura en todo', 'Ninguno, sin autenticación'], 'Si se filtra, que no pueda borrar nada.', { c: 'io_segment', h: '¿Qué necesita hacer Grafana con los datos?' }),
  Q('¿Qué impide la firma de las imágenes OTA?', ['Que alguien instale en tu nodo un firmware que no has hecho tú', 'Que la OTA sea lenta', 'Que se pierdan datos', 'Que se caiga el WiFi'], 'El nodo solo acepta lo firmado con tu clave.', { c: 'io_otasign', h: '¿Quién tiene la clave con la que se firma?' }),
  Q('Desactivar UPnP y WPS en el router es un ejemplo de…', ['Reducir la superficie de ataque', 'Cifrado', 'Aprovisionamiento', 'Calibración'], 'Lo que no usas, apagado.', { c: 'io_surface', h: 'Son funciones que no usas y que se pueden atacar.' }),
  { t: 'match', q: 'Une cada medida con su principio.', pairs: [['Red IoT aislada', 'Contener el daño'], ['ACL por nodo en el broker', 'Mínimo privilegio'], ['OTA firmada', 'Integridad del firmware'], ['Desactivar UPnP', 'Menos superficie de ataque']], c: 'io_security', h: 'Cada medida sirve a una idea distinta.' },
  I('<b>Resumen</b>\n· Red IoT separada y cortafuegos: lo que cae, cae solo.\n· Mínimo privilegio: cada credencial, el permiso justo.\n· OTA solo con imágenes firmadas.\n· Apaga lo que no uses (UPnP, WPS).')
 ]),
 L('io29', 'Privacidad, RGPD y lecciones de ataques reales', 'shield', ['io_privacy', 'io_surface', 'io_segment', 'io_local'], [
  Q('¿Crees que la curva de consumo eléctrico de tu casa es un dato personal?', ['Sí: revela tus rutinas', 'No: es solo electricidad', 'Solo si lleva tu nombre', 'Solo en empresas'], 'Un dato es personal si dice algo de una persona identificable. Tu consumo cuenta a qué hora te levantas y cuándo no hay nadie.', { predict: true, c: 'io_privacy', h: '¿Qué se podía ver en la gráfica de consumo?' }),
  { t: 'explore', text: 'Consumo de una casa en un día. Cuanto más fina la resolución, más se ve de la vida de quien vive ahí.', viz: 'io_privviz', params: PP.priv(),
    tasks: [
      { q: 'eventos', min: 0, max: 1, text: 'Baja la resolución hasta que solo se distinga una rutina como mucho', done: 'Con medias horarias apenas se ve el horno: suficiente para la factura, poco para espiar.', hint: 'Prueba un dato cada hora.' },
      { q: 'eventos', min: 0, max: 0, text: 'Ahora que no se distinga ninguna', done: 'Con un dato al día solo queda el total: minimización máxima.' }
    ] },
  I('El <b>RGPD</b> (y en España, además, la LOPDGDD) protege los datos personales. Los de un sensor lo son si dicen algo de una persona identificable.', { svg: VS({ t: 'Personales', l: ['entradas y salidas', 'consumo de un hogar', 'presencia en casa'], c: 'var(--err)' }, { t: 'No personales', l: ['invernadero vacío', 'humedad de un bancal', 'presión atmosférica'], c: 'var(--ok)' }) }),
  I('Principios útiles aunque sea tu casa:', { svg: CHK([['Minimización: recoge solo lo necesario', 2], ['Finalidad: úsalo solo para lo que lo recoges', 2], ['Conservación limitada: bórralo cuando no sirva', 2], ['Transparencia: que quien vive contigo lo sepa', 2], ['Seguridad: protégelo', 2]], 'Principios del RGPD') }),
  I('Las cámaras merecen cuidado extra: en España, una cámara privada no debe grabar la vía pública más allá de lo imprescindible para su finalidad, y grabar a terceros conlleva obligaciones (carteles informativos, entre otras). Ante la duda, consulta la Agencia Española de Protección de Datos.', { svg: CHK([['Enfoca solo tu propiedad', 1], ['Cartel informativo si graba a otras personas', 1], ['Conserva lo justo y bórralo', 1], ['Grabar la calle «por si acaso»', 0]], 'Una cámara en casa') }),
  I('Lección real 1, <b>Mirai</b> (2016): un programa se propagó por cientos de miles de cámaras y grabadores probando por telnet una lista corta de usuarios y contraseñas de fábrica. Con ellos lanzó ataques que dejaron sin servicio a webs muy conocidas durante horas.', { svg: FLOW(['Barre internet', 'Telnet abierto', 'Clave de fábrica', 'Aparato infectado', 'Ataca a otros'], 'cada paso se frenaba con una medida sencilla') }),
  I('Lección real 2: se conocen casos en los que un aparato secundario (el termómetro conectado de un acuario, un sistema de climatización) fue la puerta de entrada a la red de una empresa. La lección: el cacharro menos importante no debe ver lo más importante.', { svg: FLOW(['Aparato secundario', 'Red plana', 'Datos importantes'], 'con redes separadas, el camino se corta en el segundo paso') }),
  { t: 'steps', text: 'Aplica los principios a un sensor de presencia del salón.', steps: ['Finalidad: encender la luz y la calefacción cuando hay alguien. Nada más.', 'Minimización: «hay alguien / no hay nadie», sin cámara ni micrófono.', 'Conservación: el detalle, 7 días; luego, solo horas de uso al día.', 'Transparencia: quien vive en casa sabe que existe y para qué.', 'Seguridad: en local, en la red IoT y con su propia credencial.'], result: 'Útil, y sin convertirse en un registro de tu vida.' },
  Q('¿Cuál de estos datos es personal?', ['La hora de entrada y salida de un empleado medida por un sensor en su puesto', 'La temperatura media de un invernadero vacío', 'La humedad del suelo de un huerto', 'La presión atmosférica'], 'Lo que se puede asociar a una persona.', { c: 'io_privacy', h: '¿Cuál habla de alguien concreto?' }),
  { t: 'match', q: 'Une cada principio con un ejemplo.', pairs: [['Minimización', 'Contar personas sin cámara'], ['Conservación limitada', 'Borrar los datos crudos a los 30 días'], ['Transparencia', 'Avisar a quien entra de que hay un sensor'], ['Finalidad', 'Usar el CO₂ solo para ventilar']], c: 'io_privacy', h: 'Repasa la lista de principios.' },
  Q('En un aula quieres saber cuándo ventilar. ¿Qué opción respeta más la privacidad?', ['Un medidor de CO₂, que no identifica a nadie', 'Una cámara que cuenta alumnos', 'Registrar los móviles por WiFi', 'Un micrófono que mide el ruido y graba'], 'Mide lo que necesitas, no a las personas.', { c: 'io_privacy', h: '¿Cuál mide el aire y no a las personas?' }),
  Q('¿Qué habría frenado a Mirai en un aparato concreto?', ['Contraseña única, telnet cerrado y no estar expuesto a internet', 'Más memoria, más CPU y más antenas', 'Mensajes retenidos y testamento', 'Un canal WiFi distinto'], 'Defensas aburridas y eficaces.', { c: 'io_surface', h: 'Recorre los pasos de su propagación.' }),
  Q('¿Qué enseñan los casos del acuario y la climatización sobre la red de casa?', ['Que los aparatos IoT deben ir en una red separada de tus equipos importantes', 'Que no hay que tener acuario', 'Que el WiFi siempre es inseguro', 'Nada aplicable'], 'Contención.', { c: 'io_segment', h: '¿Por dónde entró el atacante y hasta dónde llegó?' }),
  Q('El fabricante de tus cámaras sufre una brecha y se filtran sus credenciales de administración. ¿Qué diseño te protege mejor?', ['Uno que no depende de la nube del fabricante para ver tus cámaras', 'Uno con más megapíxeles', 'Uno con una app más bonita', 'Ninguno'], 'Lo local reduce los terceros que pueden fallar.', { c: 'io_local', h: '¿Qué pasa con tus cámaras si no dependen de ese fabricante?' }),
  I('<b>Resumen</b>\n· Los datos que hablan de personas son personales: RGPD.\n· Minimiza, limita la finalidad y el tiempo, informa y protege.\n· Mirai: contraseñas de fábrica y telnet. Acuario: red plana.\n· Lo local y separado reduce lo que puede fallar.')
 ]),
 PRJ('io-p11', 'Proyecto: auditoría y bastionado de tu red IoT', 'io_hardening')
],
exam: [
  Q('Tres amenazas (probabilidad × impacto, de 1 a 3): A = 3 × 1, B = 1 × 3 y C = 2 × 3. ¿Cuál atiendes primero?', ['C', 'A', 'B', 'Da igual: todas valen lo mismo'], 'Riesgo = probabilidad × impacto: A = 3, B = 3 y C = 6. Lo más alto, primero.', { c: 'io_security', l: 'io25', h: 'Multiplica en cada una y compara.' }),
  Q('Modelo de amenazas de tu cerradura: «Protejo que solo la abra quien debe; de robots de internet y de quien esté en mi red; pondré contraseñas únicas». ¿Qué pregunta te has saltado?', ['¿Qué puede fallar?', '¿Qué protejo?', '¿De quién?', '¿Qué hago?'], 'Las cuatro preguntas: qué protejo, de quién, qué puede fallar y qué hago. Sin pensar en los fallos posibles, las defensas se eligen a ciegas.', { c: 'io_security', l: 'io25', h: 'Repasa las cuatro preguntas y busca cuál no tiene respuesta.' }),
  Q('Tu nodo, ya instalado, tiene activos el portal de configuración, OTA sin contraseña y telnet para depurar. ¿Qué dejas?', ['Solo lo necesario: OTA protegida; fuera telnet y el portal', 'Todo: puede hacer falta algún día', 'Solo telnet, que es lo más útil', 'Nada: hay que quitar también la OTA'], 'Cada servicio es una puerta. Lo que no usas, fuera; lo que sí (actualizar), protegido.', { c: 'io_surface', l: 'io25', h: 'Separa lo que usarás en el día a día de lo que solo servía para montarlo.' }),
  Q('Te roban un nodo con la flash sin cifrar. Tenía su propio usuario del broker y la clave del WiFi de la red IoT. ¿Qué haces?', ['Revocar su usuario en el broker y cambiar la clave del WiFi IoT, porque se puede leer', 'Nada: la NVS es secreta', 'Cambiar las claves de todos los usuarios del broker', 'Solo reiniciar el broker'], 'Sin cifrado de flash, quien tiene el chip puede volcarlo y leer sus credenciales. Su usuario propio se revoca sin tocar los demás; la clave WiFi compartida hay que cambiarla.', { c: 'io_secrets', l: 'io26', h: 'Haz la lista de lo que había dentro del nodo y de con quién lo compartía.' }),
  Q('¿Por qué no se guarda la clave con este código?', ['Abre el espacio en solo lectura (true)', 'putString no existe', 'Falta llamar a prefs.end() antes', 'La NVS no guarda cadenas'], 'El segundo parámetro de begin() es «solo lectura». Para escribir, prefs.begin("red", false).', { c: 'io_secrets', l: 'io26', code: 'prefs.begin("red", true);\nprefs.putString("clave", nueva);\nprefs.end();', h: 'Mira qué significa el segundo parámetro de begin() en el ejemplo de la lección.' }),
  Q('Diez nodos llevan el mismo firmware. ¿Dónde vive el usuario del broker de cada uno?', ['En la NVS de cada nodo, metido al aprovisionarlo', 'En el código, con un #if por nodo', 'En el broker, que se lo envía al conectar', 'En un archivo público del repositorio'], 'El firmware no lleva secretos; cada nodo recibe sus credenciales al configurarlo y las guarda en su NVS.', { c: 'io_secrets', l: 'io26', h: '¿Cómo puede un mismo programa tener identidades distintas?' }),
  Q('Antes de activar el cifrado de flash en tu flota, ¿qué haces?', ['Probarlo en una placa de sobra: se activa quemando eFuses y no tiene vuelta atrás', 'Nada: se puede desactivar luego', 'Borrar la NVS de todos los nodos', 'Desactivar el WiFi'], 'Es irreversible: un error puede dejar una placa inservible. Practica antes donde no duela.', { c: 'io_secrets', l: 'io26', h: '¿Se puede deshacer lo que se graba en un eFuse?' }),
  Q('Un atacante en tu red se hace pasar por el broker. Tu nodo usa WiFiClientSecure con setInsecure(). ¿Qué pasa?', ['Conecta con el impostor: cifra, pero no comprueba con quién habla', 'Detecta al impostor y corta', 'No conecta: setInsecure() bloquea a los desconocidos', 'Se desactiva el cifrado'], 'setInsecure() salta la verificación del certificado. El túnel cifrado acaba en el atacante. Hay que dar al nodo el certificado de tu CA.', { c: 'io_tls', l: 'io27', h: '¿Qué comprobación se salta setInsecure()?' }),
  Q('El certificado del broker caducó ayer. ¿Qué hacen los nodos que verifican bien?', ['Rechazan la conexión hasta que renueves el certificado', 'Conectan igual: la fecha no importa', 'Pasan solos a MQTT sin cifrar', 'Piden un certificado nuevo a la CA'], 'Verificar incluye comprobar la fecha de validez. Un certificado caducado no vale: es lo correcto.', { c: 'io_tls', l: 'io27', h: '¿Qué datos del certificado comprueba un cliente bien configurado?' }),
  Q('Un nodo recién arrancado no logra conectar por TLS con tu broker y su reloj marca 1970. ¿Por qué?', ['No puede comprobar las fechas de validez del certificado: necesita la hora por NTP', 'TLS no funciona tras un reinicio', 'El broker rechaza los nodos nuevos', 'Le falta la clave privada del broker'], 'Para el nodo, en 1970 el certificado aún no es válido. Primero hora (NTP), luego TLS.', { c: 'io_tls', l: 'io27', h: '¿Qué fecha cree tener el nodo y qué fechas lleva el certificado?' }),
  { t: 'match', q: 'Une cada situación con lo que hace TLS frente a ella.', pairs: [['Alguien en la red intenta leer las temperaturas', 'Lo impide: confidencialidad'], ['Alguien cambia un mensaje por el camino', 'Se nota: integridad'], ['Un impostor se hace pasar por el broker', 'Lo descubre si verificas el certificado'], ['Alguien ve que el nodo envía cada 5 minutos', 'No lo oculta: son metadatos']], e: 'TLS da confidencialidad, integridad y autenticación del servidor (si verificas). Quién habla, cuándo y cuánto sigue a la vista.', c: 'io_tls', l: 'io27', h: 'Repasa lo que da TLS y lo que queda fuera del túnel.' },
  Q('Tu broker tiene TLS con tu CA, sin anónimos y con un usuario por nodo. Un nodo comprometido publica temperaturas falsas en su propio tema. ¿Qué lo frena?', ['Nada de eso: cifra muy bien sus mentiras; hay que detectarlo y revocar su credencial', 'TLS, que comprueba que los datos son ciertos', 'La ACL, que impide publicar datos falsos', 'El certificado de la CA'], 'TLS protege el camino, no la verdad de lo que dice un cliente legítimo. La ACL limita dónde escribe, no lo que escribe.', { c: 'io_tls', l: 'io27', h: 'Separa proteger el camino de comprobar que el que habla dice la verdad.' }),
  Q('Mueves tus nodos a la red IoT y bloqueas todo hacia la red principal, donde está el broker. Dejan de publicar. ¿Qué regla falta?', ['Permitir de la red IoT al broker, solo en su puerto (8883)', 'Abrir todo hacia la red principal', 'Abrir el 8883 del router hacia internet', 'Volver a meter los nodos en la red principal'], 'Mínimo privilegio también en la red: lo justo para funcionar, el broker en su puerto (y NTP), y nada más.', { c: 'io_segment', l: 'io28', h: '¿Con qué equipo necesitan hablar sí o sí, y en qué puerto?' }),
  Q('¿Qué permisos le das en la ACL al nodo del jardín?', ['Escribir solo bajo casa/jardin/… y leer solo sus órdenes', 'Leer y escribir en casa/#', 'Escribir en todos los temas cmd', 'Ninguno: que use el usuario del panel'], 'Si alguien se hace con ese nodo, solo podrá tocar lo suyo, no mandar en toda la casa.', { c: 'io_segment', l: 'io28', h: 'Aplica el mínimo privilegio: ¿qué necesita de verdad ese nodo?' }),
  Q('En una OTA firmada, ¿qué clave lleva el nodo para comprobar la firma?', ['La clave pública; la privada se queda en tu PC para firmar', 'La clave privada, para descifrar', 'Las dos', 'Ninguna: basta con usar HTTPS'], 'Igual que con los certificados: lo público va al nodo y lo privado no sale de tu sitio seguro. Así nadie más puede firmar imágenes válidas.', { c: 'io_otasign', l: 'io28', h: 'Piensa en qué pasaría si la clave que firma estuviera dentro de cada nodo.' }),
  Q('Grafana tiene que leer de InfluxDB y Telegraf escribir. ¿Qué tokens creas?', ['Dos: uno de solo lectura para Grafana y uno de escritura en su bucket para Telegraf', 'Uno de administrador para los dos', 'Uno de escritura para los dos', 'Ninguno: van en la misma máquina'], 'Cada pieza, el permiso justo. Si se filtra el de Grafana, no podrá borrar ni escribir nada.', { c: 'io_segment', l: 'io28', h: '¿Qué necesita hacer cada programa con la base de datos?' }),
  { t: 'match', q: 'Une cada práctica con el principio del RGPD que incumple.', pairs: [['Grabar audio para medir el nivel de ruido', 'Minimización'], ['Usar el sensor de presencia para vigilar quién entra', 'Finalidad'], ['Guardar el consumo minuto a minuto para siempre', 'Conservación limitada'], ['Un sensor oculto que nadie de la casa conoce', 'Transparencia']], e: 'Recoge solo lo necesario, úsalo solo para lo que lo recoges, bórralo cuando no sirva e informa a quien afecta.', c: 'io_privacy', l: 'io29', h: 'Para cada caso, pregúntate qué se recoge de más, para qué se usa, cuánto dura y quién lo sabe.' },
  Q('Tu cámara del portal graba media acera. ¿Qué haces?', ['Reorientarla o tapar esa zona para no grabar la vía pública más allá de lo imprescindible', 'Nada: es tu cámara', 'Subir la resolución', 'Guardar las grabaciones menos tiempo y seguir igual'], 'En España, una cámara privada no debe grabar la vía pública más allá de lo imprescindible para su finalidad.', { c: 'io_privacy', l: 'io29', h: 'Recuerda la regla para cámaras privadas y la calle.' }),
  Q('¿Es la temperatura del salón un dato personal?', ['Puede serlo: unida a una casa y a su hora, puede revelar cuándo hay gente', 'Nunca: es una magnitud física', 'Solo si lleva el nombre del dueño', 'Solo en una empresa'], 'Un dato es personal si dice algo de una persona identificable. Los cambios de temperatura de una casa habitada pueden delatar su presencia.', { c: 'io_privacy', l: 'io29', h: '¿Qué podría deducirse de una semana de esos datos de una casa concreta?' }),
  Q('Un grabador de vídeo de oferta trae usuario admin/admin y telnet abierto. Antes de conectarlo, ¿qué haces?', ['Contraseña única, telnet desactivado y nada expuesto a internet', 'Conectarlo y cambiarlo más adelante', 'Abrir su puerto para comprobar que funciona', 'Ponerle una antena mejor'], 'Justo así se propagó Mirai: credenciales de fábrica por telnet en aparatos expuestos. Defensas aburridas y eficaces, desde el primer minuto.', { c: 'io_surface', l: 'io29', h: '¿Qué aprovechó Mirai para propagarse?' }),
  Q('El termómetro conectado de un acuario sirvió de puerta para entrar en la red de una empresa. ¿Qué medida de tu casa responde a esa lección?', ['Los aparatos IoT en una red separada de tus equipos importantes', 'No tener aparatos conectados de ningún tipo', 'Usar solo aparatos caros', 'Cambiar el canal WiFi cada mes'], 'El cacharro menos importante no debe ver lo más importante. Separar redes contiene el daño.', { c: 'io_segment', l: 'io29', h: '¿Qué permitió que un aparato secundario llegara a lo importante?' })
] },

{ id: 'io-m7', title: 'Energía y fiabilidad', desc: 'Deep sleep y presupuesto energético, baterías y solar, reconexión exponencial, colas, watchdog, OTA con vuelta atrás y telemetría de salud.', nodes: [
 L('io30', 'Presupuesto energético con deep sleep', 'sleep', ['io_duty', 'io_deepsleep'], [
  Q('Una placa de desarrollo con el ESP32 dormido sigue gastando 8 mA por su regulador y su LED. Con una batería de 2500 mAh, ¿cuánto crees que dura aunque no despierte nunca?', ['Unas dos semanas', 'Años', 'Una hora', 'Diez años'], '2500 mAh / 8 mA ≈ 312 h ≈ 13 días. El chip dormido gasta microamperios, pero lo que le rodea puede gastar miliamperios todo el rato.', { predict: true, c: 'io_duty', h: 'Capacidad entre corriente da horas.' }),
  { t: 'explore', text: 'Un nodo despierta, mide, envía y vuelve a dormir. Mueve los deslizadores y mira cuánto dura una batería de 2500 mAh.', viz: 'io_sleep', params: PP.sleep(),
    tasks: [
      { q: 'dias', min: 30, max: 1e9, text: 'Consigue que dure más de un mes', done: 'Despertar menos o dormir mejor: las dos cosas alargan la vida.', hint: 'Alarga el periodo o baja la corriente dormido.' },
      { q: 'dias', min: 365, max: 1e9, text: 'Ahora más de un año', done: 'Placa de bajo consumo, despertares cortos y espaciados.', hint: 'Corriente dormido de 10–25 µA y periodos largos.' },
      { q: 'pSleep', min: 0.6, max: 1, text: 'Con periodo de una hora, sube la corriente dormido hasta que la mayor parte de la carga se gaste durmiendo', done: 'Con periodos largos, lo que gasta la placa dormida acaba mandando.', hint: 'Periodo 3600 s y prueba 150 µA o más.' }
    ] },
  I('En <b>deep sleep</b> el ESP32 apaga los núcleos, la radio y casi toda la RAM. Al despertar, el programa empieza de nuevo en setup().', { svg: CHK([['Núcleos, radio y RAM normal: apagados', 0], ['Reloj RTC: sigue contando', 1], ['Memoria RTC (unos 8 kB): se conserva', 1], ['Despertar por tiempo o por un pin RTC', 1]], 'Dormido, el chip baja a unos 10 µA') }),
  I('El consumo medio, como en el curso base, es la carga de un ciclo entre su duración. Piensa en «cubos de carga» en mA·s:', { code: 'carga despierto = I despierto × t despierto      (mA·s)\ncarga dormido   = I dormido   × t dormido\nI media         = (carga despierto + carga dormido) / periodo\nduración (h)    = capacidad (mAh) / I media (mA)' }),
  I('La trampa de las placas de desarrollo: el regulador, el chip USB-serie y el LED de encendido siguen gastando con el ESP32 dormido. Para batería: una placa pensada para ello, o el módulo suelto con un regulador de bajo consumo.', { svg: BARS([['ESP32 dormido', 0.01, 'var(--ok)'], ['Regulador típico de placa (AMS1117)', 5, 'var(--err)'], ['LED de encendido', 2, 'var(--led)']], ' mA', 'valores orientativos: el chip es lo que menos gasta') }),
  I('Recorta el tiempo despierto: IP reservada, y el canal y el BSSID (la dirección del punto de acceso) guardados en memoria RTC para saltarte el escaneo. Mide antes de conectar; envía y duerme sin esperas.', { code: 'RTC_DATA_ATTR uint8_t bssid[6];\nRTC_DATA_ATTR int32_t canal = 0;\n\n// Con canal y BSSID guardados, el ESP32 no necesita escanear\nif (canal) WiFi.begin(WIFI_SSID, WIFI_PASS, canal, bssid);\nelse       WiFi.begin(WIFI_SSID, WIFI_PASS);\n// al conectar la primera vez:\n// canal = WiFi.channel(); memcpy(bssid, WiFi.BSSID(), 6);' }),
  { t: 'steps', text: 'Un nodo despierta cada 5 minutos, pasa 2 s despierto a 120 mA y duerme a 20 µA. ¿Cuánto dura con 2500 mAh?', steps: ['Despierto: 120 mA × 2 s = <b>240 mA·s</b>.', 'Dormido: 0,02 mA × 298 s = <b>5,96 mA·s</b>.', 'Media: (240 + 5,96) / 300 s = <b>0,82 mA</b>.', 'Duración: 2500 / 0,82 ≈ 3049 h ≈ <b>127 días</b>.', 'Si acortas el despertar a 0,5 s: (60 + 5,99) / 300 = 0,22 mA → unos 473 días.'], result: 'El tiempo despierto manda: recortarlo multiplica la autonomía.' },
  G('io_sleepAvg'),
  G('io_sleepLife'),
  TU('Con una batería de 2500 mAh, consigue que el nodo dure más de un año.', 'io_sleep', PP.sleep(), { q: 'dias', min: 365, max: 1e9, text: 'Objetivo: más de 365 días', hint: 'Primero baja la corriente dormido; luego alarga el periodo y acorta el tiempo despierto.' }, 'Placa de bajo consumo, despertares cortos y espaciados.', { c: 'io_duty', h: 'Mira qué parte de la carga domina en la barra roja y ataca esa.' }),
  Q('Al despertar de deep sleep, ¿dónde empieza el programa?', ['En setup(), como si arrancara', 'Donde se quedó en loop()', 'En una función especial que eliges', 'No despierta solo'], 'La RAM normal se pierde; usa RTC_DATA_ATTR para lo que quieras conservar.', { c: 'io_deepsleep', h: 'Recuerda qué se apaga al dormir.' }),
  Q('¿Qué pasa con la variable canal si no lleva RTC_DATA_ATTR?', ['Se pierde en cada deep sleep y valdrá 0 al despertar', 'Se conserva igual', 'Se guarda en la flash', 'No compila'], 'Solo la memoria RTC sobrevive.', { code: 'int32_t canal = 0;', c: 'io_deepsleep', h: '¿Dónde vive una variable normal?' }),
  Q('Para despertar con un pulsador desde deep sleep, el pin debe ser…', ['Un GPIO del dominio RTC (por ejemplo, el 33)', 'Cualquiera', 'Solo el GPIO0', 'Uno de los de la flash'], 'El despertar externo (ext0 y ext1) usa pines RTC.', { c: 'io_deepsleep', h: 'Solo sigue despierta la parte RTC del chip.' }),
  I('<b>Resumen</b>\n· Deep sleep: casi todo apagado; sobreviven el reloj y la memoria RTC; al despertar, setup().\n· I media = (carga despierto + carga dormido) / periodo.\n· La placa dormida puede gastar más que el chip: elige bien.\n· Recorta el tiempo despierto.')
 ]),
 SIM('io-s4', 'Reto: nodo que duerme', 'Un nodo a pilas pasa casi todo el tiempo dormido. Este programa despierta cada 5 s, lee una LDR en el GPIO35, da un destello en el LED del GPIO27 (dos si es de noche, y uno largo cada cuatro despertares) y vuelve a deep sleep. Monta el divisor y el LED y observa el ciclo de trabajo.', { arduino: 'io_dormir', board: 'esp32', parts: ['ldr', 'res', 'led'], code: true, hint: 'LDR entre 3V3 y D35, y 10 kΩ entre D35 y GND. LED: D27 → 100–220 Ω → ánodo; cátodo a GND. Baja la luz de la LDR para ver el doble destello.' }, 'io_dormir'),
 L('io31', 'Baterías, solar y picos del WiFi', 'bat', ['io_battery', 'io_supply', 'io_energy'], [
  Q('Un nodo funciona perfectamente con el WiFi apagado, pero se reinicia cada vez que intenta conectarse. ¿Qué crees que pasa?', ['La radio pide un pico de corriente y la tensión cae', 'El código del WiFi tiene un error', 'El router lo expulsa', 'Le falta memoria'], 'Al transmitir, el ESP32 pide de golpe cientos de mA. Si la alimentación no los da, la tensión cae y el chip se reinicia para protegerse.', { predict: true, c: 'io_supply', h: '¿Qué cambia en la alimentación cuando la radio empieza a transmitir?' }),
  { t: 'explore', text: 'Durante 1 ms la radio pide un pico de corriente. Si la tensión baja del umbral, salta el detector de caída de tensión (brownout) y el chip se reinicia.', viz: 'io_brown', params: PP.brown(),
    tasks: [
      { q: 'reinicia', min: 0, max: 0, text: 'Sin tocar el pico, consigue que no se reinicie', done: 'Menos resistencia en el camino: cables cortos y gruesos, buena fuente.', hint: 'Baja la resistencia de cables y fuente.' },
      { q: 'conCond', min: 1, max: 1, text: 'Ahora hazlo con cables finos (3 Ω), solo con el condensador', done: 'El condensador da la corriente del pico mientras la fuente se recupera.', hint: 'Resistencia 3 Ω y condensador de 470 µF o más.' }
    ] },
  I('El ESP32 funciona entre 3,0 y 3,6 V. Opciones de batería:', { code: 'Química        Tensión          Cómo alimentar el ESP32\nLi-ion/LiPo    3,0–4,2 V        regulador de baja caída + protección\nLiFePO4        ~3,2 V (3,6 llena) casi directo; química más estable\n3 × AA         ~4,5 → 3 V       con regulador; sufren con los picos\nSupercondens.  la que tenga     ciclos casi infinitos, poca energía' }),
  I('Un regulador lineal de baja caída (<b>LDO</b>) se elige por dos números: su <b>caída</b> (dropout), la tensión mínima que necesita por encima de la salida, y su <b>corriente propia</b> en reposo, que gasta siempre.', { svg: VS({ t: 'LDO malo para pilas', l: ['corriente propia 5 mA', 'nodo dormido a 10 µA', '→ manda el regulador'], c: 'var(--err)' }, { t: 'LDO bueno', l: ['corriente propia de µA', 'aguanta 500 mA de pico', 'caída pequeña'], c: 'var(--ok)' }) }),
  I('Remedios contra el brownout por los picos del WiFi:', { svg: CHK([['Condensador de 100–470 µF junto al módulo', 1], ['Regulador que aguante al menos 500 mA', 1], ['Cables cortos y gruesos', 1], ['Comprobar esp_reset_reason() tras cada arranque', 2]], 'Picos de cientos de mA durante milisegundos') }),
  I('<b>Solar</b>: haz números con el peor mes. En invierno, en gran parte de España hay del orden de 2–3 horas de sol pico al día, y el panel rara vez da su potencia nominal. Prueba:', { tune: { viz: 'io_solarbal', params: PP.solar() }, more: 'Las «horas de sol pico» equivalen a las horas que el panel daría su potencia nominal: un día de invierno con 2 horas de sol pico da la misma energía que 2 horas a pleno rendimiento. Dimensiona la batería para aguantar varios días nublados seguidos.' }),
  I('Seguridad con el litio:', { svg: CHK([['No cargar por debajo de 0 °C', 0], ['Evitar el calor: una caja al sol supera los 60 °C', 0], ['Siempre con protección y cargador adecuado', 1], ['La tensión da una idea de la carga, no un porcentaje exacto', 2]], 'Baterías de litio') }),
  { t: 'steps', text: 'Panel de 1 W, 2 horas de sol pico en invierno y un 30 % de pérdidas. El nodo gasta 0,5 mA de media a 3,7 V. ¿Sobra panel?', steps: ['Entra: 1 W × 2 h × 0,7 = <b>1,4 Wh</b> al día.', 'Sale: 0,0005 A × 3,7 V × 24 h ≈ <b>0,044 Wh</b> al día.', 'Sobra de largo: más de 30 veces.', 'Batería de 2500 mAh a 3,7 V ≈ 9,25 Wh → unos 210 días sin sol: más que suficiente para rachas nubladas.'], result: 'Con un nodo de bajo consumo, un panel pequeño basta.' },
  { t: 'match', q: 'Une cada batería con su característica.', pairs: [['Li-ion 18650', 'Mucha energía; necesita protección y regulador'], ['LiFePO4', 'Tensión cercana a 3,3 V y química más estable'], ['Alcalinas AA', 'Baratas, sin recarga, sufren con los picos'], ['Supercondensador', 'Ciclos casi infinitos, poca energía']], c: 'io_battery', h: 'Repasa la tabla de químicas.' },
  Q('Un nodo se reinicia siempre al conectar al WiFi y esp_reset_reason() dice «brownout». ¿Qué pruebas primero?', ['Un condensador grande junto al módulo y un regulador más capaz', 'Cambiar el broker', 'Cambiar de canal WiFi', 'Cambiar la máscara'], 'Los picos de la radio hunden la tensión.', { c: 'io_supply', h: 'Brownout = caída de tensión.' }),
  Q('Un LDO con 5 mA de corriente propia en un nodo que duerme a 10 µA…', ['Arruina la autonomía: domina el consumo total', 'No importa', 'Mejora la autonomía', 'Solo afecta al despertar'], 'Mira siempre la corriente de reposo.', { c: 'io_supply', h: 'Suma las dos corrientes y compara.' }),
  Nm('Panel de 1 W, 2 horas de sol pico y 30 % de pérdidas. ¿Energía útil al día, en Wh?', 1.4, 'Wh', '1 W × 2 h × 0,7.', { tol: 0.05, c: 'io_energy', h: 'Potencia × horas, y quita las pérdidas.' }),
  Nm('El nodo gasta 0,5 mA de media a 3,7 V. ¿Energía al día, en Wh?', 0.0444, 'Wh', '0,0005 A × 3,7 V × 24 h ≈ 0,044 Wh.', { tol: 0.002, c: 'io_energy', h: 'Pasa los mA a A antes de multiplicar.' }),
  Q('Precaución con baterías de litio en una caja al sol:', ['No cargarlas bajo 0 °C ni dejarlas muy calientes; usar protección', 'Ninguna', 'Pintar la caja de negro', 'Cargarlas siempre al máximo'], 'El calor y la carga en frío las dañan y pueden provocar un incendio.', { c: 'io_battery', h: 'Repasa la lista de seguridad con el litio.' }),
  Q('¿Por qué la tensión de una batería de litio no da su carga exacta?', ['Su curva es bastante plana en la zona media y la tensión depende también de la corriente', 'Porque no tiene tensión', 'Porque el ADC no mide', 'Sí la da siempre'], 'Da una idea, no un porcentaje exacto; en LiFePO4 la curva es aún más plana.', { c: 'io_battery', h: '¿Cambia mucho la tensión entre el 30 % y el 70 %?' }),
  I('<b>Resumen</b>\n· Elige química y regulador: caída pequeña y corriente propia mínima.\n· Picos del WiFi: condensador, regulador capaz y cables cortos, o brownout.\n· Solar: energía = W × horas de sol pico × (1 − pérdidas), con el peor mes.\n· Litio: ni frío al cargar ni calor; siempre con protección.')
 ]),
 L('io32', 'Reconectar sin agobiar: espera exponencial y colas', 'timer', ['io_retry', 'io_queue', 'io_deepsleep'], [
  Q('Se va la luz y vuelve. Veinte nodos intentan reconectarse cada 100 ms sin parar. ¿Qué crees que pasa con el router y el broker, que acaban de arrancar?', ['Se saturan justo cuando más falta hace', 'Nada: son pocos', 'Arrancan más rápido', 'Se apagan los nodos'], 'Reintentar en bucle gasta batería y, multiplicado por muchos nodos, tumba el servicio cuando vuelve. Hay una forma educada de reintentar.', { predict: true, c: 'io_retry', h: 'Piensa en cuántos intentos por segundo recibe el broker.' }),
  { t: 'explore', text: 'Cinco nodos tras un corte de luz, durante 2 minutos. Cada punto es un intento; en rojo, varios nodos en el mismo medio segundo.', viz: 'io_backoff', params: PP.backoff(),
    tasks: [
      { q: 'pico', min: 1, max: 3, text: 'Consigue que nunca coincidan más de 3 nodos a la vez', done: 'El azar desincroniza a los nodos.', hint: 'Añade bastante azar (jitter).' },
      { q: 'ok', min: 1, max: 1, text: 'Y que además ninguno pase de 10 intentos en 2 minutos', done: 'Espera creciente, con tope y con azar: lo estándar.', hint: 'Sube el tope a 30 s o más.' }
    ] },
  I('<b>Espera exponencial</b>: tras cada fallo, dobla la espera (1, 2, 4, 8 s…) hasta un <b>tope</b>. Al conectar, la espera vuelve al principio.', { code: 'espera = mín(base × 2^(fallos − 1), tope)\n\nbase 1 s, tope 60 s:  1 · 2 · 4 · 8 · 16 · 32 · 60 · 60 …' }),
  I('El <b>tope</b> evita que, tras muchos fallos, el nodo tarde horas en enterarse de que la red volvió. El <b>azar</b> (jitter) evita que todos los nodos reintenten en el mismo instante.', { code: 'unsigned long espera = 1000;          // ms\n\nvoid fallo() {\n  delay(espera + random(espera / 2)); // azar de hasta el 50 %\n  espera = min(espera * 2, 60000UL);  // dobla, con tope de 60 s\n}\nvoid exito() { espera = 1000; }' }),
  I('Mientras no hay red, los datos van a una <b>cola local</b>, cada uno con su hora de medida.', { svg: CHK([['RAM: rápida, se pierde al dormir o reiniciar', 2], ['Memoria RTC: sobrevive al deep sleep (unos 8 kB)', 2], ['Flash (LittleFS): sobrevive a todo; ojo al desgaste', 2]], '¿Dónde guardo la cola?'), more: 'LittleFS es un sistema de archivos para la flash del ESP32: guarda archivos que sobreviven a reinicios y cortes de luz. Cada sector de la flash aguanta un número limitado de borrados, así que conviene escribir por bloques y no a cada lectura.' }),
  I('Si la cola se llena, lo sensato suele ser descartar lo <b>más viejo</b> (un búfer circular). Y al volver la red, vacíala a ritmo controlado, no de golpe.', { code: 'const int N = 100;\nLectura cola[N];\nint ini = 0, n = 0;\n\nvoid encolar(Lectura x) {\n  cola[(ini + n) % N] = x;\n  if (n < N) n++;\n  else ini = (ini + 1) % N;   // llena: se pierde la más vieja\n}' }),
  { t: 'steps', text: 'Una lectura de 12 bytes cada 30 s. ¿Cuánta memoria hace falta para aguantar 24 horas sin red?', steps: ['Lecturas en 24 h: 86 400 / 30 = <b>2880</b>.', 'Bytes: 2880 × 12 = <b>34 560</b> bytes, unos 34,6 kB.', 'Cabe de sobra en la RAM del ESP32 (cientos de kB)…', '…pero no en los 8 kB de memoria RTC: si el nodo duerme entre lecturas, a la flash, o guarda resúmenes.'], result: 'Haz la cuenta antes de elegir dónde vive la cola.' },
  G('io_backoff'),
  Q('¿Para qué sirve el tope de la espera?', ['Para que, cuando la red vuelva, el nodo no tarde horas en enterarse', 'Para gastar más batería', 'Porque el ESP32 no cuenta más', 'No hace falta'], 'Sin tope, tras muchos fallos esperarías demasiado.', { c: 'io_retry', h: 'Calcula la espera tras 15 fallos sin tope.' }),
  Q('La cola de 100 lecturas está llena y el corte sigue. ¿Qué descartas normalmente?', ['Las más viejas, para conservar lo reciente', 'Las más nuevas', 'Todas', 'El programa'], 'Búfer circular. Otra opción: resumir las viejas en medias.', { c: 'io_queue', h: '¿Qué vale más tras un corte largo: lo de hace 3 días o lo de hace 3 minutos?' }),
  Nm('Una lectura de 8 bytes cada minuto. ¿Cuántos bytes para aguantar 12 h sin red?', 5760, 'bytes', '720 lecturas × 8 bytes.', { c: 'io_queue', h: 'Cuenta las lecturas de 12 horas y multiplica.' }),
  Q('¿Dónde guardas la cola si el nodo hace deep sleep entre lecturas?', ['En memoria RTC (RTC_DATA_ATTR) si cabe, o en flash con cuidado del desgaste', 'En una variable normal', 'En el broker', 'En el router'], 'La RAM normal se borra al dormir.', { c: 'io_deepsleep', h: '¿Qué memoria sobrevive al deep sleep?' }),
  { t: 'order', q: 'Ordena el bucle de conexión robusto de un nodo enchufado.', items: ['¿Hay WiFi? Si no, reintentar con espera exponencial', '¿Hay broker? Si no, reintentar con espera exponencial', 'Al conectar: testamento, «online» y suscripciones', 'Vaciar la cola de datos pendientes', 'Funcionamiento normal y espera reiniciada'], e: 'Cada capa, con su reintento.', c: 'io_retry', h: 'Primero la red de abajo, luego el broker, luego los datos.' },
  Q('Al reconectar, el nodo suelta de golpe 2000 mensajes encolados. ¿Riesgo?', ['Saturar el broker o el búfer: envíalos a ritmo controlado', 'Ninguno', 'Que se borren', 'Que cambien de tema'], 'Vaciar la cola también, con educación.', { c: 'io_queue', h: 'Recuerda lo que pasaba cuando todos reintentaban a la vez.' }),
  I('<b>Resumen</b>\n· Espera = mín(base × 2^(fallos − 1), tope), con azar; vuelve a la base al conectar.\n· Cola local con marca de tiempo: RAM, RTC o flash según el caso.\n· Llena: descarta lo más viejo. Al volver: vacía poco a poco.')
 ]),
 SIM('io-s5', 'Reto: reconexión con espera exponencial', 'El LED del GPIO23 se enciende 0,2 s en cada intento de conexión. Si el «router» no responde, la espera se dobla (0,5; 1; 2 y 4 s como tope, con algo de azar). Mantén pulsado el botón del GPIO4 hasta el siguiente intento para que el router responda: el LED queda fijo. Suéltalo y mira cómo vuelve a empezar desde 0,5 s.', { arduino: 'io_reintento', board: 'esp32', parts: ['push', 'res', 'led'], code: true, hint: 'Pulsador entre D4 y GND. LED: D23 → 100–220 Ω → ánodo; cátodo a GND. Deja pasar varios intentos y luego mantén pulsado hasta que el LED quede fijo (como mucho 5 s).' }, 'io_reintento'),
 L('io33', 'Watchdog, OTA segura y telemetría de salud', 'shield', ['io_wdt', 'io_ota', 'io_health', 'io_deepsleep'], [
  Q('Un nodo se cuelga una vez al mes por un fallo raro de una librería, y está en el tejado. ¿Qué crees que lo saca del cuelgue sin subir a desenchufarlo?', ['Un watchdog que lo reinicia si deja de dar señales de vida', 'Nada: hay que subir', 'Un condensador más grande', 'Bajar el keepalive'], 'Un temporizador vigilante reinicia el chip si el programa deja de «dar la patada» a tiempo.', { predict: true, c: 'io_wdt', h: '¿Qué podría darse cuenta de que el programa ya no avanza?' }),
  { t: 'explore', text: 'La flash tiene dos ranuras para el programa. Prueba a instalar versiones nuevas por la red (OTA).', viz: 'io_otaviz', params: PP.ota(),
    tasks: [
      { q: 'rollback', min: 1, max: 1, text: 'Instala una versión que se cuelga y mira qué pasa', done: 'No se confirma: el arranque vuelve a la versión anterior.', hint: 'Elige instalar «Sí».' },
      { q: 'rechazada', min: 1, max: 1, text: 'Intenta instalar una imagen con firma falsa', done: 'Se rechaza antes de escribir nada.' },
      { q: 'nueva', min: 1, max: 1, text: 'Instala una versión buena y firmada', done: 'Arranca, se comprueba y se confirma: ya corre la nueva.' }
    ] },
  I('Un <b>watchdog</b> es un temporizador que reinicia el chip si el programa no le da una «patada» a tiempo. Si el código se cuelga, el watchdog lo saca del hoyo.', { code: '#include <esp_task_wdt.h>\n\nvoid setup() {\n  esp_task_wdt_config_t cfg = { .timeout_ms = 10000, .idle_core_mask = 0, .trigger_panic = true };\n  esp_task_wdt_reconfigure(&cfg);   // en arduino-esp32 3.x ya viene iniciado\n  esp_task_wdt_add(NULL);           // vigila la tarea actual (la de loop)\n}\n\nvoid loop() {\n  trabajo();\n  esp_task_wdt_reset();             // «sigo vivo»\n}' }),
  I('La patada solo sirve si demuestra que el trabajo avanza:', { svg: VS({ t: 'Bien', l: ['al final de cada loop()', 'tras cada envío', 'completado'], c: 'var(--ok)' }, { t: 'Mal', l: ['dentro de un while', 'que espera sin fin', 'o en una interrupción'], c: 'var(--err)' }) }),
  I('<b>OTA</b> con red de seguridad: la versión nueva se escribe en la ranura libre y se arranca desde ella. Si no se <b>confirma</b> tras una autocomprobación, el cargador de arranque vuelve a la anterior.', { svg: FLOW(['Descargar (HTTPS)', 'Verificar firma', 'Escribir en la libre', 'Reiniciar', 'Autocomprobar', 'Confirmar'], 'nunca te quedas sin una versión que funcione') }),
  I('<b>Telemetría de salud</b>: el nodo informa de sí mismo, además de sus sensores. Las tendencias anuncian los fallos antes de que ocurran.', { svg: CHK([['Versión de firmware y tiempo encendido', 2], ['Motivo del último reinicio', 2], ['Memoria libre y la mínima alcanzada', 2], ['RSSI y tensión de la batería', 2], ['Reconexiones y errores', 2]], 'Lo que un nodo debe contar de sí mismo') }),
  I('Más hábitos de un nodo fiable:', { svg: CHK([['Arrancar siempre en estado seguro (válvulas cerradas)', 1], ['Resincronizar la hora cada pocas horas', 1], ['Escribir en flash de vez en cuando, no a cada evento', 1], ['Confiar en que nunca se reiniciará', 0]], 'Nodo fiable') }),
  { t: 'steps', text: 'Una OTA con vuelta atrás, paso a paso.', steps: ['El nodo descarga la imagen nueva por HTTPS.', 'Verifica su firma con tu clave pública: si no cuadra, la descarta.', 'La escribe en la ranura libre (ota_1) y marca que el próximo arranque sea desde ella.', 'Reinicia; la versión nueva arranca en «pendiente de verificar».', 'Autocomprobación: WiFi, broker y sensores. Si todo va bien, la confirma; si se cuelga o no confirma, el siguiente arranque vuelve a ota_0.'], result: 'Actualizar a distancia sin miedo a dejar el nodo inservible.' },
  Q('¿Dónde NO pondrías esp_task_wdt_reset()?', ['Dentro del bucle que espera la conexión, para que nunca salte', 'Al final de loop(), tras el trabajo normal', 'Tras completar cada envío', 'Tras leer los sensores con éxito'], 'Si alimentas al perro mientras esperas sin fin, nunca te rescatará.', { c: 'io_wdt', h: '¿Cuál dejaría al watchdog sin poder detectar un cuelgue?' }),
  { t: 'order', q: 'Ordena una OTA segura con vuelta atrás.', items: ['Descargar la imagen por HTTPS', 'Verificar su firma o su hash', 'Escribirla en la ranura libre', 'Reiniciar desde la nueva', 'Autocomprobación: WiFi, broker y sensores', 'Confirmar la versión (o volver a la anterior)'], e: 'Nunca te quedes sin una versión que funcione.', c: 'io_ota', h: 'No escribas nada que no hayas comprobado.' },
  Q('Una OTA instala una versión que se cuelga al arrancar. Con la vuelta atrás activada, ¿qué pasa?', ['Tras el reinicio, el cargador arranca la versión anterior', 'El nodo queda inservible', 'Se borra la flash', 'Sigue colgado para siempre'], 'Por eso se confirma solo tras comprobar.', { c: 'io_ota', h: 'Recuerda la primera tarea de la exploración.' }),
  { t: 'match', q: 'Une cada dato de salud con lo que te revela.', pairs: [['Motivo de reinicio: brownout', 'Problemas de alimentación'], ['Memoria libre bajando día a día', 'Una fuga de memoria'], ['RSSI de −85 dBm', 'Enlace de radio débil'], ['Muchas reconexiones al broker', 'Red inestable o identificador duplicado']], c: 'io_health', h: 'Piensa en qué capa avisa cada dato.' },
  Q('La memoria libre mínima del nodo baja un poco cada día. ¿Qué esperas?', ['Que acabe colgándose: hay una fuga de memoria', 'Nada', 'Que mejore sola', 'Que suba el RSSI'], 'Busca cadenas que crecen o reservas sin liberar.', { c: 'io_health', h: '¿Qué pasa cuando llegue a cero?' }),
  Q('Un nodo de riego se reinicia por el watchdog en mitad de un riego. ¿Estado al arrancar?', ['Válvula cerrada hasta que la lógica vuelva a decidir', 'Válvula abierta por si acaso', 'Siempre el último estado guardado', 'Da igual'], 'Ante la duda, lo que no inunda.', { c: 'io_wdt', h: '¿Qué estado no puede causar daño?' }),
  Q('¿Por qué no guardar el contador de pulsos en la flash en cada pulso?', ['La flash soporta un número limitado de borrados por sector y se desgastaría', 'Porque es lenta de leer', 'Porque se cifra', 'No hay ningún problema'], 'Guarda cada cierto tiempo, o acumula en memoria RTC.', { c: 'io_deepsleep', h: 'Piensa en millones de pulsos al año.' }),
  I('<b>Resumen</b>\n· Watchdog: la patada, solo cuando el trabajo avanza.\n· OTA: verificar firma, ranura libre, autocomprobar y confirmar; si no, vuelta atrás.\n· Telemetría de salud y tendencias.\n· Arranque seguro y flash sin abusar.')
 ]),
 PRJ('io-p12', 'Proyecto: detector de fugas que dura años', 'io_leak'),
 PRJ('io-p13', 'Proyecto: nodo solar con telemetría y OTA segura', 'io_solar'),
 PRJ('io-p8', 'Proyecto: estación meteorológica con Grafana', 'io_weather')
],
exam: [
  Nm('Un nodo despierta cada 10 minutos, pasa 3 s despierto a 100 mA y duerme a 10 µA. ¿Corriente media, en mA?', 0.51, 'mA', 'Despierto: 100 × 3 = 300 mA·s. Dormido: 0,01 × 597 = 5,97 mA·s. Media: 305,97 / 600 ≈ 0,51 mA.', { tol: 0.01, c: 'io_duty', l: 'io30', h: 'Suma las cargas de las dos fases en mA·s y divide entre el periodo en segundos.' }),
  Nm('Un nodo gasta 0,4 mA de media con una batería de 3000 mAh. ¿Cuántos días dura?', 312.5, 'días', '3000 / 0,4 = 7500 h; 7500 / 24 = 312,5 días.', { tol: 1, c: 'io_duty', l: 'io30', h: 'Capacidad entre corriente da horas; luego pasa a días.' }),
  Q('Un nodo pasa 1 s despierto a 100 mA cada hora y duerme a 150 µA. ¿Qué se lleva la mayor parte de la carga?', ['El tiempo dormido: unos 540 mA·s frente a 100', 'El tiempo despierto: 100 mA es mucho más que 150 µA', 'Las dos igual', 'Ninguna: dormido no gasta'], 'Despierto: 100 × 1 = 100 mA·s. Dormido: 0,15 × 3599 ≈ 540 mA·s. Con despertares raros, la corriente de reposo manda.', { c: 'io_duty', l: 'io30', h: 'Calcula los dos «cubos» de carga en mA·s antes de opinar.' }),
  Q('Lo enciendes y se despierta tres veces. ¿Qué imprime la última vez?', ['4', '1', '3', '0'], 'arranques está en memoria RTC, que sobrevive al deep sleep. Encendido: 1; despertares: 2, 3 y 4. Sin RTC_DATA_ATTR imprimiría siempre 1.', { c: 'io_deepsleep', l: 'io30', code: 'RTC_DATA_ATTR int arranques = 0;\n\nvoid setup() {\n  Serial.begin(115200);\n  arranques++;\n  Serial.println(arranques);\n  esp_deep_sleep(60000000ULL);   // 60 s\n}\n\nvoid loop() {}', h: '¿Dónde empieza el programa al despertar y qué memoria se conserva?' }),
  Q('¿Por qué guardar el canal y el BSSID del punto de acceso en memoria RTC alarga la batería?', ['El ESP32 se salta el escaneo y conecta antes: menos tiempo con la radio encendida', 'Porque la memoria RTC gasta menos que la flash', 'Porque así el WiFi transmite con menos potencia', 'Porque evita pedir la hora'], 'Escanear canales lleva tiempo de radio. Sabiendo dónde está el punto de acceso, el despertar se acorta, y el tiempo despierto es lo que manda.', { c: 'io_deepsleep', l: 'io30', h: '¿Qué tiene que hacer el chip al despertar si no sabe en qué canal está su red?' }),
  Q('Una Li-ion a 3,4 V alimenta un LDO de 3,3 V con 0,25 V de caída. ¿Qué tensión sale y le sirve al ESP32?', ['Unos 3,15 V: el LDO ya no regula, pero sigue dentro de 3,0–3,6 V', '3,3 V exactos', '3,65 V, por encima del límite', '0 V: el LDO se apaga'], 'Con menos de 3,3 + 0,25 V a la entrada, la salida queda en entrada menos caída: 3,4 − 0,25 = 3,15 V. El ESP32 funciona entre 3,0 y 3,6 V.', { c: 'io_supply', l: 'io31', h: 'Resta la caída a la tensión de la batería y compárala con el rango del ESP32.' }),
  Nm('Un LDO tiene 0,2 V de caída. ¿Hasta qué tensión puede bajar la batería para que el ESP32 reciba al menos 3,0 V?', 3.2, 'V', '3,0 V que necesita el ESP32 + 0,2 V de caída = 3,2 V en la batería.', { tol: 0.01, c: 'io_supply', l: 'io31', h: 'La entrada debe superar la salida en la caída del regulador.' }),
  Q('Eliges el LDO para un nodo que duerme a 10 µA. ¿Cuál?', ['Caída de 0,2 V y 1 µA de corriente propia', 'Caída de 0,2 V y 5 mA de corriente propia', 'Caída de 1,2 V y 5 µA de corriente propia', 'Caída de 2 V y 1 µA de corriente propia'], 'La corriente propia se gasta siempre: 5 mA arruinarían un nodo de 10 µA. Y con una caída de 1,2 V o más, una Li-ion no podría dar 3,3 V.', { c: 'io_supply', l: 'io31', h: 'Mira los dos números que deciden un LDO para batería.' }),
  Q('Un nodo se reinicia al conectar al WiFi y esp_reset_reason() dice «brownout». Los cables a la fuente son largos y finos. ¿Qué arreglo atacas primero?', ['Un condensador grande junto al módulo y cables más cortos y gruesos', 'Cambiar el canal WiFi', 'Bajar el keepalive de MQTT', 'Usar un tema MQTT más corto'], 'El pico de la radio, a través de la resistencia de los cables, hunde la tensión. El condensador aporta el pico desde cerca y los cables gruesos reducen la caída.', { c: 'io_supply', l: 'io31', h: 'Piensa en qué hunde la tensión durante el pico de corriente.' }),
  Nm('Panel de 2 W, 2,5 horas de sol pico y 30 % de pérdidas. ¿Cuánta energía útil da al día?', 3.5, 'Wh', '2 W × 2,5 h × 0,7 = 3,5 Wh.', { tol: 0.05, c: 'io_energy', l: 'io31', h: 'Potencia × horas de sol pico × lo que queda tras las pérdidas.' }),
  Q('Un nodo gasta 20 mA de media a 3,7 V. ¿Basta un panel de 1 W con 2 horas de sol pico y un 30 % de pérdidas?', ['No: gasta unos 1,78 Wh al día y el panel da 1,4 Wh', 'Sí: le sobra el doble', 'Sí, justo', 'No se puede saber sin la batería'], 'Consumo: 0,02 A × 3,7 V × 24 h ≈ 1,78 Wh. Panel: 1 × 2 × 0,7 = 1,4 Wh. Cada día se vacía un poco más.', { c: 'io_energy', l: 'io31', h: 'Pasa los dos lados a Wh al día y compáralos.' }),
  TU('El nodo gasta 10 mA de media y en invierno hay 2 horas de sol pico. Elige el panel más pequeño que cubra el consumo diario.', 'io_solarbal', PP.solar({ h: FX(2), I: FX(10) }), { q: 'bal', min: 0, max: 0.6, text: 'Objetivo: balance positivo con el panel más pequeño', hint: 'Compara lo que gasta en un día con lo que da cada panel.' }, 'Gasta 0,01 × 3,7 × 24 ≈ 0,89 Wh al día. El de 0,5 W da 0,7 Wh (no llega); el de 1 W, 1,4 Wh.', { c: 'io_energy', l: 'io31', h: 'Energía del panel = W × horas × 0,7; consumo = A × 3,7 V × 24 h.' }),
  Q('Un nodo con batería de litio va en una caja en el exterior, donde hiela en invierno. ¿Qué precaución tomas?', ['Que el cargador no cargue la batería por debajo de 0 °C', 'Cargarla más deprisa cuando hace frío', 'Pintar la caja de negro para calentarla', 'Ninguna: el frío no afecta al litio'], 'Cargar litio bajo 0 °C lo daña y puede provocar fallos peligrosos. Y al sol, evita el calor: siempre con protección y cargador adecuado.', { c: 'io_battery', l: 'io31', h: 'Repasa las reglas de seguridad del litio con la temperatura.' }),
  Q('¿Por qué una LiFePO4 resulta cómoda para alimentar un ESP32?', ['Su tensión, unos 3,2 V (3,6 V llena), cae dentro de lo que admite el ESP32 casi sin regulador', 'Porque da 5 V', 'Porque no necesita protección nunca', 'Porque su tensión dice el porcentaje exacto de carga'], 'El ESP32 trabaja entre 3,0 y 3,6 V, justo el rango de la LiFePO4. Además, su química es más estable.', { c: 'io_battery', l: 'io31', h: 'Compara la tensión de esa química con el rango del ESP32.' }),
  Nm('Espera exponencial con base de 2 s y tope de 60 s. ¿Cuántos segundos espera el nodo tras su 6.º fallo seguido?', 60, 's', 'Esperas: 2, 4, 8, 16, 32 y, para el 6.º, 2 × 2⁵ = 64 s, que el tope deja en 60 s.', { tol: 0, c: 'io_retry', l: 'io32', h: 'espera = mín(base × 2^(fallos − 1), tope).' }),
  Q('Veinte nodos usan la misma espera exponencial, sin azar, y vuelven a la vez tras un corte de luz. ¿Qué pasa?', ['Reintentan todos juntos en cada escalón (1, 2, 4… s) y siguen saturando; el azar los repartiría', 'Nada: la espera exponencial ya lo evita', 'Se conectan uno detrás de otro', 'Ninguno vuelve a conectar'], 'Doblar la espera reduce los intentos, pero si todos empiezan a la vez, coinciden siempre. El azar (jitter) los desordena.', { c: 'io_retry', l: 'io32', h: 'Si todos parten del mismo instante con las mismas esperas, ¿cuándo coinciden?' }),
  Nm('Lecturas de 16 bytes cada 2 minutos. La memoria RTC tiene 6000 bytes libres para la cola. ¿Cuántas horas sin red aguanta?', 12.5, 'h', '6000 / 16 = 375 lecturas. 375 × 2 min = 750 min = 12,5 h.', { tol: 0.1, c: 'io_queue', l: 'io32', h: 'Cuántas lecturas caben, por el tiempo entre lecturas, y pasa a horas.' }),
  Q('Con este búfer circular y N = 4, encolas A, B, C, D y E. ¿Qué queda?', ['B, C, D y E', 'A, B, C y D', 'Solo E', 'A, B, C, D y E'], 'Al llegar E con la cola llena, se pierde la más vieja (A). Se conserva lo reciente.', { c: 'io_queue', l: 'io32', code: 'void encolar(Lectura x) {\n  cola[(ini + n) % N] = x;\n  if (n < N) n++;\n  else ini = (ini + 1) % N;   // llena: se pierde la más vieja\n}', h: '¿Qué hace la rama else cuando la cola ya está llena?' }),
  Q('¿Qué problema tiene este loop() con watchdog?', ['Da la patada dentro del bucle de espera: si la conexión no vuelve nunca, el watchdog no salta', 'Ninguno', 'Da demasiadas patadas y el chip se reinicia', 'No compila'], 'La patada debe demostrar que el trabajo avanza. Alimentar al perro mientras se espera sin fin anula el rescate.', { c: 'io_wdt', l: 'io33', code: 'void loop() {\n  while (!mqtt.connected()) {\n    reconectar();\n    esp_task_wdt_reset();\n  }\n  publicar();\n  esp_task_wdt_reset();\n}', h: '¿Hay algún camino en que el programa se quede atascado y siga dando patadas?' }),
  Q('Tras una OTA, la versión nueva arranca y conecta al WiFi, pero no al broker. La autocomprobación mira WiFi, broker y sensores. ¿Qué pasa?', ['No se confirma y, al reiniciarse, vuelve a la versión anterior', 'Se confirma: el WiFi funciona', 'El nodo queda inservible', 'Borra la versión anterior'], 'Solo se confirma lo que pasa toda la autocomprobación. Si no, el cargador de arranque vuelve a la ranura que funcionaba.', { c: 'io_ota', l: 'io33', h: '¿Cuándo se marca como buena una versión nueva?' }),
  { t: 'match', q: 'Une cada dato de salud con lo que probablemente te está diciendo.', pairs: [['Motivo de reinicio: watchdog, cada noche', 'Algo se cuelga de forma repetida'], ['La batería baja más rápido que el mes pasado', 'Consumo anormal o batería envejecida'], ['El tiempo desde el arranque vuelve a 0 a menudo', 'Reinicios que nadie ha visto'], ['El RSSI empeoró desde que movieron un armario', 'Peor enlace de radio']], e: 'La telemetría de salud y sus tendencias anuncian los fallos antes de que dejen el nodo sin servicio.', c: 'io_health', l: 'io33', h: 'Piensa en qué parte del nodo mide cada dato: código, energía, arranques o radio.' },
  Q('Un calefactor conectado se reinicia de forma inesperada. ¿En qué estado debe arrancar?', ['Apagado, hasta que la lógica decida con datos frescos', 'Encendido, por si hace frío', 'En el último estado, sin comprobar nada', 'Da igual'], 'Arranque seguro: ante la duda, el estado que no causa daños. Luego decide con datos recientes.', { c: 'io_wdt', l: 'io33', h: '¿Qué estado es inofensivo si el nodo no sabe qué estaba pasando?' })
] },

{ id: 'io-m8', title: 'Plataformas y largo alcance', desc: 'Home Assistant y ESPHome, Zigbee, Thread y Matter, LoRaWAN con su tiempo en aire y su 1 %, y NB-IoT/LTE-M.', nodes: [
 L('io34', 'Home Assistant y ESPHome', 'cloud', ['io_ha', 'io_report', 'io_automation'], [
  Q('Quieres que un ESP32 con un sensor de temperatura aparezca en tu panel domótico. ¿Crees que hace falta programarlo en C++?', ['No necesariamente: se puede describir en un archivo de configuración', 'Sí, siempre', 'Sí, y además un servidor en la nube', 'No: el ESP32 aparece solo sin configurar nada'], 'ESPHome genera el firmware a partir de un archivo YAML que describe la placa y sus sensores.', { predict: true, c: 'io_ha', h: 'Piensa en describir qué hay conectado en lugar de programar cómo leerlo.' }),
  { t: 'explore', text: 'ESPHome puede filtrar en el propio nodo antes de enviar. Ajusta el filtro delta (enviar solo si cambia) y el latido (enviar de todos modos cada cierto tiempo).', viz: 'io_delta', params: PP.delta(),
    tasks: [
      { q: 'pocos', min: 1, max: 1, text: 'Baja de 6 envíos por hora', done: 'Con un delta de 0,2 °C ya no se envía cada pequeña variación.', hint: 'Sube el delta.' },
      { q: 'silOk', min: 1, max: 1, text: 'Y asegúrate de que nunca pasen más de 15 minutos sin noticias', done: 'Delta + latido: pocos mensajes y nunca un silencio ambiguo.', hint: 'Añade un latido de 15 minutos o menos.' }
    ] },
  I('<b>Home Assistant</b> es una plataforma domótica libre que corre en tu casa (Raspberry Pi, mini PC). Reúne aparatos de cientos de marcas y protocolos, con paneles, historial y automatizaciones, sin necesitar nube.', { svg: FLOW(['Integración', 'Dispositivo', 'Entidades', 'Automatizaciones'], 'una integración trae dispositivos; cada dato o control es una entidad') }),
  I('<b>ESPHome</b> genera el firmware del ESP32 a partir de un YAML: describes la placa, la red y los sensores; él compila, instala (también por OTA) y lo integra en Home Assistant con su API cifrada.', { code: 'esphome:\n  name: clima-salon\n\nesp32:\n  board: esp32dev\n\nwifi:\n  ssid: !secret wifi_ssid\n  password: !secret wifi_password\n\napi:\n  encryption:\n    key: !secret api_key_salon\n\nota:\n  - platform: esphome\n    password: !secret ota_salon\n\ni2c:\n  sda: GPIO21\n  scl: GPIO22\n\nsensor:\n  - platform: sht3xd\n    address: 0x44\n    temperature:\n      name: "Temperatura salón"\n    humidity:\n      name: "Humedad salón"\n    update_interval: 60s' }),
  I('ESPHome admite <b>filtros</b> en el propio nodo: calibración, media móvil, envío por cambio… Es el filtrado en el borde que ya conoces, en pocas líneas.', { code: '    temperature:\n      name: "Temperatura salón"\n      filters:\n        - offset: -0.4                 # calibración con el baño de hielo\n        - sliding_window_moving_average:\n            window_size: 5\n            send_every: 5\n        - delta: 0.2                   # solo si cambia 0,2 °C o más' }),
  I('Las <b>automatizaciones</b> de Home Assistant tienen disparador, condiciones y acciones, como las de Node-RED, y corren en local.', { code: 'automation:\n  - alias: "Avisar de ventilar"\n    triggers:\n      - trigger: numeric_state\n        entity_id: sensor.co2_dormitorio\n        above: 1000\n    conditions:\n      - condition: numeric_state\n        entity_id: sensor.ocupacion\n        above: 0\n    actions:\n      - action: notify.mobile_app_mi_movil\n        data:\n          message: "Abre la ventana"' }),
  { t: 'steps', text: 'Del YAML al panel, paso a paso.', steps: ['Escribes clima-salon.yaml y pones las claves en secrets.yaml.', 'La primera instalación va por USB; a partir de ahí, por OTA.', 'El nodo arranca, se conecta y anuncia su API cifrada en la red.', 'Home Assistant lo descubre: lo añades con su clave de cifrado.', 'Aparecen dos entidades: temperatura y humedad del salón, listas para paneles y automatizaciones.'], result: 'Sin escribir C++, y con todo en local.' },
  Q('¿Dónde están las claves en ese YAML?', ['En secrets.yaml, referenciadas con !secret', 'En claro en el archivo', 'En la nube de ESPHome', 'No tiene claves'], 'El YAML se puede compartir sin secretos.', { c: 'io_ha', h: 'Busca la palabra !secret.' }),
  Q('Con ese YAML, ¿cada cuánto se envía la temperatura?', ['Cada 60 s', 'Cada segundo', 'Solo al cambiar', 'Una vez al día'], 'update_interval: 60s.', { code: 'update_interval: 60s', c: 'io_ha', h: 'Lee el último campo del sensor.' }),
  Q('¿Qué hace el filtro delta?', ['Solo envía si el valor cambia al menos esa cantidad respecto al último enviado', 'Suma esa cantidad', 'Redondea a esa cantidad', 'Envía cada tantos segundos'], 'Envío por cambio.', { code: '- delta: 0.2', c: 'io_report', h: 'Recuerda la exploración del principio.' }),
  { t: 'order', q: 'Ordena las partes de «si el CO₂ pasa de 1000 ppm y hay alguien en casa, avisa».', items: ['Disparador: el CO₂ supera 1000 ppm', 'Condición: la ocupación es mayor que 0', 'Acción: enviar una notificación'], e: 'Disparador, condición, acción.', c: 'io_automation', h: 'Primero lo que despierta la automatización.' },
  Q('¿ESPHome o tu propio código Arduino con MQTT?', ['ESPHome para sensores y actuadores típicos; código propio cuando necesitas lógica muy específica', 'Siempre ESPHome', 'Siempre código propio', 'Ninguno: solo la nube'], 'ESPHome también puede publicar por MQTT si lo prefieres.', { c: 'io_ha', h: 'Cada herramienta tiene su terreno.' }),
  Q('Un nodo ESPHome hace de proxy Bluetooth. ¿Para qué sirve?', ['Para que Home Assistant reciba sensores BLE que están lejos del servidor', 'Para cargar el móvil', 'Para hacer de router WiFi', 'Para LoRa'], 'Amplía el alcance del BLE a través de la red.', { c: 'io_ha', h: 'BLE llega a pocos metros; la red de casa, a todas partes.' }),
  { t: 'match', q: 'Une cada concepto de Home Assistant.', pairs: [['Entidad', 'Un dato o control concreto'], ['Dispositivo', 'El aparato que agrupa varias entidades'], ['Integración', 'El conector con un protocolo o una marca'], ['Automatización', 'Disparador, condiciones y acciones']], c: 'io_ha', h: 'Recuerda la cadena de la primera tarjeta.' },
  I('<b>Resumen</b>\n· Home Assistant: integraciones, dispositivos, entidades y automatizaciones, en local.\n· ESPHome: firmware desde YAML, claves en secrets.yaml, OTA y API cifrada.\n· Filtros en el nodo: offset, media, delta.')
 ]),
 PRJ('io-p14', 'Proyecto: riego con previsión de lluvia', 'io_irrigation'),
 PRJ('io-p15', 'Proyecto: persiana de baja tensión con ESPHome', 'io_blinds'),
 L('io35', 'Zigbee, Thread y Matter', 'antenna', ['io_mesh', 'io_zbchan', 'io_espchips'], [
  Q('Tu sensor Zigbee de la terraza, a pila, pierde la conexión con el coordinador del salón. ¿Qué crees que lo arregla mejor?', ['Poner un enchufe Zigbee a medio camino', 'Pilas más caras', 'Un segundo coordinador', 'Acercar el router WiFi'], 'Zigbee forma una malla: los equipos enchufados repiten los mensajes de los demás.', { predict: true, c: 'io_mesh', h: 'Piensa en quién podría hacer de puente.' }),
  { t: 'explore', text: 'Un coordinador y un sensor a pila. Cada salto llega a unos 12 m en interior.', viz: 'io_meshviz', params: PP.mesh(),
    tasks: [
      { q: 'llega', min: 0, max: 0, text: 'Aleja el sensor hasta que pierda la conexión', done: 'Fuera del alcance de un salto, no hay conexión directa.' },
      { q: 'recupera', min: 1, max: 1, text: 'Recupéralo a 20 m o más con un enchufe a medio camino', done: 'El enchufe hace de router: dos saltos y conectado.', hint: 'Pon el enchufe Zigbee.' }
    ] },
  I('<b>Zigbee</b> y <b>Thread</b> usan la misma radio de bajo consumo (IEEE 802.15.4, a 2,4 GHz y 250 kbit/s) y forman <b>mallas</b>.', { code: 'Capa         Zigbee             Thread           WiFi\nAplicación   Zigbee (clusters)  Matter u otras   Matter, MQTT, HTTP\nRed          red Zigbee         IPv6 + 6LoWPAN   IPv4 / IPv6\nRadio        IEEE 802.15.4      IEEE 802.15.4    IEEE 802.11' }),
  I('Papeles en una red Zigbee:', { svg: CHK([['Coordinador: crea la red y la une a tu servidor', 2], ['Router: equipo enchufado que repite mensajes', 2], ['Dispositivo final: a pila, duerme y cuelga de un padre', 2]], 'Quién hace qué') }),
  I('Zigbee no habla IP: necesita un <b>coordinador</b> (un adaptador USB o de red) y un programa que traduzca, como ZHA (integrado en Home Assistant) o Zigbee2MQTT (publica cada dispositivo en MQTT). Todo local.', { svg: FLOW(['Sensor Zigbee', 'Coordinador USB', 'Zigbee2MQTT', 'Broker MQTT'], 'o ZHA directamente en Home Assistant') }),
  I('Convivencia en 2,4 GHz: los canales Zigbee van del 11 al 26, separados 5 MHz y con unos 2 MHz de ancho. Con el WiFi en el 1, el 6 o el 11, los canales Zigbee 15, 20 y 25 quedan en los huecos. Aleja también el coordinador de los puertos USB 3, que meten ruido.', { code: 'canal Zigbee k → 2405 + 5·(k − 11) MHz\nZigbee 15 = 2425 MHz   (entre WiFi 1 y 6)\nZigbee 20 = 2450 MHz   (entre WiFi 6 y 11)\nZigbee 25 = 2475 MHz   (por encima del WiFi 11)' }),
  I('<b>Thread</b> sí habla IP: IPv6 sobre esa misma radio, comprimido con 6LoWPAN. Se une al resto de tu red con un <b>border router</b> y no depende de un único coordinador: si un router cae, la malla se reorganiza.', { svg: VS({ t: 'Zigbee', l: ['sin IP', 'un coordinador', 'traductor a tu red'], c: 'var(--led)' }, { t: 'Thread', l: ['IPv6 en la malla', 'border router(s)', 'se reorganiza sola'], c: 'var(--ok)' }) }),
  I('<b>Matter</b> no es una radio: es un lenguaje común de aplicación que va sobre IP (WiFi, Ethernet o Thread). Promete que un aparato funcione con cualquier plataforma, con <b>control local</b> y con varias plataformas a la vez. Se empareja con un código QR, normalmente usando Bluetooth LE para la puesta en marcha.', { svg: FLOW(['Matter', 'sobre WiFi, Ethernet o Thread', 'control local'], 'Matter es el idioma; Thread o WiFi, el camino') }),
  { t: 'steps', text: 'Tu WiFi usa el canal 1 y el del vecino, el 6. ¿Qué canal Zigbee eliges?', steps: ['WiFi 1 ocupa de 2402 a 2422 MHz; WiFi 6, de 2427 a 2447 MHz.', 'Zigbee 15 = 2425 MHz: justo en el hueco entre los dos.', 'Zigbee 20 = 2450 MHz y Zigbee 25 = 2475 MHz: por encima del 6, libres.', 'Evita los del 11 al 14 y del 16 al 19: caen dentro de alguna red WiFi.'], result: '15, 20 o 25 (también vale el 26, si tus aparatos lo admiten).' },
  { t: 'match', q: 'Une cada papel de una red Zigbee.', pairs: [['Coordinador', 'Crea la red y la conecta con tu servidor'], ['Router', 'Equipo enchufado que repite mensajes'], ['Dispositivo final', 'Sensor a pila que duerme'], ['Mapa de red', 'Muestra por dónde va cada mensaje']], c: 'io_mesh', h: 'Quién crea, quién repite y quién duerme.' },
  Q('¿Qué equipo NO hace de router en una malla Zigbee?', ['Un sensor de puerta a pila', 'Un enchufe inteligente', 'Una bombilla', 'Un relé enchufado'], 'Los de pila duermen y no repiten.', { c: 'io_mesh', h: 'Para repetir hay que estar siempre despierto.' }),
  TU('Tu WiFi está en el canal 6 y el del vecino en el 1. Elige un canal Zigbee que no caiga dentro de ninguno.', 'io_wifich', { ch: FX(6), v: FX(0), zb: SL('Canal Zigbee', 17, 11, 26, 1) }, { q: 'zbLibre', min: 1, max: 1, text: 'Objetivo: canal Zigbee libre', hint: 'Busca los huecos: 15, 20, 25 o 26.' }, 'Los canales Zigbee estrechos caben entre las redes WiFi.', { c: 'io_zbchan', h: 'Calcula 2405 + 5·(k − 11) y compáralo con 2412 ± 10 y 2437 ± 10.' }),
  { t: 'match', q: 'Une cada tecnología con su descripción.', pairs: [['Zigbee', 'Malla 802.15.4 con coordinador, sin IP'], ['Thread', 'Malla IPv6 sobre 802.15.4 con border router'], ['Matter', 'Lenguaje común sobre IP: WiFi, Ethernet o Thread'], ['BLE', 'Puesta en marcha de Matter desde el móvil']], c: 'io_mesh', h: 'Dos son mallas, uno es un idioma y otro sirve para emparejar.' },
  Q('¿Matter es una radio?', ['No: es una capa de aplicación que va sobre WiFi, Ethernet o Thread', 'Sí, a 868 MHz', 'Sí, y sustituye al WiFi', 'Es otro nombre de Zigbee'], 'Thread es la radio de bajo consumo que suele acompañarlo.', { c: 'io_mesh', h: 'Recuerda la tabla de capas.' }),
  Q('¿Qué chip de Espressif usarías para un sensor Thread a pila?', ['ESP32-H2 (radio de Zigbee y Thread, y BLE, sin WiFi)', 'ESP32 clásico', 'ESP32-S3', 'Cualquiera con WiFi'], 'El ESP32-C6 también sirve, y además tiene WiFi.', { c: 'io_espchips', h: 'Necesitas la radio 802.15.4; el WiFi gasta y no hace falta.' }),
  Q('Un interruptor Zigbee está vinculado directamente (binding) a una bombilla. Si se cae el coordinador…', ['El interruptor sigue encendiendo la bombilla', 'Deja de funcionar', 'Se reinicia toda la red', 'Pasa a WiFi'], 'El vínculo directo no necesita al coordinador para cada orden.', { c: 'io_mesh', h: '¿Por dónde viaja la orden en un vínculo directo?' }),
  I('<b>Resumen</b>\n· Zigbee y Thread: mallas 802.15.4; los enchufados repiten, los de pila duermen.\n· Zigbee necesita coordinador y traductor; Thread habla IPv6 con border router.\n· Matter es el idioma común sobre IP.\n· Canales Zigbee 15, 20 y 25 entre los WiFi 1, 6 y 11.')
 ]),
 PRJ('io-p16', 'Proyecto: red Zigbee con un nodo hecho por ti', 'io_zigbee'),
 L('io36', 'LoRa y LoRaWAN: clases, OTAA y pasarelas', 'antenna', ['io_lwnet', 'io_lwclass'], [
  Q('Un sensor LoRaWAN envía cada 30 minutos y le mandas una orden. ¿Cuándo crees que la recibe?', ['Justo después de su siguiente envío', 'Al instante', 'Nunca: LoRaWAN no tiene bajada', 'Al reiniciar la pasarela'], 'En la clase más común, el nodo solo escucha un momento justo después de cada envío.', { predict: true, c: 'io_lwclass', h: '¿Está escuchando un nodo que ahorra al máximo?' }),
  { t: 'explore', text: 'Una orden llega al servidor 1 minuto después de una subida del nodo. Cambia la clase y el ritmo de subidas.', viz: 'io_lwclassviz', params: PP.lwc(),
    tasks: [
      { q: 'lat', min: 1700, max: 1e9, text: 'En clase A, sube cada 30 min o más y mira cuánto espera la orden', done: 'La orden espera a la siguiente subida: casi media hora.', hint: 'Subida cada 30 o 60 min.' },
      { q: 'lat', min: 0, max: 5, text: 'Consigue que la orden llegue en menos de 5 s', done: 'Clase C: escucha casi siempre… y gasta como un aparato enchufado.', hint: 'Cambia de clase.' }
    ] },
  I('<b>LoRa</b> es una modulación de radio que llega a kilómetros con muy poca potencia, a cambio de muy pocos datos. <b>LoRaWAN</b> es el protocolo de red construido encima. La física de LoRa la verás a fondo en la especialidad de Radio.', { svg: VS({ t: 'LoRa', l: ['la modulación', 'cómo viaja la señal', 'punto a punto posible'], c: 'var(--led)' }, { t: 'LoRaWAN', l: ['la red', 'pasarelas y servidores', 'seguridad y clases'], c: 'var(--ok)' }) }),
  I('Un nodo LoRaWAN no se asocia a una pasarela: transmite, y <b>cualquier</b> pasarela que lo oiga lo reenvía por IP al servidor de red.', { svg: FLOW(['Nodo transmite', 'Pasarelas lo oyen', 'Servidor de red', 'Quita duplicados', 'Tu aplicación'], 'las pasarelas son repetidores ciegos') }),
  I('Clases de dispositivo:', { svg: CHK([['Clase A: escucha solo dos ventanas tras cada subida', 2], ['Clase B: además, ventanas a horas programadas', 2], ['Clase C: escucha casi siempre (enchufados)', 2]], 'Cuándo escucha el nodo') }),
  I('Activación: <b>OTAA</b> (por el aire) negocia claves de sesión nuevas al unirse, a partir de DevEUI, JoinEUI y una clave raíz (AppKey). <b>ABP</b> graba a mano las claves de sesión, que no cambian.', { svg: VS({ t: 'OTAA (recomendada)', l: ['claves nuevas al unirse', 'contadores en orden', 'más robusta'], c: 'var(--ok)' }, { t: 'ABP', l: ['claves fijas grabadas', 'contadores dan guerra', 'al reiniciar'], c: 'var(--err)' }) }),
  I('LoRaWAN cifra con AES-128: la pasarela solo reenvía bytes que no puede leer. Infraestructura: pasarelas de 8 canales, un servidor de red (The Things Network, comunitario en la nube, o ChirpStack en tu propio servidor) y tu aplicación.', { svg: CHK([['Pasarela de 8 canales (las de 1 canal no cumplen)', 1], ['Servidor de red: TTN o ChirpStack', 1], ['Tu carga, cifrada con la clave de aplicación', 1], ['Para todo en local: tu pasarela + ChirpStack', 1]], 'Montar una red LoRaWAN') }),
  { t: 'steps', text: 'Tres pasarelas oyen el mismo mensaje de tu nodo. ¿Qué pasa?', steps: ['Cada pasarela lo reenvía al servidor de red con su potencia recibida.', 'El servidor de red ve tres copias con el mismo contador de trama.', 'Se queda con una (y apunta qué pasarela lo oyó mejor, para responder por ella).', 'El servidor de aplicación lo descifra y te lo entrega una sola vez.'], result: 'Más pasarelas = más fiabilidad, sin duplicados.' },
  { t: 'order', q: 'Ordena el viaje de un mensaje LoRaWAN.', items: ['El nodo transmite por radio', 'Una o varias pasarelas lo reciben', 'Lo reenvían por IP al servidor de red', 'El servidor de red quita duplicados y lo verifica', 'El servidor de aplicación lo descifra y lo entrega'], e: 'Los nodos no se asocian a una pasarela: cualquiera que los oiga, reenvía.', c: 'io_lwnet', h: 'De la radio a internet, y de ahí a tu aplicación.' },
  Q('Dos pasarelas reciben el mismo mensaje. ¿Qué pasa?', ['El servidor de red elimina el duplicado y se queda con la mejor recepción', 'Llega dos veces a tu aplicación', 'Se pierde', 'Las pasarelas se pelean'], 'La redundancia mejora la fiabilidad.', { c: 'io_lwnet', h: 'Repasa el ejemplo paso a paso.' }),
  { t: 'match', q: 'Une cada dispositivo con su clase.', pairs: [['Sensor de humedad a pila', 'Clase A'], ['Válvula enchufada que debe obedecer al momento', 'Clase C'], ['Contador que debe escuchar a horas fijas', 'Clase B']], c: 'io_lwclass', h: '¿Cuándo necesita escuchar cada uno?' },
  Q('Un nodo de clase A envía cada 30 minutos. Le mandas una orden. ¿Cuándo la recibe?', ['Tras su próxima subida: hasta 30 minutos después', 'Al instante', 'Nunca', 'Cuando reinicies la pasarela'], 'En clase A, la bajada va pegada a la subida.', { c: 'io_lwclass', h: 'Recuerda la exploración.' }),
  Q('¿Por qué se recomienda OTAA frente a ABP?', ['Genera claves de sesión nuevas en cada unión y gestiona bien los contadores', 'Gasta menos batería siempre', 'No necesita servidor', 'Transmite más lejos'], 'Seguridad y robustez.', { c: 'io_lwnet', h: '¿Qué pasa con las claves en cada caso?' }),
  Q('¿Puede quien gestiona una pasarela comunitaria leer tus datos?', ['No: la carga va cifrada con la clave de aplicación', 'Sí, siempre', 'Solo si el mensaje es largo', 'Solo de noche'], 'La pasarela es un repetidor ciego.', { c: 'io_lwnet', h: '¿Quién tiene la clave de aplicación?' }),
  Q('Quieres una red LoRaWAN totalmente local, sin internet. ¿Qué usas?', ['Tu pasarela y ChirpStack en un servidor de casa', 'The Things Network', 'Una pasarela de un canal', 'NB-IoT'], 'Servidor de red propio.', { c: 'io_lwnet', h: '¿Cuál de las opciones no depende de un servicio en la nube?' }),
  I('<b>Resumen</b>\n· LoRa es la modulación; LoRaWAN, la red.\n· Cualquier pasarela reenvía; el servidor de red quita duplicados.\n· Clase A: escucha solo tras subir; C: siempre (enchufada).\n· OTAA mejor que ABP. Todo local: pasarela + ChirpStack.')
 ]),
 L('io37', 'Tiempo en aire y ciclo de trabajo del 1 %', 'timer', ['io_lora', 'io_payload'], [
  Q('Un mensaje LoRaWAN de 10 bytes dura unos 62 ms en el aire con la configuración más rápida (SF7). Con la más lenta y de más alcance (SF12), ¿cuánto crees que dura?', ['Cerca de 1,5 s', '62 ms', 'Unos 120 ms', 'Unos 30 s'], 'Cada paso de SF dobla la duración: de SF7 a SF12 hay cinco pasos, unas 24 veces más.', { predict: true, c: 'io_lora', h: 'Si cada paso dobla, ¿cuánto son cinco pasos?' }),
  { t: 'explore', text: 'Elige el factor de dispersión (SF) y el tamaño de tu carga. Mira cuánto aire ocupa cada mensaje y cuántos caben dentro de los límites.', viz: 'io_duty', params: PP.duty(),
    tasks: [
      { q: 'porHora', min: 60, max: 1e9, text: 'Consigue enviar al menos 60 mensajes por hora cumpliendo el 1 %', done: 'Con 10 bytes, hasta SF10 cabe uno por minuto.', hint: 'Baja el SF.' },
      { q: 'porDia', min: 288, max: 1e9, text: 'Ahora al menos 288 al día dentro de los 30 s diarios de TTN', done: 'Uno cada 5 minutos solo cabe con SF7: el límite de la red es más duro que el legal.', hint: 'SF7 y carga pequeña.' }
    ] },
  I('El <b>factor de dispersión</b> (SF, de 7 a 12) decide cuánto se «estira» cada símbolo. Cada paso dobla la duración: más alcance y robustez, pero más <b>tiempo en aire</b> y más energía por mensaje.', { code: 'Tiempo en aire de 10 bytes (125 kHz, LoRaWAN):\nSF7      62 ms\nSF8     113 ms\nSF9     206 ms\nSF10    371 ms\nSF11    823 ms\nSF12   1483 ms' }),
  I('En Europa, LoRaWAN usa la banda de 868 MHz, de uso libre con condiciones. En la sub-banda de 868,0–868,6 MHz cada equipo puede transmitir como mucho el <b>1 % del tiempo</b>. Es una norma legal, no una recomendación.', { code: '1 % de una hora = 36 s de aire\nTras transmitir T, callar al menos 99·T\nmensajes por hora = 36 s / T' }),
  I('Además de lo legal está lo justo: The Things Network pide a cada nodo no pasar de <b>30 s de aire al día</b> en subida y muy pocas bajadas (del orden de 10 al día). Con SF7 y 10 bytes eso son unos 480 mensajes al día; con SF12, unos 20.', { svg: BARS([['SF7: mensajes al día con 30 s', 486, 'var(--ok)'], ['SF10', 80, 'var(--led)'], ['SF12', 20, 'var(--err)']], '', 'con 10 bytes de carga') }),
  I('Cómo ahorrar aire:', { svg: CHK([['Menos bytes: binario, no JSON', 1], ['Menos mensajes: resúmenes y envío por cambio', 1], ['SF más bajo: pasarela más cerca o mejor antena', 1], ['ADR: la red ajusta SF y potencia si te oye de sobra', 1]], 'Ahorrar tiempo en aire') }),
  { t: 'steps', text: '10 bytes con SF10 duran unos 371 ms. ¿Cuántos mensajes por hora permite el 1 %? ¿Y al día con la política de TTN?', steps: ['1 % de una hora: 36 s = 36 000 ms.', '36 000 / 371 ≈ 97 → <b>97 mensajes por hora</b>.', 'TTN: 30 s al día = 30 000 ms → 30 000 / 371 ≈ <b>80 al día</b>.', 'Uno cada 18 minutos como mucho: manda el límite de TTN.'], result: 'Lo legal deja 97 por hora; lo justo, 80 al día.' },
  G('io_duty'),
  G('io_duty'),
  TU('Quieres enviar 10 bytes una vez por minuto cumpliendo el 1 %. Busca el SF más alto que lo permite.', 'io_duty', PP.duty({ PL: FX(10) }), { q: 'porHora', min: 60, max: 120, text: 'Objetivo: al menos 60 mensajes por hora, con el SF más alto posible', hint: 'Necesitas un tiempo en aire de 600 ms o menos.' }, 'Con SF10 son unos 371 ms; con SF11 ya pasan de 800 ms.', { c: 'io_lora', h: '36 000 ms / 60 mensajes = 600 ms por mensaje como mucho.' }),
  TU('Envía 10 bytes cada 5 minutos (288 al día) sin pasar de los 30 s diarios de TTN.', 'io_duty', PP.duty({ SF: LS('Factor de dispersión (SF)', 10, [7, 8, 9, 10, 11, 12]), PL: FX(10) }), { q: 'porDia', min: 288, max: 1e6, text: 'Objetivo: al menos 288 mensajes al día', hint: 'Cada mensaje debe durar menos de unos 104 ms.' }, 'Solo SF7 (unos 62 ms) lo cumple: con SF8 ya son unos 113 ms por mensaje.', { c: 'io_lora', h: '30 000 ms / 288 mensajes ≈ 104 ms por mensaje.' }),
  Q('Un nodo fijo con señal excelente sigue en SF12. ¿Qué activas?', ['ADR, para que la red le asigne un SF más bajo', 'Un mensaje más largo', 'Más potencia', 'Clase C'], 'Menos aire, menos batería y menos colisiones.', { c: 'io_lora', h: '¿Necesita hablar tan despacio si se le oye de sobra?' }),
  Q('¿Qué carga es mejor para LoRaWAN?', ['6 bytes binarios que se decodifican en el servidor', 'Un JSON de 60 bytes', 'Un texto «temperatura=21,4;humedad=48»', 'Una imagen pequeña'], 'Cada byte cuesta tiempo en aire.', { c: 'io_payload', h: 'Recuerda la lección de JSON frente a binario.' }),
  Q('Con SF10, SF11 o SF12 en EU868, ¿cuántos bytes tuyos caben como máximo en un mensaje?', ['51', '242', '1500', '8'], 'Con SF más bajos cabe más: hasta 115 con SF9 y unos 222–242 con SF7 y SF8.', { c: 'io_payload', h: 'Con los SF más lentos el límite es muy pequeño: unas pocas decenas.' }),
  I('<b>Resumen</b>\n· Cada paso de SF dobla el tiempo en aire.\n· 1 % legal: 36 s por hora; tras T, callar 99·T.\n· TTN: 30 s de aire al día por nodo.\n· Ahorra aire: binario, menos mensajes, SF bajo y ADR.')
 ]),
 PRJ('io-p17', 'Proyecto: aviso de buzón por LoRa', 'io_mailbox'),
 L('io38', 'NB-IoT y LTE-M', 'antenna', ['io_cellular', 'io_remote'], [
  Q('Un contador de agua en el sótano de un edificio envía una lectura al día. ¿Qué crees que necesita para conectarse sin que montes ninguna antena?', ['Una SIM con tarifa IoT y cobertura del operador', 'Un router WiFi en cada sótano', 'Una pasarela LoRaWAN propia', 'Nada'], 'NB-IoT y LTE-M usan la red de los operadores, como un móvil, pero pensadas para equipos pequeños que gastan poco.', { predict: true, c: 'io_cellular', h: '¿Qué infraestructura existe ya en casi todas partes?' }),
  { t: 'explore', text: 'Un módulo celular con una batería de 2600 mAh. Elige el modo de ahorro y cuántas veces envía al día.', viz: 'io_psmviz', params: PP.psm(),
    tasks: [
      { q: 'cinco', min: 1, max: 1, text: 'Consigue más de 5 años de autonomía', done: 'PSM: duerme sin darse de baja de la red. Con tanta autonomía, manda la autodescarga de la batería.', hint: 'Modo PSM y pocos envíos.' },
      { q: 'equil', min: 1, max: 1, text: 'Ahora que una orden llegue en menos de 2 minutos y aguante más de 6 meses', done: 'eDRX: escucha de tarde en tarde. Un término medio.', hint: 'Prueba eDRX.' }
    ] },
  I('Dos tecnologías celulares para IoT, en espectro con licencia del operador:', { svg: VS({ t: 'NB-IoT', l: ['decenas de kbit/s', 'equipos fijos', 'llega a sótanos', 'contadores'], c: 'var(--led)' }, { t: 'LTE-M', l: ['hasta ~1 Mbit/s', 'movilidad', 'menos latencia', 'localizadores'], c: 'var(--ok)' }), more: 'Ambas dan IP: puedes usar MQTT o HTTP, o protocolos ligeros como CoAP sobre UDP.' }),
  I('Modos de ahorro celulares:', { svg: CHK([['PSM: duerme horas o días sin darse de baja de la red', 2], ['eDRX: alarga los intervalos en que escucha avisos', 2], ['Sin ellos: escucha cada pocos segundos y gasta', 0]], 'Dormir sin perder el registro') }),
  I('Módulos habituales: SIM7080G (LTE-M y NB-IoT), Quectel BG95, Nordic nRF9160 o nRF9151 (con microcontrolador propio). Con un ESP32 se manejan por UART con comandos AT o con librerías como TinyGSM.', { code: 'AT          → OK                 (el módulo responde)\nAT+CPIN?    → +CPIN: READY       (SIM lista)\nAT+CSQ      → +CSQ: 18,99        (calidad de la señal)\nAT+CPSMS=1  …                    (pedir el modo PSM)' }),
  I('Coste y dependencia: cuota por SIM, cobertura decidida por el operador y redes antiguas (2G, 3G) que se están apagando en Europa. Para algo que debe durar 10 años, pregunta por la hoja de ruta del operador.', { svg: CHK([['Sin infraestructura propia que mantener', 1], ['Cuota por cada SIM', 0], ['La cobertura la decide el operador', 0], ['2G y 3G: en cierre; mira la hoja de ruta', 0]], 'Pros y contras') }),
  { t: 'steps', text: 'Un contador con PSM: 5 µA dormido y un envío al día que gasta 0,1 mAh. Batería de 2600 mAh. ¿Cuánto dura?', steps: ['Dormido: 0,005 mA × 24 h = <b>0,12 mAh</b> al día.', 'Envío: <b>0,1 mAh</b> al día.', 'Total: 0,22 mAh al día → 2600 / 0,22 ≈ <b>11 800 días</b>, unos 32 años.', 'En la práctica manda la <b>autodescarga</b> de la batería, que pierde un pequeño porcentaje de carga cada año.'], result: 'Con PSM, el límite deja de ser el consumo y pasa a ser la batería.' },
  { t: 'match', q: 'Une cada tecnología con su punto fuerte.', pairs: [['NB-IoT', 'Llegar a sótanos con muy pocos datos'], ['LTE-M', 'Movilidad y más velocidad'], ['LoRaWAN', 'Infraestructura propia sin cuota'], ['WiFi', 'Mucho ancho de banda en casa']], c: 'io_cellular', h: 'Repasa la comparación del principio.' },
  Q('Contadores de agua en los sótanos de toda una ciudad. ¿Qué encaja?', ['NB-IoT', 'LTE-M', 'WiFi', 'Bluetooth LE'], 'Fijos, pocos datos y mucha penetración.', { c: 'io_cellular', h: 'Fijo, en sótanos y con muy pocos datos.' }),
  Q('Un localizador para bicicletas de alquiler. ¿Qué encaja mejor?', ['LTE-M', 'NB-IoT', 'Zigbee', 'Thread'], 'Movilidad.', { c: 'io_cellular', h: '¿Cuál lleva bien cambiar de antena en marcha?' }),
  Q('Un sensor envía una vez al día y no necesita recibir órdenes rápido. ¿Qué modo usas?', ['PSM, con un temporizador largo', 'Siempre conectado', 'eDRX de pocos segundos', 'Ninguno'], 'Dormir sin perder el registro en la red.', { c: 'io_cellular', h: 'Recuerda la primera tarea de la exploración.' }),
  Q('¿Qué riesgo tiene diseñar hoy un producto con un módulo que solo hace 2G?', ['Que el operador apague su red 2G y el producto se quede sin conexión', 'Ninguno', 'Que gaste poco', 'Que sea demasiado rápido'], 'Varias redes 2G y 3G europeas ya han cerrado o tienen fecha.', { c: 'io_cellular', h: '¿Qué está pasando con las redes antiguas?' }),
  Q('¿Qué tienen NB-IoT y LTE-M que no tiene LoRaWAN con pasarela propia?', ['Una cuota por SIM y dependencia del operador', 'Cifrado de los datos', 'Modos de bajo consumo', 'Alcance de kilómetros'], 'A cambio, no montas ni mantienes infraestructura.', { c: 'io_cellular', h: '¿Quién pone la red en cada caso?' }),
  Q('¿Puede un módulo NB-IoT hablar MQTT con tu broker de casa?', ['Sí, a través de una VPN o de un servidor intermedio accesible de forma segura', 'No, nunca', 'Solo por SMS', 'Solo con LoRaWAN'], 'Tu broker está tras el NAT de casa: no lo abras a internet sin más.', { c: 'io_remote', h: 'Recuerda la lección del NAT.' }),
  I('<b>Resumen</b>\n· NB-IoT: fijo, poco dato, sótanos. LTE-M: movilidad y más velocidad.\n· PSM duerme sin darse de baja; eDRX escucha de tarde en tarde.\n· Cuota y operador a cambio de no mantener red.\n· Para llegar a casa: VPN, nunca puertos abiertos.')
 ]),
 PRJ('io-p18', 'Proyecto: red LoRaWAN para el huerto', 'io_garden'),
 PRJ('io-p19', 'Proyecto final: tu domótica completa, local y robusta', 'io_final')
],
exam: [
  Q('El sensor lee 18,0 °C. ¿Qué temperatura publica este nodo?', ['17,4 °C', '18,6 °C', '18,0 °C', '0,6 °C'], 'El filtro offset suma −0,6 a cada lectura: 18,0 − 0,6 = 17,4 °C. Es la calibración de un punto, hecha en el nodo.', { c: 'io_ha', l: 'io34', code: 'sensor:\n  - platform: sht3xd\n    address: 0x44\n    temperature:\n      name: "Temperatura despensa"\n      filters:\n        - offset: -0.6\n    update_interval: 30s', h: 'offset suma esa cantidad a cada lectura: fíjate en el signo.' }),
  Q('En ESPHome, ¿qué combinación envía poco y aun así garantiza noticias cada 15 minutos?', ['Envío por cambio (delta) y un latido cada 15 minutos', 'Solo delta', 'Un update_interval de 1 s', 'Solo una media móvil'], 'Delta ahorra envíos cuando no hay cambios; el latido asegura que el silencio nunca pase de 15 minutos y distingue «estable» de «muerto».', { c: 'io_report', l: 'io34', h: 'Necesitas una pieza que ahorre y otra que garantice un máximo de silencio.' }),
  Q('Un nodo ESPHome mide temperatura y humedad. ¿Qué ves en Home Assistant?', ['Un dispositivo con dos entidades', 'Dos dispositivos con una entidad cada uno', 'Una sola entidad', 'Una integración por sensor'], 'El dispositivo es el aparato; cada dato o control concreto es una entidad.', { c: 'io_ha', l: 'io34', h: 'Repasa la diferencia entre dispositivo y entidad.' }),
  Q('¿Qué ventaja tiene la API nativa de ESPHome con Home Assistant?', ['Funciona en local y cifrada, sin depender de internet', 'Necesita la nube de ESPHome para funcionar', 'Evita tener que configurar el WiFi', 'Solo funciona con Zigbee'], 'Home Assistant y el nodo hablan directamente en tu red, con una clave de cifrado. Sin nube de por medio.', { c: 'io_ha', l: 'io34', h: '¿Por dónde viajan los datos entre el nodo y Home Assistant?' }),
  { t: 'order', q: 'Ordena lo que ocurre con «si se abre la ventana del dormitorio con la calefacción encendida, apágala».', items: ['El sensor de la ventana pasa a «abierta»', 'Home Assistant evalúa la automatización por ese disparador', 'Comprueba la condición: la calefacción está encendida', 'Ejecuta la acción: apagar la calefacción'], e: 'Disparador, condición, acción: el cambio despierta la regla, la condición filtra y la acción actúa.', c: 'io_automation', l: 'io34', h: 'Primero algo cambia, luego se comprueba, y por último se actúa.' },
  Q('Tu WiFi está en el canal 6. ¿Te sirve el canal Zigbee 18?', ['No: 2440 MHz cae dentro de la red WiFi del canal 6 (2427–2447 MHz)', 'Sí: Zigbee y WiFi no se afectan', 'Sí: los canales Zigbee no se solapan con el WiFi', 'No: el 18 no existe en Zigbee'], 'Zigbee 18 = 2405 + 5 × 7 = 2440 MHz, en medio de la red del canal 6. Los huecos con WiFi en 1, 6 y 11 son el 15, el 20 y el 25.', { c: 'io_zbchan', l: 'io35', h: 'Calcula la frecuencia con 2405 + 5·(k − 11) y compárala con lo que ocupa el canal 6.' }),
  TU('Tu red WiFi está en el canal 3 y las de tus vecinos en el 1 y el 6. Elige un canal Zigbee que no caiga dentro de ninguna.', 'io_wifich', { ch: FX(3), v: FX(0), zb: SL('Canal Zigbee', 15, 11, 26, 1) }, { q: 'zbLibre', min: 1, max: 1, text: 'Objetivo: canal Zigbee libre', hint: 'Mira hasta dónde llega la red WiFi más alta.' }, 'Las tres redes WiFi ocupan hasta 2447 MHz. El 15 (2425 MHz) cae dentro de la del canal 3. Desde el 20 (2450 MHz) hasta el 26 quedan libres.', { c: 'io_zbchan', l: 'io35', h: 'Calcula dónde acaba la red del canal 6 (centro + 10 MHz) y busca el primer canal Zigbee por encima.' }),
  Q('Todos tus equipos Zigbee van a pila. El sensor del garaje pierde la conexión y pones otro sensor a pila a medio camino. ¿Por qué no ayuda?', ['Los dispositivos a pila duermen y no repiten mensajes', 'Porque Zigbee no admite más de un sensor', 'Porque hace falta un segundo coordinador', 'Sí ayuda: cualquier equipo repite'], 'En la malla, solo los equipos enchufados hacen de router. Para extenderla, un enchufe o una bombilla Zigbee a medio camino.', { c: 'io_mesh', l: 'io35', h: '¿Qué papel puede tener un equipo que pasa casi todo el tiempo dormido?' }),
  Q('¿Qué necesita una malla Thread para hablar con el resto de tu red de casa?', ['Un border router', 'Un coordinador Zigbee', 'Una pasarela LoRaWAN', 'Nada: Thread usa WiFi'], 'Thread ya habla IPv6, pero sobre su propia radio. El border router une la malla con tu red IP.', { c: 'io_mesh', l: 'io35', h: 'Thread habla IP, pero por otra radio: ¿qué une las dos redes?' }),
  Q('Tienes un enchufe Matter por WiFi y otro Matter sobre Thread. ¿Qué tienen en común?', ['El mismo lenguaje de aplicación (Matter) sobre IP; solo cambia la red de debajo', 'La misma radio', 'Nada: son estándares distintos', 'Que los dos necesitan la nube del fabricante'], 'Matter no es una radio: es una capa de aplicación sobre IP que puede ir por WiFi, Ethernet o Thread.', { c: 'io_mesh', l: 'io35', h: 'Separa la capa de aplicación de la radio en la tabla de capas.' }),
  Nm('Un nodo LoRaWAN de clase A sube cada 15 minutos. Una orden llega al servidor 1 minuto después de una subida. ¿Cuántos minutos espera hasta llegar al nodo?', 14, 'min', 'En clase A solo escucha tras cada subida. La siguiente es a los 15 minutos: 15 − 1 = 14 minutos de espera.', { tol: 0, c: 'io_lwclass', l: 'io36', h: '¿Cuándo vuelve a abrir el nodo sus ventanas de escucha?' }),
  Q('¿Por qué un sensor LoRaWAN a pila es de clase A y no de clase C?', ['En clase C la radio escucha casi siempre y vaciaría la batería', 'Porque la clase C no puede enviar', 'Porque la clase A tiene más alcance', 'Porque la clase C necesita una SIM'], 'Clase A: escucha solo dos ventanas tras cada subida y duerme el resto. Clase C: escucha casi siempre, para equipos enchufados.', { c: 'io_lwclass', l: 'io36', h: 'Compara cuánto tiempo pasa la radio escuchando en cada clase.' }),
  Q('¿Qué datos usa un nodo OTAA para unirse a la red?', ['DevEUI, JoinEUI y la AppKey', 'Solo la IP de la pasarela', 'Las claves de sesión grabadas a mano', 'La MAC del router WiFi'], 'Con OTAA, el nodo negocia claves de sesión nuevas a partir de su identificador, el de unión y la clave raíz. Grabar a mano las claves de sesión es ABP.', { c: 'io_lwnet', l: 'io36', h: 'Distingue entre lo que se graba en OTAA y en ABP.' }),
  Q('Llevas tu nodo LoRaWAN de la zona de una pasarela a la de otra de la misma red. ¿Qué reconfiguras?', ['Nada: cualquier pasarela que lo oiga reenvía sus mensajes', 'La dirección de la pasarela nueva', 'Las claves de sesión', 'El canal WiFi'], 'Los nodos no se asocian a una pasarela: transmiten, y todas las que los oyen reenvían al servidor de red.', { c: 'io_lwnet', l: 'io36', h: '¿Se asocia el nodo a una pasarela concreta, como un ESP32 a un router?' }),
  Nm('Un mensaje con SF11 dura 823 ms. Con el límite del 1 %, ¿cuántos segundos debe callar después como mínimo?', 81.5, 's', 'Tras transmitir T, callar 99 · T: 99 × 0,823 s ≈ 81,5 s.', { tol: 0.5, c: 'io_lora', l: 'io37', h: 'Si solo puedes emitir el 1 % del tiempo, ¿cuánto callas por cada unidad emitida?' }),
  Nm('Con SF8, cada mensaje de 10 bytes dura unos 113 ms. ¿Cuántos mensajes al día permite la política de 30 s de TTN?', 265, 'mensajes', '30 000 ms / 113 ms ≈ 265,5: 265 mensajes enteros al día, uno cada 5 minutos y medio.', { tol: 1, c: 'io_lora', l: 'io37', h: 'Pasa 30 s a ms y divide entre lo que dura cada mensaje.' }),
  Q('Gracias a ADR, un nodo pasa de SF12 a SF9. ¿Cuánto cambia su tiempo en aire?', ['Baja unas 8 veces', 'Baja un 25 %', 'Baja a la mitad', 'No cambia'], 'Cada paso de SF dobla el tiempo en aire: tres pasos son unas 2 × 2 × 2 = 8 veces (de 1483 a 206 ms con 10 bytes).', { c: 'io_lora', l: 'io37', h: 'Cuenta los pasos de SF y aplica el factor de cada uno.' }),
  Nm('Tu nodo envía la temperatura multiplicada por 10 en dos bytes. Llega 0x00E1. ¿Cuántos °C son?', 22.5, '°C', '0x00E1 = 14 × 16 + 1 = 225. Dividido entre 10: 22,5 °C. El decodificador del servidor hace esta cuenta.', { tol: 0.01, c: 'io_payload', l: 'io37', h: 'Pasa el hexadecimal a decimal y deshaz el × 10.' }),
  Q('Con SF12 en EU868 caben 51 bytes por mensaje y tu JSON ocupa 70. ¿Qué haces?', ['Codificarlo en binario: los mismos datos caben en unos pocos bytes', 'Partirlo en dos mensajes JSON', 'Pasar a clase C', 'Quitar los decimales y seguir con JSON'], 'Cada byte cuesta tiempo en aire. En binario, un valor de 16 bits ocupa 2 bytes y el servidor lo decodifica.', { c: 'io_payload', l: 'io37', h: 'Compara cuánto ocupa un dato como texto y como entero de 16 bits.' }),
  Nm('Un módulo con PSM gasta 3 µA dormido y hace 2 envíos al día de 0,15 mAh cada uno. ¿Cuántos mAh gasta al día?', 0.372, 'mAh', 'Dormido: 0,003 mA × 24 h = 0,072 mAh. Envíos: 2 × 0,15 = 0,3 mAh. Total: 0,372 mAh al día.', { tol: 0.005, c: 'io_cellular', l: 'io38', h: 'Suma la carga dormido (corriente × 24 h) y la de los envíos.' }),
  Q('Un localizador de ganado debe recibir «modo búsqueda» en un par de minutos y durar meses con su batería. ¿Qué modo de ahorro?', ['eDRX: escucha avisos de tarde en tarde, cada minuto o poco más', 'PSM con un temporizador de un día', 'Ninguno: escuchar cada pocos segundos', 'Apagar el módem entre envíos'], 'PSM tardaría horas en oír la orden y sin ahorro se agota pronto. eDRX alarga los intervalos de escucha: equilibrio entre latencia y consumo.', { c: 'io_cellular', l: 'io38', h: 'Busca el modo que sigue escuchando, pero de vez en cuando.' }),
  Q('Con el módulo celular conectado por UART, ¿qué comando te dice si la SIM está lista?', ['AT+CPIN?', 'AT+CSQ', 'AT+CPSMS=1', 'AT'], 'AT+CPIN? responde +CPIN: READY si la SIM está lista. AT+CSQ da la calidad de la señal, AT+CPSMS=1 pide PSM y AT solo comprueba que el módulo responde.', { c: 'io_cellular', l: 'io38', h: 'Repasa qué responde cada comando de la lección.' }),
  Q('Una cooperativa quiere 200 sensores en sus campos, sin cuotas mensuales, y puede poner una pasarela en la nave. ¿Qué encaja mejor?', ['LoRaWAN con pasarela propia', 'NB-IoT', 'LTE-M', 'WiFi'], 'NB-IoT y LTE-M cobran una cuota por SIM y dependen del operador. Con una pasarela propia, LoRaWAN cubre kilómetros sin cuotas.', { c: 'io_cellular', l: 'io38', h: 'Compara qué cuesta mantener cada opción a lo largo de los años.' }),
  Q('Un módulo LTE-M en una furgoneta debe recibir órdenes de tu broker casero. ¿Qué opción es segura?', ['Que el módulo y tu casa se conecten de salida a una VPN o a un servidor intermedio', 'Abrir el puerto 1883 del router de casa', 'Activar UPnP para que se abra solo', 'Darle al módulo la IP privada del broker'], 'Tu broker está tras el NAT de casa: no lo expongas. Las dos partes salen hacia un punto común y el tráfico vuelve por esas conexiones.', { c: 'io_remote', l: 'io38', h: 'Recuerda quién debe iniciar las conexiones para no abrir nada en casa.' })
] }

    ]
  });
})();
