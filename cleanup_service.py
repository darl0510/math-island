# -*- coding: utf-8 -*-
"""
🧹 專案冗餘檔案掃描與安全清理服務 (Project Redundant Files Cleanup Service)
職責說明 (AGENTS.md):
- 專職掃描專案目錄非核心的多餘檔案 (歷史損毀轉儲、過期備份、過渡遷移暫存、除錯測試暫存、Python 編譯快取)。
- 恪守嚴格受保護白名單與路徑穿越防護，杜絕刪除核心源碼、資料庫與重要設定。
- 提供人性化檔案大小格式化與清理安全回報。
"""

import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 嚴格受保護資產白名單（絕對嚴禁刪除）
PROTECTED_EXACT = {
    ".env", ".env.example", ".gitignore", ".gitconfig", ".accessibility.properties",
    "Procfile", "requirements.txt", "AGENTS.md", "PROJECT_HANDOVER.md", "README.md",
    "MILESTONE_CAPACITY_PLAN.md", "SYSTEM_CAPACITY_AND_STRESS_TEST.md", "security_audit.md",
    "parking_storage.db", "keyword_analytics.db",
    "architecture_dashboard.html", "admin_guide.html", "token_dashboard.html",
    "cloud_dashboard.html", "toolkit_guide.html", "user_analytics_report.html", "dashboard.html",
    "spots_map.html",
    "restaurant-store.json", "static-store.json", "toilet-store.json", "spot-store.json", "japan-spot-store.json",
    "okinawa-store.json", "hokkaido-store.json", "kyoto-store.json", "landmarks.json",
    "taiwan_rail_transit.json", "convenience-store.json", "smart_parking_slots.json",
    "twCounty.geo.json", "user_analytics.json", "user_favorites.json", "user_parking_reports.json",
    "user_pinned_locations.json", "verified_hotspots.json", "error_knowledge.json",
    "dev_users.json", "ad_leads.json", "ad_stats.json", "token_storage.json", "token_data.json",
    "projects_registry.json", "cockpit_oauth.json", "tdx_token.json", "ntpc_id_map.json",
    "taichung-avail.json", "taoyuan-avail.json", "ntpc-avail.json", "kaohsiung-avail.json",
    "tdx-onstreet-avail.json", "tdx-onstreet-segments.json", "youbike_snapshot.json",
    "google_places_usage.json", "final_stats.json", "token_data.js",
    "architecture_data.js", "dashboard_data.js"
}


def format_file_size(size_bytes):
    """將檔案 byte 轉換為人性化大小 (B, KB, MB)"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"


def scan_redundant_files(base_dir=BASE_DIR):
    """
    掃描專案目錄中非核心的冗餘/多餘檔案清單
    回傳字典格式：{ status, total_files, total_size_bytes, total_size_formatted, files }
    """
    items = []

    # 1. 掃描根目錄
    if os.path.exists(base_dir):
        for fname in os.listdir(base_dir):
            fpath = os.path.join(base_dir, fname)
            if not os.path.isfile(fpath):
                continue

            if fname in PROTECTED_EXACT:
                continue

            # 嚴禁刪除任何非備份的標準 Python 源碼檔
            if fname.endswith(".py") and not (".bak" in fname):
                continue

            # 嚴禁刪除任何批次執行檔
            if fname.endswith(".bat"):
                continue

            matched = False
            cat = ""
            reason = ""

            # 規則 A: SQLite 損毀轉儲歷史檔
            if ".corrupt." in fname:
                matched = True
                cat = "SQLite 損毀轉儲"
                reason = "歷史 SQLite WAL 異常修復轉儲檔，無運行依賴"
            # 規則 B: 歷史備份殘留檔
            elif ".bak" in fname or fname.endswith(".bak_pre_sync") or fname.endswith(".bak_claude"):
                matched = True
                cat = "過期備份殘留"
                reason = "歷史手動或同步備份殘留檔，非現行運行必要檔"
            # 規則 C: 歷史資料遷移檔
            elif fname in [
                "restaurant-store-backup.json",
                "restaurant-store-before-hallucination-clean.json",
                "restaurant-store-fixed.json"
            ]:
                matched = True
                cat = "歷史遷移暫存"
                reason = "歷史餐廳資料庫清洗之過渡備份檔，現已整合入主資料庫"
            # 規則 D: 臨時除錯與測試檔案
            elif fname in [
                "test_temp.json",
                "bubble0_dump.json",
                "test_tokens_api.json",
                "_test_eval_full.js"
            ]:
                matched = True
                cat = "除錯測試暫存"
                reason = "歷史測試或單次除錯產生的暫存輸出檔"
            # 規則 E: 臨時文字與雜記檔
            elif fname in [
                "html lang=zh-TWhead.txt",
                "2026-09-12~13.txt"
            ] or fname.startswith("html lang=zh-TWhead"):
                matched = True
                cat = "臨時文字雜檔"
                reason = "歷史除錯或剪貼簿輸出雜檔"

            if matched:
                try:
                    st = os.stat(fpath)
                    size_b = st.st_size
                    mtime_str = datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M")
                except Exception:
                    size_b = 0
                    mtime_str = "未知"

                items.append({
                    "rel_path": fname,
                    "name": fname,
                    "size_bytes": size_b,
                    "size_formatted": format_file_size(size_b),
                    "mtime": mtime_str,
                    "category": cat,
                    "reason": reason,
                    "safe": True
                })

    # 2. 掃描 __pycache__ 編譯快取檔案
    pycache_dir = os.path.join(base_dir, "__pycache__")
    if os.path.exists(pycache_dir) and os.path.isdir(pycache_dir):
        for pyc in os.listdir(pycache_dir):
            if pyc.endswith(".pyc") or pyc.endswith(".pyo"):
                pyc_path = os.path.join(pycache_dir, pyc)
                if os.path.isfile(pyc_path):
                    try:
                        st = os.stat(pyc_path)
                        size_b = st.st_size
                        mtime_str = datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M")
                    except Exception:
                        size_b = 0
                        mtime_str = "未知"

                    items.append({
                        "rel_path": os.path.join("__pycache__", pyc).replace("\\", "/"),
                        "name": pyc,
                        "size_bytes": size_b,
                        "size_formatted": format_file_size(size_b),
                        "mtime": mtime_str,
                        "category": "Python 編譯快取",
                        "reason": "Python 字節碼快取 (.pyc)，執行時會自動重新生成",
                        "safe": True
                    })

    # 按類別與大小降序排序
    items.sort(key=lambda x: (x["category"], -x["size_bytes"]))
    total_size = sum(x["size_bytes"] for x in items)

    return {
        "status": "success",
        "total_files": len(items),
        "total_size_bytes": total_size,
        "total_size_formatted": format_file_size(total_size),
        "files": items
    }


def clean_redundant_files(files_to_delete, base_dir=BASE_DIR):
    """
    執行勾選的多餘檔案安全清理
    回傳字典格式與 HTTP 狀態碼
    """
    if not isinstance(files_to_delete, list):
        return {"status": "error", "message": "無效的檔案清單格式"}, 400

    scan_res = scan_redundant_files(base_dir)
    # 建立允許刪除的相對路徑集合 (嚴格白名單校驗)
    allowed_rel_paths = {f["rel_path"]: f for f in scan_res["files"]}

    deleted_count = 0
    reclaimed_bytes = 0
    deleted_files = []
    skipped_files = []

    for rel_path in files_to_delete:
        rel_norm = os.path.normpath(str(rel_path).strip()).replace("\\", "/")
        if rel_norm not in allowed_rel_paths:
            skipped_files.append({"path": rel_path, "reason": "非經掃描核准之安全多餘檔案或屬受保護核心資產"})
            continue

        full_path = os.path.abspath(os.path.join(base_dir, rel_norm))
        # 防範路徑穿越
        if not full_path.startswith(os.path.abspath(base_dir)):
            skipped_files.append({"path": rel_path, "reason": "跨目錄非法路徑穿越"})
            continue

        if os.path.exists(full_path) and os.path.isfile(full_path):
            try:
                size_b = os.path.getsize(full_path)
                os.remove(full_path)
                deleted_count += 1
                reclaimed_bytes += size_b
                deleted_files.append(rel_norm)
            except Exception as e:
                skipped_files.append({"path": rel_norm, "reason": f"刪除失敗: {str(e)}"})

    return {
        "status": "success",
        "deleted_count": deleted_count,
        "reclaimed_bytes": reclaimed_bytes,
        "reclaimed_formatted": format_file_size(reclaimed_bytes),
        "deleted_files": deleted_files,
        "skipped_files": skipped_files
    }, 200
