export function mountCalibration(engine,monitor){
 const $=id=>document.getElementById(id);const panel=document.createElement('div');panel.className='panel';panel.id='calibrationPanel';
 panel.innerHTML=`<p class="eyebrow">EXPERIMENTO · CALIBRACIÓN POR PERSONA</p><h2>Movimientos pequeños, descanso cómodo</h2><p class="hint">Conecta el STM32 y desactiva la señal de prueba. No necesitas modificar su firmware. Se conserva la señal original y se adapta su interpretación.</p>
 <div class="fields"><label>Persona guardada<select id="calibrationProfiles"><option value="">Sin perfil</option></select></label><label>Nombre de la persona<input id="calibrationName" maxlength="80" placeholder="Ejemplo: Ana"></label><label class="check"><input id="useCalibration" type="checkbox">Usar calibración guardada</label></div>
 <p class="notice">Desmarcada = <strong>No calibrar: ADC bruto del STM32</strong>. Marcada = aplicar el perfil guardado. Set memoriza el perfil en este navegador, no en la placa.</p>
 <div class="buttons"><button id="newCalibration">➕ Nueva persona</button><button id="captureRest">😌 1. Capturar reposo</button><button id="captureLeft">⬅ 2. Capturar izquierda</button><button id="captureRight">➡ 3. Capturar derecha</button><button id="cancelCalibration">Cancelar captura</button><button id="saveCalibration" class="primary">✓ Set · guardar y aplicar</button></div>
 <p id="calibrationStatus" role="status" class="notice"></p><p id="calibrationSummary" class="hint"></p><p id="calibrationValues" class="hint"></p>
 <p class="hint">Cada captura dura 3 segundos: mantén la postura durante toda la captura. Para reposo, mira de forma cómoda y permite las pequeñas variaciones normales. Para cada lado, mantén el movimiento pequeño que usarás para activar. Durante las capturas no se habla ni se seleccionan palabras y el servo se manda al centro. Nada se aplica como calibración nueva hasta Set.</p>
 <p class="hint">Si los dos movimientos quedan del mismo lado del ADC o se mezclan con el ruido del reposo, Set pedirá repetir o revisar los sensores. La calibración no puede inventar una diferencia que el sensor no mide. La gráfica muestra ADC interpretado y el valor bruto se conserva aquí. La demo y Full Demo usan su señal propia, sin calibración personal.</p>
 <p class="notice">Ojo mecánico reducido: carga <a href="./arduino/ghost_servo/ghost_servo.ino" download>el programa Arduino de esta copia</a> para posiciones 75°, 90° y 105°. Es recorrido del servo, no medida de grados reales del ojo humano.</p>`;
 $('monitor').prepend(panel);
 let profileSignature='';
 function text(id,value){if($(id).textContent!==value)$(id).textContent=value}
 function refresh(){
  const state=monitor.status(),signature=JSON.stringify(engine.profiles.map(p=>[p.id,p.name]));
  if(signature!==profileSignature){$('calibrationProfiles').replaceChildren(new Option('Sin perfil',''),...engine.profiles.map(p=>new Option(p.name,p.id)));profileSignature=signature}
  $('calibrationProfiles').value=engine.selected||'';$('useCalibration').checked=engine.enabled;$('useCalibration').disabled=!engine.profile||engine.busy;
  const ready=state.connected&&!state.demo&&!state.fault&&state.fresh;
  for(const id of ['captureRest','captureLeft','captureRight'])$(id).disabled=!ready||engine.busy;
  $('cancelCalibration').disabled=!engine.busy;$('saveCalibration').disabled=engine.busy||!['rest','left','right'].every(k=>engine.draft[k]);
  const labels={rest:'Reposo',left:'Izquierda',right:'Derecha'};
  for(const[key,id]of[['rest','captureRest'],['left','captureLeft'],['right','captureRight']])text(id,(engine.draft[key]?'✓ ':'')+labels[key]+' · capturar 3 s');
  text('calibrationStatus',engine.busy?engine.message+' '+Math.max(0,Math.ceil((3000-(performance.now()-engine.capture.start))/1000))+' s':engine.message);
  const p=engine.profile;
  text('calibrationSummary',p?`${engine.enabled?'ACTIVA':'Desactivada'} · ${p.name} · reposo bruto ${p.restLow.toFixed(1)}–${p.restHigh.toFixed(1)} · izquierda ${p.left.toFixed(1)} · derecha ${p.right.toFixed(1)}`:'Sin perfil activo. Completa las tres capturas y pulsa Set.');
  text('calibrationValues',`ADC bruto: ${state.fresh&&state.raw!==null?state.raw:'—'} · ADC interpretado: ${state.fresh&&state.interpreted!==null?state.interpreted:'—'} · ${state.demo?'Simulación: no se calibra una persona con ella.':engine.enabled?'Se aplica el perfil a la señal real.':'Lectura bruta, sin transformación.'}`);
 }
 $('newCalibration').addEventListener('click',()=>{engine.fresh();$('calibrationName').value='';refresh()});
 $('calibrationProfiles').addEventListener('change',e=>{engine.select(e.target.value);$('calibrationName').value=engine.profile?.name||'';refresh()});
 $('useCalibration').addEventListener('change',e=>{engine.setEnabled(e.target.checked);refresh()});
 for(const[side,id]of[['rest','captureRest'],['left','captureLeft'],['right','captureRight']])$(id).addEventListener('click',()=>{const state=monitor.status();if(!state.connected||state.demo||state.fault||!state.fresh)return;engine.start(side);refresh()});
 $('cancelCalibration').addEventListener('click',()=>{engine.cancel('Captura cancelada. No se guardaron cambios.');refresh()});
 $('saveCalibration').addEventListener('click',()=>{try{engine.save($('calibrationName').value)}catch(e){engine.message=e.message}refresh()});
 window.addEventListener('ghost-calibration-change',refresh);setInterval(refresh,250);$('calibrationName').value=engine.profile?.name||'';refresh();
}
