const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function quantile(values,p){const s=[...values].sort((a,b)=>a-b),i=(s.length-1)*p,a=Math.floor(i);return s[a]+(s[Math.ceil(i)]-s[a])*(i-a)}
export function summarize(values){
 if(values.length<750||values.some(v=>!Number.isFinite(v)||v<0||v>4095))throw new Error('No llegaron suficientes muestras válidas. Comprueba el STM32 y repite.');
 return {median:quantile(values,.5),low:quantile(values,.02),high:quantile(values,.98),count:values.length};
}
export function validateProfile(p){
 if(!p||!['center','restLow','restHigh','left','right'].every(k=>Number.isFinite(p[k])&&p[k]>=0&&p[k]<=4095))throw new Error('Perfil de calibración inválido.');
 if(!(p.restLow<p.center&&p.center<p.restHigh))throw new Error('La franja de reposo no es válida.');
 const sign=Math.sign(p.left-p.center);
 if(!sign||Math.sign(p.right-p.center)!==-sign)throw new Error('Izquierda y derecha no se distinguen a ambos lados del reposo. Revisa sensores y repite.');
 if((p.left>p.center?p.left<=p.restHigh:p.left>=p.restLow)||(p.right>p.center?p.right<=p.restHigh:p.right>=p.restLow))throw new Error('El movimiento se confunde con el reposo. Repite las capturas o revisa el sensor.');
 return {...p};
}
export function makeProfile(captures){
 const r=captures.rest,l=captures.left,t=captures.right;
 if(!r||!l||!t)throw new Error('Primero captura reposo, izquierda y derecha.');
 const margin=Math.max(1,(r.high-r.low)*.2);
 const p=validateProfile({center:r.median,restLow:Math.max(0,r.low-margin),restHigh:Math.min(4095,r.high+margin),left:l.median,right:t.median});
 for(const side of[l,t])if(side.median>p.center?side.low<=p.restHigh+1:side.high>=p.restLow-1)throw new Error('Las muestras del movimiento se mezclan con el ruido de reposo. Mantén la posición y repite; si persiste, revisa los sensores.');
 return p;
}
export function calibratedADC(raw,profile,lower,upper){
 const sign=Math.sign(profile.left-profile.center),d=(raw-profile.center)*sign;
 const a=(profile.restLow-profile.center)*sign,b=(profile.restHigh-profile.center)*sign,lo=Math.min(a,b),hi=Math.max(a,b);
 const mid=(lower+upper)/2,innerLo=mid-(mid-lower)*.45,innerHi=mid+(upper-mid)*.45;
 let value;
 if(d>=lo&&d<=hi)value=d>=0?mid+d/hi*(innerHi-mid):mid+d/(-lo)*(mid-innerLo);
 else if(d>hi){const end=(profile.left-profile.center)*sign;value=innerHi+(d-hi)/(end-hi)*(upper+(4095-upper)*.6-innerHi)}
 else{const end=(profile.right-profile.center)*sign;value=innerLo+(d-lo)/(end-lo)*(lower*.4-innerLo)}
 return Math.round(clamp(value,0,4095));
}
export class Calibration {
 constructor(storage=globalThis.localStorage){
  this.storage=storage;this.key='ghost_calibracion_profiles_v1';this.profiles=[];this.selected=null;this.enabled=false;this.draft={};this.capture=null;this.message='Sin calibrar: se usa el ADC bruto del STM32.';
  try{const saved=JSON.parse(storage?.getItem(this.key)||'{}');this.profiles=(saved.profiles||[]).slice(0,20).map(p=>{validateProfile(p);if(typeof p.id!=='string'||typeof p.name!=='string')throw Error();return {...p,name:p.name.slice(0,80)}});this.selected=this.profiles.some(p=>p.id===saved.selected)?saved.selected:null;this.enabled=!!this.selected&&saved.enabled===true}catch{this.profiles=[]}
 }
 get profile(){return this.profiles.find(p=>p.id===this.selected)||null}
 get busy(){return !!this.capture}
 notify(){if(typeof window!=='undefined')window.dispatchEvent(new Event('ghost-calibration-change'))}
 persist(){try{this.storage?.setItem(this.key,JSON.stringify({version:1,profiles:this.profiles,selected:this.selected,enabled:this.enabled}))}catch{this.message='La calibración se aplica, pero no se pudo guardar en este navegador.'}}
 setEnabled(value){this.cancel();this.enabled=value===true&&!!this.profile;this.persist();this.notify()}
 select(id){this.cancel();this.selected=this.profiles.some(p=>p.id===id)?id:null;this.draft={};this.enabled=!!this.selected;this.persist();this.notify()}
 fresh(){this.cancel();this.selected=null;this.draft={};this.enabled=false;this.persist();this.message='Nueva persona: captura las tres posiciones y pulsa Set. Hasta entonces se usa ADC bruto.';this.notify()}
 start(side,now=performance.now()){
  if(!['rest','left','right'].includes(side))return;
  this.cancel();this.capture={side,start:now,last:now,values:[]};this.message='Capturando '+({rest:'reposo cómodo',left:'izquierda',right:'derecha'}[side])+' durante 3 segundos…';this.notify();
 }
 feed(samples,now=performance.now()){
  const c=this.capture;if(!c)return;
  if(now-c.last>350){this.cancel('Se interrumpió la señal. Repite la captura.');return}
  c.last=now;if(now-c.start>=400)c.values.push(...samples);
  if(now-c.start>=3000){
   this.capture=null;
   try{this.draft[c.side]=summarize(c.values);this.message='Captura de '+({rest:'reposo',left:'izquierda',right:'derecha'}[c.side])+' lista. Completa las tres y pulsa Set.'}catch(e){this.message=e.message}
  }
  this.notify();
 }
 tick(now=performance.now()){if(this.capture&&now-this.capture.last>350)this.cancel('Sin muestras recientes. Repite la captura.')}
 cancel(message){if(!this.capture)return;this.capture=null;if(message)this.message=message;this.notify()}
 save(name){
  if(this.busy)throw new Error('Espera a que termine la captura.');
  const data=makeProfile(this.draft),clean=String(name||'').trim().slice(0,80);if(!clean)throw new Error('Escribe el nombre de la persona.');
  const old=this.profile,id=old&&old.name===clean?old.id:'p-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  if(!this.profiles.some(p=>p.id===id)&&this.profiles.length>=20)throw new Error('Ya hay 20 perfiles. Elige uno para actualizarlo.');
  const profile={...data,id,name:clean,savedAt:new Date().toISOString()};this.profiles=this.profiles.filter(p=>p.id!==id).concat(profile);this.selected=id;this.enabled=true;
  this.message='Set guardado para '+clean+'. Calibración activa.';this.persist();this.notify();return profile;
 }
 transform(raw,lower,upper){return this.enabled&&this.profile?calibratedADC(raw,this.profile,lower,upper):raw}
}
export const calibration=new Calibration();
