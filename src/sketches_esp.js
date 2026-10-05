/* Voltio · programas para el ESP32. El ESP32 no se emula instrucción a instrucción
   (es un chip Xtensa de 240 MHz): cada programa se ejecuta como un modelo de su
   comportamiento con la misma lógica que el código que se muestra. */
const ESP_SKETCHES = {
  esp_blink: { name: 'Parpadeo (GPIO2)', code: `// El LED azul de la placa está en el GPIO2
void setup() {
  pinMode(2, OUTPUT);
}

void loop() {
  digitalWrite(2, HIGH);
  delay(1000);
  digitalWrite(2, LOW);
  delay(1000);
}`, run: function* (io) { io.mode('D2', 'out'); for (;;) { io.write('D2', 1); yield 1000; io.write('D2', 0); yield 1000; } } },
  esp_semaforo: { name: 'Semáforo (25, 26, 27)', code: `const int ROJO = 25, AMBAR = 26, VERDE = 27;

void setup() {
  pinMode(ROJO, OUTPUT);
  pinMode(AMBAR, OUTPUT);
  pinMode(VERDE, OUTPUT);
}

void luz(int pin, int ms) {
  digitalWrite(pin, HIGH);
  delay(ms);
  digitalWrite(pin, LOW);
}

void loop() {
  luz(VERDE, 3000);
  luz(AMBAR, 1000);
  luz(ROJO, 3000);
}`, run: function* (io) { ['D25', 'D26', 'D27'].forEach(p => io.mode(p, 'out')); for (;;) { for (const [p, t] of [['D27', 3000], ['D26', 1000], ['D25', 3000]]) { io.write(p, 1); yield t; io.write(p, 0); } } } },
  esp_boton: { name: 'Pulsador (GPIO4 → GPIO2)', code: `// Pulsador entre GPIO4 y GND, pull-up interna
void setup() {
  pinMode(4, INPUT_PULLUP);
  pinMode(2, OUTPUT);
}

void loop() {
  digitalWrite(2, digitalRead(4) == LOW ? HIGH : LOW);
}`, run: function* (io) { io.mode('D4', 'pullup'); io.mode('D2', 'out'); for (;;) { io.write('D2', io.read('D4') ? 0 : 1); yield 5; } } },
  esp_fade: { name: 'Fundido PWM (GPIO18)', code: `void setup() {
  pinMode(18, OUTPUT);
}

void loop() {
  for (int b = 0; b <= 255; b += 5) { analogWrite(18, b); delay(30); }
  for (int b = 255; b >= 0; b -= 5) { analogWrite(18, b); delay(30); }
}`, run: function* (io) { io.mode('D18', 'out'); for (;;) { for (let b = 0; b <= 255; b += 5) { io.pwm('D18', b / 255); yield 30; } for (let b = 255; b >= 0; b -= 5) { io.pwm('D18', b / 255); yield 30; } } } },
  esp_pot: { name: 'Potenciómetro (GPIO34 → GPIO18)', code: `// ADC de 12 bits: 0..4095 para 0..3,3 V
void setup() {
  pinMode(18, OUTPUT);
}

void loop() {
  int lectura = analogRead(34);
  analogWrite(18, lectura / 16);   // 0..255
  delay(10);
}`, run: function* (io) { io.mode('D18', 'out'); for (;;) { io.pwm('D18', Math.floor(io.aread('D34') / 16) / 255); yield 10; } } },
  /* --- Módulo base de Microcontroladores (m12) --- */
  mc_toggle: { name: 'Interruptor por flanco (GPIO4 → GPIO23)', code: `// Cada pulsación cambia el LED: flanco + antirrebote
const int BOTON = 4, LED = 23;
bool estadoLed = false;
bool antes = HIGH;             // lectura anterior (suelto = HIGH)
unsigned long tCambio = 0;     // cuándo se aceptó el último cambio

void setup() {
  pinMode(BOTON, INPUT_PULLUP);
  pinMode(LED, OUTPUT);
}

void loop() {
  bool ahora = digitalRead(BOTON);
  if (ahora != antes && millis() - tCambio > 30) {
    tCambio = millis();
    if (ahora == LOW) {        // flanco de bajada: se acaba de pulsar
      estadoLed = !estadoLed;
      digitalWrite(LED, estadoLed);
    }
    antes = ahora;
  }
}`, run: function* (io) {
    io.mode('D4', 'pullup'); io.mode('D23', 'out');
    let led = 0, antes = 1, tCambio = 0, t = 0;
    for (;;) {
      const ahora = io.read('D4');
      if (ahora !== antes && t - tCambio > 30) { tCambio = t; if (ahora === 0) { led = 1 - led; io.write('D23', led); } antes = ahora; }
      yield 2; t += 2;
    }
  } },
  mc_multi: { name: 'Dos ritmos con millis (GPIO25, GPIO26)', code: `// Dos tareas con su propio ritmo, sin delay()
const int LED_RAPIDO = 25, LED_LENTO = 26;
unsigned long tRapido = 0, tLento = 0;
bool rapido = false, lento = false;

void setup() {
  pinMode(LED_RAPIDO, OUTPUT);
  pinMode(LED_LENTO, OUTPUT);
}

void loop() {
  unsigned long ahora = millis();
  if (ahora - tRapido >= 250) {    // tarea 1: cada 250 ms
    tRapido = ahora;
    rapido = !rapido;
    digitalWrite(LED_RAPIDO, rapido);
  }
  if (ahora - tLento >= 1000) {    // tarea 2: cada 1000 ms
    tLento = ahora;
    lento = !lento;
    digitalWrite(LED_LENTO, lento);
  }
}`, run: function* (io) {
    io.mode('D25', 'out'); io.mode('D26', 'out');
    let tR = 0, tL = 0, r = 0, l = 0, t = 0;
    for (;;) {
      if (t - tR >= 250) { tR = t; r = 1 - r; io.write('D25', r); }
      if (t - tL >= 1000) { tL = t; l = 1 - l; io.write('D26', l); }
      yield 5; t += 5;
    }
  } },
  mc_fsm: { name: 'Semáforo con peatón (25, 26, 27 y GPIO4)', code: `// Semáforo con pulsador de peatón: máquina de estados
enum Estado { VERDE, AMBAR, ROJO };
Estado estado = VERDE;
const int ROJO_PIN = 25, AMBAR_PIN = 26, VERDE_PIN = 27, BOTON = 4;
unsigned long tEntrada = 0;        // cuándo entramos en el estado actual

void luces(int r, int a, int v) {
  digitalWrite(ROJO_PIN, r);
  digitalWrite(AMBAR_PIN, a);
  digitalWrite(VERDE_PIN, v);
}

void cambiar(Estado nuevo) {
  estado = nuevo;
  tEntrada = millis();
}

void setup() {
  pinMode(ROJO_PIN, OUTPUT);
  pinMode(AMBAR_PIN, OUTPUT);
  pinMode(VERDE_PIN, OUTPUT);
  pinMode(BOTON, INPUT_PULLUP);
}

void loop() {
  unsigned long t = millis() - tEntrada;   // tiempo en este estado
  switch (estado) {
    case VERDE:
      luces(LOW, LOW, HIGH);
      if (digitalRead(BOTON) == LOW) cambiar(AMBAR);
      break;
    case AMBAR:
      luces(LOW, HIGH, LOW);
      if (t >= 2000) cambiar(ROJO);
      break;
    case ROJO:
      luces(HIGH, LOW, LOW);
      if (t >= 3000) cambiar(VERDE);
      break;
  }
}`, run: function* (io) {
    ['D25', 'D26', 'D27'].forEach(p => io.mode(p, 'out')); io.mode('D4', 'pullup');
    const luces = (r, a, v) => { io.write('D25', r); io.write('D26', a); io.write('D27', v); };
    let estado = 'VERDE', tEntrada = 0, now = 0;
    const cambiar = e => { estado = e; tEntrada = now; };
    for (;;) {
      const t = now - tEntrada;
      if (estado === 'VERDE') { luces(0, 0, 1); if (io.read('D4') === 0) cambiar('AMBAR'); }
      else if (estado === 'AMBAR') { luces(0, 1, 0); if (t >= 2000) cambiar('ROJO'); }
      else { luces(1, 0, 0); if (t >= 3000) cambiar('VERDE'); }
      yield 5; now += 5;
    }
  } },
  mc_bar: { name: 'Barra de nivel (GPIO34 → 25, 26, 27)', code: `// Barra de nivel: el potenciómetro (GPIO34) enciende de 0 a 3 LEDs
const int LEDS[] = {25, 26, 27};
const int N = 3;

void setup() {
  for (int i = 0; i < N; i++) pinMode(LEDS[i], OUTPUT);
}

void loop() {
  int lectura = analogRead(34);                 // 0..4095
  for (int i = 0; i < N; i++) {
    // el LED i se enciende si la lectura supera (i + 1) × 1000
    digitalWrite(LEDS[i], lectura > (i + 1) * 1000 ? HIGH : LOW);
  }
  delay(20);
}`, run: function* (io) {
    const LEDS = ['D25', 'D26', 'D27'];
    LEDS.forEach(p => io.mode(p, 'out'));
    for (;;) {
      const lectura = io.aread('D34');
      for (let i = 0; i < LEDS.length; i++) io.write(LEDS[i], lectura > (i + 1) * 1000 ? 1 : 0);
      yield 20;
    }
  } }
};
