// GHOST experimental servo output — Arduino UNO + SG90, signal on D9. Subtle +/-15 degree travel.
// Legacy L/C/R and subtle l/c/r bytes at 115200 baud. No changes to the STM32 firmware.
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
      case 'L': ghostServo.write(45); break; // Legacy Full Demo, unchanged.
      case 'l': ghostServo.write(75); break; // New calibration copy: subtle travel.
      case 'C':
      case 'c': ghostServo.write(90); break;
      case 'R': ghostServo.write(135); break; // Legacy Full Demo, unchanged.
      case 'r': ghostServo.write(105); break;
      default: break; // Ignore other bytes, including CR/LF.
    }
  }
}
