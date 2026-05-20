// JWT-cookie auth. Single hardcoded admin user.

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'rp_admin_session';
const TOKEN_TTL = '7d';
const SECURE = String(process.env.COOKIE_SECURE || 'true').toLowerCase() === 'true';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

// ── Brute-force throttle (simple in-memory) ────────────────
const failures = new Map(); // ip → { count, lockedUntil }
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000;

function recordFailure(ip) {
  const f = failures.get(ip) || { count: 0, lockedUntil: 0 };
  f.count++;
  if (f.count >= MAX_FAILS) f.lockedUntil = Date.now() + LOCK_MS;
  failures.set(ip, f);
}
function clearFailure(ip) { failures.delete(ip); }
function isLocked(ip) {
  const f = failures.get(ip);
  return f && f.lockedUntil > Date.now();
}

// ── Login + logout handlers ────────────────────────────────
async function login(req, res) {
  const ip = req.ip;
  if (isLocked(ip)) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again in 5 minutes.' });
  }
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUser || !expectedHash) {
    return res.status(500).json({ error: 'Admin credentials not configured on server' });
  }

  if (username !== expectedUser) {
    recordFailure(ip);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(password, expectedHash);
  if (!ok) {
    recordFailure(ip);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  clearFailure(ip);
  const token = jwt.sign({ sub: username, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    domain: COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  res.json({ ok: true, user: { username } });
}

function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { domain: COOKIE_DOMAIN, path: '/' });
  res.json({ ok: true });
}

function me(req, res) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.json({ ok: false });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ ok: true, user: { username: payload.sub } });
  } catch {
    res.json({ ok: false });
  }
}

// ── Middleware to require auth ─────────────────────────────
function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = { login, logout, me, requireAuth, COOKIE_NAME };
