/**
 * Floating Edge-to-Edge Butterflies
 * Two-element structure to separate CSS keyframe flight path from JS mouse scatter
 */
(function() {
  const container = document.getElementById('butterflies-layer');
  if (!container) return;

  // Check reduced motion
  const prefersReduced = window.__reducedMotion || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (prefersReduced) return;

  // Check persisted toggle state
  const isEnabled = localStorage.getItem('butterfliesEnabled') !== 'false';
  if (!isEnabled) {
    container.style.display = 'none';
  }

  const BUTTERFLY_COUNT = 5;
  const butterflies = [];

  // Inject dynamic keyframes for a butterfly
  function createFlightKeyframes(id, startY, endY, direction) {
    const keyframeName = `flightPath_${id}`;
    const startX = direction > 0 ? -60 : window.innerWidth + 60;
    const endX = direction > 0 ? window.innerWidth + 60 : -60;
    const midY1 = startY + (Math.random() - 0.5) * 180;
    const midY2 = endY + (Math.random() - 0.5) * 180;

    const styleEl = document.createElement('style');
    styleEl.id = `style_${keyframeName}`;
    styleEl.textContent = `
      @keyframes ${keyframeName} {
        0% { transform: translate(${startX}px, ${startY}px) scaleX(${direction}); }
        25% { transform: translate(${startX + (endX - startX) * 0.25}px, ${midY1}px) scaleX(${direction}); }
        50% { transform: translate(${startX + (endX - startX) * 0.5}px, ${startY}px) scaleX(${direction}); }
        75% { transform: translate(${startX + (endX - startX) * 0.75}px, ${midY2}px) scaleX(${direction}); }
        100% { transform: translate(${endX}px, ${endY}px) scaleX(${direction}); }
      }
    `;
    document.head.appendChild(styleEl);
    return keyframeName;
  }

  function spawnButterfly(index) {
    const outer = document.createElement('span');
    outer.className = 'butterfly-outer';

    const inner = document.createElement('span');
    inner.className = 'butterfly-inner';
    inner.textContent = '🦋';
    inner.setAttribute('role', 'img');
    inner.setAttribute('aria-label', 'Floating Butterfly');

    outer.appendChild(inner);
    container.appendChild(outer);

    const startY = Math.random() * (window.innerHeight - 100) + 50;
    const endY = Math.random() * (window.innerHeight - 100) + 50;
    const direction = Math.random() < 0.5 ? 1 : -1;
    const duration = 12 + Math.random() * 10; // 12-22s
    const delay = Math.random() * 5;

    const animName = createFlightKeyframes(index, startY, endY, direction);
    outer.style.animation = `${animName} ${duration}s linear ${delay}s infinite`;

    const bObj = {
      outer,
      inner,
      index,
      dx: 0,
      dy: 0,
      vx: 0,
      vy: 0,
      isFlyingOff: false
    };

    // Click to fly off
    inner.addEventListener('click', (e) => {
      e.stopPropagation();
      if (bObj.isFlyingOff) return;
      bObj.isFlyingOff = true;
      outer.classList.add('fly-off');

      setTimeout(() => {
        outer.remove();
        const oldStyle = document.getElementById(`style_${animName}`);
        if (oldStyle) oldStyle.remove();
        const bIdx = butterflies.indexOf(bObj);
        if (bIdx > -1) butterflies.splice(bIdx, 1);
        // Respawn new butterfly
        spawnButterfly(Date.now());
      }, 2500);
    });

    butterflies.push(bObj);
  }

  // Spawn initial butterflies
  for (let i = 0; i < BUTTERFLY_COUNT; i++) {
    spawnButterfly(i);
  }

  // Mouse Scatter / Push Away (< 100px)
  let mouseX = -1000;
  let mouseY = -1000;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Physics animation loop for inner scatter offsets
  function updateScatter() {
    for (let i = 0; i < butterflies.length; i++) {
      const b = butterflies[i];
      if (b.isFlyingOff) continue;

      const rect = b.inner.getBoundingClientRect();
      const bCenterX = rect.left + rect.width / 2;
      const bCenterY = rect.top + rect.height / 2;

      const dist = Math.hypot(bCenterX - mouseX, bCenterY - mouseY);

      if (dist < 100) {
        // Push inner span away from cursor
        const force = (1 - dist / 100) * 45;
        const angle = Math.atan2(bCenterY - mouseY, bCenterX - mouseX);
        b.vx += Math.cos(angle) * force * 0.15;
        b.vy += Math.sin(angle) * force * 0.15;
      }

      // Spring return to (0, 0)
      b.vx += (0 - b.dx) * 0.08;
      b.vy += (0 - b.dy) * 0.08;
      b.vx *= 0.82;
      b.vy *= 0.82;

      b.dx += b.vx;
      b.dy += b.vy;

      b.inner.style.transform = `translate(${b.dx.toFixed(2)}px, ${b.dy.toFixed(2)}px)`;
    }

    requestAnimationFrame(updateScatter);
  }

  requestAnimationFrame(updateScatter);

  // Global toggle function for terminal / settings
  window.toggleButterflies = function(explicitState) {
    const currentState = container.style.display !== 'none';
    const nextState = typeof explicitState === 'boolean' ? explicitState : !currentState;
    container.style.display = nextState ? 'block' : 'none';
    localStorage.setItem('butterfliesEnabled', nextState ? 'true' : 'false');
    return nextState;
  };
})();
