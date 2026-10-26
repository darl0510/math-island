/**
 * 共用視覺教具。所有關卡都透過 renderVisual(visual) 產生畫面。
 * visual 規格（type 必填）：
 *  tenFrame       { count, emoji }
 *  doubleTenFrame { count, emoji, split }
 *  compareGroups  { left, right, leftEmoji, rightEmoji, paired }
 *  ordinalLine    { items:[emoji], direction:'left'|'right', showNumbers, label }
 *  numberBond     { whole, left, right, missing:'left'|'right'|'whole', unit }
 *  addSubScene    { a, b, op:'+'|'-', emoji }
 *  clock          { hour, minute }
 *  baseTen        { tens, ones }
 *  shapeScene     { shapes:[{type,x,y,size,color,rotate,w,h}], width, height }
 *  ruler          { units, emoji, maxUnits }
 *  coins          { coins:[1,5,10,50] }
 *  verticalMath   { a, b, op, showAnswer }
 *  calendar       { month, highlight, startWeekday, days, today }
 *  table          { title, columns:[{label,emoji}], rows:[{label,emoji,values:[]}] }
 *  scene          { emojis:[], text }
 *  numberLine     { max, marks:[], from, to }
 */

import { audio } from './audio.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function speakText(text) {
  if (!text) return;
  try {
    if (audio && typeof audio.speak === 'function') {
      audio.playSfx?.('click', 0.35);
      audio.speak(text);
      return;
    }
  } catch (e) {}
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-TW';
      u.rate = 0.88;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
}

export function node(tag, className, html) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (html !== undefined) element.innerHTML = html;
  return element;
}

function svg(tag, attrs = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
  return element;
}

export function renderVisual(visual, question = null) {
  if (!visual) return null;
  const renderers = {
    tenFrame,
    doubleTenFrame,
    compareGroups,
    ordinalLine,
    numberBond,
    addSubScene,
    makeTenBoard,
    breakTenBoard,
    clock,
    baseTen,
    shapeScene,
    ruler,
    coins,
    verticalMath,
    calendar,
    table,
    scene,
    numberLine,
    fraction,
    angle,
    barChart,
    chinese,
    phonetic,
    strokeOrder: (v, q) => strokeOrderVisual(v, q),
    englishPhonics,
    englishSpelling,
    english: (v, q) => englishVisual(v, q),
    phonicsCard: (v, q) => englishPhonics(v, q),
    spellingBoard: (v, q) => englishSpelling(v, q),
    letterPhonics: (v, q) => englishPhonics(v, q),
    englishWord: (v, q) => englishVisual(v, q),
  };
  const renderer = renderers[visual.type];
  if (!renderer) {
    return node('div', 'visual visual-missing', `（未知教具：${String(visual.type)}）`);
  }
  const element = renderer(visual, question);
  element.classList.add('visual', `visual-${visual.type}`);
  return element;
}

export function tenFrame({ count = 0, emoji = '🍎' }) {
  const wrap = node('div', 'ten-frame-wrap');
  const frame = node('div', 'ten-frame');
  for (let index = 0; index < 10; index += 1) {
    const cell = node('div', 'ten-cell');
    if (index < count) {
      const chip = node('span', 'ten-chip');
      chip.textContent = emoji;
      chip.style.animationDelay = `${index * 55}ms`;
      cell.appendChild(chip);
    }
    frame.appendChild(cell);
  }
  wrap.appendChild(frame);
  wrap.appendChild(node('div', 'visual-caption', '十格陣列：一排 5 個，比較好數喔！'));
  return wrap;
}

export function doubleTenFrame({ count = 0, emoji = '🐚', split }) {
  const wrap = node('div', 'double-ten-wrap');
  const frames = node('div', 'double-ten');
  for (let frameIndex = 0; frameIndex < 2; frameIndex += 1) {
    const frame = node('div', 'ten-frame');
    if (split !== undefined && frameIndex === 1) frame.classList.add('ten-frame-split');
    for (let index = 0; index < 10; index += 1) {
      const cell = node('div', 'ten-cell');
      const absolute = frameIndex * 10 + index;
      if (absolute < count) {
        const chip = node('span', 'ten-chip');
        chip.textContent = emoji;
        chip.style.animationDelay = `${absolute * 35}ms`;
        cell.appendChild(chip);
      }
      frame.appendChild(cell);
    }
    frames.appendChild(frame);
  }
  wrap.appendChild(frames);
  wrap.appendChild(node('div', 'visual-caption', '兩個十格：先裝滿第一個 10，再數第二個。'));
  return wrap;
}

export function compareGroups({
  left = 0,
  right = 0,
  leftEmoji = '🍓',
  rightEmoji = '🍒',
  paired = true,
}) {
  const wrap = node('div', 'compare-wrap');
  const board = node('div', 'compare-board');
  const columnA = groupColumn(left, leftEmoji, 'left');
  const columnB = groupColumn(right, rightEmoji, 'right');
  board.appendChild(columnA);
  board.appendChild(node('div', 'compare-versus', 'VS'));
  board.appendChild(columnB);
  if (paired) board.classList.add('paired');
  wrap.appendChild(board);
  wrap.appendChild(node('div', 'visual-caption', '可以一對一連連看，就知道誰比較多。'));
  return wrap;
}

function groupColumn(count, emoji, side) {
  const column = node('div', `compare-column compare-${side}`);
  const chips = node('div', 'compare-chips');
  for (let index = 0; index < count; index += 1) {
    const chip = node('span', 'compare-chip');
    chip.textContent = emoji;
    chip.style.animationDelay = `${index * 45}ms`;
    chips.appendChild(chip);
  }
  column.appendChild(chips);
  column.appendChild(node('div', 'compare-count', '?'));
  return column;
}

export function ordinalLine({ items = [], direction = 'left', showNumbers = false, label = '' }) {
  const wrap = node('div', 'ordinal-wrap');
  if (label) wrap.appendChild(node('div', 'ordinal-label', label));
  const line = node('div', 'ordinal-line');
  items.forEach((item, index) => {
    const card = node('div', 'ordinal-item');
    card.appendChild(node('span', 'ordinal-emoji', item));
    if (showNumbers) card.appendChild(node('span', 'ordinal-number', String(index + 1)));
    card.style.animationDelay = `${index * 70}ms`;
    line.appendChild(card);
  });
  if (direction === 'left') line.appendChild(node('div', 'ordinal-arrow', '◀ 左邊'));
  else line.appendChild(node('div', 'ordinal-arrow', '右邊 ▶'));
  wrap.appendChild(line);
  wrap.appendChild(node('div', 'ordinal-hint-line', direction === 'left' ? '← 從左邊數過來' : '從右邊數過來 →'));
  return wrap;
}

export function numberBond({ whole = 10, left = 3, right = 7, missing = 'right', unit = '' }) {
  const wrap = node('div', 'bond-wrap');
  const board = node('div', 'bond-board');
  const value = (number) => (number === null || number === undefined ? '?' : `${number}${unit}`);
  const wholeNode = node('div', 'bond-whole', value(whole));
  if (missing === 'whole') wholeNode.classList.add('is-unknown');
  board.appendChild(wholeNode);
  board.appendChild(node('div', 'bond-stems', '<span class="bond-stem bond-stem-left"></span><span class="bond-stem bond-stem-right"></span>'));
  const parts = node('div', 'bond-parts');
  const leftNode = node('div', 'bond-part', value(left));
  const rightNode = node('div', 'bond-part', value(right));
  if (missing === 'left') leftNode.classList.add('is-unknown');
  if (missing === 'right') rightNode.classList.add('is-unknown');
  parts.append(leftNode, rightNode);
  board.appendChild(parts);
  wrap.appendChild(board);
  wrap.appendChild(node('div', 'visual-caption', '上面的數，可以分成下面兩個數。'));
  return wrap;
}

export function addSubScene({ a = 3, b = 2, op = '+', emoji = '🐠' }) {
  const wrap = node('div', 'addsub-wrap');
  const row = node('div', 'addsub-row');
  const groupA = objectGroup(a, emoji, 'group-a');
  groupA.classList.add('is-counted');
  row.appendChild(groupA);
  row.appendChild(node('div', 'addsub-sign', op));
  const groupB = objectGroup(b, emoji, 'group-b');
  if (op === '-') groupB.classList.add('crossed-out');
  row.appendChild(groupB);
  row.appendChild(node('div', 'addsub-sign', '='));
  row.appendChild(node('div', 'addsub-answer', '?'));
  wrap.appendChild(row);
  wrap.appendChild(node('div', 'visual-caption', op === '+' ? '把兩組合起來，就是加法。' : '把被劃掉的拿掉，就是減法。'));
  return wrap;
}

function objectGroup(count, emoji, className) {
  const group = node('div', `object-group ${className || ''}`);
  for (let index = 0; index < count; index += 1) {
    const chip = node('span', 'object-chip');
    chip.textContent = emoji;
    chip.style.animationDelay = `${index * 55}ms`;
    group.appendChild(chip);
  }
  if (count === 0) group.appendChild(node('span', 'object-chip empty', '—'));
  return group;
}

export function makeTenBoard({ a = 8, b = 5, emoji = '🐚' }) {
  const wrap = node('div', 'maketen-wrap');
  const board = node('div', 'maketen-board');
  const frameA = miniTenFrame(a, emoji, 'first');
  const frameB = miniTenFrame(b, emoji, 'second', Math.max(0, 10 - a));
  board.append(frameA.wrap, node('div', 'maketen-plus', '+'), frameB.wrap);
  wrap.appendChild(board);
  wrap.appendChild(node('div', 'visual-caption', `先從右邊拿 ${Math.max(0, 10 - a)} 個，把左邊湊成 10。`));
  return wrap;
}

function miniTenFrame(count, emoji, variant, highlightCount = 0) {
  const wrap = node('div', `mini-frame mini-frame-${variant}`);
  for (let index = 0; index < 10; index += 1) {
    const cell = node('div', 'ten-cell');
    if (index < count) {
      const chip = node('span', 'ten-chip');
      chip.textContent = emoji;
      if (index < highlightCount) chip.classList.add('to-move');
      cell.appendChild(chip);
    }
    wrap.appendChild(cell);
  }
  return { wrap };
}

export function breakTenBoard({ a = 13, b = 7, emoji = '🫧' }) {
  const wrap = node('div', 'breakten-wrap');
  const board = node('div', 'breakten-board');
  const tens = node('div', 'breakten-ten');
  for (let index = 0; index < 10; index += 1) {
    const cell = node('div', 'ten-cell');
    const chip = node('span', 'ten-chip');
    chip.textContent = emoji;
    if (index >= 10 - b) chip.classList.add('crossed-chip');
    cell.appendChild(chip);
    tens.appendChild(cell);
  }
  const ones = node('div', 'breakten-ones');
  for (let index = 0; index < a - 10; index += 1) {
    const chip = node('span', 'ten-chip');
    chip.textContent = emoji;
    ones.appendChild(chip);
  }
  board.append(tens, node('div', 'breakten-plus', '+'), ones);
  wrap.appendChild(board);
  wrap.appendChild(node('div', 'visual-caption', `把 10 裡面的 ${b} 個拿掉，再加上剩下的 ${a - 10} 個。`));
  return wrap;
}

export function clock({ hour = 3, minute = 0 }) {
  const wrap = node('div', 'clock-wrap');
  const size = 240;
  const center = size / 2;
  const face = svg('svg', {
    viewBox: `0 0 ${size} ${size}`,
    class: 'clock-face',
    role: 'img',
    'aria-label': `${hour}點${minute === 30 ? '半' : ''}`,
  });
  face.appendChild(svg('circle', { cx: center, cy: center, r: 112, class: 'clock-rim' }));
  face.appendChild(svg('circle', { cx: center, cy: center, r: 100, class: 'clock-dial' }));
  for (let n = 1; n <= 12; n += 1) {
    const angle = (n * 30 - 90) * (Math.PI / 180);
    const x = center + Math.cos(angle) * 80;
    const y = center + Math.sin(angle) * 80;
    const text = svg('text', { x, y: y + 7, class: 'clock-number', 'text-anchor': 'middle' });
    text.textContent = String(n);
    face.appendChild(text);
  }
  for (let tick = 0; tick < 60; tick += 1) {
    const angle = (tick * 6 - 90) * (Math.PI / 180);
    const outer = 100;
    const inner = tick % 5 === 0 ? 90 : 95;
    face.appendChild(svg('line', {
      x1: center + Math.cos(angle) * inner,
      y1: center + Math.sin(angle) * inner,
      x2: center + Math.cos(angle) * outer,
      y2: center + Math.sin(angle) * outer,
      class: tick % 5 === 0 ? 'clock-tick major' : 'clock-tick',
    }));
  }
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;
  face.appendChild(svg('line', {
    x1: center,
    y1: center,
    x2: center + Math.sin((hourAngle * Math.PI) / 180) * 52,
    y2: center - Math.cos((hourAngle * Math.PI) / 180) * 52,
    class: 'clock-hand hour-hand',
  }));
  face.appendChild(svg('line', {
    x1: center,
    y1: center,
    x2: center + Math.sin((minuteAngle * Math.PI) / 180) * 78,
    y2: center - Math.cos((minuteAngle * Math.PI) / 180) * 78,
    class: 'clock-hand minute-hand',
  }));
  face.appendChild(svg('circle', { cx: center, cy: center, r: 7, class: 'clock-center' }));
  wrap.appendChild(face);
  wrap.appendChild(node('div', 'clock-legend', '<span class="legend-short">短針</span>是時針　<span class="legend-long">長針</span>是分針'));
  return wrap;
}

export function baseTen({ tens = 0, ones = 0 }) {
  const wrap = node('div', 'baseten-wrap');
  const board = node('div', 'baseten-board');
  const tensColumn = node('div', 'baseten-column');
  tensColumn.appendChild(node('div', 'baseten-label', `十位：${tens} 條`));
  const rods = node('div', 'baseten-rods');
  for (let index = 0; index < tens; index += 1) {
    const rod = node('div', 'ten-rod');
    for (let cell = 0; cell < 10; cell += 1) rod.appendChild(node('span', 'rod-cell'));
    rods.appendChild(rod);
  }
  tensColumn.appendChild(rods);
  const onesColumn = node('div', 'baseten-column');
  onesColumn.appendChild(node('div', 'baseten-label', `個位：${ones} 個`));
  const cubes = node('div', 'baseten-cubes');
  for (let index = 0; index < ones; index += 1) cubes.appendChild(node('span', 'one-cube'));
  onesColumn.appendChild(cubes);
  board.append(tensColumn, onesColumn);
  wrap.appendChild(board);
  wrap.appendChild(node('div', 'visual-caption', '橘色長條是「十」，藍色方塊是「一」。'));
  return wrap;
}

export function shapeScene({ shapes = [], width = 520, height = 280 }) {
  const wrap = node('div', 'shape-wrap');
  const canvas = svg('svg', {
    viewBox: `0 0 ${width} ${height}`,
    class: 'shape-canvas',
    role: 'img',
    'aria-label': '圖形組合',
  });
  for (const item of shapes) canvas.appendChild(shapeSvg(item));
  wrap.appendChild(canvas);
  return wrap;
}

export function shapeSvg({
  type = 'square',
  x = 40,
  y = 40,
  size = 70,
  w,
  h,
  color = '#ff8a5c',
  rotate = 0,
  opacity = 1,
}) {
  const attrs = {
    fill: color,
    stroke: 'rgba(70, 40, 80, 0.25)',
    'stroke-width': 3,
    opacity,
    transform: rotate ? `rotate(${rotate} ${x + (w || size) / 2} ${y + (h || size) / 2})` : '',
  };
  if (type === 'circle') return svg('circle', { ...attrs, cx: x + size / 2, cy: y + size / 2, r: size / 2 });
  if (type === 'triangle') {
    return svg('polygon', { ...attrs, points: `${x + size / 2},${y} ${x + size},${y + size} ${x},${y + size}` });
  }
  if (type === 'star') {
    return svg('polygon', { ...attrs, points: starPoints(x + size / 2, y + size / 2, size / 2, size / 4.6, 5) });
  }
  if (type === 'heart') {
    return svg('path', {
      ...attrs,
      d: `M ${x + size / 2} ${y + size * 0.92} C ${x - size * 0.18} ${y + size * 0.48}, ${x + size * 0.12} ${y - size * 0.05}, ${x + size / 2} ${y + size * 0.24} C ${x + size * 0.88} ${y - size * 0.05}, ${x + size * 1.18} ${y + size * 0.48}, ${x + size / 2} ${y + size * 0.92} Z`,
    });
  }
  return svg('rect', {
    ...attrs,
    x,
    y,
    width: w || size,
    height: h || size,
    rx: type === 'square' || type === 'rectangle' ? 8 : 0,
  });
}

function starPoints(cx, cy, outer, inner, points) {
  const output = [];
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    output.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`);
  }
  return output.join(' ');
}

export function ruler({ units = 5, emoji = '🐛', maxUnits = 10 }) {
  const wrap = node('div', 'ruler-wrap');
  const stage = node('div', 'ruler-stage');
  const object = node('div', 'ruler-object', emoji);
  object.style.width = `calc(var(--cell) * ${units})`;
  stage.appendChild(object);
  const rulerEl = node('div', 'ruler');
  for (let index = 0; index < maxUnits; index += 1) {
    const cell = node('div', 'ruler-cell');
    cell.appendChild(node('span', 'ruler-number', String(index)));
    rulerEl.appendChild(cell);
  }
  rulerEl.appendChild(node('span', 'ruler-number ruler-end', String(maxUnits)));
  stage.appendChild(rulerEl);
  wrap.appendChild(stage);
  wrap.appendChild(node('div', 'visual-caption', '從 0 開始，一格一格數，看看有幾格長。'));
  return wrap;
}

export function coins({ coins: list = [] }) {
  const wrap = node('div', 'coins-wrap');
  const tray = node('div', 'coin-tray');
  for (const coin of list) {
    tray.appendChild(node('div', `coin coin-${coin}`, `<span>${coin}</span><small>元</small>`));
  }
  wrap.appendChild(tray);
  wrap.appendChild(node('div', 'visual-caption', '台灣的硬幣：1 元、5 元、10 元、50 元。'));
  return wrap;
}

export function verticalMath({ a = 23, b = 14, op = '+', showAnswer = false }) {
  const wrap = node('div', 'vertical-wrap');
  const board = node('div', 'vertical-board');
  
  const displayOp = op === '*' ? '×' : (op === '/' ? '÷' : op);
  let result = 0;
  if (op === '+') result = a + b;
  else if (op === '-') result = a - b;
  else if (op === '×' || op === '*') result = a * b;
  else if (op === '÷' || op === '/') result = Math.floor(a / b);

  const maxVal = Math.max(Number(a) || 0, Number(b) || 0, Math.abs(Number(result) || 0));
  const digitsCount = Math.max(2, String(maxVal).length);
  
  const digitNames = ['個位', '十位', '百位', '千位', '萬位'];
  const headerCols = ['<span></span>'];
  for (let i = digitsCount - 1; i >= 0; i -= 1) {
    headerCols.push(`<span>${digitNames[i] || ''}</span>`);
  }
  
  const headEl = node('div', 'vertical-head', headerCols.join(''));
  headEl.style.gridTemplateColumns = `40px repeat(${digitsCount}, 1fr)`;
  board.appendChild(headEl);
  
  function formatRow(num, operator = '') {
    const s = String(num).padStart(digitsCount, ' ');
    const spans = [`<span class="vertical-op">${operator}</span>`];
    for (const char of s) {
      spans.push(`<span>${char === ' ' ? '&nbsp;' : char}</span>`);
    }
    const rowEl = node('div', 'vertical-row', spans.join(''));
    rowEl.style.gridTemplateColumns = `40px repeat(${digitsCount}, 1fr)`;
    return rowEl;
  }
  
  board.appendChild(formatRow(a, ''));
  board.appendChild(formatRow(b, displayOp));
  board.appendChild(node('div', 'vertical-line'));
  
  if (showAnswer) {
    const ansRow = formatRow(result, '');
    ansRow.classList.add('answer');
    board.appendChild(ansRow);
  } else {
    const qSpans = [`<span class="vertical-op"></span>`];
    for (let i = 0; i < digitsCount; i += 1) {
      qSpans.push(`<span>?</span>`);
    }
    const ansRow = node('div', 'vertical-row answer', qSpans.join(''));
    ansRow.style.gridTemplateColumns = `40px repeat(${digitsCount}, 1fr)`;
    board.appendChild(ansRow);
  }
  
  wrap.appendChild(board);
  wrap.appendChild(node('div', 'visual-caption', '相同數位要對齊，注意進位與退位喔！'));
  return wrap;
}

export function calendar({ month = 3, highlight = 12, startWeekday = 6, days = 31, today = null }) {
  const wrap = node('div', 'calendar-wrap');
  const card = node('div', 'calendar-card');
  card.appendChild(node('div', 'calendar-title', `${month} 月`));
  const grid = node('div', 'calendar-grid');
  for (const weekday of ['日', '一', '二', '三', '四', '五', '六']) {
    grid.appendChild(node('div', 'calendar-weekday', weekday));
  }
  for (let blank = 0; blank < startWeekday; blank += 1) grid.appendChild(node('div', 'calendar-day empty'));
  for (let day = 1; day <= days; day += 1) {
    const cell = node('div', 'calendar-day', String(day));
    if (day === highlight) cell.classList.add('highlight');
    if (today && day === today) cell.classList.add('today');
    grid.appendChild(cell);
  }
  card.appendChild(grid);
  wrap.appendChild(card);
  return wrap;
}

export function table({ title = '', columns = [], rows = [] }) {
  const wrap = node('div', 'table-wrap');
  if (title) wrap.appendChild(node('div', 'table-title', title));
  const element = node('table', 'data-table');
  const head = node('tr');
  head.appendChild(node('th', '', '水果'));
  for (const column of columns) head.appendChild(node('th', '', `${column.emoji || ''}<br><span>${column.label}</span>`));
  element.appendChild(head);
  for (const row of rows) {
    const tr = node('tr');
    tr.appendChild(node('td', '', `${row.emoji || ''} ${row.label}`));
    for (const value of row.values) tr.appendChild(node('td', 'table-value', String(value)));
    element.appendChild(tr);
  }
  wrap.appendChild(element);
  return wrap;
}

export function scene({ emojis = [], text = '' }, question = null) {
  if ((question && question.subject === 'english') || isEnglishContext(text, question)) {
    return englishVisual({ emojis, text }, question);
  }
  const wrap = node('div', 'scene-wrap');
  const stage = node('div', 'scene-stage');
  for (const emoji of emojis) stage.appendChild(node('span', 'scene-emoji', emoji));
  wrap.appendChild(stage);

  let displayText = text;
  // 防洩題防禦：如果 text 洩漏了答案（例如看圖選單字題中 text 直接印出 answer），進行遮蔽
  if (question && question.answer && displayText) {
    const cleanAns = String(question.answer).trim().toLowerCase();
    const cleanText = String(displayText).replace(/\s+/g, '').toLowerCase();
    if (cleanText === cleanAns || cleanText.includes(cleanAns)) {
      if (emojis && emojis.length > 0) {
        // 看圖題：有可愛圖時不顯示文字答案，讓學童純看圖思考
        displayText = '';
      } else {
        displayText = cleanAns.length > 1 ? `${cleanAns[0]} _ _` : '？';
      }
    }
  }

  if (displayText) wrap.appendChild(node('div', 'scene-text', displayText));
  return wrap;
}

export function numberLine({
  min = null,
  max = null,
  step = null,
  subStep = null,
  marks = [],
  points = [],
  from = null,
  to = null,
  caption = ''
} = {}) {
  const wrap = node('div', 'numberline-wrap');

  // 1. 智慧推估數值範圍 min 與 max
  const allNums = [
    ...(marks || []),
    ...((points || []).map(p => (typeof p === 'object' && p !== null ? p.val : p))),
    ...(from !== null ? [from] : []),
    ...(to !== null ? [to] : [])
  ].filter(v => typeof v === 'number' && !isNaN(v));

  let parsedMin = min;
  let parsedMax = max;

  if (parsedMin === null) {
    if (allNums.length > 0 && Math.min(...allNums) > 20) {
      parsedMin = Math.floor(Math.min(...allNums) / 10) * 10;
    } else {
      parsedMin = 0;
    }
  }

  if (parsedMax === null) {
    if (allNums.length > 0) {
      parsedMax = Math.max(...allNums, parsedMin + 10);
    } else {
      parsedMax = parsedMin + 20;
    }
  }

  if (parsedMax <= parsedMin) {
    parsedMax = parsedMin + 10;
  }

  const range = parsedMax - parsedMin;

  // 2. 智慧推估刻度間距 step 與 subStep
  let parsedStep = step;
  if (!parsedStep || parsedStep <= 0) {
    if (range <= 15) parsedStep = 1;
    else if (range <= 30) parsedStep = 5;
    else if (range <= 100) parsedStep = 10;
    else if (range <= 300) parsedStep = 20;
    else if (range <= 1000) parsedStep = 50;
    else parsedStep = Math.pow(10, Math.floor(Math.log10(range))) / 2 || 10;
  }

  let parsedSubStep = subStep;
  if (!parsedSubStep) {
    if (parsedStep === 10) parsedSubStep = 5;
    else if (parsedStep === 50) parsedSubStep = 10;
    else if (parsedStep === 100) parsedSubStep = 20;
    else if (parsedStep >= 2 && parsedStep <= 6) parsedSubStep = 1;
  }

  // 3. SVG 尺寸與座標系統
  const svgW = 640;
  const svgH = 145;
  const padL = 50;
  const padR = 50;
  const yLine = 90;
  const usableW = svgW - padL - padR;

  function valToX(val) {
    const clamped = Math.max(parsedMin, Math.min(parsedMax, val));
    return padL + ((clamped - parsedMin) / range) * usableW;
  }

  const svgEl = svg('svg', {
    viewBox: `0 0 ${svgW} ${svgH}`,
    class: 'numberline-svg',
    role: 'img',
    'aria-label': `數線：從 ${parsedMin} 到 ${parsedMax}`
  });

  // 定義箭頭 marker 與陰影
  const defs = svg('defs');
  defs.innerHTML = `
    <marker id="nl-arrow-left" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 8 1 L 2 5 L 8 9" fill="none" stroke="#7c5cc7" stroke-width="2.5" stroke-linecap="round" />
    </marker>
    <marker id="nl-arrow-right" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 2 1 L 8 5 L 2 9" fill="none" stroke="#7c5cc7" stroke-width="2.5" stroke-linecap="round" />
    </marker>
    <filter id="nl-badge-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="rgba(80,40,120,0.22)" />
    </filter>
  `;
  svgEl.appendChild(defs);

  // 主軸底線（雙向箭頭數線）
  const mainAxis = svg('line', {
    x1: padL - 25,
    y1: yLine,
    x2: svgW - padR + 25,
    y2: yLine,
    stroke: '#7c5cc7',
    'stroke-width': 3.5,
    'stroke-linecap': 'round',
    'marker-start': 'url(#nl-arrow-left)',
    'marker-end': 'url(#nl-arrow-right)'
  });
  svgEl.appendChild(mainAxis);

  // 4. 繪製小刻度 (subStep)
  if (parsedSubStep && parsedSubStep > 0 && parsedSubStep < parsedStep) {
    for (let v = parsedMin; v <= parsedMax; v += parsedSubStep) {
      if ((v - parsedMin) % parsedStep !== 0) {
        const x = valToX(v);
        svgEl.appendChild(svg('line', {
          x1: x,
          y1: yLine - 5,
          x2: x,
          y2: yLine + 5,
          stroke: '#b8a7ea',
          'stroke-width': 2,
          'stroke-linecap': 'round'
        }));
      }
    }
  }

  // 5. 繪製大刻度與數字 (parsedStep)
  for (let v = parsedMin; v <= parsedMax; v += parsedStep) {
    const x = valToX(v);
    // 大刻度垂直線
    svgEl.appendChild(svg('line', {
      x1: x,
      y1: yLine - 9,
      x2: x,
      y2: yLine + 9,
      stroke: '#5f3dc4',
      'stroke-width': 3,
      'stroke-linecap': 'round'
    }));

    // 刻度圓點
    const isMarked = Array.isArray(marks) && marks.includes(v);
    svgEl.appendChild(svg('circle', {
      cx: x,
      cy: yLine,
      r: isMarked ? 5.5 : 3.5,
      fill: isMarked ? '#ff4757' : '#7c5cc7'
    }));

    // 數字文字標籤
    const text = svg('text', {
      x: x,
      y: yLine + 28,
      'text-anchor': 'middle',
      class: 'nl-tick-label',
      fill: '#4b3869',
      'font-size': '14px',
      'font-weight': '700',
      'font-family': 'var(--font-display, "Fredoka", sans-serif)'
    });
    text.textContent = String(v);
    svgEl.appendChild(text);
  }

  // 6. 繪製跳躍弧線 (from -> to)
  if (from !== null && to !== null) {
    const x1 = valToX(from);
    const x2 = valToX(to);
    const midX = (x1 + x2) / 2;
    const arcHeight = Math.min(45, Math.max(25, Math.abs(x2 - x1) * 0.4));
    const arcY = yLine - arcHeight;

    const arcPath = svg('path', {
      d: `M ${x1} ${yLine - 8} Q ${midX} ${arcY} ${x2} ${yLine - 8}`,
      fill: 'none',
      stroke: '#ff4757',
      'stroke-width': 3,
      'stroke-dasharray': '5 3',
      'stroke-linecap': 'round'
    });
    svgEl.appendChild(arcPath);

    const diff = to - from;
    const jumpText = svg('text', {
      x: midX,
      y: arcY - 4,
      'text-anchor': 'middle',
      fill: '#e84393',
      'font-size': '13px',
      'font-weight': '900',
      filter: 'url(#nl-badge-shadow)'
    });
    jumpText.textContent = `${diff >= 0 ? '+' : ''}${diff}`;
    svgEl.appendChild(jumpText);
  }

  // 7. 繪製重點標記 / 題目箭頭指標 (points)
  if (Array.isArray(points)) {
    points.forEach(pt => {
      const pVal = typeof pt === 'object' && pt !== null ? pt.val : pt;
      let pLabel = typeof pt === 'object' && pt !== null ? pt.label : '';
      if (!pLabel && pLabel !== 0) pLabel = '▲ ❓';

      const px = valToX(pVal);

      // 下指三角箭頭
      const arrowHead = svg('polygon', {
        points: `${px - 7},${yLine - 13} ${px + 7},${yLine - 13} ${px},${yLine - 3}`,
        fill: '#ff4757'
      });
      svgEl.appendChild(arrowHead);

      // 箭頭垂直立桿
      const stem = svg('line', {
        x1: px,
        y1: yLine - 25,
        x2: px,
        y2: yLine - 12,
        stroke: '#ff4757',
        'stroke-width': 3.5,
        'stroke-linecap': 'round'
      });
      svgEl.appendChild(stem);

      // 數線上亮彩圓點
      const targetDot = svg('circle', {
        cx: px,
        cy: yLine,
        r: 6,
        fill: '#ff4757',
        stroke: '#fff',
        'stroke-width': 2.5
      });
      svgEl.appendChild(targetDot);

      // 頂部小徽章 / 標籤氣泡
      const badgeText = String(pLabel).trim();
      const textLen = badgeText.length;
      const boxW = Math.max(38, textLen * 11 + 18);
      const boxH = 26;
      const boxX = px - boxW / 2;
      const boxY = yLine - 54;

      const badgeRect = svg('rect', {
        x: boxX,
        y: boxY,
        width: boxW,
        height: boxH,
        rx: 13,
        fill: '#ff4757',
        filter: 'url(#nl-badge-shadow)'
      });
      svgEl.appendChild(badgeRect);

      const labelEl = svg('text', {
        x: px,
        y: boxY + 18,
        'text-anchor': 'middle',
        fill: '#ffffff',
        'font-size': '13px',
        'font-weight': '900',
        'font-family': 'var(--font-display, "Fredoka", sans-serif)'
      });
      labelEl.textContent = badgeText;
      svgEl.appendChild(labelEl);
    });
  }

  wrap.appendChild(svgEl);

  const defaultCaption = '💡 觀察數線上的大格與小格，數數看每個間隔是多少喔！';
  wrap.appendChild(node('div', 'visual-caption', caption || defaultCaption));

  return wrap;
}

export function fraction({ numerator = 1, denominator = 4, shape = 'bar', label = '' }) {
  const wrap = node('div', 'fraction-visual-wrap');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '10px';
  wrap.style.padding = '12px';

  if (shape === 'circle') {
    const size = 160;
    const r = 68;
    const cx = 80;
    const cy = 80;
    const svgEl = svg('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}` });
    
    for (let i = 0; i < denominator; i += 1) {
      const startAngle = (i * 2 * Math.PI) / denominator - Math.PI / 2;
      const endAngle = ((i + 1) * 2 * Math.PI) / denominator - Math.PI / 2;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      const isFilled = i < numerator;
      const path = svg('path', {
        d,
        fill: isFilled ? '#ff9f43' : '#f0edff',
        stroke: '#5f3dc4',
        'stroke-width': 2.5
      });
      svgEl.appendChild(path);
    }
    wrap.appendChild(svgEl);
  } else {
    const bar = node('div', 'fraction-bar');
    bar.style.display = 'flex';
    bar.style.width = 'min(320px, 80vw)';
    bar.style.height = '48px';
    bar.style.border = '3px solid #6c5ce7';
    bar.style.borderRadius = '12px';
    bar.style.overflow = 'hidden';
    bar.style.boxShadow = 'var(--shadow-sm)';

    for (let i = 0; i < denominator; i += 1) {
      const part = node('div', 'fraction-part');
      part.style.flex = '1';
      part.style.borderRight = i === denominator - 1 ? 'none' : '2px dashed #6c5ce7';
      part.style.background = i < numerator ? '#ff7675' : '#f8f9fa';
      part.style.display = 'flex';
      part.style.alignItems = 'center';
      part.style.justifyContent = 'center';
      part.style.fontWeight = 'bold';
      part.style.color = i < numerator ? '#fff' : '#aaa';
      part.textContent = `1/${denominator}`;
      bar.appendChild(part);
    }
    wrap.appendChild(bar);
  }

  const caption = label || `平分成 ${denominator} 份，塗色部分是 ${numerator} 份（${numerator}/${denominator}）`;
  wrap.appendChild(node('div', 'visual-caption', caption));
  return wrap;
}

const BOPOMOFO_MAP = {
  '下': 'ㄒㄧㄚˋ', '人': 'ㄖㄣˊ', '他': 'ㄊㄚ', '位': 'ㄨㄟˋ', '住': 'ㄓㄨˋ', '你': 'ㄋㄧˇ',
  '個': 'ㄍㄜ˙', '入': 'ㄖㄨˋ', '八': 'ㄅㄚ', '冒': 'ㄇㄠˋ', '十': 'ㄕˊ', '叫': 'ㄐㄧㄠˋ',
  '司': 'ㄙ', '吃': 'ㄔ', '吉': 'ㄐㄧˊ', '同': 'ㄊㄨㄥˊ', '吹': 'ㄔㄨㄟ', '味': 'ㄨㄟˋ',
  '和': 'ㄏㄢˋ', '唱': 'ㄔㄤˋ', '問': 'ㄨㄣˋ', '喝': 'ㄏㄜ', '四': 'ㄙˋ', '回': 'ㄏㄨㄟˊ',
  '圈': 'ㄑㄩㄢ', '國': 'ㄍㄨㄛˊ', '圍': 'ㄨㄟˊ', '園': 'ㄩㄢˊ', '圓': 'ㄩㄢˊ', '圖': 'ㄊㄨˊ',
  '團': 'ㄊㄨㄢˊ', '土': 'ㄊㄨˇ', '士': 'ㄕˋ', '大': 'ㄉㄚˋ', '天': 'ㄊㄧㄢ', '好': 'ㄏㄠˇ',
  '尖': 'ㄐㄧㄢ', '工': 'ㄍㄨㄥ', '己': 'ㄐㄧˇ', '已': 'ㄧˇ', '巳': 'ㄙˋ', '干': 'ㄍㄢ',
  '床': 'ㄔㄨㄤˊ', '張': 'ㄓㄤ', '想': 'ㄒㄧㄤˇ', '打': 'ㄉㄚˇ', '文': 'ㄨㄣˊ', '早': 'ㄗㄠˇ',
  '明': 'ㄇㄧㄥˊ', '星': 'ㄒㄧㄥ', '書': 'ㄕㄨ', '月': 'ㄩㄝˋ', '木': 'ㄇㄨˋ', '未': 'ㄨㄟˋ',
  '末': 'ㄇㄛˋ', '本': 'ㄅㄣˇ', '朵': 'ㄉㄨㄛˇ', '村': 'ㄘㄨㄣ', '松': 'ㄙㄨㄥ', '林': 'ㄌㄧㄣˊ',
  '桌': 'ㄓㄨㄛ', '森': 'ㄙㄣ', '棵': 'ㄎㄜ', '椅': 'ㄧˇ', '樹': 'ㄕㄨˋ', '橋': 'ㄑㄧㄠˊ',
  '汗': 'ㄏㄢˋ', '沒': 'ㄇㄟˊ', '河': 'ㄏㄜˊ', '泳': 'ㄩㄥˇ', '洗': 'ㄒㄧˇ', '海': 'ㄏㄞˇ',
  '游': 'ㄧㄡˊ', '湖': 'ㄏㄨˊ', '火': 'ㄏㄨㄛˇ', '災': 'ㄗㄞ', '炎': 'ㄧㄢˊ', '烈': 'ㄌㄧㄝˋ',
  '烤': 'ㄎㄠˇ', '照': 'ㄓㄠˋ', '煮': 'ㄓㄨˇ', '熱': 'ㄖㄜˋ', '燈': 'ㄉㄥ', '燒': 'ㄕㄠ',
  '牛': 'ㄋㄧㄡˊ', '王': 'ㄨㄤˊ', '用': 'ㄩㄥˋ', '田': 'ㄊㄧㄢˊ', '紙': 'ㄓˇ', '花': 'ㄏㄨㄚ',
  '草': 'ㄘㄠˇ', '說': 'ㄕㄨㄛ', '閃': 'ㄕㄢˇ', '隻': 'ㄓ', '頭': 'ㄊㄡˊ', '風': 'ㄈㄥ', '馬': 'ㄇㄚˇ'
};

export function chinese({ character = '', word = '', pinyin = '', gridType = '米', hint = '', foxHint = '', strokes = [] }, question = null) {
  let displayChar = character || word || '學';
  let displayPinyin = pinyin || BOPOMOFO_MAP[displayChar] || '';

  let defaultFox = foxHint || (
    displayChar === '十' || displayChar === '干' || displayChar === '土' ? '小狐狸提醒：先橫後豎，筆畫要站穩喔！' :
    displayChar === '八' || displayChar === '人' || displayChar === '入' ? '小狐狸提醒：先撇後捺，像展開小翅膀！' :
    displayChar === '回' || displayChar === '國' || displayChar === '同' ? '小狐狸提醒：進門先進去，最後再關門喔！' :
    '小狐狸提醒：看清楚字形，筆順寫得漂亮又整齊！'
  );

  // 防洩題防禦
  const prompt = question?.prompt || '';
  if (question && question.answer) {
    const ans = String(question.answer).trim();
    if (ans === displayPinyin) {
      displayPinyin = '？';
      defaultFox = '小狐狸提醒：仔細看國字，選出正確的注音喔！';
    } else if (ans === displayChar) {
      displayChar = '？';
      displayPinyin = ''; // 必須清空正解注音，絕不能洩題！
      defaultFox = '小狐狸提醒：仔細看選項筆順與字形，選出正確的國字喔！';
    }
  }

  // 若 displayChar 已經是 ？，側邊絕對不能洩漏正解注音或生詞
  if (displayChar === '？') {
    displayPinyin = '';
    if (word === question?.answer) word = '';
  }

  const isRuleChoiceQuestion = (/筆順規則|不是先|是先|哪一個字/.test(prompt) && question?.category && /筆順|部首|結構/.test(question.category)) || displayChar === '？';

  if (isRuleChoiceQuestion && displayChar === '？') {
    const wrap = node('div', 'chinese-wrap');
    const ruleTitle = word || (question?.category ? String(question.category) : '筆順規則');
    const ruleCard = node('div', 'chinese-rule-card');
    ruleCard.innerHTML = `
      <div class="chinese-rule-badge">📝 觀察筆順規則</div>
      <div class="chinese-rule-title">「${ruleTitle}」</div>
      <p class="chinese-rule-desc">仔細看下方的四個國字選項，動動腦找出答案喔！</p>
    `;
    wrap.appendChild(ruleCard);

    // 小狐狸引導卡片
    const foxCard = node('div', 'chinese-fox-card');
    foxCard.appendChild(node('span', 'chinese-fox-avatar', '🦊'));
    foxCard.appendChild(node('div', 'chinese-fox-msg', '小狐狸提醒：在心中默寫每個字的筆畫順序，仔細觀察喔！'));
    wrap.appendChild(foxCard);
    return wrap;
  }

  const wrap = node('div', 'chinese-wrap');
  const stage = node('div', 'chinese-stage');

  // 將 displayChar 拆分為單字陣列（支援生詞多格米字格並排）
  const charList = displayChar === '？' ? ['？'] : Array.from(displayChar);
  const gridGroup = node('div', 'chinese-grid-group');
  gridGroup.dataset.count = String(charList.length);

  // 建立 SVG 米字格 / 田字格生成器
  function createGridBox(char) {
    const box = node('div', 'chinese-grid-box');
    box.setAttribute('role', 'button');
    box.setAttribute('tabindex', '0');
    box.setAttribute('aria-label', `國字：${char}，點擊朗讀`);

    const gridSvg = svg('svg', { viewBox: '0 0 100 100', class: 'chinese-grid-svg', preserveAspectRatio: 'none' });
    gridSvg.innerHTML = `
      <!-- 中心十字基準虛線 -->
      <line x1="0" y1="50" x2="100" y2="50" stroke="#ff7675" stroke-width="1.6" stroke-dasharray="4 3" opacity="0.6"/>
      <line x1="50" y1="0" x2="50" y2="100" stroke="#ff7675" stroke-width="1.6" stroke-dasharray="4 3" opacity="0.6"/>
      ${gridType === '米' ? `
        <!-- 對角米字斜虛線 -->
        <line x1="0" y1="0" x2="100" y2="100" stroke="#ff7675" stroke-width="1.1" stroke-dasharray="3 3" opacity="0.35"/>
        <line x1="100" y1="0" x2="0" y2="100" stroke="#ff7675" stroke-width="1.1" stroke-dasharray="3 3" opacity="0.35"/>
      ` : ''}
      <!-- 中心定位錨點 -->
      <circle cx="50" cy="50" r="1.5" fill="#e84393" opacity="0.45"/>
    `;
    box.appendChild(gridSvg);

    const charEl = node('div', 'chinese-char-text', char);
    box.appendChild(charEl);

    // 點擊朗讀並觸發動畫反饋
    box.addEventListener('click', () => {
      box.classList.add('is-speaking');
      setTimeout(() => box.classList.remove('is-speaking'), 450);
      const textToSpeak = char === '？' ? '想一想，這是哪一個字呢？' : (word || displayChar);
      speakText(textToSpeak);
    });

    return box;
  }

  charList.forEach(c => gridGroup.appendChild(createGridBox(c)));
  stage.appendChild(gridGroup);

  // 側邊資訊區塊 (注音/生詞/朗讀鍵)
  const side = node('div', 'chinese-side');
  if (displayPinyin) {
    const pinyinBadge = node('div', 'chinese-pinyin-badge');
    pinyinBadge.setAttribute('role', 'button');
    pinyinBadge.setAttribute('tabindex', '0');
    pinyinBadge.setAttribute('title', '點擊聽發音');
    pinyinBadge.innerHTML = `<span>🔊</span> <span>注音：${displayPinyin}</span>`;
    pinyinBadge.addEventListener('click', () => {
      pinyinBadge.classList.add('is-speaking');
      setTimeout(() => pinyinBadge.classList.remove('is-speaking'), 400);
      speakText(word || displayChar);
    });
    side.appendChild(pinyinBadge);
  }

  if (displayChar !== '？' && (displayChar.length > 1 || (word && word !== displayChar))) {
    side.appendChild(node('div', 'chinese-word-caption', `生詞：${word || displayChar}`));
  }

  const speakChip = node('button', 'chinese-speak-chip');
  speakChip.type = 'button';
  speakChip.innerHTML = `<span>🔊</span> <span>聽讀音</span>`;
  speakChip.addEventListener('click', () => {
    const textToSpeak = displayChar === '？' ? '想一想，選出正確的國字喔！' : (word || displayChar);
    speakText(textToSpeak);
  });
  side.appendChild(speakChip);

  stage.appendChild(side);
  wrap.appendChild(stage);

  // 小狐狸引導卡片
  const foxCard = node('div', 'chinese-fox-card');
  foxCard.appendChild(node('span', 'chinese-fox-avatar', '🦊'));
  foxCard.appendChild(node('div', 'chinese-fox-msg', defaultFox));
  wrap.appendChild(foxCard);

  return wrap;
}

export function phonetic({ symbol = 'ㄅ', word = '', example = '' }, question = null) {
  const wrap = node('div', 'phonetic-visual-wrap');
  const prompt = question?.prompt || '';

  // 1. 拼讀題專屬算式卡 (ㄈ + ㄡ = ❓)：杜絕生字洩題與跑版
  const isBlending = question?.category === '拼讀' || /[＋\+]/.test(prompt) || /拼起來/.test(prompt);
  if (isBlending) {
    const blendMatch = prompt.match(/[「『]([ㄅ-ㄩˊˇˋ˙]+)[」』]\s*[＋\+加]?\s*[「『]([ㄅ-ㄩˊˇˋ˙]+)[」』]/);
    const p1 = blendMatch ? blendMatch[1] : (symbol !== '？' ? symbol : 'ㄅ');
    const p2 = blendMatch ? blendMatch[2] : '';

    const board = node('div', 'phonetic-blend-board');
    // 第一個注音
    const cell1 = node('div', 'phonetic-blend-cell');
    cell1.appendChild(node('span', 'phonetic-blend-char', p1));
    board.appendChild(cell1);

    // 加號
    board.appendChild(node('div', 'phonetic-blend-op', '＋'));

    // 第二個注音
    if (p2) {
      const cell2 = node('div', 'phonetic-blend-cell');
      cell2.appendChild(node('span', 'phonetic-blend-char', p2));
      board.appendChild(cell2);
      board.appendChild(node('div', 'phonetic-blend-op', '＝'));
    }

    // 目標問號卡
    const targetCell = node('div', 'phonetic-blend-cell phonetic-blend-target');
    targetCell.appendChild(node('span', 'phonetic-blend-char', '❓'));
    board.appendChild(targetCell);
    wrap.appendChild(board);

    // 朗讀按鈕
    const speakChip = node('button', 'chinese-speak-chip');
    speakChip.type = 'button';
    speakChip.innerHTML = `<span>🔊</span> <span>聽拼讀音</span>`;
    speakChip.addEventListener('click', () => {
      speakText(`${p1}，${p2}`);
    });
    wrap.appendChild(speakChip);

    // 小狐狸引導卡片
    const foxCard = node('div', 'chinese-fox-card');
    foxCard.appendChild(node('span', 'chinese-fox-avatar', '🦊'));
    foxCard.appendChild(node('div', 'chinese-fox-msg', '小狐狸提醒：把聲母和韻母合在一起讀，選出正確的答案！'));
    wrap.appendChild(foxCard);

    return wrap;
  }

  let displaySymbol = symbol;
  let displayWord = word;
  let foxMsg = `聽聽看，動動腦選出正確答案喔！`;

  // 防洩題防禦：如果問的是注音/結合韻，而 symbol 正好是答案
  if (question && question.answer) {
    const ans = String(question.answer).trim();
    if (ans === symbol) {
      displaySymbol = '？';
      foxMsg = displayWord ? `「${displayWord}」要怎麼拼音呢？動動腦選選看！` : '聽聽看，要選哪一個注音呢？';
    } else if (ans === word) {
      displayWord = '？';
      foxMsg = `讀作「${displaySymbol}」的是哪一個字呢？`;
    } else {
      foxMsg = `看清楚字形與讀音，選出正確的答案！`;
    }
  }

  const card = node('div', 'phonetic-card');
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `注音卡：${displaySymbol}，點擊朗讀`);

  // 注音符號方塊
  const symBox = node('div', 'phonetic-symbol-box');
  const symEl = node('span', 'phonetic-symbol', displaySymbol);
  symBox.appendChild(symEl);
  card.appendChild(symBox);

  // 若有生字或詞彙（displaySymbol 為 ？ 時不印出以免洩漏正解）
  if (displayWord && displaySymbol !== '？') {
    card.appendChild(node('div', 'phonetic-divider'));
    const wordWrap = node('div', 'phonetic-word-wrap');
    const wordLabel = `<span class="phonetic-word-arrow">➔</span> <span>${displayWord}</span>`;
    wordWrap.appendChild(node('div', 'phonetic-word', wordLabel));
    wordWrap.appendChild(node('span', 'phonetic-audio-hint', '🔊 點擊聽發音'));
    card.appendChild(wordWrap);
  } else {
    const hintWrap = node('div', 'phonetic-word-wrap');
    hintWrap.appendChild(node('span', 'phonetic-audio-hint', '🔊 點擊聽讀音'));
    card.appendChild(hintWrap);
  }

  // 點擊卡片發音
  card.addEventListener('click', () => {
    card.classList.add('is-speaking');
    setTimeout(() => card.classList.remove('is-speaking'), 450);
    const textToSpeak = displaySymbol === '？' ? '想一想，選出正確的注音符號！' : (displayWord || displaySymbol);
    speakText(textToSpeak);
  });

  wrap.appendChild(card);

  // 小狐狸提示卡片
  const foxCard = node('div', 'chinese-fox-card');
  foxCard.appendChild(node('span', 'chinese-fox-avatar', '🦊'));
  foxCard.appendChild(node('div', 'chinese-fox-msg', foxMsg));
  wrap.appendChild(foxCard);

  return wrap;
}

export function angle({ degree = 90, label = '' }) {
  const wrap = node('div', 'angle-visual-wrap');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '8px';

  const size = 180;
  const cx = 90;
  const cy = 100;
  const len = 65;
  const rad = (degree * Math.PI) / 180;
  const x2 = cx + len * Math.cos(-rad);
  const y2 = cy + len * Math.sin(-rad);

  const svgEl = svg('svg', { width: size, height: 125, viewBox: `0 0 ${size} 125` });
  
  svgEl.appendChild(svg('line', { x1: cx, y1: cy, x2: cx + len, y2: cy, stroke: '#4a356f', 'stroke-width': 4, 'stroke-linecap': 'round' }));
  svgEl.appendChild(svg('line', { x1: cx, y1: cy, x2, y2, stroke: '#e84393', 'stroke-width': 4, 'stroke-linecap': 'round' }));
  svgEl.appendChild(svg('circle', { cx, cy, r: 5, fill: '#6c5ce7' }));

  if (degree === 90) {
    svgEl.appendChild(svg('polyline', {
      points: `${cx + 18},${cy} ${cx + 18},${cy - 18} ${cx},${cy - 18}`,
      fill: 'none',
      stroke: '#0984e3',
      'stroke-width': 2.5
    }));
  } else {
    const arcR = 26;
    const arcX = cx + arcR * Math.cos(-rad);
    const arcY = cy + arcR * Math.sin(-rad);
    const largeArc = degree > 180 ? 1 : 0;
    svgEl.appendChild(svg('path', {
      d: `M ${cx + arcR} ${cy} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcX} ${arcY}`,
      fill: 'rgba(232, 67, 147, 0.15)',
      stroke: '#e84393',
      'stroke-width': 2
    }));
  }

  wrap.appendChild(svgEl);
  const desc = label || (degree === 90 ? '直角（剛好 90 度）' : (degree < 90 ? `銳角（${degree} 度，比直角小）` : `鈍角（${degree} 度，比直角大）`));
  wrap.appendChild(node('div', 'visual-caption', desc));
  return wrap;
}

export function barChart({ title = '', items = [], max = 10, unit = '人' }) {
  const wrap = node('div', 'barchart-wrap');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '8px';
  wrap.style.width = 'min(420px, 92vw)';
  wrap.style.padding = '12px';
  wrap.style.background = '#fff';
  wrap.style.borderRadius = '16px';
  wrap.style.border = '2px solid #e0d7f5';

  if (title) wrap.appendChild(node('div', 'visual-title', `<strong>${title}</strong>`));

  const chart = node('div', 'barchart-stage');
  chart.style.display = 'flex';
  chart.style.alignItems = 'flex-end';
  chart.style.justifyContent = 'space-around';
  chart.style.width = '100%';
  chart.style.height = '130px';
  chart.style.borderBottom = '3px solid #6c5ce7';
  chart.style.borderLeft = '3px solid #6c5ce7';
  chart.style.padding = '10px 8px 0 8px';
  chart.style.gap = '8px';

  for (const item of items) {
    const col = node('div', 'barchart-col');
    col.style.display = 'flex';
    col.style.flexDirection = 'column';
    col.style.alignItems = 'center';
    col.style.flex = '1';
    col.style.height = '100%';
    col.style.justifyContent = 'flex-end';

    const barHeightPercent = Math.min(100, Math.round((item.value / max) * 100));
    const valLabel = node('span', 'barchart-val', `${item.value}`);
    valLabel.style.fontSize = '12px';
    valLabel.style.fontWeight = 'bold';
    valLabel.style.color = '#555';

    const bar = node('div', 'barchart-bar');
    bar.style.width = 'min(36px, 100%)';
    bar.style.height = `${barHeightPercent}%`;
    bar.style.background = item.color || '#6c5ce7';
    bar.style.borderRadius = '6px 6px 0 0';
    bar.style.transition = 'height 0.3s ease';

    const nameLabel = node('span', 'barchart-name', `${item.label}`);
    nameLabel.style.fontSize = '12px';
    nameLabel.style.marginTop = '6px';
    nameLabel.style.whiteSpace = 'nowrap';

    col.appendChild(valLabel);
    col.appendChild(bar);
    col.appendChild(nameLabel);
    chart.appendChild(col);
  }

  wrap.appendChild(chart);
  wrap.appendChild(node('div', 'visual-caption', `長條圖：高度代表數量（單位：${unit}）`));
  return wrap;
}

// 國語島生字筆劃字典（含動態路徑、起點、筆畫名稱與規則）
const STROKE_CHAR_MAP = {
  '十': {
    strokes: [
      { d: 'M 35 100 L 165 100', name: '橫', start: [35, 100] },
      { d: 'M 100 35 L 100 165', name: '豎', start: [100, 35] }
    ],
    rule: '先橫後豎',
    radical: '十',
    strokeCount: 2,
    pinyin: 'ㄕˊ'
  },
  '八': {
    strokes: [
      { d: 'M 75 60 Q 55 105 40 145', name: '撇', start: [75, 60] },
      { d: 'M 125 60 Q 145 105 160 145', name: '捺', start: [125, 60] }
    ],
    rule: '先撇後捺',
    radical: '八',
    strokeCount: 2,
    pinyin: 'ㄅㄚ'
  },
  '人': {
    strokes: [
      { d: 'M 100 40 Q 80 95 40 160', name: '撇', start: [100, 40] },
      { d: 'M 86 92 Q 120 128 160 160', name: '捺', start: [86, 92] }
    ],
    rule: '先撇後捺',
    radical: '人',
    strokeCount: 2,
    pinyin: 'ㄖㄣˊ'
  },
  '入': {
    strokes: [
      { d: 'M 85 75 Q 70 110 45 155', name: '撇', start: [85, 75] },
      { d: 'M 75 40 Q 115 100 165 160', name: '捺', start: [75, 40] }
    ],
    rule: '先撇後捺',
    radical: '入',
    strokeCount: 2,
    pinyin: 'ㄖㄨˋ'
  },
  '大': {
    strokes: [
      { d: 'M 35 80 L 165 80', name: '橫', start: [35, 80] },
      { d: 'M 100 40 Q 85 105 45 165', name: '撇', start: [100, 40] },
      { d: 'M 95 95 Q 125 130 165 165', name: '捺', start: [95, 95] }
    ],
    rule: '先橫後撇捺',
    radical: '大',
    strokeCount: 3,
    pinyin: 'ㄉㄚˋ'
  },
  '天': {
    strokes: [
      { d: 'M 50 60 L 150 60', name: '橫', start: [50, 60] },
      { d: 'M 35 100 L 165 100', name: '長橫', start: [35, 100] },
      { d: 'M 100 60 Q 85 115 45 165', name: '撇', start: [100, 60] },
      { d: 'M 95 110 Q 125 135 165 165', name: '捺', start: [95, 110] }
    ],
    rule: '從上到下',
    radical: '大',
    strokeCount: 4,
    pinyin: 'ㄊㄧㄢ'
  },
  '上': {
    strokes: [
      { d: 'M 100 35 L 100 145', name: '豎', start: [100, 35] },
      { d: 'M 100 90 L 150 90', name: '短橫', start: [100, 90] },
      { d: 'M 35 150 L 165 150', name: '長橫', start: [35, 150] }
    ],
    rule: '從上到下',
    radical: '一',
    strokeCount: 3,
    pinyin: 'ㄕㄤˋ'
  },
  '下': {
    strokes: [
      { d: 'M 35 50 L 165 50', name: '長橫', start: [35, 50] },
      { d: 'M 100 50 L 100 155', name: '豎', start: [100, 50] },
      { d: 'M 108 92 Q 126 112 145 128', name: '點', start: [108, 92] }
    ],
    rule: '先橫後豎',
    radical: '一',
    strokeCount: 3,
    pinyin: 'ㄒㄧㄚˋ'
  },
  '土': {
    strokes: [
      { d: 'M 55 85 L 145 85', name: '短橫', start: [55, 85] },
      { d: 'M 100 40 L 100 150', name: '豎', start: [100, 40] },
      { d: 'M 35 150 L 165 150', name: '長橫', start: [35, 150] }
    ],
    rule: '先橫後豎',
    radical: '土',
    strokeCount: 3,
    pinyin: 'ㄊㄨˇ'
  },
  '士': {
    strokes: [
      { d: 'M 35 75 L 165 75', name: '長橫', start: [35, 75] },
      { d: 'M 100 40 L 100 150', name: '豎', start: [100, 40] },
      { d: 'M 55 150 L 145 150', name: '短橫', start: [55, 150] }
    ],
    rule: '先橫後豎',
    radical: '士',
    strokeCount: 3,
    pinyin: 'ㄕˋ'
  },
  '王': {
    strokes: [
      { d: 'M 45 55 L 155 55', name: '橫', start: [45, 55] },
      { d: 'M 55 95 L 145 95', name: '短橫', start: [55, 95] },
      { d: 'M 100 55 L 100 145', name: '豎', start: [100, 55] },
      { d: 'M 35 145 L 165 145', name: '長橫', start: [35, 145] }
    ],
    rule: '先橫後豎',
    radical: '玉',
    strokeCount: 4,
    pinyin: 'ㄨㄤˊ'
  },
  '干': {
    strokes: [
      { d: 'M 45 60 L 155 60', name: '短橫', start: [45, 60] },
      { d: 'M 35 100 L 165 100', name: '長橫', start: [35, 100] },
      { d: 'M 100 60 L 100 165', name: '豎', start: [100, 60] }
    ],
    rule: '先橫後豎',
    radical: '干',
    strokeCount: 3,
    pinyin: 'ㄍㄢ'
  },
  '工': {
    strokes: [
      { d: 'M 40 60 L 160 60', name: '橫', start: [40, 60] },
      { d: 'M 100 60 L 100 140', name: '豎', start: [100, 60] },
      { d: 'M 35 140 L 165 140', name: '長橫', start: [35, 140] }
    ],
    rule: '先橫後豎',
    radical: '工',
    strokeCount: 3,
    pinyin: 'ㄍㄨㄥ'
  },
  '吉': {
    strokes: [
      { d: 'M 45 50 L 155 50', name: '橫', start: [45, 50] },
      { d: 'M 100 35 L 100 85', name: '豎', start: [100, 35] },
      { d: 'M 55 85 L 145 85', name: '橫', start: [55, 85] },
      { d: 'M 65 105 L 65 155', name: '豎', start: [65, 105] },
      { d: 'M 65 105 L 135 105 L 135 155', name: '橫折', start: [65, 105] },
      { d: 'M 65 155 L 135 155', name: '橫', start: [65, 155] }
    ],
    rule: '先橫後豎',
    radical: '口',
    strokeCount: 6,
    pinyin: 'ㄐㄧˊ'
  },
  '口': {
    strokes: [
      { d: 'M 55 60 L 55 140', name: '豎', start: [55, 60] },
      { d: 'M 55 60 L 145 60 L 145 140', name: '橫折', start: [55, 60] },
      { d: 'M 55 140 L 145 140', name: '橫', start: [55, 140] }
    ],
    rule: '先外後內最後封口',
    radical: '口',
    strokeCount: 3,
    pinyin: 'ㄎㄡˇ'
  },
  '日': {
    strokes: [
      { d: 'M 60 50 L 60 150', name: '豎', start: [60, 50] },
      { d: 'M 60 50 L 140 50 L 140 150', name: '橫折', start: [60, 50] },
      { d: 'M 60 100 L 140 100', name: '橫', start: [60, 100] },
      { d: 'M 60 150 L 140 150', name: '橫', start: [60, 150] }
    ],
    rule: '先外後內最後封口',
    radical: '日',
    strokeCount: 4,
    pinyin: 'ㄖˋ'
  },
  '中': {
    strokes: [
      { d: 'M 55 65 L 55 125', name: '豎', start: [55, 65] },
      { d: 'M 55 65 L 145 65 L 145 125', name: '橫折', start: [55, 65] },
      { d: 'M 55 125 L 145 125', name: '橫', start: [55, 125] },
      { d: 'M 100 35 L 100 165', name: '豎', start: [100, 35] }
    ],
    rule: '先外後內最後穿心豎',
    radical: '丨',
    strokeCount: 4,
    pinyin: 'ㄓㄨㄥ'
  },
  '小': {
    strokes: [
      { d: 'M 100 45 L 100 155 L 85 140', name: '豎勾', start: [100, 45] },
      { d: 'M 68 85 Q 52 115 42 135', name: '撇', start: [68, 85] },
      { d: 'M 132 85 Q 148 115 158 135', name: '點', start: [132, 85] }
    ],
    rule: '先中間後兩邊',
    radical: '小',
    strokeCount: 3,
    pinyin: 'ㄒㄧㄠˇ'
  },
  '水': {
    strokes: [
      { d: 'M 100 40 L 100 160 L 85 145', name: '豎勾', start: [100, 40] },
      { d: 'M 65 85 L 85 85 L 55 120', name: '橫撇', start: [65, 85] },
      { d: 'M 140 75 L 115 105', name: '撇', start: [140, 75] },
      { d: 'M 115 105 Q 135 135 165 155', name: '捺', start: [115, 105] }
    ],
    rule: '先中間後兩邊',
    radical: '水',
    strokeCount: 4,
    pinyin: 'ㄕㄨㄟˇ'
  },
  '火': {
    strokes: [
      { d: 'M 55 85 Q 65 100 60 115', name: '點', start: [55, 85] },
      { d: 'M 145 85 Q 135 100 135 115', name: '撇', start: [145, 85] },
      { d: 'M 100 40 Q 95 95 48 160', name: '撇', start: [100, 40] },
      { d: 'M 95 90 Q 125 130 165 160', name: '捺', start: [95, 90] }
    ],
    rule: '先撇後捺',
    radical: '火',
    strokeCount: 4,
    pinyin: 'ㄏㄨㄛˇ'
  },
  '木': {
    strokes: [
      { d: 'M 40 80 L 160 80', name: '橫', start: [40, 80] },
      { d: 'M 100 40 L 100 160', name: '豎', start: [100, 40] },
      { d: 'M 100 80 Q 80 120 45 155', name: '撇', start: [100, 80] },
      { d: 'M 100 80 Q 120 120 155 155', name: '捺', start: [100, 80] }
    ],
    rule: '先橫後豎',
    radical: '木',
    strokeCount: 4,
    pinyin: 'ㄇㄨˋ'
  },
  '文': {
    strokes: [
      { d: 'M 100 45 L 100 65', name: '點', start: [100, 45] },
      { d: 'M 45 75 L 155 75', name: '橫', start: [45, 75] },
      { d: 'M 95 75 Q 80 115 45 155', name: '撇', start: [95, 75] },
      { d: 'M 85 95 Q 120 130 165 155', name: '捺', start: [85, 95] }
    ],
    rule: '先撇後捺',
    radical: '文',
    strokeCount: 4,
    pinyin: 'ㄨㄣˊ'
  },
  '山': {
    strokes: [
      { d: 'M 100 50 L 100 145', name: '豎', start: [100, 50] },
      { d: 'M 55 95 L 55 145 L 145 145', name: '豎折', start: [55, 95] },
      { d: 'M 145 95 L 145 145', name: '豎', start: [145, 95] }
    ],
    rule: '先中間後兩邊',
    radical: '山',
    strokeCount: 3,
    pinyin: 'ㄕㄢ'
  },
  '田': {
    strokes: [
      { d: 'M 55 55 L 55 145', name: '豎', start: [55, 55] },
      { d: 'M 55 55 L 145 55 L 145 145', name: '橫折', start: [55, 55] },
      { d: 'M 55 100 L 145 100', name: '橫', start: [55, 100] },
      { d: 'M 100 55 L 100 145', name: '豎', start: [100, 55] },
      { d: 'M 55 145 L 145 145', name: '橫', start: [55, 145] }
    ],
    rule: '先外後內最後封口',
    radical: '田',
    strokeCount: 5,
    pinyin: 'ㄊㄧㄢˊ'
  },
  '月': {
    strokes: [
      { d: 'M 65 50 Q 60 115 50 155', name: '撇', start: [65, 50] },
      { d: 'M 65 50 L 135 50 L 135 155 L 120 140', name: '橫折勾', start: [65, 50] },
      { d: 'M 65 85 L 135 85', name: '橫', start: [65, 85] },
      { d: 'M 65 120 L 135 120', name: '橫', start: [65, 120] }
    ],
    rule: '從外到內',
    radical: '月',
    strokeCount: 4,
    pinyin: 'ㄩㄝˋ'
  },
  '一': {
    strokes: [{ d: 'M 35 100 L 165 100', name: '橫', start: [35, 100] }],
    rule: '從左到右',
    radical: '一',
    strokeCount: 1,
    pinyin: 'ㄧ'
  },
  '二': {
    strokes: [
      { d: 'M 55 75 L 145 75', name: '短橫', start: [55, 75] },
      { d: 'M 35 130 L 165 130', name: '長橫', start: [35, 130] }
    ],
    rule: '從上到下',
    radical: '二',
    strokeCount: 2,
    pinyin: 'ㄦˋ'
  },
  '三': {
    strokes: [
      { d: 'M 55 65 L 145 65', name: '短橫', start: [55, 65] },
      { d: 'M 65 100 L 135 100', name: '短橫', start: [65, 100] },
      { d: 'M 35 140 L 165 140', name: '長橫', start: [35, 140] }
    ],
    rule: '從上到下',
    radical: '一',
    strokeCount: 3,
    pinyin: 'ㄙㄢ'
  }
};

/**
 * 國語島生字筆順動態繪製與筆畫指引教具
 */
export function strokeOrderVisual(visual = {}, question = null) {
  const wrap = node('div', 'chinese-visual-wrap');
  
  // 1. 決定目標生字
  let char = visual.character || visual.word || '';
  if (!char && question?.prompt) {
    const m = question.prompt.match(/[「『]([一-龜])|[「『]([\u4e00-\u9fa5])/);
    if (m) char = m[1] || m[2];
  }
  if (!char && typeof visual.text === 'string') {
    char = visual.text.trim().charAt(0);
  }
  if (!char) char = '十';

  const word = visual.word || (char.length > 1 ? char : '');
  const mainChar = char.charAt(0);
  const data = STROKE_CHAR_MAP[mainChar] || null;

  const strokeCount = visual.strokeCount || data?.strokeCount || (data ? data.strokes.length : char.length);
  const rule = visual.rule || data?.rule || '依標準筆順書寫';
  const pinyin = visual.pinyin || visual.bopomofo || data?.pinyin || '';
  const radical = visual.radical || data?.radical || '';

  // 頂部生字資訊標籤行
  const metaRow = node('div', 'chinese-meta-row');
  metaRow.innerHTML = `
    <span class="chinese-meta-badge stroke-rule-badge">📜 筆順規則：${rule}</span>
    ${strokeCount ? `<span class="chinese-meta-badge">✍️ 總筆畫：${strokeCount} 畫</span>` : ''}
    ${radical ? `<span class="chinese-meta-badge">🔖 部首：${radical}</span>` : ''}
  `;
  wrap.appendChild(metaRow);

  // 中央主舞台：米字格書法視窗 + 筆順步驟清單
  const stage = node('div', 'chinese-stage');

  // A. 田字格 / 米字格 (SVG)
  const gridBox = node('div', 'chinese-grid-box');
  const size = 200;
  const svgEl = svg('svg', {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    class: 'chinese-mizige-svg',
    role: 'img',
    'aria-label': `漢字「${mainChar}」筆順動態展示`
  });

  // 米字格底線
  svgEl.appendChild(svg('rect', {
    x: 6,
    y: 6,
    width: 188,
    height: 188,
    rx: 14,
    fill: '#fffef9',
    stroke: '#e17055',
    'stroke-width': 3
  }));
  // 十字虛線
  svgEl.appendChild(svg('line', {
    x1: 6, y1: 100, x2: 194, y2: 100,
    stroke: '#fab1a0', 'stroke-width': 1.6, 'stroke-dasharray': '5 5'
  }));
  svgEl.appendChild(svg('line', {
    x1: 100, y1: 6, x2: 100, y2: 194,
    stroke: '#fab1a0', 'stroke-width': 1.6, 'stroke-dasharray': '5 5'
  }));
  // 對角虛線
  svgEl.appendChild(svg('line', {
    x1: 6, y1: 6, x2: 194, y2: 194,
    stroke: '#ffeaa7', 'stroke-width': 1.2, 'stroke-dasharray': '4 4'
  }));
  svgEl.appendChild(svg('line', {
    x1: 194, y1: 6, x2: 6, y2: 194,
    stroke: '#ffeaa7', 'stroke-width': 1.2, 'stroke-dasharray': '4 4'
  }));

  // 繪製筆劃：若有向量路徑庫則動態繪製；否則以標準標楷體顯示
  const strokeGroup = svg('g', { class: 'chinese-stroke-group' });

  function renderStrokes(animated = true) {
    strokeGroup.innerHTML = '';
    if (data && data.strokes && data.strokes.length > 0) {
      data.strokes.forEach((stroke, idx) => {
        const delay = animated ? idx * 0.55 : 0;
        const pathEl = svg('path', {
          d: stroke.d,
          fill: 'none',
          stroke: '#2d3436',
          'stroke-width': 13,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          class: 'stroke-order-path',
          style: `animation-delay: ${delay}s;`
        });
        strokeGroup.appendChild(pathEl);

        // 標記筆劃起點序號圓點
        if (stroke.start) {
          const [sx, sy] = stroke.start;
          const dot = svg('circle', {
            cx: sx,
            cy: sy,
            r: 7.5,
            fill: '#e84393',
            stroke: '#ffffff',
            'stroke-width': 2,
            class: 'stroke-marker-dot',
            style: `animation-delay: ${delay + 0.1}s;`
          });
          const num = svg('text', {
            x: sx,
            y: sy + 3.5,
            'text-anchor': 'middle',
            fill: '#ffffff',
            'font-size': '10px',
            'font-weight': '900',
            'font-family': 'Arial, sans-serif',
            class: 'stroke-marker-text',
            style: `animation-delay: ${delay + 0.1}s;`
          });
          num.textContent = String(idx + 1);
          strokeGroup.appendChild(dot);
          strokeGroup.appendChild(num);
        }
      });
    } else {
      // 通用高精度大字顯示
      const textEl = svg('text', {
        x: 100,
        y: 138,
        'text-anchor': 'middle',
        fill: '#2d3436',
        'font-size': '108px',
        'font-family': '"DFKai-SB", "BiauKai", "KaiTi", "Noto Serif TC", serif',
        'font-weight': '700',
        class: 'chinese-large-char'
      });
      textEl.textContent = mainChar;
      strokeGroup.appendChild(textEl);
    }
  }

  renderStrokes(true);
  svgEl.appendChild(strokeGroup);
  gridBox.appendChild(svgEl);

  // B. 右側筆畫步驟與注音引導面板
  const infoBox = node('div', 'chinese-info-box');
  
  // 注音與讀音橫列
  const pinyinRow = node('div', 'chinese-pinyin-row');
  pinyinRow.innerHTML = `
    <div class="chinese-char-preview">${mainChar}</div>
    <div class="chinese-char-detail">
      <div class="chinese-pinyin-display">${pinyin || '注音學習'}</div>
      <div class="chinese-word-display">${word ? `詞語：${word}` : '生字練習'}</div>
    </div>
  `;
  infoBox.appendChild(pinyinRow);

  // 筆順分解步驟清單（若已知）
  if (data && data.strokes) {
    const stepsList = node('div', 'chinese-steps-list');
    data.strokes.forEach((s, i) => {
      const stepItem = node('span', 'chinese-step-chip');
      stepItem.innerHTML = `<strong>${i + 1}</strong> ${s.name}`;
      stepsList.appendChild(stepItem);
    });
    infoBox.appendChild(stepsList);
  }

  // 互動按鈕群：🔊 發音 & ▶ 重播筆順
  const actionRow = node('div', 'chinese-actions-row');
  
  const speakBtn = node('button', 'chinese-action-btn btn-speak', '🔊 朗讀');
  speakBtn.type = 'button';
  speakBtn.addEventListener('click', () => {
    speakText(`${mainChar}。${pinyin ? pinyin + '。' : ''}${word ? word : ''}`);
  });

  const replayBtn = node('button', 'chinese-action-btn btn-replay', '▶ 重播筆順');
  replayBtn.type = 'button';
  replayBtn.addEventListener('click', () => {
    renderStrokes(true);
    audio.playSfx?.('click', 0.4);
  });

  actionRow.appendChild(speakBtn);
  if (data && data.strokes) {
    actionRow.appendChild(replayBtn);
  }
  infoBox.appendChild(actionRow);

  stage.appendChild(gridBox);
  stage.appendChild(infoBox);
  wrap.appendChild(stage);

  // 底部提示
  wrap.appendChild(node('div', 'visual-caption', `生字筆畫指引：跟著筆順順序，在米字格中工整寫出「${mainChar}」！`));

  return wrap;
}

export const strokeOrder = strokeOrderVisual;

/**
 * 英語島專屬語音發音器（美語 en-US）
 */
export function speakEnglish(text, rate = 0.85) {
  if (!text) return;
  const clean = String(text).replace(/[\?_\(\)\[\]「」\/\#\@\*\&]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return;
  try {
    if (audio && typeof audio.speak === 'function') {
      audio.playSfx?.('click', 0.35);
      const prevLang = audio.speechLang;
      if (typeof audio.setSpeechLang === 'function') audio.setSpeechLang('en-US');
      audio.speak(clean);
      if (prevLang && prevLang !== 'en-US' && typeof audio.setSpeechLang === 'function') {
        setTimeout(() => audio.setSpeechLang(prevLang), 1800);
      }
      return;
    }
  } catch (e) {}
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = 'en-US';
      u.rate = rate;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
}

/**
 * 判斷是否為英語島題目情境
 */
export function isEnglishContext(text, question) {
  if (question && question.subject === 'english') return true;
  if (question && question.gradeName && question.gradeName.includes('英文')) return true;
  if (text && /^[a-zA-Z\s\?_\-\.\,\!\'\"]+$/.test(text) && /[a-zA-Z]/.test(text)) return true;
  if (question && question.prompt && (
    question.prompt.includes('英文') ||
    question.prompt.includes('單字') ||
    question.prompt.includes('開頭音') ||
    question.prompt.includes('結尾音') ||
    question.prompt.includes('母音') ||
    question.prompt.includes('拼字') ||
    /「[a-zA-Z]+」/.test(question.prompt) ||
    /_[a-zA-Z]+|[a-zA-Z]+_/.test(question.prompt)
  )) return true;
  return false;
}

const PHONICS_SOUND_MAP = {
  a: { ipa: '/æ/', name: 'Short A', word: 'apple', emoji: '🍎', sample: 'apple' },
  b: { ipa: '/b/', name: 'Consonant B', word: 'ball', emoji: '⚽', sample: 'ball' },
  c: { ipa: '/k/', name: 'Hard C', word: 'cat', emoji: '🐱', sample: 'cat' },
  d: { ipa: '/d/', name: 'Consonant D', word: 'dog', emoji: '🐶', sample: 'dog' },
  e: { ipa: '/e/', name: 'Short E', word: 'egg', emoji: '🥚', sample: 'egg' },
  f: { ipa: '/f/', name: 'Consonant F', word: 'fish', emoji: '🐟', sample: 'fish' },
  g: { ipa: '/ɡ/', name: 'Hard G', word: 'gift', emoji: '🎁', sample: 'gift' },
  h: { ipa: '/h/', name: 'Consonant H', word: 'hat', emoji: '🎩', sample: 'hat' },
  i: { ipa: '/ɪ/', name: 'Short I', word: 'igloo', emoji: '🧊', sample: 'igloo' },
  j: { ipa: '/dʒ/', name: 'Consonant J', word: 'jam', emoji: '🍯', sample: 'jam' },
  k: { ipa: '/k/', name: 'Consonant K', word: 'kite', emoji: '🪁', sample: 'kite' },
  l: { ipa: '/l/', name: 'Consonant L', word: 'lion', emoji: '🦁', sample: 'lion' },
  m: { ipa: '/m/', name: 'Consonant M', word: 'monkey', emoji: '🐵', sample: 'monkey' },
  n: { ipa: '/n/', name: 'Consonant N', word: 'nest', emoji: '🪺', sample: 'nest' },
  o: { ipa: '/ɒ/', name: 'Short O', word: 'octopus', emoji: '🐙', sample: 'octopus' },
  p: { ipa: '/p/', name: 'Consonant P', word: 'pig', emoji: '🐷', sample: 'pig' },
  q: { ipa: '/kw/', name: 'Consonant Q', word: 'queen', emoji: '👑', sample: 'queen' },
  r: { ipa: '/r/', name: 'Consonant R', word: 'rabbit', emoji: '🐰', sample: 'rabbit' },
  s: { ipa: '/s/', name: 'Consonant S', word: 'sun', emoji: '☀️', sample: 'sun' },
  t: { ipa: '/t/', name: 'Consonant T', word: 'tiger', emoji: '🐯', sample: 'tiger' },
  u: { ipa: '/ʌ/', name: 'Short U', word: 'umbrella', emoji: '☂️', sample: 'umbrella' },
  v: { ipa: '/v/', name: 'Consonant V', word: 'van', emoji: '🚐', sample: 'van' },
  w: { ipa: '/w/', name: 'Consonant W', word: 'watch', emoji: '⌚', sample: 'watch' },
  x: { ipa: '/ks/', name: 'Consonant X', word: 'box', emoji: '📦', sample: 'box' },
  y: { ipa: '/j/', name: 'Consonant Y', word: 'yo-yo', emoji: '🪀', sample: 'yo-yo' },
  z: { ipa: '/z/', name: 'Consonant Z', word: 'zebra', emoji: '🦓', sample: 'zebra' },
};

/**
 * 英語島：字母自然發音視覺卡 (Phonics Card)
 */
export function englishPhonics(visual = {}, question = null) {
  const wrap = node('div', 'english-visual-wrap english-phonics-wrap');

  // 解析目標字母與單字
  let letter = (visual.letter || '').toLowerCase();
  let word = visual.word || '';
  const prompt = question?.prompt || '';
  const answer = String(question?.answer || '').trim();

  // 若未指定 letter，從 prompt 或 answer 推導
  if (!letter) {
    const quoteMatch = prompt.match(/[「『]([a-zA-Z]+)[」』]/);
    if (quoteMatch) {
      word = word || quoteMatch[1];
      if (/開頭|第一/.test(prompt)) letter = word.charAt(0).toLowerCase();
      else if (/結尾|最後/.test(prompt)) letter = word.slice(-1).toLowerCase();
      else letter = word.charAt(0).toLowerCase();
    } else if (/^[a-zA-Z]$/.test(answer)) {
      letter = answer.toLowerCase();
    }
  }

  // 嚴禁無字母時盲目預設為 'a'（杜絕所有題目莫名出現 apple 聽發音之重大 Bug）
  if (!letter) {
    return englishVisual(visual, question);
  }
  const phonicsInfo = PHONICS_SOUND_MAP[letter] || {
    ipa: `/${letter}/`,
    name: 'Letter Phonics',
    word: word || letter,
    emoji: '🔤',
  };

  const displayEmoji = visual.emoji || (visual.emojis && visual.emojis[0]) || phonicsInfo.emoji;
  const upper = letter.toUpperCase();
  const lower = letter.toLowerCase();
  const soundIpa = visual.phonetic || visual.ipa || phonicsInfo.ipa;
  const targetWord = word || phonicsInfo.word;

  // 1. 卡片頂部徽章
  const metaRow = node('div', 'english-meta-row');
  metaRow.innerHTML = `
    <span class="english-meta-badge"><span class="badge-icon">🔤</span> 自然發音 · Phonics</span>
    <span class="english-meta-badge sound-badge"><span class="badge-icon">🔊</span> 發音：${soundIpa}</span>
  `;
  wrap.appendChild(metaRow);

  // 2. 主舞台卡片
  const card = node('div', 'english-phonics-card');
  card.setAttribute('role', 'region');
  card.setAttribute('aria-label', `字母發音卡：${upper}${lower}`);

  // 左側：字母巨大展示
  const letterStage = node('div', 'english-letter-stage');
  const upperTile = node('div', 'english-letter-tile english-big-tile tile-upper', upper);
  const lowerTile = node('div', 'english-letter-tile english-big-tile tile-lower', lower);
  upperTile.addEventListener('click', () => {
    upperTile.classList.add('is-speaking');
    speakEnglish(upper);
    setTimeout(() => upperTile.classList.remove('is-speaking'), 600);
  });
  lowerTile.addEventListener('click', () => {
    lowerTile.classList.add('is-speaking');
    speakEnglish(lower);
    setTimeout(() => lowerTile.classList.remove('is-speaking'), 600);
  });
  letterStage.appendChild(upperTile);
  letterStage.appendChild(lowerTile);
  card.appendChild(letterStage);

  // 右側：範例單字與互動聽音
  const infoBox = node('div', 'english-phonics-info');
  const wordRow = node('div', 'english-word-row');
  wordRow.innerHTML = `
    <span class="english-anchor-emoji">${displayEmoji}</span>
    <span class="english-anchor-word">${targetWord}</span>
  `;
  infoBox.appendChild(wordRow);

  const listenBtn = node('button', 'english-listen-btn', '🔊 聽發音 (Listen)');
  listenBtn.type = 'button';
  listenBtn.addEventListener('click', () => {
    listenBtn.classList.add('is-speaking');
    speakEnglish(targetWord);
    setTimeout(() => listenBtn.classList.remove('is-speaking'), 800);
  });
  infoBox.appendChild(listenBtn);
  card.appendChild(infoBox);
  wrap.appendChild(card);

  // 3. 狐狸老師發音小提示
  const foxCard = node('div', 'english-fox-card');
  const foxTip = visual.hint || `狐狸老師的小法寶：字母 ${upper} 發音是 ${soundIpa}，就像 ${targetWord} 一樣喔！`;
  foxCard.innerHTML = `
    <span class="english-fox-avatar" aria-hidden="true">🦊</span>
    <div class="english-fox-msg">${foxTip}</div>
  `;
  wrap.appendChild(foxCard);

  // 4. 底部引導
  wrap.appendChild(node('div', 'visual-caption', `字母發音教具：點擊字母或發音鈕，練習標準美語發音！`));
  return wrap;
}

/**
 * 英語島：單字拼讀積木教具 (Spelling Board)
 */
export function englishSpelling(visual = {}, question = null) {
  const wrap = node('div', 'english-visual-wrap english-spelling-wrap');

  const prompt = question?.prompt || '';
  const answer = String(question?.answer || '').trim();
  const rawText = visual.text || '';
  const emojis = visual.emojis || (visual.emoji ? [visual.emoji] : ['⭐']);

  // 解析題目拼字序列
  let letters = [];
  let mysteryIndex = -1;

  // 模式 A：visual.text 含有空格或問號，如 "? p p l e" 或 "c _ t"
  if (rawText && /[\s_\?]/.test(rawText)) {
    const tokens = rawText.trim().split(/\s+/);
    letters = tokens.map((token, idx) => {
      if (token === '?' || token === '_' || token === '？') {
        mysteryIndex = idx;
        return { char: '?', isMissing: true };
      }
      return { char: token, isMissing: false };
    });
  } else if (prompt.includes('_')) {
    // 模式 B：prompt 含有填空，例如 "_pple" 或 "c_t"
    const m = prompt.match(/([a-zA-Z]*_[a-zA-Z]*)/);
    if (m) {
      const pattern = m[1];
      letters = pattern.split('').map((c, idx) => {
        if (c === '_') {
          mysteryIndex = idx;
          return { char: '?', isMissing: true };
        }
        return { char: c, isMissing: false };
      });
    }
  }

  // 模式 C：備用，如果 rawText 是完整單字
  if (letters.length === 0) {
    const baseWord = rawText.replace(/[^a-zA-Z]/g, '') || '';
    if (baseWord) {
      letters = baseWord.split('').map((c, idx) => ({ char: c, isMissing: false }));
    } else {
      // 避免洩題：如果沒有挖空資訊，絕不直接展示正解積木，改以神祕積木引導
      const ansWord = (typeof answer === 'string' && /^[a-zA-Z]+$/.test(answer)) ? answer : 'word';
      letters = ansWord.split('').map((c, idx) => ({
        char: idx === 0 ? c : '?',
        isMissing: idx !== 0,
      }));
    }
  }

  // 1. 頂部徽章
  const metaRow = node('div', 'english-meta-row');
  metaRow.innerHTML = `
    <span class="english-meta-badge"><span class="badge-icon">🧩</span> 單字拼讀 · Word Spelling</span>
    <span class="english-meta-badge sound-badge"><span class="badge-icon">✨</span> 字母積木</span>
  `;
  wrap.appendChild(metaRow);

  // 2. 主舞台：emoji + 拼字積木列
  const stage = node('div', 'english-spelling-stage');

  if (emojis && emojis.length > 0) {
    const emojiBox = node('div', 'english-spelling-emojis');
    emojis.forEach(emo => emojiBox.appendChild(node('span', 'english-stage-emoji', emo)));
    stage.appendChild(emojiBox);
  }

  const tilesRow = node('div', 'english-tiles-row');
  const vowels = new Set(['a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U']);

  letters.forEach((item, idx) => {
    const isVowel = vowels.has(item.char);
    const tileClass = item.isMissing
      ? 'english-letter-tile tile-missing'
      : (isVowel ? 'english-letter-tile tile-vowel' : 'english-letter-tile tile-consonant');
    const tile = node('div', tileClass, item.char);
    tile.setAttribute('title', item.isMissing ? '缺少的神秘字母' : `字母 ${item.char}`);
    
    if (!item.isMissing && item.char !== '?') {
      tile.addEventListener('click', () => {
        tile.classList.add('is-speaking');
        speakEnglish(item.char);
        setTimeout(() => tile.classList.remove('is-speaking'), 500);
      });
    }
    tilesRow.appendChild(tile);
  });
  stage.appendChild(tilesRow);
  wrap.appendChild(stage);

  // 3. 朗讀與操作按鈕列
  const actionsRow = node('div', 'english-actions-row');
  const hasOnlyLetters = letters.every(item => item.char && item.char !== '?');
  const targetPronounce = hasOnlyLetters ? letters.map(item => item.char).join('') : (typeof answer === 'string' && /^[a-zA-Z]+$/.test(answer) ? answer : '');
  if (targetPronounce) {
    const playWordBtn = node('button', 'english-listen-btn btn-word', '🔊 聽發音 (Listen)');
    playWordBtn.type = 'button';
    playWordBtn.addEventListener('click', () => {
      playWordBtn.classList.add('is-speaking');
      speakEnglish(targetPronounce);
      setTimeout(() => playWordBtn.classList.remove('is-speaking'), 900);
    });
    actionsRow.appendChild(playWordBtn);
    wrap.appendChild(actionsRow);
  }

  // 4. 狐狸老師的小錦囊（防洩題：不常態顯示 hint，提示需由右上角按鈕點開）
  const foxCard = node('div', 'english-fox-card');
  const foxMsg = '狐狸老師小叮嚀：觀察拼字結構，選出正確的字母或單字喔！需要提示可點右上角 💡！';
  foxCard.innerHTML = `
    <span class="english-fox-avatar" aria-hidden="true">🦊</span>
    <div class="english-fox-msg">${foxMsg}</div>
  `;
  wrap.appendChild(foxCard);

  wrap.appendChild(node('div', 'visual-caption', '單字拼讀教具：觀察拼字積木，找出神秘的字母！'));
  return wrap;
}

/**
 * 英語島：通用視覺教具分流派發器
 */
export function englishVisual(visual = {}, question = null) {
  const text = visual.text || '';
  const prompt = question?.prompt || '';

  // 1. 若題目含有空格填字、缺少字母、拼字下劃線 -> 拼讀積木（排查純「拼字」字樣以防單字選擇題被誤判為積木）
  const hasSpellingBlank = text.includes('?') || text.includes('_') || /補上缺少的字母|缺了哪個母音|缺了哪個字母/.test(prompt) || /([a-zA-Z]*_[a-zA-Z]*)/.test(prompt);
  if (hasSpellingBlank) {
    return englishSpelling(visual, question);
  }

  // 2. 若為明確的字母自然發音卡（如指定 letter 或答案為單一字母之字母題）
  const isLetterPhonics = visual.type === 'englishPhonics' || visual.type === 'phonicsCard' || visual.type === 'letterPhonics' || Boolean(visual.letter) ||
    (question && /^[a-zA-Z]$/.test(String(question.answer).trim()) && /開頭字母|母音字母|哪一個字母/.test(prompt));
  if (isLetterPhonics) {
    const phonicsEl = englishPhonics(visual, question);
    if (phonicsEl) return phonicsEl;
  }

  // 3. 圖片單字學習卡 (Vocabulary Picture Card)
  const wrap = node('div', 'english-visual-wrap english-vocab-wrap');
  let rawEmojis = visual.emojis || (visual.emoji ? [visual.emoji] : ['🌟']);
  const cleanAns = String(question?.answer || '').trim();
  const cleanAnsLower = cleanAns.toLowerCase();
  const isMeaningQuestion = /是什麼意思|中文意思/.test(prompt);
  const isRhymeQuestion = /押韻/.test(prompt);

  // 題幹提及之英文關鍵字（例如：和 hug 押韻中的 hug，mug 是什麼意思中的 mug）
  const promptWords = prompt.match(/[a-zA-Z]{2,}/g) || [];
  const promptKeyWord = promptWords.find(w => w.toLowerCase() !== cleanAnsLower) || '';

  // 圖示防洩題過濾：
  let displayEmojis = [...rawEmojis];
  if (isMeaningQuestion) {
    // 詢問「xxx 是什麼意思？」，若在畫面上展示答案圖示（如 mug 題目顯示 🥤），學童不必識字直接看圖破梗
    displayEmojis = ['📖', '🔤'];
  } else if (isRhymeQuestion && displayEmojis.length > 1) {
    // 押韻題（如「哪個單字和 hug 押韻？」）：只保留題目單字的圖示，剔除正解單字的圖示（如剔除 🐛）
    displayEmojis = displayEmojis.slice(-1); // 保留代表 hug 的 🤗
  } else if (/開頭|結尾/.test(prompt) && question?.options?.includes(cleanAns)) {
    // 詢問開頭音或結尾音的選擇題，若正解為 bug，不展示毛毛蟲 🐛 圖示
    displayEmojis = ['🎧', '🔤'];
  }

  const metaRow = node('div', 'english-meta-row');
  metaRow.innerHTML = `
    <span class="english-meta-badge"><span class="badge-icon">🏝️</span> 奇幻英文島 · Vocabulary</span>
    <span class="english-meta-badge sound-badge"><span class="badge-icon">🎧</span> 雙語生活單字</span>
  `;
  wrap.appendChild(metaRow);

  const stage = node('div', 'english-spelling-stage');
  const emojiBox = node('div', 'english-spelling-emojis');
  displayEmojis.forEach(emo => emojiBox.appendChild(node('span', 'english-stage-emoji', emo)));
  stage.appendChild(emojiBox);

  // 標題或提示（防洩題：單字釋義題展示題目單字卡，例如 mug = ❓；若為一般題則隱藏正解字串）
  let displayText = text;
  if (isMeaningQuestion && promptKeyWord) {
    displayText = `${promptKeyWord} = ❓`;
  } else if (cleanAns && displayText) {
    const cleanTxt = String(displayText).trim().toLowerCase().replace(/\s+/g, '');
    if (cleanTxt === cleanAnsLower || cleanTxt.includes(cleanAnsLower) || cleanAnsLower.includes(cleanTxt)) {
      displayText = '';
    }
  }
  if (displayText) {
    stage.appendChild(node('div', 'english-vocab-text', displayText));
  }
  wrap.appendChild(stage);

  // 尋找目標朗讀英文單字（防洩題鐵律：絕對嚴禁將正解當作朗讀目標印在按鈕上！）
  let targetEnglishWord = '';
  if (promptKeyWord) {
    // 優先朗讀題幹單字（例如播放 hug、mug 讓學童聽發音思考）
    targetEnglishWord = promptKeyWord;
  } else if (text && /[a-zA-Z]/.test(text) && !text.toLowerCase().includes(cleanAnsLower)) {
    targetEnglishWord = text.replace(/[^a-zA-Z]/g, '');
  }

  // 朗讀按鈕區：包含題目完整語音朗讀（含選項發音）及題幹單字發音鈕
  const actionsRow = node('div', 'english-actions-row');
  const speakBtn = node('button', 'english-listen-btn', `🔊 聽題目朗讀`);
  speakBtn.type = 'button';
  speakBtn.addEventListener('click', () => {
    speakBtn.classList.add('is-speaking');
    const displayOptions = question?.currentOptions || question?._displayOptions;
    if (audio && typeof audio.playQuestionAudio === 'function') {
      audio.playQuestionAudio(question, displayOptions);
    } else {
      speakText(question?.speak || prompt);
    }
    setTimeout(() => speakBtn.classList.remove('is-speaking'), 800);
  });
  actionsRow.appendChild(speakBtn);

  if (targetEnglishWord && targetEnglishWord.toLowerCase() !== cleanAnsLower) {
    const wordBtn = node('button', 'english-listen-btn word-listen-btn', `🔊 聽單字 (${targetEnglishWord})`);
    wordBtn.type = 'button';
    wordBtn.addEventListener('click', () => {
      wordBtn.classList.add('is-speaking');
      speakEnglish(targetEnglishWord);
      setTimeout(() => wordBtn.classList.remove('is-speaking'), 800);
    });
    actionsRow.appendChild(wordBtn);
  }
  wrap.appendChild(actionsRow);

  // 狐狸老師錦囊（防洩題：不常態印出 hint，引導小朋友點擊右上角）
  const foxCard = node('div', 'english-fox-card');
  const foxMsg = '狐狸老師小叮嚀：看圖思考發音與意義，需要提示可點右上角 💡 喔！';
  foxCard.innerHTML = `
    <span class="english-fox-avatar" aria-hidden="true">🦊</span>
    <div class="english-fox-msg">${foxMsg}</div>
  `;
  wrap.appendChild(foxCard);

  wrap.appendChild(node('div', 'visual-caption', '英文單字學習卡：看圖思考，點擊聽標準發音！'));
  return wrap;
}



/**
 * 智慧情境故事圖解：當題目沒有指定特定教具 (visual 為 null) 時，
 * 自動美化框框並生成可愛的繪本風插圖與數量關係卡，大幅提升小朋友的理解力與作答趣味！
 */
export function renderStoryVisual(question, level = {}) {
  const wrap = node('div', 'story-visual-wrap');
  const prompt = question?.prompt || '';
  const hint = question?.hint || '';

  // 1. 智慧主題與插圖挑選
  let imgSrc = 'assets/images/story-thinking.jpg';
  let badgeIcon = '💡';
  let badgeName = '思考小天地';
  let defaultEmojiA = '✨';
  let defaultEmojiB = '⭐';

  if (/[花園林樹草朵葉苗]/.test(prompt)) {
    imgSrc = 'assets/images/story-garden.jpg';
    badgeIcon = '🌸';
    badgeName = '花園小冒險';
    defaultEmojiA = '🌺';
    defaultEmojiB = '🌼';
  } else if (/[海浪魚貝水船島沙灘珠]/.test(prompt)) {
    imgSrc = 'assets/images/story-treasure.jpg';
    badgeIcon = '🏝️';
    badgeName = '海島尋寶記';
    defaultEmojiA = '🐚';
    defaultEmojiB = '⭐';
  } else if (/[水果糖餅乾布丁蘋果蛋糕巧克力西瓜香蕉草莓]/.test(prompt)) {
    imgSrc = 'assets/images/story-garden.jpg';
    badgeIcon = '🍎';
    badgeName = '美味點心坊';
    defaultEmojiA = '🍓';
    defaultEmojiB = '🍬';
  } else if (/[車人學生跑步操場公車球]/.test(prompt)) {
    imgSrc = 'assets/images/story-thinking.jpg';
    badgeIcon = '🏫';
    badgeName = '校園冒險記';
    defaultEmojiA = '🏃';
    defaultEmojiB = '🎒';
  }

  // 輔助函式：根據物品名稱選擇合適的可愛 emoji
  function pickItemEmoji(name, defaultIcon) {
    if (/紅花/.test(name)) return '🌹';
    if (/黃花/.test(name)) return '🌼';
    if (/白花|藍花/.test(name)) return '🌸';
    if (/花/.test(name)) return '🌷';
    if (/蘋果/.test(name)) return '🍎';
    if (/糖果/.test(name)) return '🍬';
    if (/巧克力/.test(name)) return '🍫';
    if (/布丁/.test(name)) return '🍮';
    if (/鉛筆|筆/.test(name)) return '✏️';
    if (/書|本子/.test(name)) return '📖';
    if (/車|公車/.test(name)) return '🚌';
    if (/人|同學|學生/.test(name)) return '👦';
    if (/元|錢/.test(name)) return '🪙';
    if (/公分|公尺/.test(name)) return '📏';
    if (/魚/.test(name)) return '🐟';
    if (/貝殼/.test(name)) return '🐚';
    return defaultIcon;
  }

  // 2. 嘗試解析情境結構
  const cardInner = node('div', 'story-card-inner');

  // 插圖展示區 (左側)
  const imgBox = node('div', 'story-img-container');
  const img = document.createElement('img');
  img.src = imgSrc;
  img.alt = badgeName;
  img.loading = 'lazy';
  imgBox.appendChild(img);
  cardInner.appendChild(imgBox);

  // 內容與關係卡片區 (右側)
  const contentBox = node('div', 'story-content');

  // 頂部徽章標籤
  const badgeRow = node('div', 'story-badge-row');
  badgeRow.innerHTML = `<span class="story-badge">${badgeIcon} ${badgeName}</span>`;
  contentBox.appendChild(badgeRow);

  // 解析題目類型
  let renderedCustom = false;

  // A. 算式題 (如 65 + 28 = ？)
  const calcMatch = prompt.match(/(\d+)\s*([\+\-\×\*\÷\/])\s*(\d+)/);
  if (calcMatch && !/[共有剩]/.test(prompt)) {
    const [, n1, rawOp, n2] = calcMatch;
    const opDisplay = rawOp === '*' ? '×' : (rawOp === '/' ? '÷' : rawOp);
    const eqBox = node('div', 'story-equation-box');
    eqBox.innerHTML = `
      <div class="story-item-chip"><strong>${n1}</strong></div>
      <div class="story-op-chip">${opDisplay}</div>
      <div class="story-item-chip"><strong>${n2}</strong></div>
      <div class="story-op-chip">＝</div>
      <div class="story-item-chip story-target-chip"><strong>？</strong></div>
    `;
    contentBox.appendChild(eqBox);
    renderedCustom = true;
  }

  // B. 雙物件應用題 (如「紅花有 44 朵，黃花有 39 朵，兩種花共有幾朵？」)
  if (!renderedCustom) {
    const twoItemsRegex = /([^\s，,。？?]+?)\s*(?:有)?\s*(\d+)\s*([\u4e00-\u9fa5]{1,2})/g;
    const matches = [...prompt.matchAll(twoItemsRegex)];
    if (matches.length >= 2) {
      const itemA = matches[0];
      const itemB = matches[1];

      // 判斷運算關係
      const isSub = /(?:剩下|還差|多多少|少多少|借給|用掉|吃了|賣掉|走掉)/.test(prompt);
      const isMul = /(?:每盒|每包|每袋|每隊|幾倍)/.test(prompt);
      const opSymbol = isSub ? '－' : (isMul ? '×' : '＋');

      const emojiA = pickItemEmoji(itemA[1], defaultEmojiA);
      const emojiB = pickItemEmoji(itemB[1], defaultEmojiB);

      // 清理物品名稱（避免「兩種花」、「又上來」等前綴污染）
      const cleanNameA = itemA[1].replace(/^(?:小明|小美|媽媽|車上|弟弟|妹妹|地上|桌上|箱子裡|一共有|共有)/, '') || '第一種';
      const cleanNameB = itemB[1].replace(/^(?:又買了|又上來|賣了|吃了|用掉|走掉|借給)/, '') || '第二種';

      const eqBox = node('div', 'story-equation-box');
      eqBox.innerHTML = `
        <div class="story-item-chip">
          <span class="story-chip-emoji">${emojiA}</span>
          <span>${cleanNameA}</span>
          <strong>${itemA[2]}</strong>
          <small>${itemA[3]}</small>
        </div>
        <div class="story-op-chip">${opSymbol}</div>
        <div class="story-item-chip">
          <span class="story-chip-emoji">${emojiB}</span>
          <span>${cleanNameB}</span>
          <strong>${itemB[2]}</strong>
          <small>${itemB[3]}</small>
        </div>
        <div class="story-op-chip">＝</div>
        <div class="story-item-chip story-target-chip">
          <strong>❓ ${isSub ? '剩下' : '一共'}</strong>
        </div>
      `;
      contentBox.appendChild(eqBox);
      renderedCustom = true;
    }
  }

  // C. 比大小題 (如比大小：4320 和 4230)
  if (!renderedCustom && (prompt.includes('比大小') || (prompt.includes('和') && /哪一個/.test(prompt)))) {
    const numMatches = prompt.match(/\d+/g);
    if (numMatches && numMatches.length >= 2) {
      const eqBox = node('div', 'story-equation-box');
      eqBox.innerHTML = `
        <div class="story-item-chip"><strong>${numMatches[0]}</strong></div>
        <div class="story-op-chip">⚖️ VS</div>
        <div class="story-item-chip"><strong>${numMatches[1]}</strong></div>
        <div class="story-item-chip story-target-chip"><strong>❓ 誰比較${prompt.includes('小') ? '小' : '大'}？</strong></div>
      `;
      contentBox.appendChild(eqBox);
      renderedCustom = true;
    }
  }

  // D. 一般概念/數位/通用指引卡
  if (!renderedCustom) {
    const guideBox = node('div', 'story-message');
    guideBox.innerHTML = `
      <p style="margin: 0; color: #4b3869; font-weight: 700;">🦊 狐狸老師的解題小錦囊：</p>
      <p style="margin: 4px 0 0 0; color: #766494; font-size: 13.5px;">仔細觀察題目中的關鍵數字與線索，動動腦筋就能找到答案喔！</p>
    `;
    contentBox.appendChild(guideBox);
  }

  cardInner.appendChild(contentBox);
  wrap.appendChild(cardInner);

  // 底部提示輔助
  const captionText = hint ? `💡 解題靈感：${hint}` : '🌟 仔細閱讀題目條件，跟著小狐狸一起算算看！';
  wrap.appendChild(node('div', 'story-caption', captionText));

  return wrap;
}

