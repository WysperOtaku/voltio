// Semáforo: rojo (12), ámbar (11), verde (10)
const int ROJO = 12, AMBAR = 11, VERDE = 10;

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
}
