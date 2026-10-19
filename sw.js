// 奇幻數學島 Service Worker (PWA 離線快取與安裝支援)
const CACHE_NAME = 'math-island-v2.1.2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/state.js',
  './js/grades.js',
  './js/map.js',
  './js/engine.js',
  './js/ui.js',
  './js/visuals.js',
  './js/audio.js',
  './js/question-bank.js',
  './data/question-bank-g1.json',
  './data/question-bank-g2.json',
  './data/question-bank-g3.json',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/images/mascot.jpg',
  './assets/images/story-garden.jpg',
  './assets/images/story-thinking.jpg',
  './assets/images/story-treasure.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Precache skipped some files:', err);
      });
    })
  );
  self.skipWaiting();
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
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 只處理 GET 請求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 成功連線時更新快取
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        // 離線或網路失敗時使用本機快取
        return caches.match(event.request);
      })
  );
});
