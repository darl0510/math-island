/**
 * economy.js — 冒險星幣經濟與魔法道具系統
 * 支援答題星幣累計、智慧仙女棒刪除錯項、守護護盾抵消失誤
 * v3.0.8
 */

/* ══════════════════════════════════════════════
   星幣設定
═══════════════════════════════════════════════ */

/** 每次成功答題（無失誤）得到的基礎星幣 */
const BASE_STAR_COIN_CORRECT = 10;
/** 連擊加成：每 combo 層多 5 枚 */
const COMBO_BONUS_PER_TIER = 5;
/** 答錯（但最終答對）得到的星幣 */
const BASE_STAR_COIN_WRONG_SURVIVE = 3;

/** LocalStorage Key */
const ECONOMY_STORAGE_KEY = 'fantasy-island-economy';

/* ══════════════════════════════════════════════
   道具定義
═══════════════════════════════════════════════ */
export const ITEMS = {
  fairy_wand: {
    id: 'fairy_wand',
    name: '智慧仙女棒',
    icon: '🪄',
    description: '消除一個錯誤選項（剩 3 選 1→3 選擇中去掉一個錯的）',
    cost: 30,
    maxOwned: 3,
  },
  guardian_shield: {
    id: 'guardian_shield',
    name: '守護護盾',
    icon: '🛡️',
    description: '抵消一次失誤，不扣失誤次數（每關最多使用 1 次）',
    cost: 50,
    maxOwned: 3,
  },
};

/* ══════════════════════════════════════════════
   Economy 狀態（持久化）
═══════════════════════════════════════════════ */

function loadEconomy() {
  try {
    const raw = localStorage.getItem(ECONOMY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        totalCoins: parsed.totalCoins || 0,
        items: {
          fairy_wand: Math.min(parsed.items?.fairy_wand ?? 0, ITEMS.fairy_wand.maxOwned),
          guardian_shield: Math.min(parsed.items?.guardian_shield ?? 0, ITEMS.guardian_shield.maxOwned),
        },
      };
    }
  } catch {}
  return { totalCoins: 0, items: { fairy_wand: 0, guardian_shield: 0 } };
}

function saveEconomy(econ) {
  try {
    localStorage.setItem(ECONOMY_STORAGE_KEY, JSON.stringify(econ));
  } catch {}
}

let _economy = loadEconomy();

/** 取得目前持有的星幣數量 */
export function getTotalCoins() {
  return _economy.totalCoins;
}

/** 取得某道具持有數量 */
export function getItemCount(itemId) {
  return _economy.items[itemId] ?? 0;
}

/**
 * 根據答題狀況計算並累積星幣
 * @param {object} session - 引擎 session
 * @returns {number} 本次得到的星幣數量
 */
export function earnCoinsForAnswer(session, correct) {
  let earned = 0;
  if (correct) {
    const comboCount = session.combo?.count ?? 0;
    const comboTierBonus = comboCount >= 12 ? 4
      : comboCount >= 8 ? 3
      : comboCount >= 5 ? 2
      : comboCount >= 3 ? 1 : 0;
    earned = BASE_STAR_COIN_CORRECT + comboTierBonus * COMBO_BONUS_PER_TIER;
  } else {
    // 答錯仍給少量鼓勵幣
    earned = BASE_STAR_COIN_WRONG_SURVIVE;
  }
  _economy.totalCoins += earned;
  saveEconomy(_economy);
  return earned;
}

/**
 * 購買道具（消耗星幣）
 * @returns {{ success: boolean, reason?: string }}
 */
export function buyItem(itemId) {
  const item = ITEMS[itemId];
  if (!item) return { success: false, reason: '未知道具' };
  if (getItemCount(itemId) >= item.maxOwned) return { success: false, reason: '持有已達上限' };
  if (_economy.totalCoins < item.cost) return { success: false, reason: '星幣不足' };
  _economy.totalCoins -= item.cost;
  _economy.items[itemId] = (getItemCount(itemId)) + 1;
  saveEconomy(_economy);
  return { success: true };
}

/**
 * 使用道具（消耗一個道具庫存）
 * @returns {boolean}
 */
export function useItem(itemId) {
  if (getItemCount(itemId) <= 0) return false;
  _economy.items[itemId] -= 1;
  saveEconomy(_economy);
  return true;
}

/* ══════════════════════════════════════════════
   Session 道具狀態（每關重置）
═══════════════════════════════════════════════ */

export function createItemSessionState() {
  return {
    shieldUsedThisLevel: false,  // 護盾每關只能用一次
    wandUsedThisQuestion: false, // 仙女棒每題只能用一次（排除一個選項後）
  };
}

/* ══════════════════════════════════════════════
   仙女棒：消除一個錯誤選項
   傳入當前選項陣列，回傳要隱藏的那個錯誤選項值
═══════════════════════════════════════════════ */

/**
 * 消除一個錯誤選項
 * @param {string[]} options - 所有選項陣列
 * @param {string} answer - 正確答案
 * @returns {string|null} - 應被消除的選項，null 表示失敗
 */
export function pickEliminationTarget(options, answer) {
  const wrongOpts = options.filter(o => String(o) !== String(answer));
  if (wrongOpts.length === 0) return null;
  // 隨機消除一個錯誤選項
  return wrongOpts[Math.floor(Math.random() * wrongOpts.length)];
}

/* ══════════════════════════════════════════════
   UI 渲染：關卡內道具面板（HUD）
═══════════════════════════════════════════════ */

/**
 * 在 topbar 內渲染或更新道具 HUD
 * @param {object} session
 * @param {object} callbacks - { onFairyWand, onShield }
 */
export function renderItemHud(session, callbacks = {}) {
  const topbar = document.querySelector('.level-topbar');
  if (!topbar) return;

  let hud = document.getElementById('item-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'item-hud';
    hud.className = 'item-hud';
    hud.setAttribute('aria-label', '魔法道具欄');
    topbar.appendChild(hud);
  }

  const wandCount = getItemCount('fairy_wand');
  const shieldCount = getItemCount('guardian_shield');
  const shieldUsed = session.itemState?.shieldUsedThisLevel || false;
  const wandUsed = session.itemState?.wandUsedThisQuestion || false;

  hud.innerHTML = `
    <button
      class="item-btn item-wand${wandCount <= 0 || wandUsed ? ' item-btn--disabled' : ''}"
      id="item-btn-wand"
      type="button"
      aria-label="使用智慧仙女棒（持有 ${wandCount} 個）"
      title="🪄 智慧仙女棒：消除一個錯誤選項（剩 ${wandCount} 個）"
      ${wandCount <= 0 || wandUsed ? 'disabled' : ''}
    >
      <span class="item-icon">🪄</span>
      <span class="item-count">${wandCount}</span>
    </button>
    <button
      class="item-btn item-shield${shieldCount <= 0 || shieldUsed ? ' item-btn--disabled' : ''}"
      id="item-btn-shield"
      type="button"
      aria-label="使用守護護盾（持有 ${shieldCount} 個）"
      title="🛡️ 守護護盾：抵消一次失誤（剩 ${shieldCount} 個）${shieldUsed ? ' ─ 本關已用過' : ''}"
      ${shieldCount <= 0 || shieldUsed ? 'disabled' : ''}
    >
      <span class="item-icon">🛡️</span>
      <span class="item-count">${shieldCount}</span>
    </button>
  `;

  // 綁定事件
  const wandBtn = hud.querySelector('#item-btn-wand');
  const shieldBtn = hud.querySelector('#item-btn-shield');

  if (wandBtn && !wandBtn.disabled) {
    wandBtn.addEventListener('click', () => {
      if (typeof callbacks.onFairyWand === 'function') callbacks.onFairyWand();
    });
  }
  if (shieldBtn && !shieldBtn.disabled) {
    shieldBtn.addEventListener('click', () => {
      if (typeof callbacks.onShield === 'function') callbacks.onShield();
    });
  }
}

/* ══════════════════════════════════════════════
   UI 渲染：星幣飛字動效
═══════════════════════════════════════════════ */

/**
 * 在畫面上播放星幣獲得飛字動效
 * @param {HTMLElement} anchor - 動效起點元素
 * @param {number} coins - 獲得的星幣數
 */
export function spawnCoinFlyText(anchor, coins) {
  if (!anchor || coins <= 0) return;
  const rect = anchor.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'coin-fly-text';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = `+${coins} 🌟`;
  el.style.cssText = `
    position: fixed;
    left: ${rect.left + rect.width / 2}px;
    top: ${rect.top}px;
    transform: translate(-50%, 0);
    pointer-events: none;
    z-index: 9999;
  `;
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.classList.add('coin-fly-active');
  });
  setTimeout(() => el.remove(), 1200);
}

/* ══════════════════════════════════════════════
   UI 渲染：星幣商店彈窗（關卡結算後或頂欄按鈕觸發）
═══════════════════════════════════════════════ */

export function showCoinShopModal() {
  // 移除舊彈窗
  document.getElementById('coin-shop-modal')?.remove();

  const econ = loadEconomy();
  const wandCost = ITEMS.fairy_wand.cost;
  const shieldCost = ITEMS.guardian_shield.cost;
  const wandOwned = getItemCount('fairy_wand');
  const shieldOwned = getItemCount('guardian_shield');

  const canBuyWand = econ.totalCoins >= wandCost && wandOwned < ITEMS.fairy_wand.maxOwned;
  const canBuyShield = econ.totalCoins >= shieldCost && shieldOwned < ITEMS.guardian_shield.maxOwned;

  const modal = document.createElement('div');
  modal.id = 'coin-shop-modal';
  modal.className = 'coin-shop-modal-backdrop';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', '魔法道具商店');
  modal.innerHTML = `
    <div class="coin-shop-panel">
      <button class="coin-shop-close" type="button" aria-label="關閉商店">✕</button>
      <div class="coin-shop-header">
        <span class="coin-shop-title">🏪 魔法道具商店</span>
        <div class="coin-shop-balance">
          <span class="coin-shop-balance-icon">🌟</span>
          <span class="coin-shop-balance-val" id="shop-balance-val">${econ.totalCoins}</span>
          <span class="coin-shop-balance-unit">星幣</span>
        </div>
      </div>
      <div class="coin-shop-items">

        <div class="shop-item-card${canBuyWand ? '' : ' shop-item--cant-afford'}">
          <div class="shop-item-icon">🪄</div>
          <div class="shop-item-info">
            <div class="shop-item-name">智慧仙女棒</div>
            <div class="shop-item-desc">消除一個錯誤選項</div>
            <div class="shop-item-owned">持有：${wandOwned} / ${ITEMS.fairy_wand.maxOwned}</div>
          </div>
          <div class="shop-item-action">
            <div class="shop-item-cost">🌟 ${wandCost}</div>
            <button
              class="shop-buy-btn"
              type="button"
              data-item="fairy_wand"
              ${!canBuyWand ? 'disabled' : ''}
              aria-label="購買智慧仙女棒，需要 ${wandCost} 星幣"
            >${wandOwned >= ITEMS.fairy_wand.maxOwned ? '已滿' : !canBuyWand && econ.totalCoins < wandCost ? '不足' : '購買'}</button>
          </div>
        </div>

        <div class="shop-item-card${canBuyShield ? '' : ' shop-item--cant-afford'}">
          <div class="shop-item-icon">🛡️</div>
          <div class="shop-item-info">
            <div class="shop-item-name">守護護盾</div>
            <div class="shop-item-desc">抵消一次失誤（每關 1 次）</div>
            <div class="shop-item-owned">持有：${shieldOwned} / ${ITEMS.guardian_shield.maxOwned}</div>
          </div>
          <div class="shop-item-action">
            <div class="shop-item-cost">🌟 ${shieldCost}</div>
            <button
              class="shop-buy-btn"
              type="button"
              data-item="guardian_shield"
              ${!canBuyShield ? 'disabled' : ''}
              aria-label="購買守護護盾，需要 ${shieldCost} 星幣"
            >${shieldOwned >= ITEMS.guardian_shield.maxOwned ? '已滿' : !canBuyShield && econ.totalCoins < shieldCost ? '不足' : '購買'}</button>
          </div>
        </div>

      </div>
      <div class="coin-shop-tip">💡 答題得星幣，連擊加成更多！</div>
    </div>
  `;

  document.body.appendChild(modal);

  // 關閉
  modal.querySelector('.coin-shop-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  // 購買按鈕
  modal.querySelectorAll('.shop-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.item;
      const result = buyItem(itemId);
      if (result.success) {
        // 播放購買音效（若 audio 可用）
        try { window.__audioModule?.playSfx?.('levelup', 0.6); } catch {}
        showCoinShopModal(); // 重新渲染
      } else {
        btn.classList.add('shop-buy-shake');
        setTimeout(() => btn.classList.remove('shop-buy-shake'), 400);
      }
    });
  });
}

/* ══════════════════════════════════════════════
   結算畫面：星幣獲得總結
═══════════════════════════════════════════════ */

/**
 * 生成結算畫面的星幣獎勵區塊 HTML
 * @param {number} coinsEarned - 本關總獲得星幣
 * @returns {string}
 */
export function coinSummaryMarkup(coinsEarned) {
  if (!coinsEarned || coinsEarned <= 0) return '';
  return `
    <div class="result-coin-summary">
      <span class="result-coin-icon">🌟</span>
      <span class="result-coin-earned">本關獲得 <strong>${coinsEarned}</strong> 星幣</span>
      <span class="result-coin-total">（累計 ${getTotalCoins()} 星幣）</span>
    </div>
  `;
}

/* ══════════════════════════════════════════════
   護盾光環特效
═══════════════════════════════════════════════ */

/** 顯示護盾啟動的視覺特效 */
export function showShieldActivation() {
  document.querySelectorAll('.shield-aura').forEach(el => el.remove());
  const aura = document.createElement('div');
  aura.className = 'shield-aura';
  aura.setAttribute('aria-hidden', 'true');
  aura.innerHTML = `
    <div class="shield-ring"></div>
    <div class="shield-label">🛡️ 守護護盾啟動！</div>
  `;
  document.body.appendChild(aura);
  setTimeout(() => {
    aura.classList.add('shield-fadeout');
    setTimeout(() => aura.remove(), 500);
  }, 1600);
}

/** 顯示仙女棒消除特效 */
export function showWandElimination(eliminatedBtn) {
  if (!eliminatedBtn) return;
  eliminatedBtn.classList.add('wand-eliminated');
  eliminatedBtn.disabled = true;
  eliminatedBtn.setAttribute('aria-label', '已被仙女棒消除');

  // 在按鈕上方播放消除粒子
  const rect = eliminatedBtn.getBoundingClientRect();
  const spark = document.createElement('div');
  spark.className = 'wand-spark';
  spark.setAttribute('aria-hidden', 'true');
  spark.style.cssText = `
    position: fixed;
    left: ${rect.left + rect.width / 2}px;
    top: ${rect.top + rect.height / 2}px;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 9999;
  `;
  spark.innerHTML = '✨🪄✨';
  document.body.appendChild(spark);
  requestAnimationFrame(() => spark.classList.add('wand-spark-animate'));
  setTimeout(() => spark.remove(), 800);
}

