// BANDA DE LA CALA · APP v0.20
importScripts('./version.js');
const CACHE = `banda-de-la-cala-app-${globalThis.BANDA_VERSION || 'dev'}`;
const APP_CACHE_PREFIX = 'banda-de-la-cala-app-';
const CORE = [
  './','./index.html','./version.js','./style.css','./app.js','./config.js','./content-store.js','./supabase-client.js',
  './data/content-published.js','./manifest.webmanifest',
  './assets/brand/logo-banda-de-la-cala.png','./assets/brand/app-icon.png',
  './assets/icons/icon-192.png','./assets/icons/icon-512.png','./assets/icons/apple-touch-icon-180.png'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>(key.startsWith(APP_CACHE_PREFIX)||/^banda-de-la-cala-v/.test(key))&&key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));
async function networkFirst(request,fallbackUrl){
  const cache=await caches.open(CACHE);
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok&&response.status===200) cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch(_error){
    return (await cache.match(request)) || (fallbackUrl ? await cache.match(fallbackUrl) : undefined) || Response.error();
  }
}
async function cacheFirst(request){
  const cache=await caches.open(CACHE); const cached=await cache.match(request); if(cached) return cached;
  try{const response=await fetch(request); if(response&&response.ok&&response.status===200) cache.put(request,response.clone()).catch(()=>{}); return response;}catch(_error){return Response.error();}
}
self.addEventListener('fetch',event=>{
  const request=event.request; if(request.method!=='GET') return;
  const url=new URL(request.url); if(url.origin!==self.location.origin) return;
  // L'EDITOR és una PWA independent. El SW de l'APP no intercepta mai /editor/ ni editor.html.
  if(/\/editor(?:\/|\.html(?:$|[?#]))/.test(url.pathname)) return;
  if(request.headers.has('range')) return;
  if(request.mode==='navigate'){event.respondWith(networkFirst(request,'./index.html'));return;}
  if(url.pathname.endsWith('/data/content-published.js')){event.respondWith(networkFirst(request,'./data/content-published.js'));return;}
  if(new Set(['script','style','manifest']).has(request.destination)){event.respondWith(networkFirst(request));return;}
  event.respondWith(cacheFirst(request));
});
