#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/brain_code_validator.py - Code Sanitizer, AST Validator & ReAct Executor
================================================================================
Handles extracting code blocks from markdown LLM responses, AST/JSON syntax
validation, and running iterative ReAct multi-turn tool loops.
"""

from __future__ import annotations

import ast
import json
import os
import re
import sys
import time
from typing import Any, Dict, List, Optional

try:
    import react_agent
except Exception:
    react_agent = None

if react_agent is None:
    _GLOBAL_SCRIPTS_DIR = os.path.join(
        os.path.abspath(os.path.expanduser("~")), "projects", "antigravity-local-ide", "scripts"
    )
    if os.path.isfile(os.path.join(_GLOBAL_SCRIPTS_DIR, "react_agent.py")):
        if _GLOBAL_SCRIPTS_DIR not in sys.path:
            sys.path.append(_GLOBAL_SCRIPTS_DIR)
        try:
            import react_agent
        except Exception:
            react_agent = None


def extract_and_sanitize_code(content: str) -> str:
    """從 LLM 回傳內容中提取出乾淨的程式碼區塊，移除 markdown 標籤與中繼標記。"""
    if not content or not isinstance(content, str):
        return ""
    m = re.search(r"```(?:[a-zA-Z0-9_\-\.]+)?\s*([\s\S]*?)```", content)
    code = m.group(1).strip() if m else content.strip()
    if not m:
        lines = code.splitlines()
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        code = "\n".join(lines).strip()
    code = re.sub(r"^(?:---|\=\=\=)?\s*(?:FILE|File):\s*[^\n]+\s*(?:---|\=\=\=)?\n+", "", code).strip()
    return code


def validate_code_health(code: str, file_path: str = "") -> bool:
    """執行語法結構與健康度自檢 (Python AST、JSON 結構檢驗)。"""
    if not code or not isinstance(code, str) or not code.strip():
        return False
    lines = len(code.splitlines())
    if lines > 350:
        print(f"💡 [分塊提醒] 生成代碼共 {lines} 行，建議遵循「單次 ≤ 300 行分塊原則」以維持最高注意力與品質。")
    if file_path and file_path.lower().endswith(".json"):
        try:
            json.loads(code)
            print(f"✔ [JSON 結構驗證通過] {os.path.basename(file_path)} 格式正確 (共 {lines} 行)")
            return True
        except Exception as je:
            print(f"⚠️ [JSON 格式錯誤] {je} (檔案: {os.path.basename(file_path)})")
            return False
    if file_path and not file_path.lower().endswith((".py", ".pyw")):
        return len(code.strip()) > 0
    try:
        ast.parse(code)
        print(f"✔ [AST 語法驗證通過] {os.path.basename(file_path) or '代碼'} 語法結構完整 (共 {lines} 行)")
        return True
    except SyntaxError as e:
        print(f"⚠️ [AST 語法截斷警報] 偵測到語法錯誤或尾端截斷: {e.msg} (第 {e.lineno} 行)")
        return False


def run_react_mode(args) -> int:
    """執行 ReAct 多輪工具調用迭代迴圈。"""
    from scripts.brain_status_helpers import update_live_status

    if react_agent is None:
        print("❌ [ReAct 模式] 無法匯入 scripts/react_agent.py")
        return 1
    task = getattr(args, "task", None) or getattr(args, "prompt", None)
    if not task:
        print("❌ [ReAct 模式] 缺少 --task/-t 任務內容")
        return 1
    task_name = getattr(args, "task_name", None) or task[:60]
    t0 = time.time()
    tool_events: List[Dict[str, Any]] = []
    modified: List[str] = []

    def _on_event(ev: Dict[str, Any]) -> None:
        if ev.get("type") == "tool_end":
            tool_events.append(ev)
            if ev.get("ok") and ev.get("tool") in ("write_file", "edit_file"):
                path = (ev.get("args") or {}).get("path")
                if path and path not in modified:
                    modified.append(path)
            print(f"🛠️ [iter {ev.get('iteration')}] {ev.get('tool')} -> {'OK' if ev.get('ok') else 'FAIL'}")
            print((ev.get("output_preview") or "")[:1200])
        update_live_status(
            status="react_running",
            task=task_name,
            step=f"🛠️ ReAct 第 {ev.get('iteration')} 輪：{ev.get('tool') or ev.get('type')}",
            preview=(ev.get("output_preview") or ev.get("thought") or "")[:3000],
            tokens=len(tool_events),
            elapsed_sec=time.time() - t0,
        )

    print(f"🤖 [ReAct 模式] 啟動自主外包代理: {task_name}")
    update_live_status(
        status="react_starting",
        task=task_name,
        step="🚀 正在啟動 ReAct 自主外包代理...",
        preview="// 正在初始化 ReAct Agent 執行環境...",
        elapsed_sec=0.0,
    )
    react_kwargs = {
        "max_iterations": getattr(args, "react_max_iter", 10),
        "on_event": _on_event,
        "temperature": getattr(args, "temperature", 0.2),
        "system_prompt": getattr(args, "system_prompt", None),
    }
    if getattr(args, "model", None):
        react_kwargs["model"] = args.model
    if getattr(args, "url", None):
        react_kwargs["api_url"] = args.url

    workspace_override = getattr(args, "workspace", None)
    if workspace_override:
        react_kwargs["workspace"] = os.path.abspath(workspace_override)

    agent = react_agent.ReActAgent(**react_kwargs)
    result = agent.run(task)
    elapsed = time.time() - t0

    update_live_status(
        status="completed" if result.get("success") else "failed",
        task=task_name,
        step=f"🏁 ReAct 執行完畢 ({'成功' if result.get('success') else '未完成'})",
        preview=(result.get("answer") or result.get("error") or "")[:3000],
        tokens=len(tool_events),
        elapsed_sec=elapsed,
        active=False,
    )
    if result.get("success"):
        print(f"\n✔ [ReAct 成功] 耗時 {elapsed:.2f}s，修改檔案: {modified}")
        print("--- 最終成果 ---")
        print(result.get("answer"))
        return 0
    else:
        print(f"\n❌ [ReAct 未達成] 耗時 {elapsed:.2f}s，原因: {result.get('error')}")
        return 1

