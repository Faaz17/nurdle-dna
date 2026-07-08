# ICSIMA2026 NurdleDNA 12-Minute Speaker Script

Target length: about 11:30 to 11:50, leaving a small safety buffer under the 12-minute maximum.

## Slide 1 - Opening and required conference mention

Timing: 0:00-0:45

Good morning, everyone. My name is Faaz Ali Sayyed, and I am presenting our paper for ICSIMA2026 titled "NurdleDNA: An Edge-AI and Smart IoT Inline System for Source-Level Microplastic Detection."

This work is from the University of Wollongong in Dubai, with Muhammad Haaziq, Daniel Joseph Koshy, Mohammed Abdul Rehman, Syed Hasan Ali, Razveen Kashif, Mohd Fareq Abd Malek, and myself.

The main idea of this paper is simple: detecting microplastics is important, but in industrial discharge streams, detection alone is not enough. We also need to contain the flow, capture evidence, and log the event while it is still close to the source.

## Slide 2 - Problem

Timing: 0:45-1:45

Nurdles are pre-production plastic pellets, typically around 3 to 5 millimeters in diameter. Because they are small, mobile, and visually similar to other suspended particles, they are difficult to manage once they enter drainage networks or coastal water.

In industrial ports and polymer-handling facilities, the problem is time-sensitive. If a spill is detected only after it has left the site, source attribution becomes much harder.

Existing methods each solve part of the problem. Manual inspection and passive filtration can document pollution, but they are slow. Turbidity sensors and particle counters can work in real time, but they cannot reliably distinguish nurdles from bubbles or debris. Laboratory FTIR and Raman methods are chemically strong, but they are not inline containment systems.

That is the operational gap NurdleDNA targets.

## Slide 3 - System concept

Timing: 1:45-2:40

NurdleDNA is designed as a closed-loop system. It follows a detect, classify, actuate, capture, and log pipeline.

Water passes through an optical flow cell where the camera and lighting expose candidate particles. The system then classifies the visual signal and validates it with other sensors. If the evidence persists, the Arduino finite-state machine closes a servo pinch valve. Captured material is measured through the evidence cartridge and load cell, and the event is logged to Firebase for remote audit.

The important point is that the system is not only a monitor. It is intended to be a response system that physically changes the flow path when a credible alarm occurs.

## Slide 4 - Hardware and processor split

Timing: 2:40-3:40

The prototype uses a deliberate split between probabilistic AI and deterministic control.

The Jetson Nano runs the YOLOv8n and OpenCV pipeline, handles evidence-frame processing, and publishes data to the cloud dashboard. The Arduino Uno reads the LDR, MQ-135 gas sensor, and load-cell path, then executes the Moore finite-state machine and controls the servo valve.

This split matters for safety. AI confidence can fluctuate due to glare, bubbles, turbidity, or unusual particles. Cloud connectivity can also fail. But the physical actuation path must stay deterministic. So the Arduino is responsible for the final state behavior and valve control.

## Slide 5 - AI vision result

Timing: 3:40-4:55

The vision model is useful, but the paper does not present it as a single trusted authority.

The YOLOv8n model was trained for 25 epochs on a public microplastics dataset with 19 classes. On the held-out validation split, it reached an overall mAP at 50 of about 0.31. Some operationally relevant classes performed much better, including pen, microfibre, air bubble, fragment, and hair textile.

The lower overall value is explained by the dataset itself. The public dataset is heavily imbalanced, dominated by background material, and it does not perfectly match the inline flow-cell environment.

So the design conclusion is not "trust the AI alone." The conclusion is that AI is a useful probabilistic signal, but it should be confirmed by temporal logic and independent sensor readings before actuation.

## Slide 6 - Sensor fusion

Timing: 4:55-6:00

This is where the multi-sensor logic becomes important.

The system uses an LDR as a turbidity proxy, an MQ-135 gas sensor for VOC or gas anomalies, and the AI detection count from the vision pipeline. The decision logic also includes filtering. A region-of-interest mask limits the active frame, a circularity filter rejects linear reflections, and an EMA smoother reduces single-sample sensor spikes.

Warnings and alarms are not triggered by a single frame. The AI warning condition requires count greater than or equal to 4 for 1.5 seconds, and the AI critical condition requires count greater than or equal to 12 for 2.5 seconds. The MQ-135 critical threshold can also independently drive an alarm.

In the bench false-positive tests, this approach produced no false S3 alarms before contamination was introduced.

## Slide 7 - Finite-state machine

Timing: 6:00-6:55

The containment behavior is implemented as a five-state Moore finite-state machine.

S1 is normal operation, where the valve is open. S2 is a warning state, where flow remains open while evidence is being confirmed. S3 is the alarm state. In S3, the valve closes, the red alarm is active, and the buzzer is on.

The key safety property is latching. Once the system enters S3, it does not automatically clear just because the input briefly disappears. It can only exit through the operator reset path. This prevents the device from reopening flow after a transient sensor drop during an actual contamination event.

## Slide 8 - Timing and actuation performance

Timing: 6:55-8:00

The end-to-end response time averaged about 3 seconds. Most of that time is intentional confirmation delay, not mechanical delay.

The temporal confirmation window contributes about 2.5 seconds. Frame capture, ONNX inference, USB serial transfer, and Firebase publishing are comparatively smaller contributors.

Once S3 is reached, the servo pinch valve seats in approximately 300 milliseconds. The design trade-off is clear: reducing the confirmation window could make the system faster, but it would also increase false alarms from bubbles, glare, and turbulent water.

For a source-level containment system, reliability of the alarm is as important as raw speed.

## Slide 9 - Evidence and audit trail

Timing: 8:00-9:00

The system also creates evidence after an alarm.

The load-cell path is calibrated through the HX711, and the paper reports linear calibration across reference masses. During the live demonstration, the system captured material in the evidence cartridge while the dashboard displayed captured mass in real time.

The cloud log combines several channels: the detection frame, sensor readings, FSM state, valve state, captured mass, and the event timestamp. This is why we describe the audit trail as physical and digital. The cartridge provides material evidence, and Firebase records the operational context of the event.

## Slide 10 - Comparison and contribution

Timing: 9:00-10:00

Compared with conventional approaches, the contribution is not that NurdleDNA replaces laboratory-grade chemical identification.

Instead, it fills a different gap. It provides real-time field response, source-level containment through the valve, and a three-channel evidence record through frame evidence, captured mass, and VOC logs.

Manual inspection, passive filtration, turbidity sensing, FTIR, Raman, and VIS-NIR each have useful roles. But most either detect after the fact, operate offline, lack source-level containment, or do not preserve an integrated audit trail.

NurdleDNA is intended for the moment before contamination spreads.

## Slide 11 - Limitations and future work

Timing: 10:00-11:05

The paper also identifies limitations and future work.

First, the system needs field hardening. That means IP-rated enclosures, multi-bay deployment, SCADA compatibility, and quantified maintenance behavior under real industrial water conditions.

Second, the vision model should be improved using a curated dataset of weathered nurdles and more field-specific samples. A Jetson Orin Nano with a larger YOLOv8s or YOLOv8m model is a logical next step.

Third, the evidence cartridge could be extended with miniature Raman or VIS-NIR sensing to identify polymer type. That would complete the "NurdleDNA" idea by connecting detection, containment, evidence capture, and material identification.

## Slide 12 - Closing

Timing: 11:05-11:45

To conclude, NurdleDNA turns microplastic monitoring into a closed-loop response system.

It detects candidate contamination through edge AI and sensors. It contains the flow through a deterministic Arduino-controlled FSM. And it proves the event through captured mass, frames, and cloud audit logs.

The broader message is that source-level environmental monitoring should not stop at detection. It should connect detection to action and evidence.

Thank you for listening. I am happy to take questions.
