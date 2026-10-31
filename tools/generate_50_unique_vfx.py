# -*- coding: utf-8 -*-
"""
Generate 28 specialized, non-repeating VFX assets for all 10 characters in Math Island.
Uses ComfyUI SDXL Lightning on 127.0.0.1:8188 + Automated OpenCV Cutout to WebP.
"""
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

vfx_dest_dir = r"C:\Users\達爾\projects\math-island\assets\vfx"
os.makedirs(vfx_dest_dir, exist_ok=True)
out_dir = r"C:\Users\達爾\projects\ComfyUI AI 修圖\ComfyUI_windows_portable\ComfyUI\output"

tasks = [
    # ── 🌸 1. 魔法公主 (Magic Princess) ──
    {
        'id': 'vfx_magic_wand_burst',
        'prompt': 'masterpiece, best quality, magical golden star wand casting sparkling stardust explosion, colorful glowing fairy ribbons, swirling star particles, magical burst, centered, pure white background, isolated, sharp focus',
        'negative': 'human, hands, dark background, rectangular frame, text, blurry',
        'seed': 8801
    },
    {
        'id': 'vfx_rainbow_bridge',
        'prompt': 'masterpiece, best quality, luminous arched glowing rainbow bridge ribbon, floating golden sparkles, pastel clouds and stardust at edges, vibrant dreamy colors, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, landscape, ground, grass, rectangular frame, text',
        'seed': 8802
    },

    # ── 🌟 3. 星空公主 (Star Princess) ──
    {
        'id': 'vfx_star_meteor_rain',
        'prompt': 'masterpiece, best quality, celestial falling shooting stars and glowing comets, diagonal luminous cyan and gold meteor light trails, sparkling stardust shower, centered, pure white background, isolated, sharp focus',
        'negative': 'ground, dark background, mountains, rectangular frame, text',
        'seed': 8803
    },
    {
        'id': 'vfx_star_constellations',
        'prompt': 'masterpiece, best quality, mystical glowing zodiac constellation diagram, geometric star chart with interconnected glowing cyan and purple lines and bright star points, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, rectangular frame, text, blurry, human',
        'seed': 8804
    },
    {
        'id': 'vfx_star_crescent_moon',
        'prompt': 'masterpiece, best quality, glowing ethereal silver crescent moon, encircled by delicate purple nebula mist and sparkling celestial stars, magical crescent talisman, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, full moon, rectangular frame, text, blurry',
        'seed': 8805
    },
    {
        'id': 'vfx_star_blackhole',
        'prompt': 'masterpiece, best quality, cosmic glowing black hole singularity, deep purple and cyan accretion disk vortex, twisting light distortion ring, glowing spiral vortex, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, rectangular frame, blurry, low quality',
        'seed': 8806
    },

    # ── 🌺 4. 自然公主 (Nature Princess) ──
    {
        'id': 'vfx_nature_leaf_cyclone',
        'prompt': 'masterpiece, best quality, swirling vortex cyclone of fresh green clover leaves and pink flower petals, spiraling emerald wind storm, centered, pure white background, isolated, sharp focus',
        'negative': 'blue, dark background, tornado, destruction, text, blurry',
        'seed': 8807
    },
    {
        'id': 'vfx_nature_dewdrop',
        'prompt': 'masterpiece, best quality, giant sparkling crystalline morning dewdrop on lush green shamrock leaves, rainbow prism light refractions, sun flares, clean nature macro, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, rectangular frame, mud, dirt, blurry',
        'seed': 8808
    },
    {
        'id': 'vfx_nature_druid_staff',
        'prompt': 'masterpiece, best quality, ancient wooden druid nature staff, curling vine tendrils with budding leaves, glowing emerald green gemstone crystal orb atop the staff, magical woodcarving, centered, pure white background, isolated, sharp focus',
        'negative': 'human, holding, hand, dark background, rectangular frame',
        'seed': 8809
    },

    # ── 🔮 5. 神秘公主 (Mystery Princess) ──
    {
        'id': 'vfx_mystery_crystal_eye',
        'prompt': 'masterpiece, best quality, mystical arcane psychic eye made of glowing purple amethyst crystal, radiant psychic ripples, occult gold filigree framing, centered, pure white background, isolated, sharp focus',
        'negative': 'human face, scary, gore, dark background, rectangular frame',
        'seed': 8810
    },
    {
        'id': 'vfx_mystery_orb',
        'prompt': 'masterpiece, best quality, glowing magical purple divination crystal ball floating, surrounded by violet psychic fog, tiny glittering stars and ornate golden moon crescent stand, centered, pure white background, isolated, sharp focus',
        'negative': 'human, hands, dark background, rectangular frame, blurry',
        'seed': 8811
    },
    {
        'id': 'vfx_mystery_portal',
        'prompt': 'masterpiece, best quality, dimensional occult spatial rift portal, swirling deep violet and magenta warp vortex, mystical cosmic gateway ring, glowing runes along perimeter, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, rectangular frame, landscape, human, blurry',
        'seed': 8812
    },

    # ── 🗡️ 6. 傳奇勇者 (Legendary Hero) ──
    {
        'id': 'vfx_hero_flame_sword',
        'prompt': 'masterpiece, best quality, blazing fiery red broadsword slash, intense crimson and golden fire flames combusting around the blade, flying fiery embers, curved slash arc, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, human, rectangular frame, blurry',
        'seed': 8813
    },
    {
        'id': 'vfx_hero_lion_roar',
        'prompt': 'masterpiece, best quality, spectral glowing golden lion head phantom roaring, brilliant solar aura energy shockwave, radiant royal courage crest, centered, pure white background, isolated, sharp focus',
        'negative': 'real photo, dark background, blood, human, rectangular frame',
        'seed': 8814
    },
    {
        'id': 'vfx_hero_divine_blade',
        'prompt': 'masterpiece, best quality, divine holy Excalibur golden broadsword pointing down, surrounded by celestial golden light rays and holy lightning sparks, majestic sacred blade, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, human, holding, hands, rectangular frame',
        'seed': 8815
    },

    # ── 🧙‍♂️ 7. 魔法騎士 (Magic Knight) ──
    {
        'id': 'vfx_knight_angel_wings',
        'prompt': 'masterpiece, best quality, pair of radiant glowing golden and white archangel feathered wings, holy divine feather light rays, symmetrical outstretched wings, centered, pure white background, isolated, sharp focus',
        'negative': 'human body, face, dark background, rectangular frame, blurry',
        'seed': 8816
    },
    {
        'id': 'vfx_knight_paladin_shield',
        'prompt': 'masterpiece, best quality, towering golden paladin tower shield, ornate engraved sapphire royal cross, radiant holy light halo around edges, impenetrable sanctuary barrier, centered, pure white background, isolated, sharp focus',
        'negative': 'human, dark background, rectangular frame, heart, pink',
        'seed': 8817
    },
    {
        'id': 'vfx_knight_lance_rain',
        'prompt': 'masterpiece, best quality, divine judgment barrage of golden holy light lances raining down vertically, gleaming celestial spears, glowing trails, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, ground, rectangular frame, blood, blurry',
        'seed': 8818
    },

    # ── 🚀 8. 宇宙探險家 (Space Explorer) ──
    {
        'id': 'vfx_space_holo_grid',
        'prompt': 'masterpiece, best quality, futuristic sci-fi cyan holographic 3D radar grid, glowing circular target reticles, tactical telemetry HUD rings, clean high-tech wireframe, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, black box, rectangular frame, text, blurry',
        'seed': 8819
    },
    {
        'id': 'vfx_space_thruster_jets',
        'prompt': 'masterpiece, best quality, twin futuristic spaceship plasma thruster jet exhausts, glowing cyan and electric blue ion energy plume rings, high speed thrust burst, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, spaceship fuselage, dirty smoke, rectangular frame',
        'seed': 8820
    },
    {
        'id': 'vfx_space_plasma_discs',
        'prompt': 'masterpiece, best quality, dual spinning futuristic cyan laser chakram energy discs, glowing photon circular saw blades, electric ring trails, high-tech energy blades, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, rectangular frame, hands, human',
        'seed': 8821
    },
    {
        'id': 'vfx_space_satellite_beam',
        'prompt': 'masterpiece, best quality, concentrated orbital satellite laser beam impact, glowing teal ionic energy ring with digital coordinate reticle and shockwave, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, ground, explosion, rectangular frame',
        'seed': 8822
    },

    # ── 🌿 9. 森林守護者 (Forest Guardian) ──
    {
        'id': 'vfx_forest_spirit_wolf',
        'prompt': 'masterpiece, best quality, spectral glowing emerald green spirit wolf silhouette leaping forward, ethereal forest guardian energy beast, leaves and green wisps trailing, centered, pure white background, isolated, sharp focus',
        'negative': 'blood, dark background, realistic wolf, human, rectangular frame',
        'seed': 8823
    },
    {
        'id': 'vfx_forest_thorn_trap',
        'prompt': 'masterpiece, best quality, dense cluster of spiky wooden briar thorns and brambles rising from earth, glowing green thorn barrier trap, entwined spiky branches, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, rectangular frame, human, mud, blurry',
        'seed': 8824
    },
    {
        'id': 'vfx_forest_sacred_spring',
        'prompt': 'masterpiece, best quality, magical tranquil forest sacred spring splash, pure glowing green and turquoise water droplet burst with floating bioluminescent fireflies and dew, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, rectangular frame, dirty water, blurry',
        'seed': 8825
    },

    # ── 🔬 10. 科學魔法師 (Science Mage) ──
    {
        'id': 'vfx_science_alchemy_flask',
        'prompt': 'masterpiece, best quality, ornate steampunk glass round alchemy flask, glowing volatile bright emerald potion bubbling inside, dramatic burst of golden sparks and chemical smoke rings venting outward, centered, pure white background, isolated, sharp focus',
        'negative': 'hands, dark background, rectangular frame, human, dirty',
        'seed': 8826
    },
    {
        'id': 'vfx_science_atomic_orbit',
        'prompt': 'masterpiece, best quality, glowing golden and cyan atomic nucleus model, multiple intersecting elliptical electron orbit rings with sparkling energy particles, quantum physics symbol, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, rectangular frame, text, blurry, messy',
        'seed': 8827
    },
    {
        'id': 'vfx_science_clockwork_core',
        'prompt': 'masterpiece, best quality, intricate glowing steampunk brass clockwork power core, visible internal gears and springs radiating intense amber energy, hot steam exhaust jets, mechanical artifact, centered, pure white background, isolated, sharp focus',
        'negative': 'dark background, rectangular frame, human, blurry',
        'seed': 8828
    }
]

print(f"=== Starting generation of {len(tasks)} unique VFX assets ===")

for idx, t in enumerate(tasks):
    dest_webp = os.path.join(vfx_dest_dir, t['id'] + '.webp')
    if os.path.exists(dest_webp):
        print(f"[{idx+1}/{len(tasks)}] {t['id']} already exists, skipping.")
        continue
        
    print(f"\n[{idx+1}/{len(tasks)}] Generating {t['id']}...")
    wf = json.loads(json.dumps(base_wf))
    wf['6']['inputs']['text'] = t['prompt']
    wf['7']['inputs']['text'] = t['negative']
    wf['3']['inputs']['seed'] = t['seed']
    
    req = urllib.request.Request(
        "http://127.0.0.1:8188/prompt",
        data=json.dumps({"prompt": wf}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        res_data = json.loads(resp.read().decode('utf-8'))
        prompt_id = res_data['prompt_id']
        
    # Poll for completion
    for _ in range(60):
        time.sleep(1)
        with urllib.request.urlopen(f"http://127.0.0.1:8188/history/{prompt_id}") as h_resp:
            history = json.loads(h_resp.read().decode('utf-8'))
            if prompt_id in history:
                fname = history[prompt_id]['outputs']['9']['images'][0]['filename']
                src_path = os.path.join(out_dir, fname)
                
                # Cutout with OpenCV HSV + floodfill (using PIL to safely load unicode path)
                pil_raw = Image.open(src_path).convert('RGB')
                img_bgr = cv2.cvtColor(np.array(pil_raw), cv2.COLOR_RGB2BGR)
                hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
                gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
                h, w = gray.shape
                
                # Background candidate: low saturation, high brightness
                bg_cand = (hsv[:, :, 1] < 45) & (hsv[:, :, 2] > 165)
                mask = np.zeros((h+2, w+2), np.uint8)
                cv2.floodFill(bg_cand.astype(np.uint8), mask, (0, 0), 2)
                is_bg = (mask[1:-1, 1:-1] == 1)
                
                fg_mask = (~is_bg).astype(np.uint8) * 255
                # Filter small noise
                num, labels, stats, centroids = cv2.connectedComponentsWithStats(fg_mask)
                clean_mask = np.zeros_like(fg_mask)
                for i in range(1, num):
                    if stats[i, cv2.CC_STAT_AREA] > 600:
                        clean_mask[labels == i] = 255
                        
                # Smooth alpha with Gaussian blur
                alpha = cv2.GaussianBlur(clean_mask, (5, 5), 1.2)
                # Border zero strictly guaranteed
                alpha[0:5, :] = 0
                alpha[-5:, :] = 0
                alpha[:, 0:5] = 0
                alpha[:, -5:] = 0
                
                rgba = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2BGRA)
                rgba[:, :, 3] = alpha
                
                dest_png = os.path.join(vfx_dest_dir, t['id'] + '.png')
                res_img = Image.fromarray(cv2.cvtColor(rgba, cv2.COLOR_BGRA2RGBA))
                res_img.save(dest_png)
                res_img.save(dest_webp, 'WEBP', quality=95)
                print(f"✔ [SUCCESS] Generated & saved {t['id']}.webp")
                break

print("\n=== All unique VFX assets generation finished! ===")
