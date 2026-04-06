/**
 * EVZA Gallery — Service Worker
 * Caches static assets for offline viewing
 * Checks for new content every 30 minutes
 */
var CACHE_NAME = "evza-gallery-v4";
var CHECK_INTERVAL = 30 * 60 * 1000;
var lastKnownVersion = null;

var ASSETS = [
  "./",
  "./index.html",
  "./catalog.html",
  "./admin.html",
  "./style.css",
  "./app.js",
  "./data.js",
  "./manifest.json",
  "./assets/logo.jpg",
  "./download-share.js",
  "./version.json"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS).catch(function () {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) {
          return n !== CACHE_NAME;
        }).map(function (n) {
          return caches.delete(n);
        })
      );
    }).then(function () {
      /* Start polling after activation */
      checkVersion();
      setInterval(checkVersion, CHECK_INTERVAL);
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  if (e.request.url.startsWith("https://fonts.googleapis.com") ||
      e.request.url.startsWith("https://fonts.gstatic.com")) return;
  if (e.request.url.startsWith("https://drive.google.com")) return;

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (response) {
        if (!response || response.status !== 200) return response;
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(e.request, clone);
        });
        return response;
      });
    })
  );
});

/* ===================================================================
   Version checker — polls version.json and notifies clients
   =================================================================== */

function checkVersion() {
  var baseUrl = self.registration.scope || "./";
  fetch(baseUrl + "version.json", {
    cache: "no-cache",
    mode: "cors"
  })
    .then(function (res) {
      if (!res.ok) return null;
      return res.json();
    })
    .then(function (data) {
      if (!data || !data.version) return;
      if (lastKnownVersion && lastKnownVersion !== data.version) {
        notifyClients(data);
      }
      lastKnownVersion = data.version;
    })
    .catch(function () {});
}

function notifyClients(data) {
  self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then(function (clients) {
    for (var i = 0; i < clients.length; i++) {
      clients[i].postMessage({
        type: "new_version",
        version: data.version,
        date: data.date || "",
        message: data.message || "",
        newCatalogs: data.newCatalogs || []
      });
    }
  });
}
