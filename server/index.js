// rdpfister.com API — Express app.
// All routes are prefixed in nginx with /api or /blog;
// the proxy strips no path, so we keep the prefix here.

require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const db = require('./db');
const auth = require('./auth');
const { renderPost } = require('./templates');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ── Middleware ─────────────────────────────────────────────
app.set('trust proxy', 1); // honor X-Forwarded-For from nginx
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// CORS — only used if calling cross-origin (normally same-origin via nginx)
const ALLOWED = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Request log (compact)
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${res.statusCode} ${req.method} ${req.originalUrl} ${Date.now() - t0}ms`);
  });
  next();
});

// ── Slug helper ────────────────────────────────────────────
function slugify(s) {
  return String(s).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}
function isValidSlug(s) { return /^[a-z0-9][a-z0-9-]{0,80}$/.test(s); }

// ── Auth routes ────────────────────────────────────────────
app.post('/api/auth/login', auth.login);
app.post('/api/auth/logout', auth.logout);
app.get('/api/auth/me', auth.me);

// ── Public post routes ─────────────────────────────────────
app.get('/api/posts', (req, res) => {
  res.json({ posts: db.listPosts({ includeDrafts: false }) });
});

app.get('/api/posts/:slug', (req, res) => {
  const p = db.getPost(req.params.slug);
  if (!p || !p.published) return res.status(404).json({ error: 'Not found' });
  res.json({ post: p });
});

// ── Admin post routes ──────────────────────────────────────
app.get('/api/admin/posts', auth.requireAuth, (req, res) => {
  res.json({ posts: db.listPosts({ includeDrafts: true }) });
});

app.get('/api/admin/posts/:slug', auth.requireAuth, (req, res) => {
  const p = db.getPost(req.params.slug);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json({ post: p });
});

app.post('/api/admin/posts', auth.requireAuth, (req, res) => {
  const b = req.body || {};
  const slug = (b.slug && isValidSlug(b.slug)) ? b.slug : slugify(b.title || '');
  if (!slug || !isValidSlug(slug)) return res.status(400).json({ error: 'Invalid slug — use lowercase, hyphens, alphanumeric only' });
  if (!b.title) return res.status(400).json({ error: 'Title is required' });
  if (db.getPost(slug)) return res.status(409).json({ error: `Slug "${slug}" already exists. PUT /api/admin/posts/${slug} to update, or change the slug.` });
  try {
    const created = db.createPost({ ...b, slug });
    res.status(201).json({ post: created });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/posts/:slug', auth.requireAuth, (req, res) => {
  const slug = req.params.slug;
  const b = req.body || {};
  if (b.new_slug && !isValidSlug(b.new_slug)) return res.status(400).json({ error: 'Invalid new_slug' });
  try {
    const updated = db.updatePost(slug, b);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json({ post: updated });
  } catch (e) {
    res.status(e.code === 'SLUG_TAKEN' ? 409 : 500).json({ error: e.message });
  }
});

app.delete('/api/admin/posts/:slug', auth.requireAuth, (req, res) => {
  const ok = db.deletePost(req.params.slug);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// ── SSR blog post route ────────────────────────────────────
app.get('/blog/:slug', (req, res) => {
  const slug = req.params.slug.replace(/\.html$/, '');
  const p = db.getPost(slug);
  if (!p || !p.published) {
    // Let nginx serve its 404.html. We still need to return a 404.
    return res.status(404).sendFile(path.join(__dirname, '..', '404.html'));
  }
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=60, must-revalidate');
  res.send(renderPost(p));
});

// ── Health check ───────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ── 404 fallback ───────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ── Error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Boot ───────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log(`rdpfister-api listening on 127.0.0.1:${PORT}`);
});
