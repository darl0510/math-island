/**
 * js/actions.js
 * 奇幻數學島 角色過關專屬動效中樞與技能系統 (Action Effects Hub)
 * 支援 10 大冒險角色量身專屬 5 款技能插槽、平滑降級與 Web Audio 原生音效合成
 */

// 10 大冒險角色量身專屬技能庫字典 (每位角色均標準化 5 款技能插槽)
export const ROLE_SKILLS = {
  // 🌸 公主系列
  princess_magic: {
    id: 'princess_magic',
    name: '魔法公主',
    type: 'magic',
    img: 'assets/characters/princess_magic.webp',
    imgFallback: 'assets/characters/princess_magic.png',
    themeColor: '#ec4899',
    skills: [
      {
        slot: 1,
        id: 'circle',
        name: '璀璨星芒神聖陣',
        desc: '金色符文與旋轉星芒光環',
        icon: '🌟',
        scenario: '三星滿星通關・角色奧義',
        vfxKey: 'magic_circle',
        vfxSrc: 'assets/vfx/vfx_magic_circle.webp',
        vfxFallback: 'assets/vfx/vfx_magic_circle.png',
        anim: 'anim-spin-circle',
        sound: 'magic_chime',
        colors: ['#fbbf24', '#f472b6', '#ffffff'],
        actionPose: 'char-cast'
      },
      {
        slot: 2,
        id: 'butterfly',
        name: '粉櫻幻蝶飛舞',
        desc: '漫天粉櫻光粉與彩虹幻蝶',
        icon: '🦋',
        scenario: '自然關卡通關・心靈共鳴',
        vfxKey: 'princess_butterfly',
        vfxSrc: 'assets/vfx/vfx_princess_butterfly.webp',
        vfxFallback: 'assets/vfx/vfx_princess_butterfly.png',
        anim: 'anim-butterfly',
        sound: 'butterfly',
        colors: ['#f472b6', '#fef08a', '#ffffff'],
        actionPose: 'char-cast'
      },
      {
        slot: 3,
        id: 'frost',
        name: '冰晶雪花星芒',
        desc: '旋轉六角冰霜與極寒星光',
        icon: '❄️',
        scenario: '連擊滿分加成・霜凍靈光',
        vfxKey: 'princess_frost_crystal',
        vfxSrc: 'assets/vfx/vfx_princess_frost_crystal.webp',
        vfxFallback: 'assets/vfx/vfx_princess_frost_crystal.png',
        anim: 'anim-frost',
        sound: 'ice',
        colors: ['#38bdf8', '#e0f2fe', '#ffffff'],
        actionPose: 'char-cast'
      },
      {
        slot: 4,
        id: 'shield',
        name: '愛心聖光守護盾',
        desc: '金色天使羽翼與愛心護盾',
        icon: '💖',
        scenario: '無損生命通關・聖光庇護',
        vfxKey: 'princess_heart_shield',
        vfxSrc: 'assets/vfx/vfx_princess_heart_shield.webp',
        vfxFallback: 'assets/vfx/vfx_princess_heart_shield.png',
        anim: 'anim-heart',
        sound: 'shield',
        colors: ['#ec4899', '#fbbf24', '#ffffff'],
        actionPose: 'char-cast'
      },
      {
        slot: 5,
        id: 'aurora',
        name: '彩虹極光星河',
        desc: '七彩流光極光大爆發',
        icon: '🌈',
        scenario: '擊倒魔王・終極淨化奧義',
        vfxKey: 'princess_rainbow_aurora',
        vfxSrc: 'assets/vfx/vfx_princess_rainbow_aurora.webp',
        vfxFallback: 'assets/vfx/vfx_princess_rainbow_aurora.png',
        anim: 'anim-aurora',
        sound: 'supernova',
        colors: ['#c084fc', '#f472b6', '#38bdf8', '#fbbf24'],
        actionPose: 'char-cast'
      }
    ]
  },

  princess_brave: {
    id: 'princess_brave',
    name: '勇者公主',
    type: 'slash',
    img: 'assets/characters/princess_brave.webp',
    imgFallback: 'assets/characters/princess_brave.png',
    themeColor: '#3b82f6',
    skills: [
      {
        slot: 1,
        id: 'crescent',
        name: '破甲疾速月牙斬',
        desc: '凌厲藍光月牙弧形風刃',
        icon: '🌙',
        scenario: '秒答突破防線・疾速月刃',
        vfxKey: 'crescent_wave',
        vfxSrc: 'assets/vfx/vfx_crescent_wave.webp',
        vfxFallback: 'assets/vfx/vfx_crescent_wave.png',
        anim: 'anim-crescent',
        sound: 'slash',
        colors: ['#38bdf8', '#ffffff', '#3b82f6'],
        actionPose: 'char-slash'
      },
      {
        slot: 2,
        id: 'cross',
        name: '英勇雙重符文斬',
        desc: '交叉金藍破甲聖光十字',
        icon: '⚔️',
        scenario: '雙倍暴擊加成・破魔十字',
        vfxKey: 'hero_cross_slash',
        vfxSrc: 'assets/vfx/vfx_hero_cross_slash.webp',
        vfxFallback: 'assets/vfx/vfx_hero_cross_slash.png',
        anim: 'anim-cross',
        sound: 'heavy_cross',
        colors: ['#3b82f6', '#fbbf24', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 3,
        id: 'shield',
        name: '正義守護聖盾',
        desc: '堅不可摧的正義光芒護壁',
        icon: '🛡️',
        scenario: '滿血過關獎勵・聖盾守護',
        vfxKey: 'princess_heart_shield',
        vfxSrc: 'assets/vfx/vfx_princess_heart_shield.webp',
        vfxFallback: 'assets/vfx/vfx_princess_heart_shield.png',
        anim: 'anim-heart',
        sound: 'shield',
        colors: ['#3b82f6', '#fbbf24', '#ffffff'],
        actionPose: 'char-cast'
      },
      {
        slot: 4,
        id: 'shockwave',
        name: '盾擊大地震盪波',
        desc: '重盾落地爆發裂地震波',
        icon: '💥',
        scenario: '大範圍破魔・震撼大地',
        vfxKey: 'hero_impact_shockwave',
        vfxSrc: 'assets/vfx/vfx_hero_impact_shockwave.webp',
        vfxFallback: 'assets/vfx/vfx_hero_impact_shockwave.png',
        anim: 'anim-shockwave',
        sound: 'impact',
        colors: ['#3b82f6', '#60a5fa', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 5,
        id: 'aurora',
        name: '破曉璀璨極光斬',
        desc: '天際拂曉破魔極光斬',
        icon: '🌈',
        scenario: '擊倒魔王・終極破曉',
        vfxKey: 'princess_rainbow_aurora',
        vfxSrc: 'assets/vfx/vfx_princess_rainbow_aurora.webp',
        vfxFallback: 'assets/vfx/vfx_princess_rainbow_aurora.png',
        anim: 'anim-aurora',
        sound: 'supernova',
        colors: ['#38bdf8', '#fbbf24', '#ffffff'],
        actionPose: 'char-slash'
      }
    ]
  },

  princess_star: {
    id: 'princess_star',
    name: '星空公主',
    type: 'magic',
    img: 'assets/characters/princess_star.webp',
    imgFallback: 'assets/characters/princess_star.png',
    themeColor: '#6366f1',
    skills: [
      {
        slot: 1,
        id: 'circle',
        name: '銀河星宿幾何陣',
        desc: '浩瀚星宿幾何旋轉陣',
        icon: '🌌',
        scenario: '星空關卡完美通關・星雲共鳴',
        vfxKey: 'magic_circle',
        vfxSrc: 'assets/vfx/vfx_magic_circle.webp',
        vfxFallback: 'assets/vfx/vfx_magic_circle.png',
        anim: 'anim-spin-circle',
        sound: 'magic_chime',
        colors: ['#6366f1', '#38bdf8', '#ffffff'],
        actionPose: 'char-cast'
      },
      {
        slot: 2,
        id: 'frost',
        name: '彗星冰塵星芒',
        desc: '彗星尾跡劃破夜空星塵',
        icon: '☄️',
        scenario: '極速解題加成・彗星奔馳',
        vfxKey: 'princess_frost_crystal',
        vfxSrc: 'assets/vfx/vfx_princess_frost_crystal.webp',
        vfxFallback: 'assets/vfx/vfx_princess_frost_crystal.png',
        anim: 'anim-frost',
        sound: 'ice',
        colors: ['#818cf8', '#c7d2fe', '#ffffff'],
        actionPose: 'char-cast'
      },
      {
        slot: 3,
        id: 'butterfly',
        name: '星光幻蝶夜曲',
        desc: '星光粒子凝結的光之彩蝶',
        icon: '✨',
        scenario: '靜謐專注通關・星夜漫舞',
        vfxKey: 'princess_butterfly',
        vfxSrc: 'assets/vfx/vfx_princess_butterfly.webp',
        vfxFallback: 'assets/vfx/vfx_princess_butterfly.png',
        anim: 'anim-butterfly',
        sound: 'butterfly',
        colors: ['#818cf8', '#e0e7ff', '#ffffff'],
        actionPose: 'char-cast'
      },
      {
        slot: 4,
        id: 'shield',
        name: '星環引力防護壁',
        desc: '星軌旋轉護盾抵禦攻擊',
        icon: '🪐',
        scenario: '星軌防護・引力護身',
        vfxKey: 'princess_heart_shield',
        vfxSrc: 'assets/vfx/vfx_princess_heart_shield.webp',
        vfxFallback: 'assets/vfx/vfx_princess_heart_shield.png',
        anim: 'anim-heart',
        sound: 'shield',
        colors: ['#6366f1', '#a855f7', '#ffffff'],
        actionPose: 'char-cast'
      },
      {
        slot: 5,
        id: 'aurora',
        name: '超新星引力星雲',
        desc: '星際極光大爆發',
        icon: '🌠',
        scenario: '大滿貫金盃達成・超新星引力',
        vfxKey: 'princess_rainbow_aurora',
        vfxSrc: 'assets/vfx/vfx_princess_rainbow_aurora.webp',
        vfxFallback: 'assets/vfx/vfx_princess_rainbow_aurora.png',
        anim: 'anim-aurora',
        sound: 'supernova',
        colors: ['#4f46e5', '#a855f7', '#38bdf8'],
        actionPose: 'char-cast'
      }
    ]
  },

  princess_nature: {
    id: 'princess_nature',
    name: '自然公主',
    type: 'magic',
    img: 'assets/characters/princess_nature.webp',
    imgFallback: 'assets/characters/princess_nature.png',
    themeColor: '#10b981',
    skills: [
      {
        slot: 1,
        id: 'butterfly',
        name: '翡翠仙子蝶舞',
        desc: '森林百花光粉與仙子蝴蝶',
        icon: '🌺',
        scenario: '自然學科通關・花語生輝',
        vfxKey: 'princess_butterfly',
        vfxSrc: 'assets/vfx/vfx_princess_butterfly.webp',
        vfxFallback: 'assets/vfx/vfx_princess_butterfly.png',
        anim: 'anim-butterfly',
        sound: 'butterfly',
        colors: ['#10b981', '#34d399', '#f472b6'],
        actionPose: 'char-cast'
      },
      {
        slot: 2,
        id: 'shield',
        name: '生命藤蔓守護環',
        desc: '綠意生機盎然的自然之盾',
        icon: '🌿',
        scenario: '滿血答對加成・綠藤庇護',
        vfxKey: 'princess_heart_shield',
        vfxSrc: 'assets/vfx/vfx_princess_heart_shield.webp',
        vfxFallback: 'assets/vfx/vfx_princess_heart_shield.png',
        anim: 'anim-heart',
        sound: 'shield',
        colors: ['#10b981', '#fbbf24', '#ffffff'],
        actionPose: 'char-cast'
      },
      {
        slot: 3,
        id: 'frost',
        name: '綠野晨露晶瑩冰芒',
        desc: '清晨露珠折射七彩微光',
        icon: '💧',
        scenario: '晨光連擊加成・晶瑩露珠',
        vfxKey: 'princess_frost_crystal',
        vfxSrc: 'assets/vfx/vfx_princess_frost_crystal.webp',
        vfxFallback: 'assets/vfx/vfx_princess_frost_crystal.png',
        anim: 'anim-frost',
        sound: 'ice',
        colors: ['#34d399', '#6ee7b7', '#ffffff'],
        actionPose: 'char-cast'
      },
      {
        slot: 4,
        id: 'circle',
        name: '大地古樹生命之陣',
        desc: '自然古樹神聖生機之環',
        icon: '🌱',
        scenario: '生命能量流轉・古樹祝福',
        vfxKey: 'magic_circle',
        vfxSrc: 'assets/vfx/vfx_magic_circle.webp',
        vfxFallback: 'assets/vfx/vfx_magic_circle.png',
        anim: 'anim-spin-circle',
        sound: 'magic_chime',
        colors: ['#10b981', '#fbbf24', '#ffffff'],
        actionPose: 'char-cast'
      },
      {
        slot: 5,
        id: 'aurora',
        name: '自然萬物極光大同',
        desc: '生機盎然的綠金極光波',
        icon: '🌈',
        scenario: '自然守護者晉升・萬象回春',
        vfxKey: 'princess_rainbow_aurora',
        vfxSrc: 'assets/vfx/vfx_princess_rainbow_aurora.webp',
        vfxFallback: 'assets/vfx/vfx_princess_rainbow_aurora.png',
        anim: 'anim-aurora',
        sound: 'supernova',
        colors: ['#10b981', '#fbbf24', '#38bdf8'],
        actionPose: 'char-cast'
      }
    ]
  },

  princess_mystery: {
    id: 'princess_mystery',
    name: '神秘公主',
    type: 'magic',
    img: 'assets/characters/princess_mystery.webp',
    imgFallback: 'assets/characters/princess_mystery.png',
    themeColor: '#8b5cf6',
    skills: [
      {
        slot: 1,
        id: 'circle',
        name: '古代符文秘術陣',
        desc: '紫晶符文法陣旋轉共鳴',
        icon: '🔮',
        scenario: '難題突破封印・奧術符文',
        vfxKey: 'magic_circle',
        vfxSrc: 'assets/vfx/vfx_magic_circle.webp',
        vfxFallback: 'assets/vfx/vfx_magic_circle.png',
        anim: 'anim-spin-circle',
        sound: 'magic_chime',
        colors: ['#8b5cf6', '#c084fc', '#ffffff'],
        actionPose: 'char-cast'
      },
      {
        slot: 2,
        id: 'frost',
        name: '水晶冰霜星核',
        desc: '水晶球凝結的秘術冰霜',
        icon: '💎',
        scenario: '深思連擊加成・紫晶星核',
        vfxKey: 'princess_frost_crystal',
        vfxSrc: 'assets/vfx/vfx_princess_frost_crystal.webp',
        vfxFallback: 'assets/vfx/vfx_princess_frost_crystal.png',
        anim: 'anim-frost',
        sound: 'ice',
        colors: ['#a855f7', '#e9d5ff', '#ffffff'],
        actionPose: 'char-cast'
      },
      {
        slot: 3,
        id: 'shield',
        name: '秘法心靈防護罩',
        desc: '紫曜守護水晶光幕',
        icon: '🛡️',
        scenario: '無損防護獎勵・心靈結界',
        vfxKey: 'princess_heart_shield',
        vfxSrc: 'assets/vfx/vfx_princess_heart_shield.webp',
        vfxFallback: 'assets/vfx/vfx_princess_heart_shield.png',
        anim: 'anim-heart',
        sound: 'shield',
        colors: ['#8b5cf6', '#f472b6', '#ffffff'],
        actionPose: 'char-cast'
      },
      {
        slot: 4,
        id: 'butterfly',
        name: '幽夢紫蝶漫舞',
        desc: '秘術幽光匯聚的靈蝶',
        icon: '🦋',
        scenario: '奧術凝結・幻夢破界',
        vfxKey: 'princess_butterfly',
        vfxSrc: 'assets/vfx/vfx_princess_butterfly.webp',
        vfxFallback: 'assets/vfx/vfx_princess_butterfly.png',
        anim: 'anim-butterfly',
        sound: 'butterfly',
        colors: ['#c084fc', '#a855f7', '#ffffff'],
        actionPose: 'char-cast'
      },
      {
        slot: 5,
        id: 'aurora',
        name: '奧術極光光譜',
        desc: '紫金奧術光華席捲戰場',
        icon: '🌌',
        scenario: '博古通今成就・紫金極光',
        vfxKey: 'princess_rainbow_aurora',
        vfxSrc: 'assets/vfx/vfx_princess_rainbow_aurora.webp',
        vfxFallback: 'assets/vfx/vfx_princess_rainbow_aurora.png',
        anim: 'anim-aurora',
        sound: 'supernova',
        colors: ['#8b5cf6', '#ec4899', '#38bdf8'],
        actionPose: 'char-cast'
      }
    ]
  },

  // ⚔️ 王子勇士系列
  prince_hero: {
    id: 'prince_hero',
    name: '傳奇勇者',
    type: 'slash',
    img: 'assets/characters/prince_hero.webp',
    imgFallback: 'assets/characters/prince_hero.png',
    themeColor: '#ef4444',
    skills: [
      {
        slot: 1,
        id: 'crescent',
        name: '破空月牙斬',
        desc: '藍白半月凌厲弧形風刃',
        icon: '🌙',
        scenario: '疾速秒答突破・凌厲月牙',
        vfxKey: 'crescent_wave',
        vfxSrc: 'assets/vfx/vfx_crescent_wave.webp',
        vfxFallback: 'assets/vfx/vfx_crescent_wave.png',
        anim: 'anim-crescent',
        sound: 'slash',
        colors: ['#38bdf8', '#ffffff', '#0284c7'],
        actionPose: 'char-slash'
      },
      {
        slot: 2,
        id: 'sword',
        name: '凌厲破風劍斬',
        desc: '疾速出鞘的湛藍銳利劍氣',
        icon: '🗡️',
        scenario: '初次出劍/快問快答・出鞘破風',
        vfxKey: 'sword_slash',
        vfxSrc: 'assets/vfx/vfx_sword_slash.webp',
        vfxFallback: 'assets/vfx/vfx_sword_slash.png',
        anim: 'anim-sword-slash',
        sound: 'slash',
        colors: ['#38bdf8', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 3,
        id: 'cross',
        name: '十字符文雙重斬',
        desc: '金藍交錯的巨型 X 破甲斬痕',
        icon: '❌',
        scenario: '雙倍暴擊加成・十字破甲',
        vfxKey: 'hero_cross_slash',
        vfxSrc: 'assets/vfx/vfx_hero_cross_slash.webp',
        vfxFallback: 'assets/vfx/vfx_hero_cross_slash.png',
        anim: 'anim-cross',
        sound: 'heavy_cross',
        colors: ['#0284c7', '#fbbf24', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 4,
        id: 'whirlwind',
        name: '旋風劍氣龍捲',
        desc: '拔地而起的藍白風刃龍捲',
        icon: '🌪️',
        scenario: '高連擊 (Combo Streak)・劍氣龍捲',
        vfxKey: 'hero_whirlwind',
        vfxSrc: 'assets/vfx/vfx_hero_whirlwind.webp',
        vfxFallback: 'assets/vfx/vfx_hero_whirlwind.png',
        anim: 'anim-whirlwind',
        sound: 'whirlwind',
        colors: ['#38bdf8', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 5,
        id: 'thrust',
        name: '雷霆突刺長槍光束',
        desc: '電漿撕裂空氣筆直貫穿',
        icon: '⚡',
        scenario: '擊倒魔王/宗師勳章・雷霆破空',
        vfxKey: 'hero_thunder_thrust',
        vfxSrc: 'assets/vfx/vfx_hero_thunder_thrust.webp',
        vfxFallback: 'assets/vfx/vfx_hero_thunder_thrust.png',
        anim: 'anim-thrust',
        sound: 'thunder',
        colors: ['#38bdf8', '#fbbf24', '#ffffff'],
        actionPose: 'char-slash'
      }
    ]
  },

  prince_knight: {
    id: 'prince_knight',
    name: '魔法騎士',
    type: 'slash',
    img: 'assets/characters/prince_knight.webp',
    imgFallback: 'assets/characters/prince_knight.png',
    themeColor: '#a855f7',
    skills: [
      {
        slot: 1,
        id: 'cross',
        name: '聖光審判大劍斬',
        desc: '神聖黃金十字破魔刃',
        icon: '🗡️',
        scenario: '聖光騎士破關・裁決破魔',
        vfxKey: 'hero_cross_slash',
        vfxSrc: 'assets/vfx/vfx_hero_cross_slash.webp',
        vfxFallback: 'assets/vfx/vfx_hero_cross_slash.png',
        anim: 'anim-cross',
        sound: 'heavy_cross',
        colors: ['#fbbf24', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 2,
        id: 'crescent',
        name: '聖光月牙弧刃',
        desc: '半月破法弧形斬痕',
        icon: '🌙',
        scenario: '秒速解圍・月痕聖光',
        vfxKey: 'crescent_wave',
        vfxSrc: 'assets/vfx/vfx_crescent_wave.webp',
        vfxFallback: 'assets/vfx/vfx_crescent_wave.png',
        anim: 'anim-crescent',
        sound: 'slash',
        colors: ['#fbbf24', '#ffffff', '#a855f7'],
        actionPose: 'char-slash'
      },
      {
        slot: 3,
        id: 'shockwave',
        name: '聖鎧撼地衝擊波',
        desc: '重鎧護體震飛周遭敵人',
        icon: '💥',
        scenario: '無損防禦加成・撼地重擊',
        vfxKey: 'hero_impact_shockwave',
        vfxSrc: 'assets/vfx/vfx_hero_impact_shockwave.webp',
        vfxFallback: 'assets/vfx/vfx_hero_impact_shockwave.png',
        anim: 'anim-shockwave',
        sound: 'impact',
        colors: ['#a855f7', '#fbbf24', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 4,
        id: 'whirlwind',
        name: '聖輝旋風光刃',
        desc: '聖劍迴旋捲起金色光暴',
        icon: '🌪️',
        scenario: '連擊激發・光輝迴旋',
        vfxKey: 'hero_whirlwind',
        vfxSrc: 'assets/vfx/vfx_hero_whirlwind.webp',
        vfxFallback: 'assets/vfx/vfx_hero_whirlwind.png',
        anim: 'anim-whirlwind',
        sound: 'whirlwind',
        colors: ['#fbbf24', '#a855f7', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 5,
        id: 'thrust',
        name: '神聖魔能突刺',
        desc: '魔力重劍穿透一擊',
        icon: '✨',
        scenario: '魔王連擊突破・神聖魔貫',
        vfxKey: 'hero_thunder_thrust',
        vfxSrc: 'assets/vfx/vfx_hero_thunder_thrust.webp',
        vfxFallback: 'assets/vfx/vfx_hero_thunder_thrust.png',
        anim: 'anim-thrust',
        sound: 'thunder',
        colors: ['#a855f7', '#fbbf24', '#ffffff'],
        actionPose: 'char-slash'
      }
    ]
  },

  prince_space: {
    id: 'prince_space',
    name: '宇宙探險家',
    type: 'slash',
    img: 'assets/characters/prince_space.webp',
    imgFallback: 'assets/characters/prince_space.png',
    themeColor: '#0ea5e9',
    skills: [
      {
        slot: 1,
        id: 'thrust',
        name: '離子雷射光束槍',
        desc: '高能電漿光束直擊目標',
        icon: '🔫',
        scenario: '星際題目突破・離子破甲',
        vfxKey: 'hero_thunder_thrust',
        vfxSrc: 'assets/vfx/vfx_hero_thunder_thrust.webp',
        vfxFallback: 'assets/vfx/vfx_hero_thunder_thrust.png',
        anim: 'anim-thrust',
        sound: 'thunder',
        colors: ['#0ea5e9', '#38bdf8', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 2,
        id: 'crescent',
        name: '光子切割月牙刃',
        desc: '星艦雷射折射弧光',
        icon: '💫',
        scenario: '星艦領航破關・光子弧光',
        vfxKey: 'crescent_wave',
        vfxSrc: 'assets/vfx/vfx_crescent_wave.webp',
        vfxFallback: 'assets/vfx/vfx_crescent_wave.png',
        anim: 'anim-crescent',
        sound: 'slash',
        colors: ['#38bdf8', '#67e8f9', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 3,
        id: 'whirlwind',
        name: '推進氣旋漩渦',
        desc: '噴氣背包超光速氣旋',
        icon: '🌀',
        scenario: '連續極速秒答・星際氣旋',
        vfxKey: 'hero_whirlwind',
        vfxSrc: 'assets/vfx/vfx_hero_whirlwind.webp',
        vfxFallback: 'assets/vfx/vfx_hero_whirlwind.png',
        anim: 'anim-whirlwind',
        sound: 'whirlwind',
        colors: ['#0ea5e9', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 4,
        id: 'shockwave',
        name: '微型重力震爆彈',
        desc: '重力反衝波四散炸裂',
        icon: '🚀',
        scenario: '噴射加速通關・重力引爆',
        vfxKey: 'hero_impact_shockwave',
        vfxSrc: 'assets/vfx/vfx_hero_impact_shockwave.webp',
        vfxFallback: 'assets/vfx/vfx_hero_impact_shockwave.png',
        anim: 'anim-shockwave',
        sound: 'impact',
        colors: ['#0ea5e9', '#fbbf24'],
        actionPose: 'char-slash'
      },
      {
        slot: 5,
        id: 'cross',
        name: '星際軌道切割十字',
        desc: '高空軌道雷射雙重交叉打擊',
        icon: '🛰️',
        scenario: '終極星艦打擊・衛星校準',
        vfxKey: 'hero_cross_slash',
        vfxSrc: 'assets/vfx/vfx_hero_cross_slash.webp',
        vfxFallback: 'assets/vfx/vfx_hero_cross_slash.png',
        anim: 'anim-cross',
        sound: 'heavy_cross',
        colors: ['#0ea5e9', '#38bdf8', '#ffffff'],
        actionPose: 'char-slash'
      }
    ]
  },

  prince_forest: {
    id: 'prince_forest',
    name: '森林守護者',
    type: 'slash',
    img: 'assets/characters/prince_forest.webp',
    imgFallback: 'assets/characters/prince_forest.png',
    themeColor: '#15803d',
    skills: [
      {
        slot: 1,
        id: 'thrust',
        name: '精靈穿雲疾風箭',
        desc: '神準穿透的綠意風之長箭',
        icon: '🏹',
        scenario: '神準解題突破・穿雲貫石',
        vfxKey: 'hero_thunder_thrust',
        vfxSrc: 'assets/vfx/vfx_hero_thunder_thrust.webp',
        vfxFallback: 'assets/vfx/vfx_hero_thunder_thrust.png',
        anim: 'anim-thrust',
        sound: 'thunder',
        colors: ['#15803d', '#22c55e', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 2,
        id: 'crescent',
        name: '靈犀疾風弧刃',
        desc: '綠野清風劃出的弧線刃',
        icon: '🍃',
        scenario: '心靜如水通關・清風拂面',
        vfxKey: 'crescent_wave',
        vfxSrc: 'assets/vfx/vfx_crescent_wave.webp',
        vfxFallback: 'assets/vfx/vfx_crescent_wave.png',
        anim: 'anim-crescent',
        sound: 'slash',
        colors: ['#22c55e', '#ffffff', '#86efac'],
        actionPose: 'char-slash'
      },
      {
        slot: 3,
        id: 'whirlwind',
        name: '自然旋風狂舞',
        desc: '召喚森林守護風暴龍捲',
        icon: '🌪️',
        scenario: '連擊狂風加成・林海呼嘯',
        vfxKey: 'hero_whirlwind',
        vfxSrc: 'assets/vfx/vfx_hero_whirlwind.webp',
        vfxFallback: 'assets/vfx/vfx_hero_whirlwind.png',
        anim: 'anim-whirlwind',
        sound: 'whirlwind',
        colors: ['#22c55e', '#86efac', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 4,
        id: 'shockwave',
        name: '大地古樹崩裂波',
        desc: '古樹之靈震顫地面',
        icon: '🌿',
        scenario: '林海守護加成・大地共振',
        vfxKey: 'hero_impact_shockwave',
        vfxSrc: 'assets/vfx/vfx_hero_impact_shockwave.webp',
        vfxFallback: 'assets/vfx/vfx_hero_impact_shockwave.png',
        anim: 'anim-shockwave',
        sound: 'impact',
        colors: ['#15803d', '#fbbf24', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 5,
        id: 'cross',
        name: '守護者藤木十字斬',
        desc: '翡翠木靈能量交叉破魔',
        icon: '⚔️',
        scenario: '終極守護裁決・森之誓約',
        vfxKey: 'hero_cross_slash',
        vfxSrc: 'assets/vfx/vfx_hero_cross_slash.webp',
        vfxFallback: 'assets/vfx/vfx_hero_cross_slash.png',
        anim: 'anim-cross',
        sound: 'heavy_cross',
        colors: ['#15803d', '#22c55e', '#ffffff'],
        actionPose: 'char-slash'
      }
    ]
  },

  prince_science: {
    id: 'prince_science',
    name: '科學魔法師',
    type: 'slash',
    img: 'assets/characters/prince_science.webp',
    imgFallback: 'assets/characters/prince_science.png',
    themeColor: '#eab308',
    skills: [
      {
        slot: 1,
        id: 'thrust',
        name: '特斯拉雷霆光束',
        desc: '百萬伏特高壓電弧電漿穿刺',
        icon: '⚡',
        scenario: '靈光一閃突破・高壓放電',
        vfxKey: 'hero_thunder_thrust',
        vfxSrc: 'assets/vfx/vfx_hero_thunder_thrust.webp',
        vfxFallback: 'assets/vfx/vfx_hero_thunder_thrust.png',
        anim: 'anim-thrust',
        sound: 'thunder',
        colors: ['#eab308', '#fbbf24', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 2,
        id: 'cross',
        name: '能量光刃裂解十字',
        desc: '雷射分析儀裂解切割十字',
        icon: '🔬',
        scenario: '雙重實驗暴擊・裂解光刃',
        vfxKey: 'hero_cross_slash',
        vfxSrc: 'assets/vfx/vfx_hero_cross_slash.webp',
        vfxFallback: 'assets/vfx/vfx_hero_cross_slash.png',
        anim: 'anim-cross',
        sound: 'heavy_cross',
        colors: ['#eab308', '#38bdf8', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 3,
        id: 'whirlwind',
        name: '磁暴渦流漩渦',
        desc: '強力磁場拘束旋渦',
        icon: '🧲',
        scenario: '連續公式突破・電磁渦流',
        vfxKey: 'hero_whirlwind',
        vfxSrc: 'assets/vfx/vfx_hero_whirlwind.webp',
        vfxFallback: 'assets/vfx/vfx_hero_whirlwind.png',
        anim: 'anim-whirlwind',
        sound: 'whirlwind',
        colors: ['#eab308', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 4,
        id: 'shockwave',
        name: '齒輪動力共振衝擊',
        desc: '機械齒輪超載共振波',
        icon: '⚙️',
        scenario: '邏輯分析完美解・超載共振',
        vfxKey: 'hero_impact_shockwave',
        vfxSrc: 'assets/vfx/vfx_hero_impact_shockwave.webp',
        vfxFallback: 'assets/vfx/vfx_hero_impact_shockwave.png',
        anim: 'anim-shockwave',
        sound: 'impact',
        colors: ['#eab308', '#f97316', '#ffffff'],
        actionPose: 'char-slash'
      },
      {
        slot: 5,
        id: 'crescent',
        name: '高頻粒子切割月牙',
        desc: '超導體高頻振盪粒子弧刃',
        icon: '🌙',
        scenario: '破界科研奧義・粒子共振',
        vfxKey: 'crescent_wave',
        vfxSrc: 'assets/vfx/vfx_crescent_wave.webp',
        vfxFallback: 'assets/vfx/vfx_crescent_wave.png',
        anim: 'anim-crescent',
        sound: 'slash',
        colors: ['#eab308', '#38bdf8', '#ffffff'],
        actionPose: 'char-slash'
      }
    ]
  }
};

/**
 * 依角色 ID 取得角色技能清單 (平滑降級預設為魔法公主)
 */
export function getSkillsForCharacter(charId) {
  const role = ROLE_SKILLS[charId] || ROLE_SKILLS.princess_magic;
  return role.skills;
}

/**
 * 依技能插槽編號 (1~5) 取得特定技能
 */
export function getSkillBySlot(charId, slotIndex = 1) {
  const skills = getSkillsForCharacter(charId);
  return skills.find(s => s.slot === slotIndex) || skills[0];
}

/**
 * 取得角色過關結算必殺技 (Finisher Skill)
 * 魔法公主等預設為 slot 1 (旋轉魔法陣)，傳奇勇者/勇者公主預設為 slot 1 (月牙斬)
 */
export function getVictoryFinisherSkill(charOrId) {
  const id = typeof charOrId === 'string'
    ? charOrId
    : (charOrId && charOrId.id ? charOrId.id : (charOrId && charOrId.characterId ? charOrId.characterId : 'princess_magic'));
  return getSkillBySlot(id, 1);
}

// ── Web Audio 純代碼原生音效合成系統 (零外部依賴・平滑降級) ──
let _actionAudioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtxClass) return null;
  if (!_actionAudioCtx) {
    try {
      _actionAudioCtx = new AudioCtxClass();
    } catch {
      return null;
    }
  }
  if (_actionAudioCtx.state === 'suspended') {
    _actionAudioCtx.resume().catch(() => {});
  }
  return _actionAudioCtx;
}

function playTone(ctx, freq, type, dur, vol = 0.35, timeOffset = 0) {
  try {
    const now = ctx.currentTime + timeOffset;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  } catch {}
}

function playNoise(ctx, dur, fStart, fEnd, vol = 0.35) {
  try {
    const now = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const n = ctx.createBufferSource();
    n.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(fStart, now);
    f.frequency.exponentialRampToValueAtTime(fEnd, now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    n.connect(f);
    f.connect(g);
    g.connect(ctx.destination);
    n.start(now);
  } catch {}
}

/**
 * 播放技能專屬原生合成音效
 */
export function playSkillSound(soundType) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (soundType === 'magic_chime') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(ctx, f, 'sine', 0.5, 0.25, i * 0.08));
    } else if (soundType === 'butterfly') {
      [659.25, 880, 1174.66, 1318.5].forEach((f, i) => playTone(ctx, f, 'triangle', 0.45, 0.2, i * 0.07));
    } else if (soundType === 'ice') {
      [1200, 1500, 1800, 2200].forEach((f, i) => playTone(ctx, f, 'sine', 0.35, 0.18, i * 0.05));
    } else if (soundType === 'shield') {
      playTone(ctx, 329.63, 'sine', 0.8, 0.4);
      playTone(ctx, 659.25, 'sine', 0.7, 0.3, 0.1);
    } else if (soundType === 'supernova') {
      playNoise(ctx, 0.9, 1500, 150, 0.4);
      [440, 554, 659, 880, 1108].forEach((f, i) => playTone(ctx, f, 'triangle', 0.8, 0.22, i * 0.06));
    } else if (soundType === 'slash') {
      playNoise(ctx, 0.28, 2800, 350, 0.5);
    } else if (soundType === 'heavy_cross') {
      playNoise(ctx, 0.35, 2400, 200, 0.5);
      playTone(ctx, 180, 'sawtooth', 0.25, 0.3, 0.05);
    } else if (soundType === 'whirlwind') {
      playNoise(ctx, 0.65, 900, 400, 0.4);
    } else if (soundType === 'impact') {
      playNoise(ctx, 0.55, 600, 60, 0.6);
      playTone(ctx, 80, 'sawtooth', 0.4, 0.5);
    } else if (soundType === 'thunder') {
      playNoise(ctx, 0.4, 3200, 150, 0.55);
      playTone(ctx, 140, 'square', 0.3, 0.35);
    }
  } catch {}
}

/**
 * 粒子發射引擎 (平滑降級與自動清理)
 */
export function spawnActionParticles(container, colors = ['#fbbf24', '#f472b6', '#ffffff'], count = 35) {
  if (!container || typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.className = 'action-particle-canvas';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;';
  container.appendChild(canvas);

  const rect = container.getBoundingClientRect();
  canvas.width = Math.max(280, rect.width || 320);
  canvas.height = Math.max(200, rect.height || 240);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    try { canvas.remove(); } catch {}
    return;
  }

  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 60,
      y: canvas.height / 2 + (Math.random() - 0.5) * 50,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.7) * 11,
      size: Math.random() * 5 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rot: Math.random() * 360,
      vrot: (Math.random() - 0.5) * 12
    });
  }

  let animId = null;
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      if (p.alpha > 0.02) {
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.26;
        p.alpha *= 0.94;
        p.rot += p.vrot;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (alive) {
      animId = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      try {
        if (animId) cancelAnimationFrame(animId);
        canvas.remove();
      } catch {}
    }
  }

  render();

  // 保底清理定時器 (1.8s 後強制清理 Canvas，絕不洩漏記憶體)
  setTimeout(() => {
    try {
      if (animId) cancelAnimationFrame(animId);
      if (canvas.parentNode) canvas.remove();
    } catch {}
  }, 1800);
}

/**
 * 建立過關結算小勇士動效舞台 HTML Markup
 */
// 終結大招動態資產註冊表 (供未來自定義全動態圖資無縫掛載)
export const FINISHER_ANIMATION_REGISTRY = {
  // 範例格式: 'princess_magic_vs_mob_math_slime': 'assets/animations/finisher_princess_slime.webp',
};

export function getFinisherAnimation(characterId, monsterId) {
  if (!characterId) return null;
  const specificKey = monsterId ? `${characterId}_vs_${monsterId}` : null;
  if (specificKey && FINISHER_ANIMATION_REGISTRY[specificKey]) {
    return FINISHER_ANIMATION_REGISTRY[specificKey];
  }
  return FINISHER_ANIMATION_REGISTRY[characterId] || null;
}

export function registerFinisherAnimation(characterId, monsterId, assetUrl) {
  const key = monsterId ? `${characterId}_vs_${monsterId}` : characterId;
  FINISHER_ANIMATION_REGISTRY[key] = assetUrl;
}

/**
 * 建立過關結算小勇士動效舞台 HTML Markup (支援打敗怪獸對決與自定義動態插槽)
 */
export function renderHeroActionStageMarkup(character, skill, monster = null) {
  const role = ROLE_SKILLS[character?.id] || ROLE_SKILLS.princess_magic;
  const activeSkill = skill || getVictoryFinisherSkill(character?.id);
  const charSrc = role.img;
  const charFallback = role.imgFallback || 'assets/characters/princess_magic.png';
  const vfxSrc = activeSkill.vfxSrc;
  const vfxFallback = activeSkill.vfxFallback || 'assets/vfx/vfx_magic_circle.png';

  // 檢查是否已掛載專屬終結全動態圖資
  const customFinisher = getFinisherAnimation(character?.id, monster?.id);
  if (customFinisher) {
    return `
      <div class="result-hero-action-stage is-custom-finisher" id="result-hero-action-stage" aria-label="通關終極對決奧義">
        <img src="${customFinisher}" class="result-hero-dynamic-finisher" alt="${role.name} 打倒 ${monster?.name || '怪獸'}" />
        <div class="result-hero-skill-banner" id="result-hero-skill-banner">
          <span class="skill-banner-icon">${activeSkill.icon}</span>
          <span class="skill-banner-text"><strong>${role.name}</strong> 終極必殺擊破！</span>
        </div>
      </div>
    `;
  }

  // 預設即時渲染英雄攻擊與怪獸受擊退場之對決舞台
  const monsterImg = monster?.image || '';
  const monsterMarkup = monsterImg ? `
    <div class="result-hero-vs-monster">
      <img src="${monsterImg}" class="result-monster-victim" onerror="this.style.display='none'" alt="${monster?.name || '守護怪獸'}" />
      <span class="victim-defeat-tag">DEFEATED</span>
    </div>
  ` : '';

  return `
    <div class="result-hero-action-stage" id="result-hero-action-stage" aria-label="通關角色專屬奧義">
      <!-- 技能發射專屬發光圖層 (零殘留透明去背) -->
      <img src="${vfxSrc}" class="result-hero-vfx ${activeSkill.anim}" id="result-hero-vfx" onerror="this.onerror=null;this.src='${vfxFallback}'" alt="${activeSkill.name}" />
      <!-- 小勇士動作立繪 -->
      <img src="${charSrc}" class="result-hero-sprite ${activeSkill.actionPose}" id="result-hero-sprite" onerror="this.onerror=null;this.src='${charFallback}'" alt="${role.name}" />
      ${monsterMarkup}
      <!-- 技能名稱橫幅徽章 -->
      <div class="result-hero-skill-banner" id="result-hero-skill-banner">
        <span class="skill-banner-icon">${activeSkill.icon}</span>
        <span class="skill-banner-text"><strong>${role.name}</strong> 施展【<strong>${activeSkill.name}</strong>】破關！</span>
      </div>
    </div>
  `;
}

/**
 * 實時觸發關卡結算小勇士過關必殺技動效
 * 整合公主旋轉魔法陣、勇者月牙斬、原生 Web Audio 音效與微粒子爆發
 */
export function triggerCharacterVictoryAction(container, options = {}) {
  if (!container || typeof document === 'undefined') return;

  const character = options.character || { id: 'princess_magic' };
  const role = ROLE_SKILLS[character.id] || ROLE_SKILLS.princess_magic;
  const skill = options.skill || getVictoryFinisherSkill(character.id);

  // 1. 播放技能音效
  playSkillSound(skill.sound);

  // 2. 獲取或綁定舞台元素
  const stageEl = container.querySelector('#result-hero-action-stage');
  const spriteEl = container.querySelector('#result-hero-sprite');
  const vfxEl = container.querySelector('#result-hero-vfx');

  if (stageEl) {
    // 3. 爆發專屬彩色粒子
    spawnActionParticles(stageEl, skill.colors, 36);
  }

  if (vfxEl) {
    // 重置動畫觸發
    vfxEl.className = 'result-hero-vfx';
    void vfxEl.offsetWidth;
    vfxEl.className = `result-hero-vfx ${skill.anim}`;
  }

  if (spriteEl) {
    spriteEl.className = `result-hero-sprite ${skill.actionPose}`;
    // 1.1s 後優雅平滑過渡回榮耀勝利站姿
    setTimeout(() => {
      try {
        if (spriteEl) {
          spriteEl.className = 'result-hero-sprite char-victory-heroic';
        }
      } catch {}
    }, 1100);
  }
}


/**
 * 每題答對：實時觸發小勇士滿版奧義攻擊怪獸 (Full-screen Hero Strike)
 */
export function triggerCombatAttackEffect(options = {}) {
  if (typeof document === 'undefined') return;
  const character = options.character || { id: 'princess_magic' };
  const role = ROLE_SKILLS[character.id] || ROLE_SKILLS.princess_magic;
  const skill = options.skill || getSkillBySlot(character.id, 1);
  const container = options.container || document.getElementById('screen-level') || document.body;

  // 1. 原生音效
  playSkillSound(skill.sound);

  // 2. 清理先前存在的戰鬥特效層
  const prev = container.querySelector('.combat-action-overlay');
  if (prev) prev.remove();

  // 3. 建立滿版戰鬥圖層 (pointer-events: none 絕不阻擋點擊)
  const overlay = document.createElement('div');
  overlay.className = 'combat-action-overlay is-hero-attack';
  overlay.innerHTML = `
    <!-- 小勇士滿版攻擊立繪投影 -->
    <img src="${role.img}" class="combat-hero-attacker ${skill.actionPose}" onerror="this.onerror=null;this.src='${role.imgFallback}'" alt="${role.name}" />
    <!-- 滿版英雄震撼技能特效 (透明遮罩去邊框) -->
    <img src="${skill.vfxSrc}" class="combat-vfx-strike ${skill.anim}" onerror="this.onerror=null;this.src='${skill.vfxFallback}'" alt="${skill.name}" />
    <!-- 戰鬥吶喊浮動條 -->
    <div class="combat-shout-banner">
      <span class="combat-shout-icon">${skill.icon}</span>
      <span class="combat-shout-text"><strong>${role.name}</strong> 施展【<strong>${skill.name}</strong>】！</span>
    </div>
  `;
  container.appendChild(overlay);

  // 4. 爆發技能粒子
  spawnActionParticles(overlay, skill.colors, 28);

  // 5. 750ms 後自動安全淡出清理
  setTimeout(() => {
    try {
      if (overlay.parentNode) {
        overlay.classList.add('combat-fade-out');
        setTimeout(() => overlay.remove(), 180);
      }
    } catch {}
  }, 750);
}

/**
 * 每題答錯：實時觸發小怪獸滿版前撲反擊 (Full-screen Monster Counter-Attack)
 */
export function triggerCombatCounterAttackEffect(options = {}) {
  if (typeof document === 'undefined') return;
  const monster = options.monster || { name: '調皮小怪', image: 'assets/monsters/mob_math_slime.png' };
  const container = options.container || document.getElementById('screen-level') || document.body;

  // 1. 判斷怪獸位階決定反擊圖資與動畫
  const isDarkon = Boolean(monster.isDarkon);
  const isBoss = Boolean(monster.isBoss || isDarkon);
  const vfxSrc = isBoss
    ? 'assets/vfx/vfx_boss_claw_strike.webp'
    : 'assets/vfx/vfx_mob_slime_splat.webp';
  const vfxFallback = isBoss
    ? 'assets/vfx/vfx_boss_claw_strike.png'
    : 'assets/vfx/vfx_mob_slime_splat.png';
  const vfxAnim = isBoss ? 'anim-claw-strike' : 'anim-slime-splat';
  const colors = isBoss
    ? ['#ef4444', '#7c3aed', '#000000', '#fbbf24']
    : ['#10b981', '#34d399', '#059669', '#ffffff'];

  // 2. 原生音效合成 (重擊低頻與噪聲衝擊)
  const ctx = getAudioContext();
  if (ctx) {
    if (isBoss) {
      playNoise(ctx, 0.55, 900, 70, 0.6);
      playTone(ctx, 65, 'sawtooth', 0.45, 0.4);
    } else {
      playNoise(ctx, 0.35, 350, 80, 0.45);
      playTone(ctx, 110, 'triangle', 0.25, 0.35);
    }
  }

  // 3. 全屏微震顫
  const levelView = container.querySelector('.level-view') || container;
  if (levelView) {
    levelView.classList.remove('shake-light', 'shake-heavy');
    void levelView.offsetWidth;
    levelView.classList.add(isBoss ? 'shake-heavy' : 'shake-light');
    setTimeout(() => {
      try { levelView.classList.remove('shake-light', 'shake-heavy'); } catch {}
    }, 600);
  }

  // 4. 清理先前存在的戰鬥特效層
  const prev = container.querySelector('.combat-action-overlay');
  if (prev) prev.remove();

  // 5. 建立滿版怪獸反擊圖層
  const overlay = document.createElement('div');
  overlay.className = 'combat-action-overlay is-monster-counter';
  overlay.innerHTML = `
    <!-- 小怪物前撲衝撞立繪 -->
    <img src="${monster.image}" class="combat-monster-counter" onerror="this.onerror=null;this.src='assets/monsters/mob_math_slime.png'" alt="${monster.name}" />
    <!-- 滿版怪獸反擊特效 (黏液糊臉/暗黑爪擊) -->
    <img src="${vfxSrc}" class="combat-vfx-strike ${vfxAnim}" onerror="this.onerror=null;this.src='${vfxFallback}'" alt="怪獸反擊" />
    <!-- 怪獸反擊橫幅 -->
    <div class="combat-shout-banner is-monster">
      <span class="combat-shout-icon">⚠️</span>
      <span class="combat-shout-text"><strong>${monster.name}</strong> 發動強力撲擊！</span>
    </div>
  `;
  container.appendChild(overlay);

  // 6. 爆發反擊黏液粒子
  spawnActionParticles(overlay, colors, 26);

  // 7. 780ms 後自動安全清理
  setTimeout(() => {
    try {
      if (overlay.parentNode) {
        overlay.classList.add('combat-fade-out');
        setTimeout(() => overlay.remove(), 180);
      }
    } catch {}
  }, 780);
}
