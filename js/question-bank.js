import { getCurrentGrade, getCurrentSubject } from './state.js';
import { getGradeConfig } from './grades.js';
import { DEFAULT_SUBJECT } from './subjects.js';

let bank = null;
let currentGrade = null;
let currentSubject = null;
let loaded = false;

/* 題庫路徑由科目年級字典提供，嚴禁在此硬編碼 */
export async function loadQuestionBankForGrade(grade = getCurrentGrade(), subjectId = getCurrentSubject()) {
  const g = Number(grade) || 1;
  const subject = String(subjectId || getCurrentSubject());
  const url = getGradeConfig(g, subject).questionBankUrl || 'data/question-bank.json';
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`bank ${response.status}`);
    const json = await response.json();
    if (!json || typeof json !== 'object' || !json.levels) throw new Error('題庫格式錯誤');
    bank = json;
    currentGrade = g;
    currentSubject = subject;
    loaded = true;
    return bank;
  } catch (err) {
    console.warn(`[question-bank] 無法從 ${url} 載入題庫，嘗試備用 data/question-bank.json`, err);
    try {
      const fb = await fetch('data/question-bank.json');
      if (fb.ok) {
        bank = await fb.json();
        currentGrade = 1;
        currentSubject = DEFAULT_SUBJECT;
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
  return loadQuestionBankForGrade(getCurrentGrade(), getCurrentSubject());
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
    subject: currentSubject,
    generatedAt: bank.generatedAt,
    levels: Object.keys(bank.levels || {}).length,
  } : null;
}
