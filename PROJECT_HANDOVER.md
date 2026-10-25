# 🌈 奇幻數學島大冒險 (Fantasy Math Island Adventure)
> **專案交接與跨設備開發同步手冊 (Antigravity IDE Handover Document)**  
> **最後更新時間**：2026-10-25 (v2.4.9 版)  
> **適用場景**：公司與家中電腦 Antigravity IDE 跨設備進度無縫接軌

---

## 📌 給 Antigravity IDE 的 Agent 引導指令 (Prompt)

當您開啟新對話時，直接在對話框貼上以下這段話給 AI，它就會秒懂架構並接續開發：

```text
【v2.4.9】你好！請繼續推進奇幻數學島大冒險開發。

【⚡ 單行派工命令 (收到即執行 ✕ 嚴禁雲端搜尋或讀取檔案)】
python scripts/brain_delegator.py -w "C:\Users\達爾\projects\math-island" --react --max-iterations 12 -t "跨科目期末綜合挑戰島關卡規劃與規則串接，完成後 node --check 自檢"
```

> 🤖 **自動升級維護協議**：本專案已配置 `AGENTS.md` 自動升級記錄規則。只要 AI 完成任何功能更新或 Bug 修復，皆會自動在下方「版本更新歷程」自動累加版本號並詳述升級訊息。

---

## 📂 核心檔案與架構速查

| 檔案路徑 | 角色與職責 | 重要數據 / 規格 |
| :--- | :--- | :--- |
| **`PROJECT_HANDOVER.md`** | 跨對話進度與交接手冊 | 記錄當前版號與待辦 (SSOT) |
| **`AGENTS.md`** | AI 開發守則與架構規範 | 常駐規則守護與架構紅線 |
| **`index.html`** | 遊戲前端主頁面 | 含頂部全域導覽、科目切換膠囊、年級切換膠囊與版號標籤 (v2.3.4) |
| **`manifest.webmanifest`** | PWA 漸進式應用清單 | 定義獨立桌面視窗、全螢幕與吉祥物圖示 |
| **`sw.js`** | Service Worker 離線快取 | 支援離線秒開與 Android/iOS/Chrome 安裝條件 (v2.3.4) |
| **`assets/icons/`** | PWA 桌面圖示集合 | 192x192 與 512x512 高畫質 PNG 圖示 |
| **`server.py`** | 輕量本機 HTTP 伺服器 | 預設監聽 8085，支援 MIME 與 CORS 標頭 |
| **`js/main.js`** | 主程式入口調度 | 畫面切換、事件監聽與年級狀態聯動 |
| **`js/grades.js`** | 年級設定字典 | 定義小一至小三島嶼、關卡數與題庫對應；`SUBJECT_GRADES` 科目掛表 |
| **`js/subjects.js`** | 科目註冊表 (SSOT) | 數學/英文/國語島定義、語音語系 (en-US / zh-TW) 與就緒旗標 |
| **`js/levels/island_defs_g3.js`** | 小三 4 大島嶼與 16 關卡定義 | 算術神殿、幾何迷宮、分數花園、時空星盤 |
| **`js/visuals.js`** | 豐富數學動態教具與繪本情境渲染 | 支援直式、分數、幾何、SVG 數線與 `renderStoryVisual` 情境卡 |
| **`assets/images/story-*.jpg`** | 智慧繪本插圖庫 | 花園冒險、思考筆記、海島尋寶高品質萌系插圖 |
| **`data/question-bank-g1.json`** | 小一專屬題庫 | 16 關 x 12 題 = 192 題 |
| **`data/question-bank-g2.json`** | 小二專屬題庫 | 16 關 x 12 題 = 192 題 |
| **`data/question-bank-g3.json`** | 小三專屬題庫 (108 課綱) | 16 關 x 12 題 = 192 題 |
| **`data/question-bank-en-g1.json`** | 奇幻英文島小一題庫 | 16 關 x 8 題 = 128 題自然發音與生活單字 |
| **`data/question-bank-en-g2.json`** | 奇幻英文島小二題庫 | 16 關 x 8 題 = 128 題長母音與詞族生活單字 |
| **`data/question-bank-en-g3.json`** | 奇幻英文島小三題庫 | 16 關 x 8 題 = 128 題母音組合與句子冒險 |
| **`auto_backup.py`** | 三層智慧備份與自動封存 | 支援日常備份與 Handover 防膨脹修剪 |
| **`一鍵推送GitHub版本.bat`** | GitHub 一鍵推送自動化腳本 | 自動 commit 與 push 至 main 分支 |
| **`.gitignore`** | Git 排除設定 | 排除 backups 快照、敏感 Token 與大型暫存檔 |
| **`token_dashboard.html`** | 即時 Token 視覺化儀表板 | 5h 滑動窗口與多帳號記帳池 |
| **`backup_config.json`** | 專案備份與排除客製化設定 | 自訂副檔名、排除目錄與靜態檔 |

---

## 📌 當前推進焦點看板 (Active Focus) 【極簡常駐・防膨脹】
- [ ] **跨科目期末綜合挑戰島關卡規劃**

### 🎯 待執行任務清單 (Pending Tasks - 置頂優先)
- [ ] 跨科目期末綜合挑戰島關卡規劃

---

### 🌟 近期已完成核心里程碑 (Recent Done - 保留最新 5 項)

- [x] **奇幻英文島自然發音卡與單字拼讀積木教具實裝** (`js/visuals.js` 實裝 `englishPhonics` 字母自然發音卡、`englishSpelling` 單字拼讀積木與 `englishVisual` 分流器，修復 `chinese` 重複宣告語法錯誤；支援母音/子音/未知格色彩區隔與美語 en-US 點擊發音互動，`css/style.css` 補齊全響應式流體排版) (v2.4.9)
- [x] **國語島生字筆順動態繪製與筆畫指引教具擴展** (v2.4.8)
<details><summary>過往已完成歷史任務</summary>
- [x] **多科目關卡前置星數解鎖與學習徽章系統實裝** (`js/state.js` 實裝 4 島前置星數門檻門檻值 0/6/16/28 ⭐ 與雙軌鎖定檢驗、新增 `js/badges.js` 10 大榮譽成就系統與動態進度檢驗、首頁/地圖/頂部全域列全面掛載徽章館 Modal 與即時徽章通知、`engine.js` 通關結算動態慶祝新徽章、`sw.js` 快取同步) (v2.4.7)
- [x] **國語島動態注音卡與生字米字格教具響應式優化** (`js/visuals.js` 升級多字米字格自適應群組、小學標準米字格 SVG 網格線、教育部標準標楷體字體鏈、點擊卡片與米字格雙軌語音發音反饋與微動效、`style.css` 響應式斷點全面適配行動裝置與極窄手機) (v2.4.6)
- [x] **英文與國語島語音讀題中文化與教具防洩題全面修復** (英文島語音切換 zh-TW 台灣雙語混讀、英文島看圖選字教具隱藏答案文字、國語島注音卡隱藏答案符號改為「？」並展示生字引導拼音、渲染層防洩題機制與題庫全面清洗) (v2.4.5)
- [x] **全科全年級 144 關卡聯動驗收與跨科目進度持久化優化** (數/英/國 × 小一~小三 144 關整合測試、跨科目存儲隔離與單元測試全通、全景聚合匯總與導出導入 API、首頁與膠囊即時聯動) (v2.4.4)
- [x] **奇幻國語島小三題庫與關卡建置** (`data/question-bank-ch-g3.json` 128 題修辭成語閱讀、`js/levels/island_defs_ch_g3.js` 4 島 16 關、`js/levels/index.js` 與 `js/grades.js` 全面掛載) (v2.4.3)
</details>
- [x] **奇幻英文島關卡科目化** (`js/levels/index.js` 科目→年級 SSOT 取表、新增 `js/levels/island_defs_en_g1.js` 4 島 16 關英文標題與 intro) (v2.3.1)
- [x] **奇幻英文島小一 MVP 上線** (16 關 × 8 題 = 128 題自然發音與生活單字、`SUBJECT_GRADES.english` 掛表、英文島綠燈) (v2.3.0)
- [x] **方案 A 多科目切換大廳架構升級 (頂部科目膠囊、en-US 美語語音引擎、多科進度獨立記帳) (v2.2.0)**
- [x] **納入 Token & Backup Toolkit 核心機制** (SSOT 工具鏈同步、登記清單、雲端同步管家)
- [x] **前端介面版本標籤 (v2.0.0 / v2.1.0 / v2.1.1 / v2.1.2) 與樣式配置**
- [x] **建立基準重大版本備份快照 (`backup_MAJOR_v2.0.0`)**
- [x] **擴充國小三年級 (Grade 3) 題庫與關卡** (16 關 x 12 題 = 192 題完整上線)
- [x] **題目下方視覺輔助框框美化與繪本插圖/情境數量卡片整合 (v2.1.1)**
- [x] **數線 (numberLine) 教具重構升級為響應式向量 SVG 與題庫防洩題標籤修正 (v2.1.2)**
- [x] **啟動 GitHub Pages 免費即時上線準備與 Git 倉庫初始化 (含一鍵推送腳本)**
- [x] **全面升級 PWA 桌面/平板 App 安裝支援 (Manifest + Service Worker 離線快取) (v2.1.3)**
- [x] **確立「小一～小三橫向主科奠基」戰略方針與方案 A Roadmap (`docs/ROADMAP.md`)**
</details>

## 🌟 近期重大功能更新歷程 (Version Changelog)

### 【v2.4.9 版】🔤 奇幻英文島自然發音卡與單字拼讀積木教具實裝 ✕ 雙軌美語發音互動 📅 2026-10-25

1. **英語島專屬教具 (`js/visuals.js`)**：
   - 實裝 `englishPhonics` 字母自然發音卡：支援大小寫字母跳動卡、標準音標/自然發音標籤、範例單字與美語發音互動。
   - 實裝 `englishSpelling` 單字拼讀積木：支援母音（暖橙）、子音（蔚藍）與神秘缺字（金黃閃爍）色彩區隔與點擊發音。
   - 實裝 `englishVisual` 智慧派發器：整合圖片單字題、拼讀填空題與字母發音題，防洩題與美化繪本排版。
   - 修正前版 `chinese` 重複宣告之 ESM 語法異常，統一為 `strokeOrderVisual`。
2. **視覺樣式適配 (`css/style.css`)**：
   - 補齊 `.english-visual-wrap`、`.english-letter-tile`、`.english-spelling-stage` 等微動效與手機直向斷點。
3. **版本同步與安全備份**：
   - `python scripts/bump_version.py 2.4.9` 一鍵同步版本標籤，建立 `backup_v2.4.9_2026-10-25_221422.zip` 還原節點。

### 【v2.4.6 版】🏮 國語島動態注音卡與生字米字格教具響應式優化 ✕ 多字自適應群組 ✕ 點擊雙軌語音互動 📅 2026-10-25

1. **生字米字格教具全面升級 (`js/visuals.js`)**：
   - 支援多字（生詞）自適應米字格群組 (`.chinese-grid-group`)，單字大格 (136px)、雙字並排 (96px)、多字 (78px)，徹底根除多字重疊破版問題。
   - 小學練習本格規範 SVG 繪製：標準十字紅虛線、米字對角虛線、中心定位錨點，搭配教育部標準標楷體字體鏈。
   - 米字格與注音徽章均支援點擊朗讀互動，具備雙軌語音合成（優先調用專案語音，平滑降級 Web Speech API）與 `.is-speaking` 彈跳動態反饋。
2. **動態注式卡升級 (`js/visuals.js`)**：
   - 重構為結構化語意類別（`.phonetic-card`、`.phonetic-symbol`、`.phonetic-word`、`.phonetic-audio-hint`）。
   - 魔法字卡金黃柔光立體漸層質感、觸控彈跳反饋，點擊即朗讀注音或生字。
3. **響應式佈局全面適配 (`css/style.css`)**：
   - 新增 `@media (max-width: 560px)` 與 `@media (max-width: 380px)` 斷點適配，在平板、直向手機與極窄螢幕上均自適應流體置中，0 水平溢出。
   - 小狐狸提醒氣泡卡片支援自適應滿寬與可讀性字體行高。
4. **版本同步與安全備份**：
   - `python scripts/bump_version.py 2.4.6` 一鍵同步 `PROJECT_HANDOVER.md`、`index.html`、`sw.js`。
   - 自動調用 `auto_backup` 產出 `backup_v2.4.6_2026-10-25_214351.zip` 還原節點。

### 【v2.4.3 版】📖 奇幻國語島小三題庫建置 ✕ 128 題修辭成語閱讀 ✕ 4 島 16 關關卡定義與掛載 📅 2026-10-25

1. **國語小三題庫建置 (`data/question-bank-ch-g3.json`)**：16 關 × 8 題 = 128 題，涵蓋修辭基礎（譬喻、擬人、排比、設問）、成語運用（動物寓言、勤學勵志、景物描摹、品德成語）、句型變換（因果轉折、條件遞進、把被互換、照樣造句）與段落閱讀（標點符號、段落主旨、記敘六要素、閱讀理解魔王）。
2. **小三國語島關卡定義 (`js/levels/island_defs_ch_g3.js`)**：4 座島嶼（修辭魔法殿、成語典故海、句型變換雲、段落閱讀星）共 16 個挑戰關卡，完整配置技能說明、emoji 與中文 intro 提示。
3. **科目年級字典與全域關卡表雙向掛載**：
   - `js/grades.js`：`CHINESE_GRADES` 擴充小三 (id: 3) 元資料，指向 `data/question-bank-ch-g3.json`。
   - `js/levels/index.js`：引入並掛載 `ch_g2_islands` 與 `ch_g3_islands` 至 `SUBJECT_LEVEL_TABLES.chinese`，解鎖小二與小三關卡總表。
4. **離線快取與版本推進**：`sw.js` 納入小二與小三國語題庫離線快取，快取名稱升級至 `math-island-v2.4.3`；`bump_version.py` 自動建立版本備份快照。
5. **完整性驗收**：`node --check` 語法檢查 100% 綠燈，ESM 動態載入驗證小三 16 關卡與 128 題庫資料結構無誤。

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

### 📦 歷史版本封存精簡速查 (Historical Milestones Summary)

> 💡 為維持 Token 最佳化，最新版本以外之過往詳細技術演進已無損封存至 [`docs/CHANGELOG_ARCHIVE.md`](docs/CHANGELOG_ARCHIVE.md)。以下為核心里程碑速查：

| 版本區間 | 發布日期 | 核心亮點演進摘要 | 完整詳細紀錄 |
| :--- | :--- | :--- | :--- |
| **v2.45.0** | 2026-09-20 | 兩層式收藏總覽 ✕ 動態分頁神器 ✕ 終身尊榮 VIP (元大 806) | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |
| **v2.44.x** | 2026-09-20 | 生活助手新版小報 ✕ 收藏雲端 Gist 漫遊 ✕ 50筆防爆上限 | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |
| **v2.43.x** | 2026-09-20 | 群組共享模式 ✕ 個人收藏清單 ✕ LINE Flex URI 溢出根治 | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |
| **v2.42.x** | 2026-09-20 | 技能化解耦落地 ✕ AGENTS.md 瘦身 ✕ 關鍵字脫敏日誌與別名演化 | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |
| **v2.41.0** | 2026-09-20 | 平日/假日尖峰雙軌 DAU 模型、7日平均活躍度、報表語法修復 | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |
| **v2.40.2** | 2026-09-19 | Render 部署防禦性安全匯入、自然語言費率正則修復 | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |
| **v2.30~37** | 2026-09-19 | 大字版視覺舒適校準、相片備註優先、SQLite WAL極速還原、廣告成效 | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |
| **v2.20~29** | 2026-09-17 | 日本自駕海外特區、車友回報激勵卡片、原生行事曆鬧鐘、Open-Meteo | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |
| **v2.13.0** | 2026-09-14 | 🏛️ 全系統無損平鋪模組化重構 (徹底消滅 8,215 行巨石單體) | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |
| **v1.0~2.12** | 2026-09-12 | 全台 22 縣市 OpenData ✕ TDX 即時在席、小吃盲盒、公廁雷達、初始原型 | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |

> 📚 **完整歷史文檔**：如需深入查閱任一歷史版本之完整工程日誌與修復細節，請參閱 [`docs/CHANGELOG_ARCHIVE.md`](docs/CHANGELOG_ARCHIVE.md)。
