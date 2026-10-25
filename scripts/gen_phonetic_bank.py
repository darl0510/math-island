#!/usr/bin/env python3
"""Generate phonetic question bank: 16 levels x 8 questions = 128."""
import json, random, datetime

random.seed(42)

# 聲母 (21)
initials = [
    ("ㄅ","爸"),("ㄆ","怕"),("ㄇ","媽"),("ㄈ","發"),("ㄉ","打"),
    ("ㄊ","他"),("ㄋ","那"),("ㄌ","拉"),("ㄍ","哥"),("ㄎ","可"),
    ("ㄏ","喝"),("ㄐ","機"),("ㄑ","七"),("ㄒ","西"),("ㄓ","知"),
    ("ㄔ","吃"),("ㄕ","師"),("ㄖ","日"),("ㄗ","字"),("ㄘ","次"),("ㄙ","思"),
]

# 韻母 (16)
finals = [
    ("ㄚ","呀"),("ㄛ","喔"),("ㄜ","呃"),("ㄝ","耶"),("ㄞ","愛"),
    ("ㄟ","給"),("ㄠ","凹"),("ㄡ","歐"),("ㄢ","安"),("ㄣ","恩"),
    ("ㄤ","昂"),("ㄥ","鞥"),("ㄧ","衣"),("ㄨ","烏"),("ㄩ","迂"),("ㄨㄚ","蛙"),
]

# 結合韻 (12)
combined = [
    ("ㄧㄚ","呀"),("ㄧㄠ","腰"),("ㄧㄡ","優"),("ㄧㄢ","煙"),("ㄧㄣ","因"),
    ("ㄧㄤ","央"),("ㄧㄥ","英"),("ㄨㄛ","窩"),("ㄨㄞ","歪"),("ㄨㄣ","溫"),
    ("ㄩㄝ","月"),("ㄩㄣ","雲"),
]

# 看字讀音 (40 pairs)
read_pairs = [
    ("爸","ㄅㄚ"),("媽","ㄇㄚ"),("他","ㄊㄚ"),("那","ㄋㄚ"),("哥","ㄍㄜ"),
    ("可","ㄎㄜ"),("喝","ㄏㄜ"),("機","ㄐㄧ"),("七","ㄑㄧ"),("西","ㄒㄧ"),
    ("知","ㄓ"),("吃","ㄔ"),("師","ㄕ"),("日","ㄖ"),("字","ㄗ"),
    ("次","ㄘ"),("思","ㄙ"),("愛","ㄞ"),("安","ㄢ"),("恩","ㄣ"),
    ("衣","ㄧ"),("烏","ㄨ"),("迂","ㄩ"),("蛙","ㄨㄚ"),("呀","ㄚ"),
    ("喔","ㄛ"),("呃","ㄜ"),("耶","ㄝ"),("凹","ㄠ"),("歐","ㄡ"),
    ("昂","ㄤ"),("鞥","ㄥ"),("煙","ㄧㄢ"),("因","ㄧㄣ"),("央","ㄧㄤ"),
    ("英","ㄧㄥ"),("窩","ㄨㄛ"),("歪","ㄨㄞ"),("溫","ㄨㄣ"),("月","ㄩㄝ"),
]

# 拼讀 pairs (聲母+韻母)
spelling = [
    ("ㄅ","ㄚ","ㄅㄚ","爸"),("ㄆ","ㄚ","ㄆㄚ","怕"),("ㄇ","ㄚ","ㄇㄚ","媽"),
    ("ㄈ","ㄚ","ㄈㄚ","發"),("ㄉ","ㄚ","ㄉㄚ","打"),("ㄊ","ㄚ","ㄊㄚ","他"),
    ("ㄋ","ㄚ","ㄋㄚ","那"),("ㄌ","ㄚ","ㄌㄚ","拉"),("ㄅ","ㄛ","ㄅㄛ","波"),
    ("ㄆ","ㄛ","ㄆㄛ","坡"),("ㄇ","ㄛ","ㄇㄛ","摸"),("ㄈ","ㄛ","ㄈㄛ","佛"),
    ("ㄉ","ㄜ","ㄉㄜ","得"),("ㄊ","ㄜ","ㄊㄜ","特"),("ㄋ","ㄜ","ㄋㄜ","呢"),
    ("ㄌ","ㄜ","ㄌㄜ","勒"),("ㄅ","ㄞ","ㄅㄞ","杯"),("ㄆ","ㄞ","ㄆㄞ","陪"),
    ("ㄇ","ㄞ","ㄇㄞ","沒"),("ㄈ","ㄞ","ㄈㄞ","非"),("ㄅ","ㄠ","ㄅㄠ","包"),
    ("ㄆ","ㄠ","ㄆㄠ","跑"),("ㄇ","ㄠ","ㄇㄠ","毛"),("ㄈ","ㄠ","ㄈㄠ","風"),
    ("ㄅ","ㄢ","ㄅㄢ","班"),("ㄆ","ㄢ","ㄆㄢ","潘"),("ㄇ","ㄢ","ㄇㄢ","門"),
    ("ㄈ","ㄢ","ㄈㄢ","分"),("ㄅ","ㄣ","ㄅㄣ","奔"),("ㄆ","ㄣ","ㄆㄣ","噴"),
    ("ㄇ","ㄣ","ㄇㄣ","民"),("ㄈ","ㄣ","ㄈㄣ","芬"),("ㄅ","ㄤ","ㄅㄤ","帮"),
    ("ㄆ","ㄤ","ㄆㄤ","旁"),("ㄇ","ㄤ","ㄇㄤ","忙"),("ㄈ","ㄤ","ㄈㄤ","方"),
    ("ㄅ","ㄥ","ㄅㄥ","崩"),("ㄆ","ㄥ","ㄆㄥ","朋"),("ㄇ","ㄥ","ㄇㄥ","蒙"),
    ("ㄈ","ㄥ","ㄈㄥ","風"),("ㄅ","ㄧ","ㄅㄧ","逼"),("ㄆ","ㄧ","ㄆㄧ","批"),
    ("ㄇ","ㄧ","ㄇㄧ","迷"),("ㄈ","ㄧ","ㄈㄧ","非"),("ㄅ","ㄨ","ㄅㄨ","不"),
    ("ㄆ","ㄨ","ㄆㄨ","普"),("ㄇ","ㄨ","ㄇㄨ","木"),("ㄈ","ㄨ","ㄈㄨ","福"),
    ("ㄅ","ㄡ","ㄅㄡ","北"),("ㄆ","ㄡ","ㄆㄡ","陪"),("ㄇ","ㄡ","ㄇㄡ","某"),
    ("ㄈ","ㄡ","ㄈㄡ","否"),("ㄅ","ㄝ","ㄅㄝ","別"),("ㄆ","ㄝ","ㄆㄝ","撇"),
    ("ㄇ","ㄝ","ㄇㄝ","滅"),("ㄈ","ㄝ","ㄈㄝ","別"),("ㄅ","ㄟ","ㄅㄟ","北"),
    ("ㄆ","ㄟ","ㄆㄟ","陪"),("ㄇ","ㄟ","ㄇㄟ","沒"),("ㄈ","ㄟ","ㄈㄟ","非"),
]

def make_options(correct, pool, n=4):
    """Pick n options including correct answer."""
    others = [x for x in pool if x != correct]
    random.shuffle(others)
    opts = [correct] + others[:n-1]
    random.shuffle(opts)
    return opts

def gen_initial_questions(pool):
    qs = []
    for sym, word in pool:
        others = [s for s, w in initials if s != sym]
        random.shuffle(others)
        opts = [sym] + others[:3]
        random.shuffle(opts)
        qs.append({
            "prompt": f"「{word}」的聲母是什麼？",
            "speak": f"「{word}」的聲母是什麼？",
            "hint": "聲母是開頭的那個音。",
            "explanation": f"「{word}」的聲母是「{sym}」。",
            "answer": sym,
            "options": opts,
            "category": "聲母",
            "visual": {"type": "phonetic", "symbol": sym, "word": word}
        })
    return qs

def gen_final_questions(pool):
    qs = []
    for sym, word in pool:
        others = [s for s, w in finals if s != sym]
        random.shuffle(others)
        opts = [sym] + others[:3]
        random.shuffle(opts)
        qs.append({
            "prompt": f"「{word}」的韻母是什麼？",
            "speak": f"「{word}」的韻母是什麼？",
            "hint": "韻母是結尾的那個音。",
            "explanation": f"「{word}」的韻母是「{sym}」。",
            "answer": sym,
            "options": opts,
            "category": "韻母",
            "visual": {"type": "phonetic", "symbol": sym, "word": word}
        })
    return qs

def gen_combined_questions(pool):
    qs = []
    for sym, word in pool:
        others = [s for s, w in combined if s != sym]
        random.shuffle(others)
        opts = [sym] + others[:3]
        random.shuffle(opts)
        qs.append({
            "prompt": f"「{word}」的結合韻是什麼？",
            "speak": f"「{word}」的結合韻是什麼？",
            "hint": "結合韻是兩個韻母合在一起的音。",
            "explanation": f"「{word}」的結合韻是「{sym}」。",
            "answer": sym,
            "options": opts,
            "category": "結合韻",
            "visual": {"type": "phonetic", "symbol": sym, "word": word}
        })
    return qs

def gen_read_questions(pool):
    qs = []
    for word, phon in pool:
        others = [p for w, p in read_pairs if p != phon]
        random.shuffle(others)
        opts = [phon] + others[:3]
        random.shuffle(opts)
        qs.append({
            "prompt": f"「{word}」的注音是什麼？",
            "speak": f"「{word}」的注音是什麼？",
            "hint": "想想這個字怎麼拼。",
            "explanation": f"「{word}」的注音是「{phon}」。",
            "answer": phon,
            "options": opts,
            "category": "看字讀音",
            "visual": {"type": "phonetic", "symbol": phon, "word": word}
        })
    return qs

def gen_spelling_questions(pool):
    qs = []
    for ini, fin, full, word in pool:
        others = [f for i, fi, f, w in spelling if f != full]
        random.shuffle(others)
        opts = [full] + others[:3]
        random.shuffle(opts)
        qs.append({
            "prompt": f"「{ini}」+「{fin}」拼起來是什麼？",
            "speak": f"「{ini}」加「{fin}」拼起來是什麼？",
            "hint": "把聲母和韻母合在一起讀。",
            "explanation": f"「{ini}」+「{fin}」=「{full}」，就是「{word}」。",
            "answer": full,
            "options": opts,
            "category": "拼讀",
            "visual": {"type": "phonetic", "symbol": full, "word": word}
        })
    return qs

# Build all questions
all_q = []
all_q += gen_initial_questions(initials)       # 21
all_q += gen_final_questions(finals)           # 16
all_q += gen_combined_questions(combined)      # 12
all_q += gen_read_questions(read_pairs)        # 40
all_q += gen_spelling_questions(spelling)      # 60
# total = 149, need exactly 128
random.shuffle(all_q)
all_q = all_q[:128]

# Split into 16 levels x 8
levels = {}
for i in range(16):
    levels[str(i+1)] = all_q[i*8:(i+1)*8]

bank = {
    "generatedAt": datetime.datetime.utcnow().isoformat() + "Z",
    "targetPerLevel": 8,
    "totalQuestions": 128,
    "subject": "phonetic",
    "grade": 1,
    "levels": levels
}

with open("data/question-bank-ch-g1.json", "w", encoding="utf-8") as f:
    json.dump(bank, f, ensure_ascii=False, indent=2)

print(f"Generated {sum(len(v) for v in levels.values())} questions in {len(levels)} levels.")
