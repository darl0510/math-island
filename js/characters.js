/**
 * js/characters.js
 * 奇幻數學島 小勇士冒險角色註冊表與形象選擇系統
 * 支援 5 大公主與 5 大王子勇士高解析度頭像與立繪
 */

export const CHARACTERS = [
  // 🌸 公主系列
  {
    id: 'princess_magic',
    gender: 'girl',
    type: 'princess',
    name: '魔法公主',
    title: '星芒守護者',
    avatar: '🌸',
    color: '#ec4899',
    image: 'assets/characters/princess_magic.png',
    quote: '用愛與智慧的星光，點亮每道難題！✨',
    trait: '答題專注度 +100%'
  },
  {
    id: 'princess_brave',
    gender: 'girl',
    type: 'princess',
    name: '勇者公主',
    title: '正義小先鋒',
    avatar: '⚔️',
    color: '#3b82f6',
    image: 'assets/characters/princess_brave.png',
    quote: '勇敢揮舞魔法劍，沒有打不倒的魔王！🛡️',
    trait: '勇往直前・毫不畏懼'
  },
  {
    id: 'princess_star',
    gender: 'girl',
    type: 'princess',
    name: '星空公主',
    title: '銀河觀星者',
    avatar: '🌟',
    color: '#6366f1',
    image: 'assets/characters/princess_star.png',
    quote: '浩瀚宇宙中，每個數字都是美麗的星座！🌌',
    trait: '清晰洞察・智慧過人'
  },
  {
    id: 'princess_nature',
    gender: 'girl',
    type: 'princess',
    name: '自然公主',
    title: '森林小仙子',
    avatar: '🌺',
    color: '#10b981',
    image: 'assets/characters/princess_nature.png',
    quote: '蝴蝶與花朵是我的好朋友，陪伴我成長！🦋',
    trait: '溫柔守護・自然共鳴'
  },
  {
    id: 'princess_mystery',
    gender: 'girl',
    type: 'princess',
    name: '神秘公主',
    title: '符文博學者',
    avatar: '🔮',
    color: '#8b5cf6',
    image: 'assets/characters/princess_mystery.png',
    quote: '古老水晶球裡，隱藏著所有知識的解答！📖',
    trait: '深思熟慮・博古通今'
  },

  // 👦 王子勇士系列
  {
    id: 'prince_knight',
    gender: 'boy',
    type: 'prince',
    name: '魔法騎士',
    title: '聖光守衛',
    avatar: '🧙‍♂️',
    color: '#a855f7',
    image: 'assets/characters/prince_knight.png',
    quote: '魔力鎧甲在身，隨時迎戰最強對手！⚔️',
    trait: '堅定信念・守護同伴'
  },
  {
    id: 'prince_hero',
    gender: 'boy',
    type: 'prince',
    name: '傳奇勇者',
    title: '冒險王',
    avatar: '🗡️',
    color: '#ef4444',
    image: 'assets/characters/prince_hero.png',
    quote: '出發吧！新的島嶼正等著我們去征服！🚩',
    trait: '熱血沸騰・永不言棄'
  },
  {
    id: 'prince_space',
    gender: 'boy',
    type: 'prince',
    name: '宇宙探險家',
    title: '星際領航員',
    avatar: '🚀',
    color: '#0ea5e9',
    image: 'assets/characters/prince_space.png',
    quote: '目標是未知的星系，噴射背包全力啟動！🛸',
    trait: '好奇探索・放眼未來'
  },
  {
    id: 'prince_forest',
    gender: 'boy',
    type: 'prince',
    name: '森林守護者',
    title: '精靈巡林客',
    avatar: '🌿',
    color: '#15803d',
    image: 'assets/characters/prince_forest.png',
    quote: '聽風的聲音，它會告訴你正解在哪裡！🏹',
    trait: '敏捷神準・心靜如水'
  },
  {
    id: 'prince_science',
    gender: 'boy',
    type: 'prince',
    name: '科學魔法師',
    title: '發明小天才',
    avatar: '🔬',
    color: '#eab308',
    image: 'assets/characters/prince_science.png',
    quote: '觀察加上實驗，神奇魔法就此誕生！⚡',
    trait: '邏輯分析・靈光一閃'
  }
];

export const STORAGE_KEY_CHARACTER = 'fantasy_math_hero_character';

/**
 * 依 ID 取得指定冒險角色
 */
export function getCharacterById(id) {
  if (!id) return null;
  return CHARACTERS.find(c => c.id === id) || null;
}

/**
 * 取得當前角色設定 (支援關聯當前學童)
 */
export function getCurrentCharacter(student = null) {
  if (student && student.characterId) {
    const found = CHARACTERS.find(c => c.id === student.characterId);
    if (found) return found;
  }
  try {
    const curStudentRaw = localStorage.getItem('fantasy_math_current_student');
    if (curStudentRaw) {
      const curStudent = JSON.parse(curStudentRaw);
      if (curStudent && curStudent.characterId) {
        const found = CHARACTERS.find(c => c.id === curStudent.characterId);
        if (found) return found;
      }
    }
    const saved = localStorage.getItem(STORAGE_KEY_CHARACTER);
    if (saved) {
      const parsed = JSON.parse(saved);
      const found = CHARACTERS.find(c => c.id === parsed.id);
      if (found) return found;
    }
  } catch (e) {}
  // 預設為魔法公主
  return CHARACTERS[0];
}

/**
 * 設定並儲存角色 (同步更新當前學童偏好)
 */
export function setCurrentCharacter(charOrId) {
  const target = typeof charOrId === 'string'
    ? CHARACTERS.find(c => c.id === charOrId)
    : charOrId;
  if (!target) return;

  try {
    localStorage.setItem(STORAGE_KEY_CHARACTER, JSON.stringify({ id: target.id }));
    const curStudentRaw = localStorage.getItem('fantasy_math_current_student');
    if (curStudentRaw) {
      const curStudent = JSON.parse(curStudentRaw);
      if (curStudent) {
        curStudent.characterId = target.id;
        localStorage.setItem('fantasy_math_current_student', JSON.stringify(curStudent));
      }
    }
  } catch (e) {}

  // 派發全域角色變更事件
  window.dispatchEvent(new CustomEvent('fantasy-math:character-changed', { detail: target }));
  return target;
}

