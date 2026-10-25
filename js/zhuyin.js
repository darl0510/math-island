/**
 * 奇幻數學島 - 全域注音標示系統 (Taiwan MOE Standard Zhuyin Ruby System)
 * 支援國小全學科題目、提示、選項預設標註注音（<ruby><rt>），頂部切換與偏好持久化記憶
 */
import { ZHUYIN_DICT } from './zhuyin-data.js';

const STORAGE_KEY = 'fantasy-island-zhuyin-enabled';

/**
 * 檢查注音標示是否啟用（預設為開啟 true）
 */
export function isZhuyinEnabled() {
  try {
    if (typeof localStorage === 'undefined') return true;
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === 'true';
  } catch {
    return true;
  }
}

/**
 * 設定注音標示啟用狀態並同步 body 樣式類別
 */
export function setZhuyinEnabled(val) {
  const enabled = Boolean(val);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    }
  } catch {}
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.toggle('zhuyin-off', !enabled);
  }
  return enabled;
}

/**
 * 切換注音開關狀態
 */
export function toggleZhuyin() {
  return setZhuyinEnabled(!isZhuyinEnabled());
}

/**
 * HTML 特殊符號跳脫
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 移除注音聲調，用於比對
 */
function stripTones(str) {
  return String(str || '').replace(/[ˊˇˋ˙\s]/g, '');
}

/**
 * 將中文文字字元轉換為標準注音 ruby 標籤 (<ruby>字<rt>ㄗˋ</rt></ruby>)
 * 內建防洩題防禦機制：當題目的答案為注音符號且題目包含該生字時，遮蔽該生字注音為「？」
 * 
 * @param {string|any} text - 待標註文字
 * @param {object|null} question - 當前題目物件（可選，提供答案比對以防洩題）
 * @returns {string} 包含 ruby/rt 標籤的 HTML 字串
 */
export function toZhuyinRuby(text, question = null) {
  if (text === null || text === undefined) return '';
  const str = String(text);
  if (!str) return '';

  // 防洩題防禦：如果問的是注音（答案為注音符號），且題目中有該生字，則將該生字的注音遮蔽為「？」
  let maskZhuyinTarget = null;
  if (question && question.answer) {
    const ans = String(question.answer).trim();
    const isZhuyinAnswer = /^[\u3105-\u3129\u02CA\u02C7\u02CB\u02D9\s]+$/.test(ans);
    if (isZhuyinAnswer) {
      maskZhuyinTarget = stripTones(ans);
    }
  }

  // 切割現有 HTML 標籤（如 <span class="..."> 或自訂 tag），保留 HTML 結構不被重複轉換
  const parts = str.split(/(<[^>]+>)/g);
  return parts.map((part) => {
    if (part.startsWith('<') && part.endsWith('>')) {
      return part;
    }

    let out = '';
    for (const char of part) {
      const zhuyin = ZHUYIN_DICT[char];
      if (zhuyin) {
        if (maskZhuyinTarget && stripTones(zhuyin) === maskZhuyinTarget) {
          out += `<ruby class="zhuyin-ruby">${char}<rt class="zhuyin-rt">？</rt></ruby>`;
        } else {
          out += `<ruby class="zhuyin-ruby">${char}<rt class="zhuyin-rt">${zhuyin}</rt></ruby>`;
        }
      } else {
        out += escapeHtml(char);
      }
    }
    return out;
  }).join('');
}

/**
 * 移除文字中的 ruby/rt 標籤，還原純文字
 */
export function stripZhuyin(html) {
  if (!html) return '';
  return String(html)
    .replace(/<rt[^>]*>.*?<\/rt>/gi, '')
    .replace(/<\/?(?:ruby|rt)[^>]*>/gi, '');
}
