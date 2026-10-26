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
    id: 'practice_champion',
    name: '答題小神童',
    category: '勤奮',
    icon: '⚡',
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
  }

  return newlyUnlocked;
}

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
            <h2>榮譽學習徽章館</h2>
            <p>探索奇幻學習宇宙，解鎖屬於你的冒險成就！</p>
          </div>
        </div>
        <button class="round-back" type="button" aria-label="關閉">✕</button>
      </div>

      <div class="badges-stat-bar">
        <div class="badges-stat-progress">
          <div class="badges-progress-label">
            <span>解鎖進度</span>
            <strong>${unlockedCount} / ${totalCount} 個徽章</strong>
          </div>
          <div class="badges-progress-track">
            <div class="badges-progress-fill" style="width: ${Math.round((unlockedCount / totalCount) * 100)}%"></div>
          </div>
        </div>
      </div>

      <div class="badges-grid">
        ${badges
          .map(
            (b) => `
          <div class="badge-item ${b.unlocked ? 'is-unlocked' : 'is-locked'}" data-badge="${b.id}" tabindex="0" role="button" aria-label="${b.name}">
            <div class="badge-icon-bubble">
              <span class="badge-icon-emoji">${b.icon}</span>
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
        <p class="badges-footer-tip">💡 提示：點擊任何徽章可以聆聽徽章介紹喔！</p>
        <button class="big-btn badges-close-btn" type="button">我知道了！</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
  };

  overlay.querySelector('.round-back').addEventListener('click', close);
  overlay.querySelector('.badges-close-btn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelectorAll('.badge-item').forEach((item) => {
    item.addEventListener('click', () => {
      const bId = item.dataset.badge;
      const target = badges.find((b) => b.id === bId);
      if (!target) return;
      audio.playSfx(target.unlocked ? 'correct' : 'click', 0.4);
      const text = target.unlocked
        ? `恭喜解鎖徽章：${target.name}！${target.description}`
        : `徽章：${target.name}。解鎖條件：${target.description}。目前進度：${target.current} 比 ${target.target}。`;
      audio.speak(text);
      showToast(target.unlocked ? `🌟 已獲得【${target.name}】！` : `🔒【${target.name}】再接再厲！`, target.icon);
    });
  });

  if (unlockedCount > 0) {
    launchConfetti({ count: 40 });
  }
}
