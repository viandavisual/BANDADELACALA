// BANDA DE LA CALA v0.19
importScripts('./version.js');
const CACHE = `banda-de-la-cala-${globalThis.BANDA_VERSION || 'dev'}`;
const CORE = [
  './',
  './index.html',
  './editor.html',
  './editor/',
  './editor/index.html',
  './editor/manifest.webmanifest',
  './editor/sw.js',
  './editor.css',
  './editor.js',
  './editor-manifest.webmanifest',
  './version.js',
  './style.css',
  './app.js',
  './config.js',
  './content-store.js',
  './supabase-client.js',
  './data/content-published.js',
  './manifest.webmanifest',
  './SUPABASE_PRIMEROS_PASOS.txt',
  './assets/brand/logo-banda-de-la-cala.png',
  './assets/brand/app-icon.png',
  './assets/brand/editor-icon.png',
  './assets/icons/editor-icon-192.png',
  './assets/icons/editor-icon-512.png',
  './assets/icons/editor-apple-touch-icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon-180.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok && response.status === 200) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    return (await cache.match(request)) || (fallbackUrl ? await cache.match(fallbackUrl) : undefined) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok && response.status === 200) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Àudio/vídeo poden utilitzar peticions Range. Es deixen passar directament
  // per evitar respostes parcials incompatibles amb Cache Storage.
  if (request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    const isEditorRoute = /\/editor(?:\.html)?\/?$/.test(url.pathname);
    const fallback = isEditorRoute ? './editor.html' : './index.html';
    event.respondWith(networkFirst(request, fallback));
    return;
  }

  // El contingut publicat és la font compartida entre dispositius abans de Supabase.
  // Sempre es consulta a xarxa; si falla, usem la darrera còpia canònica de la caché.
  if (url.pathname.endsWith('/data/content-published.js')) {
    event.respondWith((async()=>{
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if(response && response.ok) cache.put('./data/content-published.js', response.clone()).catch(()=>{});
        return response;
      } catch(error) {
        return (await cache.match('./data/content-published.js')) || Response.error();
      }
    })());
    return;
  }

  const freshDestinations = new Set(['script', 'style', 'manifest']);
  if (freshDestinations.has(request.destination)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
