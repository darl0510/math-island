#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
version_bumpers.py
==================
專責各類專案檔案 (package.json / PROJECT_HANDOVER.md / index.html / sw.js / pyproject.toml)
之版本號更新、Handover 看板自動推進與自動備份觸發。
"""

import json
import os
import re
import sys
from datetime import date
from pathlib import Path
from typing import List, Tuple


def bump_package_json(ws: Path, new_ver: str, dry_run: bool) -> Tuple[str, str, int]:
    """更新 package.json 中的 version 欄位。"""
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


def advance_handover_tasks(ws: Path, new_ver: str, dry_run: bool = False) -> bool:
    """
    自動推進 PROJECT_HANDOVER.md 待辦任務與頂部 Prompt：
    1. 找到 Active Focus 區塊的第一個未完成任務 - [ ] **(Task Title)**
    2. 將其標記為完成 - [x] **(Task Title)** (已於 v{new_ver} 完成驗收並建立還原點)
    3. 移入 <details><summary>過往已完成歷史任務 (已收折)</summary>
    4. 抓取下一個未完成任務 - [ ] **(Next Task Title)**
    5. 自動合成頂部 Prompt 區塊的單行派工命令
    """
    fp = ws / "PROJECT_HANDOVER.md"
    if not fp.is_file():
        return False

    text = fp.read_text(encoding="utf-8")
    focus_pat = re.compile(r"##\s*[📌🎯]?\s*當前推進焦點看板\s*\(Active Focus\)[^\r\n]*")
    fold_pat = re.compile(r"<summary>[^<]*(?:過往已完成歷史任務|已完成歷史任務|點擊展開過往已完成)[^<]*</summary>")
    focus_match = focus_pat.search(text)
    fold_match = fold_pat.search(text)

    if not focus_match or not fold_match:
        return False

    focus_idx = focus_match.start()
    fold_idx = fold_match.start()
    fold_marker = fold_match.group(0)
    active_section = text[focus_idx:fold_idx]

    task_pat = re.compile(r"-\s*\[\s*\]\s*(\*{0,2}(?:【[^】]+】)?([^*]+)\*{0,2}[^\r\n]*)")
    matches = list(task_pat.finditer(active_section))
    if not matches:
        print("  [INFO] 看板無未完成待辦任務，無需推進")
        return False

    completed_match = matches[0]
    completed_full = completed_match.group(0)
    completed_title = completed_match.group(1)

    if len(matches) > 1:
        next_raw_title = matches[1].group(1).strip()
        clean_title = re.sub(r"[\*`]", "", next_raw_title).strip()
        next_task_cmd = f'python scripts/brain_delegator.py -w . -t "{clean_title}"'
        next_task_disp = clean_title
    else:
        next_task_cmd = 'python scripts/brain_delegator.py -w . -t "檢視現有模組邊界與未涵蓋測試，產出 3 項接地原子待辦，完成後自檢驗證"'
        next_task_disp = "檢視現有模組邊界與未涵蓋測試，產出 3 項接地原子待辦"

    # 從 Active Focus 移除已完成項目
    active_section_new = active_section.replace(completed_full + "\r\n", "")
    if active_section_new == active_section:
        active_section_new = active_section.replace(completed_full + "\n", "")
    if active_section_new == active_section:
        active_section_new = active_section.replace(completed_full, "")

    done_item = f"- [x] {completed_title} (已於 v{new_ver} 完成驗收並建立還原點)\n"
    text_new = text[:focus_idx] + active_section_new + text[fold_idx:]

    fold_insert_pos = text_new.index(fold_marker) + len(fold_marker)
    if text_new[fold_insert_pos:fold_insert_pos + 2] == "\r\n":
        fold_insert_pos += 2
    elif text_new[fold_insert_pos:fold_insert_pos + 1] == "\n":
        fold_insert_pos += 1
    if text_new[fold_insert_pos:fold_insert_pos + 2] == "\r\n":
        fold_insert_pos += 2
    elif text_new[fold_insert_pos:fold_insert_pos + 1] == "\n":
        fold_insert_pos += 1

    text_new = text_new[:fold_insert_pos] + done_item + text_new[fold_insert_pos:]

    # 更新頂部 Prompt 區塊中的單行命令（容忍標籤與指令間包含空行或多餘空白）
    prompt_cmd_pat = re.compile(
        r"(【⚡\s*單行派工命令[^\r\n]*】[\s\r\n]*)python scripts/brain_delegator\.py[^\r\n]+"
    )
    text_new, n_cmd = prompt_cmd_pat.subn(rf"\g<1>{next_task_cmd}", text_new)

    # 若頂部 Prompt 包含指定待辦任務列表，同步將完成項打勾
    clean_completed_core = re.sub(r"[\*`]", "", completed_title).strip()
    top_todo_pat = re.compile(r"(-\s*\[\s*\]\s*)" + re.escape(clean_completed_core))
    text_new = top_todo_pat.sub(rf"- [x] {clean_completed_core} (已於 v{new_ver} 完成)", text_new)

    if not dry_run:
        fp.write_text(text_new, encoding="utf-8")

    clean_completed = re.sub(r"[\*`]", "", completed_title).strip()
    print("  📋 [Handover Auto-Advance] 任務自動推進成功：")
    print(f"     ✔ 已完成並收折：{clean_completed}")
    print(f"     🚀 下一輪待辦已置頂：{next_task_disp}")
    return True


def bump_handover(ws: Path, new_ver: str, dry_run: bool) -> Tuple[str, str, int]:
    """更新 PROJECT_HANDOVER.md 核心版號標記與 Changelog 章節。"""
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

        # (b) Prompt 區塊首行 【vX.Y.Z】你好！（容忍版號與問候語間的空白；若缺版號則自動補齊）
        pat_b = re.compile(r"【v?\d+\.\d+\.\d+】(\s*你好[^\r\n]*)")
        new_b = rf"【v{new_ver}】\1"
        text_new, n = pat_b.subn(new_b, text)
        if n:
            text = text_new
            changes += n
        else:
            pat_b_missing = re.compile(r"(```(?:text)?\s*\r?\n\s*)(你好[！!][^\r\n]*)")
            text_new, n2 = pat_b_missing.subn(rf"\g<1>【v{new_ver}】 \2", text)
            if n2:
                text = text_new
                changes += n2

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


def bump_index_html(ws: Path, new_ver: str, dry_run: bool) -> Tuple[str, str, int]:
    """更新 index.html 中的資源版本參數、meta 標籤、title 與純文字版號。"""
    fp = ws / "index.html"
    if not fp.is_file():
        return ("SKIP", "index.html", 0)

    try:
        text = fp.read_text(encoding="utf-8")

        # 1. 靜態資源快取破壞查詢參數: ?v=2.9.8, &v=2.9.8, ?ver=2.9.8
        pat_query = re.compile(r"([?&](?:v|ver|version)=)v?(\d+\.\d+\.\d+)")

        # 2. meta 標籤: <meta name="version" content="2.9.8">
        pat_meta = re.compile(
            r'(<meta\s+[^>]*name=["\'](?:version|app-version)["\'][^>]*content=["\']v?)(\d+\.\d+\.\d+)(["\'])',
            re.I,
        )

        # 3. 標籤 title 屬性內的版號: title="系統版本：v2.9.8"
        pat_title = re.compile(r'((?:title=["\'][^"\']*?v))(\d+\.\d+\.\d+)(["\'])')

        # 4. HTML 標籤內的純版號文字: >v2.9.8< 或 > 2.9.8 <
        pat_tag_text = re.compile(r"(>[\s]*v?)(\d+\.\d+\.\d+)([\s]*<)")

        t, n1 = pat_query.subn(rf"\g<1>{new_ver}", text)
        t, n2 = pat_meta.subn(rf"\g<1>{new_ver}\g<3>", t)
        t, n3 = pat_title.subn(rf"\g<1>{new_ver}\g<3>", t)
        t, n4 = pat_tag_text.subn(rf"\g<1>{new_ver}\g<3>", t)

        total = n1 + n2 + n3 + n4
        if total == 0:
            return ("SKIP", "index.html", 0)

        if not dry_run:
            fp.write_text(t, encoding="utf-8")

        return ("OK", "index.html", total)
    except Exception as e:
        print(f"  [WARN] index.html 處理失敗: {e}", file=sys.stderr)
        return ("FAIL", "index.html", 0)


def bump_sw_js(ws: Path, new_ver: str, dry_run: bool) -> Tuple[str, str, int]:
    """更新 sw.js 中的 Service Worker 快取名稱常數 CACHE_NAME。"""
    fp = ws / "sw.js"
    if not fp.is_file():
        return ("SKIP", "sw.js", 0)

    try:
        text = fp.read_text(encoding="utf-8")
        pat = re.compile(r"(CACHE_NAME\s*=\s*['\"])(.*?(?:-v|v|@)?)(\d+\.\d+\.\d+)(['\"])")

        def _repl_cache(m):
            prefix = m.group(1)
            mid = m.group(2)
            quote = m.group(4)
            return f"{prefix}{mid}{new_ver}{quote}"

        text_new, n = pat.subn(_repl_cache, text)
        if n == 0:
            pat2 = re.compile(r"([A-Za-z0-9_\-]+-v)(\d+\.\d+\.\d+)")
            text_new, n = pat2.subn(rf"\g<1>{new_ver}", text)

        if n == 0:
            return ("SKIP", "sw.js", 0)

        if not dry_run:
            fp.write_text(text_new, encoding="utf-8")

        return ("OK", "sw.js", n)
    except Exception as e:
        print(f"  [WARN] sw.js 處理失敗: {e}", file=sys.stderr)
        return ("FAIL", "sw.js", 0)


def bump_pyproject(ws: Path, new_ver: str, dry_run: bool) -> Tuple[str, str, int]:
    """更新 pyproject.toml 中的 version 宣告。"""
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


def run_backup(new_ver: str, modified_files: List[str], no_backup: bool, dry_run: bool) -> None:
    """自動調用 auto_backup.smart_backup 建立安全還原節點。"""
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
