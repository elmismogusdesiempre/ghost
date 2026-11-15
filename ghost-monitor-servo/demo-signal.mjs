/** Educational synthetic signal at 500 Hz, inspired by the product laboratory.
 * Drift, irregular plateaus, fine noise and short artefacts; never patient data.
 * Indexed noise makes a sample independent of animation/USB packet timing.
 */
const noise = n => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
export function demoADC(sampleIndex) {
  if (!Number.isFinite(sampleIndex)) return 2048;
  const n = Math.floor(sampleIndex), t = n / 500;
  const cycle = Math.floor(t / 11.7), phase = t - cycle * 11.7;
  const variation = noise(cycle + 1701);
  const highStart = 1.6 + variation * 0.2, highEnd = 3.45 + variation * 0.3;
  const lowStart = 5.25 + variation * 0.25, lowEnd = 7.1 - variation * 0.2;
  let adc = 2048 + 85 * Math.sin(t * 1.7) + 35 * Math.sin(t * 11.8) + 22 * Math.sin(t * 29.3) + 35 * noise(n);
  if (phase >= highStart && phase < highEnd) {
    adc = 3050 + 100 * variation + 130 * Math.sin(t * 8.3) + 65 * Math.sin(t * 24) + 50 * noise(n) + 210 * Math.exp(-(phase - highStart) / 0.18);
  } else if (phase >= lowStart && phase < lowEnd) {
    adc = 880 + 70 * variation + 120 * Math.sin(t * 9.5) + 65 * Math.sin(t * 22) + 45 * noise(n) - 160 * Math.exp(-(phase - lowStart) / 0.2);
  }
  // Brief artefacts demonstrate why a stable signal is required for a click.
  const highSpike = 8.15 + variation * 0.12, lowSpike = 9.65 - variation * 0.1;
  if (phase >= highSpike && phase < highSpike + 0.018) adc = 3850 + 100 * noise(n);
  if (phase >= lowSpike && phase < lowSpike + 0.014) adc = 430 + 65 * noise(n);
  return Math.round(Math.max(0, Math.min(4095, adc)));
}
