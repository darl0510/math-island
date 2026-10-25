/* 奇幻自然科學島・小三關卡表（4 島 × 4 關）：題庫由 data/question-bank-science-g3.json 提供，
   本檔只負責島嶼與關卡的標題、技能與中文 intro（語音由 zh-TW 引擎讀出）。 */

export const science_g3_islands = [
  {
    id: 1,
    name: '綠色植物探索島',
    emoji: '🌱',
    theme: 'forest',
    color: '#10b981',
    blurb: '植物根莖葉機能、花果種子傳播奇蹟、生活與水生植物探秘、校園植物生長觀察。',
    levels: [
      {
        id: 1,
        island: 1,
        title: '植物根莖葉的秘密任務',
        emoji: '🌿',
        skill: '根的抓地吸水、莖的輸送支撐、葉的光合蒸散',
        intro: '探索植物身體三大營養器官，認識根抓泥土、莖輸送水分與綠葉光合作用的奧妙！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 2,
        island: 1,
        title: '花果實種子的傳奇旅程',
        emoji: '🌸',
        skill: '雄蕊雌蕊受粉、風水動物彈力種子傳播',
        intro: '花朵引來蝴蝶蜜蜂傳粉，果實孕育種子，隨風、藉水或靠動物踏上旅行！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 3,
        island: 1,
        title: '生活植物與水生植物奇觀',
        emoji: '🪷',
        skill: '食用器官分類、挺水沉水漂浮水生植物特徵',
        intro: '餐桌上的蔬菜吃的是根還是莖？池塘裡的荷花與布袋蓮如何適應水中生活？',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 4,
        island: 1,
        title: '校園植物大觀察與生長條件',
        emoji: '🫘',
        skill: '水分空氣溫度發芽三要素、黃化徒長與科學記錄',
        intro: '細心量測記錄綠豆成長日記，發現陽光、空氣與水分如何孕育茁壯小幼苗！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 2,
    name: '磁力與動態探索島',
    emoji: '🧲',
    theme: 'ocean',
    color: '#3b82f6',
    blurb: '磁鐵磁極同斥異吸、指北針與地球大磁場、生活磁力應用、力與物體運動摩擦力。',
    levels: [
      {
        id: 5,
        island: 2,
        title: '磁鐵的吸力與神奇磁極',
        emoji: '📎',
        skill: '磁極N極S極、同極相斥異極相吸、隔物吸鐵性質',
        intro: '兩極磁力最強！同極相斥推開、異極相吸貼合，隔著木板也能吸引迴紋針！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 6,
        island: 2,
        title: '指北針與地球大磁場',
        emoji: '🧭',
        skill: '地磁南北極、指北針水平判讀、候鳥地磁導航',
        intro: '我們腳下就是一顆巨大的天然磁鐵球，指引指北針永遠指向南北方向！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 7,
        island: 2,
        title: '磁鐵在生活中的妙用',
        emoji: '🚅',
        skill: '磁浮列車懸浮原理、冰箱磁條、電磁起重機',
        intro: '從廚房冰箱密封條到時速數百公里的超導磁浮列車，磁鐵充滿在生活各個角落！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 8,
        island: 2,
        title: '生活中的力與物體運動',
        emoji: '⚽',
        skill: '推力拉力、外力改變形狀與運動狀態、滾動摩擦減阻',
        intro: '用力推拉物體改變形狀與前進方向，加上輪子以滾代滑大幅減少摩擦阻力！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 3,
    name: '空氣與聲波探索島',
    emoji: '🫧',
    theme: 'cloud',
    color: '#0ea5e9',
    blurb: '空氣佔有空間與彈性、熱脹冷縮與天燈熱氣球、聲音由物體振動產生、音調高低與噪音防制。',
    levels: [
      {
        id: 9,
        island: 3,
        title: '空氣佔有空間與彈性實驗',
        emoji: '🎈',
        skill: '倒扣水杯空氣排開水、針筒壓縮彈性、空氣有重量',
        intro: '看不見摸不著的空氣真實佔據空間，被壓縮時具有向外彈射的奇妙彈力！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 10,
        island: 3,
        title: '空氣熱脹冷縮與天燈熱氣球',
        emoji: '🏮',
        skill: '氣體熱脹冷縮、熱空氣變輕上升、冷空氣下沉對流',
        intro: '熱空氣膨脹變輕冉冉升空，冷空氣較重自然下沉，形成推動天氣循環的對流！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 11,
        island: 3,
        title: '聲音的產生與神奇振動',
        emoji: '🥁',
        skill: '振動發聲、固液氣介質傳播速度、真空中無介質不傳聲',
        intro: '摸摸喉嚨感覺聲帶振動！聲音在固體鋼鐵中跑最快，在太空中真空無法傳播！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 12,
        island: 3,
        title: '聲音的高低、大小與噪音防制',
        emoji: '🎵',
        skill: '振幅決定音量、短細緊振動快音調高、分貝量測與隔音',
        intro: '大力敲振幅大聲音響亮，細弦振動快音調高，認識分貝單位並愛護耳朵保護聽力！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  },
  {
    id: 4,
    name: '奇妙動物與自然探索島',
    emoji: '🐾',
    theme: 'space',
    color: '#8b5cf6',
    blurb: '脊椎與昆蟲運動特徵、卵生胎生育幼撫育、恆溫變溫適應與冬眠、小三自然科學榮譽大試煉。',
    levels: [
      {
        id: 13,
        island: 4,
        title: '動物的身體構造與運動方式',
        emoji: '🦅',
        skill: '脊椎動物中空骨骼羽翼、魚鰭划水、青蛙後腿腳蹼',
        intro: '小鳥中空輕盈骨骼翱翔天際，魚兒擺動魚鰭悠游，青蛙粗壯後腿跳躍划水！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 14,
        island: 4,
        title: '動物分類、繁殖與育幼護幼',
        emoji: '🐣',
        skill: '卵生與胎生特徵、鳥類育幼、慈鯛口孵與帝企鵝腳背孵卵',
        intro: '生蛋孵化與母體胎生哺育，親代無微不至的育幼行為讓小生命健康茁壯！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 15,
        island: 4,
        title: '體溫調節、環境適應與動物冬眠',
        emoji: '🐻‍❄️',
        skill: '恆溫動物與變溫動物、冬眠降代謝、北極熊厚脂肪與駱駝駝峰',
        intro: '恆溫小火爐與變溫曬太陽，北極熊厚脂肪禦寒、耳廓狐大耳朵散熱適應環境！',
        makeQuestions(count = 6) { return []; }
      },
      {
        id: 16,
        island: 4,
        title: '小三自然科學榮譽大試煉',
        emoji: '👑',
        skill: '控制變因實驗精神、四大主題綜合素養、探究求真與愛護自然',
        intro: '迎接小三自然科學最高榮譽大試煉！細心觀察、動手求證、愛護地球萬物生命！',
        makeQuestions(count = 6) { return []; }
      }
    ]
  }
];
