# 🌈 奇幻數學島大冒險 (Fantasy Math Island Adventure)
> **台灣小學全年級 108 課綱數學遊戲化學習測驗系統**  
> 逆向工程還原自 `https://math-1.gh.miniasp.com/`，並升級為 **Multi-Grade 全年級擴充架構**。

---

## 📌 系統亮點特色

1. **全年級無縫切換架構 (Multi-Grade Architecture)**：
   - 🎒 **小學一年級 (Grade 1)**：16 關完整彩虹冒險（十格板、數數、比多少、序數、分與合、10以內加減、時鐘整點半點、20以內加減、長度、100以內數、錢幣、日曆統計）。
   - 🌟 **小學二年級 (Grade 2)**：16 關全新進階冒險（200以內的數、二位數直式加法、二位數退位減法、公分直尺測量、兩步驟連加連減、幾點幾分時鐘、容量與重量、立體形狀、同數連加乘法初步、九九乘法表大挑戰、乘法生活應用題、1000以內的數、三位數加減法、百元與千元大額錢幣應用、簡單分數 1/2 與 1/4）。
   - 🚀 **小學三年級~六年級 (Grades 3–6)**：已預留完整插槽與題庫範本，隨時可一鍵擴充。
2. **完整音訊與語音讀題系統 (Audio & TTS)**：
   - 包含歡樂背景音樂 (`title.mp3`) 與全套音效 (`click`, `correct`, `wrong`, `whoosh`, `levelup`)。
   - **514 句台灣口音高擬真語音讀題音檔** (Gemini Aoede 語音)。
   - 擴充年級若無靜態錄音檔，自動無縫平滑降級至瀏覽器原生的 `Web Speech API (zh-TW)` 語音讀題，100% 離線可用！
3. **豐富生動的數學教具渲染引擎 (Visual Manipulatives)**：
   - `tenFrame` / `doubleTenFrame` (十格板與雙十格板)
   - `compareGroups` (一對一圖案比多少)
   - `ordinalLine` (可愛動物排排隊序數)
   - `numberBond` (數的分與合樹狀圖)
   - `verticalMath` (直式加法與減法板)
   - `clock` (指針時鐘，動態計算角度)
   - `ruler` (可愛直尺量長度)
   - `baseTen` (百十個位積木)
   - `coins` (新台幣 1元、5元、10元、50元、100元、500元、1000元)
   - `shapeScene` (幾何圖形組合)
   - `numberLine` (數線)
4. **Windows 原生桌面體驗 (Windows BAT Craftsman)**：
   - 附帶 `啟動奇幻數學島.bat`，自動啟動本地伺服器並以 Chrome/Edge `--app` 獨立原生無邊框視窗開啟，享受如同桌面應用程式般的沉浸體驗。

---

## 🚀 快速啟動

### 方式一：一鍵雙擊啟動 (推薦)
直接在資料夾中雙擊執行：
```text
啟動奇幻數學島.bat
```
它會自動啟動本地 Python HTTP 服務器，並以 Chrome / Edge 原生無網址列 App 視窗秒級拉起！

### 方式二：命令行啟動
```powershell
python server.py
```
接著在瀏覽器開啟：`http://127.0.0.1:8085`

---

## 📂 檔案目錄架構

```text
C:\Users\達爾\math-island\
├── 啟動奇幻數學島.bat        # Windows 原生獨立視窗啟動批次檔
├── server.py                 # 輕量本機 HTTP 伺服器 (解決 ES 模組跨域限制)
├── index.html                # 遊戲主頁面 (含頂部年級切換膠囊)
├── README.md                 # 專案手冊與擴充指引
├── css/
│   └── style.css             # 完整遊戲樣式 (含年級切換器、卡片網格與微動效)
├── js/
│   ├── main.js               # 主程式入口 (事件監聽、全域年級切換調度)
│   ├── grades.js             # 年級配置資料字典 (小一、小二、小三...)
│   ├── state.js              # 進度狀態管理 (各年級星星與關卡進度獨立儲存)
│   ├── question-bank.js      # 動態題庫載入器
│   ├── audio.js              # 雙軌背景音樂、音效與 TTS 語音朗讀中樞
│   ├── map.js                # 首頁、年級選擇卡片與 4 座島嶼冒險地圖渲染
│   ├── engine.js             # 答題引擎、計分、連勝星星與正反饋對話框
│   ├── visuals.js            # 豐富數學教具動態渲染器 (十格板、時鐘、直尺、直式等)
│   ├── utils.js              # 隨機數、隨機洗牌與中文數字轉換工具庫
│   ├── texts.js              # 讚美與鼓勵正向反饋詞庫
│   └── levels/
│       ├── index.js          # 年級關卡動態分流中樞
│       ├── island1.js ~ 4.js # 一年級 4 大島嶼關卡與動態出題邏輯
│       └── island_defs_g2.js # 二年級 4 大島嶼關卡與目標技能定義
├── data/
│   ├── question-bank.json    # 一年級原始題庫 (16 關 x 12 題 = 192 題)
│   ├── question-bank-g1.json # 一年級專屬題庫
│   ├── question-bank-g2.json # 二年級專屬題庫 (16 關 x 12 題 = 192 題)
│   ├── question-bank-template.json # 三至六年級擴充標準範本
│   └── tts-manifest.json     # 一年級 514 句語音靜態音檔索引表
└── assets/
    ├── images/               # 島嶼背景 (森林/海洋/雲朵/星空)、主角狐狸與封面
    └── audio/
        ├── music/title.mp3   # 主題歡樂背景音樂
        ├── sfx/*.mp3         # 按鈕點擊、正確、錯誤、升級等音效
        └── tts-static/*.mp3  # 514 個台灣口音高音質語音讀題 mp3 檔
```

---

## 🛠️ 如何繼續增加年級 (三至六年級擴充步驟)

若您想繼續增加 **小學三年級 (Grade 3)**、**四年級 (Grade 4)** 等：

### 步驟 1：新增題庫檔案
參考 `data/question-bank-template.json`，在 `data/` 目錄建立 `question-bank-g3.json`，格式如下：
```json
{
  "grade": 3,
  "gradeName": "國小三年級",
  "targetPerLevel": 12,
  "levels": {
    "1": [
      {
        "prompt": "四位數比大小：3450 和 3540 哪一個比較大？",
        "speak": "四位數比大小：三千四百五十和三千五百四十哪一個比較大？",
        "hint": "千位都是 3，比百位：5 個百比 4 個百大。",
        "explanation": "3540 的百位是 5，3450 的百位是 4，所以 3540 比較大。",
        "answer": "3540",
        "options": ["3540", "3450", "一樣大"],
        "visual": null
      }
    ]
  }
}
```

### 步驟 2：在 `js/grades.js` 中啟用該年級
將 `GRADES` 陣列中三年級的狀態更新，設定島嶼名稱與技能。

### 步驟 3：在 `js/levels/index.js` 加入關卡定義
新增 `js/levels/island_defs_g3.js` 並在 `index.js` 中建立對應分流。

系統會自動在頂部年級下拉選單與首頁年級卡片中展示新啟用的年級，並自動分配獨立的 LocalStorage 進度槽！

---

## 💖 課綱與教材版權聲明
- 原遊戲作者：**Will 保哥** ([GitHub: doggy8088](https://github.com/doggy8088))
- 題目內容對齊台灣教育部 108 課綱國民小學數學領域課程綱要。
