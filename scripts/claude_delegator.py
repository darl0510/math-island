#!/usr/bin/env python3
"""
claude_delegator.py — Cross-Workspace Claude Task Delegator
============================================================
Features:
  1. Dual-Workspace Live State Mirroring
  2. Live Stream Throttling (1s debounce) during execution
  3. Auto-open Modified Files in IDE (VS Code / Antigravity CLI)
  4. --terminal flag for Windows independent colored terminal window
"""

import argparse
import json
import os
import re
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────
LIVE_FILENAME = ".delegator_live.json"
STREAM_THROTTLE_SEC = 1.0
MAX_PREVIEW_CHARS = 2000
MAX_AUTO_OPEN_FILES = 3
MAX_TOOL_EVENTS = 25
TOOL_INPUT_KEYS = (
    "file_path",
    "path",
    "pattern",
    "command",
    "query",
    "prompt",
    "description",
    "url",
    "skill",
)
TOOL_LINE_PATTERNS = [
    r"• ",
    r"Running",
    r"Editing",
    r"Verifying",
    r"Reading",
    r"Diff",
    r"\[strata\]",
    r"\[antigravity\]",
    r"tool_use",
    r"tool_result",
    r"file_write",
    r"file_edit",
    r"bash",
    r"grep",
    r"glob",
]


# ─────────────────────────────────────────────
# Utility helpers
# ─────────────────────────────────────────────
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_json_write(path: Path, data: dict) -> None:
    """Atomically write JSON to *path* (write-to-tmp then rename)."""
    tmp = path.with_suffix(".tmp")
    try:
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(path)
    except OSError as exc:
        print(f"[delegator] WARN: failed to write {path}: {exc}", file=sys.stderr)


def _detect_workspace_root(start: Path) -> Path:
    """Walk upward to find the nearest .git directory or project marker."""
    cur = start.resolve()
    for _ in range(12):
        if (cur / ".git").exists():
            return cur
        if (cur / "pyproject.toml").exists() or (cur / "package.json").exists():
            return cur
        parent = cur.parent
        if parent == cur:
            break
        cur = parent
    return start.resolve()


def _project_name(workspace: Path) -> str:
    return workspace.name


def _project_version(workspace: Path) -> str:
    """Read the live version from package.json so the sidebar monitor never
    shows a stale hard-coded version string."""
    try:
        pkg = json.loads((workspace / "package.json").read_text(encoding="utf-8"))
        version = pkg.get("version")
        if isinstance(version, str) and version.strip():
            return version.strip()
    except (OSError, ValueError):
        pass
    return "0.0.0"


# ─────────────────────────────────────────────
# 1. Dual-Workspace Live State Mirroring
# ─────────────────────────────────────────────
def update_live_status(
    target_workspace: Path,
    caller_workspace: Path,
    task_desc: str,
    status: str,
    *,
    preview: str = "",
    tool_line: str = "",
    modified_files: Optional[list] = None,
    output_file: Optional[str] = None,
    tool_events: Optional[list] = None,
    extra: Optional[dict] = None,
) -> None:
    """
    Write .delegator_live.json to BOTH workspaces simultaneously.
    - target_workspace: the --workspace argument root
    - caller_workspace: os.getcwd() root (the IDE sidebar watches this)
    """
    base_payload = {
        "active": status in ("running", "streaming", "queued"),
        "status": status,
        "version": _project_version(target_workspace),
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "step": tool_line or f"⚙️ {status}",
        "task": task_desc,
        "preview": preview[:MAX_PREVIEW_CHARS],
        "toolLine": tool_line,
        "toolEvents": tool_events or [],
        "modifiedFiles": modified_files or [],
        "outputFile": output_file or "",
        "updatedAt": time.time(),
        "model": "claude-code-local-8080",
        "delegator": "Claude-Code-Autonomous-Worker",
    }
    if extra:
        base_payload.update(extra)

    # (a) Target workspace copy
    target_path = target_workspace / LIVE_FILENAME
    target_payload = dict(base_payload)
    target_payload["workspace"] = str(target_workspace)
    target_payload["project"] = _project_name(target_workspace)
    _safe_json_write(target_path, target_payload)

    # (b) Caller workspace copy — title prefixed with target project name
    if caller_workspace != target_workspace:
        caller_path = caller_workspace / LIVE_FILENAME
        caller_payload = dict(base_payload)
        caller_payload["workspace"] = str(caller_workspace)
        caller_payload["project"] = _project_name(caller_workspace)
        caller_payload["version"] = _project_version(caller_workspace)
        caller_payload["title"] = f"[{_project_name(target_workspace)}] {task_desc}"
        caller_payload["sourceWorkspace"] = str(target_workspace)
        _safe_json_write(caller_path, caller_payload)


# ─────────────────────────────────────────────
# 2. Live Stream Throttling during Execution
# ─────────────────────────────────────────────
def _extract_tool_line(line: str) -> str:
    """Return the line if it matches a known tool pattern, else empty."""
    for pat in TOOL_LINE_PATTERNS:
        if re.search(pat, line, re.IGNORECASE):
            return line.strip()
    return ""


def _summarize_tool_input(tool_input: dict) -> str:
    """Pick the most human-readable argument of a tool call for the sidebar."""
    for key in TOOL_INPUT_KEYS:
        value = tool_input.get(key)
        if isinstance(value, str) and value.strip():
            return " ".join(value.split())[:160]
    return json.dumps(tool_input, ensure_ascii=False)[:160]


def _parse_stream_json_line(line: str) -> tuple[str, list]:
    """Parse one Claude Code `--output-format stream-json` record.

    Returns (assistant_text_chunks, tool_use_events) where each event is
    {ts, tool, detail, raw} — the shape the sidebar tool stream renders.
    """
    try:
        obj = json.loads(line)
    except json.JSONDecodeError:
        return "", []
    if not isinstance(obj, dict):
        return "", []

    texts: list[str] = []
    events: list[dict] = []

    if obj.get("type") == "assistant":
        message = obj.get("message") or {}
        content = message.get("content") or []
        if isinstance(content, str):
            texts.append(content)
        else:
            for block in content:
                if not isinstance(block, dict):
                    continue
                if block.get("type") == "text" and block.get("text"):
                    texts.append(str(block["text"]))
                elif block.get("type") == "tool_use":
                    name = str(block.get("name") or "Tool")
                    tool_input = block.get("input") or {}
                    if isinstance(tool_input, dict):
                        detail = _summarize_tool_input(tool_input)
                    else:
                        detail = str(tool_input)[:160]
                    events.append({
                        "ts": time.time(),
                        "tool": name,
                        "detail": detail,
                        "raw": f"{name} {detail}".strip(),
                    })
    elif obj.get("type") == "result":
        result_text = obj.get("result")
        if isinstance(result_text, str) and result_text:
            texts.append(result_text)

    return "\n".join(texts), events


def run_claude_headless(
    task: str,
    workspace: Path,
    caller_workspace: Path,
    model: str = "claude-sonnet-4-20250514",
    timeout_sec: int = 600,
    tool_stream: bool = True,
    extra_args: Optional[list] = None,
) -> tuple[str, int]:
    """
    Run `claude` in headless / pipe mode, streaming stdout with 1 s throttle.

    tool_stream=True requests `--output-format stream-json --verbose` so real
    Claude Code tool_use events (Read / Edit / Bash ...) reach the sidebar tool
    stream. The mode is auto-detected from the first stdout line: a non-JSON
    first line degrades transparently to the legacy plain-text path.
    Returns (full_output_text, return_code).
    """
    claude_bin = "claude.cmd" if sys.platform == "win32" else "claude"
    cmd = [claude_bin, "-p", task, "--dangerously-skip-permissions"]
    if tool_stream:
        cmd.extend(["--output-format", "stream-json", "--verbose"])
    if extra_args:
        cmd.extend(extra_args)

    env = os.environ.copy()
    env["ANTHROPIC_BASE_URL"] = "http://127.0.0.1:8080"
    env["ANTHROPIC_API_KEY"] = "sk-strata-local-free"

    proc = subprocess.Popen(
        cmd,
        cwd=str(workspace),
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        env=env,
        shell=(sys.platform == "win32"),
    )

    collected: list[str] = []
    last_update = 0.0
    latest_preview = ""
    latest_tool_line = ""
    tool_events: list[dict] = []
    stream_json_mode: Optional[bool] = None  # None = not yet detected

    def _throttled_update() -> None:
        nonlocal last_update
        now = time.time()
        if now - last_update >= STREAM_THROTTLE_SEC:
            last_update = now
            update_live_status(
                target_workspace=workspace,
                caller_workspace=caller_workspace,
                task_desc=task,
                status="streaming",
                preview=latest_preview,
                tool_line=latest_tool_line,
                tool_events=list(tool_events),
            )

    def _register_tool_event(event: dict) -> None:
        """Keep a rolling, de-duplicated tool window for the sidebar monitor."""
        nonlocal latest_tool_line
        if tool_events and tool_events[-1].get("raw") == event.get("raw"):
            return
        tool_events.append(event)
        if len(tool_events) > MAX_TOOL_EVENTS:
            tool_events.pop(0)
        latest_tool_line = str(event.get("raw") or latest_tool_line)

    # ── streaming loop ──
    try:
        while True:
            line = proc.stdout.readline()
            if not line:
                break
            if stream_json_mode is None:
                stream_json_mode = line.lstrip().startswith("{")

            if stream_json_mode:
                text_chunk, events = _parse_stream_json_line(line)
                if text_chunk:
                    collected.append(text_chunk + "\n")
                for event in events:
                    _register_tool_event(event)
            else:
                collected.append(line)
                tl = _extract_tool_line(line)
                if tl:
                    latest_tool_line = tl

            latest_preview = "".join(collected)[-MAX_PREVIEW_CHARS:]
            _throttled_update()
    except Exception as exc:
        print(f"[delegator] stream read error: {exc}", file=sys.stderr)

    # Drain remaining stderr
    stderr_text = ""
    try:
        stderr_text = proc.stderr.read() or ""
    except Exception:
        pass

    proc.wait(timeout=timeout_sec)
    full_output = "".join(collected)

    # Final streaming update
    update_live_status(
        target_workspace=workspace,
        caller_workspace=caller_workspace,
        task_desc=task,
        status="streaming_done",
        preview=latest_preview,
        tool_line=latest_tool_line,
        tool_events=list(tool_events),
    )

    return full_output, proc.returncode


# ─────────────────────────────────────────────
# 3. Auto-open Modified Files in IDE
# ─────────────────────────────────────────────
def _find_editor_cmd() -> Optional[str]:
    """Detect VS Code `code` or Antigravity CLI on PATH."""
    for candidate in ("code", "antigravity", "antigravity-cli"):
        try:
            subprocess.run(
                [candidate, "--version"],
                capture_output=True,
                timeout=5,
            )
            return candidate
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    return None


def _git_diff_files(workspace: Path) -> list[str]:
    """Return list of modified file paths (relative to workspace) via git diff."""
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only"],
            cwd=str(workspace),
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode != 0:
            return []
        files = [f.strip() for f in result.stdout.splitlines() if f.strip()]
        return files
    except Exception:
        return []


def auto_open_modified_files(
    workspace: Path,
    caller_workspace: Path,
    task_desc: str,
    output: str = "",
) -> list[str]:
    """
    After task completion:
      - git diff --name-only to find changed files
      - open up to MAX_AUTO_OPEN_FILES in the IDE
      - write modifiedFiles / outputFile into .delegator_live.json
    Returns the list of modified file paths.
    """
    modified = _git_diff_files(workspace)
    if not modified:
        # Also check untracked
        try:
            result = subprocess.run(
                ["git", "ls-files", "--others", "--exclude-standard"],
                cwd=str(workspace),
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                modified.extend(f.strip() for f in result.stdout.splitlines() if f.strip())
        except Exception:
            pass

    if not modified:
        update_live_status(
            target_workspace=workspace,
            caller_workspace=caller_workspace,
            task_desc=task_desc,
            status="completed",
            preview=output[-MAX_PREVIEW_CHARS:],
            modified_files=[],
            output_file="",
        )
        return []

    # Open in IDE (max 3 files)
    editor = _find_editor_cmd()
    files_to_open = modified[:MAX_AUTO_OPEN_FILES]
    if editor:
        for rel_path in files_to_open:
            abs_path = workspace / rel_path
            if abs_path.exists():
                try:
                    subprocess.Popen(
                        [editor, str(abs_path)],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        shell=(sys.platform == "win32"),
                    )
                    time.sleep(0.3)
                except Exception as exc:
                    print(f"[delegator] WARN: could not open {abs_path}: {exc}", file=sys.stderr)

    # Write final state
    output_file = str(files_to_open[0]) if files_to_open else ""
    update_live_status(
        target_workspace=workspace,
        caller_workspace=caller_workspace,
        task_desc=task_desc,
        status="completed",
        preview=output[-MAX_PREVIEW_CHARS:],
        modified_files=modified,
        output_file=output_file,
        extra={"openedInIDE": files_to_open},
    )
    return modified


# ─────────────────────────────────────────────
# 4. --terminal: Windows independent colored terminal
# ─────────────────────────────────────────────
def launch_in_terminal(
    task: str,
    workspace: Path,
    model: str,
    extra_args: Optional[list],
) -> None:
    """
    On Windows, spawn an independent colored cmd window via `start cmd /k`.
    On Linux/macOS, fall back to xterm / Terminal.app.
    """
    cmd_parts = [
        "claude",
        "--print",
        "--model", model,
        "--output-format", "text",
    ]
    if extra_args:
        cmd_parts.extend(extra_args)
    cmd_parts.append(task)

    cmd_str = " ".join(cmd_parts)

    if sys.platform == "win32":
        # Build a batch-friendly command
        bat_content = (
            f"@echo off\r\n"
            f"chcp 65001 >nul\r\n"
            f"cd /d \"{workspace}\"\r\n"
            f"echo [Claude Delegator] Running in {workspace.name}\r\n"
            f"echo Task: {task}\r\n"
            f"echo.\r\n"
            f"{cmd_str}\r\n"
            f"echo.\r\n"
            f"echo [Done] Press any key to close.\r\n"
            f"pause >nul\r\n"
        )
        bat_path = workspace / ".delegator_run.bat"
        bat_path.write_text(bat_content, encoding="utf-8")
        subprocess.Popen(
            ["cmd", "/c", "start", "cmd", "/k", str(bat_path)],
            cwd=str(workspace),
        )
    else:
        # Linux / macOS fallback
        shell_cmd = f"cd '{workspace}' && {cmd_str}"
        if sys.platform == "darwin":
            subprocess.Popen(
                ["open", "-a", "Terminal", "--args", "-e", shell_cmd],
            )
        else:
            subprocess.Popen(
                ["xterm", "-e", shell_cmd],
            )


# ─────────────────────────────────────────────
# Main orchestrator
# ─────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(
        description="Claude Delegator — cross-workspace task runner with live mirroring",
    )
    parser.add_argument(
        "--workspace", "-w",
        type=str,
        default=None,
        help="Target workspace root (absolute or relative). Defaults to cwd.",
    )
    parser.add_argument(
        "--task", "-t",
        type=str,
        required=True,
        help="Task / prompt to delegate to Claude.",
    )
    parser.add_argument(
        "--model", "-m",
        type=str,
        default="claude-sonnet-4-20250514",
        help="Claude model identifier.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=600,
        help="Max execution seconds (default 600).",
    )
    parser.add_argument(
        "--terminal",
        action="store_true",
        default=False,
        help="Launch in an independent colored terminal window (Windows: start cmd /k).",
    )
    parser.add_argument(
        "--extra",
        type=str,
        nargs="?",
        default=None,
        help="Extra CLI args forwarded to claude (space-separated string).",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        default=False,
        help="Skip auto-opening modified files in IDE.",
    )
    parser.add_argument(
        "--no-tool-stream",
        action="store_true",
        default=False,
        help="Disable stream-json Tool-use capture (legacy plain-text stdout parsing).",
    )
    args = parser.parse_args()

    # ── Resolve workspaces ──
    caller_cwd = Path(os.getcwd()).resolve()
    caller_workspace = _detect_workspace_root(caller_cwd)

    if args.workspace:
        target_workspace = Path(args.workspace).resolve()
        if not target_workspace.exists():
            print(f"[delegator] ERROR: workspace not found: {target_workspace}", file=sys.stderr)
            sys.exit(1)
        target_workspace = _detect_workspace_root(target_workspace)
    else:
        target_workspace = caller_workspace

    extra_args = args.extra.split() if args.extra else None

    print(f"[delegator] caller  : {caller_workspace}")
    print(f"[delegator] target  : {target_workspace}")
    print(f"[delegator] task    : {args.task}")
    print(f"[delegator] model   : {args.model}")
    print(f"[delegator] terminal: {args.terminal}")
    print()

    # ── Initial status write (both workspaces) ──
    update_live_status(
        target_workspace=target_workspace,
        caller_workspace=caller_workspace,
        task_desc=args.task,
        status="queued",
    )

    # ── Terminal mode ──
    if args.terminal:
        launch_in_terminal(
            task=args.task,
            workspace=target_workspace,
            model=args.model,
            extra_args=extra_args,
        )
        update_live_status(
            target_workspace=target_workspace,
            caller_workspace=caller_workspace,
            task_desc=args.task,
            status="launched_in_terminal",
        )
        print("[delegator] Launched in independent terminal window.")
        return

    # ── Headless streaming execution ──
    update_live_status(
        target_workspace=target_workspace,
        caller_workspace=caller_workspace,
        task_desc=args.task,
        status="running",
    )

    try:
        output, rc = run_claude_headless(
            task=args.task,
            workspace=target_workspace,
            caller_workspace=caller_workspace,
            model=args.model,
            timeout_sec=args.timeout,
            tool_stream=not args.no_tool_stream,
            extra_args=extra_args,
        )
    except subprocess.TimeoutExpired:
        update_live_status(
            target_workspace=target_workspace,
            caller_workspace=caller_workspace,
            task_desc=args.task,
            status="timeout",
        )
        print("[delegator] ERROR: execution timed out.", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        update_live_status(
            target_workspace=target_workspace,
            caller_workspace=caller_workspace,
            task_desc=args.task,
            status="error",
            extra={"error": "claude CLI not found on PATH"},
        )
        print("[delegator] ERROR: `claude` CLI not found. Install Claude Code first.", file=sys.stderr)
        sys.exit(1)

    # ── Auto-open modified files ──
    if not args.no_open:
        modified = auto_open_modified_files(
            workspace=target_workspace,
            caller_workspace=caller_workspace,
            task_desc=args.task,
            output=output,
        )
        if modified:
            print(f"[delegator] Modified files ({len(modified)}):")
            for f in modified:
                print(f"  • {f}")
    else:
        update_live_status(
            target_workspace=target_workspace,
            caller_workspace=caller_workspace,
            task_desc=args.task,
            status="completed",
        )

    # ── Record Token Ledger ──
    tokens = max(1, int(len(output) / 3.74)) if output else 0
    saved_usd = round(tokens * 0.000002, 6)
    rec = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "date": datetime.now().strftime("%Y-%m-%d"),
        "project": target_workspace.name,
        "version": "0.4.37",
        "tokens": tokens,
        "savedUsd": saved_usd,
        "modelName": "claude-code-local-8080",
        "delegator": "Claude-Code-Autonomous-Worker",
    }
    for ws in set([caller_workspace, target_workspace]):
        lp = ws / "local_tokens_ledger.json"
        try:
            ld = json.loads(lp.read_text(encoding="utf-8")) if lp.exists() else {}
            if not isinstance(ld, dict): ld = {"totalTokens": 0, "totalSavedUsdEst": 0.0, "sessions": []}
            ld["totalTokens"] = ld.get("totalTokens", 0) + tokens
            ld["totalSavedUsdEst"] = round(ld.get("totalSavedUsdEst", 0.0) + saved_usd, 4)
            ld.setdefault("sessions", []).append(rec)
            ld["sessions"] = ld["sessions"][-50:]
            lp.write_text(json.dumps(ld, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass

    # ── Print final output ──
    if output.strip():
        print("\n" + "─" * 60)
        print(output)
        print("─" * 60)

    if rc != 0:
        print(f"[delegator] claude exited with code {rc}", file=sys.stderr)
        sys.exit(rc)

    print(f"\n[delegator] ✓ Done. Live status mirrored to:")
    print(f"  {target_workspace / LIVE_FILENAME}")
    if caller_workspace != target_workspace:
        print(f"  {caller_workspace / LIVE_FILENAME}")


if __name__ == "__main__":
    main()