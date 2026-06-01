/*
 * LED wiring diagnostic — NurdleDNA
 *
 * Strips out everything except pinMode + digitalWrite on the four LED pins.
 * Lights each LED in turn for 1 second, then all four together for 2 seconds.
 * Serial Monitor at 9600 baud prints which pin is being driven HIGH so you
 * can correlate "ON" messages with what your eyes see on the breadboard.
 *
 * Expected behaviour (with correct wiring):
 *   GREEN  (D5) on 1 s   →  Serial: "D5 GREEN ON"
 *   YELLOW (D6) on 1 s   →  Serial: "D6 YELLOW ON"
 *   RED    (D7) on 1 s   →  Serial: "D7 RED ON"
 *   BLUE   (D8) on 1 s   →  Serial: "D8 BLUE ON"
 *   ALL FOUR on 2 s      →  Serial: "ALL ON"
 *   ALL OFF 1 s          →  Serial: "ALL OFF"
 *   ... repeat forever
 *
 * If a particular LED never lights but its "ON" message prints, that LED's
 * wiring is wrong (polarity, missing GND, wrong row, bad jumper, dead LED,
 * or resistor not in the circuit).
 */

#define LED_GREEN_PIN   5
#define LED_YELLOW_PIN  6
#define LED_RED_PIN     7
#define LED_BLUE_PIN    8

void allOff() {
  digitalWrite(LED_GREEN_PIN,  LOW);
  digitalWrite(LED_YELLOW_PIN, LOW);
  digitalWrite(LED_RED_PIN,    LOW);
  digitalWrite(LED_BLUE_PIN,   LOW);
}

void setup() {
  Serial.begin(9600);

  pinMode(LED_GREEN_PIN,  OUTPUT);
  pinMode(LED_YELLOW_PIN, OUTPUT);
  pinMode(LED_RED_PIN,    OUTPUT);
  pinMode(LED_BLUE_PIN,   OUTPUT);

  allOff();
  Serial.println("=== LED wiring diagnostic ===");
}

void loop() {
  // GREEN
  Serial.println("D5 GREEN ON");
  digitalWrite(LED_GREEN_PIN, HIGH);
  delay(1000);
  allOff();
  delay(200);

  // YELLOW
  Serial.println("D6 YELLOW ON");
  digitalWrite(LED_YELLOW_PIN, HIGH);
  delay(1000);
  allOff();
  delay(200);

  // RED
  Serial.println("D7 RED ON");
  digitalWrite(LED_RED_PIN, HIGH);
  delay(1000);
  allOff();
  delay(200);

  // BLUE
  Serial.println("D8 BLUE ON");
  digitalWrite(LED_BLUE_PIN, HIGH);
  delay(1000);
  allOff();
  delay(200);

  // ALL FOUR
  Serial.println("ALL ON");
  digitalWrite(LED_GREEN_PIN,  HIGH);
  digitalWrite(LED_YELLOW_PIN, HIGH);
  digitalWrite(LED_RED_PIN,    HIGH);
  digitalWrite(LED_BLUE_PIN,   HIGH);
  delay(2000);

  Serial.println("ALL OFF");
  allOff();
  delay(1000);
}
