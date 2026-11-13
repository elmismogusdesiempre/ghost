import test from 'node:test';import assert from 'node:assert/strict';
import { demoADC } from '../demo-signal.mjs';
import { demoADC as mobileDemoADC } from '../../mobile/demo-signal.mjs';
import { GestureDetector } from '../protocol.mjs';
test('both demos have the same bounded, deterministic but noisy ADC signal',()=>{const values=Array.from({length:18000},(_,n)=>demoADC(n));assert.ok(values.every(Number.isInteger));assert.ok(values.every(v=>v>=0&&v<=4095));assert.deepEqual(values,Array.from({length:18000},(_,n)=>mobileDemoADC(n)));assert.equal(demoADC(NaN),2048);const rest=values.slice(0,500);assert.ok(Math.max(...rest)-Math.min(...rest)>100);assert.ok(values.some(v=>v>3700));assert.ok(values.some(v=>v<500));});
test('short noise spikes do not add clicks with 30ms stability; stable activations still do',()=>{const d=new GestureDetector({lower:1500,upper:2500,hold:30});const counts={left:0,right:0};for(let n=0;n<17550;n++){const event=d.sample(demoADC(n));if(event)counts[event]++}assert.deepEqual(counts,{left:3,right:3});});
