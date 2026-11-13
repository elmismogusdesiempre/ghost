import { eyeModels, eyeSVG, validEyeModel } from './eye-models.mjs';
// This display never emits input or changes signal processing.
export function horizontalOffset(adc) {
  if (!Number.isFinite(adc)) return 0;
  return (Math.max(0, Math.min(4095, adc)) / 4095 * 2 - 1) * 115;
}
export class SignalEye {
  constructor(host, id) {
    this.host = host; this.id = id; this.position = 0; this.lastFrame = null;
    host.classList.add('signal-eye'); host.setAttribute('aria-hidden', 'true');
    this.setStyle('original');
  }
  setStyle(style) {
    style = validEyeModel(style);
    if (this.style === style) return;
    this.style = style;
    this.host.dataset.eyeStyle = style;
    this.host.innerHTML = eyeSVG(style, this.id) + '<span class="signal-eye-caption">Sin señal reciente</span>';
    const svg = this.host.querySelector('svg');
    svg.setAttribute('focusable', 'false');
    // Remove unused margins from the supplied artwork without changing shapes.
    svg.setAttribute('viewBox', style === 'cartoon' ? '125 25 350 350' : style === 'photo' ? '0 0 600 330' : '0 65 600 270');
    this.iris = this.host.querySelector('[data-eye-iris]');
    this.closed = this.host.querySelector('[data-eye-closed]');
    this.caption = this.host.querySelector('.signal-eye-caption');
    this.applyPosition();
  }
  applyPosition() {
    const x = this.position / 115 * eyeModels[this.style].maxX;
    this.iris.setAttribute('transform', `translate(${x.toFixed(3)} 0)`);
  }
  setVisible(visible) {
    this.host.hidden = !visible;
    if (!visible) { this.lastFrame = null; this.position = 0; this.applyPosition(); }
  }
  render(adc, { fresh, demo, now, reducedMotion = false }) {
    if (this.host.hidden) return;
    const target = fresh ? horizontalOffset(adc) : 0;
    const delta = this.lastFrame === null ? 16.67 : Math.max(0, Math.min(100, now - this.lastFrame));
    this.lastFrame = now;
    this.position = reducedMotion ? target : this.position + (target - this.position) * (1 - Math.exp(-delta / 130));
    if (Math.abs(target - this.position) < 0.01) this.position = target;
    this.applyPosition();
    // The photo keeps the provided closed-eye layer. No random pupil movement:
    // gaze always represents the same ADC as the graph, horizontally only.
    if (this.closed) this.closed.style.opacity = !reducedMotion && fresh && now % 5200 < 45 ? '1' : '0';
    const label = fresh ? demo ? 'DEMO · señal simulada' : 'Señal STM32' : 'Sin señal reciente';
    if (this.caption.textContent !== label) this.caption.textContent = label;
  }
}
