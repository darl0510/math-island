import {
  randInt,
  pick,
  shuffle,
  numberOptions,
  textOptions,
  sampleDistinct,
  toChineseNumber,
} from '../utils.js';

const SEA_FRIENDS = [
  { emoji: '🐠', name: '小丑魚' },
  { emoji: '🐡', name: '河豚' },
  { emoji: '🐙', name: '章魚' },
  { emoji: '🦀', name: '螃蟹' },
  { emoji: '🦐', name: '蝦子' },
];

function additionPairs() {
  const pairs = [];
  for (let a = 1; a <= 9; a += 1) {
    for (let b = 1; a + b <= 10; b += 1) pairs.push([a, b]);
  }
  return shuffle(pairs);
}

function subtractionPairs() {
  const pairs = [];
  for (let a = 2; a <= 10; a += 1) {
    for (let b = 1; b <= a; b += 1) pairs.push([a, b]);
  }
  return shuffle(pairs);
}

function additionEquation([a, b]) {
  const friend = pick(SEA_FRIENDS);
  const answer = a + b;
  return {
    prompt: `${a} 加 ${b} 等於多少？`,
    speak: `${toChineseNumber(a)} 加 ${toChineseNumber(b)} 等於多少？`,
    hint: '先數第一個數，再往後數第二個數。',
    explanation: `${a} 和 ${b} 合起來是 ${answer}。`,
    answer: String(answer),
    options: numberOptions(answer, { min: 1, max: 10 }),
    visual: { type: 'addSubScene', a, b, op: '+', emoji: friend.emoji },
  };
}

function additionStory([a, b]) {
  const friend = pick(SEA_FRIENDS);
  const answer = a + b;
  return {
    prompt: `海裡有 ${a} 隻${friend.name}，又來了 ${b} 隻，一共有幾隻？`,
    speak: `海裡有${toChineseNumber(a)}隻${friend.name}，又來了${toChineseNumber(b)}隻，一共有幾隻？`,
    hint: '把原來的和後來的一起數。',
    explanation: `原來有 ${a} 隻，又來 ${b} 隻，一共是 ${answer} 隻。`,
    answer: String(answer),
    options: numberOptions(answer, { min: 1, max: 10 }),
    visual: { type: 'addSubScene', a, b, op: '+', emoji: friend.emoji },
  };
}

function additionTwoGroups([a, b]) {
  const [first, second] = sampleDistinct(SEA_FRIENDS, 2);
  const answer = a + b;
  return {
    prompt: `${first.name} ${a} 隻，${second.name} ${b} 隻，合起來有幾隻？`,
    speak: `${first.name}${toChineseNumber(a)}隻，${second.name}${toChineseNumber(b)}隻，合起來有幾隻？`,
    hint: '兩組朋友合起來，就用加法。',
    explanation: `${a} 隻和 ${b} 隻合起來是 ${answer} 隻。`,
    answer: String(answer),
    options: numberOptions(answer, { min: 1, max: 10 }),
    visual: { type: 'addSubScene', a, b, op: '+', emoji: first.emoji },
  };
}

function makeAdditionQuestions(count = 6) {
  const pairs = additionPairs();
  const builders = [additionEquation, additionStory, additionTwoGroups];
  const questions = Array.from({ length: count }, (_, index) => (
    builders[index % builders.length](pairs[index])
  ));
  return shuffle(questions);
}

function subtractionEquation([a, b]) {
  const friend = pick(SEA_FRIENDS);
  const answer = a - b;
  return {
    prompt: `${a} 減 ${b} 等於多少？`,
    speak: `${toChineseNumber(a)} 減 ${toChineseNumber(b)} 等於多少？`,
    hint: '從第一個數往前數，數幾個就拿掉幾個。',
    explanation: `${a} 拿走 ${b}，還剩 ${answer}。`,
    answer: String(answer),
    options: numberOptions(answer, { min: 0, max: 10 }),
    visual: { type: 'addSubScene', a, b, op: '-', emoji: friend.emoji },
  };
}

function subtractionBubbles([a, b]) {
  const answer = a - b;
  return {
    prompt: `有 ${a} 個泡泡，破了 ${b} 個，還剩幾個？`,
    speak: `有${toChineseNumber(a)}個泡泡，破了${toChineseNumber(b)}個，還剩幾個？`,
    hint: '破掉的泡泡要扣掉喔。',
    explanation: `${a} 個泡泡破了 ${b} 個，還剩 ${answer} 個。`,
    answer: String(answer),
    options: numberOptions(answer, { min: 0, max: 10 }),
    visual: { type: 'addSubScene', a, b, op: '-', emoji: '🎈' },
  };
}

function subtractionShells([a, b]) {
  const answer = a - b;
  return {
    prompt: `${a} 顆貝殼送給朋友 ${b} 顆，還剩幾顆？`,
    speak: `${toChineseNumber(a)}顆貝殼送給朋友${toChineseNumber(b)}顆，還剩幾顆？`,
    hint: '送出去的要扣掉，才是剩下的。',
    explanation: `${a} 顆貝殼送出 ${b} 顆，還剩 ${answer} 顆。`,
    answer: String(answer),
    options: numberOptions(answer, { min: 0, max: 10 }),
    visual: { type: 'addSubScene', a, b, op: '-', emoji: '🐚' },
  };
}

function makeSubtractionQuestions(count = 6) {
  const pairs = subtractionPairs();
  const builders = [subtractionEquation, subtractionBubbles, subtractionShells];
  const questions = Array.from({ length: count }, (_, index) => (
    builders[index % builders.length](pairs[index])
  ));
  return shuffle(questions);
}

const SHAPE_INFO = [
  { type: 'square', name: '正方形' },
  { type: 'rectangle', name: '長方形' },
  { type: 'triangle', name: '三角形' },
  { type: 'circle', name: '圓形' },
  { type: 'star', name: '星星' },
];
const SHAPE_NAMES = SHAPE_INFO.map((shape) => shape.name);
const PROPERTY_OPTION_NAMES = ['正方形', '長方形', '三角形', '圓形'];
const SHAPE_COLORS = ['#ff8a5c', '#4fb8e8', '#ffd166', '#9b8cff', '#7bdff2', '#f78fb3', '#8ce99a'];

const SHAPE_SLOTS = [];
for (let row = 0; row < 3; row += 1) {
  for (let col = 0; col < 4; col += 1) {
    SHAPE_SLOTS.push({ x: 28 + col * 118, y: 24 + row * 86 });
  }
}

function makeShape(type, slot, color) {
  const shape = { type, x: slot.x, y: slot.y, color };
  if (type === 'rectangle') {
    return { ...shape, w: randInt(78, 90), h: randInt(46, 56) };
  }
  return { ...shape, size: randInt(54, 68) };
}

function buildShapeScene(types) {
  const slots = shuffle(SHAPE_SLOTS).slice(0, types.length);
  const colors = shuffle(SHAPE_COLORS);
  return {
    type: 'shapeScene',
    width: 520,
    height: 280,
    shapes: types.map((type, index) => makeShape(type, slots[index], colors[index % colors.length])),
  };
}

function countShapeTypes(types) {
  const counts = {};
  for (const type of types) counts[type] = (counts[type] || 0) + 1;
  return counts;
}

function shapeCountQuestion(info) {
  const targetCount = randInt(2, 4);
  const total = randInt(Math.max(6, targetCount + 2), 10);
  const others = SHAPE_INFO.filter((shape) => shape.type !== info.type);
  const types = Array.from({ length: targetCount }, () => info.type);
  while (types.length < total) types.push(pick(others).type);
  const shuffledTypes = shuffle(types);
  const counts = countShapeTypes(shuffledTypes);
  const answer = counts[info.type];
  return {
    prompt: `數一數，圖中有幾個${info.name}？`,
    speak: `數一數，圖中有幾個${info.name}？`,
    hint: '一個一個慢慢數，別漏掉。',
    explanation: `圖裡有 ${answer} 個${info.name}。`,
    answer: String(answer),
    options: numberOptions(answer, { min: 0, max: 10 }),
    visual: buildShapeScene(shuffledTypes),
  };
}

const PROPERTY_QUESTIONS = [
  {
    type: 'triangle',
    prompt: '有 3 個角、3 條邊的是什麼形狀？',
    speak: '有三個角、三條邊的是什麼形狀？',
    hint: '看看它是不是只有三個角。',
    explanation: '三角形有 3 個角和 3 條邊。',
  },
  {
    type: 'square',
    prompt: '有 4 個角，四條邊一樣長的是什麼形狀？',
    speak: '有四個角，四條邊一樣長的是什麼形狀？',
    hint: '四條邊都一樣長，四個角都方方的。',
    explanation: '正方形有 4 條一樣長的邊。',
  },
  {
    type: 'circle',
    prompt: '圓圓的，沒有角的是什麼形狀？',
    speak: '圓圓的，沒有角的是什麼形狀？',
    hint: '找找看，哪個形狀沒有尖尖的角。',
    explanation: '圓形圓圓的，沒有角。',
  },
];

function shapePropertyQuestion(template) {
  const info = SHAPE_INFO.find((shape) => shape.type === template.type);
  const others = SHAPE_INFO.filter((shape) => shape.type !== info.type);
  const total = randInt(6, 10);
  const types = [info.type];
  while (types.length < total) types.push(pick(others).type);
  return {
    prompt: template.prompt,
    speak: template.speak,
    hint: template.hint,
    explanation: template.explanation,
    answer: info.name,
    options: textOptions(info.name, PROPERTY_OPTION_NAMES, 4),
    visual: buildShapeScene(shuffle(types)),
  };
}

function shapeMostQuestion() {
  let types = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const total = randInt(6, 10);
    const candidate = Array.from({ length: total }, () => pick(SHAPE_INFO).type);
    const counts = countShapeTypes(candidate);
    const values = Object.values(counts);
    const highest = Math.max(...values);
    if (values.length >= 3 && values.filter((value) => value === highest).length === 1) {
      types = candidate;
      break;
    }
  }
  if (!types) types = ['circle', 'circle', 'circle', 'star', 'triangle', 'square'];

  const counts = countShapeTypes(types);
  const highest = Math.max(...Object.values(counts));
  const maxType = Object.keys(counts).find((type) => counts[type] === highest);
  const info = SHAPE_INFO.find((shape) => shape.type === maxType);
  return {
    prompt: '哪一種形狀的數量最多？',
    speak: '哪一種形狀的數量最多？',
    hint: '一種一種數一數，再比一比。',
    explanation: `圖裡有 ${counts[maxType]} 個${info.name}，數量最多。`,
    answer: info.name,
    options: textOptions(info.name, SHAPE_NAMES, 4),
    visual: buildShapeScene(types),
  };
}

function makeShapeQuestions(count = 6) {
  const countTargets = sampleDistinct(SHAPE_INFO, 2);
  const propertyTargets = sampleDistinct(PROPERTY_QUESTIONS, 2);
  const extraTarget = pick(SHAPE_INFO.filter((info) => (
    !countTargets.some((target) => target.type === info.type)
  )));
  const questions = [
    shapeCountQuestion(countTargets[0]),
    shapeCountQuestion(countTargets[1]),
    shapePropertyQuestion(propertyTargets[0]),
    shapePropertyQuestion(propertyTargets[1]),
    shapeMostQuestion(),
    shapeCountQuestion(extraTarget),
  ];
  return shuffle(questions).slice(0, count);
}

const READ_PROMPTS = [
  '時鐘上是幾點？',
  '看看時鐘，現在是幾點？',
  '這個時鐘顯示幾點？',
];

const OCLOCK_PROMPTS = [
  (hour) => `短針指著 ${hour}，長針指著 12，是幾點？`,
  (hour) => `長針指著 12，短針指著 ${hour}，是幾點？`,
];

const HALF_PROMPTS = [
  (hour, next) => `長針指著 6，短針在 ${hour} 和 ${next} 中間，是幾點？`,
  (hour, next) => `短針在 ${hour} 和 ${next} 中間，長針指著 6，是幾點？`,
];

function timeLabel(hour, minute) {
  return `${hour}點${minute === 30 ? '半' : ''}`;
}

function timeOptions(hour, minute) {
  const next = hour === 12 ? 1 : hour + 1;
  const pool = [
    timeLabel(hour, 0),
    timeLabel(hour, 30),
    timeLabel(next, 0),
    timeLabel(next, 30),
  ];
  return textOptions(timeLabel(hour, minute), pool, 4);
}

function clockReadQuestion(prompt) {
  const minute = pick([0, 30]);
  const hour = minute === 0 ? randInt(1, 11) : randInt(1, 12);
  const next = hour === 12 ? 1 : hour + 1;
  return {
    prompt,
    speak: prompt,
    hint: minute === 0 ? '長針指著 12，就是整點。' : '長針指著 6，就是半點。',
    explanation: minute === 0
      ? `短針指著 ${hour}，長針指著 12，所以是 ${hour} 點。`
      : `長針指著 6，短針在 ${hour} 和 ${next} 中間，所以是 ${hour} 點半。`,
    answer: timeLabel(hour, minute),
    options: timeOptions(hour, minute),
    visual: { type: 'clock', hour, minute },
  };
}

function clockOClockQuestion(style) {
  const hour = randInt(1, 11);
  return {
    prompt: OCLOCK_PROMPTS[style](hour),
    speak: style === 0
      ? `短針指著${toChineseNumber(hour)}，長針指著十二，是幾點？`
      : `長針指著十二，短針指著${toChineseNumber(hour)}，是幾點？`,
    hint: '長針指著 12，就是整點。',
    explanation: `短針指著 ${hour}，長針指著 12，所以是 ${hour} 點。`,
    answer: timeLabel(hour, 0),
    options: timeOptions(hour, 0),
    visual: { type: 'clock', hour, minute: 0 },
  };
}

function clockHalfQuestion(style) {
  const hour = randInt(1, 12);
  const next = hour === 12 ? 1 : hour + 1;
  return {
    prompt: HALF_PROMPTS[style](hour, next),
    speak: style === 0
      ? `長針指著六，短針在${toChineseNumber(hour)}和${toChineseNumber(next)}中間，是幾點？`
      : `短針在${toChineseNumber(hour)}和${toChineseNumber(next)}中間，長針指著六，是幾點？`,
    hint: '長針指著 6，就是半點。',
    explanation: `長針指著 6，短針在 ${hour} 和 ${next} 中間，所以是 ${hour} 點半。`,
    answer: timeLabel(hour, 30),
    options: timeOptions(hour, 30),
    visual: { type: 'clock', hour, minute: 30 },
  };
}

function makeClockQuestions(count = 6) {
  const readPrompts = sampleDistinct(READ_PROMPTS, 2);
  const questions = [
    clockReadQuestion(readPrompts[0]),
    clockReadQuestion(readPrompts[1]),
    clockOClockQuestion(0),
    clockOClockQuestion(1),
    clockHalfQuestion(0),
    clockHalfQuestion(1),
  ];
  return shuffle(questions).slice(0, count);
}

export const island2 = {
  id: 2,
  name: '海洋加減篇',
  emoji: '🐬',
  theme: 'ocean',
  color: '#2aa7c9',
  blurb: '在海底學加減、認識形狀，還要看懂時鐘。',
  levels: [
    {
      id: 5,
      island: 2,
      title: '海底加一加',
      emoji: '🐠',
      skill: '10 以內的加法',
      intro: '海底的朋友要一起排隊，我們來算算看一共有幾個。',
      makeQuestions(count = 6) {
        return makeAdditionQuestions(count);
      },
    },
    {
      id: 6,
      island: 2,
      title: '泡泡破掉了',
      emoji: '🎈',
      skill: '10 以內的減法',
      intro: '泡泡一個一個破掉了，我們來算算還剩下幾個。',
      makeQuestions(count = 6) {
        return makeSubtractionQuestions(count);
      },
    },
    {
      id: 7,
      island: 2,
      title: '奇妙形狀島',
      emoji: '🧩',
      skill: '形狀辨認與計數',
      intro: '海底有好多奇妙的形狀，一起來數一數、認一認。',
      makeQuestions(count = 6) {
        return makeShapeQuestions(count);
      },
    },
    {
      id: 8,
      island: 2,
      title: '滴答小鬧鐘',
      emoji: '⏰',
      skill: '整點與半點',
      intro: '小鬧鐘滴答滴答，我們來看看現在是幾點。',
      makeQuestions(count = 6) {
        return makeClockQuestions(count);
      },
    },
  ],
};
