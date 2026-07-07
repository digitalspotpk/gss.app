// Gujjar Service Station - Service Worker
// Caches the app shell so it opens instantly (and works offline) once installed.
var CACHE_NAME = "gss-app-cache-v1";
var APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL).catch(function(err){
        console.error("GSS SW: app shell cache failed", err);
      });
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_NAME; })
             .map(function(n){ return caches.delete(n); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

// Network-first for navigation/HTML (so you always get the latest version when online),
// falling back to the cached shell when offline. Cache-first for static assets (icons etc).
self.addEventListener("fetch", function(event){
  var req = event.request;
  if(req.method !== "GET") return;

  // Don't try to cache/intercept Firebase or other cross-origin API calls -
  // let those go straight to the network as normal.
  if(new URL(req.url).origin !== self.location.origin) return;

  if(req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") !== -1){
    event.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(cached){
          return cached || caches.match("./index.html");
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function(cached){
      return cached || fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        return res;
      }).catch(function(){ return cached; });
    })
  );
});
