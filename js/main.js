import { getCurrentGrade, setCurrentGrade, getCurrentSubject, setCurrentSubject, subjectProgress } from './state.js';
import { getGradeConfig } from './grades.js';
import { SUBJECTS, getSubjectConfig, isSubjectReady, getSubjectSpeechLang } from './subjects.js';
import { syncGradeLevels } from './levels/index.js';
import { loadQuestionBankForGrade } from './question-bank.js';
import { audio } from './audio.js';
import { renderHome, openMap } from './map.js';
import { hasActiveSession, teardownSession, exitLevel } from './engine.js';
import { setScreen, showToast } from './ui.js';
import { loadQuestionBank } from './question-bank.js';

const musicButton = document.getElementById('music-btn');
const ttsButton = document.getElementById('tts-btn');
const homeButton = document.getElementById('home-btn');

/* ===== 頂部科目膠囊 (方案 A：多科目切換大廳) ===== */
function syncSubjectUI(subjectId = getCurrentSubject()) {
  const config = getSubjectConfig(subjectId);
  const titleEl = document.getElementById('brand-subject-title');
  if (titleEl) titleEl.textContent = config.brandTitle;
  document.body.dataset.subject = String(config.id);
  audio.setSpeechLang(getSubjectSpeechLang(config.id));

  document.querySelectorAll('.subject-capsule').forEach((capsule) => {
    const isActive = capsule.dataset.subject === String(config.id);
    capsule.classList.toggle('is-selected', isActive);
    capsule.setAttribute('aria-pressed', String(isActive));
    const badge = capsule.querySelector('.subject-capsule-stars');
    if (badge) {
      const stars = subjectProgress(capsule.dataset.subject, getCurrentGrade()).stars;
      badge.textContent = stars > 0 ? `⭐${stars}` : '';
    }
  });
}

function renderSubjectCapsules() {
  const bar = document.getElementById('subject-capsules');
  if (!bar) return;
  bar.innerHTML = SUBJECTS.map((subject) => `
      <button class="subject-capsule ${subject.ready ? '' : 'is-soon'}" type="button" data-subject="${subject.id}" aria-pressed="false" aria-label="${subject.shortName} ${subject.name}" title="${subject.name} · ${subject.tagline}" style="--subject-color:${subject.color}">
        <span class="subject-capsule-icon" aria-hidden="true">${subject.icon}</span>
        <span class="subject-capsule-name">${subject.shortName}</span>
        <span class="subject-capsule-stars"></span>
      </button>`).join('');

  bar.querySelectorAll('.subject-capsule').forEach((capsule) => {
    capsule.addEventListener('click', async () => {
      const targetSubject = capsule.dataset.subject;
      const config = getSubjectConfig(targetSubject);
      audio.playSfx('click', 0.4);
      if (targetSubject === getCurrentSubject()) {
        showToast(`目前在 ${config.name}：${config.tagline}`, config.icon);
        return;
      }

      setCurrentSubject(targetSubject);
      syncSubjectUI(targetSubject);

      if (isSubjectReady(targetSubject)) {
        audio.playSfx('whoosh', 0.5);
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
  window.__syncSubjectUI = syncSubjectUI;
  window.__syncGradeUI = syncGradeUI;
  renderSubjectCapsules();
  syncSubjectUI();
  syncGradeUI();

  if (gradeBtn && gradeMenu) {
    gradeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !gradeMenu.classList.contains('hidden');
      gradeMenu.classList.toggle('hidden', isOpen);
      gradeBtn.setAttribute('aria-expanded', String(!isOpen));
      audio.playSfx('click', 0.3);
    });

    document.addEventListener('click', (e) => {
      if (!gradeMenu.contains(e.target) && e.target !== gradeBtn) {
        gradeMenu.classList.add('hidden');
        gradeBtn.setAttribute('aria-expanded', 'false');
      }
    });

    gradeMenu.querySelectorAll('.grade-dropdown-item').forEach(item => {
      item.addEventListener('click', async () => {
        const targetGrade = Number(item.dataset.grade);
        gradeMenu.classList.add('hidden');
        gradeBtn.setAttribute('aria-expanded', 'false');
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

  document.body.dataset.screen = 'home';
  setScreen('home');
  renderHome();
  syncAudioButtons();

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

  window.addEventListener('pointerdown', () => {
    audio.unlock();
  }, { once: true });

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
  musicButton.classList.toggle('is-off', !audio.musicOn);
  musicButton.setAttribute('aria-pressed', String(audio.musicOn));
  musicButton.innerHTML = audio.musicOn ? '<span>🎵</span>' : '<span>🔇</span>';
  musicButton.title = audio.musicOn ? '關閉音樂' : '開啟音樂';

  ttsButton.classList.toggle('is-off', !audio.ttsOn);
  ttsButton.setAttribute('aria-pressed', String(audio.ttsOn));
  ttsButton.innerHTML = audio.ttsOn ? '<span>🔊</span>' : '<span>🔈</span>';
  ttsButton.title = audio.ttsOn ? '關閉語音讀題' : '開啟語音讀題';
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
  init();
}

boot();

export { openMap, teardownSession };
