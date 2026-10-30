# -*- coding: utf-8 -*-
"""
💾 專案智慧備份系統總門面 (Daily Automated Backup Facade)
- 平鋪架構解耦：核心備份執行委託 tools/backup_engine.py
- 交接手冊修剪：封存邏輯委託 tools/handover_trimmer.py
- 100% 零破壞向下相容：保留所有公開常數、變數與對外符號
"""

import os
import sys
import json

# 強制 UTF-8 輸出
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding='utf-8')

# 智慧相容路徑探測：確保平鋪架構子模組於任何工作目錄均能正確匯入
_this_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_this_dir)

_candidates = [
    _this_dir,
    _parent_dir,
    os.path.join(_parent_dir, "project-command-center", "tools"),
    os.path.join(_parent_dir, "project-command-center"),
    r"D:\專案\project-command-center\tools",
    r"D:\專案\project-command-center",
]
for _p in _candidates:
    if os.path.exists(_p) and _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from tools.backup_engine import (
        BASE_DIR,
        BACKUP_DIR,
        SNAPSHOT_DIR,
        RETENTION_DAYS,
        CONFIG_FILE,
        BACKUP_FILE_EXTENSIONS,
        CORE_EXTENSIONS,
        EXCLUDE_DIRS,
        EXCLUDE_FILES,
        HEAVY_STATIC_FILES,
        get_file_sha256,
        collect_files_to_backup,
        perform_backup,
        cleanup_old_backups,
        is_major_version,
        perform_major_backup,
        perform_data_backup,
        perform_version_backup,
    )
    from tools.handover_trimmer import check_and_trim_handover
except ImportError:
    from backup_engine import (
        BASE_DIR,
        BACKUP_DIR,
        SNAPSHOT_DIR,
        RETENTION_DAYS,
        CONFIG_FILE,
        BACKUP_FILE_EXTENSIONS,
        CORE_EXTENSIONS,
        EXCLUDE_DIRS,
        EXCLUDE_FILES,
        HEAVY_STATIC_FILES,
        get_file_sha256,
        collect_files_to_backup,
        perform_backup,
        cleanup_old_backups,
        is_major_version,
        perform_major_backup,
        perform_data_backup,
        perform_version_backup,
    )
    from handover_trimmer import check_and_trim_handover


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
