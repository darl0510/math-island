/**
 * combo.js — 全年級全學科互動答題 Combo 獎勵激勵系統
 * 連續答對 Combo 計數、階梯獎勵、視覺動效、音效與語音激勵
 */

import { audio } from './audio.js';
import { escapeHtml } from './ui.js';
import { toZhuyinRuby } from './zhuyin.js';

/* ── Combo 階梯定義 ── */
const COMBO_TIERS = [
  { threshold: 2,  label: '🔥 Combo ×2',  color: '#f59e0b', sfx: 'combo2',  praise: '連續答對！好厲害！' },
  { threshold: 3,  label: '🔥🔥 Combo ×3', color: '#ef4444', sfx: 'combo3',  praise: '三连對！太神了！' },
  { threshold: 5,  label: '🌟 Combo ×5',  color: '#8b5cf6', sfx: 'combo5',  praise: '五連對！你是數學天才！' },
  { threshold: 8,  label: '💎 Combo ×8',  color: '#06b6d4', sfx: 'combo8',  praise: '八連對！鑽石級冒險者！' },
  { threshold: 12, label: '👑 Combo ×12', color: '#f59e0b', sfx: 'combo12', praise: '十二連對！王者無敵！' },
];

const COMBO_BREAK_MSGS = [
  '💔 Combo 中斷了，沒關係，重新開始！',
  '💛 雖然 Combo 斷了，但你已經很棒了！',
  '🌈 Combo 暫停，下一題再衝！',
  '🍀 沒關係，Combo 可以重新累積！',
];

/* ── Combo 狀態（每個 session 獨立） ── */
export function createComboState() {
  return {
    count: 0,
    maxCombo: 0,
    tierIndex: -1,
    totalCombos: 0,
    active: false,
  };
}

/* ── 答對時呼叫 ── */
export function onCorrect(session) {
  const combo = session.combo;
  if (!combo) return null;

  combo.count += 1;
  combo.active = true;
  if (combo.count > combo.maxCombo) combo.maxCombo = combo.count;

  // 檢查是否跨越新的 Combo 階梯
  let newTier = null;
  for (let i = COMBO_TIERS.length - 1; i >= 0; i--) {
    if (combo.count === COMBO_TIERS[i].threshold) {
      newTier = COMBO_TIERS[i];
      combo.tierIndex = i;
      combo.totalCombos += 1;
      break;
    }
  }

  return newTier;
}

/* ── 答錯時呼叫 ── */
export function onWrong(session) {
  const combo = session.combo;
  if (!combo) return null;

  const hadCombo = combo.count >= 2;
  const lostCount = combo.count;
  combo.count = 0;
  combo.tierIndex = -1;
  combo.active = false;

  if (hadCombo) {
    const msg = COMBO_BREAK_MSGS[Math.floor(Math.random() * COMBO_BREAK_MSGS.length)];
    return { msg, lostCount };
  }
  return null;
}

/* ── 渲染 Combo 指示器（插入 level-topbar） ── */
export function renderComboBar(session) {
  const topbar = document.querySelector('.level-topbar');
  if (!topbar) return;

  let bar = topbar.querySelector('.combo-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'combo-bar';
    bar.setAttribute('aria-live', 'polite');
    topbar.appendChild(bar);
  }

  const combo = session.combo;
  if (!combo || combo.count < 2) {
    bar.classList.remove('combo-active');
    bar.innerHTML = '';
    return;
  }

  const tier = COMBO_TIERS[combo.tierIndex] || COMBO_TIERS[0];
  bar.classList.add('combo-active');
  bar.style.setProperty('--combo-color', tier.color);
  bar.innerHTML = `
    <span class="combo-flame" aria-hidden="true">${'🔥'.repeat(Math.min(combo.count, 5))}</span>
    <span class="combo-count">×${combo.count}</span>
    <span class="combo-tier-label">${escapeHtml(tier.label)}</span>
  `;
}

/* ── Combo 階梯達成時的大動效 overlay ── */
export function showComboCelebration(session, tier) {
  const stage = document.querySelector('.question-stage');
  if (!stage) return;

  // 移除舊的 combo 慶祝
  const old = stage.querySelector('.combo-celebration');
  if (old) old.remove();

  const el = document.createElement('div');
  el.className = 'combo-celebration';
  el.setAttribute('aria-live', 'assertive');
  el.style.setProperty('--combo-color', tier.color);
  el.innerHTML = `
    <div class="combo-celebration-inner">
      <div class="combo-celebration-emoji" aria-hidden="true">${tier.label.split(' ')[0]}</div>
      <div class="combo-celebration-text">
        <span class="combo-celebration-tier">${escapeHtml(tier.label)}</span>
        <span class="combo-celebration-praise">${toZhuyinRuby(tier.praise)}</span>
      </div>
      <div class="combo-celebration-sparkles" aria-hidden="true">
        ${Array.from({ length: 12 }, (_, i) =>
          `<span class="sparkle" style="--i:${i}">✦</span>`
        ).join('')}
      </div>
    </div>
  `;
  stage.appendChild(el);

  // 播放 combo 音效
  if (typeof audio.playSfx === 'function') {
    audio.playSfx(tier.sfx, 0.7);
  }

  // 語音激勵
  if (audio.ttsOn && typeof audio.speak === 'function') {
    audio.speak(tier.praise);
  }

  // 自動移除
  setTimeout(() => {
    el.classList.add('combo-celebration-fadeout');
    setTimeout(() => el.remove(), 600);
  }, 2200);
}

/* ── Combo 中斷提示 ── */
export function showComboBreak(session, info) {
  const feedback = document.getElementById('feedback');
  if (!feedback || !info) return;

  const el = document.createElement('div');
  el.className = 'combo-break-toast';
  el.innerHTML = `<span>${toZhuyinRuby(info.msg)}</span>`;
  feedback.appendChild(el);

  setTimeout(() => {
    el.classList.add('combo-break-fadeout');
    setTimeout(() => el.remove(), 500);
  }, 1800);
}

/* ── 關卡結算時顯示 Combo 統計 ── */
export function comboSummaryMarkup(session) {
  const combo = session.combo;
  if (!combo || combo.maxCombo < 2) return '';

  const tier = COMBO_TIERS[combo.tierIndex] || COMBO_TIERS[0];
  return `
    <div class="result-combo-summary">
      <div class="combo-summary-icon" aria-hidden="true">🔥</div>
      <div class="combo-summary-info">
        <span class="combo-summary-title">Combo 最佳紀錄</span>
        <span class="combo-summary-value">×${combo.maxCombo}</span>
        <span class="combo-summary-tier">${escapeHtml(tier.label)}</span>
      </div>
    </div>
  `;
}

/* ── 取得 Combo 階梯列表（供外部查詢） ── */
export function getComboTiers() {
  return COMBO_TIERS;
}
