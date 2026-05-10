/*
 * NurdleDNA — Arduino Firmware
 * Team 2 (Arc Tech) — ECTE 250, University of Wollongong Dubai
 *
 * 5-state Moore FSM:
 *   S0 INIT   → S1 on boot complete
 *   S1 SysOk  → S2 on WARN, → S3 on CRIT
 *   S2 Causn  → S1 on CLEAR, → S3 on CRIT
 *   S3 ALRM   → S4 on RST button (latched — operator must reset)
 *   S4 RSTIN  → S1 after reset sequence
 *
 * Inputs:  LDR (turbidity), MQ-135 (gas), HX711 (load cell), RST button
 *          + JSON commands from Jetson Nano over Serial
 * Outputs: MG996R servo valve, RGB LEDs, buzzer, 16x2 LCD, UV LED
 * Protocol: 115200 baud, JSON lines, 200 ms telemetry interval
 *
 * Libraries required (install via Library Manager):
 *   - Servo          (built-in)
 *   - Wire           (built-in)
 *   - LiquidCrystal_I2C  by Frank de Brabander
 *   - HX711          by Bogdan Necula / olkal
 */

#include <Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <HX711.h>

// ─── Pin map ────────────────────────────────────────────────────
#define LDR_PIN       A0
#define GAS_PIN       A1
#define RST_BTN_PIN   2    // active LOW (INPUT_PULLUP)
#define UV_LED_PIN    7
#define BUZZER_PIN    8
#define SERVO_PIN     9
#define LED_RED_PIN   3    // PWM
#define LED_GREEN_PIN 5    // PWM
#define LED_BLUE_PIN  6    // PWM
#define HX711_DOUT    4
#define HX711_CLK     10

// ─── Thresholds ──────────────────────────────────────────────────
#define LDR_WARN_THRESH   600     // raw ADC — lower = cloudier water
#define LDR_CRIT_THRESH   750
#define GAS_WARN_THRESH   300     // raw ADC (~100 ppm equivalent)
#define GAS_CRIT_THRESH   600     // raw ADC (~200 ppm equivalent)
#define DEBOUNCE_HITS     3       // consecutive readings before FSM transition
#define SCALE_FACTOR      420.0   // HX711 calibration — tune on breadboard
#define TARE_DELAY_MS     3000

// ─── Timing ──────────────────────────────────────────────────────
#define SENSOR_INTERVAL_MS 100    // read sensors every 100 ms
#define SERIAL_INTERVAL_MS 200    // send telemetry every 200 ms
#define UV_PULSE_MS        200    // UV LED on for 200 ms on each trigger

// ─── Servo positions ─────────────────────────────────────────────
#define VALVE_OPEN   0
#define VALVE_CLOSED 90

// ─── FSM ─────────────────────────────────────────────────────────
enum State { S0_INIT, S1_SYSOK, S2_CAUTION, S3_ALARM, S4_RESET };

// ─── Globals ─────────────────────────────────────────────────────
Servo valve;
LiquidCrystal_I2C lcd(0x27, 16, 2);
HX711 scale;

State   currentState  = S0_INIT;
bool    valveOpen     = true;

int     ldrVal        = 0;
int     gasVal        = 0;
float   loadGrams     = 0.0;

int     warnHits      = 0;
int     critHits      = 0;
int     clearHits     = 0;

bool    jetsonCrit    = false;
bool    jetsonWarn    = false;

unsigned long lastSensor  = 0;
unsigned long lastSerial  = 0;
unsigned long uvOffTime   = 0;
bool          uvActive    = false;

String serialBuf = "";

// ─────────────────────────────────────────────────────────────────
// setup
// ─────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // GPIO
  pinMode(RST_BTN_PIN, INPUT_PULLUP);
  pinMode(UV_LED_PIN,  OUTPUT);
  pinMode(BUZZER_PIN,  OUTPUT);
  pinMode(LED_RED_PIN,   OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_BLUE_PIN,  OUTPUT);

  // Servo
  valve.attach(SERVO_PIN);
  openValve();

  // LCD
  lcd.init();
  lcd.backlight();
  lcdPrint("NurdleDNA v1.0  ", "Initialising... ");

  // LEDs — all white during S0
  setRGB(255, 255, 255);

  // HX711 tare on boot
  scale.begin(HX711_DOUT, HX711_CLK);
  lcdPrint("NurdleDNA v1.0  ", "Taring scale... ");
  delay(TARE_DELAY_MS);
  if (scale.is_ready()) scale.tare();

  delay(500);
  enterState(S1_SYSOK);
}

// ─────────────────────────────────────────────────────────────────
// loop
// ─────────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // 1. Read sensors
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

  // 3. UV LED auto-off
  if (uvActive && now >= uvOffTime) {
    digitalWrite(UV_LED_PIN, LOW);
    uvActive = false;
  }

  // 4. Reset button — only effective in S3
  if (currentState == S3_ALARM && digitalRead(RST_BTN_PIN) == LOW) {
    delay(50);
    if (digitalRead(RST_BTN_PIN) == LOW) {
      enterState(S4_RESET);
      delay(1500);
      warnHits = critHits = clearHits = 0;
      jetsonCrit = jetsonWarn = false;
      enterState(S1_SYSOK);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Sensor reading
// ─────────────────────────────────────────────────────────────────
void readSensors() {
  ldrVal = analogRead(LDR_PIN);
  gasVal = analogRead(GAS_PIN);
  if (scale.is_ready()) {
    float raw = scale.get_units(1);
    loadGrams = (raw < 0.0) ? 0.0 : raw;
  }
}

// ─────────────────────────────────────────────────────────────────
// FSM update (called every SENSOR_INTERVAL_MS)
// ─────────────────────────────────────────────────────────────────
void updateFSM() {
  // S3 is latched — only RST button exits
  if (currentState == S3_ALARM) return;

  bool isCrit = (gasVal >= GAS_CRIT_THRESH || ldrVal >= LDR_CRIT_THRESH || jetsonCrit);
  bool isWarn = (gasVal >= GAS_WARN_THRESH || ldrVal >= LDR_WARN_THRESH || jetsonWarn);

  if (isCrit) {
    critHits++;
    warnHits  = 0;
    clearHits = 0;
    if (critHits >= DEBOUNCE_HITS) {
      enterState(S3_ALARM);
    }
  } else if (isWarn) {
    warnHits++;
    critHits  = 0;
    clearHits = 0;
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
      setRGB(0, 200, 0);
      buzzerOff();
      lcdPrint("Status: CLEAR   ", "Valve: OPEN     ");
      break;

    case S2_CAUTION:
      openValve();
      setRGB(255, 140, 0);
      buzzerOff();
      lcdPrint("!! CAUTION !!   ", "Valve: OPEN     ");
      pulseUV();
      break;

    case S3_ALARM:
      closeValve();
      setRGB(255, 0, 0);
      buzzerOn();
      lcdPrint("!!! ALARM !!!   ", "Valve: CLOSED   ");
      pulseUV();
      break;

    case S4_RESET:
      openValve();
      setRGB(255, 255, 255);
      buzzerOff();
      lcdPrint("Resetting...    ", "Press RST       ");
      break;

    case S0_INIT:
      break;
  }
}

// ─────────────────────────────────────────────────────────────────
// Actuator helpers
// ─────────────────────────────────────────────────────────────────
void openValve()  { valveOpen = true;  valve.write(VALVE_OPEN);   }
void closeValve() { valveOpen = false; valve.write(VALVE_CLOSED); }

void setRGB(uint8_t r, uint8_t g, uint8_t b) {
  analogWrite(LED_RED_PIN,   r);
  analogWrite(LED_GREEN_PIN, g);
  analogWrite(LED_BLUE_PIN,  b);
}

void buzzerOn()  { tone(BUZZER_PIN, 1000); }
void buzzerOff() { noTone(BUZZER_PIN); }

void lcdPrint(const char* l1, const char* l2) {
  lcd.setCursor(0, 0); lcd.print(l1);
  lcd.setCursor(0, 1); lcd.print(l2);
}

void pulseUV() {
  digitalWrite(UV_LED_PIN, HIGH);
  uvActive  = true;
  uvOffTime = millis() + UV_PULSE_MS;
}

// ─────────────────────────────────────────────────────────────────
// Serial — telemetry output (Jetson reads this)
// ─────────────────────────────────────────────────────────────────
void sendTelemetry() {
  // {"fsm_state":"S1","valve":"OPEN","ldr":542,"gas":380,"load_g":3.4}
  Serial.print(F("{\"fsm_state\":\""));
  Serial.print(stateLabel());
  Serial.print(F("\",\"valve\":\""));
  Serial.print(valveOpen ? F("OPEN") : F("CLOSED"));
  Serial.print(F("\",\"ldr\":"));
  Serial.print(ldrVal);
  Serial.print(F(",\"gas\":"));
  Serial.print(gasVal);
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
// {"state":"WARN|CRIT|CLEAR","confidence":0.85,"count":12}
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
  if (cmd.indexOf(F("\"CRIT\"")) >= 0) {
    jetsonCrit = true;
    jetsonWarn = false;
  } else if (cmd.indexOf(F("\"WARN\"")) >= 0) {
    jetsonWarn = true;
    jetsonCrit = false;
  } else if (cmd.indexOf(F("\"CLEAR\"")) >= 0) {
    jetsonCrit = false;
    jetsonWarn = false;
  }
}
