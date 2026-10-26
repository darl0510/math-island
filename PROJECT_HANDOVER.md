# 🌈 奇幻數學島大冒險 (Fantasy Math Island Adventure)
> **專案交接與跨設備開發同步手冊 (Antigravity IDE Handover Document)**  
> **最後更新時間**：2026-10-26 (v2.6.1 版)  
> **適用場景**：公司與家中電腦 Antigravity IDE 跨設備進度無縫接軌

---

## 📌 給 Antigravity IDE 的 Agent 引導指令 (Prompt)

當您開啟新對話時，直接在對話框貼上以下這段話給 AI，它就會秒懂架構並接續開發：

```text
【v2.6.1】你好！請繼續推進奇幻數學島大冒險開發。

【⚡ 單行派工命令 (收到即執行 ✕ 嚴禁雲端搜尋或讀取檔案)】
python scripts/brain_delegator.py -w "C:\Users\達爾\projects\math-island" --react --max-iterations 12 -t "實裝跨領域綜合素養成果分享海報與家長成績單報表功能，完成後 node --check 自檢"
```

> 🤖 **自動升級維護協議**：本專案已配置 `AGENTS.md` 自動升級記錄規則。只要 AI 完成任何功能更新或 Bug 修復，皆會自動在下方「版本更新歷程」自動累加版本號並詳述升級訊息。

---

## 📂 核心檔案與架構速查

| 檔案路徑 | 角色與職責 | 重要數據 / 規格 |
| :--- | :--- | :--- |
| **`PROJECT_HANDOVER.md`** | 跨對話進度與交接手冊 | 記錄當前版號與待辦 (SSOT) |
| **`AGENTS.md`** | AI 開發守則與架構規範 | 常駐規則守護與架構紅線 |
| **`index.html`** | 遊戲前端主頁面 | 含頂部全域導覽、科目切換膠囊、年級切換膠囊與版號標籤 (v2.5.5) |
| **`manifest.webmanifest`** | PWA 漸進式應用清單 | 定義獨立桌面視窗、全螢幕與吉祥物圖示 |
| **`sw.js`** | Service Worker 離線快取 | 支援離線秒開與 Android/iOS/Chrome 安裝條件 (v2.5.5) |
| **`assets/icons/`** | PWA 桌面圖示集合 | 192x192 與 512x512 高畫質 PNG 圖示 |
| **`server.py`** | 輕量本機 HTTP 伺服器 | 預設監聽 8085，支援 MIME 與 CORS 標頭 |
| **`js/main.js`** | 主程式入口調度 | 畫面切換、事件監聽與年級狀態聯動 |
| **`js/grades.js`** | 年級設定字典 | 定義小一至小三島嶼、關卡數與題庫對應；`SUBJECT_GRADES` 科目掛表 |
| **`js/subjects.js`** | 科目註冊表 (SSOT) | 數學/英文/國語/期末挑戰/自然科學島定義、語音語系與就緒旗標 |
| **`js/trophy.js`** | 期末綜合挑戰金盃頒發盛典模組 | 旋轉光芒、浮動金盃、三科PASS認證與頒獎祝賀語音 |
| **`js/levels/island_defs_challenge.js`** | 跨科目期末綜合挑戰島 48 關卡定義 | 數英中跨學科融合評量 (小一至小三各 4 島 16 關) |
| **`data/question-bank-challenge-g{1,2,3}.json`** | 期末綜合挑戰題庫 | 小一至小三各 16 關 x 6 題 = 96 題跨領域素養會考題 |
| **`data/question-bank-science-g{1,2,3}.json`** | 奇幻自然科學島題庫 | 小一至小三各 16 關 x 8 題 = 128 題自然科學素養探索題 |
| **`js/levels/island_defs_science_g{1,2,3}.js`** | 奇幻自然科學島關卡定義 | 小一至小三自然探索各 4 島 16 關中文導讀與島嶼規格 |
| **`js/visuals.js`** | 豐富數學動態教具與繪本情境渲染 | 支援直式、分數、幾何、SVG 數線與情境教具 |
| **`auto_backup.py`** | 三層智慧備份與自動封存 | 支援日常備份與 Handover 防膨脹修剪 |
| **`一鍵推送GitHub版本.bat`** | GitHub 一鍵推送自動化腳本 | 自動 commit 與 push 至 main 分支 |

---

## 📌 當前推進焦點看板 (Active Focus) 【極簡常駐・防膨脹】
- [ ] **跨領域綜合素養成果分享海報與家長成績單報表功能實裝**

### 🎯 待執行任務清單 (Pending Tasks - 置頂優先)
- [ ] 跨領域綜合素養成果分享海報與家長成績單報表功能實裝 (Canvas 繪製海報 / 下載 PNG / 總結通關星數與成就)
- [ ] 音訊資源全面預載與 iOS 靜音模式自動提示引導

---

### 🌟 近期已完成核心里程碑 (Recent Done - 保留最新 5 項)

- [x] **英文島選項語音順序 100% 鏡像畫面打亂 ✕ 徹底防洩題與正解先念根治** (根治英文島念選項時直接念答案洩題問題：將選項隨機打亂儲存於 `question._displayOptions` 與 `question.currentOptions`，提前於視覺渲染前完成；`playQuestionAudio` 嚴格依據打亂後之畫面按鈕順序依序朗讀「選項一、選項二、選項三」，非固定 order 絕不直接讀題庫 raw 陣列首位答案；全面更新自動朗讀、頂部朗讀鈕、卡片朗讀鈕與鍵盤 R 鍵熱鍵) (v2.6.1)
- [x] **平板與中窄螢幕頂部導覽列 RWD 響應式系統重構 ✕ 根治字體直向折行擠壓** (解決 iPad/平板橫直向寬度下 `.grade-dropdown-btn`「二年級」折行變 3 行、`.brand`「奇幻英文島」擠壓折行問題：全域加上 `white-space: nowrap` 與 `flex-shrink: 0`；建立 1200px / 1040px / 860px / 680px 四階梯式 RWD 尺寸微調，包含自動隱藏平板非必要版號徽章、緊湊按鈕尺寸、年級下拉選單右對齊防出界、860px 以下平滑支援橫向滾動與精簡圖標，各尺寸平板 100% 完美展示) (v2.6.0)
- [x] **英文島題目朗讀選項雙軌音效 ✕ 消除無關 Apple 發音教具 ✕ 選項獨立點讀實裝** (根治英文島聽一聽題目未念選項問題：在 `js/audio.js` 實裝 `playQuestionAudio` 與雙語 `buildQuestionSpeechSequence`，中英無縫切換依序朗讀「題目 + 選項一/二/三」；在 `js/engine.js` 為英文選項增設獨立 `🔊` 點讀按鈕；修復 `js/visuals.js` 中 `englishPhonics` 預設為 `'a'` 導致 23 題 (如 pin 結尾音、hug 結尾音等) 莫名冒出 `apple` 發音卡片之問題，回歸單字學習卡與 `📌 pin` 單字發音鈕；清洗全題庫 88 處「仔細聽，選出正確的選項喔！」假朗讀文本，回歸真實題目朗讀) (v2.5.9)
- [x] **國語注音跑版根治 ✕ 筆順部首零洩題 ✕ 英文聽聽看防暴雷與題幹本地化修復** (移除 CSS 衝突 `.phonetic-card` 窄盒覆寫、實裝專屬注音拼讀算式卡 `ㄈ + ㄡ = ❓` 杜絕生字擠壓垂直換行；修復小二國語筆順/部首題 `visual.character` 洩漏正解與 `注音：ㄅㄚ` 側邊暴雷問題，改為規則引導卡與正解注音徹底遮蔽；根除英文島 `🔊 聽聽看 (bug)` 按鈕標籤與發音直接送分問題，改為朗讀題幹單字；全面修正英文島中間答案圖示 `🥤` 洩露中文選項問題，並將 `What is this?` 等 20 題英文題幹本地化為親切雙語引導，100% 通過 144 關測試) (v2.5.8)
- [x] **英文國語防洩題全面修復 ✕ 語音裝置智慧中英雙軌升級 ✕ 國語筆順多元題型重構** (修復英文教具常態洩題與發音朗讀錯誤、清洗 172 題英文題庫直接給答案的提示、重構小二筆順島出題消除每題答案相同問題、升級 `js/audio.js` 智慧雙軌語音與 voices 預載、重構 `js/texts.js` 分科讚美詞庫消除跨科稱讚數學小達人問題) (v2.5.7)
<details><summary>過往已完成歷史任務</summary>
- [x] **全域注音標示系統實裝** (建立 5,324 字注音辭典 `js/zhuyin-data.js` 與 `js/zhuyin.js`、題目/提示/選項預設 `<ruby><rt>` 注音標註、防洩題防禦、頂部導覽列 `ㄅ` 開關按鈕與 localStorage 偏好記憶、`node --check` 與瀏覽器實測 100% 綠燈) (v2.5.6)

### 【v2.6.1 版】🎯 英文島選項語音順序 100% 鏡像畫面打亂 ✕ 徹底防洩題與正解先念根治 📅 2026-10-26

1. **選項順序鏡像綁定 (`js/engine.js`)**：
   - 在 `renderQuestion(session)` 執行之初，即優先調用 `shuffleOptions` 並直接寫入 `question._displayOptions` 與 `question.currentOptions`。
   - 解決以往先繪製 `renderVisual` 導致卡片上朗讀鈕拿不到隨機選項之問題。
   - 題目自動播放語音、頂部導覽列朗讀鈕、卡片 `🔊 聽題目朗讀` 鈕與鍵盤 `R` 鍵熱鍵，全面傳入 `options` / `currentOptions`，確保 100% 與畫面編號 1、2、3 選項完全一致。
2. **語音模組防洩題防禦 (`js/audio.js`)**：
   - `buildQuestionSpeechSequence` 嚴禁讀取題庫原始 `question.options` 陣列（該陣列首位固定為標準答案）。
   - 優先讀取畫面已打亂的 `optionsOverride` 或 `question.currentOptions`；若兩者皆無則自行 clone 隨機洗牌，徹底杜絕「選項一永遠先念答案」的洩題破梗問題。
3. **卡片朗讀聯動升級 (`js/visuals.js`)**：
   - 英文視覺卡片之 `🔊 聽題目朗讀` 按鈕點擊時，安全傳遞 `question.currentOptions || question._displayOptions`，同步播放與螢幕視覺按鈕完全一致之選項順序。

### 【v2.6.0 版】📱 平板與中窄螢幕頂部導覽列 RWD 響應式系統重構 ✕ 根除直向折行擠壓 📅 2026-10-26

1. **頂部導覽元素防擠壓與防折行鐵律實裝 (`css/style.css`)**：
   - 根治「二年級變成三行垂直折行」：為 `.grade-dropdown-btn` 與 `#grade-btn-text` 嚴格注入 `white-space: nowrap` 與 `flex-shrink: 0`。
   - 根治「奇幻英文島擠壓折行」：為 `.brand`、`#brand-subject-title`、`.brand-sub` 注入 `white-space: nowrap` 與 `flex-shrink: 0`，杜絕任何寬度下的非預期換行。
2. **多階梯式平滑 RWD 斷點系統 (`css/style.css`)**：
   - **1200px (大平板 / 窄筆電)**：內邊距緊湊化 (`padding: 0 16px; gap: 10px`)，自動隱藏非必要之版號徽章（釋放 60px 寬度），按鈕微調為 42px。
   - **1040px (標準 iPad / Android 平板橫向)**：內邊距縮至 12px、間距 8px，隱藏閃爍星標，各科目膠囊緊湊排版，年級按鈕 0.82rem。
   - **860px (iPad 直向 / 小平板)**：隱藏小副標（當前年級由年級膠囊清楚標示），科目膠囊平滑支援橫向滾動（隱藏捲軸），隱藏星星數字，讓 5 大科目膠囊無擠壓排開。
   - **年級選單防出界**：將 `.grade-dropdown-menu` 定位從 `left: 0` 改為 `right: 0; left: auto`，徹底防止靠右端時展開溢出螢幕。

### 【v2.5.9 版】🔊 英文島題目朗讀選項雙軌音效 ✕ 根除無關 Apple 發音教具 ✕ 選項獨立點讀實裝 📅 2026-10-26

1. **題目朗讀雙語無縫朗讀選項與音標轉化 (`js/audio.js` & `js/engine.js` & `data/question-bank-*.json`)**：
   - 根治「聽一聽題目沒念選項三個單字」：實裝 `playQuestionAudio` 與雙語佇列 `buildQuestionSpeechSequence`。在遇到聽力或純英文選項題時，中英無縫切換依序朗讀「題幹問句 + 選項一 pig + 選項二 big + 選項三 dig」，且純英文單字以 `en-US` 原生美語發音。
   - 轉化音標發音：自動將題幹 `/p/`、`/sh/` 轉化為「p 的發音」、「sh 的發音」，杜絕語音引擎念「斜線 p 斜線」或吞音。
   - 清洗題庫 88 處敷衍的「仔細聽，選出正確的選項喔！」假朗讀字串，回歸真實清晰的題目問句。
2. **選項卡片獨立點讀發音功能 (`js/engine.js` & `css/style.css`)**：
   - 為所有英文字詞選項按鈕右側增設獨立 `🔊` 點讀鈕（`.opt-audio-btn`）。
   - 支援 `e.stopPropagation()` 獨立試聽發音，點擊喇叭僅播放該單字的美語標準發音並帶有可愛縮放反饋，不觸發作答；讓小朋友在做聽力題時可隨意單獨重聽任何一個選項，完全掌控答題節奏。
3. **徹底根除無關 Apple 發音教具冒出問題 (`js/visuals.js`)**：
   - 徹底移除 `englishPhonics` 內無字母時盲目 fallback 為 `'a'` 導致任何結尾音/字族題目都跳出「A a apple 聽發音」的重大 Bug。
   - 優化 `englishVisual` 智慧派發器：結尾音/開頭音等字彙理解題目（如 `pin 的結尾音是什麼？`）正確導流至單字卡，展示 `📌 pin` 圖文，並提供專屬「🔊 聽單字 (pin)」與「🔊 聽題目朗讀」按鈕。

### 【v2.5.7 版】🛡️ 英文國語防洩題全面修復 ✕ 語音裝置智慧雙軌升級 ✕ 國語筆順多元題型重構 📅 2026-10-26

1. **語音裝置與跨科讚美詞庫重構 (`js/texts.js` & `js/engine.js` & `js/audio.js` & `js/subjects.js`)**：
   - 根治「英文答題卻被叫數學小達人」：在 `js/texts.js` 重構 `PRAISE` 與新增 `SUBJECT_PRAISES` / `getSubjectPraise()`，數學/英文/國語/自然各司其職，通用詞改為「太棒了！答題小高手！」。
   - 語音裝置升級：`js/audio.js` 加入 `updateVoices()` 與 `onvoiceschanged` 預載機制，解決 Windows / Chrome 剛啟動時 voices 為空導致啞巴問題。
   - 中英智慧雙軌分流：`browserSpeak` 自動偵測文字主體（純英文字母/單字走 `en-US` 美語自然發音；中文字詞走 `zh-TW` 台灣國語），英文島科目語系配置同步校正為 `en-US`。
2. **英文視覺教具與題庫防洩題徹底修復 (`js/visuals.js` & `data/question-bank-en-*.json`)**：
   - 移除教具常態顯示的 `english-fox-card` 洩題卡片，回歸由右上角「💡 提示」按鈕按需觸發。
   - 修正拼字題（Spelling）：無挖空時嚴禁直接拼出完整正解積木；單字釋義題聽聽看按鈕朗讀目標英文詞，修正誤將中文答案丟進美語引擎之問題。
   - 清洗 172 處直接寫出正解的題庫 hints，改為引導性提示。
3. **國語小二筆順島出題多元化重構 (`scripts/ch_g2_data.py` & `scripts/build_ch_g2_bank.py` & `data/question-bank-ch-g2.json`)**：
   - 徹底終結「先橫後豎森林 每一題答案都是先橫後豎毫無難度」的問題。
   - 引進 3 大高質量題型：逆向選字（選出先橫後豎的字）、筆畫順序（第一筆先寫什麼）、筆順例外（哪一個字不是本關筆順），每題正解完全不同，具備真實思考深度。

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
