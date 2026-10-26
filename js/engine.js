import { audio } from './audio.js';
import { completeLevel, isUnlocked, getLevelLockInfo, getCurrentSubject, getCurrentGrade } from './state.js';
import { renderVisual, renderStoryVisual } from './visuals.js';
import { clearConfetti, launchConfetti, fireworks, showToast, starsMarkup } from './ui.js';
import { getLevelById } from './levels/index.js';
import { checkNewlyUnlockedBadges } from './badges.js';
import { getBankQuestions } from './question-bank.js';
import { shuffle as shuffleArray } from './utils.js';
import { escapeHtml } from './ui.js';
import { showTrophyModal } from './trophy.js';
import { toZhuyinRuby } from './zhuyin.js';

import { PRAISE, ENCOURAGE, getSubjectPraise } from './texts.js';

const THEMES = { 1: 'forest', 2: 'ocean', 3: 'cloud', 4: 'space' };

let activeSession = null;

export function startLevel(level, { onExit } = {}) {
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
      locked: session.locked,
      finished: session.index >= session.questions.length,
    } : null),
  };
  audio.playMusic(THEMES[level.island] || 'forest', true);
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
    <div class="level-view theme-${THEMES[level.island]}">
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
  renderLevelShell(session);
  renderQuestion(session);
  session.keyHandler = (event) => handleKey(session, event);
  window.addEventListener('keydown', session.keyHandler);
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

function renderLevelShell(session) {
  const { level } = session;
  const screen = document.getElementById('screen-level');
  screen.innerHTML = `
    <div class="level-view theme-${THEMES[level.island]}">
      <div class="level-topbar">
        <button class="round-back" type="button" data-action="exit" aria-label="回地圖">←</button>
        <div class="level-progress">
          <div class="progress-track"><div class="progress-fill" style="width:0%"></div></div>
          <span class="progress-label">1 / ${session.questions.length}</span>
        </div>
        <button class="hint-top" type="button" data-action="hint">💡 提示</button>
      </div>

      <div class="question-stage">
        <article class="question-card">
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
        <div class="buddy" aria-hidden="true">
          <img src="assets/images/mascot.jpg" alt="" />
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
}

function renderQuestion(session) {
  clearConfetti();
  const question = session.questions[session.index];
  session.perQuestion = 0;
  session.locked = false;
  session.advancing = false;

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
  buddy.innerHTML = toZhuyinRuby(pickBuddy(session.index));

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
  const question = session.questions[session.index];
  const isCorrect = String(value) === String(question.answer);
  if (isCorrect) {
    session.locked = true;
    session.correct += 1;
    button.classList.add('correct');
    button.setAttribute('aria-pressed', 'true');
    audio.playSfx('correct');
    launchConfetti({ count: 100, y: window.innerHeight * 0.25 });
    showFeedback('correct', `🎉 ${question.explanation || '答對了！'}`, session);
    setBuddy('太棒了！');
    const currentSub = question.subject || getCurrentSubject();
    const praise = getSubjectPraise(currentSub);
    audio.speakSequence([praise, question.explanation || '']);
    offerNext(session);
    return;
  }

  session.mistakes += 1;
  session.perQuestion += 1;
  button.classList.add('wrong');
  button.disabled = true;
  audio.playSfx('wrong', 0.55);
  setBuddy('再想想～');
  if (session.perQuestion === 1) {
    showFeedback('gentle', `💛 ${ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)]}`, session);
    showHint(session, true);
  } else {
    session.locked = true;
    revealAnswer(session, question);
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
  document.getElementById('buddy-bubble').textContent = '看提示！';
}

function showFeedback(kind, text, session) {
  const feedback = document.getElementById('feedback');
  if (!feedback) return;
  feedback.className = `feedback ${kind}`;
  feedback.innerHTML = `<span>${toZhuyinRuby(text)}</span>`;
  void session;
}

function setBuddy(text) {
  const buddy = document.getElementById('buddy-bubble');
  if (buddy) buddy.innerHTML = toZhuyinRuby(text);
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
  clearTimers(session);
  session.index += 1;
  if (session.index >= session.questions.length) {
    finishLevel(session);
    return;
  }
  renderQuestion(session);
}

function finishLevel(session) {
  const { level, mistakes, correct } = session;
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  const result = completeLevel(level.id, stars, correct);
  const newBadges = checkNewlyUnlockedBadges();
  audio.playSfx('levelup');
  audio.playJingle('victory');
  fireworks({ bursts: 4 });
  updateProgress({ ...session, index: session.questions.length });

  const nextId = level.id + 1;
  const nextLevel = nextId <= 16 ? getLevelById(nextId) : null;
  const screen = document.getElementById('screen-level');
  const overlay = document.createElement('div');
  overlay.className = 'result-overlay';

  const newBadgesMarkup = newBadges.length > 0 ? `
    <div class="result-new-badges">
      ${newBadges.map((b) => `
        <div class="result-badge-pill">
          <span class="badge-pill-icon">${b.icon}</span>
          <div class="badge-pill-text">
            <span class="badge-pill-title">獲得榮譽徽章！</span>
            <strong>${escapeHtml(b.name)}</strong>
          </div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const isChallenge = getCurrentSubject() === 'challenge';
  const isChallengeFinale = isChallenge && level.id === 16;

  overlay.innerHTML = `
    <div class="result-card">
      <div class="result-emoji" aria-hidden="true">${stars === 3 ? '🏆' : stars === 2 ? '🌟' : '🎖️'}</div>
      <h2>${stars === 3 ? '完美通關！' : stars === 2 ? '太棒了！通關！' : '過關囉！'}</h2>
      <div class="result-stars">${starsMarkup(stars)}</div>
      <p class="result-line">答對 <strong>${correct}</strong> 題${mistakes ? `，再加油一點就三顆星囉！` : '，完全沒有失誤！'}</p>
      ${result.stars > result.previousStars ? '<p class="result-new">刷新紀錄！</p>' : ''}
      ${newBadgesMarkup}
      <p class="result-skill">${escapeHtml(level.skill)} ✓</p>
      <div class="result-actions">
        ${isChallengeFinale ? '<button class="big-btn trophy-trigger-btn" type="button" data-action="trophy" style="background:linear-gradient(135deg,#f59e0b,#d97706);box-shadow:0 6px 20px rgba(245,158,11,0.45);font-size:18px;">🏆 榮獲期末通關金盃 <span>▶</span></button>' : ''}
        ${nextLevel ? `<button class="big-btn" type="button" data-action="next">下一關：${escapeHtml(nextLevel.title)} <span>▶</span></button>` : ''}
        <button class="secondary-btn" type="button" data-action="replay">再玩一次</button>
        <button class="text-btn" type="button" data-action="map">回地圖</button>
      </div>
    </div>
  `;
  screen.querySelector('.level-view').appendChild(overlay);

  if (isChallengeFinale) {
    later(session, () => {
      showTrophyModal({ grade: getCurrentGrade(), subject: getCurrentSubject() });
    }, 1100);
  }

  const message = stars === 3
    ? '太厲害了！你得到三顆星！'
    : stars === 2 ? '很棒喔！你得到兩顆星！再挑戰一次可以拿三顆星。' : '恭喜過關！你得到一顆星，我們再練習一次好嗎？';
  later(session, () => audio.speak(message), 700);

  overlay.querySelector('[data-action="trophy"]')?.addEventListener('click', () => {
    showTrophyModal({ grade: getCurrentGrade(), subject: getCurrentSubject() });
  });
  overlay.querySelector('[data-action="map"]')?.addEventListener('click', exitLevel);
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
  audio.stopSpeech();
  window.speechSynthesis?.cancel();
}

export function hasActiveSession() {
  return Boolean(activeSession);
}
