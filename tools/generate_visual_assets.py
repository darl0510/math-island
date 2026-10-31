# -*- coding: utf-8 -*-
"""
generate_visual_assets.py
奇幻冒險島 (Math Island) 本地視覺資產批次生成與調度管線
- 支援 Batch 1: 小一數學島 10 款專屬怪獸
- 支援 Batch 2: 3 款星幣道具 + 5 款學科勳章
- 支援 ComfyUI API 佇列直連派工與 Prompt 批次清單導出
"""

import os
import sys
import json
import urllib.request
import urllib.error

# 基礎路徑定義
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(BASE_DIR, 'assets')
OUTPUT_MONSTERS_DIR = os.path.join(ASSETS_DIR, 'monsters', 'math_g1')
OUTPUT_ITEMS_DIR = os.path.join(ASSETS_DIR, 'items')
OUTPUT_BADGES_DIR = os.path.join(ASSETS_DIR, 'badges')

# 統一風格前綴與負面提示詞
MONSTER_BASE_POSITIVE = (
    "masterpiece, best quality, cute fantasy RPG monster character, chibi art style, "
    "vibrant colorful palette, cel-shaded anime game asset, soft studio lighting, clean outlines, "
    "pure white background, isolated, full body shot"
)

MONSTER_BASE_NEGATIVE = (
    "photorealistic, realistic, 3d render, low quality, worst quality, dark, horror, "
    "grotesque, scary, messy background, text, watermark, signature, blurry, deformed limbs, cropped"
)

ITEM_BASE_POSITIVE = (
    "masterpiece, best quality, 3D glossy game icon, mobile RPG asset, vibrant magic glow, "
    "shiny metallic and crystal texture, centered, isometric clean view, pure white background, isolated"
)

BADGE_BASE_POSITIVE = (
    "masterpiece, best quality, fantasy guild mastery emblem badge, circular golden frame with decorative ribbon, "
    "crisp 3D metallic relief, heraldic crest, game achievement award, symmetrical design, pure white background, isolated"
)

# Batch 1 & 2 資產字典清單
VISUAL_TASKS = {
    # ── Batch 1: 小一數學島 10 款專屬怪獸 ──
    "math_g1_05_seahorse": {
        "category": "monster",
        "batch": 1,
        "name": "加法珊瑚小海馬",
        "target_file": os.path.join(OUTPUT_MONSTERS_DIR, "math_g1_05_seahorse.png"),
        "positive": f"{MONSTER_BASE_POSITIVE}, a tiny friendly coral seahorse, carrying small floating glowing plus signs (+), pastel pink and cyan scales, floating oceanic underwater bubbles",
        "negative": MONSTER_BASE_NEGATIVE
    },
    "math_g1_06_jellyfish": {
        "category": "monster",
        "batch": 1,
        "name": "減法啵啵水母",
        "target_file": os.path.join(OUTPUT_MONSTERS_DIR, "math_g1_06_jellyfish.png"),
        "positive": f"{MONSTER_BASE_POSITIVE}, an adorable translucent glowing jellyfish, floating magic bubbles popping into minus signs (-), gentle lavender and sky-blue glowing bell",
        "negative": MONSTER_BASE_NEGATIVE
    },
    "math_g1_08_clock_whale": {
        "category": "monster",
        "batch": 1,
        "name": "滴答時鐘機械鯨魚",
        "target_file": os.path.join(OUTPUT_MONSTERS_DIR, "math_g1_08_clock_whale.png"),
        "positive": f"{MONSTER_BASE_POSITIVE}, a mini boss mechanical blue whale, cute brass clock gear belly with clock hands showing 3:30, water spout spraying golden gear sparkles",
        "negative": MONSTER_BASE_NEGATIVE
    },
    "math_g1_09_cloud_sheep": {
        "category": "monster",
        "batch": 1,
        "name": "湊十進位雲朵棉花羊",
        "target_file": os.path.join(OUTPUT_MONSTERS_DIR, "math_g1_09_cloud_sheep.png"),
        "positive": f"{MONSTER_BASE_POSITIVE}, an ultra fluffy sheep made of white cumulus clouds, wearing a small golden pocket with number 10, soft golden aura, rainbow horns",
        "negative": MONSTER_BASE_NEGATIVE
    },
    "math_g1_10_lightning_eagle": {
        "category": "monster",
        "batch": 1,
        "name": "破十退位雷電小鷹",
        "target_file": os.path.join(OUTPUT_MONSTERS_DIR, "math_g1_10_lightning_eagle.png"),
        "positive": f"{MONSTER_BASE_POSITIVE}, a feisty yellow lightning fledgling eagle, glowing electric feather crest, tiny sparks cracking into number shards, energetic heroic pose",
        "negative": MONSTER_BASE_NEGATIVE
    },
    "math_g1_11_place_blocks": {
        "category": "monster",
        "batch": 1,
        "name": "十位個位積木石怪",
        "target_file": os.path.join(OUTPUT_MONSTERS_DIR, "math_g1_11_place_blocks.png"),
        "positive": f"{MONSTER_BASE_POSITIVE}, a friendly modular golem made of colorful counting unit cubes and base-ten rods, cute round mossy stone face, cheerful expressions",
        "negative": MONSTER_BASE_NEGATIVE
    },
    "math_g1_12_ruler_dragon": {
        "category": "monster",
        "batch": 1,
        "name": "公分刻度尺神龍",
        "target_file": os.path.join(OUTPUT_MONSTERS_DIR, "math_g1_12_ruler_dragon.png"),
        "positive": f"{MONSTER_BASE_POSITIVE}, a mini boss baby serpentine dragon, wooden centimeter ruler pattern markings on its spine from 0 to 15, holding a tiny crystal stylus",
        "negative": MONSTER_BASE_NEGATIVE
    },
    "math_g1_13_piggy_bank": {
        "category": "monster",
        "batch": 1,
        "name": "金幣撲滿小存錢豬",
        "target_file": os.path.join(OUTPUT_MONSTERS_DIR, "math_g1_13_piggy_bank.png"),
        "positive": f"{MONSTER_BASE_POSITIVE}, a shiny pink porcelain piggy bank adventurer, golden coin slotted on its back, glowing star coins orbiting happily, wearing tiny aviator goggles",
        "negative": MONSTER_BASE_NEGATIVE
    },
    "math_g1_14_space_alien": {
        "category": "monster",
        "batch": 1,
        "name": "二位加減太空章魚",
        "target_file": os.path.join(OUTPUT_MONSTERS_DIR, "math_g1_14_space_alien.png"),
        "positive": f"{MONSTER_BASE_POSITIVE}, a cute alien octopus in a transparent mini astronaut helmet, tentacles juggling math formula meteors, cosmic starry purple skin",
        "negative": MONSTER_BASE_NEGATIVE
    },
    "math_g1_15_calendar_owl": {
        "category": "monster",
        "batch": 1,
        "name": "統計長條圖日曆貓頭鷹",
        "target_file": os.path.join(OUTPUT_MONSTERS_DIR, "math_g1_15_calendar_owl.png"),
        "positive": f"{MONSTER_BASE_POSITIVE}, a scholarly brown owl perched on a stack of colorful 3D bar graph blocks, holding a calendar parchment scroll, small academic glasses",
        "negative": MONSTER_BASE_NEGATIVE
    },

    # ── Batch 2: 3 款道具 + 5 款勳章 ──
    "item_star_coin": {
        "category": "item",
        "batch": 2,
        "name": "冒險星幣 (Star Coin)",
        "target_file": os.path.join(OUTPUT_ITEMS_DIR, "star_coin.png"),
        "positive": f"{ITEM_BASE_POSITIVE}, a gleaming golden fantasy coin embossed with an engraved five-point star, intense inner golden glow, shiny bevels, floating sparkles",
        "negative": MONSTER_BASE_NEGATIVE
    },
    "item_magic_potion": {
        "category": "item",
        "batch": 2,
        "name": "魔力智慧藥水 (Magic Potion)",
        "target_file": os.path.join(OUTPUT_ITEMS_DIR, "magic_potion.png"),
        "positive": f"{ITEM_BASE_POSITIVE}, an ornate fantasy glass flask containing swirling bioluminescent cyan and magenta liquid, cork stopper with golden seal, glowing magical sparkles",
        "negative": MONSTER_BASE_NEGATIVE
    },
    "item_adventure_compass": {
        "category": "item",
        "batch": 2,
        "name": "星際冒險指南針 (Compass)",
        "target_file": os.path.join(OUTPUT_ITEMS_DIR, "adventure_compass.png"),
        "positive": f"{ITEM_BASE_POSITIVE}, a brass steampunk navigational pocket compass, glowing sapphire crystal needle pointing north, ornate celestial zodiac engravings",
        "negative": MONSTER_BASE_NEGATIVE
    },
    "badge_math_master": {
        "category": "badge",
        "batch": 2,
        "name": "數學學科宗師勳章",
        "target_file": os.path.join(OUTPUT_BADGES_DIR, "badge_math.png"),
        "positive": f"{BADGE_BASE_POSITIVE}, center crest featuring a golden abacus and geometric polygon crystals, royal blue silk ribbon with gold tassels, radiant victory glow",
        "negative": MONSTER_BASE_NEGATIVE
    },
    "badge_chinese_master": {
        "category": "badge",
        "batch": 2,
        "name": "國語學科宗師勳章",
        "target_file": os.path.join(OUTPUT_BADGES_DIR, "badge_chinese.png"),
        "positive": f"{BADGE_BASE_POSITIVE}, center crest featuring a traditional calligraphy brush resting on an open bamboo scroll, imperial crimson red silk ribbon, golden dragon trims",
        "negative": MONSTER_BASE_NEGATIVE
    },
    "badge_english_master": {
        "category": "badge",
        "batch": 2,
        "name": "英語學科宗師勳章",
        "target_file": os.path.join(OUTPUT_BADGES_DIR, "badge_english.png"),
        "positive": f"{BADGE_BASE_POSITIVE}, center crest featuring a flying winged alphabet book with glowing quill pen, emerald green silk ribbon, noble silver wing trims",
        "negative": MONSTER_BASE_NEGATIVE
    },
    "badge_science_master": {
        "category": "badge",
        "batch": 2,
        "name": "自然學科宗師勳章",
        "target_file": os.path.join(OUTPUT_BADGES_DIR, "badge_science.png"),
        "positive": f"{BADGE_BASE_POSITIVE}, center crest featuring an atomic orbital ring and swirling galaxy test tube, electric purple silk ribbon, metallic brass gears",
        "negative": MONSTER_BASE_NEGATIVE
    },
    "badge_social_master": {
        "category": "badge",
        "batch": 2,
        "name": "社會學科宗師勳章",
        "target_file": os.path.join(OUTPUT_BADGES_DIR, "badge_social.png"),
        "positive": f"{BADGE_BASE_POSITIVE}, center crest featuring a miniature world globe atop a stone fortress crown, warm amber gold silk ribbon, olive branch laurel wreath",
        "negative": MONSTER_BASE_NEGATIVE
    }
}

def inspect_status():
    """檢視所有 18 款資產目前在磁碟上的就緒狀態"""
    print("\n" + "=" * 70)
    print("🎨 奇幻數學島視覺資產生成狀態巡檢 (Batch 1 & Batch 2)")
    print("=" * 70)
    print(f"{'類別':<8} | {'名稱':<24} | {'狀態':<10} | {'目標路徑'}")
    print("-" * 70)
    
    ready_count = 0
    total_count = len(VISUAL_TASKS)
    
    for key, task in VISUAL_TASKS.items():
        exists = os.path.exists(task['target_file'])
        status_str = "✔ 已就緒" if exists else "❌ 待生成"
        if exists:
            ready_count += 1
        rel_path = os.path.relpath(task['target_file'], BASE_DIR)
        print(f"[{task['category']:<6}] | {task['name']:<22} | {status_str:<8} | {rel_path}")
        
    print("-" * 70)
    print(f"進度總計：{ready_count} / {total_count} ({(ready_count/total_count)*100:.1f}%)\n")

def export_prompts_file():
    """導出結構化 Prompt 清單 (支援 ComfyUI / WebUI / 外部抽卡)"""
    export_path = os.path.join(BASE_DIR, 'docs', 'VISUAL_PROMPTS_RECIPES.json')
    os.makedirs(os.path.dirname(export_path), exist_ok=True)
    with open(export_path, 'w', encoding='utf-8') as f:
        json.dump(VISUAL_TASKS, f, ensure_ascii=False, indent=2)
    print(f"✔ [導出成功] 已輸出結構化 Prompt 字典至：{os.path.relpath(export_path, BASE_DIR)}")

def check_comfyui_server(host="127.0.0.1", port=8188):
    """探測本地 ComfyUI 服務端口狀態"""
    url = f"http://{host}:{port}/system_stats"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                vram_free = data.get('devices', [{}])[0].get('vram_free', 0) / (1024**3)
                print(f"✔ [ComfyUI 在線] 探測成功！可分配顯存: {vram_free:.2f} GB")
                return True
    except Exception:
        print(f"⚡ [ComfyUI 離線] 本地 http://{host}:{port} 尚未啟動。可使用導出的 Prompt 清單或啟動 ComfyUI 後再度調度。")
        return False

def main():
    # 確保輸出目錄就緒
    os.makedirs(OUTPUT_MONSTERS_DIR, exist_ok=True)
    os.makedirs(OUTPUT_ITEMS_DIR, exist_ok=True)
    os.makedirs(OUTPUT_BADGES_DIR, exist_ok=True)
    
    inspect_status()
    export_prompts_file()
    check_comfyui_server()

if __name__ == '__main__':
    main()

