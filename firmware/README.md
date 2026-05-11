# NurdleDNA — Arduino Firmware

Full 5-state Moore FSM with serial JSON protocol to the Jetson Nano.

---

## Source file

[firmware/nurdle-dna/nurdle-dna.ino](nurdle-dna/nurdle-dna.ino) — single-file sketch, ~340 lines.

---

## Required libraries

Install via Arduino IDE → **Sketch → Include Library → Manage Libraries**:

| Library | Author | Used for |
|---------|--------|----------|
| `Servo` | built-in | MG996R valve control |
| `Wire` | built-in | I2C bus (LCD) |
| `LiquidCrystal_I2C` | Frank de Brabander | 16×2 status display |
| `HX711` | Bogdan Necula / olkal | Load cell ADC |

---

## Pin map (Arduino Uno)

| Pin | Direction | Component |
|-----|-----------|-----------|
| A0 | analog in | LDR (turbidity proxy) |
| A1 | analog in | MQ-135 gas sensor |
| A4 (SDA) | I2C | LCD |
| A5 (SCL) | I2C | LCD |
| D2 | digital in (INPUT_PULLUP) | RST button (active LOW) |
| D3 | PWM | RGB LED — Red |
| D4 | digital out | HX711 data |
| D5 | PWM | RGB LED — Green |
| D6 | PWM | RGB LED — Blue |
| D7 | digital out | UV LED (365 nm) |
| D8 | digital out | Buzzer (`tone()`) |
| D9 | PWM | MG996R servo |
| D10 | digital out | HX711 clock |

**Power:** servo and UV LED MUST run from an external 5–6 V supply, NOT the Arduino 5V pin — they will brown out the MCU.

---

## FSM transitions

```
              ┌─────┐
              │ S0  │   power-up
              │INIT │
              └──┬──┘
                 │ boot complete
                 ▼
              ┌─────┐  WARN (3-hit)  ┌─────┐
       ┌─────►│ S1  │ ─────────────► │ S2  │
       │      │SysOk│ ◄───────────── │Cause│
       │      └──┬──┘  CLEAR (3-hit) └──┬──┘
       │         │                       │
       │         │ CRIT (3-hit)          │ CRIT (3-hit)
       │         ▼                       ▼
       │      ┌──────────────────────────┐
       │      │           S3             │
       │      │          ALARM           │
       │      │   (latched, valve closed)│
       │      └──────────┬───────────────┘
       │                 │ RST button pressed
       │                 ▼
       │      ┌─────┐
       └──────│ S4  │
              │RSTIN│
              └─────┘
```

**Debounce:** every sensor reading is compared to thresholds and 3 *consecutive* hits in the same direction are required before changing state. Single spikes are ignored.

**Latch:** S3 cannot exit on its own — only the operator's physical RST button (or the equivalent Jetson command sequence) clears it. This is by design for industrial accountability.

---

## Thresholds

| Constant | Default | What it means |
|----------|---------|--------------|
| `LDR_WARN_THRESH` | 600 | Raw ADC (0–1023). Lower value = cloudier water. >600 → WARN. |
| `LDR_CRIT_THRESH` | 750 | Raw ADC. >750 → CRIT regardless of gas. |
| `GAS_WARN_THRESH` | 300 | Raw ADC from MQ-135. Calibrate to your sensor's R0 in clean air. |
| `GAS_CRIT_THRESH` | 600 | Raw ADC. >600 → CRIT (gas leak). |
| `DEBOUNCE_HITS` | 3 | Consecutive readings needed before state change. |
| `SCALE_FACTOR` | 420.0 | HX711 calibration — TUNE with known weight on breadboard. |
| `LCD_ADDR` | 0x27 | I2C LCD backpack address. Try 0x3F if LCD stays blank. |

---

## Serial protocol

**Output (Arduino → Jetson, every 200 ms):**
```json
{"fsm_state":"S1","valve":"OPEN","ldr":542,"gas":380,"load_g":3.4}
```

**Input (Jetson → Arduino, every 200 ms):**
```json
{"state":"WARN","confidence":0.85,"count":12}
```

Both ends use newline-delimited JSON at 115200 baud. Malformed lines are silently dropped.

The Jetson's `state` field is OR-combined with the Arduino's local sensor thresholds:
- If either side says CRIT → enter S3
- If either side says WARN → enter S2
- Both must say CLEAR → return to S1

---

## Known caveats

1. **LCD address (0x27 vs 0x3F):** Cheap I2C backpacks come with either PCF8574 (0x27) or PCF8574A (0x3F) chips. If your LCD stays blank, change `#define LCD_ADDR 0x3F`.

2. **Timer 2 conflict:** `tone()` on the buzzer and `analogWrite(pin 3)` on the red LED share Timer 2. Our state machine only uses 0 or 255 for the red channel, which the timer collapses to digitalWrite. If you ever introduce a mid-range red value while the buzzer is active, PWM will misbehave.

3. **Servo PWM on pin 10:** The `Servo` library uses Timer 1, disabling PWM on pins 9 and 10. We use pin 10 for HX711 clock (digital output) so this is fine.

4. **String concatenation:** `serialBuf += c` uses Arduino `String`, which fragments the heap on the Uno (2 KB RAM) over long runs. For a final demo, fine. For a 24/7 deployment, refactor to a `char[200]` buffer.

5. **HX711 calibration:** `SCALE_FACTOR 420.0` is a starting point only. To calibrate:
   - Tare the empty cartridge on boot.
   - Place a known weight (e.g. 100 g standard) on the load cell.
   - Read `scale.get_units()` — note the value.
   - `SCALE_FACTOR = read_value / known_weight_g`.

---

## Verifying without hardware (TinkerCAD)

TinkerCAD doesn't support the HX711 library. To run this code in TinkerCAD's Arduino simulator:

1. Replace the HX711 sensor with a potentiometer wired to A2.
2. Comment out `#include <HX711.h>` and the `HX711 scale;` declaration.
3. Replace `scale.get_units(1)` with `analogRead(A2) / 100.0` (rough grams approximation).

A TinkerCAD-ready variant will be added as `firmware/nurdle-dna-tinkercad/` for D4.

---

## Flashing

```
Arduino IDE → Tools → Board → Arduino Uno
            → Tools → Port → (select your USB port)
            → Sketch → Upload
```

Open the **Serial Monitor at 115200 baud** to see live JSON telemetry. You should see one packet every 200 ms.

---

## Related docs

- [`../jetson/README.md`](../jetson/README.md) — Jetson Nano setup
- [`../README.md`](../README.md) — Full project overview
