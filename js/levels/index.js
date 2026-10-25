import { island1 } from './island1.js';
import { island2 } from './island2.js';
import { island3 } from './island3.js';
import { island4 } from './island4.js';
import { g2_islands } from './island_defs_g2.js';
import { g3_islands } from './island_defs_g3.js';
import { en_g1_islands } from './island_defs_en_g1.js';
import { en_g2_islands } from './island_defs_en_g2.js';
import { en_g3_islands } from './island_defs_en_g3.js';
import { ch_g1_islands } from './island_defs_ch_g1.js';
import { ch_g2_islands } from './island_defs_ch_g2.js';
import { ch_g3_islands } from './island_defs_ch_g3.js';
import { science_g1_islands } from './island_defs_science_g1.js';
import { science_g2_islands } from './island_defs_science_g2.js';
import { CHALLENGE_LEVEL_TABLES, challenge_g1_islands, challenge_g2_islands, challenge_g3_islands } from './island_defs_challenge.js';
import { getCurrentGrade, getCurrentSubject } from '../state.js';
import { DEFAULT_SUBJECT } from '../subjects.js';

export const g1_islands = [island1, island2, island3, island4];
export { g2_islands, g3_islands, en_g1_islands, en_g2_islands, en_g3_islands, ch_g1_islands, ch_g2_islands, ch_g3_islands, science_g1_islands, science_g2_islands, challenge_g1_islands, challenge_g2_islands, challenge_g3_islands };

/* 科目 → 年級 → 關卡表 (SSOT)：新增「奇幻英文島 / 奇幻國語島 / 奇幻自然島 / 期末綜合挑戰島」時在此掛上該科關卡表即可，
   嚴禁在 map / engine 端硬編碼科目判斷。 */
const SUBJECT_LEVEL_TABLES = {
  math: { 1: g1_islands, 2: g2_islands, 3: g3_islands },
  english: { 1: en_g1_islands, 2: en_g2_islands, 3: en_g3_islands },
  chinese: { 1: ch_g1_islands, 2: ch_g2_islands, 3: ch_g3_islands },
  science: { 1: science_g1_islands, 2: science_g2_islands },
  challenge: CHALLENGE_LEVEL_TABLES,
};

function getSubjectTables(subjectId = getCurrentSubject()) {
  return SUBJECT_LEVEL_TABLES[String(subjectId)] || SUBJECT_LEVEL_TABLES[DEFAULT_SUBJECT];
}

function getIslandsForGrade(grade = getCurrentGrade(), subjectId = getCurrentSubject()) {
  const tables = getSubjectTables(subjectId);
  const g = Number(grade);
  return tables[g] || tables[1] || g1_islands;
}

export let islands = [...getIslandsForGrade()];

export function syncGradeLevels(grade = getCurrentGrade(), subjectId = getCurrentSubject()) {
  islands.length = 0;
  islands.push(...getIslandsForGrade(grade, subjectId));
  return islands;
}

export function getAllLevels(grade = getCurrentGrade(), subjectId = getCurrentSubject()) {
  const list = getIslandsForGrade(grade, subjectId);
  return list.flatMap((island) => island.levels);
}

export const allLevels = islands.flatMap((island) => island.levels);

export function getLevelById(id, grade = getCurrentGrade(), subjectId = getCurrentSubject()) {
  const all = getAllLevels(grade, subjectId);
  return all.find((level) => Number(level.id) === Number(id)) || null;
}

export function getIslandByLevel(id, grade = getCurrentGrade(), subjectId = getCurrentSubject()) {
  const list = getIslandsForGrade(grade, subjectId);
  return list.find((island) => island.levels.some((level) => Number(level.id) === Number(id))) || null;
}

export function getIslandById(id, grade = getCurrentGrade(), subjectId = getCurrentSubject()) {
  const list = getIslandsForGrade(grade, subjectId);
  return list.find((island) => Number(island.id) === Number(id)) || null;
}

