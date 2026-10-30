#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Autonomous ReAct Agent – pure stdlib, multi-turn Thought→Action→Observation loop."""
from __future__ import annotations
import os, sys, json, re, time, datetime, subprocess, urllib.request, urllib.error, ast, difflib
from typing import Any, Callable, Optional

DEFAULT_URL: str = "http://127.0.0.1:8080/v1/chat/completions"
DEFAULT_MODEL: str = "qwen3.8-flash-next-iq3_xxs"
TOOL_NAMES: tuple = ("read_file", "write_file", "edit_file", "run_bash", "list_dir")


def safe_path(workspace: str, raw_path: str) -> str:
    ws = os.path.abspath(workspace)
    p = os.path.abspath(os.path.join(ws, raw_path)) if not os.path.isabs(raw_path) else os.path.abspath(raw_path)
    try:
        os.path.commonpath([ws, p])
    except ValueError:
        raise ValueError("路徑越界")
    if os.path.relpath(p, ws).startswith(".."):
        raise ValueError("路徑越界")
    return p


def tool_read_file(workspace: str, args: dict) -> dict:
    try:
        p = safe_path(workspace, args.get("path", ""))
        if not os.path.isfile(p):
            return {"ok": False, "output": f"檔案不存在: {args.get('path')}", "modified": None}
        with open(p, encoding="utf-8") as f:
            lines = f.readlines()
        start = args.get("start_line", 1)
        end = args.get("end_line", len(lines))
        chunk = lines[start - 1: end]
        out = "".join(f"{i}\t{ln}" for i, ln in enumerate(chunk, start))
        return {"ok": True, "output": out, "modified": None}
    except Exception as e:
        return {"ok": False, "output": str(e), "modified": None}


RE_NETWORK_TOOLS = re.compile(r"(?i)(?<![./\\])\b(curl|wget|nc|netcat|ncat|socat|telnet|ftp|sftp|ssh|scp)\b")
RE_CLOUD_METADATA = re.compile(r"169\.254\.169\.254|metadata\.google\.internal|metadata\.azure|100\.100\.100\.200")
RE_SENSITIVE_PATHS = re.compile(r"(?i)(/etc/(?:passwd|shadow|sudoers)|\.ssh[\\/]|\.aws[\\/]|\bid_rsa\b|\bid_ed25519\b|%USERPROFILE%[\\/]\.ssh)")
RE_DESTRUCTIVE_CMDS = re.compile(r"(?i)\brm\s+-[a-z]*r[a-z]*f[a-z]*\s+([/~]|\*)")

DANGEROUS_AST_MODULES = {"socket", "pty", "telnetlib"}
DANGEROUS_AST_CALLS = {"eval", "exec", "__import__"}
DANGEROUS_AST_ATTR_CALLS = {
    ("os", "system"),
    ("os", "popen"),
    ("pty", "spawn"),
}


def _extract_python_inline_code(command: str) -> Optional[str]:
    """提取 python -c "..." 或 python3 -c '...' 中的行內代碼。"""
    m = re.search(r"""(?:python|python3)\s+-c\s+(?:\"([^\"]*)\"|'([^']*)')""", command, re.DOTALL)
    if m:
        return m.group(1) if m.group(1) is not None else m.group(2)
    return None


def check_command_security(command: str) -> Optional[str]:
    """執行命令前置正則安全檢查，阻斷未授權外連、雲端 Metadata 及敏感路徑存取。"""
    if not command:
        return None
    if RE_SENSITIVE_PATHS.search(command):
        m = RE_SENSITIVE_PATHS.search(command).group(1)
        return f"偵測到敏感路徑窺探或未授權憑證存取: {m}"
    if RE_CLOUD_METADATA.search(command):
        return "偵測到雲端 Instance Metadata 存取嘗試 (169.254/metadata)"
    if RE_DESTRUCTIVE_CMDS.search(command):
        return "偵測到高風險全域破壞性刪除指令 (rm -rf / 或 ~)"
    if RE_NETWORK_TOOLS.search(command):
        m = RE_NETWORK_TOOLS.search(command).group(1)
        return f"偵測到未授權外連工具/網路傳輸指令: {m}"
    return None


def check_python_security_ast(content: str, filename: str = "") -> Optional[str]:
    """靜態 AST 語法檢查，檢查是否存在危險導入與調用。"""
    try:
        tree = ast.parse(content, filename=filename or "<string>")
    except Exception:
        return None

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                mod_root = alias.name.split(".")[0]
                if mod_root in DANGEROUS_AST_MODULES:
                    return f"禁止導入危險模組 '{alias.name}'"
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                mod_root = node.module.split(".")[0]
                if mod_root in DANGEROUS_AST_MODULES:
                    return f"禁止從危險模組 '{node.module}' 導入"
        elif isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Name) and func.id in DANGEROUS_AST_CALLS:
                return f"禁止調用危險函數 '{func.id}()'"
            elif isinstance(func, ast.Attribute):
                if isinstance(func.value, ast.Name):
                    call_tuple = (func.value.id, func.attr)
                    if call_tuple in DANGEROUS_AST_ATTR_CALLS:
                        return f"禁止調用危險屬性函數 '{func.value.id}.{func.attr}()'"
    return None


def check_python_syntax(path: str, content: str) -> Optional[str]:
    """檢查 Python 檔案之 AST 語法健全性與危險調用，若有異常回傳錯誤描述。"""
    if path.endswith(".py"):
        try:
            ast.parse(content, filename=path)
        except SyntaxError as e:
            snippet = e.text.strip() if e.text else ""
            return f"SyntaxError at line {e.lineno}, col {e.offset}: {e.msg} (代碼: {snippet})"
        except Exception as e:
            return f"AST 解析異常: {e}"
        sec_err = check_python_security_ast(content, filename=path)
        if sec_err:
            return f"AST 安全檢查失敗: {sec_err}"
    return None


def tool_write_file(workspace: str, args: dict) -> dict:
    try:
        p = safe_path(workspace, args.get("path", ""))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        content = args.get("content", "")
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)
        rel = os.path.relpath(p, os.path.abspath(workspace))
        syntax_err = check_python_syntax(p, content)
        if syntax_err:
            prefix = "⚠️ 寫入成功但 " if not syntax_err.startswith("⚠️") else ""
            if "AST 語法檢查失敗" in syntax_err or "AST 安全檢查失敗" in syntax_err:
                msg = f"{prefix}{syntax_err}，請立即檢查並修正！"
            else:
                msg = f"{prefix}AST 語法檢查失敗: {syntax_err}，請立即檢查並修正語法！"
            return {
                "ok": False,
                "output": msg,
                "modified": rel,
            }
        return {"ok": True, "output": f"寫入 {len(content.splitlines())} 行 → {rel}", "modified": rel}
    except Exception as e:
        return {"ok": False, "output": str(e), "modified": None}


def tool_edit_file(workspace: str, args: dict) -> dict:
    try:
        p = safe_path(workspace, args.get("path", ""))
        if not os.path.isfile(p):
            return {"ok": False, "output": f"檔案不存在: {args.get('path')}", "modified": None}
        with open(p, encoding="utf-8") as f:
            content = f.read()
        old = args.get("old_text", "")
        new = args.get("new_text", "")
        replace_all = args.get("replace_all", False)
        count = content.count(old)
        if count == 0:
            return {"ok": False, "output": "old_text 未找到，請先 read_file 確認原文", "modified": None}
        if count > 1 and not replace_all:
            return {"ok": False, "output": f"old_text 出現 {count} 處，請加 replace_all=true 或縮小範圍", "modified": None}
        new_content = content.replace(old, new) if replace_all else content.replace(old, new, 1)
        with open(p, "w", encoding="utf-8") as f:
            f.write(new_content)
        rel = os.path.relpath(p, os.path.abspath(workspace))
        syntax_err = check_python_syntax(p, new_content)
        if syntax_err:
            prefix = "⚠️ 編輯完成但 " if not syntax_err.startswith("⚠️") else ""
            if "AST 語法檢查失敗" in syntax_err or "AST 安全檢查失敗" in syntax_err:
                msg = f"{prefix}{syntax_err}，請立即檢查並修正！"
            else:
                msg = f"{prefix}AST 語法檢查失敗: {syntax_err}，請立即檢查並修正語法！"
            return {
                "ok": False,
                "output": msg,
                "modified": rel,
            }
        return {"ok": True, "output": f"編輯完成 ({count} 處)", "modified": rel}
    except Exception as e:
        return {"ok": False, "output": str(e), "modified": None}


def tool_run_bash(workspace: str, args: dict) -> dict:
    try:
        cmd = args.get("command", "")
        sec_err = check_command_security(cmd)
        if sec_err:
            return {"ok": False, "output": f"❌ [安全護欄攔截] 指令已被阻斷: {sec_err}", "modified": None}

        py_code = _extract_python_inline_code(cmd)
        if py_code:
            ast_err = check_python_security_ast(py_code)
            if ast_err:
                return {"ok": False, "output": f"❌ [安全護欄攔截] Python 行內指令 AST 安全檢查失敗: {ast_err}", "modified": None}

        timeout = args.get("timeout", 120)
        r = subprocess.run(cmd, shell=True, cwd=workspace, capture_output=True, text=True,
                           timeout=timeout, encoding="utf-8", errors="replace")
        out = r.stdout + r.stderr
        return {"ok": r.returncode == 0, "output": f"[rc={r.returncode}]\n{out}", "modified": None}
    except subprocess.TimeoutExpired:
        return {"ok": False, "output": "命令超時", "modified": None}
    except Exception as e:
        return {"ok": False, "output": str(e), "modified": None}


def tool_list_dir(workspace: str, args: dict) -> dict:
    try:
        p = safe_path(workspace, args.get("path", "."))
        if not os.path.isdir(p):
            return {"ok": False, "output": f"目錄不存在: {args.get('path')}", "modified": None}
        entries: list[str] = []
        for name in sorted(os.listdir(p)):
            fp = os.path.join(p, name)
            if os.path.isdir(fp):
                entries.append(f"[DIR]  {name}/")
            else:
                entries.append(f"[FILE] {name} ({os.path.getsize(fp)}B)")
        return {"ok": True, "output": "\n".join(entries), "modified": None}
    except Exception as e:
        return {"ok": False, "output": str(e), "modified": None}


def dispatch_tool(workspace: str, name: str, args: dict) -> dict:
    tools: dict[str, Callable] = {"read_file": tool_read_file, "write_file": tool_write_file,
                                  "edit_file": tool_edit_file, "run_bash": tool_run_bash, "list_dir": tool_list_dir}
    if name not in tools:
        return {"ok": False, "output": f"未知工具: {name}，可用工具: {', '.join(TOOL_NAMES)}", "modified": None}
    return tools[name](workspace, args)


def parse_react_step(text: str) -> dict:
    thought_m = re.search(r"Thought:\s*(.*?)(?=\n(?:Action|Final Answer)|$)", text, re.S)
    action_m = re.search(r"Action:\s*(\w+)", text)
    input_m = re.search(r"Action Input:\s*(.+?)(?=\n(?:Thought|Final Answer)|$)", text, re.S)
    final_m = re.search(r"Final Answer:\s*(.*)", text, re.S)
    action_input: Optional[dict] = None
    if input_m:
        raw = input_m.group(1).strip()
        try:
            action_input = json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            action_input = {"path": raw}
    action = action_m.group(1) if action_m else None
    if action and final_m:
        final_m = None  # Action 優先
    return {"thought": thought_m.group(1).strip() if thought_m else "",
            "action": action, "action_input": action_input,
            "final_answer": final_m.group(1).strip() if final_m else None}


def extract_target_file(task: str, workspace: str = "") -> Optional[str]:
    """Extract contract target file from task description."""
    if not task:
        return None
    # 1. Backtick quotes: `path/to/file.ext`
    m = re.search(r"`([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9_]{1,10})`", task)
    if m:
        return m.group(1).replace("\\", "/")

    # 2. Explicit label: 目標檔案: foo.py / target_file: foo.py
    m = re.search(r"(?:目標檔案|target_file|target|目標)[：:\s=]+[`\"]?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9_]{1,10})[`\"]?", task, re.IGNORECASE)
    if m:
        return m.group(1).replace("\\", "/")

    # 3. Action prefix: 強化/修改/更新/讀取/編輯/重構/優化/修復 path/to/file.ext
    m = re.search(r"(?:強化|修改|更新|讀取|編輯|重構|優化|修復)\s+[`\"]?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9_]{1,10})[`\"]?", task)
    if m:
        return m.group(1).replace("\\", "/")

    # 4. Any path with code or doc extension
    ext_pattern = r"\b([a-zA-Z0-9_\-./\\]+\.(?:py|ts|js|json|md|txt|html|css|yaml|yml|sh|bat|toml|rs|go|c|cpp|h))\b"
    matches = re.findall(ext_pattern, task, re.IGNORECASE)
    if matches:
        if workspace:
            ws = os.path.abspath(workspace)
            for cand in matches:
                cand_clean = cand.replace("\\", "/")
                if os.path.isfile(os.path.join(ws, cand_clean)):
                    return cand_clean
        return matches[0].replace("\\", "/")

    return None


def build_system_prompt(workspace: str, locked_target: Optional[str] = None) -> str:
    prompt = (
        f"工作區根目錄: {os.path.abspath(workspace)}\n"
        "你可以連續多輪使用工具解決任務。每一輪只能輸出一個動作，格式嚴格如下：\n\n"
        "Thought: <你的推理>\nAction: <read_file|write_file|edit_file|run_bash|list_dir>\n"
        "Action Input: <單一 JSON 物件，單行>\n\n完成時輸出：\n"
        "Thought: <總結>\nFinal Answer: <一句話結論 + 改了哪些檔案>\n\n"
        "範例 1：\nThought: 先看目標檔案現況\nAction: read_file\n"
        'Action Input: {"path": "scripts/demo.py"}\n\n'
        "範例 2：\nThought: 補上缺少的 import\nAction: edit_file\n"
        'Action Input: {"path": "scripts/demo.py", "old_text": "import os", "new_text": "import os\\nimport sys"}\n\n'
        "規則：一次只允許一個 Action；Action Input 必須是合法單行 JSON；"
        "嚴禁一次輸出多個 Action；嚴禁輸出 markdown 程式碼圍欄；所有 path 皆相對於工作區根目錄。\n\n"
        "策略鐵律：\n"
        "- 先規劃再行動，第 3 輪之內必須發出第一個寫入類 Action（write_file 或 edit_file）\n"
        "- 同一檔案嚴禁重複 read_file；read_file 一律帶 start_line 與 end_line，單次不超過 100 行\n"
        "- 只要已掌握足以修改的原文片段，立即 edit_file，嚴禁繼續讀檔收集無關內容\n"
        "- 每次回覆只允許一個 Action，嚴禁一次輸出多個 Action\n"
        "- 最後一輪若尚未完成，直接給 Final Answer 說明未完成原因"
    )
    if locked_target:
        prompt += (
            f"\n\n【契約鎖定目標檔案】: {locked_target}\n"
            f"- 本輪派工已鎖定單一目標檔案: {locked_target}。\n"
            f"- 嚴禁以 list_dir 開場探索；首輪請直接 read_file 查看目標檔案或 edit_file。\n"
            f"- 嚴禁跨檔編輯：本任務僅允許修改 {locked_target}，修改其他檔案將被護欄直接攔截。"
        )
    return prompt


def brain_chat_stream(messages: list, on_delta: Optional[Callable] = None,
                      max_tokens: int = 2048, model: str = DEFAULT_MODEL,
                      url: str = DEFAULT_URL) -> dict:
    body = json.dumps({"model": model, "messages": messages, "max_tokens": max_tokens,
                       "stream": True}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    full: list[str] = []
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            for raw_line in resp:
                line = raw_line.decode("utf-8", errors="replace").strip()
                if not line or not line.startswith("data:"):
                    continue
                payload = line[5:].strip()
                if payload == "[DONE]":
                    break
                try:
                    obj = json.loads(payload)
                    delta = obj.get("choices", [{}])[0].get("delta", {}).get("content", "")
                    if delta:
                        full.append(delta)
                        if on_delta:
                            on_delta(delta)
                except (json.JSONDecodeError, IndexError, KeyError):
                    continue
    except (urllib.error.URLError, OSError) as e:
        return {"ok": False, "content": "", "error": str(e)}
    return {"ok": True, "content": "".join(full), "error": ""}


def run_react_task(task: str, workspace: str, max_iterations: int = 12,
                   on_event: Optional[Callable] = None, max_tokens: int = 2048,
                   model: str = DEFAULT_MODEL, url: str = DEFAULT_URL,
                   target_file: Optional[str] = None) -> dict:
    t0 = time.time()
    if not target_file:
        target_file = extract_target_file(task, workspace)
    locked_target: Optional[str] = None
    if target_file:
        try:
            full_p = safe_path(workspace, target_file)
            locked_target = os.path.relpath(full_p, os.path.abspath(workspace)).replace("\\", "/")
        except Exception:
            locked_target = target_file.replace("\\", "/")

    messages: list[dict] = [{"role": "system", "content": build_system_prompt(workspace, locked_target=locked_target)},
                            {"role": "user", "content": task}]
    modified_files: list[str] = []
    tool_events: list[dict] = []
    prompt_tokens = 0
    completion_tokens = 0
    final_answer = ""
    error = ""
    success = False
    iterations = 0
    seen_actions: set = set()
    for it in range(1, max_iterations + 1):
        iterations = it
        prompt_tokens += sum(len(m.get("content", "")) for m in messages) // 4
        remaining = max_iterations - it + 1
        if remaining <= 3:
            messages.append({"role": "user", "content": f"警告：迭代預算只剩 {remaining} 輪，請立即發出 edit_file 或 Final Answer。"})
        resp = brain_chat_stream(messages, max_tokens=max_tokens, model=model, url=url)
        if not resp["ok"]:
            error = resp["error"]
            break
        completion_tokens += len(resp["content"]) // 4
        messages.append({"role": "assistant", "content": resp["content"]})
        step = parse_react_step(resp["content"])
        thought = step["thought"]
        if on_event:
            on_event({"type": "thought", "iteration": it, "tool": None, "args": None,
                      "ok": None, "output_preview": "", "thought": thought, "ts": time.time()})
        if step["action"]:
            action = step["action"]
            args = step["action_input"] or {}

            # ── 護欄 1：首輪攔截 list_dir 與摸索 ──
            if action == "list_dir":
                if it == 1 or locked_target:
                    obs = (
                        f"❌ [契約護欄攔截] 嚴禁使用 list_dir 摸索！"
                        + (f"契約已鎖定單一目標檔案 '{locked_target}'，請直接 read_file 查看或 edit_file 修改。"
                           if locked_target else "請直接操作契約指定檔案。")
                    )
                    messages.append({"role": "user", "content": f"Observation:\n{obs}"})
                    if on_event:
                        on_event({"type": "tool_intercepted", "iteration": it, "tool": action,
                                  "args": args, "ok": False, "output_preview": obs,
                                  "thought": thought, "ts": time.time()})
                    continue

            # ── 護欄 2：攔截跨檔編輯 ──
            if action in ("write_file", "edit_file"):
                raw_path = args.get("path", "")
                try:
                    act_path = os.path.relpath(safe_path(workspace, raw_path), os.path.abspath(workspace)).replace("\\", "/")
                except Exception:
                    act_path = raw_path.replace("\\", "/")
                if locked_target:
                    if act_path != locked_target:
                        obs = (
                            f"❌ [契約護欄攔截] 跨檔編輯已被攔截！"
                            f"契約已鎖定單一目標檔案 '{locked_target}'，嚴禁修改非契約指定之檔案 '{raw_path}'。"
                        )
                        messages.append({"role": "user", "content": f"Observation:\n{obs}"})
                        if on_event:
                            on_event({"type": "tool_intercepted", "iteration": it, "tool": action,
                                      "args": args, "ok": False, "output_preview": obs,
                                      "thought": thought, "ts": time.time()})
                        continue
                else:
                    # 首個寫入檔案自動鎖定為契約目標檔案
                    locked_target = act_path

            # ── 護欄 3：前置攔截危險 bash 指令與行內 AST 危險調用 ──
            if action == "run_bash":
                cmd = args.get("command", "")
                sec_err = check_command_security(cmd)
                if not sec_err:
                    py_code = _extract_python_inline_code(cmd)
                    if py_code:
                        ast_err = check_python_security_ast(py_code)
                        if ast_err:
                            sec_err = f"Python 行內指令 AST 安全檢查失敗: {ast_err}"
                if sec_err:
                    obs = f"❌ [安全護欄攔截] 指令已被阻斷: {sec_err}"
                    messages.append({"role": "user", "content": f"Observation:\n{obs}"})
                    if on_event:
                        on_event({"type": "tool_intercepted", "iteration": it, "tool": action,
                                  "args": args, "ok": False, "output_preview": obs,
                                  "thought": thought, "ts": time.time()})
                    continue

            action_key = action + json.dumps(args, sort_keys=True, ensure_ascii=False)
            if action_key in seen_actions:
                obs = "重複動作已被攔截，請改用不同參數或直接執行 edit_file。"
                messages.append({"role": "user", "content": f"Observation:\n{obs}"})
                continue
            seen_actions.add(action_key)
            if on_event:
                on_event({"type": "tool_start", "iteration": it, "tool": action,
                          "args": args, "ok": None, "output_preview": "", "thought": thought, "ts": time.time()})
            result = dispatch_tool(workspace, action, args)
            obs = result["output"][:4000]
            if result["modified"] and result["modified"] not in modified_files:
                modified_files.append(result["modified"])
            detail = ""
            if action in ("read_file", "write_file", "edit_file"):
                detail = args.get("path", "")
                if action == "read_file" and ("start_line" in args or "end_line" in args):
                    detail += f" ({args.get('start_line', 1)}~{args.get('end_line', 'end')})"
            elif action == "run_bash":
                detail = args.get("command", "")
            elif action == "list_dir":
                detail = args.get("path") or "."
            else:
                detail = json.dumps(args, ensure_ascii=False)

            ev = {"type": "tool_end", "iteration": it, "tool": action, "args": args,
                  "detail": detail, "raw": detail,
                  "ok": result["ok"], "output_preview": result["output"][:1200],
                  "thought": thought, "ts": time.time()}
            tool_events.append(ev)
            if on_event:
                on_event(ev)
            messages.append({"role": "user", "content": f"Observation:\n{obs}"})
        elif step["final_answer"]:
            final_answer = step["final_answer"]
            if on_event:
                on_event({"type": "final", "iteration": it, "tool": None, "args": None,
                          "ok": True, "output_preview": final_answer[:1200], "thought": thought, "ts": time.time()})
            break
        else:
            messages.append({"role": "user", "content": "Observation:\n無有效動作，請重新輸出 Thought+Action 或 Final Answer。"})
    if not final_answer and not error:
        error = "達到最大迭代次數"
    success = bool(final_answer) and len(tool_events) > 0 and not error
    return {"success": success, "final_answer": final_answer, "iterations": iterations,
            "tool_events": tool_events, "modified_files": modified_files,
            "prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens,
            "elapsed": time.time() - t0, "error": error,
            "locked_target": locked_target}


def summarize_tool_events(events: list[dict]) -> tuple[dict[str, int], dict[str, float], float]:
    kinds = ["Read", "Edit", "Write", "Bash", "Glob", "Grep", "Task", "Other"]
    exact_names = {
        "read": "Read", "read_file": "Read", "readfile": "Read", "view": "Read",
        "edit": "Edit", "edit_file": "Edit", "editfile": "Edit", "multiedit": "Edit",
        "write": "Write", "write_file": "Write", "writefile": "Write",
        "bash": "Bash", "run_bash": "Bash", "runbash": "Bash",
        "glob": "Glob", "list_dir": "Glob", "listdir": "Glob", "list": "Glob"
    }
    def _kind(name: str) -> str:
        k = "".join(ch for ch in (name or "").strip().lower() if ch not in "_- ")
        if k in exact_names:
            return exact_names[k]
        for a, val in exact_names.items():
            if k.startswith(a) and len(k) > len(a):
                return val
        return "Other"

    evs = [e for e in events if isinstance(e, dict)]
    counts = {k: 0 for k in kinds}
    counts["total"] = len(evs)
    duration = {k: 0.0 for k in kinds}

    ordered = [e for e in evs if isinstance(e.get("ts"), (int, float))]
    ordered.sort(key=lambda e: e["ts"])

    for i in range(len(ordered) - 1):
        gap = ordered[i + 1]["ts"] - ordered[i]["ts"]
        if gap > 0:
            duration[_kind(ordered[i].get("tool", ""))] += min(gap, 120.0)

    for k in kinds:
        duration[k] = round(duration[k], 1)

    span = round(ordered[-1]["ts"] - ordered[0]["ts"], 1) if len(ordered) > 1 else 0.0
    for e in evs:
        counts[_kind(e.get("tool", ""))] += 1

    return counts, duration, span


def record_ledger(workspace: str, task: str, result: dict, model: str = DEFAULT_MODEL) -> int:
    """將 ReAct 執行結果與 token 消耗記入目標工作區的 local_tokens_ledger.json。"""
    ws = os.path.abspath(workspace)
    p_tokens = int(result.get("prompt_tokens") or 0)
    c_tokens = int(result.get("completion_tokens") or 0)
    success = bool(result.get("success", False))
    tool_events = result.get("tool_events", [])
    modified = result.get("modified_files", [])
    iterations = result.get("iterations", 0)
    note = f"ReAct autonomous (CLI): iterations={iterations} tools={len(tool_events)} modified={modified}"

    # 1. 優先嘗試透過 brain_delegator 入帳與更新 live 狀態
    try:
        scripts_dir = os.path.dirname(os.path.abspath(__file__))
        if scripts_dir not in sys.path:
            sys.path.insert(0, scripts_dir)
        import brain_delegator
        target_ws = brain_delegator.resolve_workspace(explicit_workspace=ws)
        brain_delegator.set_workspace(target_ws)
        tot = brain_delegator.append_ledger_record(
            task_name=task,
            prompt_tokens=p_tokens,
            completion_tokens=c_tokens,
            success=success,
            note=note
        )
        brain_delegator.update_live_status(
            status="completed" if success else "failed",
            task=task,
            step=("✅ 自主 ReAct 完成" if success else "❌ 自主 ReAct 未完成"),
            preview=(result.get("final_answer") or result.get("error") or "")[:3000],
            tokens=c_tokens,
            saved_usd=round(tot * 0.000002, 6),
            elapsed_sec=result.get("elapsed", 0.0),
            model=model,
            active=False,
            extra={"toolEvents": tool_events[-40:], "modifiedFiles": modified,
                   "iterations": iterations, "finalAnswer": result.get("final_answer", "")}
        )
        # 入帳 Tool-use 統計
        if tool_events:
            try:
                import record_tool_usage_to_ledger
                record_tool_usage_to_ledger.main(["-w", target_ws])
            except Exception:
                pass
        return tot
    except Exception:
        pass

    # 2. 本地 fallback 機制
    target_ws = ws
    curr = ws
    home = os.path.abspath(os.path.expanduser("~"))
    while curr and curr != home and os.path.dirname(curr) != curr:
        if os.path.exists(os.path.join(curr, "local_tokens_ledger.json")):
            target_ws = curr
            break
        curr = os.path.dirname(curr)

    ledger_path = os.path.join(target_ws, "local_tokens_ledger.json")
    ledger: dict[str, Any] = {
        "totalTokens": 0,
        "totalSavedUsdEst": 0.0,
        "sessions": [],
        "updatedAt": datetime.datetime.now().isoformat()
    }
    if os.path.exists(ledger_path):
        try:
            with open(ledger_path, "r", encoding="utf-8") as f:
                ledger = json.load(f)
        except Exception:
            pass

    total_new = p_tokens + c_tokens
    saved_usd = round(total_new * 0.000002, 6)
    ledger["totalTokens"] = int(ledger.get("totalTokens", 0)) + total_new
    ledger["totalSavedUsdEst"] = round(float(ledger.get("totalSavedUsdEst", 0.0)) + saved_usd, 4)

    session_record = {
        "id": f"sess_{int(time.time()*1000)}",
        "task": task,
        "promptTokens": p_tokens,
        "completionTokens": c_tokens,
        "totalTokens": total_new,
        "savedUsdEst": saved_usd,
        "status": "passed" if success else "failed",
        "note": note,
        "timestamp": datetime.datetime.now().isoformat()
    }
    sessions = ledger.get("sessions", [])
    sessions.append(session_record)
    ledger["sessions"] = sessions[-50:]
    ledger["lastStatus"] = "passed" if success else "failed"
    ledger["lastNote"] = note
    ledger["updatedAt"] = datetime.datetime.now().isoformat()

    # 工具使用統計真實寫入 ledger
    if tool_events:
        counts, duration, span = summarize_tool_events(tool_events)
        date_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        status_str = "passed" if success else "failed"
        key = f"{task}@@{date_str}::{status_str}"
        usage_entry = {
            "key": key,
            "task": task,
            "project": os.path.basename(target_ws),
            "model": model,
            "recordedAt": datetime.datetime.now().isoformat(),
            "toolCounts": counts,
            "toolDurationSec": duration,
            "spanSec": span,
            "modifiedFiles": list(modified),
            "source": "react_agent"
        }
        ledger["lastToolUsage"] = usage_entry
        tool_hist = ledger.get("toolUsageHistory", [])
        tool_hist.append(usage_entry)
        ledger["toolUsageHistory"] = tool_hist[-20:]

    try:
        with open(ledger_path, "w", encoding="utf-8") as f:
            json.dump(ledger, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"⚠️ [Ledger 記帳警告] 寫入 {ledger_path} 失敗: {e}", file=sys.stderr)

    # 同步更新 .delegator_live.json 供側邊欄 Live Monitor 即時呈現
    try:
        live_path = os.path.join(target_ws, ".delegator_live.json")
        live_data = {
            "status": "completed" if success else "failed",
            "task": task,
            "step": ("✅ 自主 ReAct 完成" if success else "❌ 自主 ReAct 未完成"),
            "preview": (result.get("final_answer") or result.get("error") or "")[:3000],
            "tokens": c_tokens,
            "saved_usd": saved_usd,
            "elapsed_sec": result.get("elapsed", 0.0),
            "model": model,
            "active": False,
            "project": os.path.basename(target_ws),
            "updatedAt": time.time(),
            "toolEvents": tool_events[-40:],
            "modifiedFiles": list(modified),
            "iterations": iterations,
            "finalAnswer": result.get("final_answer", "")
        }
        with open(live_path, "w", encoding="utf-8") as lf:
            json.dump(live_data, lf, ensure_ascii=False, indent=2)
    except Exception:
        pass

    return total_new


def main() -> None:
    import argparse
    ap = argparse.ArgumentParser(description="ReAct Agent")
    ap.add_argument("--task", "-t", required=True)
    ap.add_argument("--workspace", "-w", default=os.getcwd())
    ap.add_argument("--target-file", "-f", default=None, help="Locked target file for contract guardrails")
    ap.add_argument("--max-iterations", type=int, default=12)
    ap.add_argument("--max-tokens", type=int, default=2048)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    a = ap.parse_args()

    def _event(ev: dict) -> None:
        t = ev.get("type", "")
        if t == "thought":
            print(f"[iter {ev['iteration']}] Thought: {ev['thought'][:400]}")
        elif t == "tool_start":
            print(f"[iter {ev['iteration']}] Action: {ev['tool']} → {json.dumps(ev['args'], ensure_ascii=False)[:400]}")
        elif t == "tool_intercepted":
            print(f"[iter {ev['iteration']}] 🛡️ Intercepted: {ev['tool']} → {ev['output_preview'][:400]}")
        elif t == "tool_end":
            print(f"[iter {ev['iteration']}] Observation: {ev['output_preview'][:400]}")
        elif t == "final":
            print(f"[iter {ev['iteration']}] Final: {ev['output_preview'][:400]}")

    result = run_react_task(a.task, a.workspace, max_iterations=a.max_iterations,
                            on_event=_event, max_tokens=a.max_tokens, model=a.model,
                            target_file=a.target_file)
    
    total_ledger = record_ledger(a.workspace, a.task, result, model=a.model)

    print(f"\n=== Final Answer ===\n{result['final_answer']}")
    print(f"iterations={result['iterations']} tools={len(result['tool_events'])} "
          f"modified={result['modified_files']} elapsed={result['elapsed']:.1f}s "
          f"tokens={result['prompt_tokens']}+{result['completion_tokens']} "
          f"ledger_tokens={total_ledger}")
    if result["error"]:
        print(f"ERROR: {result['error']}")
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()