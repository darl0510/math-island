export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export function uniqueValues(values) {
  return [...new Set(values.map(String))];
}

/** 產生 4 個不重複的數字選項（包含正解），並隨機排序。 */
export function numberOptions(answer, { min = 0, max = 20, distractors = 3 } = {}) {
  const values = new Set([Number(answer)]);
  let guard = 0;
  while (values.size < distractors + 1 && guard < 80) {
    guard += 1;
    const delta = pick([-3, -2, -1, 1, 2, 3, 4, -4]);
    const candidate = Number(answer) + delta;
    if (candidate >= min && candidate <= max) values.add(candidate);
  }
  let fallback = min;
  while (values.size < distractors + 1 && fallback <= max) {
    values.add(fallback);
    fallback += 1;
  }
  return shuffle([...values]).map(String);
}

/** 產生文字選項（包含正解），可指定干擾選項。 */
export function textOptions(answer, pool, count = 4) {
  const values = [String(answer), ...shuffle(pool.filter((item) => String(item) !== String(answer))).slice(0, count - 1).map(String)];
  return shuffle(uniqueValues(values));
}

export function sampleDistinct(values, count) {
  return shuffle(values).slice(0, count);
}

export const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
export const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

export function weekdayIndex(startWeekday, day) {
  return (startWeekday + day - 1) % 7;
}

export function toChineseNumber(value) {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return String(value);
  if (n < 10) return digits[n];
  if (n === 10) return '十';
  if (n < 20) return `十${digits[n % 10]}`;
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return `${digits[tens]}十${ones ? digits[ones] : ''}`;
  }
  if (n === 100) return '一百';
  return String(n);
}

/** 把阿拉伯數字轉成適合 TTS 朗讀的中文（保留其他文字）。 */
export function speakNumbers(text) {
  return String(text)
    .replace(/(\d+)\s*\+\s*(\d+)/g, (_, a, b) => `${toChineseNumber(a)} 加 ${toChineseNumber(b)}`)
    .replace(/(\d+)\s*-\s*(\d+)/g, (_, a, b) => `${toChineseNumber(a)} 減 ${toChineseNumber(b)}`)
    .replace(/(\d+)\s*=\s*/g, (_, a) => `${toChineseNumber(a)} 等於 `)
    .replace(/\d+/g, (value) => toChineseNumber(value));
}
