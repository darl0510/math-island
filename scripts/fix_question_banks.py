# scripts/fix_question_banks.py
# 清洗英文島與國語島題庫：修正語音讀題為親切中文雙語引導，並徹底消除視覺教具洩題

import json
import re

def fix_english_question(q):
    prompt = q.get('prompt', '')
    ans = str(q.get('answer', '')).strip()
    speak = q.get('speak', '')
    visual = q.get('visual')

    # 1. 修正 visual 洩題 (看圖選字)
    if visual and visual.get('type') == 'scene':
        v_text = str(visual.get('text', '')).replace(' ', '').lower()
        if ans and (v_text == ans.lower() or ans.lower() in v_text):
            # 如果有可愛圖片，將 text 清空，只展示圖片讓學童看圖思考
            if visual.get('emojis'):
                visual['text'] = ''
            else:
                visual['text'] = f"{ans[0]} _ _" if len(ans) > 1 else '?'

    # 2. 修正 speak 語音讀題 (改為適合台灣小學生的親切中文發音引導，不劇透答案)
    # 如果 prompt 是「看圖選單字：...是什麼？」
    if '看圖選單字' in prompt or '看圖' in prompt:
        # 提取 prompt 中的主體（例如 emoji 或描述）
        match = re.search(r'：(.*?)(?:是|\?)', prompt)
        target = match.group(1).strip() if match else '圖片'
        q['speak'] = f"看圖選單字：請看中間的圖片，選出正確的英文單字喔！"
    elif '是什麼意思' in prompt:
        match = re.search(r'([a-zA-Z\s_\-]+)\s*是什麼意思', prompt)
        word = match.group(1).strip() if match else ans
        q['speak'] = f"請問 {word} 是什麼意思呢？"
    elif '開頭音' in prompt or '開頭字母' in prompt:
        q['speak'] = f"看圖選出正確的開頭發音喔！"
    elif '押韻' in prompt:
        q['speak'] = f"聽一聽，哪一個單字的尾音有押韻呢？"
    elif '聽一聽' in prompt or '哪一個是' in prompt:
        q['speak'] = f"仔細聽，選出正確的選項喔！"
    else:
        # 一般題目：直接使用中文 prompt 作為朗讀，避免英文讀題直接爆出答案
        clean_prompt = prompt.replace('？', '呢？')
        q['speak'] = clean_prompt

    return q


def fix_chinese_g1_question(q):
    prompt = q.get('prompt', '')
    ans = str(q.get('answer', '')).strip()
    visual = q.get('visual')

    if visual and visual.get('type') == 'phonetic':
        sym = str(visual.get('symbol', '')).strip()
        word = str(visual.get('word', '')).strip()

        # 如果問的是注音或結合韻 (答案是注音符號)
        if ans == sym:
            # 遮蔽 symbol 為 ？，保留題目字
            visual['symbol'] = '？'
            visual['word'] = word or prompt.replace('「', '').replace('」', '').split('的')[0]
        elif ans == word:
            # 如果問的是生字 (答案是字)
            visual['word'] = '？'
            visual['symbol'] = sym

    # 確保 speak 也是溫和的讀題
    if not q.get('speak') or '大聲念' in q.get('speak', ''):
        q['speak'] = prompt

    return q


def process_file(filepath, fix_fn):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    levels = data.get('levels', {})
    count = 0
    for lid, qlist in levels.items():
        for q in qlist:
            fix_fn(q)
            count += 1

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ 完成清洗 {filepath}，共處理 {count} 題")


if __name__ == '__main__':
    print("🚀 開始全面清洗題庫語音讀題與視覺洩題...")
    process_file('data/question-bank-en-g1.json', fix_english_question)
    process_file('data/question-bank-en-g2.json', fix_english_question)
    process_file('data/question-bank-en-g3.json', fix_english_question)
    process_file('data/question-bank-ch-g1.json', fix_chinese_g1_question)
    print("🎉 全部題庫清洗完成！")
