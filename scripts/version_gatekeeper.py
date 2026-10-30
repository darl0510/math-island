#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
version_gatekeeper.py
=====================
專責版本號規範校驗、工作區智慧探測與前置 Git / 外包 Ledger 門禁驗證。
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Tuple

VERSION_RE = re.compile(r"^\d+\.\d+\.\d+$")
VERSION_IN_TEXT_RE = re.compile(r"v?\d+\.\d+\.\d+")


def normalize_version(raw: str) -> str:
    """校驗並標準化版號字串（例如 'v0.5.32' -> '0.5.32'）。"""
    raw = raw.strip()
    if raw.startswith("v") or raw.startswith("V"):
        raw = raw[1:]
    if not VERSION_RE.match(raw):
        print(f"[ERROR] 無效版號格式: '{raw}'，需符合 ^\\d+\\.\\d+\\.\\d+$", file=sys.stderr)
        sys.exit(2)
    return raw


def detect_workspace() -> Path:
    """向上逐層探測工作區根目錄（尋找 package.json / AGENTS.md / PROJECT_HANDOVER.md 等標記）。"""
    markers = {"package.json", "AGENTS.md", "PROJECT_HANDOVER.md", "pyproject.toml"}
    current = Path(__file__).resolve().parent
    while True:
        for m in markers:
            if (current / m).is_file():
                return current
        parent = current.parent
        if parent == current:
            break
        current = parent
    return Path.cwd()


def verify_workspace_gate(ws: Path, strict: bool = False) -> Tuple[bool, str]:
    """
    工作區前置門禁驗證：
    1. Git 倉庫狀態審查 (若具備 .git)
    2. Ledger 最近外包狀態審查
    """
    dot_git = ws / ".git"
    git_detected = dot_git.exists()

    if git_detected:
        try:
            res = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=str(ws),
                capture_output=True,
                text=True,
                timeout=10,
            )
            if res.returncode != 0:
                err_detail = res.stderr.strip() or "未知 Git 錯誤"
                return False, f"Git status 執行失敗 (code {res.returncode}): {err_detail}"

            changes = [line for line in res.stdout.splitlines() if line.strip()]

            if strict and not changes:
                return False, "工作區無任何修改或新增檔案，拒絕盲目改版 (可加 --force 覆蓋)"

            if strict:
                try:
                    diff_res = subprocess.run(
                        ["git", "diff", "--stat"],
                        cwd=str(ws),
                        capture_output=True,
                        text=True,
                        timeout=10,
                    )
                    diff_out = diff_res.stdout.strip()
                    if diff_out:
                        print("  [VERIFY-DIFF-STAT]")
                        lines = diff_out.splitlines()
                        for line in lines[:15]:
                            print(f"    {line}")
                        if len(lines) > 15:
                            print(f"    ... (其餘共 {len(lines)} 行變更統計已省略)")
                except Exception:
                    pass

                print("  [VERIFY-GIT-STATUS]")
                for line in changes[:10]:
                    print(f"    {line}")
                if len(changes) > 10:
                    print(f"    ... (共 {len(changes)} 個變更檔案)")

        except Exception as e:
            return False, f"Git 呼叫異常: {e}"
    else:
        if strict:
            print("  [INFO] 工作區無 .git，依賴 auto_backup 進行快照還原驗收")

    # 檢查 Ledger 狀態
    ledger_path = ws / "local_tokens_ledger.json"
    if ledger_path.is_file():
        try:
            with open(ledger_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                sessions = data.get("sessions", [])
                if sessions:
                    last_sess = sessions[-1]
                    is_ok = last_sess.get("status") in ("passed", "success") or last_sess.get("success") is True
                    if not is_ok:
                        msg = f"最近一筆外包任務 ({last_sess.get('task', '未知')}) 標記為失敗/未通過！"
                        if strict:
                            return False, msg + " 請先確認自檢或執行 --mark-passed"
                        else:
                            print(f"  [WARN] {msg}")
                    elif strict:
                        tokens = last_sess.get("tokens", 0)
                        task_name = str(last_sess.get("task", ""))[:45]
                        print(f"  [VERIFY-LEDGER] 最近外包任務綠燈: '{task_name}' (Tokens: {tokens})")
        except Exception:
            pass

    return True, "驗收門禁通過 (工作區變更檢驗 ✕ Ledger 綠燈)"

