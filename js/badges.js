import { getAllSubjectsSummary, getCurrentGrade, getCurrentSubject } from './state.js';
import { audio } from './audio.js';
import { escapeHtml, launchConfetti, showToast } from './ui.js';

export const BADGE_DEFINITIONS = [
  {
    id: 'first_star',
    name: '冒險第一步',
    category: '入門',
    icon: '🌟',
    description: '在任何科目獲得第 1 顆星星',
    check: (summary) => ({
      current: Math.min(1, summary.totalStars),
      target: 1,
      unlocked: summary.totalStars >= 1,
    }),
  },
  {
    id: 'math_explorer',
    name: '算術新星',
    category: '科目',
    icon: '📐',
    description: '在奇幻數學島累積獲得 10 顆星',
    check: (summary) => {
      const s = summary.subjects.math?.totalStars || 0;
      return {
        current: Math.min(10, s),
        target: 10,
        unlocked: s >= 10,
      };
    },
  },
  {
    id: 'english_explorer',
    name: '字母探險家',
    category: '科目',
    icon: '🔤',
    description: '在奇幻英文島累積獲得 10 顆星',
    check: (summary) => {
      const s = summary.subjects.english?.totalStars || 0;
      return {
        current: Math.min(10, s),
        target: 10,
        unlocked: s >= 10,
      };
    },
  },
  {
    id: 'chinese_scholar',
    name: '識字小狀元',
    category: '科目',
    icon: '📖',
    description: '在奇幻國語島累積獲得 10 顆星',
    check: (summary) => {
      const s = summary.subjects.chinese?.totalStars || 0;
      return {
        current: Math.min(10, s),
        target: 10,
        unlocked: s >= 10,
      };
    },
  },
  {
    id: 'science_explorer',
    name: '小小科學家',
    category: '科目',
    icon: '🔬',
    description: '在奇幻自然科學島累積獲得 10 顆星',
    check: (summary) => {
      const s = summary.subjects.science?.totalStars || 0;
      return {
        current: Math.min(10, s),
        target: 10,
        unlocked: s >= 10,
      };
    },
  },
  {
    id: 'social_explorer',
    name: '地理小博士',
    category: '科目',
    icon: '🧭',
    description: '在奇幻社會島累積獲得 10 顆星',
    check: (summary) => {
      const s = summary.subjects.social?.totalStars || 0;
      return {
        current: Math.min(10, s),
        target: 10,
        unlocked: s >= 10,
      };
    },
  },
  {
    id: 'perfect_striker',
    name: '三星滿貫',
    category: '技巧',
    icon: '👑',
    description: '在任意科目累計獲得 5 個關卡三星滿分評價',
    check: (summary, rawStates) => {
      let perfectCount = 0;
      for (const st of rawStates) {
        for (const starVal of Object.values(st.stars || {})) {
          if (Number(starVal) === 3) perfectCount += 1;
        }
      }
      return {
        current: Math.min(5, perfectCount),
        target: 5,
        unlocked: perfectCount >= 5,
      };
    },
  },
  {
    id: 'perfectionist_hero',
    name: '十全十美傳奇',
    category: '榮耀',
    icon: '🎖️',
    description: '全科目累計達成 10 個關卡三星滿分通關',
    check: (summary, rawStates) => {
      let perfectCount = 0;
      for (const st of rawStates) {
        for (const starVal of Object.values(st.stars || {})) {
          if (Number(starVal) === 3) perfectCount += 1;
        }
      }
      return {
        current: Math.min(10, perfectCount),
        target: 10,
        unlocked: perfectCount >= 10,
      };
    },
  },
  {
    id: 'island_conqueror',
    name: '島嶼開拓者',
    category: '冒險',
    icon: '🏝️',
    description: '任意一座島嶼完整通關 4 道關卡',
    check: (summary, rawStates) => {
      let conquered = 0;
      for (const st of rawStates) {
        const stars = st.stars || {};
        for (let island = 1; island <= 4; island += 1) {
          const startL = (island - 1) * 4 + 1;
          let allDone = true;
          for (let l = startL; l < startL + 4; l += 1) {
            if (!stars[l]) {
              allDone = false;
              break;
            }
          }
          if (allDone) conquered += 1;
        }
      }
      return {
        current: Math.min(1, conquered),
        target: 1,
        unlocked: conquered >= 1,
      };
    },
  },
  {
    id: 'triple_master',
    name: '三冠小學士',
    category: '博學',
    icon: '🎓',
    description: '數學、英文、國語三大主科各至少完成 3 道關卡',
    check: (summary) => {
      const mathL = summary.subjects.math?.completedLevels || 0;
      const engL = summary.subjects.english?.completedLevels || 0;
      const chL = summary.subjects.chinese?.completedLevels || 0;
      const readySubs = [mathL >= 3, engL >= 3, chL >= 3].filter(Boolean).length;
      return {
        current: readySubs,
        target: 3,
        unlocked: readySubs >= 3,
      };
    },
  },
  {
    id: 'all_island_traveler',
    name: '跨島探險家',
    category: '冒險',
    icon: '🗺️',
    description: '在至少 3 個不同領域科目獲得過星星',
    check: (summary) => {
      let activeSubs = 0;
      for (const sub of Object.values(summary.subjects || {})) {
        if ((sub.totalStars || 0) > 0) activeSubs += 1;
      }
      return {
        current: Math.min(3, activeSubs),
        target: 3,
        unlocked: activeSubs >= 3,
      };
    },
  },
  {
    id: 'combo_master',
    name: '連擊大師',
    category: '技巧',
    icon: '⚡',
    description: '在冒險關卡中展現連答神技，達成 5 連擊 Combo',
    check: (summary, rawStates) => {
      let maxCombo = 0;
      for (const st of rawStates) {
        if (st.maxCombo) maxCombo = Math.max(maxCombo, Number(st.maxCombo));
      }
      return {
        current: Math.min(5, maxCombo),
        target: 5,
        unlocked: maxCombo >= 5,
      };
    },
  },
  {
    id: 'practice_champion',
    name: '答題小神童',
    category: '勤奮',
    icon: '💡',
    description: '全科目累計正確答對題目達到 40 題',
    check: (summary, rawStates) => {
      let totalCorrect = 0;
      for (const st of rawStates) {
        totalCorrect += Number(st.totalCorrect || 0);
      }
      return {
        current: Math.min(40, totalCorrect),
        target: 40,
        unlocked: totalCorrect >= 40,
      };
    },
  },
  {
    id: 'stargazer_30',
    name: '群星守護者',
    category: '榮耀',
    icon: '🌌',
    description: '全科全宇宙累積獲得 30 顆星',
    check: (summary) => ({
      current: Math.min(30, summary.totalStars),
      target: 30,
      unlocked: summary.totalStars >= 30,
    }),
  },
  {
    id: 'stargazer_60',
    name: '星空傳奇領主',
    category: '大師',
    icon: '🏆',
    description: '全科全宇宙累積獲得 60 顆星以上',
    check: (summary) => ({
      current: Math.min(60, summary.totalStars),
      target: 60,
      unlocked: summary.totalStars >= 60,
    }),
  },
  {
    id: 'stargazer_100',
    name: '宇宙大導師',
    category: '大師',
    icon: '🌠',
    description: '全科全宇宙累積獲得 100 顆星以上',
    check: (summary) => ({
      current: Math.min(100, summary.totalStars),
      target: 100,
      unlocked: summary.totalStars >= 100,
    }),
  },
  {
    id: 'challenge_master',
    name: '全科全能王',
    category: '榮耀',
    icon: '👑',
    description: '在跨科目期末綜合挑戰島成功通關任何關卡',
    check: (summary, rawStates) => {
      let challengeWins = 0;
      for (const st of rawStates) {
        if (st.subject === 'challenge' || st._isChallenge) {
          challengeWins += Object.keys(st.stars || {}).length;
        }
      }
      return {
        current: Math.min(1, challengeWins),
        target: 1,
        unlocked: challengeWins >= 1,
      };
    },
  },
  {
    id: 'darkon_slayer',
    name: '傳奇終結者 · 征服魔王 Darkon',
    category: '榮耀',
    icon: '👑',
    image: 'assets/boss/badge_legendary_hero.png',
    description: '在期末綜合挑戰第 16 關擊破大魔王 Darkon 三形態破盾並贏得傳奇勝利',
    check: (summary, rawStates) => {
      let challengeLevel16Done = false;
      for (const st of rawStates) {
        if ((st.subject === 'challenge' || st._isChallenge) && st.stars && (st.stars[16] || st.stars['16'])) {
          challengeLevel16Done = true;
          break;
        }
      }
      return {
        current: challengeLevel16Done ? 1 : 0,
        target: 1,
        unlocked: challengeLevel16Done,
      };
    },
  },
];

const STORAGE_KEY_SEEN_BADGES = 'fantasy-math-seen-badges-v1';

function getSeenBadges() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SEEN_BADGES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSeenBadges(badgeIds) {
  try {
    localStorage.setItem(STORAGE_KEY_SEEN_BADGES, JSON.stringify(badgeIds));
  } catch {}
}

function loadAllRawStates() {
  const states = [];
  const subjects = ['math', 'english', 'chinese', 'science', 'social', 'challenge'];
  const grades = [1, 2, 3];
  for (const sub of subjects) {
    for (const g of grades) {
      let key = `fantasy-math-island-progress-${sub}-g${g}-v2`;
      if (sub === 'math') {
        key = g === 1 ? 'fantasy-math-island-progress-v1' : `fantasy-math-island-progress-g${g}-v1`;
      }
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.subject = sub;
          states.push(parsed);
        }
      } catch {}
    }
  }
  return states;
}

export function getBadgesStatus() {
  const summary = getAllSubjectsSummary();
  const rawStates = loadAllRawStates();
  return BADGE_DEFINITIONS.map((def) => {
    const res = def.check(summary, rawStates);
    const progressPercent = Math.min(100, Math.round((res.current / res.target) * 100));
    return {
      ...def,
      current: res.current,
      target: res.target,
      unlocked: res.unlocked,
      progressPercent,
    };
  });
}

export function getUnlockedBadgeCount() {
  const list = getBadgesStatus();
  return list.filter((b) => b.unlocked).length;
}

export function checkNewlyUnlockedBadges() {
  const all = getBadgesStatus();
  const seen = new Set(getSeenBadges());
  const newlyUnlocked = [];

  for (const b of all) {
    if (b.unlocked && !seen.has(b.id)) {
      newlyUnlocked.push(b);
      seen.add(b.id);
    }
  }

  if (newlyUnlocked.length > 0) {
    saveSeenBadges(Array.from(seen));
    if (typeof window !== 'undefined' && typeof window.__syncBadgesUI === 'function') {
      window.__syncBadgesUI();
    }
  }

  return newlyUnlocked;
}

/**
 * 跨島冒險成就解鎖慶祝盛典動效
 * 展現全屏星芒光環、3D 徽章躍出、音效號角與專屬語音賀詞
 */
export function showBadgeUnlockCelebration(newBadges, onDone) {
  const badgesList = Array.isArray(newBadges) ? newBadges : [newBadges];
  if (!badgesList || badgesList.length === 0) {
    onDone?.();
    return;
  }

  let currentIndex = 0;

  const overlay = document.createElement('div');
  overlay.className = 'badge-unlock-modal-overlay';
  document.body.appendChild(overlay);

  function renderCurrentBadge() {
    const badge = badgesList[currentIndex];
    const isLast = currentIndex >= badgesList.length - 1;

    audio.playSfx('levelup', 0.65);
    if (typeof audio.playBadgeUnlockFanfare === 'function') {
      audio.playBadgeUnlockFanfare();
    }
    launchConfetti({ count: 60, spread: 80 });

    const speakText = `太厲害了！恭喜解鎖榮譽成就：【${badge.name}】！${badge.description}`;
    audio.speak(speakText);

    overlay.innerHTML = `
      <div class="badge-unlock-backdrop" aria-hidden="true">
        <div class="badge-unlock-rays"></div>
      </div>
      <div class="badge-unlock-card" role="dialog" aria-modal="true" aria-label="榮譽成就解鎖">
        <div class="badge-unlock-kicker">✨ 榮譽成就解鎖・NEW BADGE UNLOCKED ✨</div>
        ${badgesList.length > 1 ? `<div class="badge-unlock-count">第 ${currentIndex + 1} / ${badgesList.length} 個新成就</div>` : ''}

        <div class="badge-hero-icon-container">
          <div class="badge-hero-halo"></div>
          <div class="badge-hero-bubble">
            ${badge.image ? `<img src="${badge.image}" alt="${escapeHtml(badge.name)}" class="badge-hero-img" style="width:68px;height:68px;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(245,158,11,0.5));" />` : `<span class="badge-hero-emoji">${badge.icon}</span>`}
          </div>
          <div class="badge-hero-sparkles" aria-hidden="true">✨🌟✨</div>
        </div>

        <div class="badge-hero-details">
          <div class="badge-hero-cat-wrap">
            <span class="badge-hero-category">${escapeHtml(badge.category)}成就</span>
          </div>
          <h2 class="badge-hero-name">${escapeHtml(badge.name)}</h2>
          <p class="badge-hero-desc">${escapeHtml(badge.description)}</p>
          <div class="badge-hero-achieved-tag">
            <span class="badge-check-icon">✓</span> 達成條件：${badge.current} / ${badge.target}
          </div>
        </div>

        <div class="badge-unlock-actions">
          <button class="big-btn badge-inspect-atlas-btn" type="button">🏅 查看榮譽圖鑑</button>
          <button class="secondary-btn badge-continue-adventure-btn" type="button">
            ${isLast ? '🌟 繼續冒險' : '下一個成就 ▶'}
          </button>
        </div>
      </div>
    `;

    overlay.querySelector('.badge-inspect-atlas-btn')?.addEventListener('click', () => {
      audio.playSfx('click', 0.5);
      cleanup();
      showBadgesModal();
    });

    overlay.querySelector('.badge-continue-adventure-btn')?.addEventListener('click', () => {
      audio.playSfx('click', 0.5);
      if (!isLast) {
        currentIndex += 1;
        renderCurrentBadge();
      } else {
        cleanup();
        onDone?.();
      }
    });
  }

  function cleanup() {
    overlay.classList.add('fade-out');
    setTimeout(() => {
      overlay.remove();
    }, 280);
  }

  renderCurrentBadge();
}

/**
 * 徽章詳情透視鏡彈窗
 */
export function showBadgeDetailModal(badge) {
  audio.playSfx(badge.unlocked ? 'correct' : 'click', 0.4);
  const detailOverlay = document.createElement('div');
  detailOverlay.className = 'badge-detail-overlay';
  detailOverlay.innerHTML = `
    <div class="badge-detail-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(badge.name)}">
      <button class="round-back badge-detail-close-btn" type="button" aria-label="關閉">✕</button>
      <div class="badge-detail-icon-wrap ${badge.unlocked ? 'is-unlocked' : 'is-locked'}">
        <div class="badge-detail-halo"></div>
        <div class="badge-detail-bubble">${badge.image ? `<img src="${badge.image}" alt="${escapeHtml(badge.name)}" style="width:44px;height:44px;object-fit:contain;" />` : badge.icon}</div>
        ${badge.unlocked ? '<span class="badge-detail-sparkle">✨</span>' : '<span class="badge-detail-lock">🔒</span>'}
      </div>
      <div class="badge-detail-meta">
        <span class="badge-category-tag">${escapeHtml(badge.category)}</span>
        <h3 class="badge-detail-title">${escapeHtml(badge.name)}</h3>
      </div>
      <div class="badge-detail-status-pill ${badge.unlocked ? 'is-unlocked' : 'is-locked'}">
        ${badge.unlocked ? '🌟 已榮譽解鎖・典藏中' : '🔒 努力解鎖中'}
      </div>
      <p class="badge-detail-description">${escapeHtml(badge.description)}</p>

      <div class="badge-detail-progress-box">
        <div class="badge-detail-progress-label">
          <span>解鎖進度</span>
          <strong>${badge.current} / ${badge.target} (${badge.progressPercent}%)</strong>
        </div>
        <div class="badge-detail-track">
          <div class="badge-detail-fill" style="width: ${badge.progressPercent}%"></div>
        </div>
      </div>

      <div class="badge-detail-actions">
        <button class="secondary-btn badge-detail-speech-btn" type="button">🔊 朗讀成就故事</button>
        <button class="big-btn badge-detail-ok-btn" type="button">我知道了</button>
      </div>
    </div>
  `;

  document.body.appendChild(detailOverlay);

  const close = () => {
    detailOverlay.classList.add('fade-out');
    setTimeout(() => detailOverlay.remove(), 250);
  };

  detailOverlay.querySelector('.badge-detail-close-btn').addEventListener('click', close);
  detailOverlay.querySelector('.badge-detail-ok-btn').addEventListener('click', close);
  detailOverlay.addEventListener('click', (e) => {
    if (e.target === detailOverlay) close();
  });

  const speechBtn = detailOverlay.querySelector('.badge-detail-speech-btn');
  speechBtn.addEventListener('click', () => {
    const text = badge.unlocked
      ? `恭喜解鎖榮譽成就：${badge.name}！${badge.description}。已榮獲典藏！`
      : `成就：${badge.name}。解鎖條件：${badge.description}。目前進度：${badge.current} 比 ${badge.target}。再接再厲！`;
    audio.speak(text);
    showToast(badge.unlocked ? `🌟 已獲得【${badge.name}】！` : `🔒【${badge.name}】持續加油！`, badge.icon);
  });
}

/**
 * 跨島榮譽學習徽章圖鑑館
 */
export function showBadgesModal() {
  audio.playSfx('click', 0.45);
  const badges = getBadgesStatus();
  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const totalCount = badges.length;

  const overlay = document.createElement('div');
  overlay.className = 'badges-modal-overlay';
  overlay.innerHTML = `
    <div class="badges-modal-card">
      <div class="badges-modal-header">
        <div class="badges-header-title">
          <span class="badges-header-icon" aria-hidden="true">🏅</span>
          <div>
            <h2>跨島冒險成就圖鑑館</h2>
            <p>探索奇幻學習宇宙，解鎖各島嶼的傳奇榮譽勳章！</p>
          </div>
        </div>
        <button class="round-back" type="button" aria-label="關閉">✕</button>
      </div>

      <div class="badges-stat-bar">
        <div class="badges-stat-progress">
          <div class="badges-progress-label">
            <span>圖鑑典藏進度</span>
            <strong>${unlockedCount} / ${totalCount} 個勳章 (${Math.round((unlockedCount / totalCount) * 100)}%)</strong>
          </div>
          <div class="badges-progress-track">
            <div class="badges-progress-fill" style="width: ${Math.round((unlockedCount / totalCount) * 100)}%"></div>
          </div>
        </div>
      </div>

      <!-- 分類導覽篩選膠囊 -->
      <div class="badges-filter-bar" role="tablist" aria-label="成就分類篩選">
        <button class="badges-filter-pill active" type="button" data-filter="all">🌟 全部 (${totalCount})</button>
        <button class="badges-filter-pill" type="button" data-filter="subject">📐 科目專精</button>
        <button class="badges-filter-pill" type="button" data-filter="adventure">🏝️ 冒險探索</button>
        <button class="badges-filter-pill" type="button" data-filter="skill">⚡ 技巧與勤奮</button>
        <button class="badges-filter-pill" type="button" data-filter="glory">👑 榮譽與大師</button>
      </div>

      <div class="badges-grid">
        ${badges
          .map(
            (b) => `
          <div class="badge-item ${b.unlocked ? 'is-unlocked' : 'is-locked'}" data-badge="${b.id}" data-category="${b.category}" tabindex="0" role="button" aria-label="${escapeHtml(b.name)}">
            <div class="badge-icon-bubble">
              ${b.image ? `<img src="${b.image}" alt="${escapeHtml(b.name)}" style="width:40px;height:40px;object-fit:contain;" />` : `<span class="badge-icon-emoji">${b.icon}</span>`}
              ${b.unlocked ? '<span class="badge-status-sparkle">✨</span>' : '<span class="badge-lock-ico">🔒</span>'}
            </div>
            <div class="badge-info">
              <div class="badge-title-row">
                <span class="badge-category-tag">${escapeHtml(b.category)}</span>
                <span class="badge-name">${escapeHtml(b.name)}</span>
              </div>
              <p class="badge-desc">${escapeHtml(b.description)}</p>
              <div class="badge-mini-progress">
                <div class="badge-mini-track">
                  <div class="badge-mini-fill" style="width: ${b.progressPercent}%"></div>
                </div>
                <span class="badge-mini-text">${b.current} / ${b.target}</span>
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>

      <div class="badges-modal-footer">
        <p class="badges-footer-tip">💡 提示：點擊任何勳章可開啟 3D 透視鏡並朗讀成就故事！</p>
        <button class="big-btn badges-close-btn" type="button">太酷了！</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 250);
  };

  overlay.querySelector('.round-back').addEventListener('click', close);
  overlay.querySelector('.badges-close-btn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // 分類篩選邏輯
  const filterPills = overlay.querySelectorAll('.badges-filter-pill');
  const badgeItems = overlay.querySelectorAll('.badge-item');

  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      audio.playSfx('click', 0.35);
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');

      const filterType = pill.dataset.filter;
      badgeItems.forEach((item) => {
        const cat = item.dataset.category;
        let match = false;
        if (filterType === 'all') match = true;
        else if (filterType === 'subject' && cat === '科目') match = true;
        else if (filterType === 'adventure' && (cat === '冒險' || cat === '入門')) match = true;
        else if (filterType === 'skill' && (cat === '技巧' || cat === '勤奮')) match = true;
        else if (filterType === 'glory' && (cat === '榮耀' || cat === '大師' || cat === '博學')) match = true;

        item.classList.toggle('badge-hidden-by-filter', !match);
      });
    });
  });

  // 點擊勳章開啟 3D 透視鏡
  badgeItems.forEach((item) => {
    item.addEventListener('click', () => {
      const bId = item.dataset.badge;
      const target = badges.find((b) => b.id === bId);
      if (!target) return;
      showBadgeDetailModal(target);
    });
  });

  if (unlockedCount > 0) {
    launchConfetti({ count: 40 });
  }

  if (typeof window !== 'undefined' && typeof window.__syncBadgesUI === 'function') {
    window.__syncBadgesUI();
  }
}
