#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WebBrainBridge - CDP 瀏覽器通訊適配器 (Phase 1, 2 & 4: Session Isolation & Tab Pool)
-------------------------------------------------------------------------------
透過 Chrome / Edge 遠端除錯協定 (Chrome DevTools Protocol, CDP)
連線本機瀏覽器中執行的 DeepSeek 等網頁版大模型，實現零 GPU 依賴、
滿血大腦免費調度之通訊適配器。

核心職責:
  Phase 1:
    1. CDP 端口探測與 `/json/list` 標籤頁目標發現 (Target Discovery)
    2. 純標準庫 WebSocket RFC 6455 握手與雙向 JSON-RPC 通訊
    3. Prompt DOM 注入與事件激發 (Input / Submit Event Triggering)
    4. DOM 串流增量提取 (Thinking & Markdown Stream Extraction)
  Phase 2:
    5. 封裝為標準 OpenAI API 相容 HTTP/SSE 本地轉接伺服器
    6. 提供 GET `/v1/models` 與 POST `/v1/chat/completions` (串流與非串流)
    7. 支援 CORS 跨域請求與多輪對話 Prompt 格式化
  Phase 4:
    8. CDP 多標籤頁分頁池 (CDPTabPool) 與生命週期管理
    9. 會話隔離 (Session Isolation) 與 DOM 輸入框互斥鎖排程
   10. 會話黏滯性 (Sticky Session) 與自動新對話 (New Chat) 重置
   11. 無 GPU 環境下穩定佇列調度與高並行防撞車
"""

import sys
import os
import re
import json
import socket
import base64
import hashlib
import struct
import urllib.request
import urllib.error
import urllib.parse
import time
import uuid
import argparse
import threading
from http.server import HTTPServer, ThreadingHTTPServer, BaseHTTPRequestHandler
from typing import List, Dict, Any, Optional, Generator, Tuple
from dataclasses import dataclass, field

# 平鋪解耦子模組引入路徑設定
_SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)


# ---------------------------------------------------------------------------
# CDP 目標資料結構 (Target Model)
# ---------------------------------------------------------------------------

@dataclass
class CDPTarget:
    """代表一個瀏覽器 Target (分頁 / 背景頁等)"""
    id: str
    title: str
    url: str
    type: str = "page"
    web_socket_debugger_url: str = ""
    description: str = ""

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CDPTarget":
        return cls(
            id=data.get("id", ""),
            title=data.get("title", ""),
            url=data.get("url", ""),
            type=data.get("type", "page"),
            web_socket_debugger_url=data.get("webSocketDebuggerUrl", ""),
            description=data.get("description", "")
        )

    def detect_provider(self) -> str:
        """偵測該目標所屬的 AI 供應商名稱 (deepseek, gemini, chatgpt, claude, grok, unknown)"""
        if self.type != "page":
            return "unknown"
        try:
            parsed = urllib.parse.urlparse(self.url)
            netloc = (parsed.netloc or "").lower()
        except Exception:
            netloc = ""
        lower_url = self.url.lower()
        lower_title = self.title.lower()

        # 排除第三方外嵌腳本 (如 stripe, hcaptcha 等)
        if any(ign in netloc for ign in ["stripe.com", "stripe.network", "hcaptcha.com", "googlepay", "recaptcha"]):
            return "unknown"

        # ChatDay 多模型路由識別 (例如 model=claude, model=gpt, model=gemini)
        if "chatday.ai" in netloc:
            if "model=claude" in lower_url or "claude" in lower_title:
                return "claude"
            if "model=gemini" in lower_url or "gemini" in lower_title:
                return "gemini"
            if "model=grok" in lower_url or "grok" in lower_title:
                return "grok"
            return "chatgpt"

        if "deepseek.com" in netloc or "deepseek" in lower_title:
            return "deepseek"
        if "gemini.google.com" in netloc or "gemini" in lower_title:
            return "gemini"
        if "claude" in lower_url or "claude" in lower_title:
            return "claude"
        if "chatgpt.com" in netloc or "chat.openai.com" in netloc or (netloc and "chatgpt" in lower_title):
            return "chatgpt"
        if "grok.com" in netloc or (netloc and "grok" in lower_title):
            return "grok"
        return "unknown"

    def is_ai_target(self) -> bool:
        """判斷是否為受支援的 AI 大模型網頁"""
        return self.detect_provider() != "unknown"

    def is_deepseek(self) -> bool:
        """判斷是否為 DeepSeek 網頁"""
        return self.detect_provider() == "deepseek"

    def is_gemini(self) -> bool:
        """判斷是否為 Google Gemini 網頁"""
        return self.detect_provider() == "gemini"

    def is_chatgpt(self) -> bool:
        """判斷是否為 ChatGPT / OpenAI 網頁"""
        return self.detect_provider() == "chatgpt"

    def is_claude(self) -> bool:
        """判斷是否為 Anthropic Claude 網頁"""
        return self.detect_provider() == "claude"

    def is_grok(self) -> bool:
        """判斷是否為 xAI Grok 網頁"""
        return self.detect_provider() == "grok"


# ---------------------------------------------------------------------------
# 純標準庫輕量 WebSocket 客戶端 (RFC 6455 Minimal Implementation)
# ---------------------------------------------------------------------------

class MinimalWebSocketClient:
    """
    純 Python 標準庫實現的輕量 WebSocket 客戶端 (RFC 6455)。
    零額外第三方依賴，支援文字幀 (Text Frame, Opcode 0x1) 遮罩編碼與解碼、
    Ping/Pong 保活與 Close 幀處理。
    """
    OPCODE_CONT = 0x0
    OPCODE_TEXT = 0x1
    OPCODE_BINARY = 0x2
    OPCODE_CLOSE = 0x8
    OPCODE_PING = 0x9
    OPCODE_PONG = 0xA

    def __init__(self, ws_url: str, timeout: float = 10.0):
        self.ws_url = ws_url
        self.timeout = timeout
        self.sock: Optional[socket.socket] = None
        self.host: str = ""
        self.port: int = 80
        self.path: str = "/"
        self.connected: bool = False
        self._parse_url(ws_url)

    def _parse_url(self, url: str) -> None:
        """解析 ws://host:port/path 格式網址"""
        if url.startswith("ws://"):
            url_part = url[5:]
        elif url.startswith("wss://"):
            url_part = url[6:]
        else:
            url_part = url

        slash_idx = url_part.find("/")
        if slash_idx != -1:
            host_port = url_part[:slash_idx]
            self.path = url_part[slash_idx:]
        else:
            host_port = url_part
            self.path = "/"

        if ":" in host_port:
            parts = host_port.split(":")
            self.host = parts[0]
            self.port = int(parts[1])
        else:
            self.host = host_port
            self.port = 80

    def connect(self) -> bool:
        """建立 TCP 連線並執行 WebSocket Handshake 握手，具備逾時防禦"""
        try:
            self.sock = socket.create_connection((self.host, self.port), timeout=self.timeout)
            sec_key = base64.b64encode(os.urandom(16)).decode("ascii")

            handshake_req = (
                f"GET {self.path} HTTP/1.1\r\n"
                f"Host: {self.host}:{self.port}\r\n"
                f"Upgrade: websocket\r\n"
                f"Connection: Upgrade\r\n"
                f"Sec-WebSocket-Key: {sec_key}\r\n"
                f"Sec-WebSocket-Version: 13\r\n\r\n"
            )
            self.sock.sendall(handshake_req.encode("ascii"))

            # 接收 Handshake 回應，設定防禦計時
            response_header = b""
            start_time = time.time()
            while b"\r\n\r\n" not in response_header:
                if time.time() - start_time > self.timeout:
                    self.close()
                    return False
                chunk = self.sock.recv(4096)
                if not chunk:
                    break
                response_header += chunk

            header_str = response_header.decode("latin1", errors="ignore")
            if " 101 " not in header_str.split("\r\n")[0]:
                self.close()
                return False

            self.connected = True
            return True
        except Exception:
            self.close()
            return False

    @staticmethod
    def encode_frame(payload: bytes, opcode: int = OPCODE_TEXT, mask: bool = True) -> bytes:
        """將 Payload 打包成符合 RFC 6455 規範的 WebSocket Frame"""
        length = len(payload)
        frame = bytearray()
        first_byte = 0x80 | (opcode & 0x0F)  # FIN = 1
        frame.append(first_byte)

        mask_flag = 0x80 if mask else 0x00
        if length <= 125:
            frame.append(mask_flag | length)
        elif length <= 65535:
            frame.append(mask_flag | 126)
            frame.extend(struct.pack("!H", length))
        else:
            frame.append(mask_flag | 127)
            frame.extend(struct.pack("!Q", length))

        if mask:
            mask_key = os.urandom(4)
            frame.extend(mask_key)
            masked_payload = bytearray(length)
            for i in range(length):
                masked_payload[i] = payload[i] ^ mask_key[i % 4]
            frame.extend(masked_payload)
        else:
            frame.extend(payload)

        return bytes(frame)

    @staticmethod
    def decode_frame_header(data: bytes) -> Tuple[int, bool, int, int, Optional[bytes]]:
        """
        解析 Frame 標頭。
        回傳: (opcode, fin, payload_len, header_size, mask_key)
        """
        if len(data) < 2:
            raise ValueError("Data too short for WS header")
        b1 = data[0]
        b2 = data[1]

        fin = bool(b1 & 0x80)
        opcode = b1 & 0x0F
        has_mask = bool(b2 & 0x80)
        raw_len = b2 & 0x7F

        idx = 2
        if raw_len == 126:
            if len(data) < idx + 2:
                raise ValueError("Data too short for 16-bit length")
            payload_len = struct.unpack("!H", data[idx:idx + 2])[0]
            idx += 2
        elif raw_len == 127:
            if len(data) < idx + 8:
                raise ValueError("Data too short for 64-bit length")
            payload_len = struct.unpack("!Q", data[idx:idx + 8])[0]
            idx += 8
        else:
            payload_len = raw_len

        mask_key = None
        if has_mask:
            if len(data) < idx + 4:
                raise ValueError("Data too short for mask key")
            mask_key = data[idx:idx + 4]
            idx += 4

        return opcode, fin, payload_len, idx, mask_key

    def send_text(self, text: str) -> bool:
        """發送文字訊框 (Client 必須進行 Masking)，連線異常時自動清理標記斷線"""
        if not self.connected or not self.sock:
            return False
        try:
            payload = text.encode("utf-8")
            frame = self.encode_frame(payload, opcode=self.OPCODE_TEXT, mask=True)
            self.sock.sendall(frame)
            return True
        except Exception:
            self.close()
            return False

    def recv_text(self, timeout: Optional[float] = None) -> Optional[str]:
        """接收下一個文字訊息，自動處理 Ping/Pong 與多訊框組裝"""
        if not self.connected or not self.sock:
            return None

        orig_timeout = self.sock.gettimeout()
        if timeout is not None:
            self.sock.settimeout(timeout)

        try:
            # 讀取至少 2 位元組
            header_buf = bytearray()
            while len(header_buf) < 2:
                chunk = self.sock.recv(2 - len(header_buf))
                if not chunk:
                    self.close()
                    return None
                header_buf.extend(chunk)

            b1 = header_buf[0]
            b2 = header_buf[1]
            opcode = b1 & 0x0F
            has_mask = bool(b2 & 0x80)
            raw_len = b2 & 0x7F

            extra_bytes = 0
            if raw_len == 126:
                extra_bytes = 2
            elif raw_len == 127:
                extra_bytes = 8

            if has_mask:
                extra_bytes += 4

            if extra_bytes > 0:
                extra_buf = bytearray()
                while len(extra_buf) < extra_bytes:
                    chunk = self.sock.recv(extra_bytes - len(extra_buf))
                    if not chunk:
                        self.close()
                        return None
                    extra_buf.extend(chunk)
                header_buf.extend(extra_buf)

            _, fin, payload_len, header_size, mask_key = self.decode_frame_header(bytes(header_buf))

            # 讀取 Payload
            payload_buf = bytearray()
            while len(payload_buf) < payload_len:
                chunk = self.sock.recv(min(4096, payload_len - len(payload_buf)))
                if not chunk:
                    self.close()
                    return None
                payload_buf.extend(chunk)

            # 解除 Mask (若服務端有 Mask)
            if mask_key:
                for i in range(len(payload_buf)):
                    payload_buf[i] ^= mask_key[i % 4]

            # 處理控制訊框
            if opcode == self.OPCODE_PING:
                pong = self.encode_frame(bytes(payload_buf), opcode=self.OPCODE_PONG, mask=True)
                self.sock.sendall(pong)
                return self.recv_text(timeout)
            elif opcode == self.OPCODE_CLOSE:
                self.close()
                return None
            elif opcode == self.OPCODE_TEXT:
                return payload_buf.decode("utf-8", errors="replace")
            else:
                return None
        except (socket.timeout, TimeoutError):
            return None
        except Exception:
            self.close()
            return None
        finally:
            if self.sock and timeout is not None:
                self.sock.settimeout(orig_timeout)

    def close(self) -> None:
        """關閉連線"""
        self.connected = False
        if self.sock:
            try:
                # 發送正常 Close 訊框
                close_frame = self.encode_frame(struct.pack("!H", 1000), opcode=self.OPCODE_CLOSE, mask=True)
                self.sock.sendall(close_frame)
            except Exception:
                pass
            try:
                self.sock.close()
            except Exception:
                pass
            self.sock = None


# ---------------------------------------------------------------------------
# CDP 通訊適配器 (CDPConnection)
# ---------------------------------------------------------------------------

class CDPConnection:
    """管理 WebSocket 連線之上的 Chrome DevTools Protocol (CDP) JSON-RPC 雙向呼叫"""

    def __init__(self, ws_client: Optional[MinimalWebSocketClient] = None):
        self.ws = ws_client
        self._msg_id = 0
        self._pending_calls: Dict[int, Any] = {}

    def is_connected(self) -> bool:
        return bool(self.ws and self.ws.connected)

    def send_command(self, method: str, params: Optional[Dict[str, Any]] = None, timeout: float = 10.0) -> Dict[str, Any]:
        """
        發送 CDP 指令並等待 JSON-RPC 結果回應。
        格式: {"id": 1, "method": "Runtime.evaluate", "params": {...}}
        具備斷線即時偵測與逾時例外防禦。
        """
        if not self.is_connected() or not self.ws:
            return {"error": {"message": "CDP not connected", "code": "disconnected"}}

        self._msg_id += 1
        req_id = self._msg_id
        req_payload = {
            "id": req_id,
            "method": method,
            "params": params or {}
        }

        if not self.ws.send_text(json.dumps(req_payload)):
            return {"error": {"message": "Failed to send CDP frame", "code": "send_failed"}}

        start_time = time.time()
        while time.time() - start_time < timeout:
            remaining = timeout - (time.time() - start_time)
            if remaining <= 0:
                break
            try:
                raw = self.ws.recv_text(timeout=min(0.5, remaining))
            except Exception:
                return {"error": {"message": "Transport error awaiting CDP response", "code": "transport_error"}}

            if not raw:
                if not self.is_connected():
                    return {"error": {"message": "Connection closed while awaiting CDP response", "code": "disconnected"}}
                continue
            try:
                resp = json.loads(raw)
                if resp.get("id") == req_id:
                    return resp
            except json.JSONDecodeError:
                continue

        return {"error": {"message": f"CDP command {method} timed out after {timeout}s", "code": "timeout"}}

    def evaluate(self, expression: str, return_by_value: bool = True, timeout: float = 10.0) -> Any:
        """封裝 Runtime.evaluate 指令執行 JavaScript 表達式並取得結果值，具備逾時例外防禦"""
        try:
            res = self.send_command(
                "Runtime.evaluate",
                {
                    "expression": expression,
                    "returnByValue": return_by_value,
                    "awaitPromise": True
                },
                timeout=timeout
            )
            if "result" in res and "result" in res["result"]:
                val_obj = res["result"]["result"]
                return val_obj.get("value")
            return None
        except Exception:
            return None


# ---------------------------------------------------------------------------
# WebBrainBridge 瀏覽器適配器主體 (Phase 1)
# ---------------------------------------------------------------------------

class WebBrainBridge:
    """
    WebBrainBridge - 本機瀏覽器 DeepSeek CDP 通訊適配器 (Phase 1)
    
    支援功能:
      - 本機 9222 / 自訂 CDP 除錯端口之標籤頁目標掃描
      - 自動定位 DeepSeek 標籤頁或指定分頁
      - WebSocket 握手建連
      - 注入 Prompt 輸入並觸發送出
      - 串流提取 DOM 內容 (Thinking 與回答增量文字)
      - 提供 Mock 測試模式，保證離線無瀏覽器時全功能自檢
    """

    def __init__(self, host: str = "127.0.0.1", port: int = 9222, mock_mode: bool = False):
        self.host = host
        self.port = port
        self.mock_mode = mock_mode
        self.target: Optional[CDPTarget] = None
        self.cdp_conn: Optional[CDPConnection] = None
        self._mock_data: Dict[str, Any] = {
            "targets": [
                {
                    "id": "mock_target_01",
                    "title": "DeepSeek - Into the Unknown",
                    "url": "https://chat.deepseek.com/",
                    "type": "page",
                    "webSocketDebuggerUrl": "ws://127.0.0.1:9222/devtools/page/mock_target_01"
                }
            ],
            "is_generating": False,
            "response_text": "",
            "thinking_text": ""
        }

    @property
    def endpoint_url(self) -> str:
        return f"http://{self.host}:{self.port}"

    def list_targets(self, timeout: float = 3.0, use_cache: bool = False) -> List[CDPTarget]:
        """
        探測 CDP 端口並呼叫 `/json/list` 取得當前所有頁面 Target 清單。
        可選啟用快取以減輕高頻 CDP 輪詢壓力。
        """
        if self.mock_mode:
            return [CDPTarget.from_dict(t) for t in self._mock_data["targets"]]

        if use_cache:
            cache = get_brain_cache()
            cached = cache.get_cached_targets()
            if cached is not None:
                return cached

        url = f"{self.endpoint_url}/json/list"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "WebBrainBridge/0.1"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                targets = [CDPTarget.from_dict(item) for item in data]
                if use_cache:
                    get_brain_cache().set_cached_targets(targets, ttl=2.0)
                return targets
        except Exception:
            return []

    def list_ai_targets(self, timeout: float = 3.0) -> List[CDPTarget]:
        """列出所有已開啟且可識別的 AI 大模型網頁標籤頁 (DeepSeek, Gemini, ChatGPT, Claude, Grok 等)"""
        targets = self.list_targets(timeout=timeout)
        return [t for t in targets if t.type == "page" and t.web_socket_debugger_url and t.is_ai_target()]

    def find_target(self, provider: Optional[str] = None) -> Optional[CDPTarget]:
        """
        依照指定 provider 或優先順序尋找 AI 網頁標籤頁。
        優先順序: deepseek > claude > chatgpt > gemini > grok > 其他可用 page
        """
        targets = self.list_targets()
        page_targets = [t for t in targets if t.type == "page" and t.web_socket_debugger_url]
        if not page_targets:
            return None

        if provider:
            p_lower = provider.lower()
            for t in page_targets:
                if t.detect_provider() == p_lower:
                    return t

        for pref in ["deepseek", "claude", "chatgpt", "gemini", "grok"]:
            for t in page_targets:
                if t.detect_provider() == pref:
                    return t

        return page_targets[0]

    def find_deepseek_target(self) -> Optional[CDPTarget]:
        """自動尋找 DeepSeek 網頁標籤頁 (向後相容)"""
        return self.find_target(provider="deepseek")

    def connect(self, target: Optional[CDPTarget] = None, max_retries: int = 1, retry_delay: float = 0.5) -> bool:
        """
        連線至指定或自動偵測到的 Target，支援重試機制。
        """
        for attempt in range(max(1, max_retries)):
            if self.mock_mode:
                self.target = target or self.find_deepseek_target()
                self.cdp_conn = CDPConnection()
                return True

            curr_target = target or self.find_deepseek_target()
            if curr_target and curr_target.web_socket_debugger_url:
                self.target = curr_target
                ws = MinimalWebSocketClient(curr_target.web_socket_debugger_url)
                if ws.connect():
                    self.cdp_conn = CDPConnection(ws)
                    return True

            if attempt < max_retries - 1:
                time.sleep(retry_delay)

        return False

    def reconnect(self, max_retries: int = 3, retry_delay: float = 0.5) -> bool:
        """
        中斷現有連線並嘗試重新連線。
        重新掃描 Targets 並重新建立 WebSocket 連線。
        """
        self.disconnect()
        if self.mock_mode:
            return self.connect()

        for attempt in range(max(1, max_retries)):
            target = self.find_deepseek_target()
            if target and self.connect(target):
                return True
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
        return False

    def ensure_connected(self, auto_reconnect: bool = True) -> bool:
        """確保處於有效連線狀態，斷線時自動觸發重連"""
        if self.is_connected():
            return True
        if auto_reconnect:
            return self.reconnect()
        return False

    def disconnect(self) -> None:
        """中斷 CDP 連線"""
        if self.cdp_conn and self.cdp_conn.ws:
            self.cdp_conn.ws.close()
        self.cdp_conn = None
        self.target = None

    def is_connected(self) -> bool:
        if self.mock_mode:
            return self.cdp_conn is not None
        return bool(self.cdp_conn and self.cdp_conn.is_connected())

    # -----------------------------------------------------------------------
    # DOM 操控與指令注入 (Prompt Injection)
    # -----------------------------------------------------------------------

    def build_injection_script(self, prompt: str, provider: Optional[str] = None) -> str:
        """
        建構注入多模型 (DeepSeek / Gemini / ChatGPT / Claude / Grok) 輸入框並激發事件之 JavaScript 代碼。
        相容原生 textarea、Quill 編輯器 (Gemini)、ProseMirror (Claude/Grok/ChatGPT) 與 contenteditable 元素。
        """
        escaped_prompt = json.dumps(prompt, ensure_ascii=False)
        target_provider = provider or (self.target.detect_provider() if self.target else "unknown")

        return f"""
        (() => {{
            const provider = "{target_provider}";
            let inputEl = null;

            // 1. 各平台專屬選擇器優先尋找
            if (provider === "gemini") {{
                inputEl = document.querySelector('rich-textarea div.ql-editor[contenteditable="true"]')
                       || document.querySelector('div.ql-editor')
                       || document.querySelector('rich-textarea div[contenteditable="true"]');
            }} else if (provider === "chatgpt") {{
                inputEl = document.querySelector('#prompt-textarea')
                       || document.querySelector('div[contenteditable="true"]#prompt-textarea')
                       || document.querySelector('textarea[data-id="root"]')
                       || document.querySelector('textarea[placeholder*="請輸入訊息"]')
                       || document.querySelector('textarea[placeholder*="請輸入"]')
                       || document.querySelector('textarea[placeholder*="訊息"]');
            }} else if (provider === "claude") {{
                inputEl = document.querySelector('div[contenteditable="true"].ProseMirror')
                       || document.querySelector('div[contenteditable="true"]');
            }} else if (provider === "grok") {{
                inputEl = document.querySelector('div.tiptap.ProseMirror')
                       || document.querySelector('div[contenteditable="true"]')
                       || document.querySelector('textarea');
            }} else if (provider === "deepseek") {{
                inputEl = document.querySelector('textarea[placeholder*="DeepSeek"]')
                       || document.querySelector('textarea#chat-input');
            }}

            // 2. 通用回退選擇器
            if (!inputEl) {{
                const fallbackSelectors = [
                    'rich-textarea div[contenteditable="true"]',
                    'div.ql-editor',
                    '#prompt-textarea',
                    'div.tiptap.ProseMirror',
                    'div[contenteditable="true"].ProseMirror',
                    'textarea[placeholder*="DeepSeek"]',
                    'textarea[placeholder*="输入"]',
                    'textarea[placeholder*="消息"]',
                    'textarea[placeholder*="Ask"]',
                    'textarea#chat-input',
                    'textarea',
                    'div[contenteditable="true"]'
                ];
                for (const s of fallbackSelectors) {{
                    const el = document.querySelector(s);
                    if (el && el.offsetParent !== null) {{
                        inputEl = el;
                        break;
                    }}
                }}
            }}

            if (!inputEl) return {{ success: false, reason: "input_not_found", provider: provider }};

            inputEl.focus();

            // 3. 填入內容 (支援 React 16+ 原生 Setter 穿透與 contenteditable 容器)
            if (inputEl.tagName.toLowerCase() === 'textarea') {{
                try {{
                    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                    nativeSetter.call(inputEl, {escaped_prompt});
                }} catch (e) {{
                    inputEl.value = {escaped_prompt};
                }}
                inputEl.dispatchEvent(new Event('input', {{ bubbles: true }}));
                inputEl.dispatchEvent(new Event('change', {{ bubbles: true }}));
            }} else {{
                // contenteditable / Quill / ProseMirror
                if (inputEl.classList.contains('ql-editor')) {{
                    inputEl.innerHTML = '<p>' + {escaped_prompt}.replace(/\\n/g, '<br>') + '</p>';
                }} else {{
                    inputEl.innerText = {escaped_prompt};
                }}
                inputEl.dispatchEvent(new InputEvent('input', {{ bubbles: true, data: {escaped_prompt} }}));
                inputEl.dispatchEvent(new Event('input', {{ bubbles: true }}));
                inputEl.dispatchEvent(new Event('change', {{ bubbles: true }}));
            }}

            // 4. 尋找發送按鈕並觸發
            setTimeout(() => {{
                const sendSelectors = [
                    // DeepSeek
                    'div.ds-button--circle',
                    'div[class*="ds-button--circle"]',
                    'div[role="button"][aria-label*="发送"]',
                    'div[role="button"][aria-label*="Send"]',
                    'div.ds-icon-button',
                    // ChatDay / ChatGPT
                    'button.bg-primary:has(svg)',
                    'button[class*="bg-primary"]:has(svg)',
                    'button[class*="rounded-full"]:has(svg)',
                    'button[data-testid="send-button"]',
                    // Gemini
                    'button[aria-label*="傳送"]',
                    'button[aria-label*="發送"]',
                    'button[aria-label*="Send"]',
                    'button.send-button',
                    // Claude / Grok
                    'button[aria-label*="Submit"]',
                    'button[aria-label*="提交"]',
                    'button[aria-label*="Send"]',
                    'button[type="submit"]',
                    'div[class*="send-button"]'
                ];
                let sendBtn = null;
                for (const s of sendSelectors) {{
                    const btn = document.querySelector(s);
                    if (btn && !btn.className.includes('disabled') && !btn.hasAttribute('disabled') && btn.getAttribute('aria-disabled') !== 'true') {{
                        sendBtn = btn;
                        break;
                    }}
                }}
                if (sendBtn) {{
                    sendBtn.click();
                }} else {{
                    // 按下 Enter 送出
                    const enterEvt = new KeyboardEvent('keydown', {{
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true
                    }});
                    inputEl.dispatchEvent(enterEvt);
                }}
            }}, 150);

            return {{ success: true, target: inputEl.tagName, provider: provider }};
        }})();
        """

    def inject_prompt(self, prompt: str, auto_reconnect: bool = True, provider: Optional[str] = None) -> Dict[str, Any]:
        """向瀏覽器當前分頁注入 Prompt 並送出，具備斷線重連防禦"""
        if self.mock_mode:
            tab_tag = f" [Tab {self.target.id}]" if self.target else ""
            self._mock_data["is_generating"] = True
            self._mock_data["response_text"] = f"[Mock Brain Reply{tab_tag} for: {prompt}]"
            self._mock_data["thinking_text"] = f"Mock Thinking Process{tab_tag}..."
            return {"success": True, "target": "TEXTAREA"}

        if not self.is_connected():
            if not (auto_reconnect and self.ensure_connected()):
                return {"success": False, "reason": "not_connected"}

        js_script = self.build_injection_script(prompt, provider=provider)
        try:
            res = self.cdp_conn.evaluate(js_script) if self.cdp_conn else None
            time.sleep(0.2)
            # 雙軌防禦: 若發現 textarea 仍殘留 prompt，透過 CDP 原生發送 Enter 鍵送出
            if self.cdp_conn:
                ta_val = self.cdp_conn.evaluate("document.querySelector('textarea')?.value")
                if ta_val and ta_val.strip() == prompt.strip():
                    self.cdp_conn.send_command("Input.dispatchKeyEvent", {
                        "type": "rawKeyDown",
                        "windowsVirtualKeyCode": 13,
                        "unmodifiedText": "\r",
                        "text": "\r",
                        "key": "Enter",
                        "code": "Enter"
                    })
                    self.cdp_conn.send_command("Input.dispatchKeyEvent", {
                        "type": "keyUp",
                        "windowsVirtualKeyCode": 13,
                        "key": "Enter",
                        "code": "Enter"
                    })
            if isinstance(res, dict):
                return res
            if res:
                return {"success": True}
        except Exception:
            pass

        # 遭遇連線中斷或例外時嘗試重連一次
        if auto_reconnect and self.reconnect():
            try:
                res = self.cdp_conn.evaluate(js_script) if self.cdp_conn else None
                if isinstance(res, dict):
                    return res
                return {"success": bool(res)}
            except Exception as inner_e:
                return {"success": False, "reason": f"injection_failed_after_reconnect: {inner_e}"}

        return {"success": False, "reason": "injection_failed"}

    # -----------------------------------------------------------------------
    # DOM 提取與串流監視 (DOM Stream Extraction)
    # -----------------------------------------------------------------------

    def build_extraction_script(self, provider: Optional[str] = None) -> str:
        """
        建構自多模型 (DeepSeek / Gemini / ChatGPT / Claude / Grok) 網頁 DOM 提取最新回答內容、思考歷程與生成狀態之腳本。
        """
        target_provider = provider or (self.target.detect_provider() if self.target else "unknown")
        return f"""
        (() => {{
            const provider = "{target_provider}";

            // 1. 判斷是否仍在生成 (停用按鈕 / 終止按鈕 / 旋轉指示器)
            const stopBtnSelectors = [
                'button[data-testid="stop-button"]',
                'div[role="button"][aria-label*="停止"]',
                'div[role="button"][aria-label*="Stop"]',
                'button[aria-label*="停止"]',
                'button[aria-label*="Stop"]',
                'div[class*="stop-button"]',
                'svg.ds-icon-stop'
            ];
            let isGenerating = false;
            for (const s of stopBtnSelectors) {{
                const btn = document.querySelector(s);
                if (btn && btn.offsetParent !== null) {{
                    isGenerating = true;
                    break;
                }}
            }}

            // 檢查 DeepSeek 圓形按鈕內的停止正方形 SVG
            if (!isGenerating) {{
                const circleBtn = document.querySelector('div.ds-button--circle') || document.querySelector('div[class*="ds-button--circle"]');
                if (circleBtn) {{
                    const path = circleBtn.querySelector('svg path');
                    const d = path ? path.getAttribute('d') : '';
                    if (d && (d.startsWith('M2 ') || d.includes('2H11') || d.includes('14H4'))) {{
                        isGenerating = true;
                    }}
                }}
            }}

            // 2. 檢查是否有「繼續生成 / Continue」按鈕
            let hasContinue = false;
            const actionBtns = Array.from(document.querySelectorAll('button, div[role="button"]'));
            for (const b of actionBtns) {{
                const txt = (b.innerText || b.getAttribute('aria-label') || '').trim();
                if (txt === '继续生成' || txt === '繼續生成' || txt.toLowerCase().includes('continue generating')) {{
                    hasContinue = true;
                    break;
                }}
            }}

            // 3. 尋找最後一則回答訊息元素
            const msgSelectors = [
                // DeepSeek
                '.ds-assistant-message-main-content',
                '.ds-markdown',
                // ChatGPT
                'div[data-message-author-role="assistant"]',
                // Gemini
                'model-response .markdown',
                'message-content',
                // Claude
                'div.font-claude-message',
                // Grok
                'div.message-bubble',
                // 通用與 ChatDay
                '.markdown-body',
                '.prose',
                'div[class*="markdown-body"]',
                'div.markdown',
                'div[class*="chat-message"]',
                'div.message-content',
                'div[class*="assistant"]',
                'div[class*="prose"]'
            ];
            let responseText = "";
            let msgCount = 0;
            for (const s of msgSelectors) {{
                const elements = document.querySelectorAll(s);
                if (elements.length > 0) {{
                    msgCount = elements.length;
                    const lastEl = elements[elements.length - 1];
                    responseText = lastEl.innerText || lastEl.textContent || "";
                    if (responseText.trim().length > 0) break;
                }}
            }}

            // 4. 尋找思考過程 (DeepSeek-R1 / ChatGPT / Gemini 思維鏈)
            const thinkingSelectors = [
                'div[class*="thinking"]',
                'div[class*="reasoning"]',
                '.ds-reasoning-content',
                'div[data-testid="thought-box"]',
                '.thought-container'
            ];
            let thinkingText = "";
            for (const s of thinkingSelectors) {{
                const elements = document.querySelectorAll(s);
                if (elements.length > 0) {{
                    const lastEl = elements[elements.length - 1];
                    thinkingText = lastEl.innerText || lastEl.textContent || "";
                    if (thinkingText.trim().length > 0) break;
                }}
            }}

            return {{
                is_generating: isGenerating,
                has_continue: hasContinue,
                response_text: responseText,
                thinking_text: thinkingText,
                message_count: msgCount,
                provider: provider
            }};
        }})();
        """

    def click_continue_generation(self) -> bool:
        """若畫面上出現「繼續生成」或「Continue」按鈕，主動點擊以維持長代碼輸出完整性"""
        if not self.is_connected():
            return False
        js = """
        (() => {
            const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
            for (const b of btns) {
                const txt = (b.innerText || b.getAttribute('aria-label') || '').trim();
                if (txt === '继续生成' || txt === '繼續生成' || txt.toLowerCase().includes('continue generating')) {
                    b.click();
                    return true;
                }
            }
            return false;
        })()
        """
        try:
            return bool(self.cdp_conn.evaluate(js))
        except Exception:
            return False

    def extract_dom_snapshot(self, auto_reconnect: bool = True, provider: Optional[str] = None) -> Dict[str, Any]:
        """提取當前 DOM 回答快照，具備逾時與斷線例外防禦"""
        if self.mock_mode:
            return {
                "is_generating": self._mock_data["is_generating"],
                "response_text": self._mock_data["response_text"],
                "thinking_text": self._mock_data["thinking_text"],
                "message_count": 1
            }

        if not self.is_connected():
            if not (auto_reconnect and self.ensure_connected()):
                return {"is_generating": False, "response_text": "", "thinking_text": "", "message_count": 0, "error": "not_connected"}

        try:
            res = self.cdp_conn.evaluate(self.build_extraction_script(provider=provider), timeout=5.0) if self.cdp_conn else None
            if isinstance(res, dict):
                return res
            return {"is_generating": False, "response_text": "", "thinking_text": "", "message_count": 0}
        except Exception as e:
            if auto_reconnect and self.reconnect():
                try:
                    res = self.cdp_conn.evaluate(self.build_extraction_script(provider=provider), timeout=5.0) if self.cdp_conn else None
                    if isinstance(res, dict):
                        return res
                except Exception:
                    pass
            return {"is_generating": False, "response_text": "", "thinking_text": "", "message_count": 0, "error": str(e)}

    def stream_response(
        self,
        poll_interval: float = 0.3,
        timeout: float = 60.0,
        idle_timeout: float = 20.0
    ) -> Generator[Dict[str, Any], None, None]:
        """
        DOM 串流增量提取器。
        以輪詢方式監視 DOM 變化，產出增量 Delta 文字事件:
          {"delta": "新增文字", "thinking_delta": "...", "done": False}
        具備全域 timeout、閒置 idle_timeout 與中途斷線容錯防禦。
        """
        start_time = time.time()
        last_activity_time = time.time()
        last_resp_len = 0
        last_think_len = 0
        seen_generating = False
        consecutive_stopped_ticks = 0
        consecutive_errors = 0
        max_consecutive_errors = 5

        # 初始基線防禦 (防多輪對話讀取到上一回合舊回答)
        initial_snapshot = self.extract_dom_snapshot() if not self.mock_mode else {}
        baseline_text = initial_snapshot.get("response_text", "")
        baseline_count = initial_snapshot.get("message_count", 0)
        started_new_turn = False if (baseline_text or baseline_count > 0) else True

        if self.mock_mode:
            # 模擬平滑打字機串流
            full_text = self._mock_data["response_text"]
            chunk_size = max(1, len(full_text) // 5)
            for i in range(0, len(full_text), chunk_size):
                chunk = full_text[i:i + chunk_size]
                yield {"delta": chunk, "thinking_delta": "", "done": False}
                time.sleep(0.05)
            self._mock_data["is_generating"] = False
            yield {"delta": "", "thinking_delta": "", "done": True}
            return

        while time.time() - start_time < timeout:
            snapshot = self.extract_dom_snapshot()
            if snapshot.get("error"):
                consecutive_errors += 1
                if consecutive_errors >= max_consecutive_errors:
                    # 連續錯誤超限，終止串流避免無限等待
                    yield {
                        "delta": "",
                        "thinking_delta": "",
                        "done": True,
                        "error": f"Stream aborted due to persistent errors: {snapshot.get('error')}"
                    }
                    break
                time.sleep(poll_interval)
                continue
            else:
                consecutive_errors = 0

            curr_resp = snapshot.get("response_text", "")
            curr_think = snapshot.get("thinking_text", "")
            curr_count = snapshot.get("message_count", 0)
            is_gen = snapshot.get("is_generating", False)

            if is_gen:
                seen_generating = True

            # 若尚未偵測到新回合訊息開始，持續等待新元素掛載或內容更新
            if not started_new_turn:
                if curr_count > baseline_count:
                    started_new_turn = True
                    last_resp_len = 0
                    last_think_len = 0
                elif is_gen and curr_resp != baseline_text:
                    started_new_turn = True
                    last_resp_len = 0
                    last_think_len = 0
                else:
                    time.sleep(poll_interval)
                    continue

            resp_delta = ""
            think_delta = ""

            if len(curr_resp) > last_resp_len:
                resp_delta = curr_resp[last_resp_len:]
                last_resp_len = len(curr_resp)
                last_activity_time = time.time()

            if len(curr_think) > last_think_len:
                think_delta = curr_think[last_think_len:]
                last_think_len = len(curr_think)
                last_activity_time = time.time()

            if resp_delta or think_delta:
                yield {
                    "delta": resp_delta,
                    "thinking_delta": think_delta,
                    "done": False
                }

            # 發現「繼續生成 / Continue」按鈕時，自動點擊延續長內容
            if snapshot.get("has_continue") and not is_gen:
                self.click_continue_generation()
                consecutive_stopped_ticks = 0
                time.sleep(0.8)
                continue

            # 防閃爍提早退出：若曾偵測到正在生成，需連續穩定 3 次 (約 1 秒) 且非 is_gen 才視為真正完成
            if seen_generating and not is_gen and len(curr_resp) > 0:
                consecutive_stopped_ticks += 1
                if consecutive_stopped_ticks >= 3:
                    yield {"delta": "", "thinking_delta": "", "done": True}
                    break
            else:
                consecutive_stopped_ticks = 0

            # 閒置逾時防禦: 若已開始生成但超過 idle_timeout 未有新輸出
            if seen_generating and (time.time() - last_activity_time > idle_timeout):
                yield {"delta": "", "thinking_delta": "", "done": True, "timeout": True}
                break

            time.sleep(poll_interval)


# ---------------------------------------------------------------------------
# 分頁池與會話隔離管理 (Phase 4: Session Isolation & Tab Pool)
# ---------------------------------------------------------------------------

@dataclass
class PooledTab:
    """代表分頁池中一個託管的分頁實體與通訊適配器"""
    tab_id: str
    target: CDPTarget
    bridge: WebBrainBridge
    in_use: bool = False
    session_id: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    last_used_at: float = field(default_factory=time.time)
    lock: threading.Lock = field(default_factory=threading.Lock)

    def mark_busy(self, session_id: Optional[str] = None) -> None:
        self.in_use = True
        self.last_used_at = time.time()
        if session_id:
            self.session_id = session_id

    def mark_idle(self) -> None:
        self.in_use = False
        self.last_used_at = time.time()


class CDPTabPool:
    """
    CDP 瀏覽器分頁池與會話隔離管理器 (Phase 4)。
    支援:
      1. 多分頁資源池管理 (Target Discovery, Auto-Allocation, Tab Lifecycle)
      2. 會話黏滯性綁定 (Sticky Session): 同一 session_id 優先使用既有分頁保留對話歷程
      3. DOM 輸入框與執行環境互斥隔離: 一個分頁同時間僅允許一個外包任務使用
      4. 佇列調度與逾時防禦: 當池內分頁耗盡時，請求進入佇列排隊等待
      5. 無 GPU 環境高負載穩定性保障
      6. 完整 Mock 模式支援多虛擬分頁並行隔離驗證
    """

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 9222,
        max_tabs: int = 4,
        mock_mode: bool = False,
        session_ttl: float = 600.0
    ):
        self.host = host
        self.port = port
        self.max_tabs = max_tabs
        self.mock_mode = mock_mode
        self.session_ttl = session_ttl
        self._tabs: Dict[str, PooledTab] = {}
        self._lock = threading.RLock()
        self._cond = threading.Condition(self._lock)
        self._waiting_count = 0
        self._total_dispatches = 0

    @property
    def endpoint_url(self) -> str:
        return f"http://{self.host}:{self.port}"

    def initialize(self) -> int:
        """掃描現有 Targets 或預先填充 Mock 分頁"""
        with self._lock:
            if self.mock_mode:
                for i in range(1, min(self.max_tabs, 3) + 1):
                    tab_id = f"mock_tab_{i:02d}"
                    target = CDPTarget(
                        id=tab_id,
                        title=f"DeepSeek - Tab Pool Session {i}",
                        url=f"https://chat.deepseek.com/?tab={i}",
                        type="page",
                        web_socket_debugger_url=f"ws://{self.host}:{self.port}/devtools/page/{tab_id}"
                    )
                    bridge = WebBrainBridge(host=self.host, port=self.port, mock_mode=True)
                    bridge.target = target
                    bridge._mock_data = {
                        "targets": [target.__dict__],
                        "is_generating": False,
                        "response_text": "",
                        "thinking_text": "",
                        "tab_id": tab_id
                    }
                    self._tabs[tab_id] = PooledTab(
                        tab_id=tab_id,
                        target=target,
                        bridge=bridge
                    )
                return len(self._tabs)

            probe_bridge = WebBrainBridge(host=self.host, port=self.port, mock_mode=False)
            targets = probe_bridge.list_targets()
            ds_targets = [t for t in targets if t.is_deepseek()] or [t for t in targets if t.type == "page" and t.web_socket_debugger_url]

            for t in ds_targets[:self.max_tabs]:
                if t.id not in self._tabs:
                    tab_bridge = WebBrainBridge(host=self.host, port=self.port, mock_mode=False)
                    tab_bridge.connect(t)
                    self._tabs[t.id] = PooledTab(
                        tab_id=t.id,
                        target=t,
                        bridge=tab_bridge
                    )

            return len(self._tabs)

    def acquire(self, session_id: Optional[str] = None, timeout: float = 30.0) -> Optional[PooledTab]:
        """
        自分頁池租借一個分頁，具備會話黏滯性 (Sticky Session) 與佇列排隊機制。
        - 若指定 session_id，優先復用該 session 過去綁定的分頁
        - 若分頁皆忙碌，則線程進入條件變數等待，直到有分頁歸還或逾時
        """
        deadline = time.time() + timeout
        with self._lock:
            self._waiting_count += 1
            try:
                while True:
                    # 1. 優先嘗試 session 黏滯匹配
                    if session_id:
                        for tab in self._tabs.values():
                            if tab.session_id == session_id:
                                if not tab.in_use:
                                    tab.mark_busy(session_id)
                                    self._total_dispatches += 1
                                    return tab

                    # 2. 尋找閒置 (idle) 分頁
                    for tab in self._tabs.values():
                        if not tab.in_use:
                            tab.mark_busy(session_id)
                            self._total_dispatches += 1
                            return tab

                    # 3. 若未達最大分頁數上限，嘗試建立新分頁
                    if len(self._tabs) < self.max_tabs:
                        new_tab = self._create_new_tab(session_id)
                        if new_tab:
                            self._total_dispatches += 1
                            return new_tab

                    # 4. 分頁皆忙碌，計算剩餘等待時間
                    remaining = deadline - time.time()
                    if remaining <= 0:
                        return None

                    self._cond.wait(remaining)
            finally:
                self._waiting_count -= 1

    def _create_new_tab(self, session_id: Optional[str] = None) -> Optional[PooledTab]:
        """建立新分頁並納入池中管理"""
        if self.mock_mode:
            tab_idx = len(self._tabs) + 1
            tab_id = f"mock_tab_{tab_idx:02d}"
            target = CDPTarget(
                id=tab_id,
                title=f"DeepSeek - Dynamic Tab {tab_idx}",
                url=f"https://chat.deepseek.com/?tab={tab_idx}",
                type="page",
                web_socket_debugger_url=f"ws://{self.host}:{self.port}/devtools/page/{tab_id}"
            )
            bridge = WebBrainBridge(host=self.host, port=self.port, mock_mode=True)
            bridge.target = target
            bridge._mock_data = {
                "targets": [target.__dict__],
                "is_generating": False,
                "response_text": "",
                "thinking_text": "",
                "tab_id": tab_id
            }
            tab = PooledTab(tab_id=tab_id, target=target, bridge=bridge)
            tab.mark_busy(session_id)
            self._tabs[tab_id] = tab
            return tab

        try:
            url = f"{self.endpoint_url}/json/new?https://chat.deepseek.com/"
            req = urllib.request.Request(url, method="PUT")
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                target = CDPTarget.from_dict(data)
                tab_bridge = WebBrainBridge(host=self.host, port=self.port, mock_mode=False)
                tab_bridge.connect(target)
                tab = PooledTab(tab_id=target.id, target=target, bridge=tab_bridge)
                tab.mark_busy(session_id)
                self._tabs[target.id] = tab
                return tab
        except Exception:
            return None

    def release(self, tab: PooledTab, keep_session: bool = True) -> None:
        """歸還分頁至池中，喚醒正在等待的佇列線程"""
        with self._lock:
            tab.mark_idle()
            if not keep_session:
                tab.session_id = None
            self._cond.notify_all()

    def new_chat(self, tab: PooledTab) -> bool:
        """重置指定分頁至新對話狀態"""
        if self.mock_mode:
            tab.bridge._mock_data["response_text"] = ""
            tab.bridge._mock_data["thinking_text"] = ""
            tab.bridge._mock_data["is_generating"] = False
            return True

        if not tab.bridge.is_connected():
            tab.bridge.connect(tab.target)

        new_chat_script = """
        (() => {
            const selectors = [
                'div[class*="new-chat"]',
                'button[class*="new-chat"]',
                'div[role="button"][aria-label*="新建"]',
                'div[role="button"][aria-label*="New"]',
                'div[role="button"][aria-label*="新对话"]'
            ];
            for (const s of selectors) {
                const btn = document.querySelector(s);
                if (btn && btn.offsetParent !== null) {
                    btn.click();
                    return { success: true, method: "button" };
                }
            }
            if (window.location.pathname !== '/' && window.location.pathname !== '/chat') {
                window.location.href = 'https://chat.deepseek.com/';
                return { success: true, method: "navigate" };
            }
            return { success: false, reason: "button_not_found" };
        })();
        """
        try:
            res = tab.bridge.cdp_conn.evaluate(new_chat_script) if tab.bridge.cdp_conn else None
            return bool(res and isinstance(res, dict) and res.get("success"))
        except Exception:
            return False

    def close_all(self) -> None:
        """關閉分頁池所有連線"""
        with self._lock:
            for tab in self._tabs.values():
                try:
                    tab.bridge.disconnect()
                except Exception:
                    pass
            self._tabs.clear()
            self._cond.notify_all()

    def get_telemetry(self) -> Dict[str, Any]:
        """取得分頁池遙測狀態"""
        with self._lock:
            tabs_info = []
            busy_count = 0
            for t in self._tabs.values():
                if t.in_use:
                    busy_count += 1
                tabs_info.append({
                    "id": t.tab_id,
                    "title": t.target.title,
                    "url": t.target.url,
                    "in_use": t.in_use,
                    "session_id": t.session_id,
                    "last_used_at": t.last_used_at
                })
            return {
                "total_tabs": len(self._tabs),
                "busy_tabs": busy_count,
                "idle_tabs": len(self._tabs) - busy_count,
                "max_tabs": self.max_tabs,
                "waiting_queue": self._waiting_count,
                "total_dispatches": self._total_dispatches,
                "tabs": tabs_info
            }


@dataclass
class SessionInfo:
    """會話中繼資料實體"""
    session_id: str
    tab_id: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)
    request_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


class SessionManager:
    """
    會話管理器 (Phase 4: Session Manager)。
    負責 Session 生命週期、TTL 逾時清理與 Session-Tab 映射。
    """
    def __init__(self, tab_pool: CDPTabPool, ttl: float = 600.0):
        self.tab_pool = tab_pool
        self.ttl = ttl
        self._sessions: Dict[str, SessionInfo] = {}
        self._lock = threading.Lock()

    def create_session(self, metadata: Optional[Dict[str, Any]] = None) -> str:
        with self._lock:
            session_id = f"sess_{int(time.time() * 1000)}_{os.urandom(3).hex()}"
            self._sessions[session_id] = SessionInfo(
                session_id=session_id,
                metadata=metadata or {}
            )
            return session_id

    def touch_session(self, session_id: str, tab_id: Optional[str] = None) -> None:
        with self._lock:
            if session_id not in self._sessions:
                self._sessions[session_id] = SessionInfo(session_id=session_id)
            sess = self._sessions[session_id]
            sess.last_active = time.time()
            sess.request_count += 1
            if tab_id:
                sess.tab_id = tab_id

    def get_session(self, session_id: str) -> Optional[SessionInfo]:
        with self._lock:
            return self._sessions.get(session_id)

    def close_session(self, session_id: str) -> bool:
        with self._lock:
            if session_id in self._sessions:
                sess = self._sessions.pop(session_id)
                if sess.tab_id and sess.tab_id in self.tab_pool._tabs:
                    tab = self.tab_pool._tabs[sess.tab_id]
                    self.tab_pool.new_chat(tab)
                    tab.session_id = None
                return True
            return False

    def cleanup_expired(self) -> int:
        now = time.time()
        expired = []
        with self._lock:
            for s_id, s in self._sessions.items():
                if now - s.last_active > self.ttl:
                    expired.append(s_id)
        for s_id in expired:
            self.close_session(s_id)
        return len(expired)

    def list_sessions(self) -> List[Dict[str, Any]]:
        with self._lock:
            return [
                {
                    "session_id": s.session_id,
                    "tab_id": s.tab_id,
                    "created_at": s.created_at,
                    "last_active": s.last_active,
                    "request_count": s.request_count
                }
                for s in self._sessions.values()
            ]


# ---------------------------------------------------------------------------
# OpenAI 相容轉接服務 (Phase 2 & Phase 4: Local Adapter Server)
# ---------------------------------------------------------------------------

def format_messages_to_prompt(messages: List[Dict[str, str]]) -> str:
    """
    將 OpenAI 格式 messages 陣列格式化為單一 Prompt 注入文本。
    支援 system, user, assistant 角色與單則/多輪對話結構。
    """
    if not messages:
        return ""
    if len(messages) == 1 and messages[0].get("role") == "user":
        return str(messages[0].get("content", ""))

    lines = []
    for msg in messages:
        role = msg.get("role", "user").strip().lower()
        content = str(msg.get("content", "")).strip()
        if not content:
            continue
        if role == "system":
            lines.append(f"【系統指令】: {content}")
        elif role == "user":
            lines.append(f"【使用者】: {content}")
        elif role == "assistant":
            lines.append(f"【助手】: {content}")
        else:
            lines.append(f"【{role}】: {content}")

    return "\n\n".join(lines)


# ---------------------------------------------------------------------------
# DeepSeek DSML (DeepSeek Markup Language) -> OpenAI tool_calls 解析器
# ---------------------------------------------------------------------------

_TAG_PREFIX = r"<\s*(?:\uff5c|\|)?\s*(?:\uff5c|\|)?\s*DSML\s*(?:\uff5c|\|)?\s*(?:\uff5c|\|)?"
_TAG_CLOSE_PREFIX = r"<\s*/\s*(?:\uff5c|\|)?\s*(?:\uff5c|\|)?\s*DSML\s*(?:\uff5c|\|)?\s*(?:\uff5c|\|)?"

_RE_CALLS_BLOCK = re.compile(
    rf"{_TAG_PREFIX}\s*calls\s*>(.*?){_TAG_CLOSE_PREFIX}\s*calls\s*>",
    re.DOTALL | re.IGNORECASE,
)

_RE_INVOKE = re.compile(
    rf"{_TAG_PREFIX}\s*invoke\b([^>]*)>(.*?){_TAG_CLOSE_PREFIX}\s*invoke\s*>",
    re.DOTALL | re.IGNORECASE,
)

_RE_PARAM = re.compile(
    rf"{_TAG_PREFIX}\s*parameter\b([^>]*)>(.*?){_TAG_CLOSE_PREFIX}\s*parameter\s*>",
    re.DOTALL | re.IGNORECASE,
)

_RE_ATTR_NAME = re.compile(r'name=["\']([^"\']+)["\']', re.IGNORECASE)


def parse_dsml_tool_calls(text: str) -> Tuple[Optional[str], List[Dict[str, Any]], str]:
    """
    解析 DeepSeek 網頁端/模型輸出的 DSML (DeepSeek Markup Language) 工具呼叫標籤，
    轉譯為 OpenAI 相容的 tool_calls 結構。

    支援容錯匹配:
      < | | DSML | | calls> 或 <｜｜DSML｜｜ calls>
      < | | DSML | | invoke name="terminal">
      < | | DSML | | parameter name="command" string="true">...</ | | DSML | | parameter>
      </ | | DSML | | invoke>
      </ | | DSML | | calls>

    回傳:
      (clean_content, tool_calls, finish_reason)
      若有工具呼叫: finish_reason="tool_calls", tool_calls=[...], clean_content=DSML以外的文字或None
      若無工具呼叫: finish_reason="stop", tool_calls=[], clean_content=原文字
    """
    if not text:
        return text, [], "stop"

    match = _RE_CALLS_BLOCK.search(text)
    if not match:
        return text, [], "stop"

    calls_content = match.group(1)
    tool_calls = []

    invokes = _RE_INVOKE.findall(calls_content)
    idx = 0
    for attr_str, body in invokes:
        name_m = _RE_ATTR_NAME.search(attr_str)
        func_name = name_m.group(1).strip() if name_m else "unknown"

        params: Dict[str, Any] = {}
        for p_attr, p_val in _RE_PARAM.findall(body):
            p_name_m = _RE_ATTR_NAME.search(p_attr)
            if p_name_m:
                param_key = p_name_m.group(1).strip()
                val_str = p_val.strip()
                params[param_key] = val_str

        call_id = f"call_{uuid.uuid4().hex[:8]}"
        tool_calls.append({
            "index": idx,
            "id": call_id,
            "type": "function",
            "function": {
                "name": func_name,
                "arguments": json.dumps(params, ensure_ascii=False)
            }
        })
        idx += 1

    clean_text = _RE_CALLS_BLOCK.sub("", text).strip()
    return clean_text or None, tool_calls, "tool_calls" if tool_calls else "stop"



class OpenAIAdapterHandler(BaseHTTPRequestHandler):
    """
    OpenAI 相容 API HTTP 請求處理器 (Phase 2)。
    提供 /v1/models 與 /v1/chat/completions (支援一般 JSON 與 SSE 串流)。
    """

    server: "WebBrainServer"

    def log_message(self, format: str, *args: Any) -> None:
        """根據 verbose 設定決定是否輸出日誌"""
        if getattr(self.server, "verbose", False):
            super().log_message(format, *args)

    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

    def _send_json_response(self, status_code: int, data: Dict[str, Any]) -> None:
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self) -> None:
        """處理 CORS 預檢請求"""
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        """處理 GET 請求: /health, /v1/models, /v1/pool, /v1/sessions"""
        parsed_path = self.path.split("?")[0].rstrip("/")
        if parsed_path in ("", "/health"):
            bridge_connected = self.server.bridge.is_connected() if self.server.bridge else False
            target_info = None
            if self.server.bridge and self.server.bridge.target:
                t = self.server.bridge.target
                target_info = {"id": t.id, "title": t.title, "url": t.url}
            pool = getattr(self.server, "tab_pool", None)
            self._send_json_response(200, {
                "status": "ok",
                "service": "web-brain-bridge",
                "phase": 4,
                "bridge_connected": bridge_connected,
                "target": target_info,
                "pool_tabs": pool.get_telemetry()["total_tabs"] if pool else 0
            })
        elif parsed_path == "/v1/models":
            models_data = [
                {
                    "id": "deepseek-chat",
                    "object": "model",
                    "created": 1700000000,
                    "owned_by": "web-brain-bridge",
                    "permission": [],
                    "root": "deepseek-chat",
                    "parent": None
                },
                {
                    "id": "deepseek-reasoner",
                    "object": "model",
                    "created": 1700000000,
                    "owned_by": "web-brain-bridge",
                    "permission": [],
                    "root": "deepseek-reasoner",
                    "parent": None
                }
            ]
            self._send_json_response(200, {
                "object": "list",
                "data": models_data
            })
        elif parsed_path in ("/v1/pool", "/pool"):
            pool = getattr(self.server, "tab_pool", None)
            if pool:
                self._send_json_response(200, pool.get_telemetry())
            else:
                self._send_json_response(503, {
                    "error": {
                        "message": "Tab pool not configured on server",
                        "type": "server_error",
                        "code": "pool_not_configured"
                    }
                })
        elif parsed_path in ("/v1/sessions", "/sessions"):
            sm = getattr(self.server, "session_manager", None)
            if sm:
                self._send_json_response(200, {"sessions": sm.list_sessions()})
            else:
                self._send_json_response(503, {
                    "error": {
                        "message": "Session manager not configured on server",
                        "type": "server_error",
                        "code": "session_manager_not_configured"
                    }
                })
        else:
            self._send_json_response(404, {
                "error": {
                    "message": f"Path not found: {self.path}",
                    "type": "invalid_request_error",
                    "code": "resource_not_found"
                }
            })

    def do_POST(self) -> None:
        """處理 POST 請求: /v1/chat/completions, /v1/sessions/new"""
        parsed_path = self.path.split("?")[0].rstrip("/")

        # 會話建立端點 (Phase 4)
        if parsed_path in ("/v1/sessions/new", "/sessions/new"):
            sm = getattr(self.server, "session_manager", None)
            if sm:
                new_session_id = sm.create_session()
                self._send_json_response(200, {
                    "session_id": new_session_id,
                    "status": "created"
                })
            else:
                self._send_json_response(503, {
                    "error": {
                        "message": "Session manager not configured",
                        "type": "server_error",
                        "code": "session_manager_not_configured"
                    }
                })
            return

        if parsed_path not in ("/v1/chat/completions", "/chat/completions"):
            self._send_json_response(404, {
                "error": {
                    "message": f"Path not found: {self.path}",
                    "type": "invalid_request_error",
                    "code": "resource_not_found"
                }
            })
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length)
            body = json.loads(raw_body.decode("utf-8")) if raw_body else {}
        except Exception as e:
            self._send_json_response(400, {
                "error": {
                    "message": f"Invalid JSON body: {str(e)}",
                    "type": "invalid_request_error",
                    "code": "bad_json"
                }
            })
            return

        messages = body.get("messages", [])
        if not messages or not isinstance(messages, list):
            self._send_json_response(400, {
                "error": {
                    "message": "Field 'messages' is required and must be a non-empty list",
                    "type": "invalid_request_error",
                    "code": "missing_messages"
                }
            })
            return

        model = body.get("model", "deepseek-chat")
        stream = bool(body.get("stream", False))

        # Phase 4 會話隔離與分頁池排程
        session_id = self.headers.get("X-Session-ID") or body.get("session_id")
        tab_pool: Optional[CDPTabPool] = getattr(self.server, "tab_pool", None)
        session_manager: Optional[SessionManager] = getattr(self.server, "session_manager", None)

        leased_tab: Optional[PooledTab] = None
        if tab_pool:
            leased_tab = tab_pool.acquire(session_id=session_id, timeout=30.0)
            if not leased_tab:
                self._send_json_response(503, {
                    "error": {
                        "message": "Tab pool exhausted: all browser tabs are currently busy and queue request timed out",
                        "type": "server_error",
                        "code": "tab_pool_exhausted"
                    }
                })
                return
            bridge = leased_tab.bridge
            if session_manager and session_id:
                session_manager.touch_session(session_id, leased_tab.tab_id)
        else:
            bridge = self.server.bridge

        if not bridge:
            if tab_pool and leased_tab:
                tab_pool.release(leased_tab)
            self._send_json_response(503, {
                "error": {
                    "message": "WebBrainBridge instance not configured on server",
                    "type": "server_error",
                    "code": "bridge_unavailable"
                }
            })
            return

        if not bridge.is_connected():
            connected = bridge.connect()
            if not connected and not bridge.mock_mode:
                if tab_pool and leased_tab:
                    tab_pool.release(leased_tab)
                self._send_json_response(503, {
                    "error": {
                        "message": f"Failed to connect to CDP target at {bridge.host}:{bridge.port}. Ensure browser is open with debugging port.",
                        "type": "server_error",
                        "code": "cdp_connection_failed"
                    }
                })
                return

        prompt = format_messages_to_prompt(messages)
        try:
            inj_res = bridge.inject_prompt(prompt)
            if not inj_res.get("success", False):
                self._send_json_response(500, {
                    "error": {
                        "message": f"Failed to inject prompt into target DOM: {inj_res.get('reason', 'unknown')}",
                        "type": "server_error",
                        "code": "prompt_injection_failed"
                    }
                })
                return

            req_id = f"chatcmpl-{int(time.time() * 1000)}-{os.urandom(4).hex()}"
            created_ts = int(time.time())

            if stream:
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream; charset=utf-8")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Connection", "keep-alive")
                self._send_cors_headers()
                self.end_headers()

                # 首訊框角色宣告
                first_chunk = {
                    "id": req_id,
                    "object": "chat.completion.chunk",
                    "created": created_ts,
                    "model": model,
                    "choices": [
                        {
                            "index": 0,
                            "delta": {"role": "assistant", "content": ""},
                            "finish_reason": None
                        }
                    ]
                }
                self.wfile.write(f"data: {json.dumps(first_chunk, ensure_ascii=False)}\n\n".encode("utf-8"))
                self.wfile.flush()

                full_content_parts: List[str] = []
                dsml_mode = False
                streamed_clean_len = 0

                for chunk_data in bridge.stream_response():
                    delta_text = chunk_data.get("delta", "")
                    think_text = chunk_data.get("thinking_delta", "")
                    is_done = chunk_data.get("done", False)

                    if delta_text:
                        full_content_parts.append(delta_text)
                        accum_text = "".join(full_content_parts)
                        if not dsml_mode and re.search(r"<\s*(?:\uff5c|\|)?\s*(?:\uff5c|\|)?\s*DSML", accum_text, re.IGNORECASE):
                            dsml_mode = True

                    # 只要尚未偵測到 DSML，就正常串流純文字與思考內容
                    if not dsml_mode and delta_text:
                        delta_payload: Dict[str, Any] = {"content": delta_text}
                        if think_text:
                            delta_payload["reasoning_content"] = think_text
                        chunk_msg = {
                            "id": req_id,
                            "object": "chat.completion.chunk",
                            "created": created_ts,
                            "model": model,
                            "choices": [
                                {
                                    "index": 0,
                                    "delta": delta_payload,
                                    "finish_reason": None
                                }
                            ]
                        }
                        self.wfile.write(f"data: {json.dumps(chunk_msg, ensure_ascii=False)}\n\n".encode("utf-8"))
                        self.wfile.flush()
                        streamed_clean_len += len(delta_text)
                    elif think_text:
                        # DSML 模式下仍持續串流思考過程
                        chunk_msg = {
                            "id": req_id,
                            "object": "chat.completion.chunk",
                            "created": created_ts,
                            "model": model,
                            "choices": [
                                {
                                    "index": 0,
                                    "delta": {"reasoning_content": think_text},
                                    "finish_reason": None
                                }
                            ]
                        }
                        self.wfile.write(f"data: {json.dumps(chunk_msg, ensure_ascii=False)}\n\n".encode("utf-8"))
                        self.wfile.flush()

                    if is_done:
                        break

                full_raw_text = "".join(full_content_parts)
                clean_content, tool_calls, finish_reason = parse_dsml_tool_calls(full_raw_text)

                if finish_reason == "tool_calls" and tool_calls:
                    # 若在 DSML 區塊前有未串流完畢的前置文字，補發 content delta
                    if clean_content and len(clean_content) > streamed_clean_len:
                        rem_text = clean_content[streamed_clean_len:]
                        pre_chunk = {
                            "id": req_id,
                            "object": "chat.completion.chunk",
                            "created": created_ts,
                            "model": model,
                            "choices": [
                                {
                                    "index": 0,
                                    "delta": {"content": rem_text},
                                    "finish_reason": None
                                }
                            ]
                        }
                        self.wfile.write(f"data: {json.dumps(pre_chunk, ensure_ascii=False)}\n\n".encode("utf-8"))
                        self.wfile.flush()

                    # 發送 tool_calls 結構訊框
                    tc_chunk = {
                        "id": req_id,
                        "object": "chat.completion.chunk",
                        "created": created_ts,
                        "model": model,
                        "choices": [
                            {
                                "index": 0,
                                "delta": {
                                    "tool_calls": tool_calls
                                },
                                "finish_reason": None
                            }
                        ]
                    }
                    self.wfile.write(f"data: {json.dumps(tc_chunk, ensure_ascii=False)}\n\n".encode("utf-8"))
                    self.wfile.flush()

                    # 工具呼叫結束訊框
                    final_chunk = {
                        "id": req_id,
                        "object": "chat.completion.chunk",
                        "created": created_ts,
                        "model": model,
                        "choices": [
                            {
                                "index": 0,
                                "delta": {},
                                "finish_reason": "tool_calls"
                            }
                        ]
                    }
                    self.wfile.write(f"data: {json.dumps(final_chunk, ensure_ascii=False)}\n\n".encode("utf-8"))
                    self.wfile.write(b"data: [DONE]\n\n")
                    self.wfile.flush()

                else:
                    # 一般非工具呼叫結束
                    if dsml_mode and full_raw_text and len(full_raw_text) > streamed_clean_len:
                        rem_text = full_raw_text[streamed_clean_len:]
                        rem_chunk = {
                            "id": req_id,
                            "object": "chat.completion.chunk",
                            "created": created_ts,
                            "model": model,
                            "choices": [
                                {
                                    "index": 0,
                                    "delta": {"content": rem_text},
                                    "finish_reason": None
                                }
                            ]
                        }
                        self.wfile.write(f"data: {json.dumps(rem_chunk, ensure_ascii=False)}\n\n".encode("utf-8"))
                        self.wfile.flush()

                    final_chunk = {
                        "id": req_id,
                        "object": "chat.completion.chunk",
                        "created": created_ts,
                        "model": model,
                        "choices": [
                            {
                                "index": 0,
                                "delta": {},
                                "finish_reason": "stop"
                            }
                        ]
                    }
                    self.wfile.write(f"data: {json.dumps(final_chunk, ensure_ascii=False)}\n\n".encode("utf-8"))
                    self.wfile.write(b"data: [DONE]\n\n")
                    self.wfile.flush()

                self.close_connection = True

            else:
                full_content_parts = []
                full_thinking_parts = []
                for chunk_data in bridge.stream_response():
                    if chunk_data.get("delta"):
                        full_content_parts.append(chunk_data["delta"])
                    if chunk_data.get("thinking_delta"):
                        full_thinking_parts.append(chunk_data["thinking_delta"])
                    if chunk_data.get("done"):
                        break

                full_raw_content = "".join(full_content_parts)
                full_thinking = "".join(full_thinking_parts)
                prompt_tokens = max(1, len(prompt) // 4)
                completion_tokens = max(1, len(full_raw_content) // 4)

                clean_content, tool_calls, finish_reason = parse_dsml_tool_calls(full_raw_content)

                message_payload: Dict[str, Any] = {
                    "role": "assistant",
                    "content": clean_content
                }
                if tool_calls:
                    message_payload["tool_calls"] = tool_calls
                if full_thinking:
                    message_payload["reasoning_content"] = full_thinking

                resp_data = {
                    "id": req_id,
                    "object": "chat.completion",
                    "created": created_ts,
                    "model": model,
                    "choices": [
                        {
                            "index": 0,
                            "message": message_payload,
                            "finish_reason": finish_reason
                        }
                    ],
                    "usage": {
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": completion_tokens,
                        "total_tokens": prompt_tokens + completion_tokens
                    }
                }
                self._send_json_response(200, resp_data)
        finally:
            if tab_pool and leased_tab:
                tab_pool.release(leased_tab, keep_session=True)


# ---------------------------------------------------------------------------
# Cross-Process Tab Router & Cache (平鋪解耦子模組引入與 100% 向後相容導出)
# ---------------------------------------------------------------------------

try:
    from web_brain_router import (
        CrossProcessTabRouter,
        LOCK_BASE_DIR,
        CONFIG_FILE_PATH,
        get_selected_provider,
        set_selected_provider,
        is_pid_alive,
    )
except ImportError:
    from scripts.web_brain_router import (
        CrossProcessTabRouter,
        LOCK_BASE_DIR,
        CONFIG_FILE_PATH,
        get_selected_provider,
        set_selected_provider,
        is_pid_alive,
    )

try:
    from web_brain_cache import (
        WebBrainCache,
        CacheEntry,
        get_brain_cache,
    )
except ImportError:
    from scripts.web_brain_cache import (
        WebBrainCache,
        CacheEntry,
        get_brain_cache,
    )


class WebBrainServer:
    """
    OpenAI 相容 HTTP 伺服器容器。
    支援背景執行緒啟動、多標籤分頁池調度與優雅關閉。
    """
    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 8000,
        bridge: Optional[WebBrainBridge] = None,
        tab_pool: Optional[CDPTabPool] = None,
        max_tabs: int = 4,
        verbose: bool = False
    ):
        self.host = host
        self.port = port
        self.bridge = bridge or WebBrainBridge()
        self.tab_pool = tab_pool or CDPTabPool(
            host=self.bridge.host,
            port=self.bridge.port,
            max_tabs=max_tabs,
            mock_mode=self.bridge.mock_mode
        )
        self.session_manager = SessionManager(self.tab_pool)
        self.verbose = verbose
        self._httpd: Optional[ThreadingHTTPServer] = None
        self._thread: Optional[threading.Thread] = None
        self._running = False

    def start(self, background: bool = False) -> None:
        """啟動轉接伺服器"""
        self._httpd = ThreadingHTTPServer((self.host, self.port), OpenAIAdapterHandler)
        self._httpd.bridge = self.bridge  # type: ignore
        self._httpd.tab_pool = self.tab_pool  # type: ignore
        self._httpd.session_manager = self.session_manager  # type: ignore
        self._httpd.verbose = self.verbose  # type: ignore
        self.port = self._httpd.server_port
        self._running = True

        # 初始化分頁池
        if self.tab_pool:
            self.tab_pool.initialize()

        if background:
            self._thread = threading.Thread(target=self._httpd.serve_forever, daemon=True)
            self._thread.start()
        else:
            try:
                self._httpd.serve_forever()
            except KeyboardInterrupt:
                pass
            finally:
                self.stop()

    def stop(self) -> None:
        """停止伺服器"""
        self._running = False
        if self._httpd:
            try:
                self._httpd.shutdown()
                self._httpd.server_close()
            except Exception:
                pass
            self._httpd = None
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
            self._thread = None
        if self.tab_pool:
            self.tab_pool.close_all()
        if self.bridge:
            self.bridge.disconnect()

    @property
    def is_running(self) -> bool:
        return self._running and self._httpd is not None

    @property
    def endpoint_url(self) -> str:
        return f"http://{self.host}:{self.port}"


# ---------------------------------------------------------------------------
# CLI 與自檢命令
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="WebBrainBridge - CDP 瀏覽器通訊適配器 (Phase 1, Phase 2 & Phase 4)")
    parser.add_argument("--host", default="127.0.0.1", help="CDP Host (預設: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=9222, help="CDP Port (預設: 9222)")
    parser.add_argument("--list-targets", action="store_true", help="列出當前所有瀏覽器 Target 分頁")
    parser.add_argument("--mock", action="store_true", help="啟用 Mock 離線模擬測試模式")
    parser.add_argument("--prompt", "-p", type=str, help="注入 Prompt 並提取回答")
    parser.add_argument("--stream", action="store_true", help="以串流方式印出回答增量")
    parser.add_argument("--serve", action="store_true", help="啟動 OpenAI 相容轉接伺服器 (Phase 2 & Phase 4)")
    parser.add_argument("--server-host", default="127.0.0.1", help="轉接伺服器監聽 IP (預設: 127.0.0.1)")
    parser.add_argument("--server-port", type=int, default=8000, help="轉接伺服器監聽 Port (預設: 8000)")
    parser.add_argument("--max-tabs", type=int, default=4, help="分頁池最大分頁數 (預設: 4)")
    parser.add_argument("--verbose", "-v", action="store_true", help="顯示詳細日誌")
    parser.add_argument("--self-test", action="store_true", help="執行內部自檢驗證 (Phase 1, Phase 2 & Phase 4)")

    args = parser.parse_args()
    bridge = WebBrainBridge(host=args.host, port=args.port, mock_mode=args.mock or args.self_test)

    if args.self_test:
        print("[WebBrainBridge] 執行 Phase 1 內建自檢...")
        targets = bridge.list_targets()
        assert len(targets) > 0, "Self-test: 無法取得 Target 清單"
        print(f"  ✔ Target Discovery 正常 (共 {len(targets)} 筆)")

        conn_ok = bridge.connect()
        assert conn_ok, "Self-test: 連線失敗"
        print("  ✔ CDP WebSocket 握手建連正常")

        # 斷線重連防禦自檢
        bridge.disconnect()
        assert not bridge.is_connected(), "Self-test: 中斷連線失敗"
        assert bridge.ensure_connected(), "Self-test: 自動重連 ensure_connected 失敗"
        print("  ✔ 斷線偵測與自動重連 (ensure_connected / reconnect) 正常")

        inj_res = bridge.inject_prompt("你好，請進行自檢回覆")
        assert inj_res.get("success"), "Self-test: Prompt 注入失敗"
        print("  ✔ Prompt DOM 注入腳本構建正常")

        chunks = list(bridge.stream_response())
        assert len(chunks) > 0, "Self-test: 串流提取無輸出"
        full_output = "".join(c["delta"] for c in chunks)
        print(f"  ✔ DOM 串流增量提取正常: '{full_output}'")
        bridge.disconnect()
        print("✔ [WebBrainBridge] Phase 1 所有自檢項目全數通過！")

        print("[WebBrainBridge] 執行 Phase 2 OpenAI 相容轉接服務自檢...")
        test_server = WebBrainServer(host="127.0.0.1", port=0, bridge=bridge, verbose=args.verbose)
        test_server.start(background=True)
        time.sleep(0.2)
        base_api = test_server.endpoint_url

        try:
            # 1. 測試 /health 端點
            req = urllib.request.Request(f"{base_api}/health")
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                health_data = json.loads(resp.read().decode("utf-8"))
                assert health_data.get("status") == "ok", "Self-test: /health 狀態不正確"
                print("  ✔ GET /health 端點健康檢查正常")

            # 2. 測試 /v1/models 端點
            req = urllib.request.Request(f"{base_api}/v1/models")
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                models_data = json.loads(resp.read().decode("utf-8"))
                assert "data" in models_data and len(models_data["data"]) >= 2, "Self-test: 模型清單異常"
                print(f"  ✔ GET /v1/models 正常 (支援 {[m['id'] for m in models_data['data']]})")

            # 3. 測試 /v1/chat/completions (非串流)
            chat_req_data = json.dumps({
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": "You are a helpful coding assistant."},
                    {"role": "user", "content": "測試非串流對話"}
                ],
                "stream": False
            }).encode("utf-8")
            req = urllib.request.Request(
                f"{base_api}/v1/chat/completions",
                data=chat_req_data,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                chat_resp = json.loads(resp.read().decode("utf-8"))
                assert "choices" in chat_resp and len(chat_resp["choices"]) > 0, "Self-test: 非串流回應異常"
                content = chat_resp["choices"][0]["message"]["content"]
                assert "Mock Brain Reply" in content, f"Self-test: 回應內容不相符: {content}"
                print(f"  ✔ POST /v1/chat/completions (非串流) 正常: '{content[:30]}...'")

            # 4. 測試 /v1/chat/completions (SSE 串流)
            stream_req_data = json.dumps({
                "model": "deepseek-reasoner",
                "messages": [{"role": "user", "content": "測試串流對話"}],
                "stream": True
            }).encode("utf-8")
            req = urllib.request.Request(
                f"{base_api}/v1/chat/completions",
                data=stream_req_data,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                data_lines = []
                while True:
                    line = resp.readline().decode("utf-8")
                    if not line:
                        break
                    line_str = line.strip()
                    if line_str.startswith("data: "):
                        data_lines.append(line_str)
                    if "[DONE]" in line_str:
                        break
                assert any("[DONE]" in l for l in data_lines), "Self-test: SSE 串流未以 [DONE] 結尾"
                print(f"  ✔ POST /v1/chat/completions (SSE 串流) 正常 (收到 {len(data_lines)} 筆 SSE 事件)")

            # 5. 測試錯誤處理 (缺少 messages)
            bad_req_data = json.dumps({"model": "deepseek-chat"}).encode("utf-8")
            bad_req = urllib.request.Request(
                f"{base_api}/v1/chat/completions",
                data=bad_req_data,
                headers={"Content-Type": "application/json"}
            )
            try:
                urllib.request.urlopen(bad_req, timeout=3.0)
                assert False, "Self-test: 預期 400 錯誤但未拋出"
            except urllib.error.HTTPError as e:
                assert e.code == 400, f"Self-test: 預期 HTTP 400，實際為 {e.code}"
                print("  ✔ 邊界防禦與 400 錯誤檢驗正常")

            print("✔ [WebBrainBridge] Phase 1 & Phase 2 所有自檢項目全數通過！")

            # Phase 4 自檢
            print("[WebBrainBridge] 執行 Phase 4 分頁池與會話隔離 (CDPTabPool & SessionManager) 自檢...")
            test_pool = CDPTabPool(host="127.0.0.1", port=9222, max_tabs=2, mock_mode=True)
            init_count = test_pool.initialize()
            assert init_count == 2, f"Self-test: 分頁池初始化失敗 (預期 2，實際 {init_count})"
            print(f"  ✔ CDPTabPool 初始化成功 (共託管 {init_count} 個 Mock 分頁)")

            tab_a = test_pool.acquire(session_id="sess_alpha", timeout=2.0)
            assert tab_a is not None and tab_a.in_use, "Self-test: 分頁 A 租借失敗"
            assert tab_a.session_id == "sess_alpha", "Self-test: session_id 綁定失敗"

            tab_b = test_pool.acquire(session_id="sess_beta", timeout=2.0)
            assert tab_b is not None and tab_b.in_use, "Self-test: 分頁 B 租借失敗"
            assert tab_b.tab_id != tab_a.tab_id, "Self-test: 並行分頁衝突，未取得不同分頁"
            print("  ✔ 分頁池並行租借與實體隔離正常")

            # 佇列超時防禦
            tab_c = test_pool.acquire(session_id="sess_gamma", timeout=0.2)
            assert tab_c is None, "Self-test: 預期池滿超時回傳 None"
            print("  ✔ 分頁池耗盡排隊超時防禦正常")

            # 歸還與 Sticky Session 路由
            test_pool.release(tab_a, keep_session=True)
            assert not tab_a.in_use, "Self-test: 歸還後狀態未翻轉為閒置"
            tab_a_reacquired = test_pool.acquire(session_id="sess_alpha", timeout=2.0)
            assert tab_a_reacquired.tab_id == tab_a.tab_id, "Self-test: Sticky Session 路由失敗"
            test_pool.release(tab_a_reacquired)
            test_pool.release(tab_b)
            print("  ✔ 會話黏滯性 (Sticky Session) 路由正常")

            # 會話管理器 (SessionManager) 與 New Chat
            sm = SessionManager(test_pool)
            s_id = sm.create_session()
            sm.touch_session(s_id, tab_a.tab_id)
            assert sm.get_session(s_id) is not None, "Self-test: 查詢會話失敗"
            assert sm.close_session(s_id), "Self-test: 關閉會話失敗"
            test_pool.close_all()
            print("  ✔ SessionManager 會話生命週期與重置正常")
            print("✔ [WebBrainBridge] Phase 1, Phase 2 & Phase 4 所有自檢項目全數通過！")
            return 0
        finally:
            test_server.stop()

    if args.serve:
        server = WebBrainServer(
            host=args.server_host,
            port=args.server_port,
            bridge=bridge,
            max_tabs=args.max_tabs,
            verbose=args.verbose
        )
        print(f"============================================================")
        print(f" 🧠 WebBrainBridge OpenAI 相容服務 (Phase 2 & Phase 4)")
        print(f"============================================================")
        print(f"  監聽端點: {server.endpoint_url}")
        print(f"  CDP 瀏覽器目標: {bridge.endpoint_url} (Mock 模式: {bridge.mock_mode})")
        print(f"  分頁池上限: {args.max_tabs} 標籤頁")
        print(f"  相容端點:")
        print(f"    - GET  /v1/models")
        print(f"    - POST /v1/chat/completions (串流 / 非串流 / X-Session-ID 隔離)")
        print(f"    - GET  /v1/pool")
        print(f"    - GET  /v1/sessions")
        print(f"    - POST /v1/sessions/new")
        print(f"    - GET  /health")
        print(f"  按下 Ctrl+C 可停止服務。")
        print(f"============================================================")
        server.start(background=False)
        return 0

    if args.list_targets:
        targets = bridge.list_targets()
        print(f"探測到 {len(targets)} 個瀏覽器 Target:")
        for idx, t in enumerate(targets):
            ai_flag = f" [{t.detect_provider().upper()}]" if t.is_ai_target() else ""
            print(f"  [{idx + 1}] {t.title[:30]} ({t.url[:45]}...){ai_flag}")
            print(f"      WS: {t.web_socket_debugger_url}")
        return 0

    if args.prompt:
        if not bridge.connect():
            print(f"❌ 無法連線至 CDP 端口 {args.host}:{args.port}。請確認瀏覽器已啟動 --remote-debugging-port={args.port}")
            return 1
        print(f"✔ 成功連線 Target: {bridge.target.title if bridge.target else '未知'}")
        print(f"正在注入 Prompt: '{args.prompt}'...")
        bridge.inject_prompt(args.prompt)

        if args.stream:
            print("--- 開始串流接收 ---")
            for chunk in bridge.stream_response():
                if chunk["delta"]:
                    sys.stdout.write(chunk["delta"])
                    sys.stdout.flush()
            print("\n--- 接收完畢 ---")
        else:
            print("等待回答完成...")
            time.sleep(2.0)
            res = bridge.extract_dom_snapshot()
            print("回答內容:")
            print(res.get("response_text", ""))
        bridge.disconnect()
        return 0

    parser.print_help()
    return 0

    if args.serve:
        server = WebBrainServer(
            host=args.server_host,
            port=args.server_port,
            bridge=bridge,
            verbose=args.verbose
        )
        print(f"============================================================")
        print(f" 🧠 WebBrainBridge OpenAI 相容服務 (Phase 2)")
        print(f"============================================================")
        print(f"  監聽端點: {server.endpoint_url}")
        print(f"  CDP 瀏覽器目標: {bridge.endpoint_url} (Mock 模式: {bridge.mock_mode})")
        print(f"  相容端點:")
        print(f"    - GET  /v1/models")
        print(f"    - POST /v1/chat/completions (串流 / 非串流)")
        print(f"    - GET  /health")
        print(f"  按下 Ctrl+C 可停止服務。")
        print(f"============================================================")
        server.start(background=False)
        return 0

    if args.list_targets:
        targets = bridge.list_targets()
        print(f"探測到 {len(targets)} 個瀏覽器 Target:")
        for idx, t in enumerate(targets):
            ai_flag = f" [{t.detect_provider().upper()}]" if t.is_ai_target() else ""
            print(f"  [{idx + 1}] {t.title[:30]} ({t.url[:45]}...){ai_flag}")
            print(f"      WS: {t.web_socket_debugger_url}")
        return 0

    if args.prompt:
        if not bridge.connect():
            print(f"❌ 無法連線至 CDP 端口 {args.host}:{args.port}。請確認瀏覽器已啟動 --remote-debugging-port={args.port}")
            return 1
        print(f"✔ 成功連線 Target: {bridge.target.title if bridge.target else '未知'}")
        print(f"正在注入 Prompt: '{args.prompt}'...")
        bridge.inject_prompt(args.prompt)

        if args.stream:
            print("--- 開始串流接收 ---")
            for chunk in bridge.stream_response():
                if chunk["delta"]:
                    sys.stdout.write(chunk["delta"])
                    sys.stdout.flush()
            print("\n--- 接收完畢 ---")
        else:
            print("等待回答完成...")
            time.sleep(2.0)
            res = bridge.extract_dom_snapshot()
            print("回答內容:")
            print(res.get("response_text", ""))
        bridge.disconnect()
        return 0

    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
