/* Network-first: never hold on to obsolete student HTML or JavaScript. */
const CACHE='uni-bean-v12-1-1-scheme-a';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('uni-bean-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET'||req.url.includes('/api/')||!req.url.startsWith(self.registration.scope))return;
 e.respondWith(fetch(req,{cache:'no-store'}).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return res}).catch(()=>caches.match(req)));
});
