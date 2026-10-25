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
  if (question && question.answer) {
    const ans = String(question.answer).trim();
    if (ans === displayPinyin) {
      displayPinyin = '？';
      defaultFox = '小狐狸提醒：仔細看國字，選出正確的注音喔！';
    } else if (ans === displayChar) {
      displayChar = '？';
      defaultFox = '小狐狸提醒：仔細看注音與筆順，選出正確的國字喔！';
    }
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
      speakText(char === '？' ? '問號' : (word || displayChar));
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

  if (displayChar.length > 1 || (word && word !== displayChar)) {
    side.appendChild(node('div', 'chinese-word-caption', `生詞：${word || displayChar}`));
  }

  const speakChip = node('button', 'chinese-speak-chip');
  speakChip.type = 'button';
  speakChip.innerHTML = `<span>🔊</span> <span>聽讀音</span>`;
  speakChip.addEventListener('click', () => {
    speakText(word || displayChar);
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

  let displaySymbol = symbol;
  let displayWord = word;
  let foxMsg = `聽聽看，動動腦選出正確答案喔！`;

  // 防洩題防禦：如果問的是注音/結合韻，而 symbol 正好是答案
  if (question && question.answer) {
    const ans = String(question.answer).trim();
    if (ans === symbol) {
      // 答案是注音符號，把 symbol 遮蔽為 ？，展示題目生字
      displaySymbol = '？';
      foxMsg = displayWord ? `「${displayWord}」要怎麼拼音呢？動動腦選選看！` : '聽聽看，要選哪一個注音呢？';
    } else if (ans === word) {
      // 答案是生字，把 word 遮蔽為 ？，展示注音
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

  // 若有生字或詞彙
  if (displayWord) {
    card.appendChild(node('div', 'phonetic-divider'));
    const wordWrap = node('div', 'phonetic-word-wrap');
    const wordLabel = displaySymbol === '？'
      ? `生字：${displayWord}`
      : `<span class="phonetic-word-arrow">➔</span> <span>${displayWord}</span>`;
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
    const textToSpeak = (displayWord && displayWord !== '？') ? displayWord : (displaySymbol === '？' ? '問號' : displaySymbol);
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

