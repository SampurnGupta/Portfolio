/**
 * Main Application Orchestrator
 * - Stage 1: Terminal Boot Sequence
 * - Stage 2: SSE Visual Replay with es.close() protocol
 * - Theme Pill Slider (5 themes, arrow-key navigation, butterfly indicator)
 * - Live Visitor Counter (/live SSE)
 * - Dynamic Uptime Counter
 * - Tab Title Switcher
 * - Toast Notification Helper
 */
(function() {
  const bootContainer = document.getElementById('boot-container');
  const bootContent = document.getElementById('boot-content');
  const bootSkipBtn = document.getElementById('boot-skip');
  const contentMain = document.getElementById('content');
  const themeButterfly = document.getElementById('theme-butterfly');
  const themeButtons = Array.from(document.querySelectorAll('.theme-dot-btn'));
  const toastEl = document.getElementById('toast');
  const uptimeEl = document.getElementById('uptime-counter');
  const liveCountEl = document.getElementById('live-count');

  // Track global preferences
  const prefersReduced = window.__reducedMotion || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const startTime = Date.now();
  let bootSkipped = false;
  let gameInstance = null;

  // --------------------------------------------------------------------------
  // 1. Toast Notification Helper
  // --------------------------------------------------------------------------
  let toastTimer = null;
  window.showToast = function(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2800);
  };

  // --------------------------------------------------------------------------
  // 2. Tab Title Switcher
  // --------------------------------------------------------------------------
  const originalTitle = document.title;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      document.title = 'come back :(';
    } else {
      document.title = originalTitle;
    }
  });

  // --------------------------------------------------------------------------
  // 3. Dynamic Uptime Counter
  // --------------------------------------------------------------------------
  function updateUptime() {
    if (!uptimeEl) return;
    const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsedSec / 60);
    const s = elapsedSec % 60;
    uptimeEl.textContent = `${m}m ${s < 10 ? '0' : ''}${s}s`;
  }
  setInterval(updateUptime, 1000);
  updateUptime();

  // --------------------------------------------------------------------------
  // 4. Live Visitor Counter via SSE (/live)
  // --------------------------------------------------------------------------
  function initLiveSSE() {
    if (!window.EventSource) return;
    try {
      const liveEs = new EventSource('/live');
      liveEs.addEventListener('visitor-count', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (liveCountEl && data.count) {
            liveCountEl.textContent = data.count;
          }
        } catch (_) {}
      });
      liveEs.onerror = () => {
        // Will auto retry natively according to SSE standard
      };
    } catch (_) {}
  }

  // --------------------------------------------------------------------------
  // 5. Theme Pill Slider & Radiogroup Navigation
  // --------------------------------------------------------------------------
  const themes = ['dawn', 'morning', 'noon', 'evening', 'night'];

  function updateButterflyPosition(activeBtn) {
    if (!themeButterfly || !activeBtn) return;
    const btnRect = activeBtn.getBoundingClientRect();
    const pillRect = activeBtn.parentElement.getBoundingClientRect();
    const offsetLeft = btnRect.left - pillRect.left + (btnRect.width / 2) - 8;
    themeButterfly.style.transform = `translateX(${offsetLeft}px)`;
  }

  window.setTheme = function(themeName) {
    if (!themes.includes(themeName)) return;
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('theme', themeName);

    themeButtons.forEach(btn => {
      const isMatch = btn.getAttribute('data-theme-name') === themeName;
      btn.setAttribute('aria-checked', isMatch ? 'true' : 'false');
      btn.classList.toggle('active', isMatch);
      if (isMatch) {
        updateButterflyPosition(btn);
      }
    });
  };

  // Initial Theme Setup
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'night';
  const initialBtn = themeButtons.find(b => b.getAttribute('data-theme-name') === currentTheme) || themeButtons[4];
  setTimeout(() => updateButterflyPosition(initialBtn), 60);

  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const themeName = btn.getAttribute('data-theme-name');
      window.setTheme(themeName);
    });
  });

  // Arrow key navigation for radiogroup
  const pillNav = document.querySelector('.theme-pill');
  if (pillNav) {
    pillNav.addEventListener('keydown', (e) => {
      const currentIndex = themeButtons.findIndex(b => b.getAttribute('aria-checked') === 'true');
      let nextIndex = -1;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % themeButtons.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + themeButtons.length) % themeButtons.length;
      }

      if (nextIndex >= 0) {
        const nextBtn = themeButtons[nextIndex];
        const nextTheme = nextBtn.getAttribute('data-theme-name');
        window.setTheme(nextTheme);
        nextBtn.focus();
      }
    });
  }

  // --------------------------------------------------------------------------
  // 6. Reveal Content & Initialize Game
  // --------------------------------------------------------------------------
  function revealContent() {
    if (!contentMain) return;
    contentMain.classList.remove('stream-hidden');
    contentMain.classList.add('stream-revealed');
    contentMain.setAttribute('aria-busy', 'false');

    // Make all sections visible
    const sections = contentMain.querySelectorAll('.portfolio-section');
    sections.forEach(sec => sec.classList.add('visible'));

    // Initialize terminal flappy game
    if (!gameInstance && window.FlappyGame) {
      gameInstance = new FlappyGame('flappy-canvas');
    }
  }

  // --------------------------------------------------------------------------
  // 7. Stage 2: SSE Visual Replay
  // --------------------------------------------------------------------------
  function startSSEStream() {
    if (prefersReduced || !window.EventSource) {
      revealContent();
      return;
    }

    contentMain.classList.remove('stream-hidden');
    contentMain.classList.add('streaming-active');
    contentMain.setAttribute('aria-busy', 'true');

    const sections = contentMain.querySelectorAll('.portfolio-section');
    const sectionMap = new Map();
    sections.forEach(sec => {
      const name = sec.getAttribute('data-section');
      if (name) sectionMap.set(name, sec);
    });

    try {
      const es = new EventSource('/stream');

      es.addEventListener('section', (e) => {
        try {
          const step = JSON.parse(e.data);
          const secEl = sectionMap.get(step.section);
          if (secEl) {
            secEl.classList.add('visible');
          }
        } catch (_) {}
      });

      es.addEventListener('done', () => {
        // Crucial: close to avoid reconnect loops
        es.close();
        revealContent();
      });

      es.onerror = () => {
        es.close();
        revealContent();
      };
    } catch (_) {
      revealContent();
    }
  }

  // --------------------------------------------------------------------------
  // 8. Stage 1: Terminal Boot Sequence
  // --------------------------------------------------------------------------
  function runBootSequence() {
    if (prefersReduced) {
      revealContent();
      initLiveSSE();
      return;
    }

    if (!bootContainer || !bootContent) {
      revealContent();
      initLiveSSE();
      return;
    }

    bootContainer.style.display = 'flex';

    const domain = window.location.hostname || 'sampurngupta.dev';
    const loginTime = new Date().toUTCString().replace('GMT', 'UTC');

    const bootLines = [
      `$ ssh guest@${domain}`,
      `connecting... done.`,
      `Last login: ${loginTime} from ${domain}`,
      `$ cat about.txt`
    ];

    let lineIdx = 0;
    let charIdx = 0;

    function skipBoot() {
      if (bootSkipped) return;
      bootSkipped = true;
      bootContainer.classList.add('fade-out');
      setTimeout(() => {
        bootContainer.style.display = 'none';
        revealContent();
        initLiveSSE();
      }, 350);
    }

    if (bootSkipBtn) bootSkipBtn.addEventListener('click', skipBoot);
    window.addEventListener('keydown', (e) => {
      if (!bootSkipped && bootContainer.style.display !== 'none') {
        skipBoot();
      }
    });

    function typeChar() {
      if (bootSkipped) return;

      if (lineIdx >= bootLines.length) {
        // Boot complete -> transition to content & SSE
        setTimeout(() => {
          bootContainer.classList.add('fade-out');
          setTimeout(() => {
            bootContainer.style.display = 'none';
            startSSEStream();
            initLiveSSE();
          }, 400);
        }, 500);
        return;
      }

      const currentLine = bootLines[lineIdx];

      if (charIdx === 0) {
        if (lineIdx > 0) bootContent.appendChild(document.createTextNode('\n'));
      }

      if (charIdx < currentLine.length) {
        const char = currentLine.charAt(charIdx++);
        bootContent.appendChild(document.createTextNode(char));
        const delay = char === '\n' ? 120 : (Math.random() * 20 + 15);
        setTimeout(typeChar, delay);
      } else {
        lineIdx++;
        charIdx = 0;
        setTimeout(typeChar, 140);
      }
    }

    typeChar();
  }

  // --------------------------------------------------------------------------
  // 9. Coordinate with Splash Screen
  // --------------------------------------------------------------------------
  window.onSplashComplete = function(skipDirectToContent) {
    if (skipDirectToContent || prefersReduced) {
      revealContent();
      initLiveSSE();
    } else {
      runBootSequence();
    }
  };

  // Fallback if splash was skipped or not present
  setTimeout(() => {
    const splash = document.getElementById('splash-container');
    if ((!splash || splash.style.display === 'none') && contentMain.classList.contains('stream-hidden')) {
      revealContent();
      initLiveSSE();
    }
  }, 4000);
})();
