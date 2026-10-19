// Subir VERSION en cada cambio publicado: la app se actualiza la siguiente vez que se abre.
const VERSION = 'v1';
const ARCHIVOS = ['./', './index.html', './rutina.js', './logica.js', './manifest.json', './icono-192.png', './icono-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(cache => cache.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(claves =>
    Promise.all(claves.filter(c => c !== VERSION).map(c => caches.delete(c)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r ?? fetch(e.request)));
});
