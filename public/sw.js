/** Caché sin conexión: precarga la lista del build y sirve primero desde caché. */
const CACHE = 'copiloto-v1';
self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(CACHE);
  const lista = await (await fetch('precache.json', { cache: 'no-store' })).json();
  await c.addAll(['./', ...lista]);
  await self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE), guardada = await c.match(e.request, { ignoreSearch: true });
    if (guardada) return guardada;
    const r = await fetch(e.request);
    if (r.ok) c.put(e.request, r.clone());
    return r;
  })());
});
