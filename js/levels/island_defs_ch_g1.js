/* 奇幻國語島・小一關卡表（4 島 × 4 關）：題庫由 data/question-bank-ch-g1.json 提供，
   本檔只負責島嶼與關卡的標題、技能與中文 intro（語音由 zh-TW 引擎讀出）。 */

export const ch_g1_islands = [
  {
    id: 1,
    name: '注音符號島',
    emoji: '🌳',
    theme: 'forest',
    color: '#3fae6a',
    blurb: '認識ㄅㄆㄇㄈ到ㄐㄑㄒ的聲母，聽一聽、找一找注音符號的發音。',
    levels: [
      {
        id: 1,
        island: 1,
        title: 'ㄅㄆㄇㄈ 聲母歌',
        emoji: '🎵',
        skill: '聲母 ㄅㄆㄇㄈ',
        intro: 'ㄅㄆㄇㄈ！嘴巴閉起來再打開，像拍球一樣，ㄅ、ㄆ、ㄇ、ㄈ！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 2,
        island: 1,
        title: 'ㄉㄊㄋㄌ 聲母歌',
        emoji: '🥁',
        skill: '聲母 ㄉㄊㄋㄌ',
        intro: 'ㄉㄊㄋㄌ！舌頭頂住上排牙齒，ㄉ、ㄊ、ㄋ、ㄌ，像打鼓一樣！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 3,
        island: 1,
        title: 'ㄍㄎㄏ 聲母歌',
        emoji: '🐝',
        skill: '聲母 ㄍㄎㄏ',
        intro: 'ㄍㄎㄏ！舌頭後面頂住，ㄍ、ㄎ、ㄏ，像蜜蜂嗡嗡嗡！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 4,
        island: 1,
        title: 'ㄐㄑㄒ 聲母歌',
        emoji: '🦋',
        skill: '聲母 ㄐㄑㄒ',
        intro: 'ㄐㄑㄒ！舌頭前面頂住，ㄐ、ㄑ、ㄒ，像蝴蝶飛飛飛！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 2,
    name: '國字初識島',
    emoji: '🌊',
    theme: 'ocean',
    color: '#2b9cdb',
    blurb: '基本筆畫與常用國字，一笔一畫學寫字。',
    levels: [
      {
        id: 5,
        island: 2,
        title: '基本筆畫波浪',
        emoji: '✏️',
        skill: '筆畫：橫、豎、撇、捺',
        intro: '一筆一畫學寫字！橫、豎、撇、捺，像海浪一樣一筆一筆寫。',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 6,
        island: 2,
        title: '常用字一：天地人',
        emoji: '🌍',
        skill: '國字：天、地、人、大、小',
        intro: '天、地、人、大、小！看看天空，看看大地，看看自己。',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 7,
        island: 2,
        title: '常用字二：日月水',
        emoji: '🌙',
        skill: '國字：日、月、水、火、山',
        intro: '日、月、水、火、山！白天看太陽，晚上看月亮，大自然真美！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 8,
        island: 2,
        title: '常用字三：口耳目',
        emoji: '👀',
        skill: '國字：口、耳、目、手、足',
        intro: '口、耳、目、手、足！用嘴巴說、用耳朵聽、用眼睛看、用手做、用腳走。',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 3,
    name: '詞語積累島',
    emoji: '☁️',
    theme: 'cloud',
    color: '#8d7bf0',
    blurb: '名詞、動詞、形容詞與量詞，詞語大挑戰。',
    levels: [
      {
        id: 9,
        island: 3,
        title: '名詞雲雲雲',
        emoji: '📦',
        skill: '名詞：物品與動物',
        intro: '書、筆、貓、狗、鳥、魚！这些东西都有名字，叫名詞。',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 10,
        island: 3,
        title: '動詞雲雲雲',
        emoji: '🏃',
        skill: '動詞：跑、跳、吃、喝',
        intro: '跑、跳、吃、喝、看、聽！動詞就是你在做的事情。',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 11,
        island: 3,
        title: '形容詞雲雲雲',
        emoji: '🌈',
        skill: '形容詞：大、小、紅、藍',
        intro: '大、小、紅、藍、高、矮！形容詞告訴我們東西長什麼樣子。',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 12,
        island: 3,
        title: '量詞雲雲雲',
        emoji: '🍎',
        skill: '量詞：個、隻、棵、本',
        intro: '一個蘋果、一隻貓、一棵樹、一本書！量詞幫東西數數。',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 4,
    name: '句子表達島',
    emoji: '✨',
    theme: 'space',
    color: '#443f9a',
    blurb: '基本句型、問句、描述句與日常對話，說中文大冒險。',
    levels: [
      {
        id: 13,
        island: 4,
        title: '基本句型星星',
        emoji: '⭐',
        skill: '句型：誰做什麼',
        intro: '小明吃蘋果。誰做什麼？先說誰，再說做什麼！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 14,
        island: 4,
        title: '問句星星',
        emoji: '❓',
        skill: '問句：什麼、哪裡、誰',
        intro: '這是什麼？你在哪裡？他是誰？問句最後要加問號！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 15,
        island: 4,
        title: '描述句星星',
        emoji: '🎨',
        skill: '描述句：像什麼、是什麼',
        intro: '天空是藍色的。雲像棉花糖。描述句告訴別人你的發現！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 16,
        island: 4,
        title: '日常對話星星',
        emoji: '💬',
        skill: '日常用語：你好、謝謝、再見',
        intro: '你好！謝謝！再見！早安！晚安！用中文跟朋友打招呼！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  }
];
