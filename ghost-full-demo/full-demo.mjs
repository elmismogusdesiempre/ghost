import {nextPresentation} from './presentation-plan.mjs';
const core=window.GhostFullDemoCore,signal=window.GhostFullDemoSignal;
const NORMAL_TIMING={scan:120,hold:350,rest:260,settle:220};
const FAST_TIMING={scan:35,hold:65,rest:65,settle:0};
const TIMING=new Proxy(NORMAL_TIMING,{get:(target,key)=>window.GhostSpeed.enabled?FAST_TIMING[key]:target[key]});
const OPTIONS_KEY='ghost_full_demo_presentation_options_v1';
let options={narrator:false};try{options.narrator=JSON.parse(localStorage.getItem(OPTIONS_KEY)||'{}').narrator===true}catch{}
const ROTATION_KEY='ghost_full_demo_rotation_v1';
let rotation={};try{rotation=JSON.parse(localStorage.getItem(ROTATION_KEY)||'{}')}catch{}
function nextPlan(){
 const plan=nextPresentation(rotation);rotation=plan.next;
 try{localStorage.setItem(ROTATION_KEY,JSON.stringify(rotation))}catch{/* Rotation still works for this page session. */}
 return plan;
}
const bar=document.createElement('div');bar.id='fullDemoBar';bar.setAttribute('role','status');bar.setAttribute('aria-live','polite');document.getElementById('communication').before(bar);
const style=document.createElement('style');style.textContent='#fullDemoBar{order:-1;flex:0 0 auto;background:var(--soft);color:var(--ink);padding:8px 16px;font-size:12px;line-height:1.45;min-height:34px}#fullDemoBar strong{letter-spacing:.08em}';document.head.append(style);
function caption(role,text){const launcher=bar.querySelector('[data-companion-control]');bar.replaceChildren();const label=document.createElement('strong');label.textContent='FULL DEMO · '+(window.GhostFullDemoController?.cycle?'Vuelta '+window.GhostFullDemoController.cycle+' · ':'')+role+' · ';bar.append(label,document.createTextNode(text));if(launcher)bar.append(launcher);}
caption('Demo en bucle','⚙ Ajustes: conecta el ojo mecánico. Ctrl + Alt + F inicia o detiene; Esc detiene.');
export function chooseVoices(list,preferred=''){
 const spanish=list.filter(v=>v.lang?.toLowerCase().startsWith('es'));
 const pool=spanish.length?spanish:list;
 const user=pool.find(v=>v.name===preferred)||pool[0]||null;
 const presenter=pool.find(v=>v!==user&&(v.voiceURI||v.name)!==(user?.voiceURI||user?.name))||user;
 return {presenter,user,fallback:presenter===user};
}
let run=null,speechId=0,lastSpeech=Promise.resolve(),voicePair=null;
function abortError(){return new DOMException('Presentación detenida','AbortError')}
function check(session){
 if(session!==run||session.abort.signal.aborted)throw abortError();
 if(document.hidden||!document.hasFocus())throw new Error('La presentación se detuvo al dejar la ventana. Vuelve a GHOST y pulsa Ctrl + Alt + F.');
 if(session.withServo&&signal.status().servo!=='connected')throw new Error('El servo se desconectó. Revisa el Arduino y vuelve a iniciar Full Demo.');
}
function sleep(ms,session){return new Promise((resolve,reject)=>{
 try{check(session)}catch(e){reject(e);return}
 const onAbort=()=>{clearTimeout(timer);reject(abortError())};
 const timer=setTimeout(()=>{session.abort.signal.removeEventListener('abort',onAbort);try{check(session);resolve()}catch(e){reject(e)}},ms);
 session.abort.signal.addEventListener('abort',onAbort,{once:true});
})}
async function loadVoices(session){
 let available=speechSynthesis.getVoices();
 for(let i=0;!available.length&&!window.GhostSpeed.enabled&&i<12;i++){await sleep(100,session);available=speechSynthesis.getVoices()}
 return chooseVoices(available,core.voice().name);
}
async function talk(text,role,session){
 check(session);core.speaking(true);caption(role==='presenter'?'Presentador':'Voz de GHOST',text);
 if(role==='user'&&!window.GhostSpeed.enabled){
  // Packet → UI state → serial write → small mechanical settling time → speech.
  await Promise.resolve();await signal.output();await sleep(TIMING.settle,session);
 }
 check(session);
 const id=++speechId,u=new SpeechSynthesisUtterance(text),voice=voicePair[role];
 if(voice)u.voice=voice;u.lang=voice?.lang||'es-ES';u.volume=core.voice().volume;
 u.pitch=voicePair.fallback?(role==='presenter'?0.8:1.3):1;u.rate=window.GhostSpeed.enabled?(role==='presenter'?1.1:1.25):(role==='presenter'?1:0.95);
 speechSynthesis.cancel();speechSynthesis.resume();
 await new Promise((resolve,reject)=>{
  let done=false;
  const finish=error=>{if(done)return;done=true;clearTimeout(timer);session.abort.signal.removeEventListener('abort',onAbort);if(id===speechId)core.speaking(false);error?reject(error):resolve()};
  const onAbort=()=>{speechSynthesis.cancel();finish(abortError())};
  const timer=setTimeout(()=>{speechSynthesis.cancel();finish(new Error('La voz del sistema no respondió. Prueba la voz en configuración y reinicia la presentación.'))},Math.max(20000,text.length*250));
  u.onend=()=>finish();u.onerror=e=>{if(window.GhostSpeed.enabled&&['canceled','interrupted'].includes(e.error)){finish();return}finish(new Error('No se pudo reproducir la voz del sistema ('+e.error+'). Revisa la voz y reinicia Full Demo.'))};
  session.abort.signal.addEventListener('abort',onAbort,{once:true});
  try{speechSynthesis.speak(u)}catch(e){finish(e)}
 });
 session.restSince=null; // Speech pauses the detector; require fresh stable rest afterwards.
 check(session);
}
async function rest(session){
 if(signal.status().state!=='rest'||session.restSince==null){signal.state('rest');session.restSince=performance.now()}
 const remaining=Math.max(TIMING.rest,signal.status().hold+(window.GhostSpeed.enabled?50:100))-(performance.now()-session.restSince);
 if(remaining>0)await sleep(remaining,session);else check(session);
 await signal.output();
}
async function pulse(state,withSpeech,session){
 check(session);await rest(session);
 const event=new Promise((resolve,reject)=>{
  const finish=(error)=>{clearTimeout(timer);window.removeEventListener('ghost-full-demo-action',listener);session.abort.signal.removeEventListener('abort',onAbort);error?reject(error):resolve()};
  const listener=e=>{if(e.detail.state===state)finish()};
  const onAbort=()=>finish(abortError());
  const timer=setTimeout(()=>finish(new Error('La señal simulada no activó GHOST. Vuelve a iniciar la presentación con esta ventana activa.')),4000);
  window.addEventListener('ghost-full-demo-action',listener);session.abort.signal.addEventListener('abort',onAbort,{once:true});
 });
 session.restSince=null;signal.state(state);await event;await sleep(Math.max(TIMING.hold,signal.status().hold+(window.GhostSpeed.enabled?50:100)),session);
 if(withSpeech&&!window.GhostSpeed.enabled)await lastSpeech;
 await rest(session);
}
async function select(text,session){
 for(let page=0;page<20;page++){
  check(session);const targets=core.targets(),goal=targets.includes(text)?text:'Página siguiente';
  if(!targets.includes(goal))throw new Error('No se encontró la opción de presentación: '+text);
  // Traverse the real visible targets in order, including pagination controls.
  for(let step=0;step<=targets.length;step++){
   caption('Barrido',`Buscando: ${text} · resaltado: ${core.current()}`);
   await sleep(TIMING.scan,session);
   if(core.current()===goal){await pulse('left',false,session);break}
   core.advance();
  }
  if(goal===text)return;
 }
 throw new Error('No se pudo recorrer el vocabulario de la presentación.');
}
async function word(category,text,session){
 if(core.state().categoryLabel!==category){
  if(core.state().category!==null)await select('Volver a categorías',session);
  await select(category,session);
 }
 await select(text,session);
}
function stop(message='Presentación detenida · Ctrl + Alt + F para reiniciar.'){
 const session=run;if(!session)return;
 run=null;session.abort.abort();speechId++;speechSynthesis.cancel();
 signal.end();core.end();caption('Presentación automática',message);
}
async function start(){
 if(run){stop();return}
 window.GhostQuickSettings?.close();
 if(!('speechSynthesis' in window)){caption('No disponible','Este navegador no dispone de voz sintetizada del sistema.');return}
 try{signal.assertReady()}catch(e){caption('Preparación',e.message);return}
 const session={abort:new AbortController(),withServo:signal.status().servo==='connected',narrator:options.narrator,cycle:0};run=session;
 try{
  core.begin(text=>{
   lastSpeech=talk(text,'user',session);
   // The controller awaits this task after the detected right/yes/no action.
   lastSpeech.catch(error=>{if(run===session&&window.GhostSpeed.enabled&&error.name!=='AbortError')stop(error.message)});
  });
  signal.begin();voicePair=await loadVoices(session);await rest(session);
  if(session.narrator)await talk('GHOST ayuda a personas con movilidad reducida a comunicarse mediante movimientos mínimos.','presenter',session);
  while(run===session){
  check(session);const plan=nextPlan();session.cycle++;core.stage(1);core.clear();
  window.dispatchEvent(new CustomEvent('ghost-full-demo-cycle',{detail:{cycle:session.cycle,phrases:plan.phrases,messages:plan.messages.map(words=>words.map(w=>w[1]).join(' ')),narrator:session.narrator}}));
  if(session.narrator)await talk('En la primera etapa, la persona solamente dice sí o no.','presenter',session);
  for(const state of ['left','right','left','right'])await pulse(state,true,session);
  core.stage(2);await rest(session);
  if(session.narrator)await talk('En la segunda etapa, la persona se comunica con frases de uso frecuente que se pueden personalizar.','presenter',session);
  for(const text of plan.phrases){
   await select(text,session);if(core.state().selected!==text)throw new Error('La frase seleccionada no coincide con la presentación.');
   await pulse('right',true,session);
  }
  core.stage(3);await rest(session);
  if(session.narrator)await talk('En la tercera etapa, la persona combina palabras de distintas categorías para construir sus propios mensajes.','presenter',session);
  for(const words of plan.messages){
   core.clear();
   for(const [category,text]of words)await word(category,text,session);
   const expected=words.map(w=>w[1]).join(' ');
   if(core.state().message!==expected)throw new Error('El mensaje construido no coincide con el recorrido de palabras.');
   await pulse('right',true,session);
  }
  await rest(session);await signal.output();check(session);
  caption('Demo en bucle','Vuelta completada. Continúa con ejemplos diferentes…');await sleep(window.GhostSpeed.enabled?80:700,session);
  }
 }catch(error){if(run===session)stop(error.name==='AbortError'?'Presentación detenida.':error.message)}
}
window.GhostFullDemoController=Object.freeze({start,stop,get active(){return !!run},get cycle(){return run?.cycle||0},get narrator(){return options.narrator},
 setNarrator(value){options.narrator=value===true;try{localStorage.setItem(OPTIONS_KEY,JSON.stringify(options))}catch{}}
});
window.addEventListener('keydown',event=>{
 if(event.ctrlKey&&event.altKey&&!event.shiftKey&&event.code==='KeyF'){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)void start()}
 else if(event.key==='Escape'&&run){event.preventDefault();event.stopImmediatePropagation();stop()}
},{capture:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&run)stop('Presentación detenida al ocultar la pestaña. Ctrl + Alt + F para reiniciar.')});
window.addEventListener('blur',()=>{if(run)stop('Presentación detenida al salir de esta ventana. Ctrl + Alt + F para reiniciar.')});
window.addEventListener('pagehide',()=>stop());
// Stop promptly if an attached servo fails, including while the narrator is speaking.
setInterval(()=>{if(run){try{check(run)}catch(error){stop(error.message)}}},150);

window.addEventListener('ghost-mode-change',()=>{if(run)run.restSince=null});
