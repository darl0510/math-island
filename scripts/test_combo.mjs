import assert from 'node:assert/strict';

class MockAudio {
  constructor() {
    this.paused = true;
    this.ended = true;
  }
  play() { return Promise.resolve(); }
  pause() {}
}
globalThis.Audio = MockAudio;

const elements = new Map();
const createdElements = [];

class MockElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    const set = new Set();
    this.classList = {
      add: (c) => set.add(c),
      remove: (c) => set.delete(c),
      contains: (c) => set.has(c),
    };
    this.attributes = new Map();
    this.style = {
      setProperty: (k, v) => { this.style[k] = v; },
    };
    this.innerHTML = '';
    this.textContent = '';
    this.children = [];
    this._offsetWidth = 100;
  }
  get offsetWidth() { return this._offsetWidth; }
  setAttribute(k, v) { this.attributes.set(k, v); }
  getAttribute(k) { return this.attributes.get(k); }
  getBoundingClientRect() {
    return { left: 200, top: 300, width: 120, height: 48, right: 320, bottom: 348 };
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  querySelector(sel) {
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      return this.children.find(c => c.className && c.className.includes(cls)) || null;
    }
    return null;
  }
  remove() {
    const idx = createdElements.indexOf(this);
    if (idx !== -1) createdElements.splice(idx, 1);
  }
}

globalThis.window = {
  innerWidth: 1024,
  innerHeight: 768,
  speechSynthesis: {
    cancel() {},
    getVoices() { return []; },
    addEventListener() {},
  },
  addEventListener() {},
  removeEventListener() {},
};

globalThis.document = {
  body: new MockElement('body'),
  querySelector(sel) {
    if (sel === '.question-stage') return new MockElement('div');
    if (sel === '.level-topbar') return new MockElement('div');
    return null;
  },
  querySelectorAll(sel) {
    if (sel === '.floating-score-badge') {
      return createdElements.filter(e => e.className && e.className.includes('floating-score-badge'));
    }
    return [];
  },
  createElement(tag) {
    const el = new MockElement(tag);
    createdElements.push(el);
    return el;
  },
  getElementById(id) {
    return elements.get(id) || null;
  },
};

globalThis.localStorage = {
  getItem() { return null; },
  setItem() {},
};

const {
  createComboState,
  onCorrect,
  onWrong,
  comboSummaryMarkup,
  getComboTiers,
  calculateQuestionScore,
  spawnFloatingScore,
  updateScoreDisplay,
  clearFloatingScores
} = await import('../js/combo.js');

console.log('🧪 開始 Combo 激勵系統與得分飛字動效單元測試...');

// 測試 1: 初始狀態
const session = { combo: createComboState(), scorePoints: 0 };
assert.equal(session.combo.count, 0, '初始 count 應為 0');
assert.equal(session.combo.maxCombo, 0, '初始 maxCombo 應為 0');
assert.equal(session.combo.active, false, '初始 active 應為 false');
console.log('  ✅ 測試 1: Combo 初始狀態驗證通過');

// 測試 2: 答對 1 題（未達 tier 2）
let tier = onCorrect(session);
assert.equal(session.combo.count, 1);
assert.equal(session.combo.maxCombo, 1);
assert.equal(tier, null, '答對 1 題不應觸發 tier');
console.log('  ✅ 測試 2: 答對 1 題未觸發 tier 驗證通過');

// 測試 3: 答對第 2 題（觸發 Combo ×2）
tier = onCorrect(session);
assert.equal(session.combo.count, 2);
assert.equal(session.combo.maxCombo, 2);
assert.ok(tier, '應觸發 tier');
assert.equal(tier.threshold, 2);
assert.equal(tier.label, '🔥 Combo ×2');
assert.equal(tier.sfx, 'correct');
console.log('  ✅ 測試 3: 答對 2 題觸發 Combo ×2 驗證通過');

// 測試 4: 連續答對至 5 題（觸發 Combo ×3 與 Combo ×5）
const t3 = onCorrect(session); // count = 3
assert.equal(t3.threshold, 3);
assert.equal(t3.label, '🔥🔥 Combo ×3');
assert.equal(t3.sfx, 'levelup');

const t4 = onCorrect(session); // count = 4
assert.equal(t4, null, 'count=4 無新階梯');

const t5 = onCorrect(session); // count = 5
assert.equal(t5.threshold, 5);
assert.equal(t5.label, '🌟 Combo ×5');
assert.equal(session.combo.maxCombo, 5);
console.log('  ✅ 測試 4: 連續答對推進至 Combo ×5 階梯驗證通過');

// 測試 5: 答錯中斷 Combo
const breakInfo = onWrong(session);
assert.ok(breakInfo, '有 combo 答錯應回傳中斷提示');
assert.equal(breakInfo.lostCount, 5, 'lostCount 應為 5');
assert.equal(session.combo.count, 0, '答錯後 count 歸零');
assert.equal(session.combo.active, false, '答錯後 active 為 false');
assert.equal(session.combo.maxCombo, 5, 'maxCombo 應保留為 5');
console.log('  ✅ 測試 5: Combo 中斷與 maxCombo 保留驗證通過');

// 測試 6: 關卡結算摘要 HTML
const summaryHtml = comboSummaryMarkup(session);
assert.ok(summaryHtml.includes('×5'), '摘要應包含最高紀錄 ×5');
assert.ok(summaryHtml.includes('Combo ×5'), '即使中斷後結算仍應顯示最高達到之 Combo ×5 階梯');
assert.ok(summaryHtml.includes('result-combo-summary'), '包含結果摘要容器樣式');
console.log('  ✅ 測試 6: 關卡結算 comboSummaryMarkup 階梯保留驗證通過');

// 測試 7: 答錯中斷無 combo 時
const emptySession = { combo: createComboState() };
const emptyBreak = onWrong(emptySession);
assert.equal(emptyBreak, null, 'count < 2 答錯不應顯示中斷 toast');
assert.equal(comboSummaryMarkup(emptySession), '', '無 combo 結算不應產生 HTML');
console.log('  ✅ 測試 7: 無 Combo 時靜默處理驗證通過');

// 測試 8: 得分計算函式 calculateQuestionScore 各階梯加成
const s0 = calculateQuestionScore(0);
assert.equal(s0.base, 100);
assert.equal(s0.bonus, 0);
assert.equal(s0.total, 100);

const s1 = calculateQuestionScore(1);
assert.equal(s1.total, 100);
assert.equal(s1.bonus, 0);

const s2 = calculateQuestionScore(2);
assert.equal(s2.bonus, 20);
assert.equal(s2.total, 120);

const s3 = calculateQuestionScore(3);
assert.equal(s3.bonus, 30);
assert.equal(s3.total, 130);

const s5 = calculateQuestionScore(5);
assert.equal(s5.bonus, 50);
assert.equal(s5.total, 150);

const s8 = calculateQuestionScore(8);
assert.equal(s8.bonus, 80);
assert.equal(s8.total, 180);

const s12 = calculateQuestionScore(12);
assert.equal(s12.bonus, 100);
assert.equal(s12.total, 200);
console.log('  ✅ 測試 8: calculateQuestionScore 各階梯得分與 Combo 加成計算驗證通過');

// 測試 9: spawnFloatingScore 生成飛字徽章
const dummyButton = new MockElement('button');
const scoreResult = calculateQuestionScore(3);
const badge = spawnFloatingScore(dummyButton, scoreResult);
assert.ok(badge, '應生成飛字 badge');
assert.ok(badge.className.includes('floating-score-badge'), '應帶有 floating-score-badge 樣式');
assert.ok(badge.className.includes('has-bonus'), '帶加成應有 has-bonus');
assert.ok(badge.innerHTML.includes('130'), '應包含計算後之總分 130');
assert.ok(badge.innerHTML.includes('score-plus'), '應包含加號');
assert.ok(badge.innerHTML.includes('Combo ×3 +30'), '應包含 Combo 加成膠囊標籤');
console.log('  ✅ 測試 9: spawnFloatingScore 飛字動效元素渲染驗證通過');

// 測試 10: updateScoreDisplay 與 clearFloatingScores 清理
const mockChip = new MockElement('div');
mockChip.id = 'level-score-chip';
const valChild = new MockElement('span');
valChild.className = 'score-val';
mockChip.children.push(valChild);
mockChip.querySelector = (sel) => sel === '.score-val' ? valChild : null;
elements.set('level-score-chip', mockChip);

session.scorePoints = 350;
updateScoreDisplay(session, 130);
assert.equal(valChild.textContent, '350', '頂部記分板應即時更新為 350 分');
assert.ok(mockChip.classList.contains('score-bump'), '記分板應觸發 score-bump 彈跳動效');

clearFloatingScores();
const remaining = document.querySelectorAll('.floating-score-badge');
assert.equal(remaining.length, 0, '清理後畫面不應殘留飛字元素');
console.log('  ✅ 測試 10: updateScoreDisplay 即時記分聯動與 clearFloatingScores 清理驗證通過');

console.log('\n🎉 全部 10 項 Combo 激勵與得分飛字動效測試 100% 綠燈通過！');
