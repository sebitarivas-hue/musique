/* Service worker : réseau d'abord pour la page, cache pour l'usage hors ligne */
<<<<<<< HEAD
const PREFIXE = "prof-", CACHE = PREFIXE + "af70a28e";
=======
const PREFIXE = "prof-", CACHE = PREFIXE + "568ccb7a";
>>>>>>> 1e51e5f (Publication : l'espace élève n'a plus le détail des cours ni les fiches d'évaluation ; espace enseignant avec code)
const CORE = ["index.html", "manifest.json", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.startsWith(PREFIXE)).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request)));
});
