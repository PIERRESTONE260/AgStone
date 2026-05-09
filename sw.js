const CACHE_NAME = 'agstone-pro-v1';
const ASSETS = [
    'index.html',
    'css/style.css',
    'js/script.js',
    'manifest.json',
    'img/favicon.svg',
    'img/logo.svg',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css'
];

// Installation du cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Stratégie de chargement : Cache en premier, puis réseau
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});