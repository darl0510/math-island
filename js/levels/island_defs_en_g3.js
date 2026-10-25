/* 奇幻英文島・小三關卡表（4 島 × 4 關）：題庫由 data/question-bank-en-g3.json 提供，
   本檔只負責島嶼與關卡的標題、技能與英文 intro（語音由 en-US 引擎讀出）。 */

export const en_g3_islands = [
  {
    id: 1,
    name: '母音組合神殿',
    emoji: '🏛️',
    theme: 'forest',
    color: '#3fae6a',
    blurb: 'ai/ay、ee/ea、oa/ow 母音組合，兩個母音手拉手發長音。',
    levels: [
      {
        id: 1,
        island: 1,
        title: 'ai and ay Say /eɪ/',
        emoji: '🍎',
        skill: '母音組合 ai / ay · /eɪ/',
        intro: 'When two vowels go walking, the first one does the talking! rain, train, day, play. Say /eɪ/!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 2,
        island: 1,
        title: 'ee and ea Say /iː/',
        emoji: '🪜',
        skill: '母音組合 ee / ea · /iː/',
        intro: 'see, tree, bee, read, eat, team. ee and ea both say the long e sound /iː/. Smile wide!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 3,
        island: 1,
        title: 'oa and ow Say /oʊ/',
        emoji: '🎯',
        skill: '母音組合 oa / ow · /oʊ/',
        intro: 'boat, coat, road, snow, show, grow. oa and ow both say the long o sound /oʊ/. Round your lips!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 4,
        island: 1,
        title: 'oo: Long and Short',
        emoji: '📏',
        skill: '母音組合 oo · /uː/ 與 /ʊ/',
        intro: 'moon, food, zoo say long oo /uː/. book, look, good say short oo /ʊ/. Listen and tell which one!',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 2,
    name: '詞尾變身迷宮',
    emoji: '📐',
    theme: 'ocean',
    color: '#2b9cdb',
    blurb: '-ing、-ed、-ly、-ful 詞尾變化，認識動詞與形容詞的变形。',
    levels: [
      {
        id: 5,
        island: 2,
        title: 'The -ing Action Maze',
        emoji: '🐧',
        skill: '詞尾 -ing · 進行式',
        intro: 'run becomes running, play becomes playing. Add -ing to show something happening right now!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 6,
        island: 2,
        title: 'The -ed Past Maze',
        emoji: '⏰',
        skill: '詞尾 -ed · 過去式',
        intro: 'walk becomes walked, jump becomes jumped. Add -ed to talk about the past!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 7,
        island: 2,
        title: 'The -ly Adverb Maze',
        emoji: '⚖️',
        skill: '詞尾 -ly · 副詞',
        intro: 'quick becomes quickly, slow becomes slowly. Add -ly to describe how you do something!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 8,
        island: 2,
        title: 'The -ful Adjective Maze',
        emoji: '🎲',
        skill: '詞尾 -ful · 形容詞',
        intro: 'joy becomes joyful, help becomes helpful. Add -ful to describe a lot of something!',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 3,
    name: '句子花園',
    emoji: '🌷',
    theme: 'cloud',
    color: '#8d7bf0',
    blurb: '主詞動詞、形容詞修飾、連接詞與問句，組出完整漂亮的句子。',
    levels: [
      {
        id: 9,
        island: 3,
        title: 'Subject and Verb Garden',
        emoji: '✨',
        skill: '主詞與動詞搭配',
        intro: 'The cat runs. The dogs run. One cat runs, many dogs run. Match the subject with the verb!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 10,
        island: 3,
        title: 'Adjective Flowers',
        emoji: '🏎️',
        skill: '形容詞修飾名詞',
        intro: 'a big red flower, a tall green tree. Adjectives tell us what things look like. Pick the right adjectives!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 11,
        island: 3,
        title: 'And, But, Because Lightning',
        emoji: '⚡',
        skill: '連接詞 and / but / because',
        intro: 'I like cats AND dogs. I like cats BUT NOT snakes. I like cats BECAUSE they are soft. Connect your ideas!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 12,
        island: 3,
        title: 'Question Cart',
        emoji: '🛒',
        skill: '特殊問句 Who / What / Where / When',
        intro: 'Who is your best friend? What do you eat for lunch? Where do you play? When do you sleep? Ask and answer!',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 4,
    name: '故事星盤',
    emoji: '🪐',
    theme: 'space',
    color: '#443f9a',
    blurb: '閱讀理解、段落結構、故事順序與創意寫作，用英文說完整的故事。',
    levels: [
      {
        id: 13,
        island: 4,
        title: 'Read and Find the Main Idea',
        emoji: '🪐',
        skill: '閱讀理解 · 主旨',
        intro: 'Read a short story. What is it mostly about? Find the main idea and the important details!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 14,
        island: 4,
        title: 'First, Next, Then, Last',
        emoji: '💫',
        skill: '故事順序與段落',
        intro: 'First I woke up. Next I brushed my teeth. Then I ate breakfast. Last I went to school. Put events in order!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 15,
        island: 4,
        title: 'Describe Your Favorite Place',
        emoji: '💰',
        skill: '描述寫作',
        intro: 'My favorite place is the park. It is big and green. I can run and play. Describe your favorite place in English!',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 16,
        island: 4,
        title: 'Write a Mini Story',
        emoji: '🍕',
        skill: '創意寫作 · 三句故事',
        intro: 'Once upon a time, a little star fell from the sky. It found a friend. They played all night. Write your own three-sentence story!',
        makeQuestions(count = 6) { return []; }
      }
    ]
  }
];
