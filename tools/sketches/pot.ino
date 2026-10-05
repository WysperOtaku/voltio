// El potenciómetro en A0 regula el brillo del LED en el pin 9
void setup() {
  pinMode(9, OUTPUT);
}

void loop() {
  int lectura = analogRead(A0);      // 0..1023
  analogWrite(9, lectura / 4);       // 0..255
  delay(10);
}
