import { island1 } from './island1.js';
import { island2 } from './island2.js';
import { island3 } from './island3.js';
import { island4 } from './island4.js';
import { g2_islands } from './island_defs_g2.js';
import { g3_islands } from './island_defs_g3.js';
import { getCurrentGrade } from '../state.js';

export const g1_islands = [island1, island2, island3, island4];
export { g2_islands, g3_islands };

function getIslandsForGrade(grade = getCurrentGrade()) {
  const g = Number(grade);
  if (g === 3) return g3_islands;
  if (g === 2) return g2_islands;
  return g1_islands;
}

export let islands = [...getIslandsForGrade()];

export function syncGradeLevels(grade = getCurrentGrade()) {
  islands.length = 0;
  islands.push(...getIslandsForGrade(grade));
  return islands;
}

export function getAllLevels(grade = getCurrentGrade()) {
  const list = getIslandsForGrade(grade);
  return list.flatMap((island) => island.levels);
}

export const allLevels = islands.flatMap((island) => island.levels);

export function getLevelById(id, grade = getCurrentGrade()) {
  const all = getAllLevels(grade);
  return all.find((level) => Number(level.id) === Number(id)) || null;
}

export function getIslandByLevel(id, grade = getCurrentGrade()) {
  const list = getIslandsForGrade(grade);
  return list.find((island) => island.levels.some((level) => Number(level.id) === Number(id))) || null;
}

export function getIslandById(id, grade = getCurrentGrade()) {
  const list = getIslandsForGrade(grade);
  return list.find((island) => Number(island.id) === Number(id)) || null;
}

