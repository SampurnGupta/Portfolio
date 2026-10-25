/**
 * Matrix Rain Full-Screen Canvas Overlay
 * Triggerable via 'matrix' command or Konami code
 */
(function() {
  const canvas = document.getElementById('matrix-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZアカサタナハマヤラワイキシチニヒミリウクスツヌフムユルエケセテネヘメレオコソトノホモヨロワン';
  const fontSize = 14;
  let columns = Math.floor(width / fontSize);
  let drops = Array(columns).fill(1);
  let isRunning = false;
  let timerId = null;
  let animId = null;

  function initDrops() {
    columns = Math.floor(width / fontSize);
    drops = Array(columns).fill(1).map(() => Math.floor(Math.random() * -50));
  }

  function draw() {
    if (!isRunning) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#39ff14';
    ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;

    for (let i = 0; i < drops.length; i++) {
      const text = chars.charAt(Math.floor(Math.random() * chars.length));
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      // Leading character brighter
      if (Math.random() > 0.85) {
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = '#39ff14';
      }

      ctx.fillText(text, x, y);

      if (y > height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }

    animId = requestAnimationFrame(draw);
  }

  window.triggerMatrixRain = function(durationMs = 4000) {
    if (isRunning) return;
    isRunning = true;
    initDrops();

    canvas.style.display = 'block';
    canvas.style.opacity = '1';

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    draw();

    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      stopMatrix();
    }, durationMs);
  };

  function stopMatrix() {
    if (!isRunning) return;
    canvas.style.opacity = '0';
    setTimeout(() => {
      isRunning = false;
      canvas.style.display = 'none';
      if (animId) cancelAnimationFrame(animId);
      if (timerId) clearTimeout(timerId);
    }, 400);
  }

  // Dismiss on click or keypress
  canvas.addEventListener('click', stopMatrix);
  window.addEventListener('keydown', (e) => {
    if (isRunning) {
      stopMatrix();
    }
  });

  // Konami Code Listener (↑ ↑ ↓ ↓ ← → ← → B A)
  const konamiSeq = [
    'ArrowUp', 'ArrowUp',
    'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight',
    'ArrowLeft', 'ArrowRight',
    'KeyB', 'KeyA'
  ];
  let konamiIndex = 0;

  window.addEventListener('keydown', (e) => {
    const key = e.code || e.key;
    if (key === konamiSeq[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiSeq.length) {
        konamiIndex = 0;
        window.triggerMatrixRain(5000);
        if (window.showToast) {
          window.showToast('KONAMI CODE UNLOCKED: MATRIX RAIN');
        }
      }
    } else {
      konamiIndex = 0;
    }
  });
})();
