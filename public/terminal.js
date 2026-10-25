/**
 * Interactive Hidden Drawer Terminal (>_)
 * Supports: help, whoami, ls, cat <project>, cat resume, sudo hire-me,
 * theme <name>, toggle butterflies, play, clear, matrix, git log
 */
(function() {
  const triggerBtn = document.getElementById('terminal-trigger');
  const drawer = document.getElementById('terminal-drawer');
  const closeBtn = document.getElementById('term-close-btn');
  const closeX = document.getElementById('term-close-x');
  const form = document.getElementById('term-form');
  const input = document.getElementById('term-input');
  const output = document.getElementById('term-output');

  if (!drawer || !input || !output) return;

  let isOpen = false;
  const history = [];
  let historyIndex = -1;

  function toggleTerminal(force) {
    isOpen = typeof force === 'boolean' ? force : !isOpen;
    drawer.style.display = isOpen ? 'flex' : 'none';
    if (isOpen) {
      input.focus();
    }
  }

  if (triggerBtn) {
    triggerBtn.addEventListener('click', () => toggleTerminal());
  }
  if (closeBtn) closeBtn.addEventListener('click', () => toggleTerminal(false));
  if (closeX) closeX.addEventListener('click', () => toggleTerminal(false));

  // Keyboard shortcut: backtick (`) to toggle terminal
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      toggleTerminal();
    }
  });

  function appendLine(text, className = '') {
    const line = document.createElement('div');
    line.className = `term-line ${className}`.trim();
    line.innerHTML = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  // Email assembler helper
  function assembleEmail() {
    const u = 'sampurngupta.work';
    const d = 'gmail.com';
    return `${u}@${d}`;
  }

  // Command handlers
  const commands = {
    help: () => {
      return `
Available commands:
  <span class="term-highlight">help</span>               - List all available commands
  <span class="term-highlight">whoami</span>             - Brief background summary
  <span class="term-highlight">ls</span>                 - List portfolio sections & directories
  <span class="term-highlight">cat &lt;project&gt;</span>        - Inspect details for tangent, devprompt, or multimodal-rag
  <span class="term-highlight">cat resume</span>         - Open phone-number-free PDF resume
  <span class="term-highlight">sudo hire-me</span>       - Initiate recruiter handshake & copy contact email
  <span class="term-highlight">theme &lt;name&gt;</span>         - Switch theme (night, evening, noon, morning, dawn)
  <span class="term-highlight">toggle butterflies</span> - Toggle floating edge butterflies on/off
  <span class="term-highlight">play</span>               - Scroll down to terminal Flappy Bird game
  <span class="term-highlight">matrix</span>             - Activate falling green glyphs matrix rain
  <span class="term-highlight">git log</span>            - View career timeline as git commits
  <span class="term-highlight">clear</span>              - Clear terminal display buffer
      `;
    },

    whoami: () => {
      return `Sampurn Gupta — Final-year B.Tech CSE student at BML Munjal University (2023–2027, CGPA 8.58/10). Backend engineer, ML/LLM pipeline builder, and distributed systems researcher.`;
    },

    ls: () => {
      return `<span class="term-highlight">about.txt  experience/  projects/  education/  achievements/  skills/  photos/  resume.pdf</span>`;
    },

    play: () => {
      const gameSec = document.getElementById('game-section');
      if (gameSec) {
        gameSec.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          const canvasWrap = document.getElementById('game-canvas-wrapper');
          if (canvasWrap) canvasWrap.focus();
        }, 500);
      }
      return 'Navigating to terminal Flappy Bird game...';
    },

    matrix: () => {
      if (window.triggerMatrixRain) {
        window.triggerMatrixRain(5000);
        return 'Entering the Matrix...';
      }
      return 'Matrix module unavailable.';
    },

    'sudo hire-me': () => {
      const email = assembleEmail();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(email).catch(() => {});
      }
      if (window.showToast) {
        window.showToast(`Recruiter protocol initiated: ${email} copied to clipboard!`);
      }
      return `
[OK] Recruiter protocol verified.
Email address &lt;${email}&gt; copied to clipboard!
Let's build reliable distributed systems and fast LLM workflows together.
      `;
    },

    'cat resume': () => {
      window.open('/resume.pdf', '_blank');
      return 'Opening /resume.pdf (privacy-safe, phone-free version)...';
    },

    'toggle butterflies': () => {
      if (window.toggleButterflies) {
        const active = window.toggleButterflies();
        return `Butterflies toggled: <span class="term-highlight">${active ? 'ENABLED' : 'DISABLED'}</span>`;
      }
      return 'Butterflies module not loaded.';
    },

    'git log': () => {
      return `
<span class="term-highlight">commit f3e921a</span> (HEAD -> main)
Author: Sampurn Gupta &lt;dev@sampurngupta.dev&gt;
Date:   Sep 2025 – Aug 2026
    Lead technical operations at IIE: automated n8n publishing pipelines (-30% turnaround), prototypes & SEO

<span class="term-highlight">commit b88d40c</span>
Author: Sampurn Gupta &lt;dev@sampurngupta.dev&gt;
Date:   May 2025 – Jul 2025
    YRRNA Systems Lab, IIT Kanpur: built low-latency routing libraries for hybrid Chord-Tapestry DHT (-25% latency)

<span class="term-highlight">commit a1278de</span>
Author: Sampurn Gupta &lt;dev@sampurngupta.dev&gt;
Date:   Aug 2023
    Enrolled in B.Tech Computer Science & Engineering @ BML Munjal University
      `;
    },

    clear: () => {
      output.innerHTML = '';
      return '';
    }
  };

  // Handler for dynamic arguments (cat, theme, etc.)
  function executeCommand(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    appendLine(`$ ${escapeHtml(trimmed)}`);
    history.push(trimmed);
    historyIndex = history.length;

    const lower = trimmed.toLowerCase();

    // Exact match commands
    if (commands[lower]) {
      const res = commands[lower]();
      if (res) appendLine(res);
      return;
    }

    // theme <name>
    if (lower.startsWith('theme ')) {
      const themeName = lower.replace('theme ', '').trim();
      const validThemes = ['night', 'evening', 'noon', 'morning', 'dawn'];
      if (validThemes.includes(themeName)) {
        if (window.setTheme) {
          window.setTheme(themeName);
        } else {
          document.documentElement.setAttribute('data-theme', themeName);
          localStorage.setItem('theme', themeName);
        }
        appendLine(`Switched theme to <span class="term-highlight">${themeName}</span>`);
      } else {
        appendLine(`Invalid theme "${escapeHtml(themeName)}". Valid options: ${validThemes.join(', ')}`, 'term-error');
      }
      return;
    }

    // cat <file/project>
    if (lower.startsWith('cat ')) {
      const target = lower.replace('cat ', '').trim();
      if (target === 'about.txt') {
        appendLine(commands.whoami());
        return;
      }
      if (target === 'resume' || target === 'resume.pdf') {
        appendLine(commands['cat resume']());
        return;
      }
      if (target === 'tangent') {
        appendLine(`
<span class="term-highlight">⚡ Tangent</span>
Multi-asset portfolio optimizer + multi-agent decision engine.
Stack: FastAPI, Next.js, PostgreSQL, Redis, Docker, Groq/LLaMA 3.3.
Features: 70+ asset universe, 5,000+ Monte Carlo simulation paths with Indian LTCG tax and inflation modeling, 5-persona AI debate arena with Critic agent.
Repo: https://github.com/SampurnGupta/Tangent
        `);
        return;
      }
      if (target === 'devprompt') {
        appendLine(`
<span class="term-highlight">📊 DevPrompt</span>
Structured-prompting benchmarking research for LLMs.
Pipeline: 6-phase evaluation, 432 automated API calls across diverse schema variants.
Findings: Structured JSON improved Tool F1 by ~15.3% (p=0.0016).
Repo: https://github.com/SampurnGupta/DevPrompt
        `);
        return;
      }
      if (target === 'multimodal-rag' || target === 'rag') {
        appendLine(`
<span class="term-highlight">🤖 MultiModal RAG Chatbot</span>
RAG pipeline spanning 6 input formats: text, URLs, PDF, DOCX, image/OCR, and YouTube transcript ingestion.
Stack: Node.js, ChromaDB, Ollama, Groq, SSE streaming (same real-time streaming engine used on this website).
Repo: https://github.com/SampurnGupta/MultiModal-RAG
        `);
        return;
      }

      appendLine(`cat: ${escapeHtml(target)}: No such file or directory. Try 'ls' to view available entries.`, 'term-error');
      return;
    }

    appendLine(`command not found: ${escapeHtml(trimmed)}. Type 'help' for available commands.`, 'term-error');
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input.value;
    input.value = '';
    executeCommand(val);
  });

  // History navigation with Up/Down arrows
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        input.value = history[historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        historyIndex++;
        input.value = history[historyIndex];
      } else {
        historyIndex = history.length;
        input.value = '';
      }
    }
  });

  // Email Button Click Handler in Header
  const emailBtn = document.getElementById('email-btn');
  if (emailBtn) {
    emailBtn.addEventListener('click', () => {
      const email = assembleEmail();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(email).then(() => {
          if (window.showToast) window.showToast(`Email copied: ${email}`);
        }).catch(() => {
          prompt('Copy email:', email);
        });
      } else {
        prompt('Copy email:', email);
      }
    });
  }
})();
