import { audio } from './audio.js';
import { startLevel } from './engine.js';
import { isUnlocked, getState, totalStars, completedCount, unlockedLevel, resetProgress, getAllSubjectsSummary } from './state.js';
import { escapeHtml, setScreen, showToast, starsMarkup } from './ui.js';
import { islands, getLevelById, syncGradeLevels } from './levels/index.js';
import { getGradeConfig, getSubjectGrades } from './grades.js';
import { getCurrentSubject } from './state.js';
import { getSubjectConfig, isSubjectReady } from './subjects.js';
import { getCurrentGrade, setCurrentGrade } from './state.js';
import { loadQuestionBankForGrade } from './question-bank.js';

const ISLAND_IMAGES = {
  1: 'assets/images/island-forest.jpg',
  2: 'assets/images/island-ocean.jpg',
  3: 'assets/images/island-cloud.jpg',
  4: 'assets/images/island-space.jpg',
};

export function renderHome() {
  const screen = document.getElementById('screen-home');
  const grade = getCurrentGrade();
  const subject = getCurrentSubject();
  const subjectConfig = getSubjectConfig(subject);
  const subjectReady = isSubjectReady(subject);
  const subjectGrades = getSubjectGrades(subject);
  const gradeConfig = getGradeConfig(grade, subject);
  syncGradeLevels(grade, subject);
  const state = getState();
  const allSummary = getAllSubjectsSummary();

  const gradeCardsMarkup = subjectGrades.map(g => {
    const isActive = g.id === grade;
    const stars = totalStars(g.id, subject);
    const count = completedCount(g.id, subject);
    const isPrep = g.id > 3;
    return `
      <button class="grade-card ${isActive ? 'is-active' : ''} ${isPrep ? 'is-prep' : ''}" type="button" data-grade="${g.id}">
        <span class="grade-card-icon">${g.icon}</span>
        <div class="grade-card-info">
          <span class="grade-card-name">${escapeHtml(g.name)}</span>
          <span class="grade-card-badge">${escapeHtml(g.badge)}</span>
        </div>
        <div class="grade-card-stats">
          ${isPrep ? '<span class="prep-tag">敬請期待</span>' : `<span>⭐ ${stars} 顆星</span><span>${count} / 16 關</span>`}
        </div>
      </button>
    `;
  }).join('');

  const titleBottomText = grade === 3 ? '三年級篇' : (grade === 2 ? '二年級篇' : '大冒險');
  const mascotText = subjectReady
    ? (grade === 3 ? '小三大數與分數冒險開跑！' : (grade === 2 ? '小二乘法大冒險來囉！' : '準備好一起冒險了嗎？'))
    : `${subjectConfig.name}正在蓋島中，敬請期待！`;

  screen.innerHTML = `
    <div class="home-view">
      <div class="home-backdrop" style="background-image:url('assets/images/hero.jpg')"></div>
      <div class="home-glow"></div>
      <div class="home-content">
        <div class="title-lockup">
          <span class="eyebrow">${escapeHtml(gradeConfig.badge)}</span>
          <h1 class="game-title">
            <span class="title-top">${escapeHtml(subjectConfig.brandTitle)}</span>
            <span class="title-bottom">${titleBottomText}</span>
          </h1>
          <p class="subtitle">${escapeHtml(gradeConfig.subtitle)}</p>
        </div>

        <!-- 年級選擇區 -->
        <div class="home-grade-selector">
          <div class="grade-selector-label">
            <span class="pulse-dot"></span>
            <strong>冒險年級選擇</strong>
            <span class="grade-subtext">隨時切換年級，進度獨立保存</span>
          </div>
          <div class="grade-cards-grid">
            ${gradeCardsMarkup}
          </div>
        </div>

        <div class="home-actions">
          <button class="start-adventure ${subjectReady ? '' : 'is-soon'}" type="button" id="start-adventure" ${subjectReady ? '' : 'disabled'}>
            <span class="start-shine"></span>
            <span class="start-label">${subjectReady ? `進入 ${escapeHtml(gradeConfig.name)} 冒險` : `${escapeHtml(subjectConfig.name)} 即將啟航`}</span>
            <span class="start-icon" aria-hidden="true">${subjectReady ? '🚀' : subjectConfig.icon}</span>
          </button>
          <button class="how-btn" type="button" id="how-btn">怎麼玩？</button>
        </div>
        <div class="home-stats">
          <div class="stat-chip"><span class="stat-emoji">⭐</span><strong>${subjectReady ? totalStars(grade, subject) : 0}</strong><span>顆星</span></div>
          <div class="stat-chip"><span class="stat-emoji">🏝️</span><strong>${subjectReady ? completedCount(grade, subject) : 0}</strong><span>/ 16 關</span></div>
          <div class="stat-chip"><span class="stat-emoji">🎵</span><span>歡樂音樂</span></div>
          <div class="stat-chip"><span class="stat-emoji">🔊</span><span>語音讀題</span></div>
          ${allSummary.totalStars > 0 ? `<div class="stat-chip is-all-summary" title="全科全年級 144 關累積星星總計"><span class="stat-emoji">🏆</span><strong>${allSummary.totalStars}</strong><span>/ 432 全科星</span></div>` : ''}
        </div>
        <p class="home-note">${escapeHtml(gradeConfig.age)} · 建議使用平板或電腦 · 點擊題目旁的 🔊 可以再聽一次</p>
      </div>
      <div class="home-mascot">
        <img src="assets/images/mascot.jpg" alt="狐狸老師" />
        <div class="mascot-bubble">${mascotText}</div>
      </div>
      <div class="floating-symbols" aria-hidden="true">
        ${subjectConfig.symbols.map((symbol) => `<span>${symbol}</span>`).join('')}
      </div>
    </div>
  `;

  // Bind grade cards
  screen.querySelectorAll('.grade-card').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetGrade = Number(btn.dataset.grade);
      if (targetGrade > 3) {
        showToast('該年級冒險島擴充準備中，即將啟航！', '🚀');
        audio.playSfx('click', 0.4);
        return;
      }
      if (targetGrade === getCurrentGrade()) {
        openMap();
        return;
      }
      audio.playSfx('whoosh', 0.5);
      setCurrentGrade(targetGrade);
      syncGradeLevels(targetGrade, getCurrentSubject());
      await loadQuestionBankForGrade(targetGrade, getCurrentSubject());
      if (window.__syncGradeUI) window.__syncGradeUI(targetGrade);
      if (window.__syncSubjectUI) window.__syncSubjectUI();
      showToast(`已切換至 ${getGradeConfig(targetGrade, getCurrentSubject()).name}！`, '🎒');
      renderHome();
    });
  });

  screen.querySelector('#start-adventure').addEventListener('click', () => {
    if (!subjectReady) {
      showToast(`${subjectConfig.name} 即將啟航：${subjectConfig.tagline}`, '🚀');
      audio.playSfx('click', 0.4);
      return;
    }
    audio.unlock();
    audio.playSfx('whoosh', 0.5);
    audio.playMusic('title');
    openMap();
  });

  screen.querySelector('#how-btn').addEventListener('click', () => {
    audio.playSfx('click', 0.5);
    showHowTo();
  });

  if (subjectReady && state.unlocked > 1) {
    const continueButton = document.createElement('button');
    continueButton.className = 'continue-btn';
    continueButton.type = 'button';
    continueButton.innerHTML = `<span>▶</span> 繼續第 ${unlockedLevel()} 關`;
    continueButton.addEventListener('click', () => {
      const level = getLevelById(unlockedLevel());
      if (level) openLevel(level);
    });
    screen.querySelector('.home-actions').appendChild(continueButton);
  }
}

export function openMap() {
  const subject = getCurrentSubject();
  if (!isSubjectReady(subject)) {
    const config = getSubjectConfig(subject);
    showToast(`${config.name} 即將啟航：${config.tagline}`, '🚀');
    setScreen('home');
    renderHome();
    return;
  }
  setScreen('map');
  renderMap();
  audio.playMusic('title');
}

export function renderMap() {
  const screen = document.getElementById('screen-map');
  const grade = getCurrentGrade();
  const subject = getCurrentSubject();
  const gradeConfig = getGradeConfig(grade, subject);
  syncGradeLevels(grade, subject);
  const state = getState();
  const unlocked = unlockedLevel();

  screen.innerHTML = `
    <div class="map-view">
      <div class="map-header">
        <button class="text-btn map-back" type="button" id="map-home">← 回首頁</button>
        <div class="map-heading">
          <span class="eyebrow">${escapeHtml(gradeConfig.badge)} 冒險地圖</span>
          <h1>選擇一座島嶼</h1>
          <p>完成一關，就能解鎖下一關。慢慢來，每一關都可以再玩一次！</p>
        </div>
        <div class="map-summary">
          <span class="summary-star">⭐ ${totalStars(grade, subject)} / 48</span>
          <span class="summary-level">已解鎖 ${unlocked} / 16</span>
        </div>
      </div>
      <div class="island-list">
        ${islands.map((island) => islandMarkup(island, state)).join('')}
      </div>
      <footer class="map-footer">
        <span>🌈 奇幻數學島大冒險</span>
        <span>${escapeHtml(gradeConfig.badge)} · 16 關</span>
        <button class="reset-btn" type="button" id="reset-progress" title="家長用：清除遊戲進度">家長設定：清除進度</button>
      </footer>
    </div>
  `;

  screen.querySelector('#map-home').addEventListener('click', () => {
    audio.playSfx('click', 0.4);
    setScreen('home');
    renderHome();
    audio.playMusic('title');
  });

  screen.querySelector('#reset-progress').addEventListener('click', () => {
    const choice = window.prompt(
      '【家長設定：清除遊戲進度】\n請輸入清除範圍：\n1 = 僅重設當前年級進度\n2 = 重設當前科目全年級進度\n3 = 重設全科目全年級 144 關進度\n(按取消放棄)'
    );
    if (!choice) return;
    if (choice === '3') {
      const ok = window.confirm('確定要清除【全科目全年級 144 關】所有星星與進度嗎？所有紀錄都會歸零！');
      if (!ok) return;
      resetProgress({ scope: 'all' });
      showToast('全科 144 關進度已重新開始！', '🌱');
    } else if (choice === '2') {
      const ok = window.confirm(`確定要清除【${getSubjectConfig(getCurrentSubject()).name}】全年級進度嗎？`);
      if (!ok) return;
      resetProgress({ scope: 'subject' });
      showToast(`${getSubjectConfig(getCurrentSubject()).name} 進度已重新開始！`, '🌱');
    } else if (choice === '1') {
      const ok = window.confirm('確定要清除【目前年級】進度嗎？');
      if (!ok) return;
      resetProgress({ scope: 'current' });
      showToast('目前年級進度已重新開始！', '🌱');
    } else {
      showToast('未輸入有效選項，已取消操作。', 'ℹ️');
      return;
    }
    if (window.__syncSubjectUI) window.__syncSubjectUI();
    renderMap();
  });

  screen.querySelectorAll('.level-card').forEach((card) => {
    card.addEventListener('click', () => {
      const levelId = Number(card.dataset.level);
      const level = getLevelById(levelId);
      if (!level) return;
      if (!isUnlocked(levelId)) {
        audio.playSfx('wrong', 0.35);
        card.classList.add('locked-shake');
        setTimeout(() => card.classList.remove('locked-shake'), 500);
        showToast('先完成前面的關卡，就能解鎖囉！', '🔒');
        audio.speak('先完成前面的關卡，就能解鎖囉！');
        return;
      }
      openLevel(level);
    });
  });
}

function islandMarkup(island, state) {
  const stars = island.levels.reduce((sum, level) => sum + Number(state.stars[level.id] || 0), 0);
  const maxStars = island.levels.length * 3;
  const done = island.levels.filter((level) => state.stars[level.id]).length;
  return `
    <section class="island-card island-${island.theme}" data-island="${island.id}">
      <div class="island-bg" style="background-image:url('${ISLAND_IMAGES[island.id]}')"></div>
      <div class="island-shade"></div>
      <div class="island-header">
        <div class="island-title-wrap">
          <span class="island-emoji" aria-hidden="true">${island.emoji}</span>
          <div>
            <span class="island-kicker">第 ${island.id} 座島嶼</span>
            <h2>${escapeHtml(island.name)}</h2>
            <p>${escapeHtml(island.blurb)}</p>
          </div>
        </div>
        <div class="island-progress-pill">
          <span class="island-stars">⭐ ${stars} / ${maxStars}</span>
          <span class="island-done">${done} / ${island.levels.length} 關完成</span>
        </div>
      </div>
      <div class="level-grid">
        ${island.levels.map((level) => levelCardMarkup(level, state)).join('')}
      </div>
    </section>
  `;
}

function levelCardMarkup(level, state) {
  const unlocked = isUnlocked(level.id);
  const stars = Number(state.stars[level.id] || 0);
  return `
    <button
      class="level-card ${unlocked ? 'unlocked' : 'locked'} ${stars === 3 ? 'perfect' : ''}"
      type="button"
      data-level="${level.id}"
      aria-label="第 ${level.id} 關 ${escapeHtml(level.title)}${unlocked ? '' : '，尚未解鎖'}">
      <span class="level-number">${unlocked ? String(level.id).padStart(2, '0') : '🔒'}</span>
      <span class="level-emoji" aria-hidden="true">${level.emoji}</span>
      <span class="level-title">${escapeHtml(level.title)}</span>
      <span class="level-skill">${escapeHtml(level.skill)}</span>
      <span class="level-stars">${starsMarkup(stars)}</span>
    </button>
  `;
}

function openLevel(level) {
  audio.unlock();
  audio.playSfx('click', 0.55);
  setScreen('level');
  startLevel(level, {
    onExit: () => {
      setScreen('map');
      renderMap();
      if (window.__syncSubjectUI) window.__syncSubjectUI();
      audio.playMusic('title');
    },
  });
}

function showHowTo() {
  const overlay = document.createElement('div');
  overlay.className = 'how-overlay';
  overlay.innerHTML = `
    <div class="how-card">
      <button class="round-back" type="button" aria-label="關閉">✕</button>
      <h2>怎麼玩？</h2>
      <ul class="how-list">
        <li><span>👆</span><div><strong>選一個答案</strong><p>點選四個大按鈕中的答案，也可以按鍵盤 1～4。</p></div></li>
        <li><span>🔊</span><div><strong>聽題目</strong><p>每一題都會自動朗讀，聽不清楚可以再點藍色喇叭。</p></div></li>
        <li><span>💡</span><div><strong>需要幫忙？</strong><p>點「提示」會出現小幫手，答錯也沒關係，可以再試一次。</p></div></li>
        <li><span>⭐</span><div><strong>收集星星</strong><p>一次答對可以拿三顆星，完成關卡就會解鎖下一關。</p></div></li>
        <li><span>🎵</span><div><strong>音樂開關</strong><p>右上角可以開關音樂和語音朗讀。</p></div></li>
      </ul>
      <button class="big-btn" type="button" id="how-close">我知道囉！</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.round-back').addEventListener('click', close);
  overlay.querySelector('#how-close').addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
}
