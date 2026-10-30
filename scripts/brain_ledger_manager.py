#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/brain_ledger_manager.py - Token Ledger & Quantified Accounting Manager
=============================================================================
Manages physical ledger persistence (local_tokens_ledger.json), token accounting,
cost saving estimation ($0.002 / 1k tokens), and supervisor status toggling.
"""

from __future__ import annotations

import datetime
import json
import os
import time
from typing import Any, Dict, Optional

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER_PATH = os.path.join(ROOT_DIR, "local_tokens_ledger.json")
DEFAULT_MODEL = "qwen3.8-flash-next-iq3_xxs"


def set_workspace(workspace_dir: str) -> None:
    """動態更新 Ledger 目標工作區。"""
    global ROOT_DIR, LEDGER_PATH
    ROOT_DIR = os.path.abspath(workspace_dir)
    LEDGER_PATH = os.path.join(ROOT_DIR, "local_tokens_ledger.json")


def load_ledger(ledger_path: Optional[str] = None) -> Dict[str, Any]:
    """載入本地 Token 記帳本。若不存在或格式錯誤則回傳初始結構。"""
    path = ledger_path or LEDGER_PATH
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "totalTokens": 0,
        "totalSavedUsdEst": 0.0,
        "sessions": [],
        "updatedAt": datetime.datetime.now().isoformat()
    }


def save_ledger(ledger: Dict[str, Any], ledger_path: Optional[str] = None) -> None:
    """持久化 Token 記帳本至磁碟。"""
    path = ledger_path or LEDGER_PATH
    ledger["updatedAt"] = datetime.datetime.now().isoformat()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(ledger, f, ensure_ascii=False, indent=2)


def append_ledger_record(
    task_name: str,
    prompt_tokens: int,
    completion_tokens: int,
    success: bool = True,
    note: str = "",
    model: str = DEFAULT_MODEL,
) -> int:
    """寫入一筆外包任務執行記錄至本地記帳本，計算節省美金並更新總計。"""
    ledger = load_ledger()
    try:
        prompt_tokens = max(0, int(prompt_tokens or 0))
    except (ValueError, TypeError):
        prompt_tokens = 0
    try:
        completion_tokens = max(0, int(completion_tokens or 0))
    except (ValueError, TypeError):
        completion_tokens = 0
    task_name = str(task_name or "").strip()
    note = str(note or "").strip()
    model = str(model or DEFAULT_MODEL).strip()
    total_new = prompt_tokens + completion_tokens
    # Estimated savings: ~$0.002 per 1k tokens of cloud API
    saved_usd = round(total_new * 0.000002, 6)

    ledger["totalTokens"] = ledger.get("totalTokens", 0) + total_new
    ledger["totalSavedUsdEst"] = round(ledger.get("totalSavedUsdEst", 0.0) + saved_usd, 4)
    ledger["lastStatus"] = "passed" if success else "failed"
    ledger["lastNote"] = note

    session_record = {
        "id": f"sess_{int(time.time()*1000)}",
        "task": task_name,
        "promptTokens": prompt_tokens,
        "completionTokens": completion_tokens,
        "totalTokens": total_new,
        "savedUsdEst": saved_usd,
        "status": "passed" if success else "failed",
        "note": note,
        "model": model,
        "timestamp": datetime.datetime.now().isoformat(),
    }
    sessions = ledger.setdefault("sessions", [])
    sessions.append(session_record)
    save_ledger(ledger)
    return total_new


def print_quantified_token_table(
    completion_tokens: int,
    total_tokens: int,
    elapsed_sec: float,
) -> None:
    """輸出標準化的 Markdown Token 量化表格與統計資訊。"""
    ledger = load_ledger()
    saved_usd = round(total_tokens * 0.000002, 4)
    total_cum_tokens = ledger.get("totalTokens", 0)
    total_cum_usd = ledger.get("totalSavedUsdEst", 0.0)

    if completion_tokens > 2500:
        print(f"\n⚠️  [非原子派工警報] 苦力單次生成 {completion_tokens} Tokens (突破 2500 上限)！請拆解為原子子任務以防 128k 上下文膨脹！\n")

    table_md = f"""#### 【本次 Token 消耗精準量化】
| 項目 | 數量 / 狀態 |
| :--- | :--- |
| 本地苦力產出 | {completion_tokens:,} Tokens (耗時 {elapsed_sec:.2f}s) |
| 本次節省價值 | 約 ${saved_usd:.4f} USD |
| 專案歷史累計 | {total_cum_tokens:,} Tokens / ${total_cum_usd:.4f} USD |
| 雲端監工消耗 | 0 原始碼手寫 / 極簡換手標準驗收 |"""

    print("\n" + "=" * 60)
    print("📋 【本次 Token 消耗精準量化】(可直接複製至交付報告)")
    print("=" * 60)
    print(table_md)
    print("=" * 60 + "\n")


def mark_passed(note: str) -> None:
    """
    雲端監工驗收通過後，將記帳本中最後一筆外包狀態翻轉為 passed，
    並同步通知即時狀態流推播，杜絕側邊欄殘留未通過警報。
    """
    from scripts.brain_status_helpers import find_project_root, update_live_status

    ledger = load_ledger()
    ledger["lastStatus"] = "passed"
    ledger["lastNote"] = note
    ledger["lastPassedAt"] = datetime.datetime.now().isoformat()
    if ledger.get("sessions"):
        ledger["sessions"][-1]["status"] = "passed"
        ledger["sessions"][-1]["note"] = note
    save_ledger(ledger)

    caller_ws = find_project_root(os.getcwd())
    if caller_ws and os.path.abspath(caller_ws) != os.path.abspath(ROOT_DIR):
        try:
            c_ledger_path = os.path.join(caller_ws, "local_tokens_ledger.json")
            if os.path.exists(c_ledger_path):
                with open(c_ledger_path, "r", encoding="utf-8") as cf:
                    c_ledger = json.load(cf)
                c_ledger["lastStatus"] = "passed"
                c_ledger["lastNote"] = note
                c_ledger["lastPassedAt"] = datetime.datetime.now().isoformat()
                if c_ledger.get("sessions"):
                    c_ledger["sessions"][-1]["status"] = "passed"
                    c_ledger["sessions"][-1]["note"] = note
                with open(c_ledger_path, "w", encoding="utf-8") as cf:
                    json.dump(c_ledger, cf, ensure_ascii=False, indent=2)
        except Exception:
            pass

    update_live_status(
        status="completed",
        step=f"✅ 外包狀態已標記通過: {note}",
        preview=f"// [Ledger] 外包狀態已成功翻轉為 PASSED\n// 說明：{note}\n// 時間：{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        active=False,
    )
    print(f"✅ [狀態翻轉] 本地苦力外包狀態已成功翻轉為 PASSED: {note}")

