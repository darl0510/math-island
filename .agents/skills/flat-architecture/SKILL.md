---
name: flat-architecture
description: 專案平鋪模組化架構規範與子模組職責說明。當需要新增功能、重構模組、修改 app.py 或排查子模組邊界職責時使用此 Skill。
---

# 🏛️ 平鋪模組化架構開發手冊 (Flat Architecture Guide)

本專案自 v2.13.0 徹底重構，告別 8,215 行巨石單體（Monolith），確立嚴格的平鋪模組化架構。所有業務邏輯、視圖渲染、狀態存取與持久化操作必須徹底解耦。

---

## 🛡️ 四大紅線指標 (Hard Architectural Constraints)

任何功能開發、Bug 修復或重構，均不得違反以下 4 大紅線指標：

1. **`app.py` 保持純 Web 路由層 (行數嚴格 <= 850 行)**：
   - 僅保留 Flask 路由端點、LINE Webhook 入口與必要的中介層注入。
   - 嚴禁直接在 `app.py` 撰寫長篇業務邏輯、計算迴圈或資料過濾。
2. **零內嵌 HTML 視圖**：
   - 所有網頁視圖（報表、表單、成就卡、後台等）一律抽離至 `web_templates.py`。
   - `app.py` 嚴禁出現 `<!DOCTYPE html>` 或大型 HTML 字串。
3. **零 Flex Bubble 樣板**：
   - 所有 LINE 卡片樣板（Flex Bubble / Carousel）一律集中於 `flex_templates.py`。
   - `app.py` 嚴禁出現 `{"type": "bubble"}` 或相關字典結構。
4. **零 raw SQLite 資料庫操作**：
   - 所有 SQLite 游標、連線、DDL 與 DML 一律由 `db_service.py` 統一封裝。
   - `app.py` 嚴禁出現 `sqlite3.connect` 或 `CREATE TABLE`。

---

## 📂 核心子模組職責劃分速查表

| 子模組檔案 | 職責與角色邊界 | 核心函式 / 類別 |
| :--- | :--- | :--- |
| **`app.py`** | ⚡ **Web 路由與入口層** | Flask app, `/callback`, `/admin`, `/dashboard` 等端點 |
| **`bot_handlers.py`** | 🤖 **Webhook 事件分派與訊息發送** | `handle_text`, `handle_location`, `safe_reply_message`, `query_and_reply_worker` |
| **`bot_state.py`** | 🧠 **共用記憶體狀態中心 (SSOT)** | `USER_PINNED_LOCATION`, `USER_ZOOM_MODE`, `PARKING_REMINDERS` 及 Thread Locks |
| **`web_templates.py`** | 🎨 **Web 前端視圖與樣板渲染** | 成就卡、回報表單、審核面板、數據報表之 HTML/CSS/JS 生成 |
| **`flex_templates.py`** | 📱 **LINE Flex Message 卡片樣板庫** | `create_parking_guide_bubble`, `apply_bubble_zoom_mode`, `build_quick_reply` |
| **`geo_service.py`** | 🧭 **地理空間幾何與商圈解析** | `haversine`, `resolve_location_smart`, 自然語言地名過濾、街景解析 |
| **`city_opendata.py`** | 🏙️ **縣市 Open Data 與即時車位** | 雙北/桃/中/高即時在席快取、日本沖繩/北海道/京都特區靜態庫 |
| **`tdx_service.py`** | 🅿️ **交通部 TDX 地磁路段服務** | 全台路邊地磁車位查詢、60s L2 快取、OAuth2 Token 輪替 |
| **`reminder_service.py`**| ⏰ **停車計時排程與費用估算** | `schedule_parking_reminder`, `parse_parking_fee_estimator`, Single Worker 輪詢 |
| **`keyword_service.py`** | 🔍 **搜尋關鍵字安全日誌與演化** | `sanitize_keyword`, `log_search_keyword_async`, `add_keyword_synonym` |
| **`db_service.py`** | 💾 **SQLite WAL 持久化服務** | `parking_storage.db` 讀寫交易封裝、連線池與重試 |
| **`ad_service.py`** | 📈 **店家廣告閉環與線索管理** | 廣告輪播、`update_lead_status`、一鍵上架、曝光統計 |

---

## 🧪 自動化守護測試

在進行任何提交前，必須執行架構合規測試確保零破壞：

```bash
python -m unittest test_core.TestFlatArchitectureCompliance
```

該測試會自動檢查：
- `app.py` 行數未超過 850 行上限。
- `app.py` 不存在內嵌 HTML 標籤。
- `app.py` 不存在 Flex Bubble 字典結構。
- `app.py` 不存在直接調用 `sqlite3.connect`。
- 所有核心子模組完整存在且關鍵函式導出正常。
