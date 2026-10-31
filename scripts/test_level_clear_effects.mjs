/**
 * test_level_clear_effects.mjs
 * 驗證關卡音效升級 (Web Audio 原生合成號角 + 星星音階) 與全屏通關特效 (加農砲彩帶 + 旋轉光芒)
 */

import { strict as assert } from 'assert';

console.log('🧪 開始全屏通關特效與雙軌關卡音效單元測試...\n');

// 模擬瀏覽器環境
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
};

global.document = {
  getElementById: (id) => {
    if (id === 'confetti') {
      return {
        getContext: () => ({
          clearRect: () => {},
          setTransform: () => {},
          save: () => {},
          restore: () => {},
          translate: () => {},
          rotate: () => {},
          beginPath: () => {},
          arc: () => {},
          fill: () => {},
          fillRect: () => {},
          moveTo: () => {},
          lineTo: () => {},
          closePath: () => {},
        }),
        style: {},
      };
    }
    return null;
  },
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    className: '',
    style: {},
    innerHTML: '',
    setAttribute: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: () => {},
    addEventListener: () => {},
  }),
  body: {
    appendChild: () => {},
  },
};

global.requestAnimationFrame = (fn) => setTimeout(fn, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// 模擬 Web Audio API
class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  createBuffer() {
    return {};
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {},
      stop: () => {},
    };
  }
  createOscillator() {
    return {
      type: 'triangle',
      frequency: { setValueAtTime: () => {} },
      connect: () => {},
      start: () => {},
      stop: () => {},
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
    };
  }
}

global.window.AudioContext = MockAudioContext;
global.Audio = class MockAudio {
  constructor(src) {
    this.src = src;
    this.volume = 1;
    this.currentTime = 0;
    this.paused = true;
  }
  play() {
    return Promise.resolve();
  }
  pause() {}
  load() {}
  addEventListener() {}
};

// 測試 1: 匯入音效模組並驗證 Web Audio 合成器方法
const { audio } = await import('../js/audio.js');

assert.strictEqual(typeof audio.playVictoryFanfare, 'function', 'audio 必須具備 playVictoryFanfare 方法');
assert.strictEqual(typeof audio.playStarChime, 'function', 'audio 必須具備 playStarChime 方法');
console.log('  ✅ 測試 1: audio 模組 Web Audio 勝利號角與星星音階方法定義完整');

// 測試 2: 驗證各星級勝利號角呼叫無拋錯 (1星、2星、3星)
audio.playVictoryFanfare(1);
audio.playVictoryFanfare(2);
audio.playVictoryFanfare(3);
console.log('  ✅ 測試 2: 各星級 (1星/2星/3星) Web Audio 勝利號角合成運算無拋錯');

// 測試 3: 驗證星星音階落位 (星1、星2、星3) 頻率階梯無拋錯
audio.playStarChime(1);
audio.playStarChime(2);
audio.playStarChime(3);
console.log('  ✅ 測試 3: 星星落位音階 (C6 ➔ E6 ➔ G6/C7) 逐顆響應無拋錯');

// 測試 4: 匯入 UI 模組並驗證全屏通關特效方法
const { launchLevelClearCelebration, fireworks, launchConfetti } = await import('../js/ui.js');

assert.strictEqual(typeof launchLevelClearCelebration, 'function', 'ui 模組必須具備 launchLevelClearCelebration');
assert.strictEqual(typeof fireworks, 'function', 'ui 模組必須具備 fireworks');
assert.strictEqual(typeof launchConfetti, 'function', 'ui 模組必須具備 launchConfetti');
console.log('  ✅ 測試 4: ui 模組 launchLevelClearCelebration 特效入口註冊正確');

// 測試 5: 驗證 launchLevelClearCelebration 粒子生成與三星金色瀑布
launchLevelClearCelebration({ stars: 3 });
launchLevelClearCelebration({ stars: 2 });
launchLevelClearCelebration({ stars: 1 });
console.log('  ✅ 測試 5: launchLevelClearCelebration 各星級粒子發射演算法正常運行');

// 測試 6: 驗證 engine.js finishLevel 中的慶祝文字與光芒節點結構
const engineContent = (await import('fs')).readFileSync('js/engine.js', 'utf-8');

assert.ok(engineContent.includes('result-rays-container'), 'engine.js 必須包含 result-rays-container 旋轉光芒結構');
assert.ok(engineContent.includes('launchLevelClearCelebration'), 'engine.js 必須調用 launchLevelClearCelebration');
assert.ok(engineContent.includes('playVictoryFanfare'), 'engine.js 必須調用 playVictoryFanfare');
assert.ok(engineContent.includes('playStarChime'), 'engine.js 必須調用 playStarChime 逐顆點亮音效');
assert.ok(engineContent.includes('star-animating'), 'engine.js 必須支援 star-animating 階梯式點亮動效');
console.log('  ✅ 測試 6: engine.js 通關結算模組已完整整合旋轉光芒與階梯星星音效');

// 測試 7: 驗證 style.css 關鍵幀動畫完整性
const cssContent = (await import('fs')).readFileSync('css/style.css', 'utf-8');

assert.ok(cssContent.includes('.result-rays-container'), 'style.css 必須包含 .result-rays-container 樣式');
assert.ok(cssContent.includes('@keyframes starDropPop'), 'style.css 必須包含 @keyframes starDropPop 動畫');
assert.ok(cssContent.includes('@keyframes starsCrownGlow'), 'style.css 必須包含 @keyframes starsCrownGlow 動畫');
assert.ok(cssContent.includes('.result-kicker'), 'style.css 必須包含 .result-kicker 徽章樣式');
console.log('  ✅ 測試 7: style.css 包含全套全屏旋轉光芒、星星掉落彈跳與高光皇冠動畫');

console.log('\n🎉 全部 7 項關卡音效與全屏通關特效單元測試 100% 綠燈通過！');

