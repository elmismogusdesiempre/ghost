// Decorative signal visualization only. Never emits input or changes detection.
export function horizontalOffset(adc) {
  if (!Number.isFinite(adc)) return 0;
  return (Math.max(0, Math.min(4095, adc)) / 4095 * 2 - 1) * 115;
}
export class SignalEye {
  constructor(host, id) {
    this.host = host;
    this.position = 0;
    this.lastFrame = null;
    host.classList.add('signal-eye');
    host.setAttribute('aria-hidden', 'true');
    host.innerHTML = `<svg viewBox="0 70 600 260" focusable="false" aria-hidden="true">
      <defs><clipPath id="${id}-shape"><path d="M60 200C180 80 420 80 540 200C420 320 180 320 60 200Z"/></clipPath></defs>
      <path d="M60 200C180 80 420 80 540 200C420 320 180 320 60 200Z" fill="#d7e0e6"/>
      <g clip-path="url(#${id}-shape)"><g class="signal-eye-iris">
        <circle cx="300" cy="200" r="85" fill="#9c6e55"/>
        <circle cx="300" cy="200" r="40" fill="#1b1b1d"/>
        <circle cx="340" cy="180" r="20" fill="#e3c1af"/>
      </g></g>
      <path d="M40 200C160 60 440 60 560 200" fill="none" stroke="#5f6062" stroke-width="25" stroke-linecap="round"/>
      <path d="M70 200C180 320 420 320 530 200" fill="none" stroke="#9db2c1" stroke-width="12" stroke-linecap="round"/>
    </svg><span class="signal-eye-caption">Sin señal reciente</span>`;
    this.iris = host.querySelector('.signal-eye-iris');
    this.caption = host.querySelector('.signal-eye-caption');
  }
  setVisible(visible) {
    this.host.hidden = !visible;
    if (!visible) { this.lastFrame = null; this.position = 0; this.iris.setAttribute('transform', 'translate(0 0)'); }
  }
  render(adc, { fresh, demo, now, reducedMotion = false }) {
    if (this.host.hidden) return;
    const target = fresh ? horizontalOffset(adc) : 0;
    const delta = this.lastFrame === null ? 16.67 : Math.max(0, Math.min(100, now - this.lastFrame));
    this.lastFrame = now;
    this.position = reducedMotion ? target : this.position + (target - this.position) * (1 - Math.exp(-delta / 130));
    if (Math.abs(target - this.position) < 0.01) this.position = target;
    this.iris.setAttribute('transform', `translate(${this.position.toFixed(3)} 0)`);
    const label = fresh ? demo ? 'DEMO · señal simulada' : 'Señal STM32' : 'Sin señal reciente';
    if (this.caption.textContent !== label) this.caption.textContent = label;
  }
}
