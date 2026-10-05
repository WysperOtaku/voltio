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
}`, run: function* (io) { io.mode('D18', 'out'); for (;;) { io.pwm('D18', Math.floor(io.aread('D34') / 16) / 255); yield 10; } } }
};
