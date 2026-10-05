// Pulsador en el pin 2 (con pull-up interna) controla el LED del 13
void setup() {
  pinMode(2, INPUT_PULLUP);
  pinMode(13, OUTPUT);
}

void loop() {
  // Con pull-up, el pin lee LOW cuando el botón está pulsado
  if (digitalRead(2) == LOW) {
    digitalWrite(13, HIGH);
  } else {
    digitalWrite(13, LOW);
  }
}
