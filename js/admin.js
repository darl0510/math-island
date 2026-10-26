/**
 * 🌈 奇幻數學島 - 後台管理中心邏輯模組 (admin.js)
 * 支援學童增修、專屬連結複製、學習歷程即時看板、弱點章節統計與成績匯出
 */

const API_BASE = window.location.origin;

// LocalStorage 離線與 GitHub Pages 雙軌相容儲存鍵 (與 student.js 一致)
const STORAGE_KEY_STUDENTS = 'fantasy_math_students_cache';
const STORAGE_KEY_PENDING = 'fantasy_math_pending_records';
const STORAGE_KEY_RECORDS = 'fantasy_math_admin_records';

function getLocalStudents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('[Admin] 讀取本地學童快取失敗:', e);
  }
  return [
    { id: 'kid_star_01', name: '探索小勇士', avatar: '🦊', created_at: new Date().toISOString() }
  ];
}

function saveLocalStudents(list) {
  try {
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(list));
  } catch (e) {
    console.warn('[Admin] 儲存本地學童快取失敗:', e);
  }
}

function getLocalRecords() {
  let records = [];
  try {
    const rawSaved = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (rawSaved) {
      const parsed = JSON.parse(rawSaved);
      if (Array.isArray(parsed)) records = parsed;
    }
  } catch (e) {}

  try {
    const rawPending = localStorage.getItem(STORAGE_KEY_PENDING);
    if (rawPending) {
      const pending = JSON.parse(rawPending);
      if (Array.isArray(pending)) {
        pending.forEach(p => {
          if (!p.id) p.id = `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
          if (!records.some(r => r.id === p.id || (r.timestamp === p.timestamp && r.student_id === p.student_id))) {
            records.push(p);
          }
        });
      }
    }
  } catch (e) {}
  return records;
}

function saveLocalRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  } catch (e) {}
}

// 狀態快取
const state = {
  isServerOnline: false,
  students: [],
  records: [],
  currentTab: 'students',
  filters: {
    studentId: 'all',
    subject: 'all',
    grade: 'all',
    search: '',
    sort: 'newest'
  },
  modal: {
    mode: 'create', // 'create' | 'edit'
    studentId: null,
    selectedAvatar: '🦊'
  },
  hostInfo: {
    localIp: '',
    port: 8000,
    hostUrl: ''
  }
};

const SUBJECT_NAMES = {
  math: '奇幻數學島',
  english: '魔法英文島',
  chinese: '博學國語島',
  natural: '自然探索島',
  social: '人文生活社會島',
  final: '期末挑戰金盃'
};

const AVATAR_OPTIONS = ['🦊', '🦁', '🐼', '🐰', '🦄', '🐯', '🐨', '🦉', '🐱', '🐶', '🚀', '🌟'];

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupEventListeners();
  await loadData();
  checkUrlImportToken();
});

// 分頁切換
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      switchTab(targetTab);
    });
  });
}

function switchTab(tabName) {
  state.currentTab = tabName;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab-${tabName}`);
  });

  if (tabName === 'records') {
    renderRecords();
  } else if (tabName === 'weakness') {
    renderWeakness();
  } else if (tabName === 'students') {
    renderStudents();
  }
}

// 綁定事件監聽
function setupEventListeners() {
  // 重新整理
  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    loadData();
    showToast('🔄 已重新整理資料');
  });

  // 新增學童按鈕
  document.getElementById('add-student-btn')?.addEventListener('click', () => {
    openStudentModal('create');
  });

  // 學童搜尋
  document.getElementById('student-search')?.addEventListener('input', (e) => {
    state.filters.search = e.target.value.trim().toLowerCase();
    renderStudents();
  });

  // 歷程過濾條件
  document.getElementById('filter-student')?.addEventListener('change', (e) => {
    state.filters.studentId = e.target.value;
    renderRecords();
  });
  document.getElementById('filter-subject')?.addEventListener('change', (e) => {
    state.filters.subject = e.target.value;
    renderRecords();
  });
  document.getElementById('filter-grade')?.addEventListener('change', (e) => {
    state.filters.grade = e.target.value;
    renderRecords();
  });

  // 彈窗關閉
  document.getElementById('student-modal-close')?.addEventListener('click', closeStudentModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeStudentModal);
  document.getElementById('student-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'student-modal') closeStudentModal();
  });

  // 彈窗儲存
  document.getElementById('modal-save-btn')?.addEventListener('click', handleSaveStudent);

  // 頭像點擊
  const avatarList = document.getElementById('modal-avatar-list');
  if (avatarList) {
    avatarList.innerHTML = AVATAR_OPTIONS.map(a => `
      <button type="button" class="avatar-opt ${a === state.modal.selectedAvatar ? 'selected' : ''}" data-avatar="${a}">
        ${a}
      </button>
    `).join('');

    avatarList.addEventListener('click', (e) => {
      const opt = e.target.closest('.avatar-opt');
      if (opt) {
        state.modal.selectedAvatar = opt.dataset.avatar;
        avatarList.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('selected'));
        opt.classList.add('selected');
      }
    });
  }

  // 匯出按鈕
  document.getElementById('export-students-csv')?.addEventListener('click', exportStudentsCSV);
  document.getElementById('export-records-csv')?.addEventListener('click', exportRecordsCSV);
  document.getElementById('export-json-backup')?.addEventListener('click', exportJSONBackup);

  // 錯題彈窗
  document.getElementById('error-modal-close')?.addEventListener('click', closeErrorModal);
  document.getElementById('error-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'error-modal') closeErrorModal();
  });

  // 平板直連 QR Code 彈窗與事件綁定
  initTabletQRModal();
}

// 載入資料 (雙軌支援：伺服器在線 vs GitHub Pages / 離線 LocalStorage)
async function loadData() {
  const statusBadge = document.getElementById('connection-status');
  let serverSuccess = false;

  // 1. 若處於本地伺服器或自定義環境，嘗試發送 API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const [resStudents, resRecords] = await Promise.all([
      fetch(`${API_BASE}/api/students`, { signal: controller.signal }).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
      fetch(`${API_BASE}/api/records`, { signal: controller.signal }).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
    ]);
    clearTimeout(timeoutId);

    if (resStudents.success && resRecords.success) {
      state.isServerOnline = true;
      state.students = resStudents.students || [];
      state.records = resRecords.records || [];
      serverSuccess = true;

      // 同步最新名冊至本地快取
      saveLocalStudents(state.students);
      saveLocalRecords(state.records);

      // 自動探測本機伺服器局域網 Host 資訊
      try {
        const resHost = await fetch(`${API_BASE}/api/host_info`).then(r => r.json());
        if (resHost.success && resHost.local_ip) {
          state.hostInfo.localIp = resHost.local_ip;
          state.hostInfo.port = resHost.port || 8000;
          state.hostInfo.hostUrl = `http://${resHost.local_ip}:${resHost.port || 8000}`;
        }
      } catch (e) {}

      if (statusBadge) {
        statusBadge.className = 'status-badge';
        statusBadge.innerHTML = '<span class="status-dot"></span> 伺服器在線 (同步中)';
        statusBadge.title = '後端 server.py 連線正常，資料即時保存至伺服器';
      }
    }
  } catch (err) {
    serverSuccess = false;
  }

  // 2. 伺服器離線或處於 GitHub Pages，自動降級為本地 LocalStorage 模式
  if (!serverSuccess) {
    state.isServerOnline = false;
    state.hostInfo.hostUrl = window.location.origin;
    state.students = getLocalStudents().filter(s => s.id !== 'visitor');
    if (state.students.length === 0) {
      state.students = [
        { id: 'kid_star_01', name: '探索小勇士', avatar: '🦊', created_at: new Date().toISOString() }
      ];
      saveLocalStudents(state.students);
    }
    state.records = getLocalRecords();

    const isGithub = window.location.hostname.includes('github.io');
    if (statusBadge) {
      statusBadge.className = 'status-badge local-mode';
      statusBadge.innerHTML = `<span class="status-dot"></span> ${isGithub ? 'GitHub Pages 本地模式' : '本地離線儲存模式'}`;
      statusBadge.title = '目前處於瀏覽器 LocalStorage 本地儲存模式，新增與成績皆保存在本機瀏覽器！';
    }
  }

  updateStudentFilterDropdown();
  renderAll();
}

function renderAll() {
  renderOverviewStats();
  renderStudents();
  renderRecords();
  renderWeakness();
}

// 更新學童下拉過濾選單
function updateStudentFilterDropdown() {
  const select = document.getElementById('filter-student');
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="all">全部學童</option>' + 
    state.students.map(s => `<option value="${s.id}">${s.avatar} ${escapeHtml(s.name)}</option>`).join('');
  if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
    select.value = currentVal;
  }
}

// 總覽統計指標
function renderOverviewStats() {
  const totalStudents = state.students.length;
  const totalRecords = state.records.length;
  
  const avgScore = totalRecords > 0 
    ? Math.round(state.records.reduce((acc, r) => acc + (r.score || 0), 0) / totalRecords)
    : 0;
  
  const totalStars = state.records.reduce((acc, r) => acc + (r.stars || 0), 0);

  document.getElementById('stat-total-students').textContent = totalStudents;
  document.getElementById('stat-total-records').textContent = totalRecords;
  document.getElementById('stat-avg-score').textContent = `${avgScore} 分`;
  document.getElementById('stat-total-stars').textContent = totalStars;
}

// 渲染學童名單
function renderStudents() {
  const grid = document.getElementById('students-grid');
  if (!grid) return;

  let list = state.students;
  if (state.filters.search) {
    const q = state.filters.search;
    list = list.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🎒</div>
        <div class="empty-text">尚無學童資料，請點擊上方按鈕新增第一位冒險小勇士！</div>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map(student => {
    // 統計個別學童數據
    const sRecords = state.records.filter(r => r.student_id === student.id);
    const passes = sRecords.length;
    const stars = sRecords.reduce((acc, r) => acc + (r.stars || 0), 0);
    const avgScore = passes > 0 ? Math.round(sRecords.reduce((acc, r) => acc + (r.score || 0), 0) / passes) : 0;
    
    // 專屬連結
    const directUrl = `${window.location.origin}/index.html?kid=${student.id}`;

    return `
      <div class="student-card" data-id="${student.id}">
        <div class="student-card-header">
          <div class="student-avatar-wrap">${student.avatar || '🦊'}</div>
          <div class="student-details">
            <div class="student-name-row">
              <span class="student-name" title="${escapeHtml(student.name)}">${escapeHtml(student.name)}</span>
            </div>
            <span class="student-id-tag">${student.id}</span>
          </div>
        </div>

        <div class="student-card-metrics">
          <div class="metric-item">
            <span class="metric-item-num">${passes}</span>
            <span class="metric-item-label">通關紀錄</span>
          </div>
          <div class="metric-item">
            <span class="metric-item-num">⭐ ${stars}</span>
            <span class="metric-item-label">累計星數</span>
          </div>
          <div class="metric-item">
            <span class="metric-item-num">${avgScore}</span>
            <span class="metric-item-label">平均得分</span>
          </div>
        </div>
        ${passes === 0 ? `
          <div style="background: rgba(56, 189, 248, 0.1); border: 1px dashed rgba(56, 189, 248, 0.35); border-radius: var(--radius-sm); padding: 6px 10px; margin: -4px 0 10px 0; text-align: center; font-size: 0.78rem; color: #38bdf8;">
            💡 孩子之前已有遊玩？點下方【📥 補登本機進度】即可認領
          </div>
        ` : ''}

        <div class="student-card-actions">
          <button type="button" class="btn-card primary" style="background: linear-gradient(135deg, #8b5cf6, #6366f1); border-color: #7c3aed; color: #fff; font-weight: 700;" onclick="openImportTokenModal('${student.id}', '${escapeHtml(student.name)}')" title="貼上孩子在平板複製的進度碼，瞬間帶入平板真實戰績">
            📥 匯入平板進度
          </button>
          <button type="button" class="btn-card" onclick="importLocalProgressToStudent('${student.id}', '${escapeHtml(student.name)}')" title="將此台電腦先前已獲取的通關星星補登給此學童">
            💻 補登電腦進度
          </button>
          <button type="button" class="btn-card" style="background: rgba(16, 185, 129, 0.15); border-color: #10b981; color: #34d399; font-weight: 700;" onclick="openTabletQRModal('${student.id}', '${escapeHtml(student.name)}')" title="查看此學童專屬的平板直連 QR Code 與網址">
            📱 掃碼直連
          </button>
          <button type="button" class="btn-card copy-link" onclick="copyStudentLink('${student.id}', '${escapeHtml(student.name)}')">
            📋 複製專屬連結
          </button>
          <a href="${directUrl}" target="_blank" class="btn-card launch-game">
            🚀 開啟遊玩
          </a>
          <button type="button" class="btn-card" onclick="viewStudentRecords('${student.id}')">
            📊 歷程
          </button>
          <button type="button" class="btn-card" onclick="openStudentModal('edit', '${student.id}')">
            ✏️ 編輯
          </button>
          <button type="button" class="btn-card danger" onclick="confirmDeleteStudent('${student.id}', '${escapeHtml(student.name)}')">
            🗑️ 刪除
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 渲染學習歷程表格
function renderRecords() {
  const tbody = document.getElementById('records-tbody');
  if (!tbody) return;

  let records = [...state.records];

  // 篩選學童
  if (state.filters.studentId !== 'all') {
    records = records.filter(r => r.student_id === state.filters.studentId);
  }
  // 篩選科目
  if (state.filters.subject !== 'all') {
    records = records.filter(r => r.subject === state.filters.subject);
  }
  // 篩選年級
  if (state.filters.grade !== 'all') {
    records = records.filter(r => String(r.grade) === String(state.filters.grade));
  }

  // 排序：最新優先
  records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // 即時更新歷程上方指標
  const count = records.length;
  const avg = count > 0 ? Math.round(records.reduce((acc, r) => acc + (r.score || 0), 0) / count) : 0;
  const threeStars = records.filter(r => r.stars === 3).length;
  const totalDuration = records.reduce((acc, r) => acc + (r.duration_seconds || 0), 0);
  const totalMins = Math.floor(totalDuration / 60);

  document.getElementById('rec-stat-count').textContent = count;
  document.getElementById('rec-stat-avg').textContent = `${avg} 分`;
  document.getElementById('rec-stat-3stars').textContent = `${threeStars} 次`;
  document.getElementById('rec-stat-time').textContent = `${totalMins} 分鐘`;

  if (records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          <div class="empty-icon">📊</div>
          <div class="empty-text">目前尚無符合篩選條件的學習紀錄</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = records.map(r => {
    const student = state.students.find(s => s.id === r.student_id);
    const avatar = student ? student.avatar : '🦊';
    const studentName = r.student_name || (student ? student.name : '未知小勇士');
    const subjectClass = `subject-${r.subject || 'math'}`;
    const subjectTitle = SUBJECT_NAMES[r.subject] || r.subject;
    const errorCount = (r.errors && r.errors.length) || 0;
    const timeFormatted = r.timestamp ? r.timestamp.replace('T', ' ').substring(0, 16) : '-';
    const durationFormatted = `${r.duration_seconds || 0} 秒`;

    const starsHtml = '⭐'.repeat(r.stars || 0) + '☆'.repeat(Math.max(0, 3 - (r.stars || 0)));

    return `
      <tr>
        <td style="color: var(--text-dim); font-size: 0.82rem; white-space: nowrap;">${timeFormatted}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.4rem; font-weight: 600;">
            <span>${avatar}</span>
            <span>${escapeHtml(studentName)}</span>
          </div>
        </td>
        <td><span class="subject-pill ${subjectClass}">${subjectTitle}</span></td>
        <td><span style="font-weight: 600;">${r.grade ? `${r.grade} 年級` : '-'}</span></td>
        <td><span style="font-weight: 600;">${escapeHtml(r.level_title || `第 ${r.level_id} 關`)}</span></td>
        <td>
          <span style="font-family: var(--font-heading); font-weight: 700; color: ${r.score >= 80 ? '#34d399' : '#fb7185'};">
            ${r.score} 分
          </span>
        </td>
        <td><span style="color: #fbbf24; letter-spacing: 2px;">${starsHtml}</span></td>
        <td style="color: var(--text-muted);">${durationFormatted}</td>
        <td>
          ${errorCount > 0 
            ? `<button type="button" class="btn-card danger" style="padding: 2px 8px; font-size: 0.78rem;" onclick="viewErrorDetails('${r.id}')">❌ ${errorCount} 題 (查看)</button>`
            : `<span style="color: #34d399; font-size: 0.85rem;">全對 ✨</span>`
          }
        </td>
      </tr>
    `;
  }).join('');
}

// 渲染弱點章節統計
function renderWeakness() {
  const container = document.getElementById('weakness-content');
  if (!container) return;

  const errorRecords = state.records.filter(r => r.errors && r.errors.length > 0);
  
  if (errorRecords.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🎉</div>
        <div class="empty-text">目前所有小勇士作答皆完美無錯題！太厲害了！</div>
      </div>
    `;
    return;
  }

  // 1. 科目錯誤率統計
  const subjectErrorCount = {};
  const levelErrorMap = {};
  const questionErrorMap = {};

  errorRecords.forEach(r => {
    const sub = r.subject || 'math';
    subjectErrorCount[sub] = (subjectErrorCount[sub] || 0) + r.errors.length;

    const levelKey = `${r.grade}年級 - ${SUBJECT_NAMES[sub] || sub} - ${r.level_title || `第${r.level_id}關`}`;
    levelErrorMap[levelKey] = (levelErrorMap[levelKey] || 0) + r.errors.length;

    r.errors.forEach(err => {
      const qText = err.question || (err.q && err.q.text) || '未知題目';
      questionErrorMap[qText] = (questionErrorMap[qText] || 0) + 1;
    });
  });

  // 排序最高錯誤關卡
  const topLevels = Object.entries(levelErrorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 排序最常錯題型
  const topQuestions = Object.entries(questionErrorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  container.innerHTML = `
    <div class="weakness-grid">
      <div class="weakness-card">
        <div class="weakness-card-title">⚠️ 最需加強複習關卡 (Top 5)</div>
        <div class="rank-list">
          ${topLevels.map(([level, count], idx) => `
            <div class="rank-item">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span class="rank-num">${idx + 1}</span>
                <span style="font-weight: 600; font-size: 0.9rem;">${escapeHtml(level)}</span>
              </div>
              <span style="color: #fb7185; font-weight: 700;">${count} 次錯題</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="weakness-card">
        <div class="weakness-card-title">🔍 易混淆高頻題目 (Top 5)</div>
        <div class="rank-list">
          ${topQuestions.map(([q, count], idx) => `
            <div class="rank-item" style="flex-direction: column; align-items: flex-start; gap: 0.35rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <span style="font-weight: 700; color: #fbbf24; font-size: 0.85rem;">題型 #${idx + 1}</span>
                <span style="color: #fb7185; font-weight: 700; font-size: 0.85rem;">累計失誤 ${count} 次</span>
              </div>
              <div style="font-size: 0.88rem; color: var(--text-main); word-break: break-word;">${escapeHtml(q)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="weakness-card" style="grid-column: 1 / -1;">
        <div class="weakness-card-title">💡 教師與家長輔導處方箋建議</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
          <div style="background: rgba(15, 23, 42, 0.5); padding: 1rem; border-radius: var(--radius-md); border-left: 4px solid #38bdf8;">
            <div style="font-weight: 700; margin-bottom: 0.3rem;">📘 題意理解與視覺教具</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              建議善用遊戲內建的「直式計算教具」與「動態數線」，讓學童先從具象操作建立觀念，避免過早依賴機械式計算。
            </div>
          </div>
          <div style="background: rgba(15, 23, 42, 0.5); padding: 1rem; border-radius: var(--radius-md); border-left: 4px solid #a855f7;">
            <div style="font-weight: 700; margin-bottom: 0.3rem;">🔤 雙軌語音與朗讀輔助</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              針對國語與英文島關卡，鼓勵孩子點擊卡片右上角的「🔊 聽題目朗讀」或開關注音標示，提升文字辨識信心。
            </div>
          </div>
          <div style="background: rgba(15, 23, 42, 0.5); padding: 1rem; border-radius: var(--radius-md); border-left: 4px solid #34d399;">
            <div style="font-weight: 700; margin-bottom: 0.3rem;">🎯 專屬連結精準複習</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              可利用學童專屬連結開啟特定關卡重複挑戰，達 3 次三星完美通關時頒發實體小獎勵，激勵自主學習。
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 彈窗操作：新增 / 編輯學童
function openStudentModal(mode = 'create', studentId = null) {
  state.modal.mode = mode;
  state.modal.studentId = studentId;

  const modal = document.getElementById('student-modal');
  const title = document.getElementById('modal-title');
  const nameInput = document.getElementById('student-name-input');
  const avatarList = document.getElementById('modal-avatar-list');

  if (mode === 'edit') {
    const student = state.students.find(s => s.id === studentId);
    if (!student) return;
    title.textContent = '✏️ 編輯冒險小勇士';
    nameInput.value = student.name;
    state.modal.selectedAvatar = student.avatar || '🦊';
  } else {
    title.textContent = '➕ 新增冒險小勇士';
    nameInput.value = '';
    state.modal.selectedAvatar = '🦊';
  }

  // 刷新選取樣式
  if (avatarList) {
    avatarList.querySelectorAll('.avatar-opt').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.avatar === state.modal.selectedAvatar);
    });
  }

  modal?.classList.add('active');
  nameInput?.focus();
}

function closeStudentModal() {
  document.getElementById('student-modal')?.classList.remove('active');
}

async function handleSaveStudent() {
  const nameInput = document.getElementById('student-name-input');
  const name = nameInput.value.trim();
  if (!name) {
    alert('請輸入小勇士姓名！');
    nameInput.focus();
    return;
  }

  const avatar = state.modal.selectedAvatar;

  // 1. 若伺服器在線，優先嘗試 API 同步
  if (state.isServerOnline) {
    try {
      if (state.modal.mode === 'create') {
        const res = await fetch(`${API_BASE}/api/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, avatar })
        }).then(r => r.json());

        if (res.success) {
          showToast(`🎉 成功新增小勇士「${escapeHtml(name)}」！`);
          closeStudentModal();
          await loadData();
          return;
        } else {
          alert(res.error || '新增失敗');
          return;
        }
      } else {
        // 編輯
        const res = await fetch(`${API_BASE}/api/students`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: state.modal.studentId, name, avatar })
        }).then(r => r.json());

        if (res.success) {
          showToast(`✅ 已更新小勇士「${escapeHtml(name)}」資料！`);
          closeStudentModal();
          await loadData();
          return;
        } else {
          alert(res.error || '更新失敗');
          return;
        }
      }
    } catch (err) {
      console.warn('[Admin] 伺服器連線中斷，自動降級至本地儲存模式:', err);
      state.isServerOnline = false;
      const statusBadge = document.getElementById('connection-status');
      if (statusBadge) {
        statusBadge.className = 'status-badge local-mode';
        statusBadge.innerHTML = '<span class="status-dot"></span> 本地離線儲存模式';
      }
    }
  }

  // 2. 本地 LocalStorage 儲存模式 (GitHub Pages / 離線備援)
  if (state.modal.mode === 'create') {
    const newStudent = {
      id: `kid_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      avatar,
      created_at: new Date().toISOString()
    };
    state.students.push(newStudent);
    saveLocalStudents(state.students);
    showToast(`🎉 成功新增小勇士「${escapeHtml(name)}」（本地儲存）！`);
  } else {
    const idx = state.students.findIndex(s => s.id === state.modal.studentId);
    if (idx !== -1) {
      state.students[idx].name = name;
      state.students[idx].avatar = avatar;
      saveLocalStudents(state.students);
      showToast(`✅ 已更新小勇士「${escapeHtml(name)}」資料（本地儲存）！`);
    }
  }

  closeStudentModal();
  updateStudentFilterDropdown();
  renderAll();
}

// 刪除學童確認 (雙軌支援)
async function confirmDeleteStudent(studentId, studentName) {
  const confirmed = confirm(`確定要刪除冒險小勇士「${studentName}」嗎？\n此動作將一併清除該學童的專屬識別資料。`);
  if (!confirmed) return;

  if (state.isServerOnline) {
    try {
      const res = await fetch(`${API_BASE}/api/students?id=${encodeURIComponent(studentId)}`, {
        method: 'DELETE'
      }).then(r => r.json());

      if (res.success) {
        showToast(`🗑️ 已刪除學童「${studentName}」`);
        await loadData();
        return;
      }
    } catch (err) {
      console.warn('[Admin] 伺服器刪除失敗，降級為本地刪除:', err);
      state.isServerOnline = false;
    }
  }

  // 本地模式刪除
  state.students = state.students.filter(s => s.id !== studentId);
  saveLocalStudents(state.students);
  showToast(`🗑️ 已刪除學童「${studentName}」（本地儲存）`);
  updateStudentFilterDropdown();
  renderAll();
}

// 複製專屬連結 (保全 GitHub Pages 子路徑)
window.copyStudentLink = function(studentId, studentName) {
  const url = new URL(`index.html?kid=${encodeURIComponent(studentId)}`, window.location.href).href;
  navigator.clipboard.writeText(url).then(() => {
    showToast(`📋 已複製「${studentName}」的專屬鎖定連結！`);
  }).catch(() => {
    prompt('請手動複製此專屬連結：', url);
  });
};

// 查看個別學童歷程
window.viewStudentRecords = function(studentId) {
  state.filters.studentId = studentId;
  const select = document.getElementById('filter-student');
  if (select) select.value = studentId;
  switchTab('records');
};

// 錯題彈窗
window.viewErrorDetails = function(recordId) {
  const rec = state.records.find(r => r.id === recordId);
  if (!rec || !rec.errors || rec.errors.length === 0) return;

  const modal = document.getElementById('error-modal');
  const modalBody = document.getElementById('error-modal-body');
  
  modalBody.innerHTML = `
    <div style="margin-bottom: 1rem; color: var(--text-muted); font-size: 0.9rem;">
      關卡：<strong style="color: var(--text-main);">${escapeHtml(rec.level_title || `第 ${rec.level_id} 關`)}</strong> (${SUBJECT_NAMES[rec.subject] || rec.subject} ${rec.grade} 年級)
    </div>
    <div style="display: flex; flex-direction: column; gap: 0.85rem; max-height: 380px; overflow-y: auto;">
      ${rec.errors.map((err, idx) => {
        const qText = err.question || (err.q && err.q.text) || '未記錄題目';
        const userAns = err.user_answer !== undefined ? err.user_answer : (err.userAns || '未作答');
        const correctAns = err.correct_answer !== undefined ? err.correct_answer : (err.correctAns || '詳見關卡解答');

        return `
          <div style="background: rgba(15, 23, 42, 0.7); padding: 0.85rem 1rem; border-radius: var(--radius-md); border-left: 3px solid #fb7185;">
            <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 0.3rem;">題目 #${idx + 1}：${escapeHtml(qText)}</div>
            <div style="font-size: 0.85rem; color: #fb7185;">❌ 學童選擇：${escapeHtml(String(userAns))}</div>
            <div style="font-size: 0.85rem; color: #34d399;">✅ 正確解答：${escapeHtml(String(correctAns))}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  modal?.classList.add('active');
};

function closeErrorModal() {
  document.getElementById('error-modal')?.classList.remove('active');
}

// 匯出學童名冊 CSV (含 UTF-8 BOM，Excel 中文不亂碼)
function exportStudentsCSV() {
  if (state.students.length === 0) {
    alert('尚無學童資料可供匯出');
    return;
  }

  const headers = ['學童ID', '頭像', '學童姓名', '建立時間', '通關關卡數', '累計星數', '專屬登入連結'];
  const rows = state.students.map(s => {
    const sRecords = state.records.filter(r => r.student_id === s.id);
    const passes = sRecords.length;
    const stars = sRecords.reduce((acc, r) => acc + (r.stars || 0), 0);
    const link = new URL(`index.html?kid=${encodeURIComponent(s.id)}`, window.location.href).href;
    return [
      `"${s.id}"`,
      `"${s.avatar || '🦊'}"`,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${s.created_at || ''}"`,
      passes,
      stars,
      `"${link}"`
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  downloadFile(csvContent, `奇幻數學島_學童名冊_${formatDate(new Date())}.csv`, 'text/csv;charset=utf-8;');
  showToast('📥 學童名冊 CSV 匯出成功！');
}

// 匯出完整歷程 CSV
function exportRecordsCSV() {
  if (state.records.length === 0) {
    alert('尚無作答紀錄可供匯出');
    return;
  }

  const headers = ['紀錄ID', '作答時間', '學童ID', '學童姓名', '科目', '年級', '關卡名稱', '得分', '獲得星數', '耗時(秒)', '錯題數'];
  const rows = state.records.map(r => {
    const subTitle = SUBJECT_NAMES[r.subject] || r.subject;
    const errorCount = (r.errors && r.errors.length) || 0;
    return [
      `"${r.id}"`,
      `"${r.timestamp || ''}"`,
      `"${r.student_id || ''}"`,
      `"${(r.student_name || '').replace(/"/g, '""')}"`,
      `"${subTitle}"`,
      r.grade || 1,
      `"${(r.level_title || `第${r.level_id}關`).replace(/"/g, '""')}"`,
      r.score || 0,
      r.stars || 0,
      r.duration_seconds || 0,
      errorCount
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  downloadFile(csvContent, `奇幻數學島_學習歷程紀錄_${formatDate(new Date())}.csv`, 'text/csv;charset=utf-8;');
  showToast('📥 學習歷程 CSV 匯出成功！');
}

// 匯出 JSON 備份
function exportJSONBackup() {
  const data = {
    version: 'v2.8.2',
    exported_at: new Date().toISOString(),
    students: state.students,
    records: state.records
  };
  const jsonStr = JSON.stringify(data, null, 2);
  downloadFile(jsonStr, `奇幻數學島_後台完整備份_${formatDate(new Date())}.json`, 'application/json');
  showToast('💾 完整 JSON 備份匯出成功！');
}

// 下載輔助函式
function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Toast 輕量通知
function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// 暴露全域給 HTML 按鈕呼叫
window.openStudentModal = openStudentModal;
window.confirmDeleteStudent = confirmDeleteStudent;

// 📥 一鍵補登/認領本機歷史進度至指定學童
window.importLocalProgressToStudent = async function(studentId, studentName) {
  let importedCount = 0;
  let totalStarsImported = 0;
  const newRecords = [];

  const existingKeys = new Set(
    state.records
      .filter(r => r.student_id === studentId)
      .map(r => `${r.subject || 'math'}_${r.grade || 1}_${r.level_id}`)
  );

  // 1. 掃描本機 localStorage 中所有進度存檔 (數學小一至小六、英文、國語、自然、社會等)
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

        const uniqueKey = `${subject}_${grade}_${levelId}`;
        if (existingKeys.has(uniqueKey)) continue;

        const score = bestMap[levelId] || (starNum === 3 ? 100 : (starNum === 2 ? 80 : 60));
        const rec = {
          id: `rec_hist_${studentId}_${subject}_g${grade}_l${levelId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          student_id: studentId,
          student_name: studentName,
          subject: subject,
          grade: grade,
          level_id: levelId,
          level_title: `第 ${levelId} 關`,
          score: score,
          stars: starNum,
          duration_seconds: 60,
          errors: [],
          timestamp: new Date().toISOString()
        };

        newRecords.push(rec);
        existingKeys.add(uniqueKey);
        importedCount++;
        totalStarsImported += starNum;
      }
    } catch (e) {
      console.warn('[Admin] 讀取本機進度失敗:', key, e);
    }
  }

  // 2. 認領既有訪客紀錄 (visitor records)
  const localRecs = getLocalRecords();
  localRecs.forEach(r => {
    if (r.student_id === 'visitor') {
      const uniqueKey = `${r.subject || 'math'}_${r.grade || 1}_${r.level_id}`;
      if (!existingKeys.has(uniqueKey)) {
        const cloned = {
          ...r,
          id: `rec_claim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          student_id: studentId,
          student_name: studentName
        };
        newRecords.push(cloned);
        existingKeys.add(uniqueKey);
        importedCount++;
        totalStarsImported += (r.stars || 0);
      }
    }
  });

  if (importedCount === 0) {
    alert(`此瀏覽器目前沒有發現新的未認領本機過關紀錄。\n\n提示：\n1. 若孩子是在另一台電腦或手機平板遊玩，請在該設備打開此後台網址進行補登。\n2. 若孩子已經登入專屬帳號，只需在冒險中過關結算一局，成績便會自動傳送至後台！`);
    return;
  }

  // 3. 儲存最新 records
  state.records = [...newRecords, ...state.records];
  saveLocalRecords(state.records);

  // 4. 若後端伺服器在線，嘗試批次同步至後端
  if (state.isServerOnline) {
    for (const r of newRecords) {
      try {
        await fetch(`${API_BASE}/api/records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(r)
        });
      } catch (e) {}
    }
  }

  showToast(`🎉 成功為「${studentName}」補登 ${importedCount} 關歷史戰績（累計 ${totalStarsImported} 顆星）！`);
  renderAll();
};

// 📥 彈出【匯入平板進度同步碼】對話框
window.openImportTokenModal = function(targetStudentId = null, targetStudentName = '') {
  const existing = document.getElementById('admin-import-token-modal');
  if (existing) existing.remove();

  const targetStudent = targetStudentId ? state.students.find(s => s.id === targetStudentId) : null;
  const targetLabel = targetStudent ? `【${targetStudent.avatar || '🌟'} ${targetStudent.name}】` : '指定或代碼中的學童';

  const modal = document.createElement('div');
  modal.id = 'admin-import-token-modal';
  modal.className = 'modal-backdrop active';
  modal.innerHTML = `
    <div class="modal-card" style="max-width: 520px;">
      <div class="modal-header">
        <span class="modal-icon">📥</span>
        <h3>匯入孩子平板的真實遊玩進度</h3>
        <button id="import-token-modal-close" class="modal-close-btn" type="button">✕</button>
      </div>
      <div class="modal-body" style="font-size: 0.9rem;">
        <div style="background: rgba(139, 92, 246, 0.12); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 8px; padding: 10px 14px; margin-bottom: 1rem; color: #c084fc;">
          <strong>🎯 準備匯入至：${targetLabel}</strong>
          <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 4px;">
            在孩子平板的遊戲首頁，點頂部小勇士膠囊 ➔【📤 上傳/同步進度】➔【📋 複製平板進度同步碼】，將代碼貼在下方即可！
          </div>
        </div>

        <label style="font-weight: 700; display: block; margin-bottom: 6px;" for="token-textarea-input">請在下方貼上進度同步碼 (以 FMP1_ 開頭)：</label>
        <textarea id="token-textarea-input" class="search-input" rows="4" placeholder="在此處貼上 FMP1_ 開頭的進度同步碼..." style="width: 100%; border-radius: 6px; font-family: monospace; font-size: 0.82rem; padding: 8px; box-sizing: border-box; resize: vertical;"></textarea>

        <div style="margin-top: 1rem; background: rgba(15, 23, 42, 0.6); padding: 10px 12px; border-radius: 6px; border-left: 3px solid #38bdf8; font-size: 0.8rem; color: var(--text-dim);">
          <strong style="color: #38bdf8;">💡 零手動自動同步技巧 (同 WiFi 局域網)：</strong><br/>
          若電腦有啟動 <code>python server.py</code>，讓孩子平板連上 <code>http://[此電腦IP]:8000/?kid=${targetStudentId || 'xxx'}</code>，孩子只要過關就會 100% 自動推播到後台，完全不用手動貼代碼！
        </div>
      </div>
      <div class="modal-actions" style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 8px;">
        <button id="import-token-cancel-btn" type="button" class="btn-cancel">取消</button>
        <button id="import-token-confirm-btn" type="button" class="btn-primary" style="background: linear-gradient(135deg, #8b5cf6, #6366f1);">
          ✨ 解析並立即同步
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = modal.querySelector('#import-token-modal-close');
  const cancelBtn = modal.querySelector('#import-token-cancel-btn');
  const confirmBtn = modal.querySelector('#import-token-confirm-btn');
  const textarea = modal.querySelector('#token-textarea-input');

  const closeModal = () => modal.remove();
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  confirmBtn.addEventListener('click', async () => {
    const rawVal = (textarea.value || '').trim();
    if (!rawVal) {
      alert('請先貼上進度同步碼喔！');
      textarea.focus();
      return;
    }

    try {
      confirmBtn.disabled = true;
      confirmBtn.textContent = '匯入處理中...';
      await importSyncTokenData(rawVal, targetStudentId);
      closeModal();
    } catch (err) {
      alert(`解析同步碼失敗：${err.message}`);
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = '確認匯入並同步';
    }
  });

  setTimeout(() => textarea.focus(), 100);
};

// 獨立全量進度同步碼解析與匯入 (支援 FMS1_ 輕量矩陣與 FMP1_ 完整版)
async function importSyncTokenData(rawVal, targetStudentId = null) {
  rawVal = (rawVal || '').trim();
  if (!rawVal) throw new Error('同步碼為空');

  let parsed = null;
  if (rawVal.startsWith('FMS1_')) {
    const b64 = rawVal.slice(5).trim();
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
    parsed = {
      version: 'FMS1',
      student: { id: compact.id, name: compact.name, avatar: compact.avatar },
      records: records,
      progress: {}
    };
  } else if (rawVal.startsWith('FMP1_')) {
    const b64 = rawVal.slice(5).trim();
    const jsonStr = decodeURIComponent(Array.prototype.map.call(atob(b64), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    parsed = JSON.parse(jsonStr);
  } else {
    throw new Error('未知的同步碼格式，需以 FMS1_ 或 FMP1_ 開頭');
  }

  const records = parsed.records || [];
  const studentInfo = parsed.student || {};
  const kid = targetStudentId || studentInfo.id;
  const kidName = studentInfo.name || '小勇士';

  if (!kid) {
    throw new Error('無法識別學童身分 ID');
  }

  // 1. 若該學童不在本機名冊，自動加進名冊！
  let existingStudent = state.students.find(s => s.id === kid);
  if (!existingStudent) {
    existingStudent = {
      id: kid,
      name: kidName,
      avatar: studentInfo.avatar || '🦊',
      created_at: new Date().toISOString()
    };
    state.students.unshift(existingStudent);
    saveLocalStudents(state.students);
    updateStudentFilterDropdown();
  }

  // 2. 同步寫入 progress 到此電腦 localStorage
  if (parsed.progress) {
    Object.entries(parsed.progress).forEach(([k, v]) => {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    });
  }

  // 3. 轉換與去重 records
  const existingKeys = new Set(state.records.map(r => `${r.student_id}_${r.subject || 'math'}_${r.grade || 1}_${r.level_id}`));
  let importedCount = 0;
  let totalStars = 0;
  const newRecs = [];

  records.forEach(r => {
    const uKey = `${kid}_${r.subject || 'math'}_${r.grade || 1}_${r.level_id}`;
    if (!existingKeys.has(uKey)) {
      const rec = {
        ...r,
        id: `rec_sync_${kid}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        student_id: kid,
        student_name: kidName
      };
      newRecs.push(rec);
      existingKeys.add(uKey);
      importedCount++;
      totalStars += (r.stars || 0);
    }
  });

  // 4. 合併至狀態與本機儲存
  state.records = [...newRecs, ...state.records];
  saveLocalRecords(state.records);

  // 5. 若伺服器在線，整包 POST /api/sync_progress
  if (state.isServerOnline) {
    try {
      await fetch(`${API_BASE}/api/sync_progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student: { id: kid, name: kidName, avatar: studentInfo.avatar },
          records: newRecs
        })
      });
    } catch (e) {}
  }

  showToast(`🎉 成功同步【${kidName}】平板進度！匯入 ${importedCount} 關真實戰績（⭐ ${totalStars} 顆星）！`, '🏆', 3500);
  renderAll();
  return { importedCount, totalStars, kidName };
}

// 檢查網址是否有 import_token 參數（由手機相機掃碼直連帶入）
async function checkUrlImportToken() {
  let token = null;
  try {
    const params = new URLSearchParams(window.location.search);
    token = params.get('import_token');
    if (!token && window.location.hash.includes('import_token=')) {
      const hashQuery = window.location.hash.split('?')[1] || window.location.hash.replace(/^#/, '');
      token = new URLSearchParams(hashQuery).get('import_token');
    }
  } catch (e) {}

  if (token) {
    const lastKey = `imported_${token.slice(0, 30)}`;
    const alreadyProcessed = sessionStorage.getItem(lastKey);

    try {
      const res = await importSyncTokenData(token);
      sessionStorage.setItem(lastKey, 'true');

      // 💡 絕對不要清空 URL 上的 import_token！保留完整網址讓使用者可以複製轉發到 LINE 或電腦
      if (!alreadyProcessed) {
        showImportSuccessModal(res, token);
      }
    } catch (err) {
      showToast(`❌ 掃碼自動同步失敗：${err.message}`, '⚠️', 4000);
    }
  }
}

// 掃碼入帳成功後的便捷轉傳對話框 (支援一鍵複製短代碼與完整網址)
function showImportSuccessModal(res, token) {
  const existing = document.getElementById('scan-success-share-modal');
  if (existing) existing.remove();

  const fullUrl = window.location.href;
  const modal = document.createElement('div');
  modal.id = 'scan-success-share-modal';
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 480px; text-align: center; border: 2px solid #10b981;">
      <div class="modal-header">
        <span class="modal-icon" style="font-size: 1.5rem;">🎉</span>
        <h3 style="color: #34d399; font-size: 1.15rem; margin: 0; font-weight: 800;">手機掃碼成功！戰績已即時入帳</h3>
        <button id="scan-share-close-btn" class="modal-close" type="button">✕</button>
      </div>

      <div class="modal-body" style="font-size: 0.9rem; text-align: left; padding-top: 0.5rem;">
        <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 10px 14px; margin-bottom: 0.85rem;">
          <div style="font-weight: 800; font-size: 1rem; color: #f8fafc;">
            🎒 小勇士：${res?.kidName || '挑戰者'}
          </div>
          <div style="color: #34d399; font-size: 0.85rem; margin-top: 3px;">
            ⭐ 累計星數：${res?.totalStars || 0} 顆星 ｜ 🎮 通關場次：${res?.importedCount || 0} 場
          </div>
        </div>

        <div style="font-size: 0.82rem; color: #94a3b8; line-height: 1.5; margin-bottom: 0.75rem;">
          💡 <strong>成績已在您手機後台同步完成！</strong><br/>
          若您需要將此進度<strong>傳至電腦</strong>或<strong>貼給 AI 更新</strong>，請點下方一鍵複製：
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button id="copy-share-token-btn" type="button" class="btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); font-weight: 700; padding: 9px 14px; width: 100%;">
            📋 一鍵複製進度代碼 (最適合貼給 AI 或 LINE)
          </button>
          <button id="copy-share-url-btn" type="button" class="btn-primary" style="background: #3b82f6; font-weight: 700; padding: 9px 14px; width: 100%;">
            🔗 一鍵複製完整同步網址 (傳至電腦點開即入帳)
          </button>
        </div>

        <div style="margin-top: 0.75rem; font-size: 0.75rem; color: #64748b; background: rgba(15, 23, 42, 0.6); padding: 6px 10px; border-radius: 6px;">
          網址中已完整保留 <code>?import_token=...</code>，直接複製手機網址列貼至 LINE 也 100% 帶有全部成績！
        </div>
      </div>

      <div class="modal-actions" style="margin-top: 0.75rem;">
        <button id="scan-share-confirm-btn" type="button" class="btn-primary" style="width: 100%; background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; color: #38bdf8;">
          好的，查看手機後台
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#scan-share-close-btn')?.addEventListener('click', closeModal);
  modal.querySelector('#scan-share-confirm-btn')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  modal.querySelector('#copy-share-token-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(token).then(() => {
      showToast('📋 已複製進度代碼！可在 LINE 貼上傳給電腦或直接發給 AI！', '✨', 3200);
    }).catch(() => {
      prompt('請手動複製進度代碼：', token);
    });
  });

  modal.querySelector('#copy-share-url-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(fullUrl).then(() => {
      showToast('🔗 已複製完整同步網址！傳至電腦瀏覽器點開即秒速入帳！', '✨', 3200);
    }).catch(() => {
      prompt('請手動複製完整同步網址：', fullUrl);
    });
  });
}

// ==========================================
// 📱 平板直連 QR Code 模態視窗與網址生成
// ==========================================

function initTabletQRModal() {
  const modal = document.getElementById('tablet-qr-modal');
  const closeBtn = document.getElementById('tablet-qr-modal-close');
  const closeBtn2 = document.getElementById('qr-modal-close-btn');
  const copyBtn = document.getElementById('qr-copy-url-btn');
  const studentSelect = document.getElementById('qr-target-student');
  const hostInput = document.getElementById('qr-server-host');

  if (closeBtn) closeBtn.addEventListener('click', closeTabletQRModal);
  if (closeBtn2) closeBtn2.addEventListener('click', closeTabletQRModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeTabletQRModal();
    });
  }

  if (studentSelect) {
    studentSelect.addEventListener('change', () => {
      updateTabletQRModal();
    });
  }

  if (hostInput) {
    hostInput.addEventListener('input', () => {
      state.hostInfo.hostUrl = hostInput.value.trim();
      updateTabletQRModal();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const fullUrlInput = document.getElementById('qr-full-url');
      if (fullUrlInput && fullUrlInput.value) {
        navigator.clipboard.writeText(fullUrlInput.value).then(() => {
          showToast('📋 已複製平板直連專屬網址！');
        }).catch(() => {
          prompt('請複製此專屬網址：', fullUrlInput.value);
        });
      }
    });
  }

  // 頂部導航列「📱 平板直連 QR Code」按鈕
  document.getElementById('tablet-connect-btn')?.addEventListener('click', () => {
    openTabletQRModal();
  });
}

function openTabletQRModal(targetStudentId = null, targetStudentName = null) {
  const modal = document.getElementById('tablet-qr-modal');
  if (!modal) return;

  // 1. 填入學童下拉選單
  const studentSelect = document.getElementById('qr-target-student');
  if (studentSelect) {
    let html = '<option value="">🎒 自由登入 / 訪客模式</option>';
    state.students.forEach(s => {
      html += `<option value="${s.id}">${s.avatar} ${escapeHtml(s.name)}</option>`;
    });
    studentSelect.innerHTML = html;
    if (targetStudentId) {
      studentSelect.value = targetStudentId;
    } else {
      studentSelect.value = '';
    }
  }

  // 2. 填入 Host IP 輸入框
  const hostInput = document.getElementById('qr-server-host');
  const defaultHost = state.hostInfo.hostUrl || (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? (state.hostInfo.localIp ? `http://${state.hostInfo.localIp}:${state.hostInfo.port || 8000}` : window.location.origin)
    : window.location.origin);
  
  if (hostInput) {
    if (!hostInput.value) {
      hostInput.value = defaultHost;
    }
    state.hostInfo.hostUrl = hostInput.value.trim();
  }

  // 3. 顯示連線狀態
  const lanStatus = document.getElementById('qr-lan-status');
  if (lanStatus) {
    if (state.isServerOnline && state.hostInfo.localIp) {
      lanStatus.textContent = `📡 局域網已連線 (${state.hostInfo.localIp})`;
      lanStatus.style.color = '#34d399';
    } else {
      lanStatus.textContent = '🌐 外部或本機連線';
      lanStatus.style.color = '#38bdf8';
    }
  }

  updateTabletQRModal();
  modal.classList.add('active');
}

function closeTabletQRModal() {
  document.getElementById('tablet-qr-modal')?.classList.remove('active');
}

function updateTabletQRModal() {
  const studentSelect = document.getElementById('qr-target-student');
  const hostInput = document.getElementById('qr-server-host');
  const fullUrlInput = document.getElementById('qr-full-url');
  const openLinkBtn = document.getElementById('qr-open-link-btn');
  const badge = document.getElementById('qr-student-badge');

  const selectedKid = studentSelect ? studentSelect.value : '';
  const currentHost = (hostInput ? hostInput.value.trim() : '') || window.location.origin;

  // 計算目標 URL
  let targetUrl = '';
  try {
    const base = new URL(window.location.pathname.replace(/\/admin\.html$/, '') + '/index.html', currentHost);
    if (selectedKid) {
      base.searchParams.set('kid', selectedKid);
    }
    base.searchParams.set('host', currentHost);
    targetUrl = base.href;
  } catch (e) {
    targetUrl = `${currentHost.replace(/\/+$/, '')}/index.html?${selectedKid ? `kid=${encodeURIComponent(selectedKid)}&` : ''}host=${encodeURIComponent(currentHost)}`;
  }

  if (fullUrlInput) fullUrlInput.value = targetUrl;
  if (openLinkBtn) openLinkBtn.href = targetUrl;

  // 更新徽章提示
  if (badge) {
    if (selectedKid) {
      const s = state.students.find(item => item.id === selectedKid);
      badge.textContent = s ? `🔒 鎖定小勇士：${s.avatar} ${s.name}` : `🔒 鎖定小勇士 (${selectedKid})`;
      badge.style.background = '#fef3c7';
      badge.style.color = '#92400e';
    } else {
      badge.textContent = '🎒 自由登入 / 訪客模式';
      badge.style.background = '#e0f2fe';
      badge.style.color = '#0369a1';
    }
  }

  // 渲染 QR Code
  renderQRCode(targetUrl);
}

function renderQRCode(targetUrl) {
  const container = document.getElementById('qr-canvas-container');
  if (!container) return;
  container.innerHTML = '';

  try {
    if (typeof qrcode === 'function') {
      const qr = qrcode(0, 'M');
      qr.addData(targetUrl);
      qr.make();
      container.innerHTML = qr.createSvgTag(5, 4);
      const svg = container.querySelector('svg');
      if (svg) {
        svg.style.display = 'block';
        svg.style.maxWidth = '210px';
        svg.style.maxHeight = '210px';
        svg.style.width = '100%';
        svg.style.height = 'auto';
        svg.style.borderRadius = '8px';
      }
      return;
    }
  } catch (err) {
    console.warn('[QR] 本地 QR Code 生成異常，切換至備援 API:', err);
  }

  // 雙軌降級：外部 API
  const img = document.createElement('img');
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(targetUrl)}`;
  img.alt = 'QR Code';
  img.style.width = '200px';
  img.style.height = '200px';
  img.style.borderRadius = '8px';
  container.appendChild(img);
}

window.openTabletQRModal = openTabletQRModal;
window.closeTabletQRModal = closeTabletQRModal;


