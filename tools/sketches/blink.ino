// Parpadeo: el "hola mundo" de Arduino
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);  // enciende
  delay(1000);
  digitalWrite(13, LOW);   // apaga
  delay(1000);
}
