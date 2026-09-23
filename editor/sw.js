// BANDA DE LA CALA · EDITOR v0.22 · scope /editor/
const CACHE='banda-de-la-cala-editor-v0.22';
const PREFIX='banda-de-la-cala-editor-';
const CORE=[
  './','./index.html','./manifest.webmanifest',
  './icons/icon-192.png','./icons/icon-512.png','./icons/icon-180.png',
  '../editor.css','../editor.js','../version.js','../config.js','../content-store.js','../supabase-client.js','../data/content-published.js',
  '../assets/brand/editor-icon.png'
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
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||req.headers.has('range')) return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;
  if(req.mode==='navigate'){ event.respondWith(networkFirst(req,'./index.html')); return; }
  event.respondWith(networkFirst(req));
});
