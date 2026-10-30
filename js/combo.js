/**
 * combo.js — 全年級全學科互動答題 Combo 獎勵激勵系統
 * 連續答對 Combo 計數、階梯獎勵、視覺動效、音效與語音激勵
 */

import { audio } from './audio.js';
import { escapeHtml } from './ui.js';
import { toZhuyinRuby } from './zhuyin.js';

/* ── Combo 階梯定義 ── */
const COMBO_TIERS = [
  { threshold: 2,  label: '🔥 Combo ×2',  color: '#f59e0b', sfx: 'correct',  praise: '連續答對！好厲害！' },
  { threshold: 3,  label: '🔥🔥 Combo ×3', color: '#ef4444', sfx: 'levelup',  praise: '三連對！太神了！' },
  { threshold: 5,  label: '🌟 Combo ×5',  color: '#8b5cf6', sfx: 'levelup',  praise: '五連對！你是冒險天才！' },
  { threshold: 8,  label: '💎 Combo ×8',  color: '#06b6d4', sfx: 'levelup',  praise: '八連對！鑽石級大冒險家！' },
  { threshold: 12, label: '👑 Combo ×12', color: '#f59e0b', sfx: 'levelup', praise: '十二連對！王者無敵！' },
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

  let tier = COMBO_TIERS[0];
  for (let i = COMBO_TIERS.length - 1; i >= 0; i--) {
    if (combo.count >= COMBO_TIERS[i].threshold) {
      tier = COMBO_TIERS[i];
      break;
    }
  }
  bar.classList.add('combo-active');
  bar.style.setProperty('--combo-color', tier.color);
  bar.innerHTML = `
    <span class="combo-flame" aria-hidden="true">${'🔥'.repeat(Math.min(combo.count, 5))}</span>
    <span class="combo-count">×${combo.count}</span>
    <span class="combo-tier-label">${escapeHtml(tier.label)}</span>
  `;
}

/* ── Combo 階梯達成時的全屏大動效 (Full-screen Spectacular) ── */
export function showComboCelebration(session, tier) {
  // 移除舊的 combo 慶祝
  document.querySelectorAll('.combo-celebration, .combo-celebration-fullscreen').forEach(el => el.remove());

  const comboCount = session.combo?.count || tier.threshold;
  const intensity = comboCount >= 12 ? 5 : comboCount >= 8 ? 4 : comboCount >= 5 ? 3 : comboCount >= 3 ? 2 : 1;
  const particleCount = [14, 20, 28, 36, 48][intensity - 1];
  const scaleMultiplier = [1.0, 1.08, 1.15, 1.22, 1.3][intensity - 1];

  const particleEmojis = {
    1: ['⭐', '✨', '💛', '🌟'],
    2: ['🔥', '⭐', '✨', '💥', '🌟'],
    3: ['🌟', '🔥', '💥', '✨', '🎇', '⚡'],
    4: ['💎', '🔥', '🌟', '💥', '✨', '⚡', '🎆'],
    5: ['👑', '💎', '🔥', '🌟', '💥', '✨', '⚡', '🎆', '🎇'],
  };
  const emojis = particleEmojis[intensity] || particleEmojis[1];

  const overlay = document.createElement('div');
  overlay.className = 'combo-celebration-fullscreen';
  overlay.setAttribute('aria-live', 'assertive');
  overlay.setAttribute('role', 'status');
  overlay.style.setProperty('--combo-color', tier.color);

  const particlesHtml = Array.from({ length: particleCount }, (_, i) => {
    const emoji = emojis[i % emojis.length];
    const angle = (i / particleCount) * 360;
    const dist = 120 + Math.random() * 200;
    const delay = (Math.random() * 0.4).toFixed(2);
    const size = (1.2 + Math.random() * 1.8).toFixed(2);
    return '<span class="cc-particle" style="--angle:' + angle + 'deg;--dist:' + dist + 'px;--delay:' + delay + 's;--size:' + size + 'rem;--i:' + i + '">' + emoji + '</span>';
  }).join('');

  const tierEmoji = tier.label.split(' ')[0];
  const comboLabelText = tier.label.replace(/^[^\s]+\s*/, '');

  overlay.innerHTML =
    '<div class="cc-backdrop"></div>' +
    '<div class="cc-particles" aria-hidden="true">' + particlesHtml + '</div>' +
    '<div class="cc-main" style="--scale:' + scaleMultiplier + '">' +
      '<div class="cc-burst-ring" aria-hidden="true"></div>' +
      '<div class="cc-burst-ring cc-ring-2" aria-hidden="true"></div>' +
      '<div class="cc-tier-emoji" aria-hidden="true">' + tierEmoji + '</div>' +
      '<div class="cc-combo-label">' + comboLabelText + '</div>' +
      '<div class="cc-praise-text">' + tier.praise + '</div>' +
      '<div class="cc-count-glow" aria-hidden="true">×' + comboCount + '</div>' +
    '</div>' +
    '<div class="cc-shockwave" aria-hidden="true"></div>';

  document.body.appendChild(overlay);

  if (typeof audio.playSfx === 'function') audio.playSfx(tier.sfx, 0.85);
  if (audio.ttsOn && typeof audio.speak === 'function') audio.speak(tier.praise);

  const displayMs = 800 + intensity * 220;
  setTimeout(() => {
    overlay.classList.add('cc-fadeout');
    setTimeout(() => overlay.remove(), 500);
  }, displayMs);
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

  let tier = COMBO_TIERS[0];
  for (let i = COMBO_TIERS.length - 1; i >= 0; i--) {
    if (combo.maxCombo >= COMBO_TIERS[i].threshold) {
      tier = COMBO_TIERS[i];
      break;
    }
  }
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

/* ── 計算每題得分與 Combo 加成 ── */
export function calculateQuestionScore(comboCount = 0, basePoints = 100) {
  const count = Math.max(0, Number(comboCount) || 0);
  let bonus = 0;
  let tierLevel = 1;
  let color = '#10b981'; // 基礎答對：亮翡翠綠

  if (count >= 12) {
    bonus = 100;
    tierLevel = 5;
    color = '#f59e0b';
  } else if (count >= 8) {
    bonus = 80;
    tierLevel = 4;
    color = '#06b6d4';
  } else if (count >= 5) {
    bonus = 50;
    tierLevel = 3;
    color = '#8b5cf6';
  } else if (count >= 3) {
    bonus = 30;
    tierLevel = 2;
    color = '#ef4444';
  } else if (count >= 2) {
    bonus = 20;
    tierLevel = 1;
    color = '#f59e0b';
  }

  const total = basePoints + bonus;
  return {
    base: basePoints,
    bonus,
    total,
    comboCount: count,
    tierLevel,
    color,
  };
}

/* ── 生成得分飛字動效 ── */
export function spawnFloatingScore(anchor, scoreInfo = {}) {
  if (typeof document === 'undefined') return null;

  const total = scoreInfo.total || 100;
  const bonus = scoreInfo.bonus || 0;
  const comboCount = scoreInfo.comboCount || 0;
  const color = scoreInfo.color || '#10b981';

  let x = (typeof window !== 'undefined' ? window.innerWidth : 800) / 2;
  let y = (typeof window !== 'undefined' ? window.innerHeight : 600) / 2;

  if (anchor && typeof anchor.getBoundingClientRect === 'function') {
    const rect = anchor.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height * 0.35;
    }
  } else {
    const stage = document.querySelector('.question-stage') || document.body;
    if (stage && typeof stage.getBoundingClientRect === 'function') {
      const rect = stage.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }
    }
  }

  // 隨機微小水平偏移，避免連點時完全疊合
  const jitterX = (Math.random() - 0.5) * 16;
  x += jitterX;

  const badge = document.createElement('div');
  badge.className = `floating-score-badge ${bonus > 0 ? 'has-bonus' : ''} tier-${scoreInfo.tierLevel || 1}`;
  badge.style.left = `${Math.round(x)}px`;
  badge.style.top = `${Math.round(y)}px`;
  badge.style.setProperty('--score-color', color);
  badge.setAttribute('aria-hidden', 'true');

  const bonusHtml = bonus > 0
    ? `<span class="score-bonus-pill">Combo ×${comboCount} +${bonus}</span>`
    : `<span class="score-sparkle" aria-hidden="true">✨</span>`;

  badge.innerHTML = `
    <div class="score-float-content">
      <span class="score-plus" aria-hidden="true">+</span>
      <span class="score-num">${total}</span>
      ${bonusHtml}
    </div>
  `;

  document.body.appendChild(badge);

  setTimeout(() => {
    badge.remove();
  }, 1200);

  return badge;
}

/* ── 更新頂部即時得分展示 ── */
export function updateScoreDisplay(session, addedPoints = 0) {
  if (typeof document === 'undefined') return;
  const chip = document.getElementById('level-score-chip');
  if (!chip) return;
  const valEl = chip.querySelector('.score-val');
  if (!valEl) return;

  const currentScore = session?.scorePoints || 0;
  valEl.textContent = String(currentScore);

  chip.classList.remove('score-bump');
  void chip.offsetWidth;
  chip.classList.add('score-bump');
}

/* ── 清理所有畫面中的飛字動效 ── */
export function clearFloatingScores() {
  if (typeof document === 'undefined') return;
  const badges = document.querySelectorAll('.floating-score-badge');
  badges.forEach((el) => el.remove());
}

