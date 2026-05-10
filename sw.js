/**
 * AGSTONE - SERVICE WORKER ENGINE
 * Stratégie : Cache-First pour les assets, Network-First pour l'index.
 */

const CACHE_NAME = 'agstone-v1.1'; // Change la version pour forcer une mise à jour
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/script.js',
    './manifest.json',
    './img/favicon.svg',
    './img/logo.svg',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css'
];

// 1. INSTALLATION : Mise en cache des ressources
self.addEventListener('install', (event) => {
    // Force le nouveau SW à prendre le contrôle immédiatement
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('SW: Mise en cache des ressources critiques');
            // On utilise addAll pour les fichiers vitaux
            return cache.addAll(ASSETS);
        })
    );
});

// 2. ACTIVATION : Nettoyage des anciens caches (Crucial pour la mémoire du téléphone)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('SW: Nettoyage de l\'ancien cache :', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Prend le contrôle des pages ouvertes immédiatement
    );
});

// 3. FETCH : Stratégie de chargement intelligente
self.addEventListener('fetch', (event) => {
    // Pour l'index.html, on tente le réseau d'abord pour avoir les dernières tâches
    // Pour les images/CSS, on utilise le cache
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                // On n'ajoute au cache que les requêtes valides (pas les sons externes par ex)
                if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // Optionnel : mettre en cache dynamiquement les nouvelles ressources
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // Si le réseau échoue et rien en cache (Hors-ligne total)
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});