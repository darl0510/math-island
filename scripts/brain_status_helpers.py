#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/brain_status_helpers.py - Workspace & Live Status Stream Helpers
=======================================================================
Handles project root detection, workspace resolution, and real-time streaming
preview persistence (.delegator_live.json) for the sidebar UI panel.
"""

from __future__ import annotations

import datetime
import json
import os
import time
from typing import Any, Dict, Optional

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER_PATH = os.path.join(ROOT_DIR, "local_tokens_ledger.json")
ANTIGRAVITY_ROOT = os.path.join(os.path.expanduser("~"), ".antigravity-ide")
PROJECTS_DIR = os.path.join(ANTIGRAVITY_ROOT, "projects")
DELEGATOR_FILENAME = ".delegator_live.json"


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
    try:
        import scripts.brain_ledger_manager as blm
        blm.set_workspace(workspace_dir)
    except Exception:
        pass


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


def _get_project_meta(root_dir: Optional[str] = None) -> Dict[str, str]:
    """Read project name & version from package.json in ROOT_DIR or given root_dir."""
    target_dir = root_dir or ROOT_DIR
    pkg_path = os.path.join(target_dir, "package.json")
    try:
        if os.path.exists(pkg_path):
            with open(pkg_path, "r", encoding="utf-8") as f:
                pkg = json.load(f)
            return {
                "name": pkg.get("name") or os.path.basename(target_dir),
                "version": pkg.get("version") or "0.0.0",
            }
    except Exception:
        pass
    return {"name": os.path.basename(target_dir), "version": "0.0.0"}


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

    meta = _get_project_meta(target_workspace)
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

