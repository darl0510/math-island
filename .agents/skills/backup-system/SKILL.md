---
name: backup-system
description: 專案三層智慧備份架構、自動封存與資料還原作業指引。當進行版本備份、文檔修剪封存、資料庫快照還原或分析備份分流時使用此 Skill。
---

# 💾 智慧備份與自動封存手冊 (Backup & Archival Guide)

本專案實裝高韌性、秒級完成的三層智慧備份與交接文檔自動封存架構，確保每次改版有跡可循，且維持極低儲存與 Token 負擔。

---

## ⚡ 三層智慧備份分流機制 (Three-Tier Backup)

由 [`auto_backup.py`](file:///c:/Users/達爾/APP_9181734/auto_backup.py) 提供統一呼叫入口 `smart_backup()`：

1. **L1 資料庫擴增專屬備份 (Database Snapshot)**：
   - 當異動涉及 `.db`、`.json` 或資料庫 schema 變更時，專門為資料庫檔案建立獨立備份。
2. **L2 輕量版本備份 (Lightweight Version Backup)**：
   - 一般代碼功能與 Bug 修復使用。
   - **巨型檔案過濾**：自動排除 `twCounty.geo.json` (9.3MB)、`__pycache__`、`.git` 等大檔案。
   - **極速備份**：備份時間 < 0.2 秒，壓縮檔通常小於數百 KB。
   - **輪替保護**：`backups/` 目錄預設輪替保留最新 20 份備份，自動清除過期版本。
3. **L3 跨主版本全量備份 (Full Milestone Backup)**：
   - 當跨重大主版號或進行全面架構升級時，執行完整全量打包。

---

## 🛠️ 常見呼叫 API 與指令

### 1. 執行版本智慧備份
```python
from auto_backup import smart_backup

# 自動依異動檔案與版號執行三層分流備份
zip_name = smart_backup(version_str="v2.42.3", modified_files=["app.py", "AGENTS.md"])
```

### 2. 交接文檔健康防線與自動修剪 (Token Guard)
本專案嚴格限制 [`PROJECT_HANDOVER.md`](file:///c:/Users/達爾/APP_9181734/PROJECT_HANDOVER.md) 行數 <= 800 行（健康區間 200~400 行）：
```python
from auto_backup import check_and_trim_handover

# 雙軌檢查：常態保留最新 6 版或超過 800 行時，自動將舊版無損遷移至 docs/CHANGELOG_ARCHIVE.md
result = check_and_trim_handover(max_lines=800, keep_recent=6)
```

### 3. 一鍵還原作業
若需回滾至最新或特定備份版本，可執行：
```bash
python restore_backup.py
```
或雙擊執行本機批次檔：
- `一鍵即時備份.bat`
- `一鍵快速還原最新備份.bat`
