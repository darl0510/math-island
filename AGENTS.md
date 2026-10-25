# 🤖 Antigravity AI 常駐開發規則 (Project Automation Rules)

## ⚡ 極致節省 Token 規範 (Extreme Token-Saving Protocol)

> 本節由 `scripts/sync_all_projects_rules.py` 自動注入，請勿手動修改。
> 最後同步：2026-10-25 19:32:19

### 🔪 極致省 Token 4 刀流 (Four-Blade Token-Saving Protocol)

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
- 回傳未通過時，監工只補一句修正指令，不重寫整份契約。

### 🛡️ 本地離線無縫降級防呆機制 (Offline Fail-Safe & Auto-Fallback)

- 探測 `http://127.0.0.1:8080/v1/models`，超時 > 5 秒自動降級為 **Cloud-First** 模式。
- 降級時解除「15 行禁令」，雲端可直接產出完整代碼。
- 連續 3 次探測成功後自動恢復本地優先模式。
- 探測一律使用 Python `requests.get(..., timeout=5)`，嚴禁 PowerShell 2 秒超時指令誤判。

### 🚫 15 行極限代碼禁寫令

- 本地大腦在線時，雲端嚴禁手寫超過 **15 行**的完整功能模組。
- 超過 15 行的任務必須外包給本地端 AI 苦力執行。
- 嚴禁雲端自行反覆大量讀取 / 搜尋代碼。

### 🚫 零盲目摸索派工令 (Zero-Exploration Dispatch Fallback)

- Prompt 缺明確指令時，**Step 1 必須直接預設派工**：立即原樣執行 Prompt 末行既有的 `python scripts/claude_delegator.py ...` 或 `python scripts/brain_delegator.py ...` 指令，嚴禁先「確認環境」。
- 嚴禁一切摸索動作：`list_dir` / `ls` / `--help` / `-h` / `view_file` / 全域搜尋 / 預讀 `AGENTS.md` 與 `PROJECT_HANDOVER.md` / 先讀架構檔或舊 Prompt。
- 唯一允許的讀檔時機：派工指令已啟動之後，由苦力依契約自行讀取「契約指定的目標檔案」。
- 連指令行都不存在時：僅允許以看板置頂第一筆未完成待辦合成 `【⚡ 單行派工命令】` 兩行式指令並立即執行，嚴禁改用探索方式取得任務。
- 脫離契約改動非契約指定檔案一律視為無效交付：監工直接還原該檔案、翻轉 ledger 狀態並改派最小 Diff 錨點。

### 👑 雲端監工與本地實作鐵律 (Supervisor & Dispatcher Only Protocol)

- 雲端 Agent 僅負責 **監工 (Supervise)** 及 **派工 (Dispatch)**。
- 出具精煉契約 (Contract) → 本地自主執行 → 雲端只看 Diff 驗收。
- 嚴禁雲端直接寫入源碼檔案。

### 🚫 嚴禁監工代勞陷阱鐵律 (No Supervisor-as-Worker Trap)

- 苦力未盡事項（未寫完的函式、未跑的測試、未修的報錯）**嚴禁監工下場代寫**：一律改派原子契約或補「最小 Diff 錨點」，嚴禁監工自己把活幹完。
- 嚴禁監工自行撰寫測試腳本補跑：測試屬苦力自檢範圍，缺測試即退回原契約，不補寫、不代跑。
- 嚴禁監工直接改源碼：任何對 `.ts` / `.js` / `.py` 等源碼檔案的寫入動作，必須經由 `scripts/claude_delegator.py` 或 `scripts/brain_delegator.py` 派工完成。
- 驗收步驟嚴格限制 **3 步以內**，固定順序：
  1. `git diff --stat`
  2. `git status`
  3. 交付報告
- 超過 3 個檢查指令視同重大違規：立即停止驗收，直接改派下一輪原子契約。

### 🧠 實體外包派工與記帳本防空報鐵律

- 所有代碼生成 / 重構 / 測試任務，必須調用：
  - `scripts/claude_delegator.py`（Claude 外包）
  - `scripts/brain_delegator.py`（本地大腦外包）
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
2. **Execute**：外包給本地端執行。
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
- [ ] 任務是否超過 15 行？→ 外包
- [ ] 是否已寫入 ledger？
- [ ] 是否已更新 PROJECT_HANDOVER.md？
- [ ] 是否已更新 package.json 版號？(一律 `python scripts/bump_version.py <版號>`，嚴禁手動 edit)
- [ ] 本對話是否僅執行單次原子派工？(嚴禁同輪疊加第二輪契約)
- [ ] 是否已提供下一輪 Prompt？
- [ ] 4 刀流已啟動？(0 重複讀檔編譯 / 驗收 ≤15 行 / Prompt 極簡 / 派工一句話即停)
- [ ] 高難度任務是否已原子拆解？(≤3 輪收斂 ✕ 128k 防爆)
- [ ] 缺指令時是否直接預設派工？(嚴禁 list_dir / --help / view_file 摸索)
- [ ] 是否守住「監工不下場」？(0 代寫源碼 / 0 代跑測試 / 驗收 ≤3 步)
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

