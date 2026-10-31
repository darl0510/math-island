const CONFETTI_COLORS = ['#ff6fa5', '#ffd93d', '#4ecdc4', '#7c8cf8', '#ff8a5c', '#8b5cf6', '#5ee7a8', '#ff4d6d'];
let confettiParticles = [];
let confettiFrame = null;
let confettiCanvas = null;
let confettiContext = null;

function ensureCanvas() {
  if (confettiCanvas) return;
  confettiCanvas = document.getElementById('confetti');
  if (!confettiCanvas) return;
  confettiContext = confettiCanvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  if (!confettiCanvas) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  confettiCanvas.width = Math.floor(window.innerWidth * ratio);
  confettiCanvas.height = Math.floor(window.innerHeight * ratio);
  confettiCanvas.style.width = `${window.innerWidth}px`;
  confettiCanvas.style.height = `${window.innerHeight}px`;
  confettiContext.setTransform(ratio, 0, 0, ratio, 0, 0);
}

export function launchConfetti({ count = 130, x = window.innerWidth / 2, y = window.innerHeight * 0.28 } = {}) {
  ensureCanvas();
  if (!confettiContext) return;
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 7.5;
    confettiParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.5,
      gravity: 0.13 + Math.random() * 0.1,
      drag: 0.992,
      size: 5 + Math.random() * 9,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.25,
      life: 1,
      decay: 0.004 + Math.random() * 0.006,
      shape: Math.random() > 0.72 ? 'circle' : 'rect',
    });
  }
  if (!confettiFrame) confettiFrame = requestAnimationFrame(stepConfetti);
}

function drawStar(ctx, cx, cy, spikes = 5, outerRadius = 8, innerRadius = 4) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

export function fireworks({ bursts = 3 } = {}) {
  for (let index = 0; index < bursts; index += 1) {
    setTimeout(() => {
      launchConfetti({
        count: 70,
        x: window.innerWidth * (0.2 + Math.random() * 0.6),
        y: window.innerHeight * (0.15 + Math.random() * 0.35),
      });
    }, index * 260);
  }
}

/* 全屏高階關卡通關慶祝特效 (雙側加農砲彩帶 + 高空星芒煙火 + 三星金色瀑布) */
export function launchLevelClearCelebration({ stars = 3 } = {}) {
  ensureCanvas();
  if (!confettiContext) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  // 1. 雙側發射彩帶加農砲 (Left & Right Cannons)
  const shootCannon = (startX, angleDeg, count) => {
    const rad = (angleDeg * Math.PI) / 180;
    const shapes = ['star', 'rect', 'circle', 'ribbon'];
    for (let i = 0; i < count; i++) {
      const speed = 14 + Math.random() * 11;
      const spread = (Math.random() - 0.5) * 0.45;
      const angle = rad + spread;
      confettiParticles.push({
        x: startX,
        y: h * 0.95,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.28 + Math.random() * 0.12,
        drag: 0.984,
        size: 7 + Math.random() * 9,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        life: 1,
        decay: 0.003 + Math.random() * 0.004,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }
  };

  shootCannon(w * 0.1, -65, 55);
  shootCannon(w * 0.9, -115, 55);

  // 2. 居中高空星芒煙火 (Central Fireworks)
  setTimeout(() => {
    fireworks({ bursts: stars >= 3 ? 5 : stars === 2 ? 3 : 2 });
  }, 220);

  // 3. 若為三星完美通關，追加金色瀑布雨 (Golden Shower)
  if (stars >= 3) {
    setTimeout(() => {
      for (let i = 0; i < 60; i++) {
        confettiParticles.push({
          x: Math.random() * w,
          y: -20 - Math.random() * 80,
          vx: (Math.random() - 0.5) * 2,
          vy: 2 + Math.random() * 3.5,
          gravity: 0.08,
          drag: 0.994,
          size: 7 + Math.random() * 8,
          color: ['#ffd700', '#ffea79', '#ffb703', '#ffffff'][Math.floor(Math.random() * 4)],
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.2,
          life: 1,
          decay: 0.0035,
          shape: Math.random() > 0.4 ? 'star' : 'circle',
        });
      }
    }, 600);
  }

  if (!confettiFrame) confettiFrame = requestAnimationFrame(stepConfetti);
}

function stepConfetti() {
  if (!confettiContext) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  confettiContext.clearRect(0, 0, width, height);

  confettiParticles = confettiParticles.filter((particle) => particle.life > 0 && particle.y < height + 80);
  for (const particle of confettiParticles) {
    particle.vx *= particle.drag;
    particle.vy = particle.vy * particle.drag + particle.gravity;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.rotation += particle.spin;
    particle.life -= particle.decay;

    confettiContext.save();
    confettiContext.globalAlpha = Math.max(0, particle.life);
    confettiContext.translate(particle.x, particle.y);
    confettiContext.rotate(particle.rotation);
    confettiContext.fillStyle = particle.color;
    if (particle.shape === 'circle') {
      confettiContext.beginPath();
      confettiContext.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
      confettiContext.fill();
    } else if (particle.shape === 'star') {
      drawStar(confettiContext, 0, 0, 5, particle.size, particle.size * 0.45);
      confettiContext.fill();
    } else if (particle.shape === 'ribbon') {
      confettiContext.fillRect(-particle.size / 3, -particle.size * 1.2, particle.size * 0.6, particle.size * 2.4);
    } else {
      confettiContext.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.62);
    }
    confettiContext.restore();
  }

  if (confettiParticles.length) {
    confettiFrame = requestAnimationFrame(stepConfetti);
  } else {
    confettiContext.clearRect(0, 0, width, height);
    confettiFrame = null;
  }
}

export function starsMarkup(count, max = 3) {
  let html = '';
  for (let index = 0; index < max; index += 1) {
    html += `<span class="star ${index < count ? 'earned' : 'empty'}" aria-hidden="true">★</span>`;
  }
  return `<span class="stars" role="img" aria-label="獲得 ${count} 顆星">${html}</span>`;
}

export function showToast(message, emoji = '✨', duration = 2400) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span class="toast-emoji">${emoji}</span><span>${message}</span>`;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

export function clearConfetti() {
  confettiParticles = [];
  if (confettiContext) confettiContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
  if (confettiFrame) {
    cancelAnimationFrame(confettiFrame);
    confettiFrame = null;
  }
}

export function setScreen(name) {
  clearConfetti();
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === `screen-${name}`);
  });
  document.body.dataset.screen = name;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

export function loadingDots(text = '準備中') {
  return `<span class="loading-dots">${text}<span>.</span><span>.</span><span>.</span></span>`;
}

export function speakableButton(label, icon = '🔊') {
  return `<button class="icon-btn speak-btn" type="button" aria-label="${label}"><span>${icon}</span></button>`;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


let currentAmbientTheme = null;

/**
 * 各島嶼動態環境粒子氛圍 (Living Island Ambient Atmosphere)
 */
export function setIslandAmbientTheme(subject = 'math') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  let layer = document.getElementById('island-ambient-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'island-ambient-layer';
    layer.className = 'island-ambient-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.prepend(layer);
  }

  const sub = subject || (document.body && document.body.dataset && document.body.dataset.subject) || 'math';
  if (currentAmbientTheme === sub && layer.children.length > 0) return;
  currentAmbientTheme = sub;
  layer.innerHTML = '';

  const themeConfig = {
    math: { className: 'ambient-bubble', count: 10, emojis: ['🫧', '💧', '✨'] },
    chinese: { className: 'ambient-petal', count: 9, emojis: ['🌸', '🍃', '🍂'] },
    english: { className: 'ambient-star', count: 10, emojis: ['⭐', '✨', '🌟'] },
    science: { className: 'ambient-firefly', count: 8, emojis: ['✨', '🌿', '🌱'] },
    social: { className: 'ambient-compass', count: 8, emojis: ['🧭', '⛵', '🗺️'] },
    challenge: { className: 'ambient-spark', count: 10, emojis: ['🔥', '⚡', '✨'] },
  };

  const config = themeConfig[sub] || themeConfig.math;

  for (let i = 0; i < config.count; i++) {
    const el = document.createElement('div');
    el.className = `ambient-particle ${config.className}`;
    el.textContent = config.emojis[i % config.emojis.length];

    const left = Math.random() * 95;
    const delay = Math.random() * 6;
    const duration = 6 + Math.random() * 6;
    const size = 16 + Math.random() * 12;
    const drift = (Math.random() - 0.5) * 80;

    el.style.left = `${left}vw`;
    el.style.animationDelay = `${delay}s`;
    el.style.animationDuration = `${duration}s`;
    el.style.fontSize = `${size}px`;
    el.style.setProperty('--drift-x', `${drift}px`);

    layer.appendChild(el);
  }
}

export function clearIslandAmbientFX() {
  if (typeof document === 'undefined') return;
  const layer = document.getElementById('island-ambient-layer');
  if (layer) layer.innerHTML = '';
  currentAmbientTheme = null;
}

/**
 * 答對星塵軌跡粒子動效 (Stardust Collection to HUD)
 * 晶瑩星塵沿弧線飛入頂部連擊條 / 計分晶片，並引發 HUD 衝擊微震反饋
 */
export function spawnStardustCollection(fromEl, targetEl) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!fromEl || typeof fromEl.getBoundingClientRect !== 'function') return;

  const fromRect = fromEl.getBoundingClientRect();
  const startX = fromRect.left + fromRect.width / 2;
  const startY = fromRect.top + fromRect.height / 2;

  let destX = window.innerWidth / 2;
  let destY = 60;
  if (targetEl && typeof targetEl.getBoundingClientRect === 'function') {
    const targetRect = targetEl.getBoundingClientRect();
    destX = targetRect.left + targetRect.width / 2;
    destY = targetRect.top + targetRect.height / 2;
  }

  const container = document.body;
  const particleCount = 5;
  const starIcons = ['✨', '⭐', '🌟', '💫', '✦'];

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'stardust-particle';
    particle.textContent = starIcons[i % starIcons.length];
    particle.setAttribute('aria-hidden', 'true');
    container.appendChild(particle);

    const spreadX = (Math.random() - 0.5) * 40;
    const spreadY = (Math.random() - 0.5) * 40;
    const pStartX = startX + spreadX;
    const pStartY = startY + spreadY;

    const midX = (pStartX + destX) / 2 + (Math.random() - 0.5) * 120;
    const midY = Math.min(pStartY, destY) - 50 - Math.random() * 80;

    const delay = i * 45;
    const duration = 520;

    particle.style.transform = `translate(${pStartX}px, ${pStartY}px) scale(0.6)`;
    particle.style.opacity = '0';

    let startTime = null;

    function animate(currentTime) {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const t = Math.min(1, Math.max(0, (elapsed - delay) / duration));

      if (elapsed < delay) {
        if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(animate);
        return;
      }

      const invT = 1 - t;
      const curX = invT * invT * pStartX + 2 * invT * t * midX + t * t * destX;
      const curY = invT * invT * pStartY + 2 * invT * t * midY + t * t * destY;

      const scale = t < 0.2 ? 0.6 + t * 3 : t > 0.8 ? 1.2 - (t - 0.8) * 4 : 1.2;
      const opacity = t < 0.1 ? t * 10 : t > 0.85 ? (1 - t) * 6.6 : 1;

      particle.style.transform = `translate(${curX}px, ${curY}px) scale(${scale}) rotate(${t * 360}deg)`;
      particle.style.opacity = String(opacity);

      if (t < 1) {
        if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(animate);
      } else {
        particle.remove();
        if (i === particleCount - 1 && targetEl) {
          targetEl.classList.remove('hud-pulse-impact');
          if (targetEl.offsetWidth !== undefined) void targetEl.offsetWidth;
          targetEl.classList.add('hud-pulse-impact');
          setTimeout(() => targetEl.classList.remove('hud-pulse-impact'), 450);
        }
      }
    }

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(animate);
    } else {
      particle.remove();
    }
  }
}
