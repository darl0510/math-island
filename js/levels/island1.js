import {
  numberOptions,
  pick,
  randInt,
  sampleDistinct,
  shuffle,
  textOptions,
  toChineseNumber,
} from '../utils.js';

const COUNT_ITEMS = [
  { emoji: '🍎', name: '蘋果' },
  { emoji: '🍒', name: '櫻桃' },
  { emoji: '🌰', name: '橡果' },
  { emoji: '🍄', name: '蘑菇' },
];

const COMPARE_ITEMS = [
  { emoji: '🍓', name: '草莓' },
  { emoji: '🍒', name: '櫻桃' },
  { emoji: '🍄', name: '蘑菇' },
  { emoji: '🌰', name: '橡果' },
  { emoji: '🍎', name: '蘋果' },
  { emoji: '🍐', name: '梨子' },
  { emoji: '🍇', name: '葡萄' },
  { emoji: '🥕', name: '紅蘿蔔' },
];

const ANIMALS = [
  { name: '狗', spoken: '小狗', emoji: '🐶' },
  { name: '貓', spoken: '小貓', emoji: '🐱' },
  { name: '兔', spoken: '小兔子', emoji: '🐰' },
  { name: '熊', spoken: '小熊', emoji: '🐻' },
  { name: '狐狸', spoken: '狐狸', emoji: '🦊' },
  { name: '青蛙', spoken: '青蛙', emoji: '🐸' },
  { name: '小豬', spoken: '小豬', emoji: '🐷' },
  { name: '企鵝', spoken: '企鵝', emoji: '🐧' },
];

const ANIMAL_NAMES = ANIMALS.map((animal) => animal.name);
const ANIMAL_EMOJI = Object.fromEntries(ANIMALS.map((animal) => [animal.name, animal.emoji]));
const ORDINAL_NAMES = ['一', '二', '三', '四', '五', '六', '七'];
const DIRECTIONS = [
  { value: 'left', word: '左邊' },
  { value: 'right', word: '右邊' },
];

function uniqueQuestion(usedPrompts, makeQuestion) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const question = makeQuestion();
    if (!usedPrompts.has(question.prompt)) {
      usedPrompts.add(question.prompt);
      return question;
    }
  }
  const question = makeQuestion();
  usedPrompts.add(question.prompt);
  return question;
}

function buildQuestions(count, makers) {
  const usedPrompts = new Set();
  const questions = [];
  let index = 0;
  while (questions.length < count) {
    const maker = makers[index % makers.length];
    questions.push(uniqueQuestion(usedPrompts, maker));
    index += 1;
  }
  return shuffle(questions).slice(0, count);
}

function animalAnswerOptions(answer) {
  const options = textOptions(answer, ANIMAL_NAMES, 4);
  return {
    options,
    optionEmojis: options.map((name) => ANIMAL_EMOJI[name]),
  };
}

// ── 第 1 關：森林數果子（10 以內的數數）────────────────────────────

function countQuestion() {
  const item = pick(COUNT_ITEMS);
  const count = randInt(1, 10);
  const prompt = pick([
    `數一數，盤子裡有幾個${item.name}？`,
    `數一數，十格裡有幾個${item.name}？`,
    `數一數，一共有幾個${item.name}？`,
  ]);
  return {
    prompt,
    speak: prompt,
    hint: pick([
      '從左邊開始，一個一個數。',
      '先數滿一排五個，再往下數。',
      '用手指著，慢慢數，不要跳過。',
    ]),
    explanation: `十格裡有${toChineseNumber(count)}個${item.name}，所以答案是${toChineseNumber(count)}。`,
    answer: String(count),
    options: numberOptions(count, { min: 0, max: 10 }),
    visual: { type: 'tenFrame', count, emoji: item.emoji },
  };
}

function fillToTenQuestion() {
  const item = pick(COUNT_ITEMS);
  const count = randInt(3, 9);
  const answer = 10 - count;
  const countWord = toChineseNumber(count);
  const variants = [
    {
      prompt: `十格裡有 ${count} 個${item.name}，還差幾個就裝滿十個？`,
      speak: `十格裡有${countWord}個${item.name}，還差幾個就裝滿十個？`,
    },
    {
      prompt: `已經放了 ${count} 個${item.name}，再放幾個就滿十個？`,
      speak: `已經放了${countWord}個${item.name}，再放幾個就滿十個？`,
    },
    {
      prompt: `十格裡有 ${count} 個${item.name}，還要幾個才滿十個？`,
      speak: `十格裡有${countWord}個${item.name}，還要幾個才滿十個？`,
    },
  ];
  const { prompt, speak } = pick(variants);
  return {
    prompt,
    speak,
    hint: pick([
      '看看十格還空著幾個格子。',
      '先想想十可以分成這個數和幾。',
      '一排五個，先數數還空幾個。',
    ]),
    explanation: `十可以分成${toChineseNumber(count)}和${toChineseNumber(answer)}，所以還差${toChineseNumber(answer)}個。`,
    answer: String(answer),
    options: numberOptions(answer, { min: 0, max: 10 }),
    visual: { type: 'tenFrame', count, emoji: item.emoji },
  };
}

function blankCellsQuestion() {
  const item = pick(COUNT_ITEMS);
  const count = randInt(1, 9);
  const answer = 10 - count;
  const countWord = toChineseNumber(count);
  const variants = [
    {
      prompt: `十格裡放了 ${count} 個${item.name}，還有幾個空位？`,
      speak: `十格裡放了${countWord}個${item.name}，還有幾個空位？`,
    },
    {
      prompt: `十格已經有 ${count} 個${item.name}，空位還有幾個？`,
      speak: `十格已經有${countWord}個${item.name}，空位還有幾個？`,
    },
    {
      prompt: `十格裡有 ${count} 個${item.name}，數一數還有幾個空格？`,
      speak: `十格裡有${countWord}個${item.name}，數一數還有幾個空格？`,
    },
  ];
  const { prompt, speak } = pick(variants);
  return {
    prompt,
    speak,
    hint: pick([
      '把有果子的格子和空格分開數。',
      '十格一共有十個位置，扣掉果子就是空位。',
      '數一數沒有果子的格子有幾個。',
    ]),
    explanation: `十格一共有十個位置，放了${countWord}個${item.name}，還空${toChineseNumber(answer)}個。`,
    answer: String(answer),
    options: numberOptions(answer, { min: 0, max: 10 }),
    visual: { type: 'tenFrame', count, emoji: item.emoji },
  };
}

// ── 第 2 關：誰比較多？（10 以內比多少）────────────────────────────

function comparePair() {
  const [leftItem, rightItem] = sampleDistinct(COMPARE_ITEMS, 2);
  return { leftItem, rightItem };
}

function moreSideQuestion() {
  const { leftItem, rightItem } = comparePair();
  const left = randInt(1, 9);
  let right = randInt(1, 9);
  while (right === left) right = randInt(1, 9);
  const answer = left > right ? '左邊' : '右邊';
  const prompt = pick([
    `左邊的${leftItem.name}和右邊的${rightItem.name}，哪一邊比較多？`,
    `左邊是${leftItem.name}，右邊是${rightItem.name}，哪一邊比較多？`,
    `哪一邊比較多？左邊${leftItem.name}，右邊${rightItem.name}。`,
  ]);
  return {
    prompt,
    speak: prompt,
    hint: '一對一連連看，多出來的那一邊就是比較多。',
    explanation: `左邊有${toChineseNumber(left)}個${leftItem.name}，右邊有${toChineseNumber(right)}個${rightItem.name}，所以${answer}比較多。`,
    answer,
    options: ['左邊', '右邊', '一樣多'],
    visual: {
      type: 'compareGroups',
      left,
      right,
      leftEmoji: leftItem.emoji,
      rightEmoji: rightItem.emoji,
      paired: true,
    },
  };
}

function differenceQuestion() {
  const { leftItem, rightItem } = comparePair();
  const left = randInt(2, 9);
  const right = randInt(1, left - 1);
  const answer = left - right;
  const prompt = pick([
    `左邊的${leftItem.name}比右邊的${rightItem.name}多幾個？`,
    `左邊${leftItem.name}比右邊${rightItem.name}多幾個？`,
    `比一比，左邊比右邊多幾個？左邊是${leftItem.name}，右邊是${rightItem.name}。`,
  ]);
  return {
    prompt,
    speak: prompt,
    hint: '把兩邊一個一個配對，剩下來的就比較多。',
    explanation: `左邊有${toChineseNumber(left)}個，右邊有${toChineseNumber(right)}個，${toChineseNumber(left)}減${toChineseNumber(right)}等於${toChineseNumber(answer)}，所以多${toChineseNumber(answer)}個。`,
    answer: String(answer),
    options: numberOptions(answer, { min: 1, max: 8 }),
    visual: {
      type: 'compareGroups',
      left,
      right,
      leftEmoji: leftItem.emoji,
      rightEmoji: rightItem.emoji,
      paired: true,
    },
  };
}

function totalQuestion() {
  const { leftItem, rightItem } = comparePair();
  const left = randInt(1, 5);
  let right = randInt(1, 5);
  while (right === left) right = randInt(1, 5);
  const total = left + right;
  const prompt = pick([
    `左邊的${leftItem.name}和右邊的${rightItem.name}，一共有幾個？`,
    `左邊${leftItem.name}、右邊${rightItem.name}，合起來有幾個？`,
    `把左邊的${leftItem.name}和右邊的${rightItem.name}加起來，一共幾個？`,
  ]);
  return {
    prompt,
    speak: prompt,
    hint: '先數左邊，再接著數右邊。',
    explanation: `左邊有${toChineseNumber(left)}個，右邊有${toChineseNumber(right)}個，合起來是${toChineseNumber(total)}個。`,
    answer: String(total),
    options: numberOptions(total, { min: 2, max: 10 }),
    visual: {
      type: 'compareGroups',
      left,
      right,
      leftEmoji: leftItem.emoji,
      rightEmoji: rightItem.emoji,
      paired: true,
    },
  };
}

// ── 第 3 關：動物排排站（序數）──────────────────────────────────

function ordinalLineup() {
  const size = randInt(5, 7);
  return {
    animals: sampleDistinct(ANIMALS, size),
    direction: pick(DIRECTIONS),
    size,
  };
}

function ordinalVisual(animals, direction) {
  return {
    type: 'ordinalLine',
    items: animals.map((animal) => animal.emoji),
    direction,
    showNumbers: false,
    label: '森林動物排排站',
  };
}

function animalAtPositionQuestion() {
  const { animals, direction, size } = ordinalLineup();
  const position = randInt(1, size);
  const index = direction.value === 'left' ? position - 1 : size - position;
  const animal = animals[index];
  const positionWord = toChineseNumber(position);
  const variants = [
    {
      prompt: `從${direction.word}數，第 ${position} 個是什麼動物？`,
      speak: `從${direction.word}數，第${positionWord}個是什麼動物？`,
    },
    {
      prompt: `從${direction.word}數過來，第 ${position} 個是誰？`,
      speak: `從${direction.word}數過來，第${positionWord}個是誰？`,
    },
    {
      prompt: `第 ${position} 個動物是什麼？要從${direction.word}數喔。`,
      speak: `第${positionWord}個動物是什麼？要從${direction.word}數喔。`,
    },
  ];
  const { prompt, speak } = pick(variants);
  const { options, optionEmojis } = animalAnswerOptions(animal.name);
  return {
    prompt,
    speak,
    hint: `從${direction.word}開始，一個一個點著數。`,
    explanation: `從${direction.word}數，第${positionWord}個是${animal.name}。`,
    answer: animal.name,
    options,
    optionEmojis,
    visual: ordinalVisual(animals, direction.value),
  };
}

function ordinalOfAnimalQuestion() {
  const { animals, direction, size } = ordinalLineup();
  const index = randInt(0, size - 1);
  const animal = animals[index];
  const ordinal = direction.value === 'left' ? index + 1 : size - index;
  const answer = toChineseNumber(ordinal);
  const variants = [
    {
      prompt: `${animal.emoji} 是從${direction.word}數第幾個？`,
      speak: `${animal.spoken}是從${direction.word}數第幾個？`,
    },
    {
      prompt: `${animal.name}${animal.emoji} 是從${direction.word}數第幾個？`,
      speak: `${animal.spoken}是從${direction.word}數第幾個？`,
    },
    {
      prompt: `從${direction.word}數，${animal.name}排在第幾個？`,
      speak: `從${direction.word}數，${animal.spoken}排在第幾個？`,
    },
  ];
  const { prompt, speak } = pick(variants);
  return {
    prompt,
    speak,
    hint: `從${direction.word}數，數到${animal.name}就停下來。`,
    explanation: `從${direction.word}數，${animal.name}是第${answer}個。`,
    answer,
    options: textOptions(answer, ORDINAL_NAMES, 4),
    visual: ordinalVisual(animals, direction.value),
  };
}

function endOfLineQuestion() {
  const { animals, size } = ordinalLineup();
  const side = pick(['left', 'right']);
  const animal = side === 'left' ? animals[0] : animals[size - 1];
  const variants = side === 'left'
    ? [
        {
          prompt: '排在最左邊的是什麼動物？',
          speak: '排在最左邊的是什麼動物？',
          hint: '最左邊就是從左邊數第一個。',
        },
        {
          prompt: '隊伍最左邊的是哪一個動物？',
          speak: '隊伍最左邊的是哪一個動物？',
          hint: '從左邊數第一個，就是最左邊的動物。',
        },
      ]
    : [
        {
          prompt: '排在最右邊的是什麼動物？',
          speak: '排在最右邊的是什麼動物？',
          hint: '最右邊就是從右邊數第一個。',
        },
        {
          prompt: '隊伍最右邊的是哪一個動物？',
          speak: '隊伍最右邊的是哪一個動物？',
          hint: '從右邊數第一個，就是最右邊的動物。',
        },
      ];
  const { prompt, speak, hint } = pick(variants);
  const { options, optionEmojis } = animalAnswerOptions(animal.name);
  return {
    prompt,
    speak,
    hint,
    explanation: side === 'left'
      ? `排在最左邊的是${animal.name}。`
      : `排在最右邊的是${animal.name}。`,
    answer: animal.name,
    options,
    optionEmojis,
    visual: ordinalVisual(animals, side),
  };
}

// ── 第 4 關：10 的分與合 ───────────────────────────────────────

function missingPartQuestion() {
  const known = randInt(1, 9);
  const answer = 10 - known;
  const knownWord = toChineseNumber(known);
  const missing = pick(['left', 'right']);
  const variants = missing === 'right'
    ? [
        {
          prompt: `10 可以分成 ${known} 和幾？`,
          speak: `十可以分成${knownWord}和幾？`,
        },
        {
          prompt: `10 可以分成 ${known} 和哪一個數？`,
          speak: `十可以分成${knownWord}和哪一個數？`,
        },
        {
          prompt: `10 分成 ${known} 和另一個數，另一個是幾？`,
          speak: `十分成${knownWord}和另一個數，另一個是幾？`,
        },
      ]
    : [
        {
          prompt: `10 可以分成幾和 ${known}？`,
          speak: `十可以分成幾和${knownWord}？`,
        },
        {
          prompt: `10 可以分成哪一個數和 ${known}？`,
          speak: `十可以分成哪一個數和${knownWord}？`,
        },
        {
          prompt: `10 分成另一個數和 ${known}，另一個是幾？`,
          speak: `十分成另一個數和${knownWord}，另一個是幾？`,
        },
      ];
  const { prompt, speak } = pick(variants);
  return {
    prompt,
    speak,
    hint: pick([
      '想一想，這個數和哪個數合起來是十？',
      '用兩隻手比一比，還少幾個就是答案。',
      '先把十個手指頭伸出來，再藏起這個數。',
    ]),
    explanation: `十可以分成${knownWord}和${toChineseNumber(answer)}，因為${knownWord}加${toChineseNumber(answer)}等於十。`,
    answer: String(answer),
    options: numberOptions(answer, { min: 0, max: 10 }),
    visual: {
      type: 'numberBond',
      whole: 10,
      left: missing === 'left' ? null : known,
      right: missing === 'right' ? null : known,
      missing,
    },
  };
}

function missingWholeQuestion() {
  const left = randInt(1, 9);
  const right = 10 - left;
  const leftWord = toChineseNumber(left);
  const rightWord = toChineseNumber(right);
  const variants = [
    {
      prompt: `${left} 和 ${right} 合起來是幾？`,
      speak: `${leftWord}和${rightWord}合起來是幾？`,
    },
    {
      prompt: `${left} 和 ${right} 合起來一共有幾個？`,
      speak: `${leftWord}和${rightWord}合起來一共有幾個？`,
    },
    {
      prompt: `把 ${left} 和 ${right} 合起來，是多少？`,
      speak: `把${leftWord}和${rightWord}合起來，是多少？`,
    },
  ];
  const { prompt, speak } = pick(variants);
  return {
    prompt,
    speak,
    hint: pick([
      '把兩邊的數合起來，就是全部的數。',
      '想想看，這兩個數合起來會不會剛好是十？',
      '先數左邊，再接著數右邊。',
    ]),
    explanation: `${leftWord}和${rightWord}合起來是十。`,
    answer: '10',
    options: numberOptions(10, { min: 0, max: 10 }),
    visual: {
      type: 'numberBond',
      whole: null,
      left,
      right,
      missing: 'whole',
    },
  };
}

function twoBondsQuestion() {
  const known = randInt(1, 9);
  const other = 10 - known;
  let example = randInt(1, 9);
  while (example === known || example === other) example = randInt(1, 9);
  const answer = 10 - example;
  const knownWord = toChineseNumber(known);
  const otherWord = toChineseNumber(other);
  const exampleWord = toChineseNumber(example);
  const variants = [
    {
      prompt: `10 可以分成 ${known} 和 ${other}，也可以分成 ${example} 和幾？`,
      speak: `十可以分成${knownWord}和${otherWord}，也可以分成${exampleWord}和幾？`,
    },
    {
      prompt: `10 可以分成 ${known} 和 ${other}；那麼分成 ${example} 和幾呢？`,
      speak: `十可以分成${knownWord}和${otherWord}，那麼分成${exampleWord}和幾呢？`,
    },
    {
      prompt: `10 可以分成 ${known} 和 ${other}，還能分成 ${example} 和幾？`,
      speak: `十可以分成${knownWord}和${otherWord}，還能分成${exampleWord}和幾？`,
    },
  ];
  const { prompt, speak } = pick(variants);
  return {
    prompt,
    speak,
    hint: '每一種分法，兩個數合起來都要是十。',
    explanation: `十可以分成${exampleWord}和${toChineseNumber(answer)}。`,
    answer: String(answer),
    options: numberOptions(answer, { min: 0, max: 10 }),
    visual: {
      type: 'numberBond',
      whole: 10,
      left: example,
      right: null,
      missing: 'right',
    },
  };
}

export const island1 = {
  id: 1,
  name: '森林起步篇',
  emoji: '🌳',
  theme: 'forest',
  color: '#3fae6a',
  blurb: '用十格陣列數一數，認識比多少、序數和 10 的分與合。',
  levels: [
    {
      id: 1,
      island: 1,
      title: '森林數果子',
      emoji: '🍎',
      skill: '10 以內的數數',
      intro: '歡迎來到森林果園！我們一起用十格板，數數看有幾顆果子。',
      makeQuestions(count = 6) {
        return buildQuestions(count, [countQuestion, fillToTenQuestion, blankCellsQuestion]);
      },
    },
    {
      id: 2,
      island: 1,
      title: '誰比較多？',
      emoji: '🍓',
      skill: '10 以內比多少',
      intro: '水果準備好了！我們一起比一比，哪一邊比較多。',
      makeQuestions(count = 6) {
        return buildQuestions(count, [moreSideQuestion, differenceQuestion, totalQuestion]);
      },
    },
    {
      id: 3,
      island: 1,
      title: '動物排排站',
      emoji: '🦊',
      skill: '序數',
      intro: '森林動物來排隊！我們一起從左邊、右邊數一數。',
      makeQuestions(count = 6) {
        return buildQuestions(count, [animalAtPositionQuestion, ordinalOfAnimalQuestion, endOfLineQuestion]);
      },
    },
    {
      id: 4,
      island: 1,
      title: '10 的分與合',
      emoji: '🧩',
      skill: '10 的分與合',
      intro: '十可以怎麼分呢？我們一起把十變成兩個好朋友。',
      makeQuestions(count = 6) {
        return buildQuestions(count, [missingPartQuestion, missingWholeQuestion, twoBondsQuestion]);
      },
    },
  ],
};
