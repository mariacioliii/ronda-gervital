/* Ronda · Gervital — funciona sin internet */
const CACHE = "ronda-v1.3.0";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "css/app.css", "css/fonts.css", "fonts/lexend.woff2", "fonts/comfortaa-700.woff2",
  "js/util.js", "js/db.js", "js/store.js", "js/nube.js", "js/icons.js", "js/seed.js", "js/alarm.js", "js/views.js", "js/app.js",
  "img/logo-blanco-480.png", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-32.png", "icons/apple-touch-icon.png",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // la app: con internet, siempre la versión nueva (así no se mezclan versiones); sin internet, lo guardado
    e.respondWith(fetch(req, { cache: "no-cache" }).then((res) => {
      if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html"))));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { caches.open(CACHE).then((c) => c.put(req, res.clone())); return res; })));
  }
});
/* Alarma con la app cerrada: llega desde el servidor */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { titulo: "Ronda", cuerpo: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.titulo || "Ronda de medicación", {
    body: d.cuerpo || "", tag: d.tag || "ronda", renotify: true, requireInteraction: true,
    icon: "icons/icon-192.png", badge: "icons/icon-192.png", vibrate: [300, 150, 300, 150, 600], data: { url: "./" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const c = cs.find((x) => "focus" in x);
    return c ? c.focus() : self.clients.openWindow("./");
  }));
});
