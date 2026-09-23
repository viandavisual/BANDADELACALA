// BANDA DE LA CALA · EDITOR v0.32 · scope /editor/
const CACHE='banda-de-la-cala-editor-v0.32';
const PREFIX='banda-de-la-cala-editor-';
const CORE=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-180.png','../editor.css','../editor.js','../version.js','../config.js','../content-store.js','../supabase-client.js','../data/content-published.js','../assets/brand/editor-icon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(CORE.map(url=>cache.add(url)))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim()})())});
function networkFirst(request){return fetch(request,{cache:'no-store'}).then(response=>{if(response.ok||response.type==='opaque'){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{})}return response}).catch(()=>caches.match(request))}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||event.request.headers.has('range'))return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(networkFirst(event.request));
});
