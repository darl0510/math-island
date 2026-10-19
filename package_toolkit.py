# -*- coding: utf-8 -*-
"""
Token Optimization & Smart Backup Toolkit Exporter
全自動導出與打包工具：
- 專職將當前專案最新演進的「三層智慧備份」與「Token 節省交接體系」核心檔案打包為開箱即用的 zip 工具包。
- 支援動態掃描 .agents/skills/ 目錄，保證任何新增的技能也能自動納入。
- 自動讀取 PROJECT_HANDOVER.md 最新版號與日期，動態生成 README_TOOLKIT.md。
- 智慧支援在專案目錄或 toolkit 內部執行，並自動同步維持 token_and_backup_toolkit/ 資料夾與 zip 雙軌更新。
"""

import os
import sys
import re
import shutil
import zipfile

# 強制 UTF-8 輸出，避免 Windows 終端亂碼
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding='utf-8')

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# 智慧判斷基準目錄 (PROJECT_DIR 與 TOOLKIT_DIR)
if os.path.basename(CURRENT_DIR).lower() == "token_and_backup_toolkit":
    TOOLKIT_DIR = CURRENT_DIR
    PROJECT_DIR = os.path.dirname(CURRENT_DIR)
else:
    PROJECT_DIR = CURRENT_DIR
    TOOLKIT_DIR = os.path.join(CURRENT_DIR, "token_and_backup_toolkit")

OUTPUT_ZIP = os.path.join(TOOLKIT_DIR, "token_and_backup_toolkit.zip")
OUTPUT_ZIP_ROOT = os.path.join(PROJECT_DIR, "token_and_backup_toolkit.zip")

def get_current_project_version():
    """從 PROJECT_HANDOVER.md 動態抽取當前最新版本號"""
    search_paths = [
        os.path.join(PROJECT_DIR, "PROJECT_HANDOVER.md"),
        os.path.join(TOOLKIT_DIR, "PROJECT_HANDOVER.md"),
        os.path.join(TOOLKIT_DIR, "PROJECT_HANDOVER_EXAMPLE.md")
    ]
    for p in search_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    content = f.read(2500)
                    m = re.search(r"\(v(\d+\.\d+\.\d+.*?)\s*版\)", content)
                    if not m:
                        m = re.search(r"v(\d+\.\d+\.\d+)", content)
                    ver_str = f"v{m.group(1)}" if m else "latest"
                    d = re.search(r"最後更新時間[：:]\s*([0-9\-]+)", content)
                    date_str = d.group(1) if d else "最新"
                    return ver_str, date_str
            except Exception:
                pass
    return "latest", "最新"

def build_readme_content(ver_str, date_str):
    return f"""# 🚀 Antigravity 智慧備份與 Token 極致節省工具包 (Token & Backup Toolkit)

> **版本**：{ver_str}（同步自原專案最新演進，產生日期：{date_str}）  
> **核心目標**：開箱即用、一鍵移植至任何新專案，徹底消滅 73% Context Token 浪費，建構三層秒級智慧備份防線與 Token 即時視覺化儀表板。

---

## 📂 工具包目錄結構

```text
📁 token_and_backup_toolkit/
│
├── 📖 README_TOOLKIT.md                  # 本使用指引手冊
│
├── ⚙️ 【核心自動化引擎】
│   ├── auto_backup.py                    # 三層備份分流 + Handover 雙軌自動修剪封存引擎
│   ├── restore_backup.py                 # 災難防護快照 + 一鍵歷史版本還原工具
│   ├── cloud_sync.py                     # Google 雲端硬碟雙向增量同步引擎 (Robocopy /XO 0.3秒傳輸)
│   ├── cloud_sync_config.json            # 雲端同步專案清單與候選硬碟自訂設定檔
│   ├── scan_tokens.py                    # 本機對話日誌自動掃描與 5h 滑動窗口統計引擎
│   ├── scan_architecture.py              # 專案平鋪架構 ✕ 代碼健康度即時掃描微服務
│   ├── cleanup_service.py                # 專案非核心多餘/冗餘檔案安全掃描與清理服務
│   └── package_toolkit.py                # 一鍵自動導出/更新本工具包引擎
│
├── ⚡ 【視覺化儀表板與架構看板】
│   ├── token_dashboard.html              # 即時 Pulse + 4 帳號輪替池記帳中心
│   ├── cloud_dashboard.html              # 雲端永久持久化同步看板
│   ├── architecture_dashboard.html       # 平鋪架構拓撲 ✕ 代碼健康度可視化看板
│   └── toolkit_guide.html                # 跨專案工具鏈管理手冊
│
├── 🧠 【Token 守護與交接規範】
│   ├── AGENTS.md                         # 極致精簡常駐規則（18 行消滅每輪 System Prompt 常駐稅）
│   ├── PROJECT_HANDOVER_EXAMPLE.md       # 跨設備/跨對話交接手冊範例（含一鍵接軌 Prompt）
│   └── docs/CHANGELOG_ARCHIVE_EXAMPLE.md # 歷史版本更新封存檔案庫範本
│
├── 🛡️ 【雲端頻寬防禦與維運遷移手冊】
│   ├── docs/CLOUD_BANDWIDTH_DEFENSE_GUIDE.md # 5GB 流量防禦守則 ✕ 2-byte /ping 保活規範
│   └── docs/DOMAIN_MIGRATION_CHECKLIST.md    # 換網址與雲端遷移標準 SOP (Render/Koyeb/VPS)
│
├── 🤖 【Antigravity IDE 技能模組 (Skills)】
│   ├── .agents/skills/backup-system/SKILL.md     # 智慧備份作業技能手冊
│   └── .agents/skills/flat-architecture/SKILL.md # 平鋪模組化架構守護技能（按需載入 0 常駐稅）
│
├── 🖱️ 【Windows 一鍵操作批次檔】
│   ├── 一鍵即時備份.bat                   # 雙擊秒級備份
│   ├── 一鍵快速還原最新備份.bat            # 具備二次確認與災難快照的還原捷徑
│   ├── 一鍵打包到雲端硬碟.bat             # 臨走前 0.3 秒增量同步更新至 Google 雲端硬碟
│   ├── 一鍵從雲端還原覆蓋.bat             # 上班/回到家一鍵自雲端硬碟還原最新進度
│   ├── 雲端雙向同步管家.bat               # 雲端硬碟雙向同步選單、專案清單與捷徑管理
│   ├── 設定每日自動排程備份.bat            # Windows 工作排程器一鍵自動掛載
│   ├── 一鍵導出Token與備份工具包.bat      # 隨時一鍵導出最新優化版工具包
│   ├── 查看Token儀表板.bat               # 一鍵掃描對話日誌並開啟 Token 儀表板
│   ├── 查看架構看板.template.bat          # 專案架構掃描看板啟動樣版 (各專案客製化防覆蓋標準)
│   ├── 查看架構看板.bat                  # 一鍵掃描專案架構並開啟代碼健康度看板
│   └── 一鍵同步所有專案工具.bat          # 一鍵同步共用工具鏈至所有登記子專案
│
└── 📊 【技術分享與成效分析】
    └── token_optimization_analysis.md     # 深度診斷報告（73% 節省階梯與量化數據）
```

---

## 🛠️ 新專案 4 步快速移植指南

### 第一步：複製檔案至新專案根目錄
將本壓縮包所有檔案解壓並覆蓋至新專案的專案根目錄中。

### 第二步：配置 `auto_backup.py`（約 1 分鐘）
開啟 `auto_backup.py`，根據新專案微調：
1. **副檔名範圍**（約第 29 行 `BACKUP_FILE_EXTENSIONS`）：加入新專案副檔名（如 `.ts`, `.vue`, `.go` 等）。
2. **忽略目錄**（約第 30 行 `EXCLUDE_DIRS`）：加入新專案的忽略目錄（如 `node_modules`, `dist` 等）。
3. **巨型靜態檔排除**：將新專案不需每次小改版壓縮的巨型資源加入排除清單。

### 第三步：初始化交接手冊與規則
1. 將 `PROJECT_HANDOVER_EXAMPLE.md` 重新命名為 `PROJECT_HANDOVER.md`，填入新專案的核心檔案名稱與待辦看板。
2. 將 `docs/CHANGELOG_ARCHIVE_EXAMPLE.md` 重新命名為 `docs/CHANGELOG_ARCHIVE.md`。
3. 檢查 `AGENTS.md`，保留「版本管理與交接鐵律」、「改版必備份」以及新專案自訂的架構紅線。

### 第四步：雲端部署與頻寬極限防禦配置（若服務部署於雲端平台）
1. 參考 `docs/CLOUD_BANDWIDTH_DEFENSE_GUIDE.md`，為後端新增 2-byte `/ping` 保活端點。
2. 將外部保活探針（如 UptimeRobot）監控網址指向 `/ping`，每 5 分鐘探測一次，節省 99.999% 出站流量。
3. 遷移或變更網址時，依循 `docs/DOMAIN_MIGRATION_CHECKLIST.md` 逐項檢核（如 LINE Webhook、環境變數對齊）。

---

## ⚡ 查看 Token 儀表板
只要雙擊 `查看Token儀表板.bat`，系統會自動掃描本機對話記錄，並在瀏覽器呈現即時 5 小時滑動窗口用量、24h / 7d 統計，以及多帳號輪替記帳池！

## 🔄 未來持續升級機制
當在新專案進一步優化了備份邏輯或規則時，只要雙擊 `一鍵導出Token與備份工具包.bat`，即可再度一鍵產出最新壓縮包，無縫傳遞給更多專案！
"""

def collect_toolkit_files():
    """收集所有需要打包的核心檔案，並支援動態映射"""
    files_map = []
    
    # 優先從 PROJECT_DIR 取，若無則從 TOOLKIT_DIR 取
    def find_file(rel_path):
        p1 = os.path.join(PROJECT_DIR, rel_path)
        if os.path.exists(p1):
            return p1
        p2 = os.path.join(TOOLKIT_DIR, rel_path)
        if os.path.exists(p2):
            return p2
        return None

    # 1. 核心自動化代碼
    core_scripts = [
        "auto_backup.py", "restore_backup.py", "package_toolkit.py", 
        "scan_tokens.py", "skill_router.py", "semantic_reflex_cache.py", "cockpit_service.py", "sync_projects.py",
        "scan_architecture.py", "cleanup_service.py", "run_all_services.py",
        "cloud_sync.py"
    ]
    for s in core_scripts:
        p = find_file(s)
        if p:
            files_map.append((p, s))

    p_oauth = find_file("cockpit_oauth.json")
    if p_oauth:
        files_map.append((p_oauth, "cockpit_oauth.json"))

    p_cloud_cfg = find_file("cloud_sync_config.json")
    if p_cloud_cfg:
        files_map.append((p_cloud_cfg, "cloud_sync_config.json"))

    # 2. 視覺化儀表板與架構看板 (單一真實來源 SSOT)
    dashboards = [
        "token_dashboard.html",
        "cloud_dashboard.html",
        "toolkit_guide.html",
        "architecture_dashboard.html"
    ]
    for d in dashboards:
        p = find_file(d)
        if not p and os.path.exists(os.path.join(r"d:\WEB\APP_9181734", d)):
            p = os.path.join(r"d:\WEB\APP_9181734", d)
        if p:
            files_map.append((p, d))

    # 3. 核心規範、模板與交接手冊
    p_agents = find_file("AGENTS.md")
    if p_agents:
        files_map.append((p_agents, "AGENTS.md"))
        
    p_agents_starter = find_file("AGENTS_STARTER.md")
    if p_agents_starter:
        files_map.append((p_agents_starter, "AGENTS_STARTER.md"))

    p_handover = find_file("PROJECT_HANDOVER.md")
    if p_handover:
        files_map.append((p_handover, "PROJECT_HANDOVER_EXAMPLE.md"))
    else:
        p_ex = find_file("PROJECT_HANDOVER_EXAMPLE.md")
        if p_ex:
            files_map.append((p_ex, "PROJECT_HANDOVER_EXAMPLE.md"))

    p_handover_starter = find_file("PROJECT_HANDOVER_STARTER.md")
    if p_handover_starter:
        files_map.append((p_handover_starter, "PROJECT_HANDOVER_STARTER.md"))

    p_archive = find_file(os.path.join("docs", "CHANGELOG_ARCHIVE.md"))
    if p_archive:
        files_map.append((p_archive, os.path.join("docs", "CHANGELOG_ARCHIVE_EXAMPLE.md")))
    else:
        p_arc_ex = find_file(os.path.join("docs", "CHANGELOG_ARCHIVE_EXAMPLE.md"))
        if p_arc_ex:
            files_map.append((p_arc_ex, os.path.join("docs", "CHANGELOG_ARCHIVE_EXAMPLE.md")))

    # 4. 動態掃描 .agents/skills/ 內的所有技能檔案
    skills_sources = [
        os.path.join(PROJECT_DIR, ".agents", "skills"),
        os.path.join(TOOLKIT_DIR, ".agents", "skills")
    ]
    seen_skills = set()
    for s_dir in skills_sources:
        if os.path.exists(s_dir):
            for root, _, files in os.walk(s_dir):
                for f in files:
                    full_p = os.path.join(root, f)
                    rel_to_skills = os.path.relpath(full_p, s_dir)
                    arcname = os.path.join(".agents", "skills", rel_to_skills)
                    if arcname not in seen_skills:
                        seen_skills.add(arcname)
                        files_map.append((full_p, arcname))

    # 5. Windows 批次腳本
    batch_files = [
        "一鍵啟動所有常駐服務.bat",
        "一鍵即時備份.bat",
        "一鍵快速還原最新備份.bat",
        "一鍵打包到雲端硬碟.bat",
        "一鍵從雲端還原覆蓋.bat",
        "雲端雙向同步管家.bat",
        "設定每日自動排程備份.bat",
        "一鍵導出Token與備份工具包.bat",
        "查看開發者總控中心.bat",
        "查看Token儀表板.bat",
        "查看架構看板.template.bat",
        "查看架構看板.bat",
        "一鍵同步所有專案工具.bat"
    ]
    for b in batch_files:
        p = find_file(b)
        if p:
            files_map.append((p, b))

    # 6. 深度分析與技術參考文件
    analysis_doc = "token_optimization_analysis.md"
    p_ana = find_file(analysis_doc)
    if p_ana:
        files_map.append((p_ana, analysis_doc))

    # 7. Impeccable 頂級設計與前端品質守護配置
    p_impeccable_cfg = find_file(os.path.join(".impeccable", "config.json"))
    if p_impeccable_cfg:
        files_map.append((p_impeccable_cfg, os.path.join(".impeccable", "config.json")))
        
    p_product = find_file("PRODUCT.md")
    if p_product:
        files_map.append((p_product, "PRODUCT_EXAMPLE.md"))
    else:
        p_prod_ex = find_file("PRODUCT_EXAMPLE.md")
        if p_prod_ex:
            files_map.append((p_prod_ex, "PRODUCT_EXAMPLE.md"))

    # 8. 雲端頻寬極限防禦與維運遷移手冊
    defense_docs = [
        os.path.join("docs", "CLOUD_BANDWIDTH_DEFENSE_GUIDE.md"),
        os.path.join("docs", "DOMAIN_MIGRATION_CHECKLIST.md")
    ]
    for doc in defense_docs:
        p_doc = find_file(doc)
        if p_doc:
            files_map.append((p_doc, doc))

    return files_map

def export_toolkit():
    ver_str, date_str = get_current_project_version()
    print("=" * 70)
    print(f"📦 【Token & Backup 工具包】全自動導出引擎啟動...")
    print(f"📌 當前專案版本: {ver_str} | 參照時間: {date_str}")
    print(f"🎯 目標輸出檔案: {OUTPUT_ZIP}")
    print("=" * 70)

    files_to_pack = collect_toolkit_files()
    os.makedirs(TOOLKIT_DIR, exist_ok=True)

    # 同步複製更新到 TOOLKIT_DIR 資料夾
    print("📂 正在同步更新 token_and_backup_toolkit/ 資料夾...")
    for full_p, arcname in files_to_pack:
        dest_p = os.path.join(TOOLKIT_DIR, arcname)
        os.makedirs(os.path.dirname(dest_p), exist_ok=True)
        if os.path.abspath(full_p) != os.path.abspath(dest_p):
            shutil.copy2(full_p, dest_p)

    # 寫入最新 README_TOOLKIT.md 到資料夾
    readme_text = build_readme_content(ver_str, date_str)
    readme_path = os.path.join(TOOLKIT_DIR, "README_TOOLKIT.md")
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(readme_text.strip() + "\n")
    print("  ✓ 已同步更新: README_TOOLKIT.md (資料夾與版本標頭)")

    # 打包 ZIP
    with zipfile.ZipFile(OUTPUT_ZIP, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for full_p, arcname in files_to_pack:
            zf.write(full_p, arcname=arcname)
            fsize = os.path.getsize(full_p)
            print(f"  ✓ 封裝資產: {arcname:<40} ({fsize/1024:>6.1f} KB)")

        # 動態將 README_TOOLKIT.md 寫入 ZIP
        zf.writestr("README_TOOLKIT.md", readme_text.strip().encode("utf-8"))
        print(f"  ✓ 動態生成: README_TOOLKIT.md                      (最新版本宣告)")

    # 複製一份 zip 到 PROJECT_DIR 方便使用者在專案根也能取得
    if os.path.abspath(TOOLKIT_DIR) != os.path.abspath(PROJECT_DIR):
        try:
            shutil.copy2(OUTPUT_ZIP, OUTPUT_ZIP_ROOT)
        except Exception:
            pass

    zip_size = os.path.getsize(OUTPUT_ZIP)
    print("-" * 70)
    print(f"🎉 導出成功！")
    print(f"📁 壓縮檔位置: {OUTPUT_ZIP}")
    if os.path.exists(OUTPUT_ZIP_ROOT) and OUTPUT_ZIP != OUTPUT_ZIP_ROOT:
        print(f"📁 鏡像壓縮檔: {OUTPUT_ZIP_ROOT}")
    print(f"📊 封裝統計: 共 {len(files_to_pack) + 1} 個檔案 | 壓縮後大小: {zip_size/1024:.1f} KB")
    print("=" * 70)

if __name__ == "__main__":
    export_toolkit()
