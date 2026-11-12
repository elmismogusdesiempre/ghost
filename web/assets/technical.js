'use strict';
(() => {
 const $=id=>document.getElementById(id),hi=$('byte-high'),lo=$('byte-low');
 function decode(){const a=Number(hi.value),b=Number(lo.value);if(hi.value===''||lo.value===''||!Number.isInteger(a)||!Number.isInteger(b)||a<0||a>255||b<0||b>255){$('byte-result').textContent='—';$('byte-caption').textContent='Cada byte debe ser un entero entre 0 y 255.';return;}const adc=a*100+b;$('byte-result').textContent=String(adc);$('byte-caption').textContent=`${a} × 100 + ${b} = ${adc} · ${adc<=4095?'valor dentro del rango ADC.':'fuera de 0–4095: muestra inválida para este ADC.'}`;}
 hi.addEventListener('input',decode);lo.addEventListener('input',decode);
 let pending=0,complete=0,step=0;const fragments=[17,33,73,27],cells=$('packet-cells');for(let i=0;i<25;i++)cells.append(document.createElement('span'));
 function show(){[...cells.children].forEach((c,i)=>{c.classList.toggle('filled',pending>=i*2+2);c.classList.toggle('partial',pending===i*2+1);});$('packet-pending').textContent=`${pending} / 50 bytes pendientes`;$('packet-complete').textContent=`${complete} paquetes completos`;$('packet-receive').textContent=`Recibir ${fragments[step%fragments.length]} bytes`;}
 $('packet-receive').addEventListener('click',()=>{const got=fragments[step%fragments.length],total=pending+got,finished=Math.floor(total/50);complete+=finished;pending=total%50;step++;$('packet-status').textContent=`Llegaron ${got} bytes. ${finished?`Se completaron ${finished} paquetes de 25 muestras.`:'El fragmento se conserva hasta completar el paquete.'} Restan ${pending} bytes sin procesar.`;show();});
 $('packet-reset').addEventListener('click',()=>{pending=complete=step=0;show();$('packet-status').textContent='Acumulador reiniciado. No se ha abierto ningún puerto.';});show();decode();
})();
