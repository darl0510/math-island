# -*- coding: utf-8 -*-
"""
🔄 Antigravity 跨專案 Google 雲端硬碟雙向增量同步管家
核心規格：
- 超高速 Robocopy /XO 增量鏡像 (只覆蓋較新檔案，跳過未修改檔案，節省 99% 傳輸時間與雲端頻寬)
- 支援動態配置檔 cloud_sync_config.json，隨時自由增減同步專案清單
- 雙向自適應偵測：家中電腦 ⇋ 公司電腦 ⇋ Google 雲端硬碟 (G:\\我的雲端硬碟)
- 一鍵桌面捷徑建立與雲端根目錄自動鏡像工具
"""

import os
import sys
import time
import json
import subprocess
from pathlib import Path

# 強制 UTF-8 輸出，避免 Windows 終端亂碼
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding='utf-8')

CONFIG_FILENAME = "cloud_sync_config.json"
CURRENT_SCRIPT_DIR = Path(__file__).resolve().parent

class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    RESET = '\033[0m'

def colorize(text, color):
    return f"{color}{text}{Colors.RESET}"

def get_default_config():
    """預設同步配置"""
    return {
        "note": "☁️ Google 雲端硬碟雙向增量同步設定檔 (可在此自由增減要同步的專案名稱)",
        "enabled_projects": [
            "2026EPANews - 開發",
            "APP_9181734",
            "MOENV_Gen2",
            "MOENV_NEWS",
            "anti-gambling-trader-tw-main",
            "rea-lab",
            "scripts",
            "timehut",
            "tw_fin_invest"
        ],
        "local_base_candidates": [
            "C:/Users/達爾",
            "D:/WEB",
            "C:/WEB",
            "D:/",
            "C:/"
        ],
        "cloud_base_candidates": [
            "G:/我的雲端硬碟",
            "G:/My Drive",
            "H:/我的雲端硬碟",
            "H:/My Drive",
            "D:/我的雲端硬碟",
            "D:/My Drive"
        ],
        "exclude_dirs": [
            "__pycache__",
            ".pytest_cache",
            "$RECYCLE.BIN",
            "backups",
            "token_and_backup_toolkit",
            ".venv",
            "venv",
            "node_modules",
            ".git"
        ],
        "exclude_files": [
            "*.tmp",
            "~$*",
            "Thumbs.db",
            "desktop.ini"
        ],
        "mirror_sync_tools_to_cloud_root": True
    }

def find_config_path():
    """尋找設定檔位置 (優先同目錄，其次上層目錄)"""
    candidates = [
        CURRENT_SCRIPT_DIR / CONFIG_FILENAME,
        CURRENT_SCRIPT_DIR.parent / CONFIG_FILENAME,
        Path.cwd() / CONFIG_FILENAME
    ]
    for p in candidates:
        if p.exists():
            return p
    return CURRENT_SCRIPT_DIR / CONFIG_FILENAME

def load_config():
    """載入設定檔，若不存在則自動生成"""
    cfg_path = find_config_path()
    if not cfg_path.exists():
        default_cfg = get_default_config()
        save_config(default_cfg, cfg_path)
        return default_cfg, cfg_path
    try:
        with open(cfg_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
            # 補齊預設鍵值
            defaults = get_default_config()
            for k, v in defaults.items():
                if k not in cfg:
                    cfg[k] = v
            return cfg, cfg_path
    except Exception as e:
        print(colorize(f"⚠️ 讀取 {cfg_path} 失敗 ({e})，使用預設配置", Colors.YELLOW))
        return get_default_config(), cfg_path

def save_config(cfg, cfg_path=None):
    """保存設定檔"""
    if not cfg_path:
        cfg_path = find_config_path()
    try:
        with open(cfg_path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(colorize(f"❌ 儲存設定檔失敗: {e}", Colors.RED))
        return False

def detect_local_base(cfg):
    """
    自動偵測本機專案上層目錄 (例如 D:\\WEB)
    支援從候選路徑、腳本所在位置或常用目錄判斷
    """
    enabled = cfg.get("enabled_projects", [])
    candidates = []

    # 1. 檢查使用者配置的候選目錄
    for c in cfg.get("local_base_candidates", []):
        candidates.append(Path(c))

    # 2. 腳本所在的父目錄與祖父目錄
    candidates.append(CURRENT_SCRIPT_DIR)
    candidates.append(CURRENT_SCRIPT_DIR.parent)

    # 3. 使用者家目錄
    candidates.append(Path.home())
    candidates.append(Path("C:/Users/達爾"))

    # 優先尋找「包含已啟用專案資料夾」的目錄，且該磁碟不是雲端虛擬硬碟 (排除 G:)
    for p in candidates:
        if p.exists() and p.drive.upper() not in ["G:", "H:"]:
            for name in enabled:
                if (p / name).exists() and (p / name).is_dir():
                    return p.resolve()

    # 次級匹配：只要候選目錄存在且是常見專案根目錄
    for p in candidates:
        if p.exists() and p.drive.upper() in ["D:", "C:"] and p.name.upper() == "WEB":
            return p.resolve()

    return Path("D:/WEB").resolve() if Path("D:/WEB").exists() else Path.home().resolve()

def get_all_candidate_local_bases(cfg: dict) -> list:
    """取得所有可能的本機根目錄候選清單"""
    bases = []
    for c in cfg.get("local_base_candidates", []):
        p = Path(c)
        if p not in bases:
            bases.append(p)
    for p in [CURRENT_SCRIPT_DIR.parent, CURRENT_SCRIPT_DIR, Path("C:/Users/達爾"), Path.home(), Path("D:/WEB"), Path("C:/WEB"), Path("D:/"), Path("C:/")]:
        if p not in bases:
            bases.append(p)
    return bases

def find_project_local_path(name: str, fallback_local_base: Path, cfg: dict) -> Path:
    """
    智慧搜尋專案在本機的具體路徑：
    1. 若 fallback_local_base / name 存在，直接採用
    2. 檢查 projects_registry.json 登記之路徑是否存在
    3. 搜尋所有候選基底目錄 (C:/Users/達爾, D:/WEB 等)，若存在則採用
    4. 若本地皆不存在 (例如從雲端全新下載還原)：
       - 若 projects_registry.json 有登記且其父目錄存在，採用登記路徑
       - 否則採用 fallback_local_base / name
    """
    # 1. 直接檢查 fallback_local_base
    if fallback_local_base:
        direct = fallback_local_base / name
        if direct.exists() and direct.is_dir():
            return direct

    # 2. 檢查 projects_registry.json
    reg_candidates = [
        CURRENT_SCRIPT_DIR / "projects_registry.json",
        CURRENT_SCRIPT_DIR.parent / "projects_registry.json",
        Path("C:/Users/達爾/APP_9181734/projects_registry.json")
    ]
    for rf in reg_candidates:
        if rf.exists():
            try:
                with open(rf, "r", encoding="utf-8") as f:
                    reg = json.load(f)
                    for item in reg.get("managed_projects", []):
                        if item.get("name") == name:
                            p_path = Path(item.get("path", ""))
                            if p_path.exists() and p_path.is_dir():
                                return p_path
            except Exception:
                pass

    # 3. 搜尋所有候選目錄
    for b in get_all_candidate_local_bases(cfg):
        candidate = b / name
        if candidate.exists() and candidate.is_dir():
            return candidate

    # 4. 若本地不存在，嘗試由 registry 推薦父目錄
    for rf in reg_candidates:
        if rf.exists():
            try:
                with open(rf, "r", encoding="utf-8") as f:
                    reg = json.load(f)
                    for item in reg.get("managed_projects", []):
                        if item.get("name") == name:
                            p_path = Path(item.get("path", ""))
                            if p_path.parent.exists():
                                return p_path
            except Exception:
                pass

    return fallback_local_base / name if fallback_local_base else Path.cwd() / name

def detect_cloud_base(cfg):
    """
    自動偵測 Google 雲端硬碟目錄 (例如 G:\\我的雲端硬碟)
    """
    # 情況 A：若當前腳本本身就在 Google 雲端硬碟中執行
    if CURRENT_SCRIPT_DIR.drive.upper() in ["G:", "H:"]:
        return CURRENT_SCRIPT_DIR.resolve()

    # 情況 B：檢查使用者自訂或常用雲端硬碟候選路徑
    for c in cfg.get("cloud_base_candidates", []):
        p = Path(c)
        if p.exists():
            return p.resolve()

    # 情況 C：尋找掛載的磁碟機
    for drive in ["G:/", "H:/", "D:/"]:
        p_ch = Path(f"{drive}我的雲端硬碟")
        if p_ch.exists():
            return p_ch.resolve()
        p_en = Path(f"{drive}My Drive")
        if p_en.exists():
            return p_en.resolve()

    return None

def parse_robocopy_summary(output: str):
    """解析 Robocopy 傳輸摘要統計"""
    summary = {
        "files_total": 0, "files_copied": 0, "files_skipped": 0,
        "bytes_total": "0", "bytes_copied": "0", "bytes_skipped": "0"
    }
    lines = output.splitlines()
    for line in lines:
        line_s = line.strip()
        if line_s.startswith("Files :") or line_s.startswith("檔案 :"):
            parts = line.split()
            if len(parts) >= 4:
                try:
                    summary["files_total"] = int(parts[2])
                    summary["files_copied"] = int(parts[3])
                    summary["files_skipped"] = int(parts[4])
                except Exception:
                    pass
        elif line_s.startswith("Bytes :") or line_s.startswith("位元組 :"):
            parts = line.split()
            if len(parts) >= 4:
                try:
                    summary["bytes_total"] = f"{parts[2]} {parts[3]}" if len(parts) > 5 and parts[3] in ('m', 'k', 'g') else parts[2]
                except Exception:
                    pass
    return summary

def run_robocopy_sync(src_dir: Path, dst_dir: Path, title: str, cfg: dict):
    """
    執行 Robocopy 極速增量同步
    關鍵參數：
      /E   : 包含所有子目錄 (含空目錄)
      /XO  : eXclude Older（只覆蓋比目的端更新的檔案，相同或較舊者一律略過！不耗頻寬）
      /FFT : 支援 FAT/雲端硬碟 2 秒時間戳容差，避免毫秒微差重傳
      /MT:8: 8 執行緒多工極速傳輸
      /R:1 /W:1 : 遇檔案鎖定最多等 1 秒，不卡死
    """
    if not src_dir.exists():
        print(f"  ℹ️ 來源目錄不存在：{src_dir}，自動略過。")
        return True

    dst_dir.mkdir(parents=True, exist_ok=True)

    exclude_dirs = cfg.get("exclude_dirs", ["__pycache__", ".pytest_cache", "backups", "token_and_backup_toolkit", ".venv", "venv", ".git"])
    exclude_files = cfg.get("exclude_files", ["*.tmp", "~$*", "Thumbs.db", "desktop.ini"])

    cmd = [
        "robocopy",
        str(src_dir),
        str(dst_dir),
        "/E",             # 複製所有子資料夾
        "/XO",            # 🌟 核心：排除較舊或相同的檔案（只覆蓋較新檔案！）
        "/FFT",           # 🌟 容許 2 秒時間戳精度差（防 Google Drive 虛擬磁碟誤差）
        "/MT:8",          # 8 執行緒平行加速
        "/R:1",           # 重試 1 次
        "/W:1",           # 等候 1 秒
        "/NP",            # 不印百分比進度
        "/NDL",           # 不印目錄清單
        "/XD"
    ] + exclude_dirs + ["/XF"] + exclude_files

    start_time = time.time()
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="cp950", errors="replace")
    cost_time = time.time() - start_time
    rc = result.returncode

    # Robocopy 0~7 均代表成功 (8以上為錯誤)
    if rc < 8:
        summary = parse_robocopy_summary(result.stdout)
        copied = summary["files_copied"]
        skipped = summary["files_skipped"]
        total = summary["files_total"]

        if copied == 0:
            print(f"  ⚡ {colorize(title, Colors.GREEN)}：已是最新狀態！已略過 {skipped} 個無異動檔案 (0 流量消耗, 耗時 {cost_time:.2f} 秒)")
        else:
            print(f"  ✔ {colorize(title, Colors.GREEN)}：成功覆蓋 {colorize(str(copied), Colors.CYAN)} 個較新檔案 (略過 {skipped} 個舊檔, 共 {total} 個檔案, 耗時 {cost_time:.2f} 秒)")
        return True
    else:
        print(f"  ❌ {colorize(title, Colors.RED)}：同步失敗 (狀態碼 {rc})")
        lines = result.stdout.strip().splitlines()[-6:]
        for line in lines:
            print(f"     {line}")
        return False

def mirror_sync_tools(cloud_base: Path, cfg: dict):
    """
    將雙向同步管理腳本與批次檔自動鏡像至 Google 雲端硬碟根目錄
    確保在公司電腦打開 G:\\我的雲端硬碟 即可一鍵還原！
    """
    if not cfg.get("mirror_sync_tools_to_cloud_root", True):
        return

    tools_to_copy = [
        "cloud_sync.py",
        "cloud_sync_config.json",
        "一鍵打包到雲端硬碟.bat",
        "一鍵從雲端還原覆蓋.bat",
        "雲端雙向同步管家.bat"
    ]

    print("\n" + colorize("🔄 正在更新 Google 雲端硬碟根目錄的同步腳本與設定...", Colors.CYAN))
    copied_count = 0
    for t in tools_to_copy:
        src = CURRENT_SCRIPT_DIR / t
        if not src.exists():
            # 嘗試到專案根目錄找
            src = CURRENT_SCRIPT_DIR.parent / t
        if src.exists():
            dst = cloud_base / t
            try:
                # 只有當目的檔案不存在或來源較新時才複製
                if not dst.exists() or src.stat().st_mtime > dst.stat().st_mtime:
                    dst.write_bytes(src.read_bytes())
                    copied_count += 1
            except Exception:
                pass

    if copied_count > 0:
        print(f"  ✔ 已將 {copied_count} 個同步腳本與設定鏡像至雲端硬碟根目錄 ({cloud_base})")
    else:
        print("  ⚡ 雲端硬碟根目錄之同步腳本已是最新版本。")

def do_fast_upload(local_base: Path, cloud_base: Path, cfg: dict):
    """【模式 1】本機 -> 雲端硬碟 (只覆蓋較新檔案)"""
    projects = cfg.get("enabled_projects", [])
    print("=" * 72)
    print(colorize("📤 打包上傳：本機 ==> Google 雲端硬碟 (⚡ 只覆蓋較新檔案)", Colors.CYAN))
    print("=" * 72)
    print(f"  📁 基準 (本機)：{local_base}")
    print(f"  ☁️ 目的 (雲端)：{cloud_base}")
    print(f"  📋 同步專案：{', '.join(projects)}")
    print(f"  ⚡ 策略：Robocopy /XO 增量比對 (跳過無修改檔案，節省 99% 頻寬)")
    print("-" * 72)

    total_success = True
    for name in projects:
        src = find_project_local_path(name, local_base, cfg)
        dst = cloud_base / name
        print(f"\n[比對與同步] {name} ({src})...")
        ok = run_robocopy_sync(src, dst, name, cfg)
        if not ok:
            total_success = False

    # 鏡像工具至雲端根目錄
    mirror_sync_tools(cloud_base, cfg)

    print("\n" + "=" * 72)
    if total_success:
        print(colorize("🎉 所有專案已完成最佳效率增量同步！您可以安心關機出門。", Colors.GREEN))
    else:
        print(colorize("⚠️ 部分檔案同步未完全成功，請檢查上方訊息。", Colors.YELLOW))
    print("=" * 72)

def do_fast_download(local_base: Path, cloud_base: Path, cfg: dict, skip_confirm=False):
    """【模式 2】雲端硬碟 -> 本機 (只覆蓋較新檔案)"""
    projects = cfg.get("enabled_projects", [])
    print("=" * 72)
    print(colorize("📥 下載還原：雲端硬碟 ==> 本機專案 (⚡ 只覆蓋較新檔案)", Colors.CYAN))
    print("=" * 72)
    print(f"  ☁️ 來源 (雲端)：{cloud_base}")
    print(f"  📁 基準 (本機)：{local_base}")
    print(f"  📋 還原專案：{', '.join(projects)}")
    print(f"  ⚡ 策略：只將雲端比本機「更新」的檔案覆蓋回來，絕不倒退！")
    print("-" * 72)

    if not skip_confirm:
        print(colorize("⚠️ 【安全確認】即將將雲端硬碟中較新的檔案同步覆蓋回本機！", Colors.YELLOW))
        print("  若本機已有最新存檔，比雲端更新的檔案將自動保留、不會被覆蓋。")
        confirm = input("  確定要繼續同步還原嗎？(Y/N, 預設 Y): ").strip().lower()
        if confirm == 'n':
            print("  [已取消還原作業]")
            return

    total_success = True
    for name in projects:
        src = cloud_base / name
        dst = find_project_local_path(name, local_base, cfg)
        print(f"\n[比對與還原] {name} ({dst})...")
        ok = run_robocopy_sync(src, dst, name, cfg)
        if not ok:
            total_success = False

    print("\n" + "=" * 72)
    if total_success:
        print(colorize("🎉 本機專案已成功還原為最新狀態！祝工作愉快！", Colors.GREEN))
    else:
        print(colorize("⚠️ 部分檔案還原未完全成功，請檢查上方訊息。", Colors.YELLOW))
    print("=" * 72)

def do_zip_upload(local_base: Path, cloud_base: Path, cfg: dict):
    """【模式 3】ZIP 封存模式"""
    projects = cfg.get("enabled_projects", [])
    print("=" * 72)
    print(colorize("📦 正在執行：ZIP 完整打包上傳至雲端硬碟", Colors.CYAN))
    print("=" * 72)
    for name in projects:
        src = find_project_local_path(name, local_base, cfg)
        dst_zip = cloud_base / f"{name}.zip"
        if not src.exists():
            continue
        print(f"\n  [正在壓縮] {name} -> {dst_zip.name} ...")
        start = time.time()
        tar_cmd = ["tar.exe", "-a", "-c", "-f", str(dst_zip), "-C", str(src.parent), src.name]
        res = subprocess.run(tar_cmd, capture_output=True)
        if res.returncode == 0:
            sz_mb = dst_zip.stat().st_size / (1024 * 1024)
            print(f"  ✔ {name}.zip 壓縮完成！({sz_mb:.1f} MB, 耗時 {time.time() - start:.1f} 秒)")
        else:
            print(f"  ❌ 壓縮失敗")
    print("\n" + "=" * 72)
    print(colorize("🎉 ZIP 封存檔已更新！", Colors.GREEN))
    print("=" * 72)

def do_zip_download(local_base: Path, cloud_base: Path, cfg: dict):
    """【模式 4】ZIP 解壓模式"""
    projects = cfg.get("enabled_projects", [])
    print("=" * 72)
    print(colorize("📂 正在執行：從雲端 ZIP 解壓縮覆蓋回本機", Colors.CYAN))
    print("=" * 72)
    confirm = input("⚠️ 確定要從 ZIP 解壓縮並覆蓋本機專案嗎？(Y/N, 預設 Y): ").strip().lower()
    if confirm == 'n':
        return
    for name in projects:
        zip_file = cloud_base / f"{name}.zip"
        if not zip_file.exists():
            continue
        dst = find_project_local_path(name, local_base, cfg)
        dst.mkdir(parents=True, exist_ok=True)
        print(f"\n  [正在解壓] {zip_file.name} -> {dst.parent} ...")
        start = time.time()
        tar_cmd = ["tar.exe", "-xf", str(zip_file), "-C", str(dst.parent)]
        res = subprocess.run(tar_cmd, capture_output=True)
        if res.returncode == 0:
            print(f"  ✔ {name} 解壓縮成功！(耗時 {time.time() - start:.1f} 秒)")
    print("\n" + "=" * 72)
    print(colorize("🎉 所有專案已自 ZIP 還原！", Colors.GREEN))
    print("=" * 72)

def manage_projects_interactive(local_base: Path, cfg: dict, cfg_path: Path):
    """【管理功能 7】互動式專案清單增減設定"""
    enabled = set(cfg.get("enabled_projects", []))
    while True:
        os.system("cls" if os.name == "nt" else "clear")

        # 掃描本機目錄下的現存專案資料夾
        discovered = []
        for cb in get_all_candidate_local_bases(cfg):
            if cb.exists() and cb.is_dir() and cb.drive.upper() not in ["G:", "H:"]:
                try:
                    for item in cb.iterdir():
                        if item.is_dir() and not item.name.startswith(('.', '$')) and item.name not in ["backups", "token_and_backup_toolkit"]:
                            if item.name not in discovered:
                                discovered.append(item.name)
                except Exception:
                    pass

        # 確保在 enabled 中的項目也在清單中
        all_candidates = sorted(list(set(discovered).union(enabled)))

        print("=" * 72)
        print("         ⚙️ 雲端同步專案清單管理 (可勾選/增減專案)")
        print("=" * 72)
        print(f"  📁 本機基準目錄：{local_base}")
        print(f"  📄 設定檔路徑：{cfg_path}")
        print("-" * 72)
        print(f"  {'序號':<5} | {'狀態':<6} | {'專案名稱'}")
        print("-" * 72)

        for idx, name in enumerate(all_candidates, 1):
            status = colorize("[✔ 啟用]", Colors.GREEN) if name in enabled else "[  略過]"
            print(f"  {idx:<5} | {status} | {name}")

        print("-" * 72)
        print("  💡 操作方式：")
        print("    - 輸入【序號】：切換該專案的 啟用/停用 狀態（支援多序號，如：26 34）")
        print("    - 輸入【+專案名】：手動新增不在清單上的專案 (如: +MyNewApp)")
        print("    - 輸入【A】：全部勾選啟用")
        print("    - 輸入【R】：從 projects_registry.json 自動匯入所有受管專案")
        print("    - 輸入【S】：儲存設定並返回")
        print("    - 輸入【Q】：取消返回")
        print("=" * 72)

        choice = input("請輸入指令或序號: ").strip()
        if not choice:
            continue

        if choice.upper() == 'S':
            cfg["enabled_projects"] = sorted(list(enabled))
            save_config(cfg, cfg_path)
            print(colorize("\n✔ 設定已成功儲存！", Colors.GREEN))
            time.sleep(1)
            break
        elif choice.upper() == 'Q':
            break
        elif choice.upper() == 'A':
            enabled = set(all_candidates)
        elif choice.upper() == 'R':
            # 嘗試讀取 projects_registry.json
            reg_file = local_base / "APP_9181734" / "projects_registry.json"
            if not reg_file.exists():
                reg_file = CURRENT_SCRIPT_DIR / "projects_registry.json"
            if reg_file.exists():
                try:
                    with open(reg_file, "r", encoding="utf-8") as rf:
                        reg_data = json.load(rf)
                        for p in reg_data.get("managed_projects", []):
                            enabled.add(p.get("name"))
                    print(colorize("✔ 已自 projects_registry.json 匯入專案！", Colors.GREEN))
                    time.sleep(1)
                except Exception as e:
                    print(colorize(f"⚠️ 讀取 registry 失敗: {e}", Colors.YELLOW))
                    time.sleep(1)
        elif choice.startswith("+"):
            new_name = choice[1:].strip()
            if new_name:
                enabled.add(new_name)
        else:
            # 支援單個或多個序號（例如 "26"、"26 34"、"26, 34"）
            raw_parts = choice.replace(",", " ").split()
            valid_digits = [p for p in raw_parts if p.isdigit()]
            if valid_digits:
                for part in valid_digits:
                    idx = int(part)
                    if 1 <= idx <= len(all_candidates):
                        target_name = all_candidates[idx - 1]
                        if target_name in enabled:
                            enabled.remove(target_name)
                        else:
                            enabled.add(target_name)

def create_desktop_shortcuts(local_base: Path):
    """【管理功能 8】在目前 Windows 使用者桌面建立一鍵打包與還原捷徑"""
    print("\n" + "=" * 72)
    print(colorize("🖥️ 正在為您建立桌面捷徑...", Colors.CYAN))
    print("=" * 72)

    desktop_dir = Path.home() / "Desktop"
    if not desktop_dir.exists():
        # 繁體中文桌面路徑相容
        desktop_dir = Path.home() / "桌面"
    if not desktop_dir.exists():
        print(colorize("❌ 找不到桌面目錄！", Colors.RED))
        return

    # 捷徑指向當前腳本所在的批次檔
    upload_bat = CURRENT_SCRIPT_DIR / "一鍵打包到雲端硬碟.bat"
    download_bat = CURRENT_SCRIPT_DIR / "一鍵從雲端還原覆蓋.bat"

    shortcuts = [
        ("一鍵打包到雲端硬碟.lnk", upload_bat, "0.3 秒極速增量同步至 Google 雲端硬碟"),
        ("一鍵從雲端還原覆蓋.lnk", download_bat, "從 Google 雲端硬碟增量同步回本機專案")
    ]

    ps_script = []
    for lnk_name, target_bat, desc in shortcuts:
        lnk_path = desktop_dir / lnk_name
        ps_script.append(f"""
$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut("{lnk_path}")
$s.TargetPath = "{target_bat}"
$s.WorkingDirectory = "{CURRENT_SCRIPT_DIR}"
$s.Description = "{desc}"
$s.Save()
""")

    try:
        full_ps = "\n".join(ps_script)
        subprocess.run(["powershell", "-NoProfile", "-Command", full_ps], capture_output=True, check=True)
        print(colorize(f"🎉 成功在桌面建立捷徑：", Colors.GREEN))
        print(f"  ✔ {desktop_dir / '一鍵打包到雲端硬碟.lnk'}")
        print(f"  ✔ {desktop_dir / '一鍵從雲端還原覆蓋.lnk'}")
    except Exception as e:
        print(colorize(f"⚠️ 建立捷徑時發生錯誤: {e}", Colors.YELLOW))

def open_directories(local_base: Path, cloud_base: Path):
    if local_base and local_base.exists():
        os.startfile(str(local_base))
    if cloud_base and cloud_base.exists():
        os.startfile(str(cloud_base))

def main():
    cfg, cfg_path = load_config()
    local_base = detect_local_base(cfg)
    cloud_base = detect_cloud_base(cfg)

    # 命令列模式支援
    if len(sys.argv) > 1:
        action = sys.argv[1].lower()

        if action in ("--list", "-l"):
            print("📋 當前已啟用同步之專案：")
            for p in cfg.get("enabled_projects", []):
                print(f"  - {p}")
            sys.exit(0)
        elif action in ("--add", "-a") and len(sys.argv) > 2:
            p_name = sys.argv[2]
            if p_name not in cfg["enabled_projects"]:
                cfg["enabled_projects"].append(p_name)
                save_config(cfg, cfg_path)
                print(f"✔ 已新增專案 [{p_name}] 到同步清單")
            sys.exit(0)
        elif action in ("--remove", "-r") and len(sys.argv) > 2:
            p_name = sys.argv[2]
            if p_name in cfg["enabled_projects"]:
                cfg["enabled_projects"].remove(p_name)
                save_config(cfg, cfg_path)
                print(f"✔ 已從同步清單移除專案 [{p_name}]")
            sys.exit(0)
        elif action in ("--desktop", "--shortcuts"):
            create_desktop_shortcuts(local_base)
            sys.exit(0)

        if not cloud_base:
            print(colorize("❌ 找不到 Google 雲端硬碟 (G:\\我的雲端硬碟)！請確認 Google 雲端硬碟已啟動。", Colors.RED))
            input("\n按 Enter 鍵離開...")
            sys.exit(1)

        if action in ("upload", "up", "push"):
            do_fast_upload(local_base, cloud_base, cfg)
            sys.exit(0)
        elif action in ("download", "down", "pull"):
            skip_confirm = "-y" in sys.argv
            do_fast_download(local_base, cloud_base, cfg, skip_confirm=skip_confirm)
            sys.exit(0)
        elif action == "zip_upload":
            do_zip_upload(local_base, cloud_base, cfg)
            sys.exit(0)
        elif action == "zip_download":
            do_zip_download(local_base, cloud_base, cfg)
            sys.exit(0)

    # 互動式主選單
    while True:
        cfg, cfg_path = load_config()
        local_base = detect_local_base(cfg)
        cloud_base = detect_cloud_base(cfg)
        enabled_projects = cfg.get("enabled_projects", [])

        os.system("cls" if os.name == "nt" else "clear")
        print("=" * 72)
        print("         🔄 Antigravity 跨專案 Google 雲端雙向同步管家")
        print("=" * 72)
        print()
        print("  【當前環境配置】")
        print(f"    📁 本機專案目錄：{local_base}")
        if cloud_base:
            print(f"    ☁️ 雲端硬碟目錄：{cloud_base}")
        else:
            print(colorize("    ☁️ 雲端硬碟目錄：[尚未偵測到 Google 雲端硬碟] (請選 [6] 設定)", Colors.YELLOW))
        print(f"    📋 同步專案清單：{', '.join(enabled_projects) if enabled_projects else '(尚未指定)'}")
        print(f"    ⚙️ 設定檔位置：{cfg_path.name}")
        print()
        print("-" * 72)
        print("  【⚡ 極速增量同步模式（🌟 只覆蓋較新檔案，2~5 秒完成，省 99% 頻寬）】")
        print("    [1] 📤 打包上傳：本機  ==>  Google 雲端硬碟 (下班 / 臨走前)")
        print("    [2] 📥 下載還原：雲端  ==>  本機專案目錄   (上班 / 回到家)")
        print()
        print("  【📦 ZIP 完整封裝模式（封裝成單一壓縮檔備份）】")
        print("    [3] 📦 壓縮打包：產生 ZIP 上傳雲端")
        print("    [4] 📂 壓縮還原：從雲端 ZIP 解壓覆蓋回本機")
        print()
        print("  【🛠️ 專案清單與配置管理】")
        print("    [5] 📂 開啟本機與雲端硬碟資料夾")
        print("    [6] 🔍 自訂 / 重新指定 Google 雲端硬碟路徑")
        print("    [7] ⚙️ 管理同步專案清單 (隨時新增/移除/切換要同步的專案)")
        print("    [8] 🖥️ 在桌面建立「一鍵打包」與「一鍵還原」捷徑")
        print("    [Q] 離開")
        print("=" * 72)

        choice = input("請輸入選項 [1-8, Q]: ").strip().lower()

        if choice == '1':
            if not cloud_base:
                print(colorize("\n❌ 請先設定 Google 雲端硬碟路徑！", Colors.RED))
                input("\n按 Enter 鍵返回...")
                continue
            do_fast_upload(local_base, cloud_base, cfg)
            input("\n按 Enter 鍵返回選單...")
        elif choice == '2':
            if not cloud_base:
                print(colorize("\n❌ 請先設定 Google 雲端硬碟路徑！", Colors.RED))
                input("\n按 Enter 鍵返回...")
                continue
            do_fast_download(local_base, cloud_base, cfg)
            input("\n按 Enter 鍵返回選單...")
        elif choice == '3':
            if not cloud_base:
                print(colorize("\n❌ 請先設定 Google 雲端硬碟路徑！", Colors.RED))
                input("\n按 Enter 鍵返回...")
                continue
            do_zip_upload(local_base, cloud_base, cfg)
            input("\n按 Enter 鍵返回選單...")
        elif choice == '4':
            if not cloud_base:
                print(colorize("\n❌ 請先設定 Google 雲端硬碟路徑！", Colors.RED))
                input("\n按 Enter 鍵返回...")
                continue
            do_zip_download(local_base, cloud_base, cfg)
            input("\n按 Enter 鍵返回選單...")
        elif choice == '5':
            open_directories(local_base, cloud_base)
        elif choice == '6':
            print("\n" + "-" * 72)
            custom_cloud = input("請輸入 Google 雲端硬碟完整路徑 (直接按 Enter 取消): ").strip()
            if custom_cloud and Path(custom_cloud).exists():
                cfg["cloud_base_candidates"].insert(0, str(Path(custom_cloud).resolve()).replace("\\", "/"))
                save_config(cfg, cfg_path)
                print(f"✔ 雲端路徑已更新並儲存！")
                time.sleep(1)
        elif choice == '7':
            manage_projects_interactive(local_base, cfg, cfg_path)
        elif choice == '8':
            create_desktop_shortcuts(local_base)
            input("\n按 Enter 鍵返回選單...")
        elif choice in ('q', 'exit', 'quit'):
            print("\n已安全退出。祝工作愉快！")
            break

if __name__ == "__main__":
    main()
