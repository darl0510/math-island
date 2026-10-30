#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
bump_version.py
===============
一鍵跨檔案版本推進中樞與驗收門禁排程器 (平鋪架構精簡主控層)。
依據平鋪架構規範，核心檔案改寫與前置門禁驗證已解耦至專責子模組：
- scripts/version_gatekeeper.py (版號驗證、工作區探測、Git 與 Ledger 門禁)
- scripts/version_bumpers.py (各檔案版本改寫、Handover 看板自動推進與備份)
"""

import argparse
import os
import sys
from pathlib import Path
from typing import List, Tuple

# 確保子模組與根目錄可在任一調用路徑下被正常載入
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_PARENT_DIR = os.path.dirname(_CURRENT_DIR)
for _p in (_CURRENT_DIR, _PARENT_DIR):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# ── 100% Backward-compatible re-exports from decoupled submodules ──────────
try:
    from scripts.version_gatekeeper import (
        VERSION_RE,
        VERSION_IN_TEXT_RE,
        detect_workspace,
        normalize_version,
        verify_workspace_gate,
    )
    from scripts.version_bumpers import (
        advance_handover_tasks,
        bump_handover,
        bump_index_html,
        bump_package_json,
        bump_pyproject,
        bump_sw_js,
        run_backup,
    )
except ModuleNotFoundError:
    from version_gatekeeper import (  # type: ignore
        VERSION_RE,
        VERSION_IN_TEXT_RE,
        detect_workspace,
        normalize_version,
        verify_workspace_gate,
    )
    from version_bumpers import (  # type: ignore
        advance_handover_tasks,
        bump_handover,
        bump_index_html,
        bump_package_json,
        bump_pyproject,
        bump_sw_js,
        run_backup,
    )

__all__ = [
    "VERSION_RE",
    "VERSION_IN_TEXT_RE",
    "normalize_version",
    "detect_workspace",
    "verify_workspace_gate",
    "bump_package_json",
    "bump_handover",
    "advance_handover_tasks",
    "bump_index_html",
    "bump_sw_js",
    "bump_pyproject",
    "run_backup",
    "parse_args",
    "main",
]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Bump project version across multiple files."
    )
    parser.add_argument("version", help="Target version, e.g. 0.4.51 or v0.4.51")
    parser.add_argument(
        "--workspace",
        default=None,
        help="Project root directory (auto-detected if omitted)",
    )
    parser.add_argument(
        "--no-backup", action="store_true", help="Skip auto-backup step"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Print plan only, do not write files"
    )
    parser.add_argument(
        "--verify", action="store_true", help="改版前嚴格執行工作區 Git 狀態與自檢門禁檢查"
    )
    parser.add_argument(
        "--force", action="store_true", help="強制改版，忽略未通過門禁警告"
    )
    parser.add_argument(
        "--advance",
        dest="advance",
        action="store_true",
        default=True,
        help="自動推進 PROJECT_HANDOVER.md 待辦任務與頂部 Prompt (預設啟用)",
    )
    parser.add_argument(
        "--no-advance",
        dest="advance",
        action="store_false",
        help="略過自動推進 PROJECT_HANDOVER.md 待辦任務與頂部 Prompt",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    new_ver = normalize_version(args.version)

    if args.workspace:
        ws = Path(args.workspace).resolve()
    else:
        ws = detect_workspace()

    if not ws.is_dir():
        print(f"[ERROR] workspace 不存在: {ws}", file=sys.stderr)
        sys.exit(2)

    print(f"bump_version → v{new_ver}  @  {ws}")
    if args.dry_run:
        print("  (dry-run mode – 不寫入檔案)")

    gate_ok, gate_msg = verify_workspace_gate(ws, strict=args.verify)
    if not gate_ok:
        print(f"  [GATE-FAIL] 驗收門禁阻擋: {gate_msg}")
        if not args.force:
            sys.exit(1)
    else:
        print(f"  [GATE-PASS] {gate_msg}")

    results: List[Tuple[str, str, int]] = []
    modified_files: List[str] = []

    tasks = [
        ("package.json", bump_package_json),
        ("PROJECT_HANDOVER.md", bump_handover),
        ("index.html", bump_index_html),
        ("sw.js", bump_sw_js),
        ("pyproject.toml", bump_pyproject),
    ]

    for name, func in tasks:
        status, fname, count = func(ws, new_ver, args.dry_run)
        results.append((status, fname, count))
        print(f"  [{status}] {fname} (變動處 {count})")
        if status == "OK":
            modified_files.append(fname)

    run_backup(new_ver, modified_files, args.no_backup, args.dry_run)
    if getattr(args, "advance", False):
        advance_handover_tasks(ws, new_ver, args.dry_run)

    ok = sum(1 for s, _, _ in results if s == "OK")
    skip = sum(1 for s, _, _ in results if s == "SKIP")
    fail = sum(1 for s, _, _ in results if s == "FAIL")
    print(f"  總計: OK={ok}  SKIP={skip}  FAIL={fail}")

    if fail > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
