# ⚡ 極致節省 Token 規範與本地大腦外包協議 (Extreme Token-Saving Protocol)

## 📌 觸發條件與優先權則 (Local Brain Priority)
1. **偵測指標**：凡環境偵測到下列任一條件成立：
   - 8080 本地大腦端點正常響應 (`http://127.0.0.1:8080/v1`)
   - 側邊欄「本地苦力即時外包監控面板 (Live Monitor)」運作中
   - 工作區存在狀態心跳廣播檔 `.delegator_live.json`
2. **強制模式切換**：一旦偵測成功，**一律強制優先啟動「雲端監工 ✕ 本地苦力」外包協議 (Supervisor-Worker Pattern)**。

---

## 🚫 大篇幅代碼禁寫令 (Code Generation Prohibition)
- **禁止裸寫**：凡預期新增或修改代碼超過 30 行、撰寫新模組/類別、編寫大量樣板程式碼或單元測試，**嚴禁由雲端 Agent 裸寫生成**。
- **無條件外包**：必須透過 `scripts/brain_delegator.py`（或 `scripts/delegate-to-brain.bat`）指派給 8080 本地大腦執行，達成 0 雲端 Token 消耗。

---

## 👥 雙軌職責分工 (Roles & Boundaries)
### 1. 雲端 Agent (Supervisor / 架構師)
- **架構規劃**：負責系統設計、Interface/Spec 定義、高階邏輯驗證。
- **派工指令設計**：撰寫精準之派工 Prompt，並指定自動驗收命令（如 `--verify-cmd "npm run compile"`）。
- **驗收與微調**：審查 Diff 與編譯結果，僅對 1~5 行之邊界微創修補親自編輯。

### 2. 本地大腦 (Worker / 8080 苦力工蜂)
- **全量代碼生成**：承接 100% 繁重程式碼撰寫與完整模組生成。
- **即時廣播**：即時寫入 `.delegator_live.json`，供側邊欄 Live Monitor 實時串流滾動與 Token 速率監控。
- **自我編譯驗收**：落盤後自動觸發 `--verify-cmd` 驗收並自我修復。

---

## ⏱️ 開局極簡喚起協議 (Session Startup Protocol)
- 新對話啟動時僅快速檢視交接看板與現況（保持極簡對話步驟），回報就緒即可。
- 切勿在未獲明確任務前執行耗時之全套編譯或大量檢視巨型源碼檔，保留最大上下文空間。

---

## 💰 Token 記帳持久化與 8765 雙軌聯動
- 每次外包產出自動於 `local_tokens_ledger.json` 累計節省之 Token 與美金價值。
- 側邊欄 8765 看板卡片支援「本次新對話重新計量」與「全域累計」雙層指標。

---

## 📊 交付報告 Token 量化鐵律 (Mandatory Token Reporting)
每次迭代或任務完成後的成果報告，**必須強制包含【本次 Token 消耗精準量化】表格**：
1. **8080 本地大腦 (苦力工蜂)**：本次產出 Tokens、本次節省金額 (USD) 與專案歷史累計節省美金。
2. **雲端 Agent (Supervisor)**：本次消耗評估與本地/雲端協作比率。
3. **8765 看板狀態**：本次對話計量與全域總計。

---

## 🔄 最佳 Token 換手協議 (Session Handover Protocol)
- 完成里程碑時主動附上換手提示與下一輪專用的一鍵啟動 Prompt。
- **規格鐵律**：換手 Prompt 開頭必須前綴當前版號，如 `【vX.Y.Z】你好！...`，確保在 Token 儀表板歷史對話清單中一眼秒辨各版本消耗，不被預設問候語遮蔽。
