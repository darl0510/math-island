import { DEFAULT_SUBJECT } from './subjects.js';

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
      { id: 2, name: '海洋加減篇', theme: 'ocean', color: '#2aa7c9', emoji: '🐬', blurb: '在海底學加減、認識形狀，還要看懂時鐘。' },
      { id: 3, name: '雲端進階篇', theme: 'cloud', color: '#7c8cf8', emoji: '☁️', blurb: '學會湊十與破十，認識十位個位，再用方格尺量一量。' },
      { id: 4, name: '星空魔王篇', theme: 'space', color: '#8b5cf6', emoji: '🚀', blurb: '認識台灣錢幣、二位數加減、日曆統計，挑戰生活應用題大魔王！' }
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

/* 奇幻英文島年級表：小一 16 關自然發音與生活單字（4 島 × 4 關） */
export const ENGLISH_GRADES = [
  {
    id: 1,
    name: '一年級',
    shortName: '小一',
    icon: '🔤',
    badge: '台灣小一 · 自然發音 Phonics',
    title: '奇幻英文島',
    subtitle: '4 座字母島嶼 · 16 個發音與生活單字關卡 · 邊玩邊學英文',
    age: '適合 6–7 歲',
    questionBankUrl: 'data/question-bank-en-g1.json',
    islands: [
      { id: 1, name: '字母起步島', theme: 'forest', color: '#3fae6a', emoji: '🌳', blurb: '認識 Aa Bb Cc Dd 的開頭音，聽一聽、找一找字母起手式。' },
      { id: 2, name: '短母音海島', theme: 'ocean', color: '#2b9cdb', emoji: '🌊', blurb: '短母音 a e i o 與 -at、-en、-ig、-og 押韻家族。' },
      { id: 3, name: '雙字母雲島', theme: 'cloud', color: '#8d7bf0', emoji: '☁️', blurb: 'sh、ch、th、ng、ck 雙字母音，聽音辨字大挑戰。' },
      { id: 4, name: '生活單字星島', theme: 'space', color: '#443f9a', emoji: '✨', blurb: '顏色、數字、家人、食物與動物生活單字，還有英文問候語。' }
    ]
  },
  {
    id: 2,
    name: '二年級',
    shortName: '小二',
    icon: '🔤',
    badge: '台灣小二 · 自然發音 Phonics',
    title: '奇幻英文島：長母音與詞族大冒險',
    subtitle: '4 座進階島嶼 · 16 個長母音、子音混合與詞族關卡 · 乘風破浪學英文',
    age: '適合 7–8 歲',
    questionBankUrl: 'data/question-bank-en-g2.json',
    islands: [
      { id: 1, name: '長母音魔法島', theme: 'forest', color: '#3fae6a', emoji: '🌲', blurb: 'Magic e 長母音 a_e、i_e、o_e、u_e，聽一聽母音變長了！' },
      { id: 2, name: '子音混合海島', theme: 'ocean', color: '#2b9cdb', emoji: '🧊', blurb: 'bl、cl、st、tr 子音混合，兩個子音手拉手一起發音。' },
      { id: 3, name: '詞族雲島', theme: 'cloud', color: '#ff7675', emoji: '🔥', blurb: '-ight、-ound、-ain、-own 詞族，認識長詞尾的拼寫模式。' },
      { id: 4, name: '生活對話星島', theme: 'space', color: '#443f9a', emoji: '🌌', blurb: '問候、自我介紹、描述與簡單問句，用英文說出自己的生活。' }
    ]
  },
  {
    id: 3,
    name: '三年級',
    shortName: '小三',
    icon: '🔤',
    badge: '台灣小三 · 自然發音 Phonics',
    title: '奇幻英文島：母音組合與句子王國',
    subtitle: '4 座挑戰島嶼 · 16 個母音組合、詞尾變化與句子關卡 · 奇幻啟航',
    age: '適合 8–9 歲',
    questionBankUrl: 'data/question-bank-en-g3.json',
    islands: [
      { id: 1, name: '母音組合神殿', theme: 'forest', color: '#3fae6a', emoji: '🏛️', blurb: 'ai/ay、ee/ea、oa/ow 母音組合，兩個母音手拉手發長音。' },
      { id: 2, name: '詞尾變身迷宮', theme: 'ocean', color: '#2b9cdb', emoji: '📐', blurb: '-ing、-ed、-ly、-ful 詞尾變化，認識動詞與形容詞的变形。' },
      { id: 3, name: '句子花園', theme: 'cloud', color: '#8d7bf0', emoji: '🌷', blurb: '主詞動詞、形容詞修飾、連接詞與問句，組出完整漂亮的句子。' },
      { id: 4, name: '故事星盤', theme: 'space', color: '#443f9a', emoji: '🪐', blurb: '閱讀理解、段落結構、故事順序與創意寫作，用英文說完整的故事。' }
    ]
  }
];

/* 奇幻國語島年級表：小一 16 關注音符號、筆順與部首部件（4 島 × 4 關） */
export const CHINESE_GRADES = [
  {
    id: 1,
    name: '一年級',
    shortName: '小一',
    icon: '📖',
    badge: '台灣小一 · 108 課綱',
    title: '奇幻國語島',
    subtitle: '4 座語文島嶼 · 16 個注音符號、筆順與部首部件關卡 · 邊玩邊學國語',
    age: '適合 6–7 歲',
    questionBankUrl: 'data/question-bank-ch-g1.json',
    islands: [
      { id: 1, name: '注音符號起步島', theme: 'forest', color: '#3fae6a', emoji: '🌳', blurb: '認識ㄅㄆㄇㄈ聲母與ㄧㄨㄩ介音，聽一聽、找一找注音符號起手式。' },
      { id: 2, name: '筆順海島', theme: 'ocean', color: '#2b9cdb', emoji: '🌊', blurb: '認識基本筆畫與筆順規則，一筆一畫寫出正確的字。' },
      { id: 3, name: '部首部件雲島', theme: 'cloud', color: '#8d7bf0', emoji: '☁️', blurb: '認識口、水、火、木等常用部首，拆解部件組合新字。' },
      { id: 4, name: '生活語文星島', theme: 'space', color: '#443f9a', emoji: '✨', blurb: '顏色、數字、家人、食物與動物生活詞彙，還有中文問候語。' }
    ]
  },
  {
    id: 2,
    name: '二年級',
    shortName: '小二',
    icon: '📖',
    badge: '台灣小二 · 108 課綱',
    title: '奇幻國語島：筆順部首與拼字大冒險',
    subtitle: '4 座進階島嶼 · 16 個筆順精進、部首歸類、部件拼字與形近量詞關卡 · 乘風破浪學國語',
    age: '適合 7–8 歲',
    questionBankUrl: 'data/question-bank-ch-g2.json',
    islands: [
      { id: 1, name: '筆順精進島', theme: 'forest', color: '#3fae6a', emoji: '🌲', blurb: '進階筆順規則：先橫後豎、先撇後捺、先外後內、先中間後封口。' },
      { id: 2, name: '部首歸類島', theme: 'ocean', color: '#2b9cdb', emoji: '🧊', blurb: '認識水部、火部、木部、口部等常用部首的意義與歸類。' },
      { id: 3, name: '部件拼字島', theme: 'cloud', color: '#ff7675', emoji: '🔥', blurb: '把部件拼成完整國字：左右、上下、包圍結構，拆拆拼拼學造字。' },
      { id: 4, name: '形近字與量詞島', theme: 'space', color: '#443f9a', emoji: '🌌', blurb: '分辨形近字（己已巳、未末、土士）與正確使用量詞。' }
    ]
  },
  {
    id: 3,
    name: '三年級',
    shortName: '小三',
    icon: '📖',
    badge: '台灣小三 · 108 課綱',
    title: '奇幻國語島：修辭成語與閱讀大冒險',
    subtitle: '4 座挑戰島嶼 · 16 個修辭基礎、成語運用、句型變換與段落閱讀關卡 · 奇幻啟航',
    age: '適合 8–9 歲',
    questionBankUrl: 'data/question-bank-ch-g3.json',
    islands: [
      { id: 1, name: '修辭魔法殿', theme: 'forest', color: '#3fae6a', emoji: '🏛️', blurb: '認識譬喻、擬人、排比與設問等常用修辭手法，讓文章變得生動傳神！' },
      { id: 2, name: '成語典故海', theme: 'ocean', color: '#2b9cdb', emoji: '🌊', blurb: '探索動物寓言成語、勤學勵志、景物描摹與品德成語，妙筆生花！' },
      { id: 3, name: '句型變換雲', theme: 'cloud', color: '#8d7bf0', emoji: '☁️', blurb: '熟練因果轉折複句、條件遞進、把字句被字句互換與照樣造句！' },
      { id: 4, name: '段落閱讀星', theme: 'space', color: '#443f9a', emoji: '🪐', blurb: '標點符號應用、段落主旨歸納、記敘文六要素與短文閱讀理解大考驗！' }
    ]
  }
];

/* 跨科目期末綜合挑戰島年級表：小一至小三 16 關跨領域綜合素養會考（4 島 × 4 關） */
export const CHALLENGE_GRADES = [
  {
    id: 1,
    name: '一年級',
    shortName: '小一',
    icon: '🏆',
    badge: '台灣小一 · 跨科目期末綜合素養會考',
    title: '跨科目期末綜合挑戰島',
    subtitle: '4 座期末素養島嶼 · 16 個跨學科綜合冒險關卡 · 迎戰期末榮譽',
    age: '適合 6–7 歲',
    questionBankUrl: 'data/question-bank-challenge-g1.json',
    islands: [
      { id: 1, name: '素養起步島', theme: 'forest', color: '#3fae6a', emoji: '🌱', blurb: '十以內數感、自然發音開頭音與ㄅㄆㄇ聲母辨析，跨學科基礎大集合！' },
      { id: 2, name: '生活探索島', theme: 'ocean', color: '#2aa7c9', emoji: '🌊', blurb: '生活加減、短母音押韻與日常生活筆順部件，生活素養一把罩！' },
      { id: 3, name: '思維進階島', theme: 'cloud', color: '#7c8cf8', emoji: '☁️', blurb: '湊十破十、雙字母發音與句型結構，挑戰深度邏輯思考！' },
      { id: 4, name: '期末總魔王殿', theme: 'space', color: '#8b5cf6', emoji: '👑', blurb: '台灣錢幣、二位數加減、高頻詞彙與閱讀統整，小一全方位終極試煉！' },
    ],
  },
  {
    id: 2,
    name: '二年級',
    shortName: '小二',
    icon: '🏆',
    badge: '台灣小二 · 跨科目期末綜合素養會考',
    title: '跨科目期末綜合挑戰島：乘風破浪大冒險',
    subtitle: '4 座進階素養島嶼 · 16 個二位數、長母音與部件量詞關卡 · 榮譽啟航',
    age: '適合 7–8 歲',
    questionBankUrl: 'data/question-bank-challenge-g2.json',
    islands: [
      { id: 1, name: '乘風啟航島', theme: 'forest', color: '#3fae6a', emoji: '🌲', blurb: '200以內數、Magic e 長母音與進階筆順規範，二年級跨領域起跑！' },
      { id: 2, name: '度量冰川島', theme: 'ocean', color: '#2b9cdb', emoji: '🧊', blurb: '連加連減、時鐘幾分、子音混合與量詞搭配，生活度量一把罩！' },
      { id: 3, name: '乘法烈焰島', theme: 'cloud', color: '#ff7675', emoji: '🔥', blurb: '乘法初步、九九乘法表、日常會話與造句積木，熱血解題！' },
      { id: 4, name: '星河大魔王殿', theme: 'space', color: '#443f9a', emoji: '🌌', blurb: '1000以內數、簡單分數二分之一、生活閱讀理解，二年級總魔王！' },
    ],
  },
  {
    id: 3,
    name: '三年級',
    shortName: '小三',
    icon: '🏆',
    badge: '台灣小三 · 跨科目期末綜合素養會考',
    title: '跨科目期末綜合挑戰島：大成素養金盃',
    subtitle: '4 座挑戰素養島嶼 · 16 個大數、四則成語、幾何文法與分數閱讀關卡 · 登頂王座',
    age: '適合 8–9 歲',
    questionBankUrl: 'data/question-bank-challenge-g3.json',
    islands: [
      { id: 1, name: '算術神殿島', theme: 'forest', color: '#3fae6a', emoji: '🏛️', blurb: '四位數、三位數乘除法、ai/ee 母音組合與成語典故，三年級跨領域揚帆！' },
      { id: 2, name: '幾何修辭海', theme: 'ocean', color: '#2b9cdb', emoji: '📐', blurb: '認識直角角、圓與周長、主詞動詞文法與擬人譬喻修辭，文理並進！' },
      { id: 3, name: '分數閱讀花園', theme: 'cloud', color: '#8d7bf0', emoji: '🌷', blurb: '分數分子分母、一位小數、段落閱讀主旨與複句轉折，思維深度昇華！' },
      { id: 4, name: '時空終極星盤', theme: 'space', color: '#443f9a', emoji: '🪐', blurb: '時間換算、容量重量、報讀長條圖與跨學科素養，三年級最高殿堂！' },
    ],
  },
];

/* 科目 → 年級字典：新增「奇幻英文島 / 奇幻國語島 / 期末綜合挑戰島」時在此掛上該科年級表即可 */
export const SUBJECT_GRADES = {
  math: GRADES,
  english: ENGLISH_GRADES,
  chinese: CHINESE_GRADES,
  challenge: CHALLENGE_GRADES,
};

export function getSubjectGrades(subjectId = DEFAULT_SUBJECT) {
  return SUBJECT_GRADES[subjectId] || SUBJECT_GRADES[DEFAULT_SUBJECT];
}

export function isSubjectGradePrepared(subjectId = DEFAULT_SUBJECT) {
  return Boolean(SUBJECT_GRADES[subjectId]);
}

export function getGradeConfig(gradeId = 1, subjectId = DEFAULT_SUBJECT) {
  const grades = getSubjectGrades(subjectId);
  return grades.find((g) => Number(g.id) === Number(gradeId)) || grades[0];
}
