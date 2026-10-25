# Stack & Architecture Decision

## What the server actually does

Your site has two non-trivial requirements:
1. **SSE streaming** — `GET /stream` keeps a connection open for ~6 seconds while it sends content row-by-row.
2. **Pre-rendered HTML** — `server.js` reads `content.json` at startup and injects all portfolio content into the HTML template, so crawlers and `<noscript>` users see real content. SSE is a visual replay of that content, not the source of truth.

Everything else is static files served by Express.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| **Backend** | Node.js + Express | Single language, SSE in ~10 lines, no build step. |
| **Middleware** | `helmet` + `express-rate-limit` | Security headers and abuse protection. |
| **Frontend** | Vanilla HTML + CSS + JS | No build step. Edit, refresh, done. |
| **Data** | `content.json` at project root | One file to edit content. No database. |
| **Leaderboard** | `scores.json` behind a Railway Volume | Persistent across redeploys. If no Volume is attached, leaderboard UI is hidden automatically (stateless mode). |
| **Hosting** | Railway (always-on) | Persistent connections, no SSE timeout, git-push deploy. |

**No React. No Vue. No Next.js. No Vite. No TypeScript.**

`npm install` packages: `express`, `helmet`, `express-rate-limit`. That's it.

---

## Why NOT the alternatives

- **Next.js** — adds a build step, React hydration, file-based routing, for a one-page site.
- **Vercel** — Edge functions can stream for up to 300s after first byte (not 25s as often cited), so SSE technically works there. But Railway is simpler for a portfolio: one server, one git push, no platform quirks.
- **Pure static** — SSE needs a server. Faking streaming with `setTimeout` in the browser defeats the point.
- **Python/FastAPI** — fine technically, but keeping one JS codebase is simpler.

---

## Folder Structure

```
portfolio/
│
├── server.js              ← Express server. Pre-renders HTML, handles SSE + score API.
├── content.json           ← ALL resume data. Only file you edit to update the site.
├── package.json           ← Dependencies: express, helmet, express-rate-limit.
│
├── public/                ← Static files served as-is.
│   ├── index.html         ← HTML template with pre-rendered content injected at startup.
│   ├── style.css          ← All styles: 5 themes, hover, butterflies, layout.
│   ├── splash.js          ← Starfield canvas, dot-ring loader, particle portrait, comet cursor.
│   ├── main.js            ← Boot sequence, SSE client + es.close(), theme slider, aria-busy.
│   ├── butterflies.js     ← Two-element butterfly spans, CSS path + JS scatter. Self-contained.
│   ├── terminal.js        ← Hidden >_ terminal and all supported commands.
│   ├── matrix.js          ← Matrix rain canvas overlay.
│   ├── favicon.svg        ← >_ terminal icon.
│   ├── og-image.png       ← Open Graph share image (1200×630).
│   ├── robots.txt         ← Allow all, point to sitemap.
│   ├── sitemap.xml        ← Single-page sitemap.
│   ├── resume.pdf         ← Phone-number-free version. Served by cat resume command.
│   │
│   ├── game/
│   │   └── flappy.js      ← FlappyGame class. Swappable with snake.js etc.
│   │
│   └── images/
│       ├── photo1.jpg
│       ├── photo2.jpg
│       └── photo3.jpg
│
├── scores.json            ← Auto-created. Lives on a Railway Volume for persistence.
└── 404.html               ← Terminal-style error page.
```

**Rule:** Edit only `content.json` to update portfolio content. Everything else only changes when adding features.

---

## How It Works

```
Visitor opens site
     │
     ▼
[server.js startup]   Reads content.json, renders all sections into HTML template.
                      Serves index.html with real content already in the DOM.
     │
     ▼
[Loading screen]   splash.js    Starfield canvas + spinning dot-ring + % counter
     │
     ▼
[Splash homepage]  splash.js    Same starfield + particle portrait + comet cursor
     │                          Name left, role right. Click/keypress to enter.
     ▼
[Terminal boot]    main.js      $ ssh guest@[DOMAIN] → real timestamp → $ cat about.txt
     │                          Skip hint visible. Any key skips.
     ▼
[SSE visual replay]  main.js    Opens EventSource('/stream')
     │               server.js  Sends rows with ~120ms inter-row delay (~6s total)
     │               main.js    Typewriter effect over pre-rendered content
     │                          es.close() called after event: done
     ▼
[Portfolio visible]             aria-busy="false", content revealed
     │
     ▼
[Flappy game]      flappy.js    $ ./play_flappy.sh — delta-time canvas loop
```

---

## Key implementation details

### SSE correctness
```js
// server.js — GET /stream
app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('X-Accel-Buffering', 'no')   // disable nginx proxy buffering
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()                           // send headers before first event

  // ... send events with ~120ms row delays ...

  res.write('event: done\ndata: \n\n')
  res.end()                                    // close — don't leave connection open
})

// Exclude /stream from compression middleware (gzip buffers SSE):
app.use('/stream', (req, res, next) => next())  // before compression
app.use(compression())
```

```js
// main.js — EventSource client
const es = new EventSource('/stream')
es.addEventListener('done', () => {
  es.close()       // CRITICAL — without this, browser reconnects in ~3s and replays forever
  revealContent()
})
es.onerror = () => {
  es.close()
  revealContent()  // fall back to pre-rendered content
}
```

### /content.json explicit route
```js
// content.json is at project root, outside public/ — needs its own route
app.get('/content.json', (req, res) =>
  res.sendFile(path.join(__dirname, 'content.json'))
)
```

### Leaderboard — validation and storage
```js
// POST /score
const scoreLimit = rateLimit({ windowMs: 60_000, max: 10 })  // per IP
app.post('/score', scoreLimit, (req, res) => {
  const { name, score } = req.body
  if (typeof name !== 'string' || name.length > 20) return res.status(400).end()
  if (!Number.isInteger(score) || score < 0 || score > 9999) return res.status(400).end()
  // store sanitised name — render with textContent not innerHTML
  // append to scores.json, keep top 100, respond with top 10
})
```
- `scores.json` lives on a Railway Volume (`/data/scores.json`). If the Volume is not mounted (local dev or stateless deploy), the leaderboard section is simply hidden — the rest of the site works fine.

### Security
```js
app.use(helmet())  // sets CSP, X-Frame-Options, HSTS, etc.
```
- Cap concurrent SSE connections per IP at 5 (track with an in-memory Map, close oldest if exceeded).

---

## Local dev

```bash
npm install
node server.js    # http://localhost:3000
```

Edit `content.json`, restart `node server.js`, refresh. Done.

---

## Deploy (Railway)

1. Push to GitHub.
2. New Railway project → connect repo → set start command: `node server.js`.
3. Add a Volume in Railway dashboard → mount at `/data`. Update `scores.json` path in server.js to `/data/scores.json`.
4. Done.

**Cost:** Railway Hobby plan is metered. A tiny always-on Express app (~20MB RAM, minimal CPU) costs roughly **$1–3/month**. New accounts get a one-time $5 trial. Always-on is worth it — a 30-second cold start from a free-tier sleep would kill the first impression for a recruiter.

**Nginx note (if using a custom proxy):** Add `proxy_buffering off;` or the `X-Accel-Buffering: no` header (already set in server.js) to prevent SSE buffering.

---

## Confirmed: do NOT add

- No build tools (Webpack, Vite, esbuild)
- No CSS frameworks (Tailwind, Bootstrap)
- No JS frameworks (React, Vue, Svelte)
- No TypeScript
- No full database (scores.json is enough)
- No authentication
- No CMS
