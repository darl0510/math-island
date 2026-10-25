# -*- coding: utf-8 -*-
"""
清洗英文題庫 hints 與 visual，徹底根治洩題問題：
1. 移除 hint 中直接點名正解的詞句（如「mug 是喝水用的杯子喔！」、「game 結尾有 e」）
2. 轉為引導性教學提示
3. 檢查三本英文題庫 (en-g1, en-g2, en-g3)
"""

import json
import os
import re

DATA_FILES = [
    'data/question-bank-en-g1.json',
    'data/question-bank-en-g2.json',
    'data/question-bank-en-g3.json',
]

def sanitize_hint(q):
    prompt = q.get('prompt', '')
    ans = str(q.get('answer', '')).strip()
    hint = str(q.get('hint', '')).strip()
    ans_lower = ans.lower()
    
    # 1. 填空題：c_b 缺了哪個字母？
    if '缺了哪個' in prompt or '_' in prompt:
        if ans_lower in hint.lower() and len(ans) == 1:
            if ans_lower in ['a', 'e', 'i', 'o', 'u']:
                hint = "仔細聽聽看單字中間的母音發音喔！"
            else:
                hint = "輕輕讀讀看，選出發音最符合的字母！"

    # 2. 拼字題：哪一個拼字是正確的？
    elif '哪一個拼字是正確的' in prompt or '拼字' in prompt:
        if ans_lower in hint.lower():
            hint = "觀察母音組合與結尾結構，找出符合發音規則的單字！"

    # 3. 英翻中：xxx 是什麼意思？
    elif '是什麼意思' in prompt or '中文意思' in prompt:
        if ans in hint or ans_lower in hint.lower():
            hint = "觀察圖片中的物品特徵，想想平常生活中的用途喔！"

    # 4. 中翻英：哪一個單字的意思是「xxx」？
    elif '哪一個單字' in prompt:
        if ans_lower in hint.lower():
            if '結尾有 e' in hint or 'a_e' in hint or 'i_e' in hint or 'o_e' in hint or 'u_e' in hint:
                hint = "想想看長母音規則：結尾有一個不發音的魔法 e 喔！"
            elif 'ay' in hint or 'ai' in hint or 'ee' in hint or 'ea' in hint:
                hint = "注意母音組合的發音特徵喔！"
            else:
                hint = "想想這個單字的開頭音與母音發音！"

    # 5. What is this?
    elif 'What is this' in prompt:
        if ans_lower in hint.lower() or ans in hint:
            hint = "看圖想一想，這個生活物品的英文名字是什麼？"

    # 6. 通用檢查：若 hint 仍包含正解字串（長度 >= 2），進行脫敏
    if len(ans) >= 2 and ans.lower() in hint.lower():
        # 若是解釋類「xxx 是...」
        pattern = re.compile(re.escape(ans), re.IGNORECASE)
        hint = pattern.sub("這個單字", hint)
        hint = hint.replace("這個單字 是", "它代表")

    # 7. 英文單字釋義題之 visual.text 淨化：若問 mug 是什麼意思，visual.text 不應同時印出 mug 又有杯子 emoji
    visual = q.get('visual')
    if visual and isinstance(visual, dict):
        v_text = str(visual.get('text', '')).strip().replace(' ', '').lower()
        if '是什麼意思' in prompt and v_text:
            # 題目 prompt 已經寫了 mug，教具不需要重複印出單字
            visual['text'] = ''

    q['hint'] = hint
    return q

def process_file(path):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return 0
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    levels_dict = data.get('levels', data)
    modified_count = 0
    for level_key, questions in levels_dict.items():
        if isinstance(questions, list):
            for q in questions:
                old_hint = q.get('hint', '')
                sanitize_hint(q)
                if q.get('hint', '') != old_hint:
                    modified_count += 1

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Processed {path}: cleaned {modified_count} hints.")
    return modified_count

if __name__ == '__main__':
    total = sum(process_file(p) for p in DATA_FILES)
    print(f"All done! Total hints sanitized: {total}")
