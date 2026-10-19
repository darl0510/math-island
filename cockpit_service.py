"""
cockpit_service.py
⚡ Antigravity 配額監控 (Cockpit) 官方直連串接與每週用量推論引擎

功能職責：
1. 讀取本機 Antigravity Cockpit 本地快取 (quota_api_v1_plugin / quota_history)。
2. 秒級解析 4 組常態核心帳號的官方真實剩餘百分比 (Gemini / Claude) 與精確重置時間 (resetTime)。
3. 自動偵測長效冷卻跌落事件 (Beacon Events)，並與真實對話日誌對撞推論每週極限額度 (Weekly Quota Limit)。
4. 偵測 IDE 目前登入/服役帳號 (Active Account)。
"""

import os
import glob
import json
import time
import datetime
from typing import Dict, List, Any, Optional

COCKPIT_DIR = os.path.expandvars(r"%USERPROFILE%\.antigravity_cockpit")
AUTHORIZED_CACHE_DIRS = [
    os.path.join(COCKPIT_DIR, "cache", "quota_api_v1_desktop", "authorized"),
    os.path.join(COCKPIT_DIR, "cache", "quota_api_v1_plugin", "authorized")
]
AUTHORIZED_CACHE_DIR = AUTHORIZED_CACHE_DIRS[0]
HISTORY_CACHE_DIR = os.path.join(COCKPIT_DIR, "cache", "quota_history")

DEFAULT_CORE_EMAILS = [
    "carl37242002@gmail.com",
    "cenghanqing31@gmail.com",
    "y011020002000@gmail.com",
    "cengjieling33@gmail.com"
]

def parse_iso_or_timestamp(val: Any) -> Optional[float]:
    """將 ISO 時間字串或毫秒時間戳記轉換為 Unix timestamp (秒)"""
    if not val:
        return None
    if isinstance(val, (int, float)):
        # 若為毫秒 (長度 > 10^11) 轉秒
        return val / 1000.0 if val > 1e11 else float(val)
    if isinstance(val, str):
        val = val.strip()
        # 嘗試解析毫秒純數字字串
        if val.isdigit():
            v_num = float(val)
            return v_num / 1000.0 if v_num > 1e11 else v_num
        try:
            # 解析 2026-09-23T02:41:55Z
            clean_str = val.replace("Z", "+00:00")
            dt = datetime.datetime.fromisoformat(clean_str)
            return dt.timestamp()
        except Exception:
            pass
    return None

def format_reset_time_tw(val: Any) -> str:
    """將 ISO 時間字串或 timestamp 轉換為台灣時間 (UTC+8) 格式，如 10/02 06:00 (週五)"""
    ts = parse_iso_or_timestamp(val)
    if not ts:
        return ""
    try:
        dt = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone(datetime.timedelta(hours=8)))
        weekday_map = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"]
        w_str = weekday_map[dt.weekday()]
        return dt.strftime(f"%m/%d %H:%M ({w_str})")
    except Exception:
        return ""

def format_duration(seconds: float) -> str:
    """格式化剩餘秒數為 2d 1h 28m 或 5h 0m"""
    if seconds <= 0:
        return "✨ 已滿血可用"
    sec = int(seconds)
    d = sec // 86400
    h = (sec % 86400) // 3600
    m = (sec % 3600) // 60
    s = sec % 60
    if d > 0:
        return f"{d}d {h}h {m}m"
    elif h > 0:
        return f"{h}h {m}m"
    elif m > 0:
        return f"{m}m {s}s"
    else:
        return f"{s}s"

def refresh_quotas_via_google_api(oauth_config_path: Optional[str] = None) -> Dict[str, Any]:
    """
    ⚡ 透過 Google OAuth2 refresh_token 直接向 Google 官方端點拉取最新真實配額 (retrieveUserQuotaSummary)
    """
    import urllib.request
    import urllib.parse

    cfg_file = oauth_config_path or os.path.join(os.path.dirname(os.path.abspath(__file__)), "cockpit_oauth.json")
    if not os.path.exists(cfg_file):
        cfg_file = os.path.join(os.getcwd(), "cockpit_oauth.json")
    if not os.path.exists(cfg_file):
        return {"success": False, "error": f"找不到 OAuth 設定檔: {cfg_file}"}

    try:
        with open(cfg_file, "r", encoding="utf-8") as f:
            cfg = json.load(f)
    except Exception as e:
        return {"success": False, "error": f"讀取設定檔失敗: {e}"}

    client_id = cfg.get("client_id")
    client_secret = cfg.get("client_secret")
    endpoint = cfg.get("endpoint", "https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary")
    user_agent = cfg.get("user_agent", "antigravity/2.5.5 windows/amd64 google-api-nodejs-client/10.3.0")
    accounts_cfg = cfg.get("accounts", [])

    results = {}
    dest_dir = os.path.join(COCKPIT_DIR, "cache", "quota_api_v1_desktop", "authorized")
    os.makedirs(dest_dir, exist_ok=True)

    for item in accounts_cfg:
        email = (item.get("email") or "").lower().strip()
        rt = item.get("refresh_token")
        if not email or not rt:
            continue
        try:
            # 1. 換取 access_token
            token_post_data = urllib.parse.urlencode({
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": rt,
                "grant_type": "refresh_token"
            }).encode("utf-8")
            token_req = urllib.request.Request("https://oauth2.googleapis.com/token", data=token_post_data)
            token_resp = urllib.request.urlopen(token_req, timeout=10)
            token_json = json.loads(token_resp.read().decode("utf-8"))
            access_token = token_json.get("access_token")
            if not access_token:
                results[email] = {"success": False, "error": "無法換取 Access Token"}
                continue

            # 2. 呼叫官方配額端點 retrieveUserQuotaSummary
            quota_req = urllib.request.Request(
                endpoint,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "User-Agent": user_agent,
                    "x-goog-api-client": "gl-node/22.21.1",
                    "Content-Type": "application/json"
                },
                data=b"{}"
            )
            quota_resp = urllib.request.urlopen(quota_req, timeout=10)
            quota_json = json.loads(quota_resp.read().decode("utf-8"))

            # 3. 尋找或比對既有快取檔案進行合併覆蓋
            target_file = None
            for existing_f in glob.glob(os.path.join(dest_dir, "*.json")):
                try:
                    with open(existing_f, "r", encoding="utf-8") as efh:
                        edata = json.load(efh)
                    if (edata.get("email") or "").lower() == email:
                        target_file = existing_f
                        break
                except Exception:
                    pass

            if not target_file:
                import hashlib
                fname = hashlib.sha256(email.encode("utf-8")).hexdigest() + ".json"
                target_file = os.path.join(dest_dir, fname)

            # 讀取舊資料或新建
            base_data = {}
            if os.path.exists(target_file):
                try:
                    with open(target_file, "r", encoding="utf-8") as tfh:
                        base_data = json.load(tfh)
                except Exception:
                    pass

            base_data["email"] = email
            base_data["updatedAt"] = int(time.time() * 1000)
            if "payload" not in base_data:
                base_data["payload"] = {}
            base_data["payload"]["quota_summary"] = quota_json

            with open(target_file, "w", encoding="utf-8") as tfh:
                json.dump(base_data, tfh, ensure_ascii=False, indent=2)

            results[email] = {"success": True, "quota_summary": quota_json}
        except Exception as e:
            results[email] = {"success": False, "error": str(e)}

    return {"success": True, "details": results, "syncedAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

def get_cockpit_quota_summary(conversations: Optional[List[Dict[str, Any]]] = None, dismissed_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    獲取 4 組常態帳號的官方即時配額、冷卻倒數、歷史跌落信標與每週額度推論
    """
    now_ts = time.time()
    dismissed_set = set(dismissed_ids or [])
    accounts_data: Dict[str, Dict[str, Any]] = {}

    # 初始化 4 組常態帳號骨架
    for idx, em in enumerate(DEFAULT_CORE_EMAILS, 1):
        accounts_data[em.lower()] = {
            "id": f"acc_{idx}",
            "email": em,
            "isActive": False,
            "claudePct": 100,
            "claudeCooldown": "5h 0m",
            "claudeCooldownUntil": 0,
            "geminiPct": 100,
            "geminiCooldown": "5h 0m",
            "geminiCooldownUntil": 0,
            # 🎯 雙軌官方 SSOT 額度結構 (5小時 + 每週額度)
            "geminiWeeklyPct": 100.0,
            "geminiWeeklyResetTime": "",
            "geminiWeeklyResetTimestamp": 0,
            "geminiWeeklyCountdown": "✨ 滿血可用",
            "geminiWeeklyResetFormatted": "",
            "gemini5hPct": 100.0,
            "gemini5hResetTime": "",
            "gemini5hResetTimestamp": 0,
            "gemini5hCountdown": "✨ 滿血可用",
            "gemini5hResetFormatted": "",
            "claudeWeeklyPct": 100.0,
            "claudeWeeklyResetTime": "",
            "claudeWeeklyResetTimestamp": 0,
            "claudeWeeklyCountdown": "✨ 滿血可用",
            "claudeWeeklyResetFormatted": "",
            "claude5hPct": 100.0,
            "claude5hResetTime": "",
            "claude5hResetTimestamp": 0,
            "claude5hCountdown": "✨ 滿血可用",
            "claude5hResetFormatted": "",
            "rawModels": {},
            "beaconEvents": [],
            "inferredWeeklyLimit": 5000000,
            "lastSyncedAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    # 1. 收集並讀取授權快取 (desktop/authorized 與 plugin/authorized)
    cache_files = []
    for c_dir in AUTHORIZED_CACHE_DIRS:
        if os.path.exists(c_dir):
            for f in glob.glob(os.path.join(c_dir, "*.json")):
                if os.path.isfile(f) and not (f.endswith(".tmp") or ".tmp." in f):
                    cache_files.append(f)

    # 依優先權（具有官方 quota_summary 之 desktop 快取優先）與修改時間排序
    cache_files.sort(key=lambda x: (1 if "desktop" in x else 0, os.path.getmtime(x)))

    for f in cache_files:
        try:
            with open(f, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            user_email = (data.get("email") or (data.get("user") or {}).get("email") or "").lower().strip()
            if not user_email or user_email not in accounts_data:
                continue

            acc = accounts_data[user_email]
            payload = data.get("payload") or data
            models = payload.get("models", {})

            # 尋找 Claude 與 Gemini 的最低額度與最長冷卻
            c_pct = 100.0
            c_reset_ts = None
            g_pct = 100.0
            g_reset_ts = None

            # 1.1 解析具體模型 models 字典 (對標 Cockpit GUI 的 Claude 與 Gemini Pro 卡片)
            for m_name, m_info in models.items():
                if not isinstance(m_info, dict):
                    continue
                qinfo = m_info.get("quotaInfo", {})
                rem_frac = qinfo.get("remainingFraction")
                if rem_frac is not None:
                    m_pct = float(rem_frac) * 100.0
                else:
                    m_pct = float(m_info.get("remainingPercentage", 100.0))

                reset_raw = qinfo.get("resetTime") or m_info.get("resetTime")
                reset_ts = parse_iso_or_timestamp(reset_raw)

                # 登記 rawModels 給前端詳細檢視
                acc["rawModels"][m_name] = {
                    "pct": int(m_pct),
                    "resetTime": str(reset_raw) if reset_raw else "",
                    "resetTimestamp": reset_ts
                }

                # 分類判斷 (著重於主力旗艦模型，精確對齊 Cockpit GUI)
                m_lower = m_name.lower()
                if any(k in m_lower for k in ["claude-sonnet", "claude-3-5", "claude-3.5", "claude"]):
                    if m_pct < c_pct or c_pct == 100.0:
                        c_pct = m_pct
                        c_reset_ts = reset_ts
                elif any(k in m_lower for k in ["gemini-2.5-pro", "gemini-pro-agent", "gemini-3.1-pro", "gemini-pro"]):
                    if m_pct < g_pct or g_pct == 100.0:
                        g_pct = m_pct
                        g_reset_ts = reset_ts

            # 1.2 🎯 全面精確解析官方 quota_summary（包含 gemini-weekly, gemini-5h, 3p-weekly, 3p-5h）
            qs = payload.get("quota_summary") or data.get("quota_summary") or {}
            has_qs = isinstance(qs, dict) and bool(qs.get("groups"))
            if has_qs:
                for g in qs.get("groups", []):
                    for b in g.get("buckets", []):
                        b_id = b.get("bucketId", "")
                        rf = b.get("remainingFraction")
                        if rf is None:
                            continue
                        b_pct = round(float(rf) * 100.0, 1)
                        b_reset_raw = b.get("resetTime")
                        b_reset_ts = parse_iso_or_timestamp(b_reset_raw)
                        if b_reset_ts and b_reset_ts > now_ts:
                            b_cd_str = format_duration(b_reset_ts - now_ts)
                        else:
                            b_cd_str = "✨ 滿血可用" if b_pct >= 100.0 else "—"
                        b_tw_str = format_reset_time_tw(b_reset_ts)

                        if b_id == "gemini-weekly":
                            acc["geminiWeeklyPct"] = b_pct
                            acc["geminiWeeklyResetTime"] = b_reset_raw or ""
                            acc["geminiWeeklyResetTimestamp"] = int(b_reset_ts * 1000) if b_reset_ts else 0
                            acc["geminiWeeklyCountdown"] = b_cd_str
                            acc["geminiWeeklyResetFormatted"] = b_tw_str
                        elif b_id == "gemini-5h":
                            acc["gemini5hPct"] = b_pct
                            acc["gemini5hResetTime"] = b_reset_raw or ""
                            acc["gemini5hResetTimestamp"] = int(b_reset_ts * 1000) if b_reset_ts else 0
                            acc["gemini5hCountdown"] = b_cd_str
                            acc["gemini5hResetFormatted"] = b_tw_str
                        elif b_id == "3p-weekly":
                            acc["claudeWeeklyPct"] = b_pct
                            acc["claudeWeeklyResetTime"] = b_reset_raw or ""
                            acc["claudeWeeklyResetTimestamp"] = int(b_reset_ts * 1000) if b_reset_ts else 0
                            acc["claudeWeeklyCountdown"] = b_cd_str
                            acc["claudeWeeklyResetFormatted"] = b_tw_str
                        elif b_id == "3p-5h":
                            acc["claude5hPct"] = b_pct
                            acc["claude5hResetTime"] = b_reset_raw or ""
                            acc["claude5hResetTimestamp"] = int(b_reset_ts * 1000) if b_reset_ts else 0
                            acc["claude5hCountdown"] = b_cd_str
                            acc["claude5hResetFormatted"] = b_tw_str
            else:
                # 🛡️ 雙軌 Fallback：若檔案缺少 quota_summary，以旗艦 models 精準補全每週與 5h 額度
                if g_reset_ts:
                    if g_reset_ts - now_ts > 5.5 * 3600:
                        acc["geminiWeeklyPct"] = round(g_pct, 1)
                        acc["geminiWeeklyResetTime"] = ""
                        acc["geminiWeeklyResetTimestamp"] = int(g_reset_ts * 1000)
                        acc["geminiWeeklyCountdown"] = format_duration(g_reset_ts - now_ts)
                        acc["geminiWeeklyResetFormatted"] = format_reset_time_tw(g_reset_ts)
                    else:
                        acc["gemini5hPct"] = round(g_pct, 1)
                        acc["gemini5hResetTime"] = ""
                        acc["gemini5hResetTimestamp"] = int(g_reset_ts * 1000)
                        acc["gemini5hCountdown"] = format_duration(g_reset_ts - now_ts)
                        acc["gemini5hResetFormatted"] = format_reset_time_tw(g_reset_ts)
                if c_reset_ts:
                    if c_reset_ts - now_ts > 5.5 * 3600:
                        acc["claudeWeeklyPct"] = round(c_pct, 1)
                        acc["claudeWeeklyResetTime"] = ""
                        acc["claudeWeeklyResetTimestamp"] = int(c_reset_ts * 1000)
                        acc["claudeWeeklyCountdown"] = format_duration(c_reset_ts - now_ts)
                        acc["claudeWeeklyResetFormatted"] = format_reset_time_tw(c_reset_ts)
                    else:
                        acc["claude5hPct"] = round(c_pct, 1)
                        acc["claude5hResetTime"] = ""
                        acc["claude5hResetTimestamp"] = int(c_reset_ts * 1000)
                        acc["claude5hCountdown"] = format_duration(c_reset_ts - now_ts)
                        acc["claude5hResetFormatted"] = format_reset_time_tw(c_reset_ts)

            # 更新 Claude 數據 (相容舊屬性，取週與5h較嚴苛者)
            c_effective_pct = min(acc.get("claudeWeeklyPct", 100.0), acc.get("claude5hPct", 100.0))
            acc["claudePct"] = int(round(c_effective_pct))
            c_best_ts = max(acc.get("claudeWeeklyResetTimestamp", 0), acc.get("claude5hResetTimestamp", 0)) / 1000.0 or c_reset_ts
            is_c_penalty = bool(c_best_ts and (c_best_ts - now_ts > 5.5 * 3600))
            if c_best_ts and c_best_ts > now_ts and (c_effective_pct < 100.0 or is_c_penalty):
                acc["claudeCooldownUntil"] = int(c_best_ts * 1000)
                acc["claudeCooldown"] = format_duration(c_best_ts - now_ts)
            else:
                acc["claudeCooldownUntil"] = 0
                acc["claudeCooldown"] = "5h 0m"

            # 更新 Gemini 數據 (相容舊屬性，取週與5h較嚴苛者)
            g_effective_pct = min(acc.get("geminiWeeklyPct", 100.0), acc.get("gemini5hPct", 100.0))
            acc["geminiPct"] = int(round(g_effective_pct))
            g_best_ts = max(acc.get("geminiWeeklyResetTimestamp", 0), acc.get("gemini5hResetTimestamp", 0)) / 1000.0 or g_reset_ts
            is_g_penalty = bool(g_best_ts and (g_best_ts - now_ts > 5.5 * 3600))
            # 滿血 (100%) 且無懲罰大牢時，屬於待命備用，不啟動 5h 倒數；僅額度消耗 (<100%) 或遭官方懲罰時方啟動倒數
            if g_best_ts and g_best_ts > now_ts and (g_effective_pct < 100.0 or is_g_penalty):
                acc["geminiCooldownUntil"] = int(g_best_ts * 1000)
                acc["geminiCooldown"] = format_duration(g_best_ts - now_ts)
            else:
                acc["geminiCooldownUntil"] = 0
                acc["geminiCooldown"] = "5h 0m"

        except Exception:
            pass

    # 1.1 補充讀取根目錄快取檔案以獲取更全量資訊 (若存在)
    root_cache_dir = os.path.join(COCKPIT_DIR, "cache", "quota_api_v1_plugin")
    if os.path.exists(root_cache_dir):
        for f in glob.glob(os.path.join(root_cache_dir, "*.json")):
            if not os.path.isfile(f) or f.endswith(".tmp") or ".tmp." in f:
                continue
            try:
                with open(f, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                email = (data.get("user") or {}).get("email", "").lower().strip()
                if not email or email not in accounts_data:
                    continue
                acc = accounts_data[email]
                models = data.get("models", {})
                for m_name, m_info in models.items():
                    if not isinstance(m_info, dict):
                        continue
                    m_pct = float(m_info.get("remainingPercentage", 100.0))
                    reset_raw = m_info.get("resetTime")
                    reset_ts = parse_iso_or_timestamp(reset_raw)
                    acc["rawModels"][m_name] = {
                        "pct": int(m_pct),
                        "resetTime": str(reset_raw) if reset_raw else "",
                        "resetTimestamp": reset_ts
                    }
            except Exception:
                pass

    # 2. 讀取配額歷史記錄 (quota_history/*.json) 挖掘長效冷卻事件 (Beacon Events)
    all_beacons = []
    if os.path.exists(HISTORY_CACHE_DIR):
        for f in glob.glob(os.path.join(HISTORY_CACHE_DIR, "*.json")):
            if not os.path.isfile(f) or f.endswith(".tmp") or ".tmp." in f:
                continue
            try:
                with open(f, "r", encoding="utf-8") as fh:
                    h_data = json.load(fh)
                email = h_data.get("email", "").lower().strip()
                if not email or email not in accounts_data:
                    continue

                acc = accounts_data[email]
                models_hist = h_data.get("models", {})
                
                # 遍歷各模型的記錄字典或陣列 (徹底排除 Claude 數據，專注 Google Gemini 官方 SSOT)
                for m_id, model_entry in models_hist.items():
                    if "claude" in m_id.lower():
                        continue
                    point_list = []
                    if isinstance(model_entry, dict):
                        point_list = model_entry.get("points", [])
                    elif isinstance(model_entry, list):
                        point_list = model_entry

                    # 篩選顯著長效冷卻觸發點 (倒數 >= 86400 秒且百分比 <= 25%)
                    candidate_points = []
                    for r in point_list:
                        if not isinstance(r, dict):
                            continue
                        cd_sec = r.get("countdownSeconds", 0)
                        rem_p = r.get("remainingPercentage", 100)
                        ts_ms = r.get("timestamp", 0)
                        is_start = r.get("isStart", False)
                        if cd_sec >= 86400 and rem_p <= 25 and (is_start or cd_sec > 90000):
                            candidate_points.append((ts_ms, cd_sec, rem_p, is_start))

                    # 依時間由新到舊排序，並以 36 小時為單一冷卻事件窗口去重（避免一次多日冷卻倒數被切碎成多筆信標）
                    candidate_points.sort(key=lambda x: x[0], reverse=True)
                    deduped = []
                    for ts_ms, cd_sec, rem_p, is_start in candidate_points:
                        if not any(abs(ts_ms - d[0]) < 36 * 3600 * 1000 for d in deduped):
                            deduped.append((ts_ms, cd_sec, rem_p, is_start))

                    clean_model_name = "Gemini" if any(k in m_id.lower() for k in ["gemini", "g3"]) else ("Claude" if "claude" in m_id.lower() else m_id)

                    for ts_ms, cd_sec, rem_p, is_start in deduped[:5]: # 每個模型最多取最新 5 次事件
                        # 若該帳號已收錄 2 小時內的相近冷卻點，略過避免多模型 (如 g3-pro / g3-flash) 產生雙胞胎
                        if any(abs(ts_ms - b["timestamp"]) < 2 * 3600 * 1000 for b in acc["beaconEvents"]):
                            continue

                        beacon_id = f"beacon_{email}_{int(ts_ms)}"
                        # 🛡️ 墓碑黑名單攔截：若使用者已手動刪除此信標，嚴禁再次生成復活！
                        if beacon_id in dismissed_set:
                            continue

                        event_dt = datetime.datetime.fromtimestamp(ts_ms / 1000.0) if ts_ms else datetime.datetime.now()
                        time_str = event_dt.strftime("%Y-%m-%d %H:%M")
                        beacon = {
                            "id": beacon_id,
                            "email": email,
                            "model": clean_model_name,
                            "timestamp": ts_ms,
                            "time": time_str,
                            "remainingPct": round(rem_p, 1),
                            "cooldownStr": format_duration(cd_sec),
                            "cooldownSeconds": cd_sec,
                            "tokensAtCooldown": 5000000, # Gemini 基準 5.00M
                            "tokensM": "5.00",
                            "note": f"實測跌落至 {round(rem_p, 1)}% 觸發 {format_duration(cd_sec)} 長效冷卻"
                        }
                        acc["beaconEvents"].append(beacon)
                        all_beacons.append(beacon)

            except Exception:
                pass

    # 3. 雙數據對撞推論：利用真實對話日誌推算長效冷卻觸發時的前 7 天 Token 用量 (嚴格帳號隔離與合理性邊界)
    if conversations and isinstance(conversations, list):
        for acc in accounts_data.values():
            if acc["beaconEvents"]:
                # 排序取最近一次長效冷卻
                acc["beaconEvents"].sort(key=lambda x: x["timestamp"], reverse=True)
                latest_b = acc["beaconEvents"][0]
                b_time_sec = latest_b["timestamp"] / 1000.0
                seven_days_prior = b_time_sec - (7 * 86400)

                # 統計該時間前 7 天內「該帳號名下」的總用量
                window_tokens = 0
                for c in conversations:
                    c_acc = (c.get("email") or c.get("account") or "").lower().strip()
                    # 嚴格帳號隔離：若對話未指定帳號或帳號不符合，嚴禁計入該帳號
                    if not c_acc or c_acc != acc["email"].lower():
                        continue
                    c_time_str = c.get("time") or c.get("last_time_str", "")
                    tokens = c.get("tokens") or c.get("total_tokens", 0)
                    try:
                        c_dt = datetime.datetime.strptime(c_time_str[:16], "%Y-%m-%d %H:%M")
                        c_ts = c_dt.timestamp()
                        if seven_days_prior <= c_ts <= b_time_sec:
                            window_tokens += tokens
                    except Exception:
                        pass

                # 合理性邊界守門員 (Sanity Check)：單一帳號每週額度應落在 50萬 ~ 1000萬 之間 (Gemini 滾動高吞吐)
                if 500000 <= window_tokens <= 10000000:
                    acc["inferredWeeklyLimit"] = window_tokens
                    latest_b["tokensAtCooldown"] = window_tokens
                    latest_b["tokensM"] = f"{window_tokens / 1000000:.2f}"
                    latest_b["note"] = f"實測跌落至 {latest_b['remainingPct']:.1f}% 觸發 {latest_b['cooldownStr']} 冷卻時，當周累積 {latest_b['tokensM']}M Tokens"
                else:
                    # 若為異常值或無對應帳號記錄，維持官方安全基準 5.00M
                    acc["inferredWeeklyLimit"] = 5000000
                    latest_b["tokensAtCooldown"] = 5000000
                    latest_b["tokensM"] = "5.00"
                    latest_b["note"] = f"實測跌落至 {latest_b['remainingPct']:.1f}% 觸發 {latest_b['cooldownStr']} 長效冷卻"

    # 4. 偵測當前服役帳號 (優先讀取 Cockpit 核心設定 current_account.json / accounts.json，其次 state.vscdb)
    active_email = "cengjieling33@gmail.com" # 預設服役
    try:
        curr_acc_file = os.path.join(COCKPIT_DIR, "current_account.json")
        if os.path.exists(curr_acc_file):
            with open(curr_acc_file, "r", encoding="utf-8") as f:
                c_data = json.load(f)
                if c_data.get("email") and c_data["email"].lower() in accounts_data:
                    active_email = c_data["email"].lower().strip()
        else:
            accs_file = os.path.join(COCKPIT_DIR, "accounts.json")
            if os.path.exists(accs_file):
                with open(accs_file, "r", encoding="utf-8") as f:
                    a_data = json.load(f)
                    cur_id = a_data.get("current_account_id")
                    for a in a_data.get("accounts", []):
                        if a.get("id") == cur_id and a.get("email") and a["email"].lower() in accounts_data:
                            active_email = a["email"].lower().strip()
                            break
    except Exception:
        pass

    try:
        import sqlite3
        vscdb_path = os.path.expandvars(r"%APPDATA%\Antigravity IDE\User\globalStorage\state.vscdb")
        if os.path.exists(vscdb_path):
            conn = sqlite3.connect(vscdb_path)
            cur = conn.cursor()
            cur.execute("SELECT value FROM ItemTable WHERE key='jlcodes.antigravity-cockpit';")
            row = cur.fetchone()
            if row:
                d = json.loads(row[0])
                cand = d.get("antigravity.autoTrigger.activeAccount")
                if cand and cand.lower() in accounts_data:
                    active_email = cand.lower()
            conn.close()
    except Exception:
        pass

    for em, acc in accounts_data.items():
        acc["isActive"] = (em == active_email.lower())

    # 5. 全域信標去重 (同帳號同時間戳或 1 小時內重複模型只留一筆)
    all_beacons.sort(key=lambda x: x["timestamp"], reverse=True)
    deduped_beacons = []
    seen_beacon_keys = set()
    for b in all_beacons:
        if b["id"] in dismissed_set:
            continue
        # 以帳號與粗略時間 (1 小時) 為唯一鍵去重
        hour_slot = int(b["timestamp"] / (3600 * 1000))
        b_key = (b["email"], hour_slot)
        if b_key not in seen_beacon_keys:
            seen_beacon_keys.add(b_key)
            deduped_beacons.append(b)

    top_beacons = [b for b in deduped_beacons if b["id"] not in dismissed_set][:20]

    # 轉為陣列返回
    result_accounts = list(accounts_data.values())
    return {
        "accounts": result_accounts,
        "cooldownIncidents": top_beacons,
        "activeAccount": active_email,
        "syncedAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    summary = get_cockpit_quota_summary()
    print(f"✅ Cockpit 串接摘要: 共 {len(summary['accounts'])} 組核心帳號")
    for a in summary["accounts"]:
        print(f"  • {a['email']}: Claude={a['claudePct']}% ({a['claudeCooldown']}), Gemini={a['geminiPct']}% ({a['geminiCooldown']}), Active={a['isActive']}, 推論週額度={a['inferredWeeklyLimit']:,}")
    print(f"  • 偵測到 {len(summary['cooldownIncidents'])} 筆歷史長效冷卻信標")

