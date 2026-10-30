/**
 * js/storage-sync.js
 * 奇幻數學島 - 小學跨年級成果綜合數據同步與雲端本地雙軌匯出模組 (v3.0.2)
 * 支援：
 * 1. 本地雙軌存儲持久化 (Tier 1: LocalStorage + Tier 2: IndexedDB 非揮發性自愈鏡像)
 * 2. 小學跨年級 (G1~G3) 全學科成果綜合數據統計與全能頭銜榮譽系統
 * 3. 跨設備全量 JSON 匯出備份 (一鍵下載 + IndexedDB 自動快照留底)
 * 4. 跨設備 JSON 匯入與安全雙軌恢復 (支援「智慧合併」與「完整覆蓋」雙模式與匯入預覽)
 * 5. 雲端後台 (/api/sync_progress) 與本地雙軌無縫對接
 */

import { SUBJECTS, DEFAULT_SUBJECT } from './subjects.js';
import { getStorageKey, createDefaultState, getCurrentGrade, getCurrentSubject, getState, setCurrentGrade, setCurrentSubject } from './state.js';

export const DUAL_STORAGE_CONFIG = {
  DB_NAME: 'FantasyIslandDualStorage',
  DB_VERSION: 1,
  STORE_PROGRESS: 'progress',
  STORE_BACKUPS: 'backups',
  STORE_META: 'metadata',
  SCHEMA_VERSION: '3.0.2',
  MAX_BACKUP_SNAPSHOTS: 10,
};

const STORAGE_KEY_STUDENTS = 'fantasy_math_students_cache';
const STORAGE_KEY_CURRENT_STUDENT = 'fantasy_math_current_student';
const STORAGE_KEY_RECORDS = 'fantasy_math_admin_records';
const STORAGE_KEY_PENDING = 'fantasy_math_pending_records';

let idbPromise = null;

/**
 * 取得或初始化 IndexedDB 連線 (Promise 包裝)
 */
export function openIndexedDB() {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (idbPromise) return idbPromise;

  idbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DUAL_STORAGE_CONFIG.DB_NAME, DUAL_STORAGE_CONFIG.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(DUAL_STORAGE_CONFIG.STORE_PROGRESS)) {
          db.createObjectStore(DUAL_STORAGE_CONFIG.STORE_PROGRESS, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(DUAL_STORAGE_CONFIG.STORE_BACKUPS)) {
          const backupStore = db.createObjectStore(DUAL_STORAGE_CONFIG.STORE_BACKUPS, { keyPath: 'id' });
          backupStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains(DUAL_STORAGE_CONFIG.STORE_META)) {
          db.createObjectStore(DUAL_STORAGE_CONFIG.STORE_META, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (err) => {
        console.warn('[DualStorage] IndexedDB 開啟失敗，平滑降級為純 LocalStorage:', err);
        resolve(null);
      };
    } catch (e) {
      console.warn('[DualStorage] IndexedDB 初始化異常:', e);
      resolve(null);
    }
  });

  return idbPromise;
}

/**
 * 寫入單一進度至 IndexedDB
 */
export async function idbSaveProgress(key, data) {
  try {
    const db = await openIndexedDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction([DUAL_STORAGE_CONFIG.STORE_PROGRESS], 'readwrite');
      const store = tx.objectStore(DUAL_STORAGE_CONFIG.STORE_PROGRESS);
      store.put({
        key,
        data,
        updatedAt: new Date().toISOString(),
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

/**
 * 從 IndexedDB 讀取單一進度
 */
export async function idbGetProgress(key) {
  try {
    const db = await openIndexedDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction([DUAL_STORAGE_CONFIG.STORE_PROGRESS], 'readonly');
      const store = tx.objectStore(DUAL_STORAGE_CONFIG.STORE_PROGRESS);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

/**
 * 取得 IndexedDB 中儲存的所有進度鍵值
 */
export async function idbGetAllProgress() {
  try {
    const db = await openIndexedDB();
    if (!db) return {};
    return new Promise((resolve) => {
      const tx = db.transaction([DUAL_STORAGE_CONFIG.STORE_PROGRESS], 'readonly');
      const store = tx.objectStore(DUAL_STORAGE_CONFIG.STORE_PROGRESS);
      const req = store.getAll();
      req.onsuccess = () => {
        const result = {};
        (req.result || []).forEach((item) => {
          if (item && item.key) result[item.key] = item.data;
        });
        resolve(result);
      };
      req.onerror = () => resolve({});
    });
  } catch (e) {
    return {};
  }
}

/**
 * 儲存完整備份快照至 IndexedDB 快照庫 (自動修剪保留最近 10 份)
 */
export async function idbSaveBackupSnapshot(backupData, label = '手動備份') {
  try {
    const db = await openIndexedDB();
    if (!db) return null;
    const snapshotId = `backup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const snapshot = {
      id: snapshotId,
      label,
      timestamp: new Date().toISOString(),
      data: backupData,
    };

    return new Promise((resolve) => {
      const tx = db.transaction([DUAL_STORAGE_CONFIG.STORE_BACKUPS], 'readwrite');
      const store = tx.objectStore(DUAL_STORAGE_CONFIG.STORE_BACKUPS);
      store.put(snapshot);

      // 自動修剪
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        if (list.length > DUAL_STORAGE_CONFIG.MAX_BACKUP_SNAPSHOTS) {
          list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          const toRemove = list.slice(0, list.length - DUAL_STORAGE_CONFIG.MAX_BACKUP_SNAPSHOTS);
          toRemove.forEach((item) => store.delete(item.id));
        }
      };

      tx.oncomplete = () => resolve(snapshotId);
      tx.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

/**
 * 列出 IndexedDB 儲存的歷史備份快照
 */
export async function idbListBackupSnapshots() {
  try {
    const db = await openIndexedDB();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction([DUAL_STORAGE_CONFIG.STORE_BACKUPS], 'readonly');
      const store = tx.objectStore(DUAL_STORAGE_CONFIG.STORE_BACKUPS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []).map((item) => ({
          id: item.id,
          label: item.label,
          timestamp: item.timestamp,
          studentName: item.data?.student?.name || '冒險小勇士',
          totalStars: item.data?.summary?.totalStars || 0,
          completedLevels: item.data?.summary?.completedLevels || 0,
        }));
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

/**
 * 雙軌存儲自愈檢查 (Dual-tier Storage Healing)
 * 若 LocalStorage 中的某些科目進度為空或遭清除，但 IndexedDB 存在快照，自動還原至 LocalStorage。
 * 反之若 LocalStorage 有最新進度，則非同步鏡像寫入 IndexedDB。
 */
export async function initDualTierStorage() {
  if (typeof localStorage === 'undefined') return { healed: 0, mirrored: 0 };
  const grades = [1, 2, 3];
  const activeSubjects = SUBJECTS.filter((s) => s.ready);
  let healedCount = 0;
  let mirroredCount = 0;

  try {
    const idbData = await idbGetAllProgress();

    for (const sub of activeSubjects) {
      for (const g of grades) {
        const key = getStorageKey(g, sub.id);
        const lsRaw = localStorage.getItem(key);
        const idbEntry = idbData[key];

        if (!lsRaw && idbEntry) {
          // LocalStorage 遺失，由 IndexedDB 自愈還原
          try {
            localStorage.setItem(key, JSON.stringify(idbEntry));
            healedCount++;
          } catch (e) {}
        } else if (lsRaw) {
          // LocalStorage 有數據，鏡像同步進 IndexedDB
          try {
            const parsed = JSON.parse(lsRaw);
            idbSaveProgress(key, parsed);
            mirroredCount++;
          } catch (e) {}
        }
      }
    }

    if (healedCount > 0) {
      console.log(`[DualStorage] 🛡️ 雙軌存儲已自動自愈修復 ${healedCount} 個學科進度節點！`);
    }
  } catch (err) {
    console.warn('[DualStorage] 雙軌同步自愈初始化跳過:', err);
  }

  return { healed: healedCount, mirrored: mirroredCount };
}

/**
 * 鏡像保存單一進度至雙軌存儲
 */
export function mirrorSaveProgress(key, data) {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }
  // 非同步寫入 IndexedDB，不阻塞主線程
  idbSaveProgress(key, data);
}

/**
 * 取得當前學童物件快照
 */
function getActiveStudentInfo(fallbackStudent = null) {
  if (fallbackStudent && fallbackStudent.name) return fallbackStudent;
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CURRENT_STUDENT);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
  }
  return { id: 'visitor', name: '冒險小勇士', avatar: '🦊' };
}

/**
 * 評定小學跨年級總體榮譽稱號
 */
export function evaluateMasteryRank(totalStars, completedLevels) {
  if (totalStars >= 240) {
    return {
      rank: 5,
      title: '跨年級傳奇守護神',
      icon: '👑',
      badgeColor: '#fbbf24',
      description: '全科目登峰造極，全學期全關卡三星大滿貫傳奇！',
    };
  }
  if (totalStars >= 160) {
    return {
      rank: 4,
      title: '全學科卓越宗師',
      icon: '🌟',
      badgeColor: '#38bdf8',
      description: '各大島嶼歷練深厚，多科知識靈活貫通！',
    };
  }
  if (totalStars >= 90) {
    return {
      rank: 3,
      title: '三科全能冒險家',
      icon: '🛡️',
      badgeColor: '#a855f7',
      description: '跨越低中年級，數理語文雙翼齊飛！',
    };
  }
  if (totalStars >= 35) {
    return {
      rank: 2,
      title: '初階學科勇士',
      icon: '⚔️',
      badgeColor: '#10b981',
      description: '基礎學科穩健扎實，正勇敢開拓各座島嶼！',
    };
  }
  return {
    rank: 1,
    title: '島嶼探索見習生',
    icon: '🐣',
    badgeColor: '#94a3b8',
    description: '踏上奇幻冒險旅途，期待累積更多榮譽星星！',
  };
}

/**
 * 跨年級 (小一~小三) 全學科成果綜合數據聚合器
 */
export function getCrossGradeSummary(targetStudent = null) {
  const student = getActiveStudentInfo(targetStudent);
  const grades = [1, 2, 3];
  const activeSubjects = SUBJECTS.filter((s) => s.ready);

  const maxTotalLevels = activeSubjects.length * 48; // 6 * 48 = 288
  const maxTotalStars = maxTotalLevels * 3;          // 864

  const summary = {
    student,
    schemaVersion: DUAL_STORAGE_CONFIG.SCHEMA_VERSION,
    calculatedAt: new Date().toISOString(),
    totalStars: 0,
    maxTotalStars,
    completedLevels: 0,
    maxTotalLevels,
    totalCorrect: 0,
    overallPercentage: 0,
    masteryRank: null,
    grades: {},
    subjects: {},
  };

  // 初始化各年級容器
  for (const g of grades) {
    summary.grades[g] = {
      grade: g,
      name: `小學${g === 1 ? '一' : g === 2 ? '二' : '三'}年級`,
      totalStars: 0,
      maxStars: activeSubjects.length * 16 * 3, // 6 * 48 = 288
      completedLevels: 0,
      maxLevels: activeSubjects.length * 16,    // 6 * 16 = 96
      percentage: 0,
      perSubject: {},
    };
  }

  // 遍歷所有科目與年級
  for (const sub of activeSubjects) {
    const sId = sub.id;
    const subSummary = {
      id: sId,
      name: sub.name,
      shortName: sub.shortName,
      icon: sub.icon,
      color: sub.color,
      isChallenge: Boolean(sub.isChallenge),
      totalStars: 0,
      maxStars: 48 * 3, // 144
      completedLevels: 0,
      maxLevels: 48,
      percentage: 0,
      grades: {},
    };

    for (const g of grades) {
      const key = getStorageKey(g, sId);
      let snap = createDefaultState();
      if (typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem(key);
          if (raw) snap = JSON.parse(raw);
        } catch (e) {}
      }

      const stars = Object.values(snap.stars || {}).reduce((sum, v) => sum + Number(v || 0), 0);
      const levels = Object.keys(snap.stars || {}).length;
      const corrects = Number(snap.totalCorrect || 0);

      const gradeItem = {
        stars,
        maxStars: 16 * 3, // 48
        levels,
        maxLevels: 16,
        unlocked: Math.min(16, Number(snap.unlocked || 1)),
        totalCorrect: corrects,
      };

      subSummary.grades[g] = gradeItem;
      subSummary.totalStars += stars;
      subSummary.completedLevels += levels;

      summary.grades[g].totalStars += stars;
      summary.grades[g].completedLevels += levels;
      summary.grades[g].perSubject[sId] = gradeItem;

      summary.totalStars += stars;
      summary.completedLevels += levels;
      summary.totalCorrect += corrects;
    }

    subSummary.percentage = subSummary.maxLevels > 0
      ? Math.round((subSummary.completedLevels / subSummary.maxLevels) * 100)
      : 0;
    summary.subjects[sId] = subSummary;
  }

  // 計算各年級百分比
  for (const g of grades) {
    const gr = summary.grades[g];
    gr.percentage = gr.maxLevels > 0 ? Math.round((gr.completedLevels / gr.maxLevels) * 100) : 0;
  }

  summary.overallPercentage = maxTotalLevels > 0
    ? Math.round((summary.completedLevels / maxTotalLevels) * 100)
    : 0;

  summary.masteryRank = evaluateMasteryRank(summary.totalStars, summary.completedLevels);

  return summary;
}

/**
 * 產生全量跨設備 JSON 匯出備份資料封包 (SSOT)
 */
export function createComprehensiveBackup(targetStudent = null) {
  const student = getActiveStudentInfo(targetStudent);
  const grades = [1, 2, 3];
  const activeSubjects = SUBJECTS.filter((s) => s.ready);
  const summary = getCrossGradeSummary(student);

  // 1. 抓取所有學科全年級 progress
  const progressMap = {};
  for (const sub of activeSubjects) {
    for (const g of grades) {
      const key = getStorageKey(g, sub.id);
      if (typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            progressMap[key] = JSON.parse(raw);
          } else {
            progressMap[key] = createDefaultState();
          }
        } catch (e) {
          progressMap[key] = createDefaultState();
        }
      } else {
        progressMap[key] = createDefaultState();
      }
    }
  }

  // 2. 抓取學童戰績 records
  let records = [];
  let pendingRecords = [];
  let studentsCache = [];
  if (typeof localStorage !== 'undefined') {
    try {
      records = JSON.parse(localStorage.getItem(STORAGE_KEY_RECORDS) || '[]');
    } catch (e) {}
    try {
      pendingRecords = JSON.parse(localStorage.getItem(STORAGE_KEY_PENDING) || '[]');
    } catch (e) {}
    try {
      studentsCache = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS) || '[]');
    } catch (e) {}
  }

  return {
    app: 'fantasy-island-adventure',
    schemaVersion: DUAL_STORAGE_CONFIG.SCHEMA_VERSION,
    exportType: 'dual_track_full_backup',
    exportedAt: new Date().toISOString(),
    student,
    studentsCache,
    summary,
    progress: progressMap,
    records,
    pendingRecords,
    meta: {
      currentSubject: getCurrentSubject(),
      currentGrade: getCurrentGrade(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'NodeJS/Test',
    },
  };
}

/**
 * 下載全量 JSON 備份檔至本機，並自動寫入 IndexedDB 歷史快照
 */
export async function exportAndDownloadBackup(targetStudent = null) {
  const backup = createComprehensiveBackup(targetStudent);
  const studentName = backup.student?.name || '冒險小勇士';
  const timeStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const filename = `奇幻數學島全科備份_${studentName}_${timeStr}.json`;

  // 寫入 IndexedDB 快照庫
  await idbSaveBackupSnapshot(backup, `匯出備份 (${studentName})`);

  if (typeof document !== 'undefined') {
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  return { success: true, filename, backup };
}

/**
 * 校驗並解析 JSON 備份資料
 */
export function parseAndValidateBackup(input) {
  let parsed = null;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      return { valid: false, error: 'JSON 格式解析失敗，請確認檔案內容正確。' };
    }
  } else if (typeof input === 'object' && input !== null) {
    parsed = input;
  } else {
    return { valid: false, error: '無效的備份輸入資料。' };
  }

  // 相容驗證：支援 3.0.2 或舊版 2.4.4
  if (!parsed.progress || typeof parsed.progress !== 'object') {
    return { valid: false, error: '備份檔中缺少關鍵 progress 進度資料區塊。' };
  }

  const studentName = parsed.student?.name || '未知勇士';
  const studentAvatar = parsed.student?.avatar || '🦊';
  const progressKeys = Object.keys(parsed.progress);
  let totalStars = 0;
  let totalLevels = 0;

  for (const prog of Object.values(parsed.progress)) {
    if (prog && prog.stars) {
      totalStars += Object.values(prog.stars).reduce((sum, v) => sum + Number(v || 0), 0);
      totalLevels += Object.keys(prog.stars).length;
    }
  }

  return {
    valid: true,
    data: parsed,
    preview: {
      studentName,
      studentAvatar,
      studentId: parsed.student?.id || 'visitor',
      totalStars,
      totalLevels,
      keysCount: progressKeys.length,
      exportedAt: parsed.exportedAt || parsed.exportTime || '未知時間',
      schemaVersion: parsed.schemaVersion || 'legacy',
    },
  };
}

/**
 * 安全合併單個 progress 物件
 */
function mergeSingleProgress(existing, incoming) {
  if (!incoming) return existing || createDefaultState();
  if (!existing) return incoming;

  // 1. 合併 stars (取兩者較高星數)
  const mergedStars = { ...(existing.stars || {}) };
  if (incoming.stars) {
    for (const [k, v] of Object.entries(incoming.stars)) {
      const numK = Number(k);
      const numV = Number(v);
      mergedStars[numK] = Math.max(Number(mergedStars[numK] || 0), numV);
    }
  }

  // 2. 合併 best (取最高答對題數)
  const mergedBest = { ...(existing.best || {}) };
  if (incoming.best) {
    for (const [k, v] of Object.entries(incoming.best)) {
      const numK = Number(k);
      const numV = Number(v);
      mergedBest[numK] = Math.max(Number(mergedBest[numK] || 0), numV);
    }
  }

  // 3. 合併 unlocked (取較大解鎖關卡)
  const mergedUnlocked = Math.max(Number(existing.unlocked || 1), Number(incoming.unlocked || 1));

  // 4. 合併 playedLevels (取聯集)
  const setPlayed = new Set([
    ...(Array.isArray(existing.playedLevels) ? existing.playedLevels : []),
    ...(Array.isArray(incoming.playedLevels) ? incoming.playedLevels : []),
  ]);

  // 5. 合併 totalCorrect
  const mergedTotalCorrect = Math.max(
    Number(existing.totalCorrect || 0),
    Number(incoming.totalCorrect || 0)
  );

  return {
    ...createDefaultState(),
    unlocked: Math.min(16, mergedUnlocked),
    stars: mergedStars,
    best: mergedBest,
    playedLevels: Array.from(setPlayed).sort((a, b) => a - b),
    totalCorrect: mergedTotalCorrect,
    musicOn: incoming.musicOn !== false,
    ttsOn: incoming.ttsOn !== false,
  };
}

/**
 * 執行跨設備 JSON 備份恢復 (支援 mode: 'merge' | 'overwrite')
 * 同步寫入 LocalStorage 與 IndexedDB 雙軌
 */
export async function applyComprehensiveBackup(backupInput, mode = 'merge') {
  const validation = parseAndValidateBackup(backupInput);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const backup = validation.data;
  let restoredCount = 0;

  // 1. 恢復各科進度 (雙軌儲存)
  if (backup.progress && typeof backup.progress === 'object') {
    for (const [key, incomingProgress] of Object.entries(backup.progress)) {
      let finalProgress = incomingProgress;

      if (mode === 'merge' && typeof localStorage !== 'undefined') {
        try {
          const rawExisting = localStorage.getItem(key);
          const existing = rawExisting ? JSON.parse(rawExisting) : null;
          finalProgress = mergeSingleProgress(existing, incomingProgress);
        } catch (e) {
          finalProgress = incomingProgress;
        }
      }

      // 寫入 LocalStorage
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(key, JSON.stringify(finalProgress));
        } catch (e) {}
      }

      // 寫入 IndexedDB
      await idbSaveProgress(key, finalProgress);
      restoredCount++;
    }
  }

  // 2. 恢復學童資料與戰績 records
  if (typeof localStorage !== 'undefined') {
    try {
      if (backup.student) {
        localStorage.setItem(STORAGE_KEY_CURRENT_STUDENT, JSON.stringify(backup.student));
      }
      if (Array.isArray(backup.studentsCache) && backup.studentsCache.length > 0) {
        const localStudents = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS) || '[]');
        const mergedStudents = [...localStudents];
        backup.studentsCache.forEach((bs) => {
          if (!mergedStudents.some((ms) => ms.id === bs.id)) mergedStudents.push(bs);
        });
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(mergedStudents));
      }
      if (Array.isArray(backup.records) && backup.records.length > 0) {
        const localRecords = JSON.parse(localStorage.getItem(STORAGE_KEY_RECORDS) || '[]');
        const mergedRecords = [...localRecords];
        backup.records.forEach((br) => {
          if (!mergedRecords.some((mr) => mr.id === br.id || (mr.timestamp === br.timestamp && mr.student_id === br.student_id && mr.level_id === br.level_id))) {
            mergedRecords.push(br);
          }
        });
        localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(mergedRecords));
      }
    } catch (e) {}
  }

  // 3. 儲存快照至 IndexedDB 備份庫
  await idbSaveBackupSnapshot(backup, `匯入還原 (${mode === 'merge' ? '智慧合併' : '完整覆蓋'})`);

  // 4. 重新加載 state
  const activeGrade = getCurrentGrade();
  const activeSubject = getCurrentSubject();
  setCurrentSubject(activeSubject);
  setCurrentGrade(activeGrade);

  return {
    success: true,
    mode,
    restoredKeysCount: restoredCount,
    studentName: backup.student?.name || '冒險小勇士',
    summary: getCrossGradeSummary(backup.student),
  };
}

