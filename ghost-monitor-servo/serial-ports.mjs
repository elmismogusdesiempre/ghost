// Ownership is local to this page. Never close a port owned by the other device.
const owners = new Map();
export function claimPort(port, owner) {
  if (owners.has(port) || port.readable || port.writable) return false;
  owners.set(port, owner); return true;
}
export function releasePort(port, owner) {
  if (owners.get(port) === owner) owners.delete(port);
}

const watched = new WeakSet();
export function watchPorts(serial) {
  if(!serial||watched.has(serial))return;
  watched.add(serial);
  serial.addEventListener('disconnect',event=>{
    for(const port of owners.keys())if(event.port===port||event.target===port)owners.delete(port);
  });
}
