/* 奇幻自然科學島・小二關卡表（4 島 × 4 關）：題庫由 data/question-bank-science-g2.json 提供，
   本檔只負責島嶼與關卡的標題、技能與中文 intro（語音由 zh-TW 引擎讀出）。 */

export const science_g2_islands = [
  {
    id: 1,
    name: '氣象與水變化島',
    emoji: '🌦️',
    theme: 'cloud',
    color: '#0ea5e9',
    blurb: '認識天氣與雲朵、水的三態奇幻旅程、風吹草動的秘密與四季輪轉的節奏。',
    levels: [
      {
        id: 1,
        island: 1,
        title: '認識天氣與雲朵',
        emoji: '☁️',
        skill: '天氣觀察與氣溫計',
        intro: '抬頭看看天空中的雲朵與氣溫變化，學習記錄每天的天氣狀態！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 2,
        island: 1,
        title: '水的三態奇幻旅程',
        emoji: '🧊',
        skill: '冰、水、水蒸氣與蒸發凝結',
        intro: '水會結成冰塊，也會變成看不見的水蒸氣，一起探索水的神奇變身！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 3,
        island: 1,
        title: '風吹草動的秘密',
        emoji: '🌬️',
        skill: '風向、風力與空氣流動',
        intro: '風是流動的空氣，可以吹動風車與旗幟，還能用來綠色發電喔！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 4,
        island: 1,
        title: '四季輪轉的節奏',
        emoji: '🍂',
        skill: '春夏秋冬季節特徵與生物適應',
        intro: '春夏秋冬四季交替，大自然的植物和動物都有奇妙的應變之道！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 2,
    name: '小小生態探險島',
    emoji: '🦋',
    theme: 'forest',
    color: '#10b981',
    blurb: '昆蟲身體構造、毛毛蟲完全變態變蝴蝶、植物花果種子與動物隱身偽裝。',
    levels: [
      {
        id: 5,
        island: 2,
        title: '菜園與花叢小昆蟲',
        emoji: '🐞',
        skill: '昆蟲頭胸腹與六隻腳特徵',
        intro: '走進花叢菜園，觀察蜜蜂、瓢蟲與螞蟻，找找看昆蟲的身體特徵！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 6,
        island: 2,
        title: '毛毛蟲變蝴蝶',
        emoji: '🐛',
        skill: '卵、幼蟲、蛹、成蟲完全變態',
        intro: '毛毛蟲經過蛻皮、結蛹，最後羽化破蛹變成美麗的蝴蝶！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 7,
        island: 2,
        title: '植物開花與結種子',
        emoji: '🌸',
        skill: '花朵傳粉、果實與種子傳播',
        intro: '花朵授粉後結出果實與種子，蒲公英與鬼針草是怎麼旅行傳播的呢？',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 8,
        island: 2,
        title: '動物的隱身偽裝',
        emoji: '🦎',
        skill: '保護色、擬態與警戒色',
        intro: '竹節蟲像樹枝、枯葉蝶像枯葉，看看動物們如何用保護色融入大自然！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 3,
    name: '生活物理實驗島',
    emoji: '🔍',
    theme: 'ocean',
    color: '#3b82f6',
    blurb: '太陽與影子的方位、聲音的高低大小、推拉力與摩擦力、磁鐵同異極。',
    levels: [
      {
        id: 9,
        island: 3,
        title: '太陽與影子的方位',
        emoji: '☀️',
        skill: '光源、影子方向與長短變化',
        intro: '太陽東升西落，影子方向永遠在反方向，正午時影子最短喔！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 10,
        island: 3,
        title: '聲音的高低與大小',
        emoji: '🎵',
        skill: '物體震動、音量與音調',
        intro: '敲一敲、彈一彈，震動越快音調越高，震動幅度越大聲音越響亮！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 11,
        island: 3,
        title: '推一推拉一拉',
        emoji: '🫸',
        skill: '推力、拉力、形變與摩擦力',
        intro: '施力可以改變物體形狀與運動，鞋底刻紋與輪子能靈活調節摩擦力！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 12,
        island: 3,
        title: '神奇磁鐵同極與異極',
        emoji: '🧲',
        skill: '磁極、同極相斥異極相吸、指南針',
        intro: '磁鐵有N極與S極，同極相斥、異極相吸，還能隔空吸引鐵製品！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 4,
    name: '地球守護科學殿',
    emoji: '🌍',
    theme: 'space',
    color: '#8b5cf6',
    blurb: '生活材料特性比一比、沉浮實驗中空原理、節能減碳綠生活與榮譽總試煉。',
    levels: [
      {
        id: 13,
        island: 4,
        title: '物體材料比一比',
        emoji: '🪵',
        skill: '玻璃、金屬、塑膠、紙張特性',
        intro: '透明玻璃、導熱金屬、彈性橡皮筋，每種材料都有獨特的神奇本領！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 14,
        island: 4,
        title: '沉下去還是浮上來',
        emoji: '🚢',
        skill: '物體浮沉、中空排開水量與浮力',
        intro: '實心鐵塊會沉底，捏成中空大船就能浮在水面上，這就是浮力的奧妙！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 15,
        island: 4,
        title: '愛護地球綠生活',
        emoji: '♻️',
        skill: '資源回收、省水省電、減塑愛海洋',
        intro: '珍惜食物、做好垃圾分類、減塑自備環保袋，一起做地球的守護小天使！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 16,
        island: 4,
        title: '小二自然榮譽大試煉',
        emoji: '👑',
        skill: '小二自然綜合科學素養挑戰',
        intro: '迎接小二自然科學島最高榮譽試煉，展現你滿滿的好奇心與科學精神！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  }
];
