# -*- coding: utf-8 -*-
"""
Token Scanner & Analytics Engine for Antigravity IDE (Multi-Project Support)
自動掃描本機所有對話日誌，智慧識別對話所屬專案 (CHA / APP / EPANews / etc.)，
動態計算 5 小時滑動窗口與多專案 Token 消耗，輸出 token_data.json 與 token_data.js。
"""

import os
import sys
import glob
import json
import re
import datetime
import urllib.parse

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_antigravity_brain_dirs():
    """智慧動態探測 Antigravity IDE brain 目錄 (支援多使用者、跨設備與多目錄自動合併掃描)"""
    candidate_dirs = []
    # 1. 當前使用者家目錄
    user_home = os.path.expanduser("~")
    candidate_dirs.append(os.path.join(user_home, ".gemini", "antigravity-ide", "brain"))
    
    # 2. USERPROFILE 環境變數
    user_profile = os.environ.get("USERPROFILE")
    if user_profile and user_profile != user_home:
        candidate_dirs.append(os.path.join(user_profile, ".gemini", "antigravity-ide", "brain"))
        
    # 3. 掃描 C:\Users 下所有可能的 .gemini\antigravity-ide\brain
    users_root = r"C:\Users"
    if os.path.exists(users_root):
        try:
            for u in os.listdir(users_root):
                b_path = os.path.join(users_root, u, ".gemini", "antigravity-ide", "brain")
                if os.path.isdir(b_path) and b_path not in candidate_dirs:
                    candidate_dirs.append(b_path)
        except Exception:
            pass

    existing = [d for d in candidate_dirs if os.path.isdir(d)]
    return existing if existing else candidate_dirs[:1]

OUTPUT_JSON = os.path.join(BASE_DIR, "token_data.json")
OUTPUT_JS = os.path.join(BASE_DIR, "token_data.js")
TOKEN_STORAGE_FILE = os.path.join(BASE_DIR, "token_storage.json")

def estimate_tokens(text: str) -> int:
    """
    粗估字數與 Token：
    - 中文/全形標點：通常 1 字符 = 1.3 ~ 1.5 token
    - 英文單字/代碼：1 單字約 1.3 token，每 1 token 約 3.5~4 個英文字元
    """
    if not text:
        return 0
    cjk_count = len(re.findall(r'[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]', text))
    non_cjk_len = len(text) - cjk_count
    tokens = int(cjk_count * 1.4 + non_cjk_len * 0.28)
    return max(1, tokens)

def detect_project_from_snippet(text_sample: str) -> str:
    """
    從對話開頭元數據、檔案路徑或對話內容中智慧識別所屬專案名稱
    """
    if not text_sample:
        return "General"

    # 1. 優先比對具體已知專案
    if "CHA_HyCMS_Frontend" in text_sample or "\\CHA\\" in text_sample or "/CHA/" in text_sample:
        return "CHA_HyCMS_Frontend"
    if "APP_9181734" in text_sample or "milestone_service" in text_sample or "parking_storage" in text_sample:
        return "APP_9181734"
    if "2026EPANews" in text_sample:
        return "2026EPANews"
    if "MOENV_Gen2" in text_sample:
        return "MOENV_Gen2"

    # 2. 從 workspace mapping 擷取：d:\WEB\...\<project> ->
    m_ws = re.search(r"d:[\\/]WEB[\\/](?:CHA[\\/])?([^\\/\r\n\s]+)\s*->", text_sample, re.I)
    if m_ws:
        proj = urllib.parse.unquote(m_ws.group(1).strip())
        if proj.lower().startswith("cha"):
            return "CHA_HyCMS_Frontend"
        if proj.upper().startswith("APP"):
            return "APP_9181734"
        return proj

    # 3. 從 Active Document 或 Cwd 中比對 d:\WEB\<folder>
    m_web = re.search(r"d:[\\/]WEB[\\/]([^\\/\r\n\s\"\'`\<\>]+)", text_sample, re.I)
    if m_web:
        proj = urllib.parse.unquote(m_web.group(1).strip())
        proj = re.split(r"[/\\.,;]", proj)[0].strip()
        if proj.upper().startswith("APP"):
            return "APP_9181734"
        if proj.lower().startswith("cha"):
            return "CHA_HyCMS_Frontend"
        if proj:
            return proj

    return "General"

def scan_all_transcripts():
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    now_local = datetime.datetime.now()
    
    brain_dirs = get_antigravity_brain_dirs()
    log_files = []
    for b_dir in brain_dirs:
        pattern = os.path.join(b_dir, "*", ".system_generated", "logs", "transcript.jsonl")
        for f in glob.glob(pattern):
            if f not in log_files:
                log_files.append(f)
    
    print(f"🔍 正在掃描本機對話紀錄，於 {len(brain_dirs)} 個目錄中找到 {len(log_files)} 個對話軌跡檔案...")
    
    conversations = []
    
    for t_path in log_files:
        cid = os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(t_path))))
        try:
            mtime = datetime.datetime.fromtimestamp(os.path.getmtime(t_path), datetime.timezone.utc)
        except Exception:
            continue
            
        # 僅統計最近 14 天內的對話
        age_days = (now_utc - mtime).total_seconds() / 86400
        if age_days > 14:
            continue
            
        first_query = ""
        first_time = None
        last_time = None
        
        total_prompt_tokens = 0
        total_response_tokens = 0
        current_context_tokens = 0
        step_count = 0
        user_turn_count = 0
        
        sample_text_for_project = ""
        
        try:
            with open(t_path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line_str = line.strip()
                    if not line_str:
                        continue
                    try:
                        step = json.loads(line_str)
                    except Exception:
                        continue
                        
                    step_count += 1
                    
                    # 擷取前 35 步作為專案識別元數據取樣
                    if step_count <= 35:
                        sample_text_for_project += line_str[:500] + "\n"
                        
                    created_at_str = step.get("created_at", "")
                    if created_at_str:
                        try:
                            s_dt = datetime.datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                            if not first_time or s_dt < first_time:
                                first_time = s_dt
                            if not last_time or s_dt > last_time:
                                last_time = s_dt
                        except Exception:
                            pass
                            
                    stype = step.get("type", "")
                    source = step.get("source", "")
                    content = str(step.get("content", ""))
                    
                    if stype == "USER_INPUT":
                        user_turn_count += 1
                        if not first_query and content:
                            clean_q = re.sub(r'<[^>]+>', '', content).strip()
                            clean_q = clean_q.replace('\n', ' ').replace('\r', ' ')
                            if clean_q:
                                first_query = clean_q[:80]
                                
                    step_tokens = estimate_tokens(content)
                    
                    if source == "MODEL":
                        total_response_tokens += step_tokens
                        current_context_tokens += step_tokens
                    elif stype == "USER_INPUT":
                        # 每一個使用者發言輪次 (User Turn)，模型發起推理請求
                        # 上下文 Context 包含歷史對話，受 IDE 上下文壓縮窗口 (Context Window Capping) 保護
                        turn_prompt_tokens = min(current_context_tokens + step_tokens, 100000)
                        total_prompt_tokens += turn_prompt_tokens
                        current_context_tokens += step_tokens
                    else:
                        # 工具輸出、系統指令等：僅計入 Context 增量，不作為獨立 Prompt 反覆平方階累加
                        current_context_tokens += step_tokens
        except Exception:
            continue
            
        conv_time = last_time or mtime
        age_hours = round((now_utc - conv_time).total_seconds() / 3600, 2)
        
        # 🛡️ 單場對話健康上限防護 (上限 3.5M，徹底杜絕舊版平方階日誌暴衝漏洞)
        raw_sum = total_prompt_tokens + total_response_tokens
        if raw_sum == 0:
            raw_sum = current_context_tokens
        total_tokens = min(raw_sum, 3500000)
        if total_tokens == 0:
            continue
            
        # 辨識專案名稱
        project_name = detect_project_from_snippet(sample_text_for_project)
        
        conversations.append({
            "cid": cid,
            "project": project_name,
            "title": first_query or "(未命名對話)",
            "step_count": step_count,
            "turn_count": max(1, user_turn_count),
            "last_time_iso": conv_time.isoformat(),
            "last_time_str": conv_time.astimezone().strftime("%Y-%m-%d %H:%M"),
            "age_hours": age_hours,
            "prompt_tokens": total_prompt_tokens,
            "response_tokens": total_response_tokens,
            "total_tokens": total_tokens
        })
        
    # 依最近活躍時間排序
    conversations.sort(key=lambda x: x["age_hours"])
    
    # 統計全局指標
    five_hour_convs = [c for c in conversations if c["age_hours"] <= 5.0]
    twenty_four_hour_convs = [c for c in conversations if c["age_hours"] <= 24.0]
    seven_days_convs = [c for c in conversations if c["age_hours"] <= 168.0]
    
    tokens_5h = sum(c["total_tokens"] for c in five_hour_convs)
    tokens_24h = sum(c["total_tokens"] for c in twenty_four_hour_convs)
    tokens_7d = sum(c["total_tokens"] for c in seven_days_convs)
    
    # 專案用量統計分組
    proj_map = {}
    for c in conversations:
        p = c["project"]
        if p not in proj_map:
            proj_map[p] = {
                "id": p,
                "name": p,
                "total_tokens": 0,
                "conv_count": 0,
                "tokens_5h": 0,
                "tokens_24h": 0
            }
        proj_map[p]["total_tokens"] += c["total_tokens"]
        proj_map[p]["conv_count"] += 1
        if c["age_hours"] <= 5.0:
            proj_map[p]["tokens_5h"] += c["total_tokens"]
        if c["age_hours"] <= 24.0:
            proj_map[p]["tokens_24h"] += c["total_tokens"]
            
    project_list = sorted(proj_map.values(), key=lambda x: x["conv_count"], reverse=True)
    
    report = {
        "updated_at": now_local.strftime("%Y-%m-%d %H:%M:%S"),
        "metrics": {
            "tokens_5h": tokens_5h,
            "tokens_24h": tokens_24h,
            "tokens_7d": tokens_7d,
            "convs_5h_count": len(five_hour_convs),
            "convs_24h_count": len(twenty_four_hour_convs),
            "convs_7d_count": len(seven_days_convs),
            "total_convs_scanned": len(conversations)
        },
        "projects": project_list,
        "conversations": conversations[:120]  # 保留最近 120 場對話供各專案即時篩選
    }
    
    # ⚡ 雙軌 Token 節省效益與動態 Skill 路由統計 (System 1 + System 2 Dual-Track Savings SSOT)
    try:
        import skill_router
        import importlib
        importlib.reload(skill_router)
        report["dual_track_savings"] = skill_router.compute_dual_track_savings(conversations, tokens_7d)
    except Exception as e:
        report["dual_track_savings"] = None

    # ⚡ JEV System 1 極速語意快取指標與 P99 延遲降幅統計 (Semantic Reflex Cache SSOT)
    try:
        import semantic_reflex_cache
        import importlib
        importlib.reload(semantic_reflex_cache)
        report["semantic_cache"] = semantic_reflex_cache.get_cache_stats_summary()
    except Exception as e:
        report["semantic_cache"] = None
    
    # 3. ⚡ 串接 Antigravity Cockpit 配額監控 (即時百分比、官方重置倒數與每週推論上限)
    # 0. 讀取既有持久化儲存 (提取 dismissedIncidentIds 墓碑黑名單)
    existing_storage = {}
    if os.path.exists(TOKEN_STORAGE_FILE):
        try:
            with open(TOKEN_STORAGE_FILE, "r", encoding="utf-8") as sf:
                existing_storage = json.load(sf)
        except Exception:
            pass

    dismissed_ids = existing_storage.get("dismissedIncidentIds", [])
    stored_incidents = existing_storage.get("cooldownIncidents", [])
    stored_accounts = existing_storage.get("accounts", [])
    hist = existing_storage.get("history", [])

    cockpit_summary = None
    try:
        import cockpit_service
        import importlib
        importlib.reload(cockpit_service)
        # ⚡ 若授權快取超過 5 分鐘或缺少 quota_summary，自動觸發官方直連刷新
        try:
            now_t = time.time()
            desktop_dir = os.path.join(cockpit_service.COCKPIT_DIR, "cache", "quota_api_v1_desktop", "authorized")
            need_refresh = False
            if not os.path.exists(desktop_dir):
                need_refresh = True
            else:
                f_list = [f for f in glob.glob(os.path.join(desktop_dir, "*.json")) if not f.endswith(".tmp")]
                if not f_list or any(now_t - os.path.getmtime(f) > 300 for f in f_list):
                    need_refresh = True
            if need_refresh:
                cockpit_service.refresh_quotas_via_google_api()
        except Exception:
            pass
        cockpit_summary = cockpit_service.get_cockpit_quota_summary(conversations, dismissed_ids=dismissed_ids)
    except Exception as e:
        pass

    if cockpit_summary:
        report["cockpit"] = cockpit_summary
        report["accounts"] = cockpit_summary.get("accounts", [])
        report["cooldownIncidents"] = cockpit_summary.get("cooldownIncidents", [])
    report["dismissedIncidentIds"] = dismissed_ids

    # 1. 寫入 token_data.json
    with open(OUTPUT_JSON, "w", encoding="utf-8") as jf:
        json.dump(report, jf, ensure_ascii=False, indent=2)
        
    # 2. 同步寫入 token_data.js
    with open(OUTPUT_JS, "w", encoding="utf-8") as jsf:
        jsf.write("window.__TOKEN_SCAN_DATA__ = " + json.dumps(report, ensure_ascii=False, indent=2) + ";\n")

    # 3. 智慧持久化至本地 token_storage.json (保留已有歷史與記帳總額，無感平滑升級)
    try:
        # 🛡️ 歷史舊帳清零與純自動對話採信協議 (依 2026-09-22 13:00 自動依帳號匯入上線為唯一真實基準)
        # 徹底剔除不可信之舊手動登記與 13:00 以前之記錄，全系統 100% 依據 Transcript 自動掃描認列
        hist = [
            h for h in hist
            if h.get("auto_ingested") is True and (h.get("time") or "") >= "2026-09-22 13:00"
        ]

        # 合併帳號數據：以真實流水帳 (hist) 精確加總，徹底杜絕歷史虛胖卡死殘留
        merged_accounts = []
        if cockpit_summary and "accounts" in cockpit_summary:
            for c_acc in cockpit_summary["accounts"]:
                em_lower = c_acc.get("email", "").lower()
                acc_hist = [h for h in hist if h.get("email", "").lower() == em_lower]
                acc_tokens = sum(h.get("tokens", 0) for h in acc_hist)
                acc_cnt = len(acc_hist)
                c_acc["totalRecordedTokens"] = acc_tokens
                c_acc["recordedCount"] = acc_cnt
                if acc_hist:
                    c_acc["lastLoggedAt"] = max(h.get("time") or "" for h in acc_hist)
                else:
                    c_acc["lastLoggedAt"] = "—"
                merged_accounts.append(c_acc)
        else:
            merged_accounts = stored_accounts
            for s_acc in merged_accounts:
                em_lower = s_acc.get("email", "").lower()
                acc_hist = [h for h in hist if h.get("email", "").lower() == em_lower]
                s_acc["totalRecordedTokens"] = sum(h.get("tokens", 0) for h in acc_hist)
                s_acc["recordedCount"] = len(acc_hist)
                if acc_hist:
                    s_acc["lastLoggedAt"] = max(h.get("time") or "" for h in acc_hist)
                else:
                    s_acc["lastLoggedAt"] = "—"

        # 🤖 智能對話自動歸屬與記帳 (Auto-Ingestion Engine)
        # 自動識別未登記對話並關聯至當前服役帳號，徹底免除人工逐筆勾選與手動記帳！
        # 🛡️ 設定 2026-09-22 13:00 自動依帳號匯入上線為唯一真實基準線，杜絕 13:00 以前任何舊日誌再次竄入！
        AUTO_INGEST_MIN_TIME = "2026-09-22 13:00:00"

        active_email = None
        if cockpit_summary and cockpit_summary.get("activeAccount"):
            active_email = cockpit_summary.get("activeAccount")
        if not active_email and merged_accounts:
            act_acc = next((a for a in merged_accounts if a.get("isActive")), None)
            if act_acc: active_email = act_acc.get("email")
        if not active_email and stored_accounts:
            act_acc = next((a for a in stored_accounts if a.get("isActive")), None)
            if act_acc: active_email = act_acc.get("email")
        if not active_email:
            active_email = "cengjieling33@gmail.com"

        hist_cid_map = {h.get("cid"): h for h in hist if h.get("cid")}
        auto_added_count = 0
        auto_updated_count = 0

        for c in conversations:
            cid = c.get("cid")
            if not cid:
                continue
            time_str = c.get("last_time_str") or ""
            tokens = c.get("total_tokens", 0)
            title = c.get("title", "")
            proj = c.get("project", "APP_9181734")
            note = f"[{proj}] {title}"[:60] if title else f"[{proj}] 自動登記"
            model = "Gemini"

            if cid in hist_cid_map:
                existing_item = hist_cid_map[cid]
                # 若對話仍有新增 Token 消耗，自動同步最新 Token 與時間
                if tokens > existing_item.get("tokens", 0):
                    existing_item["tokens"] = tokens
                    existing_item["time"] = time_str
                    auto_updated_count += 1
            else:
                # 🛡️ 僅在時間落於多帳號真實服役底線 (2026-09-21) 之後，方進行新對話自動收錄
                if time_str < AUTO_INGEST_MIN_TIME:
                    continue

                new_item = {
                    "time": time_str,
                    "email": active_email,
                    "model": model,
                    "tokens": tokens,
                    "note": note,
                    "cid": cid,
                    "auto_ingested": True
                }
                hist.append(new_item)
                hist_cid_map[cid] = new_item
                auto_added_count += 1

        # 依時間遞增排序，確保時間序列嚴謹
        hist.sort(key=lambda x: x.get("time", ""))

        if auto_added_count > 0 or auto_updated_count > 0:
            print(f"  🤖 智能記帳引擎: 自動收錄 {auto_added_count} 場新對話、更新 {auto_updated_count} 場持續對話 (服役帳號: {active_email})")

        # 重新以已歸屬帳號之完整流水帳 (hist) 精算 Cockpit 數據對撞與推論信標 (確保帳號隔離)
        try:
            import cockpit_service
            import importlib
            importlib.reload(cockpit_service)
            fresh_summary = cockpit_service.get_cockpit_quota_summary(hist, dismissed_ids=dismissed_ids)
            if fresh_summary:
                cockpit_summary = fresh_summary
                report["cockpit"] = cockpit_summary
                report["accounts"] = cockpit_summary.get("accounts", [])

                # 實時對齊 merged_accounts 的官方即時配額、倒數與真實加總
                refreshed_accounts = []
                for c_acc in cockpit_summary.get("accounts", []):
                    em_lower = c_acc.get("email", "").lower()
                    acc_hist = [h for h in hist if h.get("email", "").lower() == em_lower]
                    c_acc["totalRecordedTokens"] = sum(h.get("tokens", 0) for h in acc_hist)
                    c_acc["recordedCount"] = len(acc_hist)
                    if acc_hist:
                        c_acc["lastLoggedAt"] = max(h.get("time") or "" for h in acc_hist)
                    else:
                        c_acc["lastLoggedAt"] = "—"
                    refreshed_accounts.append(c_acc)
                merged_accounts = refreshed_accounts
        except Exception:
            pass

        # 智能合併信標：納入 Cockpit 自動探測且未被剔除之信標 + 保留手動登記之合法信標，且絕對不納入 dismissed_ids
        merged_incidents = []
        seen_inc_ids = set()
        dismissed_id_set = set(dismissed_ids)

        for inc in (cockpit_summary.get("cooldownIncidents", []) if cockpit_summary else []):
            inc_id = inc.get("id")
            if inc_id and inc_id not in dismissed_id_set and inc_id not in seen_inc_ids:
                merged_incidents.append(inc)
                seen_inc_ids.add(inc_id)

        for s_inc in stored_incidents:
            s_id = s_inc.get("id")
            if s_id and s_id not in dismissed_id_set and s_id not in seen_inc_ids:
                if "claude" in str(s_inc.get("model", "")).lower():
                    continue
                merged_incidents.append(s_inc)
                seen_inc_ids.add(s_id)

        report["cooldownIncidents"] = merged_incidents
        report["dismissedIncidentIds"] = dismissed_ids
        report["accounts"] = merged_accounts
        with open(OUTPUT_JSON, "w", encoding="utf-8") as jf:
            json.dump(report, jf, ensure_ascii=False, indent=2)
        with open(OUTPUT_JS, "w", encoding="utf-8") as jsf:
            jsf.write("window.__TOKEN_SCAN_DATA__ = " + json.dumps(report, ensure_ascii=False, indent=2) + ";\n")
            jsf.write("window.TOKEN_PULSE_DATA = " + json.dumps(report, ensure_ascii=False, indent=2) + ";\n")

        storage_data = {
            "accounts": merged_accounts,
            "history": hist,
            "cooldownIncidents": merged_incidents,
            "dismissedIncidentIds": dismissed_ids,
            "pulseData": report,
            "updated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        with open(TOKEN_STORAGE_FILE, "w", encoding="utf-8") as sf:
            json.dump(storage_data, sf, ensure_ascii=False, indent=2)

        # 4. 背景非同步直連推送至線上 Render 總表 (徹底達成跨端秒級同步)
        def _bg_push():
            try:
                body_bytes = json.dumps(storage_data, sort_keys=True, ensure_ascii=False).encode("utf-8")
                import hashlib
                current_hash = hashlib.md5(body_bytes).hexdigest()
                if globals().get("_LAST_PUSH_HASH") == current_hash:
                    return
                globals()["_LAST_PUSH_HASH"] = current_hash

                url = "https://tw-parking-linebot.onrender.com/api/token_sync?key=tw_park_9b46_boss_2026"
                req = urllib.request.Request(url, data=body_bytes, headers={"Content-Type": "application/json", "User-Agent": "Antigravity-Scan-Push"}, method="POST")
                with urllib.request.urlopen(req, timeout=12) as resp:
                    if resp.status == 200:
                        print("☁️ [Cloud Push] 最新對話與 Cockpit 配額狀態已秒級推送至線上營運總表！", flush=True)
            except Exception:
                pass
        push_thread = threading.Thread(target=_bg_push, daemon=True)
        push_thread.start()
        # 若在獨立行程中執行，等待上傳完成以防行程提早退出
        push_thread.join(timeout=4)
    except Exception as e:
        print(f"⚠️ [Token Storage Error]: {e}", flush=True)
        
    print(f"📊 掃描完成！找到 {len(project_list)} 個專案：")
    for pj in project_list:
        print(f"  • [{pj['name']}]: {pj['conv_count']} 場對話, 共 {pj['total_tokens']:,} Tokens")
    print(f"  ✓ 全域 5 小時消耗: {tokens_5h:,} Tokens")
    if cockpit_summary:
        print(f"  ⚡ Cockpit 連線: 4 組帳號官方配額已自動對齊 (當前服役: {cockpit_summary.get('activeAccount')})")
    print(f"  ✓ 已產出: {os.path.basename(OUTPUT_JSON)} 與 {os.path.basename(OUTPUT_JS)}")
    return report


# =====================================================================
# 🚀 輕量本地 Web 服務與即時掃描 API (Zero-Dependency Local API)
# =====================================================================
import http.server
import socketserver
import urllib.request
import urllib.error
import webbrowser
import threading

DEFAULT_PORT = 8765

class TokenDashboardHTTPHandler(http.server.SimpleHTTPRequestHandler):
    """專職處理 Token 總指揮中心靜態資源與即時掃描 API"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # 允許全域 CORS 跨來源調用（即使以 file:// 協議開啟亦可呼叫）
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path in ["", "/", "/token_dashboard"]:
            self.send_response(302)
            self.send_header("Location", "/token_dashboard.html")
            self.end_headers()
            return
        elif path in ["/architecture_dashboard", "/architecture"]:
            self.send_response(302)
            self.send_header("Location", "/architecture_dashboard.html")
            self.end_headers()
            return
        elif path == "/cloud_dashboard":
            self.send_response(302)
            self.send_header("Location", "/cloud_dashboard.html")
            self.end_headers()
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
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "service": "antigravity_token_server",
                "subservices": ["tokens", "architecture", "redundant_cleaner", "skill_router", "semantic_cache"]
            }).encode("utf-8"))
            return
        elif path == "/api/scan_tokens":
            self._handle_scan_api()
            return
        elif path == "/api/skill_router":
            self._handle_skill_router(parsed)
            return
        elif path == "/api/dual_track_savings":
            self._handle_dual_track_savings()
            return
        elif path == "/api/cache_stats":
            self._handle_cache_stats()
            return
        elif path == "/api/cache_query":
            self._handle_cache_query(parsed)
            return
        elif path == "/api/refresh_quota_live":
            self._handle_refresh_quota_live()
            return
        elif path in ["/api/token_state", "/api/token_sync"]:
            self._handle_get_token_state()
            return
        elif path == "/api/architecture_stats":
            self._handle_architecture_stats()
            return
        elif path == "/api/scan_redundant_files":
            self._handle_scan_redundant_files()
            return
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path == "/api/scan_tokens":
            self._handle_scan_api()
            return
        elif path == "/api/skill_router":
            self._handle_skill_router(parsed)
            return
        elif path == "/api/dual_track_savings":
            self._handle_dual_track_savings()
            return
        elif path == "/api/cache_stats":
            self._handle_cache_stats()
            return
        elif path == "/api/cache_query":
            self._handle_cache_query(parsed)
            return
        elif path == "/api/refresh_quota_live":
            self._handle_refresh_quota_live()
            return
        elif path in ["/api/token_state", "/api/token_sync"]:
            self._handle_post_token_state()
            return
        elif path == "/api/sync_to_cloud":
            self._handle_sync_to_cloud()
            return
        elif path == "/api/clean_redundant_files":
            self._handle_clean_redundant_files()
            return
        self.send_error(404, "Endpoint Not Found")

    def _handle_architecture_stats(self):
        try:
            import scan_architecture
            data = scan_architecture.scan_project_architecture(BASE_DIR)
            res_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(res_bytes)))
            self.end_headers()
            self.wfile.write(res_bytes)
        except Exception as e:
            self._send_error_json(str(e))

    def _handle_skill_router(self, parsed):
        try:
            import skill_router
            import importlib
            importlib.reload(skill_router)
            prompt = ""
            if self.command == "GET":
                qs = urllib.parse.parse_qs(parsed.query)
                prompt = qs.get("query", qs.get("prompt", [""]))[0]
            else:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                req_json = json.loads(body) if body else {}
                prompt = req_json.get("query", req_json.get("prompt", ""))

            result = skill_router.DynamicSkillRouter.route_full(prompt)
            res_bytes = json.dumps(result, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(res_bytes)))
            self.end_headers()
            self.wfile.write(res_bytes)
        except Exception as e:
            self._send_error_json(str(e))

    def _handle_dual_track_savings(self):
        try:
            import skill_router
            import importlib
            importlib.reload(skill_router)
            data = {}
            if os.path.exists(OUTPUT_JSON):
                with open(OUTPUT_JSON, "r", encoding="utf-8") as f:
                    data = json.load(f)
            convs = data.get("conversations", [])
            tokens_7d = data.get("metrics", {}).get("tokens_7d", 0)
            result = skill_router.compute_dual_track_savings(convs, tokens_7d)
            res_bytes = json.dumps(result, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(res_bytes)))
            self.end_headers()
            self.wfile.write(res_bytes)
        except Exception as e:
            self._send_error_json(str(e))

    def _handle_cache_stats(self):
        try:
            import semantic_reflex_cache
            import importlib
            importlib.reload(semantic_reflex_cache)
            stats = semantic_reflex_cache.get_cache_stats_summary()
            res_bytes = json.dumps(stats, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(res_bytes)))
            self.end_headers()
            self.wfile.write(res_bytes)
        except Exception as e:
            self._send_error_json(str(e))

    def _handle_cache_query(self, parsed):
        try:
            qs = urllib.parse.parse_qs(parsed.query)
            query = (qs.get("query") or [""])[0].strip()
            if not query and self.command == "POST":
                length = int(self.headers.get('Content-Length', 0))
                if length > 0:
                    body = self.rfile.read(length).decode('utf-8')
                    body_json = json.loads(body)
                    query = body_json.get("query", "").strip()

            import semantic_reflex_cache
            import importlib
            importlib.reload(semantic_reflex_cache)
            cache = semantic_reflex_cache.get_semantic_cache()
            route_res = cache.route_with_cache(query) if query else {}
            out = {
                "status": "ok",
                "query": query,
                "result": route_res,
                "cache_stats": cache.get_stats()
            }
            res_bytes = json.dumps(out, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(res_bytes)))
            self.end_headers()
            self.wfile.write(res_bytes)
        except Exception as e:
            self._send_error_json(str(e))


    def _handle_scan_redundant_files(self):
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

    def _handle_clean_redundant_files(self):
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

    def _handle_refresh_quota_live(self):
        """⚡ 透過 Google OAuth2 refresh_token 直接連線 Google 官方端點拉取最新 4 組帳號配額並自動刷新掃描"""
        try:
            import cockpit_service
            res = cockpit_service.refresh_quotas_via_google_api()
            scan_all_transcripts()
            self._send_success_json({"message": "官方配額即時拉取並快取成功！", "result": res})
            print("⚡ [Live Quota] 網頁觸發官方配額即時拉取完成！", flush=True)
        except Exception as e:
            self._send_error_json(f"即時拉取失敗: {str(e)}")

    def _handle_sync_to_cloud(self):
        """由本機 Python 微服務代理將數據 POST 至 Render 雲端 (徹底免除瀏覽器同源政策 CORS 阻擋)"""
        try:
            content_len = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_len)
            query_params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            key = query_params.get("key", ["tw_park_9b46_boss_2026"])[0]
            cloud_url = f"https://tw-parking-linebot.onrender.com/api/token_sync?key={urllib.parse.quote(key)}"
            
            req = urllib.request.Request(
                cloud_url,
                data=body_bytes,
                headers={"Content-Type": "application/json", "User-Agent": "Antigravity-Token-Local-Proxy"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                resp_data = resp.read()
                self.send_response(resp.status)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(resp_data)))
                self.end_headers()
                self.wfile.write(resp_data)
                print(f"☁️ [Cloud Proxy] 本機代理成功將最新數據同步至 Render 線上指揮中心！", flush=True)
        except Exception as e:
            self._send_error_json(f"雲端代理同步失敗: {str(e)}")

    def _handle_get_token_state(self):
        try:
            storage_data = {}
            if os.path.exists(TOKEN_STORAGE_FILE):
                with open(TOKEN_STORAGE_FILE, "r", encoding="utf-8") as f:
                    storage_data = json.load(f)
            else:
                storage_data = {"accounts": [], "history": [], "updated_at": ""}

            # 🛡️ 歷史舊帳清零防護：僅輸出 auto_ingested == True 且 time >= 2026-09-22 13:00 的真實紀錄
            if "history" in storage_data and isinstance(storage_data["history"], list):
                storage_data["history"] = [
                    h for h in storage_data["history"]
                    if h.get("auto_ingested") is True and (h.get("time") or "") >= "2026-09-22 13:00"
                ]

            # ⚡ 即時動態對齊本地 Cockpit 最新真實配額與冷卻倒數
            try:
                import cockpit_service
                import importlib
                importlib.reload(cockpit_service)
                c_summary = cockpit_service.get_cockpit_quota_summary()
                if c_summary and "accounts" in c_summary:
                    c_map = {a["email"].lower(): a for a in c_summary["accounts"]}
                    accs = storage_data.get("accounts", [])
                    for a in accs:
                        a.pop("claudePct", None)
                        a.pop("claudeCooldown", None)
                        a.pop("claudeCooldownUntil", None)
                        em = a.get("email", "").lower()
                        if em in c_map:
                            c_acc = c_map[em]
                            for k in [
                                "geminiPct", "geminiCooldown", "geminiCooldownUntil",
                                "geminiWeeklyPct", "geminiWeeklyResetTime", "geminiWeeklyResetTimestamp", "geminiWeeklyCountdown", "geminiWeeklyResetFormatted",
                                "gemini5hPct", "gemini5hResetTime", "gemini5hResetTimestamp", "gemini5hCountdown", "gemini5hResetFormatted",
                                "claudeWeeklyPct", "claudeWeeklyResetTime", "claudeWeeklyResetTimestamp", "claudeWeeklyCountdown", "claudeWeeklyResetFormatted",
                                "claude5hPct", "claude5hResetTime", "claude5hResetTimestamp", "claude5hCountdown", "claude5hResetFormatted"
                            ]:
                                if k in c_acc:
                                    a[k] = c_acc[k]
                            if c_summary.get("activeAccount"):
                                a["isActive"] = (em == c_summary["activeAccount"].lower())
            except Exception:
                pass

            data_bytes = json.dumps(storage_data, ensure_ascii=False, indent=2).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data_bytes)))
            self.end_headers()
            self.wfile.write(data_bytes)
        except Exception as e:
            self._send_error_json(str(e))

    def _handle_post_token_state(self):
        try:
            content_len = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_len).decode("utf-8")
            data = json.loads(body)

            # 🛡️ 歷史舊帳清零防護：僅收錄 auto_ingested == True 且 time >= 2026-09-22 13:00 的真實紀錄
            if "history" in data and isinstance(data["history"], list):
                data["history"] = [
                    h for h in data["history"]
                    if h.get("auto_ingested") is True and (h.get("time") or "") >= "2026-09-22 13:00"
                ]

            # 帳號累計用量與筆數強制依乾淨之流水帳重新加總
            if "accounts" in data and isinstance(data["accounts"], list):
                h_list = data.get("history", [])
                for a in data["accounts"]:
                    em = a.get("email", "").lower()
                    acc_h = [h for h in h_list if h.get("email", "").lower() == em]
                    a["totalRecordedTokens"] = sum(h.get("tokens", 0) for h in acc_h)
                    a["recordedCount"] = len(acc_h)
                    a["lastLoggedAt"] = max([h.get("time") for h in acc_h] or ["—"])

            # 🛡️ 墓碑雙向護城河 (Tombstone Guard)：合併既有磁碟與客戶端墓碑清單，絕不被舊網頁覆蓋
            existing_dismissed = []
            if os.path.exists(TOKEN_STORAGE_FILE):
                try:
                    with open(TOKEN_STORAGE_FILE, "r", encoding="utf-8") as sf:
                        old_s = json.load(sf)
                        existing_dismissed = old_s.get("dismissedIncidentIds", [])
                except Exception:
                    pass

            client_dismissed = data.get("dismissedIncidentIds", [])
            final_dismissed = list(set(existing_dismissed + client_dismissed))
            data["dismissedIncidentIds"] = final_dismissed

            # 強制依墓碑黑名單過濾入庫信標，即使舊瀏覽器分頁 POST 舊信標也立刻剔除
            dismissed_set = set(final_dismissed)
            data["cooldownIncidents"] = [i for i in data.get("cooldownIncidents", []) if i.get("id") not in dismissed_set]

            # 🛡️ Cockpit 實測配額守門員：保留本地 Cockpit 真實模型配額，防舊瀏覽器 localStorage 回寫覆蓋
            try:
                import cockpit_service
                import importlib
                importlib.reload(cockpit_service)
                c_summary = cockpit_service.get_cockpit_quota_summary()
                if c_summary and "accounts" in c_summary:
                    c_map = {a["email"].lower(): a for a in c_summary["accounts"]}
                    for a in data.get("accounts", []):
                        a.pop("claudePct", None)
                        a.pop("claudeCooldown", None)
                        a.pop("claudeCooldownUntil", None)
                        em = a.get("email", "").lower()
                        if em in c_map:
                            c_acc = c_map[em]
                            for k in [
                                "geminiPct", "geminiCooldown", "geminiCooldownUntil",
                                "geminiWeeklyPct", "geminiWeeklyResetTime", "geminiWeeklyResetTimestamp", "geminiWeeklyCountdown", "geminiWeeklyResetFormatted",
                                "gemini5hPct", "gemini5hResetTime", "gemini5hResetTimestamp", "gemini5hCountdown", "gemini5hResetFormatted",
                                "claudeWeeklyPct", "claudeWeeklyResetTime", "claudeWeeklyResetTimestamp", "claudeWeeklyCountdown", "claudeWeeklyResetFormatted",
                                "claude5hPct", "claude5hResetTime", "claude5hResetTimestamp", "claude5hCountdown", "claude5hResetFormatted"
                            ]:
                                if k in c_acc:
                                    a[k] = c_acc[k]
                            if c_summary.get("activeAccount"):
                                a["isActive"] = (em == c_summary["activeAccount"].lower())
            except Exception:
                pass

            with open(TOKEN_STORAGE_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            # 同步更新本地 token_data 快照，防止任何載入快照造成信標復活
            if os.path.exists(OUTPUT_JSON):
                try:
                    with open(OUTPUT_JSON, "r", encoding="utf-8") as jf:
                        rpt = json.load(jf)
                    rpt["dismissedIncidentIds"] = final_dismissed
                    rpt["cooldownIncidents"] = data["cooldownIncidents"]
                    if "accounts" in data:
                        rpt["accounts"] = data["accounts"]
                    with open(OUTPUT_JSON, "w", encoding="utf-8") as jf:
                        json.dump(rpt, jf, ensure_ascii=False, indent=2)
                    with open(OUTPUT_JS, "w", encoding="utf-8") as jsf:
                        jsf.write("window.__TOKEN_SCAN_DATA__ = " + json.dumps(rpt, ensure_ascii=False, indent=2) + ";\n")
                        jsf.write("window.TOKEN_PULSE_DATA = " + json.dumps(rpt, ensure_ascii=False, indent=2) + ";\n")
                except Exception:
                    pass

            print(f"💾 [Token State] 本機狀態已持久化至 {os.path.basename(TOKEN_STORAGE_FILE)} (包含 {len(data.get('accounts', []))} 帳號, {len(data.get('history', []))} 筆歷程, {len(data.get('cooldownIncidents', []))} 筆信標, {len(final_dismissed)} 筆墓碑黑名單)", flush=True)
            resp_bytes = json.dumps({"status": "ok", "saved_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(resp_bytes)))
            self.end_headers()
            self.wfile.write(resp_bytes)
        except Exception as e:
            self._send_error_json(str(e))

    def _send_error_json(self, err_msg):
        msg_bytes = json.dumps({"error": err_msg}).encode("utf-8")
        self.send_response(500)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(msg_bytes)))
        self.end_headers()
        self.wfile.write(msg_bytes)

    def _handle_scan_api(self):
        try:
            print("\n⚡ [Web API] 接收到網頁端掃描請求，正在即時掃描本機對話日誌...", flush=True)
            report = scan_all_transcripts()
            data_bytes = json.dumps(report, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data_bytes)))
            self.end_headers()
            self.wfile.write(data_bytes)
            print("✅ [Web API] 即時掃描完成，最新數據已成功回傳網頁！\n", flush=True)
        except Exception as e:
            err_msg = json.dumps({"error": str(e)}).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(err_msg)))
            self.end_headers()
            self.wfile.write(err_msg)

    def log_message(self, format, *args):
        # 僅記錄 API 呼叫，避免靜態資源請求洗版控制台
        req_str = str(args[0]) if args else ""
        if "/api/" in req_str or "/health" in req_str:
            sys.stdout.write(f"[Token Server] {format % args}\n")
            sys.stdout.flush()

def is_server_running(port: int = DEFAULT_PORT) -> bool:
    """檢查本地伺服器是否已在運行中"""
    url = f"http://127.0.0.1:{port}/health"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Antigravity-Probe"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("service") == "antigravity_token_server"
    except Exception:
        pass
    return False

def trigger_remote_scan(port: int = DEFAULT_PORT) -> bool:
    """通知既有運行的本地伺服器執行即時掃描"""
    url = f"http://127.0.0.1:{port}/api/scan_tokens"
    try:
        req = urllib.request.Request(url, data=b"", headers={"User-Agent": "Antigravity-Trigger"})
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"⚠️ 通知伺服器掃描失敗: {e}")
    return False

def start_server(port: int = DEFAULT_PORT, open_browser: bool = True, target_page: str = "token_dashboard.html"):
    """啟動開發者總控中心 (Token 總指揮 ✕ 平鋪架構健康看板) 極輕量本地 Web 服務"""
    target_url = f"http://127.0.0.1:{port}/{target_page}"

    if is_server_running(port):
        print(f"💡 偵測到 Antigravity 開發者總控中心微服務已在運行中 (http://127.0.0.1:{port}/)！")
        if target_page == "token_dashboard.html":
            print("⚡ 正在通知既有伺服器執行最新日誌掃描...")
            if trigger_remote_scan(port):
                print("✅ 掃描完成！既有瀏覽器頁面若開著已同步刷新。")
            else:
                print("⚠️ 觸發既有服務掃描逾時，進行本地直接掃描...")
                scan_all_transcripts()
        if open_browser:
            print(f"🚀 為您開啟看板: {target_url}")
            webbrowser.open(target_url)
        return

    # 先做一次初始掃描確保檔案最新
    scan_all_transcripts()

    class ReusableTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
        allow_reuse_address = True
        daemon_threads = True

    try:
        with ReusableTCPServer(("127.0.0.1", port), TokenDashboardHTTPHandler) as httpd:
            print("\n" + "=" * 66)
            print("🚀 Antigravity 開發者總控中心微服務已就緒！ (Port: 8765)")
            print(f"🌐 Token 總指揮中心:   http://127.0.0.1:{port}/token_dashboard.html")
            print(f"🏛️ 平鋪架構健康看板: http://127.0.0.1:{port}/architecture_dashboard.html")
            print(f"📖 管理者手冊權力書: http://127.0.0.1:{port}/admin_guide.html")
            print("⚡ 整合功能：對話 Token 統計、官方配額同步、架構健康診斷與冗餘檔案清理！")
            print("💡 按 Ctrl+C 可隨時停止伺服器")
            print("=" * 66 + "\n", flush=True)

            if open_browser:
                threading.Timer(0.5, lambda: webbrowser.open(target_url)).start()

            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n🛑 開發者總控中心微服務已正常停止。")
    except OSError as e:
        print(f"❌ 啟動伺服器失敗 ({e})，降級開啟本地靜態網頁...")
        if open_browser:
            webbrowser.open(os.path.join(BASE_DIR, target_page))

if __name__ == "__main__":
    args = sys.argv[1:]
    target_page = "token_dashboard.html"
    if "--arch" in args or "--architecture" in args:
        target_page = "architecture_dashboard.html"
    elif "--page" in args:
        try:
            target_page = args[args.index("--page") + 1]
        except Exception:
            pass

    if "--refresh-api" in args or "--live" in args:
        try:
            import cockpit_service
            print("⚡ [API Refresh] 正在向 Google 官方端點拉取 4 組帳號即時配額...", flush=True)
            res = cockpit_service.refresh_quotas_via_google_api()
            if res.get("success"):
                print("✅ 官方配額即時拉取並快取成功！", flush=True)
            else:
                print("⚠️ 官方配額拉取失敗:", res.get("error"), flush=True)
        except Exception as e:
            print("⚠️ 官方配額拉取例外:", e, flush=True)

    if "--serve" in args or "-s" in args or "--server" in args:
        start_server(open_browser=True, target_page=target_page)
    else:
        scan_all_transcripts()

