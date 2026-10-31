# -*- coding: utf-8 -*-
import urllib.request
import json
import time
import os
import cv2
import numpy as np
from PIL import Image

workflow_path = r"C:\Users\達爾\projects\math-island\tools\comfyui_sdxl_workflow.json"
with open(workflow_path, 'r', encoding='utf-8') as f:
    base_wf = json.load(f)

tasks = [
    {
        'id': 'vfx_nature_vine_shield',
        'prompt': 'masterpiece, best quality, lush green magical living vine wreath, thick wrapping ivy vines with fresh emerald leaves, glowing golden flower buds, circular barrier wreath, centered, pure white background, isolated, sharp focus',
        'negative': 'angel wings, heart, human, text, blurry, realistic, dark background, rectangular frame',
        'seed': 777101
    },
    {
        'id': 'vfx_knight_crest_shield',
        'prompt': 'masterpiece, best quality, valiant royal knight kite shield, steel and gold trim, glowing sapphire royal cross emblem, ornate armor heraldic crest, centered, pure white background, isolated, sharp focus',
        'negative': 'heart, pink, angel wings, text, blurry, dark background, rectangular frame',
        'seed': 777102
    },
    {
        'id': 'vfx_arcane_crystal_shield',
        'prompt': 'masterpiece, best quality, mystical arcane amethyst crystal shield, glowing purple gemstone runic barrier, ethereal violet floating crystal shards, centered, pure white background, isolated, sharp focus',
        'negative': 'heart, wings, text, blurry, dark background, rectangular frame',
        'seed': 777103
    },
    {
        'id': 'vfx_science_gears',
        'prompt': 'masterpiece, best quality, interlocking glowing brass mechanical gears, steampunk golden clockwork cogs, electric sparks, centered, pure white background, isolated, sharp focus',
        'negative': 'text, blurry, dark background, rectangular frame, human',
        'seed': 777104
    },
    {
        'id': 'vfx_nature_tree_roots',
        'prompt': 'masterpiece, best quality, thick ancient magical tree roots bursting from ground, mossy bark, glowing green fungal spores, earth cracks, centered, pure white background, isolated, sharp focus',
        'negative': 'text, blurry, dark background, rectangular frame',
        'seed': 777105
    }
]

out_dir = r"C:\ComfyUI_windows_portable\ComfyUI\output"
vfx_dest_dir = r"C:\Users\達爾\projects\math-island\assets\vfx"

for t in tasks:
    wf = json.loads(json.dumps(base_wf))
    wf['6']['inputs']['text'] = t['prompt']
    wf['7']['inputs']['text'] = t['negative']
    wf['3']['inputs']['seed'] = t['seed']
    wf['9']['inputs']['filename_prefix'] = 'VFX_' + t['id']
    
    data = json.dumps({'prompt': wf}).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:8188/prompt', data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        prompt_id = res['prompt_id']
        print(f"Queued {t['id']} (prompt_id: {prompt_id})")
        
    # Poll for completion
    for _ in range(40):
        time.sleep(1)
        with urllib.request.urlopen(f"http://127.0.0.1:8188/history/{prompt_id}") as h_resp:
            history = json.loads(h_resp.read().decode('utf-8'))
            if prompt_id in history:
                fname = history[prompt_id]['outputs']['9']['images'][0]['filename']
                src_path = os.path.join(out_dir, fname)
                print(f"Generated {fname}, processing cutout...")
                
                # Cutout with OpenCV HSV + floodfill
                img_bgr = cv2.imread(src_path)
                hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
                gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
                h, w = gray.shape
                
                # Background candidate: low saturation, high brightness
                bg_cand = (hsv[:, :, 1] < 45) & (hsv[:, :, 2] > 165)
                mask = np.zeros((h+2, w+2), np.uint8)
                cv2.floodFill(bg_cand.astype(np.uint8), mask, (0, 0), 2)
                is_bg = (mask[1:-1, 1:-1] == 1)
                
                fg_mask = (~is_bg).astype(np.uint8) * 255
                # Keep components with area > 800
                num, labels, stats, centroids = cv2.connectedComponentsWithStats(fg_mask)
                clean_mask = np.zeros_like(fg_mask)
                for i in range(1, num):
                    if stats[i, cv2.CC_STAT_AREA] > 800:
                        clean_mask[labels == i] = 255
                        
                # Smooth
                alpha = cv2.GaussianBlur(clean_mask, (5, 5), 1.2)
                # 5px border zero
                alpha[0:5, :] = 0
                alpha[-5:, :] = 0
                alpha[:, 0:5] = 0
                alpha[:, -5:] = 0
                
                rgba = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2BGRA)
                rgba[:, :, 3] = alpha
                
                dest_webp = os.path.join(vfx_dest_dir, t['id'] + '.webp')
                dest_png = os.path.join(vfx_dest_dir, t['id'] + '.png')
                res_img = Image.fromarray(cv2.cvtColor(rgba, cv2.COLOR_BGRA2RGBA))
                res_img.save(dest_png)
                res_img.save(dest_webp, 'WEBP', quality=95)
                print(f"✔ [SUCCESS] Saved {dest_webp}")
                break

