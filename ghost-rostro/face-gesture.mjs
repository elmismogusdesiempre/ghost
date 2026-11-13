export const wrapAngle = degrees => ((degrees+180)%360+360)%360-180;
export function poseFromMatrix(data) {
  if(!data||data.length!==16||!Array.from(data).every(Number.isFinite))return null;
  // MediaPipe's 4x4 matrix includes translation: identify row/column packing
  // from its homogeneous row, rather than mistaking a scale or translation for yaw.
  const rowMajor=Math.abs(data[3])+Math.abs(data[7])+Math.abs(data[11])>Math.abs(data[12])+Math.abs(data[13])+Math.abs(data[14]);
  const at=(row,col)=>data[rowMajor?row*4+col:col*4+row];
  const deg=180/Math.PI;
  return {yaw:Math.atan2(at(0,2),at(2,2))*deg,pitch:Math.atan2(-at(1,2),Math.hypot(at(0,2),at(2,2)))*deg,roll:Math.atan2(at(1,0),at(1,1))*deg};
}
export const median=values=>{const v=[...values].sort((a,b)=>a-b);return v.length?v[Math.floor(v.length/2)]:null};
export function validSettings(raw={}) {
  const number=(key,fallback,min,max)=>typeof raw[key]==='number'&&Number.isFinite(raw[key])?Math.max(min,Math.min(max,raw[key])):fallback;
  const turn=number('turn',12,6,35);
  return {turn,neutral:number('neutral',4,1,Math.min(10,turn-2)),hold:number('hold',350,150,2000),rest:number('rest',400,200,2000),invert:raw.invert===true,showMonitor:raw.showMonitor!==false,showEye:raw.showEye!==false,eyeStyle:typeof raw.eyeStyle==='string'?raw.eyeStyle:'photo'};
}
export class FaceGestureGate {
  constructor(settings){this.configure(settings)}
  configure(settings){this.settings=validSettings(settings);this.reset()}
  reset(){this.ready=false;this.candidate=null;this.since=0;this.frames=0;this.last=null}
  sample(angle,time,allowed=true){
    if(!allowed||!Number.isFinite(angle)||!Number.isFinite(time)){this.reset();return null}
    if(this.last!==null&&(time<=this.last||time-this.last>500))this.reset();
    this.last=time;
    const s=this.settings;
    // Enter at the configured threshold; tolerate small tracking fluctuations
    // while confirming the same gesture. Never rearm without a centered head.
    const margin=Math.min(2,(s.turn-s.neutral)/2);
    let state=Math.abs(angle)<=s.neutral?'center':angle<=-s.turn?'left':angle>=s.turn?'right':'between';
    if(this.candidate==='left'&&angle<=-(s.turn-margin))state='left';
    else if(this.candidate==='right'&&angle>=s.turn-margin)state='right';
    else if(this.candidate==='center'&&Math.abs(angle)<=s.neutral+margin)state='center';
    if(state!==this.candidate){this.candidate=state;this.since=time;this.frames=1}else this.frames++;
    if(state==='center'&&time-this.since>=s.rest&&this.frames>=3)this.ready=true;
    if((state==='left'||state==='right')&&this.ready&&time-this.since>=s.hold&&this.frames>=3){this.ready=false;return state}
    return null;
  }
}
