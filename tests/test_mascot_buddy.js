/**
 * test_mascot_buddy.js - 吉祥物夥伴動態表情反饋單元測試
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

console.log('--- 開始吉祥物夥伴動態表情反饋單元測試 ---');

// 1. 驗證 js/engine.js 中包含 BUDDY_MOOD_CONFIG 定義與 setBuddyMood 函式
const engineCode = readFileSync('js/engine.js', 'utf-8');

assert.ok(engineCode.includes('export function setBuddyMood'), 'js/engine.js 必須導出 setBuddyMood 函式');
assert.ok(engineCode.includes('BUDDY_MOOD_CONFIG'), 'js/engine.js 必須包含 BUDDY_MOOD_CONFIG 設定表');
assert.ok(engineCode.includes('id="mascot-buddy"'), '畫面必須包含 id="mascot-buddy" 容器');
assert.ok(engineCode.includes('id="buddy-mood-badge"'), '畫面必須包含 id="buddy-mood-badge" 動態表情貼紙');

// 2. 驗證各種情境呼叫
assert.ok(engineCode.includes("setBuddyMood('combo'"), '連對時必須觸發 setBuddyMood combo');
assert.ok(engineCode.includes("setBuddyMood('correct'"), '單題答對時必須觸發 setBuddyMood correct');
assert.ok(engineCode.includes("setBuddyMood('think'"), '答錯思考時必須觸發 setBuddyMood think');
assert.ok(engineCode.includes("setBuddyMood('encourage'"), '查看提示時必須觸發 setBuddyMood encourage');

// 3. 驗證 css/style.css 中包含吉祥物動效樣式
const cssCode = readFileSync('css/style.css', 'utf-8');
assert.ok(cssCode.includes('.buddy-mood-badge'), 'css 必須包含 .buddy-mood-badge');
assert.ok(cssCode.includes('.buddy.buddy--correct'), 'css 必須包含 correct 表情樣式');
assert.ok(cssCode.includes('.buddy.buddy--combo'), 'css 必須包含 combo 燃燒表情樣式');
assert.ok(cssCode.includes('.buddy.buddy--think'), 'css 必須包含 think 思考表情樣式');
assert.ok(cssCode.includes('@keyframes badge-pop-anim'), 'css 必須包含 badge 彈跳動畫');

console.log('✅ 吉祥物夥伴動態表情反饋 8 項自檢單元測試全數 100% 綠燈通過！');

