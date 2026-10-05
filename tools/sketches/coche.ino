// Barrido de luces (pines 8 a 12) que se activa con el botón del pin 2
void setup() {
  for (int p = 8; p <= 12; p++) pinMode(p, OUTPUT);
  pinMode(2, INPUT_PULLUP);
}

void loop() {
  if (digitalRead(2) == HIGH) return;   // espera al botón
  for (int p = 8; p <= 12; p++) { digitalWrite(p, HIGH); delay(120); digitalWrite(p, LOW); }
  for (int p = 11; p >= 9; p--) { digitalWrite(p, HIGH); delay(120); digitalWrite(p, LOW); }
}
