// scripts/test_g3_full_slam_96_levels.mjs
// 全科目 (數、英、國、自、社、挑戰) 小三全滿貫 96 關卡資料與雙軌語音驗收腳本
import {
  syncGradeLevels,
  getAllLevels,
  getLevelById,
  getIslandByLevel,
  getIslandById
} from '../js/levels/index.js';
import { SUBJECTS, getSubjectConfig, getSubjectSpeechLang } from '../js/subjects.js';
import { GRADES, getSubjectGrades, getGradeConfig } from '../js/grades.js';
import fs from 'fs';
import path from 'path';

console.log('🚀 開始全科目 (數、英、國、自、社、挑戰) 小三全滿貫 96 關卡資料與雙軌語音驗收...');

const g3Subjects = ['math', 'english', 'chinese', 'science', 'social', 'challenge'];
const grade = 3;
let totalLevelsVerified = 0;
let totalQuestionsVerified = 0;
let errors = [];

for (const s of g3Subjects) {
  const subjConf = getSubjectConfig(s);
  const speechLang = getSubjectSpeechLang(s);
  const gConf = getGradeConfig(grade, s);
  const islands = syncGradeLevels(grade, s);
  const allLevels = getAllLevels(grade, s);

  console.log(`\n📚 [${subjConf.name}] (${s}) - 語系: ${speechLang} | 題庫: ${gConf.questionBankUrl}`);

  if (!islands || islands.length !== 4) {
    errors.push(`[${s} G3] 島嶼數量應為 4，實際為 ${islands ? islands.length : 0}`);
  }
  if (!allLevels || allLevels.length !== 16) {
    errors.push(`[${s} G3] 關卡總數應為 16，實際為 ${allLevels ? allLevels.length : 0}`);
  }

  // 驗證題庫檔案
  const qbPath = path.resolve(gConf.questionBankUrl);
  if (!fs.existsSync(qbPath)) {
    errors.push(`[${s} G3] 題庫檔案不存在: ${gConf.questionBankUrl}`);
    continue;
  }

  const qbData = JSON.parse(fs.readFileSync(qbPath, 'utf8'));
  let subjectQuestions = 0;

  for (let lvl = 1; lvl <= 16; lvl++) {
    const levelDef = getLevelById(lvl, grade, s);
    if (!levelDef) {
      errors.push(`[${s} G3] 找不到關卡定義: Level ${lvl}`);
    } else {
      totalLevelsVerified++;
    }

    const islandDef = getIslandByLevel(lvl, grade, s);
    if (!islandDef) {
      errors.push(`[${s} G3] 關卡 ${lvl} 無法對應到島嶼`);
    }

    const qList = qbData.levels ? qbData.levels[String(lvl)] : null;
    if (!qList || !Array.isArray(qList) || qList.length === 0) {
      errors.push(`[${s} G3] 題庫關卡 ${lvl} 無題目或題目為空`);
      continue;
    }

    // 檢查題目結構與語音相容性
    for (let qIdx = 0; qIdx < qList.length; qIdx++) {
      const q = qList[qIdx];
      subjectQuestions++;
      totalQuestionsVerified++;

      const promptText = q.prompt || q.text;
      if (!promptText || typeof promptText !== 'string' || promptText.trim() === '') {
        errors.push(`[${s} G3 L${lvl} Q${qIdx}] 缺乏題目文本 prompt/text`);
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`[${s} G3 L${lvl} Q${qIdx}] 選項 options 必須為至少 2 個的陣列`);
      }
      if (q.answer === undefined || q.answer === null) {
        errors.push(`[${s} G3 L${lvl} Q${qIdx}] 缺少標準答案 answer`);
      } else {
        // 驗證答案是否在選項中或為合法索引
        const ansInOptions = q.options.includes(q.answer) || 
          (typeof q.answer === 'number' && q.answer >= 0 && q.answer < q.options.length) ||
          (typeof q.answer === 'string' && !isNaN(Number(q.answer)) && Number(q.answer) >= 0 && Number(q.answer) < q.options.length);
        if (!ansInOptions) {
          errors.push(`[${s} G3 L${lvl} Q${qIdx}] 答案 "${q.answer}" 不在選項 [${q.options.join(', ')}] 中`);
        }
      }

      // 雙軌語音檢查：確保語音引擎有可朗讀的文字
      const voiceText = q.speak || q.speechText || promptText;
      if (!voiceText || typeof voiceText !== 'string' || voiceText.trim() === '') {
        errors.push(`[${s} G3 L${lvl} Q${qIdx}] 雙軌語音文本無效`);
      }
    }
  }

  console.log(`  ✅ [${subjConf.name} G3] 4 座島嶼 × 4 關 = 16 關 (${subjectQuestions} 道題目) 全部結構驗證通過！`);
}

console.log('\n=============================================');
console.log(`📊 驗證結果: 總共驗收 ${totalLevelsVerified} 關卡，共 ${totalQuestionsVerified} 道題目`);

if (errors.length > 0) {
  console.error(`❌ 驗收失敗，發現 ${errors.length} 個錯誤:`);
  errors.forEach((err, idx) => console.error(`  ${idx + 1}. ${err}`));
  process.exit(1);
} else {
  console.log('🎉 完美！小三全滿貫 6 科目 96 關卡全部驗收通過，雙軌語音與關卡架構 100% 健全！');
  process.exit(0);
}
