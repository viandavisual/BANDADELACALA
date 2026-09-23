// BANDA DE LA CALA · EDITOR v0.20
const CACHE='banda-de-la-cala-editor-v0.20';
const EDITOR_CACHE_PREFIX='banda-de-la-cala-editor-';
const CORE=[
  './','./index.html','./manifest.webmanifest',
  '../editor.css','../editor.js','../version.js','../config.js','../content-store.js','../supabase-client.js','../data/content-published.js',
  '../assets/brand/editor-icon.png','../assets/icons/editor-icon-192.png','../assets/icons/editor-icon-512.png','../assets/icons/editor-apple-touch-icon-180.png'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(EDITOR_CACHE_PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
async function networkFirst(request,fallback){
  const cache=await caches.open(CACHE);
  try{const response=await fetch(request,{cache:'no-store'});if(response&&response.ok)cache.put(request,response.clone()).catch(()=>{});return response;}
  catch(_error){return (await cache.match(request)) || (fallback?await cache.match(fallback):undefined) || Response.error();}
}
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  if(req.headers.has('range')) return;
  if(req.mode==='navigate'){event.respondWith(networkFirst(req,'./index.html'));return;}
  const url=new URL(req.url);if(url.origin===self.location.origin)event.respondWith(networkFirst(req));
});
