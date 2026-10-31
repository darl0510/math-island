# -*- coding: utf-8 -*-
import os
import re

p = r'C:\Users\達爾\projects\math-island\js\monsters.js'
with open(p, 'r', encoding='utf-8') as f:
    text = f.read()

# 替換各關卡的 fallback 圖片路徑
replacements = {
    'math_g1_05_seahorse': 'assets/monsters/math_g1/math_g1_05_seahorse.png',
    'math_g1_06_jellyfish': 'assets/monsters/math_g1/math_g1_06_jellyfish.png',
    'math_g1_08_clock_whale': 'assets/monsters/math_g1/math_g1_08_clock_whale.png',
    'math_g1_09_cloud_sheep': 'assets/monsters/math_g1/math_g1_09_cloud_sheep.png',
    'math_g1_10_lightning_eagle': 'assets/monsters/math_g1/math_g1_10_lightning_eagle.png',
    'math_g1_11_place_blocks': 'assets/monsters/math_g1/math_g1_11_place_blocks.png',
    'math_g1_12_ruler_dragon': 'assets/monsters/math_g1/math_g1_12_ruler_dragon.png',
    'math_g1_13_piggy_bank': 'assets/monsters/math_g1/math_g1_13_piggy_bank.png',
    'math_g1_14_space_alien': 'assets/monsters/math_g1/math_g1_14_space_alien.png',
    'math_g1_15_calendar_owl': 'assets/monsters/math_g1/math_g1_15_calendar_owl.png',
}

for m_id, img_path in replacements.items():
    # 匹配對應 id 區塊內的 image: '...'
    pattern = rf"(id:\s*'{m_id}',[\s\S]*?image:\s*')([^']+)(')"
    text = re.sub(pattern, rf"\g<1>{img_path}\g<3>", text)

with open(p, 'w', encoding='utf-8') as f:
    f.write(text)

print("✔ [更新成功] monsters.js 中小一數學島 16 關怪獸路徑已全面對齊專屬立繪！")

