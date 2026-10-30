/**
 * js/guidance.js
 * 奇幻數學島 - 答題錯誤溫柔引導與視覺教具高亮互動模組 (v3.0.3)
 * 核心特色：
 * 1. 選項溫和左右輕震動效 (Gentle Shake)：去除粗暴挫折感，以 0.45s 彈性微晃提醒孩子
 * 2. 視覺教具區域高亮聚焦 (Visual Zone Spotlight Focus)：當孩子困惑時，上方圖形教具自動綻放溫暖光芒，引導視線尋找線索
 * 3. 跨學科專屬溫柔激勵語音與提示泡泡 (Gentle Encouragement & Cue)：降低答錯壓力，激勵繼續嘗試
 */

import { audio } from './audio.js';
import { getCurrentSubject } from './state.js';

export const GENTLE_ENCOURAGEMENTS = {
  math: [
    '沒關係，觀察一下上方圖形的線索喔！',
    '差一點點！數一數上面的圖案再試一次！',
    '別灰心，看著教具想一想，你可以的！',
    '吸一口氣，仔細觀察閃爍的圖形喔！',
  ],
  english: [
    'Nice try! 看看上面的字母和單字圖示喔！',
    '差一點點！聽聽發音並觀察上方圖卡！',
    '別急，跟著小狐狸看著圖片再想一想！',
    'Keep going! 再試一次一定可以！',
  ],
  chinese: [
    '沒關係，看一下字形筆畫與注音符號喔！',
    '差一點點！觀察上方部件的結構！',
    '別灰心，跟著發音圖示再想一想！',
    '字詞小博士，看著圖示再試一次！',
  ],
  science: [
    '沒關係，小小科學家看一下實驗圖示喔！',
    '差一點點！觀察自然界的特徵線索！',
    '仔細看上方發光的圖片，答案就藏在裡面！',
  ],
  social: [
    '沒關係，觀察地圖與生活常識的圖示喔！',
    '差一點點！看著照片線索再想一想！',
    '生活小達人，仔細看上方的地標圖案！',
  ],
  challenge: [
    '沒關係，全能小勇者看一下題目圖示喔！',
    '差一點點！跨領域知識就在上方圖示裡！',
    '別灰心，冷靜思考一下，你一定做得到！',
  ],
};

const DEFAULT_ENCOURAGEMENT = [
  '沒關係，觀察一下上方圖形的線索喔！',
  '差一點點！看著圖案再試一次！',
  '慢慢來，答案就在上方提示裡！',
];

/**
 * 取得溫柔激勵語音字串
 */
export function getGentleEncouragement(subjectId = 'math', attemptCount = 1) {
  const sub = String(subjectId || getCurrentSubject() || 'math');
  const pool = GENTLE_ENCOURAGEMENTS[sub] || DEFAULT_ENCOURAGEMENT;
  const text = pool[Math.floor(Math.random() * pool.length)];

  if (attemptCount >= 2) {
    return '沒關係，我們一起來看圖形解析喔！';
  }
  return text;
}

/**
 * 對點選錯誤之選項施加溫和左右輕震動效
 */
export function applyGentleShake(button) {
  if (!button || !(button instanceof HTMLElement)) return;

  button.classList.remove('shake-gentle');
  // 強制觸發重繪以重播動畫
  void button.offsetWidth;
  button.classList.add('shake-gentle');

  const onAnimEnd = () => {
    button.classList.remove('shake-gentle');
    button.removeEventListener('animationend', onAnimEnd);
  };
  button.addEventListener('animationend', onAnimEnd, { once: true });
}

/**
 * 觸發視覺教具區域高亮聚焦 (Spotlight Glow Pulse)
 */
export function highlightVisualFocus(target = null) {
  const el = typeof target === 'string'
    ? document.getElementById(target)
    : (target || document.getElementById('visual-zone') || document.querySelector('.visual-zone'));

  if (!el || !(el instanceof HTMLElement)) return null;

  // 移除既有高亮樣式
  el.classList.remove('visual-focus-pulse');
  void el.offsetWidth;
  el.classList.add('visual-focus-pulse');

  // 若尚未有提示小飄浮標籤，新增一個可愛的導引氣泡
  let cue = el.querySelector('.visual-focus-cue');
  if (!cue) {
    cue = document.createElement('div');
    cue.className = 'visual-focus-cue';
    cue.innerHTML = '<span>💡</span> 觀察這裡的線索喔！';
    el.style.position = 'relative';
    el.appendChild(cue);
  } else {
    cue.classList.remove('cue-pop');
    void cue.offsetWidth;
    cue.classList.add('cue-pop');
  }

  // 2.2 秒後淡出小標籤與動畫狀態
  const timer = setTimeout(() => {
    if (el) el.classList.remove('visual-focus-pulse');
    if (cue && cue.parentNode === el) {
      cue.style.opacity = '0';
      cue.style.transition = 'opacity 0.4s ease';
      setTimeout(() => cue.remove(), 400);
    }
  }, 2400);

  return { element: el, timer };
}

/**
 * 清理視覺教具區域的高亮狀態
 */
export function clearVisualFocus() {
  const el = document.getElementById('visual-zone') || document.querySelector('.visual-zone');
  if (el) {
    el.classList.remove('visual-focus-pulse');
    const cue = el.querySelector('.visual-focus-cue');
    if (cue) cue.remove();
  }
}

