/* 奇幻英文島・小二關卡表（4 島 × 4 關）：題庫由 data/question-bank-en-g2.json 提供，
   本檔只負責島嶼與關卡的標題、技能與英文 intro（語音由 en-US 引擎讀出）。 */

export const en_g2_islands = [
  {
    id: 1,
    name: '長母音魔法島',
    emoji: '🌲',
    theme: 'forest',
    color: '#3fae6a',
    blurb: '認識 Magic e 魔法：a_e、i_e、o_e、u_e，聽一聽母音變長了！',
    levels: [
      {
        id: 1,
        island: 1,
        title: 'a_e 蛋糕長母音',
        emoji: '🍰',
        skill: '長母音 a_e · cake, lake',
        intro: 'Magic e 魔法來囉！像 cake 和 lake，後面的 e 讓 a 念出自己的名字喔！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 2,
        island: 1,
        title: 'i_e 腳踏車長母音',
        emoji: '🚲',
        skill: '長母音 i_e · bike, time',
        intro: 'Magic e 讓 i 變長囉！像 bike 和 ride，聽聽看像「愛」的長音！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 3,
        island: 1,
        title: 'o_e 甜蜜的家長母音',
        emoji: '🏠',
        skill: '長母音 o_e · home, nose',
        intro: '圓圓的嘴巴念 o_e！像 home 和 rope，嘴唇嘟圓圓念出長音 O！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 4,
        island: 1,
        title: 'u_e 可愛長母音',
        emoji: '🦄',
        skill: '長母音 u_e · cute, tube',
        intro: '好可愛的 cute！Magic e 讓 u 發出像字母 U 的長音喔！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 2,
    name: '子音混合海島',
    emoji: '🧊',
    theme: 'ocean',
    color: '#2b9cdb',
    blurb: 'bl、cl、st、tr 子音混合，兩個子音手拉手一起發音。',
    levels: [
      {
        id: 5,
        island: 2,
        title: 'bl 藍色泡泡海',
        emoji: '🌊',
        skill: '子音混合 bl · blue, blend',
        intro: 'b 和 l 手拉手變成 bl！像 blue 和 black，念得又快又順！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 6,
        island: 2,
        title: 'cl 拍拍手鐘樓',
        emoji: '👏',
        skill: '子音混合 cl · clap, clock',
        intro: 'c 和 l 在一起！像 clap 拍拍手、clock 滴答鐘，一起清楚念出來！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 7,
        island: 2,
        title: 'st 小星星海灣',
        emoji: '⭐',
        skill: '子音混合 st · star, stop',
        intro: 'st 來囉！像天空中的 star、紅綠燈的 stop，像小蛇吐氣一樣溜過去！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 8,
        island: 2,
        title: 'tr 大樹小火車',
        emoji: '🚂',
        skill: '子音混合 tr · tree, train',
        intro: '嘟嘟！tr 火車開動囉！像 tree 和 truck，舌頭輕輕捲一下！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 3,
    name: '詞族雲島',
    emoji: '🔥',
    theme: 'cloud',
    color: '#ff7675',
    blurb: '-ight、-ound、-ain、-own 押韻家族，認識常見的英文結尾。',
    levels: [
      {
        id: 9,
        island: 3,
        title: 'ight 晚安星星家族',
        emoji: '✨',
        skill: '押韻家族 -ight · light, night',
        intro: '閃閃發光的 -ight 家族！像 light 和 night，結尾都有 ight 的聲音！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 10,
        island: 3,
        title: 'ound 圓滾滾家族',
        emoji: '⚽',
        skill: '押韻家族 -ound · round, sound',
        intro: '圓圓的皮球 round！像 sound 和 ground，結尾都是 ound 喔！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 11,
        island: 3,
        title: 'ain 下雨天家族',
        emoji: '🌧️',
        skill: '押韻家族 -ain · rain, train',
        intro: '下雨天的 rain！像 train 和 rain，結尾都有 ain 的好聽聲音！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 12,
        island: 3,
        title: 'own 歡樂小鎮家族',
        emoji: '🏘️',
        skill: '押韻家族 -own · town, down',
        intro: '熱鬧的小鎮 town！像 down 和 brown，都是 own 家族的小夥伴！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 4,
    name: '生活對話星島',
    emoji: '🌌',
    theme: 'space',
    color: '#443f9a',
    blurb: '打招呼、自我介紹與簡單問句，用英文說出日常生活！',
    levels: [
      {
        id: 13,
        island: 4,
        title: '打招呼：Hello, My Name Is…',
        emoji: '👋',
        skill: '日常生活 · 問候與自我介紹',
        intro: '見到新朋友說 Hello！跟著小狐狸一起用英文說出自己的名字吧！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 14,
        island: 4,
        title: '我喜歡、我有：I Like, I Have',
        emoji: '🐱',
        skill: '日常生活 · 喜好與擁有',
        intro: '分享你喜歡的東西！像 I like cats、I have a ball，大聲說出來！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 15,
        island: 4,
        title: '這是什麼：What Is This?',
        emoji: '🔍',
        skill: '日常生活 · 好奇問問看',
        intro: '這是什麼呢？What is this? 一起在奇幻星島尋找答案！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 16,
        island: 4,
        title: '我的一天：My Day In English',
        emoji: '☀️',
        skill: '日常生活 · 日常生活描述',
        intro: '吃早餐、上學、跟好朋友玩！用最棒的英文說出精采的一天！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  }
];
