import {
  randInt,
  pick,
  shuffle,
  numberOptions,
  textOptions,
  sampleDistinct,
  WEEKDAYS,
  weekdayIndex,
  toChineseNumber,
} from '../utils.js';

const cn = toChineseNumber;

function buildQuestions(templates, count = 6) {
  const questions = [];
  const seenPrompts = new Set();
  const occurrences = new Map();
  let bag = [];
  let guard = 0;

  while (questions.length < count && guard < 2000) {
    guard += 1;
    if (bag.length === 0) bag = shuffle(templates);
    const template = bag.pop();
    const occurrence = occurrences.get(template) || 0;
    occurrences.set(template, occurrence + 1);
    const question = template(occurrence);
    if (seenPrompts.has(question.prompt)) continue;
    seenPrompts.add(question.prompt);
    questions.push(question);
  }

  if (questions.length < count) {
    throw new Error('無法產生足夠且不重複的題目');
  }
  return questions;
}

function numericQuestion({ prompt, speak, hint, explanation, answer, options, visual, optionEmojis }) {
  return {
    prompt,
    speak,
    hint,
    explanation,
    answer: String(answer),
    options: options.map(String),
    ...(optionEmojis ? { optionEmojis } : {}),
    visual,
  };
}

/* ------------------------------------------------------------------ */
/* 第 13 關：台灣小老闆（錢幣）                                        */
/* ------------------------------------------------------------------ */

function makeCoins() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const list = [];
    const fifty = randInt(0, 1);
    const ten = randInt(0, 4);
    const five = randInt(0, 3);
    const one = randInt(0, 5);
    for (let index = 0; index < fifty; index += 1) list.push(50);
    for (let index = 0; index < ten; index += 1) list.push(10);
    for (let index = 0; index < five; index += 1) list.push(5);
    for (let index = 0; index < one; index += 1) list.push(1);
    const total = list.reduce((sum, coin) => sum + coin, 0);
    if (list.length >= 2 && list.length <= 8 && total >= 5 && total <= 100) {
      return list.sort((a, b) => b - a);
    }
  }
  return [50, 10, 5];
}

const COIN_SUM_PROMPTS = [
  '這些硬幣一共是多少元？',
  '請數一數，這些硬幣一共有多少元？',
  '把這些硬幣加起來，總共是多少元？',
  '小老闆數硬幣，全部合起來是幾元？',
  '看看錢盤裡的硬幣，一共是多少元？',
  '請算出這些硬幣的總金額。',
];

const CHANGE_ITEMS = [
  { name: '鉛筆', price: 15 },
  { name: '橡皮擦', price: 12 },
  { name: '尺', price: 18 },
  { name: '貼紙', price: 8 },
];

const BIG_CHANGE_ITEMS = [
  { name: '玩具車', price: 25 },
  { name: '故事書', price: 35 },
  { name: '鉛筆盒', price: 45 },
];

const SPEND_ITEMS = [
  { name: '飲料', price: 12 },
  { name: '玩具', price: 25 },
  { name: '故事書', price: 40 },
  { name: '鉛筆', price: 15 },
  { name: '貼紙', price: 8 },
];

const COIN_TEMPLATES = [
  function coinTotal(occurrence) {
    const list = makeCoins();
    const total = list.reduce((sum, coin) => sum + coin, 0);
    return numericQuestion({
      prompt: COIN_SUM_PROMPTS[occurrence % COIN_SUM_PROMPTS.length],
      speak: '這些硬幣一共是多少元？',
      hint: '先數大硬幣，再數小硬幣。',
      explanation: `${list.join(' + ')} = ${total}（元）。`,
      answer: total,
      options: numberOptions(total, { min: 0, max: 100 }),
      visual: { type: 'coins', coins: list },
    });
  },

  function changeFromTwenty() {
    const item = pick(CHANGE_ITEMS);
    const change = 20 - item.price;
    return numericQuestion({
      prompt: `買 ${item.price} 元的${item.name}，付了 20 元，要找回幾元？`,
      speak: `買${cn(item.price)}元的${item.name}，付了二十元，要找回幾元？`,
      hint: '付的錢減掉價錢，就是找回的錢。',
      explanation: `付了 20 元，${item.name} ${item.price} 元：20 − ${item.price} = ${change}（元）。`,
      answer: change,
      options: numberOptions(change, { min: 0, max: 20 }),
      visual: { type: 'coins', coins: [10, 10] },
    });
  },

  function exchangeFifty(occurrence) {
    const prompts = [
      '50 元可以換成幾個 10 元？',
      '把 50 元全部換成 10 元硬幣，可以換成幾個？',
      '50 元裡面有幾個 10 元？',
      '一個 50 元硬幣，可以換成幾個 10 元硬幣？',
    ];
    return numericQuestion({
      prompt: prompts[occurrence % prompts.length],
      speak: '五十元可以換成幾個十元？',
      hint: '十元、二十元、三十元……數數看。',
      explanation: '10 + 10 + 10 + 10 + 10 = 50（元），所以可以換 5 個。',
      answer: 5,
      options: numberOptions(5, { min: 1, max: 10 }),
      visual: { type: 'coins', coins: [10, 10, 10, 10, 10] },
    });
  },

  function spendFromPurse() {
    const item = pick(SPEND_ITEMS);
    let list = makeCoins();
    let total = list.reduce((sum, coin) => sum + coin, 0);
    let guard = 0;
    while (total <= item.price && guard < 50) {
      guard += 1;
      list = makeCoins();
      total = list.reduce((sum, coin) => sum + coin, 0);
    }
    if (total <= item.price) {
      list = [50, 10, 5];
      total = 65;
    }
    const left = total - item.price;
    return numericQuestion({
      prompt: `小美有 ${total} 元，買了 ${item.price} 元的${item.name}，還剩幾元？`,
      speak: `小美有${cn(total)}元，買了${cn(item.price)}元的${item.name}，還剩幾元？`,
      hint: '用全部的錢減掉花掉的錢。',
      explanation: `${total} − ${item.price} = ${left}（元）。`,
      answer: left,
      options: numberOptions(left, { min: 0, max: 100 }),
      visual: { type: 'coins', coins: list },
    });
  },

  function changeFromFifty() {
    const item = pick(BIG_CHANGE_ITEMS);
    const change = 50 - item.price;
    return numericQuestion({
      prompt: `買 ${item.price} 元的${item.name}，付了 50 元，要找回幾元？`,
      speak: `買${cn(item.price)}元的${item.name}，付了五十元，要找回幾元？`,
      hint: '五十元減掉價錢，就是找回的錢。',
      explanation: `付了 50 元，${item.name} ${item.price} 元：50 − ${item.price} = ${change}（元）。`,
      answer: change,
      options: numberOptions(change, { min: 0, max: 50 }),
      visual: { type: 'coins', coins: [50] },
    });
  },

  function countTenCoins() {
    const count = randInt(2, 5);
    const total = count * 10;
    const coins = Array.from({ length: count }, () => 10);
    return numericQuestion({
      prompt: `有 ${count} 個 10 元硬幣，一共是多少元？`,
      speak: `有${cn(count)}個十元硬幣，一共是多少元？`,
      hint: '一個十元，兩個十元……',
      explanation: `${coins.join(' + ')} = ${total}（元）。`,
      answer: total,
      options: numberOptions(total, { min: 0, max: 100 }),
      visual: { type: 'coins', coins },
    });
  },
];

/* ------------------------------------------------------------------ */
/* 第 14 關：太空二位數加減                                            */
/* ------------------------------------------------------------------ */

function makeNoCarryAdd() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const aTens = randInt(1, 7);
    const bTens = randInt(1, 9 - aTens);
    const aOnes = randInt(0, 8);
    const bOnes = randInt(0, 9 - aOnes);
    const a = aTens * 10 + aOnes;
    const b = bTens * 10 + bOnes;
    if (a >= 11 && b >= 11 && a <= 89 && b <= 89 && a + b <= 99) return { a, b };
  }
  return { a: 23, b: 14 };
}

function makeNoBorrowSub() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const aTens = randInt(2, 8);
    const bTens = randInt(1, aTens);
    const aOnes = randInt(0, 9);
    const bOnes = randInt(0, aOnes);
    const a = aTens * 10 + aOnes;
    const b = bTens * 10 + bOnes;
    if (a >= b && b >= 11 && a <= 89) return { a, b };
  }
  return { a: 56, b: 32 };
}

const SPACE_ADD_SCENES = [
  { place: '太空船', item: '燃料棒', unit: '個' },
  { place: '太空站', item: '氧氣瓶', unit: '個' },
  { place: '月球基地', item: '星星糖', unit: '顆' },
  { place: '火箭', item: '電池', unit: '個' },
  { place: '太空艙', item: '罐頭', unit: '罐' },
];

const SPACE_SUB_SCENES = [
  { place: '太空站', item: '星星糖', unit: '顆' },
  { place: '太空船', item: '能量餅乾', unit: '片' },
  { place: '月球基地', item: '氧氣瓶', unit: '個' },
  { place: '火箭', item: '燃料棒', unit: '根' },
];

const SPACE_NAMES = ['小星', '小月', '小宇', '小光'];

const SPACE_TEMPLATES = [
  function addEquation() {
    const { a, b } = makeNoCarryAdd();
    return numericQuestion({
      prompt: `${a} 加 ${b} 等於多少？`,
      speak: `${cn(a)}加${cn(b)}等於多少？`,
      hint: '個位加個位，十位加十位。',
      explanation: `${a} + ${b} = ${a + b}。`,
      answer: a + b,
      options: numberOptions(a + b, { min: 0, max: 100 }),
      visual: { type: 'verticalMath', a, b, op: '+', showAnswer: false },
    });
  },

  function subtractEquation() {
    const { a, b } = makeNoBorrowSub();
    return numericQuestion({
      prompt: `${a} 減 ${b} 等於多少？`,
      speak: `${cn(a)}減${cn(b)}等於多少？`,
      hint: '個位減個位，十位減十位。',
      explanation: `${a} − ${b} = ${a - b}。`,
      answer: a - b,
      options: numberOptions(a - b, { min: 0, max: 100 }),
      visual: { type: 'verticalMath', a, b, op: '-', showAnswer: false },
    });
  },

  function addStory() {
    const { a, b } = makeNoCarryAdd();
    const scene = pick(SPACE_ADD_SCENES);
    return numericQuestion({
      prompt: `${scene.place}上有 ${a} ${scene.unit}${scene.item}，又送來 ${b} ${scene.unit}${scene.item}，一共有多少${scene.unit}？`,
      speak: `${scene.place}上有${cn(a)}${scene.unit}${scene.item}，又送來${cn(b)}${scene.unit}${scene.item}，一共有多少${scene.unit}？`,
      hint: '原來的數量加上送來的數量。',
      explanation: `${a} + ${b} = ${a + b}（${scene.unit}）。`,
      answer: a + b,
      options: numberOptions(a + b, { min: 0, max: 100 }),
      visual: { type: 'verticalMath', a, b, op: '+', showAnswer: false },
    });
  },

  function subtractStory() {
    const { a, b } = makeNoBorrowSub();
    const scene = pick(SPACE_SUB_SCENES);
    return numericQuestion({
      prompt: `${scene.place}原本有 ${a} ${scene.unit}${scene.item}，送出 ${b} ${scene.unit}，還剩多少${scene.unit}？`,
      speak: `${scene.place}原本有${cn(a)}${scene.unit}${scene.item}，送出${cn(b)}${scene.unit}，還剩多少${scene.unit}？`,
      hint: '用原本的數量減掉送出的數量。',
      explanation: `${a} − ${b} = ${a - b}（${scene.unit}）。`,
      answer: a - b,
      options: numberOptions(a - b, { min: 0, max: 100 }),
      visual: { type: 'verticalMath', a, b, op: '-', showAnswer: false },
    });
  },

  function stickerAddStory() {
    const { a, b } = makeNoCarryAdd();
    const [first, second] = sampleDistinct(SPACE_NAMES, 2);
    return numericQuestion({
      prompt: `太空人${first}收集了 ${a} 張貼紙，太空人${second}收集了 ${b} 張，兩人一共有幾張？`,
      speak: `太空人${first}收集了${cn(a)}張貼紙，太空人${second}收集了${cn(b)}張，兩人一共有幾張？`,
      hint: '把兩人的貼紙合起來。',
      explanation: `${a} + ${b} = ${a + b}（張）。`,
      answer: a + b,
      options: numberOptions(a + b, { min: 0, max: 100 }),
      visual: { type: 'verticalMath', a, b, op: '+', showAnswer: false },
    });
  },

  function stickerSubtractStory() {
    const { a, b } = makeNoBorrowSub();
    const [first, second] = sampleDistinct(SPACE_NAMES, 2);
    return numericQuestion({
      prompt: `太空人${first}有 ${a} 張太空貼紙，送給${second} ${b} 張，還剩幾張？`,
      speak: `太空人${first}有${cn(a)}張太空貼紙，送給${second}${cn(b)}張，還剩幾張？`,
      hint: '送出去的要扣掉。',
      explanation: `${a} − ${b} = ${a - b}（張）。`,
      answer: a - b,
      options: numberOptions(a - b, { min: 0, max: 100 }),
      visual: { type: 'verticalMath', a, b, op: '-', showAnswer: false },
    });
  },
];

/* ------------------------------------------------------------------ */
/* 第 15 關：星空日曆與統計                                            */
/* ------------------------------------------------------------------ */

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const FRUITS = [
  { label: '蘋果', emoji: '🍎' },
  { label: '香蕉', emoji: '🍌' },
  { label: '草莓', emoji: '🍓' },
  { label: '芒果', emoji: '🥭' },
  { label: '葡萄', emoji: '🍇' },
  { label: '西瓜', emoji: '🍉' },
];

function makeCalendar() {
  const month = randInt(1, 12);
  const days = MONTH_DAYS[month - 1];
  const startWeekday = randInt(0, 6);
  const highlight = randInt(1, days);
  return { month, days, startWeekday, highlight };
}

function makeFruitTable() {
  const fruits = sampleDistinct(FRUITS, 4);
  const counts = sampleDistinct([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4).map(Number);
  const rows = fruits.map((fruit, index) => ({
    label: fruit.label,
    emoji: fruit.emoji,
    values: [counts[index]],
  }));
  return {
    fruits,
    counts,
    labels: fruits.map((fruit) => fruit.label),
    emojiByLabel: Object.fromEntries(fruits.map((fruit) => [fruit.label, fruit.emoji])),
    visual: {
      type: 'table',
      title: '水果數量統計表',
      columns: [{ label: '數量', emoji: '🔢' }],
      rows,
    },
  };
}

const CALENDAR_TEMPLATES = [
  function weekdayQuestion() {
    const { month, days, startWeekday, highlight } = makeCalendar();
    const answer = WEEKDAYS[weekdayIndex(startWeekday, highlight)];
    return numericQuestion({
      prompt: `${month} 月 ${highlight} 日是星期幾？`,
      speak: `${cn(month)}月${cn(highlight)}日是星期幾？`,
      hint: '從 1 日開始往後數一數。',
      explanation: highlight === 1
        ? `${month} 月 1 日就是${WEEKDAYS[startWeekday]}。`
        : `${month} 月 1 日是${WEEKDAYS[startWeekday]}，往後數 ${highlight - 1} 天，${highlight} 日就是${answer}。`,
      answer,
      options: textOptions(answer, WEEKDAYS, 4),
      visual: { type: 'calendar', month, highlight, startWeekday, days },
    });
  },

  function daysInMonthQuestion() {
    const { month, days, startWeekday } = makeCalendar();
    return numericQuestion({
      prompt: `${month} 月有幾天？`,
      speak: `${cn(month)}月有幾天？`,
      hint: '想想這個月是大月還是小月。',
      explanation: `一年中，${month} 月有 ${days} 天。`,
      answer: days,
      options: numberOptions(days, { min: 28, max: 31 }),
      visual: { type: 'calendar', month, highlight: 1, startWeekday, days },
    });
  },

  function mostFruitQuestion(occurrence) {
    const { counts, labels, emojiByLabel, visual } = makeFruitTable();
    const maxIndex = counts.indexOf(Math.max(...counts));
    const answer = labels[maxIndex];
    const options = textOptions(answer, labels, 4);
    const prompts = [
      '哪一種水果最多？',
      '看統計表，哪一種水果的數量最多？',
      '統計表裡，哪一種水果最多？',
    ];
    return numericQuestion({
      prompt: prompts[occurrence % prompts.length],
      speak: '哪一種水果最多？',
      hint: '比較每一種水果的數量。',
      explanation: `${answer}有 ${counts[maxIndex]} 個，是四種水果裡最多的。`,
      answer,
      options,
      optionEmojis: options.map((option) => emojiByLabel[option]),
      visual,
    });
  },

  function fruitDifferenceQuestion() {
    const { counts, labels, visual } = makeFruitTable();
    const pairs = [];
    for (let first = 0; first < counts.length; first += 1) {
      for (let second = 0; second < counts.length; second += 1) {
        if (counts[first] > counts[second]) pairs.push([first, second]);
      }
    }
    const [more, fewer] = pick(pairs);
    const answer = counts[more] - counts[fewer];
    return numericQuestion({
      prompt: `${labels[more]}比${labels[fewer]}多幾個？`,
      speak: `${labels[more]}比${labels[fewer]}多幾個？`,
      hint: '用多的數量減掉少的數量。',
      explanation: `${labels[more]}有 ${counts[more]} 個，${labels[fewer]}有 ${counts[fewer]} 個：${counts[more]} − ${counts[fewer]} = ${answer}（個）。`,
      answer,
      options: numberOptions(answer, { min: 0, max: 20 }),
      visual,
    });
  },

  function fruitTotalQuestion(occurrence) {
    const { counts, labels, visual } = makeFruitTable();
    const total = counts.reduce((sum, value) => sum + value, 0);
    const prompts = [
      '四種水果一共有幾個？',
      '把四種水果加起來，一共是幾個？',
      '統計表上的水果全部合起來，有幾個？',
    ];
    return numericQuestion({
      prompt: prompts[occurrence % prompts.length],
      speak: '四種水果一共有幾個？',
      hint: '把四個數量全部加起來。',
      explanation: `${labels.map((label, index) => `${label} ${counts[index]} 個`).join('、')}，合起來是 ${total} 個。`,
      answer: total,
      options: numberOptions(total, { min: 0, max: 40 }),
      visual,
    });
  },

  function leastFruitQuestion(occurrence) {
    const { counts, labels, emojiByLabel, visual } = makeFruitTable();
    const minIndex = counts.indexOf(Math.min(...counts));
    const answer = labels[minIndex];
    const options = textOptions(answer, labels, 4);
    const prompts = [
      '哪一種水果最少？',
      '看統計表，哪一種水果的數量最少？',
      '統計表裡，哪一種水果最少？',
    ];
    return numericQuestion({
      prompt: prompts[occurrence % prompts.length],
      speak: '哪一種水果最少？',
      hint: '比較每一種水果的數量。',
      explanation: `${answer}有 ${counts[minIndex]} 個，是四種水果裡最少的。`,
      answer,
      options,
      optionEmojis: options.map((option) => emojiByLabel[option]),
      visual,
    });
  },
];

/* ------------------------------------------------------------------ */
/* 第 16 關：生活應用題大魔王                                          */
/* ------------------------------------------------------------------ */

const PEOPLE_NAMES = ['小明', '小美', '小華', '小安', '小芸', '品妤', '宇宸', '阿宏'];

const SHOP_ITEMS = [
  { name: '鉛筆', emoji: '✏️', price: 12 },
  { name: '橡皮擦', emoji: '🧽', price: 10 },
  { name: '尺', emoji: '📏', price: 14 },
  { name: '筆記本', emoji: '📒', price: 25 },
  { name: '飲料', emoji: '🥤', price: 13 },
  { name: '貼紙', emoji: '⭐', price: 11 },
  { name: '球', emoji: '⚽', price: 30 },
  { name: '故事書', emoji: '📚', price: 22 },
  { name: '膠水', emoji: '🧴', price: 10 },
  { name: '蠟筆', emoji: '🖍️', price: 21 },
];

const MONEY_ITEMS = [
  { name: '飲料', emoji: '🥤' },
  { name: '玩具', emoji: '🧸' },
  { name: '故事書', emoji: '📚' },
  { name: '文具', emoji: '✏️' },
];

function makeShopPair() {
  const pairs = [];
  for (let first = 0; first < SHOP_ITEMS.length; first += 1) {
    for (let second = first + 1; second < SHOP_ITEMS.length; second += 1) {
      const a = SHOP_ITEMS[first].price;
      const b = SHOP_ITEMS[second].price;
      if ((a % 10) + (b % 10) <= 9 && Math.floor(a / 10) + Math.floor(b / 10) <= 9) {
        pairs.push([SHOP_ITEMS[first], SHOP_ITEMS[second]]);
      }
    }
  }
  return pick(pairs);
}

function makeMoneySpend() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const total = randInt(21, 89);
    const price = randInt(10, total - 1);
    if (total % 10 >= price % 10 && Math.floor(total / 10) >= Math.floor(price / 10)) {
      return { total, price, answer: total - price };
    }
  }
  return { total: 35, price: 12, answer: 23 };
}

const LIFE_TEMPLATES = [
  function queueQuestion() {
    const name = pick(PEOPLE_NAMES);
    const front = randInt(2, 9);
    const behind = randInt(2, 9);
    const total = front + behind + 1;
    const emojis = [...Array(front).fill('🧒'), '🧒', ...Array(behind).fill('🧒')];
    return numericQuestion({
      prompt: `排隊買冰淇淋，${name}前面有 ${front} 個人，後面有 ${behind} 個人，這一排一共有幾個人？`,
      speak: `排隊買冰淇淋，${name}前面有${cn(front)}個人，後面有${cn(behind)}個人，這一排一共有幾個人？`,
      hint: '別忘了把排隊的自己也算進去！',
      explanation: `前面 ${front} 人，加上${name} 1 人，後面 ${behind} 人：${front} + 1 + ${behind} = ${total}（人）。`,
      answer: total,
      options: numberOptions(total, { min: 0, max: 30 }),
      visual: { type: 'scene', emojis, text: '' },
    });
  },

  function shoppingQuestion() {
    const [first, second] = makeShopPair();
    const total = first.price + second.price;
    return numericQuestion({
      prompt: `${first.name} ${first.price} 元，${second.name} ${second.price} 元，一共要付幾元？`,
      speak: `${first.name}${cn(first.price)}元，${second.name}${cn(second.price)}元，一共要付幾元？`,
      hint: '把兩樣東西的價錢加起來。',
      explanation: `${first.price} + ${second.price} = ${total}（元）。`,
      answer: total,
      options: numberOptions(total, { min: 0, max: 100 }),
      visual: { type: 'scene', emojis: [first.emoji, '➕', second.emoji], text: '' },
    });
  },

  function dumplingQuestion() {
    const total = randInt(11, 18);
    const eaten = randInt(1, total % 10);
    const left = total - eaten;
    return numericQuestion({
      prompt: `一盤水餃有 ${total} 個，吃了 ${eaten} 個，還剩幾個？`,
      speak: `一盤水餃有${cn(total)}個，吃了${cn(eaten)}個，還剩幾個？`,
      hint: '用原本的數量減掉吃掉的。',
      explanation: `${total} − ${eaten} = ${left}（個）。`,
      answer: left,
      options: numberOptions(left, { min: 0, max: 20 }),
      visual: { type: 'scene', emojis: Array(total).fill('🥟'), text: '' },
    });
  },

  function starQuestion() {
    const total = randInt(12, 19);
    const flew = randInt(1, total % 10);
    const left = total - flew;
    return numericQuestion({
      prompt: `樹上有 ${total} 顆星星，飛走了 ${flew} 顆，還剩幾顆？`,
      speak: `樹上有${cn(total)}顆星星，飛走了${cn(flew)}顆，還剩幾顆？`,
      hint: '飛走的星星要扣掉。',
      explanation: `${total} − ${flew} = ${left}（顆）。`,
      answer: left,
      options: numberOptions(left, { min: 0, max: 20 }),
      visual: { type: 'scene', emojis: ['🌳', ...Array(total).fill('✨')], text: '' },
    });
  },

  function chairQuestion() {
    const { a, b } = makeNoCarryAdd();
    return numericQuestion({
      prompt: `教室裡有 ${a} 張椅子，又搬來 ${b} 張，一共有幾張？`,
      speak: `教室裡有${cn(a)}張椅子，又搬來${cn(b)}張，一共有幾張？`,
      hint: '把原來的和搬來的加起來。',
      explanation: `${a} + ${b} = ${a + b}（張）。`,
      answer: a + b,
      options: numberOptions(a + b, { min: 0, max: 100 }),
      visual: { type: 'scene', emojis: ['💺', '💺', '💺', '➕', '💺', '💺'], text: '' },
    });
  },

  function moneyQuestion() {
    const name = pick(PEOPLE_NAMES);
    const item = pick(MONEY_ITEMS);
    const { total, price, answer } = makeMoneySpend();
    return numericQuestion({
      prompt: `${name}有 ${total} 元，買了 ${price} 元的${item.name}，還剩幾元？`,
      speak: `${name}有${cn(total)}元，買了${cn(price)}元的${item.name}，還剩幾元？`,
      hint: '用原有的錢減掉花掉的錢。',
      explanation: `${total} − ${price} = ${answer}（元）。`,
      answer,
      options: numberOptions(answer, { min: 0, max: 100 }),
      visual: { type: 'scene', emojis: ['💵', item.emoji], text: '' },
    });
  },
];

/* ------------------------------------------------------------------ */
/* 模組輸出                                                            */
/* ------------------------------------------------------------------ */

export const island4 = {
  id: 4,
  name: '星空魔王篇',
  emoji: '🚀',
  theme: 'space',
  color: '#8b5cf6',
  blurb: '認識台灣錢幣、二位數加減、日曆統計，挑戰生活應用題大魔王！',
  levels: [
    {
      id: 13,
      island: 4,
      title: '台灣小老闆',
      emoji: '🟡',
      skill: '認識 1、5、10、50 元硬幣與付錢找錢',
      intro: '星星市場開張了！快來當小老闆，數硬幣、找零錢，把每一筆買賣都算清楚。',
      makeQuestions(count = 6) {
        return buildQuestions(COIN_TEMPLATES, count);
      },
    },
    {
      id: 14,
      island: 4,
      title: '太空二位數加減',
      emoji: '🛰️',
      skill: '二位數不進位加法與不退位減法',
      intro: '太空任務需要精準計算！個位對個位、十位對十位，幫太空船補給不出錯。',
      makeQuestions(count = 6) {
        return buildQuestions(SPACE_TEMPLATES, count);
      },
    },
    {
      id: 15,
      island: 4,
      title: '星空日曆與統計',
      emoji: '📅',
      skill: '看日曆找星期與讀統計表',
      intro: '翻開星空日曆，看看星星排在哪一天，再讀統計表找出水果數量的小秘密。',
      makeQuestions(count = 6) {
        return buildQuestions(CALENDAR_TEMPLATES, count);
      },
    },
    {
      id: 16,
      island: 4,
      title: '生活應用題大魔王',
      emoji: '👑',
      skill: '綜合生活情境的加減應用',
      intro: '最終大魔王登場！排隊、買東西、數水餃，用加減法解決生活裡的每一個問題。',
      makeQuestions(count = 6) {
        return buildQuestions(LIFE_TEMPLATES, count);
      },
    },
  ],
};
