/* 科目註冊表 (SSOT)：新增科目時只需在此資料表加一列，嚴禁在 UI 端硬編碼科目清單。 */
export const DEFAULT_SUBJECT = 'math';

export const SUBJECTS = [
  {
    id: 'math',
    name: '數學島',
    shortName: '數學',
    icon: '🧮',
    color: '#3fae6a',
    brandTitle: '奇幻數學島',
    tagline: '邊玩邊學數學',
    speechLang: 'zh-TW',
    ready: true,
    symbols: ['+', '7', '×', '10', '●', '3', '★', '8', '÷'],
  },
  {
    id: 'english',
    name: '英文島',
    shortName: '英文',
    icon: '🔤',
    color: '#2b9cdb',
    brandTitle: '奇幻英文島',
    tagline: '自然發音與生活單字',
    speechLang: 'en-US',
    ready: true,
    symbols: ['A', 'b', 'C', '🔤', 'e', '★', 'Hi', '1', '?'],
  },
  {
    id: 'chinese',
    name: '國語島',
    shortName: '國語',
    icon: '📖',
    color: '#8d7bf0',
    brandTitle: '奇幻國語島',
    tagline: '注音符號、筆順與部首部件',
    speechLang: 'zh-TW',
    ready: true,
    symbols: ['ㄅ', 'ㄆ', 'ㄇ', '口', '★', '水', '火', '木', '☁'],
  },
  {
    id: 'science',
    name: '自然科學島',
    shortName: '自然',
    icon: '🔬',
    color: '#10b981',
    brandTitle: '奇幻自然科學島',
    tagline: '動植物生態、天氣光影與探索實驗',
    speechLang: 'zh-TW',
    ready: true,
    symbols: ['🌱', '🦋', '🔬', '☀️', '💧', '🧲', '🌈', '🌿', '🍂'],
  },
  {
    id: 'social',
    name: '社會島',
    shortName: '社會',
    icon: '🧭',
    color: '#e07a5f',
    brandTitle: '奇幻社會島',
    tagline: '家鄉地理、台灣文化與生活公民',
    speechLang: 'zh-TW',
    ready: true,
    symbols: ['🧭', '🗺️', '🏮', '🏛️', '⛰️', '🌊', '🚆', '🎒', '🇹🇼'],
  },
  {
    id: 'challenge',
    name: '綜合挑戰島',
    shortName: '挑戰',
    icon: '🏆',
    color: '#e67e22',
    brandTitle: '跨科目期末綜合挑戰島',
    tagline: '數英中國小期末跨學科素養大會考',
    speechLang: 'zh-TW',
    ready: true,
    isChallenge: true,
    symbols: ['🏆', '📐', '🔤', '📖', '🌟', '🎯', '💯', '✨', '👑'],
  },
];

export function getSubjectConfig(subjectId = DEFAULT_SUBJECT) {
  return SUBJECTS.find((subject) => subject.id === String(subjectId)) || SUBJECTS[0];
}

export function isSubjectReady(subjectId = DEFAULT_SUBJECT) {
  return getSubjectConfig(subjectId).ready === true;
}

/* 雙軌語音：科目決定語音引擎語系（英文島 → en-US 美語引擎） */
export function getSubjectSpeechLang(subjectId = DEFAULT_SUBJECT) {
  return getSubjectConfig(subjectId).speechLang || 'zh-TW';
}
