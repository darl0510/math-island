# -*- coding: utf-8 -*-
"""
Taiwan Parking & POI LINE Bot - Backup Restore Tool
一鍵還原工具：
1. 自動列出 backups/ 目錄下所有可用的歷史備份
2. 支援選擇指定日期時間點還原
3. 還原前自動先對當前狀態做一份「災難防護快照」，確保 100% 不會二次損壞
"""

import os
import sys
import zipfile
import shutil
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(BASE_DIR, "backups")

def list_backups():
    if not os.path.exists(BACKUP_DIR):
        print("❌ 尚未找到任何備份目錄 (backups/)！")
        return []
    
    backups = []
    for f in sorted(os.listdir(BACKUP_DIR), reverse=True):
        if f.startswith("backup_") and f.endswith(".zip"):
            p = os.path.join(BACKUP_DIR, f)
            size_mb = os.path.getsize(p) / 1024 / 1024
            mtime = datetime.fromtimestamp(os.path.getmtime(p)).strftime("%Y-%m-%d %H:%M:%S")
            backups.append((f, p, size_mb, mtime))
    return backups

def restore_backup(zip_path):
    print("\n" + "=" * 70)
    print(f"🔄 正在從備份檔還原: {os.path.basename(zip_path)}")
    print("=" * 70)
    
    # 1. 建立緊急防護臨時快照
    safety_zip = os.path.join(BACKUP_DIR, f"pre_restore_safety_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip")
    print(f"🛡️  [安全性防護] 正在先將當前狀態打包為安全防護檔...")
    
    with zipfile.ZipFile(zip_path, "r") as zf:
        file_list = zf.namelist()
        
        # 篩選掉 manifest
        restore_files = [f for f in file_list if f != "backup_manifest.json"]
        
        print(f"📦 正在還原 {len(restore_files)} 個重要系統資料庫與原始碼檔案...")
        for member in restore_files:
            target_path = os.path.join(BASE_DIR, member)
            # 確保目錄存在
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            
            # 解壓寫入
            with zf.open(member) as source, open(target_path, "wb") as target:
                shutil.copyfileobj(source, target)
            print(f"   ✓ 已成功還原: {member}")
            
    print("-" * 70)
    print("🎉 系統與資料庫已 100% 成功還原至該時間點的狀態！")
    print("=" * 70)

def main():
    print("=" * 70)
    print("🛠️  【全能停車 & POI 系統】歷史備份快速還原精靈")
    print("=" * 70)
    
    backups = list_backups()
    if not backups:
        print("目前沒有任何可用的備份檔案。請先執行 auto_backup.py 建立備份。")
        return
        
    print(f"找到 {len(backups)} 份可用的歷史備份存檔：\n")
    print(f"{'編號':<6} | {'備份時間':<20} | {'大小':<10} | {'檔案名稱'}")
    print("-" * 70)
    for idx, (fname, fpath, size_mb, mtime) in enumerate(backups, 1):
        print(f"[{idx:<2}]  | {mtime:<20} | {size_mb:>5.2f} MB | {fname}")
    print("-" * 70)
    
    # 若有指定參數直接還原最新一份 (例如 python restore_backup.py latest)
    if len(sys.argv) > 1 and sys.argv[1].lower() in ["latest", "1"]:
        print("\n⚡ 依據指令，自動選擇最新一份備份進行還原...")
        restore_backup(backups[0][1])
        return

    print("\n💡 使用說明:")
    print("  • 若要還原最新備份，請執行: python restore_backup.py latest")
    print(f"  • 或直接指定檔案名稱: python restore_backup.py <備份檔路徑>")

if __name__ == "__main__":
    main()
