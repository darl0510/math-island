# 📦 math-island 歷史版本更新封存檔案庫 (Changelog Archive)

> 本檔案由 auto_backup.check_and_trim_handover() 自動維護封存。


### 【v2.3.3 版】🔤 奇幻英文島小二／小三題庫就緒 ✕ 2 × 16 關 × 8 題 = 256 題 📅 2026-10-25

1. **新檔 `data/question-bank-en-g2.json` (小二 128 題)**：16 關主軸依序為短母音 u/e、`-at/-ap`、`-ig/-in`、`-op/-ot`、`-ug/-un` 字族、`sh`/`ch`/`th`、`bl/cl`、`st/sp`、長短母音對比 (cap/cape, kit/kite)、數字 1-20、顏色與形容詞、家庭身體動作、生活短句問答。
2. **新檔 `data/question-bank-en-g3.json` (小三 128 題)**：16 關主軸依序為分裂母音 `a_e/i_e/o_e/u_e`、`ai/ay`、`ee/ea`、`oa/ow`、r 控制母音 `ar/er` 與 `or/ore`、`tch/dge/igh`、視覺字詞 `said/was/they/once/could/should`、`a/an・is/are・have/has`、代名詞與所有格、三單 -s 與頻率、小短文閱讀、綜合問答對話。
3. **派工路徑修正**：`claude_delegator.py` 首派空交付 (exit 0、`modifiedFiles` 空、`.delegator_live.json` 記錄實為本輪自身工具呼叫 → 契約被派回雲端自身)；依 3 輪收斂鐵律不重試同一派工，改走 `brain_delegator.py -f <契約檔> -o <目標檔> -m 48000` 直連 8080，g2 (5,565 tokens/528s)、g3 (4,539 tokens/319s) 各一次原子派工完成落盤。
4. **監工最小 Diff 錨點 (僅動 `data/` 資料檔)**：g3 首產 `L11#1` 選項重複 `said/sed/said` → `said/sed/seid`；20 題跨關重複題幹改寫為各關唯一 (拼字題題幹不可洩漏正解拼字)；`L11#3` 「I ___ a cat.」→「I ___ late for school.」；整檔由單行 minified 重排為與 `question-bank-en-g1.json` 同構式 (每關一陣列、每題一行、169 行)。
5. **自檢結果 (`validate_bank.py` 雙檔綠燈)**：JSON 解析通過、關鍵為 `1..16`、每關恰好 8 題共 128 題、`answer ∈ options`、選項無重複、`optionEmojis` 與 `options` 等長、`visual{type:'scene', emojis 1-4, text ≤ 40}` 合規、128 題幹全唯一、錯誤 0；ledger 已 `--mark-passed` 翻綠。
6. **零改動檔案**：`js/grades.js`、`js/subjects.js`、`js/levels/*`、`sw.js`、`index.html` 功能面零改動 (僅版號標籤同步)；題庫掛表與離線快取列為 v2.3.4 派工契約。

### 【v2.3.2 版】🗺️ 小一島嶼元資料單向對齊 (島檔 → `grades.js`) ✕ 島名/emoji/color/blurb 消除 drift 📅 2026-10-25

1. **單向同步方向（SSOT：島檔 → 大廳）**：`js/grades.js:16-18` 小一 `GRADES[0].islands` 的 id2/id3/id4 改用島檔原樣字串 —— 島 2 `海洋加減篇`🐬`#2aa7c9`、島 3 `雲端進階篇`☁️`#7c8cf8`、島 4 `星空魔王篇`🚀`#8b5cf6`；`js/levels/island1-4.js` 全部零改動（原 `海洋探索篇`🌊`#2b9cdb`、`雲朵挑戰篇`☁️`#8d7bf0`、`星空大師篇`✨`#443f9a` 為 grades.js 端歷史 drift）。
2. **影響範圍**：僅 3 行 × 4 個元資料欄位，`id`、`theme`、欄位順序、id1 那行、其餘年級與 16 關 `levels[]` 完全不動；`.min.js` 為未被引用的建置產物，維持不動。
3. **自檢**：`node --check js/grades.js` 綠燈；逐欄位比對島檔原樣 id2/id3/id4 全 24 欄 MATCH；`git diff --numstat` = 3/3 僅 1 檔。
4. **監工修正記錄**：首次派工反向改寫 `js/levels/island2-4.js`（grades.js 零改動）→ 已 `git checkout` 還原、ledger 翻 `failed`，改派最小 Diff 錨點重送後通過並翻 `passed`。

### 【v2.3.1 版】🌐 奇幻英文島關卡科目化 ✕ 4 島 16 關英文標題與 intro 📅 2026-10-25

1. **科目化關卡表 (`js/levels/index.js`)**：新增 `SUBJECT_LEVEL_TABLES`（科目 → 年級 → 關卡表 SSOT）與 `getSubjectTables()`；`getIslandsForGrade / syncGradeLevels / getAllLevels / getLevelById / getIslandByLevel / getIslandById` 全數加入 `subjectId = getCurrentSubject()` 預設參數，未知科目或未準備年級安全退回 math 預設表；`map.js` / `main.js` 零改動（預設值自動帶入）。
2. **英文島關卡定義 (`js/levels/island_defs_en_g1.js` 新檔)**：4 島 × 4 關 = 16 關 (id 1–16)，島名/blurb/theme/color/emoji 與 `grades.js` 的 `ENGLISH_GRADES` 一致；16 個關卡標題與 intro 全為純英文，配合 `speechLang: 'en-US'` 語音引擎；題目由 `data/question-bank-en-g1.json` 供給。
3. **自檢**：本地苦力 `node --check` 綠燈 + 42 項 PASS／0 FAIL（4 島 16 關完整性、id 不重複、題庫 16 關各 8 題完全對齊、同 id 於 english/math 取得不同關卡、未知科目安全退回）；雲端僅驗 Diff，二次 `node --check` 兩檔通過。

### 【v2.3.0 版】🔤 奇幻英文島小一上線 ✕ 16 關自然發音與生活單字 128 題 ✕ 英文島綠燈 📅 2026-10-25

1. **英文島小一題庫 (`data/question-bank-en-g1.json` 新檔)**：16 關 × 8 題 = 128 題；島 1 字母開頭音 Aa/Bb/Cc/Dd、島 2 短母音 a/e/i/o 與 `-at/-en/-ig/-og` 押韻家族、島 3 雙字母音 `sh/ch/th/ng/ck`、島 4 生活單字 (顏色、數字、家人、食物、動物) 與 `Good morning` 問候語。
2. **教具全面沿用既有 `scene` 情境卡** (`visual: {type:'scene', emojis, text}`)，零新增渲染器；部分題目附 `optionEmojis` 圖示選項。
3. **語音設計**：`prompt` 中文指令 + `speak` 全 ASCII 英文句，配合英文島 `speechLang: 'en-US'` 美語引擎，避免中文被 en-US 語音誤讀。
4. **科目掛表 (`js/grades.js`)**：新增 `ENGLISH_GRADES`（小一 4 島 16 關、`questionBankUrl` 指向新題庫）並掛入 `SUBJECT_GRADES.english`。
5. **綠燈翻牌 (`js/subjects.js`)**：英文島 `ready: true`，大廳「進入一年級冒險」解鎖、`openMap()` 放行；國語島維持 `ready: false`。
6. **版號熱同步**：`#brand-version-badge` → `v2.3.0`，`sw.js` `CACHE_NAME` → `math-island-v2.3.0` 並納入 `./data/question-bank-en-g1.json` 離線快取。
7. **自檢結果**：JSON 解析通過、16 關 × 8 題共 128 題、`answer ∈ options` 且選項無重複 (每題 ≥3 選項)、`optionEmojis` 長度比對一致、`visual.type` 全數命中 `js/visuals.js` 渲染器白名單、`speak` 128/128 全 ASCII；ESM import 測試 `SUBJECT_GRADES.english=1 年級 / islands=4 / isSubjectGradePrepared=true / isSubjectReady(english)=true / math 綠燈不變 / chinese=false`。

### 【v2.2.0 版】🧭 多科目切換大廳架構 (方案 A) ✕ 頂部科目膠囊 ✕ en-US 美語語音引擎 ✕ 多科進度獨立記帳 📅 2026-10-25

1. **科目註冊表 SSOT (`js/subjects.js` 新檔)**：
   - 資料表驅動：數學島 (ready) / 英文島 (en-US, 即將啟航) / 國語島 (zh-TW, 即將啟航)，嚴禁 UI 端硬編碼科目清單。
   - 每科自帶 `speechLang`、`brandTitle`、`tagline`、`symbols`（首頁漂浮符號依科目切換）。
2. **頂部科目膠囊 UI (`index.html` + `css/style.css` + `js/main.js`)**：
   - 導覽列新增 `#subject-capsules`，由註冊表動態渲染，膠囊內嵌該科該年級獨立顆星徽章。
   - 選中膠囊依 `--subject-color` 著色；未就緒科目顯示虛線「即將啟航」狀態；≤720px 自動收為圖示並保留 `aria-label`。
3. **多科進度獨立記帳 (`js/state.js`)**：
   - 新增 `getCurrentSubject()` / `setCurrentSubject()`，科目狀態存於 `fantasy-island-current-subject`。
   - 數學沿用既有 `fantasy-math-island-progress-*` 舊 key（既有進度零遺失），新科目各自獨立空間 `fantasy-island-progress-<科目>-g<年級>-v1`。
   - 新增 `subjectProgress(subject, grade)` 提供膠囊徽章；`totalStars()` / `completedCount()` 向后相容並新增科目參數。
4. **雙軌語音引擎 (`js/audio.js`)**：
   - `setSpeechLang()` 依科目切換語系；英文島走 **en-US 美語引擎**（優先媒合 `en-US` 語音，語速降至 0.82 協助自然發音分節）。
   - 非中文語系一律繞過 zh-TW 靜態音檔與伺服器 TTS，平滑降級至 Web Speech API；語音快取 key 納入語系避免串音。
5. **科目化年級字典與題庫解耦 (`js/grades.js` / `js/question-bank.js`)**：
   - `SUBJECT_GRADES` 掛表設計：新增科目只需掛上該科年級表；`getGradeConfig(grade, subject)` 向后相容舊呼叫。
   - 題庫 URL 改由年級字典 `questionBankUrl` 提供，剔除 `question-bank.js` 內的路徑硬編碼。
6. **大廳與地圖科目防護 (`js/map.js`)**：未就緒科目進入首頁顯示科目品牌標題與「即將啟航」禁用按鈕，`openMap()` 攔截並退回首頁。
7. **版號熱同步**：`#brand-version-badge` → `v2.2.0`，`sw.js` `CACHE_NAME` → `math-island-v2.2.0` 並納入 `./js/subjects.js` 離線快取。
8. **自檢結果**：7 個模組 `node --check` 全綠；架構煙霧測試 14/14 pass；19 個 ESM 模組 import/export 對照全數解析；本機 HTTP 服務 `index.html` / `js/subjects.js` / `js/main.js` / `css/style.css` 全 200。

### 【v2.1.3 版】📱 PWA 桌面與平板 App 安裝架構 ✕ Service Worker 離線快取 📅 2026-10-19

1. **全面支援 PWA「安裝為應用程式 (Installable)」規範**：
   - 建立標準 `manifest.webmanifest`，定義全螢幕沉浸式視窗（`display: standalone`）、專屬主視覺與主題色（`#ffd93d` / `#0d1b2a`）。
   - 自動生成 192x192 與 512x512 高畫質吉祥物 PNG 圖示集合（`assets/icons/`），支援 Maskable 與標準圖示。
2. **建置 Service Worker 離線快取核心 (`sw.js`)**：
   - 解決平板與手機 Chrome 提示「無法安裝這個應用程式」之根本原因（Chrome 安裝必備條件）。
   - 採用 Network-First with Cache Fallback 策略，完整快取首頁、樣式、核心邏輯、三年級全題庫與情境插圖。
   - 即使離線或網路不穩，平板與手機仍可順暢秒開遊玩。
3. **版本與相容性同步**：
   - 前端介面 `#brand-version-badge` 版號全面同步推進至 `v2.1.3`。
   - 補齊 iOS / iPad Safari 之 `apple-touch-icon` 與全螢幕相容標籤。


### 【v2.1.2 版】📏 數線教具重構升級為響應式 SVG ✕ 題庫指標防洩漏修復 📅 2026-10-19

1. **`numberLine` 視覺教具核心重構 (`js/visuals.js`)**：
   - 告別舊版未支援 `min` 導致 0~150 全數擠爆的缺憾，全面升級為高品質向量 SVG。
   - 完整支援 `min`、`max`、`step`（大刻度）與 `subStep`（小刻度），智慧推估間距防擠壓。
   - 具備向量雙向箭頭數線軸、主副刻度線、動態跳躍弧線 (`from` ➔ `to` 含數值差距標籤)。
   - 新增多目標指針徽章渲染（`points`），支援下指三角箭頭、立桿、發光圓點與頂部醒目徽章。
2. **題庫標籤與刻度參數校正**：
   - 修正 `data/question-bank-g2.json` 第 1 關數線題：指標標籤改為 `▲ ❓`，消除原先直接印出 `▲ 125` 洩漏答案之問題，並配置 `subStep: 5`。
   - 校正 `data/question-bank-g2.json` 第 16 關中心點題：指標標籤改為 `▲ ❓`，配置 `subStep: 10`。
   - 校正 `data/question-bank-g3.json` 千位進位數線題：補齊 `min: 3995, max: 4005, step: 1`，避免無 min 產生四千多個 DOM 刻度。
3. **前端樣式與版號熱同步**：
   - 更新 `css/style.css` 新增 `.numberline-svg` 響應式居中自適應陰影與版型。
   - 前端導覽列 `#brand-version-badge` 版號推進至 `v2.1.2`。

### 【v2.1.1 版】🎨 題目視覺框框全面美化 ✕ 智慧繪本插圖與情境數量卡 📅 2026-10-19

1. **題目下方視覺框框 (`.visual-zone`) 質感全面躍升**：
   - 告別過去單調空泛的灰色虛線框，重構為精美「奇幻冒險探索舞台」。
   - 加入柔和圓潤邊框、雙重立體層次陰影、暖陽通透島嶼漸層，並飾以星芒微光（✦ ✧）。
2. **無教具/應用題智慧情境渲染 (`renderStoryVisual`)**：
   - 針對小二、小三純文字應用題（`visual: null`），告別空白！
   - 建立高品質繪本可愛插圖庫（`story-garden.jpg` 花園冒險、`story-thinking.jpg` 思考筆記、`story-treasure.jpg` 海島尋寶）。
   - 依題目自動提煉數量關係卡（例如本題「紅花 44 朵 🌹 ＋ 黃花 39 朵 🌼 ＝ ❓ 共有幾朵」），輔助兒童直觀理解算式概念。
3. **前端介面同步與響應式微調**：`index.html` 版號標籤升級 `v2.1.1`，並優化手機窄螢幕自適應排版。

### 【v2.1.0 版】🚀 國小三年級 (Grade 3) 16 關題庫與專屬幾何/分數教具全面上線 📅 2026-10-19

1. **國小三年級 16 關題庫全量建置**：
   - 參照台灣 108 課綱國小三年級標準，新增 `data/question-bank-g3.json`（共 192 題）。
   - 4 大島嶼全新開航：算術神殿、幾何迷宮、分數花園、時空星盤。
2. **全新視覺教具與多位數計算支援**：
   - `js/visuals.js` 升級 `verticalMath`：動態支援 2～4 位數直式加減與乘法（`×`）。
   - 新增 `fraction`（分數格/餅圖）、`angle`（角）、`barChart`（長條圖）教具渲染。



### 【v2.3.4 版】🔤 奇幻英文島小二／小三掛表上線 ✕ 4 島 16 關關卡定義 ✕ 題庫掛表與離線快取 📅 2026-10-25

1. **英文島小二與小三關卡定義 (`js/levels/island_defs_en_g2.js` 與 `js/levels/island_defs_en_g3.js`)**：各 4 島 16 關，包含英文關卡標題、emoji、技能說明與純美語 intro 語音文字。
2. **科目化關卡總表 (`js/levels/index.js`)**：引入 `en_g2_islands` 與 `en_g3_islands`，掛載至 `SUBJECT_LEVEL_TABLES.english` (SSOT)，支援 `getAllLevels(grade, 'english')` 正確載入小二與小三 16 關卡。
3. **科目年級字典 (`js/grades.js`)**：`ENGLISH_GRADES` 擴充小二 (id: 2) 與小三 (id: 3) 元資料，分別指向 `data/question-bank-en-g2.json` 與 `data/question-bank-en-g3.json`。
4. **離線快取與版本標籤**：`sw.js` 納入小二／小三英文題庫離線快取，`CACHE_NAME` 升級至 `math-island-v2.3.4`；前端頁面 `#brand-version-badge` 同步推進至 `v2.3.4`。
5. **完整性自檢**：`node --check` 語法檢查 100% 綠燈，ESM 動態載入確認 `math` 與 `english` 全年級（各 4 島 16 關）共 96 關全部正常出題，題庫 24/24 結構檢驗全數通過。

---


### 【v2.4.0 版】📖 奇幻國語島小一 MVP 上線 ✕ 128 題注音題庫 ✕ 4 島 16 關關卡定義 ✕ 科目啟用綠燈 📅 2026-10-25

1. **國語小一題庫建置 (`data/question-bank-ch-g1.json`)**：16 關 × 8 題 = 128 題注音題庫，涵蓋聲母（ㄅㄆㄇㄈ…）、單/複韻母（ㄚㄛㄜㄝ…）、結合韻（ㄧㄢㄧㄣㄨㄥ…）、聲調分辨與看字讀音。
2. **國語島關卡定義 (`js/levels/island_defs_ch_g1.js`)**：4 座島嶼（注音符號島、國字初識島、詞語積累島、句子表達島）共 16 關卡，包含中文關卡標題、emoji、技能說明與 intro 提示語音。
3. **科目化與年級表掛載**：
   - `js/grades.js`：建立並匯出 `CHINESE_GRADES`，掛載至 `SUBJECT_GRADES.chinese`。
   - `js/levels/index.js`：引入 `ch_g1_islands`，掛載至 `SUBJECT_LEVEL_TABLES.chinese: { 1: ch_g1_islands }`。
   - `js/subjects.js`：將 `chinese` 國語島之 `ready` 旗標設為 `true`，大廳正式解鎖國語島。
4. **離線快取與版本推進**：`sw.js` 快取納入 `question-bank-ch-g1.json`，升級至 `math-island-v2.4.0`；完整通過 `auto_backup` 建立 `backup_v2.4.0` 快照。
5. **語法自檢**：`node --check` 驗證所有修改之 JS 模組，100% 通過。

---


