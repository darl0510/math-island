# -*- coding: utf-8 -*-
"""
Taiwan Parking & POI LINE Bot - Daily Automated Backup System
全自動備份機制與三層智慧分流架構：
1. 擴增資料專屬備份 (perform_data_backup)：純粹輕量打包異動資料庫並解析筆數與校驗碼
2. 小版本輕量增量備份 (perform_version_backup)：針對修改檔案與核心原始碼，排除 9.1MB GeoJSON 靜態圖資
3. 大版本全量整包備份 (perform_major_backup)：跨重大版本號或重構時執行 100% 全量整包歸檔與鏡像覆寫
4. 統一智慧總入口 (smart_backup)：智慧依據參數或版本號自動分流
"""

import os
import sys
import time
import json
import shutil
import zipfile
import hashlib
from datetime import datetime

# 強制 UTF-8 輸出
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(BASE_DIR, "backups")
SNAPSHOT_DIR = os.path.join(BACKUP_DIR, "latest_snapshot")
RETENTION_DAYS = 20  # 輪替保留最新 20 份歷史備份

# 支援專案獨立配置 (backup_config.json)，若存在則動態載入，達成備份引擎 100% 跨專案通用
CONFIG_FILE = os.path.join(BASE_DIR, "backup_config.json")
BACKUP_FILE_EXTENSIONS = {".py", ".json", ".html", ".env", ".bat", ".txt"}
CORE_EXTENSIONS = {".py", ".env", ".bat"}
EXCLUDE_DIRS = {"__pycache__", ".git", "backups", "scratch", ".gemini", "APP_918製作語音撥放復原失敗"}
EXCLUDE_FILES = {"restaurant-store.json.bak", "parking_storage.db", "parking_storage.db-wal", "parking_storage.db-shm"}
HEAVY_STATIC_FILES = {
    "twCounty.geo.json", "restaurant-store.json", "restaurant-store-backup.json",
    "restaurant-store-fixed.json", "restaurant-store-before-hallucination-clean.json",
    "static-store.json", "tdx-onstreet-segments.json", "smart_parking_slots.json",
    "convenience-store.json", "user_analytics_report.html", "user_analytics.json",
    "youbike_snapshot.json", "spots_map.html", "error_knowledge.json"
}

if os.path.exists(CONFIG_FILE):
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as _cfg_f:
            _cfg = json.load(_cfg_f)
            if "extensions" in _cfg and isinstance(_cfg["extensions"], list):
                BACKUP_FILE_EXTENSIONS = set(_cfg["extensions"])
            if "core_extensions" in _cfg and isinstance(_cfg["core_extensions"], list):
                CORE_EXTENSIONS = set(_cfg["core_extensions"])
            if "exclude_dirs" in _cfg and isinstance(_cfg["exclude_dirs"], list):
                EXCLUDE_DIRS = set(_cfg["exclude_dirs"])
            if "exclude_files" in _cfg and isinstance(_cfg["exclude_files"], list):
                EXCLUDE_FILES = set(_cfg["exclude_files"])
            if "heavy_static" in _cfg and isinstance(_cfg["heavy_static"], list):
                HEAVY_STATIC_FILES = set(_cfg["heavy_static"])
            if "retention_days" in _cfg and isinstance(_cfg["retention_days"], int):
                RETENTION_DAYS = _cfg["retention_days"]
    except Exception as _e:
        print(f"⚠️ 載入 backup_config.json 失敗，使用預設值: {_e}")

def get_file_sha256(filepath):
    """計算檔案 SHA-256 哈希值以供日後校驗完整性"""
    sha256 = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            for block in iter(lambda: f.read(65536), b""):
                sha256.update(block)
        return sha256.hexdigest()
    except Exception:
        return ""

def collect_files_to_backup():
    """收集專案中所有珍貴的資料庫、設定檔與原始碼"""
    files_to_pack = []
    for root, dirs, files in os.walk(BASE_DIR):
        # 排除無須備份的目錄
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for f in files:
            if f in EXCLUDE_FILES or ".corrupt." in f or f.endswith(".bak"):
                continue
            ext = os.path.splitext(f)[1].lower()
            name_lower = f.lower()
            
            # 特殊檔案：.env, .gitconfig, .accessibility.properties
            is_special = name_lower in [".env", ".gitconfig", ".accessibility.properties"]
            if is_special or ext in BACKUP_FILE_EXTENSIONS:
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, BASE_DIR)
                files_to_pack.append((full_path, rel_path))
                
    return files_to_pack

def perform_backup():
    start_time = time.time()
    now_dt = datetime.now()
    timestamp_str = now_dt.strftime("%Y-%m-%d_%H%M%S")
    
    os.makedirs(BACKUP_DIR, exist_ok=True)
    os.makedirs(SNAPSHOT_DIR, exist_ok=True)
    
    zip_filename = f"backup_{timestamp_str}.zip"
    zip_filepath = os.path.join(BACKUP_DIR, zip_filename)
    
    print("=" * 70)
    print(f"🛡️  [全能停車 & POI 系統] 正在執行每日自動化資料安全備份...")
    print(f"⏰ 備份時間: {now_dt.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    files_to_pack = collect_files_to_backup()
    manifest = {
        "backup_time": now_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "version": "1.2.0-secure",
        "backup_type": "daily_full_backup",
        "total_files": len(files_to_pack),
        "files": []
    }
    
    total_uncompressed_bytes = 0
    print("📦 正在掃描並打包重要資料資產:")
    
    with zipfile.ZipFile(zip_filepath, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for full_path, rel_path in sorted(files_to_pack, key=lambda x: x[1]):
            try:
                f_size = os.path.getsize(full_path)
                f_sha = get_file_sha256(full_path)
                total_uncompressed_bytes += f_size
                
                # 寫入 Zip
                zipf.write(full_path, arcname=rel_path)
                
                # 同步更新 latest_snapshot 鏡像資料夾（免解壓即可複製）
                target_snap_path = os.path.join(SNAPSHOT_DIR, rel_path)
                os.makedirs(os.path.dirname(target_snap_path), exist_ok=True)
                shutil.copy2(full_path, target_snap_path)
                
                manifest["files"].append({
                    "path": rel_path,
                    "size_bytes": f_size,
                    "sha256": f_sha
                })
                
                # 重要資料庫標記
                tag = "⭐ [核心資料庫]" if "restaurant" in rel_path or "parking" in rel_path or "static" in rel_path or "toilet" in rel_path else "  [系統代碼]"
                print(f"   {tag} {rel_path} ({f_size / 1024:.1f} KB)")
            except Exception as e:
                print(f"   ⚠️ 跳過檔案 {rel_path}: {e}")

        # 寫入備份清單 (Manifest) 到 Zip 內部
        zipf.writestr("backup_manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))

    zip_size = os.path.getsize(zip_filepath)
    elapsed = time.time() - start_time
    
    # 寫入外部最新備份日誌記錄
    log_path = os.path.join(BACKUP_DIR, "backup_history.log")
    with open(log_path, "a", encoding="utf-8") as lf:
        lf.write(f"[{now_dt.strftime('%Y-%m-%d %H:%M:%S')}] 建立備份 {zip_filename} | 檔案數: {len(files_to_pack)} | 原始大小: {total_uncompressed_bytes / 1024 / 1024:.2f} MB -> 壓縮大小: {zip_size / 1024 / 1024:.2f} MB | 耗時: {elapsed:.2f}s\n")

    # 清理舊備份 (只保留最新 RETENTION_DAYS 份)
    cleanup_old_backups(max_keep=RETENTION_DAYS)
    
    print("-" * 70)
    print(f"✅ 備份成功完成！")
    print(f"📁 壓縮歸檔位置: {zip_filepath}")
    print(f"📂 即時鏡像位置: {SNAPSHOT_DIR}")
    print(f"📊 備份統計: 共 {len(files_to_pack)} 個檔案 | 原始 {total_uncompressed_bytes / 1024 / 1024:.2f} MB ➔ 壓縮後 {zip_size / 1024 / 1024:.2f} MB (省下 {(1 - zip_size/total_uncompressed_bytes)*100:.1f}% 空間)")
    print(f"⏱️ 耗時: {elapsed:.2f} 秒")
    print("=" * 70)

def cleanup_old_backups(max_keep: int = RETENTION_DAYS):
    """自動刪除超過保留天數的舊壓縮檔，避免磁碟爆滿"""
    try:
        all_zips = []
        if not os.path.exists(BACKUP_DIR):
            return
        for f in os.listdir(BACKUP_DIR):
            if f.startswith("backup_") and f.endswith(".zip"):
                p = os.path.join(BACKUP_DIR, f)
                all_zips.append((p, os.path.getmtime(p)))
                
        all_zips.sort(key=lambda x: x[1], reverse=True)
        if len(all_zips) > max_keep:
            to_remove = all_zips[max_keep:]
            print(f"🧹 自動清理舊備份（保留最新 {max_keep} 份）:")
            for p, _ in to_remove:
                try:
                    os.remove(p)
                    print(f"   🗑️ 已移除舊備份: {os.path.basename(p)}")
                except Exception:
                    pass
    except Exception as e:
        print(f"⚠️ 清理舊備份時發生錯誤: {e}")

def is_major_version(version_str: str) -> bool:
    """
    智慧判定是否為大版本升級 (Major Version)：
    - 例如 v3.0.0, v3.0, 3.0.0 等
    - 或比對歷史備份，若主版號跳號 (如 2 -> 3) 則判定為 True
    """
    if not version_str:
        return False
    v = str(version_str).strip().lower().lstrip("v")
    parts = v.split(".")
    
    # 形式如 3.0 或 3.0.0（第二位與第三位為 0）即視為重大里程碑大版本
    if len(parts) >= 2 and parts[0].isdigit():
        if parts[1] == "0" and (len(parts) == 2 or parts[2] == "0"):
            return True
            
    # 比對 backups/ 目錄下最新的歷史版本
    try:
        if os.path.exists(BACKUP_DIR):
            for f in sorted(os.listdir(BACKUP_DIR), reverse=True):
                if f.startswith("backup_v") and "_" in f:
                    # 取得歷史版本號，例如 backup_v2.31.0_...
                    prev_ver_part = f.split("_")[1].lstrip("v")
                    prev_major = prev_ver_part.split(".")[0]
                    curr_major = parts[0]
                    if prev_major.isdigit() and curr_major.isdigit():
                        if int(curr_major) > int(prev_major):
                            return True
                    break
    except Exception:
        pass
        
    return False

def perform_major_backup(version_str: str = "v_major", note: str = "") -> dict:
    """
    【3. 大版本整包備份】Full Major Version Backup
    - 當跨重大版本升級（如 v3.0.0）時，執行 100% 全量整包備份
    - 包含所有大型 GeoJSON 圖資、全部核心資料庫、完整原始碼、設定檔與儀表板
    - 同步更新 backups/latest_snapshot/ 即時鏡像
    """
    start_time = time.time()
    now_dt = datetime.now()
    timestamp_str = now_dt.strftime("%Y-%m-%d_%H%M%S")
    clean_ver = str(version_str).strip().replace("/", "_").replace("\\", "_")
    if clean_ver and not clean_ver.startswith("v"):
        clean_ver = f"v{clean_ver}"
        
    os.makedirs(BACKUP_DIR, exist_ok=True)
    os.makedirs(SNAPSHOT_DIR, exist_ok=True)
    
    zip_filename = f"backup_MAJOR_{clean_ver}_{timestamp_str}.zip"
    zip_filepath = os.path.join(BACKUP_DIR, zip_filename)
    
    files_to_pack = collect_files_to_backup()
    manifest = {
        "backup_time": now_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "version": clean_ver,
        "backup_type": "full_major_backup",
        "note": note or "重大版本全量整包備份 (含全部巨型圖資與資料庫)",
        "total_files": len(files_to_pack),
        "files": []
    }
    
    total_uncompressed_bytes = 0
    with zipfile.ZipFile(zip_filepath, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for full_path, rel_path in sorted(files_to_pack, key=lambda x: x[1]):
            try:
                f_size = os.path.getsize(full_path)
                f_sha = get_file_sha256(full_path)
                total_uncompressed_bytes += f_size
                zipf.write(full_path, arcname=rel_path)
                
                # 同步更新 latest_snapshot
                target_snap_path = os.path.join(SNAPSHOT_DIR, rel_path)
                os.makedirs(os.path.dirname(target_snap_path), exist_ok=True)
                shutil.copy2(full_path, target_snap_path)
                
                manifest["files"].append({
                    "path": rel_path,
                    "size_bytes": f_size,
                    "sha256": f_sha
                })
            except Exception:
                pass
        zipf.writestr("backup_manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
        
    zip_size = os.path.getsize(zip_filepath)
    elapsed = time.time() - start_time
    
    log_path = os.path.join(BACKUP_DIR, "backup_history.log")
    with open(log_path, "a", encoding="utf-8") as lf:
        lf.write(f"[{now_dt.strftime('%Y-%m-%d %H:%M:%S')}] 建立重大版本整包備份 ({clean_ver}) {zip_filename} | 檔案數: {len(files_to_pack)} | 原始: {total_uncompressed_bytes/1024/1024:.2f} MB -> 壓縮: {zip_size/1024/1024:.2f} MB | 耗時: {elapsed:.2f}s\n")
        
    cleanup_old_backups(max_keep=20)
    
    res = {
        "status": "SUCCESS",
        "backup_type": "full_major_backup",
        "version": clean_ver,
        "zip_filename": zip_filename,
        "zip_path": zip_filepath,
        "files_count": len(files_to_pack),
        "compressed_size_mb": round(zip_size / 1024 / 1024, 2),
        "elapsed_seconds": round(elapsed, 2)
    }
    print(f"🏛️  [Major Version Backup] 已為 {clean_ver} 建立全量整包重大版本備份: {zip_filename} ({res['compressed_size_mb']} MB, {len(files_to_pack)} 個檔案, {elapsed:.2f}s)", flush=True)
    return res

def perform_data_backup(data_files: list = None, note: str = "") -> dict:
    """
    【1. 擴增資料專屬備份】Data Expansion Backup
    - 當擴增/同步景點、停車場或公廁資料庫時，專門針對被擴增的資料檔案進行獨立備份
    - 精準記錄資料庫筆數、大小與校驗碼，輕量高效，不混雜程式碼
    """
    start_time = time.time()
    now_dt = datetime.now()
    timestamp_str = now_dt.strftime("%Y-%m-%d_%H%M%S")
    
    os.makedirs(BACKUP_DIR, exist_ok=True)
    
    # 預設支援的核心資料庫列表
    all_known_data = [
        "restaurant-store.json", "static-store.json", "toilet-store.json",
        "convenience-store.json", "okinawa-store.json", "hokkaido-store.json",
        "kyoto-store.json", "landmarks.json", "parking_storage.db"
    ]
    
    target_files = []
    if data_files:
        for f in data_files:
            full_p = os.path.join(BASE_DIR, f) if not os.path.isabs(f) else f
            if os.path.exists(full_p):
                rel_p = os.path.relpath(full_p, BASE_DIR)
                target_files.append((full_p, rel_p))
    else:
        # 自動收集近期有修改或存在的資料庫
        for f in all_known_data:
            full_p = os.path.join(BASE_DIR, f)
            if os.path.exists(full_p):
                target_files.append((full_p, f))
                
    if not target_files:
        print("⚠️ 未找到任何需要備份的擴增資料庫檔案！")
        return {"status": "FAILED", "reason": "No data files found"}
        
    tag = os.path.splitext(target_files[0][1])[0].replace("-", "_") if len(target_files) == 1 else "multi_data"
    zip_filename = f"backup_data_{tag}_{timestamp_str}.zip"
    zip_filepath = os.path.join(BACKUP_DIR, zip_filename)
    
    manifest = {
        "backup_time": now_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "backup_type": "data_expansion",
        "note": note or "擴增資料專屬備份",
        "total_files": len(target_files),
        "files": []
    }
    
    total_uncompressed_bytes = 0
    with zipfile.ZipFile(zip_filepath, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for full_p, rel_p in target_files:
            try:
                f_size = os.path.getsize(full_p)
                f_sha = get_file_sha256(full_p)
                total_uncompressed_bytes += f_size
                zipf.write(full_p, arcname=rel_p)
                
                # 統計 JSON 筆數（若為 json 檔案）
                item_count = None
                if rel_p.endswith(".json"):
                    try:
                        with open(full_p, "r", encoding="utf-8") as jf:
                            data = json.load(jf)
                            if isinstance(data, list):
                                item_count = len(data)
                            elif isinstance(data, dict):
                                if "records" in data and isinstance(data["records"], list):
                                    item_count = len(data["records"])
                                elif "features" in data and isinstance(data["features"], list):
                                    item_count = len(data["features"])
                                elif "total_count" in data and isinstance(data["total_count"], int):
                                    item_count = data["total_count"]
                                else:
                                    item_count = len(data.keys())
                    except Exception:
                        pass
                        
                manifest["files"].append({
                    "path": rel_p,
                    "size_bytes": f_size,
                    "sha256": f_sha,
                    "item_count": item_count
                })
            except Exception as e:
                print(f"⚠️ 跳過資料檔 {rel_p}: {e}")
                
        zipf.writestr("backup_manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
        
    zip_size = os.path.getsize(zip_filepath)
    elapsed = time.time() - start_time
    
    log_path = os.path.join(BACKUP_DIR, "backup_history.log")
    with open(log_path, "a", encoding="utf-8") as lf:
        lf.write(f"[{now_dt.strftime('%Y-%m-%d %H:%M:%S')}] 建立擴增資料專屬備份 {zip_filename} | 檔案數: {len(target_files)} | 原始: {total_uncompressed_bytes/1024/1024:.2f} MB -> 壓縮: {zip_size/1024:.1f} KB | 耗時: {elapsed:.2f}s\n")
        
    cleanup_old_backups(max_keep=20)
    
    res = {
        "status": "SUCCESS",
        "backup_type": "data_expansion",
        "zip_filename": zip_filename,
        "zip_path": zip_filepath,
        "files_count": len(target_files),
        "compressed_size_kb": round(zip_size / 1024, 1),
        "elapsed_seconds": round(elapsed, 2)
    }
    print(f"📊 [Data Backup] 已完成擴增資料專屬備份: {zip_filename} ({res['compressed_size_kb']} KB, {len(target_files)} 個檔案, {elapsed:.2f}s)", flush=True)
    return res

def perform_version_backup(version_str: str = "latest", modified_files: list = None, note: str = "", is_major: bool = None) -> dict:
    """
    【2. 小版本輕量備份 & 智慧分流】
    - 當為小版本 (Patch / Minor): 聚焦本次修改/新增檔案、核心原始碼與設定文檔，排除未修改之巨型 GeoJSON/靜態庫 (<0.2s, 數百 KB)
    - 若判定或指定為大版本 (is_major=True 或主版號跳號): 自動分流至 perform_major_backup 執行全量整包備份
    """
    # 智慧檢測是否為大版本
    if is_major is True or (is_major is None and is_major_version(version_str)):
        return perform_major_backup(version_str=version_str, note=note)
        
    start_time = time.time()
    now_dt = datetime.now()
    timestamp_str = now_dt.strftime("%Y-%m-%d_%H%M%S")
    clean_ver = str(version_str).strip().replace("/", "_").replace("\\", "_")
    if clean_ver and not clean_ver.startswith("v"):
        clean_ver = f"v{clean_ver}"
    if not clean_ver:
        clean_ver = "v_patch"
        
    os.makedirs(BACKUP_DIR, exist_ok=True)
    os.makedirs(SNAPSHOT_DIR, exist_ok=True)
    
    zip_filename = f"backup_{clean_ver}_{timestamp_str}.zip"
    zip_filepath = os.path.join(BACKUP_DIR, zip_filename)
    
    files_to_pack = []
    seen_rel = set()
    
    # 1. 若有指定本次修改或新增檔案，優先全數納入
    if modified_files:
        for f in modified_files:
            full_p = os.path.join(BASE_DIR, f) if not os.path.isabs(f) else f
            if os.path.exists(full_p):
                rel_p = os.path.relpath(full_p, BASE_DIR)
                if rel_p not in seen_rel:
                    seen_rel.add(rel_p)
                    files_to_pack.append((full_p, rel_p))
                    
    # 2. 自動補充核心程式碼、設定與文檔（確保版本還原時具備完整執行能力）
    core_extensions = CORE_EXTENSIONS
    core_docs = {"AGENTS.md", "PROJECT_HANDOVER.md", "MILESTONE_CAPACITY_PLAN.md"}
    heavy_static = HEAVY_STATIC_FILES
    
    for root, dirs, files in os.walk(BASE_DIR):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for f in files:
            if f in EXCLUDE_FILES or ".corrupt." in f or f.endswith(".bak"):
                continue
            ext = os.path.splitext(f)[1].lower()
            rel_path = os.path.relpath(os.path.join(root, f), BASE_DIR)
            if rel_path in seen_rel:
                continue
            if f in heavy_static and (not modified_files or f not in modified_files):
                continue  # 輕量化排除未修改之巨型靜態檔案
            
            # 加入條件：所有 py 檔案、核心 doc、重要設定檔或近期 6 小時內修改過的 json/html
            is_core_code = ext in core_extensions or f in core_docs or f in [".env", ".gitconfig"]
            is_recent_mod = False
            full_p = os.path.join(root, f)
            try:
                if (now_dt.timestamp() - os.path.getmtime(full_p)) < 21600 and ext in BACKUP_FILE_EXTENSIONS:
                    is_recent_mod = True
            except Exception:
                pass
                
            if is_core_code or is_recent_mod:
                seen_rel.add(rel_path)
                files_to_pack.append((full_p, rel_path))

    manifest = {
        "backup_time": now_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "version": clean_ver,
        "backup_type": "lightweight_version_backup",
        "note": note or "小版本輕量化備份 (排除大型未修改靜態庫)",
        "total_files": len(files_to_pack),
        "files": []
    }
    
    total_uncompressed_bytes = 0
    with zipfile.ZipFile(zip_filepath, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for full_path, rel_path in sorted(files_to_pack, key=lambda x: x[1]):
            try:
                f_size = os.path.getsize(full_path)
                f_sha = get_file_sha256(full_path)
                total_uncompressed_bytes += f_size
                zipf.write(full_path, arcname=rel_path)
                
                # 同步更新 latest_snapshot
                target_snap_path = os.path.join(SNAPSHOT_DIR, rel_path)
                os.makedirs(os.path.dirname(target_snap_path), exist_ok=True)
                shutil.copy2(full_path, target_snap_path)
                
                manifest["files"].append({
                    "path": rel_path,
                    "size_bytes": f_size,
                    "sha256": f_sha
                })
            except Exception:
                pass
        zipf.writestr("backup_manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
        
    zip_size = os.path.getsize(zip_filepath)
    elapsed = time.time() - start_time
    
    # 寫入備份紀錄
    log_path = os.path.join(BACKUP_DIR, "backup_history.log")
    with open(log_path, "a", encoding="utf-8") as lf:
        lf.write(f"[{now_dt.strftime('%Y-%m-%d %H:%M:%S')}] 建立輕量版本備份 ({clean_ver}) {zip_filename} | 檔案數: {len(files_to_pack)} | 原始: {total_uncompressed_bytes/1024/1024:.2f} MB -> 壓縮: {zip_size/1024:.1f} KB | 耗時: {elapsed:.2f}s\n")
        
    # 執行交接手冊行數自動巡檢與瘦身 (常態保留最新 3 版 / <= 280 行防線)
    try:
        check_and_trim_handover(max_lines=280, keep_recent=3)
    except Exception as e:
        print(f"[Handover Auto-Archive Warning] 自動精簡失敗: {e}", flush=True)

    cleanup_old_backups(max_keep=20)
    
    res = {
        "status": "SUCCESS",
        "backup_type": "lightweight_version_backup",
        "version": clean_ver,
        "zip_filename": zip_filename,
        "zip_path": zip_filepath,
        "files_count": len(files_to_pack),
        "compressed_size_kb": round(zip_size / 1024, 1),
        "elapsed_seconds": round(elapsed, 2)
    }
    print(f"📦 [Version Backup] 已為 {clean_ver} 建立輕量化版本備份: {zip_filename} ({res['compressed_size_kb']} KB, {len(files_to_pack)} 個檔案, {elapsed:.2f}s)", flush=True)
    return res

def check_and_trim_handover(max_lines: int = 280, keep_recent: int = 3, dry_run: bool = False) -> dict:
    """
    📜 交接手冊 Token 最佳化與自動封存引擎 (Handover Auto-Archive Engine)
    - 雙軌檢查：常態保留最新 keep_recent 個版本 (預設 3 個) 或 總行數超過 max_lines (預設 280 行)
    - 超標時自動將舊版詳細記錄無損移入 docs/CHANGELOG_ARCHIVE.md
    - 在 PROJECT_HANDOVER.md 尾端自動維護精簡速查表 (Compact Milestone Summary Table)
    """
    handover_path = os.path.join(BASE_DIR, "PROJECT_HANDOVER.md")
    docs_dir = os.path.join(BASE_DIR, "docs")
    archive_path = os.path.join(docs_dir, "CHANGELOG_ARCHIVE.md")

    if not os.path.exists(handover_path):
        return {"status": "SKIPPED", "reason": "PROJECT_HANDOVER.md not found"}

    with open(handover_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    total_lines = len(lines)

    # 尋找更新歷程區塊開頭
    changelog_header_idx = -1
    for i, line in enumerate(lines):
        clean = line.strip()
        if (clean.startswith("## 🌟 近期重大功能更新歷程") or 
            clean.startswith("## 📝 近期版本異動記錄") or 
            clean.startswith("## 🚀 待辦事項推進看板") or
            (clean.startswith("## ") and "Changelog" in clean)):
            changelog_header_idx = i
            break

    if changelog_header_idx == -1:
        return {"status": "FAILED", "reason": "Changelog header not found"}

    header_part = lines[:changelog_header_idx + 1]
    body_part = lines[changelog_header_idx + 1:]

    # 尋找所有版本標題位置
    version_indices = []
    for i, line in enumerate(body_part):
        s = line.strip()
        if s.startswith("### 【v") or s.startswith("## 【v") or (s.startswith("### 🟢") and "(v" in s):
            version_indices.append(i)

    # 雙軌檢查：版本數超標 或 行數超標
    needs_trim = (len(version_indices) > keep_recent) or (total_lines > max_lines)

    if not needs_trim:
        return {
            "status": "HEALTHY",
            "lines": total_lines,
            "version_count": len(version_indices),
            "max_lines": max_lines,
            "keep_recent": keep_recent,
            "trimmed": False
        }

    # 計算分割點
    if len(version_indices) <= 1:
        return {"status": "HEALTHY", "lines": total_lines, "version_count": len(version_indices), "trimmed": False}

    trim_keep = keep_recent
    if trim_keep >= len(version_indices):
        trim_keep = max(1, len(version_indices) // 2)

    split_idx = version_indices[trim_keep]
    recent_versions = body_part[:split_idx]

    # 尋找舊版中是否有 milestone table
    milestones_start = -1
    for i, line in enumerate(body_part[split_idx:]):
        if "歷史版本封存精簡速查" in line or "Historical Milestones Summary" in line:
            milestones_start = split_idx + i
            break

    if milestones_start != -1:
        archive_content = body_part[split_idx:milestones_start]
        milestone_table_lines = body_part[milestones_start:]
    else:
        archive_content = body_part[split_idx:]
        milestone_table_lines = []

    if not dry_run:
        os.makedirs(docs_dir, exist_ok=True)
        # 讀取現有封存檔案
        existing_archive = ""
        if os.path.exists(archive_path):
            with open(archive_path, "r", encoding="utf-8") as af:
                existing_archive = af.read()

        new_archive_text = "".join(archive_content).strip()
        if new_archive_text:
            if existing_archive:
                # 檢查若首個版本尚未收錄，則插入至現有封存標題下方
                first_ver_title = archive_content[0].strip() if archive_content else ""
                if first_ver_title and first_ver_title not in existing_archive:
                    lines_existing = existing_archive.splitlines(keepends=True)
                    insert_idx = len(lines_existing)
                    for idx, el in enumerate(lines_existing):
                        if el.strip() == "---":
                            insert_idx = idx + 1
                            break
                    combined_archive = "".join(lines_existing[:insert_idx]) + "\n\n" + new_archive_text + "\n\n" + "".join(lines_existing[insert_idx:])
                    with open(archive_path, "w", encoding="utf-8") as af:
                        af.write(combined_archive)
            else:
                archive_header = (
                    "# 📦 生活設施與自駕導航系統 - 歷史版本更新檔案庫 (Changelog Archive)\n\n"
                    "> **說明**：本檔案由系統自動歸檔，完整留存專案自 v1.0 起之所有歷史重大重構、演進歷程與架構決策紀錄，供隨時查閱與審計。\n"
                    "> **主交接文檔**：[`PROJECT_HANDOVER.md`](../PROJECT_HANDOVER.md)\n\n"
                    "---\n\n"
                )
                with open(archive_path, "w", encoding="utf-8") as af:
                    af.write(archive_header + new_archive_text + "\n")

        # 若 milestone table 不存在，產生預設精簡表格
        if not milestone_table_lines:
            milestone_table_lines = [
                "### 📦 歷史版本封存精簡速查 (Historical Milestones Summary)\n\n",
                "> 💡 為維持 Token 最佳化，最新版本以外之過往詳細技術演進已無損封存至 [`docs/CHANGELOG_ARCHIVE.md`](docs/CHANGELOG_ARCHIVE.md)。以下為核心里程碑速查：\n\n",
                "| 版本區間 | 發布日期 | 核心亮點演進摘要 | 完整詳細紀錄 |\n",
                "| :--- | :--- | :--- | :--- |\n",
                "| **v2.45.0** | 2026-09-20 | 兩層式收藏總覽 ✕ 動態分頁神器 ✕ 終身尊榮 VIP (元大 806) | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |\n",
                "| **v2.44.x** | 2026-09-20 | 生活助手新版小報 ✕ 收藏雲端 Gist 漫遊 ✕ 50筆防爆上限 | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |\n",
                "| **v2.43.x** | 2026-09-20 | 群組共享模式 ✕ 個人收藏清單 ✕ LINE Flex URI 溢出根治 | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |\n",
                "| **v2.42.x** | 2026-09-20 | 技能化解耦落地 ✕ AGENTS.md 瘦身 ✕ 關鍵字脫敏日誌與別名演化 | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |\n",
                "| **v2.41.0** | 2026-09-20 | 平日/假日尖峰雙軌 DAU 模型、7日平均活躍度、報表語法修復 | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |\n",
                "| **v2.40.2** | 2026-09-19 | Render 部署防禦性安全匯入、自然語言費率正則修復 | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |\n",
                "| **v2.30~37** | 2026-09-19 | 大字版視覺舒適校準、相片備註優先、SQLite WAL極速還原、廣告成效 | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |\n",
                "| **v2.20~29** | 2026-09-17 | 日本自駕海外特區、車友回報激勵卡片、原生行事曆鬧鐘、Open-Meteo | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |\n",
                "| **v2.13.0** | 2026-09-14 | 🏛️ 全系統無損平鋪模組化重構 (徹底消滅 8,215 行巨石單體) | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |\n",
                "| **v1.0~2.12** | 2026-09-12 | 全台 22 縣市 OpenData ✕ TDX 即時在席、小吃盲盒、公廁雷達、初始原型 | [查閱檔案](docs/CHANGELOG_ARCHIVE.md) |\n\n",
                "> 📚 **完整歷史文檔**：如需深入查閱任一歷史版本之完整工程日誌與修復細節，請參閱 [`docs/CHANGELOG_ARCHIVE.md`](docs/CHANGELOG_ARCHIVE.md)。\n"
            ]

        # 整理 recent_versions 尾端分隔線
        recent_str = "".join(recent_versions).rstrip()
        if not recent_str.endswith("---"):
            recent_str += "\n\n---"

        new_handover_lines = header_part + [recent_str + "\n\n"] + milestone_table_lines
        with open(handover_path, "w", encoding="utf-8") as f:
            f.writelines(new_handover_lines)

        new_total_lines = len(new_handover_lines)
        print(f"📜 [Handover Auto-Archive] 成功精簡 PROJECT_HANDOVER.md: {total_lines} 行 -> {new_total_lines} 行 (保留最新 {trim_keep} 版，已將舊版封存至 docs/CHANGELOG_ARCHIVE.md)", flush=True)
        return {
            "status": "TRIMMED",
            "old_lines": total_lines,
            "new_lines": new_total_lines,
            "retained_versions": trim_keep,
            "trimmed": True,
            "archive_path": archive_path
        }
    else:
        return {
            "status": "DRY_RUN_NEEDS_TRIM",
            "old_lines": total_lines,
            "version_count": len(version_indices),
            "trimmed": True
        }

def smart_backup(version_str: str = None, modified_files: list = None, data_files: list = None, is_major: bool = None, note: str = "") -> dict:
    """
    【三層智慧分流備份總入口】
    1. 擴增資料時 (有 data_files 且無 version_str): 執行 perform_data_backup
    2. 小版本改版 (version_str 為小版本/修訂號): 執行 perform_version_backup (輕量增量備份)
    3. 大版本升級 (is_major=True 或主版號躍升): 執行 perform_major_backup (全量整包備份)
    4. 無參數調用: 執行每日/手動全量備份 perform_backup
    """
    if data_files and not version_str:
        return perform_data_backup(data_files=data_files, note=note)
    elif version_str:
        return perform_version_backup(version_str=version_str, modified_files=modified_files, note=note, is_major=is_major)
    else:
        perform_backup()
        return {"status": "SUCCESS", "backup_type": "daily_full_backup"}

if __name__ == "__main__":
    # 若有命令列參數，例如 python auto_backup.py v3.0.0
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg in ["--data", "-d"]:
            data_targets = sys.argv[2:] if len(sys.argv) > 2 else None
            perform_data_backup(data_files=data_targets)
        elif arg in ["--trim-handover", "--trim", "-t"]:
            res = check_and_trim_handover()
            print(json.dumps(res, ensure_ascii=False, indent=2))
        else:
            perform_version_backup(version_str=arg)
    else:
        perform_backup()

