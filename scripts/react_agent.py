#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Autonomous ReAct Agent – pure stdlib, multi-turn Thought→Action→Observation loop."""
from __future__ import annotations
import os, sys, json, re, time, subprocess, urllib.request, urllib.error, ast, difflib
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


def tool_write_file(workspace: str, args: dict) -> dict:
    try:
        p = safe_path(workspace, args.get("path", ""))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        content = args.get("content", "")
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)
        rel = os.path.relpath(p, os.path.abspath(workspace))
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
        content = content.replace(old, new) if replace_all else content.replace(old, new, 1)
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)
        rel = os.path.relpath(p, os.path.abspath(workspace))
        return {"ok": True, "output": f"編輯完成 ({count} 處)", "modified": rel}
    except Exception as e:
        return {"ok": False, "output": str(e), "modified": None}


def tool_run_bash(workspace: str, args: dict) -> dict:
    try:
        cmd = args.get("command", "")
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


def build_system_prompt(workspace: str) -> str:
    return (
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
                   model: str = DEFAULT_MODEL, url: str = DEFAULT_URL) -> dict:
    t0 = time.time()
    messages: list[dict] = [{"role": "system", "content": build_system_prompt(workspace)},
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
            args = step["action_input"] or {}
            action_key = step["action"] + json.dumps(args, sort_keys=True, ensure_ascii=False)
            if action_key in seen_actions:
                obs = "重複動作已被攔截，請改用不同參數或直接執行 edit_file。"
                messages.append({"role": "user", "content": f"Observation:\n{obs}"})
                continue
            seen_actions.add(action_key)
            if on_event:
                on_event({"type": "tool_start", "iteration": it, "tool": step["action"],
                          "args": args, "ok": None, "output_preview": "", "thought": thought, "ts": time.time()})
            result = dispatch_tool(workspace, step["action"], args)
            obs = result["output"][:4000]
            if result["modified"] and result["modified"] not in modified_files:
                modified_files.append(result["modified"])
            ev = {"type": "tool_end", "iteration": it, "tool": step["action"], "args": args,
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
            "elapsed": time.time() - t0, "error": error}


def main() -> None:
    import argparse
    ap = argparse.ArgumentParser(description="ReAct Agent")
    ap.add_argument("--task", "-t", required=True)
    ap.add_argument("--workspace", "-w", default=os.getcwd())
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
        elif t == "tool_end":
            print(f"[iter {ev['iteration']}] Observation: {ev['output_preview'][:400]}")
        elif t == "final":
            print(f"[iter {ev['iteration']}] Final: {ev['output_preview'][:400]}")

    result = run_react_task(a.task, a.workspace, max_iterations=a.max_iterations,
                            on_event=_event, max_tokens=a.max_tokens, model=a.model)
    print(f"\n=== Final Answer ===\n{result['final_answer']}")
    print(f"iterations={result['iterations']} tools={len(result['tool_events'])} "
          f"modified={result['modified_files']} elapsed={result['elapsed']:.1f}s "
          f"tokens={result['prompt_tokens']}+{result['completion_tokens']}")
    if result["error"]:
        print(f"ERROR: {result['error']}")
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()