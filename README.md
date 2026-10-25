# Sampurn Gupta · Terminal & SSE Streaming Portfolio

A minimalist, high-performance personal portfolio website built with a retro terminal aesthetic. Features an interactive starfield splash screen with a particle bust and comet cursor, typewriter terminal boot, Server-Sent Events (SSE) visual content streaming, 5 harmonious themes with an edge-to-edge butterfly slider, an interactive drawer terminal (`>_`), Konami code matrix rain, and an ASCII-styled Flappy Bird game with a live leaderboard.

---

## 🌟 Key Features

1. **Stage 0: Starfield Splash & Particle Silhouette (`splash.js`)**
   - Easing dot-ring loader with dynamic percentage counter (6% → 100%).
   - Thousands of floating canvas dots forming a head-and-shoulders bust with breathing physics.
   - Bright white glowing comet mouse trail that scatters portrait dots within ~60px.
   - Skipped seamlessly for recurring sessions via `sessionStorage.splashSeen`.

2. **Stage 1: Terminal Boot Sequence (`main.js`)**
   - Retro terminal boot with character typing: `$ ssh guest@domain`, real dynamic login timestamp, and `$ cat about.txt`.
   - "skip →" button and instant keypress/click bypass.
   - Complete bypass when `prefers-reduced-motion` is active.

3. **Stage 2: Real Server-Sent Events (SSE) Streaming (`/stream`)**
   - True HTTP streaming with unbuffered headers (`X-Accel-Buffering: no`, `Cache-Control: no-cache`).
   - ~120ms inter-row delays delivering a visual typewriter replay over pre-rendered DOM.
   - Clean closure protocol on `event: done` preventing browser reconnect loops.

4. **SEO & Accessibility (Single Source of Truth)**
   - Pre-rendered at server startup: search engines, web crawlers, and `<noscript>` users receive the full semantic HTML DOM immediately.
   - `aria-busy="true"` dynamically cleared to `false` when streaming finishes.
   - Complete Open Graph, Twitter card, canonical, sitemap.xml, and robots.txt metadata.

5. **5-Theme Pill Slider (`style.css`, `main.js`)**
   - **Night** (default: `#0d0d0d`), **Evening** (`#1a1025`), **Noon** (`#f5f0e8`), **Morning** (`#fdf6ec`), and **Dawn** (`#fdf0f0`).
   - Active `🦋` butterfly indicator sliding smoothly between dots.
   - Automatic time-of-day theme default (or persisted in `localStorage`).
   - Accessible `role="radiogroup"` with keyboard arrow navigation.
   - Coral/salmon row hover effect styled per theme (`--hover-bg`).

6. **Fixed Edge-to-Edge Butterflies (`butterflies.js`)**
   - Two-element architecture separating CSS keyframe flight paths from JS mouse repulsion offsets.
   - Click to trigger fly-off animation and edge respawn.
   - Toggleable via the terminal command `toggle butterflies` with state persistence.

7. **Interactive Terminal Drawer (`terminal.js`)**
   - Bottom-right `>_` floating button or `` ` `` (backtick) shortcut.
   - Commands: `help`, `whoami`, `ls`, `cat <project>`, `cat resume`, `sudo hire-me` (JS-assembled email copy), `theme <name>`, `toggle butterflies`, `play`, `matrix`, `git log`, `clear`.

8. **Konami Code & Matrix Rain (`matrix.js`)**
   - Typing `↑ ↑ ↓ ↓ ← → ← → B A` or running `matrix` launches falling green glyphs on a full-screen canvas.

9. **Terminal Flappy Bird Game (`flappy.js`)**
   - Delta-time game loop (`dt = now - lastFrame`) ensuring identical physics across 60Hz and 120Hz+ displays.
   - ASCII monospace art: `>` bird, `|` pipes.
   - Auto-pause when scrolled out of view (`IntersectionObserver`) or when switching browser tabs.
   - Rate-limited leaderboard API (`POST /score` and `GET /scores`) with persistent `scores.json` storage.

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Node.js, Express, Helmet (CSP configured), express-rate-limit
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+), HTML5 Canvas
- **Typography**: Self-hosted JetBrains Mono (latin subset woff2), system font fallback
- **Data Source**: `content.json` at project root
- **Persistence**: `scores.json` (supports Railway Volumes)

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm

### Installation & Run

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
# Or start in watch mode for development:
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 📝 Customization Guide

### Editing Portfolio Content
Edit **`content.json`** at the project root. It is the single source of truth for:
- Bio, personal information, social handles
- Experience timeline and bullets
- Featured projects, links, and tags
- Education and honors
- Monospace skills categories
- Postage-stamp photo captions

### Adding New Terminal Commands
Open `public/terminal.js` and add a new entry to the `commands` object:
```javascript
commands['custom'] = () => {
  return 'Your custom output here!';
};
```

### Swapping the Game Module
The game interface is modular. `FlappyGame` is loaded in `public/game/flappy.js`. To swap it with a Snake or Asteroids game:
1. Create `public/game/snake.js` implementing a game class with `focusGame()`, `unfocusGame()`, and `resetGame()`.
2. Update the script tag in `public/index.html` and instance initialization in `public/main.js`.

---

## 🚢 Production Deployment (Railway)

1. **Push to GitHub**:
   ```bash
   git push origin main
   ```
2. **Create New Project in Railway**:
   - Link your GitHub repository (`SampurnGupta/Portfolio`).
   - Start command: `node server.js`
3. **Mount a Persistent Volume (for Leaderboard)**:
   - In Railway Dashboard, go to your service → **Settings** → **Volumes**.
   - Add a Volume mounted at `/data`.
   - Set environment variable: `SCORES_PATH=/data/scores.json`.
4. **Custom Reverse Proxy / Nginx Note**:
   - If running behind Nginx, ensure buffering is disabled for SSE:
     ```nginx
     proxy_buffering off;
     proxy_set_header Connection '';
     proxy_http_version 1.1;
     chunked_transfer_encoding off;
     ```
   - `server.js` automatically sends `X-Accel-Buffering: no` for native proxy compatibility.

---

## 📄 License
MIT License · Built with care by [Sampurn Gupta](https://github.com/SampurnGupta).
