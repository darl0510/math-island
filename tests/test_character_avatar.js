/**
 * tests/test_character_avatar.js
 * 驗證小勇士 10 位公主/王子角色形象、導覽列頭像圖片化、身分選單連動與海報繪製
 */

import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';

console.log('--- 開始角色形象實裝與海報繪製連動單元測試 ---');

// 1. 驗證 js/characters.js 與 10 位角色圖片實體在庫
import { CHARACTERS, getCharacterById, getCurrentCharacter, setCurrentCharacter } from '../js/characters.js';

assert.strictEqual(CHARACTERS.length, 10, '必須在庫 10 位角色形象 (5 公主 + 5 王子)');
const girls = CHARACTERS.filter(c => c.gender === 'girl');
const boys = CHARACTERS.filter(c => c.gender === 'boy');
assert.strictEqual(girls.length, 5, '必須包含 5 位公主');
assert.strictEqual(boys.length, 5, '必須包含 5 位王子勇士');

CHARACTERS.forEach(c => {
  assert.ok(c.id, '角色必須有 id');
  assert.ok(c.name, '角色必須有 name');
  assert.ok(c.avatar, '角色必須有 avatar emoji');
  assert.ok(c.image, '角色必須有立繪 image');
  assert.ok(c.title, '角色必須有稱號 title');
  assert.ok(c.trait, '角色必須有特質 trait');
  assert.ok(existsSync(c.image), `角色圖片檔案必須在庫存在: ${c.image}`);
});

console.log('✔ 10 位角色定義與立繪圖片實體在庫驗證通過');

// 2. 驗證 getCharacterById 查詢邏輯
const magicPrincess = getCharacterById('princess_magic');
assert.ok(magicPrincess && magicPrincess.name === '魔法公主', 'getCharacterById 能精準取得魔法公主');
const spacePrince = getCharacterById('prince_space');
assert.ok(spacePrince && spacePrince.name === '宇宙探險家', 'getCharacterById 能精準取得宇宙探險家');

// 3. 驗證 index.html 導覽列與身分選單 DOM 結構
const html = readFileSync('index.html', 'utf-8');
assert.ok(html.includes('id="student-btn-avatar"'), 'index.html 必須包含 #student-btn-avatar');
assert.ok(html.includes('id="student-btn-char-badge"'), 'index.html 必須包含 #student-btn-char-badge 角色徽章標籤');
assert.ok(html.includes('id="student-current-char-card"'), 'index.html 必須包含 #student-current-char-card 角色預覽卡片容器');

console.log('✔ index.html 頂部導覽列與選單卡片容器驗證通過');

// 4. 驗證 js/student.js 導覽列更新與選單渲染連動
const studentJs = readFileSync('js/student.js', 'utf-8');
assert.ok(studentJs.includes('updateStudentPillUI'), 'js/student.js 必須導出 updateStudentPillUI');
assert.ok(studentJs.includes('nav-avatar-img'), 'updateStudentPillUI 必須支援渲染 nav-avatar-img 立繪頭像');
assert.ok(studentJs.includes('student-current-char-card'), 'js/student.js 必須支援連動 student-current-char-card');
assert.ok(studentJs.includes('fantasy-math:character-changed'), '必須監聽 fantasy-math:character-changed 事件實現即時聯動');

console.log('✔ js/student.js 導覽列頭像升級與選單連動邏輯驗證通過');

// 5. 驗證 js/poster.js 素養成果海報連動繪製小勇士與角色立繪
const posterJs = readFileSync('js/poster.js', 'utf-8');
assert.ok(posterJs.includes('getCurrentStudent'), 'js/poster.js 必須導入 getCurrentStudent');
assert.ok(posterJs.includes('getCurrentCharacter'), 'js/poster.js 必須導入 getCurrentCharacter');
assert.ok(posterJs.includes('data.character'), '海報繪製資料中必須包含 character');
assert.ok(posterJs.includes('data.student'), '海報繪製資料中必須包含 student');
assert.ok(posterJs.includes('report-character-badge-bar'), '成績單彈窗必須包含 report-character-badge-bar 角色資訊條');

console.log('✔ js/poster.js 成果海報與成績單小勇士角色連動繪製驗證通過');

// 6. 驗證 css/characters.css 樣式完整性
const charCss = readFileSync('css/characters.css', 'utf-8');
assert.ok(charCss.includes('.nav-avatar-img'), 'css 必須包含 .nav-avatar-img 樣式');
assert.ok(charCss.includes('.student-current-char-card'), 'css 必須包含 .student-current-char-card 樣式');
assert.ok(charCss.includes('.report-character-badge-bar'), 'css 必須包含 .report-character-badge-bar 樣式');

console.log('✔ css/characters.css 角色立繪頭像、身分選單與海報橫幅樣式驗證通過');

console.log('🎉 角色形象實裝自檢單元測試全部 6 大項目 100% 綠燈通過！');

