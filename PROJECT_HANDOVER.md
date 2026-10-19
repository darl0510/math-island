# 🌈 奇幻數學島大冒險 (Fantasy Math Island Adventure)
> **專案交接與跨設備開發同步手冊 (Antigravity IDE Handover Document)**  
> **最後更新時間**：2026-10-19 (v2.1.3 版)  
> **適用場景**：公司與家中電腦 Antigravity IDE 跨設備進度無縫接軌

---

## 📌 給 Antigravity IDE 的 Agent 引導指令 (Prompt)

當您開啟新對話時，直接在對話框貼上以下這段話給 AI，它就會秒懂架構並接續開發：

```text
【v2.1.3】你好！這是我們目前正在持續開發的奇幻數學島大冒險 (math-island) 專案。
請先閱讀本專案根目錄下的 PROJECT_HANDOVER.md 與 AGENTS.md，了解目前最新版本 (v2.1.3) 的功能架構。
【⚠️ 啟動極限省 Token 協議】：初次喚起僅需快速瀏覽現況即可，切勿在新對話啟動時執行耗時之全套單元測試或大量檢視巨型源碼檔，保持極簡對話步驟，待命並回報就緒即可。
```

> 🤖 **自動升級維護協議**：本專案已配置 `AGENTS.md` 自動升級記錄規則。只要 AI 完成任何功能更新或 Bug 修復，皆會自動在下方「版本更新歷程」自動累加版本號並詳述升級訊息。

---

## 📂 核心檔案與架構速查

| 檔案路徑 | 角色與職責 | 重要數據 / 規格 |
| :--- | :--- | :--- |
| **`PROJECT_HANDOVER.md`** | 跨對話進度與交接手冊 | 記錄當前版號與待辦 (SSOT) |
| **`AGENTS.md`** | AI 開發守則與架構規範 | 常駐規則守護與架構紅線 |
| **`index.html`** | 遊戲前端主頁面 | 含頂部全域導覽、年級切換膠囊與版號標籤 (v2.1.3) |
| **`manifest.webmanifest`** | PWA 漸進式應用清單 | 定義獨立桌面視窗、全螢幕與吉祥物圖示 |
| **`sw.js`** | Service Worker 離線快取 | 支援離線秒開與 Android/iOS/Chrome 安裝條件 |
| **`assets/icons/`** | PWA 桌面圖示集合 | 192x192 與 512x512 高畫質 PNG 圖示 |
| **`server.py`** | 輕量本機 HTTP 伺服器 | 預設監聽 8085，支援 MIME 與 CORS 標頭 |
| **`js/main.js`** | 主程式入口調度 | 畫面切換、事件監聽與年級狀態聯動 |
| **`js/grades.js`** | 年級設定字典 | 定義小一至小三島嶼、關卡數與題庫對應 |
| **`js/levels/island_defs_g3.js`** | 小三 4 大島嶼與 16 關卡定義 | 算術神殿、幾何迷宮、分數花園、時空星盤 |
| **`js/visuals.js`** | 豐富數學動態教具與繪本情境渲染 | 支援直式、分數、幾何、SVG 數線與 `renderStoryVisual` 情境卡 |
| **`assets/images/story-*.jpg`** | 智慧繪本插圖庫 | 花園冒險、思考筆記、海島尋寶高品質萌系插圖 |
| **`data/question-bank-g1.json`** | 小一專屬題庫 | 16 關 x 12 題 = 192 題 |
| **`data/question-bank-g2.json`** | 小二專屬題庫 | 16 關 x 12 題 = 192 題 |
| **`data/question-bank-g3.json`** | 小三專屬題庫 (108 課綱) | 16 關 x 12 題 = 192 題 |
| **`auto_backup.py`** | 三層智慧備份與自動封存 | 支援日常備份與 Handover 防膨脹修剪 |
| **`一鍵推送GitHub版本.bat`** | GitHub 一鍵推送自動化腳本 | 自動 commit 與 push 至 main 分支 |
| **`.gitignore`** | Git 排除設定 | 排除 backups 快照、敏感 Token 與大型暫存檔 |
| **`token_dashboard.html`** | 即時 Token 視覺化儀表板 | 5h 滑動窗口與多帳號記帳池 |
| **`backup_config.json`** | 專案備份與排除客製化設定 | 自訂副檔名、排除目錄與靜態檔 |

---

## 📌 當前推進焦點看板 (Active Focus) 【極簡常駐・防膨脹】

- [x] **納入 Token & Backup Toolkit 核心機制** (SSOT 工具鏈同步、登記清單、雲端同步管家)
- [x] **前端介面版本標籤 (v2.0.0 / v2.1.0 / v2.1.1 / v2.1.2) 與樣式配置**
- [x] **建立基準重大版本備份快照 (`backup_MAJOR_v2.0.0`)**
- [x] **擴充國小三年級 (Grade 3) 題庫與關卡** (16 關 x 12 題 = 192 題完整上線)
- [x] **題目下方視覺輔助框框美化與繪本插圖/情境數量卡片整合 (v2.1.1)**
- [x] **數線 (numberLine) 教具重構升級為響應式向量 SVG 與題庫防洩題標籤修正 (v2.1.2)**
- [x] **啟動 GitHub Pages 免費即時上線準備與 Git 倉庫初始化 (含一鍵推送腳本)**
- [x] **全面升級 PWA 桌面/平板 App 安裝支援 (Manifest + Service Worker 離線快取) (v2.1.3)**
- [x] **規劃方案 A 多科目聚合架構「奇幻學習宇宙」Roadmap (英文島、國語島、自然島等) (`docs/ROADMAP.md`)**
- [ ] **擴充國小四年級 (Grade 4) 題庫與關卡 (預備中)**
- [ ] **教具互動觸控操作體驗微調**

> 💡 **中長期全科學習宇宙擴展藍圖**：已完整收錄至 [`docs/ROADMAP.md`](docs/ROADMAP.md)，涵蓋英文、國語、自然、社會、生活、資訊邏輯等科目之教具與題型規格！

---

## 🌟 近期重大功能更新歷程 (Version Changelog)

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
