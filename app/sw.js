// BANDA DE LA CALA · APP v0.22 · scope /app/
const CACHE='banda-de-la-cala-app-v0.22';
const PREFIX='banda-de-la-cala-app-';
const CORE=[
  './','./index.html','./manifest.webmanifest',
  './icons/icon-192.png','./icons/icon-512.png','./icons/icon-180.png',
  '../version.js','../style.css','../app.js','../config.js','../content-store.js','../supabase-client.js','../data/content-published.js',
  '../assets/brand/logo-banda-de-la-cala.png','../assets/brand/app-icon.png'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.allSettled(CORE.map(url=>cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{ if(event.data==='SKIP_WAITING') self.skipWaiting(); });

async function networkFirst(request,fallback){
  const cache=await caches.open(CACHE);
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&(response.ok||response.type==='opaque')) cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch(_error){
    return (await cache.match(request))||(fallback?await cache.match(fallback):undefined)||Response.error();
  }
}
async function cacheFirst(request){
  const cache=await caches.open(CACHE);
  const cached=await cache.match(request);
  if(cached) return cached;
  try{
    const response=await fetch(request);
    if(response&&(response.ok||response.type==='opaque')) cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch(_error){ return Response.error(); }
}
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||req.headers.has('range')) return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;
  if(req.mode==='navigate'){ event.respondWith(networkFirst(req,'./index.html')); return; }
  if(url.pathname.endsWith('/data/content-published.js')){ event.respondWith(networkFirst(req,'../data/content-published.js')); return; }
  if(new Set(['script','style','manifest']).has(req.destination)){ event.respondWith(networkFirst(req)); return; }
  event.respondWith(cacheFirst(req));
});
