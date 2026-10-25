/* 奇幻英文島・小二關卡表（4 島 × 4 關）：題庫由 data/question-bank-en-g2.json 提供，
   本檔只負責島嶼與關卡的標題、技能與英文 intro（語音由 en-US 引擎讀出）。 */

export const en_g2_islands = [
  {
    id: 1,
    name: '長母音魔法島',
    emoji: '🌲',
    theme: 'forest',
    color: '#3fae6a',
    blurb: 'Magic e 長母音 a_e、i_e、o_e、u_e，聽一聽母音變長了！',
    levels: [
      {
        id: 1,
        island: 1,
        title: 'Magic e: a_e Sound',
        emoji: '🍎',
        skill: '長母音 a_e · /eɪ/',
        intro: 'Magic e makes a say its name! cake, lake, make. Listen for the long a sound!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 2,
        island: 1,
        title: 'Magic e: i_e Sound',
        emoji: '🪜',
        skill: '長母音 i_e · /aɪ/',
        intro: 'Magic e makes i say its name! bike, time, ride. Say /aɪ/ nice and long!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 3,
        island: 1,
        title: 'Magic e: o_e Sound',
        emoji: '🎯',
        skill: '長母音 o_e · /oʊ/',
        intro: 'Magic e makes o say its name! home, nose, rope. Round your lips for /oʊ/.',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 4,
        island: 1,
        title: 'Magic e: u_e Sound',
        emoji: '📏',
        skill: '長母音 u_e · /juː/',
        intro: 'Magic e makes u say its name! cute, tube, use. Say /juː/ like the letter U!',
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
        title: 'The bl Blend Wave',
        emoji: '🐧',
        skill: '子音混合 bl',
        intro: 'bl! blend, blue, black. Say b and l together fast, like one sound!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 6,
        island: 2,
        title: 'The cl Blend Shell',
        emoji: '⏰',
        skill: '子音混合 cl',
        intro: 'cl! clap, clock, clean. Say c and l together, nice and clean!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 7,
        island: 2,
        title: 'The st Blend Fish',
        emoji: '⚖️',
        skill: '子音混合 st',
        intro: 'st! star, stop, story. Say s and t together, smooth like the sea!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 8,
        island: 2,
        title: 'The tr Blend Dice',
        emoji: '🎲',
        skill: '子音混合 tr',
        intro: 'tr! tree, truck, try. Say t and r together, roll the r sound!',
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
    blurb: '-ight、-ound、-ain、-own 詞族，認識長詞尾的拼寫模式。',
    levels: [
      {
        id: 9,
        island: 3,
        title: 'The -ight Family Spark',
        emoji: '✨',
        skill: '詞族 -ight · /aɪt/',
        intro: 'light, night, right, fight. They all end in -ight. Say /aɪt/ bright and clear!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 10,
        island: 3,
        title: 'The -ound Family Racer',
        emoji: '🏎️',
        skill: '詞族 -ound · /aʊnd/',
        intro: 'round, sound, found, ground. They all end in -ound. Say /aʊnd/ fast!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 11,
        island: 3,
        title: 'The -ain Family Lightning',
        emoji: '⚡',
        skill: '詞族 -ain · /eɪn/',
        intro: 'rain, train, main, chain. They all end in -ain. Say /eɪn/ like the letter A!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 12,
        island: 3,
        title: 'The -own Family Cart',
        emoji: '🛒',
        skill: '詞族 -own · /oʊn/',
        intro: 'down, town, clown, brown. They all end in -own. Say /oʊn/ round and warm!',
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
    blurb: '問候、自我介紹、描述與簡單問句，用英文說出自己的生活。',
    levels: [
      {
        id: 13,
        island: 4,
        title: 'Hello, My Name Is…',
        emoji: '🪐',
        skill: '問候與自我介紹',
        intro: 'Hello! My name is… Nice to meet you! Say hello and tell your name in English!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 14,
        island: 4,
        title: 'I Like… I Have…',
        emoji: '💫',
        skill: '描述喜好與擁有',
        intro: 'I like cats. I have a red ball. Tell what you like and what you have!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 15,
        island: 4,
        title: 'What Is This? Where Is It?',
        emoji: '💰',
        skill: '簡單問句',
        intro: 'What is this? Where is the cat? Ask questions in English and find the answers!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 16,
        island: 4,
        title: 'My Day in English',
        emoji: '🍕',
        skill: '日常活動描述',
        intro: 'I eat breakfast. I go to school. I play with friends. Tell your day in English!',
        makeQuestions(count = 6) { return []; }
      }
    ]
  }
];
