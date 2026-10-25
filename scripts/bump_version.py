#!/usr/bin/env python3
"""bump_version.py – 原子目標：新建單一檔案 scripts/bump_version.py (v0.4.51-A)"""

import argparse
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

VERSION_RE = re.compile(r"^\d+\.\d+\.\d+$")
VERSION_IN_TEXT_RE = re.compile(r"v?\d+\.\d+\.\d+")


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
    return parser.parse_args()


def normalize_version(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("v") or raw.startswith("V"):
        raw = raw[1:]
    if not VERSION_RE.match(raw):
        print(f"[ERROR] 無效版號格式: '{raw}'，需符合 ^\\d+\\.\\d+\\.\\d+$", file=sys.stderr)
        sys.exit(2)
    return raw


def detect_workspace() -> Path:
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


# ─── package.json ────────────────────────────────────────────────────────────

def bump_package_json(ws: Path, new_ver: str, dry_run: bool) -> tuple:
    fp = ws / "package.json"
    if not fp.is_file():
        return ("SKIP", "package.json", 0)
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
        old = data.get("version", "")
        if old == new_ver:
            return ("SKIP", "package.json", 0)
        data["version"] = new_ver
        if not dry_run:
            fp.write_text(
                json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        return ("OK", "package.json", 1)
    except Exception as e:
        print(f"  [WARN] package.json 處理失敗: {e}", file=sys.stderr)
        return ("FAIL", "package.json", 0)


# ─── PROJECT_HANDOVER.md ─────────────────────────────────────────────────────

def bump_handover(ws: Path, new_ver: str, dry_run: bool) -> tuple:
    fp = ws / "PROJECT_HANDOVER.md"
    if not fp.is_file():
        return ("SKIP", "PROJECT_HANDOVER.md", 0)
    try:
        text = fp.read_text(encoding="utf-8")
        changes = 0
        today = date.today().isoformat()

        # (a) 最後更新時間行
        pat_a = re.compile(
            r"(>\s*\*\*最後更新時間\*\*：)\d{4}-\d{2}-\d{2}\s*\(v?\d+\.\d+\.\d+\s*版\)"
        )
        new_a = rf"\g<1>{today} (v{new_ver} 版)"
        text_new, n = pat_a.subn(new_a, text)
        if n:
            text = text_new
            changes += n

        # (b) Prompt 區塊首行 【vX.Y.Z】你好！
        pat_b = re.compile(r"【v?\d+\.\d+\.\d+】(你好！)")
        new_b = rf"【v{new_ver}】\1"
        text_new, n = pat_b.subn(new_b, text)
        if n:
            text = text_new
            changes += n

        # (c) 標題 ### 🌟 當前版本核心亮點 (Recent Done - vX.Y.Z)
        pat_c = re.compile(
            r"(###\s*🌟\s*當前版本核心亮點\s*\(Recent Done\s*-\s*)v?\d+\.\d+\.\d+\)"
        )
        new_c = rf"\g<1>v{new_ver})"
        text_new, n = pat_c.subn(new_c, text)
        if n:
            text = text_new
            changes += n

        # (d) Changelog 章節插入（冪等）
        changelog_header = "## 🕒 版本更新歷程 (Changelog Archive)"
        new_section_marker = f"### [v{new_ver}]"
        if changelog_header in text and new_section_marker not in text:
            insert_block = (
                f"\n{new_section_marker} - {today}\n"
                f"#### 📊 本次 Token 消耗精準量化 (待監工填入)\n"
            )
            idx = text.index(changelog_header) + len(changelog_header)
            text = text[:idx] + insert_block + text[idx:]
            changes += 1

        if changes == 0:
            return ("SKIP", "PROJECT_HANDOVER.md", 0)
        if not dry_run:
            fp.write_text(text, encoding="utf-8")
        return ("OK", "PROJECT_HANDOVER.md", changes)
    except Exception as e:
        print(f"  [WARN] PROJECT_HANDOVER.md 處理失敗: {e}", file=sys.stderr)
        return ("FAIL", "PROJECT_HANDOVER.md", 0)


# ─── index.html ──────────────────────────────────────────────────────────────

def bump_index_html(ws: Path, new_ver: str, dry_run: bool) -> tuple:
    fp = ws / "index.html"
    if not fp.is_file():
        return ("SKIP", "index.html", 0)
    try:
        text = fp.read_text(encoding="utf-8")

        def _repl(m):
            original = m.group(0)
            has_v = original.startswith("v") or original.startswith("V")
            return ("v" if has_v else "") + new_ver

        text_new, n = VERSION_IN_TEXT_RE.subn(_repl, text)
        if n == 0:
            return ("SKIP", "index.html", 0)
        if not dry_run:
            fp.write_text(text_new, encoding="utf-8")
        return ("OK", "index.html", n)
    except Exception as e:
        print(f"  [WARN] index.html 處理失敗: {e}", file=sys.stderr)
        return ("FAIL", "index.html", 0)


# ─── sw.js ───────────────────────────────────────────────────────────────────

def bump_sw_js(ws: Path, new_ver: str, dry_run: bool) -> tuple:
    fp = ws / "sw.js"
    if not fp.is_file():
        return ("SKIP", "sw.js", 0)
    try:
        text = fp.read_text(encoding="utf-8")
        # 匹配 CACHE_NAME 或 名字-vX.Y.Z 模式中的版號
        pat = re.compile(r"(CACHE_NAME\s*=\s*[\"'])([^\"']*?)-v(\d+\.\d+\.\d+)([\"'])")
        pat2 = re.compile(r"([A-Za-z0-9_\-]+)-v(\d+\.\d+\.\d+)")

        def _repl_cache(m):
            return f"{m.group(1)}{m.group(2)}-v{new_ver}{m.group(4)}"

        def _repl_name(m):
            return f"{m.group(1)}-v{new_ver}"

        text_new, n1 = pat.subn(_repl_cache, text)
        text_new, n2 = pat2.subn(_repl_name, text_new)
        total = n1 + n2
        if total == 0:
            return ("SKIP", "sw.js", 0)
        if not dry_run:
            fp.write_text(text_new, encoding="utf-8")
        return ("OK", "sw.js", total)
    except Exception as e:
        print(f"  [WARN] sw.js 處理失敗: {e}", file=sys.stderr)
        return ("FAIL", "sw.js", 0)


# ─── pyproject.toml ──────────────────────────────────────────────────────────

def bump_pyproject(ws: Path, new_ver: str, dry_run: bool) -> tuple:
    fp = ws / "pyproject.toml"
    if not fp.is_file():
        return ("SKIP", "pyproject.toml", 0)
    try:
        text = fp.read_text(encoding="utf-8")
        pat = re.compile(r'(version\s*=\s*")(\d+\.\d+\.\d+)(")')
        new_line = rf"\g<1>{new_ver}\g<3>"
        text_new, n = pat.subn(new_line, text)
        if n == 0:
            return ("SKIP", "pyproject.toml", 0)
        if not dry_run:
            fp.write_text(text_new, encoding="utf-8")
        return ("OK", "pyproject.toml", n)
    except Exception as e:
        print(f"  [WARN] pyproject.toml 處理失敗: {e}", file=sys.stderr)
        return ("FAIL", "pyproject.toml", 0)


# ─── auto_backup ─────────────────────────────────────────────────────────────

def run_backup(new_ver: str, modified_files: list, no_backup: bool, dry_run: bool):
    if no_backup:
        print("[SKIP] auto_backup (--no-backup)")
        return
    if dry_run:
        print(f"[DRY-RUN] auto_backup.smart_backup(v{new_ver}, {modified_files})")
        return
    root = str(Path(__file__).resolve().parent.parent)
    if root not in sys.path:
        sys.path.insert(0, root)
    try:
        from token_and_backup_toolkit import auto_backup  # type: ignore
    except ImportError:
        try:
            import auto_backup  # type: ignore
        except ImportError:
            print("[WARN] auto_backup 模組不可用，跳過備份", file=sys.stderr)
            return
    try:
        auto_backup.smart_backup(
            version_str=new_ver,
            modified_files=modified_files,
            note="bump_version.py 自動改版",
        )
    except Exception as e:
        print(f"[WARN] auto_backup 呼叫失敗: {e}", file=sys.stderr)


# ─── main ────────────────────────────────────────────────────────────────────

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

    results: list[tuple] = []
    modified_files: list[str] = []

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

    ok = sum(1 for s, _, _ in results if s == "OK")
    skip = sum(1 for s, _, _ in results if s == "SKIP")
    fail = sum(1 for s, _, _ in results if s == "FAIL")
    print(f"  總計: OK={ok}  SKIP={skip}  FAIL={fail}")

    if fail > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()