// GHOST experimental servo output — Arduino UNO + SG90, signal on D9.
// Only L/C/R bytes at 115200 baud. No changes to the STM32 firmware.
#include <Servo.h>
Servo ghostServo;
void setup() {
  ghostServo.attach(9);
  ghostServo.write(90);
  Serial.begin(115200);
}
void loop() {
  while (Serial.available() > 0) {
    const char command = Serial.read();
    switch (command) {
      case 'L': ghostServo.write(45); break;
      case 'C': ghostServo.write(90); break;
      case 'R': ghostServo.write(135); break;
      default: break; // Ignore other bytes, including CR/LF.
    }
  }
}
