#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/brain_delegator.py - Local Brain 8080 Outsourcing & Ledger Dispatcher (Facade)
=====================================================================================
Manages physical delegation to local 8080 brain (Qwen3.8-Flash-Next 125B MoE / Gemma 26B)
and CDP web brain pool (DeepSeek 671B / Claude / Gemini / ChatGPT / Grok), writes real tokens
to local_tokens_ledger.json, and supports supervisor status toggling.

Refactored to Flat Architecture:
- scripts/brain_status_helpers.py  : Workspace root resolution & live-state SSE preview
- scripts/brain_ledger_manager.py  : Ledger IO, Token calculation & status toggling
- scripts/brain_code_validator.py  : Code sanitization, AST validation & ReAct agent execution
- scripts/brain_web_adapter.py     : CDP browser multi-provider AI adapter
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import socket
import sys
import time
import urllib.error
import urllib.request
from typing import Any, Callable, Dict, List, Optional, Tuple

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── 100% Backward-compatible re-exports from decoupled submodules ──────────
from scripts.brain_status_helpers import (
    ANTIGRAVITY_ROOT,
    DELEGATOR_FILENAME,
    PROJECTS_DIR,
    _get_project_meta,
    find_project_root,
    resolve_workspace,
    set_workspace,
    update_live_status,
)
from scripts.brain_ledger_manager import (
    DEFAULT_MODEL,
    LEDGER_PATH,
    ROOT_DIR,
    append_ledger_record,
    load_ledger,
    mark_passed,
    print_quantified_token_table,
    save_ledger,
)
from scripts.brain_code_validator import (
    extract_and_sanitize_code,
    run_react_mode,
    validate_code_health,
)
CDP_DEFAULT_MODEL = "deepseek-671b-cdp"
DEFAULT_CDP_HOST = "127.0.0.1"
DEFAULT_CDP_PORT = 9222

try:
    import web_brain_bridge
except Exception:
    try:
        from scripts import web_brain_bridge
    except Exception:
        web_brain_bridge = None

if web_brain_bridge is None:
    _GLOBAL_SCRIPTS_DIR = os.path.join(
        os.path.abspath(os.path.expanduser("~")), "projects", "antigravity-local-ide", "scripts"
    )
    if os.path.isfile(os.path.join(_GLOBAL_SCRIPTS_DIR, "web_brain_bridge.py")):
        if _GLOBAL_SCRIPTS_DIR not in sys.path:
            sys.path.append(_GLOBAL_SCRIPTS_DIR)
        try:
            import web_brain_bridge
        except Exception:
            web_brain_bridge = None


def probe_cdp_brain(
    host: str = DEFAULT_CDP_HOST,
    port: int = DEFAULT_CDP_PORT,
    timeout: float = 1.0,
    mock_mode: bool = False,
) -> bool:
    """
    毫秒級探測 CDP 瀏覽器除錯端口 (預設 9222) 是否在線，且具備可用 AI Target 分頁。
    若 mock_mode 為 True 則直接回傳 True。
    """
    if mock_mode:
        return True

    try:
        with socket.create_connection((host, port), timeout=timeout):
            pass
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False

    if web_brain_bridge is not None:
        try:
            bridge = web_brain_bridge.WebBrainBridge(host=host, port=port)
            targets = bridge.list_ai_targets(timeout=timeout)
            return len(targets) > 0
        except Exception:
            return True
    return True


def call_web_brain(
    prompt: str,
    system_prompt: str = (
        "You are a senior systems engineer. Output ONLY valid, complete Python code "
        "in a single markdown code block without any conversational text."
    ),
    task_name: str = "外包任務 (CDP Web Brain)",
    provider: Optional[str] = None,
    host: str = DEFAULT_CDP_HOST,
    port: int = DEFAULT_CDP_PORT,
    mock_mode: bool = False,
    timeout: float = 300.0,
    on_chunk: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    """
    透過 WebBrainBridge 與 CDP 瀏覽器通訊，調度 Multi-Provider (DeepSeek / Gemini / ChatGPT / Claude / Grok) 網頁大腦。
    支援增量串流與 Token 統計。
    """
    if web_brain_bridge is None and not mock_mode:
        return {
            "success": False,
            "error": "找不到 web_brain_bridge 模組，無法調度 CDP 瀏覽器大腦",
            "prompt_tokens": len(prompt) // 4,
            "completion_tokens": 0,
            "elapsed": 0.0,
        }

    t0 = time.time()
    full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
    prompt_tokens = max(1, len(full_prompt) // 4)

    bridge = web_brain_bridge.WebBrainBridge(host=host, port=port, mock_mode=mock_mode) if web_brain_bridge else None
    if not bridge:
        return {
            "success": False,
            "error": "WebBrainBridge 初始化失敗",
            "prompt_tokens": prompt_tokens,
            "completion_tokens": 0,
            "elapsed": 0.0,
        }

    target = None
    target_provider = None
    lease_path = None
    router = None

    if mock_mode:
        target = bridge.find_deepseek_target() if bridge else None
        target_provider = "deepseek"
    else:
        router = web_brain_bridge.CrossProcessTabRouter(mock_mode=mock_mode) if web_brain_bridge else None
        ai_targets = bridge.list_ai_targets()
        if not ai_targets:
            return {
                "success": False,
                "error": f"CDP 端口 {host}:{port} 未找到可用之 AI 網頁標籤頁 (支援 DeepSeek, Gemini, ChatGPT, Claude, Grok)",
                "prompt_tokens": prompt_tokens,
                "completion_tokens": 0,
                "elapsed": time.time() - t0,
            }

        eff_provider = provider
        if (not eff_provider or eff_provider == "auto") and web_brain_bridge:
            eff_provider = web_brain_bridge.get_selected_provider()

        if router:
            target, lease_path = router.route_and_acquire(
                targets=ai_targets,
                preferred_provider=eff_provider,
                project=os.path.basename(ROOT_DIR),
                task=task_name,
                queue_timeout=60.0
            )
            if not target or not lease_path:
                return {
                    "success": False,
                    "error": "CDP 分頁池調度失敗或佇列排隊超時 (60s)，所有 AI 分頁均由其他專案佔用中",
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": 0,
                    "elapsed": time.time() - t0,
                }
        else:
            target = bridge.find_target(provider=eff_provider)

        target_provider = target.detect_provider() if target else "unknown"
        lock_tag = f" [租約鎖定: {os.path.basename(lease_path)}]" if lease_path else ""
        print(f"🌐 [CDP 大腦選定] {target.title[:30]} ({target_provider.upper()}){lock_tag}")

    accumulated = ""
    completion_tokens = 0
    model_name = CDP_DEFAULT_MODEL if mock_mode else (f"{target_provider}-671b-cdp" if target_provider == "deepseek" else f"{target_provider or 'web'}-cdp")

    try:
        if not bridge.connect(target=target):
            return {
                "success": False,
                "error": f"無法透過 CDP 建立連線至 {host}:{port}。請確認瀏覽器已開啟 --remote-debugging-port={port}",
                "prompt_tokens": prompt_tokens,
                "completion_tokens": 0,
                "elapsed": time.time() - t0,
            }

        inj_res = bridge.inject_prompt(full_prompt, provider=target_provider)
        if not inj_res.get("success", False):
            return {
                "success": False,
                "error": f"Prompt DOM 注入失敗: {inj_res.get('reason', '未知')} (Provider: {target_provider})",
                "prompt_tokens": prompt_tokens,
                "completion_tokens": 0,
                "elapsed": time.time() - t0,
            }

        last_update_time = t0
        for chunk_data in bridge.stream_response(timeout=timeout):
            delta = chunk_data.get("delta", "")
            if delta:
                accumulated += delta
                completion_tokens += max(1, len(delta) // 4)
                if on_chunk:
                    on_chunk(delta)

                now = time.time()
                if now - last_update_time >= 0.5:
                    last_update_time = now
                    if router and lease_path:
                        router.touch(lease_path)
                    update_live_status(
                        status="streaming",
                        task=task_name,
                        step=f"🔄 CDP {target_provider.upper() if target_provider else 'AI'} 串流代碼中…",
                        preview=accumulated[-3000:],
                        tokens=completion_tokens,
                        elapsed_sec=now - t0,
                        model=model_name,
                        active=True,
                    )
            if chunk_data.get("done", False):
                break
    except Exception as e:
        return {
            "success": False,
            "error": f"CDP 串流提取異常: {str(e)}",
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "elapsed": time.time() - t0,
        }
    finally:
        bridge.disconnect()
        if router and lease_path:
            router.release(lease_path)
    elapsed = time.time() - t0

    if not accumulated and not mock_mode:
        return {
            "success": False,
            "error": "CDP 瀏覽器未回傳有效回答內容",
            "prompt_tokens": prompt_tokens,
            "completion_tokens": 0,
            "elapsed": elapsed,
        }

    return {
        "success": True,
        "content": accumulated,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "elapsed": elapsed,
        "model": model_name,
    }

DEFAULT_URL = "http://127.0.0.1:8080/v1/chat/completions"


def probe_local_brain(host: str = "127.0.0.1", port: int = 8080, timeout: float = 1.0) -> bool:
    """
    毫秒級快速探測本地 8080 大腦是否在線。
    在公司 / 移動辦公環境（無本地 GPU 大腦）時立即返回 False，避免超時與連接崩潰。
    """
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


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
    Call the local 8080 brain. Supports both streaming (SSE) and non-streaming modes.
    When on_chunk is provided the request is sent with stream=True and each SSE delta
    is forwarded to the callback; update_live_status() is called periodically.
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
                        now = time.time()
                        if now - last_update_time >= 0.5:
                            last_update_time = now
                            update_live_status(
                                status="streaming",
                                task=task_name,
                                step="🔄 串流代碼中…",
                                preview=accumulated[-3000:],
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
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                usage = res_json.get("usage", {})
                prompt_tokens = usage.get("prompt_tokens", len(prompt) // 4)
                content = res_json["choices"][0]["message"]["content"]
                completion_tokens = usage.get("completion_tokens", len(content) // 4)
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


def dispatch_brain_task(
    prompt: str,
    system_prompt: str = (
        "You are a senior systems engineer. Output ONLY valid, complete Python code "
        "in a single markdown code block without any conversational text."
    ),
    max_tokens: int = 8192,
    task_name: str = "外包任務",
    on_chunk: Optional[Callable[[str], None]] = None,
    backend: str = "auto",
    cdp_host: str = DEFAULT_CDP_HOST,
    cdp_port: int = DEFAULT_CDP_PORT,
    mock_brain: bool = False,
    model: Optional[str] = None,
    provider: Optional[str] = "auto",
) -> Tuple[Dict[str, Any], str]:
    """
    智慧雙軌大腦分發器 (Supervisor Dispatcher):
    1. mock_brain 為 True 時：調用 Mock CDP 模式
    2. backend == "local-8080" 時：強制調用本地 8080
    3. backend == "cdp-web" 時：強制調用 CDP 網頁大腦池
    4. backend == "auto" 時 (預設)：
       - 先探測本地端雲端 (CDP 網頁大腦池 9222)。若在線則優先使用 CDP 網頁大腦。
       - 若 CDP 離線，後備探測本地 8080 大腦。
       - 若均離線，回傳友善錯誤提示。
    """
    chosen_provider = None if (not provider or provider == "auto") else provider
    if not chosen_provider and web_brain_bridge is not None:
        global_p = web_brain_bridge.get_selected_provider()
        if global_p and global_p != "auto":
            chosen_provider = global_p

    if mock_brain:
        print("🧪 [Mock 大腦模式] 啟用 CDP 滿血大腦模擬測試")
        res = call_web_brain(
            prompt,
            system_prompt=system_prompt,
            task_name=task_name,
            provider=chosen_provider,
            host=cdp_host,
            port=cdp_port,
            mock_mode=True,
            on_chunk=on_chunk,
        )
        return res, "cdp-web-mock"

    if backend == "local-8080":
        res = call_local_brain(
            prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            task_name=task_name,
            on_chunk=on_chunk,
        )
        return res, "local-8080"

    if backend == "cdp-web":
        print(f"🌐 [強制 CDP 調度] 正在連線 CDP 瀏覽器端口 ({cdp_host}:{cdp_port})...")
        res = call_web_brain(
            prompt,
            system_prompt=system_prompt,
            task_name=task_name,
            provider=chosen_provider,
            host=cdp_host,
            port=cdp_port,
            mock_mode=False,
            on_chunk=on_chunk,
        )
        return res, "cdp-web"

    # auto 模式：優先探測本地端雲端 (CDP 網頁大腦池)，最後才探測 8080 本地大腦
    print(f"ℹ️ [大腦探測] 優先探測本地端雲端 (CDP 網頁大腦池 {cdp_host}:{cdp_port})...")
    if probe_cdp_brain(host=cdp_host, port=cdp_port):
        if web_brain_bridge is not None:
            try:
                b_probe = web_brain_bridge.WebBrainBridge(host=cdp_host, port=cdp_port)
                ai_list = b_probe.list_ai_targets()
                found_names = [t.detect_provider().upper() for t in ai_list]
                print(f"🌐 [本地端雲端優先] 探測到 CDP 網頁大腦池在線: {', '.join(found_names) if found_names else '已就緒'}")
            except Exception:
                print(f"🌐 [本地端雲端優先] 探測到 CDP 端口在線，自動以 CDP 網頁大腦外包")
        else:
            print(f"🌐 [本地端雲端優先] 探測到 CDP 端口在線，自動以 CDP 網頁大腦外包")

        res = call_web_brain(
            prompt,
            system_prompt=system_prompt,
            task_name=task_name,
            provider=chosen_provider,
            host=cdp_host,
            port=cdp_port,
            mock_mode=False,
            on_chunk=on_chunk,
        )
        return res, "cdp-web"

    # CDP 本地端雲端離線，最後才後備探測 8080 本地大腦
    print(f"ℹ️ [CDP 離線探測] 本地端雲端未就緒，後備探測 8080 本地大腦...")
    if probe_local_brain():
        print(f"🧠 [後備本地大腦] 探測到 8080 本地大腦在線，切換至 8080 本地大腦外包")
        res = call_local_brain(
            prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            task_name=task_name,
            on_chunk=on_chunk,
        )
        return res, "local-8080"

    # 雙軌皆離線
    if backend == "auto":
        return {
            "success": False,
            "cloud_handover": True,
            "error": "本地 8080 大腦與 CDP 網頁大腦均離線，觸發 Cloud-First 合規降級接手機制",
            "prompt_tokens": len(prompt) // 4,
            "completion_tokens": 0,
            "elapsed": 0.0,
            "model": "cloud-agent-fallback",
        }, "cloud-handover"

    err_msg = (
        f"本地端雲端 (CDP 瀏覽器端口 {cdp_host}:{cdp_port}) 與 8080 本地大腦均未在線。"
        f"請以 '--remote-debugging-port={cdp_port}' 啟動瀏覽器並開啟任一網頁 AI (DeepSeek / Gemini / ChatGPT / Claude / Grok)，或啟動 8080 本地大腦服務。"
    )
    return {
        "success": False,
        "error": err_msg,
        "prompt_tokens": len(prompt) // 4,
        "completion_tokens": 0,
        "elapsed": 0.0,
    }, "none"


def main():
    parser = argparse.ArgumentParser(description="Strata Local Brain Delegator")
    parser.add_argument("--prompt", "-p", type=str, help="Prompt to delegate to local brain")
    parser.add_argument("--prompt-file", "-f", type=str, help="Read prompt from file")
    parser.add_argument("--output-file", "-o", type=str, help="Output generated code directly to file")
    parser.add_argument("--max-tokens", "-m", type=int, default=4096, help="Max tokens (default: 4096, atomic guardrail)")
    parser.add_argument("--task", "-t", type=str, default="", help="Task / prompt (claude_delegator compatible)")
    parser.add_argument("--task-name", dest="task_name", type=str, default="", help="Task name for ledger display")
    parser.add_argument("--react", action="store_true", help="Fully autonomous ReAct loop: read_file/edit_file/write_file/run_bash/list_dir")
    parser.add_argument("--max-iterations", type=int, default=12, help="Max ReAct iterations")
    parser.add_argument("--target-file", type=str, default="", help="Target file locked for ReAct contract guardrail")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help="Local brain model id")
    parser.add_argument("--backend", type=str, choices=["auto", "local-8080", "cdp-web"], default="auto",
                        help="外包調度後端 (auto: 自動探測降級, local-8080: 強制本地8080, cdp-web: 強制CDP 網頁大腦)")
    parser.add_argument("--provider", type=str, default="auto",
                        choices=["auto", "deepseek", "gemini", "chatgpt", "claude", "grok"],
                        help="指定 CDP 網頁大腦供應商 (預設: auto 自動挑選)")
    parser.add_argument("--cdp-host", type=str, default=DEFAULT_CDP_HOST, help="CDP 瀏覽器除錯 Host (預設: 127.0.0.1)")
    parser.add_argument("--cdp-port", type=int, default=DEFAULT_CDP_PORT, help="CDP 瀏覽器除錯 Port (預設: 9222)")
    parser.add_argument("--mock-brain", action="store_true", help="啟用 CDP 671B Mock 測試大腦 (離線自檢用)")
    parser.add_argument("--self-test", action="store_true", help="執行內部雙軌自檢驗證 (8080/CDP/Ledger)")
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

    if args.self_test:
        print("[brain_delegator] 執行雙軌大腦探測與調度自檢 (本地端雲端優先)...")
        cdp_status = probe_cdp_brain(mock_mode=True)
        assert cdp_status is True, "Self-test: Mock CDP 探測失敗"
        print("  ✔ 本地端雲端 (CDP 網頁大腦) 探測: 在線 (Mock 驗證)")

        local_status = probe_local_brain()
        print(f"  ✔ 本地 8080 大腦探測: {'在線' if local_status else '離線 (預期在非 GPU/公司環境為 False)'}")

        res, backend = dispatch_brain_task(
            "def self_test_func(): return True",
            task_name="自檢外包任務",
            mock_brain=True,
        )
        assert res.get("success"), f"Self-test: 派工失敗: {res.get('error')}"
        assert backend == "cdp-web-mock", f"Self-test: 後端不正確: {backend}"
        assert res.get("completion_tokens", 0) > 0, "Self-test: 未產出 Tokens"
        print(f"  ✔ Mock CDP 派工成功 (產出 {res['completion_tokens']} Tokens)")

        tokens = append_ledger_record(
            task_name="self_test_task",
            prompt_tokens=res.get("prompt_tokens", 10),
            completion_tokens=res.get("completion_tokens", 20),
            success=True,
            note="Self-test record",
            model="deepseek-671b-cdp",
        )
        assert tokens > 0, "Self-test: Ledger 記帳失敗"
        print(f"  ✔ Ledger 寫入成功 (總 Token 累加: {tokens})")

        mark_passed("Self-test verification passed")
        print("✔ [brain_delegator] Phase 3 雙軌探測與外包調度自檢全數通過！")
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
        chosen_model = args.model if args.model != DEFAULT_MODEL else (
            CDP_DEFAULT_MODEL if (args.backend == "cdp-web" or args.mock_brain) else DEFAULT_MODEL
        )

        update_live_status(
            status="starting",
            task=task_name,
            step="🚀 啟動本地/CDP 外包任務…",
            preview=f"// [{os.path.basename(ROOT_DIR)}] 外包任務啟動中\n// 任務：{task_name}\n// 目標：{output_file or '(stdout)'}\n// 正在自動探測 8080 / CDP 大腦...",
            output_file=output_file,
            model=chosen_model,
            active=True,
        )

        streamed_chunks: List[str] = []

        def _on_chunk(chunk: str) -> None:
            streamed_chunks.append(chunk)
            print(chunk, end="", flush=True)

        update_live_status(
            status="running",
            task=task_name,
            step="⚙️ 苦力運算中…",
            preview=f"// [{os.path.basename(ROOT_DIR)}] 等待首個 token…\n// 任務：{task_name}",
            output_file=output_file,
            model=chosen_model,
            active=True,
        )

        res, used_backend = dispatch_brain_task(
            prompt,
            max_tokens=args.max_tokens,
            task_name=task_name,
            on_chunk=_on_chunk,
            backend=args.backend,
            cdp_host=args.cdp_host,
            cdp_port=args.cdp_port,
            mock_brain=args.mock_brain,
            model=args.model,
            provider=getattr(args, "provider", "auto"),
        )

        if streamed_chunks:
            print()

        if used_backend == "cloud-handover":
            active_model = "cloud-agent-fallback"
            total = append_ledger_record(
                task_name=task_name,
                prompt_tokens=res.get("prompt_tokens", 0),
                completion_tokens=0,
                success=True,
                note=f"Cloud-First Handover: Dual local brains offline. Task transferred to Cloud Agent.",
                model=active_model,
            )

            banner = f"""
================================================================================
⚡ [雙軌離線 -> 自動觸發 Cloud-First 合規降級接手]
================================================================================
探測結果：8080 本地大腦 與 CDP 網頁大腦 ({args.cdp_host}:{args.cdp_port}) 均未在線。
依據 AGENTS.md《本地離線自動降級規範》，本輪外包已合法轉移給雲端 Agent：

✔ 權限解鎖：已正式豁免【15 行代碼禁寫令】與【嚴禁讀檔寫碼禁令】！
✔ 授權任務：{task_name}
✔ 目標檔案：{output_file or '(依任務契約指定)'}
✔ 雲端 Agent 執行步驟指引：
  1. 直接使用 read_file 閱讀目標檔案與相關代碼
  2. 使用 edit_file / write_file 完整實作功能邏輯
  3. 執行單元測試或語法檢查確保自檢通過
  4. 依序執行 git diff --stat ➔ git status ➔ python scripts/bump_version.py 推進版本
================================================================================
"""
            print(banner.strip())
            update_live_status(
                status="completed",
                task=task_name,
                step="⚡ 已自動切換至雲端接手模式 (雙軌離線)",
                preview=f"// [Cloud-First Handover] 任務已合法轉交雲端 Agent 執行\\n// 任務：{task_name}",
                output_file=output_file,
                model=active_model,
                active=False,
            )
            return

        active_model = res.get("model", chosen_model if used_backend == "local-8080" else CDP_DEFAULT_MODEL)
        total = append_ledger_record(
            task_name=task_name,
            prompt_tokens=res.get("prompt_tokens", 0),
            completion_tokens=res.get("completion_tokens", 0),
            success=res.get("success", False),
            note=f"Delegated via brain_delegator ({used_backend}): {task_name}",
            model=active_model,
        )

        if res.get("success"):
            elapsed = res.get("elapsed", 0.0)
            content = res.get("content", "")
            print(f"✔ [本地外包成功 ({used_backend})] 產出 {total} Tokens (耗時 {elapsed:.2f}s)")
            print_quantified_token_table(
                completion_tokens=res.get("completion_tokens", 0),
                total_tokens=total,
                elapsed_sec=elapsed,
            )

            if output_file:
                update_live_status(
                    status="verifying",
                    task=task_name,
                    step="🔍 驗證生成代碼…",
                    preview=content[-3000:],
                    tokens=res.get("completion_tokens", 0),
                    saved_usd=round(total * 0.000002, 6),
                    elapsed_sec=elapsed,
                    output_file=output_file,
                    model=active_model,
                    active=True,
                )
                clean_code = extract_and_sanitize_code(content)
                os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
                with open(output_file, "w", encoding="utf-8") as out_f:
                    out_f.write(clean_code)
                print(f"💾 [代碼落盤成功] 已寫入 {output_file}")
                passed = validate_code_health(clean_code, output_file)

                update_live_status(
                    status="completed",
                    task=task_name,
                    step=f"{'✅' if passed else '⚠️'} 代碼已落盤 {'(語法通過)' if passed else '(含語法警告)'}",
                    preview=clean_code[-3000:],
                    tokens=res.get("completion_tokens", 0),
                    saved_usd=round(total * 0.000002, 6),
                    elapsed_sec=elapsed,
                    output_file=output_file,
                    model=active_model,
                    active=False,
                )
            else:
                if not streamed_chunks:
                    print(content)
                update_live_status(
                    status="completed",
                    task=task_name,
                    step=f"✅ 外包任務完成 ({used_backend} stdout 輸出)",
                    preview=content[-3000:],
                    tokens=res.get("completion_tokens", 0),
                    saved_usd=round(total * 0.000002, 6),
                    elapsed_sec=elapsed,
                    model=active_model,
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
                model=active_model,
                active=False,
            )


if __name__ == "__main__":
    main()
