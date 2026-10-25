const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Path to scores.json (can be configured for Railway Volume e.g. /data/scores.json)
const SCORES_FILE = process.env.SCORES_PATH || path.join(__dirname, 'scores.json');

// Helper to escape HTML characters
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Read content.json once at startup
let contentData = {};
try {
  const contentRaw = fs.readFileSync(path.join(__dirname, 'content.json'), 'utf8');
  contentData = JSON.parse(contentRaw);
} catch (err) {
  console.error('Error reading content.json at startup:', err.message);
}

// In-memory score storage with initial retro seeds
let scoresList = [
  { name: 'SAN', score: 42, date: '2026-10-25' },
  { name: 'NEO', score: 35, date: '2026-10-25' },
  { name: 'ADA', score: 28, date: '2026-10-24' },
  { name: 'TURING', score: 21, date: '2026-10-23' },
  { name: 'GUEST', score: 12, date: '2026-10-26' }
];

// Load persisted scores if present
try {
  if (fs.existsSync(SCORES_FILE)) {
    const rawScores = fs.readFileSync(SCORES_FILE, 'utf8');
    const parsed = JSON.parse(rawScores);
    if (Array.isArray(parsed)) {
      scoresList = parsed;
    }
  }
} catch (err) {
  console.warn('Could not load scores file, running in memory-safe mode:', err.message);
}

function persistScores() {
  try {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scoresList, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not persist scores to disk:', err.message);
  }
}

// Live SSE Visitors Tracking
const liveClients = new Set();

function broadcastLiveCount() {
  const payload = `event: visitor-count\ndata: ${JSON.stringify({ count: Math.max(1, liveClients.size) })}\n\n`;
  for (const client of liveClients) {
    try {
      client.write(payload);
    } catch (_) {}
  }
}

// Track active SSE stream connections per IP (max 5)
const activeStreamIps = new Map();

// Generate pre-rendered HTML from content.json
function renderContentHtml(content) {
  const about = content.about?.text || '';
  const experience = content.experience || [];
  const projects = content.projects || [];
  const education = content.education || [];
  const achievements = content.achievements || [];
  const skills = content.skills || [];
  const photos = content.photos || [];

  let html = '';

  // About Section
  html += `
    <section id="section-about" class="portfolio-section" data-section="about">
      <div class="cmd-heading"><span class="prompt-sym">$</span> <span class="cmd-text">cat about.txt</span></div>
      <div class="section-body">
        <p class="about-text">${escapeHtml(about)}</p>
      </div>
    </section>
    <hr class="section-divider">
  `;

  // Experience Section
  html += `
    <section id="section-experience" class="portfolio-section" data-section="experience">
      <div class="cmd-heading"><span class="prompt-sym">$</span> <span class="cmd-text">ls experience/</span></div>
      <div class="section-body rows-list">
  `;
  for (const exp of experience) {
    html += `
      <div class="row experience-row" tabindex="0">
        <div class="row-left">
          <span class="row-emoji">${exp.emoji}</span>
          <span class="row-title"><strong>${escapeHtml(exp.role)}</strong> · ${escapeHtml(exp.organization)}</span>
        </div>
        <div class="row-right">
          <span class="row-metric">${escapeHtml(exp.period || exp.metric || '')}</span>
        </div>
      </div>
      <ul class="row-bullets">
        ${(exp.bullets || []).map(b => `<li>${escapeHtml(b)}</li>`).join('')}
      </ul>
    `;
  }
  html += `
      </div>
    </section>
    <hr class="section-divider">
  `;

  // Projects Section
  html += `
    <section id="section-projects" class="portfolio-section" data-section="projects">
      <div class="cmd-heading"><span class="prompt-sym">$</span> <span class="cmd-text">ls projects/</span></div>
      <div class="section-body rows-list">
  `;
  for (const proj of projects) {
    const demoLink = proj.demoUrl && proj.demoUrl !== '[DEMO_URL]'
      ? `<a href="${escapeHtml(proj.demoUrl)}" target="_blank" rel="noopener" class="row-link">demo ↗</a>`
      : '';
    const paperLink = proj.paperUrl && proj.paperUrl !== '[PAPER_URL]'
      ? `<a href="${escapeHtml(proj.paperUrl)}" target="_blank" rel="noopener" class="row-link">paper ↗</a>`
      : '';
    const githubLink = proj.githubUrl && proj.githubUrl !== '[GITHUB_URL]'
      ? `<a href="${escapeHtml(proj.githubUrl)}" target="_blank" rel="noopener" class="row-link">github ↗</a>`
      : '';

    html += `
      <div class="row project-row" tabindex="0" data-slug="${escapeHtml(proj.slug || '')}">
        <div class="row-left">
          <span class="row-emoji">${proj.emoji}</span>
          <span class="row-title"><strong>${escapeHtml(proj.name)}</strong> · ${escapeHtml(proj.desc)}</span>
        </div>
        <div class="row-right project-links">
          ${demoLink}
          ${paperLink}
          ${githubLink}
        </div>
      </div>
    `;
  }
  html += `
      </div>
    </section>
    <hr class="section-divider">
  `;

  // Education Section
  html += `
    <section id="section-education" class="portfolio-section" data-section="education">
      <div class="cmd-heading"><span class="prompt-sym">$</span> <span class="cmd-text">ls education/</span></div>
      <div class="section-body rows-list">
  `;
  for (const edu of education) {
    html += `
      <div class="row education-row" tabindex="0">
        <div class="row-left">
          <span class="row-emoji">${edu.emoji}</span>
          <span class="row-title"><strong>${escapeHtml(edu.degree)}</strong> · ${escapeHtml(edu.institution)}</span>
        </div>
        <div class="row-right">
          <span class="row-metric">${escapeHtml(edu.metric || edu.period || '')}</span>
        </div>
      </div>
    `;
  }
  html += `
      </div>
    </section>
    <hr class="section-divider">
  `;

  // Achievements Section
  html += `
    <section id="section-achievements" class="portfolio-section" data-section="achievements">
      <div class="cmd-heading"><span class="prompt-sym">$</span> <span class="cmd-text">ls achievements/</span></div>
      <div class="section-body rows-list">
  `;
  for (const ach of achievements) {
    html += `
      <div class="row achievement-row" tabindex="0">
        <div class="row-left">
          <span class="row-emoji">${ach.emoji}</span>
          <span class="row-title"><strong>${escapeHtml(ach.title)}</strong> · ${escapeHtml(ach.desc)}</span>
        </div>
        <div class="row-right">
          <span class="row-metric">${escapeHtml(ach.metric || '')}</span>
        </div>
      </div>
    `;
  }
  html += `
      </div>
    </section>
    <hr class="section-divider">
  `;

  // Skills Section (Monospace $ ls skills/ output)
  html += `
    <section id="section-skills" class="portfolio-section" data-section="skills">
      <div class="cmd-heading"><span class="prompt-sym">$</span> <span class="cmd-text">ls skills/</span></div>
      <div class="section-body">
        <pre class="skills-block" tabindex="0"><code>${skills.map(s => {
          const cat = (s.category || '').padEnd(14, ' ');
          const items = (s.items || []).join('  ');
          return `<span class="skills-cat">${escapeHtml(cat)}</span><span class="skills-items">${escapeHtml(items)}</span>`;
        }).join('\n')}</code></pre>
      </div>
    </section>
    <hr class="section-divider">
  `;

  // Photos Section (Postage-stamp style)
  if (photos.length > 0) {
    html += `
      <section id="section-photos" class="portfolio-section" data-section="photos">
        <div class="cmd-heading"><span class="prompt-sym">$</span> <span class="cmd-text">ls photos/</span></div>
        <div class="section-body photos-gallery">
          ${photos.map((p, idx) => `
            <figure class="stamp-figure">
              <div class="stamp-frame">
                <img src="${escapeHtml(p.path)}" alt="${escapeHtml(p.caption)}" loading="lazy" class="stamp-img" onerror="this.onerror=null; this.classList.add('img-fallback');">
              </div>
              <figcaption class="stamp-caption">${escapeHtml(p.caption)}</figcaption>
            </figure>
          `).join('')}
        </div>
      </section>
      <hr class="section-divider">
    `;
  }

  return html;
}

// Helmet Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(express.json({ limit: '10kb' }));

// Serve static assets (excluding index.html so we can serve the dynamic pre-rendered version)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Explicit route for content.json (per spec)
app.get('/content.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'content.json'));
});

// Root route: pre-rendered HTML
app.get('/', (req, res) => {
  const templatePath = path.join(__dirname, 'public', 'index.html');
  fs.readFile(templatePath, 'utf8', (err, template) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return res.status(500).send('Server Error loading template');
    }

    const preRenderedHtml = renderContentHtml(contentData);
    const rendered = template.replace('<!-- SERVER_PRERENDER_CONTENT -->', preRenderedHtml);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(rendered);
  });
});

// SSE Streaming Route (/stream)
app.get('/stream', (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const currentCount = activeStreamIps.get(clientIp) || 0;

  if (currentCount >= 5) {
    return res.status(429).json({ error: 'Too many concurrent streams from this IP' });
  }

  activeStreamIps.set(clientIp, currentCount + 1);

  // Essential SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no'); // disables nginx proxy buffering
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let isClosed = false;

  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    const cnt = activeStreamIps.get(clientIp) || 1;
    if (cnt <= 1) {
      activeStreamIps.delete(clientIp);
    } else {
      activeStreamIps.set(clientIp, cnt - 1);
    }
  };

  req.on('close', cleanup);

  // Send initial event
  res.write(`event: init\ndata: ${JSON.stringify({ domain: contentData.meta?.domain || 'sampurngupta.dev' })}\n\n`);

  // Build stream sequence
  const streamSteps = [
    { type: 'section', section: 'about', cmd: 'cat about.txt' },
    { type: 'row', section: 'about', data: { text: contentData.about?.text } },
    { type: 'section', section: 'experience', cmd: 'ls experience/' },
    ...(contentData.experience || []).map(item => ({ type: 'row', section: 'experience', data: item })),
    { type: 'section', section: 'projects', cmd: 'ls projects/' },
    ...(contentData.projects || []).map(item => ({ type: 'row', section: 'projects', data: item })),
    { type: 'section', section: 'education', cmd: 'ls education/' },
    ...(contentData.education || []).map(item => ({ type: 'row', section: 'education', data: item })),
    { type: 'section', section: 'achievements', cmd: 'ls achievements/' },
    ...(contentData.achievements || []).map(item => ({ type: 'row', section: 'achievements', data: item })),
    { type: 'section', section: 'skills', cmd: 'ls skills/' },
    { type: 'row', section: 'skills', data: { skills: contentData.skills } },
    { type: 'section', section: 'photos', cmd: 'ls photos/' },
    { type: 'row', section: 'photos', data: { photos: contentData.photos } }
  ];

  let stepIndex = 0;
  const STEP_DELAY_MS = 120; // ~120ms inter-row delay per spec

  const timer = setInterval(() => {
    if (isClosed) {
      clearInterval(timer);
      return;
    }

    if (stepIndex >= streamSteps.length) {
      clearInterval(timer);
      // Critical: send event: done, then close with res.end() to avoid reconnect loop
      res.write('event: done\ndata: {}\n\n');
      res.end();
      cleanup();
      return;
    }

    const step = streamSteps[stepIndex++];
    if (step.type === 'section') {
      res.write(`event: section\ndata: ${JSON.stringify(step)}\n\n`);
    } else {
      res.write(`event: row\ndata: ${JSON.stringify(step)}\n\n`);
    }
  }, STEP_DELAY_MS);
});

// Live Visitor Count SSE Route (/live)
app.get('/live', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  liveClients.add(res);
  broadcastLiveCount();

  req.on('close', () => {
    liveClients.delete(res);
    broadcastLiveCount();
  });
});

// Leaderboard Routes
const scoreLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Please wait a minute before submitting again.' }
});

app.get('/scores', (req, res) => {
  // Sort descending and return top 10
  const top10 = [...scoresList]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  res.json({ scores: top10 });
});

app.post('/score', scoreLimiter, (req, res) => {
  const { name, score } = req.body || {};

  if (typeof name !== 'string' || !name.trim() || name.length > 20) {
    return res.status(400).json({ error: 'Name must be a non-empty string under 20 characters.' });
  }

  const parsedScore = Number(score);
  if (!Number.isInteger(parsedScore) || parsedScore < 0 || parsedScore > 9999) {
    return res.status(400).json({ error: 'Score must be an integer between 0 and 9999.' });
  }

  const sanitizedName = escapeHtml(name.trim().toUpperCase());
  const newEntry = {
    name: sanitizedName,
    score: parsedScore,
    date: new Date().toISOString().split('T')[0]
  };

  scoresList.push(newEntry);
  // Keep top 100
  scoresList.sort((a, b) => b.score - a.score);
  if (scoresList.length > 100) {
    scoresList = scoresList.slice(0, 100);
  }

  persistScores();

  const top10 = scoresList.slice(0, 10);
  res.status(201).json({ success: true, scores: top10 });
});

// Custom 404 Handler
app.use((req, res) => {
  const file404 = path.join(__dirname, '404.html');
  if (fs.existsSync(file404)) {
    res.status(404).sendFile(file404);
  } else {
    res.status(404).send('bash: /404: No such file or directory');
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Portfolio server running on port ${PORT} -> http://localhost:${PORT}`);
});
