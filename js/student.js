/**
 * js/student.js
 * 奇幻數學島 前台學童身分管理與歷程/成績自動回傳模組 (v2.8.1)
 * 支援專用 URL 鎖定 (?kid=xxx)、多學童切換、離線暫存隊列與伺服器雙軌同步
 */

import { getCurrentSubject, getCurrentGrade } from './state.js';
import { showToast } from './ui.js';
import { audio } from './audio.js';

const STORAGE_KEY_CURRENT = 'fantasy_math_current_student';
const STORAGE_KEY_STUDENTS = 'fantasy_math_students_cache';
const STORAGE_KEY_PENDING = 'fantasy_math_pending_records';

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
    const res = await fetch('/api/students', { cache: 'no-store' });
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
    const res = await fetch('/api/students', {
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
      const res = await fetch('/api/records', {
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
 * 關卡過關結算回傳後台 (具離線隊列容錯)
 */
export async function uploadLevelRecord({ level, score, stars, durationSeconds, errors }) {
  const student = getCurrentStudent();
  const record = {
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

  try {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (res.ok) {
      console.log('[StudentSync] 成績已即時成功上傳後台:', record);
      return { success: true, offline: false };
    }
  } catch (e) {
    // 網路中斷或後台未開
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
  const lockIcon = document.getElementById('student-lock-icon');
  const student = getCurrentStudent();

  if (avatarEl) avatarEl.textContent = student.avatar || '🦊';
  if (nameEl) nameEl.textContent = student.name || '冒險小勇士';
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

  container.innerHTML = students.map(s => {
    const isSelected = s.id === current.id;
    return `
      <button class="student-item ${isSelected ? 'is-selected' : ''}" type="button" data-kid="${s.id}">
        <span class="student-item-avatar">${s.avatar || '🌟'}</span>
        <span class="student-item-name">${s.name}</span>
        ${isSelected ? '<span class="student-item-check">✓</span>' : ''}
      </button>
    `;
  }).join('');

  container.querySelectorAll('.student-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const kid = btn.dataset.kid;
      const target = students.find(s => s.id === kid);
      if (target) {
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

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('student-dropdown-menu');
    if (menu && !menu.contains(e.target) && e.target !== studentBtn) {
      closeStudentDropdown();
    }
  });
}
