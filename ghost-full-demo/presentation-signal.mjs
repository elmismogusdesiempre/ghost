// Synthetic presentation only: fine deterministic noise, bounded to the intended
// existing monitor band. Never used to process STM32 samples or define clicks.
export function presentationADC(state,index,lower,upper){
 const low=state==='left'?upper+1:state==='right'?0:lower;
 const high=state==='left'?4095:state==='right'?lower-1:upper;
 const base=(low+high)/2;
 const noise=Math.sin(index*1.7)*5+Math.sin(index*0.117)*8;
 return Math.round(Math.max(low,Math.min(high,base+noise)));
}
