// Mock browser environment for Node.js
globalThis.Audio = class {
  constructor() {
    this.paused = true;
    this.ended = false;
  }
  play() { return Promise.resolve(); }
  pause() {}
  load() {}
};

globalThis.window = {
  speechSynthesis: {
    getVoices: () => [],
    onvoiceschanged: null,
    speak: () => {},
    cancel: () => {}
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  }
};

globalThis.localStorage = globalThis.window.localStorage;

import assert from 'node:assert';
import fs from 'node:fs';

async function run() {
  const { getMonsterForLevel, getDarkonPhase, BOSS_DARKON } = await import('../js/monsters.js');
  const { BADGE_DEFINITIONS } = await import('../js/badges.js');

  console.log('🧪 Starting Darkon Boss Battle System Unit Tests...\n');

  // 1. Check assets on disk
  const expectedAssets = [
    'assets/boss/badge_legendary_hero.png',
    'assets/boss/boss_darkon_main.png',
    'assets/boss/boss_phase1_math.png',
    'assets/boss/boss_phase2_english.png',
    'assets/boss/boss_phase3_chinese.png'
  ];

  for (const asset of expectedAssets) {
    assert.ok(fs.existsSync(asset), `Asset must exist: ${asset}`);
    const stat = fs.statSync(asset);
    assert.ok(stat.size > 1000, `Asset file size must be valid: ${asset} (${stat.size} bytes)`);
  }
  console.log('✔ [1/5] All 5 Darkon boss image assets exist and verified on disk.');

  // 2. Test getMonsterForLevel for Challenge Level 16
  const monster16 = getMonsterForLevel('challenge', 16, 1);
  assert.ok(monster16, 'Monster for challenge level 16 must exist');
  assert.strictEqual(monster16.isBoss, true, 'Darkon must have isBoss=true');
  assert.strictEqual(monster16.isDarkon, true, 'Darkon must have isDarkon=true');
  assert.strictEqual(monster16.hp, 6, 'Darkon total HP must be 6');
  assert.strictEqual(monster16.totalPhases, 3, 'Darkon must have 3 phases');
  assert.strictEqual(monster16.phases.length, 3, 'Darkon phases array must have 3 items');
  console.log('✔ [2/5] getMonsterForLevel correctly resolves BOSS_DARKON on challenge level 16.');

  // 3. Test 3-Phase Progression Logic
  const p1 = getDarkonPhase(0);
  assert.strictEqual(p1.phase, 1, 'Phase 1 must be index 0');
  assert.strictEqual(p1.theme, 'math', 'Phase 1 must be math theme');
  assert.strictEqual(p1.image, 'assets/boss/boss_phase1_math.png', 'Phase 1 image check');

  const p1b = getDarkonPhase(1);
  assert.strictEqual(p1b.phase, 1, 'Phase 1 must be index 1');

  const p2 = getDarkonPhase(2);
  assert.strictEqual(p2.phase, 2, 'Phase 2 must start at 2 correct answers');
  assert.strictEqual(p2.theme, 'english', 'Phase 2 must be english theme');
  assert.strictEqual(p2.image, 'assets/boss/boss_phase2_english.png', 'Phase 2 image check');

  const p2b = getDarkonPhase(3);
  assert.strictEqual(p2b.phase, 2, 'Phase 2 must continue at 3 correct answers');

  const p3 = getDarkonPhase(4);
  assert.strictEqual(p3.phase, 3, 'Phase 3 must start at 4 correct answers');
  assert.strictEqual(p3.theme, 'chinese', 'Phase 3 must be chinese theme');
  assert.strictEqual(p3.image, 'assets/boss/boss_phase3_chinese.png', 'Phase 3 image check');

  const p3b = getDarkonPhase(5);
  assert.strictEqual(p3b.phase, 3, 'Phase 3 must continue at 5 correct answers');
  console.log('✔ [3/5] getDarkonPhase accurately transitions through Math -> English -> Chinese phases.');

  // 4. Test Badge Registration & Unlock Check
  const darkonBadge = BADGE_DEFINITIONS.find(b => b.id === 'darkon_slayer');
  assert.ok(darkonBadge, 'darkon_slayer badge must be registered');
  assert.strictEqual(darkonBadge.image, 'assets/boss/badge_legendary_hero.png', 'Badge must use legendary hero badge image');

  const lockedRes = darkonBadge.check({}, [{ subject: 'challenge', stars: { 1: 3, 2: 3 } }]);
  assert.strictEqual(lockedRes.unlocked, false, 'Badge should be locked if level 16 not passed');

  const unlockedRes = darkonBadge.check({}, [{ subject: 'challenge', stars: { 1: 3, 16: 3 } }]);
  assert.strictEqual(unlockedRes.unlocked, true, 'Badge should unlock when challenge level 16 has 3 stars');
  console.log('✔ [4/5] darkon_slayer badge definition and condition check validated 100%.');

  // 5. Test sw.js and css/style.css registration
  const swContent = fs.readFileSync('sw.js', 'utf8');
  for (const asset of expectedAssets) {
    assert.ok(swContent.includes(asset), `sw.js must cache asset: ${asset}`);
  }
  assert.ok(swContent.includes('css/characters.css'), 'sw.js must cache css/characters.css');
  assert.ok(swContent.includes('css/economy.css'), 'sw.js must cache css/economy.css');

  const cssContent = fs.readFileSync('css/style.css', 'utf8');
  assert.ok(cssContent.includes('.monster-battle-badge.is-darkon'), 'style.css must have .monster-battle-badge.is-darkon');
  assert.ok(cssContent.includes('.darkon-break-banner'), 'style.css must have .darkon-break-banner');
  assert.ok(cssContent.includes('.result-monster-defeat-card.is-darkon-defeat'), 'style.css must have darkon defeat styling');
  assert.ok(cssContent.includes('.challenge-darkon-btn'), 'style.css must have challenge-darkon-btn');
  console.log('✔ [5/5] sw.js and style.css registrations and styles verified.');

  console.log('\n🎉 ALL 5 TEST SUITES PASSED (100% GREEN)!\n');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
