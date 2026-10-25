/**
 * Stage 0: Loading Screen & Splash Homepage
 * Precisely modelled on ingrassiadaniel.it particle canvas
 */
(function() {
  const container = document.getElementById('splash-container');
  const canvas = document.getElementById('starfield-canvas');
  if (!container || !canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  // Check reduced motion or session flag
  const prefersReduced = window.__reducedMotion || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const splashSeen = sessionStorage.getItem('splashSeen') === 'true';

  if (prefersReduced) {
    container.style.display = 'none';
    if (window.onSplashComplete) window.onSplashComplete(true);
    return;
  }

  if (splashSeen) {
    // Fast forward to boot
    container.style.display = 'none';
    if (window.onSplashComplete) window.onSplashComplete(false);
    return;
  }

  // State: 'loading' | 'splash' | 'done'
  let state = 'loading';
  let loadProgress = 6;
  let loaderAlpha = 1;
  let portraitAlpha = 0;

  // Starfield Particles (~500 tiny white dots)
  const STAR_COUNT = Math.min(500, Math.floor((width * height) / 3000));
  const stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      size: Math.random() < 0.2 ? 1.5 : 1,
      alpha: 0.15 + Math.random() * 0.5
    });
  }

  // Generate Silhouette Dots (Head & Shoulders)
  const portraitDots = [];
  function generatePortrait() {
    portraitDots.length = 0;
    const bustHeight = height * 0.42;
    const scale = bustHeight / 340;
    const cx = width / 2;
    const cy = height / 2 + bustHeight * 0.08;

    // Head ellipse: cx, cy - 80*scale, rx=55*scale, ry=72*scale
    // Neck: width=50*scale, height=45*scale
    // Shoulders: width=320*scale, curved slope
    const numCandidates = 2800;
    for (let i = 0; i < numCandidates; i++) {
      const rx = (Math.random() - 0.5) * 360 * scale;
      const ry = (Math.random() - 0.5) * 360 * scale;

      let inside = false;
      let edgeWeight = 1;

      // 1. Head
      const hx = rx;
      const hy = ry + 60 * scale;
      const headDist = (hx * hx) / Math.pow(58 * scale, 2) + (hy * hy) / Math.pow(75 * scale, 2);
      if (headDist <= 1) {
        inside = true;
        edgeWeight = headDist > 0.65 ? 1.4 : 0.7;
      }

      // 2. Neck
      if (!inside && Math.abs(rx) < 26 * scale && ry >= 0 && ry <= 55 * scale) {
        inside = true;
        edgeWeight = Math.abs(rx) > 20 * scale ? 1.3 : 0.6;
      }

      // 3. Shoulders / Chest
      if (!inside && ry > 45 * scale && ry < 170 * scale) {
        const shoulderProgress = (ry - 45 * scale) / (125 * scale);
        const shoulderHalfWidth = (28 + shoulderProgress * 145) * scale;
        if (Math.abs(rx) < shoulderHalfWidth) {
          inside = true;
          const ratio = Math.abs(rx) / shoulderHalfWidth;
          edgeWeight = ratio > 0.7 ? 1.5 : 0.65;
        }
      }

      if (inside && Math.random() < edgeWeight) {
        portraitDots.push({
          bx: rx,
          by: ry,
          x: cx + rx,
          y: cy + ry,
          vx: 0,
          vy: 0,
          seed: Math.random() * 100,
          size: Math.random() < 0.25 ? 1.2 : 0.9,
          alpha: 0.35 + Math.random() * 0.55
        });
      }
    }
  }

  generatePortrait();

  // Resize handler
  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    generatePortrait();
  });

  // Mouse Tracker & Comet Trail Buffer
  let mouseX = -1000;
  let mouseY = -1000;
  let lastMoveTime = 0;
  const trail = [];
  const MAX_TRAIL = 26;

  function onPointerMove(e) {
    const x = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const y = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    mouseX = x;
    mouseY = y;
    lastMoveTime = performance.now();
    trail.unshift({ x, y, time: lastMoveTime });
    if (trail.length > MAX_TRAIL) trail.pop();
  }

  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('touchmove', onPointerMove, { passive: true });

  // Loading Screen Counter Animation (Easing curve fast start, slow near 100)
  const loadStartTime = performance.now();
  const LOAD_DURATION = 1400; // ms

  function updateLoader(now) {
    const elapsed = now - loadStartTime;
    const t = Math.min(1, elapsed / LOAD_DURATION);
    // Easing curve (easeOutCubic)
    const eased = 1 - Math.pow(1 - t, 3);
    loadProgress = Math.floor(6 + eased * 94);

    if (t >= 1) {
      // Transition from loading to splash
      loaderAlpha -= 0.05;
      if (loaderAlpha <= 0) {
        loaderAlpha = 0;
        state = 'splash';
      }
    }
  }

  // Exit trigger: click or keypress
  function exitSplash() {
    if (state === 'done') return;
    state = 'done';
    sessionStorage.setItem('splashSeen', 'true');

    container.classList.add('fade-out');
    setTimeout(() => {
      container.style.display = 'none';
      if (window.onSplashComplete) {
        window.onSplashComplete(false);
      }
    }, 500);
  }

  container.addEventListener('click', exitSplash);
  window.addEventListener('keydown', (e) => {
    if (state !== 'done' && !container.classList.contains('fade-out')) {
      exitSplash();
    }
  });

  // Animation Loop
  let lastFrameTime = performance.now();

  function animate(now) {
    const dt = Math.min(32, now - lastFrameTime);
    lastFrameTime = now;

    ctx.fillStyle = '#0f0f14';
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Starfield
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.x += s.vx;
      s.y += s.vy;

      if (s.x < 0) s.x = width;
      if (s.x > width) s.x = 0;
      if (s.y < 0) s.y = height;
      if (s.y > height) s.y = 0;

      ctx.globalAlpha = s.alpha;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;

    // 2. State Handling: Loading vs Splash
    if (state === 'loading') {
      updateLoader(now);

      if (loaderAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = loaderAlpha;
        const cx = width / 2;
        const cy = height / 2;
        const ringRadius = 22;
        const numDots = 14;
        const rot = (now * 0.0035) % (Math.PI * 2);

        // Circular dot-ring rotating
        for (let j = 0; j < numDots; j++) {
          const angle = rot + (j * Math.PI * 2) / numDots;
          const dx = cx + Math.cos(angle) * ringRadius;
          const dy = cy + Math.sin(angle) * ringRadius;
          const dotAlpha = (j + 1) / numDots;
          ctx.fillStyle = `rgba(255, 255, 255, ${dotAlpha * 0.9})`;
          ctx.beginPath();
          ctx.arc(dx, dy, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Percentage counter inside ring
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${loadProgress}%`, cx, cy);
        ctx.restore();
      }
    }

    if (state === 'splash' || state === 'done') {
      portraitAlpha = Math.min(1, portraitAlpha + 0.03);
    }

    // 3. Draw Particle Bust & Comet Scatter Interaction
    if (portraitAlpha > 0) {
      const cx = width / 2;
      const bustHeight = height * 0.42;
      const cy = height / 2 + bustHeight * 0.08;
      const timeSec = now * 0.001;

      ctx.save();
      ctx.globalAlpha = portraitAlpha;
      ctx.fillStyle = '#ffffff';

      for (let i = 0; i < portraitDots.length; i++) {
        const p = portraitDots[i];

        // Breathing effect via sin(time + seed)
        const targetX = cx + p.bx + Math.sin(timeSec * 2.2 + p.seed) * 1.5;
        const targetY = cy + p.by + Math.cos(timeSec * 1.8 + p.seed * 1.3) * 1.5;

        // Comet interaction: push away if cursor within ~60px
        const distToMouse = Math.hypot(p.x - mouseX, p.y - mouseY);
        if (distToMouse < 65) {
          const force = (1 - distToMouse / 65) * 4.5;
          const angle = Math.atan2(p.y - mouseY, p.x - mouseX);
          p.vx += Math.cos(angle) * force;
          p.vy += Math.sin(angle) * force;
        }

        // Spring return towards base breathing position
        p.vx += (targetX - p.x) * 0.08;
        p.vy += (targetY - p.y) * 0.08;
        p.vx *= 0.82;
        p.vy *= 0.82;

        p.x += p.vx;
        p.y += p.vy;

        ctx.globalAlpha = portraitAlpha * p.alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.restore();
    }

    // 4. Draw Bright White Glowing Cursor Comet Trail
    const timeSinceMove = now - lastMoveTime;
    if (trail.length > 1 && timeSinceMove < 400) {
      const fadeFactor = Math.max(0, 1 - timeSinceMove / 400);

      ctx.save();
      ctx.shadowColor = 'white';
      ctx.shadowBlur = 15;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < trail.length - 1; i++) {
        const p1 = trail[i];
        const p2 = trail[i + 1];
        const segAlpha = (1 - i / trail.length) * 0.85 * fadeFactor;
        const segWidth = Math.max(0.5, (1 - i / trail.length) * 3.2);

        ctx.strokeStyle = `rgba(255, 255, 255, ${segAlpha})`;
        ctx.lineWidth = segWidth;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (state !== 'done' || container.style.display !== 'none') {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
})();
