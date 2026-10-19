import { randInt, pick, shuffle, numberOptions, textOptions } from '../utils.js';

export const g2_islands = [
  {
    id: 1,
    name: '綠野仙蹤島',
    emoji: '🌲',
    theme: 'forest',
    color: '#3fae6a',
    blurb: '200以內的數、二位數直式加法、二位數減法與直尺公分測量。',
    levels: [
      {
        id: 1,
        island: 1,
        title: '百數果園',
        emoji: '🍎',
        skill: '200以內的數',
        intro: '歡迎來到二年級的百數果園！我們一起來數一數超過一百的果子。',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 2,
        island: 1,
        title: '直式加法小步梯',
        emoji: '🪜',
        skill: '二位數直式加法',
        intro: '小動物正在蓋積木梯！我們用直式把十位和個位加起來。',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 3,
        island: 1,
        title: '退位減法大考驗',
        emoji: '🎯',
        skill: '二位數退位減法',
        intro: '個位不夠減怎麼辦？向十位借一個十，變成十再來減！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 4,
        island: 1,
        title: '小尺量世界',
        emoji: '📏',
        skill: '認識公分與長度',
        intro: '拿起小直尺，前端對齊零，我們能量出好多文具的長度！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 2,
    name: '水晶冰川島',
    emoji: '🧊',
    theme: 'ocean',
    color: '#2b9cdb',
    blurb: '兩步驟連加連減、時鐘幾點幾分、容量重量初步與平面立體形狀。',
    levels: [
      {
        id: 5,
        island: 2,
        title: '企鵝連環算',
        emoji: '🐧',
        skill: '兩步驟連加連減',
        intro: '先加後減、先減後加，小企鵝滑冰一步一步算得清清楚楚！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 6,
        island: 2,
        title: '時鐘滴答跳',
        emoji: '⏰',
        skill: '幾點幾分',
        intro: '分針走一大格是五分鐘！我們一起看時鐘上的幾點幾分。',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 7,
        island: 2,
        title: '天平與水瓶',
        emoji: '⚖️',
        skill: '容量與重量',
        intro: '天平哪一邊沉下去？水杯哪一個裝得多？動動腦比一比！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 8,
        island: 2,
        title: '立體形狀城',
        emoji: '🎲',
        skill: '正方體與立體形狀',
        intro: '正方體有六個面、八個頂點、十二條邊！一起來認識立體朋友。',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 3,
    name: '烈焰熔岩島',
    emoji: '🔥',
    theme: 'cloud',
    color: '#ff7675',
    blurb: '同數連加乘法初步、九九乘法表大挑戰與乘法生活應用題。',
    levels: [
      {
        id: 9,
        island: 3,
        title: '同數連加小火苗',
        emoji: '✨',
        skill: '乘法初步概念',
        intro: '三堆草莓每堆四顆，四加四加四就是四乘三！乘法讓加法更快！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 10,
        island: 3,
        title: '乘法口訣飛車 (一)',
        emoji: '🏎️',
        skill: '2、5、4、8 的乘法',
        intro: '二的跳數、五的結尾、四和八的倍數，乘法飛車全速前進！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 11,
        island: 3,
        title: '乘法九宮格 (二)',
        emoji: '⚡',
        skill: '3、6、9、7 的乘法',
        intro: '三七二十一、六六三十六、七八五十六、九九八十一，無敵大口訣！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 12,
        island: 3,
        title: '生活乘法小達人',
        emoji: '🛒',
        skill: '乘法生活應用題',
        intro: '買文具、分水果、排隊伍，生活中的算術用乘法一秒搞定！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 4,
    name: '幻彩星河島',
    emoji: '🌌',
    theme: 'space',
    color: '#443f9a',
    blurb: '1000以內的數、三位數加減心算、認識千元與百元錢幣、簡單分數二分之一。',
    levels: [
      {
        id: 13,
        island: 4,
        title: '千數星雲',
        emoji: '🪐',
        skill: '1000以內的數',
        intro: '十個一百就是一千！飛進浩瀚的千數星雲，探索四位數的奧祕！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 14,
        island: 4,
        title: '三位數心算流星',
        emoji: '💫',
        skill: '三位數加減法',
        intro: '三百加四百等於七百！整百整十的心算像流星一樣飛快！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 15,
        island: 4,
        title: '百元與千元金庫',
        emoji: '💰',
        skill: '認識大額錢幣',
        intro: '一百元鈔、五百元鈔、一千元大鈔，換錢付錢找錢我最拿手！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 16,
        island: 4,
        title: '分數小星球',
        emoji: '🍕',
        skill: '簡單分數初步',
        intro: '平分成兩份的一份是二分之一、四份是四分之一！恭喜登上二年級巔峰！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  }
];
