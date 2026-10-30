import re

with open('js/engine.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 替換 HTML 結構
old_buddy_html = r'''        <div class="buddy" aria-hidden="true">
          <img src="assets/images/mascot.jpg" alt="" />
          <span class="buddy-bubble" id="buddy-bubble">加油！</span>
        </div>'''

new_buddy_html = r'''        <div class="buddy" id="mascot-buddy" aria-hidden="true">
          <div class="buddy-avatar-wrap">
            <img src="assets/images/mascot.jpg" alt="" class="buddy-img" />
            <span class="buddy-mood-badge" id="buddy-mood-badge">✨</span>
          </div>
          <span class="buddy-bubble" id="buddy-bubble">加油！</span>
        </div>'''

content = content.replace(old_buddy_html.replace('\n', '\r\n'), new_buddy_html.replace('\n', '\r\n'))
if 'id="mascot-buddy"' not in content:
    content = content.replace(old_buddy_html, new_buddy_html)

# 2. 擴充 setBuddy 函式為 setBuddyMood
old_buddy_fn = r'''function setBuddy(text) {
  const buddy = document.getElementById('buddy-bubble');
  if (buddy) buddy.innerHTML = toZhuyinRuby(text);
}'''

new_buddy_fn = r'''const BUDDY_MOOD_CONFIG = {
  idle:       { badge: '🦊', animation: 'mascot-idle', scale: 1 },
  cheer:      { badge: '✨', animation: 'mascot-bounce', scale: 1.05 },
  correct:    { badge: '🎉', animation: 'mascot-cheer', scale: 1.15 },
  combo:      { badge: '🔥', animation: 'mascot-super', scale: 1.25 },
  think:      { badge: '🤔', animation: 'mascot-think', scale: 0.95 },
  encourage:  { badge: '💪', animation: 'mascot-gentle', scale: 1 },
  celebrate:  { badge: '👑', animation: 'mascot-celebrate', scale: 1.3 }
};

export function setBuddyMood(mood = 'idle', text = null) {
  const buddyEl = document.getElementById('mascot-buddy');
  const badgeEl = document.getElementById('buddy-mood-badge');
  const bubbleEl = document.getElementById('buddy-bubble');
  const cfg = BUDDY_MOOD_CONFIG[mood] || BUDDY_MOOD_CONFIG.idle;

  if (badgeEl) {
    badgeEl.textContent = cfg.badge;
    badgeEl.className = `buddy-mood-badge buddy-badge-${mood} badge-pop`;
    setTimeout(() => badgeEl.classList.remove('badge-pop'), 400);
  }

  if (buddyEl) {
    buddyEl.className = `buddy buddy--${mood}`;
    buddyEl.style.setProperty('--buddy-scale', cfg.scale);
  }

  if (text && bubbleEl) {
    bubbleEl.innerHTML = toZhuyinRuby(text);
    bubbleEl.classList.remove('bubble-pop');
    void bubbleEl.offsetWidth; // trigger reflow
    bubbleEl.classList.add('bubble-pop');
  }
}

export function setBuddy(text) {
  setBuddyMood('cheer', text);
}'''

content = content.replace(old_buddy_fn.replace('\n', '\r\n'), new_buddy_fn.replace('\n', '\r\n'))
if 'BUDDY_MOOD_CONFIG' not in content:
    content = content.replace(old_buddy_fn, new_buddy_fn)

# 3. 更新 chooseAnswer / renderQuestion / hint / finishLevel 中的 setBuddy 呼叫
# 答對：
content = content.replace(
    "setBuddy('太棒了！');",
    "if (session.combo && session.combo.count >= 2) {\n      setBuddyMood('combo', `連對 ×${session.combo.count}！太神啦！`);\n    } else {\n      setBuddyMood('correct', '太棒了！答對囉！');\n    }"
)

# 答錯第一次：
content = content.replace(
    "setBuddy('再想想～');",
    "setBuddyMood('think', '再想想～別灰心！');"
)

# 查看提示：
content = content.replace(
    "document.getElementById('buddy-bubble').textContent = '看提示！';",
    "setBuddyMood('encourage', '仔細看提示喔！');"
)

# 每題開始渲染時重置表情：
content = content.replace(
    "buddy.innerHTML = toZhuyinRuby(pickBuddy(session.index));",
    "setBuddyMood('cheer', pickBuddy(session.index));"
)

with open('js/engine.js', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Engine update complete! Verified elements:")
print("- mascot-buddy in file:", "id=\"mascot-buddy\"" in content)
print("- BUDDY_MOOD_CONFIG in file:", "BUDDY_MOOD_CONFIG" in content)

