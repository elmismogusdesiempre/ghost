const KEY = 'ghost_mobile_v2';
const $ = id => document.getElementById(id);
const norm = s => String(s || '').trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const defaults = {stage:1,profile:'adult',speed:1800,pause:1600,debounce:250,minClick:0,shortcut:'KeyM',cols:4,scale:1,visual:'both',contrast:false,clearAfter:false,voice:'',rate:1,pitch:1,volume:1};
const BASIC = [{text:'Sí',speech:'Sí',emoji:'✅'},{text:'No',speech:'No',emoji:'❌'}];
const phraseDefaults = {
 adult:[['Necesito ayuda','🙋'],['Quiero agua','💧'],['Quiero ir al baño','🚽'],['Tengo dolor','🤕'],['Quiero cambiar de posición','🛏️'],['Espere, por favor','✋'],['No entiendo','❔'],['Gracias','🙏'],['Quiero hablar con mi familia','👪'],['Necesito ayuda médica','🩺']],
 child:[['Quiero agua','💧'],['Tengo hambre','🍎'],['Quiero ir al baño','🚽'],['Me duele','🤕'],['Quiero jugar','🧸'],['Quiero a mi familia','👪'],['Necesito ayuda','🙋'],['Estoy cansado','😴'],['Otra vez, por favor','🔁'],['Gracias','💛']]
};
const clone = x => JSON.parse(JSON.stringify(x));
const categoryIds = new Set(CATEGORIES.map(c=>c.id));
function validEntry(w){
 if(!w || typeof w.text!=='string' || !w.text.trim()) return null;
 return {text:w.text.trim().slice(0,500),speech:typeof w.speech==='string'&&w.speech.trim()?w.speech.trim().slice(0,500):w.text.trim().slice(0,500),emoji:typeof w.emoji==='string'?w.emoji.slice(0,20):'💬',category:categoryIds.has(w.category)?w.category:'otros',favorite:!!w.favorite,custom:!!w.custom};
}
const baseWords = [...CORE_VOCAB,...PHRASES].map(validEntry);
function defaultPhrases(profile){return phraseDefaults[profile].map(([text,emoji])=>validEntry({text,emoji,category:'frases'}));}
function sanitizeSettings(raw={}){
 const s={...defaults};
 for(const key of ['stage','speed','pause','debounce','minClick','cols','scale','rate','pitch','volume']){
  const bounds={stage:[1,3],speed:[500,15000],pause:[0,10000],debounce:[0,1500],minClick:[0,3000],cols:[2,6],scale:[1,1.4],rate:[.3,2],pitch:[.5,2],volume:[0,1]}[key];
  if(typeof raw[key]==='number'&&Number.isFinite(raw[key])) s[key]=Math.max(bounds[0],Math.min(bounds[1],raw[key]));
 }
 s.stage=Math.round(s.stage);s.cols=Math.round(s.cols);
 for(const key of ['contrast','clearAfter']) if(typeof raw[key]==='boolean') s[key]=raw[key];
 if(['adult','child'].includes(raw.profile)) s.profile=raw.profile;
 if(['both','text','symbols'].includes(raw.visual)) s.visual=raw.visual;
 if(['KeyM','KeyG','KeyY'].includes(raw.shortcut)) s.shortcut=raw.shortcut;
 if(typeof raw.voice==='string') s.voice=raw.voice.slice(0,300);
 return s;
}
function cleanList(list){if(!Array.isArray(list)||list.length>5000) throw Error('Lista inválida o demasiado extensa (máximo 5000 elementos).');return list.map(validEntry).filter(Boolean);}
function parseBackup(data){
 if(!data || data.version!==2 || !data.settings || !data.phrases) throw Error('El respaldo no tiene un formato compatible.');
 return {version:2,settings:sanitizeSettings(data.settings),phrases:{adult:cleanList(data.phrases.adult),child:cleanList(data.phrases.child)},words:cleanList(data.words)};
}
let db={version:2,settings:{...defaults},phrases:{adult:defaultPhrases('adult'),child:defaultPhrases('child')},words:clone(baseWords)};
let loadNotice='';
try{
 const saved=localStorage.getItem(KEY)||localStorage.getItem('ghost_caa_v2');
 if(saved) db=parseBackup(JSON.parse(saved));
 else{
  const legacy=JSON.parse(localStorage.getItem('ghost_caa_v1')||'null');
  if(legacy){
   if(Array.isArray(legacy.custom)) db.words.push(...cleanList(legacy.custom));
   if(legacy.favOverrides) db.words.forEach(w=>{if(typeof legacy.favOverrides[norm(w.text)]==='boolean')w.favorite=legacy.favOverrides[norm(w.text)];});
   const old=legacy.settings||{};
   db.settings=sanitizeSettings({...defaults,speed:old.scanSpeed,voice:old.voiceName,rate:old.rate,pitch:old.pitch,volume:old.volume,cols:old.cols,scale:old.fontScale,contrast:old.contrast,visual:old.visualMode});
   const imported=db.words.filter(w=>w.custom&&(w.category==='frases'||w.text.split(/\s+/).length>2));
   for(const p of ['adult','child']) db.phrases[p].push(...imported.map(clone));
   loadNotice='Se conservó el vocabulario de la versión anterior.';
  }
 }
}catch{loadNotice='No se pudo recuperar la configuración guardada. Puedes importar tu respaldo en configuración.';}
let config=false,category=null,index=0,targets=[],message='',selected=null,timer=null,pauseUntil=0,lastInput=-Infinity,lastButton=-1,voices=[],speaking=false,speechToken=0,spokenTimer=null,activeUtterance=null,progressStart=0,currentTab='general';
let activeWindow=!document.hidden;
const mobilePress={down:false,id:null,fired:false,action:null,view:0};
let selectionTimer=null,viewRevision=0,pendingSpeech=null;
function cancelMobilePress(release=false){clearTimeout(selectionTimer);selectionTimer=null;pendingSpeech=null;mobilePress.action=null;if(release){mobilePress.down=false;mobilePress.id=null;}}

function notify(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').hidden=true,4500);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(db));}catch{notify('No se pudo guardar en este navegador. Descarga un respaldo antes de cerrar.');}}
function applyAppearance(){
 const s=db.settings;
 document.body.classList.toggle('child',s.profile==='child');document.body.classList.toggle('contrast',s.contrast);
 document.body.classList.toggle('text-only',s.visual==='text');document.body.classList.toggle('symbols-only',s.visual==='symbols');
 document.documentElement.style.setProperty('--cols',s.cols);document.documentElement.style.setProperty('--font',s.scale);
}
function element(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function tile(item,action,extra=''){
 const b=element('button','tile '+extra);b.type='button';b.append(element('span','emoji',item.emoji),element('span','label',item.text));b.setAttribute('aria-label',item.text);
 targets.push({el:b,action,item});return b;
}
function phraseList(){return [...BASIC,...db.phrases[db.settings.profile].filter(w=>!['si','no'].includes(norm(w.text)))];}
function wordsFor(cat){return db.words.filter(w=>cat==='favoritos'?w.favorite:w.category===cat);}
function stopScan(){clearTimeout(timer);timer=null;}
function canScan(){return !config&&!mobilePress.down&&activeWindow&&!document.hidden&&!speaking;}
function scheduleScan(delay=db.settings.speed){
 stopScan();if(!canScan())return;
 const actual=Math.max(delay,pauseUntil-Date.now());progressStart=Date.now();
 timer=setTimeout(()=>{if(!canScan())return;index=(index+1)%targets.length;highlight();scheduleScan();},actual);
 const fill=$('scanProgress');if(fill){fill.style.transition='none';fill.style.width='0%';requestAnimationFrame(()=>{if(fill.isConnected){fill.style.transition=`width ${actual}ms linear`;fill.style.width='100%';}});}
}
function highlight(){
 targets.forEach((t,i)=>{t.el.classList.toggle('scanning',i===index);if(i===index)t.el.setAttribute('aria-current','true');else t.el.removeAttribute('aria-current');});
 const status=$('scanStatus');if(status) status.textContent=!activeWindow?'Barrido en pausa · vuelve a esta ventana':speaking?'Hablando…':`Barrido automático · ${index+1} / ${targets.length}`;

}
function updateMessage(){const m=$('messageText');if(m){m.textContent=db.settings.stage===2?(selected?.text||'Selecciona una frase'):message||'Tu mensaje aparecerá aquí';m.classList.toggle('empty',db.settings.stage===2?!selected:!message);m.scrollTop=m.scrollHeight;}targets.forEach(t=>t.el.classList.toggle('chosen',db.settings.stage===2&&t.item===selected));}
let screenPage=0,screenKey='',resizeTimer;
function fitCommunicationGrid(){
 const grid=$('grid');if(!grid)return;
 const all=targets.filter(t=>grid.contains(t.el));const controls=targets.filter(t=>!grid.contains(t.el));const key=[db.settings.stage,db.settings.profile,category].join(':');
 if(key!==screenKey){screenPage=0;screenKey=key;}
 const rect=grid.getBoundingClientRect();
 const maxCols=Math.max(2,Math.floor(rect.width/(110*db.settings.scale)));
 const maxRows=Math.max(2,Math.floor(rect.height/(84*db.settings.scale)));
 let cols=Math.min(maxCols,Math.max(db.settings.cols,Math.ceil(Math.sqrt(all.length*rect.width/Math.max(1,rect.height)))));
 cols=Math.max(2,cols);
 const capacity=Math.max(4,cols*maxRows);
 const paged=all.length>capacity;
 const perPage=paged?capacity-2:capacity;
 const pageCount=Math.max(1,Math.ceil(all.length/perPage));
 screenPage=Math.min(screenPage,pageCount-1);
 const visible=all.slice(screenPage*perPage,(screenPage+1)*perPage);
 grid.replaceChildren();targets=visible;
 visible.forEach(t=>grid.append(t.el));
 if(paged){
  grid.append(tile({text:'Página anterior',emoji:'←'},()=>{screenPage=(screenPage+pageCount-1)%pageCount;renderCommunication();},'action'));
  grid.append(tile({text:'Página siguiente',emoji:'→'},()=>{screenPage=(screenPage+1)%pageCount;renderCommunication();},'action'));
  const label=$('scanStatus').previousElementSibling;label.textContent+=` · Página ${screenPage+1} de ${pageCount}`;
 }
 const visibleCount=targets.length;targets.push(...controls);cols=Math.min(cols,visibleCount);
 grid.style.setProperty('--fit-cols',cols);grid.style.setProperty('--fit-rows',Math.ceil(visibleCount/cols));
}
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!config)renderCommunication();},120);});
window.visualViewport?.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!config)renderCommunication();},120);});
function renderCommunication(){
 cancelMobilePress();viewRevision++;stopScan();applyAppearance();targets=[];index=0;
 const root=$('communication');root.replaceChildren();const s=db.settings;
 $('header').hidden=s.stage===1;
 if(s.stage===1){
  root.className='basic';BASIC.forEach((w,i)=>{const b=tile(w,()=>basicSay(i),i?'no':'yes');b.append(element('span','caption','Un clic cuando esté resaltado'));root.append(b);});highlight();scheduleScan();return;
 }
 root.className='layout';$('modeLabel').replaceChildren(element('span','dot'),document.createTextNode('Modo de comunicación'));
 const intro=element('div','intro');const title=element('div');title.append(element('p','eyebrow','TU VOZ, A TU RITMO'),element('h1','',s.stage===2?'Lo que quiero decir.':'Cada palabra cuenta.'),element('p','hint',s.stage===2?'Elige una frase y se escuchará.':'Construye tu mensaje, palabra a palabra.'));const mark=element('div','stage-mark');mark.append(element('strong','',`0${s.stage}`),document.createTextNode(' / 03'));intro.append(title,mark);root.append(intro);
 const box=element('section','message');box.setAttribute('aria-label',s.stage===2?'Frase seleccionada':'Mensaje');box.append(element('p','eyebrow',s.stage===2?'FRASE SELECCIONADA · VOZ AUTOMÁTICA':'MI MENSAJE · SELECCIONA HABLAR'),element('p','message-text',''));box.lastChild.id='messageText';root.append(box);
 const trail=element('div','trail');trail.append(element('span','',s.stage===2?'Tus frases útiles':category?category==='keyboard'?'Teclado':CATEGORIES.find(c=>c.id===category)?.label||category:'Elige una categoría'),element('span','',''));trail.lastChild.id='scanStatus';root.append(trail);
 const grid=element('div','grid');grid.id='grid';root.append(grid);
 if(s.stage===2){phraseList().forEach(w=>grid.append(tile(w,()=>{selected=w;updateMessage();pauseAfter();speak(w.speech);})));}
 else if(!category){
  for(const c of CATEGORIES){if(wordsFor(c.id).length)grid.append(tile({text:c.label,emoji:c.emoji},()=>{category=c.id;renderCommunication();}));}
  grid.append(tile({text:'Escribir con letras',emoji:'⌨️'},()=>{category='keyboard';renderCommunication();}));addMessageActions(grid);
 }else{
  grid.append(tile({text:'Volver a categorías',emoji:'↩'},()=>{category=null;renderCommunication();},'action'));
  if(category==='keyboard'){
   for(const char of 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZÁÉÍÓÚÜ0123456789.,¿?¡!') grid.append(tile({text:char,emoji:''},()=>{message+=char.toLocaleLowerCase('es');updateMessage();pauseAfter();},'letter-key'));
   grid.append(tile({text:'Espacio',emoji:'␣'},()=>{message+=' ';updateMessage();pauseAfter();}));
  }else wordsFor(category).forEach(w=>grid.append(tile(w,()=>{message+=(message&&!message.endsWith(' ')?' ':'')+w.speech;updateMessage();pauseAfter();})));
  addMessageActions(grid);
 }
 const progress=element('div','progress');progress.setAttribute('aria-hidden','true');const fill=element('span');fill.id='scanProgress';progress.append(fill);root.append(progress);
 const legend=element('footer','legend');for(const [key,text] of [['Un clic','Seleccionar la opción resaltada']]){const p=element('span');p.append(element('strong','',key),document.createTextNode(' · '+text));legend.append(p);}legend.append(element('span','key',shortcutLabel()+' · Configurar'));root.append(legend);
 const status=element('p','hint');status.id='speechStatus';status.setAttribute('role','status');root.append(status);
 fitCommunicationGrid();updateMessage();highlight();scheduleScan();
}
function addMessageActions(grid){
 const actions=element('div','mobile-actions');grid.after(actions);actions.append(tile({text:'Hablar',emoji:'🔊'},()=>speak(message),'action')); 
 actions.append(tile({text:category==='keyboard'?'Borrar letra':'Borrar última palabra',emoji:'⌫'},()=>{message=category==='keyboard'?message.slice(0,-1):message.trimEnd().replace(/\S+\s*$/,'').trimEnd();updateMessage();pauseAfter();},'action'));
 actions.append(tile({text:'Limpiar mensaje',emoji:'✕'},()=>{message='';updateMessage();pauseAfter();},'action'));
}
function pauseAfter(){pauseUntil=Date.now()+db.settings.pause;scheduleScan();}
function basicSay(i){targets.forEach((t,j)=>t.el.classList.toggle('chosen',i===j));speak(BASIC[i].speech);}
function speechStatus(text){const el=$('speechStatus');if(el)el.textContent=text;else $('announcement').textContent=text;}
function finishSpeech(token){if(token!==speechToken)return;speaking=false;activeUtterance=null;clearTimeout(spokenTimer);highlight();scheduleScan();}
function cancelSpeech(){const engine=window.speechSynthesis;const needsCancel=speaking||engine?.speaking||engine?.pending;speechToken++;speaking=false;activeUtterance=null;clearTimeout(spokenTimer);if(needsCancel)engine?.cancel();}
function speak(text){
 // Touch gains user activation on pointerup, not pointerdown. A timed hold
 // also runs outside a gesture. Keep its one speech request for that release.
 if(!config&&mobilePress.down){pendingSpeech=text;return;}
 if(!text.trim()){speechStatus('Primero selecciona una frase o construye un mensaje.');return;}
 cancelSpeech();speechStatus('');
 if(!('speechSynthesis' in window)){notify('La voz no está disponible. El mensaje permanece visible.');return;}
 const token=++speechToken;const u=new SpeechSynthesisUtterance(text);const s=db.settings;voices=window.speechSynthesis.getVoices();const voice=voices.find(v=>v.name===s.voice)||voices.find(v=>v.localService&&v.lang.toLowerCase().startsWith('es'))||voices.find(v=>v.lang.toLowerCase().startsWith('es'));
 if(voice)u.voice=voice;u.lang=(voice?.lang||'es-ES').replace(/_/g,'-');u.rate=s.rate;u.pitch=s.pitch;u.volume=s.volume;speaking=true;stopScan();highlight();
 u.onend=()=>{if(token!==speechToken)return;if(!config&&s.stage===3&&s.clearAfter){message='';updateMessage();}speechStatus('Mensaje pronunciado.');finishSpeech(token);};
 u.onerror=e=>{if(token!==speechToken)return;speechStatus('No se pudo reproducir la voz. El mensaje permanece visible.');notify(e.error==='not-allowed'?'Chrome bloqueó la voz. Revisa que el sonido esté permitido para este sitio.':e.error==='voice-unavailable'||e.error==='language-unavailable'?'La voz elegida no está disponible. Prueba la voz predeterminada en configuración.':'No se pudo reproducir la voz ('+(e.error||'error del motor')+'). Prueba otra voz en configuración.');finishSpeech(token);};
 try{activeUtterance=u;window.speechSynthesis.speak(u);spokenTimer=setTimeout(()=>{if(token===speechToken){cancelSpeech();speechStatus('La voz no respondió. Prueba otra voz en configuración.');highlight();scheduleScan();}},Math.max(15000,text.length*400/s.rate));}catch{finishSpeech(token);notify('No se pudo iniciar la voz del dispositivo.');}
}
function shortcutLabel(){return 'Ctrl + Alt + '+db.settings.shortcut.slice(-1);}
const CONFIG_IDLE_MS=30000;
let configLastActivity=0,configWatchdog=null;
function resetConfigIdle(){if(config)configLastActivity=Date.now();}
function checkConfigIdle(){
 if(!config)return;
 const remaining=Math.max(0,CONFIG_IDLE_MS-(Date.now()-configLastActivity));
 $('configCountdown').textContent=`Regreso automático a comunicación en ${Math.ceil(remaining/1000)} s sin actividad. Usar el teclado o los controles reinicia el tiempo.`;
 if(remaining===0)toggleConfig();
}
for(const eventName of ['pointerdown','keydown','input','change','wheel']){
 document.addEventListener(eventName,e=>{if(e.isTrusted)resetConfigIdle();},{capture:true,passive:true});
}
document.addEventListener('visibilitychange',checkConfigIdle);
window.addEventListener('focus',checkConfigIdle);
function toggleConfig(){
 if(config)document.activeElement?.blur(); // Commit a pending field change before automatic return.
 cancelMobilePress();config=!config;$('mobileSettings').hidden=config;clearInterval(configWatchdog);configWatchdog=null;stopScan();cancelSpeech();lastInput=-Infinity;lastButton=-1;
 document.body.classList.toggle('communicating',!config);$('communication').hidden=config;$('settings').hidden=!config;
 if(config){$('header').hidden=false;$('modeLabel').textContent='Configuración · comunicación en pausa';syncSettings();showTab(currentTab);$('settingsTitle').focus();configLastActivity=Date.now();checkConfigIdle();configWatchdog=setInterval(checkConfigIdle,250);}
 else{document.activeElement?.blur();pauseUntil=0;window.scrollTo(0,0);renderCommunication();}
 window.dispatchEvent(new Event('ghost-mode-change'));
}
// One standard left-button press selects the currently scanned option, anywhere
// on the communication surface. Compatibility mouse/click events never select.
function isGearTouch(e){return !!e.target.closest?.('#mobileSettings')&&(e.pointerType==='touch'||e.pointerType==='pen'||e.sourceCapabilities?.firesTouchEvents||e.type==='click'&&e.detail===0);}
function beginSelection(e){
 if(config||isGearTouch(e))return;
 e.preventDefault();e.stopImmediatePropagation();
 if(e.button!==0||e.isPrimary===false||mobilePress.down)return;
 mobilePress.down=true;mobilePress.id=e.pointerId??'mouse';mobilePress.fired=false;
 stopScan();
 if(!activeWindow){activeWindow=true;highlight();}
 if(speaking||performance.now()-lastInput<db.settings.debounce)return;
 mobilePress.action=targets[index]?.action;mobilePress.view=viewRevision;
 const recognize=()=>{
  selectionTimer=null;
  if(!mobilePress.down||mobilePress.fired||config||speaking||mobilePress.view!==viewRevision||!mobilePress.action)return;
  mobilePress.fired=true;lastInput=performance.now();const action=mobilePress.action;mobilePress.action=null;action();
 };
 if(db.settings.minClick===0)recognize();else selectionTimer=setTimeout(recognize,db.settings.minClick);
}
function endSelection(e){
 if(!mobilePress.down||mobilePress.id!==(e.pointerId??'mouse'))return;
 if(!config){e.preventDefault();e.stopImmediatePropagation();}
 const text=pendingSpeech;cancelMobilePress(true);if(text!==null&&!config)speak(text);highlight();scheduleScan();
}
const pointerInput='PointerEvent' in window;
window.addEventListener(pointerInput?'pointerdown':'mousedown',beginSelection,{capture:true,passive:false});
window.addEventListener(pointerInput?'pointerup':'mouseup',endSelection,{capture:true,passive:false});
window.addEventListener('pointercancel',e=>{if(mobilePress.down&&mobilePress.id===e.pointerId){cancelMobilePress(true);scheduleScan();}},{capture:true});
for(const name of ['mousedown','mouseup','click','dblclick','auxclick','contextmenu']){
 // When Pointer Events are unavailable, the mouse down/up handlers above own
 // the gesture. Ignore their compatibility duplicates everywhere else.
 if(!pointerInput&&['mousedown','mouseup'].includes(name))continue;
 window.addEventListener(name,e=>{if(config||isGearTouch(e))return;e.preventDefault();e.stopImmediatePropagation();},{capture:true});
}
$('mobileSettings').addEventListener('click',e=>{if(!config&&isGearTouch(e))toggleConfig();});
function switchStage(stage){
 if(config)document.activeElement?.blur();
 cancelSpeech();stopScan();db.settings.stage=stage;category=null;screenPage=0;pauseUntil=0;lastInput=-Infinity;lastButton=-1;save();
 if(config)toggleConfig();else renderCommunication();
}
window.addEventListener('keydown',e=>{
 const stageMatch=/^(?:Digit|Numpad)([123])$/.exec(e.code);
 if(e.ctrlKey&&e.altKey&&!e.shiftKey&&stageMatch){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)switchStage(Number(stageMatch[1]));return;}
 if(e.ctrlKey&&e.altKey&&!e.shiftKey&&e.code===db.settings.shortcut){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)toggleConfig();return;}
 if(!config&&['Tab','Enter',' ','ContextMenu'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();}
},{capture:true});
window.addEventListener('blur',()=>{cancelMobilePress(true);activeWindow=false;stopScan();highlight();});
window.addEventListener('focus',()=>{activeWindow=true;highlight();scheduleScan();});
document.addEventListener('visibilitychange',()=>{activeWindow=!document.hidden;if(!activeWindow){cancelMobilePress(true);stopScan();}else scheduleScan();highlight();});
function populateVoices(){
 voices=window.speechSynthesis?.getVoices()||[];const sel=$('cfgVoice');sel.replaceChildren(new Option('Español · voz predeterminada',''));
 for(const v of voices)sel.add(new Option(`${v.name} (${v.lang})${v.localService?' · local':' · puede requerir internet'}`,v.name));
 if(db.settings.voice&&!voices.some(v=>v.name===db.settings.voice))sel.add(new Option(db.settings.voice+' · no disponible',db.settings.voice));
 sel.value=db.settings.voice;
}
const configFields={cfgStage:['stage',Number],cfgProfile:['profile',String],cfgSpeed:['speed',v=>Number(v)*1000],cfgPause:['pause',v=>Number(v)*1000],cfgDebounce:['debounce',Number],cfgMinClick:['minClick',Number],cfgShortcut:['shortcut',String],cfgCols:['cols',Number],cfgScale:['scale',Number],cfgVisual:['visual',String],cfgContrast:['contrast',Boolean],cfgClear:['clearAfter',Boolean],cfgVoice:['voice',String],cfgRate:['rate',Number],cfgPitch:['pitch',Number],cfgVolume:['volume',Number]};
function syncSettings(){
 for(const [id,[key]] of Object.entries(configFields)){const el=$(id);if(el.type==='checkbox')el.checked=db.settings[key];else el.value=['speed','pause'].includes(key)?db.settings[key]/1000:db.settings[key];}
 $('shortcutHelp').textContent=`Toca el engranaje para configurar. Un clic selecciona únicamente la opción resaltada. Mantener el pulsador más tiempo no cambia su acción; hay que soltarlo antes de volver a seleccionar. En frases útiles, seleccionar reproduce la voz. En la etapa 3, Hablar también se recorre por barrido. ${shortcutLabel()} alterna comunicación y configuración con un teclado. Ctrl + Alt + 1, 2 y 3 cambia de etapa. Los clics se reciben dentro de esta página; mantén GHOST abierto y activo. El cursor se oculta solo al comunicar.`;
 populateVoices();
}
for(const [id,[key,convert]] of Object.entries(configFields))$(id).addEventListener('change',e=>{
 if(!config)return;const el=e.target;if(!el.checkValidity()){el.reportValidity();syncSettings();return;}
 db.settings=sanitizeSettings({...db.settings,[key]:convert(el.type==='checkbox'?el.checked:el.value)});save();applyAppearance();syncSettings();
 if(key==='stage'){category=null;selected=null;}if(key==='profile'){selected=null;renderPhraseEditor();}
});
function showTab(name){
 currentTab=name;document.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===name;b.setAttribute('aria-selected',active);$(b.dataset.tab).hidden=!active;});
 if(name==='phrases')renderPhraseEditor();if(name==='vocabulary')renderVocabEditor();
}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
$('resume').addEventListener('click',toggleConfig);
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notify('No se pudo activar pantalla completa.');}});
$('testVoice').addEventListener('click',()=>speak('Esta es mi voz. Estoy listo para comunicarme.'));
function editorInput(value,label,onChange){const input=element('input');input.value=value;input.setAttribute('aria-label',label);input.maxLength=label.startsWith('Emoji')?20:500;input.addEventListener('change',()=>onChange(input.value));return input;}
function rowButton(label,text,fn,disabled=false){const b=element('button','',text);b.type='button';b.setAttribute('aria-label',label);b.disabled=disabled;b.addEventListener('click',fn);return b;}
function renderPhraseEditor(){
 const box=$('phraseEditor');box.replaceChildren();
 const fixed=element('p','notice','✅ Sí    ·    ❌ No — siempre disponibles');box.append(fixed);
 const list=db.phrases[db.settings.profile];list.forEach((w,i)=>{
  const row=element('div','editor-row');row.append(editorInput(w.emoji,`Emoji de frase ${i+1}`,v=>{w.emoji=v;save();}),editorInput(w.text,`Frase ${i+1}`,v=>{if(v.trim()){if(w.speech===w.text)w.speech=v.trim();w.text=v.trim();save();}else renderPhraseEditor();}),editorInput(w.speech,`Pronunciación de frase ${i+1}`,v=>{w.speech=v.trim()||w.text;save();}));
  const actions=element('div','row-actions');actions.append(rowButton('Subir frase '+(i+1),'↑',()=>{[list[i-1],list[i]]=[list[i],list[i-1]];save();renderPhraseEditor();},i===0),rowButton('Bajar frase '+(i+1),'↓',()=>{[list[i+1],list[i]]=[list[i],list[i+1]];save();renderPhraseEditor();},i===list.length-1),rowButton('Eliminar frase '+(i+1),'×',()=>{list.splice(i,1);save();renderPhraseEditor();}));row.append(actions,element('small','',`Frase ${i+1} · Texto y pronunciación`));box.append(row);
 });
}
$('addPhrase').addEventListener('submit',e=>{e.preventDefault();const form=e.target;const w=validEntry({text:form.elements.text.value,emoji:form.elements.emoji.value,category:'frases'});if(!w)return;if(['si','no'].includes(norm(w.text))){notify('Sí y No ya están siempre presentes.');return;}db.phrases[db.settings.profile].push(w);save();form.elements.text.value='';renderPhraseEditor();notify('Frase añadida.');});
$('restorePhrases').addEventListener('click',()=>{if(confirm('¿Restaurar las frases predeterminadas de este perfil? Exporta antes un respaldo para conservar las actuales.')){db.phrases[db.settings.profile]=defaultPhrases(db.settings.profile);save();renderPhraseEditor();}});
function categorySelect(selected){const sel=element('select');for(const c of CATEGORIES.filter(c=>c.id!=='favoritos'))sel.add(new Option(c.label,c.id));sel.value=selected;return sel;}
for(const id of ['vocabFilter','newWordCategory']){const sel=$(id);if(id==='vocabFilter')sel.add(new Option('Todas las categorías',''));for(const c of CATEGORIES)if(c.id!=='favoritos')sel.add(new Option(c.label,c.id));}
$('vocabFilter').addEventListener('change',renderVocabEditor);$('vocabSearch').addEventListener('input',renderVocabEditor);
function renderVocabEditor(){
 const box=$('vocabEditor');box.replaceChildren();const cat=$('vocabFilter').value,query=norm($('vocabSearch').value);
 const filtered=db.words.map((w,i)=>({w,i})).filter(({w})=>(!cat||w.category===cat)&&(!query||norm(w.text).includes(query)));
 box.append(element('p','hint',`${filtered.length} elemento${filtered.length===1?'':'s'}`));
 for(const {w,i} of filtered){
  const row=element('div','editor-row');row.append(editorInput(w.emoji,'Emoji de '+w.text,v=>{w.emoji=v;save();}),editorInput(w.text,'Texto de '+w.text,v=>{if(v.trim()){if(w.speech===w.text)w.speech=v.trim();w.text=v.trim();save();}else renderVocabEditor();}),editorInput(w.speech,'Pronunciación de '+w.text,v=>{w.speech=v.trim()||w.text;save();}));
  const actions=element('div','row-actions');actions.append(rowButton('Favorito: '+w.text,w.favorite?'★':'☆',()=>{w.favorite=!w.favorite;save();renderVocabEditor();}),rowButton('Eliminar palabra: '+w.text,'×',()=>{db.words.splice(i,1);save();renderVocabEditor();}));row.append(actions);
  const label=element('label','', 'Categoría');const sel=categorySelect(w.category);sel.setAttribute('aria-label','Categoría de '+w.text);sel.addEventListener('change',()=>{w.category=sel.value;save();});label.append(sel);row.append(label);box.append(row);
 }
}
$('addWord').addEventListener('submit',e=>{e.preventDefault();const f=e.target;const w=validEntry({text:f.elements.text.value,emoji:f.elements.emoji.value,category:f.elements.category.value,custom:true});if(!w)return;db.words.push(w);save();f.elements.text.value='';renderVocabEditor();notify('Palabra añadida.');});
function classify(text){const n=norm(text);const exact=CORE_VOCAB.find(w=>norm(w.text)===n);if(exact)return exact.category;if(text.trim().split(/\s+/).length>2)return 'frases';return 'otros';}
$('quickLoad').addEventListener('submit',e=>{
 e.preventDefault();const lines=$('loadText').value.split('\n').map(t=>t.trim()).filter(Boolean);if(!lines.length){notify('Escribe al menos una palabra o frase.');return;}
 if(lines.length>5000){notify('Carga un máximo de 5000 líneas a la vez.');return;}
 const toPhrases=$('loadTarget').value==='phrases';const dest=toPhrases?db.phrases[db.settings.profile]:db.words;let count=0;
 for(const text of lines){if(toPhrases&&['si','no'].includes(norm(text)))continue;dest.push(validEntry({text,category:toPhrases?'frases':classify(text),emoji:'💬',custom:true}));count++;}
 save();$('loadText').value='';notify(`${count} elementos cargados.`);
});
function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=element('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').addEventListener('click',()=>download(db,'ghost-mobile-respaldo.json'));$('exportWords').addEventListener('click',()=>download(db.words,'ghost-vocabulario.json'));
$('import').addEventListener('click',()=>$('file').click());
$('file').addEventListener('change',async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;
 if(file.size>5*1024*1024){notify('El archivo supera el límite de 5 MB.');return;}
 try{
  const data=JSON.parse(await file.text());
  if(Array.isArray(data)){const words=cleanList(data);if(!words.length)throw Error('No hay palabras válidas en el archivo.');db.words.push(...words);save();notify(`${words.length} elementos añadidos al vocabulario avanzado.`);}
  else{const next=parseBackup(data);if(!confirm('¿Reemplazar las listas y la configuración con este respaldo?'))return;db=next;selected=null;category=null;save();applyAppearance();syncSettings();notify('Respaldo restaurado.');}
 }catch(err){notify('No se pudo importar: '+err.message);}
});
applyAppearance();populateVoices();if(window.speechSynthesis)window.speechSynthesis.addEventListener('voiceschanged',populateVoices);renderCommunication();
if(loadNotice)notify(loadNotice);

// The monitor observes samples without owning the one-switch input model.
window.GhostMobileMonitorBridge=Object.freeze({
 available:()=>!config&&!document.hidden&&activeWindow&&!speaking,
 configuration:()=>config, adjustable:()=>config, quickAdjust:()=>false, helpOpen:()=>false,
 refresh:()=>{if(!config)renderCommunication();}
});
window.dispatchEvent(new Event('ghost-mobile-ready'));

// The worker is deliberately scoped to /mobile/: it cannot control Desktop.
let installPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installMobile').hidden=false;});
$('installMobile').addEventListener('click',async()=>{if(!installPrompt)return;await installPrompt.prompt();installPrompt=null;$('installMobile').hidden=true;});
if('serviceWorker' in navigator){
 navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(async reg=>{
  await navigator.serviceWorker.ready;
  $('offlineStatus').textContent='Archivos de GHOST Mobile disponibles sin conexión. La voz depende del motor y del paquete de español instalado en Android.';
  if(reg.waiting)notify('Hay una actualización. Se aplicará al cerrar todas las ventanas de GHOST Mobile y volver a abrir.');
  reg.addEventListener('updatefound',()=>{reg.installing?.addEventListener('statechange',()=>{if(reg.waiting&&navigator.serviceWorker.controller)notify('Actualización lista. Cierra y vuelve a abrir GHOST Mobile para aplicarla.');});});
 }).catch(()=>{$('offlineStatus').textContent='No se pudo preparar el modo sin conexión. Abre GHOST Mobile con HTTPS y vuelve a intentarlo.';});
}else $('offlineStatus').textContent='Este navegador no permite preparar el modo sin conexión.';
