# 🤖 Antigravity AI 常駐開發規則 (Project Automation Rules)

## ⚡ 極致節省 Token 規範 (Extreme Token-Saving Protocol)

> 本段落由 `scripts/sync_all_projects_rules.py` 自動管理。手動修改將於下次同步時被覆蓋。

### 🛡️ 本地離線無縫降級防呆機制 (Offline Fail-Safe & Auto-Fallback)

**觸發條件：**
- `localhost:8080` 本地大腦未啟動 / 離線 / 超時 (>5s)

**自動降級行為：**
1. 雲端 Agent 切換為 **Cloud-First Collaboration** 模式。
2. **15 行極限代碼禁寫令暫時解除** → 雲端直接輸出完整代碼。
3. 輸出開頭標記：`⚠️ [OFFLINE FALLBACK]`
4. 嚴禁中斷開發、嚴禁要求使用者手動介入。
5. 代碼仍遵循 Herdr 管線 + Hermes 協議結構。

**自動恢復：**
- 本地大腦 health-check 連續 3 次成功 (<200ms) → 恢復本地優先 + 禁寫令生效。
- 恢復標記：`✅ [ONLINE RESTORED]`

### 🚫 15 行極限代碼禁寫令

- 本地在線：雲端僅輸出 ≤15 行契約摘要 / 簽名 / patch 指令。
- 本地離線：禁令暫停，雲端直接輸出完整代碼。

### 🧠 實體外包派工與記帳本防空報鐵律

- **嚴禁雲端手寫偷步**：本地在線時，代碼生成與重構必須顯式調用 `brain_delegator.py` 實體外包給 8080，嚴禁雲端手寫偷步。
- **中控動態跑動驗證**：外包必須實際寫入 `local_tokens_ledger.json`，左側中控儀表板必須即時可見流水動畫與數據跳動。
- **嚴禁報告虛報 Token**：交付報告中本地 Token 產出必須 100% 取自 `local_tokens_ledger.json` 當次增量，杜絕空口虛報！

### 📜 契約式派工 (Contract-First)

- 每次操作必須附帶完整 JSON 契約（contract_id, task_type, target_files, acceptance_criteria, token_budget, fallback_mode, herdr_pipeline_stage, hermes_protocol_version）。
- 離線時雲端自動生成簡化契約，標記 `"fallback_mode": "cloud_direct"`。

### 🔧 Herdr 管線 (Plan → Execute → Validate → Deploy)

- 四階段不可跳過、不可亂序。
- 離線降級僅改變代碼產出來源，不影響管線結構。

### 🤝 Hermes 協議 v2.1

- 通訊格式遵循 Hermes 協議。
- 大腦在線探測標準：一律使用 Python 請求 `http://127.0.0.1:8080/v1/models`（嚴禁使用 PowerShell `Invoke-WebRequest -TimeoutSec 2`，因 Windows 雙棧解析延遲極易引發超時假警報）。
- 離線判定：連續 2 次連線失敗（Connection Refused / 端口未開）→ OFFLINE → 降級。
- 恢復：連續 3 次成功 → ONLINE → 解除降級。

### 📌 PROJECT_HANDOVER.md 看板極簡維護鐵律

- **未完成任務優先置頂**：焦點看板 (Active Focus) 必須將未執行的待辦任務 (`[ ]`) 置頂於最上方，確保接手者與 AI 第一眼秒見目標。
- **歷史已完成任務強制收折**：歷史已完成項目 (`[x]`) 必須收折於 `<details><summary>過往已完成歷史任務</summary>...</details>` 內，杜絕雜訊灌爆 Context Window。
- **最新資訊保鮮**：常態僅保留最新 3 版更新日誌，超過 280 行時自動封存至 `docs/CHANGELOG_ARCHIVE.md`。

### 🛡️ 外包苦力狀態翻轉與未通過透明說明鐵律

- **監工修復狀態即時回寫**：若本地 8080 苦力在初始生成階段未通過自動驗證（例如因多餘 Markdown 標籤或尾端截斷報錯），而後由雲端監工介入修復編譯成功，雲端監工**必須在交付前執行 `python scripts/brain_delegator.py --mark-passed "<修復說明>"` 將狀態即時翻轉為通過**，杜絕側邊欄殘留刺眼的「❌ 最近外包未通過」假警報。
- **成果報告透明揭露說明**：每次成果報告中若存在苦力未通過後經監工修復之情況，**必須主動向使用者做出透明技術說明**（定位報錯根因、監工介入動作與二次驗收結果），確保開發歷程完全可溯、清晰透明。

### 📋 執行檢查清單

- [ ] 本地大腦狀態已確認？
- [ ] 契約完整？
- [ ] 管線階段正確？
- [ ] 協議版本正確？
- [ ] 開發流程未中斷？
- [ ] PROJECT_HANDOVER.md 待辦置頂且歷史已收折？
- [ ] PROJECT_HANDOVER.md 頂部 Prompt 遵循規則前置 (Rule-First Guard)？
- [ ] 苦力生成若曾報錯，監工修復後已執行 --mark-passed 翻轉綠燈？
- [ ] 成果報告已對苦力修復原因做出透明說明？
- [ ] 本次 Token 產出已真實寫入 local_tokens_ledger.json（左側中控可見跳動）？

---
*自動同步：2026-10-31 10:04:05 | 腳本：scripts/sync_all_projects_rules.py*
## 📌 版本管理與交接鐵律
1. **版號與看板推進**：每次迭代完成必須更新 [`PROJECT_HANDOVER.md`](PROJECT_HANDOVER.md) 版號、頂部待辦看板 (`[x]`) 與更新記錄；常態保留最新 3 版（或超過 280 行時調用 `auto_backup.check_and_trim_handover(max_lines=280, keep_recent=3)` 自動封存至 `docs/CHANGELOG_ARCHIVE.md`）。
2. **介面版號同步**：前端介面（`index.html` 之 `#brand-version-badge`）版號必須與 `PROJECT_HANDOVER.md` 保持 100% 同步。
3. **最佳 Token 換手協議**：完成里程碑時主動附上換手提示與下一輪專用的一鍵啟動 Prompt（**規格鐵律：Prompt 開頭必須前綴當前版號，如 `【vX.Y.Z】你好！...`**，確保在 Token 儀表板歷史對話清單中一眼秒辨各版本消耗，不被預設問候語遮蔽）。

## 🛡️ 奇幻數學島架構規範
1. **純原生 Vanilla 架構**：無打包工具、無外部依賴框架，維持純 HTML5/CSS3/ES6 模組結構，即開即玩。
2. **全年級模組化擴充**：題庫資料與關卡邏輯採鬆耦合設計，新增年級時依循 `data/question-bank-template.json` 與 `js/grades.js` 擴展，切勿寫死硬編碼。
3. **雙軌語音與教具相容性**：靜態音檔不存在時自動平滑降級至 `Web Speech API (zh-TW)`；視覺教具（`js/visuals.js`）必須兼顧不同螢幕寬度與觸控體驗。

## 💾 改版必備份
完成功能迭代必須調用 `auto_backup.smart_backup(version_str, modified_files=[...])`，建立安全還原節點。

> 💡 深度模組劃分與備份規格請參閱工作區技能：`flat-architecture` 與 `backup-system`。

## 🛠️ Windows BAT Craftsman Protocol (Windows 批次檔工藝守則)

今後凡在專案中新增、生成或修改任何 Windows `.bat` 批次檔時，必須 100% 嚴格依循 `windows-bat-craftsman` Skill 規範：
1. **強制 CRLF (`\r\n`) 二進位換行（嚴防 write_file 裸 LF 污染）**：寫入磁碟時一律強制以 `\r\n` (CRLF) 二進位輸出（Python 必須使用 `wb` 模式），嚴禁裸 `\n` (LF)。通用工具 `write_file` 預設寫入的裸 LF 會使 Windows `cmd.exe` 在解析中文字元與註解時發生嚴重的 Byte Seek 位元組指標錯位，導致指令被跳過、命令片段報錯或 0.1 秒閃退！
2. **禁絕標籤級 `::` 與內部未閉合引號**：批次檔內所有註解一律只能使用官方標準 `REM `，嚴格禁止在代碼塊、括號或 UTF-8 環境下使用 `::` 偽標籤；`REM ` 內部嚴禁包含奇數個未閉合雙引號。
3. **編碼與標題防爆**：頂部必須為 `@echo off` 與 `chcp 65001 >nul 2>nul`。
4. **絕對路徑 `%~dp0` 引用**：第一步一律 `cd /d "%~dp0"` 鎖定工作目錄，禁止依賴易污染的 `cd` 相對路徑，所有外部呼叫與檔案參數一律以 `"%~dp0..."` 展開並包覆雙引號。
5. **多軌實體瀏覽器秒開防線（嚴禁 --app="file:///"）**：啟動 Web/HTML 看板時，嚴格遵循雙軌制：
   - **本地靜態 HTML 檔案**：嚴格禁止直接傳遞 `--app="file:///"`（現代 Chromium 安全沙盒會直接卡死在 `about:blank` 全白頁面），且不賭純 `start "" "%HTML_FILE%"` 脆弱的系統副檔名關聯，改採「Chrome 實體路徑 ➔ Edge 實體路徑 ➔ 系統預設關聯平滑降級」多軌探測秒開！
   - **具備本機 HTTP 伺服器之 Web 看板 (如 Port 8316, 8765)**：才允許使用 `--app="http://127.0.0.1:..."` 獨立應用視窗模式拉起。
6. **重定向防護**：等待延遲必須為 `timeout /t 2 >nul 2>nul` 或 `ping 127.0.0.1 -n 2 >nul 2>nul`，杜絕輸入流重定向報錯。
7. **桌面專屬圖標與捷徑自律自愈**：為核心工具配備 256x256 多解析度 `.ico` 圖標，並在批次檔中內嵌桌面捷徑遺失時的自愈重建邏輯。
8. **禁絕單行 PowerShell 管道 `|` 逃逸**：嚴禁在批次檔中塞入未轉義之 `powershell -Command "... | ..."`，避免 CMD 提前閉合引號將管道符號截斷誤判為系統命令；進程與端口判定一律優先使用 `netstat -ano`、服務內建 `status` 或純原生 CMD 指令。
9. **實體視窗雙階啟動保證 (Two-Stage Surface Guarantee)**：服務啟動類批次檔嚴禁只拉起無介面背景進程，必須落實「背景端口監聽 (`LISTENING`)」+「前台實體視窗 (`start "" ...`) 真正拉起（除錯瀏覽器、Discord 或 Web 控制台）」之雙重驗收，杜絕使用者二次提醒開啟前台介面。
10. **機械化自律驗收**：凡新增或修改任何 `.bat` 批次檔後，**必須立即執行 `python scripts/verify_bat_craftsman.py <bat路徑>`** 進行語法與編碼自檢自愈，確保 Exit Code 0，杜絕任何隨機性錯誤。



今後凡在專案中新增、生成或修改任何 Windows `.bat` 批次檔時，必須 100% 嚴格依循 `windows-bat-craftsman` Skill 規範：
1. **強制 CRLF (`\r\n`) 二進位換行（嚴防 write_file 裸 LF 污染）**：寫入磁碟時一律強制以 `\r\n` (CRLF) 二進位輸出（Python 必須使用 `wb` 模式），嚴禁裸 `\n` (LF)。通用工具 `write_file` 預設寫入的裸 LF 會使 Windows `cmd.exe` 在解析中文字元與註解時發生嚴重的 Byte Seek 位元組指標錯位，導致指令被跳過、命令片段報錯或 0.1 秒閃退！
2. **禁絕標籤級 `::` 與內部未閉合引號**：批次檔內所有註解一律只能使用官方標準 `REM `，嚴格禁止在代碼塊、括號或 UTF-8 環境下使用 `::` 偽標籤；`REM ` 內部嚴禁包含奇數個未閉合雙引號。
3. **編碼與標題防爆**：頂部必須為 `@echo off` 與 `chcp 65001 >nul 2>nul`。
4. **絕對路徑 `%~dp0` 引用**：第一步一律 `cd /d "%~dp0"` 鎖定工作目錄，禁止依賴易污染的 `cd` 相對路徑，所有外部呼叫與檔案參數一律以 `"%~dp0..."` 展開並包覆雙引號。
5. **多軌實體瀏覽器秒開防線（嚴禁 --app="file:///"）**：啟動 Web/HTML 看板時，嚴格遵循雙軌制：
   - **本地靜態 HTML 檔案**：嚴格禁止直接傳遞 `--app="file:///"`（現代 Chromium 安全沙盒會直接卡死在 `about:blank` 全白頁面），且不賭純 `start "" "%HTML_FILE%"` 脆弱的系統副檔名關聯，改採「Chrome 實體路徑 ➔ Edge 實體路徑 ➔ 系統預設關聯平滑降級」多軌探測秒開！
   - **具備本機 HTTP 伺服器之 Web 看板 (如 Port 8316, 8765)**：才允許使用 `--app="http://127.0.0.1:..."` 獨立應用視窗模式拉起。
6. **重定向防護**：等待延遲必須為 `timeout /t 2 >nul 2>nul` 或 `ping 127.0.0.1 -n 2 >nul 2>nul`，杜絕輸入流重定向報錯。
7. **桌面專屬圖標與捷徑自律自愈**：為核心工具配備 256x256 多解析度 `.ico` 圖標，並在批次檔中內嵌桌面捷徑遺失時的自愈重建邏輯。
8. **禁絕單行 PowerShell 管道 `|` 逃逸**：嚴禁在批次檔中塞入未轉義之 `powershell -Command "... | ..."`，避免 CMD 提前閉合引號將管道符號截斷誤判為系統命令；進程與端口判定一律優先使用 `netstat -ano`、服務內建 `status` 或純原生 CMD 指令。
9. **實體視窗雙階啟動保證 (Two-Stage Surface Guarantee)**：服務啟動類批次檔嚴禁只拉起無介面背景進程，必須落實「背景端口監聽 (`LISTENING`)」+「前台實體視窗 (`start "" ...`) 真正拉起（除錯瀏覽器、Discord 或 Web 控制台）」之雙重驗收，杜絕使用者二次提醒開啟前台介面。
10. **機械化自律驗收**：凡新增或修改任何 `.bat` 批次檔後，**必須立即執行 `python scripts/verify_bat_craftsman.py <bat路徑>`** 進行語法與編碼自檢自愈，確保 Exit Code 0，杜絕任何隨機性錯誤。



今後凡在專案中新增、生成或修改任何 Windows `.bat` 批次檔時，必須 100% 嚴格依循 `windows-bat-craftsman` Skill 規範：
1. **強制 CRLF (`\r\n`) 二進位換行（嚴防 write_file 裸 LF 污染）**：寫入磁碟時一律強制以 `\r\n` (CRLF) 二進位輸出（Python 必須使用 `wb` 模式），嚴禁裸 `\n` (LF)。通用工具 `write_file` 預設寫入的裸 LF 會使 Windows `cmd.exe` 在解析中文字元與註解時發生嚴重的 Byte Seek 位元組指標錯位，導致指令被跳過、命令片段報錯或 0.1 秒閃退！
2. **禁絕標籤級 `::` 與內部未閉合引號**：批次檔內所有註解一律只能使用官方標準 `REM `，嚴格禁止在代碼塊、括號或 UTF-8 環境下使用 `::` 偽標籤；`REM ` 內部嚴禁包含奇數個未閉合雙引號。
3. **編碼與標題防爆**：頂部必須為 `@echo off` 與 `chcp 65001 >nul 2>nul`。
4. **絕對路徑 `%~dp0` 引用**：第一步一律 `cd /d "%~dp0"` 鎖定工作目錄，禁止依賴易污染的 `cd` 相對路徑，所有外部呼叫與檔案參數一律以 `"%~dp0..."` 展開並包覆雙引號。
5. **多軌實體瀏覽器秒開防線（嚴禁 --app="file:///"）**：啟動 Web/HTML 看板時，嚴格遵循雙軌制：
   - **本地靜態 HTML 檔案**：嚴格禁止直接傳遞 `--app="file:///"`（現代 Chromium 安全沙盒會直接卡死在 `about:blank` 全白頁面），且不賭純 `start "" "%HTML_FILE%"` 脆弱的系統副檔名關聯，改採「Chrome 實體路徑 ➔ Edge 實體路徑 ➔ 系統預設關聯平滑降級」多軌探測秒開！
   - **具備本機 HTTP 伺服器之 Web 看板 (如 Port 8316, 8765)**：才允許使用 `--app="http://127.0.0.1:..."` 獨立應用視窗模式拉起。
6. **重定向防護**：等待延遲必須為 `timeout /t 2 >nul 2>nul` 或 `ping 127.0.0.1 -n 2 >nul 2>nul`，杜絕輸入流重定向報錯。
7. **桌面專屬圖標與捷徑自律自愈**：為核心工具配備 256x256 多解析度 `.ico` 圖標，並在批次檔中內嵌桌面捷徑遺失時的自愈重建邏輯。
8. **機械化自律驗收**：凡新增或修改任何 `.bat` 批次檔後，**必須立即執行 `python scripts/verify_bat_craftsman.py <bat路徑>`** 進行語法與編碼自檢自愈，確保 Exit Code 0，杜絕任何隨機性錯誤。
