'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const key = 'ghost_product_reading_v1';
  const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let prefs = { size: 18, reduced: systemMotion.matches };
  try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); if (saved) prefs = { size: Math.min(22, Math.max(16, Number(saved.size) || 18)), reduced: typeof saved.reduced === 'boolean' ? saved.reduced : systemMotion.matches }; } catch {}
  function applyReading(save = false) {
    document.documentElement.style.fontSize = prefs.size + 'px';
    document.documentElement.classList.toggle('reduced-motion', prefs.reduced);
    $('reduce-motion').checked = prefs.reduced;
    $('reading-status').textContent = `Texto: ${prefs.size} px · ${prefs.reduced ? 'movimiento reducido' : 'movimiento disponible'}.`;
    $('text-less').disabled = prefs.size <= 16; $('text-more').disabled = prefs.size >= 22;
    if (save) { try { localStorage.setItem(key, JSON.stringify(prefs)); } catch {} }
    window.dispatchEvent(new CustomEvent('ghost:motion', { detail: { reduced: prefs.reduced } }));
  }
  window.GhostReading = Object.freeze({ reduced: () => prefs.reduced });
  $('text-less').addEventListener('click', () => { prefs.size = Math.max(16,prefs.size-1);applyReading(true); });
  $('text-more').addEventListener('click', () => { prefs.size = Math.min(22,prefs.size+1);applyReading(true); });
  $('reduce-motion').addEventListener('change', e => { prefs.reduced=e.target.checked;applyReading(true); });
  systemMotion.addEventListener('change', e => { if(e.matches){prefs.reduced=true;applyReading();} });
  applyReading();
  const nav=$('main-nav'),toggle=$('menu-toggle');
  function closeMenu(focus=false){nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');if(focus)toggle.focus();}
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')==='true';nav.classList.toggle('open',!open);toggle.setAttribute('aria-expanded',String(!open));});
  nav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(nav.classList.contains('open'))closeMenu(true);for(const d of document.querySelectorAll('.a11y[open]')){d.open=false;d.querySelector('summary').focus();}}});
  document.addEventListener('click',e=>{if(!nav.contains(e.target)&&!toggle.contains(e.target))closeMenu();for(const d of document.querySelectorAll('.a11y[open]'))if(!d.contains(e.target))d.open=false;});
  const intentButtons=document.querySelectorAll('[data-intent]');
  intentButtons.forEach(b=>b.addEventListener('click',()=>{intentButtons.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('intent-message').textContent=b.dataset.intent;$('intent-status').textContent='Ejemplo ilustrativo; no es un testimonio.';}));
  $('listen-intent')?.addEventListener('click',()=>{
    if(!window.speechSynthesis){$('intent-status').textContent='La voz no está disponible en este navegador. El mensaje permanece visible.';return;}
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance($('intent-message').textContent);u.lang='es-ES';u.onerror=()=>{$('intent-status').textContent='No se pudo reproducir la voz del dispositivo.';};u.onend=()=>{$('intent-status').textContent='Ejemplo pronunciado.';};speechSynthesis.speak(u);
  });
  // A static preview gives context without adding automatic motion to the home page.
  function preview(canvas){
    const r=canvas.getBoundingClientRect();if(!r.width)return;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);const c=canvas.getContext('2d');c.scale(d,d);const w=r.width,h=r.height,p=18,y=v=>h-p-v/4095*(h-2*p);
    for(const[a,b,color]of[[2500,4095,'#c6d9bd'],[1500,2500,'#e9eadf'],[0,1500,'#dfc1b3']]){c.fillStyle=color;c.fillRect(p,y(b),w-2*p,y(a)-y(b));}
    c.strokeStyle='#111310';c.lineWidth=1.8;c.beginPath();for(let i=0;i<450;i++){const t=i/449;let v=2050+1300*Math.sin(t*10)+240*Math.sin(t*37)+160*Math.sin(t*97);if(t>.58&&t<.595)v+=750;const x=p+t*(w-2*p);if(!i)c.moveTo(x,y(v));else c.lineTo(x,y(v));}c.stroke();
  }
  const previews=[...document.querySelectorAll('[data-signal-preview]')];previews.forEach(preview);let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>previews.forEach(preview),120);});
  const form=$('brief-form');
  if(form){
    let brief='';const contexts={familia:'Persona usuaria, familia o acompañante',educacion:'Educación o investigación',ingenieria:'Ingeniería o integración de hardware',institucion:'Institución u organización'};
    const routes={familia:'Comienza por las etapas y las frases que tengan sentido para la persona. El acceso físico debe valorarse antes de planear una integración.',educacion:'Puedes usar la guía educativa y el laboratorio para preparar una exposición o una práctica, diferenciando simulación y hardware.',ingenieria:'Revisa el protocolo de 50 bytes, la alineación, la adquisición a 500 Hz nominales y las pruebas antes de integrar una nueva señal.',institucion:'Define primero el contexto de uso, el responsable de preparación, la entrada disponible y las comprobaciones necesarias.'};
    form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const context=$('brief-context').value,input=$('brief-input').value,goal=$('brief-goal').value.trim();if(!goal){$('brief-goal').setCustomValidity('Escribe qué quieres explorar.');$('brief-goal').reportValidity();return;}
      brief=`GHOST · Ficha inicial de implementación\n\nContexto: ${contexts[context]}\nEntrada disponible: ${input}\n\nQué quiero explorar:\n${goal}\n\nSiguiente paso sugerido:\n${routes[context]}\n\nEsta ficha se generó localmente. No constituye una cotización ni una validación clínica.`;
      $('brief-summary').textContent=brief;$('brief-recommendation').textContent=routes[context];$('brief-github').href='https://github.com/elmismogusdesiempre/ghost/issues/new?'+new URLSearchParams({title:'Consulta de implementación · '+contexts[context],body:brief}).toString();$('brief-result').hidden=false;$('brief-status').textContent='Ficha preparada en tu navegador. No se ha enviado ni publicado.';$('brief-result-title').focus();
    });
    $('brief-goal').addEventListener('input',()=>$('brief-goal').setCustomValidity(''));
    $('brief-download').addEventListener('click',()=>{if(!brief)return;const u=URL.createObjectURL(new Blob([brief],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='GHOST-ficha-de-implementacion.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);$('brief-status').textContent='Ficha descargada. No se envió a un servidor.';});
    $('brief-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(brief);$('brief-status').textContent='Ficha copiada.';}catch{$('brief-status').textContent='Puedes seleccionar y copiar el texto de la ficha manualmente.';}});
  }
})();
