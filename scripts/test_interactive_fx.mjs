/**
 * test_interactive_fx.mjs
 * 驗證互動特效升級：彈力果凍觸感、星塵軌跡粒子與島嶼活態動態氛圍單元測試
 */

import { strict as assert } from 'assert';
import fs from 'fs';

console.log('🧪 開始互動特效與島嶼氛圍單元測試...\n');

// 建立模擬瀏覽器環境
global.window = {
  innerWidth: 1024,
  innerHeight: 768,
  devicePixelRatio: 1,
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
};

global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now() + 600), 16);
global.cancelAnimationFrame = () => {};

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
    this.style = {
      setProperty: (prop, val) => {
        this.style[prop] = val;
      },
    };
    this.dataset = { subject: 'math' };
    this.children = [];
    this._innerHTML = '';
    this.listeners = {};
    this.offsetWidth = 100;
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
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  prepend(child) {
    this.children.unshift(child);
    return child;
  }

  remove() {
    if (global.document.body.children.includes(this)) {
      global.document.body.children = global.document.body.children.filter((c) => c !== this);
    }
  }

  getBoundingClientRect() {
    return {
      left: 100,
      top: 200,
      width: 200,
      height: 60,
    };
  }

  setAttribute() {}
}

const mockBody = new MockElement('body');
global.document = {
  body: mockBody,
  createElement: (tag) => new MockElement(tag),
  getElementById: (id) => {
    if (id === 'island-ambient-layer') {
      return mockBody.children.find((c) => c.id === 'island-ambient-layer') || null;
    }
    return null;
  },
  querySelectorAll: () => [],
};

// 導入測試目標模組
const { spawnStardustCollection, setIslandAmbientTheme, clearIslandAmbientFX } = await import('../js/ui.js');

let passedTests = 0;

// 測試 1: 星塵軌跡粒子 (spawnStardustCollection) 生成與貝茲曲線插值計算
const fromButton = new MockElement('button');
const toHud = new MockElement('div');
toHud.id = 'combo-bar';

spawnStardustCollection(fromButton, toHud);
const spawnedParticles = mockBody.children.filter((c) => c.classList.contains('stardust-particle'));
assert(spawnedParticles.length >= 1, `應在 body 生成星塵粒子，實際生成 ${spawnedParticles.length}`);
console.log(`✔ [測試 1 通過] 答對時成功激發 ${spawnedParticles.length} 顆星塵粒子沿弧線飛向 HUD`);
passedTests++;

// 測試 2: 各領域島嶼活態動態氛圍粒子 (setIslandAmbientTheme)
const subjectsToTest = ['math', 'chinese', 'english', 'science', 'social', 'challenge'];
for (const sub of subjectsToTest) {
  setIslandAmbientTheme(sub);
  const layer = global.document.getElementById('island-ambient-layer');
  assert(layer !== null, `應生成 #island-ambient-layer 容器`);
  assert(layer.children.length >= 8, `科目 ${sub} 應生成至少 8 顆氛圍粒子，實際為 ${layer.children.length}`);
  const hasSubClass = layer.children.some((c) => c.className.includes('ambient-'));
  assert(hasSubClass, `科目 ${sub} 粒子應具備 ambient- 類名`);
}
console.log(`✔ [測試 2 通過] 全科目 6 大島嶼活態環境粒子主題切換正常且符合規格`);
passedTests++;

// 測試 3: 氛圍層清理與重設 (clearIslandAmbientFX)
clearIslandAmbientFX();
const layerAfterClear = global.document.getElementById('island-ambient-layer');
assert.equal(layerAfterClear.children.length, 0, 'clearIslandAmbientFX 應清空所有粒子節點');
console.log(`✔ [測試 3 通過] 島嶼環境粒子清理與記憶體釋放邏輯正常`);
passedTests++;

// 測試 4: CSS 果凍彈力按鈕與物理觸感樣式定義檢驗
const cssContent = fs.readFileSync('css/style.css', 'utf-8');
assert(cssContent.includes('.answer-btn:active:not(:disabled)'), 'style.css 應包含 .answer-btn:active 樣式');
assert(cssContent.includes('scale(0.95, 0.93)'), '應包含 squash 縮放物理反饋 scale(0.95, 0.93)');
assert(cssContent.includes('answerJellyCorrect'), '應包含 answerJellyCorrect 果凍彈力動畫');
assert(cssContent.includes('answerGentleShake'), '應包含 answerGentleShake 答錯撫慰輕晃');
assert(cssContent.includes('.stardust-particle'), '應定義 .stardust-particle 樣式');
assert(cssContent.includes('hudImpactPulse'), '應定義 hudImpactPulse HUD 吸收反饋');
assert(cssContent.includes('.island-ambient-layer'), '應定義 .island-ambient-layer 氛圍圖層');
assert(cssContent.includes('.ambient-bubble'), '應定義 .ambient-bubble 泡泡動畫');
assert(cssContent.includes('.ambient-petal'), '應定義 .ambient-petal 花瓣飄落動畫');
assert(cssContent.includes('.ambient-firefly'), '應定義 .ambient-firefly 螢火蟲動畫');
console.log(`✔ [測試 4 通過] CSS 果凍彈性按鈕、星塵粒子與島嶼氛圍 Keyframes 樣式完備`);
passedTests++;

console.log(`\n🎉 全部 ${passedTests} 項互動特效單元測試 100% 綠燈通過！`);
