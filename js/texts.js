export const PRAISE = [
  '答對了！你好棒！',
  '太厲害了！完全正確！',
  '好聰明喔！答對了！',
  '哇！你做到了！',
  '太棒了！答題小高手！',
];

export const SUBJECT_PRAISES = {
  math: [
    '答對了！你好棒！',
    '太厲害了！完全正確！',
    '好聰明喔！答對了！',
    '哇！你做到了！',
    '正確！你是數學小達人！',
    '太棒了！數字冒險家！',
  ],
  english: [
    '答對了！你好棒！',
    '太厲害了！完全正確！',
    'Great job! 英文小高手！',
    '哇！你做到了！',
    'Awesome! 拼讀大成功！',
    '好聰明喔！答對了！',
  ],
  chinese: [
    '答對了！你好棒！',
    '太厲害了！完全正確！',
    '字詞小博士！棒極了！',
    '好聰明喔！答對了！',
    '哇！你做到了！',
    '辨識得真清楚！完全正確！',
  ],
  science: [
    '答對了！你好棒！',
    '太厲害了！完全正確！',
    '小小科學家！探索成功！',
    '好聰明喔！答對了！',
    '哇！觀察得真仔細！',
    '太神了！完全正確！',
  ],
  challenge: [
    '答對了！你好棒！',
    '太厲害了！完全正確！',
    '全能小勇者！答對了！',
    '哇！你做到了！',
    '跨領域大師！太強了！',
  ],
};

export function getSubjectPraise(subjectId = 'math') {
  const pool = SUBJECT_PRAISES[String(subjectId)] || PRAISE;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const ENCOURAGE = [
  '再想一想，你可以的！',
  '差一點點，再試一次！',
  '慢慢來，仔細看一看。',
  '沒關係，我們一起想一想。',
];

// 遊戲中所有「非題庫」的語音。新增任何語音時，務必同步加在這裡，
// 並重新執行 npm run tts:static，確保靜態網站不會即時呼叫 TTS。
export const SPEECH_FIXED = [
  '沒關係，我們一起看。',
  '語音讀題打開了，我會唸題目給你聽。',
  '先完成前面的關卡，就能解鎖囉！',
  '仔細看一看題目。',
  '太厲害了！你得到三顆星！',
  '很棒喔！你得到兩顆星！再挑戰一次可以拿三顆星。',
  '恭喜過關！你得到一顆星，我們再練習一次好嗎？',
  ...PRAISE,
  ...SUBJECT_PRAISES.math,
  ...SUBJECT_PRAISES.english,
  ...SUBJECT_PRAISES.chinese,
  ...SUBJECT_PRAISES.science,
  ...SUBJECT_PRAISES.challenge,
];

