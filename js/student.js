/**
 * js/student.js
 * 奇幻數學島 前台學童身分管理與歷程/成績自動回傳模組 (v2.8.1)
 * 支援專用 URL 鎖定 (?kid=xxx)、多學童切換、離線暫存隊列與伺服器雙軌同步
 */

import { getCurrentSubject, getCurrentGrade } from './state.js';
import { CHARACTERS, getCurrentCharacter, setCurrentCharacter, getCharacterById, STORAGE_KEY_CHARACTER } from './characters.js';
import { showToast } from './ui.js';
import { audio } from './audio.js';
import {
  getCrossGradeSummary,
  exportAndDownloadBackup,
  parseAndValidateBackup,
  applyComprehensiveBackup,
} from './storage-sync.js';

const STORAGE_KEY_CURRENT = 'fantasy_math_current_student';
const STORAGE_KEY_STUDENTS = 'fantasy_math_students_cache';
const STORAGE_KEY_PENDING = 'fantasy_math_pending_records';
const STORAGE_KEY_RECORDS = 'fantasy_math_admin_records';
const STORAGE_KEY_HOST = 'fantasy_math_host_url';

/**
 * 取得自訂後台基礎 URL（優先級：URL ?host= 參數 > localStorage > 相對路徑）
 */
export function getHostBase() {
  const params = new URLSearchParams(window.location.search);
  const urlHost = params.get('host');
  if (urlHost) {
    try { localStorage.setItem(STORAGE_KEY_HOST, urlHost); } catch (e) {}
    return urlHost.replace(/\/+$/, '');
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HOST);
    if (saved) return saved.replace(/\/+$/, '');
  } catch (e) {}
  return '';
}

/**
 * 統一 API fetch 包裝：自動對接自訂後台端點
 */
export function apiFetch(path, options) {
  const base = getHostBase();
  const url = base ? `${base}${path}` : path;
  return fetch(url, options);
}

const DEFAULT_VISITOR = {
  id: 'visitor',
  name: '冒險小勇士',
  avatar: '🦊',
  isDefault: true
};

const AVATAR_OPTIONS = ['🦊', '🦁', '🐼', '🦄', '🐰', '🚀', '🦖', '👑', '🐬', '🐱', '⭐', '🌈'];

let currentStudent = null;
let isLocked = false;
let cachedStudents = [];

/**
 * 讀取本機快取的學童清單
 */
export function getLocalStudents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('[Student] 讀取本機學童快取失敗:', e);
  }
  return [DEFAULT_VISITOR];
}

/**
 * 儲存學童清單至快取
 */
function saveLocalStudents(list) {
  try {
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(list));
    cachedStudents = list;
  } catch (e) {
    console.warn('[Student] 儲存學童快取失敗:', e);
  }
}

/**
 * 獲取當前學童資料
 */
export function getCurrentStudent() {
  if (!currentStudent) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (raw) currentStudent = JSON.parse(raw);
    } catch (e) {
      currentStudent = null;
    }
    if (!currentStudent) {
      currentStudent = { ...DEFAULT_VISITOR };
    }
  }
  return { ...currentStudent, isLocked };
}

/**
 * 設定當前挑戰者
 */
export function setCurrentStudent(student, notify = true) {
  currentStudent = {
    id: student.id || 'visitor',
    name: student.name || '冒險小勇士',
    avatar: student.avatar || '🦊'
  };
  try {
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(currentStudent));
  } catch (e) {
    console.warn('[Student] 儲存當前學童失敗:', e);
  }
  updateStudentPillUI();

  // 若當前登入為具名學童，且本機已有歷史進度存檔，自動為其補登初始歷程
  autoClaimLocalProgressIfEmpty(currentStudent);

  if (notify) {
    showToast(`歡迎挑戰者：${currentStudent.avatar} ${currentStudent.name}！`, '🎒', 2200);
  }
}

/**
 * 若當前登入學童尚無任何通關紀錄，且本機有歷史遊玩進度，自動補登初始成績
 */
export function autoClaimLocalProgressIfEmpty(student) {
  if (!student || !student.id || student.id === 'visitor') return;

  const STORAGE_KEY_RECORDS = 'fantasy_math_admin_records';
  let existingRecords = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (raw) existingRecords = JSON.parse(raw);
  } catch (e) {}

  let pendingRecords = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDING);
    if (raw) pendingRecords = JSON.parse(raw);
  } catch (e) {}

  const hasAnyRecord = [...existingRecords, ...pendingRecords].some(r => r.student_id === student.id);
  if (hasAnyRecord) return; // 已經有紀錄，無需重複補登

  const newRecords = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || (!key.includes('progress') && !key.includes('fantasy'))) continue;

    let subject = 'math';
    let grade = 1;
    if (key === 'fantasy-math-island-progress-v1') {
      subject = 'math';
      grade = 1;
    } else {
      const matchMath = key.match(/fantasy-math-island-progress-g(\d+)-v1/);
      if (matchMath) {
        subject = 'math';
        grade = parseInt(matchMath[1], 10);
      } else {
        const matchOther = key.match(/fantasy-island-progress-([a-z]+)-g(\d+)-v1/);
        if (matchOther) {
          subject = matchOther[1];
          grade = parseInt(matchOther[2], 10);
        } else {
          continue;
        }
      }
    }

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      const starsMap = data.stars || {};
      const bestMap = data.best || {};

      for (const [lvlStr, stars] of Object.entries(starsMap)) {
        const levelId = parseInt(lvlStr, 10);
        const starNum = parseInt(stars, 10);
        if (!levelId || !starNum || starNum <= 0) continue;

        const score = bestMap[levelId] || (starNum === 3 ? 100 : (starNum === 2 ? 80 : 60));
        newRecords.push({
          id: `rec_init_${student.id}_${subject}_g${grade}_l${levelId}`,
          student_id: student.id,
          student_name: student.name,
          subject: subject,
          grade: grade,
          level_id: levelId,
          level_title: `第 ${levelId} 關`,
          score: score,
          stars: starNum,
          duration_seconds: 60,
          errors: [],
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {}
  }

  if (newRecords.length > 0) {
    const merged = [...newRecords, ...existingRecords];
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(merged));
    } catch (e) {}

    const mergedPending = [...newRecords, ...pendingRecords];
    try {
      localStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(mergedPending));
    } catch (e) {}

    console.log(`[Student] 已自動將本機 ${newRecords.length} 關歷史進度綁定至【${student.name}】！`);
  }
}

/**
 * 向後台伺服器同步獲取學童名單
 */
export async function syncStudentsFromServer() {
  cachedStudents = getLocalStudents();
  try {
    const res = await apiFetch('/api/students', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.students)) {
        // 伺服器名單 + 訪客模式
        const merged = [DEFAULT_VISITOR, ...data.students.filter(s => s.id !== 'visitor')];
        saveLocalStudents(merged);
        
        // 若當前有 kid 參數且匹配，刷新名稱頭像
        if (isLocked && currentStudent) {
          const matched = merged.find(s => s.id === currentStudent.id);
          if (matched) {
            currentStudent.name = matched.name;
            currentStudent.avatar = matched.avatar;
            updateStudentPillUI();
          }
        }
        return merged;
      }
    }
  } catch (err) {
    console.info('[Student] 後台伺服器未運行或處於離線狀態，使用本機快取');
  }
  return cachedStudents;
}

/**
 * 新增學童
 */
export async function addNewStudent({ name, avatar }) {
  const cleanName = (name || '').trim();
  if (!cleanName) return null;

  const newStudent = {
    id: `kid_${Date.now().toString(36)}`,
    name: cleanName,
    avatar: avatar || '🌟',
    created_at: new Date().toISOString()
  };

  // 嘗試送往後端
  try {
    const res = await apiFetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cleanName, avatar: newStudent.avatar })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.student) {
        newStudent.id = data.student.id;
      }
    }
  } catch (e) {
    console.info('[Student] 離線狀態：學童暫存於本機');
  }

  const list = getLocalStudents();
  list.push(newStudent);
  saveLocalStudents(list);
  setCurrentStudent(newStudent, true);
  return newStudent;
}

/**
 * 讀取離線暫存待傳成績隊列
 */
function getPendingRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDING);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * 寫入離線暫存待傳成績隊列
 */
function savePendingRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(records));
  } catch (e) {
    console.warn('[StudentSync] 暫存離線紀錄失敗:', e);
  }
}

/**
 * 背景清空並補傳待傳送紀錄
 */
export async function flushPendingRecords() {
  const pending = getPendingRecords();
  if (!pending.length) return;

  const remaining = [];
  let successCount = 0;

  for (const record of pending) {
    try {
      const res = await apiFetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (res.ok) {
        successCount++;
      } else {
        remaining.push(record);
      }
    } catch (e) {
      remaining.push(record);
    }
  }

  savePendingRecords(remaining);
  if (successCount > 0) {
    console.log(`[StudentSync] 成功補傳 ${successCount} 筆離線成績至後台！`);
    showToast(`已自動補傳 ${successCount} 筆離線學習成績！`, '📡', 2600);
  }
}

/**
 * 儲存單筆戰績至本地 admin records (確保純前端/離線時不漏失)
 */
function saveSingleRecordToLocal(record) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    let records = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(records)) records = [];
    const exists = records.some(r => 
      r.id === record.id || 
      (r.student_id === record.student_id && r.subject === record.subject && r.grade === record.grade && r.level_id === record.level_id && r.timestamp === record.timestamp)
    );
    if (!exists) {
      records.unshift(record);
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    }
  } catch (e) {
    console.warn('[Student] 儲存本機戰績失敗:', e);
  }
}

/**
 * 關卡過關結算回傳後台 (具離線隊列容錯 ✕ 進度推進自動上傳)
 */
export async function uploadLevelRecord({ level, score, stars, durationSeconds, errors }) {
  const student = getCurrentStudent();
  const record = {
    id: `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    student_id: student.id,
    student_name: student.name,
    subject: getCurrentSubject(),
    grade: getCurrentGrade(),
    level_id: level.id,
    level_title: level.title || `關卡 ${level.id}`,
    score: score,
    stars: stars,
    duration_seconds: durationSeconds || 0,
    errors: Array.isArray(errors) ? errors : [],
    timestamp: new Date().toISOString()
  };

  // 1. 保全於本地 admin records 存檔
  saveSingleRecordToLocal(record);

  // 2. 自動嘗試背景推進上傳 (自動同步)
  try {
    const res = await apiFetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (res.ok) {
      console.log('[StudentSync] 成績已即時成功上傳後台:', record);
      // 自動補發剩餘離線隊列
      flushPendingRecords();
      return { success: true, offline: false };
    }
  } catch (e) {
    // 伺服器離線或處於純 GitHub Pages 靜態環境
  }

  // 離線降級：暫存隊列
  const pending = getPendingRecords();
  pending.push(record);
  savePendingRecords(pending);
  console.log('[StudentSync] 伺服器離線，成績已保全於離線隊列:', record);
  return { success: true, offline: true };
}

/**
 * 更新頂部學童膠囊 UI
 */
export function updateStudentPillUI() {
  const avatarEl = document.getElementById('student-btn-avatar');
  const nameEl = document.getElementById('student-btn-name');
  const charBadgeEl = document.getElementById('student-btn-char-badge');
  const lockIcon = document.getElementById('student-lock-icon');
  const studentBtn = document.getElementById('student-dropdown-btn');
  const student = getCurrentStudent();
  const char = getCurrentCharacter(student);

  if (avatarEl) {
    if (char && char.image) {
      avatarEl.innerHTML = `
        <span class="nav-avatar-wrapper" title="${char.name} (${char.title})">
          <img src="${char.image}" alt="${char.name}" class="nav-avatar-img" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline-block';" />
          <span class="nav-avatar-fallback" style="display: none;">${char.avatar || student.avatar || '🦊'}</span>
          <span class="nav-avatar-mini-badge" style="background: ${char.color || '#ec4899'};">${char.gender === 'girl' ? '👑' : '⚔️'}</span>
        </span>
      `;
    } else {
      avatarEl.textContent = student.avatar || '🦊';
    }
  }

  if (nameEl) {
    nameEl.textContent = student.name || '冒險小勇士';
  }

  if (charBadgeEl && char) {
    charBadgeEl.textContent = char.avatar || '👑';
    charBadgeEl.title = `${char.name} · ${char.title}`;
  }

  if (studentBtn && char && char.color) {
    studentBtn.style.setProperty('--char-theme-color', char.color);
    studentBtn.title = `挑戰者：${student.name} | 形象：${char.name} (${char.title}) - 點擊切換`;
  }

  if (lockIcon) {
    lockIcon.classList.toggle('hidden', !isLocked);
  }
}

/**
 * 渲染下拉選單學童清單
 */
function renderStudentDropdownList() {
  const container = document.getElementById('student-dropdown-list');
  if (!container) return;

  const students = getLocalStudents();
  const current = getCurrentStudent();

  // 渲染當前角色形象卡片預覽區
  const charCardContainer = document.getElementById('student-current-char-card');
  const char = getCurrentCharacter(current);
  if (charCardContainer && char) {
    charCardContainer.innerHTML = `
      <div class="char-dropdown-card-inner">
        <div class="char-dropdown-avatar-wrap">
          <img src="${char.image}" alt="${char.name}" class="char-dropdown-thumb" onerror="this.style.display='none';" />
          <span class="char-dropdown-badge-tag">${char.gender === 'girl' ? '👑' : '⚔️'}</span>
        </div>
        <div class="char-dropdown-info">
          <div class="char-dropdown-name-row">
            <span class="char-dropdown-name">${char.avatar} ${char.name}</span>
            <span class="char-dropdown-switch-badge">更換形象 ❯</span>
          </div>
          <div class="char-dropdown-title">${char.title} · ${char.trait}</div>
        </div>
      </div>
    `;
    charCardContainer.onclick = () => {
      closeStudentDropdown();
      showCharacterSelectDialog(false);
    };
  }

  container.innerHTML = students.map(s => {
    const isSelected = s.id === current.id;
    const sChar = s.characterId ? getCharacterById(s.characterId) : null;
    const avatarHtml = sChar && sChar.image
      ? `<span class="student-item-avatar-wrap"><img src="${sChar.image}" class="student-item-char-img" alt="${sChar.name}"><span class="student-item-mini-badge">${sChar.avatar}</span></span>`
      : `<span class="student-item-avatar">${s.avatar || '🌟'}</span>`;
    return `
      <button class="student-item ${isSelected ? 'is-selected' : ''}" type="button" data-kid="${s.id}">
        ${avatarHtml}
        <span class="student-item-name">${s.name}</span>
        ${sChar ? `<span class="student-item-role-label">${sChar.name}</span>` : ''}
        ${isSelected ? '<span class="student-item-check">✓</span>' : ''}
      </button>
    `;
  }).join('');

  container.querySelectorAll('.student-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const kid = btn.dataset.kid;
      const target = students.find(s => s.id === kid);
      if (target) {
        if (target.characterId) {
          setCurrentCharacter(target.characterId);
        }
        setCurrentStudent(target, true);
        closeStudentDropdown();
      }
    });
  });
}

/**
 * 關閉學童下拉選單
 */
export function closeStudentDropdown() {
  const menu = document.getElementById('student-dropdown-menu');
  const btn = document.getElementById('student-dropdown-btn');
  if (menu) {
    menu.classList.add('hidden');
    menu.setAttribute('hidden', '');
  }
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

/**
 * 開啟/切換學童下拉選單
 */
export function toggleStudentDropdown() {
  if (isLocked) {
    const student = getCurrentStudent();
    showToast(`🔒 已鎖定【${student.name}】專屬模式，如需切換請使用一般網址`, 'ℹ️', 3000);
    audio.playSfx('click', 0.3);
    return;
  }

  const menu = document.getElementById('student-dropdown-menu');
  const btn = document.getElementById('student-dropdown-btn');
  if (!menu || !btn) return;

  const isOpen = !menu.classList.contains('hidden');
  if (!isOpen) {
    const subjectMenu = document.getElementById('subject-dropdown-menu');
    subjectMenu?.classList.add('hidden');
    subjectMenu?.setAttribute('hidden', '');
    document.getElementById('subject-dropdown-btn')?.setAttribute('aria-expanded', 'false');
    const gradeMenu = document.getElementById('grade-dropdown-menu');
    gradeMenu?.classList.add('hidden');
    gradeMenu?.setAttribute('hidden', '');
    document.getElementById('grade-dropdown-btn')?.setAttribute('aria-expanded', 'false');
    const toolsMenu = document.getElementById('tools-dropdown-menu');
    toolsMenu?.classList.add('hidden');
    toolsMenu?.setAttribute('hidden', '');
    document.getElementById('tools-dropdown-btn')?.setAttribute('aria-expanded', 'false');
    renderStudentDropdownList();
    menu.classList.remove('hidden');
    menu.removeAttribute('hidden');
    btn.setAttribute('aria-expanded', 'true');
    audio.playSfx('click', 0.3);
  } else {
    closeStudentDropdown();
  }
}

/**
 * 彈出快速新增學童對話框
 */
export function showAddStudentDialog() {
  closeStudentDropdown();
  audio.playSfx('click', 0.4);

  const existingModal = document.getElementById('add-student-modal');
  if (existingModal) existingModal.remove();

  let selectedAvatar = '🦊';

  const modal = document.createElement('div');
  modal.id = 'add-student-modal';
  modal.className = 'student-modal-overlay';
  modal.innerHTML = `
    <div class="student-modal-card">
      <div class="student-modal-header">
        <span class="student-modal-icon">🎒</span>
        <h3>新增冒險小勇士</h3>
        <button class="student-modal-close" type="button" aria-label="關閉">✕</button>
      </div>
      <div class="student-modal-body">
        <label class="student-modal-label">選擇勇士頭像：</label>
        <div class="student-avatar-picker">
          ${AVATAR_OPTIONS.map((av, idx) => `
            <button type="button" class="avatar-opt-btn ${idx === 0 ? 'is-selected' : ''}" data-avatar="${av}">${av}</button>
          `).join('')}
        </div>
        <label class="student-modal-label" for="new-student-name-input">輸入小勇士名字：</label>
        <input type="text" id="new-student-name-input" class="student-name-input" placeholder="例如：大寶、安安、小樂" maxlength="12" autofocus />
      </div>
      <div class="student-modal-actions">
        <button id="cancel-add-student-btn" class="student-modal-cancel" type="button">取消</button>
        <button id="confirm-add-student-btn" class="student-modal-confirm" type="button">建立並開始冒險 🚀</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const inputEl = modal.querySelector('#new-student-name-input');
  const confirmBtn = modal.querySelector('#confirm-add-student-btn');
  const cancelBtn = modal.querySelector('#cancel-add-student-btn');
  const closeBtn = modal.querySelector('.student-modal-close');

  modal.querySelectorAll('.avatar-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.avatar-opt-btn').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      selectedAvatar = btn.dataset.avatar;
      audio.playSfx('click', 0.2);
    });
  });

  const closeModal = () => {
    modal.remove();
  };

  const handleConfirm = async () => {
    const name = inputEl.value.trim();
    if (!name) {
      inputEl.focus();
      showToast('請先輸入小勇士的名字喔！', '✏️', 1800);
      return;
    }
    confirmBtn.disabled = true;
    confirmBtn.textContent = '建立中...';
    await addNewStudent({ name, avatar: selectedAvatar });
    closeModal();
    audio.playSfx('levelup', 0.6);
  };

  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') closeModal();
  });

  setTimeout(() => inputEl.focus(), 100);
}

/**
 * 初始化學童身分管理系統
 */
export async function initStudentProfile() {
  // 1. 檢查 URL 專用鎖定參數 (?kid=xxx 或 ?student=xxx)
  const params = new URLSearchParams(window.location.search);
  const kidParam = params.get('kid') || params.get('student') || params.get('student_id');

  if (kidParam) {
    isLocked = true;
    const localList = getLocalStudents();
    const found = localList.find(s => s.id === kidParam);
    if (found) {
      setCurrentStudent(found, false);
    } else {
      // 建立臨時學童身分，待伺服器同步
      setCurrentStudent({ id: kidParam, name: `挑戰者 (${kidParam})`, avatar: '🌟' }, false);
    }
    setTimeout(() => {
      showToast(`🔒 已鎖定專屬挑戰模式：${currentStudent.name}`, '🎯', 3200);
    }, 800);
  } else {
    isLocked = false;
    getCurrentStudent();
  }

  updateStudentPillUI();

  // 2. 異步同步後台學童名單
  syncStudentsFromServer();

  // 3. 嘗試補發離線未傳送的成績
  flushPendingRecords();
  window.addEventListener('online', flushPendingRecords);
  window.addEventListener('fantasy-math:character-changed', () => updateStudentPillUI());

  // 4. 綁定按鈕事件
  const studentBtn = document.getElementById('student-dropdown-btn');
  const addQuickBtn = document.getElementById('add-student-quick-btn');

  studentBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleStudentDropdown();
  });

  addQuickBtn?.addEventListener('click', () => {
    showAddStudentDialog();
  });

  const selectCharQuickBtn = document.getElementById('select-character-quick-btn');
  selectCharQuickBtn?.addEventListener('click', () => {
    closeStudentDropdown();
    showCharacterSelectDialog(false);
  });

  // 初次遊玩檢查：若從未選過角色，於啟動 1.2 秒後溫馨彈出角色選擇引導
  if (!localStorage.getItem(STORAGE_KEY_CHARACTER)) {
    setTimeout(() => {
      showCharacterSelectDialog(true);
    }, 1200);
  }

  const syncQuickBtn = document.getElementById('sync-student-quick-btn');
  syncQuickBtn?.addEventListener('click', () => {
    closeStudentDropdown();
    showProgressSyncDialog();
  });

  const tabletQrQuickBtn = document.getElementById('tablet-qr-quick-btn');
  tabletQrQuickBtn?.addEventListener('click', () => {
    closeStudentDropdown();
    showTabletQRDialog();
  });

  const toolsTabletQrBtn = document.getElementById('tools-tablet-qr-btn');
  toolsTabletQrBtn?.addEventListener('click', () => {
    const toolsMenu = document.getElementById('tools-dropdown-menu');
    if (toolsMenu) {
      toolsMenu.classList.add('hidden');
      toolsMenu.setAttribute('hidden', '');
    }
    showTabletQRDialog();
  });

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('student-dropdown-menu');
    if (menu && !menu.contains(e.target) && e.target !== studentBtn) {
      closeStudentDropdown();
    }
  });
}

/**
 * 打包當前學童在本地的所有進度與戰績
 */
export function packStudentProgressData(student = getCurrentStudent()) {
  let records = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        records = parsed.filter(r => r.student_id === student.id);
      }
    }
  } catch (e) {}

  const progressMap = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.includes('progress') || k.includes('fantasy'))) {
      try {
        progressMap[k] = JSON.parse(localStorage.getItem(k));
      } catch (e) {}
    }
  }

  return {
    version: 'v2.8.7',
    type: 'FANTASY_MATH_SYNC_TOKEN',
    timestamp: new Date().toISOString(),
    student: {
      id: student.id,
      name: student.name,
      avatar: student.avatar
    },
    progress: progressMap,
    records: records
  };
}

/**
 * 產生進度同步碼字串 (Base64 UTF-8 相容 - 完整版)
 */
export function generateSyncTokenString(student = getCurrentStudent()) {
  const data = packStudentProgressData(student);
  const jsonStr = JSON.stringify(data);
  const b64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
  return `FMP1_${b64}`;
}

/**
 * 產生超輕量進度代碼 (專為 QR Code 與秒級相機識別設計，僅數百字元)
 */
export function generateCompactSyncToken(student = getCurrentStudent()) {
  let records = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        records = parsed.filter(r => r.student_id === student.id);
      }
    }
  } catch (e) {}

  const SUB_MAP = { math: 'm', english: 'e', chinese: 'c', natural: 'n', social: 's', final: 'f' };
  const rList = records.map(r => [
    SUB_MAP[r.subject] || (r.subject ? r.subject[0] : 'm'),
    Number(r.grade) || 1,
    Number(r.level_id) || 1,
    Number(r.score) || 100,
    Number(r.stars) || 3,
    Number(r.duration_seconds) || 30
  ]);

  const compact = {
    v: 1,
    id: student.id,
    name: student.name,
    avatar: student.avatar || '🦊',
    ts: Date.now(),
    r: rList
  };

  const jsonStr = JSON.stringify(compact);
  const b64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
  return `FMS1_${b64}`;
}

/**
 * 解析任意版本進度同步碼字串 (相容 FMS1_ 輕量矩陣與 FMP1_ 完整版)
 */
export function parseSyncTokenString(tokenStr) {
  if (!tokenStr) throw new Error('同步碼為空');
  tokenStr = tokenStr.trim();

  if (tokenStr.startsWith('FMS1_')) {
    const b64 = tokenStr.slice(5).trim();
    const jsonStr = decodeURIComponent(Array.prototype.map.call(atob(b64), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    const compact = JSON.parse(jsonStr);
    const SUB_MAP_REV = { m: 'math', e: 'english', c: 'chinese', n: 'natural', s: 'social', f: 'final' };
    const records = (compact.r || []).map(item => ({
      id: `rec_${compact.id}_${item[0]}_${item[1]}_${item[2]}`,
      student_id: compact.id,
      student_name: compact.name,
      subject: SUB_MAP_REV[item[0]] || 'math',
      grade: item[1],
      level_id: item[2],
      level_title: `關卡 ${item[2]}`,
      score: item[3],
      stars: item[4],
      duration_seconds: item[5],
      errors: [],
      timestamp: new Date(compact.ts || Date.now()).toISOString()
    }));
    return {
      version: 'FMS1',
      student: { id: compact.id, name: compact.name, avatar: compact.avatar },
      records: records,
      progress: {}
    };
  }

  if (tokenStr.startsWith('FMP1_')) {
    const b64 = tokenStr.slice(5).trim();
    const jsonStr = decodeURIComponent(Array.prototype.map.call(atob(b64), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonStr);
  }

  throw new Error('無效的進度同步碼格式（需為 FMS1_ 或 FMP1_ 開頭）');
}

/**
 * 向後台伺服器整包上傳最新進度
 */
export async function uploadStudentProgressToServer(student = getCurrentStudent(), notify = true) {
  const payload = packStudentProgressData(student);
  try {
    const res = await apiFetch('/api/sync_progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      if (notify) {
        showToast(`🎉 進度上傳成功！已同步 ${data.imported_count || payload.records.length} 筆戰績至後台！`, '☁️', 3000);
      }
      return { success: true };
    }
  } catch (e) {
    // 伺服器離線或純 GitHub Pages
  }

  if (notify) {
    showToast('📡 伺服器離線中，請使用【複製進度同步碼】帶入後台！', 'ℹ️', 3500);
  }
  return { success: false };
}

/**
 * 彈出【冒險進度同步與雲端上傳中心】對話框
 */
/**
 * 彈出備份還原確認與預覽對話框
 */
export function showBackupPreviewDialog(validationResult) {
  const { preview, data } = validationResult;
  const modal = document.createElement('div');
  modal.id = 'backup-preview-modal';
  modal.className = 'student-modal-overlay';
  modal.style.zIndex = '10001';
  modal.innerHTML = `
    <div class="student-modal-card" style="max-width: 440px;">
      <div class="student-modal-header">
        <span class="student-modal-icon">📦</span>
        <h3>確認恢復備份檔案</h3>
        <button class="student-modal-close" type="button" aria-label="關閉">✕</button>
      </div>
      <div class="student-modal-body" style="font-size: 0.9rem;">
        <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <span style="font-size: 2.2rem;">${preview.studentAvatar}</span>
            <div>
              <div style="font-weight: 800; font-size: 1.1rem; color: #f8fafc;">${preview.studentName}</div>
              <div style="color: #94a3b8; font-size: 0.78rem;">備份時間：${new Date(preview.exportedAt).toLocaleString('zh-TW')}</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; text-align: center; font-size: 0.85rem;">
            <div style="background: rgba(30, 41, 59, 0.7); padding: 8px; border-radius: 6px;">
              <div style="color: #94a3b8; font-size: 0.75rem;">榮譽星星</div>
              <div style="font-weight: 800; font-size: 1.15rem; color: #facc15;">⭐ ${preview.totalStars}</div>
            </div>
            <div style="background: rgba(30, 41, 59, 0.7); padding: 8px; border-radius: 6px;">
              <div style="color: #94a3b8; font-size: 0.75rem;">通關關卡</div>
              <div style="font-weight: 800; font-size: 1.15rem; color: #38bdf8;">🏆 ${preview.totalLevels} 關</div>
            </div>
          </div>
        </div>

        <div style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 10px;">
          請選擇恢復模式：
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button id="btn-merge-restore" type="button" class="student-modal-confirm" style="background: linear-gradient(135deg, #10b981, #059669); font-weight: 800; padding: 11px; text-align: left; display: flex; flex-direction: column; gap: 2px;">
            <span>✨ 智慧合併 (推薦)</span>
            <span style="font-size: 0.75rem; font-weight: 400; opacity: 0.9;">保留兩側較高星數、關卡聯集與對戰紀錄，安全無痛</span>
          </button>
          <button id="btn-overwrite-restore" type="button" class="student-modal-confirm" style="background: rgba(225, 29, 72, 0.85); font-weight: 800; padding: 11px; text-align: left; display: flex; flex-direction: column; gap: 2px;">
            <span>⚠️ 完整覆蓋</span>
            <span style="font-size: 0.75rem; font-weight: 400; opacity: 0.9;">完全以備份檔案內容取代本機進度</span>
          </button>
        </div>
      </div>
      <div class="student-modal-actions" style="margin-top: 10px;">
        <button id="btn-cancel-preview" class="student-modal-cancel" type="button" style="width: 100%;">取消</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('.student-modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('#btn-cancel-preview')?.addEventListener('click', closeModal);

  const executeRestore = async (mode) => {
    try {
      modal.querySelector('#btn-merge-restore').disabled = true;
      modal.querySelector('#btn-overwrite-restore').disabled = true;
      showToast('正在雙軌寫入 LocalStorage 與 IndexedDB...', '🔄', 2000);
      const res = await applyComprehensiveBackup(data, mode);
      closeModal();
      showToast(`🎉 成功以【${mode === 'merge' ? '智慧合併' : '完整覆蓋'}】恢復進度！共恢復 ${res.restoredKeysCount} 個節點！`, '🌟', 3500);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      alert(`恢復失敗：${err.message}`);
      modal.querySelector('#btn-merge-restore').disabled = false;
      modal.querySelector('#btn-overwrite-restore').disabled = false;
    }
  };

  modal.querySelector('#btn-merge-restore')?.addEventListener('click', () => executeRestore('merge'));
  modal.querySelector('#btn-overwrite-restore')?.addEventListener('click', () => executeRestore('overwrite'));
}

/**
 * 彈出【冒險進度同步與雲端上傳中心】對話框
 */
export function showProgressSyncDialog() {
  audio.playSfx('click', 0.4);
  const existingModal = document.getElementById('sync-progress-modal');
  if (existingModal) existingModal.remove();

  const student = getCurrentStudent();
  const tokenStr = generateSyncTokenString(student);
  const crossSummary = getCrossGradeSummary(student);
  const rank = crossSummary.masteryRank || { title: '島嶼見習生', icon: '🐣', badgeColor: '#94a3b8' };

  const modal = document.createElement('div');
  modal.id = 'sync-progress-modal';
  modal.className = 'student-modal-overlay';
  modal.innerHTML = `
    <div class="student-modal-card" style="max-width: 500px;">
      <div class="student-modal-header">
        <span class="student-modal-icon">☁️</span>
        <h3>冒險進度同步與雙軌備份中心</h3>
        <button class="student-modal-close" type="button" aria-label="關閉">✕</button>
      </div>
      <div class="student-modal-body" style="font-size: 0.9rem;">
        <!-- 學童資訊與全能頭銜卡片 -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(15, 23, 42, 0.7); padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 2.2rem;">${student.avatar || '🦊'}</span>
            <div>
              <div style="font-weight: 800; font-size: 1.1rem; color: #f8fafc;">${student.name}</div>
              <div style="color: #94a3b8; font-size: 0.8rem;">本地雙軌儲存中 (LocalStorage ✕ IndexedDB)</div>
            </div>
          </div>
          <span style="font-size: 0.8rem; background: ${rank.badgeColor}22; color: ${rank.badgeColor}; border: 1px solid ${rank.badgeColor}55; padding: 4px 10px; border-radius: 14px; font-weight: 800;">
            ${rank.icon} ${rank.title}
          </span>
        </div>

        <!-- 小學跨年級成果綜合數據面板 -->
        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 10px 12px; margin-bottom: 0.85rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 700; color: #38bdf8; font-size: 0.85rem;">📊 小學全科跨年級成果綜合統計</span>
            <span style="font-size: 0.75rem; color: #94a3b8;">全年級共 6 大科目</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-align: center; margin-bottom: 8px;">
            <div style="background: rgba(30, 41, 59, 0.6); padding: 6px 4px; border-radius: 6px;">
              <div style="font-size: 0.72rem; color: #94a3b8;">總榮譽星數</div>
              <div style="font-weight: 800; font-size: 1.05rem; color: #facc15;">⭐ ${crossSummary.totalStars}</div>
            </div>
            <div style="background: rgba(30, 41, 59, 0.6); padding: 6px 4px; border-radius: 6px;">
              <div style="font-size: 0.72rem; color: #94a3b8;">累計通關</div>
              <div style="font-weight: 800; font-size: 1.05rem; color: #38bdf8;">🏆 ${crossSummary.completedLevels} 關</div>
            </div>
            <div style="background: rgba(30, 41, 59, 0.6); padding: 6px 4px; border-radius: 6px;">
              <div style="font-size: 0.72rem; color: #94a3b8;">總達成率</div>
              <div style="font-weight: 800; font-size: 1.05rem; color: #4ade80;">🎯 ${crossSummary.overallPercentage}%</div>
            </div>
          </div>
          <!-- 各年級微型膠囊進度 -->
          <div style="display: flex; gap: 6px; font-size: 0.75rem; color: #cbd5e1;">
            <div style="flex: 1; background: rgba(51, 65, 85, 0.4); border-radius: 4px; padding: 4px; text-align: center;">小一: ⭐ ${crossSummary.grades[1].totalStars} (${crossSummary.grades[1].completedLevels}關)</div>
            <div style="flex: 1; background: rgba(51, 65, 85, 0.4); border-radius: 4px; padding: 4px; text-align: center;">小二: ⭐ ${crossSummary.grades[2].totalStars} (${crossSummary.grades[2].completedLevels}關)</div>
            <div style="flex: 1; background: rgba(51, 65, 85, 0.4); border-radius: 4px; padding: 4px; text-align: center;">小三: ⭐ ${crossSummary.grades[3].totalStars} (${crossSummary.grades[3].completedLevels}關)</div>
          </div>
        </div>

        <!-- 雲端本地雙軌匯出備份專區 (亮點新功能) -->
        <div style="margin-bottom: 0.85rem; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button id="export-comprehensive-json-btn" type="button" class="student-modal-confirm" style="background: linear-gradient(135deg, #0284c7, #0369a1); font-weight: 800; font-size: 0.88rem; padding: 9px 8px;">
              📦 匯出全科 JSON 備份
            </button>
            <button id="import-comprehensive-json-btn" type="button" class="student-modal-confirm" style="background: linear-gradient(135deg, #10b981, #047857); font-weight: 800; font-size: 0.88rem; padding: 9px 8px;">
              📂 匯入 JSON 備份恢復
            </button>
          </div>
          <input type="file" id="comprehensive-json-file-input" accept=".json,application/json" style="display: none;" />
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button id="export-progress-qr-btn" type="button" class="student-modal-confirm" style="background: linear-gradient(135deg, #059669, #047857); width: 100%; font-weight: 800; font-size: 0.92rem; padding: 9px 12px;">
            📱 產生【進度同步 QR Code】(手機相機一掃直接入帳)
          </button>
          <button id="copy-sync-token-btn" type="button" class="student-modal-confirm" style="background: #7c3aed; width: 100%; font-size: 0.88rem;">
            📋 複製平板進度代碼 (可貼至後台或發給 AI 更新)
          </button>
          <button id="direct-upload-btn" type="button" class="student-modal-confirm" style="background: #2563eb; width: 100%; font-size: 0.88rem;">
            📤 區域網立即連線上傳 (電腦有開 server.py 時用)
          </button>
          <button id="open-qr-from-sync-btn" type="button" class="student-modal-confirm" style="background: rgba(56, 189, 248, 0.12); border: 1px solid #38bdf8; color: #38bdf8; width: 100%; font-size: 0.88rem;">
            🔗 平板直連遊戲入口 QR Code
          </button>
        </div>

        <div style="margin-top: 0.85rem; border-top: 1px dashed rgba(255, 255, 255, 0.15); padding-top: 0.75rem;">
          <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">或貼上其他設備之文字同步碼：</div>
          <div style="display: flex; gap: 6px;">
            <input type="text" id="paste-sync-input" placeholder="貼上 FMS1_ 或 FMP1_ 同步碼..." style="flex: 1; padding: 6px 8px; font-size: 0.8rem; border-radius: 4px; border: 1px solid #475569; background: #0f172a; color: #f8fafc;" />
            <button id="apply-sync-token-btn" type="button" style="padding: 6px 12px; background: #10b981; border: none; border-radius: 4px; color: #fff; font-weight: 700; cursor: pointer;">匯入</button>
          </div>
        </div>
      </div>
      <div class="student-modal-actions" style="margin-top: 0.75rem;">
        <button id="close-sync-modal-btn" class="student-modal-cancel" type="button" style="width: 100%;">關閉</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = modal.querySelector('.student-modal-close');
  const cancelBtn = modal.querySelector('#close-sync-modal-btn');
  const uploadBtn = modal.querySelector('#direct-upload-btn');
  const copyBtn = modal.querySelector('#copy-sync-token-btn');
  const exportQrBtn = modal.querySelector('#export-progress-qr-btn');
  const openQrBtn = modal.querySelector('#open-qr-from-sync-btn');
  const applyBtn = modal.querySelector('#apply-sync-token-btn');
  const pasteInput = modal.querySelector('#paste-sync-input');
  const exportJsonBtn = modal.querySelector('#export-comprehensive-json-btn');
  const importJsonBtn = modal.querySelector('#import-comprehensive-json-btn');
  const jsonFileInput = modal.querySelector('#comprehensive-json-file-input');

  const closeModal = () => modal.remove();

  exportJsonBtn?.addEventListener('click', async () => {
    try {
      exportJsonBtn.disabled = true;
      exportJsonBtn.textContent = '📦 正在匯出...';
      await exportAndDownloadBackup(student);
      showToast('🎉 已成功匯出全科 JSON 備份檔，並於本地 IndexedDB 雙軌留底！', '📦', 3500);
      exportJsonBtn.textContent = '✅ 匯出成功！';
      setTimeout(() => {
        exportJsonBtn.disabled = false;
        exportJsonBtn.textContent = '📦 匯出全科 JSON 備份';
      }, 2000);
    } catch (e) {
      alert(`匯出失敗：${e.message}`);
      exportJsonBtn.disabled = false;
      exportJsonBtn.textContent = '📦 匯出全科 JSON 備份';
    }
  });

  importJsonBtn?.addEventListener('click', () => {
    jsonFileInput?.click();
  });

  jsonFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const validation = parseAndValidateBackup(event.target.result);
        if (!validation.valid) {
          alert(`備份檔案校驗失敗：${validation.error}`);
          return;
        }
        closeModal();
        showBackupPreviewDialog(validation);
      } catch (err) {
        alert(`讀取備份檔案失敗：${err.message}`);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  });

  exportQrBtn?.addEventListener('click', () => {
    closeModal();
    showProgressExportQRDialog(student);
  });

  openQrBtn?.addEventListener('click', () => {
    closeModal();
    showTabletQRDialog(student);
  });

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  uploadBtn.addEventListener('click', async () => {
    uploadBtn.disabled = true;
    uploadBtn.textContent = '連線上傳中...';
    await uploadStudentProgressToServer(student, true);
    uploadBtn.disabled = false;
    uploadBtn.textContent = '📤 立即連線上傳至電腦後台';
  });

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(tokenStr).then(() => {
      showToast('📋 已複製平板進度碼！請至電腦後台點【貼上進度碼】匯入！', '✨', 3200);
      copyBtn.textContent = '✅ 已成功複製！';
      setTimeout(() => copyBtn.textContent = '📋 複製平板進度代碼 (可貼至後台或發給 AI 更新)', 2000);
    }).catch(() => {
      prompt('請手動複製以下進度代碼：', tokenStr);
    });
  });

  applyBtn.addEventListener('click', () => {
    const val = (pasteInput.value || '').trim();
    if (!val) {
      showToast('請先貼上進度同步碼！', '✏️', 2000);
      return;
    }
    try {
      const parsed = parseSyncTokenString(val);
      if (parsed && parsed.records) {
        // 寫入本地 admin records
        const localRecs = JSON.parse(localStorage.getItem(STORAGE_KEY_RECORDS) || '[]');
        const merged = [...parsed.records, ...localRecs.filter(lr => !parsed.records.some(pr => pr.id === lr.id))];
        localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(merged));

        // 寫入 progress
        if (parsed.progress) {
          Object.entries(parsed.progress).forEach(([k, v]) => {
            localStorage.setItem(k, JSON.stringify(v));
          });
        }

        showToast(`🎉 成功匯入學童【${parsed.student?.name || '小勇士'}】進度！`, '🌟', 3000);
        closeModal();
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err) {
      alert(`匯入失敗：${err.message}`);
    }
  });
}
/**
 * 彈出【📱 平板掃碼直連冒險島】專屬對話框
 */
export async function showTabletQRDialog(student = getCurrentStudent()) {
  audio.playSfx('click', 0.4);
  const existingModal = document.getElementById('tablet-qr-dialog-modal');
  if (existingModal) existingModal.remove();

  // 1. 探測後台 Host
  let hostUrl = getHostBase();
  let localIp = '';
  try {
    const res = await apiFetch('/api/host_info', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.local_ip) {
        localIp = data.local_ip;
        if (!hostUrl || hostUrl.includes('localhost') || hostUrl.includes('127.0.0.1')) {
          hostUrl = `http://${data.local_ip}:${data.port || 8000}`;
        }
      }
    }
  } catch (e) {}

  if (!hostUrl) {
    hostUrl = window.location.origin;
  }

  // 2. 計算目標連結
  function buildDirectUrl(targetHost, targetKid) {
    try {
      const u = new URL(window.location.pathname.replace(/\/admin\.html$/, '') || '/', targetHost);
      if (!u.pathname.endsWith('.html') && !u.pathname.endsWith('/')) {
        u.pathname += '/index.html';
      } else if (u.pathname.endsWith('/')) {
        u.pathname += 'index.html';
      }
      if (targetKid && targetKid !== 'visitor') {
        u.searchParams.set('kid', targetKid);
      }
      u.searchParams.set('host', targetHost);
      return u.href;
    } catch (e) {
      return `${targetHost.replace(/\/+$/, '')}/index.html?${targetKid && targetKid !== 'visitor' ? `kid=${encodeURIComponent(targetKid)}&` : ''}host=${encodeURIComponent(targetHost)}`;
    }
  }

  let directUrl = buildDirectUrl(hostUrl, student.id);

  const modal = document.createElement('div');
  modal.id = 'tablet-qr-dialog-modal';
  modal.className = 'student-modal-overlay';
  modal.innerHTML = `
    <div class="student-modal-card" style="max-width: 480px; text-align: center;">
      <div class="student-modal-header">
        <span class="student-modal-icon">📱</span>
        <h3>平板掃碼直連冒險島</h3>
        <button class="student-modal-close" type="button" aria-label="關閉">✕</button>
      </div>

      <div class="student-modal-body" style="font-size: 0.9rem; padding-top: 0.5rem;">
        <!-- 當前挑戰者標籤 -->
        <div style="background: rgba(15, 23, 42, 0.6); padding: 0.6rem 0.9rem; border-radius: 8px; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.5rem;">${student.avatar || '🦊'}</span>
            <div style="text-align: left;">
              <div style="font-weight: 700; font-size: 0.95rem; color: #f8fafc;">${student.name || '冒險小勇士'}</div>
              <div style="color: #38bdf8; font-size: 0.78rem;">${student.id && student.id !== 'visitor' ? '🔒 專屬身分鎖定' : '🎒 自由訪客模式'}</div>
            </div>
          </div>
          <span style="font-size: 0.78rem; color: #34d399; font-weight: 700;">${localIp ? `📡 LAN: ${localIp}` : '🌐 本機/線上'}</span>
        </div>

        <!-- QR Code 白底卡片 -->
        <div style="background: #ffffff; padding: 1.25rem; border-radius: 14px; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,0.4); margin: 0.25rem auto 0.75rem; border: 4px solid #38bdf8;">
          <div id="front-qr-container" style="min-width: 200px; min-height: 200px; display: flex; align-items: center; justify-content: center;">
            <!-- QR Code -->
          </div>
          <div style="margin-top: 8px; font-size: 0.82rem; font-weight: 800; color: #0f172a; background: #e0f2fe; padding: 3px 10px; border-radius: 999px;">
            📷 使用平板相機掃描直開遊戲
          </div>
        </div>

        <!-- 伺服器 Host 輸入框 (可手動調整) -->
        <div style="text-align: left; margin-bottom: 0.6rem;">
          <label style="font-size: 0.78rem; color: #94a3b8; font-weight: 600; display: block; margin-bottom: 3px;">
            後台主機網址 (若平板無法掃入請確認此 IP 與電腦同網段)：
          </label>
          <input type="text" id="front-qr-host-input" value="${hostUrl}" style="width: 100%; padding: 6px 8px; font-size: 0.8rem; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #f8fafc;" />
        </div>

        <!-- 專屬網址與複製 -->
        <div style="display: flex; gap: 6px; margin-bottom: 0.75rem;">
          <input type="text" id="front-qr-url-input" readonly value="${directUrl}" style="flex: 1; padding: 6px 8px; font-size: 0.78rem; border-radius: 6px; border: 1px solid #38bdf8; background: rgba(15, 23, 42, 0.8); color: #38bdf8;" />
          <button id="front-qr-copy-btn" type="button" style="padding: 6px 14px; background: #38bdf8; color: #0f172a; border: none; border-radius: 6px; font-weight: 800; cursor: pointer; white-space: nowrap;">
            📋 複製
          </button>
        </div>

        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 6px 10px; text-align: left; font-size: 0.78rem; color: #34d399; line-height: 1.4;">
          ✨ <strong>貼心提示</strong>：平板請連線至與本電腦相同的 <strong>Wi-Fi</strong>。掃描後答題星星將即時自動回傳至本機！
        </div>
      </div>

      <div class="student-modal-actions" style="margin-top: 0.75rem;">
        <button id="close-front-qr-btn" class="student-modal-cancel" type="button" style="width: 100%;">關閉</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const container = modal.querySelector('#front-qr-container');
  const hostInput = modal.querySelector('#front-qr-host-input');
  const urlInput = modal.querySelector('#front-qr-url-input');
  const copyBtn = modal.querySelector('#front-qr-copy-btn');
  const closeBtn = modal.querySelector('.student-modal-close');
  const cancelBtn = modal.querySelector('#close-front-qr-btn');

  function renderQR(url) {
    if (!container) return;
    container.innerHTML = '';
    try {
      if (typeof qrcode === 'function') {
        const qr = qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        container.innerHTML = qr.createSvgTag(5, 4);
        const svg = container.querySelector('svg');
        if (svg) {
          svg.style.display = 'block';
          svg.style.maxWidth = '200px';
          svg.style.maxHeight = '200px';
          svg.style.width = '100%';
          svg.style.height = 'auto';
        }
        return;
      }
    } catch (err) {
      console.warn('[QR] 本地生成異常:', err);
    }
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(url)}`;
    img.alt = 'QR Code';
    img.style.width = '200px';
    img.style.height = '200px';
    container.appendChild(img);
  }

  renderQR(directUrl);

  const closeModal = () => modal.remove();
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  hostInput.addEventListener('input', () => {
    const newHost = hostInput.value.trim() || window.location.origin;
    directUrl = buildDirectUrl(newHost, student.id);
    urlInput.value = directUrl;
    renderQR(directUrl);
  });

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(urlInput.value).then(() => {
      showToast('📋 已複製平板直連網址！', '✨', 2400);
      copyBtn.textContent = '✅ 已複製！';
      setTimeout(() => copyBtn.textContent = '📋 複製', 2000);
    }).catch(() => {
      prompt('請手動複製此專屬網址：', urlInput.value);
    });
  });
}

/**
 * 彈出【📱 進度同步 QR Code (帶進度相機掃碼入帳)】專屬對話框
 */
export function showProgressExportQRDialog(student = getCurrentStudent()) {
  audio.playSfx('click', 0.4);
  const existingModal = document.getElementById('progress-export-qr-modal');
  if (existingModal) existingModal.remove();

  const compactToken = generateCompactSyncToken(student);
  const pack = packStudentProgressData(student);
  const passes = pack.records.length;
  const stars = pack.records.reduce((acc, r) => acc + (r.stars || 0), 0);

  // 組裝後台直連匯入網址
  let importUrl = '';
  try {
    let p = window.location.pathname;
    if (p.endsWith('/index.html')) {
      p = p.replace(/\/index\.html$/, '/admin.html');
    } else if (p.endsWith('/')) {
      p = p + 'admin.html';
    } else {
      p = p + '/admin.html';
    }
    const u = new URL(p, window.location.origin);
    u.searchParams.set('import_token', compactToken);
    importUrl = u.href;
  } catch (e) {
    importUrl = `${window.location.origin}/admin.html?import_token=${encodeURIComponent(compactToken)}`;
  }

  const modal = document.createElement('div');
  modal.id = 'progress-export-qr-modal';
  modal.className = 'student-modal-overlay';
  modal.innerHTML = `
    <div class="student-modal-card" style="max-width: 480px; text-align: center;">
      <div class="student-modal-header">
        <span class="student-modal-icon">📱</span>
        <h3>帶進度同步 QR Code</h3>
        <button class="student-modal-close" type="button" aria-label="關閉">✕</button>
      </div>

      <div class="student-modal-body" style="font-size: 0.9rem; padding-top: 0.5rem;">
        <!-- 當前孩子戰績資訊 -->
        <div style="background: rgba(15, 23, 42, 0.6); padding: 0.6rem 0.9rem; border-radius: 8px; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.5rem;">${student.avatar || '🦊'}</span>
            <div style="text-align: left;">
              <div style="font-weight: 700; font-size: 0.95rem; color: #f8fafc;">${student.name} 的最新進度</div>
              <div style="color: #fbbf24; font-size: 0.78rem;">⭐ 累計 ${stars} 顆星 ｜ 🎮 通關 ${passes} 場</div>
            </div>
          </div>
          <span style="font-size: 0.78rem; color: #34d399; font-weight: 700; background: rgba(16, 185, 129, 0.15); padding: 3px 8px; border-radius: 6px;">可供掃描入帳</span>
        </div>

        <!-- QR Code 白底卡片 -->
        <div style="background: #ffffff; padding: 1.25rem; border-radius: 14px; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,0.4); margin: 0.25rem auto 0.75rem; border: 4px solid #10b981;">
          <div id="export-qr-container" style="min-width: 200px; min-height: 200px; display: flex; align-items: center; justify-content: center;">
            <!-- QR Code -->
          </div>
          <div style="margin-top: 8px; font-size: 0.85rem; font-weight: 800; color: #065f46; background: #d1fae5; padding: 4px 12px; border-radius: 999px;">
            📷 手機相機一掃，點開立即同步入帳！
          </div>
        </div>

        <!-- 同步代碼文字與一鍵複製 -->
        <div style="text-align: left; margin-bottom: 0.6rem;">
          <label style="font-size: 0.78rem; color: #94a3b8; font-weight: 600; display: block; margin-bottom: 3px;">
            進度同步代碼 (可複製貼到對話中給 AI 或貼至後台)：
          </label>
          <div style="display: flex; gap: 6px; margin-bottom: 6px;">
            <input type="text" id="export-qr-token-input" readonly value="${compactToken}" style="flex: 1; padding: 6px 8px; font-size: 0.78rem; border-radius: 6px; border: 1px solid #10b981; background: rgba(15, 23, 42, 0.8); color: #34d399;" />
            <button id="export-qr-copy-token-btn" type="button" style="padding: 6px 14px; background: #10b981; color: #ffffff; border: none; border-radius: 6px; font-weight: 800; cursor: pointer; white-space: nowrap;">
              📋 複製代碼
            </button>
          </div>
          <div style="display: flex; gap: 6px;">
            <input type="text" id="export-qr-url-input" readonly value="${importUrl}" style="flex: 1; padding: 6px 8px; font-size: 0.78rem; border-radius: 6px; border: 1px solid #3b82f6; background: rgba(15, 23, 42, 0.8); color: #38bdf8;" />
            <button id="export-qr-copy-url-btn" type="button" style="padding: 6px 14px; background: #3b82f6; color: #ffffff; border: none; border-radius: 6px; font-weight: 800; cursor: pointer; white-space: nowrap;">
              🔗 複製網址
            </button>
          </div>
        </div>

        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 6px 10px; text-align: left; font-size: 0.78rem; color: #34d399; line-height: 1.4;">
          💡 <strong>兩種同步玩法</strong>：<br/>
          1. <strong>手機相機掃碼</strong>：拿家長手機相機照這個 QR Code，點開連結後台自動秒速入帳！<br/>
          2. <strong>給 AI 更新</strong>：點【複製代碼】在對話框貼給我，我直接為您更新進度與戰績！
        </div>
      </div>

      <div class="student-modal-actions" style="margin-top: 0.75rem;">
        <button id="close-export-qr-btn" class="student-modal-cancel" type="button" style="width: 100%;">關閉</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const container = modal.querySelector('#export-qr-container');
  const tokenInput = modal.querySelector('#export-qr-token-input');
  const urlInput = modal.querySelector('#export-qr-url-input');
  const copyBtn = modal.querySelector('#export-qr-copy-token-btn');
  const copyUrlBtn = modal.querySelector('#export-qr-copy-url-btn');
  const closeBtn = modal.querySelector('.student-modal-close');
  const cancelBtn = modal.querySelector('#close-export-qr-btn');

  // 生成 QR Code
  try {
    if (typeof qrcode === 'function') {
      const qr = qrcode(0, 'M');
      qr.addData(importUrl);
      qr.make();
      container.innerHTML = qr.createSvgTag(5, 4);
      const svg = container.querySelector('svg');
      if (svg) {
        svg.style.display = 'block';
        svg.style.maxWidth = '200px';
        svg.style.maxHeight = '200px';
        svg.style.width = '100%';
        svg.style.height = 'auto';
      }
    }
  } catch (err) {
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(importUrl)}`;
    img.alt = 'QR Code';
    img.style.width = '200px';
    img.style.height = '200px';
    container.appendChild(img);
  }

  const closeModal = () => modal.remove();
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(tokenInput.value).then(() => {
      showToast('📋 已複製進度代碼！可在對話框貼給 AI 或貼至後台！', '✨', 3000);
      copyBtn.textContent = '✅ 已複製！';
      setTimeout(() => copyBtn.textContent = '📋 複製代碼', 2000);
    }).catch(() => {
      prompt('請手動複製此進度代碼：', tokenInput.value);
    });
  });

  copyUrlBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText(urlInput.value).then(() => {
      showToast('🔗 已複製完整同步網址！傳至電腦瀏覽器點開即秒速入帳！', '✨', 3000);
      copyUrlBtn.textContent = '✅ 已複製！';
      setTimeout(() => copyUrlBtn.textContent = '🔗 複製網址', 2000);
    }).catch(() => {
      prompt('請手動複製此完整網址：', urlInput.value);
    });
  });
}


/**
 * 彈出夢幻冒險角色選擇視窗 (5 大公主 + 5 大王子勇士)
 */
export function showCharacterSelectDialog(isFirstTime = false) {
  closeStudentDropdown();
  audio.playSfx('click', 0.4);

  const existing = document.getElementById('char-select-overlay');
  if (existing) existing.remove();

  let activeTab = 'all';
  let selectedChar = getCurrentCharacter();

  const overlay = document.createElement('div');
  overlay.id = 'char-select-overlay';
  overlay.className = 'char-select-overlay';

  function renderDialog() {
    const filteredChars = CHARACTERS.filter(c => {
      if (activeTab === 'princess') return c.gender === 'girl';
      if (activeTab === 'prince') return c.gender === 'boy';
      return true;
    });

    overlay.innerHTML = `
      <div class="char-select-dialog">
        <div class="char-select-header">
          <div class="char-select-header-title">
            <span style="font-size: 2rem;">👑</span>
            <div>
              <h2>選擇你的冒險小勇士形象</h2>
              <p>${isFirstTime ? '歡迎來到奇幻數學島！挑選專屬英雄開始冒險吧！' : '隨時可以更換你喜歡的公主或勇士立繪喔！'}</p>
            </div>
          </div>
          <button class="char-select-close-btn" type="button" aria-label="關閉">✕</button>
        </div>

        <div class="char-tab-bar">
          <button class="char-tab-btn ${activeTab === 'all' ? 'is-active' : ''}" data-tab="all" type="button">🌈 全部英雄 (${CHARACTERS.length})</button>
          <button class="char-tab-btn ${activeTab === 'princess' ? 'is-active' : ''}" data-tab="princess" type="button">🌸 夢幻公主 (5)</button>
          <button class="char-tab-btn ${activeTab === 'prince' ? 'is-active' : ''}" data-tab="prince" type="button">👦 王子勇士 (5)</button>
        </div>

        <div class="char-grid-container">
          ${filteredChars.map(c => `
            <div class="char-card ${selectedChar.id === c.id ? 'is-selected' : ''}" data-char-id="${c.id}">
              <span class="char-badge-tag ${c.gender === 'girl' ? 'is-girl' : 'is-boy'}">
                <span class="char-badge-ico">${c.gender === 'girl' ? '👑' : '⚔️'}</span>
                <span class="char-badge-txt">${c.gender === 'girl' ? '公主' : '勇士'}</span>
              </span>
              <div class="char-avatar-wrapper">
                <img src="${c.image}" alt="${c.name}" class="char-avatar-img" />
              </div>
              <div class="char-info-name">${c.avatar} ${c.name}</div>
              <div class="char-info-title">${c.title}</div>
              <div class="char-info-trait">${c.trait}</div>
            </div>
          `).join('')}
        </div>

        <div class="char-select-footer">
          <div class="char-selected-preview">
            <img src="${selectedChar.image}" alt="${selectedChar.name}" class="char-preview-thumb" />
            <div>
              <div class="char-preview-desc">當前選定：<strong>${selectedChar.name}</strong> (${selectedChar.title})</div>
              <div style="font-size: 0.78rem; color: #64748b; font-style: italic;">「${selectedChar.quote}」</div>
            </div>
          </div>
          <button class="char-confirm-btn" type="button" id="confirm-select-char-btn">就決定是你了！出發 🚀</button>
        </div>
      </div>
    `;

    // 綁定事件
    overlay.querySelector('.char-select-close-btn').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.querySelectorAll('.char-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        audio.playSfx('click', 0.2);
        renderDialog();
      });
    });

    overlay.querySelectorAll('.char-card').forEach(card => {
      card.addEventListener('click', () => {
        const charId = card.dataset.charId;
        const found = CHARACTERS.find(c => c.id === charId);
        if (found) {
          selectedChar = found;
          audio.playSfx('click', 0.3);
          renderDialog();
        }
      });
    });

    overlay.querySelector('#confirm-select-char-btn').addEventListener('click', () => {
      setCurrentCharacter(selectedChar);
      const student = getCurrentStudent();
      if (student && student.id) {
        student.characterId = selectedChar.id;
        try {
          localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(student));
          const list = getLocalStudents();
          const target = list.find(s => s.id === student.id);
          if (target) {
            target.characterId = selectedChar.id;
            saveLocalStudents(list);
          }
        } catch (e) {}
      }
      updateStudentPillUI();
      audio.playSfx('win', 0.5);
      showToast(`已化身為【${selectedChar.name}】！冒險啟程囉！`, selectedChar.avatar, 3000);
      overlay.remove();
    });
  }

  renderDialog();
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

window.showCharacterSelectDialog = showCharacterSelectDialog;

window.showTabletQRDialog = showTabletQRDialog;
window.showProgressExportQRDialog = showProgressExportQRDialog;


