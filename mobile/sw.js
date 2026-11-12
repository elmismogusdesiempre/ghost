// /mobile/ only. Never cache or control Desktop, the monitor or the product site.
const CACHE='ghost-mobile-shell-v1';
const SHELL=['./','./index.html','./ghost.css','./mobile.css','./vocabulary.js','./app.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'].map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
// Wait for the old Mobile windows to close before activating an update. A
// communication session is never reloaded automatically during use.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('ghost-mobile-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);url.hash='';url.search='';
 if(!SHELL.includes(url.href))return;
 event.respondWith(caches.open(CACHE).then(async cache=>{
  // Cache first keeps a running version internally consistent. A new worker
  // installs its own complete cache before taking over closed sessions.
  const saved=await cache.match(url.href);if(saved)return saved;
  const response=await fetch(event.request);if(response.ok)await cache.put(url.href,response.clone());return response;
 }));
});
