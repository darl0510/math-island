#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/web_brain_router.py - Cross-Process Tab Router & Multi-Tab Mutual Exclusion
===================================================================================
平鋪解耦子模組：跨進程 CDP 多分頁智慧調度器、排程互斥鎖與全域首選供應商管理。
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

LOCK_BASE_DIR = os.path.join(os.path.expanduser("~"), ".antigravity", "cdp_tab_locks")
CONFIG_FILE_PATH = os.path.join(os.path.expanduser("~"), ".antigravity", "cdp_config.json")


def get_selected_provider() -> str:
    """讀取全域首選 CDP 供應商 (由 IDE 側邊欄點選後持久化至 ~/.antigravity/cdp_config.json)"""
    if os.path.isfile(CONFIG_FILE_PATH):
        try:
            with open(CONFIG_FILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            val = data.get("selected_provider") or data.get("selectedProvider")
            if val and isinstance(val, str):
                return val.lower().strip()
        except Exception:
            pass
    return "auto"


def set_selected_provider(provider: str) -> None:
    """寫入全域首選 CDP 供應商"""
    os.makedirs(os.path.dirname(CONFIG_FILE_PATH), exist_ok=True)
    try:
        data = {}
        if os.path.isfile(CONFIG_FILE_PATH):
            with open(CONFIG_FILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
        data["selected_provider"] = provider.lower().strip()
        data["updated_at"] = time.time()
        with open(CONFIG_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def is_pid_alive(pid: int) -> bool:
    """跨平臺 (含 Windows) 判斷指定進程 PID 是否依然在運行中"""
    if pid <= 0:
        return False
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        SYNCHRONIZE = 0x00100000
        PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
        handle = kernel32.OpenProcess(SYNCHRONIZE | PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
        if handle == 0:
            return False
        exit_code = ctypes.c_ulong()
        kernel32.GetExitCodeProcess(handle, ctypes.byref(exit_code))
        kernel32.CloseHandle(handle)
        STILL_ACTIVE = 259
        return exit_code.value == STILL_ACTIVE
    except Exception:
        try:
            os.kill(pid, 0)
            return True
        except Exception:
            return False


class CrossProcessTabRouter:
    """
    跨進程 CDP 多分頁智慧調度器與排程互斥鎖 (Cross-Process Multi-Tab Mutex & Router)
    職責：
      1. 跨多個獨立 CLI 進程（不同專案工作區）共用瀏覽器分頁資源
      2. 依據全域首選優先分發（例如 ChatGPT / DeepSeek / Claude / Gemini / Grok）
      3. 首選忙碌時，自動分流至閒置 AI 分頁，杜絕同分頁撞車與代碼污染 (Zero Collision)
      4. 全部分頁忙碌時進入佇列排隊等待 (Queueing)，絕不往同輸入框並行塞代碼
      5. 當進程崩潰或逾時，自動回收過期租約 (Stale Lease Auto-Reclaim)
    """

    def __init__(self, lock_dir: str = LOCK_BASE_DIR, default_lease_sec: float = 300.0, mock_mode: bool = False):
        self.lock_dir = lock_dir
        self.default_lease_sec = default_lease_sec
        self.mock_mode = mock_mode
        if not self.mock_mode:
            os.makedirs(self.lock_dir, exist_ok=True)

    def _get_lock_path(self, target_id: str) -> str:
        safe_id = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(target_id))
        return os.path.join(self.lock_dir, f"{safe_id}.lock")

    def is_tab_leased(self, target_id: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        if self.mock_mode:
            return False, None
        path = self._get_lock_path(target_id)
        if not os.path.isfile(path):
            return False, None
        try:
            with open(path, "r", encoding="utf-8") as f:
                info = json.load(f)
            pid = info.get("pid", 0)
            expires_at = info.get("expires_at", 0)
            now = time.time()
            if now > expires_at or not is_pid_alive(pid):
                try:
                    os.remove(path)
                except Exception:
                    pass
                return False, None
            return True, info
        except Exception:
            return False, None

    def try_acquire(self, target: Any, project: str = "", task: str = "", lease_sec: Optional[float] = None) -> Optional[str]:
        if self.mock_mode:
            return "mock_lease_path"
        path = self._get_lock_path(target.id)
        lease_sec = lease_sec or self.default_lease_sec
        now = time.time()

        is_leased, _ = self.is_tab_leased(target.id)
        if is_leased:
            return None

        provider = target.detect_provider() if hasattr(target, "detect_provider") else "unknown"
        lease_data = {
            "target_id": target.id,
            "provider": provider,
            "title": getattr(target, "title", ""),
            "url": getattr(target, "url", ""),
            "pid": os.getpid(),
            "project": project,
            "task": task,
            "acquired_at": now,
            "expires_at": now + lease_sec,
        }

        try:
            fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(lease_data, f, ensure_ascii=False, indent=2)
            return path
        except FileExistsError:
            return None
        except Exception:
            return None

    def release(self, lock_path: Optional[str]) -> None:
        if self.mock_mode or not lock_path:
            return
        if os.path.isfile(lock_path):
            try:
                os.remove(lock_path)
            except Exception:
                pass

    def touch(self, lock_path: Optional[str], extend_sec: float = 180.0) -> None:
        if self.mock_mode or not lock_path:
            return
        if not os.path.isfile(lock_path):
            return
        try:
            with open(lock_path, "r", encoding="utf-8") as f:
                info = json.load(f)
            info["expires_at"] = time.time() + extend_sec
            with open(lock_path, "w", encoding="utf-8") as f:
                json.dump(info, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def route_and_acquire(
        self,
        targets: List[Any],
        preferred_provider: Optional[str] = None,
        project: str = "",
        task: str = "",
        queue_timeout: float = 60.0
    ) -> Tuple[Optional[Any], Optional[str]]:
        if self.mock_mode:
            first = targets[0] if targets else None
            return first, "mock_lease_path"

        ai_targets = [
            t for t in targets
            if (t.is_ai_target() if hasattr(t, "is_ai_target") else True) and getattr(t, "web_socket_debugger_url", "")
        ]
        if not ai_targets:
            return None, None

        pref = (preferred_provider or get_selected_provider()).lower()
        if pref == "auto":
            pref = "chatgpt"

        start_time = time.time()
        poll_interval = 1.0
        announced_wait = False

        while time.time() - start_time < queue_timeout:
            # 階段 1：尋找並嘗試鎖定符合首選之分頁
            pref_targets = [
                t for t in ai_targets
                if (t.detect_provider() if hasattr(t, "detect_provider") else "") == pref
            ]
            for t in pref_targets:
                lock_path = self.try_acquire(t, project=project, task=task)
                if lock_path:
                    return t, lock_path

            # 階段 2：首選忙碌，進行【跨進程智慧分流】至其他閒置 AI 分頁
            other_targets = [
                t for t in ai_targets
                if (t.detect_provider() if hasattr(t, "detect_provider") else "") != pref
            ]
            for t in other_targets:
                lock_path = self.try_acquire(t, project=project, task=task)
                if lock_path:
                    provider_name = t.detect_provider() if hasattr(t, "detect_provider") else "UNKNOWN"
                    title = getattr(t, "title", "")[:20]
                    print(f"🔀 [跨進程智慧分流] 首選 ({pref.upper()}) 正由其他專案佔用，自動分流至閒置分頁: {provider_name.upper()} ({title})")
                    return t, lock_path

            # 階段 3：所有分頁均在忙碌中，進入排隊佇列
            if not announced_wait:
                print(f"⏳ [跨進程排隊佇列] 瀏覽器內所有 AI 分頁均有任務在運算中，正在排隊等待分頁釋出 (最多等待 {queue_timeout:.0f}s)...")
                announced_wait = True

            time.sleep(poll_interval)

        return None, None

