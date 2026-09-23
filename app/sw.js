// BANDA DE LA CALA · APP v0.21 · scope /app/
const CACHE='banda-de-la-cala-app-v0.21';
const PREFIX='banda-de-la-cala-app-';
const CORE=[
  './','./index.html','./manifest.webmanifest',
  '../version.js','../style.css','../app.js','../config.js','../content-store.js','../supabase-client.js','../data/content-published.js',
  '../assets/brand/logo-banda-de-la-cala.png','../assets/brand/app-icon.png',
  '../assets/icons/icon-192.png','../assets/icons/icon-512.png','../assets/icons/apple-touch-icon-180.png'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
async function networkFirst(request,fallback){
  const cache=await caches.open(CACHE);
  try{const response=await fetch(request,{cache:'no-store'});if(response&&response.ok&&response.status===200)cache.put(request,response.clone()).catch(()=>{});return response;}
  catch(_error){return (await cache.match(request))||(fallback?await cache.match(fallback):undefined)||Response.error();}
}
async function cacheFirst(request){
  const cache=await caches.open(CACHE),cached=await cache.match(request);if(cached)return cached;
  try{const response=await fetch(request);if(response&&response.ok&&response.status===200)cache.put(request,response.clone()).catch(()=>{});return response;}catch(_error){return Response.error();}
}
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET'||req.headers.has('range'))return;
  const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){event.respondWith(networkFirst(req,'./index.html'));return;}
  if(url.pathname.endsWith('/data/content-published.js')){event.respondWith(networkFirst(req,'../data/content-published.js'));return;}
  if(new Set(['script','style','manifest']).has(req.destination)){event.respondWith(networkFirst(req));return;}
  event.respondWith(cacheFirst(req));
});
