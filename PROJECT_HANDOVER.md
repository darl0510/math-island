# 🌈 奇幻數學島大冒險 (Fantasy Math Island Adventure)
> **專案交接與跨設備開發同步手冊 (Antigravity IDE Handover Document)**  
> **最後更新時間**：2026-10-25 (v2.5.4 版)  
> **適用場景**：公司與家中電腦 Antigravity IDE 跨設備進度無縫接軌

---

## 📌 給 Antigravity IDE 的 Agent 引導指令 (Prompt)

當您開啟新對話時，直接在對話框貼上以下這段話給 AI，它就會秒懂架構並接續開發：

```text
【v2.5.4】你好！請繼續推進奇幻數學島大冒險開發。

【⚡ 單行派工命令 (收到即執行 ✕ 嚴禁雲端搜尋或讀取檔案)】
python scripts/brain_delegator.py -w "C:\Users\達爾\projects\math-island" --react --max-iterations 12 -t "奇幻自然科學島小三 16 關自然探索關卡題庫建置與驗證，完成後 node --check 自檢"
```

> 🤖 **自動升級維護協議**：本專案已配置 `AGENTS.md` 自動升級記錄規則。只要 AI 完成任何功能更新或 Bug 修復，皆會自動在下方「版本更新歷程」自動累加版本號並詳述升級訊息。

---

## 📂 核心檔案與架構速查

| 檔案路徑 | 角色與職責 | 重要數據 / 規格 |
| :--- | :--- | :--- |
| **`PROJECT_HANDOVER.md`** | 跨對話進度與交接手冊 | 記錄當前版號與待辦 (SSOT) |
| **`AGENTS.md`** | AI 開發守則與架構規範 | 常駐規則守護與架構紅線 |
| **`index.html`** | 遊戲前端主頁面 | 含頂部全域導覽、科目切換膠囊、年級切換膠囊與版號標籤 (v2.5.4) |
| **`manifest.webmanifest`** | PWA 漸進式應用清單 | 定義獨立桌面視窗、全螢幕與吉祥物圖示 |
| **`sw.js`** | Service Worker 離線快取 | 支援離線秒開與 Android/iOS/Chrome 安裝條件 (v2.5.4) |
| **`assets/icons/`** | PWA 桌面圖示集合 | 192x192 與 512x512 高畫質 PNG 圖示 |
| **`server.py`** | 輕量本機 HTTP 伺服器 | 預設監聽 8085，支援 MIME 與 CORS 標頭 |
| **`js/main.js`** | 主程式入口調度 | 畫面切換、事件監聽與年級狀態聯動 |
| **`js/grades.js`** | 年級設定字典 | 定義小一至小三島嶼、關卡數與題庫對應；`SUBJECT_GRADES` 科目掛表 |
| **`js/subjects.js`** | 科目註冊表 (SSOT) | 數學/英文/國語/期末挑戰/自然科學島定義、語音語系與就緒旗標 |
| **`js/trophy.js`** | 期末綜合挑戰金盃頒發盛典模組 | 旋轉光芒、浮動金盃、三科PASS認證與頒獎祝賀語音 |
| **`js/levels/island_defs_challenge.js`** | 跨科目期末綜合挑戰島 48 關卡定義 | 數英中跨學科融合評量 (小一至小三各 4 島 16 關) |
| **`data/question-bank-challenge-g{1,2,3}.json`** | 期末綜合挑戰題庫 | 小一至小三各 16 關 x 6 題 = 96 題跨領域素養會考題 |
| **`data/question-bank-science-g{1,2}.json`** | 奇幻自然科學島題庫 | 小一與小二各 16 關 x 8 題 = 128 題自然科學素養探索題 |
| **`js/levels/island_defs_science_g{1,2}.js`** | 奇幻自然科學島關卡定義 | 小一與小二自然探索各 4 島 16 關中文導讀與島嶼規格 |
| **`js/visuals.js`** | 豐富數學動態教具與繪本情境渲染 | 支援直式、分數、幾何、SVG 數線與情境教具 |
| **`auto_backup.py`** | 三層智慧備份與自動封存 | 支援日常備份與 Handover 防膨脹修剪 |
| **`一鍵推送GitHub版本.bat`** | GitHub 一鍵推送自動化腳本 | 自動 commit 與 push 至 main 分支 |

---

## 📌 當前推進焦點看板 (Active Focus) 【極簡常駐・防膨脹】
- [ ] **奇幻自然科學島小三 16 關自然探索關卡題庫建置與整合**

### 🎯 待執行任務清單 (Pending Tasks - 置頂優先)
- [ ] 奇幻自然科學島小三 16 關自然探索關卡題庫建置與整合
- [ ] 跨領域綜合素養成果分享海報與家長成績單報表功能實裝

---

### 🌟 近期已完成核心里程碑 (Recent Done - 保留最新 5 項)

- [x] **奇幻自然科學島小二 16 關自然進階探索關卡題庫建置** (完成 `data/question-bank-science-g2.json` 128 題自然探索題庫、建置 `js/levels/island_defs_science_g2.js` 4 島 16 關定義、在 `js/levels/index.js` 與 `js/grades.js` 註冊掛表，`node --check` 自檢全綠燈) (v2.5.4)
- [x] **奇幻自然科學島註冊與小一 16 關自然探索關卡題庫建置** (完成小一 128 題自然探索題庫與關卡定義掛載) (v2.5.3)
- [x] **跨科目期末綜合挑戰島 UI 地圖與通關獎盃動畫實裝** (建立 `js/trophy.js` 通關金盃頒發盛典模組、整合旋轉射線與浮動金盃動畫、在 `map.js` 實裝挑戰會考 Banner 與獎盃快捷、在 `engine.js` 完賽聯動金盃慶祝與語音賀詞，全年級 192 關自檢全綠燈) (v2.5.1)
- [x] **英文島答案洩漏全面修復 ✕ 跨科目期末綜合挑戰島關卡規劃與規則串接** (v2.5.0)
- [x] **奇幻英文島自然發音卡與單字拼讀積木教具實裝** (v2.4.9)
<details><summary>過往已完成歷史任務</summary>
- [x] **國語島生字筆順動態繪製與筆畫指引教具擴展** (v2.4.8)
- [x] **多科目關卡前置星數解鎖與學習徽章系統實裝** (v2.4.7)
- [x] **國語島動態注音卡與生字米字格教具響應式優化** (v2.4.6)
- [x] **英文與國語島語音讀題中文化與教具防洩題全面修復** (v2.4.5)
- [x] **全科全年級 144 關卡聯動驗收與跨科目進度持久化優化** (v2.4.4)
- [x] **奇幻國語島小三題庫與關卡建置** (v2.4.3)
</details>

## 🌟 近期重大功能更新歷程 (Version Changelog)

### 【v2.5.1 版】🏆 跨科目期末綜合挑戰島 UI 地圖與通關獎盃動畫實裝 📅 2026-10-25

1. **通關獎盃頒發盛典模組 (`js/trophy.js`)**：
   - 建立高質感全螢幕頒獎盛典 Modal，支援 360 度旋轉金色光芒射線 (`trophy-rays`)、浮動金盃 (`trophy-gold-cup`) 與皇冠星星彈跳動效。
   - 整合台灣國小年級榮譽頭銜（全能大師/乘風破浪領主/至尊大成學士）、答題通關數據統計與數英中三科 PASS 認證標籤。
   - 雙軌語音祝賀朗讀與多重煙火彩帶慶祝 (`fireworks` + `launchConfetti`)，無縫聯動榮譽徽章系統。
2. **期末綜合挑戰島專屬 UI 地圖 (`js/map.js` & `css/style.css`)**：
   - 地圖頂部實裝 `challenge-map-banner` 玻璃擬態卡片，標註三大領域整合評量與金盃進度快捷按鈕。
   - 島嶼卡片新增 `is-challenge-island` 專屬邊框微光，關卡卡片加入「數✕英✕中」融合標記，第 16 關特製 `👑 總魔王會考` 皇冠金牌。
3. **通關聯動與導覽列狀態 (`js/engine.js` & `js/main.js`)**：
   - 在第 16 關或期末挑戰島通關時，自動觸發金盃頒發盛典；頂部科目膠囊精準呈現 18⭐ 解鎖門檻與星星計數。
   - 全年級 144 + 48 = 192 關卡自動化測試與 `node --check` 自檢全數通過。

### 【v2.5.0 版】🛡️ 英文島答案防洩漏全面修復 ✕ 跨科目期末綜合挑戰島關卡規劃與規則串接 📅 2026-10-25

1. **英文島答案防洩漏機制 (`js/engine.js` & `question-bank-en-*.json`)**：
   - 核心防洩題：在 `optionEmojis()` 加入題幹與視覺教具圖示比對過濾，凡與題幹或教具相同的 Emoji 在作答前嚴禁渲染在按鈕上。
   - 題庫清洗：全數清除 `question-bank-en-g1.json`、`g2.json`、`g3.json` 共 306 處干擾性 `optionEmojis`，修正 `ax` 斧頭教具洩題，回歸真實英文單字與發音測驗。
2. **跨科目期末綜合挑戰島關卡規劃 (`js/levels/island_defs_challenge.js`)**：
   - 橫跨國小一至三年級，每學年規劃 4 大期末素養島嶼（4 島 × 4 關 = 16 關，共 48 關）。
   - 小一（素養起步、生活探索、思維進階、期末總魔王）、小二（乘風啟航、度量冰川、乘法烈焰、星河大魔王）、小三（算術神殿、幾何修辭、分數閱讀、時空終極星盤）。
3. **跨學科題庫生成 (`data/question-bank-challenge-g{1,2,3}.json`)**：
   - 透過 `scripts/generate_challenge_banks.py` 精選數學 (2題)、英文 (2題)、國語 (2題) 融合成 6 題跨學科考卷，共 288 題，標註學科徽章。
4. **規則串接與成就系統 (`js/state.js` & `js/badges.js` & `js/main.js`)**：
   - 解鎖規則：三大核心科目（數英中）需各完成 2 關且累計達 18 顆星方可解鎖該年級期末挑戰島；未達標點擊膠囊彈出友善引導。
   - 新增 `challenge_master`「全科全能王」成就徽章。
   - 驗證通過：`test_144_levels.mjs` (144關)、`test_state_cross_subject.mjs` (持久化5測試)、`test_challenge_levels.mjs` (48挑戰關) 100% PASS。

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
