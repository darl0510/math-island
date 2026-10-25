#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/generate_challenge_banks.py
===================================
為國小一至三年級生成跨科目期末綜合挑戰島題庫 (Challenge Question Banks)
每個年級 16 關 x 6 題 = 96 題高畫質跨領域素養綜合評量題：
- 每關 2 題精選自數學題庫 (data/question-bank-g{g}.json)
- 每關 2 題精選自英文題庫 (data/question-bank-en-g{g}.json)
- 每關 2 題精選自國語題庫 (data/question-bank-ch-g{g}.json)
題幹加上科目領域徽章標籤，嚴格遵守無 optionEmojis 答案洩漏規範。
"""

import json
import os
import copy

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, 'data')

def generate_challenge_bank_for_grade(grade: int):
    math_path = os.path.join(DATA_DIR, f'question-bank-g{grade}.json')
    en_path = os.path.join(DATA_DIR, f'question-bank-en-g{grade}.json')
    ch_path = os.path.join(DATA_DIR, f'question-bank-ch-g{grade}.json')
    out_path = os.path.join(DATA_DIR, f'question-bank-challenge-g{grade}.json')

    with open(math_path, 'r', encoding='utf-8') as f:
        math_data = json.load(f)
    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    with open(ch_path, 'r', encoding='utf-8') as f:
        ch_data = json.load(f)

    math_levels = math_data.get('levels', math_data)
    en_levels = en_data.get('levels', {})
    ch_levels = ch_data.get('levels', {})

    grade_names = {1: '一年級', 2: '二年級', 3: '三年級'}

    challenge_data = {
        "generatedAt": "2026-10-25T22:30:00Z",
        "subject": "challenge",
        "grade": grade,
        "gradeName": grade_names.get(grade, f"{grade}年級"),
        "targetPerLevel": 6,
        "levels": {}
    }

    for lvl in range(1, 17):
        lvl_key = str(lvl)
        m_list = math_levels.get(lvl_key, [])
        e_list = en_levels.get(lvl_key, [])
        c_list = ch_levels.get(lvl_key, [])

        q_combined = []

        # 1. 挑選 2 題數學
        m_picked = m_list[:2] if len(m_list) >= 2 else m_list
        for item in m_picked:
            q = copy.deepcopy(item)
            if not q.get('prompt', '').startswith('[數學]'):
                q['prompt'] = f"[數學] 📐 {q.get('prompt', '')}"
            if 'optionEmojis' in q:
                del q['optionEmojis']
            q['subject'] = 'math'
            q_combined.append(q)

        # 2. 挑選 2 題英文
        e_picked = e_list[:2] if len(e_list) >= 2 else e_list
        for item in e_picked:
            q = copy.deepcopy(item)
            if not q.get('prompt', '').startswith('[英文]'):
                q['prompt'] = f"[英文] 🔤 {q.get('prompt', '')}"
            if 'optionEmojis' in q:
                del q['optionEmojis']
            q['subject'] = 'english'
            q_combined.append(q)

        # 3. 挑選 2 題國語
        c_picked = c_list[:2] if len(c_list) >= 2 else c_list
        for item in c_picked:
            q = copy.deepcopy(item)
            if not q.get('prompt', '').startswith('[國語]'):
                q['prompt'] = f"[國語] 📖 {q.get('prompt', '')}"
            if 'optionEmojis' in q:
                del q['optionEmojis']
            q['subject'] = 'chinese'
            q_combined.append(q)

        challenge_data["levels"][lvl_key] = q_combined

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(challenge_data, f, ensure_ascii=False, indent=2)

    total_q = sum(len(qs) for qs in challenge_data["levels"].values())
    print(f"✅ [G{grade}] 期末綜合挑戰題庫產出成功: {out_path} (共 16 關, {total_q} 題)")

if __name__ == '__main__':
    for g in (1, 2, 3):
        generate_challenge_bank_for_grade(g)
