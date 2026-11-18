const companion=window.GhostCompanion,monitor=window.GhostMonitorControls,demo=window.GhostFullDemoController;
const dialog=document.createElement('dialog');dialog.id='companionDialog';dialog.setAttribute('aria-labelledby','companionTitle');dialog.setAttribute('data-companion-control','');
dialog.innerHTML=`<header class="companion-heading"><div><p class="eyebrow">ESPACIO DEL ACOMPAÑANTE</p><h2 id="companionTitle">¿Qué quieres preparar?</h2><p class="hint">GHOST sigue aquí, detrás. Mientras ajustas, la comunicación está en pausa.</p><p id="companionCountdown" class="hint" role="timer" aria-live="off"></p></div><button id="closeCompanion" aria-label="Cerrar ajustes y volver a comunicar">Volver a GHOST ✕</button></header>
<div id="companionMessage" role="status"></div>
<div class="companion-grid"><section class="companion-card"><span class="companion-icon" aria-hidden="true">🎯</span><h3>Calibración personal</h3><p>Aprende el reposo cómodo y los movimientos pequeños de cada persona. Guarda con Set o vuelve al ADC bruto.</p><button id="visualCalibration">Calibrar a la persona →</button><p class="hint">Tres capturas de 3 segundos con el STM32 real. No se guardan datos de la simulación.</p></section>
<section class="companion-card"><span class="companion-icon" aria-hidden="true">🔌</span><h3>Señal del cuerpo</h3><p>Conecta el STM32 para recibir la señal de la persona. Elige su puerto USB.</p><p id="visualSTMStatus" class="companion-state"></p><div class="companion-actions"><button id="visualConnectSTM">Conectar STM32</button><button id="visualDisconnectSTM">Desconectar</button></div><button id="visualUseSTM" aria-pressed="false">Usar señal para comunicar</button><p class="hint">Actívalo para que las señales seleccionen y hagan hablar a GHOST. Para Full Demo no necesitas el STM32.</p></section>
<section class="companion-card"><span class="companion-icon" aria-hidden="true">👁️</span><h3>Ojo mecánico</h3><p>Para el recorrido pequeño, carga primero el programa UNO de esta copia. Después conecta el Arduino en un puerto distinto del STM32. <a href="./arduino/ghost_servo/ghost_servo.ino" download>Descargar programa del ojo (±15°)</a>.</p><p id="visualServoStatus" class="companion-state"></p><div class="companion-actions"><button id="visualConnectServo">Conectar ojo</button><button id="visualDisconnectServo">Desconectar</button></div><button id="visualMirror" aria-pressed="false">Modo espejo</button><p class="hint">Invierte izquierda y derecha del motor si el montaje lo necesita. El centro no cambia.</p></section>
<section class="companion-card companion-demo"><span class="companion-icon" aria-hidden="true">▶️</span><h3>Full Demo automática</h3><p>Recorre las tres etapas en bucle, con frases diferentes en cada vuelta. El ojo mecánico acompaña si ya está conectado.</p><label class="companion-check"><input id="visualNarrator" type="checkbox"><span>Con presentación hablada<small>Desmarcado: solo habla GHOST; los estudiantes pueden explicar el proyecto. Marcado: se añade el narrador.</small></span></label><label class="companion-check"><input id="visualSuperSpeed" type="checkbox"><span>⚡ SuperSpeed<small>Acelera GHOST y la demo, sin espera entre clics. La nueva voz corta la anterior y no espera al ojo. Los tiempos normales se conservan al desmarcarlo.</small></span></label><button id="visualStartDemo" class="primary">▶ Iniciar Full Demo en bucle</button><p id="visualDemoStatus" class="companion-state"></p><p class="hint">Ctrl + Alt + F inicia o detiene. Esc también detiene. Abrir estos ajustes detiene la demo.</p></section>
<section class="companion-card"><span class="companion-icon" aria-hidden="true">💬</span><h3>Etapa de comunicación</h3><p>Elige lo que necesita la persona ahora. No hace falta completar la etapa anterior.</p><div class="companion-stages"><button data-stage="1" aria-pressed="false">✅ ❌<strong>Sí / No</strong><small>Dos respuestas directas.</small></button><button data-stage="2" aria-pressed="false">🗣️<strong>Frases útiles</strong><small>Mensajes preparados.</small></button><button data-stage="3" aria-pressed="false">✍️<strong>Construir frases</strong><small>Combinar palabras.</small></button></div></section>
<section class="companion-card"><span class="companion-icon" aria-hidden="true">📊</span><h3>Lo que se ve en pantalla</h3><p>Muestra u oculta las ayudas visuales, sin cambiar cómo se interpreta la señal.</p><button id="visualGraph" aria-pressed="false">Mostrar gráfica</button><button id="visualEye" aria-pressed="false">Mostrar ojo en pantalla</button><p class="hint">Ocultar la gráfica no desconecta el STM32 ni el ojo mecánico.</p></section>
<section class="companion-card"><span class="companion-icon" aria-hidden="true">🧪</span><h3>Probar sin STM32</h3><p>La señal de prueba mueve la gráfica y puede mover el ojo conectado. No selecciona palabras por sí sola.</p><button id="visualSignalDemo" aria-pressed="false">Activar señal de prueba</button><p class="hint">Es diferente de Full Demo, que sí muestra automáticamente cómo comunicar.</p><button id="visualTechnical" class="companion-technical">⚙ Ajustes técnicos completos →</button><p class="hint">Conserva todos los umbrales, voces, listas, colores y opciones avanzadas. Atajo: Ctrl + Alt + T.</p></section>
</div><footer class="companion-footer"><button id="companionDone" class="primary">✓ Listo, volver a comunicar</button></footer>`;
document.body.append(dialog);
const css=document.createElement('style');css.textContent=`
#fullDemoBar{position:relative;padding-right:166px!important;min-height:52px!important}
#openCompanion{position:absolute;right:8px;top:50%;transform:translateY(-50%);min-height:40px;padding:8px 12px;font-weight:700;background:var(--accent);color:var(--bg);cursor:pointer!important;pointer-events:auto}
body.visual-settings-open,body.visual-settings-open *{cursor:auto!important;user-select:auto}
body.visual-settings-open button,body.visual-settings-open input{cursor:pointer!important}
#companionDialog{width:min(1140px,96vw);max-height:92dvh;overflow:auto;border:0;padding:24px;background:var(--bg);color:var(--ink);box-shadow:0 16px 90px #0005}
#companionDialog::backdrop{background:rgba(22,39,35,.4)}
#companionDialog .companion-heading{padding:0 0 18px;border:0;align-items:flex-start;gap:16px}#companionTitle{font-size:clamp(1.6rem,3vw,2.3rem);margin:4px 0}
.companion-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.companion-card{background:var(--surface);padding:20px;display:flex;flex-direction:column;gap:10px;min-width:0}.companion-card h3{font-size:1.2rem}.companion-card p{font-size:.84rem;line-height:1.5}.companion-icon{font-size:2.3rem;line-height:1.2}.companion-card button{font-size:.9rem;font-weight:650;min-height:48px;white-space:normal}.companion-actions{display:grid;grid-template-columns:1.3fr 1fr;gap:8px}.companion-card button[aria-pressed=true]{background:var(--accent);color:var(--bg);box-shadow:inset 0 -4px 0 #9abc8a}.companion-state{font-weight:650;color:var(--accent);overflow-wrap:anywhere}.companion-check{display:flex;flex-direction:row;align-items:flex-start;gap:10px;padding:12px;background:var(--soft);cursor:pointer}.companion-check input{flex:0 0 auto;margin-top:4px}.companion-check small{display:block;font-size:.78rem;line-height:1.5;margin-top:5px;color:var(--muted)}.companion-stages{display:grid;gap:8px}.companion-stages button{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;text-align:left}.companion-stages small{grid-column:2;font-size:.75rem;font-weight:400}.companion-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:20px}.companion-footer span{font-size:.8rem;color:var(--muted)}#companionMessage:not(:empty){padding:12px;background:var(--soft);margin-bottom:14px;font-weight:650}
@media(max-width:900px){.companion-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){#companionDialog{padding:16px}.companion-grid{grid-template-columns:1fr}#companionDialog .companion-heading{flex-direction:column}.companion-footer{align-items:stretch;flex-direction:column}#fullDemoBar{padding-right:120px!important}#openCompanion{font-size:11px;padding:6px 8px}}
`;document.head.append(css);
const launcher=document.createElement('button');launcher.id='openCompanion';launcher.setAttribute('data-companion-control','');launcher.setAttribute('aria-haspopup','dialog');launcher.setAttribute('aria-controls','companionDialog');launcher.textContent='⚙ Ajustes fáciles';document.getElementById('fullDemoBar').append(launcher);
const $=id=>document.getElementById(id);let idleSince=Date.now(),pending=0;
function text(id,value){if($(id).textContent!==value)$(id).textContent=value}
function pressed(id,value,label){$(id).setAttribute('aria-pressed',String(value));text(id,(value?'✓ ':'')+label)}
function refresh(){
 launcher.textContent=demo.active?'⏹ Detener demo':'⚙ Ajustes fáciles';
 if(!dialog.open)return;
 const state=monitor.status();
 text('visualSTMStatus',!state.supported?'Necesitas Chrome o Edge de escritorio en HTTPS.':state.fault?'Señal no válida. Desconecta y vuelve a conectar el STM32.':state.connected?'STM32 conectado':state.connecting?'Selecciona el puerto USB del STM32.':state.stmMessage&&state.stmMessage!=='USB desconectado'?'Sin conexión. Revisa el USB y cierra otras apps que usen el STM32.':'STM32 sin conectar');
 text('visualServoStatus',({connected:'Ojo conectado · listo para la demo',choosing:'Selecciona el puerto USB del Arduino.',opening:'Conectando el ojo…',booting:'Preparando el ojo. Espera unos segundos…',closing:'Centrando y desconectando el ojo…',disconnected:'Ojo sin conectar',error:'Conexión del ojo no disponible. Revisa el USB y cierra otras apps que usen el Arduino.'})[state.servo]);
 $('visualConnectSTM').disabled=!state.supported||state.connected||state.connecting||state.stopping||pending>0;
 $('visualDisconnectSTM').disabled=!state.connected||state.stopping||pending>0;
 $('visualConnectServo').disabled=!state.supported||!['disconnected','error'].includes(state.servo)||pending>0;
 $('visualDisconnectServo').disabled=['disconnected','error','closing','choosing'].includes(state.servo)||pending>0;
 $('visualUseSTM').disabled=!state.connected||state.demo||state.fault;
 pressed('visualUseSTM',state.enabled,'Usar señal para comunicar');pressed('visualMirror',state.mirror,'Modo espejo');
 pressed('visualGraph',state.showDock,'Mostrar gráfica');pressed('visualEye',state.showEye,'Mostrar ojo en pantalla');
 pressed('visualSignalDemo',state.demo,'Señal de prueba');$('visualSignalDemo').disabled=state.connected||state.connecting||state.stopping||pending>0;
 $('visualNarrator').checked=demo.narrator;
 $('visualSuperSpeed').checked=window.GhostSpeed.enabled;
 for(const button of dialog.querySelectorAll('[data-stage]'))button.setAttribute('aria-pressed',String(Number(button.dataset.stage)===companion.stage()));
 text('visualDemoStatus',demo.narrator?'Con presentación: añade la voz del narrador.':'Sin presentación: solo escucharás los mensajes de GHOST.');
 $('visualStartDemo').disabled=pending>0||state.connecting||state.stopping||['choosing','opening','booting','closing'].includes(state.servo);
 const remaining=Math.max(0,30-Math.floor((Date.now()-idleSince)/1000));
 text('companionCountdown',pending?'Esperando el permiso o la conexión USB…':`Se cierra tras ${remaining} s sin actividad para volver a comunicar.`);
 if(!pending&&remaining===0)close();
}
function open(){
 if(dialog.open)return;
 demo.stop('Demo detenida para ajustar.');companion.open();idleSince=Date.now();text('companionMessage','');dialog.showModal();refresh();$('closeCompanion').focus();
}
function close(){if(!dialog.open)return;dialog.close();companion.close();document.activeElement?.blur()}
function toggle(){dialog.open?close():open()}
async function operation(action){
 pending++;idleSince=Date.now();text('companionMessage','');refresh();
 try{await action()}catch(error){text('companionMessage',error.message||'No se pudo completar la conexión. Revisa el dispositivo y vuelve a intentar.')}
 finally{pending--;idleSince=Date.now();refresh()}
}
launcher.addEventListener('click',open);$('closeCompanion').addEventListener('click',close);$('companionDone').addEventListener('click',close);
dialog.addEventListener('cancel',event=>{event.preventDefault();close()});
for(const event of ['pointerdown','keydown','input','change','wheel'])dialog.addEventListener(event,()=>{idleSince=Date.now()},{passive:true});
$('visualConnectSTM').addEventListener('click',()=>void operation(()=>monitor.connectSTM()));$('visualDisconnectSTM').addEventListener('click',()=>void operation(()=>monitor.disconnectSTM()));
$('visualConnectServo').addEventListener('click',()=>void operation(()=>monitor.connectServo()));$('visualDisconnectServo').addEventListener('click',()=>void operation(()=>monitor.disconnectServo()));
$('visualUseSTM').addEventListener('click',()=>{monitor.useSTM(!monitor.status().enabled);refresh()});
$('visualMirror').addEventListener('click',()=>{monitor.mirror(!monitor.status().mirror);refresh()});
$('visualGraph').addEventListener('click',()=>{monitor.showDock(!monitor.status().showDock);refresh()});$('visualEye').addEventListener('click',()=>{monitor.showEye(!monitor.status().showEye);refresh()});
$('visualSignalDemo').addEventListener('click',()=>{monitor.toggleDemo();refresh()});
$('visualSuperSpeed').addEventListener('change',event=>{window.GhostSpeed.set(event.target.checked);refresh()});
$('visualNarrator').addEventListener('change',event=>{demo.setNarrator(event.target.checked);refresh()});
for(const button of dialog.querySelectorAll('[data-stage]'))button.addEventListener('click',()=>{companion.setStage(Number(button.dataset.stage));refresh()});
$('visualCalibration').addEventListener('click',()=>{companion.technical();document.getElementById('tab-monitor').click();document.getElementById('calibrationPanel').scrollIntoView({block:'start'});document.getElementById('calibrationName').focus()});
$('visualTechnical').addEventListener('click',()=>companion.technical());
$('visualStartDemo').addEventListener('click',()=>{try{window.GhostFullDemoSignal.assertReady();close();void demo.start()}catch(error){text('companionMessage',error.message);idleSince=Date.now()}});
window.GhostQuickSettings=Object.freeze({open,close,toggle,get isOpen(){return dialog.open}});
setInterval(refresh,250);window.GhostBridge.refresh();
