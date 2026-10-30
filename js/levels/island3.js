import {
  randInt,
  pick,
  shuffle,
  numberOptions,
  textOptions,
  toChineseNumber,
} from '../utils.js';

const cn = toChineseNumber;

const ADD_EMOJIS = ['🐚', '🐠', '⭐', '🎈', '🐬', '🐙'];
const SUB_EMOJIS = ['🎈', '🍓', '🍎', '🍄', '🐦', '🌰'];

function buildQuestions(count, templates) {
  const order = shuffle(templates);
  const questions = [];
  const prompts = new Set();
  let cursor = 0;
  let guard = 0;

  while (questions.length < count && guard < count * 200) {
    guard += 1;
    const template = cursor < order.length ? order[cursor] : pick(order);
    const question = template();
    if (!question || prompts.has(question.prompt)) continue;
    prompts.add(question.prompt);
    questions.push(question);
    cursor += 1;
  }

  return questions;
}

function makeAddPair() {
  let a = randInt(5, 9);
  let b = randInt(2, 9);
  while (a + b < 11 || a + b > 18) {
    a = randInt(5, 9);
    b = randInt(2, 9);
  }
  return { a, b };
}

function makeBreakPair() {
  let a = randInt(11, 18);
  let b = randInt(2, 9);
  while (!(a - b < 10 && a % 10 < b)) {
    a = randInt(11, 18);
    b = randInt(2, 9);
  }
  return { a, b };
}

function makeTenQuestion(a, b, emoji, prompt, speak) {
  const answer = a + b;
  return {
    prompt,
    speak,
    hint: `從 ${b} 拿出 ${10 - a} 個，和 ${a} 湊成 10。`,
    explanation: `${a} 加 ${10 - a} 湊成 10，10 再加 ${a + b - 10} 等於 ${answer}。`,
    answer: String(answer),
    options: numberOptions(answer, { min: 0, max: 20 }),
    visual: { type: 'makeTenBoard', a, b, emoji },
  };
}

function breakTenQuestion(a, b, emoji, prompt, speak) {
  const answer = a - b;
  return {
    prompt,
    speak,
    hint: `把 ${a} 分成 10 和 ${a - 10}，先算 10 減 ${b}。`,
    explanation: `把 ${a} 分成 10 和 ${a - 10}，10 減 ${b} 等於 ${10 - b}，${10 - b} 加 ${a - 10} 等於 ${answer}。`,
    answer: String(answer),
    options: numberOptions(answer, { min: 0, max: 20 }),
    visual: { type: 'breakTenBoard', a, b, emoji },
  };
}

function placeValueOptions(tens, ones) {
  const answer = `${tens} 個十和 ${ones} 個一`;
  const deltas = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, -1], [1, -1], [-1, 1],
  ];
  const pool = [];
  for (const [tensDelta, onesDelta] of deltas) {
    const nextTens = tens + tensDelta;
    const nextOnes = ones + onesDelta;
    if (nextTens >= 0 && nextTens <= 10 && nextOnes >= 0 && nextOnes <= 9) {
      pool.push(`${nextTens} 個十和 ${nextOnes} 個一`);
    }
  }
  return textOptions(answer, pool, 4);
}

const level9Templates = [
  () => {
    const { a, b } = makeAddPair();
    return makeTenQuestion(
      a,
      b,
      pick(ADD_EMOJIS),
      `${a} 加 ${b} 等於多少？先用湊十法想一想。`,
      `${cn(a)}加${cn(b)}等於多少？先用湊十法想一想。`,
    );
  },
  () => {
    const { a, b } = makeAddPair();
    return makeTenQuestion(
      a,
      b,
      '🐠',
      `小丑魚有 ${a} 隻，海龜有 ${b} 隻，一共有幾隻？`,
      `小丑魚有${cn(a)}隻，海龜有${cn(b)}隻，一共有幾隻？`,
    );
  },
  () => {
    const { a, b } = makeAddPair();
    return makeTenQuestion(
      a,
      b,
      pick(ADD_EMOJIS),
      `${a} 加 ${b} 等於多少？`,
      `${cn(a)}加${cn(b)}等於多少？`,
    );
  },
  () => {
    const { a, b } = makeAddPair();
    return makeTenQuestion(
      a,
      b,
      '⭐',
      `雲朵上有 ${a} 顆星星，又飄來 ${b} 顆，一共有幾顆？`,
      `雲朵上有${cn(a)}顆星星，又飄來${cn(b)}顆，一共有幾顆？`,
    );
  },
];

const level10Templates = [
  () => {
    const { a, b } = makeBreakPair();
    return breakTenQuestion(
      a,
      b,
      pick(SUB_EMOJIS),
      `${a} 減 ${b} 等於多少？`,
      `${cn(a)}減${cn(b)}等於多少？`,
    );
  },
  () => {
    const { a, b } = makeBreakPair();
    return breakTenQuestion(
      a,
      b,
      '🍓',
      `有 ${a} 顆果子，吃掉了 ${b} 顆，還剩幾顆？`,
      `有${cn(a)}顆果子，吃掉了${cn(b)}顆，還剩幾顆？`,
    );
  },
  () => {
    const { a, b } = makeBreakPair();
    return breakTenQuestion(
      a,
      b,
      '🐦',
      `樹上有 ${a} 隻小鳥，飛走了 ${b} 隻，還剩幾隻？`,
      `樹上有${cn(a)}隻小鳥，飛走了${cn(b)}隻，還剩幾隻？`,
    );
  },
  () => {
    const { a, b } = makeBreakPair();
    return breakTenQuestion(
      a,
      b,
      pick(SUB_EMOJIS),
      `${a} 減 ${b} 等於多少？用破十法想一想。`,
      `${cn(a)}減${cn(b)}等於多少？用破十法想一想。`,
    );
  },
];

const level11Templates = [
  () => {
    const tens = randInt(1, 9);
    const ones = randInt(1, 9);
    const value = tens * 10 + ones;
    return {
      prompt: `${value} 是幾個十和幾個一？`,
      speak: `${cn(value)}，是幾個十和幾個一？`,
      hint: '十位是左邊的長條，個位是小方塊。',
      explanation: `${tens} 個十是 ${tens * 10}，${ones} 個一是 ${ones}，合起來是 ${value}。`,
      answer: `${tens} 個十和 ${ones} 個一`,
      options: placeValueOptions(tens, ones),
      visual: { type: 'baseTen', tens, ones },
    };
  },
  () => {
    const useHundred = randInt(1, 8) === 1;
    const tens = useHundred ? 10 : randInt(1, 9);
    const ones = useHundred ? 0 : randInt(1, 9);
    const value = tens * 10 + ones;
    return {
      prompt: `${tens} 個十和 ${ones} 個一合起來是多少？`,
      speak: `${cn(tens)}個十和${cn(ones)}個一合起來是多少？`,
      hint: '十條就是十，再加幾個一。',
      explanation: `${tens} 個十是 ${tens * 10}，再加 ${ones} 個一，等於 ${value}。`,
      answer: String(value),
      options: numberOptions(value, { min: 0, max: 100 }),
      visual: { type: 'baseTen', tens, ones },
    };
  },
  () => {
    const tens = randInt(1, 9);
    const ones = randInt(1, 9);
    return {
      prompt: '這裡有幾個十？',
      speak: '這裡有幾個十？',
      hint: '一條長條代表一個十。',
      explanation: `十位是 ${tens}，所以有 ${tens} 個十。`,
      answer: String(tens),
      options: numberOptions(tens, { min: 1, max: 10 }),
      visual: { type: 'baseTen', tens, ones },
    };
  },
  () => {
    const tens = randInt(1, 9);
    const ones = randInt(1, 9);
    return {
      prompt: '這裡有幾個一？',
      speak: '這裡有幾個一？',
      hint: '一個小方塊代表一個一。',
      explanation: `個位是 ${ones}，所以有 ${ones} 個一。`,
      answer: String(ones),
      options: numberOptions(ones, { min: 1, max: 9 }),
      visual: { type: 'baseTen', tens, ones },
    };
  },
];

const MEASURE_OBJECTS = [
  { name: '毛毛蟲', emoji: '🐛', measure: '這隻' },
  { name: '小蛇', emoji: '🐍', measure: '這條' },
  { name: '鉛筆', emoji: '✏️', measure: '這枝' },
];

const level12Templates = [
  () => {
    const units = randInt(2, 9);
    const object = pick(MEASURE_OBJECTS);
    return {
      prompt: `${object.measure}${object.name}有幾格長？`,
      speak: `${object.measure}${object.name}有幾格長？`,
      hint: '起點對準 0，再數到物品的尾巴。',
      explanation: `從 0 開始一格一格數，數到 ${units}，就是 ${units} 格長。`,
      answer: String(units),
      options: numberOptions(units, { min: 0, max: 10 }),
      visual: { type: 'ruler', units, emoji: object.emoji, maxUnits: 10 },
    };
  },
  () => {
    const units = randInt(2, 9);
    return {
      prompt: '這條緞帶有幾格長？',
      speak: '這條緞帶有幾格長？',
      hint: '起點對準 0，數到緞帶的尾巴。',
      explanation: `從 0 開始一格一格數，數到 ${units}，就是 ${units} 格長。`,
      answer: String(units),
      options: numberOptions(units, { min: 0, max: 10 }),
      visual: { type: 'ruler', units, emoji: '🎀', maxUnits: 10 },
    };
  },
  () => {
    const units = randInt(2, 9);
    return {
      prompt: `從 0 開始量，量到 ${units} 是幾格？`,
      speak: `從零開始量，量到${cn(units)}是幾格？`,
      hint: `從 0 數到 ${units}，中間有幾格呢？`,
      explanation: `從 0 量到 ${units}，走了 ${units} 格。`,
      answer: String(units),
      options: numberOptions(units, { min: 0, max: 10 }),
      visual: { type: 'ruler', units, emoji: '🎀', maxUnits: 10 },
    };
  },
  () => {
    const first = randInt(2, 6);
    const second = randInt(2, Math.min(5, 9 - first));
    const units = first + second;
    return {
      prompt: `這條緞帶長 ${first} 格，再加上 ${second} 格，一共幾格？`,
      speak: `這條緞帶長${cn(first)}格，再加上${cn(second)}格，一共幾格？`,
      hint: `先算 ${first} 加 ${second}，就是總格數。`,
      explanation: `${first} 加 ${second} 等於 ${units}，所以一共 ${units} 格。`,
      answer: String(units),
      options: numberOptions(units, { min: 0, max: 10 }),
      visual: { type: 'ruler', units, emoji: '🎀', maxUnits: 10 },
    };
  },
];

export const island3 = {
  id: 3,
  name: '雲端進階篇',
  emoji: '☁️',
  theme: 'cloud',
  color: '#7c8cf8',
  blurb: '學會湊十與破十，認識十位個位，再用方格尺量一量。',
  levels: [
    {
      id: 9,
      island: 3,
      title: '湊十法進位加',
      emoji: '🐠',
      skill: '20 以內進位加法',
      intro: '把數字拆一拆、湊成十，進位加法就變得超簡單！一起來試試看。',
      makeQuestions(count = 6) {
        return buildQuestions(count, level9Templates);
      },
    },
    {
      id: 10,
      island: 3,
      title: '雲端退位戰',
      emoji: '☁️',
      skill: '20 以內退位減法',
      intro: '先從十裡面拿掉一些，再把剩下的一加回來，退位減法一點都不難。',
      makeQuestions(count = 6) {
        return buildQuestions(count, level10Templates);
      },
    },
    {
      id: 11,
      island: 3,
      title: '幾個十和幾個一',
      emoji: '🧱',
      skill: '100 以內位值',
      intro: '一條長條是一個十，一個小方塊是一個一，一起來認識十位和個位。',
      makeQuestions(count = 6) {
        return buildQuestions(count, level11Templates);
      },
    },
    {
      id: 12,
      island: 3,
      title: '量量看有多長',
      emoji: '📏',
      skill: '方格尺測量',
      intro: '把物品的起點對準 0，一格一格數，就知道它有多長了。',
      makeQuestions(count = 6) {
        return buildQuestions(count, level12Templates);
      },
    },
  ],
};
