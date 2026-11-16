// Fixed vocabulary plans, rotated locally: no generated words or external services.
export const COMMON_PHRASES=Object.freeze([
 'Necesito ayuda médica','Quiero agua','Quiero hablar con mi familia','Gracias',
 'Necesito ayuda','Quiero ir al baño','Tengo dolor','Quiero cambiar de posición',
 'Espere, por favor','No entiendo'
]);
export const COMPOSED_MESSAGES=Object.freeze([
 [['Acciones','Quiero'],['Acciones','Hablar'],['Personas','Familia']],
 [['Acciones','Necesito'],['Acciones','Beber'],['Necesidades','Agua']],
 [['Tiempo','Hoy'],['Acciones','Necesito'],['Necesidades','Descansar']],
 [['Acciones','Quiero'],['Acciones','Comer'],['Comida','Fruta']],
 [['Acciones','Necesito'],['Necesidades','Descansar'],['Tiempo','Ahora']],
 [['Acciones','Quiero'],['Acciones','Beber'],['Comida','Leche']],
 [['Tiempo','Hoy'],['Acciones','Necesito'],['Necesidades','Ayuda']]
]);
function shuffle(values,random){
 const result=[...values];
 for(let i=result.length-1;i>0;i--){const n=Number(random());const j=Math.min(i,Math.max(0,Math.floor((Number.isFinite(n)?n:0)*(i+1))));[result[i],result[j]]=[result[j],result[i]]}
 return result;
}
function previous(bank,cursor,count){
 if(!Number.isSafeInteger(cursor)||cursor<0)return [];
 return Array.from({length:count},(_,i)=>bank[(cursor-count+i+bank.length*2)%bank.length]);
}
export function nextPresentation(saved={},random=Math.random){
 const ids=COMPOSED_MESSAGES.map((_,i)=>i);
 // Migrate old rotation cursors without immediately repeating the old examples.
 const lastP=Array.isArray(saved?.lastPhrases)?saved.lastPhrases:previous(COMMON_PHRASES,saved?.phrases,4);
 const lastM=Array.isArray(saved?.lastMessages)?saved.lastMessages:previous(ids,saved?.messages,3);
 const p=COMMON_PHRASES.filter(v=>!lastP.includes(v)),m=ids.filter(v=>!lastM.includes(v));
 const phrases=shuffle(p.length>=4?p:COMMON_PHRASES,random).slice(0,4);
 const messages=shuffle(m.length>=3?m:ids,random).slice(0,3);
 return {phrases,messages:messages.map(i=>COMPOSED_MESSAGES[i].map(word=>[...word])),next:{version:2,lastPhrases:phrases,lastMessages:messages}};
}
