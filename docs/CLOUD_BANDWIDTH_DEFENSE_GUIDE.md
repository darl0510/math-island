# 🛡️ 台灣停車與生活設施 LINE Bot 雲端免費層流量防禦手冊 (Cloud Bandwidth Defense Guide)

> **適用專案**：`tw-parking-linebot` (LINE 智慧生活設施與停車自駕系統)  
> **適用平台**：Render (5GB 出站免費額度), Koyeb (50GB 額度), Fly.io, Railway, VPS  
> **核心目標**：徹底消除 PaaS 出站流量 (Outbound Bandwidth) 異常暴增，杜絕因流量超額導致服務被強制停權或關閉，打造 **「近 0 伺服器流量」** 的健壯應用架構。

---

## 📌 為什麼 5GB 免費流量會被瞬間吃滿？（本專案根因盤點）

在 PaaS 雲端平台（如 Render.com 免費方案），伺服器傳送給客戶端（外部監控機器人、網頁瀏覽者、爬蟲）的所有資料均計入 **出站流量 (Outbound Bandwidth)**。
本專案為高實用性之 LINE 生活設施與停車機器人，常見的流量暴增「四大殺手」如下：

```
┌────────────────────────────────────────────────────────────────────────┐
│                        🚨 雲端流量四大殺手                             │
├────────────────────────────────┬───────────────────────────────────────┤
│ 1. 外部保活機器人盲目 Ping     │ UptimeRobot 監控 /dashboard (250KB)   │
│    (Keep-Alive Bot Over-Ping)  │ 每 5 分鐘 1 次 ➔ 每月白白吃掉 2.1GB！ │
│                                │ 若誤設 1 分鐘 ➔ 每月狂吃 10.8GB 爆表！│
├────────────────────────────────┼───────────────────────────────────────┤
│ 2. 巨型報表與數據無金鑰暴露   │ 完整營運報表 (/user_report) 內嵌歷史  │
│    (Exposed Heavy Analytics)   │ 審計日誌體積達 10MB+，爬蟲造訪直接耗盡│
├────────────────────────────────┼───────────────────────────────────────┤
│ 3. 車位照片未長效快取與壓縮   │ 車友現場回報照片 (/parking_photos/)   │
│    (Uncached Spot Photos)      │ 若無 Cache-Control，每次點擊重複下載  │
├────────────────────────────────┼───────────────────────────────────────┤
│ 4. 日誌無上限全量拉取         │ 本機或外部工具無分頁拉取全量歷史 Log，│
│    (Uncapped Log Pulling)      │ 每次幾十 MB 累加消耗頻寬。            │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 📊 流量消耗量化模型 (Bandwidth Math)

### 1. 外部保活監控 (UptimeRobot / Cron-Job) 流量對比

| 監控模式 | 每次響應體積 | 監控頻率 (5分鐘 1 次) | 每月請求次數 | 每月流量消耗 | 防禦成效 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **盲目監控儀表板 (`GET /dashboard`)** | ~250 KB (HTML+JS) | 288 次 / 天 | 8,640 次 | **~2,160 MB** (佔 5GB 額度 43%) | ❌ 嚴重浪費 |
| **盲目監控首頁 (`GET /`)** | ~60 bytes (純文字) | 288 次 / 天 | 8,640 次 | **~518 KB** (< 0.001 GB) | ⚠️ 普通 |
| **專用保活端點 (`GET/HEAD /ping`)** | **2 bytes** (`OK`) | 288 次 / 天 | 8,640 次 | **~17 KB** (< 0.0001 GB) | **✅ 節省 99.999%** |
| **高頻監控 (`GET/HEAD /ping` 1分鐘)**| **2 bytes** (`OK`) | 1,440 次 / 天 | 43,200 次 | **~86 KB** (< 0.0001 GB) | **✅ 極限防禦** |

### 2. LINE 機器人互動 vs 傳統 Web 流量對比

| 互動模式 | 運作機制 | Render 伺服器出站流量 | LINE 伺服器 / CDN 負擔 |
| :--- | :--- | :--- | :--- |
| **LINE Webhook (`POST /callback`)** | 伺服器接收 Webhook 後僅回傳 HTTP 200 `OK` | **< 10 bytes** (幾近為 0) | 由 LINE 平台處理並推送訊息 |
| **Flex 卡片訊息推送** | 伺服器透過 LINE API 發送 JSON 結構 | **0 MB (出站至 LINE API)** | 用戶端由 LINE App 解析渲染 |
| **圖標與素材 (CDN 託管)** | Flex 卡片圖標採用 LINE 官方 CDN 或高可用圖床 | **0 MB** | 100% 由外部 CDN 吸收 |
| **自駕導航與景點圖資** | 採用 Google Maps / Apple Maps 深度跳轉連結 | **0 MB (不架設本地地圖代理)**| 由 Google / Apple Maps 吸收 |

---

## 🛡️ 本專案五大無損流量防禦架構與實施方案

### 防禦一：極速輕量 2-byte 保活端點 (`/ping` ✕ `/health`)
**目標**：滿足 UptimeRobot、Cron-Job 與雲端容器探針保活需求，將每次心跳傳輸壓至 2 bytes。

- **規範原則**：
  1. `/ping` 嚴格回傳純文字 `OK`（`text/plain; charset=utf-8`），內容長度僅 2 位元組。
  2. 支援 `GET` 與 `HEAD` 方法。
  3. 免除任何身分驗證金鑰攔截（避免保活探針觸發 403 報警）。
  4. 絕對**不寫入**資料庫或訪客日誌（杜絕日誌檔案暴增）。
  5. 加上 `Cache-Control: no-cache, no-store, must-revalidate`。

#### Python (Flask) 於本專案 `app.py` 實作：
```python
@app.route("/ping", methods=['GET', 'HEAD'])
@app.route("/health", methods=['GET', 'HEAD'])
def health_check():
    """🛡️ 輕量級健康檢查端點 (供 Render / UptimeRobot 心跳監控，近 0 伺服器流量)"""
    if request.path == "/ping":
        resp = make_response("OK", 200)
        resp.mimetype = "text/plain; charset=utf-8"
        resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return resp
    return jsonify({"status": "ok", "service": "tw-parking-linebot", "timestamp": int(time.time())}), 200
```

---

### 防禦二：全方位營運報表「門閘鑑權 ✕ 爬蟲阻絕」
**目標**：防止巨型報表與診斷工作台遭未授權爬蟲或惡意掃描器讀取，避免 10MB+ 巨型 HTML 重複輸出吃乾頻寬。

- **防禦機制**：
  - `/dashboard`、`/dashboard.html`、`/user_report`、`/web_logs` 全面強制要求 `ADMIN_STATS_KEY` 鑑權。
  - 根目錄 `/` 在未攜帶合法金鑰時僅回傳純文字服務訊息（`"Parking, Toilet & 4.5+ Star Restaurant LINE Bot is running!"`），長度僅 60 bytes。
  - 封鎖未授權存取直接輸出 10MB+ 之 `user_analytics_report.html`。

---

### 防禦三：LINE 卡片與圖資「100% 外部 CDN 委派」零流量架構
**目標**：LINE 機器人所有視覺化訊息（Flex Message）與導航服務達成「0 伺服器流量消耗」。

- **架構設計**：
  1. **圖示託管**：Flex 卡片中使用的生活設施圖標、停車標籤、導航箭頭，一律使用外部穩定 CDN（如 `https://scdn.line-apps.com/` 或公用圖庫），嚴禁由 Render 伺服器本機提供靜態圖檔。
  2. **圖資導航**：車友搜尋停車場、加油站、超商廁所時，回傳之導航按鈕直接採用官方 URL Scheme：
     ```
     https://www.google.com/maps/dir/?api=1&destination={lat},{lon}
     ```
     完全無須在伺服器端中繼地圖圖磚（Map Tiles Proxy），徹底省去每位車友數十 MB 的地圖渲染流量。
  3. **Apple Calendar 鬧鐘同步**：`/calendar/reminder.ics` 僅輸出輕量文字（< 1KB），精準提醒且頻寬無感。

---

### 防禦四：車位照片 100% 直傳 Google Drive 零落盤 (廢除本機圖床)
**目標**：車位照片嚴禁在伺服器本機落盤或由伺服器提供中繼圖床（徹底廢除第二軌）。

- **零流量 / 零磁碟策略**：
  - 車友拍攝之車位柱號照片由記憶體串流直傳 Google Drive 專屬資料夾 (`tw-parking-linebot`)。
  - LINE Flex 卡片圖片直連 Google 官方全球 CDN (`https://lh3.googleusercontent.com/d/{file_id}`)，車友查看原圖或放大 100% 由 Google CDN 承載，伺服器出站流量與磁碟佔用雙重歸 0。
  - 若雲端 Google Drive 未配置或上傳失敗，依流量防禦鐵律堅決不落盤本機磁碟，杜絕伺服器硬碟爆滿與出站頻寬耗盡導致停權停機。

---

### 防禦五：雲端日誌與 Gist 雙向同步傳輸優化
**目標**：確保背景雲端同步與日誌拉取不產生突發大流量。

- **優化方案**：
  1. **日誌拉取分頁與限制**：`sync_render_logs.py` 與 `/api/live_logs` 採用 `limit` 參數（例如僅拉取最新 200~500 行），杜絕一次傳輸 20MB 全量日誌。
  2. **Gist 雲端截斷保護**：實裝 `_safe_load_gist_file()`，當檔案過大時自動透過 Raw URL 讀取，並對更新內容實施壓縮比對，無異動不重複推送到遠端。

### 防禦六：全站動態 Gzip 壓縮防禦 (88% 縮減)
**目標**：將所有大於 1KB 之 JSON/HTML/JS 內容動態壓縮，減少 80~90% 出站頻寬。
- **實作**：於 `app.py` 實裝 `@app.after_request` 攔截器，當客戶端支援 `Accept-Encoding: gzip` 且內容大於 1024 bytes 時自動啟用 level 6 gzip 壓縮。
- **成效**：Token 大數據 (156 KB ➔ 18.7 KB，省 88%)、歷史報表與日誌均獲得最高 90% 頻寬節省。

---

### 防禦七：Token 雲端同步 ETag 304 零流量防禦
**目標**：當前端輪詢或工具拉取 Token 狀態而數據未更新時，回傳 0 位元組。
- **實作**：`/api/token_sync` GET 請求計算當前 JSON 之 MD5 雜湊作為 ETag，若請求標頭 `If-None-Match` 與之相符，伺服器立即回傳 `HTTP 304 Not Modified`（0 Bytes Body）。
- **成效**：輪詢 10,000 次若無異動，頻寬消耗從 1.5 GB 驟降至接近 0 Bytes。

---

### 防禦八：前端看板「背景分頁暫停輪詢」防禦
**目標**：防止車友或管理者瀏覽器分頁常駐背景時無止盡輪詢消耗頻寬。
- **實作**：`cloud_dashboard.html` 整合 `document.visibilityState` 與 `visibilitychange` 事件。當分頁切換至後台或最小化時，立即暫停定時輪詢；切回前景時才以 ETag 執行 0 流量條件刷新。

---

### 防禦九：觀光署活動重啟防重複拉取 (消除啟動 15MB 消耗)
**目標**：消除每次伺服器部署重啟時重複向觀光署 API 下載 1,134 筆活動造成的 Service-Initiated 出站頻寬。
- **實作**：`event_sync_service.py` 檢查現存活動數量，若活動已存在（`cnt >= 50`）則重啟時跳過同步，嚴格留待每日凌晨 04:00 定時視窗更新。

---

### 防禦十：本地掃描推播 Hash 查核防禦
**目標**：`scan_tokens.py` 本機背景掃描在 Token 數據無任何變更時，嚴禁向 Render 發起 POST 請求。
- **實作**：加入 `_LAST_PUSH_HASH` 記憶體雜湊快取，無異動直接跳過，杜絕重複呼叫。

---

## 📋 專案雲端部署前流量安全檢查清單 (Pre-Deployment Checklist)

在將本專案部署至 Render / Koyeb 前，請依序檢查以下項目：

- [ ] **1. 保活端點驗證**：是否已配置 `/ping` 端點，且回傳 2-byte `OK`？
- [ ] **2. 監控配置確認**：UptimeRobot / Cron-job 監控 URL 是否指向 `https://<網址>/ping`，嚴禁指向 `/dashboard` 或 `/user_report`！
- [ ] **3. 監控頻率優化**：UptimeRobot 間隔設定為 5 或 10 分鐘（足夠防止 Render 15 分鐘休眠，無須濫用 1 分鐘）。
- [ ] **4. 門閘金鑰配置**：雲端環境變數是否已設置 `ADMIN_STATS_KEY`，確保 `/dashboard` 與報表不被公眾爬蟲掃蕩？
- [ ] **5. 圖示 CDN 化**：Flex 樣板中是否 100% 採用外部 CDN 圖示，無本地大圖中繼？
- [ ] **6. 地圖導航直連**：導航按鈕是否全部指向 Google Maps 原生跳轉連結？
- [ ] **7. 全站 Gzip 壓縮**：`app.py` 是否已掛載動態 gzip 壓縮中介軟體？
- [ ] **8. ETag 304 快取**：`/api/token_sync` 是否已實裝 ETag 條件快取？
- [ ] **9. 看板背景停輪**：`cloud_dashboard.html` 是否支援分頁隱藏暫停輪詢？
- [ ] **10. 活動重啟略過**：`event_sync_service.py` 是否已在已有資料時略過重啟下載？

遵循以上架構，即便在 5GB 嚴格出站頻寬限制的 Render 免費環境中，本專案也能輕鬆承載每日數萬次車友查詢，永無超額停權之憂！
