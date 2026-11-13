/** Standard USB CDC-ACM transport for Android browsers with WebUSB.
 * Only one unambiguous ACM control/data pair is accepted. No firmware upload,
 * vendor commands, HID conversion or assumptions about vendor/product IDs.
 */
export function cdcConfiguration(device) {
  for (const config of device.configurations || []) {
    const controls = [], data = [];
    for (const iface of config.interfaces) for (const alt of iface.alternates) {
      if (alt.interfaceClass === 2 && alt.interfaceSubclass === 2) controls.push({ iface: iface.interfaceNumber, alt: alt.alternateSetting });
      if (alt.interfaceClass === 10) {
        const input = alt.endpoints.find(ep => ep.type === 'bulk' && ep.direction === 'in');
        const output = alt.endpoints.find(ep => ep.type === 'bulk' && ep.direction === 'out');
        if (input && output) data.push({ iface: iface.interfaceNumber, alt: alt.alternateSetting, input });
      }
    }
    if (controls.length === 1 && data.length === 1) return { config: config.configurationValue, control: controls[0], data: data[0] };
  }
  throw new Error('El dispositivo no expone un único puerto USB CDC-ACM compatible. Prueba Puerto serie nativo si está disponible.');
}
export class CDCUSBPort {
  constructor(device) { this.device = device; this.readable = null; this.closed = false; this.closing = null; }
  async open({ baudRate = 115200, dataBits = 8, stopBits = 1, parity = 'none' } = {}) {
    if (dataBits !== 8 || stopBits !== 1 || parity !== 'none') throw new Error('Se requiere 115200 baudios, 8 bits, sin paridad y un bit de parada.');
    try {
      const layout = cdcConfiguration(this.device);
      await this.device.open();
      if (this.device.configuration?.configurationValue !== layout.config) await this.device.selectConfiguration(layout.config);
      await this.device.claimInterface(layout.control.iface);
      await this.device.selectAlternateInterface(layout.control.iface, layout.control.alt);
      await this.device.claimInterface(layout.data.iface);
      await this.device.selectAlternateInterface(layout.data.iface, layout.data.alt);
      const line = new DataView(new ArrayBuffer(7));
      line.setUint32(0, baudRate, true); line.setUint8(4, 0); line.setUint8(5, 0); line.setUint8(6, 8);
      const coding = await this.device.controlTransferOut({ requestType: 'class', recipient: 'interface', request: 0x20, value: 0, index: layout.control.iface }, line.buffer);
      if (coding.status !== 'ok') throw new Error('El STM32 rechazó la configuración CDC de 115200 baudios.');
      const lines = await this.device.controlTransferOut({ requestType: 'class', recipient: 'interface', request: 0x22, value: 3, index: layout.control.iface });
      if (lines.status !== 'ok') throw new Error('El STM32 no aceptó activar DTR/RTS del puerto CDC.');
      this.closed = false;
      const transport = this;
      this.readable = new ReadableStream({
        async pull(controller) {
          try {
            while (!transport.closed) {
              const result = await transport.device.transferIn(layout.data.input.endpointNumber, Math.max(64, layout.data.input.packetSize));
              if (transport.closed) return;
              if (result.status !== 'ok') throw new Error('Lectura USB detenida (' + result.status + '). Reconecta el dispositivo.');
              if (result.data?.byteLength) {
                controller.enqueue(new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength).slice());
                return;
              }
            }
          } catch (error) { if (!transport.closed) controller.error(error); }
        },
        cancel() { return transport.close(); }
      });
    } catch (error) { await this.close(); throw error; }
  }
  async close() {
    if (this.closing) return this.closing;
    this.closed = true;
    this.closing = (async () => { if (this.device.opened) await this.device.close(); })();
    return this.closing;
  }
}
export function usbModes() {
  return { native: window.isSecureContext && typeof navigator.serial?.requestPort === 'function', webusb: window.isSecureContext && typeof navigator.usb?.requestDevice === 'function' };
}
export function requestMonitorPort(mode) {
  // Both permission dialogs are opened synchronously inside the user's click.
  if (mode === 'native' && usbModes().native) return navigator.serial.requestPort();
  if (mode === 'webusb' && usbModes().webusb) return navigator.usb.requestDevice({ filters: [{ classCode: 2, subclassCode: 2 }] }).then(device => new CDCUSBPort(device));
  throw new Error('Este navegador no ofrece la conexión USB elegida. Usa Chrome actualizado, HTTPS y un teléfono con USB OTG. La demo sigue disponible.');
}
