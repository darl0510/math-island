/* 奇幻社會島・小三關卡表（4 島 × 4 關）：題庫由 data/question-bank-social-g3.json 提供，
   本檔只負責島嶼與關卡的標題、技能與中文 intro（語音由 zh-TW 引擎讀出）。 */

export const social_g3_islands = [
  {
    id: 1,
    name: '家鄉地理探索島',
    emoji: '🗺️',
    theme: 'forest',
    color: '#3fae6a',
    blurb: '地圖四要素與指北針方位、五大地形特徵、河川水庫水資源、氣候四季與防颱防震。',
    levels: [
      {
        id: 1,
        island: 1,
        title: '地圖與指北針的秘密',
        emoji: '🧭',
        skill: '圖名、圖例、方向標、比例尺四大地圖要素與指北針方位',
        intro: '學習看懂地圖上的圖名、圖例與方向標，拿起指北針探索東南西北的大地密碼！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 2,
        island: 1,
        title: '家鄉地形與自然景觀',
        emoji: '⛰️',
        skill: '平原、盆地、台地、丘陵、山地五大地形特徵與水土保持',
        intro: '探索台灣五大地形起伏變化，認識平原聚落與保護山坡地水土保持的重要性！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 3,
        island: 1,
        title: '家鄉水資源與河海大地',
        emoji: '🌊',
        skill: '台灣河川特性、水庫供水功能、海岸風貌與節約用水',
        intro: '認識台灣河短流急的水文特色、探訪水庫與海岸風貌，並在生活中珍惜水資源！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 4,
        island: 1,
        title: '氣候四季與天然災害防護',
        emoji: '🌦️',
        skill: '季風氣候、梅雨颱風特徵、地震避難三原則與防颱防震',
        intro: '了解台灣四季季風與梅雨颱風氣候，熟記地震「趴下、掩護、穩住」保命三原則！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 2,
    name: '生活產業與交通島',
    emoji: '🏘️',
    theme: 'ocean',
    color: '#2b9cdb',
    blurb: '老街先民開拓史、農林漁牧綠色豐收、工商業與觀光工廠、陸海空現代交通網絡。',
    levels: [
      {
        id: 5,
        island: 2,
        title: '家鄉老街與先民開拓史',
        emoji: '🏮',
        skill: '老街建築騎樓、舊地名由來、瑠公圳開鑿與先民開拓精神',
        intro: '穿梭充滿故事的紅磚老街騎樓，探訪先民開鑿水圳開拓家鄉的堅韌精神！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 6,
        island: 2,
        title: '農林漁牧綠色大豐收',
        emoji: '🌾',
        skill: '水稻種植、特產水果茶葉、遠洋近海漁業與產銷履歷',
        intro: '體會農夫粒粒皆辛苦的辛勞，探訪水果王國與遠洋漁業，支持在地友善有機農業！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 7,
        island: 2,
        title: '工商業與地方特色產業',
        emoji: '🏭',
        skill: '傳統工藝、一鄉一特產 OTOP、觀光工廠與聰明綠色消費',
        intro: '走訪鶯歌陶瓷與美濃油紙傘，認識半導體科技與觀光工廠，當個聰明綠色消費者！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 8,
        island: 2,
        title: '四通八達的交通網絡',
        emoji: '🚆',
        skill: '高鐵一日生活圈、捷運輕軌、海空港口與行人交通安全',
        intro: '體驗高鐵、捷運與海空港口的便捷速度，遵守交通安全規則並禮讓博愛座！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 3,
    name: '多元文化傳承島',
    emoji: '🏮',
    theme: 'cloud',
    color: '#8d7bf0',
    blurb: '傳統節慶文化、原住民族與客家新住民多元共融、古蹟建築與地方廟會藝陣。',
    levels: [
      {
        id: 9,
        island: 3,
        title: '台灣傳統節慶大歡慶',
        emoji: '🧧',
        skill: '除夕圍爐、元宵、端午、中秋、重陽與冬至民俗文化',
        intro: '歡度春節圍爐、元宵提燈、端午划龍舟與中秋賞月，體驗傳統節慶的溫馨與美德！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 10,
        island: 3,
        title: '多元族群文化手牽手',
        emoji: '🤝',
        skill: '原住民族 16 族祭典、客家擂茶、新住民文化與本土母語傳承',
        intro: '認識原住民族 16 族、客家勤儉與新住民豐富文化，互相尊重包容、手牽手愛台灣！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 11,
        island: 3,
        title: '家鄉古蹟與建築寶庫',
        emoji: '🏛️',
        skill: '赤嵌樓國定古蹟、燕尾脊剪黏美學、巴洛克建築與老建築活化',
        intro: '探訪珍貴文化資產古蹟，欣賞傳統廟宇燕尾剪黏藝術，守護家鄉歷史建築！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 12,
        island: 3,
        title: '地方信仰廟會與藝陣傳承',
        emoji: '🎭',
        skill: '媽祖遶境、迎王燒王船、掌中布袋戲、宋江陣與人間國寶工匠',
        intro: '體驗三月瘋媽祖與東港迎王祭典，欣賞國寶掌中布袋戲與宋江陣頭的薪火傳承！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 4,
    name: '現代公民榮譽島',
    emoji: '🏛️',
    theme: 'space',
    color: '#443f9a',
    blurb: '家庭校園民主生活、社區公僕與守望相助隊、垃圾分類環境永續、小公民榮譽殿。',
    levels: [
      {
        id: 13,
        island: 4,
        title: '家庭與校園民主生活',
        emoji: '🏫',
        skill: '分擔家務、班會開會程序、少數服從多數多數尊重少數與反霸凌',
        intro: '學習開班會主持與表決程序，落實生活公約與友善校園，用同理心化解紛爭！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 14,
        island: 4,
        title: '社區組織與公共設施服務',
        emoji: '🏢',
        skill: '村里長服務、守望相助隊、公共圖書館公德心與 110/119 緊急求助',
        intro: '感謝村里長與導護志工的辛勞，愛護圖書館設施與公德心，熟記 110 與 119 求助專線！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 15,
        island: 4,
        title: '環境保護與永續綠生活',
        emoji: '🌱',
        skill: '垃圾強制三分類、資源回收標誌、減塑愛海洋與淺山守護石虎',
        intro: '落實垃圾分類與自備環保袋源頭減塑，守護海灘與野生動物，實踐無痕山林！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 16,
        island: 4,
        title: '兒童權利與小公民榮譽殿',
        emoji: '👑',
        skill: '兒童權利公約 CRC、智慧財產權、網路隱私安全與公民素養榮譽試煉',
        intro: '認識兒童權利公約與法治精神，保護網路安全與誠實信用，登頂奇幻社會島榮譽王座！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  }
];
