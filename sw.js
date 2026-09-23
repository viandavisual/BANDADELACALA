// BANDA DE LA CALA · v0.21 · legacy root worker cleanup
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      await Promise.all(keys.filter(k=>k.startsWith('banda-de-la-cala-app-')||/^banda-de-la-cala-v/.test(k)).map(k=>caches.delete(k)));
    }catch(_error){}
    try{ await self.registration.unregister(); }catch(_error){}
  })());
});
