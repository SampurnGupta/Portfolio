You are a senior front-end/full-stack engineer. Build my personal portfolio website: a minimalistic, single-page site that boots like a terminal and streams its content in via Server-Sent Events (SSE), ends with a playable terminal-style game, and has a few quirky touches.

> **Agent note — highest-priority items to get right:**
> 1. The 5-theme pill slider (top-right) with `🦋` as active-dot indicator
> 2. The coral/salmon row hover effect on every list item (each theme has its own `--hover-bg`)
> 3. The edge-to-edge fixed butterfly animation (outer element for CSS path, inner for JS scatter)
> 4. SSE must close after `event: done` — no reconnect loop
> 5. Server pre-renders `content.json` into HTML at startup — SSE is a visual replay, not the source of truth

---

## About me

Name: **Sampurn Gupta**. Final-year B.Tech CSE student at BML Munjal University, Gurugram (2023–2027, CGPA 8.58/10).

Bio (casual, 2–3 sentences): I build backend systems, ML/LLM pipelines, and automation tools. My work spans distributed systems (a DHT routing library at IIT Kanpur), RAG chatbots with streaming, portfolio optimization with multi-agent debate, and LLM benchmarking research. Looking for a software engineering role at a startup where shipping fast and learning faster is the default.

Links (placeholders — I'll fill in): `[GITHUB_URL]`, `[LINKEDIN_URL]`, `[LEETCODE_URL]`, `[CODECHEF_URL]`, `[EMAIL]`.
- Email must **not** appear as plain text in the HTML. Assemble it in JavaScript on click ("copy email") to reduce scraping.
- Do not include a phone number anywhere. The `cat resume` command must serve a PDF that also has no phone number.

---

## Stage 0: Loading screen + Splash homepage
*(Precisely modelled on ingrassiadaniel.it from video recordings — adapted for terminal aesthetic.)*

Full entry flow:
```
[Loading screen] → [Splash homepage] → [Terminal boot] → [Portfolio content]
```

### Stage 0a — Loading screen (video-verified)
- **Background:** The starfield canvas is already running — hundreds of tiny dim white dots on `#0f0f14`, slowly drifting.
- **Loader widget:** Dead-center: a **circular dot-ring** (~40px diameter) of ~14 white dots arranged like a clock, rotating. Bright leading dot, fading trailing dots — drawn on canvas, not CSS.
- **Counter:** Inside the ring: small `6%` → `100%` in ~11px sans-serif, `rgba(255,255,255,0.6)`. Easing curve (fast start, slow near 100).
- **Exit:** Ring + counter fade out in 300ms. Portrait assembles from the existing starfield particles.

### Stage 0b — Splash homepage (video-verified, click anywhere to enter)

**Starfield canvas:** Full-viewport `<canvas>`, ~500 tiny white dots (1–1.5px), slow random drift, wrap at edges. BG: `#0f0f14`.

**Particle portrait — head+shoulders silhouette:**
- Dense bust, ~40% of viewport height, from a pre-defined array of (dx, dy) offsets forming a realistic head+shoulders shape.
- Thousands of 1px white dots; denser at edges, sparser inside; subtle per-dot breathing via `Math.sin(time + seed)`.
- Plain `ctx.fillRect` in a `requestAnimationFrame` loop. No WebGL, no Three.js.

**Cursor comet trail — most important interaction:**
- Real cursor hidden (`cursor: none` on the canvas).
- A **bright white glowing comet streak** follows the mouse in real time.
- Ring buffer of last N mouse positions; draw a tapering gradient stroke from current position back ~80–120px.
- Head: ~3px wide, full white. Tail: transparent. Glow: `ctx.shadowColor = 'white'`, `ctx.shadowBlur = 15`.
- Faster movement → longer/brighter trail. Still cursor → trail fades over ~300ms.
- Comet passes over portrait dots; dots within ~60px scatter away and drift back slowly.

**Text:** Name (`Sampurn Gupta`) vertically centered, left edge. Role (`Software Engineer`) vertically centered, right edge. Both ~13px, `rgba(255,255,255,0.7)`. Subtle `click to enter` at very bottom-center.

**Entry:** Click or keypress → canvas fades out (500ms) → terminal boot fades in.

**Session skip:** `sessionStorage.splashSeen = true` — show once per browser session. On second load in the same session, jump straight to terminal boot (fast-forward, don't skip entirely).

---

## Reference design (vaibhaav.in structure)

### Layout
- Single centered column, `max-width: 640px`, left-aligned text.
- Background, text, borders set via CSS custom properties (see themes below).
- No nav bar, no sidebar, no sticky anything.
- Sections separated by a thin `<hr>`.

### Typography
- **Body:** `system-ui, -apple-system, sans-serif`. No Google Fonts for body (keeps weight down).
- **Monospace:** Self-host a single subset of **JetBrains Mono** (latin only, ~20KB). Use for section headings, terminal lines, skills output, and the boot sequence.
- Section headings are small, muted-grey, letter-spaced labels — not large bold headings.

### Content row format (every section)
```
[emoji] [Title · short description]          [date or metric, right-aligned]
```
- One row per item. No cards, no toggles on hover.
- Projects: emoji + **bold name** + ` · ` + one-line description. No date on the row.

### Theme slider (top-right, `position: fixed`)
A pill-shaped control with **5 circular dot buttons**: **Dawn · Morning · Noon · Evening · Night**.

The `🦋` butterfly emoji sits on top of the active dot and slides to the new dot on click.

All theme switching is done by swapping a `data-theme` attribute on `<html>` and updating CSS custom properties. Do **not** transition `--bg`/`--text` directly (CSS variable transitions don't animate). Instead, transition `background-color`, `color`, `border-color`, and `box-shadow` on the actual elements with `transition: 0.3s ease`.

Theme palettes (all values exact hex):

| Theme | `--bg` | `--text` | `--muted` | `--accent` | `--hover-bg` |
|-------|--------|----------|-----------|------------|--------------|
| **Night** (default) | `#0d0d0d` | `#e0e0e0` | `#666` | `#39ff14` | `rgba(220,100,100,0.30)` |
| **Evening** | `#1a1025` | `#d4c5f9` | `#7a6e99` | `#b788ff` | `rgba(183,136,255,0.25)` |
| **Noon** | `#f5f0e8` | `#1a1a1a` | `#888` | `#2563eb` | `rgba(37,99,235,0.15)` |
| **Morning** | `#fdf6ec` | `#2a1f0e` | `#a08060` | `#d97706` | `rgba(217,119,6,0.15)` |
| **Dawn** | `#fdf0f0` | `#2a0a0a` | `#b08080` | `#e05252` | `rgba(224,82,82,0.18)` |

- Persist in `localStorage` using theme name.
- **Default by time of day**: Night (20:00–05:59), Dawn (06:00–08:59), Morning (09:00–11:59), Noon (12:00–17:59), Evening (18:00–19:59). Override with stored preference if present.
- Terminal command: `theme <night|evening|noon|morning|dawn>` (use the five names everywhere — no "green/amber/paper").
- The pill UI wraps in `@media (hover: hover)` to hide on touch-only screens; add `:focus-visible` styles for keyboard users.
- Theme dots form a `role="radiogroup"` with arrow-key navigation.

### Row hover effect
- Each list row is wrapped in a `<div class="row">`.
- On hover: `background-color: var(--hover-bg)`, `border-radius: 6px`, `padding: 4px 8px`, `transition: background-color 0.15s ease, color 0.15s ease`.
- On mobile / touch-only (`@media (hover: none)`): no hover styles applied.

### Butterflies (fixed, edge-to-edge)
- 4–6 `🦋` emoji spans, `position: fixed`, `z-index: 10`, `pointer-events: none` on the **outer** wrapper span (so they don't block text clicks).
- **Two-element structure to avoid CSS/JS transform conflict:**
  ```html
  <span class="butterfly-outer">   ← CSS @keyframes animates transform (the flight path)
    <span class="butterfly-inner"> ← JS mousemove sets transform (the scatter offset)
      🦋
    </span>
  </span>
  ```
- Each outer span gets a unique CSS `@keyframes` with randomised start position, sinusoidal Y wobble, and horizontal drift across full viewport width (0% → 100vw or reverse). Duration 10–22s, `animation-iteration-count: infinite`.
- JS `mousemove`: for each butterfly, if distance from cursor < 100px, push the **inner** span's `transform: translate(dx, dy)` away from cursor. Spring-return to `translate(0,0)` when out of range.
- On click: add a CSS class that plays a fly-off animation, remove after 2.5s, spawn new butterfly at random edge.
- Off under `prefers-reduced-motion`: if `matchMedia('(prefers-reduced-motion: reduce)').matches`, don't spawn any butterflies.
- Toggled by terminal command `toggle butterflies` (stores state in `localStorage`).

### Photo gallery
3 photos in postage-stamp style at the bottom:
- `<figure>` with `clip-path` or `radial-gradient` mask for perforated border effect.
- Dark-slate background, witty lowercase captions.
- Placeholders: `[IMAGE_1_PATH]`, `[IMAGE_2_PATH]`, `[IMAGE_3_PATH]`.

---

## Core experience: terminal boot + SSE streaming

### Boot sequence (Stage 1)
Full-screen dark terminal after the splash fades. Displays:
```
$ ssh guest@[DOMAIN]
connecting... done.
Last login: [real current datetime from JS, e.g. Mon Oct 26 03:00:00 2026]
$ cat about.txt
```
- The `[DOMAIN]` and login timestamp are injected by JS — never hard-coded.
- Each boot line types character-by-character (~30ms/char).
- A visible **"skip →"** hint appears bottom-right from the first frame. Any keypress or click skips to instant render.
- After boot, terminal slides up and main page fades in.
- Under `prefers-reduced-motion`: skip the entire boot and splash, render content instantly.

### SSE streaming (Stage 2) — timing and correctness

**Timing budget:** ~6 seconds total. Target: section headings type fast, row content appears row-by-row.
- Boot lines / `$` commands: character-by-character, ~25ms/char.
- Section heading (`$ ls experience/`): character-by-character, fast.
- Each content row: appear as one unit with a ~120ms inter-row delay (not character-by-character).
- Skills block (`$ ls skills/`): render all lines at once after a single heading type.

**Server (`GET /stream`):**
```
res.setHeader('Content-Type', 'text/event-stream')
res.setHeader('Cache-Control', 'no-cache')
res.setHeader('X-Accel-Buffering', 'no')          // disable nginx buffering
res.setHeader('Connection', 'keep-alive')
res.flushHeaders()                                  // send headers immediately
// Exclude /stream from any compression middleware
```
- Events sent: `event: section\ndata: {...}\n\n`, `event: chunk\ndata: "text"\n\n`, `event: done\ndata: \n\n`.
- After `event: done`, server closes the response with `res.end()`.

**Client (`EventSource`):**
```js
const es = new EventSource('/stream')
es.addEventListener('done', () => {
  es.close()            // MUST close — otherwise browser reconnects in 3s and replays everything
  showGame()
})
es.onerror = () => {
  es.close()
  renderFromStatic()    // fall back to the pre-rendered HTML
}
```

**SEO / noscript / single source of truth:**
- At server startup, `server.js` reads `content.json` and renders all portfolio sections into the HTML template as real DOM (inside a `<main id="content">` element).
- An inline `<script>` runs before first paint: it hides `#content` visually (not `display:none` — use `visibility: hidden` + `aria-hidden="true"` + `aria-busy="true"`), so the pre-rendered content exists in the DOM for crawlers and `<noscript>`, but the user sees the animated version.
- Once SSE finishes (or is skipped), reveal `#content`, remove `aria-busy`, set `aria-busy="false"`.
- The `<noscript>` tag makes `#content` visible with a simple CSS rule.
- **No dual source of truth** — `content.json` is the only place to edit content.

**Accessible streaming:**
- `<main id="content" role="log" aria-live="polite" aria-busy="true">` — set `aria-busy="false"` when done.
- Screen readers get the pre-rendered text instantly (it's in the DOM); the live region only fires for content that wasn't there at load time (avoid announcing every typed character).

**Fallback route:**
- `GET /content.json` must have an explicit Express route (content.json lives at project root, outside `public/`):
  ```js
  app.get('/content.json', (req, res) => res.sendFile(path.join(__dirname, 'content.json')))
  ```

---

## Content (source of truth — goes into `content.json`)

### About
I build backend systems, ML/LLM pipelines, and automation tools. My work spans distributed systems (a DHT routing library at IIT Kanpur), RAG chatbots with streaming, portfolio optimization with multi-agent debate, and LLM benchmarking research. Looking for a software engineering role at a startup where shipping fast and learning faster is the default.

### Experience
- 🏢 **Technical Operations Lead**, Institute of Innovation & Entrepreneurship (IIE), BML Munjal University — Sep 2025 – Aug 2026
  - Automated event-driven content publishing workflows in n8n, cutting turnaround time ~30%.
  - Gathered requirements; built prototypes: websites, portfolios, chatbots, automation tools.
  - Improved SEO via keyword targeting, meta tags, internal linking, sitemap, and page-speed work.
- 🔬 **Application Developer Intern**, YRRNA Systems Lab, IIT Kanpur — May 2025 – Jul 2025
  - Built low-latency routing libraries for a scalable hybrid Chord-Tapestry DHT P2P network.
  - Cut average network latency ~25% through iterative optimization and edge-case testing.
  - Designed modular Dart components for routing abstraction and diagnostics, adopted by internal teams.

### Projects
- ⚡ **Tangent** · Multi-asset portfolio optimizer + multi-agent decision engine. FastAPI, Next.js, PostgreSQL, Redis, Docker, Groq/LLaMA 3.3. 70+ asset universe, 5K+ Monte Carlo paths with Indian LTCG tax/inflation, 5-persona AI debate arena with Critic agent. [DEMO_URL] [GITHUB_URL]
- 📊 **DevPrompt** · Structured-prompting benchmarking research for LLMs. 6-phase pipeline, 432 API calls; structured JSON improved Tool F1 ~15.3% (p=0.0016). [PAPER_URL] [GITHUB_URL]
- 🤖 **MultiModal RAG Chatbot** · RAG over 6 input types (text, URL, PDF, DOCX, image/OCR, YouTube). Node.js, ChromaDB, Ollama, Groq, SSE streaming — same technique this site uses. [DEMO_URL] [GITHUB_URL]

### Education
- 🎓 B.Tech CSE, BML Munjal University, Gurugram — 2023–2027, CGPA 8.58/10
- 📚 ISC (12th) 94% · ICSE (10th) 92.2%, Lucknow

### Achievements
- 🥉 **2nd Runner-Up**, Eightfold AI Hackathon, IIT Kanpur 2025 — top 3 of 200+ teams (IITs & NITs)
- 🇮🇳 **National Finalist**, Smart India Hackathon 2023 — top 0.5% of 50,000+ submissions
- 🎓 Student Academic Representative, BML Munjal University, 2024–25
- 💼 Head of Sponsorship, Propel PitchFest 2025 (ACIC-BMU)
- 🎉 Lead, Melange — BMU's flagship cultural fest

### Skills (render as `$ ls skills/` output — NOT a badge wall)
```
languages/    c++  java  python  javascript  sql
backend/      fastapi  flask  node.js/express
ml-ai/        scikit-learn  rag-pipelines  llms  embeddings  transformers
automation/   n8n  webhooks  rest-api  bash
data/         mongodb  postgresql  redis
devops/       docker  github-actions  aws-gcp  prometheus  grafana
fundamentals/ dsa  oop  dbms  os  distributed-systems
```

---

## Quirky features

1. **Butterflies** — spec above. Off under `prefers-reduced-motion`. Toggled by `toggle butterflies` command.
2. **Hidden terminal** — `>_` icon pinned bottom-right. Supported commands (use theme names consistently):
   - `help` — list all commands
   - `whoami` — one-liner about me
   - `ls` — list sections
   - `cat <project>` — show full project details
   - `cat resume` — serve `resume.pdf` (phone-number-free version only)
   - `sudo hire-me` — witty response + JS-assembled email copy
   - `theme <night|evening|noon|morning|dawn>` — switch theme (matches the pill slider names)
   - `toggle butterflies` — show/hide butterflies (persists in `localStorage`)
   - `play` — scroll to game
   - `clear` — clear terminal output
   - `matrix` — trigger matrix rain
   - `git log` — mock commit history of experience timeline
3. **Konami code** — triggers matrix rain.
4. **Matrix rain** — full-screen canvas overlay, green katakana/latin, fades after 4s or on keypress.
5. **Theme slider** — pill with 5 dots + `🦋` indicator, `role="radiogroup"`, arrow-key navigable.
6. **Footer** — `uptime: [dynamic from load time]  ·  load: coffee  ·  [GITHUB_URL]`
7. **Tab title** — changes to `come back :(` when tab hidden, restores on focus.
8. **Custom 404** — `bash: /404: No such file or directory`. Link back to `/`.
9. **Live visitor count (optional but recommended)** — a real long-lived `GET /live` SSE endpoint that broadcasts "N people here now" using a simple in-memory counter. This makes the SSE technique genuine rather than a `fetch` + timer, and fits the RAG chatbot story (same streaming approach). Show it as a subtle line in the footer.

---

## Finale: Flappy Bird game

After all content has streamed, print `$ ./play_flappy.sh` and reveal the game panel.

### Game spec
- **Canvas only** — use `<canvas>`, not `<pre>` updated 60 times/second (GPU render, no DOM thrash).
- Bird: `>` character rendered in monospace on canvas. Pipes: `|` with gaps.
- **Time-based game loop** — use delta time (`dt = now - lastFrame`) so game speed is identical at 60Hz and 120Hz.
- Controls: `Space`, `↑`, tap/click to flap. Must NOT intercept page scroll when unfocused — add a "click to focus" overlay.
- **Pause automatically** when: (a) canvas scrolled out of viewport (`IntersectionObserver`), (b) tab hidden (`visibilitychange`).
- States: start, playing, game-over (show score + local best), restart prompt.
- Best score: `localStorage`.
- **Leaderboard**: `POST /score` and `GET /scores` (see architecture doc for validation and storage).
- Mobile: tap canvas to flap.
- Exported as `FlappyGame` class in `game/flappy.js` — swappable with `game/snake.js` etc. with no changes to host page.
- Reference repo: `[FLAPPY_REPO_URL]`.

---

## Design constraints
- **Fonts**: Self-host JetBrains Mono (latin subset, ~20KB) for monospace. `system-ui` for body. No Google Fonts at runtime.
- **Page weight**: < 200KB total (excluding photos and game canvas assets).
- **Lighthouse**: ≥ 90 on all four metrics.
- **Responsive**: 320px–1440px+. Column centered at all widths.
- **No layout shift**: pre-rendered content reserves space; SSE animation fills it in.
- **SEO**: `<title>`, `<meta name="description">`, Open Graph (`og:title`, `og:description`, `og:image` pointing to `og-image.png`), `<link rel="canonical">`, `robots.txt`, `sitemap.xml`, `favicon.svg` (`>_` terminal icon).
- **Keyboard accessible**: Tab order logical, visible `:focus-visible` outlines on all interactive elements.
- **ARIA**: `aria-busy` on `#content` while streaming; `role="radiogroup"` on theme dots; `aria-label` on all icon-only buttons.
- **Security**: `helmet` middleware for security headers; rate-limit `POST /score` per IP (max 10/min); cap on concurrent SSE streams per IP (max 5).

---

## Chosen stack (decided — skip Phase 1)

- **Backend**: Node.js + Express + `helmet` + `express-rate-limit`
- **Frontend**: Vanilla HTML + CSS + JS, no framework, no build step
- **Data**: `content.json` at project root
- **Resume**: `public/resume.pdf` (no phone number)
- **Leaderboard**: `scores.json` behind a Railway Volume (persistent disk), or make the leaderboard UI optional so the server is stateless if no volume attached
- **Hosting**: Railway (always-on, persistent connections, no SSE timeout). Costs ~$1–5/month on Hobby plan (metered at ~$20/vCPU, ~$10/GB RAM — a tiny Express app uses almost none).

---

## Deliverables — start at Phase 2 (Phase 1 is done)

**Phase 2 — Splash + Boot + SSE skeleton**
- `splash.js`: starfield canvas, dot-ring loader, particle portrait, comet cursor.
- `server.js`: Express, `helmet`, content pre-rendering into HTML template, `GET /stream` with correct headers and `es.close()` protocol, `GET /content.json` route, `GET /live` (visitor count SSE).
- `main.js`: boot sequence (real timestamp, [DOMAIN] placeholder), skip hint, SSE client with `es.close()`, `aria-busy` toggle, `prefers-reduced-motion` shortcut.
- `<noscript>` fallback CSS rule.

**Phase 3 — Full content sections**
- All sections from `content.json` pre-rendered in HTML and visually replayed via SSE.
- Correct one-line row layout, right-aligned dates/metrics.
- All 5 themes with correct `--hover-bg` per theme, transitions on elements not variables.

**Phase 4 — Quirky features**
- Butterflies (two-element structure, scatter, `toggle butterflies`, off under reduced-motion).
- Terminal prompt (all commands, consistent theme names).
- Konami + matrix rain.
- Theme pill slider (radiogroup, arrow keys, `🦋` indicator, time-of-day default).
- Footer, tab-title trick.

**Phase 5 — Flappy Bird game**
- Delta-time canvas loop, `IntersectionObserver` pause, tab-hidden pause.
- `POST /score` with validation: name ≤ 20 chars, rendered with `textContent` not `innerHTML`, IP rate-limit, score must be integer 0–9999.
- `GET /scores` returns top 10.

**Phase 6 — Polish + static assets + README**
- `robots.txt`, `sitemap.xml`, `og-image.png`, `favicon.svg`, `resume.pdf` (placeholder).
- `404.html` terminal error page.
- Lighthouse audit pass.
- `README.md`: how to edit `content.json`, add commands, swap game, deploy to Railway (including Volume setup for `scores.json` and nginx `X-Accel-Buffering: no` note).
