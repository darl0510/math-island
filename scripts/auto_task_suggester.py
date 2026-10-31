#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
auto_task_suggester.py
======================
專案自律推演與待辦動機回寫引擎 (Autonomous Task Discovery & Handover Injector)。
當 PROJECT_HANDOVER.md 的待辦清單清空 (Pending Tasks == 0) 或僅剩最後一項被驗收時：
1. 自動分析當前工作區狀態（Git 變更、未納管資源、近期里程碑、測試覆蓋與 TODO）
2. 結構化推演 3 項高價值原子待辦，並明確闡述「💡 自動生成原因 / 開發動機」
3. 自動回寫 PROJECT_HANDOVER.md 待辦看板，並將第一項任務合成至頂部 Prompt 派工命令
讓本地端 AI (8080 苦力) 與雲端 Agent 接軌時永不中斷，自主推動專案演進。
"""

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class WorkspaceAnalyzer:
    """分析工作區實體檔案、Git 狀態與 Handover 歷史。"""

    def __init__(self, ws: Path):
        self.ws = ws
        self.handover_path = ws / "PROJECT_HANDOVER.md"

    def get_recent_done_milestones(self) -> List[str]:
        """從 Handover 提取近期已完成的核心里程碑（依版號降序優先排序）。"""
        if not self.handover_path.is_file():
            return []
        try:
            content = self.handover_path.read_text(encoding="utf-8")
        except Exception:
            return []

        # 匹配 - [x] **(任務標題)**
        done_pat = re.compile(r"-\s*\[x\]\s*(\*{0,2}(?:【[^】]+】)?([^*]+)\*{0,2}[^\r\n]*)")
        items = [m.group(1).strip() for m in done_pat.finditer(content)]

        def _ver_key(item: str) -> Tuple[int, int, int]:
            vm = re.search(r"v?(\d+)\.(\d+)\.(\d+)", item)
            if vm:
                return (int(vm.group(1)), int(vm.group(2)), int(vm.group(3)))
            return (0, 0, 0)

        # 依版號降序排列，取最新 5 項
        sorted_items = sorted(items, key=_ver_key, reverse=True)
        return sorted_items[:5]

    def get_git_status(self) -> Dict[str, List[str]]:
        """取得工作區未追蹤 (untracked) 與已修改 (modified) 檔案清單。"""
        res = {"untracked": [], "modified": []}
        try:
            out = subprocess.check_output(
                ["git", "status", "--porcelain"],
                cwd=str(self.ws),
                stderr=subprocess.DEVNULL,
                timeout=5,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            for line in out.splitlines():
                line = line.strip()
                if line.startswith("??"):
                    res["untracked"].append(line[2:].strip())
                elif line.startswith("M") or " M " in line or line.startswith("A"):
                    parts = line.split(maxsplit=1)
                    if len(parts) > 1:
                        res["modified"].append(parts[1].strip())
        except Exception:
            pass
        return res

    def check_sw_cache_discrepancy(self, untracked: List[str], modified: List[str]) -> List[str]:
        """檢查 sw.js 是否遺漏新加入的靜態資源。"""
        sw_file = self.ws / "sw.js"
        if not sw_file.is_file():
            return []

        try:
            sw_text = sw_file.read_text(encoding="utf-8")
        except Exception:
            return []

        all_candidates = untracked + modified
        missing = []
        for path_str in all_candidates:
            p = Path(path_str)
            # 僅檢查 assets, img, audio, css, js 靜態資產
            if p.suffix in (".js", ".css", ".png", ".jpg", ".svg", ".mp3", ".json"):
                if "assets" in p.parts or "js" in p.parts or "css" in p.parts:
                    base_name = p.name
                    if base_name not in sw_text and str(p).replace("\\", "/") not in sw_text:
                        missing.append(path_str)
        return missing[:5]

    def check_missing_tests(self, new_or_mod_js: List[str]) -> List[str]:
        """檢查新加入或修改的 JS/PY 模組是否缺乏對應測試。"""
        missing_tests = []
        test_dir = self.ws / "scripts"
        tests_dir = self.ws / "tests"

        for f in new_or_mod_js:
            p = Path(f)
            if p.suffix in (".js", ".mjs", ".py") and not p.name.startswith("test_"):
                # 排除 scripts, tools 本身
                if "scripts" in p.parts or "tools" in p.parts:
                    continue
                test_name_1 = f"test_{p.stem}{p.suffix}"
                test_name_2 = f"test_{p.stem}.mjs"
                has_test = False
                for d in (test_dir, tests_dir):
                    if (d / test_name_1).is_file() or (d / test_name_2).is_file():
                        has_test = True
                        break
                if not has_test:
                    missing_tests.append(p.name)
        return missing_tests[:3]


class TaskDeductionEngine:
    """根據分析數據，結構化推演 3 項接地原子待辦與生成原因。"""

    def __init__(self, ws: Path, analyzer: WorkspaceAnalyzer):
        self.ws = ws
        self.analyzer = analyzer

    def deduce_tasks(self) -> List[Tuple[str, str]]:
        """
        回傳 List[Tuple[task_markdown_line, rationale_text]]
        包含：
        1. 延伸核心功能 (Feature Evolution)
        2. 架構閉環與整合 (Architecture & Asset Integration)
        3. 質量防禦與自檢測試 (Quality Assurance & Tests)
        """
        recent_dones = self.analyzer.get_recent_done_milestones()
        git_info = self.analyzer.get_git_status()
        missing_sw = self.analyzer.check_sw_cache_discrepancy(
            git_info["untracked"], git_info["modified"]
        )
        missing_tests = self.analyzer.check_missing_tests(
            git_info["untracked"] + git_info["modified"]
        )

        project_name = self.ws.name.lower()
        latest_done_text = recent_dones[0] if recent_dones else ""

        tasks: List[Tuple[str, str]] = []

        # ── 任務 1：延伸核心功能 (Feature Evolution) ────────────────────────
        t1, r1 = self._deduce_feature_task(project_name, latest_done_text, git_info)
        tasks.append((t1, r1))

        # ── 任務 2：架構閉環與資產整合 (Architecture & Asset Integration) ──
        t2, r2 = self._deduce_architecture_task(missing_sw, git_info, latest_done_text)
        tasks.append((t2, r2))

        # ── 任務 3：質量防禦與自檢測試 (Quality Assurance & Tests) ─────────
        t3, r3 = self._deduce_quality_task(missing_tests, latest_done_text)
        tasks.append((t3, r3))

        return tasks

    def _deduce_feature_task(
        self, project_name: str, latest_done: str, git_info: Dict[str, List[str]]
    ) -> Tuple[str, str]:
        """推演第 1 項：核心功能演進。"""
        # 特殊專案識別：math-island
        if "math" in project_name or "island" in project_name:
            if "怪獸" in latest_done or "角色" in latest_done or "戰鬥" in latest_done:
                title = "【大魔王戰鬥階段 3】魔王血量 HP 條、受擊震動與連續答對大招反饋"
                desc = "支援魔王即時血條顯示、正確作答觸發連擊大招特效、怪獸扣血動態與瀕死警示"
                rationale = (
                    "前期版本已實裝角色選擇與怪獸懸浮徽章，但尚缺實質 HP 數值對抗與大招視覺激勵；"
                    "補足血條機制能直接閉環戰鬥回饋循環，顯著提升學童作答臨場感與成就感。"
                )
                return f"- [ ] **{title}** ({desc})", rationale
            elif "星幣" in latest_done or "道具" in latest_done or "商店" in latest_done:
                title = "【經濟系統階段 2】冒險商店兌換與角色裝扮外觀解鎖"
                desc = "支援累積星幣購買仙女棒道具、解鎖專屬角色徽章與進度保存"
                rationale = (
                    "已完成基礎星幣獎勵產出，延伸建立道具兌換與造型獎勵機制可形成完整正向激勵閉環。"
                )
                return f"- [ ] **{title}** ({desc})", rationale

        # 總控中心或通用專案
        if "command" in project_name or "center" in project_name:
            title = "【總控監控自動化】各專案 Handover 看板健康度與待辦斷鏈主動警報"
            desc = "擴充 central_dashboard 探針，即時標記待辦為空或版號漂移之專案"
            rationale = (
                "總控中心核心職責為 23 大專案治理，建立 Handover 待辦斷鏈巡檢能確保跨專案 AI 保持自律推進。"
            )
            return f"- [ ] **{title}** ({desc})", rationale

        # 基於最新里程碑推導通用下一動
        clean_done = re.sub(r"[\*`]", "", latest_done).strip()
        if clean_done:
            title = f"【進階互動優化】基於「{clean_done[:18]}...」之操作反饋與異常邊界適配"
            desc = "補充使用者互動過渡動效、移動端觸控體驗與資料本地持久化"
            rationale = (
                f"接續甫完成之「{clean_done[:25]}」，進一步強化邊界交互與持久化，避免狀態非預期遺失。"
            )
            return f"- [ ] **{title}** ({desc})", rationale

        title = "【核心架構演進】檢視現有模組邊界並實裝下一階段功能原型"
        desc = "梳理模組呼叫路徑，實作關鍵業務邏輯並建立標準介面契約"
        rationale = "當前任務清單已全數交付，依循架構規範推演下一階段核心業務邏輯。"
        return f"- [ ] **{title}** ({desc})", rationale

    def _deduce_architecture_task(
        self, missing_sw: List[str], git_info: Dict[str, List[str]], latest_done: str
    ) -> Tuple[str, str]:
        """推演第 2 項：架構閉環與資產整合。"""
        if missing_sw:
            sample_files = ", ".join(missing_sw[:2])
            title = "【離線快取同步】Service Worker 納管新增靜態資源與腳本"
            desc = f"將 {sample_files} 等新產出資產完整註冊進 sw.js 離線快取清單"
            rationale = (
                f"靜態探針檢測到專案近期新增資產 ({sample_files}) 尚未被 sw.js 快取宣告納管；"
                "若未同步註冊，學童或使用者在離線或弱網環境載入時將發生 404 資源缺損。"
            )
            return f"- [ ] **{title}** ({desc})", rationale

        if git_info["untracked"]:
            sample = ", ".join(git_info["untracked"][:2])
            title = "【資產架構正規化】梳理新產出檔案結構與模組導出宣告"
            desc = f"標準化 {sample} 之模組路徑、導入依賴與全域命名空間綁定"
            rationale = (
                f"檢測到工作區存在未追蹤之獨立模組 ({sample})，需完成路徑正規化與掛載，確保模組架構乾淨。"
            )
            return f"- [ ] **{title}** ({desc})", rationale

        title = "【系統強固防禦】狀態持久化防抹除與跨設備同步容錯"
        desc = "檢查 LocalStorage / IndexedDB 讀寫防崩潰機制，加入 Try-Catch 與版本遷移相容保護"
        rationale = "確保在多端瀏覽器無痕模式、儲存空間受限或格式升級時，使用者進度永不遺失。"
        return f"- [ ] **{title}** ({desc})", rationale

    def _deduce_quality_task(
        self, missing_tests: List[str], latest_done: str
    ) -> Tuple[str, str]:
        """推演第 3 項：質量防禦與自檢測試。"""
        if missing_tests:
            sample = ", ".join(missing_tests)
            title = f"【質量自檢驗收】實裝 {sample} 之自動化單元測試與邊界驗證"
            desc = "編寫獨立測試腳本，覆蓋關鍵函式調用、極值輸入與錯誤降級路徑，達成 100% 綠燈"
            rationale = (
                f"代碼審查檢測到模組 ({sample}) 尚無對應之獨立單元測試覆蓋；"
                "補齊測試腳本為苦力自檢驗收之核心防線，能防止後續迭代產生隱蔽回退。"
            )
            return f"- [ ] **{title}** ({desc})", rationale

        title = "【端到端自檢加固】核心業務流程整合測試與語法健全度查驗"
        desc = "運行語法驗證 (node --check / python -m py_compile) 與端到端流程整合驗證"
        rationale = "為新實裝模組建立回歸防線，確保各模組相互串接後零運行時錯誤。"
        return f"- [ ] **{title}** ({desc})", rationale


def suggest_and_inject_tasks(
    ws: Path,
    new_ver: Optional[str] = None,
    dry_run: bool = False,
    force_inject: bool = False,
) -> Tuple[bool, List[Tuple[str, str]], str]:
    """
    主進入點：檢查 Handover 看板，若待辦為空（或 force_inject=True），自動推演並回寫。
    回傳：(is_injected, generated_tasks, next_cmd)
    """
    handover_path = ws / "PROJECT_HANDOVER.md"
    if not handover_path.is_file():
        return False, [], ""

    text = handover_path.read_text(encoding="utf-8")
    focus_pat = re.compile(
        r"##\s*[📌🎯]?\s*(?:當前推進焦點看板|核心待辦與後續推進焦點看板)\s*\(Active\s*(?:Focus|Tasks)\)[^\r\n]*"
    )
    fold_pat = re.compile(
        r"<summary>[^<]*(?:過往已完成歷史任務|已完成歷史任務|點擊展開過往已完成)[^<]*</summary>"
    )
    focus_match = focus_pat.search(text)
    fold_match = fold_pat.search(text)

    if not focus_match or not fold_match:
        return False, [], ""

    focus_idx = focus_match.start()
    fold_idx = fold_match.start()
    active_section = text[focus_idx:fold_idx]

    task_pat = re.compile(r"-\s*\[\s*\]\s*(\*{0,2}(?:【[^】]+】)?([^*]+)\*{0,2}[^\r\n]*)")
    matches = list(task_pat.finditer(active_section))

    # 若尚有未完成待辦且非強制注入，無需推演
    if matches and not force_inject:
        return False, [], ""

    print("  🧭 [Auto-Task-Suggester] 待辦清單為空，啟動專案自律推演引擎...")
    analyzer = WorkspaceAnalyzer(ws)
    engine = TaskDeductionEngine(ws, analyzer)
    generated = engine.deduce_tasks()

    if not generated:
        return False, [], ""

    # 格式化待辦項目（含動機標籤）
    injected_lines = []
    for task_line, rationale in generated:
        injected_lines.append(f"{task_line}\n  > 💡 **自動生成原因**：{rationale}")

    tasks_block = "\n\n".join(injected_lines) + "\n\n"

    # 定位插入點：找到 ### 🎯 待執行任務清單 下方
    pending_header_pat = re.compile(r"(###\s*🎯\s*待執行任務清單[^\r\n]*)")
    p_match = pending_header_pat.search(active_section)

    if p_match:
        insert_rel_pos = p_match.end()
        # 跳過換行與可能存在的分隔線 ---
        rest = active_section[insert_rel_pos:]
        div_pat = re.compile(r"^([\s\r\n]*(?:---[\s\r\n]*)?)", re.M)
        div_match = div_pat.match(rest)
        if div_match:
            insert_rel_pos += div_match.end()

        active_section_new = (
            active_section[:insert_rel_pos] + "\n" + tasks_block + active_section[insert_rel_pos:]
        )
    else:
        # 若未找到 pending 標題，直接插入在 active_section 頂部
        active_section_new = active_section + "\n" + tasks_block

    text_new = text[:focus_idx] + active_section_new + text[fold_idx:]

    # 提取第 1 項任務純標題，更新頂部單行派工命令
    first_task_full = generated[0][0]
    m_title = re.search(r"-\s*\[\s*\]\s*(\*{0,2}(?:【[^】]+】)?([^*]+)\*{0,2})", first_task_full)
    if m_title:
        raw_t = m_title.group(1).strip()
        clean_title = re.sub(r"[\*`]", "", raw_t).strip()
    else:
        clean_title = "實作核心模組演進與自檢測試"

    next_cmd = f'python scripts/brain_delegator.py -w . -t "實作{clean_title}"'

    # 更新頂部單行派工命令
    prompt_cmd_pat = re.compile(
        r"(【⚡\s*單行派工命令[^\r\n]*】[\s\r\n]*)python scripts/brain_delegator\.py[^\r\n]+"
    )
    text_new, n_cmd = prompt_cmd_pat.subn(rf"\g<1>{next_cmd}", text_new)

    # 若指定了版號，同步校正頂部問候語
    if new_ver:
        ver_pat = re.compile(r"(【v?)\d+\.\d+\.\d+(】\s*你好[！!][^\r\n]*)")
        text_new, _ = ver_pat.subn(rf"\g<1>{new_ver}\g<2>", text_new)

    if not dry_run:
        handover_path.write_text(text_new, encoding="utf-8")

    print(f"  ✔ [Auto-Task-Suggester] 成功推演並回寫 {len(generated)} 項結構化待辦：")
    for i, (t, r) in enumerate(generated, 1):
        print(f"     {i}. {t[:50]}...")
        print(f"        └─ 💡 動機: {r[:40]}...")
    print(f"  🚀 頂部派工命令已同步更新：\n     {next_cmd}")

    return True, generated, next_cmd


def main():
    parser = argparse.ArgumentParser(
        description="Auto task discovery and handover injector."
    )
    parser.add_argument(
        "--workspace",
        default=".",
        help="Target workspace root (default: current directory)",
    )
    parser.add_argument(
        "--inject",
        action="store_true",
        help="Force task deduction and injection even if tasks exist",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print suggested tasks without writing to disk",
    )
    args = parser.parse_args()

    ws = Path(args.workspace).resolve()
    if not ws.is_dir():
        print(f"[ERROR] 工作區不存在: {ws}", file=sys.stderr)
        sys.exit(1)

    ok, tasks, cmd = suggest_and_inject_tasks(
        ws, dry_run=args.dry_run, force_inject=args.inject
    )
    if not ok:
        print("  [INFO] 看板尚有未完成任務，且未指定 --inject，未執行注入。")
        sys.exit(0)


if __name__ == "__main__":
    main()
