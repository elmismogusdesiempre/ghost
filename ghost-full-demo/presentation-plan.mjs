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
function cursor(value,fallback,length){return Number.isSafeInteger(value)&&value>=0?value%length:fallback}
function take(bank,start,count){return Array.from({length:count},(_,i)=>bank[(start+i)%bank.length])}
export function nextPresentation(saved={}){
 const phrases=cursor(saved?.phrases,4,COMMON_PHRASES.length),messages=cursor(saved?.messages,3,COMPOSED_MESSAGES.length);
 return {
  phrases:take(COMMON_PHRASES,phrases,4),
  messages:take(COMPOSED_MESSAGES,messages,3).map(words=>words.map(word=>[...word])),
  next:{phrases:(phrases+4)%COMMON_PHRASES.length,messages:(messages+3)%COMPOSED_MESSAGES.length}
 };
}
