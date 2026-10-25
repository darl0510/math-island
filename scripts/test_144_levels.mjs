// scripts/test_144_levels.mjs
// 144 關卡聯動與跨科目持久化驗收腳本
import {
  syncGradeLevels,
  getAllLevels,
  getLevelById,
  getIslandByLevel,
  getIslandById
} from '../js/levels/index.js';
import { SUBJECTS, getSubjectConfig } from '../js/subjects.js';
import { GRADES, getSubjectGrades, getGradeConfig } from '../js/grades.js';
import fs from 'fs';
import path from 'path';

console.log('🚀 開始 144 關卡跨科目聯動與資料驗收...');

const subjects = ['math', 'english', 'chinese'];
const grades = [1, 2, 3];
let totalLevelsVerified = 0;
let errors = [];

for (const s of subjects) {
  const subjConf = getSubjectConfig(s);
  const gradeList = getSubjectGrades(s);
  console.log(`\n📚 科目: ${subjConf.name} (${s}) - 註冊年級數: ${gradeList.length}`);

  for (const g of grades) {
    const gConf = getGradeConfig(g, s);
    const islands = syncGradeLevels(g, s);
    const allLevels = getAllLevels(g, s);

    if (islands.length !== 4) {
      errors.push(`[${s} G${g}] 島嶼數量應為 4，實際為 ${islands.length}`);
    }
    if (allLevels.length !== 16) {
      errors.push(`[${s} G${g}] 關卡總數應為 16，實際為 ${allLevels.length}`);
    }

    // 檢查題庫檔案對應
    const qbPath = path.resolve(gConf.questionBankUrl);
    if (!fs.existsSync(qbPath)) {
      errors.push(`[${s} G${g}] 題庫檔案不存在: ${gConf.questionBankUrl}`);
    } else {
      const qbData = JSON.parse(fs.readFileSync(qbPath, 'utf8'));
      for (let i = 1; i <= 16; i++) {
        const qList = qbData.levels ? qbData.levels[String(i)] : null;
        if (!qList || qList.length === 0) {
          errors.push(`[${s} G${g}] 題庫缺乏關卡 ${i} 的題目`);
        }
      }
    }

    // 檢查每個關卡與所屬島嶼
    for (let id = 1; id <= 16; id++) {
      const lv = getLevelById(id, g, s);
      if (!lv) {
        errors.push(`[${s} G${g}] 找不到關卡 ID ${id}`);
        continue;
      }
      const island = getIslandByLevel(id, g, s);
      if (!island) {
        errors.push(`[${s} G${g}] 關卡 ID ${id} 無法反查到所屬島嶼`);
      }
      totalLevelsVerified++;
    }

    console.log(`  ✅ [${s} G${g}] 4 島嶼 × 4 關 = 16 關全部驗證通過 (題庫: ${gConf.questionBankUrl})`);
  }
}

console.log('\n=============================================');
console.log(`📊 驗證結果: 總共驗證 ${totalLevelsVerified} 關卡`);
if (errors.length === 0) {
  console.log(`🎉 完美！全部 144 關卡無任何缺失或異常！`);
} else {
  console.error(`❌ 發現 ${errors.length} 個錯誤:`);
  errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
}
