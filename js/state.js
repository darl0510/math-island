const TOTAL_LEVELS = 16;

const defaultState = {
  unlocked: 1,
  stars: {},
  best: {},
  musicOn: true,
  ttsOn: true,
  totalCorrect: 0,
  playedLevels: [],
};

export function getCurrentGrade() {
  try {
    const raw = localStorage.getItem('fantasy-math-current-grade');
    return raw ? Number(raw) : 1;
  } catch {
    return 1;
  }
}

export function setCurrentGrade(grade) {
  const g = Number(grade) || 1;
  try {
    localStorage.setItem('fantasy-math-current-grade', String(g));
  } catch {}
  state = load(g);
  return g;
}

function getStorageKey(grade = getCurrentGrade()) {
  return Number(grade) === 1 ? 'fantasy-math-island-progress-v1' : `fantasy-math-island-progress-g${grade}-v1`;
}

function load(grade = getCurrentGrade()) {
  try {
    const key = getStorageKey(grade);
    const raw = localStorage.getItem(key);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      stars: { ...(parsed.stars || {}) },
      best: { ...(parsed.best || {}) },
      playedLevels: Array.isArray(parsed.playedLevels) ? parsed.playedLevels : [],
    };
  } catch {
    return { ...defaultState };
  }
}

let state = load();

export function getState() {
  return state;
}

export function saveState() {
  try {
    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* 無痕模式可能無法寫入，遊戲仍可玩 */
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

export function totalStars(grade = getCurrentGrade()) {
  const s = grade === getCurrentGrade() ? state : load(grade);
  return Object.values(s.stars || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

export function completedCount(grade = getCurrentGrade()) {
  const s = grade === getCurrentGrade() ? state : load(grade);
  return Object.keys(s.stars || {}).length;
}

export function resetProgress() {
  state = {
    ...defaultState,
    musicOn: state.musicOn,
    ttsOn: state.ttsOn,
  };
  saveState();
}

export function unlockedLevel() {
  return Math.min(TOTAL_LEVELS, Number(state.unlocked || 1));
}
