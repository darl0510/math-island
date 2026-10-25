/* 奇幻自然科學島・小一關卡表（4 島 × 4 關）：題庫由 data/question-bank-science-g1.json 提供，
   本檔只負責島嶼與關卡的標題、技能與中文 intro（語音由 zh-TW 引擎讀出）。 */

export const science_g1_islands = [
  {
    id: 1,
    name: '綠意植物島',
    emoji: '🌱',
    theme: 'forest',
    color: '#10b981',
    blurb: '校園植物尋寶、認識葉片形狀、植物身體構造與種子發芽的秘密。',
    levels: [
      {
        id: 1,
        island: 1,
        title: '校園植物大尋寶',
        emoji: '🌿',
        skill: '植物觀察與生活環境',
        intro: '走進校園花圃，找找看不同的植物，看看它們長在哪裡！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 2,
        island: 1,
        title: '葉子的秘密形狀',
        emoji: '🍃',
        skill: '葉片形狀與葉脈觀察',
        intro: '每片葉子都有不同的形狀和邊緣，用眼睛仔細看一看！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 3,
        island: 1,
        title: '植物的身體構造',
        emoji: '🌸',
        skill: '根、莖、葉、花、果實',
        intro: '植物跟我們一樣有身體各個部位，有根、莖、葉、花和果實！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 4,
        island: 1,
        title: '種子發芽長大了',
        emoji: '🌱',
        skill: '種子發芽與生長要素',
        intro: '種子喝了水、照到陽光，就會慢慢發芽長出綠葉喔！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 2,
    name: '奇趣動物島',
    emoji: '🦋',
    theme: 'ocean',
    color: '#06b6d4',
    blurb: '校園小動物的特徵、運動方式、動物的家與用五官探索大自然。',
    levels: [
      {
        id: 5,
        island: 2,
        title: '校園小動物在哪裡',
        emoji: '🐌',
        skill: '常見校園動物與昆蟲',
        intro: '在操場、草地上，有哪些可愛的昆蟲和小動物正在活動呢？',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 6,
        island: 2,
        title: '動一動：動物的運動',
        emoji: '🐸',
        skill: '動物運動方式（飛/跳/爬/游）',
        intro: '小鳥在天空飛、青蛙在地上跳、魚兒在水裡游，動物各有各的本領！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 7,
        island: 2,
        title: '動物的家與食物',
        emoji: '🐜',
        skill: '動物棲息地與食物',
        intro: '螞蟻住在泥土裡，松鼠吃堅果種子，動物的家和食物都好有趣！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 8,
        island: 2,
        title: '五官探索大自然',
        emoji: '👀',
        skill: '感官探索（眼看/耳聽/鼻聞/手摸）',
        intro: '用眼睛看顏色、用耳朵聽鳥叫、用鼻子聞花香，我們都是自然小偵探！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 3,
    name: '光影與氣象島',
    emoji: '☀️',
    theme: 'cloud',
    color: '#f59e0b',
    blurb: '太陽與影子的捉迷藏、雨滴與彩虹、風的吹動與四季天氣感受。',
    levels: [
      {
        id: 9,
        island: 3,
        title: '太陽與影子捉迷藏',
        emoji: '☀️',
        skill: '光與影子（光源、方向、長短）',
        intro: '有光的地方就有影子，太陽在你的後面，你的影子會跑到哪裡呢？',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 10,
        island: 3,
        title: '晴天、陰天與雨天',
        emoji: '🌧️',
        skill: '常見天氣現象與生活應對',
        intro: '下雨了要帶傘，出大太陽要防曬，不同天氣有不同的特色！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 11,
        island: 3,
        title: '風在哪裡吹呀吹',
        emoji: '💨',
        skill: '風的感受與空氣流動',
        intro: '看風車轉動、看樹葉搖晃，雖然看不到風，但我們能感受它的吹動！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 12,
        island: 3,
        title: '四季變化與氣溫',
        emoji: '🍂',
        skill: '春夏秋冬四季感受',
        intro: '春天百花齊放、夏天炎熱蟬鳴、秋天落葉吹起、冬天寒風吹來！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 4,
    name: '科學探索魔王殿',
    emoji: '🧲',
    theme: 'space',
    color: '#8b5cf6',
    blurb: '神奇磁鐵吸一吸、水中的浮與沉、聲音敲一敲與自然科學素養大挑戰！',
    levels: [
      {
        id: 13,
        island: 4,
        title: '神奇磁鐵吸一吸',
        emoji: '🧲',
        skill: '磁鐵特性（吸引鐵製品、兩極相斥相吸）',
        intro: '磁鐵有神奇的魔法！它能吸住鐵釘鐵夾，兩極靠近時還會相吸相斥喔！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 14,
        island: 4,
        title: '水中的浮與沉',
        emoji: '⛵',
        skill: '浮力現象與沉浮實驗',
        intro: '哪些東西會浮在水面上？哪些東西會沉到水底呢？動腦猜一猜！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 15,
        island: 4,
        title: '聲音的秘密與震動',
        emoji: '🔔',
        skill: '聲音產生與物體震動',
        intro: '摸摸喉嚨說說話，感受到震動了嗎？所有聲音都是由震動發出的喔！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 16,
        island: 4,
        title: '小小科學家總魔王',
        emoji: '👑',
        skill: '自然科學素養大會考',
        intro: '結合動植物、天氣、磁鐵與沉浮的自然科學全方位生活大挑戰！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  }
];
