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
        'id': 'vfx_cosmic_supernova_clean',
        'prompt': 'masterpiece, best quality, radiant cosmic supernova explosion, shining starlight burst, rainbow galactic nebula core, sparkling celestial dust rays, centered, pure white background, isolated, sharp focus',
        'negative': 'text, blurry, dark background, rectangular frame, human, planets',
        'seed': 888201
    },
    {
        'id': 'vfx_nature_bloom_clean',
        'prompt': 'masterpiece, best quality, magical blooming flowers wreath, fresh colorful blossoms, pink and white petals, lush green leaves, sparkling pollen, centered, pure white background, isolated, sharp focus',
        'negative': 'text, blurry, dark background, rectangular frame, pot, vase',
        'seed': 888202
    },
    {
        'id': 'vfx_mystery_runes_clean',
        'prompt': 'masterpiece, best quality, esoteric ancient violet rune circle, glowing purple glyphs, arcane astrological mandala, sacred occult symbols, centered, pure white background, isolated, sharp focus',
        'negative': 'text, blurry, dark background, rectangular frame, human',
        'seed': 888203
    },
    {
        'id': 'vfx_elven_wind_arrow_clean',
        'prompt': 'masterpiece, best quality, glowing emerald green elven wind arrow, magic flight trail, ethereal leaf feathers, luminous gale shaft, horizontal flight, centered, pure white background, isolated, sharp focus',
        'negative': 'text, blurry, dark background, rectangular frame, bow, archer',
        'seed': 888204
    },
    {
        'id': 'vfx_lightning_tesla_clean',
        'prompt': 'masterpiece, best quality, electric blue tesla lightning arc, jagged high voltage electric spark burst, plasma crackle, centered, pure white background, isolated, sharp focus',
        'negative': 'text, blurry, dark background, rectangular frame, generator',
        'seed': 888205
    },
    {
        'id': 'vfx_gravity_singularity_clean',
        'prompt': 'masterpiece, best quality, sci-fi glowing cyan gravity singularity sphere, rotating energy rings, futuristic ion vortex core, floating technological particle halo, centered, pure white background, isolated, sharp focus',
        'negative': 'text, blurry, dark background, rectangular frame, spaceship',
        'seed': 888206
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
        
    for _ in range(40):
        time.sleep(1)
        with urllib.request.urlopen(f"http://127.0.0.1:8188/history/{prompt_id}") as h_resp:
            history = json.loads(h_resp.read().decode('utf-8'))
            if prompt_id in history:
                fname = history[prompt_id]['outputs']['9']['images'][0]['filename']
                src_path = os.path.join(out_dir, fname)
                print(f"Generated {fname}, processing cutout...")
                
                img_bgr = cv2.imread(src_path)
                hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
                gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
                h, w = gray.shape
                
                bg_cand = (hsv[:, :, 1] < 45) & (hsv[:, :, 2] > 165)
                mask = np.zeros((h+2, w+2), np.uint8)
                cv2.floodFill(bg_cand.astype(np.uint8), mask, (0, 0), 2)
                is_bg = (mask[1:-1, 1:-1] == 1)
                
                fg_mask = (~is_bg).astype(np.uint8) * 255
                num, labels, stats, centroids = cv2.connectedComponentsWithStats(fg_mask)
                clean_mask = np.zeros_like(fg_mask)
                for i in range(1, num):
                    if stats[i, cv2.CC_STAT_AREA] > 600:
                        clean_mask[labels == i] = 255
                        
                alpha = cv2.GaussianBlur(clean_mask, (5, 5), 1.2)
                alpha[0:5, :] = 0; alpha[-5:, :] = 0; alpha[:, 0:5] = 0; alpha[:, -5:] = 0
                
                rgba = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2BGRA)
                rgba[:, :, 3] = alpha
                
                dest_webp = os.path.join(vfx_dest_dir, t['id'] + '.webp')
                dest_png = os.path.join(vfx_dest_dir, t['id'] + '.png')
                res_img = Image.fromarray(cv2.cvtColor(rgba, cv2.COLOR_BGRA2RGBA))
                res_img.save(dest_png)
                res_img.save(dest_webp, 'WEBP', quality=95)
                print(f"✔ [SUCCESS] Saved {dest_webp}")
                break

