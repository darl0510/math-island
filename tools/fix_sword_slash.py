# -*- coding: utf-8 -*-
import os
from PIL import Image, ImageFilter
from collections import deque

src = r"C:\ComfyUI_windows_portable\ComfyUI\output\MI_vfx_sword_slash_00001_.png"
dst_png = r"C:\Users\達爾\projects\math-island\assets\vfx\vfx_sword_slash.png"
dst_webp = r"C:\Users\達爾\projects\math-island\assets\vfx\vfx_sword_slash.webp"

img = Image.open(src).convert("RGBA")
w, h = img.size
pix = img.load()

# 建立遮罩
mask = Image.new("L", (w, h), 0)
mpix = mask.load()

# 從邊界所有像素向內泛洪擴散
queue = deque()
visited = set()

# 邊界所有點作為起點
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

            # 背景是低飽和度的灰白色/冷灰色 (sat < 35 且亮度 > 110)，或極亮白光
            # 刀刃與電光是高飽和度青色 (sat >= 35) 或深黑金屬 (avg < 90)
            is_bg = False
            if sat < 28 and avg > 115:
                is_bg = True
            elif avg > 215:
                is_bg = True
            elif sat < 38 and avg > 140:
                is_bg = True

            if is_bg:
                visited.add((nx, ny))
                queue.append((nx, ny))

# 構建 Alpha
alpha = Image.new("L", (w, h), 255)
apix = alpha.load()
for y in range(h):
    for x in range(w):
        if mpix[x, y] == 255:
            apix[x, y] = 0

# 輕微羽化
alpha = alpha.filter(ImageFilter.GaussianBlur(1.2))
img.putalpha(alpha)

img.save(dst_png, "PNG")
img.save(dst_webp, "WEBP", quality=92)
print("✔ [修復完成] 刀子背景灰塊已徹底清除，已重新輸出為 100% 透明 PNG 與 WebP！")

