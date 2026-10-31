// 奇幻數學島 Service Worker (PWA 離線快取與高效能秒開支援)
const CACHE_NAME = 'math-island-v3.1.9';

// 核心靜態資產：涵蓋全年級全學科 800+ 題庫、教具、島嶼腳本、高畫質背景與 SFX 音效
const STATIC_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './css/style.css',
  './css/admin.css',
  './css/combo.css',
  './css/characters.css',
  './css/economy.css',
  './manifest.webmanifest',

  // 核心 JS 模組
  './js/main.js',
  './js/admin.js',
  './js/state.js',
  './js/grades.js',
  './js/subjects.js',
  './js/map.js',
  './js/engine.js',
  './js/combo.js',
  './js/monsters.js',
  './js/characters.js',
  './js/actions.js',
  './js/economy.js',
  './js/badges.js',
  './js/ui.js',
  './js/visuals.js',
  './js/audio.js',
  './js/question-bank.js',
  './js/trophy.js',
  './js/poster.js',
  './js/student.js',
  './js/zhuyin.js',
  './js/zhuyin-data.js',

  // 跨學科關卡島嶼定義腳本
  './js/levels/index.js',
  './js/levels/island1.js',
  './js/levels/island2.js',
  './js/levels/island3.js',
  './js/levels/island4.js',
  './js/levels/island_defs_g2.js',
  './js/levels/island_defs_g3.js',
  './js/levels/island_defs_en_g1.js',
  './js/levels/island_defs_en_g2.js',
  './js/levels/island_defs_en_g3.js',
  './js/levels/island_defs_ch_g1.js',
  './js/levels/island_defs_ch_g2.js',
  './js/levels/island_defs_ch_g3.js',
  './js/levels/island_defs_science_g1.js',
  './js/levels/island_defs_science_g2.js',
  './js/levels/island_defs_science_g3.js',
  './js/levels/island_defs_social_g3.js',
  './js/levels/island_defs_challenge.js',

  // 跨學科全年級題庫與辭典 JSON
  './data/question-bank-g1.json',
  './data/question-bank-g2.json',
  './data/question-bank-g3.json',
  './data/question-bank-en-g1.json',
  './data/question-bank-en-g2.json',
  './data/question-bank-en-g3.json',
  './data/question-bank-ch-g1.json',
  './data/question-bank-ch-g2.json',
  './data/question-bank-ch-g3.json',
  './data/question-bank-science-g1.json',
  './data/question-bank-science-g2.json',
  './data/question-bank-science-g3.json',
  './data/question-bank-social-g3.json',
  './data/question-bank-challenge-g1.json',
  './data/question-bank-challenge-g2.json',
  './data/question-bank-challenge-g3.json',
  './data/zhuyin-dict.json',
  './data/tts-manifest.json',

  // PWA 圖示與島嶼繪本視覺資源
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/images/mascot.jpg',
  './assets/images/hero.jpg',
  './assets/images/og-cover.jpg',
  './assets/images/island-ocean.jpg',
  './assets/images/island-forest.jpg',
  './assets/images/island-cloud.jpg',
  './assets/images/island-space.jpg',
  './assets/images/story-garden.jpg',
  './assets/images/story-thinking.jpg',
  './assets/images/story-treasure.jpg',

  // 角色專屬過關必殺技與魔法陣特效
  './assets/vfx/vfx_magic_circle.webp',
  './assets/vfx/vfx_crescent_wave.webp',
  './assets/vfx/vfx_magic_circle.png',
  './assets/vfx/vfx_crescent_wave.png',

  // 終極大魔王 Darkon 與傳奇榮譽徽章
  './assets/boss/badge_legendary_hero.png',
  './assets/boss/boss_darkon_main.png',
  './assets/boss/boss_phase1_math.png',
  './assets/boss/boss_phase2_english.png',
  './assets/boss/boss_phase3_chinese.png',

  // 核心互動 SFX 音效
  './assets/audio/sfx/click.mp3',
  './assets/audio/sfx/correct.mp3',
  './assets/audio/sfx/wrong.mp3',
  './assets/audio/sfx/levelup.mp3',
  './assets/audio/sfx/whoosh.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 容錯批次預載：個別資產失敗不阻斷整體安裝
      const results = await Promise.allSettled(
        STATIC_ASSETS.map((asset) => cache.add(asset))
      );
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        console.warn(`[SW] Precache completed with ${failed.length} skipped items.`);
      }
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
            console.log('[SW] Clearing outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 監聽前端發送的主動更新訊息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  // 只處理 GET 請求
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 僅針對同源請求進行快取快照調度
  if (url.origin !== self.location.origin) {
    return;
  }

  // 針對導航請求 (HTML 頁面)：Network First with Cache Fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('./index.html') || caches.match(event.request);
        })
    );
    return;
  }

  // 針對靜態檔案 (JS/CSS/JSON/Images/Audio)：Stale-While-Revalidate 策略 (秒開 + 背景更新)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch((err) => {
          // 網路離線時不拋出未捕獲錯誤
          return null;
        });

      // 快取命中時立即返回快取 (毫秒級開屏)，同時在背景執行 fetchPromise 更新快取
      if (cachedResponse) {
        return cachedResponse;
      }

      // 快取未命中時等待網路響應
      return fetchPromise.then((networkResponse) => {
        if (networkResponse) return networkResponse;
        // 若網路也無法連線，回傳 408 離線友好指示
        return new Response('Offline resource unavailable', {
          status: 503,
          statusText: 'Service Unavailable (Offline)'
        });
      });
    })
  );
});
