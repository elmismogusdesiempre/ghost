import {claimPort,releasePort,watchPorts} from './serial-ports.mjs';
export const servoCommands = Object.freeze({left:'L',rest:'C',right:'R'});
export function servoCommandFor(state,mirror=false){
  if(!Object.hasOwn(servoCommands,state))return null;
  if(mirror&&state==='left')return 'R';
  if(mirror&&state==='right')return 'L';
  return servoCommands[state];
}
function limit(promise, milliseconds, message) {
  let timer;
  return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),milliseconds)})]).finally(()=>clearTimeout(timer));
}
/** Independent, optional output. Accepts monitor states, never ADC or thresholds. */
export class ServoLink {
  constructor({serial,onChange=()=>{},bootMs=2000,writeMs=1500,mirror=false}={}) {
    this.serial=serial;this.onChange=onChange;this.bootMs=bootMs;this.writeMs=writeMs;
    this.mirror=mirror===true;this.state=null;this.mappingRevision=0;
    this.phase='disconnected';this.message='Servo desconectado';this.current=null;this.source='Sin datos';
    this.lastSent=null;this.connection=null;this.requestPending=false;this.generation=0;
    watchPorts(serial);
    serial?.addEventListener('disconnect',event=>{
      const c=this.connection;
      if(c&&(event.port===c.port||event.target===c.port))void this.fail(c,'Arduino desconectado. GHOST y el STM32 continúan funcionando.');
    });
  }
  get busy(){return this.requestPending||!['disconnected','error'].includes(this.phase)}
  notify(){try{this.onChange(this)}catch{/* UI failures must not propagate into acquisition. */}}
  setMirror(value) {
    const mirror=value===true;
    if(mirror===this.mirror)return;
    this.mirror=mirror;this.mappingRevision++;
    // In-flight output finishes; discard unsent commands from the old orientation.
    if(this.connection?.pending)this.connection.lastQueued=null;
    this.observe(this.state,this.source);this.notify();
  }
  observe(state,source='STM32') {
    this.state=Object.hasOwn(servoCommands,state)?state:null;
    const command=servoCommandFor(this.state,this.mirror);
    const changed=command!==this.current||source!==this.source;
    this.current=command;this.source=source;
    if(this.phase==='connected'&&command)this.enqueue(command);
    if(changed)this.notify();
  }
  async connect() {
    if(this.busy)return;
    if(!this.serial?.requestPort){this.phase='error';this.message='Web Serial requiere Chrome/Edge de escritorio y HTTPS.';this.notify();return}
    const generation=++this.generation;this.requestPending=true;this.phase='choosing';this.message='Selecciona el puerto del Arduino UNO, distinto del STM32.';this.notify();
    let c=null;
    try {
      const port=await this.serial.requestPort();
      if(generation!==this.generation)return;
      if(!claimPort(port,'servo'))throw new Error('Ese puerto ya está abierto o reservado. Selecciona el Arduino, no el STM32.');
      c={port,writer:null,tail:Promise.resolve(),pending:0,closing:false,lastQueued:null};this.connection=c;
      this.phase='opening';this.message='Abriendo Arduino a 115200 baudios…';this.notify();
      c.opening=port.open({baudRate:115200,dataBits:8,stopBits:1,parity:'none',flowControl:'none'});
      try{await c.opening}finally{c.opening=null}
      if(generation!==this.generation||c.closing){await this.cleanup(c);return}
      if(!port.writable)throw new Error('El puerto del Arduino no permite escritura.');
      c.writer=port.writable.getWriter();this.phase='booting';this.message='Esperando 2 s al reinicio del Arduino…';this.notify();
      await new Promise(resolve=>{c.wake=resolve;c.bootTimer=setTimeout(resolve,this.bootMs)});c.wake=null;
      if(generation!==this.generation||c.closing)return;
      this.phase='connected';this.message='Servo conectado · siguiendo los estados del monitor';
      if(this.current)this.enqueue(this.current); // Use the latest state after UNO's reset, not a stale snapshot.
      this.notify();
    }catch(error){
      if(generation!==this.generation){if(c)await this.cleanup(c);return}
      if(c)await this.fail(c,'No se pudo conectar el servo: '+error.message);
      else{this.phase=error.name==='NotFoundError'?'disconnected':'error';this.message=error.name==='NotFoundError'?'Selección cancelada. No se conectó el servo.':error.message;this.notify()}
    }finally{this.requestPending=false;this.notify()}
  }
  enqueue(command) {
    const c=this.connection;
    if(!c||c.closing||command===c.lastQueued)return;
    if(c.pending>=32){void this.fail(c,'La salida del servo no responde. Se detuvo únicamente la conexión del Arduino.');return}
    c.lastQueued=command;c.pending++;const revision=this.mappingRevision;
    c.tail=c.tail.then(async()=>{
      if(c.closing||this.connection!==c||revision!==this.mappingRevision)return;
      await limit(c.writer.write(new Uint8Array([command.charCodeAt(0)])),this.writeMs,'Tiempo de escritura agotado');
      this.lastSent=command;this.notify();
    }).catch(error=>{if(!c.closing)void this.fail(c,'Error serial del servo: '+error.message+'. GHOST continúa funcionando.');}).finally(()=>{c.pending--});
  }
  async cleanup(c) {
    clearTimeout(c.bootTimer);c.wake?.();c.wake=null;
    if(c.writer){
      try{await limit(c.writer.abort(),500,'Escritura ocupada')}catch{}
      try{c.writer.releaseLock()}catch{}
    }
    let closed=false;
    try{await limit(c.port.close(),1000,'El puerto no terminó de cerrar');closed=true}catch{
      // A rejected open or physically removed port may already be closed.
      closed=!c.opening&&!c.port.readable&&!c.port.writable;
    }
    if(closed)releasePort(c.port,'servo');
    return closed;
  }
  async fail(c,message) {
    if(c.closing||this.connection!==c)return;
    c.closing=true;++this.generation;this.phase='closing';this.message=message;this.notify();
    const closed=await this.cleanup(c);
    if(this.connection===c)this.connection=null;
    this.phase='error';this.message=message+(closed?'':' El puerto sigue ocupado: desconecta el cable del Arduino antes de reintentar.');this.notify();
  }
  async disconnect() {
    const c=this.connection;
    if(!c||c.closing)return;
    c.closing=true;++this.generation;this.phase='closing';this.message='Centrando y desconectando servo…';this.notify();
    clearTimeout(c.bootTimer);c.wake?.();c.wake=null;
    let centered=false;
    try{
      // Finish only the in-flight write; queued stale transitions are discarded.
      await limit(c.tail,this.writeMs+100,'Salida ocupada');
      if(c.writer){await limit(c.writer.write(new Uint8Array([67])),this.writeMs,'No se pudo enviar C');this.lastSent='C';centered=true}
    }catch{/* Centering is best effort; still close the servo without affecting STM32. */}
    const closed=await this.cleanup(c);if(this.connection===c)this.connection=null;
    this.phase=closed?'disconnected':'error';
    this.message=closed?(centered?'Servo desconectado · C enviada (90°)':'Servo desconectado · no fue posible enviar C'):'No se pudo cerrar el puerto. Desconecta el cable del Arduino antes de reintentar.';this.notify();
  }
}
