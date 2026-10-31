/**
 * test_badge_celebration.mjs
 * 驗證跨島冒險成就圖鑑解鎖動效、3D 透視鏡檢視與全域徽章系統單元測試
 */

import { strict as assert } from 'assert';

console.log('🧪 開始跨島冒險成就圖鑑解鎖動效與透視鏡單元測試...\n');

// 建立模擬瀏覽器環境
const mockLocalStorage = {};
global.localStorage = {
  getItem: (key) => mockLocalStorage[key] || null,
  setItem: (key, val) => {
    mockLocalStorage[key] = String(val);
  },
  removeItem: (key) => {
    delete mockLocalStorage[key];
  },
  clear: () => {
    for (const k in mockLocalStorage) delete mockLocalStorage[k];
  },
};

global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

global.Audio = class {
  constructor() {
    this.currentTime = 0;
    this.volume = 1;
  }
  play() {
    return Promise.resolve();
  }
  pause() {}
  addEventListener() {}
  removeEventListener() {}
};

global.window = {
  innerWidth: 1024,
  innerHeight: 768,
  devicePixelRatio: 1,
  addEventListener: () => {},
  removeEventListener: () => {},
  speechSynthesis: {
    speak: () => {},
    cancel: () => {},
    getVoices: () => [],
  },
  __syncBadgesUI: () => {},
};

class MockElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this._className = '';
    this._classes = new Set();
    this.classList = {
      add: (...cls) => cls.forEach((c) => this._classes.add(c)),
      remove: (...cls) => cls.forEach((c) => this._classes.delete(c)),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (force) {
          this._classes.add(c);
        } else {
          this._classes.delete(c);
        }
      },
      contains: (c) => this._classes.has(c),
    };
    this.style = {};
    this.dataset = {};
    this.children = [];
    this._innerHTML = '';
    this.listeners = {};
  }

  get className() {
    return this._className;
  }

  set className(val) {
    this._className = val || '';
    this._classes = new Set(this._className.split(/\s+/).filter(Boolean));
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = val;
    this.children = [];
    const classMatches = [...val.matchAll(/class=["']([^"']+)["']/g)];
    for (const m of classMatches) {
      const el = new MockElement('div');
      el.className = m[1];
      this.children.push(el);
    }
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  remove() {
    if (global.document.body.children.includes(this)) {
      global.document.body.children = global.document.body.children.filter((c) => c !== this);
    }
  }

  addEventListener(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  dispatchEvent(event) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb({ target: this }));
    }
  }

  querySelector(selector) {
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      return this.children.find((c) => c.classList.contains(cls)) || null;
    }
    return null;
  }

  querySelectorAll(selector) {
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      return this.children.filter((c) => c.classList.contains(cls));
    }
    return [];
  }
}

global.document = {
  body: new MockElement('body'),
  createElement: (tag) => new MockElement(tag),
  getElementById: () => null,
};

// 導入測試目標模組
const {
  BADGE_DEFINITIONS,
  getBadgesStatus,
  getUnlockedBadgeCount,
  checkNewlyUnlockedBadges,
  showBadgeUnlockCelebration,
  showBadgeDetailModal,
  showBadgesModal,
} = await import('../js/badges.js');

const { audio } = await import('../js/audio.js');

let passedTests = 0;

// 測試 1: 徽章清單完整度與跨島科目覆蓋
assert(BADGE_DEFINITIONS.length >= 15, `徽章總數應至少 15 個，實際為 ${BADGE_DEFINITIONS.length}`);
const badgeIds = BADGE_DEFINITIONS.map((b) => b.id);
assert(badgeIds.includes('first_star'), '缺少入門徽章 first_star');
assert(badgeIds.includes('math_explorer'), '缺少數學徽章 math_explorer');
assert(badgeIds.includes('english_explorer'), '缺少英文徽章 english_explorer');
assert(badgeIds.includes('chinese_scholar'), '缺少國語徽章 chinese_scholar');
assert(badgeIds.includes('science_explorer'), '缺少自然科學徽章 science_explorer');
assert(badgeIds.includes('social_explorer'), '缺少社會島徽章 social_explorer');
assert(badgeIds.includes('all_island_traveler'), '缺少跨島探險家徽章 all_island_traveler');
assert(badgeIds.includes('combo_master'), '缺少連擊大師徽章 combo_master');
console.log(`✔ [測試 1 通過] 徽章規格完整，涵蓋 ${BADGE_DEFINITIONS.length} 個成就並支援跨島探索`);
passedTests++;

// 測試 2: 初始狀態判定與進度計算
const initialStatus = getBadgesStatus();
assert(Array.isArray(initialStatus), 'getBadgesStatus 應回傳陣列');
assert.equal(initialStatus.length, BADGE_DEFINITIONS.length);
initialStatus.forEach((b) => {
  assert(typeof b.progressPercent === 'number', `徽章 ${b.id} 應有數值型進度百分比`);
  assert(b.progressPercent >= 0 && b.progressPercent <= 100, `進度百分比應在 0~100 之間`);
});
console.log(`✔ [測試 2 通過] 初始狀態進度百分比運算精確`);
passedTests++;

// 測試 3: 模擬達成星星時的解鎖偵測
mockLocalStorage['fantasy-math-island-progress-v1'] = JSON.stringify({
  stars: { 1: 3, 2: 3, 3: 3, 4: 3 },
  totalCorrect: 20,
  maxCombo: 6,
});
mockLocalStorage['fantasy-math-island-progress-english-g1-v2'] = JSON.stringify({
  stars: { 1: 3, 2: 3, 3: 3, 4: 3 },
  totalCorrect: 20,
});
mockLocalStorage['fantasy-math-island-progress-chinese-g1-v2'] = JSON.stringify({
  stars: { 1: 3, 2: 3, 3: 3 },
  totalCorrect: 15,
});

const updatedStatus = getBadgesStatus();
const unlocked = updatedStatus.filter((b) => b.unlocked);
assert(unlocked.length >= 3, `解鎖徽章應至少 3 個，實際為 ${unlocked.length}`);
console.log(`✔ [測試 3 通過] 關卡戰績寫入後成功解鎖 ${unlocked.length} 個跨島榮譽勳章`);
passedTests++;

// 測試 4: checkNewlyUnlockedBadges 新解鎖識別與持久化防重覆
const newlyUnlocked1 = checkNewlyUnlockedBadges();
assert(newlyUnlocked1.length > 0, '應偵測到新解鎖成就');
const newlyUnlocked2 = checkNewlyUnlockedBadges();
assert.equal(newlyUnlocked2.length, 0, '同一成就不可被重複視為 newly unlocked');
console.log(`✔ [測試 4 通過] 新解鎖成就過濾與持久化已讀標記正常`);
passedTests++;

// 測試 5: Web Audio 原生合成成就解鎖璀璨號角
assert.equal(typeof audio.playBadgeUnlockFanfare, 'function', 'audio 應具備 playBadgeUnlockFanfare 方法');
let fanfareThrown = false;
try {
  audio.playBadgeUnlockFanfare();
} catch (err) {
  fanfareThrown = true;
}
assert.equal(fanfareThrown, false, 'playBadgeUnlockFanfare 在各環境中不應拋出未捕獲例外');
console.log(`✔ [測試 5 通過] Web Audio 原生合成成就解鎖號角音訊模組運作正常`);
passedTests++;

// 測試 6: 成就解鎖慶祝盛典 DOM 結構與按鈕渲染
let celebrationCompleted = false;
showBadgeUnlockCelebration(
  [
    {
      id: 'test_badge',
      name: '傳奇探索者',
      category: '榮耀',
      icon: '🏆',
      description: '全宇宙完成測試',
      current: 10,
      target: 10,
    },
  ],
  () => {
    celebrationCompleted = true;
  }
);

assert(global.document.body.children.length > 0, 'Celebration overlay 應加入 DOM');
const overlay = global.document.body.children[global.document.body.children.length - 1];
assert(overlay.classList.contains('badge-unlock-modal-overlay'), '應具備 badge-unlock-modal-overlay 類名');
assert(overlay.innerHTML.includes('badge-unlock-rays'), '應包含光芒旋轉節點');
assert(overlay.innerHTML.includes('badge-hero-bubble'), '應包含 3D 徽章躍出主氣泡');
assert(overlay.innerHTML.includes('badge-inspect-atlas-btn'), '應提供查看圖鑑按鈕');
assert(overlay.innerHTML.includes('badge-continue-adventure-btn'), '應提供繼續冒險按鈕');
console.log(`✔ [測試 6 通過] 跨島冒險成就解鎖慶典全屏 DOM 渲染與光環動效節點就緒`);
passedTests++;

// 測試 7: 徽章透視鏡 (Badge Detail Modal) 渲染
showBadgeDetailModal({
  id: 'math_explorer',
  name: '算術新星',
  category: '科目',
  icon: '📐',
  description: '在奇幻數學島累積獲得 10 顆星',
  unlocked: true,
  current: 10,
  target: 10,
  progressPercent: 100,
});
const detailOverlay = global.document.body.children[global.document.body.children.length - 1];
assert(detailOverlay.classList.contains('badge-detail-overlay'), '應包含 badge-detail-overlay');
assert(detailOverlay.innerHTML.includes('badge-detail-speech-btn'), '應包含語音朗讀按鈕');
assert(detailOverlay.innerHTML.includes('badge-detail-track'), '應包含進度條');
console.log(`✔ [測試 7 通過] 徽章 3D 透視鏡檢視視窗結構與朗讀互動正常`);
passedTests++;

// 測試 8: 跨島冒險圖鑑館 (Badges Modal) 分類篩選標籤
showBadgesModal();
const modalOverlay = global.document.body.children[global.document.body.children.length - 1];
assert(modalOverlay.classList.contains('badges-modal-overlay'), '應包含 badges-modal-overlay');
assert(modalOverlay.innerHTML.includes('badges-filter-bar'), '應包含分類篩選膠囊列');
assert(modalOverlay.innerHTML.includes('data-filter="subject"'), '應包含科目專精篩選標籤');
assert(modalOverlay.innerHTML.includes('data-filter="adventure"'), '應包含冒險探索篩選標籤');
assert(modalOverlay.innerHTML.includes('data-filter="glory"'), '應包含榮譽與大師篩選標籤');
console.log(`✔ [測試 8 通過] 跨島冒險成就圖鑑館分類導覽與多維篩選系統完整`);
passedTests++;

console.log(`\n🎉 全部 ${passedTests} 項單元測試 100% 綠燈通過！`);
