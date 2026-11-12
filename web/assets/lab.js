'use strict';
(() => {
 const $=id=>document.getElementById(id),canvas=$('lab-canvas');if(!canvas)return;
 let lower=1500,upper=2500,hold=30,profile='activations',running=!window.GhostReading?.reduced(),time=0,leftCount=0,rightCount=0,ready=false,candidate=null,stable=0,fixed=false;
 const samples=new Float64Array(2500);let cursor=0,current=2048,lastFrame=0,lastDraw=0,accum=0;
 const stateLabels={left:'Clic izquierdo',right:'Clic derecho',rest:'Reposo'};
 const stateOf=v=>v<lower?'right':v>upper?'left':'rest';
 const noise=t=>{const x=Math.sin(Math.floor(t*500)*12.9898+78.233)*43758.5453;return (x-Math.floor(x))*2-1;};
 function signal(t){
  let v=2048+95*Math.sin(t*1.7)+35*Math.sin(t*11.8)+22*Math.sin(t*29.3)+24*noise(t);const p=((t%10)+10)%10;
  if(profile==='activations'){
   if(p>=1.6&&p<3.5)v=3050+130*Math.sin(t*8.3)+70*Math.sin(t*24)+40*noise(t);
   if(p>=5.2&&p<7.1)v=880+120*Math.sin(t*9.5)+70*Math.sin(t*22)+35*noise(t);
   if(p>=8.1&&p<8.118)v=3700;
  }else if(profile==='noise'){
   v=2048+390*Math.sin(t*13.3)+175*Math.sin(t*31.1)+200*noise(t);
   if(p>=2&&p<2.02||p>=5&&p<5.016)v=3700;if(p>=3.8&&p<3.818)v=600;
  }
  return Math.round(Math.max(0,Math.min(4095,v)));
 }
 function resetDetector(){ready=false;candidate=null;stable=0;}
 function process(v){const s=stateOf(v);if(candidate!==s){candidate=s;stable=0;}stable++;if(stable<Math.max(1,Math.ceil(hold/2)))return;if(s==='rest')ready=true;else if(ready){ready=false;if(s==='left')leftCount++;else rightCount++;}}
 function seed(){for(let i=0;i<samples.length;i++)samples[i]=fixed?2700:signal(time-(samples.length-1-i)/500);cursor=0;current=samples.at(-1);}
 function sync(){
  $('lab-lower').max=upper-1;$('lab-upper').min=lower+1;$('lab-lower').value=lower;$('lab-upper').value=upper;
  $('lab-lower-out').value=String(lower);$('lab-upper-out').value=String(upper);$('lab-hold-out').value=hold+' ms';
  $('lab-adc').textContent=current;$('lab-state').textContent=stateLabels[stateOf(current)];$('lab-left').textContent=leftCount;$('lab-right').textContent=rightCount;
  $('lab-pause').textContent=running?'Pausar señal':'Reanudar señal';$('lab-pause').setAttribute('aria-pressed',String(!running));
 }
 function status(text){$('lab-status').textContent=text;}
 function draw(){
  const r=canvas.getBoundingClientRect();if(r.width<30)return;const dpr=Math.min(devicePixelRatio||1,2);const w=r.width,h=r.height;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const x0=48,x1=w-12,y0=12,y1=h-34,y=v=>y1-v/4095*(y1-y0);
  for(const[a,b,color]of[[upper,4095,'#dbe7d1'],[lower,upper,'#e9eadf'],[0,lower,'#ead4c9']]){c.fillStyle=color;c.fillRect(x0,y(b),x1-x0,y(a)-y(b));}
  c.font='12px ui-monospace,monospace';c.fillStyle='#45513d';c.textAlign='right';let lastLabel=-100;
  for(const v of [4095,upper,lower,0]){const yy=y(v);c.strokeStyle='#87937f80';c.setLineDash(v===upper||v===lower?[4,4]:[]);c.beginPath();c.moveTo(x0,yy);c.lineTo(x1,yy);c.stroke();if(yy-lastLabel>13){c.fillText(v,x0-7,yy+4);lastLabel=yy;}}
  c.setLineDash([]);c.strokeStyle='#ccd3c4';for(let s=0;s<=5;s++){const xx=x0+s/5*(x1-x0);c.beginPath();c.moveTo(xx,y0);c.lineTo(xx,y1);c.stroke();c.textAlign=s===0?'left':s===5?'right':'center';c.fillText(s===5?'0 s':`${s-5} s`,xx,h-10);}
  const step=Math.max(1,Math.ceil(samples.length/(x1-x0)));c.strokeStyle='#111310';c.lineWidth=1.7;c.beginPath();
  for(let i=0;i<samples.length;i+=step){let min=4095,max=0;for(let j=i;j<Math.min(samples.length,i+step);j++){const v=samples[(cursor+j)%samples.length];min=Math.min(min,v);max=Math.max(max,v);}const xx=x0+i/(samples.length-1)*(x1-x0);if(!i)c.moveTo(xx,y(min));else c.lineTo(xx,y(min));c.lineTo(xx,y(max));}c.stroke();
 }
 for(const[id,key]of[['lab-lower','lower'],['lab-upper','upper'],['lab-hold','hold']])$(id).addEventListener('input',e=>{const n=Number(e.target.value);if(key==='lower')lower=Math.max(0,Math.min(upper-1,n));else if(key==='upper')upper=Math.min(4095,Math.max(lower+1,n));else hold=Math.max(0,Math.min(500,n));resetDetector();sync();draw();status(`Umbrales ${lower}–${upper} · estabilidad ${hold} ms. ${fixed?'ADC fijo: 2700. La clasificación cambia sin cambiar la muestra.':'Detector reiniciado: necesita reposo estable antes de otra activación.'}`);});
 $('lab-pause').addEventListener('click',()=>{running=!running;if(running)fixed=false;accum=0;lastFrame=performance.now();resetDetector();sync();status(running?'Señal simulada en marcha. No se controlan dispositivos.':'Señal pausada. Puedes seguir moviendo los umbrales.');});
 $('lab-reset').addEventListener('click',()=>{lower=1500;upper=2500;hold=30;profile='activations';$('lab-hold').value=30;$('lab-profile').value=profile;leftCount=rightCount=0;time=0;fixed=false;running=!window.GhostReading?.reduced();accum=0;lastFrame=performance.now();resetDetector();seed();sync();draw();status('Laboratorio reiniciado con umbrales 1500 y 2500. Todos los datos son simulados.');});
 $('lab-freeze').addEventListener('click',()=>{running=false;fixed=true;current=2700;samples.fill(2700);cursor=0;resetDetector();sync();draw();status('ADC fijo en 2700. Mueve el umbral superior por encima de 2700 para que sea reposo, o por debajo para que sea izquierdo.');});
 $('lab-profile').addEventListener('change',e=>{profile=e.target.value;fixed=false;time=0;leftCount=rightCount=0;accum=0;resetDetector();seed();sync();draw();status('Perfil de señal cambiado. Contadores reiniciados; no hay entrada USB.');});
 window.addEventListener('ghost:motion',e=>{if(e.detail.reduced){running=false;resetDetector();sync();status('Movimiento reducido: la onda está pausada. Puedes reanudarla explícitamente.');}});
 document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();accum=0;resetDetector();});
 function frame(now){let delta=lastFrame?now-lastFrame:0;lastFrame=now;if(delta>250)delta=0;if(running&&!document.hidden){accum+=delta;while(accum>=2){accum-=2;time+=.002;current=signal(time);samples[cursor]=current;cursor=(cursor+1)%samples.length;process(current);}}if(now-lastDraw>33){lastDraw=now;sync();draw();}requestAnimationFrame(frame);}
 seed();sync();draw();if(!running)status('Movimiento reducido: señal simulada en pausa. Puedes ajustar los umbrales o reanudarla.');requestAnimationFrame(frame);
})();
