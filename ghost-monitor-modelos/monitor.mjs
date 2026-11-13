import { PacketDecoder, GestureDetector, stateOf, validateSettings } from './protocol.mjs';
import { SignalEye } from './signal-eye.mjs';
import { demoADC } from './demo-signal.mjs';
import { eyeModels, eyeModelNames, validEyeModel } from './eye-models.mjs';
const $ = id => document.getElementById(id);
const SETTINGS_KEY = 'ghost_monitor_models_stm32_v1';
let settings = { lower: 1500, upper: 2500, hold: 30, showDock: true, showEye: false, eyeStyle: 'original' };
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || localStorage.getItem('ghost_monitor_stm32_v1') || 'null');
  if (saved) settings = { ...validateSettings(saved), showDock: saved.showDock !== false, showEye: saved.showEye === true, eyeStyle: validEyeModel(saved.eyeStyle) };
} catch { /* An invalid saved setting must never change detection thresholds. */ }
const detector = new GestureDetector(settings), forwardDetector = new GestureDetector(settings), decoder = new PacketDecoder();
const ring = new Float64Array(2500);
let ringIndex = 0, ringSize = 0, sampleCount = 0, lastADC = null, lastPacketAt = 0;
let leftClicks = 0, rightClicks = 0, appliedClicks = 0, invalidPackets = 0;
let enabled = false, fault = false, connected = false, connecting = false, stopping = false;
let port = null, reader = null, readTask = null, lastReadAt = 0, connectionMessage = 'USB desconectado';
let wasAvailable = false, lastUI = 0;
let demo = false, demoSnapshot = null, demoTick = 0, demoSample = 0, demoPackets = 0;
const supported = window.isSecureContext && typeof navigator.serial?.requestPort === 'function';
const stateLabels = { left: 'Clic izquierdo', rest: 'Reposo', right: 'Clic derecho' };
$('monitor').innerHTML = `
<div class="panel">
 <div class="monitor-head"><div><p class="eyebrow">GHOST · Modelos de ojo</p><h2>Monitor STM32</h2></div><span class="monitor-pill"><span id="usbLED" class="monitor-led"></span><span id="usbStatus" role="status">USB desconectado</span></span></div>
 <p class="hint">PA0 · ADC de 12 bits · USB CDC · 115200 baudios · aproximadamente 500 muestras/s.</p>
 <div class="buttons"><button id="connectSTM" class="primary">Conectar STM32</button><button id="disconnectSTM" disabled>Desconectar</button><button id="resetCounts">Reiniciar contadores</button><button id="toggleDemo" aria-pressed="false">Activar modo demo</button></div>
 <p class="hint">El modo demo permite revisar la gráfica y el monitor compacto sin STM32. Incluye reposo con ruido fino, activaciones irregulares y picos breves. Sus datos y contadores son simulados y no activan acciones de comunicación.</p>
 <p id="monitorError" role="alert"></p><p id="monitorInfo"></p>
 <div class="monitor-stats">
  <div class="monitor-stat"><small>ADC actual</small><strong id="adcValue">—</strong></div>
  <div class="monitor-stat"><small>Estado de la señal</small><strong id="adcState">Sin datos</strong></div>
  <div class="monitor-stat"><small>Izquierdos detectados</small><strong id="leftCount">0</strong></div>
  <div class="monitor-stat"><small>Derechos detectados</small><strong id="rightCount">0</strong></div>
 </div>
 <div class="monitor-visuals"><div class="monitor-chart"><canvas id="signalCanvas" role="img" aria-label="Señal ADC en tiempo real de 0 a 4095, con franjas de clic derecho, reposo y clic izquierdo"></canvas></div><div id="monitorSignalEye" hidden></div></div>
 <div class="monitor-bands"><span id="bandLeft">Izquierdo</span><span class="band-rest" id="bandRest">Reposo</span><span class="band-right" id="bandRight">Derecho</span></div>
 <p class="hint" id="streamStats"></p>
 <div class="monitor-integration"><label class="check"><input type="checkbox" id="stmEnabled">Usar la señal STM32 para comunicar en GHOST</label><p id="monitorGate"></p></div>
 <p class="notice">Cada activación estable produce una sola acción. Mantener la señal alta o baja no repite clics; hay que volver a reposo. En configuración se muestran los datos, pero no se activan los controles de comunicación.</p>
</div>
<div class="panel"><h2>Umbrales y visualización</h2>
 <form id="thresholdForm"><div class="fields">
  <label for="lowerADC">Umbral inferior · ADC menor = clic derecho<input type="number" id="lowerADC" min="0" max="4094" step="1" required><input type="range" id="lowerRange" min="0" max="4094" step="1" aria-label="Umbral inferior en vivo"><span class="hint">Activo: <output id="lowerValue">1500</output></span></label>
  <label for="upperADC">Umbral superior · ADC mayor = clic izquierdo<input type="number" id="upperADC" min="1" max="4095" step="1" required><input type="range" id="upperRange" min="1" max="4095" step="1" aria-label="Umbral superior en vivo"><span class="hint">Activo: <output id="upperValue">2500</output></span></label>
  <label>Estabilidad de señal y de reposo (ms)<input type="number" id="holdADC" min="0" max="500" step="2" required></label>
  <label class="check"><input id="showMonitorDock" type="checkbox">Mostrar monitor compacto durante la comunicación</label>
  <label class="check"><input id="showSignalEye" type="checkbox">Mostrar ojo de la señal en los monitores</label>
  <label>Modelo del ojo<select id="eyeStyle">${eyeModelNames.map(key => `<option value="${key}">${eyeModels[key].label}</option>`).join('')}</select><span class="hint">Se aplica y guarda inmediatamente en esta versión.</span></label>
 </div><div class="buttons"><button type="submit" class="primary">Aplicar opciones</button></div><p id="thresholdResult" role="status" class="hint"></p></form>
 <p class="hint">El ojo se activa y guarda al marcar su casilla. Usa las mismas muestras de la gráfica, tanto en demo como por USB: ADC bajo mira a la izquierda y ADC alto a la derecha. Sin señal reciente vuelve al centro. Es una representación de amplitud, no un seguimiento real de la mirada; no modifica umbrales ni genera clics.</p>
 <p class="hint">Los sliders y los valores numéricos de umbral se aplican y guardan al instante. El botón aplica las demás opciones. Para ajustar los sliders del compacto sin salir de la comunicación, usa Ctrl + Alt + U. También puedes entrar con Ctrl + Alt + M: el monitor permanece visible y las acciones de comunicación se pausan.</p>
 <p class="hint">Los límites exactos pertenecen al reposo. La estabilidad utiliza el tiempo de las muestras, suponiendo 500 Hz. Tras conectar, cambiar umbrales o volver a comunicación, primero debe detectarse reposo estable.</p>
 <p class="notice">El puerto debe estar libre: cierra la conexión de MATLAB antes de conectar aquí. Selecciona el puerto USB CDC del STM32 en el diálogo del navegador. Si no aparece, revisa el cable USB, el firmware CDC y el controlador del sistema.</p>
 <p class="hint">Formato esperado: 50 bytes, 25 muestras, byte alto primero; ADC = alto × 100 + bajo. No se envían comandos ni se modifica el firmware. El protocolo no incluye cabecera ni checksum: si se conecta a mitad de una muestra o se pierde un byte, no es posible garantizar la sincronización. Ante datos inválidos, la integración se pausa; reconecta y reinicia la transmisión desde un límite de paquete conocido.</p>
 <p class="hint"><a href="../">Abrir GHOST actual</a> · <a href="/ghost-monitor/informacion.html" target="_blank" rel="noopener">Guía técnica</a> · <a href="https://developer.chrome.com/docs/capabilities/serial" target="_blank" rel="noopener">Web Serial: documentación oficial</a></p>
</div>`;
$('monitorDock').innerHTML = `<div class="dock-summary"><div class="monitor-pill"><span id="dockLED" class="monitor-led"></span><span id="dockUSB">USB desconectado</span></div><div><strong class="dock-value" id="dockADC">—</strong> <span id="dockState">Sin datos</span></div><div class="dock-counters" id="dockCounters">Izq. 0 · Der. 0</div><div id="dockGate">Solo observación</div><div class="dock-hint">Ctrl + Alt + U: ajustar · Ctrl + F1: ayuda</div></div><div class="dock-visuals"><div class="monitor-chart"><canvas id="dockCanvas" role="img" aria-label="Monitor compacto de señal ADC con tres franjas de estados"></canvas></div><div id="dockSignalEye" hidden></div></div><div class="dock-controls"><label for="dockLowerRange">Derecho &lt; <output id="dockLowerValue">1500</output><input id="dockLowerRange" type="range" min="0" max="4094" step="1" aria-label="Umbral inferior del monitor compacto"></label><label for="dockUpperRange">Izquierdo &gt; <output id="dockUpperValue">2500</output><input id="dockUpperRange" type="range" min="1" max="4095" step="1" aria-label="Umbral superior del monitor compacto"></label><p id="dockSliderHint">Ctrl + Alt + M para ajustar</p></div>`;
const signalEyes = [new SignalEye($('monitorSignalEye'), 'monitor-eye'), new SignalEye($('dockSignalEye'), 'dock-eye')];
const reducedEyeMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function syncEyes() { for (const eye of signalEyes) { eye.setStyle(settings.eyeStyle); eye.setVisible(settings.showEye); } }
$('eyeStyle').addEventListener('change', e => { settings.eyeStyle = validEyeModel(e.target.value); saveSettings(); syncEyes(); });
$('showSignalEye').addEventListener('change', e => {
  settings.showEye = e.target.checked;
  saveSettings(); syncEyes();
});
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { $('thresholdResult').textContent = 'No se pudo guardar en este navegador.'; } }
function resetDetection() { detector.reset(); forwardDetector.reset(); wasAvailable = false; }
function syncThresholdControls() {
  $('lowerADC').value = settings.lower; $('upperADC').value = settings.upper;
  for (const [id, key] of [['lowerRange','lower'],['upperRange','upper'],['dockLowerRange','lower'],['dockUpperRange','upper']]) {
    const el = $(id); el.min = key === 'lower' ? 0 : settings.lower + 1;
    el.max = key === 'lower' ? settings.upper - 1 : 4095; el.value = settings[key];
  }
  for (const id of ['lowerValue','dockLowerValue']) $(id).textContent = settings.lower;
  for (const id of ['upperValue','dockUpperValue']) $(id).textContent = settings.upper;
  $('bandLeft').textContent = `Izquierdo > ${settings.upper}`; $('bandRest').textContent = `Reposo ${settings.lower}–${settings.upper}`; $('bandRight').textContent = `Derecho < ${settings.lower}`;
}
function applyLiveThreshold(key, value) {
  if (!window.GhostBridge.adjustable()) return;
  try {
    const next = validateSettings({ ...settings, [key]: Number(value) });
    if (settings[key] === next[key]) return;
    settings = { ...settings, ...next };
    detector.configure(settings); forwardDetector.configure(settings); wasAvailable = false;
    saveSettings(); syncThresholdControls(); updateUI(); draw($('signalCanvas')); draw($('dockCanvas'));
    $('thresholdResult').textContent = 'Umbrales activos y guardados. Esperando reposo estable para otra acción.';
  } catch (error) { $('thresholdResult').textContent = error.message; }
}
for (const [id, key] of [['lowerRange','lower'],['upperRange','upper'],['dockLowerRange','lower'],['dockUpperRange','upper'],['lowerADC','lower'],['upperADC','upper']]) {
  $(id).addEventListener('input', e => { if (e.target.value !== '') applyLiveThreshold(key, e.target.value); });
  $(id).addEventListener('blur', syncThresholdControls);
}
function syncForm() {
  syncThresholdControls();
  $('holdADC').value = settings.hold; $('showMonitorDock').checked = settings.showDock; $('showSignalEye').checked = settings.showEye; $('eyeStyle').value = settings.eyeStyle;
}
function syncDock() {
  const show = window.GhostBridge.quickAdjust() || demo || (connected && settings.showDock);
  $('monitorDock').hidden = !show; document.body.classList.toggle('monitor-visible', show);
  window.GhostBridge.refresh();
}
function gateText() {
  if (demo) return 'DEMO · señal simulada · no activa acciones de comunicación.';
  if (window.GhostBridge.helpOpen()) return 'Ayuda abierta · acciones de comunicación pausadas.';
  if (window.GhostBridge.quickAdjust()) return 'Ajuste rápido · acciones pausadas; la señal continúa en vivo.';
  if (!connected) return 'Conecta el STM32 para recibir muestras.';
  if (fault) return 'Integración pausada: datos inválidos. Reconecta para recuperar la alineación.';
  if (!lastPacketAt || performance.now() - lastPacketAt > 1000) return 'Sin muestras recientes · acciones pausadas.';
  if (!enabled) return 'Solo observación · acciones de comunicación desactivadas.';
  if (window.GhostBridge.configuration()) return 'Configuración: acciones pausadas; las señales siguen visibles.';
  if (!window.GhostBridge.available()) return 'Acciones pausadas · vuelve a la ventana de GHOST.';
  return forwardDetector.ready ? 'Listo para una activación.' : 'Vuelve a reposo estable para la siguiente acción.';
}
function updateUI() {
  const fresh = lastPacketAt && performance.now() - lastPacketAt <= 1000;
  const label = lastADC === null ? 'Sin datos' : !fresh ? 'Sin datos recientes' : stateLabels[stateOf(lastADC, settings.lower, settings.upper)];
  for (const id of ['adcValue', 'dockADC']) $(id).textContent = lastADC === null ? '—' : String(lastADC);
  for (const id of ['adcState', 'dockState']) $(id).textContent = label;
  $('leftCount').textContent = leftClicks; $('rightCount').textContent = rightClicks;
  $('dockCounters').textContent = `Izq. ${leftClicks} · Der. ${rightClicks} · Aplicados ${appliedClicks}`;
  const status = demo ? 'DEMO · sin USB real' : connecting ? 'Solicitando puerto…' : stopping ? 'Desconectando…' : connected ? fresh ? 'USB conectado · recibiendo' : 'USB conectado · esperando datos' : connectionMessage;
  for (const id of ['usbStatus','dockUSB']) $(id).textContent = status;
  for (const id of ['usbLED','dockLED']) $(id).className = `monitor-led${demo ? ' demo' : connected && fresh ? ' connected' : fault ? ' error' : ''}`;
  $('connectSTM').disabled = !supported || demo || connecting || connected || stopping;
  $('disconnectSTM').disabled = !connected || stopping;
  $('toggleDemo').textContent = demo ? 'Detener demo' : 'Activar modo demo';
  $('toggleDemo').setAttribute('aria-pressed', String(demo));
  $('toggleDemo').disabled = connected || connecting || stopping;
  for (const id of ['dockLowerRange','dockUpperRange']) $(id).disabled = !window.GhostBridge.adjustable();
  $('dockSliderHint').textContent = window.GhostBridge.adjustable() ? 'Ajuste en vivo · comunicación pausada' : 'Ctrl + Alt + U para ajustar';
  $('stmEnabled').checked = enabled; $('stmEnabled').disabled = demo || fault;
  $('monitorGate').textContent = gateText(); $('dockGate').textContent = demo ? gateText() : !enabled ? 'Solo observación' : fault ? 'Datos inválidos · pausado' : gateText();
  $('streamStats').textContent = `${demo ? 'DEMO · ' : ''}${sampleCount} muestras ${demo ? 'simuladas' : ''} · ${demo ? demoPackets : decoder.packets} paquetes ${demo ? 'simulados' : 'válidos'} · ${invalidPackets} inválidos · ${appliedClicks} acciones aplicadas · ventana de 5 s a 500 Hz`;
}
function packet(samples, canForward) {
  lastPacketAt = performance.now();
  const available = !demo && canForward && enabled && !fault && window.GhostBridge.available();
  if (!available || available !== wasAvailable) forwardDetector.reset();
  wasAvailable = available;
  for (const adc of samples) {
    lastADC = adc; ring[ringIndex] = adc; ringIndex = (ringIndex + 1) % ring.length; ringSize = Math.min(ringSize + 1, ring.length); sampleCount++;
    const gesture = detector.sample(adc);
    if (gesture === 'left') leftClicks++; else if (gesture === 'right') rightClicks++;
    // Recheck the application after every action: speaking pauses further input.
    if (available && window.GhostBridge.available()) {
      const action = forwardDetector.sample(adc);
      if (action && window.GhostBridge.activate(action === 'left' ? 0 : 2, 'stm32')) appliedClicks++;
    } else forwardDetector.reset();
  }
}
function invalid() {
  invalidPackets++; fault = true; enabled = false; resetDetection();
  $('monitorError').textContent = 'Paquete inválido: no coincide con el formato ADC base 100 de 0 a 4095. Se desactivaron las acciones. Reconecta y verifica la alineación del protocolo.';
}
async function closePort() {
  const closingPort = port;
  try { await closingPort?.close(); } catch { /* A physically removed port may already be closed. */ }
  port = null; connected = false; stopping = false; reader = null; resetDetection(); syncDock(); updateUI();
}
async function readLoop() {
  try {
    if (!port.readable) throw new Error('El puerto no tiene un flujo de lectura disponible.');
    reader = port.readable.getReader();
    while (!stopping) {
      const { value, done } = await reader.read();
      if (done || stopping) break;
      if (!value?.length) continue;
      const now = performance.now();
      const continuous = lastReadAt !== 0 && now - lastReadAt < 1000 && value.length <= 1000;
      if (!continuous) resetDetection();
      lastReadAt = now;
      decoder.push(value, samples => packet(samples, continuous), invalid);
    }
    if (!stopping) connectionMessage = 'Flujo USB finalizado';
  } catch (error) {
    if (!stopping) { connectionMessage = 'Conexión USB interrumpida'; $('monitorError').textContent = `Lectura detenida: ${error.message}. Revisa el cable y vuelve a conectar.`; }
  } finally {
    reader?.releaseLock(); reader = null; enabled = false; await closePort();
  }
}
async function connect() {
  if (!supported || demo || connected || connecting || stopping) return;
  connecting = true; $('monitorError').textContent = ''; updateUI();
  let chosen;
  try {
    // requestPort must be called directly from a user action; no auto-reconnection.
    chosen = await navigator.serial.requestPort();
    await chosen.open({ baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none', bufferSize: 4096 });
    port = chosen; connected = true; stopping = false; enabled = false; fault = false;
    decoder.reset(); ringSize = 0; ringIndex = 0; sampleCount = 0; lastADC = null; lastPacketAt = 0; lastReadAt = 0; invalidPackets = 0; resetDetection();
    syncDock(); readTask = readLoop();
  } catch (error) {
    connectionMessage = 'USB desconectado';
    if (error.name !== 'NotFoundError') $('monitorError').textContent = `No se pudo abrir el puerto: ${error.message}. Cierra MATLAB u otra aplicación que lo esté usando y vuelve a intentar.`;
    else $('monitorInfo').textContent = 'Selección cancelada. Puedes volver a conectar cuando quieras.';
    if (chosen) { try { await chosen.close(); } catch {} }
  } finally { connecting = false; updateUI(); }
}
async function disconnect() {
  if (!connected || stopping) return;
  stopping = true; enabled = false; connectionMessage = 'USB desconectado'; resetDetection(); updateUI();
  try { await reader?.cancel(); } catch {}
  await readTask;
}
function toggleDemo() {
  if (connected || connecting || stopping) return;
  if (!demo) {
    demoSnapshot = { ring: ring.slice(), ringIndex, ringSize, sampleCount, lastADC, lastPacketAt, leftClicks, rightClicks, appliedClicks, invalidPackets, fault, error: $('monitorError').textContent };
    demo = true; enabled = false; fault = false; ringSize = ringIndex = sampleCount = 0; lastADC = null; lastPacketAt = 0;
    leftClicks = rightClicks = appliedClicks = invalidPackets = 0; demoPackets = demoSample = 0; demoTick = performance.now(); $('monitorError').textContent = '';
  } else {
    demo = false; ring.set(demoSnapshot.ring);
    ({ ringIndex, ringSize, sampleCount, lastADC, lastPacketAt, leftClicks, rightClicks, appliedClicks, invalidPackets, fault } = demoSnapshot);
    $('monitorError').textContent = demoSnapshot.error; demoSnapshot = null;
  }
  resetDetection();
  $('monitorDock').dataset.demo = String(demo);
  for (const id of ['signalCanvas','dockCanvas']) {
    const canvas = $(id); canvas.dataset.originalLabel ||= canvas.getAttribute('aria-label');
    canvas.setAttribute('aria-label', demo ? 'DEMO · señal ADC simulada con tres franjas de estados' : canvas.dataset.originalLabel);
  }
  syncDock(); updateUI();
}
function tickDemo(now) {
  if (!demo) return;
  if (now - demoTick > 250) demoTick = now - 50;
  while (now - demoTick >= 50) {
    demoTick += 50;
    const samples = Array.from({ length: 25 }, () => demoADC(demoSample++));
    demoPackets++; packet(samples, false);
  }
}
$('toggleDemo').addEventListener('click', toggleDemo);
$('connectSTM').addEventListener('click', connect);
$('disconnectSTM').addEventListener('click', disconnect);
$('resetCounts').addEventListener('click', () => { leftClicks = rightClicks = appliedClicks = 0; updateUI(); });
$('stmEnabled').addEventListener('change', e => { enabled = e.target.checked && !demo && connected && !fault; forwardDetector.reset(); wasAvailable = false; updateUI(); });
$('thresholdForm').addEventListener('submit', e => {
  e.preventDefault();
  try {
    const values = validateSettings({ lower: Number($('lowerADC').value), upper: Number($('upperADC').value), hold: Number($('holdADC').value) });
    settings = { ...values, showDock: $('showMonitorDock').checked, showEye: $('showSignalEye').checked, eyeStyle: validEyeModel($('eyeStyle').value) };
    detector.configure(settings); forwardDetector.configure(settings); wasAvailable = false; saveSettings(); syncForm(); syncDock(); syncEyes();
    $('thresholdResult').textContent = 'Umbrales aplicados. Esperando reposo estable antes de otra acción.';
  } catch (error) { $('thresholdResult').textContent = error.message; }
  updateUI();
});
window.addEventListener('ghost-mode-change', () => { forwardDetector.reset(); wasAvailable = false; syncDock(); updateUI(); });
window.addEventListener('blur', () => { forwardDetector.reset(); wasAvailable = false; });
document.addEventListener('visibilitychange', () => { forwardDetector.reset(); wasAvailable = false; });
navigator.serial?.addEventListener('disconnect', e => { if (port && (e.target === port || e.port === port)) void disconnect(); });
window.addEventListener('pagehide', () => { void disconnect(); });
function draw(canvas) {
  const rect = canvas.getBoundingClientRect(); if (rect.width < 10 || rect.height < 10) return;
  const dpr = Math.min(devicePixelRatio || 1, 2), w = rect.width, h = rect.height;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const left = 42, right = w - 8, top = 10, bottom = h - 22;
  const y = adc => bottom - adc / 4095 * (bottom - top);
  ctx.fillStyle='#d7e8df';ctx.fillRect(left,top,right-left,y(settings.upper)-top);
  ctx.fillStyle='#eceee8';ctx.fillRect(left,y(settings.upper),right-left,y(settings.lower)-y(settings.upper));
  ctx.fillStyle='#f0d9d1';ctx.fillRect(left,y(settings.lower),right-left,bottom-y(settings.lower));
  ctx.font='10px system-ui';ctx.textAlign='right';
  for (const value of [4095,settings.upper,settings.lower,0]) {
    ctx.fillStyle='#53665d';ctx.fillText(String(value),left-5,y(value)+3);
    ctx.strokeStyle='#7f958a70';ctx.beginPath();ctx.moveTo(left,y(value));ctx.lineTo(right,y(value));ctx.stroke();
  }
  ctx.textAlign='left';ctx.fillText('−5 s',left,h-5);ctx.textAlign='right';ctx.fillText('0 s',right,h-5);
  if (!ringSize) { ctx.textAlign='center';ctx.fillText('Esperando muestras del STM32', (left+right)/2,(top+bottom)/2);return; }
  ctx.strokeStyle='#194c43';ctx.lineWidth=1.5;ctx.beginPath();
  // Preserve spikes when many samples map to one horizontal pixel.
  const step = Math.max(1,Math.ceil(ringSize/Math.max(1,right-left)));
  const oldest=(ringIndex-ringSize+ring.length)%ring.length;
  for(let i=0;i<ringSize;i+=step){
    let min=4095,max=0;for(let j=i;j<Math.min(i+step,ringSize);j++){const a=ring[(oldest+j)%ring.length];min=Math.min(min,a);max=Math.max(max,a);}
    const x=left+(ring.length-ringSize+i)/(ring.length-1)*(right-left);
    if(i===0)ctx.moveTo(x,y(min));else ctx.lineTo(x,y(min));ctx.lineTo(x,y(max));
  }
  ctx.stroke();
}
function frame(now) {
  tickDemo(now);
  const freshEyeSignal = (demo || connected) && !fault && lastADC !== null && lastPacketAt > 0 && now - lastPacketAt <= 1000;
  for (const eye of signalEyes) eye.render(lastADC, { fresh: freshEyeSignal, demo, now, reducedMotion: reducedEyeMotion.matches });
  if (now-lastUI > 66) {
    lastUI=now;
    if (!lastPacketAt || now-lastPacketAt>1000) { forwardDetector.reset(); wasAvailable=false; }
    updateUI();draw($('signalCanvas'));draw($('dockCanvas'));
  }
  requestAnimationFrame(frame);
}
$('monitorInfo').textContent = supported ? 'Chrome/Edge de escritorio · HTTPS · permiso de puerto requerido. La adquisición no necesita MATLAB. Las acciones están desactivadas hasta que las habilites.' : 'Web Serial no está disponible aquí. Abre esta URL HTTPS en Chrome o Edge de escritorio. GHOST sigue funcionando con los clics del mouse.';
syncForm();syncDock();syncEyes();updateUI();requestAnimationFrame(frame);
