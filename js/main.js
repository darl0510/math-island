import { getCurrentGrade, setCurrentGrade, getCurrentSubject, setCurrentSubject, subjectProgress, isChallengeUnlocked, getChallengeUnlockStatus } from './state.js';
import { getGradeConfig } from './grades.js';
import { SUBJECTS, getSubjectConfig, isSubjectReady, getSubjectSpeechLang } from './subjects.js';
import { syncGradeLevels } from './levels/index.js';
import { loadQuestionBankForGrade } from './question-bank.js';
import { audio, isIOSDevice } from './audio.js';
import { renderHome, openMap } from './map.js';
import { hasActiveSession, teardownSession, exitLevel } from './engine.js';
import { setScreen, showToast } from './ui.js';
import { loadQuestionBank } from './question-bank.js';
import { showBadgesModal, getUnlockedBadgeCount } from './badges.js';
import { isZhuyinEnabled, toggleZhuyin } from './zhuyin.js';
import { showReportModal } from './poster.js';
import { initStudentProfile } from './student.js';

const musicButton = document.getElementById('music-btn');
const ttsButton = document.getElementById('tts-btn');
const zhuyinButton = document.getElementById('zhuyin-btn');
const iosGuideButton = document.getElementById('ios-guide-btn');
const homeButton = document.getElementById('home-btn');
const badgesButton = document.getElementById('badges-btn');
const reportButton = document.getElementById('report-btn');
const pwaInstallButton = document.getElementById('pwa-install-btn');
const offlineBadge = document.getElementById('offline-badge');

/* ===== PWA 安裝提示與離線狀態即時感知 ===== */
function setupPWAAndOffline() {
  let deferredInstallPrompt = null;

  // 攔截瀏覽器 PWA 原生安裝提示
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (pwaInstallButton) {
      pwaInstallButton.classList.remove('hidden');
    }
  });

  pwaInstallButton?.addEventListener('click', async () => {
    audio.playSfx('click', 0.4);
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('感謝安裝奇幻數學島！', '🎉', 2400);
    }
    deferredInstallPrompt = null;
    pwaInstallButton.classList.add('hidden');
  });

  window.addEventListener('appinstalled', () => {
    if (pwaInstallButton) pwaInstallButton.classList.add('hidden');
    showToast('奇幻數學島已成功安裝到桌面！', '🌟', 3000);
  });

  // 網路狀態變更監聽
  function updateOnlineStatus(isOnline) {
    if (offlineBadge) {
      offlineBadge.classList.toggle('hidden', isOnline);
    }
    if (!isOnline) {
      showToast('進入離線探索模式，所有題庫與教具隨時暢玩！', '⚡', 3200);
    } else {
      showToast('網路連線已恢復！', '🟢', 2000);
    }
  }

  window.addEventListener('offline', () => updateOnlineStatus(false));
  window.addEventListener('online', () => updateOnlineStatus(true));

  // 初始載入時狀態同步
  if (!navigator.onLine && offlineBadge) {
    offlineBadge.classList.remove('hidden');
  }
}

/* ===== 頂部科目切換膠囊 (可收合下拉選單，告別長排佔用空間) ===== */
function syncSubjectUI(subjectId = getCurrentSubject()) {
  const config = getSubjectConfig(subjectId);
  const titleEl = document.getElementById('brand-subject-title');
  if (titleEl) titleEl.textContent = config.brandTitle;
  document.body.dataset.subject = String(config.id);
  audio.setSpeechLang(getSubjectSpeechLang(config.id));

  // 同步膠囊按鈕圖示與簡稱
  const iconEl = document.getElementById('subject-btn-icon');
  const textEl = document.getElementById('subject-btn-text');
  if (iconEl) iconEl.textContent = config.icon;
  if (textEl) textEl.textContent = config.shortName + '島';

  // 同步下拉選單項目選中狀態
  document.querySelectorAll('.subject-dropdown-item').forEach((item) => {
    const sId = item.dataset.subject;
    const isSelected = sId === String(config.id);
    item.classList.toggle('is-selected', isSelected);
    item.setAttribute('aria-pressed', String(isSelected));
  });
}

function renderSubjectDropdown() {
  const menu = document.getElementById('subject-dropdown-menu');
  if (!menu) return;
  menu.innerHTML = `
    <div class="subject-dropdown-header">
      <span>🎒 選擇冒險科目</span>
    </div>
    <div class="subject-dropdown-list">
      ${SUBJECTS.map((subject) => {
        const isChallenge = subject.id === 'challenge';
        const unlocked = !isChallenge || isChallengeUnlocked(getCurrentGrade());
        const stars = subjectProgress(subject.id, getCurrentGrade()).stars;
        return `
          <button class="subject-dropdown-item ${subject.ready ? '' : 'is-soon'} ${subject.id === getCurrentSubject() ? 'is-selected' : ''}" type="button" data-subject="${subject.id}" role="menuitem" title="${subject.name} · ${subject.tagline}">
            <span class="subject-dropdown-icon">${subject.icon}</span>
            <div class="subject-dropdown-info">
              <span class="subject-dropdown-title">${subject.brandTitle}</span>
              <span class="subject-dropdown-desc">${subject.tagline}</span>
            </div>
            ${isChallenge && !unlocked ? '<span class="subject-dropdown-lock">🔒18⭐</span>' : (stars > 0 ? `<span class="subject-dropdown-stars">⭐${stars}</span>` : '')}
          </button>
        `;
      }).join('')}
    </div>
  `;

  menu.querySelectorAll('.subject-dropdown-item').forEach((item) => {
    item.addEventListener('click', async () => {
      const targetSubject = item.dataset.subject;
      const config = getSubjectConfig(targetSubject);
      const subjectMenu = document.getElementById('subject-dropdown-menu');
      const subjectBtn = document.getElementById('subject-dropdown-btn');
      if (subjectMenu) {
        subjectMenu.classList.add('hidden');
        subjectMenu.setAttribute('hidden', '');
      }
      if (subjectBtn) subjectBtn.setAttribute('aria-expanded', 'false');

      if (targetSubject === getCurrentSubject()) {
        showToast(`目前在 ${config.name}：${config.tagline}`, config.icon);
        return;
      }

      if (targetSubject === 'challenge' && !isChallengeUnlocked(getCurrentGrade())) {
        const status = getChallengeUnlockStatus(getCurrentGrade());
        showToast(status.message, '🔒');
        return;
      }

      audio.playSfx('whoosh', 0.5);
      setCurrentSubject(targetSubject);
      syncSubjectUI(targetSubject);

      if (isSubjectReady(targetSubject)) {
        syncGradeLevels(getCurrentGrade(), targetSubject);
        await loadQuestionBankForGrade(getCurrentGrade(), targetSubject);
        showToast(`已切換至 ${config.name}！`, config.icon);
      } else {
        showToast(`${config.name} 即將啟航：${config.tagline}`, '🚀');
      }

      if (window.__syncGradeUI) window.__syncGradeUI(getCurrentGrade());
      if (document.body.dataset.screen === 'home') renderHome();
      else openMap();
    });
  });
}

function init() {
  // 年級切換膠囊按鈕
  const gradeBtn = document.getElementById('grade-dropdown-btn');
  const gradeMenu = document.getElementById('grade-dropdown-menu');

  function syncGradeUI(grade = getCurrentGrade()) {
    const config = getGradeConfig(grade, getCurrentSubject());
    const iconEl = document.getElementById('grade-btn-icon');
    const textEl = document.getElementById('grade-btn-text');
    const subText = document.getElementById('brand-sub-text');
    if (iconEl) iconEl.textContent = config.icon;
    if (textEl) textEl.textContent = config.name;
    if (subText) subText.textContent = grade === 3 ? '小三篇' : (grade === 2 ? '小二篇' : '大冒險');
    document.querySelectorAll('.grade-dropdown-item').forEach(item => {
      item.classList.toggle('is-selected', Number(item.dataset.grade) === Number(grade));
    });
  }

  function syncBadgesCount() {
    const pill = document.getElementById('badge-count-pill');
    const toolsDot = document.getElementById('tools-badge-dot');
    const count = getUnlockedBadgeCount();
    if (pill) {
      pill.textContent = String(count);
      pill.classList.toggle('has-badges', count > 0);
    }
    if (toolsDot) {
      if (count > 0) {
        toolsDot.textContent = String(count);
        toolsDot.classList.remove('hidden');
        toolsDot.removeAttribute('hidden');
      } else {
        toolsDot.textContent = '';
        toolsDot.classList.add('hidden');
        toolsDot.setAttribute('hidden', '');
      }
    }
  }

  window.__syncSubjectUI = () => {
    syncSubjectUI();
    syncBadgesCount();
  };
  window.__syncGradeUI = syncGradeUI;
  window.__syncBadgesUI = syncBadgesCount;

  // 科目切換膠囊按鈕
  const subjectBtn = document.getElementById('subject-dropdown-btn');
  const subjectMenu = document.getElementById('subject-dropdown-menu');

  function setSubjectMenuOpen(open) {
    if (!subjectMenu) return;
    subjectMenu.classList.toggle('hidden', !open);
    if (open) subjectMenu.removeAttribute('hidden');
    else subjectMenu.setAttribute('hidden', '');
    subjectBtn?.setAttribute('aria-expanded', String(open));
  }

  if (subjectBtn && subjectMenu) {
    subjectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = subjectMenu.classList.contains('hidden');
      setSubjectMenuOpen(willOpen);
      // 互斥關閉其他選單
      setGradeMenuOpen(false);
      closeStudentDropdown();
      setToolsMenuOpen(false);
      audio.playSfx('click', 0.3);
    });

    document.addEventListener('click', (e) => {
      if (!subjectMenu.contains(e.target) && e.target !== subjectBtn) {
        setSubjectMenuOpen(false);
      }
    });
  }

  renderSubjectDropdown();
  syncSubjectUI();
  syncGradeUI();
  syncBadgesCount();

  if (gradeBtn && gradeMenu) {
    const setGradeMenuOpen = (open) => {
      gradeMenu.classList.toggle('hidden', !open);
      if (open) gradeMenu.removeAttribute('hidden');
      else gradeMenu.setAttribute('hidden', '');
      gradeBtn.setAttribute('aria-expanded', String(open));
    };

    gradeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = gradeMenu.classList.contains('hidden');
      setGradeMenuOpen(willOpen);
      // 互斥關閉科目、更多工具與學童選單
      setSubjectMenuOpen(false);
      const toolsMenu = document.getElementById('tools-dropdown-menu');
      toolsMenu?.classList.add('hidden');
      toolsMenu?.setAttribute('hidden', '');
      document.getElementById('tools-dropdown-btn')?.setAttribute('aria-expanded', 'false');
      const studentMenu = document.getElementById('student-dropdown-menu');
      studentMenu?.classList.add('hidden');
      studentMenu?.setAttribute('hidden', '');
      document.getElementById('student-dropdown-btn')?.setAttribute('aria-expanded', 'false');
      audio.playSfx('click', 0.3);
    });

    document.addEventListener('click', (e) => {
      if (!gradeMenu.contains(e.target) && e.target !== gradeBtn) {
        setGradeMenuOpen(false);
      }
    });

    gradeMenu.querySelectorAll('.grade-dropdown-item').forEach(item => {
      item.addEventListener('click', async () => {
        const targetGrade = Number(item.dataset.grade);
        setGradeMenuOpen(false);
        if (targetGrade > 3) {
          showToast('該年級冒險島擴充準備中，即將啟航！', '🚀');
          audio.playSfx('click', 0.4);
          return;
        }
        if (targetGrade === getCurrentGrade()) return;

        audio.playSfx('whoosh', 0.5);
        setCurrentGrade(targetGrade);
        syncGradeLevels(targetGrade, getCurrentSubject());
        await loadQuestionBankForGrade(targetGrade, getCurrentSubject());
        syncGradeUI(targetGrade);
        syncSubjectUI();
        showToast(`已切換至 ${getGradeConfig(targetGrade, getCurrentSubject()).name}！`, '🎒');
        if (document.body.dataset.screen === 'home') renderHome();
        else openMap();
      });
    });
  }

  // 更多工具收合下拉選單初始化
  const toolsBtn = document.getElementById('tools-dropdown-btn');
  const toolsMenu = document.getElementById('tools-dropdown-menu');

  if (toolsBtn && toolsMenu) {
    const setToolsMenuOpen = (open) => {
      toolsMenu.classList.toggle('hidden', !open);
      if (open) toolsMenu.removeAttribute('hidden');
      else toolsMenu.setAttribute('hidden', '');
      toolsBtn.setAttribute('aria-expanded', String(open));
    };

    toolsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = toolsMenu.classList.contains('hidden');
      setToolsMenuOpen(willOpen);
      // 互斥關閉科目、年級與學童選單
      setSubjectMenuOpen(false);
      gradeMenu?.classList.add('hidden');
      gradeMenu?.setAttribute('hidden', '');
      gradeBtn?.setAttribute('aria-expanded', 'false');
      const studentMenu = document.getElementById('student-dropdown-menu');
      studentMenu?.classList.add('hidden');
      studentMenu?.setAttribute('hidden', '');
      document.getElementById('student-dropdown-btn')?.setAttribute('aria-expanded', 'false');
      audio.playSfx('click', 0.3);
    });

    document.addEventListener('click', (e) => {
      if (!toolsMenu.contains(e.target) && e.target !== toolsBtn) {
        setToolsMenuOpen(false);
      }
    });

    // 點擊功能選項後自動收合（注音、音樂、語音等開關類切換除外）
    toolsMenu.querySelectorAll('.tools-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const isToggle = ['zhuyin-btn', 'music-btn', 'tts-btn'].includes(item.id);
        if (!isToggle) {
          setToolsMenuOpen(false);
        }
      });
    });
  }

  document.body.dataset.screen = 'home';
  setScreen('home');
  renderHome();
  syncAudioButtons();
  syncZhuyinButton();
  setupPWAAndOffline();
  initStudentProfile();

  badgesButton?.addEventListener('click', () => {
    showBadgesModal();
  });

  reportButton?.addEventListener('click', () => {
    showReportModal();
  });
  window.showReportModal = showReportModal;

  zhuyinButton?.addEventListener('click', () => {
    const on = toggleZhuyin();
    audio.playSfx('click', 0.4);
    syncZhuyinButton();
    showToast(on ? '注音標示已開啟！' : '注音標示已關閉', 'ㄅ', 1400);
  });

  musicButton.addEventListener('click', () => {
    const on = audio.toggleMusic();
    audio.playSfx('click', 0.4);
    syncAudioButtons();
    showToast(on ? '音樂打開囉！' : '音樂休息一下', on ? '🎵' : '🔇', 1400);
  });

  ttsButton.addEventListener('click', () => {
    const on = audio.toggleTts();
    audio.playSfx('click', 0.4);
    syncAudioButtons();
    showToast(on ? '語音讀題打開囉！' : '語音讀題已關閉', on ? '🔊' : '🔈', 1600);
    if (on) audio.speak('語音讀題打開了，我會唸題目給你聽。');
  });

  homeButton.addEventListener('click', () => {
    audio.playSfx('click', 0.4);
    if (hasActiveSession()) {
      exitLevel();
      return;
    }
    if (document.body.dataset.screen === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setScreen('home');
    renderHome();
    audio.playMusic('title');
  });

  if (iosGuideButton) {
    if (isIOSDevice()) {
      iosGuideButton.classList.remove('hidden');
      iosGuideButton.addEventListener('click', () => {
        audio.playSfx('click', 0.4);
        audio.showIOSAudioGuideModal();
      });
      // iOS 設備在使用者進入首頁後，若未看過提示則溫馨引導
      setTimeout(() => {
        audio.checkIOSAudioGuide();
      }, 1800);
    }
  }

  const unlockAudio = () => {
    audio.unlock();
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  window.addEventListener('click', unlockAudio, { once: true });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && hasActiveSession()) exitLevel();
  });

  audio.warmup();
  setTimeout(() => {
    if (!audio.unlocked) {
      document.body.classList.add('needs-tap');
    }
  }, 1200);
}

function syncAudioButtons() {
  if (musicButton) {
    musicButton.classList.toggle('is-off', !audio.musicOn);
    musicButton.setAttribute('aria-pressed', String(audio.musicOn));
    musicButton.title = audio.musicOn ? '關閉背景音樂' : '開啟背景音樂';
  }
  const musicBadge = document.getElementById('music-status-badge');
  if (musicBadge) {
    musicBadge.textContent = audio.musicOn ? '開啟中' : '已關閉';
    musicBadge.className = 'tools-status-badge ' + (audio.musicOn ? 'is-active' : 'is-muted');
  }

  if (ttsButton) {
    ttsButton.classList.toggle('is-off', !audio.ttsOn);
    ttsButton.setAttribute('aria-pressed', String(audio.ttsOn));
    ttsButton.title = audio.ttsOn ? '關閉語音讀題' : '開啟語音讀題';
  }
  const ttsBadge = document.getElementById('tts-status-badge');
  if (ttsBadge) {
    ttsBadge.textContent = audio.ttsOn ? '開啟中' : '已關閉';
    ttsBadge.className = 'tools-status-badge ' + (audio.ttsOn ? 'is-active' : 'is-muted');
  }
}

function syncZhuyinButton() {
  if (!zhuyinButton) return;
  const on = isZhuyinEnabled();
  document.body.classList.toggle('zhuyin-off', !on);
  zhuyinButton.classList.toggle('is-off', !on);
  zhuyinButton.setAttribute('aria-pressed', String(on));
  zhuyinButton.title = on ? '關關注音標示 (目前開啟)' : '開啟注音標示 (目前關閉)';
  const statusBadge = document.getElementById('zhuyin-status-badge');
  if (statusBadge) {
    statusBadge.textContent = on ? '開啟中' : '已關閉';
    statusBadge.className = 'tools-status-badge ' + (on ? 'is-active' : 'is-muted');
  }
}

window.addEventListener('resize', () => {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
});
document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);

async function boot() {
  const grade = getCurrentGrade();
  syncGradeLevels(grade);
  await loadQuestionBankForGrade(grade, getCurrentSubject());
  await audio.loadStaticManifest();
  // 全面預載音訊池 (SFX 及主主題 BGM)
  audio.preloadAllAudio();
  init();
}

boot();

export { openMap, teardownSession };
