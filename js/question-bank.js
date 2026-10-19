import { getCurrentGrade } from './state.js';

let bank = null;
let currentGrade = null;
let loaded = false;

export async function loadQuestionBankForGrade(grade = getCurrentGrade()) {
  const g = Number(grade) || 1;
  const url = g === 3 ? 'data/question-bank-g3.json' : (g === 2 ? 'data/question-bank-g2.json' : 'data/question-bank-g1.json');
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`bank ${response.status}`);
    const json = await response.json();
    if (!json || typeof json !== 'object' || !json.levels) throw new Error('題庫格式錯誤');
    bank = json;
    currentGrade = g;
    loaded = true;
    return bank;
  } catch (err) {
    console.warn(`[question-bank] 無法從 ${url} 載入題庫，嘗試備用 data/question-bank.json`, err);
    try {
      const fb = await fetch('data/question-bank.json');
      if (fb.ok) {
        bank = await fb.json();
        currentGrade = 1;
        loaded = true;
        return bank;
      }
    } catch {}
    bank = null;
  }
  loaded = true;
  return bank;
}

export async function loadQuestionBank(url = 'data/question-bank.json') {
  return loadQuestionBankForGrade(getCurrentGrade());
}

export function getBankQuestions(levelId) {
  if (!bank) return null;
  const levels = bank.levels;
  const list = levels[String(levelId)] || levels[levelId];
  return Array.isArray(list) && list.length >= 6 ? list : null;
}

export function isBankLoaded() {
  return loaded;
}

export function bankInfo() {
  return bank ? {
    grade: currentGrade,
    generatedAt: bank.generatedAt,
    levels: Object.keys(bank.levels || {}).length,
  } : null;
}
