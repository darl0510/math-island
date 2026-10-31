/**
 * tests/test_monster_battle_feedback.js
 * 驗證怪獸對峙耐久血條、受擊震顫與得意志氣泡動態反饋機制
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

console.log('--- 開始怪獸對峙血條與受擊反饋微調單元測試 ---');

// 1. 讀取並檢驗 js/engine.js
const engineCode = readFileSync('js/engine.js', 'utf-8');

assert.ok(engineCode.includes('function renderMonsterBattleBadge'), '必須包含 renderMonsterBattleBadge 渲染函式');
assert.ok(engineCode.includes('monster-hp-bar-container'), '怪獸徽章必須包含 monster-hp-bar-container 耐久血條容器');
assert.ok(engineCode.includes('monster-hp-fill'), '怪獸徽章必須包含 monster-hp-fill 血條填充元素');
assert.ok(engineCode.includes('monster-hp-text'), '怪獸徽章必須包含 monster-hp-text 數值文字');
assert.ok(engineCode.includes('monster-speech-bubble'), '怪獸徽章必須包含 monster-speech-bubble 台詞氣泡容器');

assert.ok(engineCode.includes('export function updateMonsterHp'), '必須導出 updateMonsterHp 函式');
assert.ok(engineCode.includes('export function showMonsterSpeech'), '必須導出 showMonsterSpeech 函式');
assert.ok(engineCode.includes('export function triggerMonsterHitEffect'), '必須導出 triggerMonsterHitEffect 受擊反饋');
assert.ok(engineCode.includes('export function triggerMonsterGloatEffect'), '必須導出 triggerMonsterGloatEffect 得意反饋');
assert.ok(engineCode.includes('export function pickTauntQuote'), '必須導出 pickTauntQuote 平滑回退函式');
assert.ok(engineCode.includes('export function pickHitQuote'), '必須導出 pickHitQuote 平滑回退函式');

assert.ok(engineCode.includes('triggerMonsterGloatEffect(session)'), '答錯時必須觸發 triggerMonsterGloatEffect');
assert.ok(engineCode.includes('triggerMonsterHitEffect(session)'), '答對時必須觸發 triggerMonsterHitEffect');
assert.ok(engineCode.includes("monsterBadge.addEventListener('click'"), '必須支援點擊怪獸觸發互動反饋');

// 2. 檢驗 css/style.css
const cssCode = readFileSync('css/style.css', 'utf-8');

assert.ok(cssCode.includes('.monster-hp-bar-container'), 'CSS 必須包含 .monster-hp-bar-container');
assert.ok(cssCode.includes('.monster-hp-track'), 'CSS 必須包含 .monster-hp-track');
assert.ok(cssCode.includes('.monster-hp-fill'), 'CSS 必須包含 .monster-hp-fill');
assert.ok(cssCode.includes('.monster-hp-fill.hp-mid'), 'CSS 必須包含 hp-mid 警戒血條');
assert.ok(cssCode.includes('.monster-hp-fill.hp-low'), 'CSS 必須包含 hp-low 危急血條');
assert.ok(cssCode.includes('.monster-speech-bubble'), 'CSS 必須包含 .monster-speech-bubble');
assert.ok(cssCode.includes('.monster-speech-bubble.mood-gloat'), 'CSS 必須包含 mood-gloat 得意氣泡');
assert.ok(cssCode.includes('.monster-speech-bubble.mood-hit'), 'CSS 必須包含 mood-hit 受擊氣泡');
assert.ok(cssCode.includes('@keyframes monsterHitTremor'), 'CSS 必須包含 monsterHitTremor 受擊震顫動畫');
assert.ok(cssCode.includes('@keyframes monsterGloatAnim'), 'CSS 必須包含 monsterGloatAnim 得意跳躍動畫');
assert.ok(cssCode.includes('@keyframes monsterWiggleAnim'), 'CSS 必須包含 monsterWiggleAnim 點擊扭動動畫');
assert.ok(cssCode.includes('.monster-battle-badge.is-defeated'), 'CSS 必須包含 is-defeated 耐久耗盡狀態');

console.log('✅ 怪獸對峙血條與受擊反饋 22 項自檢單元測試全數 100% 綠燈通過！');

