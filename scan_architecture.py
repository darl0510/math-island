# -*- coding: utf-8 -*-
"""
🏛️ 專案平鋪架構與代碼健康度自動掃描引擎 (Universal Architecture Scanner & Server)
職責說明:
- 專職掃描專案代碼架構、物理行數、健康百分比與公開符號 (Symbols)。
- 支援動態發現磁碟中任何「全新建立的模組檔案」，自動歸類並納入即時健康監控。
- 支援讀取 architecture_config.json 專案自訂規格；若無配置檔則啟用智慧通用啟發式推論。
- 具備獨立輕量級 Local HTTP 微服務 (5055 port)，提供 /api/architecture_stats、
  /api/scan_redundant_files 與 /api/clean_redundant_files API 端點與雙擊開啟。
- 支援作為函式庫導入 (供 Flask 藍圖或外部測試直接調用)，零外部套件相依 (純標準庫)。
"""

import os
import sys
import re
import ast
import json
import socket
import socketserver
import http.server
import urllib.parse
import urllib.request
import subprocess
import webbrowser
import threading
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "architecture_config.json")
OUTPUT_JS_FILE = os.path.join(BASE_DIR, "architecture_data.js")

# 忽略掃描目錄
EXCLUDE_DIRS = {
    ".git", ".agents", ".gemini", "venv", ".venv", "env", "node_modules",
    "__pycache__", "backups", "token_and_backup_toolkit", "dist", "build",
    ".pytest_cache", ".idea", ".vscode"
}

# 忽略特定無關或過渡檔案
EXCLUDE_FILES = {
    "setup.py"
}


def extract_symbols_from_file(file_path, max_symbols=8):
    """自 Python 檔案安全抽取頂層類別與函式名稱 (AST 優先，正則降級防禦)"""
    symbols = []
    if not os.path.exists(file_path):
        return symbols
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        # 1. 嘗試 AST 解析
        try:
            tree = ast.parse(content)
            for node in tree.body:
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    if not node.name.startswith("__"):
                        symbols.append(node.name)
                elif isinstance(node, ast.ClassDef):
                    symbols.append(node.name)
                if len(symbols) >= max_symbols:
                    break
        except Exception:
            # 2. 正則表達式降級防禦
            pattern = re.compile(r'^(?:def|class)\s+([a-zA-Z0-9_]+)', re.MULTILINE)
            matches = pattern.findall(content)
            symbols = [m for m in matches if not m.startswith("__")][:max_symbols]
    except Exception:
        pass
    return symbols


def guess_category_and_role(fname):
    """智慧啟發式推論未在設定檔登記之新增模組分類與角色"""
    lower = fname.lower()
    if lower.startswith("test_"):
        return ("test", "🧪 測試驗證模組", "🧪 單元與整合測試套件", 1500)
    elif lower.endswith("_routes.py") or lower in ("app.py", "compat.py", "main.py", "server.py"):
        return ("web_entry", "🌐 Web 入口與藍圖", "🌐 Web 路由與入口模組", 850)
    elif lower.startswith("flex_") or "template" in lower or "ui" in lower or "view" in lower:
        return ("flex_layer", "🎨 視圖與介面層", "🎨 視覺與卡片樣板模組", 1200)
    elif lower.endswith("_service.py") or "service" in lower or lower in ("bot_state.py", "db_service.py", "geo_service.py"):
        return ("service", "⚡ 核心服務引擎", "⚡ 專案核心業務服務", 1000)
    elif (lower.startswith("scan_") or lower.startswith("sync_") or lower.startswith("auto_") or
          lower.startswith("package_") or lower.startswith("cleanup_") or lower.startswith("deploy_")):
        return ("toolkit", "🛠️ 運維自動化工具", "🛠️ 運維自動化與工具鏈", 800)
    else:
        return ("custom", "📦 專案核心模組", "📦 專案自訂業務模組", 1000)


def scan_project_architecture(project_dir=None):
    """
    📊 執行專案全模組即時架構動態掃描
    - 遍歷讀取磁碟實際物理行數
    - 自動探測未登記的新增 .py 檔案並納入
    - 計算整體健康度指標
    """
    p_dir = project_dir or BASE_DIR
    cfg_path = os.path.join(p_dir, "architecture_config.json")

    config = {}
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                config = json.load(f)
        except Exception as e:
            print(f"⚠️ 讀取 architecture_config.json 失敗: {e}")

    project_name = config.get("project_name", os.path.basename(p_dir))
    configured_modules = config.get("modules", [])
    configured_map = {m["fname"]: m for m in configured_modules if "fname" in m}

    # 1. 探測專案根目錄下所有 .py 檔案
    disk_py_files = set()
    try:
        for item in os.listdir(p_dir):
            if item.endswith(".py") and item not in EXCLUDE_FILES and not item.startswith("."):
                fpath = os.path.join(p_dir, item)
                if os.path.isfile(fpath):
                    disk_py_files.add(item)
    except Exception as e:
        print(f"⚠️ 掃描專案目錄失敗: {e}")

    modules_res = []
    seen_fnames = set()

    # 2. 處理已在設定檔中登記的模組（保持原配置順序）
    for m in configured_modules:
        fname = m["fname"]
        seen_fnames.add(fname)
        fpath = os.path.join(p_dir, fname)
        lines = 0
        if os.path.exists(fpath):
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    lines = len(f.readlines())
            except Exception:
                pass

        symbols = m.get("symbols", [])
        if not symbols and os.path.exists(fpath):
            symbols = extract_symbols_from_file(fpath)

        modules_res.append({
            "fname": fname,
            "cat": m.get("cat", "service"),
            "catName": m.get("catName", "⚡ 核心服務引擎"),
            "role": m.get("role", "專案模組"),
            "lines": lines,
            "limit": m.get("limit", 1000),
            "desc": m.get("desc", ""),
            "symbols": symbols,
            "governance": m.get("governance", ""),
            "is_dynamic": False
        })

    # 3. 🌟【自動動態發現】：將磁碟存在但尚未在設定檔登記的新檔案加入掃描清單！
    for fname in sorted(disk_py_files):
        if fname not in seen_fnames:
            fpath = os.path.join(p_dir, fname)
            lines = 0
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    lines = len(f.readlines())
            except Exception:
                pass

            cat, cat_name, role, limit = guess_category_and_role(fname)
            symbols = extract_symbols_from_file(fpath)
            modules_res.append({
                "fname": fname,
                "cat": cat,
                "catName": cat_name,
                "role": f"🆕 {role}",
                "lines": lines,
                "limit": limit,
                "desc": f"動態掃描自動納入之模組，實時監控代碼健康度。",
                "symbols": symbols,
                "governance": "自動感知並即時納入平鋪架構監控體系。",
                "is_dynamic": True
            })
            seen_fnames.add(fname)

    # 4. 探測專案版本號與入口檔案行數
    ver = "latest"
    try:
        from auto_backup import get_current_version_str
        ver = get_current_version_str() or ver
    except Exception:
        handover_p = os.path.join(p_dir, "PROJECT_HANDOVER.md")
        if os.path.exists(handover_p):
            try:
                with open(handover_p, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read(2500)
                    m_v = re.search(r"\(v(\d+\.\d+\.\d+.*?)\s*版\)", content)
                    if m_v:
                        ver = f"v{m_v.group(1)}"
            except Exception:
                pass

    entrypoint_candidate = config.get("entrypoint", "app.py")
    if entrypoint_candidate not in seen_fnames:
        for cand in ["app.py", "main.py", "server.py", "index.py"]:
            if cand in seen_fnames:
                entrypoint_candidate = cand
                break

    app_lines = 0
    for mod in modules_res:
        if mod["fname"] == entrypoint_candidate:
            app_lines = mod["lines"]
            break

    # 5. 計算總體統計指標
    total_lines = sum(m["lines"] for m in modules_res)
    total_files = len(modules_res)
    healthy_count = sum(1 for m in modules_res if (m["lines"] / max(m["limit"], 1)) <= 0.8)
    watch_count = sum(1 for m in modules_res if 0.8 < (m["lines"] / max(m["limit"], 1)) <= 1.0)
    alert_count = sum(1 for m in modules_res if (m["lines"] / max(m["limit"], 1)) > 1.0)

    # 收集分類清單
    categories_set = {}
    for m in modules_res:
        if m["cat"] not in categories_set:
            categories_set[m["cat"]] = m["catName"]

    categories_list = [{"id": k, "name": v} for k, v in categories_set.items()]

    result = {
        "status": "success",
        "project_name": project_name,
        "version": ver,
        "entrypoint": entrypoint_candidate,
        "app_lines": app_lines,
        "total_lines": total_lines,
        "total_files": total_files,
        "summary": {
            "total_lines": total_lines,
            "total_files": total_files,
            "healthy_count": healthy_count,
            "watch_count": watch_count,
            "alert_count": alert_count,
            "health_pct": round((healthy_count / max(total_files, 1)) * 100, 1)
        },
        "categories": categories_list,
        "modules": modules_res
    }
    return result


def export_architecture_js_snapshot(project_dir=None):
    """將當前架構數據匯出為 architecture_data.js，支援離線 file:// 模式雙擊開啟"""
    p_dir = project_dir or BASE_DIR
    data = scan_project_architecture(p_dir)
    js_path = os.path.join(p_dir, "architecture_data.js")
    try:
        with open(js_path, "w", encoding="utf-8") as f:
            f.write("// 本檔案由 scan_architecture.py 自動生成，供 architecture_dashboard.html 離線預載\n")
            f.write("window.ARCHITECTURE_LIVE_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n")
        return True
    except Exception as e:
        print(f"⚠️ 匯出 architecture_data.js 失敗: {e}")
        return False


# ==============================================================================
# 🌐 獨立微服務 HTTP Handler (零外部套件相依，支援即時 API 與網頁服務)
# ==============================================================================

class ArchitectureDashboardHTTPHandler(http.server.SimpleHTTPRequestHandler):
    """專職處理架構看板即時掃描、冗餘清理與靜態資產渲染之微服務 Handler"""

    def end_headers(self):
        # 允許跨來源請求 (CORS)，方便 file:// 或本地跨埠連線
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path in ("/", "/architecture", "/architecture_dashboard.html"):
            dash_path = os.path.join(BASE_DIR, "architecture_dashboard.html")
            if os.path.exists(dash_path):
                with open(dash_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            else:
                self.send_error(404, "architecture_dashboard.html not found")
                return

        elif path in ("/admin/manual", "/admin/guide", "/admin_guide.html", "/admin/admin_guide.html"):
            guide_path = os.path.join(BASE_DIR, "admin_guide.html")
            if os.path.exists(guide_path):
                with open(guide_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            else:
                self.send_error(404, "admin_guide.html not found")
                return

        elif path == "/health":
            cfg_name = os.path.basename(BASE_DIR)
            if os.path.exists(CONFIG_FILE):
                try:
                    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                        cfg_name = json.load(f).get("project_name", cfg_name)
                except Exception:
                    pass
            health_info = {
                "status": "ok",
                "service": "architecture_dashboard_server",
                "project_dir": os.path.normpath(BASE_DIR),
                "project_name": cfg_name
            }
            res_bytes = json.dumps(health_info, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(res_bytes)))
            self.end_headers()
            self.wfile.write(res_bytes)
            return

        elif path == "/api/architecture_stats":
            data = scan_project_architecture(BASE_DIR)
            res_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(res_bytes)))
            self.end_headers()
            self.wfile.write(res_bytes)
            return

        elif path == "/api/scan_redundant_files":
            try:
                from cleanup_service import scan_redundant_files
                data = scan_redundant_files(BASE_DIR)
            except Exception as e:
                data = {"status": "error", "message": str(e), "files": []}
            res_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(res_bytes)))
            self.end_headers()
            self.wfile.write(res_bytes)
            return

        # 靜態檔案預設回退
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/clean_redundant_files":
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                req_json = json.loads(body) if body else {}
                files = req_json.get("files", [])

                from cleanup_service import clean_redundant_files
                data, code = clean_redundant_files(files, BASE_DIR)
            except Exception as e:
                data = {"status": "error", "message": str(e)}
                code = 500

            res_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(res_bytes)))
            self.end_headers()
            self.wfile.write(res_bytes)
            return

        self.send_error(404, "Endpoint not found")


def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0


def is_server_for_this_project(port, project_dir=BASE_DIR) -> bool:
    """檢查佔用 port 的微服務是否屬於當前專案"""
    norm_target = os.path.normpath(project_dir).lower()
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{port}/health", headers={"User-Agent": "Antigravity-Probe"})
        with urllib.request.urlopen(req, timeout=1.2) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                srv_dir = data.get("project_dir")
                if srv_dir and os.path.normpath(srv_dir).lower() == norm_target:
                    return True
                # 若對端未提供 project_dir (相容舊版)，比對 /api/architecture_stats 中的 project_name
                if not srv_dir:
                    req2 = urllib.request.Request(f"http://127.0.0.1:{port}/api/architecture_stats", headers={"User-Agent": "Antigravity-Probe"})
                    with urllib.request.urlopen(req2, timeout=1.2) as resp2:
                        data2 = json.loads(resp2.read().decode("utf-8"))
                        p_name = data2.get("project_name")
                        cfg_name = os.path.basename(project_dir)
                        if os.path.exists(CONFIG_FILE):
                            try:
                                with open(CONFIG_FILE, "r", encoding="utf-8") as cf:
                                    cfg_name = json.load(cf).get("project_name", cfg_name)
                            except Exception:
                                pass
                        if p_name and p_name == cfg_name:
                            return True
    except Exception:
        pass
    return False


def is_server_alive(port=5055) -> bool:
    """檢查微服務是否不僅佔用 port，且能正常回應 HTTP 請求"""
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{port}/health", headers={"User-Agent": "Antigravity-Probe"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("service") in ("architecture_dashboard_server", "antigravity_token_server"):
                    return True
    except Exception:
        pass
    try:
        req2 = urllib.request.Request(f"http://127.0.0.1:{port}/api/architecture_stats", headers={"User-Agent": "Antigravity-Probe"})
        with urllib.request.urlopen(req2, timeout=1.5) as resp2:
            return resp2.status == 200
    except Exception:
        pass
    return False


def _kill_process_on_port(port):
    """清理佔用指定 port 的無響應殭屍進程"""
    try:
        if sys.platform == "win32":
            p = subprocess.run(f'netstat -ano | findstr :{port}', shell=True, capture_output=True, text=True)
            out = p.stdout or ""
            pids = set()
            for line in out.strip().splitlines():
                parts = line.strip().split()
                if len(parts) >= 5 and f":{port}" in parts[1] and parts[3] == "LISTENING":
                    pids.add(parts[4])
            current_pid = str(os.getpid())
            for pid in pids:
                if pid and pid != current_pid and pid != "0":
                    print(f"⚠️ 正在清理佔用 port {port} 的無響應殘留進程 (PID {pid})...")
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
            time.sleep(0.5)
    except Exception:
        pass


def _safe_open_browser(url):
    """跨平台安全喚起瀏覽器 (Windows 原生 start 指令優先防禦)"""
    try:
        if sys.platform == "win32":
            os.system(f'start "" "{url}"')
            return
    except Exception:
        pass
    try:
        webbrowser.open(url)
    except Exception:
        pass


def start_server(port=5055, open_browser=True):
    """啟動獨立架構掃描看板伺服器 (具備跨專案智慧埠號隔離與身分防串線機制)"""
    export_architecture_js_snapshot(BASE_DIR)

    # 🌟 優先探測開發者總控中心微服務 (Port 8765) 是否已在運行 (且必須屬於本專案)
    try:
        req = urllib.request.Request("http://127.0.0.1:8765/health", headers={"User-Agent": "Antigravity-Probe"})
        with urllib.request.urlopen(req, timeout=1.2) as resp:
            if resp.status == 200:
                h_data = json.loads(resp.read().decode("utf-8"))
                if h_data.get("service") == "antigravity_token_server":
                    srv_proj = h_data.get("project_dir", "")
                    if srv_proj and os.path.normpath(srv_proj).lower() == os.path.normpath(BASE_DIR).lower():
                        dashboard_url = "http://127.0.0.1:8765/architecture_dashboard.html"
                        print("💡 偵測到本專案之開發者總控中心微服務已在運行中 (http://127.0.0.1:8765/)！")
                        print(f"🚀 為您無縫開啟平鋪架構健康看板: {dashboard_url}")
                        if open_browser:
                            _safe_open_browser(dashboard_url)
                            time.sleep(0.5)
                        return
    except Exception:
        pass

    # 🔍 智慧多專案埠號解析：檢測 5055 ~ 5065 區間
    selected_port = None
    for candidate_port in range(port, port + 10):
        if not is_port_in_use(candidate_port):
            selected_port = candidate_port
            break
        else:
            # 埠號已被佔用：檢查是否已為本專案正在運行的看板
            if is_server_for_this_project(candidate_port, BASE_DIR):
                dashboard_url = f"http://127.0.0.1:{candidate_port}/architecture_dashboard.html"
                print(f"ℹ️ 偵測到本專案架構看板微服務已在 port {candidate_port} 穩定運行中！")
                if open_browser:
                    print(f"🚀 為您直接喚起瀏覽器: {dashboard_url}")
                    _safe_open_browser(dashboard_url)
                    time.sleep(0.5)
                return
            else:
                # 佔用中且不屬於本專案：檢查是否為殭屍無響應進程
                if not is_server_alive(candidate_port):
                    print(f"⚠️ 偵測到 port {candidate_port} 被佔用但無正常 HTTP 回應 (殘留殭屍進程)，正在執行自我修復...")
                    _kill_process_on_port(candidate_port)
                    time.sleep(0.5)
                    if not is_port_in_use(candidate_port):
                        selected_port = candidate_port
                        break
                else:
                    try:
                        req_chk = urllib.request.Request(f"http://127.0.0.1:{candidate_port}/api/architecture_stats", headers={"User-Agent": "Antigravity-Probe"})
                        with urllib.request.urlopen(req_chk, timeout=1.0) as resp_chk:
                            p_other = json.loads(resp_chk.read().decode("utf-8")).get("project_name", "其他專案")
                            print(f"ℹ️ 偵測到 port {candidate_port} 正在服務「{p_other}」，自動為本專案分配獨立埠號...")
                    except Exception:
                        print(f"ℹ️ 偵測到 port {candidate_port} 正在服務其他專案，自動嘗試下一個備援埠號...")

    if not selected_port:
        selected_port = port + 10
    port = selected_port

    class ReusableTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
        allow_reuse_address = True
        daemon_threads = True

    try:
        with ReusableTCPServer(("127.0.0.1", port), ArchitectureDashboardHTTPHandler) as httpd:
            dashboard_url = f"http://127.0.0.1:{port}/architecture_dashboard.html"
            print("\n" + "=" * 65)
            print("🏛️ 專案平鋪架構 ✕ 代碼健康度即時看板微服務啟動！")
            print(f"🌐 看板網址: {dashboard_url}")
            print("⚡ 支援全模組動態物理行數掃描、新增檔案自動探測與多餘檔案安全清理！")
            print("💡 按 Ctrl+C 可隨時停止伺服器")
            print("=" * 65 + "\n", flush=True)

            if open_browser:
                threading.Timer(0.5, lambda: _safe_open_browser(dashboard_url)).start()

            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n🛑 架構看板微服務已安全停止。")
    except Exception as e:
        print(f"❌ 啟動伺服器失敗 ({e})，開啟本機靜態網頁模式...")
        if open_browser:
            _safe_open_browser(os.path.join(BASE_DIR, "architecture_dashboard.html"))


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--json" in args:
        data = scan_project_architecture(BASE_DIR)
        print(json.dumps(data, ensure_ascii=False, indent=2))
    elif "--export" in args:
        ok = export_architecture_js_snapshot(BASE_DIR)
        print("✅ 成功匯出 architecture_data.js 快照！" if ok else "❌ 匯出失敗")
    elif "--serve" in args or "-s" in args or len(args) == 0:
        start_server(port=5055, open_browser=True)
    else:
        data = scan_project_architecture(BASE_DIR)
        summary = data["summary"]
        print(f"📊 專案模組總數: {summary['total_files']} | 總行數: {summary['total_lines']} | 健康率: {summary['health_pct']}%")
