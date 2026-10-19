# 🤖 Antigravity AI 常駐開發規則 (Project Automation Rules)

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
