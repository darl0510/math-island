import { DEFAULT_SUBJECT, SUBJECTS } from './subjects.js';

export const TOTAL_LEVELS = 16;
export const TOTAL_ISLANDS = 4;
export const LEVELS_PER_ISLAND = 4;
const SUBJECT_STORAGE_KEY = 'fantasy-island-current-subject';

export function createDefaultState() {
  return {
    unlocked: 1,
    stars: {},
    best: {},
    musicOn: true,
    ttsOn: true,
    totalCorrect: 0,
    playedLevels: [],
  };
}

export function getCurrentGrade() {
  try {
    if (typeof localStorage === 'undefined') return 1;
    const raw = localStorage.getItem('fantasy-math-current-grade');
    return raw ? Number(raw) : 1;
  } catch {
    return 1;
  }
}

export function getCurrentSubject() {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_SUBJECT;
    const raw = localStorage.getItem(SUBJECT_STORAGE_KEY);
    return raw ? String(raw) : DEFAULT_SUBJECT;
  } catch {
    return DEFAULT_SUBJECT;
  }
}

export function setCurrentSubject(subjectId) {
  const id = String(subjectId || DEFAULT_SUBJECT);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SUBJECT_STORAGE_KEY, id);
    }
  } catch {}
  state = load(getCurrentGrade(), id);
  return id;
}

export function setCurrentGrade(grade) {
  const g = Number(grade) || 1;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('fantasy-math-current-grade', String(g));
    }
  } catch {}
  state = load(g, getCurrentSubject());
  return g;
}

/* 多科進度獨立記帳：數學沿用舊 key 保住既有進度，新科目各自獨立空間 */
export function getStorageKey(grade = getCurrentGrade(), subject = getCurrentSubject()) {
  const g = Number(grade) || 1;
  if (subject === DEFAULT_SUBJECT) {
    return g === 1 ? 'fantasy-math-island-progress-v1' : `fantasy-math-island-progress-g${g}-v1`;
  }
  return `fantasy-island-progress-${subject}-g${g}-v1`;
}

/* 健壯資料修復與驗證 */
function sanitizeProgress(rawObj) {
  if (!rawObj || typeof rawObj !== 'object') {
    return createDefaultState();
  }
  const cleanStars = {};
  if (rawObj.stars && typeof rawObj.stars === 'object') {
    for (const [k, v] of Object.entries(rawObj.stars)) {
      const numK = Number(k);
      const numV = Number(v);
      if (numK >= 1 && numK <= TOTAL_LEVELS && numV >= 1 && numV <= 3) {
        cleanStars[numK] = numV;
      }
    }
  }

  const cleanBest = {};
  if (rawObj.best && typeof rawObj.best === 'object') {
    for (const [k, v] of Object.entries(rawObj.best)) {
      const numK = Number(k);
      if (numK >= 1 && numK <= TOTAL_LEVELS) {
        cleanBest[numK] = Math.max(0, Number(v) || 0);
      }
    }
  }

  const rawUnlocked = Number(rawObj.unlocked) || 1;
  const safeUnlocked = Math.max(1, Math.min(TOTAL_LEVELS, rawUnlocked));

  const cleanPlayed = Array.isArray(rawObj.playedLevels)
    ? [...new Set(rawObj.playedLevels.map(Number).filter((n) => n >= 1 && n <= TOTAL_LEVELS))]
    : [];

  return {
    ...createDefaultState(),
    unlocked: safeUnlocked,
    stars: cleanStars,
    best: cleanBest,
    musicOn: rawObj.musicOn !== false,
    ttsOn: rawObj.ttsOn !== false,
    totalCorrect: Math.max(0, Number(rawObj.totalCorrect) || 0),
    playedLevels: cleanPlayed,
  };
}

function load(grade = getCurrentGrade(), subject = getCurrentSubject()) {
  try {
    if (typeof localStorage === 'undefined') return createDefaultState();
    const key = getStorageKey(grade, subject);
    const raw = localStorage.getItem(key);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    return sanitizeProgress(parsed);
  } catch (err) {
    console.warn(`[storage] 讀取進度異常 (${subject} G${grade})，重設為預設狀態:`, err);
    return createDefaultState();
  }
}

let state = load();

export function getState() {
  return state;
}

export function saveState(grade = getCurrentGrade(), subject = getCurrentSubject()) {
  try {
    const key = getStorageKey(grade, subject);
    const targetState = (Number(grade) === getCurrentGrade() && String(subject) === getCurrentSubject())
      ? state
      : load(grade, subject);
    localStorage.setItem(key, JSON.stringify(targetState));
  } catch (err) {
    /* 無痕模式或 Quota 超限可能無法寫入，遊戲仍可玩 */
    console.warn('[storage] 進度保存失敗 (可能是無痕模式或空間不足):', err);
  }
}

export function isUnlocked(levelId) {
  return Number(levelId) <= Number(state.unlocked || 1);
}

export function completeLevel(levelId, stars, correctCount = 0) {
  const id = Number(levelId);
  const safeStars = Math.max(1, Math.min(3, Number(stars) || 1));
  const previous = Number(state.stars[id] || 0);
  state.stars[id] = Math.max(previous, safeStars);
  const previousBest = Number(state.best[id] || 0);
  state.best[id] = Math.max(previousBest, correctCount);
  state.unlocked = Math.max(Number(state.unlocked || 1), Math.min(TOTAL_LEVELS, id + 1));
  state.totalCorrect = Number(state.totalCorrect || 0) + correctCount;
  if (!state.playedLevels.includes(id)) state.playedLevels.push(id);
  saveState();
  return { previousStars: previous, stars: state.stars[id] };
}

export function setMusicOn(value) {
  state.musicOn = Boolean(value);
  saveState();
}

export function setTtsOn(value) {
  state.ttsOn = Boolean(value);
  saveState();
}

function snapshot(grade, subject) {
  return (Number(grade) === getCurrentGrade() && String(subject) === getCurrentSubject())
    ? state
    : load(grade, subject);
}

export function totalStars(grade = getCurrentGrade(), subject = getCurrentSubject()) {
  const s = snapshot(grade, subject);
  return Object.values(s.stars || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

export function completedCount(grade = getCurrentGrade(), subject = getCurrentSubject()) {
  const s = snapshot(grade, subject);
  return Object.keys(s.stars || {}).length;
}

/* 科目膠囊徽章：各科目獨立顆星與完成關數 */
export function subjectProgress(subjectId = getCurrentSubject(), grade = getCurrentGrade()) {
  const s = snapshot(grade, subjectId);
  return {
    stars: Object.values(s.stars || {}).reduce((sum, value) => sum + Number(value || 0), 0),
    levels: Object.keys(s.stars || {}).length,
  };
}

export function unlockedLevel() {
  return Math.min(TOTAL_LEVELS, Number(state.unlocked || 1));
}

/* ===== 跨科目全年級 144 關進度持久化匯總 API ===== */

export function getAllSubjectsSummary() {
  const grades = [1, 2, 3];
  const summary = {
    totalStars: 0,
    maxTotalStars: 144 * 3, // 432
    completedLevels: 0,
    maxTotalLevels: 144,
    percentage: 0,
    subjects: {},
  };

  for (const sub of SUBJECTS) {
    const sId = sub.id;
    const subSummary = {
      name: sub.name,
      shortName: sub.shortName,
      icon: sub.icon,
      color: sub.color,
      totalStars: 0,
      maxStars: 48 * 3, // 144
      completedLevels: 0,
      maxLevels: 48,
      grades: {},
    };

    for (const g of grades) {
      const snap = snapshot(g, sId);
      const stars = Object.values(snap.stars || {}).reduce((sum, v) => sum + Number(v || 0), 0);
      const levels = Object.keys(snap.stars || {}).length;
      subSummary.grades[g] = {
        stars,
        maxStars: 16 * 3, // 48
        levels,
        maxLevels: 16,
        unlocked: snap.unlocked || 1,
      };
      subSummary.totalStars += stars;
      subSummary.completedLevels += levels;
    }

    summary.subjects[sId] = subSummary;
    summary.totalStars += subSummary.totalStars;
    summary.completedLevels += subSummary.completedLevels;
  }

  summary.percentage = Math.round((summary.completedLevels / summary.maxTotalLevels) * 100);
  return summary;
}

/* 跨科目進度導出 (備份用) */
export function exportAllProgress() {
  const grades = [1, 2, 3];
  const exported = {
    app: 'fantasy-island-adventure',
    schemaVersion: '2.4.4',
    exportTime: new Date().toISOString(),
    currentSubject: getCurrentSubject(),
    currentGrade: getCurrentGrade(),
    progress: {},
  };

  for (const sub of SUBJECTS) {
    for (const g of grades) {
      const key = getStorageKey(g, sub.id);
      const snap = snapshot(g, sub.id);
      exported.progress[key] = snap;
    }
  }

  return exported;
}

/* 跨科目進度導入 (還原用) */
export function importAllProgress(data) {
  if (!data || typeof data !== 'object' || !data.progress) {
    throw new Error('無效的進度備份格式');
  }

  const grades = [1, 2, 3];
  let importedCount = 0;

  for (const sub of SUBJECTS) {
    for (const g of grades) {
      const key = getStorageKey(g, sub.id);
      if (data.progress[key]) {
        const clean = sanitizeProgress(data.progress[key]);
        try {
          localStorage.setItem(key, JSON.stringify(clean));
          importedCount++;
        } catch (e) {
          console.warn(`[storage] 寫入 ${key} 失敗:`, e);
        }
      }
    }
  }

  // 重新載入當前狀態
  state = load(getCurrentGrade(), getCurrentSubject());
  return { success: true, importedCount };
}

/* 進度重設（支援目前年級、指定科目、或全年級全科目） */
export function resetProgress(options = { scope: 'current' }) {
  const scope = typeof options === 'string' ? options : (options?.scope || 'current');
  const grades = [1, 2, 3];

  if (scope === 'all') {
    // 重設全科目全年級 144 關
    for (const sub of SUBJECTS) {
      for (const g of grades) {
        const key = getStorageKey(g, sub.id);
        const resetItem = { ...createDefaultState(), musicOn: state.musicOn, ttsOn: state.ttsOn };
        try {
          localStorage.setItem(key, JSON.stringify(resetItem));
        } catch {}
      }
    }
  } else if (scope === 'subject') {
    // 重設當前科目全年級
    const sId = getCurrentSubject();
    for (const g of grades) {
      const key = getStorageKey(g, sId);
      const resetItem = { ...createDefaultState(), musicOn: state.musicOn, ttsOn: state.ttsOn };
      try {
        localStorage.setItem(key, JSON.stringify(resetItem));
      } catch {}
    }
  } else {
    // 預設僅重設當前科目當前年級
    state = {
      ...createDefaultState(),
      musicOn: state.musicOn,
      ttsOn: state.ttsOn,
    };
    saveState();
  }

  state = load(getCurrentGrade(), getCurrentSubject());
}
