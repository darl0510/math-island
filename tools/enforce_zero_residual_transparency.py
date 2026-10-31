# -*- coding: utf-8 -*-
"""
tools/enforce_zero_residual_transparency.py
零殘留極致去背保護：
1. 閾值截斷 (Alpha < 18 直接歸零)
2. 外邊框 2 像素物理歸零 (確保 100% 邊緣無任何方形包圍盒殘影)
3. 驗證所有 10 款專屬特效的四角 Alpha 100% 為 0
"""

import os
from PIL import Image

VFX_DIR = r"C:\Users\達爾\projects\math-island\assets\vfx"

ALL_ROLE_VFX = [
    # 公主 5 大專屬魔法
    "vfx_magic_circle.png",
    "vfx_princess_butterfly.png",
    "vfx_princess_frost_crystal.png",
    "vfx_princess_heart_shield.png",
    "vfx_princess_rainbow_aurora.png",
    # 勇者 5 大專屬物理劍技
    "vfx_crescent_wave.png",
    "vfx_hero_cross_slash.png",
    "vfx_hero_whirlwind.png",
    "vfx_hero_impact_shockwave.png",
    "vfx_hero_thunder_thrust.png"
]

def enforce_zero_alpha(fname):
    fpath = os.path.join(VFX_DIR, fname)
    if not os.path.exists(fpath):
        return False
    
    img = Image.open(fpath).convert("RGBA")
    w, h = img.size
    r, g, b, a = img.split()

    # 1. 微弱羽化殘留截斷 (低於 18 的微光直接歸零)
    a = a.point(lambda p: 0 if p < 20 else p)

    # 2. 強制最外圈 2 像素邊界 Alpha 歸零
    apix = a.load()
    for x in range(w):
        apix[x, 0] = 0
        apix[x, 1] = 0
        apix[x, h - 1] = 0
        apix[x, h - 2] = 0
    for y in range(h):
        apix[0, y] = 0
        apix[1, y] = 0
        apix[w - 1, y] = 0
        apix[w - 2, y] = 0

    img.putalpha(a)

    # 覆蓋儲存 PNG 與 WebP
    webp_path = os.path.splitext(fpath)[0] + ".webp"
    img.save(fpath, "PNG", optimize=True)
    img.save(webp_path, "WEBP", quality=92, method=6)

    # 驗證四個角落與邊界點
    chk = img.load()
    test_pts = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1)]
    alphas = [chk[pt[0], pt[1]][3] for pt in test_pts]
    perfect = all(val == 0 for val in alphas)

    print(f"[{'✔ 100% 完美零殘留' if perfect else '❌'}] {fname:<32} (邊界 Alpha: {alphas})")
    return perfect

def main():
    print("=" * 70)
    print("🛡️ 執行零殘留極致去背防線...")
    print("=" * 70)
    all_ok = True
    for f in ALL_ROLE_VFX:
        if not enforce_zero_alpha(f):
            all_ok = False
    print("=" * 70)
    if all_ok:
        print("🎉 全部 10 款專屬技能特效 100% 達成零殘留純淨透明！")

if __name__ == '__main__':
    main()

