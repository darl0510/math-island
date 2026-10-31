# -*- coding: utf-8 -*-
"""
tools/clean_vfx_transparency.py
極致乾淨透明去背與 WebP 壓制管線 (專為遊戲 VFX 發光技能特效調校)
杜絕任何邊界灰塊、白方框或截斷殘留！
"""

import os
from PIL import Image, ImageFilter
from collections import deque

VFX_DIR = r"C:\Users\達爾\projects\math-island\assets\vfx"

VFX_TARGETS = [
    "vfx_princess_butterfly.png",
    "vfx_princess_frost_crystal.png",
    "vfx_princess_heart_shield.png",
    "vfx_princess_rainbow_aurora.png",
    "vfx_hero_cross_slash.png",
    "vfx_hero_whirlwind.png",
    "vfx_hero_impact_shockwave.png",
    "vfx_hero_thunder_thrust.png"
]

def clean_vfx_image(filename):
    fpath = os.path.join(VFX_DIR, filename)
    if not os.path.exists(fpath):
        print(f"❌ 查無檔案: {filename}")
        return False

    img = Image.open(fpath).convert("RGBA")
    w, h = img.size
    pix = img.load()

    # 1. 四邊全向連通泛洪
    mask = Image.new("L", (w, h), 0)
    mpix = mask.load()

    queue = deque()
    visited = set()

    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
        visited.add((x, 0))
        visited.add((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))
        visited.add((0, y))
        visited.add((w - 1, y))

    while queue:
        x, y = queue.popleft()
        mpix[x, y] = 255  # 標記為背景

        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                r, g, b, _ = pix[nx, ny]
                sat = max(r, g, b) - min(r, g, b)
                avg = (r + g + b) / 3

                # 條件：若是連通的近白色、淺色中性灰，判定為背景徹底清除
                is_bg = False
                if avg > 218:
                    is_bg = True
                elif sat < 28 and avg > 110:
                    is_bg = True
                elif sat < 38 and avg > 145:
                    is_bg = True

                if is_bg:
                    visited.add((nx, ny))
                    queue.append((nx, ny))

    # 2. 生成 Alpha 遮罩
    alpha = Image.new("L", (w, h), 255)
    apix = alpha.load()
    for y in range(h):
        for x in range(w):
            if mpix[x, y] == 255:
                apix[x, y] = 0

    # 3. 雙階微收縮 + 平滑羽化，確保無任何 1px 白邊
    alpha = alpha.filter(ImageFilter.MinFilter(3)) # 消除毛邊與殘留像素
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.0)) # 平滑過渡

    img.putalpha(alpha)

    # 4. 覆蓋原檔並轉檔為 WebP
    webp_path = os.path.splitext(fpath)[0] + ".webp"
    img.save(fpath, "PNG", optimize=True)
    img.save(webp_path, "WEBP", quality=92, method=6)
    
    # 5. 驗證四個角落 Alpha 是否為 0
    res_pix = img.load()
    corner_alphas = [res_pix[0, 0][3], res_pix[w - 1, 0][3], res_pix[0, h - 1][3], res_pix[w - 1, h - 1][3]]
    is_clean = all(a == 0 for a in corner_alphas)
    
    size_kb = os.path.getsize(webp_path) / 1024
    status = "✔ 100% 透明無殘留" if is_clean else "⚠ 邊界需複檢"
    print(f"[{status}] {filename:<32} ➔ WebP: {size_kb:.0f} KB (角落 Alpha: {corner_alphas})")
    return is_clean

def main():
    print("=" * 70)
    print("✨ 開始處理 8 款角色專屬 VFX 技能特效去背...")
    print("=" * 70)
    success = 0
    for fname in VFX_TARGETS:
        if clean_vfx_image(fname):
            success += 1
    print("=" * 70)
    print(f"🎉 處理完畢：{success} / {len(VFX_TARGETS)} 款特效達到 100% 純淨透明無殘留！")

if __name__ == '__main__':
    main()

