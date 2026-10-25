/* 跨科目期末綜合挑戰島關卡規劃表 (SSOT)：
   整合台灣小學 108 課綱數學、英文、國語三大主科，
   提供小一至小三期末全方位跨領域綜合素養冒險關卡（每學年 4 島 × 4 關 = 16 關）。
   題庫由 data/question-bank-challenge-g{1,2,3}.json 支援。 */

export const challenge_g1_islands = [
  {
    id: 1,
    name: '素養起步島',
    emoji: '🌱',
    theme: 'forest',
    color: '#3fae6a',
    blurb: '十以內數感、自然發音開頭音與ㄅㄆㄇ聲母辨析，跨學科基礎大集合！',
    levels: [
      { id: 1, island: 1, title: '數英注音初體驗', emoji: '🌟', skill: '十格陣列 + Letter Aa + ㄅㄆㄇ聲母', intro: '期末挑戰啟航！一起融合數學、英文與注音符號，挑戰第一道跨領域試煉！', makeQuestions() { return []; } },
      { id: 2, island: 1, title: '生活數感與發音', emoji: '🍎', skill: '比多少 + Letter Bb + 基本筆順方向', intro: '數一數數量，聽聽自然發音，一筆一畫寫好字！', makeQuestions() { return []; } },
      { id: 3, island: 1, title: '形狀與單字樂園', emoji: '🐱', skill: '幾何形狀 + Letter Cc + 常用字部首', intro: '看懂三角形與圓形，認識可愛動物單字與國字部首部件！', makeQuestions() { return []; } },
      { id: 4, island: 1, title: '基礎大集合考驗', emoji: '🏆', skill: '10的分與合 + Letter Dd + 聲母拼讀', intro: '完成第一島期末考驗！算數、拼音、發音一次搞定！', makeQuestions() { return []; } },
    ]
  },
  {
    id: 2,
    name: '生活探索島',
    emoji: '🌊',
    theme: 'ocean',
    color: '#2aa7c9',
    blurb: '生活加減、短母音押韻與日常生活筆順部件，生活素養一把罩！',
    levels: [
      { id: 5, island: 2, title: '生活加減與押韻', emoji: '🐬', skill: '十以內加法 + -at/-en 押韻 + 先橫後豎', intro: '海底市場真熱鬧！買東西算算數，聽聽英文押韻，練習寫字規則！', makeQuestions() { return []; } },
      { id: 6, island: 2, title: '時鐘與動物對話', emoji: '⏰', skill: '整點與半點 + 動物單字 + 部首木水火', intro: '看時鐘是幾點幾分？叫出小動物英文名字，找出大自然的部首！', makeQuestions() { return []; } },
      { id: 7, island: 2, title: '長度與短母音詞', emoji: '📏', skill: '方格尺測量 + 短母音辨析 + 造詞填空', intro: '用尺量一量有多長，聽一聽母音短音，選出最優美的詞語！', makeQuestions() { return []; } },
      { id: 8, island: 2, title: '情境應用小挑戰', emoji: '⛵', skill: '生活減法 + 顏色問候 + 常用量詞', intro: '第二島期末評量！把生活經驗化為解題智慧！', makeQuestions() { return []; } },
    ]
  },
  {
    id: 3,
    name: '思維進階島',
    emoji: '☁️',
    theme: 'cloud',
    color: '#7c8cf8',
    blurb: '湊十破十、雙字母發音與句型結構，挑戰深度邏輯思考！',
    levels: [
      { id: 9, island: 3, title: '湊十法與雙字母', emoji: '✨', skill: '湊十加法 + sh/ch 雙字母 + 相似字辨析', intro: '雲端神殿的考驗！湊十變簡單，雙字母念清楚，分清楚長得很像的國字！', makeQuestions() { return []; } },
      { id: 10, island: 3, title: '破十法與聽音選字', emoji: '🎯', skill: '破十減法 + th/ng 拼音 + 句子重組', intro: '破十算得快又準！聽清 th 的咬舌音，排出一句漂亮完整的話！', makeQuestions() { return []; } },
      { id: 11, island: 3, title: '十位個位與對話', emoji: '🔢', skill: '二位數結構 + 簡易對話 + 相反詞對比', intro: '十位個位分清楚，英文日常問候打招呼，大與小、多與少相反詞！', makeQuestions() { return []; } },
      { id: 12, island: 3, title: '綜合推理大冒險', emoji: '🔮', skill: '數列推理 + 食物家人單字 + 連詞應用', intro: '第三島終極考驗！動動腦找出隱藏的邏輯規律！', makeQuestions() { return []; } },
    ]
  },
  {
    id: 4,
    name: '期末總魔王殿',
    emoji: '👑',
    theme: 'space',
    color: '#8b5cf6',
    blurb: '台灣錢幣、二位數加減、高頻詞彙與閱讀統整，小一全方位終極試煉！',
    levels: [
      { id: 13, island: 4, title: '小老闆全能結算', emoji: '🟡', skill: '1/5/10/50元硬幣 + 買賣英文 + 購物情境中文', intro: '當個超厲害小老闆！算零錢找錢、用英文問價錢，寫下購物清單！', makeQuestions() { return []; } },
      { id: 14, island: 4, title: '二位數與閱讀篇', emoji: '🛰️', skill: '二位數不進位加減 + 句子閱讀 + 篇章大意', intro: '太空補給不馬虎！十位個位直式算好，讀懂英文句子與小短文！', makeQuestions() { return []; } },
      { id: 15, island: 4, title: '日曆統計與詞彙', emoji: '📅', skill: '看日曆找星期 + 生活詞彙 + 形音義統整', intro: '翻看日曆找秘密，統計水果數量，統整本學期學過的所有精華！', makeQuestions() { return []; } },
      { id: 16, island: 4, title: '一年級總魔王會考', emoji: '🏆', skill: '數英中國小一年級 108 課綱全方位綜合素養大會考', intro: '最終期末魔王登場！三大主科實力全開，贏得一年級期末榮譽金盃！', makeQuestions() { return []; } },
    ]
  }
];

export const challenge_g2_islands = [
  {
    id: 1,
    name: '乘風啟航島',
    emoji: '🌲',
    theme: 'forest',
    color: '#3fae6a',
    blurb: '200以內數、Magic e 長母音與進階筆順規範，二年級跨領域起跑！',
    levels: [
      { id: 1, island: 1, title: '二位加減與長母音', emoji: '🌟', skill: '二位數直式加法 + a_e/i_e 長母音 + 先橫後豎先外後內', intro: '直式排整齊，母音變長了，筆畫一筆一畫規矩寫漂亮！', makeQuestions() { return []; } },
      { id: 2, island: 1, title: '測量與生活單字', emoji: '📏', skill: '直尺公分測量 + o_e/u_e 長母音 + 部首歸類', intro: '量一量幾公分，念出長母音單字，整理水部火部的國字家族！', makeQuestions() { return []; } },
      { id: 3, island: 1, title: '進位退位小能手', emoji: '💡', skill: '二位數進位退位 + 複合字詞 + 形近字辨析', intro: '進位退位細心算，英文複合字拆拆拼拼，分清楚己已巳！', makeQuestions() { return []; } },
      { id: 4, island: 1, title: '第一階段素養考', emoji: '🎖️', skill: '數值大小 + 短文發音 + 正確量詞', intro: '完成第一島綜合評量！數感、發音與用詞能力大躍進！', makeQuestions() { return []; } },
    ]
  },
  {
    id: 2,
    name: '度量冰川島',
    emoji: '🧊',
    theme: 'ocean',
    color: '#2b9cdb',
    blurb: '連加連減、時鐘幾分、子音混合與量詞搭配，生活度量一把罩！',
    levels: [
      { id: 5, island: 2, title: '兩步驟與子音混音', emoji: '❄️', skill: '兩步驟連加連減 + bl/cl/st 子音混合 + 部件拼字', intro: '兩步驟題目一步步算，兩個子音手牽手一起發音，把部件拼成完整字！', makeQuestions() { return []; } },
      { id: 6, island: 2, title: '時鐘容量與對話', emoji: '⏰', skill: '時鐘幾點幾分 + 日常生活會話 + 左右上下結構', intro: '分針走一大格是五分鐘！學會英文日常禮貌問答，看清生字結構！', makeQuestions() { return []; } },
      { id: 7, island: 2, title: '重量形狀與詞族', emoji: '⚖️', skill: '重量初步 + -ight/-ound 詞族 + 正確量詞選用', intro: '比輕重看天平，認得常見長詞尾，一條魚、一本書量詞不搞混！', makeQuestions() { return []; } },
      { id: 8, island: 2, title: '度量大考驗', emoji: '🧭', skill: '生活情境題 + 英文閱讀問答 + 相似字選詞', intro: '第二島期末評量！把測量、閱讀與文字素養融會貫通！', makeQuestions() { return []; } },
    ]
  },
  {
    id: 3,
    name: '乘法烈焰島',
    emoji: '🔥',
    theme: 'cloud',
    color: '#ff7675',
    blurb: '乘法初步、九九乘法表、日常會話與造句積木，熱血解題！',
    levels: [
      { id: 9, island: 3, title: '連加乘法與句型', emoji: '✖️', skill: '同數連加轉乘法 + 主詞動詞造句 + 照樣造句積木', intro: '幾個幾就是乘法！英文組出好句子，中文照樣造句發揮創意！', makeQuestions() { return []; } },
      { id: 10, island: 3, title: '九九乘法初階關', emoji: '🚀', skill: '2、5、4、8的乘法 + 形容詞描述 + 多音字辨析', intro: '乘法背得熟，形容詞用得巧，同一國字不同讀音讀清楚！', makeQuestions() { return []; } },
      { id: 11, island: 3, title: '乘法進階與會話', emoji: '⭐', skill: '3、6、7、9的乘法 + 日常情境對話 + 連詞因果句', intro: '攻克高段乘法！日常英文問答流利自然，因為所以造句完整！', makeQuestions() { return []; } },
      { id: 12, island: 3, title: '乘法生活應用挑戰', emoji: '🎯', skill: '乘法應用題 + 圖文選字 + 錯別字抓蟲', intro: '第三島終極評量！看清題意乘法列式，抓出藏在文章裡的錯別字！', makeQuestions() { return []; } },
    ]
  },
  {
    id: 4,
    name: '星河大魔王殿',
    emoji: '🌌',
    theme: 'space',
    color: '#443f9a',
    blurb: '1000以內數、簡單分數二分之一、生活閱讀理解，二年級總魔王！',
    levels: [
      { id: 13, island: 4, title: '千以內的數與錢幣', emoji: '💰', skill: '三位數加減 + 認識千元百元 + 篇章主旨概括', intro: '百位十位個位算好，大面額錢幣換算清楚，讀懂短文中心思想！', makeQuestions() { return []; } },
      { id: 14, island: 4, title: '簡單分數平分篇', emoji: '🍕', skill: '平分與二分之一 + 英文簡短閱讀 + 形近詞辨正', intro: '一樣大才叫平分！英文看短文回答問題，土士未末細心分辨！', makeQuestions() { return []; } },
      { id: 15, island: 4, title: '幾何立體與統整', emoji: '📦', skill: '平面與立體形狀 + 英文高頻詞彙 + 記敘文理解', intro: '長方體、正方體看端詳，高頻單字秒讀，文章六要素找出來！', makeQuestions() { return []; } },
      { id: 16, island: 4, title: '二年級總魔王會考', emoji: '👑', skill: '數英中國小二年級 108 課綱全方位綜合素養大會考', intro: '二年級期末總魔王！跨學科全能大考驗，勇奪期末冠軍金盃！', makeQuestions() { return []; } },
    ]
  }
];

export const challenge_g3_islands = [
  {
    id: 1,
    name: '算術神殿島',
    emoji: '🏛️',
    theme: 'forest',
    color: '#3fae6a',
    blurb: '四位數、三位數乘除法、ai/ee 母音組合與成語典故，三年級跨領域揚帆！',
    levels: [
      { id: 1, island: 1, title: '四位數與母音組合', emoji: '🏛️', skill: '四位數加減 + ai/ay、ee/ea 母音 + 動物寓言成語', intro: '大數計算細心進退位，兩個母音發長音，從寓言故事學成語智慧！', makeQuestions() { return []; } },
      { id: 2, island: 1, title: '直式乘法與詞尾變身', emoji: '⚙️', skill: '三位數乘一位數 + -ing/-ed 詞尾 + 勤學成語', intro: '直式乘法位數對齊，動詞變化看時態，學會懸樑刺股與學富五車！', makeQuestions() { return []; } },
      { id: 3, island: 1, title: '除法初步與句型', emoji: '➗', skill: '除法初步整除 + 簡單過去式 + 譬喻修辭入門', intro: '把東西公平分完用除法！英文過去事情用過去式，像月亮一樣的譬喻句！', makeQuestions() { return []; } },
      { id: 4, island: 1, title: '神殿初階會考', emoji: '🏅', skill: '四則混合概念 + 英文情境閱讀 + 成語填空', intro: '第一島期末考驗！算數、英文閱讀與成語應用一次展現實力！', makeQuestions() { return []; } },
    ]
  },
  {
    id: 2,
    name: '幾何修辭海',
    emoji: '📐',
    theme: 'ocean',
    color: '#2b9cdb',
    blurb: '認識直角角、圓與周長、主詞動詞文法與擬人譬喻修辭，文理並進！',
    levels: [
      { id: 5, island: 2, title: '角與直角修辭篇', emoji: '📐', skill: '認識角與直角 + 形容詞比較級 + 擬人修辭法', intro: '用三角板直角檢驗，英文比較級形容詞，讓小草點頭跳舞的擬人法！', makeQuestions() { return []; } },
      { id: 6, island: 2, title: '圓心半徑與文法', emoji: '⭕', skill: '圓心半徑直徑 + 主詞動詞一致性 + 排比修辭法', intro: '圓規畫出完美圓，英文動詞注意單複數，句子節奏明快的排比句！', makeQuestions() { return []; } },
      { id: 7, island: 2, title: '周長計算與問句', emoji: '📏', skill: '長方形正方形周長 + 疑問詞問句 + 設問修辭法', intro: '周長就是繞一周的長度！學會用 Wh- 提問，自問自答的設問修辭！', makeQuestions() { return []; } },
      { id: 8, island: 2, title: '幾何文法綜合評量', emoji: '🌊', skill: '幾何綜合應用 + 英文短文理解 + 修辭技巧辨識', intro: '第二島期末評量！將空間幾何、英文語法與國語修辭融會貫通！', makeQuestions() { return []; } },
    ]
  },
  {
    id: 3,
    name: '分數閱讀花園',
    emoji: '🌷',
    theme: 'cloud',
    color: '#8d7bf0',
    blurb: '分數分子分母、一位小數、段落閱讀主旨與複句轉折，思維深度昇華！',
    levels: [
      { id: 9, island: 3, title: '分數初步與閱讀', emoji: '🍰', skill: '同分母分數加減 + 英文段落主旨 + 因果轉折複句', intro: '分子加減分母不變！找出英文段落最核心的主旨，雖然但是複句應用！', makeQuestions() { return []; } },
      { id: 10, island: 3, title: '小數認識與連接詞', emoji: '🔢', skill: '一位小數 0.1 概念 + 連接詞 and/but/so + 把字句被字句', intro: '十分之一就是零點一！英文連接詞串聯句子，把字句與被字句互換！', makeQuestions() { return []; } },
      { id: 11, island: 3, title: '分數小數大小比較', emoji: '⚖️', skill: '小數大小比較 + 故事順序 sequencing + 記敘文六要素', intro: '數線上比大小，按先後順序理清故事，找出記敘文人事時地物！', makeQuestions() { return []; } },
      { id: 12, island: 3, title: '閱讀邏輯大挑戰', emoji: '📖', skill: '生活分數應用 + 英文邏輯推斷 + 短文深度理解', intro: '第三島終極評量！用數學邏輯與語文素養解開生活難題！', makeQuestions() { return []; } },
    ]
  },
  {
    id: 4,
    name: '時空終極星盤',
    emoji: '🪐',
    theme: 'space',
    color: '#443f9a',
    blurb: '時間換算、容量重量、報讀長條圖與跨學科素養，三年級最高殿堂！',
    levels: [
      { id: 13, island: 4, title: '時分秒與長條圖', emoji: '📊', skill: '日時分秒換算 + 報讀長條圖 + 英文資訊圖表', intro: '一小時六十分鐘！看懂長條圖橫軸縱軸，跨領域解讀生活大數據！', makeQuestions() { return []; } },
      { id: 14, island: 4, title: '重量容積與說明文', emoji: '⚖️', skill: '公斤公克公升毫升 + 英文說明文閱讀 + 標點符號應用', intro: '一公斤等於一千公克！讀懂科普說明文，標點符號分號破折號用準確！', makeQuestions() { return []; } },
      { id: 15, island: 4, title: '生活情境全能模擬', emoji: '🎯', skill: '四則估算生活應用 + 綜合會話理解 + 篇章大意歸納', intro: '生活情境綜合題！合理估算不用慌，聽懂長段英文對話，總結文章主旨！', makeQuestions() { return []; } },
      { id: 16, island: 4, title: '三年級總魔王會考', emoji: '👑', skill: '數英中國小三年級 108 課綱全方位綜合素養大會考', intro: '三年級最高榮譽試煉！數英中三大領域大成，加冕全宇宙最強學習島主！', makeQuestions() { return []; } },
    ]
  }
];

export const CHALLENGE_LEVEL_TABLES = {
  1: challenge_g1_islands,
  2: challenge_g2_islands,
  3: challenge_g3_islands,
};
