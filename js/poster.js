import { getAllSubjectsSummary, getCurrentGrade, getCurrentSubject, subjectProgress, totalStars, completedCount } from './state.js';
import { SUBJECTS, getSubjectConfig } from './subjects.js';
import { getGradeConfig } from './grades.js';
import { getUnlockedBadgeCount } from './badges.js';
import { audio } from './audio.js';
import { escapeHtml, showToast, launchConfetti } from './ui.js';
import { getCurrentStudent } from './student.js';
import { getCurrentCharacter } from './characters.js';

/**
 * 取得跨領域成果報表數據
 */
export function getReportData(targetGrade = getCurrentGrade()) {
  const g = Number(targetGrade) || 1;
  const gradeConf = getGradeConfig(g);
  const badgeCount = getUnlockedBadgeCount();
  const student = getCurrentStudent();
  const character = getCurrentCharacter(student);

  let gradeTotalStars = 0;
  let gradeTotalLevels = 0;
  let gradeMaxStars = 0;
  let gradeMaxLevels = 0;

  const subjectStats = SUBJECTS.map((sub) => {
    const prog = subjectProgress(sub.id, g);
    const maxLevels = 16;
    const maxStars = 48;
    gradeTotalStars += prog.stars;
    gradeTotalLevels += prog.levels;
    gradeMaxStars += maxStars;
    gradeMaxLevels += maxLevels;

    return {
      id: sub.id,
      name: sub.name,
      shortName: sub.shortName,
      icon: sub.icon,
      color: sub.color,
      stars: prog.stars,
      maxStars,
      levels: prog.levels,
      maxLevels,
      percentage: Math.round((prog.levels / maxLevels) * 100),
      isChallenge: Boolean(sub.isChallenge),
    };
  });

  const overallPercentage = Math.round((gradeTotalLevels / gradeMaxLevels) * 100);

  // 評定等級與素養稱號
  let title = '初階探索學徒';
  let badgeTitle = '🌱 潛力新星';
  let comment = '保持好奇心，持續在各島嶼冒險，你將發現更多學習樂趣！';

  if (gradeTotalStars >= 180) {
    title = `${gradeConf.name} 全能跨學科至尊大師`;
    badgeTitle = '👑 至尊王者';
    comment = '天賦異稟且堅持不懈！數理邏輯、雙語溝通、科學探究與人文素養全方位登頂，堪稱全能典範！';
  } else if (gradeTotalStars >= 120) {
    title = `${gradeConf.name} 卓越跨領域領航者`;
    badgeTitle = '🌟 卓越領航';
    comment = '展現極高的自主學習與整合能力，各領域表現皆十分均衡亮眼，繼續朝大滿貫邁進！';
  } else if (gradeTotalStars >= 60) {
    title = `${gradeConf.name} 勇毅冒險專家`;
    badgeTitle = '🏅 勇毅專家';
    comment = '學習態度積極認真，成功征服多座島嶼核心考驗，已具備扎實的學科基礎素養！';
  } else if (gradeTotalStars >= 20) {
    title = `${gradeConf.name} 成長期探險家`;
    badgeTitle = '🚀 勇敢探險';
    comment = '已經邁出勇敢的探險步伐，穩定累積通關經驗，期待解鎖更多精彩島嶼！';
  }

  return {
    student,
    character,
    grade: g,
    gradeName: gradeConf.name,
    title,
    badgeTitle,
    comment,
    badgeCount,
    totalStars: gradeTotalStars,
    maxStars: gradeMaxStars,
    totalLevels: gradeTotalLevels,
    maxLevels: gradeMaxLevels,
    percentage: overallPercentage,
    subjects: subjectStats,
    date: new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }),
  };
}

/**
 * 使用 Canvas 繪製高解析度成果海報
 */
export function drawPosterCanvas(canvas, data) {
  // 異步預載角色立繪並自動重繪
  if (data.character && data.character.image && !data.characterImageElement) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = data.character.image;
    img.onload = () => {
      data.characterImageElement = img;
      drawPosterCanvas(canvas, data);
    };
  }

  // 設定高解析度畫布 (Retina 2x 繪圖品質)
  const W = 800;
  const H = 1120;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 1. 背景漸層 (奇幻深藍與夢幻紫星空)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#10162f');
  bgGrad.addColorStop(0.35, '#182449');
  bgGrad.addColorStop(0.75, '#1d1d42');
  bgGrad.addColorStop(1, '#0e1124');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. 裝飾背景星光光暈
  ctx.save();
  const glowGrad1 = ctx.createRadialGradient(180, 160, 20, 180, 160, 300);
  glowGrad1.addColorStop(0, 'rgba(74, 144, 226, 0.25)');
  glowGrad1.addColorStop(1, 'rgba(74, 144, 226, 0)');
  ctx.fillStyle = glowGrad1;
  ctx.fillRect(0, 0, W, H);

  const glowGrad2 = ctx.createRadialGradient(620, 780, 30, 620, 780, 350);
  glowGrad2.addColorStop(0, 'rgba(230, 126, 34, 0.2)');
  glowGrad2.addColorStop(1, 'rgba(230, 126, 34, 0)');
  ctx.fillStyle = glowGrad2;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // 繪製微型閃爍星星
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  const starCoords = [
    [70, 90], [140, 200], [220, 80], [710, 120], [660, 240], [740, 340],
    [50, 480], [720, 650], [90, 850], [700, 950], [400, 70], [380, 1070]
  ];
  starCoords.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. 雙層金緻外框
  ctx.strokeStyle = 'rgba(241, 196, 15, 0.45)';
  ctx.lineWidth = 4;
  roundRect(ctx, 24, 24, W - 48, H - 48, 24);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 32, 32, W - 64, H - 64, 18);
  ctx.stroke();

  // 4. 頂部認證標題
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f1c40f';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('✦ 奇幻冒險島 · 跨學科自主學習體系 ✦', W / 2, 72);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 38px system-ui, -apple-system, sans-serif';
  ctx.fillText('國小跨領域核心素養學習成績單', W / 2, 116);

  // 4.5 冒險小勇士與角色形象榮譽膠囊 (支援 10 位公主/王子立繪頭像與角色徽章)
  const heroBoxX = 56;
  const heroBoxY = 138;
  const heroBoxW = W - 112;
  const heroBoxH = 68;

  ctx.save();
  const heroGrad = ctx.createLinearGradient(heroBoxX, 0, heroBoxX + heroBoxW, 0);
  heroGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  heroGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.06)');
  heroGrad.addColorStop(1, 'rgba(255, 255, 255, 0.12)');
  ctx.fillStyle = heroGrad;
  ctx.strokeStyle = data.character?.color || 'rgba(241, 196, 15, 0.6)';
  ctx.lineWidth = 2;
  roundRect(ctx, heroBoxX, heroBoxY, heroBoxW, heroBoxH, 34);
  ctx.fill();
  ctx.stroke();

  // 繪製角色頭像圓形框
  const charAvatarX = heroBoxX + 40;
  const charAvatarY = heroBoxY + 34;
  const charAvatarR = 26;

  ctx.save();
  ctx.beginPath();
  ctx.arc(charAvatarX, charAvatarY, charAvatarR, 0, Math.PI * 2);
  ctx.clip();

  let imgDrawn = false;
  if (data.characterImageElement && data.characterImageElement.complete) {
    try {
      ctx.drawImage(data.characterImageElement, charAvatarX - charAvatarR, charAvatarY - charAvatarR, charAvatarR * 2, charAvatarR * 2);
      imgDrawn = true;
    } catch (e) {}
  }

  if (!imgDrawn) {
    ctx.fillStyle = data.character?.color || '#ec4899';
    ctx.fillRect(charAvatarX - charAvatarR, charAvatarY - charAvatarR, charAvatarR * 2, charAvatarR * 2);
    ctx.font = '26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(data.character?.avatar || '👑', charAvatarX, charAvatarY + 2);
  }
  ctx.restore();

  // 頭像外圈金色光環
  ctx.strokeStyle = '#f1c40f';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(charAvatarX, charAvatarY, charAvatarR, 0, Math.PI * 2);
  ctx.stroke();

  // 角色與挑戰者名稱
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  const studentName = data.student?.name || '冒險小勇士';
  const charName = data.character?.name || '冒險勇士';
  const charTitle = data.character?.title || '星芒守護者';
  ctx.fillText(`挑戰小勇士：${studentName} · 【${charName}】`, heroBoxX + 78, heroBoxY + 30);

  ctx.fillStyle = '#ffeaa7';
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  const trait = data.character?.trait || '全能探索';
  ctx.fillText(`【${data.gradeName}】${data.title} ｜ 形象：${charTitle} ｜ 特質：${trait}`, heroBoxX + 78, heroBoxY + 54);

  // 右側徽章標籤
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f1c40f';
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${data.character?.avatar || '👑'} ${data.badgeTitle}`, heroBoxX + heroBoxW - 22, heroBoxY + 42);
  ctx.restore();

  // 5. 核心成果總結三大卡片 (橫排)
  const cardY = 224;
  const cardW = 216;
  const cardH = 110;
  const cards = [
    { label: '累積全科星數', val: `${data.totalStars} / ${data.maxStars}`, icon: '⭐', color: '#f39c12' },
    { label: '已完成關卡數', val: `${data.totalLevels} / ${data.maxLevels}`, icon: '🏝️', color: '#3498db' },
    { label: '榮譽學習徽章', val: `${data.badgeCount} 枚解鎖`, icon: '🏅', color: '#2ecc71' },
  ];

  cards.forEach((c, i) => {
    const cx = 56 + i * (cardW + 20);
    // 卡片背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    roundRect(ctx, cx, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.stroke();

    // Icon
    ctx.font = '28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.icon, cx + cardW / 2, cardY + 36);

    // 數值
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(c.val, cx + cardW / 2, cardY + 68);

    // 標籤
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText(c.label, cx + cardW / 2, cardY + 94);
  });

  // 6. 分科素養能力詳情 (各科進度條)
  const subjectStartY = 365;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffeaa7';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillText('📊 分科素養探索進度與表現', 56, subjectStartY);

  // 整體完成率小標籤
  ctx.textAlign = 'right';
  ctx.fillStyle = '#a0aec0';
  ctx.font = '15px system-ui, -apple-system, sans-serif';
  ctx.fillText(`總體通關率：${data.percentage}%`, W - 56, subjectStartY);

  data.subjects.forEach((sub, idx) => {
    const rowY = subjectStartY + 24 + idx * 62;
    const barX = 190;
    const barW = 440;
    const barH = 18;

    // 科目名稱與圖示
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${sub.icon} ${sub.name}`, 56, rowY + 16);

    // 進度條背景槽
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    roundRect(ctx, barX, rowY + 2, barW, barH, 9);
    ctx.fill();

    // 進度條填充 (以該科主題色漸層)
    const fillW = Math.max(0, Math.min(barW, (sub.levels / sub.maxLevels) * barW));
    if (fillW > 0) {
      const grad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
      grad.addColorStop(0, sub.color);
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      roundRect(ctx, barX, rowY + 2, fillW, barH, 9);
      ctx.fill();
    }

    // 星數與百分比數字
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(`⭐ ${sub.stars}  (${sub.levels}/16關)`, W - 56, rowY + 16);
  });

  // 7. 108 課綱三面九項素養評估與導師評語
  const commentBoxY = 750;
  const commentBoxH = 190;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = 'rgba(241, 196, 15, 0.3)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 56, commentBoxY, W - 112, commentBoxH, 20);
  ctx.fill();
  ctx.stroke();

  // 導師與系統推薦評語
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f1c40f';
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillText('🎓 核心素養導向評析與家長寄語', 80, commentBoxY + 36);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '16px system-ui, -apple-system, sans-serif';
  wrapText(ctx, data.comment, 80, commentBoxY + 70, W - 160, 26);

  // 素養指標打勾小標籤
  const tagsY = commentBoxY + 144;
  const tags = ['自主學習與問題解決 ✓', '跨領域整合力 ✓', '數位科技素養 ✓'];
  tags.forEach((tag, ti) => {
    const tx = 80 + ti * 210;
    ctx.fillStyle = 'rgba(46, 204, 113, 0.15)';
    ctx.strokeStyle = 'rgba(46, 204, 113, 0.5)';
    ctx.lineWidth = 1;
    roundRect(ctx, tx, tagsY - 18, 196, 32, 16);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(tag, tx + 98, tagsY + 3);
  });

  // 8. 官方認證印章 (紅金印章風格)
  drawOfficialSeal(ctx, 640, 990);

  // 9. 底部驗證資訊與日期 (連動小勇士與冒險形象)
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.fillText(`授與挑戰者：${data.student?.name || '冒險小勇士'} ✦ 冒險形象：${data.character?.name || '冒險勇士'} (${data.character?.title || ''})`, 56, 1024);
  ctx.fillText(`核發日期：${data.date} ｜ 認證識別號：FI-${data.grade}-${Date.now().toString(36).toUpperCase()}`, 56, 1050);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillText('奇幻冒險島研發組 · 台灣國小 108 課綱自主學習教育專案', 56, 1076);
}

/**
 * 輔助函式：圓角矩形
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * 輔助函式：文字自動換行
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = text.split('');
  let line = '';
  let curY = y;

  for (let n = 0; n < chars.length; n++) {
    const testLine = line + chars[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, curY);
      line = chars[n];
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, curY);
}

/**
 * 輔助函式：繪製奇幻冒險島專屬官方認證紅印章
 */
function drawOfficialSeal(ctx, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.08); // 些微傾斜增添真實印章感

  ctx.strokeStyle = 'rgba(231, 76, 60, 0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 43, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(231, 76, 60, 0.88)';
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('奇幻冒險島', 0, -20);
  ctx.font = '900 17px system-ui, -apple-system, sans-serif';
  ctx.fillText('卓越認證', 0, 4);
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('VERIFIED ★', 0, 24);

  ctx.restore();
}

/**
 * 下載海報圖檔
 */
export function downloadPosterImage(canvas, filename = '奇幻冒險島_跨領域素養學習海報.png') {
  try {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('海報下載成功！歡迎分享給老師與親友 🎉', '📥');
  } catch (err) {
    console.error('海報下載失敗:', err);
    showToast('下載失敗，請嘗試直接長按或右鍵存檔海報', '⚠️');
  }
}

/**
 * 成果海報與家長成績單彈窗
 */
export function showReportModal({ grade = getCurrentGrade() } = {}) {
  // 移除重複彈窗
  document.querySelectorAll('.report-modal-overlay').forEach((el) => el.remove());

  const data = getReportData(grade);
  audio.playSfx('levelup', 0.8);
  launchConfetti({ count: 80, y: 0.3 * window.innerHeight });

  const modal = document.createElement('div');
  modal.className = 'report-modal-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', `${data.gradeName} 跨領域素養成果海報與家長成績單`);

  modal.innerHTML = `
    <div class="report-backdrop"></div>
    <div class="report-card" role="document">
      <button class="round-back report-close-btn" type="button" aria-label="關閉報告">✕</button>

      <div class="report-header">
        <span class="report-kicker">✦ 全學科學習履歷認證 ✦</span>
        <h2 class="report-title">跨領域綜合素養家長成績單</h2>
        <div class="report-character-badge-bar">
          <img src="${data.character?.image || 'assets/characters/princess_magic.png'}" class="rep-char-avatar" alt="${escapeHtml(data.character?.name || '')}" onerror="this.style.display='none';">
          <div class="rep-char-details">
            <span class="rep-char-hero">${data.character?.avatar || '👑'} ${escapeHtml(data.student?.name || '冒險小勇士')} · ${escapeHtml(data.character?.name || '')}（${escapeHtml(data.character?.title || '')}）</span>
            <span class="rep-char-quote">「${escapeHtml(data.character?.quote || '')}」</span>
          </div>
          <span class="rep-char-grade-badge">【${escapeHtml(data.gradeName)}】${escapeHtml(data.title)}</span>
        </div>
      </div>

      <div class="report-tabs">
        <button class="report-tab-btn is-active" data-tab="poster" type="button">🖼️ 分享海報預覽</button>
        <button class="report-tab-btn" data-tab="details" type="button">📋 詳細分科成效</button>
      </div>

      <div class="report-content-wrap">
        <!-- 海報畫布預覽頁 -->
        <div class="report-tab-panel tab-poster is-active">
          <div class="poster-canvas-box">
            <canvas id="poster-render-canvas" class="poster-canvas"></canvas>
          </div>
          <div class="poster-actions-row">
            <button class="big-btn download-poster-btn" type="button" id="download-poster-btn">
              <span>📥 下載高畫質成果海報 (PNG)</span>
            </button>
            <button class="secondary-btn share-poster-btn" type="button" id="share-poster-btn">
              <span>📤 一鍵分享</span>
            </button>
            <button class="secondary-btn print-report-btn" type="button" id="print-report-btn">
              <span>🖨️ 列印成績單</span>
            </button>
          </div>
        </div>

        <!-- 詳細分科成效頁 -->
        <div class="report-tab-panel tab-details">
          <div class="report-summary-stats">
            <div class="rep-stat-box">
              <span class="rep-stat-icon">⭐</span>
              <strong class="rep-stat-num">${data.totalStars} / ${data.maxStars}</strong>
              <span class="rep-stat-label">累積星數</span>
            </div>
            <div class="rep-stat-box">
              <span class="rep-stat-icon">🏝️</span>
              <strong class="rep-stat-num">${data.totalLevels} / ${data.maxLevels}</strong>
              <span class="rep-stat-label">通關關卡</span>
            </div>
            <div class="rep-stat-box">
              <span class="rep-stat-icon">🏅</span>
              <strong class="rep-stat-num">${data.badgeCount} 枚</strong>
              <span class="rep-stat-label">解鎖徽章</span>
            </div>
          </div>

          <div class="report-subjects-table-wrap">
            <table class="report-subjects-table">
              <thead>
                <tr>
                  <th>學習領域</th>
                  <th>通關進度</th>
                  <th>星數評價</th>
                  <th>素養達成率</th>
                </tr>
              </thead>
              <tbody>
                ${data.subjects.map((s) => `
                  <tr>
                    <td><strong>${escapeHtml(s.icon)} ${escapeHtml(s.name)}</strong></td>
                    <td>${s.levels} / ${s.maxLevels} 關</td>
                    <td><span class="stars-val">⭐ ${s.stars}</span></td>
                    <td>
                      <div class="table-bar-wrap">
                        <div class="table-bar-fill" style="width: ${s.percentage}%; background-color: ${s.color};"></div>
                        <span class="table-bar-text">${s.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="report-comment-box">
            <h4>💡 核心素養導向評析與家長寄語</h4>
            <p>${escapeHtml(data.comment)}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 繪製海報 Canvas
  const canvas = modal.querySelector('#poster-render-canvas');
  if (canvas) {
    drawPosterCanvas(canvas, data);
  }

  // 關閉邏輯
  const close = () => {
    audio.playSfx('click', 0.4);
    modal.classList.add('is-closing');
    setTimeout(() => {
      modal.remove();
    }, 280);
  };

  modal.querySelector('.report-close-btn').addEventListener('click', close);
  modal.querySelector('.report-backdrop').addEventListener('click', close);

  // Tab 切換
  const tabBtns = modal.querySelectorAll('.report-tab-btn');
  const tabPanels = modal.querySelectorAll('.report-tab-panel');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      audio.playSfx('click', 0.3);
      tabBtns.forEach((b) => b.classList.remove('is-active'));
      tabPanels.forEach((p) => p.classList.remove('is-active'));

      btn.classList.add('is-active');
      const targetTab = btn.dataset.tab;
      const activePanel = modal.querySelector(`.tab-${targetTab}`);
      if (activePanel) activePanel.classList.add('is-active');
    });
  });

  // 下載海報
  modal.querySelector('#download-poster-btn')?.addEventListener('click', () => {
    audio.playSfx('click', 0.5);
    downloadPosterImage(canvas, `奇幻冒險島_${data.gradeName}_學習成果海報.png`);
  });

  // 一鍵分享
  modal.querySelector('#share-poster-btn')?.addEventListener('click', async () => {
    audio.playSfx('click', 0.4);
    const shareText = `我在奇幻冒險島完成【${data.gradeName}】跨領域素養挑戰！累積了 ⭐ ${data.totalStars} 顆星、通關 ${data.totalLevels} 關！一起來玩吧！`;

    if (navigator.share && canvas) {
      try {
        canvas.toBlob(async (blob) => {
          if (!blob) throw new Error('Blob creation failed');
          const file = new File([blob], 'math-island-report.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: '奇幻冒險島 跨領域素養成果海報',
              text: shareText,
              files: [file],
            });
            showToast('分享成功！', '🎉');
          } else {
            await navigator.share({
              title: '奇幻冒險島 跨領域素養成果海報',
              text: shareText,
              url: window.location.href,
            });
            showToast('分享成功！', '🎉');
          }
        }, 'image/png');
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Web Share 失敗，改用剪貼簿複製:', err);
        }
      }
    }

    // 降級剪貼簿複製
    try {
      await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      showToast('已複製成果分享文案至剪貼簿！可直接貼在 LINE 分享給親友！', '📋', 2600);
    } catch {
      showToast('成果文案準備就緒！歡迎截圖分享！', '📸');
    }
  });

  // 列印
  modal.querySelector('#print-report-btn')?.addEventListener('click', () => {
    audio.playSfx('click', 0.4);
    window.print();
  });
}
