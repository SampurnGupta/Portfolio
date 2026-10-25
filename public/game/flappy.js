/**
 * Terminal Flappy Bird Game
 * Monospace ASCII-inspired Canvas game with delta-time loop
 * Exported as FlappyGame class
 */
class FlappyGame {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.scoreEl = document.getElementById(options.scoreId || 'game-score');
    this.bestEl = document.getElementById(options.bestId || 'game-best');
    this.overlay = document.getElementById(options.overlayId || 'game-focus-overlay');
    this.scoresListEl = document.getElementById('scores-list');
    this.scoreFormEl = document.getElementById('score-submit-form');
    this.playerNameInput = document.getElementById('player-name');

    this.width = this.canvas.width;
    this.height = this.canvas.height;

    // Game Physics & Constants
    this.GRAVITY = 640;     // px / s^2
    this.FLAP_VELOCITY = -230; // px / s
    this.PIPE_SPEED = 125;   // px / s
    this.PIPE_SPAWN_INTERVAL = 1.9; // s
    this.PIPE_GAP = 85;     // px
    this.PIPE_WIDTH = 32;   // px

    // State: 'idle' | 'playing' | 'gameover'
    this.state = 'idle';
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem('flappy_best_score') || '0', 10);
    if (this.bestEl) this.bestEl.textContent = this.bestScore;

    // Entities
    this.bird = {
      x: 75,
      y: this.height / 2,
      vy: 0,
      char: '>',
      size: 18
    };

    this.pipes = [];
    this.pipeTimer = 0;
    this.lastFrameTime = performance.now();
    this.isFocused = false;
    this.isPaused = false;

    this.initEvents();
    this.loadLeaderboard();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  initEvents() {
    // Canvas click to flap / focus
    this.canvas.addEventListener('click', (e) => {
      this.handleAction();
    });

    if (this.overlay) {
      this.overlay.addEventListener('click', () => {
        this.focusGame();
      });
    }

    // Keyboard controls (Space or ArrowUp to flap)
    window.addEventListener('keydown', (e) => {
      if (!this.isFocused) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.handleAction();
      }
    });

    // Touch controls for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleAction();
    }, { passive: false });

    // Click outside to unfocus
    window.addEventListener('click', (e) => {
      const wrapper = document.getElementById('game-canvas-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        this.unfocusGame();
      }
    });

    // Auto-pause when scrolled out of view
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            this.isPaused = true;
          } else {
            this.isPaused = false;
            this.lastFrameTime = performance.now();
          }
        });
      }, { threshold: 0.15 });

      observer.observe(this.canvas);
    }

    // Auto-pause on tab hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isPaused = true;
      } else {
        this.isPaused = false;
        this.lastFrameTime = performance.now();
      }
    });

    // Leaderboard submission form
    if (this.scoreFormEl) {
      this.scoreFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitScore();
      });
    }
  }

  focusGame() {
    this.isFocused = true;
    if (this.overlay) this.overlay.style.display = 'none';
    if (this.state === 'idle') {
      this.startGame();
    }
  }

  unfocusGame() {
    this.isFocused = false;
    if (this.state === 'playing') {
      if (this.overlay) {
        this.overlay.style.display = 'flex';
        this.overlay.innerHTML = '<p>GAME PAUSED</p><p class="game-subtext">[CLICK TO RESUME]</p>';
      }
    } else if (this.state === 'idle') {
      if (this.overlay) {
        this.overlay.style.display = 'flex';
        this.overlay.innerHTML = '<p>CLICK OR PRESS SPACE TO PLAY</p><p class="game-subtext">[SPACE / UP / TAP TO FLAP]</p>';
      }
    }
  }

  handleAction() {
    if (!this.isFocused) {
      this.focusGame();
      return;
    }

    if (this.state === 'idle') {
      this.startGame();
    } else if (this.state === 'playing') {
      this.flap();
    } else if (this.state === 'gameover') {
      this.resetGame();
      this.startGame();
    }
  }

  startGame() {
    this.state = 'playing';
    this.score = 0;
    if (this.scoreEl) this.scoreEl.textContent = '0';
    this.bird.y = this.height / 2;
    this.bird.vy = this.FLAP_VELOCITY * 0.7;
    this.pipes = [];
    this.pipeTimer = 1.0;
    if (this.overlay) this.overlay.style.display = 'none';
    if (this.scoreFormEl) this.scoreFormEl.style.display = 'none';
  }

  flap() {
    this.bird.vy = this.FLAP_VELOCITY;
  }

  resetGame() {
    this.bird.y = this.height / 2;
    this.bird.vy = 0;
    this.pipes = [];
    this.pipeTimer = 0;
    this.score = 0;
    if (this.scoreEl) this.scoreEl.textContent = '0';
    this.state = 'idle';
  }

  gameOver() {
    this.state = 'gameover';

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('flappy_best_score', this.bestScore.toString());
      if (this.bestEl) this.bestEl.textContent = this.bestScore;
    }

    if (this.overlay) {
      this.overlay.style.display = 'flex';
      this.overlay.innerHTML = `
        <p style="color: #ff5f56; font-size: 16px;">GAME OVER</p>
        <p>SCORE: ${this.score}  |  BEST: ${this.bestScore}</p>
        <p class="game-subtext">[CLICK OR PRESS SPACE TO RESTART]</p>
      `;
    }

    if (this.scoreFormEl && this.score > 0) {
      this.scoreFormEl.style.display = 'block';
      if (this.playerNameInput) {
        this.playerNameInput.focus();
      }
    }
  }

  async loadLeaderboard() {
    if (!this.scoresListEl) return;
    try {
      const res = await fetch('/scores');
      if (!res.ok) throw new Error('Scores unavailable');
      const data = await res.json();
      this.renderScores(data.scores || []);
    } catch (_) {
      this.scoresListEl.innerHTML = '<div class="score-row">Leaderboard offline</div>';
    }
  }

  renderScores(scores) {
    if (!this.scoresListEl) return;
    if (!scores.length) {
      this.scoresListEl.innerHTML = '<div class="score-row">No scores yet. Be the first!</div>';
      return;
    }

    this.scoresListEl.innerHTML = scores.map((s, idx) => {
      const rank = idx + 1;
      const rankClass = rank <= 3 ? `rank-${rank}` : '';
      return `
        <div class="score-row ${rankClass}">
          <span>#${rank} ${this.escapeText(s.name)}</span>
          <span>${s.score} PTS</span>
        </div>
      `;
    }).join('');
  }

  escapeText(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async submitScore() {
    if (!this.playerNameInput) return;
    const name = this.playerNameInput.value.trim().toUpperCase();
    if (!name) return;

    try {
      const res = await fetch('/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score: this.score })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to submit score');
        return;
      }

      const data = await res.json();
      this.renderScores(data.scores || []);
      if (this.scoreFormEl) this.scoreFormEl.style.display = 'none';
      if (window.showToast) window.showToast('Score recorded on leaderboard!');
    } catch (err) {
      alert('Error submitting score to server');
    }
  }

  update(dt) {
    if (this.state !== 'playing') return;

    // Bird gravity physics
    this.bird.vy += this.GRAVITY * dt;
    this.bird.y += this.bird.vy * dt;

    // Floor and ceiling collisions
    if (this.bird.y - this.bird.size / 2 <= 0) {
      this.bird.y = this.bird.size / 2;
      this.bird.vy = 0;
    }
    if (this.bird.y + this.bird.size / 2 >= this.height) {
      this.bird.y = this.height - this.bird.size / 2;
      this.gameOver();
      return;
    }

    // Pipe Spawning
    this.pipeTimer += dt;
    if (this.pipeTimer >= this.PIPE_SPAWN_INTERVAL) {
      this.pipeTimer = 0;
      const margin = 40;
      const topHeight = Math.random() * (this.height - this.PIPE_GAP - margin * 2) + margin;
      this.pipes.push({
        x: this.width,
        topHeight,
        bottomY: topHeight + this.PIPE_GAP,
        scored: false
      });
    }

    // Pipes Movement & Collision Check
    const birdBox = {
      left: this.bird.x - 7,
      right: this.bird.x + 9,
      top: this.bird.y - 8,
      bottom: this.bird.y + 8
    };

    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.x -= this.PIPE_SPEED * dt;

      // Score counter
      if (!p.scored && p.x + this.PIPE_WIDTH < this.bird.x) {
        p.scored = true;
        this.score++;
        if (this.scoreEl) this.scoreEl.textContent = this.score;
      }

      // Check collision with top pipe
      const topPipeBox = { left: p.x, right: p.x + this.PIPE_WIDTH, top: 0, bottom: p.topHeight };
      const bottomPipeBox = { left: p.x, right: p.x + this.PIPE_WIDTH, top: p.bottomY, bottom: this.height };

      if (this.checkCollision(birdBox, topPipeBox) || this.checkCollision(birdBox, bottomPipeBox)) {
        this.gameOver();
        return;
      }

      // Remove offscreen pipes
      if (p.x + this.PIPE_WIDTH < -10) {
        this.pipes.splice(i, 1);
      }
    }
  }

  checkCollision(r1, r2) {
    return (
      r1.left < r2.right &&
      r1.right > r2.left &&
      r1.top < r2.bottom &&
      r1.bottom > r2.top
    );
  }

  render() {
    this.ctx.fillStyle = '#0a0a0c';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Grid lines for retro terminal aesthetic
    this.ctx.strokeStyle = '#15151a';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }

    // Render Pipes (ASCII '|' styling with borders)
    this.ctx.fillStyle = '#1c281e';
    this.ctx.strokeStyle = '#39ff14';
    this.ctx.lineWidth = 1.5;

    for (let i = 0; i < this.pipes.length; i++) {
      const p = this.pipes[i];

      // Top pipe
      this.ctx.fillRect(p.x, 0, this.PIPE_WIDTH, p.topHeight);
      this.ctx.strokeRect(p.x, -2, this.PIPE_WIDTH, p.topHeight + 2);

      // Bottom pipe
      this.ctx.fillRect(p.x, p.bottomY, this.PIPE_WIDTH, this.height - p.bottomY);
      this.ctx.strokeRect(p.x, p.bottomY, this.PIPE_WIDTH, this.height - p.bottomY + 2);

      // Inner ASCII hashes
      this.ctx.fillStyle = 'rgba(57, 255, 20, 0.4)';
      this.ctx.font = '10px monospace';
      for (let y = 14; y < p.topHeight - 6; y += 14) {
        this.ctx.fillText('|#|', p.x + 8, y);
      }
      for (let y = p.bottomY + 14; y < this.height - 6; y += 14) {
        this.ctx.fillText('|#|', p.x + 8, y);
      }
      this.ctx.fillStyle = '#1c281e';
    }

    // Render Bird ('>' monospace character with subtle glow)
    this.ctx.save();
    this.ctx.translate(this.bird.x, this.bird.y);
    const angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.bird.vy * 0.0025));
    this.ctx.rotate(angle);

    this.ctx.shadowColor = '#39ff14';
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = '#39ff14';
    this.ctx.font = 'bold 20px "JetBrains Mono", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(this.bird.char, 0, 0);

    this.ctx.restore();
  }

  loop(now) {
    const dt = Math.min(0.08, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    if (!this.isPaused) {
      this.update(dt);
      this.render();
    }

    requestAnimationFrame(this.loop);
  }
}

// Export as globally accessible FlappyGame class
window.FlappyGame = FlappyGame;
