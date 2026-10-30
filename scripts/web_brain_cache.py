#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/web_brain_cache.py - Response, Prompt & Target Cache for Web Brain
==========================================================================
平鋪解耦子模組：提供執行緒安全、具 TTL 與 LRU 淘汰機制之 Web 大腦快取管理。
支援：
  1. Completion / Prompt 快取 (依據 model 與 Prompt 內容哈希防重複運算)
  2. CDP Target Discovery 快取 (短暫快取瀏覽器分頁清單，減輕 CDP 負擔)
  3. 統計指標 (命中次數、失誤次數、命中率) 與過期掃除
"""

from __future__ import annotations

import hashlib
import json
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class CacheEntry:
    """快取條目資料結構"""
    key: str
    value: Any
    created_at: float = field(default_factory=time.time)
    expires_at: Optional[float] = None
    access_count: int = 0
    last_accessed: float = field(default_factory=time.time)

    def is_expired(self, now: Optional[float] = None) -> bool:
        if self.expires_at is None:
            return False
        return (now or time.time()) > self.expires_at


class WebBrainCache:
    """
    執行緒安全、具 LRU 與 TTL 支援之 WebBrain 快取管理器。
    """

    def __init__(self, max_size: int = 1000, default_ttl: float = 300.0):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: Dict[str, CacheEntry] = {}
        self._lock = threading.RLock()
        self._hits = 0
        self._misses = 0
        self._evictions = 0

    def compute_prompt_hash(self, prompt_or_messages: Any, model: str = "") -> str:
        """計算請求之 SHA-256 唯一特徵哈希"""
        if isinstance(prompt_or_messages, list):
            try:
                norm_str = json.dumps(prompt_or_messages, sort_keys=True, ensure_ascii=False)
            except Exception:
                norm_str = str(prompt_or_messages)
        else:
            norm_str = str(prompt_or_messages)

        raw = f"{model.strip().lower()}::{norm_str}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._cache.get(key)
            now = time.time()
            if entry is None:
                self._misses += 1
                return None
            if entry.is_expired(now):
                del self._cache[key]
                self._misses += 1
                return None
            entry.access_count += 1
            entry.last_accessed = now
            self._hits += 1
            return entry.value

    def set(self, key: str, value: Any, ttl: Optional[float] = None) -> None:
        with self._lock:
            now = time.time()
            effective_ttl = ttl if ttl is not None else self.default_ttl
            expires_at = (now + effective_ttl) if effective_ttl > 0 else None

            if key not in self._cache and len(self._cache) >= self.max_size:
                self._evict_lru()

            self._cache[key] = CacheEntry(
                key=key,
                value=value,
                created_at=now,
                expires_at=expires_at,
                access_count=1,
                last_accessed=now,
            )

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def cleanup_expired(self) -> int:
        with self._lock:
            now = time.time()
            expired_keys = [k for k, v in self._cache.items() if v.is_expired(now)]
            for k in expired_keys:
                del self._cache[k]
            return len(expired_keys)

    def _evict_lru(self) -> None:
        # 清除最久未存取的條目
        if not self._cache:
            return
        oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k].last_accessed)
        del self._cache[oldest_key]
        self._evictions += 1

    # --- 高階便利介面 ---

    def get_cached_completion(self, prompt_or_messages: Any, model: str = "") -> Optional[Dict[str, Any]]:
        key = f"completion::{self.compute_prompt_hash(prompt_or_messages, model)}"
        return self.get(key)

    def set_cached_completion(
        self, prompt_or_messages: Any, model: str, completion: Dict[str, Any], ttl: Optional[float] = None
    ) -> None:
        key = f"completion::{self.compute_prompt_hash(prompt_or_messages, model)}"
        self.set(key, completion, ttl=ttl)

    def get_cached_targets(self) -> Optional[List[Any]]:
        return self.get("cdp::targets_list")

    def set_cached_targets(self, targets: List[Any], ttl: float = 2.0) -> None:
        self.set("cdp::targets_list", targets, ttl=ttl)

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            total = self._hits + self._misses
            hit_rate = (self._hits / total) if total > 0 else 0.0
            return {
                "size": len(self._cache),
                "max_size": self.max_size,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": round(hit_rate, 4),
                "evictions": self._evictions,
            }


_GLOBAL_CACHE: Optional[WebBrainCache] = None
_GLOBAL_CACHE_LOCK = threading.Lock()


def get_brain_cache() -> WebBrainCache:
    """取得或建立全域單例 WebBrainCache"""
    global _GLOBAL_CACHE
    if _GLOBAL_CACHE is None:
        with _GLOBAL_CACHE_LOCK:
            if _GLOBAL_CACHE is None:
                _GLOBAL_CACHE = WebBrainCache()
    return _GLOBAL_CACHE

