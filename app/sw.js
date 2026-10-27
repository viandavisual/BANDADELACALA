// BANDA DE LA CALA · APP v0.138 · scope /app/
const CACHE='banda-de-la-cala-app-v0.138';
const PREFIX='banda-de-la-cala-app-';
const CORE=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-180.png','../version.js','../style.css','../tuner.css','../tuner.js','../metronome.css','../metronome.js','../app.js','../config.js','../content-store.js','../supabase-client.js','../data/content-published.js','../assets/brand/logo-banda-de-la-cala.png','../assets/brand/imago-banda-de-la-cala.png','../assets/brand/app-icon.png','../assets/bandalogo.jpg','../assets/user-icons/user-partitures.png','../assets/user-icons/user-afinador.png','../assets/user-icons/user-metronom.png','../assets/user-icons/user-demos.png','../assets/user-icons/user-pujar-fato.png','../assets/user-icons/user-opcions.png','../assets/user-icons/user-bustia.png','./minigames/quina-nota-es/app.html'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(CORE.map(url=>cache.add(url)))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim()})())});
function networkFirst(request){return fetch(request,{cache:'no-store'}).then(response=>{if(response.ok||response.type==='opaque'){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{})}return response}).catch(()=>caches.match(request))}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||event.request.headers.has('range'))return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(networkFirst(event.request));
});

// v0.135 · Web Push recepció, oberta només quan l'usuari concedeix permisos.
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch (_) { data = { body: event.data?.text() || '' }; }
    const title = String(data.title || 'BANDA DE LA CALA').slice(0,120);
    const target = new URL(data.url || '/app/', self.location.origin);
    if (target.origin !== self.location.origin || !target.pathname.startsWith('/app/')) target.href = self.location.origin + '/app/';
    await self.registration.showNotification(title, {
      body: String(data.body || '').slice(0,350),
      icon: '/app/icons/icon-192.png', badge: '/app/icons/icon-192.png',
      tag: String(data.tag || 'banda-notificacio'),
      data: {url: target.href},
      actions: [{action:'info', title:'+INFO'}]
    });
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = event.notification.data?.url || self.location.origin + '/app/';
    const clientsList = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    for (const client of clientsList) {
      if (client.url === target && 'focus' in client) return client.focus();
    }
    return self.clients.openWindow(target);
  })());
});
