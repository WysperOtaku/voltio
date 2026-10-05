/* Voltio · especialidad: Radio y radiofrecuencia.
   Ondas, espectro y ley, decibelios y balance de enlace, circuitos de RF, líneas y antenas,
   modulación y receptores, módulos de radio con microcontroladores y escucha con SDR.
   Todo el texto, los ejercicios y el código son originales. */
(() => {
  const H = Widgets.H, num = H.num;
  // Formatos con coma decimal y prefijos
  const sig = x => num(x, Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 10 ? 1 : 2);
  const fLen = m => m >= 1000 ? sig(m / 1000) + ' km' : m >= 1 ? sig(m) + ' m' : m >= 0.01 ? num(m * 100, 1) + ' cm' : num(m * 1000, 1) + ' mm';
  const fHz = hz => hz >= 1e9 ? num(hz / 1e9, 3) + ' GHz' : hz >= 1e6 ? num(hz / 1e6, 3) + ' MHz' : hz >= 1e3 ? num(hz / 1e3, 1) + ' kHz' : num(hz, 0) + ' Hz';
  const fW = w => { for (const [k, u] of [[1e3, 'kW'], [1, 'W'], [1e-3, 'mW'], [1e-6, 'µW'], [1e-9, 'nW'], [1e-12, 'pW'], [1e-15, 'fW']]) if (w >= k * 0.9995) return sig(w / k) + ' ' + u; return sig(w / 1e-18) + ' aW'; };
  const fVolt = v => v >= 1 ? sig(v) + ' V' : v >= 1e-3 ? sig(v * 1e3) + ' mV' : v >= 1e-6 ? sig(v * 1e6) + ' µV' : sig(v * 1e9) + ' nV';
  const bandName = mhz => mhz < 0.3 ? 'LF' : mhz < 3 ? 'MF' : mhz < 30 ? 'HF' : mhz < 300 ? 'VHF' : mhz < 3000 ? 'UHF' : 'SHF';
  const LORA_SNR = { 7: -7.5, 8: -10, 9: -12.5, 10: -15, 11: -17.5, 12: -20 };
  // Tiempo en aire de LoRa (nota de aplicación de Semtech; cabecera explícita, CRC activo, preámbulo de 8)
  const loraToa = (sf, bwk, pl, cr) => { const ts = Math.pow(2, sf) / bwk; const de = ts > 16 ? 1 : 0; const nPay = 8 + Math.max(Math.ceil((8 * pl - 4 * sf + 28 + 16) / (4 * (sf - 2 * de))) * (cr + 4), 0); return { ts, ms: (8 + 4.25) * ts + nPay * ts, de }; };

  /* Parámetros de las visualizaciones (los usan conceptos y lecciones) */
  const pF = (val, fixed) => fixed ? { val, fixed: true } : { label: 'Frecuencia', val, list: [0.153, 0.6, 1, 3.5, 7, 14, 27, 50, 88, 100, 137, 145, 433.92, 868, 1090, 1575.42, 2440, 5800], unit: 'MHz', dec: 3 };
  const pK = (val = 0.95, fixed) => fixed ? { val, fixed: true } : { label: 'Factor de acortamiento', val, min: 0.9, max: 1, step: 0.01, dec: 2 };
  const LINK = { Pt: { label: 'Potencia del emisor', val: 14, min: -10, max: 30, step: 1, unit: 'dBm', dec: 0 }, G: { label: 'Ganancia de cada antena', val: 2, min: -5, max: 12, step: 0.5, unit: 'dBi', dec: 1 }, Lc: { label: 'Cables y conectores (total)', val: 2, min: 0, max: 10, step: 0.5, unit: 'dB', dec: 1 }, f: { label: 'Frecuencia', val: 868, list: [433.92, 868, 2440], unit: 'MHz', dec: 2 }, d: { label: 'Distancia', val: 2, list: [0.05, 0.1, 0.2, 0.5, 1, 2, 3, 5, 10, 15, 20, 30, 50, 80, 100], unit: 'km', dec: 2 }, S: { label: 'Sensibilidad del receptor', val: -123, min: -140, max: -70, step: 1, unit: 'dBm', dec: 0 } };
  const LCL = (v = 100) => ({ label: 'L', val: v, list: [0.1, 0.22, 0.47, 1, 2.2, 4.7, 10, 22, 47, 100, 220, 470], unit: 'µH', dec: 2 });
  const LCC = (v = 220) => ({ label: 'C', val: v, list: [5, 10, 22, 47, 100, 220, 365, 470, 1000], unit: 'pF', dec: 0 });
  const LCQ = (v = 50) => ({ label: 'Q', val: v, min: 5, max: 300, step: 5, dec: 0 });
  const MODT = (v = 1) => ({ label: 'Tipo: 1 AM · 2 FM · 3 ASK · 4 FSK · 5 BPSK', val: v, list: [1, 2, 3, 4, 5], dec: 0 });
  const MODM = (v = 0.6) => ({ label: 'Profundidad / desviación', val: v, min: 0, max: 1, step: 0.05, dec: 2 });
  const LORA = { SF: { label: 'Factor de ensanchado (SF)', val: 9, min: 7, max: 12, step: 1, dec: 0 }, BW: { label: 'Ancho de banda', val: 125, list: [125, 250, 500], unit: 'kHz', dec: 0 }, PL: { label: 'Carga útil', val: 20, min: 1, max: 100, step: 1, unit: 'bytes', dec: 0 }, CR: { label: 'Corrección (1 = 4/5 … 4 = 4/8)', val: 1, list: [1, 2, 3, 4], dec: 0 } };
  const SH = (f = 100, fi = 10.7, side = 1) => ({ f: { label: 'Emisora', val: f, list: [87.5, 88.6, 91.4, 96.3, 100, 101.7, 104.2, 107.9], unit: 'MHz', dec: 1 }, fi: { label: 'Frecuencia intermedia', val: fi, list: [0.455, 10.7, 21.4], unit: 'MHz', dec: 3 }, side: { label: 'Oscilador local: 1 encima · −1 debajo', val: side, list: [1, -1], dec: 0 } });
  const FRES = { d: { label: 'Distancia', val: 2, list: [0.5, 1, 2, 5, 10, 20, 30, 50], unit: 'km', dec: 1 }, f: { label: 'Frecuencia', val: 868, list: [433.92, 868, 2440], unit: 'MHz', dec: 2 }, h: { label: 'Altura de las antenas', val: 2, min: 2, max: 60, step: 1, unit: 'm', dec: 0 }, obs: { label: 'Obstáculo en el centro', val: 0, min: 0, max: 50, step: 1, unit: 'm', dec: 0 } };

  /* ===================== CONCEPTOS =====================
     Cada concepto es una destreza estrecha: todas sus alternativas explican lo mismo desde otro ángulo
     y su pregunta de comprobación practica esa misma destreza. */
  Object.assign(CONCEPTS, {
    /* --- Ondas y propagación --- */
    rf_emwave: { name: 'Qué es una onda de radio', alts: [
      { title: 'Campos que se empujan', text: 'Una corriente que <b>cambia</b> crea un campo magnético que cambia, y este un campo eléctrico que cambia: los dos se sostienen y se alejan de la antena a la velocidad de la luz. Una corriente continua solo crea un campo fijo, que no se aleja.\nLa luz, la radio y los rayos X son esa misma onda; solo cambia la frecuencia.', q: mcq('Por un hilo pasa una corriente continua constante de 1 A. ¿Emite ondas de radio?', ['No: un campo que no cambia no se propaga', 'Sí, más que con alterna', 'Sí, pero solo de noche', 'Solo si el hilo es muy largo'], 'Para radiar hace falta que la corriente cambie.') },
      { title: 'Una sola familia', text: 'Radio, microondas, infrarrojo, luz visible y rayos X son <b>radiación electromagnética</b>: viajan igual de rápido, también por el vacío, sin necesitar aire. Lo único que las distingue es la <b>frecuencia</b> (y con ella la longitud de onda). Y todas nacen de cargas que oscilan: por eso una antena necesita corriente alterna.', q: mcq('¿Qué tienen en común el WiFi y la luz de una bombilla?', ['Son la misma clase de onda electromagnética, con distinta frecuencia', 'Nada: el WiFi es una forma de sonido', 'Los dos necesitan aire para viajar', 'Nada: la luz es mucho más rápida'], 'Misma naturaleza y misma velocidad; distinta frecuencia.') }
    ] },
    rf_speed: { name: 'Tiempo de propagación (t = d / c)', alts: [
      { title: 'Trescientos mil por segundo', text: 'La onda viaja a <b>c ≈ 300 000 km/s</b>. Para saber cuánto tarda: <b>t = d / c</b>. 300 km tardan 1 ms; los unos 20 200 km de un satélite GPS, unos 67 ms.', q: mcq('¿Cuánto tarda una señal de radio en recorrer 3000 km?', ['10 ms', '1 ms', '100 ms', '1 s'], '3000 / 300 000 = 0,01 s.') },
      { title: 'La regla de los 30 cm', text: 'Memoriza una cifra: la luz recorre <b>30 cm por nanosegundo</b>. De ahí sale todo: 1 µs son 300 m y 1 ms son 300 km. Por eso el GPS necesita relojes tan precisos: 10 ns de error son 3 m de error en la distancia.', q: mcq('El reloj de un receptor se equivoca 100 ns. ¿Qué error de distancia supone?', ['30 m', '3 m', '300 m', '0,3 m'], '0,3 m/ns × 100 ns = 30 m.') }
    ] },
    rf_wave: { name: 'Longitud de onda (λ = c / f)', alts: [
      { title: 'Lo que avanza en un ciclo', text: 'Una onda de radio viaja a la velocidad de la luz, unos 300 000 km/s. Mientras la antena hace un ciclo completo, la onda avanza una distancia fija: la <b>longitud de onda λ</b>.\n<b>λ = c / f</b>. Atajo de bolsillo: <b>λ (m) = 300 / f (MHz)</b>.', q: mcq('¿Qué longitud de onda tiene una señal de 100 MHz?', ['3 m', '30 m', '0,3 m', '300 m'], '300 / 100 = 3 m.') },
      { title: 'Proporción inversa', text: 'La velocidad es fija: si la antena oscila el doble de rápido, en cada ciclo la onda avanza la mitad. <b>Doble de frecuencia, mitad de longitud de onda</b>. Por eso las antenas de WiFi son diminutas y las de onda media, enormes.', q: mcq('A 433 MHz, λ ≈ 69 cm. ¿Cuánto mide λ a 866 MHz?', ['Unos 35 cm', 'Unos 138 cm', 'Unos 69 cm', 'Unos 17 cm'], 'El doble de frecuencia, la mitad de λ.') },
      { title: 'Cuidado con los prefijos', text: 'El error típico está en las unidades. Con <b>f en MHz, 300 / f da metros</b>: 13,56 MHz → 22 m. Si la frecuencia viene en GHz, pásala antes a MHz: 2,44 GHz = 2440 MHz → 0,123 m = 12,3 cm. Si te sale una antena de WiFi de 120 m, revisa los prefijos.', q: mcq('¿Qué longitud de onda tiene una señal de 5,8 GHz?', ['Unos 5,2 cm', 'Unos 52 m', 'Unos 5,2 mm', 'Unos 52 cm'], '5,8 GHz = 5800 MHz → 300 / 5800 ≈ 0,052 m.') }
    ] },
    rf_polar: { name: 'Polarización', alts: [
      { title: 'La orientación del campo', text: 'La <b>polarización</b> es la orientación del campo eléctrico: una antena vertical emite con polarización vertical. Si la receptora está cruzada (horizontal), capta muy poco: en la práctica, unos 20 dB menos. Con antenas lineales, emisor y receptor se colocan <b>igual</b>.', q: mcq('El emisor tiene la antena horizontal. ¿Cómo pones la del receptor?', ['También horizontal', 'Vertical', 'Da igual', 'Apuntando al suelo'], 'Polarizaciones iguales; cruzadas pierden muchos dB.') },
      { title: 'Lineal y circular', text: 'Hay polarización <b>lineal</b> (vertical u horizontal) y <b>circular</b> (el campo gira). Entre dos lineales cruzadas se pierde muchísimo, así que deben ir orientadas igual; entre una lineal y una circular se pierden solo 3 dB, giren como giren. Por eso los satélites, que cambian de orientación, usan circular.', q: mcq('Recibes un satélite de polarización circular con un dipolo. ¿Cuánto pierdes por polarización?', ['Unos 3 dB, se oriente como se oriente', 'Unos 20 dB', 'Nada', 'Toda la señal'], 'Lineal frente a circular: la mitad de la potencia.') }
    ] },
    rf_bands: { name: 'Bandas del espectro (LF … SHF)', alts: [
      { title: 'Décadas con nombre', text: 'La UIT corta el espectro por décadas: <b>LF</b> 30–300 kHz · <b>MF</b> 0,3–3 MHz · <b>HF</b> 3–30 MHz · <b>VHF</b> 30–300 MHz · <b>UHF</b> 0,3–3 GHz · <b>SHF</b> 3–30 GHz. Para clasificar una frecuencia, mira entre qué límites cae: 1575 MHz está entre 300 y 3000 MHz → UHF; 13,56 MHz, entre 3 y 30 → HF.', q: mcq('¿En qué banda está la radio FM (unos 100 MHz)?', ['VHF', 'UHF', 'HF', 'MF'], 'Entre 30 y 300 MHz.') },
      { title: 'Un mapa con chinchetas', text: 'Asocia cada banda con algo que conoces:\n· LF: RFID de 125 kHz. · MF: onda media (≈ 1 MHz).\n· HF: onda corta y NFC (13,56 MHz). · VHF: FM (88–108 MHz) y aviación.\n· UHF: TDT, 433 y 868 MHz, GPS (1575 MHz) y WiFi de 2,4 GHz. · SHF: WiFi de 5 GHz.\nMuy por debajo queda la red eléctrica (50 Hz); muy por encima, la luz (cientos de THz).', q: mcq('¿Qué uso típico tiene la banda LF?', ['RFID de 125 kHz', 'WiFi', 'Radio FM', 'GPS'], '125 kHz cae entre 30 y 300 kHz.') }
    ] },
    rf_bandtrade: { name: 'Frecuencias bajas frente a altas', alts: [
      { title: 'Lo que da y lo que quita', text: '<b>Bajas</b>: antenas enormes y poco ancho de banda, pero atraviesan bien paredes y vegetación.\n<b>Altas</b>: antenas pequeñas y <b>mucho ancho de banda</b> (más datos), pero visión directa y <b>más atenuación</b> en paredes, lluvia y cuerpos.', q: mcq('Necesitas transmitir vídeo en alta definición. ¿Qué zona del espectro te conviene?', ['Frecuencias altas: hay mucho ancho de banda', 'Onda media: llega lejos', 'LF: atraviesa mejor', 'Da igual'], 'Más datos exige más ancho de banda, y eso abunda arriba.') },
      { title: 'Cuestión de porcentajes', text: 'Un canal ocupa una fracción de su frecuencia: el 1 % de 1 MHz son 10 kHz (un poco de audio); el 1 % de 5 GHz son 50 MHz (mucho vídeo). Por eso los datos rápidos suben de frecuencia. El precio: a más frecuencia, casi todos los materiales absorben más, y el WiFi de 5 GHz atraviesa peor las paredes que el de 2,4 GHz.', q: mcq('El WiFi de 5 GHz llega peor a la habitación del fondo que el de 2,4 GHz. ¿Por qué?', ['Las paredes atenúan más a más frecuencia', 'Siempre emite con menos potencia', 'Usa otra polarización', 'Porque es más moderno'], 'Más frecuencia, más pérdidas en obstáculos.') }
    ] },
    rf_antsize: { name: 'Tamaño de una antena (λ/2 y λ/4)', alts: [
      { title: 'Fracciones de λ', text: 'El <b>dipolo</b> mide unos λ/2: dos brazos de λ/4. El <b>monopolo</b> es medio dipolo, de λ/4, y la otra mitad la pone un plano de tierra. Primero calcula λ = 300 / f (MHz) y luego divide. En la práctica se cortan algo más cortos que la teoría (factor ≈ 0,95).', q: mcq('¿Cuánto mide, en teoría, un cuarto de onda a 868 MHz?', ['Unos 8,6 cm', 'Unos 34,5 cm', 'Unos 17,3 cm', 'Unos 4,3 cm'], 'λ = 300 / 868 ≈ 34,5 cm → /4 ≈ 8,6 cm.') },
      { title: 'Atajos en MHz', text: 'Con f en MHz: <b>λ/4 (cm) ≈ 7500 / f</b> y <b>λ/2 (cm) ≈ 15 000 / f</b>. 145 MHz → 52 cm; 433 MHz → 17,3 cm; 868 MHz → 8,6 cm. Al revés, un dipolo de 1 m (100 cm) resuena en 15 000 / 100 = 150 MHz. Y a 1 MHz, λ/4 serían 75 m: por eso las radios de onda media usan una bobina con ferrita.', q: mcq('¿Cuánto mide un dipolo de media onda completo para 300 MHz?', ['50 cm', '25 cm', '1 m', '2 m'], '15 000 / 300 = 50 cm.') },
      { title: 'Mírala crecer', text: 'Mueve la frecuencia: al bajarla, λ y las antenas crecen en la misma proporción. Fíjate en que λ/4 siempre es la mitad de λ/2, y en que el factor de acortamiento recorta un poco la longitud práctica.', tune: { viz: 'rf_lambda', params: { f: pF(145), k: pK() } }, q: mcq('A 145 MHz el cuarto de onda mide unos 52 cm. ¿Y a 435 MHz (el triple)?', ['Unos 17 cm', 'Unos 156 cm', 'Unos 52 cm', 'Unos 26 cm'], 'Triple de frecuencia, un tercio de longitud.') }
    ] },
    rf_trim: { name: 'Ajustar la longitud de una antena', alts: [
      { title: 'Cortar largo, recortar midiendo', text: 'Una antena más larga resuena más abajo; una más corta, más arriba. Como la resonancia real cae algo por debajo de la teoría, se corta <b>un poco larga</b> y se recorta midiendo: recortar es fácil, alargar no. Una antena hecha para una frecuencia cercana (915 en vez de 868 MHz) funciona, pero desadaptada: pierdes algo de señal.', q: mcq('Tu monopolo resuena en 410 MHz y lo quieres en 433 MHz. ¿Qué haces?', ['Recortarlo un poco', 'Alargarlo', 'Cambiar el cable', 'Subir la potencia'], 'Resuena bajo → está largo → recorta.') },
      { title: 'La regla de tres', text: 'La longitud es inversamente proporcional a la frecuencia: <b>L nueva = L actual × f medida / f deseada</b>. Ejemplo: 9,0 cm que resuenan en 830 MHz, para 868 MHz: 9,0 × 830 / 868 ≈ 8,6 cm. Recorta en dos o tres pasos y vuelve a medir.', q: mcq('Un dipolo de 34 cm resuena en 420 MHz. ¿Qué longitud tendrá para 440 MHz?', ['Unos 32,5 cm', 'Unos 35,6 cm', 'Unos 34 cm', 'Unos 30 cm'], '34 × 420 / 440 ≈ 32,5 cm.') }
    ] },
    rf_prop: { name: 'Caminos de propagación', alts: [
      { title: 'Cada banda, su camino', text: '· <b>LF y MF</b>: onda de tierra que sigue la curvatura (cientos de km).\n· <b>HF</b>: rebota en la ionosfera (de un continente a otro).\n· <b>VHF y más</b>: visión directa hasta el horizonte (LoRa, FM, GPS desde el espacio).\nDe vez en cuando, capas ionizadas esporádicas o conductos en la troposfera alargan la VHF.', q: mcq('¿Qué banda usarías para hablar con otro país sin satélites ni repetidores?', ['HF (onda corta)', 'UHF (433 MHz)', 'Microondas (5,8 GHz)', 'Da igual'], 'La HF se refleja en la ionosfera.') },
      { title: 'La ionosfera sigue al Sol', text: 'El Sol ioniza capas altas de la atmósfera. De día, la capa baja (D) absorbe la onda media; de noche desaparece y la señal rebota más arriba: oyes emisoras lejanas. En verano, nubes ionizadas esporádicas (esporádica E) o conductos en la troposfera llevan a veces la FM a más de 1000 km.', q: mcq('¿Por qué la onda media llega mucho más lejos de noche?', ['Desaparece la capa D que de día la absorbe', 'Las emisoras suben la potencia', 'El aire está más frío', 'Hay menos tráfico de radio'], 'Sin la capa D, la señal rebota en capas más altas.') }
    ] },
    rf_horizon: { name: 'Horizonte radio (4,12·√h)', alts: [
      { title: 'La fórmula', text: 'Por encima de unos 30 MHz la onda va casi en línea recta, y la Tierra es curva. Con la refracción normal de la atmósfera, una antena a h metros ve hasta <b>d ≈ 4,12·√h km</b>. Entre dos antenas, los horizontes se suman: <b>4,12·(√h₁ + √h₂)</b>.', q: mcq('Una antena a 25 m y otra a 4 m. ¿Horizonte radio?', ['Unos 29 km', 'Unos 12 km', 'Unos 120 km', 'Unos 4 km'], '4,12 × (5 + 2) ≈ 28,8 km.') },
      { title: 'La raíz manda', text: 'Cuadruplicar la altura solo duplica el horizonte. Una antena a 9 m ve unos 12 km; un avión a 10 000 m, unos 412 km. Si tu antena del tejado oye un avión a 400 km es porque él está altísimo: su √h pone casi toda la distancia.', q: mcq('Subes tu antena de 4 m a 16 m. ¿Qué le pasa a su horizonte?', ['Se duplica', 'Se cuadruplica', 'No cambia', 'Se reduce'], '√16 / √4 = 2.') }
    ] },
    rf_fresnel: { name: 'Zona de Fresnel', alts: [
      { title: 'El balón de rugby', text: 'La energía no viaja por una línea fina: ocupa un volumen con forma de balón de rugby alrededor de la línea de visión, la <b>primera zona de Fresnel</b>. Si el suelo o un obstáculo invaden más del 40 % de su radio, se pierde señal aunque “veas” la otra antena. Por eso un enlace a ras de suelo llega mucho menos que uno entre tejados.', q: mcq('A 2 km y 868 MHz, el radio de Fresnel en el centro es unos 13 m. Tus antenas están a 1,5 m sobre un campo llano. ¿Qué pasa?', ['El suelo invade la zona de Fresnel y pierdes bastante señal', 'Nada, hay visión directa', 'La señal mejora por el reflejo', 'La onda rodea el suelo sin pérdidas'], 'El alcance a ras de suelo es mucho menor que entre tejados.') },
      { title: 'La cuenta', text: 'Radio en el punto medio: <b>r ≈ 8,66·√(d / f)</b> metros, con d en km y f en GHz. Despeja al menos el <b>60 %</b> de r por encima de cualquier obstáculo (y del abombamiento de la Tierra en enlaces largos). Ejemplo: 5 km a 868 MHz → r ≈ 20,8 m; necesitas unos 12,5 m libres sobre el obstáculo.', tune: { viz: 'rf_fresnel', params: FRES }, q: mcq('Enlace de 4 km a 1 GHz. ¿Radio de Fresnel en el centro?', ['Unos 17 m', 'Unos 35 m', 'Unos 4 m', 'Unos 1,7 m'], '8,66 × √4 ≈ 17,3 m.') }
    ] },
    rf_multipath: { name: 'Multitrayecto y desvanecimiento', alts: [
      { title: 'Ecos que se suman', text: 'Al receptor llegan la onda directa y reflejos (paredes, suelo, coches) con retrasos distintos. Se suman en fase o en contrafase: basta mover el receptor <b>media longitud de onda</b> para pasar de un máximo a un nulo de hasta 20 dB. A 2,44 GHz (λ ≈ 12,3 cm) eso son unos 6 cm.', q: mcq('¿Cada cuánto se repiten los nulos de multitrayecto a 868 MHz (λ ≈ 34,5 cm)?', ['Unos 17 cm', 'Unos 34,5 cm', 'Unos 8,6 cm', 'Unos 3,5 m'], 'Media longitud de onda.') },
      { title: 'Todo lo que se mueve cuenta', text: 'Si una persona camina por la habitación cambian los reflejos, y el RSSI de un receptor quieto sube y baja. El remedio es la <b>diversidad</b>: dos antenas separadas (más de media λ) rara vez caen en un nulo a la vez, y el receptor usa la mejor o las combina.', q: mcq('¿Por qué un router con dos antenas separadas sufre menos cortes?', ['Es raro que las dos estén en un nulo a la vez', 'Transmite el doble de potencia', 'Usa dos bandas a la vez', 'Sus antenas son más largas'], 'Diversidad de antena.') }
    ] },
    rf_obstacle: { name: 'Obstáculos y atenuación', alts: [
      { title: 'Cada obstáculo resta dB', text: 'Una pared de ladrillo puede restar 5–15 dB; hormigón armado o metal, mucho más; una caja metálica cerrada, casi todo (jaula de Faraday). El agua absorbe mucho a 2,4 GHz, y el cuerpo humano es casi todo agua. Las cifras varían muchísimo: mídelas.', q: mcq('Metes un sensor de 868 MHz en una caja de aluminio cerrada. ¿Qué esperas?', ['Que casi no salga señal', 'Más alcance por el reflejo', 'Lo mismo', 'Que transmita en otra frecuencia'], 'El metal cerrado bloquea la RF.') },
      { title: 'Restar del margen', text: 'Piensa en dB disponibles: tu balance de enlace da un margen y cada obstáculo se come una parte. El GPS llega con unos −130 dBm, casi sin margen: un techo de hormigón lo deja por debajo de lo recuperable. Si mides 15–20 dB menos de lo previsto, sospecha de obstáculos (o de la zona de Fresnel invadida), no de la fórmula.', q: mcq('Tu balance prevé −105 dBm y mides −122 dBm. ¿Qué es lo más probable?', ['Obstáculos en el camino: 17 dB de pérdidas extra', 'Que la fórmula de espacio libre esté mal', 'Que el receptor mida de más', 'Que sobre margen'], 'La realidad casi siempre pierde más que el espacio libre.') }
    ] },

    /* --- Ley y seguridad --- */
    rf_legal: { name: 'Quién regula el espectro', alts: [
      { title: 'Carreteras con normas', text: 'El espectro es un recurso público y compartido. Cada tramo tiene uso asignado y condiciones, que en España recoge el <b>CNAF</b> y vigila la inspección de telecomunicaciones del Estado. En las bandas de <b>uso común</b> no pides licencia ni pagas, pero <b>no tienes protección</b>: aceptas las interferencias de otros equipos legales y no debes causarlas.', q: mcq('Tu sensor de 433 MHz recibe interferencias del mando legal de un vecino. ¿Qué puedes exigir?', ['Nada: en uso común se aceptan las interferencias', 'Que lo retire', 'Que la administración le multe', 'Subir tu potencia sin límite'], 'Es el precio de no necesitar licencia.') },
      { title: 'Quién decide', text: 'Por capas, de lo general a lo concreto: la <b>UIT</b> reparte el espectro mundial; la <b>CEPT</b> armoniza en Europa (ERC 70-03 para dispositivos de corto alcance); la <b>UE</b> fija decisiones y exige el marcado CE (Directiva RED); y <b>España</b> lo concreta en el CNAF y sus notas nacionales. Consulta siempre la versión vigente.', q: mcq('¿Dónde se recoge, en España, qué servicio usa cada frecuencia y con qué condiciones?', ['En el CNAF y sus notas nacionales', 'En la caja del aparato', 'Solo en el Reglamento de la UIT', 'En un foro de radio'], 'El CNAF concreta lo que deciden UIT, CEPT y UE.') }
    ] },
    rf_eirp: { name: 'Potencia radiada (PIRE y PRA)', alts: [
      { title: 'El límite está en el aire', text: 'Los límites legales son de potencia <b>radiada</b>, no de la que sale del chip: <b>PIRE = potencia − cables + ganancia de la antena (dBi)</b>. Una antena de más ganancia o un amplificador te sacan del límite aunque el módulo esté certificado. La ganancia de la antena <b>receptora</b>, en cambio, no se emite: mejora el enlace sin tocar el límite.', q: mcq('Módulo de 14 dBm, sin pérdidas, con antena de 6 dBi. ¿PIRE?', ['20 dBm', '14 dBm', '8 dBm', '84 dBm'], '14 + 6 = 20 dBm.') },
      { title: 'Dos referencias', text: '<b>dBi</b> se mide respecto a una antena isotrópica ideal; <b>dBd</b>, respecto a un dipolo, que tiene 2,15 dBi. Por eso <b>dBi = dBd + 2,15</b> y <b>PIRE (EIRP) = PRA (ERP) + 2,15 dB</b>. 25 mW PRA son 14 dBm ERP = 16,15 dBm PIRE. Con más ganancia de antena que un dipolo, baja la potencia del módulo en la misma cantidad.', q: mcq('Un límite de 10 mW PRA (10 dBm ERP). ¿Cuánto es en PIRE?', ['12,15 dBm', '10 dBm', '7,85 dBm', '20 dBm'], 'PIRE = PRA + 2,15 dB.') }
    ] },
    rf_duty: { name: 'Ciclo de trabajo', alts: [
      { title: 'Segundos por hora', text: 'El <b>ciclo de trabajo</b> es el porcentaje del tiempo que puedes transmitir, medido sobre una hora: 1 % = 36 s; 0,1 % = 3,6 s; 10 % = 360 s.\nPaquetes por hora = segundos permitidos / duración de cada envío (con todas sus repeticiones).', q: mcq('Un paquete tarda 100 ms y la sub-banda permite un 1 %. ¿Cuántos paquetes por hora, como mucho?', ['360', '36', '3600', '10'], '36 s / 0,1 s = 360.') },
      { title: 'Elegir sub-banda', text: 'En 868 MHz cada sub-banda tiene su ciclo: 868,0–868,6 MHz con 1 %, 868,7–869,2 MHz con 0,1 % y 869,4–869,65 MHz con 10 %. Si necesitas mucho tiempo de aire, la de 10 % te da cien veces más que la de 0,1 %. Y los paquetes largos (SF altos) gastan el cupo enseguida: divide los segundos permitidos entre lo que dura cada envío.', q: mcq('Con un 0,1 % de ciclo y envíos de 1 s, ¿cuántos por hora?', ['3', '36', '360', '1'], '3,6 s / 1 s = 3,6 → 3 envíos completos.') }
    ] },
    rf_srd: { name: 'Bandas de uso común en Europa', alts: [
      { title: 'La tabla de bolsillo', text: '· 433,05–434,79 MHz: 10 mW PRA, ciclo limitado.\n· 868,0–868,6 MHz: 25 mW PRA y 1 %. · 869,4–869,65 MHz: 500 mW PRA y 10 %.\n· 2400–2483,5 MHz: 100 mW PIRE.\n· PMR446: walkies de 0,5 W PRA, con antena fija y sin modificar.\nComprueba siempre la norma vigente.', q: mcq('¿Qué condición tiene la sub-banda 868,0–868,6 MHz?', ['25 mW PRA y 1 % de ciclo', '500 mW PRA y 10 %', '100 mW PIRE sin ciclo', 'Ninguna'], 'Es la más usada por LoRa en Europa.') },
      { title: 'Uso libre, equipo intacto', text: 'Que una banda sea de uso común significa que el <b>equipo</b> cumple unas condiciones de potencia, antena y ciclo: 433 MHz admite 10 mW PRA; 869,4–869,65 MHz, 500 mW con un 10 %; 2,4 GHz, 100 mW PIRE. Si cambias la antena de un walkie PMR446 o le subes la potencia, deja de ser legal aunque la frecuencia sea la misma.', q: mcq('Un walkie PMR446 con antena fija. ¿Qué cambio es legal?', ['Ninguno: se usa tal como viene', 'Una antena exterior', 'Un amplificador de 5 W', 'Usarlo en 868 MHz'], 'La exención de licencia exige el equipo sin modificar.') }
    ] },
    rf_ham: { name: 'Radioaficionados y licencia', alts: [
      { title: 'Un servicio para aprender', text: 'El servicio de aficionados sirve para la autoformación, la experimentación y la intercomunicación, <b>sin ánimo de lucro</b>: nada de fines comerciales ni publicidad. Para transmitir en sus bandas (2 m, 70 cm, HF…) hay que aprobar un examen y tener autorización con <b>indicativo</b>. Escuchar, en cambio, es libre.', q: mcq('Quieres hablar por un repetidor de 70 cm (430–440 MHz). ¿Qué te hace falta?', ['Licencia de radioaficionado con indicativo', 'Nada: es banda libre', 'Un equipo con marcado CE', 'Permiso del ayuntamiento'], 'Es banda de aficionados, no de uso común.') },
      { title: 'Escuchar sí, transmitir con licencia', text: 'Regla rápida: <b>recibir</b> emisiones públicas (FM, aficionados, ADS-B, balizas) es libre; <b>transmitir</b> fuera de las bandas de uso común exige licencia (2 m, 70 cm… son de aficionados); y hay cosas prohibidas para todos, como los inhibidores. La licencia tampoco permite usos comerciales. Un RTL-SDR, además, solo recibe.', q: mcq('¿Qué actividad no necesita ninguna licencia?', ['Escuchar a radioaficionados con un SDR', 'Transmitir en 144 MHz', 'Contestar por un repetidor de 2 m', 'Emitir con 10 W en 7 MHz'], 'Escuchar emisiones de aficionados es libre.') }
    ] },
    rf_ethics: { name: 'Privacidad y usos prohibidos', alts: [
      { title: 'Recibir lo público, respetar lo privado', text: 'Muchas señales se emiten para que cualquiera las reciba: radiodifusión, ADS-B, aficionados. Las comunicaciones privadas y los datos de otras personas están protegidos: si los captas por casualidad, no los grabas, no los descifras, no los publicas ni los usas. Lo mismo con tarjetas o mandos ajenos: no se copian sin permiso de quien los gestiona.', q: mcq('Tu SDR decodifica el sensor de presión de neumáticos del coche de un vecino. ¿Qué haces?', ['Nada con esos datos: ni guardarlos ni publicarlos', 'Publicarlos en un mapa', 'Copiar su identificador', 'Avisar a todo el barrio'], 'Pueden identificar a una persona.') },
      { title: 'Lo que nunca se hace', text: '<b>Inhibidores</b>: prohibidos, y no distinguen a quién bloquean (también a emergencias). Interceptar o difundir comunicaciones privadas: lo impide el secreto de las comunicaciones. Leer o clonar tarjetas de acceso, bancarias o documentos de otros: aunque sea fácil, no es tu decisión. Ante la duda, no lo hagas.', q: mcq('Alguien quiere un inhibidor “solo para su casa”. ¿Qué le dices?', ['Que es ilegal: bloquea también a otros, incluidas emergencias', 'Que en casa es legal', 'Que es legal si es pequeño', 'Que solo es ilegal en 2,4 GHz'], 'Ningún tamaño ni lugar lo hace legal.') }
    ] },
    rf_safety: { name: 'Seguridad: dónde está el peligro', alts: [
      { title: 'No es la RF de tus módulos', text: 'Un módulo de unos mW no calienta el cuerpo de forma apreciable: está muy por debajo de los límites de exposición. El peligro real en la radio casera es <b>eléctrico</b>: el condensador y el transformador de alta tensión de un microondas (mortales aunque esté desenchufado), un mástil que cae sobre un cable aéreo o un rayo que entra por la antena.', q: mcq('¿Qué es lo más peligroso de todo esto?', ['Abrir un microondas o montar un mástil cerca de un cable eléctrico', 'Un módulo LoRa de 25 mW', 'Un receptor SDR', 'Un nRF24 sobre la mesa'], 'La RF de milivatios no es el problema; la alta tensión, sí.') },
      { title: 'Tres reglas de oro', text: '1) Mástiles: distancia a cualquier línea eléctrica mayor que su altura, nunca con viento ni solo.\n2) Tormenta: antenas desconectadas y unidas a la toma de tierra exterior.\n3) Nada de desmontar microondas ni fuentes de alta tensión.\nCon decenas de vatios la RF sí quema: ahí, distancia a la antena.', q: mcq('Se acerca una tormenta y tu antena exterior está conectada al receptor. ¿Qué haces?', ['Desconectarla y unirla a la toma de tierra exterior', 'Subir el volumen', 'Nada: el receptor no tiene pilas', 'Tocar la antena para descargarla'], 'Una descarga cercana induce tensiones enormes.') }
    ] },
    rf_inprot: { name: 'Proteger entradas y salidas de RF', alts: [
      { title: 'Cada puerto aguanta lo suyo', text: 'La entrada de un SDR o de un NanoVNA está hecha para señales diminutas: unos pocos mW directos pueden romperla. Para ver un emisor, recíbelo por el aire a distancia o por cable con un <b>atenuador</b>. Y el amplificador de un emisor necesita su antena o una carga de 50 Ω: sin ella, toda la potencia rebota y puede dañarlo.', q: mcq('Quieres ver la salida de tu emisor de 100 mW en el SDR por cable. ¿Qué pones en medio?', ['Un atenuador adecuado (40 dB o más)', 'Nada, el cable basta', 'Un amplificador', 'Un filtro de audio'], 'La entrada del SDR no aguanta milivatios.') },
      { title: 'Mira qué hay al otro lado', text: 'Antes de conectar un coaxial, pregúntate: ¿hay un emisor transmitiendo? → atenuador o por el aire. ¿Hay una salida de RF sin antena? → no transmitas. ¿Hay <b>bias-tee</b> (tensión continua en el coaxial)? → solo si lo de enfrente lo admite: una antena que es un cortocircuito en continua (dipolo plegado, bucle) lo pone en corto.', q: mcq('Un módulo LoRa va a transmitir y la antena está desconectada. ¿Qué haces?', ['Conectar la antena (o una carga de 50 Ω) antes de alimentarlo', 'Transmitir igual', 'Subir la potencia', 'Bajar el SF'], 'Sin carga, la potencia reflejada puede dañar el amplificador.') }
    ] },

    /* --- Decibelios y balance --- */
    rf_db: { name: 'dBm ↔ mW', alts: [
      { title: 'Reglas de bolsillo', text: 'En potencia: <b>+3 dB ≈ ×2</b>, <b>+10 dB = ×10</b>, −3 dB ≈ la mitad, −10 dB = una décima.\n<b>0 dBm = 1 mW</b>. Así, 10 dBm = 10 mW, 20 dBm = 100 mW, 30 dBm = 1 W, y hacia abajo −10 dBm = 0,1 mW y −30 dBm = 1 µW.', q: mcq('¿Cuántos mW son 20 dBm?', ['100 mW', '20 mW', '2 mW', '1 W'], '+10 dB es ×10: 0 → 1 mW, 10 → 10 mW, 20 → 100 mW.') },
      { title: 'La fórmula', text: '<b>dBm = 10 · log₁₀(P / 1 mW)</b> y, al revés, <b>P = 1 mW × 10^(dBm / 10)</b>. Para <b>dBW</b> la referencia es 1 W: dBW = dBm − 30. Ejemplo: −120 dBm = 10⁻¹² mW = 10⁻¹⁵ W (−150 dBW).', q: mcq('¿Cuántos dBm son 1 W?', ['30 dBm', '0 dBm', '60 dBm', '3 dBm'], '1 W = 1000 mW → 10 · log(1000) = 30.') },
      { title: 'La regla deslizante', text: 'Mueve la potencia: cada 10 dB la potencia se multiplica por 10 y cada 3 dB se duplica. 0 dBm es 1 mW, los valores negativos son fracciones de mW y 14 dBm son unos 25 mW.', tune: { viz: 'rf_dbm', params: { P: { label: 'Potencia', val: 14, min: -140, max: 80, step: 1, unit: 'dBm', dec: 0 } } }, q: mcq('¿Cuánto son −30 dBm?', ['1 µW', '1 mW', '−30 mW', '0,03 mW'], '−30 dB es ÷1000: 1 mW / 1000 = 1 µW.') }
    ] },
    rf_dbratio: { name: 'Relaciones en dB (×2 = 3 dB)', alts: [
      { title: 'Factores de bolsillo', text: 'Un cambio en dB es una <b>relación</b> de potencias: ×2 = +3 dB, ×4 = +6 dB, ×10 = +10 dB, ×100 = +20 dB; la mitad = −3 dB y una décima = −10 dB. Dos emisores iguales juntos son el doble de potencia: +3 dB, no el doble de dBm.', q: mcq('Juntas dos señales independientes de 0 dBm. ¿Total?', ['Unos 3 dBm', '0 dBm', '6 dBm', '−3 dBm'], '1 mW + 1 mW = 2 mW ≈ 3 dBm.') },
      { title: 'De dB a fracción', text: 'Para pasar una pérdida a fracción: <b>10^(−dB / 10)</b>. 3 dB → 0,5 (la mitad); 4 dB → 0,4; 10 dB → 0,1; 20 dB → 0,01. Y al revés, dB = 10·log₁₀(relación). Error típico: usar 20·log, que es para tensiones; en potencia, siempre 10·log.', q: mcq('Un cable pierde 6 dB. ¿Qué fracción de la potencia llega?', ['Una cuarta parte', 'La mitad', 'Un 6 %', 'Un 94 %'], '10^(−0,6) ≈ 0,25.') }
    ] },
    rf_chain: { name: 'Sumar ganancias y pérdidas en dB', alts: [
      { title: 'Sumar en vez de multiplicar', text: 'En dB, las ganancias se <b>suman</b> y las pérdidas se <b>restan</b>. Un nivel absoluto (dBm) más una ganancia (dB) da otro nivel en dBm. Los cables se dan en dB por metro: multiplica por la longitud. Lo que no tiene sentido es sumar dos dBm entre sí.', q: mcq('Un emisor de 10 dBm, 3 dB de pérdida en el cable y una antena de 5 dBi. ¿PIRE?', ['12 dBm', '18 dBm', '2 dBm', '150 dBm'], '10 − 3 + 5 = 12 dBm.') },
      { title: 'Paso a paso', text: 'Recorre la cadena desde el emisor: empiezas en dBm y cada bloque suma su ganancia o resta su pérdida. Ejemplo: 20 dBm − 4 dB de cable (8 m × 0,5 dB/m) − 0,4 dB de conectores + 5 dBi = 20,6 dBm de PIRE.', q: mcq('17 dBm, 1,5 dB de cable y una antena de 3 dBi. ¿PIRE?', ['18,5 dBm', '21,5 dBm', '15,5 dBm', '76,5 dBm'], '17 − 1,5 + 3 = 18,5 dBm.') }
    ] },
    rf_pathlaw: { name: 'Pérdidas y distancia', alts: [
      { title: 'La esfera que crece', text: 'La potencia emitida se reparte sobre una esfera cada vez mayor: al <b>doblar la distancia</b>, la superficie se multiplica por 4 y llegan <b>6 dB menos</b>; ×10 en distancia son 20 dB. Al revés, 6 dB de pérdidas extra (cables, por ejemplo) cuestan la mitad del alcance. Un satélite bajo en el horizonte está unas 2,4 veces más lejos que en lo alto: casi 8 dB menos.', q: mcq('Duplicas la distancia de un enlace en espacio libre. ¿Cuánto pierdes?', ['6 dB', '3 dB', '12 dB', 'El doble de dB'], 'Inversa del cuadrado: ×¼ en potencia = −6 dB.') },
      { title: 'De dB a distancia y vuelta', text: 'Modelo log-distancia: <b>pérdida extra = 10·n·log₁₀(d₂ / d₁)</b>, con n = 2 en espacio libre (en ciudad o interiores, 3 o más). Al revés, <b>d = 10^(ΔdB / (10·n))</b>: con n = 2, 20 dB son ×10 de distancia y ±6 dB son ×2 o ÷2. Por eso estimar distancias por RSSI es tan impreciso.', q: mcq('Con n = 2, una señal llega 20 dB más débil que a 1 m. ¿A qué distancia está?', ['10 m', '20 m', '100 m', '2 m'], '10^(20 / 20) = 10.') }
    ] },
    rf_fspl: { name: 'Pérdidas en espacio libre (FSPL)', alts: [
      { title: 'La fórmula práctica', text: '<b>FSPL (dB) = 20·log₁₀(d en km) + 20·log₁₀(f en MHz) + 32,44</b>. Ejemplo: 1 km a 868 MHz → 0 + 58,8 + 32,44 ≈ 91,2 dB. Cada ×10 en distancia o en frecuencia suma 20 dB.', q: mcq('¿FSPL a 10 km y 100 MHz?', ['Unos 92,4 dB', 'Unos 72,4 dB', 'Unos 52,4 dB', 'Unos 132,4 dB'], '20 + 40 + 32,44 = 92,44 dB.') },
      { title: '¿Por qué depende de la frecuencia?', text: 'El aire no “frena” más las frecuencias altas. Lo que pasa es que una antena receptora de la misma ganancia (un dipolo, por ejemplo) es más pequeña a más frecuencia y <b>recoge menos</b>: su área efectiva va con λ². Por eso FSPL lleva el término 20·log(f). Si mantienes el tamaño físico de las antenas, ganan directividad y lo compensan.', q: mcq('Dos enlaces iguales con dipolos, a 433 y a 868 MHz. ¿Cuál pierde más en espacio libre?', ['El de 868 MHz, unos 6 dB más', 'El de 433 MHz', 'Pierden lo mismo', 'El de 868 MHz, el doble de dB'], 'Doble de frecuencia: +20·log(2) ≈ 6 dB.') }
    ] },
    rf_noise: { name: 'Ruido térmico y figura de ruido', alts: [
      { title: 'El murmullo de fondo', text: 'Cualquier resistencia a temperatura ambiente genera ruido: <b>−174 dBm por cada hercio</b> de ancho de banda. Un receptor que escucha 125 kHz recoge 10·log(125 000) ≈ 51 dB más: unos −123 dBm. Encima, el receptor suma su <b>figura de ruido (NF)</b>, que fija sobre todo el primer amplificador de la cadena.', q: mcq('Pasas de 125 kHz a 500 kHz de ancho de banda. El ruido que entra…', ['Sube unos 6 dB', 'Baja 6 dB', 'No cambia', 'Se multiplica por 375'], '×4 en ancho de banda = +6 dB de ruido.') },
      { title: 'Suelo de ruido paso a paso', text: '<b>Suelo de ruido = −174 + 10·log₁₀(BW en Hz) + NF</b>. 1 MHz → +60 dB → −114 dBm sin receptor; con NF = 6 dB, −108 dBm. La NF de una cadena la decide el primer bloque: por eso el LNA va junto a la antena, antes de las pérdidas del cable.', q: mcq('BW = 125 kHz y NF = 6 dB. ¿Suelo de ruido?', ['Unos −117 dBm', 'Unos −168 dBm', 'Unos −123 dBm', 'Unos −63 dBm'], '−174 + 51 + 6 ≈ −117 dBm.') },
      { title: 'El primero manda', text: 'En una cadena, el ruido del <b>primer</b> bloque pesa más que el de los demás, porque todo lo que viene después se compara con su señal ya amplificada. Un cable antes del LNA suma sus dB de pérdida directamente a la NF. Por eso el <b>LNA</b> va pegado a la antena. El punto de partida sigue siendo −174 dBm/Hz + 10·log(BW).', q: mcq('Tienes 15 m de cable con 5 dB de pérdida hasta el receptor. ¿Dónde pones el LNA?', ['Junto a la antena, antes del cable', 'Junto al receptor', 'En medio', 'Da igual'], 'Si lo pones después, el cable ya ha empeorado 5 dB la figura de ruido.') }
    ] },
    rf_sens: { name: 'Sensibilidad: ancho de banda y SNR', alts: [
      { title: 'La fórmula de la sensibilidad', text: '<b>Sensibilidad = −174 + 10·log(BW) + NF + SNR mínima</b>.\nPara oír señales más débiles: menos ancho de banda (transmitir más lento), menos ruido propio o una modulación que necesite menos SNR (LoRa demodula incluso con SNR negativa).', q: mcq('BW = 1 MHz, NF = 6 dB, SNR mínima 10 dB. ¿Sensibilidad?', ['−98 dBm', '−174 dBm', '−108 dBm', '−158 dBm'], '−174 + 60 + 6 + 10 = −98 dBm.') },
      { title: 'Velocidad contra alcance', text: 'Transmitir más lento permite un filtro más estrecho: entra menos ruido y el receptor oye señales más débiles. Cada ÷10 en ancho de banda son 10 dB más de sensibilidad. Por eso el nRF24 oye unos 9 dB mejor a 250 kbps que a 1 Mbps, y la PHY codificada de BLE (redundancia: necesita menos SNR) llega más lejos sin subir la potencia.', q: mcq('Pasas un enlace de 10 kbps a 1 kbps con la misma modulación. ¿Qué ganas aproximadamente?', ['Unos 10 dB de sensibilidad', 'Nada', '1 dB', 'Más potencia emitida'], 'Ancho de banda ÷10 → ruido −10 dB.') }
    ] },
    rf_lorasnr: { name: 'SNR de LoRa y elección del SF', alts: [
      { title: 'Por debajo del ruido', text: 'LoRa demodula con <b>SNR negativa</b>: hasta unos −7,5 dB con SF7 y −20 dB con SF12. Una SNR de −8 dB significa que la señal llega 8 dB por debajo del ruido y aun así se recibe. Cerca del mínimo de su SF, estás al borde; muy por encima, te sobra margen.', q: mcq('Con SF7 (mínimo ≈ −7,5 dB) recibes paquetes con SNR de −7 dB. ¿Cómo vas?', ['Al borde: casi sin margen', 'Sobrado: puedes bajar el SF', 'Mal: una SNR negativa es imposible', 'Perfecto: cuanto más negativa, mejor'], 'Solo 0,5 dB por encima del mínimo de SF7.') },
      { title: 'Elegir el SF con la SNR', text: 'Compara la SNR de los paquetes con el mínimo de su SF. Si te sobran muchos dB (por ejemplo, SNR positiva con SF12), <b>baja el SF</b>: el paquete dura menos, gastas menos batería y ocupas menos el canal. Si estás al límite, sube el SF o mejora la antena.', q: mcq('Un nodo con SF10 (mínimo ≈ −15 dB) recibe con SNR de +5 dB. ¿Qué harías?', ['Bajar el SF', 'Subir a SF12', 'Subir la potencia', 'Cambiar de banda'], 'Le sobran unos 20 dB.') }
    ] },
    rf_budget: { name: 'Balance de enlace y margen', alts: [
      { title: 'La cuenta de la compra', text: 'Empiezas con la potencia del emisor y vas sumando y restando:\n<b>Pr = Pt − cables + Gt − pérdidas del camino + Gr − cables</b>.\nEl <b>margen</b> es Pr menos la sensibilidad del receptor. Con menos de 10 dB de margen, el enlace irá “a ratos”.', q: mcq('Recibes −112 dBm y la sensibilidad es −120 dBm. ¿Margen?', ['8 dB', '−8 dB', '232 dB', '120 dB'], '−112 − (−120) = 8 dB: justo.') },
      { title: 'La escalera', text: 'Dibuja el nivel de la señal a lo largo del enlace: sube con las antenas y baja con cables y camino. Donde acaba la escalera está Pr; la distancia hasta la línea de sensibilidad es el <b>margen</b>. Orientativo: 10 dB para un enlace fijo con visión directa; 20 dB o más con obstáculos o movimiento.', tune: { viz: 'rf_link', params: LINK }, q: mcq('Pr = −118 dBm y la sensibilidad es −123 dBm. ¿Qué esperas?', ['Un enlace que falla a ratos: solo 5 dB de margen', 'Un enlace perfecto', 'Que no llegue nunca', 'Un margen de 241 dB'], 'Cualquier desvanecimiento se come 5 dB.') }
    ] },

    /* --- Circuitos de RF --- */
    rf_resonance: { name: 'Frecuencia de resonancia LC', alts: [
      { title: 'El columpio', text: 'En un circuito LC la energía va y viene entre el campo eléctrico del condensador y el magnético de la bobina, a un ritmo propio: <b>f₀ = 1 / (2π√(LC))</b>. Cuadruplicar L o C reduce f₀ a la mitad; menos L o menos C, más f₀.', q: mcq('Multiplicas C por 4. La frecuencia de resonancia…', ['Se reduce a la mitad', 'Se duplica', 'Se divide entre 4', 'No cambia'], 'f₀ va con 1/√C: √4 = 2.') },
      { title: 'Cálculo con prefijos', text: 'Con L en µH y C en pF hay un atajo: <b>f₀ (MHz) ≈ 159 / √(L·C)</b>. Ejemplo: 100 µH y 220 pF → √22 000 ≈ 148 → 159 / 148 ≈ 1,07 MHz, en la onda media. Si lo haces con la fórmula completa, pasa antes a henrios y faradios.', q: mcq('L = 1 µH y C = 100 pF. ¿f₀?', ['Unos 15,9 MHz', 'Unos 1,59 MHz', 'Unos 159 MHz', 'Unos 0,16 MHz'], '159 / √100 = 15,9 MHz.') }
    ] },
    rf_reactance: { name: 'Reactancia en RF (XL y XC)', alts: [
      { title: 'Las fórmulas con números', text: '<b>XL = 2π·f·L</b> crece con la frecuencia; <b>XC = 1 / (2π·f·C)</b> baja. Un centímetro de hilo tiene unos 10 nH: a 868 MHz son unos 54 Ω y a 2,44 GHz unos 153 Ω, tanto o más que la impedancia del sistema. Por eso una protoboard, con tiras y cables de centímetros, no sirve a GHz, y una bobina de choque (mucha L) frena la RF pero deja pasar la continua.', q: mcq('¿Reactancia de 100 nH a 100 MHz?', ['Unos 63 Ω', 'Unos 6,3 Ω', 'Unos 630 Ω', 'Unos 0,63 Ω'], '2π × 10⁸ × 10⁻⁷ ≈ 62,8 Ω.') },
      { title: 'Grifos que dependen de la frecuencia', text: 'Una bobina es un grifo abierto para la continua y cada vez más cerrado al subir la frecuencia: así una <b>bobina de choque</b> alimenta un amplificador sin dejar escapar la RF. Un condensador, al revés. Pero un condensador real tiene la inductancia de sus terminales: por encima de su autorresonancia se comporta como bobina. Para desacoplar a GHz se añade uno <b>pequeño (pF), SMD y pegado a la pata</b>.', q: mcq('Un 100 nF cerámico desacopla bien a 1 MHz pero no a 2,4 GHz. ¿Por qué?', ['Por encima de su autorresonancia manda su inductancia parásita', 'Porque se descarga', 'Porque es demasiado pequeño', 'Porque la continua no pasa'], 'A GHz domina la inductancia de terminales y encapsulado.') }
    ] },
    rf_skin: { name: 'Efecto pelicular', alts: [
      { title: 'Un tubo hueco', text: 'En continua la corriente usa toda la sección del hilo. A alta frecuencia, los campos de la propia corriente la empujan hacia fuera y solo circula por una <b>capa fina de la superficie</b>. Es como si el hilo fuera un tubo hueco: menos sección útil, más resistencia.', q: mcq('¿Por qué las bobinas de RF de calidad usan hilo plateado o tubo de cobre?', ['La corriente circula solo por la superficie', 'Por estética', 'Para que pesen menos', 'Para aislar mejor'], 'A RF lo que cuenta es la superficie.') },
      { title: 'Los números', text: 'Profundidad pelicular en cobre ≈ <b>66 µm / √(f en MHz)</b>: 66 µm a 1 MHz, 6,6 µm a 100 MHz y unos 2 µm a 1 GHz. Un hilo de 1 mm de diámetro a 100 MHz solo usa un anillo de pocas micras: su resistencia sube muchísimo respecto a la de continua.', q: mcq('¿Profundidad pelicular del cobre a 100 MHz?', ['Unos 6,6 µm', 'Unos 66 µm', 'Unos 0,66 mm', 'Toda la sección'], '66 / √100 = 6,6 µm.') }
    ] },
    rf_pcb: { name: 'Placas de RF: plano de masa', alts: [
      { title: 'La corriente vuelve por debajo', text: 'En RF, la corriente de retorno va justo por debajo de su pista, en el plano de masa. Si cortas el plano bajo una pista de RF, el retorno da un rodeo: la pista deja de ser de 50 Ω y forma un bucle que radia (y capta). Plano continuo, pistas cortas y vías a masa cerca.', q: mcq('Tienes que cruzar una pista de señal bajo la pista de antena de 2,4 GHz. ¿Qué es mejor?', ['Pasarla por otra capa sin cortar el plano bajo la pista de RF', 'Cortar el plano de masa justo debajo', 'Alargar la pista de RF', 'Da igual'], 'El plano bajo la pista de RF debe ser continuo.') },
      { title: 'Bucles pequeños', text: 'Todo bucle por el que circula corriente rápida es una antena: cuanto mayor su área, más radia y más capta. Se reduce con <b>plano de masa</b> continuo, condensadores de desacoplo junto a cada chip y pistas y cables cortos. Sirve para que tu placa no moleste y para que no la molesten.', q: mcq('¿Qué reduce más el ruido que radia tu propio diseño?', ['Plano de masa, desacoplo junto a los chips y bucles pequeños', 'Cables más largos', 'Pintar la placa', 'Subir la frecuencia del reloj'], 'Menos área de bucle, menos antena.') }
    ] },
    rf_coil: { name: 'Bobinas: vueltas e inductancia', alts: [
      { title: 'La fórmula de Wheeler', text: '<b>L (µH) ≈ d²·N² / (45,7·d + 101,6·l)</b>, con diámetro d y longitud l en cm. Ejemplo: d = 3 cm, N = 40, l = 4 cm → 9 × 1600 / (137,1 + 406,4) ≈ 26,5 µH. Fíjate en N²: quitar vueltas baja L muy deprisa.', q: mcq('Una bobina con el doble de vueltas y el mismo tamaño. ¿Inductancia?', ['El cuádruple', 'El doble', 'La mitad', 'La misma'], 'L va con N².') },
      { title: 'Las vueltas mandan', text: 'La inductancia crece con el <b>cuadrado</b> de las vueltas: quitar vueltas baja L y sube la frecuencia de resonancia. Separar las espiras (más longitud) también baja L; un núcleo de ferrita la sube. Así se ajusta una bobina de RF a mano, y para calcularla se usa la fórmula de Wheeler.', q: mcq('Tu tanque resuena un poco bajo. ¿Qué haces con la bobina?', ['Quitar una vuelta o separar las espiras', 'Añadir vueltas', 'Meter un núcleo de ferrita', 'Cambiar el diodo'], 'Menos L → más f₀.') }
    ] },
    rf_tank: { name: 'LC serie y paralelo en resonancia', alts: [
      { title: 'Dos comportamientos opuestos', text: 'En resonancia las reactancias de L y C se anulan. En <b>serie</b>, queda una impedancia <b>mínima</b> (solo las pérdidas): un atajo para esa frecuencia. En <b>paralelo</b> (circuito tanque), la impedancia es <b>máxima</b>: a la entrada de una radio, la frecuencia deseada encuentra alta impedancia y se queda; las demás se van a masa.', q: mcq('Un LC en paralelo, justo en resonancia, presenta…', ['Una impedancia máxima', 'Una impedancia mínima', 'Un cortocircuito', 'Una capacidad pura'], 'En paralelo, en resonancia, impedancia máxima.') },
      { title: 'El atajo y la puerta', text: 'Imagina el LC <b>serie</b> como un atajo que solo existe a f₀: puesto entre señal y masa, se traga esa frecuencia (una trampa). El LC <b>paralelo</b> es una puerta que solo se cierra a f₀: puesto entre antena y masa, deja la emisora sintonizada y manda las demás a masa.', q: mcq('Quieres eliminar una frecuencia molesta desviándola a masa. ¿Qué pones entre la señal y masa?', ['Un LC en serie sintonizado a esa frecuencia', 'Un LC en paralelo sintonizado a esa frecuencia', 'Una resistencia', 'Un diodo'], 'El LC serie es un camino de baja impedancia solo a f₀.') }
    ] },
    rf_q: { name: 'Factor Q y ancho de banda', alts: [
      { title: 'Q es la selectividad', text: 'El <b>factor Q</b> mide lo estrecha que es la resonancia: <b>BW = f₀ / Q</b>. Las pérdidas (resistencia del hilo, núcleo) y todo lo que <b>carga</b> el circuito bajan la Q y ensanchan la curva: un auricular de baja impedancia hundiría la Q de una galena. Una Q alta separa emisoras cercanas; una baja deja pasar muchas a la vez.', q: mcq('Un circuito resuena a 1 MHz con Q = 50. ¿Ancho de banda?', ['20 kHz', '50 kHz', '50 MHz', '2 kHz'], '1 000 000 / 50 = 20 000 Hz.') },
      { title: 'Con la curva delante', text: 'Sube la Q y mira cómo se estrecha la curva: el ancho de banda a −3 dB es f₀ / Q. Para separar emisoras de onda media a 9 kHz cerca de 1 MHz hace falta Q > 110. Cualquier resistencia que cargue el circuito baja la Q y vuelve a ensancharla.', tune: { viz: 'rf_lc', params: { L: LCL(100), C: LCC(220), Q: LCQ(50) } }, q: mcq('Un circuito a 455 kHz con Q = 50. ¿Ancho de banda?', ['9,1 kHz', '22,8 kHz', '0,91 kHz', '91 kHz'], '455 / 50 = 9,1 kHz.') }
    ] },
    rf_harmonics: { name: 'Armónicos', alts: [
      { title: 'Múltiplos enteros', text: 'Un emisor no lineal o una onda cuadrada generan <b>armónicos</b> en 2f, 3f, 4f… El tercero de 433,92 MHz cae en 1301,76 MHz, en bandas de otros servicios. Por eso la salida de un emisor lleva un <b>filtro paso bajo</b>, y nunca se pone antena a un generador de cuadradas como el Si5351 sin filtrar.', q: mcq('¿Dónde cae el segundo armónico de 868 MHz?', ['1736 MHz', '434 MHz', '870 MHz', '2604 MHz'], '2 × 868 MHz.') },
      { title: 'La cuadrada lleva de todo', text: 'Una onda cuadrada es su fundamental más todos sus armónicos impares (3f, 5f, 7f…) con amplitudes 1/3, 1/5, 1/7… Muy lejos de ser “una frecuencia”. Las emisiones fuera de banda tienen límites muy estrictos: filtra con un paso bajo antes de radiar.', q: mcq('Un Si5351 da una cuadrada de 7 MHz. ¿Qué frecuencias contiene sobre todo?', ['7, 21, 35 MHz…', 'Solo 7 MHz', '7, 14, 28 MHz…', '3,5 y 7 MHz'], 'Una cuadrada simétrica: armónicos impares.') }
    ] },
    rf_filters: { name: 'Elegir un filtro de RF', alts: [
      { title: 'Qué quieres que pase', text: '· <b>Paso bajo</b> a la salida de un emisor: quita armónicos.\n· <b>Paso banda</b> delante de un receptor o LNA: solo entra la banda útil (1090 MHz para ADS-B).\n· <b>Rechazo de banda</b>: quita una banda molesta, como la FM delante de un SDR en 137 MHz.\n· <b>Cerámicos y SAW</b>: flancos abruptos, en FI (10,7 MHz, 455 kHz) o para fijar 433,92 MHz.', q: mcq('Tu SDR para 137 MHz se satura con las emisoras de FM. ¿Qué filtro pones?', ['Rechazo de la banda de FM', 'Paso bajo a 50 MHz', 'Ninguno: más ganancia', 'Un filtro de audio'], 'Quita solo lo que molesta.') },
      { title: 'Filtrar antes de amplificar', text: 'Una señal fuerte fuera de tu banda (una antena de telefonía, las emisoras de FM) satura el primer amplificador aunque no la quieras oír. El filtro (paso banda o rechazo de banda) va <b>delante</b> del LNA o del SDR: detrás, el daño ya está hecho. En el emisor es al revés: el paso bajo va a la salida, antes de la antena.', q: mcq('Un receptor ADS-B empeora cerca de una antena de telefonía. ¿Dónde va el filtro de 1090 MHz?', ['Antes del LNA', 'Después del receptor', 'En el audio', 'No hace falta filtro'], 'Que no llegue al amplificador lo que no quieres.') }
    ] },
    rf_osc: { name: 'Osciladores y PLL', alts: [
      { title: 'Un amplificador que se escucha', text: 'Un oscilador es un amplificador cuya salida vuelve a su entrada a través de un filtro: oscila a la frecuencia que fija ese filtro (un LC o, mucho más estable, un cristal). Si un amplificador se realimenta sin querer (mala masa, cables cerca), también oscila: se calienta y emite donde no debe. Un <b>PLL</b> fija un VCO a <b>N · fref</b> del cristal; su imperfección es el <b>ruido de fase</b>.', q: mcq('¿Qué fija la frecuencia de un oscilador Colpitts?', ['Su circuito LC', 'La tensión de alimentación', 'La ganancia del transistor', 'La temperatura'], 'El filtro decide dónde se cumple la condición de oscilación.') },
      { title: 'El PLL multiplica el cristal', text: 'Lazo de un PLL: <b>VCO → divisor ÷N → detector de fase</b> (compara con el cristal) <b>→ filtro de lazo → tensión de control del VCO</b>. Se ajusta hasta que <b>fsal = N · fref</b>: cambiando N se sintoniza con la estabilidad del cristal. Lo que queda de fluctuación de fase ensancha la raya: ruido de fase. Y recuerda: cualquier amplificador con realimentación parásita puede volverse oscilador.', q: mcq('Referencia de 25 MHz y N = 17,36. ¿Frecuencia de salida?', ['434 MHz', '42,36 MHz', '1,44 MHz', '868 MHz'], '25 × 17,36 = 434 MHz.') }
    ] },
    rf_ppm: { name: 'Error de frecuencia en ppm', alts: [
      { title: 'Partes por millón', text: '<b>Error (Hz) = f × ppm / 10⁶</b>. Un cristal de ±20 ppm en 868 MHz: 868·10⁶ × 20·10⁻⁶ ≈ 17,4 kHz. Lo mismo vale para un SDR barato: +30 ppm en 433,92 MHz son unos 13 kHz de desvío.', q: mcq('¿Cuánto se desvía un oscilador de ±10 ppm a 2,4 GHz?', ['24 kHz', '2,4 kHz', '240 kHz', '24 Hz'], '2,4·10⁹ × 10·10⁻⁶ = 24 000 Hz.') },
      { title: 'Error contra ancho de banda', text: 'Lo que importa es el error comparado con el canal. 17 kHz no molestan en un canal de 500 kHz, pero con LoRa de 7,8 kHz el receptor ni siquiera encuentra la señal: por eso esos módulos llevan <b>TCXO</b> (±0,5–2,5 ppm). En un SDR, el error en ppm se corrige calibrando con una señal de frecuencia conocida.', q: mcq('¿Por qué un módulo LoRa de 7,8 kHz de ancho de banda lleva TCXO?', ['Un error de varios kHz se saldría del canal', 'Para transmitir más potencia', 'Para no necesitar antena', 'Para que el SPI vaya más rápido'], 'El error debe ser pequeño frente al ancho de banda.') }
    ] },
    rf_mixer: { name: 'Mezclador y frecuencia intermedia', alts: [
      { title: 'Suma y diferencia', text: 'Un <b>mezclador</b> multiplica dos señales. Por trigonometría, el producto de dos senoides contiene su <b>suma</b> y su <b>diferencia</b>. Un superheterodino se queda con la diferencia: la <b>frecuencia intermedia (FI)</b>, siempre la misma, fácil de filtrar y amplificar.', q: mcq('Mezclas 100 MHz con un oscilador local de 110,7 MHz. ¿Qué sale?', ['10,7 MHz y 210,7 MHz', 'Solo 110,7 MHz', '5,35 MHz', 'Solo 100 MHz'], 'Diferencia y suma.') },
      { title: 'Una frecuencia fija para todo', text: 'El oscilador local se mueve con el dial para que siempre <b>|OL − RF| = FI</b>: con el OL por encima, <b>OL = RF + FI</b> (95 MHz + 10,7 = 105,7 MHz). Así los filtros y amplificadores finos trabajan siempre a la misma FI y se diseñan una sola vez.', q: mcq('Onda media con FI de 455 kHz y OL por encima. Para sintonizar 1000 kHz, ¿dónde va el OL?', ['1455 kHz', '545 kHz', '1000 kHz', '455 kHz'], '1000 + 455.') }
    ] },
    rf_image: { name: 'Frecuencia imagen', alts: [
      { title: 'La otra entrada a la FI', text: 'La diferencia no tiene signo: con el oscilador local por encima, <b>fRF + 2·FI</b> también da la misma FI. Esa es la <b>frecuencia imagen</b>. Hay que filtrarla <b>antes</b> del mezclador, con el filtro de RF; después ya es imposible separarla.', q: mcq('Sintonizas 98 MHz con FI = 10,7 MHz y el oscilador por encima. ¿Imagen?', ['119,4 MHz', '87,3 MHz', '108,7 MHz', '76,6 MHz'], '98 + 2 × 10,7 = 119,4 MHz.') },
      { title: 'Míralo en el dial', text: 'Con el OL por encima, la imagen está otra FI más allá del oscilador: <b>RF + 2·FI</b>. Con FI de 455 kHz, en FM la imagen cae dentro de la banda; con 10,7 MHz se va 21,4 MHz más arriba, fuera de los 20,5 MHz que mide la banda. Prueba a cambiar la FI.', tune: { viz: 'rf_superhet', params: SH(96.3, 0.455, 1) }, q: mcq('FM con FI = 10,7 MHz y OL por encima. Sintonizas 90 MHz. ¿Imagen?', ['111,4 MHz', '100,7 MHz', '68,6 MHz', '79,3 MHz'], '90 + 21,4 = 111,4 MHz.') }
    ] },
    rf_overload: { name: 'Saturación e intermodulación', alts: [
      { title: 'Un techo para cada amplificador', text: 'El <b>P1dB</b> es la potencia a la que la ganancia ya ha caído 1 dB. A la entrada, el techo es el P1dB de salida menos la ganancia (20 dB de ganancia y +10 dBm → unos −10 dBm). Cerca de él, dos señales fuertes f₁ y f₂ generan <b>2f₁ − f₂ y 2f₂ − f₁</b>: fantasmas muy cerca de ellas.', q: mcq('Señales fuertes en 433 y 434 MHz. ¿Dónde caen los productos de intermodulación de tercer orden?', ['432 y 435 MHz', '1 y 867 MHz', '433,5 MHz', '866 y 868 MHz'], '2 × 433 − 434 = 432; 2 × 434 − 433 = 435.') },
      { title: 'Ganancia justa, no máxima', text: 'Demasiada señal también falla: un LNA de 30 dB delante de un RTL-SDR en una ciudad, o dos módulos a 14 dBm separados 20 cm, llevan el receptor por encima de su P1dB. Síntomas: paquetes perdidos, emisoras fantasma (intermodulación), todo peor. Remedio: menos ganancia, un filtro delante o más distancia.', q: mcq('Dos nRF24 a 0 dBm a 10 cm pierden paquetes; a 2 m van bien. ¿Por qué?', ['El receptor se satura con tanta señal', 'Falta potencia', 'Están en canales distintos', 'Por la polarización'], 'Todo receptor tiene un nivel máximo de entrada.') }
    ] },

    /* --- Líneas y antenas --- */
    rf_tline: { name: 'Líneas de transmisión', alts: [
      { title: 'Cuándo un cable es una línea', text: 'Si un cable o pista mide más de unos <b>λ/10</b>, la señal tarda en recorrerlo y viaja como una onda: es una línea de transmisión. Su <b>Z0</b> (50 Ω en radio, 75 Ω en TV) es la relación tensión/corriente de esa onda y la fijan la geometría y el aislante. No es una resistencia: con el multímetro, un coaxial abierto marca circuito abierto.', q: mcq('A 2,4 GHz (λ ≈ 12,5 cm), ¿desde qué longitud tratas una pista como línea?', ['Desde 1,2 cm aproximadamente', 'Desde 12 cm', 'Desde 1,2 m', 'Nunca'], 'λ/10.') },
      { title: 'Más lenta dentro del cable', text: 'Dentro del cable la onda va más despacio: <b>VF = 1/√εr</b> (polietileno macizo 0,66; espumado 0,8–0,85). Una longitud eléctrica se corta físicamente más corta: λ/4 en el aire × VF. A 433,92 MHz: 17,3 cm × 0,66 ≈ 11,4 cm. Z0, en cambio, depende de la geometría y del dieléctrico, no de la longitud.', q: mcq('Un λ/4 a 145 MHz (51,7 cm en el aire) en coaxial con VF = 0,66. ¿Longitud física?', ['Unos 34 cm', 'Unos 78 cm', 'Unos 51,7 cm', 'Unos 13 cm'], '51,7 × 0,66 ≈ 34,1 cm.') }
    ] },
    rf_match: { name: 'Adaptar impedancias', alts: [
      { title: 'Anular y transformar', text: 'Adaptar es que la carga “parezca” 50 Ω puros. Primero se <b>anula la reactancia</b> (una inductiva con un condensador, una capacitiva con una bobina) y luego se <b>transforma la resistencia</b>: con una red en L o con un tramo de λ/4 de <b>Z0 = √(Z₁·Z₂)</b> (200 Ω a 50 Ω → 100 Ω).', q: mcq('¿Qué Z0 necesita un λ/4 para adaptar 12,5 Ω a 50 Ω?', ['25 Ω', '31,25 Ω', '62,5 Ω', '600 Ω'], '√(12,5 × 50) = 25 Ω.') },
      { title: 'El mapa de Smith', text: 'En la carta de Smith el <b>centro</b> es 50 Ω perfecto; la mitad <b>superior</b>, reactancia inductiva (positiva); la <b>inferior</b>, capacitiva. Adaptar es llevar el punto al centro: una bobina o un condensador lo mueven por los círculos y un λ/4 transforma la resistencia.', q: mcq('Tu medida cae en la mitad inferior de la carta de Smith. ¿Qué tiene la antena?', ['Reactancia capacitiva', 'Reactancia inductiva', '50 Ω exactos', 'Un cortocircuito'], 'Abajo, capacitiva.') }
    ] },
    rf_line: { name: 'ROE, Γ y potencia reflejada', alts: [
      { title: 'El eco en el pasillo', text: 'Si la carga no tiene la misma impedancia que la línea (50 Ω), parte de la onda rebota. El <b>coeficiente de reflexión</b> lo mide: <b>Γ = (ZL − Z0) / (ZL + Z0)</b>. Se refleja |Γ|² de la potencia. La <b>ROE</b> resume lo mismo: <b>(1 + |Γ|) / (1 − |Γ|)</b>; y las pérdidas de retorno: <b>RL = −20·log|Γ|</b>.', q: mcq('Una línea de 50 Ω termina en una carga de 50 Ω. ¿ROE?', ['1:1, no hay reflexión', '2:1', 'Infinita', '50:1'], 'Γ = 0 → ROE = 1.') },
      { title: 'Números de bolsillo', text: '· ROE 1,5 → |Γ| = 0,2 → se refleja el 4 %.\n· ROE 2 → |Γ| = 0,33 → el 11 %.\n· ROE 3 → |Γ| = 0,5 → el 25 % (llega el 75 %).\n· RL 20 dB → |Γ| = 0,1 → el 1 %.\nCon cargas resistivas, ROE = mayor / menor (100 Ω en 50 Ω → 2).', q: mcq('Una antena tiene ROE 2:1. ¿Qué parte de la potencia se refleja?', ['Alrededor del 11 %', 'La mitad', 'El 2 %', 'Toda'], '|Γ|² = (1/3)² ≈ 0,11.') },
      { title: 'Mira la onda estacionaria', text: 'Mueve la carga: con 50 Ω puros la tensión es plana a lo largo de la línea (ROE 1); al alejarte aparecen máximos y mínimos y la ROE sube. Mira abajo cuánto se refleja y cuántos dB de pérdidas de retorno hay.', tune: { viz: 'rf_swr', params: { R: { label: 'Resistencia de la carga', val: 150, min: 5, max: 300, step: 1, unit: 'Ω', dec: 0 }, X: { label: 'Reactancia (+ inductiva, − capacitiva)', val: 0, min: -150, max: 150, step: 5, unit: 'Ω', dec: 0 } } }, q: mcq('Una carga resistiva de 150 Ω en una línea de 50 Ω. ¿ROE?', ['3:1', '1,5:1', '2:1', '100:1'], 'Con cargas resistivas, ROE = mayor / menor = 150 / 50.') }
    ] },
    rf_connectors: { name: 'Conectores y cables de RF', alts: [
      { title: 'Cada conector, su sitio', text: '<b>SMA</b>: rosca, módulos y antenas pequeñas. <b>RP-SMA</b>: igual por fuera, con el pin cambiado de lado (si mezclas SMA y RP-SMA puede quedar sin pin central y no hay contacto). <b>u.FL</b>: diminuto, en placa, aguanta solo unas decenas de conexiones. <b>BNC</b>: laboratorio. <b>N</b>: robusto y estanco, para exteriores. <b>F</b>: TV, 75 Ω.', q: mcq('¿Qué conector usarías en una antena exterior expuesta a la lluvia?', ['N, robusto y estanco', 'u.FL', 'RP-SMA de router', 'F de 75 Ω'], 'El N está pensado para exteriores y potencias mayores.') },
      { title: 'Pequeños puntos de fallo', text: 'Aprieta el SMA girando la tuerca, no el cable; no dobles el coaxial en curvas cerradas; sella los conectores exteriores con cinta autovulcanizante (el agua dentro cambia la impedancia y corroe); evita cadenas de adaptadores; no conectes y desconectes un u.FL más que unas decenas de veces. Y comprueba el pin central: SMA y RP-SMA mezclados no hacen contacto.', q: mcq('Una antena exterior va bien en seco y mal tras la lluvia. ¿Qué revisas primero?', ['El sellado del conector y del cable', 'La potencia del módulo', 'El SF', 'La ionosfera'], 'Agua dentro del conector.') }
    ] },
    rf_feed: { name: 'Plano de tierra y balun', alts: [
      { title: 'La corriente tiene que volver', text: 'Un monopolo de λ/4 es medio dipolo: la otra mitad la pone un <b>plano de tierra</b> (chasis, placa o radiales). Sin él, el cable y la placa hacen de “otra mitad” y la antena funciona peor y de forma imprevisible. Un dipolo es simétrico: alimentado con coaxial sin <b>balun</b>, la corriente sube por el exterior de la malla y el cable radia.', q: mcq('¿Qué le falta a un monopolo de 868 MHz soldado solo al conector, sin placa ni radiales?', ['Un plano de tierra', 'Un balun', 'Más potencia', 'Otro conector'], 'El monopolo necesita su “espejo”.') },
      { title: 'El síntoma de la mano', text: 'Si la ROE cambia al tocar o mover el coaxial, por la malla circula corriente de <b>modo común</b>: el cable forma parte de la antena. En un dipolo, se corta con un balun o choque (ferritas o unas vueltas de coaxial) junto a la alimentación; en un monopolo, dándole un plano de tierra o radiales.', q: mcq('La ROE de tu dipolo cambia cuando tocas el cable. ¿Qué añades?', ['Un choque de modo común (balun) junto a la antena', 'Un cable más largo', 'Más potencia', 'Un conector N'], 'Corta la corriente por el exterior de la malla.') }
    ] },
    rf_antenna: { name: 'Ganancia, directividad y diagrama', alts: [
      { title: 'Ganancia no es amplificar', text: 'Una antena no fabrica energía: la <b>concentra</b> en unas direcciones a costa de otras. La ganancia se mide en dBi y vale <b>eficiencia × directividad</b>: con un 50 % de eficiencia, 3 dB menos que la directividad. Un dipolo tiene 2,15 dBi; una Yagi de tres elementos, unos 7 dBi; una vertical de 5/8 λ aplasta su energía hacia el horizonte.', q: mcq('Una Yagi de 10 dBi apuntando al revés. ¿Qué recibes?', ['Mucho menos que con un dipolo', 'Lo mismo: la ganancia es fija', 'El doble', 'Más, por el reflejo'], 'Lo que gana hacia delante lo pierde hacia otras direcciones.') },
      { title: 'Dar forma al haz', text: 'Cada antena reparte la energía a su manera: el dipolo, un donut alrededor de su eje; la vertical de 5/8 λ, un donut aplastado hacia el horizonte; la <b>Yagi</b>, con un reflector algo más largo detrás y directores algo más cortos delante, un haz; el parche, su hemisferio delantero. Concentrar es ganar dB en una dirección, menos las pérdidas de la antena.', q: mcq('En una Yagi, ¿cómo son los directores respecto al elemento activo?', ['Algo más cortos, delante', 'Algo más largos, detrás', 'Iguales', 'Mucho más largos, delante'], 'El reflector es el más largo y va detrás.') }
    ] },
    rf_vna: { name: 'Medir con el NanoVNA', alts: [
      { title: 'Qué mide', text: 'El VNA mide lo que vuelve (<b>S11</b>, reflexión: ROE y carta de Smith) y lo que atraviesa (<b>S21</b>, transmisión: filtros, cables, amplificadores). Antes de medir se calibra con abierto, corto y carga en el plano donde irá la antena; esa calibración solo vale para el rango y los puntos elegidos.', q: mcq('Quieres medir cuánto atenúa un filtro. ¿Qué parámetro miras?', ['S21', 'S11', 'La ROE', 'La carta de Smith'], 'S21 es lo que pasa de un puerto al otro.') },
      { title: 'Un orden que no falla', text: '1) Rango de frecuencias y puntos. 2) Calibración abierto–corto–carga al final del cable. 3) Guardar. 4) Antena en su posición final, lejos de metales. 5) Leer ROE (S11) y Smith. Rango nuevo, calibración nueva. Para filtros o cables, S21 entre los dos puertos.', q: mcq('Has calibrado y luego amplías el rango de barrido. ¿Qué haces?', ['Calibrar otra vez', 'Medir sin más', 'Cambiar de cable', 'Apagar y encender'], 'La corrección se guarda punto a punto.') }
    ] },

    /* --- Modulación y receptores --- */
    rf_am: { name: 'AM: portadora y bandas laterales', alts: [
      { title: 'Una portadora que sube y baja', text: 'En AM la amplitud sigue al audio: la envolvente es una copia del mensaje. Al 100 % de modulación la envolvente toca cero en los valles; más allá se recorta y distorsiona. En el espectro hay una portadora, que no lleva información pero sí la mayor parte de la potencia, y dos bandas laterales en <b>fc ± fm</b>.', tune: { viz: 'rf_mod', params: { type: { val: 1, fixed: true }, m: MODM(0.6) } }, q: mcq('¿Qué ocurre si modulas una AM por encima del 100 %?', ['La envolvente se recorta: distorsión y espectro más ancho', 'Suena más fuerte sin problemas', 'Se convierte en FM', 'Nada'], 'La sobremodulación distorsiona.') },
      { title: 'Cuentas de una emisora', text: 'Una emisora en 1008 kHz con audio de hasta 4,5 kHz ocupa de 1003,5 a 1012,5 kHz: <b>ancho = 2·fm</b>. La portadora, en el centro, no lleva el mensaje y se lleva al menos dos tercios de la potencia; por eso la BLU (banda lateral única) la suprime. Modular más allá del 100 % ensancharía el espectro.', q: mcq('AM en 594 kHz con audio de hasta 4,5 kHz. ¿Qué ocupa?', ['De 589,5 a 598,5 kHz', 'De 594 a 598,5 kHz', 'De 585 a 603 kHz', 'Solo 594 kHz'], 'fc ± fm.') }
    ] },
    rf_fm: { name: 'FM: desviación, Carson y ruido', alts: [
      { title: 'Lo que cambia es la frecuencia', text: 'En FM la amplitud es constante y la frecuencia se desvía <b>Δf</b> al ritmo del audio. Como la información no va en la amplitud, el receptor la recorta (limitador) y con ella casi todo el ruido de chispas y motores. Ancho de banda según Carson: <b>2·(Δf + fm)</b>.', q: mcq('¿Por qué la FM es menos sensible a los chasquidos de un motor que la AM?', ['Ese ruido va sobre todo en la amplitud, y la FM la recorta', 'Porque emite más potencia', 'Porque es digital', 'Porque usa otra antena'], 'La información va en la frecuencia.') },
      { title: 'Números de Carson', text: 'Suma desviación y audio y multiplica por 2. FM comercial: Δf = 75 kHz y audio de 15 kHz → 2 × 90 = 180 kHz (los canales van cada 200 kHz). Walkie estrecho: 2,5 y 3 kHz → 11 kHz, cabe en 12,5 kHz. A cambio de ese ancho, la FM con amplitud constante ignora el ruido de amplitud.', q: mcq('Desviación de 5 kHz y audio de hasta 3 kHz. ¿Ancho según Carson?', ['16 kHz', '8 kHz', '10 kHz', '30 kHz'], '2 × (5 + 3) = 16 kHz.') }
    ] },
    rf_mod: { name: 'Tipos de modulación', alts: [
      { title: 'Subirse a la portadora', text: 'Una portadora pura no lleva información. Para transmitir se cambia una de sus tres propiedades al ritmo del mensaje:\n· <b>Amplitud</b>: AM, ASK, OOK.\n· <b>Frecuencia</b>: FM, FSK, GFSK.\n· <b>Fase</b>: PSK. (QAM cambia amplitud y fase a la vez.)', q: mcq('Un mando de garaje enciende y apaga la portadora para enviar unos y ceros. ¿Qué modulación es?', ['OOK (una ASK todo o nada)', 'FM', 'PSK', 'QAM'], 'On-Off Keying.') },
      { title: 'Ejemplos que ya conoces', text: '· <b>OOK</b>: mandos de 433 MHz (encender y apagar la portadora).\n· <b>GFSK</b>: BLE y nRF24 (dos frecuencias con saltos suavizados).\n· <b>BPSK</b>: señal civil del GPS (la fase salta 180°).\n· <b>QAM</b>: WiFi rápido (amplitud y fase a la vez).\n· <b>Chirp</b>: LoRa.', q: mcq('¿Qué modulación usan el BLE y el nRF24L01+?', ['GFSK', 'OOK', 'QAM', 'AM'], 'FSK con filtro gaussiano.') }
    ] },
    rf_symbols: { name: 'Bits por símbolo', alts: [
      { title: 'log₂ de los estados', text: 'Con M estados distintos, cada símbolo lleva <b>log₂(M)</b> bits: 2 estados → 1 bit; QPSK (4) → 2; 16-QAM → 4; 64-QAM → 6; 256-QAM → 8. Más bits por símbolo dan más velocidad en el mismo ancho de banda, pero los estados quedan más juntos y hace falta más SNR.', q: mcq('¿Cuántos bits lleva cada símbolo en 16-QAM?', ['4', '16', '8', '2'], '2⁴ = 16.') },
      { title: 'Puntos más apretados', text: 'Dibuja los estados como puntos en un plano (constelación); bits por símbolo = log₂(puntos). Con más puntos en el mismo espacio quedan <b>más juntos</b> y el ruido los confunde antes: pasar de QPSK a 256-QAM exige mucha más SNR. Por eso el WiFi baja de modulación cuando te alejas.', q: mcq('Te alejas del router y la señal empeora. ¿Qué hace el WiFi?', ['Pasa a una modulación con menos bits por símbolo', 'Pasa a 256-QAM', 'Sube los bits por símbolo', 'Nada'], 'Menos estados toleran menos SNR.') }
    ] },
    rf_manchester: { name: 'Codificación Manchester', alts: [
      { title: 'Una transición en cada bit', text: 'Cada bit se parte en dos mitades de nivel opuesto: hay una transición en mitad de cada bit, el receptor recupera el reloj y la señal nunca se queda quieta. Con el convenio 1 = alto→bajo y 0 = bajo→alto, “1 0” se envía alto, bajo, bajo, alto. Hay un convenio contrario: emisor y receptor deben usar el mismo.', q: mcq('Con 1 = alto→bajo y 0 = bajo→alto, ¿cómo se envía “0 0”?', ['Bajo, alto, bajo, alto', 'Alto, bajo, alto, bajo', 'Bajo, bajo, alto, alto', 'Alto, alto, bajo, bajo'], 'Cada 0 es una subida en mitad del bit.') },
      { title: 'Duraciones máximas', text: 'Como cada bit son dos medios bits opuestos, un nivel dura <b>medio bit o un bit entero</b>, nunca más: un 0 seguido de un 1 da bajo, alto, alto, bajo. Con medio bit de 500 µs, ningún nivel de datos pasa de 1000 µs, y un sincronismo de 1,5 ms es inconfundible.', q: mcq('Medio bit de 250 µs. ¿Cuánto dura como máximo un nivel dentro de los datos?', ['500 µs', '250 µs', '750 µs', '1 ms'], 'Dos medios bits iguales seguidos, como máximo.') }
    ] },
    rf_lora: { name: 'LoRa: símbolo y tiempo en aire', alts: [
      { title: 'Silbidos que suben', text: 'LoRa envía <b>chirps</b>: barridos que recorren todo el ancho de banda. Cada símbolo transporta SF bits y dura <b>2^SF / BW</b>: subir el SF en 1 duplica la duración del símbolo; duplicar el BW la reduce a la mitad.', q: mcq('Pasas de SF9 a SF10 con el mismo ancho de banda. El símbolo dura…', ['El doble', 'La mitad', 'Lo mismo', '10 veces más'], 'Tsímbolo = 2^SF / BW.') },
      { title: 'Cada SF, el doble de aire', text: 'Como el símbolo dura el doble con cada paso de SF, el paquete entero también: 20 bytes tardan unos 57 ms con SF7 a 125 kHz y más de 1 s con SF12. Subir el BW de 125 a 500 kHz lo acorta cuatro veces. Es el precio de la sensibilidad.', q: mcq('20 bytes tardan unos 57 ms con SF7 a 125 kHz. ¿Aproximadamente cuánto con SF9?', ['Unos 185 ms (algo más de ×3)', 'Unos 57 ms', 'Unos 114 ms', 'Unos 29 ms'], 'Cada paso de SF casi duplica el tiempo en aire.') },
      { title: 'Juega con el reloj', text: 'Mueve SF y BW: el símbolo dura 2^SF / BW (SF7 a 125 kHz: 1,024 ms; SF12: 32,8 ms). Mira cómo el tiempo en aire se dispara al subir el SF y cae al subir el BW.', tune: { viz: 'rf_lora', params: LORA }, q: mcq('SF8 con 250 kHz. ¿Duración de un símbolo?', ['1,024 ms', '2,048 ms', '0,512 ms', '32 ms'], '2⁸ / 250 kHz = 256 / 250 ≈ 1,024 ms.') }
    ] },
    rf_loracfg: { name: 'LoRa: parámetros que deben coincidir', alts: [
      { title: 'Hablar el mismo idioma', text: 'Para que dos nodos LoRa se entiendan deben coincidir <b>frecuencia, SF, ancho de banda, tasa de codificación, palabra de sincronismo</b>, preámbulo y CRC. Con SF o BW distintos, el receptor ni siquiera ve el paquete. Todo eso es la capa física, LoRa; <b>LoRaWAN</b> es un protocolo de red que va encima.', q: mcq('Un nodo usa SF10 y la puerta de enlace escucha solo SF9, con el mismo BW. ¿Qué pasa?', ['No recibe los paquetes', 'Los recibe más despacio', 'Los recibe mejor', 'Se suman'], 'El SF debe coincidir.') },
      { title: 'SF distintos casi no se ven', text: 'Los chirps de SF distintos son casi <b>ortogonales</b>: un receptor de SF7 ve un paquete de SF8 casi como ruido. Tiene dos caras: dos redes con SF distintos comparten canal sin destruirse, pero un nodo mal configurado (otro SF, otro BW) no se comunica con nadie.', q: mcq('Dos nodos transmiten a la vez en el mismo canal, uno con SF7 y otro con SF10. ¿Qué ocurre?', ['Se interfieren poco: SF distintos son casi ortogonales', 'Se destruyen siempre los dos', 'Sus potencias se suman en el receptor', 'Solo llega el de SF10'], 'Cada receptor solo “ve” su SF.') }
    ] },
    rf_rxtypes: { name: 'Tipos de receptor', alts: [
      { title: 'De la galena al superheterodino', text: '<b>Galena</b>: LC, diodo y auricular, sin pilas. <b>Superregenerativo</b>: oscila y se apaga miles de veces por segundo; baratísimo y sensible pero ruidoso y poco selectivo (el XY-MK-5V). <b>Superheterodino</b>: antena → filtro y amplificador de RF → mezclador con OL → filtro y amplificadores de FI → demodulador → audio; selectivo y estable (el RXB6).', q: mcq('¿Qué receptor elegirías para un enlace de 433 MHz fiable en una zona con muchas interferencias?', ['Un superheterodino, como el RXB6', 'Un superregenerativo, como el XY-MK-5V', 'Una galena', 'Cualquiera: son iguales'], 'Más selectivo y estable.') },
      { title: 'Por qué los baratos “oyen ruido”', text: 'Los receptores sencillos de 433 MHz llevan control automático de ganancia: sin señal, suben la ganancia al máximo y por la salida sale ruido aleatorio. Los superregenerativos, además, dejan pasar mucho espectro. Un superheterodino (antena → RF → mezclador con OL → FI → demodulador → audio) filtra en una FI fija y rechaza mejor lo que no es tu emisor; aun así, el decodificador debe ignorar el ruido.', q: mcq('Sin ningún mando cerca, la salida de tu receptor de 433 MHz cambia sin parar. ¿Qué pasa?', ['Es normal: el control de ganancia amplifica el ruido', 'El receptor está roto', 'Alguien transmite siempre', 'Falta una resistencia de pull-up'], 'Por eso las tramas llevan preámbulo y sincronismo.') }
    ] },
    rf_iq: { name: 'I/Q: el signo de la frecuencia', alts: [
      { title: 'I y Q', text: 'Con una sola señal muestreada no sabes si algo está 10 kHz por encima o por debajo de la sintonía: dan la misma salida. Con dos versiones desfasadas 90° (<b>I</b> y <b>Q</b>) sí: el sentido de giro de I + jQ dice si la frecuencia es positiva o negativa. Si I y Q no están perfectamente equilibradas, aparece un reflejo débil en el lado opuesto.', q: mcq('¿Para qué sirven las dos señales I y Q?', ['Para distinguir frecuencias por encima y por debajo de la sintonía', 'Para tener el doble de volumen', 'Para el estéreo', 'Para ahorrar muestras'], 'Una sola señal real confunde +f con −f.') },
      { title: 'Un tiovivo visto de lado', text: 'Si miras un tiovivo solo de lado (I), no sabes si gira a derechas o a izquierdas: +10 kHz y −10 kHz se ven igual. Con una segunda vista desde delante (Q, desfasada 90°) sí lo sabes. Si las dos vistas no están bien equilibradas, aparece una <b>imagen</b> más débil al otro lado de la sintonía.', q: mcq('Ves una señal 50 kHz por encima de la sintonía y una copia más débil 50 kHz por debajo. ¿Qué es la copia?', ['Una imagen por desequilibrio entre I y Q', 'Otra emisora', 'Un armónico', 'Ruido térmico'], 'Un I/Q imperfecto refleja las señales al lado opuesto.') }
    ] },
    rf_sdr: { name: 'Muestreo del SDR: ancho y alias', alts: [
      { title: 'Digitalizar un trozo de espectro', text: 'Un SDR traslada una porción del espectro a frecuencia cero y la muestrea en I/Q. Con muestras complejas, la <b>tasa de muestreo es el ancho que ves</b>: a 2,4 MS/s, unos 2,4 MHz alrededor de la sintonía. Lo que queda fuera debe quitarlo un filtro; si no, se pliega dentro como un <b>alias</b>. Las muestras I/Q distinguen lo que está por encima y por debajo de la sintonía, y el pico fijo del centro es un residuo de continua.', q: mcq('Tu SDR muestrea a 2,4 MS/s en I/Q. ¿Cuánto espectro ves a la vez?', ['Unos 2,4 MHz', '2,4 GHz', '1,2 kHz', '24 MHz'], 'Con I/Q, el ancho visible ≈ la tasa de muestreo.') },
      { title: 'Nyquist y el alias', text: 'Con muestras complejas a Fs ves de −Fs/2 a +Fs/2 alrededor de la sintonía: <b>Fs hercios</b> de espectro (2,048 MS/s → caben unas 10 emisoras de FM de 200 kHz). Una señal de fuera que el filtro antialias no quite se <b>pliega</b> y aparece donde no está.', q: mcq('Un SDR muestrea a 1 MS/s en I/Q. ¿Cuánto espectro ves?', ['Unos 1 MHz', '0,5 MHz', '2 MHz', '1 kHz'], 'Con I/Q, ancho ≈ tasa de muestreo.') }
    ] },
    rf_sdrghost: { name: 'Señales fantasma en el SDR', alts: [
      { title: 'Lista de sospechosos', text: '· <b>Pico central</b>: residuo de continua de la conversión; desplaza un poco la sintonía.\n· <b>Imagen</b> espejo por desequilibrio I/Q.\n· <b>Espurios por saturación</b>: con demasiada ganancia aparecen emisoras donde no las hay (FM en 150 MHz).\n· Ruido del USB y del ordenador.', q: mcq('Un pico fijo aparece siempre en el centro de la pantalla. ¿Qué es?', ['El residuo de continua del SDR', 'Una emisora potente', 'Un satélite', 'Ruido térmico'], 'Está siempre en la frecuencia de sintonía.') },
      { title: 'Dos pruebas rápidas', text: '1) <b>Mueve la sintonía</b>: una señal real se desplaza en pantalla igual que la sintonía; un espurio interno (como el pico central) no se mueve o va al revés.\n2) <b>Baja la ganancia</b>: si una señal desaparece o baja mucho más que el ruido, era un fantasma por saturación.', q: mcq('Bajas 10 dB la ganancia y una “emisora” desaparece mientras el ruido apenas baja. ¿Qué era?', ['Un producto espurio por saturación', 'Una emisora real lejana', 'El residuo de continua', 'Una imagen del GPS'], 'Las señales reales bajan igual que todo lo demás.') }
    ] },

    /* --- Módulos con microcontroladores --- */
    rf_nrf: { name: 'Opciones del nRF24L01+', alts: [
      { title: 'ACK, reintentos y velocidad', text: 'Con Enhanced ShockBurst el receptor contesta solo con un ACK; si no llega, el emisor reintenta. <b>setRetries(d, n)</b> espera (d + 1) × 250 µs entre intentos y hace hasta n (máximo 15). A 250 kbps hay más alcance (unos −94 dBm de sensibilidad); a 2 Mbps, más velocidad y menos alcance. testRPD() solo dice si hay más de unos −64 dBm en el canal. Y el canal c transmite en 2400 + c MHz.', q: mcq('¿Qué espera hay entre reintentos con setRetries(3, 10)?', ['1 ms', '750 µs', '3 ms', '10 ms'], '(3 + 1) × 250 µs = 1000 µs.') },
      { title: 'Lo que mide y lo que no', text: 'El nRF24L01+ no da un RSSI en dBm: <b>testRPD()</b> es un detector de un bit (¿más de unos −64 dBm?). Para estimar el enlace, cuenta ACK perdidos y reintentos (setRetries fija la espera, (d + 1) × 250 µs, y el número). Velocidad y alcance están reñidos: 250 kbps llega más lejos; 2 Mbps ocupa 2 MHz.', q: mcq('Quieres saber si un canal está ocupado por una señal fuerte. ¿Qué usas?', ['testRPD(): indica si se superan unos −64 dBm', 'setRetries()', 'setDataRate()', 'openReadingPipe()'], 'Es un detector de un solo bit.') }
    ] },
    rf_24ghz: { name: 'La banda de 2,4 GHz', alts: [
      { title: 'Un mapa de la banda', text: 'La banda ISM va de <b>2400 a 2483,5 MHz</b>. El WiFi usa canales de 20 MHz centrados en 2412 (1), 2437 (6) y 2462 MHz (11); los anuncios de BLE están en 2402, 2426 y 2480 MHz, justo en los huecos; el nRF24 transmite en <b>2400 + canal</b> MHz (legal hasta el 83); y el microondas radia en torno a 2450 MHz.', q: mcq('Un nRF24 en el canal 100. ¿Puedes transmitir en Europa?', ['No: 2500 MHz está fuera de la banda ISM', 'Sí, cualquier canal vale', 'Sí, a baja potencia', 'Solo de noche'], '2400 + 100 = 2500 MHz > 2483,5 MHz.') },
      { title: 'Cuentas en MHz', text: 'Pásalo todo a MHz y compara: canal 76 del nRF24 → 2476 MHz; canal WiFi 6 → 2437 ± 10 MHz; microondas → unos 2450 MHz, que tapa los canales WiFi centrales mientras funciona. Para esquivar, elige canales lejos del ruido o pasa a 5 GHz. Para transmitir, quédate entre 2400 y 2483,5 MHz.', q: mcq('¿En qué frecuencia transmite un nRF24 en el canal 2?', ['2402 MHz', '2404 MHz', '2412 MHz', '2420 MHz'], '2400 + 2 = 2402 MHz, la misma que el anuncio 37 de BLE.') }
    ] },
    rf_supply: { name: 'Picos de corriente al transmitir', alts: [
      { title: 'El tirón del emisor', text: 'Al transmitir, un módulo de radio pide picos de decenas o cientos de mA durante milisegundos. Un regulador pequeño o una batería baja no los dan: la tensión se hunde y el módulo falla o la placa se reinicia. Remedio: un condensador de 10–100 µF pegado al módulo y una fuente con margen.', q: mcq('Tu nodo LoRa se reinicia siempre justo al transmitir. ¿Primera sospecha?', ['La alimentación se hunde con el pico de corriente', 'El SF', 'La polarización de la antena', 'La palabra de sincronismo'], 'El síntoma coincide con el pico.') },
      { title: 'USB sí, pilas no', text: 'Síntoma clásico: funciona en la mesa con el USB del ordenador y falla con pilas, con la batería baja o justo al transmitir. No es la radio: es la alimentación. Mira con el osciloscopio los pines del módulo mientras transmite; si hay caídas, condensador de 10–100 µF junto al módulo o un regulador mejor.', q: mcq('¿Qué mides para confirmar que el problema es la alimentación?', ['La tensión en los pines del módulo mientras transmite, con osciloscopio', 'La ROE de la antena', 'El RSSI', 'La frecuencia con el SDR'], 'Las caídas duran milisegundos: un multímetro no las ve.') }
    ] },
    rf_debug: { name: 'Método para depurar una radio', alts: [
      { title: 'De abajo arriba', text: 'Orden: <b>alimentación</b> (tensión y picos al transmitir) → <b>comunicación con el chip</b> (leer un registro conocido: RegVersion, en 0x42 del SX1276, devuelve 0x12) → configuración idéntica en los dos extremos → frecuencia real en el SDR → antena y ROE → enlace cerca y luego lejos.', q: mcq('El SX1276 no responde. ¿Qué compruebas antes de tocar el SF?', ['Que lea bien un registro conocido por SPI', 'El diagrama de la antena', 'El horizonte radio', 'La zona de Fresnel'], 'Si el bus no funciona, lo demás no importa.') },
      { title: 'Un cambio cada vez', text: 'Si cambias tres cosas a la vez y mejora, no sabes cuál fue: cambia una, mide y apunta. Empieza por lo básico: alimentación y una prueba de vida del chip (leer un registro de valor conocido, como RegVersion = 0x12 en el SX1276). Y ten módulos de referencia: cambiar una pieza sospechosa por una buena es la prueba más rápida.', q: mcq('Cambias la antena y el enlace mejora 6 dB. ¿Qué haces ahora?', ['Apuntarlo y probar el siguiente cambio por separado', 'Cambiar a la vez el SF y la fuente', 'Deshacerlo', 'Nada más'], 'Un cambio cada vez, y con registro.') }
    ] },
    rf_rfsec: { name: 'Seguridad y privacidad de la radio', alts: [
      { title: 'Lo que se graba se repite', text: 'Un mando de <b>código fijo</b> envía siempre la misma trama: quien la grabe puede repetirla. El <b>UID</b> de una tarjeta lo lee cualquier lector y hay tarjetas con UID reescribible: identifica, pero no prueba nada. La seguridad necesita un secreto que no viaje: códigos variables con contador y clave, o tarjetas con criptografía moderna (AES).', q: mcq('¿Qué protege contra el ataque de repetición en un mando?', ['Un código variable con contador y clave secreta', 'Más potencia', 'Usar 868 MHz en vez de 433', 'Codificar en Manchester'], 'Cada trama solo vale una vez.') },
      { title: 'Lo que se emite en claro', text: 'Todo lo que se emite sin cifrar lo puede recibir cualquiera. Por eso un número fijo no debe abrir una puerta (se copia o se repite) ni delatar a una persona: los móviles cambian su dirección BLE cada pocos minutos para que no se les pueda seguir.', q: mcq('¿Por qué un control de acceso no debe abrir solo comprobando el UID?', ['El UID se lee y se puede clonar', 'El UID cambia cada día', 'El UID está cifrado', 'Porque el lector es lento'], 'Identifica, pero no autentica.') }
    ] },
    rf_nfc: { name: 'Acoplamiento inductivo (RFID y NFC)', alts: [
      { title: 'Un transformador con aire en medio', text: 'Lector y tarjeta son dos bobinas acopladas, como el primario y el secundario de un transformador. El campo alterno del lector <b>alimenta</b> la tarjeta, y esta contesta cambiando la carga de su bobina. Es <b>campo cercano</b>, que cae muchísimo con la distancia: solo funciona a pocos centímetros. Un metal cerca lo estropea.', q: mcq('¿De dónde saca la energía una tarjeta RFID pasiva?', ['Del campo magnético del lector', 'De una pila interna', 'De la luz ambiente', 'Del calor de la mano'], 'No lleva batería: se alimenta del campo.') },
      { title: 'Todo es sintonía', text: 'La bobina de la etiqueta y un condensador interno resuenan a la frecuencia del lector (13,56 MHz en NFC, donde λ = 22 m: a pocos cm estás en pleno campo cercano). Un metal cerca cambia la inductancia, desintoniza la etiqueta y absorbe el campo con corrientes parásitas; las etiquetas para metal llevan una lámina de ferrita.', q: mcq('Una pegatina NFC sobre una lata de refresco no se lee. ¿Solución?', ['Una etiqueta con lámina de ferrita para superficies metálicas', 'Acercar un imán', 'Subir el volumen del móvil', 'Ponerla al sol'], 'La ferrita aparta el campo del metal.') }
    ] },
    rf_gnss: { name: 'Cómo calcula la posición el GNSS', alts: [
      { title: 'Medir tiempos', text: 'Cada satélite dice qué hora es y dónde está. El receptor mide cuánto tarda cada señal y calcula distancias. Su reloj es malo, así que el error de reloj es una incógnita más: <b>4 satélites</b> para x, y, z y tiempo. Necesita además las órbitas de cada satélite, que descarga de ellos: en un arranque en frío eso lleva medio minuto o más.', q: mcq('¿Por qué hacen falta 4 satélites para una posición 3D?', ['Hay 4 incógnitas: tres coordenadas y el error del reloj del receptor', 'Uno por cada punto cardinal', 'Por pura redundancia', 'Con 3 basta siempre'], 'El reloj del receptor no es atómico.') },
      { title: 'Geometría y arranque', text: 'La precisión depende de cómo estén repartidos los satélites: agrupados en una zona del cielo, las distancias se cruzan en ángulos malos y la <b>HDOP</b> sube. Hacen falta al menos 4 y, mejor, bien repartidos. En un <b>arranque en frío</b> el receptor no sabe qué satélites hay ni sus órbitas: tiene que buscarlos y descargar sus datos.', q: mcq('Entre rascacielos solo ves satélites en una franja estrecha del cielo. ¿Qué pasa con la HDOP?', ['Sube: peor precisión', 'Baja: mejor precisión', 'No cambia', 'Se hace cero'], 'Mala geometría, más error.') }
    ] },
    rf_nmea: { name: 'Leer tramas NMEA', alts: [
      { title: 'Campos separados por comas', text: 'Una trama NMEA empieza por $, lleva emisor y tipo (GPGGA, GNRMC…) y campos separados por comas. En <b>GGA</b>: hora, latitud, N/S, longitud, E/W, calidad, <b>número de satélites</b>, HDOP, altitud… Cuenta las comas con calma. La latitud viene como ggmm.mmmm (grados y minutos).', q: mcq('En “$GPGGA,120000.00,4123.4567,N,00210.1234,E,1,11,0.8,…”, ¿cuántos satélites se usan?', ['11', '1', '0,8', '12'], 'Tras la calidad (1) va el número de satélites.') },
      { title: 'Grados y minutos', text: 'La latitud llega como <b>ggmm.mmmm</b> y la longitud como gggmm.mmmm: grados enteros y minutos con decimales. Para grados decimales: <b>grados + minutos / 60</b>. “4123.4567,N” = 41 + 23,4567 / 60 = 41,3909°. S y W se escriben en negativo. Y cada campo tiene su sitio: cuenta las comas.', q: mcq('“00342.1820,W” en grados decimales es…', ['−3,7030°', '3,421820°', '−34,2182°', '3,7030°'], '3 + 42,182 / 60 = 3,7030; W es negativo.') }
    ] },

    /* --- Escuchar y depurar --- */
    rf_listen: { name: 'Qué escuchar y con qué', alts: [
      { title: 'Por frecuencia', text: '· 87,5–108 MHz: radio FM (en el audio demodulado, piloto estéreo de 19 kHz y RDS en 57 kHz).\n· 137 MHz: satélites meteorológicos (los NOAA de APT ya se han retirado).\n· 144,800 MHz: APRS. · 433,92 MHz: sensores y mandos.\n· 1090 MHz: ADS-B de aviones.\nComprueba siempre que un servicio sigue activo antes de planificar.', q: mcq('¿Qué se oye en 1090 MHz?', ['ADS-B de aviones', 'Radio FM', 'APRS', 'Satélites meteorológicos'], 'Los aviones emiten ahí su posición.') },
      { title: 'Por programa', text: '<b>SDR++, SDR# o GQRX</b>: explorar el espectro y escuchar FM o aficionados. <b>rtl_433</b>: sensores de 433 y 868 MHz. <b>dump1090</b>: aviones en 1090 MHz. <b>SatDump</b>: satélites meteorológicos en 137 MHz. Antes de seguir un tutorial antiguo, comprueba que el satélite o servicio sigue emitiendo.', q: mcq('¿Qué programa decodifica una estación meteorológica de 433,92 MHz?', ['rtl_433', 'dump1090', 'SatDump', 'GQRX'], 'rtl_433 conoce cientos de sensores.') }
    ] },
    rf_doppler: { name: 'Desplazamiento Doppler', alts: [
      { title: 'La fórmula', text: '<b>Δf = f · v / c</b>, con v la velocidad a lo largo de la línea de visión. Un satélite a 7 km/s en 137 MHz: 137·10⁶ × 7000 / 3·10⁸ ≈ 3,2 kHz. Al acercarse la frecuencia sube; al alejarse, baja.', q: mcq('Un satélite se acerca a 7 km/s y emite en 435 MHz. ¿Desplazamiento?', ['Unos 10 kHz', 'Unos 1 kHz', 'Unos 100 kHz', 'Unos 3,2 kHz'], '435·10⁶ × 7000 / 3·10⁸ ≈ 10,2 kHz.') },
      { title: 'La sirena de la ambulancia', text: 'Como la sirena que suena más aguda al acercarse, la frecuencia de un satélite sube mientras viene y baja al irse. El desplazamiento es proporcional a la frecuencia y a la velocidad (Δf = f · v / c): el doble de frecuencia, el doble de Doppler. Por eso los programas de seguimiento corrigen la sintonía durante el pase.', q: mcq('Durante un pase, ¿cómo cambia la frecuencia recibida?', ['Empieza alta, pasa por la nominal y acaba baja', 'Empieza baja y acaba alta', 'No cambia', 'Sube todo el rato'], 'Se acerca y luego se aleja.') }
    ] },
    rf_rfi: { name: 'Interferencias domésticas', alts: [
      { title: 'Fuentes y caminos', text: 'Fuentes conmutadas baratas, bombillas LED, adaptadores PLC, inversores y motores conmutan con flancos bruscos y generan ruido de banda ancha, sobre todo en onda media y HF. Sale por los cables (<b>conducido</b>) y los cables lo radian. Casi siempre va en <b>modo común</b>: una ferrita alrededor del cable entero lo frena sin tocar la corriente útil.', q: mcq('¿Dónde pones una ferrita de clip para frenar el ruido de un cargador?', ['Alrededor del cable entero, cerca del cargador', 'Solo en uno de los hilos', 'En la antena de la radio', 'Dentro del enchufe'], 'El modo común va igual por todos los hilos.') },
      { title: 'Caza con método', text: 'Mide primero el suelo de ruido de referencia; recorre la casa con una radio de onda media de pilas entre emisoras (el ruido sube mucho cerca de la fuente conmutada culpable); desenchufa los sospechosos de uno en uno; aplica remedios (ferritas en modo común, sustituir el aparato); y vuelve a medir con la misma ganancia.', q: mcq('¿Por qué conviene medir el suelo de ruido antes de tocar nada?', ['Sin referencia no sabrás si has mejorado', 'Porque la radio se calienta', 'Para cumplir la ley', 'No hace falta'], 'Medir antes y después.') }
    ] }
  });

  /* ===================== GENERADORES ===================== */
  {
    const { pick, ri, fmt, MC, N } = Gen.helpers;
    const L10 = Math.log10;
    const fP = mw => fW(mw / 1000);
    const C = 299.792458; // m·MHz

    Gen.add('rf_lambda', () => {
      const f = pick([7, 14, 27, 50, 88, 100, 137, 145, 433.92, 868, 1090, 1575.42, 2440]);
      const lam = C / f;
      if (lam >= 1) return N(`¿Qué longitud de onda tiene una señal de ${fmt(f)} MHz? (en metros)`, lam, 'm', `λ = c / f ≈ 300 / ${fmt(f)} = ${fmt(lam, 2)} m.`, Math.max(0.02, lam * 0.02));
      return N(`¿Qué longitud de onda tiene una señal de ${fmt(f)} MHz? (en centímetros)`, lam * 100, 'cm', `λ = 300 / ${fmt(f)} = ${fmt(lam, 4)} m = ${fmt(lam * 100, 1)} cm.`, Math.max(0.3, lam * 100 * 0.02));
    }, 'rf_wave');

    Gen.add('rf_antLen', () => {
      const f = pick([137, 145, 433.92, 868, 1090, 2440]);
      const lam = C / f * 100, dip = pick([true, false]);
      const cm = x => fmt(x, 1) + ' cm';
      if (dip) return MC(`Cortas un dipolo de media onda para ${fmt(f)} MHz con un factor de acortamiento de 0,95. ¿Longitud total aproximada?`, cm(lam / 2 * 0.95), [cm(lam / 4 * 0.95), cm(lam * 0.95), cm(lam / 2 / 0.95 * 2), cm(lam / 20 * 0.95)], `λ = ${cm(lam)}; λ/2 = ${cm(lam / 2)}; × 0,95 = ${cm(lam / 2 * 0.95)}. Córtalo algo más largo y ajústalo midiendo.`);
      return MC(`¿Cuánto mide, en teoría, un monopolo de cuarto de onda para ${fmt(f)} MHz?`, cm(lam / 4), [cm(lam / 2), cm(lam), cm(lam / 40), cm(lam / 8)], `λ = 300 / ${fmt(f)} = ${cm(lam)}; λ/4 = ${cm(lam / 4)}. En la práctica, un 3–5 % más corto.`);
    }, 'rf_antsize');

    Gen.add('rf_dbm2mw', () => {
      const d = pick([-30, -20, -13, -10, -3, 0, 3, 6, 10, 13, 14, 17, 20, 23, 27, 30, 33, 40]);
      const mw = Math.pow(10, d / 10);
      return MC(`¿Qué potencia son ${String(d).replace('-', '−')} dBm?`, fP(mw), [fP(mw * 10), fP(mw / 10), fP(Math.pow(10, d / 20)), fP(mw * 2), fP(mw / 2)], `P = 1 mW × 10^(${String(d).replace('-', '−')}/10) = ${fP(mw)}. Recuerda: +10 dB es ×10 y +3 dB es ×2.`);
    }, 'rf_db');

    Gen.add('rf_mw2dbm', () => {
      const mw = pick([0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10, 25, 50, 100, 200, 500, 1000, 2000]);
      const d = 10 * L10(mw);
      return N(`Convierte ${fP(mw)} a dBm.`, d, 'dBm', `dBm = 10 · log₁₀(${fmt(mw, 3)} mW / 1 mW) = ${fmt(d, 1)} dBm.`, 0.3);
    }, 'rf_db');

    Gen.add('rf_dbratio', () => {
      const r = pick([2, 4, 8, 10, 20, 100, 1000, 0.5, 0.25, 0.1, 0.01]);
      const d = 10 * L10(r);
      const s = x => (x > 0 ? '+' : '') + fmt(x, 0).replace('-', '−') + ' dB';
      return MC(`Una potencia se multiplica por ${fmt(r)}. ¿Cuántos dB son?`, s(d), [s(20 * L10(r)), s(d / 2), s(d + 3), s(-d)], `10 · log₁₀(${fmt(r)}) ≈ ${s(d)}. En potencia se usa 10·log; 20·log es para tensiones.`);
    }, 'rf_dbratio');

    Gen.add('rf_chain', () => {
      const pt = pick([0, 10, 13, 14, 17, 20]), lc = pick([0.5, 1, 1.5, 2, 3]), con = pick([0.2, 0.4]), g = pick([0, 2.15, 3, 5, 7]);
      const e = pt - lc - con + g;
      return N(`Un emisor de ${pt} dBm, ${fmt(lc)} dB de pérdida en el cable, ${fmt(con)} dB en conectores y una antena de ${fmt(g)} dBi. ¿PIRE (EIRP) en dBm?`, e, 'dBm', `${pt} − ${fmt(lc)} − ${fmt(con)} + ${fmt(g)} = ${fmt(e, 2)} dBm. En dB todo se suma o se resta.`, 0.1);
    }, 'rf_chain');

    Gen.add('rf_erp', () => {
      const [mw, sub] = pick([[10, '433,05–434,79 MHz'], [25, '868,0–868,6 MHz'], [500, '869,4–869,65 MHz'], [25, '868,7–869,2 MHz']]);
      const erp = 10 * L10(mw), eirp = erp + 2.15;
      return N(`La sub-banda ${sub} permite ${mw} mW PRA (ERP, referida a un dipolo). ¿Cuánto es en dBm PIRE (EIRP, referida a la isotrópica)?`, eirp, 'dBm', `${mw} mW = ${fmt(erp, 1)} dBm ERP; EIRP = ERP + 2,15 dB = ${fmt(eirp, 2)} dBm.`, 0.15);
    }, 'rf_eirp');

    Gen.add('rf_fspl', () => {
      const d = pick([0.1, 0.5, 1, 2, 5, 10, 20, 50]), f = pick([433.92, 868, 2440]);
      const L = 20 * L10(d) + 20 * L10(f) + 32.44;
      return N(`Pérdidas en espacio libre a ${fmt(d)} km y ${fmt(f)} MHz (en dB).`, L, 'dB', `FSPL = 20·log(${fmt(d)}) + 20·log(${fmt(f)}) + 32,44 = ${fmt(L, 1)} dB.`, 1);
    }, 'rf_fspl');

    Gen.add('rf_distx', () => {
      const k = pick([2, 4, 10, 0.5]);
      const d = 20 * L10(k);
      const s = x => fmt(Math.abs(x), 0) + ' dB';
      return MC(k > 1 ? `En espacio libre multiplicas la distancia por ${k}. ¿Cuánto aumentan las pérdidas?` : 'En espacio libre reduces la distancia a la mitad. ¿Cuánto disminuyen las pérdidas?', s(d), [s(d / 2), s(d * 2), s(k * 3)], 'Las pérdidas crecen con 20·log(d): ×2 en distancia = 6 dB; ×10 = 20 dB.');
    }, 'rf_pathlaw');

    Gen.add('rf_margin', () => {
      const pt = pick([10, 14, 17, 20]), g = pick([2, 3, 5]), lc = pick([1, 2, 3]), f = pick([868, 433.92]), d = pick([1, 2, 5, 10, 15]), s = pick([-123, -126, -129, -132, -137]);
      const L = Math.round(20 * L10(d) + 20 * L10(f) + 32.44);
      const m = pt + 2 * g - lc - L - s;
      return N(`Emisor de ${pt} dBm, dos antenas de ${g} dBi, ${lc} dB de cables en total, ${L} dB de pérdidas de camino y sensibilidad de ${String(s).replace('-', '−')} dBm. ¿Margen del enlace en dB?`, m, 'dB', `Pr = ${pt} + ${g} + ${g} − ${lc} − ${L} = ${pt + 2 * g - lc - L} dBm. Margen = Pr − sensibilidad = ${m} dB.`, 0.6);
    }, 'rf_budget');

    Gen.add('rf_noise', () => {
      const [bw, txt] = pick([[12500, '12,5 kHz'], [125000, '125 kHz'], [250000, '250 kHz'], [500000, '500 kHz'], [1e6, '1 MHz'], [2e6, '2 MHz'], [20e6, '20 MHz']]), nf = pick([3, 5, 6, 8, 10]);
      const n = -174 + 10 * L10(bw) + nf;
      return N(`Un receptor de ${txt} de ancho de banda con figura de ruido de ${nf} dB. ¿Suelo de ruido en dBm?`, n, 'dBm', `−174 + 10·log(${bw}) + ${nf} = ${fmt(n, 1)} dBm.`, 0.6);
    }, 'rf_noise');

    Gen.add('rf_sens', () => {
      const sf = ri(7, 12), bw = pick([125, 250]), nf = 6;
      const s = -174 + 10 * L10(bw * 1000) + nf + LORA_SNR[sf];
      return N(`LoRa SF${sf}, ${bw} kHz, figura de ruido 6 dB. El demodulador necesita una SNR de ${fmt(LORA_SNR[sf], 1).replace('-', '−')} dB. ¿Sensibilidad en dBm?`, s, 'dBm', `−174 + 10·log(${bw * 1000}) + 6 + (${fmt(LORA_SNR[sf], 1).replace('-', '−')}) = ${fmt(s, 1)} dBm. La SNR negativa es la magia del ensanchado.`, 0.8);
    }, 'rf_sens');

    Gen.add('rf_lcf', () => {
      const L = pick([0.1, 0.22, 0.47, 1, 4.7, 10, 100, 220]), Cp = pick([10, 22, 47, 100, 220, 470]);
      const f = 1 / (2 * Math.PI * Math.sqrt(L * 1e-6 * Cp * 1e-12)) / 1e6;
      return N(`L = ${fmt(L)} µH y C = ${Cp} pF. ¿Frecuencia de resonancia en MHz?`, f, 'MHz', `f₀ = 1 / (2π·√(${fmt(L)}·10⁻⁶ × ${Cp}·10⁻¹²)) = ${fmt(f, 3)} MHz.`, Math.max(0.002, f * 0.03));
    }, 'rf_resonance');

    Gen.add('rf_qbw', () => {
      const [f0, ft] = pick([[1e6, '1 MHz'], [455e3, '455 kHz'], [10.7e6, '10,7 MHz'], [7e6, '7 MHz'], [600e3, '600 kHz']]), q = pick([10, 20, 50, 100, 200]);
      const bw = f0 / q / 1000;
      return N(`Un circuito resuena a ${ft} con Q = ${q}. ¿Ancho de banda a −3 dB en kHz?`, bw, 'kHz', `BW = f₀ / Q = ${fmt(bw, 2)} kHz.`, Math.max(0.05, bw * 0.02));
    }, 'rf_q');

    Gen.add('rf_carson', () => {
      const [df, fm, what] = pick([[75, 15, 'una emisora de FM comercial (audio mono)'], [5, 3, 'un walkie de FM de banda estrecha'], [2.5, 3, 'un equipo con canales de 12,5 kHz'], [50, 10, 'un enlace de audio de prueba'], [25, 5, 'un transmisor de telemetría FM']]);
      return N(`¿Ancho de banda, según Carson, de ${what}: desviación ${fmt(df)} kHz y audio de hasta ${fmt(fm)} kHz? (en kHz)`, 2 * (df + fm), 'kHz', `BW ≈ 2 × (Δf + fm) = 2 × (${fmt(df)} + ${fmt(fm)}) = ${fmt(2 * (df + fm))} kHz.`, 0.5);
    }, 'rf_fm');

    Gen.add('rf_image', () => {
      if (Math.random() < 0.5) {
        const f = pick([88.5, 91.2, 96.3, 101.7, 104.2]), fi = 10.7;
        const r = x => fmt(x, 1) + ' MHz';
        return MC(`Receptor de FM con FI = 10,7 MHz y oscilador local por encima. Sintonizas ${fmt(f)} MHz. ¿Frecuencia imagen?`, r(f + 2 * fi), [r(f + fi), r(f - 2 * fi), r(f - fi), r(2 * f)], `fLO = ${fmt(f)} + 10,7 = ${fmt(f + fi, 1)} MHz. La imagen está otra FI más arriba: ${r(f + 2 * fi)}. Con 21,4 MHz de separación, cae fuera de la banda de FM.`);
      }
      const f = pick([585, 657, 774, 855, 1035, 1215]), fi = 455;
      const r = x => fmt(x) + ' kHz';
      return MC(`Receptor de onda media con FI = 455 kHz y oscilador local por encima. Sintonizas ${f} kHz. ¿Frecuencia imagen?`, r(f + 2 * fi), [r(f + fi), r(Math.abs(f - 2 * fi)), r(f - fi > 0 ? f - fi : f + 3 * fi), r(2 * f)], `fLO = ${f} + 455 = ${f + fi} kHz; imagen = fRF + 2·FI = ${r(f + 2 * fi)}. Hay que atenuarla con el circuito sintonizado de antena.`);
    }, 'rf_image');

    Gen.add('rf_swr', () => {
      const c = ri(0, 2);
      if (c === 0) {
        const R = pick([12.5, 25, 35, 75, 100, 150, 200]);
        const g = Math.abs(R - 50) / (R + 50), s = (1 + g) / (1 - g);
        return N(`Una línea de 50 Ω termina en una carga resistiva de ${fmt(R)} Ω. ¿ROE?`, s, ':1', `|Γ| = |${fmt(R)} − 50| / (${fmt(R)} + 50) = ${fmt(g, 3)}; ROE = (1 + |Γ|) / (1 − |Γ|) = ${fmt(s, 2)}. Con cargas resistivas, ROE = mayor / menor.`, 0.05);
      }
      if (c === 1) {
        const g = pick([0.05, 0.1, 0.2, 0.25, 0.33, 0.5]), s = (1 + g) / (1 - g);
        return N(`El coeficiente de reflexión vale |Γ| = ${fmt(g)}. ¿ROE?`, s, ':1', `ROE = (1 + ${fmt(g)}) / (1 − ${fmt(g)}) = ${fmt(s, 2)}.`, 0.03);
      }
      const g = pick([0.1, 0.2, 0.316, 0.5]), rl = -20 * L10(g);
      return N(`|Γ| = ${fmt(g)}. ¿Pérdidas de retorno en dB?`, rl, 'dB', `RL = −20·log(${fmt(g)}) = ${fmt(rl, 1)} dB. Cuantos más dB, mejor adaptada.`, 0.3);
    }, 'rf_line');

    Gen.add('rf_tsym', () => {
      const sf = ri(7, 12), bw = pick([125, 250, 500]);
      const t = Math.pow(2, sf) / bw;
      return N(`LoRa SF${sf} con ${bw} kHz. ¿Duración de un símbolo en ms?`, t, 'ms', `Tsímbolo = 2^${sf} / ${bw} kHz = ${Math.pow(2, sf)} / ${bw} = ${fmt(t, 3)} ms.`, Math.max(0.01, t * 0.02));
    }, 'rf_lora');

    Gen.add('rf_toaRatio', () => {
      const sf = ri(7, 10), up = pick([1, 2]);
      const a = loraToa(sf, 125, 20, 1).ms, b = loraToa(sf + up, 125, 20, 1).ms, k = b / a;
      const s = x => '×' + fmt(x, 1);
      return MC(`Un paquete de 20 bytes con SF${sf} y 125 kHz tarda ${fmt(a, 1)} ms. ¿Aproximadamente cuánto más tarda con SF${sf + up}?`, s(k), [s(k * 2), s(k / 2), s(1 + up * 0.1), s(k * 4)], `Con SF${sf + up} tarda ${fmt(b, 1)} ms: ${s(k)}. Cada paso de SF casi duplica el tiempo en aire.`);
    }, 'rf_lora');

    Gen.add('rf_duty', () => {
      const ms = pick([56, 103, 185, 371, 741, 1319]), [dc, txt] = pick([[0.01, '1 %'], [0.001, '0,1 %'], [0.1, '10 %']]);
      const n = Math.floor(3600000 * dc / ms);
      return N(`Cada paquete pasa ${ms} ms en el aire y la sub-banda limita el ciclo de trabajo al ${txt}. ¿Cuántos paquetes, como máximo, por hora?`, n, '', `${txt} de 3600 s = ${fmt(3600 * dc)} s = ${fmt(3600000 * dc)} ms; ${fmt(3600000 * dc)} / ${ms} ≈ ${n} paquetes.`, 1);
    }, 'rf_duty');

    Gen.add('rf_nrf', () => {
      const ch = pick([2, 10, 26, 40, 76, 80, 90, 108, 125]);
      const r = x => x + ' MHz';
      const legal = 2400 + ch <= 2482;
      return MC(`Configuras un nRF24L01+ en el canal ${ch}. ¿En qué frecuencia transmite?`, r(2400 + ch), [r(2400 + 2 * ch), r(2402 + 2 * ch), r(2412 + 5 * ch), r(2400 + ch * 10)], `f = 2400 + canal MHz = ${2400 + ch} MHz. ${legal ? 'Dentro de la banda ISM europea (2400–2483,5 MHz).' : '¡Fuera de la banda ISM europea! Solo puedes escuchar ahí, nunca transmitir.'}`);
    }, 'rf_24ghz');

    Gen.add('rf_horizon', () => {
      const h1 = pick([2, 5, 10, 20, 50]), h2 = pick([2, 10, 30, 100, 1000]);
      const d = 4.12 * (Math.sqrt(h1) + Math.sqrt(h2));
      return N(`Una antena a ${h1} m y otra a ${h2} m de altura. ¿Horizonte radio aproximado en km?`, d, 'km', `d ≈ 4,12 · (√${h1} + √${h2}) = ${fmt(d, 1)} km (con la refracción normal de la atmósfera).`, Math.max(0.5, d * 0.03));
    }, 'rf_horizon');

    Gen.add('rf_fresnel', () => {
      const d = pick([0.5, 1, 2, 5, 10, 20]), [f, ft] = pick([[0.43392, '433,92 MHz'], [0.868, '868 MHz'], [2.44, '2,44 GHz']]);
      const r = 8.66 * Math.sqrt(d / f);
      return N(`Enlace de ${fmt(d)} km a ${ft}. ¿Radio de la primera zona de Fresnel en el punto medio (en metros)?`, r, 'm', `r ≈ 8,66 · √(d km / f GHz) = 8,66 · √(${fmt(d)} / ${fmt(f, 3)}) = ${fmt(r, 1)} m. Despeja al menos el 60 %: ${fmt(r * 0.6, 1)} m.`, Math.max(0.1, r * 0.03));
    }, 'rf_fresnel');
  }

  /* ===================== VISUALIZACIONES ===================== */
  const pts = a => a.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  const neg = s => String(s).replace(/-/g, '−');
  Object.assign(Widgets.VIZ, {
    // Frecuencia → longitud de onda y tamaño de antena
    rf_lambda: {
      calc: p => { const lam = 299.792458 / p.f; return { lam, half: lam / 2 * p.k, quarter: lam / 4 * p.k, band: bandName(p.f) }; },
      svg: (p, o) => {
        const w = []; for (let i = 0; i <= 120; i++) w.push([20 + i * 2.2, 52 - 22 * Math.sin(i / 120 * 4 * Math.PI)]);
        return `<svg viewBox="0 0 300 195" class="viz"><path d="M20 52H284" stroke="var(--line)"/>
          <path d="${pts(w)}" fill="none" stroke="var(--ice)" stroke-width="2.5"/>
          <path d="M20 88V80M152 88V80M20 84H152" stroke="currentColor" stroke-width="1.5"/>
          <text x="86" y="102" text-anchor="middle" class="vizlab">λ = ${fLen(o.lam)}</text>
          <text x="284" y="22" text-anchor="end" class="vizsm">Banda ${o.band}</text>
          <path d="M45 132H146M154 132H255" stroke="var(--led)" stroke-width="5" stroke-linecap="round"/><circle cx="150" cy="132" r="3.5" fill="currentColor"/>
          <path d="M150 132V146" stroke="currentColor" stroke-width="1.5"/>
          <text x="150" y="122" text-anchor="middle" class="vizlab">Dipolo λ/2 ≈ ${fLen(o.half)}</text>
          <text x="150" y="166" text-anchor="middle" class="vizlab">Monopolo λ/4 ≈ ${fLen(o.quarter)}</text>
          <text x="150" y="186" text-anchor="middle" class="vizsm">${o.half > 2 ? 'Enorme: en onda media, hilos largos o bobinas' : o.half < 0.1 ? 'Cabe en una placa: antenas de chip o de pista' : 'Factor de acortamiento ' + num(p.k, 2)}</text></svg>`;
      }
    },
    // Barra logarítmica de potencia: dBm ↔ vatios
    rf_dbm: {
      calc: p => { const mw = Math.pow(10, p.P / 10); return { mw, W: mw / 1000, V: Math.sqrt(mw / 1000 * 50) }; },
      svg: (p, o) => {
        const X = d => 20 + (d + 140) / 220 * 260;
        const marks = [[-137, 'LoRa SF12'], [-94, 'nRF24'], [-65, 'WiFi bueno'], [0, 'BLE'], [20, 'router WiFi'], [33, 'móvil'], [77, 'emisora FM']];
        let t = ''; for (let d = -140; d <= 80; d += 20) t += `<path d="M${X(d)} 112V120" stroke="currentColor"/>` + (d % 40 === 0 ? `<text x="${X(d)}" y="134" text-anchor="middle" class="vizsm">${neg(d)}</text>` : '');
        let m = ''; marks.forEach(([d, l], i) => { const y = [76, 88, 100][i % 3]; m += `<path d="M${X(d)} ${y + 3}V112" stroke="var(--muted)" stroke-dasharray="2 2"/><text x="${Math.min(262, Math.max(38, X(d)))}" y="${y}" text-anchor="middle" class="vizsm">${l}</text>`; });
        return `<svg viewBox="0 0 300 190" class="viz">
          <text x="150" y="30" text-anchor="middle" class="vizbig">${neg(p.P)} dBm = ${fW(o.W)}</text>
          <text x="150" y="52" text-anchor="middle" class="vizsm">en 50 Ω: ${fVolt(o.V)} eficaces</text>
          <rect x="20" y="112" width="260" height="8" rx="4" fill="var(--line)"/><rect x="20" y="112" width="${Math.max(0, X(p.P) - 20)}" height="8" rx="4" fill="var(--led)"/>
          ${t}${m}<path d="M${X(p.P)} 108l-6 -10h12z" fill="var(--err)"/>
          <text x="150" y="160" text-anchor="middle" class="vizlab">Cada 10 dB, ×10 · cada 3 dB, ×2</text>
          <text x="150" y="180" text-anchor="middle" class="vizsm">${p.P >= 0 ? 'Desde 1 mW: ×' + sig(o.mw) : 'Desde 1 mW: ÷' + sig(1 / o.mw)}</text></svg>`;
      }
    },
    // Balance de enlace en escalera
    rf_link: {
      calc: p => { const fspl = 20 * Math.log10(p.d) + 20 * Math.log10(p.f) + 32.44; const pr = p.Pt + 2 * p.G - p.Lc - fspl; return { fspl, pr, margin: pr - p.S, eirp: p.Pt - p.Lc / 2 + p.G }; },
      svg: (p, o) => {
        const Y = v => 18 + (40 - Math.max(-150, Math.min(40, v))) / 190 * 135;
        const lv = [p.Pt, p.Pt - p.Lc / 2, o.eirp, o.eirp - o.fspl, o.eirp - o.fspl + p.G, o.pr], xs = [28, 62, 96, 200, 234, 268];
        const lab = ['Pt', 'cable', 'antena', '', 'antena', 'Pr'];
        let path = '', dots = '';
        lv.forEach((v, i) => { path += (i === 0 ? `M${xs[i]} ` : i === 3 ? `L${xs[i]} ` : `L${xs[i]} ${Y(lv[i - 1]).toFixed(1)}L${xs[i]} `) + Y(v).toFixed(1); dots += `<circle cx="${xs[i]}" cy="${Y(v).toFixed(1)}" r="3" fill="currentColor"/><text x="${xs[i]}" y="166" text-anchor="middle" class="vizsm">${lab[i]}</text>`; });
        const ok = o.margin >= 10, col = o.margin < 0 ? 'var(--err)' : ok ? 'var(--ok)' : 'var(--led)';
        return `<svg viewBox="0 0 300 200" class="viz">
          <path d="M20 ${Y(p.S).toFixed(1)}H285" stroke="var(--err)" stroke-dasharray="5 4"/><text x="22" y="${(Y(p.S) + 12).toFixed(1)}" class="vizsm">sensibilidad ${neg(p.S)} dBm</text>
          <path d="${path}" fill="none" stroke="var(--ice)" stroke-width="2.5"/>${dots}
          <text x="148" y="${(Y((o.eirp + o.eirp - o.fspl) / 2) - 6).toFixed(1)}" text-anchor="middle" class="vizsm">−${num(o.fspl, 1)} dB de camino</text>
          <text x="28" y="${(Y(p.Pt) - 8).toFixed(1)}" class="vizsm">${neg(p.Pt)} dBm</text>
          <text x="150" y="186" text-anchor="middle" class="vizlab" style="fill:${col}">Pr ${neg(num(o.pr, 1))} dBm · margen ${neg(num(o.margin, 1))} dB ${o.margin < 0 ? '✗' : ok ? '✓' : '(justo)'}</text></svg>`;
      }
    },
    // Resonancia LC con curva y Q
    rf_lc: {
      calc: p => { const f0 = 1 / (2 * Math.PI * Math.sqrt(p.L * 1e-6 * p.C * 1e-12)); return { f0, bw: f0 / p.Q, X: 2 * Math.PI * f0 * p.L * 1e-6 }; },
      svg: (p, o) => {
        const c = [], X = x => 20 + (x - 0.7) / 0.6 * 260, Y = r => 150 - 110 * r;
        for (let i = 0; i <= 120; i++) { const x = 0.7 + i / 120 * 0.6; c.push([X(x), Y(1 / Math.sqrt(1 + p.Q * p.Q * Math.pow(x - 1 / x, 2)))]); }
        const a = 1 / p.Q, x1 = (-a + Math.sqrt(a * a + 4)) / 2, x2 = (a + Math.sqrt(a * a + 4)) / 2;
        return `<svg viewBox="0 0 300 190" class="viz"><path d="M20 150H285M20 150V30" stroke="currentColor" stroke-width="1.5"/>
          <rect x="${X(Math.max(0.7, x1)).toFixed(1)}" y="40" width="${Math.max(1, X(Math.min(1.3, x2)) - X(Math.max(0.7, x1))).toFixed(1)}" height="110" fill="var(--led)" opacity=".15"/>
          <path d="M20 ${Y(0.707).toFixed(1)}H285" stroke="var(--muted)" stroke-dasharray="4 4"/><text x="284" y="${(Y(0.707) - 4).toFixed(1)}" text-anchor="end" class="vizsm">−3 dB</text>
          <path d="${pts(c)}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          <path d="M150 150V155" stroke="currentColor"/><text x="150" y="167" text-anchor="middle" class="vizsm">f₀</text>
          <text x="22" y="22" class="vizlab">f₀ = ${fHz(o.f0)} · BW = ${fHz(o.bw)}</text>
          <text x="150" y="184" text-anchor="middle" class="vizsm">Q = ${num(p.Q, 0)} · en resonancia XL = XC = ${sig(o.X)} Ω</text></svg>`;
      }
    },
    // Visor de modulaciones sobre la portadora
    rf_mod: {
      anim: true,
      calc: p => ({ type: Math.round(p.type), m: p.m }),
      svg: (p, o, t) => {
        const names = ['', 'AM', 'FM', 'ASK / OOK', 'FSK', 'BPSK'];
        const notes = ['', 'La envolvente copia el mensaje · ancho 2·fm', 'Amplitud fija; cambia la frecuencia', 'Al 100 % es OOK (mandos de 433 MHz)', 'Una frecuencia para el 0 y otra para el 1', 'La fase salta 180° en cada cambio de bit'];
        const bits = [1, 0, 1, 1, 0, 0, 1, 0], typ = o.type, m = p.m, N = 200, fc = 18, sc = (t * 0.12) % 1;
        const msg = [], car = []; let ph = 2 * Math.PI * fc * sc;
        for (let i = 0; i <= N; i++) {
          const u = i / N + sc, b = bits[Math.floor(u * 8) % 8], dig = typ >= 3;
          const s = dig ? (b ? 1 : -1) : Math.sin(2 * Math.PI * 2 * u);
          let a = 1, f = fc, ex = 0;
          if (typ === 1) a = (1 + m * s) / (1 + m);
          if (typ === 3) a = b ? 1 : 1 - m;
          if (typ === 2) f = fc * (1 + 0.45 * m * s);
          if (typ === 4) f = fc * (1 + 0.4 * m * s);
          if (typ === 5) ex = b ? 0 : Math.PI;
          if (i) ph += 2 * Math.PI * f / N;
          const x = 20 + i * 1.3;
          msg.push([x, 52 - 16 * s]); car.push([x, 122 - 32 * a * Math.sin(ph + ex)]);
        }
        return `<svg viewBox="0 0 300 195" class="viz">
          <text x="20" y="22" class="vizsm">Mensaje</text><text x="280" y="22" text-anchor="end" class="vizlab">${names[typ] || ''}</text>
          <path d="${pts(msg)}" fill="none" stroke="var(--ice)" stroke-width="2"/>
          <text x="20" y="84" class="vizsm">Señal transmitida</text>
          <path d="${pts(car)}" fill="none" stroke="var(--led)" stroke-width="1.6"/>
          <text x="150" y="180" text-anchor="middle" class="vizsm">${notes[typ] || ''}</text></svg>`;
      }
    },
    // Tiempo en aire de LoRa
    rf_lora: {
      calc: p => { const r = loraToa(p.SF, p.BW, p.PL, p.CR); return { toa: r.ms, ts: r.ts, de: r.de, rb: p.SF * 4 / (4 + p.CR) * p.BW * 1000 / Math.pow(2, p.SF), sens: -174 + 10 * Math.log10(p.BW * 1000) + 6 + LORA_SNR[p.SF], perHour: Math.floor(36000 / r.ms) }; },
      svg: (p, o) => {
        const sw = 14 + 8 * Math.log2(o.ts / 0.256); let d = '', x = 10;
        for (let k = 0; k < 4; k++) { d += `M${x.toFixed(1)} 78L${(x + sw).toFixed(1)} 30M${(x + sw).toFixed(1)} 30V78`; x += sw; }
        const bar = Math.max(0, Math.min(1, Math.log10(o.toa / 10) / Math.log10(500)));
        return `<svg viewBox="0 0 300 195" class="viz"><path d="M10 78H290" stroke="var(--line)"/>
          <path d="${d}" fill="none" stroke="var(--led)" stroke-width="2"/>
          <text x="10" y="22" class="vizsm">Preámbulo: chirps de ${num(o.ts, o.ts < 10 ? 2 : 1)} ms</text>
          ${H.hbar(10, 112, 280, bar, o.toa > 1000 ? 'var(--err)' : 'var(--ice)', 'Tiempo en aire: ' + num(o.toa, 1) + ' ms')}
          <text x="10" y="140" class="vizlab">${sig(o.rb / 1000)} kbps · sensib. ≈ ${neg(num(o.sens, 1))} dBm</text>
          <text x="10" y="160" class="vizsm">Al 1 % de ciclo: máx. ${o.perHour} paquetes/hora</text>
          <text x="10" y="180" class="vizsm">${o.de ? 'Símbolo > 16 ms: modo de baja velocidad' : '+1 de SF: doble de tiempo, ≈ 2,5 dB más'}</text></svg>`;
      }
    },
    // Onda estacionaria, Γ y ROE
    rf_swr: {
      calc: p => {
        const nr = p.R - 50, ni = p.X, dr = p.R + 50, di = p.X, den = dr * dr + di * di;
        const gr = (nr * dr + ni * di) / den, gi = (ni * dr - nr * di) / den, g = Math.min(0.9999, Math.sqrt(gr * gr + gi * gi));
        return { g, ang: Math.atan2(gi, gr), swr: (1 + g) / (1 - g), rl: g > 1e-4 ? -20 * Math.log10(g) : 80, refl: g * g * 100, ml: -10 * Math.log10(1 - g * g) };
      },
      svg: (p, o) => {
        const c = []; for (let i = 0; i <= 120; i++) { const u = i / 120; c.push([20 + u * 260, 125 - 42 * Math.sqrt(1 + o.g * o.g + 2 * o.g * Math.cos(o.ang - 4 * Math.PI * u))]); }
        return `<svg viewBox="0 0 300 195" class="viz">
          <text x="20" y="22" class="vizsm">Emisor</text><text x="280" y="22" text-anchor="end" class="vizsm">Carga ${num(p.R, 0)} ${p.X >= 0 ? '+' : '−'} j${num(Math.abs(p.X), 0)} Ω</text>
          <path d="M20 125H280" stroke="var(--line)"/><path d="M20 83H280" stroke="var(--muted)" stroke-dasharray="4 4"/>
          <path d="${pts(c)}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          <text x="150" y="44" text-anchor="middle" class="vizbig">ROE ${o.swr > 99 ? '> 99' : num(o.swr, 2)} : 1</text>
          <text x="150" y="146" text-anchor="middle" class="vizsm">Tensión a lo largo de la línea (una λ)</text>
          <text x="150" y="166" text-anchor="middle" class="vizlab">|Γ| = ${num(o.g, 3)} · RL ${o.rl >= 60 ? '> 60' : num(o.rl, 1)} dB</text>
          <text x="150" y="186" text-anchor="middle" class="vizsm">Reflejado ${num(o.refl, 1)} % · desadaptación ${num(o.ml, 2)} dB</text></svg>`;
      }
    },
    // Superheterodino: RF, oscilador local e imagen
    rf_superhet: {
      calc: p => { const lo = p.f + p.side * p.fi, img = p.f + 2 * p.side * p.fi; return { lo, img, outBand: img < 87.5 || img > 108 ? 1 : 0 }; },
      svg: (p, o) => {
        const lo = Math.min(p.f, o.lo, o.img), hi = Math.max(p.f, o.lo, o.img), pad = Math.max(0.3, (hi - lo) * 0.18), a = lo - pad, b = hi + pad;
        const X = f => 20 + (f - a) / (b - a) * 260, bx1 = X(Math.max(a, 87.5)), bx2 = X(Math.min(b, 108));
        const arrow = (f, col, lab, y, dash) => `<path d="M${X(f).toFixed(1)} 130V${y}" stroke="${col}" stroke-width="3"${dash ? ' stroke-dasharray="5 3"' : ''}/><text x="${X(f).toFixed(1)}" y="${y - 6}" text-anchor="middle" class="vizsm">${lab}</text>`;
        return `<svg viewBox="0 0 300 195" class="viz">
          ${bx2 > bx1 ? `<rect x="${bx1.toFixed(1)}" y="40" width="${(bx2 - bx1).toFixed(1)}" height="90" fill="var(--ice)" opacity=".12"/><text x="${Math.min(255, Math.max(45, (bx1 + bx2) / 2)).toFixed(1)}" y="35" text-anchor="middle" class="vizsm">banda de FM</text>` : ''}
          <path d="M20 130H280" stroke="currentColor" stroke-width="1.5"/>
          ${arrow(p.f, 'var(--ice)', 'RF ' + num(p.f, 2), 60, false)}${arrow(o.lo, 'var(--led)', 'OL ' + num(o.lo, 2), 82, false)}${arrow(o.img, 'var(--err)', 'imagen ' + num(o.img, 2), 104, true)}
          <text x="150" y="150" text-anchor="middle" class="vizsm">MHz · FI = |OL − RF| = ${num(p.fi, 3)} MHz</text>
          <text x="150" y="172" text-anchor="middle" class="vizlab" style="fill:${o.outBand ? 'var(--ok)' : 'var(--err)'}">${o.outBand ? 'Imagen fuera de la banda de FM ✓' : 'Imagen dentro de la banda ✗'}</text>
          <text x="150" y="190" text-anchor="middle" class="vizsm">Imagen = RF ${p.side > 0 ? '+' : '−'} 2 × FI</text></svg>`;
      }
    },
    // Zona de Fresnel y curvatura de la Tierra
    rf_fresnel: {
      calc: p => { const r1 = 8.66 * Math.sqrt(p.d / (p.f / 1000)); const bulge = p.d * p.d / (8 * 4 / 3 * 6371) * 1000; const clear = p.h - bulge - p.obs; return { r1, bulge, clear, ratio: clear / r1 }; },
      svg: (p, o) => {
        const top = Math.max(p.h + o.r1, o.bulge + p.obs, 30) * 1.15, Y = m => 150 - m / top * 120;
        const ground = []; for (let i = 0; i <= 40; i++) { const u = i / 40; ground.push([30 + u * 240, Y(o.bulge * 4 * u * (1 - u))]); }
        const ell = []; for (let i = 0; i <= 60; i++) { const u = i / 60, r = o.r1 * 2 * Math.sqrt(u * (1 - u)); ell.push([30 + u * 240, Y(p.h - r)]); }
        for (let i = 60; i >= 0; i--) { const u = i / 60, r = o.r1 * 2 * Math.sqrt(u * (1 - u)); ell.push([30 + u * 240, Y(p.h + r)]); }
        const ok = o.ratio >= 0.6, col = ok ? 'var(--ok)' : o.ratio > 0 ? 'var(--led)' : 'var(--err)';
        return `<svg viewBox="0 0 300 195" class="viz">
          <path d="${pts(ell)}Z" fill="var(--ice)" opacity=".18" stroke="var(--ice)"/>
          <path d="${pts(ground)}L270 160L30 160Z" fill="var(--line)"/>
          <rect x="144" y="${Y(o.bulge + p.obs).toFixed(1)}" width="12" height="${Math.max(0, Y(o.bulge) - Y(o.bulge + p.obs)).toFixed(1)}" fill="var(--muted)"/>
          <path d="M30 150V${Y(p.h).toFixed(1)}M270 150V${Y(p.h).toFixed(1)}" stroke="currentColor" stroke-width="3"/>
          <path d="M30 ${Y(p.h).toFixed(1)}H270" stroke="var(--led)" stroke-width="1.5" stroke-dasharray="4 3"/>
          <text x="150" y="20" text-anchor="middle" class="vizlab">Fresnel en el centro: ${num(o.r1, 1)} m</text>
          <text x="150" y="176" text-anchor="middle" class="vizsm">Curvatura ${num(o.bulge, 1)} m · obstáculo ${num(p.obs, 0)} m</text>
          <text x="150" y="192" text-anchor="middle" class="vizlab" style="fill:${col}">Despejado: ${o.ratio > 0 ? num(o.ratio * 100, 0) + ' %' : 'nada, el obstáculo tapa'} ${ok ? '✓' : o.ratio > 0 ? '(objetivo ≥ 60 %)' : ''}</text></svg>`;
      }
    }
  });

  /* ===================== PROYECTOS ===================== */
  const LEGAL433 = 'Banda 433,05–434,79 MHz: uso común sin licencia con unos 10 mW PRA (ERP) y ciclo de trabajo limitado (típicamente ≤ 10 %). Sin amplificadores ni antenas de ganancia. Comprueba la sub-banda exacta en el CNAF y en la ERC 70-03 vigentes';
  const LEGAL868 = 'Sub-banda 868,0–868,6 MHz: 25 mW PRA (14 dBm ERP) y ciclo de trabajo ≤ 1 % (36 s por hora). Si tu antena tiene más de 2,15 dBi, baja la potencia del módulo en la misma cantidad. Los límites de cada sub-banda están en la ERC 70-03 y el CNAF: compruébalos, pueden cambiar';
  Object.assign(PROJECTS, {
    rf_microwave: {
      intro: 'Mide la velocidad de la luz con el microondas de la cocina (sin abrirlo ni modificarlo) y una tableta de chocolate: las ondas estacionarias de 2,45 GHz funden el chocolate en puntos separados media longitud de onda.',
      level: 1, hours: 2,
      skills: ['Ondas estacionarias', 'λ = c / f en la práctica', 'Error de medida'],
      bom: ['Microondas doméstico en buen estado (no lo abras: dentro hay tensiones mortales incluso desenchufado)', 'Tableta de chocolate grande o lonchas de queso', 'Plato llano apto para microondas', 'Regla o calibre', 'Libreta'],
      phases: [
        { title: 'Fase 1 · Preparación', steps: ['Busca la etiqueta trasera o el manual del microondas y anota su frecuencia (casi siempre 2450 MHz).', 'Retira el plato giratorio y su aro: la comida no debe moverse.', 'Pon el chocolate en el plato llano, en el centro de la base.', 'Nunca enciendas el microondas vacío ni con objetos metálicos dentro.'], checks: ['He anotado la frecuencia del aparato', 'El plato queda quieto al encender unos segundos'] },
        { title: 'Fase 2 · Buscar los puntos calientes', steps: ['Calienta 15 s a máxima potencia y mira la superficie: busca zonas brillantes o hundidas.', 'Si no ves nada, añade tandas de 5 s. Si se funde todo, empieza de nuevo con menos tiempo.', 'Mide la distancia entre centros de manchas vecinas con la regla.', 'Repite con el chocolate en otras dos posiciones y orientaciones.'], checks: ['Veo al menos dos manchas fundidas separadas', 'He anotado al menos 6 distancias en total'] },
        { title: 'Fase 3 · Cálculo y error', steps: ['Haz la media de las distancias: es λ/2, porque entre dos máximos de una onda estacionaria hay media longitud de onda.', 'Calcula c = 2 · d · f (con d en metros y f en Hz). Con d = 6,1 cm y 2,45 GHz sale 2,99·10⁸ m/s.', 'Estima el error: si tu regla falla ±0,5 cm sobre 6 cm, el resultado falla ±8 %.', 'Explica por qué las distancias no son todas iguales: dentro de la caja hay modos en tres dimensiones.'], checks: ['Mi c está a menos de un 15 % de 3·10⁸ m/s', 'He calculado el error relativo de mi medida', 'Sé explicar por qué los máximos están a λ/2'] }
      ],
      extra: ['Repite con queso y compara qué material marca mejor los máximos.', 'Calcula la λ de tu WiFi (2,4 GHz): ¿qué distancia esperarías entre máximos?', 'Cuidado: el chocolate fundido quema. Deja enfriar antes de tocarlo.']
    },
    rf_audit: {
      intro: 'Haz el inventario de todo lo que emite radio en tu casa: router, móviles, mandos, timbres, básculas, auriculares, el coche… Sitúa cada uno en el cuadro de frecuencias con su potencia y la norma que cumple.',
      level: 1, hours: 4,
      skills: ['Leer el CNAF y la ERC 70-03', 'Buscar informes de ensayo', 'Convertir potencias a dBm'],
      bom: ['Hoja de cálculo o libreta', 'Acceso a internet', 'Lupa y destornillador pequeño (solo para tapas de pilas, nunca abras aparatos de red)'],
      phases: [
        { title: 'Fase 1 · Inventario', steps: ['Recorre la casa y apunta cada aparato que se comunique sin cables: al menos 12.', 'Lee sus etiquetas: marca, modelo, marcado CE y, si lo tiene, el código FCC ID (aparatos vendidos también en EE. UU.).', 'Anota qué tecnología usa: WiFi, Bluetooth, 433 MHz, DECT, NFC, móvil…'], checks: ['Tengo al menos 12 aparatos con modelo', 'Al menos 5 tienen FCC ID o declaración de conformidad localizada'] },
        { title: 'Fase 2 · Datos técnicos', steps: ['Con el FCC ID, busca el expediente en la base de datos pública de la FCC: incluye informes de ensayo con frecuencias, potencias medidas y fotos internas.', 'Para los demás, busca la declaración UE de conformidad del fabricante: dice qué normas cumple (EN 300 328 a 2,4 GHz, EN 300 220 por debajo de 1 GHz, EN 300 330 para inductivos…).', 'Pasa cada potencia a dBm y apunta si es PIRE (EIRP) o PRA (ERP).'], checks: ['Al menos 5 aparatos con potencia documentada en dBm', 'He identificado la norma armonizada de al menos 5'] },
        { title: 'Fase 3 · Tu mapa del espectro', steps: ['Dibuja un eje de frecuencias logarítmico de 100 kHz a 6 GHz y coloca cada aparato.', 'Marca qué bandas son de uso común (ISM, SRD) y cuáles son de operador con licencia (telefonía móvil).', 'Compara cada potencia con el límite de su banda y busca la banda más saturada de tu casa.'], checks: ['Mapa terminado con todos los aparatos', 'Sé qué aparatos usan bandas con licencia y cuáles de uso común', 'He identificado la banda más concurrida'] }
      ],
      extra: ['Abre la tapa de pilas de un mando viejo de 433 MHz e identifica el resonador SAW, el transistor oscilador y la antena de pista.', 'Mira las fotos internas de un informe FCC de tu router e identifica los blindajes y los conectores u.FL.']
    },
    rf_rssi: {
      intro: 'Convierte un ESP32 en un medidor de señal: mide el RSSI de un punto de acceso a distintas distancias, ajusta un modelo de pérdidas a tus datos y descubre cuánto se aleja tu casa del espacio libre.',
      level: 2, hours: 6,
      skills: ['RSSI y su ruido', 'Modelo log-distancia', 'Pérdidas por paredes', 'Desvanecimiento por multitrayecto'],
      bom: ['ESP32 DevKit', 'Batería USB', 'Cinta métrica de 10 m o más', 'Tu router o el punto de acceso de tu móvil', 'Ordenador con monitor serie y hoja de cálculo'],
      phases: [
        { title: 'Fase 1 · El medidor', steps: ['Carga el programa con el nombre y la clave de TU red.', 'Deja el ESP32 quieto a 2 m del punto de acceso y observa la media y la desviación.', 'Gira tu cuerpo entre el ESP32 y el router y apunta cuántos dB cambia.'], checks: ['Quieto, la media varía menos de ±3 dB entre lecturas', 'He medido cuántos dB absorbe mi cuerpo'],
          code: '#include <WiFi.h>\nconst char* SSID = "TU_RED";        // solo redes tuyas\nconst char* PASS = "TU_CLAVE";\n\nvoid setup() {\n  Serial.begin(115200);\n  WiFi.mode(WIFI_STA);\n  WiFi.begin(SSID, PASS);\n  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print(\'.\'); }\n  Serial.printf("\\nConectado en el canal %d\\n", WiFi.channel());\n}\n\nvoid loop() {\n  const int N = 20;\n  float suma = 0, suma2 = 0;\n  int mn = 0, mx = -200;\n  for (int i = 0; i < N; i++) {\n    int r = WiFi.RSSI();             // dBm del último paquete recibido del router\n    suma += r; suma2 += (float)r * r;\n    if (r < mn) mn = r;\n    if (r > mx) mx = r;\n    delay(100);\n  }\n  float media = suma / N, var = suma2 / N - media * media;\n  Serial.printf("RSSI %.1f dBm  min %d  max %d  desv %.1f dB\\n", media, mn, mx, var > 0 ? sqrt(var) : 0.0);\n}' },
        { title: 'Fase 2 · Medidas con visión directa', steps: ['Busca un lugar abierto (parque, pasillo largo) y usa el punto de acceso del móvil como emisor fijo, a 1 m del suelo.', 'Mide a 1, 2, 4, 8, 16 y 32 m, tres veces en cada punto, siempre con la misma orientación.', 'Apunta media y desviación en la hoja de cálculo.'], checks: ['Tabla con 6 distancias y 3 repeticiones', 'La señal baja al alejarme (salvo algún bache que sé explicar)'] },
        { title: 'Fase 3 · Ajusta el modelo', steps: ['Dibuja el RSSI frente a log₁₀(d). Debería salir casi una recta.', 'Ajusta la recta: la pendiente vale −10·n, donde n es el exponente de pérdidas (2 en espacio libre).', 'Compara con la teoría: a 2,44 GHz, 1 m de espacio libre son unos 40 dB de pérdidas.'], checks: ['He calculado n y su valor está entre 1,5 y 4', 'Sé explicar por qué no sale exactamente 2'] },
        { title: 'Fase 4 · Mapa de cobertura y paredes', steps: ['Dibuja un plano de tu casa con una cuadrícula y mide en al menos 15 puntos.', 'Mide justo a cada lado de dos paredes distintas (tabique y muro de carga) y calcula su pérdida.', 'Mueve el ESP32 en pasos de 2 cm a lo largo de 30 cm en un mismo sitio: verás el desvanecimiento por multitrayecto.'], checks: ['Mapa con 15 puntos coloreado por RSSI', 'Pérdida medida de 2 paredes distintas', 'He visto variaciones de varios dB en pocos centímetros'] }
      ],
      extra: ['Añade una pantalla OLED y un botón para guardar puntos sin ordenador.', 'Repite el experimento con un nodo LoRa o un nRF24 y compara exponentes.']
    },
    rf_detector: {
      intro: 'Un olfateador de RF: una antena corta, un diodo Schottky y un condensador convierten la radiofrecuencia en continua. Con un operacional y un Arduino detectas tu walkie, tu mando de 433 MHz o tu router cuando transmiten.',
      level: 2, hours: 6,
      skills: ['Detector de envolvente', 'Zona cuadrática del diodo', 'Campo cercano y lejano', 'Calibrar un instrumento sencillo'],
      bom: ['Diodo Schottky 1N5711 (mejor por encima de 1 GHz) o BAT43', 'Condensador cerámico de 100 pF y resistencia de 100 kΩ', 'Amplificador operacional de entrada y salida carril a carril a 5 V (MCP6002 o similar)', 'Resistencias de 1 kΩ y 100 kΩ', 'Dos trozos de hilo rígido de 8 cm (antena)', 'Arduino Uno o Nano', 'Zumbador pasivo (opcional)', 'Fuentes de RF tuyas: mando de 433 MHz, router WiFi, walkie PMR446'],
      phases: [
        { title: 'Fase 1 · El detector pasivo', steps: ['Suelda un hilo de 8 cm al ánodo del diodo y el otro hilo a masa: forman un dipolo corto con camino de continua para el diodo.', 'Del cátodo a masa, el condensador de 100 pF y la resistencia de 100 kΩ en paralelo.', 'Mide la tensión del cátodo con el multímetro mientras pulsas el PTT de un walkie PMR446 a 20 cm.', 'Repite con el mando de 433 MHz pegado a la antena.'], checks: ['La tensión sube claramente (decenas de mV o más) al transmitir el walkie', 'Sin transmisión, lee casi 0 V'] },
        { title: 'Fase 2 · Amplificador y Arduino', steps: ['Lleva la salida del detector a la entrada + del operacional en no inversor con ganancia 101 (Rf = 100 kΩ, Rg = 1 kΩ).', 'Conecta la salida a A0 y alimenta todo a 5 V con masa común.', 'Carga el programa: calibra el cero al arrancar y dibuja una barra con el pico de cada ventana de 50 ms.'], checks: ['El cero se calibra solo al arrancar', 'El mando de 433 MHz mueve la barra a 1 m'],
          code: 'const int PIN = A0;\nconst int ZUMB = 8;                 // zumbador pasivo opcional\nint cero = 0;\n\nvoid setup() {\n  Serial.begin(115200);\n  long s = 0;\n  for (int i = 0; i < 200; i++) { s += analogRead(PIN); delay(2); }\n  cero = s / 200;                   // lectura sin RF: offset del operacional\n  Serial.print("Cero: "); Serial.println(cero);\n}\n\nvoid loop() {\n  int pico = 0;\n  unsigned long t0 = millis();\n  while (millis() - t0 < 50) {      // pico en ventanas de 50 ms: atrapa ráfagas cortas\n    int v = analogRead(PIN) - cero;\n    if (v > pico) pico = v;\n  }\n  int barras = constrain(pico / 8, 0, 60);\n  for (int i = 0; i < barras; i++) Serial.print(\'#\');\n  Serial.println();\n  if (pico > 20) tone(ZUMB, 200 + pico * 3, 40);\n}' },
        { title: 'Fase 3 · Caracterízalo', steps: ['Con el walkie, mide el pico a 10, 20, 40 y 80 cm. Repite con el router a 10, 20 y 40 cm.', 'Dibuja pico frente a distancia en escala log-log.', 'Comprueba: en la zona cuadrática del diodo, la salida es proporcional a la potencia; en campo lejano debería bajar unos 6 dB al doblar la distancia. Muy cerca de la antena (campo cercano) no se cumple.', 'Observa el router: la barra salta a ráfagas, con las balizas cada unos 100 ms y el tráfico.'], checks: ['Tabla con 4 distancias para 2 fuentes', 'He identificado dónde deja de cumplirse la ley de la distancia y por qué'] },
        { title: 'Fase 4 · Caja y uso en el taller', steps: ['Mételo en una caja de plástico con la antena fuera y un interruptor.', 'Úsalo para saber si un emisor tuyo de 433 MHz realmente transmite y con qué antena lo hace mejor.', 'Anota en la caja que es un detector relativo, no un medidor de exposición calibrado.'], checks: ['Funciona con batería en una caja', 'He comparado dos antenas de un mismo emisor con él'] }
      ],
      extra: ['Sustituye el diodo por un detector logarítmico AD8307 (unos 25 mV/dB) y calíbralo en dBm con una fuente conocida y atenuadores.', 'Añade una pantalla y un registro de picos con hora para buscar quién transmite de madrugada en tu casa.']
    },
    rf_oscillators: {
      intro: 'Construye un oscilador de cristal, mide su frecuencia, escucha sus armónicos y después genera frecuencias a la carta con un sintetizador PLL Si5351 que calibrarás tú mismo.',
      level: 3, hours: 10,
      skills: ['Oscilador Pierce', 'Precisión en ppm', 'Armónicos de una cuadrada', 'Sintetizadores PLL', 'Medidas conducidas'],
      bom: ['74HCU04 (inversores sin búfer; vale 74HC04)', 'Cristales de 4 MHz y 10 MHz', '2 condensadores de 22 pF, resistencias de 1 MΩ y 1 kΩ', 'Arduino Uno o Nano y la biblioteca FreqCount', 'Módulo Si5351 (I²C) y la biblioteca Si5351 de Etherkit', 'Osciloscopio (o el de tu taller)', 'RTL-SDR con TCXO (V3 o V4) para las fases 2 y 4', 'Atenuador de 30–40 dB o un divisor resistivo y una carga de 50 Ω'],
      phases: [
        { title: 'Fase 1 · Oscilador Pierce de 4 MHz', steps: ['Monta un inversor del 74HCU04 con 1 MΩ entre su entrada y su salida (lo polariza en zona lineal).', 'Cristal entre entrada y salida (a través de 1 kΩ en la salida), y 22 pF de cada pata del cristal a masa.', 'Pasa la salida por un segundo inversor como búfer y mírala en el osciloscopio.', 'Conecta el búfer al pin 5 de la Uno y mide con FreqCount (cuenta flancos durante 1 s).'], checks: ['Veo una onda cuadrada estable de 4 MHz en el osciloscopio', 'FreqCount da una lectura estable en ±50 Hz', 'Sé explicar por qué el error de la medida puede venir del reloj de la propia placa'],
          code: '#include <FreqCount.h>       // entrada fija: pin 5 en Uno y Nano\n\nvoid setup() {\n  Serial.begin(115200);\n  FreqCount.begin(1000);         // ventana de 1000 ms\n}\n\nvoid loop() {\n  if (FreqCount.available()) {\n    unsigned long f = FreqCount.read();\n    Serial.print(f); Serial.println(" Hz");\n    // Tu parte: calcula el error en ppm respecto a 4 000 000 Hz\n  }\n}' },
        { title: 'Fase 2 · Armónicos', steps: ['Cambia el cristal por el de 10 MHz (la Uno ya no puede contarlo: usa el SDR).', 'Acerca un hilo corto conectado al SDR al oscilador, sin tocarlo y sin ponerle antena al oscilador.', 'Busca los armónicos en 30, 40, 50, 60 y 70 MHz y apunta su nivel relativo.', 'Compara con la teoría: en una cuadrada perfecta solo hay impares y caen como 1/n (el 3.º, −9,5 dB; el 5.º, −14 dB). Si ves pares, el ciclo de trabajo no es del 50 %.'], checks: ['He medido al menos 4 armónicos', 'Sé explicar por qué aparecen armónicos pares'] },
        { title: 'Fase 3 · Sintetizador Si5351', steps: ['Conecta el Si5351 por I²C (SDA, SCL, alimentación y masa; revisa si tu módulo admite 5 V).', 'Genera 10 MHz en CLK0 con el programa y míralo en el osciloscopio.', 'Añade órdenes por el monitor serie para cambiar de frecuencia y prueba 1, 7 y 25 MHz.', 'Nunca conectes una antena a sus salidas: es una cuadrada llena de armónicos y transmitirías sin permiso.'], checks: ['El Si5351 responde y genera 10 MHz', 'Puedo cambiar la frecuencia desde el monitor serie'],
          code: '#include <Wire.h>\n#include <si5351.h>\nSi5351 si5351;\n\nvoid setup() {\n  Serial.begin(115200);\n  bool ok = si5351.init(SI5351_CRYSTAL_LOAD_8PF, 0, 0);\n  Serial.println(ok ? "Si5351 encontrado" : "No responde: revisa SDA y SCL");\n  si5351.set_correction(0, SI5351_PLL_INPUT_XO);    // la ajustarás en la fase 4\n  si5351.set_freq(1000000000ULL, SI5351_CLK0);      // en centésimas de Hz: 10 MHz\n  si5351.drive_strength(SI5351_CLK0, SI5351_DRIVE_2MA);\n}\n\nvoid loop() {\n  // Tu parte: lee una frecuencia en Hz por Serial y llama a\n  // si5351.set_freq(hz * 100ULL, SI5351_CLK0);\n}' },
        { title: 'Fase 4 · Calibración en ppm', steps: ['Configura 100,000 MHz y llévalo al SDR por cable, a través del atenuador (medida conducida: nada se radia).', 'Haz zoom en el SDR y mide la diferencia entre la señal y 100,000 MHz.', 'Calcula el error en ppm (1 ppm a 100 MHz son 100 Hz) y aplica la corrección con set_correction (en partes por mil millones).', 'Vuelve a medir: el error residual debería quedar dentro de lo que garantiza el TCXO del SDR.'], checks: ['He medido el error inicial del Si5351 en ppm', 'Tras corregir, el error queda por debajo de ±2 ppm', 'Todas las medidas han sido por cable, sin antena'] }
      ],
      extra: ['Monta un oscilador Colpitts con un transistor y una bobina hecha a mano y compara su deriva térmica con la del cristal.', 'Disciplina el Si5351 con el pulso por segundo de un módulo GPS.']
    },
    rf_antennas: {
      intro: 'Fabrica un monopolo de cuarto de onda con plano de tierra para 868 MHz y un dipolo para 433 MHz, mídelos con un NanoVNA, recórtalos hasta clavar la frecuencia y compáralos con las antenas que traen los módulos baratos.',
      level: 3, hours: 10,
      skills: ['Calibrar un VNA', 'Leer ROE, pérdidas de retorno y carta de Smith', 'Ajustar antenas', 'Corrientes de modo común'],
      bom: ['NanoVNA-H o H4 (para 433/868 MHz basta) con su kit de calibración SMA', 'Conector SMA hembra de chasis (brida de 4 agujeros)', 'Hilo de cobre rígido de 1,5 mm² o varilla de latón de 2 mm', 'Cable coaxial RG-58 o RG-316 con conectores SMA', 'Ferritas de clip o cuentas de ferrita', 'Soldador, calibre y alicates de corte', 'Antenas comerciales de módulos (muelle de 433 MHz, antena de goma de 868 MHz)'],
      phases: [
        { title: 'Fase 1 · Calibrar el NanoVNA', steps: ['Elige el rango (por ejemplo 300–1000 MHz) y el número de puntos antes de calibrar.', 'Calibra en el extremo del cable que vas a usar: abierto, cortocircuito y carga de 50 Ω (y paso directo si lo usarás). Guarda la calibración.', 'Comprueba: con la carga, ROE casi 1; con abierto y cortocircuito, los puntos en los extremos opuestos de la carta de Smith.'], checks: ['Con la carga de 50 Ω, ROE < 1,05 en todo el rango', 'Calibración guardada en una ranura'] },
        { title: 'Fase 2 · Monopolo con plano de tierra para 868 MHz', steps: ['Suelda un radiante de 9,0 cm al pin central del conector de chasis (empieza largo: se recorta, no se estira).', 'Suelda 4 radiales de unos 9 cm a los agujeros de la brida, inclinados unos 45° hacia abajo.', 'Mide: busca el mínimo de ROE. Si está por debajo de 868 MHz, la antena es larga.', 'Recorta con la regla L_nueva = L_actual × f_medida / f_deseada, en pasos de 1–2 mm.', 'Prueba los radiales horizontales y luego a 45°: mira cómo cambia la parte resistiva de la impedancia.'], checks: ['Mínimo de ROE entre 865 y 871 MHz', 'ROE < 1,5 de 863 a 870 MHz', 'He comprobado el efecto del ángulo de los radiales'] },
        { title: 'Fase 3 · Dipolo de 433 MHz y el balun', steps: ['Corta dos brazos de 17 cm. Vivo del coaxial a uno, malla al otro.', 'Mide y recorta los dos brazos por igual hasta resonar en 433,9 MHz ± 2 MHz.', 'Toca el coaxial con la mano: la medida cambia porque por fuera de la malla circula corriente de modo común.', 'Pon 3–5 ferritas junto al punto de alimentación (balun de choque) y repite.'], checks: ['Resonancia en 433,9 ± 2 MHz', 'Con ferritas, tocar el cable cambia la ROE menos de 0,1'] },
        { title: 'Fase 4 · Comparar con las antenas comerciales', steps: ['Mide la antena de muelle de 433 MHz y la de goma de 868 MHz.', 'Para cada antena apunta a la frecuencia de trabajo: ROE, pérdidas de retorno y pérdida por desadaptación.', 'Acerca la mano a 5 cm y anota el desplazamiento de frecuencia.'], checks: ['Tabla con al menos 3 antenas', 'He calculado la pérdida por desadaptación de cada una'] },
        { title: 'Fase 5 · Prueba en el aire', steps: ['Límites legales: en 868 MHz, ' + LEGAL868 + '. En 433 MHz, ' + LEGAL433 + '.', 'Con dos módulos de radio (los del proyecto LoRa o de 433 MHz) a 10 m fijos, mide el RSSI con cada antena en el receptor.', 'Repite tres veces cada medida alternando antenas.', 'Compara la diferencia en el aire con lo que predecía la pérdida por desadaptación.', 'Transmite solo en tu sub-banda legal y con paquetes cortos.'], checks: ['Las diferencias entre antenas se repiten con ±2 dB', 'He relacionado la ROE medida con el RSSI'] }
      ],
      extra: ['Diseña una antena de pista para 868 MHz en KiCad y mídela con su red de adaptación.', 'Construye una J-pole de cobre para 433 MHz.']
    },
    rf_yagi: {
      intro: 'Diseña con un simulador, construye y ajusta una Yagi de 3 elementos para 868 MHz. Después mide su diagrama de radiación girándola sobre un transportador y compáralo con la simulación.',
      level: 4, hours: 16,
      skills: ['Simulación de antenas (NEC)', 'Elementos parásitos', 'Adaptación del elemento activo', 'Diagramas polares, relación delante-detrás'],
      bom: ['Ordenador con MMANA-GAL o 4nec2 (gratuitos)', 'Varilla de latón o aluminio de 2–3 mm', 'Larguero NO metálico (listón de madera o tubo de PVC)', 'Conector SMA de chasis, coaxial corto y ferritas', 'NanoVNA', 'Dos placas ESP32 con módulo LoRa de 868 MHz (un emisor con antena normal y el receptor con la Yagi)', 'Transportador grande impreso y una base giratoria'],
      phases: [
        { title: 'Fase 1 · Simulación', steps: ['Modela un reflector, un dipolo activo y un director a 868 MHz con el diámetro real de tu varilla. Como orden de magnitud: reflector algo más largo que λ/2 (≈ 17 cm), director algo más corto (≈ 15–16 cm) y separaciones de 0,15–0,2 λ.', 'Optimiza para ganancia, relación delante-detrás y una impedancia cercana a 50 Ω.', 'Guarda el diagrama y los números: ganancia (≈ 7 dBi), ancho de haz a −3 dB y delante-detrás.'], checks: ['Tengo un diseño simulado con impedancia entre 35 y 70 Ω', 'He guardado el diagrama simulado'] },
        { title: 'Fase 2 · Construcción', steps: ['Corta los elementos un 1–2 % más largos que la simulación, salvo el reflector.', 'Fíjalos al larguero no metálico con las separaciones exactas.', 'El activo es un dipolo partido: vivo a un brazo, malla al otro, con ferritas en el coaxial junto a la alimentación.'], checks: ['Las separaciones coinciden con el diseño en ±2 mm', 'El activo está aislado del larguero'] },
        { title: 'Fase 3 · Ajuste con el NanoVNA', steps: ['Mide la ROE alejada de paredes y objetos metálicos (al menos 1 m).', 'Recorta el activo para centrar la resonancia en 868,3 MHz.', 'Si la parte resistiva queda baja, prueba a separar un poco el director.'], checks: ['ROE < 1,5 en 868,0–868,6 MHz'] },
        { title: 'Fase 4 · Medir el diagrama de radiación', steps: ['Límites legales del emisor: ' + LEGAL868 + '.', 'Coloca el emisor LoRa con su antena normal a unos 20 m, en campo abierto y a la misma altura.', 'La Yagi va en el receptor (la ganancia en recepción no cuenta para el límite de emisión). El emisor envía un paquete corto de SF7 cada 10 s: unos 56 ms cada 10 s, un 0,6 %.', 'Gira la Yagi de 15 en 15° y guarda la media de 5 paquetes en cada ángulo.', 'Dibuja el diagrama polar normalizado y calcula el ancho de haz y la relación delante-detrás.'], checks: ['Diagrama con 24 ángulos medidos', 'Ancho de haz a −3 dB calculado', 'He comparado delante-detrás medido y simulado'],
          code: '// Receptor con la Yagi: escribe "m" en el monitor serie al llegar a cada ángulo\n#include <SPI.h>\n#include <LoRa.h>\nconst int NSS = 18, RST = 14, DIO0 = 26;   // ajústalos a tu placa\nfloat suma = 0; int n = 0;\n\nvoid setup() {\n  Serial.begin(115200);\n  LoRa.setPins(NSS, RST, DIO0);\n  if (!LoRa.begin(868.1E6)) { Serial.println("LoRa no responde"); while (true) delay(1000); }\n  LoRa.setSpreadingFactor(7);\n  LoRa.setSignalBandwidth(125E3);\n}\n\nvoid loop() {\n  if (LoRa.parsePacket()) {\n    while (LoRa.available()) LoRa.read();\n    suma += LoRa.packetRssi(); n++;\n    Serial.printf("RSSI %d (llevo %d)\\n", LoRa.packetRssi(), n);\n  }\n  if (Serial.available() && Serial.read() == \'m\' && n > 0) {\n    Serial.printf("MEDIA %.1f dBm con %d paquetes\\n", suma / n, n);\n    suma = 0; n = 0;               // listo para el siguiente ángulo\n  }\n}' }
      ],
      extra: ['Añade un segundo director y mide cuánto gana de verdad.', 'Monta la Yagi en un servo y automatiza el barrido de ángulos.']
    },
    rf_crystal: {
      intro: 'Una radio sin pilas: bobina enrollada por ti, un condensador variable, un diodo y un auricular de alta impedancia. Toda la energía que oyes la trae la onda de la emisora.',
      level: 2, hours: 8,
      skills: ['Circuito tanque LC', 'Fórmula de Wheeler para bobinas', 'Detector de envolvente', 'Selectividad frente a sensibilidad'],
      bom: ['Tubo de PVC de 5 cm de diámetro y unos 10 cm de largo', 'Unos 15 m de hilo de cobre esmaltado de 0,5 mm', 'Condensador variable de radio antigua o polyvaricon (≈ 10–365 pF)', 'Diodo de germanio (1N34A, AA119) o Schottky (BAT46, 1N5711)', 'Auricular piezoeléctrico de alta impedancia y una resistencia de 47–100 kΩ', 'Antena: 15–30 m de hilo lo más alto posible, lejos de líneas eléctricas', 'Toma de tierra: piqueta metálica clavada en tierra húmeda', 'Multímetro'],
      phases: [
        { title: 'Fase 1 · La bobina', steps: ['Antes de nada, comprueba con una radio de pilas qué emisoras de onda media llegan fuertes a tu zona (de noche llegan más). Si no hay ninguna potente o cercana, la galena no oirá nada de día.', 'Enrolla 70 vueltas juntas en el tubo (unos 3,5 cm de bobinado). Haz una toma (un bucle trenzado y raspado) cada 10 vueltas.', 'Calcula con Wheeler: L (µH) ≈ d²·N² / (45,7·d + 101,6·l), con d y l en cm. Te saldrán unos 210 µH.', 'Si tienes medidor LCR o NanoVNA, mide L y compara.'], checks: ['La bobina está firme, con tomas accesibles', 'He calculado L y, si he podido medirla, coincide en ±15 %'] },
        { title: 'Fase 2 · El circuito sintonizado', steps: ['Conecta el condensador variable en paralelo con toda la bobina: es el tanque.', 'Calcula el rango con f = 1 / (2π√(LC)) para los dos extremos del condensador (suma unos 15 pF de parásitos al mínimo).', 'Comprueba que cubres al menos de 600 a 1500 kHz. Si no, quita o añade vueltas.'], checks: ['El rango calculado cubre 600–1500 kHz', 'He anotado L y Cmín/Cmáx'] },
        { title: 'Fase 3 · Detector y escucha', steps: ['Diodo desde la parte alta del tanque hasta el auricular; el otro lado del auricular, a la parte baja (masa). Resistencia de 47–100 kΩ en paralelo con el auricular para descargarlo.', 'Antena a una toma intermedia de la bobina y tierra a la parte baja.', 'Gira el condensador despacio hasta oír una emisora.', 'Seguridad: nada de antenas cerca de líneas eléctricas; desconecta la antena y ponla a tierra si hay tormenta.'], checks: ['Oigo al menos una emisora y sé cuál es', 'He comprobado que sin tierra se oye peor'] },
        { title: 'Fase 4 · Medir y mejorar', steps: ['Pon el multímetro en continua sobre la resistencia de carga: la tensión detectada es tu medidor de señal.', 'Cambia la antena de toma y apunta la tensión y lo separadas que quedan dos emisoras. Más vueltas debajo de la antena = más señal pero menos selectividad.', 'Compara día y noche: de noche la onda de cielo trae emisoras lejanas.'], checks: ['Tabla de toma de antena frente a tensión detectada', 'He oído alguna emisora lejana de noche o he explicado por qué no'] }
      ],
      extra: ['Añade un segundo circuito sintonizado acoplado para mejorar la selectividad.', 'Mide la Q de tu bobina con el NanoVNA y compárala con la de una bobina de hilo de Litz.']
    },
    rf_fm: {
      intro: 'Un receptor de FM completo: el chip RDA5807M hace la radio, un ESP32 la gobierna por I²C y tú pones la sintonía con un codificador rotatorio, la pantalla con frecuencia y nivel de señal, y un barrido de la banda.',
      level: 3, hours: 12,
      skills: ['Registros de un chip de radio por I²C', 'RSSI y estéreo', 'Antenas de cuarto de onda en VHF', 'Interfaz con codificador y OLED'],
      bom: ['ESP32 DevKit (3,3 V, igual que el RDA5807M)', 'Módulo RDA5807M en placa adaptadora', 'Pantalla OLED SSD1306 de 128×64 por I²C', 'Codificador rotatorio con pulsador (KY-040)', 'Auriculares de cable (el RDA5807M los mueve directamente) o un PAM8403 con altavoz', 'Hilo de 75 cm como antena', 'Protoboard y cables'],
      phases: [
        { title: 'Fase 1 · Plan', steps: ['Con una radio o el SDR, apunta 5 emisoras de tu zona con su frecuencia.', 'Calcula la antena: λ/4 a 100 MHz son unos 75 cm.', 'Lee el resumen de registros del RDA5807M: 0x02 configuración, 0x03 canal, 0x05 volumen, 0x0A y 0x0B estado y RSSI.'], checks: ['Lista de 5 emisoras con frecuencia', 'Sé qué hace cada registro que voy a usar'] },
        { title: 'Fase 2 · Hablar con el chip', steps: ['Conecta SDA a GPIO21, SCL a GPIO22, 3,3 V y masa.', 'Haz un escaneo I²C: deben aparecer 0x10 y 0x11 (acceso secuencial y aleatorio).', 'Lee el registro 0x00: el byte alto del identificador debe ser 0x58.', 'Carga el programa: arranca, sintoniza 100 MHz e imprime frecuencia, RSSI y estéreo.'], checks: ['El escaneo encuentra el chip', 'Oigo una emisora en los auriculares', 'El monitor muestra la frecuencia leída del chip'],
          code: '#include <Wire.h>\nconst uint8_t RDA = 0x11;               // dirección de acceso aleatorio\n\nvoid escribe(uint8_t reg, uint16_t v) {\n  Wire.beginTransmission(RDA);\n  Wire.write(reg); Wire.write(v >> 8); Wire.write(v & 0xFF);\n  Wire.endTransmission();\n}\nuint16_t lee(uint8_t reg) {\n  Wire.beginTransmission(RDA);\n  Wire.write(reg);\n  Wire.endTransmission(false);\n  Wire.requestFrom(RDA, (uint8_t)2);\n  uint16_t v = Wire.read() << 8;\n  v |= Wire.read();\n  return v;\n}\nvoid sintoniza(float mhz) {                // banda 87–108 MHz, pasos de 100 kHz\n  uint16_t canal = (uint16_t)((mhz - 87.0) * 10 + 0.5);\n  escribe(0x03, (canal << 6) | 0x0010);    // CHAN y bit TUNE\n  delay(100);\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  Wire.begin();                            // ESP32: SDA 21, SCL 22\n  Serial.printf("ID 0x%04X\\n", lee(0x00));\n  escribe(0x02, 0xC003);                   // salida activa, sin silencio, reinicio, encendido\n  delay(50);\n  escribe(0x02, 0xC00D);                   // fin del reinicio, RDS y nuevo método\n  delay(100);\n  uint16_t r5 = lee(0x05);\n  escribe(0x05, (r5 & 0xFFF0) | 0x8);      // volumen 8 de 15\n  sintoniza(100.0);\n}\n\nvoid loop() {\n  uint16_t a = lee(0x0A), b = lee(0x0B);\n  float f = 87.0 + (a & 0x03FF) / 10.0;\n  Serial.printf("%.1f MHz  RSSI %d  %s\\n", f, b >> 9, (a & 0x0400) ? "estereo" : "mono");\n  // Tu parte: lee una frecuencia por Serial y llama a sintoniza()\n  delay(1000);\n}' },
        { title: 'Fase 3 · Interfaz', steps: ['Lee el codificador con interrupciones: cada paso, ±100 kHz; el pulsador cambia entre sintonía y volumen.', 'Muestra en la OLED la frecuencia grande, una barra de RSSI y el indicador de estéreo.', 'Guarda 6 presintonías en la memoria no volátil (biblioteca Preferences).'], checks: ['Sintonizo con el codificador sin saltos ni rebotes', 'Las presintonías sobreviven a un reinicio'] },
        { title: 'Fase 4 · Barrido de banda y antena', steps: ['Programa un barrido de 87,5 a 108 MHz en pasos de 100 kHz guardando el RSSI de cada canal.', 'Dibuja el barrido en la OLED o pásalo al ordenador y compáralo con la cascada del SDR.', 'Repite con antenas de 10, 40 y 75 cm y compara el RSSI de las mismas emisoras.'], checks: ['Barrido completo con las emisoras de mi lista visibles', 'Tabla de RSSI con tres longitudes de antena'] }
      ],
      extra: ['Decodifica el RDS (registros 0x0C a 0x0F) para mostrar el nombre de la emisora.', 'Haz una búsqueda automática con los bits SEEK del registro 0x02.']
    },
    rf_remote: {
      intro: 'Diseña tu propio protocolo de radio de 433 MHz: preámbulo, sincronismo, codificación Manchester, identificador, contador y CRC. Un mando con pulsadores y un receptor que solo obedece a tu mando, con estadísticas de fiabilidad.',
      level: 3, hours: 14,
      skills: ['OOK y receptores con control automático de ganancia', 'Codificación Manchester', 'Tramas, CRC y contadores', 'Ataques de repetición'],
      bom: ['2 Arduino Nano o Uno', 'Emisor FS1000A (OOK, 433,92 MHz)', 'Receptor superheterodino RXB6 o SRX882 (mejor que el superregenerativo XY-MK-5V)', '2 antenas de hilo de 17,3 cm', 'Pulsadores, LEDs y resistencias', 'Batería para el mando', 'RTL-SDR (opcional, muy recomendable)'],
      phases: [
        { title: 'Fase 1 · Mira lo que oye un receptor', steps: ['Conecta la salida de datos del receptor a un pin y al osciloscopio, sin ningún emisor activo.', 'Verás ruido aleatorio: el control automático de ganancia sube al máximo y amplifica el ruido. Por eso hace falta preámbulo y sincronismo.', 'Pulsa un mando de 433 MHz tuyo y mira cómo aparece una señal limpia.', 'Si tienes SDR, ejecuta rtl_433 para ver cómo describe tu mando (anchos de pulso y codificación).'], checks: ['He visto el ruido de salida sin emisión', 'He medido los anchos de pulso de un mando real'] },
        { title: 'Fase 2 · El emisor y la trama', steps: ['Límites legales: ' + LEGAL433 + '.', 'Conecta el FS1000A a 5 V con su antena de 17,3 cm y el pin de datos a D12.', 'Carga el programa: preámbulo de 16 bits, sincronismo de 1,5 ms en alto (imposible en Manchester), 6 bytes de trama y CRC-8.', 'Comprueba con el osciloscopio o el SDR que ves 3 repeticiones de unos 66 ms.', 'Calcula tu ciclo de trabajo en el peor caso de una hora de uso.'], checks: ['La trama se ve completa con las 3 repeticiones', 'He calculado mi ciclo de trabajo y es menor del 10 %'],
          code: 'const int TX = 12, BOTON = 2;\nconst unsigned int MEDIO = 500;           // µs: medio bit a 1000 bit/s\nconst uint16_t ID = 0xB7A1;               // tu identificador\nuint16_t contador = 0;\n\nvoid medioBit(bool nivel) { digitalWrite(TX, nivel); delayMicroseconds(MEDIO); }\nvoid bitManchester(bool b) {              // convenio: 1 = alto→bajo, 0 = bajo→alto\n  if (b) { medioBit(1); medioBit(0); } else { medioBit(0); medioBit(1); }\n}\nvoid byteManchester(uint8_t v) { for (int i = 7; i >= 0; i--) bitManchester((v >> i) & 1); }\nuint8_t crc8(const uint8_t *d, int n) {    // polinomio 0x07\n  uint8_t c = 0;\n  while (n--) { c ^= *d++; for (int i = 0; i < 8; i++) c = (c & 0x80) ? (c << 1) ^ 0x07 : c << 1; }\n  return c;\n}\nvoid enviaTrama(uint8_t boton) {\n  uint8_t t[6];\n  t[0] = ID >> 8; t[1] = ID & 0xFF; t[2] = boton;\n  t[3] = contador >> 8; t[4] = contador & 0xFF; t[5] = crc8(t, 5);\n  for (int i = 0; i < 16; i++) bitManchester(i & 1);   // preámbulo: el receptor ajusta su ganancia\n  digitalWrite(TX, HIGH); delayMicroseconds(3 * MEDIO); // sincronismo: 1,5 ms en alto\n  medioBit(0);\n  for (int i = 0; i < 6; i++) byteManchester(t[i]);\n  digitalWrite(TX, LOW);                   // nunca dejes la portadora encendida\n}\n\nvoid setup() { pinMode(TX, OUTPUT); pinMode(BOTON, INPUT_PULLUP); }\n\nvoid loop() {\n  if (digitalRead(BOTON) == LOW) {\n    contador++;\n    for (int r = 0; r < 3; r++) { enviaTrama(1); delay(20); }\n    delay(300);\n  }\n}' },
        { title: 'Fase 3 · El receptor', steps: ['Conecta el RXB6 a 5 V y su salida a D2 (interrupción).', 'En la interrupción, guarda la duración de cada nivel en un búfer circular.', 'En el bucle, clasifica: ~500 µs corto, ~1000 µs largo, ≥ 1400 µs en alto = sincronismo.', 'Decodifica Manchester tras el sincronismo: un largo cambia el bit; dos cortos lo repiten. Reconstruye 48 bits.', 'Acepta la trama solo si el CRC cuadra, el ID es el tuyo y el contador es mayor que el último aceptado.'], checks: ['El LED del receptor responde a mi mando', 'Las tramas con CRC incorrecto se descartan (lo compruebo cambiando un bit a propósito)'],
          code: 'volatile uint16_t dur[128];\nvolatile uint8_t nivel[128];\nvolatile uint8_t cab = 0;\nvolatile unsigned long ultimo = 0;\n\nvoid alCambiar() {                        // cada flanco: guarda cuánto duró el nivel anterior\n  unsigned long ahora = micros();\n  dur[cab] = ahora - ultimo;\n  nivel[cab] = !digitalRead(2);           // el nivel que acaba de terminar\n  cab = (cab + 1) & 127;\n  ultimo = ahora;\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(2, INPUT);\n  attachInterrupt(digitalPinToInterrupt(2), alCambiar, CHANGE);\n}\n\nvoid loop() {\n  // Tu parte:\n  // 1. Lee del búfer (con una cola propia) y clasifica cada duración: C (≈500), L (≈1000), S (alto ≥ 1400).\n  // 2. Al ver S, arranca el decodificador Manchester y reconstruye 6 bytes.\n  // 3. Comprueba crc8(t, 5) == t[5], el ID y que el contador sea nuevo.\n}' },
        { title: 'Fase 4 · Fiabilidad', steps: ['Añade al receptor un recuento de tramas buenas, malas por CRC y repetidas.', 'Pulsa 100 veces a 5, 20 y 50 m (con paredes en medio en alguna prueba).', 'Repite sin antenas y con antenas, y con 1 o 3 repeticiones por pulsación.'], checks: ['Tabla de éxito a 3 distancias', 'He medido cuánto mejoran las antenas y las repeticiones'] },
        { title: 'Fase 5 · Contra la repetición', steps: ['Con un botón oculto, haz que el mando reenvíe una trama antigua (mismo contador).', 'Comprueba que el receptor la rechaza.', 'Explica la limitación: el contador va en claro y alguien podría inventar uno mayor. La solución real es autenticar la trama con una clave compartida (por ejemplo, un MAC con un cifrado ligero como XTEA).', 'Usa este mando solo para tus dispositivos de baja tensión, nunca para abrir puertas ni conmutar la red eléctrica.'], checks: ['El receptor rechaza las tramas repetidas', 'Sé explicar por qué un contador en claro no basta'] }
      ],
      extra: ['Añade un MAC de 4 bytes calculado con XTEA sobre ID, botón y contador.', 'Haz que el receptor guarde el último contador en EEPROM para que sobreviva a un corte de luz.']
    },
    rf_nrflink: {
      intro: 'Un enlace de telemetría a 2,4 GHz con dos nRF24L01+: un nodo envía datos cada 200 ms, el otro los recibe, y los dos llevan la cuenta de entregas, reintentos y pérdidas para que compares velocidades, potencias, canales y distancias con datos de verdad.',
      level: 3, hours: 10,
      skills: ['Enhanced ShockBurst: ACK y reintentos', 'Tasa de error de paquetes', 'Coexistencia con WiFi', 'Ahorro de energía en la radio'],
      bom: ['2 Arduino Nano o Uno', '2 módulos nRF24L01+ con adaptador de 3,3 V o un condensador de 10 µF en su alimentación', 'Biblioteca RF24', 'Un sensor sencillo (potenciómetro, LDR o BME280)', 'Batería USB para el nodo remoto', 'Multímetro con escala de µA (fase 5)'],
      phases: [
        { title: 'Fase 1 · Cableado y primer contacto', steps: ['SPI: SCK 13, MISO 12, MOSI 11; CE a 9 y CSN a 10. Alimentación a 3,3 V (nunca a 5 V); los pines de datos toleran 5 V.', 'Pon un condensador de 10 µF entre VCC y GND del módulo, pegado a él: los picos de corriente al transmitir causan la mayoría de fallos.', 'Carga el emisor y el receptor y comprueba que radio.begin() devuelve verdadero.'], checks: ['radio.begin() es verdadero en las dos placas', 'El receptor imprime los datos del emisor'] },
        { title: 'Fase 2 · Telemetría con estadística', steps: ['El emisor cuenta envíos confirmados con ACK, fallos y reintentos medios (getARC).', 'El receptor cuenta paquetes perdidos mirando los saltos del número de secuencia.', 'Si mezclas placas distintas (AVR y ESP32), declara la estructura con __attribute__((packed)) para que ocupe lo mismo en las dos.'], checks: ['Cada 100 paquetes veo % entregado y reintentos medios', 'El receptor detecta pérdidas por saltos de secuencia'],
          code: '// EMISOR\n#include <SPI.h>\n#include <RF24.h>\nRF24 radio(9, 10);                        // CE, CSN\nconst byte DIR[6] = "VOLT1";\nstruct Paquete { uint32_t n; int16_t dato; uint16_t vbat; };\nPaquete p = { 0, 0, 0 };\nuint32_t ok = 0, fallos = 0, reint = 0;\n\nvoid setup() {\n  Serial.begin(115200);\n  if (!radio.begin()) { Serial.println("nRF24 no responde"); while (1) {} }\n  radio.setChannel(40);                   // 2440 MHz: elige uno libre con el escáner\n  radio.setDataRate(RF24_250KBPS);\n  radio.setPALevel(RF24_PA_LOW);\n  radio.setRetries(5, 15);                // espera (5 + 1) × 250 µs, hasta 15 reintentos\n  radio.openWritingPipe(DIR);\n  radio.stopListening();\n}\n\nvoid loop() {\n  p.n++;\n  p.dato = analogRead(A0);\n  if (radio.write(&p, sizeof(p))) { ok++; reint += radio.getARC(); } else fallos++;\n  if (p.n % 100 == 0) {\n    Serial.print("Entregados "); Serial.print(100.0 * ok / (ok + fallos), 1);\n    Serial.print(" %  reintentos medios "); Serial.println((float)reint / max(ok, 1UL), 2);\n    ok = fallos = reint = 0;\n  }\n  delay(200);\n}\n\n// RECEPTOR (otra placa): mismo radio.begin(), canal, velocidad y potencia;\n// radio.openReadingPipe(1, DIR); radio.startListening();\n// Tu parte: en loop(), si radio.available(), lee el Paquete, suma\n// p.n - ultimo - 1 a los perdidos cuando haya salto y muestra\n// radio.testRPD() (verdadero si llegó por encima de unos −64 dBm).' },
        { title: 'Fase 3 · Matriz de experimentos', steps: ['Mide a 5, 20 y 50 m (y a través de paredes) con las tres velocidades: 250 kbps, 1 Mbps y 2 Mbps.', 'Repite con potencia mínima y máxima.', 'Desactiva el ACK (setAutoAck(false)) en las dos placas y compara las pérdidas reales sin reintentos.'], checks: ['Tabla con al menos 12 combinaciones', 'He comprobado que 250 kbps llega más lejos y explico por qué (sensibilidad)'] },
        { title: 'Fase 4 · Interferencias', steps: ['Con el escáner del siguiente proyecto, busca un canal ocupado por tu WiFi y otro limpio.', 'Mide la tasa de entrega en ambos mientras descargas un archivo grande por WiFi.', 'Usa solo canales del 1 al 80: por encima de 2483,5 MHz ya no es banda ISM en Europa.'], checks: ['He medido la diferencia entre un canal ocupado y uno libre', 'Mi canal final está entre 1 y 80'] },
        { title: 'Fase 5 · Nodo de batería', steps: ['En el emisor, apaga la radio entre envíos con powerDown() y duerme el microcontrolador.', 'Mide la corriente media con el multímetro y calcula la autonomía con una batería de 2000 mAh.', 'Comprueba que, tras despertar con powerUp(), el primer paquete llega bien (espera unos ms a que arranque el oscilador).'], checks: ['He medido la corriente en reposo y transmitiendo', 'He calculado la autonomía del nodo'] }
      ],
      extra: ['Añade un segundo emisor con otra dirección en otra tubería (pipe) y recibe los dos.', 'Mide la latencia ida y vuelta usando la carga útil del ACK.']
    },
    rf_scanner: {
      intro: 'Convierte un nRF24L01+ en un analizador de ocupación de 2,4 GHz: barre sus 126 canales, detecta dónde hay energía y te enseña tu WiFi, el microondas y los canales de anuncio de Bluetooth.',
      level: 2, hours: 6,
      skills: ['Detector de potencia RPD', 'Canales WiFi y BLE', 'Estadística de ocupación'],
      bom: ['Arduino Nano o Uno', 'Módulo nRF24L01+ con condensador de 10 µF', 'Pantalla OLED SSD1306 (fase 3)', 'Un ESP32 (fase 4, opcional)'],
      phases: [
        { title: 'Fase 1 · El barrido', steps: ['Usa el cableado del proyecto anterior.', 'Carga el programa: 50 barridos de 126 canales, contando cuántas veces el detector RPD supera unos −64 dBm.', 'Cada fila del monitor serie es una foto de la banda: un dígito por canal.'], checks: ['Veo filas de 126 caracteres', 'Encender y apagar el router cambia el dibujo'],
          code: '#include <SPI.h>\n#include <RF24.h>\nRF24 radio(9, 10);\nconst int NC = 126;\nuint8_t cuenta[NC];\n\nvoid setup() {\n  Serial.begin(115200);\n  radio.begin();\n  radio.setAutoAck(false);\n  radio.setDataRate(RF24_1MBPS);\n  radio.startListening();\n  radio.stopListening();\n  Serial.println("Canal 0 = 2400 MHz ... canal 125 = 2525 MHz");\n}\n\nvoid loop() {\n  memset(cuenta, 0, sizeof(cuenta));\n  for (int barrido = 0; barrido < 50; barrido++) {\n    for (int c = 0; c < NC; c++) {\n      radio.setChannel(c);\n      radio.startListening();\n      delayMicroseconds(200);          // deja que el receptor mida\n      radio.stopListening();\n      if (radio.testRPD()) cuenta[c]++;\n    }\n  }\n  for (int c = 0; c < NC; c++) {       // 0–9 según ocupación; punto si no hay nada\n    int n = min(9, cuenta[c] / 5);\n    Serial.print(n ? char(\'0\' + n) : \'.\');\n  }\n  Serial.println();\n}' },
        { title: 'Fase 2 · Interpretar', steps: ['Tu router ocupa unos 20 canales seguidos: el canal WiFi N está centrado en 2407 + 5·N MHz.', 'Pon el microondas a calentar un vaso de agua: verás una mancha ancha cerca de 2450 MHz.', 'Busca los anuncios BLE en los canales 2, 26 y 80 (2402, 2426 y 2480 MHz) con un móvil emparejando.'], checks: ['He identificado el canal WiFi de mi router', 'He visto el microondas', 'He identificado al menos un canal de anuncio BLE'] },
        { title: 'Fase 3 · Cascada en pantalla', steps: ['Dibuja en la OLED una cascada: cada barrido es una fila de píxeles que baja.', 'Añade un pico máximo retenido y un cursor con la frecuencia.'], checks: ['La cascada se actualiza al menos una vez por segundo'] },
        { title: 'Fase 4 · Contrasta', steps: ['Con un ESP32, ejecuta WiFi.scanNetworks() y lista redes, canales y RSSI.', 'Compara con tu escáner: ¿coinciden los canales más ocupados?', 'Recuerda: el detector RPD solo dice “más o menos de −64 dBm”; no es un analizador calibrado.'], checks: ['He comparado los dos métodos', 'Sé explicar las limitaciones del RPD'] }
      ],
      extra: ['Elige automáticamente el canal más limpio para el enlace del proyecto anterior.', 'Guarda una hora de ocupación y haz una gráfica por franjas horarias.']
    },
    rf_rfid: {
      intro: 'Un control de acceso para tu taller o tu armario de herramientas con tarjetas y pegatinas NFC propias: lista blanca, tarjeta maestra, registro de accesos y una cerradura de 12 V. Y una lección honesta sobre lo que no es seguro.',
      level: 3, hours: 12,
      skills: ['Acoplamiento inductivo a 13,56 MHz', 'ISO 14443 y tipos de tarjeta', 'Lista blanca persistente', 'Seguridad real frente a aparente'],
      bom: ['ESP32 DevKit', 'Lector RC522 (MFRC522, SPI, 3,3 V)', 'Tarjetas MIFARE y pegatinas NTAG213 vírgenes, tuyas', 'Cerradura eléctrica de 12 V (de pestillo o solenoide) con diodo de rueda libre', 'MOSFET de nivel lógico (o módulo de relé) y fuente de 12 V', 'Zumbador, LED verde y rojo', 'Módulo RTC DS3231 o conexión WiFi para la hora'],
      phases: [
        { title: 'Fase 1 · Leer y medir el alcance', steps: ['RC522 a 3,3 V. SPI del ESP32: SCK 18, MISO 19, MOSI 23; SDA (SS) a 5 y RST a 22.', 'Carga el programa: imprime la versión del chip y el UID de cada tarjeta.', 'Mide la distancia máxima de lectura con cada tipo de tarjeta.', 'Pon papel de aluminio detrás de una pegatina y repite: el metal desintoniza la antena.'], checks: ['El lector muestra su versión y los UID', 'Tabla de alcance por tipo de tarjeta', 'He comprobado el efecto del metal'],
          code: '#include <SPI.h>\n#include <MFRC522.h>\nMFRC522 lector(5, 22);                    // SS, RST\n\nvoid setup() {\n  Serial.begin(115200);\n  SPI.begin();                            // ESP32: SCK 18, MISO 19, MOSI 23\n  lector.PCD_Init();\n  lector.PCD_DumpVersionToSerial();\n}\n\nvoid loop() {\n  if (!lector.PICC_IsNewCardPresent() || !lector.PICC_ReadCardSerial()) return;\n  String uid;\n  for (byte i = 0; i < lector.uid.size; i++) {\n    if (lector.uid.uidByte[i] < 0x10) uid += \'0\';\n    uid += String(lector.uid.uidByte[i], HEX);\n  }\n  uid.toUpperCase();\n  Serial.println(uid);\n  lector.PICC_HaltA();\n  // Tu parte: busca el UID en la lista blanca y abre o rechaza\n}' },
        { title: 'Fase 2 · Lista blanca y tarjeta maestra', steps: ['Guarda la lista de UID autorizados con la biblioteca Preferences.', 'Una tarjeta maestra entra en modo alta: la siguiente tarjeta queda autorizada (o desautorizada si ya lo estaba).', 'LED verde y pitido corto al aceptar; rojo y pitido largo al rechazar.'], checks: ['Puedo dar de alta y de baja tarjetas sin reprogramar', 'La lista sobrevive a un corte de alimentación'] },
        { title: 'Fase 3 · Registro', steps: ['Añade hora real con el DS3231 (o por NTP si hay WiFi).', 'Guarda cada intento (UID, hora, aceptado o no) en un archivo de LittleFS.', 'Haz una orden por el monitor serie para volcar el registro.'], checks: ['Cada acceso queda registrado con fecha y hora'] },
        { title: 'Fase 4 · La cerradura', steps: ['El MOSFET conmuta los 12 V de la cerradura; diodo de rueda libre en paralelo con ella, cátodo al +.', 'Masa común entre la fuente de 12 V y el ESP32.', 'Abre 3 s y vuelve a cerrar. Deja SIEMPRE una apertura mecánica (llave) y nunca lo uses como única salida de un local.'], checks: ['La cerradura abre 3 s y cierra sola', 'Hay apertura mecánica de emergencia'] },
        { title: 'Fase 5 · Seguridad honesta', steps: ['Investiga por qué un control solo por UID es débil: existen tarjetas con UID reescribible y MIFARE Classic usa un cifrado roto.', 'Mejora: guarda en una NTAG213 un dato secreto protegido con su contraseña (PWD_AUTH) y compruébalo además del UID.', 'Documenta el límite: para seguridad real hacen falta tarjetas con criptografía AES (por ejemplo, NTAG 424 DNA).', 'Lee solo tarjetas tuyas: no leas ni copies tarjetas de otras personas ni de edificios.'], checks: ['Mi sistema comprueba algo más que el UID', 'He escrito qué ataques resiste y cuáles no'] }
      ],
      extra: ['Añade un lector de 125 kHz (RDM6300, por UART) para llaveros EM4100 y compara alcance y seguridad.', 'Envía cada acceso a tu servidor por MQTT (mira la especialidad de IoT).']
    },
    rf_gps: {
      intro: 'Un registrador GPS de bolsillo: lee las tramas NMEA de un módulo u-blox, guarda posición, altitud, satélites y precisión en una microSD, y luego dibuja tus rutas en un mapa. Con experimentos para entender de dónde salen los errores.',
      level: 3, hours: 10,
      skills: ['GNSS y tiempo de primera posición', 'Tramas NMEA y su suma de control', 'Precisión, HDOP y multitrayecto', 'Registro robusto en SD'],
      bom: ['ESP32 DevKit', 'Módulo GNSS u-blox NEO-6M o NEO-M8N con antena cerámica', 'Módulo microSD (SPI) y tarjeta', 'Batería 18650 con cargador protegido y regulador de 3,3 V', 'Pulsador y LED', 'Caja pequeña'],
      phases: [
        { title: 'Fase 1 · NMEA en bruto', steps: ['GPS a 3,3 V; su TX al GPIO16 (RX2) del ESP32 a 9600 baudios.', 'Reenvía todo lo que llega al monitor serie y localiza las tramas GGA y RMC.', 'Comprueba a mano la suma de control de una trama: XOR de todos los caracteres entre $ y *.', 'Mide el tiempo hasta la primera posición en frío (al aire libre) y en caliente.'], checks: ['Identifico GGA y RMC y sus campos', 'He verificado una suma de control a mano', 'He anotado el tiempo de primera posición en frío y en caliente'] },
        { title: 'Fase 2 · Interpretar y medir la precisión', steps: ['Usa TinyGPSPlus para obtener latitud, longitud, altitud, satélites y HDOP.', 'Deja el GPS quieto 30 minutos al aire libre registrando cada segundo.', 'Calcula la dispersión: el radio que contiene la mitad de los puntos (CEP).'], checks: ['He calculado el CEP de mi módulo', 'He visto que la altitud varía más que la posición horizontal'] },
        { title: 'Fase 3 · Registro en SD', steps: ['Guarda una línea CSV por segundo solo cuando la posición sea válida.', 'Llama a flush() cada 10 líneas para no perder datos si se va la batería.', 'Convierte el CSV a GPX y dibuja la ruta en un visor de mapas.'], checks: ['Ruta de al menos 30 minutos dibujada en un mapa', 'Si quito la batería en marcha, pierdo como mucho 10 segundos'],
          code: '#include <TinyGPSPlus.h>\n#include <SD.h>\nTinyGPSPlus gps;\nFile f;\nint lineas = 0;\n\nvoid setup() {\n  Serial.begin(115200);\n  Serial2.begin(9600, SERIAL_8N1, 16, 17);    // GPS: RX, TX\n  if (!SD.begin(5)) { Serial.println("Sin tarjeta SD"); while (true) delay(1000); }\n  f = SD.open("/ruta.csv", FILE_APPEND);\n  f.println("fecha,hora,lat,lon,alt,sats,hdop");\n}\n\nvoid loop() {\n  while (Serial2.available()) gps.encode(Serial2.read());\n  if (gps.location.isUpdated() && gps.location.isValid()) {\n    f.printf("%04d-%02d-%02d,%02d:%02d:%02d,%.6f,%.6f,%.1f,%d,%.1f\\n",\n      gps.date.year(), gps.date.month(), gps.date.day(),\n      gps.time.hour(), gps.time.minute(), gps.time.second(),\n      gps.location.lat(), gps.location.lng(), gps.altitude.meters(),\n      (int)gps.satellites.value(), gps.hdop.hdop());\n    if (++lineas % 10 == 0) f.flush();\n  }\n}' },
        { title: 'Fase 4 · Energía y caja', steps: ['Mide el consumo: GPS buscando, GPS con posición y escritura en SD.', 'Calcula la autonomía con tu batería.', 'Mete todo en la caja con la antena cerámica mirando al cielo y sin metal encima.'], checks: ['Consumo medido y autonomía calculada', 'Funciona dentro de la caja'] },
        { title: 'Fase 5 · Experimentos de error', steps: ['Recorre la misma ruta con el registrador en lo alto de la mochila y en un bolsillo del pantalón.', 'Repite en una calle estrecha con edificios altos y en campo abierto.', 'Compara las trazas: el cuerpo atenúa y los edificios provocan multitrayecto.'], checks: ['Tengo 4 trazas comparadas', 'He explicado al menos dos fuentes de error con mis datos'] }
      ],
      extra: ['Configura el u-blox a 5 Hz con mensajes UBX.', 'Usa el pulso por segundo (PPS) para disciplinar un reloj.']
    },
    rf_ble: {
      intro: 'Dos ESP32: uno anuncia una baliza BLE a potencia fija y el otro mide su RSSI. Calibras el modelo de distancia, compruebas cuánto falla y lo conviertes en un detector de presencia que enciende la luz de tu mesa cuando llegas.',
      level: 3, hours: 8,
      skills: ['Canales de anuncio BLE', 'Modelo log-distancia', 'Filtrado de RSSI', 'Histéresis en la decisión'],
      bom: ['2 ESP32 DevKit', '2 baterías USB', 'Cinta métrica', 'LED o tira de LED de 5 V con MOSFET'],
      phases: [
        { title: 'Fase 1 · La baliza', steps: ['Carga el programa de la baliza: nombre propio, potencia fija de 0 dBm y un anuncio cada 100 ms.', 'Comprueba con una app de escaneo BLE en el móvil que aparece.'], checks: ['La baliza aparece en el móvil con su nombre'],
          code: '#include <BLEDevice.h>\n\nvoid setup() {\n  BLEDevice::init("VOLTIO-B1");\n  BLEDevice::setPower(ESP_PWR_LVL_N0);     // 0 dBm: fija para poder calibrar\n  BLEAdvertising *adv = BLEDevice::getAdvertising();\n  adv->setMinInterval(160);                // 160 × 0,625 ms = 100 ms\n  adv->setMaxInterval(160);\n  adv->start();\n}\n\nvoid loop() { delay(1000); }' },
        { title: 'Fase 2 · El escáner', steps: ['Carga el escáner: filtra por nombre e imprime el RSSI bruto y una media exponencial.', 'Observa cuánto varía el RSSI bruto quieto: los tres canales de anuncio tienen desvanecimientos distintos.'], checks: ['Veo el RSSI bruto y el filtrado', 'He medido la desviación del RSSI bruto en reposo'],
          code: '#include <BLEDevice.h>\n#include <BLEScan.h>\n#include <BLEAdvertisedDevice.h>\nfloat filtrado = -70;\n\nclass AlRecibir : public BLEAdvertisedDeviceCallbacks {\n  void onResult(BLEAdvertisedDevice d) {\n    if (d.haveName() && d.getName() == "VOLTIO-B1") {\n      int r = d.getRSSI();\n      filtrado = 0.8 * filtrado + 0.2 * r;  // media exponencial\n      Serial.printf("%d %.1f\\n", r, filtrado);\n    }\n  }\n};\n\nvoid setup() {\n  Serial.begin(115200);\n  BLEDevice::init("");\n  BLEScan *scan = BLEDevice::getScan();\n  scan->setAdvertisedDeviceCallbacks(new AlRecibir(), true);  // avisa de cada anuncio\n  scan->setActiveScan(false);\n  scan->setInterval(100);\n  scan->setWindow(99);\n}\n\nvoid loop() {\n  BLEDevice::getScan()->start(5, false);\n  BLEDevice::getScan()->clearResults();\n}' },
        { title: 'Fase 3 · Calibrar el modelo', steps: ['Mide la media de 100 anuncios a 1 m: es A, el RSSI de referencia.', 'Mide a 2, 4 y 8 m y ajusta n en RSSI = A − 10·n·log₁₀(d).', 'Estima la distancia con d = 10^((A − RSSI) / (10·n)) en 10 puntos nuevos y calcula el error.'], checks: ['He calculado A y n', 'Tabla de distancia real frente a estimada con su error'] },
        { title: 'Fase 4 · Detector de presencia', steps: ['Decide “cerca” y “lejos” con dos umbrales distintos (histéresis), no con uno.', 'Lleva la baliza en el bolsillo y haz que el escáner encienda la luz de tu mesa al llegar.', 'Mide falsos encendidos y apagados durante una tarde.', 'Usa solo tus balizas: no rastrees móviles ni dispositivos de otras personas.'], checks: ['La luz no parpadea en la frontera', 'He contado los errores de una tarde'] }
      ],
      extra: ['Prueba la PHY codificada de largo alcance en un ESP32-C3 o S3 y compara.', 'Usa tres escáneres y estima la posición en la habitación.']
    },
    rf_lorarange: {
      intro: 'Una prueba de alcance LoRa de verdad: una base fija en tu ventana y un nodo móvil con GPS que envía su posición cada 30 s y recibe confirmación. Al final, un mapa coloreado por RSSI y SNR comparado con tu balance de enlace.',
      level: 4, hours: 16,
      skills: ['Configuración de LoRa (SF, BW, CR, potencia)', 'Ciclo de trabajo en la práctica', 'Balance de enlace previsto frente a medido', 'Mapas con datos de campo'],
      bom: ['2 placas ESP32 con LoRa de 868 MHz (por ejemplo LilyGO T-Beam, que trae GPS, o ESP32 + RFM95W + GPS NEO-6M)', '2 antenas de 868 MHz ajustadas (las del proyecto de antenas)', 'Módulo microSD para el nodo móvil', 'Baterías', 'Ordenador con un visor de mapas (uMap o QGIS)'],
      phases: [
        { title: 'Fase 1 · Balance previsto', steps: ['Límites legales: ' + LEGAL868 + '.', 'Elige la posición de la base y 5 puntos de prueba a distintas distancias.', 'Para cada punto calcula FSPL, potencia recibida y margen con SF7, SF9 y SF12.', 'Mira el perfil del terreno y estima si la zona de Fresnel queda despejada.', 'Plan legal: 868,1 MHz, 14 dBm ERP como máximo y un paquete de 20 bytes con SF9 (≈ 185 ms) cada 30 s es el 0,6 %.'], checks: ['Tabla de margen previsto para 5 puntos y 3 SF', 'Plan de ciclo de trabajo por debajo del 1 %'] },
        { title: 'Fase 2 · Firmware', steps: ['Nodo móvil: lee el GPS, envía “n,lat,lon” cada 30 s y espera la respuesta de la base durante 1,5 s.', 'Base: al recibir, responde con el RSSI y la SNR con que oyó el paquete.', 'El móvil guarda en la SD: posición, RSSI y SNR de ida y de vuelta.', 'Verifica en casa a 1 m con la potencia al mínimo (a toda potencia y tan cerca, el receptor se satura).'], checks: ['Las dos placas intercambian paquetes y respuestas', 'La SD guarda las dos direcciones del enlace'],
          code: '#include <SPI.h>\n#include <LoRa.h>\n#include <TinyGPSPlus.h>\n// ESP32 + RFM95W cableado a mano; en placas LilyGO o Heltec, mira su esquema\nconst int NSS = 18, RST = 14, DIO0 = 26;\nTinyGPSPlus gps;\nuint32_t n = 0, enviado = 0;\n\nvoid setup() {\n  Serial.begin(115200);\n  Serial2.begin(9600, SERIAL_8N1, 34, 12);   // GPS: RX, TX (ajústalos a tu placa)\n  LoRa.setPins(NSS, RST, DIO0);\n  if (!LoRa.begin(868.1E6)) { Serial.println("LoRa no responde"); while (true) delay(1000); }\n  LoRa.setSpreadingFactor(9);\n  LoRa.setSignalBandwidth(125E3);\n  LoRa.setCodingRate4(5);\n  LoRa.setTxPower(14);    // dBm en el conector: resta cables, suma antena, respeta 14 dBm ERP\n  LoRa.enableCrc();\n}\n\nvoid loop() {\n  while (Serial2.available()) gps.encode(Serial2.read());\n  if (millis() - enviado > 30000 && gps.location.isValid()) {\n    enviado = millis(); n++;\n    LoRa.beginPacket();\n    LoRa.print(n); LoRa.print(\',\');\n    LoRa.print(gps.location.lat(), 6); LoRa.print(\',\');\n    LoRa.print(gps.location.lng(), 6);\n    LoRa.endPacket();\n    // Tu parte: espera hasta 1,5 s la respuesta con LoRa.parsePacket(),\n    // lee el RSSI y la SNR de ida que te manda la base, guarda los de vuelta\n    // (LoRa.packetRssi(), LoRa.packetSnr()) y escribe una línea CSV en la SD.\n  }\n}' },
        { title: 'Fase 3 · Salida de campo', steps: ['Instala la base lo más alta posible (ventana alta, sin metal delante).', 'Recorre una ruta que pase por tus 5 puntos y siga más allá hasta perder el enlace.', 'Repite la ruta con SF7 y con SF12 (cuidado: con SF12 un paquete dura ≈ 1,3 s: envía cada 2,5 minutos como mínimo).'], checks: ['Al menos 100 paquetes registrados', 'He encontrado la distancia máxima en dos SF distintos'] },
        { title: 'Fase 4 · Mapa y análisis', steps: ['Importa el CSV en uMap o QGIS y colorea cada punto por RSSI.', 'Compara cada punto de prueba con tu previsión: la diferencia son las pérdidas que no habías contado (edificios, árboles, Fresnel).', 'Mira la SNR: cuando se acerca al límite del SF (−12,5 dB en SF9), empiezan las pérdidas.'], checks: ['Mapa coloreado terminado', 'Tabla previsto frente a medido con la diferencia explicada'] }
      ],
      extra: ['Sube la base a un punto alto con visión directa y repite: compara alcances.', 'Prueba 433 MHz con módulos SX1278 y compara penetración en ciudad.']
    },
    rf_adsb: {
      intro: 'Recibe las señales que emiten los aviones en 1090 MHz con un RTL-SDR y una antena que fabricas y ajustas tú. Verás sus posiciones en un mapa en directo y medirás hasta dónde llega tu estación.',
      level: 3, hours: 10,
      skills: ['Modo S y ADS-B', 'Antena de cuarto de onda a 1 GHz', 'Pérdidas del coaxial en UHF', 'Optimizar ganancia y alcance'],
      bom: ['RTL-SDR con TCXO (por ejemplo RTL-SDR Blog V3 o V4)', 'Raspberry Pi u ordenador con Linux', 'Conector SMA hembra de chasis y alambre de cobre de 1,5 mm²', 'Coaxial corto de buena calidad', 'NanoVNA (un modelo que llegue bien a 1,1 GHz, como el V2, o el H usando armónicos con menos precisión)', 'Opcional: LNA con filtro de 1090 MHz'],
      phases: [
        { title: 'Fase 1 · Primeros aviones', steps: ['Instala un decodificador de ADS-B (dump1090-fa o readsb) siguiendo su documentación.', 'Comprueba el SDR con rtl_test y arranca el decodificador con la antena que traía.', 'Abre el mapa web y cuenta aviones y distancia máxima durante 30 minutos.'], checks: ['Veo aviones en el mapa', 'He anotado aviones simultáneos y alcance máximo con la antena de serie'],
          code: '# Comprueba que el sistema ve el SDR\nrtl_test -t\n# Vista en texto de los aviones recibidos (las opciones cambian entre versiones)\ndump1090-fa --interactive' },
        { title: 'Fase 2 · Antena de plano de tierra', steps: ['λ a 1090 MHz son 27,5 cm: radiante de unos 7,0 cm (empieza en 7,2 cm) soldado al pin central.', 'Cuatro radiales de unos 7 cm en la brida, a 45° hacia abajo.', 'Ajusta con el NanoVNA hasta ROE < 1,5 en 1090 MHz.'], checks: ['ROE < 1,5 a 1090 MHz', 'He anotado la longitud final del radiante'] },
        { title: 'Fase 3 · Instalación', steps: ['Ponla lo más alta posible con horizonte despejado; el cable, lo más corto posible (a 1 GHz un coaxial fino pierde del orden de medio dB por metro).', 'Si el cable es largo, pon el LNA junto a la antena, nunca al lado del receptor.', 'Protege los conectores de la lluvia y nunca trabajes cerca de líneas eléctricas ni en tejados sin seguridad.'], checks: ['La antena está instalada y protegida', 'El alcance ha mejorado respecto a la fase 1'] },
        { title: 'Fase 4 · Optimiza y analiza', steps: ['Prueba varias ganancias fijas y anota mensajes por segundo y alcance máximo.', 'Dibuja el contorno de alcance por direcciones: los huecos son tus obstáculos.', 'Calcula el horizonte radio para un avión a 10 000 m y compáralo con tu máximo.', 'Captura un mensaje en hexadecimal e identifica el formato (DF17), la dirección ICAO y el tipo de mensaje.'], checks: ['Tabla de ganancia frente a mensajes por segundo', 'Contorno de alcance con al menos un obstáculo explicado', 'He decodificado a mano los campos básicos de un mensaje'] }
      ],
      extra: ['Construye una antena colineal coaxial y compárala con el plano de tierra.', 'Comparte tus datos con una red colaborativa de seguimiento de vuelos.']
    },
    rf_meteor: {
      intro: 'Recibe imágenes de la Tierra directamente de un satélite meteorológico en órbita polar con un RTL-SDR, una antena hecha por ti y SatDump. Planificas los pases, grabas, decodificas y montas tus propias imágenes en color.',
      level: 4, hours: 18,
      skills: ['Órbitas polares y predicción de pases', 'Doppler', 'Antenas para polarización circular', 'Modulación digital QPSK y decodificación'],
      bom: ['RTL-SDR con TCXO', 'Ordenador con SatDump y un programa de predicción de pases', 'Varilla o tubo de aluminio y una regleta de conexión (dipolo en V) o tubo de PVC y coaxial (QFH)', 'Coaxial y conectores', 'Opcional: LNA con filtro y filtro de banda de FM (las emisoras de FM saturan el SDR a 137 MHz)', 'NanoVNA'],
      phases: [
        { title: 'Fase 1 · Qué satélite escuchar hoy', steps: ['Los NOAA 15, 18 y 19, que enviaban imágenes analógicas APT, se han retirado (el NOAA-18 en junio de 2025 y los otros dos después): muchos tutoriales antiguos ya no sirven.', 'La alternativa son los Meteor-M rusos, que emiten LRPT digital (QPSK) en torno a 137,1 o 137,9 MHz.', 'Busca en fuentes actualizadas qué Meteor-M está transmitiendo ahora mismo, en qué frecuencia y con qué velocidad de símbolo: cambia con el tiempo.'], checks: ['Sé qué satélite, frecuencia y modo voy a recibir', 'He comprobado que la información es reciente'] },
        { title: 'Fase 2 · La antena', steps: ['Dipolo en V: dos brazos de unos 53 cm (λ/4 a 137 MHz es unos 55 cm, con acortamiento), abiertos 120°, horizontales y orientados norte-sur.', 'Mide con el NanoVNA y ajusta para ROE baja a 137 MHz.', 'Si te animas, construye una QFH: más trabajo, mejor cobertura del cielo.'], checks: ['ROE < 2 a la frecuencia del satélite', 'La antena está orientada y con cielo despejado'] },
        { title: 'Fase 3 · Primer pase', steps: ['Predice un pase con elevación máxima de más de 30°.', 'Configura SatDump en vivo o graba la señal I/Q con la tasa de muestreo recomendada.', 'Durante el pase observa la cascada: la señal se desplaza por el efecto Doppler y la constelación QPSK se “cierra” cuando hay buena señal.'], checks: ['He visto la señal del satélite en la cascada', 'He observado el desplazamiento Doppler'] },
        { title: 'Fase 4 · Decodificar', steps: ['Procesa con el flujo de LRPT del Meteor-M en SatDump.', 'Obtén los canales individuales y una composición en color.', 'Busca la península ibérica en la imagen y orienta la imagen.'], checks: ['Tengo una imagen con costa reconocible', 'He generado al menos una composición en color'] },
        { title: 'Fase 5 · Mejorar con datos', steps: ['Para 5 pases, apunta elevación máxima, SNR media y porcentaje de imagen decodificada.', 'Prueba un cambio cada vez: ubicación de la antena, filtro de FM, LNA.', 'Saca conclusiones con los números, no con impresiones.'], checks: ['Tabla de 5 pases con elevación y SNR', 'He medido el efecto de al menos una mejora'] }
      ],
      extra: ['Nivel experto: HRPT de satélites polares en 1,7 GHz con una parábola con seguimiento.', 'Escucha la Estación Espacial en 145,800 MHz durante sus eventos de SSTV (consulta las fechas).']
    },
    rf_rfi: {
      intro: 'Caza el ruido eléctrico de tu casa: con una radio de onda media de pilas y un SDR localiza cargadores, bombillas LED, adaptadores PLC o fuentes conmutadas que ensucian el espectro, y mide cuánto mejoras con ferritas y sustituciones.',
      level: 2, hours: 5,
      skills: ['Suelo de ruido', 'Interferencias conducidas y radiadas', 'Ferritas y modo común', 'Método sistemático'],
      bom: ['Radio portátil de pilas con onda media (y si puede, onda corta)', 'RTL-SDR (V4 o V3 en muestreo directo para HF) con un hilo largo', 'Ferritas de clip de varios tamaños', 'Libreta y móvil para capturas'],
      phases: [
        { title: 'Fase 1 · Línea base', steps: ['Elige 5 frecuencias libres: una en onda media, dos en HF, una en VHF y otra en 433 MHz.', 'Anota el nivel de ruido del SDR en cada una (misma ganancia siempre) a tres horas distintas.'], checks: ['Tabla de ruido en 5 frecuencias y 3 horas'] },
        { title: 'Fase 2 · Olfatear', steps: ['Sintoniza la radio de onda media entre emisoras y recorre la casa: el zumbido o el raspado sube al acercarte a la fuente.', 'Acerca la radio a cargadores, bombillas LED, el router, el televisor, la placa de inducción.', 'Apunta cada sospechoso y a qué distancia se nota.'], checks: ['Lista de al menos 5 sospechosos con distancia'] },
        { title: 'Fase 3 · Confirmar', steps: ['Desenchufa cada sospechoso de uno en uno y mide la bajada de ruido en el SDR, en dB.', 'Puedes bajar los interruptores del cuadro (sin abrirlo nunca) para aislar zonas; avisa antes en casa.', 'Haz capturas de la cascada antes y después.'], checks: ['Al menos 3 fuentes confirmadas con su bajada en dB', 'Capturas antes y después'] },
        { title: 'Fase 4 · Remediar', steps: ['Pon ferritas de clip en los cables de continua de los cargadores, cerca del aparato, con 2–3 vueltas si caben.', 'Sustituye el peor cargador por uno de calidad y mide de nuevo.', 'Si un vecino te interfiere gravemente, no toques su instalación: habla con él o recurre a la administración de telecomunicaciones.'], checks: ['He medido la mejora de cada remedio en dB'] }
      ],
      extra: ['Monta una antena de cuadro (loop) apantallada para localizar la dirección del ruido.', 'Aplica lo aprendido a tus propios diseños: planos de masa, desacoplo y cables cortos.']
    },
    rf_final: {
      intro: 'El gran proyecto: una estación de telemetría LoRa de largo alcance. Un nodo remoto con sensores, batería y panel solar; una base con antena exterior fabricada y medida por ti; balance de enlace previsto antes de instalar y comparado con semanas de datos reales.',
      level: 5, hours: 50,
      skills: ['Planificación de radioenlaces', 'Antenas fabricadas y medidas', 'Firmware de bajo consumo con control del ciclo de trabajo', 'Dimensionado solar', 'Análisis de datos de campo', 'Documentación técnica'],
      bom: ['2 ESP32 con transceptor LoRa de 868 MHz (mejor SX1262 con TCXO; vale SX1276/RFM95W)', 'Sensor BME280 y divisor de tensión para la batería', 'Batería 18650 o LiFePO4 con cargador solar protegido y panel de 6 V y 1–2 W', 'Caja estanca IP65 con prensaestopas y conector pasamuros N o SMA', 'Coaxial de baja pérdida, lo más corto posible', 'Material para dos antenas (plano de tierra y colineal o Yagi)', 'NanoVNA, RTL-SDR y multímetro', 'Mástil, abrazaderas y material de puesta a tierra'],
      phases: [
        { title: 'Fase 1 · Planificación y balance previsto', steps: ['Límites legales: ' + LEGAL868 + '.', 'Elige los dos emplazamientos y obtén el perfil del terreno entre ellos.', 'Calcula FSPL, radio de Fresnel, abombamiento terrestre y despeje real.', 'Haz el balance completo para SF7 a SF12 y elige el SF más bajo con al menos 15 dB de margen.', 'Hoja legal: frecuencia, ERP con la ganancia de tu antena, tiempo en aire y mensajes por hora por debajo del 1 %.'], checks: ['Documento con perfil, Fresnel y balance por SF', 'Hoja legal firmada por ti con todos los números'] },
        { title: 'Fase 2 · Antenas', steps: ['Construye la antena de la base (colineal o Yagi apuntada) y la del nodo (plano de tierra).', 'Mídelas con el NanoVNA ya en su posición final o en una equivalente.', 'Guarda las curvas de ROE y la carta de Smith de cada una.'], checks: ['ROE < 1,5 en 868,0–868,6 MHz en las dos', 'Curvas guardadas en el informe'] },
        { title: 'Fase 3 · Firmware', steps: ['Nodo: despierta, lee sensores y batería, envía una estructura binaria empaquetada con contador y vuelve a dormir.', 'Lleva la cuenta del tiempo en aire en memoria RTC (sobrevive al sueño profundo) y niégate a transmitir si superarías el 1 %.', 'Base: registra cada paquete con RSSI, SNR y error de frecuencia (packetFrequencyError) y detecta pérdidas por el contador.'], checks: ['El nodo se niega a pasar del 1 % en una prueba acelerada', 'La base detecta paquetes perdidos'],
          code: '// Contabilidad del ciclo de trabajo (ventana fija de una hora; mejora: ventana deslizante)\n// Con sueño profundo, guarda estas variables con RTC_DATA_ATTR y usa un reloj que no se reinicie.\nconst uint32_t VENTANA = 3600000UL;          // ms\nconst uint32_t LIMITE = VENTANA / 100;       // 1 %: 36 000 ms en el aire por hora\nuint32_t usoMs = 0, inicioVentana = 0;\n\nbool puedoTransmitir(uint32_t ahora, uint32_t toaMs) {\n  if (ahora - inicioVentana > VENTANA) { inicioVentana = ahora; usoMs = 0; }\n  return usoMs + toaMs <= LIMITE;\n}\nvoid apunta(uint32_t toaMs) { usoMs += toaMs; }\n\n// Tiempo en aire en ms: cabecera explícita, CRC activo, preámbulo de 8 símbolos\nuint32_t tiempoEnAire(int sf, float bwHz, int bytes, int cr) {   // cr: 1 = 4/5 … 4 = 4/8\n  float tsym = (1 << sf) / bwHz * 1000.0;\n  int de = tsym > 16.0 ? 1 : 0;\n  float num = 8.0 * bytes - 4.0 * sf + 28 + 16;\n  int nPay = 8 + max((int)ceil(num / (4.0 * (sf - 2 * de))) * (cr + 4), 0);\n  return (uint32_t)((8 + 4.25) * tsym + nPay * tsym);\n}' },
        { title: 'Fase 4 · Energía', steps: ['Mide la corriente en sueño, en lectura y en transmisión, y calcula el consumo diario en mAh.', 'Dimensiona batería y panel para 5 días seguidos sin sol en invierno.', 'Comprueba que el cargador corta por temperatura si usas litio en exterior.'], checks: ['Consumo diario medido', 'Autonomía sin sol ≥ 5 días calculada y probada en un ensayo acelerado'] },
        { title: 'Fase 5 · Instalación y campaña de medidas', steps: ['Instala con seguridad: nada de líneas eléctricas cerca, mástil puesto a tierra y trabajo en altura acompañado.', 'Recoge datos al menos dos semanas.', 'Grafica RSSI y SNR en el tiempo y busca relaciones con lluvia, temperatura o la hora.', 'Compara la media medida con el balance previsto: explica cada dB de diferencia.'], checks: ['Al menos 1000 paquetes registrados', 'Gráficas de RSSI y SNR en el tiempo', 'Diferencia previsto frente a medido explicada'] },
        { title: 'Fase 6 · Verificación e informe', steps: ['Con el SDR, comprueba que tus transmisiones caen en 868,1 MHz y que no hay espurias visibles.', 'Comprueba el ciclo de trabajo real a partir de los registros.', 'Redacta un informe: objetivos, diseño, balance, medidas, discrepancias y mejoras.'], checks: ['Espectro de mi emisión capturado y revisado', 'Ciclo de trabajo real por debajo del 1 %', 'Informe completo'] }
      ],
      extra: ['Añade un repetidor intermedio y vuelve a calcular el balance por tramos.', 'Publica los datos en tu servidor con MQTT (especialidad de IoT).']
    }
  });

  /* ===================== TEMARIO ===================== */

  TRACKS.push({
    id: 'radio',
    title: 'Radio y radiofrecuencia',
    short: 'Radio',
    desc: 'Ondas, antenas, decibelios y receptores: entiende la radio por dentro y construye enlaces de verdad con LoRa, nRF24, NFC, GPS y SDR.',
    color: '#8E5BD8',
    icon: 'antenna',
    level: 'Intermedio → avanzado',
    units: [
      { id: 'rf-m1', title: 'Ondas y propagación', desc: 'Qué es una onda de radio, cuánto mide y cómo viaja: espectro, horizonte, Fresnel y multitrayecto.', nodes: [
        L('rf1', 'Qué es una onda de radio', 'wave', ['rf_emwave', 'rf_speed', 'rf_wave', 'rf_polar', 'rf_bands', 'rf_nfc'], [
          I('Una corriente que cambia en un conductor crea un campo magnético que cambia, y este a su vez un campo eléctrico que cambia. Los dos se sostienen mutuamente y se alejan de la antena: es una <b>onda electromagnética</b>.\nNo necesita aire ni cables: viaja también por el vacío.'),
          I('La luz, la radio y los rayos X son lo mismo con distinta frecuencia. En el vacío viajan a <b>c ≈ 299 792 km/s</b>; en el aire, casi igual.\nLa <b>frecuencia</b> (oscilaciones por segundo, en Hz) la impone el emisor.'),
          Q('¿Qué diferencia una onda de radio de la luz visible?', ['Solo la frecuencia (y por tanto la longitud de onda)', 'La radio necesita aire para viajar', 'La luz es más rápida', 'La radio es una forma de sonido'], 'Misma naturaleza electromagnética, distinta frecuencia.', { c: 'rf_emwave' }),
          Q('¿Por qué una antena necesita corriente alterna para emitir?', ['Solo una corriente que cambia crea campos que cambian y se propagan', 'La continua no pasa por el metal', 'La alterna siempre es más potente', 'Por seguridad'], 'Una corriente continua crea un campo fijo que no se aleja.', { c: 'rf_emwave' }),
          I('Los campos eléctrico y magnético son perpendiculares entre sí y a la dirección de avance. La orientación del campo eléctrico es la <b>polarización</b>: una antena vertical emite con polarización vertical.'),
          Q('El emisor tiene una antena vertical. ¿Cómo colocas la del receptor?', ['También vertical', 'Horizontal', 'Da igual', 'Siempre inclinada 45°'], 'Con polarizaciones cruzadas se pierden muchos dB.', { c: 'rf_polar' }),
          I('Muy cerca de la antena (a menos de unas λ/2π) está el <b>campo cercano</b>: energía almacenada que va y vuelve, como en un transformador. Es lo que usan RFID y NFC.\nMás lejos, el <b>campo lejano</b>: una onda que viaja y cuya potencia baja con el cuadrado de la distancia.'),
          Q('Un lector NFC funciona a 3 cm pero no a 1 m. Sobre todo porque…', ['Usa el campo cercano, que cae muchísimo con la distancia', 'La ley lo prohíbe', 'La tarjeta no tiene antena', 'Por la velocidad de la luz'], 'El acoplamiento inductivo solo funciona muy cerca.', { c: 'rf_nfc' }),
          Nm('¿Cuántos milisegundos tarda una onda de radio en recorrer 300 km?', 1, 'ms', '300 km / 300 000 km/s = 0,001 s.', { tol: 0.01, c: 'rf_speed' }),
          Q('La señal de un satélite GPS recorre unos 20 200 km. ¿Cuánto tarda?', ['Unos 67 ms', 'Unos 67 s', 'Unos 6,7 µs', 'Nada: es instantánea'], '20 200 / 300 000 ≈ 0,067 s.', { c: 'rf_speed' }),
          { t: 'match', q: 'Une cada cosa con su frecuencia típica.', pairs: [['Red eléctrica', '50 Hz'], ['Emisora de FM', 'Unos 100 MHz'], ['WiFi', '2,4 GHz'], ['Luz roja', 'Unos 450 THz']], c: 'rf_bands' },
          G('rf_lambda')
        ]),
        L('rf2', 'Longitud de onda y tamaño de antena', 'antenna', ['rf_wave', 'rf_antsize', 'rf_trim'], [
          I('Mientras el emisor hace un ciclo, la onda avanza <b>λ = c / f</b>. Atajo: <b>λ (m) = 300 / f (MHz)</b>.\nMueve la frecuencia y mira cómo cambia el tamaño de las antenas.', { tune: { viz: 'rf_lambda', params: { f: pF(433.92), k: pK() } } }),
          Nm('¿Cuánto mide λ a 433,92 MHz, en centímetros?', 69.1, 'cm', '300 / 433,92 = 0,691 m.', { tol: 0.5, c: 'rf_wave' }),
          G('rf_lambda'),
          TU('Busca la frecuencia cuyo monopolo de cuarto de onda mide unos 8 cm.', 'rf_lambda', { f: pF(100), k: pK(0.95, true) }, { q: 'quarter', min: 0.075, max: 0.09, text: 'Objetivo: λ/4 entre 7,5 y 9 cm', hint: 'λ/4 ≈ 8 cm → λ ≈ 34 cm → f ≈ 870 MHz.' }, '868 MHz: la banda de LoRa en Europa.', { c: 'rf_antsize' }),
          I('Una antena <b>resuena</b> (se comporta como una resistencia pura) cuando su tamaño encaja con λ: dipolo ≈ <b>λ/2</b>, monopolo ≈ <b>λ/4</b> sobre un plano de tierra.\nPor el grosor del conductor y el efecto de los extremos, la longitud real es un 2–5 % menor: es el <b>factor de acortamiento</b>.'),
          G('rf_antLen'),
          Q('Te sale un cuarto de onda de 17,3 cm para 433 MHz. ¿Cómo cortas el hilo?', ['Algo más largo, y luego recortas midiendo', 'Exactamente a 17,3 cm', 'Más corto, y luego lo estiras', 'El doble, por si acaso'], 'Recortar es fácil; alargar, no.', { c: 'rf_trim' }),
          Q('¿Por qué las radios de onda media (≈ 1 MHz) usan una bobina sobre ferrita y no una antena de λ/4?', ['Un cuarto de onda serían unos 75 m: imposible en un aparato de bolsillo', 'Porque la ferrita amplifica', 'Porque la ley lo exige', 'Para tener estéreo'], 'λ = 300 m a 1 MHz.', { c: 'rf_antsize' }),
          G('rf_antLen'),
          { t: 'match', q: 'Une cada frecuencia con su cuarto de onda.', pairs: [['145 MHz', 'Unos 52 cm'], ['433 MHz', 'Unos 17 cm'], ['868 MHz', 'Unos 8,6 cm'], ['2,4 GHz', 'Unos 3 cm']], c: 'rf_antsize' },
          Q('Tu módulo de 868 MHz trae una antena pensada para 915 MHz (EE. UU.). ¿Qué pasa?', ['Resuena algo alta y pierdes algo de señal por desadaptación', 'Se quema el módulo', 'Mejora el alcance', 'No emite nada'], 'No es grave, pero se nota: mejor una antena de tu banda.', { c: 'rf_trim' })
        ]),
        L('rf3', 'El espectro: de LF a microondas', 'wave', ['rf_bands', 'rf_bandtrade', 'rf_wave', 'rf_antsize'], [
          I('La UIT divide el espectro en bandas por décadas:\n<b>LF</b> 30–300 kHz · <b>MF</b> 300 kHz–3 MHz · <b>HF</b> 3–30 MHz · <b>VHF</b> 30–300 MHz · <b>UHF</b> 300 MHz–3 GHz · <b>SHF</b> 3–30 GHz · <b>EHF</b> 30–300 GHz.\nCada década, λ diez veces menor.'),
          { t: 'match', q: 'Une cada banda con un uso.', pairs: [['LF', 'RFID de 125 kHz'], ['MF', 'Radio de onda media'], ['HF', 'Onda corta y NFC'], ['VHF', 'Radio FM y aviación'], ['UHF', 'TDT, LoRa, GPS y WiFi de 2,4 GHz']], c: 'rf_bands' },
          Q('¿En qué banda está el GPS (1575,42 MHz)?', ['UHF', 'SHF', 'VHF', 'HF'], 'Entre 300 MHz y 3 GHz.', { c: 'rf_bands' }),
          Q('NFC trabaja a 13,56 MHz. ¿En qué banda?', ['HF', 'UHF', 'LF', 'MF'], 'Entre 3 y 30 MHz, aunque NFC usa el campo cercano.', { c: 'rf_bands' }),
          I('Cada banda tiene su carácter:\n· <b>Bajas</b>: antenas enormes, poco ancho de banda, gran alcance y buena penetración.\n· <b>Altas</b>: antenas pequeñas, mucho ancho de banda (más datos), visión directa y más atenuación en paredes y lluvia.'),
          Q('¿Por qué el WiFi de 5 GHz atraviesa peor las paredes que el de 2,4 GHz?', ['A más frecuencia, más atenuación en casi todos los materiales de construcción', 'Porque siempre usa menos potencia', 'Porque es más antiguo', 'No es cierto'], 'Regla general: más frecuencia, más pérdidas por obstáculos.', { c: 'rf_bandtrade' }),
          Q('¿Por qué las comunicaciones móviles buscan frecuencias cada vez más altas?', ['Allí hay mucho ancho de banda libre para transmitir más datos', 'Porque llegan más lejos', 'Porque atraviesan mejor las paredes', 'Porque las antenas son más grandes'], 'Más ancho de banda = más bits por segundo.', { c: 'rf_bandtrade' }),
          I('Dentro de cada banda, el espectro se reparte por servicios: radiodifusión, móviles, aeronáutico, marítimo, aficionados, satélite, radar, ISM… Ese reparto, en España, es el <b>CNAF</b>, que verás en el siguiente módulo.'),
          G('rf_lambda'),
          Q('¿A qué frecuencia un dipolo de media onda mide 1 m?', ['Unos 150 MHz', 'Unos 300 MHz', 'Unos 75 MHz', 'Unos 1000 MHz'], 'λ/2 = 1 m → λ = 2 m → 300 / 2 = 150 MHz.', { c: 'rf_antsize' })
        ]),
        L('rf4', 'Propagación: tierra, cielo y visión directa', 'wave', ['rf_prop', 'rf_horizon'], [
          I('Tres caminos principales:\n· <b>Onda de tierra</b> (LF, MF): sigue la curvatura terrestre, cientos de km.\n· <b>Onda ionosférica</b> (HF): se refleja en capas ionizadas a 60–400 km de altura; miles de km.\n· <b>Visión directa</b> (VHF y más): hasta el horizonte.'),
          I('El Sol ioniza la ionosfera: cambia del día a la noche, con las estaciones y con el ciclo solar de unos 11 años.\nDe día, la capa D absorbe la onda media; de noche desaparece y la señal rebota más arriba.'),
          Q('De noche, tu radio de onda media capta emisoras de otros países. ¿Por qué?', ['Desaparece la capa D que de día absorbe la onda media y la señal rebota más arriba', 'Las emisoras suben la potencia', 'Porque hace más frío', 'Porque hay menos tráfico'], 'La propagación ionosférica cambia con el Sol.', { c: 'rf_prop' }),
          I('En VHF y más arriba manda el horizonte. La atmósfera curva un poco las ondas y el <b>horizonte radio</b> queda en unos <b>4,12·√h km</b>, con h en metros.\nEntre dos antenas: <b>4,12·(√h₁ + √h₂)</b>.'),
          Nm('Una antena está a 9 m de altura. ¿Horizonte radio en km?', 12.36, 'km', '4,12 × √9 = 4,12 × 3.', { tol: 0.3, c: 'rf_horizon' }),
          G('rf_horizon'),
          Q('¿Por qué un receptor ADS-B en un tejado oye aviones a más de 300 km?', ['Un avión a 10 000 m tiene un horizonte de unos 400 km', 'Porque los aviones emiten con un megavatio', 'Por la ionosfera', 'Por la onda de tierra'], '4,12 × √10 000 ≈ 412 km.', { c: 'rf_horizon' }),
          G('rf_horizon'),
          Q('Un día de verano oyes emisoras de FM de otro país a 1500 km. ¿Qué ha pasado?', ['Propagación anómala: capas ionizadas esporádicas o conductos en la troposfera', 'Tu radio ha mejorado', 'Has subido la antena', 'Es imposible'], 'La “esporádica E” y los conductos troposféricos alargan la VHF de vez en cuando.', { c: 'rf_prop' }),
          { t: 'match', q: 'Une cada caso con su camino principal.', pairs: [['Onda media de día', 'Onda de tierra'], ['Onda corta a otro continente', 'Rebote ionosférico'], ['LoRa a 868 MHz', 'Visión directa'], ['GPS', 'Visión directa desde el espacio']], c: 'rf_prop' }
        ]),
        L('rf5', 'Fresnel, obstáculos y multitrayecto', 'wave', ['rf_fresnel', 'rf_multipath', 'rf_obstacle'], [
          I('La energía viaja dentro de un elipsoide alrededor de la línea de visión: la <b>primera zona de Fresnel</b>. Su radio en el centro: <b>r ≈ 8,66·√(d / f)</b>, con d en km y f en GHz.\nPara no perder señal, despeja al menos el <b>60 %</b>.', { tune: { viz: 'rf_fresnel', params: FRES } }),
          TU('Enlace de 5 km a 868 MHz con un edificio de 12 m en el centro. ¿A qué altura pones las dos antenas para despejar el 60 %?', 'rf_fresnel', { d: { val: 5, fixed: true }, f: { val: 868, fixed: true }, h: { label: 'Altura de las antenas', val: 10, min: 2, max: 60, step: 1, unit: 'm', dec: 0 }, obs: { val: 12, fixed: true } }, { q: 'ratio', min: 0.6, max: 100, text: 'Objetivo: despejar ≥ 60 % de la zona de Fresnel', hint: 'Obstáculo + abombamiento terrestre + 0,6 × radio de Fresnel.' }, 'Unos 25 m: el alcance se gana con altura, no con potencia.', { c: 'rf_fresnel' }),
          G('rf_fresnel'),
          Q('¿Por qué un enlace LoRa a ras de suelo llega mucho menos que uno entre dos tejados?', ['El suelo y lo que hay sobre él invaden la zona de Fresnel', 'Las antenas bajas emiten menos potencia', 'El aire es más denso abajo', 'La ley limita la altura'], 'Con antenas a 1–2 m, la zona de Fresnel de unos km queda medio enterrada.', { c: 'rf_fresnel' }),
          I('Obstáculos: una pared de ladrillo puede costar 5–15 dB; hormigón armado o metal, mucho más. Los árboles con hojas atenúan sobre todo por encima de 1 GHz. El cuerpo humano es casi todo agua y a 2,4 GHz absorbe mucho.\nLas cifras varían muchísimo: <b>mídelas</b>.'),
          Q('Llevas el móvil en el bolsillo trasero y el reloj BLE pierde la conexión al girarte. ¿Por qué?', ['Tu cuerpo, casi todo agua, atenúa mucho los 2,4 GHz', 'El BLE no funciona en movimiento', 'El WiFi interfiere siempre', 'Por la polarización del pantalón'], 'Somos un buen absorbente de microondas.', { c: 'rf_obstacle' }),
          I('<b>Multitrayecto</b>: además del camino directo llegan reflejos en paredes, suelo y coches, con retrasos distintos. Se suman en fase o en contrafase: mueves el receptor media λ y la señal puede caer 20 dB. Es el <b>desvanecimiento rápido</b>.'),
          Nm('¿Cada cuántos centímetros se repiten los nulos de multitrayecto a 2,44 GHz (media λ)?', 6.15, 'cm', 'λ = 300 / 2440 ≈ 12,3 cm; la mitad, unos 6,1 cm.', { tol: 0.3, c: 'rf_multipath' }),
          Q('¿Qué hacen los routers con varias antenas contra el desvanecimiento?', ['Diversidad: usan la antena o la combinación que mejor recibe en cada momento', 'Transmiten más fuerte', 'Cambian de banda', 'Nada'], 'Es raro que dos antenas separadas estén en un nulo a la vez.', { c: 'rf_multipath' }),
          Q('El RSSI de un receptor quieto cambia cuando alguien camina por la habitación. ¿Por qué?', ['La persona cambia los reflejos y la suma de caminos', 'La persona emite RF', 'El receptor se calienta', 'Se mueve el aire'], 'Cambia el multitrayecto.', { c: 'rf_multipath' }),
          G('rf_fresnel')
        ]),
        PRJ('rf-p1', 'Proyecto: la velocidad de la luz en tu cocina', 'rf_microwave')
      ] },

      { id: 'rf-m2', title: 'Espectro, ley y seguridad', desc: 'Quién reparte el espectro, qué puedes transmitir sin licencia, la licencia de radioaficionado y cómo no hacerte daño con la RF.', nodes: [
        L('rf6', 'El espectro es un recurso público', 'shield', ['rf_legal', 'rf_eirp'], [
          I('El espectro es finito y lo comparte todo el mundo: si dos emisores usan la misma frecuencia en el mismo lugar, se interfieren. Por eso se regula a nivel mundial, europeo y nacional.'),
          I('Las capas:\n· <b>UIT</b>: Reglamento de Radiocomunicaciones (Europa es la Región 1).\n· <b>CEPT</b>: armonización europea; la recomendación <b>ERC 70-03</b> para dispositivos de corto alcance.\n· <b>UE</b>: decisiones de armonización y la Directiva de Equipos Radioeléctricos (RED).\n· <b>España</b>: el CNAF.'),
          { t: 'order', q: 'Ordena de lo más general a lo más concreto.', items: ['UIT: Reglamento de Radiocomunicaciones', 'CEPT: recomendaciones como la ERC 70-03', 'UE: decisiones de armonización y Directiva RED', 'España: CNAF y sus notas nacionales'], e: 'Cada nivel concreta el anterior.', c: 'rf_legal' },
          I('El <b>CNAF</b> (Cuadro Nacional de Atribución de Frecuencias) dice, para cada tramo, qué servicios lo usan, con <b>notas nacionales (UN)</b> que detallan usos y condiciones, como los dispositivos de corto alcance. Se actualiza por orden ministerial: consulta siempre la versión vigente.'),
          Q('¿Dónde compruebas si en España puedes usar un aparato en 869,5 MHz y con qué potencia?', ['En el CNAF vigente y sus notas, junto a la ERC 70-03', 'En la caja del aparato', 'En un foro', 'En la web de otro país'], 'La fuente oficial manda.', { c: 'rf_legal' }),
          I('<b>Uso común</b>: las bandas ISM y de corto alcance se usan sin licencia ni pago si el equipo cumple las condiciones técnicas. A cambio, <b>no tienes protección</b> frente a interferencias y no debes causar interferencias perjudiciales.\nOtras bandas (telefonía, radiodifusión) exigen concesión.'),
          Q('Tu sensor de 868 MHz sufre interferencias de un aparato legal del vecino. ¿Qué derecho tienes?', ['Ninguno especial: en uso común se aceptan las interferencias', 'Exigir que lo apague', 'Subir tu potencia por encima del límite', 'Interferirle tú también'], 'Es el precio de no necesitar licencia.', { c: 'rf_legal' }),
          I('Para venderse en la UE, un equipo de radio lleva marcado <b>CE</b>: el fabricante declara que cumple las normas armonizadas (EN 300 220 por debajo de 1 GHz, EN 300 328 a 2,4 GHz…). Si lo modificas (antena de más ganancia, amplificador), esa conformidad puede dejar de valer.'),
          Q('Cambias la antena de un módulo certificado por una Yagi de 10 dBi para transmitir. ¿Qué ocurre?', ['Puedes superar la potencia radiada permitida: el certificado ya no te cubre', 'Nada: el módulo está certificado', 'Ahorras energía', 'Solo afecta a la recepción'], 'El límite es de potencia radiada, y la antena la multiplica.', { c: 'rf_eirp' }),
          Q('¿Quién vigila el espectro y atiende las interferencias en España?', ['La inspección de telecomunicaciones de la administración del Estado', 'La policía municipal', 'La compañía eléctrica', 'Nadie'], 'Tiene equipos de medida y puede sancionar.', { c: 'rf_legal' })
        ]),
        L('rf7', 'Bandas libres en Europa: ISM y SRD', 'shield', ['rf_srd', 'rf_duty', 'rf_eirp'], [
          I('Las bandas de uso común que más usarás: <b>433,05–434,79 MHz</b>, <b>863–870 MHz</b> (dividida en sub-bandas), <b>2400–2483,5 MHz</b> y <b>5725–5875 MHz</b>. Y las inductivas de 125 kHz y 13,56 MHz para RFID y NFC.'),
          I('<b>433 MHz</b>: unos 10 mW PRA con ciclo de trabajo limitado (típicamente ≤ 10 %). Está dentro de la banda de radioaficionados de 70 cm, así que no tiene protección ninguna.'),
          I('<b>868 MHz</b>: cada sub-banda tiene sus reglas (ERC 70-03). Ejemplos habituales:\n· 868,0–868,6 MHz: 25 mW PRA, ≤ 1 %.\n· 868,7–869,2 MHz: 25 mW PRA, ≤ 0,1 %.\n· 869,4–869,65 MHz: 500 mW PRA, ≤ 10 %.\nPueden cambiar: comprueba siempre la norma vigente.'),
          Q('Quieres enviar muchos mensajes por hora con LoRa a 25 mW. ¿Qué sub-banda da más tiempo de aire?', ['869,4–869,65 MHz, con un 10 %', '868,7–869,2 MHz, con un 0,1 %', '868,0–868,6 MHz, con un 1 %', 'Todas igual'], 'El 10 % son 360 s por hora.', { c: 'rf_duty' }),
          I('<b>PRA (ERP)</b> se refiere a un dipolo; <b>PIRE (EIRP)</b>, a una antena isotrópica. Como el dipolo tiene 2,15 dBi: <b>PIRE = PRA + 2,15 dB</b>.\nEn 2,4 GHz el límite habitual para WiFi y BLE es <b>100 mW PIRE</b> (20 dBm).'),
          G('rf_erp'),
          Q('A 2,4 GHz, tu módulo da 20 dBm y le pones una antena de 6 dBi. ¿Cumples los 100 mW PIRE?', ['No: son 26 dBm PIRE, unos 400 mW', 'Sí: el módulo da 100 mW', 'Sí: la antena no cuenta', 'Depende del canal'], 'PIRE = potencia − cables + ganancia de la antena.', { c: 'rf_eirp' }),
          I('<b>Ciclo de trabajo</b>: porcentaje del tiempo que transmites, medido sobre una hora. 1 % = 36 s cada hora.\nEn algunas sub-bandas hay una alternativa: escuchar antes de transmitir (LBT) con salto de frecuencia (AFA).'),
          G('rf_duty'),
          G('rf_duty'),
          { t: 'match', q: 'Une cada banda con su condición típica.', pairs: [['433,05–434,79 MHz', '10 mW PRA'], ['868,0–868,6 MHz', '25 mW PRA y 1 %'], ['869,4–869,65 MHz', '500 mW PRA y 10 %'], ['2400–2483,5 MHz', '100 mW PIRE']], c: 'rf_srd' },
          Q('Un walkie PMR446 sin licencia. ¿Qué puedes hacer con él?', ['Usarlo tal cual viene: 0,5 W PRA y antena fija', 'Ponerle una antena exterior de más ganancia', 'Subirle la potencia a 5 W', 'Usarlo en 433 MHz'], 'PMR446 es de uso libre solo con equipos homologados sin modificar.', { c: 'rf_srd' })
        ]),
        L('rf8', 'Radioaficionados y qué se puede escuchar', 'antenna', ['rf_ham', 'rf_ethics'], [
          I('El <b>servicio de aficionados</b> es un servicio de radiocomunicación para la autoformación, la experimentación técnica y la intercomunicación, sin ánimo de lucro. Con licencia puedes transmitir con mucha más potencia en muchas bandas, construir tus equipos y hablar con todo el mundo.'),
          I('En España, en líneas generales: superas un examen oficial (basado en el temario europeo armonizado HAREC: electrónica, radio, normativa y operación) y obtienes la autorización y un <b>indicativo</b> (EA, EB, EC… con un número de zona).\nConvocatorias, tasas y detalles los publica la administración de telecomunicaciones: consúltalos antes.'),
          Q('¿Qué necesitas para transmitir en la banda de 2 m (144–146 MHz)?', ['Autorización de radioaficionado con indicativo', 'Nada: es banda libre', 'Solo un equipo con marcado CE', 'Ser mayor de edad'], 'Es una banda de aficionados, no de uso común.', { c: 'rf_ham' }),
          Q('¿Qué no está permitido en el servicio de aficionados?', ['Usarlo con fines comerciales o para emitir publicidad', 'Construir tus propios equipos', 'Contactar con otros países', 'Experimentar con antenas'], 'Sin ánimo de lucro.', { c: 'rf_ham' }),
          I('Escuchar: la afición recibe emisiones dirigidas al público (radiodifusión), radioaficionados, balizas, satélites meteorológicos y señales de posición de aviones (ADS-B) o barcos (AIS), que se emiten precisamente para que cualquiera las reciba.'),
          I('Las comunicaciones privadas están protegidas por el <b>secreto de las comunicaciones</b>: no intentes interceptarlas a propósito, descifrarlas ni difundir su contenido. Ante la duda, no lo hagas.'),
          Q('Con tu SDR captas por casualidad una conversación privada. ¿Qué haces?', ['Sigues buscando otra cosa: no la grabas ni la difundes', 'La grabas y la publicas', 'Intentas descifrar la parte cifrada', 'La compartes en un foro'], 'El secreto de las comunicaciones protege a esas personas.', { c: 'rf_ethics' }),
          I('Nunca: <b>inhibidores</b> (prohibidos para particulares), transmisores caseros en la banda de FM comercial, amplificar equipos de uso común o transmitir en bandas de aviación, emergencias o telefonía. Son infracciones graves y pueden poner vidas en peligro.'),
          Q('Un amigo quiere un inhibidor para que su vecino no use el WiFi. ¿Qué le dices?', ['Es ilegal y además bloquearía otros servicios, incluso emergencias', 'Es legal si es pequeño', 'Es legal en tu propia casa', 'Solo es ilegal en 5 GHz'], 'Un inhibidor no distingue a quién molesta.', { c: 'rf_ethics' }),
          { t: 'match', q: 'Une cada actividad con su situación.', pairs: [['Escuchar emisoras de FM', 'Libre'], ['Recibir ADS-B de aviones', 'Afición habitual'], ['Transmitir en 144 MHz', 'Con licencia de radioaficionado'], ['Usar un inhibidor', 'Prohibido']], c: 'rf_ham' }
        ]),
        L('rf9', 'Seguridad con RF', 'shield', ['rf_safety', 'rf_inprot'], [
          I('El efecto principal de la RF en el cuerpo es el <b>calentamiento</b>. Los límites de exposición del público en España (Real Decreto 1066/2001, basado en recomendaciones europeas) quedan muy por encima de lo que emite un módulo de unos mW: tus proyectos de este curso son inocuos en ese sentido.'),
          I('Lo peligroso son las potencias altas: emisores de decenas o cientos de vatios pueden causar quemaduras profundas al tocar la antena o estar muy cerca. Los ojos son especialmente sensibles a las microondas: nunca mires dentro de una antena o guía de onda con un emisor de potencia activo.'),
          Q('¿Cuál es el riesgo real de un módulo LoRa de 25 mW?', ['Para el cuerpo, prácticamente ninguno: el riesgo está en la batería y la instalación', 'Quemaduras', 'Daños en los ojos a 1 m', 'Calentar la habitación'], 'Son milivatios; un móvil emite bastante más.', { c: 'rf_safety' }),
          I('El microondas de la cocina: <b>nunca lo abras</b>. Dentro hay un transformador de alta tensión y un condensador que puede guardar una carga mortal de miles de voltios incluso desenchufado. Y nunca lo enciendas vacío.'),
          Q('Quieres sacar el magnetrón de un microondas viejo. ¿Qué haces?', ['No lo desmontas: alta tensión mortal incluso desenchufado', 'Lo desmontas desenchufado, sin más', 'Lo desmontas con guantes de cocina', 'Lo enchufas para ver si funciona'], 'No compensa: es de lo más peligroso que hay en una casa.', { c: 'rf_safety' }),
          I('Las antenas exteriores matan más por la electricidad que por la RF: cada año hay accidentes al tocar líneas eléctricas mientras se monta un mástil. Distancia de seguridad amplia, nunca con viento, nunca solo en un tejado y con arnés.'),
          Q('Vas a montar un mástil de 6 m en el jardín y a 5 m pasa un cable eléctrico aéreo. ¿Qué haces?', ['Cambiar de sitio: si cae, puede tocar el cable', 'Montarlo con guantes', 'Montarlo deprisa', 'Montarlo de noche'], 'Distancia mayor que la altura del mástil, siempre.', { c: 'rf_safety' }),
          I('Rayos y estática: un mástil exterior se pone a tierra, el coaxial lleva protección contra sobretensiones y, con tormenta, se desconectan los equipos. Las antenas largas acumulan estática que puede dañar receptores (y dar calambres).'),
          Q('Se acerca una tormenta y la antena de hilo de 20 m de tu galena está conectada. ¿Qué haces?', ['Desconectarla y unirla a la toma de tierra exterior', 'Escuchar los truenos', 'Subir el volumen', 'Nada: la galena no tiene pilas'], 'Una descarga cercana induce tensiones enormes en un hilo largo.', { c: 'rf_safety' }),
          I('Y el equipo: no transmitas sin antena o carga (la potencia reflejada puede romper el amplificador de salida). El SDR y el NanoVNA no aguantan señales fuertes en su entrada: nunca los conectes directamente a la salida de un emisor.'),
          Q('Quieres ver la señal de tu emisor de 433 MHz en el SDR. ¿Cómo lo haces?', ['En el aire a cierta distancia, o por cable a través de un atenuador adecuado', 'Directamente por cable', 'Con un cable más largo', 'Uniendo las dos antenas'], 'Unos pocos mW directos pueden dañar la entrada del SDR.', { c: 'rf_inprot' })
        ]),
        PRJ('rf-p2', 'Proyecto: auditoría de las radios de tu casa', 'rf_audit')
      ] },

      { id: 'rf-m3', title: 'Decibelios y balance de enlace', desc: 'dBm, ganancias y pérdidas, ruido térmico, sensibilidad y la gran cuenta: ¿llega o no llega?', nodes: [
        L('rf10', 'dB y dBm', 'gauge', ['rf_db', 'rf_dbratio'], [
          I('En RF las potencias van de vatios a fracciones de femtovatio: más de 18 órdenes de magnitud. Con decibelios se manejan con números de dos o tres cifras.\n<b>dBm</b>: decibelios respecto a 1 mW. <b>0 dBm = 1 mW</b>.', { tune: { viz: 'rf_dbm', params: { P: { label: 'Potencia', val: 0, min: -140, max: 80, step: 1, unit: 'dBm', dec: 0 } } } }),
          I('<b>dBm = 10·log₁₀(P / 1 mW)</b>.\nReglas de bolsillo: +10 dB ×10, +3 dB ×2, −3 dB la mitad.\n<b>dBW</b> se refiere a 1 W: dBW = dBm − 30.'),
          G('rf_dbm2mw'),
          G('rf_mw2dbm'),
          TU('Pon la potencia máxima de la sub-banda 868,0–868,6 MHz: 25 mW.', 'rf_dbm', { P: { label: 'Potencia', val: -20, min: -140, max: 80, step: 1, unit: 'dBm', dec: 0 } }, { q: 'mw', min: 24, max: 26, text: 'Objetivo: 25 mW', hint: '10 dBm son 10 mW; +3 dB es ×2; +4 dB es ×2,5.' }, '14 dBm ≈ 25 mW.', { c: 'rf_db' }),
          G('rf_dbratio'),
          Q('Un receptor LoRa capta −120 dBm. ¿Cuántos vatios son?', ['10⁻¹⁵ W, un femtovatio', '10⁻¹² W', '10⁻¹⁸ W', '120 µW'], '−120 dBm = −150 dBW = 10⁻¹⁵ W.', { c: 'rf_db' }),
          Nm('¿Cuántos dBW son 30 dBm?', 0, 'dBW', '30 dBm = 1 W = 0 dBW.', { c: 'rf_db' }),
          I('<b>dB</b> es una relación (ganancia o pérdida); <b>dBm</b>, un nivel absoluto. Se puede sumar dBm + dB, pero sumar dos dBm no tiene sentido: dos señales de 0 dBm juntas son 2 mW, es decir, unos 3 dBm.'),
          Q('Dos emisores independientes de 10 dBm cada uno. ¿Potencia total?', ['13 dBm', '20 dBm', '10 dBm', '100 dBm'], '10 mW + 10 mW = 20 mW ≈ 13 dBm.', { c: 'rf_dbratio' }),
          G('rf_dbm2mw')
        ]),
        L('rf11', 'Ganancias y pérdidas en cadena', 'gauge', ['rf_chain', 'rf_eirp', 'rf_dbratio', 'rf_pathlaw'], [
          I('Una cadena de RF: emisor → conectores → cable → antena → (aire) → antena → cable → receptor. En dB todo se suma: ganancias con +, pérdidas con −.'),
          Q('20 dBm, un cable de 2 dB y una antena de 3 dBi. ¿PIRE?', ['21 dBm', '25 dBm', '15 dBm', '60 dBm'], '20 − 2 + 3 = 21 dBm.', { c: 'rf_chain' }),
          G('rf_chain'),
          I('<b>dBi</b>: ganancia respecto a la antena isotrópica ideal. <b>dBd</b>: respecto a un dipolo. <b>dBi = dBd + 2,15</b>.\nDesconfía de antenas que prometen 9 dBi en un palito de 10 cm: la ganancia exige tamaño o directividad.'),
          Nm('Una antena de 5 dBd. ¿Cuántos dBi?', 7.15, 'dBi', '5 + 2,15.', { tol: 0.05, c: 'rf_eirp' }),
          G('rf_erp'),
          Q('Coaxial fino de 0,5 dB/m y 6 m entre el módulo y la antena. ¿Qué haces?', ['Acortarlo o usar uno de menos pérdida: pierdes 3 dB, la mitad', 'Nada: son pocos dB', 'Subir la potencia por encima del límite', 'Usar una antena más pequeña'], '3 dB es la mitad de la potencia.', { c: 'rf_dbratio' }),
          G('rf_chain'),
          I('El cable pierde en los dos sentidos: lo que pierde al transmitir también lo pierde al recibir. 3 dB de cable en cada extremo son 6 dB del enlace.'),
          Q('3 dB de cable en el emisor y otros 3 dB en el receptor. En espacio libre, ¿cuánto alcance pierdes?', ['La mitad', 'Un 6 %', 'Nada', 'Una cuarta parte'], '6 dB = la mitad de distancia en espacio libre.', { c: 'rf_pathlaw' })
        ]),
        L('rf12', 'Pérdidas en espacio libre', 'wave', ['rf_fspl', 'rf_pathlaw'], [
          I('Un emisor isotrópico reparte su potencia sobre una esfera de superficie 4πd²: la densidad cae con 1/d². La antena receptora recoge según su área efectiva, que para una ganancia dada es proporcional a λ².\nJuntando: <b>FSPL = (4πd / λ)²</b>.'),
          I('En dB, la versión práctica:\n<b>FSPL (dB) = 20·log₁₀(d en km) + 20·log₁₀(f en MHz) + 32,44</b>'),
          Nm('Pérdidas en espacio libre a 1 km y 868 MHz, en dB.', 91.2, 'dB', '0 + 58,8 + 32,44.', { tol: 0.5, c: 'rf_fspl' }),
          G('rf_fspl'),
          G('rf_distx'),
          Q('Si el aire no “frena” más las frecuencias altas, ¿por qué FSPL crece con la frecuencia?', ['Una antena de la misma ganancia es más pequeña a más frecuencia y recoge menos', 'Porque el aire absorbe más', 'Porque la ley lo exige', 'Porque la luz va más lenta'], 'Viene del área efectiva, proporcional a λ². Con antenas del mismo tamaño físico, más frecuencia da más ganancia y lo compensa.', { c: 'rf_fspl' }),
          G('rf_fspl'),
          I('La realidad no es espacio libre. El modelo <b>log-distancia</b> usa un exponente n: <b>PL(d) = PL(d₀) + 10·n·log(d / d₀)</b>.\nn = 2 en espacio libre; del orden de 2,7–3,5 en ciudad y 3–5 dentro de edificios. Son orientativos: mide los tuyos.'),
          Q('Con n = 3, ¿cuánto pierdes al doblar la distancia?', ['Unos 9 dB', '6 dB', '3 dB', '12 dB'], '10 × 3 × log(2) ≈ 9 dB.', { c: 'rf_pathlaw' }),
          G('rf_distx')
        ]),
        L('rf13', 'Ruido, figura de ruido y sensibilidad', 'gauge', ['rf_noise', 'rf_sens', 'rf_lorasnr'], [
          I('Los electrones de cualquier conductor se agitan con la temperatura y generan <b>ruido térmico</b>: P = k·T·B. A temperatura ambiente, <b>−174 dBm por cada hercio</b> de ancho de banda.'),
          Nm('Ruido térmico en 1 MHz de ancho de banda (sin el receptor), en dBm.', -114, 'dBm', '−174 + 10·log(10⁶) = −174 + 60.', { tol: 0.5, c: 'rf_noise' }),
          G('rf_noise'),
          I('La <b>figura de ruido (NF)</b> dice cuántos dB empeora el receptor la relación señal/ruido. Un buen LNA tiene menos de 1 dB; un receptor integrado barato, 6–10 dB.\nEn una cadena manda el <b>primer bloque</b> (fórmula de Friis).'),
          Q('Una antena de ADS-B tiene 10 m de cable hasta el receptor. ¿Dónde pones el LNA?', ['Junto a la antena', 'Junto al receptor', 'A mitad de cable', 'No hace falta nunca'], 'Antes de las pérdidas del cable.', { c: 'rf_noise' }),
          I('<b>Sensibilidad</b>: la señal mínima que el receptor demodula bien.\n<b>Sensibilidad = −174 + 10·log(BW) + NF + SNR mínima</b>.\nPara mejorarla: menos ancho de banda, menos ruido propio o una modulación que tolere menos SNR.'),
          G('rf_sens'),
          Q('El nRF24L01+ es unos 9 dB más sensible a 250 kbps que a 1 Mbps (−94 frente a −85 dBm). ¿Por qué?', ['Menos velocidad necesita menos ancho de banda y entra menos ruido', 'Transmite más fuerte', 'Usa otra antena', 'Por el canal'], 'Velocidad y sensibilidad están reñidas.', { c: 'rf_sens' }),
          I('<b>SNR</b> (relación señal/ruido) en dB = señal − ruido. LoRa demodula con SNR negativa (hasta −20 dB con SF12) gracias al ensanchado: reparte cada bit en muchos chips y luego los vuelve a juntar.'),
          G('rf_noise'),
          Q('Un paquete LoRa llega con RSSI de −125 dBm y SNR de −8 dB. ¿Qué significa?', ['La señal está 8 dB por debajo del ruido y aun así se ha recibido', 'Está 8 dB por encima del ruido', 'El paquete está corrupto', 'El RSSI está mal'], 'Normal en LoRa con SF altos.', { c: 'rf_lorasnr' })
        ]),
        L('rf14', 'Balance de enlace y margen', 'gauge', ['rf_budget', 'rf_eirp', 'rf_obstacle'], [
          I('El balance de enlace lo junta todo:\n<b>Pr = Pt − cables + Gt − FSPL + Gr − cables</b>\n<b>Margen = Pr − sensibilidad</b>.\nMueve los deslizadores y mira la escalera.', { tune: { viz: 'rf_link', params: LINK } }),
          TU('Con 14 dBm y antenas de 2 dBi a 868 MHz, consigue al menos 10 dB de margen a 50 km en espacio libre. Solo puedes tocar la sensibilidad (el SF) y los cables.', 'rf_link', { Pt: { val: 14, fixed: true }, G: { val: 2, fixed: true }, Lc: { label: 'Cables y conectores (total)', val: 4, min: 0, max: 10, step: 0.5, unit: 'dB', dec: 1 }, f: { val: 868, fixed: true }, d: { val: 50, fixed: true }, S: { label: 'Sensibilidad del receptor', val: -110, min: -140, max: -70, step: 1, unit: 'dBm', dec: 0 } }, { q: 'margin', min: 10, max: 100, text: 'Objetivo: margen ≥ 10 dB a 50 km', hint: 'Baja la sensibilidad (SF más alto) y quita pérdidas de cable.' }, 'Por ejemplo SF12 (unos −137 dBm) y 1 dB de cables: casi 29 dB de margen… en espacio libre. En la realidad, los obstáculos se comen mucho.', { c: 'rf_budget' }),
          G('rf_margin'),
          I('¿Cuánto margen? Desvanecimientos, lluvia (a frecuencias altas), vegetación que crece, gente que pasa… Orientativo: <b>10 dB</b> para un enlace fijo con visión directa; <b>20 dB o más</b> con obstáculos o si un extremo se mueve.'),
          Q('Tu balance prevé 3 dB de margen. ¿Qué esperas?', ['Un enlace que falla a ratos', 'Un enlace perfecto', 'Que no funcione nunca', 'Que funcione mejor de noche siempre'], 'Cualquier desvanecimiento se come 3 dB.', { c: 'rf_budget' }),
          G('rf_margin'),
          I('Cada 6 dB de margen extra duplican el alcance en espacio libre. Las mejoras se suman: subir la antena (Fresnel), quitar cable, una antena mejor en el receptor (no cuenta para el límite legal) y un SF mayor.'),
          Q('¿Qué mejora aumenta el margen sin aumentar tu potencia radiada?', ['Una antena de más ganancia solo en el receptor', 'Un amplificador en el emisor', 'Más potencia en el módulo', 'Una antena de más ganancia en el emisor'], 'La ganancia en recepción no se emite.', { c: 'rf_eirp' }),
          Q('Habías previsto −110 dBm y mides −128 dBm. ¿Qué es lo más probable?', ['Obstáculos o zona de Fresnel invadida: 18 dB de pérdidas extra', 'El receptor está roto', 'La fórmula de FSPL está mal', 'Es imposible'], 'Las pérdidas reales casi siempre superan al espacio libre.', { c: 'rf_obstacle' }),
          G('rf_margin')
        ]),
        PRJ('rf-p3', 'Proyecto: mapa de cobertura y exponente de pérdidas', 'rf_rssi')
      ] },

      { id: 'rf-m4', title: 'Circuitos de RF', desc: 'Resonancia y Q, filtros, osciladores y PLL, mezcladores, amplificadores y lo que hacen los componentes reales a alta frecuencia.', nodes: [
        L('rf15', 'Bobinas y resonancia LC en RF', 'cap', ['rf_resonance', 'rf_reactance', 'rf_tank', 'rf_coil'], [
          I('Repaso rápido: la reactancia de una bobina sube con la frecuencia (<b>XL = 2π·f·L</b>) y la del condensador baja (<b>XC = 1 / (2π·f·C)</b>). Donde se igualan, se anulan: <b>f₀ = 1 / (2π√(LC))</b>.'),
          Nm('¿Reactancia de 10 nH a 868 MHz, en Ω?', 54.5, 'Ω', '2π × 868·10⁶ × 10·10⁻⁹ ≈ 54,5 Ω: ¡un centímetro de hilo ya pesa tanto como la impedancia del sistema!', { tol: 1, c: 'rf_reactance' }),
          I('Mueve L, C y Q: la curva es la respuesta de un circuito sintonizado.', { tune: { viz: 'rf_lc', params: { L: LCL(100), C: LCC(220), Q: LCQ(50) } } }),
          G('rf_lcf'),
          TU('Sintoniza tu galena a una emisora de onda media de 1 MHz (±10 %).', 'rf_lc', { L: LCL(470), C: LCC(1000), Q: { val: 50, fixed: true } }, { q: 'f0', min: 0.9e6, max: 1.1e6, text: 'Objetivo: f₀ entre 900 kHz y 1,1 MHz', hint: 'L·C ≈ 2,5·10⁻¹⁴: por ejemplo 100 µH con 220 pF.' }, '100 µH y 220 pF dan unos 1,07 MHz.', { c: 'rf_resonance' }),
          Q('Un LC en serie, en resonancia, presenta al generador…', ['Una impedancia mínima: solo la resistencia de pérdidas', 'Una impedancia infinita', 'Una capacidad pura', 'Una inductancia pura'], 'En serie las reactancias se cancelan. En paralelo (circuito tanque), la impedancia es máxima.', { c: 'rf_tank' }),
          Q('¿Para qué sirve un circuito tanque (LC en paralelo) a la entrada de una radio?', ['Presenta alta impedancia solo a la frecuencia deseada y la selecciona', 'Amplifica todas las frecuencias', 'Rectifica', 'Alimenta la radio'], 'Las demás frecuencias encuentran un camino a masa.', { c: 'rf_tank' }),
          G('rf_lcf'),
          I('Bobinas de RF caseras: hilo esmaltado en el aire o sobre un tubo; a cientos de MHz bastan 3–6 espiras.\nFórmula de Wheeler para solenoides: <b>L (µH) ≈ d²·N² / (45,7·d + 101,6·l)</b>, con diámetro d y longitud l en cm.'),
          Nm('Bobina de 5 cm de diámetro, 70 vueltas y 3,5 cm de largo: ¿L en µH según Wheeler?', 209.7, 'µH', '25 × 4900 / (228,5 + 355,6) ≈ 210 µH.', { tol: 5, c: 'rf_coil' }),
          Q('Quieres subir la frecuencia de resonancia de tu tanque. ¿Qué haces con la bobina?', ['Quitar vueltas', 'Añadir vueltas', 'Meterle un núcleo de ferrita', 'Nada'], 'Menos vueltas → menos L → más f₀.', { c: 'rf_coil' })
        ]),
        L('rf16', 'Factor Q, ancho de banda y filtros de RF', 'cap', ['rf_q', 'rf_filters', 'rf_harmonics'], [
          I('<b>Q = f₀ / BW</b>. Q alta → resonancia estrecha y selectiva. En un LC serie, <b>Q = XL / R</b>: las pérdidas del hilo, el núcleo y la carga la bajan.'),
          TU('Las emisoras de onda media están separadas 9 kHz. Consigue un ancho de banda menor de 10 kHz cerca de 1 MHz.', 'rf_lc', { L: { val: 100, fixed: true }, C: { val: 220, fixed: true }, Q: LCQ(20) }, { q: 'bw', min: 0, max: 10000, text: 'Objetivo: BW < 10 kHz', hint: 'BW = f₀ / Q: necesitas Q por encima de 110.' }, 'Con Q = 110, BW ≈ 9,8 kHz. Una galena con su antena conectada rara vez pasa de Q = 50: por eso mezcla emisoras.', { c: 'rf_q' }),
          G('rf_qbw'),
          I('Filtros de RF:\n· <b>Paso bajo LC</b> a la salida de un emisor, contra los armónicos.\n· <b>Paso banda</b> a la entrada de un receptor (preselector), contra señales fuertes fuera de banda.\n· <b>SAW y cerámicos</b>: compactos y de flancos abruptos; en FI, cerámicos de 10,7 MHz y 455 kHz.'),
          Q('¿Por qué un emisor necesita un filtro paso bajo a la salida?', ['Para atenuar los armónicos y no emitir en frecuencias de otros servicios', 'Para amplificar', 'Para adaptar siempre a 50 Ω', 'Para consumir menos'], 'Las emisiones no esenciales tienen límites muy estrictos.', { c: 'rf_harmonics' }),
          Q('¿Dónde cae el tercer armónico de un emisor de 433,92 MHz?', ['1301,76 MHz', '1735,68 MHz', '867,84 MHz', '144,64 MHz'], '3 × 433,92 MHz.', { c: 'rf_harmonics' }),
          I('En una ciudad, un receptor ve decenas de emisoras de FM de varios kW a la vez. Un SDR sintonizado en 137 MHz puede saturarse con ellas aunque no las escuches: por eso existen los <b>filtros de rechazo de la banda de FM</b>.'),
          Q('Tu receptor ADS-B empeora cerca de una antena de telefonía móvil. ¿Qué pones?', ['Un filtro paso banda de 1090 MHz antes del LNA', 'Más ganancia', 'Una antena más larga', 'Un filtro de audio'], 'Que solo entre lo que quieres oír.', { c: 'rf_filters' }),
          G('rf_qbw'),
          { t: 'match', q: 'Une cada filtro con su uso.', pairs: [['Paso bajo LC a la salida del emisor', 'Quitar armónicos'], ['Cerámico de 10,7 MHz', 'FI de un receptor de FM'], ['Rechazo de banda de FM', 'Proteger un SDR de las emisoras'], ['Resonador SAW de 433,92 MHz', 'Fijar la frecuencia de un mando barato']], c: 'rf_filters' }
        ]),
        L('rf17', 'Osciladores: LC, cristal y PLL', 'timer', ['rf_osc', 'rf_ppm', 'rf_harmonics'], [
          I('Un <b>oscilador</b> es un amplificador cuya salida vuelve a su entrada a través de un filtro. Si la ganancia del lazo es al menos 1 y la fase da una vuelta completa a una frecuencia, el ruido de arranque crece a esa frecuencia hasta estabilizarse (criterio de Barkhausen).'),
          Q('¿Qué fija la frecuencia de un oscilador LC (Colpitts o Hartley)?', ['La resonancia de su circuito LC', 'La tensión de alimentación', 'El transistor', 'El tamaño de la placa'], 'El filtro decide a qué frecuencia se cumple la condición de oscilación.', { c: 'rf_osc' }),
          I('Un <b>cristal de cuarzo</b> vibra mecánicamente (piezoelectricidad) con una Q enorme, de 10⁴ a 10⁶: su frecuencia es muy estable.\nPrecisión típica: ±10–50 ppm. Un <b>TCXO</b> (compensado en temperatura): ±0,5–2,5 ppm.'),
          Nm('Un cristal de ±20 ppm en un sintetizador de 868 MHz. ¿Error máximo en kHz?', 17.36, 'kHz', '868·10⁶ × 20·10⁻⁶ = 17 360 Hz.', { tol: 0.2, c: 'rf_ppm' }),
          Q('¿Por qué los módulos LoRa de ancho de banda estrecho llevan TCXO?', ['Un error de frecuencia grande respecto al ancho de banda impide recibir', 'Para transmitir más fuerte', 'Por estética', 'Para no necesitar antena'], 'Con 7,8 kHz de BW, 17 kHz de error es demasiado.', { c: 'rf_ppm' }),
          I('<b>PLL</b>: un oscilador controlado por tensión (VCO) se compara, a través de un divisor ÷N, con un cristal de referencia. Un detector de fase y un filtro corrigen el VCO hasta que <b>fsal = N · fref</b>. Cambiando N (incluso fraccionario) se sintoniza con la estabilidad del cristal.'),
          { t: 'order', q: 'Ordena el lazo de un PLL siguiendo la señal.', items: ['Oscilador controlado por tensión (VCO)', 'Divisor ÷N', 'Detector de fase (compara con el cristal)', 'Filtro de lazo', 'Tensión de control del VCO'], e: 'Es un lazo cerrado: la tensión de control vuelve al VCO.', c: 'rf_osc' },
          Nm('PLL con referencia de 10 MHz y N = 86,8. ¿Frecuencia de salida en MHz?', 868, 'MHz', '10 × 86,8 = 868 MHz.', { c: 'rf_osc' }),
          I('Así sintonizan casi todas las radios modernas: el SX1276 sintetiza con un PLL fraccionario desde un cristal de 32 MHz en pasos de unos 61 Hz; el Si5351 genera relojes de kHz a más de 100 MHz con dos PLL internos de 600–900 MHz y divisores.'),
          Q('El Si5351 da ondas cuadradas. ¿Qué precaución tomas si lo usas como generador?', ['Sus armónicos: filtra la salida y nunca le pongas antena', 'Ninguna', 'Que se calienta mucho', 'Que es demasiado preciso'], 'Una cuadrada está llena de armónicos impares.', { c: 'rf_harmonics' }),
          Q('¿Qué es el ruido de fase?', ['Fluctuaciones aleatorias de la fase de un oscilador que ensanchan su espectro', 'El ruido del ventilador', 'Un error de soldadura', 'El ruido térmico de la antena'], 'Un oscilador real no es una raya perfecta en el espectro.', { c: 'rf_osc' })
        ]),
        L('rf18', 'Mezcladores y frecuencia intermedia', 'wave', ['rf_mixer', 'rf_image', 'rf_iq'], [
          I('Multiplicar dos senoides da su suma y su diferencia: <b>sen a · sen b = ½[cos(a − b) − cos(a + b)]</b>.\nUn mezclador es, idealmente, un multiplicador. En la práctica (diodos, transistores, células de Gilbert) también salen armónicos y productos indeseados.'),
          Q('Mezclas 433,92 MHz con un oscilador de 423,22 MHz. ¿Qué frecuencias principales salen?', ['10,7 MHz y 857,14 MHz', 'Solo 10,7 MHz', 'Solo 433,92 MHz', '847,14 MHz y 5,35 MHz'], 'Diferencia y suma.', { c: 'rf_mixer' }),
          I('<b>Superheterodino</b>: un oscilador local (OL) que se mueve con el dial convierte cualquier emisora a una frecuencia intermedia (FI) fija. El filtrado fino y la amplificación se hacen ahí, una sola vez, con filtros fijos excelentes.'),
          Q('¿Qué ventaja tiene convertir todo a una FI fija?', ['Filtros y amplificadores se diseñan una vez para una sola frecuencia', 'No hace falta antena', 'Elimina el ruido térmico', 'Permite transmitir'], 'Es más fácil hacer un filtro excelente que no hay que sintonizar.', { c: 'rf_mixer' }),
          Q('Radio de FM con FI de 10,7 MHz y OL por encima. Para sintonizar 95 MHz, ¿dónde va el OL?', ['105,7 MHz', '84,3 MHz', '95 MHz', '10,7 MHz'], '95 + 10,7.', { c: 'rf_mixer' }),
          I('Valores típicos: <b>455 kHz</b> en AM y <b>10,7 MHz</b> en FM. Los chips modernos usan una FI baja (cientos de kHz) o cero, y la digitalizan.'),
          G('rf_image'),
          I('El mezclador también sube frecuencias: en un emisor, una señal en banda base o en FI se traslada a la frecuencia de antena. El mismo principio, al revés.'),
          Q('Un SDR muestra una emisora a 3 kHz de la sintonía y otra, igual pero más débil, en el lado opuesto. ¿Qué es la segunda?', ['Una imagen por desequilibrio entre I y Q', 'Una emisora pirata', 'Un fallo de la antena', 'El efecto Doppler'], 'Si I y Q no son perfectos, aparece un reflejo especular.', { c: 'rf_iq' }),
          G('rf_image')
        ]),
        L('rf19', 'Amplificadores de RF y de bajo ruido', 'amp', ['rf_overload', 'rf_osc', 'rf_reactance', 'rf_eirp'], [
          I('Un amplificador de RF se describe por:\n· <b>Ganancia</b> (dB).\n· <b>Figura de ruido</b> (NF, dB).\n· <b>P1dB</b>: potencia a la que la ganancia ya ha caído 1 dB por saturación.\n· <b>IP3</b>: resistencia a la intermodulación.'),
          Q('Un LNA de 20 dB de ganancia tiene un P1dB de salida de +10 dBm. ¿Con qué entrada empieza a comprimir?', ['Con unos −10 dBm', 'Con +30 dBm', 'Con −90 dBm', 'Con +10 dBm'], 'Salida de +10 dBm menos 20 dB de ganancia (algo menos, en realidad, porque ya comprime).', { c: 'rf_overload' }),
          I('<b>Intermodulación</b>: dos señales fuertes f₁ y f₂ en un amplificador no lineal generan 2f₁ − f₂ y 2f₂ − f₁, muy cerca de ellas. Un receptor saturado se llena de señales fantasma.'),
          Nm('Dos señales fuertes en 100 y 101 MHz. ¿Dónde cae el producto 2f₂ − f₁, en MHz?', 102, 'MHz', '2 × 101 − 100.', { c: 'rf_overload' }),
          I('<b>Bloques MMIC</b>: pequeños amplificadores integrados adaptados a 50 Ω que solo piden alimentación a través de una bobina de choque y condensadores de paso. Son la base de muchos LNA para SDR.'),
          Q('¿Para qué sirve la bobina de choque en la alimentación de un MMIC?', ['Deja pasar la continua y bloquea la RF para que no se escape a la fuente', 'Para amplificar más', 'Para filtrar la continua', 'Para que oscile'], 'Alta impedancia a RF, casi cero en continua.', { c: 'rf_reactance' }),
          Q('Pones un LNA de 30 dB delante de un RTL-SDR en una ciudad con muchas emisoras y todo empeora. ¿Por qué?', ['El exceso de ganancia satura el receptor con señales fuertes', 'El LNA no funciona', 'El cable es corto', 'La antena es pequeña'], 'Ganancia justa, no máxima.', { c: 'rf_overload' }),
          I('Un amplificador de RF puede <b>oscilar</b> si su salida se acopla a la entrada (cables cerca, mala masa). Síntomas: consumo alto, calor y señales donde no debería haber nada. Remedio: masa continua, desacoplo y separación física.'),
          Q('Un amplificador se calienta sin señal y el SDR ve una portadora en 800 MHz que antes no estaba. ¿Qué pasa?', ['Está oscilando: revisa masas, desacoplo y acoplamientos', 'Está perfecto', 'Es ruido térmico', 'El SDR está roto'], 'Un amplificador que oscila es un emisor no deseado.', { c: 'rf_osc' }),
          Q('¿Por qué amplificar la salida de tu módulo de 868 MHz es mala idea?', ['Superarías los límites legales de la sub-banda', 'Porque reduce el alcance', 'Porque no existen amplificadores a 868 MHz', 'Es buena idea'], 'Para más alcance: antenas, altura y SF, no potencia.', { c: 'rf_eirp' })
        ]),
        L('rf20', 'Componentes reales a alta frecuencia', 'pcb', ['rf_reactance', 'rf_skin', 'rf_pcb'], [
          I('A alta frecuencia ningún componente es ideal: un condensador tiene inductancia en serie (ESL) por sus terminales; una resistencia, capacidad en paralelo; un hilo, inductancia (≈ 1 nH por mm); una pista, inductancia y capacidad a masa.'),
          I('Cada condensador real resuena consigo mismo en su <b>frecuencia de autorresonancia</b> (SRF). Por encima, ¡se comporta como una bobina!\nUn 100 nF cerámico SMD resuena en unas decenas de MHz; uno de 100 pF, cerca del GHz. Por eso el desacoplo de RF usa valores pequeños.'),
          Q('Para desacoplar la alimentación de un módulo de 2,4 GHz, ¿qué añades junto al de 100 nF?', ['Un condensador pequeño (pF) SMD pegado a la pata', 'Un electrolítico de 1000 µF a 10 cm', 'Una resistencia', 'Nada'], 'Cada valor cubre su rango de frecuencias.', { c: 'rf_reactance' }),
          Nm('Un hilo de 1 cm tiene unos 10 nH. ¿Su reactancia a 2,44 GHz, en Ω?', 153.3, 'Ω', '2π × 2,44·10⁹ × 10⁻⁸ ≈ 153 Ω.', { tol: 3, c: 'rf_reactance' }),
          I('<b>Efecto pelicular</b>: a alta frecuencia la corriente circula solo por la superficie del conductor. Profundidad en cobre ≈ 66 µm / √(f en MHz): 66 µm a 1 MHz, 6,6 µm a 100 MHz, unos 2 µm a 1 GHz.'),
          Q('¿Por qué sube la resistencia de un hilo a alta frecuencia?', ['La corriente se concentra en una capa fina de la superficie', 'El cobre se calienta', 'Los electrones van más rápido', 'No sube'], 'Menos sección útil, más resistencia.', { c: 'rf_skin' }),
          I('PCB de RF: <b>plano de masa continuo</b> bajo las pistas de RF, pistas cortas y de 50 Ω (en FR4 de 1,6 mm a dos caras, unos 3 mm de ancho; en placas de 4 capas, mucho más finas), vías a masa cerca, y nunca cortar el plano bajo una pista de RF.'),
          Q('Cortas el plano de masa justo debajo de la pista de antena de 2,4 GHz para pasar otra pista. ¿Qué pasa?', ['La corriente de retorno da un rodeo: la pista deja de ser de 50 Ω y radia', 'Nada', 'Mejora', 'Solo se calienta la placa'], 'La RF vuelve justo por debajo de su pista.', { c: 'rf_pcb' }),
          I('Los SMD pequeños (0402, 0603) tienen menos parásitos que los de inserción. Un circuito de RF en protoboard rara vez funciona por encima de unas decenas de MHz: las tiras metálicas añaden pF y nH por todas partes.'),
          Q('Montas un LNA de 1 GHz en una protoboard y no amplifica. ¿Primera sospecha?', ['Los parásitos de la protoboard y de los cables', 'El chip está defectuoso', 'La temperatura', 'El color de los cables'], 'Para RF: placa con plano de masa, aunque sea de prototipos.', { c: 'rf_reactance' })
        ]),
        PRJ('rf-p4', 'Proyecto: detector de RF de banda ancha', 'rf_detector'),
        PRJ('rf-p5', 'Proyecto: laboratorio de osciladores y PLL', 'rf_oscillators')
      ] },

      { id: 'rf-m5', title: 'Líneas y antenas', desc: 'Impedancia característica, coaxial, ROE, conectores y antenas: dipolos, monopolos, Yagi, parches y de chip. Y cómo medirlas con un NanoVNA.', nodes: [
        L('rf21', 'Líneas de transmisión', 'bus', ['rf_tline', 'rf_match'], [
          I('Cuando un cable mide más de una décima de longitud de onda, la señal tarda en recorrerlo y se comporta como una onda que viaja: es una <b>línea de transmisión</b>, caracterizada por su <b>impedancia característica Z0</b>.'),
          Q('A 868 MHz (λ ≈ 34,5 cm), ¿a partir de qué longitud una pista se trata como línea?', ['Unos 3,5 cm', 'Unos 3,5 m', 'Nunca', 'Unos 3,5 mm'], 'Regla práctica: más de λ/10.', { c: 'rf_tline' }),
          I('Z0 no es la resistencia que mides con el multímetro: es la relación tensión/corriente de la onda que viaja, fijada por la geometría y el aislante: <b>Z0 = √(L′ / C′)</b>.\nEn un coaxial: <b>Z0 = (138 / √εr)·log₁₀(D / d)</b>.'),
          Q('Mides con el multímetro un coaxial de 50 Ω y 10 m, abierto en el otro extremo. ¿Qué marca entre vivo y malla?', ['Circuito abierto (resistencia altísima)', '50 Ω', '0 Ω', '500 Ω'], 'En continua no hay onda que viaje: solo un aislante.', { c: 'rf_tline' }),
          I('¿Por qué 50 Ω? En coaxial con aire, la pérdida mínima está cerca de 77 Ω y la potencia máxima cerca de 30 Ω: 50 Ω es un compromiso. La TV usa 75 Ω porque solo recibe y le importa la pérdida.'),
          { t: 'match', q: 'Une cada término con su significado.', pairs: [['50 Ω', 'Radio, instrumentos y módulos'], ['75 Ω', 'Televisión y satélite'], ['Z0', 'Depende de la geometría y el dieléctrico'], ['Factor de velocidad', 'Fracción de c dentro del cable']], c: 'rf_tline' },
          I('<b>Factor de velocidad</b> (VF): la onda va más lenta dentro del cable: VF = 1/√εr. Polietileno macizo: 0,66; espumado: 0,8–0,85. Importa cuando cortas un cable a una longitud eléctrica exacta.'),
          Nm('¿Cuánto mide un cuarto de onda eléctrico a 433,92 MHz en un coaxial con VF = 0,66, en cm?', 11.4, 'cm', '17,27 cm × 0,66.', { tol: 0.3, c: 'rf_tline' }),
          I('Un tramo de λ/4 transforma impedancias: <b>Zent = Z0² / ZL</b>. Con una línea de 70,7 Ω y λ/4 se adapta una carga de 100 Ω a 50 Ω (70,7² / 100 ≈ 50).'),
          Nm('¿Qué Z0 necesita un transformador de λ/4 para adaptar 200 Ω a 50 Ω?', 100, 'Ω', '√(50 × 200) = 100 Ω.', { c: 'rf_match' })
        ]),
        L('rf22', 'Adaptación, ROE y pérdidas de retorno', 'gauge', ['rf_line', 'rf_match', 'rf_inprot'], [
          I('Si la carga no es igual a Z0, parte de la onda rebota: <b>Γ = (ZL − Z0) / (ZL + Z0)</b>. La onda que va y la que vuelve forman una <b>onda estacionaria</b>: máximos y mínimos de tensión fijos a lo largo de la línea.', { tune: { viz: 'rf_swr', params: { R: { label: 'Resistencia de la carga', val: 75, min: 5, max: 300, step: 1, unit: 'Ω', dec: 0 }, X: { label: 'Reactancia (+ inductiva, − capacitiva)', val: 0, min: -150, max: 150, step: 5, unit: 'Ω', dec: 0 } } } }),
          I('<b>ROE</b> (SWR, VSWR) = Vmáx / Vmín = (1 + |Γ|) / (1 − |Γ|).\n<b>Pérdidas de retorno</b>: RL = −20·log|Γ|: cuántos dB por debajo vuelve la reflexión. Más dB de RL = mejor adaptación.'),
          TU('Una antena presenta 35 Ω con algo de reactancia. Ajusta la carga hasta ROE < 1,5.', 'rf_swr', { R: { label: 'Resistencia de la carga', val: 35, min: 5, max: 300, step: 1, unit: 'Ω', dec: 0 }, X: { label: 'Reactancia (+ inductiva, − capacitiva)', val: 40, min: -150, max: 150, step: 5, unit: 'Ω', dec: 0 } }, { q: 'swr', min: 1, max: 1.5, text: 'Objetivo: ROE < 1,5', hint: 'Lleva la reactancia a 0 y la resistencia cerca de 50 Ω.' }, 'Es lo que hace una red de adaptación: cancelar la reactancia y transformar la resistencia.', { c: 'rf_match' }),
          G('rf_swr'),
          G('rf_swr'),
          Q('ROE 3:1. ¿Qué parte de la potencia llega a la antena (sin contar el cable)?', ['Un 75 %', 'Un 33 %', 'Un 3 %', 'Toda'], '|Γ| = 0,5 → se refleja el 25 %.', { c: 'rf_line' }),
          I('Con ROE 2 se pierde solo medio dB: para recibir no es un drama. Lo grave de una ROE alta es al transmitir: la potencia reflejada vuelve al amplificador de salida y puede dañarlo. Y una ROE alta delata una antena desafinada, rota o mal montada.'),
          Q('Un módulo de 868 MHz transmite sin antena conectada. ¿Qué riesgo hay?', ['Reflexión total: el amplificador de salida puede dañarse', 'Ninguno', 'Transmite más lejos', 'Ahorra batería'], 'Conecta siempre la antena antes de alimentar.', { c: 'rf_inprot' }),
          I('Adaptar es transformar la impedancia de la carga en 50 Ω sin pérdidas: redes en L con una bobina y un condensador, tramos de λ/4, transformadores. La <b>carta de Smith</b> es el mapa donde se diseñan; un NanoVNA la dibuja en directo.'),
          Q('Unas pérdidas de retorno de 20 dB significan…', ['Que vuelve el 1 % de la potencia: muy buena adaptación', 'Que se pierde el 20 %', 'Una ROE de 20', 'Muy mala adaptación'], '−20 dB = una centésima.', { c: 'rf_line' })
        ]),
        L('rf23', 'Cables y conectores', 'bus', ['rf_connectors', 'rf_chain', 'rf_dbratio'], [
          I('Coaxiales típicos: <b>RG-174 y RG-316</b> (finos, para latiguillos cortos), <b>RG-58</b> (unos 5 mm, versátil) y los de baja pérdida (tipo LMR-200 o LMR-400) para tramos largos.\nUn RG-58 pierde del orden de 0,3–0,4 dB/m a 433 MHz y 0,5–0,7 dB/m a 1 GHz. Mira siempre la hoja del fabricante.'),
          Nm('8 m de coaxial con 0,5 dB/m. ¿Pérdida total en dB?', 4, 'dB', '8 × 0,5.', { c: 'rf_chain' }),
          Q('Con esos 4 dB, ¿qué parte de la potencia llega a la antena?', ['Unos dos quintos (≈ 40 %)', 'Un 96 %', 'La mitad exacta', 'Un 4 %'], '10^(−0,4) ≈ 0,4.', { c: 'rf_dbratio' }),
          I('Conectores:\n· <b>SMA</b>: rosca, hasta 18 GHz; el de casi todos los módulos.\n· <b>RP-SMA</b>: igual por fuera, con el pin cambiado de lado (routers WiFi).\n· <b>u.FL / IPEX</b>: diminuto, en placa; aguanta pocas conexiones.\n· <b>BNC</b>: bayoneta, laboratorio. · <b>N</b>: robusto y estanco. · <b>F</b>: TV, 75 Ω.'),
          { t: 'match', q: 'Une cada conector con su uso típico.', pairs: [['SMA', 'Módulos y antenas pequeñas'], ['u.FL', 'De placa a latiguillo, pocas conexiones'], ['N', 'Exteriores y potencias mayores'], ['BNC', 'Instrumentos de laboratorio']], c: 'rf_connectors' },
          Q('Enroscas una antena RP-SMA en un módulo SMA. La rosca encaja, pero no hay señal. ¿Por qué?', ['Ninguno de los dos tiene pin central: el vivo no hace contacto', 'Las antenas RP son de otra banda', 'Hay que apretar más', 'Es normal'], 'Un clásico: revisa siempre el pin.', { c: 'rf_connectors' }),
          I('Buenas prácticas: aprieta la tuerca del SMA sin girar el cuerpo del cable; no dobles el coaxial en curvas cerradas; sella los conectores exteriores con cinta autovulcanizante; evita adaptadores en cadena (cada uno, unas décimas de dB y un punto de fallo).'),
          Q('Tu antena exterior va bien en verano y fatal tras las lluvias. ¿Primera sospecha?', ['Agua dentro del conector o del cable', 'La antena encoge', 'La ionosfera', 'El módulo se enfría'], 'El agua cambia la impedancia y corroe.', { c: 'rf_connectors' }),
          Q('¿Cuántas veces puedes conectar y desconectar un u.FL antes de que se afloje?', ['Del orden de unas decenas', 'Miles', 'Infinitas', 'Una'], 'Está pensado para montarse una vez en fábrica.', { c: 'rf_connectors' })
        ]),
        L('rf24', 'Dipolo y monopolo', 'antenna', ['rf_antsize', 'rf_feed', 'rf_trim', 'rf_antenna'], [
          I('El <b>dipolo de media onda</b>: dos brazos de λ/4 alimentados en el centro. Impedancia en espacio libre: unos 73 Ω; ganancia 2,15 dBi; radia sobre todo de lado, como un donut alrededor de su eje.', { tune: { viz: 'rf_lambda', params: { f: pF(433.92), k: pK() } } }),
          G('rf_antLen'),
          I('El <b>monopolo de λ/4</b> es medio dipolo: la otra mitad es un “espejo” que crea un plano de tierra (una placa, un chasis o unos radiales). Con plano perfecto, unos 36 Ω; con radiales inclinados unos 45°, se acerca a 50 Ω.'),
          Q('Montas un monopolo de 433 MHz sin plano de tierra, solo el hilo en el conector de la placa. ¿Qué pasa?', ['El cable de alimentación y la placa hacen de “otra mitad”: funciona peor y de forma imprevisible', 'Funciona igual', 'Mejora', 'No emite nada'], 'La corriente tiene que volver por algún sitio.', { c: 'rf_feed' }),
          I('El dipolo es simétrico (balanceado) y el coaxial no. Sin un <b>balun</b>, circula corriente por la cara exterior de la malla: el cable radia, el diagrama se deforma y las medidas cambian al tocar el cable. Un balun de choque (ferritas o unas vueltas de coaxial) lo corta.'),
          Q('Mides tu dipolo y la ROE cambia cada vez que tocas el coaxial. ¿Qué falta?', ['Un balun o choque de modo común junto a la alimentación', 'Un cable más largo', 'Más potencia', 'Recortar la antena'], 'Corriente de modo común por la malla.', { c: 'rf_feed' }),
          I('Los extremos tienen capacidad y el conductor tiene grosor: la resonancia llega antes que en la teoría. Con hilo fino, del orden de un 95–98 % de la longitud teórica; con tubo grueso, menos. Se corta largo y se recorta midiendo.'),
          Nm('Tu antena de 9,0 cm resuena en 830 MHz y la quieres en 868 MHz. ¿Nueva longitud en cm?', 8.61, 'cm', '9,0 × 830 / 868 ≈ 8,6 cm.', { tol: 0.05, c: 'rf_trim' }),
          I('Antenas cortas: el muelle de los módulos de 433 MHz es una hélice en modo normal: muy pequeña, pero con ancho de banda estrecho y menos eficiencia. Las antenas “eléctricamente pequeñas” siempre pagan en eficiencia o en ancho de banda.'),
          G('rf_antLen'),
          Q('¿Por qué una vertical de 5/8 λ es popular en VHF?', ['Concentra más energía hacia el horizonte que una de λ/4', 'Es más corta', 'No necesita adaptación', 'Sirve para todas las bandas'], 'Más ganancia a ángulos bajos (y sí necesita adaptación).', { c: 'rf_antenna' })
        ]),
        L('rf25', 'Ganancia, directividad, polarización y diagramas', 'antenna', ['rf_antenna', 'rf_polar', 'rf_obstacle'], [
          I('<b>Directividad</b>: cuánto concentra una antena su radiación en la dirección preferida. <b>Ganancia = eficiencia × directividad</b>. Una antena con pérdidas puede ser muy directiva y tener poca ganancia.'),
          Q('Una antena con 8 dBi de directividad y un 50 % de eficiencia. ¿Ganancia?', ['5 dBi', '8 dBi', '4 dBi', '16 dBi'], '50 % = −3 dB.', { c: 'rf_antenna' }),
          I('El <b>diagrama de radiación</b> dibuja la ganancia en cada dirección. Datos clave: ancho de haz a −3 dB, lóbulos secundarios y relación delante-detrás (F/B).'),
          I('<b>Yagi-Uda</b>: un elemento activo y elementos parásitos sin conectar: un <b>reflector</b> algo más largo detrás y <b>directores</b> algo más cortos delante. Sus corrientes inducidas se suman hacia delante. Con 3 elementos, unos 7 dBi.'),
          Q('En una Yagi, ¿qué elemento es el más largo?', ['El reflector', 'El director', 'El activo', 'Todos miden igual'], 'Un poco más largo que λ/2: se comporta como inductivo y “empuja” hacia delante.', { c: 'rf_antenna' }),
          I('<b>Parche</b>: un cuadrado de cobre de unos λ/2 (medido dentro del dieléctrico) sobre un plano de masa; radia hacia delante con 6–8 dBi típicos. Las antenas de GPS son parches cerámicos de polarización circular.'),
          I('<b>Antenas de chip y de pista</b>: diminutas, en ESP32 y módulos. Su rendimiento depende del plano de masa de la placa, de una zona libre de cobre alrededor y de una red de adaptación. Metal, pilas o la mano cerca las desafinan.'),
          Q('Metes un ESP32 con antena de pista dentro de una caja metálica cerrada. ¿Qué pasa?', ['La caja bloquea la radiación: casi no hay alcance', 'Mejora: la caja hace de reflector', 'Nada', 'Solo afecta al Bluetooth'], 'Jaula de Faraday. Usa una caja de plástico o una antena externa.', { c: 'rf_obstacle' }),
          I('<b>Polarización</b>: lineal (vertical u horizontal) o circular (a derechas o a izquierdas). Entre lineales cruzadas a 90° se pierde muchísimo (en la práctica unos 20 dB, por los reflejos). Entre lineal y circular, 3 dB.'),
          Q('¿Por qué los satélites usan polarización circular?', ['Su orientación respecto al receptor cambia y así no hay cruces de polarización', 'Por estética', 'Porque gana 10 dB', 'Por ley'], 'Con circular, girar no importa.', { c: 'rf_polar' }),
          { t: 'match', q: 'Une cada antena con su diagrama.', pairs: [['Dipolo', 'Donut alrededor de su eje'], ['Yagi', 'Haz hacia delante'], ['Parche', 'Hemisferio delantero'], ['Monopolo vertical con radiales', 'Omnidireccional en horizontal']], c: 'rf_antenna' }
        ]),
        L('rf26', 'Medir antenas con un NanoVNA', 'meter', ['rf_vna', 'rf_trim', 'rf_match', 'rf_inprot'], [
          I('Un <b>analizador vectorial de redes</b> (VNA) barre frecuencias y mide amplitud y fase de lo que vuelve (<b>S11</b>, reflexión) y de lo que atraviesa (<b>S21</b>, transmisión). El NanoVNA cabe en un bolsillo: el modelo H mide bien hasta unos 900 MHz; para 2,4 GHz hace falta un V2 o similar.'),
          I('Antes de medir se <b>calibra</b> en el plano exacto donde conectarás la antena (el final del cable): abierto, cortocircuito y carga de 50 Ω. Así el VNA “resta” el cable y los conectores.'),
          { t: 'order', q: 'Ordena una medida correcta.', items: ['Elegir rango de frecuencias y número de puntos', 'Calibrar al final del cable: abierto, corto y carga', 'Guardar la calibración', 'Conectar la antena en su posición final', 'Leer ROE y carta de Smith en la frecuencia de trabajo'], e: 'Si cambias el rango después, la calibración ya no vale.', c: 'rf_vna' },
          Q('Calibras de 300 a 1000 MHz y luego cambias el rango a 2–3 GHz. ¿Qué pasa?', ['La calibración deja de valer: hay que repetirla', 'Nada', 'Mejora la precisión', 'Se rompe el NanoVNA'], 'La calibración se guarda para esos puntos de frecuencia.', { c: 'rf_vna' }),
          I('Leer la medida: el mínimo de ROE marca la resonancia. Si cae por debajo de la frecuencia deseada, la antena es larga: recorta. Regla: <b>L nueva ≈ L actual × f medida / f deseada</b>. En la carta de Smith, el centro es 50 Ω perfecto.'),
          Nm('Tu dipolo de 33 cm resuena en 420 MHz y lo quieres en 433,92 MHz. ¿Nueva longitud total en cm?', 31.94, 'cm', '33 × 420 / 433,92 ≈ 31,9 cm.', { tol: 0.1, c: 'rf_trim' }),
          Q('En la carta de Smith tu medida queda en la mitad superior. ¿Qué indica?', ['Reactancia inductiva (positiva)', 'Reactancia capacitiva', 'Resistencia pura de 50 Ω', 'Un cortocircuito'], 'Arriba, inductiva; abajo, capacitiva.', { c: 'rf_match' }),
          I('Mide en condiciones reales: la mano, la caja, una mesa metálica o la propia placa cambian la resonancia. Mide la antena montada en su caja final y lejos de objetos.'),
          Q('¿Qué no debes conectar nunca al puerto del NanoVNA?', ['La salida de un emisor transmitiendo', 'Una antena', 'Una carga de 50 Ω', 'Un cable coaxial'], 'Su entrada se rompe con potencias pequeñas.', { c: 'rf_inprot' }),
          Q('¿Qué mide S21?', ['Lo que pasa de un puerto al otro: ganancia o pérdida de un filtro o un cable', 'Lo que se refleja', 'La temperatura', 'La tensión de la batería'], 'S11 es reflexión; S21, transmisión.', { c: 'rf_vna' })
        ]),
        PRJ('rf-p6', 'Proyecto: antenas de 433 y 868 MHz medidas con NanoVNA', 'rf_antennas'),
        PRJ('rf-p7', 'Proyecto: Yagi de 868 MHz y su diagrama de radiación', 'rf_yagi')
      ] },

      { id: 'rf-m6', title: 'Modulación y receptores', desc: 'AM, FM y modulaciones digitales, espectro ensanchado y LoRa, del receptor de galena al superheterodino y la radio definida por software.', nodes: [
        L('rf27', 'AM y FM', 'wave', ['rf_am', 'rf_fm'], [
          I('Modular es variar la portadora al ritmo del mensaje. En <b>AM</b>, la amplitud sigue al mensaje: la envolvente es una copia del audio. Prueba los tipos 1 (AM) y 2 (FM).', { tune: { viz: 'rf_mod', params: { type: MODT(1), m: MODM(0.6) } } }),
          I('Una AM con un tono fm produce la portadora y dos <b>bandas laterales</b> en fc ± fm: ancho de banda <b>2·fm</b>. En onda media en Europa los canales van cada 9 kHz.\nLa sobremodulación (más del 100 %) distorsiona y ensancha el espectro.'),
          Q('Emisora de AM en 1008 kHz con audio de hasta 4,5 kHz. ¿Qué ocupa?', ['De 1003,5 a 1012,5 kHz', 'De 1008 a 1012,5 kHz', 'De 1004 a 1008 kHz', 'Solo 1008 kHz'], 'Dos bandas laterales de 4,5 kHz.', { c: 'rf_am' }),
          Q('¿Qué parte de una AM no lleva información y gasta la mayor parte de la potencia?', ['La portadora', 'La banda lateral superior', 'La banda lateral inferior', 'El audio'], 'Por eso los radioaficionados usan banda lateral única (BLU).', { c: 'rf_am' }),
          I('En <b>FM</b> la amplitud es constante; cambia la frecuencia instantánea: la desviación Δf es proporcional al mensaje. Índice β = Δf / fm.\nRegla de Carson: <b>BW ≈ 2·(Δf + fm)</b>. Radio FM comercial: Δf = 75 kHz.'),
          G('rf_carson'),
          G('rf_carson'),
          I('Ventajas de FM: el ruido afecta sobre todo a la amplitud y el receptor la recorta (limitador); el <b>efecto captura</b> hace que la emisora más fuerte tape a la débil. En Europa la radio FM usa preénfasis de 50 µs: refuerza los agudos al emitir y los atenúa al recibir.'),
          Q('Con FM, ¿por qué no se oyen los chasquidos de un motor como en AM?', ['El receptor recorta la amplitud, donde está casi todo ese ruido', 'Porque usa más potencia', 'Porque es estéreo', 'No es cierto'], 'La información está en la frecuencia, no en la amplitud.', { c: 'rf_fm' }),
          TU('Lleva la AM al 100 % de modulación y observa la envolvente.', 'rf_mod', { type: { val: 1, fixed: true }, m: MODM(0.3) }, { q: 'm', min: 0.95, max: 1, text: 'Objetivo: modulación del 100 %', hint: 'Sube la profundidad al máximo.' }, 'Al 100 % la envolvente toca cero en los valles; más allá se recortaría y distorsionaría.', { c: 'rf_am' })
        ]),
        L('rf28', 'Modulaciones digitales', 'wave', ['rf_mod', 'rf_symbols', 'rf_manchester', 'rf_sens'], [
          I('Para enviar bits se cambian las mismas propiedades a saltos: <b>ASK</b> (amplitud), <b>OOK</b> (todo o nada), <b>FSK</b> (dos frecuencias), <b>PSK</b> (fase). Prueba los tipos 3, 4 y 5.', { tune: { viz: 'rf_mod', params: { type: MODT(3), m: MODM(1) } } }),
          { t: 'match', q: 'Une cada modulación con un ejemplo.', pairs: [['OOK', 'Mandos de garaje de 433 MHz'], ['GFSK', 'Bluetooth Low Energy y nRF24'], ['BPSK', 'Señal civil del GPS'], ['QAM', 'WiFi de alta velocidad']], c: 'rf_mod' },
          I('<b>GFSK</b>: FSK con los saltos suavizados por un filtro gaussiano: ocupa menos espectro. La usan BLE, nRF24 y muchos transceptores sub-GHz.'),
          I('Un <b>símbolo</b> puede llevar varios bits. Con M estados distintos, cada símbolo lleva <b>log₂(M)</b> bits: QPSK (4 fases) → 2 bits; 16-QAM → 4 bits; 256-QAM → 8 bits.'),
          Nm('¿Cuántos bits lleva cada símbolo en 64-QAM?', 6, 'bits', '2⁶ = 64.', { c: 'rf_symbols' }),
          Q('¿Qué pagas por meter más bits en cada símbolo (256-QAM frente a QPSK)?', ['Necesitas mucha más SNR: los estados están más juntos', 'Ocupa más ancho de banda', 'Consume menos', 'Nada'], 'Más estados, menos distancia entre ellos.', { c: 'rf_symbols' }),
          I('El ancho de banda ocupado es del orden de la velocidad de símbolos. Para más bits por segundo: más ancho de banda o más bits por símbolo (más SNR). No hay magia: es el límite de Shannon.'),
          Q('Tu enlace de 433 MHz falla a 10 kbps pero va bien a 1 kbps. ¿Por qué?', ['Menos velocidad permite filtrar más estrecho y entra menos ruido', 'A 1 kbps transmite más potencia', 'Es casualidad', 'El receptor se calienta'], 'Velocidad y sensibilidad están reñidas.', { c: 'rf_sens' }),
          I('Codificación de línea: los receptores baratos necesitan que la señal no se quede mucho tiempo fija. <b>Manchester</b> convierte cada bit en una transición (duplica el ancho de banda pero asegura el equilibrio); el <b>blanqueo</b> mezcla los datos con una secuencia pseudoaleatoria.'),
          Q('En Manchester, con el convenio 1 = alto→bajo y 0 = bajo→alto, ¿cómo se envía “1 1”?', ['Alto, bajo, alto, bajo', 'Alto, alto, alto, alto', 'Bajo, alto, bajo, alto', 'Alto, bajo, bajo, alto'], 'Cada 1 es una bajada en mitad del bit.', { c: 'rf_manchester' })
        ]),
        L('rf29', 'Espectro ensanchado y LoRa', 'wave', ['rf_lora', 'rf_loracfg', 'rf_sens', 'rf_duty'], [
          I('<b>Espectro ensanchado</b>: se transmite usando mucho más ancho de banda del necesario. A cambio, la señal resiste el ruido y las interferencias estrechas. Tres familias: secuencia directa (GPS), salto de frecuencia (Bluetooth) y chirp (LoRa).'),
          I('<b>Ganancia de procesado</b>: al “desensanchar” en el receptor, la señal se concentra de nuevo y el ruido no. El GPS reparte 50 bit/s de datos en 1,023 millones de chips por segundo: por eso se recibe por debajo del ruido.', { c: 'rf_sens' }),
          I('LoRa usa <b>chirps</b> que barren el ancho de banda BW. Cada símbolo transporta SF bits y dura <b>2^SF / BW</b>. Mueve SF, BW y la carga útil.', { tune: { viz: 'rf_lora', params: LORA } }),
          G('rf_tsym'),
          Q('Dos nodos LoRa con SF7 y SF8 transmiten a la vez en el mismo canal. ¿Se interfieren mucho?', ['Poco: SF distintos son casi ortogonales', 'Se destruyen siempre', 'Se suman', 'Solo con 500 kHz'], 'El receptor de SF7 ve el chirp de SF8 casi como ruido.', { c: 'rf_loracfg' }),
          TU('Consigue enviar 20 bytes en menos de 100 ms.', 'rf_lora', { SF: { label: 'Factor de ensanchado (SF)', val: 12, min: 7, max: 12, step: 1, dec: 0 }, BW: LORA.BW, PL: { val: 20, fixed: true }, CR: LORA.CR }, { q: 'toa', min: 0, max: 100, text: 'Objetivo: tiempo en aire < 100 ms', hint: 'Baja el SF o sube el ancho de banda.' }, 'SF7 a 125 kHz tarda unos 57 ms; a 500 kHz, unos 14 ms. Lo pagas en sensibilidad.', { c: 'rf_lora' }),
          G('rf_toaRatio'),
          I('El precio de cada paso de SF: el doble de tiempo en aire (más batería y más ciclo de trabajo) por unos 2,5 dB de sensibilidad. Bajar el BW de 250 a 125 kHz también gana unos 3 dB y duplica el tiempo.'),
          G('rf_sens'),
          Q('LoRa y LoRaWAN, ¿son lo mismo?', ['No: LoRa es la modulación (capa física) y LoRaWAN el protocolo de red que va encima', 'Sí, son sinónimos', 'LoRaWAN es la modulación', 'LoRa es una operadora'], 'LoRaWAN lo verás en la especialidad de IoT.', { c: 'rf_loracfg' }),
          G('rf_duty')
        ]),
        L('rf30', 'Receptores: de la galena al superheterodino', 'antenna', ['rf_rxtypes', 'rf_image', 'rf_q'], [
          I('<b>Galena</b> (receptor de cristal): antena, circuito sintonizado LC, diodo detector y auricular de alta impedancia. Sin pilas: la energía la pone la emisora. El diodo rectifica la AM y un condensador deja solo la envolvente: el audio.'),
          Q('¿Por qué el auricular de una galena debe ser de alta impedancia (piezoeléctrico)?', ['La señal tiene muy poca potencia y uno de baja impedancia la cargaría', 'Para tener más graves', 'Por seguridad', 'Para el estéreo'], 'Cargar el circuito también baja la Q.', { c: 'rf_q' }),
          I('<b>Regenerativo</b>: un transistor amplifica y parte de la salida vuelve a la entrada justo por debajo de oscilar: ganancia y Q se disparan. Sensible y sencillo, pero delicado y, si oscila, radia por la antena e interfiere.'),
          I('<b>Superregenerativo</b>: deja oscilar y corta la oscilación miles de veces por segundo. Muy sensible y baratísimo (los receptores de 433 MHz de céntimos), pero poco selectivo, ruidoso y también radia algo.'),
          I('<b>Superheterodino</b>: filtro de entrada, amplificador de RF, mezclador con el oscilador local, filtro y amplificadores de FI, detector. Con FI de 10,7 MHz la imagen queda 21,4 MHz más allá.', { tune: { viz: 'rf_superhet', params: SH(100, 10.7, 1) } }),
          TU('Con una FI de 455 kHz la imagen cae dentro de la banda de FM. Elige una FI que la saque.', 'rf_superhet', SH(96.3, 0.455, 1), { q: 'outBand', min: 1, max: 1, text: 'Objetivo: imagen fuera de 87,5–108 MHz', hint: 'Prueba con 10,7 MHz.' }, 'La banda de FM mide 20,5 MHz y 2 × 10,7 = 21,4 MHz: la imagen siempre cae fuera. Por eso se eligió 10,7 MHz.', { c: 'rf_image' }),
          G('rf_image'),
          Q('¿Qué filtro elimina la frecuencia imagen en un superheterodino?', ['El de RF, antes del mezclador', 'El de FI', 'El de audio', 'Ninguno: no se puede'], 'Después del mezclador, imagen y señal están en la misma FI.', { c: 'rf_image' }),
          { t: 'order', q: 'Ordena la cadena de un superheterodino.', items: ['Antena', 'Filtro y amplificador de RF', 'Mezclador con el oscilador local', 'Filtro y amplificadores de FI', 'Detector o demodulador', 'Amplificador de audio'], e: 'La FI fija es el corazón del diseño.', c: 'rf_rxtypes' },
          Q('¿Qué tipo de receptor llevan los módulos de 433 MHz más baratos, como el XY-MK-5V?', ['Superregenerativo', 'Superheterodino de doble conversión', 'SDR', 'Galena'], 'Por eso son tan ruidosos y poco selectivos.', { c: 'rf_rxtypes' })
        ]),
        L('rf31', 'Conversión directa, I/Q y SDR', 'code', ['rf_sdr', 'rf_iq', 'rf_sdrghost'], [
          I('<b>Conversión directa</b>: el oscilador local está en la misma frecuencia que la señal y la FI es cero. Simple y sin imagen lejana, pero con dos problemas: frecuencias por encima y por debajo se confunden, y aparece un pico de continua en el centro.'),
          I('Solución: dos mezcladores con el oscilador desfasado 90° entre ellos. Salen <b>I</b> (en fase) y <b>Q</b> (en cuadratura). Juntas forman el número complejo I + jQ, que gira en un sentido u otro según la señal esté por encima o por debajo.'),
          Q('Con solo la salida I, una señal 10 kHz por encima y otra 10 kHz por debajo de la sintonía…', ['Dan la misma salida: no se distinguen', 'Se distinguen por el volumen', 'Se cancelan siempre', 'Se suman en 20 kHz'], 'Hace falta Q para saber el signo.', { c: 'rf_iq' }),
          I('<b>Radio definida por software</b>: tras el mezclador I/Q, dos conversores muestrean I y Q. Filtrar y demodular AM, FM o digital es software. Con muestras complejas a Fs, ves Fs hercios de espectro.'),
          Q('Un SDR muestrea a 2,048 MS/s. ¿Cuántas emisoras de FM de 200 kHz caben a la vez en la pantalla, como mucho?', ['Unas 10', 'Una', 'Unas 100', 'Ninguna'], '2,048 MHz / 0,2 MHz ≈ 10.', { c: 'rf_sdr' }),
          I('<b>Nyquist</b>: para muestrear una señal real necesitas más del doble de su ancho; con I/Q, la tasa compleja cubre de −Fs/2 a +Fs/2. Lo que queda fuera del filtro antialias se pliega y aparece en otro sitio: un <b>alias</b>.'),
          Q('¿Qué pasa con una señal que cae fuera del ancho del SDR y no está bien filtrada?', ['Puede aparecer plegada en otra posición: un alias', 'Desaparece sin más', 'Se amplifica', 'Se convierte en audio'], 'Por eso hay filtros antes del conversor.', { c: 'rf_sdr' }),
          I('Los chips de radio modernos (SX1276, nRF24, ESP32) son por dentro receptores de FI baja o cero con demodulación digital: la radio de tus módulos es, en el fondo, un SDR especializado.'),
          Q('¿Por qué el RTL-SDR muestra un pico fijo en el centro de la pantalla?', ['Es un residuo de continua del proceso de conversión', 'Hay una emisora en esa frecuencia', 'Es un fallo del ordenador', 'Es ruido térmico'], 'Desplaza un poco la sintonía para apartarlo de lo que quieres oír.', { c: 'rf_sdrghost' }),
          { t: 'match', q: 'Une cada concepto con su significado.', pairs: [['Muestras I/Q', 'Distinguen frecuencias positivas y negativas'], ['Tasa de muestreo', 'Ancho de espectro visible'], ['Alias', 'Señal plegada de fuera de banda'], ['Pico central', 'Residuo de continua']], c: 'rf_sdr' }
        ]),
        PRJ('rf-p8', 'Proyecto: radio de galena con bobina hecha a mano', 'rf_crystal'),
        PRJ('rf-p9', 'Proyecto: receptor de FM con RDA5807 y pantalla', 'rf_fm')
      ] },

      { id: 'rf-m7', title: 'Módulos de radio con microcontroladores', desc: '433 MHz, nRF24L01+, LoRa, RFID y NFC, GNSS y BLE desde la radio: cómo funcionan, cómo se configuran y cómo se usan bien.', nodes: [
        L('rf32', '433 MHz: OOK, receptores y Manchester', 'antenna', ['rf_manchester', 'rf_rxtypes', 'rf_rfsec', 'rf_duty'], [
          I('El emisor más simple: un oscilador estabilizado con un resonador SAW de 433,92 MHz que se enciende y se apaga con el pin de datos (<b>OOK</b>). El FS1000A funciona de 3 a 12 V: a más tensión, más potencia.'),
          I('Los receptores tienen <b>control automático de ganancia</b>: sin señal, suben la ganancia al máximo y por la salida sale ruido aleatorio. Por eso toda trama empieza con un <b>preámbulo</b> (para que el receptor se ajuste) y un <b>sincronismo</b> (para saber dónde empiezan los datos).'),
          Q('Conectas la salida de un receptor de 433 MHz al Arduino y, sin ningún mando, lees cambios todo el rato. ¿Qué pasa?', ['Es normal: el control de ganancia amplifica el ruido', 'El receptor está roto', 'Alguien transmite siempre', 'Falta una resistencia de pull-up'], 'El decodificador debe saber ignorarlo.', { c: 'rf_rxtypes' }),
          I('<b>Manchester</b>: cada bit es una transición en mitad del bit. La señal nunca se queda quieta, el receptor no pierde la referencia y el reloj se recupera de los propios datos.\nOjo: hay dos convenios opuestos; emisor y receptor deben usar el mismo.'),
          Q('¿Qué hace esta función?', ['Envía un bit en Manchester: un 1 como alto→bajo y un 0 como bajo→alto', 'Envía dos bits seguidos', 'Lee un bit del receptor', 'Genera la portadora de 433 MHz'], 'Cada bit son dos medios bits con niveles opuestos.', { code: 'void bitManchester(bool b) {\n  if (b) { medioBit(1); medioBit(0); }\n  else   { medioBit(0); medioBit(1); }\n}', c: 'rf_manchester' }),
          Q('En Manchester con medio bit de 500 µs, ¿cuánto dura como máximo un nivel dentro de los datos?', ['1000 µs', '500 µs', '1500 µs', 'Ilimitado'], 'Un 0 seguido de un 1 deja dos medios bits altos seguidos. Un sincronismo de 1,5 ms es inconfundible.', { c: 'rf_manchester' }),
          I('Mandos comerciales: los de <b>código fijo</b> envían siempre la misma trama: quien la grabe puede repetirla. Los de <b>código variable</b> (rolling code) cambian cada vez con una clave secreta. Para tus proyectos: contador + autenticación.'),
          Q('¿Por qué un mando de código fijo no es seguro para una puerta?', ['Basta con grabar la trama y repetirla', 'Porque su alcance es corto', 'Porque usa 433 MHz', 'Porque usa Manchester'], 'Es un ataque de repetición.', { c: 'rf_rfsec' }),
          I('Antena: un hilo de unos 17 cm (λ/4) en emisor y receptor multiplica el alcance. Límites: unos 10 mW PRA en 433,05–434,79 MHz y ciclo de trabajo limitado: tramas cortas y pocas repeticiones.'),
          Nm('Tu trama dura 66 ms y la envías 3 veces por pulsación. ¿Cuántas pulsaciones caben en una hora con un 10 % de ciclo de trabajo?', 1818, '', '360 s / (3 × 0,066 s) ≈ 1818.', { tol: 2, c: 'rf_duty' }),
          Q('XY-MK-5V frente a RXB6: ¿qué diferencia hay?', ['El RXB6 es superheterodino: más selectivo y estable', 'Son iguales', 'El XY-MK-5V es más selectivo', 'El RXB6 también transmite'], 'Para proyectos fiables, superheterodino.', { c: 'rf_rxtypes' })
        ]),
        PRJ('rf-p10', 'Proyecto: mando de 433 MHz con protocolo propio', 'rf_remote'),
        L('rf33', 'nRF24L01+ a fondo', 'wifi', ['rf_nrf', 'rf_24ghz', 'rf_supply'], [
          I('El <b>nRF24L01+</b> es un transceptor de 2,4 GHz con GFSK a 250 kbps, 1 Mbps o 2 Mbps, controlado por SPI. Canales de 1 MHz: <b>f = 2400 + canal MHz</b> (0–125). Potencia de 0, −6, −12 o −18 dBm; sensibilidad de unos −94 dBm a 250 kbps.'),
          G('rf_nrf'),
          Q('¿Qué canales puedes usar para transmitir en Europa?', ['Como mucho del 0 al 83 (mejor del 1 al 80): la banda ISM acaba en 2483,5 MHz', 'Todos, del 0 al 125', 'Solo el 76', 'Del 84 al 125'], 'Por encima, solo escuchar.', { c: 'rf_24ghz' }),
          I('<b>Direcciones y tuberías</b>: el receptor escucha hasta 6 direcciones (pipes) a la vez. Las direcciones son de 3 a 5 bytes; las tuberías 1 a 5 comparten los 4 bytes altos. El emisor usa la tubería 0 para recibir el ACK.'),
          I('<b>Enhanced ShockBurst</b>: el receptor contesta con un ACK automático; si no llega, el emisor reintenta hasta 15 veces con una espera configurable (250–4000 µs). write() devuelve verdadero si llegó el ACK. Hasta 32 bytes por paquete, con CRC.'),
          Q('Con esta configuración, ¿cuánto espera el emisor entre reintentos y cuántos hace como máximo?', ['1,5 ms y 15 reintentos', '5 ms y 15 reintentos', '250 µs y 5 reintentos', '15 ms y 5 reintentos'], '(5 + 1) × 250 µs = 1500 µs.', { code: 'radio.setRetries(5, 15);', c: 'rf_nrf' }),
          I('El enemigo número uno: la <b>alimentación</b>. Al transmitir pide picos de corriente que el regulador de 3,3 V de muchas placas no da limpios. Un condensador de 10 µF pegado al módulo resuelve la mayoría de fallos “misteriosos”. Nunca a 5 V (los pines de datos sí toleran 5 V).'),
          Q('Tu nRF24 funciona en la mesa con USB y falla con pilas a 5 m. ¿Qué pruebas primero?', ['Un condensador de 10–100 µF en su alimentación', 'Pasar al canal 125', 'Subir a 2 Mbps', 'Quitar la antena'], 'Primero la alimentación, siempre.', { c: 'rf_supply' }),
          I('Coexistencia: un canal WiFi de 20 MHz tapa unos 20 canales del nRF24. Las velocidades bajas toleran mejor el ruido. A 2 Mbps, separa los canales al menos 2 MHz.'),
          Q('¿Qué hace radio.testRPD()?', ['Dice si la potencia recibida en el canal supera unos −64 dBm', 'Da el RSSI exacto en dBm', 'Comprueba el CRC', 'Mide la batería'], 'Es un detector de un solo bit, no un medidor.', { c: 'rf_nrf' }),
          { t: 'match', q: 'Une cada opción con su efecto.', pairs: [['250 kbps', 'Más alcance'], ['2 Mbps', 'Más velocidad, menos alcance'], ['ACK automático', 'Confirmación sin escribir código'], ['Canal 76', '2476 MHz']], c: 'rf_nrf' }
        ]),
        PRJ('rf-p11', 'Proyecto: telemetría nRF24 con estadística de pérdidas', 'rf_nrflink'),
        PRJ('rf-p12', 'Proyecto: analizador de ocupación de 2,4 GHz', 'rf_scanner'),
        L('rf34', 'LoRa con SX1276 y SX1262', 'antenna', ['rf_loracfg', 'rf_lora', 'rf_lorasnr', 'rf_eirp', 'rf_duty', 'rf_debug'], [
          I('Transceptores de Semtech: <b>SX1276/77/78</b> (familia veterana, hasta +20 dBm) y <b>SX1262</b> (más moderno, menos consumo en recepción, hasta +22 dBm). Módulos típicos: RFM95W (SX1276, 868 MHz), Ra-01 (SX1278, 433 MHz) y placas con ESP32 integrado. Son de 3,3 V: no toleran 5 V en sus pines.'),
          I('Deben coincidir en los dos extremos: <b>frecuencia, SF, BW, tasa de codificación</b> (4/5 a 4/8), <b>palabra de sincronismo</b>, longitud de preámbulo y CRC. Si uno solo difiere, no hay comunicación.'),
          Q('Dos nodos LoRa no se oyen. Uno usa SF9 a 125 kHz y el otro SF9 a 250 kHz. ¿Qué pasa?', ['El ancho de banda distinto impide la recepción', 'Funciona igual', 'Solo va más lento', 'Mejora el alcance'], 'Todo tiene que coincidir.', { c: 'rf_loracfg' }),
          Q('Con una antena dipolo (2,15 dBi) y 1 dB de cable, ¿qué ERP emite este nodo?', ['13 dBm ERP: dentro del límite de 14 dBm', '15,15 dBm ERP: fuera del límite', '14 dBm ERP exactos', '16,15 dBm ERP'], 'ERP = 14 − 1 + 2,15 − 2,15 = 13 dBm: el dipolo es la referencia del ERP.', { code: 'LoRa.setTxPower(14);   // dBm en el conector', c: 'rf_eirp' }),
          I('Tiempo en aire: Tsímbolo = 2^SF / BW; preámbulo de 8 + 4,25 símbolos; la carga útil se agrupa en bloques según SF y CR. Con SF11 y SF12 a 125 kHz se activa la <b>optimización de baja velocidad</b> (el símbolo supera 16 ms).'),
          G('rf_tsym'),
          G('rf_toaRatio'),
          I('RSSI y SNR del paquete: con señal fuerte, mira el RSSI; cerca del límite, la SNR. Si la SNR se acerca al mínimo del SF (−7,5 dB en SF7 … −20 dB en SF12), estás al borde.'),
          Q('Un paquete llega con SNR de +8 dB usando SF12. ¿Qué harías?', ['Bajar el SF: te sobra margen', 'Subir el SF', 'Subir la potencia', 'Nada'], 'Menos tiempo en aire, menos batería, menos ocupación.', { c: 'rf_lorasnr' }),
          I('Alcance: a ras de suelo en ciudad, de cientos de metros a pocos km; entre puntos altos con visión directa, decenas de km o más. La altura y la zona de Fresnel cuentan más que el SF.', { c: 'rf_fresnel' }),
          G('rf_duty'),
          Q('¿Qué registro del SX1276 lees para comprobar que el SPI funciona (debe devolver 0x12)?', ['RegVersion (0x42)', 'RegFifo (0x00)', 'RegOpMode (0x01)', 'RegPaConfig (0x09)'], 'Leer un valor conocido es la mejor prueba de vida.', { c: 'rf_debug' })
        ]),
        PRJ('rf-p13', 'Proyecto: prueba de alcance LoRa con mapa', 'rf_lorarange'),
        L('rf35', 'RFID de 125 kHz y NFC de 13,56 MHz', 'shield', ['rf_nfc', 'rf_rfsec', 'rf_ethics', 'rf_bands', 'rf_wave'], [
          I('RFID pasivo y NFC funcionan por <b>acoplamiento inductivo</b>: el lector crea un campo magnético alterno con su bobina; la etiqueta, con otra bobina sintonizada, se alimenta de él y responde modulando su carga. Es campo cercano: unos centímetros.'),
          { t: 'match', q: 'Une cada frecuencia con su uso.', pairs: [['125 kHz', 'Llaveros EM4100 de solo lectura'], ['13,56 MHz', 'NFC, MIFARE, NTAG y tarjetas de transporte'], ['865–868 MHz', 'RFID UHF de inventario a varios metros']], c: 'rf_bands' },
          I('En 13,56 MHz: <b>ISO 14443</b> A/B (MIFARE, NTAG, pagos, documentos de identidad) e ISO 15693 (algo más de alcance). <b>NFC</b> es el ecosistema que usan los móviles, basado en ISO 14443 y en los tipos de etiqueta del NFC Forum.'),
          Q('Una tarjeta NFC no tiene pilas. ¿De dónde saca la energía?', ['Del campo magnético del lector', 'De una batería de litio', 'De la luz', 'Del calor de la mano'], 'Lector y tarjeta forman un transformador con aire en medio.', { c: 'rf_nfc' }),
          I('Lectores: <b>RC522</b> (MFRC522, SPI, 3,3 V, solo ISO 14443 A) y <b>PN532</b> (I²C, SPI o UART, más completo, puede emular etiquetas). En 125 kHz, el <b>RDM6300</b> entrega el número por UART.'),
          Q('Pegas una etiqueta NFC sobre una caja metálica y deja de leerse. ¿Por qué?', ['El metal desintoniza la bobina y absorbe el campo', 'La caja bloquea el WiFi', 'El lector es de 125 kHz', 'La etiqueta caduca'], 'Hay etiquetas con ferrita para superficies metálicas.', { c: 'rf_nfc' }),
          Nm('¿Cuánto mide la longitud de onda de 13,56 MHz, en metros?', 22.1, 'm', '300 / 13,56 ≈ 22 m. Con el lector a 5 cm estás muy dentro del campo cercano: es un transformador, no una onda que viaja.', { tol: 0.2, c: 'rf_wave' }),
          I('Seguridad: el <b>UID</b> no es secreto (cualquiera lo lee) y existen tarjetas con UID reescribible. MIFARE Classic usa un cifrado roto hace años. Para seguridad real, tarjetas con criptografía moderna (AES), como DESFire EV2/EV3 o NTAG 424 DNA.'),
          Q('¿Es seguro abrir una puerta comprobando solo el UID?', ['No: el UID se lee y se puede clonar', 'Sí: el UID es único y secreto', 'Sí, si la tarjeta es azul', 'Solo si el lector es caro'], 'Identifica, pero no autentica.', { c: 'rf_rfsec' }),
          I('Ética y ley: lee solo tus tarjetas. No leas tarjetas bancarias, documentos de identidad ni tarjetas de acceso de otras personas o edificios; copiarlas puede ser delito.'),
          Q('Un compañero te pide clonar la tarjeta de acceso de su oficina para no olvidarla. ¿Qué respondes?', ['Que la pida a quien gestiona el acceso: copiarla sin permiso no es aceptable', 'La copias con el RC522', 'La copias si es MIFARE Classic', 'Le prestas tu lector'], 'El control de acceso no es tuyo.', { c: 'rf_ethics' })
        ]),
        PRJ('rf-p14', 'Proyecto: control de acceso RFID para tu taller', 'rf_rfid'),
        L('rf36', 'GNSS: cómo funciona el GPS', 'rocket', ['rf_gnss', 'rf_nmea', 'rf_speed', 'rf_obstacle'], [
          I('<b>GNSS</b> es el nombre genérico: GPS (EE. UU.), Galileo (UE), GLONASS (Rusia) y BeiDou (China). Los receptores modernos usan varias a la vez. Los satélites GPS orbitan a unos 20 200 km y emiten su señal civil principal en L1, 1575,42 MHz.'),
          I('Cada satélite emite su hora (relojes atómicos) y su órbita. El receptor mide el retraso de cada señal: la luz recorre 30 cm por nanosegundo, así que 1 µs de error son 300 m. Con <b>4 satélites</b> resuelve x, y, z y el error de su propio reloj.'),
          Q('¿Cuántos satélites necesitas, como mínimo, para una posición 3D?', ['4', '3', '2', '24'], 'Tres coordenadas más el error del reloj del receptor.', { c: 'rf_gnss' }),
          Nm('Un error de reloj de 10 ns, ¿cuántos metros de error de distancia supone?', 3, 'm', '0,3 m por ns × 10.', { tol: 0.05, c: 'rf_speed' }),
          I('La señal llega con unos −130 dBm: por debajo del ruido térmico de su ancho de banda. Se recupera porque cada satélite usa un código pseudoaleatorio de 1,023 Mchip/s que el receptor conoce y busca por correlación.'),
          Q('¿Por qué el GPS no funciona en un sótano?', ['La señal llega muy débil y los obstáculos la atenúan por debajo de lo recuperable', 'Los satélites no apuntan allí', 'Por la ley', 'Por el frío'], 'No hay margen para paredes.', { c: 'rf_obstacle' }),
          I('<b>NMEA 0183</b>: el módulo envía texto por UART (normalmente a 9600 baudios). Cada trama empieza por $, lleva un emisor (GP, GN, GA…) y un tipo (GGA posición, RMC mínimos recomendados, GSV satélites…), campos separados por comas y termina en *XX: el XOR de todos los caracteres entre $ y *.'),
          Q('En esta trama GGA, ¿cuántos satélites se están usando?', ['8', '1', '545', '9'], 'Tras la calidad de la posición (1) va el número de satélites (08) y luego la HDOP.', { code: '$GPGGA,092750.000,4026.5512,N,00342.1820,W,1,08,0.9,545.4,M,51.1,M,,*4E', c: 'rf_nmea' }),
          Q('La latitud llega como “4026.5512,N”. ¿Cuánto es en grados decimales?', ['40,4425°', '40,265512°', '4026,5512°', '40,5512°'], 'Formato ggmm.mmmm: 40° + 26,5512′ / 60 = 40,4425°.', { code: '4026.5512,N', c: 'rf_nmea' }),
          I('Antenas: parche cerámico de polarización circular mirando al cielo, o <b>antena activa</b> (con LNA, alimentada por el propio coaxial) para instalarla fuera. Errores típicos: multitrayecto entre edificios, poco cielo visible (HDOP alta) y la ionosfera.'),
          Q('¿Qué indica una HDOP alta?', ['Mala geometría de los satélites: la posición es menos precisa', 'Muchos satélites', 'Señal muy fuerte', 'Que el reloj va bien'], 'Satélites agrupados en una zona del cielo dan mala geometría.', { c: 'rf_gnss' }),
          Q('En un arranque en frío el módulo tarda medio minuto o más en dar posición. ¿Por qué?', ['Tiene que encontrar satélites y descargar sus datos de órbita', 'Se está calentando', 'Espera a la red móvil', 'Es una avería'], 'En caliente, con los datos guardados, tarda unos segundos.', { c: 'rf_gnss' })
        ]),
        PRJ('rf-p15', 'Proyecto: registrador GPS con tarjeta SD', 'rf_gps'),
        L('rf37', 'BLE visto desde la radio', 'wifi', ['rf_pathlaw', 'rf_24ghz', 'rf_sens', 'rf_rfsec'], [
          I('Bluetooth Low Energy usa 2402–2480 MHz con <b>40 canales</b> de 2 MHz: 3 de anuncio (37, 38 y 39, en 2402, 2426 y 2480 MHz) y 37 de datos con salto de frecuencia adaptativo.'),
          Q('¿Por qué los canales de anuncio de BLE están en 2402, 2426 y 2480 MHz?', ['Caen en los huecos que dejan los canales WiFi 1, 6 y 11', 'Son los más potentes', 'Por casualidad', 'Porque son los únicos legales'], 'Así los anuncios esquivan las redes WiFi más comunes.', { c: 'rf_24ghz' }),
          I('Modulación GFSK a 1 Mbps (LE 1M). BLE 5 añade 2 Mbps (más rápido, menos alcance) y la <b>PHY codificada</b> (redundancia ×2 u ×8: hasta unas cuatro veces más alcance a cambio de velocidad). Potencias típicas de −20 a +10 dBm.'),
          Q('Quieres más alcance con BLE 5 sin subir la potencia. ¿Qué PHY usas?', ['La codificada (Coded PHY)', 'La de 2 Mbps', 'La de 1 Mbps', 'Ninguna'], 'Redundancia a cambio de velocidad.', { c: 'rf_sens' }),
          I('Distancia por RSSI con el modelo log-distancia: <b>RSSI = A − 10·n·log₁₀(d)</b>, con A el RSSI a 1 m.\nDespejando: <b>d = 10^((A − RSSI) / (10·n))</b>.'),
          Nm('A = −59 dBm a 1 m, n = 2 y mides −79 dBm. ¿Distancia en m?', 10, 'm', '10^(20 / 20) = 10 m.', { tol: 0.2, c: 'rf_pathlaw' }),
          Q('En ese ejemplo el RSSI fluctúa ±6 dB. ¿Entre qué distancias varía la estimación?', ['Entre unos 5 y unos 20 m', 'Entre 9,4 y 10,6 m', 'No varía', 'Entre 0 y 100 m'], '±6 dB con n = 2 es ×2 o ÷2 en distancia.', { c: 'rf_pathlaw' }),
          I('Por qué falla: multitrayecto, el cuerpo humano, la orientación de las antenas y que los tres canales de anuncio se desvanecen distinto. Filtra (media, mediana) y decide con histéresis; para posición fina hay otras técnicas (ángulo de llegada, sondeo de canal).'),
          G('rf_distx'),
          Q('¿Por qué los móviles cambian su dirección BLE cada pocos minutos?', ['Para que no se pueda seguir a una persona por una dirección fija', 'Para ahorrar batería', 'Por interferencias', 'Por la ley de 2,4 GHz'], 'Direcciones aleatorias por privacidad.', { c: 'rf_rfsec' })
        ]),
        PRJ('rf-p16', 'Proyecto: baliza BLE y distancia por RSSI', 'rf_ble')
      ] },

      { id: 'rf-m8', title: 'Escuchar el espectro y depurar', desc: 'SDR en la práctica, qué escuchar y cómo, satélites meteorológicos, ruido doméstico y un método para depurar cualquier radio. Con el proyecto final.', nodes: [
        L('rf38', 'SDR en la práctica: el RTL-SDR', 'code', ['rf_sdrghost', 'rf_listen', 'rf_ppm', 'rf_inprot'], [
          I('El RTL-SDR nació de un sintonizador de TDT por USB: un chip RTL2832U con un conversor de 8 bits y un sintonizador (R820T2 o R828D). Cubre aproximadamente de 24 MHz a 1,7 GHz (algunas versiones añaden HF) y muestrea de forma estable hasta unos 2,4 MS/s.'),
          I('Software: <b>SDR++</b> (multiplataforma), <b>SDR#</b> (Windows) o <b>GQRX</b> (Linux y Mac) para explorar; <b>rtl_433</b> para sensores de 433/868 MHz; <b>dump1090</b> o readsb para aviones; <b>SatDump</b> para satélites.'),
          { t: 'match', q: 'Une cada programa con su uso.', pairs: [['SDR++ o GQRX', 'Explorar el espectro'], ['rtl_433', 'Sensores de 433 y 868 MHz'], ['dump1090', 'Aviones (ADS-B)'], ['SatDump', 'Satélites meteorológicos']], c: 'rf_listen' },
          I('<b>Ganancia</b>: con 8 bits, el margen dinámico es de unos 45–50 dB. Mucha ganancia satura con emisoras fuertes; poca deja la señal hundida en el ruido del conversor. Sube la ganancia hasta que el suelo de ruido suba un poco al conectar la antena, y no más.'),
          Q('Subes la ganancia al máximo y aparecen emisoras de FM en 150 MHz. ¿Qué son?', ['Productos espurios por saturación', 'Emisoras nuevas', 'Satélites', 'Siempre interferencias del USB'], 'Baja la ganancia: si desaparecen, eran fantasmas.', { c: 'rf_sdrghost' }),
          I('Corrección en <b>ppm</b>: los cristales baratos se desvían decenas de ppm (a 1 GHz, 50 ppm son 50 kHz). Los modelos con TCXO apenas necesitan corrección; si no, calibra con una señal de frecuencia conocida.', { c: 'rf_ppm' }),
          Nm('Un SDR con +30 ppm de error sintonizado en 433,92 MHz. ¿Cuántos kHz se desvía?', 13.02, 'kHz', '433,92·10⁶ × 30·10⁻⁶ ≈ 13 kHz.', { tol: 0.2, c: 'rf_ppm' }),
          I('Señales que no existen: el pico central, imágenes por desequilibrio I/Q, espurios del USB y del ordenador (sobre todo en HF) y armónicos de emisoras fuertes. Truco: mueve un poco la sintonía; una señal real se desplaza en pantalla igual que la sintonía, un espurio interno no.'),
          Q('Mueves la sintonía 100 kHz y una señal se desplaza en sentido contrario o no se mueve. ¿Qué es?', ['Probablemente un espurio o una imagen, no una señal real', 'Una señal real con Doppler', 'Un satélite', 'Una emisora de FM'], 'Las señales reales están fijas en frecuencia absoluta.', { c: 'rf_sdrghost' }),
          I('El SDR solo recibe: nunca conectes la salida de un emisor a su entrada. Los modelos con <b>bias-tee</b> alimentan un LNA o una antena activa por el coaxial: actívalo solo si lo que hay al otro lado lo admite.'),
          Q('Con el bias-tee activado conectas una antena que es un cortocircuito en continua (un dipolo plegado o un bucle). ¿Qué pasa?', ['Cortocircuitas la alimentación del bias-tee y puede dañarse', 'Nada', 'Mejora la señal', 'La antena emite'], 'Mira siempre qué hay al otro lado del coaxial.', { c: 'rf_inprot' })
        ]),
        L('rf39', 'Qué escuchar: FM, aviones, sensores y aficionados', 'antenna', ['rf_listen', 'rf_ethics', 'rf_ham', 'rf_horizon'], [
          I('<b>Radio FM</b>: en SDR++ elige WFM. Verás la emisora de unos 200 kHz de ancho y, en la señal demodulada, el tono piloto del estéreo (19 kHz) y el RDS (57 kHz). Muchos programas decodifican el RDS.'),
          Q('¿Qué es la señal de 19 kHz que aparece en la FM demodulada?', ['El tono piloto del estéreo', 'Ruido', 'El RDS', 'Los graves del audio'], 'Su segundo armónico (38 kHz) sirve para recuperar la diferencia entre canales.', { c: 'rf_listen' }),
          I('<b>ADS-B</b>: los aviones transmiten en 1090 MHz su identificación, posición, altitud y velocidad varias veces por segundo para que otros aviones y los controladores los vean. Con un RTL-SDR y una antena sencilla recibes aviones a cientos de km.'),
          Nm('Un avión a 9000 m y tu antena a 16 m. ¿Horizonte radio en km?', 407.3, 'km', '4,12 × (√9000 + √16) ≈ 4,12 × 98,9.', { tol: 5, c: 'rf_horizon' }),
          I('<b>Sensores de 433 y 868 MHz</b>: estaciones meteorológicas, termómetros, sensores de presión de neumáticos… rtl_433 decodifica cientos de modelos. Úsalo para tus propios sensores; no publiques datos de aparatos ajenos que puedan identificar a nadie.'),
          Q('rtl_433 te muestra los datos de la estación meteorológica del vecino. ¿Qué haces?', ['Nada con ellos: ni los publicas ni los usas', 'Los publicas en internet', 'Le cambias la configuración', 'Le interfieres'], 'Respeto a la privacidad.', { c: 'rf_ethics' }),
          I('<b>Radioaficionados</b>: en 2 m (144–146 MHz) hay repetidores de FM y APRS en 144,800 MHz (posiciones y mensajes en paquetes, públicos por diseño). En 70 cm (430–440 MHz), más repetidores. Escuchar es libre; transmitir exige licencia.'),
          I('Más: barcos (AIS, en torno a 162 MHz), balizas, la Estación Espacial en 145,800 MHz durante eventos programados de SSTV, satélites de aficionados… Comprueba siempre que la información de frecuencias está al día.'),
          Q('Oyes un repetidor de 2 m y quieres contestar. ¿Qué necesitas?', ['Licencia de radioaficionado e indicativo', 'Nada', 'Un SDR más caro', 'Un permiso municipal'], 'El RTL-SDR, además, no transmite.', { c: 'rf_ham' }),
          { t: 'match', q: 'Une cada frecuencia con lo que se oye.', pairs: [['1090 MHz', 'ADS-B de aviones'], ['144,800 MHz', 'APRS en Europa'], ['87,5–108 MHz', 'Radio FM'], ['433,92 MHz', 'Sensores domésticos y mandos']], c: 'rf_listen' }
        ]),
        PRJ('rf-p17', 'Proyecto: receptor ADS-B con antena casera', 'rf_adsb'),
        L('rf40', 'Satélites meteorológicos: de APT a LRPT', 'rocket', ['rf_listen', 'rf_doppler', 'rf_filters', 'rf_pathlaw'], [
          I('Los satélites meteorológicos de órbita polar pasan a unos 800 km de altura; cada pase visible dura unos 10–15 minutos. Durante décadas, los NOAA 15, 18 y 19 emitieron imágenes analógicas <b>APT</b> en 137 MHz, fáciles de recibir con un RTL-SDR.'),
          I('Esa época ha terminado: NOAA retiró el NOAA-18 en junio de 2025 y después los NOAA-15 y NOAA-19. Con un tutorial antiguo de APT no recibirás nada. Comprueba siempre el estado actual de un satélite antes de planificar.'),
          Q('Encuentras un tutorial de 2019 para recibir el NOAA-19. ¿Qué haces primero?', ['Comprobar si el satélite sigue emitiendo hoy', 'Construir la antena del tutorial', 'Comprar el mismo SDR', 'Esperar al próximo pase'], 'Los satélites también se jubilan.', { c: 'rf_listen' }),
          I('La alternativa al alcance de un RTL-SDR: los <b>Meteor-M</b> rusos emiten <b>LRPT</b>, una señal digital QPSK en torno a 137,1 o 137,9 MHz (según el satélite y la época), con imágenes por canales. SatDump la demodula y decodifica.'),
          I('Antena: polarización circular y cobertura de todo el cielo. Opciones: <b>dipolo en V</b> (fácil: dos brazos de unos 53 cm a 120°, horizontal) o <b>QFH</b> (más trabajo, mejor). Lejos de fuentes de ruido y con horizonte despejado.', { c: 'rf_polar' }),
          Q('¿Por qué un pase con elevación máxima de 70° suele dar mejor imagen que uno de 15°?', ['El satélite está más cerca y la señal atraviesa menos obstáculos', 'Porque dura menos', 'Por el Doppler', 'Da igual'], 'Más distancia y más obstáculos cerca del horizonte.', { c: 'rf_pathlaw' }),
          Nm('Un satélite se acerca a 7 km/s en tu línea de visión. A 137 MHz, ¿desplazamiento Doppler en kHz?', 3.2, 'kHz', 'Δf = f · v / c = 137·10⁶ × 7000 / 3·10⁸ ≈ 3,2 kHz.', { tol: 0.1, c: 'rf_doppler' }),
          I('Planificación: predice los pases con su elevación máxima (programas de seguimiento con elementos orbitales actualizados). Por encima de 30–40° la señal es mucho mejor. Graba la señal I/Q para poder repetir el procesado con otros ajustes.'),
          Q('Las emisoras de FM saturan tu SDR cuando sintonizas 137 MHz. ¿Qué pones?', ['Un filtro de rechazo de la banda de FM', 'Más ganancia', 'Un cable más largo', 'Nada'], 'Están solo 30 MHz por debajo y son muy potentes.', { c: 'rf_filters' }),
          I('Más allá: los satélites polares también emiten <b>HRPT</b> en 1,7 GHz (más resolución) y hay geoestacionarios con enlaces de datos en banda L. Requieren parábolas, LNA específicos y, para los polares, seguimiento motorizado.')
        ]),
        PRJ('rf-p18', 'Proyecto: estación de satélites meteorológicos', 'rf_meteor'),
        L('rf41', 'Ruido e interferencias en casa', 'shield', ['rf_rfi', 'rf_24ghz', 'rf_pcb'], [
          I('El ruido de tu casa no es el térmico: fuentes conmutadas baratas, bombillas LED, adaptadores PLC (internet por la red eléctrica), inversores solares, placas de inducción, motores… Generan ruido de banda ancha, sobre todo en onda media y HF, a veces hasta VHF.'),
          Q('Al encender una bombilla LED barata, tu radio de onda media se llena de zumbido. ¿Qué es?', ['Interferencia de su fuente conmutada', 'Una emisora', 'La bombilla envía datos', 'Es imposible'], 'Conmuta a decenas de kHz con flancos bruscos.', { c: 'rf_rfi' }),
          I('El ruido sale por los cables (<b>conducido</b>) y estos lo radian como antenas (<b>radiado</b>). Casi siempre circula en <b>modo común</b> (igual por todos los hilos del cable): una ferrita alrededor del cable entero lo frena sin afectar a la corriente útil.'),
          Q('¿Por qué una ferrita de clip en el cable de un cargador reduce el ruido?', ['Frena la corriente de modo común que convierte el cable en antena', 'Filtra la continua', 'Aumenta la potencia', 'Aísla del calor'], 'La corriente útil va y vuelve por el mismo cable y no la nota.', { c: 'rf_rfi' }),
          I('Método: una radio de onda media de pilas entre emisoras; acércate a los sospechosos (el ruido sube mucho en campo cercano), confirma desenchufando uno a uno y mide con el SDR antes y después, siempre con la misma ganancia.'),
          { t: 'order', q: 'Ordena la caza de interferencias.', items: ['Medir el suelo de ruido de referencia', 'Recorrer la casa con la radio portátil', 'Desenchufar los sospechosos de uno en uno', 'Aplicar remedios (ferritas, sustituir)', 'Medir otra vez y comparar'], e: 'Sin medida de referencia no sabrás si has mejorado.', c: 'rf_rfi' },
          I('En 2,4 GHz: el microondas (2,45 GHz) tapa canales WiFi mientras funciona; también cámaras y vigilabebés antiguos, mandos de drones o auriculares. Cambiar de canal o pasar a 5 GHz suele bastar.'),
          Q('El WiFi se corta cada vez que calientas leche. ¿Solución sencilla?', ['Usar 5 GHz o un canal WiFi lejos de 2,45 GHz', 'Abrir el microondas', 'Subir la potencia del router por encima del límite', 'Calentar la leche en el fuego para siempre'], 'Huir de la frecuencia del microondas.', { c: 'rf_24ghz' }),
          I('Si la fuente es de un vecino, no toques su instalación: habla con él. Las interferencias graves y persistentes a servicios de radio pueden comunicarse a la administración de telecomunicaciones.'),
          Q('Tus propios diseños también generan ruido. ¿Qué lo reduce más?', ['Planos de masa, desacoplo, bucles pequeños y cables cortos', 'Cables más largos', 'Conmutar a frecuencias al azar', 'Pintar la placa'], 'Lo aprendiste en el módulo de circuitos de RF.', { c: 'rf_pcb' })
        ]),
        PRJ('rf-p19', 'Proyecto: cazador de interferencias', 'rf_rfi'),
        L('rf42', 'Depurar una radio: método', 'meter', ['rf_debug', 'rf_supply', 'rf_overload'], [
          I('Cuando “la radio no va”, la causa casi nunca es la radio. Sigue un orden: alimentación, comunicación con el chip, configuración, frecuencia real, antena y, al final, el enlace.'),
          { t: 'order', q: 'Ordena el método de depuración.', items: ['Alimentación: tensión y picos al transmitir', 'Comunicación con el chip: leer un registro conocido', 'Configuración idéntica en los dos extremos', 'Frecuencia real vista en el SDR', 'Antena y ROE', 'Prueba de enlace cerca y luego lejos'], e: 'De lo más básico a lo más complejo.', c: 'rf_debug' },
          Q('¿Cómo compruebas que el SPI con un SX1276 funciona?', ['Leyendo RegVersion: debe devolver 0x12', 'Mirando si se calienta', 'Transmitiendo a ciegas', 'Cambiando la antena'], 'Un valor conocido demuestra que el bus va bien.', { c: 'rf_debug' }),
          I('Alimentación: los picos al transmitir (decenas o cientos de mA durante ms) hunden reguladores pequeños y reinician placas. Síntoma: funciona con el USB del ordenador y falla con pilas, o falla justo al transmitir. Míralo con el osciloscopio en la alimentación del módulo.'),
          Q('Un ESP32 con LoRa se reinicia justo al enviar el primer paquete con la batería algo baja. ¿Qué sospechas?', ['Caída de tensión por el pico de corriente al transmitir', 'Un SF equivocado', 'La antena es corta', 'Falta un pull-up en un pulsador'], 'El pico hunde la tensión por debajo del umbral de reinicio.', { c: 'rf_supply' }),
          I('Frecuencia real: con el SDR comprueba que tu emisor está donde crees. Errores de cristal, una banda mal configurada (433 frente a 868) o un módulo de 915 MHz configurado a 868 se ven al instante en la cascada.'),
          I('Demasiado cerca también falla: dos módulos a toda potencia a 20 cm pueden saturar el receptor. Prueba a 1–2 m con la potencia mínima y luego aleja.'),
          Q('Dos nodos LoRa en la misma mesa a 14 dBm pierden paquetes; a 3 m funcionan. ¿Por qué?', ['El receptor se satura con tanta señal', 'La mesa siempre es metálica', 'Falta SF', 'Es imposible que fallen cerca'], 'Todo receptor tiene un nivel máximo de entrada.', { c: 'rf_overload' }),
          I('Cambia una sola cosa cada vez y apunta el resultado. Ten un par de módulos “de referencia” que sabes que funcionan: sustituir una pieza sospechosa por una buena es la prueba más rápida.'),
          Q('Cambias a la vez antena, SF y alimentación y el enlace mejora. ¿Qué has aprendido?', ['Poco: no sabes cuál de los tres cambios lo arregló', 'Que era la antena', 'Que era el SF', 'Todo'], 'Un cambio cada vez.', { c: 'rf_debug' })
        ]),
        PRJ('rf-p20', 'Proyecto final: estación de telemetría LoRa de largo alcance', 'rf_final')
      ] }
    ]
  });
})();
