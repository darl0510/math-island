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
