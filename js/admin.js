/**
 * 🌈 奇幻數學島 - 後台管理中心邏輯模組 (admin.js)
 * 支援學童增修、專屬連結複製、學習歷程即時看板、弱點章節統計與成績匯出
 */

const API_BASE = window.location.origin;

// 狀態快取
const state = {
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
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupEventListeners();
  loadData();
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
}

// 載入資料
async function loadData() {
  const statusBadge = document.getElementById('connection-status');
  try {
    const [resStudents, resRecords] = await Promise.all([
      fetch(`${API_BASE}/api/students`).then(r => r.json()),
      fetch(`${API_BASE}/api/records`).then(r => r.json())
    ]);

    if (resStudents.success && resRecords.success) {
      state.students = resStudents.students || [];
      state.records = resRecords.records || [];
      
      if (statusBadge) {
        statusBadge.className = 'status-badge';
        statusBadge.innerHTML = '<span class="status-dot"></span> 伺服器在線';
      }
      
      updateStudentFilterDropdown();
      renderAll();
    } else {
      throw new Error('API 返回異常');
    }
  } catch (err) {
    console.warn('[Admin] 無法連線至伺服器 API:', err);
    if (statusBadge) {
      statusBadge.className = 'status-badge offline';
      statusBadge.innerHTML = '<span class="status-dot"></span> 離線或無法連線';
    }
    showToast('⚠️ 無法連線至後端伺服器，請確認 server.py 正在執行');
  }
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

        <div class="student-card-actions">
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
      } else {
        alert(res.error || '新增失敗');
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
      } else {
        alert(res.error || '更新失敗');
      }
    }
  } catch (err) {
    console.error('儲存學童出錯:', err);
    alert('無法與伺服器通訊，請確認 server.py 正在運行');
  }
}

// 刪除學童確認
async function confirmDeleteStudent(studentId, studentName) {
  const confirmed = confirm(`確定要刪除冒險小勇士「${studentName}」嗎？\n此動作將一併清除該學童的專屬識別資料。`);
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/api/students?id=${encodeURIComponent(studentId)}`, {
      method: 'DELETE'
    }).then(r => r.json());

    if (res.success) {
      showToast(`🗑️ 已刪除學童「${studentName}」`);
      await loadData();
    } else {
      alert(res.error || '刪除失敗');
    }
  } catch (err) {
    console.error('刪除學童出錯:', err);
    alert('無法刪除學童，請檢查網路連線');
  }
}

// 複製專屬連結
window.copyStudentLink = function(studentId, studentName) {
  const url = `${window.location.origin}/index.html?kid=${encodeURIComponent(studentId)}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast(`📋 已複製「${studentName}」的專屬鎖定連結！`);
  }).catch(() => {
    // 降級使用 prompt
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
    const link = `${window.location.origin}/index.html?kid=${s.id}`;
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
