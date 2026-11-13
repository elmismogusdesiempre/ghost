import {FaceGestureGate,validSettings,median,wrapAngle,lateralTilt} from './face-gesture.mjs';
import {SignalEye} from './signal-eye.mjs';
import {eyeModels,eyeModelNames,validEyeModel} from './eye-models.mjs';
const $=id=>document.getElementById(id),bridge=window.GhostFaceBridge,KEY='ghost_face_tilt_tracking_v1';
let settings=validSettings();try{settings=validSettings(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{}
settings.eyeStyle=validEyeModel(settings.eyeStyle);
const gate=new FaceGestureGate(settings);
let workerTimer=null;
let stream=null,worker=null,source=null,epoch=0,active=false,starting=false,ready=false,busy=false;
let center=null,calibration=null,calibrationTimer=null,latest=null,filtered=null,lastPoseTime=null,lastResult=0,lastCapture=0,lastUI=0,lastVideoTime=-1;
let faceCount=0,status='Cámara apagada',problem='',direction='Sin rostro',leftCount=0,rightCount=0,frames=0,lastAction='',lastActionAt=0;
const ring=[];const reduced=matchMedia('(prefers-reduced-motion: reduce)');
$('monitor').innerHTML=`<div class="panel"><div class="monitor-head"><div><p class="eyebrow">GHOST · Versión facial independiente</p><h2>Control con el rostro</h2></div><span class="monitor-pill" id="faceCameraStatus" role="status">Cámara apagada</span></div>
<p class="hint">Inclina la cabeza acercando la oreja al hombro izquierdo para seleccionar y al hombro derecho para hablar. Mantén la cara hacia la pantalla. Vuelve a la franja central entre acciones. El video se procesa en este navegador; no se graba ni se sube.</p>
<div class="buttons"><button id="startCamera" class="primary">Activar cámara</button><button id="stopCamera" disabled>Detener cámara</button><button id="calibrateFace" disabled>Calibrar centro</button><button id="startFaceCommunication" class="primary" disabled>Iniciar comunicación →</button></div>
<p id="faceProblem" role="alert"></p><p id="faceCalibration" class="notice">Activa la cámara. Después, mira al centro en una posición cómoda y pulsa Calibrar centro. Mantente quieto unos 1,5 segundos.</p>
<div class="fields"><label class="check"><input id="showFaceMonitor" type="checkbox">Mostrar monitor y video</label><label class="check"><input id="showFaceEye" type="checkbox">Mostrar ojo de la señal</label><label>Modelo del ojo<select id="faceEyeStyle">${eyeModelNames.map(key=>`<option value="${key}">${eyeModels[key].label}</option>`).join('')}</select></label></div>
<p class="hint">Al ocultar el monitor, la cámara y la detección continúan mientras esta página esté visible y activa. Para apagar ambas, usa Detener cámara. Las pestañas en segundo plano o la pantalla bloqueada pueden ser suspendidas por el navegador.</p>
<div class="face-observation"><div class="face-full-visuals"><div class="face-video-box"><canvas id="faceVideoFull" role="img" aria-label="Video en directo de la webcam, en espejo"></canvas><span>Imagen en espejo</span></div><div class="monitor-chart"><canvas id="faceChartFull" role="img" aria-label="Inclinación lateral de la cabeza en grados, con franja central de reposo"></canvas></div><div id="faceEyeFull" hidden></div></div><div class="monitor-stats"><div class="monitor-stat"><small>Inclinación lateral</small><strong id="faceAngleFull">—</strong></div><div class="monitor-stat"><small>Estado</small><strong id="faceDirectionFull">Sin rostro</strong></div><div class="monitor-stat"><small>Selecciones</small><strong id="faceLeftFull">0</strong></div><div class="monitor-stat"><small>Hablar</small><strong id="faceRightFull">0</strong></div></div></div></div>
<div class="panel"><h2>Sensibilidad y estabilidad</h2><div class="fields">
<label>Inclinación para activar (grados)<input id="faceTurn" type="number" min="6" max="35" step="1"></label>
<label>Franja central de reposo (± grados)<input id="faceNeutral" type="number" min="1" max="10" step="1"></label>
<label>Duración de la inclinación (ms)<input id="faceHold" type="number" min="150" max="2000" step="50"></label>
<label>Tiempo al centro para rearmar (ms)<input id="faceRest" type="number" min="200" max="2000" step="50"></label>
<label class="check"><input id="faceInvert" type="checkbox">Invertir sentidos si el indicador izquierda/derecha aparece al revés</label></div>
<p class="notice">Antes de comunicar, comprueba los sentidos desde Settings, donde las inclinaciones no ejecutan acciones. La detección requiere un solo rostro, cámara estable y buena luz. Perder el rostro, girarlo o inclinarlo demasiado o dejar de recibir fotogramas pausa las acciones; se exige volver al centro.</p><p class="hint">La franja central incluye todos los ángulos entre −<span id="faceNeutralMin"></span>° y +<span id="faceNeutralMax"></span>°. Dentro de ella no hay acciones; mantente allí para preparar la siguiente inclinación.</p><p id="faceGateStatus" class="hint"></p></div>`;
$('monitorDock').innerHTML=`<div class="dock-summary"><span class="monitor-pill" id="faceDockStatus">Cámara apagada</span><strong class="dock-value" id="faceAngleDock">—</strong><span id="faceDirectionDock">Sin rostro</span><small id="faceCountsDock">Selecciones 0 · Hablar 0</small><small id="faceReadyDock">Calibra desde Settings</small></div><div class="face-video-box"><canvas id="faceVideoDock" role="img" aria-label="Video en directo de la webcam, en espejo"></canvas></div><div class="monitor-chart"><canvas id="faceChartDock" role="img" aria-label="Inclinación lateral y franja de reposo"></canvas></div><div class="dock-side"><div id="faceEyeDock" hidden></div><div class="dock-controls"><label>Inclinación ≥ <output id="faceTurnOut"></output>°<input id="faceTurnRange" type="range" min="6" max="35" step="1" aria-label="Inclinación mínima para una acción"></label><label>Duración <output id="faceHoldOut"></output> ms<input id="faceHoldRange" type="range" min="150" max="2000" step="50" aria-label="Duración mínima del giro"></label><label class="face-center-slider">Franja central ±<output id="faceNeutralOut"></output>°<input id="faceNeutralRange" type="range" min="1" max="10" step="1" aria-label="Semiancho en grados de la franja central de reposo"></label><p class="hint">Ctrl + Alt + M: configurar cámara</p></div></div>`;
source=document.createElement('video');source.id='faceCameraSource';source.className='face-camera-source';source.muted=true;source.autoplay=true;source.playsInline=true;source.setAttribute('aria-hidden','true');source.tabIndex=-1;document.body.append(source);
const liveStatus=document.createElement('div');liveStatus.id='faceControlStatus';liveStatus.setAttribute('role','status');liveStatus.setAttribute('aria-live','polite');$('communication').before(liveStatus);
const eyes=[new SignalEye($('faceEyeFull'),'face-full'),new SignalEye($('faceEyeDock'),'face-dock')];
function text(id,value){if($(id).textContent!==value)$(id).textContent=value}
function save(){try{localStorage.setItem(KEY,JSON.stringify(settings))}catch{problem='No se pudo guardar la configuración en este navegador.'}}
function sync(){
 $('showFaceMonitor').checked=settings.showMonitor;$('showFaceEye').checked=settings.showEye;$('faceEyeStyle').value=settings.eyeStyle;
 for(const[id,key]of[['faceTurn','turn'],['faceNeutral','neutral'],['faceHold','hold'],['faceRest','rest'],['faceTurnRange','turn'],['faceHoldRange','hold'],['faceNeutralRange','neutral']])$(id).value=settings[key];
 $('faceNeutral').max=$('faceNeutralRange').max=Math.min(10,settings.turn-2);for(const id of ['faceNeutralOut','faceNeutralMin','faceNeutralMax'])text(id,String(settings.neutral));$('faceInvert').checked=settings.invert;text('faceTurnOut',String(settings.turn));text('faceHoldOut',String(settings.hold));
 const was=$('monitorDock').hidden;$('monitorDock').hidden=!settings.showMonitor;document.body.classList.toggle('monitor-visible',settings.showMonitor);
 document.querySelector('.face-observation').hidden=!settings.showMonitor;
 for(const eye of eyes){eye.setStyle(settings.eyeStyle);eye.setVisible(settings.showMonitor&&settings.showEye)}
 if(was!==!settings.showMonitor)bridge.refresh();
 updateUI();
}
function configure(key,value){settings=validSettings({...settings,[key]:value});settings.eyeStyle=validEyeModel(settings.eyeStyle);if(['turn','neutral','hold','rest','invert'].includes(key)){gate.configure(settings);filtered=null;lastPoseTime=null}save();sync()}
for(const[id,key]of[['faceTurn','turn'],['faceNeutral','neutral'],['faceHold','hold'],['faceRest','rest'],['faceTurnRange','turn'],['faceHoldRange','hold'],['faceNeutralRange','neutral']])$(id).addEventListener(id.endsWith('Range')?'input':'change',e=>{if(!bridge.adjustable())return;if(!e.target.checkValidity()){e.target.reportValidity();sync();return}configure(key,Number(e.target.value))});
for(const[id,key]of[['showFaceMonitor','showMonitor'],['showFaceEye','showEye'],['faceInvert','invert']])$(id).addEventListener('change',e=>configure(key,e.target.checked));
$('faceEyeStyle').addEventListener('change',e=>configure('eyeStyle',e.target.value));
function updateUI(){
 text('faceCameraStatus',status);text('faceDockStatus',status);text('faceProblem',problem);
 $('startCamera').disabled=active||starting;$('stopCamera').disabled=!active&&!starting;
 $('startFaceCommunication').disabled=!center||!latest||!!calibration;
 $('calibrateFace').disabled=!ready||!latest||!!calibration||performance.now()-lastResult>600;
 const angle=filtered===null?'—':filtered.toFixed(1)+'°';for(const id of ['faceAngleFull','faceAngleDock'])text(id,angle);
 for(const id of ['faceDirectionFull','faceDirectionDock'])text(id,direction);
 text('faceLeftFull',String(leftCount));text('faceRightFull',String(rightCount));text('faceCountsDock',`Selecciones ${leftCount} · Hablar ${rightCount}`);
 const mode=bridge.mode();
 const progress=(duration)=>Math.min(100,Math.round((performance.now()-gate.since)/duration*100));
 let hint=!active?'Activa la cámara en configuración (Ctrl + Alt + M)':!ready?'Cargando detector…':calibration?'Mantente quieto: calibrando…':!center?'Calibra el centro en configuración':!latest?'Centra un solo rostro':mode==='settings'?'Prueba de dirección · pulsa Iniciar comunicación para seleccionar y hablar':mode==='adjustment'||mode==='help'?'Acciones pausadas · cierra el ajuste o la ayuda':mode==='speaking'?'Hablando…':mode==='unfocused'?'Activa esta ventana para comunicar':gate.ready?(gate.candidate==='left'||gate.candidate==='right'?`Mantén la inclinación · ${progress(settings.hold)}%`:'Listo · inclina a izquierda para seleccionar / derecha para hablar'):gate.candidate==='center'?`Mantente en la franja central · ${progress(settings.rest)}%`:'Vuelve a la franja central para habilitar la siguiente acción';
 if(lastAction&&performance.now()-lastActionAt<2200&&mode==='communication')hint=lastAction+' · '+hint;
 liveStatus.textContent===hint||(liveStatus.textContent=hint);liveStatus.hidden=mode==='settings';
 text('faceReadyDock',hint);text('faceGateStatus',hint);
 for(const id of ['faceTurnRange','faceHoldRange','faceNeutralRange'])$(id).disabled=!bridge.adjustable();
}
function clearPreview(){for(const id of ['faceVideoFull','faceVideoDock']){const c=$(id);c.getContext('2d')?.clearRect(0,0,c.width,c.height)}}
function stopCamera(message='Cámara apagada'){
 clearTimeout(workerTimer);epoch++;starting=false;active=false;ready=false;busy=false;worker?.terminate();worker=null;
 stream?.getTracks().forEach(t=>t.stop());stream=null;source.pause();source.srcObject=null;center=null;latest=null;filtered=null;lastPoseTime=null;lastResult=0;lastVideoTime=-1;calibration=null;clearTimeout(calibrationTimer);gate.reset();bridge.setTracking(false,false);status=message;direction='Sin rostro';clearPreview();text('faceCalibration','Activa la cámara y calibra el centro para comenzar.');updateUI();
}
function fail(message){problem=message;stopCamera('Detección detenida')}
async function startCamera(){
 if(starting||active)return;
 if(!isSecureContext||!navigator.mediaDevices?.getUserMedia){problem='La webcam requiere HTTPS o localhost y un navegador compatible.';updateUI();return}
 const session=++epoch;starting=true;problem='';status='Solicitando permiso de cámara…';updateUI();
 try{
  // Never request audio, never reconnect automatically, never record the stream.
  const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:20,max:30}}});
  if(session!==epoch){media.getTracks().forEach(t=>t.stop());return}
  stream=media;source.srcObject=media;await source.play();if(session!==epoch)return;
  active=true;starting=false;status='Cargando detector local…';bridge.setTracking(true,false);
  for(const track of media.getVideoTracks())track.addEventListener('ended',()=>{if(session===epoch)fail('La cámara se desconectó. Vuelve a activarla.')},{once:true});
  worker=new Worker(new URL('./face-worker.mjs',import.meta.url),{type:'module'});
  worker.onerror=()=>{if(session===epoch)fail('No se pudo iniciar el detector local. Usa Chrome/Edge actualizado y recarga la página.')};
  worker.onmessage=({data})=>{
   if(session!==epoch)return;
   if(data.type==='ready'){clearTimeout(workerTimer);ready=true;status='Cámara activa · calibra el centro';updateUI()}
   else if(data.type==='error')fail('Error del detector: '+data.message);
   else if(data.type==='pose'){busy=false;consumePose(data)}
  };
  workerTimer=setTimeout(()=>{if(session===epoch&&!ready)fail('El detector tardó demasiado en cargar. Revisa la conexión y vuelve a activar la cámara.')},60000);
  worker.postMessage({type:'init'});updateUI();
 }catch(error){if(session!==epoch)return;problem=error.name==='NotAllowedError'?'Permiso de cámara denegado. Permite la cámara para este sitio y vuelve a intentarlo.':error.name==='NotFoundError'?'No se encontró una webcam conectada.':error.name==='NotReadableError'?'La cámara está ocupada o no se puede abrir. Cierra otras apps que la usen.':'No se pudo activar la cámara: '+error.message;stopCamera()}
}
function beginCalibration(){
 if(!ready||!latest||performance.now()-lastResult>600)return;
 gate.reset();center=null;filtered=null;bridge.setTracking(true,false);calibration={samples:[],start:performance.now()};problem='';
 text('faceCalibration','Mira al centro y mantente quieto en una posición cómoda durante unos 1,5 segundos.');
 clearTimeout(calibrationTimer);calibrationTimer=setTimeout(()=>{if(calibration){calibration=null;problem='No se pudo calibrar un rostro estable. Comprueba luz, distancia y vuelve a calibrar.';updateUI()}},8000);updateUI();
}
function consumePose(data){
 const now=performance.now();lastResult=now;frames++;faceCount=data.faces;
 const p=data.pose,b=p?.box;
 const valid=data.faces===1&&p&&Object.values({yaw:p.yaw,pitch:p.pitch,roll:p.roll}).every(Number.isFinite)&&b&&b.w>=0.12&&b.h>=0.12&&b.w*b.h>=0.02&&b.w*b.h<0.85&&b.x+b.w/2>0.08&&b.x+b.w/2<0.92&&now-data.time<600;
 latest=valid?p:null;
 if(!valid){direction=data.faces>1?'Más de un rostro':data.faces===0?'Sin rostro':'Acerca y centra el rostro';status='Cámara activa · '+direction.toLowerCase();gate.reset();filtered=null;bridge.setTracking(true,false);if(calibration)calibration.samples=[];updateUI();return}
 if(calibration){
  const list=calibration.samples;list.push({yaw:p.yaw,pitch:p.pitch,roll:p.roll,time:now});while(list.length&&now-list[0].time>1800)list.shift();
  if(list.length>=12&&now-list[0].time>=1400){
   const reference=list[0];const spreads=['yaw','pitch','roll'].map(k=>{const v=list.map(q=>wrapAngle(q[k]-reference[k]));return Math.max(...v)-Math.min(...v)});
   if(spreads.every(v=>v<=6)){
    center={};for(const k of ['yaw','pitch','roll'])center[k]=wrapAngle(reference[k]+median(list.map(q=>wrapAngle(q[k]-reference[k]))));
    calibration=null;clearTimeout(calibrationTimer);filtered=null;lastPoseTime=null;gate.reset();text('faceCalibration','Centro calibrado para esta sesión. Prueba la inclinación hacia cada hombro desde configuración; invierte los sentidos si el indicador aparece al revés.');
   }
  }
 }
 const tilt=lateralTilt(p,center,settings.invert);
 const quality=!!center&&Math.abs(tilt)<=45&&Math.abs(wrapAngle(p.pitch-center.pitch))<=25&&Math.abs(wrapAngle(p.yaw-center.yaw))<=35;
 if(!quality){gate.reset();filtered=null;bridge.setTracking(true,false);direction=center?'Mantén la altura y centra el rostro':'Calibra el centro';status='Cámara activa · '+direction.toLowerCase();updateUI();return}
 const dt=lastPoseTime===null?100:now-lastPoseTime;filtered=filtered===null||dt>500?tilt:filtered+(tilt-filtered)*(1-Math.exp(-dt/100));lastPoseTime=now;
 direction=Math.abs(filtered)<=settings.neutral?'Centro':filtered<=-settings.turn?'Izquierda':filtered>=settings.turn?'Derecha':'En transición';status='Cámara activa · rostro detectado';
 bridge.setTracking(true,!document.hidden);const gesture=gate.sample(filtered,now,bridge.available());
 ring.push(filtered);if(ring.length>150)ring.shift();
 if(gesture&&bridge.activate(gesture==='left'?0:2,'face')){if(gesture==='left')leftCount++;else rightCount++;lastAction=gesture==='left'?'Selección recibida':'Orden de hablar recibida';lastActionAt=now}
 updateUI();
}
$('startFaceCommunication').addEventListener('click',()=>{gate.reset();bridge.startCommunication();updateUI()});
$('startCamera').addEventListener('click',startCamera);$('stopCamera').addEventListener('click',()=>stopCamera());$('calibrateFace').addEventListener('click',beginCalibration);
window.addEventListener('ghost-mode-change',()=>{gate.reset();sync()});
window.addEventListener('blur',()=>gate.reset());document.addEventListener('visibilitychange',()=>{gate.reset();if(document.hidden)bridge.setTracking(active,false)});
window.addEventListener('pagehide',()=>stopCamera());
function videoPreview(canvas){
 if(!active||source.readyState<2)return;
 const r=canvas.getBoundingClientRect();if(r.width<10||r.height<10)return;
 const ratio=Math.min(devicePixelRatio||1,2),w=Math.round(r.width*ratio),h=Math.round(r.height*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
 const ctx=canvas.getContext('2d');ctx.setTransform(-1,0,0,1,w,0);ctx.drawImage(source,0,0,w,h);ctx.setTransform(1,0,0,1,0,0);
}
function draw(canvas){
 const r=canvas.getBoundingClientRect();if(r.width<30||r.height<30)return;const dpr=Math.min(devicePixelRatio||1,2),w=r.width,h=r.height;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
 const left=32,right=w-8,top=9,bottom=h-20,y=n=>top+(45-n)/90*(bottom-top);
 // Distinct action zones, transition zones, and a true ±neutral rest BAND.
 c.fillStyle='#f4f3ee';c.fillRect(left,top,right-left,bottom-top);
 c.fillStyle='#f0d9d1';c.fillRect(left,top,right-left,y(settings.turn)-top);
 c.fillStyle='#d7e8df';c.fillRect(left,y(-settings.turn),right-left,bottom-y(-settings.turn));
 c.fillStyle='#b8cec1';c.fillRect(left,y(settings.neutral),right-left,y(-settings.neutral)-y(settings.neutral));
 c.font='9px system-ui';c.textAlign='right';
 for(const v of[45,settings.turn,-settings.turn,-45]){c.fillStyle='#5b706a';c.fillText(String(v)+'°',left-3,y(v)+3);c.strokeStyle='#7f958a70';c.setLineDash([4,4]);c.beginPath();c.moveTo(left,y(v));c.lineTo(right,y(v));c.stroke()}
 c.setLineDash([]);for(const v of[settings.neutral,-settings.neutral]){c.strokeStyle='#174f47';c.lineWidth=1;c.beginPath();c.moveTo(left,y(v));c.lineTo(right,y(v));c.stroke()}
 c.fillStyle='#233c39';c.textAlign='left';c.font='bold 9px system-ui';c.fillText('CENTRO ±'+settings.neutral+'°',left+5,y(0)+3);
 c.font='9px system-ui';c.fillText('Derecha · hablar',left+5,top+12);c.fillText('Izquierda · seleccionar',left+5,bottom-4);
 c.strokeStyle='#174f47';c.lineWidth=1.5;c.beginPath();ring.forEach((v,i)=>{const x=right-(ring.length-1-i)/149*(right-left);i?c.lineTo(x,y(v)):c.moveTo(x,y(v))});c.stroke();
}
async function frame(now){
 if(active&&ready&&!busy&&!document.hidden&&source.readyState>=2&&now-lastCapture>=83&&source.currentTime!==lastVideoTime){
  busy=true;lastCapture=now;lastVideoTime=source.currentTime;const session=epoch;
  try{const bitmap=await createImageBitmap(source,{resizeWidth:512,resizeHeight:Math.max(1,Math.round(512*source.videoHeight/source.videoWidth)),resizeQuality:'low'});if(session!==epoch){bitmap.close()}else worker.postMessage({type:'frame',bitmap,time:performance.now()},[bitmap])}catch(error){if(session===epoch)fail('No se pudo procesar el video: '+error.message)}
 }
 if(active&&ready&&lastResult&&now-lastResult>1000){gate.reset();bridge.setTracking(true,false);latest=null;filtered=null;direction='Sin fotogramas recientes';status='Detección en pausa'}
 if(now-lastUI>=100){lastUI=now;updateUI();if(settings.showMonitor){videoPreview($('faceVideoFull'));videoPreview($('faceVideoDock'));draw($('faceChartFull'));draw($('faceChartDock'))}}
 if(settings.showMonitor){const adc=filtered===null?null:Math.max(0,Math.min(4095,2047.5+filtered/35*2047.5));for(const eye of eyes)eye.render(adc,{fresh:filtered!==null&&now-lastResult<600,demo:false,now,reducedMotion:reduced.matches})}
 requestAnimationFrame(frame);
}
sync();requestAnimationFrame(frame);
