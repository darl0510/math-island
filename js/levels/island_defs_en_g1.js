/* 奇幻英文島・小一關卡表（4 島 × 4 關）：題庫由 data/question-bank-en-g1.json 提供，
   本檔只負責島嶼與關卡的標題、技能與英文 intro（語音由 en-US 引擎讀出）。 */

export const en_g1_islands = [
  {
    id: 1,
    name: '字母起步島',
    emoji: '🌳',
    theme: 'forest',
    color: '#3fae6a',
    blurb: '認識 Aa Bb Cc Dd 的開頭音，聽一聽、找一找字母起手式。',
    levels: [
      {
        id: 1,
        island: 1,
        title: 'Aa Is for Apple',
        emoji: '🍎',
        skill: 'Letter Aa · 開頭音 /a/',
        intro: 'Aa says /a/! A is for apple. Let us find the letter A.',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 2,
        island: 1,
        title: 'Bb Is for Ball',
        emoji: '⚽',
        skill: 'Letter Bb · 開頭音 /b/',
        intro: 'Bb says /b/! B is for ball. Bounce the ball and say /b/, /b/, /b/.',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 3,
        island: 1,
        title: 'Cc Is for Cat',
        emoji: '🐱',
        skill: 'Letter Cc · 開頭音 /k/',
        intro: 'Cc says /k/! C is for cat. The cat says /k/, /k/, /k/.',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 4,
        island: 1,
        title: 'Dd Is for Dog',
        emoji: '🐶',
        skill: 'Letter Dd · 開頭音 /d/',
        intro: 'Dd says /d/! D is for dog. Dig with the dog and say /d/, /d/, /d/.',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 2,
    name: '短母音海島',
    emoji: '🌊',
    theme: 'ocean',
    color: '#2b9cdb',
    blurb: '短母音 a e i o 與 -at、-en、-ig、-og 押韻家族。',
    levels: [
      {
        id: 5,
        island: 2,
        title: 'The -at Family Wave',
        emoji: '🏠',
        skill: '短母音 a · -at 家族',
        intro: 'cat, hat, mat. They all end in -at. Can you hear the -at sound?',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 6,
        island: 2,
        title: 'The -en Family Shell',
        emoji: '🐚',
        skill: '短母音 e · -en 家族',
        intro: 'pen, hen, ten. Listen for -en and clap three times.',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 7,
        island: 2,
        title: 'Short i, -ig and -it',
        emoji: '🐟',
        skill: '短母音 i · -ig / -it',
        intro: 'pig, big, sit. The middle sound is /i/. Say it short and fast!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 8,
        island: 2,
        title: 'The -og Family Fog',
        emoji: '🌫️',
        skill: '短母音 o · -og 家族',
        intro: 'dog, log, fog. They all end in -og. Make the /o/ sound round and short.',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 3,
    name: '雙字母雲島',
    emoji: '☁️',
    theme: 'cloud',
    color: '#8d7bf0',
    blurb: 'sh、ch、th、ng、ck 雙字母音，聽音辨字大挑戰。',
    levels: [
      {
        id: 9,
        island: 3,
        title: 'The sh Sound',
        emoji: '👗',
        skill: '雙字母音 sh',
        intro: 'sh! Listen: fish, shoe, shell all have the sh sound.',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 10,
        island: 3,
        title: 'The ch Sound',
        emoji: '🧀',
        skill: '雙字母音 ch',
        intro: 'ch! chair, cheese, lunch. Say /ch/ nice and clean!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 11,
        island: 3,
        title: 'The th Sound',
        emoji: '👍',
        skill: '雙字母音 th',
        intro: 'th! Stick your tongue out a little and say /th/: three, thumb, bath.',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 12,
        island: 3,
        title: 'The ng Sound',
        emoji: '💍',
        skill: '雙字母音 ng',
        intro: 'ng! king, ring, sing. The ng sound hums in your nose.',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 4,
    name: '生活單字星島',
    emoji: '✨',
    theme: 'space',
    color: '#443f9a',
    blurb: '顏色、數字、家人、食物與動物生活單字，還有英文問候語。',
    levels: [
      {
        id: 13,
        island: 4,
        title: 'Colors in the Sky',
        emoji: '🌈',
        skill: '顏色單字 colors',
        intro: 'red, blue, green, yellow. Look at the sky and say the colors in English!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 14,
        island: 4,
        title: 'My Family Star',
        emoji: '👨‍👩‍👧',
        skill: '家人單字 family',
        intro: 'mom, dad, sister, brother. Say your family in English!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 15,
        island: 4,
        title: 'Yummy Food Cart',
        emoji: '🛒',
        skill: '食物飲料單字 food',
        intro: 'milk, bread, apple, rice. What do you eat? Say it in English!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 16,
        island: 4,
        title: 'Animal Friends Song',
        emoji: '🐾',
        skill: '動物單字 animals',
        intro: 'dog, cat, pig, duck. Sing the animal song and say every word.',
        makeQuestions(count = 6) { return []; }
      }
    ]
  }
];
