// BANDA DE LA CALA · v0.22 · legacy root worker cleanup
// Aquest worker antic NO toca mai les caches independents de /app/ ni /editor/.
self.addEventListener('install',event=>{ event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      await Promise.all(keys.filter(key=>/^banda-de-la-cala-v/.test(key)).map(key=>caches.delete(key)));
    }catch(_error){}
    try{ await self.registration.unregister(); }catch(_error){}
  })());
});
