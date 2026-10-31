/**
 * tests/test_character_actions.js
 * 奇幻數學島 角色過關專屬動效中樞與實機整合單元測試 (Action Effects Suite)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROLE_SKILLS, getSkillsForCharacter, getSkillBySlot, getVictoryFinisherSkill, renderHeroActionStageMarkup } from '../js/actions.js';
import { CHARACTERS } from '../js/characters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('🧪 Starting Fantasy Math Island Character Actions Unit Tests...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  passedTests++;
  console.log(`✔ [${passedTests}] ${message}`);
}

// 測試 1: 驗證 10 大角色全數具備專屬技能庫定義
const expectedRoleIds = CHARACTERS.map(c => c.id);
assert(
  expectedRoleIds.length === 10 && expectedRoleIds.every(id => Boolean(ROLE_SKILLS[id])),
  `All 10 adventure characters have complete action skill definitions registered.`
);

// 測試 2: 驗證每位角色皆完整標準化 5 大技能插槽 (Slot 1 ~ 5)
let allHave5Slots = true;
expectedRoleIds.forEach(id => {
  const skills = getSkillsForCharacter(id);
  if (skills.length !== 5) allHave5Slots = false;
  for (let s = 1; s <= 5; s++) {
    const slotSkill = getSkillBySlot(id, s);
    if (!slotSkill || slotSkill.slot !== s) allHave5Slots = false;
  }
});
assert(allHave5Slots, 'Every character successfully reserves 5 standardized skill slots (Slot 1 to 5).');

// 測試 3: 驗證魔法公主之旋轉神聖法陣與傳奇勇者之破空月牙斬
const princessFinisher = getVictoryFinisherSkill('princess_magic');
assert(
  princessFinisher &&
  princessFinisher.id === 'circle' &&
  princessFinisher.anim === 'anim-spin-circle' &&
  princessFinisher.actionPose === 'char-cast' &&
  princessFinisher.vfxKey === 'magic_circle',
  'Princess Magic accurately resolves to rotating magic circle (璀璨星芒神聖陣) with anim-spin-circle.'
);

const heroFinisher = getVictoryFinisherSkill('prince_hero');
assert(
  heroFinisher &&
  heroFinisher.id === 'crescent' &&
  heroFinisher.anim === 'anim-crescent' &&
  heroFinisher.actionPose === 'char-slash' &&
  heroFinisher.vfxKey === 'crescent_wave',
  'Legendary Hero accurately resolves to crescent slash (破空月牙斬) with anim-crescent.'
);

// 測試 4: 驗證平滑降級 (未知角色自動安全回退至魔法公主)
const fallbackSkills = getSkillsForCharacter('unknown_nonexistent_hero');
assert(
  Array.isArray(fallbackSkills) && fallbackSkills.length === 5 && fallbackSkills[0].id === 'circle',
  'Graceful fallback mechanism safely defaults unknown characters to princess_magic without errors.'
);

// 測試 5: 驗證磁碟上所有技能特效 WebP 與 PNG 實體檔案在庫
const vfxDir = path.join(ROOT_DIR, 'assets', 'vfx');
let allVfxFilesExist = true;
const checkedVfxKeys = new Set();
expectedRoleIds.forEach(id => {
  const skills = getSkillsForCharacter(id);
  skills.forEach(sk => {
    if (!checkedVfxKeys.has(sk.vfxKey)) {
      checkedVfxKeys.add(sk.vfxKey);
      const webpFile = path.join(vfxDir, `vfx_${sk.vfxKey}.webp`);
      const pngFile = path.join(vfxDir, `vfx_${sk.vfxKey}.png`);
      if (!fs.existsSync(webpFile) || !fs.existsSync(pngFile)) {
        console.error(`Missing VFX asset: ${webpFile} or ${pngFile}`);
        allVfxFilesExist = false;
      }
    }
  });
});
assert(allVfxFilesExist, `All VFX asset images (.webp and .png dual-track) verified present on disk (${checkedVfxKeys.size} VFX keys).`);

// 測試 6: 驗證 renderHeroActionStageMarkup 生成結構完整度
const stageMarkup = renderHeroActionStageMarkup({ id: 'princess_magic' });
assert(
  stageMarkup.includes('result-hero-action-stage') &&
  stageMarkup.includes('result-hero-vfx') &&
  stageMarkup.includes('result-hero-sprite') &&
  stageMarkup.includes('result-hero-skill-banner') &&
  stageMarkup.includes('璀璨星芒神聖陣'),
  'renderHeroActionStageMarkup produces valid semantic HTML markup with vfx, sprite, and skill banner.'
);

// 測試 7: 驗證 css/characters.css 動畫關鍵幀與動作姿態樣式
const charactersCss = fs.readFileSync(path.join(ROOT_DIR, 'css', 'characters.css'), 'utf-8');
assert(
  charactersCss.includes('@keyframes aSpinCircle') &&
  charactersCss.includes('@keyframes aCrescentSlash') &&
  charactersCss.includes('.anim-spin-circle') &&
  charactersCss.includes('.anim-crescent') &&
  charactersCss.includes('.char-cast') &&
  charactersCss.includes('.char-slash') &&
  charactersCss.includes('.char-victory-heroic') &&
  charactersCss.includes('.result-hero-action-stage'),
  'css/characters.css contains all required keyframe animations, hero action poses, and stage layout rules.'
);

// 測試 8: 驗證 js/engine.js 正式整合 finishLevel
const engineJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'engine.js'), 'utf-8');
assert(
  engineJs.includes("import { renderHeroActionStageMarkup, triggerCharacterVictoryAction, getVictoryFinisherSkill } from './actions.js';") &&
  engineJs.includes('renderHeroActionStageMarkup(currentCharacter, heroSkill)') &&
  engineJs.includes('triggerCharacterVictoryAction(overlay,'),
  'js/engine.js finishLevel formally integrates action stage rendering and victory finisher invocation.'
);

// 測試 9: 驗證 sw.js 離線快取註冊清單包含 actions.js 與核心特效
const swJs = fs.readFileSync(path.join(ROOT_DIR, 'sw.js'), 'utf-8');
assert(
  swJs.includes("'./js/actions.js',") &&
  swJs.includes("'./assets/vfx/vfx_magic_circle.webp',") &&
  swJs.includes("'./assets/vfx/vfx_crescent_wave.webp',"),
  'sw.js static cache manifest successfully registers actions.js and key action VFX assets.'
);

console.log(`\n🎉 ALL ${passedTests}/${totalTests} TEST SUITES PASSED (100% GREEN)!\n`);

