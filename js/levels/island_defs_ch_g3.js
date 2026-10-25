/* 奇幻國語島・小三關卡表（4 島 × 4 關）：題庫由 data/question-bank-ch-g3.json 提供，
   本檔負責島嶼與關卡的標題、技能與中文 intro（語音由 zh-TW 引擎讀出）。 */

export const ch_g3_islands = [
  {
    id: 1,
    name: '修辭魔法殿',
    emoji: '🏛️',
    theme: 'forest',
    color: '#3fae6a',
    blurb: '認識譬喻、擬人、排比與設問等常用修辭手法，讓文章變得生動傳神！',
    levels: [
      {
        id: 1,
        island: 1,
        title: '譬喻修辭森林',
        emoji: '🌳',
        skill: '修辭：譬喻（像、彷彿）',
        intro: '把一件事情比喻成另一件相似的事物，常用「像」、「彷彿」，像月亮像香蕉！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 2,
        island: 1,
        title: '擬人修辭花園',
        emoji: '🌷',
        skill: '修辭：擬人（把物當人寫）',
        intro: '把沒有生命的事物寫得像人一樣有表情、動作！例如「風兒在樹梢輕輕唱歌」！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 3,
        island: 1,
        title: '排比疊句峽谷',
        emoji: '🏞️',
        skill: '修辭：排比（結構相同句）',
        intro: '三個或三個以上結構相同或相似的短句排列在一起，氣勢磅礡、節奏明快！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 4,
        island: 1,
        title: '設問感嘆之巔',
        emoji: '⛰️',
        skill: '修辭：設問與感嘆',
        intro: '設問是自問自答引起注意，感嘆是用驚嘆號抒發強烈感情！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 2,
    name: '成語典故海',
    emoji: '🌊',
    theme: 'ocean',
    color: '#2b9cdb',
    blurb: '探索動物寓言成語、勤學勵志、景物描摹與品德成語，妙筆生花！',
    levels: [
      {
        id: 5,
        island: 2,
        title: '動物寓言海灣',
        emoji: '🐢',
        skill: '成語：動物寓言故事',
        intro: '守株待兔、井底之蛙、狐假虎威、亡羊補牢，每句成語背後都有深刻道理！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 6,
        island: 2,
        title: '勤奮求學浪花',
        emoji: '📚',
        skill: '成語：勤學勵志',
        intro: '專心致志、積少成多、學無止境、孜孜不倦，學習需要堅持與專注！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 7,
        island: 2,
        title: '景物自然潮汐',
        emoji: '🌅',
        skill: '成語：描繪自然風景',
        intro: '鳥語花香、風和日麗、山明水秀、綠草如茵，用好成語讓筆下的風景活過來！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 8,
        island: 2,
        title: '人物品質深海',
        emoji: '💎',
        skill: '成語：品德與人物特質',
        intro: '見義勇為、大公無私、一絲不苟、平易近人，讚揚美好品格！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 3,
    name: '句型變換雲',
    emoji: '☁️',
    theme: 'cloud',
    color: '#8d7bf0',
    blurb: '熟練因果轉折複句、條件遞進、把字句被字句互換與照樣造句！',
    levels: [
      {
        id: 9,
        island: 3,
        title: '因果轉折雲層',
        emoji: '⚡',
        skill: '句型：因果與轉折複句',
        intro: '「因為…所以…」表示前因後果，「雖然…但是…」表示轉折逆向，邏輯清晰！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 10,
        island: 3,
        title: '條件遞進彩虹',
        emoji: '🌈',
        skill: '句型：條件與遞進複句',
        intro: '「只要…就…」是條件句，「不僅…而且…」是遞進句，層層加深意思！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 11,
        island: 3,
        title: '把字被字風暴',
        emoji: '🌪️',
        skill: '句型：把字句與被字句互換',
        intro: '「小貓吃掉了魚」換成「小貓把魚吃掉了」或「魚被小貓吃掉了」，主客調換！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 12,
        island: 3,
        title: '照樣造句星雲',
        emoji: '✨',
        skill: '句型：照樣造句與詞語擴充',
        intro: '「動詞＋形容詞＋名詞」，如「聽著動聽的歌聲」，掌握詞性結構搭配！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 4,
    name: '段落閱讀星',
    emoji: '🪐',
    theme: 'space',
    color: '#443f9a',
    blurb: '標點符號應用、段落主旨歸納、記敘文六要素與短文閱讀理解大考驗！',
    levels: [
      {
        id: 13,
        island: 4,
        title: '標點符號星圖',
        emoji: '✒️',
        skill: '標點：冒號、引號、破折號與省略號',
        intro: '對話說話用冒號引號，補充或轉折用破折號，話沒說完用六點省略號！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 14,
        island: 4,
        title: '段落大意行星',
        emoji: '📖',
        skill: '閱讀：抓取段落主旨',
        intro: '讀完一段話，想想這一段主要在講什麼事情？找出核心關鍵句子！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 15,
        island: 4,
        title: '記敘六要素恆星',
        emoji: '☀️',
        skill: '閱讀：記敘文六要素',
        intro: '一篇文章要看懂：時間、地點、人物，以及事情的起因、經過、結果！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 16,
        island: 4,
        title: '閱讀理解黑洞魔王',
        emoji: '👑',
        skill: '綜合：短文閱讀深度理解',
        intro: '挑戰綜合短文閱讀魔王關！仔細思考作者想傳遞的智慧與啟示！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  }
];
