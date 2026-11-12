
'use strict';
const CORE_VOCAB = [
  // Necesidades
  {text:"Agua", emoji:"💧", category:"necesidades", type:"noun", speech:"Agua", priority:10, favorite:true},
  {text:"Comida", emoji:"🍽", category:"necesidades", type:"noun", speech:"Comida", priority:9, favorite:true},
  {text:"Baño", emoji:"🚽", category:"necesidades", type:"noun", speech:"Baño", priority:9, favorite:true},
  {text:"Dormir", emoji:"😴", category:"necesidades", type:"verb", speech:"Dormir", priority:6},
  {text:"Descansar", emoji:"🛏", category:"necesidades", type:"verb", speech:"Descansar", priority:6},
  {text:"Ayuda", emoji:"❤️", category:"necesidades", type:"noun", speech:"Ayuda", priority:10, favorite:true},
  {text:"Frío", emoji:"🥶", category:"necesidades", type:"adj", speech:"Frío", priority:6},
  {text:"Calor", emoji:"🥵", category:"necesidades", type:"adj", speech:"Calor", priority:6},
  {text:"Aire", emoji:"💨", category:"necesidades", type:"noun", speech:"Aire", priority:5},
  {text:"Ropa", emoji:"👕", category:"necesidades", type:"noun", speech:"Ropa", priority:4},
  {text:"Dinero", emoji:"💵", category:"necesidades", type:"noun", speech:"Dinero", priority:3},
  {text:"Transporte", emoji:"🚌", category:"necesidades", type:"noun", speech:"Transporte", priority:3},
  {text:"Teléfono", emoji:"📞", category:"necesidades", type:"noun", speech:"Teléfono", priority:4},

  // Personas
  {text:"Mamá", emoji:"👩", category:"personas", type:"noun", speech:"Mamá", priority:9, favorite:true},
  {text:"Papá", emoji:"👨", category:"personas", type:"noun", speech:"Papá", priority:9, favorite:true},
  {text:"Familia", emoji:"👪", category:"personas", type:"noun", speech:"Familia", priority:9, favorite:true},
  {text:"Médico", emoji:"🩺", category:"personas", type:"noun", speech:"Médico", priority:8},
  {text:"Enfermera", emoji:"👩‍⚕️", category:"personas", type:"noun", speech:"Enfermera", priority:7},
  {text:"Amigo", emoji:"🧑‍🤝‍🧑", category:"personas", type:"noun", speech:"Amigo", priority:5},

  // Acciones
  {text:"Quiero", emoji:"🙋", category:"acciones", type:"verb", speech:"Quiero", priority:10, favorite:true},
  {text:"Necesito", emoji:"❗", category:"acciones", type:"verb", speech:"Necesito", priority:10, favorite:true},
  {text:"Puedo", emoji:"👍", category:"acciones", type:"verb", speech:"Puedo", priority:6},
  {text:"No puedo", emoji:"🚫", category:"acciones", type:"verb", speech:"No puedo", priority:6},
  {text:"Comer", emoji:"🍴", category:"acciones", type:"verb", speech:"Comer", priority:7},
  {text:"Beber", emoji:"🥤", category:"acciones", type:"verb", speech:"Beber", priority:7},
  {text:"Ir", emoji:"➡️", category:"acciones", type:"verb", speech:"Ir", priority:6},
  {text:"Venir", emoji:"⬅️", category:"acciones", type:"verb", speech:"Venir", priority:5},
  {text:"Hablar", emoji:"💬", category:"acciones", type:"verb", speech:"Hablar", priority:6},
  {text:"Esperar", emoji:"⏳", category:"acciones", type:"verb", speech:"Esperar", priority:5},
  {text:"Repetir", emoji:"🔁", category:"acciones", type:"verb", speech:"Repetir", priority:5},

  // Salud
  {text:"Dolor", emoji:"🤕", category:"salud", type:"noun", speech:"Dolor", priority:10, favorite:true},
  {text:"Medicamento", emoji:"💊", category:"salud", type:"noun", speech:"Medicamento", priority:7},
  {text:"Respirar", emoji:"🫁", category:"salud", type:"verb", speech:"Respirar", priority:6},
  {text:"Posición", emoji:"🔄", category:"salud", type:"noun", speech:"Cambiar de posición", priority:5},

  // Lugares
  {text:"Casa", emoji:"🏠", category:"lugares", type:"noun", speech:"Casa", priority:6},
  {text:"Hospital", emoji:"🏥", category:"lugares", type:"noun", speech:"Hospital", priority:5},
  {text:"Trabajo", emoji:"💼", category:"lugares", type:"noun", speech:"Trabajo", priority:4},
  {text:"Colegio", emoji:"🏫", category:"lugares", type:"noun", speech:"Colegio", priority:4},

  // Comida
  {text:"Pan", emoji:"🍞", category:"comida", type:"noun", speech:"Pan", priority:5},
  {text:"Fruta", emoji:"🍎", category:"comida", type:"noun", speech:"Fruta", priority:5},
  {text:"Leche", emoji:"🥛", category:"comida", type:"noun", speech:"Leche", priority:5},
  {text:"Sopa", emoji:"🍲", category:"comida", type:"noun", speech:"Sopa", priority:4},

  // Emociones
  {text:"Feliz", emoji:"😀", category:"emociones", type:"adj", speech:"Feliz", priority:5},
  {text:"Triste", emoji:"😢", category:"emociones", type:"adj", speech:"Triste", priority:5},
  {text:"Enojado", emoji:"😠", category:"emociones", type:"adj", speech:"Enojado", priority:4},
  {text:"Cansado", emoji:"😩", category:"emociones", type:"adj", speech:"Cansado", priority:5},
  {text:"Asustado", emoji:"😨", category:"emociones", type:"adj", speech:"Asustado", priority:4},

  // Tiempo
  {text:"Ahora", emoji:"⏰", category:"tiempo", type:"adv", speech:"Ahora", priority:6},
  {text:"Después", emoji:"⏭", category:"tiempo", type:"adv", speech:"Después", priority:5},
  {text:"Antes", emoji:"⏮", category:"tiempo", type:"adv", speech:"Antes", priority:4},
  {text:"Hoy", emoji:"📅", category:"tiempo", type:"adv", speech:"Hoy", priority:4},
  {text:"Mañana", emoji:"🌅", category:"tiempo", type:"adv", speech:"Mañana", priority:4},

  // Preguntas
  {text:"Qué", emoji:"❓", category:"preguntas", type:"pron", speech:"Qué", priority:6},
  {text:"Quién", emoji:"❓", category:"preguntas", type:"pron", speech:"Quién", priority:5},
  {text:"Dónde", emoji:"❓", category:"preguntas", type:"pron", speech:"Dónde", priority:5},
  {text:"Cuándo", emoji:"❓", category:"preguntas", type:"pron", speech:"Cuándo", priority:5},
  {text:"Cómo", emoji:"❓", category:"preguntas", type:"pron", speech:"Cómo", priority:5},
  {text:"Por qué", emoji:"❓", category:"preguntas", type:"pron", speech:"Por qué", priority:5},

  // Comunicación básica (viven en Frases útiles / favoritos)
  {text:"Sí", emoji:"✅", category:"frases", type:"word", speech:"Sí", priority:10, favorite:true},
  {text:"No", emoji:"❌", category:"frases", type:"word", speech:"No", priority:10, favorite:true},
  {text:"Gracias", emoji:"🙏", category:"frases", type:"word", speech:"Gracias", priority:7},
  {text:"Por favor", emoji:"🙏", category:"frases", type:"word", speech:"Por favor", priority:7},
  {text:"No entiendo", emoji:"❔", category:"frases", type:"phrase", speech:"No entiendo", priority:6},
  {text:"Repita", emoji:"🔁", category:"frases", type:"word", speech:"Repita", priority:6},
  {text:"Espere", emoji:"✋", category:"frases", type:"word", speech:"Espere", priority:6},
];
const PHRASES = [
  "Necesito ayuda.", "No puedo hablar.", "No entiendo.", "Repita, por favor.",
  "Espere, por favor.", "Quiero agua.", "Quiero ir al baño.", "Tengo dolor.",
  "Quiero hablar con mi familia.", "Necesito ayuda médica."
].map((t,i)=>({text:t, emoji:"💬", category:"frases", type:"phrase", speech:t, priority:8-i*0.1, favorite:false, isPhrase:true}));
const CATEGORIES = [
  {id:"necesidades", label:"Necesidades", emoji:"💧"},
  {id:"personas",    label:"Personas",    emoji:"👪"},
  {id:"acciones",    label:"Acciones",    emoji:"🙋"},
  {id:"salud",       label:"Salud",       emoji:"🩺"},
  {id:"lugares",     label:"Lugares",     emoji:"🏠"},
  {id:"comida",      label:"Comida",      emoji:"🍽"},
  {id:"emociones",   label:"Emociones",   emoji:"😀"},
  {id:"tiempo",      label:"Tiempo",      emoji:"⏰"},
  {id:"preguntas",   label:"Preguntas",   emoji:"❓"},
  {id:"frases",      label:"Frases útiles", emoji:"💬"},
  {id:"favoritos",   label:"Favoritos",   emoji:"⭐"},
  {id:"otros",       label:"Más / Otros", emoji:"⋯"},
];
