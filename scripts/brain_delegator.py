#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/brain_delegator.py - Local Brain 8080 Outsourcing & Ledger Dispatcher
=============================================================================
Manages physical delegation to local 8080 brain (Qwen3.8-Flash-Next 125B MoE / Gemma 26B),
writes real tokens to local_tokens_ledger.json, and supports supervisor status toggling.

v0.4.34 fix: Added update_live_status() to write .delegator_live.json during task
execution, enabling real-time code stream preview in the sidebar panel. Also added
SSE streaming support so preview content updates token-by-token.
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import sys
import time
import urllib.error
import urllib.request
from typing import Any, Callable, Dict, List, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    import react_agent
except Exception:
    react_agent = None

if react_agent is None:  # 全域 fallback：跨專案改由 antigravity-local-ide 共用工具源載入
    _GLOBAL_SCRIPTS_DIR = os.path.join(
        os.path.abspath(os.path.expanduser("~")), "projects", "antigravity-local-ide", "scripts"
    )
    if os.path.isfile(os.path.join(_GLOBAL_SCRIPTS_DIR, "react_agent.py")):
        sys.path.append(_GLOBAL_SCRIPTS_DIR)
        try:
            import react_agent
        except Exception:
            react_agent = None

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER_PATH = os.path.join(ROOT_DIR, "local_tokens_ledger.json")
DEFAULT_URL = "http://127.0.0.1:8080/v1/chat/completions"
DEFAULT_MODEL = "qwen3.8-flash-next-iq3_xxs"

# ---------------------------------------------------------------------------
# Workspace Resolution — Dynamic project detection to prevent cross-project
# contamination when delegator is invoked from another workspace.
# ---------------------------------------------------------------------------

def find_project_root(start_path: str) -> Optional[str]:
    """
    從給定路徑（檔案或目錄）向上查找最近的專案根目錄。
    識別標誌：package.json, AGENTS.md, .git, local_tokens_ledger.json, pyproject.toml。
    終止條件：到達使用者家目錄或檔案系統根目錄。
    """
    if not start_path:
        return None
    try:
        curr = os.path.abspath(start_path)
    except Exception:
        return None
    if os.path.isfile(curr):
        curr = os.path.dirname(curr)
    
    home_dir = os.path.abspath(os.path.expanduser("~"))
    markers = ("package.json", "AGENTS.md", ".git", "local_tokens_ledger.json", "pyproject.toml")
    
    while curr and curr != home_dir and os.path.dirname(curr) != curr:
        for marker in markers:
            if os.path.exists(os.path.join(curr, marker)):
                return curr
        curr = os.path.dirname(curr)
    return None


def set_workspace(workspace_dir: str) -> None:
    """動態綁定全局工作區路徑與 Ledger 路徑。"""
    global ROOT_DIR, LEDGER_PATH
    ROOT_DIR = os.path.abspath(workspace_dir)
    LEDGER_PATH = os.path.join(ROOT_DIR, "local_tokens_ledger.json")


def resolve_workspace(
    explicit_workspace: Optional[str] = None,
    output_file: Optional[str] = None,
    prompt_file: Optional[str] = None,
) -> str:
    """
    推斷目標專案根目錄：
    1. --workspace 明確指定
    2. --output-file 向上查找最近專案根目錄
    3. --prompt-file 向上查找最近專案根目錄
    4. 當前工作目錄 os.getcwd() 向上查找
    5. fallback 到腳本所在專案根目錄
    """
    if explicit_workspace and os.path.isdir(explicit_workspace):
        return os.path.abspath(explicit_workspace)
    if output_file:
        found = find_project_root(output_file)
        if found:
            return found
    if prompt_file:
        found = find_project_root(prompt_file)
        if found:
            return found
    cwd = os.getcwd()
    home_dir = os.path.abspath(os.path.expanduser("~"))
    if cwd and os.path.abspath(cwd) != home_dir:
        found = find_project_root(cwd)
        if found:
            return found
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------------------
# Live-state helpers — write .delegator_live.json so the sidebar panel can
# display real-time streaming preview for THIS workspace only.
# ---------------------------------------------------------------------------

ANTIGRAVITY_ROOT = os.path.join(os.path.expanduser("~"), ".antigravity-ide")
PROJECTS_DIR = os.path.join(ANTIGRAVITY_ROOT, "projects")
DELEGATOR_FILENAME = ".delegator_live.json"


def _get_project_meta() -> Dict[str, str]:
    """Read project name & version from package.json in ROOT_DIR."""
    pkg_path = os.path.join(ROOT_DIR, "package.json")
    try:
        if os.path.exists(pkg_path):
            with open(pkg_path, "r", encoding="utf-8") as f:
                pkg = json.load(f)
            return {
                "name": pkg.get("name") or os.path.basename(ROOT_DIR),
                "version": pkg.get("version") or "0.0.0",
            }
    except Exception:
        pass
    return {"name": os.path.basename(ROOT_DIR), "version": "0.0.0"}


def update_live_status(
    status: Any,
    task: Any = "",
    step: str = "",
    preview: str = "",
    tokens: int = 0,
    saved_usd: float = 0.0,
    elapsed_sec: float = 0.0,
    output_file: str = "",
    model: str = "local-8080",
    active: bool = True,
    workspace: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Write .delegator_live.json to BOTH the workspace root AND the global
    project-scoped directory. The TypeScript WorkspaceSandboxService reads
    these files strictly scoped to the workspace to populate the real-time
    code-stream preview panel without cross-project contamination.
    """
    target_workspace = ROOT_DIR
    subdirectory = ""
    if isinstance(task, dict):
        payload = task
        if isinstance(status, str) and (os.path.isdir(status) or "\\" in status or "/" in status):
            target_workspace = os.path.abspath(status)
        status_val = payload.get("status", "idle")
        task_val = payload.get("task", "")
        step_val = payload.get("step", f"⚙️ {status_val}")
        preview_val = payload.get("preview", "")
        tokens_val = payload.get("tokens", 0)
        saved_usd_val = payload.get("savedUsd", 0.0)
        elapsed_sec_val = payload.get("elapsedSec", 0.0)
        output_file_val = payload.get("outputFile", "")
        model_val = payload.get("model", model)
        active_val = payload.get("active", status_val in ("starting", "running", "streaming", "verifying"))
        proj_name = payload.get("project", "")
        subdirectory = payload.get("subdirectory", "")
        ws_name = payload.get("workspace", target_workspace)
    else:
        status_val = str(status) if status is not None else "idle"
        task_val = str(task) if task else ""
        step_val = step
        preview_val = preview
        tokens_val = tokens
        saved_usd_val = saved_usd
        elapsed_sec_val = elapsed_sec
        output_file_val = output_file
        model_val = model
        active_val = active
        proj_name = ""
        ws_name = workspace or target_workspace

    if workspace:
        target_workspace = os.path.abspath(workspace)

    meta = _get_project_meta()
    final_proj_name = proj_name or meta["name"]
    state: Dict[str, Any] = {
        "active": active_val,
        "status": status_val,
        "project": final_proj_name,
        "version": meta["version"],
        "date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "task": task_val or "外包任務進行中",
        "step": step_val or f"⚙️ {status_val}",
        "tokens": tokens_val,
        "savedUsd": saved_usd_val,
        "elapsedSec": round(float(elapsed_sec_val or 0.0), 2),
        "outputFile": output_file_val,
        "model": model_val,
        "preview": preview_val or f"// [{final_proj_name}] {status_val}\n// {task_val}",
        "updatedAt": time.time(),
        "workspace": ws_name,
    }
    if subdirectory:
        state["subdirectory"] = subdirectory

    if extra:
        state.update(extra)

    payload_json = json.dumps(state, ensure_ascii=False, indent=2)

    # 1. Write to target workspace root (Priority 1 in TypeScript reader)
    local_path = os.path.join(target_workspace, DELEGATOR_FILENAME)
    try:
        with open(local_path, "w", encoding="utf-8") as f:
            f.write(payload_json)
    except Exception:
        pass

    # 1b. If caller workspace (cwd) is different, also write to caller workspace
    caller_ws = find_project_root(os.getcwd())
    if caller_ws and os.path.abspath(caller_ws) != os.path.abspath(target_workspace):
        try:
            caller_state = dict(state)
            caller_state["workspace"] = caller_ws
            caller_path = os.path.join(caller_ws, DELEGATOR_FILENAME)
            with open(caller_path, "w", encoding="utf-8") as f:
                json.dump(caller_state, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    # 2. Write to global project-scoped directories (Priority 2)
    candidate_names = {final_proj_name, os.path.basename(target_workspace)}
    for p_name in candidate_names:
        if not p_name:
            continue
        project_dir = os.path.join(PROJECTS_DIR, p_name)
        try:
            os.makedirs(project_dir, exist_ok=True)
            with open(os.path.join(project_dir, DELEGATOR_FILENAME), "w", encoding="utf-8") as f:
                f.write(payload_json)
        except Exception:
            pass


def load_ledger() -> Dict[str, Any]:
    if os.path.exists(LEDGER_PATH):
        try:
            with open(LEDGER_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "totalTokens": 0,
        "totalSavedUsdEst": 0.0,
        "sessions": [],
        "updatedAt": datetime.datetime.now().isoformat()
    }


def save_ledger(ledger: Dict[str, Any]) -> None:
    ledger["updatedAt"] = datetime.datetime.now().isoformat()
    with open(LEDGER_PATH, "w", encoding="utf-8") as f:
        json.dump(ledger, f, ensure_ascii=False, indent=2)


def append_ledger_record(
    task_name: str,
    prompt_tokens: int,
    completion_tokens: int,
    success: bool = True,
    note: str = ""
) -> int:
    ledger = load_ledger()
    total_new = prompt_tokens + completion_tokens
    # Estimated savings: ~$0.002 per 1k tokens of cloud API
    saved_usd = round(total_new * 0.000002, 6)

    ledger["totalTokens"] = ledger.get("totalTokens", 0) + total_new
    ledger["totalSavedUsdEst"] = round(ledger.get("totalSavedUsdEst", 0.0) + saved_usd, 4)

    session_record = {
        "id": f"sess_{int(time.time()*1000)}",
        "task": task_name,
        "promptTokens": prompt_tokens,
        "completionTokens": completion_tokens,
        "totalTokens": total_new,
        "savedUsdEst": saved_usd,
        "status": "passed" if success else "failed",
        "note": note,
        "timestamp": datetime.datetime.now().isoformat()
    }
    sessions = ledger.get("sessions", [])
    sessions.append(session_record)
    # keep last 50
    ledger["sessions"] = sessions[-50:]
    ledger["lastStatus"] = "passed" if success else "failed"
    ledger["lastNote"] = note
    save_ledger(ledger)

    # 1b. Also update caller workspace ledger if different
    caller_ws = find_project_root(os.getcwd())
    if caller_ws and os.path.abspath(caller_ws) != os.path.abspath(ROOT_DIR):
        try:
            c_ledger_path = os.path.join(caller_ws, "local_tokens_ledger.json")
            c_ledger = {}
            if os.path.exists(c_ledger_path):
                with open(c_ledger_path, "r", encoding="utf-8") as cf:
                    c_ledger = json.load(cf)
            c_ledger["totalTokens"] = c_ledger.get("totalTokens", 0) + total_new
            c_ledger["totalSavedUsdEst"] = round(c_ledger.get("totalSavedUsdEst", 0.0) + saved_usd, 4)
            c_sessions = c_ledger.get("sessions", [])
            c_sessions.append(session_record)
            c_ledger["sessions"] = c_sessions[-50:]
            c_ledger["lastStatus"] = "passed" if success else "failed"
            c_ledger["lastNote"] = note
            c_ledger["updatedAt"] = datetime.datetime.now().isoformat()
            with open(c_ledger_path, "w", encoding="utf-8") as cf:
                json.dump(c_ledger, cf, ensure_ascii=False, indent=2)
        except Exception:
            pass

    return total_new


def call_local_brain(
    prompt: str,
    system_prompt: str = (
        "You are a senior systems engineer. Output ONLY valid, complete Python code "
        "in a single markdown code block without any conversational text."
    ),
    max_tokens: int = 8192,
    task_name: str = "外包任務",
    on_chunk: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    """
    Call the local 8080 brain.  Supports both streaming (SSE) and non-streaming
    modes.  When on_chunk is provided the request is sent with stream=True and
    each SSE delta is forwarded to the callback; update_live_status() is called
    periodically so the sidebar preview refreshes in real time.
    """
    t0 = time.time()
    use_stream = on_chunk is not None

    request_payload: Dict[str, Any] = {
        "model": DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.2,
        "stream": use_stream,
    }
    data = json.dumps(request_payload).encode("utf-8")
    req = urllib.request.Request(
        DEFAULT_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Antigravity-Brain-Delegator",
        },
    )

    if use_stream:
        # ── Streaming path ──────────────────────────────────────────────
        accumulated = ""
        prompt_tokens = len(prompt) // 4
        completion_tokens = 0
        last_update_time = t0

        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                for raw_line in resp:
                    line = raw_line.decode("utf-8").strip()
                    if not line or not line.startswith("data:"):
                        continue
                    payload_str = line[5:].strip()
                    if payload_str == "[DONE]":
                        break
                    try:
                        chunk_json = json.loads(payload_str)
                    except json.JSONDecodeError:
                        continue
                    delta = (
                        chunk_json.get("choices", [{}])[0]
                        .get("delta", {})
                        .get("content", "")
                    )
                    if delta:
                        accumulated += delta
                        completion_tokens += len(delta) // 4
                        if on_chunk:
                            on_chunk(delta)
                        # Throttle live-state writes to ~2 Hz
                        now = time.time()
                        if now - last_update_time >= 0.5:
                            last_update_time = now
                            update_live_status(
                                status="streaming",
                                task=task_name,
                                step="🔄 串流代碼中…",
                                preview=accumulated[-3000:],  # last 3000 chars
                                tokens=completion_tokens,
                                elapsed_sec=now - t0,
                                model=DEFAULT_MODEL,
                                active=True,
                            )
            elapsed = time.time() - t0
            return {
                "success": True,
                "content": accumulated,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "elapsed": elapsed,
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "prompt_tokens": len(prompt) // 4,
                "completion_tokens": 0,
                "elapsed": time.time() - t0,
            }
    else:
        # ── Non-streaming (batch) path ───────────────────────────────────
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                usage = res_json.get("usage", {})
                prompt_tokens = usage.get("prompt_tokens", len(prompt) // 4)
                content = res_json["choices"][0]["message"]["content"]
                completion_tokens = usage.get(
                    "completion_tokens", len(content) // 4
                )
                elapsed = time.time() - t0
                return {
                    "success": True,
                    "content": content,
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "elapsed": elapsed,
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "prompt_tokens": len(prompt) // 4,
                "completion_tokens": 0,
                "elapsed": time.time() - t0,
            }


def mark_passed(note: str) -> None:
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
    print(f"✅ [狀態翻轉] 本地苦力外包狀態已成功翻轉為 PASSED: {note}")


def extract_and_sanitize_code(content: str) -> str:
    import re
    m = re.search(r"```(?:python)?\s*([\s\S]*?)```", content)
    code = m.group(1).strip() if m else content.strip()
    if not m:
        lines = code.splitlines()
        if lines and lines[0].startswith("```"): lines = lines[1:]
        if lines and lines[-1].strip() == "```": lines = lines[:-1]
        code = "\n".join(lines).strip()
    code = re.sub(r"^(?:---|\=\=\=)?\s*(?:FILE|File):\s*[^\n]+\s*(?:---|\=\=\=)?\n+", "", code).strip()
    return code


def validate_code_health(code: str, file_path: str = "") -> bool:
    import ast
    lines = len(code.splitlines())
    if lines > 350:
        print(f"💡 [分塊提醒] 生成代碼共 {lines} 行，建議遵循「單次 ≤ 300 行分塊原則」以維持最高注意力與品質。")
    try:
        ast.parse(code)
        print(f"✔ [AST 語法驗證通過] {os.path.basename(file_path) or '代碼'} 語法結構完整 (共 {lines} 行)")
        return True
    except SyntaxError as e:
        print(f"⚠️ [AST 語法截斷警報] 偵測到語法錯誤或尾端截斷: {e.msg} (第 {e.lineno} 行)")
        return False


def run_react_mode(args) -> int:
    if react_agent is None:
        print("❌ [ReAct 模式] 無法匯入 scripts/react_agent.py")
        return 1
    task = args.task or args.prompt
    if not task:
        print("❌ [ReAct 模式] 缺少 --task/-t 任務內容")
        return 1
    task_name = args.task_name or task[:60]
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
            model=getattr(args, "model", DEFAULT_MODEL),
            active=True,
            extra={"toolEvents": tool_events[-40:], "modifiedFiles": list(modified)},
        )

    update_live_status(
        status="starting",
        task=task_name,
        step="🚀 啟動自主 ReAct 迴圈…",
        preview=f"// 自主 ReAct 任務啟動\n// {task_name}",
        model=DEFAULT_MODEL,
        active=True,
        extra={"toolEvents": [], "modifiedFiles": []},
    )
    res = react_agent.run_react_task(
        task=task,
        workspace=ROOT_DIR,
        max_iterations=args.max_iterations,
        on_event=_on_event,
        max_tokens=args.max_tokens,
        model=getattr(args, "model", DEFAULT_MODEL),
    )
    total = append_ledger_record(
        task_name=task_name,
        prompt_tokens=res.get("prompt_tokens", 0),
        completion_tokens=res.get("completion_tokens", 0),
        success=res.get("success", False),
        note=f"ReAct autonomous: iterations={res.get('iterations')} tools={len(tool_events)} modified={modified}",
    )
    update_live_status(
        status="completed" if res.get("success") else "failed",
        task=task_name,
        step=("✅ 自主 ReAct 完成" if res.get("success") else "❌ 自主 ReAct 未完成"),
        preview=(res.get("final_answer") or res.get("error") or "")[:3000],
        tokens=res.get("completion_tokens", 0),
        saved_usd=round(total * 0.000002, 6),
        elapsed_sec=time.time() - t0,
        model=DEFAULT_MODEL,
        active=False,
        extra={"toolEvents": tool_events[-40:], "modifiedFiles": modified,
               "iterations": res.get("iterations", 0), "finalAnswer": res.get("final_answer", "")},
    )
    print(f"=== Final Answer === {res.get('final_answer') or res.get('error')}")
    print(f"iterations={res.get('iterations')} tools={len(tool_events)} modified={modified} ledger_tokens={total}")
    return 0 if res.get("success") else 1


def main():
    parser = argparse.ArgumentParser(description="Strata Local Brain Delegator")
    parser.add_argument("--prompt", "-p", type=str, help="Prompt to delegate to local brain")
    parser.add_argument("--prompt-file", "-f", type=str, help="Read prompt from file")
    parser.add_argument("--output-file", "-o", type=str, help="Output generated code directly to file")
    parser.add_argument("--max-tokens", "-m", type=int, default=8192, help="Max tokens (default: 8192)")
    parser.add_argument("--task", "-t", type=str, default="", help="Task / prompt (claude_delegator compatible)")
    parser.add_argument("--task-name", dest="task_name", type=str, default="", help="Task name for ledger display")
    parser.add_argument("--react", action="store_true", help="Fully autonomous ReAct loop: read_file/edit_file/write_file/run_bash/list_dir")
    parser.add_argument("--max-iterations", type=int, default=12, help="Max ReAct iterations")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help="Local brain model id")
    parser.add_argument("--mark-passed", type=str, help="Mark last outsourcing status as passed with explanation note")
    parser.add_argument("--status", action="store_true", help="Print current ledger status")
    parser.add_argument("--workspace", "-w", type=str, help="Target workspace root folder")
    args = parser.parse_args()

    # 自動解析目標工作區並完成動態綁定，避免跨專案執行時污染其他專案
    target_workspace = resolve_workspace(
        explicit_workspace=args.workspace,
        output_file=args.output_file,
        prompt_file=args.prompt_file,
    )
    set_workspace(target_workspace)

    if args.status:
        ledger = load_ledger()
        print(json.dumps(ledger, ensure_ascii=False, indent=2))
        return

    if args.mark_passed:
        mark_passed(args.mark_passed)
        return

    if args.react:
        sys.exit(run_react_mode(args))

    prompt = args.prompt or args.task
    if args.prompt_file and os.path.exists(args.prompt_file):
        with open(args.prompt_file, "r", encoding="utf-8") as f:
            prompt = f.read()

    if prompt:
        task_name = args.task_name or args.task or "code_task"
        output_file = args.output_file or ""

        # ── Announce task start ──────────────────────────────────────────
        update_live_status(
            status="starting",
            task=task_name,
            step="🚀 啟動本地 8080 外包任務…",
            preview=f"// [{os.path.basename(ROOT_DIR)}] 外包任務啟動中\n// 任務：{task_name}\n// 目標：{output_file or '(stdout)'}\n// 正在連接本地 8080 大腦...",
            output_file=output_file,
            model=DEFAULT_MODEL,
            active=True,
        )

        # ── Stream chunk accumulator ─────────────────────────────────────
        streamed_chunks: List[str] = []

        def _on_chunk(chunk: str) -> None:
            streamed_chunks.append(chunk)
            print(chunk, end="", flush=True)

        # ── Execute with streaming ───────────────────────────────────────
        update_live_status(
            status="running",
            task=task_name,
            step="⚙️ 8080 苦力運算中…",
            preview=f"// [{os.path.basename(ROOT_DIR)}] 等待首個 token…\n// 任務：{task_name}",
            output_file=output_file,
            model=DEFAULT_MODEL,
            active=True,
        )
        res = call_local_brain(
            prompt,
            max_tokens=args.max_tokens,
            task_name=task_name,
            on_chunk=_on_chunk,
        )
        if streamed_chunks:
            print()  # newline after streaming output

        total = append_ledger_record(
            task_name=task_name,
            prompt_tokens=res.get("prompt_tokens", 0),
            completion_tokens=res.get("completion_tokens", 0),
            success=res.get("success", False),
            note=f"Delegated via brain_delegator: {task_name}"
        )

        if res.get("success"):
            elapsed = res.get("elapsed", 0.0)
            content = res.get("content", "")
            print(f"✔ [本地外包成功] 產出 {total} Tokens (耗時 {elapsed:.2f}s)")

            if output_file:
                # ── Verifying ────────────────────────────────────────────
                update_live_status(
                    status="verifying",
                    task=task_name,
                    step="🔍 驗證生成代碼…",
                    preview=content[-3000:],
                    tokens=res.get("completion_tokens", 0),
                    saved_usd=round(total * 0.000002, 6),
                    elapsed_sec=elapsed,
                    output_file=output_file,
                    model=DEFAULT_MODEL,
                    active=True,
                )
                clean_code = extract_and_sanitize_code(content)
                os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
                with open(output_file, "w", encoding="utf-8") as out_f:
                    out_f.write(clean_code)
                print(f"💾 [代碼落盤成功] 已寫入 {output_file}")
                passed = validate_code_health(clean_code, output_file)
                # ── Completed ────────────────────────────────────────────
                update_live_status(
                    status="completed",
                    task=task_name,
                    step=f"{'✅' if passed else '⚠️'} 代碼已落盤 {'(語法通過)' if passed else '(含語法警告)'}",
                    preview=clean_code[-3000:],
                    tokens=res.get("completion_tokens", 0),
                    saved_usd=round(total * 0.000002, 6),
                    elapsed_sec=elapsed,
                    output_file=output_file,
                    model=DEFAULT_MODEL,
                    active=False,
                )
            else:
                # Non-file output — print and mark completed
                if not streamed_chunks:
                    print(content)
                update_live_status(
                    status="completed",
                    task=task_name,
                    step="✅ 外包任務完成 (stdout 輸出)",
                    preview=content[-3000:],
                    tokens=res.get("completion_tokens", 0),
                    saved_usd=round(total * 0.000002, 6),
                    elapsed_sec=elapsed,
                    model=DEFAULT_MODEL,
                    active=False,
                )
        else:
            err_msg = res.get("error", "未知錯誤")
            print(f"❌ [本地外包異常]: {err_msg}")
            update_live_status(
                status="failed",
                task=task_name,
                step=f"❌ 外包任務失敗: {err_msg[:80]}",
                preview=f"// ❌ [{os.path.basename(ROOT_DIR)}] 外包任務失敗\n// 任務：{task_name}\n// 錯誤：{err_msg}",
                output_file=output_file,
                model=DEFAULT_MODEL,
                active=False,
            )


if __name__ == "__main__":
    main()
