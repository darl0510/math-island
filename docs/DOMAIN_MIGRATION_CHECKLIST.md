# 🌐 台灣停車與生活設施 LINE Bot 換網址與雲端遷移維運檢核手冊 (Domain Migration Checklist)

> **建立時間**：2026-10-05 (v2.69.168)  
> **適用專案**：`tw-parking-linebot` (LINE 智慧生活設施與停車自駕系統)  
> **適用場景**：更換 Render 實例、更換自訂域名 (Custom Domain)、遷移至 Koyeb / Fly.io / VPS、或在不同雲端主機間搬移時之標準檢核流程。

---

## 🔍 一、切換網址時引發的現象客觀剖析

更換雲端實例或網址時，常見問題通常包含**「換網址直接誘發」**（如 Webhook 未同步）以及**「新環境環境變數遺漏」**：

| 現象 / 錯誤 | 是否由換網址直接引起？ | 核心根因與機制分析 | 改善防護狀態 |
| :--- | :---: | :--- | :---: |
| **1. LINE Bot 失去回應（車友發訊息已讀不回）** | **✅ 是（直接誘發）** | LINE Developers Console 的 Webhook URL 仍指向舊網址。舊網址停機後，LINE 伺服器發送 Webhook 遭遇 404 / 503 或 DNS 解析失敗。 | **標準維運 SOP**<br>換網址必須第一優先至 LINE 後台更新 Webhook URL |
| **2. Flex 卡片按鈕點擊後連線失敗** | **✅ 是（環境變數遺漏）** | Flex 卡片內的「回報車位」、「導航」按鈕依賴 `BASE_SERVER_URL`。若未配置或指向舊網址，車友點擊按鈕將跳轉至失效頁面。 | **已實裝動態適配**<br>後端優先讀取 `RENDER_EXTERNAL_URL`，新環境需同步設定 `BASE_SERVER_URL` |
| **3. 外部防休眠監控 (UptimeRobot) 爆出「503 服務不可用」** | **✅ 是（外部排程遺漏同步）** | 更換 Render 實例後，舊實例已遭停止或移除。若外部保活機器人仍向舊網址發送請求，Cloudflare 反向代理層會直接回傳 HTTP 503。 | **標準維運 SOP**<br>換網址必須同步更新 UptimeRobot 監控 URL 為新網址 `/ping` |
| **4. 雲端車位與車友數據在重啟後消失** | **✅ 是（環境變數遺漏）** | 新環境未設定 `GITHUB_GIST_TOKEN` 與 `GITHUB_GIST_ID`，導致啟動時無法自 GitHub Gist 還原 `user_pinned_locations.json` 與 `user_analytics.json`。 | **已實裝雙向自癒引擎**<br>只要新實例填入 Gist 憑證，開機自動自癒還原 |
| **5. 全台即時停車位查詢報錯或返回空值** | **✅ 是（環境變數遺漏）** | 新環境未設定交通部 `TDX_CLIENT_ID` 與 `TDX_CLIENT_SECRET`，導致向 TDX API 請求即時車位時遭遇 401 鑑權失敗。 | **容錯降級保護**<br>TDX 失效時會降級查詢縣市 OpenData，但仍需配置憑證以獲得最完整即時車位 |
| **6. 本機日誌自動同步報錯連線超時** | **✅ 是（本機腳本變數）** | 本機 `sync_render_logs.py` 與排程批次檔預設 URL 仍指向舊網址，導致日誌無法自動拉取。 | **標準維運 SOP**<br>更新本機環境變數或腳本中的預設伺服器網址 |

---

## 📋 二、未來「換新網址 / 雲端搬遷」7 步標準 SOP

下次若需再次更換網址（如建立新 Render 實例、設定自訂域名、或遷移至 Koyeb）時，請依序執行以下 7 個步驟：

### 步驟 1：新雲端平台環境變數配置 (Environment Variables)
在新的 Render / Koyeb 後台 Environment Variables 區域，至少完整配置以下變數：

| 環境變數名稱 | 類型 | 說明與作用 |
| :--- | :---: | :--- |
| **`LINE_CHANNEL_ACCESS_TOKEN`** | 必填 | LINE Official Account 長效存取權杖 (Messaging API)。 |
| **`LINE_CHANNEL_SECRET`** | 必填 | LINE Bot Channel Secret，用於校驗 Webhook 簽章防偽造。 |
| **`ADMIN_STATS_KEY`** | 必填 | 儀表板與日誌後台管理金鑰 (防範商業數據與日誌暴露)。 |
| **`ADMIN_LINE_USER_ID`** | 必填 | 管理員個人 LINE UID，接收系統異常與營運通報。 |
| **`BASE_SERVER_URL`** | 必填 | 新網址根目錄（例如 `https://tw-parking-xxxx.onrender.com`），供 Flex 卡片連結組裝。 |
| **`GITHUB_GIST_TOKEN`** | 必填 | 具備 Gist 權限之 GitHub Personal Access Token (PAT)。 |
| **`GITHUB_GIST_ID`** | 必填 | 儲存釘住車位、車友統計與商業名店成效之 Gist ID。 |
| **`TDX_CLIENT_ID`** | 必填 | 交通部 TDX 平台 Client ID (查詢全台公有停車場即時車位)。 |
| **`TDX_CLIENT_SECRET`** | 必填 | 交通部 TDX 平台 Client Secret。 |
| **`JSONBIN_API_KEY`** | 選填 | 雲端次要備份通道 API Key (若有使用 JSONBin 備份)。 |
| **`JSONBIN_BIN_ID`** | 選填 | 雲端次要備份通道 Bin ID。 |
| **`ENABLE_LINE_PUSH_REMINDER`** | 選填 | 是否啟用停車到期主動 Push 提醒（`true` / `false`）。 |
| **`DEV_USER_IDS`** | 選填 | 開發者車友 UID 白名單（逗號分隔）。 |

---

### 步驟 2：確認 GitHub 倉庫連動與啟動命令 (Build & Start Command)
- **GitHub 倉庫**：`https://github.com/darl0510/tw-parking-linebot`
- **分支 (Branch)**：`main`
- **建置指令 (Build Command)**：
  ```bash
  pip install -r requirements.txt
  ```
- **啟動指令 (Start Command)**：
  ```bash
  gunicorn --workers 1 --threads 8 --timeout 120 app:app
  ```
  > ⚠️ **架構關鍵警語**：本專案採用 SQLite WAL 本地儲存與記憶體快取架構，**嚴格限制單一 Worker (`--workers 1`) 搭配多執行緒 (`--threads 8`)**，嚴禁設定多 Worker，避免產生多處理程序資料庫鎖死與狀態分歧！

---

### 步驟 3：LINE Developers Console Webhook URL 同步更換 (最關鍵一步)
1. 登入 **[LINE Developers Console](https://developers.line.biz/console/)**。
2. 進入對應的 Provider ➔ 點選本專案的 Messaging API Channel。
3. 切換至 **Messaging API** 分頁。
4. 找到 **Webhook settings**：
   - 將 **Webhook URL** 更新為：`https://<新網址>/callback`
   - 點擊 **Verify (驗證)** 按鈕，確認彈窗顯示 **「Success」** (HTTP 200)。
   - 確認 **Use webhook** 開關維持在 **Enabled (開啟)**。

---

### 步驟 4：雲端雙向持久化自癒與資料庫開機驗證
1. 查看新雲端實例部署日誌 (Deploy Logs)，確認開機輸出包含以下自癒資訊：
   ```text
   [SQLite WAL] 資料庫儲存引擎初始化完成: .../parking_storage.db (WAL 模式已啟動)
   [Reminder Scheduler Worker] 單一守護排程輪詢線程已就緒啟動
   [Pinned Locations] 成功自 SQLite WAL / 雲端 Gist 恢復 N 筆車友釘住車位紀錄
   [Events Auto Sync Worker] 官方活動背景定時輪詢守護線程啟動
   ```
2. 瀏覽器開啟 `https://<新網址>/health`，確認回傳：
   ```json
   {"service": "tw-parking-linebot", "status": "ok", "timestamp": ...}
   ```
3. 瀏覽器開啟 `https://<新網址>/ping`，確認極簡回傳純文字 `OK`（僅 2 bytes）。

---

### 步驟 5：後台儀表板與安全門閘驗證
1. 訪問後台總控儀表板：`https://<新網址>/dashboard?key=<ADMIN_STATS_KEY>`。
   - 確認成功解鎖進入，全站車位數據、情境選單、名店成效正常呈現。
2. 訪問車友營運報表：`https://<新網址>/user_report?key=<ADMIN_STATS_KEY>`。
   - 確認營運特別事項與行為審計表完整加載，無系統還原雜訊。
3. 訪問即時日誌除錯工作台：`https://<新網址>/web_logs?key=<ADMIN_STATS_KEY>`。
   - 確認能正常讀取雲端即時日誌。

---

### 步驟 6：外部防休眠監控服務更新 (UptimeRobot / Cron-Job)
1. 登入 **[UptimeRobot 控制台](https://dashboard.uptimerobot.com/)**。
2. 找到本專案的監控項目，點擊 **Edit (編輯)**：
   - **URL (or IP)**：更新為新實例專用 0 流量保活端點：`https://<新網址>/ping`。  
     > 💡 **流量防禦升級**：`/ping` 端點直接回傳純文字 `OK`（僅 2 bytes）且免金鑰鑑權、不寫入訪問日誌，相較於監控 `/dashboard` (250KB) 每月節省 **99.999%** 流量，徹底杜絕 Render 5GB 免費額度被吃滿停機！
   - **Friendly Name**：同步更新為新實例名稱。
   - **Monitoring Interval**：設定為 **5 分鐘** 或 **10 分鐘**（足以防止 Render 15 分鐘無連線自動休眠）。
3. 儲存後立即觸發檢測，確認狀態自「503」轉為「200 OK（綠燈正常）」。

---

### 步驟 7：本機日誌與維運腳本同步
1. 開啟本機專案目錄下之 `sync_render_logs.py`。
2. 確認 `DEFAULT_SERVER_URL` 或本機環境變數 `RENDER_EXTERNAL_URL` 已更新為新網址：
   ```python
   DEFAULT_SERVER_URL = "https://<新網址>"
   ```
3. 雙擊執行 `一鍵同步線上Log與報表.bat`，確認本機能順暢拉取新雲端實例之日誌與報表。

---

## 🛡️ 三、常見除錯與自我修復快速指南

| 狀況 | 排查方向與解法 |
| :--- | :--- |
| **LINE Bot 車友發訊息完全沒反應** | **99% 為 LINE Developers Webhook URL 未更換**：新網址上線後，必須手動至 LINE Developers Console 填入 `https://<新網址>/callback` 並點擊 Verify。若顯示 404 或 503，檢查雲端服務是否已部署完成。 |
| **LINE Webhook Verify 報「Invalid HTTP status code: 403」** | 檢查 `LINE_CHANNEL_SECRET` 是否填錯。簽章計算不匹配會觸發 `InvalidSignatureError` 並回傳 403。 |
| **UptimeRobot 出現「503 服務不可用 (503 Service Unavailable)」** | **99% 為監控網址未同步更換**：Render 每建立一個新 Web 服務會給予全新子網域名。舊實例刪除或停止後，Cloudflare 反向代理層會對舊網址回傳 503。只需至 UptimeRobot 將監控 URL 改為新實例的 `/ping` 即刻解決。 |
| **新網址查詢停車位時回報「即時車位獲取中斷」** | 檢查新實例之 `TDX_CLIENT_ID` 與 `TDX_CLIENT_SECRET` 是否已設定至 Environment Variables。 |
| **新網址提示「500 Internal Server Error」** | 查看 Render 部署與執行日誌。常見原因為缺少必填環境變數、套件依賴遺漏或啟動命令誤設為多 Worker。 |
| **後台儀表板提示「請輸入存取金鑰」** | 請於網址後方帶上 `?key=<ADMIN_STATS_KEY>` 或於頁面輸入正確金鑰進行驗證解鎖。 |
