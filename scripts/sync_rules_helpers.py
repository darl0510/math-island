#!/usr/bin/env python3
"""
scripts/sync_rules_helpers.py
極致 Token 節省規範、五大紅線模板與 Prompt / 派工命令輔助子模組。
由 scripts/sync_all_projects_rules.py 拆分平鋪解耦。
"""

import re
from pathlib import Path
from typing import List, Optional

# ─────────────────────────────────────────────
# 極致省 Token 4 刀流 (Four-Blade Token-Saving Protocol)
# ─────────────────────────────────────────────
FOUR_BLADE_RULES = """### 🔪 極致省 Token 4 刀流 (Four-Blade Token-Saving Protocol)

**刀 1｜苦力自檢、監工 0 重複編譯與讀檔**
- 本地苦力交付前必須「自我驗證」：自行編譯、自行 AST / 語法檢查、自行跑測試，並在回報中附上自檢結果。
- 雲端監工嚴禁二次讀取整份檔案、嚴禁重複編譯、嚴禁重複搜尋同一檔案；只看 Diff 與苦力自檢回報。
- 同一檔案在同一輪迭代中，雲端讀取上限 = 1 次。

**刀 2｜微創精準驗收、限 15 行、拒寫論文**
- 驗收回報上限 **15 行**：只寫「改了哪個檔案的哪個函式、自檢結果、下一步」。
- 嚴禁撰寫長篇說明、背景分析、程式碼逐行解讀（拒寫論文）。
- 需要長說明時一律寫入 `docs/`，對話中僅留一行檔案路徑。

**刀 3｜Prompt 極簡交接、免重複 5 大紅線**
- 換手 Prompt 僅允許 3 行：版號前綴 + 純粹問候 + 本輪待辦一句話；嚴禁寫入「請先閱讀 PROJECT_HANDOVER.md 與 AGENTS.md」等誘發雲端讀檔的導讀句。
- 5 大紅線已由本腳本自動注入 AGENTS.md，嚴禁在 Prompt 內重複貼上（重複即浪費 Token）。
- PROJECT_HANDOVER.md 的 Prompt 區塊預設為極簡版，紅線改由 `AGENTS.md` 單一指標行取代。

**刀 4｜過渡派工、一句話即停**
- 派工契約精簡為「一句話」：目標 + 目標檔案 + 驗收標準，嚴禁展開範例程式碼與多段說明。
- 派工送出後立即停止輸出，等待本地回傳；嚴禁同一輪內重複補充、追問或自我覆寫。
- 回傳未通過時，監工只補一句修正指令，不重寫整份契約。"""

# ─────────────────────────────────────────────
# Windows BAT Craftsman Protocol 規範模板
# ─────────────────────────────────────────────
WINDOWS_BAT_CRAFTSMAN_RULES = """## 🛠️ Windows BAT Craftsman Protocol (Windows 批次檔工藝守則)

今後凡在專案中新增、生成或修改任何 Windows `.bat` 批次檔時，必須 100% 嚴格依循 `windows-bat-craftsman` Skill 規範：
1. **強制 CRLF (`\\r\\n`) 二進位換行（嚴防 write_file 裸 LF 污染）**：寫入磁碟時一律強制以 `\\r\\n` (CRLF) 二進位輸出（Python 必須使用 `wb` 模式），嚴禁裸 `\\n` (LF)。通用工具 `write_file` 預設寫入的裸 LF 會使 Windows `cmd.exe` 在解析中文字元與註解時發生嚴重的 Byte Seek 位元組指標錯位，導致指令被跳過、命令片段報錯或 0.1 秒閃退！
2. **禁絕標籤級 `::` 與內部未閉合引號**：批次檔內所有註解一律只能使用官方標準 `REM `，嚴格禁止在代碼塊、括號或 UTF-8 環境下使用 `::` 偽標籤；`REM ` 內部嚴禁包含奇數個未閉合雙引號。
3. **編碼與標題防爆**：頂部必須為 `@echo off` 與 `chcp 65001 >nul 2>nul`。
4. **絕對路徑 `%~dp0` 引用**：第一步一律 `cd /d "%~dp0"` 鎖定工作目錄，禁止依賴易污染的 `cd` 相對路徑，所有外部呼叫與檔案參數一律以 `"%~dp0..."` 展開並包覆雙引號。
5. **多軌實體瀏覽器秒開防線（嚴禁 --app="file:///"）**：啟動 Web/HTML 看板時，嚴格遵循雙軌制：
   - **本地靜態 HTML 檔案**：嚴格禁止直接傳遞 `--app="file:///"`（現代 Chromium 安全沙盒會直接卡死在 `about:blank` 全白頁面），且不賭純 `start "" "%HTML_FILE%"` 脆弱的系統副檔名關聯，改採「Chrome 實體路徑 ➔ Edge 實體路徑 ➔ 系統預設關聯平滑降級」多軌探測秒開！
   - **具備本機 HTTP 伺服器之 Web 看板 (如 Port 8316, 8765)**：才允許使用 `--app="http://127.0.0.1:..."` 獨立應用視窗模式拉起。
6. **重定向防護**：等待延遲必須為 `timeout /t 2 >nul 2>nul` 或 `ping 127.0.0.1 -n 2 >nul 2>nul`，杜絕輸入流重定向報錯。
7. **桌面專屬圖標與捷徑自律自愈**：為核心工具配備 256x256 多解析度 `.ico` 圖標，並在批次檔中內嵌桌面捷徑遺失時的自愈重建邏輯。
8. **禁絕單行 PowerShell 管道 `|` 逃逸**：嚴禁在批次檔中塞入未轉義之 `powershell -Command "... | ..."`，避免 CMD 提前閉合引號將管道符號截斷誤判為系統命令；進程與端口判定一律優先使用 `netstat -ano`、服務內建 `status` 或純原生 CMD 指令。
9. **實體視窗雙階啟動保證 (Two-Stage Surface Guarantee)**：服務啟動類批次檔嚴禁只拉起無介面背景進程，必須落實「背景端口監聽 (`LISTENING`)」+「前台實體視窗 (`start \"\" ...`) 真正拉起（除錯瀏覽器、Discord 或 Web 控制台）」之雙重驗收，杜絕使用者二次提醒開啟前台介面。
10. **機械化自律驗收**：凡新增或修改任何 `.bat` 批次檔後，**必須立即執行 `python scripts/verify_bat_craftsman.py <bat路徑>`** 進行語法與編碼自檢自愈，確保 Exit Code 0，杜絕任何隨機性錯誤。"""

# ─────────────────────────────────────────────
# 極致 Token 節省規範模板
# ─────────────────────────────────────────────
EXTREME_TOKEN_SAVING_RULES = """## ⚡ 極致節省 Token 規範 (Extreme Token-Saving Protocol)

> 本節由 `scripts/sync_all_projects_rules.py` 自動注入，請勿手動修改。
> 最後同步：{timestamp}

{four_blade_rules}

### 🛡️ 本地離線降級與使用者指定雲端執行模式 (Cloud-First & User-Directed Override)

- **使用者指示雲端優先**：當使用者在指令中明確指示由雲端執行（如「直接用雲端寫」、「消耗雲端額度」等），自動解除「15 行禁令」與強制外包鐵律，雲端可直接生成完整代碼並正常推進版本與看板。此操作完全合規，後續版本推進或規則同步絕不會覆蓋或變更既有規則。
- **本地離線自動降級**：探測 `http://127.0.0.1:8080/v1/models`，超時 > 5 秒自動降級為 **Cloud-First** 模式，降級時解除「15 行禁令」，雲端可直接產出完整代碼。
- **單行派工命令自動接手協議 (Auto Cloud-First Handover)**：當執行單行派工命令 `python scripts/brain_delegator.py ...` 時，若本地 8080 大腦與 CDP 均離線，腳本將自動輸出 `⚡ [雙軌離線 -> 自動觸發 Cloud-First 合規降級接手]`。雲端 Agent 視為收到最高合法接手授權，**立即解除「15 行代碼禁寫令」與「嚴禁讀檔寫碼禁令」**，直接讀取契約指定之目標檔案實作、執行單元測試自我驗證，並依序執行驗收與改版，嚴禁中斷或等待使用者重開本地端。
- 連續 3 次探測成功後自動恢復本地優先模式。
- 探測一律使用 Python `requests.get(..., timeout=5)`，嚴禁 PowerShell 2 秒超時指令誤判。

### 🚫 15 行極限代碼禁寫令

- 本地大腦在線時，雲端嚴禁擅自手寫超過 **15 行**的完整功能模組（使用者明確指示由雲端執行者除外）。
- 超過 15 行的任務預設必須外包給本地端 AI 苦力執行。
- 嚴禁雲端自行反覆大量讀取 / 搜尋代碼。

### 🚫 零盲目摸索派工令 (Zero-Exploration Dispatch Fallback)

- Prompt 缺明確指令時，**Step 1 必須直接預設派工**：立即原樣執行 Prompt 末行既有的 `python scripts/brain_delegator.py ...` 指令，嚴禁先「確認環境」。
- 嚴禁一切摸索動作：`list_dir` / `ls` / `--help` / `-h` / `view_file` / 全域搜尋 / 預讀 `AGENTS.md` 與 `PROJECT_HANDOVER.md` / 先讀架構檔或舊 Prompt。
- 唯一允許的讀檔時機：派工指令已啟動之後，由苦力依契約自行讀取「契約指定的目標檔案」。
- 連指令行都不存在時：僅允許以看板置頂第一筆未完成待辦合成 `【⚡ 單行派工命令】` 兩行式指令並立即執行，嚴禁改用探索方式取得任務。
- 工作區路徑鐵律：派工指令一律使用相對路徑 `-w .`（如 `python scripts/brain_delegator.py -w . -t "..."`），嚴禁填入絕對路徑；收到命令立即原樣執行，嚴禁因路徑格式或工作區字串核對而猶豫。
- 脫離契約改動非契約指定檔案一律視為無效交付：監工直接還原該檔案、翻轉 ledger 狀態並改派最小 Diff 錨點。

### 👑 雲端監工與本地實作鐵律 (Supervisor & Dispatcher Only Protocol)

- 雲端 Agent 預設僅負責 **監工 (Supervise)** 及 **派工 (Dispatch)**（使用者明確指示雲端執行除外）。
- 出具精煉契約 (Contract) → 本地自主執行 → 雲端只看 Diff 驗收。
- 嚴禁雲端擅自直接寫入源碼檔案（除非符合離線降級或使用者指定雲端模式）。

### 🚫 嚴禁監工代勞陷阱鐵律 (No Supervisor-as-Worker Trap)

- 苦力未盡事項（未寫完的函式、未跑的測試、未修的報錯）**嚴禁監工下場代寫**：一律改派原子契約或補「最小 Diff 錨點」，嚴禁監工自己把活幹完。
- 嚴禁監工自行撰寫測試腳本補跑：測試屬苦力自檢範圍，缺測試即退回原契約，不補寫、不代跑。
- 嚴禁監工直接改源碼：任何對 `.ts` / `.js` / `.py` 等源碼檔案的寫入動作，必須經由 `scripts/brain_delegator.py` 派工完成（使用者明確指定雲端直接執行除外）。
- 嚴禁監工手動篡改或算帳記帳本：嚴禁執行 `python -c "import json... open('local_tokens_ledger.json'..."` 等手寫指令或腳本查閱修改記帳本；表格數據一律直接採用派工終端輸出之 `✔ [本地外包成功] 產出 XXXX Tokens`；狀態翻轉僅限執行 `python scripts/brain_delegator.py --mark-passed "<說明>"`，嚴禁手寫腳本讀寫。
- 驗收步驟嚴格限制 **3 步以內**，固定順序：
  1. `git diff --stat`
  2. `git status`
  3. `python scripts/bump_version.py <版號>` 並產出交付報告（含 Token 量化表格）
- 第 3 步 `bump_version.py` 完成後**絕對禁止發送第 4 個命令**，立即出具報告；嚴禁出錯時連鎖發動解壓縮備份或反覆探索修復；超過 3 個檢查指令視同重大違規：立即停止驗收，直接改派下一輪原子契約。
- 嚴禁額外執行指令重複讀取 `PROJECT_HANDOVER.md` (如 Get-Content / Select-String / git diff 手動核對) 或以 `Test-Path` 提前摸索下一階段檔案。

### 🧠 實體外包派工與記帳本防空報鐵律

- 所有代碼生成 / 重構 / 測試任務，必須調用：
  - `scripts/brain_delegator.py`（本地大腦 8080 原生自主外包，統一支援 -w . -t ...）
- 每次派工必須真實寫入 `local_tokens_ledger.json`。
- 嚴禁虛報完成、嚴禁跳過記帳。

### 🧾 一鍵改版鐵律 (One-Shot Version Bump Protocol)

- 嚴禁監工手動 `view_file` / `edit_file` 反覆改版號：改版一律執行 `python scripts/bump_version.py <版號>`，一次同步 `package.json`、`PROJECT_HANDOVER.md`、`index.html` 版號標籤、`sw.js` 快取名，並自動呼叫 `smart_backup` 建立還原節點。
- 改版後嚴禁二次讀取 `package.json` 與 `PROJECT_HANDOVER.md` 確認版號：只看 `bump_version.py` 輸出的 `[OK]/[SKIP]/[FAIL]` 單行結果。
- 單一對話僅限 **單次原子派工**：一個對話只交付 1 個原子契約，嚴禁在同一對話疊加第二輪派工或順手做第二個任務，杜絕 Context 疊加與 128k 膨脹。

### 📜 契約式派工 (Contract-First)

- 每次派工前必須出具明確契約：目標、輸入、輸出、驗收標準。
- 契約格式：`{ "task_id", "objective", "input_files", "expected_output", "acceptance_criteria" }`

### 🧩 原子化派工與 128k 視窗防爆鐵律 (Atomic Delegation Protocol)

- 高難度任務（數論、密碼學、多步驟演算、跨檔重構）**嚴禁整包派工**：一律先拆解為可獨立驗證的「原子子任務」，每次派工只交付 1 個原子子任務。
- 原子契約上限：單一目標 ≤ 1 個函式 / ≤ 1 個檔案區塊；嚴禁在 Prompt 內貼上整份檔案、長歷史或前輪完整輸出。
- 數論 / 密碼學任務（大素數、模逆元、RSA/ECC、哈希碰撞）強制三原子拆解：**公式定義 → 單步實作 → 獨立測試**，嚴禁單輪要求一次產出整套演算法。
- 本地大腦 `n_ctx = 131072 (128k)`：**嚴禁同一任務無限重試塞爆上下文**；重試一律重置 session，嚴禁把錯誤全文與舊輸出回灌同一對話。
- 收斂上限 **3 輪**：連續 3 輪未通過驗證即停止重試，改由監工介入提供「最小 Diff 錨點」(目標檔案 + 目標函式 + 期望 Diff 片段)，監工只補錨點、不重寫整份契約。
- 派工前防爆自查：輸入檔案 + 殘留歷史 ≤ 60% n_ctx；逼近上限時改為分段派工 (先骨架、再填充)。
- 8080 拋出 `400` (context length exceeded / max_tokens 超限) 時：立即縮小輸入、剔除歷史、改分段派工，嚴禁原 Prompt 原封不動重送。

### 🔧 Herdr 管線 (Plan → Execute → Validate → Deploy)

1. **Plan**：拆解任務為原子步驟。
2. **Execute**：外包給本地端執行（使用者指定雲端直接執行除外）。
3. **Validate**：Diff 審查 + 測試通過。
4. **Deploy**：更新版號、推進看板。

### 🤝 Hermes 協議 v2.1

- Python 探測：`requests.get("http://127.0.0.1:8080/v1/models", timeout=5)`
- 在線 → 本地優先；離線 → Cloud-First 降級。
- 探測結果寫入 `local_tokens_ledger.json` 的 `hermes_status` 欄位。

### 📌 PROJECT_HANDOVER.md 看板極簡維護鐵律

- 未完成待辦 `[ ]` **強制置頂**於最上方。
- 歷史已完成 `[x]` **強制收折**於 `<details>` 摺疊區塊。
- 常態保鮮最新 **3 版**，超過 3 版歸檔至 `archive/`。

### 🛡️ 外包苦力狀態翻轉與未通過透明說明鐵律

- 若本地生成曾報錯，經修復通過後，必須執行：
  `python scripts/brain_delegator.py --mark-passed "<說明>"`
- 翻轉綠燈，杜絕殘留未通過警報。
- 未通過任務必須透明說明失敗原因與修復進度。

### 📋 執行檢查清單

- [ ] 本地大腦在線？(8080 探測)
- [ ] 是否為使用者指示之雲端直寫模式？(若是則允許雲端直接生成，否則超過 15 行強制外包)
- [ ] 任務是否超過 15 行？→ 外包
- [ ] 是否已寫入 ledger？
- [ ] 是否已更新 PROJECT_HANDOVER.md？
- [ ] 是否已更新 package.json 版號？(一律 `python scripts/bump_version.py <版號>`，嚴禁手動 edit)
- [ ] 本對話是否僅執行單次原子派工？(嚴禁同輪疊加第二輪契約)
- [ ] 是否已提供下一輪 Prompt？
- [ ] 交付報告是否已包含【本次 Token 消耗精準量化】表格？
- [ ] 4 刀流已啟動？(0 重複讀檔編譯 / 驗收 ≤15 行 / Prompt 極簡 / 派工一句話即停)
- [ ] 高難度任務是否已原子拆解？(≤3 輪收斂 ✕ 128k 防爆)
- [ ] 缺指令時是否直接預設派工？(嚴禁 list_dir / --help / view_file 摸索)
- [ ] 是否守住「監工不下場」？(0 代寫源碼 / 0 代跑測試 / 驗收 ≤3 步 / 0 摸索讀檔)
- [ ] 是否守住「驗收 ≤3 步且絕無手動篡改記帳本」？(0 手寫 oneliner 算帳 / 0 額外指令 / 驗收完成即出報告)
"""

# ─────────────────────────────────────────────
# 五大紅線文本
# ─────────────────────────────────────────────
STANDARDIZED_5_RED_LINES = """【🚨 頂層開發紅線 ✕ 零雲端盲目探索 ✕ 實體外包派工鐵律 (Rule-First Guard)】：
1. 🧠【本地大腦常態在線】：8080 本地大腦常態在線！探測大腦請一律使用 Python 探測 http://127.0.0.1:8080/v1/models（嚴禁用 PowerShell 2秒超時指令誤判）。
2. 🚫【15 行極限代碼禁寫令 ✕ 零雲端手寫偷步 ✕ 零盲目探索】：本地在線時，嚴禁雲端擅自手寫任何完整功能模組或長代碼（使用者明確指示雲端執行除外）！嚴禁雲端自行反覆大量讀取/搜尋代碼！任務探索、讀寫與重構一律調用 `scripts/brain_delegator.py -w . -t ...` 外包給本地端 AI 苦力執行，並真實寫入 ledger！
3. 🛡️【外包苦力狀態即時翻轉】：若本地生成曾報錯，經修復通過後，必須在交付前執行 `python scripts/brain_delegator.py --mark-passed "<說明>"` 翻轉綠燈，杜絕殘留未通過警報。
4. 👑【純粹超級監工 ✕ Diff-Only 極速審查 ✕ 看板推進】：雲端 Agent 恪守「只出契約、只看 Diff」原則（使用者指定雲端直接執行除外），出具精煉目標交由本地自主執行。驗收合格後，雲端監工必須更新 package.json 版號、推進 PROJECT_HANDOVER.md 待辦看板，並提供下一輪一鍵 Prompt！
5. 📌【未完成待辦置頂 ✕ 歷史任務強制收折】：焦點看板 (Active Focus) 必須將準備開發之未完成待辦 ([ ]) 強制置頂於最上方，歷史已完成任務 ([x]) 一律強制收折於 `<details>` 摺疊區塊內，杜絕雜訊干擾。"""

# 省 Token 刀 3：Prompt 不再重複貼上五大紅線，僅留 AGENTS.md 指標行
LEAN_RED_LINE_POINTER = "【🚨 五大紅線】已由 AGENTS.md 自動注入（本節由 sync_all_projects_rules.py 維護），本 Prompt 拒絕重複貼上。"

# 刀 3 強化：徹底剔除「請先閱讀本專案根目錄下的 PROJECT_HANDOVER.md 與 AGENTS.md...」等誘發雲端讀檔的導讀句
FILE_READ_GUIDE_RE = re.compile(
    r"(?:請先|請務必|請要先|請|務必|要先)?\s*"
    r"(?:閱讀|讀取|載入|研讀|參照|查看|Read|read)\s*"
    r"(?:本專案|此專案|該專案|本計畫)?\s*(?:根目錄下的?|根目錄)?\s*"
    r"(?:PROJECT_HANDOVER\.md|AGENTS\.md|PROJECT_HANDOVER|AGENTS)"
    r"(?:\s*與\s*AGENTS(?:\.md)?)?[，,、;；。]?"
)
# 導讀句移除後的殘片處理：純說明殘片整行剔除，任務殘片保留並接回句首
_GUIDE_EXPLAIN_TAIL_RE = re.compile(r"^(?:了解|掌握|熟悉|理解)[^\n]*?[，,、]\s*")
_GUIDE_EXPLAIN_ONLY_RE = re.compile(r"^(?:了解|掌握|熟悉|理解)[^\n]*$")
_GUIDE_ACTION_RE = re.compile(r"(接續|推進|執行|完成|依看板|待辦|任務)")

# 結尾派工區塊合法觸發：待辦清單、任務標題，以及「單行派工命令」指令行
TAIL_TRIGGER_PREFIXES = (
    "【🎯", "【⚠️", "【⚡", "【👉", "【🚀", "【🔥", "【🛠️",
    "👉", "- [", "* [",
)
# 單行派工指令 (python / sh / cmd ...) 與直接給出的腳本路徑
TAIL_COMMAND_RE = re.compile(
    r"^(?:python\d*|py|pip\d*|uv|npm|npx|node|bun|deno|bash|zsh|sh|cmd|powershell|pwsh"
    r"|git|make|docker|cargo|go|curl)\s+\S"
)
TAIL_SCRIPT_PATH_RE = re.compile(r"^[\w\-.\\/ ]*\.(?:py|bat|sh|ps1|cmd|js|ts|sql)\b")
TAIL_PENDING_MAX = 12  # 觸發行下方的結尾行暫存上限，杜絕無觸發時誤收整份 body

# ─────────────────────────────────────────────
# 派工命令 (Dispatch Line) 自動合成規格：標題行 + 指令行獨立兩行式
# ─────────────────────────────────────────────
DISPATCH_HEADER = "【⚡ 單行派工命令 (收到即執行 ✕ 嚴禁雲端搜尋或讀取檔案)】"
DISPATCH_TASK_MAX = 120  # 待辦文字過長時的截斷上限 (~120 字)
DISPATCH_SUFFIX = "，完成後自檢驗證"
DISPATCH_LINE_SEP = "\n"  # 標題行與指令行獨立換行，杜絕標題與 python 指令黏合
DISPATCH_FALLBACK_TASK = "請依看板置頂之未完成待辦依序執行"
# 冪等偵測：已存在派工標題行或任一外包指令行 (claude_delegator / brain_delegator) 即不重複插入
DISPATCH_MARKER_RE = re.compile(r"單行派工命令|claude_delegator\.py|brain_delegator\.py")
# 全文置頂第一項未完成待辦 (- [ ] 開頭，含焦點看板/待辦清單下方第一筆)
PENDING_ITEM_RE = re.compile(r"^\s*(?:[-*•]\s*)?\[\s?\]\s*(.+)$")
# 通用執行檢查清單行非專案待辦，一律不作為派工任務來源
META_CHECKLIST_RE = re.compile(
    r"(本地大腦在線|是否已|4 刀流已啟動|執行檢查清單|ledger|版號前綴|換手 Prompt)"
)
# 待辦文字清理：剔除 Markdown 符號並收斂多餘空白
_MD_LINK_RE = re.compile(r"\[([^\]\n]*)\]\(([^)\n]*)\)")
_MD_NOISE_RE = re.compile(r"(\*\*|~~|[*`#>])")

# 舊版派工命令黏合與引號偵測
_LEGACY_GLUE_RE = re.compile(
    r"^(?P<header>【[^】]*單行派工命令[^】]*】)\s*[：:]\s*(?P<cmd>(?:python\d*|py)\s+\S.*)$"
)
_DISPATCH_CMD_RE = re.compile(r"^(?:python\d*|py)\s+\S.*(?:claude_delegator|brain_delegator)\.py")
_QUOTE_LEAK_RE = re.compile(r'^(?P<head>.*-t\s+"(?P<task>.*)")\s*(?P<leak>[^"]*)$')
_UNQUOTED_TASK_RE = re.compile(r'\s-t\s+(?P<task>[^"\s][^\n]*)$')
_ADJACENT_DUP_RE = re.compile(r"^(?P<unit>.{20,}?)(?P=unit)(?P<suffix>[^\n]*)$")


def _clean_residual_lines(content: str) -> str:
    """清理檔案開頭可能誤植的殘留行。"""
    lines = content.split("\n")
    cleaned = []
    skip_patterns = [
        re.compile(r"^\s*\d+\.\s*[👑📌🧠🚫🛡️]"),
        re.compile(r"^\s*[👑📌🧠🚫🛡️]\s*【"),
    ]
    for i, line in enumerate(lines):
        if i < 5 and any(p.match(line) for p in skip_patterns):
            continue
        cleaned.append(line)
    return "\n".join(cleaned)


def _clean_guide_line(line: str) -> Optional[str]:
    """剔除單行內的導讀句；回傳 None 代表該行應整行移除。"""
    stripped = line.strip()
    if not stripped or not FILE_READ_GUIDE_RE.search(stripped):
        return line
    if "嚴禁" in stripped or "禁止" in stripped:
        return line  # 紅線說明文字非導讀句，保留
    cleaned = FILE_READ_GUIDE_RE.sub("", stripped)
    cleaned = _GUIDE_EXPLAIN_TAIL_RE.sub("", cleaned).lstrip("，,、;；並 ").rstrip()
    if not cleaned or (_GUIDE_EXPLAIN_ONLY_RE.match(cleaned) and not _GUIDE_ACTION_RE.search(cleaned)):
        return None
    return cleaned


def _strip_read_guide_prompts(content: str) -> str:
    """剔除 PROJECT_HANDOVER.md 所有 ``` 代碼區塊（含主 Prompt 與跨專案切換 Prompt）內的導讀句。"""
    def _clean_block(m: "re.Match") -> str:
        original_body = m.group(2)
        kept = [c for c in (_clean_guide_line(l) for l in original_body.split("\n")) if c is not None]
        body = re.sub(r"\n{3,}", "\n\n", "\n".join(kept)).strip("\n")
        if body == original_body.strip("\n") and original_body.endswith("\n"):
            return m.group(0)  # 未受影響的代碼區塊原樣保留，避免多餘重排
        return m.group(1) + body + "\n" + m.group(3)  # 強制保留閉合 ``` 前的換行

    return re.sub(r"(```[A-Za-z]*\s*\n)(.*?)(```)", _clean_block, content, flags=re.DOTALL)


def _is_tail_trigger(stripped: str) -> bool:
    """判定該行是否為結尾派工區塊的合法觸發行 (待辦清單 / 任務標題 / 單行派工命令)。"""
    return (
        stripped.startswith(TAIL_TRIGGER_PREFIXES)
        or bool(TAIL_COMMAND_RE.match(stripped))
        or bool(TAIL_SCRIPT_PATH_RE.match(stripped))
    )


def _clean_task_text(raw: str) -> str:
    """待辦文字正規化：去除多餘空白與 Markdown 符號、單行呈現、過長截斷至 ~120 字。"""
    text = _MD_LINK_RE.sub(lambda m: m.group(1) or " ", raw)
    text = _MD_NOISE_RE.sub(" ", text)
    text = re.sub(r"<[^>\n]{1,60}>", " ", text)  # HTML 標籤 (如 <details> / <br>)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+([,.;:!?、)。])", r"\1", text)  # 符號清理後殘留的標點前空白
    text = re.sub(r"([([{「『])\s+", r"\1", text)
    text = text.replace('"', "'").strip(" ，,、;：:-·—")
    if len(text) > DISPATCH_TASK_MAX:
        text = text[: DISPATCH_TASK_MAX - 1].rstrip() + "…"
    return text


def _extract_top_pending_task(content: str) -> Optional[str]:
    """抓取 PROJECT_HANDOVER.md 全文「置頂第一項未完成待辦」(- [ ] 開頭，含焦點看板/待辦清單下方第一筆)。"""
    in_fence = False
    for line in content.split("\n"):
        if line.strip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        match = PENDING_ITEM_RE.match(line)
        if not match:
            continue
        task = _clean_task_text(match.group(1))
        if not task or META_CHECKLIST_RE.search(task):
            continue
        return task
    return None


def _build_dispatch_line(project: Optional[Path], task_text: Optional[str]) -> str:
    """合成獨立兩行式派工命令：第一行為派工標題，第二行為可直接貼上終端機執行的 python 指令。"""
    task = (task_text or DISPATCH_FALLBACK_TASK) + DISPATCH_SUFFIX
    command = f'python scripts/brain_delegator.py -w . -t "{task}"'
    return DISPATCH_HEADER + DISPATCH_LINE_SEP + command


def _collapse_duplicated_task(task: str) -> str:
    """折併相鄰重複的任務文字，杜絕引號修復過程造成的任務重複串接。"""
    match = _ADJACENT_DUP_RE.match(task)
    return (match.group("unit") + match.group("suffix")) if match else task


def _repair_dispatch_command(cmd: str) -> str:
    """派工指令行引號完整性與現代化修復。"""
    # 遷移 claude_delegator.py -> brain_delegator.py
    cmd = re.sub(r"\bclaude_delegator\.py\b", "brain_delegator.py", cmd)

    # 正規化 -w 參數為相對路徑 -w .
    if re.search(r'-w\s+(?:"[^"]*"|\x27[^\x27]*\x27|\S+)', cmd):
        cmd = re.sub(r'-w\s+(?:"[^"]*"|\x27[^\x27]*\x27|\S+)', "-w .", cmd)
    elif "brain_delegator.py" in cmd and "-w " not in cmd:
        cmd = re.sub(r"(brain_delegator\.py)\s+", r"\1 -w . ", cmd)

    leak = _QUOTE_LEAK_RE.match(cmd)
    leaked = leak.group("leak").strip() if leak else ""
    if leaked and not leaked.startswith("-"):
        cmd = leak.group("head")[:-1] + leaked + '"'

    unquoted = _UNQUOTED_TASK_RE.search(cmd) if '-t "' not in cmd else None
    if unquoted:
        task = unquoted.group("task").replace('"', "'").rstrip()
        cmd = cmd[: unquoted.start()] + ' -t "' + task + '"'

    quoted = re.match(r'^(?P<before>.*-t\s+")(?P<task>[^\n]*)"$', cmd)
    if quoted:
        task = _collapse_duplicated_task(quoted.group("task"))
        if "自檢" not in task:
            task += DISPATCH_SUFFIX
        cmd = quoted.group("before") + task + '"'
    return cmd


def _normalize_legacy_dispatch_line(line: str) -> List[str]:
    """修復舊版派工命令缺陷：標題與指令黏合同一行 → 拆兩行；自檢尾句游離於 -t 引號外 → 收回引號內。"""
    stripped = line.strip()
    if not stripped:
        return [line]

    glued = _LEGACY_GLUE_RE.match(stripped)
    if glued:
        return [glued.group("header"), _repair_dispatch_command(glued.group("cmd").strip())]
    if _DISPATCH_CMD_RE.match(stripped):
        return [_repair_dispatch_command(stripped)]
    return [line]


def _normalize_dispatch_blocks(content: str) -> str:
    """對 PROJECT_HANDOVER.md 所有 ``` 代碼區塊逐行套用派工修復，區塊外內容不動 (冪等)。"""
    def _fix_block(m: "re.Match") -> str:
        body = m.group(2)
        if "單行派工命令" not in body and "claude_delegator.py" not in body and "brain_delegator.py" not in body:
            return m.group(0)
        fixed: List[str] = []
        for ln in body.split("\n"):
            for out in _normalize_legacy_dispatch_line(ln):
                if _DISPATCH_CMD_RE.match(out.strip()) and not (fixed and fixed[-1].strip() == DISPATCH_HEADER):
                    fixed.append(DISPATCH_HEADER)
                fixed.append(out)
        new_body = "\n".join(fixed)
        if new_body == body:
            return m.group(0)
        return m.group(1) + new_body + m.group(3)

    return re.sub(r"(```[A-Za-z]*\s*\n)(.*?)(```)", _fix_block, content, flags=re.DOTALL)


def _has_dispatch_marker(text: str) -> bool:
    """冪等偵測：Prompt 內已存在單行派工命令標題或任一外包指令行時回傳 True。"""
    return bool(DISPATCH_MARKER_RE.search(text or ""))


def _rebuild_prompt_body(
    prompt_body: str,
    keep_red_lines: bool = False,
    project: Optional[Path] = None,
    pending_task: Optional[str] = None,
    logger=None,
) -> str:
    """重建 prompt 內容，僅保留純粹問候與結尾任務指令，置換核心紅線。"""
    lines = prompt_body.split("\n")

    greeting_lines = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if greeting_lines:
                greeting_lines.append(line)
            continue
        if "你好" in stripped or re.match(r"^【v\d", stripped):
            cleaned = FILE_READ_GUIDE_RE.sub("", stripped).strip()
            if cleaned:
                greeting_lines.append(cleaned)
        elif FILE_READ_GUIDE_RE.match(stripped):
            continue
        elif not greeting_lines and not stripped.startswith("【🚨") and not stripped.startswith("1.") and not stripped.startswith("【"):
            greeting_lines.append(line)
        else:
            break

    tail_lines = []
    pending_tail = []
    in_tail = False
    for line in reversed(lines):
        stripped = line.strip()
        if not stripped:
            if in_tail:
                tail_lines.insert(0, line)
            continue
        if re.match(r"^\d+\.\s*", stripped) or stripped.startswith("【🚨"):
            break
        if FILE_READ_GUIDE_RE.match(stripped):
            continue
        if re.match(r"^【v\d", stripped) or ("你好" in stripped and not stripped.startswith("【🎯")):
            break
        if _is_tail_trigger(stripped):
            if not in_tail and pending_tail:
                tail_lines = list(reversed(pending_tail))
                pending_tail = []
            tail_lines.insert(0, line)
            in_tail = True
        elif in_tail:
            tail_lines.insert(0, line)
        elif len(pending_tail) < TAIL_PENDING_MAX:
            pending_tail.append(line)

    greeting_text = "\n".join(greeting_lines).strip()
    tail_fixed = []
    for ln in tail_lines:
        if _DISPATCH_CMD_RE.match(ln.strip()):
            tail_fixed.append(_repair_dispatch_command(ln.strip()))
        else:
            tail_fixed.append(ln)
    tail_text = "\n".join(tail_fixed).strip()

    if not _has_dispatch_marker(tail_text):
        dispatch_line = _build_dispatch_line(project, pending_task)
        tail_text = "\n".join([t for t in (tail_text, dispatch_line) if t])
        if logger:
            logger.debug("  ✓ 補齊單行派工命令: %s", project.name if project else "(未指定專案)")

    red_line_block = (
        STANDARDIZED_5_RED_LINES.strip() if keep_red_lines else LEAN_RED_LINE_POINTER
    )

    parts = []
    if greeting_text:
        parts.append(greeting_text)
    parts.append(red_line_block)
    if tail_text:
        parts.append(tail_text)

    return "\n\n".join(parts)


def _build_default_prompt_section(
    keep_red_lines: bool = False,
    project: Optional[Path] = None,
    pending_task: Optional[str] = None,
) -> str:
    """建立預設的 Prompt 區塊。"""
    red_line_block = (
        STANDARDIZED_5_RED_LINES.strip() if keep_red_lines else LEAN_RED_LINE_POINTER
    )
    return (
        "## 📌 給 Antigravity IDE 的 Agent 引導指令 (Prompt)\n\n"
        "```text\n"
        "【v1.0】你好！\n\n"
        f"{red_line_block}\n\n"
        "【🎯 本次指定待辦任務】：請依看板置頂之未完成待辦依序執行。\n"
        "【⚠️ 啟動極致省 Token 4 刀流】：苦力自檢 0 重複讀檔、驗收 ≤15 行、Prompt 極簡、派工一句話即停。\n"
        f"{_build_dispatch_line(project, pending_task)}\n"
        "```"
    )

