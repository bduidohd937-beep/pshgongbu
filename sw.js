const VERSION='psh-v036';const ASSETS=['./','./index.html','./styles.css','./content.js','./topic-content.js','./topics-v035-ethics-1.js','./topics-v035-ethics-2.js','./topics-v035-culture-1.js','./topics-v035-culture-2.js','./topics-v035-errata.js','./topics-v035-init.js','./curriculum-v034.js','./app.js','./install.js','./manifest.webmanifest','./icons/psh-icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('psh-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const url=new URL(e.request.url),scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(e.request.mode==='navigate'){
  e.respondWith(fetch(e.request).catch(()=>caches.match('./index.html')));
 }else{
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request)));
 }
});
