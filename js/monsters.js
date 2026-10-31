/**
 * js/monsters.js
 * 奇幻冒險島各學科專屬小怪獸與島嶼守護小魔王對照註冊表 (SSOT)
 * 支援【小一數學 16 關專屬獨立怪獸圖鑑】與平滑降級機制作業
 */

// 小一數學島 16 關專屬怪獸清單
export const MATH_G1_LEVEL_MONSTERS = {
  1: {
    id: 'math_g1_01_mushroom',
    name: '十格陣蘑菇怪',
    title: '森林數數小嚮導',
    image: 'assets/monsters/math_g1/math_g1_01_mushroom.png',
    quote: '盤子裡的蘑菇，你一眼就數出來了！🍄',
    starsBonus: 1
  },
  2: {
    id: 'math_g1_02_crab',
    name: '比多少天平小螃蟹',
    title: '兩臂秤重平衡師',
    image: 'assets/monsters/math_g1/math_g1_02_crab.png',
    quote: '咔嚓咔嚓！誰多誰少都逃不過我的鉗子！🦀',
    starsBonus: 1
  },
  3: {
    id: 'math_g1_03_train_caterpillar',
    name: '排隊序數小火車蟲',
    title: '森林車站列車長',
    image: 'assets/monsters/math_g1/math_g1_03_train_caterpillar.png',
    quote: '第 1 個、第 2 個～大家都坐好出發囉！🚂',
    starsBonus: 1
  },
  4: {
    id: 'math_g1_04_split_butterfly',
    name: '合十分解彩虹蝶',
    title: '森林島初級守護者',
    image: 'assets/monsters/math_g1/math_g1_04_split_butterfly.png',
    isMiniBoss: true,
    hp: 3,
    quote: '8 和 2 合成 10，雙翅展開美麗的彩虹！🦋🌈',
    starsBonus: 2
  },
  5: {
    id: 'math_g1_05_seahorse',
    name: '加法珊瑚小海馬',
    title: '海底氣泡相加者',
    image: 'assets/monsters/math_g1/math_g1_05_seahorse.png',
    quote: '游啊游～把數字加在一起感覺真充實！🪸➕',
    starsBonus: 1
  },
  6: {
    id: 'math_g1_06_jellyfish',
    name: '減法啵啵水母',
    title: '泡泡消除魔術師',
    image: 'assets/monsters/math_g1/math_g1_06_jellyfish.png',
    quote: '啵！破掉的泡泡就從總數裡扣掉囉！🫧➖',
    starsBonus: 1
  },
  7: {
    id: 'math_g1_07_shape_turtle',
    name: '幾何形狀百變烏龜',
    title: '正方形與三角形好朋友',
    image: 'assets/monsters/math_g1/math_g1_07_shape_turtle.png',
    quote: '四條邊一樣長、四個直角，我是最帥的正方形！🐢📐',
    starsBonus: 1
  },
  8: {
    id: 'math_g1_08_clock_whale',
    name: '滴答時鐘機械鯨魚',
    title: '海洋島守護小魔王',
    image: 'assets/monsters/math_g1/math_g1_08_clock_whale.png',
    isMiniBoss: true,
    hp: 4,
    quote: '長針指 6、短針指中間，三點半的時間被你看透了！🐳⏰',
    starsBonus: 2
  },
  9: {
    id: 'math_g1_09_cloud_sheep',
    name: '湊十進位雲朵棉花羊',
    title: '高空輕飄飄魔術羊',
    image: 'assets/monsters/math_g1/math_g1_09_cloud_sheep.png',
    quote: '咩～滿十個就裝進十位袋子裡進位！🐑☁️',
    starsBonus: 1
  },
  10: {
    id: 'math_g1_10_lightning_eagle',
    name: '破十退位雷電小鷹',
    title: '雷霆疾風拆十神',
    image: 'assets/monsters/math_g1/math_g1_10_lightning_eagle.png',
    quote: '不夠減？看我一道閃電把 10 劈開拆成個位！⚡🦅',
    starsBonus: 1
  },
  11: {
    id: 'math_g1_11_place_blocks',
    name: '十位個位積木石怪',
    title: '高樓方塊建造者',
    image: 'assets/monsters/math_g1/math_g1_11_place_blocks.png',
    quote: '9 個十與 2 個一，搭建成 92 層摩天大樓！🧱🗿',
    starsBonus: 1
  },
  12: {
    id: 'math_g1_12_ruler_dragon',
    name: '公分刻度尺神龍',
    title: '雲端島守護小魔王',
    image: 'assets/monsters/math_g1/math_g1_12_ruler_dragon.png',
    isMiniBoss: true,
    hp: 4,
    quote: '從 0 開始量起，你的長度眼光絲毫未差！🐉📏',
    starsBonus: 2
  },
  13: {
    id: 'math_g1_13_piggy_bank',
    name: '金幣撲滿小存錢豬',
    title: '硬幣找零精算大師',
    image: 'assets/monsters/math_g1/math_g1_13_piggy_bank.png',
    quote: '80 元買 12 元飲料，找你 68 元剛剛好！🐷💰',
    starsBonus: 1
  },
  14: {
    id: 'math_g1_14_space_alien',
    name: '二位加減太空章魚',
    title: '星際貼紙收藏家',
    image: 'assets/monsters/math_g1/math_g1_14_space_alien.png',
    quote: '61 加 32 等於 93！太空旅行大豐收！🐙🚀',
    starsBonus: 1
  },
  15: {
    id: 'math_g1_15_calendar_owl',
    name: '統計長條圖日曆貓頭鷹',
    title: '水果排行榜裁判',
    image: 'assets/monsters/math_g1/math_g1_15_calendar_owl.png',
    quote: '看柱狀圖高高低低，誰最多誰最少一目了然！🦉📊',
    starsBonus: 1
  },
  16: {
    id: 'math_g1_16_titan_boss',
    name: '時鐘計數鋼鐵巨人',
    title: '奇幻數學島全境守護魔王',
    image: 'assets/monsters/boss_math_titan.png',
    isBoss: true,
    hp: 5,
    quote: '滴答滴答…你解開了所有應用題，你就是算術之王！🤖👑',
    starsBonus: 3
  }
};

export const MONSTERS = {
  math: {
    mob: {
      id: 'mob_math_slime',
      name: '綠晶計數史萊姆',
      title: '愛跳躍的數字果凍',
      image: 'assets/monsters/mob_math_slime.png',
      defeatQuote: '咕溜～我的加減法還沒算完呀！💦',
      starsBonus: 1
    },
    boss: {
      id: 'boss_math_titan',
      name: '時鐘計數鋼鐵巨人',
      title: '奇幻數學島守護島主',
      image: 'assets/monsters/boss_math_titan.png',
      hp: 5,
      defeatQuote: '滴答滴答…齒輪停下來了，你才是真正的算術大宗師！🤖⭐',
      rewardBadge: 'badge_math_master'
    }
  },
  english: {
    mob: {
      id: 'mob_english_bat',
      name: '自然發音字母小蝠',
      title: '頑皮的 ABC 飛行精靈',
      image: 'assets/monsters/mob_english_bat.png',
      defeatQuote: 'A, B, C... See you next time! 🦇✨',
      starsBonus: 1
    },
    boss: {
      id: 'boss_english_owl',
      name: '文法神鳥貓頭鷹王',
      title: '奇幻英文島守護島主',
      image: 'assets/monsters/boss_english_owl.png',
      hp: 5,
      defeatQuote: 'Hoo-hoo! Your English vocabulary is truly magnificent! 🦉👑',
      rewardBadge: 'badge_english_master'
    }
  },
  chinese: {
    mob: {
      id: 'mob_chinese_ink',
      name: '水墨部首小水滴',
      title: '靈動的筆墨小童',
      image: 'assets/monsters/mob_chinese_ink.png',
      defeatQuote: '揮一揮毛筆，你的筆順真是行雲流水！🖌️💧',
      starsBonus: 1
    },
    boss: {
      id: 'boss_chinese_dragon',
      name: '水墨千字古神龍',
      title: '奇幻國語島守護島主',
      image: 'assets/monsters/boss_chinese_dragon.png',
      hp: 5,
      defeatQuote: '筆落驚風雨！千古漢字之美已被你悉數領悟！🐉📜',
      rewardBadge: 'badge_chinese_master'
    }
  },
  science: {
    mob: {
      id: 'mob_science_beetle',
      name: '磁力種子小甲蟲',
      title: '帶電的生態小工兵',
      image: 'assets/monsters/mob_science_beetle.png',
      defeatQuote: '滋滋～磁極相吸，你的科學觀察力太強了！⚡🐞',
      starsBonus: 1
    },
    boss: {
      id: 'boss_science_alchemist',
      name: '元素機械萬象樹妖',
      title: '自然科學島守護島主',
      image: 'assets/monsters/boss_science_alchemist.png',
      hp: 5,
      defeatQuote: '萬物運轉的奧秘，已被你敏銳的雙眼徹底洞悉！🌱🔬',
      rewardBadge: 'badge_science_master'
    }
  },
  social: {
    mob: {
      id: 'mob_social_compass',
      name: '探索羅盤岩石精靈',
      title: '指引方位的古地圖嚮導',
      image: 'assets/monsters/mob_social_compass.png',
      defeatQuote: '指針轉啊轉，你已經認識了這片土地的一切！🧭🗺️',
      starsBonus: 1
    },
    boss: {
      id: 'boss_social_fortress',
      name: '寶島玉山堡壘石王',
      title: '奇幻社會島守護島主',
      image: 'assets/monsters/boss_social_fortress.png',
      hp: 5,
      defeatQuote: '巍峨山川見證了你的熱情，你是最懂家鄉的博學勇士！⛰️🏮',
      rewardBadge: 'badge_social_master'
    }
  },
  challenge: {
    mob: {
      id: 'mob_challenge_sphinx',
      name: '素養金翼小獅身',
      title: '守護會考大門的知識之靈',
      image: 'assets/monsters/mob_math_slime.png',
      defeatQuote: '太棒了！跨學科的素養智慧解開了遠古謎題！🦁✨',
      starsBonus: 1
    },
    boss: null
  }
};

/**
 * 終極大魔王 Darkon 三階段設定 (SSOT)
 */
export const BOSS_DARKON = {
  id: 'boss_darkon',
  name: '混沌暗影魔王 達爾肯 (Darkon)',
  title: '跨界混沌之主 · 終極大魔王',
  image: 'assets/boss/boss_darkon_main.png',
  isBoss: true,
  isDarkon: true,
  hp: 6,
  totalPhases: 3,
  phases: [
    {
      phase: 1,
      name: 'Darkon · 算術混沌形態',
      shieldName: '幾何算術護盾',
      image: 'assets/boss/boss_phase1_math.png',
      theme: 'math',
      themeColor: '#3fae6a',
      shieldHp: 2,
      quote: '呵呵…想破解我的混沌領域？先解開這道數理之鎖！🔢🛡️',
      hitQuote: '唔！這算術居然撼動了幾何屏障！',
      tauntQuote: '算術差之毫釐，謬以千里！',
      breakQuote: '【階段 1 破盾】可惡！算術護盾瓦解…轉換英文形態！💥',
      breakTitle: '💥 幾何算術護盾 擊破！',
      badgeIcon: '📐',
      questionRange: [0, 1]
    },
    {
      phase: 2,
      name: 'Darkon · 語彙風暴形態',
      shieldName: '自然發音語彙盾',
      image: 'assets/boss/boss_phase2_english.png',
      theme: 'english',
      themeColor: '#2b9cdb',
      shieldHp: 2,
      quote: 'Silence! 在生活單字與自然發音的風暴中顫抖吧！🔤🌪️',
      hitQuote: 'Ouch! Your vocabulary is too strong!',
      tauntQuote: 'Hahaha! Lost in translation?',
      breakQuote: '【階段 2 破盾】No! 語彙盾破裂…釋放千字水墨封印！⚡',
      breakTitle: '⚡ 自然發音語彙盾 擊破！',
      badgeIcon: '🔤',
      questionRange: [2, 3]
    },
    {
      phase: 3,
      name: 'Darkon · 千古水墨魔神形態',
      shieldName: '萬象千字水墨盾',
      image: 'assets/boss/boss_phase3_chinese.png',
      theme: 'chinese',
      themeColor: '#8d7bf0',
      shieldHp: 2,
      quote: '一筆一畫皆天道！看你能否識破千百年文字部首玄機！📜🖌️',
      hitQuote: '呀！點橫撇捺…竟反震傷我真元！',
      tauntQuote: '這字句深奧，你還太嫩了！',
      breakQuote: '【階段 3 破盾】不可思議…三科奧義合一，我被徹底淨化了！🌟',
      breakTitle: '🌟 萬象千字水墨盾 終極擊破！',
      badgeIcon: '📖',
      questionRange: [4, 5]
    }
  ],
  quote: '凡人勇士，你以為集齊三大領域智慧就能戰勝我嗎？',
  defeatQuote: '太不可思議了…數、英、中三科智慧竟然化為一體！奇幻島的勇士，你拯救了整個世界！👑✨',
  rewardBadge: 'darkon_slayer',
  starsBonus: 5
};

/**
 * 依累計答對題數取得 Darkon 當前階段 (0~1: Phase 1, 2~3: Phase 2, 4~5: Phase 3)
 */
export function getDarkonPhase(correctCount = 0) {
  if (correctCount >= 4) return BOSS_DARKON.phases[2];
  if (correctCount >= 2) return BOSS_DARKON.phases[1];
  return BOSS_DARKON.phases[0];
}

/**
 * 依科目與年級取得當前關卡應遭遇的怪獸或魔王
 * @param {string} subject 科目代碼 (math, english, chinese...)
 * @param {number|string} level 關卡編號 (1~16) 或專屬識別碼
 * @param {number} grade 年級 (1~3)
 */
export function getMonsterForLevel(subject = 'math', level = 1, grade = 1) {
  // 期末綜合挑戰第 16 關或大魔王專屬決戰：召喚終極大魔王 Darkon
  if ((subject === 'challenge' && Number(level) === 16) || level === 'boss_darkon') {
    return { ...BOSS_DARKON };
  }

  // 若為小一數學島，優先調用 16 關獨立專屬怪獸圖鑑
  if (subject === 'math' && Number(grade) === 1) {
    const lvlMonster = MATH_G1_LEVEL_MONSTERS[Number(level)];
    if (lvlMonster) {
      return {
        ...lvlMonster,
        isBoss: Number(level) === 16,
        isMiniBoss: lvlMonster.isMiniBoss || false
      };
    }
  }

  const cfg = MONSTERS[subject] || MONSTERS.math;
  if (level >= 16) {
    return { ...(cfg.boss || BOSS_DARKON), isBoss: true };
  }
  return { ...cfg.mob, isBoss: false };
}
