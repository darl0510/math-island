export const GRADES = [
  {
    id: 1,
    name: '一年級',
    shortName: '小一',
    icon: '🍎',
    badge: '台灣小一 · 108 課綱',
    title: '奇幻數學島',
    subtitle: '4 座奇妙島嶼 · 16 個冒險關卡 · 邊玩邊學數學',
    age: '適合 6–7 歲',
    questionBankUrl: 'data/question-bank-g1.json',
    islands: [
      { id: 1, name: '森林起步篇', theme: 'forest', color: '#3fae6a', emoji: '🌳', blurb: '用十格陣列數一數，認識比多少、序數和 10 的分與合。' },
      { id: 2, name: '海洋探索篇', theme: 'ocean', color: '#2b9cdb', emoji: '🌊', blurb: '潛入 10 以內加減法，認識形狀與時鐘整點半點。' },
      { id: 3, name: '雲朵挑戰篇', theme: 'cloud', color: '#8d7bf0', emoji: '☁️', blurb: '乘著雲朵認識 20 以內的數，挑戰進位加法、退位減法與長度比較。' },
      { id: 4, name: '星空大師篇', theme: 'space', color: '#443f9a', emoji: '✨', blurb: '登陸星空島，解鎖 100 以內的數、兩位數加減、認識錢幣與日曆統計。' }
    ]
  },
  {
    id: 2,
    name: '二年級',
    shortName: '小二',
    icon: '🌟',
    badge: '台灣小二 · 108 課綱',
    title: '奇幻數學島：乘法與幾何大冒險',
    subtitle: '4 座進階島嶼 · 16 個二位數與乘法關卡 · 乘風破浪冒險',
    age: '適合 7–8 歲',
    questionBankUrl: 'data/question-bank-g2.json',
    islands: [
      { id: 1, name: '綠野仙蹤島', theme: 'forest', color: '#3fae6a', emoji: '🌲', blurb: '200以內的數、二位數直式加法、二位數減法與直尺公分測量。' },
      { id: 2, name: '水晶冰川島', theme: 'ocean', color: '#2b9cdb', emoji: '🧊', blurb: '兩步驟連加連減、時鐘幾點幾分、容量重量初步與平面立體形狀。' },
      { id: 3, name: '烈焰熔岩島', theme: 'cloud', color: '#ff7675', emoji: '🔥', blurb: '同數連加乘法初步、九九乘法表大挑戰與乘法生活應用題。' },
      { id: 4, name: '幻彩星河島', theme: 'space', color: '#443f9a', emoji: '🌌', blurb: '1000以內的數、三位數加減心算、認識千元與百元錢幣、簡單分數二分之一。' }
    ]
  },
  {
    id: 3,
    name: '三年級',
    shortName: '小三',
    icon: '🚀',
    badge: '台灣小三 · 108 課綱',
    title: '奇幻數學島：大數與分數王國',
    subtitle: '4 座挑戰島嶼 · 16 個大數、四則與分數小數關卡 · 奇幻啟航',
    age: '適合 8–9 歲',
    questionBankUrl: 'data/question-bank-g3.json',
    islands: [
      { id: 1, name: '算術神殿', theme: 'forest', color: '#3fae6a', emoji: '🏛️', blurb: '四位數大小與加減、三位數乘一位數直式運算與除法初步。' },
      { id: 2, name: '幾何迷宮', theme: 'ocean', color: '#2b9cdb', emoji: '📐', blurb: '認識角與直角量角器、圓心半徑直徑、長方形正方形周長與長度換算。' },
      { id: 3, name: '分數花園', theme: 'cloud', color: '#8d7bf0', emoji: '🌷', blurb: '認識分數分子分母、同分母分數加減、一位小數 0.1 與小數大小比較。' },
      { id: 4, name: '時空星盤', theme: 'space', color: '#443f9a', emoji: '🪐', blurb: '日時分秒換算、重量公斤公克、容積公升毫升與報讀長條圖。' }
    ]
  }
];

export function getGradeConfig(gradeId = 1) {
  return GRADES.find((g) => Number(g.id) === Number(gradeId)) || GRADES[0];
}
