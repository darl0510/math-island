// scripts/test_dual_storage_sync.mjs
// 小學跨年級成果綜合數據同步與雲端本地雙軌匯出單元測試 (v3.0.2)

class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
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
  get length() {
    return Object.keys(this.store).length;
  }
  key(index) {
    return Object.keys(this.store)[index] || null;
  }
}

globalThis.localStorage = new LocalStorageMock();

// Mock IndexedDB for Node.js
class FakeIDBStore {
  constructor(keyPath) {
    this.keyPath = keyPath;
    this.data = new Map();
  }
  put(item) {
    const key = item[this.keyPath];
    this.data.set(key, item);
  }
  get(key) {
    const res = this.data.get(key) || null;
    const req = { result: res, onsuccess: null, onerror: null };
    setTimeout(() => req.onsuccess && req.onsuccess(), 0);
    return req;
  }
  getAll() {
    const res = Array.from(this.data.values());
    const req = { result: res, onsuccess: null, onerror: null };
    setTimeout(() => req.onsuccess && req.onsuccess(), 0);
    return req;
  }
  delete(key) {
    this.data.delete(key);
  }
  createIndex() {}
}

class FakeIDBDatabase {
  constructor(name) {
    this.name = name;
    this.objectStoreNames = {
      contains: (sName) => this.stores.has(sName),
    };
    this.stores = new Map();
  }
  createObjectStore(name, options) {
    const store = new FakeIDBStore(options.keyPath);
    this.stores.set(name, store);
    return store;
  }
  transaction(storeNames) {
    const db = this;
    const tx = {
      objectStore: (sName) => db.stores.get(sName),
      oncomplete: null,
      onerror: null,
    };
    setTimeout(() => tx.oncomplete && tx.oncomplete(), 5);
    return tx;
  }
}

const fakeDBInstance = new FakeIDBDatabase('FantasyIslandDualStorage');

globalThis.indexedDB = {
  open: (name, version) => {
    const req = {
      result: fakeDBInstance,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };
    setTimeout(() => {
      if (req.onupgradeneeded) {
        req.onupgradeneeded({ target: { result: fakeDBInstance } });
      }
      if (req.onsuccess) {
        req.onsuccess({ target: { result: fakeDBInstance } });
      }
    }, 5);
    return req;
  },
};

// 引入受測模組
const stateMod = await import('../js/state.js');
const storageSyncMod = await import('../js/storage-sync.js');

console.log('🚀 開始小學跨年級成果綜合數據同步與雲端本地雙軌匯出單元測試 (v3.0.2)...\n');

let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    failedTests++;
  }
}

// 測試 1: 初始綜合數據與空狀態評級
console.log('--- 測試 1: 初始全科跨年級成果綜合數據聚合 ---');
globalThis.localStorage.clear();
const initialSummary = storageSyncMod.getCrossGradeSummary();
assert(initialSummary.totalStars === 0, '初始總星數為 0');
assert(initialSummary.completedLevels === 0, '初始總通關數為 0');
assert(initialSummary.overallPercentage === 0, '初始達成率為 0%');
assert(initialSummary.masteryRank.title === '島嶼探索見習生', '初始頭銜為「島嶼探索見習生」');
assert(initialSummary.grades[1] && initialSummary.grades[2] && initialSummary.grades[3], '涵蓋小一、小二、小三三大年級容器');
assert(Object.keys(initialSummary.subjects).length >= 5, '涵蓋各大獨立學科 (math, english, chinese, science, social)');

// 測試 2: 跨年級、跨學科進度寫入與綜合成果即時計算
console.log('\n--- 測試 2: 跨年級、跨學科進度記帳與綜合數據聚合 ---');
// 小一 數學: 第 1 關 3 星、第 2 關 2 星
stateMod.setCurrentSubject('math');
stateMod.setCurrentGrade(1);
stateMod.completeLevel(1, 3, 6);
stateMod.completeLevel(2, 2, 5);

// 小二 英文: 第 1 關 3 星
stateMod.setCurrentSubject('english');
stateMod.setCurrentGrade(2);
stateMod.completeLevel(1, 3, 6);

// 小三 國語: 第 1 關 3 星、第 2 關 3 星
stateMod.setCurrentSubject('chinese');
stateMod.setCurrentGrade(3);
stateMod.completeLevel(1, 3, 6);
stateMod.completeLevel(2, 3, 6);

// 小一 自然: 第 1 關 3 星
stateMod.setCurrentSubject('science');
stateMod.setCurrentGrade(1);
stateMod.completeLevel(1, 3, 6);

// 小二 社會: 第 1 關 2 星
stateMod.setCurrentSubject('social');
stateMod.setCurrentGrade(2);
stateMod.completeLevel(1, 2, 5);

// 小三 綜合挑戰: 第 1 關 3 星
stateMod.setCurrentSubject('challenge');
stateMod.setCurrentGrade(3);
stateMod.completeLevel(1, 3, 6);

const progressSummary = storageSyncMod.getCrossGradeSummary({ name: '小勇士測試員', avatar: '🦁' });
const expectedTotalStars = 3 + 2 + 3 + 3 + 3 + 3 + 2 + 3; // 22
const expectedCompletedLevels = 8;

assert(progressSummary.totalStars === expectedTotalStars, `總星數累計精準 (${progressSummary.totalStars} === ${expectedTotalStars})`);
assert(progressSummary.completedLevels === expectedCompletedLevels, `通關數累計精準 (${progressSummary.completedLevels} === ${expectedCompletedLevels})`);
assert(progressSummary.grades[1].totalStars === 8, `小一年級累計 8 星 (實際: ${progressSummary.grades[1].totalStars})`);
assert(progressSummary.grades[2].totalStars === 5, `小二年級累計 5 星 (實際: ${progressSummary.grades[2].totalStars})`);
assert(progressSummary.grades[3].totalStars === 9, `小三年級累計 9 星 (實際: ${progressSummary.grades[3].totalStars})`);
assert(progressSummary.subjects.math.totalStars === 5, `數學科累計 5 星 (實際: ${progressSummary.subjects.math.totalStars})`);
assert(progressSummary.subjects.chinese.totalStars === 6, `國語科累計 6 星 (實際: ${progressSummary.subjects.chinese.totalStars})`);
assert(progressSummary.subjects.challenge.totalStars === 3, `綜合挑戰科累計 3 星 (實際: ${progressSummary.subjects.challenge.totalStars})`);

// 測試 3: 跨設備全量 JSON 匯出備份封包結構
console.log('\n--- 測試 3: 跨設備全量 JSON 備份封包格式與數據完整性 ---');
const backupPacket = storageSyncMod.createComprehensiveBackup({ id: 'kid_test_01', name: '小阿星', avatar: '🦄' });
assert(backupPacket.app === 'fantasy-island-adventure', '備份標識符包含正確 app ID');
assert(backupPacket.schemaVersion === '3.0.2', '備份版本號標註為 3.0.2');
assert(backupPacket.exportType === 'dual_track_full_backup', '標記為 dual_track_full_backup');
assert(backupPacket.student.name === '小阿星', '正確保留學童姓名小阿星');
assert(backupPacket.summary.totalStars === expectedTotalStars, '備份包內嵌最新跨年級成果摘要');
assert(Object.keys(backupPacket.progress).length >= 18, `涵蓋 6 科 x 3 年級 = 18 組獨立 storage key (實際: ${Object.keys(backupPacket.progress).length})`);
assert(backupPacket.progress[stateMod.getStorageKey(1, 'math')].stars[1] === 3, '數學 G1 第 1 關進度保留');
assert(backupPacket.progress[stateMod.getStorageKey(3, 'challenge')].stars[1] === 3, '挑戰 G3 第 1 關進度保留');

// 測試 4: 備份校驗與預覽 (parseAndValidateBackup)
console.log('\n--- 測試 4: 備份資料校驗與預覽器 ---');
const validValidation = storageSyncMod.parseAndValidateBackup(backupPacket);
assert(validValidation.valid === true, '合規備份封包驗證通過');
assert(validValidation.preview.studentName === '小阿星', '預覽器正確解析學童姓名');
assert(validValidation.preview.totalStars === expectedTotalStars, `預覽器正確統計總星數 (${validValidation.preview.totalStars})`);
assert(validValidation.preview.totalLevels === expectedCompletedLevels, `預覽器正確統計通關數 (${validValidation.preview.totalLevels})`);

const invalidValidation = storageSyncMod.parseAndValidateBackup({ bad: 'data' });
assert(invalidValidation.valid === false, '損毀或偽造備份正確被攔截');
assert(typeof invalidValidation.error === 'string', '提供明確之錯誤說明');

// 測試 5: 跨設備 JSON 匯入與「智慧合併 (merge)」模式
console.log('\n--- 測試 5: 跨設備 JSON 匯入與「智慧合併」無損升級 ---');
// 模擬外來設備的備份 (小阿星在另一台平板玩了數學 G1 第 1 關拿 2 星、第 3 關拿 3 星)
const incomingPacket = {
  app: 'fantasy-island-adventure',
  schemaVersion: '3.0.2',
  student: { id: 'kid_test_01', name: '小阿星', avatar: '🦄' },
  progress: {
    [stateMod.getStorageKey(1, 'math')]: {
      unlocked: 4,
      stars: { 1: 2, 3: 3 }, // 第 1 關 2 星 (本機已有 3 星，合併應保留本機 3 星)，第 3 關 3 星 (本機沒有，合併應新增)
      best: { 1: 4, 3: 6 },
      playedLevels: [1, 3],
      totalCorrect: 10,
    },
    [stateMod.getStorageKey(2, 'science')]: {
      unlocked: 2,
      stars: { 1: 3 },
      best: { 1: 6 },
      playedLevels: [1],
      totalCorrect: 6,
    },
  },
  records: [
    { id: 'rec_incoming_01', student_id: 'kid_test_01', subject: 'math', grade: 1, level_id: 3, stars: 3, score: 300, timestamp: '2026-10-30T10:00:00' },
  ],
};

const mergeResult = await storageSyncMod.applyComprehensiveBackup(incomingPacket, 'merge');
assert(mergeResult.success === true, '智慧合併匯入成功');

// 檢驗本機數學 G1 狀態：第 1 關應取 Max(3, 2) = 3 星；第 2 關本機的 2 星應保留；第 3 關應新增 3 星
stateMod.setCurrentSubject('math');
stateMod.setCurrentGrade(1);
const mergedMathState = stateMod.getState();
assert(mergedMathState.stars[1] === 3, '第 1 關取 Max 保留 3 星');
assert(mergedMathState.stars[2] === 2, '第 2 關原有 2 星未被洗掉');
assert(mergedMathState.stars[3] === 3, '第 3 關成功無損合併進來');
assert(mergedMathState.unlocked >= 4, '解鎖關卡推進至 4 關以上');
assert(mergedMathState.playedLevels.includes(2) && mergedMathState.playedLevels.includes(3), '通關關卡聯集完整保留');

// 檢驗對戰記錄是否成功合併
const localRecords = JSON.parse(globalThis.localStorage.getItem('fantasy_math_admin_records') || '[]');
assert(localRecords.some((r) => r.id === 'rec_incoming_01'), '外來對戰紀錄成功寫入本地記錄庫');

// 測試 6: 跨設備 JSON 匯入與「完整覆蓋 (overwrite)」模式
console.log('\n--- 測試 6: 跨設備 JSON 匯入與「完整覆蓋」模式 ---');
const cleanSlatePacket = {
  app: 'fantasy-island-adventure',
  schemaVersion: '3.0.2',
  student: { id: 'kid_new_02', name: '新轉學生小波', avatar: '🐼' },
  progress: {
    [stateMod.getStorageKey(1, 'math')]: {
      unlocked: 2,
      stars: { 1: 1 },
      best: { 1: 3 },
      playedLevels: [1],
      totalCorrect: 3,
    },
  },
  records: [],
};

const overwriteResult = await storageSyncMod.applyComprehensiveBackup(cleanSlatePacket, 'overwrite');
assert(overwriteResult.success === true, '完整覆蓋匯入成功');
stateMod.setCurrentSubject('math');
stateMod.setCurrentGrade(1);
const overwritedMathState = stateMod.getState();
assert(overwritedMathState.stars[1] === 1, '第 1 關被覆蓋為 1 星');
assert(overwritedMathState.stars[2] === undefined, '第 2 關依覆蓋規則被清除');

// 測試 7: 本地雙軌持久化 (LocalStorage ✕ IndexedDB) 鏡像與自愈
console.log('\n--- 測試 7: 本地雙軌存儲鏡像與自愈自律機制 ---');
// 1. 寫入一個進度至 IndexedDB
const idbKey = stateMod.getStorageKey(3, 'science');
const idbSample = {
  unlocked: 3,
  stars: { 1: 3, 2: 3 },
  best: { 1: 6, 2: 6 },
  playedLevels: [1, 2],
  totalCorrect: 12,
};
await storageSyncMod.idbSaveProgress(idbKey, idbSample);

// 2. 模擬 LocalStorage 該 key 遭清除 (使用者手動清除或無痕快取遺失)
globalThis.localStorage.removeItem(idbKey);
assert(globalThis.localStorage.getItem(idbKey) === null, '模擬 LocalStorage 節點遺失');

// 3. 觸發雙軌自愈機制
const healResult = await storageSyncMod.initDualTierStorage();
assert(healResult.healed >= 1, `自愈機制成功偵測並還原 ${healResult.healed} 個遺失節點`);

const restoredFromIDB = JSON.parse(globalThis.localStorage.getItem(idbKey) || '{}');
assert(restoredFromIDB.stars && restoredFromIDB.stars[1] === 3 && restoredFromIDB.stars[2] === 3, 'LocalStorage 成功自 IndexedDB 鏡像完整自愈還原！');

// 測試 8: 歷史備份快照與自動修剪
console.log('\n--- 測試 8: IndexedDB 快照庫保存與自動修剪 (上限 10 份) ---');
for (let i = 1; i <= 12; i++) {
  await storageSyncMod.idbSaveBackupSnapshot({ index: i, time: Date.now() }, `第 ${i} 次自動存檔`);
}
const snapshotList = await storageSyncMod.idbListBackupSnapshots();
assert(snapshotList.length <= 10, `快照庫成功自律修剪至 10 份以內 (實際: ${snapshotList.length})`);

console.log('\n=============================================');
if (failedTests === 0) {
  console.log('🎉 雙軌存儲與跨年級成果綜合數據同步全量單元測試 100% 綠燈通過！');
  process.exit(0);
} else {
  console.error(`❌ 有 ${failedTests} 項測試失敗，請檢查！`);
  process.exit(1);
}

