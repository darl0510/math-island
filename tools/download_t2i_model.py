# -*- coding: utf-8 -*-
"""
download_t2i_model.py
一鍵下載 DreamShaper XL Lightning SFW 模型至 ComfyUI checkpoints 目錄
支援斷點續傳與即時下載進度回報
"""

import os
import sys
import time
import urllib.request
import urllib.error

MODEL_URL = "https://huggingface.co/Lykon/dreamshaper-xl-lightning/resolve/main/DreamShaperXL_Lightning-SFW.safetensors"
TARGET_DIR = r"C:\ComfyUI_windows_portable\ComfyUI\models\checkpoints"
TARGET_FILE = os.path.join(TARGET_DIR, "DreamShaperXL_Lightning-SFW.safetensors")

def download_model():
    os.makedirs(TARGET_DIR, exist_ok=True)
    temp_file = TARGET_FILE + ".downloading"
    
    # 檢查是否已下載完成
    if os.path.exists(TARGET_FILE):
        size_gb = os.path.getsize(TARGET_FILE) / (1024**3)
        if size_gb > 6.0:
            print(f"✔ [已存在] 模型已就緒：{TARGET_FILE} ({size_gb:.2f} GB)")
            return True

    # 取得遠端檔案大小
    print(f"[開始連線] 目標模型：DreamShaper XL Lightning SFW (約 6.46 GB)")
    print(f"[來源網址] {MODEL_URL}")
    print(f"[存檔目標] {TARGET_FILE}")
    
    headers = {"User-Agent": "Mozilla/5.0"}
    existing_size = 0
    if os.path.exists(temp_file):
        existing_size = os.path.getsize(temp_file)
        headers["Range"] = f"bytes={existing_size}-"
        print(f"[斷點續傳] 偵測到未完成下載檔，已下載 {existing_size / (1024**2):.1f} MB，繼續下載...")

    req = urllib.request.Request(MODEL_URL, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            content_range = resp.headers.get("Content-Range")
            total_size = 0
            if content_range:
                total_size = int(content_range.split("/")[-1])
            else:
                total_size = int(resp.headers.get("Content-Length", 0)) + existing_size

            print(f"[下載總量] {total_size / (1024**3):.2f} GB")
            mode = "ab" if existing_size > 0 else "wb"
            start_time = time.time()
            downloaded = existing_size
            last_report_time = start_time
            last_report_bytes = downloaded

            with open(temp_file, mode) as f:
                chunk_size = 4 * 1024 * 1024  # 4MB
                while True:
                    chunk = resp.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    
                    now = time.time()
                    if now - last_report_time >= 5.0:  # 每 5 秒回報一次
                        percent = (downloaded / total_size) * 100 if total_size else 0
                        speed_mb = ((downloaded - last_report_bytes) / (1024**2)) / (now - last_report_time)
                        eta_sec = (total_size - downloaded) / (speed_mb * 1024 * 1024) if speed_mb > 0 else 0
                        print(f"進度: {percent:.1f}% ({downloaded/(1024**3):.2f}/{total_size/(1024**3):.2f} GB) | 速度: {speed_mb:.1f} MB/s | 剩餘時間: {int(eta_sec//60)}分{int(eta_sec%60)}秒")
                        last_report_time = now
                        last_report_bytes = downloaded

        # 下載完成更名
        if os.path.exists(TARGET_FILE):
            os.remove(TARGET_FILE)
        os.rename(temp_file, TARGET_FILE)
        print(f"\n✔ [下載完成] 模型已成功存檔至：{TARGET_FILE}")
        return True

    except Exception as e:
        print(f"\n❌ [下載中斷] 錯誤：{e}")
        print("保留暫存檔，下次執行時將自動斷點續傳。")
        return False

if __name__ == '__main__':
    download_model()

