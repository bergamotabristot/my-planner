// sw.js - Service Worker for offline PWA functionality
const CACHE_NAME = 'my-day-pwa-v2';

const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/variables.css',
    './css/main.css',
    './css/navigation.css',
    './css/journal.css',
    './css/schedule.css',
    './css/habits.css',
    './css/settings.css',
    './js/app.js',
    './js/database/database.js',
    './js/database/journal.js',
    './js/database/habits.js',
    './js/database/tasks.js',
    './js/journal/journal.js',
    './js/habits/habits.js',
    './js/schedule/schedule.js',
    './js/schedule/day.js',
    './js/schedule/week.js',
    './js/schedule/month.js',
    './js/settings/settings.js',
    './js/utils/dates.js',
    './js/utils/helpers.js',
    './assets/icons/icon-180.png',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Stale-While-Revalidate caching strategy
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => cachedResponse);

            return cachedResponse || fetchPromise;
        })
    );
});