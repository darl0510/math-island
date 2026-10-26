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
const STORAGE_KEY_RECORDS = 'fantasy_math_admin_records';

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
    const res = await fetch('/api/records', {
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

  const syncQuickBtn = document.getElementById('sync-student-quick-btn');
  syncQuickBtn?.addEventListener('click', () => {
    closeStudentDropdown();
    showProgressSyncDialog();
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
 * 產生進度同步碼字串 (Base64 UTF-8 相容)
 */
export function generateSyncTokenString(student = getCurrentStudent()) {
  const data = packStudentProgressData(student);
  const jsonStr = JSON.stringify(data);
  const b64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
  return `FMP1_${b64}`;
}

/**
 * 解析進度同步碼字串
 */
export function parseSyncTokenString(tokenStr) {
  if (!tokenStr || !tokenStr.startsWith('FMP1_')) {
    throw new Error('無效的進度同步碼格式（需為 FMP1_ 開頭）');
  }
  const b64 = tokenStr.slice(5).trim();
  const jsonStr = decodeURIComponent(Array.prototype.map.call(atob(b64), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  return JSON.parse(jsonStr);
}

/**
 * 向後台伺服器整包上傳最新進度
 */
export async function uploadStudentProgressToServer(student = getCurrentStudent(), notify = true) {
  const payload = packStudentProgressData(student);
  try {
    const res = await fetch('/api/sync_progress', {
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
export function showProgressSyncDialog() {
  audio.playSfx('click', 0.4);
  const existingModal = document.getElementById('sync-progress-modal');
  if (existingModal) existingModal.remove();

  const student = getCurrentStudent();
  const tokenStr = generateSyncTokenString(student);
  const pack = packStudentProgressData(student);
  const passes = pack.records.length;
  const stars = pack.records.reduce((acc, r) => acc + (r.stars || 0), 0);

  const modal = document.createElement('div');
  modal.id = 'sync-progress-modal';
  modal.className = 'student-modal-overlay';
  modal.innerHTML = `
    <div class="student-modal-card" style="max-width: 480px;">
      <div class="student-modal-header">
        <span class="student-modal-icon">☁️</span>
        <h3>冒險進度同步與雲端上傳</h3>
        <button class="student-modal-close" type="button" aria-label="關閉">✕</button>
      </div>
      <div class="student-modal-body" style="font-size: 0.9rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; background: rgba(15, 23, 42, 0.6); padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 0.75rem;">
          <span style="font-size: 2rem;">${student.avatar || '🦊'}</span>
          <div>
            <div style="font-weight: 700; font-size: 1.05rem;">${student.name}</div>
            <div style="color: #94a3b8; font-size: 0.8rem;">本機累計：${passes} 場通關 ｜ ⭐ ${stars} 顆榮譽星星</div>
          </div>
        </div>

        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 6px 10px; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 6px; font-size: 0.82rem; color: #34d399;">
          <span>🔄</span>
          <span><strong>自動推進上傳已啟動</strong>：每次過關獲得星星時自動背景推播同步</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button id="direct-upload-btn" type="button" class="student-modal-confirm" style="background: #3b82f6; width: 100%;">
            📤 立即連線上傳至電腦後台
          </button>
          <button id="copy-sync-token-btn" type="button" class="student-modal-confirm" style="background: #8b5cf6; width: 100%;">
            📋 複製平板進度同步碼 (跨設備/離線用)
          </button>
        </div>

        <div style="margin-top: 1rem; border-top: 1px dashed rgba(255, 255, 255, 0.15); padding-top: 0.75rem;">
          <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">或從其他設備匯入進度碼：</div>
          <div style="display: flex; gap: 6px;">
            <input type="text" id="paste-sync-input" placeholder="貼上 FMP1_ 開頭的同步碼..." style="flex: 1; padding: 6px 8px; font-size: 0.8rem; border-radius: 4px; border: 1px solid #475569; background: #0f172a; color: #f8fafc;" />
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
  const applyBtn = modal.querySelector('#apply-sync-token-btn');
  const pasteInput = modal.querySelector('#paste-sync-input');

  const closeModal = () => modal.remove();

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
      setTimeout(() => copyBtn.textContent = '📋 複製平板進度同步碼 (跨設備/離線用)', 2000);
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
