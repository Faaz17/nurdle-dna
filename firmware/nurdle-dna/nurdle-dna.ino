/*
 * NurdleDNA — Arduino Firmware
 * Team 2 (Arc Tech) — ECTE 250, University of Wollongong Dubai
 *
 * 5-state Moore FSM:
 *   S0 INIT   → S1 on boot complete
 *   S1 SysOk  → S2 on WARN, → S3 on CRIT
 *   S2 Causn  → S1 on CLEAR, → S3 on CRIT
 *   S3 ALRM   → S4 on RST button OR Jetson "CLEAR" command (latched)
 *   S4 RSTIN  → S1 after reset sequence
 *
 * Protocol: 115200 baud, JSON lines, 200 ms telemetry interval.
 *
 * Build profile: hardware presence flags below let you compile against a
 * partial breadboard. Set the HAS_* flag to 1 as each component is wired.
 * Anything missing is silently skipped — no floating-pin noise, no I2C hang.
 */

#include <Servo.h>

// ─── HARDWARE PRESENCE FLAGS ────────────────────────────────────
// Flip to 1 as each component is wired up. The sketch skips disabled
// components entirely (no floating analog reads, no I2C calls, etc).
#define HAS_LDR             0   // turbidity LDR on A0
#define HAS_GAS             1   // MQ gas sensor on A1
#define HAS_CHEM            0   // potentiometer on A2
#define HAS_HX711           0   // load cell (HX711) on D3/D4
#define HAS_LCD             0   // I2C 16×2 LCD on A4/A5
#define HAS_RESET_BUTTON    1   // push-button on D2
#define HAS_SERVO           0   // MG996R valve servo on D9 (removed from breadboard)

// Buzzer output mode:
//   0 → real piezo buzzer (tone())
//   1 → using a blue LED as a visual indicator instead
#define BUZZER_IS_LED       1

#if HAS_LCD
  #include <Wire.h>
  #include <LiquidCrystal_I2C.h>
#endif

#if HAS_HX711
  #include <HX711.h>
#endif

// ─── Pin map (matches the wiring guide) ─────────────────────────
#define LDR_PIN          A0
#define GAS_PIN          A1
#define CHEM_PIN         A2
#define RST_BTN_PIN      2     // active HIGH, external 10k pull-down
#define HX711_DOUT       3
#define HX711_CLK        4
#define LED_GREEN_PIN    5     // Normal / S1
#define LED_YELLOW_PIN   6     // Caution / S2
#define LED_RED_PIN      7     // Alarm / S3
#define BUZZER_PIN       8     // piezo, or blue indicator LED
#define SERVO_PIN        9

// ─── Thresholds (raw 10-bit ADC, 0–1023) ─────────────────────────
#define LDR_WARN_THRESH   500
#define LDR_CRIT_THRESH   800
// Gas thresholds — calibrated for this specific sensor + room (post-warmup):
// idle ~300, breath ~400, lighter spike >800.
#define GAS_WARN_THRESH   380
#define GAS_CRIT_THRESH   550
#define CHEM_CRIT_THRESH  900
#define DEBOUNCE_HITS     3
#define SCALE_FACTOR      420.0
#define TARE_DELAY_MS     3000
#define LCD_ADDR          0x27   // try 0x3F if LCD stays blank

// ─── Timing ──────────────────────────────────────────────────────
#define SENSOR_INTERVAL_MS 100
#define SERIAL_INTERVAL_MS 200

// ─── Servo positions ─────────────────────────────────────────────
#define VALVE_OPEN   0
#define VALVE_CLOSED 90

// ─── FSM ─────────────────────────────────────────────────────────
enum State { S0_INIT, S1_SYSOK, S2_CAUTION, S3_ALARM, S4_RESET };

// ─── Globals ─────────────────────────────────────────────────────
#if HAS_SERVO
  Servo valve;
#endif

#if HAS_LCD
  LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);
#endif

#if HAS_HX711
  HX711 scale;
#endif

State   currentState = S0_INIT;
bool    valveOpen    = true;

int     ldrVal       = 0;
int     gasVal       = 0;
int     chemVal      = 0;
float   loadGrams    = 0.0;

int     warnHits     = 0;
int     critHits     = 0;
int     clearHits    = 0;

bool    jetsonCrit   = false;
bool    jetsonWarn   = false;
bool    jetsonReset  = false;   // serial-driven reset request (used when no physical button)

unsigned long lastSensor       = 0;
unsigned long lastSerial       = 0;
unsigned long resetCooldownEnd = 0;   // millis() when the post-reset cooldown expires

// Post-reset cooldown: after the operator presses reset, ignore all alarm
// sources (sensors AND Jetson commands) for this many milliseconds. Gives
// the operator a window to physically remove the contamination before the
// system auto-re-alarms.
#define RESET_COOLDOWN_MS  5000

String serialBuf = "";

// ─────────────────────────────────────────────────────────────────
// setup
// ─────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // GPIO
  pinMode(BUZZER_PIN,     OUTPUT);
  pinMode(LED_GREEN_PIN,  OUTPUT);
  pinMode(LED_YELLOW_PIN, OUTPUT);
  pinMode(LED_RED_PIN,    OUTPUT);

#if HAS_RESET_BUTTON
  pinMode(RST_BTN_PIN, INPUT);   // external pull-down, active HIGH
#endif

#if HAS_SERVO
  valve.attach(SERVO_PIN);
  openValve();
#endif

#if HAS_LCD
  lcd.init();
  lcd.backlight();
  lcdPrint("NurdleDNA v1.0  ", "Initialising... ");
#endif

  // Lamp test — all three LEDs ON during S0
  setLeds(true, true, true);

#if HAS_HX711
  scale.begin(HX711_DOUT, HX711_CLK);
  scale.set_scale(SCALE_FACTOR);
  lcdPrint("NurdleDNA v1.0  ", "Taring scale... ");
  delay(TARE_DELAY_MS);
  if (scale.is_ready()) scale.tare();
#else
  delay(1500);   // short startup pause for the lamp test
#endif

  enterState(S1_SYSOK);
}

// ─────────────────────────────────────────────────────────────────
// loop
// ─────────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // 1. Read sensors + run FSM
  if (now - lastSensor >= SENSOR_INTERVAL_MS) {
    lastSensor = now;
    readSensors();
    updateFSM();
  }

  // 2. Serial telemetry + command parse
  if (now - lastSerial >= SERIAL_INTERVAL_MS) {
    lastSerial = now;
    sendTelemetry();
  }
  parseSerialInput();

  // 3. Reset path — physical button (if present) or serial CLEAR command
  if (currentState == S3_ALARM) {
    bool resetPressed = false;

#if HAS_RESET_BUTTON
    if (digitalRead(RST_BTN_PIN) == HIGH) {
      delay(50);
      if (digitalRead(RST_BTN_PIN) == HIGH) resetPressed = true;
    }
#endif

    if (jetsonReset) {
      resetPressed = true;
      jetsonReset = false;
    }

    if (resetPressed) {
      enterState(S4_RESET);
      delay(1500);
      warnHits = critHits = clearHits = 0;
      jetsonCrit = jetsonWarn = false;
      resetCooldownEnd = millis() + RESET_COOLDOWN_MS;
      enterState(S1_SYSOK);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Sensor reading — only reads connected sensors; others stay at 0
// ─────────────────────────────────────────────────────────────────
void readSensors() {
#if HAS_LDR
  ldrVal  = analogRead(LDR_PIN);
#endif
#if HAS_GAS
  gasVal  = analogRead(GAS_PIN);
#endif
#if HAS_CHEM
  chemVal = analogRead(CHEM_PIN);
#endif
#if HAS_HX711
  if (scale.is_ready()) {
    float raw = scale.get_units(1);
    loadGrams = (raw < 0.0) ? 0.0 : raw;
  }
#endif
}

// ─────────────────────────────────────────────────────────────────
// FSM update
// ─────────────────────────────────────────────────────────────────
void updateFSM() {
  if (currentState == S3_ALARM) return;   // S3 is latched
  if (millis() < resetCooldownEnd) return; // post-reset cooldown — ignore all alarm sources

  bool isCrit = (ldrVal  >= LDR_CRIT_THRESH  ||
                 gasVal  >= GAS_CRIT_THRESH  ||
                 chemVal >= CHEM_CRIT_THRESH ||
                 jetsonCrit);

  bool isWarn = (ldrVal >= LDR_WARN_THRESH ||
                 gasVal >= GAS_WARN_THRESH ||
                 jetsonWarn);

  if (isCrit) {
    critHits++;
    warnHits = clearHits = 0;
    if (critHits >= DEBOUNCE_HITS) {
      enterState(S3_ALARM);
    }
  } else if (isWarn) {
    warnHits++;
    critHits = clearHits = 0;
    if (warnHits >= DEBOUNCE_HITS && currentState == S1_SYSOK) {
      enterState(S2_CAUTION);
    }
  } else {
    clearHits++;
    critHits = warnHits = 0;
    if (clearHits >= DEBOUNCE_HITS && currentState == S2_CAUTION) {
      enterState(S1_SYSOK);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// State transitions
// ─────────────────────────────────────────────────────────────────
void enterState(State s) {
  currentState = s;
  switch (s) {

    case S1_SYSOK:
      openValve();
      setLeds(true, false, false);
      buzzerOff();
      lcdPrint("Status: CLEAR   ", "Valve: OPEN     ");
      break;

    case S2_CAUTION:
      openValve();
      setLeds(false, true, false);
      buzzerOff();
      lcdPrint("!! CAUTION !!   ", "Valve: OPEN     ");
      break;

    case S3_ALARM:
      closeValve();
      setLeds(false, false, true);
      buzzerOn();
      lcdPrint("!!! ALARM !!!   ", "Valve: CLOSED   ");
      break;

    case S4_RESET:
      openValve();
      setLeds(true, true, true);
      buzzerOff();
      lcdPrint("Resetting...    ", "System OK soon  ");
      break;

    case S0_INIT:
      break;
  }
}

// ─────────────────────────────────────────────────────────────────
// Actuator helpers
// ─────────────────────────────────────────────────────────────────
void openValve()  {
  valveOpen = true;
#if HAS_SERVO
  valve.write(VALVE_OPEN);
#endif
}
void closeValve() {
  valveOpen = false;
#if HAS_SERVO
  valve.write(VALVE_CLOSED);
#endif
}

void setLeds(bool g, bool y, bool r) {
  digitalWrite(LED_GREEN_PIN,  g ? HIGH : LOW);
  digitalWrite(LED_YELLOW_PIN, y ? HIGH : LOW);
  digitalWrite(LED_RED_PIN,    r ? HIGH : LOW);
}

void buzzerOn() {
#if BUZZER_IS_LED
  digitalWrite(BUZZER_PIN, HIGH);
#else
  tone(BUZZER_PIN, 1000);
#endif
}
void buzzerOff() {
#if BUZZER_IS_LED
  digitalWrite(BUZZER_PIN, LOW);
#else
  noTone(BUZZER_PIN);
#endif
}

void lcdPrint(const char* l1, const char* l2) {
#if HAS_LCD
  lcd.setCursor(0, 0); lcd.print(l1);
  lcd.setCursor(0, 1); lcd.print(l2);
#else
  (void)l1; (void)l2;   // no-op when LCD is absent
#endif
}

// ─────────────────────────────────────────────────────────────────
// Serial — telemetry output (Jetson reads this)
// {"fsm_state":"S1","valve":"OPEN","ldr":0,"gas":380,"chem":0,"load_g":0.0}
// ─────────────────────────────────────────────────────────────────
void sendTelemetry() {
  Serial.print(F("{\"fsm_state\":\""));
  Serial.print(stateLabel());
  Serial.print(F("\",\"valve\":\""));
  Serial.print(valveOpen ? F("OPEN") : F("CLOSED"));
  Serial.print(F("\",\"ldr\":"));
  Serial.print(ldrVal);
  Serial.print(F(",\"gas\":"));
  Serial.print(gasVal);
  Serial.print(F(",\"chem\":"));
  Serial.print(chemVal);
  Serial.print(F(",\"load_g\":"));
  Serial.print(loadGrams, 1);
  Serial.println(F("}"));
}

const __FlashStringHelper* stateLabel() {
  switch (currentState) {
    case S0_INIT:    return F("S0");
    case S1_SYSOK:   return F("S1");
    case S2_CAUTION: return F("S2");
    case S3_ALARM:   return F("S3");
    case S4_RESET:   return F("S4");
    default:         return F("S1");
  }
}

// ─────────────────────────────────────────────────────────────────
// Serial — command input (Jetson sends this)
// {"state":"WARN|CRIT|CLEAR|RESET","confidence":0.85,"count":12}
// RESET is a soft operator reset (dashboard button) — clears a latched S3.
// ─────────────────────────────────────────────────────────────────
void parseSerialInput() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n') {
      processJetsonCmd(serialBuf);
      serialBuf = "";
    } else if (serialBuf.length() < 200) {
      serialBuf += c;
    }
  }
}

void processJetsonCmd(const String& cmd) {
  if (cmd.length() < 5) return;

  // Stricter parse: only accept commands that look like JSON ({"state":...}).
  // Avoids false matches from any garbage that happens to contain "WARN"
  // or "CRIT" (we saw exactly this when ModemManager probed the port).
  if (cmd.indexOf(F("{\"state\":")) < 0) return;

  if (cmd.indexOf(F("\"RESET\"")) >= 0) {
    // Remote operator reset from the dashboard (Jetson → serial). Acts as a
    // soft equivalent of the physical RST button: the loop() reset path picks
    // this up and steps a latched S3 alarm through S4 back to S1.
    jetsonReset = true;
    return;
  }

  if (cmd.indexOf(F("\"CRIT\"")) >= 0) {
    jetsonCrit = true;
    jetsonWarn = false;
  } else if (cmd.indexOf(F("\"WARN\"")) >= 0) {
    jetsonWarn = true;
    jetsonCrit = false;
  } else if (cmd.indexOf(F("\"CLEAR\"")) >= 0) {
    // CLEAR only clears the Jetson override flags. It does NOT auto-reset
    // a latched S3 alarm — that requires the physical operator button so
    // that gas / LDR / chem-driven alarms can't be silenced by the camera.
    jetsonCrit = false;
    jetsonWarn = false;
  }
}
