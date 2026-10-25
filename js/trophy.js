import { audio } from './audio.js';
import { completedCount, totalStars, getCurrentGrade, getCurrentSubject } from './state.js';
import { escapeHtml, launchConfetti, fireworks } from './ui.js';
import { showBadgesModal } from './badges.js';
import { getGradeConfig } from './grades.js';

const GRADE_TITLES = {
  1: {
    title: '一年級期末綜合素養全能大師',
    subtitle: '成功征服數、英、中三大領域 16 關跨學科會考！',
    cupEmoji: '🏆',
    badgeIcon: '👑',
  },
  2: {
    title: '二年級跨學科乘風破浪領主',
    subtitle: '乘法、長母音與生活閱讀全面大滿貫！',
    cupEmoji: '🏆',
    badgeIcon: '🌟',
  },
  3: {
    title: '三年級跨領域至尊大成學士',
    subtitle: '大數幾何修辭統整登頂，榮膺最高榮譽金盃！',
    cupEmoji: '🏆',
    badgeIcon: '🎓',
  },
};

export function isTrophyUnlocked(grade = getCurrentGrade(), subject = 'challenge') {
  const count = completedCount(grade, subject);
  return count >= 16;
}

export function showTrophyModal({
  grade = getCurrentGrade(),
  subject = getCurrentSubject(),
  onClosed = null,
  isReplay = false,
} = {}) {
  // 移除既有的 trophy-overlay（避免重複疊加）
  document.querySelectorAll('.trophy-overlay').forEach((el) => el.remove());

  const info = GRADE_TITLES[grade] || GRADE_TITLES[1];
  const gradeConf = getGradeConfig(grade, subject);
  const stars = totalStars(grade, subject);
  const doneCount = completedCount(grade, subject);

  // 音效與慶祝視覺
  audio.playSfx('levelup', 0.9);
  audio.playJingle('victory');
  fireworks({ bursts: 5 });
  launchConfetti({ count: 160, y: 0.35 * window.innerHeight });

  const modal = document.createElement('div');
  modal.className = 'trophy-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', `${info.title} 通關獎盃頒發盛典`);

  modal.innerHTML = `
    <div class="trophy-backdrop"></div>
    <div class="trophy-card" role="document">
      <div class="trophy-rays-container" aria-hidden="true">
        <div class="trophy-rays"></div>
      </div>
      <button class="round-back trophy-close-btn" type="button" aria-label="關閉頒獎視窗">✕</button>

      <div class="trophy-header">
        <div class="trophy-crown-sparkle" aria-hidden="true">✨ ${info.badgeIcon} ✨</div>
        <div class="trophy-cup-wrap">
          <div class="trophy-gold-glow" aria-hidden="true"></div>
          <div class="trophy-gold-cup" aria-hidden="true">🏆</div>
        </div>
        <span class="trophy-kicker">${isReplay ? '★ 期末榮譽金盃回顧 ★' : '🎉 震撼通關！頒發期末最高榮譽 🎉'}</span>
        <h2 class="trophy-title">${escapeHtml(info.title)}</h2>
        <p class="trophy-subtitle">${escapeHtml(info.subtitle)}</p>
      </div>

      <div class="trophy-stats-grid">
        <div class="trophy-stat-card">
          <span class="trophy-stat-icon">🏝️</span>
          <strong class="trophy-stat-val">${doneCount} / 16</strong>
          <span class="trophy-stat-lbl">完成關卡</span>
        </div>
        <div class="trophy-stat-card">
          <span class="trophy-stat-icon">⭐</span>
          <strong class="trophy-stat-val">${stars} / 48</strong>
          <span class="trophy-stat-lbl">會考星星</span>
        </div>
        <div class="trophy-stat-card">
          <span class="trophy-stat-icon">🏅</span>
          <strong class="trophy-stat-val">大滿貫</strong>
          <span class="trophy-stat-lbl">數英中三科融合</span>
        </div>
      </div>

      <div class="trophy-subjects-pill-row">
        <span class="trophy-subj-tag tag-math">🧮 數學邏輯 PASS</span>
        <span class="trophy-subj-tag tag-eng">🔤 英文發音 PASS</span>
        <span class="trophy-subj-tag tag-chi">📖 國語語文 PASS</span>
      </div>

      <div class="trophy-speech-bubble">
        <span class="trophy-mascot-icon">🦊</span>
        <p class="trophy-mascot-words">
          太了不起了！你順利通過了台灣國小 ${gradeConf.name} 期末跨學科綜合會考的所有考驗！你是最棒的探險家！
        </p>
      </div>

      <div class="trophy-actions">
        <button class="big-btn trophy-claim-btn" type="button" id="trophy-claim-btn">
          <span>🏆 榮耀領取金盃</span>
        </button>
        <button class="secondary-btn trophy-badges-btn" type="button" id="trophy-badges-btn">
          <span>🏅 查看榮譽徽章</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 語音祝賀
  if (audio.ttsOn) {
    const greeting = `恭喜你！完成${gradeConf.name}跨科目期末綜合挑戰島所有關卡！獲得期末最高榮譽金盃！你真的太棒了！`;
    setTimeout(() => {
      audio.speak(greeting);
    }, 450);
  }

  const close = () => {
    audio.playSfx('click', 0.4);
    modal.classList.add('is-closing');
    setTimeout(() => {
      modal.remove();
      if (typeof onClosed === 'function') onClosed();
    }, 280);
  };

  modal.querySelector('.trophy-close-btn').addEventListener('click', close);
  modal.querySelector('#trophy-claim-btn').addEventListener('click', close);
  modal.querySelector('#trophy-badges-btn').addEventListener('click', () => {
    close();
    setTimeout(() => {
      showBadgesModal();
    }, 300);
  });

  modal.querySelector('.trophy-backdrop').addEventListener('click', close);
}
