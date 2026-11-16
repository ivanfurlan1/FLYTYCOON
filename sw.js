const CACHE_NAME = 'eter-pwa-v1';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './js/constants.js',
  './js/audio.js',
  './js/creatures_catalog.js',
  './js/creatures_render.js',
  './js/creatures.js',
  './js/weather_data.js',
  './js/weather.js',
  './js/fog.js',
  './js/wind.js',
  './js/procedural.js',
  './js/physics.js',
  './js/astronaut.js',
  './js/resources.js',
  './js/colony_buildings.js',
  './js/colony_colonists.js',
  './js/textures.js',
  './js/lighting.js',
  './js/renderer.js',
  './js/rocket_builder.js',
  './js/ui.js',
  './js/saves.js',
  './js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        CORE_ASSETS.map(async (url) => {
          try {
            const req = new Request(url, { cache: 'reload' });
            const res = await fetch(req);
            if (res && res.ok) {
              await cache.put(url, res);
            }
          } catch (_) {
            // Ignorar errores individuales durante pre-caché
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Normalizar URL sin ?cb=... para que el cache-busting no rompa el modo offline
  const cleanUrl = new URL(url.pathname, self.location.origin).href;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(cleanUrl, copy);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(cleanUrl, { ignoreSearch: true });
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return Response.error();
      })
  );
});
