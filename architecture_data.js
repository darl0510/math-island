// 本檔案由 scan_architecture.py 自動生成，供 architecture_dashboard.html 離線預載
window.ARCHITECTURE_LIVE_DATA = {
  "status": "success",
  "project_name": "math-island",
  "version": "v2.0.0",
  "entrypoint": "server.py",
  "app_lines": 36,
  "total_lines": 5698,
  "total_files": 11,
  "summary": {
    "total_lines": 5698,
    "total_files": 11,
    "healthy_count": 9,
    "watch_count": 1,
    "alert_count": 1,
    "health_pct": 81.8
  },
  "categories": [
    {
      "id": "toolkit",
      "name": "🛠️ 運維自動化工具"
    },
    {
      "id": "service",
      "name": "⚡ 核心服務引擎"
    },
    {
      "id": "custom",
      "name": "📦 專案核心模組"
    },
    {
      "id": "web_entry",
      "name": "🌐 Web 入口與藍圖"
    }
  ],
  "modules": [
    {
      "fname": "auto_backup.py",
      "cat": "toolkit",
      "catName": "🛠️ 運維自動化工具",
      "role": "🆕 🛠️ 運維自動化與工具鏈",
      "lines": 735,
      "limit": 800,
      "desc": "動態掃描自動納入之模組，實時監控代碼健康度。",
      "symbols": [
        "get_file_sha256",
        "collect_files_to_backup",
        "perform_backup",
        "cleanup_old_backups",
        "is_major_version",
        "perform_major_backup",
        "perform_data_backup",
        "perform_version_backup"
      ],
      "governance": "自動感知並即時納入平鋪架構監控體系。",
      "is_dynamic": true
    },
    {
      "fname": "cleanup_service.py",
      "cat": "service",
      "catName": "⚡ 核心服務引擎",
      "role": "🆕 ⚡ 專案核心業務服務",
      "lines": 220,
      "limit": 1000,
      "desc": "動態掃描自動納入之模組，實時監控代碼健康度。",
      "symbols": [
        "format_file_size",
        "scan_redundant_files",
        "clean_redundant_files"
      ],
      "governance": "自動感知並即時納入平鋪架構監控體系。",
      "is_dynamic": true
    },
    {
      "fname": "cloud_sync.py",
      "cat": "custom",
      "catName": "📦 專案核心模組",
      "role": "🆕 📦 專案自訂業務模組",
      "lines": 778,
      "limit": 1000,
      "desc": "動態掃描自動納入之模組，實時監控代碼健康度。",
      "symbols": [
        "Colors",
        "colorize",
        "get_default_config",
        "find_config_path",
        "load_config",
        "save_config",
        "detect_local_base",
        "get_all_candidate_local_bases"
      ],
      "governance": "自動感知並即時納入平鋪架構監控體系。",
      "is_dynamic": true
    },
    {
      "fname": "cockpit_service.py",
      "cat": "service",
      "catName": "⚡ 核心服務引擎",
      "role": "🆕 ⚡ 專案核心業務服務",
      "lines": 622,
      "limit": 1000,
      "desc": "動態掃描自動納入之模組，實時監控代碼健康度。",
      "symbols": [
        "parse_iso_or_timestamp",
        "format_reset_time_tw",
        "format_duration",
        "refresh_quotas_via_google_api",
        "get_cockpit_quota_summary"
      ],
      "governance": "自動感知並即時納入平鋪架構監控體系。",
      "is_dynamic": true
    },
    {
      "fname": "package_toolkit.py",
      "cat": "toolkit",
      "catName": "🛠️ 運維自動化工具",
      "role": "🆕 🛠️ 運維自動化與工具鏈",
      "lines": 350,
      "limit": 800,
      "desc": "動態掃描自動納入之模組，實時監控代碼健康度。",
      "symbols": [
        "get_current_project_version",
        "build_readme_content",
        "collect_toolkit_files",
        "export_toolkit"
      ],
      "governance": "自動感知並即時納入平鋪架構監控體系。",
      "is_dynamic": true
    },
    {
      "fname": "restore_backup.py",
      "cat": "custom",
      "catName": "📦 專案核心模組",
      "role": "🆕 📦 專案自訂業務模組",
      "lines": 93,
      "limit": 1000,
      "desc": "動態掃描自動納入之模組，實時監控代碼健康度。",
      "symbols": [
        "list_backups",
        "restore_backup",
        "main"
      ],
      "governance": "自動感知並即時納入平鋪架構監控體系。",
      "is_dynamic": true
    },
    {
      "fname": "scan_architecture.py",
      "cat": "toolkit",
      "catName": "🛠️ 運維自動化工具",
      "role": "🆕 🛠️ 運維自動化與工具鏈",
      "lines": 592,
      "limit": 800,
      "desc": "動態掃描自動納入之模組，實時監控代碼健康度。",
      "symbols": [
        "extract_symbols_from_file",
        "guess_category_and_role",
        "scan_project_architecture",
        "export_architecture_js_snapshot",
        "ArchitectureDashboardHTTPHandler",
        "is_port_in_use",
        "is_server_for_this_project",
        "is_server_alive"
      ],
      "governance": "自動感知並即時納入平鋪架構監控體系。",
      "is_dynamic": true
    },
    {
      "fname": "scan_tokens.py",
      "cat": "toolkit",
      "catName": "🛠️ 運維自動化工具",
      "role": "🆕 🛠️ 運維自動化與工具鏈",
      "lines": 1144,
      "limit": 800,
      "desc": "動態掃描自動納入之模組，實時監控代碼健康度。",
      "symbols": [
        "get_antigravity_brain_dirs",
        "estimate_tokens",
        "detect_project_from_snippet",
        "scan_all_transcripts",
        "TokenDashboardHTTPHandler",
        "is_server_running",
        "trigger_remote_scan",
        "start_server"
      ],
      "governance": "自動感知並即時納入平鋪架構監控體系。",
      "is_dynamic": true
    },
    {
      "fname": "semantic_reflex_cache.py",
      "cat": "custom",
      "catName": "📦 專案核心模組",
      "role": "🆕 📦 專案自訂業務模組",
      "lines": 747,
      "limit": 1000,
      "desc": "動態掃描自動納入之模組，實時監控代碼健康度。",
      "symbols": [
        "SemanticReflexCache",
        "get_semantic_cache",
        "normalize_query_for_cache",
        "get_cache_stats_summary"
      ],
      "governance": "自動感知並即時納入平鋪架構監控體系。",
      "is_dynamic": true
    },
    {
      "fname": "server.py",
      "cat": "web_entry",
      "catName": "🌐 Web 入口與藍圖",
      "role": "🆕 🌐 Web 路由與入口模組",
      "lines": 36,
      "limit": 850,
      "desc": "動態掃描自動納入之模組，實時監控代碼健康度。",
      "symbols": [
        "Handler"
      ],
      "governance": "自動感知並即時納入平鋪架構監控體系。",
      "is_dynamic": true
    },
    {
      "fname": "skill_router.py",
      "cat": "custom",
      "catName": "📦 專案核心模組",
      "role": "🆕 📦 專案自訂業務模組",
      "lines": 381,
      "limit": 1000,
      "desc": "動態掃描自動納入之模組，實時監控代碼健康度。",
      "symbols": [
        "DynamicSkillRouter",
        "compute_dual_track_savings"
      ],
      "governance": "自動感知並即時納入平鋪架構監控體系。",
      "is_dynamic": true
    }
  ]
};
