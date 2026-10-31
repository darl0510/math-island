# -*- coding: utf-8 -*-
"""
tools/postprocess_assets.py
奇幻冒險島視覺資產後處理工程管線：
1. 智能連通純白背景去背 (Floodfill Alpha Mask + Soft Edge Feathering)
2. 現代 WebP 壓制 (品質 90，單檔由 1.2MB 縮減至 <120KB)
3. 支援全量怪獸、道具、勳章與角色立繪一鍵批次處理
"""

import os
import sys
from PIL import Image, ImageFilter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(BASE_DIR, 'assets')

TARGET_DIRS = [
    os.path.join(ASSETS_DIR, 'monsters', 'math_g1'),
    os.path.join(ASSETS_DIR, 'items'),
    os.path.join(ASSETS_DIR, 'badges'),
    os.path.join(ASSETS_DIR, 'characters'),
    os.path.join(ASSETS_DIR, 'monsters')
]

def remove_white_background(img, threshold=242, tolerance=15):
    """
    從四個角落泛洪探測連通的背景區域，將背景轉為透明，同時保護角色本體內部的白色
    """
    img = img.convert("RGBA")
    w, h = img.size
    
    # 建立灰階亮度遮罩
    # 判斷近白色像素
    pixels = img.load()
    mask = Image.new("L", (w, h), 0)
    mask_pixels = mask.load()

    # 先以 floodfill 標記外部連通背景
    # 使用 BFS 從四角開始擴散
    from collections import deque
    queue = deque()
    visited = set()

    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1)]
    for pt in corners:
        r, g, b, _ = pixels[pt[0], pt[1]]
        if r >= threshold - tolerance and g >= threshold - tolerance and b >= threshold - tolerance:
            queue.append(pt)
            visited.add(pt)

    while queue:
        x, y = queue.popleft()
        mask_pixels[x, y] = 255  # 標記為背景

        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                r, g, b, _ = pixels[nx, ny]
                # 若為近白色且相鄰，視為背景擴散
                if r >= threshold and g >= threshold and b >= threshold:
                    visited.add((nx, ny))
                    queue.append((nx, ny))
                elif (r + g + b) / 3 >= threshold - 5:
                    visited.add((nx, ny))
                    queue.append((nx, ny))

    # 反轉遮罩：本體為 255，背景為 0
    alpha_mask = Image.new("L", (w, h), 255)
    alpha_pixels = alpha_mask.load()
    for y in range(h):
        for x in range(w):
            if mask_pixels[x, y] == 255:
                alpha_pixels[x, y] = 0

    # 邊緣 1 像素高斯平滑，消除生硬鋸齒
    feathered_mask = alpha_mask.filter(ImageFilter.GaussianBlur(radius=0.8))
    img.putalpha(feathered_mask)
    return img

def process_image(file_path):
    try:
        orig_size_kb = os.path.getsize(file_path) / 1024
        img = Image.open(file_path)
        
        # 1. 執行透明去背
        transparent_img = remove_white_background(img)
        
        # 覆蓋儲存為透明 PNG
        transparent_img.save(file_path, "PNG", optimize=True)
        new_png_kb = os.path.getsize(file_path) / 1024
        
        # 2. 同步輸出現代 WebP 格式
        webp_path = os.path.splitext(file_path)[0] + ".webp"
        transparent_img.save(webp_path, "WEBP", quality=90, method=6)
        webp_kb = os.path.getsize(webp_path) / 1024
        
        rel_name = os.path.relpath(file_path, ASSETS_DIR)
        print(f"✔ [處理完成] {rel_name:<38} | PNG: {orig_size_kb:.0f}K ➔ {new_png_kb:.0f}K | WebP: {webp_kb:.0f}K")
        return True
    except Exception as e:
        print(f"❌ [處理失敗] {file_path}: {e}")
        return False

def main():
    print("=" * 75)
    print("🚀 啟動全遊戲視覺資產透明去背與 WebP 輕量化工程管線")
    print("=" * 75)

    processed_count = 0
    for target_dir in TARGET_DIRS:
        if not os.path.exists(target_dir):
            continue
        for fname in os.listdir(target_dir):
            if fname.lower().endswith('.png') and not fname.endswith('_backup.png'):
                fpath = os.path.join(target_dir, fname)
                if os.path.isfile(fpath):
                    if process_image(fpath):
                        processed_count += 1

    print("=" * 75)
    print(f"🎉 全部處理完成！共計優化 {processed_count} 款資產（含 Alpha 透明通道與 WebP 轉檔）。")
    print("=" * 75)

if __name__ == '__main__':
    main()

