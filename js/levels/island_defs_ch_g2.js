/* 奇幻國語島・小二關卡表（4 島 × 4 關）：題庫由 data/question-bank-ch-g2.json 提供，
   本檔只負責島嶼與關卡的標題、技能與中文 intro（語音由 zh-TW 引擎讀出）。 */

export const ch_g2_islands = [
  {
    id: 1,
    name: '筆順精進島',
    emoji: '🌲',
    theme: 'forest',
    color: '#3fae6a',
    blurb: '進階筆順規則：先橫後豎、先撇後捺、先外後內、先中間後封口，把字寫得又對又漂亮。',
    levels: [
      {
        id: 1,
        island: 1,
        title: '先橫後豎森林',
        emoji: '✏️',
        skill: '筆順：先橫後豎',
        intro: '先寫橫、再寫豎！像「十」字，先一橫再一豎，順序不能亂！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 2,
        island: 1,
        title: '先撇後捺森林',
        emoji: '🌿',
        skill: '筆順：先撇後捺',
        intro: '先撇後捺！像「八」字，左邊撇先寫、右邊捺後寫，像樹枝伸展！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 3,
        island: 1,
        title: '先外後內森林',
        emoji: '🌳',
        skill: '筆順：先外後內',
        intro: '先寫外面、再寫裡面！像「月」字，先寫外框再寫裡面的兩橫！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 4,
        island: 1,
        title: '先中間後封口森林',
        emoji: '🌴',
        skill: '筆順：先中間後封口',
        intro: '先寫中間、最後封口！像「回」字，先寫中間的小口，再封外面的大口！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 2,
    name: '部首歸類島',
    emoji: '🧊',
    theme: 'ocean',
    color: '#2b9cdb',
    blurb: '認識常用部首的意義與歸類：水部、火部、木部、口部、心部、手部分組大挑戰。',
    levels: [
      {
        id: 5,
        island: 2,
        title: '水部波浪',
        emoji: '💧',
        skill: '部首：水部（氵）',
        intro: '氵就是水！河、海、湖、洗、泳，跟水有關的字都有三點水！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 6,
        island: 2,
        title: '火部波浪',
        emoji: '🔥',
        skill: '部首：火部（灬、火）',
        intro: '灬就是火！熱、煮、燒、燈，跟火有關的字下面有四點！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 7,
        island: 2,
        title: '木部波浪',
        emoji: '🌊',
        skill: '部首：木部（木）',
        intro: '木就是樹！林、森、桌、椅、樹，跟木頭有關的字都有木！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 8,
        island: 2,
        title: '口部波浪',
        emoji: '🐬',
        skill: '部首：口部（口）',
        intro: '口就是嘴巴！吃、喝、叫、唱、問，跟嘴巴有關的字都有口！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 3,
    name: '部件拼字島',
    emoji: '🔥',
    theme: 'cloud',
    color: '#ff7675',
    blurb: '把部件拼成完整國字：左右結構、上下結構、包圍結構，拆拆拼拼學造字。',
    levels: [
      {
        id: 9,
        island: 3,
        title: '左右結構拼字',
        emoji: '🧩',
        skill: '結構：左右結構',
        intro: '左邊加右邊！「明」是日加月、「好」是女加子，左右拼起來就是新字！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 10,
        island: 3,
        title: '上下結構拼字',
        emoji: '🏗️',
        skill: '結構：上下結構',
        intro: '上面加下面！「尖」是小加大、「炎」是火加火，上下疊起來就是新字！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 11,
        island: 3,
        title: '包圍結構拼字',
        emoji: '🔲',
        skill: '結構：包圍結構',
        intro: '外面包裡面！「回」是大口包小口、「國」是外框包玉，包圍結構像房子！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 12,
        island: 3,
        title: '部件大挑戰',
        emoji: '🎯',
        skill: '部件組合：混合結構',
        intro: '把部件拼起來！「想」是相加心、「花」是草加化，混合結構最有趣！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 4,
    name: '形近字與量詞島',
    emoji: '🌌',
    theme: 'space',
    color: '#443f9a',
    blurb: '分辨形近字（己已巳、未末、土士）與正確使用量詞（個、隻、棵、本、張、匹）。',
    levels: [
      {
        id: 13,
        island: 4,
        title: '形近字星星一',
        emoji: '⭐',
        skill: '形近字：己、已、巳',
        intro: '己、已、巳長得很像！己全開、已半開、巳全閉，睜大眼睛分清楚！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 14,
        island: 4,
        title: '形近字星星二',
        emoji: '🌟',
        skill: '形近字：未、末、土、士',
        intro: '未和末差在哪？未短上長下、末長上短下！土和士差在哪？土下長、士上長！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 15,
        island: 4,
        title: '量詞星星一',
        emoji: '🍎',
        skill: '量詞：個、隻、棵、本',
        intro: '一個蘋果、一隻貓、一棵樹、一本書！量詞幫東西數數，用錯就怪怪的！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 16,
        island: 4,
        title: '量詞星星二',
        emoji: '💬',
        skill: '量詞：張、匹、頭、朵',
        intro: '一張紙、一匹馬、一頭牛、一朵花！每個東西都有自己的量詞朋友！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  }
];
