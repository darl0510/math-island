import { getState, setMusicOn, setTtsOn } from './state.js';

const BASE = 'assets/audio';
const TTS_STYLE = '台灣口音（中華民國國語），親切、活潑、溫柔的幼兒園老師，咬字清楚，語速稍慢，充滿鼓勵';
const TTS_VOICE = 'Aoede';
const MAX_CACHE = 120;

class AudioManager {
  constructor() {
    this.musicOn = getState().musicOn !== false;
    this.ttsOn = getState().ttsOn !== false;
    this.speechLang = 'zh-TW';
    this.channels = [new Audio(), new Audio()];
    this.activeChannel = 0;
    this.currentTheme = null;
    this.musicVolume = 0.32;
    this.ducked = false;
    this.speechAudio = null;
    this.speechCache = new Map();
    this.staticClips = new Map();
    this.staticMode = false;
    this.speechToken = 0;
    this.prefetchQueue = [];
    this.prefetching = 0;
    this.unlocked = false;
    this.onMusicChange = null;
    this.onTtsChange = null;

    this.cachedVoices = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.updateVoices();
      window.speechSynthesis.onvoiceschanged = () => this.updateVoices();
    }

    for (const channel of this.channels) {
      channel.loop = true;
      channel.preload = 'auto';
      channel.volume = 0;
    }
  }

  updateVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.cachedVoices = window.speechSynthesis.getVoices() || [];
    }
  }

  unlock() {
    this.unlocked = true;
    if (!this.musicOn) return;
    if (this.currentTheme) this.playMusic(this.currentTheme, true);
    else this.playMusic('title');
  }

  toggleMusic(force) {
    this.musicOn = typeof force === 'boolean' ? force : !this.musicOn;
    setMusicOn(this.musicOn);
    if (!this.musicOn) {
      this.fadeOutAll();
    } else if (this.currentTheme) {
      this.playMusic(this.currentTheme, true);
    } else {
      this.playMusic('title');
    }
    if (this.onMusicChange) this.onMusicChange(this.musicOn);
    return this.musicOn;
  }

  /* 雙軌語音引擎：科目決定語系（英文島 → en-US 美語引擎） */
  setSpeechLang(lang) {
    const next = lang || 'zh-TW';
    if (this.speechLang === next) return next;
    this.speechLang = next;
    this.stopSpeech();
    window.speechSynthesis?.cancel();
    return next;
  }

  toggleTts(force) {
    this.ttsOn = typeof force === 'boolean' ? force : !this.ttsOn;
    setTtsOn(this.ttsOn);
    if (!this.ttsOn) {
      this.stopSpeech();
      window.speechSynthesis?.cancel();
    }
    if (this.onTtsChange) this.onTtsChange(this.ttsOn);
    return this.ttsOn;
  }

  playMusic(theme = 'title', restart = false) {
    const next = `${BASE}/music/${theme}.mp3`;
    if (!restart && this.currentTheme === theme && this.channels[this.activeChannel].src.endsWith(`${theme}.mp3`)) {
      if (this.musicOn && this.unlocked) {
        this.channels[this.activeChannel].play().catch(() => {});
      }
      return;
    }
    const oldChannel = this.channels[this.activeChannel];
    const oldIndex = this.activeChannel;
    this.activeChannel = 1 - this.activeChannel;
    const channel = this.channels[this.activeChannel];
    channel.src = next;
    channel.currentTime = 0;
    channel.volume = 0;
    this.currentTheme = theme;

    if (!this.musicOn || !this.unlocked) {
      this.fadeOut(oldChannel);
      return;
    }

    channel.play().then(() => {
      this.fadeIn(channel, this.ducked ? 0.05 : this.musicVolume);
      this.fadeOut(oldChannel);
    }).catch(() => {
      /* 瀏覽器可能阻擋自動播放，等第一次點擊後再試 */
    });

    void oldIndex;
  }

  fadeIn(channel, target, duration = 700) {
    const start = performance.now();
    const from = channel.volume;
    const step = (now) => {
      const progress = Math.min(1, Math.max(0, (now - start) / duration));
      if (this.channels.includes(channel)) {
        channel.volume = Math.min(1, Math.max(0, from + (target - from) * progress));
      }
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  fadeOut(channel, duration = 500) {
    const start = performance.now();
    const from = channel.volume;
    const step = (now) => {
      const progress = Math.min(1, Math.max(0, (now - start) / duration));
      channel.volume = Math.min(1, Math.max(0, from * (1 - progress)));
      if (progress < 1) requestAnimationFrame(step);
      else {
        channel.pause();
        channel.removeAttribute('src');
      }
    };
    requestAnimationFrame(step);
  }

  fadeOutAll() {
    for (const channel of this.channels) this.fadeOut(channel);
  }

  duck() {
    this.ducked = true;
    const channel = this.channels[this.activeChannel];
    if (!channel.paused) this.fadeIn(channel, 0.07, 250);
  }

  unduck() {
    this.ducked = false;
    if (this.musicOn && this.unlocked) {
      const channel = this.channels[this.activeChannel];
      if (channel.src && !channel.paused) this.fadeIn(channel, this.musicVolume, 500);
    }
  }

  playSfx(name, volume = 0.65) {
    const audio = new Audio(`${BASE}/sfx/${name}.mp3`);
    audio.volume = volume;
    audio.play().catch(() => {});
  }

  playJingle(name, volume = 0.5) {
    const jingle = new Audio(`${BASE}/music/${name}.mp3`);
    jingle.volume = volume;
    this.duck();
    jingle.play().catch(() => this.unduck());
    const restore = () => this.unduck();
    jingle.addEventListener('ended', restore, { once: true });
    setTimeout(restore, 12_000);
  }

  stopSpeech() {
    this.speechToken += 1;
    if (this.speechAudio) {
      this.speechAudio.pause();
      this.speechAudio.currentTime = 0;
      this.speechAudio = null;
    }
    this.unduck();
  }

  async loadStaticManifest(url = 'data/tts-manifest.json') {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`manifest ${response.status}`);
      const manifest = await response.json();
      const clips = manifest.clips || {};
      for (const [text, path] of Object.entries(clips)) {
        if (text && path) this.staticClips.set(text, path);
      }
      this.staticMode = this.staticClips.size > 0;
      return manifest;
    } catch {
      this.staticMode = false;
      return null;
    }
  }

  speechKey(text, style) {
    return `${this.speechLang || 'zh-TW'}|${TTS_VOICE}|${style || TTS_STYLE}|${text}`;
  }

  async fetchSpeech(text, style) {
    const key = this.speechKey(text, style);
    if (this.speechCache.has(key)) return this.speechCache.get(key);

    // 靜態音檔與伺服器 TTS 音色皆為 zh-TW；非中文語系一律改走瀏覽器語音引擎
    if (this.speechLang && this.speechLang !== 'zh-TW') {
      throw new Error(`瀏覽器語音引擎語系：${this.speechLang}`);
    }

    const staticPath = this.staticClips.get(text);
    if (staticPath) {
      this.speechCache.set(key, staticPath);
      return staticPath;
    }

    // 靜態部署（GitHub Pages）不允許即時生成；缺少片段時直接使用瀏覽器語音備援。
    if (this.staticMode) throw new Error(`靜態語音缺少片段：${text}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let response;
    try {
      response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: TTS_VOICE, style: style || TTS_STYLE }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) throw new Error(`TTS ${response.status}`);
    const blob = await response.blob();
    if (!blob.size) throw new Error('TTS 空檔案');
    const url = URL.createObjectURL(blob);
    if (this.speechCache.size >= MAX_CACHE) {
      const oldestKey = this.speechCache.keys().next().value;
      const oldest = this.speechCache.get(oldestKey);
      if (String(oldest).startsWith('blob:')) URL.revokeObjectURL(oldest);
      this.speechCache.delete(oldestKey);
    }
    this.speechCache.set(key, url);
    return url;
  }

  prefetch(text, style) {
    if (!text || !this.ttsOn) return;
    const key = this.speechKey(text, style);
    if (this.speechCache.has(key)) return;
    if (this.prefetchQueue.some((item) => this.speechKey(item.text, item.style) === key)) return;
    if (this.prefetching >= 3) {
      this.prefetchQueue.push({ text, style });
      return;
    }
    this.prefetching += 1;
    this.fetchSpeech(text, style).catch(() => {}).finally(() => {
      this.prefetching -= 1;
      const next = this.prefetchQueue.shift();
      if (next) this.prefetch(next.text, next.style);
    });
  }

  async speak(text, { style, interrupt = true } = {}) {
    if (!this.ttsOn || !text) return;
    const clean = String(text).trim();
    if (!clean) return;
    if (interrupt) this.stopSpeech();
    else if (this.speechAudio) return;
    return this.speakSequence([clean], { style });
  }

  async speakSequence(texts, { style, gap = 90 } = {}) {
    if (!this.ttsOn) return;
    const parts = (texts || []).map((item) => {
      if (typeof item === 'object' && item !== null) return item;
      return String(item || '').trim();
    }).filter(item => typeof item === 'object' ? Boolean(item.text) : Boolean(item));
    if (!parts.length) return;

    this.stopSpeech();
    const token = this.speechToken;
    this.duck();
    try {
      for (const part of parts) {
        if (token !== this.speechToken) break;
        await this.playSpeechPart(part, style);
        if (token !== this.speechToken) break;
        if (gap > 0) await new Promise((resolve) => setTimeout(resolve, gap));
      }
    } finally {
      if (token === this.speechToken) {
        this.speechAudio = null;
        this.unduck();
      }
    }
  }

  async playSpeechPart(part, style) {
    const text = typeof part === 'object' && part !== null ? part.text : part;
    const lang = typeof part === 'object' && part !== null ? part.lang : undefined;

    // 若指定為非中文（如 en-US 美語）或純英文單字，直接採用瀏覽器原生語音引擎
    if (lang && !lang.startsWith('zh')) {
      await this.browserSpeak(text, lang);
      return;
    }

    try {
      const url = await this.fetchSpeech(text, style);
      const audio = new Audio(url);
      this.speechAudio = audio;
      audio.volume = 1;
      await new Promise((resolve) => {
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(resolve);
      });
    } catch {
      await this.browserSpeak(text, lang);
    }
  }

  browserSpeak(text, langOverride) {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return resolve();
      const rawText = typeof text === 'object' && text !== null ? text.text : text;
      const rawLang = typeof text === 'object' && text !== null ? text.lang : langOverride;
      const clean = String(rawText || '').trim();
      if (!clean) return resolve();

      // 智慧偵測文本主體語言：
      // 1. 若全為英文/數字/常見標點符號且包含英文字母 -> 優先採用美語 en-US
      // 2. 若包含中文字元 -> 採用繁體中文 zh-TW
      // 3. 否則採用傳入的 override 或 this.speechLang
      const isPureEnglish = /^[a-zA-Z0-9\s\.\,\!\?\'\-\_\:\/\(\)]+$/.test(clean) && /[a-zA-Z]/.test(clean);
      const hasChinese = /[\u4e00-\u9fff\u3105-\u312f]/.test(clean);

      let targetLang = rawLang;
      if (!targetLang) {
        if (isPureEnglish) targetLang = 'en-US';
        else if (hasChinese) targetLang = 'zh-TW';
        else targetLang = this.speechLang || 'zh-TW';
      }

      const isChinese = /^zh/i.test(targetLang);
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = targetLang;
      utterance.rate = isChinese ? 0.90 : 0.85;
      utterance.pitch = isChinese ? 1.05 : 1.0;

      const voices = (this.cachedVoices && this.cachedVoices.length) ? this.cachedVoices : window.speechSynthesis.getVoices();
      let voice = null;
      if (isChinese) {
        voice = voices.find((v) => /zh[-_]TW|zh[-_]Hant|Taiwan/i.test(`${v.lang} ${v.name}`))
          || voices.find((v) => /zh/i.test(v.lang));
      } else {
        voice = voices.find((v) => /^en[-_]US$/i.test(v.lang))
          || voices.find((v) => /en[-_](US|GB)|American|English \(United States\)|Google US English/i.test(`${v.lang} ${v.name}`))
          || voices.find((v) => /^en/i.test(v.lang));
      }
      if (voice) utterance.voice = voice;
      utterance.onend = resolve;
      utterance.onerror = resolve;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setTimeout(resolve, Math.min(20_000, 2000 + clean.length * 200));
    });
  }

  /* 英語島專用：以標準美語發音朗讀單字或字母 */
  speakEnglish(text, rate = 0.85) {
    if (!this.ttsOn) return;
    this.stopSpeech();
    return this.browserSpeak(text, 'en-US');
  }

  /* 題幹與選項朗讀建構器：支援雙軌多語系無縫讀題（100% 依畫面打亂後順序念選項，絕不照原始題庫正解序洩題） */
  buildQuestionSpeechSequence(question, optionsOverride) {
    if (!question) return [];
    let promptText = question.speak || question.prompt || '';
    // 將音標 /p/ 轉換為平易近人的 "p 的發音"
    promptText = promptText.replace(/\/([a-zA-Z]+)\//g, '$1 的發音');
    // 去除 [英文] 🔤 等內部標籤
    promptText = promptText.replace(/^\[.*?\]\s*[\uD800-\uDBFF][\uDC00-\uDFFF]?\s*/g, '');
    promptText = promptText.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, ''); // 去除 emoji 避免語音引擎亂唸
    promptText = promptText.replace(/[「『]([a-zA-Z]+)[」』]/g, '$1');

    const sequence = [{ text: promptText.trim(), lang: 'zh-TW' }];

    // 優先使用畫面上打亂後之選項順序 (optionsOverride / currentOptions / _displayOptions)
    // 嚴禁直接使用題庫原始 question.options，以防永遠先念第 0 個正解而洩題破梗！
    let options = optionsOverride;
    if (!options || !options.length) {
      options = question.currentOptions || question._displayOptions;
    }
    if (!options || !options.length) {
      // 若尚未打亂（例如外部直接調用），複製後隨機打亂順序，絕不按題庫原始正解順序暴露答案
      const raw = Array.isArray(question.options) ? [...question.options] : [];
      if (!question.fixedOrder && raw.length > 1) {
        for (let i = raw.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [raw[i], raw[j]] = [raw[j], raw[i]];
        }
      }
      options = raw;
    }

    // 若選項為純英文字詞（例如 pig, big, dig），依畫面實際打亂順序加入「選項一 big、選項二 dig、選項三 pig」
    const areEnglishOptions = options.length > 0 && options.every(opt => /^[a-zA-Z\s\-]+$/.test(String(opt).trim()));

    if (areEnglishOptions) {
      const numberLabels = ['選項一', '選項二', '選項三', '選項四'];
      options.forEach((opt, idx) => {
        const label = numberLabels[idx] || `選項 ${idx + 1}`;
        sequence.push({ text: label, lang: 'zh-TW' });
        sequence.push({ text: String(opt).trim(), lang: 'en-US' });
      });
    } else {
      // 若選項非純英文，但題幹中有單一英文字詞（如 pin 的結尾音是什麼），在問句後額外唸一次該單字
      const promptWords = promptText.match(/\b[a-zA-Z]{2,}\b/g) || [];
      if (promptWords.length === 1 && !/是什麼意思/.test(promptText)) {
        const keyWord = promptWords[0];
        sequence.push({ text: '單字是', lang: 'zh-TW' });
        sequence.push({ text: keyWord, lang: 'en-US' });
      }
    }

    return sequence;
  }

  /* 智慧播放題目與選項語音 */
  playQuestionAudio(question, optionsOverride) {
    if (!question || !this.ttsOn) return;
    const sequence = this.buildQuestionSpeechSequence(question, optionsOverride);
    return this.speakSequence(sequence, { gap: 120 });
  }

  async warmup() {
    if (!this.ttsOn || this.staticMode) return;
    try {
      await fetch('/api/health');
    } catch {
      /* 靜態 hosting 時使用預先產生的語音或瀏覽器語音 */
    }
  }
}

export const audio = new AudioManager();
