import test from 'node:test';
import assert from 'node:assert/strict';
import { PacketDecoder, GestureDetector, stateOf, validateSettings } from '../protocol.mjs';
const settings={lower:1500,upper:2500,hold:30};
const encode=values=>Uint8Array.from(values.flatMap(v=>[Math.floor(v/100),v%100]));
test('reconstruct all ADC values with base 100, not 16-bit binary',()=>{
 const dec=new PacketDecoder(),out=[];const values=Array.from({length:4100},(_,i)=>i%4096);
 dec.push(encode(values),p=>out.push(...p),()=>assert.fail('invalid packet'));
 assert.deepEqual(out,values);assert.equal(dec.packets,164);assert.equal(dec.used,0);
});
test('arbitrary fragmentation, odd chunks, and concatenated 50-byte packets',()=>{
 const values=Array.from({length:75},(_,i)=>i*53),bytes=encode(values);const d=new PacketDecoder(),out=[];
 let offset=0;for(const size of [1,3,17,2,50,7,1,69]){d.push(bytes.slice(offset,offset+size),p=>out.push(...p),()=>assert.fail());offset+=size;}
 assert.deepEqual(out,values);assert.equal(d.used,0);assert.equal(d.bytes,150);
});
test('partial packets wait and invalid packets never deliver partial samples',()=>{
 const d=new PacketDecoder();let valid=0,invalid=0;const bytes=encode(Array(25).fill(2000));
 d.push(bytes.slice(0,49),()=>valid++,()=>invalid++);assert.equal(valid,0);
 d.push(bytes.slice(49),()=>valid++,()=>invalid++);assert.equal(valid,1);
 bytes[48]=41;bytes[49]=0;d.push(bytes,()=>valid++,()=>invalid++);assert.equal(invalid,1);assert.equal(valid,1);
 bytes[48]=40;bytes[49]=96;d.push(bytes,()=>valid++,()=>invalid++);assert.equal(invalid,2);
 d.reset();assert.equal(d.bytes,0);assert.equal(d.used,0);
});
test('inclusive rest boundaries and validation',()=>{
 assert.equal(stateOf(1499,1500,2500),'right');assert.equal(stateOf(1500,1500,2500),'rest');assert.equal(stateOf(2500,1500,2500),'rest');assert.equal(stateOf(2501,1500,2500),'left');
 for(const s of [{...settings,lower:2500},{...settings,upper:4096},{...settings,lower:-1},{...settings,hold:NaN},{...settings,lower:1500.2}])assert.throws(()=>validateSettings(s));
});
test('stable rest arms one activation, held states do not repeat, crossing without rest does not click',()=>{
 const d=new GestureDetector(settings);const sample=(adc,n)=>Array.from({length:n},()=>d.sample(adc)).filter(Boolean);
 assert.deepEqual(sample(3000,100),[]);assert.deepEqual(sample(2000,14),[]);assert.equal(d.ready,false);sample(2000,1);assert.equal(d.ready,true);
 assert.deepEqual(sample(3000,14),[]);assert.deepEqual(sample(3000,200),['left']);assert.deepEqual(sample(1000,200),[]);
 sample(2000,15);assert.deepEqual(sample(1000,15),['right']);assert.deepEqual(sample(1000,200),[]);
 d.reset();assert.deepEqual(sample(3000,100),[]);
});
test('short excursions are rejected and applying thresholds requires new rest',()=>{
 const d=new GestureDetector(settings);for(let i=0;i<25;i++)d.sample(2000);for(let i=0;i<14;i++)assert.equal(d.sample(3000),null);assert.equal(d.sample(2000),null);
 d.configure({...settings,lower:1200,upper:2800});for(let i=0;i<100;i++)assert.equal(d.sample(3000),null);
});

test('apply the specified formula without inventing a low-byte restriction',()=>{
 const d=new PacketDecoder(),out=[];d.push(Uint8Array.from(Array(25).fill([20,150]).flat()),p=>out.push(...p),()=>assert.fail());
 assert.deepEqual(out,Array(25).fill(2150));
});
