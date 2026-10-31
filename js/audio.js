import { getState, setMusicOn, setTtsOn } from './state.js';

const BASE = 'assets/audio';
const TTS_STYLE = '台灣口音（中華民國國語），親切、活潑、溫柔的幼兒園老師，咬字清楚，語速稍慢，充滿鼓勵';
const TTS_VOICE = 'Aoede';
const MAX_CACHE = 120;

export function isIOSDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIOS || isIPadOS;
}

const COMMON_SFX = ['click', 'correct', 'wrong', 'levelup', 'whoosh'];

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
    this.sfxPool = new Map();
    this.preloaded = false;
    this.audioContext = null;
    this.activeUtteranceResolver = null;
    this._sfxDuckTimer = null;

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

  async unlockAudioContext() {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!this.audioContext) {
        this.audioContext = new AudioContextClass();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      // 播放極短 0.001s 靜音 buffer 徹底解鎖 iOS 音訊輸出硬體
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    } catch (e) {
      /* 容錯略過 */
    }
  }

  unlock() {
    this.unlocked = true;
    this.unlockAudioContext().catch(() => {});
    if (!this.musicOn) return;
    if (this.currentTheme) this.playMusic(this.currentTheme, true);
    else this.playMusic('title');
  }

  /* 音訊資源全面預載池化：即開即玩，0 秒卡頓 */
  async preloadAllAudio() {
    if (this.preloaded || typeof window === 'undefined') return;
    this.preloaded = true;

    // 1. 預載常用 SFX 音效池 (每個音效預建 2 個實例供多軌重疊播放)
    for (const name of COMMON_SFX) {
      const pool = [];
      for (let i = 0; i < 2; i++) {
        const audio = new Audio(`${BASE}/sfx/${name}.mp3`);
        audio.preload = 'auto';
        try {
          audio.load();
        } catch {}
        pool.push(audio);
      }
      this.sfxPool.set(name, pool);
    }

    // 2. 預載主選單 BGM
    try {
      const titleBgm = new Audio(`${BASE}/music/title.mp3`);
      titleBgm.preload = 'auto';
      titleBgm.load();
    } catch {}
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

    // 平滑降級機制：若專屬島嶼音樂檔（如 forest/ocean/cloud/space）不存在（404），自動降級播放 title.mp3
    channel.onerror = () => {
      if (theme !== 'title') {
        console.warn(`[audio] 音樂 ${theme}.mp3 載入失敗，平滑降級播放 title.mp3`);
        this.playMusic('title', restart);
      }
    };

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
      /* 瀏覽器可能阻擋自動播放，或資源不存在時平滑降級 */
      if (theme !== 'title') {
        this.playMusic('title', restart);
      }
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

  duck(target = 0.07, duration = 250) {
    this.ducked = true;
    const channel = this.channels[this.activeChannel];
    if (channel && !channel.paused) this.fadeIn(channel, target, duration);
  }

  unduck(duration = 500) {
    this.ducked = false;
    if (this.musicOn && this.unlocked) {
      const channel = this.channels[this.activeChannel];
      if (channel && channel.src && !channel.paused) this.fadeIn(channel, this.musicVolume, duration);
    }
  }

  playSfx(name, volume = 0.65, { duck = false, duckDuration = 550 } = {}) {
    if (duck) {
      this.duck(0.1, 150);
      if (this._sfxDuckTimer) clearTimeout(this._sfxDuckTimer);
      this._sfxDuckTimer = setTimeout(() => {
        this._sfxDuckTimer = null;
        if (!this.speechAudio) {
          this.unduck(350);
        }
      }, duckDuration);
    }
    let pool = this.sfxPool.get(name);
    if (!pool) {
      pool = [];
      this.sfxPool.set(name, pool);
    }
    // 尋找空閒的音效通道實例
    let audioInstance = pool.find(a => a.paused || a.ended);
    if (!audioInstance) {
      if (pool.length < 4) {
        audioInstance = new Audio(`${BASE}/sfx/${name}.mp3`);
        audioInstance.preload = 'auto';
        pool.push(audioInstance);
      } else {
        // 若超出上限，復用第一個
        audioInstance = pool[0];
      }
    }
    try {
      audioInstance.volume = volume;
      audioInstance.currentTime = 0;
      audioInstance.play().catch(() => {});
    } catch {}
  }

  /* 停止所有正在發聲的音效，重置音軌 */
  stopAllSfx() {
    if (this._sfxDuckTimer) {
      clearTimeout(this._sfxDuckTimer);
      this._sfxDuckTimer = null;
    }
    for (const pool of this.sfxPool.values()) {
      for (const a of pool) {
        if (!a.paused) {
          try {
            a.pause();
            a.currentTime = 0;
          } catch {}
        }
      }
    }
  }

  /* 同步重置所有音訊管道：停止語音朗讀、中止音效並平滑恢復背景音樂 */
  resetAudioPipes() {
    this.stopSpeech();
    this.stopAllSfx();
  }

  /* iOS 靜音模式自動提示引導與排查彈窗 */
  showIOSAudioGuideModal() {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('ios-audio-guide-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ios-audio-guide-overlay';
    overlay.className = 'ios-guide-overlay';
    overlay.innerHTML = `
      <div class="ios-guide-modal" role="dialog" aria-modal="true" aria-labelledby="ios-guide-title">
        <button class="round-back ios-guide-close" type="button" aria-label="關閉提示">✕</button>
        <div class="ios-guide-header">
          <span class="ios-guide-icon" aria-hidden="true">🍎</span>
          <div>
            <h2 id="ios-guide-title">iOS 聲音與朗讀提示</h2>
            <p class="ios-guide-sub">iPhone / iPad 聽不到聲音時的 3 步排查</p>
          </div>
        </div>

        <div class="ios-guide-steps">
          <div class="ios-step-card">
            <div class="step-num">1</div>
            <div class="step-icon">🔕 ➔ 🔔</div>
            <div class="step-content">
              <strong>檢查 iPhone 機身側邊靜音撥片</strong>
              <p>若側邊開關露出<span class="highlight-orange">橘色</span>代表處於「靜音模式」，請撥向螢幕方向開啟鈴聲！（iPhone 15 Pro/16 請確認動作按鈕未靜音）</p>
            </div>
          </div>

          <div class="ios-step-card">
            <div class="step-num">2</div>
            <div class="step-icon">📱</div>
            <div class="step-content">
              <strong>iPad 檢查控制中心靜音鈴鐺</strong>
              <p>從螢幕右上角向下滑動打開「控制中心」，確認鈴鐺圖示沒有斜線。</p>
            </div>
          </div>

          <div class="ios-step-card">
            <div class="step-num">3</div>
            <div class="step-icon">🔊</div>
            <div class="step-content">
              <strong>調高媒體與鈴聲音量</strong>
              <p>按壓機身側邊音量「+」鍵，建議音量調整在 50% 以上。</p>
            </div>
          </div>
        </div>

        <div class="ios-guide-actions">
          <button class="ios-test-btn" type="button" id="ios-test-sound">
            <span>🎵 測試播放聲音</span>
          </button>
          <button class="big-btn ios-confirm-btn" type="button" id="ios-dismiss-guide">我知道了</button>
        </div>
        <div class="ios-guide-footer">
          <label class="ios-never-again">
            <input type="checkbox" id="ios-never-prompt" />
            <span>不再主動顯示此提示</span>
          </label>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      const never = overlay.querySelector('#ios-never-prompt')?.checked;
      if (never) {
        try { localStorage.setItem('math_island_ios_audio_dismissed', 'true'); } catch {}
      }
      overlay.remove();
    };

    overlay.querySelector('.ios-guide-close')?.addEventListener('click', close);
    overlay.querySelector('#ios-dismiss-guide')?.addEventListener('click', close);
    overlay.querySelector('#ios-test-sound')?.addEventListener('click', () => {
      this.unlock();
      this.playSfx('correct', 0.9);
      if (this.ttsOn) {
        this.speak('聲音測試成功！奇幻數學島大冒險歡迎你！');
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  /* 智慧檢查是否需要引導 iOS 使用者 */
  checkIOSAudioGuide(force = false) {
    if (!isIOSDevice()) return;
    if (!force) {
      try {
        if (localStorage.getItem('math_island_ios_audio_dismissed') === 'true') return;
      } catch {}
    }
    this.showIOSAudioGuideModal();
  }

  playJingle(name, volume = 0.5) {
    const jingle = new Audio(`${BASE}/music/${name}.mp3`);
    jingle.volume = volume;
    this.duck();
    let handled = false;
    const restore = () => {
      if (!handled) {
        handled = true;
        this.unduck();
      }
    };
    jingle.addEventListener('ended', restore, { once: true });
    jingle.onerror = () => {
      if (name === 'victory') {
        this.playVictoryFanfare(3);
      }
      restore();
    };
    jingle.play().catch(() => {
      if (name === 'victory') {
        this.playVictoryFanfare(3);
      }
      restore();
    });
    setTimeout(restore, 12_000);
  }

  /* Web Audio 原生合成勝利號角 (0 依賴、0 延遲、100% 離線可用) */
  playVictoryFanfare(stars = 3) {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      this.duck();
      const fanfareDuration = stars === 3 ? 2.6 : stars === 2 ? 2.0 : 1.6;
      setTimeout(() => this.unduck(), fanfareDuration * 1000);

      let notes = [];
      if (stars === 3) {
        notes = [
          { time: 0.00, freq: 523.25, dur: 0.14, type: 'triangle' }, // C5
          { time: 0.13, freq: 659.25, dur: 0.14, type: 'triangle' }, // E5
          { time: 0.26, freq: 783.99, dur: 0.16, type: 'triangle' }, // G5
          { time: 0.42, freq: 1046.50, dur: 0.45, type: 'triangle' }, // C6
          { time: 0.88, freq: 880.00, dur: 0.15, type: 'triangle' },  // A5
          { time: 1.02, freq: 987.77, dur: 0.15, type: 'triangle' },  // B5
          { time: 1.16, freq: 1046.50, dur: 1.25, type: 'triangle' }, // C6 主和弦
          { time: 1.16, freq: 1318.51, dur: 1.25, type: 'sine' },     // E6 和聲
          { time: 1.16, freq: 1567.98, dur: 1.25, type: 'sine' },     // G6 和聲
          { time: 1.16, freq: 2093.00, dur: 1.00, type: 'sine' },     // C7 高光泛音
        ];
      } else if (stars === 2) {
        notes = [
          { time: 0.00, freq: 523.25, dur: 0.15, type: 'triangle' },
          { time: 0.15, freq: 659.25, dur: 0.15, type: 'triangle' },
          { time: 0.30, freq: 783.99, dur: 0.22, type: 'triangle' },
          { time: 0.52, freq: 1046.50, dur: 0.85, type: 'triangle' },
          { time: 0.52, freq: 1318.51, dur: 0.85, type: 'sine' },
        ];
      } else {
        notes = [
          { time: 0.00, freq: 392.00, dur: 0.16, type: 'triangle' },
          { time: 0.16, freq: 523.25, dur: 0.16, type: 'triangle' },
          { time: 0.32, freq: 659.25, dur: 0.70, type: 'triangle' },
          { time: 0.32, freq: 783.99, dur: 0.70, type: 'sine' },
        ];
      }

      notes.forEach(({ time, freq, dur, type }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type || 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        const start = now + time;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.32, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + dur + 0.05);
      });
    } catch {}
  }

  /* 星星逐顆落定清脆音階 (C6 ➔ E6 ➔ G6/C7 晶瑩剔透鈴音) */
  playStarChime(starIndex = 1) {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const starFreqs = {
        1: [523.25, 1046.50],
        2: [659.25, 1318.51],
        3: [783.99, 1567.98, 2093.00],
      };
      const freqs = starFreqs[starIndex] || [880.00, 1760.00];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.24 / freqs.length, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (starIndex === 3 ? 0.7 : 0.45));

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.75);
      });
    } catch {}
  }

  /* Web Audio 原生合成成就解鎖璀璨號角 (上升大和弦 + 晶瑩泛音 + 華麗收尾) */
  playBadgeUnlockFanfare() {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      this.duck();
      setTimeout(() => this.unduck(), 2200);

      // 琶音起奏：G4 -> C5 -> E5 -> G5 -> C6 (主和弦) + E6 (晶瑩和聲) + C7 (星芒泛音)
      const arpeggio = [
        { time: 0.00, freq: 392.00, dur: 0.16, type: 'triangle', vol: 0.22 }, // G4
        { time: 0.12, freq: 523.25, dur: 0.16, type: 'triangle', vol: 0.24 }, // C5
        { time: 0.24, freq: 659.25, dur: 0.18, type: 'triangle', vol: 0.26 }, // E5
        { time: 0.36, freq: 783.99, dur: 0.20, type: 'triangle', vol: 0.28 }, // G5
        { time: 0.52, freq: 1046.50, dur: 0.85, type: 'triangle', vol: 0.32 }, // C6
        { time: 0.52, freq: 1318.51, dur: 0.85, type: 'sine', vol: 0.20 },     // E6 (晶瑩和聲)
        { time: 0.52, freq: 2093.00, dur: 0.70, type: 'sine', vol: 0.12 },     // C7 (頂部星芒泛音)
      ];

      arpeggio.forEach(({ time, freq, dur, type, vol }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.0001, now + time);
        gain.gain.exponentialRampToValueAtTime(vol, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
      });
    } catch {}
  }

  /* 強制中止所有語音朗讀佇列 (支援 TTS、Audio 與 Web Speech API 即刻切斷) */
  stopSpeech() {
    this.speechToken += 1;
    if (this.speechAudio) {
      try {
        this.speechAudio.pause();
        this.speechAudio.currentTime = 0;
      } catch {}
      this.speechAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (this.activeUtteranceResolver) {
      const resolver = this.activeUtteranceResolver;
      this.activeUtteranceResolver = null;
      try { resolver(); } catch {}
    }
    this.prefetchQueue = [];
    this.unduck();
  }

  /* 語意別名：外部顯式取消題目語音佇列 */
  cancelSpeechQueue() {
    this.stopSpeech();
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
        await this.playSpeechPart(part, style, token);
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

  async playSpeechPart(part, style, token) {
    if (typeof token === 'number' && this.speechToken !== token) return;
    const text = typeof part === 'object' && part !== null ? part.text : part;
    const lang = typeof part === 'object' && part !== null ? part.lang : undefined;

    // 若指定為非中文（如 en-US 美語）或純英文單字，直接採用瀏覽器原生語音引擎
    if (lang && !lang.startsWith('zh')) {
      await this.browserSpeak(text, lang);
      return;
    }

    try {
      const url = await this.fetchSpeech(text, style);
      if (typeof token === 'number' && this.speechToken !== token) return;
      const audio = new Audio(url);
      this.speechAudio = audio;
      audio.volume = 1;
      await new Promise((resolve) => {
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(resolve);
      });
    } catch {
      if (typeof token === 'number' && this.speechToken !== token) return;
      await this.browserSpeak(text, lang);
    }
  }

  browserSpeak(text, langOverride) {
    if (typeof SpeechSynthesisUtterance === 'undefined') return Promise.resolve();
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

      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          if (this.activeUtteranceResolver === done) {
            this.activeUtteranceResolver = null;
          }
          resolve();
        }
      };

      utterance.onend = done;
      utterance.onerror = done;
      this.activeUtteranceResolver = done;

      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch {
        done();
      }

      setTimeout(done, Math.min(20_000, 2000 + clean.length * 200));
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
    // 去除 [英文] 🔤 等內部標籤（包含所有方括號分類與裝飾 Emoji）
    promptText = promptText.replace(/\[[^\]]+\]/g, '');
    promptText = promptText.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, ''); // 去除 emoji 與裝飾符號避免語音引擎亂唸
    promptText = promptText.replace(/_{2,}/g, '空格'); // 將連續底線轉換為「空格」，避免 TTS 唸出「底線底線」
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
