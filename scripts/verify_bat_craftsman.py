#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/verify_bat_craftsman.py
================================
Windows .bat 批次檔機械化守門員與自愈修復工具 (BAT Craftsman Gatekeeper)。

防禦並自動修復以下致命陷阱：
1. write_file 產生的裸 LF (\\n) 導致 cmd.exe Byte Seek 位元組指標錯位崩潰 (強制二進位 CRLF \\r\\n)
2. UTF-8 BOM 截斷導致指令失效 (強制 UTF-8 Without BOM)
3. 偽註解 :: 破壞括號結構與代碼塊 (自動置換為 REM)
4. REM 內部不對稱雙引號導致 CMD 分詞錯位
5. 現代 Chromium --app="file:///" 卡死全白頁面 (about:blank) 陷阱
6. 缺少 cd /d "%~dp0" 或 chcp 65001 >nul 2>nul
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from typing import List, Tuple


def verify_and_heal_bat(bat_path: Path, auto_fix: bool = True) -> Tuple[bool, List[str]]:
    """
    檢測並自動自愈單一 .bat 批次檔。
    回傳 (通過/未通過, 診斷與修復日誌清單)。
    """
    logs: List[str] = []
    if not bat_path.is_file():
        logs.append(f"❌ [不存在] 找不到檔案: {bat_path}")
        return False, logs

    try:
        raw_bytes = bat_path.read_bytes()
    except Exception as e:
        logs.append(f"❌ [讀取失敗] {e}")
        return False, logs

    modified = False
    new_bytes = raw_bytes

    # ── 1. 檢查並清除 UTF-8 BOM ──
    if new_bytes.startswith(b"\xef\xbb\xbf"):
        if auto_fix:
            new_bytes = new_bytes[3:]
            modified = True
            logs.append("🔧 [自愈] 偵測到 UTF-8 BOM，已強制移除 (轉換為 UTF-8 Without BOM)")
        else:
            logs.append("⚠️ [BOM 警報] 檔案開頭帶有 UTF-8 BOM (\\xef\\xbb\\xbf)，CMD 執行時會報錯")

    # ── 2. 檢查並修復裸 LF (\n) 導致的 Byte Seek 錯位 ──
    # 計算 raw LF: 沒有前綴 \r 的 \n
    raw_lf_matches = len(re.findall(b"(?<!\r)\n", new_bytes))
    crlf_count = new_bytes.count(b"\r\n")

    if raw_lf_matches > 0:
        if auto_fix:
            # 統一轉為 CRLF: 先將 \r\n 歸一為 \n，再全數換成 \r\n
            text_temp = new_bytes.decode("utf-8", errors="replace")
            text_temp = text_temp.replace("\r\n", "\n").replace("\n", "\r\n")
            new_bytes = text_temp.encode("utf-8")
            modified = True
            logs.append(f"🔧 [自愈] 偵測到 {raw_lf_matches} 處裸 LF (\\n)，已全數重寫為標準二進位 CRLF (\\r\\n)")
        else:
            logs.append(f"❌ [換行符致命錯誤] 偵測到 {raw_lf_matches} 處裸 LF (\\n)！會引發 cmd.exe Byte Seek 指標錯位崩潰！")

    # ── 3. 語意與規則檢驗 (以文字維度) ──
    text = new_bytes.decode("utf-8", errors="replace")
    lines = text.split("\r\n")
    new_lines: List[str] = []
    text_modified = False

    has_cd_lock = False
    has_chcp = False

    for idx, line in enumerate(lines, 1):
        clean_line = line

        # 檢驗 cd /d "%~dp0"
        if re.search(r'cd\s+/d\s+"%~dp0"', clean_line, re.IGNORECASE):
            has_cd_lock = True
        # 檢驗 chcp 65001
        if "chcp 65001" in clean_line.lower():
            has_chcp = True

        # (a) 偽註解 :: 替換為 REM
        comment_match = re.match(r"^(\s*)::(\s*.*)$", clean_line)
        if comment_match:
            if auto_fix:
                indent = comment_match.group(1)
                comment_body = comment_match.group(2)
                # 清除 REM 內部可能導致分詞崩潰的未閉合單個雙引號
                clean_line = f"{indent}REM {comment_body.strip()}"
                text_modified = True
                logs.append(f"🔧 [自愈] 第 {idx} 行偽標籤註解 '::' 已糾正為官方標準 'REM '")
            else:
                logs.append(f"⚠️ [註解警告] 第 {idx} 行使用 '::' 偽標籤註解，代碼塊內會引發語法樹崩潰")

        # (b) REM 內部孤立雙引號清理 (防止 CMD token 錯位)
        if clean_line.strip().upper().startswith("REM "):
            # 若 REM 內部包含奇數個引號，去除引號
            if clean_line.count('"') % 2 != 0:
                if auto_fix:
                    clean_line = clean_line.replace('"', "'")
                    text_modified = True
                    logs.append(f"🔧 [自愈] 第 {idx} 行 REM 內部奇數雙引號已轉為單引號 (防分詞崩潰)")
                else:
                    logs.append(f"⚠️ [分詞警告] 第 {idx} 行 REM 內含未閉合雙引號")

        # (c) 禁絕 --app="file:///" 現代 Chromium 全白頁面卡死陷阱
        app_file_match = re.search(r'--app=["\']?file:///[^"\'\s]+["\']?', clean_line, re.IGNORECASE)
        if app_file_match:
            if auto_fix:
                # 替換為標準的 start "" "%HTML_FILE%" 模式或安全開啟
                clean_line = re.sub(
                    r'(start\s+["\']?[^"\']*["\']?\s+)?(?:chrome\.exe|msedge\.exe|start\s+)?--app=["\']?file:///([^"\'\s]+)["\']?',
                    r'start "" "\2"',
                    clean_line,
                    flags=re.IGNORECASE
                )
                text_modified = True
                logs.append(f"🔧 [自愈] 第 {idx} 行偵測到 --app='file:///' 白屏陷阱，已置換為標準安全開啟語法")
            else:
                logs.append(f"❌ [致命陷阱] 第 {idx} 行包含 --app='file:///'，會被現代 Chromium 沙盒攔截並卡在 about:blank 白屏！")

        new_lines.append(clean_line)

    # 檢查頂部核心宣告 (若全缺且啟用修復，可提供提示)
    if not has_chcp:
        logs.append("💡 [提醒] 腳本未包含 'chcp 65001 >nul 2>nul'，若有中文輸出建議補齊")
    if not has_cd_lock:
        logs.append("💡 [提醒] 腳本未包含 'cd /d \"%~dp0\"'，建議在頂部鎖定工作目錄防相對路徑漂移")

    if text_modified:
        new_text = "\r\n".join(new_lines)
        new_bytes = new_text.encode("utf-8")
        modified = True

    # ── 4. 寫回磁碟 (強制 Python 二進位 wb 模式) ──
    if modified and auto_fix:
        try:
            bat_path.write_bytes(new_bytes)
            logs.append(f"💾 [落盤完成] 已以二進位 wb 模式安全寫入: {bat_path.name}")
        except Exception as e:
            logs.append(f"❌ [寫回失敗] {e}")
            return False, logs

    # 最後終檢：確認磁碟上 100% 零裸 LF
    final_bytes = bat_path.read_bytes()
    final_raw_lf = len(re.findall(b"(?<!\r)\n", final_bytes))
    if final_raw_lf > 0:
        logs.append(f"❌ [終檢未過] 磁碟檔案仍殘留 {final_raw_lf} 處裸 LF，二進位寫入異常")
        return False, logs

    has_critical_error = any("❌" in log for log in logs)
    return not has_critical_error, logs


def main():
    parser = argparse.ArgumentParser(description="Windows BAT Craftsman Mechanical Gatekeeper & Auto-Healer")
    parser.add_argument("target", help="目標 .bat 檔案路徑，或包含 .bat 之專案目錄")
    parser.add_argument("--check-only", action="store_true", help="僅檢查不自動修改檔案")
    args = parser.parse_args()

    target_path = Path(args.target).resolve()
    auto_fix = not args.check_only

    if target_path.is_file():
        files = [target_path]
    elif target_path.is_dir():
        files = list(target_path.glob("*.bat")) + list(target_path.glob("scripts/*.bat"))
    else:
        print(f"❌ [錯誤] 目標不存在: {target_path}", file=sys.stderr)
        sys.exit(1)

    if not files:
        print(f"ℹ️ 未找到任何 .bat 檔案: {target_path}")
        sys.exit(0)

    print("=" * 70)
    print("🛠️  Windows BAT Craftsman 批次檔機械化守門員")
    print(f"   目標：{target_path} (共 {len(files)} 個檔案)")
    print(f"   模式：{'自動修復自愈 (Auto-Fix)' if auto_fix else '唯讀檢查 (Check-Only)'}")
    print("=" * 70)

    all_passed = True
    for f in files:
        passed, logs = verify_and_heal_bat(f, auto_fix=auto_fix)
        status_icon = "✅" if passed else "❌"
        print(f"\n{status_icon} 檔案: {f.name} ({f})")
        for log in logs:
            print(f"   {log}")
        if not passed:
            all_passed = False

    print("\n" + "=" * 70)
    if all_passed:
        print("🎉 [全部通過] 所有 .bat 批次檔皆符合 Windows BAT Craftsman 極致工藝規範！")
        sys.exit(0)
    else:
        print("🚨 [驗收未通過] 存在嚴重語法或編碼問題，請參閱上方日誌！", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

