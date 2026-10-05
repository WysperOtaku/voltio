// Fundido con PWM en el pin 9
void setup() {
  pinMode(9, OUTPUT);
}

void loop() {
  for (int b = 0; b <= 255; b += 5) { analogWrite(9, b); delay(30); }
  for (int b = 255; b >= 0; b -= 5) { analogWrite(9, b); delay(30); }
}
