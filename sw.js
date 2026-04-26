const CACHE = 'evza-v23';
const SHELL = [
  './', './index.html', './catalog.html', './search.html', './admin.html',
  './photo.html', './offline.html', './style.css', './app.js', './supabase.js',
  './auth.js', './config.js', './manifest.json', './assets/logo.svg',
  './assets/placeholder.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co') || event.request.method !== 'GET') return;
  const isAsset = /\.(css|js|svg|png|jpg|jpeg|webp|gif|woff2?)$/i.test(url.pathname);
  event.respondWith(
    (isAsset ? cacheFirst(event.request) : networkFirst(event.request))
      .catch(() => caches.match('./offline.html'))
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(CACHE);
  cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await caches.match(request)) || Promise.reject(error);
  }
}
