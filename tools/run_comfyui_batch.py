# -*- coding: utf-8 -*-
"""
run_comfyui_batch.py
奇幻冒險島 ComfyUI 本地生圖自動調度與資產對齊管線
支援自動探測/拉起 ComfyUI、Prompt 注入、佇列輪詢與產物自動歸檔
"""

import os
import sys
import time
import json
import shutil
import subprocess
import urllib.request
import urllib.error

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECIPES_PATH = os.path.join(BASE_DIR, 'docs', 'VISUAL_PROMPTS_RECIPES.json')
WORKFLOW_TEMPLATE = os.path.join(BASE_DIR, 'tools', 'comfyui_sdxl_workflow.json')

COMFYUI_DIR = r"C:\ComfyUI_windows_portable"
COMFYUI_OUTPUT_DIR = os.path.join(COMFYUI_DIR, "ComfyUI", "output")
COMFYUI_BASE = "http://127.0.0.1:8188"

def is_server_online():
    try:
        req = urllib.request.Request(f"{COMFYUI_BASE}/system_stats")
        with urllib.request.urlopen(req, timeout=3) as resp:
            return resp.status == 200
    except Exception:
        return False

def start_comfyui_server():
    """若 ComfyUI 尚未啟動，自動以背景進程啟動"""
    if is_server_online():
        print("✔ [ComfyUI 在線] 服務已在監聽中。")
        return True

    print("🚀 [正在啟動 ComfyUI] 正在拉起本地 GPU 加速服務...")
    bat_path = os.path.join(COMFYUI_DIR, "run_nvidia_gpu.bat")
    log_out_path = os.path.join(COMFYUI_DIR, "ComfyUI", "user", "server_stdout.log")
    os.makedirs(os.path.dirname(log_out_path), exist_ok=True)
    log_out = open(log_out_path, "a", encoding="utf-8")
    
    # 啟動背景進程並重定向至日誌檔案，杜絕 Windows 無效管道控制碼報錯
    subprocess.Popen([bat_path], cwd=COMFYUI_DIR, shell=True, stdout=log_out, stderr=log_out)
    
    # 等待服務就緒 (最多等待 45 秒)
    for i in range(45):
        time.sleep(2)
        if is_server_online():
            print(f"✔ [ComfyUI 啟動成功] 耗時約 {i*2} 秒，服務已就緒！")
            return True
        print(f"  等待 ComfyUI 載入中... ({i*2}s)")
    
    print("❌ [啟動超時] 無法在預定時間內連線至 ComfyUI。")
    return False

def queue_prompt(prompt_workflow):
    """將生圖工作流推入 ComfyUI 佇列"""
    p = {"prompt": prompt_workflow}
    data = json.dumps(p).encode('utf-8')
    req = urllib.request.Request(f"{COMFYUI_BASE}/prompt", data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def get_history(prompt_id):
    """查詢任務歷史與輸出產物"""
    try:
        with urllib.request.urlopen(f"{COMFYUI_BASE}/history/{prompt_id}") as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception:
        return {}

def wait_for_completion(prompt_id, timeout=120):
    """輪詢等待生成完成"""
    start_t = time.time()
    while time.time() - start_t < timeout:
        history = get_history(prompt_id)
        if prompt_id in history:
            status = history[prompt_id].get('status', {})
            if status.get('status_str') == 'error':
                print(f"❌ 節點執行報錯：{status}")
                return None
            outputs = history[prompt_id].get('outputs', {})
            for node_id, node_output in outputs.items():
                if 'images' in node_output and len(node_output['images']) > 0:
                    img_info = node_output['images'][0]
                    filename = img_info.get('filename')
                    subfolder = img_info.get('subfolder', '')
                    src_path = os.path.join(COMFYUI_OUTPUT_DIR, subfolder, filename)
                    return src_path
        time.sleep(1.5)
    return None

def generate_asset(task_key):
    with open(RECIPES_PATH, 'r', encoding='utf-8') as f:
        recipes = json.load(f)
    with open(WORKFLOW_TEMPLATE, 'r', encoding='utf-8') as f:
        workflow = json.load(f)

    if task_key not in recipes:
        print(f"❌ 查無資產鍵名：{task_key}")
        return False

    task = recipes[task_key]
    print(f"\n🎨 [開始生成] {task['name']} (ID: {task_key})")
    print(f"   目標存檔：{task['target_file']}")

    # 注入 Prompt 與隨機種子
    workflow["6"]["inputs"]["text"] = task["positive"]
    workflow["7"]["inputs"]["text"] = task["negative"]
    workflow["3"]["inputs"]["seed"] = int(time.time() * 1000) % 1000000000
    workflow["9"]["inputs"]["filename_prefix"] = f"MI_{task_key}"

    # 發起佇列
    res = queue_prompt(workflow)
    prompt_id = res.get('prompt_id')
    print(f"   任務已入佇列 (Prompt ID: {prompt_id})，正在推論生圖中...")

    # 等待出圖
    generated_img = wait_for_completion(prompt_id)
    if generated_img and os.path.exists(generated_img):
        os.makedirs(os.path.dirname(task['target_file']), exist_ok=True)
        shutil.copy2(generated_img, task['target_file'])
        size_kb = os.path.getsize(task['target_file']) / 1024
        print(f"✔ [生成成功] 產物已就緒：{task['target_file']} ({size_kb:.1f} KB)")
        return True
    else:
        print(f"❌ [生成超時或失敗] 未能取得輸出產物。")
        return False

def main():
    tasks = sys.argv[1:] if len(sys.argv) > 1 else [
        "math_g1_06_jellyfish", "math_g1_08_clock_whale", "math_g1_09_cloud_sheep",
        "math_g1_10_lightning_eagle", "math_g1_11_place_blocks", "math_g1_12_ruler_dragon",
        "math_g1_13_piggy_bank", "math_g1_14_space_alien", "math_g1_15_calendar_owl",
        "item_magic_potion", "item_adventure_compass",
        "badge_math_master", "badge_chinese_master", "badge_english_master",
        "badge_science_master", "badge_social_master"
    ]
    
    if not start_comfyui_server():
        print("請手動確認 ComfyUI 狀態。")
        sys.exit(1)

    print(f"\n⚡ 本次排程生成清單 (共 {len(tasks)} 項)：{tasks}")
    success_count = 0
    for idx, t in enumerate(tasks, 1):
        print(f"\n[{idx}/{len(tasks)}] 進行中...")
        if generate_asset(t):
            success_count += 1
            
    print("\n" + "=" * 60)
    print(f"🎉 批次生成完成：成功 {success_count} / {len(tasks)} 項！")
    print("=" * 60)

if __name__ == '__main__':
    main()
