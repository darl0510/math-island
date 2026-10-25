/* 奇幻英文島・小二關卡表（4 島 × 4 關）：題庫由 data/question-bank-en-g2.json 提供，
   本檔負責島嶼與關卡的標題、技能與 intro（與題庫短母音、子音組合、混合音及生活英語完全對齊）。 */

export const en_g2_islands = [
  {
    id: 1,
    name: '短母音字族島',
    emoji: '🌲',
    theme: 'forest',
    color: '#3fae6a',
    blurb: '探索常見短母音與字族：-ug、-et/-en、-at/-ap、-ig/-in，聽出單字的好聽尾音！',
    levels: [
      {
        id: 1,
        island: 1,
        title: '短母音 u · -ug 字族',
        emoji: '🐛',
        skill: '短母音 u · bug, hug, mug',
        intro: '短母音 u 與 -ug 家族來囉！像小蟲蟲 bug、溫暖擁抱 hug，跟著小狐狸一起聽音練習！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 2,
        island: 1,
        title: '短母音 e · -et / -en 字族',
        emoji: '🪶',
        skill: '短母音 e · net, pen, bed',
        intro: '短母音 e 來囉！像 net 捕蝶網、pen 原子筆與 red 紅色，發出清脆的 short e！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 3,
        island: 1,
        title: '短母音 a · -at / -ap 字族',
        emoji: '🐱',
        skill: '短母音 a · cat, bat, cap',
        intro: '嘴巴張大的短母音 a！像 cat 可愛小貓、hat 帥氣帽子，聽聽看像「啊」的短母音！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 4,
        island: 1,
        title: '短母音 i · -ig / -in 字族',
        emoji: '🐷',
        skill: '短母音 i · pig, big, pin',
        intro: '微笑短母音 i！像 pig 粉紅小豬、big 好大一個，跟著小狐狸大聲念出來！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 2,
    name: '短母音與特殊子音島',
    emoji: '🌊',
    theme: 'ocean',
    color: '#2b9cdb',
    blurb: '短母音 o/u 進階字族，以及 sh、ch 特殊子音組合發音！',
    levels: [
      {
        id: 5,
        island: 2,
        title: '短母音 o · -op / -ot 字族',
        emoji: '🍲',
        skill: '短母音 o · mop, pot, hot',
        intro: '圓圓小嘴的短母音 o！像 pot 鍋子、hot 熱熱的，嘴唇嘟圓念出 short o！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 6,
        island: 2,
        title: '短母音 u · -un / -ut 字族',
        emoji: '☀️',
        skill: '短母音 u · run, sun, nut',
        intro: '跑步 run、太陽 sun！短母音 u 充滿活力，尾音 -un 與 -ut 順暢讀出來！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 7,
        island: 2,
        title: '子音組合 sh · 安靜島',
        emoji: '🤫',
        skill: '子音組合 sh · ship, fish, shop',
        intro: '噓——安靜的 sh 發音！像 ship 大船、fish 小魚，輕輕吐氣發出 sh 聲音！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 8,
        island: 2,
        title: '子音組合 ch · 恰恰島',
        emoji: '🚂',
        skill: '子音組合 ch · chip, chin, watch',
        intro: '恰恰恰！像火車開動的 ch 聲音！像 chip 脆片、watch 手錶，一起練習 ch！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 3,
    name: '雙子音與魔法 e 島',
    emoji: '✨',
    theme: 'cloud',
    color: '#ff7675',
    blurb: '咬舌音 th、子音混合 bl/cl/st，以及長母音 Magic e 的奇妙變化！',
    levels: [
      {
        id: 9,
        island: 3,
        title: '子音組合 th · 咬舌島',
        emoji: '👅',
        skill: '子音組合 th · thin, math, bath',
        intro: '舌尖輕咬牙齒的 th 聲音！像 three 數字三、bath 洗澡，舌頭伸出一點點！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 10,
        island: 3,
        title: '混合子音 bl / cl 浪潮',
        emoji: '💙',
        skill: '混合子音 bl/cl · blue, clap, clock',
        intro: '兩個子音手拉手！像 blue 藍色、clap 拍拍手，兩個聲音順暢連在一起！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 11,
        island: 3,
        title: '混合子音 st / sp 星灣',
        emoji: '⭐',
        skill: '混合子音 st/sp · star, stop, spoon',
        intro: '像小蛇吐氣的 st 和 sp！像 star 小星星、stop 停下來，清楚念出來！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 12,
        island: 3,
        title: 'Magic e · 長短母音對比',
        emoji: '🪄',
        skill: '長短母音 · cap/cape, kit/kite',
        intro: '魔法 e 來囉！cap 加上 e 變成 cape，母音發出長長的聲音，好神奇喔！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 4,
    name: '生活英語與對話星島',
    emoji: '🌌',
    theme: 'space',
    color: '#443f9a',
    blurb: '數字、顏色、家庭生活單字與常用生活問答對話！',
    levels: [
      {
        id: 13,
        island: 4,
        title: '數字 11-20 星球',
        emoji: '🔟',
        skill: '英文數字 · 11 到 20 (twelve, sixteen)',
        intro: '數一數星空中的數字！twelve 是 12、twenty 是 20，用英文數星星！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 14,
        island: 4,
        title: '繽紛顏色與形容詞',
        emoji: '🎨',
        skill: '顏色形容詞 · red, blue, big, small',
        intro: 'red 紅色、blue 藍色、big 大大的！用漂亮的顏色和形容詞形容生活！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 15,
        island: 4,
        title: '家庭與生活動作',
        emoji: '🏡',
        skill: '家庭生活單字 · dad, foot, run, jump',
        intro: '溫暖的家庭與好玩的動作！dad 爸爸、jump 跳跳，開心大聲說英文！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 16,
        island: 4,
        title: '日常生活問答與交流',
        emoji: '💬',
        skill: '生活問答 · What\'s this?, I like',
        intro: '用英文交新朋友！What\'s this?、I like cats，流利回答生活問句！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  }
];
