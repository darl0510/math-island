#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 scripts/ch_g2_data.py 的表格展開成 data/question-bank-ch-g2.json
（格式與 data/question-bank-ch-g1.json 相同）。"""
import json, os, sys, random
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ch_g2_data import LEVELS

RADICAL = {
    "部首水部": ("氵", "水部，跟水有關"),
    "部首火部": ("灬／火", "火部，跟火有關"),
    "部首木部": ("木", "木部，跟木頭有關"),
    "部首口部": ("口", "口部，跟嘴巴有關"),
}
STRUCT = {"結構左右": "左右結構", "結構上下": "上下結構", "結構包圍": "包圍結構"}
CLOSED = ("全開", "半開", "全閉")
STROKE_HINT = "己全開、已半開、巳全閉；未短上長下、末長上短下、土下長、士上長。"


def build_item(target, ans, distractors, category):
    if category == "筆順規則":
        prompt = f"「{target}」的筆順要遵守哪一條規則？"
        hint = "先寫哪一筆、後寫哪一筆？"
        explanation = f"「{target}」的筆順是「{ans}」。"
    elif category == "筆順選字":
        prompt = f"下面哪一個字的筆順規則是「{target}」？"
        hint = f"想一想，哪個字是{target}的寫法？"
        explanation = f"「{ans}」的筆順規則是「{target}」。"
    elif category == "筆畫先寫":
        prompt = f"寫「{target}」字的時候，筆畫順序應該怎麼寫？"
        hint = "回想一下老師教過的筆畫順序喔！"
        explanation = f"寫「{target}」的時候，{ans}。"
    elif category == "筆順例外":
        prompt = f"下面哪一個字的筆順規則「不是」{target}？"
        hint = f"找一找，哪一個字屬於其他筆順規則？"
        explanation = f"「{ans}」不是{target}，其他三個字才是{target}。"
    elif category == "完整筆順":
        prompt = f"「{target}」的正確筆畫順序是哪一個？"
        hint = "一筆一畫在心中描摹看看！"
        explanation = f"「{target}」的筆順是「{ans}」。"
    elif category in RADICAL:
        mark, note = RADICAL[category]
        prompt = f"下面哪個字的部首是「{mark}」？"
        hint = f"部首代表這個字的類別：{note}。"
        explanation = f"「{target}」的部首是「{mark}」（{note}）。"
    elif category in STRUCT:
        name = STRUCT[category]
        prompt = f"下面哪個字是{name}？"
        hint = "把字拆成兩半，看看它們怎麼擺。"
        explanation = f"「{target}」是{name}。"
    elif category == "部件組合":
        prompt = f"「{target}」是由部件拼成的哪一種結構？"
        hint = "先把它拆成部件，再看部件怎麼擺。"
        explanation = f"「{target}」是「{ans}」。"
    elif category == "選字填空":
        prompt = f"「{target}」的「＿」應該填哪個字？"
        hint = STROKE_HINT
        explanation = f"「{target.replace('＿', ans)}」要寫「{ans}」。"
    elif category == "形近字辨識" and ans in CLOSED:
        prompt = f"「{target}」的封口狀況是哪一個？"
        hint = STROKE_HINT
        explanation = f"「{target}」是「{ans}」。"
    elif category == "形近字辨識":
        prompt = f"「{target}」的橫畫怎麼分？"
        hint = STROKE_HINT
        explanation = f"「{target}」是「{ans}」。"
    elif category == "量詞":
        prompt = f"一（＿）{target}，應該用哪個量詞？"
        hint = "想想平常怎麼幫它數數。"
        explanation = f"正確說法是「一{ans}{target}」。"
    else:
        raise ValueError(f"未知類別：{category}")
    return prompt, hint, explanation


def main():
    rng = random.Random(20261025)
    levels, total = {}, 0
    for lv in range(1, 17):
        rows = LEVELS[lv]
        if len(rows) != 8:
            raise AssertionError(f"第 {lv} 關有 {len(rows)} 筆，應為 8 筆")
        qs = []
        for target, ans, d1, d2, d3, category in rows:
            opts = [ans, d1, d2, d3]
            if len(set(opts)) != 4:
                raise AssertionError(f"第 {lv} 關「{target}」選項重複：{opts}")
            rng.shuffle(opts)
            prompt, hint, explanation = build_item(target, ans, opts, category)
            if category in ("筆順選字", "筆順例外"):
                v_char = "？"
                v_word = target
            elif category in RADICAL:
                mark, note = RADICAL[category]
                v_char = mark.split("／")[0] if "／" in mark else mark
                v_word = note
            elif category in STRUCT:
                v_char = "？"
                v_word = STRUCT[category]
            elif category == "選字填空":
                v_char = "？"
                v_word = target
            else:
                v_char = target if len(target) == 1 else ""
                v_word = target

            qs.append({
                "prompt": prompt,
                "speak": prompt.replace("＿", "空格").replace("、", "，"),
                "hint": hint,
                "explanation": explanation,
                "answer": ans,
                "options": opts,
                "category": category,
                "visual": {
                    "type": "chinese",
                    "character": v_char,
                    "word": v_word,
                },
            })
        levels[str(lv)] = qs
        total += len(qs)
    bank = {
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "targetPerLevel": 8,
        "totalQuestions": total,
        "subject": "chinese",
        "grade": 2,
        "levels": levels,
    }
    out = os.path.join("data", "question-bank-ch-g2.json")
    os.makedirs("data", exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(bank, f, ensure_ascii=False, indent=2)
    print(f"[OK] {out}：{total} 題 / {len(levels)} 關")


if __name__ == "__main__":
    main()
