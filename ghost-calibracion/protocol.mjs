/** USB stream framing: 50 bytes = 25 [high, low] base-100 samples. */
export class PacketDecoder {
  constructor() { this.pending = new Uint8Array(50); this.used = 0; this.bytes = 0; this.packets = 0; }
  reset() { this.used = 0; this.bytes = 0; this.packets = 0; }
  push(chunk, onPacket, onInvalid) {
    for (const byte of chunk) {
      this.pending[this.used++] = byte;
      this.bytes++;
      if (this.used !== 50) continue;
      this.used = 0;
      const samples = [];
      let valid = true;
      for (let i = 0; i < 50; i += 2) {
        const hi = this.pending[i], lo = this.pending[i + 1], adc = hi * 100 + lo;
        if (adc > 4095) { valid = false; break; }
        samples.push(adc);
      }
      if (valid) { this.packets++; onPacket(samples); }
      else onInvalid(); // Never deliver a partially valid packet to the click detector.
    }
  }
}
export function stateOf(adc, lower, upper) {
  return adc < lower ? 'right' : adc > upper ? 'left' : 'rest';
}
export function validateSettings(s) {
  if (!Number.isInteger(s.lower) || !Number.isInteger(s.upper) || s.lower < 0 || s.upper > 4095 || s.lower >= s.upper)
    throw new Error('Los umbrales deben ser enteros: 0 ≤ inferior < superior ≤ 4095.');
  if (!Number.isFinite(s.hold) || s.hold < 0 || s.hold > 500)
    throw new Error('La estabilidad debe estar entre 0 y 500 ms.');
  return { lower: s.lower, upper: s.upper, hold: s.hold };
}
/** Use sample-time (500 Hz), not USB chunk arrival time, for stable transitions. */
export class GestureDetector {
  constructor(settings) { this.configure(settings); }
  configure(settings) { this.settings = validateSettings(settings); this.reset(); }
  reset() { this.ready = false; this.candidate = null; this.count = 0; }
  sample(adc) {
    const state = stateOf(adc, this.settings.lower, this.settings.upper);
    if (state !== this.candidate) { this.candidate = state; this.count = 0; }
    this.count++;
    const required = Math.max(1, Math.ceil(this.settings.hold / 2));
    if (this.count < required) return null;
    if (state === 'rest') { this.ready = true; return null; }
    if (!this.ready) return null;
    this.ready = false;
    return state;
  }
}
