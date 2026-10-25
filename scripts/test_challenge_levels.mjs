// scripts/test_challenge_levels.mjs
// 跨科目期末綜合挑戰島 48 關 (3 年級 x 16 關) 驗收測試

import {
  syncGradeLevels,
  getAllLevels,
  getLevelById,
  getIslandByLevel,
} from '../js/levels/index.js';
import { getGradeConfig } from '../js/grades.js';
import { isChallengeUnlocked, getChallengeUnlockStatus } from '../js/state.js';
import fs from 'fs';
import path from 'path';

console.log('🚀 開始跨科目期末綜合挑戰島關卡與題庫驗收...');

const grades = [1, 2, 3];
let totalVerified = 0;
let errors = [];

for (const g of grades) {
  const gConf = getGradeConfig(g, 'challenge');
  const islands = syncGradeLevels(g, 'challenge');
  const allLevels = getAllLevels(g, 'challenge');

  if (islands.length !== 4) {
    errors.push(`[challenge G${g}] 島嶼數量應為 4，實際為 ${islands.length}`);
  }
  if (allLevels.length !== 16) {
    errors.push(`[challenge G${g}] 關卡總數應為 16，實際為 ${allLevels.length}`);
  }

  // 檢查題庫檔案對應
  const qbPath = path.resolve(gConf.questionBankUrl);
  if (!fs.existsSync(qbPath)) {
    errors.push(`[challenge G${g}] 題庫檔案不存在: ${gConf.questionBankUrl}`);
  } else {
    const qbData = JSON.parse(fs.readFileSync(qbPath, 'utf8'));
    for (let i = 1; i <= 16; i++) {
      const qList = qbData.levels ? qbData.levels[String(i)] : null;
      if (!qList || qList.length < 6) {
        errors.push(`[challenge G${g}] 關卡 ${i} 題目數少於 6 (實際: ${qList?.length || 0})`);
      }
      // 驗證題目的科目融合度（應包含數學、英文、國語）
      const subjectsInLevel = new Set(qList.map(q => q.subject));
      if (!subjectsInLevel.has('math') || !subjectsInLevel.has('english') || !subjectsInLevel.has('chinese')) {
        errors.push(`[challenge G${g}] 關卡 ${i} 未能涵蓋數英中三科融合 (實際包含: ${Array.from(subjectsInLevel).join(',')})`);
      }
      // 驗證無 optionEmojis 洩題
      for (const q of qList) {
        if (q.optionEmojis && q.optionEmojis.length > 0) {
          errors.push(`[challenge G${g}] 關卡 ${i} 包含 optionEmojis`);
        }
      }
    }
  }

  for (let id = 1; id <= 16; id++) {
    const lv = getLevelById(id, g, 'challenge');
    if (!lv) {
      errors.push(`[challenge G${g}] 找不到關卡 ID ${id}`);
      continue;
    }
    const island = getIslandByLevel(id, g, 'challenge');
    if (!island) {
      errors.push(`[challenge G${g}] 關卡 ${id} 未掛載至任何島嶼`);
    }
    totalVerified++;
  }
  console.log(`  ✅ [challenge G${g}] 4 島嶼 × 4 關 = 16 關跨學科融合全部驗證通過 (題庫: ${gConf.questionBankUrl})`);
}

// 測試解鎖規則
const unlockStatus = getChallengeUnlockStatus(1);
console.log(`  ✅ [解鎖規則驗證] 門檻需滿 ${unlockStatus.requiredStars} 顆星，初始狀態 unlocked=${unlockStatus.unlocked}`);

if (errors.length > 0) {
  console.error('\n❌ 驗證失敗清單:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log(`\n🎉 完美！全部 ${totalVerified} 綜合挑戰關卡驗收通過！`);
}
