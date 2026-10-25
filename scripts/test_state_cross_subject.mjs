// scripts/test_state_cross_subject.mjs
// 跨科目進度持久化與 144 關聯動單元測試

// 建立 LocalStorage Mock
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new LocalStorageMock();

// 動態引入 state.js
const stateMod = await import('../js/state.js');

console.log('🚀 開始跨科目進度持久化與 144 關單元測試...');

let errors = [];

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [ASSERT FAIL] ${message}`);
    errors.push(message);
  } else {
    console.log(`  ✅ ${message}`);
  }
}

// 測試 1: 驗證初始全科目匯總
console.log('\n--- 測試 1: 初始全科目匯總 (144 關 / 432 星上限) ---');
const initialSummary = stateMod.getAllSubjectsSummary();
assert(initialSummary.totalStars === 0, `初始總星星數為 0 (實際: ${initialSummary.totalStars})`);
assert(initialSummary.maxTotalStars === 432, `全科最大星星數為 432 (實際: ${initialSummary.maxTotalStars})`);
assert(initialSummary.completedLevels === 0, `初始完成關數為 0 (實際: ${initialSummary.completedLevels})`);
assert(initialSummary.maxTotalLevels === 144, `全科最大關卡數為 144 (實際: ${initialSummary.maxTotalLevels})`);
assert(Object.keys(initialSummary.subjects).length === 3, '包含 3 大科目 (math, english, chinese)');

// 測試 2: 跨科目存儲完全隔離性
console.log('\n--- 測試 2: 跨科目存儲隔離性 (math, english, chinese) ---');
// 數學 G1 過第 1 關拿 3 星
stateMod.setCurrentSubject('math');
stateMod.setCurrentGrade(1);
stateMod.completeLevel(1, 3, 6);

// 英文 G2 過第 2 關拿 2 星
stateMod.setCurrentSubject('english');
stateMod.setCurrentGrade(2);
stateMod.completeLevel(2, 2, 5);

// 國語 G3 過第 3 關拿 3 星
stateMod.setCurrentSubject('chinese');
stateMod.setCurrentGrade(3);
stateMod.completeLevel(3, 3, 6);

// 切回數學 G1 檢查
stateMod.setCurrentSubject('math');
stateMod.setCurrentGrade(1);
const mathG1State = stateMod.getState();
assert(mathG1State.stars[1] === 3, '數學 G1 第 1 關星數為 3');
assert(!mathG1State.stars[2], '數學 G1 第 2 關未被英文污染');
assert(!mathG1State.stars[3], '數學 G1 第 3 關未被國語污染');

// 切到英文 G2 檢查
stateMod.setCurrentSubject('english');
stateMod.setCurrentGrade(2);
const enG2State = stateMod.getState();
assert(enG2State.stars[2] === 2, '英文 G2 第 2 關星數為 2');
assert(!enG2State.stars[1], '英文 G2 第 1 關未受干擾');

// 切到國語 G3 檢查
stateMod.setCurrentSubject('chinese');
stateMod.setCurrentGrade(3);
const chG3State = stateMod.getState();
assert(chG3State.stars[3] === 3, '國語 G3 第 3 關星數為 3');

// 測試 3: 全科目匯總正確加總
console.log('\n--- 測試 3: 全科目即時匯總加總 ---');
const summaryAfter = stateMod.getAllSubjectsSummary();
assert(summaryAfter.totalStars === (3 + 2 + 3), `全科星數總計應為 8 (實際: ${summaryAfter.totalStars})`);
assert(summaryAfter.completedLevels === 3, `全科通關數總計應為 3 (實際: ${summaryAfter.completedLevels})`);
assert(summaryAfter.subjects.math.totalStars === 3, '數學科累積 3 星');
assert(summaryAfter.subjects.english.totalStars === 2, '英文科累積 2 星');
assert(summaryAfter.subjects.chinese.totalStars === 3, '國語科累積 3 星');

// 測試 4: 匯出與匯入功能
console.log('\n--- 測試 4: 跨科目進度導出 (Backup) 與導入 (Restore) ---');
const backup = stateMod.exportAllProgress();
assert(backup.schemaVersion === '2.4.4', '導出資料包含正確 schemaVersion');
assert(Object.keys(backup.progress).length === 9, '導出包含全科 9 組獨立 storage key');

// 清空 localStorage 並驗證清空
globalThis.localStorage.clear();
stateMod.setCurrentSubject('math');
stateMod.setCurrentGrade(1);
assert(stateMod.getState().stars[1] === undefined, '清空後數學 G1 進度已歸零');

// 匯入備份
const importResult = stateMod.importAllProgress(backup);
assert(importResult.success === true, '進度還原成功');
assert(importResult.importedCount === 9, '成功導入 9 組科目年級進度');

// 驗證還原後的資料
stateMod.setCurrentSubject('math');
stateMod.setCurrentGrade(1);
assert(stateMod.getState().stars[1] === 3, '還原後數學 G1 第 1 關仍為 3 星');

stateMod.setCurrentSubject('chinese');
stateMod.setCurrentGrade(3);
assert(stateMod.getState().stars[3] === 3, '還原後國語 G3 第 3 關仍為 3 星');

// 測試 5: 髒資料自動修復 (Sanitization & Resilience)
console.log('\n--- 測試 5: 異常資料自我修復 (Sanitization) ---');
const dirtyKey = stateMod.getStorageKey(1, 'math');
globalThis.localStorage.setItem(dirtyKey, JSON.stringify({
  unlocked: 999, // 超出 16 關
  stars: { '1': 10, '2': 0, 'abc': 3, '5': 2 }, // 包含無效關卡與無效星數
  playedLevels: [-1, 2, '99', 5, 5],
  totalCorrect: -50
}));

stateMod.setCurrentSubject('math');
stateMod.setCurrentGrade(1);
const sanitized = stateMod.getState();
assert(sanitized.unlocked === 16, `超出範圍的 unlocked 自動修復為 16 (實際: ${sanitized.unlocked})`);
assert(sanitized.stars[5] === 2, '合法星數 (第 5 關 2 星) 保留');
assert(!sanitized.stars['1'], '不合法星數 10 已被過濾');
assert(!sanitized.stars['abc'], '非數字關卡鍵名已被過濾');
assert(sanitized.totalCorrect === 0, '負數 totalCorrect 自動校正為 0');

console.log('\n=============================================');
if (errors.length === 0) {
  console.log('🎉 所有跨科目持久化單元測試全部 PASS！');
} else {
  console.error(`❌ 共有 ${errors.length} 項測試失敗！`);
  process.exit(1);
}
