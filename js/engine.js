import { audio } from './audio.js';
import { applyGentleShake, highlightVisualFocus } from './guidance.js';
import { completeLevel, isUnlocked, getLevelLockInfo, getCurrentSubject, getCurrentGrade } from './state.js';
import { renderVisual, renderStoryVisual } from './visuals.js';
import { clearConfetti, launchConfetti, fireworks, launchLevelClearCelebration, showToast, starsMarkup, spawnStardustCollection, setIslandAmbientTheme } from './ui.js';
import { getLevelById, getIslandByLevel } from './levels/index.js';
import { checkNewlyUnlockedBadges, showBadgeUnlockCelebration, showBadgeDetailModal, showBadgesModal } from './badges.js';
import { getBankQuestions } from './question-bank.js';
import { getMonsterForLevel, getDarkonPhase, BOSS_DARKON } from './monsters.js';
import { shuffle as shuffleArray } from './utils.js';
import { escapeHtml } from './ui.js';
import { showTrophyModal } from './trophy.js';
import { toZhuyinRuby } from './zhuyin.js';
import { uploadLevelRecord, getCurrentStudent } from './student.js';
import { getCurrentCharacter } from './characters.js';
import { renderHeroActionStageMarkup, triggerCharacterVictoryAction, getVictoryFinisherSkill } from './actions.js';

import { PRAISE, ENCOURAGE, getSubjectPraise } from './texts.js';
import {
  createComboState,
  onCorrect,
  onWrong,
  renderComboBar,
  showComboCelebration,
  showComboBreak,
  comboSummaryMarkup,
  calculateQuestionScore,
  spawnFloatingScore,
  updateScoreDisplay,
  clearFloatingScores,
} from './combo.js';
import {
  createItemSessionState,
  earnCoinsForAnswer,
  getItemCount,
  useItem,
  pickEliminationTarget,
  renderItemHud,
  spawnCoinFlyText,
  showShieldActivation,
  showWandElimination,
  coinSummaryMarkup,
  showCoinShopModal,
  getTotalCoins,
} from './economy.js';

const THEMES = { 1: 'forest', 2: 'ocean', 3: 'cloud', 4: 'space' };

export function getLevelTheme(level) {
  if (!level) return 'forest';
  if (level.theme) return level.theme;
  const isl = getIslandByLevel(level.id);
  if (isl && isl.theme) return isl.theme;
  return THEMES[level.island] || 'forest';
}

let activeSession = null;

export function startLevel(level, { onExit } = {}) {
  try {
    setIslandAmbientTheme(getCurrentSubject());
  } catch { }
  if (!level) return;
  if (activeSession) teardownSession();
  clearConfetti();
  const session = {
    level,
    onExit,
    index: 0,
    questions: [],
    mistakes: 0,
    correct: 0,
    perQuestion: 0,
    locked: false,
    started: false,
    keyHandler: null,
    timers: [],
    errors: [],
    startTime: Date.now(),
    combo: createComboState(),
    itemState: createItemSessionState(),
    scorePoints: 0,
    coinsEarned: 0,
    monster: getMonsterForLevel(getCurrentSubject(), level.id, getCurrentGrade()),
  };
  activeSession = session;
  session.questions = buildQuestions(level);
  window.__fantasyMathGame = {
    snapshot: () => (activeSession === session ? {
      levelId: level.id,
      index: session.index,
      total: session.questions.length,
      question: session.questions[session.index] || null,
      mistakes: session.mistakes,
      correct: session.correct,
      monster: session.monster,
      scorePoints: session.scorePoints || 0,

      locked: session.locked,
      finished: session.index >= session.questions.length,
    } : null),
  };
  audio.playMusic(getLevelTheme(level), true);
  later(session, () => prefetchLevelAudio(session), 350);
  renderIntro(session);
}

function later(session, callback, delay) {
  const timer = setTimeout(() => {
    if (activeSession === session) callback();
  }, delay);
  session.timers.push(timer);
  return timer;
}

function clearTimers(session) {
  for (const timer of session.timers) clearTimeout(timer);
  session.timers = [];
}

function renderIntro(session) {
  const { level } = session;
  const screen = document.getElementById('screen-level');
  screen.innerHTML = `
    <div class="level-view theme-${getLevelTheme(level)}">
      <div class="intro-overlay">
        <div class="intro-card">
          <button class="round-back" type="button" data-action="exit" aria-label="回地圖">←</button>
          <div class="intro-emoji" aria-hidden="true">${level.emoji}</div>
      
          <span class="intro-island">第 ${level.island} 島嶼 · 第 ${level.id} 關</span>
          <h1>${escapeHtml(level.title)}</h1>
          <p class="intro-skill">${escapeHtml(level.skill)}</p>
          <p class="intro-text">${escapeHtml(level.intro || '準備好挑戰了嗎？')}</p>
          <button class="big-btn intro-start" type="button" data-action="start">開始挑戰 <span aria-hidden="true">▶</span></button>
          <button class="text-btn" type="button" data-action="exit">先回地圖</button>
        </div>
      </div>
    </div>
  `;
  screen.querySelectorAll('[data-action="exit"]').forEach((button) => button.addEventListener('click', exitLevel));
  screen.querySelector('[data-action="start"]').addEventListener('click', () => {
    audio.playSfx('click', 0.5);
    beginQuestions(session);
  });

  if (audio.ttsOn) later(session, () => audio.speak(level.intro || level.title), 500);
}

function beginQuestions(session) {
  if (session.started) return;
  session.started = true;
  if (!session.questions.length) session.questions = buildQuestions(session.level);
  session.index = 0;
  session.mistakes = 0;
  session.correct = 0;
  session.scorePoints = 0;
  session.coinsEarned = 0;
  session.itemState = createItemSessionState();

  renderLevelShell(session);
  renderComboBar(session);
  renderItemHud(session, makeItemCallbacks(session));
  renderQuestion(session);
  session.keyHandler = (event) => handleKey(session, event);
  window.addEventListener('keydown', session.keyHandler);
}

/* ── 魔法道具回調函式工廠 ── */
function makeItemCallbacks(session) {
  return {
    /* 仙女棒：消除一個錯誤選項 */
    onFairyWand() {
      if (session.locked) return;
      if (session.itemState?.wandUsedThisQuestion) return;
      if (getItemCount('fairy_wand') <= 0) return;

      const question = session.questions[session.index];
      if (!question) return;
      const options = question.currentOptions || question._displayOptions || [];
      const target = pickEliminationTarget(options, question.answer);
      if (!target) return;

      const consumed = useItem('fairy_wand');
      if (!consumed) return;

      if (session.itemState) session.itemState.wandUsedThisQuestion = true;

      // 找到對應按鈕並執行消除特效
      const btn = [...document.querySelectorAll('.answer-btn')]
        .find(b => String(b.dataset.value) === String(target));
      showWandElimination(btn);
      audio.playSfx('click', 0.5);
      setBuddyMood('cheer', '仙女棒閃光！一個錯誤選項消失了✨');

      // 更新 HUD
      renderItemHud(session, makeItemCallbacks(session));
    },

    /* 護盾：抵消一次失誤 */
    onShield() {
      if (session.itemState?.shieldUsedThisLevel) return;
      if (getItemCount('guardian_shield') <= 0) return;

      const consumed = useItem('guardian_shield');
      if (!consumed) return;

      if (session.itemState) session.itemState.shieldUsedThisLevel = true;
      // 標記護盾已啟動，等待下次答錯時觸發
      session.itemState.shieldArmed = true;

      showShieldActivation();
      audio.playSfx('levelup', 0.7);
      setBuddyMood('combo', '🛡️ 守護護盾啟動！下次失誤將被抵消！');

      // 更新 HUD（護盾按鈕禁用）
      renderItemHud(session, makeItemCallbacks(session));
    },
  };
}

function prefetchLevelAudio(session) {
  if (!audio.ttsOn) return;
  for (const question of session.questions) {
    audio.prefetch(question.speak || question.prompt);
    if (question.hint) audio.prefetch(question.hint);
  }
}

function buildQuestions(level) {
  const bank = getBankQuestions(level.id);
  if (bank) {
    return shuffleArray(bank).slice(0, 6);
  }

  let questions = [];
  try {
    questions = level.makeQuestions(6) || [];
  } catch (error) {
    console.error('[level] 出題失敗', error);
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    questions = [{
      prompt: '遊戲準備中，請回首頁再試一次。',
      speak: '遊戲準備中，請回首頁再試一次。',
      hint: '回首頁重新進入這一關。',
      explanation: '沒有收到題目。',
      answer: '好',
      options: ['好', '再試一次', '回地圖', '重新開始'],
      visual: null,
    }];
  }
  return questions.slice(0, 6);
}

function renderMonsterBattleBadge(monster, session = null) {
  if (!monster) return '';

  // 終極魔王 Darkon 三階段專屬戰鬥 HUD 渲染
  if (monster.isDarkon) {
    const curCorrect = session ? (session.correct || 0) : 0;
    const currentPhase = getDarkonPhase(curCorrect);
    const phaseIdx = currentPhase.phase - 1;
    const shieldMax = 2;
    const curShieldHp = Math.max(0, 2 - (curCorrect - phaseIdx * 2));
    const shieldPct = Math.round((curShieldHp / shieldMax) * 100);

    return `
      <aside class="monster-battle-badge is-boss is-darkon" id="monster-battle-badge" role="region" aria-label="終極魔王：Darkon ${escapeHtml(currentPhase.name)}" title="終極大魔王 Darkon (三階段破盾戰，點擊可互動)">
        <div class="monster-badge-aura darkon-aura" style="--phase-color: ${currentPhase.themeColor};"></div>
        <div class="monster-avatar-wrap darkon-avatar-wrap">
          <img src="${escapeHtml(currentPhase.image)}" alt="Darkon" class="monster-avatar-img darkon-avatar-img" id="darkon-avatar-img" onerror="this.onerror=null;this.src='assets/boss/boss_darkon_main.png'" />
          <span class="monster-role-tag darkon-tag">💀 終極魔王</span>
        </div>
        <div class="monster-badge-detail darkon-badge-detail">
          <div class="darkon-phase-title-row">
            <span class="darkon-phase-badge" id="darkon-phase-badge">階段 ${currentPhase.phase}/3</span>
            <span class="monster-badge-name" id="darkon-name-text">${escapeHtml(currentPhase.name)}</span>
          </div>
          <div class="darkon-phase-steps">
            <span class="darkon-step-dot ${curCorrect >= 2 ? 'is-broken' : (phaseIdx === 0 ? 'is-active' : '')}" title="階段 1：幾何算術護盾">📐</span>
            <span class="darkon-step-line ${curCorrect >= 2 ? 'is-broken' : ''}"></span>
            <span class="darkon-step-dot ${curCorrect >= 4 ? 'is-broken' : (phaseIdx === 1 ? 'is-active' : '')}" title="階段 2：自然發音語彙盾">🔤</span>
            <span class="darkon-step-line ${curCorrect >= 4 ? 'is-broken' : ''}"></span>
            <span class="darkon-step-dot ${curCorrect >= 6 ? 'is-broken' : (phaseIdx === 2 ? 'is-active' : '')}" title="階段 3：萬象千字水墨盾">📖</span>
          </div>
          <div class="monster-hp-bar-container darkon-shield-container" title="${currentPhase.shieldName}：${curShieldHp}/${shieldMax}">
            <div class="monster-hp-track darkon-shield-track">
              <div class="monster-hp-fill darkon-shield-fill" id="monster-hp-fill" style="width:${shieldPct}%; background:${currentPhase.themeColor};"></div>
            </div>
            <span class="monster-hp-text darkon-shield-text" id="monster-hp-text">${currentPhase.shieldName} 🛡️ ${curShieldHp}/${shieldMax}</span>
          </div>
        </div>
        <div class="monster-speech-bubble" id="monster-speech-bubble" hidden></div>
        <div class="monster-hit-sparks" id="monster-hit-sparks" aria-hidden="true"></div>
      </aside>
    `;
  }

  const isBoss = Boolean(monster.isBoss);
  const isMiniBoss = Boolean(monster.isMiniBoss);
  const roleClass = isBoss ? 'is-boss' : (isMiniBoss ? 'is-miniboss' : '');
  const roleLabel = isBoss ? '👑 魔王' : (isMiniBoss ? '⚡ 菁英' : '👾 守護');
  const roleTitle = isBoss ? '關卡大魔王' : (isMiniBoss ? '守護小隊長' : '關卡守護獸');
  const maxHp = session?.questions?.length || 6;
  const curHp = session ? Math.max(0, maxHp - (session.correct || 0)) : maxHp;
  const pct = Math.max(0, Math.min(100, Math.round((curHp / maxHp) * 100)));
  const hpClass = pct > 50 ? 'hp-high' : (pct > 25 ? 'hp-mid' : 'hp-low');

  return `
    <aside class="monster-battle-badge ${roleClass}" id="monster-battle-badge" role="region" aria-label="守護怪獸：${escapeHtml(monster.name)}" title="${escapeHtml(monster.title || monster.name)} (點擊可互動)">
      <div class="monster-badge-aura"></div>
      <div class="monster-avatar-wrap">
        <img src="${escapeHtml(monster.image)}" alt="${escapeHtml(monster.name)}" class="monster-avatar-img" onerror="this.onerror=null;this.src='assets/monsters/mob_math_slime.png'" />
        <span class="monster-role-tag" title="${roleTitle}">${roleLabel}</span>
      </div>
      <div class="monster-badge-detail">
        <span class="monster-badge-name">${escapeHtml(monster.name)}</span>
        <div class="monster-hp-bar-container" title="怪獸耐久度：${curHp}/${maxHp}">
          <div class="monster-hp-track">
            <div class="monster-hp-fill ${hpClass}" id="monster-hp-fill" style="width:${pct}%"></div>
          </div>
          <span class="monster-hp-text" id="monster-hp-text">HP ${curHp}/${maxHp}</span>
        </div>
      </div>
      <div class="monster-speech-bubble" id="monster-speech-bubble" hidden></div>
      <div class="monster-hit-sparks" id="monster-hit-sparks" aria-hidden="true"></div>
    </aside>
  `;
}

export function updateMonsterHp(session) {
  if (!session) return;
  const badge = document.getElementById('monster-battle-badge');
  if (!badge) return;

  // Darkon 三階段動態更新
  if (session.monster?.isDarkon) {
    const curCorrect = session.correct || 0;
    const currentPhase = getDarkonPhase(curCorrect);
    const phaseIdx = currentPhase.phase - 1;
    const shieldMax = 2;
    const curShieldHp = Math.max(0, 2 - (curCorrect - phaseIdx * 2));
    const shieldPct = Math.round((curShieldHp / shieldMax) * 100);

    const img = document.getElementById('darkon-avatar-img');
    const phaseBadge = document.getElementById('darkon-phase-badge');
    const nameText = document.getElementById('darkon-name-text');
    const fill = document.getElementById('monster-hp-fill');
    const text = document.getElementById('monster-hp-text');
    const aura = badge.querySelector('.darkon-aura');

    if (img && curCorrect < 6) {
      if (img.getAttribute('src') !== currentPhase.image) {
        img.src = currentPhase.image;
      }
    }
    if (phaseBadge) phaseBadge.textContent = `階段 ${currentPhase.phase}/3`;
    if (nameText) nameText.textContent = currentPhase.name;
    if (aura) aura.style.setProperty('--phase-color', currentPhase.themeColor);

    const dots = badge.querySelectorAll('.darkon-step-dot');
    const lines = badge.querySelectorAll('.darkon-step-line');
    if (dots.length >= 3) {
      dots[0].className = `darkon-step-dot ${curCorrect >= 2 ? 'is-broken' : (phaseIdx === 0 ? 'is-active' : '')}`;
      dots[1].className = `darkon-step-dot ${curCorrect >= 4 ? 'is-broken' : (phaseIdx === 1 ? 'is-active' : '')}`;
      dots[2].className = `darkon-step-dot ${curCorrect >= 6 ? 'is-broken' : (phaseIdx === 2 ? 'is-active' : '')}`;
    }
    if (lines.length >= 2) {
      lines[0].className = `darkon-step-line ${curCorrect >= 2 ? 'is-broken' : ''}`;
      lines[1].className = `darkon-step-line ${curCorrect >= 4 ? 'is-broken' : ''}`;
    }

    if (fill) {
      fill.style.width = `${shieldPct}%`;
      fill.style.background = currentPhase.themeColor;
    }
    if (text) {
      text.textContent = `${currentPhase.shieldName} 🛡️ ${curShieldHp}/${shieldMax}`;
    }
    if (curCorrect >= 6) {
      badge.classList.add('is-defeated');
      if (img) img.src = 'assets/boss/boss_darkon_main.png';
    }
    return;
  }

  const maxHp = session.questions?.length || 6;
  const curHp = Math.max(0, maxHp - (session.correct || 0));
  const fill = document.getElementById('monster-hp-fill');
  const text = document.getElementById('monster-hp-text');
  const pct = Math.max(0, Math.min(100, Math.round((curHp / maxHp) * 100)));
  if (fill) {
    fill.style.width = `${pct}%`;
    fill.classList.remove('hp-high', 'hp-mid', 'hp-low');
    if (pct > 50) fill.classList.add('hp-high');
    else if (pct > 25) fill.classList.add('hp-mid');
    else fill.classList.add('hp-low');
  }
  if (text) {
    text.textContent = `HP ${curHp}/${maxHp}`;
  }
  if (curHp <= 0) {
    badge.classList.add('is-defeated');
  }
}

export function showMonsterSpeech(text, mood = 'neutral', duration = 2400) {
  const bubble = document.getElementById('monster-speech-bubble');
  const badge = document.getElementById('monster-battle-badge');
  if (!bubble || !text) return;
  bubble.textContent = text;
  bubble.className = `monster-speech-bubble mood-${mood}`;
  bubble.hidden = false;

  if (badge && badge._speechTimer) {
    clearTimeout(badge._speechTimer);
  }
  const timer = setTimeout(() => {
    bubble.classList.add('is-fading');
    setTimeout(() => {
      bubble.hidden = true;
      bubble.classList.remove('is-fading');
    }, 280);
  }, duration);
  if (badge) badge._speechTimer = timer;
}

const MONSTER_TAUNT_QUOTES = [
  '嘿嘿！這題被我難倒了吧～😈',
  '哈哈！看我的干擾迷霧！🌀',
  '想破我的防禦可沒那麼簡單！🛡️',
  '再來一題！看你能不能算出來！⚡',
  '哇哈哈～再仔細想一想喔！✨',
  '差一點點～再推敲一下！🧐',
];

const MONSTER_HIT_QUOTES = [
  '嗚哇！好痛～被你解開了！💥',
  '可惡！好強大的算術光芒！✨',
  '哎呀！防禦被突破了！🛡️',
  '好厲害…耐久度下降了！⚡',
  '哇！竟然連這題都會！🌟',
];

export function pickTauntQuote(monster, session = null) {
  if (monster?.isDarkon) {
    const curCorrect = session ? (session.correct || 0) : 0;
    const phase = getDarkonPhase(curCorrect);
    return phase.tauntQuote || '混沌之力是不可動搖的！';
  }
  if (monster && monster.tauntQuote) return monster.tauntQuote;
  return MONSTER_TAUNT_QUOTES[Math.floor(Math.random() * MONSTER_TAUNT_QUOTES.length)];
}

export function pickHitQuote(monster, session = null) {
  if (monster?.isDarkon) {
    const curCorrect = session ? (session.correct || 0) : 0;
    const phase = getDarkonPhase(curCorrect);
    return phase.hitQuote || '唔！這股智慧力量…！';
  }
  if (monster && monster.hitQuote) return monster.hitQuote;
  return MONSTER_HIT_QUOTES[Math.floor(Math.random() * MONSTER_HIT_QUOTES.length)];
}

export function triggerMonsterHitEffect(session) {
  const badge = document.getElementById('monster-battle-badge');
  if (!badge) return;
  badge.classList.remove('monster-hit', 'monster-gloating', 'monster-wiggle');
  void badge.offsetWidth;
  badge.classList.add('monster-hit');
  updateMonsterHp(session);
  spawnMonsterHitStars(badge);
  showMonsterSpeech(pickHitQuote(session.monster, session), 'hit', 2200);
}

export function triggerMonsterGloatEffect(session) {
  const badge = document.getElementById('monster-battle-badge');
  if (!badge) return;
  badge.classList.remove('monster-hit', 'monster-gloating', 'monster-wiggle');
  void badge.offsetWidth;
  badge.classList.add('monster-gloating');
  showMonsterSpeech(pickTauntQuote(session.monster, session), 'gloat', 2500);
}

/**
 * 終極魔王 Darkon 破盾震撼演出
 * @param {object} session 當前遊戲 Session
 * @param {number} brokenPhaseNum 破盾階段 (1, 2, 3)
 */
export function triggerDarkonShieldBreak(session, brokenPhaseNum) {
  const brokenPhase = BOSS_DARKON.phases[brokenPhaseNum - 1];
  const nextPhase = BOSS_DARKON.phases[brokenPhaseNum] || null;

  audio.playSfx('levelup', 1.0);
  audio.playSfx('whoosh', 0.9);
  launchConfetti({ count: 140, y: window.innerHeight * 0.28 });

  // 畫面震顫衝擊波
  const levelView = document.querySelector('.level-view') || document.body;
  levelView.classList.remove('boss-screen-shake');
  void levelView.offsetWidth;
  levelView.classList.add('boss-screen-shake');

  // 移除既有破盾橫幅
  const oldBanner = document.querySelector('.darkon-break-banner');
  if (oldBanner) oldBanner.remove();

  const banner = document.createElement('div');
  banner.className = 'darkon-break-banner';
  banner.setAttribute('role', 'alert');
  banner.innerHTML = `
    <div class="darkon-break-content">
      <div class="darkon-break-icon">💥</div>
      <div class="darkon-break-kicker">✦ SHIELD BREAK 破盾突破 ✦</div>
      <h3 class="darkon-break-title">${escapeHtml(brokenPhase.breakTitle)}</h3>
      <p class="darkon-break-desc">${nextPhase ? `Darkon 形態轉換 ➔ 【${escapeHtml(nextPhase.name)}】！` : '終極魔王所有護盾全部瓦解！'}</p>
    </div>
  `;
  levelView.appendChild(banner);

  setTimeout(() => {
    banner.classList.add('fade-out');
    setTimeout(() => banner.remove(), 400);
  }, 2300);

  // 魔王台詞朗讀與氣泡
  const breakVoice = brokenPhase.breakQuote;
  showMonsterSpeech(breakVoice, 'hit', 3000);
  audio.speak(breakVoice);

  updateMonsterHp(session);
}

function spawnMonsterHitStars(badge) {
  const container = badge.querySelector('.monster-hit-sparks') || badge;
  const starIcons = ['⭐', '✨', '🌟', '💫', '💥'];
  const count = 7;
  for (let i = 0; i < count; i += 1) {
    const star = document.createElement('span');
    star.className = 'monster-spark-star';
    star.textContent = starIcons[i % starIcons.length];
    const angle = (i / count) * 2 * Math.PI + (Math.random() * 0.4 - 0.2);
    const dist = 32 + Math.random() * 38;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 10;
    star.style.setProperty('--tx', `${tx}px`);
    star.style.setProperty('--ty', `${ty}px`);
    star.style.animationDelay = `${Math.random() * 60}ms`;
    container.appendChild(star);
    setTimeout(() => {
      try { star.remove(); } catch { }
    }, 850);
  }
}

function renderMonsterDefeatCard(monster) {
  if (!monster) return '';

  // 終極魔王 Darkon 專屬通關英雄結算卡
  if (monster.isDarkon) {
    return `
      <div class="result-monster-defeat-card is-boss is-darkon-defeat">
        <div class="defeat-ribbon darkon-ribbon">
          <span class="defeat-icon">👑</span>
          <span class="defeat-text">震撼通關！終極大魔王 Darkon 被你徹底淨化！</span>
        </div>
        <div class="defeat-body darkon-defeat-body">
          <div class="defeat-avatar-box darkon-avatar-large">
            <img src="assets/boss/boss_darkon_main.png" alt="Darkon 淨化形態" class="defeat-avatar-img darkon-defeat-img" onerror="this.onerror=null;this.src='assets/boss/boss_darkon_main.png'" />
            <span class="defeat-stamp darkon-stamp">PURIFIED</span>
          </div>
          <div class="defeat-speech-box">
            <div class="defeat-monster-head">
              <strong class="defeat-monster-name">混沌暗影魔王 達爾肯 (Darkon · 淨化歸真)</strong>
              <span class="defeat-monster-sub">數·英·中三形態護盾全面擊破 · 奇幻島和平守護者</span>
            </div>
            <p class="defeat-quote-text">「${escapeHtml(monster.defeatQuote || '太不可思議了…數、英、中三科智慧合一，世界重獲光明！')}」</p>
          </div>
        </div>
        <div class="darkon-legendary-reward-card">
          <img src="assets/boss/badge_legendary_hero.png" alt="傳奇英雄榮譽徽章" class="legendary-badge-reward-img" />
          <div class="legendary-reward-text">
            <span class="legendary-reward-title">👑 榮獲【傳奇英雄金質勳章】！</span>
            <p class="legendary-reward-desc">數英中三大領域全方位通關認證，已永久登錄小勇士榮譽殿堂！</p>
          </div>
        </div>
      </div>
    `;
  }

  const isBoss = Boolean(monster.isBoss);
  const quote = monster.defeatQuote || monster.quote || '太佩服你了，你的算術智慧解答了一切！';
  return `
    <div class="result-monster-defeat-card ${isBoss ? 'is-boss' : ''}">
      <div class="defeat-ribbon">
        <span class="defeat-icon">⚔️</span>
        <span class="defeat-text">成功擊退守護怪獸！</span>
      </div>
      <div class="defeat-body">
        <div class="defeat-avatar-box">
          <img src="${escapeHtml(monster.image)}" alt="${escapeHtml(monster.name)}" class="defeat-avatar-img" onerror="this.onerror=null;this.src='assets/monsters/mob_math_slime.png'" />
          <span class="defeat-stamp">DEFEATED</span>
        </div>
        <div class="defeat-speech-box">
          <div class="defeat-monster-head">
            <strong class="defeat-monster-name">${escapeHtml(monster.name)}</strong>
            <span class="defeat-monster-sub">${escapeHtml(monster.title || '')}</span>
          </div>
          <p class="defeat-quote-text">「${escapeHtml(quote)}」</p>
        </div>
      </div>
    </div>
  `;
}

function renderLevelShell(session) {
  const { level, monster } = session;
  const screen = document.getElementById('screen-level');
  screen.innerHTML = `
    <div class="level-view theme-${getLevelTheme(level)}">
      <div class="level-topbar">
        <button class="round-back" type="button" data-action="exit" aria-label="回地圖">←</button>
        <div class="level-progress">
          <div class="progress-track"><div class="progress-fill" style="width:0%"></div></div>
          <span class="progress-label">1 / ${session.questions.length}</span>
        </div>
        <div class="level-score-chip" id="level-score-chip" aria-live="polite" title="累計冒險得分">
          <span class="score-icon" aria-hidden="true">⭐</span>
          <span class="score-val">${session.scorePoints || 0}</span>
          <span class="score-unit">分</span>
        </div>
        <button class="hint-top" type="button" data-action="hint">💡 提示</button>
      </div>

      <div class="question-stage">
        <article class="question-card">
          ${renderMonsterBattleBadge(monster, session)}
          <div class="question-meta">
            <span class="meta-chip">第 ${level.id} 關</span>
            <span class="meta-chip soft">${escapeHtml(level.skill)}</span>
          </div>
          <div class="prompt-row">
            <h2 class="question-prompt" id="question-prompt">題目載入中…</h2>
            <button class="icon-btn speak-btn" type="button" data-action="speak" aria-label="唸題目給我聽">🔊</button>
          </div>
          <div class="visual-zone" id="visual-zone"></div>
          <div class="hint-box" id="hint-box" hidden>
            <span class="hint-icon" aria-hidden="true">💡</span>
            <p id="hint-text"></p>
            <button class="icon-btn hint-speak" type="button" data-action="speak-hint" aria-label="唸提示給我聽">🔊</button>
          </div>
          <div class="answer-grid" id="answer-grid" role="group" aria-label="答案選項"></div>
          <div class="feedback" id="feedback" role="status" aria-live="polite"></div>
        </article>
        <div class="buddy" id="mascot-buddy" aria-hidden="true">
          <div class="buddy-avatar-wrap">
            <img src="assets/images/mascot.jpg" alt="" class="buddy-img" />
            <span class="buddy-mood-badge" id="buddy-mood-badge">✨</span>
          </div>
          <span class="buddy-bubble" id="buddy-bubble">加油！</span>
        </div>
      </div>
      <div class="sr-only" id="level-live" aria-live="polite"></div>
    </div>
  `;
  screen.querySelectorAll('[data-action="exit"]').forEach((button) => button.addEventListener('click', exitLevel));
  screen.querySelector('[data-action="hint"]').addEventListener('click', () => showHint(session, true));
  screen.querySelector('[data-action="speak"]').addEventListener('click', () => {
    const question = session.questions[session.index];
    audio.playSfx('click', 0.4);
    const displayOptions = question.currentOptions || question._displayOptions;
    if (typeof audio.playQuestionAudio === 'function') {
      audio.playQuestionAudio(question, displayOptions);
    } else {
      audio.speak(question.speak || question.prompt);
    }
  });
  screen.querySelector('[data-action="speak-hint"]').addEventListener('click', () => {
    const question = session.questions[session.index];
    audio.playSfx('click', 0.4);
    audio.speak(question.hint);
  });

  const monsterBadge = screen.querySelector('#monster-battle-badge');
  if (monsterBadge) {
    monsterBadge.addEventListener('click', () => {
      monsterBadge.classList.remove('monster-wiggle');
      void monsterBadge.offsetWidth;
      monsterBadge.classList.add('monster-wiggle');
      audio.playSfx('click', 0.35);
      let quote = session.monster?.quote || session.monster?.title || '我是守護這關的小怪獸，加油喔！🐾';
      if (session.monster?.isDarkon) {
        const curPhase = getDarkonPhase(session.correct || 0);
        quote = curPhase.quote || quote;
      }
      showMonsterSpeech(quote, 'neutral', 2200);
    });
  }
}

function renderQuestion(session) {
  clearConfetti();
  // 切換至新題目時，立即中斷上一題殘留的朗讀佇列
  audio.stopSpeech();
  const question = session.questions[session.index];
  session.perQuestion = 0;
  session.locked = false;
  session.advancing = false;

  // 每題重置仙女棒使用狀態並更新道具 HUD
  if (session.itemState) session.itemState.wandUsedThisQuestion = false;
  renderItemHud(session, makeItemCallbacks(session));

  const prompt = document.getElementById('question-prompt');
  const visualZone = document.getElementById('visual-zone');
  const answerGrid = document.getElementById('answer-grid');
  const feedback = document.getElementById('feedback');
  const hintBox = document.getElementById('hint-box');
  const hintText = document.getElementById('hint-text');
  const buddy = document.getElementById('buddy-bubble');

  // 提前隨機化選項並記錄於題目物件上，確保視覺元件朗讀按鈕與語音序列 100% 依序對應畫面選項
  const options = question._displayOptions || shuffleOptions(question);
  question._displayOptions = options;
  question.currentOptions = options;

  prompt.innerHTML = toZhuyinRuby(question.prompt, question);
  feedback.className = 'feedback';
  feedback.innerHTML = '';
  hintBox.hidden = true;
  hintText.innerHTML = toZhuyinRuby(question.hint || '仔細看一看題目。', question);
  setBuddyMood('cheer', pickBuddy(session.index));

  visualZone.innerHTML = '';
  const visual = renderVisual(question.visual, question) || renderStoryVisual(question, session.level);
  if (visual) visualZone.appendChild(visual);

  answerGrid.innerHTML = '';
  options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'answer-btn';
    button.dataset.value = String(option);
    button.style.animationDelay = `${index * 70}ms`;
    const emoji = optionEmojis(question, option);
    const isEnglishWord = /^[a-zA-Z\s\-]+$/.test(String(option).trim());
    button.innerHTML = `
      <span class="answer-index">${index + 1}</span>
      ${emoji ? `<span class="answer-emoji">${escapeHtml(emoji)}</span>` : ''}
      <span class="answer-label">${toZhuyinRuby(option, question)}</span>
      ${isEnglishWord ? `<button type="button" class="opt-audio-btn" title="聽發音" aria-label="聽 ${escapeHtml(option)} 的發音">🔊</button>` : ''}
    `;
    button.addEventListener('click', () => chooseAnswer(session, option, button));

    const optAudio = button.querySelector('.opt-audio-btn');
    if (optAudio) {
      optAudio.addEventListener('click', (e) => {
        e.stopPropagation();
        optAudio.classList.add('is-speaking');
        button.classList.add('is-speaking');
        if (typeof audio.speakEnglish === 'function') {
          audio.speakEnglish(option);
        } else {
          audio.speak(option);
        }
        setTimeout(() => {
          optAudio.classList.remove('is-speaking');
          button.classList.remove('is-speaking');
        }, 700);
      });
    }

    answerGrid.appendChild(button);
  });

  updateProgress(session);
  document.getElementById('level-live').textContent = question.prompt;

  if (audio.ttsOn) later(session, () => {
    if (typeof audio.playQuestionAudio === 'function') {
      audio.playQuestionAudio(question, options);
    } else {
      audio.speak(question.speak || question.prompt);
    }
  }, 420);
  prefetchUpcoming(session);
}

function pickBuddy(index) {
  const messages = ['加油！', '你可以的！', '仔細看圖喔！', '慢慢數，別急！', '動動腦，想一想！', '我相信你！'];
  return messages[index % messages.length];
}

function prefetchUpcoming(session) {
  for (let offset = 0; offset < 3; offset += 1) {
    const next = session.questions[session.index + offset];
    if (!next) continue;
    audio.prefetch(next.speak || next.prompt);
    if (next.hint) audio.prefetch(next.hint);
  }
}

function shuffleOptions(question) {
  const options = Array.isArray(question.options) ? [...question.options] : [];
  if (question.fixedOrder) return options;
  for (let index = options.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [options[index], options[swap]] = [options[swap], options[index]];
  }
  return options;
}

function optionEmojis(question, value) {
  if (!Array.isArray(question.optionEmojis)) return '';
  const index = question.options.findIndex((option) => String(option) === String(value));
  const emoji = index >= 0 ? question.optionEmojis[index] || '' : '';
  if (!emoji) return '';

  // 答案防洩漏機制：若選項 emoji 與題目題幹文字或視覺教具中的圖示衝突，作答前一律不渲染圖示避免破梗
  const prompt = String(question.prompt || '');
  const visualEmojis = Array.isArray(question.visual?.emojis) ? question.visual.emojis.map(String) : [];
  if (prompt.includes(emoji) || visualEmojis.includes(emoji)) {
    return '';
  }

  return emoji;
}

function chooseAnswer(session, value, button) {
  if (session.locked) return;
  // 立即掐斷題幹與選項朗讀佇列，防止題目語音與答題音效 / 表揚語音重疊打架
  audio.stopSpeech();
  const question = session.questions[session.index];
  const isCorrect = String(value) === String(question.answer);
  if (isCorrect) {
    session.locked = true;
    const prevCorrect = session.correct || 0;
    session.correct += 1;
    button.classList.add('correct');
    button.setAttribute('aria-pressed', 'true');
    audio.playSfx('correct', 0.85, { duck: true });
    launchConfetti({ count: 100, y: window.innerHeight * 0.25 });
    // ── 怪獸受擊擊退與小星星噴發動效 ──
    triggerMonsterHitEffect(session);

    // ── 終極魔王 Darkon 三階段破盾判定 ──
    let isShieldBreak = false;
    if (session.monster?.isDarkon) {
      if (prevCorrect === 1 && session.correct === 2) {
        isShieldBreak = true;
        triggerDarkonShieldBreak(session, 1);
      } else if (prevCorrect === 3 && session.correct === 4) {
        isShieldBreak = true;
        triggerDarkonShieldBreak(session, 2);
      } else if (prevCorrect === 5 && session.correct === 6) {
        isShieldBreak = true;
        triggerDarkonShieldBreak(session, 3);
      }
    }

    showFeedback('correct', `🎉 ${question.explanation || '答對了！'}`, session);
    if (session.combo && session.combo.count >= 2) {
      setBuddyMood('combo', `連對 ×${session.combo.count}！太神啦！`);
    } else {
      setBuddyMood('correct', '太棒了！答對囉！');
    }
    if (!isShieldBreak) {
      const currentSub = question.subject || getCurrentSubject();
      const praise = getSubjectPraise(currentSub);
      audio.speakSequence([praise, question.explanation || '']);
    }
    // ── Combo 答對處理 ──
    const newTier = onCorrect(session);
    renderComboBar(session);
    if (newTier) showComboCelebration(session, newTier);

    // ── 得分飛字動效與即時記分 ──
    const scoreInfo = calculateQuestionScore(session.combo ? session.combo.count : 1);
    session.scorePoints = (session.scorePoints || 0) + scoreInfo.total;
    spawnFloatingScore(button, scoreInfo);
    updateScoreDisplay(session, scoreInfo.total);

    // ── 答對星塵軌跡粒子飛入連擊 HUD ──
    const targetHud = document.getElementById('combo-bar') || document.getElementById('chip-score-hud') || document.querySelector('.level-score-chip');
    if (typeof spawnStardustCollection === 'function') {
      spawnStardustCollection(button, targetHud);
    }

    // ── 答對星幣累積 ──
    const coinsGained = earnCoinsForAnswer(session, true);
    session.coinsEarned = (session.coinsEarned || 0) + coinsGained;
    spawnCoinFlyText(button, coinsGained);

    // 重設仙女棒每題狀態並刷新 HUD
    if (session.itemState) session.itemState.wandUsedThisQuestion = false;
    renderItemHud(session, makeItemCallbacks(session));

    offerNext(session);
    return;
  }

  // ── 護盾攔截：若護盾已啟動，抵消這次失誤 ──
  if (session.itemState?.shieldArmed) {
    session.itemState.shieldArmed = false;
    session.itemState.shieldUsedThisLevel = true;

    button.classList.add('wrong');
    applyGentleShake(button);
    button.disabled = true;
    audio.playSfx('click', 0.4);
    showShieldActivation();
    showMonsterSpeech('什麼？！守護護盾擋住了？！🛡️', 'hit', 2200);
    setBuddyMood('combo', '🛡️ 護盾抵消了這次失誤！繼續加油！');
    showFeedback('correct', '🛡️ 守護護盾發動！這次失誤被抵消了！', session);

    // 護盾攔截後仍給少量星幣
    const shieldCoins = earnCoinsForAnswer(session, false);
    session.coinsEarned = (session.coinsEarned || 0) + shieldCoins;

    // 重置每題答錯計數，讓玩家繼續作答
    session.perQuestion = 0;
    renderItemHud(session, makeItemCallbacks(session));

    // 延遲 1.5 秒後繼續（不計失誤，不鎖定）
    later(session, () => {
      showFeedback('correct', `💛 護盾已用！繼續答題吧！`, session);
    }, 1500);
    return;
  }

  session.mistakes += 1;
  session.perQuestion += 1;
  session.errors = session.errors || [];
  session.errors.push({
    prompt: question.prompt || '',
    chosen: value,
    answer: question.answer,
    explanation: question.explanation || ''
  });
  button.classList.add('wrong');
  applyGentleShake(button);
  button.disabled = true;
  audio.playSfx('wrong', 0.55, { duck: true });
  setBuddyMood('think', '再想想～別灰心！');
  triggerMonsterGloatEffect(session);
  // ── Combo 答錯處理 ──
  const comboBreak = onWrong(session);
  renderComboBar(session);
  if (comboBreak) showComboBreak(session, comboBreak);

  // ── 答錯星幣（鼓勵幣）──
  const wrongCoins = earnCoinsForAnswer(session, false);
  session.coinsEarned = (session.coinsEarned || 0) + wrongCoins;

  if (session.perQuestion === 1) {
    showFeedback('gentle', `💛 ${ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)]}`, session);
    showHint(session, true);
    highlightVisualFocus();
  } else {
    session.locked = true;
    revealAnswer(session, question);
    highlightVisualFocus();
    showFeedback('reveal', `🌈 ${question.explanation || `答案是 ${question.answer}。`}`, session);
    audio.speakSequence(['沒關係，我們一起看。', question.explanation || `答案是 ${question.answer}。`]);
    offerNext(session);
  }
}

function offerNext(session) {
  const feedback = document.getElementById('feedback');
  if (!feedback || feedback.querySelector('.next-inline')) return;
  const button = document.createElement('button');
  button.className = 'next-inline';
  button.type = 'button';
  button.setAttribute('aria-label', '下一題，聽完語音再按');
  button.title = '聽完語音，準備好了再按下一題';
  button.innerHTML = '下一題 <span aria-hidden="true">▶</span>';
  button.addEventListener('click', () => {
    if (button.disabled) return;
    button.disabled = true;
    audio.playSfx('click', 0.4);
    audio.stopSpeech();
    advance(session);
  });
  feedback.appendChild(button);
}

function revealAnswer(session, question) {
  const buttons = [...document.querySelectorAll('.answer-btn')];
  for (const button of buttons) {
    if (String(button.dataset.value) === String(question.answer)) {
      button.classList.add('correct', 'revealed');
    } else {
      button.disabled = true;
      button.classList.add('dimmed');
    }
  }
}

function showHint(session, speak) {
  const question = session.questions[session.index];
  const hintBox = document.getElementById('hint-box');
  if (!hintBox) return;
  hintBox.hidden = false;
  document.getElementById('hint-text').textContent = question.hint || '仔細看一看題目。';
  if (speak) audio.speak(question.hint || '仔細看一看題目。');
  setBuddyMood('encourage', '仔細看提示喔！');
}

function showFeedback(kind, text, session) {
  const feedback = document.getElementById('feedback');
  if (!feedback) return;
  feedback.className = `feedback ${kind}`;
  feedback.innerHTML = `<span>${toZhuyinRuby(text)}</span>`;
  void session;
}

const BUDDY_MOOD_CONFIG = {
  idle: { badge: '🦊', animation: 'mascot-idle', scale: 1 },
  cheer: { badge: '✨', animation: 'mascot-bounce', scale: 1.05 },
  correct: { badge: '🎉', animation: 'mascot-cheer', scale: 1.15 },
  combo: { badge: '🔥', animation: 'mascot-super', scale: 1.25 },
  think: { badge: '🤔', animation: 'mascot-think', scale: 0.95 },
  encourage: { badge: '💪', animation: 'mascot-gentle', scale: 1 },
  celebrate: { badge: '👑', animation: 'mascot-celebrate', scale: 1.3 }
};

export function setBuddyMood(mood = 'idle', text = null) {
  const buddyEl = document.getElementById('mascot-buddy');
  const badgeEl = document.getElementById('buddy-mood-badge');
  const bubbleEl = document.getElementById('buddy-bubble');
  const cfg = BUDDY_MOOD_CONFIG[mood] || BUDDY_MOOD_CONFIG.idle;

  if (badgeEl) {
    badgeEl.textContent = cfg.badge;
    badgeEl.className = `buddy-mood-badge buddy-badge-${mood} badge-pop`;
    setTimeout(() => badgeEl.classList.remove('badge-pop'), 400);
  }

  if (buddyEl) {
    buddyEl.className = `buddy buddy--${mood}`;
    buddyEl.style.setProperty('--buddy-scale', cfg.scale);
  }

  if (text && bubbleEl) {
    bubbleEl.innerHTML = toZhuyinRuby(text);
    bubbleEl.classList.remove('bubble-pop');
    void bubbleEl.offsetWidth; // trigger reflow
    bubbleEl.classList.add('bubble-pop');
  }
}

export function setBuddy(text) {
  setBuddyMood('cheer', text);
}

function updateProgress(session) {
  const fill = document.querySelector('.progress-fill');
  const label = document.querySelector('.progress-label');
  if (fill) fill.style.width = `${(session.index / session.questions.length) * 100}%`;
  if (label) label.textContent = `${session.index + 1} / ${session.questions.length}`;
}

function advance(session) {
  if (session.advancing) return;
  session.advancing = true;
  // 前往下一題前立即中止語音
  audio.stopSpeech();
  clearTimers(session);
  session.index += 1;
  if (session.index >= session.questions.length) {
    finishLevel(session);
    return;
  }
  renderQuestion(session);
}

function finishLevel(session) {
  // 關卡結算前立即中止題目語音，確保勝利號角與通關 Jingle 獨享聲場
  audio.stopSpeech();
  const { level, mistakes, correct } = session;
  const monster = session.monster || getMonsterForLevel(getCurrentSubject(), level.id, getCurrentGrade());
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  const result = completeLevel(level.id, stars, correct);
  const newBadges = checkNewlyUnlockedBadges();
  // 雙軌關卡音效：原版 SFX + Web Audio 原生合成勝利號角 + 備援 Jingle
  audio.playSfx('levelup');
  if (typeof audio.playVictoryFanfare === 'function') {
    audio.playVictoryFanfare(stars);
  }
  audio.playJingle('victory');

  // 全屏多階段粒子慶祝特效 (雙側加農砲 + 高空星芒煙火 + 三星金雨)
  if (typeof launchLevelClearCelebration === 'function') {
    launchLevelClearCelebration({ stars });
  } else {
    fireworks({ bursts: 4 });
  }

  updateProgress({ ...session, index: session.questions.length });

  const nextId = level.id + 1;
  const nextLevel = nextId <= 16 ? getLevelById(nextId) : null;
  const screen = document.getElementById('screen-level');
  const overlay = document.createElement('div');
  overlay.className = 'result-overlay';

  const currentStudent = getCurrentStudent();
  const currentCharacter = getCurrentCharacter(currentStudent);
  const heroSkill = getVictoryFinisherSkill(currentCharacter);
  const durationSeconds = Math.round((Date.now() - (session.startTime || Date.now())) / 1000);
  const score = Math.round((correct / Math.max(1, session.questions.length)) * 100);

  uploadLevelRecord({
    level,
    score,
    stars,
    durationSeconds,
    errors: session.errors || []
  }).then(res => {
    const statusEl = overlay.querySelector('.result-sync-status');
    if (statusEl) {
      statusEl.textContent = res && res.offline ? '⚡ 離線暫存（連線自動同步）' : '✓ 已同步至學習歷程';
      statusEl.style.color = res && res.offline ? '#f39c12' : '#00b894';
    }
  }).catch(() => { });

  const newBadgesMarkup = newBadges.length > 0 ? `
    <div class="result-new-badges">
      ${newBadges.map((b) => `
        <div class="result-badge-pill" data-badge-id="${b.id}" role="button" tabindex="0" title="點擊檢視勳章">
          <span class="badge-pill-icon">${b.image ? `<img src="${b.image}" alt="${escapeHtml(b.name)}" style="width:28px;height:28px;object-fit:contain;vertical-align:middle;" />` : b.icon}</span>
          <div class="badge-pill-text">
            <span class="badge-pill-title">獲得榮譽勳章！</span>
            <strong>${escapeHtml(b.name)}</strong>
          </div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const isChallenge = getCurrentSubject() === 'challenge';
  const isChallengeFinale = isChallenge && level.id === 16;
  const kickerText = stars === 3
    ? '✨ 完美通關・三星大滿貫 ✨'
    : stars === 2 ? '🌟 太棒了・榮耀通關 🌟' : '🎉 恭喜過關・勇往直前 🎉';

  overlay.innerHTML = `
    <div class="result-rays-container" aria-hidden="true">
      <div class="result-rays"></div>
    </div>
    <div class="result-card" data-stars="${stars}">
      <span class="result-kicker">${kickerText}</span>
      <div class="result-emoji" aria-hidden="true">${stars === 3 ? '🏆' : stars === 2 ? '🌟' : '🎖️'}</div>
      <h2>${stars === 3 ? '完美通關！' : stars === 2 ? '太棒了！通關！' : '過關囉！'}</h2>
      <div class="result-stars" data-stars="${stars}">${starsMarkup(stars)}</div>
      ${renderHeroActionStageMarkup(currentCharacter, heroSkill)}
      ${renderMonsterDefeatCard(monster)}
      <div class="result-student-tag">
        <span>${currentStudent.avatar || '🦊'} ${escapeHtml(currentStudent.name || '冒險小勇士')}</span>
        <span class="result-sync-status">📡 成績同步中...</span>
      </div>
      <p class="result-line">答對 <strong>${correct}</strong> 題${mistakes ? `，再加油一點就三顆星囉！` : '，完全沒有失誤！'}</p>
      ${result.stars > result.previousStars ? '<p class="result-new">刷新紀錄！</p>' : ''}
      <div class="result-score-summary">
        <span class="result-score-label">🏆 本關冒險積分</span>
        <span class="result-score-value">${session.scorePoints || 0}</span>
        <span class="result-score-unit">分</span>
      </div>
      ${coinSummaryMarkup(session.coinsEarned || 0)}
      ${comboSummaryMarkup(session)}
      ${newBadgesMarkup}
      <p class="result-skill">${escapeHtml(level.skill)} ✓</p>
      <div class="result-actions">
        ${isChallengeFinale ? '<button class="big-btn trophy-trigger-btn" type="button" data-action="trophy" style="background:linear-gradient(135deg,#f59e0b,#d97706);box-shadow:0 6px 20px rgba(245,158,11,0.45);font-size:18px;">🏆 榮獲期末通關金盃 <span>▶</span></button>' : ''}
        ${nextLevel ? `<button class="big-btn" type="button" data-action="next">下一關：${escapeHtml(nextLevel.title)} <span>▶</span></button>` : ''}
        <button class="secondary-btn" type="button" data-action="replay">再玩一次</button>
        <button class="shop-inline-btn" type="button" data-action="shop">🏪 魔法道具商店</button>
        <button class="text-btn" type="button" data-action="map">回地圖</button>
      </div>
    </div>
  `;
  screen.querySelector('.level-view').appendChild(overlay);

  // 觸發小勇士過關專屬必殺動效 (公主旋轉魔法陣 / 勇者月牙斬擊 + Web Audio 原生音效 + 粒子爆發)
  triggerCharacterVictoryAction(overlay, {
    character: currentCharacter,
    skill: heroSkill,
    stars
  });

  // 星星逐顆落定點亮動效與清脆音階反饋 (C6 ➔ E6 ➔ G6 晶瑩雙音階)
  const starEarnedEls = overlay.querySelectorAll('.result-stars .star.earned');
  starEarnedEls.forEach((el, idx) => {
    el.classList.add('star-animating');
    later(session, () => {
      el.classList.add('star-popped');
      if (typeof audio.playStarChime === 'function') {
        audio.playStarChime(idx + 1);
      }
    }, 320 + idx * 360);
  });

  if (stars === 3) {
    later(session, () => {
      overlay.querySelector('.result-stars')?.classList.add('stars-perfect-glow');
    }, 320 + starEarnedEls.length * 360 + 120);
  }

  // 跨島冒險成就圖鑑解鎖慶典動效
  if (newBadges && newBadges.length > 0) {
    later(session, () => {
      showBadgeUnlockCelebration(newBadges);
    }, 1800);
  }

  overlay.querySelectorAll('.result-badge-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const bId = pill.dataset.badgeId;
      const b = newBadges.find((x) => x.id === bId);
      if (b) showBadgeDetailModal(b);
      else showBadgesModal();
    });
  });

  if (isChallengeFinale) {
    later(session, () => {
      showTrophyModal({ grade: getCurrentGrade(), subject: getCurrentSubject() });
    }, 1100);
  }

  const isEn = getCurrentSubject() === 'en';
  const message = isEn
    ? (stars === 3
      ? 'Outstanding! Three stars! Perfect clear!'
      : stars === 2 ? 'Great job! Two stars! You cleared the level!' : 'Good effort! Level cleared!')
    : (stars === 3
      ? '太厲害了！你得到三顆星！'
      : stars === 2 ? '很棒喔！你得到兩顆星！再挑戰一次可以拿三顆星。' : '恭喜過關！你得到一顆星，我們再練習一次好嗎？');
  const monsterQuote = monster ? (monster.defeatQuote || monster.quote) : '';
  later(session, () => {
    if (monsterQuote && !isEn) {
      audio.speakSequence([message, `${monster.name}說：${monsterQuote}`]);
    } else {
      audio.speak(message);
    }
  }, 1400);

  overlay.querySelector('[data-action="trophy"]')?.addEventListener('click', () => {
    showTrophyModal({ grade: getCurrentGrade(), subject: getCurrentSubject() });
  });
  overlay.querySelector('[data-action="map"]')?.addEventListener('click', exitLevel);
  overlay.querySelector('[data-action="shop"]')?.addEventListener('click', () => {
    audio.playSfx('click', 0.4);
    showCoinShopModal();
  });
  overlay.querySelector('[data-action="replay"]')?.addEventListener('click', () => {
    audio.playSfx('click', 0.5);
    teardownSession();
    startLevel(level, { onExit: session.onExit });
  });
  overlay.querySelector('[data-action="next"]')?.addEventListener('click', () => {
    audio.playSfx('click', 0.5);
    const target = getLevelById(nextId);
    if (!target) return;
    const lockInfo = getLevelLockInfo(target.id);
    if (!lockInfo.unlocked) {
      showToast(lockInfo.message, lockInfo.reason === 'stars' ? '⭐' : '🔒');
      audio.speak(lockInfo.message);
      return;
    }
    startLevel(target, { onExit: session.onExit });
  });

  session.keyHandler && window.removeEventListener('keydown', session.keyHandler);
  session.keyHandler = null;
}

function handleKey(session, event) {
  if (!session.started || session.locked) return;
  const number = Number(event.key);
  if (number >= 1 && number <= 4) {
    const buttons = [...document.querySelectorAll('.answer-btn')];
    const target = buttons[number - 1];
    if (target && !target.disabled) target.click();
  }
  if (event.key === 'h' || event.key === 'H') showHint(session, true);
  if (event.key === 'r' || event.key === 'R') {
    const question = session.questions[session.index];
    const displayOptions = question.currentOptions || question._displayOptions;
    if (typeof audio.playQuestionAudio === 'function') {
      audio.playQuestionAudio(question, displayOptions);
    } else {
      audio.speak(question.speak || question.prompt);
    }
  }
}

export function exitLevel() {
  if (!activeSession) return;
  const callback = activeSession.onExit;
  teardownSession();
  if (callback) callback();
}

export function teardownSession() {
  if (!activeSession) return;
  clearTimers(activeSession);
  if (activeSession.keyHandler) window.removeEventListener('keydown', activeSession.keyHandler);
  activeSession = null;
  // 全面重置語音與音訊通道，平滑恢復背景音樂
  if (typeof audio.resetAudioPipes === 'function') {
    audio.resetAudioPipes();
  } else {
    audio.stopSpeech();
    window.speechSynthesis?.cancel();
  }
  document.querySelector('.combo-celebration')?.remove();
  document.querySelector('.combo-bar')?.remove();

  clearFloatingScores();
}

export function hasActiveSession() {
  return Boolean(activeSession);
}
